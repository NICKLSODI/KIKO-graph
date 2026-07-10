import { generate, type GenerateFile } from '../../api/generate'
import type { NoteProduct, StructureType } from './types'
import type { MarketHint } from '../ingest/ingest'

const STRUCTURE_TYPES: StructureType[] = [
  'KIKO', 'KO-only', 'Memory/Snowball', 'Phoenix', 'Airbag/Buffer', 'Twin-Win', 'Other',
]

export const NOTE_EXTRACTION_INSTRUCTIONS = `คุณเป็นผู้เชี่ยวชาญด้านตราสารโครงสร้าง (Structured Note) กำลังอ่านเอกสาร Term Sheet
ให้สกัดข้อมูลของ "ผลิตภัณฑ์เดียว" จากเอกสาร แล้วตอบกลับเป็น JSON เท่านั้น (ไม่มีข้อความอื่นนอก JSON) ตาม schema นี้:

{
  "productCode": string | null,        // รหัสผลิตภัณฑ์ เช่น SG2606256MKIKOU
  "issuer": string | null,             // ผู้ออก เช่น SG, BNPP
  "underlyings": string[],             // หุ้นอ้างอิงทุกตัว (ticker) เช่น ["AMD","MRVL"] — ถ้า basket ต้องครบทุกตัว
  "market": "thai" | "foreign",        // ตลาดของหุ้นอ้างอิง (foreign=US/ต่างประเทศ)
  "structureType": string,             // ประเภทโครงสร้าง เลือกจาก: KIKO, KO-only, Memory/Snowball, Phoenix, Airbag/Buffer, Twin-Win, Other
  "strikePct": number | null,          // ระดับ Strike เป็น % ของราคาเริ่มต้น (ตัวเลขล้วน เช่น 100)
  "kiPct": number | null,              // ระดับ Knock-In เป็น % (null ถ้าโครงสร้างไม่มี KI)
  "koPct": number | null,              // ระดับ Knock-Out เป็น % (null ถ้าไม่มี KO)
  "couponPa": number | null,           // Coupon เป็น % ต่อปี (p.a.)
  "tenor": string | null,              // อายุสัญญา เช่น "6M", "1Y"
  "fixingDate": string | null,         // วัน strike/fixing เริ่มต้น รูปแบบ YYYY-MM-DD
  "observationDates": string[],        // วันสังเกตการณ์ทั้งหมด รูปแบบ YYYY-MM-DD
  "koObservationDates": string[],      // วันสังเกตการณ์ KO โดยเฉพาะ (ถ้าระบุแยก) รูปแบบ YYYY-MM-DD
  "summary": string                    // สรุปผลิตภัณฑ์ 2-4 บรรทัด ภาษาไทย
}

กฎ:
- ใส่ตัวเลขล้วน ไม่มีเครื่องหมาย % (เช่น 46.2 ไม่ใช่ "46.2%")
- ถ้าข้อมูลใดไม่พบ ให้ใส่ null หรือ [] ตามชนิด ห้ามเดาตัวเลขที่ไม่มีในเอกสาร
- structureType: ถ้าไม่มี KI แต่มี KO และคูปองการันตี = "KO-only"; ถ้ามีทั้ง KI และ KO = "KIKO"`

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string') {
    const n = Number(v.replace('%', '').trim())
    return Number.isFinite(n) ? n : null
  }
  return null
}
function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}
function strArr(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0).map((x) => x.trim()) : []
}
function structureOf(v: unknown): StructureType {
  const s = str(v)
  return (STRUCTURE_TYPES as string[]).includes(s ?? '') ? (s as StructureType) : 'Other'
}

// Parse "6M", "1Y", "12 เดือน", "1 ปี" → months.
function tenorToMonths(tenor: string | null): number | null {
  if (!tenor) return null
  const t = tenor.toLowerCase()
  const y = t.match(/(\d+(?:\.\d+)?)\s*(?:y|ปี|year)/)
  if (y) return Math.round(parseFloat(y[1]) * 12)
  const m = t.match(/(\d+(?:\.\d+)?)\s*(?:m|เดือน|month)/)
  if (m) return Math.round(parseFloat(m[1]))
  return null
}

export function parseNoteProduct(raw: string, sourceFile: string, id: string): NoteProduct {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) throw new Error(`สกัดข้อมูลไม่สำเร็จ (${sourceFile}) — AI ตอบ: ${raw.trim().slice(0, 200)}`)
  let p: Record<string, unknown>
  try {
    p = JSON.parse(match[0])
  } catch {
    throw new Error(`แปลง JSON ไม่สำเร็จ (${sourceFile})`)
  }
  const market: MarketHint = p.market === 'thai' ? 'thai' : 'foreign'
  const tenor = str(p.tenor)
  return {
    id,
    productCode: str(p.productCode),
    issuer: str(p.issuer),
    underlyings: strArr(p.underlyings).map((s) => s.toUpperCase()),
    market,
    structureType: structureOf(p.structureType),
    strikePct: num(p.strikePct),
    kiPct: num(p.kiPct),
    koPct: num(p.koPct),
    couponPa: num(p.couponPa),
    tenor,
    tenorMonths: tenorToMonths(tenor),
    fixingDate: str(p.fixingDate),
    observationDates: strArr(p.observationDates),
    koObservationDates: strArr(p.koObservationDates),
    summary: str(p.summary) ?? '',
    raw,
    sourceFile,
  }
}

/** Extract one product per uploaded file via local Claude Code (reads the PDF). */
export async function extractNote(file: GenerateFile, id: string): Promise<NoteProduct> {
  const prompt = `${NOTE_EXTRACTION_INSTRUCTIONS}\n\nเอกสาร Term Sheet แนบเป็นไฟล์ (${file.name})`
  const text = await generate(prompt, file)
  return parseNoteProduct(text, file.name, id)
}

import { generate, type GenerateFile } from '../../api/generate'
import type { NoteProduct, StructureType } from './types'
import { STRUCTURE_TYPES, STRUCTURE_TYPE_LABELS } from './types'
import type { MarketHint } from '../ingest/ingest'
import { parseVariantFields, type VariantFields } from '../factsheet/fields'
// classify.js (not factsheet_generator.js) — the lean classifier module, with no
// LOGO/CSS/REGISTRY, so this eager-loaded file doesn't drag the ~145kB render engine
// into the main bundle. See classify.js for details.
import { detectVariant } from '../factsheet/classify.js'

export const NOTE_EXTRACTION_INSTRUCTIONS = `คุณเป็นผู้เชี่ยวชาญด้านตราสารโครงสร้าง (Structured Note) กำลังอ่านเอกสาร Term Sheet
ให้สกัดข้อมูลของ "ผลิตภัณฑ์เดียว" จากเอกสาร แล้วตอบกลับเป็น JSON เท่านั้น (ไม่มีข้อความอื่นนอก JSON) ตาม schema นี้:

{
  "productCode": string | null,        // รหัสผลิตภัณฑ์ เช่น SG2606256MKIKOU
  "issuer": string | null,             // ผู้ออก เช่น SG, BNPP
  "underlyings": string[],             // หุ้นอ้างอิงทุกตัว (ticker) เช่น ["AMD","MRVL"] — ถ้า basket ต้องครบทุกตัว
  "initialPrices": number[],           // ราคาเริ่มต้น/ราคาอ้างอิง (Initial/Underlying Price) ของหุ้นแต่ละตัว "เรียงลำดับให้ตรงกับ underlyings ทีละตัว" — เอาตัวเลขจริงจากตารางในเอกสาร (เช่น "Underlying price as of ...") ห้ามคำนวณเอง ถ้าตัวใดไม่มีในเอกสารให้เว้นว่างเป็น [] ทั้งชุด
  "market": "thai" | "foreign",        // ตลาดของหุ้นอ้างอิง (foreign=US/ต่างประเทศ)
  "strikePct": number | null,          // ระดับ Strike เป็น % ของราคาเริ่มต้น (ตัวเลขล้วน เช่น 100)
  "kiPct": number | null,              // ระดับ Knock-In เป็น % (null ถ้าโครงสร้างไม่มี KI)
  "koPct": number | null,              // ระดับ Knock-Out เป็น % (null ถ้าไม่มี KO) — รวมถึง "KO barrier"/"Knock-Out Barrier" ด้วย ต้องกรอกแม้เอกสารจะมี Participation Rate อยู่ด้วยก็ตาม (สองอย่างนี้อยู่ร่วมกันได้ เช่นใน Sharkfin)
  "couponPa": number | null,           // Coupon เป็น % ต่อปี (p.a.)
  "tenor": string | null,              // อายุสัญญา เช่น "6M", "1Y"
  "fixingDate": string | null,         // วัน strike/fixing เริ่มต้น รูปแบบ YYYY-MM-DD
  "observationDates": string[],        // วันสังเกตการณ์ทั้งหมด รูปแบบ YYYY-MM-DD
  "koObservationDates": string[],      // วันสังเกตการณ์ KO โดยเฉพาะ (ถ้าระบุแยก) รูปแบบ YYYY-MM-DD
  "koObservationFrequency": "daily" | "monthly" | "quarterly" | null, // ถ้าเอกสารบอกแค่ความถี่ (ทั้งภาษาอังกฤษเช่น "Monthly Observe", "Daily Observe" และภาษาไทยเช่น "สังเกตรายวัน"→daily, "สังเกตรายเดือน"→monthly, "สังเกตรายไตรมาส"→quarterly) แทนที่จะมี list วันที่ชัดเจน ให้ใส่ความถี่ตรงนี้แทนเสมอ — ถ้ามี koObservationDates ชัดเจนอยู่แล้วใส่ null ก็ได้
  "koType": "memory" | "final-valuation" | null, // รูปแบบการตัดสิน KO: "memory" = ชนระดับ KO ในวันสังเกตการณ์ใดก็ถือว่า KO ทันที (autocall/memory), "final-valuation" = ตัดสินเฉพาะวันประเมินราคาสุดท้าย (Final Valuation Date) เท่านั้น — ถ้าเอกสารไม่ระบุชัดให้ null
  "summary": string,                   // สรุปผลิตภัณฑ์ 2-4 บรรทัด ภาษาไทย
  "variantFields": {                   // บล็อกข้อมูลสำหรับสร้าง Factsheet — ทุกค่าตัวเลขใส่เป็น "ข้อความพร้อมหน่วยตามที่ปรากฏในเอกสารจริง" (เช่น "115%", "20% flat", "16.00% p.a.") ห้ามแปลงหน่วยหรือคำนวณเอง
    "family": string | null,           // ชื่อประเภทผลิตภัณฑ์ตามเอกสาร เช่น Sharkfin, Twin Win, KIKO, BEN, Booster, FCN
    "underlyings": string[] | null,    // รายชื่อหลักทรัพย์อ้างอิงตามที่ปรากฏในเอกสาร
    "tenor": string | null,            // อายุสัญญา เช่น "3 months"
    "issuer": string | null,           // ชื่อผู้ออกตราสาร
    "tradeDate": string | null,        // วันที่ซื้อขาย รูปแบบ YYYY-MM-DD เท่านั้น
    "issueDate": string | null,        // วันออกตราสาร รูปแบบ YYYY-MM-DD เท่านั้น
    "maturityDate": string | null,     // วันครบกำหนด รูปแบบ YYYY-MM-DD เท่านั้น
    "koObservation": string | null,    // ความถี่การสังเกต Knock-Out เช่น "Monthly", "Quarterly", "Daily", "Monthly Memory"
    "kiObservation": string | null,    // ความถี่การสังเกต Knock-In เช่น "Daily", "At Final Valuation"
    "ko": string | null,               // ระดับ Knock-Out เดียว เช่น "115%" — คำพ้องที่ต้องนับด้วย: "KO barrier", "Knock-Out Barrier", "KO Level" ล้วนหมายถึงฟิลด์นี้ทั้งสิ้น — ถ้ามีทั้ง Upper และ Lower KO ให้ปล่อยช่องนี้เป็น null. สำคัญ: ต้องกรอกฟิลด์นี้แม้เอกสารจะมี Participation Rate/PR อยู่ด้วยก็ตาม — Sharkfin หลายแบบมีทั้ง KO barrier และ Participation Rate พร้อมกัน สองฟิลด์นี้ไม่ใช่ทางเลือกที่แยกกัน (ไม่ใช่ว่ามี PR แล้วจะไม่มี KO)
    "upperKO": string | null,          // Upper KO เช่น "115%" (เฉพาะโครงสร้างที่มีสองระดับ)
    "lowerKO": string | null,          // Lower KO เช่น "85%"
    "knockIn": string | null,          // ระดับ Knock-In เช่น "55%"
    "strike": string | null,           // Strike เช่น "85%"
    "participation": string | null,    // Participation Rate เช่น "200%"
    "minRedemption": string | null,    // Minimum Redemption Level เช่น "90%"
    "couponBarrier": string | null,    // Coupon Barrier เช่น "100%"
    "bonus": string | null,            // Bonus Coupon เช่น "20% flat"
    "koRebate": string | null,         // KO Rebate เช่น "7% flat"
    "minCoupon": string | null,        // Minimum Coupon เช่น "3.5% flat"
    "coupon": string | null,           // อัตราดอกเบี้ย/คูปอง เช่น "16.00% p.a."
    "settlement": "cash" | "physical" | null
  }
}

กฎ:
- ฟิลด์ระดับบนสุด (strikePct, kiPct, koPct, couponPa ฯลฯ): ใส่ตัวเลขล้วน ไม่มีเครื่องหมาย % (เช่น 46.2 ไม่ใช่ "46.2%")
- ฟิลด์ใน variantFields: ตรงกันข้าม — ใส่เป็นข้อความพร้อมหน่วยตามเอกสารจริง (เช่น "115%", "16.00% p.a.")
- ถ้าข้อมูลใดไม่พบ ให้ใส่ null หรือ [] ตามชนิด ห้ามเดาตัวเลขที่ไม่มีในเอกสาร`

// Batch mode: one pasted text may contain MANY products (a trading desk's daily listing).
// Let the model decide how many products there are and how many underlyings each has —
// deliberately NOT a fixed format, because the desk doesn't always send the same layout.
export const NOTE_BATCH_INSTRUCTIONS = `${NOTE_EXTRACTION_INSTRUCTIONS}

โหมดหลายผลิตภัณฑ์ (สำคัญ):
- ข้อความนี้อาจมี "หลายผลิตภัณฑ์" ในครั้งเดียว (เช่น รายการประจำวันของโต๊ะค้า) โดยอาจคั่นด้วยเส้น "====", หัวข้อ 📌, หรือรหัส A/B/C... — แต่ "รูปแบบไม่ตายตัว" ให้คุณอ่านและ "ตัดสินใจเองว่ามีกี่ผลิตภัณฑ์" และแต่ละผลิตภัณฑ์มีหุ้นอ้างอิงกี่ตัว
- หุ้นอ้างอิงหลายตัวในผลิตภัณฑ์เดียว (worst-of basket) มักเขียนติดกัน เช่น "(TSM ASML AMD)" หรือ "(MU ORCL)" ให้แยกเป็น ticker ทีละตัวใน underlyings
- ถ้ามีบริบทวันที่ของรายการ (เช่น "รายการวันนี้ DD/MM/YYYY") ให้ใช้เป็นวัน fixing โดยประมาณของผลิตภัณฑ์ที่อยู่ถัดจากนั้น และถ้าระบุ "Issue T+7" ให้บวก 7 วัน
- ข้ามบรรทัดที่ไม่ใช่ข้อมูลผลิตภัณฑ์ (เช่น disclaimer, "internal use only")
- ตอบกลับเป็น JSON array เท่านั้น: [ {ตาม schema ด้านบน}, {…}, … ] — ถ้ามีผลิตภัณฑ์เดียว ให้ตอบเป็น array ที่มีสมาชิก 1 ตัว`

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
function numArr(v: unknown): number[] {
  return Array.isArray(v) ? v.map(num).filter((x): x is number => x != null) : []
}
// Single classifier for the whole app: the same parameter-first detectVariant() the
// factsheet screen uses, run once here from the SAME extraction — dashboard and factsheet
// can never disagree again, since there both read this one computed value. Falls back to
// the top-level ko/ki/strike/coupon fields when variantFields itself missed one of them
// (this is the exact safety net that fixed a real Bearish Sharkfin misclassifying as
// Booster: the model dropped variantFields.ko but still filled the top-level koPct).
function structureOf(
  vf: VariantFields | null,
  top: { koPct: number | null; kiPct: number | null; strikePct: number | null; couponPa: number | null },
): StructureType {
  const merged = {
    ...(vf ?? {}),
    ko: vf?.ko ?? (top.koPct != null ? `${top.koPct}%` : null),
    knockIn: vf?.knockIn ?? (top.kiPct != null ? `${top.kiPct}%` : null),
    strike: vf?.strike ?? (top.strikePct != null ? `${top.strikePct}%` : null),
    couponBarrier: vf?.couponBarrier ?? null,
  }
  const key = detectVariant(merged)
  return key && (STRUCTURE_TYPES as string[]).includes(key) ? (key as StructureType) : 'kiko'
}
function frequencyOf(v: unknown): 'daily' | 'monthly' | 'quarterly' | null {
  const s = str(v)?.toLowerCase()
  return s === 'daily' || s === 'monthly' || s === 'quarterly' ? s : null
}
function koTypeOf(v: unknown): 'memory' | 'final-valuation' | null {
  const s = str(v)?.toLowerCase()
  if (s === 'memory') return 'memory'
  // tolerate "final valuation" / "final_valuation" spelling drift from the model
  if (s && s.startsWith('final')) return 'final-valuation'
  return null
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

// Build a NoteProduct from one already-parsed JSON object.
function fromObject(p: Record<string, unknown>, raw: string, sourceFile: string, id: string): NoteProduct {
  const market: MarketHint = p.market === 'thai' ? 'thai' : 'foreign'
  const tenor = str(p.tenor)
  const strikePct = num(p.strikePct)
  const kiPct = num(p.kiPct)
  const koPct = num(p.koPct)
  const couponPa = num(p.couponPa)
  const variantFields = parseVariantFields(p.variantFields)
  return {
    id,
    productCode: str(p.productCode),
    issuer: str(p.issuer),
    underlyings: strArr(p.underlyings).map((s) => s.toUpperCase()),
    initialPrices: numArr(p.initialPrices),
    market,
    structureType: structureOf(variantFields, { koPct, kiPct, strikePct, couponPa }),
    strikePct,
    kiPct,
    koPct,
    couponPa,
    tenor,
    tenorMonths: tenorToMonths(tenor),
    fixingDate: str(p.fixingDate),
    observationDates: strArr(p.observationDates),
    koObservationDates: strArr(p.koObservationDates),
    koObservationFrequency: frequencyOf(p.koObservationFrequency),
    koType: koTypeOf(p.koType),
    summary: str(p.summary) ?? '',
    variantFields,
    raw,
    sourceFile,
  }
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
  return fromObject(p, raw, sourceFile, id)
}

// Parse a JSON ARRAY of products (batch mode). The model decides how many products the
// text holds and how many underlyings each has — no fixed format assumed.
export function parseNoteProducts(raw: string, sourceFile: string, mkId: () => string): NoteProduct[] {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim()
  const match = cleaned.match(/\[[\s\S]*\]/)
  if (!match) throw new Error(`สกัดข้อมูลไม่สำเร็จ (${sourceFile}) — AI ตอบ: ${raw.trim().slice(0, 200)}`)
  let arr: unknown
  try {
    arr = JSON.parse(match[0])
  } catch {
    throw new Error(`แปลง JSON ไม่สำเร็จ (${sourceFile})`)
  }
  if (!Array.isArray(arr)) throw new Error(`AI ไม่ได้ตอบเป็น array (${sourceFile})`)
  return arr
    .filter((p): p is Record<string, unknown> => p != null && typeof p === 'object')
    .map((p) => {
      const prod = fromObject(p, JSON.stringify(p), sourceFile, mkId())
      // Batch products rarely carry a real product code, so the shared source label
      // ("ข้อความ #1") would be the display name for all of them. Derive a distinct,
      // readable name from the structure + underlyings instead.
      if (!prod.productCode) prod.sourceFile = `${STRUCTURE_TYPE_LABELS[prod.structureType]} (${prod.underlyings.join('/')})`
      return prod
    })
    .filter((p) => p.underlyings.length > 0) // drop empty/garbage entries
}

// A single pasted desk listing can hold 30+ products. Sending all of them in ONE
// `claude -p` call means the model must emit one huge JSON array (every product × the full
// variantFields schema) — that regularly blows past the backend's 180s timeout. Splitting
// the paste into small chunks and extracting them concurrently keeps each call fast, each
// output small, and isolates a failure to its own chunk. Products per chunk:
const CHUNK_SIZE = 5
const CHUNK_CONCURRENCY = 3

interface ProductBlock { text: string; date: string | null }

/** Split a desk-listing paste into individual product blocks, carrying the running
 *  "รายการวันนี้ DD/MM/YYYY" date header so each product keeps its fixing-date context. */
function splitProductBlocks(text: string): ProductBlock[] {
  const raw = text.split(/={3,}/)
  const blocks: ProductBlock[] = []
  let currentDate: string | null = null
  for (const seg of raw) {
    const dateMatch = seg.match(/รายการวันนี้\s*([\d]{1,2}\/[\d]{1,2}\/[\d]{2,4})/)
    if (dateMatch) currentDate = dateMatch[1]
    // A product block has a direction marker (🔺/🔻) or the tell-tale term-sheet fields.
    const isProduct = /🔺|🔻/.test(seg) || /(KO|KI|Tenor|Coupon|Participation|Strike)\s*[:：]/i.test(seg)
    if (isProduct && seg.trim()) blocks.push({ text: seg.trim(), date: currentDate })
  }
  return blocks
}

/** Group blocks into chunks of ≤CHUNK_SIZE without crossing a date-header boundary,
 *  so every product in a chunk shares one "รายการวันนี้" context. */
function chunkBlocks(blocks: ProductBlock[]): string[] {
  const chunks: string[] = []
  let i = 0
  while (i < blocks.length) {
    const date = blocks[i].date
    const group: string[] = []
    while (i < blocks.length && blocks[i].date === date && group.length < CHUNK_SIZE) {
      group.push(blocks[i].text)
      i++
    }
    const header = date ? `รายการวันนี้ ${date}\n\n` : ''
    chunks.push(header + group.join('\n=========\n'))
  }
  return chunks
}

/** Extract ALL products from a large pasted listing by chunking + concurrent extraction.
 *  Falls back to a single call when the text isn't a multi-product listing. */
export async function extractNotesFromTextChunked(text: string, label: string, mkId: () => string): Promise<NoteProduct[]> {
  const blocks = splitProductBlocks(text)
  // Not a splittable multi-product listing (0–1 detectable blocks) → one shot as before.
  if (blocks.length <= 1) return extractNotesFromText(text, label, mkId)

  const chunks = chunkBlocks(blocks)
  const out: NoteProduct[][] = new Array(chunks.length).fill(null).map(() => [])
  let started = 0
  async function worker() {
    while (started < chunks.length) {
      const idx = started++
      try {
        out[idx] = await extractNotesFromText(chunks[idx], `${label} #${idx + 1}`, mkId)
      } catch {
        out[idx] = [] // isolate a failed chunk — the rest still return
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CHUNK_CONCURRENCY, chunks.length) }, worker))
  return out.flat()
}

export type NoteSource =
  | { kind: 'file'; file: GenerateFile; label: string }
  | { kind: 'link'; link: string; label: string }
  | { kind: 'text'; text: string; label: string }

// Cache raw model replies by content hash: re-uploading the same document (retrying a
// batch, adding one more file) re-extracts for free instead of paying tokens again.
// The instructions are part of the hash, so editing the schema invalidates old entries.
const EXTRACT_CACHE_PREFIX = 'kiko-extract:'

async function contentHash(source: NoteSource, instructions: string = NOTE_EXTRACTION_INSTRUCTIONS): Promise<string> {
  const content =
    source.kind === 'file' ? `file|${source.file.base64}` : source.kind === 'link' ? `link|${source.link}` : `text|${source.text}`
  const data = new TextEncoder().encode(`${instructions}\n${content}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function cacheGet(key: string): string | null {
  try {
    return localStorage.getItem(EXTRACT_CACHE_PREFIX + key)
  } catch {
    return null
  }
}

function cacheSet(key: string, value: string): void {
  try {
    localStorage.setItem(EXTRACT_CACHE_PREFIX + key, value)
  } catch {
    // quota full — evict all extract entries and retry once
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith(EXTRACT_CACHE_PREFIX))
        .forEach((k) => localStorage.removeItem(k))
      localStorage.setItem(EXTRACT_CACHE_PREFIX + key, value)
    } catch { /* give up silently */ }
  }
}

/** Extract one product per source (file, web link, or pasted text) via local Claude Code.
 *  Identical sources hit a localStorage cache and skip the model call entirely. */
export async function extractNote(source: NoteSource, id: string): Promise<NoteProduct> {
  const key = await contentHash(source)
  const cached = cacheGet(key)
  if (cached) {
    try {
      return parseNoteProduct(cached, source.label, id)
    } catch { /* stale/corrupt entry — fall through to a fresh extraction */ }
  }

  let text: string
  if (source.kind === 'file') {
    const prompt = `${NOTE_EXTRACTION_INSTRUCTIONS}\n\nเอกสาร Term Sheet แนบเป็นไฟล์ (${source.file.name})`
    text = await generate(prompt, source.file)
  } else if (source.kind === 'link') {
    const prompt = `${NOTE_EXTRACTION_INSTRUCTIONS}\n\nเอกสาร Term Sheet (Web Link): ${source.link}\nกรุณาเปิดลิงก์นี้เพื่ออ่านเนื้อหาก่อนตอบ`
    text = await generate(prompt)
  } else {
    const prompt = `${NOTE_EXTRACTION_INSTRUCTIONS}\n\nเอกสาร Term Sheet (ข้อความที่ผู้ใช้ป้อน):\n${source.text}`
    text = await generate(prompt)
  }
  const product = parseNoteProduct(text, source.label, id) // validate BEFORE caching — never cache junk
  cacheSet(key, text)
  return product
}

/** Extract ALL products from one pasted text (batch listing). The model decides how many
 *  products the text holds and how many underlyings each has — no fixed format assumed.
 *  Cached by content hash, so re-pasting the same listing is free. */
export async function extractNotesFromText(text: string, label: string, mkId: () => string): Promise<NoteProduct[]> {
  const source: NoteSource = { kind: 'text', text, label }
  const key = await contentHash(source, NOTE_BATCH_INSTRUCTIONS)
  const cached = cacheGet(key)
  if (cached) {
    try {
      const prods = parseNoteProducts(cached, label, mkId)
      if (prods.length) return prods
    } catch { /* stale/corrupt entry — fall through to a fresh extraction */ }
  }

  const prompt = `${NOTE_BATCH_INSTRUCTIONS}\n\nข้อความรายการผลิตภัณฑ์ (อาจมีหลายผลิตภัณฑ์):\n${text}`
  const reply = await generate(prompt)
  const prods = parseNoteProducts(reply, label, mkId) // validate BEFORE caching — never cache junk
  cacheSet(key, reply)
  return prods
}

export type IngestInput =
  | { mode: 'text'; text: string }
  | { mode: 'link'; link: string }
  | { mode: 'pdf'; fileName: string; mediaType: string; base64: string }

export type MarketHint = 'thai' | 'foreign'

export interface RetrievedProductData {
  summary: string
  productName: string | null
  productType: string | null
  strike: number | null
  knockIn: number | null
  knockOut: number | null
  observationDates: string[]
  maturityDate: string | null
  /** Primary underlying reference ticker (e.g. AAPL, NVDA, PTT), for the graph. */
  underlyingSymbol: string | null
  /** Which market the underlying trades on, to pick the data source. */
  market: MarketHint | null
  /** Raw model output, kept so later steps (script/factsheet) can reuse facts this parse missed. */
  raw: string
}

export const EXTRACTION_INSTRUCTIONS = `คุณเป็นผู้ช่วยของทีมที่ปรึกษาการลงทุน กำลังอ่านเอกสารผลิตภัณฑ์ทางการเงิน (เช่น structured note, KIKO, term sheet)
จากข้อมูลที่ให้มา ให้สรุปและดึงข้อมูลสำคัญ แล้วตอบกลับเป็น JSON เท่านั้น (ไม่มีข้อความอื่นนอก JSON) ตาม schema นี้:

{
  "summary": string,               // สรุปผลิตภัณฑ์ 3-5 บรรทัด ภาษาไทย
  "productName": string | null,    // ชื่อผลิตภัณฑ์ถ้าระบุ
  "productType": string | null,    // ประเภทผลิตภัณฑ์ เช่น KIKO, Twin Win, FCN
  "strike": number | null,         // ระดับ Strike Price ถ้ามี (ตัวเลขล้วน ไม่มี % หรือสัญลักษณ์)
  "knockIn": number | null,        // ระดับ Knock-In ถ้ามี
  "knockOut": number | null,       // ระดับ Knock-Out ถ้ามี
  "observationDates": string[],    // วันที่สังเกตการณ์ราคา รูปแบบ YYYY-MM-DD ถ้าระบุ (ว่างได้ถ้าไม่มี)
  "maturityDate": string | null,   // วันครบกำหนด รูปแบบ YYYY-MM-DD ถ้าระบุ
  "underlyingSymbol": string | null, // สัญลักษณ์หุ้นอ้างอิงหลัก (ticker) เช่น AAPL, NVDA, PTT — ถ้ามีหลายตัวให้เลือกตัวหลัก ถ้าไม่แน่ใจใส่ null
  "market": "thai" | "foreign" | null // ตลาดของหุ้นอ้างอิง: "thai" = หุ้นไทย (SET), "foreign" = ต่างประเทศ (เช่น สหรัฐฯ)
}

ถ้าข้อมูลใดไม่พบในเอกสาร ให้ใส่ null หรือ [] ตามชนิดข้อมูล ห้ามเดาตัวเลขที่ไม่มีในเอกสาร`

/** Prompt text ready to copy-paste into the Claude app / desktop client (no API key needed). */
export function buildPromptText(input: IngestInput): string {
  if (input.mode === 'text') {
    return `${EXTRACTION_INSTRUCTIONS}\n\nเอกสารผลิตภัณฑ์ (ข้อความที่ผู้ใช้ป้อน):\n${input.text}`
  }
  if (input.mode === 'link') {
    return `${EXTRACTION_INSTRUCTIONS}\n\nเอกสารผลิตภัณฑ์ (Web Link): ${input.link}\nกรุณาเปิดลิงก์นี้เพื่ออ่านเนื้อหาก่อนตอบ`
  }
  return `${EXTRACTION_INSTRUCTIONS}\n\n(กรุณาแนบไฟล์ "${input.fileName}" เข้ามาในแชทนี้ด้วยก่อนส่ง แล้วดึงข้อมูลจากไฟล์ตาม schema ข้างต้น)`
}

export function parseExtraction(raw: string): RetrievedProductData {
  // Strip markdown code fences that Claude commonly wraps JSON in.
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim()
  const match = cleaned.match(/\{[\s\S]*\}/)
  if (!match) {
    const snippet = raw.trim().slice(0, 300) || '(ไม่มีเนื้อหา)'
    throw new Error(`AI ไม่ได้ตอบกลับเป็น JSON — สิ่งที่ได้กลับมา: ${snippet}`)
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(match[0])
  } catch {
    throw new Error('แปลงผลลัพธ์ JSON จาก AI ไม่สำเร็จ: ' + match[0].slice(0, 200))
  }

  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)
  const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v : null)
  const market = parsed.market === 'thai' || parsed.market === 'foreign' ? parsed.market : null

  return {
    summary: str(parsed.summary) ?? '',
    productName: str(parsed.productName),
    productType: str(parsed.productType),
    strike: num(parsed.strike),
    knockIn: num(parsed.knockIn),
    knockOut: num(parsed.knockOut),
    observationDates: Array.isArray(parsed.observationDates) ? parsed.observationDates.filter((d) => typeof d === 'string') : [],
    maturityDate: str(parsed.maturityDate),
    underlyingSymbol: str(parsed.underlyingSymbol),
    market,
    raw,
  }
}

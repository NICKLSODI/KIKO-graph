// Text content shared by every product export — the image/PDF renderer (exportReport.ts)
// and the interactive single-file HTML export (interactiveHtml.ts). Kept in its own module
// so the two exporters can't drift on facts/warnings wording, and so neither has to import
// the other (which would create a cycle: exportReport pulls interactiveHtml for the zip).
import { koScheduleAssumed } from './chartData'
import type { BacktestResult, DetailProduct, NoteProduct } from './types'
import { STRUCTURE_TYPE_LABELS, koObservationLabel, kiObservationLabel } from './types'

/** One backtest window's already-scored KIKO items — the ranking source for one window.
 *  The caller runs backtestScore per window (prices are cached, so it's CPU only). */
export interface WindowItems {
  windowMonths: number
  items: { product: NoteProduct; backtest: BacktestResult }[]
}

export function fmt(v: number | null, suffix = '%'): string {
  return v == null ? '-' : `${v}${suffix}`
}

// Everything the reader needs in order to read the picture correctly: the backtest's own
// warnings (missing fixing date / mismatched initial prices) plus the assumed-KO-schedule
// note. The live detail page already shows these; without them on the export, a client-bound
// image looked as authoritative as one built from a fully dated term sheet.
export function warningsFor(s: DetailProduct): string[] {
  const out = [...s.backtest.warnings]
  if (koScheduleAssumed(s.product)) {
    out.push('เอกสารไม่ระบุวันสังเกตการณ์ KO และวันทำสัญญา — หมุด obs* บนกราฟคำนวณจากสมมติว่าทำสัญญาวันนี้ ตามความถี่ที่เอกสารระบุ')
  }
  return out
}

export function factsFor(s: DetailProduct): [string, string][] {
  const p = s.product
  return [
    ['หุ้นอ้างอิง', p.underlyings.join(', ') || '-'],
    ['ประเภทโครงสร้าง', STRUCTURE_TYPE_LABELS[p.structureType]],
    ['Strike', fmt(p.strikePct)],
    ['Knock-In / Knock-Out', `${p.kiPct ?? '–'} / ${p.koPct ?? '–'}`],
    ['KO observation', koObservationLabel(p)],
    ['KI observation', kiObservationLabel(p)],
    ['Coupon (p.a.)', fmt(p.couponPa)],
    ['Tenor', p.tenor ?? '-'],
    ['Issuer', p.issuer ?? '-'],
  ]
}

// Human labels for the backtest windows.
const WINDOW_LABELS: Record<number, string> = { 6: '6 เดือน', 12: '1 ปี', 24: '2 ปี' }
export const windowLabel = (m: number): string => WINDOW_LABELS[m] ?? `${m} เดือน`

/** Filename-safe product title (Thai letters kept — the desk names files in Thai). */
export const safeName = (t: string) => t.replace(/[^\w.ก-๙-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'product'

/** Client-facing disclaimer printed at the foot of every product export. */
export const DISCLAIMER =
  'เอกสารนี้จัดทำจากการแบ็คเทสต์ราคาย้อนหลังและข้อมูลที่สกัดจาก Term Sheet โดยอัตโนมัติ เพื่อประกอบการพิจารณาเบื้องต้นเท่านั้น ' +
  'ไม่ใช่คำแนะนำการลงทุน และผลการดำเนินงานในอดีตไม่ได้เป็นเครื่องยืนยันผลตอบแทนในอนาคต — โปรดตรวจสอบเงื่อนไขกับเอกสารต้นฉบับของผู้ออกตราสารก่อนตัดสินใจ'

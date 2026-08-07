import type { NoteProduct, UnderlyingSeries } from './types'
import type { DateMark, Level } from '../../types'
import { deriveObservationDates } from './engine'

const todayIso = (): string => new Date().toISOString().slice(0, 10)

/** True when the KO observation marks had to be derived from an ASSUMED trade date (today),
 *  because the document printed neither observation dates nor a fixing date. Callers use this
 *  to label the marks "obsN*" and to print the matching warning on exports. */
export function koScheduleAssumed(product: NoteProduct): boolean {
  const hasExplicit = product.koObservationDates.length > 0 || product.observationDates.length > 0
  return (
    !hasExplicit &&
    product.fixingDate == null &&
    deriveObservationDates(todayIso(), product.tenorMonths, product.koObservationFrequency).length > 0
  )
}

// Shared between the live Detail-tab chart and the PDF export renderer, so both
// draw exactly the same lines/marks from the same backtest result.
export function koTimesFor(product: NoteProduct): DateMark[] {
  const explicit = product.koObservationDates.length ? product.koObservationDates : product.observationDates
  // Desk listings (pasted text) rarely carry a trade date, so a note stating "Monthly Observe"
  // used to get NO observation marks at all. Assume it fixes today and project the schedule
  // forward — marks are suffixed "*" and exports print a warning that the dates are assumed.
  const assumed = koScheduleAssumed(product)
  const dates = explicit.length
    ? explicit
    : deriveObservationDates(product.fixingDate ?? todayIso(), product.tenorMonths, product.koObservationFrequency)
  return dates
    .map((d): DateMark | null => {
      const t = Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000)
      return Number.isFinite(t) ? { id: `ko-${d}`, time: t, label: '' } : null
    })
    .filter((m): m is DateMark => m !== null)
    .sort((a, b) => a.time - b.time)
    // Short ordinal labels ("obs1", "obs2", …) — full dates cluttered the chart; the
    // exact dates are still listed in the detail facts ("วันสังเกตการณ์ KO").
    .map((m, i) => ({ ...m, label: `obs${i + 1}${assumed ? '*' : ''}` }))
}

// Optional %-of-initial levels (product-wide), shown alongside the price so a line reads
// e.g. "KI 45%, 123.23" instead of just the raw price.
export interface LevelPct {
  strikePct: number | null
  kiPct: number | null
  koPct: number | null
}

export function levelsAndMarksFor(s: UnderlyingSeries, koTimes: DateMark[], pct?: LevelPct): { levels: Level[]; marks: DateMark[] } {
  const lbl = (name: string, price: number, p: number | null | undefined) =>
    p != null ? `${name} ${p}%, ${price.toFixed(2)}` : `${name} ${price.toFixed(2)}`
  const levels: Level[] = []
  if (s.strikeLevel != null) levels.push({ id: `st-${s.symbol}`, kind: 'strike', price: s.strikeLevel, label: lbl('Strike', s.strikeLevel, pct?.strikePct) })
  if (s.kiLevel != null) levels.push({ id: `ki-${s.symbol}`, kind: 'knock-in', price: s.kiLevel, label: lbl('KI', s.kiLevel, pct?.kiPct) })
  if (s.koLevel != null) levels.push({ id: `ko-${s.symbol}`, kind: 'knock-out', price: s.koLevel, label: lbl('KO', s.koLevel, pct?.koPct) })
  const marks: DateMark[] = [...koTimes]
  if (s.fixingTime != null) marks.push({ id: `fx-${s.symbol}`, time: s.fixingTime, label: '📌 วันทำสัญญา' })
  return { levels, marks }
}

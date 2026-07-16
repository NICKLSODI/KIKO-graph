import type { NoteProduct, UnderlyingSeries } from './types'
import type { DateMark, Level } from '../../types'
import { deriveObservationDates } from './engine'

// Shared between the live Detail-tab chart and the PDF export renderer, so both
// draw exactly the same lines/marks from the same backtest result.
export function koTimesFor(product: NoteProduct): DateMark[] {
  const explicit = product.koObservationDates.length ? product.koObservationDates : product.observationDates
  const dates = explicit.length ? explicit : deriveObservationDates(product.fixingDate, product.tenorMonths, product.koObservationFrequency)
  return dates
    .map((d): DateMark | null => {
      const t = Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000)
      return Number.isFinite(t) ? { id: `ko-${d}`, time: t, label: '' } : null
    })
    .filter((m): m is DateMark => m !== null)
    .sort((a, b) => a.time - b.time)
    // Short ordinal labels ("obs1", "obs2", …) — full dates cluttered the chart; the
    // exact dates are still listed in the detail facts ("วันสังเกตการณ์ KO").
    .map((m, i) => ({ ...m, label: `obs${i + 1}` }))
}

export function levelsAndMarksFor(s: UnderlyingSeries, koTimes: DateMark[]): { levels: Level[]; marks: DateMark[] } {
  const levels: Level[] = []
  if (s.strikeLevel != null) levels.push({ id: `st-${s.symbol}`, kind: 'strike', price: s.strikeLevel, label: `Strike ${s.strikeLevel.toFixed(2)}` })
  if (s.kiLevel != null) levels.push({ id: `ki-${s.symbol}`, kind: 'knock-in', price: s.kiLevel, label: `KI ${s.kiLevel.toFixed(2)}` })
  if (s.koLevel != null) levels.push({ id: `ko-${s.symbol}`, kind: 'knock-out', price: s.koLevel, label: `KO ${s.koLevel.toFixed(2)}` })
  const marks: DateMark[] = [...koTimes]
  if (s.fixingTime != null) marks.push({ id: `fx-${s.symbol}`, time: s.fixingTime, label: '📌 วันทำสัญญา' })
  return { levels, marks }
}

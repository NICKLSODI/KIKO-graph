import type { NoteProduct, UnderlyingSeries } from './types'
import type { DateMark, Level } from '../../types'

// Shared between the live Detail-tab chart and the PDF export renderer, so both
// draw exactly the same lines/marks from the same backtest result.
export function koTimesFor(product: NoteProduct): DateMark[] {
  return (product.koObservationDates.length ? product.koObservationDates : product.observationDates)
    .map((d): DateMark | null => {
      const t = Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000)
      return Number.isFinite(t) ? { id: `ko-${d}`, time: t, label: `KO obs ${d}` } : null
    })
    .filter((m): m is DateMark => m !== null)
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

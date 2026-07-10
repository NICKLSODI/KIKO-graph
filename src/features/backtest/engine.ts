import { fetchDailyCloses } from '../../api/prices'
import type { Candle } from '../../types'
import type { BacktestResult, NoteProduct, UnderlyingSeries } from './types'

function dateToUnix(d: string): number | null {
  const t = new Date(d + 'T00:00:00Z').getTime()
  return Number.isFinite(t) ? Math.floor(t / 1000) : null
}

// First candle on/after the fixing date (or the earliest candle if none/not found).
function initialCandle(candles: Candle[], fixingDate: string | null): Candle | null {
  if (candles.length === 0) return null
  if (!fixingDate) return candles[0]
  const fx = dateToUnix(fixingDate)
  if (fx == null) return candles[0]
  return candles.find((c) => c.time >= fx) ?? candles[0]
}

// Close price on the trading day nearest to a target date.
function closeNear(candles: Candle[], target: number): number | null {
  let best: Candle | null = null
  for (const c of candles) {
    if (!best || Math.abs(c.time - target) < Math.abs(best.time - target)) best = c
  }
  return best?.close ?? null
}

function buildSeries(product: NoteProduct, symbol: string, candles: Candle[]): UnderlyingSeries {
  const init = initialCandle(candles, product.fixingDate)
  const initialPrice = init?.close ?? null
  const fromTime = init?.time ?? (candles[0]?.time ?? 0)
  const inWindow = candles.filter((c) => c.time >= fromTime)

  const level = (pct: number | null) => (initialPrice != null && pct != null ? (initialPrice * pct) / 100 : null)
  const kiLevel = level(product.kiPct)
  const koLevel = level(product.koPct)
  const strikeLevel = level(product.strikePct)

  const closes = inWindow.map((c) => c.close)
  const minClose = closes.length ? Math.min(...closes) : null
  const currentPrice = candles.length ? candles[candles.length - 1].close : null
  const knockedIn = kiLevel != null && minClose != null ? minClose <= kiLevel : false

  return { symbol, candles, initialPrice, strikeLevel, kiLevel, koLevel, currentPrice, minClose, knockedIn }
}

// Worst-of KO: knocked out if on some observation date EVERY underlying closed >= its KO level.
function checkKnockOut(product: NoteProduct, series: UnderlyingSeries[]): boolean {
  if (product.koPct == null) return false
  const obs = product.koObservationDates.length ? product.koObservationDates : product.observationDates
  const targets = obs.map(dateToUnix).filter((t): t is number => t != null)

  const allAboveKoOn = (t: number) =>
    series.every((s) => {
      if (s.koLevel == null) return false
      const px = closeNear(s.candles, t)
      return px != null && px >= s.koLevel
    })

  if (targets.length > 0) return targets.some(allAboveKoOn)

  // No observation dates given → continuous check across the common window.
  const times = series[0]?.candles.map((c) => c.time) ?? []
  return times.some(allAboveKoOn)
}

export async function backtest(product: NoteProduct): Promise<BacktestResult> {
  if (product.underlyings.length === 0) {
    return { verdict: 'pass', knockedIn: false, knockedOut: false, bufferPct: null, series: [], error: 'ไม่พบหุ้นอ้างอิงในเอกสาร' }
  }

  const series: UnderlyingSeries[] = []
  try {
    for (const sym of product.underlyings) {
      const candles = await fetchDailyCloses(sym, product.market)
      if (candles.length === 0) throw new Error(`ไม่มีข้อมูลราคา ${sym}`)
      series.push(buildSeries(product, sym, candles))
    }
  } catch (err) {
    return {
      verdict: 'pass',
      knockedIn: false,
      knockedOut: false,
      bufferPct: null,
      series,
      error: err instanceof Error ? err.message : String(err),
    }
  }

  const knockedIn = series.some((s) => s.knockedIn) // worst-of
  const knockedOut = checkKnockOut(product, series)

  // Worst-of buffer: how many % the weakest underlying currently sits above its KI level.
  let bufferPct: number | null = null
  if (product.kiPct != null) {
    const buffers = series
      .filter((s) => s.initialPrice != null && s.currentPrice != null)
      .map((s) => (s.currentPrice! / s.initialPrice!) * 100 - product.kiPct!)
    bufferPct = buffers.length ? Math.min(...buffers) : null
  }

  return {
    verdict: knockedIn || knockedOut ? 'knocked' : 'pass',
    knockedIn,
    knockedOut,
    bufferPct,
    series,
    error: null,
  }
}

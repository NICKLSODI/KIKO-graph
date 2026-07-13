import { fetchDailyCloses } from '../../api/prices'
import type { Candle } from '../../types'
import type { BacktestResult, NoteProduct, UnderlyingSeries } from './types'

function dateToUnix(d: string | null): number | null {
  if (!d) return null
  const t = new Date(d + 'T00:00:00Z').getTime()
  return Number.isFinite(t) ? Math.floor(t / 1000) : null
}

// Start of the backtest window = last candle date minus N months.
function windowStart(lastTime: number, windowMonths: number): number {
  const d = new Date(lastTime * 1000)
  d.setUTCMonth(d.getUTCMonth() - windowMonths)
  return Math.floor(d.getTime() / 1000)
}

// First candle on/after the REAL fixing date from the term sheet. This is the true
// strike/initial reference price and must NEVER depend on the backtest window —
// the window only controls how far back we check for a breach, not the reference level.
function initialCandle(candles: Candle[], fixingDate: string | null): Candle | null {
  if (candles.length === 0) return null
  const fx = dateToUnix(fixingDate)
  if (fx == null) return candles[0]
  return candles.find((c) => c.time >= fx) ?? candles[0]
}

// Close price on the trading day nearest to a target time.
function closeNear(candles: Candle[], target: number): number | null {
  let best: Candle | null = null
  for (const c of candles) {
    if (!best || Math.abs(c.time - target) < Math.abs(best.time - target)) best = c
  }
  return best?.close ?? null
}

// Annualised volatility (%) from daily log returns over the window.
function annualisedVol(closes: number[]): number | null {
  if (closes.length < 3) return null
  const rets: number[] = []
  for (let i = 1; i < closes.length; i++) {
    if (closes[i - 1] > 0 && closes[i] > 0) rets.push(Math.log(closes[i] / closes[i - 1]))
  }
  if (rets.length < 2) return null
  const mean = rets.reduce((a, b) => a + b, 0) / rets.length
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (rets.length - 1)
  return Math.sqrt(variance) * Math.sqrt(252) * 100
}

function buildSeries(product: NoteProduct, symbol: string, candles: Candle[], checkFromTime: number, statedInitialPrice: number | null): UnderlyingSeries {
  // Real initial price — prefer the term sheet's own stated reference price (exact, no
  // vendor/date drift); only fall back to the close on/after the fixing date from our
  // fetched history when the document didn't print one.
  const init = initialCandle(candles, product.fixingDate)
  const initialPrice = statedInitialPrice ?? init?.close ?? null

  const level = (pct: number | null) => (initialPrice != null && pct != null ? (initialPrice * pct) / 100 : null)
  const kiLevel = level(product.kiPct)
  const koLevel = level(product.koPct)
  const strikeLevel = level(product.strikePct)

  // Backtest window: check the selected lookback period's REAL closing prices against the
  // Strike-derived levels — this is a stress-test ("if this stock traded like it did over
  // the last N months, would this structure have breached?"), independent of the note's
  // actual fixing date. This matters because most incoming term sheets are freshly issued
  // (fixed days ago), so restricting the check to "since fixing" would trivially mark
  // almost everything as Pass and defeat the point of screening by real historical action.
  const windowCandles = candles.filter((c) => c.time >= checkFromTime)
  const closes = windowCandles.map((c) => c.close)
  const minClose = closes.length ? Math.min(...closes) : null
  const currentPrice = candles.length ? candles[candles.length - 1].close : null
  const knockedIn = kiLevel != null && minClose != null ? minClose <= kiLevel : false

  return {
    symbol,
    candles: windowCandles,
    initialPrice,
    fixingTime: init?.time ?? null,
    strikeLevel,
    kiLevel,
    koLevel,
    currentPrice,
    minClose,
    knockedIn,
  }
}

// When the doc gives no explicit KO observation dates but does state a cadence (e.g. "Monthly
// Observe"), synthesize an approximate schedule from the fixing date + tenor instead of silently
// skipping the KO check entirely.
function deriveObservationDates(fixingDate: string | null, tenorMonths: number | null, frequency: 'daily' | 'monthly' | 'quarterly' | null): string[] {
  if (!fixingDate || !tenorMonths || frequency == null || frequency === 'daily') return []
  const stepMonths = frequency === 'monthly' ? 1 : 3
  const start = new Date(fixingDate + 'T00:00:00Z')
  if (!Number.isFinite(start.getTime())) return []
  const dates: string[] = []
  for (let m = stepMonths; m <= tenorMonths; m += stepMonths) {
    const d = new Date(start)
    d.setUTCMonth(d.getUTCMonth() + m)
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// Worst-of KO: knocked out if on some PAST observation date (within the backtest window)
// EVERY underlying closed >= its KO level.
function checkKnockOut(product: NoteProduct, series: UnderlyingSeries[], lastTime: number, checkFromTime: number): boolean {
  if (product.koPct == null) return false
  const explicit = product.koObservationDates.length ? product.koObservationDates : product.observationDates
  const obs = explicit.length ? explicit : deriveObservationDates(product.fixingDate, product.tenorMonths, product.koObservationFrequency)
  const targets = obs.map(dateToUnix).filter((t): t is number => t != null && t <= lastTime && t >= checkFromTime)

  const allAboveKoOn = (t: number) =>
    series.every((s) => {
      if (s.koLevel == null) return false
      const px = closeNear(s.candles, t)
      return px != null && px >= s.koLevel
    })

  if (targets.length > 0) return targets.some(allAboveKoOn)
  return false
}

// "Daily Observe" KO isn't a handful of discrete dates — it's a continuous barrier, same shape
// as the KI check. Scan every real trading day in the window instead of a synthesized date list.
function checkKnockOutContinuous(series: UnderlyingSeries[], checkFromTime: number, lastTime: number): boolean {
  if (series.some((s) => s.koLevel == null)) return false
  const days = (series[0]?.candles ?? []).map((c) => c.time).filter((t) => t >= checkFromTime && t <= lastTime)
  return days.some((t) => series.every((s) => {
    const px = closeNear(s.candles, t)
    return px != null && s.koLevel != null && px >= s.koLevel
  }))
}

export async function backtest(product: NoteProduct, windowMonths = 12): Promise<BacktestResult> {
  const base = { windowMonths, series: [] as UnderlyingSeries[] }
  if (product.underlyings.length === 0) {
    return { ...base, verdict: 'pass', knockedIn: false, knockedOut: false, bufferPct: null, volatilityPct: null, error: 'ไม่พบหุ้นอ้างอิงในเอกสาร' }
  }

  const series: UnderlyingSeries[] = []
  let lastTime = 0
  try {
    const perSymbolCandles = new Map<string, Candle[]>()
    for (const sym of product.underlyings) {
      const candles = await fetchDailyCloses(sym, product.market)
      if (candles.length === 0) throw new Error(`ไม่มีข้อมูลราคา ${sym}`)
      perSymbolCandles.set(sym, candles)
      lastTime = Math.max(lastTime, candles[candles.length - 1].time)
    }
    const checkFromTime = windowStart(lastTime, windowMonths)
    product.underlyings.forEach((sym, i) => {
      series.push(buildSeries(product, sym, perSymbolCandles.get(sym)!, checkFromTime, product.initialPrices[i] ?? null))
    })
  } catch (err) {
    return { ...base, series, verdict: 'pass', knockedIn: false, knockedOut: false, bufferPct: null, volatilityPct: null, error: err instanceof Error ? err.message : String(err) }
  }

  const checkFromTime = windowStart(lastTime, windowMonths)
  const knockedIn = series.some((s) => s.knockedIn) // worst-of
  const knockedOut = product.koObservationFrequency === 'daily'
    ? checkKnockOutContinuous(series, checkFromTime, lastTime)
    : checkKnockOut(product, series, lastTime, checkFromTime)

  // Worst-of buffer: how many % the weakest underlying currently sits above its KI level.
  let bufferPct: number | null = null
  if (product.kiPct != null) {
    const buffers = series
      .filter((s) => s.initialPrice != null && s.currentPrice != null)
      .map((s) => (s.currentPrice! / s.initialPrice!) * 100 - product.kiPct!)
    bufferPct = buffers.length ? Math.round(Math.min(...buffers)) : null
  }

  // Worst-of volatility: the highest annualised vol among underlyings, over the same window.
  const vols = series.map((s) => annualisedVol(s.candles.map((c) => c.close))).filter((v): v is number => v != null)
  const volatilityPct = vols.length ? Math.round(Math.max(...vols)) : null

  return {
    ...base,
    series,
    verdict: knockedIn || knockedOut ? 'knocked' : 'pass',
    knockedIn,
    knockedOut,
    bufferPct,
    volatilityPct,
    error: null,
  }
}

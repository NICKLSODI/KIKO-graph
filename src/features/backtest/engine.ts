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
// No stated fixing date, or one beyond the data we have (both read as "assume today") —
// fall back to the LATEST candle, not the oldest: the document gave no reference date, so
// the most recent close is the only defensible "as of now" price (the old fallback to
// candles[0] pinned the 📌 fixing marker a year+ in the past on documents with no date).
function initialCandle(candles: Candle[], fixingDate: string | null): Candle | null {
  if (candles.length === 0) return null
  const latest = candles[candles.length - 1]
  const fx = dateToUnix(fixingDate)
  if (fx == null) return latest
  return candles.find((c) => c.time >= fx) ?? latest
}

const DAY = 86400
// A target date more than this far from any real candle has no meaningful close —
// treat it as "no data" instead of silently judging against a far-away price.
const NEAR_LIMIT = DAY * 4

// Close price on the trading day nearest to a target time (within NEAR_LIMIT).
function closeNear(candles: Candle[], target: number): number | null {
  let best: Candle | null = null
  for (const c of candles) {
    if (!best || Math.abs(c.time - target) < Math.abs(best.time - target)) best = c
  }
  if (!best || Math.abs(best.time - target) > NEAR_LIMIT) return null
  return best.close
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
  // KI assessment respects kiType: 'final-valuation' (European) is checked only at the final
  // valuation — approximated by the latest close — so a mid-window dip that recovered does NOT
  // count; the default 'daily' is a continuous barrier over the whole window (minClose).
  const knockedIn =
    kiLevel == null ? false
    : product.kiType === 'final-valuation' ? (currentPrice != null && currentPrice <= kiLevel)
    : (minClose != null && minClose <= kiLevel)

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
// skipping the KO check entirely. Exported so chartData.ts's koTimesFor (live chart + PDF/JPG
// export) draws the same synthesized marks the backtest itself checks against.
export function deriveObservationDates(fixingDate: string | null, tenorMonths: number | null, frequency: 'daily' | 'monthly' | 'quarterly' | null): string[] {
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

// KO assessed ONLY at the final valuation (koType 'final-valuation'): a note that only
// autocalls/redeems at maturity, never on an intermediate date. Approximate the final
// valuation with the latest close (same treatment as final-valuation KI), so a mid-window
// observation where all legs sat above KO does NOT wrongly mark it knocked out.
function checkKnockOutFinal(series: UnderlyingSeries[]): boolean {
  return series.length > 0 && series.every((s) => s.koLevel != null && s.currentPrice != null && s.currentPrice >= s.koLevel)
}

// Pick the KO test for this note: final-valuation only (koType) takes precedence, else the
// continuous daily barrier (koObservationFrequency='daily'), else discrete observation dates
// (memory / default — any past observation date on which all legs were above KO).
function computeKnockedOut(product: NoteProduct, series: UnderlyingSeries[], checkFromTime: number, lastTime: number): boolean {
  if (product.koPct == null) return false
  if (product.koType === 'final-valuation') return checkKnockOutFinal(series)
  return product.koObservationFrequency === 'daily'
    ? checkKnockOutContinuous(series, checkFromTime, lastTime)
    : checkKnockOut(product, series, lastTime, checkFromTime)
}

// ── Fast scoring pass ─────────────────────────────────────────────────────────
// Fetches prices for every underlying, computes verdict / buffer% / vol%, but
// stores EMPTY candles[] in each series so we don't pay the memory / rendering
// cost for products the user never opens in detail. chartReady = false signals
// the dashboard to call backtestDetail() when the user opens that product.
export async function backtestScore(product: NoteProduct, windowMonths = 12): Promise<BacktestResult> {
  const warnings: string[] = []
  if (product.initialPrices.length > 0 && product.initialPrices.length !== product.underlyings.length) {
    warnings.push(`ราคาเริ่มต้นในเอกสาร (${product.initialPrices.length} ค่า) ไม่ตรงกับจำนวนหุ้นอ้างอิง (${product.underlyings.length} ตัว) — ระบบไม่ใช้ค่าดังกล่าว และใช้ราคาปิด ณ วัน fixing แทน`)
  }
  if (!product.fixingDate && product.initialPrices.length === 0) {
    warnings.push('เอกสารไม่ระบุวัน fixing และราคาเริ่มต้น — ระดับ Strike/KI/KO คำนวณจากแท่งแรกของข้อมูลที่ดึงได้ อาจคลาดเคลื่อน')
  }
  const base = { windowMonths, series: [] as UnderlyingSeries[], warnings, chartReady: false }
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
    const statedOk = product.initialPrices.length === product.underlyings.length
    const checkFromTime = windowStart(lastTime, windowMonths)
    product.underlyings.forEach((sym, i) => {
      const allCandles = perSymbolCandles.get(sym)!
      // Build a lightweight series: same levels/flags, but candles[] is EMPTY.
      // The detail pass (backtestDetail) will populate it on demand.
      const full = buildSeries(product, sym, allCandles, checkFromTime, statedOk ? product.initialPrices[i] : null)
      series.push({ ...full, candles: [] })
    })
  } catch (err) {
    return { ...base, series, verdict: 'pass', knockedIn: false, knockedOut: false, bufferPct: null, volatilityPct: null, error: err instanceof Error ? err.message : String(err) }
  }

  // For scoring purposes we need the real flags — re-derive them from a temporary
  // full-candles series (never stored, just used for the verdict calculation).
  const statedOk = product.initialPrices.length === product.underlyings.length
  const checkFromTime = windowStart(lastTime, windowMonths)
  const fullSeries: UnderlyingSeries[] = []
  for (const sym of product.underlyings) {
    // fetchDailyCloses is cached — this is a free map lookup, not a network call.
    const candles = await fetchDailyCloses(sym, product.market)
    const idx = product.underlyings.indexOf(sym)
    fullSeries.push(buildSeries(product, sym, candles, checkFromTime, statedOk ? product.initialPrices[idx] : null))
  }

  const knockedIn = fullSeries.some((s) => s.knockedIn)
  const knockedOut = computeKnockedOut(product, fullSeries, checkFromTime, lastTime)

  let bufferPct: number | null = null
  if (product.kiPct != null) {
    const buffers = fullSeries
      .filter((s) => s.initialPrice != null && s.currentPrice != null)
      .map((s) => (s.currentPrice! / s.initialPrice!) * 100 - product.kiPct!)
    bufferPct = buffers.length ? Math.round(Math.min(...buffers)) : null
  }

  const vols = fullSeries.map((s) => annualisedVol(s.candles.map((c) => c.close))).filter((v): v is number => v != null)
  const volatilityPct = vols.length ? Math.round(Math.max(...vols)) : null

  return {
    ...base,
    series, // empty candles[], levels/flags populated
    verdict: knockedIn || knockedOut ? 'knocked' : 'pass',
    knockedIn,
    knockedOut,
    bufferPct,
    volatilityPct,
    error: null,
  }
}

// ── Full detail pass ───────────────────────────────────────────────────────────
// Called only when the user opens a specific product's detail page. Populates
// series[].candles for the chart. The price API cache means this costs no extra
// network round-trip for products already scored above — it's just CPU work.
export async function backtestDetail(product: NoteProduct, windowMonths = 12): Promise<BacktestResult> {
  const warnings: string[] = []
  if (product.initialPrices.length > 0 && product.initialPrices.length !== product.underlyings.length) {
    warnings.push(`ราคาเริ่มต้นในเอกสาร (${product.initialPrices.length} ค่า) ไม่ตรงกับจำนวนหุ้นอ้างอิง (${product.underlyings.length} ตัว) — ระบบไม่ใช้ค่าดังกล่าว และใช้ราคาปิด ณ วัน fixing แทน`)
  }
  if (!product.fixingDate && product.initialPrices.length === 0) {
    warnings.push('เอกสารไม่ระบุวัน fixing และราคาเริ่มต้น — ระดับ Strike/KI/KO คำนวณจากแท่งแรกของข้อมูลที่ดึงได้ อาจคลาดเคลื่อน')
  }
  const base = { windowMonths, series: [] as UnderlyingSeries[], warnings, chartReady: true }
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
    const statedOk = product.initialPrices.length === product.underlyings.length
    const checkFromTime = windowStart(lastTime, windowMonths)
    product.underlyings.forEach((sym, i) => {
      series.push(buildSeries(product, sym, perSymbolCandles.get(sym)!, checkFromTime, statedOk ? product.initialPrices[i] : null))
    })
  } catch (err) {
    return { ...base, series, verdict: 'pass', knockedIn: false, knockedOut: false, bufferPct: null, volatilityPct: null, error: err instanceof Error ? err.message : String(err) }
  }

  const checkFromTime = windowStart(lastTime, windowMonths)
  const knockedIn = series.some((s) => s.knockedIn)
  const knockedOut = computeKnockedOut(product, series, checkFromTime, lastTime)

  let bufferPct: number | null = null
  if (product.kiPct != null) {
    const buffers = series
      .filter((s) => s.initialPrice != null && s.currentPrice != null)
      .map((s) => (s.currentPrice! / s.initialPrice!) * 100 - product.kiPct!)
    bufferPct = buffers.length ? Math.round(Math.min(...buffers)) : null
  }

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


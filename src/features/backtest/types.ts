import type { MarketHint } from '../ingest/ingest'

export type StructureType =
  | 'KIKO'
  | 'KO-only'
  | 'Memory/Snowball'
  | 'Phoenix'
  | 'Airbag/Buffer'
  | 'Twin-Win'
  | 'Other'

/** One structured-note product extracted from a term sheet. Schema is flexible:
 *  KI/KO/strike may be null depending on the structure. Levels are % of initial. */
export interface NoteProduct {
  id: string
  productCode: string | null
  issuer: string | null
  underlyings: string[] // tickers, e.g. ["AMD", "MRVL"]
  initialPrices: number[] // reference price per underlying AS STATED IN THE TERM SHEET, same order as underlyings — [] if not printed in the doc
  market: MarketHint // where the underlyings trade (drives the price source)
  structureType: StructureType
  strikePct: number | null // % of initial reference price
  kiPct: number | null // Knock-In level, % of initial (null if none)
  koPct: number | null // Knock-Out level, % of initial (null if none)
  couponPa: number | null // coupon, % per annum
  tenor: string | null // e.g. "6M", "1Y"
  tenorMonths: number | null // parsed tenor in months (for scoring)
  fixingDate: string | null // YYYY-MM-DD, the initial strike/fixing date
  observationDates: string[] // all observation dates (YYYY-MM-DD)
  koObservationDates: string[] // KO observation dates specifically
  koObservationFrequency: 'daily' | 'monthly' | 'quarterly' | null // cadence, used when the doc gives no explicit date list (e.g. "Monthly Observe")
  koType: 'memory' | 'final-valuation' | null // how KO is assessed: any observation date triggers it (memory/autocall style) vs only the final valuation date
  summary: string
  raw: string // raw model output, for the Details tab / debugging
  sourceFile: string // which uploaded file this came from
}

export type Verdict = 'pass' | 'knocked'

/** Per-underlying backtest detail. */
export interface UnderlyingSeries {
  symbol: string
  candles: { time: number; open: number; high: number; low: number; close: number }[]
  initialPrice: number | null // the term sheet's stated price if given, else close on/after fixing date
  fixingTime: number | null // unix time of the candle used as initialPrice (contract start marker)
  strikeLevel: number | null
  kiLevel: number | null
  koLevel: number | null
  currentPrice: number | null
  minClose: number | null
  knockedIn: boolean // this stock ever closed <= kiLevel
}

export interface BacktestResult {
  verdict: Verdict
  knockedIn: boolean
  knockedOut: boolean
  bufferPct: number | null // worst-of distance from current price to KI level (%)
  volatilityPct: number | null // worst-of annualised volatility (%), from the backtest window
  windowMonths: number // the lookback window this result was computed over
  series: UnderlyingSeries[]
  error: string | null // if prices couldn't be fetched
  warnings: string[] // non-fatal data-quality issues (e.g. missing fixing date, discarded initial prices)
}

export type ProfileKey = 'aggressive' | 'balanced' | 'save' | 'custom'

export interface ScoreWeights {
  coupon: number
  buffer: number
  tenor: number
  volatility: number
}

export interface ScoredProduct {
  product: NoteProduct
  backtest: BacktestResult
  score: number // 0-100
  rank: number // rank within its verdict group
}

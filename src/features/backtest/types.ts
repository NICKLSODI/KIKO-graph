import type { MarketHint } from '../ingest/ingest'
import type { VariantFields } from '../factsheet/fields'

// Same 13 keys as the factsheet REGISTRY (factsheet_generator.js) — this is now the ONLY
// product-type classifier in the app. It used to be a separate 7-value freeform guess from
// the AI (KIKO/KO-only/Memory-Snowball/Phoenix/Airbag-Buffer/Twin-Win/Other), which routinely
// disagreed with the factsheet's own detectVariant() classification of the same document
// (e.g. a Bearish Sharkfin could show "KO-only" on the dashboard while auto-detecting as
// "booster" on the factsheet screen). Now structureType IS detectVariant()'s output, computed
// once at extraction time from variantFields — dashboard and factsheet always agree.
export type StructureType =
  | 'kiko'
  | 'twin_win'
  | 'bullish_sharkfin'
  | 'bearish_sharkfin'
  | 'booster'
  | 'booster_prot'
  | 'ben'
  | 'ben_cash'
  | 'ben_prot'
  | 'fcn'
  | 'fixed_rate_note'
  | 'three_musketeers'
  | 'lookback_dispersion'

export const STRUCTURE_TYPES: StructureType[] = [
  'kiko', 'twin_win', 'bullish_sharkfin', 'bearish_sharkfin', 'booster', 'booster_prot',
  'ben', 'ben_cash', 'ben_prot', 'fcn', 'fixed_rate_note', 'three_musketeers', 'lookback_dispersion',
]

/** Human-readable labels — structureType itself stays the canonical snake_case key (used for
 *  ranking + factsheet template selection); use this wherever the value is shown to a user
 *  (badges, CSV/PDF export, script generation facts). */
export const STRUCTURE_TYPE_LABELS: Record<StructureType, string> = {
  kiko: 'KIKO',
  twin_win: 'Twin Win',
  bullish_sharkfin: 'Bullish Sharkfin',
  bearish_sharkfin: 'Bearish Sharkfin',
  booster: 'Booster',
  booster_prot: 'Booster (Protected)',
  ben: 'BEN',
  ben_cash: 'BEN (Cash Settlement)',
  ben_prot: 'BEN (Protected)',
  fcn: 'FCN',
  fixed_rate_note: 'Fixed Rate Note',
  three_musketeers: 'Three Musketeers',
  lookback_dispersion: 'Lookback Dispersion',
}

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
  kiType: 'daily' | 'final-valuation' | null // how KI is assessed: continuous daily barrier (the common case) vs only checked at the final valuation date (the rarer, starred case)
  summary: string
  /** True when the source document marks this product as the desk's own pick
   *  (e.g. "💎 INVX recommend" on a desk listing). Purely a passthrough flag from the
   *  document — never inferred from score/rank. */
  invxPick: boolean
  /** Factsheet field block (values as strings with units, e.g. "115%") — extracted in the
   *  same AI call; null for older cached extractions made before this field existed. */
  variantFields: VariantFields | null
  raw: string // raw model output, for the Details tab / debugging
  sourceFile: string // which uploaded file this came from
}

// Shared display labels for KO/KI observation type — used by both the web detail page
// and the PDF/JPG export facts, so the two never drift apart. Each dimension has a common
// case (shown plain) and a rarer case that gets a ✱ star to flag it as worth double-checking.
// KO: a document that just says "Monthly Observe" with no further qualifier defaults to
// "Monthly Observe (Final Valuation)" — that's the common case and stays plain; when the
// document's wording also mentions "Memory" (any monthly date triggers immediately), show
// "Monthly Observe (Monthly Memory)" — the rarer, starred case.
// KI: continuous daily barrier is the default assumption (shown even when unspecified);
// "At Final Valuation" (checked only once) is the special/starred case.
export function koObservationLabel(p: Pick<NoteProduct, 'koType'>): string {
  return p.koType === 'memory' ? '✱ Monthly Observe (Monthly Memory)' : 'Monthly Observe (Final Valuation)'
}
export function kiObservationLabel(p: Pick<NoteProduct, 'kiType'>): string {
  return p.kiType === 'final-valuation' ? '✱ At Final Valuation' : 'Daily Observe'
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
  /** true once backtestDetail() has run and series[].candles are populated for the chart.
   *  false after backtestScore() — candles arrays are empty to avoid upfront bulk fetching. */
  chartReady: boolean
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

/** Product opened in the detail / export view. Only KIKO products are scored & ranked —
 *  everything else carries null (shown as "–", excluded from the ranking tables). */
export interface DetailProduct {
  product: NoteProduct
  backtest: BacktestResult
  score: number | null // 0-100
  rank: number | null // rank within its verdict group
}

export interface ScoredProduct extends DetailProduct {
  score: number
  rank: number
}

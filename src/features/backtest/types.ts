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
  /** Product/stock name exactly as the document prints it (e.g. "BANGKOK DUSIT MED SERVICE
   *  (BDMS)") — used as the display name when there is no product code, instead of a
   *  generated "<structure> (<tickers>)" label. */
  productName: string | null
  issuer: string | null
  underlyings: string[] // tickers, e.g. ["AMD", "MRVL"]
  initialPrices: number[] // reference price per underlying AS STATED IN THE TERM SHEET, same order as underlyings — [] if not printed in the doc
  market: MarketHint // where the underlyings trade (drives the price source)
  /** Subscription/notional amount printed in the document ("ลงทุนขั้นต่ำ 5 แสนบาท" → 500000),
   *  in the market's own currency. null when the document doesn't state one — callers then
   *  fall back to DEFAULT_NOTIONAL. */
  notional: number | null
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

/** Display name for a product, in the order the desk expects to see it: the real product
 *  code when the document has one, otherwise the product/stock name printed in the document
 *  itself (e.g. "BANGKOK DUSIT MED SERVICE (BDMS)") — never re-labelled into a generated
 *  "KIKO (BDMS)" when the source already named it. The derived/source label is the last resort. */
export function productLabel(p: Pick<NoteProduct, 'productCode' | 'productName' | 'sourceFile'>): string {
  return p.productCode ?? p.productName ?? p.sourceFile
}

/** Standard desk ticket size per market, in the market's own currency: THB 1,000,000 for
 *  Thai underlyings, USD 30,000 for foreign ones. Prefilled in the detail page's Notional
 *  box and assumed by the factsheet when no notional was entered, so Min. Subscription /
 *  Net Interest / shares-for-delivery never silently drop out of an exported sheet. */
export const DEFAULT_NOTIONAL: Record<MarketHint, number> = { thai: 1_000_000, foreign: 30_000 }

/** The notional to work with: the one the document itself printed, else the desk default. */
export function notionalFor(p: Pick<NoteProduct, 'notional' | 'market'>): number {
  return p.notional != null && p.notional > 0 ? p.notional : DEFAULT_NOTIONAL[p.market]
}

/** Thai withholding tax on note interest. */
export const WHT_RATE = 0.15

/** Shares delivered per underlying if the note settles physically: notional ÷ strike price,
 *  rounded DOWN to the tradable board lot (100 on the SET, single shares abroad) — the same
 *  arithmetic the factsheet prints, so the web table and the client's sheet can't disagree. */
export function sharesForDelivery(notional: number, strikeLevel: number | null, market: MarketHint): number | null {
  if (!strikeLevel || !(notional > 0)) return null
  const lot = market === 'thai' ? 100 : 1
  return Math.floor(notional / strikeLevel / lot) * lot
}

/** Monthly interest on a notional at the note's coupon — the headline number the desk leads
 *  with. THB notes are quoted NET of the 15% Thai withholding tax (what actually lands in the
 *  account); foreign-currency notes are quoted gross, because asserting a Thai WHT rate on a
 *  non-THB deal would be wrong. Returns null when the note has no coupon. */
export function monthlyInterest(
  p: Pick<NoteProduct, 'couponPa' | 'market' | 'notional'>,
  notional = notionalFor(p),
): { amount: number; net: boolean; currency: 'THB' | 'USD' } | null {
  if (p.couponPa == null || !(notional > 0)) return null
  const net = p.market === 'thai'
  return {
    amount: (notional * (p.couponPa / 100)) / 12 * (net ? 1 - WHT_RATE : 1),
    net,
    currency: net ? 'THB' : 'USD',
  }
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

/** Human labels for the backtest lookback windows. */
const WINDOW_LABELS: Record<number, string> = { 6: '6 เดือน', 12: '1 ปี', 24: '2 ปี' }
export const windowLabel = (m: number): string => WINDOW_LABELS[m] ?? `${m} เดือน`

/** The verdict in the desk's own words, used everywhere (app, report, client images, CSV).
 *  The backtest asks exactly one question — over the lookback window, did any close reach the
 *  KI barrier? — so say where the barrier sits relative to that window's lowest price instead
 *  of the opaque "Historical Pass / Knocked". */
export function verdictLabel(verdict: Verdict, windowMonths: number = 12): string {
  const w = windowLabel(windowMonths)
  return verdict === 'pass'
    ? `KI ยังลึกกว่าราคาต่ำสุดย้อนหลัง ${w}`
    : `KI อยู่สูงกว่าราคาต่ำสุดย้อนหลัง ${w}`
}

/** Per-stock verdict. The note's own verdict is worst-of (one stock breaching knocks the
 *  whole basket in), so a single basket-level line next to three charts reads as if it
 *  described every stock — each chart states its own answer instead. */
export function seriesVerdict(u: { knockedIn: boolean }): Verdict {
  return u.knockedIn ? 'knocked' : 'pass'
}
/** Chip text for one stock. 'pass' = the KI barrier sits BELOW ("ลึกกว่า") that stock's lowest
 *  close, i.e. never reached; 'knocked' = the barrier sits above it, so the price traded through
 *  KI in the window. Pass `windowMonths` where the chip stands alone (the exported image, which
 *  is read outside the app) so it states which lookback it is talking about. */
export function seriesVerdictLabel(verdict: Verdict, windowMonths?: number): string {
  const suffix = windowMonths == null ? '' : `ย้อนหลัง ${windowLabel(windowMonths)}`
  return verdict === 'pass' ? `KI ลึกกว่าราคาต่ำสุด${suffix}` : `KI สูงกว่าราคาต่ำสุด${suffix}`
}
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

// 'all' = the dashboard's default neutral view (equal weights). 'balanced' is no longer offered
// in the dashboard UI, but the PDF/CSV export still scores every product under it for its
// "best-fit customer" column, so it stays a valid key here.
export type ProfileKey = 'all' | 'aggressive' | 'balanced' | 'save'

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

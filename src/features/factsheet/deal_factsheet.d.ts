// Typings for memie's deal→factsheet-data mapper (verbatim .js implementation).
import type { FactsheetData } from './factsheet_generator'

/** Deal object shape produced by her parser / our variantFieldsToDeal adapter. */
export interface Deal {
  letter: string | null
  date: string | null
  category: string | null
  product: string | null
  underlyings: string[]
  issuer: string | null
  notes: string[]
  tenor: string | null
  redemptionUpon: string | null
  dates: { trade: string | null; issue: string | null; maturity: string | null } | null
  levels: {
    ko: string | null
    koObs: string | null
    ki: string | null
    kiObs: string | null
    strike: string | null
    upperKO: string | null
    lowerKO: string | null
    participation: string | null
    koRebate: string | null
    minRedemption: string | null
    minCoupon: string | null
    coupon: string | null
  }
  variantFields: Record<string, string | null>
  /** Optional subscription notional — enables min-subscription + net-interest tiles/column. */
  notional?: number
  /** Currency for the notional display (e.g. "THB", "USD"). */
  currency?: string
  /** Latest market closes keyed by underlying symbol — enables the reference-style
   *  Spot / money-levels / shares-for-delivery basket layout. */
  spots?: Record<string, number>
  /** ISO date of the closes in `spots` (shown in the basket provenance note). */
  spotAsOf?: string
}

/** Product keys with a verified real-deal mapper (9/13). Unmapped keys make
 *  dealToFactsheetData throw — callers must fall back to the illustrative template. */
export declare const MAPPED_PRODUCT_KEYS: string[]
/** Convert a deal object to renderable factsheet data. Throws for unmapped product types. */
export declare function dealToFactsheetData(deal: Deal, overrideKey?: string): FactsheetData

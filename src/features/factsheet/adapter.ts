// Bridge between our batch-extraction pipeline (NoteProduct) and memie's factsheet
// modules. Ports variantFieldsToDeal from her copilot demo (memie/factsheet/
// copilot_demo_PHASE1_FINAL.jsx) — real numbers from the actual document, nothing invented.
import { buildFactsheetKH, detectVariant, REGISTRY } from './factsheet_generator.js'
import { dealToFactsheetData, MAPPED_PRODUCT_KEYS, type Deal } from './deal_factsheet.js'
import { VF_KEYS, type VariantFields } from './fields'
import type { NoteProduct } from '../backtest/types'
import { notionalFor } from '../backtest/types'

const pct = (v: number | null): string | null => (v == null ? null : `${v}%`)

// KO observation wording for the factsheet, folding koType 'memory' into the string the
// deal mapper regex looks for (`/mem/`). Preserves the plain frequency when not a memory note.
function koObservationText(p: NoteProduct): string | null {
  const freq = p.koObservationFrequency
  if (p.koType === 'memory') return freq ? `${freq} memory` : 'memory'
  return freq
}

/** Fill variantFields gaps from the note-schema extraction of the same document —
 *  one AI call produced both, so this is still "no invented data", just deduplication. */
export function backfillFromProduct(vf: VariantFields | null, p: NoteProduct): VariantFields {
  const base: VariantFields = vf ?? (Object.fromEntries(VF_KEYS.map((k) => [k, null])) as unknown as VariantFields)
  return {
    ...base,
    family: base.family ?? p.structureType,
    underlyings: base.underlyings?.length ? base.underlyings : p.underlyings.length ? p.underlyings : null,
    tenor: base.tenor ?? p.tenor,
    issuer: base.issuer ?? p.issuer,
    tradeDate: base.tradeDate ?? p.fixingDate,
    koObservation: base.koObservation ?? koObservationText(p),
    // Propagate kiType so the mapper describes the barrier correctly: 'final-valuation'
    // (European) → "At Final Valuation" (mapper regex `/final|european/`); else leave null
    // so it defaults to the continuous-daily wording the mapper already assumes.
    kiObservation: base.kiObservation ?? (p.kiType === 'final-valuation' ? 'At Final Valuation' : null),
    ko: base.ko ?? pct(p.koPct),
    knockIn: base.knockIn ?? pct(p.kiPct),
    strike: base.strike ?? pct(p.strikePct),
    coupon: base.coupon ?? (p.couponPa == null ? null : `${p.couponPa}% p.a.`),
  }
}

/** Reshape variant_fields into the deal-object shape memie's parser produces, so it can
 *  go straight through dealToFactsheetData(). Ported verbatim from her demo. */
export function variantFieldsToDeal(vf: VariantFields): Deal {
  return {
    letter: null,
    date: null,
    category: vf.family || null,
    product: vf.family || null,
    underlyings: Array.isArray(vf.underlyings) ? vf.underlyings : [],
    issuer: vf.issuer || null,
    notes: [],
    tenor: vf.tenor || null,
    redemptionUpon: null,
    dates: (vf.tradeDate || vf.issueDate || vf.maturityDate)
      ? { trade: vf.tradeDate ?? null, issue: vf.issueDate ?? null, maturity: vf.maturityDate ?? null }
      : null,
    levels: {
      ko: vf.ko ?? null, koObs: vf.koObservation ?? null, ki: vf.knockIn ?? null, kiObs: vf.kiObservation ?? null,
      strike: vf.strike ?? null, upperKO: vf.upperKO ?? null, lowerKO: vf.lowerKO ?? null,
      participation: vf.participation ?? null, koRebate: vf.koRebate ?? null, minRedemption: vf.minRedemption ?? null,
      minCoupon: vf.minCoupon ?? null, coupon: vf.coupon ?? null,
      // BEN factsheets read these headline terms straight off levels; without them the
      // "Coupon Barrier" and "Bonus Coupon" rows render "—".
      couponBarrier: vf.couponBarrier ?? null, bonus: vf.bonus ?? null,
    },
    variantFields: {
      family: vf.family ?? null, ko: vf.ko ?? null, ki: vf.knockIn ?? null,
      upperKO: vf.upperKO ?? null, lowerKO: vf.lowerKO ?? null, strike: vf.strike ?? null,
      participation: vf.participation ?? null, couponBarrier: vf.couponBarrier ?? null,
      bonus: vf.bonus ?? null, minRedemption: vf.minRedemption ?? null, settlement: vf.settlement ?? null,
    },
  }
}

export interface FactsheetRender {
  html: string
  /** Product key actually rendered (auto-detected or override). */
  key: string
  /** true = rendered from the document's real extracted data; false = illustrative template. */
  real: boolean
  /** Set when real-data rendering failed and we fell back to the illustrative template. */
  fallbackReason: string | null
}

export const FACTSHEET_KEYS: string[] = Object.keys(REGISTRY)
export { MAPPED_PRODUCT_KEYS }

/** Render a factsheet for one product. Tries the real-deal pipeline first
 *  (variant_fields → deal → dealToFactsheetData → buildFactsheetKH); falls back to the
 *  illustrative REGISTRY template when the product type has no verified mapper yet or
 *  the extraction carried no variant_fields (per memie's compliance rules: never guess). */
export function renderFactsheet(
  product: NoteProduct,
  lang: 'en' | 'th',
  overrideKey?: string,
  notional?: number | null,
  spots?: Record<string, number> | null,
  spotAsOf?: string | null,
): FactsheetRender {
  const vf = backfillFromProduct(product.variantFields, product)
  const deal = variantFieldsToDeal(vf)
  // Notional drives min-subscription + net-interest-after-tax and the shares-for-delivery
  // column. Priority: what the IC typed → what the document itself stated → the desk's
  // standard ticket size for that market (THB 1,000,000 / USD 30,000). Without any of them
  // those rows silently disappeared from exported factsheets.
  // Currency follows the underlying's market (Thai → THB, else USD).
  const amount = notional != null && notional > 0 ? notional : notionalFor(product)
  deal.notional = amount
  deal.currency = product.market === 'thai' ? 'THB' : 'USD'
  // Latest market closes (from the backtest's price data) — turns the %-only basket into
  // the reference layout with Spot, money levels, and shares-for-delivery.
  if (spots && Object.keys(spots).length) {
    deal.spots = spots
    deal.currency = deal.currency ?? (product.market === 'thai' ? 'THB' : 'USD')
    if (spotAsOf) deal.spotAsOf = spotAsOf
  }
  const autoKey = detectVariant(deal.variantFields) ?? 'kiko'
  const key = overrideKey || autoKey

  try {
    const data = dealToFactsheetData(deal, overrideKey || undefined)
    return { html: buildFactsheetKH(data, lang), key: (data._type as string) ?? key, real: true, fallbackReason: null }
  } catch (err) {
    // No verified mapper for this type (or malformed fields) — illustrative template instead.
    const registryKey = key in REGISTRY ? key : 'kiko'
    return {
      html: buildFactsheetKH(registryKey, lang),
      key: registryKey,
      real: false,
      fallbackReason: err instanceof Error ? err.message : String(err),
    }
  }
}

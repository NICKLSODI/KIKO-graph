// variant_fields schema + sanitizer — kept free of factsheet_generator imports so the
// extraction pipeline can use it without pulling the (large) render engine + logo into
// the main bundle; the engine loads lazily with the Factsheet screen.

/** Machine-readable field block extracted alongside the note schema. Values are kept as
 *  formatted strings with units ("115%", "20% flat", "16.00% p.a.") so they can go
 *  straight into the factsheet without reformatting — exactly what the deal mapper's
 *  `levels` object expects. */
export interface VariantFields {
  family: string | null
  underlyings: string[] | null
  tenor: string | null
  issuer: string | null
  tradeDate: string | null
  issueDate: string | null
  maturityDate: string | null
  koObservation: string | null
  kiObservation: string | null
  ko: string | null
  upperKO: string | null
  lowerKO: string | null
  knockIn: string | null
  strike: string | null
  participation: string | null
  minRedemption: string | null
  couponBarrier: string | null
  bonus: string | null
  koRebate: string | null
  minCoupon: string | null
  coupon: string | null
  settlement: string | null
}

export const VF_KEYS: (keyof VariantFields)[] = [
  'family', 'underlyings', 'tenor', 'issuer', 'tradeDate', 'issueDate', 'maturityDate',
  'koObservation', 'kiObservation', 'ko', 'upperKO', 'lowerKO', 'knockIn', 'strike',
  'participation', 'minRedemption', 'couponBarrier', 'bonus', 'koRebate', 'minCoupon',
  'coupon', 'settlement',
]

/** Sanitize the raw variantFields object from the model reply. Returns null if the
 *  block is missing entirely (older cached extractions). */
export function parseVariantFields(v: unknown): VariantFields | null {
  if (v == null || typeof v !== 'object' || Array.isArray(v)) return null
  const src = v as Record<string, unknown>
  const out = {} as Record<keyof VariantFields, VariantFields[keyof VariantFields]>
  for (const k of VF_KEYS) {
    const raw = src[k]
    if (k === 'underlyings') {
      out[k] = Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : null
    } else {
      out[k] = typeof raw === 'string' && raw.trim() !== '' ? raw.trim() : typeof raw === 'number' ? String(raw) : null
    }
  }
  return out as VariantFields
}

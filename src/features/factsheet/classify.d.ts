// Typings for classify.js — the pure product-type classifier split out of
// factsheet_generator.js so the eager main bundle can classify without loading the
// (much larger) render engine. See classify.js for why this split exists.

/** Fields used by detectVariant to classify a product (parameter-first). */
export interface VariantClassifierFields {
  family?: string | null
  ko?: string | number | null
  ki?: string | number | null
  knockIn?: string | number | null
  upperKO?: string | number | null
  lowerKO?: string | number | null
  strike?: string | number | null
  participation?: string | number | null
  couponBarrier?: string | number | null
  bonus?: string | null
  minRedemption?: string | number | null
  settlement?: string | null
}

/** Parameter-first product classifier — parameters win over the (often wrong) name. */
export declare function detectVariant(f: VariantClassifierFields): string | null

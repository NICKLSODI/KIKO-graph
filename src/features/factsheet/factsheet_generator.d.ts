// Typings for memie's factsheet render engine (see memie/factsheet/HANDOVER_factsheet_KH2.md).
// The .js implementation is copied verbatim from her verified standalone module.

/** Bilingual string pair used throughout the registry/labels. */
export interface Bi {
  en: string
  th: string
}

/** One renderable factsheet data object (same shape as a REGISTRY entry). */
export interface FactsheetData {
  _type?: string
  _realDeal?: boolean
  [key: string]: unknown
}

/** Fields used by detectVariant to classify a product (parameter-first). */
export interface VariantClassifierFields {
  family?: string | null
  ko?: string | number | null
  ki?: string | number | null
  upperKO?: string | number | null
  lowerKO?: string | number | null
  strike?: string | number | null
  participation?: string | number | null
  couponBarrier?: string | number | null
  bonus?: string | null
  minRedemption?: string | number | null
  settlement?: string | null
}

export declare const CSS: string
export declare const LABELS: Record<string, Bi>
/** 13 curated product templates (illustrative, from the Offshore SN Sale Kit). */
export declare const REGISTRY: Record<string, FactsheetData>
/** Parameter-first product classifier — parameters win over the (often wrong) name. */
export declare function detectVariant(f: VariantClassifierFields): string | null
/** Render a factsheet: pass a REGISTRY key (illustrative) or a real data object. */
export declare function buildFactsheetKH(dataOrKey: string | FactsheetData, lang: 'en' | 'th', opts?: Record<string, unknown>): string

export interface Candle {
  time: number // unix timestamp, seconds
  open: number
  high: number
  low: number
  close: number
}

export type Market = 'foreign' | 'thai'

export type LevelKind = 'strike' | 'knock-in' | 'knock-out'

export interface Level {
  id: string
  kind: LevelKind
  price: number
  label: string
}

export const LEVEL_COLORS: Record<LevelKind, string> = {
  strike: '#378ADD',
  // KI = red (the downside/"bad" barrier), KO = green (upside autocall) — swapped per desk request.
  'knock-in': '#E24B4A',
  'knock-out': '#639922',
}

export const LEVEL_LABELS: Record<LevelKind, string> = {
  strike: 'Strike',
  'knock-in': 'Knock-In',
  'knock-out': 'Knock-Out',
}

export interface DateMark {
  id: string
  time: number // unix timestamp, seconds
  label: string
}

export interface DroppedFile {
  data: string // base64, no data-URL prefix
  mediaType: string
  name: string
}

export type InputMode = 'link' | 'file' | 'text'

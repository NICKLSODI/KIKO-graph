import { useState } from 'react'
import type { DroppedFile, InputMode } from './types'
import type { OutputCategory, ScriptFormatKey } from './constants'
import type { RetrievedProductData } from './features/ingest/ingest'
import type { NoteProduct } from './features/backtest/types'

export type Screen =
  | 'landing'
  | 'input'
  | 'chooseOutput'
  | 'retrieve'
  | 'graph'
  | 'persona'
  | 'scriptConfig'
  | 'scriptResults'
  | 'factsheet'
  | 'backtest'

export interface AppState {
  screen: Screen

  // Step 1 — dropped info
  mode: InputMode
  text: string
  link: string
  file: DroppedFile | null
  productType: string
  targetProduct: string

  // Step 2 — chosen output category
  outputCategory: OutputCategory | null

  // Step 3 — retrieved product data (kept for downstream branches)
  retrieved: RetrievedProductData | null

  // Product picked from the Backtest & Rank dashboard for factsheet/script generation
  selectedProduct: NoteProduct | null
  // Notional entered on the detail page — carried to the factsheet so it can show
  // min subscription + net-interest-after-tax (null = not entered, those tiles hidden).
  notional: number | null
  // Latest market closes per underlying (from the backtest price data) + their date —
  // lets the factsheet render the Spot / money-levels / shares basket like the reference.
  spots: Record<string, number> | null
  spotAsOf: string | null

  // Persona (script branch)
  relationshipStatus: string
  ageRange: string
  financialKnowledge: string
  investmentGoal: string
  riskProfile: string
  experienceLevel: string
  assetTier: string
  concerns: string[]

  // Script output config
  tone: string
  focus: string[]
  scriptFormats: ScriptFormatKey[]
  durationMinutes: number
}

const INITIAL: AppState = {
  // The batch dashboard (upload → extract → rank → detail → script/factsheet) IS the app now —
  // the old single-product wizard entry was replaced by it.
  screen: 'backtest',
  mode: 'text',
  text: '',
  link: '',
  file: null,
  productType: '',
  targetProduct: '',
  outputCategory: null,
  retrieved: null,
  selectedProduct: null,
  notional: null,
  spots: null,
  spotAsOf: null,
  relationshipStatus: '',
  ageRange: '',
  financialKnowledge: '',
  investmentGoal: '',
  riskProfile: '',
  experienceLevel: '',
  assetTier: '',
  concerns: [],
  tone: '',
  focus: [],
  scriptFormats: ['callScript'],
  durationMinutes: 10,
}

export type Patch = (partial: Partial<AppState>) => void

export function useStore(): { state: AppState; patch: Patch; reset: () => void } {
  const [state, setState] = useState<AppState>(INITIAL)
  const patch: Patch = (partial) => setState((prev) => ({ ...prev, ...partial }))
  const reset = () => setState({ ...INITIAL })
  return { state, patch, reset }
}

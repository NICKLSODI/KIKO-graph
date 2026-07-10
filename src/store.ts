import { useState } from 'react'
import type { DroppedFile, InputMode } from './types'
import type { OutputCategory, ScriptFormatKey } from './constants'
import type { RetrievedProductData } from './features/ingest/ingest'

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
  screen: 'landing',
  mode: 'text',
  text: '',
  link: '',
  file: null,
  productType: '',
  targetProduct: '',
  outputCategory: null,
  retrieved: null,
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

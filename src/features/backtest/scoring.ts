import type { BacktestResult, NoteProduct, ProfileKey, ScoredProduct, ScoreWeights } from './types'

export const PROFILE_WEIGHTS: Record<Exclude<ProfileKey, 'custom'>, ScoreWeights> = {
  // Aggressive: chase coupon. Balanced: equal. Save: prioritise safety (buffer + short tenor).
  aggressive: { coupon: 0.6, buffer: 0.2, tenor: 0.2 },
  balanced: { coupon: 1, buffer: 1, tenor: 1 },
  save: { coupon: 0.1, buffer: 0.6, tenor: 0.3 },
}

export const PROFILE_LABELS: Record<ProfileKey, string> = {
  aggressive: 'Aggressive (เน้นผลตอบแทน)',
  balanced: 'Balanced (สมดุล)',
  save: 'Save (เน้นปลอดภัย)',
  custom: 'Custom (ตั้งน้ำหนักเอง)',
}

export const DEFAULT_CUSTOM_WEIGHTS: ScoreWeights = { coupon: 1, buffer: 1, tenor: 1 }

export function weightsFor(profile: ProfileKey, custom: ScoreWeights): ScoreWeights {
  return profile === 'custom' ? custom : PROFILE_WEIGHTS[profile]
}

// Min-max normalise to 0..1; null stays null (treated as neutral 0.5 at scoring time).
function normalize(values: (number | null)[]): (number | null)[] {
  const present = values.filter((v): v is number => v != null)
  if (present.length === 0) return values.map(() => null)
  const min = Math.min(...present)
  const max = Math.max(...present)
  if (max === min) return values.map((v) => (v == null ? null : 0.5))
  return values.map((v) => (v == null ? null : (v - min) / (max - min)))
}

interface Item {
  product: NoteProduct
  backtest: BacktestResult
}

export function scoreProducts(items: Item[], weights: ScoreWeights): ScoredProduct[] {
  const couponN = normalize(items.map((i) => i.product.couponPa))
  const bufferN = normalize(items.map((i) => i.backtest.bufferPct))
  // Shorter tenor is better → invert the normalised tenor.
  const tenorRaw = normalize(items.map((i) => i.product.tenorMonths))
  const tenorN = tenorRaw.map((v) => (v == null ? null : 1 - v))

  const wSum = weights.coupon + weights.buffer + weights.tenor || 1
  const neutral = (v: number | null) => (v == null ? 0.5 : v)

  const scored = items.map((item, idx) => {
    const raw =
      (weights.coupon * neutral(couponN[idx]) +
        weights.buffer * neutral(bufferN[idx]) +
        weights.tenor * neutral(tenorN[idx])) /
      wSum
    return { product: item.product, backtest: item.backtest, score: Math.round(raw * 1000) / 10, rank: 0 }
  })

  // Rank within each verdict group (pass / knocked), highest score = rank 1.
  for (const verdict of ['pass', 'knocked'] as const) {
    scored
      .filter((s) => s.backtest.verdict === verdict)
      .sort((a, b) => b.score - a.score)
      .forEach((s, i) => (s.rank = i + 1))
  }
  return scored
}

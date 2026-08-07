import type { BacktestResult, NoteProduct, ProfileKey, ScoredProduct, ScoreWeights } from './types'

export const PROFILE_WEIGHTS: Record<ProfileKey, ScoreWeights> = {
  // coupon / buffer / tenor / volatility
  all: { coupon: 1, buffer: 1, tenor: 1, volatility: 1 }, // neutral — equal weight, the default view
  aggressive: { coupon: 0.6, buffer: 0.15, tenor: 0.15, volatility: 0.1 },
  balanced: { coupon: 1, buffer: 1, tenor: 1, volatility: 1 }, // export best-fit only (not in dashboard UI)
  save: { coupon: 0.1, buffer: 0.4, tenor: 0.2, volatility: 0.3 },
}

export const PROFILE_LABELS: Record<ProfileKey, string> = {
  all: 'All (ทั้งหมด)',
  aggressive: 'Aggressive (เน้นผลตอบแทน)',
  balanced: 'Balanced (สมดุล)',
  // Label reads "Safe"; the key stays `save` because it's persisted in sessions/CSV headers.
  save: 'Safe (เน้นปลอดภัย)',
}

export function weightsFor(profile: ProfileKey): ScoreWeights {
  return PROFILE_WEIGHTS[profile]
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
  // Shorter tenor is better, lower volatility is better → invert both.
  const tenorN = normalize(items.map((i) => i.product.tenorMonths)).map((v) => (v == null ? null : 1 - v))
  const volN = normalize(items.map((i) => i.backtest.volatilityPct)).map((v) => (v == null ? null : 1 - v))

  const wSum = weights.coupon + weights.buffer + weights.tenor + weights.volatility || 1
  const neutral = (v: number | null) => (v == null ? 0.5 : v)

  const scored = items.map((item, idx) => {
    const raw =
      (weights.coupon * neutral(couponN[idx]) +
        weights.buffer * neutral(bufferN[idx]) +
        weights.tenor * neutral(tenorN[idx]) +
        weights.volatility * neutral(volN[idx])) /
      wSum
    return { product: item.product, backtest: item.backtest, score: Math.round(raw * 1000) / 10, rank: 0 }
  })

  for (const verdict of ['pass', 'knocked'] as const) {
    scored
      .filter((s) => s.backtest.verdict === verdict)
      .sort((a, b) => b.score - a.score)
      .forEach((s, i) => (s.rank = i + 1))
  }
  return scored
}

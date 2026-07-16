import type { Candle } from '../types'
import type { MarketHint } from '../features/ingest/ingest'

const BACKEND_URL = 'http://localhost:8000'

// Dedupe repeated symbols within a batch (e.g. AMD appears in many products).
const cache = new Map<string, Promise<Candle[]>>()

async function doFetch(symbol: string, market: MarketHint): Promise<Candle[]> {
  const url = new URL(`${BACKEND_URL}/candles-yahoo`)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', '1d')
  url.searchParams.set('market', market)
  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `โหลดราคา ${symbol} ไม่สำเร็จ (${res.status})`)
  }
  return res.json()
}

/** Daily closes for a symbol (cached per session). Never rejects the cache on error. */
export function fetchDailyCloses(symbol: string, market: MarketHint): Promise<Candle[]> {
  const key = `${market}:${symbol.toUpperCase()}`
  const existing = cache.get(key)
  if (existing) return existing
  const p = doFetch(symbol, market).catch((err) => {
    cache.delete(key) // let a later retry re-fetch
    throw err
  })
  cache.set(key, p)
  return p
}

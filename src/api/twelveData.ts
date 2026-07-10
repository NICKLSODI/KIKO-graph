import type { Candle } from '../types'

const BACKEND_URL = 'http://localhost:8000'

// Foreign (US) stock candles via the backend, which holds the Twelve Data key (backend/.env).
export async function fetchForeignCandles(symbol: string, interval: string): Promise<Candle[]> {
  const url = new URL(`${BACKEND_URL}/candles-twelvedata`)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', interval)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Twelve Data request failed (${res.status})`)
  }
  return res.json()
}

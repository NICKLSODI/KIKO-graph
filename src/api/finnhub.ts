import type { Candle } from '../types'

const BACKEND_URL = 'http://localhost:8000'

export async function fetchForeignCandlesFinnhub(symbol: string, interval: string): Promise<Candle[]> {
  const url = new URL(`${BACKEND_URL}/candles-finnhub`)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', interval)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Finnhub request failed (${res.status})`)
  }
  return res.json()
}

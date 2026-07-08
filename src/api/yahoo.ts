import type { Candle } from '../types'

const BACKEND_URL = 'http://localhost:8000'

export async function fetchThaiCandlesYahoo(symbol: string, interval: string): Promise<Candle[]> {
  const url = new URL(`${BACKEND_URL}/candles-yahoo`)
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', interval)

  const res = await fetch(url.toString())
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.detail ?? `Yahoo Finance request failed (${res.status})`)
  }
  console.log(res)
  return res.json()
}

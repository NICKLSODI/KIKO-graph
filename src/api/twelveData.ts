import type { Candle } from '../types'

interface TwelveDataValue {
  datetime: string
  open: string
  high: string
  low: string
  close: string
}

interface TwelveDataResponse {
  status: string
  message?: string
  values?: TwelveDataValue[]
}

export async function fetchCandles(
  symbol: string,
  interval: string,
  apiKey: string,
): Promise<Candle[]> {
  const url = new URL('https://api.twelvedata.com/time_series')
  url.searchParams.set('symbol', symbol)
  url.searchParams.set('interval', interval)
  url.searchParams.set('outputsize', '300')
  url.searchParams.set('apikey', apiKey)

  const res = await fetch(url.toString())
  const data: TwelveDataResponse = await res.json()

  if (data.status === 'error') {
    throw new Error(data.message ?? 'Twelve Data request failed')
  }

  const values = data.values ?? []
  return values
    .map((v) => ({
      time: Math.floor(new Date(v.datetime.replace(' ', 'T') + 'Z').getTime() / 1000),
      open: Number(v.open),
      high: Number(v.high),
      low: Number(v.low),
      close: Number(v.close),
    }))
    .reverse()
}

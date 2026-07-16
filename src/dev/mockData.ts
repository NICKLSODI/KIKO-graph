import type { Candle } from '../types'
import type { RetrievedProductData } from '../features/ingest/ingest'
import type { NoteProduct, BacktestResult } from '../features/backtest/types'

// Helper to generate deterministic mock candles
function generateMockCandles(startPrice: number, numDays: number, seed: number): Candle[] {
  const candles: Candle[] = []
  let currentPrice = startPrice
  const now = Math.floor(Date.now() / 1000)
  const startT = now - numDays * 86400
  let t = startT

  let state = seed
  function nextRand() {
    state = (state * 1103515245 + 12345) & 0x7fffffff
    return state / 0x7fffffff
  }

  for (let i = 0; i < numDays; i++) {
    const date = new Date(t * 1000)
    const dow = date.getUTCDay()
    if (dow === 0 || dow === 6) {
      t += 86400
      i--
      continue
    }

    const change = currentPrice * (nextRand() - 0.49) * 0.02
    const open = currentPrice
    const close = currentPrice + change
    const high = Math.max(open, close) + nextRand() * (currentPrice * 0.005)
    const low = Math.min(open, close) - nextRand() * (currentPrice * 0.005)

    candles.push({
      time: t,
      open: Number(open.toFixed(2)),
      high: Number(high.toFixed(2)),
      low: Number(low.toFixed(2)),
      close: Number(close.toFixed(2)),
    })

    currentPrice = close
    t += 86400
  }
  return candles
}

// 1. MOCK_GRAPH_PRESET
const mockGraphCandles = generateMockCandles(85, 120, 101)
const mockRetrieved: RetrievedProductData = {
  summary: 'หุ้นกู้ที่มีการคืนเงินต้นอ้างอิงดัชนี ORCL อัตราดอกเบี้ยประมาณ 10% ต่อปี ชน KI ที่ 70% และ KO ที่ 108% ของราคาเริ่มต้น',
  productName: 'KIKO ORCL 10%',
  productType: 'KIKO',
  strike: 100,
  knockIn: 70,
  knockOut: 108,
  fixingDate: new Date((mockGraphCandles[0]?.time ?? 0) * 1000).toISOString().slice(0, 10),
  observationDates: ['2026-07-20', '2026-08-20', '2026-09-20', '2026-10-20'],
  maturityDate: '2026-12-20',
  underlyingSymbol: 'ORCL',
  market: 'foreign',
  raw: 'Raw extraction text here...',
}

export const MOCK_GRAPH_PRESET = {
  graphCandles: mockGraphCandles,
  graphRetrieved: mockRetrieved,
}

// 2. MOCK_BACKTEST_BUNDLE
const prod1Id = 'mock-prod-1'
const prod1CandlesAAPL = generateMockCandles(150, 220, 202)
const prod1CandlesMSFT = generateMockCandles(300, 220, 303)

const product1: NoteProduct = {
  id: prod1Id,
  productCode: 'KIKO AAPL/MSFT 12% p.a.',
  issuer: 'SCB Premium',
  underlyings: ['AAPL', 'MSFT'],
  initialPrices: [150, 300],
  market: 'foreign',
  structureType: 'kiko',
  strikePct: 100,
  kiPct: 75,
  koPct: 105,
  couponPa: 12,
  tenor: '6M',
  tenorMonths: 6,
  fixingDate: '2026-01-05',
  observationDates: ['2026-02-05', '2026-03-05', '2026-04-05', '2026-05-05', '2026-06-05', '2026-07-05'],
  koObservationDates: ['2026-02-05', '2026-03-05', '2026-04-05', '2026-05-05', '2026-06-05', '2026-07-05'],
  koObservationFrequency: null,
  koType: 'memory',
  summary: 'KIKO ที่มี AAPL และ MSFT เป็นหุ้นอ้างอิง อัตราดอกเบี้ย 12% ต่อปี ชน KI ที่ 75% และ KO ที่ 105%',
  variantFields: null,
  raw: 'Raw term sheet data for AAPL/MSFT',
  sourceFile: 'term_sheet_aapl_msft.pdf',
}

const backtest1: BacktestResult = {
  verdict: 'pass',
  knockedIn: false,
  knockedOut: false,
  bufferPct: 15.5,
  volatilityPct: 22.4,
  windowMonths: 6,
  chartReady: true,
  error: null,
  warnings: [],
  series: [
    {
      symbol: 'AAPL',
      candles: prod1CandlesAAPL,
      initialPrice: 150,
      fixingTime: prod1CandlesAAPL[0]?.time ?? null,
      strikeLevel: 150,
      kiLevel: 112.5,
      koLevel: 157.5,
      currentPrice: prod1CandlesAAPL[prod1CandlesAAPL.length - 1]?.close ?? 150,
      minClose: 135,
      knockedIn: false,
    },
    {
      symbol: 'MSFT',
      candles: prod1CandlesMSFT,
      initialPrice: 300,
      fixingTime: prod1CandlesMSFT[0]?.time ?? null,
      strikeLevel: 300,
      kiLevel: 225,
      koLevel: 315,
      currentPrice: prod1CandlesMSFT[prod1CandlesMSFT.length - 1]?.close ?? 300,
      minClose: 280,
      knockedIn: false,
    },
  ],
}

const prod2Id = 'mock-prod-2'
const prod2CandlesPTT = generateMockCandles(34, 400, 404)
const prod2CandlesCPALL = generateMockCandles(58, 400, 505)

const product2: NoteProduct = {
  id: prod2Id,
  productCode: 'KIKO PTT/CPALL 9.5% p.a.',
  issuer: 'KBank Private',
  underlyings: ['PTT', 'CPALL'],
  initialPrices: [34, 58],
  market: 'thai',
  structureType: 'kiko',
  strikePct: 100,
  kiPct: 80,
  koPct: 108,
  couponPa: 9.5,
  tenor: '1Y',
  tenorMonths: 12,
  fixingDate: '2025-07-10',
  observationDates: ['2025-08-10', '2025-09-10', '2025-10-10', '2025-11-10', '2025-12-10', '2026-01-10', '2026-02-10', '2026-03-10', '2026-04-10', '2026-05-10', '2026-06-10', '2026-07-10'],
  koObservationDates: ['2025-08-10', '2025-09-10', '2025-10-10', '2025-11-10', '2025-12-10', '2026-01-10', '2026-02-10', '2026-03-10', '2026-04-10', '2026-05-10', '2026-06-10', '2026-07-10'],
  koObservationFrequency: null,
  koType: 'final-valuation',
  summary: 'KIKO อ้างอิง PTT และ CPALL ดอกเบี้ย 9.5% ต่อปี ชน KI ที่ 80% และ KO ที่ 108%',
  variantFields: null,
  raw: 'Raw term sheet data for PTT/CPALL',
  sourceFile: 'term_sheet_ptt_cpall.pdf',
}

const backtest2: BacktestResult = {
  verdict: 'knocked',
  knockedIn: true,
  knockedOut: false,
  bufferPct: -2.3,
  volatilityPct: 18.7,
  windowMonths: 12,
  chartReady: true,
  error: null,
  warnings: [],
  series: [
    {
      symbol: 'PTT',
      candles: prod2CandlesPTT,
      initialPrice: 34,
      fixingTime: prod2CandlesPTT[0]?.time ?? null,
      strikeLevel: 34,
      kiLevel: 27.2,
      koLevel: 36.72,
      currentPrice: prod2CandlesPTT[prod2CandlesPTT.length - 1]?.close ?? 34,
      minClose: 26.5,
      knockedIn: true,
    },
    {
      symbol: 'CPALL',
      candles: prod2CandlesCPALL,
      initialPrice: 58,
      fixingTime: prod2CandlesCPALL[0]?.time ?? null,
      strikeLevel: 58,
      kiLevel: 46.4,
      koLevel: 62.64,
      currentPrice: prod2CandlesCPALL[prod2CandlesCPALL.length - 1]?.close ?? 58,
      minClose: 48,
      knockedIn: false,
    },
  ],
}

export const MOCK_BACKTEST_BUNDLE = [
  { backtestProduct: product1, backtestResult: backtest1 },
  { backtestProduct: product2, backtestResult: backtest2 },
]

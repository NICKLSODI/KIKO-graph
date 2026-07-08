import { useState } from 'react'
import { CandleChart } from './components/CandleChart'
import { fetchCandles } from './api/twelveData'
import { fetchThaiCandles } from './api/settrade'
import { fetchThaiCandlesYahoo } from './api/yahoo'
import { fetchForeignCandlesFinnhub } from './api/finnhub'
import type { Candle, DateMark, Level, LevelKind, Market } from './types'
import { LEVEL_LABELS } from './types'

const FOREIGN_INTERVALS = ['1day', '1week', '1month', '1h', '4h']
const THAI_INTERVALS = ['1d', '1w', '1M', '15m', '30m', '60m']

type ThaiSource = 'settrade' | 'yahoo'
type ForeignSource = 'twelvedata' | 'finnhub'

export default function App() {
  const [market, setMarket] = useState<Market>('foreign')
  const [thaiSource, setThaiSource] = useState<ThaiSource>('settrade')
  const [foreignSource, setForeignSource] = useState<ForeignSource>('twelvedata')
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('twelveDataApiKey') ?? '')
  const [symbol, setSymbol] = useState('AAPL')
  const [interval, setInterval_] = useState('1day')
  const [candles, setCandles] = useState<Candle[]>([])
  const [levels, setLevels] = useState<Level[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newLevelKind, setNewLevelKind] = useState<LevelKind>('strike')
  const [newLevelPrice, setNewLevelPrice] = useState('')
  const [newLevelLabel, setNewLevelLabel] = useState('')

  const [dateMarks, setDateMarks] = useState<DateMark[]>([])
  const [newMarkDate, setNewMarkDate] = useState('')
  const [newMarkLabel, setNewMarkLabel] = useState('')

  function saveApiKey(value: string) {
    setApiKey(value)
    localStorage.setItem('twelveDataApiKey', value)
  }

  function switchMarket(next: Market) {
    setMarket(next)
    setInterval_(next === 'thai' ? '1d' : '1day')
    setSymbol(next === 'thai' ? 'PTT' : 'AAPL')
  }

  async function handleLoad() {
    setLoading(true)
    setError(null)
    try {
      const data =
        market === 'thai'
          ? await (thaiSource === 'settrade'
              ? fetchThaiCandles(symbol.trim(), interval)
              : fetchThaiCandlesYahoo(symbol.trim(), interval))
          : await (foreignSource === 'finnhub'
              ? fetchForeignCandlesFinnhub(symbol.trim(), interval)
              : (async () => {
                  if (!apiKey) throw new Error('กรอก Twelve Data API key ก่อน')
                  return fetchCandles(symbol.trim(), interval, apiKey)
                })())
      if (data.length === 0) throw new Error('ไม่พบข้อมูล ตรวจสอบชื่อ symbol อีกครั้ง')
      setCandles(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function addLevel() {
    const price = Number(newLevelPrice)
    if (!Number.isFinite(price)) return
    setLevels((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        kind: newLevelKind,
        price,
        label: newLevelLabel || `${LEVEL_LABELS[newLevelKind]} ${price}`,
      },
    ])
    setNewLevelPrice('')
    setNewLevelLabel('')
  }

  function removeLevel(id: string) {
    setLevels((prev) => prev.filter((l) => l.id !== id))
  }

  function addDateMark() {
    if (!newMarkDate) return
    const time = Math.floor(new Date(newMarkDate + 'T00:00:00Z').getTime() / 1000)
    setDateMarks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), time, label: newMarkLabel || newMarkDate },
    ])
    setNewMarkDate('')
    setNewMarkLabel('')
  }

  function removeDateMark(id: string) {
    setDateMarks((prev) => prev.filter((m) => m.id !== id))
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ fontSize: 20, fontWeight: 500 }}>KIKO Graph</h1>

      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={market} onChange={(e) => switchMarket(e.target.value as Market)}>
          <option value="foreign">หุ้นต่างประเทศ (Twelve Data)</option>
          <option value="thai">หุ้นไทย (Settrade)</option>
        </select>
        {market === 'foreign' && (
          <select value={foreignSource} onChange={(e) => setForeignSource(e.target.value as ForeignSource)}>
            <option value="twelvedata">Twelve Data</option>
            <option value="finnhub">Finnhub (rate limit สูงกว่า)</option>
          </select>
        )}
        {market === 'foreign' && foreignSource === 'twelvedata' && (
          <input
            type="password"
            placeholder="Twelve Data API key"
            value={apiKey}
            onChange={(e) => saveApiKey(e.target.value)}
            style={{ flex: '1 1 220px' }}
          />
        )}
        {market === 'thai' && (
          <select value={thaiSource} onChange={(e) => setThaiSource(e.target.value as ThaiSource)}>
            <option value="settrade">Settrade (ทางการ, พร้อมเฉพาะ พฤ-ศ 9-17น.)</option>
            <option value="yahoo">Yahoo Finance (สำรอง, ใช้ได้ทุกวัน)</option>
          </select>
        )}
        <input
          type="text"
          placeholder={market === 'thai' ? 'Symbol เช่น PTT, BBL' : 'Symbol เช่น AAPL, TSLA'}
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          style={{ width: 180 }}
        />
        <select value={interval} onChange={(e) => setInterval_(e.target.value)}>
          {(market === 'thai' ? THAI_INTERVALS : FOREIGN_INTERVALS).map((iv) => (
            <option key={iv} value={iv}>
              {iv}
            </option>
          ))}
        </select>
        <button onClick={handleLoad} disabled={loading}>
          {loading ? 'กำลังโหลด...' : 'โหลดกราฟ'}
        </button>
      </section>

      {error && <p style={{ color: '#e24b4a' }}>{error}</p>}

      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <select value={newLevelKind} onChange={(e) => setNewLevelKind(e.target.value as LevelKind)}>
          <option value="strike">Strike</option>
          <option value="knock-in">Knock-In</option>
          <option value="knock-out">Knock-Out</option>
        </select>
        <input
          type="number"
          placeholder="ราคา"
          value={newLevelPrice}
          onChange={(e) => setNewLevelPrice(e.target.value)}
          style={{ width: 120 }}
        />
        <input
          type="text"
          placeholder="ป้ายกำกับ (ไม่บังคับ)"
          value={newLevelLabel}
          onChange={(e) => setNewLevelLabel(e.target.value)}
          style={{ width: 180 }}
        />
        <button onClick={addLevel}>+ เพิ่มเส้น</button>
      </section>

      {levels.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {levels.map((level) => (
            <li
              key={level.id}
              style={{
                border: '1px solid #444',
                borderRadius: 6,
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {level.label}
              <button onClick={() => removeLevel(level.id)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input
          type="date"
          value={newMarkDate}
          onChange={(e) => setNewMarkDate(e.target.value)}
        />
        <input
          type="text"
          placeholder="ป้ายกำกับ เช่น วันครบกำหนด (ไม่บังคับ)"
          value={newMarkLabel}
          onChange={(e) => setNewMarkLabel(e.target.value)}
          style={{ width: 220 }}
        />
        <button onClick={addDateMark}>+ เพิ่มเส้นวันที่</button>
      </section>

      {dateMarks.length > 0 && (
        <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {dateMarks.map((mark) => (
            <li
              key={mark.id}
              style={{
                border: '1px solid #444',
                borderRadius: 6,
                padding: '4px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {mark.label}
              <button onClick={() => removeDateMark(mark.id)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <CandleChart candles={candles} levels={levels} dateMarks={dateMarks} />
    </div>
  )
}

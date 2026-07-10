import { useEffect, useState } from 'react'
import { C } from '../theme'
import { Screen, Card, StepDots, NavBtn } from '../ui/components'
import { FLOW_LABELS } from './InputScreen'
import { CandleChart } from '../components/CandleChart'
import { fetchForeignCandles } from '../api/twelveData'
import { fetchThaiCandlesYahoo } from '../api/yahoo'
import type { Candle, DateMark, Level, LevelKind, Market } from '../types'
import { LEVEL_LABELS } from '../types'
import type { RetrievedProductData } from '../features/ingest/ingest'
import type { AppState, Patch } from '../store'

const FOREIGN_INTERVALS = ['1day', '1week', '1month', '1h', '4h']
const THAI_INTERVALS = ['1d', '1w', '1M', '15m', '30m', '60m']

function dateToTime(d: string): number | null {
  const t = new Date(d + 'T00:00:00Z').getTime()
  return Number.isFinite(t) ? Math.floor(t / 1000) : null
}

// Seed chart lines/marks from the retrieved product data.
function levelsFromData(data: RetrievedProductData | null): Level[] {
  if (!data) return []
  const out: Level[] = []
  const add = (kind: LevelKind, price: number | null) => {
    if (price != null) out.push({ id: crypto.randomUUID(), kind, price, label: `${LEVEL_LABELS[kind]} ${price}` })
  }
  add('strike', data.strike)
  add('knock-in', data.knockIn)
  add('knock-out', data.knockOut)
  return out
}

function marksFromData(data: RetrievedProductData | null): DateMark[] {
  if (!data) return []
  const out: DateMark[] = []
  for (const d of data.observationDates) {
    const time = dateToTime(d)
    if (time != null) out.push({ id: crypto.randomUUID(), time, label: `สังเกตการณ์ ${d}` })
  }
  if (data.maturityDate) {
    const time = dateToTime(data.maturityDate)
    if (time != null) out.push({ id: crypto.randomUUID(), time, label: `ครบกำหนด ${data.maturityDate}` })
  }
  return out
}

export function GraphScreen({ state, patch }: { state: AppState; patch: Patch }) {
  // Auto-guess the reference symbol + market from the extracted data.
  const guessedMarket: Market = state.retrieved?.market ?? 'foreign'
  const guessedSymbol = state.retrieved?.underlyingSymbol ?? (guessedMarket === 'thai' ? 'PTT' : 'AAPL')
  const autoFilled = !!state.retrieved?.underlyingSymbol

  const [market, setMarket] = useState<Market>(guessedMarket)
  const [symbol, setSymbol] = useState(guessedSymbol)
  const [interval, setInterval_] = useState(guessedMarket === 'thai' ? '1d' : '1day')
  const [candles, setCandles] = useState<Candle[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [levels, setLevels] = useState<Level[]>(() => levelsFromData(state.retrieved))
  const [dateMarks, setDateMarks] = useState<DateMark[]>(() => marksFromData(state.retrieved))

  const [newLevelKind, setNewLevelKind] = useState<LevelKind>('strike')
  const [newLevelPrice, setNewLevelPrice] = useState('')
  const [newMarkDate, setNewMarkDate] = useState('')
  const [newMarkLabel, setNewMarkLabel] = useState('')

  // Re-seed lines/symbol if the retrieved data changes (e.g. a new document).
  useEffect(() => {
    setLevels(levelsFromData(state.retrieved))
    setDateMarks(marksFromData(state.retrieved))
    if (state.retrieved) {
      const m = state.retrieved.market ?? 'foreign'
      setMarket(m)
      setInterval_(m === 'thai' ? '1d' : '1day')
      if (state.retrieved.underlyingSymbol) setSymbol(state.retrieved.underlyingSymbol)
    }
  }, [state.retrieved])

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
          ? await fetchThaiCandlesYahoo(symbol.trim(), interval)
          : await fetchForeignCandles(symbol.trim(), interval)
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
    if (!Number.isFinite(price) || !newLevelPrice) return
    setLevels((prev) => [...prev, { id: crypto.randomUUID(), kind: newLevelKind, price, label: `${LEVEL_LABELS[newLevelKind]} ${price}` }])
    setNewLevelPrice('')
  }

  function addDateMark() {
    if (!newMarkDate) return
    const time = dateToTime(newMarkDate)
    if (time == null) return
    setDateMarks((prev) => [...prev, { id: crypto.randomUUID(), time, label: newMarkLabel || newMarkDate }])
    setNewMarkDate('')
    setNewMarkLabel('')
  }

  const ctrl = { padding: '8px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, background: C.white }

  return (
    <Screen maxWidth={1000}>
      <StepDots step={4} labels={FLOW_LABELS} />
      <Card>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>Graph — กราฟแท่งเทียนพร้อมเส้นผลิตภัณฑ์</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 16 }}>
          เส้น Strike / Knock-In / Knock-Out และวันสังเกตการณ์ถูกวาดอัตโนมัติจากข้อมูลที่ดึงได้ — โหลดกราฟหุ้นอ้างอิงเพื่อดูภาพรวม
        </div>

        {autoFilled && (
          <div style={{ fontSize: 12.5, color: C.teal, background: C.tealLight, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            🔍 เดาหุ้นอ้างอิงจากเอกสารให้: <b>{guessedSymbol}</b> ({guessedMarket === 'thai' ? 'หุ้นไทย' : 'หุ้นต่างประเทศ'}) — แก้ไขได้ถ้าไม่ถูกต้อง
          </div>
        )}

        <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
          <select value={market} onChange={(e) => switchMarket(e.target.value as Market)} style={ctrl}>
            <option value="foreign">หุ้นต่างประเทศ (Twelve Data)</option>
            <option value="thai">หุ้นไทย (Yahoo Finance)</option>
          </select>
          <input type="text" placeholder={market === 'thai' ? 'เช่น PTT, BBL' : 'เช่น AAPL, TSLA'} value={symbol} onChange={(e) => setSymbol(e.target.value)} style={{ ...ctrl, width: 150 }} />
          <select value={interval} onChange={(e) => setInterval_(e.target.value)} style={ctrl}>
            {(market === 'thai' ? THAI_INTERVALS : FOREIGN_INTERVALS).map((iv) => (
              <option key={iv} value={iv}>{iv}</option>
            ))}
          </select>
          <NavBtn onClick={handleLoad} disabled={loading}>{loading ? 'กำลังโหลด...' : 'โหลดกราฟ'}</NavBtn>
        </section>

        {error && <p style={{ color: C.coral, fontSize: 13 }}>{error}</p>}

        {/* Manual add level / mark */}
        <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <select value={newLevelKind} onChange={(e) => setNewLevelKind(e.target.value as LevelKind)} style={ctrl}>
            <option value="strike">Strike</option>
            <option value="knock-in">Knock-In</option>
            <option value="knock-out">Knock-Out</option>
          </select>
          <input type="number" placeholder="ราคา" value={newLevelPrice} onChange={(e) => setNewLevelPrice(e.target.value)} style={{ ...ctrl, width: 100 }} />
          <button onClick={addLevel} style={{ ...ctrl, cursor: 'pointer' }}>+ เพิ่มเส้นราคา</button>
          <input type="date" value={newMarkDate} onChange={(e) => setNewMarkDate(e.target.value)} style={ctrl} />
          <input type="text" placeholder="ป้ายกำกับวันที่" value={newMarkLabel} onChange={(e) => setNewMarkLabel(e.target.value)} style={{ ...ctrl, width: 150 }} />
          <button onClick={addDateMark} style={{ ...ctrl, cursor: 'pointer' }}>+ เพิ่มเส้นวันที่</button>
        </section>

        {(levels.length > 0 || dateMarks.length > 0) && (
          <ul style={{ listStyle: 'none', padding: 0, marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {levels.map((level) => (
              <li key={level.id} style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                {level.label}
                <button onClick={() => setLevels((p) => p.filter((l) => l.id !== level.id))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.muted }}>×</button>
              </li>
            ))}
            {dateMarks.map((mark) => (
              <li key={mark.id} style={{ border: `1px solid ${C.amberBorder}`, background: C.amberLight, borderRadius: 6, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: C.amber }}>
                {mark.label}
                <button onClick={() => setDateMarks((p) => p.filter((m) => m.id !== mark.id))} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.amber }}>×</button>
              </li>
            ))}
          </ul>
        )}

        <CandleChart candles={candles} levels={levels} dateMarks={dateMarks} />

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <NavBtn onClick={() => patch({ screen: 'retrieve' })} secondary>กลับสู่ขั้นตอนก่อนหน้า</NavBtn>
          <NavBtn onClick={() => patch({ screen: 'chooseOutput' })} secondary>เลือกผลลัพธ์อื่น</NavBtn>
        </div>
      </Card>
    </Screen>
  )
}

import { useMemo, useState } from 'react'
import { C } from '../../theme'
import { Screen, Card, NavBtn } from '../../ui/components'
import { CandleChart } from '../../components/CandleChart'
import type { GenerateFile } from '../../api/generate'
import { extractNote } from '../../features/backtest/extract'
import { backtest } from '../../features/backtest/engine'
import { scoreProducts, weightsFor, PROFILE_LABELS, DEFAULT_CUSTOM_WEIGHTS } from '../../features/backtest/scoring'
import type { BacktestResult, NoteProduct, ProfileKey, ScoredProduct, ScoreWeights } from '../../features/backtest/types'
import type { DateMark, Level } from '../../types'
import type { Patch } from '../../store'

type Phase = 'upload' | 'running' | 'dashboard'
type Tab = 'summary' | 'details' | 'graph' | 'download'
type SortKey = 'rank' | 'coupon' | 'buffer' | 'tenor'

interface Item {
  product: NoteProduct
  backtest: BacktestResult
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'สรุปผลิตภัณฑ์' },
  { key: 'details', label: 'รายละเอียด' },
  { key: 'graph', label: 'กราฟ' },
  { key: 'download', label: 'ดาวน์โหลด' },
]
const MEDALS = ['🥇', '🥈', '🥉']

function readFiles(fileList: FileList): Promise<GenerateFile[]> {
  return Promise.all(
    Array.from(fileList).map(
      (f) =>
        new Promise<GenerateFile>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve({ name: f.name, mediaType: f.type || 'application/pdf', base64: (reader.result as string).split(',')[1] ?? '' })
          reader.onerror = reject
          reader.readAsDataURL(f)
        }),
    ),
  )
}

function fmtPct(v: number | null, suffix = '%'): string {
  return v == null ? '-' : `${v}${suffix}`
}
function kiko(p: NoteProduct): string {
  const ki = p.kiPct == null ? '–' : p.kiPct
  const ko = p.koPct == null ? '–' : p.koPct
  return `${ki} / ${ko}`
}

export function BacktestDashboard({ patch }: { patch: Patch }) {
  const [phase, setPhase] = useState<Phase>('upload')
  const [files, setFiles] = useState<GenerateFile[]>([])
  const [progress, setProgress] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [items, setItems] = useState<Item[]>([])

  const [tab, setTab] = useState<Tab>('summary')
  const [profile, setProfile] = useState<ProfileKey>('balanced')
  const [custom, setCustom] = useState<ScoreWeights>(DEFAULT_CUSTOM_WEIGHTS)
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const scored = useMemo(() => scoreProducts(items, weightsFor(profile, custom)), [items, profile, custom])
  const selected = scored.find((s) => s.product.id === selectedId) ?? null

  async function run() {
    setPhase('running')
    setErrors([])
    const errs: string[] = []
    const products: NoteProduct[] = []
    for (let i = 0; i < files.length; i++) {
      setProgress(`สกัดข้อมูล ${i + 1}/${files.length}: ${files[i].name}`)
      try {
        products.push(await extractNote(files[i], crypto.randomUUID()))
      } catch (err) {
        errs.push(err instanceof Error ? err.message : String(err))
      }
    }
    const next: Item[] = []
    for (let i = 0; i < products.length; i++) {
      setProgress(`Backtest ${i + 1}/${products.length}: ${products[i].productCode ?? products[i].sourceFile}`)
      next.push({ product: products[i], backtest: await backtest(products[i]) })
    }
    setItems(next)
    setErrors(errs)
    setPhase('dashboard')
    setTab('summary')
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir(key === 'rank' ? 'asc' : 'desc')
    }
  }

  function sortRows(group: ScoredProduct[]): ScoredProduct[] {
    const val = (s: ScoredProduct): number => {
      switch (sortKey) {
        case 'rank': return s.rank
        case 'coupon': return s.product.couponPa ?? -Infinity
        case 'buffer': return s.backtest.bufferPct ?? -Infinity
        case 'tenor': return s.product.tenorMonths ?? Infinity
      }
    }
    return [...group].sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a)))
  }

  // ── Upload screen ──
  if (phase !== 'dashboard') {
    return (
      <Screen maxWidth={640}>
        <Card>
          <div style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 4 }}>Backtest &amp; Rank — ตราสารโครงสร้าง</div>
          <div style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
            อัปโหลด Term Sheet หลายไฟล์พร้อมกัน — ระบบจะสกัดข้อมูล → แบ็คเทสต์ราคาย้อนหลัง (worst-of) → ให้คะแนน → จัดอันดับ ให้อัตโนมัติ
          </div>

          {phase === 'upload' && (
            <>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, border: `1.5px dashed ${C.border}`, borderRadius: 10, cursor: 'pointer', color: C.muted, fontSize: 14 }}>
                📁 เลือกไฟล์ Term Sheet (PDF ได้หลายไฟล์)
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp"
                  multiple
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    if (e.target.files?.length) setFiles(await readFiles(e.target.files))
                  }}
                />
              </label>
              {files.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '12px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {files.map((f, i) => (
                    <li key={i} style={{ fontSize: 13, color: C.teal, background: C.tealLight, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: '8px 12px' }}>📄 {f.name}</li>
                  ))}
                </ul>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                <NavBtn onClick={() => patch({ screen: 'landing' })} secondary>กลับ</NavBtn>
                <NavBtn onClick={run} disabled={files.length === 0}>
                  {files.length ? `เริ่มวิเคราะห์ ${files.length} ไฟล์ →` : 'เลือกไฟล์ก่อน'}
                </NavBtn>
              </div>
            </>
          )}

          {phase === 'running' && (
            <div style={{ padding: '20px 0', textAlign: 'center' }}>
              <div className="spin" style={{ fontSize: 24 }}>⏳</div>
              <div style={{ fontSize: 13.5, color: C.text, marginTop: 10 }}>{progress}</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>ใช้ Claude Code สกัดข้อมูลจากแต่ละไฟล์ (อาจใช้เวลาสักครู่ต่อไฟล์)</div>
            </div>
          )}
        </Card>
      </Screen>
    )
  }

  // ── Dashboard ──
  const passGroup = sortRows(scored.filter((s) => s.backtest.verdict === 'pass'))
  const knockedGroup = sortRows(scored.filter((s) => s.backtest.verdict === 'knocked'))

  const th = { padding: '10px 12px', fontSize: 12, fontWeight: 600, color: C.muted, textAlign: 'left' as const, whiteSpace: 'nowrap' as const }
  const td = { padding: '10px 12px', fontSize: 13, color: C.text, borderTop: `1px solid ${C.border}` }
  const sortableTh = (label: string, key: SortKey) => (
    <th style={{ ...th, cursor: 'pointer' }} onClick={() => toggleSort(key)}>
      {label} {sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  )

  function renderTable(group: ScoredProduct[], accent: string) {
    if (group.length === 0) return <div style={{ fontSize: 13, color: C.muted, padding: '8px 12px' }}>— ไม่มีรายการ —</div>
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {sortableTh('Rank', 'rank')}
              <th style={th}>Product</th>
              <th style={th}>Underlying</th>
              {sortableTh('Coupon', 'coupon')}
              <th style={th}>KI / KO</th>
              {sortableTh('Buffer', 'buffer')}
              {sortableTh('Tenor', 'tenor')}
              <th style={th}>Issuer</th>
              <th style={th}>Score</th>
              <th style={th}></th>
            </tr>
          </thead>
          <tbody>
            {group.map((s) => (
              <tr key={s.product.id}>
                <td style={{ ...td, fontSize: 16 }}>{s.rank <= 3 ? MEDALS[s.rank - 1] : s.rank}</td>
                <td style={{ ...td, fontWeight: 600 }}>{s.product.productCode ?? s.product.sourceFile}</td>
                <td style={td}>{s.product.underlyings.join(', ') || '-'}</td>
                <td style={{ ...td, color: accent, fontWeight: 600 }}>{fmtPct(s.product.couponPa)}</td>
                <td style={td}>{kiko(s.product)}</td>
                <td style={td}>{s.backtest.bufferPct == null ? '-' : `${Math.round(s.backtest.bufferPct)}%`}</td>
                <td style={td}>{s.product.tenor ?? '-'}</td>
                <td style={td}>{s.product.issuer ?? '-'}</td>
                <td style={{ ...td, fontWeight: 600 }}>{s.score}</td>
                <td style={td}>
                  <button
                    onClick={() => { setSelectedId(s.product.id); setTab('graph') }}
                    style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.teal, fontSize: 12.5, cursor: 'pointer' }}
                  >
                    View →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <Screen maxWidth={1100}>
      {/* Top tabs */}
      <div style={{ display: 'flex', gap: 20, justifyContent: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, opacity: active ? 1 : 0.5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: active ? C.teal : C.muted, display: 'inline-block' }} />
              <span style={{ fontSize: 13.5, fontWeight: active ? 600 : 400, color: active ? C.navy : C.muted }}>{t.label}</span>
            </button>
          )
        })}
      </div>

      <Card>
        {tab === 'summary' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 4 }}>KIKO PRODUCT SUMMARY</div>
            <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 16 }}>วิเคราะห์ {items.length} ผลิตภัณฑ์ • แบ็คเทสต์ย้อนหลัง 1 ปี (worst-of ราคาปิดจริง)</div>

            {/* Profile selector */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
              {(['aggressive', 'balanced', 'save', 'custom'] as ProfileKey[]).map((p) => {
                const sel = profile === p
                return (
                  <button key={p} onClick={() => setProfile(p)} style={{ padding: '7px 13px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', border: `1px solid ${sel ? C.teal : C.border}`, background: sel ? C.tealLight : C.white, color: sel ? C.teal : C.text, fontWeight: sel ? 600 : 400 }}>
                    {PROFILE_LABELS[p]}
                  </button>
                )
              })}
            </div>
            {profile === 'custom' && (
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12, fontSize: 12.5, color: C.muted, alignItems: 'center' }}>
                {(['coupon', 'buffer', 'tenor'] as const).map((k) => (
                  <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {k}
                    <input type="number" value={custom[k]} min={0} step={0.1} onChange={(e) => setCustom((w) => ({ ...w, [k]: Number(e.target.value) }))} style={{ width: 60, padding: '4px 6px', borderRadius: 6, border: `1px solid ${C.border}` }} />
                  </label>
                ))}
              </div>
            )}

            {errors.length > 0 && (
              <div style={{ fontSize: 12.5, color: C.amber, background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
                {errors.length} ไฟล์สกัดไม่สำเร็จ: {errors.join(' | ')}
              </div>
            )}

            <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 600, color: C.teal }}>✓ Historical Pass (ไม่เคยชน KI/KO) — {passGroup.length} รายการ</div>
            {renderTable(passGroup, C.teal)}

            <div style={{ margin: '20px 0 8px', fontSize: 14, fontWeight: 600, color: C.coral }}>⚠ Historical Knocked (เคยชน KI/KO) — {knockedGroup.length} รายการ</div>
            {renderTable(knockedGroup, C.coral)}

            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 16, lineHeight: 1.6 }}>
              Historical Pass = ราคาย้อนหลัง 1 ปี ไม่เคยแตะ KI/KO | Historical Knocked = เคยแตะ KI หรือ KO อย่างน้อย 1 ครั้ง | Buffer = ระยะห่าง % ของหุ้นที่อ่อนสุดจากระดับ KI ในปัจจุบัน
            </div>
          </>
        )}

        {tab === 'details' && <DetailsView selected={selected} />}
        {tab === 'graph' && <GraphView selected={selected} />}
        {tab === 'download' && (
          <div style={{ fontSize: 13, color: C.amber, background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 8, padding: '12px 14px' }}>
            🚧 การ Export Excel / PDF อยู่ระหว่างพัฒนา (Phase 2)
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <NavBtn onClick={() => { setPhase('upload'); setItems([]); setFiles([]); setSelectedId(null) }} secondary>วิเคราะห์ชุดใหม่</NavBtn>
          <NavBtn onClick={() => patch({ screen: 'landing' })} secondary>กลับหน้าแรก</NavBtn>
        </div>
      </Card>
    </Screen>
  )
}

function DetailsView({ selected }: { selected: ScoredProduct | null }) {
  if (!selected) return <div style={{ fontSize: 13, color: C.muted }}>เลือกผลิตภัณฑ์จากตารางสรุป (ปุ่ม View) ก่อน</div>
  const p = selected.product
  const bt = selected.backtest
  const row = (label: string, value: string) => (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
      <div style={{ width: 200, color: C.muted, flexShrink: 0 }}>{label}</div>
      <div style={{ color: C.text }}>{value}</div>
    </div>
  )
  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>{p.productCode ?? p.sourceFile}</div>
      {row('Issuer', p.issuer ?? '-')}
      {row('ประเภทโครงสร้าง', p.structureType)}
      {row('หุ้นอ้างอิง', p.underlyings.join(', ') || '-')}
      {row('ตลาด', p.market === 'thai' ? 'ไทย' : 'ต่างประเทศ')}
      {row('Strike', fmtPct(p.strikePct))}
      {row('Knock-In / Knock-Out', kiko(p))}
      {row('Coupon (p.a.)', fmtPct(p.couponPa))}
      {row('Tenor', p.tenor ?? '-')}
      {row('Fixing date', p.fixingDate ?? '-')}
      {row('KO Observation dates', (p.koObservationDates.length ? p.koObservationDates : p.observationDates).join(', ') || '-')}
      {row('ผล Backtest', bt.error ? `ผิดพลาด: ${bt.error}` : bt.verdict === 'pass' ? 'Historical Pass (ไม่เคยชน)' : `Historical Knocked${bt.knockedIn ? ' • KI' : ''}${bt.knockedOut ? ' • KO' : ''}`)}
      {row('Buffer จาก KI (ปัจจุบัน)', bt.bufferPct == null ? '-' : `${Math.round(bt.bufferPct)}%`)}
      {row('คะแนน', String(selected.score))}
      <div style={{ marginTop: 12, fontSize: 13, color: C.text }}><b>สรุป:</b> {p.summary || '-'}</div>
    </div>
  )
}

function GraphView({ selected }: { selected: ScoredProduct | null }) {
  if (!selected) return <div style={{ fontSize: 13, color: C.muted }}>เลือกผลิตภัณฑ์จากตารางสรุป (ปุ่ม View) ก่อน</div>
  const p = selected.product
  const bt = selected.backtest
  if (bt.error) return <div style={{ fontSize: 13, color: C.amber }}>โหลดกราฟไม่ได้: {bt.error}</div>

  const koTimes: DateMark[] = (p.koObservationDates.length ? p.koObservationDates : p.observationDates)
    .map((d): DateMark | null => {
      const t = Math.floor(new Date(d + 'T00:00:00Z').getTime() / 1000)
      const id: string = crypto.randomUUID()
      return Number.isFinite(t) ? { id, time: t, label: `KO obs ${d}` } : null
    })
    .filter((m): m is DateMark => m !== null)

  return (
    <div>
      <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 4 }}>{p.productCode ?? p.sourceFile}</div>
      <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 16 }}>ราคาย้อนหลังของหุ้นอ้างอิงแต่ละตัว พร้อมเส้น Strike / Knock-In / Knock-Out และวัน KO observation</div>
      {bt.series.map((s) => {
        const levels: Level[] = []
        if (s.strikeLevel != null) levels.push({ id: `st-${s.symbol}`, kind: 'strike', price: s.strikeLevel, label: `Strike ${s.strikeLevel.toFixed(2)}` })
        if (s.kiLevel != null) levels.push({ id: `ki-${s.symbol}`, kind: 'knock-in', price: s.kiLevel, label: `KI ${s.kiLevel.toFixed(2)}` })
        if (s.koLevel != null) levels.push({ id: `ko-${s.symbol}`, kind: 'knock-out', price: s.koLevel, label: `KO ${s.koLevel.toFixed(2)}` })
        return (
          <div key={s.symbol} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 6 }}>
              {s.symbol}
              <span style={{ fontSize: 12, fontWeight: 400, color: C.muted, marginLeft: 8 }}>
                initial {s.initialPrice?.toFixed(2) ?? '-'} • ปัจจุบัน {s.currentPrice?.toFixed(2) ?? '-'} {s.knockedIn ? '• ⚠ เคยชน KI' : ''}
              </span>
            </div>
            <CandleChart candles={s.candles} levels={levels} dateMarks={koTimes} />
          </div>
        )
      })}
    </div>
  )
}

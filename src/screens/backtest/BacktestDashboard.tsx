import { useMemo, useState } from 'react'
import { C } from '../../theme'
import { Screen, Card, NavBtn } from '../../ui/components'
import { CandleChart } from '../../components/CandleChart'
import type { GenerateFile } from '../../api/generate'
import { extractNote, type NoteSource } from '../../features/backtest/extract'
import { koTimesFor, levelsAndMarksFor } from '../../features/backtest/chartData'
import type { InputMode } from '../../types'
import { backtest } from '../../features/backtest/engine'
import { scoreProducts, weightsFor, PROFILE_LABELS, DEFAULT_CUSTOM_WEIGHTS } from '../../features/backtest/scoring'
import { exportCsv, printReport } from '../../features/backtest/exportReport'
import type { BacktestResult, NoteProduct, ProfileKey, ScoredProduct, ScoreWeights } from '../../features/backtest/types'
import type { Patch } from '../../store'
import { MOCK_BACKTEST_BUNDLE } from '../../dev/mockData'

type Phase = 'upload' | 'running' | 'dashboard'
type Tab = 'summary' | 'detail' | 'download'
type SortKey = 'rank' | 'coupon' | 'buffer' | 'vol' | 'tenor'

interface Item {
  product: NoteProduct
  backtest: BacktestResult
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'summary', label: 'สรุปผลิตภัณฑ์' },
  { key: 'detail', label: 'รายละเอียด & กราฟ' },
  { key: 'download', label: 'ดาวน์โหลด' },
]
const MEDALS = ['🥇', '🥈', '🥉']
const WINDOW_OPTIONS = [
  { months: 6, label: '6 เดือน' },
  { months: 12, label: '1 ปี' },
  { months: 24, label: '2 ปี' },
]

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

const fmtPct = (v: number | null, s = '%') => (v == null ? '-' : `${v}${s}`)
const kiko = (p: NoteProduct) => `${p.kiPct ?? '–'} / ${p.koPct ?? '–'}`

// Decode the stored base64 into a Blob URL so the browser can render the original
// PDF/image inline (no re-upload, no server round-trip).
function blobUrlFor(file: GenerateFile): string {
  const bytes = atob(file.base64)
  const arr = new Uint8Array(bytes.length)
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
  return URL.createObjectURL(new Blob([arr], { type: file.mediaType }))
}

type DataSource = 'upload' | 'mock'

export function BacktestDashboard({ patch }: { patch: Patch }) {
  const [phase, setPhase] = useState<Phase>('upload')
  const [dataSource, setDataSource] = useState<DataSource>('upload')
  const [sources, setSources] = useState<NoteSource[]>([])
  const [addMode, setAddMode] = useState<InputMode>('file')
  const [linkDraft, setLinkDraft] = useState('')
  const [textDraft, setTextDraft] = useState('')
  const [progress, setProgress] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [products, setProducts] = useState<NoteProduct[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [recomputing, setRecomputing] = useState(false)
  const [windowMonths, setWindowMonths] = useState(12)
  const [fileById, setFileById] = useState<Record<string, GenerateFile>>({})
  const [preview, setPreview] = useState<{ name: string; url: string; mediaType: string } | null>(null)
  const [printing, setPrinting] = useState(false)

  const [tab, setTab] = useState<Tab>('summary')
  const [profile, setProfile] = useState<ProfileKey>('balanced')
  const [custom, setCustom] = useState<ScoreWeights>(DEFAULT_CUSTOM_WEIGHTS)
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const scored = useMemo(() => scoreProducts(items, weightsFor(profile, custom)), [items, profile, custom])
  const selected = scored.find((s) => s.product.id === selectedId) ?? null

  async function recompute(prods: NoteProduct[], wm: number) {
    setRecomputing(true)
    const next: Item[] = []
    for (let i = 0; i < prods.length; i++) {
      setProgress(`Backtest ${i + 1}/${prods.length}`)
      next.push({ product: prods[i], backtest: await backtest(prods[i], wm) })
    }
    setItems(next)
    setRecomputing(false)
  }

  async function run() {
    setPhase('running')
    setErrors([])
    const errs: string[] = []
    const prods: NoteProduct[] = []
    const nextFileById: Record<string, GenerateFile> = {}
    for (let i = 0; i < sources.length; i++) {
      const source = sources[i]
      setProgress(`สกัดข้อมูล ${i + 1}/${sources.length}: ${source.label}`)
      const id = crypto.randomUUID()
      try {
        prods.push(await extractNote(source, id))
        if (source.kind === 'file') nextFileById[id] = source.file
      } catch (err) {
        errs.push(err instanceof Error ? err.message : String(err))
      }
    }
    setProducts(prods)
    setFileById(nextFileById)
    setErrors(errs)
    await recompute(prods, windowMonths)
    setPhase('dashboard')
    setTab('summary')
  }

  function addFileSources(fileList: FileList) {
    readFiles(fileList).then((files) => {
      setSources((prev) => [...prev, ...files.map((file): NoteSource => ({ kind: 'file', file, label: file.name }))])
    })
  }

  function addLinkSource() {
    const link = linkDraft.trim()
    if (!link) return
    setSources((prev) => [...prev, { kind: 'link', link, label: link }])
    setLinkDraft('')
  }

  function addTextSource() {
    const text = textDraft.trim()
    if (!text) return
    const n = sources.filter((s) => s.kind === 'text').length + 1
    setSources((prev) => [...prev, { kind: 'text', text, label: `ข้อความ #${n}` }])
    setTextDraft('')
  }

  function removeSource(i: number) {
    setSources((prev) => prev.filter((_, idx) => idx !== i))
  }

  const SOURCE_ICON: Record<NoteSource['kind'], string> = { file: '📄', link: '🔗', text: '📝' }

  function openPreview(id: string) {
    const file = fileById[id]
    if (!file) return
    setPreview({ name: file.name, url: blobUrlFor(file), mediaType: file.mediaType })
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  async function handlePrint() {
    setPrinting(true)
    try {
      await printReport(scored, windowMonths)
    } finally {
      setPrinting(false)
    }
  }

  function loadMockData() {
    setErrors([])
    setProgress('mock data loaded')
    const loaded = MOCK_BACKTEST_BUNDLE.map((preset: { backtestProduct: NoteProduct; backtestResult: BacktestResult }) => ({ product: preset.backtestProduct, backtest: preset.backtestResult }))
    setProducts(loaded.map((item: Item) => item.product))
    setItems(loaded)
    setSelectedId(loaded[0]?.product.id ?? null)
    setPhase('dashboard')
    setTab('summary')
  }


  function changeWindow(wm: number) {
    setWindowMonths(wm)
    recompute(products, wm)
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
        case 'vol': return s.backtest.volatilityPct ?? Infinity
        case 'tenor': return s.product.tenorMonths ?? Infinity
      }
    }
    return [...group].sort((a, b) => (sortDir === 'asc' ? val(a) - val(b) : val(b) - val(a)))
  }

  // ── Upload / running ──
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
              <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: C.text }}>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" checked={dataSource === 'upload'} onChange={() => setDataSource('upload')} />
                  อัปโหลดไฟล์จริง
                </label>
                <label style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <input type="radio" checked={dataSource === 'mock'} onChange={() => setDataSource('mock')} />
                  ใช้ mock ตัวอย่าง
                </label>
              </div>

              {dataSource === 'upload' ? (
                <>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>
                    เพิ่มผลิตภัณฑ์ทีละรายการได้ 3 รูปแบบผสมกัน — ลิงก์อ้างอิง, ไฟล์เอกสารดิจิทัล (PDF/รูปภาพ), หรือข้อความสรุปโดยย่อ
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {([
                      { key: 'link', label: 'ลิงก์อ้างอิง (Web Link)' },
                      { key: 'file', label: 'ไฟล์เอกสารดิจิทัล (PDF/รูปภาพ)' },
                      { key: 'text', label: 'ข้อมูลสรุปโดยย่อ' },
                    ] as { key: InputMode; label: string }[]).map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setAddMode(t.key)}
                        style={{
                          padding: '8px 14px', borderRadius: 8, border: `1px solid ${addMode === t.key ? C.teal : C.border}`,
                          background: addMode === t.key ? C.tealLight : C.white, color: addMode === t.key ? C.teal : C.muted,
                          fontSize: 13.5, fontWeight: addMode === t.key ? 600 : 400, cursor: 'pointer',
                        }}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {addMode === 'file' && (
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 20, border: `1.5px dashed ${C.border}`, borderRadius: 10, cursor: 'pointer', color: C.muted, fontSize: 14 }}>
                      📁 เลือกไฟล์ Term Sheet (PDF ได้หลายไฟล์)
                      <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.length) addFileSources(e.target.files) }} />
                    </label>
                  )}
                  {addMode === 'link' && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input
                        value={linkDraft}
                        onChange={(e) => setLinkDraft(e.target.value)}
                        placeholder="https://..."
                        style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box' }}
                      />
                      <button onClick={addLinkSource} disabled={!linkDraft.trim()} style={{ padding: '0 16px', borderRadius: 10, border: `1px solid ${C.teal}`, background: C.tealLight, color: C.teal, fontSize: 13.5, cursor: 'pointer' }}>+ เพิ่มลิงก์</button>
                    </div>
                  )}
                  {addMode === 'text' && (
                    <div>
                      <textarea
                        value={textDraft}
                        onChange={(e) => setTextDraft(e.target.value)}
                        placeholder="กรุณาระบุข้อมูลรายละเอียดผลิตภัณฑ์ ณ ที่นี่"
                        rows={5}
                        style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }}
                      />
                      <NavBtn onClick={addTextSource} disabled={!textDraft.trim()} secondary>+ เพิ่มข้อความ</NavBtn>
                    </div>
                  )}

                  {sources.length > 0 && (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sources.map((s, i) => (
                        <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, color: C.teal, background: C.tealLight, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: '8px 12px' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{SOURCE_ICON[s.kind]} {s.label}</span>
                          <button onClick={() => removeSource(i)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.muted, flexShrink: 0 }}>×</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                    <NavBtn onClick={() => patch({ screen: 'landing' })} secondary>กลับ</NavBtn>
                    <NavBtn onClick={run} disabled={sources.length === 0}>{sources.length ? `เริ่มวิเคราะห์ ${sources.length} รายการ →` : 'เพิ่มข้อมูลก่อน'}</NavBtn>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 12 }}>โหลดชุดตัวอย่าง (ไม่เรียกสกัดข้อมูลจริง) เพื่อดูหน้าตา dashboard</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <NavBtn onClick={() => patch({ screen: 'landing' })} secondary>กลับ</NavBtn>
                    <NavBtn onClick={loadMockData}>โหลด mock ชุดรวม →</NavBtn>
                  </div>
                </>
              )}
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
              {sortableTh('Vol', 'vol')}
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
                <td style={td}>
                  {s.product.underlyings.length === 0
                    ? '-'
                    : s.product.underlyings.map((sym, i) => {
                        const hitKi = s.backtest.series.find((ser) => ser.symbol === sym)?.knockedIn ?? false
                        return (
                          <span key={sym} style={{ color: hitKi ? C.coral : C.text, fontWeight: hitKi ? 600 : 400 }}>
                            {i > 0 ? ', ' : ''}
                            {sym}
                          </span>
                        )
                      })}
                </td>
                <td style={{ ...td, color: accent, fontWeight: 600 }}>{fmtPct(s.product.couponPa)}</td>
                <td style={td}>{kiko(s.product)}</td>
                <td style={td}>{s.backtest.bufferPct == null ? '-' : `${s.backtest.bufferPct}%`}</td>
                <td style={td}>{s.backtest.volatilityPct == null ? '-' : `${s.backtest.volatilityPct}%`}</td>
                <td style={td}>{s.product.tenor ?? '-'}</td>
                <td style={td}>{s.product.issuer ?? '-'}</td>
                <td style={{ ...td, fontWeight: 600 }}>{s.score}</td>
                <td style={{ ...td, display: 'flex', gap: 6 }}>
                  <button onClick={() => { setSelectedId(s.product.id); setTab('detail') }} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.teal, fontSize: 12.5, cursor: 'pointer' }}>View →</button>
                  {fileById[s.product.id] && (
                    <button onClick={() => openPreview(s.product.id)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 12.5, cursor: 'pointer' }}>📄 ต้นฉบับ</button>
                  )}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>KIKO PRODUCT SUMMARY</div>
                <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>วิเคราะห์ {items.length} ผลิตภัณฑ์ • แบ็คเทสต์ย้อนหลัง {windowMonths} เดือน (worst-of ราคาปิดจริง)</div>
              </div>
              <label style={{ fontSize: 12.5, color: C.muted, display: 'flex', alignItems: 'center', gap: 6 }}>
                ช่วง backtest:
                <select value={windowMonths} onChange={(e) => changeWindow(Number(e.target.value))} disabled={recomputing} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white }}>
                  {WINDOW_OPTIONS.map((o) => <option key={o.months} value={o.months}>{o.label}</option>)}
                </select>
                {recomputing && <span style={{ color: C.teal }}>กำลังคำนวณ...</span>}
              </label>
            </div>

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
                {(['coupon', 'buffer', 'tenor', 'volatility'] as const).map((k) => (
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
              Buffer = ระยะ % ของหุ้นอ่อนสุดจากระดับ KI ปัจจุบัน • Vol = ความผันผวนต่อปีของหุ้นที่ผันผวนสุด • เฉพาะวันสังเกตการณ์ KO ที่ผ่านมาแล้วเท่านั้นที่ถูกนำมาตัดสิน
            </div>
          </>
        )}

        {tab === 'detail' && <DetailGraphView selected={selected} hasFile={!!(selected && fileById[selected.product.id])} onPreview={() => selected && openPreview(selected.product.id)} />}

        {tab === 'download' && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.text, marginBottom: 12 }}>ดาวน์โหลด / Export</div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <NavBtn onClick={() => exportCsv(scored)}>⬇ ตารางสรุป (Excel/CSV)</NavBtn>
              <NavBtn onClick={handlePrint} disabled={printing} secondary>{printing ? '⏳ กำลังสร้างรายงาน...' : '🖨 พิมพ์ / บันทึกเป็น PDF (พร้อมกราฟ)'}</NavBtn>
            </div>
            <div style={{ fontSize: 12.5, color: C.muted, marginTop: 12 }}>CSV เปิดใน Excel ได้ (รองรับภาษาไทย) • ปุ่มพิมพ์เปิดรายงานเต็มรูปแบบพร้อมกราฟทุกหุ้นอ้างอิงในแท็บใหม่ แล้วสั่งพิมพ์/บันทึก PDF (อาจใช้เวลาสักครู่ถ้ามีหลายผลิตภัณฑ์)</div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <NavBtn onClick={() => { setPhase('upload'); setItems([]); setProducts([]); setSources([]); setFileById({}); setSelectedId(null) }} secondary>วิเคราะห์ชุดใหม่</NavBtn>
          <NavBtn onClick={() => patch({ screen: 'landing' })} secondary>กลับหน้าแรก</NavBtn>
        </div>
      </Card>

      {preview && (
        <div onClick={closePreview} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: 10, width: 'min(900px, 100%)', height: 'min(90vh, 1100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>📄 {preview.name}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={preview.url} download={preview.name} style={{ fontSize: 12.5, color: C.teal, textDecoration: 'none' }}>ดาวน์โหลด</a>
                <button onClick={closePreview} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: C.muted }}>×</button>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
              {preview.mediaType.startsWith('image/') ? (
                <img src={preview.url} alt={preview.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <iframe src={preview.url} title={preview.name} style={{ width: '100%', height: '100%', border: 'none' }} />
              )}
            </div>
          </div>
        </div>
      )}
    </Screen>
  )
}

function DetailGraphView({ selected, hasFile, onPreview }: { selected: ScoredProduct | null; hasFile: boolean; onPreview: () => void }) {
  if (!selected) return <div style={{ fontSize: 13, color: C.muted }}>เลือกผลิตภัณฑ์จากตารางสรุป (ปุ่ม View) ก่อน</div>
  const p = selected.product
  const bt = selected.backtest
  const row = (label: string, value: string) => (
    <div style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
      <div style={{ width: 200, color: C.muted, flexShrink: 0 }}>{label}</div>
      <div style={{ color: C.text }}>{value}</div>
    </div>
  )

  const koTimes = koTimesFor(p)

  return (
    <div>
      {/* Details */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{p.productCode ?? p.sourceFile}</div>
        {hasFile && (
          <button onClick={onPreview} style={{ padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 12, cursor: 'pointer' }}>📄 ดูไฟล์ต้นฉบับ</button>
        )}
      </div>
      {row('Issuer', p.issuer ?? '-')}
      {row('ประเภทโครงสร้าง', p.structureType)}
      {row('หุ้นอ้างอิง', p.underlyings.join(', ') || '-')}
      {row('ตลาด', p.market === 'thai' ? 'ไทย' : 'ต่างประเทศ')}
      {row('Strike', fmtPct(p.strikePct))}
      {row('Knock-In / Knock-Out', kiko(p))}
      {row('Coupon (p.a.)', fmtPct(p.couponPa))}
      {row('Tenor', p.tenor ?? '-')}
      {row('Fixing date', p.fixingDate ?? '-')}
      {row('KO Observation dates', (() => {
        const explicit = p.koObservationDates.length ? p.koObservationDates : p.observationDates
        if (explicit.length) return explicit.join(', ')
        if (p.koObservationFrequency === 'daily') return 'ทุกวันทำการ (Daily Observe — เอกสารไม่ได้ระบุ list วันที่)'
        if (p.koObservationFrequency) return `${p.koObservationFrequency === 'monthly' ? 'ทุกเดือน' : 'ทุกไตรมาส'} — คำนวณจากวันทำสัญญา (เอกสารไม่ได้ระบุ list วันที่)`
        return '-'
      })())}
      {row('ผล Backtest', bt.error ? `ผิดพลาด: ${bt.error}` : bt.verdict === 'pass' ? `Historical Pass (${bt.windowMonths} เดือน)` : `Historical Knocked${bt.knockedIn ? ' • KI' : ''}${bt.knockedOut ? ' • KO' : ''}`)}
      {row('Buffer จาก KI', bt.bufferPct == null ? '-' : `${bt.bufferPct}%`)}
      {row('Volatility (ต่อปี)', bt.volatilityPct == null ? '-' : `${bt.volatilityPct}%`)}
      {row('คะแนน', String(selected.score))}
      <div style={{ margin: '12px 0', fontSize: 13, color: C.text }}><b>สรุป:</b> {p.summary || '-'}</div>

      {/* Graphs */}
      {bt.error ? (
        <div style={{ fontSize: 13, color: C.amber }}>โหลดกราฟไม่ได้: {bt.error}</div>
      ) : (
        <>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: C.navy, margin: '10px 0' }}>
            กราฟราคาย้อนหลัง ({bt.windowMonths} เดือน) + เส้น Strike / KI / KO + วัน KO observation
          </div>
          <div style={{ fontSize: 11.5, color: C.muted, marginBottom: 10 }}>
            ใช้ราคาปิดจริงย้อนหลังทั้งช่วงเทียบกับระดับ Strike/KI/KO (คำนวณจากราคา ณ วันทำสัญญาจริง) เพื่อดูว่าหุ้นอ้างอิงเคยหลุดระดับหรือไม่ — เส้น "📌 วันทำสัญญา" คือจุดอ้างอิงราคาเริ่มต้น ไม่ใช่จุดตัดการนับ
          </div>
          {bt.series.map((s) => {
            const { levels, marks } = levelsAndMarksFor(s, koTimes)
            return (
              <div key={s.symbol} style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.navy, marginBottom: 6 }}>
                  {s.symbol}
                  <span style={{ fontSize: 12, fontWeight: 400, color: C.muted, marginLeft: 8 }}>
                    initial {s.initialPrice?.toFixed(2) ?? '-'} • ปัจจุบัน {s.currentPrice?.toFixed(2) ?? '-'} {s.knockedIn ? '• ⚠ เคยชน KI' : ''}
                  </span>
                </div>
                <CandleChart candles={s.candles} levels={levels} dateMarks={marks} />
              </div>
            )
          })}
        </>
      )}
    </div>
  )
}

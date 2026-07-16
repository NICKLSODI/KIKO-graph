import { Fragment, useEffect, useMemo, useState } from 'react'
import { C } from '../../theme'
import { Screen, Card, NavBtn, IconOptions } from '../../ui/components'
import { IconUpload, IconSearch, IconBarChart, IconTrophy, IconChevronRight, IconFileText, IconLink, IconAlignLeft, IconCheck } from '../../ui/icons'
import { CandleChart } from '../../components/CandleChart'
import type { GenerateFile } from '../../api/generate'
import { extractNote, extractNotesFromTextChunked, type NoteSource } from '../../features/backtest/extract'
import { koTimesFor, levelsAndMarksFor } from '../../features/backtest/chartData'
import type { InputMode } from '../../types'
import { backtestScore, backtestDetail } from '../../features/backtest/engine'
import { scoreProducts, weightsFor, PROFILE_LABELS, DEFAULT_CUSTOM_WEIGHTS } from '../../features/backtest/scoring'
import { exportCsv, printProductReport, downloadProductJpg } from '../../features/backtest/exportReport'
import type { BacktestResult, DetailProduct, NoteProduct, ProfileKey, ScoredProduct, ScoreWeights } from '../../features/backtest/types'
import { STRUCTURE_TYPE_LABELS } from '../../features/backtest/types'
import type { RetrievedProductData } from '../../features/ingest/ingest'
import type { Patch } from '../../store'

type Phase = 'upload' | 'running' | 'dashboard'
type SortKey = 'rank' | 'coupon' | 'buffer' | 'vol' | 'tenor'

interface Item {
  product: NoteProduct
  backtest: BacktestResult
}

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

// The landing hero's pipeline strip — mirrors what run() actually does.
const PIPELINE = [
  { icon: <IconUpload size={14} />, label: 'อัปโหลด' },
  { icon: <IconSearch size={14} />, label: 'สกัดข้อมูล' },
  { icon: <IconBarChart size={14} />, label: 'แบ็คเทสต์' },
  { icon: <IconTrophy size={14} />, label: 'จัดอันดับ' },
]

/** stage: -1 = none highlighted (idle upload), 0..3 = that pipeline step is live. */
function PipelineStrip({ stage }: { stage: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
      {PIPELINE.map((p, i) => {
        const active = i === stage
        const done = stage >= 0 && i < stage
        return (
          <Fragment key={p.label}>
            {i > 0 && <IconChevronRight size={12} style={{ color: C.muted, opacity: 0.6, flexShrink: 0 }} />}
            <span
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: 999, fontSize: 12,
                border: `1px solid ${active ? C.primaryBorder : done ? C.tealBorder : C.border}`,
                background: active ? C.primaryLight : done ? C.tealLight : C.white,
                color: active ? C.primary : done ? C.teal : C.muted,
                fontWeight: active ? 600 : 400,
              }}
            >
              {p.icon}{p.label}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}

// Map a batch product to the wizard's retrieved-data shape so the existing script screens
// (persona → config → results) can generate from it unchanged. raw carries the full
// extraction JSON, which the script prompt reuses as its fact source.
function toRetrieved(p: NoteProduct): RetrievedProductData {
  return {
    summary: p.summary,
    productName: p.productCode ?? p.sourceFile,
    productType: STRUCTURE_TYPE_LABELS[p.structureType],
    strike: p.strikePct,
    knockIn: p.kiPct,
    knockOut: p.koPct,
    fixingDate: p.fixingDate,
    observationDates: p.observationDates,
    maturityDate: p.variantFields?.maturityDate ?? null,
    underlyingSymbol: p.underlyings[0] ?? null,
    market: p.market,
    raw: p.raw,
  }
}

// The script/factsheet screens replace this component while the user works on one product —
// keep the last computed batch alive for the page's lifetime so returning is instant
// (no re-extract, no re-backtest). sessionStorage still covers a full refresh.
interface ResumeState {
  products: NoteProduct[]
  items: Item[]
  windowMonths: number
  fileById: Record<string, GenerateFile>
  selectedId: string | null
  view: 'summary' | 'detail'
}
let RESUME: ResumeState | null = null

// Survive an accidental refresh: extracted products are paid-for (model tokens), so keep
// them for the tab's lifetime. Candles/backtests are cheap to recompute and NOT stored.
const SESSION_KEY = 'kiko-batch-products'

function saveSession(prods: NoteProduct[], wm: number): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ prods, wm }))
  } catch { /* quota — skip silently */ }
}

function loadSession(): { prods: NoteProduct[]; wm: number } | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    return Array.isArray(data?.prods) && data.prods.length ? { prods: data.prods, wm: data.wm ?? 12 } : null
  } catch {
    return null
  }
}

export function BacktestDashboard({ patch }: { patch: Patch }) {
  const [phase, setPhase] = useState<Phase>(RESUME ? 'dashboard' : 'upload')
  const [dragging, setDragging] = useState(false)
  const [sources, setSources] = useState<NoteSource[]>([])
  const [addMode, setAddMode] = useState<InputMode>('file')
  const [linkDraft, setLinkDraft] = useState('')
  const [textDraft, setTextDraft] = useState('')
  const [progress, setProgress] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [products, setProducts] = useState<NoteProduct[]>(RESUME?.products ?? [])
  const [items, setItems] = useState<Item[]>(RESUME?.items ?? [])
  const [recomputing, setRecomputing] = useState(false)
  const [loadingChartId, setLoadingChartId] = useState<string | null>(null)
  const [windowMonths, setWindowMonths] = useState(RESUME?.windowMonths ?? 12)
  const [fileById, setFileById] = useState<Record<string, GenerateFile>>(RESUME?.fileById ?? {})
  const [preview, setPreview] = useState<{ name: string; url: string; mediaType: string } | null>(null)
  const [printing, setPrinting] = useState(false)
  const [backendOk, setBackendOk] = useState<boolean | null>(null)
  const [savedSession, setSavedSession] = useState<{ prods: NoteProduct[]; wm: number } | null>(() => loadSession())

  const [view, setView] = useState<'summary' | 'detail'>(RESUME?.view ?? 'summary')
  const [profile, setProfile] = useState<ProfileKey>('balanced')
  const [custom, setCustom] = useState<ScoreWeights>(DEFAULT_CUSTOM_WEIGHTS)
  const [sortKey, setSortKey] = useState<SortKey>('rank')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [selectedId, setSelectedId] = useState<string | null>(RESUME?.selectedId ?? null)
  // Lifted so the factsheet button (in the detail toolbar) can carry it to the store.
  const [notional, setNotional] = useState('')

  // Keep the resume snapshot current so navigating to the script/factsheet screens and
  // back restores this exact view.
  useEffect(() => {
    if (phase === 'dashboard') RESUME = { products, items, windowMonths, fileById, selectedId, view }
  }, [phase, products, items, windowMonths, fileById, selectedId, view])

  // Only KIKO products get scored & ranked — that's what the desk actually sells.
  // Everything else still gets extracted/backtested (graph + detail + factsheet/script),
  // just listed without a rank.
  const kikoItems = useMemo(() => items.filter((i) => i.product.structureType === 'kiko'), [items])
  const otherItems = useMemo(() => items.filter((i) => i.product.structureType !== 'kiko'), [items])
  const scored = useMemo(() => scoreProducts(kikoItems, weightsFor(profile, custom)), [kikoItems, profile, custom])
  const selected: DetailProduct | null =
    scored.find((s) => s.product.id === selectedId) ??
    (() => {
      const it = otherItems.find((i) => i.product.id === selectedId)
      return it ? { ...it, score: null, rank: null } : null
    })()

  useEffect(() => {
    fetch('http://localhost:8000/api/generate/health')
      .then((r) => r.json())
      .then((d) => setBackendOk(!!d?.available))
      .catch(() => setBackendOk(false))
  }, [])

  async function recompute(prods: NoteProduct[], wm: number) {
    setRecomputing(true)
    // Use the fast scoring pass — no candle data stored, so this completes much
    // quicker on large batches. Charts load lazily when the user opens a detail page.
    const POOL = 3
    const next: (Item | null)[] = new Array(prods.length).fill(null)
    let started = 0
    let done = 0
    setProgress(`Backtest 0/${prods.length}`)
    async function worker() {
      while (started < prods.length) {
        const i = started++
        next[i] = { product: prods[i], backtest: await backtestScore(prods[i], wm) }
        done++
        setProgress(`Backtest ${done}/${prods.length}`)
      }
    }
    await Promise.all(Array.from({ length: Math.min(POOL, prods.length) }, worker))
    setItems(next.filter((x): x is Item => x !== null))
    setRecomputing(false)
  }

  // Lazy-load full candle data for one product the first time its detail page opens.
  // backtestDetail reuses the already-cached prices from the scoring pass so there
  // is no extra network cost — it's purely CPU work to build the series arrays.
  async function loadDetail(id: string, wm: number) {
    const item = items.find((it) => it.product.id === id)
    if (!item || item.backtest.chartReady) return
    setLoadingChartId(id)
    try {
      const detailed = await backtestDetail(item.product, wm)
      setItems((prev) => prev.map((it) => it.product.id === id ? { ...it, backtest: detailed } : it))
    } finally {
      setLoadingChartId(null)
    }
  }

  async function run() {
    // Drafts still sitting in the text/link inputs count automatically — pasting a
    // summary and hitting เริ่มวิเคราะห์ works without the "+ เพิ่มข้อความ" step.
    const pending: NoteSource[] = []
    const text = textDraft.trim()
    if (text) pending.push({ kind: 'text', text, label: `ข้อความ #${sources.filter((s) => s.kind === 'text').length + 1}` })
    const link = linkDraft.trim()
    if (link) pending.push({ kind: 'link', link, label: link })
    const all = [...sources, ...pending]
    if (all.length === 0) return
    if (pending.length) {
      setSources(all)
      setTextDraft('')
      setLinkDraft('')
    }

    setPhase('running')
    setErrors([])
    const errs: string[] = []
    // One source can yield MANY products (a pasted desk listing → N products), so each
    // slot holds an array that gets flattened afterwards.
    const results: NoteProduct[][] = new Array(all.length).fill(null).map(() => [])
    const nextFileById: Record<string, GenerateFile> = {}

    // Extract concurrently (small pool) — wall-clock is dominated by the model call,
    // so 3 in flight roughly cuts a large batch's total time to a third.
    const CONCURRENCY = 3
    let started = 0
    let done = 0
    setProgress(`สกัดข้อมูล 0/${all.length}`)
    async function worker() {
      while (started < all.length) {
        const i = started++
        const source = all[i]
        try {
          if (source.kind === 'text') {
            // Large desk listings are split into small chunks + extracted concurrently so a
            // 30-product paste doesn't hit the 180s single-call timeout.
            results[i] = await extractNotesFromTextChunked(source.text, source.label, () => crypto.randomUUID())
          } else {
            const id = crypto.randomUUID()
            results[i] = [await extractNote(source, id)]
            if (source.kind === 'file') nextFileById[id] = source.file
          }
        } catch (err) {
          errs.push(err instanceof Error ? err.message : String(err))
        }
        done++
        setProgress(`สกัดข้อมูล ${done}/${all.length}`)
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, all.length) }, worker))

    const prods = results.flat()
    setProducts(prods)
    setFileById(nextFileById)
    setErrors(errs)
    saveSession(prods, windowMonths)
    setSavedSession(null)
    await recompute(prods, windowMonths)
    setPhase('dashboard')
  }

  async function restoreSession() {
    const saved = savedSession
    if (!saved) return
    setSavedSession(null)
    setPhase('running')
    setErrors([])
    setProducts(saved.prods)
    setWindowMonths(saved.wm)
    await recompute(saved.prods, saved.wm)
    setPhase('dashboard')
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

  function removeSource(i: number) {
    setSources((prev) => prev.filter((_, idx) => idx !== i))
  }

  const SOURCE_LABEL: Record<NoteSource['kind'], string> = { file: 'PDF', link: 'URL', text: 'TXT' }

  function openPreview(id: string) {
    const file = fileById[id]
    if (!file) return
    setPreview({ name: file.name, url: blobUrlFor(file), mediaType: file.mediaType })
  }

  function closePreview() {
    if (preview) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  async function handleExportSelected(format: 'pdf' | 'jpg') {
    if (!selected) return
    setPrinting(true)
    try {
      if (format === 'pdf') await printProductReport(selected, windowMonths)
      else await downloadProductJpg(selected, windowMonths)
    } finally {
      setPrinting(false)
    }
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

  // ── Upload / running (landing) ──
  if (phase !== 'dashboard') {
    const runningStage = phase === 'running' ? (progress.startsWith('Backtest') ? 2 : 1) : -1
    return (
      <Screen maxWidth={680}>
        {/* Hero */}
        <div style={{ textAlign: 'center', margin: '10px 0 18px' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>Structured Note Summary</div>
          <div style={{ fontSize: 13.5, color: C.muted, marginTop: 4, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.7 }}>
            รวม Term Sheet หลายรายการให้เป็นตารางสรุปเดียว — สกัดเงื่อนไข แบ็คเทสต์ราคาย้อนหลัง จัดอันดับ แล้วต่อยอดเป็น Script, Factsheet หรือกราฟได้ทันที
          </div>
        </div>
        <PipelineStrip stage={runningStage} />

        <Card>
          {phase === 'upload' && (
            <>
              {backendOk === false && (
                <div style={{ fontSize: 12.5, color: C.coral, background: C.coralLight, border: `1px solid ${C.coralBorder}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, lineHeight: 1.6 }}>
                  เชื่อมต่อ backend ไม่ได้ (localhost:8000) — เปิดเซิร์ฟเวอร์ก่อน มิฉะนั้นการสกัดข้อมูล/โหลดราคาจะไม่ทำงาน
                </div>
              )}
              {savedSession && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 12.5, color: C.teal, background: C.tealLight, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}>
                  <span>มีผลวิเคราะห์ค้างจากรอบก่อน ({savedSession.prods.length} ผลิตภัณฑ์) — กู้คืนได้โดยไม่ต้องสกัดใหม่</span>
                  <button className="btn-ghost" onClick={restoreSession} style={{ padding: '5px 14px', borderRadius: 8, border: `1px solid ${C.tealBorder}`, background: C.white, color: C.teal, fontSize: 12.5, cursor: 'pointer', flexShrink: 0 }}>กู้คืน →</button>
                </div>
              )}

              <IconOptions
                value={addMode}
                onChange={(v) => setAddMode(v as InputMode)}
                minWidth={150}
                options={[
                  { value: 'file', icon: <IconFileText size={19} />, label: 'ไฟล์เอกสาร', sub: 'PDF / รูปภาพ' },
                  { value: 'link', icon: <IconLink size={19} />, label: 'ลิงก์อ้างอิง', sub: 'Web URL' },
                  { value: 'text', icon: <IconAlignLeft size={19} />, label: 'ข้อความสรุป', sub: 'วางจากอีเมล / แชท' },
                ]}
              />

              <div style={{ marginTop: 12 }}>
                {addMode === 'file' && (
                  <label
                    onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault()
                      setDragging(false)
                      if (e.dataTransfer.files?.length) addFileSources(e.dataTransfer.files)
                    }}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '34px 20px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                      border: `1.5px dashed ${dragging ? C.primary : C.border}`,
                      background: dragging ? C.primaryLight : C.bg,
                      transition: 'border-color 0.15s ease, background-color 0.15s ease',
                    }}
                  >
                    <span style={{ color: dragging ? C.primary : C.muted, display: 'flex' }}><IconUpload size={26} /></span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>ลากไฟล์มาวาง หรือคลิกเลือก</span>
                    <span style={{ fontSize: 12, color: C.muted }}>PDF, PNG, JPG — เลือกได้หลายไฟล์พร้อมกัน</span>
                    <input type="file" accept=".pdf,.png,.jpg,.jpeg,.webp" multiple style={{ display: 'none' }} onChange={(e) => { if (e.target.files?.length) addFileSources(e.target.files) }} />
                  </label>
                )}
                {addMode === 'link' && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      value={linkDraft}
                      onChange={(e) => setLinkDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addLinkSource() }}
                      placeholder="https://..."
                      style={{ flex: 1, padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box' }}
                    />
                    <button className="btn-ghost" onClick={addLinkSource} disabled={!linkDraft.trim()} style={{ padding: '0 16px', borderRadius: 10, border: `1px solid ${C.primaryBorder}`, background: C.primaryLight, color: C.primary, fontSize: 13.5, cursor: 'pointer' }}>+ เพิ่มลิงก์</button>
                  </div>
                )}
                {addMode === 'text' && (
                  <div>
                    <textarea
                      value={textDraft}
                      onChange={(e) => setTextDraft(e.target.value)}
                      placeholder="วางรายละเอียดผลิตภัณฑ์ — หนึ่งข้อความมีหลายผลิตภัณฑ์ได้ ระบบแยกให้เอง"
                      rows={5}
                      style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit', marginBottom: 8 }}
                    />
                    <span style={{ fontSize: 12, color: C.muted }}>วางข้อความแล้วกด "เริ่มวิเคราะห์" ได้เลย</span>
                  </div>
                )}
              </div>

              {sources.length > 0 && (
                <ul style={{ listStyle: 'none', padding: 0, margin: '14px 0 0', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {sources.map((s, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, fontSize: 13, color: C.text, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '8px 12px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <span style={{ color: C.teal, display: 'flex', flexShrink: 0 }}><IconCheck size={13} strokeWidth={2.5} /></span>
                        <span className="num" style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{SOURCE_LABEL[s.kind]}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                      </span>
                      <button className="btn-ghost" onClick={() => removeSource(i)} aria-label={`ลบ ${s.label}`} style={{ border: 'none', background: 'none', cursor: 'pointer', color: C.muted, flexShrink: 0 }}>×</button>
                    </li>
                  ))}
                </ul>
              )}

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, marginTop: 20 }}>
                <NavBtn onClick={run} disabled={sources.length + (textDraft.trim() ? 1 : 0) + (linkDraft.trim() ? 1 : 0) === 0}>
                  {(() => {
                    // Pending drafts count toward the total so the button reflects what run() will do.
                    const n = sources.length + (textDraft.trim() ? 1 : 0) + (linkDraft.trim() ? 1 : 0)
                    return n ? `เริ่มวิเคราะห์ ${n} รายการ →` : 'เพิ่มข้อมูลก่อน'
                  })()}
                </NavBtn>
              </div>
            </>
          )}
          {phase === 'running' && (
            <div style={{ padding: '26px 0', textAlign: 'center' }}>
              <div className="spin" style={{ fontSize: 22, color: C.primary }}>◌</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginTop: 10 }}>{progress}</div>
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
  const td = { padding: '10px 12px', fontSize: 13.5, color: C.text, borderTop: `1px solid ${C.border}` }
  const sortableTh = (label: string, key: SortKey) => (
    <th style={{ ...th, cursor: 'pointer' }} onClick={() => toggleSort(key)}>
      {label} {sortKey === key ? (sortDir === 'asc' ? '▲' : '▼') : ''}
    </th>
  )

  function renderTable(group: ScoredProduct[], accent: string) {
    if (group.length === 0) return <div style={{ fontSize: 13, color: C.muted, padding: '8px 12px' }}>— ไม่มีรายการ —</div>
    return (
      <div className="table-wrap">
        <table>
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
              <tr key={s.product.id} className="row-hover">
                <td style={td}><span className={`rank-chip${s.rank <= 3 ? ' top' : ''}`}>{String(s.rank).padStart(2, '0')}</span></td>
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
                <td className="num" style={{ ...td, color: accent, fontWeight: 600 }}>{fmtPct(s.product.couponPa)}</td>
                <td className="num" style={td}>{kiko(s.product)}</td>
                <td className="num" style={td}>{s.backtest.bufferPct == null ? '-' : `${s.backtest.bufferPct}%`}</td>
                <td className="num" style={td}>{s.backtest.volatilityPct == null ? '-' : `${s.backtest.volatilityPct}%`}</td>
                <td className="num" style={td}>{s.product.tenor ?? '-'}</td>
                <td style={td}>{s.product.issuer ?? '-'}</td>
                <td className="num" style={{ ...td, fontWeight: 600 }}>{s.score}</td>
                <td style={{ ...td, display: 'flex', gap: 6 }}>
                  <button className="btn-ghost" onClick={() => viewDetail(s.product.id)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.primary, fontSize: 12.5, cursor: 'pointer' }}>ดูรายละเอียด →</button>
                  {fileById[s.product.id] && (
                    <button className="btn-ghost" onClick={() => openPreview(s.product.id)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 12.5, cursor: 'pointer' }}>ต้นฉบับ</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  function viewDetail(id: string) {
    setSelectedId(id)
    setView('detail')
    window.scrollTo({ top: 0 })
    // Kick off the lazy candle fetch if this product hasn't been opened before.
    loadDetail(id, windowMonths)
  }

  function startNewBatch() {
    RESUME = null
    setPhase('upload')
    setItems([])
    setProducts([])
    setSources([])
    setFileById({})
    setSelectedId(null)
    setView('summary')
  }

  const bestPass = passGroup.length ? passGroup.reduce((a, b) => (b.score > a.score ? b : a)) : null

  if (view === 'detail') {
    return (
      <Screen maxWidth={1100}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
            <button className="btn-ghost" onClick={() => setView('summary')} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 12.5, cursor: 'pointer' }}>← กลับตารางสรุป</button>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {/* Continue into memie's generators with this product's extracted data. */}
              <button
                className="btn-ghost"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return
                  const p = selected.product
                  patch({ selectedProduct: p, retrieved: toRetrieved(p), targetProduct: p.productCode ?? p.sourceFile, screen: 'persona' })
                }}
                style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.primaryBorder}`, background: C.primaryLight, color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                🎯 สร้าง Script
              </button>
              <button
                className="btn-ghost"
                disabled={!selected}
                onClick={() => {
                  if (!selected) return
                  const n = Number(notional.replace(/,/g, ''))
                  // Latest closes per underlying (already fetched for the backtest) — the
                  // factsheet uses them as Spot to compute money levels + shares for delivery.
                  const spots: Record<string, number> = {}
                  let lastTime = 0
                  for (const ser of selected.backtest.series) {
                    if (ser.currentPrice != null) spots[ser.symbol] = ser.currentPrice
                    const t = ser.candles[ser.candles.length - 1]?.time
                    if (t && t > lastTime) lastTime = t
                  }
                  patch({
                    selectedProduct: selected.product,
                    notional: notional.trim() && Number.isFinite(n) && n > 0 ? n : null,
                    spots: Object.keys(spots).length ? spots : null,
                    spotAsOf: lastTime ? new Date(lastTime * 1000).toISOString().slice(0, 10) : null,
                    screen: 'factsheet',
                  })
                }}
                style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.primaryBorder}`, background: C.primaryLight, color: C.primary, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                📄 สร้าง Factsheet
              </button>
              <select
                value=""
                disabled={printing || !selected}
                onChange={(e) => {
                  const format = e.target.value as 'pdf' | 'jpg'
                  if (format) handleExportSelected(format)
                }}
                style={{ padding: '9px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.text, color: C.white, fontSize: 13, fontWeight: 600, cursor: printing || !selected ? 'default' : 'pointer' }}
              >
                <option value="" disabled>{printing ? 'กำลังสร้างไฟล์...' : 'ดาวน์โหลดตะกร้านี้'}</option>
                <option value="pdf">บันทึกเป็น PDF</option>
                <option value="jpg">บันทึกเป็น JPG (ส่งไลน์)</option>
              </select>
            </div>
          </div>
          <DetailGraphView key={selected?.product.id ?? 'none'} selected={selected} hasFile={!!(selected && fileById[selected.product.id])} onPreview={() => selected && openPreview(selected.product.id)} notional={notional} setNotional={setNotional} isLoadingChart={loadingChartId === selected?.product.id} />
        </Card>

        {preview && (
          <div onClick={closePreview} style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: 12, boxShadow: 'var(--shadow-pop)', width: 'min(900px, 100%)', height: 'min(90vh, 1100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{preview.name}</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <a href={preview.url} download={preview.name} style={{ fontSize: 12.5, color: C.teal, textDecoration: 'none' }}>ดาวน์โหลด</a>
                  <button className="btn-ghost" aria-label="ปิด" onClick={closePreview} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: C.muted }}>×</button>
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

  return (
    <Screen maxWidth={1100}>
      {/* ── Summary + rankings ── */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div className="overline">Structured Note Summary</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text, letterSpacing: '-0.01em' }}>สรุปและจัดอันดับตราสารโครงสร้าง</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <select value={windowMonths} onChange={(e) => changeWindow(Number(e.target.value))} disabled={recomputing} style={{ padding: '7px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, fontSize: 12.5 }}>
              {WINDOW_OPTIONS.map((o) => <option key={o.months} value={o.months}>ย้อนหลัง {o.label}</option>)}
            </select>
            <button className="btn-ghost" onClick={() => exportCsv(scored)} style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 12.5, cursor: 'pointer' }}>CSV</button>
            <button
              className="btn-ghost"
              onClick={startNewBatch}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8,
                border: `1px solid ${C.primaryBorder}`, background: C.primaryLight, color: C.primary,
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
              }}
            >
              <IconUpload size={13} />วิเคราะห์ชุดใหม่
            </button>
          </div>
        </div>
        {recomputing && <div style={{ fontSize: 12.5, color: C.teal, marginTop: 6 }}>กำลังคำนวณใหม่...</div>}

        <div className="tiles">
          <div className="tile">
            <div className="k">ผลิตภัณฑ์</div>
            <div className="v">{items.length}</div>
            <div className="s">KIKO {kikoItems.length} · อื่นๆ {otherItems.length} · แบ็คเทสต์ {windowMonths} เดือน</div>
          </div>
          <div className="tile">
            <div className="k">Historical Pass (KIKO)</div>
            <div className="v" style={{ color: 'var(--c-teal)' }}>{passGroup.length}</div>
            <div className="s">ไม่เคยชน KI/KO</div>
          </div>
          <div className="tile">
            <div className="k">Historical Knocked (KIKO)</div>
            <div className="v" style={{ color: 'var(--c-coral)' }}>{knockedGroup.length}</div>
            <div className="s">เคยชน KI/KO ในช่วงที่ดู</div>
          </div>
          <div className="tile">
            <div className="k">อันดับ 1 (Pass)</div>
            <div className="v">{bestPass ? bestPass.score : '–'}</div>
            <div className="s" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bestPass ? (bestPass.product.productCode ?? bestPass.product.sourceFile) : 'ไม่มีรายการ Pass'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8, alignItems: 'center' }}>
          <span className="overline" style={{ marginRight: 4 }}>โปรไฟล์คะแนน</span>
          {(['aggressive', 'balanced', 'save', 'custom'] as ProfileKey[]).map((p) => {
            const sel = profile === p
            return (
              <button key={p} className="btn-ghost" aria-pressed={sel} onClick={() => setProfile(p)} style={{ padding: '6px 13px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer', border: `1px solid ${sel ? C.primary : C.border}`, background: sel ? C.primary : C.white, color: sel ? C.onPrimary : C.text, fontWeight: sel ? 600 : 400 }}>
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
          <div style={{ fontSize: 12.5, color: C.amber, background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 8, padding: '8px 12px', margin: '4px 0 12px' }}>
            {errors.length} ไฟล์สกัดไม่สำเร็จ: {errors.join(' | ')}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, margin: '18px 0 4px' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>KIKO Ranking</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>{kikoItems.length} รายการ — จัดอันดับตามโปรไฟล์คะแนนที่เลือก</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 8px' }}>
          <span className="badge pass">Historical Pass</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>{passGroup.length} รายการ — ไม่เคยชน KI/KO</span>
        </div>
        {renderTable(passGroup, C.teal)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '20px 0 8px' }}>
          <span className="badge knock">Historical Knocked</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>{knockedGroup.length} รายการ — เคยชน KI/KO</span>
        </div>
        {renderTable(knockedGroup, C.coral)}

        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 16, lineHeight: 1.6 }}>
          Buffer = ระยะ % ของหุ้นอ่อนสุดจากระดับ KI ปัจจุบัน • Vol = ความผันผวนต่อปีของหุ้นที่ผันผวนสุด • เฉพาะวันสังเกตการณ์ KO ที่ผ่านมาแล้วเท่านั้นที่ถูกนำมาตัดสิน
        </div>
      </Card>

      {otherItems.length > 0 && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>ผลิตภัณฑ์อื่น</span>
            <span className="badge plain">ไม่จัดอันดับ</span>
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 12 }}>
            {otherItems.length} รายการ — ไม่ใช่ KIKO จึงไม่เข้าตารางคะแนน แต่ดูรายละเอียด/กราฟ/สร้างเอกสารได้
          </div>
          <div className="table-wrap">
            <table>
                <thead>
                  <tr>
                    <th style={th}>ประเภท</th>
                    <th style={th}>Product</th>
                    <th style={th}>Underlying</th>
                    <th style={th}>Coupon</th>
                    <th style={th}>KI / KO</th>
                    <th style={th}>Buffer</th>
                    <th style={th}>Vol</th>
                    <th style={th}>Tenor</th>
                    <th style={th}>Issuer</th>
                    <th style={th}>ผลย้อนหลัง</th>
                    <th style={th}></th>
                  </tr>
                </thead>
                <tbody>
                  {otherItems.map((it) => (
                    <tr key={it.product.id} className="row-hover">
                      <td style={td}><span className="badge plain">{STRUCTURE_TYPE_LABELS[it.product.structureType]}</span></td>
                      <td style={{ ...td, fontWeight: 600 }}>{it.product.productCode ?? it.product.sourceFile}</td>
                      <td style={td}>{it.product.underlyings.join(', ') || '-'}</td>
                      <td className="num" style={td}>{fmtPct(it.product.couponPa)}</td>
                      <td className="num" style={td}>{kiko(it.product)}</td>
                      <td className="num" style={td}>{it.backtest.bufferPct == null ? '-' : `${it.backtest.bufferPct}%`}</td>
                      <td className="num" style={td}>{it.backtest.volatilityPct == null ? '-' : `${it.backtest.volatilityPct}%`}</td>
                      <td className="num" style={td}>{it.product.tenor ?? '-'}</td>
                      <td style={td}>{it.product.issuer ?? '-'}</td>
                      <td style={td}><span className={`badge ${it.backtest.verdict === 'pass' ? 'pass' : 'knock'}`}>{it.backtest.verdict === 'pass' ? 'Pass' : 'Knocked'}</span></td>
                      <td style={{ ...td, display: 'flex', gap: 6 }}>
                        <button className="btn-ghost" onClick={() => viewDetail(it.product.id)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.primary, fontSize: 12.5, cursor: 'pointer' }}>ดูรายละเอียด →</button>
                        {fileById[it.product.id] && (
                          <button className="btn-ghost" onClick={() => openPreview(it.product.id)} style={{ padding: '5px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 12.5, cursor: 'pointer' }}>ต้นฉบับ</button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {preview && (
        <div onClick={closePreview} style={{ position: 'fixed', inset: 0, background: 'var(--c-overlay)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: C.white, borderRadius: 12, boxShadow: 'var(--shadow-pop)', width: 'min(900px, 100%)', height: 'min(90vh, 1100px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text }}>{preview.name}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={preview.url} download={preview.name} style={{ fontSize: 12.5, color: C.teal, textDecoration: 'none' }}>ดาวน์โหลด</a>
                <button className="btn-ghost" aria-label="ปิด" onClick={closePreview} style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 16, color: C.muted }}>×</button>
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

function DetailGraphView({ selected, hasFile, onPreview, notional, setNotional, isLoadingChart }: { selected: DetailProduct | null; hasFile: boolean; onPreview: () => void; notional: string; setNotional: (v: string) => void; isLoadingChart: boolean }) {
  if (!selected) {
    return (
      <div style={{ textAlign: 'center', padding: '36px 0', color: C.muted }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>ยังไม่ได้เลือกผลิตภัณฑ์</div>
        <div style={{ fontSize: 12.5 }}>กลับไปที่ตารางสรุป แล้วกด "ดูรายละเอียด" ที่ผลิตภัณฑ์ที่ต้องการ</div>
      </div>
    )
  }
  const p = selected.product
  const bt = selected.backtest
  const koTimes = koTimesFor(p)
  const [showEma50, setShowEma50] = useState(false)
  const [showEma200, setShowEma200] = useState(false)
  const notionalNum = Number(notional.replace(/,/g, ''))
  const hasNotional = notional.trim() !== '' && Number.isFinite(notionalNum) && notionalNum > 0

  const koObsText = (() => {
    const explicit = p.koObservationDates.length ? p.koObservationDates : p.observationDates
    if (explicit.length) return explicit.join(', ')
    if (p.koObservationFrequency === 'daily') return 'ทุกวันทำการ (Daily Observe)'
    if (p.koObservationFrequency) return `${p.koObservationFrequency === 'monthly' ? 'ทุกเดือน' : 'ทุกไตรมาส'} — คำนวณจากวันทำสัญญา`
    return '-'
  })()

  const fact = (k: string, v: string, mono = false) => (
    <div className="fact-item">
      <span className="fk">{k}</span>
      <span className={mono ? 'fv num' : 'fv'}>{v}</span>
    </div>
  )

  const ulTh = { padding: '9px 10px', fontSize: 11.5, fontWeight: 700, color: C.onPrimary, textAlign: 'left' as const, whiteSpace: 'nowrap' as const, background: C.primary }
  const ulTd = { padding: '9px 10px', fontSize: 13, color: C.text, whiteSpace: 'nowrap' as const }

  return (
    <div>
      {/* Header: name + status + score */}
      <div style={{ display: 'flex', alignItems: 'stretch', gap: 16, flexWrap: 'wrap', marginBottom: 6 }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div className="overline">รายละเอียดผลิตภัณฑ์</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: C.text, letterSpacing: '-0.01em', lineHeight: 1.35, margin: '2px 0 10px' }}>{p.productCode ?? p.sourceFile}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <span className={`badge ${bt.verdict === 'pass' ? 'pass' : 'knock'}`}>
              {bt.verdict === 'pass' ? 'Historical Pass' : `Knocked${bt.knockedIn ? ' · KI' : ''}${bt.knockedOut ? ' · KO' : ''}`}
            </span>
            <span className="badge plain">{STRUCTURE_TYPE_LABELS[p.structureType]}</span>
            {p.koType && <span className="badge plain">{p.koType === 'memory' ? 'KO: Memory' : 'KO: Final Valuation'}</span>}
            <span className="badge plain">{p.market === 'thai' ? 'หุ้นไทย' : 'ต่างประเทศ'}</span>
            {hasFile && (
              <button className="btn-ghost" onClick={onPreview} style={{ padding: '3px 10px', borderRadius: 999, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 11.5, cursor: 'pointer' }}>เปิดไฟล์ต้นฉบับ</button>
            )}
          </div>
        </div>
        {selected.score != null && (
          <div style={{ textAlign: 'center', padding: '12px 22px', borderRadius: 10, border: `1px solid ${C.tealBorder}`, background: C.tealLight, alignSelf: 'flex-start' }}>
            <div className="overline" style={{ color: C.teal }}>คะแนนรวม</div>
            <div className="num" style={{ fontSize: 34, fontWeight: 600, color: C.teal, lineHeight: 1.15 }}>{selected.score}</div>
            <div style={{ fontSize: 12, color: C.muted }}>อันดับ {selected.rank}</div>
          </div>
        )}
      </div>

      {/* Key metrics strip */}
      <div className="tiles" style={{ margin: '16px 0 4px' }}>
        <div className="tile">
          <div className="k">Coupon (p.a.)</div>
          <div className="v">{fmtPct(p.couponPa)}</div>
          <div className="s">ดอกเบี้ยต่อปี</div>
        </div>
        <div className="tile">
          <div className="k">KI / KO</div>
          <div className="v" style={{ fontSize: 18 }}>{kiko(p)}</div>
          <div className="s">% ของราคาเริ่มต้น</div>
        </div>
        <div className="tile">
          <div className="k">Buffer จาก KI</div>
          <div className="v" style={{ color: bt.bufferPct != null && bt.bufferPct < 10 ? 'var(--c-coral)' : 'var(--c-teal)' }}>{bt.bufferPct == null ? '–' : `${bt.bufferPct}%`}</div>
          <div className="s">หุ้นอ่อนสุด ณ ปัจจุบัน</div>
        </div>
        <div className="tile">
          <div className="k">Volatility</div>
          <div className="v">{bt.volatilityPct == null ? '–' : `${bt.volatilityPct}%`}</div>
          <div className="s">ต่อปี · ตัวผันผวนสุด</div>
        </div>
      </div>

      {/* Product terms */}
      <div className="section-h"><span className="overline">เงื่อนไขผลิตภัณฑ์</span></div>
      <div className="fact-grid">
        {fact('ผู้ออก (Issuer)', p.issuer ?? '-')}
        {fact('หุ้นอ้างอิง', p.underlyings.join(', ') || '-')}
        {fact('Strike', fmtPct(p.strikePct), true)}
        {fact('อายุสัญญา (Tenor)', p.tenor ?? '-', true)}
        {fact('วันทำสัญญา (Fixing)', p.fixingDate ?? '-', true)}
        {fact('KO observation', p.koType == null ? '-' : p.koType === 'memory' ? 'Memory' : 'Final Valuation')}
      </div>

      {/* Per-underlying strike/KO/KI table */}
      <div className="section-h"><span className="overline">ระดับราคาต่อหุ้นอ้างอิง</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 13 }}>
        <label htmlFor="notional-input" style={{ color: C.muted }}>Notional (บาท)</label>
        <input
          id="notional-input"
          type="text"
          inputMode="decimal"
          placeholder="เช่น 1,000,000"
          value={notional}
          onChange={(e) => setNotional(e.target.value)}
          style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 13, width: 150 }}
        />
        <span style={{ color: C.muted, fontSize: 12 }}>ใช้คำนวณ "จำนวนหุ้นที่ต้องส่งมอบ" และมูลค่าจองซื้อ/ดอกเบี้ยสุทธิใน Factsheet — ไม่กระทบการแบ็คเทสต์</span>
      </div>
      <div style={{ overflowX: 'auto', marginBottom: 8, border: `1px solid ${C.border}`, borderRadius: 10 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...ulTh, borderTopLeftRadius: 9 }}>หุ้นอ้างอิง</th>
              <th style={ulTh}>Spot Price</th>
              <th style={ulTh}>Strike Level (%)</th>
              <th style={ulTh}>Strike Price</th>
              <th style={ulTh}>KO Level (%)</th>
              <th style={ulTh}>KO Price</th>
              <th style={ulTh}>KI Level (%)</th>
              <th style={ulTh}>KI Price</th>
              <th style={ulTh}>Coupon (p.a.)</th>
              <th style={{ ...ulTh, borderTopRightRadius: 9 }}>จำนวนหุ้นที่ต้องส่งมอบ</th>
            </tr>
          </thead>
          <tbody>
            {bt.series.map((s, i) => {
              const shares = hasNotional && s.strikeLevel ? Math.round(notionalNum / s.strikeLevel) : null
              const rowBg = i % 2 === 1 ? C.bg : C.white
              return (
                <tr key={s.symbol} style={{ background: rowBg }}>
                  <td style={{ ...ulTd, fontWeight: 700 }}>{s.symbol}</td>
                  <td className="num" style={ulTd}>{s.initialPrice?.toFixed(2) ?? '-'}</td>
                  <td className="num" style={ulTd}>{fmtPct(p.strikePct)}</td>
                  <td className="num" style={ulTd}>{s.strikeLevel?.toFixed(2) ?? '-'}</td>
                  <td className="num" style={ulTd}>{fmtPct(p.koPct)}</td>
                  <td className="num" style={ulTd}>{s.koLevel?.toFixed(2) ?? '-'}</td>
                  <td className="num" style={ulTd}>{fmtPct(p.kiPct)}</td>
                  <td className="num" style={ulTd}>{s.kiLevel?.toFixed(2) ?? '-'}</td>
                  <td className="num" style={ulTd}>{fmtPct(p.couponPa)}</td>
                  <td className="num" style={{ ...ulTd, fontWeight: 700, color: C.primary }}>{shares == null ? '-' : shares.toLocaleString('en-US')}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Backtest result */}
      <div className="section-h"><span className="overline">ผลแบ็คเทสต์</span></div>
      <div className="fact-grid">
        {fact('ผลย้อนหลัง', bt.error ? 'ผิดพลาด' : `${bt.verdict === 'pass' ? 'Pass — ไม่เคยชน KI/KO' : 'Knocked — เคยชน KI/KO'}`)}
        {fact('ช่วงที่ทดสอบ', `${bt.windowMonths} เดือนย้อนหลัง`, true)}
      </div>
      <div className="fact-item" style={{ borderBottom: 'none' }}>
        <span className="fk">วันสังเกตการณ์ KO</span>
        <span className="fv" style={{ fontWeight: 500, fontSize: 14 }}>{koObsText}</span>
      </div>

      {p.summary && (
        <>
          <div className="section-h"><span className="overline">สรุปเงื่อนไข</span></div>
          <div style={{ padding: '14px 18px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 15, color: C.text, lineHeight: 1.9 }}>
            {p.summary}
          </div>
        </>
      )}
      {bt.warnings.length > 0 && (
        <div style={{ margin: '14px 0 0', padding: '12px 18px', background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 10, fontSize: 13.5, color: C.amber, lineHeight: 1.8 }}>
          <div style={{ fontWeight: 700, marginBottom: 2 }}>ข้อควรระวัง</div>
          {bt.warnings.map((w, i) => <div key={i}>• {w}</div>)}
        </div>
      )}

      {/* Graphs */}
      {bt.error ? (
        <div style={{ fontSize: 13.5, color: C.amber, marginTop: 14 }}>โหลดกราฟไม่ได้: {bt.error}</div>
      ) : isLoadingChart ? (
        // Chart data is loading lazily — show a placeholder until candles arrive.
        <div style={{ marginTop: 18 }}>
          <div className="section-h"><span className="overline">กราฟราคาย้อนหลัง {bt.windowMonths} เดือน</span></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '48px 0', border: `1px solid ${C.border}`, borderRadius: 10, color: C.muted, fontSize: 13.5 }}>
            <span className="spin" style={{ fontSize: 20, color: C.primary }}>◌</span>
            กำลังโหลดกราฟ...
          </div>
        </div>
      ) : (
        <div>
          <div className="section-h"><span className="overline">กราฟราคาย้อนหลัง {bt.windowMonths} เดือน</span></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.7 }}>
              ราคาปิดจริงเทียบเส้น Strike / KI / KO ที่คำนวณจากราคา ณ วันทำสัญญา — เส้น "วันทำสัญญา" คือจุดอ้างอิงราคาเริ่มต้น ไม่ใช่จุดตัดการนับ
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12.5, flexShrink: 0 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: C.text }}>
                <input type="checkbox" checked={showEma50} onChange={(e) => setShowEma50(e.target.checked)} />
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#F2A950' }} />
                EMA 50
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', color: C.text }}>
                <input type="checkbox" checked={showEma200} onChange={(e) => setShowEma200(e.target.checked)} />
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: '#7B6CE0' }} />
                EMA 200
              </label>
            </div>
          </div>
          {bt.series.map((s) => {
            const { levels, marks } = levelsAndMarksFor(s, koTimes)
            return (
              <div key={s.symbol} style={{ marginBottom: 28, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: C.bg, borderBottom: `1px solid ${C.border}`, flexWrap: 'wrap' }}>
                  <span className="num" style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{s.symbol}</span>
                  <span className="num" style={{ fontSize: 12, color: C.muted }}>initial {s.initialPrice?.toFixed(2) ?? '-'}</span>
                  <span className="num" style={{ fontSize: 12, color: C.muted }}>ปัจจุบัน {s.currentPrice?.toFixed(2) ?? '-'}</span>
                  {s.knockedIn && <span className="badge knock" style={{ marginLeft: 'auto' }}>เคยชน KI</span>}
                </div>
                <div style={{ padding: '8px 8px 0' }}>
                  <CandleChart candles={s.candles} levels={levels} dateMarks={marks} showEma50={showEma50} showEma200={showEma200} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

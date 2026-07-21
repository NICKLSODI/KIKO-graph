import { createChart, CandlestickSeries, LineStyle, ColorType, type AutoscaleInfoProvider } from 'lightweight-charts'
import { koTimesFor, levelsAndMarksFor } from './chartData'
import { backtestDetail } from './engine'
import { scoreProducts, PROFILE_WEIGHTS, PROFILE_LABELS } from './scoring'
import type { NoteProduct } from './types'
import type { BacktestResult, DetailProduct, ScoredProduct, UnderlyingSeries } from './types'
import { STRUCTURE_TYPE_LABELS, koObservationLabel, kiObservationLabel } from './types'
import { LEVEL_COLORS, LEVEL_LABELS } from '../../types'
import type { DateMark, Level } from '../../types'
import { buildData, defaultVisibleRange, nearestAxisTime } from '../../components/CandleChart'

const COLUMNS = [
  'Group', 'Rank', 'Product', 'Underlying', 'Structure', 'Coupon(%p.a.)',
  'KI(%)', 'KO(%)', 'Buffer(%)', 'Vol(%)', 'Tenor', 'Issuer',
  'Score:Aggressive', 'Score:Balanced', 'Score:Save', 'Best-fit customer', 'INVX Pick',
]

// Which customer profile a product suits best = the profile under which it scores highest.
// Scores are the same 0-100 weighted-average scale across profiles, so they're comparable.
const BEST_FIT_LABEL: Record<'aggressive' | 'balanced' | 'save', string> = {
  aggressive: 'เน้นผลตอบแทน (Aggressive)',
  balanced: 'สมดุล (Balanced)',
  save: 'เน้นปลอดภัย (Save)',
}

interface ProfileScores { aggressive: number; balanced: number; save: number; bestFit: 'aggressive' | 'balanced' | 'save' }

// Score every rankable (KIKO) product under all three fixed profiles at once, so the CSV
// carries all perspectives instead of just whichever profile happened to be selected on
// screen. Non-KIKO products aren't scored — they never enter this map.
function allProfileScores(list: DetailProduct[]): Map<string, ProfileScores> {
  const rankable = list.filter((s) => s.rank != null).map((s) => ({ product: s.product, backtest: s.backtest }))
  const byProfile = {
    aggressive: scoreProducts(rankable, PROFILE_WEIGHTS.aggressive),
    balanced: scoreProducts(rankable, PROFILE_WEIGHTS.balanced),
    save: scoreProducts(rankable, PROFILE_WEIGHTS.save),
  }
  const out = new Map<string, ProfileScores>()
  for (const item of rankable) {
    const id = item.product.id
    const a = byProfile.aggressive.find((s) => s.product.id === id)?.score ?? 0
    const b = byProfile.balanced.find((s) => s.product.id === id)?.score ?? 0
    const sv = byProfile.save.find((s) => s.product.id === id)?.score ?? 0
    const bestFit = a >= b && a >= sv ? 'aggressive' : b >= sv ? 'balanced' : 'save'
    out.set(id, { aggressive: a, balanced: b, save: sv, bestFit })
  }
  return out
}

// Canonical export ordering — ranked Pass, ranked Knocked, then unranked non-KIKO.
// Shared by the CSV rows and the batch-zip file numbering so they always agree.
function orderForExport(list: DetailProduct[]): DetailProduct[] {
  const ranked = list.filter((s) => s.rank != null)
  const pass = ranked.filter((s) => s.backtest.verdict === 'pass').sort((a, b) => a.rank! - b.rank!)
  const knocked = ranked.filter((s) => s.backtest.verdict === 'knocked').sort((a, b) => a.rank! - b.rank!)
  const unranked = list.filter((s) => s.rank == null)
  return [...pass, ...knocked, ...unranked]
}

function rowsOf(list: DetailProduct[]): (string | number)[][] {
  const scores = allProfileScores(list)
  const line = (s: DetailProduct): (string | number)[] => {
    const ps = scores.get(s.product.id)
    return [
      s.rank == null ? 'Unranked (non-KIKO)' : s.backtest.verdict === 'pass' ? 'Historical Pass' : 'Historical Knocked',
      s.rank ?? '',
      s.product.productCode ?? s.product.sourceFile,
      s.product.underlyings.join(' '),
      STRUCTURE_TYPE_LABELS[s.product.structureType],
      s.product.couponPa ?? '',
      s.product.kiPct ?? '',
      s.product.koPct ?? '',
      s.backtest.bufferPct ?? '',
      s.backtest.volatilityPct ?? '',
      s.product.tenor ?? '',
      s.product.issuer ?? '',
      ps ? ps.aggressive : '',
      ps ? ps.balanced : '',
      ps ? ps.save : '',
      ps ? BEST_FIT_LABEL[ps.bestFit] : '',
      s.product.invxPick ? 'Yes' : '',
    ]
  }
  return orderForExport(list).map(line)
}

// UTF-8 BOM so Excel reads Thai correctly.
function csvText(list: DetailProduct[]): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [COLUMNS, ...rowsOf(list)].map((r) => r.map(esc).join(','))
  return '﻿' + lines.join('\r\n')
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportCsv(scored: ScoredProduct[]): void {
  downloadBlob(new Blob([csvText(scored)], { type: 'text/csv;charset=utf-8' }), 'kiko-backtest-summary.csv')
}

const CHART_W = 1100
const CHART_H = 380

// Headlessly render one underlying's candle chart (off-screen, throwaway container) — same
// Strike/KI/KO price lines and date marks as the live Detail-tab chart — then snapshot it to
// a canvas so it can be embedded directly in the printed/PDF report or a composited JPG.
async function renderSeriesCanvas(
  candles: UnderlyingSeries['candles'],
  levels: Level[],
  marks: DateMark[],
  width = CHART_W,
  height = CHART_H,
  fontSize = 12,
): Promise<HTMLCanvasElement> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-99999px'
  container.style.top = '0px'
  container.style.width = `${width}px`
  container.style.height = `${height}px`
  document.body.appendChild(container)

  const chart = createChart(container, {
    width,
    height,
    layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#27261F', fontSize },
    grid: {
      vertLines: { color: 'rgba(128,128,128,0.15)', style: LineStyle.Dashed },
      horzLines: { color: 'rgba(128,128,128,0.15)', style: LineStyle.Dashed },
    },
    rightPriceScale: { scaleMargins: { top: 0.08, bottom: 0.08 } },
    timeScale: { rightOffset: 8 },
  })
  const series = chart.addSeries(CandlestickSeries, {
    // Client-facing export — hide the last-price axis badge/line (the live app keeps them).
    lastValueVisible: false,
    priceLineVisible: false,
  })
  // Same whitespace-extension as the live chart — without it, marks past the last real
  // candle (future KO observation dates) have no axis point to snap to and never draw.
  const { data, times } = buildData(candles, marks)
  series.setData(data as never)

  // Same "always include every level" autoscale used by the live chart, so Strike/KI/KO
  // lines far outside the OHLC range still land on-canvas instead of being clipped.
  const prices = levels.map((l) => l.price)
  const autoscaleWithLevels: AutoscaleInfoProvider = (original) => {
    const res = original()
    if (!res || !res.priceRange || prices.length === 0) return res
    return { ...res, priceRange: { minValue: Math.min(res.priceRange.minValue, ...prices), maxValue: Math.max(res.priceRange.maxValue, ...prices) } }
  }
  series.applyOptions({ autoscaleInfoProvider: autoscaleWithLevels })
  levels.forEach((level) => {
    series.createPriceLine({
      price: level.price,
      color: LEVEL_COLORS[level.kind],
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      axisLabelVisible: true,
      title: level.label || LEVEL_LABELS[level.kind],
    })
  })
  // Same default zoom as the live chart, so the exported image matches what's on screen —
  // not a plain fitContent(), which would zoom out to the full whitespace-padded range.
  const range = defaultVisibleRange(times, candles)
  if (range) chart.timeScale().setVisibleRange({ from: range.from as never, to: range.to as never })
  else chart.timeScale().fitContent()

  // Let the canvas actually paint before snapshotting (createChart/setData draw async).
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

  const canvas = chart.takeScreenshot()
  // Date marks (fixing date, KO observations) are our own overlay in the live chart, not
  // part of the library's own canvas — draw them onto the snapshot by hand so the exported
  // image still shows them.
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const scaleX = canvas.width / width
    const scaleY = canvas.height / height
    const timeScale = chart.timeScale()
    ctx.font = `${(fontSize - 1) * scaleY}px -apple-system, "Segoe UI", sans-serif`
    marks.forEach((mark, i) => {
      // Snap to the nearest axis point first — timeToCoordinate returns null for any
      // time that isn't an exact data point, which silently dropped obs-date lines.
      const snapped = nearestAxisTime(mark.time, times)
      const x = snapped == null ? null : timeScale.timeToCoordinate(snapped as never)
      if (x == null) return
      const px = x * scaleX
      ctx.strokeStyle = 'rgba(237,161,0,0.85)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(px, 0)
      ctx.lineTo(px, canvas.height)
      ctx.stroke()
      const nearRightEdge = px > canvas.width - 140 * scaleX
      ctx.fillStyle = '#B07800'
      ctx.textAlign = nearRightEdge ? 'right' : 'left'
      const tx = nearRightEdge ? px - 4 * scaleX : px + 4 * scaleX
      const ty = (6 + (i % 4) * (fontSize + 3)) * scaleY + 10 * scaleY
      ctx.fillText(mark.label, tx, ty)
    })
  }

  chart.remove()
  container.remove()
  return canvas
}

async function renderSeriesImage(candles: UnderlyingSeries['candles'], levels: Level[], marks: DateMark[]): Promise<string> {
  const canvas = await renderSeriesCanvas(candles, levels, marks)
  return canvas.toDataURL('image/png')
}

function fmt(v: number | null, suffix = '%'): string {
  return v == null ? '-' : `${v}${suffix}`
}

function factsFor(s: DetailProduct): [string, string][] {
  const p = s.product
  return [
    ['หุ้นอ้างอิง', p.underlyings.join(', ') || '-'],
    ['ประเภทโครงสร้าง', STRUCTURE_TYPE_LABELS[p.structureType]],
    ['Strike', fmt(p.strikePct)],
    ['Knock-In / Knock-Out', `${p.kiPct ?? '–'} / ${p.koPct ?? '–'}`],
    ['KO observation', koObservationLabel(p)],
    ['KI observation', kiObservationLabel(p)],
    ['Coupon (p.a.)', fmt(p.couponPa)],
    ['Tenor', p.tenor ?? '-'],
    ['Issuer', p.issuer ?? '-'],
  ]
}

async function productCardHtml(s: DetailProduct, accent: string): Promise<string> {
  const p = s.product
  const bt = s.backtest
  const koTimes = koTimesFor(p)

  const chartsHtml = bt.error
    ? `<div class="chart-error">โหลดกราฟไม่ได้: ${bt.error}</div>`
    : (
        await Promise.all(
          bt.series.map(async (ser) => {
            const { levels, marks } = levelsAndMarksFor(ser, koTimes)
            const img = await renderSeriesImage(ser.candles, levels, marks)
            return `
              <div class="series">
                <div class="series-head">
                  <b>${ser.symbol}</b>
                  <span class="muted">initial ${ser.initialPrice?.toFixed(2) ?? '-'}</span>
                </div>
                <img src="${img}" width="100%" />
              </div>`
          }),
        )
      ).join('')

  const facts = factsFor(s)
  const factsHtml = facts.map(([k, v]) => `<div class="fact"><span class="fact-k">${k}</span><span class="fact-v">${v}</span></div>`).join('')

  // Client-facing document — the internal rank/score never appears here (CSV keeps it).
  // invxPick is the firm's own recommendation stamp (not an internal metric), so it stays.
  const invxBadge = p.invxPick ? `<span class="badge-invx">💎 INVX Pick</span>` : ''
  return `
    <section class="card">
      <div class="card-head" style="border-left-color:${accent}">
        <div class="card-title">
          <b>${p.productCode ?? p.sourceFile}</b>
          ${invxBadge}
        </div>
        <div class="summary">${p.summary || ''}</div>
      </div>
      <div class="facts">${factsHtml}</div>
      <div class="charts">${chartsHtml}</div>
    </section>`
}

// Open a printable single-basket report in a new window and trigger print/save-as-PDF.
// One product per PDF: header card + fact grid + every underlying's candle chart
// (Strike/KI/KO lines + date marks) — no summary table.
export async function printProductReport(s: DetailProduct, windowMonths: number): Promise<void> {
  const accent = s.backtest.verdict === 'pass' ? '#0F6E56' : '#993C1D'
  const card = await productCardHtml(s, accent)
  const title = s.product.productCode ?? s.product.sourceFile

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title} — KIKO Report</title>
  <style>
    * { box-sizing: border-box }
    body{font-family:-apple-system,'Segoe UI',Tahoma,sans-serif;padding:24px;color:#27261F;background:#fff;font-size:14px}
    h1{font-size:24px;margin:0 0 6px;color:#0B3D56}
    .sub{color:#6B6A63;font-size:13.5px;margin-bottom:20px}
    /* The card is longer than one printed page — let it break naturally and instead keep
       each atomic block (facts grid, one chart + its header) on a single page. */
    .card{border:1px solid #E2E0D5;border-radius:10px;margin-bottom:18px}
    .card-head{padding:14px 18px;border-left:5px solid;background:#F7F6F1;break-inside:avoid;page-break-inside:avoid}
    .card-title{display:flex;align-items:center;gap:10px;font-size:17px}
    .summary{margin-top:8px;font-size:13.5px;color:#6B6A63;line-height:1.6}
    .facts{display:grid;grid-template-columns:repeat(3,1fr);gap:8px 18px;padding:14px 18px;font-size:13.5px;border-bottom:1px solid #E2E0D5;break-inside:avoid;page-break-inside:avoid}
    .fact{display:flex;justify-content:space-between;gap:8px;border-bottom:1px dashed #E2E0D5;padding:5px 0}
    .fact-k{color:#6B6A63}
    .fact-v{font-weight:600;text-align:right}
    .charts{padding:14px 18px}
    .series{margin-bottom:18px;break-inside:avoid;page-break-inside:avoid}
    .series-head{font-size:14.5px;margin-bottom:6px;display:flex;align-items:center;gap:10px}
    .series-head .muted{color:#6B6A63;font-weight:400;font-size:13px}
    .series img{display:block;width:100%}
    .badge-invx{color:#854F0B;background:#FAEEDA;border:1px solid #EF9F27;border-radius:999px;padding:2px 10px;font-size:12.5px;font-weight:600}
    .chart-error{color:#854F0B;font-size:13.5px}
  </style></head><body>
    <h1>${title}</h1>
    <div class="sub">แบ็คเทสต์ย้อนหลัง ${windowMonths} เดือน • worst-of ราคาปิดจริง • สร้างเมื่อ ${new Date().toLocaleString('th-TH', { dateStyle: 'long', timeStyle: 'short' })}</div>
    ${card}
    <div style="margin-top:20px;padding-top:12px;border-top:1px solid #E2E0D5;font-size:11.5px;color:#6B6A63;line-height:1.6">
      เอกสารนี้จัดทำจากการแบ็คเทสต์ราคาย้อนหลังและข้อมูลที่สกัดจาก Term Sheet โดยอัตโนมัติ เพื่อประกอบการพิจารณาเบื้องต้นเท่านั้น
      ไม่ใช่คำแนะนำการลงทุน และผลการดำเนินงานในอดีตไม่ได้เป็นเครื่องยืนยันผลตอบแทนในอนาคต — โปรดตรวจสอบเงื่อนไขกับเอกสารต้นฉบับของผู้ออกตราสารก่อนตัดสินใจ
    </div>
  </body></html>`

  const w = window.open('', '_blank')
  if (!w) return
  w.document.open()
  w.document.write(html)
  w.document.close()
  w.onload = () => w.print()
}

// Fixed to a common phone screen width (not the PDF's 1100px print width) so the image
// opens at native resolution full-screen in LINE/chat apps instead of needing a pinch-zoom.
const JPG_W = 1080
const JPG_MARGIN = 28
const JPG_CONTENT_W = JPG_W - JPG_MARGIN * 2
const TEXT_COLOR = '#27261F'
const MUTED_COLOR = '#6B6A63'

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  // Thai text has no spaces to wrap on — char-wrap any line that's still too wide.
  const out: string[] = []
  for (const l of lines) {
    if (ctx.measureText(l).width <= maxWidth) {
      out.push(l)
      continue
    }
    let chunk = ''
    for (const ch of l) {
      const test = chunk + ch
      if (chunk && ctx.measureText(test).width > maxWidth) {
        out.push(chunk)
        chunk = ch
      } else {
        chunk = test
      }
    }
    if (chunk) out.push(chunk)
  }
  return out
}

const FONT_STACK = '-apple-system,"Segoe UI",Tahoma,sans-serif'
const F_TITLE = `bold 38px ${FONT_STACK}`
const F_SUB = `20px ${FONT_STACK}`
const F_SUMMARY = `21px ${FONT_STACK}`
const F_FACT_K = `21px ${FONT_STACK}`
const F_FACT_V_SIZE = 21
const F_SERIES_HEAD = `bold 23px ${FONT_STACK}`

// Some fact values ("Monthly Observation (Final Valuation)") are long, unlike the short
// ones (Strike, Tenor) the 2-column fact grid was originally sized for — right-aligning
// at full size let a long value overflow left past its own label. Shrink the value font
// until it fits the column instead of wrapping (keeps every fact to one tidy line).
function fittedFactValueFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let size = F_FACT_V_SIZE
  while (size > 13) {
    const font = `bold ${size}px ${FONT_STACK}`
    ctx.font = font
    if (ctx.measureText(text).width <= maxWidth) return font
    size -= 1
  }
  return `bold 13px ${FONT_STACK}`
}
const F_SERIES_SUB = `19px ${FONT_STACK}`
const F_FOOTER = `16px ${FONT_STACK}`

// Human labels for the backtest windows.
const WINDOW_LABELS: Record<number, string> = { 6: '6 เดือน', 12: '1 ปี', 24: '2 ปี' }
const windowLabel = (m: number): string => WINDOW_LABELS[m] ?? `${m} เดือน`

/** One backtest window's result, for a product report that stacks several windows. */
export interface WindowResult {
  windowMonths: number
  backtest: BacktestResult
}

// Build a single tall report canvas: product header + facts (once) + one chart section
// per backtest window (each labeled 6 เดือน / 1 ปี / 2 ปี with its own verdict + underlying
// charts). Sized for reading full-screen on a phone; the batch ZIP also paginates it to PDF.
async function buildProductJpgCanvas(s: DetailProduct, windows: WindowResult[]): Promise<{ canvas: HTMLCanvasElement; title: string }> {
  const p = s.product
  const koTimes = koTimesFor(p)
  const title = p.productCode ?? p.sourceFile
  // INVX's own recommendation stamp — client-facing, unlike the internal score/rank this
  // export deliberately omits. Only the ON-CANVAS heading gets the prefix (reuses the
  // existing wrap/measure logic); `title` itself stays clean since it's also the filename.
  const displayTitle = (p.invxPick ? '💎 INVX Pick — ' : '') + title
  const accent = '#0B3D56'
  const facts = factsFor(s)
  // Taller than the PDF's chart ratio and bigger axis text — the JPG is read full-screen
  // on a phone, where the print-sized chart came out too small.
  const chartH = Math.round(JPG_CONTENT_W * 0.42)

  // Render every window's underlying charts up front (need their count for layout height).
  const sections = await Promise.all(
    windows.map(async (w) => {
      const bt = w.backtest
      const charts = bt.error
        ? []
        : await Promise.all(
            bt.series.map(async (ser) => {
              const { levels, marks } = levelsAndMarksFor(ser, koTimes)
              const canvas = await renderSeriesCanvas(ser.candles, levels, marks, JPG_CONTENT_W, chartH, 16)
              return { ser, canvas }
            }),
          )
      const verdictText = bt.verdict === 'pass' ? 'Historical Pass — ไม่เคยชน KI/KO' : 'Historical Knocked — เคยชน KI/KO'
      return { windowMonths: w.windowMonths, error: bt.error, verdictText, charts }
    }),
  )

  const meas = document.createElement('canvas').getContext('2d')!

  // Client-facing image — no internal score/rank here (CSV keeps them).
  const winList = windows.map((w) => windowLabel(w.windowMonths)).join(' / ')
  const subtitle = `แบ็คเทสต์ย้อนหลัง ${winList} • สร้างเมื่อ ${new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}`
  meas.font = F_TITLE
  const titleLines = wrapText(meas, displayTitle, JPG_CONTENT_W)
  meas.font = F_SUB
  const subLines = wrapText(meas, subtitle, JPG_CONTENT_W)
  meas.font = F_SUMMARY
  const summaryLines = p.summary ? wrapText(meas, p.summary, JPG_CONTENT_W) : []
  meas.font = F_FOOTER
  const footerLines = wrapText(
    meas,
    'เอกสารนี้จัดทำจากการแบ็คเทสต์ราคาย้อนหลังและข้อมูลที่สกัดจาก Term Sheet โดยอัตโนมัติ เพื่อประกอบการพิจารณาเบื้องต้นเท่านั้น ไม่ใช่คำแนะนำการลงทุน และผลการดำเนินงานในอดีตไม่ได้เป็นเครื่องยืนยันผลตอบแทนในอนาคต',
    JPG_CONTENT_W,
  )

  const TITLE_LH = 46
  const SUB_LH = 28
  const SUMMARY_LH = 30
  const FACT_LH = 34
  const WINDOW_HEAD_LH = 40
  const SERIES_HEAD_LH = 30
  const FOOTER_LH = 24

  // Facts render as a 2-column grid (5 rows instead of 10) to halve the dead space the
  // old single-column list left on the right side of the image.
  const FACT_COL_GAP = 48
  const factColW = (JPG_CONTENT_W - FACT_COL_GAP) / 2
  const factRows = Math.ceil(facts.length / 2)

  let h = JPG_MARGIN
  h += titleLines.length * TITLE_LH + 6
  h += subLines.length * SUB_LH + 12
  h += summaryLines.length * SUMMARY_LH + (summaryLines.length ? 12 : 0)
  h += 4 + 16 // accent rule + gap
  h += factRows * FACT_LH + 12
  for (const sec of sections) {
    h += WINDOW_HEAD_LH
    if (sec.error) h += SUMMARY_LH
    for (const c of sec.charts) { void c; h += SERIES_HEAD_LH + chartH + 16 }
    h += 8
  }
  h += 12 // rule above footer
  h += footerLines.length * FOOTER_LH
  h += JPG_MARGIN

  const canvas = document.createElement('canvas')
  canvas.width = JPG_W
  canvas.height = Math.ceil(h)
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  let y = JPG_MARGIN
  ctx.font = F_TITLE
  ctx.fillStyle = TEXT_COLOR
  for (const l of titleLines) {
    y += TITLE_LH
    ctx.fillText(l, JPG_MARGIN, y - 10)
  }
  y += 6
  ctx.font = F_SUB
  ctx.fillStyle = MUTED_COLOR
  for (const l of subLines) {
    y += SUB_LH
    ctx.fillText(l, JPG_MARGIN, y - 8)
  }
  y += 12
  if (summaryLines.length) {
    ctx.font = F_SUMMARY
    ctx.fillStyle = TEXT_COLOR
    for (const l of summaryLines) {
      y += SUMMARY_LH
      ctx.fillText(l, JPG_MARGIN, y - 8)
    }
    y += 12
  }

  ctx.fillStyle = accent
  ctx.fillRect(JPG_MARGIN, y, JPG_CONTENT_W, 4)
  y += 4 + 16

  for (let i = 0; i < facts.length; i++) {
    const [k, v] = facts[i]
    const col = i % 2
    const x0 = JPG_MARGIN + col * (factColW + FACT_COL_GAP)
    ctx.font = F_FACT_K
    ctx.fillStyle = MUTED_COLOR
    ctx.fillText(k, x0, y + 22)
    // Value is right-aligned in the SAME column the label occupies — its available width
    // is what's left after the label + a gap, not the whole column (a value that merely
    // "fits the column" can still be wide enough to overlap the label it sits next to).
    const labelW = ctx.measureText(k).width
    const valueMaxW = Math.max(60, factColW - labelW - 16)
    ctx.font = fittedFactValueFont(ctx, v, valueMaxW)
    ctx.fillStyle = TEXT_COLOR
    ctx.textAlign = 'right'
    ctx.fillText(v, x0 + factColW, y + 22)
    ctx.textAlign = 'left'
    if (col === 1 || i === facts.length - 1) y += FACT_LH
  }
  y += 12

  for (const sec of sections) {
    // Window band: label ("ย้อนหลัง 1 ปี") + verdict on a tinted strip.
    y += WINDOW_HEAD_LH
    ctx.fillStyle = '#EEF3F6'
    ctx.fillRect(JPG_MARGIN, y - WINDOW_HEAD_LH + 6, JPG_CONTENT_W, WINDOW_HEAD_LH - 6)
    ctx.font = F_SERIES_HEAD
    ctx.fillStyle = accent
    ctx.fillText(`ย้อนหลัง ${windowLabel(sec.windowMonths)}`, JPG_MARGIN + 12, y - 10)
    ctx.font = F_SERIES_SUB
    ctx.fillStyle = MUTED_COLOR
    ctx.textAlign = 'right'
    ctx.fillText(sec.verdictText, JPG_MARGIN + JPG_CONTENT_W - 12, y - 11)
    ctx.textAlign = 'left'

    if (sec.error) {
      ctx.font = F_SUMMARY
      ctx.fillStyle = '#854F0B'
      y += SUMMARY_LH
      ctx.fillText(`โหลดกราฟไม่ได้: ${sec.error}`, JPG_MARGIN, y - 8)
    }
    for (const { ser, canvas: chartCanvas } of sec.charts) {
      ctx.font = F_SERIES_HEAD
      ctx.fillStyle = TEXT_COLOR
      y += SERIES_HEAD_LH
      ctx.fillText(ser.symbol, JPG_MARGIN, y - 8)
      const symbolW = ctx.measureText(ser.symbol).width
      ctx.font = F_SERIES_SUB
      ctx.fillStyle = MUTED_COLOR
      const subText = `initial ${ser.initialPrice?.toFixed(2) ?? '-'}`
      ctx.fillText(subText, JPG_MARGIN + symbolW + 14, y - 8)
      ctx.drawImage(chartCanvas, JPG_MARGIN, y, JPG_CONTENT_W, chartH)
      y += chartH + 16
    }
    y += 8
  }

  ctx.strokeStyle = '#E2E0D5'
  ctx.beginPath()
  ctx.moveTo(JPG_MARGIN, y)
  ctx.lineTo(JPG_MARGIN + JPG_CONTENT_W, y)
  ctx.stroke()
  y += 12
  ctx.font = F_FOOTER
  ctx.fillStyle = MUTED_COLOR
  for (const l of footerLines) {
    y += FOOTER_LH
    ctx.fillText(l, JPG_MARGIN, y - 6)
  }

  return { canvas, title }
}

function canvasToJpgBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
}

export async function downloadProductJpg(s: DetailProduct, windowMonths: number): Promise<void> {
  const { canvas, title } = await buildProductJpgCanvas(s, [{ windowMonths, backtest: s.backtest }])
  const blob = await canvasToJpgBlob(canvas)
  if (!blob) return
  downloadBlob(blob, `${title}-kiko.jpg`)
}

// Paginate the tall report canvas into an A4 PDF (jsPDF lazy-loaded — it's only needed
// for exports, so it stays out of the main bundle).
async function canvasToPdfBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  const { jsPDF } = await import('jspdf')
  const PAGE_W_MM = 210
  const PAGE_H_MM = 297
  const pageHpx = Math.floor(canvas.width * (PAGE_H_MM / PAGE_W_MM))
  const pages = Math.max(1, Math.ceil(canvas.height / pageHpx))
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  for (let i = 0; i < pages; i++) {
    if (i > 0) pdf.addPage()
    const sliceH = Math.min(pageHpx, canvas.height - i * pageHpx)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceH
    const ctx = slice.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, i * pageHpx, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
    pdf.addImage(slice.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, PAGE_W_MM, sliceH * (PAGE_W_MM / canvas.width))
  }
  return pdf.output('blob')
}

const safeName = (t: string) => t.replace(/[^\w.ก-๙-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 60) || 'product'

// Every product report shows all three standard backtest windows stacked.
export const EXPORT_WINDOWS = [6, 12, 24]

// Backtest one product across all EXPORT_WINDOWS. Prices are cached from the scoring pass,
// so the extra windows are CPU-only (no extra network) — but each needs its own detail
// series since candles are cropped per window.
async function windowsFor(product: DetailProduct['product']): Promise<WindowResult[]> {
  const out: WindowResult[] = []
  for (const windowMonths of EXPORT_WINDOWS) {
    out.push({ windowMonths, backtest: await backtestDetail(product, windowMonths) })
  }
  return out
}

// One-click batch export, one folder per product:
//   summary.csv
//   01-<product>/<product>.pdf + .jpg + -factsheet-th/en.html
// Each product report stacks all three windows (6M / 1Y / 2Y). Factsheets are included
// only when the real-data mapper succeeds — the illustrative fallback template must never
// land in a client-bound zip unnoticed.
function batchStamp(): string {
  const d = new Date()
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
}

// Build the batch ZIP as a Blob (shared by the download button and the email flow).
export async function buildBatchZipBlob(
  list: DetailProduct[],
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const [{ default: JSZip }, { renderFactsheet }] = await Promise.all([
    import('jszip'),
    import('../factsheet/adapter'), // lazy — pulls the 145kB render engine only for exports
  ])
  const zip = new JSZip()
  const ordered = orderForExport(list)
  zip.file('summary.csv', csvText(ordered))
  let done = 0
  for (const s of ordered) {
    onProgress?.(done, ordered.length)
    const windows = await windowsFor(s.product)
    const { canvas, title } = await buildProductJpgCanvas(s, windows)
    const name = safeName(title)
    const folder = zip.folder(`${String(done + 1).padStart(2, '0')}-${name}`)!
    const jpg = await canvasToJpgBlob(canvas)
    if (jpg) folder.file(`${name}.jpg`, jpg)
    folder.file(`${name}.pdf`, await canvasToPdfBlob(canvas))

    // Factsheet with Spot = latest close per underlying (same data the dashboard button
    // passes to the factsheet screen). No notional in batch mode — no shares column.
    // Any window's series carries the same latest closes; use the longest (last) window.
    const spots: Record<string, number> = {}
    let lastTime = 0
    for (const ser of windows[windows.length - 1].backtest.series) {
      if (ser.currentPrice != null) spots[ser.symbol] = ser.currentPrice
      const t = ser.candles[ser.candles.length - 1]?.time
      if (t && t > lastTime) lastTime = t
    }
    const spotAsOf = lastTime ? new Date(lastTime * 1000).toISOString().slice(0, 10) : null
    for (const lang of ['th', 'en'] as const) {
      const fs = renderFactsheet(s.product, lang, undefined, null, spots, spotAsOf)
      if (fs.real) folder.file(`${name}-factsheet-${lang}.html`, fs.html)
    }
    done++
    onProgress?.(done, ordered.length)
  }
  return zip.generateAsync({ type: 'blob' })
}

export async function exportBatchZip(
  list: DetailProduct[],
  onProgress?: (done: number, total: number) => void,
): Promise<void> {
  const blob = await buildBatchZipBlob(list, onProgress)
  downloadBlob(blob, `SN-Desk-batch-${batchStamp()}.zip`)
}

// ── Ranking screenshots ──────────────────────────────────────────────────────
// One image per backtest window, each stacking the three risk-profile ranking tables
// (Aggressive / Balanced / Save). Built by rendering the tables off-screen with the SAME
// global CSS classes the live dashboard uses (.table-wrap / .rank-chip / .badge) and
// snapshotting with html2canvas, so the picture matches the on-screen look.

/** One window's already-backtested KIKO items — the caller runs backtestScore per window. */
export interface WindowItems {
  windowMonths: number
  items: { product: NoteProduct; backtest: BacktestResult }[]
}

const RANK_PROFILES = ['aggressive', 'balanced', 'save'] as const
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const pctOr = (v: number | null) => (v == null ? '-' : `${v}%`)

function rankRowsHtml(group: ScoredProduct[], accent: string): string {
  if (!group.length) return `<div style="font-size:13px;color:var(--c-muted);padding:8px 12px">— ไม่มีรายการ —</div>`
  const head = ['Rank', 'Product', 'Underlying', 'Coupon', 'KI / KO', 'Buffer', 'Vol', 'Tenor', 'Issuer', 'Score']
  const th = 'padding:10px 12px;font-size:12px;font-weight:600;color:var(--c-muted);text-align:left;white-space:nowrap'
  const td = 'padding:10px 12px;font-size:13px;color:var(--c-text);white-space:nowrap;border-top:1px solid var(--c-border)'
  const rows = group.map((s) => {
    const p = s.product
    const invx = p.invxPick ? ` <span class="badge invx" style="margin-left:6px">💎 INVX Pick</span>` : ''
    return `<tr>
      <td style="${td}"><span class="rank-chip${s.rank <= 3 ? ' top' : ''}">${String(s.rank).padStart(2, '0')}</span></td>
      <td style="${td};font-weight:600">${esc(p.productCode ?? p.sourceFile)}${invx}</td>
      <td style="${td}">${esc(p.underlyings.join(', ') || '-')}</td>
      <td style="${td};color:${accent};font-weight:600">${pctOr(p.couponPa)}</td>
      <td style="${td}">${p.kiPct ?? '–'} / ${p.koPct ?? '–'}</td>
      <td style="${td}">${s.backtest.bufferPct == null ? '-' : `${s.backtest.bufferPct}%`}</td>
      <td style="${td}">${s.backtest.volatilityPct == null ? '-' : `${s.backtest.volatilityPct}%`}</td>
      <td style="${td}">${esc(p.tenor ?? '-')}</td>
      <td style="${td}">${esc(p.issuer ?? '-')}</td>
      <td style="${td};font-weight:600">${s.score}</td>
    </tr>`
  }).join('')
  return `<div class="table-wrap"><table>
    <thead><tr>${head.map((h) => `<th style="${th}">${h}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody></table></div>`
}

export async function captureRankingImages(byWindow: WindowItems[]): Promise<{ windowMonths: number; blob: Blob }[]> {
  const html2canvas = (await import('html2canvas')).default
  const out: { windowMonths: number; blob: Blob }[] = []
  for (const w of byWindow) {
    let inner = `<div style="font:700 22px -apple-system,'Segoe UI',Tahoma,sans-serif;color:var(--c-text);margin-bottom:16px">KIKO Ranking — ย้อนหลัง ${windowLabel(w.windowMonths)}</div>`
    for (const profile of RANK_PROFILES) {
      const scored = scoreProducts(w.items, PROFILE_WEIGHTS[profile])
      const pass = scored.filter((s) => s.backtest.verdict === 'pass').sort((a, b) => a.rank - b.rank)
      const knocked = scored.filter((s) => s.backtest.verdict === 'knocked').sort((a, b) => a.rank - b.rank)
      inner += `<div style="margin:0 0 22px">
        <div style="font:600 15px -apple-system,'Segoe UI',Tahoma,sans-serif;color:var(--c-primary);margin-bottom:8px">${esc(PROFILE_LABELS[profile])}</div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px"><span class="badge pass">Historical Pass</span><span style="font-size:12px;color:var(--c-muted)">${pass.length} รายการ</span></div>
        ${rankRowsHtml(pass, 'var(--c-teal)')}
        <div style="display:flex;align-items:center;gap:8px;margin:12px 0 6px"><span class="badge knock">Historical Knocked</span><span style="font-size:12px;color:var(--c-muted)">${knocked.length} รายการ</span></div>
        ${rankRowsHtml(knocked, 'var(--c-coral)')}
      </div>`
    }
    const container = document.createElement('div')
    container.style.cssText = 'position:fixed;left:-99999px;top:0;width:1180px;box-sizing:border-box;padding:28px;background:#ffffff'
    container.innerHTML = inner
    document.body.appendChild(container)
    try {
      const canvas = await html2canvas(container, { scale: 2, backgroundColor: '#ffffff', logging: false })
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
      if (blob) out.push({ windowMonths: w.windowMonths, blob })
    } finally {
      container.remove()
    }
  }
  return out
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '')
    r.onerror = reject
    r.readAsDataURL(blob)
  })
}

export interface EmailAttachment { filename: string; blob: Blob }

// Auto-send for real via Classic Outlook COM (.Send). Irreversible — the caller confirms
// with the user first. Body is HTML here (COM accepts it, unlike the mailto draft path).
export async function sendEmailNow(
  recipients: string[],
  subject: string,
  bodyHtml: string,
  attachments: EmailAttachment[],
): Promise<{ recipients: string[]; attachments: number }> {
  const encoded = await Promise.all(
    attachments.map(async (a) => ({ filename: a.filename, base64: await blobToBase64(a.blob) })),
  )
  const res = await fetch('http://localhost:8000/api/email-send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipients, subject, body: bodyHtml, attachments: encoded }),
  })
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}))
    throw new Error(detail?.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export function rankingImageFilename(windowMonths: number): string {
  const tag = windowMonths === 6 ? '6M' : windowMonths === 12 ? '1Y' : windowMonths === 24 ? '2Y' : `${windowMonths}M`
  return `ranking-${tag}.png`
}

import { createChart, CandlestickSeries, LineStyle, ColorType, type AutoscaleInfoProvider } from 'lightweight-charts'
import { koTimesFor, levelsAndMarksFor } from './chartData'
import type { DetailProduct, ScoredProduct, UnderlyingSeries } from './types'
import { STRUCTURE_TYPE_LABELS } from './types'
import { LEVEL_COLORS, LEVEL_LABELS } from '../../types'
import type { DateMark, Level } from '../../types'
import { buildData, defaultVisibleRange, nearestAxisTime } from '../../components/CandleChart'

const COLUMNS = [
  'Group', 'Rank', 'Product', 'Underlying', 'Structure', 'Coupon(%p.a.)',
  'KI(%)', 'KO(%)', 'Buffer(%)', 'Vol(%)', 'Tenor', 'Issuer', 'Score',
]

function rowsOf(scored: ScoredProduct[]): (string | number)[][] {
  const line = (s: ScoredProduct): (string | number)[] => [
    s.backtest.verdict === 'pass' ? 'Historical Pass' : 'Historical Knocked',
    s.rank,
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
    s.score,
  ]
  const pass = scored.filter((s) => s.backtest.verdict === 'pass').sort((a, b) => a.rank - b.rank)
  const knocked = scored.filter((s) => s.backtest.verdict === 'knocked').sort((a, b) => a.rank - b.rank)
  return [...pass, ...knocked].map(line)
}

// Download a CSV (UTF-8 BOM so Excel reads Thai correctly).
export function exportCsv(scored: ScoredProduct[]): void {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = [COLUMNS, ...rowsOf(scored)].map((r) => r.map(esc).join(','))
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'kiko-backtest-summary.csv'
  a.click()
  URL.revokeObjectURL(url)
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
    layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#27261F' },
    grid: {
      vertLines: { color: 'rgba(128,128,128,0.15)', style: LineStyle.Dashed },
      horzLines: { color: 'rgba(128,128,128,0.15)', style: LineStyle.Dashed },
    },
    rightPriceScale: { scaleMargins: { top: 0.08, bottom: 0.08 } },
    timeScale: { rightOffset: 8 },
  })
  const series = chart.addSeries(CandlestickSeries)
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
    ctx.font = `${11 * scaleY}px -apple-system, "Segoe UI", sans-serif`
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
      const ty = (6 + (i % 4) * 14) * scaleY + 10 * scaleY
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
  const bt = s.backtest
  return [
    ['หุ้นอ้างอิง', p.underlyings.join(', ') || '-'],
    ['ประเภทโครงสร้าง', STRUCTURE_TYPE_LABELS[p.structureType]],
    ['Strike', fmt(p.strikePct)],
    ['Knock-In / Knock-Out', `${p.kiPct ?? '–'} / ${p.koPct ?? '–'}`],
    ['KO observation', p.koType == null ? '-' : p.koType === 'memory' ? 'Memory' : 'Final Valuation'],
    ['Coupon (p.a.)', fmt(p.couponPa)],
    ['Tenor', p.tenor ?? '-'],
    ['Issuer', p.issuer ?? '-'],
    ['Buffer จาก KI', bt.bufferPct == null ? '-' : `${bt.bufferPct}%`],
    ['Volatility (ต่อปี)', bt.volatilityPct == null ? '-' : `${bt.volatilityPct}%`],
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
            const hitBadge = ser.knockedIn ? `<span class="badge-hit">⚠ เคยชน KI</span>` : ''
            return `
              <div class="series">
                <div class="series-head">
                  <b>${ser.symbol}</b>
                  <span class="muted">initial ${ser.initialPrice?.toFixed(2) ?? '-'} • ปัจจุบัน ${ser.currentPrice?.toFixed(2) ?? '-'}</span>
                  ${hitBadge}
                </div>
                <img src="${img}" width="100%" />
              </div>`
          }),
        )
      ).join('')

  const facts = factsFor(s)
  const factsHtml = facts.map(([k, v]) => `<div class="fact"><span class="fact-k">${k}</span><span class="fact-v">${v}</span></div>`).join('')

  // Non-KIKO products carry no rank/score (only KIKO is ranked).
  const medal = s.rank == null ? '–' : s.rank <= 3 ? ['🥇', '🥈', '🥉'][s.rank - 1] : String(s.rank)

  return `
    <section class="card">
      <div class="card-head" style="border-left-color:${accent}">
        <div class="card-title">
          <span class="medal">${medal}</span>
          <b>${p.productCode ?? p.sourceFile}</b>
          ${s.score == null ? '' : `<span class="score" style="color:${accent}">คะแนน ${s.score}</span>`}
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
    .medal{font-size:15px;color:#6B6A63}
    .score{margin-left:auto;font-weight:700;font-size:15px}
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
    .badge-hit{color:#993C1D;background:#FAECE7;border:1px solid #F0997B;border-radius:6px;padding:2px 8px;font-size:12.5px}
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
const F_FACT_V = `bold 21px ${FONT_STACK}`
const F_SERIES_HEAD = `bold 23px ${FONT_STACK}`
const F_SERIES_SUB = `19px ${FONT_STACK}`
const F_FOOTER = `16px ${FONT_STACK}`

// Build a single tall JPG (product header + facts + every underlying's chart), sized for
// reading full-screen on a phone, then download it — same content as the PDF report but as
// one shareable image instead of a multi-file print job.
export async function downloadProductJpg(s: DetailProduct, windowMonths: number): Promise<void> {
  const p = s.product
  const bt = s.backtest
  const koTimes = koTimesFor(p)
  const title = p.productCode ?? p.sourceFile
  const accent = bt.verdict === 'pass' ? '#0F6E56' : '#993C1D'
  const facts = factsFor(s)
  const chartH = Math.round(JPG_CONTENT_W * (CHART_H / CHART_W))

  const seriesData = bt.error
    ? []
    : await Promise.all(
        bt.series.map(async (ser) => {
          const { levels, marks } = levelsAndMarksFor(ser, koTimes)
          const canvas = await renderSeriesCanvas(ser.candles, levels, marks, JPG_CONTENT_W, chartH)
          return { ser, canvas }
        }),
      )

  const meas = document.createElement('canvas').getContext('2d')!

  const subtitle = `แบ็คเทสต์ย้อนหลัง ${windowMonths} เดือน • ${s.score == null ? 'ไม่จัดอันดับ (non-KIKO)' : `คะแนน ${s.score}`} • สร้างเมื่อ ${new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}`
  meas.font = F_TITLE
  const titleLines = wrapText(meas, title, JPG_CONTENT_W)
  meas.font = F_SUB
  const subLines = wrapText(meas, subtitle, JPG_CONTENT_W)
  meas.font = F_SUMMARY
  const summaryLines = p.summary ? wrapText(meas, p.summary, JPG_CONTENT_W) : []
  const errorLines = bt.error ? wrapText(meas, `โหลดกราฟไม่ได้: ${bt.error}`, JPG_CONTENT_W) : []
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
  const SERIES_HEAD_LH = 32
  const FOOTER_LH = 24

  let h = JPG_MARGIN
  h += titleLines.length * TITLE_LH + 8
  h += subLines.length * SUB_LH + 16
  h += summaryLines.length * SUMMARY_LH + (summaryLines.length ? 16 : 0)
  h += 6 // accent rule
  h += facts.length * FACT_LH + 20
  h += errorLines.length * SUMMARY_LH
  for (const { ser } of seriesData) {
    void ser
    h += SERIES_HEAD_LH + chartH + 24
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
  y += 8
  ctx.font = F_SUB
  ctx.fillStyle = MUTED_COLOR
  for (const l of subLines) {
    y += SUB_LH
    ctx.fillText(l, JPG_MARGIN, y - 8)
  }
  y += 16
  if (summaryLines.length) {
    ctx.font = F_SUMMARY
    ctx.fillStyle = TEXT_COLOR
    for (const l of summaryLines) {
      y += SUMMARY_LH
      ctx.fillText(l, JPG_MARGIN, y - 8)
    }
    y += 16
  }

  ctx.fillStyle = accent
  ctx.fillRect(JPG_MARGIN, y, JPG_CONTENT_W, 4)
  y += 6 + 20

  for (const [k, v] of facts) {
    ctx.font = F_FACT_K
    ctx.fillStyle = MUTED_COLOR
    ctx.fillText(k, JPG_MARGIN, y + 22)
    ctx.font = F_FACT_V
    ctx.fillStyle = TEXT_COLOR
    ctx.textAlign = 'right'
    ctx.fillText(v, JPG_MARGIN + JPG_CONTENT_W, y + 22)
    ctx.textAlign = 'left'
    y += FACT_LH
  }
  y += 20

  if (errorLines.length) {
    ctx.font = F_SUMMARY
    ctx.fillStyle = '#854F0B'
    for (const l of errorLines) {
      y += SUMMARY_LH
      ctx.fillText(l, JPG_MARGIN, y - 8)
    }
  }

  for (const { ser, canvas: chartCanvas } of seriesData) {
    ctx.font = F_SERIES_HEAD
    ctx.fillStyle = TEXT_COLOR
    y += SERIES_HEAD_LH
    ctx.fillText(ser.symbol, JPG_MARGIN, y - 8)
    ctx.font = F_SERIES_SUB
    ctx.fillStyle = MUTED_COLOR
    const subText = `initial ${ser.initialPrice?.toFixed(2) ?? '-'} • ปัจจุบัน ${ser.currentPrice?.toFixed(2) ?? '-'}${ser.knockedIn ? ' • ⚠ เคยชน KI' : ''}`
    ctx.fillText(subText, JPG_MARGIN + meas.measureText(ser.symbol).width + 16, y - 8)
    ctx.drawImage(chartCanvas, JPG_MARGIN, y, JPG_CONTENT_W, chartH)
    y += chartH + 24
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

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}-kiko.jpg`
  a.click()
  URL.revokeObjectURL(url)
}

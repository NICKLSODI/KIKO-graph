import { createChart, CandlestickSeries, LineStyle, ColorType, type AutoscaleInfoProvider } from 'lightweight-charts'
import { koTimesFor, levelsAndMarksFor } from './chartData'
import type { ScoredProduct, UnderlyingSeries } from './types'
import { LEVEL_COLORS, LEVEL_LABELS } from '../../types'
import type { DateMark, Level } from '../../types'

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
    s.product.structureType,
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
// a PNG data URL so it can be embedded directly in the printed/PDF report.
async function renderSeriesImage(candles: UnderlyingSeries['candles'], levels: Level[], marks: DateMark[]): Promise<string> {
  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-99999px'
  container.style.top = '0px'
  container.style.width = `${CHART_W}px`
  container.style.height = `${CHART_H}px`
  document.body.appendChild(container)

  const chart = createChart(container, {
    width: CHART_W,
    height: CHART_H,
    layout: { background: { type: ColorType.Solid, color: '#ffffff' }, textColor: '#27261F' },
    grid: {
      vertLines: { color: 'rgba(128,128,128,0.15)', style: LineStyle.Dashed },
      horzLines: { color: 'rgba(128,128,128,0.15)', style: LineStyle.Dashed },
    },
    rightPriceScale: { scaleMargins: { top: 0.08, bottom: 0.08 } },
    timeScale: { rightOffset: 8 },
  })
  const series = chart.addSeries(CandlestickSeries)
  series.setData(candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })) as never)

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
  chart.timeScale().fitContent()

  // Let the canvas actually paint before snapshotting (createChart/setData draw async).
  await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())))

  const canvas = chart.takeScreenshot()
  // Date marks (fixing date, KO observations) are our own overlay in the live chart, not
  // part of the library's own canvas — draw them onto the snapshot by hand so the exported
  // image still shows them.
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const scaleX = canvas.width / CHART_W
    const scaleY = canvas.height / CHART_H
    const timeScale = chart.timeScale()
    ctx.font = `${11 * scaleY}px -apple-system, "Segoe UI", sans-serif`
    marks.forEach((mark, i) => {
      const x = timeScale.timeToCoordinate(mark.time as never)
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
  const dataUrl = canvas.toDataURL('image/png')

  chart.remove()
  container.remove()
  return dataUrl
}

function fmt(v: number | null, suffix = '%'): string {
  return v == null ? '-' : `${v}${suffix}`
}

async function productCardHtml(s: ScoredProduct, accent: string): Promise<string> {
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

  const facts: [string, string][] = [
    ['หุ้นอ้างอิง', p.underlyings.join(', ') || '-'],
    ['ประเภทโครงสร้าง', p.structureType],
    ['Strike', fmt(p.strikePct)],
    ['Knock-In / Knock-Out', `${p.kiPct ?? '–'} / ${p.koPct ?? '–'}`],
    ['KO observation', p.koType == null ? '-' : p.koType === 'memory' ? 'Memory' : 'Final Valuation'],
    ['Coupon (p.a.)', fmt(p.couponPa)],
    ['Tenor', p.tenor ?? '-'],
    ['Issuer', p.issuer ?? '-'],
    ['Buffer จาก KI', bt.bufferPct == null ? '-' : `${bt.bufferPct}%`],
    ['Volatility (ต่อปี)', bt.volatilityPct == null ? '-' : `${bt.volatilityPct}%`],
  ]
  const factsHtml = facts.map(([k, v]) => `<div class="fact"><span class="fact-k">${k}</span><span class="fact-v">${v}</span></div>`).join('')

  const medal = s.rank <= 3 ? ['🥇', '🥈', '🥉'][s.rank - 1] : String(s.rank)

  return `
    <section class="card">
      <div class="card-head" style="border-left-color:${accent}">
        <div class="card-title">
          <span class="medal">${medal}</span>
          <b>${p.productCode ?? p.sourceFile}</b>
          <span class="score" style="color:${accent}">คะแนน ${s.score}</span>
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
export async function printProductReport(s: ScoredProduct, windowMonths: number): Promise<void> {
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

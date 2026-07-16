import { useEffect, useRef } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type AutoscaleInfoProvider,
  ColorType,
  LineStyle,
  CandlestickSeries,
  LineSeries,
} from 'lightweight-charts'
import type { Candle, DateMark, Level } from '../types'
import { LEVEL_COLORS, LEVEL_LABELS } from '../types'
import { chartColors, THEME_EVENT } from '../theme'

interface Props {
  candles: Candle[]
  levels: Level[]
  dateMarks: DateMark[]
  showEma50?: boolean
  showEma200?: boolean
}

const CHART_HEIGHT = 600
export const DAY = 86400
// Fixed history window (not a % of each ticker's own span) so bar width/scale looks
// the same across every chart instead of shrinking on tickers with longer history.
export const DEFAULT_HISTORY_DAYS = 500

// Snap a mark's real date to the nearest axis time (a candle or whitespace point).
// lightweight-charts' timeToCoordinate returns null for any time that isn't an exact
// data point, so both the live chart and the PDF/JPG export must snap first or the
// mark line silently fails to draw. Drops marks that fall > 3 days from any axis
// point (e.g. an observation date older than the fetched history) instead of piling
// them onto candle #1.
export function nearestAxisTime(target: number, axisTimes: number[]): number | null {
  let nearest: number | null = null
  for (const t of axisTimes) {
    if (nearest == null || Math.abs(t - target) < Math.abs(nearest - target)) nearest = t
  }
  if (nearest != null && Math.abs(nearest - target) > DAY * 3) return null
  return nearest
}

// Same default view for the live chart and the PDF/JPG export renderer: last
// DEFAULT_HISTORY_DAYS of real candles, extended right past the furthest mark.
export function defaultVisibleRange(times: number[], candles: Candle[]): { from: number; to: number } | null {
  const firstTime = times[0]
  const lastTime = times[times.length - 1]
  const lastCandleTime = candles[candles.length - 1]?.time
  if (firstTime == null || lastTime == null || lastCandleTime == null || lastTime <= firstTime) return null
  return { from: Math.max(firstTime, lastCandleTime - DAY * DEFAULT_HISTORY_DAYS), to: lastTime + DAY * 12 }
}
const EMA50_COLOR = '#F2A950'
const EMA200_COLOR = '#7B6CE0'

// Standard EMA: seed with the period's SMA, then smooth forward. Returns null for the
// warm-up bars (not enough history yet) so the line only starts once it's meaningful.
function computeEma(candles: Candle[], period: number): { time: number; value: number }[] {
  if (candles.length < period) return []
  const k = 2 / (period + 1)
  const seed = candles.slice(0, period).reduce((sum, c) => sum + c.close, 0) / period
  const out: { time: number; value: number }[] = [{ time: candles[period - 1].time, value: seed }]
  let prev = seed
  for (let i = period; i < candles.length; i++) {
    const next = candles[i].close * k + prev * (1 - k)
    out.push({ time: candles[i].time, value: next })
    prev = next
  }
  return out
}

// Build the series data + axis times. Date marks that fall beyond the fetched price
// history (future KO observation dates) get whitespace points appended, so the axis
// extends to fit them and each mark lands on an exact axis time.
// Exported so the PDF/JPG export renderer builds the exact same axis (whitespace +
// default zoom) as the live chart instead of a plain fitContent() with marks missing.
export function buildData(candles: Candle[], marks: DateMark[]): { data: unknown[]; times: number[] } {
  const data: unknown[] = candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
  const times: number[] = candles.map((c) => c.time)
  const last = times[times.length - 1]
  if (last != null) {
    const maxMarkTime = Math.max(last, ...marks.map((m) => m.time))
    // lightweight-charts spaces bars by INDEX, not by elapsed time — appending only one
    // whitespace point per future mark (old behaviour) squashed month-apart KO observation
    // dates onto adjacent bar slots. Filling every calendar day out to the furthest mark
    // makes each day one index step, so the real time gaps read correctly on the axis.
    for (let t = last + DAY; t <= maxMarkTime; t += DAY) {
      data.push({ time: t }) // whitespace — extends the axis without drawing a bar
      times.push(t)
    }
  }
  return { data, times }
}

export function CandleChart({ candles, levels, dateMarks, showEma50 = false, showEma200 = false }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const ema50Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const ema200Ref = useRef<ISeriesApi<'Line'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const levelsRef = useRef(levels)
  levelsRef.current = levels
  const markElsRef = useRef<Record<string, HTMLDivElement | null>>({})

  // The default autoscale only looks at candle OHLC values, so a price line (Strike/KI/KO)
  // far outside the visible candle range would be drawn off-screen. Extend the price range
  // to always include every level so the lines stay visible.
  const autoscaleWithLevels: AutoscaleInfoProvider = (original) => {
    const res = original()
    const prices = levelsRef.current.map((l) => l.price)
    if (!res || !res.priceRange || prices.length === 0) return res
    return {
      ...res,
      priceRange: {
        minValue: Math.min(res.priceRange.minValue, ...prices),
        maxValue: Math.max(res.priceRange.maxValue, ...prices),
      },
    }
  }

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      width: container.clientWidth,
      height: CHART_HEIGHT,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: chartColors().text,
      },
      grid: {
        vertLines: { color: 'rgba(128,128,128,0.15)', style: LineStyle.Dashed },
        horzLines: { color: 'rgba(128,128,128,0.15)', style: LineStyle.Dashed },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
      // Reserve empty space past the last bar so a date mark that lands right at/near
      // the data's edge (e.g. a KO observation date just after the last candle) still
      // has room for its line + label instead of hugging the chart's hard right border.
      timeScale: {
        rightOffset: 12,
      },
    })
    const series = chart.addSeries(CandlestickSeries)
    series.applyOptions({ autoscaleInfoProvider: autoscaleWithLevels })

    const ema50 = chart.addSeries(LineSeries, { color: EMA50_COLOR, lineWidth: 2, visible: false, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    const ema200 = chart.addSeries(LineSeries, { color: EMA200_COLOR, lineWidth: 2, visible: false, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })

    chartRef.current = chart
    seriesRef.current = series
    ema50Ref.current = ema50
    ema200Ref.current = ema200

    // Logical-range fires on every pan/zoom frame (including whitespace-only shifts),
    // so mark lines track the candles with no lag while dragging.
    chart.timeScale().subscribeVisibleLogicalRangeChange(() => updateMarkPositions())

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth })
      updateMarkPositions()
    })
    resizeObserver.observe(container)

    // Canvas colors can't use CSS variables — re-resolve them when the theme flips.
    const onThemeChange = () => chart.applyOptions({ layout: { textColor: chartColors().text } })
    window.addEventListener(THEME_EVENT, onThemeChange)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener(THEME_EVENT, onThemeChange)
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep refs to the latest props + axis times so the once-only chart effect can read them.
  const dateMarksRef = useRef(dateMarks)
  dateMarksRef.current = dateMarks
  const axisTimesRef = useRef<number[]>([])

  // Position mark lines by writing styles directly to the DOM (no React state):
  // pan/zoom events fire per frame, and a setState round-trip lags a frame behind
  // the canvas — the lines would visibly float off the candles while dragging.
  function updateMarkPositions() {
    const chart = chartRef.current
    if (!chart) return
    const timeScale = chart.timeScale()
    // timeToCoordinate is relative to the pane, which excludes the right price scale —
    // clip to the pane so lines never overlap the axis strip or bleed past the left edge.
    const paneWidth = timeScale.width()
    for (const mark of dateMarksRef.current) {
      const el = markElsRef.current[mark.id]
      if (!el) continue
      const snapped = nearestAxisTime(mark.time, axisTimesRef.current)
      const x = snapped == null ? null : timeScale.timeToCoordinate(snapped as never)
      if (x == null || x < 0 || x > paneWidth) {
        el.style.display = 'none'
        continue
      }
      el.style.display = ''
      el.style.left = `${x}px`
      // Flip the label leftward when the line sits near the pane's right edge so the
      // text doesn't run over the price scale.
      const label = el.lastElementChild as HTMLElement | null
      if (label) label.style.transform = x > paneWidth - 140 ? 'translateX(calc(-100% - 4px))' : 'translateX(4px)'
    }
  }

  // Rebuild data (with future whitespace) whenever candles or marks change.
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    const { data, times } = buildData(candles, dateMarks)
    axisTimesRef.current = times
    series.setData(data as never)
    const chart = chartRef.current
    // Time-based (not fitContent + logical-range chaining) so the right bound always
    // covers the true last mark plus margin — fitContent's own "to" was landing right
    // on the last mark with no breathing room, hiding it behind the price-scale edge.
    const range = defaultVisibleRange(times, candles)
    if (range) chart?.timeScale().setVisibleRange({ from: range.from as never, to: range.to as never })
    else chart?.timeScale().fitContent()
    updateMarkPositions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, dateMarks])

  // EMA lines: recompute whenever candles change, and flip visibility on toggle without
  // recomputing (cheap either way, but keeps the two concerns separate).
  useEffect(() => {
    const ema50 = ema50Ref.current
    const ema200 = ema200Ref.current
    if (!ema50 || !ema200) return
    ema50.setData(computeEma(candles, 50) as never)
    ema200.setData(computeEma(candles, 200) as never)
    ema50.applyOptions({ visible: showEma50 })
    ema200.applyOptions({ visible: showEma200 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, showEma50, showEma200])

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return

    priceLinesRef.current.forEach((line) => series.removePriceLine(line))
    priceLinesRef.current = levels.map((level) =>
      series.createPriceLine({
        price: level.price,
        color: LEVEL_COLORS[level.kind],
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: level.label || LEVEL_LABELS[level.kind],
      }),
    )
    // Re-apply to force the chart to recompute the (now level-aware) visible price range.
    series.applyOptions({ autoscaleInfoProvider: autoscaleWithLevels })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [levels])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} />
      {/* overflow:hidden is the hard backstop — even a mid-drag frame can't paint a line
          or label outside the chart area */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', height: CHART_HEIGHT, overflow: 'hidden' }}>
        {dateMarks.map((mark, i) => (
          <div
            key={mark.id}
            ref={(el) => { markElsRef.current[mark.id] = el }}
            style={{ position: 'absolute', top: 0, bottom: 0, display: 'none' }}
          >
            <div style={{ width: 1, height: '100%', background: 'var(--c-mark)' }} />
            <div
              style={{
                position: 'absolute',
                top: 4 + (i % 4) * 16, // stagger so close labels don't overlap
                fontSize: 11,
                color: 'var(--c-mark-text)',
                whiteSpace: 'nowrap',
                transform: 'translateX(4px)',
              }}
            >
              {mark.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

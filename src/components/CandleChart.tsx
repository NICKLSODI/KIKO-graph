import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type AutoscaleInfoProvider,
  ColorType,
  LineStyle,
  CandlestickSeries,
} from 'lightweight-charts'
import type { Candle, DateMark, Level } from '../types'
import { LEVEL_COLORS, LEVEL_LABELS } from '../types'

interface Props {
  candles: Candle[]
  levels: Level[]
  dateMarks: DateMark[]
}

const CHART_HEIGHT = 600
const DAY = 86400

// Build the series data + axis times. The axis ends at the last real candle: date marks
// that fall beyond the fetched price history (e.g. future KO observation dates) are simply
// not shown, rather than extending the axis into empty future space to fit them.
function buildData(candles: Candle[]): { data: unknown[]; times: number[] } {
  const data: unknown[] = candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close }))
  const times: number[] = candles.map((c) => c.time)
  return { data, times }
}

export function CandleChart({ candles, levels, dateMarks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const levelsRef = useRef(levels)
  levelsRef.current = levels
  const [markPositions, setMarkPositions] = useState<Record<string, number | null>>({})

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
        textColor: '#6B6A63',
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

    chartRef.current = chart
    seriesRef.current = series

    chart.timeScale().subscribeVisibleTimeRangeChange(() => updateMarkPositions())

    const resizeObserver = new ResizeObserver(() => {
      chart.applyOptions({ width: container.clientWidth })
      updateMarkPositions()
    })
    resizeObserver.observe(container)

    return () => {
      resizeObserver.disconnect()
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

  function nearestAxisTime(target: number): number | null {
    let nearest: number | null = null
    for (const t of axisTimesRef.current) {
      if (nearest == null || Math.abs(t - target) < Math.abs(nearest - target)) nearest = t
    }
    // A mark whose real date falls well before the fetched price history even starts (e.g. an
    // observation date older than the available candles) would otherwise snap onto candle #1 —
    // piling multiple unrelated dates' labels on top of each other. Drop it instead of mis-placing it.
    if (nearest != null && Math.abs(nearest - target) > DAY * 3) return null
    return nearest
  }

  function updateMarkPositions() {
    const chart = chartRef.current
    if (!chart) return
    const timeScale = chart.timeScale()
    const next: Record<string, number | null> = {}
    for (const mark of dateMarksRef.current) {
      const snapped = nearestAxisTime(mark.time)
      next[mark.id] = snapped == null ? null : timeScale.timeToCoordinate(snapped as never)
    }
    setMarkPositions(next)
  }

  // Rebuild data (with future whitespace) whenever candles or marks change.
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return
    const { data, times } = buildData(candles)
    axisTimesRef.current = times
    series.setData(data as never)
    chartRef.current?.timeScale().fitContent()
    updateMarkPositions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, dateMarks])

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
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', height: CHART_HEIGHT }}>
        {dateMarks.map((mark, i) => {
          const x = markPositions[mark.id]
          if (x == null) return null
          // Marks near the right edge (common: freshly-issued notes put the fixing date near
          // "now") would otherwise run their label text off the chart — flip the anchor so
          // the label grows leftward from the line instead of spilling past the edge.
          const containerWidth = containerRef.current?.clientWidth ?? 0
          const nearRightEdge = containerWidth > 0 && x > containerWidth - 140
          return (
            <div key={mark.id} style={{ position: 'absolute', left: x, top: 0, bottom: 0 }}>
              <div style={{ width: 1, height: '100%', background: '#EDA100', opacity: 0.85 }} />
              <div
                style={{
                  position: 'absolute',
                  top: 4 + (i % 4) * 16, // stagger so close labels don't overlap
                  fontSize: 11,
                  color: '#B07800',
                  whiteSpace: 'nowrap',
                  transform: nearRightEdge ? 'translateX(calc(-100% - 4px))' : 'translateX(4px)',
                }}
              >
                {mark.label}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

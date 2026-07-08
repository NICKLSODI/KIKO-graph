import { useEffect, useRef, useState } from 'react'
import {
  createChart,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
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

export function CandleChart({ candles, levels, dateMarks }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const priceLinesRef = useRef<IPriceLine[]>([])
  const [markPositions, setMarkPositions] = useState<Record<string, number | null>>({})

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      width: container.clientWidth,
      height: CHART_HEIGHT,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#c8c8c8',
      },
      grid: {
        vertLines: { color: 'rgba(128,128,128,0.2)', style: LineStyle.Dashed },
        horzLines: { color: 'rgba(128,128,128,0.2)', style: LineStyle.Dashed },
      },
      rightPriceScale: {
        scaleMargins: { top: 0.05, bottom: 0.05 },
      },
    })
    const series = chart.addSeries(CandlestickSeries)

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

  // keep refs to the latest props so the chart-creation effect (which only runs once)
  // can read current values without needing to be re-subscribed
  const dateMarksRef = useRef(dateMarks)
  dateMarksRef.current = dateMarks
  const candlesRef = useRef(candles)
  candlesRef.current = candles

  function nearestCandleTime(target: number): number | null {
    let nearest: Candle | null = null
    for (const c of candlesRef.current) {
      if (!nearest || Math.abs(c.time - target) < Math.abs(nearest.time - target)) nearest = c
    }
    return nearest?.time ?? null
  }

  function updateMarkPositions() {
    const chart = chartRef.current
    if (!chart) return
    const timeScale = chart.timeScale()
    const next: Record<string, number | null> = {}
    for (const mark of dateMarksRef.current) {
      const snapped = nearestCandleTime(mark.time)
      next[mark.id] = snapped == null ? null : timeScale.timeToCoordinate(snapped as never)
    }
    setMarkPositions(next)
  }

  useEffect(() => {
    seriesRef.current?.setData(candles as never)
    chartRef.current?.timeScale().fitContent()
    updateMarkPositions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles])

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
  }, [levels])

  useEffect(() => {
    updateMarkPositions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateMarks])

  return (
    <div style={{ position: 'relative' }}>
      <div ref={containerRef} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', height: CHART_HEIGHT }}>
        {dateMarks.map((mark) => {
          const x = markPositions[mark.id]
          if (x == null) return null
          return (
            <div key={mark.id} style={{ position: 'absolute', left: x, top: 0, bottom: 0 }}>
              <div style={{ width: 1, height: '100%', background: '#EDA100', opacity: 0.8 }} />
              <div
                style={{
                  position: 'absolute',
                  top: 4,
                  left: 4,
                  fontSize: 11,
                  color: '#EDA100',
                  whiteSpace: 'nowrap',
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

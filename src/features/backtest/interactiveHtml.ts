// Self-contained INTERACTIVE report: ONE .html file the desk emails out. It opens on the
// ranking page (3 backtest windows × 3 risk profiles) and every row clicks through to that
// basket's own page — facts, warnings, and the same pan/zoom/crosshair candle charts as the
// live Detail tab. No server, no CDN, no network: the lightweight-charts standalone bundle is
// inlined as text (?raw) next to a JSON payload of the already-computed series, so the file
// works straight off file:// (and out of an email attachment).
//
// Everything that needs app logic (scoring, whitespace axis extension, default zoom, mark
// snapping, EMA) is computed HERE at export time and serialized. The inline bootstrap script
// only draws and routes — it holds no copy of the app's maths, so the two can't drift.
//
// Path is relative into node_modules on purpose: the package's `exports` map publishes only
// ".", so the bare specifier `lightweight-charts/dist/...` fails to resolve. The standalone
// (UMD) build is the one that defines window.LightweightCharts, which is what a plain
// <script> tag in the exported file needs — the ESM build the app imports would not work.
import chartLibSource from '../../../node_modules/lightweight-charts/dist/lightweight-charts.standalone.production.js?raw'
import { koTimesFor, levelsAndMarksFor } from './chartData'
import { DISCLAIMER, factsFor, warningsFor, windowLabel, type WindowItems } from './reportContent'
import { scoreProducts, PROFILE_WEIGHTS, PROFILE_LABELS } from './scoring'
import type { DetailProduct, ScoredProduct } from './types'
import { LEVEL_COLORS, LEVEL_LABELS } from '../../types'
import { buildData, defaultVisibleRange, nearestAxisTime, computeEma } from '../../components/CandleChart'

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Inlined into a <script> tag, so a literal "</script" or "<!--" in the data would end the
// block early. Escaping "<" as < is valid inside a JS string/JSON and kills both.
const jsonLiteral = (v: unknown): string => JSON.stringify(v).replace(/</g, '\\u003c')

const pctOr = (v: number | null): string => (v == null ? '-' : `${v}%`)

// ── Chart payloads ───────────────────────────────────────────────────────────

interface ChartPayload {
  symbol: string
  initialPrice: number | null
  currentPrice: number | null
  knockedIn: boolean
  /** Candles plus the daily whitespace points that extend the axis out to the last mark. */
  data: unknown[]
  ema50: { time: number; value: number }[]
  ema200: { time: number; value: number }[]
  levels: { price: number; color: string; title: string }[]
  /** Marks already snapped to an exact axis time; unsnappable ones are dropped here. */
  marks: { time: number; label: string }[]
  range: { from: number; to: number } | null
}

// Prices carry more decimals than anyone reads, and this payload is repeated for every
// underlying of every product in one file — rounding to 4dp cuts the JSON weight by roughly
// a third with no visible change on a chart whose axis labels show 2dp.
const r4 = (n: number): number => Math.round(n * 1e4) / 1e4

function chartPayloads(s: DetailProduct): ChartPayload[] {
  const p = s.product
  const koTimes = koTimesFor(p)
  return s.backtest.series.map((ser) => {
    const { levels, marks } = levelsAndMarksFor(ser, koTimes, { strikePct: p.strikePct, kiPct: p.kiPct, koPct: p.koPct })
    const { data, times } = buildData(ser.candles, marks)
    return {
      symbol: ser.symbol,
      initialPrice: ser.initialPrice,
      currentPrice: ser.currentPrice,
      knockedIn: ser.knockedIn,
      data: (data as Record<string, number>[]).map((d) =>
        d.open == null ? { time: d.time } : { time: d.time, open: r4(d.open), high: r4(d.high), low: r4(d.low), close: r4(d.close) },
      ),
      ema50: computeEma(ser.candles, 50).map((e) => ({ time: e.time, value: r4(e.value) })),
      ema200: computeEma(ser.candles, 200).map((e) => ({ time: e.time, value: r4(e.value) })),
      levels: levels.map((l) => ({ price: l.price, color: LEVEL_COLORS[l.kind], title: l.label || LEVEL_LABELS[l.kind] })),
      marks: marks
        .map((m) => ({ time: nearestAxisTime(m.time, times), label: m.label }))
        .filter((m): m is { time: number; label: string } => m.time != null),
      range: defaultVisibleRange(times, ser.candles),
    }
  })
}

// ── Static blocks ────────────────────────────────────────────────────────────

// Legend spells out the dashed price lines — the client has no app UI to hover for them.
const LEGEND_HTML = `<div class="legend">${(['strike', 'knock-in', 'knock-out'] as const)
  .map((k) => `<div><span class="line" style="border-color:${LEVEL_COLORS[k]}"></span>${esc(LEVEL_LABELS[k])}</div>`)
  .join('')}<div><span class="line solid"></span>วันสังเกตการณ์ / วันทำสัญญา</div></div>`

function factsHtml(s: DetailProduct): string {
  return `<div class="facts">${factsFor(s)
    .map(([k, v]) => `<div class="fact"><span class="fact-k">${esc(k)}</span><span class="fact-v">${esc(v)}</span></div>`)
    .join('')}</div>`
}

function warnHtml(s: DetailProduct): string {
  const warns = warningsFor(s)
  return warns.length ? `<div class="warn">${warns.map((w) => `<div>⚠ ${esc(w)}</div>`).join('')}</div>` : ''
}

const verdictText = (s: DetailProduct): string =>
  `${s.backtest.verdict === 'pass' ? 'Historical Pass — ไม่เคยชน KI' : 'Historical Knocked — เคยชน KI'}${s.backtest.knockedOut ? ' · KO (autocall)' : ''}`

const titleOf = (s: DetailProduct): string => s.product.productCode ?? s.product.sourceFile

// One basket's page: header, facts, warnings, chart toolbar, one chart per underlying.
// `index` scopes the DOM ids so many product views can coexist in the same document.
function productViewHtml(s: DetailProduct, payloads: ChartPayload[], index: number, withBack: boolean, chartWindowMonths: number): string {
  const p = s.product
  const chartsHtml = s.backtest.error
    ? `<div class="card err">โหลดกราฟไม่ได้: ${esc(s.backtest.error)}</div>`
    : payloads
        .map(
          (c, si) => `
      <section class="card">
        <div class="series-head">
          ${esc(c.symbol)}
          <span class="muted">initial ${c.initialPrice == null ? '-' : c.initialPrice.toFixed(2)}</span>
          <span class="muted">ปัจจุบัน ${c.currentPrice == null ? '-' : c.currentPrice.toFixed(2)}</span>
          ${c.knockedIn ? '<span class="badge knock">เคยชน KI</span>' : ''}
        </div>
        <div class="chart-box"><div id="chart-${index}-${si}"></div></div>
        ${LEGEND_HTML}
      </section>`,
        )
        .join('')

  const toolbar = payloads.length
    ? `<div class="card toolbar" data-p="${index}">
      <label><input type="checkbox" class="t-ema50" /><span class="swatch" style="background:#F2A950"></span>EMA 50</label>
      <label><input type="checkbox" class="t-ema200" /><span class="swatch" style="background:#7B6CE0"></span>EMA 200</label>
      <button type="button" class="t-reset">รีเซ็ตมุมมอง</button>
      <span class="hint">ลากเพื่อเลื่อน • สกรอลล์/หุบนิ้วเพื่อซูม • ชี้ค้างเพื่อดูราคาแต่ละวัน</span>
    </div>`
    : ''

  return `
    ${withBack ? '<a class="back" href="#/ranking">← กลับหน้าจัดอันดับ</a>' : ''}
    <h1>${p.invxPick ? '<span class="badge invx">💎 INVX Pick</span> ' : ''}${esc(titleOf(s))}</h1>
    <div class="sub">
      <span class="badge ${s.backtest.verdict === 'pass' ? 'pass' : 'knock'}">${esc(verdictText(s))}</span>
      <span>กราฟย้อนหลัง ${esc(windowLabel(chartWindowMonths))}</span>
    </div>
    ${p.summary ? `<div class="summary">${esc(p.summary)}</div>` : ''}
    <section class="card">${factsHtml(s)}</section>
    ${warnHtml(s)}
    ${toolbar}
    ${chartsHtml}`
}

// ── Ranking page ─────────────────────────────────────────────────────────────

// One header cell = one column = one sort key. Column order mirrors the live dashboard's
// ranking table (Rank … Issuer, Score last), so a reader who has seen the app finds the same
// numbers in the same places — KI and KO are separate columns there, and here too.
interface HeadCell {
  k: string
  text: string
}
const RANK_HEAD: HeadCell[] = [
  { k: 'rank', text: 'Rank' },
  { k: 'product', text: 'Product' },
  { k: 'underlying', text: 'Underlying' },
  { k: 'coupon', text: 'Coupon' },
  { k: 'strike', text: 'Strike' },
  { k: 'ki', text: 'KI' },
  { k: 'ko', text: 'KO' },
  { k: 'buffer', text: 'Buffer' },
  { k: 'vol', text: 'Vol' },
  { k: 'tenor', text: 'Tenor' },
  { k: 'issuer', text: 'Issuer' },
]
const SCORE_HEAD: HeadCell = { k: 'score', text: 'Score' }
const OTHERS_HEAD: HeadCell[] = [
  { k: 'product', text: 'Product' },
  { k: 'underlying', text: 'Underlying' },
  { k: 'coupon', text: 'Coupon' },
  { k: 'tenor', text: 'Tenor' },
  { k: 'issuer', text: 'Issuer' },
]

/**
 * `sortable: false` renders plain headers — used for the Aggressive / Safe views, where the
 * order IS the answer (rank by that profile's weights) and letting the reader re-sort would
 * quietly destroy it. `initialSort` marks the handle the rows already arrive ordered by, so
 * the arrow matches what's on screen before anything is clicked.
 */
function headHtml(cells: HeadCell[], initialSort: string | null, sortable: boolean): string {
  return `<thead><tr>${cells
    .map((c) =>
      sortable
        ? `<th><span class="sort${c.k === initialSort ? ' on' : ''}" data-k="${c.k}"${c.k === initialSort ? ' data-dir="asc"' : ''}>${c.text}</span></th>`
        : `<th>${c.text}</th>`,
    )
    .join('')}</tr></thead>`
}

// Sort values live on the row as data-* attributes: the client-side sorter reads these rather
// than parsing the rendered cells, so "12%" / "–" / "6M" stay display-only. An absent
// attribute means "no value" and always sorts last.
function sortAttrs(pairs: [string, string | number | null][]): string {
  return pairs
    .filter((kv): kv is [string, string | number] => kv[1] != null && kv[1] !== '')
    .map(([k, v]) => ` data-${k}="${esc(String(v))}"`)
    .join('')
}

// Colour cues carried over from the dashboard: a low Strike (deep discount) and a low KI
// (safer barrier) are the rows the desk wants to spot without reading every number.
const strikeClass = (v: number | null): string => (v != null && v <= 90 ? ' good' : '')
const kiClass = (v: number | null): string => (v != null && v < 60 ? ' good-cell' : '')

function rankTableHtml(
  group: ScoredProduct[],
  accent: string,
  linkFor: (productId: string) => string | null,
  opts: { sortable: boolean; withScore: boolean; initialSort: string | null },
): string {
  if (!group.length) return `<div class="empty">— ไม่มีรายการ —</div>`
  const rows = group
    .map((s) => {
      const p = s.product
      const href = linkFor(p.id)
      const name = esc(p.productCode ?? p.sourceFile)
      // The product cell is a real <a> (not just a click handler on the row) so the ranking
      // stays keyboard-navigable and the target is visible on hover.
      const cell = href ? `<a href="${href}">${name}</a>` : name
      const attrs = sortAttrs([
        ['rank', s.rank],
        ['product', p.productCode ?? p.sourceFile],
        ['underlying', p.underlyings.join(', ')],
        ['coupon', p.couponPa],
        ['strike', p.strikePct],
        ['ki', p.kiPct],
        ['ko', p.koPct],
        ['buffer', s.backtest.bufferPct],
        ['vol', s.backtest.volatilityPct],
        ['tenor', p.tenorMonths],
        ['issuer', p.issuer],
        ['score', s.score],
      ])
      return `<tr${href ? ` class="row-link" data-href="${href}"` : ''}${attrs}>
      <td><span class="rank-chip${s.rank <= 3 ? ' top' : ''}">${String(s.rank).padStart(2, '0')}</span></td>
      <td class="strong">${cell}${p.invxPick ? ' <span class="badge invx">💎 INVX Pick</span>' : ''}</td>
      <td>${esc(p.underlyings.join(', ') || '-')}</td>
      <td class="strong" style="color:${accent}">${pctOr(p.couponPa)}</td>
      <td class="strong${strikeClass(p.strikePct)}">${pctOr(p.strikePct)}</td>
      <td class="${kiClass(p.kiPct)}">${pctOr(p.kiPct)}</td>
      <td>${pctOr(p.koPct)}</td>
      <td>${pctOr(s.backtest.bufferPct)}</td>
      <td>${pctOr(s.backtest.volatilityPct)}</td>
      <td>${esc(p.tenor ?? '-')}</td>
      <td>${esc(p.issuer ?? '-')}</td>
      ${opts.withScore ? `<td class="strong">${s.score}</td>` : ''}
    </tr>`
    })
    .join('')
  const head = headHtml(opts.withScore ? [...RANK_HEAD, SCORE_HEAD] : RANK_HEAD, opts.initialSort, opts.sortable)
  return `<div class="table-wrap"><table>${head}
    <tbody>${rows}</tbody></table></div>`
}

const TEAL = '#0a8f63'
const CORAL = '#d62f2f'

// Same three profiles the dashboard offers. 'all' is the neutral equal-weight default and the
// ONLY sortable view — the reader explores it. 'aggressive' / 'save' are ranked answers, so
// their order is fixed and their Score column is shown (mirrors the app hiding Score on 'all').
const VIEW_PROFILES = ['all', 'aggressive', 'save'] as const
type ViewProfile = (typeof VIEW_PROFILES)[number]

// Default view opens ordered by KI ascending, like the dashboard's initial sort. Blanks last,
// then the desk's tiebreak: lowest Strike, then rank.
function byKiAsc(a: ScoredProduct, b: ScoredProduct): number {
  const cmp = (x: number | null, y: number | null): number => (x == null && y == null ? 0 : x == null ? 1 : y == null ? -1 : x - y)
  return cmp(a.product.kiPct, b.product.kiPct) || cmp(a.product.strikePct, b.product.strikePct) || a.rank - b.rank
}

function rankingViewHtml(byWindow: WindowItems[], unranked: DetailProduct[], linkFor: (id: string) => string | null): string {
  const pills = (group: string, opts: { v: string; text: string }[]): string =>
    `<div class="pills">${opts
      .map((o, i) => `<button type="button" class="pill${i === 0 ? ' on' : ''}" data-group="${group}" data-v="${o.v}">${esc(o.text)}</button>`)
      .join('')}</div>`

  const winPills = pills('win', byWindow.map((w) => ({ v: String(w.windowMonths), text: windowLabel(w.windowMonths) })))
  const profilePills = pills('profile', VIEW_PROFILES.map((p) => ({ v: p, text: PROFILE_LABELS[p] })))

  const panels = byWindow
    .flatMap((w, wi) =>
      VIEW_PROFILES.map((profile: ViewProfile, pi) => {
        const sortable = profile === 'all'
        const scored = scoreProducts(w.items, PROFILE_WEIGHTS[profile])
        const order = (g: ScoredProduct[]) => (sortable ? [...g].sort(byKiAsc) : [...g].sort((a, b) => a.rank - b.rank))
        const pass = order(scored.filter((s) => s.backtest.verdict === 'pass'))
        const knocked = order(scored.filter((s) => s.backtest.verdict === 'knocked'))
        const table = (g: ScoredProduct[], accent: string) =>
          rankTableHtml(g, accent, linkFor, { sortable, withScore: !sortable, initialSort: sortable ? 'ki' : null })
        const note = sortable
          ? 'น้ำหนักเท่ากันทุกปัจจัย — คลิกหัวตารางเพื่อจัดเรียงเอง'
          : `เรียงตามคะแนนโปรไฟล์ ${esc(PROFILE_LABELS[profile])} — ตำแหน่งคงที่ ไม่เรียงใหม่`
        return `<div class="panel" data-win="${w.windowMonths}" data-profile="${profile}"${wi === 0 && pi === 0 ? '' : ' hidden'}>
          <div class="panel-head">ย้อนหลัง ${esc(windowLabel(w.windowMonths))} · ${esc(PROFILE_LABELS[profile])}</div>
          <div class="panel-note">${note}</div>
          <div class="grouphead"><span class="badge pass">Historical Pass</span><span class="muted">${pass.length} รายการ</span></div>
          ${table(pass, TEAL)}
          <div class="grouphead"><span class="badge knock">Historical Knocked</span><span class="muted">${knocked.length} รายการ</span></div>
          ${table(knocked, CORAL)}
        </div>`
      }),
    )
    .join('')

  // Non-KIKO products are never scored/ranked, but they were part of the batch — list them so
  // every basket in the package is still reachable from this page.
  const others = unranked.length
    ? `<section class="others">
      <h2>ไม่จัดอันดับ (ไม่ใช่ KIKO)</h2>
      <div class="table-wrap"><table>${headHtml(OTHERS_HEAD, null, true)}
        <tbody>${unranked
          .map((s) => {
            const href = linkFor(s.product.id)
            const name = esc(titleOf(s))
            const attrs = sortAttrs([
              ['product', titleOf(s)],
              ['underlying', s.product.underlyings.join(', ')],
              ['coupon', s.product.couponPa],
              ['tenor', s.product.tenorMonths],
              ['issuer', s.product.issuer],
            ])
            return `<tr${href ? ` class="row-link" data-href="${href}"` : ''}${attrs}>
            <td class="strong">${href ? `<a href="${href}">${name}</a>` : name}</td>
            <td>${esc(s.product.underlyings.join(', ') || '-')}</td>
            <td>${pctOr(s.product.couponPa)}</td>
            <td>${esc(s.product.tenor ?? '-')}</td>
            <td>${esc(s.product.issuer ?? '-')}</td>
          </tr>`
          })
          .join('')}</tbody></table></div>
    </section>`
    : ''

  return `
    <h1>KIKO Ranking</h1>
    <div class="sub"><span>คลิกชื่อ product เพื่อดูรายละเอียดและกราฟของตะกร้านั้น</span></div>
    <div class="pillrow"><span class="pilllabel">ช่วงแบ็คเทสต์</span>${winPills}</div>
    <div class="pillrow"><span class="pilllabel">โปรไฟล์คะแนน</span>${profilePills}</div>
    ${panels}
    ${others}`
}

// ── Runtime (ships to the client's browser, so plain ES5-ish JS, not TS) ──────

const BOOTSTRAP = String.raw`
(function () {
  var LC = window.LightweightCharts
  var PRODUCTS = window.__PRODUCTS__ || []
  var built = {}

  function buildChart(payload, host) {
    var chart = LC.createChart(host, {
      width: host.clientWidth,
      height: 440,
      layout: { background: { type: LC.ColorType.Solid, color: '#ffffff' }, textColor: '#6e6e78', fontSize: 12 },
      grid: {
        vertLines: { color: 'rgba(128,128,128,0.15)', style: LC.LineStyle.Dashed },
        horzLines: { color: 'rgba(128,128,128,0.15)', style: LC.LineStyle.Dashed }
      },
      rightPriceScale: { scaleMargins: { top: 0.05, bottom: 0.05 } },
      timeScale: { rightOffset: 12 },
      crosshair: { mode: LC.CrosshairMode.Normal }
    })
    var series = chart.addSeries(LC.CandlestickSeries, { lastValueVisible: false, priceLineVisible: false })
    // Same "always include every level" autoscale as the app: a Strike/KI/KO line far
    // outside the candle range must stay on-screen instead of being clipped away.
    var prices = payload.levels.map(function (l) { return l.price })
    series.applyOptions({
      autoscaleInfoProvider: function (original) {
        var res = original()
        if (!res || !res.priceRange || !prices.length) return res
        return {
          priceRange: {
            minValue: Math.min.apply(null, [res.priceRange.minValue].concat(prices)),
            maxValue: Math.max.apply(null, [res.priceRange.maxValue].concat(prices))
          },
          margins: res.margins
        }
      }
    })
    series.setData(payload.data)

    var ema50 = chart.addSeries(LC.LineSeries, { color: '#F2A950', lineWidth: 2, visible: false, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    var ema200 = chart.addSeries(LC.LineSeries, { color: '#7B6CE0', lineWidth: 2, visible: false, priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false })
    ema50.setData(payload.ema50)
    ema200.setData(payload.ema200)

    payload.levels.forEach(function (l) {
      series.createPriceLine({ price: l.price, color: l.color, lineWidth: 2, lineStyle: LC.LineStyle.Dashed, axisLabelVisible: true, title: l.title })
    })

    // Date marks are an HTML overlay, not part of the library's canvas — same approach the
    // live chart uses, repositioned per pan/zoom frame so the lines track the candles.
    var overlay = document.createElement('div')
    overlay.className = 'mark-layer'
    var els = payload.marks.map(function (m, i) {
      var wrap = document.createElement('div')
      wrap.className = 'mark'
      var line = document.createElement('div')
      line.className = 'mark-line'
      var label = document.createElement('div')
      label.className = 'mark-label'
      label.textContent = m.label
      label.style.top = (4 + (i % 4) * 16) + 'px'
      wrap.appendChild(line)
      wrap.appendChild(label)
      overlay.appendChild(wrap)
      return wrap
    })
    host.parentNode.appendChild(overlay)

    function place() {
      var ts = chart.timeScale()
      var paneWidth = ts.width()
      payload.marks.forEach(function (m, i) {
        var el = els[i]
        var x = ts.timeToCoordinate(m.time)
        if (x == null || x < 0 || x > paneWidth) { el.style.display = 'none'; return }
        el.style.display = ''
        el.style.left = x + 'px'
        el.lastChild.style.transform = x > paneWidth - 140 ? 'translateX(calc(-100% - 4px))' : 'translateX(4px)'
      })
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(place)
    if (payload.range) chart.timeScale().setVisibleRange(payload.range)
    else chart.timeScale().fitContent()
    place()

    function refit() { chart.applyOptions({ width: host.clientWidth }); place() }
    if (window.ResizeObserver) new ResizeObserver(refit).observe(host)
    else window.addEventListener('resize', refit)

    return { chart: chart, ema50: ema50, ema200: ema200, place: place, refit: refit, range: payload.range }
  }

  // Charts are created on first visit, never up front: a package of 20 baskets would
  // otherwise spend seconds building charts nobody has opened yet — and a chart built inside
  // a hidden view measures clientWidth 0 and renders 0px wide.
  function buildProduct(pi) {
    if (built[pi]) return built[pi]
    var charts = (PRODUCTS[pi] && PRODUCTS[pi].charts) || []
    var made = []
    charts.forEach(function (payload, si) {
      var host = document.getElementById('chart-' + pi + '-' + si)
      if (host) made.push(buildChart(payload, host))
    })
    built[pi] = made
    var bar = document.querySelector('.toolbar[data-p="' + pi + '"]')
    if (bar) {
      var e50 = bar.querySelector('.t-ema50')
      var e200 = bar.querySelector('.t-ema200')
      var reset = bar.querySelector('.t-reset')
      if (e50) e50.addEventListener('change', function () { made.forEach(function (c) { c.ema50.applyOptions({ visible: e50.checked }) }) })
      if (e200) e200.addEventListener('change', function () { made.forEach(function (c) { c.ema200.applyOptions({ visible: e200.checked }) }) })
      if (reset) reset.addEventListener('click', function () {
        made.forEach(function (c) {
          if (c.range) c.chart.timeScale().setVisibleRange(c.range)
          else c.chart.timeScale().fitContent()
          c.place()
        })
      })
    }
    return made
  }

  function route() {
    var raw = (location.hash || '').replace(/^#\/?/, '')
    var target = document.getElementById('view-' + raw.replace('/', '-'))
    if (!target) target = document.querySelector('.view')
    var views = document.querySelectorAll('.view')
    for (var i = 0; i < views.length; i++) views[i].hidden = views[i] !== target
    var pi = target.getAttribute('data-p')
    if (pi != null) {
      var made = buildProduct(Number(pi))
      // The chart was created in the same frame the view stopped being hidden, so its first
      // width measurement can still be 0/stale — re-measure once the layout has settled.
      requestAnimationFrame(function () { made.forEach(function (c) { c.refit() }) })
    }
    window.scrollTo(0, 0)
  }

  window.addEventListener('hashchange', route)

  // Whole-row click is a convenience on top of the real <a> in the product cell — ignore it
  // when the anchor itself (or a text selection) was the actual target.
  document.addEventListener('click', function (e) {
    if (e.target.closest && e.target.closest('a')) return
    var row = e.target.closest ? e.target.closest('.row-link') : null
    if (row) location.hash = row.getAttribute('data-href')
  })

  // ── Sortable ranking tables ──
  // Same semantics as the live dashboard: coupon/buffer/score are "higher is better" so they
  // open descending, everything else ascending; a second click flips. Rows with no value for
  // the key always sink to the bottom (a blank is not "lowest"), and ties fall back to KI then
  // rank — the desk's default preference order.
  var NUM_KEYS = { rank: 1, coupon: 1, strike: 1, ki: 1, ko: 1, buffer: 1, vol: 1, tenor: 1, score: 1 }
  var DESC_FIRST = { coupon: 1, buffer: 1, score: 1 }

  function val(tr, k) {
    var v = tr.getAttribute('data-' + k)
    if (v == null || v === '') return null
    return NUM_KEYS[k] ? Number(v) : v
  }

  function cmpKey(a, b, k, dir) {
    var x = val(a, k)
    var y = val(b, k)
    if (x == null && y == null) return 0
    if (x == null) return 1
    if (y == null) return -1
    if (NUM_KEYS[k]) return (x - y) * dir
    return String(x).localeCompare(String(y), 'th') * dir
  }

  function sortTable(table, k, dir) {
    var tb = table.tBodies[0]
    if (!tb) return
    var rows = Array.prototype.slice.call(tb.rows)
    rows.sort(function (a, b) {
      return cmpKey(a, b, k, dir) || cmpKey(a, b, 'ki', 1) || cmpKey(a, b, 'rank', 1)
    })
    rows.forEach(function (r) { tb.appendChild(r) })
  }

  document.addEventListener('click', function (e) {
    var handle = e.target.closest ? e.target.closest('.sort') : null
    if (!handle) return
    var table = handle.closest('table')
    var k = handle.getAttribute('data-k')
    var dir = table.getAttribute('data-sort-k') === k ? -Number(table.getAttribute('data-sort-dir')) : (DESC_FIRST[k] ? -1 : 1)
    table.setAttribute('data-sort-k', k)
    table.setAttribute('data-sort-dir', String(dir))
    var handles = table.querySelectorAll('.sort')
    for (var i = 0; i < handles.length; i++) {
      var on = handles[i] === handle
      if (on) handles[i].setAttribute('data-dir', dir < 0 ? 'desc' : 'asc')
      else handles[i].removeAttribute('data-dir')
      handles[i].className = on ? 'sort on' : 'sort'
    }
    sortTable(table, k, dir)
  })

  // Two independent pill groups (backtest window × score profile) select ONE panel between
  // them, so both have to be tracked — toggling either can't just flip a single axis.
  var picked = { win: null, profile: null }
  var allPills = document.querySelectorAll('.pill')

  function applyPanels() {
    var panels = document.querySelectorAll('.panel')
    for (var i = 0; i < panels.length; i++) {
      panels[i].hidden = panels[i].getAttribute('data-win') !== picked.win || panels[i].getAttribute('data-profile') !== picked.profile
    }
  }

  for (var i = 0; i < allPills.length; i++) {
    var pill = allPills[i]
    var group = pill.getAttribute('data-group')
    if (picked[group] == null) picked[group] = pill.getAttribute('data-v')
    pill.addEventListener('click', function () {
      var g = this.getAttribute('data-group')
      picked[g] = this.getAttribute('data-v')
      var siblings = document.querySelectorAll('.pill[data-group="' + g + '"]')
      for (var j = 0; j < siblings.length; j++) siblings[j].className = siblings[j] === this ? 'pill on' : 'pill'
      applyPanels()
    })
  }
  if (allPills.length) applyPanels()

  route()
})()
`

// Light theme only — this is a client-facing document, and the app's dark palette would
// print as a black page. Values mirror the :root light tokens in index.css.
const STYLES = String.raw`
* { box-sizing: border-box }
body { margin: 0; font-family: -apple-system, 'Segoe UI', Tahoma, sans-serif; color: #1a1a1f; background: #f6f6f8; font-size: 14px; line-height: 1.6 }
a { color: #5b5bef }
.topbar { background: #fff; border-bottom: 1px solid #e5e5ea; padding: 12px 20px; display: flex; flex-wrap: wrap; gap: 10px; align-items: baseline }
.topbar .brand { font-weight: 700; color: #5b5bef }
.topbar .stamp { color: #6e6e78; font-size: 12.5px; margin-left: auto }
.page { max-width: 1240px; margin: 0 auto; padding: 20px 20px 48px }
h1 { font-size: 23px; margin: 0 0 8px; line-height: 1.35 }
h2 { font-size: 15.5px; margin: 24px 0 8px; color: #5b5bef }
.sub { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; color: #6e6e78; font-size: 13px; margin-bottom: 14px }
.summary { font-size: 13.5px; color: #6e6e78; margin-bottom: 16px }
.muted { color: #6e6e78; font-weight: 400; font-size: 12.5px }
.back { display: inline-block; margin-bottom: 12px; text-decoration: none; font-size: 13px }
.back:hover { text-decoration: underline }
.card { background: #fff; border: 1px solid #e5e5ea; border-radius: 10px; margin-bottom: 16px }
.badge { display: inline-flex; align-items: center; gap: 5px; border: 1px solid; border-radius: 999px; padding: 2px 10px; font-size: 12px; font-weight: 600; white-space: nowrap }
.badge.pass { color: #0a8f63; background: #e3f6ee; border-color: #9fe1cb }
.badge.knock { color: #d62f2f; background: #fdeaea; border-color: #f2b0b0 }
.badge.invx { color: #854f0b; background: #faeeda; border-color: #ef9f27 }
.facts { display: grid; grid-template-columns: repeat(auto-fit, minmax(270px, 1fr)); gap: 2px 28px; padding: 14px 18px; font-size: 13.5px }
.fact { display: flex; justify-content: space-between; gap: 10px; border-bottom: 1px dashed #e5e5ea; padding: 6px 0 }
.fact-k { color: #6e6e78 }
.fact-v { font-weight: 600; text-align: right }
.warn { margin-bottom: 16px; padding: 10px 12px; border: 1px solid #ef9f27; background: #faeeda; border-radius: 8px; color: #854f0b; font-size: 12.5px }
.toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 16px; padding: 12px 18px; font-size: 12.5px }
.toolbar label { display: flex; align-items: center; gap: 6px; cursor: pointer }
.swatch { width: 10px; height: 10px; border-radius: 3px; display: inline-block }
.hint { color: #6e6e78; margin-left: auto }
button { font: inherit; padding: 5px 12px; border-radius: 7px; border: 1px solid #e5e5ea; background: #fff; color: #1a1a1f; cursor: pointer }
button:hover { background: #f6f6f8 }
.pillrow { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 8px }
.pilllabel { font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: #6e6e78; margin-right: 4px }
.pills { display: flex; flex-wrap: wrap; gap: 8px }
.pill { border-radius: 999px; padding: 6px 13px; font-size: 12.5px }
.pill.on { background: #5b5bef; border-color: #5b5bef; color: #fff; font-weight: 600 }
.pill.on:hover { background: #5b5bef }
.panel-note { font-size: 12px; color: #6e6e78; margin: 10px 0 2px }
/* On screen the pills say which window/profile is showing; on paper they're gone, so each
   flattened panel needs its own heading. */
.panel-head { display: none }
.others { margin-top: 26px }
.table-wrap td.good { color: #0a8f63; font-weight: 700 }
.table-wrap td.good-cell { color: #0a8f63; font-weight: 700; background: #e3f6ee }
.series-head { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 18px; border-bottom: 1px solid #e5e5ea; font-size: 14.5px; font-weight: 600 }
.chart-box { position: relative; padding: 8px }
/* overflow:hidden is the hard backstop — even a mid-drag frame can't paint a mark line
   or its label outside the chart area. */
.mark-layer { position: absolute; inset: 8px; pointer-events: none; overflow: hidden }
.mark { position: absolute; top: 0; bottom: 0; display: none }
.mark-line { width: 1px; height: 100%; background: rgba(237, 161, 0, 0.85) }
.mark-label { position: absolute; font-size: 11px; color: #b07800; white-space: nowrap; transform: translateX(4px) }
.legend { display: flex; flex-wrap: wrap; gap: 14px; padding: 0 18px 14px; font-size: 12.5px; color: #6e6e78 }
.legend .line { width: 16px; height: 0; border-top: 2px dashed; display: inline-block; vertical-align: middle; margin-right: 5px }
.legend .line.solid { border-top-style: solid; border-color: rgba(237, 161, 0, 0.85) }
.table-wrap { border: 1px solid #e5e5ea; border-radius: 10px; overflow-x: auto; background: #fff }
.table-wrap table { width: 100%; border-collapse: collapse }
.table-wrap th { background: #f6f6f8; border-bottom: 1px solid #e5e5ea; padding: 10px 12px; font-size: 12px; font-weight: 600; color: #6e6e78; text-align: left; white-space: nowrap; user-select: none }
.sort { cursor: pointer }
.sort:hover { color: #5b5bef; text-decoration: underline }
.sort.on { color: #5b5bef }
.sort[data-dir='asc']::after { content: ' ▲'; font-size: 9px }
.sort[data-dir='desc']::after { content: ' ▼'; font-size: 9px }
.table-wrap td { padding: 10px 12px; font-size: 13px; white-space: nowrap; border-top: 1px solid #e5e5ea }
.table-wrap tbody tr:first-child td { border-top: 0 }
.table-wrap td.strong { font-weight: 600 }
.row-link { cursor: pointer }
.row-link:hover td { background: #f6f6f8 }
.rank-chip { font-family: 'IBM Plex Mono', ui-monospace, monospace; font-weight: 600; font-size: 12px; padding: 2px 7px; border-radius: 6px; border: 1px solid #e5e5ea; color: #6e6e78; background: #fff }
.rank-chip.top { border-color: #0a8f63; color: #0a8f63; background: #e3f6ee }
.grouphead { display: flex; align-items: center; gap: 8px; margin: 12px 0 6px }
.empty { font-size: 13px; color: #6e6e78; padding: 8px 12px; border: 1px solid #e5e5ea; border-radius: 10px; background: #fff }
.err { padding: 14px 18px; color: #854f0b; font-size: 13.5px }
.footer { border-top: 1px solid #e5e5ea; padding-top: 12px; margin-top: 24px; font-size: 11.5px; color: #6e6e78 }
/* Printing flattens the app: every view and every window × profile panel laid out in full,
   with the interactive-only affordances (pills, toolbars, back link) removed. */
@media print {
  body { background: #fff }
  .toolbar, .hint, .pillrow, .back, .topbar { display: none }
  .view[hidden], .panel[hidden] { display: block !important }
  .panel-head { display: block; font-size: 15px; font-weight: 700; color: #5b5bef; margin: 22px 0 0; break-before: page }
}
`

function shell(title: string, header: string, views: string, payload: { charts: ChartPayload[] }[]): string {
  return `<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>${STYLES}</style>
</head>
<body>
${header}
<div class="page">
${views}
  <div class="footer">${esc(DISCLAIMER)}</div>
</div>
<script>${chartLibSource}</script>
<script>window.__PRODUCTS__ = ${jsonLiteral(payload)};</script>
<script>${BOOTSTRAP}</script>
</body>
</html>`
}

const stampNow = (): string => new Date().toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })

// ── Public builders ──────────────────────────────────────────────────────────

/** Single basket, interactive — the dashboard's per-product "บันทึกเป็น HTML" download. */
export function buildInteractiveHtml(s: DetailProduct, windowMonths: number): { html: string; title: string } {
  const title = titleOf(s)
  const payloads = s.backtest.error ? [] : chartPayloads(s)
  const header = `<div class="topbar"><div class="brand">SN·Desk</div><div class="stamp">สร้างเมื่อ ${esc(stampNow())}</div></div>`
  const views = `<div class="view" id="view-p-0" data-p="0">${productViewHtml(s, payloads, 0, false, windowMonths)}</div>`
  return { html: shell(`${title} — KIKO Interactive Report`, header, views, [{ charts: payloads }]), title }
}

/**
 * The emailed package in one file: ranking page first, one clickable page per basket.
 * `details` must already carry chart-ready series for `chartWindowMonths` (backtestDetail),
 * in the order the reader should see them; `byWindow` is the KIKO-only ranking source.
 */
export function buildCombinedReportHtml(details: DetailProduct[], byWindow: WindowItems[], chartWindowMonths: number): string {
  const indexById = new Map(details.map((s, i) => [s.product.id, i]))
  const linkFor = (id: string): string | null => {
    const i = indexById.get(id)
    return i == null ? null : `#/p/${i}`
  }

  const payloads = details.map((s) => (s.backtest.error ? [] : chartPayloads(s)))
  const productViews = details
    // id must match the hash route (#/p/3 → view-p-3) — the router resolves by element id.
    .map((s, i) => `<div class="view" id="view-p-${i}" data-p="${i}" hidden>${productViewHtml(s, payloads[i], i, true, chartWindowMonths)}</div>`)
    .join('\n')

  const unranked = details.filter((s) => s.rank == null)
  const views = `<div class="view" id="view-ranking">${rankingViewHtml(byWindow, unranked, linkFor)}</div>\n${productViews}`
  const header = `<div class="topbar">
  <div class="brand">SN·Desk</div>
  <div><a href="#/ranking">จัดอันดับ</a></div>
  <div class="stamp">${details.length} ตะกร้า • สร้างเมื่อ ${esc(stampNow())}</div>
</div>`

  return shell(
    `SN·Desk — จัดอันดับตราสารโครงสร้าง ${new Date().toLocaleDateString('th-TH', { dateStyle: 'medium' })}`,
    header,
    views,
    payloads.map((charts) => ({ charts })),
  )
}

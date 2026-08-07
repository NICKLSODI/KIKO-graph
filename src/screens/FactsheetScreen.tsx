import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { C } from '../theme'
import { FlowShell, Card } from '../ui/components'
import { renderFactsheet, MAPPED_PRODUCT_KEYS } from '../features/factsheet/adapter'
import { productLabel } from '../features/backtest/types'
import type { AppState, Patch } from '../store'

// A4 @96dpi, portrait — the starting guess. KIKO renders landscape (1123×794) and other
// layouts can grow past one page, so the preview measures the rendered page and follows it.
const PAGE_W = 794
const PAGE_H = 1123

/** Simplified Factsheet (Key Highlight) — renders memie's generator from the product's
 *  own extracted data; IC can always override the detected product type (compliance rule:
 *  never let a wrong document go out with no manual fix). */
export function FactsheetScreen({ state, patch }: { state: AppState; patch: Patch }) {
  const product = state.selectedProduct
  const [lang, setLang] = useState<'th' | 'en'>('th')
  const [override, setOverride] = useState('')
  const [pngBusy, setPngBusy] = useState(false)

  // Scale the page down to whatever width the card gives us.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  const [page, setPage] = useState({ w: PAGE_W, h: PAGE_H })
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setScale(Math.min(1, el.clientWidth / page.w))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [product, page.w])

  // The generator decides the page geometry (portrait A4, or landscape for KIKO), so read it
  // back off the rendered document instead of hard-coding either one here.
  function measurePage(e: React.SyntheticEvent<HTMLIFrameElement>) {
    const el = e.currentTarget.contentDocument?.querySelector('.page') as HTMLElement | null
    if (!el) return
    const rect = el.getBoundingClientRect()
    setPage({ w: Math.ceil(rect.width) || PAGE_W, h: Math.ceil(rect.height) || PAGE_H })
  }

  const render = useMemo(
    () => (product ? renderFactsheet(product, lang, override || undefined, state.notional, state.spots, state.spotAsOf) : null),
    [product, lang, override, state.notional, state.spots, state.spotAsOf],
  )

  const fileBase = () =>
    `factsheet-${(product ? productLabel(product) : render?.key ?? 'factsheet').replace(/[^\w.-]+/g, '_')}-${lang}`

  function save(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  // PNG is the only export the desk uses — the sheet goes straight into LINE/chat like the
  // backtest images. Rasterized from the very markup the preview shows — nothing is dropped.
  async function downloadPng() {
    if (!render || !product) return
    setPngBusy(true)
    try {
      const { factsheetPngBlob } = await import('../features/factsheet/exportImage')
      save(await factsheetPngBlob(render.html), `${fileBase()}.png`)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'สร้างรูป PNG ไม่สำเร็จ')
    } finally {
      setPngBusy(false)
    }
  }

  if (!product) {
    return (
      <FlowShell maxWidth={640} title="Factsheet" subtitle="Simplified Factsheet (Key Highlight)" back={{ label: 'Dashboard', onClick: () => patch({ screen: 'backtest' }) }}>
        <Card>
          <div style={{ fontSize: 13, color: C.muted }}>
            ยังไม่ได้เลือกผลิตภัณฑ์ — กลับไปที่ Dashboard แล้วกด "สร้าง Factsheet" ที่หน้ารายละเอียดผลิตภัณฑ์
          </div>
        </Card>
      </FlowShell>
    )
  }

  return (
    <FlowShell
      maxWidth={900}
      title="Factsheet"
      subtitle="Simplified Factsheet (Key Highlight) — สร้างจากข้อมูลที่สกัดจากเอกสาร"
      product={productLabel(product)}
      back={{ label: 'Dashboard', onClick: () => patch({ screen: 'backtest' }) }}
    >
      <Card>
        {/* Controls */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <label style={{ fontSize: 12.5, color: C.muted }}>
            ประเภทผลิตภัณฑ์{' '}
            <select value={override} onChange={(e) => setOverride(e.target.value)} style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, fontSize: 12.5, marginLeft: 4 }}>
              <option value="">อัตโนมัติ ({render?.key ?? '–'})</option>
              {MAPPED_PRODUCT_KEYS.map((k) => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </label>
          <div style={{ display: 'flex', gap: 4 }}>
            {(['th', 'en'] as const).map((l) => (
              <button key={l} className="btn-ghost" aria-pressed={lang === l} onClick={() => setLang(l)} style={{ padding: '6px 13px', borderRadius: 999, fontSize: 12.5, cursor: 'pointer', border: `1px solid ${lang === l ? C.primary : C.border}`, background: lang === l ? C.primary : C.white, color: lang === l ? C.onPrimary : C.text, fontWeight: lang === l ? 600 : 400 }}>
                {l === 'th' ? 'ไทย' : 'EN'}
              </button>
            ))}
          </div>
          {/* PNG is the one export path — a single loud button instead of three quiet ones. */}
          <button
            className="btn-primary"
            onClick={downloadPng}
            disabled={pngBusy}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8,
              padding: '13px 26px', borderRadius: 10, border: '1px solid transparent',
              background: C.primary, color: C.onPrimary, fontSize: 15.5, fontWeight: 700,
              letterSpacing: 0.2, boxShadow: '0 2px 8px rgba(0,0,0,0.18)',
              cursor: pngBusy ? 'default' : 'pointer', opacity: pngBusy ? 0.7 : 1,
            }}
          >
            {pngBusy ? 'กำลังสร้างรูป…' : '⬇  ดาวน์โหลด PNG'}
          </button>
        </div>

        {/* Data-provenance banner */}
        {render?.real ? (
          <div style={{ fontSize: 12.5, color: C.teal, background: C.tealLight, border: `1px solid ${C.tealBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            ✅ สร้างจากข้อมูลจริงที่สกัดจากเอกสาร — ค่าที่เอกสารไม่ได้ระบุจะแสดงเป็น "—" (ไม่เดา)
          </div>
        ) : (
          <div style={{ fontSize: 12.5, color: C.amber, background: C.amberLight, border: `1px solid ${C.amberBorder}`, borderRadius: 8, padding: '8px 12px', marginBottom: 12, lineHeight: 1.6 }}>
            ⚠️ ยังไม่มี mapper ที่ตรวจสอบแล้วสำหรับประเภทนี้ — แสดง "แม่แบบตัวอย่าง (Illustrative)" แทน ห้ามใช้กับลูกค้าโดยไม่แทนที่ตัวเลขจริง
            {render?.fallbackReason && <div style={{ fontSize: 11.5, marginTop: 4, opacity: 0.8 }}>{render.fallbackReason}</div>}
          </div>
        )}

        {/* A4 preview, scaled to fit */}
        <div ref={wrapRef} style={{ width: '100%' }}>
          {render && (
            <div style={{ height: page.h * scale, overflow: 'hidden', borderRadius: 8, border: `1px solid ${C.border}` }}>
              <iframe
                title="factsheet"
                srcDoc={render.html}
                onLoad={measurePage}
                style={{ width: page.w, height: page.h, border: 'none', transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff' }}
              />
            </div>
          )}
        </div>
      </Card>

    </FlowShell>
  )
}

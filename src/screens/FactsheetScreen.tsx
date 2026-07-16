import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { C } from '../theme'
import { FlowShell, FlowNav, Card, NavBtn } from '../ui/components'
import { renderFactsheet, MAPPED_PRODUCT_KEYS } from '../features/factsheet/adapter'
import type { AppState, Patch } from '../store'

// A4 page geometry from memie's factsheet_generator (794×1123 px = A4 @96dpi).
const PAGE_W = 794
const PAGE_H = 1123

/** Simplified Factsheet (Key Highlight) — renders memie's generator from the product's
 *  own extracted data; IC can always override the detected product type (compliance rule:
 *  never let a wrong document go out with no manual fix). */
export function FactsheetScreen({ state, patch }: { state: AppState; patch: Patch }) {
  const product = state.selectedProduct
  const [lang, setLang] = useState<'th' | 'en'>('th')
  const [override, setOverride] = useState('')

  // Scale the fixed-width A4 page down to whatever width the card gives us.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)
  useLayoutEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const measure = () => setScale(Math.min(1, el.clientWidth / PAGE_W))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [product])

  const render = useMemo(
    () => (product ? renderFactsheet(product, lang, override || undefined, state.notional, state.spots, state.spotAsOf) : null),
    [product, lang, override, state.notional, state.spots, state.spotAsOf],
  )

  function openPrint() {
    if (!render) return
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(render.html)
    w.document.close()
    w.focus()
    // Give the fonts/logo a beat to lay out before the print dialog snapshots the page.
    setTimeout(() => w.print(), 300)
  }

  function downloadHtml() {
    if (!render || !product) return
    const blob = new Blob([render.html], { type: 'text/html;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `factsheet-${(product.productCode ?? render.key).replace(/[^\w.-]+/g, '_')}-${lang}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!product) {
    return (
      <FlowShell maxWidth={640} title="Factsheet" subtitle="Simplified Factsheet (Key Highlight)">
        <Card>
          <div style={{ fontSize: 13, color: C.muted }}>
            ยังไม่ได้เลือกผลิตภัณฑ์ — กลับไปที่ Dashboard แล้วกด "สร้าง Factsheet" ที่หน้ารายละเอียดผลิตภัณฑ์
          </div>
        </Card>
        <FlowNav back={{ label: 'Dashboard', onClick: () => patch({ screen: 'backtest' }) }} />
      </FlowShell>
    )
  }

  return (
    <FlowShell
      maxWidth={900}
      title="Factsheet"
      subtitle="Simplified Factsheet (Key Highlight) — สร้างจากข้อมูลที่สกัดจากเอกสาร"
      product={product.productCode ?? product.sourceFile}
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
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <NavBtn onClick={openPrint} secondary>พิมพ์ / บันทึก PDF</NavBtn>
            <NavBtn onClick={downloadHtml} secondary>ดาวน์โหลด HTML</NavBtn>
          </div>
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
            <div style={{ height: PAGE_H * scale, overflow: 'hidden', borderRadius: 8, border: `1px solid ${C.border}` }}>
              <iframe
                title="factsheet"
                srcDoc={render.html}
                style={{ width: PAGE_W, height: PAGE_H, border: 'none', transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff' }}
              />
            </div>
          )}
        </div>
      </Card>

      <FlowNav back={{ label: 'Dashboard', onClick: () => patch({ screen: 'backtest' }) }} />
    </FlowShell>
  )
}

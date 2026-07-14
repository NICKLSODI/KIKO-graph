import { C, FONT, FONT_MONO } from '../theme'
import { AppHeader } from '../ui/components'
import type { Patch } from '../store'

export function Landing({ patch }: { patch: Patch }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT, padding: '24px 16px 40px' }}>
      <AppHeader />
      <div style={{ maxWidth: 720, margin: '10vh auto 0' }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: C.teal, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 14 }}>
          Product Explanation Copilot
        </div>
        <h1 style={{ fontSize: 40, lineHeight: 1.15, fontWeight: 700, color: C.text, margin: '0 0 16px', letterSpacing: '-0.015em', maxWidth: 560 }}>
          เตรียมเนื้อหานำเสนอ<br />ตราสารโครงสร้าง<span style={{ color: C.teal }}>.</span>
        </h1>
        <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.7, margin: '0 0 32px', maxWidth: 520 }}>
          สกัดข้อมูลจาก Term Sheet วาดกราฟระดับ Strike / KI / KO แบ็คเทสต์ราคาจริงย้อนหลัง
          และจัดอันดับผลิตภัณฑ์ — ปรับเนื้อหาให้เข้ากับผู้ลงทุนแต่ละราย
        </p>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 48 }}>
          <button
            className="btn-primary"
            onClick={() => patch({ screen: 'input' })}
            style={{
              padding: '13px 26px', borderRadius: 8, border: '1px solid transparent',
              background: C.teal, color: C.white, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ทีละผลิตภัณฑ์ →
          </button>
          <button
            className="btn-ghost"
            onClick={() => patch({ screen: 'backtest' })}
            style={{
              padding: '13px 26px', borderRadius: 8,
              border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 15, fontWeight: 500, cursor: 'pointer',
            }}
          >
            Backtest &amp; Rank หลายไฟล์
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 1, background: C.border, border: `1px solid ${C.border}`, borderRadius: 10, overflow: 'hidden' }}>
          {[
            ['01', 'นำเข้าเอกสาร', 'PDF · Web Link · ข้อความ'],
            ['02', 'สกัด + ตีกราฟ', 'Strike / KI / KO อัตโนมัติ'],
            ['03', 'Backtest + จัดอันดับ', 'ราคาปิดจริง · worst-of'],
          ].map(([n, title, sub]) => (
            <div key={n} style={{ background: C.white, padding: '16px 18px' }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: C.teal, marginBottom: 6 }}>{n}</div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 2 }}>{title}</div>
              <div style={{ fontSize: 12, color: C.muted }}>{sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

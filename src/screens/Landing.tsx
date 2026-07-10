import { C, FONT } from '../theme'
import type { Patch } from '../store'

export function Landing({ patch }: { patch: Patch }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT, padding: 24 }}>
      <div style={{ textAlign: 'center', maxWidth: 440 }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: C.navy, marginBottom: 8 }}>Product Explanation Copilot</div>
        <div style={{ fontSize: 14.5, color: C.muted, marginBottom: 24, lineHeight: 1.6 }}>
          ระบบสนับสนุนการปฏิบัติงานด้วยปัญญาประดิษฐ์ สำหรับที่ปรึกษาการลงทุนในการจัดเตรียมเนื้อหานำเสนอผลิตภัณฑ์ให้สอดคล้องกับลักษณะเฉพาะของผู้ลงทุนแต่ละราย
        </div>
        <div style={{ background: C.tealLight, borderRadius: 8, border: `1px solid ${C.tealBorder}`, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start', textAlign: 'left' }}>
          <span style={{ flexShrink: 0 }}>✨</span>
          <span style={{ fontSize: 12.5, color: C.teal, lineHeight: 1.5 }}>
            ขับเคลื่อนด้วย Claude — ในแต่ละขั้นตอนเพียงกด "เปิดใน Claude" ระบบจะเปิดแชทพร้อมคำสั่งให้อัตโนมัติ แล้วนำคำตอบกลับมาใช้ต่อได้ทันที
          </span>
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => patch({ screen: 'input' })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 10,
              border: 'none', background: C.teal, color: C.white, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            ทีละผลิตภัณฑ์ →
          </button>
          <button
            onClick={() => patch({ screen: 'backtest' })}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 24px', borderRadius: 10,
              border: `1px solid ${C.teal}`, background: C.white, color: C.teal, fontSize: 15, fontWeight: 600, cursor: 'pointer',
            }}
          >
            📊 Backtest & Rank (หลายไฟล์)
          </button>
        </div>
      </div>
    </div>
  )
}

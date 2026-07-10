import { C } from '../theme'
import { Screen, Card, StepDots, NavBtn } from '../ui/components'
import { FLOW_LABELS } from './InputScreen'
import { FACTSHEET_FAMILY_OPTIONS } from '../constants'
import type { AppState, Patch } from '../store'

export function FactsheetScreen({ state, patch }: { state: AppState; patch: Patch }) {
  const productLabel =
    FACTSHEET_FAMILY_OPTIONS.find((o) => o.value === state.productType)?.label ??
    state.retrieved?.productType ??
    'ยังไม่ได้ระบุ'

  return (
    <Screen>
      <StepDots step={4} labels={FLOW_LABELS} />
      <Card>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>Factsheet</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 18 }}>
          เอกสารสรุปผลิตภัณฑ์แบบพร้อมใช้งาน สร้างจากแม่แบบตามประเภทผลิตภัณฑ์
        </div>

        <div style={{ padding: '14px 16px', borderRadius: 10, border: `1px solid ${C.border}`, background: C.bg, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 4 }}>ผลิตภัณฑ์ที่จะใช้สร้าง Factsheet</div>
          <div style={{ fontSize: 13, color: C.teal }}>{productLabel}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, padding: '12px 14px', borderRadius: 8, background: C.amberLight, border: `1px solid ${C.amberBorder}` }}>
          <span style={{ flexShrink: 0 }}>🚧</span>
          <span style={{ fontSize: 12.5, color: C.amber, lineHeight: 1.6 }}>
            ส่วน Factsheet ยังอยู่ระหว่างพัฒนา — memie กำลังทำแม่แบบ (factsheet_generator) สำหรับแต่ละประเภทผลิตภัณฑ์ เมื่อพร้อมจะเชื่อมเข้ามาที่หน้านี้ให้แสดงตัวอย่างเอกสารและปุ่มพิมพ์/บันทึก PDF
          </span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <NavBtn onClick={() => patch({ screen: 'retrieve' })} secondary>กลับสู่ขั้นตอนก่อนหน้า</NavBtn>
          <NavBtn onClick={() => patch({ screen: 'chooseOutput' })} secondary>เลือกผลลัพธ์อื่น</NavBtn>
        </div>
      </Card>
    </Screen>
  )
}

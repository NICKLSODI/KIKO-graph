import { C } from '../theme'
import { Screen, Card, StepDots, NavBtn } from '../ui/components'
import { OUTPUT_CATEGORIES, type OutputCategory } from '../constants'
import { FLOW_LABELS } from './InputScreen'
import type { AppState, Patch } from '../store'

export function ChooseOutput({ state, patch }: { state: AppState; patch: Patch }) {
  const selected = state.outputCategory

  return (
    <Screen>
      <StepDots step={2} labels={FLOW_LABELS} />
      <Card>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>เลือกประเภทผลลัพธ์</div>
        <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 18 }}>
          ต้องการให้ระบบจัดเตรียมผลลัพธ์แบบใด ระบบจะดึงข้อมูลจากเอกสารในขั้นตอนถัดไปแล้วนำไปใช้ตามประเภทที่เลือก
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {OUTPUT_CATEGORIES.map((o) => {
            const sel = selected === o.key
            return (
              <button
                key={o.key}
                onClick={() => patch({ outputCategory: o.key as OutputCategory })}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, textAlign: 'left', width: '100%',
                  padding: '16px 16px', borderRadius: 12, cursor: 'pointer',
                  border: `1px solid ${sel ? C.teal : C.border}`, background: sel ? C.tealLight : C.white,
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>{o.icon}</span>
                <span>
                  <span style={{ display: 'block', fontSize: 15, fontWeight: 600, color: sel ? C.teal : C.text }}>{o.label}</span>
                  <span style={{ display: 'block', fontSize: 12.5, color: C.muted, marginTop: 2, lineHeight: 1.5 }}>{o.desc}</span>
                </span>
              </button>
            )
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <NavBtn onClick={() => patch({ screen: 'input' })} secondary>กลับสู่ขั้นตอนก่อนหน้า</NavBtn>
          <NavBtn onClick={() => patch({ screen: 'retrieve' })} disabled={!selected}>
            {selected ? 'ดึงข้อมูลจากเอกสาร →' : 'กรุณาเลือกประเภทผลลัพธ์'}
          </NavBtn>
        </div>
      </Card>
    </Screen>
  )
}

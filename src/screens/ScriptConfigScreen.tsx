import { C } from '../theme'
import { Screen, Card, StepDots, NavBtn, Field, PillGroup } from '../ui/components'
import { TONE_OPTIONS, FOCUS_OPTIONS, SCRIPT_FORMATS, DURATION_OPTIONS, type ScriptFormatKey } from '../constants'
import type { AppState, Patch } from '../store'

const PERSONA_LABELS = ['ดึงข้อมูล', 'โปรไฟล์ลูกค้า', 'ตั้งค่า Output', 'ผลลัพธ์']

export function ScriptConfigScreen({ state, patch }: { state: AppState; patch: Patch }) {
  const ready = state.scriptFormats.length > 0

  function toggleFormat(key: ScriptFormatKey) {
    const has = state.scriptFormats.includes(key)
    patch({ scriptFormats: has ? state.scriptFormats.filter((k) => k !== key) : [...state.scriptFormats, key] })
  }

  return (
    <Screen>
      <StepDots step={3} labels={PERSONA_LABELS} />
      <Card>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 18 }}>Output Configurations</div>
        <Field label="รูปแบบน้ำเสียงในการนำเสนอ">
          <PillGroup value={state.tone} onChange={(v) => patch({ tone: v })} options={TONE_OPTIONS} />
        </Field>
        <Field label="ประเด็นที่ต้องเน้นเป็นพิเศษ (เลือกได้มากกว่า 1)">
          <PillGroup multi value={state.focus} onChange={(v) => patch({ focus: v })} options={FOCUS_OPTIONS} />
        </Field>
        <Field label="รูปแบบผลลัพธ์ที่ต้องการจัดเตรียม">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SCRIPT_FORMATS.map((o) => {
              const sel = state.scriptFormats.includes(o.key)
              return (
                <div key={o.key} style={{ borderRadius: 10, border: `1px solid ${sel ? C.teal : C.border}`, background: sel ? C.tealLight : C.white, overflow: 'hidden' }}>
                  <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={sel} onChange={() => toggleFormat(o.key)} style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: sel ? C.teal : C.text }}>{o.label}</div>
                      <div style={{ fontSize: 12.5, color: C.muted }}>{o.desc}</div>
                    </div>
                  </label>
                  {sel && o.key === 'callScript' && (
                    <div style={{ padding: '0 14px 14px 40px' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>ระยะเวลาที่ต้องการใช้พูดจริง</div>
                      <PillGroup
                        value={DURATION_OPTIONS.find((d) => d.minutes === state.durationMinutes)?.label || DURATION_OPTIONS[1].label}
                        onChange={(label) => patch({ durationMinutes: (DURATION_OPTIONS.find((d) => d.label === label) || DURATION_OPTIONS[1]).minutes })}
                        options={DURATION_OPTIONS.map((d) => d.label)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Field>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <NavBtn onClick={() => patch({ screen: 'persona' })} secondary>กลับสู่ขั้นตอนก่อนหน้า</NavBtn>
          <NavBtn onClick={() => patch({ screen: 'scriptResults' })} disabled={!ready}>
            {ready ? 'ไปยังผลลัพธ์ →' : 'เลือกอย่างน้อย 1 รูปแบบ'}
          </NavBtn>
        </div>
      </Card>
    </Screen>
  )
}

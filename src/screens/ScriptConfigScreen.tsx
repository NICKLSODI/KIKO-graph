import { C } from '../theme'
import { FlowShell, FlowNav, Card, Field, PillGroup, IconOptions } from '../ui/components'
import {
  IconBriefcase, IconSmile, IconMessageCircle, IconGem, IconPhone, IconMail,
  IconHelpCircle, IconUsers, IconSparkles, IconReceipt, IconLayers, IconScale, IconAlertTriangle,
} from '../ui/icons'
import { TONE_OPTIONS, FOCUS_OPTIONS, DURATION_OPTIONS, type ScriptFormatKey } from '../constants'
import type { AppState, Patch } from '../store'

/* Presentation-only metadata — `value` is the canonical string from
   constants.ts (what the store and AI prompts consume). */

const TONE_CARDS = [
  { value: TONE_OPTIONS[0], icon: <IconBriefcase size={19} />, label: 'ทางการ', sub: 'Professional' },
  { value: TONE_OPTIONS[1], icon: <IconSmile size={19} />, label: 'เป็นกันเอง', sub: 'Friendly', tone: 'teal' as const },
  { value: TONE_OPTIONS[2], icon: <IconMessageCircle size={19} />, label: 'เข้าใจง่าย', sub: 'Plain Language' },
  { value: TONE_OPTIONS[3], icon: <IconGem size={19} />, label: 'พรีเมียม', sub: 'Premium', tone: 'amber' as const },
]

const FOCUS_CHIPS = [
  { value: FOCUS_OPTIONS[0], label: <><IconSparkles size={13} />จุดเด่นผลิตภัณฑ์</> },
  { value: FOCUS_OPTIONS[1], label: <><IconReceipt size={13} />ค่าธรรมเนียม</> },
  { value: FOCUS_OPTIONS[2], label: <><IconLayers size={13} />เงื่อนไข KI/KO</> },
  { value: FOCUS_OPTIONS[3], label: <><IconAlertTriangle size={13} />ความเสี่ยงสำคัญ</> },
  { value: FOCUS_OPTIONS[4], label: <><IconScale size={13} />เทียบทางเลือกอื่น</> },
]

const FORMAT_CARDS: { value: ScriptFormatKey; icon: React.ReactNode; label: string; sub: string }[] = [
  { value: 'callScript', icon: <IconPhone size={19} />, label: 'Call Script', sub: 'บทพูดโทรศัพท์ฉบับเต็ม' },
  { value: 'lineMessage', icon: <IconMessageCircle size={19} />, label: 'LINE', sub: 'ข้อความสั้นส่งแชท' },
  { value: 'email', icon: <IconMail size={19} />, label: 'Email', sub: 'จดหมายทางการ' },
  { value: 'faq', icon: <IconHelpCircle size={19} />, label: 'FAQ', sub: 'คำถาม-คำตอบพบบ่อย' },
  { value: 'rolePlay', icon: <IconUsers size={19} />, label: 'Role-play', sub: 'บทฝึกตอบข้อโต้แย้ง' },
]

function SectionHead({ n, title, desc }: { n: string; title: string; desc?: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          className="num"
          style={{
            fontSize: 11, fontWeight: 600, color: C.primary, background: C.primaryLight,
            border: `1px solid ${C.primaryBorder}`, borderRadius: 6, padding: '1px 7px',
          }}
        >
          {n}
        </span>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{title}</span>
      </div>
      {desc && <div style={{ fontSize: 12.5, color: C.muted, marginTop: 3 }}>{desc}</div>}
    </div>
  )
}

export function ScriptConfigScreen({ state, patch }: { state: AppState; patch: Patch }) {
  const ready = state.scriptFormats.length > 0

  function toggleFormat(key: string) {
    const k = key as ScriptFormatKey
    const has = state.scriptFormats.includes(k)
    patch({ scriptFormats: has ? state.scriptFormats.filter((x) => x !== k) : [...state.scriptFormats, k] })
  }

  return (
    <FlowShell
      step={3}
      maxWidth={680}
      title="ตั้งค่า Output"
      subtitle="เลือกน้ำเสียง ประเด็นเน้น และรูปแบบผลลัพธ์ที่ต้องการ"
      product={state.retrieved?.productName ?? state.selectedProduct?.productCode ?? null}
      back={{ label: 'โปรไฟล์ลูกค้า', onClick: () => patch({ screen: 'persona' }) }}
      onStepClick={(n) => {
        if (n === 1) patch({ screen: 'backtest' })
        if (n === 2) patch({ screen: 'persona' })
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Card>
          <SectionHead n="01" title="น้ำเสียงในการนำเสนอ" desc="กำหนดบุคลิกของภาษาที่ใช้ทั้งชุด" />
          <IconOptions
            value={state.tone}
            onChange={(v) => patch({ tone: v })}
            options={TONE_CARDS}
            minWidth={140}
          />
        </Card>

        <Card>
          <SectionHead n="02" title="ประเด็นที่เน้นเป็นพิเศษ" desc="เลือกได้มากกว่า 1 หรือข้ามได้" />
          <PillGroup multi value={state.focus} onChange={(v) => patch({ focus: v })} options={FOCUS_CHIPS} />
        </Card>

        <Card>
          <SectionHead n="03" title="รูปแบบผลลัพธ์" desc="เลือกอย่างน้อย 1 รูปแบบ — สร้างพร้อมกันได้หลายแบบ" />
          <IconOptions
            multi
            value={state.scriptFormats}
            onChange={toggleFormat}
            options={FORMAT_CARDS}
            minWidth={118}
          />
          {state.scriptFormats.includes('callScript') && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
              <Field label="ระยะเวลาที่ใช้พูดจริง (Call Script)">
                <PillGroup
                  value={String(state.durationMinutes)}
                  onChange={(v) => patch({ durationMinutes: +v })}
                  options={DURATION_OPTIONS.map((d) => ({
                    value: String(d.minutes),
                    label: `${d.minutes} นาที · ${d.minutes === 5 ? 'กระชับ' : 'มาตรฐาน'}`,
                  }))}
                />
              </Field>
            </div>
          )}
        </Card>

        <FlowNav
          next={{
            label: 'ไปยังผลลัพธ์',
            onClick: () => patch({ screen: 'scriptResults' }),
            disabled: !ready,
            hint: 'เลือกรูปแบบผลลัพธ์อย่างน้อย 1 แบบ',
          }}
        />
      </div>
    </FlowShell>
  )
}

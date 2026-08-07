import type { ReactNode } from 'react'
import { C } from '../theme'
import { FlowShell, FlowNav, Card, Field, PillGroup, IconOptions, SliderField } from '../ui/components'
import {
  IconUser, IconUserPlus, IconBriefcase, IconHourglass, IconShield, IconCoins,
  IconTrendingUp, IconPieChart, IconTarget, IconSprout, IconBookOpen, IconGem,
  IconDroplet, IconLayers, IconScale, IconReceipt, IconCalendar, IconActivity, IconCheck,
} from '../ui/icons'
import {
  RELATIONSHIP_OPTIONS,
  AGE_OPTIONS,
  KNOWLEDGE_OPTIONS,
  GOAL_OPTIONS,
  RISK_OPTIONS,
  EXPERIENCE_OPTIONS,
  ASSET_OPTIONS,
  CONCERN_OPTIONS,
} from '../constants'
import type { AppState, Patch } from '../store'

/* Presentation-only metadata. `value` always references the canonical option
   string from constants.ts — that exact string is what lands in the store and
   in AI prompts, so only labels/icons may differ from it. */

const RELATIONSHIP_CARDS = [
  { value: RELATIONSHIP_OPTIONS[0], icon: <IconUserPlus size={19} />, label: 'ลูกค้าใหม่', sub: 'Newly Onboarded', tone: 'teal' as const },
  { value: RELATIONSHIP_OPTIONS[1], icon: <IconBriefcase size={19} />, label: 'มีพอร์ตปัจจุบัน', sub: 'Active Portfolio' },
  { value: RELATIONSHIP_OPTIONS[2], icon: <IconHourglass size={19} />, label: 'ใกล้ครบกำหนด', sub: 'Approaching Maturity', tone: 'amber' as const },
]

const AGE_TICKS = [
  { value: AGE_OPTIONS[0], label: '18-30' },
  { value: AGE_OPTIONS[1], label: '31-45' },
  { value: AGE_OPTIONS[2], label: '46-60' },
  { value: AGE_OPTIONS[3], label: '60+' },
]

const KNOWLEDGE_TICKS = [
  { value: KNOWLEDGE_OPTIONS[0], label: 'พื้นฐาน' },
  { value: KNOWLEDGE_OPTIONS[1], label: 'ปานกลาง' },
  { value: KNOWLEDGE_OPTIONS[2], label: 'สูง / มืออาชีพ' },
]

const GOAL_CARDS = [
  { value: GOAL_OPTIONS[0], icon: <IconShield size={19} />, label: 'รักษาเงินต้น', tone: 'teal' as const },
  { value: GOAL_OPTIONS[1], icon: <IconCoins size={19} />, label: 'รายได้สม่ำเสมอ', tone: 'amber' as const },
  { value: GOAL_OPTIONS[2], icon: <IconTrendingUp size={19} />, label: 'เติบโตระยะยาว' },
  { value: GOAL_OPTIONS[3], icon: <IconPieChart size={19} />, label: 'กระจายความเสี่ยง' },
]

const RISK_TICKS = [
  { value: RISK_OPTIONS[0], label: 'ต่ำ', sub: 'Conservative', tone: 'teal' as const },
  { value: RISK_OPTIONS[1], label: 'ปานกลาง', sub: 'Moderate', tone: 'amber' as const },
  { value: RISK_OPTIONS[2], label: 'สูง', sub: 'Aggressive', tone: 'coral' as const },
]

/* Experience tones read as "how much groundwork the advisor must lay":
   green = ready, amber = brief the product, red = start from basics. */
const EXPERIENCE_CARDS = [
  { value: EXPERIENCE_OPTIONS[0].value, icon: <IconTarget size={19} />, label: 'เคยลงทุนผลิตภัณฑ์นี้', sub: 'Existing Holder', tone: 'teal' as const },
  { value: EXPERIENCE_OPTIONS[1].value, icon: <IconSprout size={19} />, label: 'ใหม่กับผลิตภัณฑ์นี้', sub: 'สรุปข้อมูลผลิตภัณฑ์ให้', tone: 'amber' as const },
  { value: EXPERIENCE_OPTIONS[2].value, icon: <IconBookOpen size={19} />, label: 'ยังไม่เคยลงทุน', sub: 'ปูพื้นฐานความรู้ให้', tone: 'coral' as const },
]

const ASSET_CARDS = [
  { value: ASSET_OPTIONS[0].value, icon: <IconUser size={19} />, label: 'ต่ำกว่า 8 ล้านบาท', sub: 'Retail' },
  { value: ASSET_OPTIONS[1].value, icon: <IconGem size={19} />, label: '8 ล้านบาทขึ้นไป', sub: 'High Net Worth / Ultra HNW', tone: 'amber' as const },
]

const CONCERN_CHIPS = [
  { value: CONCERN_OPTIONS[0], label: <><IconShield size={13} />กลัวสูญเสียเงินต้น</> },
  { value: CONCERN_OPTIONS[1], label: <><IconDroplet size={13} />สภาพคล่อง</> },
  { value: CONCERN_OPTIONS[2], label: <><IconLayers size={13} />โครงสร้างซับซ้อน (KI/KO)</> },
  { value: CONCERN_OPTIONS[3], label: <><IconScale size={13} />เทียบผลตอบแทนกับสินทรัพย์มั่นคง</> },
  { value: CONCERN_OPTIONS[4], label: <><IconReceipt size={13} />ค่าธรรมเนียม</> },
]

const RISK_COLORS = [C.teal, C.amber, C.coral] as const

function shortLabel(list: { value: string; label: string }[], v: string): string | undefined {
  return list.find((o) => o.value === v)?.label
}

/* ─── Left rail: live persona summary that fills in as the user picks ─── */
function TraitRow({ icon, name, value, valueColor }: { icon: ReactNode; name: string; value?: string; valueColor?: string }) {
  const filled = !!value
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
      <span style={{ display: 'flex', color: filled ? C.primary : C.muted, opacity: filled ? 1 : 0.55, flexShrink: 0 }}>{icon}</span>
      <div style={{ minWidth: 0 }}>
        <div className="overline" style={{ fontSize: 9.5, lineHeight: 1.4 }}>{name}</div>
        <div style={{ fontSize: 12.5, fontWeight: filled ? 600 : 400, color: filled ? (valueColor ?? C.text) : C.muted, lineHeight: 1.5 }}>
          {value ?? 'ยังไม่ได้เลือก'}
        </div>
      </div>
    </div>
  )
}

function PersonaPreview({ state, filled, total }: { state: AppState; filled: number; total: number }) {
  const ready = filled === total
  const riskIdx = RISK_OPTIONS.indexOf(state.riskProfile)
  return (
    <aside className="card persona-preview" style={{ padding: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 14 }}>
        <div
          style={{
            position: 'relative', width: 64, height: 64, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: C.primaryLight, color: C.primary,
            border: `2px solid ${ready ? C.teal : C.primaryBorder}`,
          }}
        >
          <IconUser size={30} />
          {ready && (
            <span
              style={{
                position: 'absolute', right: -2, bottom: -2, width: 20, height: 20, borderRadius: '50%',
                background: C.teal, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: `2px solid ${C.white}`,
              }}
            >
              <IconCheck size={11} strokeWidth={3} />
            </span>
          )}
        </div>
        <div style={{ fontSize: 15, fontWeight: 600, color: C.text, marginTop: 10 }}>Client Persona</div>
        <div style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.5 }}>โปรไฟล์สำหรับปรับเนื้อหา Script / Factsheet</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <div style={{ flex: 1, height: 5, borderRadius: 3, background: C.border, overflow: 'hidden' }}>
          <div style={{ width: `${(filled / total) * 100}%`, height: '100%', borderRadius: 3, background: ready ? C.teal : C.primary, transition: 'width 0.25s ease, background-color 0.25s ease' }} />
        </div>
        <span className="num" style={{ fontSize: 11.5, color: ready ? C.teal : C.muted }}>{filled}/{total}</span>
      </div>

      <TraitRow icon={<IconUserPlus size={14} />} name="สถานะลูกค้า" value={shortLabel(RELATIONSHIP_CARDS, state.relationshipStatus)} />
      <TraitRow icon={<IconCalendar size={14} />} name="ช่วงอายุ" value={state.ageRange ? `${shortLabel(AGE_TICKS, state.ageRange)} ปี` : undefined} />
      <TraitRow icon={<IconBookOpen size={14} />} name="ความรู้การเงิน" value={shortLabel(KNOWLEDGE_TICKS, state.financialKnowledge)} />
      <TraitRow icon={<IconTarget size={14} />} name="ประสบการณ์" value={shortLabel(EXPERIENCE_CARDS, state.experienceLevel)} />
      <TraitRow icon={<IconTrendingUp size={14} />} name="เป้าหมายการลงทุน" value={shortLabel(GOAL_CARDS, state.investmentGoal)} />
      <TraitRow
        icon={<IconActivity size={14} />}
        name="ความเสี่ยงที่รับได้"
        value={shortLabel(RISK_TICKS, state.riskProfile)}
        valueColor={riskIdx >= 0 ? RISK_COLORS[riskIdx] : undefined}
      />
      <TraitRow
        icon={<IconGem size={14} />}
        name="AUM Tier"
        value={shortLabel(ASSET_CARDS, state.assetTier)}
        valueColor={state.assetTier === ASSET_OPTIONS[1].value ? C.amber : undefined}
      />
      {state.concerns.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.amber, paddingTop: 8 }}>
          <IconShield size={12} />ข้อกังวล {state.concerns.length} รายการ
        </div>
      )}
    </aside>
  )
}

/* ─── Right column: numbered form sections ─── */
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

export function PersonaScreen({ state, patch }: { state: AppState; patch: Patch }) {
  const required = [
    state.relationshipStatus, state.ageRange, state.financialKnowledge, state.investmentGoal,
    state.riskProfile, state.experienceLevel, state.assetTier,
  ]
  const filled = required.filter(Boolean).length
  const ready = filled === required.length

  return (
    <FlowShell
      step={2}
      maxWidth={960}
      title="สร้างโปรไฟล์ลูกค้า"
      subtitle="เลือกคุณลักษณะของลูกค้า ระบบจะปรับเนื้อหาให้ตรงกับผู้รับ"
      product={state.retrieved?.productName ?? state.selectedProduct?.productCode ?? null}
      back={{ label: 'Dashboard', onClick: () => patch({ screen: 'backtest' }) }}
      onStepClick={(n) => { if (n === 1) patch({ screen: 'backtest' }) }}
    >
      <div className="persona-layout">
        <PersonaPreview state={state} filled={filled} total={required.length} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <SectionHead n="01" title="ข้อมูลพื้นฐาน" desc="ความสัมพันธ์กับลูกค้าและช่วงวัย" />
            <Field label="สถานะทางข้อผูกพันของลูกค้า" done={!!state.relationshipStatus}>
              <IconOptions value={state.relationshipStatus} onChange={(v) => patch({ relationshipStatus: v })} options={RELATIONSHIP_CARDS} />
            </Field>
            <Field label="ช่วงอายุของผู้ลงทุน (ปี)" done={!!state.ageRange}>
              <SliderField value={state.ageRange} onChange={(v) => patch({ ageRange: v })} options={AGE_TICKS} ariaLabel="ช่วงอายุของผู้ลงทุน" />
            </Field>
          </Card>

          <Card>
            <SectionHead n="02" title="ความรู้และประสบการณ์" desc="กำหนดระดับการอธิบายและการปูพื้นฐานในเนื้อหา" />
            <Field label="ระดับความรู้ความเข้าใจด้านการเงิน" done={!!state.financialKnowledge}>
              <SliderField value={state.financialKnowledge} onChange={(v) => patch({ financialKnowledge: v })} options={KNOWLEDGE_TICKS} ariaLabel="ระดับความรู้ความเข้าใจด้านการเงิน" />
            </Field>
            <Field label="ประสบการณ์การลงทุนในผลิตภัณฑ์" done={!!state.experienceLevel}>
              <IconOptions value={state.experienceLevel} onChange={(v) => patch({ experienceLevel: v })} options={EXPERIENCE_CARDS} />
            </Field>
          </Card>

          <Card>
            <SectionHead n="03" title="เป้าหมายและความเสี่ยง" desc="ทิศทางการลงทุนและระดับความเสี่ยงที่ยอมรับได้" />
            <Field label="วัตถุประสงค์ในการลงทุน" done={!!state.investmentGoal}>
              <IconOptions value={state.investmentGoal} onChange={(v) => patch({ investmentGoal: v })} options={GOAL_CARDS} minWidth={200} />
            </Field>
            <Field label="ระดับความเสี่ยงที่ยอมรับได้ (Risk Profile)" done={!!state.riskProfile}>
              <SliderField value={state.riskProfile} onChange={(v) => patch({ riskProfile: v })} options={RISK_TICKS} ariaLabel="Risk Profile" />
            </Field>
            <Field label="มูลค่าสินทรัพย์ภายใต้การบริหาร (AUM Tier)" done={!!state.assetTier}>
              <IconOptions value={state.assetTier} onChange={(v) => patch({ assetTier: v })} options={ASSET_CARDS} minWidth={200} />
            </Field>
          </Card>

          <Card>
            <SectionHead n="04" title="ข้อกังวลของลูกค้า" desc="เลือกได้มากกว่า 1 หรือข้ามได้ — Script จะเตรียมคำตอบให้ล่วงหน้า" />
            <PillGroup multi tone="amber" value={state.concerns} onChange={(v) => patch({ concerns: v })} options={CONCERN_CHIPS} />
          </Card>

          <FlowNav
            next={{
              label: 'ตั้งค่า Output',
              onClick: () => patch({ screen: 'scriptConfig' }),
              disabled: !ready,
              hint: `เหลืออีก ${required.length - filled} ข้อ`,
            }}
          />
        </div>
      </div>
    </FlowShell>
  )
}

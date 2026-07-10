import { C } from '../theme'
import { Screen, Card, StepDots, NavBtn, Field, PillGroup, SelectField } from '../ui/components'
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

const PERSONA_LABELS = ['ดึงข้อมูล', 'โปรไฟล์ลูกค้า', 'ตั้งค่า Output', 'ผลลัพธ์']

export function PersonaScreen({ state, patch }: { state: AppState; patch: Patch }) {
  const ready =
    state.relationshipStatus && state.ageRange && state.financialKnowledge && state.investmentGoal &&
    state.riskProfile && state.experienceLevel && state.assetTier

  return (
    <Screen>
      <StepDots step={2} labels={PERSONA_LABELS} />
      <Card>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 18 }}>Client Profile Analysis</div>
        <Field label="สถานะทางข้อผูกพันของลูกค้า">
          <PillGroup value={state.relationshipStatus} onChange={(v) => patch({ relationshipStatus: v })} options={RELATIONSHIP_OPTIONS} />
        </Field>
        <Field label="ช่วงอายุของผู้ลงทุน">
          <SelectField value={state.ageRange} onChange={(v) => patch({ ageRange: v })} options={AGE_OPTIONS} />
        </Field>
        <Field label="ระดับความรู้ความเข้าใจด้านการเงิน">
          <PillGroup value={state.financialKnowledge} onChange={(v) => patch({ financialKnowledge: v })} options={KNOWLEDGE_OPTIONS} />
        </Field>
        <Field label="วัตถุประสงค์ในการลงทุน">
          <SelectField value={state.investmentGoal} onChange={(v) => patch({ investmentGoal: v })} options={GOAL_OPTIONS} />
        </Field>
        <Field label="Risk Profile">
          <PillGroup value={state.riskProfile} onChange={(v) => patch({ riskProfile: v })} options={RISK_OPTIONS} />
        </Field>
        <Field label="ประสบการณ์การลงทุนในผลิตภัณฑ์">
          <PillGroup value={state.experienceLevel} onChange={(v) => patch({ experienceLevel: v })} options={EXPERIENCE_OPTIONS} />
        </Field>
        <Field label="ระดับมูลค่าสินทรัพย์ภายใต้การบริหาร (AUM Tier)">
          <PillGroup value={state.assetTier} onChange={(v) => patch({ assetTier: v })} options={ASSET_OPTIONS} />
        </Field>
        <Field label="ปัจจัยความเสี่ยงหรือข้อกังวลของผู้ลงทุน (เลือกได้มากกว่า 1)">
          <PillGroup multi value={state.concerns} onChange={(v) => patch({ concerns: v })} options={CONCERN_OPTIONS} />
        </Field>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <NavBtn onClick={() => patch({ screen: 'retrieve' })} secondary>กลับสู่ขั้นตอนก่อนหน้า</NavBtn>
          <NavBtn onClick={() => patch({ screen: 'scriptConfig' })} disabled={!ready}>ตั้งค่า Output →</NavBtn>
        </div>
      </Card>
    </Screen>
  )
}

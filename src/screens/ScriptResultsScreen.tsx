import { useMemo, useState } from 'react'
import { C } from '../theme'
import { Screen, Card, StepDots, NavBtn } from '../ui/components'
import { SCRIPT_FORMATS, type ScriptFormatKey } from '../constants'
import { buildScriptPrompt, type PersonaOpts } from '../features/script/prompts'
import { generate } from '../api/generate'
import { openInClaude } from '../lib/claudeApp'
import type { AppState, Patch } from '../store'

const PERSONA_LABELS = ['ดึงข้อมูล', 'โปรไฟล์ลูกค้า', 'ตั้งค่า Output', 'ผลลัพธ์']

function personaOf(state: AppState): PersonaOpts {
  return {
    relationshipStatus: state.relationshipStatus,
    ageRange: state.ageRange,
    financialKnowledge: state.financialKnowledge,
    investmentGoal: state.investmentGoal,
    riskProfile: state.riskProfile,
    experienceLevel: state.experienceLevel,
    assetTier: state.assetTier,
    concerns: state.concerns,
    tone: state.tone,
    focus: state.focus,
  }
}

export function ScriptResultsScreen({ state, patch, onReset }: { state: AppState; patch: Patch; onReset: () => void }) {
  const formats = state.scriptFormats
  const [activeTab, setActiveTab] = useState<ScriptFormatKey>(formats[0] ?? 'callScript')
  const [pasted, setPasted] = useState<Record<string, string>>({})
  const [results, setResults] = useState<Record<string, string>>({})
  const [copied, setCopied] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const prompt = useMemo(() => {
    if (!state.retrieved) return ''
    return buildScriptPrompt(activeTab, state.retrieved, personaOf(state), state.durationMinutes)
  }, [activeTab, state])

  async function copy(text: string, key: string) {
    await navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  async function generateActive() {
    setLoading(activeTab)
    setError(null)
    try {
      const text = await generate(prompt)
      setResults((r) => ({ ...r, [activeTab]: text }))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(null)
    }
  }

  const box = { width: '100%', boxSizing: 'border-box' as const, borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: 'monospace', fontSize: 12, padding: '12px 14px' }
  const smallBtn = { padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.muted, fontSize: 12.5, cursor: 'pointer' }

  return (
    <Screen>
      <StepDots step={4} labels={PERSONA_LABELS} />
      <Card>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>Analytical Results</div>
        <div style={{ fontSize: 12.5, color: C.muted, marginBottom: 16 }}>
          แต่ละรูปแบบมีคำสั่งเฉพาะที่อิงตาม Persona และข้อเท็จจริงที่ดึงได้ — กด "สร้างอัตโนมัติ" ผ่าน Claude Code (ไม่ต้องใช้ API key)
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
          {formats.map((key) => {
            const label = SCRIPT_FORMATS.find((o) => o.key === key)?.label || key
            const active = activeTab === key
            const done = !!results[key]
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                style={{
                  padding: '6px 14px', borderRadius: 20, fontSize: 12.5, cursor: 'pointer', fontWeight: active ? 600 : 400,
                  border: `1px solid ${active ? C.teal : C.border}`, background: active ? C.tealLight : C.white,
                  color: active ? C.teal : done ? C.text : C.muted,
                }}
              >
                {done ? `✓ ${label}` : label}
              </button>
            )
          })}
        </div>

        {/* Auto-generate via Claude Code */}
        <NavBtn onClick={generateActive} disabled={loading === activeTab}>
          {loading === activeTab ? 'กำลังสร้าง...' : `สร้าง ${SCRIPT_FORMATS.find((o) => o.key === activeTab)?.label || ''} อัตโนมัติ`}
        </NavBtn>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: C.amberLight, border: `1px solid ${C.amberBorder}`, color: C.amber, fontSize: 13, lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        {/* Final result */}
        {results[activeTab] && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button onClick={() => copy(results[activeTab], 'result')} style={{ ...smallBtn, background: copied === 'result' ? C.tealLight : C.white, color: copied === 'result' ? C.teal : C.muted }}>
                {copied === 'result' ? '✓ คัดลอกแล้ว' : 'คัดลอกข้อความ'}
              </button>
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: C.text, padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.bg }}>
              {results[activeTab]}
            </div>
          </div>
        )}

        {/* Manual fallback */}
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', color: C.muted, fontSize: 12.5 }}>หรือทำเองผ่าน Claude App (กรณีอัตโนมัติใช้ไม่ได้)</summary>
          <div style={{ marginTop: 10 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
              <NavBtn onClick={() => openInClaude(prompt)} secondary>เปิดใน Claude (คัดลอกคำสั่งให้)</NavBtn>
              <button onClick={() => copy(prompt, 'prompt')} style={{ ...smallBtn, background: copied === 'prompt' ? C.tealLight : C.white, color: copied === 'prompt' ? C.teal : C.muted }}>
                {copied === 'prompt' ? '✓ คัดลอกแล้ว' : 'คัดลอกคำสั่ง'}
              </button>
            </div>
            <textarea
              value={pasted[activeTab] ?? ''}
              onChange={(e) => setPasted((p) => ({ ...p, [activeTab]: e.target.value }))}
              placeholder="วางเนื้อหาที่ Claude สร้างให้ที่นี่"
              style={{ ...box, minHeight: 120, fontFamily: 'inherit', fontSize: 13.5 }}
            />
            <div style={{ marginTop: 8 }}>
              <NavBtn onClick={() => setResults((r) => ({ ...r, [activeTab]: pasted[activeTab] ?? '' }))} disabled={!(pasted[activeTab] ?? '').trim()} secondary>
                บันทึกผลลัพธ์
              </NavBtn>
            </div>
          </div>
        </details>

        {/* Final result */}
        {results[activeTab] && (
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
              <button onClick={() => copy(results[activeTab], 'result')} style={{ ...smallBtn, background: copied === 'result' ? C.tealLight : C.white, color: copied === 'result' ? C.teal : C.muted }}>
                {copied === 'result' ? '✓ คัดลอกแล้ว' : 'คัดลอกข้อความ'}
              </button>
            </div>
            <div style={{ fontSize: 14.5, lineHeight: 1.8, whiteSpace: 'pre-wrap', color: C.text, padding: '12px 14px', border: `1px solid ${C.border}`, borderRadius: 10, background: C.bg }}>
              {results[activeTab]}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <NavBtn onClick={() => patch({ screen: 'scriptConfig' })} secondary>กลับสู่ขั้นตอนก่อนหน้า</NavBtn>
          <NavBtn onClick={() => patch({ screen: 'chooseOutput' })} secondary>เลือกผลลัพธ์อื่น</NavBtn>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 14 }}>
          <button onClick={onReset} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}>
            เริ่มต้นใหม่ทั้งหมด
          </button>
        </div>
      </Card>
    </Screen>
  )
}

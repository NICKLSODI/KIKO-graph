import { useMemo, useState } from 'react'
import { C } from '../theme'
import { FlowShell, FlowNav, Card, NavBtn } from '../ui/components'
import { SCRIPT_FORMATS, type ScriptFormatKey } from '../constants'
import { buildScriptPrompt, type PersonaOpts } from '../features/script/prompts'
import { generateCached } from '../api/generate'
import { openInClaude } from '../lib/claudeApp'
import type { AppState, Patch } from '../store'

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
    // clipboard.writeText rejects on permission denial / no focus / non-secure context —
    // swallow it so the click handler doesn't emit an unhandled rejection.
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(null), 2000)
    } catch { /* clipboard unavailable — no feedback, but no crash */ }
  }

  // force=true only when the user explicitly asks to regenerate — otherwise an identical
  // prompt (same product + persona + format) returns the cached reply and costs no tokens.
  async function generateActive(force = false) {
    setLoading(activeTab)
    setError(null)
    try {
      const text = await generateCached(prompt, force)
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
    <FlowShell
      step={4}
      maxWidth={680}
      title="ผลลัพธ์"
      subtitle="แต่ละรูปแบบมีคำสั่งเฉพาะที่อิงตาม Persona และข้อเท็จจริงที่ดึงได้ — สร้างผ่าน Claude Code ไม่ต้องใช้ API key"
      product={state.retrieved?.productName ?? state.selectedProduct?.productCode ?? null}
      onStepClick={(n) => {
        if (n === 1) patch({ screen: 'backtest' })
        if (n === 2) patch({ screen: 'persona' })
        if (n === 3) patch({ screen: 'scriptConfig' })
      }}
    >
      <Card>
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
                  border: `1px solid ${active ? C.primary : C.border}`, background: active ? C.primaryLight : C.white,
                  color: active ? C.primary : done ? C.text : C.muted,
                }}
              >
                {done ? `✓ ${label}` : label}
              </button>
            )
          })}
        </div>

        {/* Auto-generate via Claude Code. Identical prompts reuse a cached reply (0 tokens);
            "สร้างใหม่" forces a fresh call. */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <NavBtn onClick={() => generateActive(false)} disabled={loading === activeTab}>
            {loading === activeTab ? 'กำลังสร้าง...' : `สร้าง ${SCRIPT_FORMATS.find((o) => o.key === activeTab)?.label || ''} อัตโนมัติ`}
          </NavBtn>
          {results[activeTab] && (
            <button onClick={() => generateActive(true)} disabled={loading === activeTab} style={{ ...smallBtn, cursor: loading === activeTab ? 'default' : 'pointer' }}>
              สร้างใหม่ (ไม่ใช้แคช)
            </button>
          )}
        </div>
        <div style={{ fontSize: 11.5, color: C.muted, marginTop: 6 }}>
          ผลลัพธ์เดิม (ผลิตภัณฑ์ + โปรไฟล์ + รูปแบบเดียวกัน) ถูกแคชไว้ กดซ้ำไม่เสีย token — แก้โปรไฟล์แล้วค่อยเสียใหม่
        </div>

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

      </Card>

      <FlowNav
        back={{ label: 'ตั้งค่า Output', onClick: () => patch({ screen: 'scriptConfig' }) }}
        next={{ label: 'เสร็จสิ้น — กลับ Dashboard', onClick: () => patch({ screen: 'backtest' }) }}
        extra={
          <button onClick={onReset} style={{ background: 'none', border: 'none', color: C.muted, fontSize: 12.5, textDecoration: 'underline', cursor: 'pointer' }}>
            เริ่มต้นใหม่ทั้งหมด
          </button>
        }
      />
    </FlowShell>
  )
}

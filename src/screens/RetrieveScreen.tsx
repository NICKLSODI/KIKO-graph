import { useState } from 'react'
import { C } from '../theme'
import { Screen, Card, StepDots, NavBtn } from '../ui/components'
import { FLOW_LABELS } from './InputScreen'
import { buildPromptText, parseExtraction, EXTRACTION_INSTRUCTIONS, type IngestInput, type RetrievedProductData } from '../features/ingest/ingest'
import { generate } from '../api/generate'
import { openInClaude } from '../lib/claudeApp'
import type { AppState, Patch } from '../store'

function toIngestInput(state: AppState): IngestInput {
  if (state.mode === 'link') return { mode: 'link', link: state.link }
  if (state.mode === 'file' && state.file) {
    return { mode: 'pdf', fileName: state.file.name, mediaType: state.file.mediaType, base64: state.file.data }
  }
  return { mode: 'text', text: state.text }
}

function nextScreenFor(state: AppState): AppState['screen'] {
  if (state.outputCategory === 'graph') return 'graph'
  if (state.outputCategory === 'factsheet') return 'factsheet'
  return 'persona'
}

function DataPreview({ data }: { data: RetrievedProductData }) {
  return (
    <div style={{ border: `1px solid ${C.tealBorder}`, background: C.tealLight, borderRadius: 10, padding: 14, marginTop: 12 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.teal, marginBottom: 8 }}>✓ ดึงข้อมูลสำเร็จ</div>
      <div style={{ fontSize: 13, color: C.text, lineHeight: 1.7 }}>
        <div><b>สรุป:</b> {data.summary || '-'}</div>
        <div><b>ชื่อผลิตภัณฑ์:</b> {data.productName ?? '-'} &nbsp;|&nbsp; <b>ประเภท:</b> {data.productType ?? '-'}</div>
        <div><b>หุ้นอ้างอิง:</b> {data.underlyingSymbol ?? '-'} {data.market ? `(${data.market === 'thai' ? 'ไทย' : 'ต่างประเทศ'})` : ''}</div>
        <div><b>Strike:</b> {data.strike != null ? `${data.strike}%` : '-'} &nbsp;|&nbsp; <b>Knock-In:</b> {data.knockIn != null ? `${data.knockIn}%` : '-'} &nbsp;|&nbsp; <b>Knock-Out:</b> {data.knockOut != null ? `${data.knockOut}%` : '-'}</div>
        <div><b>วันครบกำหนด:</b> {data.maturityDate ?? '-'}</div>
        <div><b>วันสังเกตการณ์:</b> {data.observationDates.length ? data.observationDates.join(', ') : '-'}</div>
      </div>
    </div>
  )
}

export function RetrieveScreen({ state, patch }: { state: AppState; patch: Patch }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Manual fallback state
  const [prompt, setPrompt] = useState('')
  const [opened, setOpened] = useState(false)
  const [pasted, setPasted] = useState('')

  const data = state.retrieved

  async function handleAuto() {
    setLoading(true)
    setError(null)
    try {
      const input = toIngestInput(state)
      let text: string
      if (input.mode === 'pdf') {
        // Send the file so Claude Code reads it directly (no "attach to chat" wording).
        const prompt = `${EXTRACTION_INSTRUCTIONS}\n\nเอกสารผลิตภัณฑ์แนบเป็นไฟล์ (${input.fileName})`
        text = await generate(prompt, { name: input.fileName, mediaType: input.mediaType, base64: input.base64 })
      } else {
        text = await generate(buildPromptText(input))
      }
      patch({ retrieved: parseExtraction(text) })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    const p = buildPromptText(toIngestInput(state))
    setPrompt(p)
    openInClaude(p)
    setOpened(true)
  }

  function handleParse() {
    setError(null)
    try {
      if (!pasted.trim()) throw new Error('วางคำตอบ (JSON) จาก Claude ก่อน')
      patch({ retrieved: parseExtraction(pasted) })
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  const box = { width: '100%', boxSizing: 'border-box' as const, borderRadius: 10, border: `1px solid ${C.border}`, fontFamily: 'monospace', fontSize: 12, padding: '12px 14px' }

  return (
    <Screen>
      <StepDots step={3} labels={FLOW_LABELS} />
      <Card>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>ดึงข้อมูลจากเอกสาร</div>
        <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 16 }}>
          ระบบจะสกัดข้อมูลสำคัญ (สรุป, Strike, Knock-In, Knock-Out, วันสังเกตการณ์, วันครบกำหนด) ผ่าน Claude Code ที่คุณล็อกอินไว้ — ไม่ต้องใช้ API key
        </div>

        <NavBtn onClick={handleAuto} disabled={loading}>
          {loading ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลอัตโนมัติ (ผ่าน Claude Code)'}
        </NavBtn>

        {error && (
          <div style={{ marginTop: 12, padding: '10px 14px', borderRadius: 8, background: C.amberLight, border: `1px solid ${C.amberBorder}`, color: C.amber, fontSize: 13, lineHeight: 1.6 }}>
            {error}
          </div>
        )}

        {data && <DataPreview data={data} />}

        {/* Manual fallback */}
        <details style={{ marginTop: 16 }}>
          <summary style={{ cursor: 'pointer', color: C.muted, fontSize: 12.5 }}>
            หรือทำเองผ่าน Claude App (กรณีอัตโนมัติใช้ไม่ได้)
          </summary>
          <div style={{ marginTop: 10 }}>
            <NavBtn onClick={handleOpen} secondary>เปิดใน Claude (คัดลอกคำสั่งให้อัตโนมัติ)</NavBtn>
            {opened && (
              <div style={{ marginTop: 10 }}>
                <details style={{ marginBottom: 10 }}>
                  <summary style={{ cursor: 'pointer', color: C.muted, fontSize: 12.5 }}>ดู/คัดลอกคำสั่งอีกครั้ง</summary>
                  <textarea readOnly value={prompt} style={{ ...box, minHeight: 120, marginTop: 8 }} />
                </details>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>วางคำตอบ (JSON) จาก Claude</div>
                <textarea
                  value={pasted}
                  onChange={(e) => setPasted(e.target.value)}
                  placeholder="วางคำตอบที่ Claude ส่งกลับมาที่นี่"
                  style={{ ...box, minHeight: 120 }}
                />
                <div style={{ marginTop: 8 }}>
                  <NavBtn onClick={handleParse} secondary>แปลงผลลัพธ์</NavBtn>
                </div>
              </div>
            )}
          </div>
        </details>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
          <NavBtn onClick={() => patch({ screen: 'chooseOutput' })} secondary>กลับสู่ขั้นตอนก่อนหน้า</NavBtn>
          <NavBtn onClick={() => patch({ screen: nextScreenFor(state) })} disabled={!data}>
            ไปยังผลลัพธ์ →
          </NavBtn>
        </div>
      </Card>
    </Screen>
  )
}

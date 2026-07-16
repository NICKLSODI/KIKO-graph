import { C } from '../theme'
import type { DroppedFile, InputMode } from '../types'

const ALLOWED = ['application/pdf', 'image/png', 'image/jpeg', 'image/webp']

function readFile(f: File, onFile: (file: DroppedFile) => void) {
  if (!ALLOWED.includes(f.type)) {
    alert('รองรับเฉพาะไฟล์ PDF, PNG, JPG, WEBP เท่านั้น')
    return
  }
  if (f.size > 20 * 1024 * 1024) {
    alert('ไฟล์ต้องไม่เกิน 20MB')
    return
  }
  const reader = new FileReader()
  reader.onload = () => onFile({ data: (reader.result as string).split(',')[1] ?? '', mediaType: f.type, name: f.name })
  reader.readAsDataURL(f)
}

export function FileDrop({
  file,
  onFile,
  onClear,
}: {
  file: DroppedFile | null
  onFile: (f: DroppedFile) => void
  onClear: () => void
}) {
  if (file) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.tealLight, border: `1px solid ${C.tealBorder}`, borderRadius: 10 }}>
        <span style={{ color: C.teal, fontSize: 14 }}>{file.name}</span>
        <button onClick={onClear} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.muted, fontSize: 18, lineHeight: 1 }}>×</button>
      </div>
    )
  }
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '20px', border: `1.5px dashed ${C.border}`, borderRadius: 10, cursor: 'pointer', color: C.muted, fontSize: 14 }}>
      นำเข้าไฟล์เอกสาร — PDF, PNG, JPG, WEBP ไม่เกิน 20MB
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) readFile(f, onFile)
        }}
        style={{ display: 'none' }}
      />
    </label>
  )
}

export function FactsheetInput({
  mode,
  text,
  link,
  file,
  onMode,
  onText,
  onLink,
  onFile,
  onClearFile,
}: {
  mode: InputMode
  text: string
  link: string
  file: DroppedFile | null
  onMode: (m: InputMode) => void
  onText: (v: string) => void
  onLink: (v: string) => void
  onFile: (f: DroppedFile) => void
  onClearFile: () => void
}) {
  const tabs: { key: InputMode; label: string }[] = [
    { key: 'link', label: 'ลิงก์อ้างอิง (Web Link)' },
    { key: 'file', label: 'ไฟล์เอกสารดิจิทัล (PDF/รูปภาพ)' },
    { key: 'text', label: 'ข้อมูลสรุปโดยย่อ' },
  ]
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onMode(t.key)}
            style={{
              padding: '8px 14px', borderRadius: 8, border: `1px solid ${mode === t.key ? C.teal : C.border}`,
              background: mode === t.key ? C.tealLight : C.white, color: mode === t.key ? C.teal : C.muted,
              fontSize: 13.5, fontWeight: mode === t.key ? 600 : 400, cursor: 'pointer',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      {mode === 'link' && (
        <div>
          <input
            value={link}
            onChange={(e) => onLink(e.target.value)}
            placeholder="https://..."
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box', marginBottom: 6 }}
          />
          {link.trim().length > 0 && !/^https?:\/\/.+/i.test(link.trim()) && (
            <div style={{ fontSize: 12, color: C.danger, marginBottom: 8 }}>กรุณาระบุลิงก์ในรูปแบบที่ถูกต้อง ต้องเริ่มต้นด้วย http:// หรือ https://</div>
          )}
        </div>
      )}
      {mode === 'file' && <FileDrop file={file} onFile={onFile} onClear={onClearFile} />}
      {mode === 'text' && (
        <textarea
          value={text}
          onChange={(e) => onText(e.target.value)}
          placeholder="กรุณาระบุข้อมูลรายละเอียดผลิตภัณฑ์ ณ ที่นี่"
          rows={6}
          style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 14, boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }}
        />
      )}
    </div>
  )
}

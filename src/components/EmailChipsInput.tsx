import { useMemo, useRef, useState } from 'react'
import { C } from '../theme'

/* Recipient picker for the "send report by email" flow. A plain textarea made
   typos invisible until Outlook bounced them (and sending is irreversible), so
   every address is committed into its own chip that is validated on the spot:
   bad ones turn coral and block the send, near-miss domains get a one-click fix,
   and duplicates collapse instead of mailing someone twice. */

const EMAIL_RE = /^[^\s@,;]+@[^\s@,;]+\.[A-Za-z]{2,}$/

export function isValidEmail(s: string): boolean {
  return EMAIL_RE.test(s)
}

/** Split pasted/typed text on the separators people actually use. */
export function parseEmails(text: string): string[] {
  return text.split(/[\s,;]+/).map((s) => s.trim().replace(/^[<"']+|[>"']+$/g, '')).filter(Boolean)
}

const BASE_DOMAINS = ['invx.com', 'gmail.com', 'hotmail.com', 'outlook.com', 'yahoo.com']

function editDistance(a: string, b: string): number {
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** "a@gmial.com" → "a@gmail.com". Only fires on a 1–2 character domain slip so
 *  legitimate uncommon domains are never flagged. */
function suggestFix(addr: string, domains: string[]): string | null {
  const at = addr.lastIndexOf('@')
  if (at < 1) return null
  const dom = addr.slice(at + 1).toLowerCase()
  if (!dom || domains.includes(dom)) return null
  let best: string | null = null
  let bestD = 99
  for (const d of domains) {
    const dist = editDistance(dom, d)
    if (dist < bestD) { bestD = dist; best = d }
  }
  const limit = Math.max(dom.length, best?.length ?? 0) > 8 ? 2 : 1
  return best && bestD <= limit ? `${addr.slice(0, at)}@${best}` : null
}

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  /** Previously used addresses — offered as one-click chips so common recipients
   *  are never retyped (and never mistyped). */
  history?: string[]
  placeholder?: string
}

export function EmailChipsInput({ value, onChange, history = [], placeholder }: Props) {
  const [draft, setDraft] = useState('')
  const [focused, setFocused] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const domains = useMemo(() => {
    const extra = history.map((h) => h.slice(h.lastIndexOf('@') + 1).toLowerCase()).filter(Boolean)
    return Array.from(new Set([...BASE_DOMAINS, ...extra]))
  }, [history])

  const invalid = value.filter((v) => !isValidEmail(v))
  const fixes = value.map((v) => (isValidEmail(v) ? null : suggestFix(v, domains)))
  const draftFix = draft.includes('@') && !isValidEmail(draft.trim()) ? suggestFix(draft.trim(), domains) : null
  const suggestions = history.filter((h) => !value.some((v) => v.toLowerCase() === h.toLowerCase())).slice(0, 6)

  // Case-insensitive add, dedup on the way in — the same person twice is a
  // silent duplicate in the Outlook draft otherwise.
  function commit(text: string): void {
    const added = parseEmails(text)
    if (!added.length) return
    const seen = new Set(value.map((v) => v.toLowerCase()))
    const next = [...value]
    for (const a of added) {
      if (seen.has(a.toLowerCase())) continue
      seen.add(a.toLowerCase())
      next.push(a)
    }
    onChange(next)
  }

  function commitDraft(): void {
    if (draft.trim()) commit(draft)
    setDraft('')
  }

  function removeAt(i: number): void {
    onChange(value.filter((_, j) => j !== i))
  }

  /** Pull a chip back into the input so a typo is corrected, not retyped. */
  function editAt(i: number): void {
    commitDraft()
    setDraft(value[i])
    onChange(value.filter((_, j) => j !== i))
    inputRef.current?.focus()
  }

  function replaceAt(i: number, addr: string): void {
    onChange(value.map((v, j) => (j === i ? addr : v)))
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter' || e.key === ',' || e.key === ';' || e.key === ' ' || e.key === 'Tab') {
      if (e.key === 'Tab' && !draft.trim()) return
      e.preventDefault()
      commitDraft()
    } else if (e.key === 'Backspace' && !draft && value.length) {
      e.preventDefault()
      editAt(value.length - 1)
    }
  }

  return (
    <div>
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6,
          minHeight: 42, padding: '7px 9px', borderRadius: 8, cursor: 'text',
          background: C.white, boxSizing: 'border-box',
          border: `1px solid ${invalid.length ? C.coralBorder : focused ? C.primary : C.border}`,
          boxShadow: focused ? `0 0 0 3px ${C.primaryLight}` : 'none',
          transition: 'border-color .12s, box-shadow .12s',
        }}
      >
        {value.map((addr, i) => {
          const ok = isValidEmail(addr)
          return (
            <span
              key={`${addr}-${i}`}
              title={ok ? 'คลิกเพื่อแก้ไข' : 'รูปแบบอีเมลไม่ถูกต้อง — คลิกเพื่อแก้ไข'}
              onClick={(e) => { e.stopPropagation(); editAt(i) }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%',
                padding: '4px 6px 4px 9px', borderRadius: 999, fontSize: 12.5, lineHeight: 1.4, cursor: 'pointer',
                background: ok ? C.primaryLight : C.coralLight,
                border: `1px solid ${ok ? C.primaryBorder : C.coralBorder}`,
                color: ok ? C.text : C.coral,
              }}
            >
              {!ok && <span aria-hidden>⚠</span>}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{addr}</span>
              <button
                type="button"
                aria-label={`ลบ ${addr}`}
                onClick={(e) => { e.stopPropagation(); removeAt(i) }}
                style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 16, height: 16, borderRadius: 999, border: 'none', padding: 0,
                  background: 'transparent', color: ok ? C.muted : C.coral, cursor: 'pointer', fontSize: 13, lineHeight: 1,
                }}
              >
                ×
              </button>
            </span>
          )
        })}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); commitDraft() }}
          onPaste={(e) => {
            const text = e.clipboardData.getData('text')
            if (!/[\s,;]/.test(text)) return
            e.preventDefault()
            commit(`${draft} ${text}`)
            setDraft('')
          }}
          placeholder={value.length ? '' : (placeholder ?? 'พิมพ์อีเมลแล้วกด Enter — วางหลายอีเมลพร้อมกันได้')}
          style={{
            flex: '1 1 160px', minWidth: 120, border: 'none', outline: 'none', background: 'transparent',
            fontSize: 13, fontFamily: 'inherit', color: C.text, padding: '4px 2px',
          }}
        />
      </div>

      {/* Typo catcher for the address still being typed. */}
      {draftFix && (
        <FixRow text={draftFix} onApply={() => { commit(draftFix); setDraft('') }} />
      )}

      {/* …and for the ones already committed. */}
      {fixes.map((fix, i) => (fix ? (
        <FixRow key={`fix-${i}`} text={fix} onApply={() => replaceAt(i, fix)} from={value[i]} />
      ) : null))}

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginTop: 6, fontSize: 11.5, lineHeight: 1.6 }}>
        <span style={{ color: invalid.length ? C.coral : C.muted }}>
          {invalid.length
            ? `⚠ มี ${invalid.length} อีเมลรูปแบบไม่ถูกต้อง — แก้ก่อนส่ง`
            : value.length
              ? `ผู้รับ ${value.length} คน`
              : 'ยังไม่มีผู้รับ'}
        </span>
        {value.length > 0 && (
          <button
            type="button"
            onClick={() => { onChange([]); setDraft('') }}
            style={{ border: 'none', background: 'transparent', color: C.muted, fontSize: 11.5, cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
          >
            ล้างทั้งหมด
          </button>
        )}
      </div>

      {suggestions.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          <span style={{ fontSize: 11.5, color: C.muted }}>เคยส่งถึง:</span>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => commit(s)}
              style={{
                padding: '3px 9px', borderRadius: 999, fontSize: 11.5, cursor: 'pointer',
                border: `1px dashed ${C.border}`, background: 'transparent', color: C.muted, fontFamily: 'inherit',
              }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function FixRow({ text, from, onApply }: { text: string; from?: string; onApply: () => void }) {
  return (
    <div style={{ marginTop: 6, fontSize: 11.5, color: C.muted, lineHeight: 1.6 }}>
      {from ? `${from} — ` : ''}หมายถึง{' '}
      <button
        type="button"
        onClick={onApply}
        style={{
          border: `1px solid ${C.amberBorder}`, background: C.amberLight, color: C.amber,
          borderRadius: 6, padding: '2px 8px', fontSize: 11.5, fontFamily: 'inherit', cursor: 'pointer',
        }}
      >
        {text}
      </button>{' '}
      หรือไม่?
    </div>
  )
}

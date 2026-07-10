import type { ReactNode } from 'react'
import { C, FONT } from '../theme'

/* ─── Layout ─── */
export function Screen({ children, maxWidth = 600 }: { children: ReactNode; maxWidth?: number }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT, padding: '32px 16px' }}>
      <div style={{ maxWidth, margin: '0 auto' }}>{children}</div>
    </div>
  )
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, padding: 28 }}>
      {children}
    </div>
  )
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 7 }}>{label}</div>
      {children}
    </div>
  )
}

/* ─── Inputs ─── */
export function SelectField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, fontSize: 14, background: C.white, boxSizing: 'border-box' }}
    >
      <option value="">เลือก...</option>
      {options.map((o) => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  )
}

export type PillOption = string | { value: string; label: string }

export function PillGroup({
  value,
  onChange,
  options,
  multi,
}: {
  value: string | string[]
  onChange: (v: never) => void
  options: PillOption[]
  multi?: boolean
}) {
  const arr = Array.isArray(value) ? value : []
  const isSelected = (v: string) => (multi ? arr.includes(v) : value === v)
  const toggle = (v: string) => {
    if (multi) onChange((arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as never)
    else onChange(v as never)
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o : o.label
        const sel = isSelected(val)
        return (
          <button
            key={val}
            onClick={() => toggle(val)}
            style={{
              padding: '8px 13px', borderRadius: 20, fontSize: 13.5, cursor: 'pointer',
              border: `1px solid ${sel ? C.teal : C.border}`, background: sel ? C.tealLight : C.white,
              color: sel ? C.teal : C.text, fontWeight: sel ? 600 : 400,
            }}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Step progress ─── */
export function StepDots({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div style={{ display: 'flex', gap: 18, marginBottom: 28, justifyContent: 'center', flexWrap: 'wrap' }}>
      {labels.map((l, i) => {
        const active = i + 1 === step
        return (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, opacity: active ? 1 : 0.4 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: active ? C.teal : C.muted, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, color: active ? C.navy : C.muted, fontWeight: active ? 600 : 400 }}>{l}</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Navigation button ─── */
export function NavBtn({
  onClick,
  disabled,
  children,
  secondary,
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  secondary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8,
        border: secondary ? `1px solid ${C.border}` : 'none',
        background: secondary ? C.white : disabled ? C.border : C.teal,
        color: secondary ? C.muted : disabled ? C.muted : C.white,
        fontSize: 14, fontWeight: secondary ? 400 : 600, cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

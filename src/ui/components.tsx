import { Fragment, useEffect, useState, type ReactNode } from 'react'
import { C, FONT, TONES, currentTheme, toggleTheme, THEME_EVENT, type Theme, type Tone } from '../theme'
import { FLOW_STEPS } from '../constants'
import { IconCheck, IconFileText } from './icons'

/* ─── Theme toggle ─── */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>(() => currentTheme())
  useEffect(() => {
    const onChange = () => setThemeState(currentTheme())
    window.addEventListener(THEME_EVENT, onChange)
    return () => window.removeEventListener(THEME_EVENT, onChange)
  }, [])
  const dark = theme === 'dark'
  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={dark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
      title={dark ? 'โหมดสว่าง' : 'โหมดมืด'}
    >
      {dark ? '☀️' : '🌙'}
    </button>
  )
}

/* ─── Layout ─── */
export function AppHeader() {
  return (
    <header className="app-header">
      <div className="brand" onClick={() => location.reload()}>
        <span className="brand-mark">SN·Desk</span>
        <span className="brand-sub">Structured Note Summary</span>
      </div>
      <ThemeToggle />
    </header>
  )
}

export function Screen({ children, maxWidth = 600 }: { children: ReactNode; maxWidth?: number }) {
  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: FONT, padding: '24px 16px 40px' }}>
      <AppHeader />
      <div style={{ maxWidth, margin: '0 auto' }}>{children}</div>
    </div>
  )
}

export function Card({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return <div className="card" style={style}>{children}</div>
}

export function Field({ label, children, done, optional }: { label: string; children: ReactNode; done?: boolean; optional?: boolean }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 13.5, fontWeight: 600, color: C.text, marginBottom: 7 }}>
        <span>{label}</span>
        {optional && <span style={{ fontSize: 11.5, fontWeight: 400, color: C.muted }}>(ไม่บังคับ)</span>}
        {done && <span aria-hidden style={{ color: C.teal, fontSize: 12 }}>✓</span>}
      </div>
      {children}
    </div>
  )
}

/* Section marker inside a form card — overline + rule */
export function FormSection({ title }: { title: string }) {
  return (
    <div className="section-h" style={{ margin: '22px 0 12px' }}>
      <span className="overline">{title}</span>
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

export type PillOption = string | { value: string; label: ReactNode }

export function PillGroup({
  value,
  onChange,
  options,
  multi,
  tone,
}: {
  value: string | string[]
  onChange: (v: never) => void
  options: PillOption[]
  multi?: boolean
  /** Tinted selected state (light bg + toned text) instead of solid primary. */
  tone?: Tone
}) {
  const arr = Array.isArray(value) ? value : []
  const isSelected = (v: string) => (multi ? arr.includes(v) : value === v)
  const toggle = (v: string) => {
    if (multi) onChange((arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as never)
    else onChange(v as never)
  }
  const t = tone ? TONES[tone] : null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value
        const label = typeof o === 'string' ? o : o.label
        const sel = isSelected(val)
        return (
          <button
            key={val}
            className="btn-ghost"
            aria-pressed={sel}
            onClick={() => toggle(val)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 13px', borderRadius: 20, fontSize: 13.5, cursor: 'pointer',
              border: `1px solid ${sel ? (t ? t.main : C.primary) : C.border}`,
              background: sel ? (t ? t.light : C.primary) : C.white,
              color: sel ? (t ? t.main : C.onPrimary) : C.text,
              fontWeight: sel ? 600 : 400,
            }}
          >
            {multi && sel ? '✓' : ''}{label}
          </button>
        )
      })}
    </div>
  )
}

/* ─── Option cards — for choices whose labels are too long for pills.
   Single-select renders radio indicators, multi renders checkboxes.
   A trailing "(...)" in the label becomes a muted sub-line. ─── */
function splitOptionLabel(label: string): { main: string; sub?: string } {
  const m = label.match(/^(.+?)\s*\(([^()]+(?:\([^()]*\)[^()]*)*)\)\s*$/)
  return m ? { main: m[1], sub: m[2] } : { main: label }
}

export function OptionCards({
  value,
  onChange,
  options,
  multi,
}: {
  value: string | string[]
  onChange: (v: never) => void
  options: (string | { value: string; label: string })[]
  multi?: boolean
}) {
  const arr = Array.isArray(value) ? value : []
  const isSelected = (v: string) => (multi ? arr.includes(v) : value === v)
  const toggle = (v: string) => {
    if (multi) onChange((arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]) as never)
    else onChange(v as never)
  }
  return (
    <div role={multi ? 'group' : 'radiogroup'} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((o) => {
        const val = typeof o === 'string' ? o : o.value
        const rawLabel = typeof o === 'string' ? o : o.label
        const { main, sub } = splitOptionLabel(rawLabel)
        const sel = isSelected(val)
        return (
          <button
            key={val}
            className="btn-ghost"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={sel}
            onClick={() => toggle(val)}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 11, width: '100%', textAlign: 'left',
              padding: '11px 14px', borderRadius: 10, cursor: 'pointer',
              border: `1px solid ${sel ? C.primary : C.border}`,
              background: sel ? C.primaryLight : C.white,
            }}
          >
            <span
              aria-hidden
              style={{
                width: 16, height: 16, flexShrink: 0, marginTop: 3.5,
                borderRadius: multi ? 4 : '50%',
                border: `1.5px solid ${sel ? C.primary : C.muted}`,
                background: sel ? C.primary : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              {sel && (multi
                ? <span style={{ color: C.onPrimary, fontSize: 10, fontWeight: 700, lineHeight: 1 }}>✓</span>
                : <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.onPrimary }} />)}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 14, fontWeight: sel ? 600 : 500, color: sel ? C.primary : C.text, lineHeight: 1.5 }}>{main}</span>
              {sub && <span style={{ display: 'block', fontSize: 12.5, color: C.muted, lineHeight: 1.5 }}>{sub}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Icon option grid — compact cards with a stroke-icon tile, short
   label, and optional sub-line. For single-select choices that read
   faster as a horizontal grid than as stacked text rows. ─── */
export function IconOptions({
  value,
  onChange,
  options,
  minWidth = 160,
  multi,
}: {
  /** Selected value (single) or values (multi). */
  value: string | string[]
  /** Fired with the clicked value — in multi mode the caller owns the toggle. */
  onChange: (v: string) => void
  options: { value: string; icon: ReactNode; label: string; sub?: string; tone?: Tone }[]
  minWidth?: number
  multi?: boolean
}) {
  const isSelected = (v: string) => (Array.isArray(value) ? value.includes(v) : value === v)
  return (
    <div role={multi ? 'group' : 'radiogroup'} style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))`, gap: 8 }}>
      {options.map((o) => {
        const sel = isSelected(o.value)
        const t = TONES[o.tone ?? 'primary']
        return (
          <button
            key={o.value}
            className="btn-ghost"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={sel}
            onClick={() => onChange(o.value)}
            style={{
              position: 'relative',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              padding: '14px 10px 12px', borderRadius: 10, cursor: 'pointer', textAlign: 'center',
              border: `1px solid ${sel ? t.main : C.border}`, background: sel ? t.light : C.white,
            }}
          >
            {multi && sel && (
              <span
                aria-hidden
                style={{
                  position: 'absolute', top: 6, right: 6, width: 16, height: 16, borderRadius: '50%',
                  background: t.main, color: t.light, display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
              </span>
            )}
            <span
              aria-hidden
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: sel ? t.main : C.bg,
                color: sel ? t.light : C.muted,
                border: `1px solid ${sel ? t.main : C.border}`,
              }}
            >
              {o.icon}
            </span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13, fontWeight: sel ? 600 : 500, color: sel ? t.main : C.text, lineHeight: 1.4 }}>{o.label}</span>
              {o.sub && <span style={{ display: 'block', fontSize: 11, color: C.muted, lineHeight: 1.35 }}>{o.sub}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

/* ─── Stepped slider — for ordinal scales (age band, knowledge level,
   risk appetite). Tick labels double as click targets; the track is
   muted until the user makes a choice. ─── */
export function SliderField({
  value,
  onChange,
  options,
  ariaLabel,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string; sub?: string; tone?: Tone }[]
  ariaLabel?: string
}) {
  const idx = options.findIndex((o) => o.value === value)
  const chosen = idx !== -1
  const set = (i: number) => onChange(options[i].value)
  const accent = chosen ? TONES[options[idx].tone ?? 'primary'].main : C.muted
  return (
    <div style={{ padding: '2px 4px 0' }}>
      <input
        type="range"
        min={0}
        max={options.length - 1}
        step={1}
        value={chosen ? idx : 0}
        aria-label={ariaLabel}
        aria-valuetext={chosen ? options[idx].label : 'ยังไม่ได้เลือก'}
        onChange={(e) => set(+e.target.value)}
        onClick={(e) => set(+(e.target as HTMLInputElement).value)}
        style={{ width: '100%', accentColor: accent, opacity: chosen ? 1 : 0.55, cursor: 'pointer', margin: 0 }}
      />
      <div style={{ display: 'flex', marginTop: 2 }}>
        {options.map((o, i) => {
          const sel = i === idx
          const selColor = TONES[o.tone ?? 'primary'].main
          const align = i === 0 ? 'left' : i === options.length - 1 ? 'right' : 'center'
          return (
            <button
              key={o.value}
              onClick={() => set(i)}
              style={{
                flex: 1, background: 'none', border: 'none', padding: '2px 0', cursor: 'pointer',
                textAlign: align as 'left' | 'center' | 'right', lineHeight: 1.35,
              }}
            >
              <span style={{ display: 'block', fontSize: 12.5, fontWeight: sel ? 600 : 400, color: sel ? selColor : C.muted }}>{o.label}</span>
              {o.sub && <span style={{ display: 'block', fontSize: 10.5, color: sel ? selColor : C.muted, opacity: 0.85 }}>{o.sub}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Step progress — numbered stepper with connectors. Completed steps
   show a check and (when onStepClick is given) navigate back. ─── */
export function Stepper({ step, labels, onStepClick }: { step: number; labels: string[]; onStepClick?: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'center', maxWidth: 560, margin: '0 auto 26px' }}>
      {labels.map((l, i) => {
        const n = i + 1
        const done = n < step
        const current = n === step
        const clickable = done && !!onStepClick
        return (
          <Fragment key={l}>
            {i > 0 && (
              <div
                aria-hidden
                style={{ flex: 1, height: 2, borderRadius: 1, margin: '13px 4px 0', minWidth: 14, background: n <= step ? C.primary : C.border }}
              />
            )}
            <button
              onClick={clickable ? () => onStepClick?.(n) : undefined}
              disabled={!clickable}
              aria-current={current ? 'step' : undefined}
              title={clickable ? `กลับไปขั้นตอน ${l}` : undefined}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                background: 'none', border: 'none', padding: 0, width: 92,
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              <span
                style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12.5, fontWeight: 600,
                  background: done || current ? C.primary : C.white,
                  color: done || current ? C.onPrimary : C.muted,
                  border: `1px solid ${done || current ? C.primary : C.border}`,
                  boxShadow: current ? `0 0 0 4px ${C.primaryLight}` : 'none',
                }}
              >
                {done ? <IconCheck size={13} strokeWidth={2.5} /> : n}
              </span>
              <span
                style={{
                  fontSize: 11.5, lineHeight: 1.3, textAlign: 'center',
                  color: current ? C.primary : done ? C.text : C.muted,
                  fontWeight: current ? 600 : 400,
                }}
              >
                {l}
              </span>
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}

/** @deprecated legacy wizard screens only — new code uses Stepper/FlowShell. */
export function StepDots({ step, labels }: { step: number; labels: string[] }) {
  return <Stepper step={step} labels={labels} />
}

/* ─── Flow shell — the shared frame for every wizard screen: stepper,
   page title/subtitle, and a product-context chip so the user always
   knows which product they are working on. ─── */
export function FlowShell({
  step,
  title,
  subtitle,
  product,
  actions,
  back,
  maxWidth = 680,
  children,
  onStepClick,
}: {
  /** 1-based step in FLOW_STEPS; omit for pages outside the script flow. */
  step?: number
  title: string
  subtitle?: string
  /** Product code/name being worked on — rendered as a context chip. */
  product?: string | null
  /** Extra header controls rendered on the right. */
  actions?: ReactNode
  /** Back navigation. Every screen puts it in the SAME place — top-left, above the title —
   *  so there is never a second back button at the bottom of the page to hunt for. */
  back?: { label: string; onClick: () => void }
  maxWidth?: number
  children: ReactNode
  onStepClick?: (n: number) => void
}) {
  return (
    <Screen maxWidth={maxWidth}>
      {step != null && <Stepper step={step} labels={FLOW_STEPS} onStepClick={onStepClick} />}
      {back && (
        <div style={{ marginBottom: 12 }}>
          <button
            className="btn-ghost"
            onClick={back.onClick}
            style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: C.white, color: C.text, fontSize: 12.5, cursor: 'pointer' }}
          >
            ← {back.label}
          </button>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 19, fontWeight: 600, color: C.text }}>{title}</div>
          {subtitle && <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{subtitle}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {product && (
            <span
              className="num"
              title="ผลิตภัณฑ์ที่กำลังทำงานอยู่"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: C.text,
                background: C.white, border: `1px solid ${C.border}`, borderRadius: 8, padding: '5px 10px',
              }}
            >
              <IconFileText size={13} />{product}
            </span>
          )}
          {actions}
        </div>
      </div>
      {children}
    </Screen>
  )
}

/* ─── Flow nav — the forward bar every wizard screen uses. The primary action is always
   bottom-right ("<action> →"), with an optional hint explaining why next is disabled.
   Sticky, so it never scrolls out of reach. Going BACK is not here: it lives top-left in
   FlowShell on every screen, so there is exactly one place to look for it. ─── */
export function FlowNav({
  next,
  extra,
}: {
  next?: { label: string; onClick: () => void; disabled?: boolean; hint?: string }
  extra?: ReactNode
}) {
  return (
    <div className="flow-nav">
      <div />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {next?.disabled && next.hint && (
          <span style={{ fontSize: 12.5, color: C.muted }}>{next.hint}</span>
        )}
        {extra}
        {next && (
          <NavBtn onClick={next.onClick} disabled={next.disabled}>{next.label} →</NavBtn>
        )}
      </div>
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
      className={secondary ? 'btn-secondary' : 'btn-primary'}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 8,
        border: secondary ? `1px solid ${C.border}` : '1px solid transparent',
        background: secondary ? C.white : C.primary,
        color: secondary ? C.muted : C.onPrimary,
        fontSize: 14, fontWeight: secondary ? 400 : 600, cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  )
}

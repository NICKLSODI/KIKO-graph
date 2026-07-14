// Design system: every value is a CSS custom property (defined per-theme in
// index.css), so all inline styles across the app restyle automatically when
// the data-theme attribute flips. Do NOT put raw hex here — put it in index.css.
export const C = {
  navy: 'var(--c-navy)',
  teal: 'var(--c-teal)',
  tealLight: 'var(--c-teal-light)',
  tealBorder: 'var(--c-teal-border)',
  coral: 'var(--c-coral)',
  coralLight: 'var(--c-coral-light)',
  coralBorder: 'var(--c-coral-border)',
  amber: 'var(--c-amber)',
  amberLight: 'var(--c-amber-light)',
  amberBorder: 'var(--c-amber-border)',
  bg: 'var(--c-bg)',
  border: 'var(--c-border)',
  text: 'var(--c-text)',
  muted: 'var(--c-muted)',
  white: 'var(--c-surface)', // semantic "surface" — dark charcoal in dark mode
  danger: 'var(--c-danger)',
} as const

export const FONT = "'IBM Plex Sans Thai Looped', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, sans-serif"
export const FONT_MONO = "'IBM Plex Mono', ui-monospace, 'Cascadia Mono', monospace"

/* ─── Theme switching ─── */

export type Theme = 'light' | 'dark'
const STORAGE_KEY = 'kiko-theme'
export const THEME_EVENT = 'kiko-themechange'

export function currentTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme) || 'light'
}

export function setTheme(theme: Theme, persist = true): void {
  document.documentElement.dataset.theme = theme
  if (persist) localStorage.setItem(STORAGE_KEY, theme)
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: theme }))
}

export function toggleTheme(): void {
  setTheme(currentTheme() === 'dark' ? 'light' : 'dark')
}

/** Call once before render: apply the saved theme, else follow the system
 *  preference (and keep following it live until the user picks manually). */
export function initTheme(): void {
  const saved = localStorage.getItem(STORAGE_KEY) as Theme | null
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  setTheme(saved ?? (media.matches ? 'dark' : 'light'), false)
  media.addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) setTheme(e.matches ? 'dark' : 'light', false)
  })
}

/** Literal (non-var) colors for canvas renderers — canvases can't resolve CSS
 *  variables, so read the computed values off the root element instead. */
export function chartColors(): { text: string; mark: string; markText: string } {
  const s = getComputedStyle(document.documentElement)
  return {
    text: s.getPropertyValue('--c-muted').trim() || '#6B6A63',
    mark: s.getPropertyValue('--c-mark').trim() || 'rgba(237,161,0,0.85)',
    markText: s.getPropertyValue('--c-mark-text').trim() || '#B07800',
  }
}

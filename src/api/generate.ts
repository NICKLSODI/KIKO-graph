const BACKEND_URL = 'http://localhost:8000'

export interface GenerateFile {
  name: string
  mediaType: string
  base64: string
}

/** Login/health state of the local Claude Code CLI the whole app runs on. */
export interface AiHealth {
  available: boolean
  auth: 'ok' | 'expired' | 'no-cli' | 'unknown' | 'unchecked'
  reason: string | null
  fix: string | null
  /** Backend unreachable entirely (servers not started) — distinct from "logged out". */
  offline: boolean
}

/** Check whether the AI is actually usable BEFORE work is started. Never throws — a dead
 *  backend is itself an answer the UI has to show. `force` re-probes after a fresh login. */
export async function checkAiHealth(force = false): Promise<AiHealth> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/generate/health?force=${force ? 'true' : 'false'}`)
    const data = await res.json()
    return {
      available: !!data?.available,
      auth: data?.auth ?? 'unknown',
      reason: data?.reason ?? null,
      fix: data?.fix ?? null,
      offline: false,
    }
  } catch {
    return {
      available: false,
      auth: 'unknown',
      reason: 'เชื่อมต่อระบบเบื้องหลังไม่ได้ (localhost:8000) — เซิร์ฟเวอร์อาจยังไม่ได้เปิด',
      fix: 'ปิดโปรแกรมด้วย stop-sndesk.ps1 แล้วเปิดใหม่ด้วย start-sndesk.ps1',
      offline: true,
    }
  }
}

/** Opens the Claude login flow on the machine running the backend (a console window +
 *  browser), so the user never has to find PowerShell or remember a command. Resolves as
 *  soon as the window is up — the login itself finishes in the browser, after which the
 *  user presses "ตรวจสอบอีกครั้ง". Throws if the window could not be opened at all. */
export async function startClaudeLogin(): Promise<void> {
  const res = await fetch(`${BACKEND_URL}/api/generate/login`, { method: 'POST' })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.detail ?? `เปิดหน้าต่างล็อกอินไม่สำเร็จ (${res.status})`)
}

/** True when a thrown error is "the Claude login died", so callers can stop a batch early
 *  instead of retrying every remaining chunk against a session that cannot work. */
export function isAuthError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return /เข้าสู่ระบบ Claude หมดอายุ|OAuth|session expired|authenticate|unauthorized|ไม่พบโปรแกรม Claude Code/i.test(msg)
}

// Raw CLI errors are English and meaningless to a sales desk ("OAuth session expired and
// could not be refreshed"). Translate the ones that are actually actionable into a plain
// Thai sentence that says what to DO, and keep the original only as a technical tail.
const ERROR_HINTS: { match: RegExp; text: string }[] = [
  { match: /OAuth|session expired|could not be refreshed|failed to authenticate|unauthorized|401/i,
    text: 'การเข้าสู่ระบบ Claude หมดอายุ — กดปุ่ม "เข้าสู่ระบบ Claude" บนแถบแจ้งเตือนด้านบน ล็อกอินในเบราว์เซอร์ให้เสร็จ แล้วกด "ตรวจสอบอีกครั้ง"' },
  { match: /timeout|ใช้เวลานานเกินไป/i,
    text: 'เอกสาร/ข้อความยาวเกินไป AI ทำไม่ทันในเวลาที่กำหนด — ลองแบ่งวางเป็น 2-3 รอบ' },
  { match: /ไม่พบโปรแกรม Claude Code|ไม่พบคำสั่ง claude/i,
    text: 'เครื่องนี้ยังไม่มีโปรแกรม Claude Code — ดู MAINTENANCE.md อาการ B' },
  { match: /เชื่อมต่อระบบเบื้องหลังไม่ได้|Failed to fetch|NetworkError/i,
    text: 'เซิร์ฟเวอร์เบื้องหลังไม่ทำงาน — ปิดด้วย stop-sndesk.ps1 แล้วเปิดใหม่ด้วย start-sndesk.ps1' },
  { match: /429|rate limit/i,
    text: 'เรียกข้อมูลถี่เกินไป ผู้ให้บริการจำกัดชั่วคราว — รอ 2-3 นาทีแล้วลองใหม่' },
]

/** Turn any error into a sentence a non-technical user can act on. */
export function friendlyError(err: unknown): string {
  const raw = (err instanceof Error ? err.message : String(err)).trim()
  const hint = ERROR_HINTS.find((h) => h.match.test(raw))
  return hint ? hint.text : raw
}

/**
 * Generates text via the local Claude Code CLI (backend `POST /api/generate`).
 * Uses the machine's own `claude login` — no API key. Only works while the
 * Python backend is running on a machine where Claude Code is installed + logged in.
 * Pass `file` to have Claude Code read a document (e.g. a PDF term sheet).
 */
export async function generate(prompt: string, file?: GenerateFile): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(file ? { prompt, file } : { prompt }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.detail ?? `เรียก Claude Code ไม่สำเร็จ (${res.status})`)
  const text: string = data?.text ?? ''
  if (!text) throw new Error('Claude Code ไม่ได้ส่งเนื้อหากลับมา')
  return text
}

// Cache text-only replies by prompt hash. A structured-note script depends only on its
// prompt (product facts + persona + format), so regenerating the same tab, or flipping a
// persona field back to a previous value, should never pay the model again. Each `claude -p`
// call carries the full Claude Code CLI system prompt as fixed overhead, so avoiding a
// redundant call is a real token saving, not just latency.
const GENERATE_CACHE_PREFIX = 'kiko-generate:'

async function promptHash(prompt: string): Promise<string> {
  const data = new TextEncoder().encode(prompt)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** generate() with a localStorage cache keyed by the prompt. Text prompts only (no file).
 *  Pass `force: true` to bypass the cache and overwrite it with a fresh reply. */
export async function generateCached(prompt: string, force = false): Promise<string> {
  const key = GENERATE_CACHE_PREFIX + (await promptHash(prompt))
  if (!force) {
    try {
      const hit = localStorage.getItem(key)
      if (hit) return hit
    } catch { /* ignore */ }
  }
  const text = await generate(prompt)
  try {
    localStorage.setItem(key, text)
  } catch {
    // quota full — evict this module's entries and retry once
    try {
      Object.keys(localStorage).filter((k) => k.startsWith(GENERATE_CACHE_PREFIX)).forEach((k) => localStorage.removeItem(k))
      localStorage.setItem(key, text)
    } catch { /* give up silently */ }
  }
  return text
}

export type ExtractSource =
  | { kind: 'text'; text: string }
  | { kind: 'link'; link: string }
  | { kind: 'file'; file: GenerateFile }

/**
 * Extracts term-sheet data via NotebookLM (backend `POST /api/extract-notebooklm`),
 * instead of Claude. Uploads the document as a notebook source, asks `instructions`
 * grounded on it, then the backend deletes the source again.
 */
export async function extractViaNotebookLM(instructions: string, source: ExtractSource): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/api/extract-notebooklm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instructions, source }),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data?.detail ?? `เรียก NotebookLM ไม่สำเร็จ (${res.status})`)
  const text: string = data?.text ?? ''
  if (!text) throw new Error('NotebookLM ไม่ได้ส่งเนื้อหากลับมา')
  return text
}

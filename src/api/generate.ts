const BACKEND_URL = 'http://localhost:8000'

export interface GenerateFile {
  name: string
  mediaType: string
  base64: string
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

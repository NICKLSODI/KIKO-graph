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

// Opens claude.ai in a new tab and copies the prompt to the clipboard so the user
// can paste it straight into a new chat. This is how the app "uses the Claude app"
// without an API key — a human bridges the one step the browser cannot do itself.
export function openInClaude(prompt: string): void {
  // Open first (synchronous, inside the click gesture) so popup blockers allow it.
  window.open('https://claude.ai/new', '_blank', 'noopener')
  // Best-effort copy; ignore failures (e.g. clipboard permission denied).
  navigator.clipboard?.writeText(prompt).catch(() => {})
}

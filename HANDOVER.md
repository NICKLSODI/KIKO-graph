# SN·Desk (KIKO-graph) — Final Project Handover

> Final handover. Covers what the product is, what works, how it's built, how to run it, and what's left.
> Last updated: 2026-07-30 · Branch: `main` (`optimize-1` merged via PR #1/#2). Working tree has uncommitted UI/engine/backend updates from the 2026-07-27→30 session — see §8.

---

## 1. One-liner

**SN·Desk — Structured Note Summary** (formerly "KIKO·Copilot" / KIKO-graph) is an AI copilot for InnovestX's Investment Consultant (IC) team. It batch-reads structured-product term sheets, backtests them against real historical prices, scores and ranks them on a dashboard — and from any product it generates a client-facing sales script, a compliance-styled factsheet, and an auto-drawn payoff chart.

Runs as a local web app today (AI powered by the machine's Claude subscription — no API key, no cloud dependency).

---

## 2. The problem it solves

Structured products (KIKO, FCN, Twin Win, Sharkfin, Booster, BEN, etc.) are hard to explain. Each has strike / knock-in / knock-out levels, observation dates, coupon rules, multiple underlyings. Two pain points:

1. **Every Monday a stack of new term sheets arrives** — no fast way to screen/compare them.
2. **Explaining one product** to a client is slow and inconsistent.

SN·Desk attacks both: dashboard first (screen the batch), generators second (explain the pick).

---

## 3. App flow (unified 2026-07-15 — dashboard IS the app)

The old standalone single-product wizard was removed from routing. Entry screen = the Backtest & Rank dashboard (`INITIAL.screen = 'backtest'`; `App.tsx` routes only `backtest` / `persona` / `scriptConfig` / `scriptResults` / `factsheet`).

```
Drop term sheets (files/image, web link, or one big desk-listing paste)
  → AI extract (one OR MANY NoteProducts per source — a term-sheet table with several
    baskets yields one product per row; big pastes auto-chunked). Selling Code is never
    used as the product name/code.
  → Backtest vs real Yahoo closing prices (worst-of KI/KO, window 6M/1Y/2Y)
  → Score & rank — profiles All (default) / Aggressive / Save; default order = lowest KI%
    then lowest Strike%. Score column + detail score box hidden under "All". KIKO ONLY
    ranked (business rule: "we usually sell KIKO"); other structures in an unranked table,
    still get backtest/detail/graph.
  → Detail view per product (structure-aware — non-KIKO shows PR / Upper-Lower KO /
    Min Redemption / KO Rebate / Min Coupon / Redemption upon from variantFields, and hides
    the KI/Buffer tiles when the note has no KI):
       • Graph drill-down: one candle chart per underlying, Strike/KI/KO lines (KI=red,
         KO=green) with % + price on each label, KO-observation date marks, 📌 fixing marker
       • 🎯 สร้าง Script  → persona → output config → script results (call/LINE/email)
       • 📄 สร้าง Factsheet → A4 factsheet, th/en toggle, print/PDF/HTML download
  → Export: CSV (Excel-safe UTF-8 BOM) + per-product PDF/JPG + one-click Outlook auto-email
    (ranking images + ZIP, auto-retries if Outlook not yet ready)
```

Dashboard survives navigation (module-level `RESUME` snapshot + sessionStorage on refresh). "วิเคราะห์ชุดใหม่" resets.

---

## 4. Status — what works (all verified)

| Piece | Status |
|-------|--------|
| Batch extract → backtest → score → rank → drill-down | ✅ End-to-end (real tickers: AMD/MRVL, ORCL/INTC, AMZN) |
| Multi-basket extraction from ONE file/image/link | ✅ `extractNotesFromSource` returns an array — a term-sheet table with N underlying rows → N products (one worst-of basket each) |
| Big-paste chunked extraction (30+ products, one paste) | ✅ Splits on `===` separators, chunks ≤5, concurrent pool of 3, per-chunk cache |
| Window selector (6M/1Y/2Y), volatility as scoring dimension | ✅ Done (Vol no longer a rank-table column, still scored) |
| Correct backtest semantics (KIKO) | ✅ Strike/KI/KO levels anchored to real `fixingDate`; breaches checked over the FULL selected window (deliberate — screens fresh notes against history) |
| Risk profiles — All (default) / Aggressive / Save, live re-rank | ✅ Balanced retained internally for the export "best-fit customer" column only; Custom-weights UI removed |
| Ranking table UX | ✅ KI / KO / Strike split into own sortable columns; default sort KI↑ then Strike↑; colour cue for Strike ≤ 90% and KI < 60%; sortable headers show a ⇅ hint; Buffer + Vol columns dropped; Score column hidden under "All" |
| Structure-aware detail page | ✅ tiles + "เงื่อนไขผลิตภัณฑ์" adapt per structure from `variantFields` (PR, Upper/Lower KO, Min Redemption, KO Rebate, Min Coupon, Bonus, Coupon Barrier, Settlement, Redemption upon); KI/Buffer/Strike/KI-obs hidden when absent |
| Outlook auto-email with auto-retry | ✅ Sends ranking images + ZIP via Classic Outlook COM; auto-retries 3× (5s apart) on the "Outlook not ready / login" 503 without rebuilding attachments |
| Factsheet module (memie's 26-template generator) | ✅ MERGED into `src/features/factsheet/` — verbatim port, 26/26 regression passes, real-deal KIKO render pixel-matched to reference PNGs |
| Notional input → factsheet (Min.Subscription, Net Interest/Month after 15% WHT, schedule column) | ✅ Done (gated to monthly-THB deals to avoid wrong period/tax) |
| Unified 13-key product classifier | ✅ One classifier (`detectVariant` in `classify.js`) computes `structureType` for dashboard AND factsheet — the two-classifier disagreement bug is gone |
| Script generation (persona + format aware) with prompt cache | ✅ `generateCached` SHA-256 → localStorage; repeat click = 0 tokens; "สร้างใหม่" forces regen |
| Auto-drawn payoff candle chart | ✅ Pure code from extracted numbers, no AI |
| Light/dark theme, InnovestX look (violet primary, green=pass, red=knocked) | ✅ Both themes verified |
| CSV + print/PDF export (handles unranked non-KIKO) | ✅ Done |
| AI via local Claude Code (`claude -p`), copy-paste fallback in UI | ✅ Verified end-to-end |

### Not built / known gaps
- **Per-structure BACKTEST math** — the detail *display* is now structure-aware, but the backtest breach logic is still generic KIKO worst-of for every structure. Concretely wrong for non-KIKO: a **Bearish Sharkfin** KO barrier is a *downside* level but the engine checks `px >= koLevel` (upside only); a **Twin Win Sharkfin** Upper/Lower KO pair is not modeled (single `koPct`, usually null → never knocks); no-KI structures always read "Pass". So non-KIKO verdict/score is not meaningful yet.
- **Non-KIKO ranking** — still intentionally unranked (business rule). Chart barriers are also still single-direction/single-level (no bearish/dual barrier lines).
- **Scoring differentiation** — Aggressive/Save orderings can barely differ. Diagnosed: one product frequently Pareto-dominates all dimensions. Proposed (not built): combined Buffer÷Volatility "safety score". User said hold off.
- **Hosted deployment** — local-only by design today (Claude Code must live on the backend host).

---

## 5. Architecture

**Frontend:** React 18 + TypeScript + Vite. Charts: `lightweight-charts`. State: small `src/store.ts`. Design source of truth: `memie/copilot_demo_PHASE1_FINAL.jsx` (palette, flow, components). Theming via CSS vars in `src/index.css` + `C.*` tokens in `src/theme.ts`.

**Backend:** Python FastAPI (`backend/main.py`):
- `GET /candles-yahoo?market=foreign|thai` — free Yahoo historical closes (Thai tickers get `.BK`).
- `POST /api/generate` — the AI call (see below). `GET /api/generate/health` reports whether `claude` binary found. Subprocess timeout = **300s** (`CLAUDE_TIMEOUT_SECONDS`) — raised from 180 because the image/scanned-PDF path uses Claude's Read tool (agentic loop + cold start) and was timing out on dense term-sheet images.
- `POST /api/extract-notebooklm` — alternate extraction path via NotebookLM CLI.
- `POST /api/email-send` — Classic Outlook COM auto-send (`.Send`, irreversible) via a PowerShell bridge; returns 503 "เปิด Outlook ไม่ได้ / login ไม่เสร็จ" when Outlook can't be attached/launched within its ~60s poll. `GET /api/email-send/health` probes whether an Outlook instance is up. **Windows-only.**

**The AI (differentiator):** backend shells out to the machine's **local Claude Code login** — `claude -p --output-format text` via subprocess, prompt on stdin, `ANTHROPIC_BASE_URL` stripped from child env so it uses `~/.claude/.credentials.json` subscription creds. **No Anthropic API key, no per-call billing.** File/PDF input: backend writes to temp dir, runs `claude -p --allowedTools Read WebFetch --add-dir <tmp>`. Trade-off: backend host must have Claude Code installed + logged in.

**Extraction (`src/features/backtest/extract.ts`):** `extractNotesFromSource(source, mkId)` is the single entry — text routes to the chunked path; a file/image/link uses the batch instructions + array parse, so ONE document can yield MANY products (each table row = a worst-of basket). Rule in the prompt: "Selling Code"/"รหัสขาย" (e.g. `0624304`) must never become `productCode` or the display name — a code-less product falls back to a `KIKO (BDMS/MTC)`-style label built from structure + tickers.

**Caching:** extraction AND script generation cached in localStorage by SHA-256 hash (`kiko-generate:` for scripts, `kiko-extract:` for extraction). Schema changes auto-invalidate (hash includes the instruction text — so adding a `variantFields` key re-extracts everything).

**Backtest engine (`src/features/backtest/engine.ts`) — final semantics (important):**
- `initialPrice` = close on the product's real `fixingDate` (from full uncropped history) → Strike/KI/KO price levels derive from it. Never window-relative (that was a fixed bug — caused false "Pass").
- `knockedIn` = ANY underlying closed ≤ its KI level **anywhere in the selected window** (window start, no fixing-date floor — deliberate, per user: fresh notes must be stress-tested against history or everything trivially passes).
- `knockedOut` = on some KO observation date, ALL underlyings ≥ their KO level; future obs dates (beyond last candle) never count. ⚠️ Upside-only (`px >= koLevel`) and single-level — correct for KIKO, wrong for bearish/dual-barrier structures (see §4 gaps).
- Volatility = annualised, worst-of, from window daily log returns.
- Chart level lines: KI = red, KO = green (swapped 2026-07 per desk), Strike = blue; each label carries "`<name> <pct>%, <price>`". Barrier %s shown on the label come from the product's `strikePct/kiPct/koPct` passed into `levelsAndMarksFor`.

**Classifier:** `src/features/factsheet/classify.js` — pure, zero-dep `detectVariant()` over 13 registry keys (`kiko, twin_win, bullish_sharkfin, bearish_sharkfin, booster, booster_prot, ben, ben_cash, ben_prot, fcn, fixed_rate_note, three_musketeers, lookback_dispersion`). extract.ts computes `structureType` from it (AI no longer guesses the type). Display via `STRUCTURE_TYPE_LABELS`. Kept separate from `factsheet_generator.js` so the render engine stays out of the main bundle (main ≈453kB, factsheet lazy chunk loaded with the Factsheet screen).

**Factsheet module:** memie's `factsheet_generator.js` / `logo.js` / `deal_factsheet.js` copied VERBATIM into `src/features/factsheet/` with `.d.ts` files; her `termsheet_parser.js` deliberately NOT ported (our AI extraction replaces it). Compliance rules preserved: never fabricate (missing = "—"), no ellipsis on financial text, IC override select always present. Unmapped types fall back to illustrative template with an orange banner (green "จากข้อมูลจริง" for real-deal renders). ⚠️ If re-syncing from memie's newer files: re-apply the kikoData/kikoSchedule notional additions + `WHT_RATE`/`_money`/`_periodsPerYear` helpers in `deal_factsheet.js`.

---

## 6. Repo map

```
src/
  App.tsx                     routes backtest/persona/scriptConfig/scriptResults/factsheet
  store.ts                    app state (incl. notional)
  screens/
    backtest/BacktestDashboard.tsx   THE entry screen
    PersonaScreen / ScriptConfigScreen / ScriptResultsScreen / FactsheetScreen (lazy)
  features/
    backtest/                 types, extract (+chunker), engine, scoring, exportReport, chartData
    factsheet/                memie's generator (verbatim) + classify.js + adapter.ts + fields.ts
    script/                   prompt builders
  api/                        generate.ts (generateCached), prices.ts, yahoo.ts
  ui/                         components.tsx (brand: SN·Desk), icons.tsx
  components/CandleChart.tsx  extends time axis for future obs-date marks
backend/
  main.py                     FastAPI: Yahoo candles + claude -p bridge + notebooklm + Outlook email-send
start-sndesk.ps1 / stop-sndesk.ps1   one-click launcher / stopper (desktop icon → assets/sndesk.ico)
memie/
  copilot_demo_PHASE1_FINAL.jsx    design source of truth
  factsheet/                       memie's standalone module + HANDOVER_factsheet_KH2.md
```

---

## 7. Run it

```bash
# 1. Backend — needs Python + Claude Code installed & logged in (claude auth login) on THIS machine
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# 2. Frontend
npm install
npm run dev
```

Open the Vite URL. UI has a copy-paste fallback if the auto AI call fails.

**One-click launcher (Windows):** `start-sndesk.ps1` (repo root) reuses already-running servers, cold-starts only what's down, verifies `claude --version`, waits for backend health, then opens `http://localhost:5173`. `stop-sndesk.ps1` kills whatever listens on :8000 / :5173. Desktop shortcuts point at these (icon `assets/sndesk.ico`); if the "SN-Desk" desktop icon goes missing, recreate a `.lnk` running `powershell -NoProfile -ExecutionPolicy Bypass -File <repo>\start-sndesk.ps1`.

**Email auto-send:** needs **Classic** Outlook (New Outlook has no COM) running + logged in. The send auto-retries 3× if Outlook isn't ready yet; if it still fails, open Outlook and leave it running, then click send again.

**Known operational gotcha — `claude.exe` corruption after npm auto-update (happened twice):**
1. Postinstall left a 500-byte stub → "not a valid application". Real ~240MB binary sits in the interrupted `.claude-code-*` staging dir; copy it over.
2. Update replaced the binary with the raw Bun runtime → app shows `ReferenceError: output is not defined ... Bun v1.4.0`. Check `claude --version`: must print `X.Y.Z (Claude Code)`, not a bare Bun version. Recovery: timestamped backups live at `bin/claude.exe.old.<ts>`; copy whichever reports `(Claude Code)` back to `bin/claude.exe`. No backend change needed.

---

## 8. Repo state / next steps

- `optimize-1` merged into `main` (PR #1/#2). The 2026-07-27→30 session work is **uncommitted in the working tree** — commit before anything else. Touched: `src/features/backtest/{extract,engine,scoring,chartData,exportReport}.ts`, `src/features/factsheet/fields.ts`, `src/screens/backtest/BacktestDashboard.tsx`, `src/types.ts`, `backend/main.py`. Untracked: `assets/`, `start-sndesk.ps1`, `stop-sndesk.ps1`.
- This session added: multi-basket extraction, Selling-Code exclusion, KI/KO colour swap + %-on-label, "worst-of" removed from export subtitle, structure-aware detail (tiles + terms + `redemptionUpon` field), ranking rework (All/Aggressive/Save, split KI/KO/Strike columns, colour cues, drop Buffer+Vol, hide Score under All), backend timeout 180→300, email auto-retry, desktop launchers.
- Suggested next milestones, in order of value:
  1. Commit the working tree.
  2. **Per-structure backtest math** — biggest correctness gap. Bearish Sharkfin downside KO, Twin-Win Upper/Lower dual KO, Phoenix/Snowball/Airbag; also draw the matching barrier lines (direction + dual) on the detail chart.
  3. Decide whether non-KIKO should be ranked (needs structure-correct verdict/score first).
  4. Buffer÷Volatility safety score (fixes profile-ranking sameness) — parked, pre-approved diagnosis exists.
  5. Hosted deployment story (needs an alternative to local `claude -p`).

---

## 9. Pitch talking points

- **Who:** InnovestX IC team. **Wedge:** structured products are high-margin but hard to sell — this makes ICs faster and consistent.
- **Dashboard-first:** Monday's whole term-sheet stack screened in one drop — extract, backtest vs real market data, rank.
- **Real math:** worst-of knock-in/knock-out against actual Yahoo closes, fixing-date-anchored levels, volatility-aware scoring — not toy numbers.
- **One click to client-ready:** script (call/LINE/email, persona-aware) + compliance-styled factsheet (26 templates, th/en) + payoff chart.
- **Cost story:** AI rides the existing Claude subscription — zero metered API spend.
- **Localized:** Thai UI, InnovestX visual identity, matches their product-summary mockups.

---

*Deeper notes: `memie/factsheet/HANDOVER_factsheet_KH2.md` (factsheet module), project memory files (backtest engine semantics, AI bridge).*

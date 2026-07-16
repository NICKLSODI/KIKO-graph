# SN·Desk (KIKO-graph) — Final Project Handover

> Final handover. Covers what the product is, what works, how it's built, how to run it, and what's left.
> Last updated: 2026-07-16 · Branch: `optimize-1` (working tree ahead of last commit `edb1f0f "demo2 presented"`)

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
Drop term sheets (files or one big desk-listing paste)
  → AI extract (one NoteProduct per product; big pastes auto-chunked)
  → Backtest vs real Yahoo closing prices (worst-of KI/KO, window 6M/1Y/2Y)
  → Score & rank — KIKO ONLY ranked (business rule: "we usually sell KIKO");
    other structures shown in an unranked table, still get backtest/detail/graph
  → Detail view per product:
       • Graph drill-down: one candle chart per underlying, Strike/KI/KO lines,
         KO-observation date marks, 📌 fixing-date marker
       • 🎯 สร้าง Script  → persona → output config → script results (call/LINE/email)
       • 📄 สร้าง Factsheet → A4 factsheet, th/en toggle, print/PDF/HTML download
  → Export: CSV (Excel-safe UTF-8 BOM) + print/PDF report
```

Dashboard survives navigation (module-level `RESUME` snapshot + sessionStorage on refresh). "วิเคราะห์ชุดใหม่" resets.

---

## 4. Status — what works (all verified)

| Piece | Status |
|-------|--------|
| Batch extract → backtest → score → rank → drill-down | ✅ End-to-end (real tickers: AMD/MRVL, ORCL/INTC, AMZN) |
| Big-paste chunked extraction (30+ products, one paste) | ✅ Splits on `===` separators, chunks ≤5, concurrent pool of 3, per-chunk cache |
| Window selector (6M/1Y/2Y), volatility as 4th scoring dimension | ✅ Done |
| Correct backtest semantics | ✅ Strike/KI/KO levels anchored to real `fixingDate`; breaches checked over the FULL selected window (deliberate — screens fresh notes against history) |
| Risk profiles (Aggressive/Balanced/Save/Custom) live re-rank | ✅ Done |
| Factsheet module (memie's 26-template generator) | ✅ MERGED into `src/features/factsheet/` — verbatim port, 26/26 regression passes, real-deal KIKO render pixel-matched to reference PNGs |
| Notional input → factsheet (Min.Subscription, Net Interest/Month after 15% WHT, schedule column) | ✅ Done (gated to monthly-THB deals to avoid wrong period/tax) |
| Unified 13-key product classifier | ✅ One classifier (`detectVariant` in `classify.js`) computes `structureType` for dashboard AND factsheet — the two-classifier disagreement bug is gone |
| Script generation (persona + format aware) with prompt cache | ✅ `generateCached` SHA-256 → localStorage; repeat click = 0 tokens; "สร้างใหม่" forces regen |
| Auto-drawn payoff candle chart | ✅ Pure code from extracted numbers, no AI |
| Light/dark theme, InnovestX look (violet primary, green=pass, red=knocked) | ✅ Both themes verified |
| CSV + print/PDF export (handles unranked non-KIKO) | ✅ Done |
| AI via local Claude Code (`claude -p`), copy-paste fallback in UI | ✅ Verified end-to-end |

### Not built / known gaps
- **Per-structure payoff modeling** — Memory/Snowball, Phoenix coupon-barrier, Airbag buffer, Twin-Win dual: structure is *detected* (13-key classifier) but backtest math is still generic worst-of KI/KO for all.
- **Scoring differentiation** — Aggressive/Balanced/Save orderings often barely differ. Diagnosed: one product frequently Pareto-dominates all 4 dimensions. Proposed (not built): combined Buffer÷Volatility "safety score". User said hold off.
- **Real-AI variantFields end-to-end** — factsheet flow verified with playwright + mock data; live AI extraction populating `variantFields` needs a run with backend + `claude login`.
- **Hosted deployment** — local-only by design today (Claude Code must live on the backend host).

---

## 5. Architecture

**Frontend:** React 18 + TypeScript + Vite. Charts: `lightweight-charts`. State: small `src/store.ts`. Design source of truth: `memie/copilot_demo_PHASE1_FINAL.jsx` (palette, flow, components). Theming via CSS vars in `src/index.css` + `C.*` tokens in `src/theme.ts`.

**Backend:** Python FastAPI (`backend/main.py`):
- `GET /candles-yahoo?market=foreign|thai` — free Yahoo historical closes (Thai tickers get `.BK`).
- `POST /api/generate` — the AI call (see below). `GET /api/generate/health` reports whether `claude` binary found.
- `POST /api/extract-notebooklm` — alternate extraction path via NotebookLM CLI.

**The AI (differentiator):** backend shells out to the machine's **local Claude Code login** — `claude -p --output-format text` via subprocess, prompt on stdin, `ANTHROPIC_BASE_URL` stripped from child env so it uses `~/.claude/.credentials.json` subscription creds. **No Anthropic API key, no per-call billing.** File/PDF input: backend writes to temp dir, runs `claude -p --allowedTools Read WebFetch --add-dir <tmp>`. Trade-off: backend host must have Claude Code installed + logged in.

**Caching:** extraction AND script generation cached in localStorage by SHA-256 prompt hash (`kiko-generate:` prefix). Schema changes auto-invalidate (hash includes instructions).

**Backtest engine (`src/features/backtest/engine.ts`) — final semantics (important):**
- `initialPrice` = close on the product's real `fixingDate` (from full uncropped history) → Strike/KI/KO price levels derive from it. Never window-relative (that was a fixed bug — caused false "Pass").
- `knockedIn` = ANY underlying closed ≤ its KI level **anywhere in the selected window** (window start, no fixing-date floor — deliberate, per user: fresh notes must be stress-tested against history or everything trivially passes).
- `knockedOut` = on some KO observation date, ALL underlyings ≥ their KO level; future obs dates (beyond last candle) never count.
- Volatility = annualised, worst-of, from window daily log returns.

**Classifier:** `src/features/factsheet/classify.js` — pure, zero-dep `detectVariant()` over 13 registry keys (`kiko, twin_win, bullish_sharkfin, bearish_sharkfin, booster, booster_prot, ben, ben_cash, ben_prot, fcn, fixed_rate_note, three_musketeers, lookback_dispersion`). extract.ts computes `structureType` from it (AI no longer guesses the type). Display via `STRUCTURE_TYPE_LABELS`. Kept separate from `factsheet_generator.js` so the 145kB render engine stays out of the main bundle (main 418kB, factsheet lazy chunk 143kB).

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
  main.py                     FastAPI: Yahoo candles + claude -p bridge + notebooklm
memie/
  copilot_demo_PHASE1_FINAL.jsx    design source of truth
  factsheet/                       memie's standalone module + HANDOVER_factsheet_KH2.md
```

---

## 7. Run it

```bash
# 1. Backend — needs Python + Claude Code installed & logged in (claude login) on THIS machine
cd backend
pip install -r requirements.txt
uvicorn main:app --reload

# 2. Frontend
npm install
npm run dev
```

Open the Vite URL. UI has a copy-paste fallback if the auto AI call fails.

**Known operational gotcha — `claude.exe` corruption after npm auto-update (happened twice):**
1. Postinstall left a 500-byte stub → "not a valid application". Real ~240MB binary sits in the interrupted `.claude-code-*` staging dir; copy it over.
2. Update replaced the binary with the raw Bun runtime → app shows `ReferenceError: output is not defined ... Bun v1.4.0`. Check `claude --version`: must print `X.Y.Z (Claude Code)`, not a bare Bun version. Recovery: timestamped backups live at `bin/claude.exe.old.<ts>`; copy whichever reports `(Claude Code)` back to `bin/claude.exe`. No backend change needed.

---

## 8. Repo state / next steps

- Branch `optimize-1` holds all the 2026-07-15/16 work (unified flow, factsheet merge, classifier, theme, rebrand) as **uncommitted working-tree changes** — commit before anything else. New untracked dirs: `src/features/factsheet/`, `memie/factsheet/`, `src/ui/icons.tsx`, `skill/`.
- Suggested next milestones, in order of value:
  1. Commit + merge `optimize-1` → `main`.
  2. Live-AI run to verify `variantFields` extraction populates real factsheets.
  3. Per-structure backtest payoff math (Phoenix/Snowball/Twin-Win/Airbag).
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

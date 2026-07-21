# SETUP — รันโปรเจกต์นี้บนเครื่องใหม่ (สำหรับ Claude Code)

> ไฟล์นี้คือ **คำสั่งให้ Claude Code บนเครื่องปลายทางทำตามทีละขั้น** เพื่อให้แอปรันได้จริง
> ภาพรวมโปรเจกต์แบบละเอียดอยู่ใน `HANDOVER.md` — ไฟล์นี้เน้น "ต้องทำอะไรบ้าง" อย่างเดียว
>
> **This repo = SN·Desk (KIKO-graph):** local web app — batch-read structured-note term
> sheets → backtest vs real prices → rank → generate script / factsheet / payoff chart.
> AI runs through **this machine's own Claude Code login** (no API key).

---

## 0. ก่อนย้าย — ทำบนเครื่องเดิม (current machine) ก่อน push

git ยังมีงานที่ยัง **ไม่ commit** (branch `optimize-1`). ถ้าไม่ push ของพวกนี้ เครื่องใหม่จะไม่ได้งานล่าสุด:

```bash
git status                      # ดูไฟล์ที่แก้ค้างไว้
git add -A
git commit -m "wip: stock-name ranking filter + setup doc"
git push origin optimize-1      # ต้องมี GitHub remote แล้ว (git remote -v เพื่อเช็ค)
```

> ถ้ายังไม่มี remote: สร้าง repo บน GitHub แล้ว `git remote add origin <url>` ก่อน push.
> ⚠️ ไฟล์นี้ (`SETUP.md`) ต้องถูก commit/push ด้วย ไม่งั้นเครื่องใหม่จะไม่เห็น.

---

## 1. Prerequisites บนเครื่องใหม่ (ต้องมีก่อน — git ไม่ได้พามาให้)

| ต้องมี | เช็คด้วย | หมายเหตุ |
|--------|----------|----------|
| **Node.js 18+** (มี npm) | `node -v` `npm -v` | สำหรับ frontend (Vite/React) |
| **Python 3.10+** | `python --version` | backend ใช้ `X \| None` syntax → ต้อง 3.10 ขึ้นไป |
| **Claude Code CLI + login** | `claude --version` ต้องขึ้น `(Claude Code)` แล้ว `claude login` | **จำเป็น** — AI ทั้งหมดวิ่งผ่าน `claude -p` โดยใช้ subscription ของเครื่องนี้ ไม่ใช้ API key |
| (ทางเลือก) **`nlm` CLI** | `nlm --version` | เฉพาะถ้าจะใช้ extraction ผ่าน NotebookLM (มี path สำรอง) — ข้ามได้ |
| (เฉพาะ Windows) Classic Outlook + PowerShell | — | จำเป็นเฉพาะฟีเจอร์ "ส่งอีเมลอัตโนมัติ" เท่านั้น ที่เหลือไม่ต้อง |

> **OS:** ฟีเจอร์ email-send (`/api/email-send`) ใช้ได้เฉพาะ Windows (Outlook COM). บน mac/Linux ปุ่มส่งอีเมลจะปิดเอง ส่วนที่เหลือ (extract / backtest / rank / script / factsheet / graph) ทำงานปกติ.

---

## 2. ไฟล์ที่ git **ไม่ได้** พามา (ถูก .gitignore) — ต้องสร้างใหม่บนเครื่องปลายทาง

- `backend/.env` → copy จาก `backend/.env.example`. ใส่ `TWELVE_DATA_API_KEY` ได้ (ขอฟรีที่ twelvedata.com).
  - **ไม่ใส่ก็รันได้** — key นี้ใช้เฉพาะกราฟหุ้นต่างประเทศ (US) ผ่าน Twelve Data; ราคาหลักมาจาก Yahoo ซึ่งไม่ต้องใช้ key.
- `node_modules/`, `backend/.venv/`, `dist/`, `backend/.nlm_notebook_id`, `.claude/settings.local.json` → สร้างใหม่อัตโนมัติตามขั้นตอนด้านล่าง.

---

## 3. ขั้นตอนติดตั้ง (ทำตามลำดับ)

### 3.1 ดึงโค้ด
```bash
git clone <GITHUB_URL> KIKO-graph
cd KIKO-graph
git checkout optimize-1        # งานล่าสุดอยู่บน branch นี้ (ไม่ใช่ main)
```

### 3.2 Backend (FastAPI, พอร์ต 8000)
```bash
cd backend
python -m venv .venv
# activate — Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# หรือ mac/Linux:  source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # Windows: copy .env.example .env  (แล้วเปิดใส่ key ถ้ามี)
uvicorn main:app --reload --port 8000
```
ปล่อย terminal นี้รันค้างไว้.

### 3.3 Frontend (Vite/React, พอร์ต 5173) — เปิด terminal ใหม่
```bash
cd KIKO-graph
npm install
npm run dev
```
เปิดเบราว์เซอร์ที่ URL ที่ Vite แจ้ง (ปกติ **http://localhost:5173**).

---

## 4. ตรวจว่ารันถูก (verify)

1. เปิด `http://localhost:8000/api/generate/health` → ควรได้ `{"available": true, ...}`
   - ถ้า `false` = หา `claude` ไม่เจอ → ยังไม่ได้ติดตั้ง Claude Code หรือไม่ได้ `claude login`.
2. บนหน้าเว็บ ถ้าขึ้นแบนเนอร์แดง "เชื่อมต่อ backend ไม่ได้ (localhost:8000)" = backend ยังไม่รัน / พอร์ตไม่ตรง.
3. Quality gate ก่อนแก้โค้ดต่อ: `npx tsc --noEmit` ต้อง **0 errors**; build จริง: `npm run build`.

---

## 5. เรื่องพอร์ต / URL (สำคัญถ้าต้องเปลี่ยน)

Backend URL ถูก **hardcode = `http://localhost:8000`** และ CORS ฝั่ง backend อนุญาตเฉพาะ `http://localhost:5173`. **สองตัวต้องรันบนเครื่องเดียวกัน (localhost).**

ถ้าจำเป็นต้องเปลี่ยนพอร์ต backend ต้องแก้ทุกจุดนี้ให้ตรงกัน:
- `src/api/generate.ts`, `src/api/prices.ts`, `src/api/twelveData.ts`, `src/api/yahoo.ts` (ค่าคงที่ `BACKEND_URL`)
- `src/screens/backtest/BacktestDashboard.tsx:211` (health fetch)
- `src/features/backtest/exportReport.ts` (`/api/email-send` fetch)
- `backend/main.py` CORS `allow_origins` (ถ้าเปลี่ยนพอร์ต frontend) + `--port` ตอนรัน uvicorn

---

## 6. Gotchas ที่เจอมาแล้ว

- **`claude.exe` พังหลัง npm auto-update (เคยเกิด 2 ครั้ง บน Windows):** ถ้า `claude --version` ขึ้น Bun version เปล่าๆ หรือ error `output is not defined` → binary เสีย. ดูวิธีกู้ใน `HANDOVER.md` §7 (มี backup ที่ `bin/claude.exe.old.<ts>`). ต้องได้บรรทัดที่ลงท้าย `(Claude Code)` เท่านั้น.
- **Yahoo rate limit (HTTP 429):** เรียกถี่ไปจะโดน throttle ชั่วคราว — รอสักครู่แล้วลองใหม่.
- **AI ช้า/timeout:** `claude -p` มี timeout 180s ต่อ call (ตั้งใน `backend/main.py`). ไฟล์ใหญ่/เอกสารเยอะอาจใช้เวลา.
- **UI มี copy-paste fallback:** ถ้า auto AI call ล้ม ใช้โหมด copy prompt ไปวางใน Claude app เองได้.

---

## 7. สถานะโค้ดตอนย้าย + สิ่งที่ควรทำต่อ

**เพิ่งทำเสร็จ (อยู่ในงานที่ต้อง commit):**
- ตัวกรองค้นหาชื่อหุ้นแบบ chip บนหน้า ranking — `src/screens/backtest/BacktestDashboard.tsx` (พิมพ์ชื่อหุ้น + Enter → กลายเป็น chip, กรองทั้ง 3 ตาราง). ผ่าน `tsc` แล้ว.

**บั๊กที่เจอจาก review แต่ยัง _ไม่ได้_ แก้ (ควรแก้ต่อ):**
- `src/features/factsheet/adapter.ts` — `variantFieldsToDeal` ไม่ได้ map `bonus` และ `couponBarrier` ลง `deal.levels` (ใส่ไว้แค่ใน `variantFields`) → factsheet ตระกูล **BEN** โชว์ "Bonus Coupon" เป็น "—" ทั้งที่เป็นตัวเลขหลักของสินค้า. **แก้:** เพิ่ม `couponBarrier` / `bonus` เข้า object `levels` (บรรทัด ~46-51) และเพิ่มใน type `Deal['levels']` ที่ `deal_factsheet.d.ts` (บรรทัด 16-29).
- `adapter.ts` `backfillFromProduct` ไม่ส่ง `NoteProduct.kiType` / `koType` ต่อ → factsheet KIKO อธิบายการสังเกต KI/KO ผิด (เช่น note ที่เป็น final-valuation ถูกเขียนว่า "Observed daily"). **แก้:** เติม `kiObservation` / `koObservation` จาก kiType/koType.

**Next milestones (จาก `HANDOVER.md` §8):**
1. Commit + merge `optimize-1` → `main`.
2. รัน live-AI จริงให้ `variantFields` ป้อน factsheet ครบ.
3. Backtest payoff math รายโครงสร้าง (Phoenix/Snowball/Twin-Win/Airbag).
4. คะแนน Buffer÷Volatility (แก้ปัญหา ranking แต่ละ profile เหมือนกัน) — parked, มี diagnosis แล้ว.
5. Deployment แบบ hosted (ต้องหาทางแทน local `claude -p`).

---

## 8. TL;DR (ถ้าอ่านบรรทัดเดียว)

1. เครื่องเดิม: `git add -A && git commit && git push origin optimize-1`
2. เครื่องใหม่: ติดตั้ง Node + Python 3.10+ + Claude Code (`claude login`)
3. `git clone … && git checkout optimize-1`
4. backend: venv → `pip install -r backend/requirements.txt` → `cp .env.example .env` → `uvicorn main:app --reload --port 8000`
5. frontend: `npm install` → `npm run dev` → เปิด http://localhost:5173
6. เช็ค `http://localhost:8000/api/generate/health` = `{"available": true}`

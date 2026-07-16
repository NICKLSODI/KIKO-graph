# Factsheet Generator — Complete Summary (สำหรับนำไปรวมกับส่วนอื่น)

> อัปเดตล่าสุด: 2026-07-14 · สถานะ: **standalone module พร้อม merge** — 26 curated templates + real-deal extraction pipeline + Split UI

---

## 1. ภาพรวม

ระบบนี้คือ **Output 2 — Simplified Factsheet (Key Highlight)** ของ IC Copilot แยกเป็น 3 module อิสระจากกัน ไม่พึ่งพา React/AI:

```
termsheet_parser.js  →  deal_factsheet.js  →  factsheet_generator.js
(แกะข้อความดิบ)         (แปลงเป็น data object)    (render เป็น HTML)
```

**ทุกโมดูลเป็น pure JS (ES modules), ไม่มี side effect, ไม่เรียก AI/network** — เรียกใช้ได้ทั้งจาก Node (`import`) และ browser (`<script type="module">`) เหมือนกันทุกประการ

---

## 2. ไฟล์ทั้งหมด (5 ไฟล์หลัก + สำเนาใน public/)

| ไฟล์ | บรรทัด | หน้าที่ | Export |
|------|-------|---------|--------|
| `factsheet_generator.js` | 583 | Render engine — data object → HTML string (A4, 794×1123px) | `CSS`, `LABELS`, `REGISTRY`, `detectVariant`, `buildFactsheetKH` |
| `logo.js` | — | base64 โลโก้ InnovestX (แยกไฟล์ลดขนาด) | `LOGO` |
| `termsheet_parser.js` | 183 | Parse ข้อความ term sheet ดิบ → deal object (deterministic, ไม่ใช้ AI) | `splitDealList`, `parseSummaryTable`, `normalizeDeal`, `detectDeals`, `parseInstrumentDescription` |
| `deal_factsheet.js` | 376 | แปลง deal object → data object รูปแบบเดียวกับ REGISTRY entry | `dealToFactsheetData`, `MAPPED_PRODUCT_KEYS` |
| `public/*.js` | — | สำเนาของทั้ง 4 ไฟล์ข้างบน — **ต้อง sync ทุกครั้งที่แก้** (`cp x.js public/x.js`) |

> ⚠️ **กฎเหล็ก:** แก้ไฟล์ root เสร็จ **ต้อง** `cp` ไป `public/` เสมอ — ไม่งั้น browser จะรันโค้ดเก่า (เคยเกิดบั๊กจริงจากจุดนี้ — ดู §7)

---

## 3. Layer 1 — `factsheet_generator.js` (26 curated outputs)

### 3.1 `buildFactsheetKH(dataOrKey, lang, opts)`
รับได้ 2 แบบ:
- **string** (REGISTRY key เช่น `'kiko'`) → ดึงข้อมูลตัวอย่าง (Illustrative, จาก Offshore SN Sale Kit) จาก `REGISTRY`
- **object** (data object จริงจาก `dealToFactsheetData()`) → render ด้วยข้อมูลจริงที่ IC วางเข้ามา

รวม **13 products × 2 ภาษา (en/th) = 26 outputs** เมื่อใช้แบบ key:
```
kiko, fcn, fixed_rate_note,                              ← Style A (จ่ายดอกเบี้ยรายงวด)
twin_win, bullish_sharkfin, bearish_sharkfin,             ← Style B (จ่ายก้อนเดียว)
three_musketeers, lookback_dispersion,
booster, booster_prot, ben, ben_cash, ben_prot
```

### 3.2 Style A vs Style B
```js
const KH2_STYLE_A = ['kiko','fcn','fixed_rate_note'];
const KH2_STYLE_B = ['twin_win','bullish_sharkfin','bearish_sharkfin','three_musketeers',
  'lookback_dispersion','booster','booster_prot','ben','ben_cash','ben_prot'];
```
- **Style A**: Metrics → Basket → 1-บรรทัด "Key levels" → Coupon/FRN Schedule
- **Style B**: Metrics → 3-card "Key Conditions" → Basket Securities (Key Conditions มาก่อน basket เสมอ)
- **`p._realDeal === true`** (มาจาก mapper) → บังคับใช้ Style B layout เสมอ ไม่ว่า key จะเป็นอะไร

### 3.3 สีในตาราง Basket (`_basketGeneric`)
| class | สี | ใช้กับ |
|---|---|---|
| `.koc` เขียว | Knock-Out level | ตาม `ko_cols` index หรือ header ชื่อ "Knock-Out" |
| `.kic` แดง | Knock-In level | ตาม `ki_cols` index หรือ header ชื่อ "Knock-In" |
| `.stc` เบจ | Strike (สไตล์ KIKO) | เมื่อ `opts.strikeGray=true` |
| `.ycl` เหลือง | คอลัมน์ผลตอบแทนหลัก (สีเดียวกับกล่อง metric แรก) | ระบุผ่าน `opts.yellowHeader` (ชื่อคอลัมน์) |
| `.vmid` | จัดกลางแนวตั้ง (rowspan) | ค่าที่เป็นของทั้ง basket (มีค่าแถวแรกอย่างเดียว) |

### 3.4 กฎที่ห้ามละเมิด (compliance/legacy safety)
- **ห้ามตัด/ซ่อนข้อความ financial ด้วย ellipsis** — wrap ได้อย่างเดียว
- **ห้ามสร้างข้อมูลเอง** — ค่าที่ไม่มีในต้นทางต้องแสดง `—` หรือละ section ไปเลย ไม่เดา
- fill-tier (`kh2-fill-lg`/`kh2-fill-md`) ปรับ **ระยะห่างเท่านั้น** ไม่ปรับ font-size (เพื่อความสม่ำเสมอข้าม product)
- หน้าเอกสาร = 794×1123px (A4) ทุก output ต้อง ≤ 1120px ที่วัดจริง

---

## 4. Layer 2 — `termsheet_parser.js` (แกะข้อความดิบ, deterministic)

### 4.1 `detectDeals(text)` — entry point เดียวที่ควรใช้
ลองรูปแบบตามลำดับ คืน `[]` ถ้าไม่ตรงทั้งคู่ (= ข้อความปกติ 1 ผลิตภัณฑ์ ไม่ใช่ multi-deal):
1. **`splitDealList` + `normalizeDeal`** — format emoji list รายวัน (แยกด้วย `=========`, ใช้ 📌🔺🔻 ฯลฯ)
2. **`parseSummaryTable`** — format ตาราง column-dump (No./Product/Instrument Code/Issuer/Description/Underlying/Trade-Issue-Maturity Date)

### 4.2 กฎการ parse
- **STRICT: ไม่เดาอะไรเลย** — field ที่ไม่มีในข้อความ = `null` ไปตลอดสาย จนถึงขั้น render จะแสดง `—`
- Format 2 มี field มากกว่า Format 1 (มี Trade/Issue/Maturity Date, Issuer เต็ม, underlying array จาก Description)
- แปลตัวย่อ observation: **AKI**=American(รายวัน), **EKI**=European(วันครบกำหนด), **Mem**=Memory KO

### 4.3 output shape (`normalizeDeal()` return)
```js
{ letter, date, category, product, underlyings: [], issuer, notes: [], tenor, redemptionUpon,
  dates: { trade, issue, maturity } | null,
  levels: { ko, koObs, ki, kiObs, strike, upperKO, lowerKO, participation, koRebate, minRedemption, minCoupon, coupon },
  variantFields: { family, ko, ki, upperKO, lowerKO, strike, participation, couponBarrier, bonus, minRedemption, settlement } }
```

---

## 5. Layer 3 — `deal_factsheet.js` (deal → data object)

### 5.1 `dealToFactsheetData(deal, overrideKey?)`
```js
const key = overrideKey || detectVariant(deal.variantFields) || 'kiko';
```
- **`overrideKey`** = IC manual override (compliance safety net — ต้องมีเสมอ, ห้ามให้เอกสารผิดออกโดยไม่มีทางแก้มือ)
- ไม่ใส่ overrideKey → ใช้ `detectVariant()` จาก `factsheet_generator.js` (parameter-first, ดูรายละเอียด §6)

### 5.2 Mapper ที่ทำแล้ว + verify กับข้อมูลจริง (9/13 ประเภท)
```js
export const MAPPED_PRODUCT_KEYS = ['kiko','twin_win','bullish_sharkfin','bearish_sharkfin',
  'booster','booster_prot','ben','ben_cash','ben_prot'];
```
| Product | ทดสอบกับ | หมายเหตุ |
|---|---|---|
| kiko | 19 ดีลจริง (emoji list + summary table) | ครบทั้ง Trade/Issue/Maturity date |
| twin_win | 1 ดีลจริง ("Twinwin Sharkfin" — ชื่อในเอกสารผิด แต่ detectVariant จับถูกจาก Upper/Lower KO) | |
| bearish_sharkfin | 1 ดีลจริง | payoff note อธิบาย mechanism โดยไม่ fabricate ตัวเลข cap ที่ไม่มีในดีล |
| bullish_sharkfin | โค้ดพร้อม (logic กลับทิศจาก bearish) แต่ไม่มีดีลจริงมาทดสอบตรงๆ | |
| booster, booster_prot | ตัวอย่างจริงจาก **Offshore SN Sale Kit PDF** (Strike 100%, PR 200%, Min.Redemption 90%) | |
| ben, ben_cash, ben_prot | ตัวอย่างจริงจาก Sale Kit PDF เช่นกัน | |

### 5.3 ที่ยังไม่ทำ (ไม่มีข้อมูลจริงมาทดสอบ — ไม่เดาโครงสร้าง)
`three_musketeers`, `lookback_dispersion`, `fcn`, `fixed_rate_note` — ถ้า `detectVariant` จับได้เป็น 4 ตัวนี้ `dealToFactsheetData` จะ **throw error ชัดเจน** แทนการเดา:
```
No verified mapper yet for "xxx" — need a real term-sheet sample before building this to avoid guessing the field layout.
```

### 5.4 Data object ที่ mapper คืน (shape ตรงกับ REGISTRY entry)
```js
{ _type, _realDeal: true, title: {en,th}, subdate, tag: {en,th},
  metrics: [{l:{en,th}, v, c}], dates, conds: [{color,n,lv,o,d}], basket,
  _payoffNote: {en,th}, _dealNotes: [{en,th}] }  // _dealNotes = compliance flags เช่น "Reverse Solicit"
```

---

## 6. `detectVariant(f)` — parameter-first classifier (อยู่ใน `factsheet_generator.js`)

พารามิเตอร์ชนะชื่อเสมอ (term sheet จริงตั้งชื่อผิดบ่อย — เช่น "Twinwin Sharkfin" ที่จริงคือ Twin Win)

```
upperKO + lowerKO           → twin_win
knockIn present             → kiko
couponBarrier (+เงื่อนไข)    → ben family (physical/cash/protected ตาม settlement/minRedemption)
single ko (vs strike, default strike=100 ถ้าไม่ระบุ) → sharkfin (KO>ref=bullish, KO<ref=bearish)
participation (ไม่มี ko)     → booster family (protected ถ้า minRedemption<100)
→ fallback: จับคู่ชื่อ family → คืน key หรือ null
```

---

## 7. Bug ที่เจอและแก้แล้วระหว่างพัฒนา (เก็บไว้กันพลาดซ้ำ)

| บั๊ก | สาเหตุ | แก้ |
|---|---|---|
| `window.DealParser` เป็น `undefined` ทั้งก้อน | copy ไฟล์ไป `public/` **ก่อน** เพิ่ม export (`detectDeals`) ในไฟล์ root → ES module import ที่ไม่เจอ named export จะ throw และทำให้ `<script type="module">` ทั้ง block ไม่ทำงานเลย (รวม `window.FactsheetGen` ด้วย) | sync ไฟล์ **หลัง** แก้เสร็จเสมอ ไม่ใช่ก่อน |
| Sharkfin payoff note โชว์ `[object Object]` | ตัวแปร `dir`/`dirNo` เป็น bilingual object แต่เอาไปแทรกในสตริงที่ query `.en`/`.th` แยกไปแล้ว | แยกเป็น `dirEn`/`dirTh` plain string |
| Multi-deal iframe overflow ขอบขวา | hardcode `scale = 700/794` แต่ container จริงกว้างแค่ ~542px (จาก `wrap()` maxWidth 600 − padding) | เปลี่ยนเป็น `scale = 544/794` ให้ตรงกับค่าที่ Step 4 (single-factsheet) ใช้อยู่แล้ว |
| IC override ใน multi-deal ไม่เปลี่ยนเนื้อหาจริง | เดิม patch แค่ `_type` บน data object เดิม (ยังเป็นโครง KIKO อยู่) ไม่ได้เรียก mapper ใหม่ | override ต้องเรียก `dealToFactsheetData(deal, overrideKey)` ใหม่เพื่อ re-map โครงสร้างทั้งหมด |
| แนบไฟล์ได้แค่ไฟล์เดียว | `FileDrop` component เขียนแบบ if/else — มีไฟล์แล้วซ่อนปุ่มอัปโหลดทันที | เปลี่ยน state เป็น array + เพิ่ม `multiple` attribute + โชว่ dropzone ควบคู่กับ list เสมอ |
| แนบ 6 ไฟล์ (6 ดีลจริง) ได้แค่ 1 ใบ | Agent 1's extraction prompt สั่งไว้ตรงๆ ว่า "ถ้ามีมากกว่า 1 ผลิตภัณฑ์ ให้เลือกสกัดแค่ตัวเดียวที่ชัดที่สุด" — เมื่อแนบ 6 ไฟล์รวมกันในคำขอเดียว Agent 1 เลยเลือกมาแค่ 1 ไฟล์ (ไม่ใช่บั๊ก แต่เป็น instruction ที่ถูกออกแบบไว้สำหรับกรณี "หลายหน้าของเอกสารเดียว") | เพิ่มโหมด **file-batch**: เรียก Agent 1 **แยกทีละไฟล์** (1 call ต่อ 1 ไฟล์) แทนการยัดทุกไฟล์ในคำขอเดียว — ดู §8.3 |

---

## 8. UI Integration (`public/app.jsx`, mirror ใน `copilot_demo_PHASE1_FINAL.jsx`)

### 8.1 การโหลด module (`public/index.html`)
```js
import { buildFactsheetKH, detectVariant, REGISTRY } from "./factsheet_generator.js";
import { splitDealList, parseSummaryTable, normalizeDeal, detectDeals } from "./termsheet_parser.js";
import { dealToFactsheetData, MAPPED_PRODUCT_KEYS } from "./deal_factsheet.js";
window.FactsheetGen = { buildFactsheetKH, detectVariant, REGISTRY };
window.DealParser = { splitDealList, parseSummaryTable, normalizeDeal, detectDeals, dealToFactsheetData, MAPPED_PRODUCT_KEYS };
```
(ใน `copilot_demo_PHASE1_FINAL.jsx` ใช้ ES `import` ตรงๆ แทน `window.*` เพราะเป็นเวอร์ชัน artifact แยก)

### 8.2 Split UI (Step 1) — auto-detect multi-deal
- `useEffect` ฟัง `text`/`mode` → เรียก `detectDeals(text)` → ถ้า `≥2` ดีล แสดง panel checklist แทนฟอร์มปกติ
- แต่ละแถว: checkbox (default checked ถ้า mapper รองรับ) + label + summary (levels สำคัญ) + `<select>` override (list จาก `MAPPED_PRODUCT_KEYS`)
- ปุ่ม "สร้าง Factsheet ที่เลือก (N)" → screen `multiResults`
- **`multiResults` screen**: loop เฉพาะแถวที่ selected → ถ้ามี `overrideKey` ต้อง **re-run mapper** (`dealToFactsheetData(deal, overrideKey)`) ไม่ใช่แค่ patch `_type` → render iframe scale 544/794 (คงที่ ต้องตรงกับ container 542px จริง)

### 8.3 Multi-file upload (Step 1, mode="file")
- `files` state = array (เดิมเป็น object เดี่ยว) — เพิ่มไฟล์สะสมได้เรื่อยๆ, ลบทีละไฟล์
- `<input type="file" multiple>` — ทุกไฟล์ถูกแปลงเป็น content block (`fileToBlock`) แล้วส่งเข้า Claude API พร้อมกันในอาเรย์เดียว (`blocks.map(fileToBlock)`) — ใช้เมื่อไฟล์ทั้งหมดเป็นเอกสารของ **ผลิตภัณฑ์เดียวกัน** (เช่น สแกนหลายหน้า)
- **Knowledge Doc upload** (เอกสาร Sale Kit เสริม) ยังเป็น**ไฟล์เดียว**โดยตั้งใจ — ไม่ได้แตะจุดนี้

### 8.4 File-batch mode (ไฟล์ต่างกัน = ดีลต่างกัน)
เมื่อ `files.length >= 2` จะมีปุ่มเพิ่ม **"สกัดข้อมูลแยกทีละไฟล์"** ให้เลือก (แยกจาก flow multi-file ปกติด้านบน):
- `runFileBatchExtraction()` วนลูปเรียก Agent 1 **แยกทีละไฟล์** (1 `callClaudeAPI` ต่อ 1 ไฟล์ — ไม่รวมกันในคำขอเดียว) → parse `variant_fields` ต่อไฟล์ → `detectVariant()` ต่อไฟล์
- ระหว่างรันแสดง progress "กำลังสกัดข้อมูลไฟล์ที่ N/M"; ถ้าไฟล์ไหน fail (error/AI ตรวจจับไม่ได้) จะบันทึก error เฉพาะไฟล์นั้น **ไม่ทำให้ไฟล์อื่นหยุด**
- จบแล้วไปหน้าจอ `fileBatchResults` — checklist (checkbox+override ต่อไฟล์ เหมือน Split UI ของ text) พร้อม render factsheet จริงต่อไฟล์แบบ inline (re-render ทันทีเมื่อเปลี่ยน override โดยไม่ต้องเรียก AI ซ้ำ เพราะ `variantFields` ถูก cache ไว้แล้ว)
- **Verify แล้วด้วย PDF จริง 6 ไฟล์** (KIKO A–F จากคนละ underlying/issuer) — 5/6 สำเร็จ ดึง tickers ถูกต้องตรงกับไฟล์จริงทุกไฟล์ (CRWV, AMD, MRVL, TSLA+AVGO+AMD, AMD+MU) ไม่ปนกัน 1 ไฟล์ fail ด้วย "Failed to fetch" (เช็คแล้วไม่ใช่ timeout config ในโค้ด น่าจะเป็น network blip ชั่วคราว — ระบบ isolate error ต่อไฟล์ได้ถูกต้อง ไม่ทำให้ไฟล์อื่นพัง)

### 8.6 KIKO coupon schedule — คำนวณวัน observation เองจากข้อมูลที่มี (ไม่ fabricate)
ถ้าเอกสารบอกแค่ "สังเกตรายเดือน/รายไตรมาส" โดยไม่ได้ list วันที่แต่ละงวดไว้ตรงๆ วันที่แต่ละงวด **คำนวณได้จริง** จาก Issue Date + ความถี่ที่ระบุ — เป็นเลขคณิตบนข้อเท็จจริงที่มีอยู่แล้ว ไม่ใช่การเดา (หลักการเดียวกับ "quarterly = annual/4" ที่ใช้อยู่แล้วใน Style A):
- ขยาย `variant_fields` schema เพิ่ม `tradeDate`/`issueDate`/`maturityDate` (บังคับ ISO `YYYY-MM-DD`) และ `koObservation`/`kiObservation` (เช่น "Monthly", "Quarterly", "Daily")
- `deal_factsheet.js`: เพิ่ม `_parseDate()` (parse ISO/DD-MM-YYYY/"24 Jun 2026"), `_monthsFromTenor()`, `_fmtDate()`, และ `kikoSchedule(deal, couponPct)` — คำนวณ schedule เฉพาะเมื่อมี **ครบทั้ง** Issue Date + ความถี่ + coupon rate ที่ parse ได้ + จำนวนงวด (จาก Tenor หรือ Maturity Date) เท่านั้น ไม่ครบข้อไหนก็ข้าม section ไปเฉยๆ (ไม่เดา)
- ทุกตารางที่คำนวณจะมี caption อธิบายว่า "คำนวณจาก Issue Date + ความถี่ — วันจริงอาจคลาดเคลื่อนไม่กี่วันจากการปรับวันทำการ" (ผ่าน `p._scheduleNote`)
- **Verify กับข้อมูลจริง**: ดีล SG2606293MKIKOD (Issue Date 13 Jul 2026, Monthly, Coupon 42.63% p.a., Tenor 3 เดือน) → คำนวณได้ 13 Aug / 13 Sep / 13 Oct 2026 — ตรงกับวันจริงในเอกสาร (13 Aug / **14** Sep / 13 Oct) เกือบสนิท ต่างแค่ 1 วันจากการปรับวันทำการ ตามที่ caption เตือนไว้พอดี
- Trade/Issue/Maturity date grid ก็ reformat จาก ISO เป็น "29 Jun 2026" ให้ตรงกับ convention เดิมของ registry ด้วย (`_displayDate()`)

### 8.7 สถานะการทดสอบ
| ส่วน | ทดสอบแล้ว |
|---|---|
| `app.jsx` (แอปที่รันจริง) | ✅ click-through เต็มใน browser ทุก flow (split UI, override, multi-file, file-batch ด้วย PDF จริง 6 ไฟล์) |
| `copilot_demo_PHASE1_FINAL.jsx` | ✅ Babel transform ผ่าน, sync โค้ดตรงกับ app.jsx ทุก feature รวม file-batch + schedule calc — **ยังไม่ได้ click-through** (ความเสี่ยงต่ำ เพราะแอปจริงไม่ได้โหลดไฟล์นี้) |

---

## 9. วิธี verify (รันได้ทันทีหลังแก้โค้ด)

```bash
cd "IC Project local run"
export PATH="$(pwd)/runtime/node/bin:$PATH"

# 1) sync check
for f in factsheet_generator.js logo.js termsheet_parser.js deal_factsheet.js; do
  diff -q "$f" "public/$f" && echo "$f: SYNCED" || echo "!! OUT OF SYNC: $f"
done

# 2) 26 curated outputs regression
node --input-type=module -e "
import { buildFactsheetKH, REGISTRY } from './factsheet_generator.js';
let ok=0,fail=0;
for (const k of Object.keys(REGISTRY)) for (const l of ['en','th']) {
  const h = buildFactsheetKH(k,l);
  if (/undefined|\[object Object\]|NaN/.test(h)) fail++; else ok++;
}
console.log('ok='+ok, 'fail='+fail, '(expect 26/0)');
"

# 3) sync หลังแก้เสร็จ (ทำเป็นอันดับสุดท้ายเสมอ)
cp factsheet_generator.js public/factsheet_generator.js
cp termsheet_parser.js public/termsheet_parser.js
cp deal_factsheet.js public/deal_factsheet.js
```
สำหรับ real-deal mapper: สร้าง synthetic deal object (shape ตาม §4.3) ด้วยตัวเลขจริงจากแหล่งที่มี (Sale Kit / ดีลจริง) แล้ว `dealToFactsheetData()` → `buildFactsheetKH()` → เช็คไม่มี `undefined`/`NaN`/`[object Object]` และวัดความสูง `.page` ต้อง ≤ 1120px

---

## 10. สถานะสรุป + งานที่เหลือ

### ✅ เสร็จและ verify แล้ว
- 26 curated outputs (13 products × EN/TH)
- Real-deal pipeline สำหรับ 9/13 product types (parser + mapper + render, ทดสอบกับข้อมูลจริง/Sale Kit)
- Split UI: auto-detect multi-deal, checklist, IC override (ที่ re-map ถูกต้อง), generate
- Multi-file upload fix
- `detectVariant` parameter-first + IC override ทุกจุด (compliance safety net)
- **โหมด "1 ผลิตภัณฑ์เดียว" (Step 1 ปกติ) ดึงข้อมูลจริงแล้ว** — ขยาย Agent 1 extraction schema (`variant_fields`) ให้ครบสำหรับ render (เพิ่ม `underlyings`, `tenor`, `issuer`, `koRebate`, `minCoupon`, `coupon`; เปลี่ยนทุกค่าเป็น string มีหน่วยในตัว เช่น `"115%"` แทนตัวเลขเปล่า) → `variantFieldsToDeal()` แปลงเป็น deal object → `dealToFactsheetData()` → render ข้อมูลจริง มี banner เขียว "✅ ดึงจาก Factsheet จริง" สลับกับ banner ส้ม "Illustrative" อัตโนมัติตามว่าใช้ path ไหน — verify แล้วด้วย AI call จริงในเบราว์เซอร์ (KIKO เต็มรูปแบบ + override เปลี่ยนเป็น twin_win ก็ re-map ถูกต้อง)

### 🔜 ยังไม่ทำ
1. **Mapper อีก 4 ประเภท** (three_musketeers, lookback_dispersion, fcn, fixed_rate_note) — รอข้อมูลจริงมาทดสอบก่อน ถ้า Agent 1 ตรวจจับเป็น 4 ตัวนี้ ระบบจะ fallback ไปใช้ template illustrative อัตโนมัติ (ไม่ crash)
2. **ไม่มี automated test suite ถาวร** — verify ผ่าน ad-hoc script ทุกครั้ง (ดู §9)
3. **Windows launcher**, **publish เป็น web app** — deferred ตามที่ user บอกไว้ก่อนหน้า

### ⚠️ กฎที่ต้องรักษาเมื่อ merge เข้าโปรเจกต์อื่น
- **ห้ามสร้างข้อมูลเอง** — ทุกค่าต้องมาจาก REGISTRY (illustrative, ประกาศชัดว่าเป็นตัวอย่าง) หรือจาก parser (ข้อมูลจริง, ค่าที่ไม่มี = `—`)
- **IC override ต้องมีเสมอ** ทุกจุดที่มี auto-detect — ห้ามให้เอกสารผิดออกไปแบบไม่มีทางแก้มือ
- **sync `public/` หลังแก้ root เสมอ** — และแก้ **หลัง** เพิ่ม export เสร็จ (ดูบั๊ก §7 แถวแรก)
- ห้าม ellipsis ตัดข้อความ financial
- Max Upside ของ sharkfin = **+15%** ไม่ใช่ KO Rebate (ยืนยันแล้วว่าถูกต้องตามโครงสร้าง participation)

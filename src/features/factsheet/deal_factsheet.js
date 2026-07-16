/* ==================================================================
   Deal → Factsheet data mapper
   ------------------------------------------------------------------
   Turns a normalized term-sheet deal (from termsheet_parser.js) into a
   data object shaped like a REGISTRY entry, so buildFactsheetKH() can
   render it. STRICT: only values present in the deal are used. Missing
   fields render as "—" or their whole section is omitted — nothing is
   invented. Standard product MECHANICS text (always true for that type)
   is templated with the deal's real numbers substituted in.
================================================================== */
import { detectVariant } from './factsheet_generator.js';

const L = (en, th) => ({ en, th });
const or = v => (v == null || v === '') ? '—' : v;
const num = v => { if(v == null) return null; const m = String(v).replace(/[, ]/g,'').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : null; };

// Thai withholding tax on interest income — used to show net-interest-after-tax when a
// notional is supplied (only for THB/Thai notes; matches the Sale Kit illustrative math).
const WHT_RATE = 0.15;
// "THB 1,000,000" — thousands-separated amount with a currency prefix, no decimals.
const _money = (cur, n, dp = 0) => `${cur || 'THB'} ${Number(n).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp })}`;
// Periods per year implied by an observation-frequency string ("Monthly"→12, "Quarterly"→4).
const _periodsPerYear = txt => { const t = String(txt || '').toLowerCase(); return /quarter/.test(t) ? 4 : /month/.test(t) ? 12 : null; };

// Build the metrics grid (headline first = highlighted). Skips nothing — shows "—" if absent.
function metricsFor(headline, tenor, strike, issuer){
  return [
    headline,
    { l: L('Tenor', 'อายุตราสาร'), v: or(tenor), c: '' },
    { l: L('Strike', 'Strike'), v: or(strike), c: 'sm' },
    { l: L('Issuer', 'ผู้ออกตราสาร'), v: or(issuer), c: 'sm' },
  ];
}
// Known internal shorthand flags → a clear bilingual compliance note (verbatim meaning,
// not fabricated — these are standard regulatory/desk terms with fixed definitions).
const NOTE_TEXT = {
  'reverse solicit': L(
    "⚠️ Reverse Solicit — may only be offered upon the client's own unsolicited request.",
    '⚠️ Reverse Solicit — เสนอขายได้เฉพาะเมื่อลูกค้าติดต่อขอข้อมูลเองเท่านั้น'),
};
function dealNotes(notes){
  return (notes || []).map(n => NOTE_TEXT[String(n).toLowerCase()] || L(n, n));
}
// Trade / Issue / Maturity grid — only the dates that exist. ISO (YYYY-MM-DD) dates from
// Agent 1 are reformatted to "D Mon YYYY" (matches the existing registry convention);
// anything else (e.g. a raw string already in a readable format) is shown as-is.
function _displayDate(s){
  const d = _parseDate(s);
  return d ? _fmtDate(d, 'en') : s;
}
function datesFor(d){
  if(!d) return null;
  const rows = [];
  if(d.trade)    rows.push(['Trade Date', 'วันซื้อขาย', _displayDate(d.trade)]);
  if(d.issue)    rows.push(['Issue Date', 'วันออกตราสาร', _displayDate(d.issue)]);
  if(d.maturity) rows.push(['Maturity Date', 'วันครบกำหนด', _displayDate(d.maturity)]);
  return rows.length ? rows : null;
}

// ---- Date derivation for coupon schedules ----
// If a term sheet states "observed monthly" plus an Issue Date, the observation/coupon
// dates can be CALCULATED (Issue Date + N months) — this is arithmetic on stated facts,
// not fabrication. Handles ISO (YYYY-MM-DD), DD/MM/YYYY, and "24 Jun 2026"-style strings.
function _parseDate(s){
  if(!s) return null;
  s = String(s).trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if(m) return new Date(Date.UTC(+m[1], +m[2]-1, +m[3]));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m) return new Date(Date.UTC(+m[3], +m[2]-1, +m[1]));
  const MO = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  m = s.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if(m){ const mo = MO[m[2].slice(0,3).toLowerCase()]; if(mo != null) return new Date(Date.UTC(+m[3], mo, +m[1])); }
  return null;
}
function _monthsFromTenor(tenor){
  if(!tenor) return null;
  let m = String(tenor).match(/(\d+)\s*month/i);
  if(m) return parseInt(m[1], 10);
  m = String(tenor).match(/(\d+)\s*year/i);
  if(m) return parseInt(m[1], 10) * 12;
  return null;
}
function _fmtDate(d, lang){
  const EN=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const TH=['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const m = lang === 'th' ? TH : EN;
  return `${d.getUTCDate()} ${m[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}
// Build a derived coupon-payment schedule — only when Issue Date, an observation
// frequency (monthly/quarterly), a parseable coupon rate, and a period count (from
// Tenor or Maturity Date) are ALL present. Otherwise returns null (no guessing).
function kikoSchedule(deal, couponPct, money){
  const issueDate = _parseDate(deal.dates && deal.dates.issue);
  const freqText = String((deal.levels && deal.levels.koObs) || '').toLowerCase();
  const periodsPerYear = /quarter/.test(freqText) ? 4 : /month/.test(freqText) ? 12 : null;
  if(!issueDate || !periodsPerYear || couponPct == null || isNaN(couponPct)) return null;
  const stepMonths = 12 / periodsPerYear;
  let totalMonths = _monthsFromTenor(deal.tenor);
  if(!totalMonths){
    const maturityDate = _parseDate(deal.dates && deal.dates.maturity);
    if(maturityDate) totalMonths = Math.round((maturityDate - issueDate) / (1000*60*60*24*30.44));
  }
  if(!totalMonths || totalMonths < stepMonths) return null;
  const periods = Math.round(totalMonths / stepMonths);
  const perPeriodRate = couponPct / periodsPerYear;
  // money (optional): add a net-interest-after-tax column, using the same WHT the tile shows.
  const netPerPeriod = money ? money.notional * (perPeriodRate / 100) * (1 - WHT_RATE) : null;
  const rows_lang = { en: [], th: [] };
  let cum = 0;
  for(let i=1; i<=periods; i++){
    const d = new Date(issueDate); d.setUTCMonth(d.getUTCMonth() + i*stepMonths);
    cum += perPeriodRate;
    const base_en = [String(i), _fmtDate(d,'en'), perPeriodRate.toFixed(3)+'%', cum.toFixed(2)+'%'];
    const base_th = [String(i), _fmtDate(d,'th'), perPeriodRate.toFixed(3)+'%', cum.toFixed(2)+'%'];
    if(money){ const net = _money(money.cur, netPerPeriod, 2); base_en.push(net); base_th.push(net); }
    rows_lang.en.push(base_en);
    rows_lang.th.push(base_th);
  }
  const cols = money
    ? { en: ['Period','Observation Date (calculated)','Coupon','Cumulative','Net Interest After Tax'],
        th: ['งวด','วันสังเกต (คำนวณ)','ดอกเบี้ย','สะสม','ดอกเบี้ยสุทธิหลังหักภาษี'] }
    : { en: ['Period','Observation Date (calculated)','Coupon','Cumulative'],
        th: ['งวด','วันสังเกต (คำนวณ)','ดอกเบี้ย','สะสม'] };
  return {
    cols,
    head: L('Coupon Payment Schedule (Calculated)', 'ตารางการจ่ายดอกเบี้ย (คำนวณ)'),
    rows_lang, amt_col: 2,
  };
}

// ---- KIKO (Knock-In / Knock-Out autocallable) ----
function kikoData(deal){
  const lv = deal.levels;
  const memory = /mem/i.test(lv.koObs || '');
  const european = /final|european/i.test(lv.kiObs || '');
  const koObs = memory ? L('Monthly · Memory', 'รายเดือน · Memory') : L('Observed monthly', 'สังเกตรายเดือน');
  const kiObs = european ? L('At final valuation', 'ณ วันครบกำหนด') : L('Observed daily', 'สังเกตรายวัน');

  const conds = [
    { color: 'green', n: L('Auto-Call (Knock-Out)', 'ไถ่ถอนอัตโนมัติ (Knock-Out)'),
      lv: L(or(lv.ko) + ' of Initial', or(lv.ko) + ' ของราคาเริ่มต้น'), o: koObs,
      d: L(`All stocks ≥ ${or(lv.ko)} on an observation date → early redemption with coupon.`,
           `หุ้นทุกตัว ≥ ${or(lv.ko)} ณ วันสังเกต → ไถ่ถอนก่อนกำหนดพร้อมรับคูปอง`) },
    { color: 'red', n: L('Knock-In', 'Knock-In'),
      lv: L(or(lv.ki) + ' of Initial', or(lv.ki) + ' ของราคาเริ่มต้น'), o: kiObs,
      d: european
        ? L(`If any stock is below ${or(lv.ki)} AND below Strike (${or(lv.strike)}) at maturity → receive shares.`,
            `ถ้าหุ้นตัวใด < ${or(lv.ki)} และ < Strike (${or(lv.strike)}) เฉพาะ ณ วันครบกำหนด → รับเป็นหุ้น`)
        : L(`If any stock ever trades below ${or(lv.ki)} AND closes below Strike (${or(lv.strike)}) → receive shares.`,
            `ถ้าหุ้นตัวใดเคยแตะ < ${or(lv.ki)} และปิด < Strike (${or(lv.strike)}) → รับเป็นหุ้น`) },
    { color: 'purple', n: L('Coupon', 'คูปอง'),
      lv: L(or(lv.coupon), or(lv.coupon)), o: L('Paid on call / at maturity', 'จ่ายเมื่อไถ่ถอน/ครบกำหนด'),
      d: L(`Fixed coupon of ${or(lv.coupon)}; Strike set at ${or(lv.strike)}.`,
           `คูปองคงที่ ${or(lv.coupon)} · Strike ที่ ${or(lv.strike)}`) },
  ];

  // %-only basket (no Spot THB / shares / Selling Code — not provided in the short format)
  const basket = {
    cols_en: ['Underlying', 'Strike', 'Knock-Out', 'Knock-In'],
    cols_th: ['หลักทรัพย์', 'Strike', 'Knock-Out', 'Knock-In'],
    groups: [[null, (deal.underlyings.length ? deal.underlyings : ['—'])
      .map(u => [u, '', or(lv.strike), or(lv.ko), or(lv.ki)])]],
    ki_cols: [], ko_cols: [],
  };

  const issuer = deal.issuer;
  const payoffNote = L(
    `<b>How the payoff works:</b> if all stocks are ≥ ${or(lv.ko)} on an observation date → the note auto-redeems early with the coupon. If it is never called and no stock breaches Knock-In (${or(lv.ki)}) → principal + coupon at maturity. If a stock breaches Knock-In and closes below Strike (${or(lv.strike)}) → you receive shares and may realise a loss (not principal protected).`,
    `<b>วิธีคิดผลตอบแทน:</b> ถ้าหุ้นทุกตัว ≥ ${or(lv.ko)} ณ วันสังเกต → ไถ่ถอนก่อนกำหนดพร้อมคูปอง · ถ้าไม่ถูกไถ่ถอนและไม่มีหุ้นแตะ Knock-In (${or(lv.ki)}) → คืนเงินต้น + คูปอง ณ ครบกำหนด · ถ้ามีหุ้นแตะ Knock-In และปิด < Strike (${or(lv.strike)}) → รับเป็นหุ้น อาจขาดทุน (ไม่คุ้มครองเงินต้น)`);

  // Schedule dates are CALCULATED from Issue Date + stated observation frequency (never
  // taken verbatim from a per-period date list, since real deals often only state the
  // frequency) — omitted entirely if Issue Date / frequency / coupon rate aren't all known.
  // Notional (optional) turns on subscription + net-interest displays, matching the
  // illustrative reference. Net interest applies Thai WHT only for THB notes (avoids
  // asserting a Thai tax rate on foreign-currency deals).
  const notional = (typeof deal.notional === 'number' && deal.notional > 0) ? deal.notional : null;
  const cur = deal.currency || 'THB';
  const couponPct = num(lv.coupon);
  const ppy = _periodsPerYear(lv.koObs);
  // Net-interest-after-tax is shown only for MONTHLY THB notes: the render engine's built-in
  // "Calculation:" caption is hard-coded to THB and ÷12, so a quarterly note would be
  // mislabelled. For quarterly / foreign-currency notes we show subscription but not net
  // interest (never assert a wrong period or a Thai WHT on a non-THB deal).
  const showNetInterest = notional != null && cur === 'THB' && couponPct != null && ppy === 12
  const netPerPeriod = showNetInterest ? notional * (couponPct / 100) / 12 * (1 - WHT_RATE) : null;

  const schedule = kikoSchedule(deal, couponPct, showNetInterest ? { notional, cur } : null);
  const scheduleNote = schedule ? L(
    'Dates are calculated from the Issue Date and the stated monthly/quarterly observation frequency — the live term sheet may shift each date by a few days for business-day/weekend adjustment.',
    'วันที่คำนวณจากวันออกตราสารและความถี่การสังเกตที่ระบุไว้ (รายเดือน/รายไตรมาส) — term sheet ฉบับจริงอาจคลาดเคลื่อนไม่กี่วันจากการปรับวันทำการ') : null;

  // With a notional: show Coupon / Tenor / Min Subscription / Net Interest tiles (as the
  // reference does); without it, fall back to the plain Coupon / Tenor / Strike / Issuer grid.
  const metrics = notional != null
    ? [
        { l: L('Coupon', 'คูปอง'), v: or(lv.coupon), c: 'purple' },
        { l: L('Tenor', 'อายุตราสาร'), v: or(deal.tenor), c: '' },
        { l: L('Min. Subscription', 'มูลค่าจองซื้อขั้นต่ำ'), v: _money(cur, notional), c: 'sm' },
        ...(showNetInterest ? [{ l: L('Net Interest / Month', 'ดอกเบี้ยสุทธิ / เดือน'), v: _money(cur, Math.round(netPerPeriod)), c: 'green' }]
                            : [{ l: L('Strike', 'Strike'), v: or(lv.strike), c: 'sm' }]),
      ]
    : metricsFor({ l: L('Coupon', 'คูปอง'), v: or(lv.coupon), c: 'purple' }, deal.tenor, lv.strike, issuer);

  return {
    _type: 'kiko', _realDeal: true,
    title: L('KIKO Autocallable Note', 'หุ้นกู้อนุพันธ์แฝง KIKO'),
    subdate: deal.dates && deal.dates.trade
      ? L('As of ' + _displayDate(deal.dates.trade), 'ณ วันที่ ' + _displayDate(deal.dates.trade)) : null,
    tag: L(`KIKO — Knock-In / Knock-Out&nbsp; | &nbsp;Not Principal Protected&nbsp; | &nbsp;Issuer: ${or(issuer)}`,
           `KIKO — Knock-In / Knock-Out&nbsp; | &nbsp;ไม่คุ้มครองเงินต้น&nbsp; | &nbsp;ผู้ออก: ${or(issuer)}`),
    metrics,
    dates: datesFor(deal.dates),
    conds, basket, schedule,
    _payoffNote: payoffNote,
    _scheduleNote: scheduleNote,
    _dealNotes: dealNotes(deal.notes),
  };
}

// ---- Twin Win (dual-barrier, profits either direction inside the band) ----
function twinWinData(deal){
  const lv = deal.levels;
  // No card/number here is computed — Lower KO, Upper KO, Participation, Min Coupon,
  // KO Rebate are all read straight off the deal. No Strike/Initial % is assumed.
  const conds = [
    { color: 'gray', n: L('Knock-Out Band', 'กรอบ Knock-Out'),
      lv: L(`${or(lv.lowerKO)} – ${or(lv.upperKO)}`, `${or(lv.lowerKO)} – ${or(lv.upperKO)}`),
      o: L('Observed daily', 'สังเกตรายวัน'),
      d: L(`Stay inside the ${or(lv.lowerKO)}–${or(lv.upperKO)} band → twin-win payoff. Touch either edge (Knock-Out) → flat ${or(lv.koRebate)} Rebate instead.`,
           `อยู่ในกรอบ ${or(lv.lowerKO)}–${or(lv.upperKO)} → ได้ผลตอบแทนแบบ twin-win · แตะขอบใดขอบหนึ่ง (Knock-Out) → รับ Rebate คงที่ ${or(lv.koRebate)} แทน`) },
    { color: 'purple', n: L('Twin-Win Participation', 'ส่วนร่วม Twin-Win'),
      lv: L(`${or(lv.participation)} · min ${or(lv.minCoupon)}`, `${or(lv.participation)} · ขั้นต่ำ ${or(lv.minCoupon)}`),
      o: L('abs. move × ' + or(lv.participation), '|การเคลื่อนไหว| × ' + or(lv.participation)),
      d: L(`If never knocked out: absolute price move × ${or(lv.participation)}, floored at the ${or(lv.minCoupon)} minimum coupon.`,
           `ถ้าไม่ถูก Knock-Out: |การเคลื่อนไหวราคา| × ${or(lv.participation)} มีพื้นขั้นต่ำที่ ${or(lv.minCoupon)}`) },
    { color: 'green', n: L('Minimum Coupon', 'ดอกเบี้ยขั้นต่ำ'),
      lv: L(or(lv.minCoupon), or(lv.minCoupon)), o: L('If no Knock-Out', 'ถ้าไม่ Knock-Out'),
      d: L(`Guaranteed minimum coupon of ${or(lv.minCoupon)} even with little price movement (subject to issuer credit).`,
           `รับดอกเบี้ยขั้นต่ำ ${or(lv.minCoupon)} แม้ราคาแทบไม่เคลื่อนไหว (ขึ้นกับเครดิตผู้ออกตราสาร)`) },
  ];

  const basket = {
    cols_en: ['Underlying', 'Lower KO', 'Upper KO', 'Min Coupon'],
    cols_th: ['หลักทรัพย์', 'Lower KO', 'Upper KO', 'ดอกเบี้ยขั้นต่ำ'],
    groups: [[null, (deal.underlyings.length ? deal.underlyings : ['—'])
      .map(u => [u, '', or(lv.lowerKO), or(lv.upperKO), or(lv.minCoupon)])]],
    ki_cols: [], ko_cols: [2, 3],
  };

  const issuer = deal.issuer;
  const payoffNote = L(
    `<b>How the payoff works:</b> if the underlying stays within the ${or(lv.lowerKO)}–${or(lv.upperKO)} band until maturity → you earn the absolute move × ${or(lv.participation)} (floored at ${or(lv.minCoupon)}). If it ever touches ${or(lv.lowerKO)} or ${or(lv.upperKO)} (Knock-Out) → a flat ${or(lv.koRebate)} Rebate instead.`,
    `<b>วิธีคิดผลตอบแทน:</b> ถ้าราคาอยู่ในกรอบ ${or(lv.lowerKO)}–${or(lv.upperKO)} จนครบกำหนด → ได้ |การเคลื่อนไหว| × ${or(lv.participation)} (พื้นขั้นต่ำ ${or(lv.minCoupon)}) · ถ้าเคยแตะ ${or(lv.lowerKO)} หรือ ${or(lv.upperKO)} (Knock-Out) → รับ Rebate คงที่ ${or(lv.koRebate)} แทน`);

  return {
    _type: 'twin_win', _realDeal: true,
    title: L('Twin Win Note', 'หุ้นกู้อนุพันธ์แฝง Twin Win'),
    subdate: deal.date ? L('As of ' + deal.date, 'ณ วันที่ ' + deal.date) : null,
    tag: L(`Twin Win&nbsp; | &nbsp;Profits Up or Down&nbsp; | &nbsp;Issuer: ${or(issuer)}`,
           `Twin Win&nbsp; | &nbsp;ได้กำไรทั้งขึ้นและลง&nbsp; | &nbsp;ผู้ออก: ${or(issuer)}`),
    metrics: [
      { l: L('Min Coupon', 'ดอกเบี้ยขั้นต่ำ'), v: or(lv.minCoupon), c: 'purple' },
      { l: L('Tenor', 'อายุตราสาร'), v: or(deal.tenor), c: '' },
      { l: L('KO Band', 'กรอบ KO'), v: `${or(lv.lowerKO)}–${or(lv.upperKO)}`, c: 'sm' },
      { l: L('Issuer', 'ผู้ออกตราสาร'), v: or(issuer), c: 'sm' },
    ],
    dates: datesFor(deal.dates),
    conds, basket,
    _payoffNote: payoffNote,
    _dealNotes: dealNotes(deal.notes),
  };
}

// ---- Bullish / Bearish Sharkfin (single-barrier, capped participation vs flat rebate) ----
function sharkfinData(deal, direction){
  const lv = deal.levels;
  const isBull = direction === 'bullish_sharkfin';
  const dirEn = isBull ? 'rises' : 'falls', dirTh = isBull ? 'ขึ้น' : 'ลง';
  const dirNoEn = isBull ? "doesn't rise" : "doesn't fall", dirNoTh = isBull ? 'ไม่ขึ้น' : 'ไม่ลง';

  const conds = [];
  // Only shown if the deal actually states a redemption floor — never assumed.
  if(lv.minRedemption != null){
    conds.push({ color: 'green', n: L('Min. Redemption', 'ไถ่ถอนขั้นต่ำ'),
      lv: L(or(lv.minRedemption), or(lv.minRedemption)), o: L('At maturity', 'ณ วันครบกำหนด'),
      d: L(`At least ${or(lv.minRedemption)} of principal is returned at maturity (subject to issuer credit).`,
           `คืนเงินต้นอย่างน้อย ${or(lv.minRedemption)} ณ วันครบกำหนด (ขึ้นกับเครดิตผู้ออกตราสาร)`) });
  }
  conds.push({ color: 'gray', n: L('Knock-Out Level', 'ระดับ Knock-Out'),
    lv: L(or(lv.ko) + ' of Initial', or(lv.ko) + ' ของราคาเริ่มต้น'),
    o: L('Observed daily', 'สังเกตรายวัน'),
    d: L(`If the underlying ever ${isBull ? 'rises above' : 'falls below'} ${or(lv.ko)} → pays a flat ${or(lv.koRebate)} KO Rebate instead of participation.`,
         `ถ้าราคาเคย${isBull ? 'ขึ้นเกิน' : 'ลงต่ำกว่า'} ${or(lv.ko)} → รับ KO Rebate คงที่ ${or(lv.koRebate)} แทน participation`) });
  conds.push({ color: 'purple', n: L(isBull ? 'Upside Participation' : 'Downside Participation', isBull ? 'ส่วนร่วมขาขึ้น' : 'ส่วนร่วมขาลง'),
    lv: L(or(lv.participation), or(lv.participation)), o: L('If never knocked out', 'ถ้าไม่ Knock-Out'),
    d: L(`If never knocked out, you earn the ${isBull ? 'rise' : 'decline'} × ${or(lv.participation)}.`,
         `ถ้าไม่ถูก Knock-Out จะได้กำไรจาก${isBull ? 'ราคาขึ้น' : 'ราคาลง'} × ${or(lv.participation)}`) });

  const basket = {
    cols_en: ['Underlying', 'KO Level', 'KO Rebate'],
    cols_th: ['หลักทรัพย์', 'ระดับ Knock-Out', 'KO Rebate'],
    groups: [[null, (deal.underlyings.length ? deal.underlyings : ['—'])
      .map(u => [u, '', or(lv.ko), or(lv.koRebate)])]],
    ki_cols: [], ko_cols: [1],
  };

  const issuer = deal.issuer;
  const redemptionEn = lv.minRedemption != null ? 'principal is returned per the Min. Redemption above' : 'refer to the live term sheet for the redemption amount';
  const redemptionTh = lv.minRedemption != null ? 'คืนเงินต้นตาม Min. Redemption ข้างต้น' : 'โปรดดู term sheet ฉบับจริงสำหรับยอดไถ่ถอน';
  const payoffNote = L(
    `<b>How the payoff works:</b> if the underlying ${dirEn} but never touches the Knock-Out Level (${or(lv.ko)}) → Participation pays the ${isBull ? 'rise' : 'decline'} × ${or(lv.participation)} (no cap is stated in this summary — check the live term sheet). If it ever touches ${or(lv.ko)} (Knock-Out) → you receive a flat ${or(lv.koRebate)} KO Rebate instead. If it ${dirNoEn} → ${redemptionEn}.`,
    `<b>วิธีคิดผลตอบแทน:</b> ถ้าราคา${isBull?'ขึ้น':'ลง'}แต่ไม่เคยแตะ Knock-Out Level (${or(lv.ko)}) → รับ Participation × ${or(lv.participation)} (สรุปนี้ไม่มีข้อมูลเพดาน โปรดดู term sheet ฉบับจริง) · ถ้าเคยแตะ ${or(lv.ko)} (Knock-Out) → รับ KO Rebate คงที่ ${or(lv.koRebate)} แทน · ถ้าราคา${isBull?'ไม่ขึ้น':'ไม่ลง'} → ${redemptionTh}`);

  return {
    _type: direction, _realDeal: true,
    title: isBull ? L('Bullish Sharkfin', 'Bullish Sharkfin') : L('Bearish Sharkfin', 'Bearish Sharkfin'),
    subdate: deal.date ? L('As of ' + deal.date, 'ณ วันที่ ' + deal.date) : null,
    tag: L(`${isBull?'Bullish':'Bearish'} Sharkfin&nbsp; | &nbsp;Issuer: ${or(issuer)}`,
           `${isBull?'Bullish':'Bearish'} Sharkfin&nbsp; | &nbsp;ผู้ออก: ${or(issuer)}`),
    metrics: [
      { l: L('Participation Rate', 'อัตราการมีส่วนร่วม'), v: or(lv.participation), c: 'purple' },
      { l: L('Tenor', 'อายุตราสาร'), v: or(deal.tenor), c: '' },
      { l: L('KO Level', 'ระดับ Knock-Out'), v: or(lv.ko), c: 'sm' },
      { l: L('Issuer', 'ผู้ออกตราสาร'), v: or(issuer), c: 'sm' },
    ],
    dates: datesFor(deal.dates),
    conds, basket,
    _payoffNote: payoffNote,
    _dealNotes: dealNotes(deal.notes),
  };
}

// ---- Booster / Booster With Protection (worst-of participation, no downside barrier) ----
function boosterData(deal, protectedNote){
  const lv = deal.levels;
  const settlement = protectedNote ? L('Cash', 'เงินสด') : L('Physical', 'หลักทรัพย์');

  const conds = [];
  if(protectedNote && lv.minRedemption != null){
    conds.push({ color: 'green', n: L('Min. Redemption', 'ไถ่ถอนขั้นต่ำ'),
      lv: L(or(lv.minRedemption), or(lv.minRedemption)), o: L('If any < Strike', 'ถ้ามีตัวใด < Strike'),
      d: L(`Even if a stock closes below Strike, redemption is floored at ${or(lv.minRedemption)} of principal (subject to issuer credit).`,
           `แม้มีหุ้นปิดต่ำกว่า Strike ก็ยังได้คืนอย่างน้อย ${or(lv.minRedemption)} ของเงินต้น (ขึ้นกับเครดิตผู้ออกตราสาร)`) });
  }
  conds.push({ color: 'gray', n: L('Strike Price', 'Strike Price'),
    lv: L(or(lv.strike), or(lv.strike)), o: L('At maturity', 'ณ วันครบกำหนด'),
    d: L(`If every stock closes ≥ Strike (${or(lv.strike)}) → principal + worst-off performance × Participation.`,
         `ถ้าหุ้นทุกตัวปิด ≥ Strike (${or(lv.strike)}) → คืนเงินต้น + ผลตอบแทนของตัวแย่สุด × Participation`) });
  conds.push({ color: 'purple', n: L('Participation Rate', 'อัตราการมีส่วนร่วม'),
    lv: L(or(lv.participation), or(lv.participation)), o: L('If all ≥ Strike', 'ถ้าทุกตัว ≥ Strike'),
    d: L(`Worst-off stock's performance × ${or(lv.participation)}.`, `ผลตอบแทนของหุ้นที่แย่ที่สุด × ${or(lv.participation)}`) });
  if(!protectedNote){
    conds.push({ color: 'red', n: L('Settlement if Below Strike', 'การส่งมอบหากต่ำกว่า Strike'),
      lv: settlement, o: L('If any < Strike', 'ถ้ามีตัวใด < Strike'),
      d: L(`If any stock closes below Strike, principal is used to buy that stock at the Strike price (not principal protected).`,
           `ถ้ามีหุ้นตัวใดปิดต่ำกว่า Strike เงินต้นจะถูกนำไปซื้อหุ้นตัวนั้นที่ราคา Strike (ไม่คุ้มครองเงินต้น)`) });
  }

  const underlyings = deal.underlyings.length ? deal.underlyings : ['—'];
  const n = underlyings.length;
  const basketCols = protectedNote
    ? { cols_en: ['Stock', 'Strike', 'Participation', 'Min. Redemption'], cols_th: ['หลักทรัพย์', 'Strike', 'Participation', 'ไถ่ถอนขั้นต่ำ'] }
    : { cols_en: ['Stock', 'Strike', 'Participation', 'Settlement'], cols_th: ['หลักทรัพย์', 'Strike', 'Participation', 'การส่งมอบ'] };
  const lastCol = protectedNote ? or(lv.minRedemption) : settlement.en;
  const basket = {
    ...basketCols,
    groups: [[null, underlyings.map((u, i) => [u, '', or(lv.strike), i === 0 ? or(lv.participation) : '', i === 0 ? lastCol : ''])]],
    ki_cols: [1], ko_cols: [],
  };

  const payoffNote = protectedNote ? L(
    `<b>How the payoff works:</b> if every stock closes ≥ Strike (${or(lv.strike)}) at maturity → principal + worst-off performance × ${or(lv.participation)}. If any stock closes below Strike → you still get at least ${or(lv.minRedemption)} of principal back in cash.`,
    `<b>วิธีคิดผลตอบแทน:</b> ถ้าหุ้นทุกตัวปิด ≥ Strike (${or(lv.strike)}) ณ วันครบกำหนด → คืนเงินต้น + ผลตอบแทนตัวแย่สุด × ${or(lv.participation)} · ถ้ามีตัวใดปิดต่ำกว่า Strike → ยังได้คืนอย่างน้อย ${or(lv.minRedemption)} ของเงินต้นเป็นเงินสด`
  ) : L(
    `<b>How the payoff works:</b> if every stock closes ≥ Strike (${or(lv.strike)}) at maturity → principal + worst-off performance × ${or(lv.participation)}. If any stock closes below Strike → principal is used to buy that stock at Strike price (not principal protected).`,
    `<b>วิธีคิดผลตอบแทน:</b> ถ้าหุ้นทุกตัวปิด ≥ Strike (${or(lv.strike)}) ณ วันครบกำหนด → คืนเงินต้น + ผลตอบแทนตัวแย่สุด × ${or(lv.participation)} · ถ้ามีตัวใดปิดต่ำกว่า Strike → นำเงินต้นไปซื้อหุ้นตัวนั้นที่ราคา Strike (ไม่คุ้มครองเงินต้น)`
  );

  return {
    _type: protectedNote ? 'booster_prot' : 'booster', _realDeal: true,
    title: protectedNote ? L('Booster With Protection', 'Booster With Protection') : L('Booster', 'Booster'),
    subdate: deal.date ? L('As of ' + deal.date, 'ณ วันที่ ' + deal.date) : null,
    tag: protectedNote
      ? L('Booster With Protection&nbsp; | &nbsp;Geared Participation&nbsp; | &nbsp;Partial Principal Protection', 'Booster With Protection&nbsp; | &nbsp;ทวีผลตอบแทน&nbsp; | &nbsp;คุ้มครองเงินต้นบางส่วน')
      : L('Booster&nbsp; | &nbsp;Not Principal Protected&nbsp; | &nbsp;Geared Participation', 'Booster&nbsp; | &nbsp;ไม่คุ้มครองเงินต้น&nbsp; | &nbsp;ทวีผลตอบแทน'),
    metrics: [
      { l: L('Participation Rate', 'อัตราการมีส่วนร่วม'), v: or(lv.participation), c: 'purple' },
      { l: L('Tenor', 'อายุตราสาร'), v: or(deal.tenor), c: '' },
      { l: L('Strike', 'Strike'), v: or(lv.strike), c: 'sm' },
      protectedNote
        ? { l: L('Min. Redemption', 'ไถ่ถอนขั้นต่ำ'), v: or(lv.minRedemption), c: 'green' }
        : { l: L('Settlement', 'การส่งมอบ'), v: 'Physical', c: 'sm' },
    ],
    dates: datesFor(deal.dates),
    conds, basket,
    _payoffNote: payoffNote,
    _dealNotes: dealNotes(deal.notes),
  };
}

// ---- BEN family: Bonus Enhance Note (Physical / Cash Settlement / With Protection) ----
function benData(deal, variant){
  const lv = deal.levels;
  const isCash = variant === 'ben_cash';
  const isProt = variant === 'ben_prot';

  const conds = [
    { color: 'green', n: L('Coupon Barrier', 'Coupon Barrier'),
      lv: L(or(lv.couponBarrier ?? lv.ko) + ' of Initial', or(lv.couponBarrier ?? lv.ko) + ' ของราคาเริ่มต้น'), o: L('At maturity', 'ณ วันครบกำหนด'),
      d: L(`If all stocks close ≥ Coupon Barrier → principal + the greater of worst-off performance or the Bonus Coupon.`,
           `ถ้าหุ้นทุกตัวปิด ≥ Coupon Barrier → คืนเงินต้น + ผลตอบแทนที่มากกว่าระหว่างตัวแย่สุด กับ Bonus Coupon`) },
    { color: 'purple', n: L('Bonus Coupon', 'Bonus Coupon'),
      lv: L(or(lv.bonus), or(lv.bonus)), o: L('If barrier met', 'ถ้าเข้าเงื่อนไข Barrier'),
      d: L(`At least ${or(lv.bonus)}, or the worst-off performance if higher.`, `อย่างน้อย ${or(lv.bonus)} หรือผลตอบแทนตัวแย่สุดถ้าสูงกว่า`) },
  ];
  if(isProt && lv.minRedemption != null){
    conds.push({ color: 'green', n: L('Min. Redemption', 'ไถ่ถอนขั้นต่ำ'),
      lv: L(or(lv.minRedemption), or(lv.minRedemption)), o: L('If below Strike', 'ถ้าต่ำกว่า Strike'),
      d: L(`Even below Strike, redemption is floored at ${or(lv.minRedemption)} of principal.`, `แม้ต่ำกว่า Strike ก็ยังได้คืนอย่างน้อย ${or(lv.minRedemption)} ของเงินต้น`) });
  } else {
    conds.push({ color: 'red', n: L('Strike Price', 'Strike Price'),
      lv: L(or(lv.strike), or(lv.strike)), o: L('If below barrier', 'ถ้าต่ำกว่า barrier'),
      d: isCash
        ? L(`If the underlying closes below Strike (${or(lv.strike)}) → cash settlement based on its performance ÷ Strike (not principal protected).`,
            `ถ้าราคาปิดต่ำกว่า Strike (${or(lv.strike)}) → ชำระเป็นเงินสดตามผลตอบแทน ÷ Strike (ไม่คุ้มครองเงินต้น)`)
        : L(`If any stock closes below Strike (${or(lv.strike)}) → principal is used to buy that stock at Strike price (not principal protected).`,
            `ถ้ามีหุ้นตัวใดปิดต่ำกว่า Strike (${or(lv.strike)}) → นำเงินต้นไปซื้อหุ้นตัวนั้นที่ราคา Strike (ไม่คุ้มครองเงินต้น)`) });
  }

  const underlyings = deal.underlyings.length ? deal.underlyings : ['—'];
  const cols_en = isProt ? ['Stock', 'Strike', 'Coupon Barrier', 'Bonus', 'Min. Redemption']
    : ['Stock', 'Strike', 'Coupon Barrier', 'Bonus'];
  const cols_th = isProt ? ['หลักทรัพย์', 'Strike', 'Coupon Barrier', 'Bonus', 'ไถ่ถอนขั้นต่ำ']
    : ['หลักทรัพย์', 'Strike', 'Coupon Barrier', 'Bonus'];
  const cb = or(lv.couponBarrier ?? lv.ko);
  const basket = {
    cols_en, cols_th,
    groups: [[null, underlyings.map((u, i) => isProt
      ? [u, '', or(lv.strike), cb, or(lv.bonus), i === 0 ? or(lv.minRedemption) : '']
      : [u, '', or(lv.strike), cb, or(lv.bonus)])]],
    ki_cols: [1], ko_cols: [],
  };

  const payoffNote = isProt ? L(
    `<b>How the payoff works:</b> if all stocks close ≥ Coupon Barrier (${cb}) → principal + the greater of worst-off performance or the ${or(lv.bonus)} Bonus. If any stock is below Strike (${or(lv.strike)}) → you still get at least ${or(lv.minRedemption)} of principal back.`,
    `<b>วิธีคิดผลตอบแทน:</b> ถ้าหุ้นทุกตัวปิด ≥ Coupon Barrier (${cb}) → คืนเงินต้น + ผลตอบแทนที่มากกว่าระหว่างตัวแย่สุดกับ Bonus ${or(lv.bonus)} · ถ้ามีตัวใดต่ำกว่า Strike (${or(lv.strike)}) → ยังได้คืนอย่างน้อย ${or(lv.minRedemption)} ของเงินต้น`
  ) : L(
    `<b>How the payoff works:</b> if all stocks close ≥ Coupon Barrier (${cb}) → principal + the greater of worst-off performance or the ${or(lv.bonus)} Bonus. If any stock is below Strike (${or(lv.strike)}) → ${isCash ? 'cash settlement based on its performance ÷ Strike' : 'principal is used to buy that stock at Strike price'} (not principal protected).`,
    `<b>วิธีคิดผลตอบแทน:</b> ถ้าหุ้นทุกตัวปิด ≥ Coupon Barrier (${cb}) → คืนเงินต้น + ผลตอบแทนที่มากกว่าระหว่างตัวแย่สุดกับ Bonus ${or(lv.bonus)} · ถ้ามีตัวใดต่ำกว่า Strike (${or(lv.strike)}) → ${isCash ? 'ชำระเป็นเงินสดตามผลตอบแทน ÷ Strike' : 'นำเงินต้นไปซื้อหุ้นตัวนั้นที่ราคา Strike'} (ไม่คุ้มครองเงินต้น)`
  );

  const titles = { ben: L('BEN (Bonus Enhance Note)', 'BEN (Bonus Enhance Note)'),
    ben_cash: L('BEN (Cash Settlement)', 'BEN (Cash Settlement)'),
    ben_prot: L('BEN With Protection', 'BEN With Protection') };
  const tags = { ben: L('BEN — Bonus Enhance Note&nbsp; | &nbsp;Not Principal Protected&nbsp; | &nbsp;Physical Settlement', 'BEN — Bonus Enhance Note&nbsp; | &nbsp;ไม่คุ้มครองเงินต้น&nbsp; | &nbsp;ส่งมอบเป็นหลักทรัพย์'),
    ben_cash: L('BEN — Bonus Enhance Note&nbsp; | &nbsp;Not Principal Protected&nbsp; | &nbsp;Cash Settlement', 'BEN — Bonus Enhance Note&nbsp; | &nbsp;ไม่คุ้มครองเงินต้น&nbsp; | &nbsp;ชำระเป็นเงินสด'),
    ben_prot: L('BEN With Protection&nbsp; | &nbsp;Partial Principal Protection', 'BEN With Protection&nbsp; | &nbsp;คุ้มครองเงินต้นบางส่วน') };

  return {
    _type: variant, _realDeal: true,
    title: titles[variant],
    subdate: deal.date ? L('As of ' + deal.date, 'ณ วันที่ ' + deal.date) : null,
    tag: tags[variant],
    metrics: [
      { l: L('Bonus Coupon', 'Bonus Coupon'), v: or(lv.bonus), c: 'purple' },
      { l: L('Tenor', 'อายุตราสาร'), v: or(deal.tenor), c: '' },
      { l: L('Strike', 'Strike'), v: or(lv.strike), c: 'sm' },
      isProt ? { l: L('Min. Redemption', 'ไถ่ถอนขั้นต่ำ'), v: or(lv.minRedemption), c: 'green' }
             : { l: L('Coupon Barrier', 'Coupon Barrier'), v: cb, c: 'sm' },
    ],
    dates: datesFor(deal.dates),
    conds, basket,
    _payoffNote: payoffNote,
    _dealNotes: dealNotes(deal.notes),
  };
}

// Product keys this mapper set can currently produce (used to validate an IC override).
export const MAPPED_PRODUCT_KEYS = ['kiko','twin_win','bullish_sharkfin','bearish_sharkfin','booster','booster_prot','ben','ben_cash','ben_prot'];

// Dispatch on the parameter-detected product type. Pass overrideKey to force a specific
// product (IC manual override) instead of trusting detectVariant — same compliance
// safety net as the single-product flow: never let a misdetected doc go out silently.
export function dealToFactsheetData(deal, overrideKey){
  const key = overrideKey || detectVariant(deal.variantFields) || 'kiko';
  switch(key){
    case 'kiko': return kikoData(deal);
    case 'twin_win': return twinWinData(deal);
    case 'bullish_sharkfin': case 'bearish_sharkfin': return sharkfinData(deal, key);
    case 'booster': return boosterData(deal, false);
    case 'booster_prot': return boosterData(deal, true);
    case 'ben': case 'ben_cash': case 'ben_prot': return benData(deal, key);
    default:
      throw new Error(`No verified mapper yet for "${key}" — need a real term-sheet sample before building this to avoid guessing the field layout.`);
  }
}

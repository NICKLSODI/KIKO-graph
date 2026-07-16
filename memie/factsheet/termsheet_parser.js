/* ==================================================================
   Term-sheet parser — InnovestX internal "daily deal list" format
   ------------------------------------------------------------------
   Deterministic (no AI) parser for the multi-deal text list, e.g.:

     📌 KIKO
     A🔺 KIKO (TSM ASML AMD)
     KO: 85% (Monthly Observe)
     KI: 55% (Daily Observe)
     Strike: 85%
     Tenor: 3 months
     Coupon: 27.36% p.a. (Final)
     💎 INVX recommend
     Issuer: BNPP
     =========

   STRICT RULE: nothing is invented. Only fields literally present in
   the text are captured. Missing data stays missing (null), so the
   downstream factsheet can omit it rather than fabricate a value.
================================================================== */

// Split the pasted list into individual deal blocks.
export function splitDealList(text){
  const lines = String(text).split(/\r?\n/);
  const deals = [];
  let curDate = null, curCat = null, cur = null;
  // A deal starts with a capital letter + a 🔺/🔻 marker, then "Name (UNDERLYINGS)".
  const dealStart = /^([A-Z])\s*[\u{1F53A}\u{1F53B}]\s*(.+?)\s*\(([^)]+)\)\s*$/u;
  const flush = () => { if(cur){ deals.push(cur); cur = null; } };

  for(const raw of lines){
    const line = raw.trim();
    if(!line) continue;
    if(/internal use only/i.test(line)) continue;                 // banner
    const dm = line.match(/รายการวันนี้\s*([\d/]+)/);              // day header
    if(dm){ flush(); curDate = dm[1]; continue; }
    if(/^\u{1F4CC}/u.test(line)){ flush(); curCat = line.replace(/^\u{1F4CC}\s*/u,'').trim(); continue; } // 📌 category
    if(/^={3,}$/.test(line)){ flush(); continue; }                // separator
    const ds = line.match(dealStart);
    if(ds){
      flush();
      cur = { letter: ds[1], date: curDate, category: curCat, product: ds[2].trim(),
              underlyings: ds[3].trim().split(/\s+/), fields: {}, notes: [], raw: [line] };
      continue;
    }
    if(!cur) continue;
    cur.raw.push(line);
    if(/^[\u{26A0}\u{1F48E}]/u.test(line)){                        // ⚠️ / 💎 note lines
      cur.notes.push(line.replace(/^[\u{26A0}️\u{1F48E}\s]+/u,'').trim());
      continue;
    }
    const kv = line.match(/^(.+?)\s*:\s*(.+)$/);                   // key : value
    if(kv) cur.fields[kv[1].trim()] = kv[2].trim();
  }
  flush();
  return deals;
}

// ---- Format 3: column-dump "summary table" (No./Product/Instrument Code/Issuer/
//      Instrument Description/Underlying/Trade/Issue/Maturity), one field per line ----
const TABLE_HEADERS = ['No.','Product','Instrument Code','Issuer','Instrument Description',
  'Underlying','Trade Date','Issue Date','Maturity Date'];

// Expand KI/KO observation abbreviations found in the Instrument Description.
function obsFromAbbr(a){
  if(!a) return null;
  const u=a.toUpperCase();
  if(u==='AKI') return 'American (daily)';
  if(u==='EKI') return 'European (at final valuation)';
  if(u==='MEM'||u==='MEMORY') return 'Memory';
  return a;
}
// Parse the free-text Instrument Description into structured fields (numbers verbatim).
export function parseInstrumentDescription(desc){
  const d=String(desc);
  const tenor=(d.match(/(\d+\s*(?:Months?|Years?|Y|M)\b)/i)||[])[1]||null;
  const und=(d.match(/linked to\s+(.+?)\s*,\s*(?:KI|KO|Strike|Coupon)\b/i)||[])[1];
  const underlyings=und?und.split(/\s*,\s*/).map(s=>s.trim()).filter(Boolean):[];
  const kiM=d.match(/\bKI\s+([\d.]+%)\s*(AKI|EKI)?/i);
  const koM=d.match(/\bKO\s+([\d.]+%)\s*(Mem|Memory)?/i);
  const strikeM=d.match(/\bStrike\s+([\d.]+%)/i);
  const couponM=d.match(/\bCoupon\s+([\d.]+%\s*p\.a\.?)/i);
  return {
    tenor, underlyings,
    ki: kiM?kiM[1]:null, kiObs: kiM?obsFromAbbr(kiM[2]):null,
    ko: koM?koM[1]:null, koObs: koM?obsFromAbbr(koM[2]):null,
    strike: strikeM?strikeM[1]:null,
    coupon: couponM?couponM[1].replace(/\s+/g,' ').trim():null,
  };
}
// Split the summary table into normalized deals (same output shape as normalizeDeal()).
export function parseSummaryTable(text){
  const lines=String(text).split(/\r?\n/).map(l=>l.trim()).filter(l=>l!=='');
  // find the header run, then consume records of 9 fields each
  let start=0;
  for(let i=0;i<lines.length;i++){ if(lines[i]==='No.'){ start=i; break; } }
  const body=lines.slice(start+TABLE_HEADERS.length);
  const deals=[];
  for(let i=0;i+8<body.length;i+=9){
    const [no,product,code,issuer,desc,underlying,trade,issue,maturity]=body.slice(i,i+9);
    const p=parseInstrumentDescription(desc);
    const underlyings=p.underlyings.length?p.underlyings:(underlying?underlying.split(/\s*,\s*/):[]);
    deals.push({
      letter:String(no), date:trade, category:product, product,
      underlyings, issuer, notes:[], instrumentCode:code,
      tenor:p.tenor, redemptionUpon:null,
      dates:{ trade, issue, maturity },
      levels:{ ko:p.ko, koObs:p.koObs, ki:p.ki, kiObs:p.kiObs, strike:p.strike,
        upperKO:null, lowerKO:null, participation:null, koRebate:null,
        minRedemption:null, minCoupon:null, coupon:p.coupon },
      variantFields:{ family:product, ko:p.ko, ki:p.ki, upperKO:null, lowerKO:null,
        strike:p.strike, participation:null, couponBarrier:null, bonus:null,
        minRedemption:null, settlement:null },
    });
  }
  return deals;
}

// Pull a "85%" (level) and an optional "(Monthly Observe)" observation out of a raw value.
function splitLevelObs(v){
  if(v == null) return { level: null, obs: null };
  const m = String(v).match(/^\s*([\d.]+%?)\s*(?:\(([^)]*)\))?/);
  return { level: m && m[1] ? m[1] : null, obs: m && m[2] ? m[2].trim() : null };
}
// First key present in `f` from a list of aliases (case-insensitive), else null.
function pick(f, ...names){
  const keys = Object.keys(f);
  for(const n of names){
    const hit = keys.find(k => k.toLowerCase() === n.toLowerCase());
    if(hit && f[hit] != null && String(f[hit]).trim() !== '') return String(f[hit]).trim();
  }
  return null;
}

// Normalise one parsed deal into (a) detectVariant() input and (b) tidy display fields.
// Everything is null unless the term sheet actually stated it.
export function normalizeDeal(deal){
  const f = deal.fields;
  const ko  = splitLevelObs(pick(f, 'KO', 'KO barrier', 'Knock-Out', 'Knock Out'));
  const ki  = splitLevelObs(pick(f, 'KI', 'Knock-In', 'Knock In'));
  const upperKO = pick(f, 'Upper KO');
  const lowerKO = pick(f, 'Lower KO');
  const strike  = pick(f, 'Strike', 'Strike Price');
  const tenor   = pick(f, 'Tenor');
  const pr      = pick(f, 'PR', 'Participation rate', 'Participation');
  const koRebate = pick(f, 'KO rebate', 'Knock-Out Rebate', 'Rebate');
  const minRedemption = pick(f, 'Min redemption level', 'Min Redemption', 'Minimum Redemption');
  const minCoupon = pick(f, 'Minimum Coupon', 'Min Coupon');
  const coupon  = pick(f, 'Coupon', 'Coupon Rate');
  const koObs   = ko.obs || pick(f, 'KO Observation');
  const kiObs   = ki.obs || pick(f, 'KI Observation');

  // detectVariant() input — parameter-first (numbers win over the printed name).
  const variantFields = {
    family: deal.product,
    ko: ko.level, ki: ki.level, upperKO, lowerKO, strike,
    participation: pr, couponBarrier: null, bonus: null,
    minRedemption, settlement: null,
  };

  return {
    letter: deal.letter, date: deal.date, category: deal.category,
    product: deal.product, underlyings: deal.underlyings,
    issuer: pick(f, 'Issuer'), notes: deal.notes,
    tenor, redemptionUpon: pick(f, 'Redemption upon'),
    levels: {
      ko: ko.level, koObs, ki: ki.level, kiObs, strike,
      upperKO, lowerKO, participation: pr, koRebate, minRedemption, minCoupon, coupon,
    },
    variantFields,
  };
}

// One entry point for the UI: try the emoji deal-list format first, then the
// column-dump summary table. Returns [] if the text matches neither (i.e. it's
// a normal single-product factsheet, not a multi-deal paste).
export function detectDeals(text){
  const emoji = splitDealList(text).map(normalizeDeal);
  if(emoji.length) return emoji;
  const table = parseSummaryTable(text);
  if(table.length) return table;
  return [];
}

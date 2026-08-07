// Pure product-type classifier, split out of factsheet_generator.js (which also carries the
// render engine + 26 embedded templates, ~110kB). Kept in its own module so the
// main app bundle (extract.ts, used on every page load) can classify a product's structure
// type WITHOUT pulling that render engine into the eager chunk — only the lazy-loaded
// Factsheet screen needs the full generator. factsheet_generator.js re-exports this same
// function so existing imports of detectVariant from there keep working unchanged.
export function detectVariant(f){
  f = f || {};
  const num = v => {
    if(v==null) return null;
    if(typeof v==='number') return isNaN(v)?null:v;
    const m = String(v).replace(/[, ]/g,'').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  };
  const truthy = v => {
    if(v==null||v===false) return false;
    const s = String(v).trim().toLowerCase();
    return !(s===''||s==='no'||s==='none'||s==='n/a'||s==='false'||s==='0');
  };
  const fam = String(f.family||'').toLowerCase();
  const upperKO = num(f.upperKO), lowerKO = num(f.lowerKO);
  const ko = num(f.ko!=null?f.ko:f.koBarrier);
  const ki = num(f.knockIn!=null?f.knockIn:f.ki);
  const strike = num(f.strike);
  const minRed = num(f.minRedemption);
  const partic = num(f.participation!=null?f.participation:f.pr);
  const couponBarrier = num(f.couponBarrier);
  const hasBonus = truthy(f.bonus);
  const settlement = String(f.settlement||'').toLowerCase();

  // 1) Upper KO + Lower KO (two barriers) => Twin Win — wins even if the name says "Sharkfin".
  if(upperKO!=null && lowerKO!=null) return 'twin_win';

  // 2) Knock-In present => KIKO (Knock-In + Knock-Out + Strike).
  if(ki!=null) return 'kiko';

  // 3) Coupon Barrier => BEN family (Bonus Enhance). Physical / Cash / Protected by sub-field.
  if(couponBarrier!=null && (hasBonus || fam.includes('ben') || fam.includes('bonus') || settlement || minRed!=null)){
    if(minRed!=null && minRed<100) return 'ben_prot';
    if(settlement.includes('cash')) return 'ben_cash';
    return 'ben';
  }

  // 4) A single KO barrier (no KI, no coupon barrier) => Sharkfin — bullish if KO above the
  //    strike/initial, bearish if below. Three Musketeers also has one KO, so let the name
  //    win only for that specific product.
  if(ko!=null){
    if(fam.includes('musketeer')||fam.includes('three')) return 'three_musketeers';
    const ref = strike!=null ? strike : 100;
    return ko > ref ? 'bullish_sharkfin' : 'bearish_sharkfin';
  }

  // 5) Participation rate with NO KO barrier => Booster (protected if a floor below 100%).
  if(partic!=null){
    return (minRed!=null && minRed<100) ? 'booster_prot' : 'booster';
  }

  // 6) Fallback: map the family name to a known product key.
  const map = [
    ['musketeer','three_musketeers'],['three','three_musketeers'],
    ['dispersion','lookback_dispersion'],['lookback','lookback_dispersion'],
    ['fixed rate','fixed_rate_note'],['frn','fixed_rate_note'],
    ['fixed coupon','fcn'],['fcn','fcn'],
    ['kiko','kiko'],['twin','twin_win'],
    ['bullish','bullish_sharkfin'],['bearish','bearish_sharkfin'],['sharkfin','bearish_sharkfin'],
    ['ben','ben'],['booster','booster'],
  ];
  for(const [k,v] of map) if(fam.includes(k)) return v;
  return f.family || null;
}

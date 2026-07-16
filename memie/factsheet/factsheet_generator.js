// InnovestX Simplified Factsheet Generator — Phase-1 Copilot (Output 6). build(product,version,lang)->HTML
/* eslint-disable */
import { LOGO } from "./logo.js";
export const CSS = `<meta charset="UTF-8">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
@page{size:A4;margin:0}
@media print{html,body{margin:0;padding:0;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{margin:0 auto;box-shadow:none}}
.page{width:794px;min-height:1120px;position:relative;background:#fff;margin:0 auto;padding:14px 38px 46px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;border:none;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #3D2B9E}
.logo-img{height:42px;width:auto;object-fit:contain;display:block}
.doc-title{text-align:right}
.doc-title h1{font-size:13px;font-weight:600;color:#1a1a1a;line-height:1.5}
.doc-title p{font-size:10px;color:#888;margin-top:2px}
.product-tag{display:inline-block;background:#EDE8FC;color:#3D2B9E;font-size:10px;font-weight:600;padding:3px 10px;border-radius:3px;margin-bottom:6px;letter-spacing:0.3px}
.illus{font-size:8.5px;color:#9a7d28;background:#FFFBEE;border:0.5px solid #E6D596;border-radius:4px;padding:3px 9px;margin-bottom:9px}
.illus b{color:#7a6210}
.meta-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:7px}
.meta{background:#F9F8FF;border:0.5px solid #D0C8F0;border-radius:5px;padding:5px 9px}
.meta-label{font-size:9px;color:#888;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px}
.meta-value{font-size:12.5px;font-weight:600;color:#1a1a1a}
.meta-value.purple{color:#3D2B9E}
.meta-value.green{color:#1E6B40}
.meta-value.red{color:#7A2018}
.meta-value.sm{font-size:12.5px}
.section-head{font-size:9px;font-weight:700;color:#3D2B9E;text-transform:uppercase;letter-spacing:0.6px;margin-bottom:4px;padding-bottom:2px;border-bottom:1px solid #D0C8F0;margin-top:5px}
.tl-grid{display:grid;grid-template-columns:repeat(var(--n),1fr);gap:5px;margin-bottom:7px}
.tl{background:#F4F3FC;border:0.5px solid #D0C8F0;border-radius:5px;padding:4px 8px;position:relative}
.tl-step{font-size:9px;font-weight:700;color:#3D2B9E;letter-spacing:0.3px}
.tl-desc{font-size:8.5px;color:#555;margin-top:1px;line-height:1.25}
.cond-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:0}
.cond{border-radius:5px;padding:5px 9px;border:0.5px solid}
.cond.green{background:#F0F7F3;border-color:#9FCDB5;color:#174D2C}
.cond.red{background:#FBF1F0;border-color:#DCA8A2;color:#5E1E18}
.cond.gray{background:#F4F4F3;border-color:#C5C3BD;color:#383836}
.cond.purple{background:#F2EFFC;border-color:#B7A8E6;color:#3a2a78}
.cond-name{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:3px}
.cond-level{font-size:14px;font-weight:700;margin-bottom:1px}
.cond-obs{font-size:8.5px;opacity:0.7;margin-bottom:3px}
.cond-desc{font-size:9px;line-height:1.4}
.basket-table{width:100%;border-collapse:collapse;margin-bottom:0;font-size:10px}
.basket-table thead tr{background:#3D2B9E}
.basket-table th{color:#fff;padding:5px 8px;text-align:left;font-weight:500;font-size:9px}
.basket-table th:not(:first-child){text-align:center}
.basket-table td{padding:4px 8px;border-bottom:0.5px solid #EBEBEB;color:#1a1a1a}
.basket-table td:not(:first-child){text-align:center}
.basket-table tbody tr td{background:#F6F4FF}
.stock-name{font-weight:600;font-size:10px;color:#1a1a1a}
.ticker{font-size:8.5px;color:#666;display:block}
.ko-cell{background:#D7F0E3 !important;color:#0F5E3C;font-weight:700}
.ki-cell{background:#FAD9D3 !important;color:#7A2018;font-weight:700}
.scenario-grid{display:grid;grid-template-columns:repeat(var(--sc),1fr);gap:6px;margin-bottom:0}
.scenario{border-radius:5px;padding:5px 9px;border:0.5px solid #DDD}
.sc-num{font-size:9px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:3px}
.sc-title{font-size:10px;font-weight:600;color:#1a1a1a;margin-bottom:3px}
.sc-desc{font-size:8.5px;color:#555;line-height:1.4}
.sc-outcome{font-size:8.5px;font-weight:600;margin-top:3px}
.sc-outcome.good{color:#1E6B40}
.sc-outcome.bad{color:#7A2018}
.sched-table{width:100%;border-collapse:collapse;margin-bottom:0;font-size:10px}
.sched-table thead tr{background:#EDEBFB}
.sched-table th{color:#3D2B9E;padding:4px 8px;text-align:center;font-weight:600;font-size:9px}
.sched-table td{padding:2.5px 8px;text-align:center;border-bottom:0.5px solid #F0F0F0;color:#333;font-size:9.5px}
.sched-table tr:last-child td{border-bottom:none}
.sched-table .per{font-weight:600;color:#3D2B9E}
.sched-table .amt{color:#1E6B40;font-weight:600}
.sched-table .loss{color:#7A2018;font-weight:600}
.risk-box{background:#FFFCF2;border:0.5px solid #DFC070;border-radius:5px;padding:5px 9px;margin-bottom:0}
.risk-title{font-size:9px;font-weight:700;color:#6B4A08;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px}
.risk-list li{font-size:8px;color:#444;padding:0.5px 0 0.5px 11px;position:relative;line-height:1.25;list-style:none}
.risk-list li::before{content:"\\2022";position:absolute;left:0;color:#B08020}
.footer{display:flex;justify-content:space-between;align-items:flex-end;padding-top:4px;border-top:0.5px solid #ddd;margin-top:0;position:absolute;left:38px;right:38px;bottom:10px}
.footer-text{font-size:7px;color:#aaa;max-width:62%;line-height:1.2}
.footer-right{text-align:right;font-size:8px;color:#888}
</style><style>
.basket-table .sep td{background:#EDEBFB;color:#3D2B9E;font-weight:700;font-size:9px;padding:3px 8px;text-align:left}
.pf-svg{width:100%;height:auto;display:block;margin-top:2px}
.pf-legend{display:flex;gap:14px;flex-wrap:wrap;margin-top:3px;font-size:8.5px;color:#555}
.pf-legend span{display:inline-flex;align-items:center;gap:4px}
.lg-line{width:16px;height:0;border-top:2px solid #3D2B9E}.lg-dash{width:16px;height:0;border-top:1.5px dashed #888}
.lg-floor{width:16px;height:0;border-top:1.5px dashed #B4554B}.lg-bonus{width:12px;height:9px;background:#E7DFFA;border:0.5px solid #B7A8E6;border-radius:2px}
.lg-a{width:16px;height:0;border-top:2.4px solid #2E6FE0}.lg-b{width:16px;height:0;border-top:2.4px solid #2BB6C4}.lg-c{width:16px;height:0;border-top:2.4px solid #6a3fb0}.lg-ko{width:16px;height:0;border-top:1.5px dashed #3f9b6b}
.cap{font-size:8px;color:#999;margin-top:3px;line-height:1.35}
.formula{background:#F4F3FC;border:0.5px solid #D0C8F0;border-radius:6px;padding:7px 11px;margin-top:2px;font-size:10px;color:#333;line-height:1.7}
.formula b{color:#3D2B9E}.formula .res{color:#1E6B40;font-weight:700}
.sched-table td.nc{background:#EFF7F2}.sched-table td.mk{font-size:8px;color:#3D2B9E;font-weight:600;text-align:left}
.sched-table th.tl,.sched-table td.tll{text-align:left}
.sched-table .div td{background:#EDEBFB;color:#3D2B9E;font-weight:700;font-size:8.5px;text-align:left;padding:3px 8px}
/* ---- Key-Highlight scale-up ---- */
.kh .product-tag{font-size:12px;padding:5px 14px;margin-bottom:14px}
.kh .meta{padding:11px 14px}.kh .meta-label{font-size:10px}.kh .meta-value{font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.kh .meta-value.sm{font-size:16px}
.kh .section-head{font-size:11px;margin-top:15px;margin-bottom:8px}
.kh .cond{padding:12px 15px}.kh .cond-name{font-size:12px}.kh .cond-level{font-size:21px}.kh .cond-obs{font-size:10px}.kh .cond-desc{font-size:11px;line-height:1.5}
.kh .basket-table{font-size:12px}.kh .basket-table th{font-size:10.5px;padding:9px}.kh .basket-table td{padding:10px 9px;font-size:12px}.kh .stock-name{font-size:12.5px}.kh .ticker{font-size:10px}
.kh .risk-box{padding:11px 15px;margin-top:14px}.kh .risk-title{font-size:11px}.kh .risk-list li{font-size:10px;line-height:1.5}
.kh .pf-svg{margin-top:6px}.kh .cap{font-size:9px}
</style>`;

export const LABELS = {"illus": {"en": "<b>Illustrative example only.</b> Indicative example from the InnovestX Offshore SN Sale Kit (placeholders). Not a live term sheet or offer — replace with actual terms before client use.", "th": "<b>ตัวอย่างประกอบเท่านั้น</b> เป็นตัวอย่างจาก Offshore SN Sale Kit ของ InnovestX (ข้อมูลสมมติ) ไม่ใช่ term sheet จริงหรือคำเสนอขาย — โปรดแทนที่ด้วยข้อมูลจริงก่อนใช้กับลูกค้า"}, "sub": {"en": "For Institutional & High Net Worth Investors Only", "th": "สำหรับผู้ลงทุนสถาบันและรายใหญ่เท่านั้น"}, "kh_tag": {"en": "Key Highlight", "th": "ฉบับย่อ (Key Highlight)"}, "full_tag": {"en": "Indicative Mechanics", "th": "ข้อมูลเบื้องต้น"}, "cond_head": {"en": "Key Conditions", "th": "เงื่อนไขสำคัญ"}, "bk_head": {"en": "Basket Securities", "th": "หลักทรัพย์อ้างอิงในตะกร้า"}, "ul_head": {"en": "Underlying Stock", "th": "หลักทรัพย์อ้างอิง"}, "payoff_head": {"en": "Payoff Profile at Maturity", "th": "โครงสร้างผลตอบแทน ณ วันครบกำหนด"}, "out_head": {"en": "Possible Outcomes at Maturity", "th": "ผลลัพธ์ที่เป็นไปได้ ณ วันครบกำหนด"}, "risk_head": {"en": "Key Risks — Please Read Before Investing", "th": "ความเสี่ยงสำคัญ — โปรดอ่านก่อนตัดสินใจลงทุน"}, "foot": {"en": "For informational purposes only. Not investment advice. Restricted to Institutional and High Net Worth Investors only. Please read the full prospectus before investing.", "th": "เพื่อเป็นข้อมูลเท่านั้น มิใช่คำแนะนำการลงทุน สำหรับผู้ลงทุนสถาบันและรายใหญ่เท่านั้น โปรดศึกษาหนังสือชี้ชวนก่อนตัดสินใจลงทุน"}, "foot_kh": {"en": "Key Highlight — see full factsheet for outcomes, schedule & full risks", "th": "ฉบับย่อ — ดูฉบับเต็มสำหรับผลลัพธ์/ตาราง/ความเสี่ยงเต็ม"}, "foot_full": {"en": "Illustrative — based on Offshore SN Sale Kit", "th": "ตัวอย่าง — อ้างอิงจาก Offshore SN Sale Kit"}, "r_nosec": {"en": "No secondary market (early exit may lose); subject to InnovestX issuer credit risk.", "th": "ไม่มีตลาดรอง (ขายคืนก่อนกำหนดอาจขาดทุน) และมีความเสี่ยงด้านเครดิตของผู้ออกตราสาร"}, "r_issuer": {"en": "Issuer credit risk. Offshore issuers are typically Investment Grade (e.g. Societe Generale, BNP Paribas, Goldman Sachs) but repayment is not guaranteed.", "th": "ความเสี่ยงเครดิตผู้ออกตราสาร โดยทั่วไปเป็นระดับ Investment Grade (เช่น Societe Generale, BNP Paribas, Goldman Sachs) แต่ไม่การันตีการชำระคืน"}, "r_fx": {"en": "USD foreign-exchange risk may affect the actual return realised.", "th": "ความเสี่ยงอัตราแลกเปลี่ยน USD อาจกระทบผลตอบแทนที่แท้จริง"}, "r_illus": {"en": "Illustrative figures from the product Sale Kit example. Actual terms follow the live term sheet.", "th": "ตัวเลขเป็นตัวอย่างจาก Sale Kit ข้อมูลจริงเป็นไปตาม term sheet"}};
export const REGISTRY = {"kiko": {"arch": "basket", "illus": false, "order": 1, "title": {"en": "KIKO Equity Linked Note", "th": "หุ้นกู้อนุพันธ์แฝง KIKO"}, "title_full": {"en": "KIKO Fixed Coupon Equity Linked Note", "th": "หุ้นกู้อนุพันธ์แฝง KIKO (Fixed Coupon)"}, "subdate": {"en": "As of 24 Jun 2026", "th": "ณ วันที่ 24 มิ.ย. 2026"}, "tag": {"en": "KIKO — Knock-In / Knock-Out Structure&nbsp; | &nbsp;Not Principal Protected&nbsp; | &nbsp;Physical Settlement", "th": "KIKO — โครงสร้าง Knock-In / Knock-Out&nbsp; | &nbsp;ไม่คุ้มครองเงินต้น&nbsp; | &nbsp;ส่งมอบเป็นหลักทรัพย์"}, "metrics": [{"l": {"en": "Coupon Rate", "th": "อัตราดอกเบี้ย"}, "v": "16.00% p.a.", "c": "purple"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "6 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "THB 1,000,000", "c": "sm"}, {"l": {"en": "Net Interest / Month", "th": "ดอกเบี้ยสุทธิ/เดือน"}, "v": "THB 11,333", "c": "green"}], "dates": [["Trade Date", "วันซื้อขาย", "24 Jun 2026"], ["Issue Date", "วันออกตราสาร", "26 Jun 2026"], ["Valuation Date", "วันประเมินมูลค่า", "28 Dec 2026"], ["Maturity Date", "วันครบกำหนด", "30 Dec 2026"]], "conds": [{"color": "green", "n": {"en": "Knock-Out", "th": "Knock-Out"}, "lv": {"en": "100% of Spot", "th": "100% ของ Spot"}, "o": {"en": "Observed monthly", "th": "สังเกตรายเดือน"}, "d": {"en": "All stocks ≥ starting price on any monthly date → early redemption, full principal + coupon.", "th": "หุ้นทุกตัว ≥ ราคาเริ่มต้น ณ วันสังเกตรายเดือนใดๆ → ไถ่ถอนก่อนกำหนด คืนเงินต้นเต็ม + ดอกเบี้ย"}}, {"color": "red", "n": {"en": "Knock-In", "th": "Knock-In"}, "lv": {"en": "70–75.5% of Spot", "th": "70–75.5% ของ Spot"}, "o": {"en": "Observed daily", "th": "สังเกตรายวัน"}, "d": {"en": "Any stock below its KI price AND below Strike at maturity → receive shares instead of cash.", "th": "หุ้นตัวใดต่ำกว่าราคา KI และยังต่ำกว่า Strike ณ วันครบกำหนด → รับเป็นหลักทรัพย์แทนเงินสด"}}, {"color": "gray", "n": {"en": "Strike Price", "th": "Strike Price"}, "lv": {"en": "100% of Spot", "th": "100% ของ Spot"}, "o": {"en": "Assessed at maturity", "th": "ประเมิน ณ วันครบกำหนด"}, "d": {"en": "Reference price for final settlement if Knock-In is triggered.", "th": "ราคาอ้างอิงสำหรับการชำระราคาเมื่อครบกำหนด กรณีเกิด Knock-In"}}], "basket": {"cols_en": ["Stock", "Spot (THB)", "Strike (THB)", "Knock-Out (THB)", "Knock-In Level", "Knock-In (THB)", "Shares for Delivery", "Selling Code"], "cols_th": ["หลักทรัพย์", "Spot (บาท)", "Strike (บาท)", "Knock-Out (บาท)", "ระดับ Knock-In", "Knock-In (บาท)", "จำนวนหุ้นส่งมอบ", "Selling Code"], "groups": [["Basket A", [["BDMS", "Bangkok Dusit Medical Services PCL", "18.40", "18.40", "18.40", "75.50%", "13.89", "54,300", "0624304"], ["MTC", "Muangthai Capital PCL", "29.75", "29.75", "29.75", "75.50%", "22.46", "33,600", ""]]], ["Basket B", [["CBG", "Carabao Group PCL", "43.50", "43.50", "43.50", "70.00%", "30.45", "22,900", "0624305"], ["MTC", "Muangthai Capital PCL", "29.75", "29.75", "29.75", "70.00%", "20.83", "33,600", ""]]]], "ki_cols": [4, 5], "ko_cols": [3], "sc_col": 7, "kh_drop_cols": [6, 7]}, "outcomes": [{"num": {"en": "Scenario 1 — Best case", "th": "กรณีที่ 1 — ดีที่สุด"}, "t": {"en": "Knock-Out triggered", "th": "เกิด Knock-Out"}, "d": {"en": "All stocks close at or above Spot Price on any monthly observation date", "th": "หุ้นทุกตัวปิด ≥ ราคา Spot ณ วันสังเกตรายเดือนใดๆ"}, "cls": "good", "o": {"en": "→ Full principal + coupon returned early", "th": "→ คืนเงินต้นเต็ม + ดอกเบี้ย ไถ่ถอนก่อนกำหนด"}}, {"num": {"en": "Scenario 2 — Base case", "th": "กรณีที่ 2 — ฐาน"}, "t": {"en": "No Knock-In, No Knock-Out", "th": "ไม่เกิด Knock-In และ Knock-Out"}, "d": {"en": "Stocks stay between Knock-In and Knock-Out levels throughout all 6 months", "th": "หุ้นอยู่ระหว่าง Knock-In และ Knock-Out ตลอด 6 เดือน"}, "cls": "good", "o": {"en": "→ Full principal + all 6 coupons at maturity", "th": "→ คืนเงินต้นเต็ม + ดอกเบี้ยครบ 6 งวด ณ ครบกำหนด"}}, {"num": {"en": "Scenario 3 — Worst case", "th": "กรณีที่ 3 — แย่ที่สุด"}, "t": {"en": "Knock-In triggered", "th": "เกิด Knock-In"}, "d": {"en": "Any stock drops below KI level at any point AND remains below Strike at maturity", "th": "หุ้นตัวใดต่ำกว่า KI และยังต่ำกว่า Strike ณ ครบกำหนด"}, "cls": "bad", "o": {"en": "→ Receive worst-performing shares at Strike. Principal at risk.", "th": "→ รับหุ้นแย่สุดที่ราคา Strike เงินต้นมีความเสี่ยง"}}], "risks_extra": [{"en": "Not principal protected — a Knock-In may return shares worth less than your investment.", "th": "ไม่คุ้มครองเงินต้น — หากเกิด Knock-In อาจได้รับหลักทรัพย์ที่มูลค่าต่ำกว่าเงินลงทุน"}], "full_tag_override": {"en": "Indicative Terms", "th": "ข้อกำหนดเบื้องต้น"}, "schedule": {"cols": {"en": ["Period", "Knock-Out Observation Date", "Coupon Payment Date", "Net Interest After Tax (THB)"], "th": ["งวด", "วันสังเกต Knock-Out", "วันจ่ายดอกเบี้ย", "ดอกเบี้ยสุทธิหลังภาษี (บาท)"]}, "head": {"en": "Coupon Payment Schedule", "th": "ตารางการจ่ายดอกเบี้ย"}, "rows": [["1", "30 Jul 2026", "03 Aug 2026", "11,333.33"], ["2", "28 Aug 2026", "01 Sep 2026", "11,333.33"], ["3", "28 Sep 2026", "30 Sep 2026", "11,333.33"], ["4", "28 Oct 2026", "30 Oct 2026", "11,333.33"], ["5", "30 Nov 2026", "02 Dec 2026", "11,333.33"], ["6", "28 Dec 2026", "30 Dec 2026", "11,333.33"]], "amt_col": 3}}, "fcn": {"arch": "basket", "illus": true, "order": 2, "title": {"en": "FCN (Fixed Coupon Note)", "th": "FCN (Fixed Coupon Note)"}, "tag": {"en": "FCN — Fixed Coupon Note&nbsp; | &nbsp;Not Principal Protected&nbsp; | &nbsp;Physical Settlement", "th": "FCN — หุ้นกู้ดอกเบี้ยคงที่&nbsp; | &nbsp;ไม่คุ้มครองเงินต้น&nbsp; | &nbsp;ส่งมอบเป็นหลักทรัพย์"}, "metrics": [{"l": {"en": "Fixed Coupon", "th": "ดอกเบี้ยคงที่"}, "v": "6.00% p.a.", "c": "purple"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "6 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Coupon Frequency", "th": "ความถี่ดอกเบี้ย"}, "v": "Quarterly", "c": "green"}], "conds": [{"color": "green", "n": {"en": "Fixed Coupon", "th": "ดอกเบี้ยคงที่"}, "lv": {"en": "6.00% p.a.", "th": "6.00% ต่อปี"}, "o": {"en": "Paid quarterly", "th": "จ่ายรายไตรมาส"}, "d": {"en": "Paid every period regardless of price movement.", "th": "จ่ายทุกงวดไม่ว่าราคาจะเป็นอย่างไร"}}, {"color": "gray", "n": {"en": "Strike Price", "th": "Strike Price"}, "lv": {"en": "95% of Initial", "th": "95% ของราคาเริ่มต้น"}, "o": {"en": "Assessed at Valuation", "th": "ประเมิน ณ วันประเมิน"}, "d": {"en": "Decides cash vs. share repayment.", "th": "ตัวกำหนดว่าคืนเป็นเงินสดหรือหุ้น"}}, {"color": "red", "n": {"en": "Settlement", "th": "การส่งมอบ"}, "lv": {"en": "Physical", "th": "ส่งมอบหลักทรัพย์"}, "o": {"en": "If Strike breached", "th": "กรณีต่ำกว่า Strike"}, "d": {"en": "Below Strike → receive shares at Strike (excess cash).", "th": "ต่ำกว่า Strike → รับหุ้นที่ราคา Strike (ส่วนเกินเป็นเงินสด)"}}], "basket": {"cols_en": ["Underlying", "Initial", "Strike", "Fixed Coupon", "Settlement"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Strike", "ดอกเบี้ย", "การส่งมอบ"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "95%", "6.00% p.a.", "Physical"]]]], "ki_cols": [2], "ko_cols": []}, "kh2_basket": {"cols_en": ["Underlying", "Initial", "Strike", "Knock-In", "Knock-Out", "Settlement"], "cols_th": ["หลักทรัพย์อ้างอิง", "ราคาเริ่มต้น", "Strike", "Knock-In", "Knock-Out", "การส่งมอบ"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "95%", "70%", "130%", "Physical"]]]]}, "kh2_conds_extra": [{"n": {"en": "Observation Frequency", "th": "ความถี่การสังเกตราคา"}, "lv": {"en": "Monthly", "th": "รายเดือน"}}, {"n": {"en": "Autocall Frequency", "th": "ความถี่การไถ่ถอนก่อนกำหนด"}, "lv": {"en": "Quarterly", "th": "รายไตรมาส"}}], "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "Underlying ≥ Strike", "th": "หุ้น ≥ Strike"}, "d": {"en": "At/above 95% at Valuation.", "th": "≥ 95% ณ วันประเมิน"}, "cls": "good", "o": {"en": "→ Full principal + all coupons in cash", "th": "→ คืนเงินต้นเต็ม + ดอกเบี้ยทั้งหมดเป็นเงินสด"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "Underlying < Strike", "th": "หุ้น < Strike"}, "d": {"en": "Below 95% at Valuation.", "th": "< 95% ณ วันประเมิน"}, "cls": "bad", "o": {"en": "→ Receive shares at Strike + coupons (principal at risk)", "th": "→ รับหุ้นที่ราคา Strike + ดอกเบี้ย (เงินต้นมีความเสี่ยง)"}}], "risks_extra": [{"en": "Not principal protected — below Strike you receive shares worth less than your investment.", "th": "ไม่คุ้มครองเงินต้น — ต่ำกว่า Strike จะได้รับหุ้นที่มูลค่าต่ำกว่าเงินลงทุน"}], "schedule": {"cols": {"en": ["Period", "Coupon Date", "Coupon Rate", "Cumulative"], "th": ["งวด", "วันจ่าย", "อัตราดอกเบี้ย", "สะสม"]}, "head": {"en": "Coupon Payment Schedule", "th": "ตารางการจ่ายดอกเบี้ย"}, "rows_lang": {"en": [["1", "End of Month 3", "1.50%", "1.50%"], ["2", "End of Month 6 (Maturity)", "1.50%", "3.00%"]], "th": [["1", "สิ้นเดือนที่ 3", "1.50%", "1.50%"], ["2", "สิ้นเดือนที่ 6 (ครบกำหนด)", "1.50%", "3.00%"]]}, "amt_col": 2}}, "ben": {"arch": "basket", "illus": true, "order": 3, "title": {"en": "BEN (Bonus Enhance Note)", "th": "BEN (Bonus Enhance Note)"}, "tag": {"en": "BEN — Bonus Enhance Note&nbsp; | &nbsp;Not Principal Protected&nbsp; | &nbsp;Physical Settlement", "th": "BEN — Bonus Enhance Note&nbsp; | &nbsp;ไม่คุ้มครองเงินต้น&nbsp; | &nbsp;ส่งมอบเป็นหลักทรัพย์"}, "metrics": [{"l": {"en": "Bonus Coupon", "th": "โบนัส"}, "v": "20.00% flat", "c": "purple"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "3 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Strike / Barrier", "th": "Strike / Barrier"}, "v": "100% / 100%", "c": "sm"}], "conds": [{"color": "green", "n": {"en": "Coupon Barrier", "th": "Coupon Barrier"}, "lv": {"en": "100% of Initial", "th": "100% ของราคาเริ่มต้น"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "All ≥ Barrier → greater of worst gain or Bonus.", "th": "ทุกตัว ≥ Barrier → มากกว่าระหว่างกำไรแย่สุดหรือโบนัส"}}, {"color": "purple", "n": {"en": "Bonus Coupon", "th": "โบนัส"}, "lv": {"en": "20% flat", "th": "20% คงที่"}, "o": {"en": "If barrier met", "th": "ถ้าถึง Barrier"}, "d": {"en": "At least 20%, or worst gain if higher.", "th": "อย่างน้อย 20% หรือกำไรแย่สุดถ้าสูงกว่า"}}, {"color": "red", "n": {"en": "Strike Price", "th": "Strike Price"}, "lv": {"en": "100% of Initial", "th": "100% ของราคาเริ่มต้น"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "Any stock < Strike → receive worst shares.", "th": "หุ้นตัวใด < Strike → รับหุ้นแย่สุด"}}], "basket": {"cols_en": ["Stock", "Initial", "Strike", "Coupon Barrier", "Bonus"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Strike", "Coupon Barrier", "โบนัส"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "100%", "100%", "20% flat"], ["BBB", "Illustrative underlying", "100%", "100%", "100%", "20% flat"]]]], "ki_cols": [2], "ko_cols": [3]}, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "Worst gain > 20%", "th": "กำไรแย่สุด > 20%"}, "d": {"en": "Rally above bonus.", "th": "ปรับขึ้นเกินโบนัส"}, "cls": "good", "o": {"en": "→ Principal + full upside", "th": "→ เงินต้น + กำไรเต็ม"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "All ≥ Barrier, ≤ 20%", "th": "ทุกตัว ≥ Barrier, ≤ 20%"}, "d": {"en": "Flat to moderate.", "th": "ทรงตัวถึงปานกลาง"}, "cls": "good", "o": {"en": "→ Principal + 20% Bonus", "th": "→ เงินต้น + โบนัส 20%"}}, {"num": {"en": "Scenario 3", "th": "กรณีที่ 3"}, "t": {"en": "Any stock < Strike", "th": "หุ้นตัวใด < Strike"}, "d": {"en": "Downside breach.", "th": "หลุดฝั่งลง"}, "cls": "bad", "o": {"en": "→ Receive worst shares (principal at risk)", "th": "→ รับหุ้นแย่สุด (เงินต้นมีความเสี่ยง)"}}], "risks_extra": [{"en": "Not principal protected — a downside breach returns shares worth less than your investment.", "th": "ไม่คุ้มครองเงินต้น — หากหลุดฝั่งลงจะได้รับหุ้นที่มูลค่าต่ำกว่าเงินลงทุน"}], "schedule": {"cols": {"en": ["Worst-performer return at maturity", "Condition", "Investor outcome"], "th": ["ผลตอบแทนหุ้นแย่สุด ณ ครบกำหนด", "เงื่อนไข", "ผลลัพธ์ผู้ลงทุน"]}, "head": {"en": "Return Summary — Worst Performer to Investor", "th": "สรุปผลตอบแทน — หุ้นแย่สุดสู่ผู้ลงทุน"}, "rows_lang": {"en": [["Below Strike (< 100%)", "Strike breached", "Receive shares at Strike — principal at risk"], ["0% to +20%", "≥ Barrier, ≤ Bonus", "+20% Bonus Coupon"], ["+25%", "> Bonus", "+25%"], ["+40%", "> Bonus", "+40%"]], "th": [["ต่ำกว่า Strike (< 100%)", "หลุด Strike", "รับหุ้นที่ Strike — เงินต้นมีความเสี่ยง"], ["0% ถึง +20%", "≥ Barrier, ≤ Bonus", "+20% โบนัส"], ["+25%", "> Bonus", "+25%"], ["+40%", "> Bonus", "+40%"]]}, "loss_row": 0}}, "ben_cash": {"arch": "basket", "illus": true, "order": 4, "title": {"en": "BEN (Cash Settlement)", "th": "BEN (Cash Settlement)"}, "tag": {"en": "BEN — Bonus Enhance Note&nbsp; | &nbsp;Not Principal Protected&nbsp; | &nbsp;Cash Settlement", "th": "BEN — Bonus Enhance Note&nbsp; | &nbsp;ไม่คุ้มครองเงินต้น&nbsp; | &nbsp;ชำระเป็นเงินสด"}, "metrics": [{"l": {"en": "Bonus Coupon", "th": "โบนัส"}, "v": "20.00% flat", "c": "purple"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "12 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Strike / Barrier", "th": "Strike / Barrier"}, "v": "100% / 100%", "c": "sm"}], "conds": [{"color": "green", "n": {"en": "Coupon Barrier", "th": "Coupon Barrier"}, "lv": {"en": "100% of Initial", "th": "100% ของราคาเริ่มต้น"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "Underlying ≥ Barrier → greater of gain or Bonus.", "th": "หุ้น ≥ Barrier → มากกว่าระหว่างกำไรหรือโบนัส"}}, {"color": "purple", "n": {"en": "Bonus Coupon", "th": "โบนัส"}, "lv": {"en": "20% flat", "th": "20% คงที่"}, "o": {"en": "If barrier met", "th": "ถ้าถึง Barrier"}, "d": {"en": "At least 20%, or actual gain if higher.", "th": "อย่างน้อย 20% หรือกำไรจริงถ้าสูงกว่า"}}, {"color": "red", "n": {"en": "Strike Price", "th": "Strike Price"}, "lv": {"en": "100% of Initial", "th": "100% ของราคาเริ่มต้น"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "Below Strike → cash-settled loss (no shares).", "th": "ต่ำกว่า Strike → ขาดทุนชำระเป็นเงินสด (ไม่รับหุ้น)"}}], "basket": {"cols_en": ["Underlying", "Initial", "Strike", "Coupon Barrier", "Bonus"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Strike", "Coupon Barrier", "โบนัส"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "100%", "100%", "20% flat"]]]], "ki_cols": [2], "ko_cols": [3]}, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "Gain > 20%", "th": "กำไร > 20%"}, "d": {"en": "Rally above bonus.", "th": "ปรับขึ้นเกินโบนัส"}, "cls": "good", "o": {"en": "→ Principal + full upside in cash", "th": "→ เงินต้น + กำไรเต็มเป็นเงินสด"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "≥ Barrier, ≤ 20%", "th": "≥ Barrier, ≤ 20%"}, "d": {"en": "Flat to moderate.", "th": "ทรงตัวถึงปานกลาง"}, "cls": "good", "o": {"en": "→ Principal + 20% Bonus in cash", "th": "→ เงินต้น + โบนัส 20% เป็นเงินสด"}}, {"num": {"en": "Scenario 3", "th": "กรณีที่ 3"}, "t": {"en": "Underlying < Strike", "th": "หุ้น < Strike"}, "d": {"en": "Downside breach.", "th": "หลุดฝั่งลง"}, "cls": "bad", "o": {"en": "→ Cash-settled at realised loss (principal at risk)", "th": "→ ขาดทุนชำระเป็นเงินสด (เงินต้นมีความเสี่ยง)"}}], "risks_extra": [{"en": "Not principal protected — below Strike you realise the loss in cash. Higher minimum issuance (USD 1,000,000).", "th": "ไม่คุ้มครองเงินต้น — ต่ำกว่า Strike ขาดทุนเป็นเงินสด ขั้นต่ำการออกตราสารสูง (USD 1,000,000)"}], "schedule": {"cols": {"en": ["Underlying return at maturity", "Condition", "Investor outcome (cash)"], "th": ["ผลตอบแทนหุ้น ณ ครบกำหนด", "เงื่อนไข", "ผลลัพธ์ผู้ลงทุน (เงินสด)"]}, "head": {"en": "Return Summary — Underlying to Investor", "th": "สรุปผลตอบแทน — หุ้นสู่ผู้ลงทุน"}, "rows_lang": {"en": [["Below Strike (< 100%), e.g. −10%", "Strike breached", "Realised loss in cash (≈ −10%) — principal at risk"], ["0% to +20%", "≥ Barrier, ≤ Bonus", "+20% Bonus Coupon"], ["+25%", "> Bonus", "+25%"], ["+40%", "> Bonus", "+40%"]], "th": [["ต่ำกว่า Strike (< 100%) เช่น −10%", "หลุด Strike", "ขาดทุนเป็นเงินสด (≈ −10%) — เงินต้นมีความเสี่ยง"], ["0% ถึง +20%", "≥ Barrier, ≤ Bonus", "+20% โบนัส"], ["+25%", "> Bonus", "+25%"], ["+40%", "> Bonus", "+40%"]]}, "loss_row": 0}}, "booster_prot": {"arch": "payoff", "illus": true, "order": 5, "title": {"en": "Booster With Protection", "th": "Booster With Protection"}, "tag": {"en": "Booster With Protection&nbsp; | &nbsp;Geared Participation&nbsp; | &nbsp;Partial Principal Protection&nbsp; | &nbsp;Cash Settlement", "th": "Booster With Protection&nbsp; | &nbsp;ทดผลตอบแทน&nbsp; | &nbsp;คุ้มครองเงินต้นบางส่วน&nbsp; | &nbsp;ชำระเป็นเงินสด"}, "metrics": [{"l": {"en": "Participation Rate", "th": "อัตราการมีส่วนร่วม"}, "v": "200%", "c": "purple"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "3 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Min. Redemption", "th": "ไถ่ถอนขั้นต่ำ"}, "v": "90% of Principal", "c": "green"}], "conds": [{"color": "green", "n": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "lv": {"en": "90% Floor", "th": "ขั้นต่ำ 90%"}, "o": {"en": "Minimum Redemption", "th": "Minimum Redemption"}, "d": {"en": "At least 90% back; max loss 10%, cash-settled.", "th": "คืนอย่างน้อย 90% ขาดทุนสูงสุด 10% ชำระเป็นเงินสด"}}, {"color": "gray", "n": {"en": "Strike Price", "th": "Strike Price"}, "lv": {"en": "100% of Initial", "th": "100% ของราคาเริ่มต้น"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "Splits geared upside from floored downside.", "th": "แบ่งฝั่งกำไรทดกับฝั่งขาดทุนที่มีพื้น"}}, {"color": "purple", "n": {"en": "Participation Rate", "th": "อัตราการมีส่วนร่วม"}, "lv": {"en": "200%", "th": "200%"}, "o": {"en": "Above Strike", "th": "เหนือ Strike"}, "d": {"en": "Worst performer gain × 2×.", "th": "กำไรหุ้นแย่สุด × 2 เท่า"}}], "svg": "<svg class=\"pf-svg\" viewBox=\"0 0 700 214\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"-apple-system,Segoe UI,sans-serif\"><rect x=\"48.0\" y=\"14.0\" width=\"636.0\" height=\"87.0\" fill=\"#F1F8F4\"/><rect x=\"48.0\" y=\"101.0\" width=\"636.0\" height=\"87.0\" fill=\"#FCF3F2\"/><line x1=\"48.0\" y1=\"159.0\" x2=\"684.0\" y2=\"159.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"162.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">-40%</text><line x1=\"48.0\" y1=\"130.0\" x2=\"684.0\" y2=\"130.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"133.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">-20%</text><line x1=\"48.0\" y1=\"72.0\" x2=\"684.0\" y2=\"72.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"75.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+20%</text><line x1=\"48.0\" y1=\"43.0\" x2=\"684.0\" y2=\"43.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"46.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+40%</text><text x=\"175.2\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">80%</text><text x=\"302.4\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">100%</text><text x=\"429.6\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">120%</text><text x=\"556.8\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">140%</text><line x1=\"48.0\" y1=\"101.0\" x2=\"684.0\" y2=\"101.0\" stroke=\"#cfcfcf\" stroke-width=\"1.2\"/><text x=\"43.0\" y=\"104.0\" font-size=\"9\" fill=\"#999\" text-anchor=\"end\">0%</text><line x1=\"302.4\" y1=\"14.0\" x2=\"302.4\" y2=\"188.0\" stroke=\"#9a9a9a\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"302.4\" y=\"24.0\" font-size=\"8.5\" fill=\"#9a9a9a\" text-anchor=\"middle\">Strike 100%</text><polyline points=\"48.0,115.5 238.8,115.5 302.4,101.0 493.2,14.0\" fill=\"none\" stroke=\"#3D2B9E\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><text x=\"366.0\" y=\"212\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\">Underlying price (% of initial)</text><text x=\"12\" y=\"101.0\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\" transform=\"rotate(-90 12 101.0)\">Investor return (%)</text></svg>", "legend": [["lg-line", "Note payoff (2× above Strike)"], ["lg-dash", "Underlying (1×)"], ["lg-floor", "90% floor"]], "cap": null, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "All ≥ Strike", "th": "ทุกตัว ≥ Strike"}, "d": {"en": "Upside.", "th": "ฝั่งกำไร"}, "cls": "good", "o": {"en": "→ Principal + worst gain × 200%", "th": "→ เงินต้น + กำไรแย่สุด × 200%"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "Any < Strike", "th": "ตัวใด < Strike"}, "d": {"en": "Downside, floored.", "th": "ฝั่งลง มีพื้น"}, "cls": "bad", "o": {"en": "→ Cash, never below 90% (max loss 10%)", "th": "→ เงินสด ไม่ต่ำกว่า 90% (ขาดทุนสูงสุด 10%)"}}], "risks_extra": [{"en": "Partial protection only — up to 10% loss possible. Floor provided by issuer.", "th": "คุ้มครองบางส่วน — ขาดทุนได้ถึง 10% พื้นการคุ้มครองโดยผู้ออกตราสาร"}], "basket": {"cols_en": ["Stock", "Initial", "Strike", "Participation", "Min. Redemption"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Strike", "Participation", "ไถ่ถอนขั้นต่ำ"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "100%", "200%", "90%"], ["BBB", "Illustrative underlying", "100%", "100%", "", ""]]]], "ki_cols": [2], "ko_cols": [4]}}, "ben_prot": {"arch": "payoff", "illus": true, "order": 6, "title": {"en": "BEN With Protection", "th": "BEN With Protection"}, "tag": {"en": "BEN With Protection&nbsp; | &nbsp;Bonus Enhance Note&nbsp; | &nbsp;Partial Principal Protection&nbsp; | &nbsp;Cash Settlement", "th": "BEN With Protection&nbsp; | &nbsp;Bonus Enhance Note&nbsp; | &nbsp;คุ้มครองเงินต้นบางส่วน&nbsp; | &nbsp;ชำระเป็นเงินสด"}, "metrics": [{"l": {"en": "Bonus Coupon", "th": "โบนัส"}, "v": "20.00% flat", "c": "purple"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "3 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Min. Redemption", "th": "ไถ่ถอนขั้นต่ำ"}, "v": "90% of Principal", "c": "green"}], "conds": [{"color": "green", "n": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "lv": {"en": "90% Floor", "th": "ขั้นต่ำ 90%"}, "o": {"en": "Minimum Redemption", "th": "Minimum Redemption"}, "d": {"en": "At least 90% back; max loss 10%, cash-settled.", "th": "คืนอย่างน้อย 90% ขาดทุนสูงสุด 10% ชำระเป็นเงินสด"}}, {"color": "purple", "n": {"en": "Bonus Coupon", "th": "โบนัส"}, "lv": {"en": "20% flat", "th": "20% คงที่"}, "o": {"en": "If all ≥ Barrier", "th": "ถ้าทุกตัว ≥ Barrier"}, "d": {"en": "Greater of worst gain or 20% bonus.", "th": "มากกว่าระหว่างกำไรแย่สุดหรือโบนัส 20%"}}, {"color": "red", "n": {"en": "Strike Price", "th": "Strike Price"}, "lv": {"en": "100% of Initial", "th": "100% ของราคาเริ่มต้น"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "Any < Strike → worst return in cash, floored at 90%.", "th": "ตัวใด < Strike → ผลตอบแทนแย่สุดเป็นเงินสด มีพื้น 90%"}}], "svg": "<svg class=\"pf-svg\" viewBox=\"0 0 700 214\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"-apple-system,Segoe UI,sans-serif\"><rect x=\"48.0\" y=\"14.0\" width=\"636.0\" height=\"87.0\" fill=\"#F1F8F4\"/><rect x=\"48.0\" y=\"101.0\" width=\"636.0\" height=\"87.0\" fill=\"#FCF3F2\"/><rect x=\"302.4\" y=\"72.0\" width=\"127.20000000000005\" height=\"29.0\" fill=\"#E7DFFA\" opacity=\"0.85\"/><line x1=\"48.0\" y1=\"159.0\" x2=\"684.0\" y2=\"159.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"162.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">-40%</text><line x1=\"48.0\" y1=\"130.0\" x2=\"684.0\" y2=\"130.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"133.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">-20%</text><line x1=\"48.0\" y1=\"72.0\" x2=\"684.0\" y2=\"72.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"75.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+20%</text><line x1=\"48.0\" y1=\"43.0\" x2=\"684.0\" y2=\"43.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"46.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+40%</text><text x=\"175.2\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">80%</text><text x=\"302.4\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">100%</text><text x=\"429.6\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">120%</text><text x=\"556.8\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">140%</text><line x1=\"48.0\" y1=\"101.0\" x2=\"684.0\" y2=\"101.0\" stroke=\"#cfcfcf\" stroke-width=\"1.2\"/><text x=\"43.0\" y=\"104.0\" font-size=\"9\" fill=\"#999\" text-anchor=\"end\">0%</text><line x1=\"302.4\" y1=\"14.0\" x2=\"302.4\" y2=\"188.0\" stroke=\"#9a9a9a\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"302.4\" y=\"24.0\" font-size=\"8.5\" fill=\"#9a9a9a\" text-anchor=\"middle\">Strike 100%</text><text x=\"366.0\" y=\"69.0\" font-size=\"8.5\" fill=\"#6a4cb0\" text-anchor=\"middle\">Bonus 20%</text><polyline points=\"48.0,115.5 238.8,115.5 302.4,101.0 302.4,72.0 429.6,72.0 556.8,43.0\" fill=\"none\" stroke=\"#3D2B9E\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><text x=\"366.0\" y=\"212\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\">Underlying price (% of initial)</text><text x=\"12\" y=\"101.0\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\" transform=\"rotate(-90 12 101.0)\">Investor return (%)</text></svg>", "legend": [["lg-line", "Note payoff"], ["lg-bonus", "20% Bonus band"], ["lg-dash", "Underlying (1×)"], ["lg-floor", "90% floor"]], "cap": null, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "Worst gain > 20%", "th": "กำไรแย่สุด > 20%"}, "d": {"en": "Strong rally.", "th": "ปรับขึ้นแรง"}, "cls": "good", "o": {"en": "→ Principal + full gain", "th": "→ เงินต้น + กำไรเต็ม"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "All ≥ Barrier, ≤ 20%", "th": "ทุกตัว ≥ Barrier, ≤ 20%"}, "d": {"en": "Bonus zone.", "th": "โซนโบนัส"}, "cls": "good", "o": {"en": "→ Principal + 20% Bonus", "th": "→ เงินต้น + โบนัส 20%"}}, {"num": {"en": "Scenario 3", "th": "กรณีที่ 3"}, "t": {"en": "Any < Strike", "th": "ตัวใด < Strike"}, "d": {"en": "Downside, floored.", "th": "ฝั่งลง มีพื้น"}, "cls": "bad", "o": {"en": "→ Cash, never below 90%", "th": "→ เงินสด ไม่ต่ำกว่า 90%"}}], "risks_extra": [{"en": "Partial protection only — up to 10% loss possible. Floor provided by issuer.", "th": "คุ้มครองบางส่วน — ขาดทุนได้ถึง 10% พื้นการคุ้มครองโดยผู้ออกตราสาร"}], "basket": {"cols_en": ["Stock", "Initial", "Strike", "Coupon Barrier", "Min. Redemption"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Strike", "Coupon Barrier", "ไถ่ถอนขั้นต่ำ"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "100%", "100%", "90%"], ["BBB", "Illustrative underlying", "100%", "100%", "100%", ""]]]], "ki_cols": [2], "ko_cols": [3, 4]}}, "bullish_sharkfin": {"arch": "payoff", "illus": true, "order": 7, "title": {"en": "Bullish Sharkfin", "th": "Bullish Sharkfin"}, "tag": {"en": "Bullish Sharkfin&nbsp; | &nbsp;Full Principal Protection&nbsp; | &nbsp;Cash Settlement", "th": "Bullish Sharkfin&nbsp; | &nbsp;คุ้มครองเงินต้น 100%&nbsp; | &nbsp;ชำระเป็นเงินสด"}, "metrics": [{"l": {"en": "Max Upside", "th": "ผลตอบแทนสูงสุด"}, "v": "+15%", "c": "green"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "12 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "v": "100%", "c": "green"}], "conds": [{"color": "green", "n": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "lv": {"en": "100%", "th": "100%"}, "o": {"en": "At maturity", "th": "ณ วันครบกำหนด"}, "d": {"en": "Full principal is returned at maturity (subject to issuer credit).", "th": "คืนเงินต้นเต็มจำนวน ณ วันครบกำหนด (ขึ้นกับเครดิตผู้ออกตราสาร)"}}, {"color": "gray", "n": {"en": "Knock-Out Level", "th": "ระดับ Knock-Out"}, "lv": {"en": "115% of Initial", "th": "115% ของราคาเริ่มต้น"}, "o": {"en": "Observed daily", "th": "สังเกตรายวัน"}, "d": {"en": "Ever above 115% → pays flat KO Rebate.", "th": "เคยเกิน 115% → จ่าย KO Rebate คงที่"}}, {"color": "purple", "n": {"en": "Upside Participation", "th": "ส่วนร่วมขาขึ้น"}, "lv": {"en": "100% · cap +15%", "th": "100% · สูงสุด +15%"}, "o": {"en": "If never knocked out", "th": "ถ้าไม่ Knock-Out"}, "d": {"en": "Rise × 100%, up to +15%.", "th": "กำไรขาขึ้น × 100% สูงสุด +15%"}}], "svg": "<svg class=\"pf-svg\" viewBox=\"0 0 700 214\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"-apple-system,Segoe UI,sans-serif\"><rect x=\"48.0\" y=\"14.0\" width=\"636.0\" height=\"151.3\" fill=\"#F1F8F4\"/><line x1=\"48.0\" y1=\"127.5\" x2=\"684.0\" y2=\"127.5\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"130.5\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+5%</text><line x1=\"48.0\" y1=\"89.7\" x2=\"684.0\" y2=\"89.7\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"92.7\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+10%</text><line x1=\"48.0\" y1=\"51.8\" x2=\"684.0\" y2=\"51.8\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"54.8\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+15%</text><text x=\"175.2\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">80%</text><text x=\"302.4\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">100%</text><text x=\"429.6\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">120%</text><text x=\"556.8\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">140%</text><line x1=\"48.0\" y1=\"165.3\" x2=\"684.0\" y2=\"165.3\" stroke=\"#cfcfcf\" stroke-width=\"1.2\"/><text x=\"43.0\" y=\"168.3\" font-size=\"9\" fill=\"#999\" text-anchor=\"end\">0%</text><line x1=\"48.0\" y1=\"112.3\" x2=\"684.0\" y2=\"112.3\" stroke=\"#3f9b6b\" stroke-width=\"1.3\" stroke-dasharray=\"5,3\"/><text x=\"682.0\" y=\"109.3\" font-size=\"8.5\" fill=\"#3f9b6b\" text-anchor=\"end\">KO Rebate 7%</text><line x1=\"302.4\" y1=\"14.0\" x2=\"302.4\" y2=\"188.0\" stroke=\"#9a9a9a\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"302.4\" y=\"24.0\" font-size=\"8.5\" fill=\"#9a9a9a\" text-anchor=\"middle\">Strike 100%</text><line x1=\"397.8\" y1=\"14.0\" x2=\"397.8\" y2=\"188.0\" stroke=\"#3f9b6b\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"397.8\" y=\"34.0\" font-size=\"8.5\" fill=\"#3f9b6b\" text-anchor=\"middle\">KO 115%</text><polyline points=\"48.0,165.3 302.4,165.3 397.8,51.8 397.8,112.3 684.0,112.3\" fill=\"none\" stroke=\"#3D2B9E\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><text x=\"366.0\" y=\"212\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\">Underlying price (% of initial)</text><text x=\"12\" y=\"101.0\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\" transform=\"rotate(-90 12 101.0)\">Investor return (%)</text></svg>", "legend": [["lg-line", "Note payoff (fin)"], ["lg-floor", "KO Rebate 7%"]], "cap": null, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "Rises above 115%", "th": "ปรับขึ้นเกิน 115%"}, "d": {"en": "KO triggered.", "th": "เกิด Knock-Out"}, "cls": "good", "o": {"en": "→ Principal + 7% KO Rebate", "th": "→ เงินต้น + KO Rebate 7%"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "No KO, ≤ Strike", "th": "ไม่ KO, ≤ Strike"}, "d": {"en": "Flat/down.", "th": "ทรง/ลง"}, "cls": "good", "o": {"en": "→ Principal in full (0%, protected)", "th": "→ คืนเงินต้นเต็ม (0% คุ้มครอง)"}}, {"num": {"en": "Scenario 3", "th": "กรณีที่ 3"}, "t": {"en": "No KO, > Strike", "th": "ไม่ KO, > Strike"}, "d": {"en": "Modest rise.", "th": "ปรับขึ้นเล็กน้อย"}, "cls": "good", "o": {"en": "→ Principal + rise × 100% (max +15%)", "th": "→ เงินต้น + กำไร × 100% (สูงสุด +15%)"}}], "risks_extra": [{"en": "Fully protected, but upside is capped: a Knock-Out pays only 7% Rebate; gains never exceed +15%.", "th": "คุ้มครองเต็ม แต่ผลตอบแทนถูกจำกัด: Knock-Out จ่ายเพียง 7% กำไรไม่เกิน +15%"}], "basket": {"cols_en": ["Underlying", "Initial", "Strike", "KO Level", "KO Rebate"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Strike", "ระดับ KO", "KO Rebate"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "100%", "115%", "7% flat"]]]], "ki_cols": [2], "ko_cols": [3]}}, "bearish_sharkfin": {"arch": "payoff", "illus": true, "order": 8, "title": {"en": "Bearish Sharkfin", "th": "Bearish Sharkfin"}, "tag": {"en": "Bearish Sharkfin&nbsp; | &nbsp;Full Principal Protection&nbsp; | &nbsp;Cash Settlement&nbsp; | &nbsp;Profits When the Market Falls", "th": "Bearish Sharkfin&nbsp; | &nbsp;คุ้มครองเงินต้น 100%&nbsp; | &nbsp;ชำระเป็นเงินสด&nbsp; | &nbsp;ได้กำไรเมื่อตลาดลง"}, "metrics": [{"l": {"en": "Max Upside", "th": "ผลตอบแทนสูงสุด"}, "v": "+15%", "c": "green"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "12 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "v": "100%", "c": "green"}], "conds": [{"color": "green", "n": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "lv": {"en": "100%", "th": "100%"}, "o": {"en": "At maturity", "th": "ณ วันครบกำหนด"}, "d": {"en": "Full principal is returned at maturity (subject to issuer credit).", "th": "คืนเงินต้นเต็มจำนวน ณ วันครบกำหนด (ขึ้นกับเครดิตผู้ออกตราสาร)"}}, {"color": "gray", "n": {"en": "Knock-Out Level", "th": "ระดับ Knock-Out"}, "lv": {"en": "85% of Initial", "th": "85% ของราคาเริ่มต้น"}, "o": {"en": "Observed daily", "th": "สังเกตรายวัน"}, "d": {"en": "Ever below 85% → pays flat KO Rebate.", "th": "เคยต่ำกว่า 85% → จ่าย KO Rebate คงที่"}}, {"color": "purple", "n": {"en": "Downside Participation", "th": "ส่วนร่วมขาลง"}, "lv": {"en": "100% · cap +15%", "th": "100% · สูงสุด +15%"}, "o": {"en": "If never knocked out", "th": "ถ้าไม่ Knock-Out"}, "d": {"en": "Profits as it falls × 100%, up to +15%.", "th": "ได้กำไรเมื่อราคาลง × 100% สูงสุด +15%"}}], "svg": "<svg class=\"pf-svg\" viewBox=\"0 0 700 214\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"-apple-system,Segoe UI,sans-serif\"><rect x=\"48.0\" y=\"14.0\" width=\"636.0\" height=\"151.3\" fill=\"#F1F8F4\"/><line x1=\"48.0\" y1=\"127.5\" x2=\"684.0\" y2=\"127.5\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"130.5\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+5%</text><line x1=\"48.0\" y1=\"89.7\" x2=\"684.0\" y2=\"89.7\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"92.7\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+10%</text><line x1=\"48.0\" y1=\"51.8\" x2=\"684.0\" y2=\"51.8\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"54.8\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+15%</text><text x=\"175.2\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">80%</text><text x=\"302.4\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">100%</text><text x=\"429.6\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">120%</text><text x=\"556.8\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">140%</text><line x1=\"48.0\" y1=\"165.3\" x2=\"684.0\" y2=\"165.3\" stroke=\"#cfcfcf\" stroke-width=\"1.2\"/><text x=\"43.0\" y=\"168.3\" font-size=\"9\" fill=\"#999\" text-anchor=\"end\">0%</text><line x1=\"48.0\" y1=\"112.3\" x2=\"684.0\" y2=\"112.3\" stroke=\"#3f9b6b\" stroke-width=\"1.3\" stroke-dasharray=\"5,3\"/><text x=\"682.0\" y=\"109.3\" font-size=\"8.5\" fill=\"#3f9b6b\" text-anchor=\"end\">KO Rebate 7%</text><line x1=\"207.0\" y1=\"14.0\" x2=\"207.0\" y2=\"188.0\" stroke=\"#3f9b6b\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"207.0\" y=\"24.0\" font-size=\"8.5\" fill=\"#3f9b6b\" text-anchor=\"middle\">KO 85%</text><line x1=\"302.4\" y1=\"14.0\" x2=\"302.4\" y2=\"188.0\" stroke=\"#9a9a9a\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"302.4\" y=\"34.0\" font-size=\"8.5\" fill=\"#9a9a9a\" text-anchor=\"middle\">Strike 100%</text><polyline points=\"48.0,112.3 207.0,112.3 207.0,51.8 302.4,165.3 684.0,165.3\" fill=\"none\" stroke=\"#3D2B9E\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><text x=\"366.0\" y=\"212\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\">Underlying price (% of initial)</text><text x=\"12\" y=\"101.0\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\" transform=\"rotate(-90 12 101.0)\">Investor return (%)</text></svg>", "legend": [["lg-line", "Note payoff (fin)"], ["lg-floor", "KO Rebate 7%"]], "cap": null, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "Falls below 85%", "th": "ปรับลงต่ำกว่า 85%"}, "d": {"en": "KO triggered.", "th": "เกิด Knock-Out"}, "cls": "good", "o": {"en": "→ Principal + 7% KO Rebate", "th": "→ เงินต้น + KO Rebate 7%"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "No KO, ≥ Strike", "th": "ไม่ KO, ≥ Strike"}, "d": {"en": "Flat/up.", "th": "ทรง/ขึ้น"}, "cls": "good", "o": {"en": "→ Principal in full (0%, protected)", "th": "→ คืนเงินต้นเต็ม (0% คุ้มครอง)"}}, {"num": {"en": "Scenario 3", "th": "กรณีที่ 3"}, "t": {"en": "No KO, < Strike", "th": "ไม่ KO, < Strike"}, "d": {"en": "Modest fall.", "th": "ปรับลงเล็กน้อย"}, "cls": "good", "o": {"en": "→ Principal + decline × 100% (max +15%)", "th": "→ เงินต้น + ส่วนลด × 100% (สูงสุด +15%)"}}], "risks_extra": [{"en": "Fully protected, but upside is capped: a Knock-Out pays only 7% Rebate; gains never exceed +15%. Benefits from a falling market.", "th": "คุ้มครองเต็ม แต่ผลตอบแทนถูกจำกัด: Knock-Out จ่ายเพียง 7% กำไรไม่เกิน +15% ได้ประโยชน์เมื่อตลาดลง"}], "basket": {"cols_en": ["Underlying", "Initial", "Strike", "KO Level", "KO Rebate"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Strike", "ระดับ KO", "KO Rebate"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "100%", "85%", "7% flat"]]]], "ki_cols": [2], "ko_cols": [3]}}, "twin_win": {"arch": "payoff", "illus": true, "order": 9, "title": {"en": "Twin Win", "th": "Twin Win"}, "tag": {"en": "Twin Win&nbsp; | &nbsp;Full Principal Protection&nbsp; | &nbsp;Cash Settlement&nbsp; | &nbsp;Profits Up or Down", "th": "Twin Win&nbsp; | &nbsp;คุ้มครองเงินต้น 100%&nbsp; | &nbsp;ชำระเป็นเงินสด&nbsp; | &nbsp;ได้กำไรทั้งขึ้นและลง"}, "metrics": [{"l": {"en": "Min Coupon", "th": "ดอกเบี้ยขั้นต่ำ"}, "v": "+3.5% flat", "c": "green"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "12 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "v": "100%", "c": "green"}], "conds": [{"color": "green", "n": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "lv": {"en": "100%", "th": "100%"}, "o": {"en": "At maturity", "th": "ณ วันครบกำหนด"}, "d": {"en": "Full principal is returned at maturity (subject to issuer credit).", "th": "คืนเงินต้นเต็มจำนวน ณ วันครบกำหนด (ขึ้นกับเครดิตผู้ออกตราสาร)"}}, {"color": "gray", "n": {"en": "Knock-Out Band", "th": "กรอบ Knock-Out"}, "lv": {"en": "80% – 120%", "th": "80% – 120%"}, "o": {"en": "Observed daily", "th": "สังเกตรายวัน"}, "d": {"en": "Stay inside → twin-win; touch edge → flat 3.5% Rebate.", "th": "อยู่ในกรอบ → Twin Win; แตะขอบ → Rebate 3.5%"}}, {"color": "purple", "n": {"en": "Twin-Win Participation", "th": "ส่วนร่วม Twin-Win"}, "lv": {"en": "50% · min +3.5%", "th": "50% · ขั้นต่ำ +3.5%"}, "o": {"en": "abs. move × 50%", "th": "|การเคลื่อนไหว| × 50%"}, "d": {"en": "Absolute move × 50%, floored at 3.5% (max +10%).", "th": "ค่าสัมบูรณ์ × 50% พื้น 3.5% (สูงสุด +10%)"}}], "svg": "<svg class=\"pf-svg\" viewBox=\"0 0 700 214\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"-apple-system,Segoe UI,sans-serif\"><rect x=\"48.0\" y=\"14.0\" width=\"636.0\" height=\"152.2\" fill=\"#F1F8F4\"/><line x1=\"48.0\" y1=\"111.9\" x2=\"684.0\" y2=\"111.9\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"114.9\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+5%</text><line x1=\"48.0\" y1=\"57.5\" x2=\"684.0\" y2=\"57.5\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"60.5\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+10%</text><text x=\"175.2\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">80%</text><text x=\"302.4\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">100%</text><text x=\"429.6\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">120%</text><text x=\"556.8\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">140%</text><line x1=\"48.0\" y1=\"166.2\" x2=\"684.0\" y2=\"166.2\" stroke=\"#cfcfcf\" stroke-width=\"1.2\"/><text x=\"43.0\" y=\"169.2\" font-size=\"9\" fill=\"#999\" text-anchor=\"end\">0%</text><line x1=\"48.0\" y1=\"128.2\" x2=\"684.0\" y2=\"128.2\" stroke=\"#9a9a9a\" stroke-width=\"1.3\" stroke-dasharray=\"5,3\"/><text x=\"682.0\" y=\"125.19999999999999\" font-size=\"8.5\" fill=\"#9a9a9a\" text-anchor=\"end\">Min Coupon / Rebate 3.5%</text><line x1=\"175.2\" y1=\"14.0\" x2=\"175.2\" y2=\"188.0\" stroke=\"#3f9b6b\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"175.2\" y=\"24.0\" font-size=\"8.5\" fill=\"#3f9b6b\" text-anchor=\"middle\">Lower KO 80%</text><line x1=\"302.4\" y1=\"14.0\" x2=\"302.4\" y2=\"188.0\" stroke=\"#9a9a9a\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"302.4\" y=\"34.0\" font-size=\"8.5\" fill=\"#9a9a9a\" text-anchor=\"middle\">Strike</text><line x1=\"429.6\" y1=\"14.0\" x2=\"429.6\" y2=\"188.0\" stroke=\"#3f9b6b\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"429.6\" y=\"24.0\" font-size=\"8.5\" fill=\"#3f9b6b\" text-anchor=\"middle\">Upper KO 120%</text><polyline points=\"48.0,128.2 175.2,128.2 175.2,57.5 257.9,128.2 346.9,128.2 429.6,57.5 429.6,128.2 684.0,128.2\" fill=\"none\" stroke=\"#3D2B9E\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><text x=\"366.0\" y=\"212\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\">Underlying price (% of initial)</text><text x=\"12\" y=\"101.0\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\" transform=\"rotate(-90 12 101.0)\">Investor return (%)</text></svg>", "legend": [["lg-line", "Note payoff (W)"], ["lg-floor", "Min Coupon / Rebate 3.5%"]], "cap": null, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "Leaves 80–120% band", "th": "ออกนอกกรอบ 80–120%"}, "d": {"en": "KO triggered.", "th": "เกิด Knock-Out"}, "cls": "good", "o": {"en": "→ Principal + 3.5% KO Rebate", "th": "→ เงินต้น + KO Rebate 3.5%"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "No KO, small move", "th": "ไม่ KO, เคลื่อนไหวน้อย"}, "d": {"en": "Near start.", "th": "ใกล้ราคาเริ่มต้น"}, "cls": "good", "o": {"en": "→ Principal + 3.5% Min Coupon", "th": "→ เงินต้น + ดอกเบี้ยขั้นต่ำ 3.5%"}}, {"num": {"en": "Scenario 3", "th": "กรณีที่ 3"}, "t": {"en": "No KO, larger move", "th": "ไม่ KO, เคลื่อนไหวมาก"}, "d": {"en": "Either direction.", "th": "ทิศใดก็ได้"}, "cls": "good", "o": {"en": "→ Principal + abs. move × 50% (max +10%)", "th": "→ เงินต้น + |การเคลื่อนไหว| × 50% (สูงสุด +10%)"}}], "risks_extra": [{"en": "Fully protected, but a Knock-Out caps you at 3.5% Rebate; non-KO gains limited to +10%.", "th": "คุ้มครองเต็ม แต่ Knock-Out จำกัดที่ 3.5% กำไรกรณีไม่ KO ไม่เกิน +10%"}], "basket": {"cols_en": ["Underlying", "Initial", "Lower KO", "Upper KO", "Min Coupon"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Lower KO", "Upper KO", "Min Coupon"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "80%", "120%", "3.5% flat"]]]], "ki_cols": [], "ko_cols": [2, 3]}}, "booster": {"arch": "payoff", "illus": true, "order": 10, "title": {"en": "Booster", "th": "Booster"}, "tag": {"en": "Booster&nbsp; | &nbsp;Not Principal Protected&nbsp; | &nbsp;Physical Settlement&nbsp; | &nbsp;Geared Participation", "th": "Booster&nbsp; | &nbsp;ไม่คุ้มครองเงินต้น&nbsp; | &nbsp;ส่งมอบเป็นหลักทรัพย์&nbsp; | &nbsp;ทดผลตอบแทน"}, "metrics": [{"l": {"en": "Participation Rate", "th": "อัตราการมีส่วนร่วม"}, "v": "200%", "c": "purple"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "3 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Settlement", "th": "การส่งมอบ"}, "v": "Physical", "c": "red"}], "conds": [{"color": "purple", "n": {"en": "Participation Rate", "th": "อัตราการมีส่วนร่วม"}, "lv": {"en": "200%", "th": "200%"}, "o": {"en": "Above Strike", "th": "เหนือ Strike"}, "d": {"en": "Worst performer gain × 2×.", "th": "กำไรหุ้นแย่สุด × 2 เท่า"}}, {"color": "gray", "n": {"en": "Strike Price", "th": "Strike Price"}, "lv": {"en": "100% of Initial", "th": "100% ของราคาเริ่มต้น"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "Splits geared upside from share downside.", "th": "แบ่งฝั่งกำไรทดกับฝั่งลงที่รับหุ้น"}}, {"color": "red", "n": {"en": "Settlement", "th": "การส่งมอบ"}, "lv": {"en": "Physical", "th": "ส่งมอบหลักทรัพย์"}, "o": {"en": "If any < Strike", "th": "ถ้าตัวใด < Strike"}, "d": {"en": "Receive worst shares — full downside, not protected.", "th": "รับหุ้นแย่สุด — เต็มขาลง ไม่คุ้มครอง"}}], "svg": "<svg class=\"pf-svg\" viewBox=\"0 0 700 214\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"-apple-system,Segoe UI,sans-serif\"><rect x=\"48.0\" y=\"14.0\" width=\"636.0\" height=\"87.0\" fill=\"#F1F8F4\"/><rect x=\"48.0\" y=\"101.0\" width=\"636.0\" height=\"87.0\" fill=\"#FCF3F2\"/><line x1=\"48.0\" y1=\"159.0\" x2=\"684.0\" y2=\"159.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"162.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">-40%</text><line x1=\"48.0\" y1=\"130.0\" x2=\"684.0\" y2=\"130.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"133.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">-20%</text><line x1=\"48.0\" y1=\"72.0\" x2=\"684.0\" y2=\"72.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"75.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+20%</text><line x1=\"48.0\" y1=\"43.0\" x2=\"684.0\" y2=\"43.0\" stroke=\"#ECECEC\" stroke-width=\"1\"/><text x=\"43.0\" y=\"46.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">+40%</text><text x=\"175.2\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">80%</text><text x=\"302.4\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">100%</text><text x=\"429.6\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">120%</text><text x=\"556.8\" y=\"201.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">140%</text><line x1=\"48.0\" y1=\"101.0\" x2=\"684.0\" y2=\"101.0\" stroke=\"#cfcfcf\" stroke-width=\"1.2\"/><text x=\"43.0\" y=\"104.0\" font-size=\"9\" fill=\"#999\" text-anchor=\"end\">0%</text><line x1=\"302.4\" y1=\"14.0\" x2=\"302.4\" y2=\"188.0\" stroke=\"#9a9a9a\" stroke-width=\"1.1\" stroke-dasharray=\"4,3\"/><text x=\"302.4\" y=\"24.0\" font-size=\"8.5\" fill=\"#9a9a9a\" text-anchor=\"middle\">Strike 100%</text><polyline points=\"48.0,159.0 684.0,14.0\" fill=\"none\" stroke=\"#9a9a9a\" stroke-width=\"1.4\" stroke-dasharray=\"2,3\"/><polyline points=\"48.0,159.0 302.4,101.0 493.2,14.0\" fill=\"none\" stroke=\"#3D2B9E\" stroke-width=\"2.6\" stroke-linejoin=\"round\" stroke-linecap=\"round\"/><text x=\"366.0\" y=\"212\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\">Underlying price (% of initial)</text><text x=\"12\" y=\"101.0\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\" transform=\"rotate(-90 12 101.0)\">Investor return (%)</text></svg>", "legend": [["lg-line", "Note payoff (2×)"], ["lg-dash", "Underlying (1×)"]], "cap": null, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "All ≥ Strike", "th": "ทุกตัว ≥ Strike"}, "d": {"en": "Upside.", "th": "ฝั่งกำไร"}, "cls": "good", "o": {"en": "→ Principal + worst gain × 200%", "th": "→ เงินต้น + กำไรแย่สุด × 200%"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "Any < Strike", "th": "ตัวใด < Strike"}, "d": {"en": "Share delivery.", "th": "ส่งมอบหุ้น"}, "cls": "bad", "o": {"en": "→ Receive worst shares (full downside, principal at risk)", "th": "→ รับหุ้นแย่สุด (เต็มขาลง เงินต้นมีความเสี่ยง)"}}], "risks_extra": [{"en": "Not principal protected — below Strike you receive shares and bear the full decline (no floor).", "th": "ไม่คุ้มครองเงินต้น — ต่ำกว่า Strike รับหุ้นและรับขาลงเต็ม (ไม่มีพื้น)"}], "basket": {"cols_en": ["Stock", "Initial", "Strike", "Participation", "Settlement"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Strike", "Participation", "การส่งมอบ"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "100%", "200%", "Physical"], ["BBB", "Illustrative underlying", "100%", "100%", "", ""]]]], "ki_cols": [2], "ko_cols": []}}, "fixed_rate_note": {"arch": "coupon", "illus": true, "order": 11, "title": {"en": "Fixed Rate Note (Stepdown Callable)", "th": "Fixed Rate Note (Stepdown Callable)"}, "tag": {"en": "Fixed Rate Note — Stepdown Callable&nbsp; | &nbsp;Full Principal Protection&nbsp; | &nbsp;Cash Settlement", "th": "Fixed Rate Note — Stepdown Callable&nbsp; | &nbsp;คุ้มครองเงินต้น 100%&nbsp; | &nbsp;ชำระเป็นเงินสด"}, "metrics": [{"l": {"en": "Coupon (Yr 1–2)", "th": "ดอกเบี้ย (ปี 1–2)"}, "v": "5.40% p.a.", "c": "green"}, {"l": {"en": "Coupon (Yr 3–10)", "th": "ดอกเบี้ย (ปี 3–10)"}, "v": "4.30% p.a.", "c": "green"}, {"l": {"en": "Tenor / Non-Call", "th": "อายุ / Non-Call"}, "v": "10Y / 1Y", "c": "sm"}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}], "conds": [{"color": "green", "n": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "lv": {"en": "100%", "th": "100%"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "Full principal at maturity regardless of rates.", "th": "คืนเงินต้นเต็มไม่ว่าดอกเบี้ยจะเป็นอย่างไร"}}, {"color": "gray", "n": {"en": "Non-Callable Period", "th": "ช่วงห้ามไถ่ถอน"}, "lv": {"en": "1 Year", "th": "1 ปี"}, "o": {"en": "Months 1–12", "th": "เดือน 1–12"}, "d": {"en": "Issuer cannot redeem during Year 1.", "th": "ผู้ออกไถ่ถอนไม่ได้ในปีแรก"}}, {"color": "purple", "n": {"en": "Issuer Call", "th": "สิทธิไถ่ถอนของผู้ออก"}, "lv": {"en": "Quarterly after Yr 1", "th": "รายไตรมาสหลังปี 1"}, "o": {"en": "From Month 12", "th": "ตั้งแต่เดือน 12"}, "d": {"en": "May redeem early each quarter (reinvestment risk).", "th": "ไถ่ถอนก่อนได้รายไตรมาส (ความเสี่ยง reinvestment)"}}], "coupon_full": [["1", "Month 3", "1.350%", "1.35%", 1, ""], ["1", "Month 6", "1.350%", "2.70%", 1, ""], ["1", "Month 9", "1.350%", "4.05%", 1, ""], ["1", "Month 12", "1.350%", "5.40%", 1, "◆ Callable from here"], ["2", "Month 15", "1.350%", "6.75%", 0, ""], ["2", "Month 18", "1.350%", "8.10%", 0, ""], ["2", "Month 21", "1.350%", "9.45%", 0, ""], ["2", "Month 24", "1.350%", "10.80%", 0, "Step-down after Yr 2"], ["3", "Yr 3", "4.30%", "15.10%", 0, "▼ 4.30% p.a."], ["4", "Yr 4", "4.30%", "19.40%", 0, ""], ["5", "Yr 5", "4.30%", "23.70%", 0, ""], ["6", "Yr 6", "4.30%", "28.00%", 0, ""], ["7", "Yr 7", "4.30%", "32.30%", 0, ""], ["8", "Yr 8", "4.30%", "36.60%", 0, ""], ["9", "Yr 9", "4.30%", "40.90%", 0, ""], ["10", "Yr 10", "4.30%", "45.20%", 0, "Maturity"]], "coupon_kh": [["1", "5.40%", "5.40%"], ["2", "5.40%", "10.80%"], ["3", "4.30%", "15.10%"], ["4", "4.30%", "19.40%"], ["5", "4.30%", "23.70%"], ["6", "4.30%", "28.00%"], ["7", "4.30%", "32.30%"], ["8", "4.30%", "36.60%"], ["9", "4.30%", "40.90%"], ["10", "4.30%", "45.20%"]], "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "Held to maturity", "th": "ถือจนครบกำหนด"}, "d": {"en": "Never called.", "th": "ไม่ถูกไถ่ถอน"}, "cls": "good", "o": {"en": "→ All coupons (45.20%) + full principal", "th": "→ ดอกเบี้ยทั้งหมด (45.20%) + เงินต้นเต็ม"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "Called early", "th": "ถูกไถ่ถอนก่อน"}, "d": {"en": "After Year 1.", "th": "หลังปี 1"}, "cls": "good", "o": {"en": "→ Full principal + coupons to call date", "th": "→ เงินต้นเต็ม + ดอกเบี้ยถึงวันไถ่ถอน"}}], "risks_extra": [{"en": "Fully protected, but coupon steps down after Yr 2 and is callable quarterly after Yr 1 (reinvestment risk).", "th": "คุ้มครองเต็ม แต่ดอกเบี้ยลดหลังปี 2 และถูกไถ่ถอนรายไตรมาสหลังปี 1 (ความเสี่ยง reinvestment)"}], "coupon_dividers": {"after_index": {"en": {"0": "Years 1–2 — paid quarterly (Year 1 shaded = Non-Callable, guaranteed)", "8": "Years 3–10 — after step-down, 4.30% p.a. (1.075% per quarter), shown per year"}, "th": {"0": "ปี 1–2 — จ่ายรายไตรมาส (ปี 1 แรเงา = Non-Callable รับประกัน)", "8": "ปี 3–10 — หลัง step-down, 4.30% ต่อปี (1.075%/ไตรมาส) แสดงรายปี"}}}}, "three_musketeers": {"arch": "path", "illus": true, "order": 12, "title": {"en": "Three Musketeers", "th": "Three Musketeers"}, "tag": {"en": "Three Musketeers&nbsp; | &nbsp;Full Principal Protection&nbsp; | &nbsp;Auto-Callable&nbsp; | &nbsp;Cash Settlement", "th": "Three Musketeers&nbsp; | &nbsp;คุ้มครองเงินต้น 100%&nbsp; | &nbsp;ไถ่ถอนอัตโนมัติ&nbsp; | &nbsp;ชำระเป็นเงินสด"}, "metrics": [{"l": {"en": "Coupon", "th": "ดอกเบี้ย"}, "v": "9.00% p.a.", "c": "green"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "12 Months", "c": ""}, {"l": {"en": "Min. Subscription", "th": "เงินลงทุนขั้นต่ำ"}, "v": "USD 30,000", "c": "sm"}, {"l": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "v": "100%", "c": "green"}], "conds": [{"color": "green", "n": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "lv": {"en": "100%", "th": "100%"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "No Auto-Call → full principal; only coupon is at risk.", "th": "ไม่ Auto-Call → คืนเงินต้นเต็ม เสี่ยงเฉพาะดอกเบี้ย"}}, {"color": "gray", "n": {"en": "Knock-Out Level", "th": "ระดับ Knock-Out"}, "lv": {"en": "105% of Initial", "th": "105% ของราคาเริ่มต้น"}, "o": {"en": "Observed monthly", "th": "สังเกตรายเดือน"}, "d": {"en": "All 3 stocks ≥ 105% together → auto-call.", "th": "หุ้นครบ 3 ตัว ≥ 105% พร้อมกัน → ไถ่ถอนอัตโนมัติ"}}, {"color": "purple", "n": {"en": "Coupon on Auto-Call", "th": "ดอกเบี้ยเมื่อ Auto-Call"}, "lv": {"en": "9.00% p.a.", "th": "9.00% ต่อปี"}, "o": {"en": "Pro-rated", "th": "ตามสัดส่วน"}, "d": {"en": "Pro-rated to call month (M9 → 6.75%).", "th": "คิดตามเดือนที่ไถ่ถอน (M9 → 6.75%)"}}], "chart": "path", "basket": {"cols_en": ["Stock", "Initial", "Knock-Out", "Coupon"], "cols_th": ["หลักทรัพย์", "ราคาเริ่มต้น", "Knock-Out", "ดอกเบี้ย"], "groups": [[null, [["AAA", "Illustrative underlying", "100%", "105%", "9.00% p.a."], ["BBB", "Illustrative underlying", "100%", "105%", "9.00% p.a."], ["CCC", "Illustrative underlying", "100%", "105%", "9.00% p.a."]]]], "ki_cols": [], "ko_cols": [2]}, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "All 3 ≥ KO early", "th": "ครบ 3 ตัว ≥ KO ก่อนกำหนด"}, "d": {"en": "Auto-call e.g. M9.", "th": "ไถ่ถอน เช่น M9"}, "cls": "good", "o": {"en": "→ Principal + coupon pro-rated (6.75%)", "th": "→ เงินต้น + ดอกเบี้ยตามสัดส่วน (6.75%)"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "All 3 ≥ KO at final", "th": "ครบ 3 ตัว ≥ KO วันสุดท้าย"}, "d": {"en": "At last observation.", "th": "วันสังเกตสุดท้าย"}, "cls": "good", "o": {"en": "→ Principal + full 9% coupon", "th": "→ เงินต้น + ดอกเบี้ยเต็ม 9%"}}, {"num": {"en": "Scenario 3", "th": "กรณีที่ 3"}, "t": {"en": "KO never met by all 3", "th": "ไม่ครบ 3 ตัวพร้อมกัน"}, "d": {"en": "No auto-call.", "th": "ไม่ไถ่ถอน"}, "cls": "bad", "o": {"en": "→ Principal only — no coupon", "th": "→ คืนเงินต้นเท่านั้น — ไม่มีดอกเบี้ย"}}], "risks_extra": [{"en": "Fully protected, but coupon is conditional — if all three never knock out together, you earn no coupon.", "th": "คุ้มครองเต็ม แต่ดอกเบี้ยมีเงื่อนไข — ถ้า 3 ตัวไม่ Knock-Out พร้อมกัน จะไม่ได้ดอกเบี้ย"}], "chart_svg": "<svg class=\"pf-svg\" viewBox=\"0 0 700 232\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"-apple-system,Segoe UI,sans-serif\"><rect x=\"42.0\" y=\"26.0\" width=\"644.0\" height=\"67.5\" fill=\"#EAF7F0\"/><line x1=\"42.0\" y1=\"161.0\" x2=\"686.0\" y2=\"161.0\" stroke=\"#EDEDED\" stroke-width=\"1\"/><text x=\"37.0\" y=\"164.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">90%</text><line x1=\"42.0\" y1=\"116.0\" x2=\"686.0\" y2=\"116.0\" stroke=\"#EDEDED\" stroke-width=\"1\"/><text x=\"37.0\" y=\"119.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">100%</text><line x1=\"42.0\" y1=\"71.0\" x2=\"686.0\" y2=\"71.0\" stroke=\"#EDEDED\" stroke-width=\"1\"/><text x=\"37.0\" y=\"74.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"end\">110%</text><line x1=\"203.0\" y1=\"26.0\" x2=\"203.0\" y2=\"206.0\" stroke=\"#F2F2F2\" stroke-width=\"1\"/><text x=\"203.0\" y=\"219.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">M3</text><line x1=\"364.0\" y1=\"26.0\" x2=\"364.0\" y2=\"206.0\" stroke=\"#F2F2F2\" stroke-width=\"1\"/><text x=\"364.0\" y=\"219.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">M6</text><line x1=\"525.0\" y1=\"26.0\" x2=\"525.0\" y2=\"206.0\" stroke=\"#F2F2F2\" stroke-width=\"1\"/><text x=\"525.0\" y=\"219.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">M9</text><line x1=\"686.0\" y1=\"26.0\" x2=\"686.0\" y2=\"206.0\" stroke=\"#F2F2F2\" stroke-width=\"1\"/><text x=\"686.0\" y=\"219.0\" font-size=\"9\" fill=\"#aaa\" text-anchor=\"middle\">M12</text><line x1=\"42.0\" y1=\"116.0\" x2=\"686.0\" y2=\"116.0\" stroke=\"#cfcfcf\" stroke-width=\"1.1\"/><text x=\"37.0\" y=\"119.0\" font-size=\"9\" fill=\"#999\" text-anchor=\"end\">100%</text><line x1=\"42.0\" y1=\"93.5\" x2=\"686.0\" y2=\"93.5\" stroke=\"#3f9b6b\" stroke-width=\"1.4\" stroke-dasharray=\"5,3\"/><text x=\"46.0\" y=\"89.0\" font-size=\"8.5\" fill=\"#2f7d54\" text-anchor=\"start\">Knock-Out 105% (all names must close &ge; here)</text><path d=\"M 42.0,116.0 L 203.0,111.5 L 364.0,84.5 L 525.0,80.0\" fill=\"none\" stroke=\"#2E6FE0\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/><path d=\"M 42.0,116.0 L 203.0,125.0 L 364.0,102.5 L 525.0,89.0\" fill=\"none\" stroke=\"#2BB6C4\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/><path d=\"M 42.0,116.0 L 203.0,98.0 L 364.0,89.0 L 525.0,75.5\" fill=\"none\" stroke=\"#6a3fb0\" stroke-width=\"2.4\" stroke-linejoin=\"round\"/><circle cx=\"525.0\" cy=\"89.0\" r=\"4.5\" fill=\"#fff\" stroke=\"#c0574c\" stroke-width=\"2\"/><line x1=\"525.0\" y1=\"26.0\" x2=\"525.0\" y2=\"206.0\" stroke=\"#c0574c\" stroke-width=\"1.1\" stroke-dasharray=\"3,3\"/><text x=\"521.0\" y=\"37.0\" font-size=\"9\" fill=\"#b0473c\" text-anchor=\"end\" font-weight=\"600\">Auto-Call (M9)</text><text x=\"521.0\" y=\"48.0\" font-size=\"8\" fill=\"#b0473c\" text-anchor=\"end\">all 3 names &ge; KO &rarr; early redemption</text><text x=\"364.0\" y=\"230\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\">Months from issue (monthly Knock-Out observation)</text><text x=\"12\" y=\"116.0\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\" transform=\"rotate(-90 12 116.0)\">Price (% of initial)</text></svg>"}, "lookback_dispersion": {"arch": "bar", "illus": true, "order": 13, "title": {"en": "Lookback Dispersion", "th": "Lookback Dispersion"}, "tag": {"en": "Lookback Dispersion&nbsp; | &nbsp;Full Principal Protection&nbsp; | &nbsp;Cash Settlement&nbsp; | &nbsp;Profits From Divergence", "th": "Lookback Dispersion&nbsp; | &nbsp;คุ้มครองเงินต้น 100%&nbsp; | &nbsp;ชำระเป็นเงินสด&nbsp; | &nbsp;ได้กำไรจากการกระจายตัว"}, "metrics": [{"l": {"en": "Strike", "th": "Strike"}, "v": "19.60%", "c": "purple"}, {"l": {"en": "Tenor", "th": "อายุตราสาร"}, "v": "6 Months", "c": ""}, {"l": {"en": "Lookback", "th": "Lookback"}, "v": "3 Months", "c": "sm"}, {"l": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "v": "100%", "c": "green"}], "conds": [{"color": "green", "n": {"en": "Principal Protection", "th": "คุ้มครองเงินต้น"}, "lv": {"en": "100%", "th": "100%"}, "o": {"en": "At maturity", "th": "ณ ครบกำหนด"}, "d": {"en": "Full principal at maturity; only extra return at risk.", "th": "คืนเงินต้นเต็ม เสี่ยงเฉพาะผลตอบแทนส่วนเพิ่ม"}}, {"color": "gray", "n": {"en": "Dispersion Payoff", "th": "ผลตอบแทนจากการกระจาย"}, "lv": {"en": "Spread − Strike", "th": "Spread − Strike"}, "o": {"en": "~10-stock basket", "th": "ตะกร้า ~10 หุ้น"}, "d": {"en": "Profit from divergence: Avg Absolute Spread − Strike.", "th": "กำไรจากการกระจาย: Average Absolute Spread − Strike"}}, {"color": "purple", "n": {"en": "Lookback Feature", "th": "คุณสมบัติ Lookback"}, "lv": {"en": "3 Months", "th": "3 เดือน"}, "o": {"en": "Daily observation", "th": "สังเกตรายวัน"}, "d": {"en": "Captures the best divergence over the window.", "th": "เก็บค่าการกระจายที่ดีที่สุดในช่วง"}}], "chart": "bar", "formula": {"en": "<b>1. Basket Performance</b> = avg return of 10 stocks = <b>5.70%</b><br><b>2. Individual Spread</b> = each return − Basket (Stock 2: 102% − 5.7% = 96.3%)<br><b>3. Average Absolute Spread</b> = avg of |spreads| = <b>31.24%</b><br><b>4. Investor Return</b> = Avg Abs Spread − Strike = 31.24% − 19.60% = <span class=\"res\">+11.64%</span>", "th": "<b>1. Basket Performance</b> = ผลตอบแทนเฉลี่ย 10 หุ้น = <b>5.70%</b><br><b>2. Individual Spread</b> = ผลตอบแทนแต่ละตัว − Basket (หุ้น 2: 102% − 5.7% = 96.3%)<br><b>3. Average Absolute Spread</b> = เฉลี่ยของ |spread| = <b>31.24%</b><br><b>4. ผลตอบแทนผู้ลงทุน</b> = Avg Abs Spread − Strike = 31.24% − 19.60% = <span class=\"res\">+11.64%</span>"}, "outcomes": [{"num": {"en": "Scenario 1", "th": "กรณีที่ 1"}, "t": {"en": "Avg Abs Spread > Strike", "th": "Avg Abs Spread > Strike"}, "d": {"en": "High dispersion.", "th": "กระจายตัวสูง"}, "cls": "good", "o": {"en": "→ Principal + (Spread − Strike), e.g. +11.64%", "th": "→ เงินต้น + (Spread − Strike) เช่น +11.64%"}}, {"num": {"en": "Scenario 2", "th": "กรณีที่ 2"}, "t": {"en": "Avg Abs Spread ≤ Strike", "th": "Avg Abs Spread ≤ Strike"}, "d": {"en": "Low dispersion.", "th": "กระจายตัวต่ำ"}, "cls": "good", "o": {"en": "→ Principal only (0% extra, protected)", "th": "→ คืนเงินต้นเท่านั้น (0% ส่วนเพิ่ม คุ้มครอง)"}}], "risks_extra": [{"en": "Fully protected, but extra return is conditional on dispersion exceeding the Strike; the most complex structure in the range.", "th": "คุ้มครองเต็ม แต่ผลตอบแทนส่วนเพิ่มมีเงื่อนไขว่าการกระจายต้องเกิน Strike เป็นโครงสร้างที่ซับซ้อนที่สุด"}], "chart_svg": "<svg class=\"pf-svg\" viewBox=\"0 0 700 236\" xmlns=\"http://www.w3.org/2000/svg\" font-family=\"-apple-system,Segoe UI,sans-serif\"><line x1=\"44.0\" y1=\"16\" x2=\"44.0\" y2=\"212\" stroke=\"#EEEEEE\" stroke-width=\"1\"/><text x=\"44.0\" y=\"225\" font-size=\"8.5\" fill=\"#aaa\" text-anchor=\"middle\">0%</text><line x1=\"157.2\" y1=\"16\" x2=\"157.2\" y2=\"212\" stroke=\"#EEEEEE\" stroke-width=\"1\"/><text x=\"157.2\" y=\"225\" font-size=\"8.5\" fill=\"#aaa\" text-anchor=\"middle\">20%</text><line x1=\"270.4\" y1=\"16\" x2=\"270.4\" y2=\"212\" stroke=\"#EEEEEE\" stroke-width=\"1\"/><text x=\"270.4\" y=\"225\" font-size=\"8.5\" fill=\"#aaa\" text-anchor=\"middle\">40%</text><line x1=\"383.6\" y1=\"16\" x2=\"383.6\" y2=\"212\" stroke=\"#EEEEEE\" stroke-width=\"1\"/><text x=\"383.6\" y=\"225\" font-size=\"8.5\" fill=\"#aaa\" text-anchor=\"middle\">60%</text><line x1=\"496.8\" y1=\"16\" x2=\"496.8\" y2=\"212\" stroke=\"#EEEEEE\" stroke-width=\"1\"/><text x=\"496.8\" y=\"225\" font-size=\"8.5\" fill=\"#aaa\" text-anchor=\"middle\">80%</text><line x1=\"610.0\" y1=\"16\" x2=\"610.0\" y2=\"212\" stroke=\"#EEEEEE\" stroke-width=\"1\"/><text x=\"610.0\" y=\"225\" font-size=\"8.5\" fill=\"#aaa\" text-anchor=\"middle\">100%</text><rect x=\"44\" y=\"16.0\" width=\"196.4\" height=\"14.2\" rx=\"1.5\" fill=\"#3D2B9E\"/><text x=\"40\" y=\"26.1\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 1</text><text x=\"244.4\" y=\"26.1\" font-size=\"8.5\" fill=\"#444\">34.7%</text><rect x=\"44\" y=\"36.2\" width=\"545.1\" height=\"14.2\" rx=\"1.5\" fill=\"#3D2B9E\"/><text x=\"40\" y=\"46.3\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 2</text><text x=\"593.1\" y=\"46.3\" font-size=\"8.5\" fill=\"#444\">96.3%</text><rect x=\"44\" y=\"56.4\" width=\"154.5\" height=\"14.2\" rx=\"1.5\" fill=\"#3D2B9E\"/><text x=\"40\" y=\"66.5\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 3</text><text x=\"202.5\" y=\"66.5\" font-size=\"8.5\" fill=\"#444\">27.3%</text><rect x=\"44\" y=\"76.6\" width=\"15.299999999999997\" height=\"14.2\" rx=\"1.5\" fill=\"#C7BEE8\"/><text x=\"40\" y=\"86.7\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 4</text><text x=\"63.3\" y=\"86.7\" font-size=\"8.5\" fill=\"#444\">2.7%</text><rect x=\"44\" y=\"96.8\" width=\"60.599999999999994\" height=\"14.2\" rx=\"1.5\" fill=\"#C7BEE8\"/><text x=\"40\" y=\"106.9\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 5</text><text x=\"108.6\" y=\"106.9\" font-size=\"8.5\" fill=\"#444\">10.7%</text><rect x=\"44\" y=\"117.0\" width=\"134.1\" height=\"14.2\" rx=\"1.5\" fill=\"#3D2B9E\"/><text x=\"40\" y=\"127.1\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 6</text><text x=\"182.1\" y=\"127.1\" font-size=\"8.5\" fill=\"#444\">23.7%</text><rect x=\"44\" y=\"137.2\" width=\"383.2\" height=\"14.2\" rx=\"1.5\" fill=\"#3D2B9E\"/><text x=\"40\" y=\"147.3\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 7</text><text x=\"431.2\" y=\"147.3\" font-size=\"8.5\" fill=\"#444\">67.7%</text><rect x=\"44\" y=\"157.4\" width=\"94.5\" height=\"14.2\" rx=\"1.5\" fill=\"#C7BEE8\"/><text x=\"40\" y=\"167.5\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 8</text><text x=\"142.5\" y=\"167.5\" font-size=\"8.5\" fill=\"#444\">16.7%</text><rect x=\"44\" y=\"177.6\" width=\"148.9\" height=\"14.2\" rx=\"1.5\" fill=\"#3D2B9E\"/><text x=\"40\" y=\"187.7\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 9</text><text x=\"196.9\" y=\"187.7\" font-size=\"8.5\" fill=\"#444\">26.3%</text><rect x=\"44\" y=\"197.8\" width=\"35.7\" height=\"14.2\" rx=\"1.5\" fill=\"#C7BEE8\"/><text x=\"40\" y=\"207.9\" font-size=\"8.5\" fill=\"#555\" text-anchor=\"end\">Stock 10</text><text x=\"83.7\" y=\"207.9\" font-size=\"8.5\" fill=\"#444\">6.3%</text><line x1=\"154.9\" y1=\"14\" x2=\"154.9\" y2=\"214\" stroke=\"#c0574c\" stroke-width=\"1.4\" stroke-dasharray=\"4,3\"/><text x=\"154.9\" y=\"12\" font-size=\"8.5\" fill=\"#b0473c\" text-anchor=\"middle\">Strike 19.6%</text><line x1=\"220.8\" y1=\"14\" x2=\"220.8\" y2=\"214\" stroke=\"#1E6B40\" stroke-width=\"1.4\" stroke-dasharray=\"6,3\"/><text x=\"220.8\" y=\"225\" font-size=\"8.5\" fill=\"#1E6B40\" text-anchor=\"middle\">Avg 31.24%</text><text x=\"327.0\" y=\"234\" font-size=\"9\" fill=\"#888\" text-anchor=\"middle\">Absolute spread of each stock vs. basket average (%)</text></svg>"}};
// Parameter-first variant resolver. Decides from the term-sheet STRUCTURE, not the
// product name (real term sheets mislabel — e.g. "Twinwin Sharkfin" is actually Twin Win).
// Family name is used only as a tiebreaker (Three Musketeers) and as a last-resort fallback.
// Accepts: {family, ko|koBarrier, strike, upperKO, lowerKO, knockIn|ki, settlement,
//           minRedemption, participation|pr, couponBarrier, bonus}
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


/* ==================================================================
   Output 2 — Simplified Factsheet (KH-only, redesigned per Sale team)
   InnovestX purple, reference structure: prominent coupon, 1-line key
   levels (no condition cards), split baskets (no Selling Code), payoff
   (Style A = coupon schedule | Style B = payoff formula), no risk box.
   buildFactsheetKH(product, lang, opts) ; opts.wht (default 15)
================================================================== */
const KH2_CSS = `<style>
.kh2 .product-tag{margin-bottom:10px;font-size:12px;padding:5px 13px}
.kh2 .meta.coupon-hl{background:linear-gradient(180deg,#FFF9EC,#FFF3D6);border:1.5px solid #EBB94D}
.kh2 .meta.coupon-hl .meta-label{color:#9a7d28;font-weight:700}
.kh2 .meta.coupon-hl .meta-value{color:#B8860B;font-size:16px;font-weight:600}
.kh2 .cpa{font-size:10.5px;font-weight:400;margin-left:3px;color:#9a7d28}
/* Reset the legacy .kh nowrap/ellipsis rule — kh2 boxes must wrap, never clip text. */
.kh2 .meta-value{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.25;word-break:break-word}
.kh2 .meta{padding:9px 11px}
.kh2 .meta-label{font-size:9.5px}
.kh2 .meta-value,.kh2 .meta-value.sm{font-size:16px;font-weight:500}
.kh2 .meta-grid{gap:6px;margin-bottom:7px}
.kh2 .sec-num{font-size:13.5px;margin:13px 0 7px;padding-bottom:5px}
.kh2 .sec-num .badge{width:22px;height:22px;font-size:12px}
.kh2 .bk2{font-size:12px}
.kh2 .bk2 th{font-size:10.5px;padding:8px 9px}
.kh2 .bk2 td{padding:9px 9px}
.kh2 .bk2 .snm{font-size:12px}.kh2 .bk2 .stk{font-size:9.5px}
.kh2 .bk2 .bsep td{font-size:11px;padding:6px 9px}
.kh2 .sch2{font-size:12px}
.kh2 .sch2 th{font-size:10.5px;padding:8px 9px}
.kh2 .sch2 td{padding:7px 9px;font-size:12px}
.kh2 .kv-line{font-size:12px;padding:10px 14px;margin-top:9px}
.kh2 .calc-line{font-size:12px;padding:10px 14px;margin-top:9px}
/* content-light products — distribute vertically to fill A4 via SPACING ONLY.
   Font sizes stay identical to base so text is uniform across all 26 products. */
.kh2-fill-md .sec-num{margin:20px 0 11px}
.kh2-fill-md .bk2 td,.kh2-fill-md .sch2 td{padding:13px 10px}
.kh2-fill-md .bk2 th,.kh2-fill-md .sch2 th{padding:10px 10px}
.kh2-fill-md .kv-line,.kh2-fill-md .calc-line{padding:12px 15px}
.kh2-fill-lg .meta{padding:14px 14px}
.kh2-fill-lg .meta-grid{margin-bottom:12px}
.kh2-fill-lg .sec-num{margin:24px 0 12px}
.kh2-fill-lg .bk2 td,.kh2-fill-lg .sch2 td{padding:15px 11px}
.kh2-fill-lg .bk2 th,.kh2-fill-lg .sch2 th{padding:11px 11px}
.kh2-fill-lg .kv-line,.kh2-fill-lg .calc-line{padding:12px 16px;margin-top:12px}
.sec-num{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:#3D2B9E;margin:14px 0 7px;padding-bottom:5px;border-bottom:2px solid #3D2B9E}
.sec-num .badge{background:#3D2B9E;color:#fff;width:22px;height:22px;border-radius:5px;display:inline-flex;align-items:center;justify-content:center;font-size:12px;flex-shrink:0}
.kv-line{background:#F4F8FF;border:1px solid #C9DCF5;border-radius:7px;padding:9px 14px;font-size:12px;color:#1a3a5c;margin-top:9px}
.kv-line b{color:#3D2B9E}
.calc-line{background:#F4F3FB;border:1px solid #E2E0F0;border-radius:7px;padding:9px 14px;font-size:11.5px;color:#333;margin-top:9px}
.calc-line b{color:#3D2B9E}
.bk2{width:100%;border-collapse:collapse;font-size:11px;margin-top:2px}
.bk2 thead tr{background:#3D2B9E}
.bk2 th{color:#fff;padding:7px 9px;font-weight:500;font-size:10px;text-align:center}
.bk2 th:first-child{text-align:left}
.bk2 .bsep td{background:#EDE8FC;color:#3D2B9E;font-weight:700;font-size:10.5px;padding:5px 9px;letter-spacing:.3px}
.bk2 td{padding:8px 9px;border-bottom:0.5px solid #EBEBEB;text-align:center;color:#1a1a1a}
.bk2 td:first-child{text-align:left}
.bk2 .snm{font-weight:600;font-size:11px}.bk2 .stk{font-size:9px;color:#666;display:block}
.bk2 .koc{background:#D7F0E3;color:#0F5E3C;font-weight:700}
.bk2 .kic{background:#FAD9D3;color:#7A2018;font-weight:700}
.bk2 .stc{background:#ECE7E1;color:#5b4a37;font-weight:700}
.bk2 .ycl{background:#FFF3D6;color:#B8860B;font-weight:700}
.bk2 td.vmid{vertical-align:middle}
.sch2{width:100%;border-collapse:collapse;font-size:11px;margin-top:2px}
.sch2 thead tr{background:#EDEBFB}
.sch2 th{color:#3D2B9E;padding:6px 9px;font-weight:600;font-size:10px;text-align:center}
.sch2 td{padding:6px 9px;border-bottom:0.5px solid #F0F0F0;text-align:center;font-size:11px;color:#333}
.sch2 .per{font-weight:600;color:#3D2B9E}
.sch2 .amt{color:#1E6B40;font-weight:700}
.sch2 tr.div td{background:#EDEBFB;color:#3D2B9E;font-weight:700;font-size:10.5px;text-align:left;padding:6px 9px}
.sch2 tr.nc td{background:#EFF7F2}
.sch2 td.mk{font-size:9px;color:#3D2B9E;font-weight:600;text-align:left}
.kh2 .sch2 tr.div td{font-size:12px}
.kh2 .sch2 td.mk{font-size:10.5px}
.payoff-box{border:1px solid #D0C8F0;border-radius:8px;padding:12px 15px;margin-top:2px;background:#FBFAFF}
.payoff-box .pf-rule{font-size:12px;color:#333;line-height:1.7;margin-bottom:3px}
.payoff-box .pf-rule b{color:#3D2B9E}
.pf-ex{width:100%;border-collapse:collapse;font-size:11px;margin-top:9px}
.pf-ex th{background:#EDEBFB;color:#3D2B9E;padding:6px 9px;font-size:10px;text-align:left;font-weight:600}
.pf-ex td{padding:6px 9px;border-bottom:0.5px solid #F0F0F0;color:#333}
.pf-ex td:last-child{text-align:right;font-weight:700;color:#1E6B40}
.illus-tag{display:inline-block;font-size:9px;color:#9a7d28;background:#FFF9EC;border:0.5px solid #E6D596;border-radius:3px;padding:1px 7px;margin-left:8px;font-weight:600}
.cond-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:2px}
.cond-card{border-radius:8px;padding:12px 13px;border:1px solid #e5e2ef;border-top-width:3px;background:#FBFAFC}
.cond-card.cc-green{border-top-color:#1E6B40;background:#F3FBF6}
.cond-card.cc-green .cc-name{color:#1E6B40}
.cond-card.cc-gray{border-top-color:#6b6255;background:#F7F5F1}
.cond-card.cc-gray .cc-name{color:#5b4a37}
.cond-card.cc-purple{border-top-color:#3D2B9E;background:#F8F7FC}
.cond-card.cc-purple .cc-name{color:#3D2B9E}
.cc-name{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.2px}
.cc-val{font-size:14px;font-weight:700;color:#1a1a1a;margin-top:4px}
.cc-sub{font-size:9px;color:#888;margin-top:1px}
.cc-desc{font-size:10px;color:#333;line-height:1.45;margin-top:6px}
.ul-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:2px}
.ul-item{background:#F4F3FB;border:1px solid #E2E0F0;border-radius:6px;padding:9px 6px;text-align:center;font-size:11px;font-weight:600;color:#3D2B9E}
.kh2-fill-lg .ul-item{padding:12px 8px}
.kh2-fill-md .ul-item{padding:10px 7px}
</style>`;

// Which products pay a per-period coupon (Style A) vs lump-sum at maturity (Style B).
const KH2_STYLE_A = ['kiko','fcn','fixed_rate_note'];
// Lump-sum-at-maturity/event products — rendered with 3 Key Condition cards
// (like the old KH) instead of Style A's 1-line key-levels + coupon schedule.
const KH2_STYLE_B = ['twin_win','bullish_sharkfin','bearish_sharkfin','three_musketeers','lookback_dispersion',
  'booster','booster_prot','ben','ben_cash','ben_prot'];

function _num(v){ if(v==null) return null; const m=String(v).replace(/[, ]/g,'').match(/-?\d+(\.\d+)?/); return m?parseFloat(m[0]):null; }

function _headerKH2(p,lang){
  const subdate=(p.subdate&&p.subdate[lang])||'';
  const sub=(subdate?subdate+' &nbsp;|&nbsp; ':'')+LABELS.sub[lang];
  const title=`${(p.title_full&&p.title_full[lang])||p.title[lang]}<br><span style="font-weight:500">${lang==='en'?'Investor Summary — Key Highlight':'สรุปผู้ลงทุน — ฉบับย่อ'}</span>`;
  return `<div class="header"><div>${LOGO}</div><div class="doc-title"><h1>${title}</h1><p>${sub}</p></div></div>`;
}

// BEN With Protection carries a Bonus column in its KH2 basket (added for the KH
// factsheet only via kh2_basket, so the legacy build() basket stays untouched).
REGISTRY.ben_prot.kh2_basket={
  cols_en:["Stock","Initial","Strike","Coupon Barrier","Bonus","Min. Redemption"],
  cols_th:["หลักทรัพย์","ราคาเริ่มต้น","Strike","Coupon Barrier","Bonus","ไถ่ถอนขั้นต่ำ"],
  groups:[[null,[
    ["AAA","Illustrative underlying","100%","100%","100%","20% flat","90%"],
    ["BBB","Illustrative underlying","100%","100%","100%","20% flat",""]
  ]]],
  ki_cols:[2], ko_cols:[]
};

// 1-line key levels from the product's condition data (no condition cards).
function _keyLevels(p,lang){
  const lbl=lang==='en'?'Key levels':'ระดับสำคัญ';
  const all=p.conds.concat(p.kh2_conds_extra||[]);
  const parts=all.map(c=>`<b>${c.n[lang]}</b> = ${c.lv[lang]}`);
  return `<div class="kv-line">${lbl}: ${parts.join(' &nbsp;·&nbsp; ')}</div>`;
}

// Basket table — official term-sheet layout: split baskets, computed % Level
// columns for Strike (gray) / Knock-Out (green) / Knock-In (red), no Selling Code.
function _basketKH2(bk,lang){
  // identify each data column's role from the English headers (row.slice(2) aligns with cols[1..])
  const cE=bk.cols_en; const role={};
  for(let i=1;i<cE.length;i++){ const c=cE[i].toLowerCase(), si=i-1;
    if(/spot/.test(c)) role.spot=si;
    else if(/strike/.test(c)) role.strike=si;
    else if(/knock-out/.test(c)) role.ko=si;
    else if(/knock-in level/.test(c)) role.kilvl=si;
    else if(/knock-in/.test(c)) role.ki=si;
    else if(/shares/.test(c)) role.shares=si; }
  const pct=(thb,spot)=>{const t=_num(thb),s=_num(spot); return (t!=null&&s)?(t/s*100).toFixed(2)+'%':'';};
  const heads=lang==='en'
    ? ['Stock','Spot (THB)','Strike (%)','Strike (THB)','KO (%)','KO (THB)','KI (%)','KI (THB)','Shares for Delivery']
    : ['หลักทรัพย์','Spot (บาท)','Strike (%)','Strike (บาท)','KO (%)','KO (บาท)','KI (%)','KI (บาท)','จำนวนหุ้นส่งมอบ'];
  const nCols=heads.length;
  let h=`<table class="bk2"><thead><tr>`+heads.map(c=>`<th>${c}</th>`).join('')+`</tr></thead><tbody>`;
  for(const g of bk.groups){
    const gname=g[0], rows=g[1];
    if(gname) h+=`<tr class="bsep"><td colspan="${nCols}">${gname}</td></tr>`;
    for(const row of rows){
      let ticker=row[1]; if(ticker==='Illustrative underlying') ticker=lang==='th'?'หลักทรัพย์สมมติ':'Illustrative underlying';
      const v=row.slice(2);
      const spot=role.spot!=null?v[role.spot]:'', strike=role.strike!=null?v[role.strike]:'',
            ko=role.ko!=null?v[role.ko]:'', kilvl=role.kilvl!=null?v[role.kilvl]:'',
            ki=role.ki!=null?v[role.ki]:'', shares=role.shares!=null?v[role.shares]:'';
      h+=`<tr>`
        +`<td><span class="snm">${row[0]}</span><span class="stk">${ticker}</span></td>`
        +`<td>${spot}</td>`
        +`<td class="stc">${pct(strike,spot)}</td><td>${strike}</td>`
        +`<td class="koc">${pct(ko,spot)}</td><td class="koc">${ko}</td>`
        +`<td class="kic">${kilvl}</td><td class="kic">${ki}</td>`
        +`<td>${shares}</td></tr>`;
    }
  }
  return h+`</tbody></table>`;
}

// FRN detailed coupon schedule — quarterly detail through the step-down transition year,
// annual summary after. Columns: Year | Coupon Date | Coupon | Cumulative | Note.
function _frnScheduleKH2(p,lang){
  const L=(en,th)=>lang==='en'?en:th;
  const nonCallM=(p.metrics.find(x=>/non-call/i.test(x.l.en))||{}).v||'';
  const nonCallYrs=_num((nonCallM.match(/\/\s*(\d+)\s*Y/i)||[])[1])||1;
  const totalYrs=p.coupon_kh.length;
  const quarterly=/quarter/i.test(JSON.stringify(p.metrics))||/quarter/i.test(JSON.stringify(p.conds));
  const detailYrs=Math.min(nonCallYrs+1, totalYrs);
  const rateAt=y=>_num(p.coupon_kh[y-1][1]);
  const stepsDown = detailYrs<totalYrs && rateAt(detailYrs)!==rateAt(detailYrs+1);

  const heads=lang==='en'?['Year','Coupon Date','Coupon','Cumulative','Note']:['ปีที่','วันจ่ายดอกเบี้ย','ดอกเบี้ย','สะสม','หมายเหตุ'];
  let h=`<table class="sch2"><thead><tr>`+heads.map(c=>`<th>${c}</th>`).join('')+`</tr></thead><tbody>`;

  if(quarterly && detailYrs>=1){
    const rateLabel=lang==='en'?`Years 1–${detailYrs} — paid quarterly (Year ${nonCallYrs} shaded = Non-Callable, guaranteed)`
      :`ปีที่ 1–${detailYrs} — จ่ายรายไตรมาส (ปีที่ ${nonCallYrs} แรเงา = ห้ามไถ่ถอนก่อนกำหนด รับประกันจ่าย)`;
    h+=`<tr class="div"><td colspan="5">${rateLabel}</td></tr>`;
    let cum=0;
    for(let y=1;y<=detailYrs;y++){
      const ann=rateAt(y); const q=ann!=null?ann/4:null;
      for(let qi=1;qi<=4;qi++){
        cum+=q||0;
        const isLastQOfYear=qi===4;
        let note='';
        if(y===nonCallYrs && isLastQOfYear) note=L('◆ Non-Callable ends — callable from here','◆ สิ้นสุดช่วงห้ามไถ่ถอน — ไถ่ถอนก่อนกำหนดได้ตั้งแต่นี้');
        else if(y===detailYrs && isLastQOfYear && stepsDown) note=L(`Coupon steps down after Year ${detailYrs}`,`ดอกเบี้ยลดลงหลังปีที่ ${detailYrs}`);
        const nc = y<=nonCallYrs ? ' nc' : '';
        h+=`<tr class="${nc}"><td class="per">${y}</td><td>Month ${(y-1)*12+qi*3}</td><td class="amt">${q!=null?q.toFixed(3)+'%':''}</td><td>${cum.toFixed(2)}%</td><td class="mk">${note}</td></tr>`;
      }
    }
  }
  if(detailYrs<totalYrs){
    const postRate=rateAt(detailYrs+1);
    const rateLabel=lang==='en'
      ?`Years ${detailYrs+1}–${totalYrs} — after step-down, ${postRate.toFixed(2)}% p.a. (${(postRate/4).toFixed(3)}% per quarter), shown per year`
      :`ปีที่ ${detailYrs+1}–${totalYrs} — หลังลดอัตรา ${postRate.toFixed(2)}% ต่อปี (${(postRate/4).toFixed(3)}% ต่อไตรมาส) แสดงรายปี`;
    h+=`<tr class="div"><td colspan="5">${rateLabel}</td></tr>`;
    for(let y=detailYrs+1;y<=totalYrs;y++){
      const [,cp,cum]=p.coupon_kh[y-1];
      const isTransition=(y===detailYrs+1);
      const isLast=(y===totalYrs);
      const label=isTransition ? `${L('Yr','ปี')} ${y} · 4 × ${(postRate/4).toFixed(3)}%` : `${L('Year','ปี')} ${y}`;
      let note='';
      if(isTransition) note=L(`▼ Step-down to ${cp} p.a.`,`▼ ลดอัตราเหลือ ${cp} ต่อปี`);
      if(isLast) note=L('Maturity — principal returned','ครบกำหนด — คืนเงินต้น');
      h+=`<tr><td class="per">${y}</td><td>${label}</td><td class="amt">${cp}</td><td>${cum}</td><td class="mk">${note}</td></tr>`;
    }
  }
  h+='</tbody></table>';
  const finalCum=p.coupon_kh[totalYrs-1][2];
  const cap=lang==='en'
    ?`Coupons are paid quarterly for the full ${totalYrs}-year tenor. Years 1–${detailYrs} are shown per quarter to highlight the Non-Callable period${stepsDown?' and the step-down':''}; Years ${detailYrs+1}–${totalYrs} are summarised per year. Cumulative coupon at maturity (if never called) = ${finalCum}. Indicative rates as of the Sale Kit example date; actual rates are fixed on the trade date.`
    :`ดอกเบี้ยจ่ายรายไตรมาสตลอดอายุ ${totalYrs} ปี โดยปีที่ 1–${detailYrs} แสดงรายไตรมาสเพื่อให้เห็นช่วงห้ามไถ่ถอนก่อนกำหนด${stepsDown?'และจุดที่ดอกเบี้ยลดลง':''} ส่วนปีที่ ${detailYrs+1}–${totalYrs} สรุปเป็นรายปี ดอกเบี้ยสะสมเมื่อครบกำหนด (หากไม่ถูกไถ่ถอนก่อน) = ${finalCum} อัตราที่แสดงเป็นตัวอย่างอ้างอิงจาก Sale Kit ณ วันที่ตัวอย่าง อัตราจริงกำหนด ณ วันทำรายการ`;
  return h+`<div class="cap">${cap}</div>`;
}

// Generic basket table (non-Spot%-based products like FCN) — render columns as-is,
// coloring cells green (koc) / red (kic). Prefer the registry's ko_cols / ki_cols column
// indices (legacy build() convention, so highlights match "แบบเดิม"); fall back to the
// column header name for baskets that spell out "Knock-Out" / "Knock-In" (e.g. FCN).
// opts.strikeGray — render the Strike column (ki_cols) with KIKO's beige highlight (stc)
//   instead of red (kic). opts.dropKo — suppress the green (koc) highlights entirely.
// Whole-basket values (present only in the first underlying's row, blank below) are
// merged into one vertically-centered rowspan cell so they sit between the underlyings.
function _basketGeneric(bk,lang,opts={}){
  const colsEn=bk.cols_en, cols=lang==='th'?bk.cols_th:bk.cols_en; const nCols=cols.length;
  const ko=new Set(opts.dropKo?[]:(bk.ko_cols||[])), ki=new Set(bk.ki_cols||[]);
  // data cell i (0-based) is column index j = i+1 (col 0 is the stock name)
  const cls=i=>{ const j=i+1;
    if(opts.yellowHeader && colsEn[j]===opts.yellowHeader) return 'ycl';
    if(ki.has(j)) return opts.strikeGray?'stc':'kic';
    if(ko.has(j)) return 'koc';
    const t=(colsEn[j]||'').toLowerCase();
    if(!opts.dropKo && /knock-out/.test(t)) return 'koc'; if(/knock-in/.test(t)) return 'kic';
    return ''; };
  const val=v=>(v==null?'':String(v)).trim();
  let h=`<table class="bk2"><thead><tr>`+cols.map(c=>`<th>${c}</th>`).join('')+`</tr></thead><tbody>`;
  for(const g of bk.groups){
    const gname=g[0], rows=g[1];
    if(gname && bk.groups.length>1) h+=`<tr class="bsep"><td colspan="${nCols}">${gname}</td></tr>`;
    // whole-basket columns: value only in the first row, blank in the rest → one centered rowspan cell
    const span={};
    if(rows.length>1) for(let i=0;i<nCols-1;i++){
      if(val(rows[0][i+2]) && rows.slice(1).every(r=>!val(r[i+2]))) span[i]=rows.length;
    }
    rows.forEach((row,ri)=>{
      let ticker=row[1]; if(ticker==='Illustrative underlying') ticker=lang==='th'?'หลักทรัพย์สมมติ':'Illustrative underlying';
      let tds=`<td><span class="snm">${row[0]}</span>`+(ticker&&ticker!==row[0]?`<span class="stk">${ticker}</span>`:'')+`</td>`;
      for(let i=0;i<nCols-1;i++){
        if(span[i]){ if(ri===0) tds+=`<td class="${cls(i)} vmid" rowspan="${span[i]}">${val(row[i+2])}</td>`; }
        else tds+=`<td class="${cls(i)}">${row[i+2]!=null?row[i+2]:''}</td>`;
      }
      h+=`<tr>${tds}</tr>`;
    });
  }
  return h+`</tbody></table>`;
}

// Style B — 3 Key Condition cards from the product's condition data (color/name/value/subtitle/description).
function _condCards(p,lang){
  const cards=p.conds.map(c=>`<div class="cond-card cc-${c.color}">`
    +`<div class="cc-name">${c.n[lang]}</div>`
    +`<div class="cc-val">${c.lv[lang]}</div>`
    +`<div class="cc-sub">${c.o[lang]}</div>`
    +`<div class="cc-desc">${c.d[lang]}</div>`
    +`</div>`).join('');
  return `<div class="cond-cards">${cards}</div>`;
}

// Style B — underlying stock names only (Lookback Dispersion), no spread/payoff figures.
function _underlyingNames(p,lang){
  const names=Array.from(p.chart_svg.matchAll(/text-anchor="end">([^<]+)</g)).map(m=>m[1]);
  return `<div class="ul-grid">`+names.map(n=>`<div class="ul-item">${n}</div>`).join('')+`</div>`;
}

export function buildFactsheetKH(pk, lang, opts={}){
  // pk may be a REGISTRY key (curated Sale-Kit example) OR a data object built from a
  // real term sheet — same shape as a REGISTRY entry, carrying a `_type` field (the
  // product key) used only for the layout gates below. No value is invented here.
  const p = (pk && typeof pk === 'object') ? pk : REGISTRY[pk];
  if(!p) throw new Error('unknown product '+(pk && pk._type || pk));
  if(pk && typeof pk === 'object') pk = pk._type || '';   // downstream gates use the type key
  const wht=opts.wht!=null?opts.wht:15;
  const L=(en,th)=>lang==='en'?en:th;
  // content-light products (few rows) get enlarged to fill the A4 page
  const basketRows = p.basket ? p.basket.groups.reduce((n,g)=>n+g[1].length+(g[0]?1:0),0) : 0;
  const schedRowsPre = p.schedule ? (p.schedule.rows || (p.schedule.rows_lang && p.schedule.rows_lang[lang]) || []).length : (p.coupon_kh?p.coupon_kh.length:0);
  const contentRows = basketRows + schedRowsPre;
  const fillClass = contentRows<=4 ? ' kh2-fill-lg' : (contentRows<=7 ? ' kh2-fill-md' : '');
  let s=[CSS, KH2_CSS, `<div class="page kh kh2${fillClass}">`];
  s.push(_headerKH2(p,lang));
  s.push(`<div class="product-tag">${p.tag[lang]}</div>`);
  // Compliance flags carried from a real deal (e.g. "Reverse Solicit") — must stay visible,
  // never silently dropped, since they carry real regulatory meaning from the source.
  if(p._dealNotes && p._dealNotes.length){
    s.push(`<div class="calc-line" style="border-color:#E0B0A8;background:#FFF5F3;color:#7A2018">${p._dealNotes.map(n=>n[lang]).join(' &nbsp;·&nbsp; ')}</div>`);
  }

  // --- metrics grid (Coupon box highlighted) + dates grid ---
  // Highlight the first metric box — by registry convention it's always the headline
  // number (coupon / max upside / participation rate / strike), so this stays consistent
  // across every product instead of relying on a label-text match.
  const couponMetric = p.metrics[0];
  const notional = (p.metrics.find(x=>/subscription|notional/i.test(x.l.en))||{}).v || '';
  const netIntMetric = p.metrics.find(x=>/net interest/i.test(x.l.en));
  s.push('<div class="meta-grid">'+p.metrics.map(x=>{
    const isC=(x===couponMetric);
    const val=isC ? x.v.replace(/\s*(p\.a\.?)\s*$/i,'<span class="cpa">$1</span>') : x.v;
    return `<div class="meta${isC?' coupon-hl':''}"><div class="meta-label">${x.l[lang]}</div><div class="meta-value ${isC?'':x.c}">${val}</div></div>`;
  }).join('')+'</div>');
  if(p.dates){
    s.push('<div class="meta-grid" style="margin-bottom:0">'+p.dates.map(([de,dt,v])=>`<div class="meta"><div class="meta-label">${lang==='en'?de:dt}</div><div class="meta-value sm">${v}</div></div>`).join('')+'</div>');
  }

  let sec=0;
  // --- Basket (official KO/KI layout, or generic) — kh2_basket overrides the shared basket ---
  const basketData = p.kh2_basket || p.basket;
  // Real term-sheet deals (_realDeal) always use the 3-card Key Conditions layout.
  const isStyleB = KH2_STYLE_B.includes(pk) || !!p._realDeal;
  // These lump-sum products (and all real deals) read better with Key Conditions before the basket.
  const condsBeforeBasket = !!p._realDeal || ['twin_win','bullish_sharkfin','bearish_sharkfin','three_musketeers',
    'booster','booster_prot','ben','ben_cash','ben_prot'].includes(pk);

  // BEN & Booster families: Strike in KIKO's beige, no green highlights.
  // Sharkfins: Strike in KIKO's beige, keep the green KO Level highlight.
  const strikeKiko=['ben','ben_cash','ben_prot','booster','booster_prot','bullish_sharkfin','bearish_sharkfin'].includes(pk);
  const dropKo=['ben','ben_cash','ben_prot','booster','booster_prot'].includes(pk);
  // The "return" column gets the same soft-yellow highlight as the headline metric box.
  const yellowHeader={ben:'Bonus',ben_cash:'Bonus',ben_prot:'Bonus',booster:'Participation',booster_prot:'Participation',
    bullish_sharkfin:'KO Rebate',bearish_sharkfin:'KO Rebate',twin_win:'Min Coupon',three_musketeers:'Coupon'}[pk];
  const pushBasket=()=>{
    if(!basketData) return;
    sec++;
    s.push(`<div class="sec-num"><span class="badge">${sec}</span>${L('Basket Securities','หลักทรัพย์อ้างอิงในตะกร้า')}</div>`);
    const hasSpotBased=/spot/i.test(basketData.cols_en.join(' '));
    s.push(hasSpotBased ? _basketKH2(basketData,lang) : _basketGeneric(basketData,lang,{strikeGray:strikeKiko,dropKo,yellowHeader}));
    // Sharkfin payoff note — clarifies the two different numbers (participation cap vs KO rebate).
    if((pk==='bullish_sharkfin' || pk==='bearish_sharkfin') && !p._realDeal){
      const ce=basketData.cols_en, r0=basketData.groups[0][1][0];
      const get=n=>{ const j=ce.indexOf(n); return j>=0 ? r0[j+1] : ''; };
      const ko=get('KO Level'), reb=get('KO Rebate'), cap=(p.metrics[0]||{}).v||'';
      const dir=pk==='bullish_sharkfin' ? L('rises but never touches','ขึ้นแต่ไม่เคยแตะ') : L('falls but never touches','ลงแต่ไม่เคยแตะ');
      const dirNo=pk==='bullish_sharkfin' ? L("doesn't rise",'ไม่ขึ้น') : L("doesn't fall",'ไม่ลง');
      const note=L(
        `<b>How the payoff works:</b> if the underlying ${dir} the KO Level (${ko}) → Participation pays up to <b>${cap}</b>. If it ever touches ${ko} (Knock-Out) → you receive a <b>${reb}</b> KO Rebate instead. If it ${dirNo} → principal is returned in full (100%).`,
        `<b>วิธีคิดผลตอบแทน:</b> ถ้าราคา${dir} KO Level (${ko}) → รับ Participation สูงสุด <b>${cap}</b> · ถ้าเคยแตะ ${ko} (Knock-Out) → รับ <b>KO Rebate ${reb}</b> แทน · ถ้าราคา${dirNo} → คืนเงินต้นเต็ม 100%`);
      s.push(`<div class="calc-line">${note}</div>`);
    }
    // Data-object payoff note (e.g. real KIKO deals) — bilingual {en,th} carried on the data.
    if(p._payoffNote) s.push(`<div class="calc-line">${p._payoffNote[lang]}</div>`);
  };
  const pushCondsOrLevels=()=>{
    if(isStyleB){
      sec++;
      s.push(`<div class="sec-num"><span class="badge">${sec}</span>${L('Key Conditions','เงื่อนไขสำคัญ')}</div>`);
      s.push(_condCards(p,lang));
    } else {
      // key levels (1 line) — replaces the condition cards
      s.push(_keyLevels(p,lang));
    }
  };
  if(condsBeforeBasket){ pushCondsOrLevels(); pushBasket(); }
  else { pushBasket(); pushCondsOrLevels(); }

  // --- Returns: coupon schedule (rows / rows_lang) or FRN year-coupon table ---
  // Gated to the reviewed Style-A products only — other products may carry legacy
  // `schedule`/`coupon_kh` data from the old system that hasn't been redesigned yet.
  const isStyleADone = KH2_STYLE_A.includes(pk);
  const schedRows = (isStyleADone && p.schedule) ? (p.schedule.rows || (p.schedule.rows_lang && p.schedule.rows_lang[lang]) || []) : [];
  if(schedRows.length){
    sec++;
    s.push(`<div class="sec-num"><span class="badge">${sec}</span>${p.schedule.head[lang]}</div>`);
    const cols=p.schedule.cols[lang];
    let h=`<table class="sch2"><thead><tr>`+cols.map(c=>`<th>${c}</th>`).join('')+`</tr></thead><tbody>`;
    for(const r of schedRows){ h+='<tr>'+r.map((v,i)=>`<td class="${i===0?'per':(i===r.length-1?'amt':'')}">${v}</td>`).join('')+'</tr>'; }
    s.push(h+'</tbody></table>');
    // Calculated-schedule caveat (real deals only — e.g. dates derived from Issue Date
    // + stated observation frequency rather than taken verbatim from the term sheet).
    if(p._scheduleNote) s.push(`<div class="calc-line">${p._scheduleNote[lang]}</div>`);
    if(netIntMetric){
      const notN=_num(notional), coupN=couponMetric?_num(couponMetric.v):null;
      if(notN!=null && coupN!=null){
        const net=notN*coupN/100/12*(1-wht/100);
        s.push(`<div class="calc-line"><b>${L('Calculation','วิธีคำนวณ')}:</b> THB ${notN.toLocaleString('en-US')} × ${coupN.toFixed(1)}% / 12 × (1 − ${wht}% WHT) = <b>THB ${net.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}</b> ${L('per month','ต่อเดือน')}</div>`);
      }
    }
  } else if(isStyleADone && p.coupon_kh && p.coupon_kh.length){
    sec++;
    s.push(`<div class="sec-num"><span class="badge">${sec}</span>${L('Coupon Schedule','ตารางการจ่ายดอกเบี้ย')}</div>`);
    s.push(_frnScheduleKH2(p,lang));
  } else if(pk==='lookback_dispersion' && p.chart_svg){
    // Stock names only — no spread/payoff figures, not a calculation.
    sec++;
    s.push(`<div class="sec-num"><span class="badge">${sec}</span>${L('Underlying Stocks','หลักทรัพย์อ้างอิง')}</div>`);
    s.push(_underlyingNames(p,lang));
  }
  s.push(`<div class="footer" style="position:absolute;left:38px;right:38px;bottom:10px"><div class="footer-text">${LABELS.foot[lang]}</div><div class="footer-right"><div style="font-weight:600;color:#3D2B9E">InnovestX Securities Co., Ltd.</div><div style="color:#bbb;font-size:8.5px">A Subsidiary of SCBX Group</div></div></div>`);
  return s.join('')+'</div>';
}

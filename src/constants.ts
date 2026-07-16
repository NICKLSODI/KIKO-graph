// Option sets ported from memie's copilot_demo_PHASE1_FINAL.jsx.

export const RELATIONSHIP_OPTIONS = [
  'ลูกค้าใหม่ภายใต้การดูแล (Newly Onboarded)',
  'ผู้ถือครองพอร์ตการลงทุนปัจจุบัน (Active Portfolio)',
  'พอร์ตการลงทุนใกล้ครบกำหนดไถ่ถอน (Approaching Maturity)',
]
export const AGE_OPTIONS = ['18-30 ปี', '31-45 ปี', '46-60 ปี', '60 ปีขึ้นไป']
export const KNOWLEDGE_OPTIONS = ['ระดับพื้นฐาน', 'ระดับปานกลาง', 'ระดับสูง / ผู้ประกอบวิชาชีพทางการเงิน']
export const GOAL_OPTIONS = [
  'การรักษาเงินต้น',
  'การสร้างรายได้อย่างสม่ำเสมอ',
  'การเติบโตของเงินลงทุนในระยะยาว',
  'การกระจายความเสี่ยงของพอร์ตการลงทุน',
]
export const RISK_OPTIONS = [
  'ระดับความเสี่ยงต่ำ (Conservative)',
  'ระดับความเสี่ยงปานกลาง (Moderate)',
  'ระดับความเสี่ยงสูง (Aggressive)',
]
export const EXPERIENCE_OPTIONS = [
  { value: 'experienced', label: 'มีประสบการณ์ในสินทรัพย์ประเภทนี้ (Existing Holder)' },
  { value: 'new_to_product', label: 'ไม่มีประสบการณ์ในสินทรัพย์ประเภทนี้ (ระบุขั้นตอนสรุปข้อมูลผลิตภัณฑ์)' },
  { value: 'new_to_investing', label: 'ไม่มีประสบการณ์การลงทุน (ระบุขั้นตอนปูพื้นฐานความรู้)' },
]
export const ASSET_OPTIONS = [
  { value: 'under_8m', label: 'มูลค่าต่ำกว่า 8 ล้านบาท (กลุ่มลูกค้าทั่วไป : Retail)' },
  { value: 'over_8m', label: 'มูลค่าตั้งแต่ 8 ล้านบาทขึ้นไป (กลุ่มลูกค้ารายใหญ่/รายใหญ่พิเศษ : High Net Worth / Ultra HNW)' },
]
export const CONCERN_OPTIONS = [
  'ความเสี่ยงต่อการสูญเสียเงินต้น',
  'ข้อจำกัดด้านสภาพคล่องทางการเงิน',
  'ข้อจำกัดในการทำความเข้าใจเงื่อนไขโครงสร้างซับซ้อน (Knock-In/Knock-Out)',
  'การเปรียบเทียบอัตราผลตอบแทนกับสินทรัพย์มั่นคงสูง',
  'ข้อพิจารณาด้านโครงสร้างค่าธรรมเนียม',
]
export const TONE_OPTIONS = [
  'เป็นทางการเชิงวิชาชีพ (Professional)',
  'เป็นกันเองอบอุ่น (Friendly)',
  'เข้าใจง่ายที่สุด (Plain Language)',
  'ภาษาเชิงเกียรติยศสำหรับลูกค้าพิเศษ (Premium)',
]
export const FOCUS_OPTIONS = [
  'จุดเด่นและคุณประโยชน์ของผลิตภัณฑ์',
  'โครงสร้างค่าธรรมเนียม',
  'เงื่อนไขโครงสร้างผลิตภัณฑ์ (Knock-In / Knock-Out)',
  'ปัจจัยความเสี่ยงที่มีสาระสำคัญ',
  'การเปรียบเทียบกับทางเลือกการลงทุนอื่น',
]

// Script-generation flow steps (dashboard → persona → config → results) — shared by
// every wizard screen so the stepper reads identically across the flow.
export const FLOW_STEPS = ['เลือกผลิตภัณฑ์', 'โปรไฟล์ลูกค้า', 'ตั้งค่า Output', 'ผลลัพธ์']

// Script sub-formats (memie's OUTPUT_TYPES minus factsheet — factsheet is now a top-level category).
export type ScriptFormatKey = 'callScript' | 'lineMessage' | 'email' | 'faq' | 'rolePlay'
export const SCRIPT_FORMATS: { key: ScriptFormatKey; label: string; desc: string }[] = [
  { key: 'callScript', label: 'Call Script', desc: 'บทสนทนาสำหรับใช้สื่อสารกับลูกค้าทางโทรศัพท์โดยสมบูรณ์' },
  { key: 'lineMessage', label: 'LINE Message', desc: 'ข้อความโดยย่อสำหรับการสื่อสารผ่านช่องทางแอปพลิเคชัน (LINE)' },
  { key: 'email', label: 'Email', desc: 'เนื้อหาจดหมายอิเล็กทรอนิกส์ในรูปแบบที่เป็นทางการ' },
  { key: 'faq', label: 'FAQ', desc: 'ชุดคำถามที่พบบ่อยพร้อมคำตอบโดยสรุป' },
  { key: 'rolePlay', label: 'Role-play', desc: 'บทสนทนาจำลองสำหรับการฝึกฝนทักษะการตอบข้อโต้แย้ง' },
]

export const DURATION_OPTIONS = [
  { label: '5 นาที (สั้นกระชับ)', minutes: 5, words: 300 },
  { label: '10 นาที (มาตรฐาน)', minutes: 10, words: 700 },
]

// Top-level output categories (the user's 3-way choice after dropping info).
export type OutputCategory = 'script' | 'factsheet' | 'graph'
export const OUTPUT_CATEGORIES: { key: OutputCategory; label: string; desc: string; icon: string }[] = [
  { key: 'script', label: 'Script / ข้อความ', desc: 'บทพูด Call Script, LINE, Email, FAQ, Role-play ที่ปรับตาม Persona ลูกค้า', icon: '📝' },
  { key: 'factsheet', label: 'Factsheet', desc: 'เอกสารสรุปผลิตภัณฑ์รูปแบบพร้อมใช้งาน สร้างจากแม่แบบตามประเภทผลิตภัณฑ์', icon: '📄' },
  { key: 'graph', label: 'Graph / กราฟ', desc: 'กราฟแท่งเทียนพร้อมเส้น Strike / Knock-In / Knock-Out และวันสังเกตการณ์อัตโนมัติ', icon: '📈' },
]

// Product-type families (for factsheet + product hinting), from memie.
export const FACTSHEET_FAMILY_OPTIONS = [
  { value: 'kiko', label: 'KIKO (Knock-In / Knock-Out)' },
  { value: 'twin_win', label: 'Twin Win' },
  { value: 'sharkfin', label: 'Sharkfin (ระบบเลือก Bullish/Bearish อัตโนมัติ)' },
  { value: 'ben', label: 'BEN — Bonus Enhance (เลือก Physical/Cash/Protected อัตโนมัติ)' },
  { value: 'booster', label: 'Booster (เลือกมี/ไม่มี Protection อัตโนมัติ)' },
  { value: 'fcn', label: 'FCN (Fixed Coupon Note)' },
  { value: 'fixed_rate_note', label: 'Fixed Rate Note' },
  { value: 'three_musketeers', label: 'Three Musketeers' },
  { value: 'lookback_dispersion', label: 'Dispersion Note (Lookback)' },
  { value: 'FUND', label: 'กองทุน (Fund)' },
]

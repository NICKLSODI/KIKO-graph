import { C } from '../theme'
import { Screen, Card, StepDots, NavBtn } from '../ui/components'
import { FactsheetInput } from '../ui/inputs'
import { FACTSHEET_FAMILY_OPTIONS } from '../constants'
import type { AppState, Patch } from '../store'

export const FLOW_LABELS = ['นำเข้าข้อมูล', 'เลือกผลลัพธ์', 'ดึงข้อมูล', 'ผลลัพธ์']

export function InputScreen({ state, patch }: { state: AppState; patch: Patch }) {
  const ready = state.mode === 'file' ? !!state.file : state.mode === 'link' ? state.link.trim().length > 0 : state.text.trim().length > 0

  return (
    <Screen>
      <StepDots step={1} labels={FLOW_LABELS} />
      <Card>
        <div style={{ fontSize: 17, fontWeight: 600, color: C.text, marginBottom: 4 }}>นำเข้าข้อมูลผลิตภัณฑ์</div>
        <div style={{ fontSize: 13.5, color: C.muted, marginBottom: 18 }}>
          สามารถนำเข้าข้อมูลได้ 3 รูปแบบ ได้แก่ การระบุลิงก์อ้างอิง (Web Link) การแนบไฟล์เอกสารดิจิทัล (PDF/รูปภาพ) หรือการป้อนข้อมูลสรุปโดยย่อ
        </div>
        <FactsheetInput
          mode={state.mode}
          text={state.text}
          link={state.link}
          file={state.file}
          onMode={(mode) => patch({ mode })}
          onText={(text) => patch({ text })}
          onLink={(link) => patch({ link })}
          onFile={(file) => patch({ file })}
          onClearFile={() => patch({ file: null })}
        />

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>
            ประเภทผลิตภัณฑ์ (ไม่บังคับกรอก — ช่วยให้ดึงข้อมูลและสร้าง Factsheet แม่นยำขึ้น)
          </div>
          <select
            value={state.productType}
            onChange={(e) => patch({ productType: e.target.value })}
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: 'border-box', background: C.white }}
          >
            <option value="">ไม่ระบุประเภท</option>
            {FACTSHEET_FAMILY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div style={{ marginTop: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 6 }}>
            ชื่อผลิตภัณฑ์ที่ต้องการเจาะจง (กรณีเอกสารมีมากกว่า 1 ผลิตภัณฑ์ ไม่บังคับกรอก)
          </div>
          <input
            value={state.targetProduct}
            onChange={(e) => patch({ targetProduct: e.target.value })}
            placeholder="เช่น ชื่อรุ่นหรือ Series ของผลิตภัณฑ์ที่ต้องการ"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: `1px solid ${C.border}`, fontSize: 13.5, boxSizing: 'border-box', fontFamily: 'inherit' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
          <NavBtn onClick={() => patch({ screen: 'chooseOutput' })} disabled={!ready}>
            เลือกประเภทผลลัพธ์ →
          </NavBtn>
        </div>
      </Card>
    </Screen>
  )
}

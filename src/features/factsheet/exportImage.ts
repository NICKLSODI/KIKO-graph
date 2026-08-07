// Rasterize a factsheet (a self-contained HTML page string) to PNG in the browser, with no
// extra dependency: lay it out in a hidden iframe to measure the real page height, re-serialize
// that DOM as well-formed XHTML inside an <svg><foreignObject>, then paint the SVG onto a canvas.
// The factsheet markup carries no <img> and no external font/stylesheet, so the canvas never
// taints and everything the preview shows is present in the image.

// Layout viewport for the offscreen render — wide/tall enough for either page orientation
// (portrait A4 is 794×1123, the landscape KIKO sheet 1123×794). The real page size is
// measured off the rendered .page element, never assumed.
const VIEW_W = 1400
const VIEW_H = 1400

/** Render `html` in an offscreen iframe and hand its document to `fn`. */
async function withRenderedDoc<T>(html: string, fn: (doc: Document) => T): Promise<T> {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  Object.assign(iframe.style, {
    position: 'fixed', left: '-20000px', top: '0',
    width: `${VIEW_W}px`, height: `${VIEW_H}px`, border: 'none', opacity: '0', pointerEvents: 'none',
  } as CSSStyleDeclaration)
  iframe.srcdoc = html
  const loaded = new Promise<void>((resolve) => { iframe.onload = () => resolve() })
  document.body.appendChild(iframe)
  try {
    await loaded
    const doc = iframe.contentDocument
    if (!doc) throw new Error('เปิดหน้า factsheet เพื่อสร้างรูปไม่สำเร็จ')
    // One frame so fonts/layout settle before we measure and serialize.
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    return fn(doc)
  } finally {
    iframe.remove()
  }
}

/** Build the PNG. `scale` 2 doubles the page's CSS pixels — sharp enough to read on a phone. */
export async function factsheetPngBlob(html: string, scale = 2): Promise<Blob> {
  const { xhtml, width, height } = await withRenderedDoc(html, (doc) => {
    const page = doc.querySelector('.page') as HTMLElement | null
    if (!page) throw new Error('ไม่พบเนื้อหา factsheet')
    const rect = page.getBoundingClientRect()
    const w = Math.ceil(rect.width)
    const h = Math.ceil(rect.height)
    // XMLSerializer over an HTML DOM emits well-formed XML (void tags closed, entities
    // escaped) — required, since <foreignObject> content is parsed as XML, not HTML.
    const ser = new XMLSerializer()
    const styles = Array.from(doc.querySelectorAll('style')).map((s) => ser.serializeToString(s)).join('')
    return { xhtml: `${styles}${ser.serializeToString(page)}`, width: w, height: h }
  })

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<foreignObject x="0" y="0" width="${width}" height="${height}">` +
    `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;background:#fff">${xhtml}</div>` +
    `</foreignObject></svg>`

  const img = new Image()
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('สร้างรูป factsheet ไม่สำเร็จ — ลองใช้ "พิมพ์ / บันทึก PDF" แทน'))
  })

  const canvas = document.createElement('canvas')
  canvas.width = width * scale
  canvas.height = height * scale
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/png'))
  if (!blob) throw new Error('แปลงรูป factsheet เป็น PNG ไม่สำเร็จ')
  return blob
}

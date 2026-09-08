// Every treasure has to be drawn inside one shared box around its origin, because the prize card,
// the clubhouse shelf and the grade cards all place them from that origin with no idea how tall any
// particular toy is. This measures the real ink of each one and fails if any escapes the box.
// Usage: node e2e/artbox.mjs
import { serve, launch, playwright } from './lib.mjs'
const pw = await playwright(); const { server, url } = await serve('dist')
const { browser, page } = await launch(pw, { dpr: 1 })
await page.goto(url + '?test&seed=1')
await page.waitForFunction(() => window.__tm && window.__tm.ready)
const out = await page.evaluate(async () => {
  const mod = window.__tm
  const drawTreasure = mod.drawTreasure
  const NAMES = mod.treasureNames
  const cv = document.createElement('canvas'); cv.width = 400; cv.height = 400
  const ctx = cv.getContext('2d')
  const res = []
  for (const n of NAMES) {
    ctx.clearRect(0, 0, 400, 400)
    ctx.save(); ctx.translate(200, 200); drawTreasure(ctx, n, 0, 0, 1); ctx.restore()
    const d = ctx.getImageData(0, 0, 400, 400).data
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
    for (let y = 0; y < 400; y++) for (let x = 0; x < 400; x++) {
      if (d[(y * 400 + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y }
    }
    res.push([n, x0 - 200, x1 - 200, y0 - 200, y1 - 200])
  }
  return res
})
const BOX = { x0: -32, x1: 32, y0: -56, y1: 33 }
let bad = 0
for (const [n, x0, x1, y0, y1] of out) {
  const over = x0 < BOX.x0 || x1 > BOX.x1 || y0 < BOX.y0 || y1 > BOX.y1
  if (over) bad++
  console.log(`${over ? 'OVER' : 'ok  '} ${n.padEnd(18)} x ${String(x0).padStart(4)}..${String(x1).padStart(4)}   y ${String(y0).padStart(4)}..${String(y1).padStart(4)}`)
}
console.log(bad ? `${bad} treasure(s) outside the box ${JSON.stringify(BOX)}` : `all ${out.length} treasures fit ${JSON.stringify(BOX)}`)
await browser.close(); server.close()
process.exit(bad ? 1 : 0)

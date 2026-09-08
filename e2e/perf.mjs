// How long one frame of each screen takes to draw. rAF deltas only ever report the vsync interval,
// so this times the real render call directly, at the viewport and pixel ratio of a phone, a tablet
// and a high-DPI laptop in fullscreen - the last being the worst case the stage allows, a 1280 CSS
// pixel wide canvas at a device pixel ratio of 3.
// Usage: node e2e/perf.mjs
import { serve, launch, playwright } from './lib.mjs'

const pw = await playwright()
const { server, url } = await serve('dist')
const SCREENS = ['title', 'clubhouse', 'level1', 'level2', 'level3', 'riddle', 'riddle-visual', 'castle', 'throne', 'crown']
// Headless Chromium rasterises on the CPU through SwiftShader, which is several times slower than
// the GPU in any real phone, so this is a regression alarm rather than a promise of 60fps: a frame
// that costs 30ms here has grown enough to be worth looking at.
const BUDGET = 30

const DEVICES = [
  { name: 'phone 2400x1080', width: 800, height: 360, dpr: 3 },
  { name: 'tablet 1280x800', width: 1280, height: 800, dpr: 2 },
  { name: 'laptop 4K fullscreen', width: 1280, height: 720, dpr: 3 },
]

let worst = { ms: 0, where: '' }
for (const d of DEVICES) {
  const { browser, page } = await launch(pw, { dpr: d.dpr, width: d.width, height: d.height })
  await page.goto(url + '?test&seed=perf&stars=6')
  await page.waitForFunction(() => window.__tm && window.__tm.ready)
  const px = await page.evaluate(() => window.__tm.backingPixels())
  console.log(`--- ${d.name} (${d.width}x${d.height} css at dpr ${d.dpr}; ${(px / 1e6).toFixed(1)}M pixels)`)
  for (const name of SCREENS) {
    await page.evaluate(n => window.__tm.show(n), name)
    await page.waitForTimeout(200)
    const ms = await page.evaluate(() => window.__tm.renderMs(30))
    const on = await page.evaluate(() => window.__tm.game.screen)
    if (ms > worst.ms) worst = { ms, where: `${name} on ${d.name}` }
    console.log(`${ms > BUDGET ? 'SLOW' : 'ok  '} ${name.padEnd(16)} ${ms.toFixed(2)} ms/frame   [screen=${on}]`)
  }
  await browser.close()
}
server.close()
console.log(worst.ms > BUDGET ? `SLOWEST ${worst.where}: ${worst.ms.toFixed(2)} ms/frame, over the ${BUDGET}ms budget` : `every screen draws inside the frame budget (slowest ${worst.where}: ${worst.ms.toFixed(2)} ms)`)
process.exit(worst.ms > BUDGET ? 1 : 0)

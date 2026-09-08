// No screen in the game may flash. WCAG 2.3.1 (and common sense for a game aimed at children, who
// are the group most at risk of photosensitive seizures) allows no more than three flashes a
// second, where a flash is a large brightness change over a large part of the screen. This steps
// every screen frame by frame and measures the mean brightness of each one.
// Usage: node e2e/flash.mjs   (run `npx vite build` first)
import { serve, launch, playwright } from './lib.mjs'

const FRAMES = 240                 // four seconds at 60fps
// A swing of 0.025 in mean brightness is what a quarter of the screen changing by the WCAG
// threshold of 0.1 relative luminance would do; a flash needs a swing up and a swing back.
const SWING = 0.025
const MAX_FLASHES_PER_SECOND = 3

const pw = await playwright()
const { server, url } = await serve('dist')
const { browser, page } = await launch(pw, { dpr: 1 })
await page.goto(url + '?test&seed=1')
await page.waitForFunction(() => window.__tm && window.__tm.ready)
const screens = await page.evaluate(() => window.__tm.shots().filter(s => !s.startsWith('sheet-')))

let worst = 0, worstName = ''
const problems = []
for (const name of screens) {
  const luma = await page.evaluate(([n, frames]) => { window.__tm.show(n); return window.__tm.luma(frames) }, [name, FRAMES])
  // Count direction changes that cross the swing threshold: down-up or up-down is one flash.
  let flashes = 0, anchor = luma[0], dir = 0, biggest = 0
  for (const v of luma) {
    const d = v - anchor
    if (Math.abs(d) > Math.abs(biggest)) biggest = d
    if (Math.abs(d) >= SWING) { const nd = Math.sign(d); if (nd !== dir) { flashes++; dir = nd }; anchor = v }
    else if (v > anchor === (dir > 0)) anchor = v      // trail the extreme, so slow drift is not a flash
  }
  const perSecond = flashes / (FRAMES / 60)
  const range = Math.max(...luma) - Math.min(...luma)
  if (perSecond > worst) { worst = perSecond; worstName = name }
  const line = `${name.padEnd(14)} ${perSecond.toFixed(2)} flashes/s   brightness ${Math.min(...luma).toFixed(3)}..${Math.max(...luma).toFixed(3)} (range ${range.toFixed(3)})`
  if (perSecond > MAX_FLASHES_PER_SECOND) { problems.push(line); console.log('FLASH ' + line) } else console.log('ok    ' + line)
}
await browser.close(); server.close()
console.log(`\nworst: ${worstName} at ${worst.toFixed(2)} flashes a second (the limit is ${MAX_FLASHES_PER_SECOND})`)
if (problems.length) { console.error(`${problems.length} screen(s) flash`); process.exit(1) }
console.log('no screen flashes')

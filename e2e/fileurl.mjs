// The Android WebView loads assets/index.html over file://, where module scripts and fetch are
// blocked. This checks the built page really works from a file:// URL, the way the APK loads it.
import { resolve } from 'node:path'
import { launch, playwright } from './lib.mjs'
const pw = await playwright()
const { browser, page } = await launch(pw, { dpr: 1 })
const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })
await page.goto('file://' + resolve('dist/index.html') + '?test=1')
await page.waitForFunction(() => window.__tm && window.__tm.ready, { timeout: 15000 })
// Play a little: title -> grade -> clubhouse -> level, and check the canvas has actually painted.
await page.evaluate(() => window.__tm.show('level1'))
await page.waitForTimeout(300)
const painted = await page.evaluate(() => {
  const c = document.getElementById('game')
  const g = c.getContext('2d')
  const d = g.getImageData(0, 0, c.width, c.height).data
  let nonBlack = 0
  for (let i = 0; i < d.length; i += 4000) if (d[i] > 20 || d[i + 1] > 20 || d[i + 2] > 20) nonBlack++
  return { w: c.width, h: c.height, nonBlack }
})
// localStorage must work too, or progress would never save in the app.
const storage = await page.evaluate(() => { try { localStorage.setItem('tm-probe', '1'); const v = localStorage.getItem('tm-probe'); localStorage.removeItem('tm-probe'); return v } catch (e) { return 'BLOCKED: ' + e.message } })
await browser.close()
console.log('canvas', painted.w + 'x' + painted.h, 'painted samples:', painted.nonBlack)
console.log('localStorage:', storage)
if (errors.length) { console.error('ERRORS:\n' + errors.join('\n')); process.exit(1) }
if (painted.nonBlack < 50) { console.error('canvas looks blank'); process.exit(1) }
if (storage !== '1') { console.error('localStorage unavailable over file://'); process.exit(1) }
console.log('file:// load OK - the APK will render and save progress')

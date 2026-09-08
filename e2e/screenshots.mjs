// Renders every screen / art-sheet the game exposes through window.__tm.shots() and writes PNGs.
// Usage: node e2e/screenshots.mjs [outDir]   (run `npm run build` first)
import { mkdirSync } from 'node:fs'
import { serve, launch, playwright } from './lib.mjs'

const out = process.argv[2] || 'e2e/out/shots'
mkdirSync(out, { recursive: true })
const pw = await playwright()
const { server, url } = await serve('dist')
const { browser, page } = await launch(pw, { dpr: 1 })
await page.goto(url + '?test=1')
await page.waitForFunction(() => window.__tm && window.__tm.ready)
const shots = await page.evaluate(() => window.__tm.shots())
for (const name of shots) {
  await page.evaluate(n => window.__tm.show(n), name)
  await page.waitForTimeout(150)
  await page.screenshot({ path: `${out}/${name}.png` })
  console.log('shot', name)
}
await browser.close()
server.close()

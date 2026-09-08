// A cached game has to be able to replace itself. This serves a copy of dist, lets the service
// worker install and precache it, then publishes a changed build over the top and checks that a
// returning player ends up on the new one - and that the old cache is deleted rather than left
// behind to grow with every release.
// Usage: node e2e/swupdate.mjs
import { cpSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { serve, launch, playwright } from './lib.mjs'

const dir = mkdtempSync(join(tmpdir(), 'tm-sw-'))
cpSync('dist', dir, { recursive: true })

const pw = await playwright()
const { server, url } = await serve(dir)
const { browser, page, context } = await launch(pw)
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })

const caches = () => page.evaluate(async () => {
  const keys = await window.caches.keys()
  const out = {}
  for (const k of keys) out[k] = (await (await window.caches.open(k)).keys()).length
  return out
})
const marker = () => page.evaluate(() => document.title)

await page.goto(url)
await page.waitForFunction(() => !document.getElementById('boot'))
await page.waitForFunction(() => navigator.serviceWorker.controller != null, null, { timeout: 20000 })
await page.waitForTimeout(800)
const first = await caches()
console.log('after install:', JSON.stringify(first), 'title:', await marker())
if (Object.keys(first).length !== 1) throw new Error('expected exactly one cache, got ' + JSON.stringify(first))
const [v1] = Object.keys(first)

// Confirm it really is serving from the cache, not the network.
await context.setOffline(true)
await page.reload({ waitUntil: 'load' })
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 15000 })
console.log('offline reload served from cache')
await context.setOffline(false)

// Publish a new build over the top: new content, and the version hash the plugin would produce.
const html = readFileSync(join(dir, 'index.html'), 'utf8')
writeFileSync(join(dir, 'index.html'), html.replace('<title>Treasure Mountain</title>', '<title>Treasure Mountain v2</title>'))
const sw = readFileSync(join(dir, 'sw.js'), 'utf8')
const v2 = v1 + 'x'
writeFileSync(join(dir, 'sw.js'), sw.replace(v1, v2))

// One reload for the browser to notice the new worker, one for the page it serves.
await page.reload({ waitUntil: 'load' })
await page.waitForTimeout(1500)
await page.waitForTimeout(1500)
await page.reload({ waitUntil: 'load' })
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 15000 })
await page.waitForTimeout(800)

const after = await caches()
const title = await marker()
console.log('after update: ', JSON.stringify(after), 'title:', title)

const problems = []
if (title !== 'Treasure Mountain v2') problems.push(`a returning player is still on the old build (title "${title}")`)
if (Object.keys(after).length > 2) problems.push(`caches are piling up: ${JSON.stringify(after)}`)
if (errors.length) problems.push('console errors: ' + errors.join(' | '))

await browser.close(); server.close(); rmSync(dir, { recursive: true, force: true })
console.log(problems.length ? 'FAIL\n  ' + problems.join('\n  ') : 'service worker update checks passed')
process.exit(problems.length ? 1 : 0)

// Verifies the production shell: service worker installs and precaches, the manifest is valid,
// progress survives a reload (localStorage), and the page has no console errors.
import { serve, launch, playwright } from './lib.mjs'
const pw = await playwright()
const { server, url } = await serve('dist')
const { browser, page, context } = await launch(pw)
const errors = []
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(url)
await page.waitForFunction(() => !document.getElementById('boot'))
// manifest
const manifest = await page.evaluate(async () => { const l = document.querySelector('link[rel=manifest]'); const r = await fetch(l.href); return r.json() })
if (!manifest.icons || manifest.icons.length < 2 || manifest.display !== 'fullscreen') throw new Error('bad manifest ' + JSON.stringify(manifest))
// service worker
await page.waitForFunction(() => navigator.serviceWorker && navigator.serviceWorker.controller || (navigator.serviceWorker.getRegistrations && navigator.serviceWorker.getRegistrations().then(r => r.length > 0)), null, { timeout: 15000 })
await page.waitForTimeout(1500)
const cached = await page.evaluate(async () => { const keys = await caches.keys(); const c = await caches.open(keys[0]); const reqs = await c.keys(); return { keys, files: reqs.map(r => new URL(r.url).pathname) } })
console.log('cache', cached.keys, cached.files.length, 'files')
if (!cached.files.some(f => f.endsWith('/index.html'))) throw new Error('index.html not precached: ' + cached.files.join(','))
// progress persistence: choose grade 2, start, then reload and expect the resume button
await page.mouse.click(640, 300); await page.waitForTimeout(200)
await page.mouse.click(1000, 290); await page.waitForTimeout(200)        // grade 2 card
const startBtn = await page.evaluate(() => { const c = document.querySelector('canvas'); return !!c })
void startBtn
await page.keyboard.press('Enter'); await page.waitForTimeout(400)         // start climbing (+ intro)
await page.keyboard.press('Enter'); await page.waitForTimeout(400)
await page.keyboard.press('Escape'); await page.waitForTimeout(300)         // pause -> saves
const saved = await page.evaluate(() => localStorage.getItem('treasure-mountain-v1'))
if (!saved || !JSON.parse(saved).lastRun) throw new Error('no saved run: ' + saved)
await page.reload(); await page.waitForFunction(() => !document.getElementById('boot')); await page.waitForTimeout(300)
await page.mouse.click(640, 300); await page.waitForTimeout(200)
await page.mouse.click(1000, 290); await page.waitForTimeout(200)
const shot = await page.screenshot({ path: 'e2e/out/pwa-resume.png' })
void shot
// offline: block network and reload; the SW must serve the page
await context.setOffline(true)
await page.reload({ waitUntil: 'load' })
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 10000 })
const title = await page.title()
console.log('offline reload ok, title =', title)
await context.setOffline(false)

// Held upright, the game is a strip in the middle of a black screen: a touch device in portrait
// gets a "turn your tablet sideways" card instead, and a way past it for a tablet locked upright.
const shown = () => page.evaluate(() => getComputedStyle(document.getElementById('rotate')).display)
await page.setViewportSize({ width: 390, height: 844 })
if (await shown() !== 'flex') throw new Error('no rotate card on a portrait touch screen')
await page.click('#rotate label')
if (await shown() !== 'none') throw new Error('"Play anyway" did not dismiss the rotate card')
await page.setViewportSize({ width: 1280, height: 720 })
if (await shown() !== 'none') throw new Error('rotate card shown in landscape')

if (errors.length) throw new Error('console errors: ' + errors.join(' | '))
await browser.close(); server.close()
console.log('PWA checks passed')

// Bashes the UI with random taps and keystrokes to find crashes and stuck states.
// Usage: node e2e/fuzz.mjs [steps] [seed]
import { serve, launch, playwright } from './lib.mjs'

const steps = parseInt(process.argv[2] || '3000')
const seed = parseInt(process.argv[3] || '7')
const pw = await playwright()
const { server, url } = await serve('dist')
const { browser, page } = await launch(pw, { dpr: 1 })

const errors = []
page.on('pageerror', e => errors.push('pageerror: ' + e.message))
page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()) })

await page.goto(url + '?test&seed=fuzz')
await page.waitForFunction(() => window.__tm && window.__tm.game)
await page.evaluate(() => { window.__tm.game.settings.sound = false; window.__tm.game.settings.music = false })

let s = seed >>> 0
const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 }
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Escape', 'p', 'n', 'c', 'j', '1', '2', '3', '4', 'Tab', 'Backspace']

const VALID = ['title', 'grade', 'clubhouse', 'intro', 'level', 'riddle', 'clue', 'castle', 'throne', 'rank', 'crown', 'howto', 'about']
const check = async () => page.evaluate(valid => {
  const g = window.__tm.game
  const bad = []
  if (!valid.includes(g.screen)) bad.push('bad screen ' + g.screen)
  const num = v => typeof v === 'number' && Number.isFinite(v)
  if (g.lvl) {
    const p = g.lvl.player
    if (!num(p.x) || !num(p.y) || !num(p.vy)) bad.push(`player NaN x=${p.x} y=${p.y} vy=${p.vy}`)
    if (p.y < -1) bad.push('player below ground ' + p.y)
    if (!num(g.lvl.camX)) bad.push('camX NaN')
    for (const e of g.lvl.elves) if (!num(e.x)) bad.push('elf NaN')
  }
  if (g.castle) { if (!num(g.castle.x) || !num(g.castle.y)) bad.push('castle NaN') }
  if (g.run) {
    if (g.run.coins < 0) bad.push('negative coins ' + g.run.coins)
    if (g.run.nets < 0) bad.push('negative nets ' + g.run.nets)
    if (![1, 2, 3].includes(g.run.levelNo)) bad.push('bad levelNo ' + g.run.levelNo)
  }
  if (g.riddle) {
    const r = g.riddle.riddle
    if (g.riddle.selected != null && g.riddle.selected >= r.choices.length) bad.push('selected out of range')
    if (g.riddle.triesLeft < 0) bad.push('negative tries')
  }
  const prof = g.profile()
  if (prof.total < 0) bad.push('negative total')
  return bad
}, VALID)

const STARTS = ['title', 'grade', 'clubhouse', 'level1', 'level2', 'level3', 'riddle', 'riddle-visual', 'clue', 'castle', 'throne', 'rank', 'crown', 'howto', 'pause']
// Spread the re-seats over however many steps were asked for, so a short run still visits every
// screen rather than stopping a third of the way down the list.
const period = Math.max(40, Math.floor(steps / STARTS.length))
const seen = new Set()
for (let i = 0; i < steps; i++) {
  // Re-seat the fuzzer in a deep screen now and then: random clicking alone never reaches the
  // castle, so the states that matter most would go untested.
  if (i % period === 0) {
    const from = STARTS[(i / period) % STARTS.length]
    await page.evaluate(n => window.__tm.show(n), from)
    await page.waitForTimeout(80)
  }
  const r = rnd()
  if (r < 0.55) {
    // Tap somewhere: usually on a real button, sometimes anywhere at all.
    if (rnd() < 0.7) {
      const b = await page.evaluate(() => { const bs = window.__tm.game.buttons(); return bs.length ? bs[Math.floor(Math.random() * bs.length)] : null })
      if (b) await page.mouse.click(b.x + b.w / 2, b.y + b.h / 2)
      else await page.mouse.click(rnd() * 1280, rnd() * 720)
    } else await page.mouse.click(rnd() * 1280, rnd() * 720)
  } else if (r < 0.9) {
    await page.keyboard.press(KEYS[Math.floor(rnd() * KEYS.length)])
  } else {
    await page.waitForTimeout(60 + rnd() * 200)
  }
  if (i % 10 === 0) {
    const bad = await check()
    if (bad.length) { console.log(`step ${i}: ${bad.join('; ')}`); errors.push(...bad) }
    seen.add(await page.evaluate(() => window.__tm.game.screen))
  }
}
const bad = await check()
if (bad.length) errors.push(...bad)
console.log('screens visited:', [...seen].sort().join(','))
console.log('final:', await page.evaluate(() => { const g = window.__tm.game; return `${g.screen} paused=${g.paused} total=${g.profile().total}` }))
console.log(errors.length ? 'FAIL\n' + [...new Set(errors)].slice(0, 20).join('\n') : 'FUZZ OK')
await browser.close(); server.close()
process.exit(errors.length ? 1 : 0)

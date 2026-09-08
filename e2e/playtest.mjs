// Plays a whole ascent through the real UI: only mouse clicks / taps on the canvas and keyboard
// presses, at every grade. Uses window.__tm only to read state (never to mutate it), and writes
// screenshots of the key moments so a human can review the run.
// Usage: node e2e/playtest.mjs [outDir] [grades]   e.g. node e2e/playtest.mjs e2e/out/play 0,3
import { mkdirSync } from 'node:fs'
import { serve, launch, playwright } from './lib.mjs'

const out = process.argv[2] || 'e2e/out/play'
const grades = (process.argv[3] || '0,1,2,3,4,5').split(',').map(Number)
mkdirSync(out, { recursive: true })
const pw = await playwright()
const { server, url } = await serve('dist')
const { browser, page } = await launch(pw, { dpr: 1 })

const state = () => page.evaluate(() => { const g = window.__tm.game; return { screen: g.screen, paused: g.paused, grade: g.grade, run: g.run && { levelNo: g.run.levelNo, coins: g.run.coins, nets: g.run.nets, treasures: g.run.treasures.length, hasKey: g.run.hasKey, clues: g.run.clues }, riddle: g.riddle && { phase: g.riddle.phase, answer: g.riddle.riddle.answer, family: g.riddle.riddle.family, prompt: g.riddle.riddle.prompt, choices: g.riddle.riddle.choices.map(c => c.text ?? 'pic') }, castle: g.castle && { floor: g.castle.floor, state: g.castle.state }, total: g.profile().total } })
const tap = async (x, y) => { await page.mouse.click(x, y); await page.waitForTimeout(40) }
const btn = async id => { const b = await page.evaluate(id => window.__tm.game.buttons().find(b => b.id === id), id); if (!b) throw new Error('no button ' + id); await tap(b.x + b.w / 2, b.y + b.h / 2) }
const shot = async name => page.screenshot({ path: `${out}/${name}.png` })
const settle = ms => page.waitForTimeout(ms)
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a)

/** Screen x of a world x for the current camera. */
const screenX = async wx => page.evaluate(wx => { const g = window.__tm.game; const L = 7680; let d = wx - g.lvl.camX; d = ((d % L) + L) % L; if (d > L - 400) d -= L; return d }, wx)

const stats = { riddles: 0, right: 0, wrongFirst: 0, families: {}, nets: 0, coins: 0 }

async function playLevel(grade) {
  // 1. Catch scroll elves until 3 clue words. We steer by keyboard (arrows) and swing with Space
  //    when an elf is in range, exactly like a child at a keyboard would.
  let guard = 0
  while (guard++ < 400) {
    const s = await state()
    if (s.screen === 'riddle') { await answerRiddle(); continue }
    if (s.screen === 'clue') { await btn('goon'); continue }
    if (s.screen !== 'level') break
    const clues = Object.keys(s.run.clues).length
    if (clues >= 3) break
    if (s.run.nets === 0) { await buyNets(); continue }
    // find nearest scroll elf
    const target = await page.evaluate(() => { const g = window.__tm.game, p = g.lvl.player; const L = 7680; const d = (a, b) => { let x = b - a; x = ((x % L) + L) % L; if (x > L / 2) x -= L; return x }; const es = g.lvl.elves.filter(e => e.kind === 'scroll' && e.state === 'run').map(e => ({ id: e.id, d: d(p.x, e.x) })).sort((a, b) => Math.abs(a.d) - Math.abs(b.d)); return es[0] || null })
    if (!target) { await settle(300); continue }
    if (Math.abs(target.d) < 120) { await page.keyboard.press('Space'); await settle(700); continue }
    // tap the elf on screen: the game walks toward it and swings when in range
    const ex = await page.evaluate(id => { const g = window.__tm.game; const e = g.lvl.elves.find(e => e.id === id); const L = 7680; let d = e.x - g.lvl.camX; d = ((d % L) + L) % L; if (d > L - 400) d -= L; return d }, target.id)
    if (ex > 40 && ex < 1240) await tap(ex, 420)
    else { await page.keyboard.down(target.d > 0 ? 'ArrowRight' : 'ArrowLeft'); await settle(350); await page.keyboard.up(target.d > 0 ? 'ArrowRight' : 'ArrowLeft') }
    await settle(250)
  }
  let s = await state()
  if (!s.run || Object.keys(s.run.clues).length < 3) throw new Error('did not get 3 clues: ' + JSON.stringify(s))
  await shot(`g${grade}-l${s.run.levelNo}-clues`)
  // 2. Walk to every group that matches >= 2 clue words and drop a coin (the child's deduction).
  const groups = await page.evaluate(() => { const g = window.__tm.game, lv = g.lvl.level; const t = lv.target; return lv.groups.map(x => ({ id: x.id, x: x.x, m: (x.count === t.count) + (x.descriptor === t.descriptor) + (x.kind === t.kind), hides: x.hides })).filter(x => x.m >= 2) })
  for (const grp of groups) {
    await walkTo(grp.x)
    s = await state()
    if (s.run.coins === 0) { await earnCoins(); await walkTo(grp.x) }
    await ensureLevel()
    await btn('coin')
    await settle(1500)
    stats.coins++
  }
  s = await state()
  if (!s.run.hasKey) throw new Error('no key after searching all 2+ matches: ' + JSON.stringify(groups))
  await shot(`g${grade}-l${s.run.levelNo}-key`)
  // 3. Take the key to the exit and use it.
  const exit = await page.evaluate(() => window.__tm.game.lvl.level.features.find(f => f.type === 'keyhole' || f.type === 'fountain' || f.type === 'castledoor').x)
  await walkTo(exit)
  await ensureLevel()
  await page.keyboard.press('ArrowUp')
  await settle(3200)
}

/** Any tap near an elf swings the net (by design), so a riddle can pop up while walking. */
async function ensureLevel() {
  for (let i = 0; i < 6; i++) {
    const s = await state()
    if (s.screen === 'riddle') { await answerRiddle(); continue }
    if (s.screen === 'clue') { await btn('goon'); await settle(150); continue }
    if (s.screen === 'level') return
    await settle(300)
  }
}

async function walkTo(wx) {
  for (let i = 0; i < 60; i++) {
    await ensureLevel()
    const d = await page.evaluate(wx => { const g = window.__tm.game; const L = 7680; let x = wx - g.lvl.player.x; x = ((x % L) + L) % L; if (x > L / 2) x -= L; return x }, wx)
    if (Math.abs(d) < 14) return
    const sx = await screenX(wx)
    if (sx > 30 && sx < 1250) { await tap(sx, 440); await settle(Math.min(2500, Math.abs(d) / 300 * 1000 + 200)) }
    else { const key = d > 0 ? 'ArrowRight' : 'ArrowLeft'; await page.keyboard.down(key); await settle(Math.min(1500, Math.abs(d) / 300 * 1000)); await page.keyboard.up(key) }
    // a riddle can interrupt (we bumped into an elf while swinging? no: only Space swings). Tunnels don't trigger on tap-walk.
  }
}

async function answerRiddle() {
  const s = await state()
  stats.riddles++
  stats.families[s.riddle.family] = (stats.families[s.riddle.family] || 0) + 1
  if (stats.riddles <= 3) await shot(`g${s.grade}-riddle-${stats.riddles}`)
  // A "good student" who occasionally slips: answer wrong first on every 7th riddle.
  const slip = stats.riddles % 7 === 0
  if (slip) { const wrong = (s.riddle.answer + 1) % s.riddle.choices.length; await btn('choice' + wrong); stats.wrongFirst++; await settle(1400) }
  await btn('choice' + s.riddle.answer)
  await settle(300)
  const s2 = await state()
  if (s2.screen === 'riddle' && s2.riddle.phase === 'right') stats.right++
  await btn('goon')
  await settle(200)
  const s3 = await state()
  if (s3.screen === 'clue') await btn('goon')
}

async function buyNets() {
  const rock = await page.evaluate(() => window.__tm.game.lvl.level.features.find(f => f.type === 'netrock').x)
  await walkTo(rock)
  await ensureLevel()
  await btn('coin')
  await settle(600)
  stats.nets++
}

async function earnCoins() {
  // Catch any elf for a coin.
  for (let i = 0; i < 20; i++) {
    const s = await state()
    if (s.screen === 'riddle') { await answerRiddle(); continue }
    if (s.screen === 'clue') { await btn('goon'); continue }
    if (s.run.coins > 0) return
    if (s.run.nets === 0) { await buyNets(); continue }
    const t = await page.evaluate(() => { const g = window.__tm.game, p = g.lvl.player; const L = 7680; const d = (a, b) => { let x = b - a; x = ((x % L) + L) % L; if (x > L / 2) x -= L; return x }; const es = g.lvl.elves.filter(e => e.state === 'run').map(e => ({ x: e.x, d: d(p.x, e.x) })).sort((a, b) => Math.abs(a.d) - Math.abs(b.d)); return es[0] })
    await walkTo(t.x - Math.sign(t.d) * 80)
    await page.keyboard.press('Space'); await settle(800)
  }
}

async function playCastle(grade) {
  let guard = 0
  while (guard++ < 200) {
    const s = await state()
    if (s.screen !== 'castle') return
    if (s.castle.state !== 'walk') { await settle(200); continue }
    if (s.castle.floor === 3) { await tap(1050, 170); await settle(2500); continue }
    const ladder = await page.evaluate(() => { const g = window.__tm.game, c = g.castle; return c.ladders.find(l => l.floor === c.floor && !l.trick) })
    const fy = await page.evaluate(f => (560 - 40 - f * 118), s.castle.floor)
    await tap(ladder.x, fy - 40)
    await settle(2200)
  }
}

for (const grade of grades) {
  log('=== grade', grade)
  await page.goto(url + `?test=1&seed=play${grade}`)
  await page.waitForFunction(() => window.__tm && window.__tm.ready)
  await settle(200)
  await tap(640, 300)               // title: anywhere in the picture starts
  await settle(200)
  const cards = await page.evaluate(() => { const g = window.__tm.game; return null }, null)
  void cards
  // grade cards
  const card = await page.evaluate(i => { const w = 320, h = 200, gapX = 40, gapY = 36; const x0 = (1280 - (3 * w + 2 * gapX)) / 2, y0 = 190; return { x: x0 + (i % 3) * (w + gapX) + w / 2, y: y0 + Math.floor(i / 3) * (h + gapY) + h / 2 } }, grade)
  await tap(card.x, card.y)
  await settle(200)
  await btn('start')
  await settle(200)
  let s = await state()
  if (s.screen === 'intro') { await btn('continue'); await settle(200) }
  s = await state()
  if (s.screen !== 'level') throw new Error('expected level, got ' + s.screen)
  await shot(`g${grade}-start`)
  for (let level = 1; level <= 3; level++) {
    await playLevel(grade)
    s = await state()
    log('level', level, 'done ->', s.screen, JSON.stringify(s.run))
  }
  s = await state()
  if (s.screen !== 'castle') throw new Error('expected castle, got ' + s.screen)
  await shot(`g${grade}-castle`)
  await playCastle(grade)
  s = await state()
  if (s.screen !== 'throne') throw new Error('expected throne, got ' + s.screen)
  await settle(1000); await shot(`g${grade}-throne`)
  await btn('continue'); await settle(300)
  await btn('continue'); await settle(300)
  s = await state()
  if (s.screen !== 'rank') throw new Error('expected rank, got ' + s.screen)
  await settle(1600); await shot(`g${grade}-rank`)
  await btn('continue'); await settle(200)
  s = await state()
  log('ascent complete; total treasures', s.total, 'screen', s.screen)
  if (s.total !== 6) throw new Error('expected 6 treasures, got ' + s.total)
}
log('stats', JSON.stringify(stats))
await browser.close()
server.close()

import { describe, it, expect } from 'vitest'
import { Game } from '../src/game/game'
import { STEP } from '../src/engine/loop'
import { Rng } from '../src/engine/rng'
import { W, H } from '../src/game/layout'
import { starsForTotal } from '../src/game/world'
import type { Grade } from '../src/content/types'

/**
 * Throws random input at the game for a long time and checks that it never crashes, never wedges,
 * and never breaks its own rules. A child mashing a tablet is the real-world version of this.
 */

const SCREENS = ['title', 'grade', 'clubhouse', 'intro', 'level', 'riddle', 'clue', 'castle', 'throne', 'rank', 'crown', 'howto', 'about']

function invariants(g: Game, where: string): void {
  expect(SCREENS, `${where}: unknown screen ${g.screen}`).toContain(g.screen)
  const run = g.run
  if (run) {
    expect(run.coins, `${where}: negative coins`).toBeGreaterThanOrEqual(0)
    expect(run.nets, `${where}: negative nets`).toBeGreaterThanOrEqual(0)
    expect([1, 2, 3], `${where}: bad level`).toContain(run.levelNo)
    // Treasures found can never exceed what the three levels actually hide.
    expect(run.treasures.length, `${where}: too many treasures`).toBeLessThanOrEqual(3 * 6)
    for (const t of run.treasures) expect(typeof t).toBe('string')
  }
  const prof = g.profile()
  expect(prof.total, `${where}: negative total`).toBeGreaterThanOrEqual(0)
  expect(starsForTotal(prof.total), `${where}: bad star count`).toBeLessThanOrEqual(7)
  if (g.lvl) {
    const p = g.lvl.player
    expect(Number.isFinite(p.x) && Number.isFinite(p.y), `${where}: player position is not finite`).toBe(true)
    expect(p.y, `${where}: player below ground`).toBeGreaterThanOrEqual(-1)
    for (const e of g.lvl.elves) expect(Number.isFinite(e.x), `${where}: elf position is not finite`).toBe(true)
  }
  if (g.riddle) {
    const r = g.riddle.riddle
    expect(g.riddle.selected, `${where}: selection out of range`).toBeLessThan(r.choices.length)
    expect(g.riddle.selected).toBeGreaterThanOrEqual(0)
  }
  // Every button must be inside the screen, or a child cannot press it.
  for (const b of g.buttons()) {
    expect(b.x, `${where}: button ${b.id} off the left`).toBeGreaterThanOrEqual(-2)
    expect(b.y, `${where}: button ${b.id} off the top`).toBeGreaterThanOrEqual(-2)
    expect(b.x + b.w, `${where}: button ${b.id} off the right`).toBeLessThanOrEqual(W + 2)
    expect(b.y + b.h, `${where}: button ${b.id} off the bottom`).toBeLessThanOrEqual(H + 2)
  }
}

const DESTRUCTIVE = new Set(['p-quit', 'back', 'start'])
const KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'Enter', 'Escape', 'p', '1', '2', '3', '4', 'a', 'd', 'w', 'k', '0', '5']

/**
 * Random tapping essentially never catches an elf, so pure noise only ever reaches the first two
 * screens. This nudge does the *right* thing occasionally - stand by an elf and swing, answer the
 * riddle, search a matching group, use the exit, climb a ladder - so that the riddle, castle,
 * throne, rank and crown screens get fuzzed as well. Everything else stays random.
 */
function nudge(g: Game, rng: Rng): void {
  switch (g.screen) {
    case 'level': {
      const lvl = g.lvl, run = g.run
      if (!lvl || !run || lvl.transition) return
      // Mid-swing or mid-drop: let the animation finish, or forcing 'idle' below would cancel the
      // catch this nudge just started and no elf would ever be caught.
      if (lvl.player.state !== 'idle' && lvl.player.state !== 'walk') return
      if (run.nets === 0) {
        const rock = lvl.level.features.find(f => f.type === 'netrock')
        if (rock) { lvl.player.x = rock.x; lvl.player.state = 'idle'; g.dropCoin() }
        return
      }
      if (g.cluesFound() < 3) {
        const elf = lvl.elves.find(e => e.kind === 'scroll' && e.state === 'run')
        if (elf) { elf.speed = 0; lvl.player.x = elf.x - 80; lvl.player.facing = 1; lvl.player.state = 'idle'; lvl.player.y = 0; g.throwNet() }
        return
      }
      const target = lvl.level.groups.find(gp => gp.hides && !run.searched.includes(gp.id))
      if (target) { lvl.player.x = target.x; lvl.player.state = 'idle'; if (run.coins === 0) run.coins = 1; g.dropCoin(); return }
      const exit = lvl.level.features.find(f => f.type === 'keyhole' || f.type === 'fountain' || f.type === 'castledoor')
      if (exit && run.hasKey) { lvl.player.x = exit.x; lvl.player.state = 'idle'; g.useUp() }
      return
    }
    case 'riddle': {
      const rv = g.riddle
      if (!rv) return
      // Answer right most of the time, wrong sometimes, so both branches are exercised.
      if (rv.phase === 'ask') g.selectChoice(rng.bool(0.75) ? rv.riddle.answer : rng.int(0, rv.riddle.choices.length - 1), true)
      else g.riddleContinue()
      return
    }
    case 'clue': g.closeClue(); return
    case 'castle': {
      const c = g.castle
      if (!c || c.state !== 'walk') return
      if (c.floor < 3) { const l = c.ladders.find(l => l.floor === c.floor && !l.trick); if (l) { c.x = l.x; g.held.add('ArrowUp'); g.update(STEP); g.held.delete('ArrowUp') } }
      else { c.x = 1050; g.held.add('ArrowUp'); g.update(STEP); g.held.delete('ArrowUp') }
      return
    }
    case 'throne': case 'rank': case 'crown': case 'intro': g.advanceScene(); return
    case 'clubhouse': g.pressButton('start'); return
    case 'title': g.play(); return
  }
}

describe('fuzzing the game with random input', () => {
  // 1. Pure noise: no help at all. This is the robustness check - a child mashing the glass.
  for (const seed of ['fuzz-a', 'fuzz-b', 'fuzz-c']) {
    it(`survives 20000 random actions (${seed})`, () => {
      const rng = new Rng(seed)
      const g = new Game(null, { seed, fast: true })
      // Random starting rank, so hazards (elf dust, gaps, trick ladders) are exercised too.
      g.play(); g.chooseGrade(rng.int(0, 5) as Grade)
      g.profile().total = rng.pick([0, 4, 30, 120, 240, 299])
      const screensSeen = new Set<string>()
      for (let i = 0; i < 20000; i++) {
        screensSeen.add(g.screen)
        const roll = rng.next()
        if (roll < 0.35) g.update(STEP)
        else if (roll < 0.60) g.tap(rng.float(0, W), rng.float(0, H))
        else if (roll < 0.78) g.keyDown(rng.pick(KEYS))
        else if (roll < 0.88) g.keyUp(rng.pick(KEYS))
        else { const bs = g.buttons().filter(b => !b.disabled); if (bs.length) g.pressButton(rng.pick(bs).id) }
        if (i % 250 === 0) invariants(g, `${seed} step ${i}`)
      }
      invariants(g, `${seed} end`)
      expect(screensSeen.size, `only saw ${[...screensSeen]}`).toBeGreaterThan(2)
    })
  }

  // 2. Guided: mostly play properly, with noise mixed in, so the riddle, castle, throne, rank and
  //    crown screens are fuzzed too. Pure noise never catches an elf, so it never gets that far.
  for (const seed of ['deep-a', 'deep-b']) {
    it(`plays through with noise mixed in and every screen holds up (${seed})`, () => {
      const rng = new Rng(seed)
      const g = new Game(null, { seed, fast: true })
      g.play(); g.chooseGrade(rng.int(0, 5) as Grade)
      g.profile().total = rng.pick([0, 30, 240, 296])
      const screensSeen = new Set<string>()
      for (let i = 0; i < 40000; i++) {
        screensSeen.add(g.screen)
        const roll = rng.next()
        if (roll < 0.45) nudge(g, rng)
        else if (roll < 0.75) g.update(STEP)
        else if (roll < 0.86) g.tap(rng.float(0, W), rng.float(0, H))
        else if (roll < 0.94) g.keyDown(rng.pick(KEYS))
        else if (roll < 0.97) g.keyUp(rng.pick(KEYS))
        else { const bs = g.buttons().filter(b => !b.disabled && !DESTRUCTIVE.has(b.id)); if (bs.length) g.pressButton(rng.pick(bs).id) }
        if (g.paused) g.togglePause()   // a stray Escape must not park the fuzzer forever
        if (i % 500 === 0) invariants(g, `${seed} step ${i}`)
      }
      invariants(g, `${seed} end`)
      for (const want of ['level', 'riddle', 'clue', 'castle', 'throne', 'rank']) {
        expect(screensSeen.has(want), `${seed}: never reached ${want} (saw ${[...screensSeen].join(', ')})`).toBe(true)
      }
      // A stray Escape on the clubhouse opens grade select, where a stray number key switches
      // grade, so the finished climb may be recorded against a different profile.
      const ascents = Object.values(g.profiles).reduce((n, p) => n + p.ascents, 0)
      expect(ascents, `${seed}: never finished a climb`).toBeGreaterThan(0)
    })
  }

  it('never wedges: from any screen, some input always leads onward', () => {
    // Drive the game with only the big obvious buttons, as a young child would, and check it
    // reaches the mountain without manual help.
    const g = new Game(null, { seed: 'wedge', fast: true })
    const rng = new Rng('wedge')
    g.play(); g.chooseGrade(1)
    let sawLevel = false
    for (let i = 0; i < 30000; i++) {
      const bs = g.buttons().filter(b => !b.disabled)
      if (bs.length && rng.bool(0.25)) g.pressButton(rng.pick(bs).id)
      else if (rng.bool(0.5)) g.tap(rng.float(0, W), rng.float(0, 560))
      g.update(STEP)
      if (g.screen === 'level') sawLevel = true
    }
    expect(sawLevel).toBe(true)
    invariants(g, 'wedge end')
  })

  it('a saved game round-trips at any point without losing the run', () => {
    const rng = new Rng('save-fuzz')
    for (let trial = 0; trial < 12; trial++) {
      const g = new Game(null, { seed: 'sf' + trial, fast: true })
      let saved: any = null
      g.onSave = d => { saved = JSON.parse(JSON.stringify(d)) }
      g.play(); g.chooseGrade(rng.int(0, 5) as Grade)
      g.pressButton('start')
      if (g.screen === 'intro') g.advanceScene()
      for (let i = 0; i < rng.int(50, 2000); i++) {
        if (rng.bool(0.3)) g.tap(rng.float(0, W), rng.float(0, 560))
        g.update(STEP)
      }
      const before = g.run ? { ...g.run } : null
      g.togglePause()          // forces a save
      if (!saved || !before) continue
      const g2 = new Game(saved, { seed: 'sf2' + trial, fast: true })
      expect(g2.grade).toBe(g.grade)
      if (g2.canResume()) {
        g2.resume()
        expect(g2.run!.coins).toBe(before.coins)
        expect(g2.run!.nets).toBe(before.nets)
        expect(g2.run!.levelNo).toBe(before.levelNo)
        expect(g2.run!.treasures.length).toBe(before.treasures.length)
        // The level must regenerate identically from its seed, or the clue words would lie.
        expect(g2.lvl!.level.clueWords).toEqual(g.lvl!.level.clueWords)
        invariants(g2, 'restored')
      }
    }
  })
})

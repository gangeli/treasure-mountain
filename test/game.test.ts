import { describe, it, expect } from 'vitest'
import { Game } from '../src/game/game'
import { STEP } from '../src/engine/loop'
import { wrapX, loopDelta } from '../src/game/layout'
import { STAR_THRESHOLDS } from '../src/game/world'
import { CASTLE_FLOORS, CASTLE_FLOOR_Y } from '../src/game/game'

function step(g: Game, seconds: number): void { const n = Math.ceil(seconds / STEP); for (let i = 0; i < n; i++) g.update(STEP) }

/** Plays one full ascent with a perfect player using the public API, teleporting to save time. */
export function playAscent(g: Game): void {
  expect(g.screen).toBe('clubhouse')
  g.pressButton('start')
  if (g.screen === 'intro') g.advanceScene()
  expect(g.screen).toBe('level')
  for (let levelNo = 1; levelNo <= 3; levelNo++) {
    const run = g.run!
    expect(run.levelNo).toBe(levelNo)
    let guard = 0
    while (g.cluesFound() < 3 && guard++ < 60) {
      const lvl = g.lvl!
      if (run.nets === 0) {
        const rock = lvl.level.features.find(f => f.type === 'netrock')!
        lvl.player.x = rock.x; lvl.player.state = 'idle'
        g.dropCoin(); step(g, 1)
      }
      const elf = lvl.elves.find(e => e.kind === 'scroll' && e.state === 'run')
      if (!elf) { step(g, 1); continue }
      lvl.player.x = wrapX(elf.x - 80); lvl.player.facing = 1; lvl.player.state = 'idle'; lvl.player.y = 0
      elf.speed = 0
      g.throwNet()
      step(g, 0.6)
      if (g.screen !== 'riddle') continue
      const rv = g.riddle!
      g.selectChoice(rv.riddle.answer, true)
      expect(rv.phase).toBe('right')
      g.riddleContinue()
      if ((g.screen as string) === 'clue') g.closeClue()
      expect(g.screen).toBe('level')
    }
    expect(g.cluesFound()).toBe(3)
    const lvl = g.lvl!
    for (const grp of lvl.level.groups.filter(gp => gp.hides)) {
      lvl.player.x = grp.x; lvl.player.state = 'idle'
      if (run.coins === 0) run.coins = 1
      g.dropCoin(); step(g, 1.2)
    }
    expect(run.hasKey).toBe(true)
    expect(run.treasures.length).toBe(lvl.level.treasures * levelNo)
    const exit = lvl.level.features.find(f => f.type === 'keyhole' || f.type === 'fountain' || f.type === 'castledoor')!
    lvl.player.x = exit.x; lvl.player.state = 'idle'
    g.useUp()
    expect(lvl.transition).toBeTruthy()
    step(g, 3)
    if (levelNo < 3) expect(g.screen).toBe('level')
  }
  expect(g.screen).toBe('castle')
  let guard = 0
  while (g.screen === 'castle' && guard++ < 400) {
    const c = g.castle!
    if (c.state === 'walk') {
      if (c.floor < 3) {
        const l = c.ladders.find(l => l.floor === c.floor && !l.trick)!
        c.x = l.x; g.held.add('ArrowUp'); step(g, 0.05); g.held.delete('ArrowUp')
      } else { c.x = 1050; g.held.add('ArrowUp'); step(g, 0.05); g.held.delete('ArrowUp') }
    }
    step(g, 0.5)
  }
  expect(g.screen).toBe('throne')
  step(g, 1)
  if (g.screen === 'throne') g.advanceScene()
  if (g.screen === 'throne') g.advanceScene()
  expect(g.screen).toBe('rank')
  g.advanceScene()
}

describe('game flow', () => {
  it('title -> grade -> clubhouse -> full ascent -> rank, for every grade', () => {
    for (let grade = 0; grade <= 5; grade++) {
      const g = new Game(null, { seed: 'flow-' + grade, fast: true })
      g.play(); expect(g.screen).toBe('grade')
      g.chooseGrade(grade as any); expect(g.screen).toBe('clubhouse')
      playAscent(g)
      const prof = g.profile()
      expect(prof.ascents).toBe(1)
      expect(prof.total).toBe(6)
      expect(prof.prizes.length).toBe(1)
      expect(g.screen).toBe('clubhouse')
    }
  })

  it('a player who fails every riddle still finishes (free nets, ground coins)', () => {
    const g = new Game(null, { seed: 'fail', fast: true })
    g.play(); g.chooseGrade(2)
    g.pressButton('start'); if (g.screen === 'intro') g.advanceScene()
    const run = g.run!, lvl = g.lvl!
    // Stand somewhere with no elf in reach and miss until the nets run out.
    for (const e of lvl.elves) e.speed = 0
    let far = 0
    for (let x = 0; x < 7680; x += 50) { const d = Math.min(...lvl.elves.map(e => Math.abs(loopDelta(x, e.x)))); if (d > 400) { far = x; break } }
    lvl.player.x = far
    let guard = 0
    while (run.nets > 0 && guard++ < 50) { g.throwNet(); step(g, 0.6); expect(g.screen).toBe('level') }
    expect(run.nets).toBe(0)
    run.coins = 0
    const rock = lvl.level.features.find(f => f.type === 'netrock')!
    lvl.player.x = rock.x; lvl.player.state = 'idle'
    g.dropCoin()
    expect(run.nets).toBe(5)
    run.nets = 0; run.coins = 0
    step(g, 0.2)
    expect(lvl.groundCoins.length).toBeGreaterThan(0)
    lvl.player.x = lvl.groundCoins[0].x; step(g, 0.1)
    expect(run.coins).toBe(1)
  })

  // Two tries at every grade, and always at least one fewer than there are choices: with three
  // tries against K's three buttons a child could rule out the other two and be handed the answer,
  // so the riddle could not be failed and the coins meant nothing.
  it('wrong answers: two tries at every grade, then the elf escapes without a clue', () => {
    for (const grade of [0, 1, 2, 3, 4, 5] as const) {
      const tries = 2
      const g = new Game(null, { seed: 'wrong' + grade, fast: true })
      g.play(); g.chooseGrade(grade); g.pressButton('start'); if (g.screen === 'intro') g.advanceScene()
      const lvl = g.lvl!, run = g.run!
      const elf = lvl.elves.find(e => e.kind === 'scroll')!
      elf.speed = 0
      lvl.player.x = wrapX(elf.x - 80); lvl.player.facing = 1
      g.throwNet(); step(g, 0.6)
      expect(g.screen).toBe('riddle')
      const rv = g.riddle!
      const coinsBefore = run.coins
      for (let t = 0; t < tries; t++) {
        const wrong = [0, 1, 2, 3].filter(i => i !== rv.riddle.answer && i < rv.riddle.choices.length && !rv.wrong.includes(i))[0]
        g.selectChoice(wrong, true)
        if (t < tries - 1) { expect(rv.phase).toBe('wrong'); step(g, 1.3); expect(rv.phase).toBe('ask') }
      }
      expect(rv.phase).toBe('reveal')
      expect(tries, `grade ${grade} gets ${tries} tries at ${rv.riddle.choices.length} choices`).toBeLessThan(rv.riddle.choices.length)
      g.riddleContinue()
      expect(g.screen).toBe('level')
      expect(g.cluesFound()).toBe(0)
      expect(run.coins).toBe(coinsBefore)
    }
  })

  it('save and restore keeps the run', () => {
    const g = new Game(null, { seed: 'save', fast: true })
    let saved: any = null
    g.onSave = d => { saved = JSON.parse(JSON.stringify(d)) }
    g.play(); g.chooseGrade(1); g.pressButton('start'); if (g.screen === 'intro') g.advanceScene()
    g.run!.coins = 9
    g.togglePause()
    expect(saved.lastRun.run.coins).toBe(9)
    const g2 = new Game(saved, { seed: 'save2', fast: true })
    expect(g2.canResume()).toBe(true)
    g2.resume()
    expect(g2.screen).toBe('level')
    expect(g2.run!.coins).toBe(9)
    expect(g2.lvl!.level.seed).toBe(g.lvl!.level.seed)
  })

  it('re-choosing the saved grade keeps the climb; another grade does not', () => {
    const g = new Game(null, { seed: 'keep', fast: true })
    let saved: any = null
    g.onSave = d => { saved = JSON.parse(JSON.stringify(d)) }
    g.play(); g.chooseGrade(2); g.pressButton('start'); if (g.screen === 'intro') g.advanceScene()
    g.togglePause()
    const g2 = new Game(saved, { seed: 'keep2', fast: true })
    g2.play(); g2.chooseGrade(2)
    expect(g2.canResume()).toBe(true)
    const g3 = new Game(saved, { seed: 'keep3', fast: true })
    g3.play(); g3.chooseGrade(4)
    expect(g3.canResume()).toBe(false)
  })

  it('rank thresholds award stars and the crown at 300', () => {
    const g = new Game(null, { seed: 'rank', fast: true })
    g.play(); g.chooseGrade(4)
    g.profile().total = 298
    playAscent(g)
    expect(g.profile().total).toBe(298 + 15) // five treasures per level at seven stars
    expect(g.profile().crown).toBe(true)
    expect(g.screen).toBe('crown')
    expect(STAR_THRESHOLDS.length).toBe(7)
  })

  it('tunnel teleports to the other mouth', () => {
    const g = new Game(null, { seed: 'tunnel', fast: true })
    g.play(); g.chooseGrade(2); g.pressButton('start'); if (g.screen === 'intro') g.advanceScene()
    const lvl = g.lvl!
    const [a, b] = lvl.level.features.filter(f => f.type === 'tunnel')
    lvl.player.x = a.x; lvl.player.state = 'idle'
    g.useUp(); step(g, 0.5)
    expect(Math.abs(loopDelta(lvl.player.x, b.x))).toBeLessThan(150)
  })
})

describe('the castle is always climbable', () => {
  /**
   * Walks the castle honestly - only taps, at the speed the player actually walks - and returns how
   * long it took. The old flow test teleported onto a good ladder, so it proved the state machine
   * worked but not that a child could get through: trick ladders and the Master's arm are exactly
   * the things that could wall a floor off, and neither was ever exercised.
   */
  function climb(g: Game, limitSeconds = 200): number {
    let t = 0
    while (g.screen === 'castle' && t < limitSeconds) {
      const c = g.castle!
      if (c.state === 'walk' && c.targetX == null) {
        if (c.floor === CASTLE_FLOORS - 1) {
          if (Math.abs(c.x - 1050) < 40) { g.held.add('ArrowUp'); step(g, 0.05); t += 0.05; g.held.delete('ArrowUp') }
          else g.tap(1050, CASTLE_FLOOR_Y(c.floor) - 40)
        } else {
          const here = c.ladders.filter(l => l.floor === c.floor)
          const good = here.filter(l => !l.trick)
          expect(good.length, `floor ${c.floor} has no real ladder`).toBeGreaterThan(0)
          const l = good.reduce((a, b) => (Math.abs(a.x - c.x) <= Math.abs(b.x - c.x) ? a : b))
          g.tap(l.x, CASTLE_FLOOR_Y(c.floor) - 40)
        }
      }
      step(g, 0.1); t += 0.1
    }
    return t
  }

  /** Puts a game straight into the castle at a chosen rank, without playing three levels first. */
  function atCastle(seed: string, total: number): Game {
    const g = new Game(null, { seed, fast: true })
    g.chooseGrade(2)
    g.profile().total = total
    g.pressButton('start')
    if (g.screen === 'intro') g.advanceScene()
    const run = g.run!
    run.hasKey = true
    const lvl = g.lvl!
    // Walk out of the third level through its exit, which is what opens the castle.
    g.startLevel(3, run.seed, false)
    g.run!.hasKey = true
    const l3 = g.lvl!
    const exit = l3.level.features.find(f => f.type === 'keyhole' || f.type === 'fountain' || f.type === 'castledoor')!
    l3.player.x = exit.x; l3.player.state = 'idle'
    g.useUp()
    step(g, 3)
    void lvl
    expect(g.screen).toBe('castle')
    return g
  }

  /** The smallest treasure total that earns exactly this many stars. */
  const totalFor = (stars: number): number => (stars === 0 ? 0 : STAR_THRESHOLDS[stars - 1])

  // Every rank, so both hazards are covered: trick ladders appear at 3 stars, the arm at 4.
  for (let stars = 0; stars <= STAR_THRESHOLDS.length; stars++) {
    it(`reaches the throne at ${stars} star${stars === 1 ? '' : 's'}`, () => {
      for (let seed = 0; seed < 60; seed++) {
        const g = atCastle(`castle-${stars}-${seed}`, totalFor(stars))
        // Guard against a vacuous pass: the hazards really are in this castle.
        expect(g.stars()).toBe(stars)
        expect(g.castle!.ladders.some(l => l.trick), 'trick ladders').toBe(stars >= 3)
        expect(g.castle!.holes.length > 0, 'holes').toBe(stars >= 4)
        // The Master's arm must never reach a ladder head: a hole at 450 or 830 caught the player
        // the moment they stepped off, with no move available that would have avoided it.
        for (const h of g.castle!.holes) {
          for (const l of g.castle!.ladders) {
            expect(Math.abs(h.x - l.x), `hole at ${h.x} is on the ladder at ${l.x}`).toBeGreaterThan(70)
          }
        }
        const took = climb(g)
        expect(g.screen, `stars ${stars} seed ${seed}: stuck after ${took.toFixed(0)}s on floor ${g.castle?.floor}`).toBe('throne')
        expect(took, `stars ${stars} seed ${seed} took ${took.toFixed(0)}s`).toBeLessThan(90)
      }
    })
  }
})

describe('the whole game is playable from the keyboard', () => {
  /** Holds a key for one simulated frame's worth of steps, the way a finger on a key would. */
  function hold(g: Game, key: string, seconds: number): void {
    g.keyDown(key)
    step(g, seconds)
    g.keyUp(key)
  }

  /** Walks toward a world x with the arrow keys until within `near`, or gives up. */
  function walkTo(g: Game, target: () => number | null, near: number, budget = 40): boolean {
    for (let i = 0; i < budget; i++) {
      const t = target()
      if (t == null) return false
      const p = g.lvl!.player
      const d = loopDelta(p.x, t)
      if (Math.abs(d) <= near) return true
      hold(g, d > 0 ? 'ArrowRight' : 'ArrowLeft', Math.min(0.9, Math.abs(d) / 300))
      step(g, 0.05)
      if (g.screen !== 'level') return true
    }
    return Math.abs(loopDelta(g.lvl!.player.x, target() ?? 0)) <= near
  }

  it('a full ascent at 2nd grade, using nothing but key presses', () => {
    const g = new Game(null, { seed: 'kb', fast: true })
    g.keyDown('Enter'); g.keyUp('Enter')            // title -> grade
    expect(g.screen).toBe('grade')
    g.keyDown('2'); g.keyUp('2')                    // grade -> clubhouse
    expect(g.screen).toBe('clubhouse')
    expect(g.grade).toBe(2)
    g.keyDown('Enter'); g.keyUp('Enter')            // clubhouse -> intro or level
    if (g.screen === 'intro') { g.keyDown('Enter'); g.keyUp('Enter') }
    expect(g.screen).toBe('level')

    const answer = (): void => {
      // 1-4 pick an answer, Enter carries on.
      const rv = g.riddle!
      const key = String(rv.riddle.answer + 1)
      g.keyDown(key); g.keyUp(key)
      step(g, 0.1)
      g.keyDown('Enter'); g.keyUp('Enter')
      step(g, 0.1)
      if (g.screen === 'clue') { g.keyDown('Enter'); g.keyUp('Enter'); step(g, 0.1) }
    }

    for (let levelNo = 1; levelNo <= 3; levelNo++) {
      expect(g.run!.levelNo).toBe(levelNo)
      // Clue words: walk to a scroll elf and swing.
      for (let guard = 0; g.cluesFound() < 3 && guard < 60; guard++) {
        if (g.screen === 'riddle') { answer(); continue }
        if (g.run!.nets === 0) {
          const rock = g.lvl!.level.features.find(f => f.type === 'netrock')!
          walkTo(g, () => rock.x, 30)
          hold(g, 'ArrowDown', 0.05); step(g, 1)
          continue
        }
        const elf = g.lvl!.elves.find(e => e.kind === 'scroll' && e.state === 'run')
        if (!elf) { step(g, 0.5); continue }
        walkTo(g, () => { const e = g.lvl!.elves.find(x => x.id === elf.id); return e && e.state === 'run' ? e.x : null }, 120, 25)
        if (g.screen === 'level') { hold(g, 'Space', 0.05); step(g, 0.8) }
        if ((g.screen as string) === 'riddle') answer()
      }
      expect(g.cluesFound(), `level ${levelNo} clue words`).toBe(3)

      // Dig: walk to each hiding group and drop a coin.
      for (const grp of g.lvl!.level.groups.filter(gp => gp.hides)) {
        if (g.run!.coins === 0) break
        walkTo(g, () => grp.x, 25)
        hold(g, 'ArrowDown', 0.05)
        step(g, 1.4)
      }
      expect(g.run!.hasKey, `level ${levelNo} key`).toBe(true)

      // Leave: walk to the exit and press up.
      const exit = g.lvl!.level.features.find(f => f.type === 'keyhole' || f.type === 'fountain' || f.type === 'castledoor')!
      walkTo(g, () => exit.x, 30)
      hold(g, 'ArrowUp', 0.05)
      step(g, 3)
    }

    expect(g.screen).toBe('castle')
    for (let guard = 0; g.screen === 'castle' && guard < 300; guard++) {
      const c = g.castle!
      if (c.state === 'walk') {
        const target = c.floor === CASTLE_FLOORS - 1 ? 1050 : c.ladders.filter(l => l.floor === c.floor && !l.trick).reduce((a, b) => Math.abs(a.x - c.x) <= Math.abs(b.x - c.x) ? a : b).x
        const d = target - c.x
        if (Math.abs(d) > 8) hold(g, d > 0 ? 'ArrowRight' : 'ArrowLeft', Math.min(0.6, Math.abs(d) / 300))
        else hold(g, 'ArrowUp', 0.05)
      }
      step(g, 0.2)
    }
    expect(g.screen).toBe('throne')
    for (let i = 0; i < 4 && g.screen === 'throne'; i++) { g.keyDown('Enter'); g.keyUp('Enter'); step(g, 0.3) }
    expect(g.screen).toBe('rank')
    g.keyDown('Enter'); g.keyUp('Enter')
    expect(['clubhouse', 'crown']).toContain(g.screen)
    expect(g.profile(2).total).toBe(6)
  })
})

describe('a half-finished climb can be picked up from the keyboard', () => {
  it('C on the clubhouse resumes, Enter starts fresh', () => {
    const g = new Game(null, { seed: 'kbresume', fast: true })
    g.keyDown('Enter'); g.keyUp('Enter')
    g.keyDown('2'); g.keyUp('2')
    g.keyDown('Enter'); g.keyUp('Enter')
    if (g.screen === 'intro') { g.keyDown('Enter'); g.keyUp('Enter') }
    expect(g.screen).toBe('level')
    // Leave mid-climb with some progress, the way closing the app would.
    step(g, 2)
    g.run!.coins = 9
    const saved = JSON.parse(JSON.stringify(g.toSave()))
    const h = new Game(saved, { seed: 'kbresume', fast: true })
    h.keyDown('Enter'); h.keyUp('Enter')
    h.keyDown('2'); h.keyUp('2')
    expect(h.screen).toBe('clubhouse')
    expect(h.canResume()).toBe(true)
    h.keyDown('c'); h.keyUp('c')
    expect(h.screen).toBe('level')
    expect(h.run!.coins).toBe(9)
  })
})

import { describe, it, expect } from 'vitest'
import { Game } from '../src/game/game'
import { STEP } from '../src/engine/loop'
import { wrapX, loopDelta } from '../src/game/layout'
import { STAR_THRESHOLDS } from '../src/game/world'

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
      if (g.screen === 'clue') g.closeClue()
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
      } else { c.x = 1150; g.held.add('ArrowUp'); step(g, 0.05); g.held.delete('ArrowUp') }
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

  it('wrong answers: two tries for grade 3, three for K, then the elf escapes without a clue', () => {
    for (const [grade, tries] of [[0, 3], [3, 2]] as const) {
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

  it('rank thresholds award stars and the crown at 300', () => {
    const g = new Game(null, { seed: 'rank', fast: true })
    g.play(); g.chooseGrade(4)
    g.profile().total = 298
    playAscent(g)
    expect(g.profile().total).toBe(298 + 18) // six treasures per level at seven stars
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

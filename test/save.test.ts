import { describe, it, expect } from 'vitest'
import { Game } from '../src/game/game'
import type { SaveData } from '../src/engine/storage'

const CASES: [string, any][] = [
  ['grade 99', { grade: 99, profiles: { 99: { grade: 99, total: 10, prizes: [], ascents: 1, crown: false } } }],
  ['grade -3', { grade: -3, profiles: {} }],
  ['grade string', { grade: 'two', profiles: {} }],
  ['profiles number', { grade: 2, profiles: 7 }],
  ['profile missing fields', { grade: 2, profiles: { 2: {} } }],
  ['total not a number', { grade: 2, profiles: { 2: { grade: 2, total: 'lots', prizes: null, ascents: null, crown: 1 } } }],
  ['lastRun junk', { grade: 2, profiles: {}, lastRun: { run: { levelNo: 9, coins: -5, nets: 'x' }, grade: 2, screen: 'nope' } }],
  ['settings junk', { grade: 2, profiles: {}, settings: 'loud' }],
]

describe('a real save round-trips', () => {
  it('resumes a climb in progress', () => {
    const g = new Game(null, { seed: 3, fast: true })
    g.pressButton('play')
    g.chooseGrade(2)
    g.pressButton('start')
    if (g.screen === 'intro') g.advanceScene()
    for (let i = 0; i < 300 && g.screen === 'level'; i++) g.update(1 / 60)
    g.profile().total = 42
    const save = g.toSave()
    const h = new Game(JSON.parse(JSON.stringify(save)), { seed: 3, fast: true })
    expect(h.grade).toBe(2)
    expect(h.profile(2).total).toBe(42)
    expect(h.canResume()).toBe(true)
    expect(h.run!.levelNo).toBe(g.run!.levelNo)
    expect(h.run!.coins).toBe(g.run!.coins)
    expect(h.firstRun).toBe(false)
  })

  it('keeps settings and prizes', () => {
    const g = new Game(null, { seed: 4, fast: true })
    g.settings.music = false
    g.chooseGrade(4)
    g.profile(4).prizes = ['kite', 'drum']
    g.profile(4).crown = true
    const h = new Game(JSON.parse(JSON.stringify(g.toSave())), { seed: 4, fast: true })
    expect(h.settings).toEqual({ sound: true, music: false })
    expect(h.profile(4).prizes).toEqual(['kite', 'drum'])
    expect(h.profile(4).crown).toBe(true)
  })
})

describe('corrupt saves', () => {
  for (const [name, raw] of CASES) {
    it(name, () => {
      const g = new Game({ ...raw } as SaveData, { seed: 1, fast: true })
      g.pressButton('play')
      g.pressButton('start')
      if (g.screen === 'intro') g.advanceScene()
      for (let i = 0; i < 400 && g.screen === 'level'; i++) g.update(1 / 60)
      expect(['level', 'riddle', 'clue', 'clubhouse', 'intro', 'grade', 'title']).toContain(g.screen)
    })
  }
})

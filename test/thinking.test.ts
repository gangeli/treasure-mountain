import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { THINKING } from '../src/content/generators/thinking'
import { standardChecks } from './helpers'
import type { Fact } from '../src/content/generators/thinkingUtil'
import { wrap } from '../src/content/generators/thinkingUtil'
import { EARTHSKY_FACTS } from '../src/content/data/earthsky'
import { BODY_FACTS } from '../src/content/data/body'
import { MATTER_FACTS } from '../src/content/data/matter'
import { ANIMALS, ANIMAL_FACTS } from '../src/content/data/animals'
import { RIDDLES } from '../src/content/data/riddles'
import { ODD_SETS } from '../src/content/data/oddoneout'
import { SEQUENCES, CAUSE_EFFECT } from '../src/content/data/events'
import { THINGS } from '../src/content/data/comparisons'
import { logicPuzzle, type Clue } from '../src/content/generators/events'

describe('thinking generators', () => {
  standardChecks(THINKING, it, expect)
})

const lower = (s: string) => s.trim().toLowerCase()

/** Answer non-empty, >= 3 distinct decoys, no decoy equals the answer, level in range, texts fit the scroll. */
function checkChoices(name: string, entries: { a: string; d: string[]; level: number }[], minLevel: number, maxLevel: number): string[] {
  const errs: string[] = []
  entries.forEach((e, i) => {
    const tag = `${name}[${i}] (${e.a})`
    if (!e.a || !e.a.trim()) errs.push(`${tag}: empty answer`)
    if (e.a.length > 26) errs.push(`${tag}: answer too long`)
    const ds = new Set(e.d.map(lower))
    if (ds.size < 3) errs.push(`${tag}: fewer than 3 distinct decoys`)
    if (ds.has(lower(e.a))) errs.push(`${tag}: a decoy equals the answer`)
    for (const d of e.d) if (!d.trim()) errs.push(`${tag}: blank decoy`)
    for (const d of e.d) if (d.length > 26) errs.push(`${tag}: decoy too long: ${d}`)
    if (!Number.isInteger(e.level) || e.level < minLevel || e.level > maxLevel) errs.push(`${tag}: level ${e.level} out of ${minLevel}..${maxLevel}`)
  })
  return errs
}

function perLevel(entries: { level: number }[], levels: number[], min: number, name: string): string[] {
  return levels.filter(l => entries.filter(e => e.level === l).length < min).map(l => `${name}: only ${entries.filter(e => e.level === l).length} entries at level ${l} (need ${min})`)
}

describe('thinking data integrity', () => {
  const factTables: [string, Fact[], number][] = [
    ['earthsky', EARTHSKY_FACTS, 60], ['body', BODY_FACTS, 50], ['matter', MATTER_FACTS, 50], ['animal facts', ANIMAL_FACTS, 40], ['cause and effect', CAUSE_EFFECT, 14],
  ]
  for (const [name, facts, min] of factTables) {
    it(`${name}: answers, decoys and levels are sound`, () => {
      expect(facts.length, `${name} has ${facts.length} entries`).toBeGreaterThanOrEqual(min)
      expect(checkChoices(name, facts, 0, 5)).toEqual([])
      const long = facts.flatMap(f => wrap(f.q)).filter(l => l.length > 46)
      expect(long).toEqual([])
      const qs = facts.map(f => lower(f.q))
      expect(new Set(qs).size, `${name}: duplicate questions`).toBe(qs.length)
    })
  }
  it('fact tables cover every grade with enough variety', () => {
    const errs = [...perLevel(EARTHSKY_FACTS, [0, 1, 2, 3, 4, 5], 12, 'earthsky'), ...perLevel(BODY_FACTS, [0, 1, 2, 3, 4, 5], 12, 'body'), ...perLevel(MATTER_FACTS, [0, 1, 2, 3, 4, 5], 12, 'matter'), ...perLevel(ANIMAL_FACTS, [2, 3, 4, 5], 12, 'animal facts')]
    expect(errs).toEqual([])
  })
  it('riddles: >= 100 entries, plausible decoys, short lines', () => {
    expect(RIDDLES.length).toBeGreaterThanOrEqual(100)
    expect(checkChoices('riddles', RIDDLES, 0, 5)).toEqual([])
    expect(perLevel(RIDDLES, [0, 1, 2, 3, 4, 5], 12, 'riddles')).toEqual([])
    const long = RIDDLES.flatMap(r => r.lines).filter(l => l.length > 46)
    expect(long).toEqual([])
    for (const r of RIDDLES) expect(r.lines.length, r.a).toBeLessThanOrEqual(4)
  })
  it('odd one out: >= 60 sets, the odd item is never among the others', () => {
    expect(ODD_SETS.length).toBeGreaterThanOrEqual(60)
    const errs: string[] = []
    ODD_SETS.forEach(s => {
      if (s.others.length < 3) errs.push(`${s.odd}: fewer than 3 others`)
      if (new Set(s.others.map(lower)).size !== s.others.length) errs.push(`${s.odd}: duplicate others`)
      if (s.others.map(lower).includes(lower(s.odd))) errs.push(`${s.odd}: odd item is among the others`)
      if (s.level < 1 || s.level > 5) errs.push(`${s.odd}: level ${s.level}`)
      if (s.level >= 3 && s.others.length < 4) errs.push(`${s.odd}: needs 4 others for four choices`)
      for (const w of [s.odd, ...s.others]) if (w.length > 26) errs.push(`${s.odd}: too long ${w}`)
    })
    expect(errs).toEqual([])
    expect(perLevel(ODD_SETS, [1, 2, 3, 4, 5], 12, 'odd one out')).toEqual([])
  })
  it('animals: >= 60 animals with distinct names and >= 40 fact questions', () => {
    expect(ANIMALS.length).toBeGreaterThanOrEqual(60)
    expect(new Set(ANIMALS.map(a => a.n)).size).toBe(ANIMALS.length)
    expect(ANIMALS.filter(a => a.sound).length).toBeGreaterThanOrEqual(15)
    expect(ANIMALS.filter(a => a.baby).length).toBeGreaterThanOrEqual(30)
    expect(ANIMALS.filter(a => a.home).length).toBeGreaterThanOrEqual(15)
    expect(ANIMALS.filter(a => a.group).length).toBeGreaterThanOrEqual(12)
    expect(ANIMAL_FACTS.length).toBeGreaterThanOrEqual(40)
  })
  it('sequences: >= 40 with distinct, short steps', () => {
    expect(SEQUENCES.length).toBeGreaterThanOrEqual(40)
    const errs: string[] = []
    for (const s of SEQUENCES) {
      if (s.steps.length < 2) errs.push(`${s.topic}: too few steps`)
      if (new Set(s.steps.map(lower)).size !== s.steps.length) errs.push(`${s.topic}: duplicate steps`)
      for (const st of s.steps) if (st.length > 26) errs.push(`${s.topic}: step too long: ${st}`)
      if (s.level < 0 || s.level > 3) errs.push(`${s.topic}: level ${s.level}`)
    }
    expect(errs).toEqual([])
    expect(perLevel(SEQUENCES, [0, 1, 2, 3], 12, 'sequences')).toEqual([])
  })
  it('comparisons: >= 60 things with positive values', () => {
    expect(THINGS.length).toBeGreaterThanOrEqual(60)
    for (const t of THINGS) {
      expect(t.n.length).toBeLessThanOrEqual(26)
      for (const v of [t.len, t.mass, t.speed]) if (v !== undefined) expect(v, t.n).toBeGreaterThan(0)
      expect(t.len !== undefined || t.mass !== undefined || t.speed !== undefined, t.n).toBe(true)
    }
  })
})

// ---- Independent solver for the grade-5 logic puzzles (does not reuse the generator's solver).
function perms<T>(a: T[]): T[][] { return a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map(r => [x, ...r])) }
function holds(c: Clue, as: Record<string, string>, items: string[]): boolean {
  const r = (n: string) => items.indexOf(as[n])
  if (c.kind === 'is') return as[c.who] === c.what
  if (c.kind === 'not') return as[c.who] !== c.what
  if (c.kind === 'before') return r(c.a) < r(c.b)
  return r(c.a) === r(c.b) + 1
}

describe('events logic puzzles', () => {
  for (const tier of [1, 2, 3] as const) {
    it(`tier ${tier}: every puzzle has exactly one solution and the stated answer`, () => {
      const rng = new Rng('logic-' + tier)
      for (let i = 0; i < 300; i++) {
        const p = logicPuzzle(rng, tier)
        const solutions = perms(p.items).map(perm => Object.fromEntries(p.names.map((n, k) => [n, perm[k]]))).filter(as => p.clues.every(c => holds(c, as, p.items)))
        expect(solutions.length, `${p.lines.join(' ')} ${p.question}`).toBe(1)
        const sol = solutions[0]
        const expected = p.ask[0] === 'who' ? p.names.find(n => sol[n] === p.ask[1]) : sol[p.ask[1]]
        expect(p.answer, `${p.lines.join(' ')} ${p.question}`).toBe(expected)
        expect(p.decoys).not.toContain(p.answer)
        expect(p.decoys.length).toBeGreaterThanOrEqual(3)
        expect(p.lines.length + 1).toBeLessThanOrEqual(6)
      }
    })
  }
})

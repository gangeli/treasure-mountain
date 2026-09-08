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
import { THINGS, THING_BY_NAME, marginFor, EST_MARGIN, QTY_MARGIN, type Attr, type Thing } from '../src/content/data/comparisons'
import { comparisons } from '../src/content/generators/comparisons'
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

// ---- Comparisons: every riddle must have exactly one defensible answer. Real-world sizes vary, so
// the answer has to beat every decoy by a wide margin on the quantity being compared. Everything
// below is recomputed from the data by hand; none of it reuses the generator's own helpers.

/** The word in the skill tag says what was compared and which end wins. */
const COMPARED: Record<string, { attr: Attr; most: boolean }> = {
  bigger: { attr: 'len', most: true }, biggest: { attr: 'len', most: true }, smallest: { attr: 'len', most: false },
  longer: { attr: 'len', most: true }, longest: { attr: 'len', most: true }, shortest: { attr: 'len', most: false },
  taller: { attr: 'len', most: true }, tallest: { attr: 'len', most: true },
  heavier: { attr: 'mass', most: true }, heaviest: { attr: 'mass', most: true }, lightest: { attr: 'mass', most: false },
  faster: { attr: 'speed', most: true }, fastest: { attr: 'speed', most: true }, slowest: { attr: 'speed', most: false },
}

const METRES: Record<string, number> = { mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, inches: 0.0254, foot: 0.3048, feet: 0.3048, mile: 1609.34, miles: 1609.34 }
const KILOS: Record<string, number> = { g: 0.001, kg: 1, 'metric ton': 1000, 'metric tons': 1000, ounce: 0.02835, ounces: 0.02835, pound: 0.45359, pounds: 0.45359, ton: 907.18, tons: 907.18 }
const KMH: Record<string, number> = { 'km/h': 1, mph: 1.60934 }
/** "6 feet" -> 1.83, "2 metric tons" -> 2000, "80 km/h" -> 80. Null when it is not a measurement. */
function amountOf(text: string): number | null {
  const m = /^([0-9]+(?:\.[0-9]+)?) (.+)$/.exec(text.trim())
  if (!m) return null
  const scale = METRES[m[2]] ?? KILOS[m[2]] ?? KMH[m[2]]
  return scale === undefined ? null : Number(m[1]) * scale
}

const COUNT_WORDS: Record<string, number> = { two: 2, three: 3, four: 4, five: 5, ten: 10, twenty: 20, fifty: 50, 'one hundred': 100 }
/** Reads "one bus" / "twenty cows" back to the kilograms it stands for. */
function sideMass(text: string): number | null {
  const many = THINGS.find(x => x.plural && text.endsWith(' ' + x.plural))
  if (many) {
    const k = COUNT_WORDS[text.slice(0, text.length - many.plural!.length - 1)]
    if (k !== undefined) return k * many.mass!
  }
  // "one sheep" reads like a plural, so the single-item form is tried second.
  const one = text.startsWith('one ') ? THINGS.find(x => x.n.replace(/^an? /, '') === text.slice(4)) : undefined
  return one?.mass ?? null
}

describe('comparisons: one defensible answer', () => {
  const SEEDS = 300
  const draw = (grade: number, tier: number) => {
    const rng = new Rng(`margin-${grade}-${tier}`)
    return Array.from({ length: SEEDS }, () => comparisons.make(grade as any, tier as any, rng))
  }
  const shown = (r: { prompt: string[]; choices: { text?: string }[]; answer: number }) => `${r.prompt.join(' / ')} [${r.choices.map(c => c.text).join(' | ')}] answer=${r.choices[r.answer].text}`

  for (const grade of [0, 1, 2, 3, 4, 5]) {
    for (const tier of [1, 2, 3]) {
      it(`grade ${grade} tier ${tier}: the answer beats every decoy by ${marginFor(grade as any)}x`, () => {
        const errs: string[] = []
        for (const r of draw(grade, tier)) {
          const word = /^thinking: comparing \((\w+)\)$/.exec(r.skill)?.[1]
          if (!word) continue
          const cmp = COMPARED[word]
          if (!cmp) { errs.push(`unknown comparison word "${word}"`); continue }
          const answer = THING_BY_NAME[r.choices[r.answer].text ?? '']
          if (!answer) { errs.push(`answer is not a thing: ${shown(r)}`); continue }
          const decoys = r.choices.filter((_, i) => i !== r.answer).map(c => THING_BY_NAME[c.text ?? '']).filter(Boolean) as Thing[]
          if (decoys.length === 0) { errs.push(`no real decoy: ${shown(r)}`); continue }
          for (const d of decoys) {
            const a = answer[cmp.attr], b = d[cmp.attr]
            if (a === undefined || b === undefined) { errs.push(`missing ${cmp.attr}: ${shown(r)}`); continue }
            const ratio = cmp.most ? a / b : b / a
            if (ratio < marginFor(grade as any)) errs.push(`only ${ratio.toFixed(1)}x on ${cmp.attr}: ${shown(r)}`)
          }
        }
        expect(errs.slice(0, 4)).toEqual([])
      })

      it(`grade ${grade} tier ${tier}: estimation decoys are ${EST_MARGIN}x away, quantities ${QTY_MARGIN}x`, () => {
        const errs: string[] = []
        for (const r of draw(grade, tier)) {
          if (r.skill === 'thinking: estimating') {
            const values = r.choices.map(c => amountOf(c.text ?? ''))
            if (values.some(v => v === null)) { errs.push(`unreadable choice: ${shown(r)}`); continue }
            const a = values[r.answer]!
            values.forEach((v, i) => {
              if (i === r.answer) return
              const ratio = Math.max(a, v!) / Math.min(a, v!)
              if (ratio < EST_MARGIN) errs.push(`decoy only ${ratio.toFixed(1)}x from the answer: ${shown(r)}`)
            })
          }
          if (r.skill === 'thinking: reasoning with quantities' && r.prompt[0] === 'Which is heavier:') {
            const [left, right] = r.prompt[1].replace(/\?$/, '').split(' or ')
            const a = sideMass(left), b = sideMass(right)
            if (a === null || b === null) { errs.push(`unreadable sides: ${shown(r)}`); continue }
            const ratio = Math.max(a, b) / Math.min(a, b)
            if (ratio < QTY_MARGIN) errs.push(`sides only ${ratio.toFixed(1)}x apart: ${shown(r)}`)
            const winner = a > b ? left : right
            if (r.choices[r.answer].text !== winner) errs.push(`wrong side marked correct: ${shown(r)}`)
          }
        }
        expect(errs.slice(0, 4)).toEqual([])
      })
    }
  }
})

describe('comparisons data: one referent per name', () => {
  it('no name covers things of wildly different size', () => {
    // Each of these was a real ambiguity: a stepladder vs an extension ladder, a party balloon vs a
    // hot-air balloon, a kick scooter vs a Vespa, a dogfish vs a great white, a pet tortoise vs a
    // giant one, a half-litre bottle vs a litre, an ordinary tree vs a redwood, a bungalow vs a
    // two-storey house. Keep the specific names.
    const banned = ['a ladder', 'a balloon', 'a scooter', 'a shark', 'a tortoise', 'a tall tree', 'a tree', 'a house', 'a bottle of water', 'a dog', 'a bear', 'a penguin', 'a swimming pool', 'a rowing boat', 'a bath tub']
    expect(THINGS.map(t => t.n).filter(n => banned.includes(n))).toEqual([])
    expect(new Set(THINGS.map(t => t.n)).size).toBe(THINGS.length)
  })
  it('estimation only asks about values a child could know', () => {
    const errs: string[] = []
    for (const t of THINGS) {
      for (const a of t.est ?? []) if (t[a] === undefined) errs.push(`${t.n}: est lists ${a} but has no value`)
      if (t.plural && t.mass === undefined) errs.push(`${t.n}: plural but no mass`)
      if (t.tall && t.len === undefined) errs.push(`${t.n}: tall but no height`)
    }
    expect(errs).toEqual([])
    // Enough well-known values left in the pool to keep estimation varied.
    for (const a of ['len', 'mass', 'speed'] as Attr[]) {
      expect(THINGS.filter(t => (t.est ?? []).includes(a)).length, `only a few things can be estimated by ${a}`).toBeGreaterThanOrEqual(10)
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

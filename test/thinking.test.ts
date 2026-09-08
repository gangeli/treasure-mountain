import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { THINKING } from '../src/content/generators/thinking'
import { standardChecks } from './helpers'
import type { Fact } from '../src/content/generators/thinkingUtil'
import { wrap } from '../src/content/generators/thinkingUtil'
import { EARTHSKY_FACTS } from '../src/content/data/earthsky'
import { BODY_FACTS } from '../src/content/data/body'
import { MATTER_FACTS } from '../src/content/data/matter'
import { ANIMALS, ANIMAL_FACTS, ANIMAL_CLAIMS, CREATURE_WORDS, KNOWN_BABIES, type Animal } from '../src/content/data/animals'
import { RIDDLES } from '../src/content/data/riddles'
import { ODD_SETS, ODD_TRAITS, type OddSet } from '../src/content/data/oddoneout'
import { oddoneout } from '../src/content/generators/oddoneout'
import { animals, HABITAT_TEXT, CLASS_TEXT } from '../src/content/generators/animals'
import { an, numberWord } from '../src/content/types'
import { SEQUENCES, CAUSE_EFFECT, CAUSE_SIMPLE, CAUSE_MEDIUM, CAUSE_HARD, type Sequence } from '../src/content/data/events'
import { THINGS, THING_BY_NAME, marginFor, EST_MARGIN, QTY_MARGIN, type Attr, type Thing } from '../src/content/data/comparisons'
import { comparisons } from '../src/content/generators/comparisons'
import { events, logicPuzzle, logicSpec, type Clue } from '../src/content/generators/events'
import { matter } from '../src/content/generators/matter'
import { body } from '../src/content/generators/body'
import { earthsky } from '../src/content/generators/earthsky'
import { riddles } from '../src/content/generators/riddles'
import { type RiddleEntry } from '../src/content/data/riddles'
import type { Generator } from '../src/content/types'

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
    ['earthsky', EARTHSKY_FACTS, 60], ['body', BODY_FACTS, 50], ['matter', MATTER_FACTS, 50], ['animal facts', ANIMAL_FACTS, 40], ['cause and effect', CAUSE_EFFECT, 40],
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
      if (`Hint: most of these ${s.why}.`.length > 46) errs.push(`${s.odd}: hint does not fit one line`)
    })
    expect(errs).toEqual([])
    expect(perLevel(ODD_SETS, [1, 2, 3, 4, 5], 12, 'odd one out')).toEqual([])
  })
  it('odd one out: every (grade, tier) owns its own sets, deep enough to stay varied', () => {
    const errs: string[] = []
    for (const level of [1, 2, 3, 4, 5]) for (const band of [1, 2, 3]) {
      const bucket = ODD_SETS.filter(s => s.level === level && s.band === band)
      if (bucket.length < 4) errs.push(`level ${level} band ${band}: only ${bucket.length} sets`)
      const odds = bucket.map(s => lower(s.odd))
      if (new Set(odds).size !== odds.length) errs.push(`level ${level} band ${band}: two sets share an odd item`)
    }
    // A category set may not be reused by another tier or another grade (the critique found
    // cup/gram/litre in all three grade-4 tiers and ant-among-fliers seven times over two grades).
    const sig = (s: typeof ODD_SETS[number]) => [lower(s.odd), ...s.others.map(lower).sort()].join('|')
    const seen = new Map<string, string>()
    for (const s of ODD_SETS) {
      const here = `${s.level}.${s.band}`
      const before = seen.get(sig(s))
      if (before) errs.push(`${s.odd}: same set at ${before} and ${here}`)
      else seen.set(sig(s), here)
      const attrKey = `${s.level}.${s.band}|${s.attr}`
      if (seen.has(attrKey)) errs.push(`${s.odd}: attribute ${s.attr} asked twice in tier ${here}`)
      else seen.set(attrKey, here)
    }
    expect(errs).toEqual([])
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
  it('sequences: >= 40 with distinct, short steps and honest alternative orders', () => {
    expect(SEQUENCES.length).toBeGreaterThanOrEqual(40)
    const errs: string[] = []
    for (const s of SEQUENCES) {
      // Three steps is the floor: a K item needs the answer plus two same-scenario decoys.
      if (s.steps.length < 3) errs.push(`${s.topic}: too few steps`)
      if (new Set(s.steps.map(lower)).size !== s.steps.length) errs.push(`${s.topic}: duplicate steps`)
      for (const st of s.steps) if (st.length > 26) errs.push(`${s.topic}: step too long: ${st}`)
      if (s.level < 0 || s.level > 3) errs.push(`${s.topic}: level ${s.level}`)
      const sorted = [...s.steps].sort().join('|')
      for (const alt of s.alts ?? []) {
        if ([...alt].sort().join('|') !== sorted) errs.push(`${s.topic}: alt is not a permutation of steps`)
        if (alt.join('|') === s.steps.join('|')) errs.push(`${s.topic}: alt repeats the canonical order`)
      }
      if (s.cyclic && (s.alts ?? []).length) errs.push(`${s.topic}: a cycle should not carry alts`)
    }
    expect(errs).toEqual([])
    expect(perLevel(SEQUENCES, [0, 1, 2, 3], 12, 'sequences')).toEqual([])
    // Topics identify a scenario inside a level (the riddle key relies on it).
    for (const level of [0, 1, 2, 3]) {
      const topics = SEQUENCES.filter(s => s.level === level).map(s => s.topic)
      expect(new Set(topics).size, `level ${level} has duplicate topics`).toBe(topics.length)
    }
    // K needs both sizes: 3-step scenarios for tiers 1-2, 4-step ones for tier 3.
    expect(SEQUENCES.filter(s => s.level === 0 && s.steps.length === 3).length).toBeGreaterThanOrEqual(12)
    expect(SEQUENCES.filter(s => s.level === 0 && s.steps.length >= 4).length).toBeGreaterThanOrEqual(6)
    // Grade 3 shows four choices, so a next/before question needs five steps to fill them.
    expect(SEQUENCES.filter(s => s.level === 3 && s.steps.length >= 5).length).toBeGreaterThanOrEqual(12)
  })
  it('cause and effect: three disjoint tier bands, no British spellings', () => {
    for (const [name, band] of [['simple', CAUSE_SIMPLE], ['medium', CAUSE_MEDIUM], ['hard', CAUSE_HARD]] as [string, typeof CAUSE_SIMPLE][]) {
      expect(band.length, `${name} band is thin`).toBeGreaterThanOrEqual(13)
      for (const f of band) expect(f.level, f.q).toBe(4)
    }
    const qs = [CAUSE_SIMPLE, CAUSE_MEDIUM, CAUSE_HARD].map(b => new Set(b.map(f => lower(f.q))))
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
      expect([...qs[i]].filter(q => qs[j].has(q)), 'bands share an item').toEqual([])
    }
    // US spelling and idiom: this is a US game (the critique found pyjamas / mouldy / tyre / post it).
    const banned = /\b(pyjamas?|mould\w*|tyres?|post it|petrol|fuel|colour\w*|grey)\b/i
    const texts = [
      ...SEQUENCES.flatMap(s => [s.topic, s.title ?? '', ...s.steps]),
      ...CAUSE_EFFECT.flatMap(f => [f.q, f.a, ...f.d]),
    ]
    expect(texts.filter(t => banned.test(t))).toEqual([])
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
  // Big amounts are written with thousands separators ("15,000 metric tons"), like everywhere else.
  const m = /^([0-9]+(?:\.[0-9]+)?) (.+)$/.exec(text.trim().replace(/,/g, ''))
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

/** Names a child could mix up while holding a puzzle in working memory. Recomputed, not imported. */
function tooAlike(a: string, b: string): boolean {
  const x = a.toLowerCase(), y = b.toLowerCase()
  if (x[0] === y[0] || x.slice(-2) === y.slice(-2)) return true
  if (x.length !== y.length) return false
  let diff = 0
  for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) diff++
  return diff <= 1
}

describe('events logic puzzles', () => {
  const solve = (names: string[], items: string[], clues: Clue[]) =>
    perms(items).map(perm => Object.fromEntries(names.map((n, k) => [n, perm[k]]))).filter(as => clues.every(c => holds(c, as, items)))

  // Grade 4 tier 3 mixes in the plain comparison chain; grade 5 is deduction throughout.
  for (const [grade, tier] of [[4, 3], [5, 1], [5, 2], [5, 3]] as const) {
    it(`grade ${grade} tier ${tier}: one solution, no redundant clue, no defensible decoy`, () => {
      const rng = new Rng(`logic-${grade}-${tier}`)
      const spec = logicSpec(grade, tier)
      const errs: string[] = []
      for (let i = 0; i < 300; i++) {
        const p = logicPuzzle(rng, spec)
        const shown = `${p.lines.join(' ')} ${p.question}`
        const solutions = solve(p.names, p.items, p.clues)
        if (solutions.length !== 1) { errs.push(`${solutions.length} solutions: ${shown}`); continue }
        const sol = solutions[0]
        // The stated answer is the one the clues force.
        const expected = p.ask[0] === 'who' ? p.names.find(n => sol[n] === p.ask[1]) : sol[p.ask[1]]
        if (p.answer !== expected) errs.push(`answer ${p.answer} != ${expected}: ${shown}`)
        // Minimal: drop any one clue and the puzzle stops being decidable.
        p.clues.forEach((_, j) => {
          const without = solve(p.names, p.items, p.clues.filter((__, k) => k !== j))
          if (without.length <= 1) errs.push(`clue ${j} is implied by the others: ${shown}`)
        })
        // Every decoy is a real name/item of the puzzle and none of them solves it.
        const universe = p.ask[0] === 'who' ? p.names : p.items
        for (const d of p.decoys) {
          if (!universe.includes(d)) errs.push(`decoy "${d}" is not in the puzzle: ${shown}`)
          if (d === p.answer) errs.push(`decoy repeats the answer: ${shown}`)
        }
        if (p.decoys.length < 3) errs.push(`only ${p.decoys.length} decoys: ${shown}`)
        // The question may not restate a clue.
        for (const c of p.clues) {
          if (c.kind !== 'is') continue
          if (p.ask[0] === 'who' && c.what === p.ask[1]) errs.push(`question restates a clue: ${shown}`)
          if (p.ask[0] === 'what' && c.who === p.ask[1]) errs.push(`question restates a clue: ${shown}`)
        }
        // ...and it must need the whole clue set: the clues touching the asked name (or the asked
        // place/object) alone must not already pin it, or the item is just "cross off three boxes".
        const [side, target] = p.ask
        const local = p.clues.filter(c => c.kind === 'is' || c.kind === 'not'
          ? (side === 'what' ? c.who === target : c.what === target)
          : side === 'what' && (c.a === target || c.b === target))
        const cell = (as: Record<string, string>) => side === 'who' ? p.names.find(n => as[n] === target) : as[target]
        if (new Set(solve(p.names, p.items, local).map(cell)).size <= 1) errs.push(`answerable from one row: ${shown}`)
        // Names must not be confusable, and the whole thing must fit the scroll.
        for (const a of p.names) for (const b of p.names) if (a !== b && tooAlike(a, b)) errs.push(`${a}/${b} look alike: ${shown}`)
        if (p.lines.length + 1 > 6) errs.push(`${p.lines.length + 1} prompt lines: ${shown}`)
        for (const l of [...p.lines, p.question]) if (l.length > 46) errs.push(`line too long (${l.length}): ${l}`)
        if (spec.kinds.includes(p.kind) === false) errs.push(`unexpected kind ${p.kind} at grade ${grade} tier ${tier}`)
      }
      expect(errs.slice(0, 4)).toEqual([])
    })
  }
})

// ---- Sequencing: the data lists every order an adult would accept, and a question is only fair
// when all of them agree. Re-derived here straight from SEQUENCES, not from the generator.

const SEQ_BY = new Map(SEQUENCES.map(s => [`${s.level}|${s.topic}`, s]))
const ordersOf = (s: Sequence): string[][] => [s.steps, ...(s.alts ?? [])]

/** Every step that answers `mode` (relative to `ref`) under at least one accepted order. */
function defensibleAnswers(s: Sequence, mode: string, ref: string): string[] {
  const out = new Set<string>()
  for (const order of ordersOf(s)) {
    if (mode === 'first' || mode === 'last') {
      if (s.cyclic) return []
      out.add(mode === 'first' ? order[0] : order[order.length - 1])
      continue
    }
    const i = order.indexOf(ref)
    if (i < 0) return []
    if (mode === 'next') { if (i === order.length - 1) return []; out.add(order[i + 1]) }
    else { if (i === 0) return []; out.add(order[i - 1]) }
  }
  return [...out]
}

describe('events sequencing: exactly one defensible order', () => {
  for (const grade of [0, 1, 2, 3] as const) {
    for (const tier of [1, 2, 3] as const) {
      it(`grade ${grade} tier ${tier}: the answer is forced and no decoy is an accepted alternative`, () => {
        const rng = new Rng(`seq-${grade}-${tier}`)
        const errs: string[] = []
        for (let i = 0; i < 300; i++) {
          const r = events.make(grade, tier, rng)
          const [family, kind, level, topic, mode, ref] = r.key.split('|')
          const shown = `${r.prompt.join(' / ')} [${r.choices.map(c => c.text).join(' | ')}]`
          expect(family).toBe('events')
          if (kind !== 'seq') { errs.push(`grade ${grade} produced a ${kind} item`); continue }
          const seq = SEQ_BY.get(`${level}|${topic}`)
          if (!seq) { errs.push(`unknown scenario ${level}|${topic}`); continue }
          const accepted = defensibleAnswers(seq, mode, ref ?? '')
          if (accepted.length !== 1) { errs.push(`${accepted.length} defensible answers: ${shown}`); continue }
          if (r.choices[r.answer].text !== accepted[0]) errs.push(`marked ${r.choices[r.answer].text}, forced ${accepted[0]}: ${shown}`)
          r.choices.forEach((c, j) => {
            if (j === r.answer) return
            if (accepted.includes(c.text!)) errs.push(`decoy "${c.text}" is also a defensible answer: ${shown}`)
            if (!seq.steps.includes(c.text!)) errs.push(`decoy "${c.text}" comes from another scenario: ${shown}`)
            if (c.text === ref) errs.push(`decoy repeats the step named in the prompt: ${shown}`)
          })
        }
        expect(errs.slice(0, 4)).toEqual([])
      })
    }
  }
})

describe('events: tiers stay apart and no catch-all choices', () => {
  const keysOf = (grade: number, tier: number) => {
    const rng = new Rng(`band-${grade}-${tier}`)
    const keys = new Set<string>()
    for (let i = 0; i < 300; i++) keys.add(events.make(grade as any, tier as any, rng).key)
    return keys
  }
  it('no tier of a grade reuses an item from another tier of that grade', () => {
    const errs: string[] = []
    for (const grade of [0, 1, 2, 3, 4]) {
      const [a, b, c] = [keysOf(grade, 1), keysOf(grade, 2), keysOf(grade, 3)]
      for (const [x, y, tag] of [[a, b, '1/2'], [a, c, '1/3'], [b, c, '2/3']] as [Set<string>, Set<string>, string][]) {
        const shared = [...x].filter(k => y.has(k))
        if (shared.length) errs.push(`grade ${grade} tiers ${tag} share ${shared.length}: ${shared[0]}`)
      }
    }
    expect(errs).toEqual([])
  })
  it('never offers "cannot tell" or "both at the same time"', () => {
    const bad = /cannot tell|both at the same time|none of (these|the above)/i
    const errs: string[] = []
    for (const grade of [0, 1, 2, 3, 4, 5]) for (const tier of [1, 2, 3]) {
      const rng = new Rng(`catchall-${grade}-${tier}`)
      for (let i = 0; i < 200; i++) {
        const r = events.make(grade as any, tier as any, rng)
        for (const c of r.choices) if (c.text && bad.test(c.text)) errs.push(`${grade}/${tier}: ${c.text}`)
      }
    }
    expect(errs.slice(0, 3)).toEqual([])
  })
  it('each grade owns one skill band and the metric bands do not overlap the neighbours', () => {
    const skills = (grade: number) => {
      const rng = new Rng(`skill-${grade}`)
      const out = new Set<string>()
      for (const tier of [1, 2, 3]) for (let i = 0; i < 120; i++) out.add(events.make(grade as any, tier as any, rng).skill)
      return out
    }
    expect([...skills(0)]).toEqual(['thinking: sequencing'])
    expect([...skills(1)]).toEqual(['thinking: sequencing'])
    expect([...skills(2)].sort()).toEqual(['science: how plants grow', 'science: life cycles'])
    expect([...skills(3)].sort()).toEqual(['science: the water cycle', 'thinking: sequencing'])
    expect([...skills(4)].sort()).toEqual(['thinking: cause and effect', 'thinking: logical deduction'])
    expect([...skills(5)]).toEqual(['thinking: logical deduction'])
    // A grade-5 item is never easier than a grade-4 one, and K tier 3 stays in the K band.
    const range = (grade: number, tier: number) => {
      const rng = new Rng(`range-${grade}-${tier}`)
      let lo = Infinity, hi = -Infinity
      for (let i = 0; i < 200; i++) { const m = events.make(grade as any, tier as any, rng).metric; lo = Math.min(lo, m); hi = Math.max(hi, m) }
      return [lo, hi]
    }
    expect(range(5, 1)[0], 'grade 5 floor').toBeGreaterThanOrEqual(50)
    expect(range(4, 3)[1], 'grade 4 ceiling').toBeLessThan(range(5, 1)[0] + 5)
    expect(range(0, 3)[1], 'K ceiling').toBeLessThanOrEqual(8)
  })
})

// ---- Odd one out: exactly one defensible answer. A set is only fair when the three (or two) items
// that stay together share the stated attribute AND no *other* attribute in the trait table singles
// out a different choice. Everything below is recomputed from ODD_SETS / ODD_TRAITS by hand.

const traitsOf = (word: string): string[] => ODD_TRAITS[word] ?? []
const ODD_BY_BUCKET = new Map<string, OddSet>(ODD_SETS.map(s => [`${s.level}|${s.band}|${lower(s.odd)}`, s]))

/** Every tag any of these words carries. */
const tagsIn = (words: string[]): string[] => [...new Set(words.flatMap(traitsOf))]

/**
 * The second-reading rule: for any tag, if all but one of the choices have it, the group is "the
 * ones with the tag" and the loner is the odd one - so that loner has to be the keyed answer.
 */
function secondReadings(words: string[], answer: string): string[] {
  const out: string[] = []
  for (const tag of tagsIn(words)) {
    const without = words.filter(w => !traitsOf(w).includes(tag))
    if (without.length === 1 && lower(without[0]) !== lower(answer)) out.push(`"${tag}" makes ${without[0]} the odd one`)
  }
  return out
}

describe('odd one out: one defensible answer', () => {
  it('data: the odd item is odd on the stated attribute and on nothing else', () => {
    const errs: string[] = []
    for (const s of ODD_SETS) {
      const words = [s.odd, ...s.others]
      for (const w of words) if (!ODD_TRAITS[w]) errs.push(`${s.odd}: "${w}" has no traits listed`)
      if (traitsOf(s.odd).includes(s.attr)) errs.push(`${s.odd}: the odd item also has ${s.attr}`)
      for (const o of s.others) if (!traitsOf(o).includes(s.attr)) errs.push(`${s.odd}: "${o}" does not have ${s.attr}`)
      // Hold for *every* subset the generator could draw, not just the full list.
      const n = s.level <= 2 ? 3 : 4
      for (const combo of combos(s.others, n - 1)) {
        for (const clash of secondReadings([s.odd, ...combo], s.odd)) errs.push(`${s.level}.${s.band} ${s.odd} vs ${combo.join('/')}: ${clash}`)
      }
    }
    expect(errs.slice(0, 6)).toEqual([])
  })

  for (const grade of [0, 1, 2, 3, 4, 5] as const) {
    for (const tier of [1, 2, 3] as const) {
      it(`grade ${grade} tier ${tier}: no decoy is odd on a second attribute`, () => {
        const rng = new Rng(`odd-${grade}-${tier}`)
        const errs: string[] = []
        for (let i = 0; i < 300; i++) {
          const r = oddoneout.make(grade, tier, rng)
          const shown = `${r.prompt.join(' / ')} [${r.choices.map(c => c.text ?? 'pic').join(' | ')}]`
          if (grade === 0) {
            // Pictures: exactly one attribute may group them; the others must be all different.
            const vs = r.choices.map(c => c.visual!)
            const kinds = new Set(vs.map(v => v.kind))
            if (kinds.size !== 1) { errs.push(`mixed picture kinds: ${shown}`); continue }
            const attrs = vs[0].kind === 'counters'
              ? { count: vs.map(v => String((v as any).count)), item: vs.map(v => String((v as any).item)) }
              : { color: vs.map(v => String((v as any).color)), name: vs.map(v => String((v as any).name)) }
            const named = r.skill.endsWith('color') ? 'color' : r.skill.endsWith('shape') ? 'name' : 'count'
            for (const [key, values] of Object.entries(attrs)) {
              const groups = new Map<string, number[]>()
              values.forEach((v: string, j: number) => groups.set(v, [...(groups.get(v) ?? []), j]))
              const loner = [...groups.values()].find(ix => ix.length === 1)
              if (key === named) {
                if (groups.size !== 2 || !loner) { errs.push(`${key} does not split 2-1: ${shown}`); continue }
                if (loner[0] !== r.answer) errs.push(`${key} points at choice ${loner[0]}, answer is ${r.answer}: ${shown}`)
              } else if (groups.size !== values.length) {
                errs.push(`${key} groups the pictures as well as ${named}: ${shown}`)
              }
            }
            continue
          }
          const answer = r.choices[r.answer].text!
          const set = ODD_BY_BUCKET.get(`${grade}|${tier}|${lower(answer)}`)
          if (!set) { errs.push(`answer "${answer}" is not the odd item of a grade ${grade} tier ${tier} set: ${shown}`); continue }
          const words = r.choices.map(c => c.text!)
          for (const c of words) {
            if (lower(c) === lower(answer)) continue
            if (!set.others.map(lower).includes(lower(c))) errs.push(`decoy "${c}" is not from this set: ${shown}`)
            if (!traitsOf(c).includes(set.attr)) errs.push(`decoy "${c}" does not share ${set.attr}: ${shown}`)
          }
          for (const clash of secondReadings(words, answer)) errs.push(`${clash}: ${shown}`)
          // A hint may only be offered on tier 1, and it has to name the attribute being asked.
          const hint = r.prompt.find(l => l.startsWith('Hint:'))
          if (hint && tier !== 1) errs.push(`hint outside tier 1: ${shown}`)
          if (hint && hint !== `Hint: most of these ${set.why}.`) errs.push(`hint does not match the set: ${hint}`)
        }
        expect(errs.slice(0, 6)).toEqual([])
      })
    }
  }
})

/** All k-element subsets, so a set can be checked the way the generator will actually draw it. */
function combos<T>(items: T[], k: number): T[][] {
  if (k === 0) return [[]]
  if (items.length < k) return []
  const [head, ...rest] = items
  return [...combos(rest, k - 1).map(c => [head, ...c]), ...combos(rest, k)]
}

// ---- Animals: the biology is checked, not trusted. Every generated answer and every decoy is looked
// up in the ANIMALS trait table (class, diet, legs, home, group, habitat) or, for the fact bank, in
// ANIMAL_CLAIMS. The predicates below are re-derived from the raw fields, not imported.

const ANIMAL_BY_NAME = new Map(ANIMALS.map(a => [a.n, a]))
const INV_CLASSES = ['insect', 'arachnid', 'mollusc', 'crustacean', 'worm']
const saysSound = (a: Animal, s: string) => a.sound === s || !!a.soundAlso?.includes(s)
const babyIs = (a: Animal, b: string) => a.baby === b || !!a.babyAlso?.includes(b)
const homeIs = (a: Animal, h: string) => a.home === h || !!a.homeAlso?.includes(h)
const groupIs = (a: Animal, g: string) => a.group === g || !!a.groupAlso?.includes(g)
const habIs = (a: Animal, h: string) => a.hab === h || !!(a.habAlso as string[] | undefined)?.includes(h)
const homePhrase = (h: string) => h === 'soil' ? 'in the soil' : `in ${an(h)}`
const legPhrase = (n: number) => n === 0 ? 'none' : numberWord(n)

/** What a claim means, in terms of the ANIMALS table. Used to audit the claim lists themselves. */
const CLAIM_RULES: Record<string, (a: Animal) => boolean> = {
  'is a mammal': a => a.cls === 'mammal',
  'is a bird': a => a.cls === 'bird',
  'is a reptile': a => a.cls === 'reptile',
  'is an insect': a => a.cls === 'insect',
  'is an amphibian': a => a.cls === 'amphibian',
  'has scales and gills': a => a.cls === 'fish',
  'is an invertebrate': a => INV_CLASSES.includes(a.cls),
  'is a vertebrate': a => !INV_CLASSES.includes(a.cls),
  'has six legs': a => a.legs === 6,
  'has fur': a => !!a.furry,
  'is cold-blooded': a => a.cls !== 'mammal' && a.cls !== 'bird',
  'is warm-blooded': a => a.cls === 'mammal' || a.cls === 'bird',
  'is a bird that cannot fly': a => a.cls === 'bird' && !a.flies,
  'lives in the Arctic': a => habIs(a, 'Arctic'),
  'lives in a hot desert': a => habIs(a, 'desert'),
  'never leaves the ocean': a => a.hab === 'ocean',
}

const stripArticle = (t: string) => t.replace(/^an? /, '')
const namesCreature = (t: string) => CREATURE_WORDS.includes(stripArticle(t))

describe('animal facts: answers and decoys agree with the trait table', () => {
  it('every fact that names a creature carries a claim, and the claim decides it', () => {
    const errs: string[] = []
    for (const f of ANIMAL_FACTS) {
      const choices = [f.a, ...f.d]
      if (choices.some(namesCreature) && !f.claim) errs.push(`"${f.q}": names a creature but has no claim`)
      if (!f.claim) continue
      const members = ANIMAL_CLAIMS[f.claim]
      if (!members) { errs.push(`"${f.q}": unknown claim ${f.claim}`); continue }
      if (!members.includes(f.a)) errs.push(`"${f.q}": answer "${f.a}" is not listed under "${f.claim}"`)
      for (const d of f.d) if (members.includes(d)) errs.push(`"${f.q}": decoy "${d}" is also true of "${f.claim}"`)
      // ...and a decoy naming a real animal must fail the claim outright.
      const rule = CLAIM_RULES[f.claim]
      if (!rule) continue
      for (const d of f.d) {
        const a = ANIMAL_BY_NAME.get(stripArticle(d))
        if (a && rule(a)) errs.push(`"${f.q}": decoy "${d}" really ${f.claim}`)
      }
      const answer = ANIMAL_BY_NAME.get(stripArticle(f.a))
      if (answer && !rule(answer)) errs.push(`"${f.q}": answer "${f.a}" does not ${f.claim}`)
    }
    expect(errs.slice(0, 6)).toEqual([])
  })

  it('claim lists match the ANIMALS table', () => {
    const errs: string[] = []
    for (const [claim, members] of Object.entries(ANIMAL_CLAIMS)) {
      const rule = CLAIM_RULES[claim]
      if (!rule) continue
      for (const m of members) {
        const a = ANIMAL_BY_NAME.get(stripArticle(m))
        if (a && !rule(a)) errs.push(`"${claim}" lists ${m}, which the ANIMALS table contradicts`)
      }
    }
    // The rules everyone gets wrong, spelled out so a data edit cannot quietly break them.
    const cls = (n: string) => ANIMAL_BY_NAME.get(n)!.cls
    expect([cls('bat'), cls('whale'), cls('dolphin'), cls('seal'), cls('platypus')]).toEqual(['mammal', 'mammal', 'mammal', 'mammal', 'mammal'])
    expect([cls('penguin'), cls('ostrich')]).toEqual(['bird', 'bird'])
    expect(ANIMALS.filter(a => a.cls === 'bird' && !a.flies).map(a => a.n).sort()).toContain('penguin')
    expect(ANIMAL_BY_NAME.get('penguin')!.flies).toBeFalsy()
    expect(ANIMAL_BY_NAME.get('ostrich')!.flies).toBeFalsy()
    expect(cls('spider')).toBe('arachnid')
    expect(cls('frog')).toBe('amphibian')
    expect(cls('toad')).toBe('amphibian')
    expect(cls('crab')).toBe('crustacean')
    expect(errs).toEqual([])
  })
})

/** Checks one generated animal riddle against the data. Returns the problems found. */
function checkAnimal(r: { key: string; grade: number; prompt: string[]; choices: { text?: string }[]; answer: number }): string[] {
  const errs: string[] = []
  const [, kind, p1, p2] = r.key.split('|')
  const answer = r.choices[r.answer].text!
  const decoys = r.choices.filter((_, i) => i !== r.answer).map(c => c.text!)
  const shown = `${r.prompt.join(' / ')} [${r.choices.map(c => c.text).join(' | ')}] = ${answer}`
  const bad = (why: string) => errs.push(`${why}: ${shown}`)
  const animal = (n: string) => ANIMAL_BY_NAME.get(n)
  /** answer must satisfy `ok`, no decoy may. */
  const only = (ok: (t: string) => boolean, what: string) => {
    if (!ok(answer)) bad(`answer "${answer}" is not ${what}`)
    for (const d of decoys) if (ok(d)) bad(`decoy "${d}" is also ${what}`)
  }
  const byAnimal = (ok: (a: Animal) => boolean, what: string) =>
    only(t => { const a = animal(t); return !!a && ok(a) }, what)

  switch (kind) {
    case 'sound-who': return byAnimal(a => saysSound(a, p1), `an animal that says "${p1}"`), errs
    case 'sound-what': {
      const a = animal(p1)!
      return only(t => saysSound(a, t), `a sound ${p1} makes`), errs
    }
    case 'baby-name': {
      const a = animal(p1)!
      if (!KNOWN_BABIES.includes(answer)) bad(`"${answer}" is not a baby name K knows`)
      return only(t => babyIs(a, t), `a name for a baby ${p1}`), errs
    }
    case 'baby-who': {
      if (p2.includes('') && p1.includes(p2)) bad('the baby name contains the answer')
      return byAnimal(a => babyIs(a, p1), `an animal whose baby is a ${p1}`), errs
    }
    case 'home-where': {
      const a = animal(p1)!
      const homeOf = (t: string) => [...new Set(ANIMALS.map(x => x.home).filter(Boolean) as string[])].find(h => homePhrase(h) === t)
      return only(t => { const h = homeOf(t); return !!h && homeIs(a, h) }, `a home for ${p1}`), errs
    }
    case 'home-who': return byAnimal(a => homeIs(a, p1), `an animal that lives in a ${p1}`), errs
    case 'group-name': {
      const a = animal(p1)!
      const plural = a.plural ?? (a.n.endsWith('s') ? a.n : /[^aeiou]y$/.test(a.n) ? a.n.slice(0, -1) + 'ies' : a.n + 's')
      if (!r.prompt[0].includes(plural)) bad(`prompt does not use the plural "${plural}"`)
      return only(t => groupIs(a, t), `a group name for ${p1}`), errs
    }
    case 'group-who': return byAnimal(a => groupIs(a, p1), `an animal that lives in a ${p1}`), errs
    case 'legs-count': {
      const a = animal(p1)!
      return only(t => t === legPhrase(a.legs!), `the leg count of ${p1}`), errs
    }
    case 'legs-who': return byAnimal(a => a.legs === Number(p1), `an animal with ${p1} legs`), errs
    case 'trait-who': {
      const has: Record<string, (a: Animal) => boolean> = { feathers: a => a.cls === 'bird', fur: a => !!a.furry, fly: a => !!a.flies }
      byAnimal(has[p1], `an animal with ${p1}`)
      // "Which animal can fly?" must not offer a bird or an insect as the wrong answer.
      if (p1 === 'fly') for (const d of decoys) {
        const a = animal(d)
        if (a && (a.cls === 'bird' || a.cls === 'insect')) bad(`decoy "${d}" is a flying kind of animal`)
      }
      return errs
    }
    case 'class-who': {
      if (p2.includes(p1)) bad(`the answer name contains its own class`)
      return byAnimal(a => a.cls === p1, `${CLASS_TEXT[p1 as keyof typeof CLASS_TEXT]}`), errs
    }
    case 'class-what': {
      const a = animal(p1)!
      return only(t => t === CLASS_TEXT[a.cls], `the class of ${p1}`), errs
    }
    case 'diet-who': return byAnimal(a => a.diet === p1, `a ${p1}`), errs
    case 'diet-what': {
      const a = animal(p1)!
      if (r.grade < 3 && r.choices.some(c => c.text === 'a producer')) bad('"a producer" before food chains are taught')
      return only(t => t === an(a.diet!), `the diet of ${p1}`), errs
    }
    case 'hab-who': return byAnimal(a => habIs(a, p1), `an animal that lives ${HABITAT_TEXT[p1 as keyof typeof HABITAT_TEXT]}`), errs
    case 'hab-where': {
      const a = animal(p1)!
      const habOf = (t: string) => (Object.keys(HABITAT_TEXT) as (keyof typeof HABITAT_TEXT)[]).find(h => HABITAT_TEXT[h] === t)
      return only(t => { const h = habOf(t); return !!h && habIs(a, h) }, `a home range for ${p1}`), errs
    }
    case 'vert-who': {
      const inv = p1 === 'an invertebrate'
      return byAnimal(a => INV_CLASSES.includes(a.cls) === inv, p1), errs
    }
    default: {
      const f = ANIMAL_FACTS.find(x => `animals|${x.q}` === r.key)
      if (!f) { bad(`unrecognised key ${r.key}`); return errs }
      if (answer !== f.a) bad(`answer does not match the fact table`)
      for (const d of decoys) if (!f.d.includes(d)) bad(`decoy "${d}" is not from the fact table`)
      const members = f.claim ? ANIMAL_CLAIMS[f.claim] : undefined
      if (members) for (const d of decoys) if (members.includes(d)) bad(`decoy "${d}" is also true of "${f.claim}"`)
      return errs
    }
  }
}

describe('animals: one defensible answer', () => {
  for (const grade of [0, 1, 2, 3, 4, 5] as const) {
    for (const tier of [1, 2, 3] as const) {
      it(`grade ${grade} tier ${tier}: every answer is right and every decoy is wrong`, () => {
        const rng = new Rng(`animals-${grade}-${tier}`)
        const errs: string[] = []
        for (let i = 0; i < 300; i++) errs.push(...checkAnimal(animals.make(grade, tier, rng)))
        expect(errs.slice(0, 6)).toEqual([])
      })
    }
  }
})

describe('thinking tiers: tier 3 never asks what tier 1 could', () => {
  const keysOf = (gen: typeof animals, grade: number, tier: number) => {
    const rng = new Rng(`tierband-${gen.id}-${grade}-${tier}`)
    const keys = new Set<string>()
    for (let i = 0; i < 300; i++) keys.add(gen.make(grade as any, tier as any, rng).key)
    return keys
  }
  for (const gen of [animals, oddoneout]) {
    it(`${gen.id}: no grade's tier 1 and tier 3 overlap, and grades do not share items`, () => {
      const errs: string[] = []
      const byGrade = new Map<number, Set<string>>()
      for (const grade of [0, 1, 2, 3, 4, 5]) {
        const [t1, t3] = [keysOf(gen, grade, 1), keysOf(gen, grade, 3)]
        const shared = [...t1].filter(k => t3.has(k))
        if (shared.length) errs.push(`grade ${grade} tiers 1/3 share ${shared.length}: ${shared[0]}`)
        byGrade.set(grade, new Set([...t1, ...t3, ...keysOf(gen, grade, 2)]))
      }
      for (const grade of [1, 2, 3, 4, 5]) {
        const shared = [...byGrade.get(grade)!].filter(k => byGrade.get(grade - 1)!.has(k))
        if (shared.length) errs.push(`grades ${grade - 1}/${grade} share ${shared.length}: ${shared[0]}`)
      }
      expect(errs).toEqual([])
    })
  }
})

// ---------------------------------------------------------------------------------------------
// Science and riddle families: regressions for the content review of matter / body / earthsky /
// riddles. Everything below is recomputed from the data tables, not from the generators.

type Banded = { level: number; band: 1 | 2 | 3 }
const BANDED_TABLES: [string, Banded[]][] = [
  ['matter', MATTER_FACTS as Banded[]], ['body', BODY_FACTS as Banded[]],
  ['earthsky', EARTHSKY_FACTS as Banded[]], ['riddles', RIDDLES as Banded[]],
]

/** The (level, band) buckets a grade/tier draws from — mirrors `bandedSource`, written out by hand. */
function tierBuckets(grade: number, tier: number): [number, (1 | 2 | 3)[]][] {
  if (tier === 1) return grade > 0 ? [[grade, [1]], [grade - 1, [1]]] : [[grade, [1]]]
  if (tier === 2) return grade > 0 ? [[grade, [2]], [grade - 1, [3]]] : [[grade, [2]]]
  return grade < 5 ? [[grade, [3]], [grade + 1, [1]]] : [[grade, [3]]]
}
const poolOf = <T extends Banded>(entries: T[], grade: number, tier: number): T[] =>
  tierBuckets(grade, tier).flatMap(([lv, bands]) => entries.filter(e => e.level === lv && bands.includes(e.band)))

describe('science and riddle families: tiers are real steps, not reshuffles', () => {
  it('every entry declares a band and every level has all three', () => {
    const errs: string[] = []
    for (const [name, entries] of BANDED_TABLES) {
      for (const e of entries) if (![1, 2, 3].includes(e.band)) errs.push(`${name}: entry at level ${e.level} has band ${e.band}`)
      for (const level of [0, 1, 2, 3, 4, 5]) for (const band of [1, 2, 3]) {
        const n = entries.filter(e => e.level === level && e.band === band).length
        if (n < 6) errs.push(`${name}: level ${level} band ${band} has only ${n} entries`)
      }
    }
    expect(errs).toEqual([])
  })

  // The review found K tier 2 to be tier 1 reshuffled (13 of 14 items shared) in all four families,
  // and grade 5 tier 3 to be tier 2 reshuffled. Disjoint bands make that impossible by construction.
  it('the three tiers of a grade share no item, and each pool stays varied', () => {
    const errs: string[] = []
    for (const [name, entries] of BANDED_TABLES) {
      for (const grade of [0, 1, 2, 3, 4, 5]) {
        const pools = [1, 2, 3].map(t => new Set(poolOf(entries, grade, t)))
        pools.forEach((p, i) => { if (p.size < 13) errs.push(`${name} g${grade} t${i + 1}: only ${p.size} entries`) })
        for (const [i, j] of [[0, 1], [0, 2], [1, 2]]) {
          const shared = [...pools[i]].filter(x => pools[j].has(x))
          if (shared.length) errs.push(`${name} g${grade} tiers ${i + 1}/${j + 1} share ${shared.length} items`)
        }
      }
    }
    expect(errs).toEqual([])
  })

  // "Which system is made of bones?" and "The skull is part of which system?" both answer skeletal;
  // the review found the first handing the second away inside one tier. Same for the two clock
  // riddles at grade 1 tier 3 and the two mushroom riddles at grade 2 tier 3.
  it('no two questions in one grade/tier pool have the same answer', () => {
    const tables: [string, ({ a: string } & Banded)[]][] = [
      ['matter', MATTER_FACTS as any], ['body', BODY_FACTS as any],
      ['earthsky', EARTHSKY_FACTS as any], ['riddles', RIDDLES as any],
    ]
    const errs: string[] = []
    for (const [name, entries] of tables) {
      for (const grade of [0, 1, 2, 3, 4, 5]) for (const tier of [1, 2, 3]) {
        const seen = new Map<string, string>()
        for (const e of poolOf(entries, grade, tier)) {
          // Counting answers ("two", "five") legitimately repeat across "how many" questions.
          if (/^(one|two|three|four|five|ten|twenty|[0-9]+)$/.test(lower(e.a))) continue
          const prev = seen.get(lower(e.a))
          if (prev) errs.push(`${name} g${grade} t${tier}: "${e.a}" answers both questions`)
          else seen.set(lower(e.a), e.a)
        }
      }
    }
    expect(errs).toEqual([])
  })

  // Content drift: the review found joints in K, canine/enamel in grade 1, bile in grade 2, the
  // mitochondria in grade 4, constellations in K. A term may never be asked below its own grade.
  it('advanced vocabulary never reaches a grade below the one that teaches it', () => {
    const minGrade: [RegExp, number][] = [
      [/\bfulcrum\b/i, 3], [/\bwheel and axle\b/i, 3], [/\bstate of matter\b/i, 2], [/\bamps?\b/i, 5],
      [/\bnewtons?\b/i, 5], [/\bmitochondria\b/i, 5], [/\bvitamin [ADK]\b/i, 5], [/\bbile\b/i, 3],
      [/\bcanine\b/i, 2], [/\benamel\b/i, 2], [/\bconstellation\b/i, 1], [/\bjoint\b/i, 1],
      [/\bigneous|sedimentary|metamorphic\b/i, 4], [/\bprecipitation\b/i, 2], [/\bmolars?\b/i, 2],
      [/\bsolstice|equinox\b/i, 5], [/\blight-year\b/i, 5], [/\bcytoplasm\b/i, 5],
    ]
    const errs: string[] = []
    for (const gen of [matter, body, earthsky, riddles] as Generator[]) {
      for (const grade of [0, 1, 2, 3, 4, 5] as const) for (const tier of [1, 2, 3] as const) {
        const rng = new Rng(`vocab-${gen.id}-${grade}-${tier}`)
        for (let i = 0; i < 250; i++) {
          const r = gen.make(grade, tier, rng)
          const text = [...r.prompt, ...r.choices.map(c => c.text ?? '')].join(' ')
          for (const [re, min] of minGrade) if (grade < min && re.test(text)) errs.push(`${gen.id} g${grade} t${tier}: ${re} in "${text}"`)
        }
      }
    }
    expect([...new Set(errs)].slice(0, 5)).toEqual([])
  })
})

describe('science and riddle families: every decoy is unambiguously wrong', () => {
  const bare = (s: string) => lower(s).replace(/^(a|an|the|your|my)\s+/, '').replace(/[^a-z0-9 ]/g, '').trim()
  const hasWord = (haystack: string, needle: string) => needle !== '' && ` ${bare(haystack)} `.includes(` ${needle} `)

  // "What is a wooden chair made of? -> wood" and "What do we see on a cloudy day? -> clouds" were
  // solvable by reading alone. Either/or stems ("a full cart or an empty one") must name the answer.
  it('a stem never contains its own answer, and never contains one of its decoys', () => {
    const errs: string[] = []
    for (const [name, facts] of [['matter', MATTER_FACTS], ['body', BODY_FACTS], ['earthsky', EARTHSKY_FACTS]] as const) {
      for (const f of facts) {
        if (/ or /.test(f.q)) continue
        if (hasWord(f.q, bare(f.a))) errs.push(`${name}: stem gives the answer "${f.a}" :: ${f.q}`)
        for (const d of f.d) if (hasWord(f.q, bare(d))) errs.push(`${name}: stem names the decoy "${d}" :: ${f.q}`)
      }
    }
    // Wordplay riddles (grade 3+) trade on words in the prompt; K-2 riddles must not.
    for (const r of RIDDLES) {
      const clue = r.lines.join(' ')
      if (r.level <= 2 && hasWord(clue, bare(r.a))) errs.push(`riddles: clue gives the answer "${r.a}" :: ${clue}`)
      // A name already listed in the prompt is a dead choice (the review found "Nono").
      for (const d of r.d) if (/^[A-Z][a-z]+$/.test(d) && clue.includes(d)) errs.push(`riddles: decoy "${d}" is named in the prompt :: ${clue}`)
    }
    expect(errs).toEqual([])
  })

  // Decoys the review showed were defensible answers, or dead options of the wrong type.
  it('the decoys the review rejected have not come back', () => {
    const bannedFact: [RegExp, RegExp, string][] = [
      [/tiny lights we see in the night sky/i, /^(planes|fireflies)$/i, 'aircraft and fireflies really are lights in the night sky'],
      [/farthest from the sun/i, /^pluto$/i, 'Pluto is only fair once the dwarf-planet item has been taught'],
      [/rubbing a balloon on your hair/i, /^sound$/i, 'rubbing really does make a sound'],
      [/how many fingers are on one hand/i, /^four$/i, 'many classrooms teach "four fingers and a thumb"'],
      [/which foods give you energy/i, /^(candy|sweets)$/i, 'sugar is energy'],
      [/boil water/i, /ice/i, 'freezes and turns to ice are the same wrong idea'],
      [/what does a mirror do to light/i, /turns it into heat/i, 'absorbing light is what turns it into heat'],
      [/which type of rock|which rock|is which type of rock|kind of rock/i, /^(sandstone|fossil|molten|lava|granite|marble|coal)$/i, 'a specimen is not a rock class'],
      [/what do your teeth do/i, /^(see food|hear food|smell food)$/i, 'not a real body function'],
      [/how often should you brush/i, /^never$/i, 'no second grader picks "never"'],
      [/which bones protect/i, /^(ankle|toes)$/i, 'the plural stem points straight at the plural answer'],
      [/what do muscles do/i, /breathe for you/i, 'the diaphragm is a muscle'],
      [/dissolving sugar/i, /new substance/i, 'a process cannot be a substance'],
      [/what does fib(er|re) in food help with/i, /^(hearing|seeing in the dark|growing taller)$/i, 'no nutrient does these'],
    ]
    const errs: string[] = []
    for (const [name, facts] of [['matter', MATTER_FACTS], ['body', BODY_FACTS], ['earthsky', EARTHSKY_FACTS]] as const) {
      for (const f of facts) for (const [q, bad, why] of bannedFact) {
        if (!q.test(f.q)) continue
        for (const d of f.d) if (bad.test(d)) errs.push(`${name}: "${d}" on "${f.q}" - ${why}`)
      }
    }
    const bannedRiddle: [RegExp, RegExp, string][] = [
      [/many seats and wheels/i, /^a plane$/i, 'an airliner has seats, wheels and lots of people'],
      [/kind of band never plays music/i, /^(a drum|a headband|a hair band)$/i, 'a drum is not a band; a headband is a second answer'],
      [/easy to get into/i, /^(a bed|a bath)$/i, 'both are standard answers to this riddle'],
      [/break\s+without touching it/i, /^a window$/i, 'a thrown ball breaks a window without touching it'],
      [/fill a whole room/i, /^(a bed|a table|a rug)$/i, 'furniture eliminates itself without solving anything'],
      [/end of a rainbow/i, /^(gold|a cloud)$/i, 'gold is the standard cultural answer'],
      [/keys but cannot open/i, /^a ring$/i, 'a key ring has keys and opens no lock'],
      [/four legs but cannot walk.*dinner/i, /^a bird$/i, 'fails both clues, so it is a dead option'],
      [/which month has 28 days/i, /^only leap years$/i, 'a leap year is not a month'],
      [/starts with T, ends with T/i, /^a toast$/i, 'toast is a mass noun'],
      [/travels faster, heat or cold/i, /./, 'the pun answer had no unambiguous non-pun reading'],
    ]
    for (const r of RIDDLES) for (const [q, bad, why] of bannedRiddle) {
      const clue = r.lines.join(' ')
      if (!q.test(clue)) continue
      for (const d of [...r.d, r.a]) if (bad.test(d)) errs.push(`riddles: "${d}" on "${clue}" - ${why}`)
    }
    expect(errs).toEqual([])
  })

  // "Ice is water in which state? -> solid | steam | gas" mixed substances in with state names, and
  // "which type of rock" mixed a specimen in with the classes. Category questions get category
  // choices only.
  it('category questions offer only members of that category', () => {
    const STATES = ['solid', 'liquid', 'gas']
    const isState = (s: string) => s.toLowerCase().split(/ (?:and|or) /).every(w => STATES.includes(w.replace(/^an? /, '').trim()))
    const ROCKS = ['igneous', 'sedimentary', 'metamorphic', 'volcanic']
    const errs: string[] = []
    for (const f of MATTER_FACTS) {
      if (!/in which state|state of matter|which state has/i.test(f.q)) continue
      for (const c of [f.a, ...f.d]) if (!isState(c)) errs.push(`matter: "${c}" is not a state of matter :: ${f.q}`)
    }
    for (const f of EARTHSKY_FACTS) {
      if (!/which (type|kind) of rock|is which type of rock|which rock (forms|is made)/i.test(f.q)) continue
      for (const c of [f.a, ...f.d]) if (!ROCKS.includes(c.toLowerCase())) errs.push(`earthsky: "${c}" is not a rock class :: ${f.q}`)
    }
    expect(errs).toEqual([])
  })

  // Nine riddles could be answered on shape alone: the answer was the only choice with no article.
  it('at least one decoy copies the surface form of the riddle answer', () => {
    const det = (s: string) => /^(a|an|the|your|my|his|her)\s/i.test(s)
    const errs = RIDDLES.filter(r => r.d.every(d => det(d) !== det(r.a)))
      .map(r => `riddles: "${r.a}" is the only choice ${det(r.a) ? 'with' : 'without'} an article :: ${r.lines[0]}`)
    expect(errs).toEqual([])
  })

  // The whole product is US English; the review found colour / aluminium / metres / vapour / fibre /
  // sweets / fizzy drink / torch across these four families.
  it('no British spellings or UK-only vocabulary', () => {
    const banned = /\b(colour\w*|aluminium|metres?|litres?|vapour|fibre|sweets|fizzy|torch|whilst|grey|jumper|pyjamas|lolly)\b/i
    const texts: string[] = []
    for (const facts of [MATTER_FACTS, BODY_FACTS, EARTHSKY_FACTS]) for (const f of facts) texts.push(f.q, f.a, ...f.d)
    for (const r of RIDDLES as RiddleEntry[]) texts.push(...r.lines, r.a, ...r.d)
    expect(texts.filter(t => banned.test(t))).toEqual([])
  })
})

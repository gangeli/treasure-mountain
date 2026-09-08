import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { GENERATORS } from '../src/content/generators'
import { GRADES, TIERS, speakable, type Generator, type Riddle } from '../src/content/types'
import { rhymes } from '../src/content/generators/rhymes'
import { sounds } from '../src/content/generators/sounds'
import { FAMILIES, PROMPT_ONLY, classesOf, isCvc, noInitialBlend, endSoundOf, endKeySound, beginSoundOf } from '../src/content/data/phonics'
import { pickRiddle, generatorsFor, recentEntry } from '../src/content/registry'
import { standardChecks } from './helpers'

describe('all registered generators', () => {
  standardChecks(GENERATORS, it, expect)
})

describe('registry', () => {
  it('every grade has enough families across all three areas', () => {
    const full = GENERATORS.length >= 14
    for (const grade of GRADES) {
      const gens = generatorsFor(grade)
      const areas = new Set(gens.map(g => g.area))
      expect(gens.length, `grade ${grade} has ${gens.length} families`).toBeGreaterThanOrEqual(full ? 14 : 3)
      if (full) expect([...areas].sort()).toEqual(['math', 'reading', 'thinking'])
    }
  })
  it('pickRiddle avoids repeats and balances areas', () => {
    for (const grade of GRADES) {
      const rng = new Rng('pick-' + grade)
      const seen = new Set<string>()
      const areas: string[] = []
      for (let i = 0; i < 60; i++) {
        const r = pickRiddle(grade, ((i % 3) + 1) as any, rng, seen, areas)
        expect(seen.has(r.key)).toBe(false)
        seen.add(r.key)
        areas.push(GENERATORS.find(g => g.id === r.family)!.area)
      }
      const counts: Record<string, number> = {}
      for (const a of areas) counts[a] = (counts[a] || 0) + 1
      for (const a of Object.keys(counts)) expect(counts[a]).toBeGreaterThan(8)
    }
  })
})

// --------------------------------------------------------------------- phonics regression checks

/** Runs `check` over every grade/tier of one generator, collecting the first few failures. */
function sweep(gen: Generator, seeds: number, check: (r: Riddle) => string | null): void {
  const errs: string[] = []
  for (const grade of gen.grades) for (const tier of TIERS) {
    const rng = new Rng(`${gen.id}-phonics-${grade}-${tier}`)
    for (let i = 0; i < seeds; i++) {
      const r = gen.make(grade, tier, rng)
      const e = check(r)
      if (e) errs.push(`g${grade} t${tier} seed ${i}: ${e} :: ${r.prompt.join(' / ')} [${r.choices.map(c => c.text).join(', ')}]`)
    }
  }
  expect(errs.slice(0, 6)).toEqual([])
}

const answerOf = (r: Riddle) => r.choices[r.answer].text ?? ''
const decoysOf = (r: Riddle) => r.choices.filter((_, i) => i !== r.answer).map(c => c.text ?? '')
/** Two ending sounds collide when one ends with the other ('fox' is /ks/, which ends in /s/). */
const sameEnd = (a: string, b: string) => a === b || a.endsWith(b) || b.endsWith(a)

describe('rhymes', () => {
  const WORDS = new Set(FAMILIES.flatMap(f => f.words))
  it('answers are lowercase words from the data and no decoy rhymes with them', () => {
    sweep(rhymes, 200, r => {
      const ans = answerOf(r)
      if (ans !== ans.toLowerCase()) return `answer "${ans}" is capitalised, which gives it away`
      if (!WORDS.has(ans)) return `answer "${ans}" is not in the family data`
      if (PROMPT_ONLY.has(ans)) return `answer "${ans}" is a prompt-only word`
      const cls = classesOf(ans)
      if (cls.size === 0) return `answer "${ans}" has no rhyme class`
      for (const d of decoysOf(r)) {
        if (d !== d.toLowerCase()) return `decoy "${d}" is capitalised`
        if (!WORDS.has(d)) return `decoy "${d}" is not in the family data`
        if (PROMPT_ONLY.has(d)) return `decoy "${d}" is a prompt-only word`
        if ([...classesOf(d)].some(c => cls.has(c))) return `decoy "${d}" rhymes with the answer "${ans}"`
      }
      return null
    })
  })
  it('kindergarten tier 1 shows and offers plain CVC words only', () => {
    const rng = new Rng('rhymes-cvc')
    for (let i = 0; i < 200; i++) {
      const r = rhymes.make(0, 1, rng)
      for (const c of r.choices) expect(isCvc(c.text ?? ''), `choice ${c.text}`).toBe(true)
    }
  })
})

describe('sounds', () => {
  it('the question says where the sound is, and no decoy shares it', () => {
    sweep(sounds, 200, r => {
      const m = /^These words all (begin|end) with ([a-z]+)\.$/.exec(r.prompt[1])
      if (!m) return `no sound line: "${r.prompt[1]}"`
      const [, where, key] = m
      const ans = answerOf(r)
      if (!r.prompt.some(l => new RegExp(`Which word ${where === 'begin' ? 'begins' : 'ends'} with ${key}\\b`).test(l))) return 'the question does not name the position'
      if (where === 'begin' ? !ans.startsWith(key) : !sameEnd(endSoundOf(ans), endKeySound(key))) return `answer "${ans}" does not ${where} with ${key}`
      for (const d of decoysOf(r)) {
        if (where === 'begin') {
          if (d.startsWith(key)) return `decoy "${d}" also begins with ${key}`
          if (key.length === 1 && beginSoundOf(d[0]) === beginSoundOf(key)) return `decoy "${d}" starts with the same sound as ${key}`
        } else {
          if (sameEnd(endSoundOf(d), endKeySound(key))) return `decoy "${d}" also ends with the ${key} sound`
          if (d.startsWith(key)) return `decoy "${d}" starts with ${key}, which reads as a "${key} word"`
        }
      }
      return null
    })
  })
  it('kindergarten words have no initial blends', () => {
    const rng = new Rng('sounds-cvc')
    for (const tier of TIERS) for (let i = 0; i < 100; i++) {
      const r = sounds.make(0, tier, rng)
      for (const c of r.choices) expect(noInitialBlend(c.text ?? ''), `choice ${c.text}`).toBe(true)
    }
  })
})

describe('the picker varies what it asks', () => {
  const FAM_AREA = new Map(GENERATORS.map(g => [g.id, g.area]))

  it('stamps each riddle with its family\'s area', () => {
    for (const grade of GRADES) {
      const rng = new Rng(grade + 1)
      const seen = new Set<string>()
      for (let i = 0; i < 200; i++) {
        const r = pickRiddle(grade, 2, rng, seen)
        expect(r.area, `${r.family} at grade ${grade}`).toBe(FAM_AREA.get(r.family))
      }
    }
  })

  /** Plays climbs of 20 riddles and reports how often the same area or family repeats. */
  function runs(useHistory: boolean): { area: number; family: number; areaPct: number } {
    let worstArea = 0, worstFam = 0, three = 0, n = 0
    for (const grade of GRADES) {
      for (let s = 0; s < 60; s++) {
        const rng = new Rng(s * 31 + grade)
        const seen = new Set<string>(); const recent: string[] = []
        let lastArea = '', lastFam = '', ar = 0, fr = 0
        for (let i = 0; i < 20; i++) {
          const r = pickRiddle(grade, ((i % 3) + 1) as 1 | 2 | 3, rng, seen, useHistory ? recent : [])
          seen.add(r.key); recent.push(recentEntry(r))
          ar = lastArea === r.area ? ar + 1 : 1; lastArea = r.area!
          fr = lastFam === r.family ? fr + 1 : 1; lastFam = r.family
          worstArea = Math.max(worstArea, ar); worstFam = Math.max(worstFam, fr)
          if (ar >= 3) three++
          n++
        }
      }
    }
    return { area: worstArea, family: worstFam, areaPct: 100 * three / n }
  }

  // The balancing used to read the history with the wrong keys, so every weight came out the same
  // and a child could be asked ten reading riddles running. These numbers are what makes it work.
  it('mixes the three areas better than picking blind', () => {
    const off = runs(false), on = runs(true)
    expect(on.areaPct).toBeLessThan(off.areaPct * 0.6)
    expect(on.area).toBeLessThanOrEqual(6)
    expect(on.family).toBeLessThanOrEqual(3)
  })

  it('keeps all three areas near a third of the riddles', () => {
    for (const grade of GRADES) {
      const count: Record<string, number> = { reading: 0, math: 0, thinking: 0 }
      const rng = new Rng(grade * 5 + 2)
      const seen = new Set<string>(); const recent: string[] = []
      for (let i = 0; i < 600; i++) {
        const r = pickRiddle(grade, 2, rng, seen, recent)
        seen.add(r.key); recent.push(recentEntry(r)); count[r.area!]++
      }
      for (const a of ['reading', 'math', 'thinking']) {
        expect(count[a] / 600, `grade ${grade} ${a}`).toBeGreaterThan(0.2)
        expect(count[a] / 600, `grade ${grade} ${a}`).toBeLessThan(0.47)
      }
    }
  })
})

describe('what the voice says', () => {
  // Every one of these was read wrong before speakable learned it: the symbol was dropped and the
  // sentence lost its meaning, or an abbreviation was spelled out letter by letter.
  const CASES: [string, string][] = [
    ['3/4', '3 fourths'],
    ['1/2', '1 half'],
    ['5/16', '5 over 16'],
    ['60 km/h', '60 kilometers per hour'],
    ['3¢', '3 cents'],
    ['1¢', '1 cent'],
    ['$1.00', '1 dollar'],
    ['$0.94', '94 cents'],
    ['$0.05', '5 cents'],
    ['$11.75', '11 dollars and 75 cents'],
    ['$3', '3 dollars'],
    ['30°', '30 degrees'],
    ['72°F', '72 degrees Fahrenheit'],
    ['0°C', '0 degrees Celsius'],
    ['736 < 737', '736 is less than 737'],
    ['736 > 737', '736 is greater than 737'],
    ['736 = 737', '736 equals 737'],
    ['3 groups of 4 = ?', '3 groups of 4 equals what?'],
    ['24 ÷ 3 = ?', '24 divided by 3 equals what?'],
    ['6 × 7 = ?', '6 times 7 equals what?'],
    ['$11.75 - $10.00 = ?', '11 dollars and 75 cents minus 10 dollars equals what?'],
    ['3,000 + 600 + 9', '3,000 plus 600 plus 9'],
    ['6 sq in', '6 square inches'],
    ['1 sq ft', '1 square foot'],
    ['4 cm', '4 centimeters'],
    ['1 cm', '1 centimeter'],
    ['3 in long and 1 in wide.', '3 inches long and 1 inch wide.'],
    // "in" is a word too, and this is the sentence that made that obvious.
    ['Which number has a 5 in the ones place?', 'Which number has a 5 in the ones place?'],
    ['I have 3 apples in a bag.', 'I have 3 apples in a bag.'],
  ]
  for (const [raw, want] of CASES) it(`says "${raw}" as "${want}"`, () => expect(speakable(raw)).toBe(want))
})

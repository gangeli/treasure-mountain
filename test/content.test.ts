import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { GENERATORS } from '../src/content/generators'
import { GRADES, TIERS, type Generator, type Riddle } from '../src/content/types'
import { rhymes } from '../src/content/generators/rhymes'
import { sounds } from '../src/content/generators/sounds'
import { FAMILIES, PROMPT_ONLY, classesOf, isCvc, noInitialBlend, endSoundOf, endKeySound, beginSoundOf } from '../src/content/data/phonics'
import { pickRiddle, generatorsFor } from '../src/content/registry'
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

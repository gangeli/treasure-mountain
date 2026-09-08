import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { GENERATORS } from '../src/content/generators'
import { GRADES, TIERS, speakable, sayChoices, type Generator, type Riddle } from '../src/content/types'
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
      // "begin with b" but "end in th": the answer to an ending question can be the word "with".
      const m = /^These words all (begin with|end in) ([a-z]+)\.$/.exec(r.prompt[1])
      if (!m) return `no sound line: "${r.prompt[1]}"`
      const where = m[1] === 'begin with' ? 'begin' : 'end'
      const key = m[2]
      const ans = answerOf(r)
      const verb = where === 'begin' ? 'begins' : 'ends'
      // Either the couplet names the key, or it asks for "the same way" - which it does when every
      // phrasing that names the key would have contained the answer.
      if (!r.prompt.some(l => new RegExp(`Which word ${verb} (${m[1].split(' ')[1]} ${key}\\b|the same way)`).test(l))) return `the question does not name the position: ${r.prompt.join(' / ')}`
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

describe('the voice names the answer buttons', () => {
  it('numbers text choices the way the buttons are numbered', () => {
    expect(sayChoices([{ text: 'cold' }, { text: 'high' }, { text: 'open' }])).toBe('One, cold. Two, high. Three, open')
    expect(sayChoices([{ text: 'a' }, { text: 'b' }, { text: 'c' }, { text: 'd' }])).toBe('One, a. Two, b. Three, c. Four, d')
  })

  it('does not number picture choices, which have no words to attach a number to', () => {
    const pics = [{ visual: { kind: 'shape', name: 'circle' } }, { visual: { kind: 'shape', name: 'square' } }] as any
    expect(sayChoices(pics)).toBe('')
  })

  // Every riddle whose answers are words has to name them by number, or a child who cannot read
  // them has heard three phrases with nothing to tie them to the three buttons.
  it('every family with word answers reads them out numbered', () => {
    const missing: string[] = []
    for (const gen of GENERATORS) {
      for (const grade of gen.grades) {
        const rng = new Rng(`num-${gen.id}-${grade}`)
        for (let i = 0; i < 40; i++) {
          const r = gen.make(grade, ((i % 3) + 1) as 1 | 2 | 3, rng)
          if (!r.choices.every(c => c.text && c.text.trim())) continue
          if (!/\bOne, /.test(r.spoken)) { missing.push(`${gen.id} g${grade}: ${r.spoken}`); break }
        }
      }
    }
    expect(missing.slice(0, 5)).toEqual([])
  })
})

describe('a riddle does not state its own answer', () => {
  const inPrompt = (prompt: string, t: string | undefined): boolean => {
    const a = (t ?? '').toLowerCase().trim()
    if (a.length < 3) return false
    // Not preceded by a word character or a decimal point: "hut" is not in "shut", and "2 kg"
    // is not in "1.2 kg".
    return new RegExp(`(?<![\\w.])${a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(prompt)
  }
  /**
   * The answer is written in the question and none of the decoys is. A question that names every
   * choice - "a nail or a cork?", "Cleo is older than Wren... who is oldest?" - gives nothing away,
   * because copying a word out of it is no help in choosing between them.
   */
  const statesAnswer = (r: Riddle): boolean => {
    const prompt = r.prompt.join(' ').toLowerCase()
    if (!inPrompt(prompt, r.choices[r.answer].text)) return false
    return !r.choices.some((c, i) => i !== r.answer && inPrompt(prompt, c.text))
  }

  /**
   * Families where the answer legitimately appears in the question: an irregular plural is the same
   * word ("one deer, ten ___"), a two-way question has to name both options ("a nail or a cork?"),
   * a logic puzzle names everyone in it, and a joke riddle is built on the trick ("what can you
   * hold in your right hand but never in your left hand?"). Every other family has to ask something
   * a child cannot answer by copying a word out of the question.
   */
  const ALLOWED = new Set(['plurals', 'riddles', 'shapes', 'wordproblems', 'events'])

  it('sounds never hands the answer to the child in the verse', () => {
    const gen = GENERATORS.find(g => g.id === 'sounds')!
    const bad: string[] = []
    for (const grade of gen.grades) for (const tier of TIERS) {
      const rng = new Rng(`states-sounds-${grade}-${tier}`)
      for (let i = 0; i < 250; i++) {
        const r = gen.make(grade, tier, rng)
        if (statesAnswer(r)) bad.push(`${r.prompt.join(' / ')} -> ${r.choices[r.answer].text}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('events below the logic puzzles never name the stage they are asking for', () => {
    const gen = GENERATORS.find(g => g.id === 'events')!
    const bad: string[] = []
    for (const grade of gen.grades) {
      if (grade < 2 || grade > 4) continue
      for (const tier of TIERS) {
        const rng = new Rng(`states-events-${grade}-${tier}`)
        for (let i = 0; i < 250; i++) {
          const r = gen.make(grade, tier, rng)
          if (statesAnswer(r)) bad.push(`g${grade}: ${r.prompt.join(' / ')} -> ${r.choices[r.answer].text}`)
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('making change never gives change equal to the price', () => {
    const gen = GENERATORS.find(g => g.id === 'money')!
    const bad: string[] = []
    for (const tier of TIERS) {
      const rng = new Rng(`change-${tier}`)
      for (let i = 0; i < 400; i++) {
        const r = gen.make(3, tier, rng)
        if (/change/.test(r.prompt.join(' ')) && statesAnswer(r)) bad.push(`${r.prompt.join(' / ')} -> ${r.choices[r.answer].text}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('no family outside the allowed list states its answer', () => {
    const bad: string[] = []
    for (const gen of GENERATORS) {
      if (ALLOWED.has(gen.id)) continue
      for (const grade of gen.grades) for (const tier of TIERS) {
        const rng = new Rng(`states-${gen.id}-${grade}-${tier}`)
        for (let i = 0; i < 120; i++) {
          const r = gen.make(grade, tier, rng)
          if (statesAnswer(r)) bad.push(`${gen.id} g${grade}: ${r.prompt.join(' / ')} -> ${r.choices[r.answer].text}`)
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })
})

describe('people work in the right prepositions', () => {
  it('nobody works "in" a farm, a ranch, a ship or an airplane', () => {
    const gen = GENERATORS.find(g => g.id === 'associations')!
    const bad: string[] = []
    for (const grade of gen.grades) for (const tier of TIERS) {
      const rng = new Rng(`prep-${grade}-${tier}`)
      for (let i = 0; i < 300; i++) {
        const p = gen.make(grade, tier, rng).prompt.join(' ')
        if (/works in an? (farm|ranch|ship|airplane|racetrack|swimming pool)\b/.test(p)) bad.push(p)
      }
    }
    expect([...new Set(bad)].slice(0, 3)).toEqual([])
  })
})

describe('no two choices are the same answer twice', () => {
  const LEN: Record<string, number> = { mm: 1, cm: 10, m: 1000, km: 1e6, in: 25.4, inch: 25.4, inches: 25.4, ft: 304.8, foot: 304.8, feet: 304.8, yd: 914.4, mi: 1609344 }
  const MASS: Record<string, number> = { g: 1, kg: 1000, oz: 28.35, lb: 453.6 }
  const VOL: Record<string, number> = { mL: 1, L: 1000 }
  /** A choice as a comparable value, tagged by dimension, or null for words. */
  const valueOf = (t: string): string | null => {
    const s = t.trim().replace(/[$,]/g, '')
    let m = /^(-?\d+(?:\.\d+)?)\s*(mm|cm|km|m|inches|inch|in|feet|foot|ft|yd|mi)$/.exec(s)
    if (m) return `len:${(Number(m[1]) * LEN[m[2]]).toFixed(4)}`
    m = /^(-?\d+(?:\.\d+)?)\s*(kg|g|oz|lb)$/.exec(s)
    if (m) return `mass:${(Number(m[1]) * MASS[m[2]]).toFixed(4)}`
    m = /^(-?\d+(?:\.\d+)?)\s*(mL|L)$/.exec(s)
    if (m) return `vol:${(Number(m[1]) * VOL[m[2]]).toFixed(4)}`
    m = /^(\d+)\s+(\d+)\/(\d+)$/.exec(s)
    if (m) return `num:${(Number(m[1]) + Number(m[2]) / Number(m[3])).toFixed(6)}`
    m = /^(\d+)\/(\d+)$/.exec(s)
    if (m) return `num:${(Number(m[1]) / Number(m[2])).toFixed(6)}`
    m = /^(-?\d+(?:\.\d+)?)¢$/.exec(s)
    if (m) return `money:${Number(m[1]).toFixed(2)}`
    m = /^(-?\d+(?:\.\d+)?)$/.exec(s)
    if (m) return `num:${Number(m[1]).toFixed(6)}`
    return null
  }

  /**
   * Two buttons worth the same amount are one wrong answer written twice - or, if one of them is
   * right, two right answers. "About how long is a book? 2500 cm / 25 cm / 25 m" had the first and
   * the last as the same length; "2/4" once sat beside "1/2".
   * The exception is a question that asks whether two amounts are equal, where naming both is the
   * whole point: "Which is longer, 5 km or 5000 m?"
   */
  it('never offers two choices worth the same', () => {
    const bad: string[] = []
    for (const gen of GENERATORS) for (const grade of gen.grades) for (const tier of TIERS) {
      const rng = new Rng(`same-${gen.id}-${grade}-${tier}`)
      for (let i = 0; i < 120; i++) {
        const r = gen.make(grade, tier, rng)
        if (r.choices.some(c => /they are the same/.test(c.text ?? ''))) continue
        const vals = r.choices.map(c => (c.text ? valueOf(c.text) : null))
        for (let x = 0; x < vals.length; x++) for (let y = x + 1; y < vals.length; y++) {
          if (vals[x] && vals[x] === vals[y]) bad.push(`${gen.id} g${grade}: ${r.prompt.join(' / ')} :: ${r.choices.map(c => c.text).join(' | ')}`)
        }
      }
    }
    expect([...new Set(bad)].slice(0, 3)).toEqual([])
  })

  it('never offers a choice that is never right', () => {
    // "cannot tell" was on 631 of the comparison riddles and was the answer to none of them.
    const bad: string[] = []
    for (const gen of GENERATORS) for (const grade of gen.grades) for (const tier of TIERS) {
      const rng = new Rng(`dead-${gen.id}-${grade}-${tier}`)
      for (let i = 0; i < 120; i++) {
        const r = gen.make(grade, tier, rng)
        if (r.choices.some(c => /cannot tell|both at the same time|none of these/i.test(c.text ?? ''))) {
          bad.push(`${gen.id} g${grade}: ${r.choices.map(c => c.text).join(' | ')}`)
        }
      }
    }
    expect([...new Set(bad)].slice(0, 3)).toEqual([])
  })
})

describe('the answer does not stand out by its length', () => {
  /**
   * How often "always pick the longest choice" (or the shortest) would be right, against how often
   * guessing would. A child who works out that the long answer is usually the right one has found a
   * way to score without reading, and the riddle has stopped teaching anything. The gap was 17
   * points on the riddle family and 19 on vocabulary before their decoys were evened up; nothing is
   * allowed past 15 now, and the whole game sits within 2 points of chance.
   */
  it('no family rewards picking by length', () => {
    const bad: string[] = []
    let n = 0, longest = 0, shortest = 0, chance = 0
    for (const gen of GENERATORS) {
      let gn = 0, glo = 0, gsh = 0, gch = 0
      for (const grade of gen.grades) for (const tier of TIERS) {
        const rng = new Rng(`len-${gen.id}-${grade}-${tier}`)
        for (let i = 0; i < 120; i++) {
          const r = gen.make(grade, tier, rng)
          const lens = r.choices.map(c => (c.text ?? '').length)
          if (lens.some(x => x === 0)) continue
          gn++; gch += 1 / lens.length
          if (lens.indexOf(Math.max(...lens)) === r.answer) glo++
          if (lens.indexOf(Math.min(...lens)) === r.answer) gsh++
        }
      }
      if (gn < 100) continue
      n += gn; longest += glo; shortest += gsh; chance += gch
      const gap = 100 * Math.max(glo, gsh) / gn - 100 * gch / gn
      if (gap > 15) bad.push(`${gen.id}: picking by length wins ${(100 * Math.max(glo, gsh) / gn).toFixed(0)}% against ${(100 * gch / gn).toFixed(0)}% for guessing`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    const overall = 100 * Math.max(longest, shortest) / n - 100 * chance / n
    expect(overall, `across the whole game the gap is ${overall.toFixed(1)} points`).toBeLessThan(5)
  })
})

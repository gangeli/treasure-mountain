import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { TIERS, type Grade, type Riddle } from '../src/content/types'
import { READING2 } from '../src/content/generators/reading2'
import { standardChecks } from './helpers'
import { NOUNS, VERBS } from '../src/content/data/plurals'
import { CONTRACTIONS } from '../src/content/data/contractions'
import { HOMOPHONES } from '../src/content/data/homophones'
import { DERIVED } from '../src/content/data/affixes'
import { ANALOGIES } from '../src/content/data/analogies'
import { WORDS } from '../src/content/data/wordlist'
import { SENTENCES } from '../src/content/data/sentences'
import { POS_LISTS, TAGGED } from '../src/content/data/partsofspeech'
import { VOCAB } from '../src/content/data/vocabulary'

describe('reading2 generators', () => {
  standardChecks(READING2, it, expect)
})

const gen = (id: string) => READING2.find(g => g.id === id)!
function draws(id: string, count = 120): Riddle[] {
  const g = gen(id)
  const out: Riddle[] = []
  for (const grade of g.grades) for (const tier of TIERS) {
    const rng = new Rng(`check-${id}-${grade}-${tier}`)
    for (let i = 0; i < count; i++) out.push(g.make(grade as Grade, tier, rng))
  }
  return out
}
const answerText = (r: Riddle) => r.choices[r.answer].text!
const decoyTexts = (r: Riddle) => r.choices.filter((_, i) => i !== r.answer).map(c => c.text!)

describe('data sizes', () => {
  it('meets the minimum pool sizes', () => {
    expect(NOUNS.length).toBeGreaterThanOrEqual(60)
    expect(VERBS.length).toBeGreaterThanOrEqual(60)
    expect(CONTRACTIONS.length).toBeGreaterThanOrEqual(35)
    expect(HOMOPHONES.length).toBeGreaterThanOrEqual(45)
    expect(DERIVED.length).toBeGreaterThanOrEqual(90)
    expect(ANALOGIES.length).toBeGreaterThanOrEqual(80)
    expect(WORDS.length).toBeGreaterThanOrEqual(150)
    expect(SENTENCES.length).toBeGreaterThanOrEqual(120)
    expect(VOCAB.length).toBeGreaterThanOrEqual(120)
    for (const k of ['noun', 'verb', 'adjective'] as const) expect(POS_LISTS[k].length).toBeGreaterThanOrEqual(40)
    for (const k of ['adverb', 'pronoun', 'conjunction'] as const) expect(POS_LISTS[k].length).toBeGreaterThanOrEqual(20)
    expect(TAGGED.length).toBeGreaterThanOrEqual(30)
  })
  it('has no duplicate words across data pools', () => {
    const dup = (xs: string[]) => xs.filter((x, i) => xs.indexOf(x) !== i)
    expect(dup(NOUNS.map(n => n.singular))).toEqual([])
    expect(dup(VERBS.map(v => v.base))).toEqual([])
    expect(dup(CONTRACTIONS.map(c => c.short.toLowerCase()))).toEqual([])
    expect(dup(CONTRACTIONS.map(c => c.full.toLowerCase()))).toEqual([])
    expect(dup(DERIVED.map(d => d.word))).toEqual([])
    expect(dup(WORDS)).toEqual([])
    expect(dup(VOCAB.map(v => v.word))).toEqual([])
    expect(dup(SENTENCES.map(s => s.text))).toEqual([])
    const all = Object.values(POS_LISTS).flat().map(w => w.toLowerCase())
    expect(dup(all)).toEqual([])
  })
})

describe('plurals', () => {
  it('the answer is the plural or past tense from the data and no decoy is a valid form', () => {
    const plurals = new Map(NOUNS.map(n => [n.plural, n]))
    const pasts = new Map(VERBS.map(v => [v.past, v]))
    for (const r of draws('plurals')) {
      const a = answerText(r)
      const noun = plurals.get(a), verb = pasts.get(a)
      expect(noun || verb, `answer ${a} not in data`).toBeTruthy()
      const valid = new Set(noun ? [noun.plural, ...(noun.alt ?? [])] : [verb!.past, ...(verb!.alt ?? [])])
      for (const d of decoyTexts(r)) expect(valid.has(d), `${d} is a valid form for ${a}`).toBe(false)
      // The prompt names the singular / base form.
      const src = noun ? noun.singular : verb!.base
      const context = r.prompt[1] === 'Which word fills the blank?'
      if (!context) expect(r.prompt.join(' ').includes(src), `${src} missing from ${r.prompt.join(' ')}`).toBe(true)
      else expect(r.prompt[0].includes(verb!.obj)).toBe(true)
    }
  })
  it('grade 1 never asks verbs; grade 5 tier 3 asks harder forms than grade 1', () => {
    const pasts = new Set(VERBS.map(v => v.past))
    const rng = new Rng('g1')
    for (let i = 0; i < 100; i++) expect(pasts.has(answerText(gen('plurals').make(1, 1, rng)))).toBe(false)
  })
})

describe('contractions', () => {
  it('answers match the data and decoys are never another valid expansion', () => {
    const byShort = new Map(CONTRACTIONS.map(c => [c.short.toLowerCase(), c]))
    const byFull = new Map(CONTRACTIONS.map(c => [c.full.toLowerCase(), c]))
    for (const r of draws('contractions')) {
      const a = answerText(r)
      const c = byShort.get(a.toLowerCase()) ?? byFull.get(a.toLowerCase())
      expect(c, `answer ${a}`).toBeTruthy()
      const valid = new Set([c!.short, c!.full, ...(c!.alt ?? [])].map(s => s.toLowerCase()))
      for (const d of decoyTexts(r)) expect(valid.has(d.toLowerCase()), `${d} is valid for ${c!.short}`).toBe(false)
      // The prompt must name the contraction or its expansion - in the sentence mode the expansion
      // starts the sentence, so the match is case-insensitive.
      const quoted = r.prompt.join(' ').toLowerCase()
      expect(quoted.includes(c!.short.toLowerCase()) || quoted.includes(c!.full.toLowerCase())).toBe(true)
      // Whatever is highlighted has to be in the prompt, or the red words point at nothing.
      for (const h of r.highlight ?? []) expect(quoted.includes(h.toLowerCase()), `highlight ${h}`).toBe(true)
    }
  })
})

describe('homophones', () => {
  it('every sentence has exactly one blank and decoys never fit it', () => {
    for (const s of HOMOPHONES) for (const w of s.words) expect((w.sentence.match(/___/g) ?? []).length, w.sentence).toBe(1)
  })
  it('the answer is the word whose sentence is shown', () => {
    const bySentence = new Map<string, string>()
    for (const s of HOMOPHONES) for (const w of s.words) bySentence.set(w.sentence.replace(/\s+/g, ' '), w.word)
    let checked = 0
    for (const r of draws('homophones')) {
      const instructions = new Set(['Fill in the blank:', 'Which word fills the blank?', 'Which spelling is right here?'])
      const text = r.prompt.filter(l => !instructions.has(l)).join(' ')
      if (!text.includes('___')) continue // sound-alike mode
      checked++
      const key = [...bySentence.keys()].find(k => k === text)
      expect(key, `sentence not found: ${text}`).toBeTruthy()
      expect(answerText(r)).toBe(bySentence.get(key!))
      // No decoy is a homophone that also appears in the sentence's own set as the answer.
      expect(decoyTexts(r)).not.toContain(answerText(r))
    }
    expect(checked).toBeGreaterThan(100)
  })
  it('sound-alike mode answers really are in the same set as the quoted word', () => {
    for (const r of draws('homophones')) {
      const m = r.prompt[0].match(/"([^"]+)"/)
      if (!m || r.prompt.join(' ').includes('___')) continue
      const set = HOMOPHONES.find(s => s.words.some(w => w.word === m[1]) && s.words.some(w => w.word === answerText(r)))
      expect(set, `${m[1]} / ${answerText(r)}`).toBeTruthy()
      for (const d of decoyTexts(r)) expect(HOMOPHONES.some(s => s.words.some(w => w.word === m[1]) && s.words.some(w => w.word === d)), `${d} sounds like ${m[1]}`).toBe(false)
    }
  })
})

describe('affixes', () => {
  it('meanings and derived words come from the data; decoys are never the right word', () => {
    const byWord = new Map(DERIVED.map(d => [d.word, d]))
    const byMeaning = new Map(DERIVED.map(d => [d.meaning, d]))
    const real = new Set(DERIVED.map(d => d.word))
    for (const r of draws('affixes')) {
      const a = answerText(r)
      const text = r.prompt.join(' ')
      if (byWord.has(a)) {
        const d = byWord.get(a)!
        expect(text.includes(d.base) || text.includes(d.meaning)).toBe(true)
        for (const x of decoyTexts(r)) {
          expect(x).not.toBe(a)
          // A real-word decoy must not share the same affix (it would have the same meaning shape).
          if (real.has(x)) expect(byWord.get(x)!.affix, `${x} vs ${a}`).not.toBe(d.affix)
          else expect(d.fake ?? []).toContain(x)
        }
      } else if (byMeaning.has(a)) {
        const d = byMeaning.get(a)!
        expect(text.includes(d.word)).toBe(true)
        for (const x of decoyTexts(r)) expect(d.decoys).toContain(x)
      } else {
        // affix-meaning mode: the quoted word's affix means the answer
        const m = text.match(/In "([^"]+)"/)
        expect(m, text).toBeTruthy()
        expect(text.includes(byWord.get(m![1])!.affix)).toBe(true)
      }
    }
  })
})

describe('analogies', () => {
  it('fill-in answers are the fourth term and decoys are never it', () => {
    for (const r of draws('analogies')) {
      const a = answerText(r)
      if (a.includes(' : ')) {
        const [c, d] = a.split(' : ')
        const an = ANALOGIES.find(x => x.c === c && x.d === d)
        expect(an).toBeTruthy()
        expect(r.prompt[0]).toBe(`${an!.a} : ${an!.b}`)
        for (const x of decoyTexts(r)) { const [p, q] = x.split(' : '); expect(ANALOGIES.some(y => y.a === p && y.b === q && y.rel === an!.rel)).toBe(false) }
      } else {
        const text = r.prompt.join(' ').toLowerCase()
        const an = ANALOGIES.find(x => x.d === a && text.includes(x.a) && text.includes(x.b) && text.includes(x.c))
        expect(an, `${text} -> ${a}`).toBeTruthy()
        expect(decoyTexts(r)).not.toContain(an!.d)
      }
    }
  })
})

describe('alphabetical', () => {
  it('the answer is the true alphabetical first or last', () => {
    for (const r of draws('alphabetical')) {
      const words = r.choices.map(c => c.text!)
      const sorted = [...words].sort()
      const last = r.prompt.join(' ').toLowerCase().includes('last')
      expect(answerText(r)).toBe(last ? sorted[sorted.length - 1] : sorted[0])
      expect(new Set(words).size).toBe(words.length)
    }
  })
  it('grade 3 draws share a first letter and grade 4 draws share two letters', () => {
    const g = gen('alphabetical')
    for (const grade of [3, 4] as Grade[]) {
      const rng = new Rng('abc-' + grade)
      for (let i = 0; i < 80; i++) {
        const r = g.make(grade, 1, rng)
        const prefixes = new Set(r.choices.map(c => c.text!.slice(0, grade - 2)))
        expect(prefixes.size, r.choices.map(c => c.text).join(',')).toBe(1)
      }
    }
  })
})

describe('sentences', () => {
  it('answers and decoys come from the sentence entry', () => {
    const byText = new Map(SENTENCES.map(s => [s.text.replace(/\s+/g, ' '), s]))
    for (const r of draws('sentences')) {
      const text = r.prompt.filter(l => l.includes('___') || !/blank|fits|sense/i.test(l)).filter(l => l !== 'Fill in the blank:').join(' ')
      const s = byText.get(text)
      expect(s, text).toBeTruthy()
      expect(answerText(r)).toBe(s!.answer)
      for (const d of decoyTexts(r)) expect(s!.decoys).toContain(d)
    }
  })
})

describe('parts of speech', () => {
  it('decoys are never in the answer part-of-speech list, and sentence answers are tagged correctly', () => {
    const lists = POS_LISTS
    for (const r of draws('partsofspeech')) {
      const text = r.prompt.join(' ')
      const a = answerText(r)
      const posMatch = text.match(/is an? (noun|verb|adjective|adverb|pronoun|conjunction)\?/)
      if (text.startsWith('"') && posMatch) {
        const pos = posMatch[1] as keyof typeof lists
        const t = TAGGED.find(t => text.includes(t.text))!
        expect(t).toBeTruthy()
        expect(t.tags[a]).toBe(pos)
        for (const d of decoyTexts(r)) expect(t.tags[d], `${d} in ${t.text}`).not.toBe(pos)
      } else if (posMatch) {
        const pos = posMatch[1] as keyof typeof lists
        expect(lists[pos]).toContain(a)
        for (const d of decoyTexts(r)) expect(lists[pos], `${d} is also ${pos}`).not.toContain(d)
      } else {
        // identify mode: the answer is the part of speech of the quoted word
        const m = text.match(/"([^"]+)"/)!
        expect(lists[a as keyof typeof lists]).toContain(m[1])
      }
    }
  })
})

describe('vocabulary', () => {
  it('definition answers match the word and reverse-mode decoys are never synonyms', () => {
    const byWord = new Map(VOCAB.map(v => [v.word, v]))
    const byDef = new Map(VOCAB.map(v => [v.def, v]))
    for (const r of draws('vocabulary')) {
      const a = answerText(r)
      const text = r.prompt.join(' ')
      if (text.startsWith('Which word means')) {
        const v = byWord.get(a)!
        expect(v, a).toBeTruthy()
        expect(text.includes(`"${v.def}"`)).toBe(true)
        for (const d of decoyTexts(r)) {
          const other = byWord.get(d)!
          expect(other).toBeTruthy()
          expect(v.group !== undefined && other.group === v.group, `${d} is a synonym of ${a}`).toBe(false)
        }
      } else {
        const v = byDef.get(a)!
        expect(v, a).toBeTruthy()
        expect(text.includes(`"${v.word}"`)).toBe(true)
        for (const d of decoyTexts(r)) expect(v.decoys).toContain(d)
      }
    }
  })
})

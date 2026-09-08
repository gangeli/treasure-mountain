import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { READING } from '../src/content/generators/reading'
import { TIERS, type Generator, type Riddle } from '../src/content/types'
import { standardChecks } from './helpers'
import { OPPOSITES } from '../src/content/data/opposites'
import { SYNONYMS } from '../src/content/data/synonyms'
import { antonymsOf, synonymsOf } from '../src/content/data/vocab'
import { CATEGORIES } from '../src/content/data/categories'
import { COMPOUNDS, compoundWord } from '../src/content/data/compounds'
import { ASSOCIATIONS } from '../src/content/data/associations'
import { SYLLABLE_WORDS } from '../src/content/data/syllables'
import { VOWEL_SOUNDS } from '../src/content/data/phonics'

describe('reading generators: standard checks', () => {
  standardChecks(READING, it, expect)
})

const gen = (id: string): Generator => READING.find(g => g.id === id)!
const lower = (s: string) => s.toLowerCase()
const text = (r: Riddle, i: number) => r.choices[i].text ?? ''
const answerText = (r: Riddle) => text(r, r.answer)
const decoyTexts = (r: Riddle) => r.choices.filter((_, i) => i !== r.answer).map(c => c.text ?? '')

/** Runs `check` on `seeds` riddles from every grade/tier of a generator, collecting failures. */
function forEachRiddle(id: string, seeds: number, check: (r: Riddle) => string | null): void {
  const g = gen(id)
  const errs: string[] = []
  for (const grade of g.grades) for (const tier of TIERS) {
    const rng = new Rng(`${id}-check-${grade}-${tier}`)
    for (let i = 0; i < seeds; i++) {
      const r = g.make(grade, tier, rng)
      const e = check(r)
      if (e) errs.push(`g${grade} t${tier} seed ${i}: ${e} :: ${r.prompt.join(' / ')} [${r.choices.map(c => c.text ?? 'pic').join(', ')}]`)
    }
  }
  expect(errs.slice(0, 8)).toEqual([])
}

describe('data sizes', () => {
  it('meets the minimum list sizes', () => {
    expect(COMPOUNDS.length).toBeGreaterThanOrEqual(80)
    expect(OPPOSITES.length).toBeGreaterThanOrEqual(120)
    expect(SYNONYMS.length).toBeGreaterThanOrEqual(120)
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(40)
    expect(ASSOCIATIONS.length).toBeGreaterThanOrEqual(100)
  })
  it('compound halves and words are lowercase letters, and no compound is duplicated', () => {
    const seen = new Set<string>()
    for (const c of COMPOUNDS) {
      expect(c.a).toMatch(/^[a-z]+$/)
      expect(c.b).toMatch(/^[a-z]+$/)
      expect(seen.has(compoundWord(c)), compoundWord(c)).toBe(false)
      seen.add(compoundWord(c))
    }
  })
  it('opposite pairs are not also listed as synonyms', () => {
    for (const p of OPPOSITES) expect(synonymsOf(p.a).map(lower), `${p.a}/${p.b}`).not.toContain(lower(p.b))
  })
})

describe('opposites', () => {
  it('answer is a listed antonym; decoys are never synonyms or antonyms of the word or answer', () => {
    forEachRiddle('opposites', 300, r => {
      if (!r.highlight) {
        // pair mode: the answer pair must be listed, decoy pairs must not be antonyms
        const [a, b] = answerText(r).split(' / ')
        if (!antonymsOf(a).map(lower).includes(lower(b))) return `answer pair not listed: ${a}/${b}`
        for (const d of decoyTexts(r)) { const [x, y] = d.split(' / '); if (antonymsOf(x).map(lower).includes(lower(y))) return `decoy pair is antonyms: ${d}` }
        return null
      }
      const word = r.highlight[0]
      const ans = answerText(r)
      if (!antonymsOf(word).map(lower).includes(lower(ans))) return `answer ${ans} is not an antonym of ${word}`
      for (const d of decoyTexts(r)) {
        if (antonymsOf(word).map(lower).includes(lower(d))) return `decoy ${d} is an antonym of ${word}`
        if (synonymsOf(word).map(lower).includes(lower(d))) return `decoy ${d} is a synonym of ${word}`
        if (synonymsOf(ans).map(lower).includes(lower(d))) return `decoy ${d} is a synonym of the answer ${ans}`
        if (antonymsOf(ans).map(lower).includes(lower(d))) return `decoy ${d} is an antonym of the answer ${ans}`
        if (lower(d) === lower(word)) return `decoy equals the word ${word}`
      }
      return null
    })
  })
})

describe('synonyms', () => {
  it('answer is a listed synonym; decoys are never synonyms or antonyms of the word or answer', () => {
    forEachRiddle('synonyms', 300, r => {
      if (!r.highlight) {
        const [a, b] = answerText(r).split(' / ')
        if (!synonymsOf(a).map(lower).includes(lower(b))) return `answer pair not listed: ${a}/${b}`
        for (const d of decoyTexts(r)) { const [x, y] = d.split(' / '); if (synonymsOf(x).map(lower).includes(lower(y))) return `decoy pair is synonyms: ${d}` }
        return null
      }
      const word = r.highlight[0]
      const ans = answerText(r)
      if (!synonymsOf(word).map(lower).includes(lower(ans))) return `answer ${ans} is not a synonym of ${word}`
      for (const d of decoyTexts(r)) {
        if (synonymsOf(word).map(lower).includes(lower(d))) return `decoy ${d} is a synonym of ${word}`
        if (antonymsOf(word).map(lower).includes(lower(d))) return `decoy ${d} is an antonym of ${word}`
        if (synonymsOf(ans).map(lower).includes(lower(d))) return `decoy ${d} is a synonym of the answer ${ans}`
        if (antonymsOf(ans).map(lower).includes(lower(d))) return `decoy ${d} is an antonym of the answer ${ans}`
      }
      return null
    })
  })
})

describe('categories', () => {
  const memberOf = (cat: { members: string[] }, w: string) => cat.members.some(m => lower(m) === lower(w))
  it('answers are members and decoys are never members of the category (or any overlapping one)', () => {
    forEachRiddle('categories', 300, r => {
      const line = r.prompt.find(l => l.startsWith('Which one')) ?? ''
      const which = /^Which one is (.+)\?$/.exec(line)
      if (which) {
        const cat = CATEGORIES.find(c => c.one === which[1])
        if (!cat) return `unknown category ${which[1]}`
        if (!memberOf(cat, answerText(r))) return `answer not a member`
        for (const d of decoyTexts(r)) for (const c of CATEGORIES) if (memberOf(c, d) && c.members.some(m => memberOf(cat, m))) return `decoy ${d} belongs to ${c.id}, which overlaps ${cat.id}`
        return null
      }
      if (line === 'Which one does not belong?') {
        // Some category K holds all the others, and the answer is in no category that overlaps K.
        const others = decoyTexts(r)
        const ans = answerText(r)
        const cats = CATEGORIES.filter(c => others.every(o => memberOf(c, o)))
        if (cats.length === 0) return `no category contains ${others.join(', ')}`
        const hint = /of these are (.+)\.$/.exec(r.prompt[1] ?? '')
        if (hint && !cats.some(c => c.many === hint[1])) return `hint ${hint[1]} does not match`
        const good = cats.filter(k => !CATEGORIES.some(c => memberOf(c, ans) && c.members.some(m => memberOf(k, m))))
        if (good.length === 0) return `answer ${ans} overlaps every category holding the others`
        return null
      }
      // name mode
      const shown = r.highlight ?? []
      const ansCat = CATEGORIES.find(c => c.many === answerText(r))
      if (!ansCat) return `unknown category name ${answerText(r)}`
      if (!shown.every(s => memberOf(ansCat, s))) return `shown words are not all ${ansCat.id}`
      for (const d of decoyTexts(r)) { const c = CATEGORIES.find(k => k.many === d); if (c && shown.some(s => memberOf(c, s))) return `decoy category ${d} contains a shown word` }
      return null
    })
  })
})

describe('compounds', () => {
  it('exactly one choice is the real compound of the two halves', () => {
    forEachRiddle('compounds', 300, r => {
      const split = /^Which two words make "(\w+)"\?$/.exec(r.prompt[0])
      if (split) {
        const word = split[1]
        const good = r.choices.filter(c => (c.text ?? '').replace(' + ', '') === word && COMPOUNDS.some(k => `${k.a} + ${k.b}` === c.text))
        if (good.length !== 1) return `${good.length} valid splits for ${word}`
        if (answerText(r).replace(' + ', '') !== word) return 'answer is not the split'
        return null
      }
      const blank = /^(\w+) \+ (\w+) = ______\.$/.exec(r.prompt[r.prompt.length - 1])
      if (!blank) return 'no blank line'
      const word = lower(blank[1]) + blank[2]
      const matches = r.choices.filter(c => c.text === word)
      if (matches.length !== 1 || answerText(r) !== word) return `expected exactly one ${word}`
      if (!COMPOUNDS.some(c => compoundWord(c) === word)) return `${word} not in data`
      for (const d of decoyTexts(r)) {
        if (!COMPOUNDS.some(c => compoundWord(c) === d)) return `decoy ${d} is not a listed compound`
        if (d === blank[2] + lower(blank[1])) return `decoy ${d} is the reversed compound`
      }
      if (r.prompt.length !== 4) return 'expected three worked examples'
      return null
    })
  })
})

describe('associations', () => {
  it('answers are listed and decoys are never acceptable answers', () => {
    forEachRiddle('associations', 300, r => {
      const key = r.highlight?.[0]
      if (!key) return 'no highlight'
      const ans = answerText(r)
      const fwd = ASSOCIATIONS.filter(p => lower(p.a) === lower(key))
      if (fwd.some(p => lower(p.b) === lower(ans))) {
        const p = fwd.find(x => lower(x.b) === lower(ans))!
        const ok = new Set(ASSOCIATIONS.filter(q => q.rel === p.rel && lower(q.a) === lower(p.a)).flatMap(q => [q.b, ...(q.also ?? [])]).map(lower))
        for (const d of decoyTexts(r)) if (ok.has(lower(d))) return `decoy ${d} is acceptable for ${key}`
        return null
      }
      // reverse: the highlight is the object, the answer is the subject
      const rev = ASSOCIATIONS.find(p => lower(p.b) === lower(key) && lower(p.a) === lower(ans))
      if (!rev) return `no pair for ${ans} -> ${key}`
      for (const d of decoyTexts(r)) {
        const pairs = ASSOCIATIONS.filter(q => q.rel === rev.rel && lower(q.a) === lower(d))
        if (pairs.some(q => lower(q.b) === lower(key) || (q.also ?? []).some(x => lower(x) === lower(key)))) return `decoy ${d} also fits ${key}`
      }
      return null
    })
  })
})

describe('syllables', () => {
  it('counts match the word lists', () => {
    forEachRiddle('syllables', 300, r => {
      const count = /syllables (?:are )?in "(\w+)"\?$/.exec(r.prompt[r.prompt.length - 1])
      if (count) {
        const k = Number(answerText(r))
        if (!SYLLABLE_WORDS[k]?.includes(count[1])) return `${count[1]} does not have ${k} syllables`
        return null
      }
      const which = /^Which word has (\d) syllables?\?$/.exec(r.prompt[0])
      if (!which) return 'unrecognised prompt'
      const k = Number(which[1])
      if (!SYLLABLE_WORDS[k].includes(answerText(r))) return `answer ${answerText(r)} does not have ${k} syllables`
      for (const d of decoyTexts(r)) if (SYLLABLE_WORDS[k].includes(d)) return `decoy ${d} also has ${k} syllables`
      return null
    })
  })
})

describe('vowels', () => {
  const familyOf = (w: string) => Object.keys(VOWEL_SOUNDS).find(k => VOWEL_SOUNDS[k].words.includes(w) || VOWEL_SOUNDS[k].sample === w)
  it('answer shares the vowel sound and decoys never do', () => {
    forEachRiddle('vowels', 300, r => {
      const ans = answerText(r)
      const same = /same vowel sound as (\w+)\?$/.exec(r.prompt[0])
      const named = /^Which word has the (long|short) ([aeiou]) sound\?$/.exec(r.prompt[0])
      if (same || r.highlight) {
        const sample = same ? same[1] : r.highlight![0]
        const fam = familyOf(sample)
        if (!fam || familyOf(ans) !== fam) return `${ans} is not ${fam}`
        for (const d of decoyTexts(r)) if (familyOf(d) === fam) return `decoy ${d} is also ${fam}`
        return null
      }
      if (named) {
        const fam = `${named[1]} ${named[2]}`
        if (familyOf(ans) !== fam) return `${ans} is not ${fam}`
        for (const d of decoyTexts(r)) if (familyOf(d) === fam) return `decoy ${d} is also ${fam}`
        return null
      }
      // odd one out: the decoys share a family, the answer does not
      const fams = new Set(decoyTexts(r).map(familyOf))
      if (fams.size !== 1) return 'others do not share a sound'
      if (fams.has(familyOf(ans))) return 'answer shares the sound'
      return null
    })
  })
})

describe('letters', () => {
  it('choices are letter pictures and the answer matches the prompt', () => {
    forEachRiddle('letters', 200, r => {
      for (const c of r.choices) if (!c.visual || c.visual.kind !== 'letter') return 'choice is not a letter picture'
      const ans = r.choices[r.answer].visual as { kind: 'letter'; text: string }
      const m = /letter (\w)\?|little (\w)\?|big (\w)\?|after (\w)\?|before (\w)\?|between (\w) and (\w)\?|"([\w-]+)" start with\?/.exec(r.prompt[r.prompt.length - 1])
      if (!m) return 'unrecognised prompt'
      const alpha = 'abcdefghijklmnopqrstuvwxyz'
      const expected = m[1] ?? m[2] ?? m[3] ?? (m[4] ? alpha[alpha.indexOf(m[4].toLowerCase()) + 1] : m[5] ? alpha[alpha.indexOf(m[5].toLowerCase()) - 1] : m[6] ? alpha[alpha.indexOf(m[6].toLowerCase()) + 1] : m[8][0])
      if (lower(ans.text) !== lower(expected)) return `answer ${ans.text} != ${expected}`
      return null
    })
  })
})

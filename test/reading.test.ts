import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { READING } from '../src/content/generators/reading'
import { TIERS, type Generator, type Grade, type Riddle, type Tier } from '../src/content/types'
import { standardChecks } from './helpers'
import { OPPOSITES } from '../src/content/data/opposites'
import { SYNONYMS } from '../src/content/data/synonyms'
import { antonymsOf, synonymsOf, relatedTo, sameRoot, isAmbiguous, tooClose } from '../src/content/data/vocab'
import { CATEGORIES, type Category } from '../src/content/data/categories'
import { COMPOUNDS, compoundWord, type Compound } from '../src/content/data/compounds'
import { ASSOCIATIONS } from '../src/content/data/associations'
import { SYLLABLE_WORDS } from '../src/content/data/syllables'
import { VOWEL_SOUNDS, vowelSoundOf } from '../src/content/data/phonics'
import { compoundPool } from '../src/content/generators/compounds'

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

describe('opposites and synonyms: exactness', () => {
  const pairOf = (a: string, b: string) => OPPOSITES.find(p =>
    (lower(p.a) === lower(a) && lower(p.b) === lower(b)) || (lower(p.a) === lower(b) && lower(p.b) === lower(a)))
  const groupOf = (a: string, b: string) => SYNONYMS.find(g =>
    g.words.some(w => lower(w) === lower(a)) && g.words.some(w => lower(w) === lower(b)))
  const glossed = (r: Riddle, w: string) => r.prompt.some(l => l.startsWith(`(${w} = `))

  /** A decoy must be defensibly wrong: unrelated to the word and to the answer through the whole data. */
  const decoyErrors = (r: Riddle, word: string, ans: string): string | null => {
    const near = new Set([...relatedTo(word), ...relatedTo(ans)])
    const decoys = decoyTexts(r)
    for (const d of decoys) {
      if (lower(d) === lower(word)) return `decoy ${d} is the asked word`
      if (near.has(lower(d))) return `decoy ${d} is a synonym or antonym of ${word}/${ans} (within two hops)`
      if (sameRoot(d, word) || sameRoot(d, ans)) return `decoy ${d} shares a root with ${word}/${ans}`
      if (isAmbiguous(d)) return `decoy ${d} has more than one sense and no way to pin it`
    }
    for (let i = 0; i < decoys.length; i++) for (let j = i + 1; j < decoys.length; j++) {
      if (tooClose(decoys[i], decoys[j])) return `decoys ${decoys[i]} and ${decoys[j]} cancel each other out`
    }
    return null
  }

  it('opposites: answers sit in the pool for that grade and tier, senses are pinned, decoys are clean', () => {
    forEachRiddle('opposites', 320, r => {
      if (!r.highlight) {
        const [a, b] = answerText(r).split(' / ')
        const p = pairOf(a, b)
        if (!p) return `answer pair ${a}/${b} is not in the data`
        if (p.grade !== r.grade || p.tier !== r.tier) return `answer pair ${a}/${b} belongs to g${p.grade} t${p.tier}`
        for (const d of decoyTexts(r)) {
          const [x, y] = d.split(' / ')
          if (pairOf(x, y)) return `decoy pair ${d} is also a listed antonym pair`
          if (antonymsOf(x).map(lower).includes(lower(y))) return `decoy pair ${d} are antonyms`
          // A synonym pair is a deliberate decoy (it plainly means the same). Anything else must
          // share no scale at all, or a child could argue it into being an opposite.
          if (synonymsOf(x).map(lower).includes(lower(y))) continue
          const rx = relatedTo(x)
          for (const w of relatedTo(y)) if (rx.has(w)) return `decoy pair ${d} sits on one shared scale`
        }
        return null
      }
      const word = r.highlight[0]
      const ans = answerText(r)
      const p = pairOf(word, ans)
      if (!p) return `${word}/${ans} is not a listed antonym pair`
      if (p.grade !== r.grade || p.tier !== r.tier) return `${word}/${ans} belongs to g${p.grade} t${p.tier}`
      if (isAmbiguous(word) && !glossed(r, word)) return `${word} has several senses and none is pinned`
      if (isAmbiguous(word) && !p.gloss?.[word]) return `${word} is asked without a gloss in the data`
      return decoyErrors(r, word, ans)
    })
  })

  it('synonyms: answers sit in the pool for that grade and tier, senses are pinned, decoys are clean', () => {
    forEachRiddle('synonyms', 320, r => {
      if (!r.highlight) {
        const [a, b] = answerText(r).split(' / ')
        const g = groupOf(a, b)
        if (!g) return `answer pair ${a}/${b} is not one synonym group`
        if (g.grade !== r.grade || g.tier !== r.tier) return `answer pair ${a}/${b} belongs to g${g.grade} t${g.tier}`
        for (const d of decoyTexts(r)) {
          const [x, y] = d.split(' / ')
          if (groupOf(x, y)) return `decoy pair ${d} is also a listed synonym group`
          if (synonymsOf(x).map(lower).includes(lower(y))) return `decoy pair ${d} are synonyms`
          // An antonym pair is a deliberate decoy (related, but the wrong way round). Anything else
          // must share no scale at all, so it can never be argued into meaning the same.
          if (antonymsOf(x).map(lower).includes(lower(y))) continue
          const rx = relatedTo(x)
          for (const w of relatedTo(y)) if (rx.has(w)) return `decoy pair ${d} sits on one shared scale`
        }
        return null
      }
      const word = r.highlight[0]
      const ans = answerText(r)
      const g = groupOf(word, ans)
      if (!g) return `${word}/${ans} is not one synonym group`
      if (g.grade !== r.grade || g.tier !== r.tier) return `${word}/${ans} belongs to g${g.grade} t${g.tier}`
      if (isAmbiguous(word) && !glossed(r, word)) return `${word} has several senses and none is pinned`
      if (isAmbiguous(word) && !g.gloss?.[word]) return `${word} is asked without a gloss in the data`
      return decoyErrors(r, word, ans)
    })
  })
})

describe('opposites and synonyms: pools', () => {
  const poolsOf = <T>(items: T[], key: (t: T) => string) => {
    const m = new Map<string, T[]>()
    for (const it of items) { const k = key(it); const l = m.get(k) ?? []; l.push(it); m.set(k, l) }
    return m
  }
  it('every (grade, tier) pool is big enough to keep 150 draws varied', () => {
    for (const [k, ps] of poolsOf(OPPOSITES, p => `${p.grade}-${p.tier}`)) expect(ps.length, `opposites ${k}`).toBeGreaterThanOrEqual(13)
    for (const [k, gs] of poolsOf(SYNONYMS, g => `${g.grade}-${g.tier}`)) expect(gs.length, `synonyms ${k}`).toBeGreaterThanOrEqual(12)
  })
  it('no word is used twice inside one pool, so a tier never asks two questions about it', () => {
    for (const [k, ps] of poolsOf(OPPOSITES, p => `${p.grade}-${p.tier}`)) {
      const ws = ps.flatMap(p => [lower(p.a), lower(p.b)])
      expect(new Set(ws).size, `opposites ${k} repeats a word`).toBe(ws.length)
    }
    for (const [k, gs] of poolsOf(SYNONYMS, g => `${g.grade}-${g.tier}`)) {
      const ws = gs.flatMap(g => g.words.map(lower))
      expect(new Set(ws).size, `synonyms ${k} repeats a word`).toBe(ws.length)
    }
  })
  it('no pair or group is repeated in another pool, so tier 3 cannot ask what tier 1 asked', () => {
    const seenP = new Map<string, string>()
    for (const p of OPPOSITES) {
      const k = [lower(p.a), lower(p.b)].sort().join('-')
      expect(seenP.has(k), `${k} appears in g${p.grade}t${p.tier} and ${seenP.get(k)}`).toBe(false)
      seenP.set(k, `g${p.grade}t${p.tier}`)
    }
    const seenG = new Map<string, string>()
    for (const g of SYNONYMS) for (let i = 0; i < g.words.length; i++) for (let j = i + 1; j < g.words.length; j++) {
      const k = [lower(g.words[i]), lower(g.words[j])].sort().join('-')
      expect(seenG.has(k), `${k} appears in g${g.grade}t${g.tier} and ${seenG.get(k)}`).toBe(false)
      seenG.set(k, `g${g.grade}t${g.tier}`)
    }
  })
  it('every pair and group can be asked: at least one word is unambiguous or glossed', () => {
    for (const p of OPPOSITES) expect([p.a, p.b].some(w => !isAmbiguous(w) || p.gloss?.[w]), `${p.a}/${p.b}`).toBe(true)
    for (const g of SYNONYMS) expect(g.words.some(w => !isAmbiguous(w) || g.gloss?.[w]), g.words.join('/')).toBe(true)
  })
  it('a listed antonym pair is never also listed as synonyms, in either data file', () => {
    for (const p of OPPOSITES) expect(synonymsOf(p.a).map(lower), `${p.a}/${p.b}`).not.toContain(lower(p.b))
    for (const g of SYNONYMS) for (const x of g.words) for (const y of g.words) {
      if (x !== y) expect(antonymsOf(x).map(lower), `${x}/${y}`).not.toContain(lower(y))
    }
  })
})

describe('categories', () => {
  const memberOf = (cat: { members: string[]; extra?: string[] }, w: string) => [...cat.members, ...(cat.extra ?? [])].some(m => lower(m) === lower(w))
  const overlaps = (a: Category, b: Category) => [...a.members, ...(a.extra ?? [])].some(m => memberOf(b, m))
  /** A decoy is never a member (explicit or implicit) of the category; without decoysFrom it also belongs to no overlapping category. */
  const validDecoy = (cat: Category, d: string): string | null => {
    if (memberOf(cat, d)) return `decoy ${d} is a member of ${cat.id}`
    if (cat.decoysFrom) return cat.decoysFrom.some(id => CATEGORIES.find(c => c.id === id)!.members.includes(d)) ? null : `decoy ${d} is not from a sibling of ${cat.id}`
    for (const c of CATEGORIES) if (memberOf(c, d) && overlaps(c, cat)) return `decoy ${d} belongs to ${c.id}, which overlaps ${cat.id}`
    return null
  }
  it('answers are members and decoys are never members of the category (or any overlapping one)', () => {
    forEachRiddle('categories', 300, r => {
      const line = r.prompt.find(l => l.startsWith('Which one')) ?? ''
      const which = /^Which one is (.+)\?$/.exec(line)
      if (which) {
        const cat = CATEGORIES.find(c => c.one === which[1])
        if (!cat) return `unknown category ${which[1]}`
        if (!cat.members.includes(answerText(r))) return `answer not a member`
        for (const d of decoyTexts(r)) { const e = validDecoy(cat, d); if (e) return e }
        return null
      }
      if (line === 'Which one does not belong?') {
        // Some category K holds all the others and the answer is a valid decoy for K.
        const others = decoyTexts(r)
        const ans = answerText(r)
        const cats = CATEGORIES.filter(c => others.every(o => c.members.includes(o)))
        if (cats.length === 0) return `no category contains ${others.join(', ')}`
        const hint = /of these are (.+)\.$/.exec(r.prompt[1] ?? '')
        if (hint && !cats.some(c => c.many === hint[1])) return `hint ${hint[1]} does not match`
        if (!cats.some(k => validDecoy(k, ans) === null)) return `answer ${ans} is not a valid outsider for ${cats.map(c => c.id).join('/')}`
        return null
      }
      // name mode
      const shown = r.highlight ?? []
      const ansCat = CATEGORIES.find(c => c.many === answerText(r))
      if (!ansCat) return `unknown category name ${answerText(r)}`
      if (!shown.every(s => ansCat.members.includes(s))) return `shown words are not all ${ansCat.id}`
      for (const d of decoyTexts(r)) {
        const c = CATEGORIES.find(k => k.many === d)
        if (!c) return `unknown decoy category ${d}`
        if (c.broad) return `broad category ${d} offered as a decoy`
        if (shown.some(s => memberOf(c, s))) return `decoy category ${d} contains a shown word`
      }
      return null
    })
  })
})

describe('compounds', () => {
  const byWord = new Map(COMPOUNDS.map(c => [compoundWord(c), c]))
  const shares = (a: Compound, b: Compound) => a.a === b.a || a.b === b.b || a.a === b.b || a.b === b.a

  it('holds only real closed compounds of two free words', () => {
    // -hood / -like / -wise are suffixes, not words: those are derived words, not compounds.
    for (const c of COMPOUNDS) expect(['hood', 'like', 'wise'].includes(c.b), `${compoundWord(c)} ends in a suffix, not a word`).toBe(false)
    // False compounds (mushroom is one morpheme) and open compounds ("car wash", "clock tower").
    for (const w of ['mushroom', 'underneath', 'carwash', 'watertower', 'clocktower', 'nightwatch', 'hotdog', 'toybox', 'toyshop', 'firearm', 'weathercock']) {
      expect(byWord.has(w), `${w} is not a closed compound of two free words`).toBe(false)
    }
  })

  it('every grade owns its own answer words and the tiers inside a grade never overlap', () => {
    const seen = new Map<string, string>()
    const clashes: string[] = []
    for (const grade of [1, 2, 3, 4] as Grade[]) for (const tier of TIERS) {
      for (const c of compoundPool(grade, tier)) {
        const w = compoundWord(c)
        if (seen.has(w)) clashes.push(`${w}: ${seen.get(w)} and g${grade} t${tier}`)
        seen.set(w, `g${grade} t${tier}`)
      }
      expect(compoundPool(grade, tier).length, `g${grade} t${tier} pool`).toBeGreaterThanOrEqual(12)
    }
    expect(clashes).toEqual([])
  })

  it('exactly one choice is the real compound, decoys are on theme, and no reversal is offered', () => {
    forEachRiddle('compounds', 300, r => {
      const split = /^Which two words make "(\w+)"\?$/.exec(r.prompt[0])
      if (split) {
        const word = split[1]
        const target = byWord.get(word)
        if (!target) return `${word} not in data`
        const good = r.choices.filter(c => (c.text ?? '').replace(' + ', '') === word && COMPOUNDS.some(k => `${k.a} + ${k.b}` === c.text))
        if (good.length !== 1) return `${good.length} valid splits for ${word}`
        if (answerText(r).replace(' + ', '') !== word) return 'answer is not the split'
        let onTheme = 0
        for (const d of decoyTexts(r)) {
          if (d === `${target.b} + ${target.a}`) return `decoy ${d} offers the compound reversed`
          const [x, y] = d.split(' + ')
          if (x + y === word || [target.a, target.b].includes(x) || [target.a, target.b].includes(y)) onTheme++
        }
        if (onTheme < 2) return `only ${onTheme} decoys are built from "${word}"`
        return null
      }
      const blank = /^(\w+) \+ (\w+) = ______\.$/.exec(r.prompt[r.prompt.length - 1])
      if (!blank) return 'no blank line'
      const word = lower(blank[1]) + blank[2]
      const target = byWord.get(word)
      if (!target) return `${word} not in data`
      if (r.prompt.length !== 4) return 'expected three worked examples'
      if (r.choices.filter(c => c.text === word).length !== 1 || answerText(r) !== word) return `expected exactly one ${word}`
      let onTheme = 0
      for (const d of decoyTexts(r)) {
        const c = byWord.get(d)
        if (!c) return `decoy ${d} is not a listed compound`
        if (d === target.b + target.a) return `decoy ${d} is the reversed compound`
        if (c.level !== target.level) return `decoy ${d} is not from grade ${r.grade}'s own word pool`
        if (shares(c, target)) onTheme++
      }
      if (onTheme < 2) return `only ${onTheme} decoys share a half with ${word}`
      // A worked example must never be the answer to any riddle of this grade.
      const poolWords = new Set(TIERS.flatMap(t => compoundPool(r.grade, t)).map(compoundWord))
      for (const line of r.prompt.slice(0, 3)) {
        const ex = /= (\w+)$/.exec(line)
        if (!ex) return `bad example line "${line}"`
        if (!byWord.has(ex[1])) return `example ${ex[1]} is not a listed compound`
        if (poolWords.has(ex[1])) return `example ${ex[1]} is also an answer in grade ${r.grade}`
        if (r.choices.some(c => c.text === ex[1])) return `example ${ex[1]} is offered as a choice`
      }
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
  const KEYS = Object.keys(VOWEL_SOUNDS)
  /** Words whose vowel is not the same for every child (regional variation) or not fixed at all. */
  const RISKY = ['dog', 'log', 'fog', 'frog', 'hog', 'off', 'boss', 'moss', 'cross', 'song', 'long', 'wrong', 'water', 'wash',
    'tune', 'news', 'dew', 'read', 'live', 'wind', 'bow', 'wound', 'roof', 'root', 'book', 'foot', 'cook', 'pull', 'put', 'sure']
  /** A spelling that can make the sound, checked independently of the table. */
  const SPELLING: Record<string, RegExp> = {
    'short a': /^[^aeiou]*a[^aeiou]*$/, 'short e': /^[^aeiou]*e[^aeiou]*$/, 'short i': /^[^aeiou]*i[^aeiou]*$/,
    'short o': /^[^aeiou]*o[^aeiou]*$/, 'short u': /^[^aeiou]*u[^aeiou]*$/,
    'long a': /a[^aeiou]e$|ai|ay/, 'long e': /ee|ea|ey$|e[^aeiou]e$|ie/, 'long i': /i[^aeiou]e$|igh|y$|ie$/,
    'long o': /o[^aeiou]e$|oa|ow|oe$|o$/, 'long u': /u[^aeiou]e$|u$|ew$|u/, oo: /oo|ue$|ui|u[^aeiou]e$|ou/,
  }

  it('no word sits in two sound groups, so a decoy can never also be a right answer', () => {
    const owner = new Map<string, string>()
    const clashes: string[] = []
    for (const k of KEYS) for (const w of VOWEL_SOUNDS[k].words) {
      if (owner.has(w)) clashes.push(`${w} is in ${owner.get(w)} and ${k}`)
      owner.set(w, k)
    }
    expect(clashes).toEqual([])
  })

  it('every word in a group really has that group’s vowel sound', () => {
    const bad: string[] = []
    for (const k of KEYS) for (const w of VOWEL_SOUNDS[k].words) {
      if (!SPELLING[k].test(w)) bad.push(`${w} cannot be ${k}`)
      if (k === 'long u' && /oo/.test(w)) bad.push(`${w} is the /oo/ sound, not ${k}`)
      if (RISKY.includes(w)) bad.push(`${w} is not the same vowel for every child`)
    }
    expect(bad).toEqual([])
    expect(KEYS.every(k => VOWEL_SOUNDS[k].words.length >= 10)).toBe(true)
  })

  it('the answer has the sound the riddle asks for and no decoy has it too', () => {
    forEachRiddle('vowels', 300, r => {
      const ans = answerText(r)
      const ansSound = vowelSoundOf(ans)
      if (r.prompt[0].startsWith('Which word has a different')) {
        const others = decoyTexts(r).map(d => vowelSoundOf(d))
        if (new Set(others).size !== 1 || !others[0]) return 'the other words do not share one sound'
        if (others[0] === ansSound) return `the odd word ${ans} has the same sound`
        if ((VOWEL_SOUNDS[others[0]].conflicts ?? []).includes(ansSound ?? '')) return `${ans} is also defensible as ${others[0]}`
        return null
      }
      const named = /^Which word has the (.+) sound\?$/.exec(r.prompt[0])
      const same = /same vowel sound as (\w+)\?$/.exec(r.prompt[0])
      const key = named ? KEYS.find(k => VOWEL_SOUNDS[k].label === named[1])
        : vowelSoundOf(same ? same[1] : lower(r.highlight?.[0] ?? ''))
      if (!key) return `cannot tell which sound "${r.prompt[0]}" asks for`
      if (ansSound !== key) return `${ans} does not have the ${key} sound`
      for (const d of decoyTexts(r)) {
        const s = vowelSoundOf(d)
        if (!s) return `decoy ${d} is not in the vowel data`
        if (s === key) return `decoy ${d} also has the ${key} sound`
        if ((VOWEL_SOUNDS[key].conflicts ?? []).includes(s)) return `decoy ${d} (${s}) is also defensible as ${key}`
      }
      return null
    })
  })

  it('the hard tiers cannot be passed by rhyming with the key word', () => {
    const rime = (w: string) => { const i = w.search(/[aeiouy]/); return i < 0 ? w : w.slice(i) }
    const errs: string[] = []
    for (const [grade, tier] of [[1, 3], [2, 1], [2, 2], [2, 3]] as [Grade, Tier][]) {
      const rng = new Rng(`rhyme-shortcut-${grade}-${tier}`)
      for (let i = 0; i < 200; i++) {
        const r = gen('vowels').make(grade, tier, rng)
        const same = /same vowel sound as (\w+)\?$/.exec(r.prompt[0])
        const sample = same ? same[1] : lower(r.highlight?.[0] ?? '')
        if (sample && rime(sample) === rime(answerText(r))) errs.push(`g${grade} t${tier}: ${sample} rhymes with ${answerText(r)}`)
      }
    }
    expect(errs.slice(0, 5)).toEqual([])
  })
})

describe('letters', () => {
  const alpha = 'abcdefghijklmnopqrstuvwxyz'
  it('choices are letter pictures and the answer matches the prompt', () => {
    forEachRiddle('letters', 200, r => {
      for (const c of r.choices) if (!c.visual || c.visual.kind !== 'letter') return 'choice is not a letter picture'
      const ans = r.choices[r.answer].visual as { kind: 'letter'; text: string }
      const m = /letter (\w)\?|little (\w)\?|big (\w)\?|after (\w)\?|before (\w)\?|between (\w) and (\w)\?|"([\w-]+)" start with\?/.exec(r.prompt[r.prompt.length - 1])
      if (!m) return 'unrecognised prompt'
      const expected = m[1] ?? m[2] ?? m[3] ?? (m[4] ? alpha[alpha.indexOf(m[4].toLowerCase()) + 1] : m[5] ? alpha[alpha.indexOf(m[5].toLowerCase()) - 1] : m[6] ? alpha[alpha.indexOf(m[6].toLowerCase()) + 1] : m[8][0])
      if (lower(ans.text) !== lower(expected)) return `answer ${ans.text} != ${expected}`
      return null
    })
  })

  it('never asks for a letter the child cannot tell apart in the question text', () => {
    forEachRiddle('letters', 200, r => {
      // Little l is the same stroke as big I in the prompt font, so the letter the child has to
      // find is never one of those two (naming the letter *shown* is fine: it has a picture).
      for (const line of r.prompt) {
        if (/^Which (one is|letter comes)/.test(line) && /little l\b|big I\b|letter I\?|\bl\?|\bI\?/.test(line)) return `"${line}" names a letter that cannot be told apart`
      }
      return null
    })
  })

  it('first-letter riddles print the word in the other case, so glyph matching cannot solve them', () => {
    forEachRiddle('letters', 200, r => {
      const m = /^Which letter does "([\w-]+)" start with\?$/.exec(r.prompt[0])
      if (!m) return null
      const word = m[1]
      const answer = (r.choices[r.answer].visual as { text: string }).text
      const wordUpper = word[0] === word[0].toUpperCase()
      const answerUpper = answer === answer.toUpperCase()
      if (wordUpper === answerUpper) return `"${word}" is printed in the same case as the choices`
      if (r.visual?.kind !== 'text' || r.visual.text !== word) return 'the picture does not show the word'
      // Decoys come from inside the word or from the answer's look-alikes, never at random.
      return null
    })
  })

  it('alphabet-order decoys are near misses and never the letter in the question', () => {
    forEachRiddle('letters', 200, r => {
      const m = /comes right (after|before) (\w)\?|comes between (\w) and (\w)\?/.exec(r.prompt[0])
      if (!m) return null
      const cues = (m[2] ?? '') + (m[3] ?? '') + (m[4] ?? '')
      const answer = (r.choices[r.answer].visual as { text: string }).text
      for (const c of r.choices) {
        const t = (c.visual as { text: string }).text
        if (t === answer) continue
        if (lower(cues).includes(lower(t))) return `decoy ${t} is a letter from the question`
        const gap = Math.abs(alpha.indexOf(lower(t)) - alpha.indexOf(lower(answer)))
        if (gap > 3) return `decoy ${t} is ${gap} letters from ${answer}`
      }
      return null
    })
  })
})

describe('phonics tier ramps', () => {
  const band = (id: string, grade: Grade, tier: Tier) => {
    const g = gen(id)
    const rng = new Rng(`band-${id}-${grade}-${tier}`)
    let lo = Infinity, hi = -Infinity
    for (let i = 0; i < 300; i++) { const m = g.make(grade, tier, rng).metric; lo = Math.min(lo, m); hi = Math.max(hi, m) }
    return { lo, hi }
  }
  it('tier 3 can never draw a riddle tier 1 could', () => {
    for (const id of ['letters', 'vowels', 'compounds']) for (const grade of gen(id).grades) {
      const t1 = band(id, grade, 1), t3 = band(id, grade, 3)
      expect(t3.lo, `${id} g${grade}: tier 1 reaches ${t1.hi}, tier 3 starts at ${t3.lo}`).toBeGreaterThanOrEqual(t1.hi)
    }
  })
  it("each grade's tier 1 starts where the year below's tier 1 stops", () => {
    for (const id of ['letters', 'vowels', 'compounds']) {
      const gs = gen(id).grades
      for (let i = 1; i < gs.length; i++) {
        const prev = band(id, gs[i - 1], 1), cur = band(id, gs[i], 1)
        expect(cur.lo, `${id} grade ${gs[i]} starts at ${cur.lo}, grade ${gs[i - 1]} reaches ${prev.hi}`).toBeGreaterThanOrEqual(prev.hi)
      }
    }
  })
})

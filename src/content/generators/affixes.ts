import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount } from '../types'
import { DERIVED, AFFIX_MEANING, PREFIXES, SUFFIXES, type Derived } from '../data/affixes'
import { wrap, tierWindow } from './textutil'

function levels(grade: Grade, tier: Tier): number[] {
  const table: Partial<Record<Grade, number[][]>> = {
    3: [[3], [3, 4], [4]],
    4: [[4], [4, 5], [5]],
    5: [[4, 5], [5], [5]],
  }
  return table[grade]![tier - 1]
}

const show = (w: Derived) => w.kind === 'prefix' ? `${w.affix}-` : `-${w.affix}`

/** Real words with a different affix: same base first (unable / disable), then same kind and similar length. */
function realDecoys(w: Derived, rng: { shuffle<T>(a: readonly T[]): T[] }): string[] {
  const others = DERIVED.filter(x => x.word !== w.word && x.affix !== w.affix)
  const sameBase = others.filter(x => x.base === w.base)
  const rest = rng.shuffle(others.filter(x => x.base !== w.base && x.kind === w.kind)).sort((a, b) => Math.abs(a.word.length - w.word.length) - Math.abs(b.word.length - w.word.length))
  return [...rng.shuffle(sameBase), ...rest].map(x => x.word)
}

export const affixes: Generator = {
  id: 'affixes',
  name: 'Prefixes and suffixes',
  area: 'reading',
  grades: [3, 4, 5],
  weight: { 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const lv = levels(grade, tier)
    const pool = DERIVED.filter(x => lv.includes(x.level))
    const window = lv.flatMap(l => tierWindow(pool.filter(x => x.level === l), tier))
    const w = rng.pick(window.length >= 5 ? window : pool)
    type Mode = 'meaning' | 'form' | 'which' | 'affix'
    const modes: Mode[] = grade === 3 ? (tier === 1 ? ['meaning', 'form', 'which'] : ['meaning', 'form', 'which', 'affix']) : ['meaning', 'form', 'which', 'affix', 'affix']
    const mode = rng.pick(modes)
    const easy = grade === 3 && tier === 1
    const spokenAffix = `${w.kind} ${w.affix.split('').join(' ')}`
    if (mode === 'meaning') {
      const { choices, answer } = shuffled(rng, w.meaning, rng.shuffle(w.decoys), n)
      const prompt = rng.pick([[`What does "${w.word}" mean?`], [`"${w.word}" means ___.`], [`Which meaning fits "${w.word}"?`]])
      return riddle({
        family: 'affixes', skill: `vocabulary: ${w.kind}es`, prompt, highlight: [w.word], choices, answer,
        spoken: `What does ${w.word} mean? ${choices.map(c => c.text).join(', ')}?`,
        metric: w.level * 10 + w.word.length, grade, tier,
        key: `affixes|meaning|${w.word}`,
      })
    }
    if (mode === 'affix') {
      const mine = AFFIX_MEANING[w.affix]
      const kindOf = (k: string) => (PREFIXES as readonly string[]).includes(k) ? 'prefix' : 'suffix'
      const sameKind = rng.shuffle([...new Set(Object.keys(AFFIX_MEANING).filter(k => kindOf(k) === w.kind).map(k => AFFIX_MEANING[k]))].filter(m => m !== mine))
      const otherKind = rng.shuffle([...new Set(Object.keys(AFFIX_MEANING).filter(k => kindOf(k) !== w.kind).map(k => AFFIX_MEANING[k]))].filter(m => m !== mine))
      const decoys = [...sameKind, ...otherKind]
      const { choices, answer } = shuffled(rng, mine, decoys, n)
      const prompt = [`In "${w.word}", what does`, `the ${w.kind} ${show(w)} mean?`]
      return riddle({
        family: 'affixes', skill: `vocabulary: ${w.kind} meanings`, prompt, highlight: [w.word], choices, answer,
        spoken: `In the word ${w.word}, what does the ${spokenAffix} mean? ${choices.map(c => c.text).join(', ')}?`,
        metric: w.level * 10 + w.word.length + 4, grade, tier,
        // One per affix, not per word: "what does -ly mean" is the same question every time.
        key: `affixes|affix|${w.affix}`,
      })
    }
    // 'form' and 'which': the answer is the derived word itself.
    // In 'form' the base word is printed in the prompt, so every choice has to be built on that
    // base - otherwise the answer is the only word containing it and no affix knowledge is needed.
    const built = (w.kind === 'prefix' ? PREFIXES : SUFFIXES).filter(a => a !== w.affix)
      .map(a => w.kind === 'prefix' ? a + w.base : w.base + a)
    const sameBase = DERIVED.filter(x => x.base === w.base && x.word !== w.word).map(x => x.word)
    const decoys = mode === 'form'
      ? [...rng.shuffle(w.fake ?? []), ...rng.shuffle(sameBase), ...rng.shuffle(built)]
      : easy && w.fake ? rng.shuffle(w.fake) : realDecoys(w, rng)
    const { choices, answer } = shuffled(rng, w.word, decoys, n)
    if (mode === 'form') {
      const prompt = wrap(`Add a ${w.kind} to "${w.base}" to make a word that means "${w.meaning}".`)
      return riddle({
        family: 'affixes', skill: `vocabulary: ${w.kind}es`, prompt, highlight: [w.base], choices, answer,
        spoken: `Add a ${w.kind} to ${w.base} to make a word that means ${w.meaning}. ${choices.map(c => c.text).join(', ')}?`,
        metric: w.level * 10 + w.word.length + 2, grade, tier,
        // form and which both have the derived word as their answer: asking for it from the base
        // and then from the meaning inside one climb is asking the same thing twice.
        key: `affixes|word|${w.word}`,
      })
    }
    const prompt = rng.pick([[`Which word means "${w.meaning}"?`], ['Which word means', `"${w.meaning}"?`]])
    return riddle({
      family: 'affixes', skill: `vocabulary: ${w.kind}es`, prompt, choices, answer,
      spoken: `Which word means ${w.meaning}? ${choices.map(c => c.text).join(', ')}?`,
      metric: w.level * 10 + w.word.length + 1, grade, tier,
      key: `affixes|word|${w.word}`,
    })
  },
}

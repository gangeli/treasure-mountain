import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, an } from '../types'
import { POS_LISTS, PURE_CONJUNCTIONS, TAGGED } from '../data/partsofspeech'
import { wrap, tierWindow } from './textutil'

type Askable = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'conjunction'
const RANK: Record<Askable, number> = { noun: 1, verb: 2, adjective: 3, adverb: 4, pronoun: 5, conjunction: 6 }
const ALL: Askable[] = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'conjunction']
/** The definition line shown above the question; each fits the scroll's 46-character line. */
const DEF: Record<Askable, string> = {
  noun: 'A noun is a person, place or thing.',
  verb: 'A verb is an action word.',
  adjective: 'An adjective describes a noun.',
  adverb: 'An adverb tells how, when or where.',
  pronoun: 'A pronoun stands for a noun.',
  conjunction: 'A conjunction is a joining word.',
}

function askable(grade: Grade, tier: Tier): Askable[] {
  const table: Partial<Record<Grade, Askable[][]>> = {
    3: [['noun', 'verb'], ['noun', 'verb', 'adjective'], ['verb', 'adjective', 'adjective']],
    4: [['adjective', 'adverb'], ['adjective', 'adverb', 'adverb'], ['adverb', 'adverb', 'pronoun']],
    5: [['adverb', 'pronoun'], ['pronoun', 'conjunction'], ['pronoun', 'conjunction', 'conjunction']],
  }
  return table[grade]![tier - 1]
}

/**
 * Words that are safely NOT `pos`, drawn from the other lists. Grade 3 has not met pronouns or
 * conjunctions in this family yet, and cannot be expected to read "whereas": it draws its decoys
 * from the four word classes it is being taught, plus the two plainest joining words.
 */
function safeDecoys(pos: Askable, grade: Grade, rng: { shuffle<T>(a: readonly T[]): T[] }, len: number): string[] {
  const from: Askable[] = grade === 3 ? ['noun', 'verb', 'adjective', 'adverb'] : ALL
  const out: string[] = []
  for (const p of from) {
    if (p === pos) continue
    const list = p === 'conjunction' ? PURE_CONJUNCTIONS : POS_LISTS[p]
    out.push(...rng.shuffle(list).slice(0, 2))
  }
  if (grade === 3 && pos !== 'conjunction') out.push(...rng.shuffle(['and', 'but', 'or', 'because']).slice(0, 1))
  return rng.shuffle(out).sort((a, b) => Math.abs(a.length - len) - Math.abs(b.length - len))
}

export const partsofspeech: Generator = {
  id: 'partsofspeech',
  name: 'Parts of speech',
  area: 'reading',
  grades: [3, 4, 5],
  weight: { 3: 0.8, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const pos = rng.pick(askable(grade, tier))
    type Mode = 'list' | 'sentence' | 'identify'
    // The bare word-list question is the easiest form, so it stays in the lower tiers; tier 3 asks
    // inside a sentence or out of context.
    const modes: Mode[] = grade === 3
      ? (tier === 1 ? ['list', 'list', 'sentence'] : tier === 2 ? ['list', 'sentence', 'sentence'] : ['sentence', 'sentence', 'list'])
      : tier === 1 ? ['list', 'sentence', 'sentence', 'identify'] : ['sentence', 'sentence', 'identify', 'sentence']
    let mode = rng.pick(modes)
    // Sentences where `pos` occurs exactly once among the tagged words and there are enough decoys.
    const all = TAGGED.filter(t => Object.values(t.tags).filter(p => p === pos).length === 1 && Object.keys(t.tags).length >= n)
    const window = tierWindow(all, tier)
    const usable = window.length >= 3 ? window : all
    if (mode === 'sentence' && !usable.length) mode = 'list'
    if (mode === 'sentence') {
      const t = rng.pick(usable)
      const answer = Object.keys(t.tags).find(w => t.tags[w] === pos)!
      // Content words first: an article is capitalised and sentence-initial, so it is eliminated on
      // sight and quietly turns a four-choice question into three.
      const other = Object.keys(t.tags).filter(w => t.tags[w] !== pos)
      const decoys = [...rng.shuffle(other.filter(w => t.tags[w] !== 'article')), ...rng.shuffle(other.filter(w => t.tags[w] === 'article'))]
      const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
      const body = wrap(`"${t.text}"`)
      const prompt = [...body, `Which word is ${an(pos)}?`]
      return riddle({
        family: 'partsofspeech', skill: `grammar: ${pos}s`, prompt, choices, answer: idx,
        spoken: `In the sentence ${t.text} which word is ${an(pos)}? ${choices.map(c => c.text).join(', ')}?`,
        metric: RANK[pos] * 10 + answer.length + 3, grade, tier,
        key: `partsofspeech|sentence|${t.text}|${pos}`,
      })
    }
    // Out of context a word has to have one answer: "after" and "once" are prepositions and adverbs
    // as often as conjunctions, so only the pure joining words are ever asked on their own.
    const word = rng.pick(mode === 'identify' && pos === 'conjunction' ? PURE_CONJUNCTIONS : POS_LISTS[pos])
    if (mode === 'identify') {
      const decoys = rng.shuffle(ALL.filter(p => p !== pos && (grade >= 5 || p !== 'conjunction')))
      const { choices, answer } = shuffled(rng, pos, decoys, n)
      // One wording: the "___" form repeated the question that followed it and read as a missing word.
      const prompt = [`What part of speech is "${word}"?`]
      return riddle({
        family: 'partsofspeech', skill: `grammar: ${pos}s`, prompt, highlight: [word], choices, answer,
        spoken: `What part of speech is the word ${word}? ${choices.map(c => c.text).join(', ')}?`,
        metric: RANK[pos] * 10 + word.length + 5, grade, tier,
        key: `partsofspeech|identify|${word}`,
      })
    }
    const decoys = safeDecoys(pos, grade, rng, word.length)
    const { choices, answer } = shuffled(rng, word, decoys, n)
    // Tier 1 always shows the definition; higher tiers ask without it.
    const withDef = tier === 1 || rng.bool(0.5)
    const prompt = withDef ? [DEF[pos], `Which word is ${an(pos)}?`] : [`Which word is ${an(pos)}?`]
    return riddle({
      family: 'partsofspeech', skill: `grammar: ${pos}s`, prompt, choices, answer,
      spoken: `Which word is ${an(pos)}? ${choices.map(c => c.text).join(', ')}?`,
      metric: RANK[pos] * 10 + word.length, grade, tier,
      // One riddle per word: "which word is a noun" with the same answer and different decoys is
      // the same question twice.
      key: `partsofspeech|list|${pos}|${word}`,
    })
  },
}

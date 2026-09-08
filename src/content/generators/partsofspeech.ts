import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, an } from '../types'
import { POS_LISTS, PURE_CONJUNCTIONS, TAGGED } from '../data/partsofspeech'
import { wrap } from './textutil'

type Askable = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'conjunction'
const RANK: Record<Askable, number> = { noun: 1, verb: 2, adjective: 3, adverb: 4, pronoun: 5, conjunction: 6 }
const ALL: Askable[] = ['noun', 'verb', 'adjective', 'adverb', 'pronoun', 'conjunction']
const DESC: Record<Askable, string> = {
  noun: 'a person, place or thing', verb: 'an action word', adjective: 'a word that describes a noun', adverb: 'a word that tells how or when',
  pronoun: 'a word that stands for a noun', conjunction: 'a joining word',
}

function askable(grade: Grade, tier: Tier): Askable[] {
  const table: Partial<Record<Grade, Askable[][]>> = {
    3: [['noun', 'verb'], ['noun', 'verb', 'adjective'], ['verb', 'adjective', 'adjective']],
    4: [['adjective', 'adverb'], ['adjective', 'adverb', 'adverb'], ['adverb', 'adverb', 'pronoun']],
    5: [['adverb', 'pronoun'], ['pronoun', 'conjunction'], ['pronoun', 'conjunction', 'conjunction']],
  }
  return table[grade]![tier - 1]
}

/** Words that are safely NOT `pos`: drawn from the other lists (conjunctions only the pure ones). */
function safeDecoys(pos: Askable, rng: { shuffle<T>(a: readonly T[]): T[] }, len: number): string[] {
  const out: string[] = []
  for (const p of ALL) {
    if (p === pos) continue
    const list = p === 'conjunction' ? PURE_CONJUNCTIONS : POS_LISTS[p]
    out.push(...rng.shuffle(list).slice(0, 2))
  }
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
    const modes: Mode[] = grade === 3 ? (tier === 1 ? ['list', 'list', 'sentence'] : ['list', 'sentence', 'sentence']) : ['list', 'sentence', 'sentence', 'identify']
    let mode = rng.pick(modes)
    // Sentences where `pos` occurs exactly once among the tagged words and there are enough decoys.
    const usable = TAGGED.filter(t => Object.values(t.tags).filter(p => p === pos).length === 1 && Object.keys(t.tags).length >= n)
    if (mode === 'sentence' && !usable.length) mode = 'list'
    if (mode === 'sentence') {
      const t = rng.pick(usable)
      const answer = Object.keys(t.tags).find(w => t.tags[w] === pos)!
      const decoys = rng.shuffle(Object.keys(t.tags).filter(w => t.tags[w] !== pos))
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
    const word = rng.pick(POS_LISTS[pos])
    if (mode === 'identify') {
      const decoys = rng.shuffle(ALL.filter(p => p !== pos && (grade >= 5 || p !== 'conjunction')))
      const { choices, answer } = shuffled(rng, pos, decoys, n)
      const prompt = rng.pick([[`What part of speech is "${word}"?`], [`"${word}" is ${an('___')}.`, 'Which part of speech is it?']])
      return riddle({
        family: 'partsofspeech', skill: `grammar: ${pos}s`, prompt, highlight: [word], choices, answer,
        spoken: `What part of speech is the word ${word}? ${choices.map(c => c.text).join(', ')}?`,
        metric: RANK[pos] * 10 + word.length + 5, grade, tier,
      })
    }
    const decoys = safeDecoys(pos, rng, word.length)
    const { choices, answer } = shuffled(rng, word, decoys, n)
    const prompt = rng.pick([[`Which word is ${an(pos)}?`], [`${an(pos).replace(/^a/, 'A')} is ${DESC[pos]}.`, `Which word is ${an(pos)}?`]])
    return riddle({
      family: 'partsofspeech', skill: `grammar: ${pos}s`, prompt, choices, answer,
      spoken: `Which word is ${an(pos)}? ${choices.map(c => c.text).join(', ')}?`,
      metric: RANK[pos] * 10 + word.length, grade, tier,
    })
  },
}

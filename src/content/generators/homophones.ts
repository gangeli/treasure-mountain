import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount } from '../types'
import { HOMOPHONES, type HomophoneSet } from '../data/homophones'
import { wrap, spokenBlank } from './textutil'

function levels(grade: Grade, tier: Tier): number[] {
  const table: Partial<Record<Grade, number[][]>> = {
    2: [[2], [2], [2, 3]],
    3: [[3], [3], [3, 4]],
    4: [[4], [4], [4, 5]],
    5: [[4, 5], [5], [5]],
  }
  return table[grade]![tier - 1]
}

/** Every word that is a homophone of `word` anywhere in the data (a word may sit in two sets, e.g. two/too). */
function soundAlikes(word: string): Set<string> {
  const out = new Set<string>([word])
  for (const s of HOMOPHONES) if (s.words.some(w => w.word === word)) for (const w of s.words) out.add(w.word)
  return out
}

/** Unrelated words of about the same length from other sets, nearest level first. */
function fillers(set: HomophoneSet, answer: string, rng: { shuffle<T>(a: readonly T[]): T[] }): string[] {
  const banned = soundAlikes(answer)
  for (const w of set.words) for (const x of soundAlikes(w.word)) banned.add(x)
  const pool = HOMOPHONES.filter(s => s !== set).flatMap(s => s.words.map(w => ({ word: w.word, level: s.level }))).filter(w => !banned.has(w.word))
  const score = (w: { word: string; level: number }) => Math.abs(w.word.length - answer.length) * 3 + Math.abs(w.level - set.level)
  const shuffledPool = rng.shuffle(pool)
  return shuffledPool.sort((a, b) => score(a) - score(b)).map(w => w.word)
}

export const homophones: Generator = {
  id: 'homophones',
  name: 'Homophones',
  area: 'reading',
  grades: [2, 3, 4, 5],
  weight: { 2: 1, 3: 1, 4: 1, 5: 0.9 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const lv = levels(grade, tier)
    const set = rng.pick(HOMOPHONES.filter(s => lv.includes(s.level)))
    const target = rng.pick(set.words)
    const others = set.words.filter(w => w !== target).map(w => w.word)
    const soundMode = rng.bool(grade === 2 ? 0.3 : 0.15)
    if (soundMode) {
      // "Which word sounds the same as X?" - the answer is another member of the set; decoys are unrelated.
      const answer = rng.pick(others)
      const decoys = fillers(set, answer, rng)
      const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
      const prompt = rng.pick([
        [`Which word sounds just like "${target.word}"`, 'but is spelled differently?'],
        [`"${target.word}" has a sound-alike word.`, 'Which word is it?'],
      ])
      return riddle({
        family: 'homophones', skill: 'vocabulary: homophones', prompt, highlight: [target.word], choices, answer: idx,
        spoken: `Which word sounds just like ${target.word} but is spelled differently? ${choices.map(c => c.text).join(', ')}?`,
        metric: set.level * 10 + answer.length - 2, grade, tier,
      })
    }
    const decoys = [...rng.shuffle(others), ...fillers(set, target.word, rng)]
    const { choices, answer } = shuffled(rng, target.word, decoys, n)
    const body = wrap(target.sentence)
    const prompt = rng.pick([
      [...body, 'Which word fills the blank?'],
      ['Fill in the blank:', ...body],
      [...body, 'Which spelling is right here?'],
    ])
    return riddle({
      family: 'homophones', skill: 'vocabulary: homophones', prompt, choices, answer,
      spoken: `${spokenBlank(target.sentence)} Which word fills the blank? ${choices.map(c => c.text).join(', ')}?`,
      metric: set.level * 10 + target.word.length, grade, tier,
      key: `homophones|${target.word}|${target.sentence}`,
    })
  },
}

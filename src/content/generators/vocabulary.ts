import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount } from '../types'
import { VOCAB, type VocabWord } from '../data/vocabulary'

function levels(grade: Grade, tier: Tier): number[] {
  const table: Partial<Record<Grade, number[][]>> = {
    3: [[3], [3, 4], [4]],
    4: [[4], [4, 5], [5]],
    5: [[4, 5], [5], [5]],
  }
  return table[grade]![tier - 1]
}

/** Words that could also fit the definition: same synonym group. */
const sameGroup = (a: VocabWord, b: VocabWord) => a.group !== undefined && a.group === b.group

export const vocabulary: Generator = {
  id: 'vocabulary',
  name: 'Vocabulary',
  area: 'reading',
  grades: [3, 4, 5],
  weight: { 3: 1, 4: 1.2, 5: 1.3 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const lv = levels(grade, tier)
    const pool = VOCAB.filter(w => lv.includes(w.level))
    // Tier 3 leans to longer words within the level band.
    const pair = rng.sample(pool, 2)
    const w = tier === 3 ? (pair[0].word.length >= pair[1].word.length ? pair[0] : pair[1]) : pair[0]
    const reverse = rng.bool(0.45)
    if (reverse) {
      const others = rng.shuffle(pool.filter(x => x !== w && !sameGroup(x, w) && x.word !== w.word))
        .sort((a, b) => Math.abs(a.word.length - w.word.length) - Math.abs(b.word.length - w.word.length))
      const { choices, answer } = shuffled(rng, w.word, others.map(x => x.word), n)
      const prompt = rng.pick([[`Which word means "${w.def}"?`], ['Which word means', `"${w.def}"?`]])
      return riddle({
        family: 'vocabulary', skill: 'vocabulary: word meanings', prompt, choices, answer,
        spoken: `Which word means ${w.def}? ${choices.map(c => c.text).join(', ')}?`,
        metric: w.level * 10 + w.word.length + 2, grade, tier,
      })
    }
    const { choices, answer } = shuffled(rng, w.def, rng.shuffle(w.decoys), n)
    const prompt = rng.pick([[`What does "${w.word}" mean?`], [`"${w.word}" means ___.`], [`Which meaning fits "${w.word}"?`]])
    return riddle({
      family: 'vocabulary', skill: 'vocabulary: word meanings', prompt, highlight: [w.word], choices, answer,
      spoken: `What does ${w.word} mean? ${choices.map(c => c.text).join(', ')}?`,
      metric: w.level * 10 + w.word.length, grade, tier,
    })
  },
}

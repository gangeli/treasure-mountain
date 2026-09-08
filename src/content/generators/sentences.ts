import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, sayChoices} from '../types'
import { SENTENCES, type Sentence } from '../data/sentences'
import { wrap, spokenBlank, tierWindow, rankIn } from './textutil'

function levels(grade: Grade, tier: Tier): number[] {
  const table: Record<Grade, number[][]> = {
    0: [[0], [0], [0, 1]],
    1: [[1], [1], [1, 2]],
    2: [[2], [2], [2, 3]],
    3: [[3], [3], [3, 4]],
    4: [[4], [4], [4, 5]],
    5: [[4, 5], [5], [5]],
  }
  return table[grade][tier - 1]
}

export const sentences: Generator = {
  id: 'sentences',
  name: 'Sentence completion',
  area: 'reading',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 1.5, 2: 1.2, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const lv = levels(grade, tier)
    const pool = SENTENCES.filter(s => lv.includes(s.level))
    // Each tier draws its own window of the level, so two tiers on one level are not the same
    // sentences; inside the window tier 1 leans to shorter answer words and tier 3 to longer ones.
    const window = lv.flatMap(l => tierWindow(pool.filter(x => x.level === l), tier))
    const from = window.length >= 6 ? window : pool
    const pair = rng.sample(from, 2)
    const s: Sentence = tier === 1 ? (pair[0].answer.length <= pair[1].answer.length ? pair[0] : pair[1]) : tier === 3 ? (pair[0].answer.length >= pair[1].answer.length ? pair[0] : pair[1]) : pair[0]
    const { choices, answer } = shuffled(rng, s.answer, rng.shuffle(s.decoys), n)
    const body = wrap(s.text)
    const prompt = grade === 0
      ? rng.pick([[...body, 'Which word goes in the blank?'], [...body, 'Pick the word that fits.']])
      : rng.pick([[...body, 'Which word fills the blank?'], ['Fill in the blank:', ...body], [...body, 'Which word makes sense here?']])
    const skill = grade <= 1 ? 'reading: sight words in sentences' : grade <= 3 ? 'reading: context clues' : 'vocabulary: words in context'
    return riddle({
      family: 'sentences', skill, prompt, choices, answer,
      spoken: `${spokenBlank(s.text)} Which word fills the blank? ${sayChoices(choices)}?`,
      metric: s.level * 10 + s.answer.length + rankIn(pool.filter(x => x.level === s.level), s) * 4, grade, tier,
      key: `sentences|${s.text}`,
    })
  },
}

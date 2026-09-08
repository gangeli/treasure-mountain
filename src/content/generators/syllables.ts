import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, nearbyNumbers } from '../types'
import { SYLLABLE_WORDS } from '../data/syllables'

type Mode = 'which' | 'count'
interface Plan { modes: Mode[]; min: number; max: number }

/** Grade 1: 1 vs 2 syllables; grade 2: count to 3; grade 3: count to 4. */
function planFor(grade: Grade, tier: Tier): Plan {
  const table: Partial<Record<Grade, Plan[]>> = {
    1: [{ modes: ['which'], min: 1, max: 2 }, { modes: ['which', 'count'], min: 1, max: 2 }, { modes: ['count', 'which'], min: 1, max: 3 }],
    2: [{ modes: ['which', 'count'], min: 1, max: 3 }, { modes: ['count'], min: 1, max: 3 }, { modes: ['count', 'which'], min: 2, max: 3 }],
    3: [{ modes: ['count', 'which'], min: 1, max: 3 }, { modes: ['count'], min: 1, max: 4 }, { modes: ['count', 'which'], min: 2, max: 4 }],
  }
  return (table[grade] ?? table[3]!)[tier - 1]
}

const plural = (k: number): string => k === 1 ? '1 syllable' : `${k} syllables`

/** Which word has N syllables / how many syllables in a word. */
export const syllables: Generator = {
  id: 'syllables',
  name: 'Syllables',
  area: 'reading',
  grades: [1, 2, 3],
  weight: { 1: 1, 2: 1.2, 3: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const { modes, min, max } = planFor(grade, tier)
    const mode = rng.pick(modes)
    const counts = [1, 2, 3, 4].filter(k => k >= min && k <= max)
    const k = rng.pick(counts)
    const word = rng.pick(SYLLABLE_WORDS[k])

    if (mode === 'count') {
      const decoys = nearbyNumbers(rng, k, n - 1, 2, 1, Math.max(max, 4)).map(String)
      const { choices, answer } = shuffled(rng, String(k), decoys, n)
      const verse = grade <= 2 && rng.bool(0.4)
      const prompt = verse
        ? ['Clap it out, one beat at a time!', `How many syllables in "${word}"?`]
        : [`How many syllables are in "${word}"?`]
      return riddle({
        family: 'syllables', skill: 'phonics: counting syllables', prompt, verse, highlight: [word], choices, answer,
        spoken: `How many syllables are in the word ${word}? ${choices.map(c => c.text).join(', ')}?`,
        metric: max * 10 + 5 + word.length, grade, tier,
      })
    }

    // which: "Which word has 2 syllables?" — decoys have other counts in the same range (or one outside it).
    const otherCounts = [1, 2, 3, 4].filter(c => c !== k && Math.abs(c - k) <= 2 && (counts.includes(c) || Math.abs(c - k) === 1))
    const decoys = rng.shuffle(otherCounts.flatMap(c => rng.sample(SYLLABLE_WORDS[c], Math.min(3, SYLLABLE_WORDS[c].length))))
    const { choices, answer } = shuffled(rng, word, decoys, n)
    const prompt = [`Which word has ${plural(k)}?`]
    return riddle({
      family: 'syllables', skill: 'phonics: counting syllables', prompt, choices, answer,
      spoken: `Which word has ${plural(k)}? ${choices.map(c => c.text).join(', ')}?`,
      metric: max * 10 + word.length, grade, tier,
    })
  },
}

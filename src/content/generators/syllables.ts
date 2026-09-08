import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, nearbyNumbers, sayChoices} from '../types'
import { SYLLABLE_WORDS } from '../data/syllables'

type Mode = 'which' | 'count'
interface Plan { modes: Mode[]; counts: number[] }

/**
 * Grade 1 works on 1 vs 2 syllables, grade 2 counts to 3, grade 3 to 4 - and each tier leans on the
 * top of its own range, so tier 3 is never a rerun of tier 1. `counts` lists the syllable counts a
 * tier may ask for, repeated where that count should come up more often.
 */
function planFor(grade: Grade, tier: Tier): Plan {
  const table: Partial<Record<Grade, Plan[]>> = {
    1: [{ modes: ['which'], counts: [1, 1, 2] }, { modes: ['which', 'count'], counts: [1, 2, 2] }, { modes: ['count', 'which'], counts: [2, 3, 3] }],
    2: [{ modes: ['which', 'count'], counts: [1, 2, 2] }, { modes: ['count', 'which'], counts: [2, 3, 3] }, { modes: ['count', 'which'], counts: [3, 3, 4] }],
    3: [{ modes: ['count', 'which'], counts: [2, 3, 3] }, { modes: ['count', 'which'], counts: [3, 4, 4] }, { modes: ['count', 'which'], counts: [4, 4, 3] }],
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
    const { modes, counts } = planFor(grade, tier)
    const mode = rng.pick(modes)
    const max = Math.max(...counts)
    const k = rng.pick(counts)
    const word = rng.pick(SYLLABLE_WORDS[k])
    // One riddle per word per mode: "how many syllables in napkin" and "clap it out ... napkin" are
    // the same question, and a child should not meet both inside one climb.
    const key = `syllables|${mode}|${word}`

    if (mode === 'count') {
      // Never offer a count this tier has not met: at 1-vs-2 a "4" is a free elimination.
      const decoys = nearbyNumbers(rng, k, n - 1, 2, 1, Math.min(4, max + 1)).map(String)
      const { choices, answer } = shuffled(rng, String(k), decoys, n)
      const clap = grade <= 2 && rng.bool(0.4)
      const prompt = clap
        ? ['Clap it out, one beat at a time!', `How many syllables in "${word}"?`]
        : [`How many syllables are in "${word}"?`]
      return riddle({
        family: 'syllables', skill: 'phonics: counting syllables', prompt, highlight: [word], choices, answer, key,
        spoken: `How many syllables are in the word ${word}? ${sayChoices(choices)}?`,
        metric: k * 10 + word.length, grade, tier,
      })
    }

    // which: "Which word has 2 syllables?" - decoys are one syllable away, and as close to the
    // answer's length as the lists allow, so a child cannot win by picking the shortest word.
    // One syllable away first, two only as filler, and nothing longer than the grade works with:
    // a 1st grader should not be ruling out "avocado".
    const cap = grade === 1 ? 3 : 4
    const ok = (c: number) => c >= 1 && c <= cap
    const near = (a: string) => Math.abs(a.length - word.length)
    const take = (c: number, howMany: number) => ok(c)
      ? rng.shuffle([...SYLLABLE_WORDS[c]]).sort((a, b) => near(a) - near(b)).slice(0, howMany)
      : []
    const close = rng.shuffle([...take(k - 1, 3), ...take(k + 1, 3)])
    const far = rng.shuffle([...take(k + 2, 2), ...take(k - 2, 2)])
    const { choices, answer } = shuffled(rng, word, [...close, ...far], n)
    const prompt = [`Which word has ${plural(k)}?`]
    return riddle({
      family: 'syllables', skill: 'phonics: counting syllables', prompt, choices, answer, key,
      spoken: `Which word has ${plural(k)}? ${sayChoices(choices)}?`,
      metric: k * 10 + word.length + 4, grade, tier,
    })
  },
}

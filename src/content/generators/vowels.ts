import type { Rng } from '../../engine/rng'
import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap, sayChoices} from '../types'
import { VOWEL_SOUNDS } from '../data/phonics'

type Mode = 'same' | 'name' | 'odd'
type Band = 1 | 2 | 3

const KEYS = Object.keys(VOWEL_SOUNDS)
const bandOf = (key: string): Band => VOWEL_SOUNDS[key].band
const keysIn = (bands: Band[]): string[] => KEYS.filter(k => bands.includes(bandOf(k)))
/** Key words are read out in a 46-character line, so they must stay short. */
const samplesOf = (key: string): string[] => VOWEL_SOUNDS[key].words.filter(w => w.length <= 6)
/** Everything from the first vowel on: hug/rug share a rime, hop/rock do not. */
const rimeOf = (w: string): string => { const i = w.search(/[aeiouy]/); return i < 0 ? w : w.slice(i) }

interface Plan {
  /** Sound families this cell may ask about. */
  bands: Band[]
  /** Sound families decoys may come from. */
  decoyBands: Band[]
  modes: Mode[]
  /** Lead with a decoy that has the same vowel letter but the other sound (cake for "short a"). */
  contrast: boolean
  /** The answer may not rhyme with the key word, so rhyming cannot short-cut the vowel work. */
  noRhyme: boolean
}

/**
 * One pool per grade and tier, chosen so a tier can never draw a riddle an easier tier could.
 * Grade 1: short CVC vowels -> long vowels -> long vowels against their short partner.
 * Grade 2: short vowels named out loud -> long vowels -> the tricky /yoo/ (cube) and /oo/ (moon)
 * pools, which are the two that most often collide, asked by name or as odd-one-out.
 */
function plan(grade: Grade, tier: Tier): Plan {
  if (grade === 1) {
    if (tier === 1) return { bands: [1], decoyBands: [1], modes: ['same'], contrast: false, noRhyme: false }
    if (tier === 2) return { bands: [2], decoyBands: [1, 2], modes: ['same'], contrast: false, noRhyme: false }
    return { bands: [2], decoyBands: [1, 2], modes: ['same', 'name'], contrast: true, noRhyme: true }
  }
  if (tier === 1) return { bands: [1], decoyBands: [1, 2], modes: ['same', 'name'], contrast: true, noRhyme: true }
  if (tier === 2) return { bands: [2], decoyBands: [1, 2, 3], modes: ['same', 'name'], contrast: true, noRhyme: true }
  return { bands: [3], decoyBands: [1, 2, 3], modes: ['name', 'odd'], contrast: true, noRhyme: true }
}

const MODE_BONUS: Record<Mode, number> = { same: 0, name: 4, odd: 8 }

/**
 * Decoy words, none of which can also be a right answer: they come from other sound families, and
 * never from a family whose sound would be defensible for this question (long u vs oo).
 */
function decoysFor(key: string, p: Plan, rng: Rng): string[] {
  const sound = VOWEL_SOUNDS[key]
  const banned = new Set([key, ...(sound.conflicts ?? [])])
  const keys = keysIn(p.decoyBands).filter(k => !banned.has(k))
  const contrast = p.contrast && sound.contrast && keys.includes(sound.contrast) ? [rng.pick(VOWEL_SOUNDS[sound.contrast].words)] : []
  return [...contrast, ...rng.shuffle(keys.flatMap(k => VOWEL_SOUNDS[k].words))]
}

/** "Which word has the same vowel sound as cake?" and friends (grades 1-2). */
export const vowels: Generator = {
  id: 'vowels',
  name: 'Vowel sounds',
  area: 'reading',
  grades: [1, 2],
  weight: { 1: 1.5, 2: 1.2 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const p = plan(grade, tier)
    const key = rng.pick(keysIn(p.bands))
    const sound = VOWEL_SOUNDS[key]
    const mode = rng.pick(p.modes)
    const family = sound.words
    const decoys = decoysFor(key, p, rng)
    const base = sound.band * 4 + (p.contrast ? 3 : 0)

    if (mode === 'odd') {
      const same = rng.sample(family, n - 1)
      const outsider = decoys[0]
      const { choices, answer } = shuffled(rng, outsider, rng.shuffle(same), n)
      const prompt = ['Which word has a different vowel sound', 'from the others?']
      return riddle({
        family: 'vowels', skill: 'phonics: vowel sounds', prompt, choices, answer,
        spoken: `Which word has a different vowel sound from the others? ${sayChoices(choices)}?`,
        metric: base + MODE_BONUS.odd + outsider.length, grade, tier, key: `vowels|${outsider}`,
      })
    }

    if (mode === 'name') {
      // Never the word the label uses as its example: "Which word has the long u (as in cube)
      // sound?" wanting "cube" is answered by reading the question.
      const example = /\(as in (\w+)\)/.exec(sound.label)?.[1]
      const namable = family.filter(w => w !== example)
      const answerW = rng.pick(namable.length ? namable : family)
      const { choices, answer } = shuffled(rng, answerW, decoys, n)
      const prompt = [`Which word has the ${sound.label} sound?`]
      return riddle({
        family: 'vowels', skill: 'phonics: vowel sounds', prompt, choices, answer,
        spoken: `Which word has the ${sound.spoken}? ${sayChoices(choices)}?`,
        metric: base + MODE_BONUS.name + answerW.length, grade, tier, key: `vowels|${answerW}`,
      })
    }

    // same: "Which word has the same vowel sound as cake?"
    const sample = rng.pick(samplesOf(key))
    const rime = rimeOf(sample)
    const fits = family.filter(w => w !== sample && (!p.noRhyme || rimeOf(w) !== rime))
    const answerW = rng.pick(fits)
    const { choices, answer } = shuffled(rng, answerW, decoys, n)
    const verse = grade === 1 && rng.bool(0.5)
    const shown = verse ? cap(sample) : sample
    const prompt = verse
      ? [`${shown} is my word. Listen well!`, 'Which word has the same vowel sound?', 'Say it slowly, then you can tell.']
      : [`Which word has the same vowel sound as ${sample}?`]
    return riddle({
      family: 'vowels', skill: 'phonics: vowel sounds', prompt, verse, highlight: [shown], choices, answer,
      spoken: `Which word has the same vowel sound as ${sample}? ${sayChoices(choices)}?`,
      metric: base + MODE_BONUS.same + answerW.length, grade, tier, key: `vowels|${answerW}`,
    })
  },
}

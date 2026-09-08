import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { VOWEL_SOUNDS } from '../data/phonics'

/** "read" can be red or reed, so it is left out of the pool. */
const AMBIGUOUS = new Set(['read'])
const SOUNDS = Object.keys(VOWEL_SOUNDS)
const wordsOf = (key: string): string[] => VOWEL_SOUNDS[key].words.filter(w => !AMBIGUOUS.has(w))
const isLong = (key: string): boolean => key.startsWith('long')
/** long a <-> short a etc. */
const contrastOf = (key: string): string => (isLong(key) ? 'short' : 'long') + key.slice(key.indexOf(' '))
const vowelLetter = (key: string): string => key.slice(-1)

type Mode = 'same' | 'name' | 'odd'

/** Which vowel families and decoy strategy a grade/tier uses. */
function plan(grade: Grade, tier: Tier): { keys: string[]; contrast: boolean; modes: Mode[] } {
  if (grade === 1) {
    if (tier === 1) return { keys: SOUNDS.filter(k => !isLong(k)), contrast: false, modes: ['same'] }
    if (tier === 2) return { keys: SOUNDS, contrast: false, modes: ['same'] }
    return { keys: SOUNDS, contrast: true, modes: ['same'] }
  }
  if (tier === 1) return { keys: SOUNDS, contrast: false, modes: ['same', 'same', 'name'] }
  if (tier === 2) return { keys: SOUNDS, contrast: true, modes: ['same', 'name'] }
  return { keys: SOUNDS, contrast: true, modes: ['name', 'odd', 'same'] }
}

const MODE_BONUS: Record<Mode, number> = { same: 0, name: 4, odd: 6 }

/** Same vowel sound as a sample word (grade 1: short vs long; grade 2: all ten sounds, naming them, odd one out). */
export const vowels: Generator = {
  id: 'vowels',
  name: 'Vowel sounds',
  area: 'reading',
  grades: [1, 2],
  weight: { 1: 1.5, 2: 1.2 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const { keys, contrast, modes } = plan(grade, tier)
    const key = rng.pick(keys)
    const mode = rng.pick(modes)
    const family = wordsOf(key)
    // Decoys: words from other sound families. With `contrast`, the same letter's other sound comes first
    // (cat vs cake), and for grade 1 tier 1 only short sounds are compared with short sounds.
    const otherKeys = keys.filter(k => k !== key)
    const contrastKey = contrastOf(key)
    const decoyPool = (): string[] => {
      const first = contrast && otherKeys.includes(contrastKey) ? rng.shuffle(wordsOf(contrastKey)).slice(0, 1) : []
      const rest = rng.shuffle(otherKeys.filter(k => k !== contrastKey || !contrast).flatMap(k => wordsOf(k)))
      return [...first, ...rest]
    }
    const soundName = key // e.g. "long a"
    const spokenName = `${soundName.split(' ')[0]} ${vowelLetter(key)}`

    if (mode === 'odd') {
      const same = rng.sample(family, n - 1)
      const outsider = decoyPool()[0]
      const { choices, answer } = shuffled(rng, outsider, rng.shuffle(same), n)
      const prompt = ['Which word has a different vowel sound', 'from the others?']
      return riddle({
        family: 'vowels', skill: 'phonics: vowel sounds', prompt, choices, answer,
        spoken: `Which word has a different vowel sound from the others? ${choices.map(c => c.text).join(', ')}?`,
        metric: (isLong(key) ? 10 : 0) + MODE_BONUS.odd + outsider.length, grade, tier,
      })
    }

    if (mode === 'name') {
      const answerW = rng.pick(family)
      const { choices, answer } = shuffled(rng, answerW, decoyPool(), n)
      const prompt = [`Which word has the ${soundName} sound?`]
      return riddle({
        family: 'vowels', skill: 'phonics: vowel sounds', prompt, choices, answer,
        spoken: `Which word has the ${spokenName} sound? ${choices.map(c => c.text).join(', ')}?`,
        metric: (isLong(key) ? 10 : 0) + MODE_BONUS.name + (contrast ? 3 : 0) + answerW.length, grade, tier,
      })
    }

    // same: "Which word has the same vowel sound as cake?"
    const sample = rng.bool(0.4) ? VOWEL_SOUNDS[key].sample : rng.pick(family)
    const answerW = rng.pick(family.filter(w => w !== sample))
    const { choices, answer } = shuffled(rng, answerW, decoyPool(), n)
    const verse = grade === 1 && rng.bool(0.5)
    const prompt = verse
      ? [`${cap(sample)} is my word. Listen well!`, 'Which word has the same vowel sound?', `Say it slowly, then you'll tell.`]
      : [`Which word has the same vowel sound as ${sample}?`]
    return riddle({
      family: 'vowels', skill: 'phonics: vowel sounds', prompt, verse, highlight: [sample], choices, answer,
      spoken: `Which word has the same vowel sound as ${sample}? ${choices.map(c => c.text).join(', ')}?`,
      metric: (isLong(key) ? 10 : 0) + (contrast ? 3 : 0) + answerW.length, grade, tier,
    })
  },
}

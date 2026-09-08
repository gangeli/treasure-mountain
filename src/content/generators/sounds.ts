import type { Generator } from '../types'
import { riddle, shuffled, choiceCount, cap, sayChoices} from '../types'
import { BEGINNING, ENDING, DIGRAPHS, ENDING_DIGRAPHS, BLENDS, FINAL_BLENDS, beginSoundOf, endKeySound, endSoundOf, noInitialBlend } from '../data/phonics'

type Pos = 'start' | 'end'

interface Task {
  table: Record<string, string[]>
  keys: string[]
  /** Where in the word the asked-for sound sits. The question line always says so. */
  pos: Pos
  skill: string
  /** Base difficulty: single letters < digraphs < ending digraphs < blends < final/three-letter blends. */
  weight: number
}

const twoLetterBlends = Object.keys(BLENDS).filter(k => k.length === 2)
const threeLetterBlends = Object.keys(BLENDS).filter(k => k.length === 3)
/** The blends taught first, used for the grade 2 tier 1 warm-up. */
const EASY_BLENDS = ['bl', 'cl', 'fl', 'sl', 'sn', 'sp', 'st', 'sk']

const begin: Task = { table: BEGINNING, keys: Object.keys(BEGINNING), pos: 'start', skill: 'phonics: beginning sounds', weight: 10 }
const end: Task = { table: ENDING, keys: Object.keys(ENDING), pos: 'end', skill: 'phonics: ending sounds', weight: 20 }
const digraph: Task = { table: DIGRAPHS, keys: Object.keys(DIGRAPHS), pos: 'start', skill: 'phonics: digraphs', weight: 30 }
const endDigraph: Task = { table: ENDING_DIGRAPHS, keys: Object.keys(ENDING_DIGRAPHS), pos: 'end', skill: 'phonics: digraphs', weight: 36 }
const easyBlend: Task = { table: BLENDS, keys: EASY_BLENDS, pos: 'start', skill: 'phonics: blends', weight: 44 }
const blend: Task = { table: BLENDS, keys: twoLetterBlends, pos: 'start', skill: 'phonics: blends', weight: 44 }
const finalBlend: Task = { table: FINAL_BLENDS, keys: Object.keys(FINAL_BLENDS), pos: 'end', skill: 'phonics: blends', weight: 50 }
const bigBlend: Task = { table: BLENDS, keys: threeLetterBlends, pos: 'start', skill: 'phonics: blends', weight: 52 }

/**
 * K: beginning sounds -> beginning and ending -> ending sounds. Grade 1 moves on to digraphs and
 * finishes on digraphs at the end of a word. Grade 2 goes two-letter blends -> three-letter and
 * final blends. A task listed twice is drawn twice as often.
 */
const PLANS: Record<0 | 1 | 2, [Task[], Task[], Task[]]> = {
  0: [[begin], [begin, end], [end]],
  1: [[end, end, begin], [digraph], [endDigraph]],
  2: [[digraph, easyBlend], [blend], [bigBlend, finalBlend]],
}

const MAX_LINE = 46
/** Two sounds are "the same" for decoy purposes when one ends with the other (x = /ks/ ends in /s/). */
const sameEnd = (a: string, b: string): boolean => a === b || a.endsWith(b) || b.endsWith(a)

export const sounds: Generator = {
  id: 'sounds',
  name: 'Letter sounds',
  area: 'reading',
  grades: [0, 1, 2],
  weight: { 0: 2, 1: 1.5, 2: 0.8 },
  make(grade, tier, rng) {
    const task = rng.pick(PLANS[grade as 0 | 1 | 2][tier - 1])
    // Kindergarten reads CVC words: no initial blends or digraphs, in the prompt or in the choices.
    const readable = (w: string) => grade > 0 || noInitialBlend(w)
    const wordsOf = (k: string) => task.table[k].filter(readable)
    const keys = task.keys.filter(k => wordsOf(k).length >= 4)
    const key = rng.pick(keys)
    const words = wordsOf(key)

    const answer = rng.pick(words)
    const shown = rng.sample(words.filter(w => w !== answer), Math.min(4, words.length - 1))
    const line1 = () => `${cap(shown.join(', '))}.`
    while (shown.length > 2 && line1().length > MAX_LINE) shown.pop()

    // Decoys never carry the target sound in the position the question asks about.
    const relatedKey = task.pos === 'start'
      ? (k: string) => beginSoundOf(k) === beginSoundOf(key) || k.startsWith(key) || key.startsWith(k)
      : (k: string) => sameEnd(endKeySound(k), endKeySound(key))
    const badWord = task.pos === 'start'
      ? (w: string) => w.startsWith(key)
      // Belt and braces for ending sounds: the decoy must not start with the letters either.
      : (w: string) => sameEnd(endSoundOf(w), endKeySound(key)) || w.startsWith(key)
    const decoys = rng.shuffle(keys.filter(k => !relatedKey(k)).flatMap(wordsOf).filter(w => !badWord(w) && w !== answer && !shown.includes(w)))

    const n = choiceCount(grade)
    const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
    const verb = task.pos === 'start' ? 'begins' : 'ends'
    const tail = rng.pick([
      [`Which word ${verb} with ${key} too?`, 'Pick that one, and we are through!'],
      [`Which word ${verb} with ${key} as well?`, 'Pick it out and ring the bell!'],
    ])
    const prompt = [line1(), `These words all ${task.pos === 'start' ? 'begin' : 'end'} with ${key}.`, ...tail]
    const spell = key.split('').join(' ')
    return riddle({
      family: 'sounds', skill: task.skill, prompt, verse: true,
      highlight: task.pos === 'end' ? [key] : undefined,
      choices, answer: idx,
      spoken: `${shown.join(', ')}. These words all ${task.pos === 'start' ? 'begin' : 'end'} with ${spell}. Which word ${verb} with ${spell}? ${sayChoices(choices)}?`,
      metric: task.weight + answer.length, grade, tier,
    })
  },
}

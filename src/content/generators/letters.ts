import type { Generator, Choice, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount } from '../types'
import { BEGINNING } from '../data/phonics'

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** Letters children mix up (shape or mirror image), by case. */
const CONFUSABLE_UPPER: string[][] = [['B', 'D', 'P', 'R'], ['M', 'N', 'W'], ['O', 'Q', 'C', 'G'], ['E', 'F'], ['I', 'J', 'L', 'T'], ['U', 'V', 'Y'], ['K', 'X'], ['S', 'Z'], ['H', 'N', 'M'], ['A', 'V']]
const CONFUSABLE_LOWER: string[][] = [['b', 'd', 'p', 'q'], ['m', 'n', 'w'], ['i', 'j', 'l', 't'], ['c', 'e', 'o', 'a'], ['u', 'v', 'y'], ['f', 't'], ['g', 'q', 'y', 'p'], ['h', 'k', 'n'], ['s', 'z'], ['r', 'n', 'm'], ['x', 'k']]

type Mode = 'find' | 'case' | 'first' | 'after' | 'before' | 'between'
const MODE_RANK: Record<Mode, number> = { find: 1, case: 2, first: 3, after: 4, before: 4, between: 5 }

function modesFor(grade: Grade, tier: Tier): Mode[] {
  if (grade === 0) return tier === 1 ? ['find'] : tier === 2 ? ['find', 'case'] : ['case', 'first', 'find']
  return tier === 1 ? ['case', 'first'] : tier === 2 ? ['first', 'after', 'before'] : ['after', 'before', 'between', 'first']
}

const letterChoice = (ch: string): Choice => ({ visual: { kind: 'letter', text: ch, lower: ch === ch.toLowerCase() } })
const say = (ch: string): string => ch === ch.toLowerCase() ? `little ${ch}` : `big ${ch}`
const speakChoices = (choices: Choice[]): string => choices.map(c => say(c.visual && c.visual.kind === 'letter' ? c.visual.text : (c.text ?? ''))).join(', ')

/** Confusable siblings first, then random letters, all in the case of `ch`. */
function letterDecoys(rng: { shuffle<T>(a: readonly T[]): T[] }, ch: string, confusable: boolean): string[] {
  const lower = ch === ch.toLowerCase()
  const groups = lower ? CONFUSABLE_LOWER : CONFUSABLE_UPPER
  const sib = confusable ? rng.shuffle(groups.filter(g => g.includes(ch)).flatMap(g => g).filter(x => x !== ch)) : []
  const rest = rng.shuffle(ALPHA.map(x => lower ? x.toLowerCase() : x)).filter(x => x !== ch && !sib.includes(x))
  return [...sib, ...rest]
}

/** Letter recognition (K) and alphabet order / first letters (grade 1). */
export const letters: Generator = {
  id: 'letters',
  name: 'Letters',
  area: 'reading',
  grades: [0, 1],
  weight: { 0: 2, 1: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const mode = rng.pick(modesFor(grade, tier))
    const confusable = grade === 1 || tier >= 2
    const conf = confusable && rng.bool(grade === 0 ? 0.6 : 0.8)

    if (mode === 'find') {
      const lower = tier >= 2 && rng.bool(0.5)
      const L = rng.pick(ALPHA)
      const ch = lower ? L.toLowerCase() : L
      const { choices, answer } = shuffled(rng, letterChoice(ch), letterDecoys(rng, ch, conf).map(letterChoice), n)
      const prompt = lower ? [`Which one is little ${ch}?`] : [`Which one is the letter ${ch}?`]
      return riddle({
        family: 'letters', skill: 'reading: letter recognition', prompt, choices, answer,
        spoken: `${prompt[0]} ${speakChoices(choices)}?`,
        metric: MODE_RANK.find * 10 + (conf ? 5 : 0) + (lower ? 2 : 0), grade, tier,
      })
    }

    if (mode === 'case') {
      const L = rng.pick(ALPHA)
      const showUpper = rng.bool(0.6)
      const shown = showUpper ? L : L.toLowerCase()
      const want = showUpper ? L.toLowerCase() : L
      const { choices, answer } = shuffled(rng, letterChoice(want), letterDecoys(rng, want, conf).map(letterChoice), n)
      const prompt = [`This is ${say(shown)}.`, `Which one is ${say(want)}?`]
      return riddle({
        family: 'letters', skill: 'reading: big and little letters', prompt, visual: { kind: 'letter', text: shown, lower: !showUpper },
        choices, answer, spoken: `This is ${say(shown)}. Which one is ${say(want)}? ${speakChoices(choices)}?`,
        metric: MODE_RANK.case * 10 + (conf ? 5 : 0), grade, tier,
      })
    }

    if (mode === 'first') {
      const key = rng.pick(Object.keys(BEGINNING))
      const word = rng.pick(BEGINNING[key])
      const lower = rng.bool(0.5)
      const ch = lower ? key : key.toUpperCase()
      // Plausible decoys: the last letter, a letter inside the word, then confusable/random letters.
      const inWord = rng.shuffle([...new Set(word.replace(/[^a-z]/g, '').split(''))].filter(x => x !== key)).map(x => lower ? x : x.toUpperCase())
      const decoys = [...inWord.slice(0, 1), ...letterDecoys(rng, ch, conf)]
      const { choices, answer } = shuffled(rng, letterChoice(ch), decoys.map(letterChoice), n)
      const prompt = [`Which letter does "${word}" start with?`]
      return riddle({
        family: 'letters', skill: 'phonics: first letters', prompt, visual: { kind: 'text', text: word }, choices, answer,
        spoken: `Which letter does the word ${word} start with? ${speakChoices(choices)}?`,
        metric: MODE_RANK.first * 10 + (conf ? 5 : 0) + (lower ? 2 : 0), grade, tier,
      })
    }

    // alphabet order: after / before / between
    const lower = tier === 3 && rng.bool(0.4)
    const idx = mode === 'after' ? rng.int(0, 24) : mode === 'before' ? rng.int(1, 25) : rng.int(0, 23)
    const at = (i: number) => lower ? ALPHA[i].toLowerCase() : ALPHA[i]
    const answerIdx = mode === 'after' ? idx + 1 : mode === 'before' ? idx - 1 : idx + 1
    const ch = at(answerIdx)
    const near = [answerIdx - 2, answerIdx + 2, answerIdx - 1, answerIdx + 1, answerIdx - 3, answerIdx + 3].filter(i => i >= 0 && i < 26 && i !== answerIdx && !(mode === 'between' && (i === idx || i === idx + 2)))
    const decoys = [...rng.shuffle(near).map(at), ...letterDecoys(rng, ch, false)]
    const { choices, answer } = shuffled(rng, letterChoice(ch), decoys.map(letterChoice), n)
    const prompt = mode === 'after' ? [`Which letter comes right after ${at(idx)}?`]
      : mode === 'before' ? [`Which letter comes right before ${at(idx)}?`]
        : [`Which letter comes between ${at(idx)} and ${at(idx + 2)}?`]
    return riddle({
      family: 'letters', skill: 'reading: alphabet order', prompt, choices, answer,
      spoken: `${prompt[0]} ${speakChoices(choices)}?`,
      metric: MODE_RANK[mode] * 10 + (lower ? 2 : 0), grade, tier,
    })
  },
}


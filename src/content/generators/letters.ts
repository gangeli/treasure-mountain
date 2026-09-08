import type { Rng } from '../../engine/rng'
import type { Generator, Choice, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { BEGINNING } from '../data/phonics'

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** Letters children mix up (shape or mirror image), by case. */
const CONFUSABLE_UPPER: string[][] = [['B', 'D', 'P', 'R'], ['M', 'N', 'W'], ['O', 'Q', 'C', 'G'], ['E', 'F'], ['I', 'J', 'L', 'T'], ['U', 'V', 'Y'], ['K', 'X'], ['S', 'Z'], ['H', 'N', 'M'], ['A', 'V']]
const CONFUSABLE_LOWER: string[][] = [['b', 'd', 'p', 'q'], ['m', 'n', 'w'], ['i', 'j', 'l', 't'], ['c', 'e', 'o', 'a'], ['u', 'v', 'y'], ['f', 't'], ['g', 'q', 'y', 'p'], ['h', 'k', 'n'], ['s', 'z'], ['r', 'n', 'm'], ['x', 'k']]

/**
 * Letters that cannot be named in words: in the game font little l is the same stroke as big I and
 * the digit 1, so "Which one is little l?" has no unambiguous answer. They are still fine as the
 * letter *shown* in a picture, and as decoys.
 */
const NAMELESS = new Set(['l', 'I'])

type Mode = 'find' | 'findLower' | 'case' | 'first' | 'after' | 'before' | 'between'
/** Metric = the rank; the ranks are the skill ladder, so tiers and grades cannot overlap. */
const MODE_RANK: Record<Mode, number> = { find: 10, findLower: 15, case: 20, first: 30, after: 40, before: 40, between: 50 }

/**
 * One pool per grade and tier. Kindergarten climbs big letters -> little letters -> case matching
 * and first letters; grade 1 starts where K stops (first letters and alphabet order), so no tier
 * can draw a riddle an easier tier - or the year below - already asks.
 */
function modesFor(grade: Grade, tier: Tier): Mode[] {
  if (grade === 0) return tier === 1 ? ['find'] : tier === 2 ? ['findLower', 'case'] : ['case', 'first']
  return tier === 1 ? ['first', 'after'] : tier === 2 ? ['first', 'after', 'before'] : ['after', 'before', 'between']
}

const letterChoice = (ch: string): Choice => ({ visual: { kind: 'letter', text: ch, lower: ch === ch.toLowerCase() } })
const say = (ch: string): string => ch === ch.toLowerCase() ? `little ${ch}` : `big ${ch}`
const speakChoices = (choices: Choice[]): string => choices.map(c => say(c.visual && c.visual.kind === 'letter' ? c.visual.text : (c.text ?? ''))).join(', ')

/** Confusable siblings first, then random letters, all in the case of `ch`. */
function letterDecoys(rng: Rng, ch: string, confusable: boolean): string[] {
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

    if (mode === 'find' || mode === 'findLower') {
      const lower = mode === 'findLower'
      const L = rng.pick(ALPHA.filter(x => !NAMELESS.has(lower ? x.toLowerCase() : x)))
      const ch = lower ? L.toLowerCase() : L
      const { choices, answer } = shuffled(rng, letterChoice(ch), letterDecoys(rng, ch, conf).map(letterChoice), n)
      const prompt = lower ? [`Which one is little ${ch}?`] : [`Which one is the letter ${ch}?`]
      return riddle({
        family: 'letters', skill: 'reading: letter recognition', prompt, choices, answer,
        spoken: `${prompt[0]} ${speakChoices(choices)}?`,
        metric: MODE_RANK[mode] + (conf ? 5 : 0), grade, tier, key: `letters|find|${ch}`,
      })
    }

    if (mode === 'case') {
      const L = rng.pick(ALPHA)
      // The letter the child has to find is named in words, so it may never be l or I.
      const showUpper = L === 'L' ? false : L === 'I' ? true : rng.bool(0.6)
      const shown = showUpper ? L : L.toLowerCase()
      const want = showUpper ? L.toLowerCase() : L
      const { choices, answer } = shuffled(rng, letterChoice(want), letterDecoys(rng, want, conf).map(letterChoice), n)
      const prompt = [`This is ${say(shown)}.`, `Which one is ${say(want)}?`]
      return riddle({
        family: 'letters', skill: 'reading: big and little letters', prompt, visual: { kind: 'letter', text: shown, lower: !showUpper },
        choices, answer, spoken: `This is ${say(shown)}. Which one is ${say(want)}? ${speakChoices(choices)}?`,
        metric: MODE_RANK.case + (conf ? 5 : 0), grade, tier, key: `letters|case|${shown}${want}`,
      })
    }

    if (mode === 'first') {
      const key = rng.pick(Object.keys(BEGINNING))
      const word = rng.pick(BEGINNING[key])
      // The word is printed in the opposite case to the letters offered, so matching the first
      // glyph cannot solve the riddle: the child has to know which letter makes that sound.
      const upperChoices = rng.bool(0.5)
      const shownWord = upperChoices ? word : cap(word)
      const ch = upperChoices ? key.toUpperCase() : key
      const cased = (x: string) => upperChoices ? x.toUpperCase() : x
      // Plausible decoys: the other letters of the word first, then look-alikes of the answer.
      const inWord = rng.shuffle([...new Set(word.replace(/[^a-z]/g, '').split(''))].filter(x => x !== key)).map(cased)
      const decoys = [...inWord, ...letterDecoys(rng, ch, true)]
      const { choices, answer } = shuffled(rng, letterChoice(ch), decoys.map(letterChoice), n)
      const prompt = [`Which letter does "${shownWord}" start with?`]
      return riddle({
        family: 'letters', skill: 'phonics: first letters', prompt, visual: { kind: 'text', text: shownWord }, choices, answer,
        spoken: `Which letter does the word ${word} start with? ${speakChoices(choices)}?`,
        metric: MODE_RANK.first + (conf ? 5 : 0), grade, tier, key: `letters|first|${key}`,
      })
    }

    // alphabet order: after / before / between
    const lower = tier === 3 && rng.bool(0.4)
    const at = (i: number) => lower ? ALPHA[i].toLowerCase() : ALPHA[i]
    const cuesAt = (i: number) => mode === 'between' ? [i, i + 2] : [i]
    const first = mode === 'before' ? 1 : 0
    const last = mode === 'between' ? 23 : mode === 'after' ? 24 : 25
    // The question spells its cue letters out, so they may never be ones the font cannot tell apart.
    const spots: number[] = []
    for (let i = first; i <= last; i++) if (!cuesAt(i).some(k => NAMELESS.has(at(k)))) spots.push(i)
    const idx = rng.pick(spots)
    const answerIdx = mode === 'before' ? idx - 1 : idx + 1
    const cues = cuesAt(idx)
    const ch = at(answerIdx)
    // Near misses only: a letter three away is rejected by anyone who can recite the alphabet.
    // The immediate neighbour on the far side of the answer always comes first.
    const order = mode === 'after' ? [answerIdx + 1, answerIdx - 2, answerIdx + 2, answerIdx - 3]
      : mode === 'before' ? [answerIdx - 1, answerIdx + 2, answerIdx - 2, answerIdx + 3]
        : [answerIdx + 2, answerIdx - 2, answerIdx + 3, answerIdx - 3]
    const near = order.filter(i => i >= 0 && i < 26 && i !== answerIdx && !cues.includes(i))
    const decoys = [...near.slice(0, 1), ...rng.shuffle(near.slice(1))].map(at)
    const { choices, answer } = shuffled(rng, letterChoice(ch), decoys.map(letterChoice), n)
    const prompt = mode === 'after' ? [`Which letter comes right after ${at(idx)}?`]
      : mode === 'before' ? [`Which letter comes right before ${at(idx)}?`]
        : [`Which letter comes between ${at(idx)} and ${at(idx + 2)}?`]
    return riddle({
      family: 'letters', skill: 'reading: alphabet order', prompt, choices, answer,
      spoken: `${prompt[0]} ${speakChoices(choices)}?`,
      metric: MODE_RANK[mode] + (lower ? 2 : 0), grade, tier, key: `letters|${mode}|${ALPHA[idx]}`,
    })
  },
}

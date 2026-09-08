import type { Generator, CounterItem, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, nearbyNumbers, numberWord } from '../types'

const ITEMS: CounterItem[] = ['apple', 'star', 'ball', 'fish', 'flower', 'heart', 'balloon', 'bug', 'cookie', 'acorn']
const plural: Record<CounterItem, string> = { apple: 'apples', star: 'stars', ball: 'balls', fish: 'fish', flower: 'flowers', coin: 'coins', block: 'blocks', heart: 'hearts', balloon: 'balloons', bug: 'bugs', cookie: 'cookies', acorn: 'acorns' }

/** Inclusive number band a mode draws from: `[lo, hi]`. */
type Band = [number, number]

/**
 * Every mode gets a band whose *floor* rises with the tier (and with the grade), so the hardest
 * tier of a grade can never serve an item the previous tier (or the previous grade) already asked.
 */
const COUNT_BAND = (grade: Grade, tier: Tier): Band =>
  grade === 0 ? (tier === 1 ? [1, 5] : tier === 2 ? [3, 8] : [6, 10]) : [6, 12]

const ORDER_BAND = (grade: Grade, tier: Tier): Band =>
  grade === 0 ? (tier === 1 ? [1, 9] : tier === 2 ? [4, 15] : [8, 20])
    : grade === 1 ? (tier === 1 ? [5, 20] : tier === 2 ? [10, 50] : [20, 100])
      : (tier === 1 ? [20, 100] : tier === 2 ? [50, 120] : [90, 200])

const WORD_BAND = (grade: Grade, tier: Tier): Band =>
  grade === 0 ? (tier === 1 ? [1, 6] : tier === 2 ? [1, 10] : [5, 15])
    : grade === 1 ? (tier === 1 ? [1, 12] : tier === 2 ? [6, 20] : [11, 20])
      : (tier === 1 ? [21, 40] : tier === 2 ? [40, 80] : [60, 100])

/** Counting objects, "what comes next", number words, ten-frames, skip counting. K-3. */
export const counting: Generator = {
  id: 'counting',
  name: 'Counting',
  area: 'math',
  grades: [0, 1, 2, 3],
  weight: { 0: 2.5, 1: 1.5, 2: 0.8, 3: 0.5 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    type Mode = 'count' | 'next' | 'word' | 'tenframe' | 'skip' | 'before'
    let modes: Mode[]
    if (grade === 0) modes = tier === 1 ? ['count', 'count', 'next'] : tier === 2 ? ['count', 'next', 'word'] : ['count', 'next', 'word', 'before']
    else if (grade === 1) modes = tier === 1 ? ['count', 'tenframe', 'next'] : tier === 2 ? ['tenframe', 'word', 'before', 'next'] : ['skip', 'word', 'before']
    else if (grade === 2) modes = tier === 1 ? ['skip', 'word', 'next'] : ['skip', 'word', 'before']
    else modes = ['skip']
    const mode = rng.pick(modes)

    if (mode === 'count') {
      const [lo, hi] = COUNT_BAND(grade, tier)
      const count = rng.int(lo, hi)
      const item = rng.pick(ITEMS)
      const decoys = nearbyNumbers(rng, count, n - 1, 2, 1, Math.max(hi, count + 2)).map(String)
      const { choices, answer } = shuffled(rng, String(count), decoys, n)
      return riddle({
        family: 'counting', skill: 'math: counting objects', prompt: [`How many ${plural[item]} do you see?`],
        visual: { kind: 'counters', item, count }, choices, answer,
        spoken: `How many ${plural[item]} do you see? ${choices.map(c => c.text).join(', ')}?`, metric: count, grade, tier,
      })
    }

    if (mode === 'tenframe') {
      // Tier 1 fits in a single frame; from tier 2 the count always needs two frames, and the
      // prompt says so. Decoys then stay above 10 so "just the first frame" is never defensible.
      const two = tier > 1
      const count = two ? rng.int(11, 20) : rng.int(3, 10)
      const decoys = nearbyNumbers(rng, count, n - 1, 2, two ? 11 : 1, 20).map(String)
      const { choices, answer } = shuffled(rng, String(count), decoys, n)
      const prompt = [two ? 'How many dots are in the ten frames?' : 'How many dots are in the ten frame?']
      return riddle({
        family: 'counting', skill: 'math: ten frames', prompt,
        visual: { kind: 'tenframe', count }, choices, answer, spoken: `How many dots are there? ${choices.map(c => c.text).join(', ')}?`, metric: 10 + count, grade, tier,
      })
    }

    if (mode === 'next' || mode === 'before') {
      const [lo, hi] = ORDER_BAND(grade, tier)
      // "before 1" would need 0 and "after hi" would leave the band, so trim the ends.
      const start = rng.int(Math.max(lo, mode === 'before' ? 2 : 1), mode === 'next' ? hi - 1 : hi)
      const answerN = mode === 'next' ? start + 1 : start - 1
      const decoys = nearbyNumbers(rng, answerN, n - 1, 3, 0, hi + 3).map(String)
      const { choices, answer } = shuffled(rng, String(answerN), decoys, n)
      const prompt = mode === 'next' ? [`What number comes right after ${start}?`] : [`What number comes right before ${start}?`]
      return riddle({
        family: 'counting', skill: 'math: number order', prompt, choices, answer,
        spoken: `${prompt[0]} ${choices.map(c => c.text).join(', ')}?`, metric: 5 + Math.log2(Math.max(2, start)) * 4, grade, tier,
      })
    }

    if (mode === 'word') {
      const [lo, hi] = WORD_BAND(grade, tier)
      const num = rng.int(lo, hi)
      // Kindergarteners are not asked to *read* number words: they hear one and pick the numeral.
      const asDigits = grade === 0 ? true : rng.bool()
      const decoysN = nearbyNumbers(rng, num, n - 1, 3, lo, hi)
      const answerT = asDigits ? String(num) : numberWord(num)
      const decoys = decoysN.map(d => asDigits ? String(d) : numberWord(d))
      const { choices, answer } = shuffled(rng, answerT, decoys, n)
      const prompt = asDigits ? [`Which number is "${numberWord(num)}"?`] : [`How do you write ${num} in words?`]
      return riddle({ family: 'counting', skill: 'math: number words', prompt, choices, answer, spoken: `${prompt[0]} ${choices.map(c => c.text).join(', ')}?`, metric: 8 + num / 5, grade, tier })
    }

    // Skip counting. Steps rise with grade and tier, and from grade 2 tier 2 the sequence no longer
    // starts on a multiple of the step, so it cannot repeat an easier tier's "0, 2, 4, 6".
    const steps = grade === 1 ? [2, 5, 10]
      : grade === 2 ? (tier === 1 ? [2, 5, 10] : tier === 2 ? [2, 3, 5, 10] : [3, 4, 5, 10])
        : (tier === 1 ? [3, 4, 5] : tier === 2 ? [3, 4, 6, 10] : [6, 7, 8, 9, 25])
    const step = rng.pick(steps)
    const offMultiple = (lo: number, hi: number): number => {
      for (let i = 0; i < 40; i++) { const v = rng.int(lo, hi); if (v % step !== 0) return v }
      return lo % step === 0 ? lo + 1 : lo
    }
    const startBase = grade === 1 ? rng.int(0, 3) * step
      : grade === 2 ? (tier === 1 ? rng.int(0, 5) * step : tier === 2 ? rng.int(5, 15) * step : offMultiple(20, 60))
        : (tier === 1 ? offMultiple(1, 20) : tier === 2 ? offMultiple(10, 60) : offMultiple(20, 99))
    const backwards = grade >= 2 && tier >= 2 && rng.bool(0.3)
    // Counting back starts 6 steps up, so the lowest term shown (start - 3*step) is still >= 0.
    const start = backwards ? startBase + step * 6 : startBase
    const seq: number[] = []
    for (let i = 0; i < 4; i++) seq.push(backwards ? start - i * step : start + i * step)
    const answerN = backwards ? start - 4 * step : start + 4 * step
    const decoysN = new Set<number>([answerN + (backwards ? 1 : -1), answerN + (backwards ? -step : step), answerN + (backwards ? -1 : 1), answerN + 2, answerN - 2])
    decoysN.delete(answerN)
    // K-5 never sees a negative number.
    const { choices, answer } = shuffled(rng, String(answerN), rng.shuffle([...decoysN].filter(v => v >= 0)).map(String), n)
    const prompt = [`${seq.join(', ')}, ...`, 'What number comes next?']
    return riddle({
      family: 'counting', skill: 'math: skip counting', prompt, choices, answer,
      spoken: `${seq.join(', ')}. What number comes next? ${choices.map(c => c.text).join(', ')}?`,
      metric: 20 + step * 2 + (backwards ? 10 : 0) + Math.log2(Math.max(2, answerN)) * 1.5, grade, tier,
    })
  },
}

/** Whole-number ceiling for each grade's three tiers (K.OA, 1.OA.C.6, 2.NBT.B.5, 3.NBT.A.2, 4.NBT.B.4). */
const SUM_CEIL: Record<number, [number, number, number]> = { 0: [5, 7, 10], 1: [10, 15, 20], 2: [30, 60, 100], 3: [200, 500, 1000], 4: [2000, 10000, 100000] }

export const addSub: Generator = {
  id: 'addsub',
  name: 'Adding and subtracting',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 2, 2: 2, 3: 1.5, 4: 1.2, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const add = rng.bool(0.55)
    let x: number, y: number, decimals = 0
    if (grade === 5) {
      // Grade 5 owns decimal addition and subtraction (5.NBT.B.7); grade 4 stays on whole numbers.
      decimals = tier === 1 ? 1 : 2
      x = rng.int(100, tier === 3 ? 9999 : 999)
      y = rng.int(10, tier === 3 ? 9000 : 900)
    } else {
      const ceil = SUM_CEIL[grade]
      const max = ceil[tier - 1]
      // Floor = the previous tier's ceiling (or the previous grade's tier-1 ceiling), so no tier
      // ever repeats an easier tier's facts.
      const floor = tier > 1 ? ceil[tier - 2] + 1 : grade === 0 ? 2 : SUM_CEIL[grade - 1][0] + 1
      const minPart = grade <= 1 ? 1 : grade === 2 ? 5 : grade === 3 ? 20 : 100
      const total = rng.int(Math.max(floor, minPart * 2), max)
      // From grade 2 both parts carry real weight (no "50 + 19,951").
      const side = grade <= 1 ? minPart : Math.max(minPart, Math.ceil(total * 0.2))
      x = rng.int(side, total - side)
      y = total - x
    }
    const fmt = (v: number) => decimals ? (v / Math.pow(10, decimals)).toFixed(decimals) : String(v)
    if (!add && x < y) [x, y] = [y, x]
    const result = add ? x + y : x - y
    const spread = Math.max(2, Math.round(Math.max(1, result) * 0.15))
    const decoys = nearbyNumbers(rng, result, n - 1, spread, 0).map(fmt)
    // Include the classic wrong-operation decoy where possible.
    const wrongOp = add ? x - y : x + y
    if (wrongOp !== result && wrongOp >= 0 && !decoys.includes(fmt(wrongOp))) decoys[decoys.length - 1] = fmt(wrongOp)
    const { choices, answer } = shuffled(rng, fmt(result), rng.shuffle(decoys), n)
    const withPictures = grade === 0 || (grade === 1 && tier === 1 && rng.bool(0.5))
    const symbol = add ? '+' : '-'
    const prompt = [`${fmt(x)} ${symbol} ${fmt(y)} = ?`]
    const item = rng.pick(['apple', 'star', 'ball', 'fish', 'cookie', 'acorn'] as const)
    return riddle({
      family: 'addsub', skill: add ? 'math: addition' : 'math: subtraction', prompt,
      // The picture states the same equation as the text: two boxes of x and y for addition.
      visual: withPictures ? { kind: 'counters', item, count: add ? x + y : x, groups: add ? [x, y] : undefined, crossed: add ? undefined : y } : undefined,
      choices, answer,
      spoken: `What is ${fmt(x)} ${add ? 'plus' : 'minus'} ${fmt(y)}? ${choices.map(c => c.text).join(', ')}?`,
      metric: Math.log2(Math.max(2, x + y)) * 10 + decimals * 30, grade, tier,
    })
  },
}

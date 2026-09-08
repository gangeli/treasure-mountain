import type { Generator, CounterItem } from '../types'
import { riddle, shuffled, choiceCount, nearbyNumbers, numberWord } from '../types'

const ITEMS: CounterItem[] = ['apple', 'star', 'ball', 'fish', 'flower', 'heart', 'balloon', 'bug', 'cookie', 'acorn']
const plural: Record<CounterItem, string> = { apple: 'apples', star: 'stars', ball: 'balls', fish: 'fish', flower: 'flowers', coin: 'coins', block: 'blocks', heart: 'hearts', balloon: 'balloons', bug: 'bugs', cookie: 'cookies', acorn: 'acorns' }

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
      const max = grade === 0 ? (tier === 1 ? 5 : tier === 2 ? 8 : 10) : 12
      const count = rng.int(1, max)
      const item = rng.pick(ITEMS)
      const decoys = nearbyNumbers(rng, count, n - 1, 2, 1, Math.max(max, count + 2)).map(String)
      const { choices, answer } = shuffled(rng, String(count), decoys, n)
      return riddle({
        family: 'counting', skill: 'math: counting objects', prompt: [`How many ${plural[item]} do you see?`],
        visual: { kind: 'counters', item, count }, choices, answer,
        spoken: `How many ${plural[item]} do you see? ${choices.map(c => c.text).join(', ')}?`, metric: count, grade, tier,
      })
    }
    if (mode === 'tenframe') {
      const count = rng.int(3, tier === 1 ? 10 : 20)
      const decoys = nearbyNumbers(rng, count, n - 1, 2, 1, 20).map(String)
      const { choices, answer } = shuffled(rng, String(count), decoys, n)
      return riddle({
        family: 'counting', skill: 'math: ten frames', prompt: ['How many dots are in the ten frame?'],
        visual: { kind: 'tenframe', count }, choices, answer, spoken: `How many dots are there? ${choices.map(c => c.text).join(', ')}?`, metric: 10 + count, grade, tier,
      })
    }
    if (mode === 'next' || mode === 'before') {
      const max = grade === 0 ? (tier === 1 ? 9 : tier === 2 ? 15 : 20) : grade === 1 ? (tier < 3 ? 50 : 100) : 120
      const start = rng.int(mode === 'before' ? 2 : 1, max - 1)
      const answerN = mode === 'next' ? start + 1 : start - 1
      const decoys = nearbyNumbers(rng, answerN, n - 1, 3, 0, max + 3).map(String)
      const { choices, answer } = shuffled(rng, String(answerN), decoys, n)
      const prompt = mode === 'next' ? [`What number comes right after ${start}?`] : [`What number comes right before ${start}?`]
      return riddle({
        family: 'counting', skill: 'math: number order', prompt, choices, answer,
        spoken: `${prompt[0]} ${choices.map(c => c.text).join(', ')}?`, metric: 5 + Math.log2(max) * 4, grade, tier,
      })
    }
    if (mode === 'word') {
      const max = grade === 0 ? 10 : grade === 1 ? 20 : 100
      const min = grade === 2 ? 21 : 1
      const num = rng.int(min, max)
      const asDigits = rng.bool()
      const decoysN = nearbyNumbers(rng, num, n - 1, 3, min, max)
      const answerT = asDigits ? String(num) : numberWord(num)
      const decoys = decoysN.map(d => asDigits ? String(d) : numberWord(d))
      const { choices, answer } = shuffled(rng, answerT, decoys, n)
      const prompt = asDigits ? [`Which number is "${numberWord(num)}"?`] : [`How do you write ${num} in words?`]
      return riddle({ family: 'counting', skill: 'math: number words', prompt, choices, answer, spoken: `${prompt[0]} ${choices.map(c => c.text).join(', ')}?`, metric: 8 + num / 5, grade, tier })
    }
    // skip counting
    const steps = grade === 1 ? [2, 5, 10] : grade === 2 ? (tier === 1 ? [2, 5, 10] : [2, 5, 10, 3]) : (tier === 1 ? [2, 3, 5, 10] : tier === 2 ? [3, 4, 6, 10, 25] : [4, 6, 7, 8, 9, 25])
    const step = rng.pick(steps)
    const backwards = grade >= 2 && tier >= 2 && rng.bool(0.3)
    const startBase = grade === 1 ? 0 : grade === 2 ? rng.int(0, 5) * step : rng.int(0, 20)
    const start = backwards ? startBase + step * 6 : startBase
    const seq: number[] = []
    for (let i = 0; i < 4; i++) seq.push(backwards ? start - i * step : start + i * step)
    const answerN = backwards ? start - 4 * step : start + 4 * step
    const decoysN = new Set<number>([answerN + (backwards ? 1 : -1), answerN + (backwards ? -step : step), answerN + (backwards ? -1 : 1), answerN + 2])
    decoysN.delete(answerN)
    const { choices, answer } = shuffled(rng, String(answerN), rng.shuffle([...decoysN].filter(v => v >= 0)).map(String), n)
    const prompt = [`${seq.join(', ')}, ...`, 'What number comes next?']
    return riddle({
      family: 'counting', skill: 'math: skip counting', prompt, choices, answer,
      spoken: `${seq.join(', ')}. What number comes next? ${choices.map(c => c.text).join(', ')}?`, metric: 20 + step * 2 + (backwards ? 10 : 0), grade, tier,
    })
  },
}

export const addSub: Generator = {
  id: 'addsub',
  name: 'Adding and subtracting',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 2, 2: 2, 3: 1.5, 4: 1.2, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const add = rng.bool(0.55)
    // Ranges by grade and tier.
    let a: number, b: number, decimals = 0
    if (grade === 0) { const max = tier === 1 ? 5 : tier === 2 ? 7 : 10; a = rng.int(1, max - 1); b = rng.int(1, max - a) }
    else if (grade === 1) { const max = tier === 1 ? 10 : tier === 2 ? 15 : 20; a = rng.int(1, max - 1); b = rng.int(1, max - a) }
    else if (grade === 2) { const max = tier === 1 ? 30 : tier === 2 ? 60 : 100; a = rng.int(5, max - 5); b = rng.int(1, max - a) }
    else if (grade === 3) { const max = tier === 1 ? 200 : tier === 2 ? 500 : 1000; a = rng.int(20, max - 20); b = rng.int(10, max - a) }
    else if (grade === 4) {
      if (tier === 3 && rng.bool(0.5)) { decimals = 1; a = rng.int(10, 500); b = rng.int(1, 400) } else { const max = tier === 1 ? 2000 : tier === 2 ? 10000 : 100000; a = rng.int(100, max - 100); b = rng.int(50, max - a) }
    } else {
      decimals = tier === 1 ? 1 : 2; a = rng.int(100, tier === 3 ? 9999 : 999); b = rng.int(10, tier === 3 ? 9000 : 900)
    }
    const fmt = (v: number) => decimals ? (v / Math.pow(10, decimals)).toFixed(decimals) : String(v)
    let x = a, y = b
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
      visual: withPictures ? { kind: 'counters', item, count: add ? x + y : x, groups: add ? 2 : undefined, crossed: add ? undefined : y } : undefined,
      choices, answer,
      spoken: `What is ${fmt(x)} ${add ? 'plus' : 'minus'} ${fmt(y)}? ${choices.map(c => c.text).join(', ')}?`,
      metric: Math.log2(Math.max(2, x + y)) * 10 + decimals * 30, grade, tier,
    })
  },
}

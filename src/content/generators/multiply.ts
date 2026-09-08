import type { Generator } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys, fmtDec, fmtInt, COUNTER_ITEMS, plural } from './mathutil'

const natDec = (units: number, places: number): string => {
  let s = fmtDec(units, places)
  if (s.includes('.')) { s = s.replace(/0+$/, ''); if (s.endsWith('.')) s = s.slice(0, -1) }
  return s
}

/** Equal groups (2), facts (3), 2-digit x 1-digit and x10s (4), 2-digit x 2-digit and decimals (5). */
export const multiply: Generator = {
  id: 'multiply',
  name: 'Multiplication',
  area: 'math',
  grades: [2, 3, 4, 5],
  weight: { 2: 0.8, 3: 1.6, 4: 1.5, 5: 1.2 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)

    if (grade === 2) {
      const groups = rng.int(2, tier === 1 ? 3 : tier === 2 ? 4 : 5)
      const size = rng.int(2, tier === 1 ? 4 : tier === 2 ? 5 : 6)
      const product = groups * size
      const item = rng.pick(COUNTER_ITEMS)
      const useArray = rng.bool()
      const symbolic = tier === 3 && rng.bool(0.4)
      const decoys = numDecoys(rng, product, n - 1, [groups + size, product - size, product + size, product - groups, product + groups, product + 1], 3, 1)
      const { choices, answer } = shuffled(rng, String(product), decoys.map(String), n)
      const items = plural(item, 2)
      const prompt = symbolic ? [`${groups} x ${size} = ?`]
        : useArray ? rng.pick([[`There are ${groups} rows of ${size} ${items}.`, `How many ${items} are there?`], [`${groups} rows of ${size} = ?`]])
          : rng.pick([[`${groups} groups of ${size} ${items}.`, `How many ${items} in all?`], [`${groups} groups of ${size} = ?`]])
      return mathRiddle({
        family: 'multiply', skill: 'math: equal groups', prompt,
        visual: useArray ? { kind: 'array', rows: groups, cols: size, item } : { kind: 'counters', item, count: product, groups },
        choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`,
        metric: (Math.log2(groups) + Math.log2(size)) * 5, grade, tier,
      }, `num:${groups}*${size}`)
    }

    if (grade === 3) {
      const [aLo, aHi, bLo, bHi] = tier === 1 ? [2, 5, 1, 10] : tier === 2 ? [2, 9, 2, 10] : [6, 10, 6, 12]
      let a = rng.int(aLo, aHi), b = rng.int(bLo, bHi)
      if (rng.bool()) [a, b] = [b, a]
      const missing = tier >= 2 && rng.bool(0.3)
      if (missing) {
        const decoys = numDecoys(rng, b, n - 1, [b - 1, b + 1, a, a * b, b + 2, a * b - a], 3, 1)
        const { choices, answer } = shuffled(rng, String(b), decoys.map(String), n)
        const prompt = [`${a} x ? = ${a * b}`, 'What is the missing number?']
        return mathRiddle({ family: 'multiply', skill: 'math: multiplication facts', prompt, choices, answer, spoken: `${a} times what equals ${a * b}? ${sayChoices(choices)}?`, metric: (Math.log2(a) + Math.log2(b)) * 5 + 3, grade, tier }, `num:${a * b}/${a}`)
      }
      const p = a * b
      const decoys = numDecoys(rng, p, n - 1, [a * (b - 1), a * (b + 1), (a - 1) * b, (a + 1) * b, a + b, p + 1], 4, 0)
      const { choices, answer } = shuffled(rng, String(p), decoys.map(String), n)
      const prompt = [`${a} x ${b} = ?`]
      return mathRiddle({ family: 'multiply', skill: 'math: multiplication facts', prompt, choices, answer, spoken: `What is ${a} times ${b}? ${sayChoices(choices)}?`, metric: (Math.log2(a) + Math.log2(b)) * 5, grade, tier }, `num:${a}*${b}`)
    }

    if (grade === 4) {
      const tens = rng.bool(0.3)
      if (tens) {
        // x 10 / x 100 / x 1000, and multiples of ten (40 x 6).
        const pow = tier === 1 ? 10 : tier === 2 ? rng.pick([10, 100]) : rng.pick([10, 100, 1000])
        const byTen = tier >= 2 && rng.bool(0.4)
        const a = byTen ? rng.int(2, 9) * 10 : rng.int(11, tier === 1 ? 50 : 99)
        const b = byTen ? rng.int(3, 9) : pow
        const p = a * b
        const decoys = numDecoys(rng, p, n - 1, [p / 10, p * 10, a + b, p + 10, a * (b + 1), p / 100], Math.max(4, p / 10), 1)
        const { choices, answer } = shuffled(rng, fmtInt(p), decoys.map(fmtInt), n)
        const prompt = [rng.bool() ? `${a} x ${b} = ?` : `${b} x ${a} = ?`]
        return mathRiddle({ family: 'multiply', skill: 'math: multiplying by tens', prompt, choices, answer, spoken: `What is ${a} times ${b}? ${sayChoices(choices)}?`, metric: (Math.log2(a) + Math.log2(b)) * 5, grade, tier }, `num:${a}*${b}`)
      }
      const [aLo, aHi, bLo, bHi] = tier === 1 ? [11, 25, 2, 5] : tier === 2 ? [12, 49, 2, 9] : [21, 99, 3, 9]
      const a = rng.int(aLo, aHi), b = rng.int(bLo, bHi)
      const p = a * b
      const t = Math.floor(a / 10), o = a % 10
      const noCarry = t * b * 10 + ((o * b) % 10)
      const decoys = numDecoys(rng, p, n - 1, [a * (b - 1), a * (b + 1), noCarry, p + 10, p - 10, a + b], Math.max(3, Math.round(p * 0.1)), 1)
      const { choices, answer } = shuffled(rng, String(p), decoys.map(String), n)
      const prompt = [rng.bool(0.7) ? `${a} x ${b} = ?` : `${b} x ${a} = ?`]
      return mathRiddle({ family: 'multiply', skill: 'math: multi-digit multiplication', prompt, choices, answer, spoken: `What is ${a} times ${b}? ${sayChoices(choices)}?`, metric: (Math.log2(a) + Math.log2(b)) * 5, grade, tier }, `num:${a}*${b}`)
    }

    // grade 5
    const decimal = tier >= 2 && rng.bool(0.4)
    if (decimal) {
      const places = tier === 2 ? 1 : rng.pick([1, 2])
      const units = rng.int(11, places === 1 ? 99 : 499)
      const b = rng.int(2, 9)
      const pu = units * b
      const decoys = numDecoys(rng, pu, n - 1, [pu * 10, Math.round(pu / 10), units * (b - 1), units * (b + 1), pu + b, pu - b], Math.max(3, Math.round(pu * 0.1)), 1)
      const aT = natDec(units, places)
      const { choices, answer } = shuffled(rng, natDec(pu, places), decoys.map(d => natDec(d, places)), n)
      const prompt = [`${aT} x ${b} = ?`]
      return mathRiddle({ family: 'multiply', skill: 'math: multiplying decimals', prompt, choices, answer, spoken: `What is ${aT} times ${b}? ${sayChoices(choices)}?`, metric: (Math.log2(units) + Math.log2(b)) * 5 + places * 15, grade, tier }, `num:${aT}*${b}`)
    }
    const [aLo, aHi, bLo, bHi] = tier === 1 ? [11, 30, 11, 20] : tier === 2 ? [12, 60, 12, 40] : [21, 99, 21, 99]
    const a = rng.int(aLo, aHi), b = rng.int(bLo, bHi)
    const p = a * b
    const noShift = a * Math.floor(b / 10) + a * (b % 10)
    const decoys = numDecoys(rng, p, n - 1, [a * (b - 1), a * (b + 1), noShift, p + 100, p - 100, p + 10], Math.max(5, Math.round(p * 0.08)), 1)
    const { choices, answer } = shuffled(rng, fmtInt(p), decoys.map(fmtInt), n)
    const prompt = [`${a} x ${b} = ?`]
    return mathRiddle({ family: 'multiply', skill: 'math: multi-digit multiplication', prompt, choices, answer, spoken: `What is ${a} times ${b}? ${sayChoices(choices)}?`, metric: (Math.log2(a) + Math.log2(b)) * 5, grade, tier }, `num:${a}*${b}`)
  },
}

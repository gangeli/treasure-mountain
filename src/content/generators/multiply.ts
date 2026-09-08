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
      // Disjoint factor bands so tier 3 never repeats a tier-1 fact (2 rows of 2).
      const [gLo, gHi, sLo, sHi] = tier === 1 ? [2, 3, 2, 4] : tier === 2 ? [2, 4, 3, 5] : [3, 5, 4, 6]
      const groups = rng.int(gLo, gHi)
      const size = rng.int(sLo, sHi)
      const product = groups * size
      const item = rng.pick(COUNTER_ITEMS)
      const useArray = rng.bool()
      const decoys = numDecoys(rng, product, n - 1, [groups + size, product - size, product + size, product - groups, product + groups, product + 1], 3, 1)
      const { choices, answer } = shuffled(rng, String(product), decoys.map(String), n)
      const items = plural(item, 2)
      // 2.OA.4 is repeated addition in words; the "x" symbol waits for grade 3.
      const prompt = useArray ? rng.pick([[`There are ${groups} rows of ${size} ${items}.`, `How many ${items} are there?`], [`${groups} rows of ${size} = ?`]])
        : rng.pick([[`${groups} groups of ${size} ${items}.`, `How many ${items} in all?`], [`${groups} groups of ${size} = ?`]])
      return mathRiddle({
        family: 'multiply', skill: 'math: equal groups', prompt,
        visual: useArray ? { kind: 'array', rows: groups, cols: size, item } : { kind: 'counters', item, count: product, groups },
        choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`,
        metric: (Math.log2(groups) + Math.log2(size)) * 5, grade, tier,
      }, `num:${groups}*${size}`)
    }

    if (grade === 3) {
      // Fact bands: tier 1 = the 0-5 and 10 facts, tier 2 = one factor 6-9, tier 3 = 6-9 x 6-12
      // (and never a x10 fact, which is easier than everything else in the grade).
      let a: number, b: number
      if (tier === 1) { a = rng.int(2, 5); b = rng.pick([2, 3, 4, 5, 10]) }
      else if (tier === 2) { a = rng.int(6, 9); b = rng.int(2, 5) }
      else { a = rng.int(6, 9); b = rng.pick([6, 7, 8, 9, 11, 12]) }
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
        // x 10 / x 100 / x 1000, and multiples of ten (40 x 6). Plain "x 10" is a tier-1 skill, so
        // tier 3 only sees x100 / x1000 or a multiple of ten times a real one-digit factor.
        const pow = tier === 1 ? 10 : tier === 2 ? rng.pick([10, 100]) : rng.pick([100, 1000])
        const byTen = tier >= 2 && rng.bool(0.4)
        const a = byTen ? rng.int(2, 9) * 10 : rng.int(11, tier === 1 ? 50 : 99)
        const b = byTen ? rng.int(tier === 2 ? 3 : 4, 9) : pow
        const p = a * b
        const decoys = numDecoys(rng, p, n - 1, [Math.round(p / 10), p * 10, a + b, p + 10, a * (b + 1), a * (b - 1)], Math.max(4, p / 10), 1, Number.MAX_SAFE_INTEGER, true)
        const { choices, answer } = shuffled(rng, fmtInt(p), decoys.map(fmtInt), n)
        // Prompt and choices use the same thousands separator.
        const prompt = [rng.bool() ? `${fmtInt(a)} x ${fmtInt(b)} = ?` : `${fmtInt(b)} x ${fmtInt(a)} = ?`]
        return mathRiddle({ family: 'multiply', skill: 'math: multiplying by tens', prompt, choices, answer, spoken: `What is ${a} times ${b}? ${sayChoices(choices)}?`, metric: (Math.log2(a) + Math.log2(b)) * 5, grade, tier }, `num:${a}*${b}`)
      }
      const [aLo, aHi, bLo, bHi] = tier === 1 ? [11, 25, 2, 5] : tier === 2 ? [12, 49, 3, 9] : [21, 99, 3, 9]
      const a = rng.int(aLo, aHi), b = rng.int(bLo, bHi)
      const p = a * b
      const t = Math.floor(a / 10), o = a % 10
      const noCarry = t * b * 10 + ((o * b) % 10)
      const decoys = numDecoys(rng, p, n - 1, [a * (b - 1), a * (b + 1), noCarry, p + 10, p - 10, a + b], Math.max(3, Math.round(p * 0.1)), 1, Number.MAX_SAFE_INTEGER, true)
      const { choices, answer } = shuffled(rng, String(p), decoys.map(String), n)
      const prompt = [rng.bool(0.7) ? `${a} x ${b} = ?` : `${b} x ${a} = ?`]
      return mathRiddle({ family: 'multiply', skill: 'math: multi-digit multiplication', prompt, choices, answer, spoken: `What is ${a} times ${b}? ${sayChoices(choices)}?`, metric: (Math.log2(a) + Math.log2(b)) * 5, grade, tier }, `num:${a}*${b}`)
    }

    // grade 5
    const decimal = tier >= 2 && rng.bool(0.4)
    if (decimal) {
      const places = tier === 2 ? 1 : rng.pick([1, 2])
      const units = rng.int(11, places === 1 ? 99 : 499)
      // Doubling is not a tier-3 skill.
      const b = rng.int(tier === 2 ? 2 : 3, 9)
      const pu = units * b
      const decoys = numDecoys(rng, pu, n - 1, [pu * 10, Math.round(pu / 10), units * (b - 1), units * (b + 1), pu + b, pu - b], Math.max(3, Math.round(pu * 0.1)), 1, Number.MAX_SAFE_INTEGER, true)
      const aT = natDec(units, places)
      const { choices, answer } = shuffled(rng, natDec(pu, places), decoys.map(d => natDec(d, places)), n)
      const prompt = [`${aT} x ${b} = ?`]
      return mathRiddle({ family: 'multiply', skill: 'math: multiplying decimals', prompt, choices, answer, spoken: `What is ${aT} times ${b}? ${sayChoices(choices)}?`, metric: (Math.log2(units) + Math.log2(b)) * 5 + places * 15, grade, tier }, `num:${aT}*${b}`)
    }
    const [aLo, aHi, bLo, bHi] = tier === 1 ? [11, 30, 11, 20] : tier === 2 ? [12, 60, 12, 40] : [21, 99, 21, 99]
    let a = rng.int(aLo, aHi), b = rng.int(bLo, bHi)
    // Tier 3 is genuine 2-digit x 2-digit: a multiple of ten turns it back into a tier-2 item.
    if (tier === 3) {
      if (a % 10 === 0) a += rng.int(1, 9)
      if (b % 10 === 0) b += rng.int(1, 9)
    }
    const p = a * b
    const noShift = a * Math.floor(b / 10) + a * (b % 10)
    const decoys = numDecoys(rng, p, n - 1, [a * (b - 1), a * (b + 1), noShift, p + 100, p - 100, p + 10], Math.max(5, Math.round(p * 0.08)), 1, Number.MAX_SAFE_INTEGER, true)
    const { choices, answer } = shuffled(rng, fmtInt(p), decoys.map(fmtInt), n)
    const prompt = [`${a} x ${b} = ?`]
    return mathRiddle({ family: 'multiply', skill: 'math: multi-digit multiplication', prompt, choices, answer, spoken: `What is ${a} times ${b}? ${sayChoices(choices)}?`, metric: (Math.log2(a) + Math.log2(b)) * 5, grade, tier }, `num:${a}*${b}`)
  },
}

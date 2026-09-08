import type { Generator } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys, gcd, lcm } from './mathutil'
import type { Rng } from '../../engine/rng'

const factorCount = (v: number): number => { let c = 0; for (let i = 1; i <= v; i++) if (v % i === 0) c++; return c }
const factorsOf = (v: number): number[] => { const out: number[] = []; for (let i = 1; i <= v; i++) if (v % i === 0) out.push(i); return out }
/** Numbers near `around` (+-spread) satisfying `ok`, distinct, not equal to `not`. */
function pickNear(rng: Rng, around: number, spread: number, count: number, ok: (v: number) => boolean, min = 1): number[] {
  const out = new Set<number>()
  let tries = 0
  while (out.size < count && tries++ < 300) { const v = around + rng.int(-spread, spread); if (v >= min && ok(v)) out.add(v) }
  let k = 1
  while (out.size < count && k < 1000) { for (const v of [around + k, around - k]) if (v >= min && ok(v) && out.size < count) out.add(v); k++ }
  return rng.shuffle([...out])
}
const range = (lo: number, hi: number): number[] => Array.from({ length: Math.max(0, hi - lo + 1) }, (_, i) => lo + i)
/**
 * Grade 5 prime/composite items keep every choice odd. Otherwise "pick the even one" answers
 * "which is composite?" and "pick the odd one" answers "which is prime?" with no number theory at
 * all. The tier bands do not overlap, so a tier-3 card is never a tier-1 card again.
 */
const ODD_PRIMES = [5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97]
const ODD_COMPOSITES = [9, 15, 21, 25, 27, 33, 35, 39, 45, 49, 51, 55, 57, 63, 65, 69, 75, 77, 81, 85, 87, 91, 93, 95, 99]
const BAND: Record<number, [number, number]> = { 1: [5, 30], 2: [31, 60], 3: [61, 100] }
/** Sorted by distance from `ans` so decoys sit in the same size family, then shuffled. */
const nearestOf = (rng: Rng, pool: number[], ans: number, count: number): number[] =>
  rng.shuffle([...pool].sort((x, y) => Math.abs(x - ans) - Math.abs(y - ans)).slice(0, Math.max(count, 4)))

/**
 * "Which number is a factor of v?" with at least one decoy below and one above the key, so neither
 * "pick the smallest" nor "pick the biggest" beats the actual skill.
 */
function factorChoices(rng: Rng, v: number, want: boolean): { ans: number; decoys: string[] } {
  const fs = factorsOf(v).filter(f => f > 1 && f < v)
  const nonFactor = (x: number) => x > 1 && x < v && v % x !== 0
  if (want) {
    const usable = fs.filter(f => range(2, f - 1).some(nonFactor))
    const ans = rng.pick(usable.length ? usable : fs)
    const lower = rng.shuffle(range(2, ans - 1).filter(nonFactor))
    const upper = rng.shuffle(range(ans + 1, v - 1).filter(nonFactor))
    return { ans, decoys: [...lower.slice(0, 1), ...upper.slice(0, 1), ...rng.shuffle([...lower.slice(1), ...upper.slice(1)])].map(String) }
  }
  const pool = range(2, v - 1).filter(x => nonFactor(x) && fs.some(f => f > x))
  const ans = rng.pick(pool.length ? pool : range(2, v - 1).filter(nonFactor))
  const above = rng.shuffle(fs.filter(f => f > ans))
  const below = rng.shuffle(fs.filter(f => f < ans))
  return { ans, decoys: [...above.slice(0, 1), ...below.slice(0, 1), ...rng.shuffle([...above.slice(1), ...below.slice(1)])].map(String) }
}

/** Even/odd (2-3), factors and multiples (4), primes, GCF and LCM (5). */
export const evenodd: Generator = {
  id: 'evenodd',
  name: 'Even, odd, factors and primes',
  area: 'math',
  grades: [2, 3, 4, 5],
  weight: { 2: 1, 3: 1, 4: 1.2, 5: 1.2 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)

    if (grade <= 3) {
      // Number bands stay inside the grade's place-value range (within 1000) and do not overlap
      // between tiers, so a tier-2 card can never be a tier-1 card with the choices reshuffled.
      const [lo, hi] = grade === 2
        ? (tier === 1 ? [2, 20] : tier === 2 ? [21, 99] : [100, 999])
        : (tier === 1 ? [100, 499] : tier === 2 ? [300, 999] : [500, 999])
      type M = 'which' | 'next' | 'multiple' | 'sum'
      const modes: M[] = grade === 2 ? (tier === 1 ? ['which', 'which', 'next'] : ['which', 'next']) : (tier === 1 ? ['which', 'next', 'multiple'] : tier === 2 ? ['which', 'multiple', 'next'] : ['which', 'multiple', 'sum'])
      const mode = rng.pick(modes)
      const metric = (grade === 2 ? 10 : 26) + tier * 3
      if (mode === 'which') {
        const wantEven = rng.bool()
        const inBand = (v: number) => v >= lo && v <= hi
        const ans = pickNear(rng, rng.int(lo, hi), 3, 1, v => inBand(v) && (v % 2 === 0) === wantEven, lo)[0]
        const decoys = pickNear(rng, ans, Math.max(6, Math.round((hi - lo) / 4)), n + 1, v => inBand(v) && (v % 2 === 0) !== wantEven && v !== ans, lo).map(String)
        const { choices, answer } = shuffled(rng, String(ans), decoys, n)
        const prompt = [rng.pick([`Which number is ${wantEven ? 'even' : 'odd'}?`, `Which of these is an ${wantEven ? 'even' : 'odd'} number?`])]
        return mathRiddle({ family: 'evenodd', skill: 'math: even and odd', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric, grade, tier }, `parity:${wantEven ? 'even' : 'odd'}`)
      }
      if (mode === 'next') {
        const wantEven = rng.bool()
        const from = rng.int(lo, Math.max(lo, hi - 3))
        const target = ((from + 1) % 2 === 0) === wantEven ? from + 1 : from + 2
        const decoys = numDecoys(rng, target, n - 1, [target + 1, target - 1, target + 2, from], 3, 0).map(String)
        const { choices, answer } = shuffled(rng, String(target), decoys, n)
        const prompt = [`What is the first ${wantEven ? 'even' : 'odd'} number`, `after ${from}?`]
        return mathRiddle({ family: 'evenodd', skill: 'math: even and odd', prompt, choices, answer, spoken: `What is the first ${wantEven ? 'even' : 'odd'} number after ${from}? ${sayChoices(choices)}?`, metric: metric + 2, grade, tier }, `nextparity:${wantEven ? 'even' : 'odd'},${from}`)
      }
      if (mode === 'multiple') {
        // "a multiple of 2" is the even/odd question again, so grade 3 does not ask it.
        const m = rng.pick(grade === 2 ? [2, 5, 10] : tier === 1 ? [5, 10] : tier === 2 ? [3, 5, 10] : [3, 4, 6])
        const ans = m * rng.int(Math.max(2, Math.ceil(lo / m)), Math.floor(hi / m))
        const decoys = pickNear(rng, ans, m * 2, n + 1, v => v % m !== 0 && v >= lo && v <= hi, lo).map(String)
        const { choices, answer } = shuffled(rng, String(ans), decoys, n)
        const prompt = [`Which number is a multiple of ${m}?`]
        return mathRiddle({ family: 'evenodd', skill: 'math: multiples', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metric + 4, grade, tier }, `multiple:${m}`)
      }
      // Sum parity as a real four-way choice. The old form offered "Neither" and "It could be
      // either", which can never be true of a fixed sum, so the item played as a coin flip.
      const wantEven = rng.bool()
      const mkSum = (even: boolean): string => {
        let a = 0, b = 0
        do { a = rng.int(10, 99); b = rng.int(10, 99) } while (((a + b) % 2 === 0) !== even)
        return `${a} + ${b}`
      }
      const { choices, answer } = shuffled(rng, mkSum(wantEven), Array.from({ length: n + 1 }, () => mkSum(!wantEven)), n)
      const prompt = [`Which sum is ${wantEven ? 'even' : 'odd'}?`]
      return mathRiddle({ family: 'evenodd', skill: 'math: even and odd', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metric + 8, grade, tier }, `parity:${wantEven ? 'even' : 'odd'}`)
    }

    if (grade === 4) {
      type M = 'multiple' | 'factor' | 'notFactor' | 'countFactors' | 'notMultiple'
      const modes: M[] = tier === 1 ? ['multiple', 'factor'] : tier === 2 ? ['multiple', 'factor', 'notFactor'] : ['multiple', 'factor', 'notFactor', 'countFactors', 'notMultiple']
      const mode = rng.pick(modes)
      if (mode === 'multiple' || mode === 'notMultiple') {
        const m = rng.pick(tier === 1 ? [2, 3, 4, 5] : tier === 2 ? [3, 4, 6, 7, 8, 9] : [6, 7, 8, 9, 11, 12])
        const k = rng.int(3, tier === 1 ? 12 : 15)
        if (mode === 'multiple') {
          const ans = m * k
          const decoys = pickNear(rng, ans, m, n + 1, v => v % m !== 0 && v > 0).map(String)
          const { choices, answer } = shuffled(rng, String(ans), decoys, n)
          const prompt = [`Which number is a multiple of ${m}?`]
          // Recalibrated: a two-digit "multiple of 5" no longer outscores the factor items.
          return mathRiddle({ family: 'evenodd', skill: 'math: multiples', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 38 + tier * 4 + m + k / 3, grade, tier }, `multiple:${m}`)
        }
        const ans = m * k + rng.int(1, m - 1)
        const decoys = pickNear(rng, ans, m * 3, n + 1, v => v % m === 0 && v > 0).map(String)
        const { choices, answer } = shuffled(rng, String(ans), decoys, n)
        const prompt = [`Which number is NOT a multiple of ${m}?`]
        return mathRiddle({ family: 'evenodd', skill: 'math: multiples', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 42 + tier * 4 + m + k / 3, grade, tier }, `notmultiple:${m}`)
      }
      const v = rng.pick(tier === 1 ? [15, 16, 18, 20, 21, 24, 27, 28, 30] : tier === 2 ? [24, 28, 32, 36, 40, 42, 45, 48, 50, 54] : [36, 42, 48, 54, 56, 60, 64, 72, 81, 90, 96, 100])
      if (mode === 'countFactors') {
        const c = factorCount(v)
        const decoys = numDecoys(rng, c, n - 1, [c + 1, c - 1, c + 2, Math.floor(c / 2), c * 2], 3, 1).map(String)
        const { choices, answer } = shuffled(rng, String(c), decoys, n)
        const prompt = [`How many factors does ${v} have?`]
        return mathRiddle({ family: 'evenodd', skill: 'math: factors', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 50 + tier * 4 + v / 5, grade, tier }, `factors:${v}`)
      }
      const want = mode === 'factor'
      const { ans, decoys } = factorChoices(rng, v, want)
      const { choices, answer } = shuffled(rng, String(ans), decoys, n)
      const prompt = [`Which number is ${want ? 'a factor' : 'NOT a factor'} of ${v}?`]
      return mathRiddle({ family: 'evenodd', skill: 'math: factors', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: (want ? 44 : 46) + tier * 4 + v / 5, grade, tier }, `${want ? '' : 'not'}factor:${v}`)
    }

    // grade 5 -- GCF and LCM (a grade-6 standard) stay out of the gentlest tier.
    type M = 'prime' | 'composite' | 'factor' | 'gcf' | 'lcm'
    const modes: M[] = tier === 1 ? ['prime', 'composite', 'factor'] : ['prime', 'composite', 'gcf', 'lcm']
    const mode = rng.pick(modes)
    const [lo, hi] = BAND[tier]
    if (mode === 'prime' || mode === 'composite') {
      const wantPrime = mode === 'prime'
      const answers = (wantPrime ? ODD_PRIMES : ODD_COMPOSITES).filter(x => x >= lo && x <= hi)
      const ans = rng.pick(answers)
      const pool = (wantPrime ? ODD_COMPOSITES : ODD_PRIMES).filter(x => x >= Math.min(lo, 9) && x <= hi && x !== ans)
      const decoys = nearestOf(rng, pool, ans, n + 1).map(String)
      const { choices, answer } = shuffled(rng, String(ans), decoys, n)
      const prompt = [`Which number is ${wantPrime ? 'prime' : 'composite'}?`]
      return mathRiddle({ family: 'evenodd', skill: 'math: prime numbers', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 58 + tier * 4, grade, tier }, wantPrime ? 'prime' : 'composite')
    }
    if (mode === 'factor') {
      const v = rng.pick([36, 42, 48, 54, 60, 72, 84, 90, 96, 100])
      const { ans, decoys } = factorChoices(rng, v, true)
      const { choices, answer } = shuffled(rng, String(ans), decoys, n)
      const prompt = [`Which number is a factor of ${v}?`]
      return mathRiddle({ family: 'evenodd', skill: 'math: factors', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 60 + tier * 4, grade, tier }, `factor:${v}`)
    }
    if (mode === 'gcf') {
      const g = rng.pick(tier === 2 ? [3, 4, 6, 7, 8, 9] : [4, 6, 8, 9, 12])
      const [m1, m2] = rng.sample(tier === 2 ? [2, 3, 4, 5, 6, 7, 8, 9] : [5, 6, 7, 8, 9, 10, 11, 12], 2)
      // Printed largest first, so "of 84 and 96" and "of 96 and 84" are one riddle rather than two.
      const a = g * Math.max(m1, m2), b = g * Math.min(m1, m2)
      const real = gcd(a, b)
      const decoys = numDecoys(rng, real, n - 1, [lcm(a, b) <= 999 ? lcm(a, b) : real + 1, b, real * 2, real / 2, real + 1, real - 1, a - b], 3, 1).map(String)
      const { choices, answer } = shuffled(rng, String(real), decoys, n)
      const prompt = [`What is the greatest common factor`, `of ${a} and ${b}?`]
      return mathRiddle({ family: 'evenodd', skill: 'math: greatest common factor', prompt, choices, answer, spoken: `What is the greatest common factor of ${a} and ${b}? ${sayChoices(choices)}?`, metric: 60 + tier * 4 + Math.log2(a), grade, tier }, `gcf:${a},${b}`)
    }
    const a = rng.int(tier === 2 ? 2 : 4, tier === 2 ? 9 : 12), b = rng.int(tier === 2 ? 2 : 4, tier === 2 ? 9 : 12)
    if (a === b || a % b === 0 || b % a === 0) return evenodd.make(grade, tier, rng)
    const L = lcm(a, b)
    // Nothing below the larger operand can be a common multiple, so 1 was an instantly-dropped decoy.
    const decoys = numDecoys(rng, L, n - 1, [a * b !== L ? a * b : L * 2, Math.max(a, b) * 2, L * 2, L + a, L - b, L + b], Math.max(3, Math.round(L / 4)), Math.max(a, b) + 1).map(String)
    const { choices, answer } = shuffled(rng, String(L), decoys, n)
    const prompt = [`What is the least common multiple`, `of ${Math.max(a, b)} and ${Math.min(a, b)}?`]
    return mathRiddle({ family: 'evenodd', skill: 'math: least common multiple', prompt, choices, answer, spoken: `What is the least common multiple of ${Math.max(a, b)} and ${Math.min(a, b)}? ${sayChoices(choices)}?`, metric: 62 + tier * 4 + Math.log2(L), grade, tier }, `lcm:${Math.max(a, b)},${Math.min(a, b)}`)
  },
}

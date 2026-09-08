import type { Generator } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys, gcd, lcm } from './mathutil'
import type { Rng } from '../../engine/rng'

const isPrime = (v: number): boolean => { if (v < 2) return false; for (let i = 2; i * i <= v; i++) if (v % i === 0) return false; return true }
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
      const max = grade === 2 ? (tier === 1 ? 20 : tier === 2 ? 100 : 999) : (tier === 1 ? 100 : tier === 2 ? 999 : 9999)
      type M = 'which' | 'next' | 'multiple' | 'sum'
      const modes: M[] = grade === 2 ? (tier === 1 ? ['which', 'which', 'next'] : ['which', 'next']) : (tier === 1 ? ['which', 'next', 'multiple'] : tier === 2 ? ['which', 'multiple', 'next'] : ['which', 'multiple', 'sum'])
      const mode = rng.pick(modes)
      const metric = (grade === 2 ? 10 : 24) + Math.log2(max) * 2
      if (mode === 'which') {
        const wantEven = rng.bool()
        const ans = pickNear(rng, rng.int(2, max - 1), 3, 1, v => (v % 2 === 0) === wantEven)[0]
        const decoys = pickNear(rng, ans, tier === 1 ? 6 : 40, n + 1, v => (v % 2 === 0) !== wantEven && v !== ans).map(String)
        const { choices, answer } = shuffled(rng, String(ans), decoys, n)
        const prompt = [rng.pick([`Which number is ${wantEven ? 'even' : 'odd'}?`, `Which of these is an ${wantEven ? 'even' : 'odd'} number?`])]
        return mathRiddle({ family: 'evenodd', skill: 'math: even and odd', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric, grade, tier }, `parity:${wantEven ? 'even' : 'odd'}`)
      }
      if (mode === 'next') {
        const wantEven = rng.bool()
        const from = rng.int(1, max - 4)
        const target = ((from + 1) % 2 === 0) === wantEven ? from + 1 : from + 2
        const decoys = numDecoys(rng, target, n - 1, [target + 1, target - 1, target + 2, from], 3, 0).map(String)
        const { choices, answer } = shuffled(rng, String(target), decoys, n)
        const prompt = [`What is the first ${wantEven ? 'even' : 'odd'} number`, `after ${from}?`]
        return mathRiddle({ family: 'evenodd', skill: 'math: even and odd', prompt, choices, answer, spoken: `What is the first ${wantEven ? 'even' : 'odd'} number after ${from}? ${sayChoices(choices)}?`, metric: metric + 2, grade, tier }, `nextparity:${wantEven ? 'even' : 'odd'},${from}`)
      }
      if (mode === 'multiple') {
        const m = rng.pick(tier === 1 ? [2, 5, 10] : [2, 5, 10, 3])
        const ans = m * rng.int(2, Math.floor(Math.min(max, 200) / m))
        const decoys = pickNear(rng, ans, m * 2, n + 1, v => v % m !== 0 && v > 0).map(String)
        const { choices, answer } = shuffled(rng, String(ans), decoys, n)
        const prompt = [`Which number is a multiple of ${m}?`]
        return mathRiddle({ family: 'evenodd', skill: 'math: multiples', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metric + 4, grade, tier }, `multiple:${m}`)
      }
      // sum parity: is a + b even or odd?
      const a = rng.int(10, 99), b = rng.int(10, 99)
      const even = (a + b) % 2 === 0
      const { choices, answer } = shuffled(rng, even ? 'even' : 'odd', [even ? 'odd' : 'even', 'It could be either', 'Neither'], n)
      const prompt = [`Is ${a} + ${b} even or odd?`]
      return mathRiddle({ family: 'evenodd', skill: 'math: even and odd', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metric + 6, grade, tier }, `sumparity:${a},${b}`)
    }

    if (grade === 4) {
      type M = 'multiple' | 'factor' | 'notFactor' | 'countFactors' | 'notMultiple'
      const modes: M[] = tier === 1 ? ['multiple', 'factor'] : tier === 2 ? ['multiple', 'factor', 'notFactor'] : ['multiple', 'factor', 'notFactor', 'countFactors', 'notMultiple']
      const mode = rng.pick(modes)
      if (mode === 'multiple' || mode === 'notMultiple') {
        const m = rng.pick(tier === 1 ? [2, 3, 4, 5] : tier === 2 ? [3, 4, 6, 7, 8, 9] : [6, 7, 8, 9, 11, 12])
        const k = rng.int(3, tier === 1 ? 9 : 12)
        if (mode === 'multiple') {
          const ans = m * k
          const decoys = pickNear(rng, ans, m, n + 1, v => v % m !== 0 && v > 0).map(String)
          const { choices, answer } = shuffled(rng, String(ans), decoys, n)
          const prompt = [`Which number is a multiple of ${m}?`]
          return mathRiddle({ family: 'evenodd', skill: 'math: multiples', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 44 + m * 2 + k, grade, tier }, `multiple:${m}`)
        }
        const ans = m * k + rng.int(1, m - 1)
        const decoys = pickNear(rng, ans, m * 3, n + 1, v => v % m === 0 && v > 0).map(String)
        const { choices, answer } = shuffled(rng, String(ans), decoys, n)
        const prompt = [`Which number is NOT a multiple of ${m}?`]
        return mathRiddle({ family: 'evenodd', skill: 'math: multiples', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 48 + m * 2 + k, grade, tier }, `notmultiple:${m}`)
      }
      const v = rng.pick(tier === 1 ? [12, 16, 18, 20, 24, 30] : tier === 2 ? [24, 28, 32, 36, 40, 42, 45, 48] : [36, 42, 48, 54, 56, 60, 64, 72, 81, 90, 100])
      if (mode === 'countFactors') {
        const c = factorCount(v)
        const decoys = numDecoys(rng, c, n - 1, [c + 1, c - 1, c + 2, Math.floor(c / 2), c * 2], 3, 1).map(String)
        const { choices, answer } = shuffled(rng, String(c), decoys, n)
        const prompt = [`How many factors does ${v} have?`]
        return mathRiddle({ family: 'evenodd', skill: 'math: factors', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 52 + v / 5, grade, tier }, `factors:${v}`)
      }
      const fs = factorsOf(v).filter(f => f > 1 && f < v)
      if (mode === 'factor') {
        const ans = rng.pick(fs)
        const decoys = pickNear(rng, ans, Math.max(4, Math.floor(v / 4)), n + 1, x => x > 1 && x < v && v % x !== 0).map(String)
        const { choices, answer } = shuffled(rng, String(ans), decoys, n)
        const prompt = [`Which number is a factor of ${v}?`]
        return mathRiddle({ family: 'evenodd', skill: 'math: factors', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 44 + v / 5, grade, tier }, `factor:${v}`)
      }
      const ans = pickNear(rng, Math.floor(v / 3), Math.floor(v / 3), 1, x => x > 1 && x < v && v % x !== 0, 2)[0]
      const decoys = rng.sample(fs, Math.min(fs.length, n + 1)).map(String)
      const { choices, answer } = shuffled(rng, String(ans), decoys, n)
      const prompt = [`Which number is NOT a factor of ${v}?`]
      return mathRiddle({ family: 'evenodd', skill: 'math: factors', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 48 + v / 5, grade, tier }, `notfactor:${v}`)
    }

    // grade 5
    type M = 'prime' | 'composite' | 'gcf' | 'lcm'
    const modes: M[] = tier === 1 ? ['prime', 'composite', 'gcf'] : ['prime', 'composite', 'gcf', 'lcm']
    const mode = rng.pick(modes)
    const max = tier === 1 ? 30 : tier === 2 ? 60 : 100
    if (mode === 'prime' || mode === 'composite') {
      const wantPrime = mode === 'prime'
      const ans = pickNear(rng, rng.int(4, max), 5, 1, v => isPrime(v) === wantPrime && v > 3)[0]
      const decoys = pickNear(rng, ans, tier === 1 ? 8 : 20, n + 1, v => isPrime(v) !== wantPrime && v > 3 && v !== ans).map(String)
      const { choices, answer } = shuffled(rng, String(ans), decoys, n)
      const prompt = [`Which number is ${wantPrime ? 'prime' : 'composite'}?`]
      return mathRiddle({ family: 'evenodd', skill: 'math: prime numbers', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 60 + Math.log2(max) * 2, grade, tier }, wantPrime ? 'prime' : 'composite')
    }
    if (mode === 'gcf') {
      const g = rng.pick(tier === 1 ? [2, 3, 4, 5, 6] : [3, 4, 6, 7, 8, 9, 12])
      let a = g * rng.int(2, tier === 1 ? 5 : 9), b = g * rng.int(2, tier === 1 ? 5 : 9)
      if (a === b) b = a + g
      const real = gcd(a, b)
      const decoys = numDecoys(rng, real, n - 1, [lcm(a, b) <= 999 ? lcm(a, b) : real + 1, Math.min(a, b), real * 2, real / 2, real + 1, real - 1, Math.abs(a - b)], 3, 1).map(String)
      const { choices, answer } = shuffled(rng, String(real), decoys, n)
      const prompt = [`What is the greatest common factor`, `of ${a} and ${b}?`]
      return mathRiddle({ family: 'evenodd', skill: 'math: greatest common factor', prompt, choices, answer, spoken: `What is the greatest common factor of ${a} and ${b}? ${sayChoices(choices)}?`, metric: 62 + Math.log2(Math.max(a, b)) * 2, grade, tier }, `gcf:${a},${b}`)
    }
    const a = rng.int(2, tier === 2 ? 9 : 12), b = rng.int(2, tier === 2 ? 9 : 12)
    if (a === b || a % b === 0 || b % a === 0) return evenodd.make(grade, tier, rng)
    const L = lcm(a, b)
    const decoys = numDecoys(rng, L, n - 1, [a * b !== L ? a * b : L * 2, gcd(a, b) !== L ? gcd(a, b) : L + 1, Math.max(a, b), L * 2, L + a, L - b], Math.max(3, Math.round(L / 4)), 1).map(String)
    const { choices, answer } = shuffled(rng, String(L), decoys, n)
    const prompt = [`What is the least common multiple`, `of ${a} and ${b}?`]
    return mathRiddle({ family: 'evenodd', skill: 'math: least common multiple', prompt, choices, answer, spoken: `What is the least common multiple of ${a} and ${b}? ${sayChoices(choices)}?`, metric: 64 + Math.log2(L) * 2, grade, tier }, `lcm:${a},${b}`)
  },
}

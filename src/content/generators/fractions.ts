import type { Generator, Choice } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys, fracStr, fracWord, gcd, lcm, NAMES } from './mathutil'
import type { Rng } from '../../engine/rng'

const fvis = (parts: number, shaded: number, shape: 'circle' | 'bar'): Choice => ({ visual: { kind: 'fraction', shape, parts, shaded } })
/** Canonical value of shaded/parts, so 2/4 and 1/2 (and 3/3 and 4/4) collapse to one key. */
const vkey = (s: number, d: number): string => { const g = gcd(s, d) || 1; return `${s / g}/${d / g}` }
/**
 * Fraction visuals whose *value* differs from num/den and from each other, so two decoys are never
 * worth the same (4/4 and 3/3 are both one whole). The first decoy is always cut into the same
 * number of parts as the answer when one exists, otherwise counting the parts solves the item
 * without ever reading the numerator. `allowEmpty` admits a 0-shaded picture; it stays off wherever
 * "Which shape is cut into halves?" items exist, because there an empty shape is a defensible answer.
 */
function visualDecoys(rng: Rng, num: number, den: number, count: number, shape: 'circle' | 'bar', dens: number[], allowEmpty = false): Choice[] {
  const ansKey = vkey(num, den)
  const seen = new Set<string>([ansKey])
  const cands: [number, number][] = []
  for (const d of dens) for (let s = 0; s <= d; s++) if (vkey(s, d) !== ansKey) cands.push([d, s])
  const same = rng.shuffle(cands.filter(([d, s]) => d === den && s > 0))
  const rest = rng.shuffle(cands.filter(([d, s]) => !(d === den && s > 0)))
  const out: Choice[] = []
  for (const [d, s] of [...same.slice(0, 1), ...rest, ...same.slice(1)]) {
    if (s === 0 && !allowEmpty) continue
    const k = vkey(s, d)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(fvis(d, s, shape))
    if (out.length >= count) break
  }
  return out
}
/** Text fraction decoys with values different from num/den (not equivalent) and from each other. */
function textDecoys(rng: Rng, num: number, den: number, count: number, preferred: [number, number][], dens: number[], proper = true): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const push = (a: number, b: number) => {
    if (b <= 0 || a <= 0 || a * den === num * b) return
    if (proper && a >= b) return
    const t = fracStr(a, b)
    if (seen.has(t)) return
    seen.add(t); out.push(t)
  }
  for (const [a, b] of preferred) push(a, b)
  let tries = 0
  while (out.length < count && tries++ < 200) { const b = rng.pick(dens); push(rng.int(1, b + 1), b) }
  return rng.shuffle(out).slice(0, Math.max(count, out.length))
}
/** Fraction words (one half, three fourths) drawn from `dens`, one per distinct value. */
function wordChoices(dens: number[]): { word: string; num: number; den: number }[] {
  const seen = new Set<string>()
  const out: { word: string; num: number; den: number }[] = []
  for (const d of dens) for (let s = 1; s < d; s++) {
    const k = vkey(s, d)
    if (seen.has(k)) continue
    seen.add(k)
    out.push({ word: fracWord(s, d), num: s, den: d })
  }
  return out
}

/** Halves and quarters (K-1), naming fractions (2), unit fractions and number lines (3), equivalence and like denominators (4), unlike denominators and mixed numbers (5). */
export const fractions: Generator = {
  id: 'fractions',
  name: 'Fractions',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 0.8, 1: 1, 2: 1.2, 3: 1.3, 4: 1.4, 5: 1.4 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const shape = rng.pick(['circle', 'bar'] as const)

    if (grade === 0) {
      // Kindergarten stays entirely in pictures: no written fraction names and no thirds.
      const dens = tier === 1 ? [2] : [2, 4]
      const den = rng.pick(dens)
      const num = 1
      const mode = rng.pick(['which', 'equal'])
      if (mode === 'equal') {
        const decoys = rng.shuffle([3, 5, 6, 8].filter(d => d !== den).map(d => fvis(d, 0, shape)))
        const { choices, answer } = shuffled(rng, fvis(den, 0, shape), decoys, n)
        const prompt = [`Which shape is cut into ${den === 2 ? 'halves' : 'fourths'}?`]
        return mathRiddle({ family: 'fractions', skill: 'math: halves and quarters', prompt, choices, answer, spoken: `${prompt[0]} Look at the pictures and pick one.`, metric: 5 + den + tier, grade, tier }, '')
      }
      const decoys = visualDecoys(rng, num, den, n + 2, shape, [2, 4])
      const { choices, answer } = shuffled(rng, fvis(den, num, shape), decoys, n)
      const prompt = [`Which picture has ${fracWord(num, den)} colored?`]
      return mathRiddle({ family: 'fractions', skill: 'math: halves and quarters', prompt, choices, answer, spoken: `${prompt[0]} Look at the pictures and pick one.`, metric: 4 + den + num + tier, grade, tier }, `num:${num}/${den}`)
    }

    if (grade === 1) {
      // Grade 1 partitions into halves and fourths and names them in words; a/b starts at grade 2.
      const dens = tier === 1 ? [2] : tier === 2 ? [2, 4] : [4]
      const den = rng.pick(dens)
      const num = rng.pick(Array.from({ length: den - 1 }, (_, i) => i + 1).filter(s => gcd(s, den) === 1))
      const mode = rng.pick(tier === 3 ? ['which', 'name'] : ['which', 'name', 'equal'])
      const word = fracWord(num, den)
      if (mode === 'equal') {
        const decoys = rng.shuffle([3, 5, 6, 8].filter(d => d !== den).map(d => fvis(d, 0, shape)))
        const { choices, answer } = shuffled(rng, fvis(den, 0, shape), decoys, n)
        const prompt = [`Which shape is cut into ${den === 2 ? 'halves' : 'fourths'}?`]
        return mathRiddle({ family: 'fractions', skill: 'math: halves and quarters', prompt, choices, answer, spoken: `${prompt[0]} Look at the pictures and pick one.`, metric: 5 + den + tier * 2, grade, tier }, '')
      }
      if (mode === 'which') {
        const decoys = visualDecoys(rng, num, den, n + 2, shape, [2, 4])
        const { choices, answer } = shuffled(rng, fvis(den, num, shape), decoys, n)
        const prompt = [`Which picture has ${word} colored?`]
        return mathRiddle({ family: 'fractions', skill: 'math: halves and quarters', prompt, choices, answer, spoken: `${prompt[0]} Look at the pictures and pick one.`, metric: 4 + den + num + tier * 2, grade, tier }, `num:${num}/${den}`)
      }
      // Picture -> words. One choice per distinct value, so "two fourths" never sits beside "one half".
      const pool = wordChoices([2, 4]).filter(w => w.num * den !== num * w.den)
      const { choices, answer } = shuffled(rng, word, rng.shuffle(pool.map(w => w.word)), n)
      const prompt = ['What part of the shape is colored?']
      return mathRiddle({ family: 'fractions', skill: 'math: halves and quarters', prompt, visual: { kind: 'fraction', shape, parts: den, shaded: num }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 6 + den + num + tier * 2, grade, tier }, '')
    }

    if (grade === 2) {
      const dens = tier === 1 ? [3, 4] : tier === 2 ? [3, 4, 6] : [4, 6, 8]
      const den = rng.pick(dens)
      // Both "shaded" (num) and "not shaded" (den - num) are already in lowest terms, so the child is
      // never silently asked to simplify (a grade-4 skill) to reach the only offered answer.
      const num = rng.pick(Array.from({ length: den - 1 }, (_, i) => i + 1).filter(s => gcd(s, den) === 1))
      const mode = rng.pick(tier === 1 ? ['shaded', 'which'] : ['shaded', 'which', 'unshaded'])
      if (mode === 'which') {
        const decoys = visualDecoys(rng, num, den, n + 2, shape, dens, true)
        const { choices, answer } = shuffled(rng, fvis(den, num, shape), decoys, n)
        const prompt = [`Which picture shows ${fracStr(num, den)}?`]
        return mathRiddle({ family: 'fractions', skill: 'math: naming fractions', prompt, choices, answer, spoken: `Which picture shows ${fracWord(num, den)}? Look at the pictures and pick one.`, metric: 16 + den + num + tier * 2, grade, tier }, `num:${num}/${den}`)
      }
      const target = mode === 'shaded' ? num : den - num
      const decoys = textDecoys(rng, target, den, n + 2, [[den - target, den], [den, target], [target, den + 1], [target + 1, den], [target, den - 1]], dens)
      const { choices, answer } = shuffled(rng, fracStr(target, den), decoys, n)
      const prompt = [mode === 'shaded' ? 'What fraction is shaded?' : 'What fraction is NOT shaded?']
      return mathRiddle({ family: 'fractions', skill: 'math: naming fractions', prompt, visual: { kind: 'fraction', shape, parts: den, shaded: num }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 16 + den + tier * 2 + (mode === 'unshaded' ? 4 : 0), grade, tier }, `num:${target}/${den}`)
    }

    if (grade === 3) {
      // "equal to 1 whole" is the easiest item in the grade, so it stays in tier 1.
      const mode = rng.pick(tier === 1 ? ['unit', 'line', 'whole'] : ['unit', 'line', 'sameNum'])
      if (mode === 'unit') {
        const pool = tier === 1 ? [2, 3, 4, 5, 6] : tier === 2 ? [2, 3, 4, 5, 6, 8, 10] : [3, 4, 5, 6, 8, 10, 12]
        const dens = rng.sample(pool, n)
        const most = rng.bool()
        const target = most ? Math.min(...dens) : Math.max(...dens)
        const { choices, answer } = shuffled(rng, `1/${target}`, dens.filter(d => d !== target).map(d => `1/${d}`), n)
        const prompt = [`Which fraction is the ${most ? 'biggest' : 'smallest'}?`]
        return mathRiddle({ family: 'fractions', skill: 'math: comparing fractions', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 34 + tier + Math.max(...dens) / 2, grade, tier }, most ? 'max' : 'min')
      }
      if (mode === 'sameNum') {
        const num = rng.int(2, 5)
        const dens = rng.sample([3, 4, 5, 6, 7, 8, 9, 10, 12].filter(d => d > num), n)
        const most = rng.bool()
        const target = most ? Math.min(...dens) : Math.max(...dens)
        const { choices, answer } = shuffled(rng, `${num}/${target}`, dens.filter(d => d !== target).map(d => `${num}/${d}`), n)
        const prompt = [`Which fraction is the ${most ? 'biggest' : 'smallest'}?`]
        return mathRiddle({ family: 'fractions', skill: 'math: comparing fractions', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 38 + tier + num, grade, tier }, most ? 'max' : 'min')
      }
      if (mode === 'whole') {
        const den = rng.pick([2, 3, 4, 5, 6, 8])
        const decoys = textDecoys(rng, den, den, n + 2, [[1, den], [den - 1, den], [den, den + 1], [den + 1, den]], [den, den + 1, den + 2, den * 2])
        const { choices, answer } = shuffled(rng, `${den}/${den}`, decoys.filter(d => d !== '1'), n)
        const prompt = ['Which fraction is equal to 1 whole?']
        return mathRiddle({ family: 'fractions', skill: 'math: fractions', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 34 + tier, grade, tier }, `num:1`)
      }
      // Number line: the tick spacing always matches the answer's denominator, so the fraction the
      // child counts off the line is the fraction that is offered.
      const den = rng.pick(tier === 1 ? [2, 3, 4] : tier === 2 ? [3, 4, 5, 6] : [5, 6, 8, 10, 12])
      const num = rng.pick(Array.from({ length: den - 1 }, (_, i) => i + 1).filter(s => gcd(s, den) === 1))
      const decoys = textDecoys(rng, num, den, n + 2, [[num + 1, den], [num - 1, den], [num, den + 1], [den - num, den], [num, den - 1]], [den, den + 1, den * 2])
      const { choices, answer } = shuffled(rng, fracStr(num, den), decoys, n)
      const prompt = ['What fraction is marked on the', 'number line?']
      return mathRiddle({ family: 'fractions', skill: 'math: fractions on a number line', prompt, visual: { kind: 'numberline', from: 0, to: 1, mark: num / den, step: 1 / den }, choices, answer, spoken: `What fraction is marked on the number line? ${sayChoices(choices)}?`, metric: 34 + tier + den, grade, tier }, `num:${num}/${den}`)
    }

    if (grade === 4) {
      const mode = rng.pick(tier === 1 ? ['equiv', 'addLike'] : tier === 2 ? ['equiv', 'addLike', 'subLike', 'missingEquiv'] : ['equiv', 'addLike', 'subLike', 'simplify', 'missingEquiv'])
      if (mode === 'equiv' || mode === 'missingEquiv') {
        const den = rng.pick([2, 3, 4, 5, 6])
        const num = rng.int(1, den - 1)
        const k = rng.int(2, tier === 1 ? 3 : 5)
        if (gcd(num, den) !== 1) return fractions.make(grade, tier, rng)
        if (mode === 'missingEquiv') {
          const decoys = numDecoys(rng, num * k, n - 1, [num + k, num * (k - 1), num * (k + 1), num, den * k - num], 3, 1).map(String)
          const { choices, answer } = shuffled(rng, String(num * k), decoys, n)
          const prompt = [`${num}/${den} = ?/${den * k}`, 'What is the missing number?']
          return mathRiddle({ family: 'fractions', skill: 'math: equivalent fractions', prompt, choices, answer, spoken: `${num} over ${den} equals what over ${den * k}? ${sayChoices(choices)}?`, metric: 52 + k * 2, grade, tier }, `num:${num}*${k}`)
        }
        // Decoys keep the answer's term sizes: otherwise 15/18 is the only two-digit choice and is
        // identifiable by shape alone.
        const ans = `${num * k}/${den * k}`
        const raw: [number, number][] = [[num * k + 1, den * k], [num * k - 1, den * k], [num * k, den * k + 1], [num * k, den * k - 1], [(num + 1) * k, den * k], [num * k, den * (k + 1)], [num * (k + 1), den * k]]
        const decoys: string[] = []
        for (const [a, b] of rng.shuffle(raw)) {
          if (a <= 0 || b <= 0 || a >= b || a * den === num * b) continue
          if (decoys.some(d => { const [x, y] = d.split('/').map(Number); return x * b === a * y })) continue
          decoys.push(`${a}/${b}`)
        }
        const { choices, answer } = shuffled(rng, ans, decoys, n)
        const prompt = [`Which fraction is equivalent to ${num}/${den}?`]
        return mathRiddle({ family: 'fractions', skill: 'math: equivalent fractions', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 50 + k * 2 + den, grade, tier }, `num:${num}/${den}`)
      }
      if (mode === 'simplify') {
        const den = rng.pick([2, 3, 4, 5]), num = rng.int(1, den - 1), k = rng.int(2, 6)
        if (gcd(num, den) !== 1) return fractions.make(grade, tier, rng)
        const decoys = textDecoys(rng, num, den, n + 2, [[num * k, den * k - k], [num, den + 1], [num + 1, den], [num * k - 1, den * k], [num, den * 2]], [den + 1, den + 2, den * 2, 7]).filter(d => d !== `${num}/${den}`)
        const { choices, answer } = shuffled(rng, `${num}/${den}`, decoys, n)
        const prompt = [`What is ${num * k}/${den * k} in simplest form?`]
        return mathRiddle({ family: 'fractions', skill: 'math: simplifying fractions', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 58 + k, grade, tier }, `num:${num * k}/${den * k}`)
      }
      // add / subtract like denominators
      const den = rng.pick(tier === 1 ? [3, 4, 5, 6, 8] : [5, 6, 7, 8, 9, 10, 12])
      let a = rng.int(1, den - 1), b = rng.int(1, den - 1)
      const add = mode === 'addLike'
      if (add && a + b >= den) { a = rng.int(1, Math.floor(den / 2)); b = rng.int(1, den - 1 - a) }
      if (!add && a <= b) { if (a === b) a = b + 1; else [a, b] = [b, a] }
      if (!add && a >= den) return fractions.make(grade, tier, rng)
      const r = add ? a + b : a - b
      if (tier < 3 && gcd(r, den) !== 1) return fractions.make(grade, tier, rng)
      const ans = fracStr(r, den)
      const decoys = textDecoys(rng, r, den, n + 2, [[r, den * 2], [add ? a - b : a + b, den], [r + 1, den], [r - 1, den], [a * b, den]], [den, den * 2]).filter(d => d !== ans)
      const { choices, answer } = shuffled(rng, ans, decoys, n)
      const prompt = [`${a}/${den} ${add ? '+' : '-'} ${b}/${den} = ?`, ...(gcd(r, den) !== 1 ? ['(Give the answer in simplest form.)'] : [])]
      return mathRiddle({ family: 'fractions', skill: add ? 'math: adding fractions' : 'math: subtracting fractions', prompt, choices, answer, spoken: `What is ${a}/${den} ${add ? 'plus' : 'minus'} ${b}/${den}? ${sayChoices(choices)}?`, metric: 50 + den + (gcd(r, den) !== 1 ? 4 : 0), grade, tier }, `num:${a}/${den}${add ? '+' : '-'}${b}/${den}`)
    }

    // grade 5 -- "fraction of a number" is the gentlest item here, so it stays in tier 1.
    const mode = rng.pick(tier === 1 ? ['addUnlike', 'ofNumber', 'subUnlike'] : tier === 2 ? ['addUnlike', 'subUnlike', 'mixedAdd', 'mixedSub'] : ['addUnlike', 'subUnlike', 'mixedAdd', 'mixedSub'])
    if (mode === 'ofNumber') {
      const den = rng.pick([2, 3, 4, 5])
      const num = rng.pick(Array.from({ length: den - 1 }, (_, i) => i + 1).filter(x => gcd(x, den) === 1))
      const whole = den * rng.int(2, 6)
      const ans = whole * num / den
      // Nothing above the starting amount can be part of it, so those decoys go on sight.
      const decoys = numDecoys(rng, ans, n - 1, [whole - ans, whole / den, whole * (num + 1) / den, whole * (num - 1) / den, ans + den, ans - den], Math.max(3, ans / 4), 1, whole).map(String)
      const { choices, answer } = shuffled(rng, String(ans), decoys, n)
      const name = rng.pick(NAMES)
      const thing = rng.pick(['marbles', 'stickers', 'cards', 'coins', 'shells', 'beads'])
      const prompt = rng.bool() ? [`What is ${num}/${den} of ${whole}?`] : [`${name} has ${whole} ${thing} and gives away`, `${num}/${den} of them. How many are given away?`]
      return mathRiddle({ family: 'fractions', skill: 'math: fraction of a number', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 66 + den + whole / 10, grade, tier }, `num:${whole}*${num}/${den}`)
    }
    if (mode === 'addUnlike' || mode === 'subUnlike') {
      // The denominator pairs are banded by their common denominator, so tier 3 owns the thirtieths
      // and tier 1 keeps the pairs where one denominator divides the other.
      const pairs: [number, number][] = tier === 1
        ? [[2, 4], [3, 6], [2, 6], [4, 8], [2, 8], [5, 10]]
        : tier === 2 ? [[2, 3], [2, 5], [3, 4], [4, 6], [3, 9], [6, 8]]
          : [[3, 5], [4, 5], [5, 6], [3, 8], [4, 10], [6, 10], [5, 8]]
      const [d1, d2] = rng.shuffle(rng.pick(pairs))
      const add = mode === 'addUnlike'
      const L = lcm(d1, d2)
      const a = rng.int(1, d1 - 1), b = rng.int(1, d2 - 1)
      if (gcd(a, d1) !== 1 || gcd(b, d2) !== 1) return fractions.make(grade, tier, rng)
      const rn = add ? a * (L / d1) + b * (L / d2) : a * (L / d1) - b * (L / d2)
      if (!add && rn <= 0) return fractions.make(grade, tier, rng)
      if (add && rn >= L && tier === 1) return fractions.make(grade, tier, rng)
      const ans = fracStr(rn, L)
      const decoys = textDecoys(rng, rn, L, n + 2, [[add ? a + b : a - b, d1 + d2], [add ? a + b : Math.abs(a - b), Math.max(d1, d2)], [rn + 1, L], [rn - 1, L], [add ? a + b : a - b, L]], [L, d1 + d2, L * 2], rn < L).filter(d => d !== ans)
      const { choices, answer } = shuffled(rng, ans, decoys, n)
      const prompt = [`${a}/${d1} ${add ? '+' : '-'} ${b}/${d2} = ?`]
      return mathRiddle({ family: 'fractions', skill: add ? 'math: adding fractions' : 'math: subtracting fractions', prompt, choices, answer, spoken: `What is ${a}/${d1} ${add ? 'plus' : 'minus'} ${b}/${d2}? ${sayChoices(choices)}?`, metric: 62 + L + tier * 2, grade, tier }, `num:${a}/${d1}${add ? '+' : '-'}${b}/${d2}`)
    }
    // mixed numbers
    const add = mode === 'mixedAdd'
    const pairs: [number, number][] = tier === 2 ? [[2, 2], [4, 4], [2, 4], [3, 3], [3, 6]] : [[2, 3], [3, 4], [4, 8], [2, 5], [3, 6], [4, 6], [2, 8]]
    const [d1, d2] = rng.shuffle(rng.pick(pairs))
    const L = lcm(d1, d2)
    const w1 = rng.int(1, 5), w2 = rng.int(1, 4)
    const a = rng.int(1, d1 - 1), b = rng.int(1, d2 - 1)
    if (gcd(a, d1) !== 1 || gcd(b, d2) !== 1) return fractions.make(grade, tier, rng)
    const v1 = w1 * L + a * (L / d1), v2 = w2 * L + b * (L / d2)
    if (!add && v1 <= v2) return fractions.make(grade, tier, rng)
    const rn = add ? v1 + v2 : v1 - v2
    const ans = fracStr(rn, L)
    const mixed = (w: number, x: number, d: number) => `${w} ${x}/${d}`
    const wrongWhole = add ? (w1 + w2) * L + Math.abs(a * (L / d1) - b * (L / d2)) : (w1 - w2) * L + Math.abs(a * (L / d1) - b * (L / d2))
    const decoys = textDecoys(rng, rn, L, n + 2, [[wrongWhole, L], [rn + L, L], [rn - L, L], [rn + 1, L], [rn - 1, L], [add ? (w1 + w2) * (d1 + d2) + a + b : 1, d1 + d2]], [L, L * 2], false).filter(d => d !== ans)
    const { choices, answer } = shuffled(rng, ans, decoys, n)
    const prompt = [`${mixed(w1, a, d1)} ${add ? '+' : '-'} ${mixed(w2, b, d2)} = ?`]
    return mathRiddle({ family: 'fractions', skill: 'math: mixed numbers', prompt, choices, answer, spoken: `What is ${w1} and ${a}/${d1} ${add ? 'plus' : 'minus'} ${w2} and ${b}/${d2}? ${sayChoices(choices)}?`, metric: 66 + L + tier * 2 + (add ? 0 : 4), grade, tier }, `num:${w1}+${a}/${d1}${add ? '+' : '-'}(${w2}+${b}/${d2})`)
  },
}

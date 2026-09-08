import type { Generator, Choice, CounterItem } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, fmtDec, fmtInt, gcd, COUNTER_ITEMS, plural } from './mathutil'
import type { Rng } from '../../engine/rng'

/** k distinct integers in [lo, hi]; when `share` > 0 they share that many leading digits (harder). */
function closeNumbers(rng: Rng, k: number, lo: number, hi: number, share: number): number[] {
  const set = new Set<number>()
  if (share > 0) {
    const digits = String(hi).length
    const p = Math.pow(10, digits - share)
    const prefix = Math.floor(rng.int(lo, hi) / p) * p
    let tries = 0
    while (set.size < k && tries++ < 100) { const v = prefix + rng.int(0, p - 1); if (v >= lo && v <= hi) set.add(v) }
  }
  let tries = 0
  while (set.size < k && tries++ < 300) set.add(rng.int(lo, hi))
  let v = lo
  while (set.size < k && v <= hi) set.add(v++)
  return rng.shuffle([...set])
}

/** Decimal shown with its natural number of places (0.50 -> "0.5"), min 1 place. */
const natDec = (units: number, places: number): string => {
  let s = fmtDec(units, places)
  while (s.endsWith('0') && !s.endsWith('.0')) s = s.slice(0, -1)
  return s
}

const FRACS: [number, number][] = []
for (let d = 2; d <= 10; d++) for (let a = 1; a < d; a++) if (gcd(a, d) === 1) FRACS.push([a, d])
/** Every entry is in lowest terms, so no two entries share a value. */
const FRAC_SORTED = [...FRACS].sort((p, q) => p[0] / p[1] - q[0] / q[1])
const fval = (f: [number, number]) => f[0] / f[1]
const fracText = (f: [number, number]) => `${f[0]}/${f[1]}`

/**
 * (target, runner-up) index pairs in `FRAC_SORTED` whose value gap lies in [minGap, maxGap] and
 * that leave `rest` further-away fractions on the far side of the runner-up. Cached per band.
 */
const fracBands = new Map<string, [number, number][]>()
function fracBand(most: boolean, rest: number, minGap: number, maxGap: number): [number, number][] {
  const key = `${most}|${rest}|${minGap}|${maxGap}`
  const hit = fracBands.get(key)
  if (hit) return hit
  const V = FRAC_SORTED.map(fval)
  const out: [number, number][] = []
  for (let i = 0; i < V.length; i++) {
    for (let j = 0; j < V.length; j++) {
      if (i === j) continue
      const g = Math.abs(V[i] - V[j])
      if (g < minGap || g > maxGap) continue
      if (most ? (j < i && j >= rest) : (j > i && V.length - 1 - j >= rest)) out.push([i, j])
    }
  }
  fracBands.set(key, out)
  return out
}

/**
 * Rejects sets that hand the answer over on looks alone: everything sharing one numerator (that is
 * the tier-2 skill, not this one), and sets where the answer is the only fraction of its kind
 * ("1/7, 1/9, 1/8 and 3/10" answers itself). `idxs[0]` is the answer.
 */
function variedFracs(idxs: number[]): boolean {
  const odd = (vals: number[]) => new Set(vals).size < 2 || (new Set(vals).size === 2 && vals.filter(v => v === vals[0]).length === 1)
  return !odd(idxs.map(k => FRAC_SORTED[k][0])) && !odd(idxs.map(k => FRAC_SORTED[k][1]))
}

/**
 * `n` distinct fractions where the greatest (or least) beats its nearest rival by a gap inside
 * [minGap, maxGap]. That gap is what makes the comparison easy or hard, so tiers gate on it.
 */
function fracSet(rng: Rng, n: number, most: boolean, minGap: number, maxGap: number): { answer: string; decoys: string[]; gap: number } {
  const cands = fracBand(most, n - 2, minGap, maxGap)
  // Fillers sit on the far side of the runner-up, but near it, so no choice is a throwaway.
  const window = 12
  let idxs: number[] | null = null
  for (let attempt = 0; attempt < 30 && cands.length; attempt++) {
    const [i, j] = rng.pick(cands)
    const pool = most ? Array.from({ length: Math.min(j, window) }, (_, k) => j - 1 - k)
      : Array.from({ length: Math.min(FRAC_SORTED.length - 1 - j, window) }, (_, k) => j + 1 + k)
    const tryIdxs = [i, j, ...rng.sample(pool, n - 2)]
    if (!idxs) idxs = tryIdxs
    if (variedFracs(tryIdxs)) { idxs = tryIdxs; break }
  }
  if (!idxs) {
    const all = rng.sample(Array.from({ length: FRAC_SORTED.length }, (_, k) => k), n)
    const vs = all.map(k => fval(FRAC_SORTED[k]))
    const ti = vs.indexOf(most ? Math.max(...vs) : Math.min(...vs))
    idxs = [all[ti], ...all.filter((_, k) => k !== ti)]
  }
  const tv = fval(FRAC_SORTED[idxs[0]])
  const gap = Math.min(...idxs.slice(1).map(k => Math.abs(fval(FRAC_SORTED[k]) - tv)))
  return { answer: fracText(FRAC_SORTED[idxs[0]]), decoys: idxs.slice(1).map(k => fracText(FRAC_SORTED[k])), gap }
}

/** Comparing two fractions is hard in proportion to how close they are. */
const gapMetric = (gap: number) => 78 + Math.min(30, 1.6 / Math.max(gap, 0.01))

export const compare: Generator = {
  id: 'compare',
  name: 'Comparing numbers',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 2, 1: 1.5, 2: 1.2, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    type Mode = 'groups' | 'biggest' | 'smallest' | 'between' | 'stmt' | 'fracLike' | 'decimal' | 'fracUnlike' | 'order'
    const table: Record<number, Mode[][]> = {
      // 'groups' (counting two pictured piles) is a K skill, so grade 1 starts at numerals.
      0: [['groups', 'groups', 'biggest'], ['groups', 'biggest', 'smallest'], ['groups', 'biggest', 'smallest', 'between']],
      1: [['biggest', 'smallest'], ['biggest', 'smallest', 'between'], ['biggest', 'smallest', 'between']],
      2: [['biggest', 'smallest', 'between'], ['biggest', 'smallest', 'between'], ['biggest', 'smallest', 'between', 'stmt']],
      3: [['biggest', 'smallest', 'stmt'], ['biggest', 'smallest', 'stmt', 'between'], ['biggest', 'smallest', 'stmt', 'between']],
      4: [['fracLike', 'decimal'], ['fracLike', 'decimal', 'stmt'], ['fracLike', 'decimal', 'stmt']],
      5: [['fracUnlike', 'decimal', 'order'], ['fracUnlike', 'decimal', 'order', 'stmt'], ['fracUnlike', 'decimal', 'order', 'stmt']],
    }
    const mode = rng.pick(table[grade][tier - 1])

    if (mode === 'groups') {
      const max = grade === 0 ? (tier === 1 ? 5 : tier === 2 ? 8 : 10) : 12
      const counts = rng.sample(Array.from({ length: max }, (_, i) => i + 1), n)
      const item: CounterItem = rng.pick(COUNTER_ITEMS)
      const most = tier === 1 && grade === 0 ? true : rng.bool(0.6)
      const target = most ? Math.max(...counts) : Math.min(...counts)
      const answerC: Choice = { visual: { kind: 'counters', item, count: target } }
      const decoys: Choice[] = counts.filter(c => c !== target).map(c => ({ visual: { kind: 'counters', item, count: c } }))
      const { choices, answer } = shuffled(rng, answerC, decoys, n)
      const word = most ? 'the most' : 'the fewest'
      const prompt = [`Which group has ${word} ${plural(item, 2)}?`]
      return mathRiddle({
        family: 'compare', skill: 'math: more and fewer', prompt, choices, answer,
        spoken: `${prompt[0]} Look at the pictures and pick one.`, metric: Math.max(...counts), grade, tier,
      }, most ? 'max' : 'min')
    }

    if (mode === 'biggest' || mode === 'smallest' || mode === 'between') {
      // Grade 2 tier 1 starts on *close* two-digit numbers so it is not easier than grade 1 tier 3.
      const range: [number, number, number] = grade === 0 ? (tier === 1 ? [1, 5, 0] : tier === 2 ? [1, 10, 0] : [1, 20, 0])
        : grade === 1 ? (tier === 1 ? [1, 20, 0] : tier === 2 ? [10, 50, 0] : [10, 99, 1])
          : grade === 2 ? (tier === 1 ? [10, 99, 1] : tier === 2 ? [100, 499, 0] : [100, 999, 1])
            : (tier === 1 ? [1000, 4999, 0] : tier === 2 ? [1000, 9999, 1] : [1000, 9999, 2])
      const [lo, hi, share] = range
      const fmt = (v: number) => grade >= 3 ? fmtInt(v) : String(v)
      const metric = 10 + Math.log2(hi) * 3 + share * 2
      if (mode === 'between') {
        // Pick two bounds and one number strictly inside. Children hear "between 1 and 10" used
        // inclusively all the time, so no decoy may be an endpoint or sit right beside one.
        const span = Math.max(4, Math.floor((hi - lo) / 6))
        const a = rng.int(lo, hi - span)
        const b = a + span
        const inside = rng.int(a + 1, b - 1)
        const lowHi = a - 2, lowLo = Math.max(0, a - span - 2)
        const highLo = b + 2, highHi = b + span + 2
        const outs = new Set<number>()
        let tries = 0
        while (outs.size < n + 2 && tries++ < 300) {
          const useLow = lowHi >= lowLo && rng.bool()
          const v = useLow ? rng.int(lowLo, lowHi) : rng.int(highLo, highHi)
          if (v <= lowHi || v >= highLo) outs.add(v)
        }
        for (let k = 0; outs.size < n + 2 && k < 200; k++) {
          if (lowHi - k >= 0) outs.add(lowHi - k)
          outs.add(highLo + k)
        }
        const { choices, answer } = shuffled(rng, fmt(inside), rng.shuffle([...outs]).map(fmt), n)
        const prompt = [`Which number is between ${fmt(a)} and ${fmt(b)}?`]
        return mathRiddle({ family: 'compare', skill: 'math: comparing numbers', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metric + 2, grade, tier }, `between:${a},${b}`)
      }
      const nums = closeNumbers(rng, n, lo, hi, share)
      const target = mode === 'biggest' ? Math.max(...nums) : Math.min(...nums)
      const { choices, answer } = shuffled(rng, fmt(target), nums.filter(v => v !== target).map(fmt), n)
      const big = grade === 0 ? rng.pick(['the biggest', 'the largest']) : rng.pick(['the biggest', 'the greatest', 'the largest'])
      const small = grade === 0 ? 'the smallest' : rng.pick(['the smallest', 'the least'])
      const prompt = [`Which number is ${mode === 'biggest' ? big : small}?`]
      return mathRiddle({ family: 'compare', skill: 'math: comparing numbers', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric, grade, tier }, mode === 'biggest' ? 'max' : 'min')
    }

    if (mode === 'stmt') {
      // "Which is true?" with statements a < b, a > b, a = b (and b < a for 4 choices).
      let aT: string, bT: string, av: number, bv: number, metric: number
      if (grade <= 3) {
        const [lo, hi] = grade === 2 ? [10, 999] : tier === 1 ? [100, 4999] : [1000, 9999]
        const [a, b] = closeNumbers(rng, 2, lo, hi, tier === 3 ? 2 : tier === 2 ? 1 : 0)
        av = a; bv = b; aT = grade >= 3 ? fmtInt(a) : String(a); bT = grade >= 3 ? fmtInt(b) : String(b)
        metric = 15 + Math.log2(hi) * 3
      } else if (grade === 4 && rng.bool(0.5)) {
        const d = rng.int(5, 12)
        const [a, b] = rng.sample(Array.from({ length: d - 1 }, (_, i) => i + 1), 2)
        av = a / d; bv = b / d; aT = `${a}/${d}`; bT = `${b}/${d}`; metric = 62 + d
      } else if (grade === 5 && rng.bool(0.5)) {
        const [f1, f2] = rng.sample(FRACS, 2)
        av = fval(f1); bv = fval(f2); aT = fracText(f1); bT = fracText(f2)
        metric = 82 + f1[1] + f2[1]
      } else {
        const places = grade === 4 ? (tier === 1 ? 1 : 2) : (tier === 1 ? 2 : 3)
        const p = Math.pow(10, places)
        // At tier 3 the two decimals share a whole part and a leading decimal digit, so the child
        // has to read past the first digit instead of comparing 0.29 with 1.01.
        let a: number, b: number
        if (tier === 3) {
          const whole = rng.int(0, 9) * p
          const shared = Math.floor(rng.int(1, p - 1) / 10) * 10
          a = whole + shared + rng.int(0, 9)
          b = whole + shared + rng.int(0, 9)
          if (b === a) b = a + (a % 10 === 9 ? -1 : 1)
        } else {
          a = rng.int(1, p * 2 - 1)
          b = rng.int(1, p * 2 - 1)
          if (b === a) b = a + 1
        }
        av = a / p; bv = b / p; aT = natDec(a, places); bT = natDec(b, places)
        metric = 60 + grade * 5 + places * 4 + (tier === 3 ? 8 : 0)
      }
      const stmts = [`${aT} < ${bT}`, `${aT} > ${bT}`, `${aT} = ${bT}`, `${bT} < ${aT}`, `${bT} > ${aT}`]
      const truth = [av < bv, av > bv, av === bv, bv < av, bv > av]
      const ans = stmts[truth.indexOf(true)]
      const decoys = stmts.filter((_, i) => !truth[i])
      const { choices, answer } = shuffled(rng, ans, rng.shuffle(decoys), n)
      // The choices are whole statements, so never ask for "the sign that fills the blank".
      const prompt = [rng.pick(['Which of these is true?', 'Which statement is correct?']), `Compare ${aT} and ${bT}.`]
      return mathRiddle({ family: 'compare', skill: 'math: comparison symbols', prompt, choices, answer, spoken: `Which is true? ${sayChoices(choices)}?`, metric, grade, tier }, 'stmt')
    }

    if (mode === 'fracLike') {
      // Grade 4 fraction ladder: same denominator (3.NF.A.3d) -> same numerator -> unlike both
      // numerator and denominator (4.NF.A.2).
      const most = rng.bool(0.6)
      const prompt = [`Which fraction is the ${most ? 'greatest' : 'least'}?`]
      const say = (choices: Choice[]) => `${prompt[0]} ${sayChoices(choices)}?`
      if (tier === 1) {
        const d = rng.int(5, 9)
        const nums = rng.sample(Array.from({ length: d - 1 }, (_, i) => i + 1), n)
        const target = most ? Math.max(...nums) : Math.min(...nums)
        const { choices, answer } = shuffled(rng, `${target}/${d}`, nums.filter(v => v !== target).map(v => `${v}/${d}`), n)
        return mathRiddle({ family: 'compare', skill: 'math: comparing fractions', prompt, choices, answer, spoken: say(choices), metric: 60 + d, grade, tier }, most ? 'max' : 'min')
      }
      if (tier === 2) {
        // Same numerator: more pieces means smaller pieces.
        const k = rng.int(1, 4)
        const dens = rng.sample(Array.from({ length: 12 - k }, (_, i) => k + 1 + i).filter(d => gcd(k, d) === 1), n)
        const target = most ? Math.min(...dens) : Math.max(...dens)
        const { choices, answer } = shuffled(rng, `${k}/${target}`, dens.filter(v => v !== target).map(v => `${k}/${v}`), n)
        return mathRiddle({ family: 'compare', skill: 'math: comparing fractions', prompt, choices, answer, spoken: say(choices), metric: 68 + Math.max(...dens), grade, tier }, most ? 'max' : 'min')
      }
      const { answer: ansT, decoys, gap } = fracSet(rng, n, most, 0.08, 0.5)
      const { choices, answer } = shuffled(rng, ansT, decoys, n)
      return mathRiddle({ family: 'compare', skill: 'math: comparing fractions', prompt, choices, answer, spoken: say(choices), metric: gapMetric(gap), grade, tier }, most ? 'max' : 'min')
    }

    if (mode === 'fracUnlike') {
      // Unlike denominators, gated by how close the answer is to its nearest rival: tier 1 is a
      // clear win, tier 2 needs a benchmark, tier 3 needs a common denominator (7/8 vs 5/6).
      const most = rng.bool(0.6)
      const [minGap, maxGap] = tier === 1 ? [0.2, 1] : tier === 2 ? [0.08, 0.2] : [0, 0.05]
      const { answer: ansT, decoys, gap } = fracSet(rng, n, most, minGap, maxGap)
      const { choices, answer } = shuffled(rng, ansT, decoys, n)
      const prompt = [`Which fraction is the ${most ? 'greatest' : 'least'}?`]
      return mathRiddle({ family: 'compare', skill: 'math: comparing fractions', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: gapMetric(gap), grade, tier }, most ? 'max' : 'min')
    }

    if (mode === 'decimal') {
      const places = grade === 4 ? (tier === 1 ? 1 : 2) : (tier === 1 ? 2 : 3)
      const p = Math.pow(10, places)
      // Same whole part; at higher tiers the decimals share leading digits or differ in length (0.5 vs 0.45).
      const whole = rng.int(0, tier === 1 ? 1 : 9)
      const set = new Set<number>()
      let tries = 0
      const shared = tier === 3 ? Math.floor(rng.int(1, p - 1) / 10) * 10 : -1
      while (set.size < n && tries++ < 200) {
        const u = shared >= 0 && rng.bool(0.6) ? shared + rng.int(0, 9) : rng.int(1, p - 1)
        if (u > 0 && u < p) set.add(u)
      }
      let u = 1
      while (set.size < n) set.add(u++)
      const units = [...set]
      const most = rng.bool(0.6)
      const target = most ? Math.max(...units) : Math.min(...units)
      const show = (v: number) => tier >= 2 ? natDec(whole * p + v, places) : fmtDec(whole * p + v, places)
      const { choices, answer } = shuffled(rng, show(target), units.filter(v => v !== target).map(show), n)
      const prompt = [`Which decimal is the ${most ? 'greatest' : 'least'}?`]
      return mathRiddle({ family: 'compare', skill: 'math: comparing decimals', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 58 + grade * 3 + places * 5 + (tier === 3 ? 3 : 0), grade, tier }, most ? 'max' : 'min')
    }

    // order: which list is sorted?
    const places = tier === 1 ? 2 : 3
    const p = Math.pow(10, places)
    const useFrac = tier === 3 && rng.bool(0.4)
    let items: { v: number; t: string }[]
    if (useFrac) {
      const fs = rng.sample(FRACS, 3)
      items = fs.map(f => ({ v: fval(f), t: fracText(f) }))
      if (rng.bool()) items[1] = { v: 0.5, t: '0.5' }
    } else {
      const shared = Math.floor(rng.int(1, p - 1) / 10) * 10
      const set = new Set<number>()
      let tries = 0
      while (set.size < 3 && tries++ < 100) { const u = rng.bool(0.5) ? shared + rng.int(0, 9) : rng.int(1, p - 1); if (u > 0 && u < p) set.add(u) }
      let u = 1
      while (set.size < 3) set.add(u++)
      items = [...set].map(u => ({ v: u / p, t: natDec(u, places) }))
    }
    // Ensure distinct values.
    const seen = new Set<number>()
    items = items.filter(it => (seen.has(it.v) ? false : (seen.add(it.v), true)))
    while (items.length < 3) { const u = rng.int(1, p - 1); if (!seen.has(u / p)) { seen.add(u / p); items.push({ v: u / p, t: natDec(u, places) }) } }
    const asc = rng.bool()
    const sorted = [...items].sort((a, b) => asc ? a.v - b.v : b.v - a.v)
    const ans = sorted.map(i => i.t).join(', ')
    const perms: string[] = []
    const permute = (arr: typeof items, pre: typeof items) => { if (!arr.length) { perms.push(pre.map(i => i.t).join(', ')); return } arr.forEach((x, i) => permute(arr.filter((_, j) => j !== i), [...pre, x])) }
    permute(items, [])
    const { choices, answer } = shuffled(rng, ans, rng.shuffle(perms.filter(pm => pm !== ans)), n)
    const prompt = [`Which list is in order from`, asc ? 'least to greatest?' : 'greatest to least?']
    return mathRiddle({ family: 'compare', skill: 'math: ordering numbers', prompt, choices, answer, spoken: `Which list is in order from ${asc ? 'least to greatest' : 'greatest to least'}? ${sayChoices(choices)}?`, metric: 85 + places * 5 + (useFrac ? 6 : 0), grade, tier }, asc ? 'asc' : 'desc')
  },
}

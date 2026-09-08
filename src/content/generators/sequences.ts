import type { Generator, Choice, ShapeName } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys } from './mathutil'
import type { Rng } from '../../engine/rng'

const PSHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart', 'rectangle', 'hexagon']
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple']
type PItem = { shape: ShapeName; color: string }
const sameItem = (a: PItem, b: PItem) => a.shape === b.shape && a.color === b.color
/** A small square and a short rectangle look alike on the scroll: never oppose them for K-1. */
const confusable = (a: ShapeName, b: ShapeName) => (a === 'square' && b === 'rectangle') || (a === 'rectangle' && b === 'square')

/** Shape/colour pattern with a blank at the end; visual shape choices. */
function shapePattern(rng: Rng, grade: number, tier: number, n: number) {
  // K: tier 1 is plain AB, tier 2 steps up to ABC/AABB, tier 3 adds ABB/ABCD.
  const kinds: string[] = grade === 0
    ? (tier === 1 ? ['AB'] : tier === 2 ? ['ABC', 'AABB', 'ABC'] : ['ABC', 'ABB', 'AABB', 'ABCD'])
    : (tier === 1 ? ['ABB', 'ABC', 'AABB'] : ['ABCD', 'AAB', 'ABB', 'ABC'])
  const kind = rng.pick(kinds)
  const letters = [...kind]
  const distinct = [...new Set(letters)]
  const pool = PSHAPES.slice(0, grade === 0 ? 5 : 7)
  // Unit items: distinct shapes; K tier 1 also distinct colours so the difference is obvious.
  let shapes = rng.sample(pool, distinct.length)
  for (let tries = 0; tries < 20 && grade <= 1 && shapes.some((s, i) => shapes.some((t, j) => j !== i && confusable(s, t))); tries++) shapes = rng.sample(pool, distinct.length)
  const colors = grade === 0 && tier === 1 ? rng.sample(COLORS, distinct.length) : (rng.bool(0.5) ? rng.sample(COLORS, distinct.length) : Array(distinct.length).fill(rng.pick(COLORS)))
  const unit: PItem[] = letters.map(l => { const i = distinct.indexOf(l); return { shape: shapes[i], color: colors[i] } })
  const p = unit.length
  const shownLen = p * 2 + rng.int(0, p - 1)
  const items: PItem[] = []
  for (let i = 0; i < shownLen; i++) items.push(unit[i % p])
  const next = unit[shownLen % p]
  const answer: Choice = { visual: { kind: 'shape', name: next.shape, color: next.color } }
  const decoyItems: PItem[] = unit.filter(u => !sameItem(u, next)).filter((u, i, arr) => arr.findIndex(v => sameItem(v, u)) === i)
  // Extra decoys: a new shape in a used colour, or a used shape in a new colour.
  const usedShapes = new Set(unit.map(u => u.shape))
  for (const s of rng.shuffle(pool)) if (!usedShapes.has(s) && !(grade <= 1 && confusable(s, next.shape))) decoyItems.push({ shape: s, color: next.color })
  for (const c of rng.shuffle(COLORS)) if (c !== next.color) decoyItems.push({ shape: next.shape, color: c })
  const decoys: Choice[] = decoyItems.map(d => ({ visual: { kind: 'shape', name: d.shape, color: d.color } }))
  const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
  const prompt = rng.pick([['Look at the pattern.', 'What comes next?'], ['What comes next in the pattern?'], ['Which shape comes next?']])
  const spokenChoices = choices.map(c => c.visual && c.visual.kind === 'shape' ? `${c.visual.color} ${c.visual.name}` : '').join(', ')
  return mathRiddle({
    family: 'sequences', skill: 'math: patterns', prompt, verse: false,
    visual: { kind: 'pattern', items, blank: true }, choices, answer: idx,
    spoken: `Look at the pattern. ${items.map(i => `${i.color} ${i.shape}`).join(', ')}, and then? ${spokenChoices}?`,
    metric: 4 + p * 2 + shownLen / 4, grade: grade as any, tier: tier as any,
  }, `period:${p}`)
}

type Rule = { kind: 'add'; k: number } | { kind: 'mul'; m: number } | { kind: 'div'; m: number } | { kind: 'two'; m: number; k: number } | { kind: 'square' } | { kind: 'tri' } | { kind: 'cube' } | { kind: 'fib' }
const LEVEL = (r: Rule): number => r.kind === 'add' ? (Math.abs(r.k) <= 2 ? 1 : [5, 10].includes(Math.abs(r.k)) ? 2 : [3, 4, 6, 25].includes(Math.abs(r.k)) ? 3 : 4) : r.kind === 'mul' || r.kind === 'div' ? 5 : r.kind === 'two' ? 6 : r.kind === 'cube' ? 8 : 7
const ruleText = (r: Rule): string => r.kind === 'add' ? (r.k > 0 ? `Add ${r.k}` : `Subtract ${-r.k}`) : r.kind === 'mul' ? `Multiply by ${r.m}` : r.kind === 'div' ? `Divide by ${r.m}` : r.kind === 'two' ? `${r.m === 2 ? 'Double' : 'Triple'}, then ${r.k > 0 ? 'add' : 'subtract'} ${Math.abs(r.k)}` : ''
const applyRule = (r: Rule, prev: number): number => r.kind === 'add' ? prev + r.k : r.kind === 'mul' ? prev * r.m : r.kind === 'div' ? prev / r.m : r.kind === 'two' ? prev * r.m + r.k : NaN

/**
 * Smallest start that keeps "multiply by m, then add k" growing: start * m + k > start, i.e.
 * start > -k / (m - 1). At start === -k / (m - 1) the sequence is constant (4, 4, 4, 4) and below
 * it every term falls, eventually below zero — neither is a fair K-5 riddle.
 */
const minStart = (m: number, k: number): number => k >= 0 ? 1 : Math.floor(-k / (m - 1)) + 1
/** A sequence a child may be shown: whole numbers, never negative, strictly monotonic. */
const usable = (terms: number[]): boolean =>
  terms.length >= 4 && terms.every(t => Number.isInteger(t) && t >= 0) &&
  (terms.every((t, i) => i === 0 || t > terms[i - 1]) || terms.every((t, i) => i === 0 || t < terms[i - 1]))

/** A start for a two-step rule that is safely above the constant/negative boundary. */
const twoStart = (rng: Rng, m: number, k: number, span: number): number => { const lo = minStart(m, k); return rng.int(lo, lo + span) }
/** Non-multiple of `k` in [lo, hi] (so "count by 5" does not always start on a round number). */
const offGrid = (rng: Rng, lo: number, hi: number, k: number): number => { for (let i = 0; i < 30; i++) { const v = rng.int(lo, hi); if (v % k !== 0) return v } return lo + (lo % k === 0 ? 1 : 0) }

/** Picks a rule and a start for the grade/tier; returns 5 terms (4 shown + next) and a check expr. */
function drawSequence(rng: Rng, grade: number, tier: number): { rule: Rule; terms: number[]; expr: string } {
  let rule: Rule, terms: number[] = [], expr = ''
  if (grade === 1) {
    // Tier 3 has its own pool: counting back, odd +2 runs and +5/+10 off the round numbers.
    if (tier === 3) {
      const opt = rng.int(0, 6)
      const k = [-1, -2, -5, -10, 2, 5, 10][opt]
      rule = { kind: 'add', k }
      const start = opt === 0 ? rng.int(12, 40) : opt === 1 ? rng.int(15, 45) : opt === 2 ? offGrid(rng, 41, 99, 5)
        : opt === 3 ? offGrid(rng, 51, 99, 10) : opt === 4 ? rng.int(3, 18) * 2 + 1 : opt === 5 ? offGrid(rng, 3, 60, 5) : offGrid(rng, 3, 55, 10)
      terms = [start]
    } else {
      const ks = tier === 1 ? [1, 1, 2] : [2, 5, 10]
      const k = rng.pick(ks)
      rule = { kind: 'add', k }
      // Count-by-1 starts at 6 or above: 1, 2, 3, 4 is pre-K, and its decoys are all on the scroll.
      const start = k === 1 ? rng.int(6, 27) : k === 2 ? rng.int(1, 30) : k === 5 ? rng.int(0, 12) * 5 : rng.int(0, 5) * 10
      terms = [start]
    }
  } else if (grade === 2) {
    // Tier 3 keeps +/-3, +/-4, +/-6 and +25; the easy +/-5 and +/-10 runs stay in tiers 1-2.
    const ks = tier === 1 ? [5, 10, 2] : tier === 2 ? [-5, -10, 3, 4] : [-3, -4, -6, 4, 6, 25]
    const k = rng.pick(ks)
    rule = { kind: 'add', k }
    const start = k < 0 ? rng.int(40, 100) : k === 25 ? rng.int(0, 4) * 25 : rng.int(3, 50)
    terms = [start]
  } else if (grade === 3) {
    // Doubling from small starts is tier 1-2; tripling, halving and big doubles are tier 3.
    if (tier === 3) {
      const pick = rng.int(0, 5)
      if (pick === 0) { rule = { kind: 'mul', m: 2 }; terms = [rng.int(6, 14)] }
      else if (pick === 1) { rule = { kind: 'mul', m: 3 }; terms = [rng.int(1, 4)] }
      else if (pick === 2) { rule = { kind: 'div', m: 2 }; terms = [rng.int(3, 20) * 16] }
      else { const k = [-7, -9, 12][pick - 3]; rule = { kind: 'add', k }; terms = [k < 0 ? rng.int(100, 300) : rng.int(100, 300)] }
    } else if (tier === 2) {
      const opts: Rule[] = [{ kind: 'add', k: -9 }, { kind: 'add', k: 8 }, { kind: 'add', k: 11 }, { kind: 'add', k: 12 }, { kind: 'mul', m: 2 }]
      rule = rng.pick(opts)
      terms = [rule.kind === 'mul' ? rng.int(1, 6) : rule.kind === 'add' && rule.k < 0 ? rng.int(60, 140) : rng.int(20, 90)]
    } else {
      const opts: Rule[] = [{ kind: 'add', k: 7 }, { kind: 'add', k: 9 }, { kind: 'add', k: -7 }, { kind: 'mul', m: 2 }]
      rule = rng.pick(opts)
      terms = [rule.kind === 'mul' ? rng.int(1, 5) : rule.kind === 'add' && rule.k < 0 ? rng.int(40, 100) : rng.int(1, 50)]
    }
  } else if (grade === 4) {
    // Tier 1 is single-step with 2-3 digit numbers; tier 2 doubles +/- k; tier 3 triples +/- k.
    if (tier === 1) {
      const kind = rng.weighted(['add', 'mul', 'div'] as const, [5, 3, 2])
      if (kind === 'mul') { const m = rng.pick([2, 3]); rule = { kind: 'mul', m }; terms = [rng.int(2, m === 2 ? 12 : 5)] }
      else if (kind === 'div') { rule = { kind: 'div', m: 2 }; terms = [rng.int(4, 25) * 16] }
      else { const k = rng.pick([7, 8, 9, 11, 12, 13, 14, 15, 20]) * (rng.bool() ? 1 : -1); rule = { kind: 'add', k }; terms = [k < 0 ? rng.int(120, 320) : rng.int(20, 140)] }
    } else {
      const m = tier === 2 ? 2 : 3
      const k = rng.pick(tier === 2 ? [1, -1, 2, -2, 3, -3, 4] : [1, -1, 2, -2, 3, -4, 5])
      rule = { kind: 'two', m, k }
      terms = [twoStart(rng, m, k, m === 2 ? 11 : 5)]
    }
  } else {
    // Grade 5: every tier draws from its own pool so the hardest tier never repeats the easiest.
    if (tier === 1) {
      const kind = rng.weighted(['square', 'tri', 'two'] as const, [3, 3, 2])
      if (kind === 'square') { const s = rng.int(1, 5); for (let i = 0; i < 5; i++) terms.push((s + i) * (s + i)); rule = { kind: 'square' }; expr = `${s + 4}*${s + 4}` }
      else if (kind === 'tri') { const s = rng.int(1, 4); for (let i = 0; i < 5; i++) { const j = s + i; terms.push(j * (j + 1) / 2) } rule = { kind: 'tri' }; expr = `${s + 4}*(${s + 4}+1)/2` }
      else { rule = { kind: 'two', m: 2, k: -1 }; terms = [twoStart(rng, 2, -1, 7)] }
    } else if (tier === 2) {
      const kind = rng.weighted(['square', 'tri', 'fib', 'two'] as const, [3, 2, 3, 2])
      if (kind === 'square') { const s = rng.int(5, 9); for (let i = 0; i < 5; i++) terms.push((s + i) * (s + i)); rule = { kind: 'square' }; expr = `${s + 4}*${s + 4}` }
      else if (kind === 'tri') { const s = rng.int(5, 9); for (let i = 0; i < 5; i++) { const j = s + i; terms.push(j * (j + 1) / 2) } rule = { kind: 'tri' }; expr = `${s + 4}*(${s + 4}+1)/2` }
      else if (kind === 'fib') { rule = { kind: 'fib' }; terms = fibTerms(rng, 1, 9, 16); expr = `${terms[3]}+${terms[2]}` }
      else { rule = { kind: 'two', m: 3, k: 1 }; terms = [twoStart(rng, 3, 1, 7)] }
    } else {
      const kind = rng.weighted(['fib', 'square', 'tri', 'two', 'cube'] as const, [3, 3, 2, 3, 1])
      if (kind === 'square') { const s = rng.int(9, 14); for (let i = 0; i < 5; i++) terms.push((s + i) * (s + i)); rule = { kind: 'square' }; expr = `${s + 4}*${s + 4}` }
      else if (kind === 'tri') { const s = rng.int(10, 16); for (let i = 0; i < 5; i++) { const j = s + i; terms.push(j * (j + 1) / 2) } rule = { kind: 'tri' }; expr = `${s + 4}*(${s + 4}+1)/2` }
      else if (kind === 'cube') { const s = rng.int(1, 4); for (let i = 0; i < 5; i++) terms.push(Math.pow(s + i, 3)); rule = { kind: 'cube' }; expr = `${s + 4}*${s + 4}*${s + 4}` }
      else if (kind === 'fib') { rule = { kind: 'fib' }; terms = fibTerms(rng, 6, 20, 30); expr = `${terms[3]}+${terms[2]}` }
      else { const { m, k } = rng.pick([{ m: 2, k: -3 }, { m: 3, k: 2 }, { m: 3, k: -2 }]); rule = { kind: 'two', m, k }; terms = [twoStart(rng, m, k, m === 2 ? 9 : 5)] }
    }
  }
  while (terms.length < 5) terms.push(applyRule(rule, terms[terms.length - 1]))
  if (!expr) {
    const last = terms[3]
    expr = rule.kind === 'add' ? `${last}+(${rule.k})` : rule.kind === 'mul' ? `${last}*${rule.m}` : rule.kind === 'div' ? `${last}/${rule.m}` : rule.kind === 'two' ? `${last}*${rule.m}+(${rule.k})` : ''
  }
  return { rule, terms, expr }
}

/**
 * Add-the-previous-two starts. `b === 2a` makes the first two differences equal, which lets a
 * child read the run as "differences double" and land on a different, defensible answer, so it is
 * excluded; `b > a` keeps the run strictly increasing.
 */
function fibTerms(rng: Rng, loA: number, hiA: number, hiB: number): number[] {
  let a = rng.int(loA, hiA), b = rng.int(a + 1, Math.max(a + 2, hiB))
  for (let i = 0; i < 20 && b === 2 * a; i++) b = rng.int(a + 1, Math.max(a + 2, hiB))
  if (b === 2 * a) b += 1
  const terms = [a, b]
  while (terms.length < 5) terms.push(terms[terms.length - 1] + terms[terms.length - 2])
  return terms
}

/** Rejects the degenerate draws (constant, decreasing past zero) a rule/start pair can still make. */
function numberSequence(rng: Rng, grade: number, tier: number): { rule: Rule; terms: number[]; expr: string } {
  for (let tries = 0; tries < 40; tries++) {
    const drawn = drawSequence(rng, grade, tier)
    if (usable(drawn.terms)) return drawn
  }
  return { rule: { kind: 'add', k: 5 }, terms: [10, 15, 20, 25, 30], expr: '25+(5)' }
}

/**
 * Near-miss decoys for the next term. Numbers already printed in the prompt are never offered:
 * a child could pick "the one that is not on the scroll" without reading the pattern.
 */
function nextDecoys(rng: Rng, rule: Rule, terms: number[], count: number): number[] {
  const next = terms[4], last = terms[3]
  const diff = last - terms[2]
  const shown = new Set(terms.slice(0, 4))
  const pref: number[] = [last + diff, next + 1, next - 1]
  if (rule.kind === 'add') pref.push(next + rule.k, next - rule.k, last + Math.abs(rule.k) * (rule.k < 0 ? 1 : -1), next + (rule.k > 0 ? 1 : -1) * 10)
  else if (rule.kind === 'mul') pref.push(last * (rule.m + 1), last + rule.m, next + rule.m, last * 2 === next ? last * 3 : last * 2)
  else if (rule.kind === 'div') pref.push(last / 2 === next ? last / 4 : last / 2, last - rule.m, next - 2)
  else if (rule.kind === 'two') pref.push(last * rule.m, last + rule.k, next + rule.k, next - rule.k, last * rule.m + 2 * rule.k)
  else if (rule.kind === 'square') pref.push(next + 2, next - 2, last + diff + 2)
  else if (rule.kind === 'tri') pref.push(next + 2, last + diff + 2, next * 2 - last)
  else if (rule.kind === 'cube') pref.push(next - 10, next + 10, last + diff + 20)
  else if (rule.kind === 'fib') pref.push(last * 2, last + terms[1], next + 2)
  const ok = (v: number) => Number.isInteger(v) && v >= 0 && v !== next && !shown.has(v)
  const out = numDecoys(rng, next, count + shown.size, pref.filter(ok), Math.max(2, Math.round(Math.abs(next) * 0.15)), 0).filter(ok).slice(0, count)
  const seen = new Set([next, ...out])
  for (let step = 1; out.length < count && step < 2000; step++) {
    for (const v of [next + step, next - step]) if (ok(v) && !seen.has(v) && out.length < count) { seen.add(v); out.push(v) }
  }
  return rng.shuffle(out)
}

/**
 * Decoy rules for "What is the rule?". The first candidates keep the answer's operation and move
 * its constant by one or two (Add 11 / Add 13 for Add 12), so a child cannot pick the odd one out
 * — the only "Subtract", or the only decreasing option — without testing the numbers.
 */
function ruleDecoys(rng: Rng, rule: Rule, terms: number[]): string[] {
  const cands: Rule[] = []
  if (rule.kind === 'add') {
    const s = rule.k > 0 ? 1 : -1, a = Math.abs(rule.k)
    for (const d of [1, 2, 3, 5]) { if (a - d >= 1) cands.push({ kind: 'add', k: s * (a - d) }); cands.push({ kind: 'add', k: s * (a + d) }) }
    cands.push({ kind: 'add', k: -rule.k }, { kind: s > 0 ? 'mul' : 'div', m: 2 }, { kind: 'two', m: 2, k: s })
  } else if (rule.kind === 'mul') {
    cands.push({ kind: 'mul', m: rule.m + 1 }, { kind: 'mul', m: rule.m + 2 })
    if (rule.m > 2) cands.push({ kind: 'mul', m: rule.m - 1 })
    cands.push({ kind: 'two', m: rule.m, k: 1 }, { kind: 'two', m: rule.m, k: -1 }, { kind: 'add', k: terms[1] - terms[0] }, { kind: 'add', k: terms[3] - terms[2] })
  } else if (rule.kind === 'div') {
    cands.push({ kind: 'div', m: rule.m * 2 }, { kind: 'div', m: rule.m + 1 }, { kind: 'add', k: terms[1] - terms[0] }, { kind: 'add', k: terms[3] - terms[2] }, { kind: 'div', m: rule.m + 2 })
  } else if (rule.kind === 'two') {
    const { m, k } = rule
    for (const d of [1, 2, 3]) { cands.push({ kind: 'two', m, k: k + d }, { kind: 'two', m, k: k - d }) }
    cands.push({ kind: 'two', m: m === 2 ? 3 : 2, k }, { kind: 'mul', m }, { kind: 'add', k: terms[1] - terms[0] })
  }
  const fits = (r: Rule) => terms.every((t, i) => i === 0 || applyRule(r, terms[i - 1]) === t)
  const dir = (r: Rule) => Math.sign(applyRule(r, terms[3]) - terms[3])
  const want = dir(rule)
  const ok = cands.filter(c => {
    const t = ruleText(c)
    if (!t || t.length > 26 || t === ruleText(rule)) return false
    if (c.kind === 'add' && c.k === 0) return false
    if (c.kind === 'two' && c.k === 0) return false
    if ((c.kind === 'mul' || c.kind === 'div') && c.m < 2) return false
    return Number.isFinite(applyRule(c, terms[3])) && !fits(c)
  })
  // Same operation and same direction first, then anything else pointing the same way.
  const tier1 = ok.filter(c => c.kind === rule.kind && dir(c) === want)
  const tier2 = ok.filter(c => !tier1.includes(c) && dir(c) === want)
  const tier3 = ok.filter(c => !tier1.includes(c) && !tier2.includes(c))
  return [...rng.shuffle(tier1), ...rng.shuffle(tier2), ...rng.shuffle(tier3)].map(ruleText)
}

/** Sequences for "What is the rule?": single-step for grade 4 tier 1, two-step for tier 3. */
function ruleSequence(rng: Rng, grade: number, tier: number): { rule: Rule; terms: number[] } {
  const single: Rule[] = [
    { kind: 'add', k: rng.pick([7, 8, 9, 11, 12, 13, 14, 15]) }, { kind: 'add', k: -rng.pick([7, 8, 9, 11, 12, 13, 14, 15]) },
    { kind: 'mul', m: rng.pick([2, 3]) }, { kind: 'div', m: 2 },
  ]
  const twoStep: Rule[] = [{ kind: 'two', m: 2, k: rng.pick([1, -1, 3, -3]) }, { kind: 'two', m: 3, k: rng.pick([1, -1, 2, -2]) }]
  const pool = grade === 4 ? (tier === 1 ? single : twoStep) : [...single, ...twoStep]
  for (let tries = 0; tries < 40; tries++) {
    const rule = rng.pick(pool)
    const start = rule.kind === 'div' ? rng.int(2, 20) * 16
      : rule.kind === 'add' ? (rule.k < 0 ? rng.int(45, 99) : rng.int(2, 40))
        : rule.kind === 'two' ? twoStart(rng, rule.m, rule.k, 8)
          : rng.int(2, rule.kind === 'mul' && rule.m === 2 ? 9 : 5)
    const terms = [start]
    while (terms.length < 4) terms.push(applyRule(rule, terms[terms.length - 1]))
    if (usable(terms)) return { rule, terms }
  }
  return { rule: { kind: 'add', k: 12 }, terms: [14, 26, 38, 50] }
}

/** Shape patterns (K-1), number patterns with ever harder rules (1-5). */
export const sequences: Generator = {
  id: 'sequences',
  name: 'Patterns and sequences',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 1.2, 2: 1, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    if (grade === 0 || (grade === 1 && (tier === 1 ? rng.bool(0.5) : tier === 2 ? rng.bool(0.3) : false))) return shapePattern(rng, grade, tier, n)

    // "What is the rule?": single-step at grade 4 tier 1, two-step at tier 3, mixed at grade 5 tier 1.
    if ((grade === 4 && tier !== 2 && rng.bool(0.3)) || (grade === 5 && tier === 1 && rng.bool(0.25))) {
      const { rule, terms } = ruleSequence(rng, grade, tier)
      const { choices, answer } = shuffled(rng, ruleText(rule), ruleDecoys(rng, rule, terms), n)
      const prompt = [`${terms.join(', ')}, ...`, 'What is the rule?']
      return mathRiddle({ family: 'sequences', skill: 'math: pattern rules', prompt, choices, answer, spoken: `${terms.join(', ')}. What is the rule? ${sayChoices(choices)}?`, metric: LEVEL(rule) * 10 + 2 + Math.log2(Math.max(2, terms[3])), grade, tier }, 'rule')
    }

    const { rule, terms, expr } = numberSequence(rng, grade, tier)
    const missingMiddle = grade >= 2 && tier >= 2 && rule.kind === 'add' && rng.bool(0.3)
    if (missingMiddle) {
      const i = rng.int(1, 3)
      const target = terms[i]
      const shown = new Set(terms.filter((_, j) => j !== i))
      const pref = [target + 1, target - 1, target + rule.k, target - rule.k, terms[i - 1] + 1].filter(v => Number.isInteger(v) && v >= 0 && v !== target && !shown.has(v))
      const decoys = numDecoys(rng, target, n - 1 + shown.size, pref, Math.max(2, Math.abs(rule.k)), 0).filter(v => !shown.has(v)).slice(0, n - 1)
      for (let step = 1; decoys.length < n - 1 && step < 500; step++) for (const v of [target + step, target - step]) if (v >= 0 && v !== target && !shown.has(v) && !decoys.includes(v) && decoys.length < n - 1) decoys.push(v)
      const { choices, answer } = shuffled(rng, String(target), rng.shuffle(decoys).map(String), n)
      const shownText = terms.map((t, j) => j === i ? '__' : String(t))
      const prompt = [shownText.join(', '), 'What number is missing?']
      return mathRiddle({ family: 'sequences', skill: 'math: number patterns', prompt, choices, answer, spoken: `${shownText.map(s => s === '__' ? 'blank' : s).join(', ')}. What number is missing? ${sayChoices(choices)}?`, metric: LEVEL(rule) * 10 + 1 + Math.log2(Math.max(2, terms[4])), grade, tier }, `num:${terms[i - 1]}+(${rule.k})`)
    }
    const next = terms[4]
    const decoys = nextDecoys(rng, rule, terms, n - 1)
    const { choices, answer } = shuffled(rng, String(next), decoys.map(String), n)
    const shown = terms.slice(0, 4)
    const prompt = [`${shown.join(', ')}, ...`, rng.pick(['What number comes next?', 'What comes next?', 'Which number is next?'])]
    return mathRiddle({ family: 'sequences', skill: 'math: number patterns', prompt, choices, answer, spoken: `${shown.join(', ')}. What number comes next? ${sayChoices(choices)}?`, metric: LEVEL(rule) * 10 + Math.log2(Math.max(2, next)), grade, tier }, `num:${expr}`)
  },
}

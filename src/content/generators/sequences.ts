import type { Generator, Choice, ShapeName } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys } from './mathutil'
import type { Rng } from '../../engine/rng'

const PSHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart', 'rectangle', 'hexagon']
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple']
type PItem = { shape: ShapeName; color: string }
const sameItem = (a: PItem, b: PItem) => a.shape === b.shape && a.color === b.color

/** Shape/colour pattern with a blank at the end; visual shape choices. */
function shapePattern(rng: Rng, grade: number, tier: number, n: number) {
  const kinds: string[] = grade === 0 ? (tier === 1 ? ['AB'] : tier === 2 ? ['AB', 'AABB', 'ABC'] : ['ABC', 'ABB', 'AABB', 'ABCD']) : (tier === 1 ? ['ABB', 'ABC', 'AABB'] : ['ABCD', 'AAB', 'ABB', 'ABC'])
  const kind = rng.pick(kinds)
  const letters = [...kind]
  const distinct = [...new Set(letters)]
  // Unit items: distinct shapes; K tier 1 also distinct colours so the difference is obvious.
  const shapes = rng.sample(PSHAPES.slice(0, grade === 0 ? 5 : 7), distinct.length)
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
  for (const s of rng.shuffle(PSHAPES)) if (!usedShapes.has(s)) decoyItems.push({ shape: s, color: next.color })
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

/** Picks a rule and a start for the grade/tier; returns 5 terms (4 shown + next) and a check expr. */
function numberSequence(rng: Rng, grade: number, tier: number): { rule: Rule; terms: number[]; expr: string } {
  let rule: Rule, terms: number[] = [], expr = ''
  if (grade === 1) {
    const ks = tier === 1 ? [1, 1, 2] : tier === 2 ? [2, 5, 10] : [2, 5, 10, -1, -2]
    const k = rng.pick(ks)
    rule = { kind: 'add', k }
    const start = k === 1 ? rng.int(1, 20) : k === 2 ? rng.int(0, 30) : k === 5 ? rng.int(0, 12) * 5 : k === 10 ? rng.int(0, 5) * 10 : rng.int(15, 40)
    terms = [start]
  } else if (grade === 2) {
    const ks = tier === 1 ? [5, 10, 2] : tier === 2 ? [-5, -10, 3, 4] : [-3, 25, -4, 6, -5]
    const k = rng.pick(ks)
    rule = { kind: 'add', k }
    const start = k < 0 ? rng.int(40, 100) : k === 25 ? rng.int(0, 4) * 25 : rng.int(3, 50)
    terms = [start]
  } else if (grade === 3) {
    const opts: Rule[] = tier === 1 ? [{ kind: 'add', k: 7 }, { kind: 'add', k: 9 }, { kind: 'add', k: -7 }, { kind: 'mul', m: 2 }]
      : tier === 2 ? [{ kind: 'mul', m: 2 }, { kind: 'add', k: -9 }, { kind: 'add', k: 8 }, { kind: 'add', k: 11 }, { kind: 'mul', m: 3 }]
        : [{ kind: 'mul', m: 2 }, { kind: 'mul', m: 3 }, { kind: 'add', k: -7 }, { kind: 'add', k: -9 }, { kind: 'div', m: 2 }, { kind: 'add', k: 12 }]
    rule = rng.pick(opts)
    let start: number
    if (rule.kind === 'mul') start = rule.m === 2 ? rng.int(1, tier === 3 ? 9 : 5) : rng.int(1, 3)
    else if (rule.kind === 'div') start = rng.int(3, 12) * 16
    else { const k = rule.kind === 'add' ? rule.k : 1; start = k < 0 ? rng.int(tier === 3 ? 100 : 40, tier === 3 ? 300 : 100) : rng.int(tier === 3 ? 100 : 1, tier === 3 ? 300 : 50) }
    terms = [start]
  } else if (grade === 4) {
    const opts: Rule[] = tier === 1 ? [{ kind: 'two', m: 2, k: 1 }, { kind: 'two', m: 2, k: -1 }, { kind: 'two', m: 2, k: 2 }]
      : tier === 2 ? [{ kind: 'two', m: 2, k: 1 }, { kind: 'two', m: 2, k: -1 }, { kind: 'two', m: 2, k: 3 }, { kind: 'two', m: 3, k: 1 }, { kind: 'two', m: 2, k: -3 }]
        : [{ kind: 'two', m: 3, k: 2 }, { kind: 'two', m: 3, k: -1 }, { kind: 'two', m: 2, k: 5 }, { kind: 'two', m: 2, k: -4 }, { kind: 'two', m: 3, k: -2 }]
    rule = rng.pick(opts)
    terms = [rule.kind === 'two' && rule.m === 3 ? rng.int(1, 4) : rng.int(1, 6)]
  } else {
    const opts: Rule[] = tier === 1 ? [{ kind: 'square' }, { kind: 'tri' }, { kind: 'two', m: 2, k: -1 }, { kind: 'fib' }]
      : tier === 2 ? [{ kind: 'square' }, { kind: 'fib' }, { kind: 'tri' }, { kind: 'two', m: 3, k: 1 }]
        : [{ kind: 'fib' }, { kind: 'cube' }, { kind: 'square' }, { kind: 'tri' }, { kind: 'two', m: 2, k: -3 }]
    rule = rng.pick(opts)
    if (rule.kind === 'square') { const s = rng.int(1, tier === 1 ? 4 : 9); for (let i = 0; i < 5; i++) terms.push((s + i) * (s + i)); expr = `${s + 4}*${s + 4}` }
    else if (rule.kind === 'tri') { const s = rng.int(1, tier === 1 ? 3 : 6); for (let i = 0; i < 5; i++) { const k = s + i; terms.push(k * (k + 1) / 2) } expr = `${s + 4}*(${s + 4}+1)/2` }
    else if (rule.kind === 'cube') { const s = rng.int(1, 3); for (let i = 0; i < 5; i++) terms.push(Math.pow(s + i, 3)); expr = `${s + 4}*${s + 4}*${s + 4}` }
    else if (rule.kind === 'fib') {
      const a = rng.int(1, tier === 1 ? 5 : 12), b = rng.int(a, tier === 1 ? 9 : 20)
      terms = [a, b]
      while (terms.length < 5) terms.push(terms[terms.length - 1] + terms[terms.length - 2])
      expr = `${terms[3]}+${terms[2]}`
    } else terms = [rng.int(2, 6)]
  }
  while (terms.length < 5) terms.push(applyRule(rule, terms[terms.length - 1]))
  if (!expr) {
    const last = terms[3]
    expr = rule.kind === 'add' ? `${last}+(${rule.k})` : rule.kind === 'mul' ? `${last}*${rule.m}` : rule.kind === 'div' ? `${last}/${rule.m}` : rule.kind === 'two' ? `${last}*${rule.m}+(${rule.k})` : ''
  }
  return { rule, terms, expr }
}

/** Near-miss decoys for the next term. */
function nextDecoys(rng: Rng, rule: Rule, terms: number[], count: number): number[] {
  const next = terms[4], last = terms[3]
  const diff = last - terms[2]
  const pref: number[] = [last + diff, next + 1, next - 1]
  if (rule.kind === 'add') pref.push(next + rule.k, next - rule.k, last + Math.abs(rule.k) * (rule.k < 0 ? 1 : -1), next + (rule.k > 0 ? 1 : -1) * 10)
  else if (rule.kind === 'mul') pref.push(last * (rule.m + 1), last + rule.m, next + rule.m, last * 2 === next ? last * 3 : last * 2)
  else if (rule.kind === 'div') pref.push(last / 2 === next ? last / 4 : last / 2, last - rule.m, next - 2)
  else if (rule.kind === 'two') pref.push(last * rule.m, last + rule.k, next + rule.k, next - rule.k, last * rule.m + 2 * rule.k)
  else if (rule.kind === 'square') pref.push(next + 2, next - 2, last + diff + 2)
  else if (rule.kind === 'tri') pref.push(next + 2, last + diff + 2, next * 2 - last)
  else if (rule.kind === 'cube') pref.push(next - 10, next + 10, last + diff + 20)
  else if (rule.kind === 'fib') pref.push(last * 2, last + terms[1], next + 2)
  return numDecoys(rng, next, count, pref.filter(v => Number.isInteger(v) && v >= 0), Math.max(2, Math.round(Math.abs(next) * 0.15)), 0)
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

    // "What is the rule?" for grade 4 tier 2-3 and grade 5 tier 1.
    if ((grade === 4 && tier >= 2 && rng.bool(0.3)) || (grade === 5 && tier === 1 && rng.bool(0.25))) {
      const pool: Rule[] = [{ kind: 'add', k: rng.int(3, 12) }, { kind: 'add', k: -rng.int(3, 12) }, { kind: 'mul', m: rng.pick([2, 3]) }, { kind: 'two', m: 2, k: rng.pick([1, -1, 3]) }, { kind: 'two', m: 3, k: rng.pick([1, -1, 2]) }, { kind: 'div', m: 2 }]
      const rule = rng.pick(grade === 4 && tier === 2 ? pool.slice(0, 3) : pool)
      const start = rule.kind === 'div' ? rng.int(2, 10) * 16 : rule.kind === 'add' && rule.k < 0 ? rng.int(40, 99) : rng.int(1, 9)
      const terms = [start]
      while (terms.length < 4) terms.push(applyRule(rule, terms[terms.length - 1]))
      const fits = (r: Rule) => terms.every((t, i) => i === 0 || applyRule(r, terms[i - 1]) === t)
      const cands: Rule[] = [
        { kind: 'add', k: terms[1] - terms[0] }, { kind: 'add', k: -(terms[1] - terms[0]) }, { kind: 'add', k: terms[3] - terms[2] },
        { kind: 'mul', m: 2 }, { kind: 'mul', m: 3 }, { kind: 'div', m: 2 },
        { kind: 'two', m: 2, k: 1 }, { kind: 'two', m: 2, k: -1 }, { kind: 'two', m: 3, k: 1 }, { kind: 'two', m: 3, k: -1 }, { kind: 'two', m: 2, k: 3 },
        { kind: 'add', k: rule.kind === 'add' ? rule.k + 1 : 4 }, { kind: 'add', k: rule.kind === 'add' ? rule.k - 1 : 6 },
      ]
      const decoys = rng.shuffle(cands.filter(c => !fits(c) && ruleText(c) !== ruleText(rule) && !(c.kind === 'add' && c.k === 0)).map(ruleText))
      const { choices, answer } = shuffled(rng, ruleText(rule), decoys, n)
      const prompt = [`${terms.join(', ')}, ...`, 'What is the rule?']
      return mathRiddle({ family: 'sequences', skill: 'math: pattern rules', prompt, choices, answer, spoken: `${terms.join(', ')}. What is the rule? ${sayChoices(choices)}?`, metric: LEVEL(rule) * 10 + 2 + Math.log2(Math.max(2, terms[3])), grade, tier }, 'rule')
    }

    const { rule, terms, expr } = numberSequence(rng, grade, tier)
    const missingMiddle = grade >= 2 && tier >= 2 && rule.kind === 'add' && rng.bool(0.3)
    if (missingMiddle) {
      const i = rng.int(1, 3)
      const target = terms[i]
      const decoys = numDecoys(rng, target, n - 1, [target + 1, target - 1, target + rule.k, target - rule.k, terms[i - 1] + 1], Math.max(2, Math.abs(rule.k)), 0)
      const { choices, answer } = shuffled(rng, String(target), decoys.map(String), n)
      const shown = terms.map((t, j) => j === i ? '__' : String(t))
      const prompt = [shown.join(', '), 'What number is missing?']
      return mathRiddle({ family: 'sequences', skill: 'math: number patterns', prompt, choices, answer, spoken: `${shown.map(s => s === '__' ? 'blank' : s).join(', ')}. What number is missing? ${sayChoices(choices)}?`, metric: LEVEL(rule) * 10 + 1 + Math.log2(Math.max(2, terms[4])), grade, tier }, `num:${terms[i - 1]}+(${rule.k})`)
    }
    const next = terms[4]
    const decoys = nextDecoys(rng, rule, terms, n - 1)
    const { choices, answer } = shuffled(rng, String(next), decoys.map(String), n)
    const shown = terms.slice(0, 4)
    const prompt = [`${shown.join(', ')}, ...`, rng.pick(['What number comes next?', 'What comes next?', 'Which number is next?'])]
    return mathRiddle({ family: 'sequences', skill: 'math: number patterns', prompt, choices, answer, spoken: `${shown.join(', ')}. What number comes next? ${sayChoices(choices)}?`, metric: LEVEL(rule) * 10 + Math.log2(Math.max(2, next)), grade, tier }, `num:${expr}`)
  },
}

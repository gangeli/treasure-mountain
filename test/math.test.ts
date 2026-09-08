import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { TIERS, type Choice, type Riddle } from '../src/content/types'
import { MATH } from '../src/content/generators/math'
import { standardChecks } from './helpers'

describe('math generators', () => {
  standardChecks(MATH, it, expect)
})

// ------------------------------------------------------------------ independent recomputation

/** Tiny arithmetic evaluator: numbers, + - * / %, parentheses, floor() round() ceil(). */
function evalExpr(src: string): number {
  const s = src.replace(/\s+/g, '')
  let i = 0
  const expr = (): number => { let v = term(); while (s[i] === '+' || s[i] === '-') { const op = s[i++]; const r = term(); v = op === '+' ? v + r : v - r } return v }
  const term = (): number => { let v = factor(); while (s[i] === '*' || s[i] === '/' || s[i] === '%') { const op = s[i++]; const r = factor(); v = op === '*' ? v * r : op === '/' ? v / r : v % r } return v }
  const factor = (): number => {
    if (s[i] === '-') { i++; return -factor() }
    if (s[i] === '(') { i++; const v = expr(); if (s[i] !== ')') throw new Error(`bad expr ${src}`); i++; return v }
    const fn = /^(floor|round|ceil)\(/.exec(s.slice(i))
    if (fn) { i += fn[0].length; const v = expr(); if (s[i] !== ')') throw new Error(`bad expr ${src}`); i++; return Math[fn[1] as 'floor' | 'round' | 'ceil'](v) }
    const m = /^\d+(\.\d+)?/.exec(s.slice(i))
    if (!m) throw new Error(`bad expr ${src} at ${i}`)
    i += m[0].length
    return Number(m[0])
  }
  const v = expr()
  if (i !== s.length) throw new Error(`bad expr ${src}: trailing ${s.slice(i)}`)
  return v
}

const COIN: Record<string, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 }
const hour12 = (h: number) => ((h + 11) % 12) + 1

/** Numeric value of a choice: clock minutes, fractions, money, units stripped... null when not numeric. */
function valueOf(c: Choice): number | null {
  if (c.visual) {
    const v = c.visual
    if (v.kind === 'counters' || v.kind === 'tenframe') return v.count
    if (v.kind === 'clock') return hour12(v.hour) * 60 + v.minute
    if (v.kind === 'fraction') return v.shaded / v.parts
    if (v.kind === 'coins') return v.coins.reduce((s, x) => s + COIN[x], 0)
    return null
  }
  let t = (c.text ?? '').trim()
  let m: RegExpExecArray | null
  if ((m = /^(\d{1,2}):(\d{2})(?:\s*(a\.m\.|p\.m\.))?$/.exec(t))) {
    const h = +m[1], mm = +m[2]
    if (m[3]) return ((h % 12) + (m[3] === 'p.m.' ? 12 : 0)) * 60 + mm
    return hour12(h) * 60 + mm
  }
  if ((m = /^(\d{1,2}) o'clock$/.exec(t))) return hour12(+m[1]) * 60
  if ((m = /^half past (\d{1,2})$/.exec(t))) return hour12(+m[1]) * 60 + 30
  if ((m = /^quarter past (\d{1,2})$/.exec(t))) return hour12(+m[1]) * 60 + 15
  if ((m = /^quarter to (\d{1,2})$/.exec(t))) return hour12(+m[1] - 1) * 60 + 45
  if ((m = /^(\d+) hours?(?: (\d+) minutes?)?$/.exec(t))) return +m[1] * 60 + +(m[2] ?? 0)
  if ((m = /^(\d+) minutes?$/.exec(t))) return +m[1]
  if ((m = /^(\d+) (\d+)\/(\d+)$/.exec(t))) return +m[1] + +m[2] / +m[3]
  if ((m = /^(\d+)\/(\d+)$/.exec(t))) return +m[1] / +m[2]
  t = t.replace(/[$,¢°]/g, '').replace(/\s*(cents?|sq [a-z]+|cubic [a-z]+|[a-zA-Z][a-zA-Z .]*)$/, '').trim()
  if (/^[\d.\s+\-*/()]+$/.test(t) && /\d/.test(t)) return evalExpr(t)
  const lead = /^-?\d+(\.\d+)?/.exec(t)
  return lead ? Number(lead[0]) : null
}
const num = (c: Choice): number => { const v = valueOf(c); if (v === null) throw new Error(`not numeric: ${c.text ?? JSON.stringify(c.visual)}`); return v }
const close = (a: number, b: number) => Math.abs(a - b) < 1e-6
const isPrime = (v: number): boolean => { if (v < 2) return false; for (let i = 2; i * i <= v; i++) if (v % i === 0) return false; return true }
const gcd = (a: number, b: number): number => { while (b) [a, b] = [b, a % b]; return a }
const digitAt = (v: number, place: number): number => Math.floor(Math.round(v * 1000) / Math.pow(10, place + 3)) % 10
const angleType = (d: number) => d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : 'straight'
const applyRule = (rule: string, x: number): number | null => {
  let m: RegExpExecArray | null
  if ((m = /^Add (\d+)$/.exec(rule))) return x + +m[1]
  if ((m = /^Subtract (\d+)$/.exec(rule))) return x - +m[1]
  if ((m = /^Multiply by (\d+)$/.exec(rule))) return x * +m[1]
  if ((m = /^Divide by (\d+)$/.exec(rule))) return x / +m[1]
  if ((m = /^(Double|Triple), then (add|subtract) (\d+)$/.exec(rule))) return x * (m[1] === 'Double' ? 2 : 3) + (m[2] === 'add' ? 1 : -1) * +m[3]
  return null
}

/**
 * Recomputes the answer from the riddle's check (in its key) and verifies every decoy differs.
 * Returns an error string, '' when verified, or null when the riddle carries no check.
 */
function verify(r: Riddle): string | null {
  const check = r.key.split('|')[1]
  if (!check) return null
  const [kind, arg = ''] = check.split(/:(.*)/s)
  const ans = r.choices[r.answer]
  const decoys = r.choices.filter((_, i) => i !== r.answer)
  const numericAll = () => { const a = num(ans); const ds = decoys.map(num); return { a, ds } }
  switch (kind) {
    case 'num': {
      const expected = evalExpr(arg)
      const { a, ds } = numericAll()
      if (!close(a, expected)) return `answer ${ans.text ?? JSON.stringify(ans.visual)} != ${expected} (${arg})`
      const bad = ds.find(d => close(d, expected))
      if (bad !== undefined) return `decoy equals answer ${expected}`
      return ''
    }
    case 'max': case 'min': {
      const { a, ds } = numericAll()
      const bad = ds.find(d => kind === 'max' ? d >= a : d <= a)
      return bad === undefined ? '' : `${kind}: decoy ${bad} vs answer ${a}`
    }
    case 'asc': case 'desc': {
      const sorted = (t: string) => { const vs = t.split(', ').map(x => num({ text: x })); return vs.every((v, i) => i === 0 || (kind === 'asc' ? v > vs[i - 1] : v < vs[i - 1])) }
      if (!sorted(ans.text!)) return `answer list not ${kind}: ${ans.text}`
      const bad = decoys.find(d => sorted(d.text!))
      return bad ? `decoy list is ${kind}: ${bad.text}` : ''
    }
    case 'stmt': {
      const truth = (t: string) => { const m = /^(.+) ([<>=]) (.+)$/.exec(t); if (!m) throw new Error('bad stmt ' + t); const l = num({ text: m[1] }), rr = num({ text: m[3] }); return m[2] === '<' ? l < rr : m[2] === '>' ? l > rr : close(l, rr) }
      if (!truth(ans.text!)) return `answer statement false: ${ans.text}`
      const bad = decoys.find(d => truth(d.text!))
      return bad ? `decoy statement true: ${bad.text}` : ''
    }
    case 'between': {
      const [lo, hi] = arg.split(',').map(Number)
      const { a, ds } = numericAll()
      if (!(a > lo && a < hi)) return `answer ${a} not between ${lo} and ${hi}`
      const bad = ds.find(d => d > lo && d < hi)
      return bad === undefined ? '' : `decoy ${bad} is between ${lo} and ${hi}`
    }
    case 'parity': {
      const { a, ds } = numericAll()
      const even = arg === 'even'
      if ((a % 2 === 0) !== even) return `answer ${a} is not ${arg}`
      const bad = ds.find(d => (d % 2 === 0) === even)
      return bad === undefined ? '' : `decoy ${bad} is also ${arg}`
    }
    case 'nextparity': {
      const [p, fromS] = arg.split(',')
      const from = Number(fromS)
      const expected = ((from + 1) % 2 === 0) === (p === 'even') ? from + 1 : from + 2
      const { a, ds } = numericAll()
      if (a !== expected) return `answer ${a} != ${expected}`
      return ds.some(d => d === expected) ? 'decoy equals answer' : ''
    }
    case 'sumparity': {
      const [x, y] = arg.split(',').map(Number)
      const expected = (x + y) % 2 === 0 ? 'even' : 'odd'
      return ans.text === expected ? (decoys.some(d => d.text === expected) ? 'decoy equals answer' : '') : `answer ${ans.text} != ${expected}`
    }
    case 'prime': case 'composite': {
      const { a, ds } = numericAll()
      const want = kind === 'prime'
      if (isPrime(a) !== want) return `answer ${a} is not ${kind}`
      const bad = ds.find(d => isPrime(d) === want && d > 1)
      return bad === undefined ? '' : `decoy ${bad} is also ${kind}`
    }
    case 'multiple': case 'notmultiple': {
      const mlt = Number(arg)
      const { a, ds } = numericAll()
      const want = kind === 'multiple'
      if ((a % mlt === 0) !== want) return `answer ${a} multiple-of-${mlt} != ${want}`
      const bad = ds.find(d => (d % mlt === 0) === want)
      return bad === undefined ? '' : `decoy ${bad} has the same multiple-of-${mlt} status`
    }
    case 'factor': case 'notfactor': {
      const v = Number(arg)
      const { a, ds } = numericAll()
      const want = kind === 'factor'
      if ((v % a === 0) !== want) return `answer ${a} factor-of-${v} != ${want}`
      const bad = ds.find(d => (v % d === 0) === want)
      return bad === undefined ? '' : `decoy ${bad} has the same factor-of-${v} status`
    }
    case 'factors': {
      const v = Number(arg)
      let count = 0
      for (let i = 1; i <= v; i++) if (v % i === 0) count++
      const { a, ds } = numericAll()
      return a === count ? (ds.includes(count) ? 'decoy equals answer' : '') : `answer ${a} != ${count} factors of ${v}`
    }
    case 'gcf': case 'lcm': {
      const [x, y] = arg.split(',').map(Number)
      const expected = kind === 'gcf' ? gcd(x, y) : (x * y) / gcd(x, y)
      const { a, ds } = numericAll()
      return a === expected ? (ds.includes(expected) ? 'decoy equals answer' : '') : `answer ${a} != ${kind}(${x},${y})=${expected}`
    }
    case 'period': {
      const p = Number(arg)
      if (r.visual?.kind !== 'pattern') return 'no pattern visual'
      const items = r.visual.items
      const next = items[items.length - p]
      const same = (c: Choice) => c.visual?.kind === 'shape' && c.visual.name === next.shape && c.visual.color === next.color
      if (!same(ans)) return `answer is not the next pattern item ${next.shape}/${next.color}`
      return decoys.some(same) ? 'decoy equals the next item' : ''
    }
    case 'rule': {
      const terms = r.prompt[0].replace(/,?\s*\.\.\.$/, '').split(', ').map(Number)
      const fits = (rule: string) => terms.every((t, i) => i === 0 || applyRule(rule, terms[i - 1]) === t)
      if (!fits(ans.text!)) return `rule ${ans.text} does not fit ${terms.join(', ')}`
      const bad = decoys.find(d => fits(d.text!))
      return bad ? `decoy rule ${bad.text} also fits` : ''
    }
    case 'angle': {
      if (r.visual?.kind !== 'angle') return 'no angle visual'
      const t = angleType(r.visual.degrees)
      return ans.text === t ? (decoys.some(d => d.text === t) ? 'decoy equals answer' : '') : `answer ${ans.text} != ${t}`
    }
    case 'angletype': {
      const { a, ds } = numericAll()
      if (angleType(a) !== arg) return `answer ${a}° is not ${arg}`
      const bad = ds.find(d => angleType(d) === arg)
      return bad === undefined ? '' : `decoy ${bad}° is also ${arg}`
    }
    case 'barmax': case 'barmin': {
      if (r.visual?.kind !== 'bars') return 'no bars visual'
      const { values, labels } = r.visual
      const target = kind === 'barmax' ? Math.max(...values) : Math.min(...values)
      if (values.filter(v => v === target).length !== 1) return 'bar chart has a tie'
      const label = labels[values.indexOf(target)]
      return ans.text === label ? (decoys.some(d => d.text === label) ? 'decoy equals answer' : '') : `answer ${ans.text} != ${label}`
    }
    case 'pt': {
      const expected = `(${arg.split(',').join(', ')})`
      return ans.text === expected ? (decoys.some(d => d.text === expected) ? 'decoy equals answer' : '') : `answer ${ans.text} != ${expected}`
    }
    case 'digitof': {
      const [vS, placeS] = arg.split(',')
      const expected = digitAt(Number(vS), Number(placeS))
      const { a, ds } = numericAll()
      if (a !== expected) return `answer ${a} != digit ${expected} of ${vS} at place ${placeS}`
      return ds.includes(expected) ? 'decoy equals answer' : ''
    }
    case 'roundu': {
      // Exact half-up rounding, recomputed in whole units so a .5 tie is never a float accident.
      const [units, places, to] = arg.split(',').map(Number)
      const step = Math.pow(10, places - to)
      const q = Math.floor(units / step), rem = units - q * step
      const expected = (rem * 2 >= step ? q + 1 : q) / Math.pow(10, to)
      const { a, ds } = numericAll()
      if (!close(a, expected)) return `answer ${ans.text} != ${expected} (round ${units}e-${places} to ${to} places)`
      return ds.some(d => close(d, expected)) ? 'decoy equals answer' : ''
    }
    case 'digit': {
      const [place, d] = arg.split(',').map(Number)
      const { a, ds } = numericAll()
      if (digitAt(a, place) !== d) return `answer ${a} has no ${d} at place ${place}`
      const bad = ds.find(x => digitAt(x, place) === d)
      return bad === undefined ? '' : `decoy ${bad} also has ${d} at place ${place}`
    }
    default:
      return `unknown check ${kind}`
  }
}

describe('math correctness (answers recomputed independently, decoys never equal)', () => {
  const ARITHMETIC = ['multiply', 'divide', 'wordproblems', 'placevalue', 'evenodd']
  // Grades whose content is data-defined (shape names, heavier/lighter facts, choosing units): nothing to recompute.
  const DATA_DEFINED: Record<string, number[]> = { shapes: [0, 1, 2], measurement: [0, 1] }
  for (const gen of MATH) {
    for (const grade of gen.grades) {
      it(`${gen.id} grade ${grade}: 300 riddles verify`, () => {
        const errs: string[] = []
        let total = 0, checked = 0
        for (const tier of TIERS) {
          const rng = new Rng(`verify-${gen.id}-${grade}-${tier}`)
          for (let i = 0; i < 100; i++) {
            const r = gen.make(grade, tier, rng)
            total++
            let e: string | null
            try { e = verify(r) } catch (ex) { e = String(ex) }
            if (e === null) continue
            checked++
            if (e) errs.push(`t${tier} #${i}: ${e} :: ${r.prompt.join(' / ')} [${r.choices.map(c => c.text ?? JSON.stringify(c.visual)).join(' | ')}] key=${r.key.split('|')[1]}`)
          }
        }
        expect(errs.slice(0, 6)).toEqual([])
        // Every family exposes a check on a good share of its riddles; arithmetic families on all of them.
        const share = checked / total
        if (ARITHMETIC.includes(gen.id)) expect(share, `${gen.id} g${grade}: only ${checked}/${total} riddles carry a check`).toBe(1)
        else if (!DATA_DEFINED[gen.id]?.includes(grade)) expect(share, `${gen.id} g${grade}: only ${checked}/${total} riddles carry a check`).toBeGreaterThan(0.3)
      })
    }
  }

  it('word problems use many distinct templates per grade', () => {
    const wp = MATH.find(g => g.id === 'wordproblems')!
    for (const grade of wp.grades) {
      const rng = new Rng('wp-templates-' + grade)
      const shapes = new Set<string>()
      for (let i = 0; i < 200; i++) {
        const r = wp.make(grade, 2, rng)
        // Template signature: the prompt with numbers and names blanked out.
        shapes.add(r.prompt.join(' ').replace(/\d+(\.\d+)?/g, '#').replace(/\b[A-Z][a-z]+\b/g, 'N'))
      }
      expect(shapes.size, `grade ${grade} has ${shapes.size} templates`).toBeGreaterThanOrEqual(12)
    }
  })
})

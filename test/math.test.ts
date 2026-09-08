import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { TIERS, type Choice, type Generator, type Riddle } from '../src/content/types'
import { MATH } from '../src/content/generators/math'
import { article } from '../src/content/generators/mathutil'
import { counting, addSub } from '../src/content/generators/counting'
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

// ------------------------------------------------- regressions from the expert content review

const byId = (id: string): Generator => MATH.find(g => g.id === id)!
const compareGen = byId('compare'), multiplyGen = byId('multiply'), divideGen = byId('divide')

/** Runs `check` over every grade/tier of one generator, collecting the first few failures. */
function sweepMath(gen: Generator, seeds: number, check: (r: Riddle) => string | null): void {
  const errs: string[] = []
  for (const grade of gen.grades) for (const tier of TIERS) {
    const rng = new Rng(`regress-${gen.id}-${grade}-${tier}`)
    for (let i = 0; i < seeds; i++) {
      const r = gen.make(grade, tier, rng)
      const e = check(r)
      if (e) errs.push(`g${grade} t${tier} #${i}: ${e} :: ${r.prompt.join(' / ')} [${r.choices.map(c => c.text ?? 'pic').join(' | ')}]`)
    }
  }
  expect(errs.slice(0, 5)).toEqual([])
}

const FAMILIES = () => [counting, addSub, compareGen, multiplyGen, divideGen]

describe('number families: review regressions', () => {
  it("'between' never offers an endpoint or a number beside one", () => {
    sweepMath(compareGen, 200, r => {
      const check = r.key.split('|')[1]
      if (!check.startsWith('between:')) return null
      const [a, b] = check.slice('between:'.length).split(',').map(Number)
      const ansV = num(r.choices[r.answer])
      if (!(ansV > a && ansV < b)) return `answer ${ansV} is not strictly between ${a} and ${b}`
      for (const [i, c] of r.choices.entries()) {
        if (i === r.answer) continue
        const v = num(c)
        // A child who reads "between" inclusively must still be wrong, so a and b (and a-1, b+1) are out.
        if (v > a - 2 && v < b + 2) return `decoy ${v} is an endpoint of [${a}, ${b}] or sits beside one`
      }
      return null
    })
  })

  it('counting and addsub never show or offer a negative number', () => {
    for (const gen of [counting, addSub]) sweepMath(gen, 200, r => {
      for (const line of r.prompt) if (/(^|[\s,([])-\d/.test(line)) return `prompt line shows a negative number: ${line}`
      // Number-word choices ("sixteen") have no numeric form; the digit choices must never go below 0.
      for (const c of r.choices) { const v = valueOf(c); if (v !== null && v < 0) return `choice ${c.text} is negative` }
      return null
    })
  })

  it('skip-counting sequences step evenly, stay non-negative, and no decoy is the answer', () => {
    sweepMath(counting, 200, r => {
      if (r.skill !== 'math: skip counting') return null
      const terms = r.prompt[0].replace(/,\s*\.\.\.$/, '').split(', ').map(Number)
      if (terms.length !== 4 || terms.some(t => !Number.isInteger(t) || t < 0)) return `bad sequence "${r.prompt[0]}"`
      const step = terms[1] - terms[0]
      if (terms.some((t, i) => i > 0 && t - terms[i - 1] !== step)) return `uneven sequence "${r.prompt[0]}"`
      const expected = terms[3] + step
      if (expected < 0) return `the next term would be negative (${expected})`
      if (num(r.choices[r.answer]) !== expected) return `answer is not ${expected}`
      for (const [i, c] of r.choices.entries()) if (i !== r.answer && num(c) === expected) return 'a decoy equals the answer'
      return null
    })
  })

  it('the ten-frame prompt matches how many frames are drawn', () => {
    sweepMath(counting, 200, r => {
      if (r.visual?.kind !== 'tenframe') return null
      const two = r.visual.count > 10
      if (r.prompt[0].includes('ten frames') !== two) return `"${r.prompt[0]}" does not match a count of ${r.visual.count}`
      // With two frames drawn, "10" is a defensible reading of one frame, so it must not be offered.
      if (two && r.choices.some(c => num(c) <= 10)) return 'a choice of 10 or less is defensible against two frames'
      return null
    })
  })

  it('two choices never carry the same value', () => {
    for (const gen of FAMILIES()) sweepMath(gen, 150, r => {
      if (!r.choices.every(c => /^\d[\d,]*(\.\d+)?$|^\d+\/\d+$/.test(c.text ?? ''))) return null
      const vals = r.choices.map(num)
      for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) if (close(vals[i], vals[j])) return `two choices are both ${vals[i]}`
      return null
    })
  })

  it('no tier or grade regresses: the easiest item of a tier never undercuts tier 1', () => {
    const floorMetric = (gen: Generator, grade: number, tier: number) => {
      const rng = new Rng(`floor-${gen.id}-${grade}-${tier}`)
      let m = Infinity
      for (let i = 0; i < 200; i++) m = Math.min(m, gen.make(grade as any, tier as any, rng).metric)
      return m
    }
    for (const gen of FAMILIES()) {
      for (const grade of gen.grades) {
        const t1 = floorMetric(gen, grade, 1), t3 = floorMetric(gen, grade, 3)
        expect(t3, `${gen.id} g${grade}: tier-3 floor ${t3.toFixed(1)} below tier-1 floor ${t1.toFixed(1)}`).toBeGreaterThanOrEqual(t1 * 0.95)
      }
      for (let i = 1; i < gen.grades.length; i++) {
        const prev = floorMetric(gen, gen.grades[i - 1], 1), cur = floorMetric(gen, gen.grades[i], 1)
        expect(cur, `${gen.id}: grade ${gen.grades[i]} tier-1 floor ${cur.toFixed(1)} below grade ${gen.grades[i - 1]}'s ${prev.toFixed(1)}`).toBeGreaterThanOrEqual(prev * 0.95)
      }
    }
  })

  it('addsub: every tier adds numbers the easier tiers could not reach', () => {
    const CEIL: Record<number, number[]> = { 0: [5, 7, 10], 1: [10, 15, 20], 2: [30, 60, 100], 3: [200, 500, 1000], 4: [2000, 10000, 100000] }
    for (const grade of [0, 1, 2, 3, 4] as const) for (const tier of TIERS) {
      const rng = new Rng(`addsub-floor-${grade}-${tier}`)
      const floor = tier > 1 ? CEIL[grade][tier - 2] : grade === 0 ? 1 : CEIL[grade - 1][0]
      for (let i = 0; i < 200; i++) {
        const r = addSub.make(grade, tier, rng)
        const parts = r.prompt[0].split(' ')
        const total = Number(parts[0]) + Number(parts[2])
        expect(total, `g${grade} t${tier}: "${r.prompt[0]}" is an easier tier's fact`).toBeGreaterThan(floor)
        expect(total, `g${grade} t${tier}: "${r.prompt[0]}" is over the grade ceiling`).toBeLessThanOrEqual(CEIL[grade][tier - 1])
      }
    }
  })

  it('addsub: grade 4 stays on whole numbers (decimals are the grade-5 standard)', () => {
    for (const tier of TIERS) {
      const rng = new Rng(`addsub-g4-${tier}`)
      for (let i = 0; i < 200; i++) expect(addSub.make(4, tier, rng).prompt[0]).not.toMatch(/\./)
    }
  })

  it('addsub: the addition picture shows the two addends from the prompt', () => {
    sweepMath(addSub, 200, r => {
      const v = r.visual
      if (v?.kind !== 'counters' || !Array.isArray(v.groups)) return null
      const parts = r.prompt[0].split(' ')
      if (v.groups.join('+') !== `${Number(parts[0])}+${Number(parts[2])}`) return `picture shows ${v.groups.join(' + ')}`
      return null
    })
  })

  it('multiply: grade 2 stays in words and its tier 3 products start at 12', () => {
    for (const tier of TIERS) {
      const rng = new Rng(`mul-g2-${tier}`)
      for (let i = 0; i < 200; i++) {
        const r = multiplyGen.make(2, tier, rng)
        expect(r.prompt.join(' '), 'grade 2 has not met the x symbol yet').not.toMatch(/\bx\b/)
        const [a, b] = r.key.split('|')[1].slice(4).split('*').map(Number)
        if (tier === 3) expect(a * b, `"${r.prompt.join(' / ')}" is a tier-1 fact`).toBeGreaterThanOrEqual(12)
      }
    }
  })

  it('multiply: grade 4 tier 3 no longer serves plain "x 10"', () => {
    const rng = new Rng('mul-g4-t3')
    for (let i = 0; i < 200; i++) {
      const r = multiplyGen.make(4, 3, rng)
      const [a, b] = r.key.split('|')[1].slice(4).split('*').map(Number)
      expect(Math.min(a, b), `"${r.prompt[0]}" is a tier-1 item`).not.toBe(10)
    }
  })

  it('divide: grade 2 explains the division sign, shares at least 2, and keeps tiers apart', () => {
    const BAND: Record<number, [number, number]> = { 1: [4, 12], 2: [12, 24], 3: [15, 25] }
    for (const tier of TIERS) {
      const rng = new Rng(`div-g2-${tier}`)
      for (let i = 0; i < 200; i++) {
        const r = divideGen.make(2, tier, rng)
        const [t, d] = r.key.split('|')[1].slice(4).split('/').map(Number)
        expect(t / d, `a "row" of one in "${r.prompt.join(' / ')}"`).toBeGreaterThanOrEqual(2)
        expect(t, `dividend ${t} is outside the tier-${tier} band`).toBeGreaterThanOrEqual(BAND[tier][0])
        expect(t, `dividend ${t} is outside the tier-${tier} band`).toBeLessThanOrEqual(BAND[tier][1])
        if (r.prompt[0].includes('÷')) expect(r.prompt.length, 'the division sign needs a word line at grade 2').toBeGreaterThan(1)
      }
    }
  })

  it('compare: a fraction answer is never the only one of its kind', () => {
    sweepMath(compareGen, 200, r => {
      if (!r.choices.every(c => /^\d+\/\d+$/.test(c.text ?? ''))) return null
      const part = (k: number) => r.choices.map(c => Number(c.text!.split('/')[k]))
      const lone = (vals: number[]) => new Set(vals).size === 2 && vals.filter(v => v === vals[r.answer]).length === 1
      if (lone(part(0))) return 'the answer is the only fraction with its numerator'
      if (lone(part(1))) return 'the answer is the only fraction with its denominator'
      return null
    })
  })

  it('compare: statement choices are never introduced as "which sign"', () => {
    sweepMath(compareGen, 200, r => (r.prompt.some(l => /sign/i.test(l)) ? 'asks which sign fills the blank but offers whole statements' : null))
  })
})

// ------------------------------------------------- regressions from the expert content review

const family = (id: string) => MATH.find(g => g.id === id)!
/** `seeds` riddles from one generator/grade/tier, on a fixed seed. */
const draw = (id: string, grade: number, tier: number, seeds: number): Riddle[] => {
  const gen = family(id)
  const rng = new Rng(`regression-${id}-${grade}-${tier}`)
  return Array.from({ length: seeds }, () => gen.make(grade as any, tier as any, rng))
}
/** The numbers printed in a sequence prompt ("3, 6, __, 12"), or null for a picture pattern. */
const runOf = (r: Riddle): number[] | null => {
  const line = r.prompt[0].replace(/,?\s*\.\.\.$/, '')
  if (!/^-?\d+(, (-?\d+|__))+$/.test(line)) return null
  return line.split(', ').filter(t => t !== '__').map(Number)
}
/** How a riddle reads, ignoring the order the choices happen to be shuffled into. */
const shape = (r: Riddle): string => `${r.prompt.join(' / ')} :: ${JSON.stringify(r.visual ?? null)} :: ${r.choices.map(c => c.text ?? JSON.stringify(c.visual)).slice().sort().join(', ')}`
const opOf = (rule: string) => /^(Double|Triple)/.test(rule) ? 'two-step' : rule.split(' ')[0]

describe('content review regressions', () => {
  it('sequences: every run is whole, non-negative and strictly monotonic', () => {
    const bad: string[] = []
    for (const grade of [1, 2, 3, 4, 5]) for (const tier of TIERS) {
      for (const r of draw('sequences', grade, tier, 300)) {
        const ts = runOf(r)
        if (!ts) continue
        if (ts.some(t => t < 0 || !Number.isInteger(t))) bad.push(`g${grade}t${tier} negative/fractional: ${r.prompt[0]}`)
        const up = ts.every((t, i) => i === 0 || t > ts[i - 1]), down = ts.every((t, i) => i === 0 || t < ts[i - 1])
        if (!up && !down) bad.push(`g${grade}t${tier} constant or turning: ${r.prompt[0]}`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('sequences: no choice repeats a number already printed in the run', () => {
    const bad: string[] = []
    for (const grade of [1, 2, 3, 4, 5]) for (const tier of TIERS) {
      for (const r of draw('sequences', grade, tier, 300)) {
        if (r.key.split('|')[1] === 'rule') continue
        const ts = runOf(r)
        if (!ts) continue
        for (const c of r.choices) if (ts.includes(Number(c.text))) bad.push(`g${grade}t${tier}: ${r.prompt[0]} offers ${c.text}`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('sequences: a rule question always offers the same operation with another constant', () => {
    const bad: string[] = []
    let seen = 0
    for (const grade of [4, 5]) for (const tier of TIERS) {
      for (const r of draw('sequences', grade, tier, 400)) {
        if (r.key.split('|')[1] !== 'rule') continue
        seen++
        const terms = runOf(r)!
        const ans = r.choices[r.answer].text!
        const decoys = r.choices.filter((_, i) => i !== r.answer).map(c => c.text!)
        if (!decoys.some(d => opOf(d) === opOf(ans))) bad.push(`only "${ans}" uses its operation: ${shape(r)}`)
        const dir = (rule: string) => Math.sign(applyRule(rule, terms[terms.length - 1])! - terms[terms.length - 1])
        if (!decoys.some(d => dir(d) === dir(ans))) bad.push(`only "${ans}" goes that way: ${shape(r)}`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
    expect(seen, 'no rule questions were drawn').toBeGreaterThan(50)
  })

  it('the hardest tier never draws a riddle the easiest tier can also draw', () => {
    const bad: string[] = []
    const targets: [string, number[]][] = [['sequences', [1, 2, 3, 4, 5]], ['money', [0, 1, 2, 3]], ['time', [0, 1]]]
    for (const [id, grades] of targets) for (const grade of grades) {
      const easy = new Set(draw(id, grade, 1, 400).map(shape))
      const repeat = draw(id, grade, 3, 400).map(shape).find(s => easy.has(s))
      if (repeat) bad.push(`${id} grade ${grade} tier 3 repeats tier 1: ${repeat}`)
    }
    expect(bad).toEqual([])
  })

  it('placevalue: a plain-number question never offers two choices worth the same', () => {
    const bad: string[] = []
    for (const grade of family('placevalue').grades) for (const tier of TIERS) {
      for (const r of draw('placevalue', grade, tier, 250)) {
        if (!r.choices.every(c => /^-?[\d,]+(\.\d+)?$/.test(c.text ?? ''))) continue
        const vals = r.choices.map(c => Number((c.text ?? '').replace(/,/g, '')))
        if (new Set(vals).size !== vals.length) bad.push(`g${grade}t${tier}: ${shape(r)}`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('placevalue: "the value of the d" never names a digit the number shows twice', () => {
    const bad: string[] = []
    let seen = 0
    for (const grade of family('placevalue').grades) for (const tier of TIERS) {
      for (const r of draw('placevalue', grade, tier, 250)) {
        const m = /value of the (\d) in ([\d.,]+)\?/.exec(r.prompt.join(' '))
        if (!m) continue
        seen++
        const digits = m[2].replace(/[,.]/g, '')
        if ([...digits].filter(c => c === m[1]).length !== 1) bad.push(`${r.prompt.join(' ')} has two ${m[1]}s`)
        // Whichever place that digit sits in, exactly one choice may hold its value.
        const dot = m[2].includes('.') ? m[2].replace(/,/g, '').indexOf('.') : m[2].replace(/,/g, '').length
        const plain = m[2].replace(/[,.]/g, '')
        const right = [...plain].map((c, i) => c === m[1] ? Number(c) * Math.pow(10, dot - 1 - i) : null).filter(v => v !== null) as number[]
        const hits = r.choices.filter(c => right.some(v => Math.abs(Number((c.text ?? '').replace(/,/g, '')) - v) < 1e-9))
        if (hits.length !== 1) bad.push(`${r.prompt.join(' ')} -> ${hits.length} correct choices in [${r.choices.map(c => c.text).join(' | ')}]`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
    expect(seen, 'no value questions were drawn').toBeGreaterThan(50)
  })

  it('placevalue: rounding a decimal rounds an exact half up', () => {
    const bad: string[] = []
    let ties = 0
    for (const tier of TIERS) for (const r of draw('placevalue', 5, tier, 800)) {
      const m = /^Round (\d+\.\d+) to the nearest (whole number|tenth|hundredth)\.$/.exec(r.prompt[0])
      if (!m) continue
      const to = m[2] === 'whole number' ? 0 : m[2] === 'tenth' ? 1 : 2
      const places = m[1].split('.')[1].length
      const units = Number(m[1].replace('.', ''))
      const step = Math.pow(10, places - to)
      const q = Math.floor(units / step), rem = units - q * step
      if (rem * 2 === step) ties++
      const expected = (rem * 2 >= step ? q + 1 : q) / Math.pow(10, to)
      const vals = r.choices.map(c => Number(c.text))
      if (Math.abs(vals[r.answer] - expected) > 1e-9) bad.push(`${r.prompt[0]} answered ${r.choices[r.answer].text}, want ${expected}`)
      if (vals.filter(v => Math.abs(v - expected) < 1e-9).length !== 1) bad.push(`${r.prompt[0]} has two choices worth ${expected}`)
    }
    expect(bad.slice(0, 5)).toEqual([])
    expect(ties, 'no exact .5 tie was drawn, so the tie is untested').toBeGreaterThan(0)
  })

  it('placevalue: a "which digit" question offers digits that are in the number', () => {
    const bad: string[] = []
    let seen = 0
    for (const grade of family('placevalue').grades) for (const tier of TIERS) {
      for (const r of draw('placevalue', grade, tier, 250)) {
        const m = /Which digit is in the .* place of ([\d.,]+)\?/.exec(r.prompt.join(' '))
        if (!m) continue
        seen++
        const digits = new Set([...m[1].replace(/[,.]/g, '')])
        const outside = r.choices.filter(c => !digits.has(c.text ?? ''))
        if (outside.length) bad.push(`${r.prompt.join(' ')} offers ${outside.map(c => c.text).join(',')}`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
    expect(seen, 'no digit questions were drawn').toBeGreaterThan(50)
  })

  it('placevalue: grade 3 and up never just read the ones digit', () => {
    const bad: string[] = []
    for (const grade of [3, 4]) for (const tier of TIERS) {
      for (const r of draw('placevalue', grade, tier, 250)) {
        const line = r.prompt.join(' ')
        if (/Which digit is in the ones place/.test(line)) bad.push(`g${grade}t${tier}: ${line}`)
        if (grade === 4 && /Which digit is in the tens place/.test(line)) bad.push(`g${grade}t${tier}: ${line}`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('money: a dollar or more is written as dollars, never as cents', () => {
    const bad: string[] = []
    for (const grade of family('money').grades) for (const tier of TIERS) {
      for (const r of draw('money', grade, tier, 300)) {
        for (const t of [...r.prompt, ...r.choices.map(c => c.text ?? '')]) {
          for (const m of t.matchAll(/(\d+)¢/g)) if (Number(m[1]) >= 100) bad.push(`g${grade}t${tier}: ${t}`)
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('money: "a" and "an" agree with the word or amount that follows', () => {
    const bad: string[] = []
    for (const grade of family('money').grades) for (const tier of TIERS) {
      for (const r of draw('money', grade, tier, 300)) {
        const line = r.prompt.join(' ')
        for (const m of line.matchAll(/\b(an?) (\$?[\w¢][\w¢.-]*)/gi)) {
          if (m[1].toLowerCase() !== article(m[2])) bad.push(`"${m[1]} ${m[2]}" in: ${line}`)
        }
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('money: grade 5 asks for fractions off, not bare percents', () => {
    for (const tier of TIERS) for (const r of draw('money', 5, tier, 300)) expect(r.prompt.join(' ')).not.toMatch(/% off/)
  })

  it('time: stories keep their scale and school days stay in the daytime', () => {
    const bad: string[] = []
    for (const tier of TIERS) {
      for (const r of draw('time', 4, tier, 400)) {
        const m = /starts at .* and lasts (\d+) minutes/.exec(r.prompt.join(' '))
        if (m && Number(m[1]) < 15) bad.push(`grade 4: ${r.prompt.join(' / ')}`)
      }
      for (const r of draw('time', 5, tier, 400)) {
        const line = r.prompt.join(' ')
        const m = /^(School|Camp|Practice|The show|The game) starts at (\d+):(\d+) (a\.m\.|p\.m\.) and ends at (\d+):(\d+) (a\.m\.|p\.m\.)/.exec(line)
        if (!m) continue
        const mins = (h: number, mm: number, ap: string) => ((h % 12) + (ap === 'p.m.' ? 12 : 0)) * 60 + mm
        const start = mins(+m[2], +m[3], m[4]), end = mins(+m[5], +m[6], m[7])
        if (end <= start || end > 21 * 60) bad.push(`grade 5: ${line}`)
      }
    }
    expect(bad.slice(0, 5)).toEqual([])
  })

  it('time: no question turns on the noon boundary, and grade 3 asks about the future', () => {
    for (const tier of TIERS) {
      for (const r of draw('time', 0, tier, 200)) expect(r.prompt.join(' ')).not.toMatch(/lunch/i)
      for (const r of draw('time', 3, tier, 200)) expect(r.prompt.join(' ')).not.toMatch(/What time is it in \d/)
    }
  })
})

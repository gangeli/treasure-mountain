import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { TIERS, type Choice, type Generator, type Riddle } from '../src/content/types'
import { MATH } from '../src/content/generators/math'
import { article, fracWord, plural } from '../src/content/generators/mathutil'
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

// ------------------------------------------------- regressions: shapes, fractions, word problems,
// ------------------------------------------------- even/odd and measurement (expert content review)

/** Value of every fraction word the generators can produce ("two fourths" -> 0.5). */
const WORD_VAL: Record<string, number> = (() => {
  const m: Record<string, number> = {}
  for (let d = 2; d <= 12; d++) for (let s = 1; s < d; s++) m[fracWord(s, d)] = s / d
  return m
})()
/** Numeric worth of a choice for the "no two choices are the same amount" rule, or null. */
const amountOf = (c: Choice): number | null => {
  if (c.visual?.kind === 'fraction') return c.visual.shaded / c.visual.parts
  const t = (c.text ?? '').trim()
  if (t in WORD_VAL) return WORD_VAL[t]
  if (/^\d+\/\d+$/.test(t)) return num(c)
  return null
}
/** Every number printed anywhere in a riddle. */
const numbersIn = (r: Riddle): number[] => [...r.prompt, ...r.choices.map(c => c.text ?? '')].flatMap(t => [...t.matchAll(/\d+/g)].map(m => Number(m[0])))
/** Smallest metric a generator produces for one grade/tier. */
const floorMetricOf = (id: string, grade: number, tier: number, seeds = 300): number =>
  Math.min(...draw(id, grade, tier, seeds).map(r => r.metric))

describe('shapes: review regressions', () => {
  it('"Which shape is a rectangle?" never offers a square, which is also a rectangle', () => {
    const bad: string[] = []
    for (const grade of family('shapes').grades) for (const tier of TIERS) {
      for (const r of draw('shapes', grade, tier, 250)) {
        if (!/^Which shape is an? rectangle\?$/.test(r.prompt[0])) continue
        if (r.choices.some(c => c.visual?.kind === 'shape' && c.visual.name === 'square')) bad.push(shape(r))
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('a solid look-alike phrase never contains the answer word', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('shapes', 2, tier, 300)) {
      if (r.prompt[0] !== 'Which solid is shaped like') continue
      seen++
      const ans = r.choices[r.answer].text!
      if (r.prompt.join(' ').toLowerCase().includes(ans)) bad.push(shape(r))
      if (/\bdice\b/.test(r.prompt.join(' '))) bad.push(`"a dice" is plural: ${shape(r)}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no look-alike questions were drawn').toBeGreaterThan(20)
  })

  it('a pyramid face count names the base and never offers the tetrahedron answer', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('shapes', 2, tier, 300)) {
      if (r.visual?.kind !== 'shape' || r.visual.name !== 'pyramid' || !/flat faces/.test(r.prompt.join(' '))) continue
      seen++
      if (!/square pyramid/.test(r.prompt.join(' '))) bad.push(`base not named: ${shape(r)}`)
      if (r.choices.some(c => c.text === '4')) bad.push(`4 is a triangular pyramid's face count: ${shape(r)}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no pyramid face questions were drawn').toBeGreaterThan(10)
  })

  it('grade 1 tier 3 never asks about the shapes tier 1 already covers', () => {
    const bad: string[] = []
    for (const r of draw('shapes', 1, 3, 400)) {
      if (/\b(triangle|square|rectangle)\b/.test(r.prompt.join(' '))) bad.push(r.prompt.join(' / '))
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('a drawn angle is never close enough to a straight line to be misread', () => {
    const bad: string[] = []
    for (const tier of TIERS) for (const r of draw('shapes', 4, tier, 300)) {
      if (r.visual?.kind !== 'angle') continue
      if (r.visual.degrees > 160) bad.push(`${r.visual.degrees}° drawn against a "straight" choice`)
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('a triangle angle question is ordered, and no decoy is an impossible angle', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('shapes', 5, tier, 300)) {
      const m = /^Two angles of a triangle are (\d+)° and (\d+)°\.$/.exec(r.prompt[0])
      if (!m) continue
      seen++
      if (Number(m[1]) > Number(m[2])) bad.push(`unordered pair ${m[1]}/${m[2]}: the mirrored item is a second riddle`)
      for (const c of r.choices) { const v = num(c); if (v > 179 || v < 1) bad.push(`${v}° cannot be an angle of a triangle`) }
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no triangle angle questions were drawn').toBeGreaterThan(30)
  })

  it('grade 5 coordinates stay in the first quadrant and never print the answer', () => {
    const bad: string[] = []
    for (const tier of TIERS) for (const r of draw('shapes', 5, tier, 300)) {
      if (r.skill !== 'math: coordinates') continue
      const all = [...r.prompt, ...r.choices.map(c => c.text ?? '')].join(' ')
      if (/\(-|, -/.test(all)) bad.push(`negative coordinate: ${shape(r)}`)
      // The old "which point is at (0, 6)?" template printed the answer pair verbatim.
      const ans = r.choices[r.answer].text!
      if (/^\(\d+, \d+\)$/.test(ans) && r.prompt.join(' ').includes(ans)) bad.push(`prompt prints the answer ${ans}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('"n long and m wide" names the longer side first and the picture agrees', () => {
    const bad: string[] = []
    let seen = 0
    for (const grade of [3, 4]) for (const tier of TIERS) {
      for (const r of draw('shapes', grade, tier, 250)) {
        const m = /is (\d+) (cm|m|in|ft) long and (\d+) \2 wide/.exec(r.prompt.join(' '))
        if (!m) continue
        seen++
        const lng = Number(m[1]), wid = Number(m[3])
        if (lng < wid) bad.push(`"${m[0]}" calls the shorter side long`)
        if (r.visual?.kind === 'grid' && (r.visual.w !== lng || r.visual.h !== wid)) bad.push(`picture is ${r.visual.w}x${r.visual.h} for "${m[0]}"`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no long/wide rectangles were drawn').toBeGreaterThan(30)
  })
})

describe('fractions: review regressions', () => {
  it('"has one half colored" never offers an uncoloured shape, which is cut in half too', () => {
    const bad: string[] = []
    for (const grade of [0, 1]) for (const tier of TIERS) {
      for (const r of draw('fractions', grade, tier, 300)) {
        if (!/colored\?$/.test(r.prompt[0])) continue
        if (r.choices.some(c => c.visual?.kind === 'fraction' && c.visual.shaded === 0)) bad.push(shape(r))
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('no two choices are worth the same amount (2/4 never sits beside 1/2)', () => {
    const bad: string[] = []
    for (const grade of family('fractions').grades) for (const tier of TIERS) {
      for (const r of draw('fractions', grade, tier, 250)) {
        if (/cut into/.test(r.prompt[0])) continue
        const vals = r.choices.map(amountOf)
        if (vals.some(v => v === null)) continue
        for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
          if (close(vals[i]!, vals[j]!)) bad.push(`two choices are both ${vals[i]}: ${shape(r)}`)
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('grade 2 never has to simplify: the offered fraction is the one the picture shows', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('fractions', 2, tier, 300)) {
      if (r.visual?.kind !== 'fraction' || !/fraction is/.test(r.prompt[0])) continue
      seen++
      const { parts, shaded } = r.visual
      const counted = /NOT/.test(r.prompt[0]) ? parts - shaded : shaded
      if (r.choices[r.answer].text !== `${counted}/${parts}`) bad.push(`picture shows ${counted}/${parts} but the key is ${r.choices[r.answer].text}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no naming questions were drawn').toBeGreaterThan(50)
  })

  it('"which picture shows a/b" always offers another picture cut into the same parts', () => {
    const bad: string[] = []
    let seen = 0
    for (const grade of [0, 1, 2]) for (const tier of TIERS) {
      for (const r of draw('fractions', grade, tier, 250)) {
        if (!/^Which picture/.test(r.prompt[0])) continue
        seen++
        const ans = r.choices[r.answer].visual
        if (ans?.kind !== 'fraction') continue
        const same = r.choices.filter((c, i) => i !== r.answer && c.visual?.kind === 'fraction' && c.visual.parts === ans.parts)
        if (!same.length) bad.push(`counting the parts alone solves it: ${shape(r)}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no picture-matching questions were drawn').toBeGreaterThan(50)
  })

  it('a number line is ticked in the denominator the answer uses', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('fractions', 3, tier, 300)) {
      if (r.visual?.kind !== 'numberline') continue
      seen++
      const den = Number(r.choices[r.answer].text!.split('/')[1])
      if (Math.abs(r.visual.step! - 1 / den) > 1e-9) bad.push(`line is in ${Math.round(1 / r.visual.step!)}ths but the answer is ${r.choices[r.answer].text}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no number line questions were drawn').toBeGreaterThan(30)
  })

  it('K stays in pictures and grades K-1 never meet thirds or the a/b symbol', () => {
    const bad: string[] = []
    for (const tier of TIERS) {
      for (const r of draw('fractions', 0, tier, 300)) {
        if (r.choices.some(c => c.text !== undefined)) bad.push(`K reads a word choice: ${shape(r)}`)
      }
      for (const grade of [0, 1]) for (const r of draw('fractions', grade, tier, 300)) {
        const all = [...r.prompt, ...r.choices.map(c => c.text ?? '')].join(' ')
        if (/third/.test(all)) bad.push(`thirds at grade ${grade}: ${all}`)
        if (/\d\/\d/.test(all)) bad.push(`a/b notation at grade ${grade}: ${all}`)
        if (/shaded/.test(all)) bad.push(`"shaded" is above grade ${grade} reading level: ${all}`)
        for (const c of r.choices) if (c.visual?.kind === 'fraction' && c.visual.parts === 3 && c.visual.shaded > 0) bad.push(`a thirds picture at grade ${grade}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('"1/5 of 30" never offers more than there is', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('fractions', 5, tier, 300)) {
      const m = /What is \d+\/\d+ of (\d+)\?/.exec(r.prompt.join(' ')) ?? /has (\d+) \w+ and gives away/.exec(r.prompt.join(' '))
      if (!m) continue
      seen++
      const whole = Number(m[1])
      for (const c of r.choices) if (num(c) > whole) bad.push(`${c.text} is more than the whole ${whole}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no fraction-of-a-number questions were drawn').toBeGreaterThan(20)
  })
})

describe('word problems: review regressions', () => {
  // Nouns whose plural is a distinct word and is not also a verb form ("rolls", "swims").
  const NOUNS = ['apple', 'star', 'ball', 'flower', 'heart', 'balloon', 'bug', 'cookie', 'acorn', 'sticker', 'marble', 'book', 'shell', 'crayon', 'block', 'button', 'pencil', 'card', 'coin', 'egg', 'pizza', 'page', 'kid', 'chair', 'seat', 'carton', 'ticket', 'bag', 'student', 'bird', 'leaf']
  const PLURALS = new Set(NOUNS.map(w => plural(w, 2)).filter(w => !NOUNS.includes(w)))

  it('the counter picture shows the addends and the sprite the story names', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('wordproblems', 0, tier, 300)) {
      const v = r.visual
      if (v?.kind !== 'counters') continue
      seen++
      const words = r.prompt.join(' ').toLowerCase()
      if (!words.includes(v.item) && !words.includes(plural(v.item, 2))) bad.push(`picture draws ${v.item}s but the story is about something else: ${r.prompt.join(' / ')}`)
      if (Array.isArray(v.groups)) {
        const ns = numbersIn(r)
        if (v.groups.reduce((a, b) => a + b, 0) !== v.count) bad.push(`groups ${v.groups.join('+')} do not make ${v.count}`)
        for (const g of v.groups) if (!ns.includes(g)) bad.push(`group of ${g} is not a number in the prompt`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no picture problems were drawn').toBeGreaterThan(100)
  })

  it('only food is eaten and only round things roll away', () => {
    const bad: string[] = []
    for (const grade of [0, 1]) for (const tier of TIERS) {
      for (const r of draw('wordproblems', grade, tier, 300)) {
        const t = r.prompt.join(' ')
        if (/ eats /.test(t) && !/\b(apple|cookie)s?\b/.test(t)) bad.push(`inedible: ${t}`)
        if (/rolls? away/.test(t) && !/\b(ball|balloon|acorn|apple)s?\b/.test(t)) bad.push(`does not roll: ${t}`)
        if (/(fly|flies) away/.test(t) && /\b(puppy|puppies|squirrel|squirrels|turtle|turtles)\b/.test(t)) bad.push(`cannot fly: ${t}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('a quantity of 1 never takes a plural noun', () => {
    const bad: string[] = []
    for (const grade of family('wordproblems').grades) for (const tier of TIERS) {
      for (const r of draw('wordproblems', grade, tier, 300)) {
        const t = r.prompt.join(' ')
        for (const m of t.matchAll(/\b1 ([a-z]+)\b/g)) if (PLURALS.has(m[1])) bad.push(`"1 ${m[1]}" in: ${t}`)
        if (/\bThere are 1\b/.test(t) || /\b1 people\b/.test(t)) bad.push(`plural noun after 1 in: ${t}`)
        if (/\b1 [a-z]+ (are|were)\b/.test(t) || /\b1 more (crawl|hop|roll|fly|swim|climb)\b/.test(t)) bad.push(`plural verb after 1 in: ${t}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('kindergarten adds and takes away only, inside its tier band', () => {
    const BAND: Record<number, [number, number]> = { 1: [2, 5], 2: [6, 7], 3: [8, 10] }
    const bad: string[] = []
    for (const tier of TIERS) for (const r of draw('wordproblems', 0, tier, 300)) {
      if (r.skill === 'math: comparing word problems') bad.push(`comparing is a grade-1 standard: ${r.prompt.join(' / ')}`)
      const total = r.visual?.kind === 'counters' ? r.visual.count : null
      if (total === null) continue
      const [lo, hi] = BAND[tier]
      if (total < lo || total > hi) bad.push(`total ${total} is outside the tier-${tier} band ${lo}-${hi}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('no story is impossible and no answer goes below zero', () => {
    const bad: string[] = []
    for (const grade of family('wordproblems').grades) for (const tier of TIERS) {
      for (const r of draw('wordproblems', grade, tier, 300)) {
        for (const c of r.choices) { const v = valueOf(c); if (v !== null && v < 0) bad.push(`negative choice ${c.text}: ${r.prompt.join(' / ')}`) }
        const t = r.prompt.join(' ')
        const gave = /had (\d+) \w+, gave (\d+)/.exec(t)
        if (gave && Number(gave[2]) > Number(gave[1])) bad.push(`gives away more than there is: ${t}`)
        const bus = /A bus holds (\d+) people\. \d+ buses are full and (\d+) people ride on one more bus/.exec(t)
        if (bus && Number(bus[2]) >= Number(bus[1])) bad.push(`the last bus is over its stated capacity: ${t}`)
        const rope = /cut into (\d+) equal pieces\. \w+ uses (\d+) of the pieces/.exec(t)
        if (rope && Number(rope[2]) >= Number(rope[1])) bad.push(`uses every piece, so the two steps cancel: ${t}`)
        const cls = /(\d+) classes of \d+ students ride (\d+) buses/.exec(t)
        if (cls && cls[1] === cls[2]) bad.push(`classes = buses, so the answer is a number already printed: ${t}`)
        const pizza = /(\d+) friends share (\d+) pizzas equally/.exec(t)
        if (pizza && Number(pizza[2]) % Number(pizza[1]) === 0) bad.push(`shares out evenly, so no fraction reasoning is needed: ${t}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('grade 3 tier 2 and 3 never fall back to a 2s-table fact', () => {
    const bad: string[] = []
    for (const tier of [2, 3]) for (const r of draw('wordproblems', 3, tier, 300)) {
      const m = /^num:(\d+)\*(\d+)$/.exec(r.key.split('|')[1])
      if (!m) continue
      const a = Number(m[1]), b = Number(m[2])
      if (a === b) bad.push(`equal factors ${a}x${b}: ${r.prompt.join(' / ')}`)
      if (a * b < 20) bad.push(`${a}x${b} is below the tier-1 ceiling: ${r.prompt.join(' / ')}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('grade 1 tier 3 missing addends work to a real target', () => {
    const bad: string[] = []
    for (const r of draw('wordproblems', 1, 3, 400)) {
      const m = /has (\d+) \w+\. How many more does \w+ need to have (\d+)\?/.exec(r.prompt.join(' '))
      if (!m) continue
      const have = Number(m[1]), want = Number(m[2])
      if (want < 16 || want - have < 3) bad.push(`${have} -> ${want} is a kindergarten missing addend`)
    }
    expect(bad.slice(0, 3)).toEqual([])
  })
})

describe('even, odd, factors and primes: review regressions', () => {
  it('prime and composite items cannot be answered by parity alone', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('evenodd', 5, tier, 300)) {
      const check = r.key.split('|')[1]
      if (check !== 'prime' && check !== 'composite') continue
      seen++
      const vals = r.choices.map(num)
      const ansEven = vals[r.answer] % 2 === 0
      if (vals.filter(v => (v % 2 === 0) === ansEven).length === 1) bad.push(`the key is the only ${ansEven ? 'even' : 'odd'} choice: ${shape(r)}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no prime/composite questions were drawn').toBeGreaterThan(50)
  })

  it('factor items cannot be answered by "pick the smallest" or "pick the biggest"', () => {
    const bad: string[] = []
    let seen = 0
    for (const grade of [4, 5]) for (const tier of TIERS) {
      for (const r of draw('evenodd', grade, tier, 300)) {
        const check = r.key.split('|')[1]
        if (!/^(not)?factor:/.test(check)) continue
        seen++
        const vals = r.choices.map(num), a = vals[r.answer]
        if (check.startsWith('not')) { if (!vals.some(v => v > a)) bad.push(`the key is the biggest choice: ${shape(r)}`) }
        else if (!vals.some(v => v < a)) bad.push(`the key is the smallest choice: ${shape(r)}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no factor questions were drawn').toBeGreaterThan(50)
  })

  it('grades 2 and 3 stay inside the place-value range they are taught', () => {
    const bad: string[] = []
    for (const grade of [2, 3]) for (const tier of TIERS) {
      for (const r of draw('evenodd', grade, tier, 300)) {
        for (const v of numbersIn(r)) if (v > 999) bad.push(`g${grade}t${tier} shows ${v}: ${shape(r)}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('no choice is impossible: no filler options and no sub-operand common multiples', () => {
    const bad: string[] = []
    let seenLcm = 0
    for (const grade of family('evenodd').grades) for (const tier of TIERS) {
      for (const r of draw('evenodd', grade, tier, 300)) {
        for (const c of r.choices) if (/^(Neither|It could be either)$/.test(c.text ?? '')) bad.push(`filler option "${c.text}"`)
        const m = /^lcm:(\d+),(\d+)$/.exec(r.key.split('|')[1])
        if (!m) continue
        seenLcm++
        const bigger = Math.max(Number(m[1]), Number(m[2]))
        for (const c of r.choices) if (num(c) <= bigger) bad.push(`${c.text} cannot be a common multiple of ${m[1]} and ${m[2]}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seenLcm, 'no LCM questions were drawn').toBeGreaterThan(20)
  })

  it('grade 5 tier 3 never re-serves a tier 1 prime or composite', () => {
    const keyOf = (r: Riddle) => `${r.key.split('|')[1]}:${r.choices[r.answer].text}`
    const easy = new Set(draw('evenodd', 5, 1, 400).filter(r => /^(prime|composite)$/.test(r.key.split('|')[1])).map(keyOf))
    const repeat = draw('evenodd', 5, 3, 400).filter(r => /^(prime|composite)$/.test(r.key.split('|')[1])).map(keyOf).find(k => easy.has(k))
    expect(repeat).toBeUndefined()
  })
})

describe('measurement: review regressions', () => {
  it('every thermometer decoy is at least one drawn tick from the answer', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('measurement', 2, tier, 300)) {
      if (r.prompt[0] !== 'What temperature does the') continue
      seen++
      const unit = /°C/.test(r.choices[r.answer].text!) ? 'C' : 'F'
      const tick = unit === 'F' ? 10 : 5
      const vals = r.choices.map(num), a = vals[r.answer]
      if (a % tick !== 0) bad.push(`${a}°${unit} does not sit on a tick`)
      if (unit === 'C' && vals.some(v => v < 0)) bad.push(`below zero at grade 2: ${shape(r)}`)
      for (const [i, v] of vals.entries()) if (i !== r.answer && Math.abs(v - a) < tick) bad.push(`${v}°${unit} is inside one tick of ${a}°${unit}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no thermometer readings were drawn').toBeGreaterThan(50)
  })

  it('every scale choice is something the picture shows', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('measurement', 0, tier, 300)) {
      if (r.visual?.kind !== 'scale') continue
      seen++
      const on = new Set([r.visual.left, r.visual.right, 'They weigh the same'])
      for (const c of r.choices) if (!on.has(c.text ?? '')) bad.push(`"${c.text}" is not on the scale: ${shape(r)}`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no scale questions were drawn').toBeGreaterThan(20)
  })

  it('grade 1 never meets metric prefixes or weight units', () => {
    const bad: string[] = []
    for (const tier of TIERS) for (const r of draw('measurement', 1, tier, 300)) {
      const all = [...r.prompt, ...r.choices.map(c => c.text ?? '')].join(' ')
      if (/\b(centimeters?|meters?|kilometers?|ounces?|pounds?|tons?)\b/.test(all)) bad.push(all)
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('a conversion prompt never writes "1 cups", and hour answers carry their unit', () => {
    const UNITS = new Set(['inches', 'feet', 'minutes', 'seconds', 'hours', 'days', 'cups', 'quarts', 'gallons', 'meters', 'centimeters', 'millimeters', 'grams', 'kilograms', 'liters', 'milliliters', 'ounces', 'pounds', 'tons', 'yards', 'weeks', 'miles'])
    const bad: string[] = []
    for (const grade of [4, 5]) for (const tier of TIERS) {
      for (const r of draw('measurement', grade, tier, 300)) {
        for (const m of r.prompt.join(' ').matchAll(/\b1 ([a-z]+)\b/g)) if (UNITS.has(m[1])) bad.push(`"1 ${m[1]}" in: ${r.prompt.join(' / ')}`)
        if (!/= \? hours$/.test(r.prompt[0])) continue
        for (const c of r.choices) if (!/ hours?$/.test(c.text ?? '')) bad.push(`bare hour answer "${c.text}" beside unit-carrying siblings`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('a bar chart never claims a unit the picture does not draw', () => {
    const bad: string[] = []
    let seen = 0
    for (const tier of TIERS) for (const r of draw('measurement', 5, tier, 300)) {
      if (r.visual?.kind !== 'bars') continue
      seen++
      for (const c of r.choices) if (!/^(Mon|Tue|Wed|Thu|Fri|\d+)$/.test(c.text ?? '')) bad.push(`"${c.text}" carries a unit the chart has no axis for`)
    }
    expect(bad.slice(0, 3)).toEqual([])
    expect(seen, 'no chart questions were drawn').toBeGreaterThan(30)
  })
})

describe('shared math helpers: review regressions', () => {
  const REVIEWED = ['shapes', 'fractions', 'wordproblems', 'evenodd', 'measurement']

  it('a line never ends on a bare number split from its unit', () => {
    const bad: string[] = []
    for (const id of REVIEWED) for (const grade of family(id).grades) for (const tier of TIERS) {
      for (const r of draw(id, grade, tier, 200)) {
        for (const [i, line] of r.prompt.entries()) {
          if (i === r.prompt.length - 1) continue
          if (/\s[\d,]+$/.test(line) && /^[a-z]/.test(r.prompt[i + 1])) bad.push(`${id}: "${line}" / "${r.prompt[i + 1]}"`)
        }
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('reshuffling the buttons does not make a new riddle', () => {
    const bad: string[] = []
    for (const id of REVIEWED) for (const grade of family(id).grades) for (const tier of TIERS) {
      const byShape = new Map<string, string>()
      for (const r of draw(id, grade, tier, 200)) {
        const s = shape(r)
        const seen = byShape.get(s)
        if (seen === undefined) byShape.set(s, r.key)
        else if (seen !== r.key) bad.push(`${id} g${grade} t${tier}: one riddle has two keys: ${s}`)
      }
    }
    expect(bad.slice(0, 3)).toEqual([])
  })

  it('no reviewed family lets a harder tier or grade start below an easier one', () => {
    for (const id of REVIEWED) {
      const gs = family(id).grades
      for (const grade of gs) {
        const t1 = floorMetricOf(id, grade, 1), t2 = floorMetricOf(id, grade, 2), t3 = floorMetricOf(id, grade, 3)
        expect(t2, `${id} g${grade}: tier-2 floor ${t2.toFixed(1)} below tier-1 floor ${t1.toFixed(1)}`).toBeGreaterThanOrEqual(t1)
        expect(t3, `${id} g${grade}: tier-3 floor ${t3.toFixed(1)} below tier-2 floor ${t2.toFixed(1)}`).toBeGreaterThanOrEqual(t2)
      }
      for (let i = 1; i < gs.length; i++) {
        const prev = floorMetricOf(id, gs[i - 1], 1), cur = floorMetricOf(id, gs[i], 1)
        expect(cur, `${id}: grade ${gs[i]} tier-1 floor ${cur.toFixed(1)} below grade ${gs[i - 1]}'s ${prev.toFixed(1)}`).toBeGreaterThan(prev)
      }
    }
  })
})

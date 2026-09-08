import type { Generator, Grade, Tier, Riddle } from '../types'
import type { Rng } from '../../engine/rng'
import { riddle, shuffled, choiceCount, cap, numberWord, nearbyNumbers } from '../types'
import { THINGS, type Thing } from '../data/comparisons'
import { pickLevel } from './thinkingUtil'

type Attr = 'len' | 'mass' | 'speed'
interface AttrDef { attr: Attr; more: string; most: string; least: string; tall?: boolean }
const ATTRS: AttrDef[] = [
  { attr: 'len', more: 'bigger', most: 'biggest', least: 'smallest' },
  { attr: 'len', more: 'longer', most: 'longest', least: 'shortest' },
  { attr: 'len', more: 'taller', most: 'tallest', least: 'shortest', tall: true },
  { attr: 'mass', more: 'heavier', most: 'heaviest', least: 'lightest' },
  { attr: 'speed', more: 'faster', most: 'fastest', least: 'slowest' },
]

/** Round to two significant figures and print without trailing zeros. */
export function nice(v: number): string {
  if (v === 0) return '0'
  const p = Math.pow(10, Math.floor(Math.log10(Math.abs(v))) - 1)
  const r = Math.round(v / p) * p
  return String(Number(r.toPrecision(2)))
}
export const lenText = (m: number, imperial: boolean): string => {
  if (!imperial) return m >= 1000 ? `${nice(m / 1000)} km` : m >= 1 ? `${nice(m)} m` : `${nice(m * 100)} cm`
  const ft = m * 3.281
  return ft >= 5280 ? `${nice(ft / 5280)} miles` : ft >= 1 ? `${nice(ft)} feet` : `${nice(m * 39.37)} inches`
}
export const massText = (kg: number, imperial: boolean): string => {
  if (!imperial) return kg >= 1000 ? `${nice(kg / 1000)} tonnes` : kg >= 1 ? `${nice(kg)} kg` : `${nice(kg * 1000)} g`
  const lb = kg * 2.205
  return lb >= 2000 ? `${nice(lb / 2000)} tons` : lb >= 1 ? `${nice(lb)} pounds` : `${nice(kg * 35.27)} ounces`
}
export const speedText = (kmh: number, imperial: boolean): string => imperial ? `${nice(kmh * 0.621)} mph` : `${nice(kmh)} km/h`

const texts = (cs: { text?: string }[]) => cs.map(c => c.text).join(', ')

/** Picks `k` things whose values on `attr` all differ pairwise by at least `ratio`. */
function pickSpread(rng: Rng, cands: Thing[], attr: Attr, k: number, ratio: number): Thing[] {
  for (let r = ratio; r >= 1.5; r = r * 0.8) {
    for (let t = 0; t < 12; t++) {
      const chosen: Thing[] = []
      for (const c of rng.shuffle(cands)) {
        const v = c[attr]!
        if (chosen.every(o => Math.max(v, o[attr]!) / Math.min(v, o[attr]!) >= r)) chosen.push(c)
        if (chosen.length === k) return chosen
      }
    }
  }
  throw new Error(`comparisons: cannot pick ${k} things on ${attr}`)
}

function relativeQ(grade: Grade, tier: Tier, level: Grade, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const maxLevel = Math.min(3, level) as Grade
  const def = rng.pick(ATTRS.filter(d => level >= 1 || d.attr !== 'speed'))
  const cands = THINGS.filter(t => t.level <= maxLevel && t[def.attr] !== undefined && (!def.tall || t.tall))
  const ratio = level === 0 ? 6 : level === 1 ? 3 : 2
  const pair = n === 3 && (level === 0 ? tier === 1 || rng.bool(0.5) : level === 1 && rng.bool(0.3))
  if (pair) {
    const [a, b] = pickSpread(rng, cands, def.attr, 2, ratio)
    const answer = a[def.attr]! > b[def.attr]! ? a.n : b.n
    const { choices, answer: idx } = shuffled(rng, answer, [a.n === answer ? b.n : a.n, 'they are the same'], n)
    const prompt = [`Which is ${def.more}:`, `${a.n} or ${b.n}?`]
    return riddle({ family: 'comparisons', skill: `thinking: comparing (${def.more})`, prompt, choices, answer: idx, spoken: `${prompt.join(' ')} ${texts(choices)}?`, metric: level * 10 + 1, grade, tier, key: `comparisons|${def.more}|${[a.n, b.n].sort().join('/')}` })
  }
  const things = pickSpread(rng, cands, def.attr, n, ratio)
  const least = level >= 2 && rng.bool(0.4)
  const best = things.reduce((m, t) => (least ? t[def.attr]! < m[def.attr]! : t[def.attr]! > m[def.attr]!) ? t : m)
  const { choices, answer } = shuffled(rng, best.n, things.filter(t => t !== best).map(t => t.n), n)
  const word = least ? def.least : def.most
  const prompt = rng.pick([[`Which one is the ${word}?`], ['Think about size and speed!', `Which of these is the ${word}?`].slice(def.attr === 'speed' ? 0 : 1)])
  return riddle({ family: 'comparisons', skill: `thinking: comparing (${word})`, prompt, choices, answer, spoken: `Which one is the ${word}? ${texts(choices)}?`, metric: level * 10 + 3 + (least ? 2 : 0) + Math.max(0, 4 - ratio), grade, tier, key: `comparisons|${word}|${things.map(t => t.n).sort().join('/')}` })
}

function estimateQ(grade: Grade, tier: Tier, level: Grade, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const imperial = rng.bool(0.4)
  const attrs: Attr[] = level >= 4 ? ['speed', 'speed', 'mass', 'len'] : ['len', 'len', 'mass']
  const attr = rng.pick(attrs)
  const cands = THINGS.filter(t => t.level <= Math.min(4, level) && t[attr] !== undefined && !(attr === 'len' && t.len! >= 1000) && !(attr === 'mass' && t.mass! >= 1e6) && !(attr === 'len' && t.len! < 0.01) && !(attr === 'mass' && t.mass! < 0.001))
  const t = rng.pick(cands)
  const v = t[attr]!
  const fmt = attr === 'len' ? (x: number) => lenText(x, imperial) : attr === 'mass' ? (x: number) => massText(x, imperial) : (x: number) => speedText(x, imperial)
  const answer = fmt(v)
  const factors = level >= 4 ? [10, 0.1, 3, 1 / 3, 100] : [10, 0.1, 4, 0.25, 100]
  const decoys = rng.shuffle(factors).map(f => fmt(v * f)).filter(d => d !== answer)
  const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
  const q = attr === 'len' ? (t.tall ? `About how tall is ${t.n}?` : `About how long is ${t.n}?`) : attr === 'mass' ? `About how heavy is ${t.n}?` : `About how fast can ${t.n} go?`
  return riddle({ family: 'comparisons', skill: 'thinking: estimating', prompt: [q], choices, answer: idx, spoken: `${q} ${texts(choices)}?`, metric: level * 10 + 2 + (attr === 'speed' ? 3 : 0), grade, tier, key: `comparisons|estimate|${t.n}|${attr}|${imperial ? 'i' : 'm'}` })
}

const PLURAL: Record<string, string> = {
  'a bicycle': 'bicycles', 'a car': 'cars', 'a brick': 'bricks', 'a book': 'books', 'an apple': 'apples', 'a watermelon': 'watermelons', 'an egg': 'eggs', 'a coin': 'coins',
  'a chair': 'chairs', 'a table': 'tables', 'a cat': 'cats', 'a dog': 'dogs', 'a cow': 'cows', 'a horse': 'horses', 'an elephant': 'elephants', 'a bus': 'buses', 'a truck': 'trucks',
  'a backpack': 'backpacks', 'a basketball': 'basketballs', 'a bowling ball': 'bowling balls', 'a laptop': 'laptops', 'a hammer': 'hammers', 'a spoon': 'spoons', 'a pencil': 'pencils', 'a bag of sugar': 'bags of sugar', 'a pig': 'pigs', 'a sheep': 'sheep',
}

function quantityQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const mode = rng.pick(['many', 'times', 'many'] as const)
  if (mode === 'many') {
    // "Which is heavier: one car or ten bicycles?"
    const pool = THINGS.filter(t => PLURAL[t.n] && t.mass !== undefined)
    for (let tries = 0; tries < 100; tries++) {
      const [a, b] = rng.sample(pool, 2)
      const [heavy, light] = a.mass! > b.mass! ? [a, b] : [b, a]
      const k = rng.pick([2, 3, 5, 10, 20, 100])
      const r = heavy.mass! / (k * light.mass!)
      if (r < 1.5 && r > 1 / 1.5) continue
      if (heavy.mass! / light.mass! < 2) continue
      const one = `one ${heavy.n.replace(/^an? /, '')}`
      const many = `${numberWord(k)} ${PLURAL[light.n]}`
      if (many.length > 26) continue
      const answer = r > 1 ? one : many
      const { choices, answer: idx } = shuffled(rng, answer, [answer === one ? many : one, 'about the same', 'cannot tell'], n)
      const prompt = ['Which is heavier:', `${one} or ${many}?`]
      return riddle({ family: 'comparisons', skill: 'thinking: reasoning with quantities', prompt, choices, answer: idx, spoken: `${prompt.join(' ')} ${texts(choices)}?`, metric: 44 + Math.log10(k) * 2, grade, tier, key: `comparisons|many|${heavy.n}|${k}|${light.n}` })
    }
  }
  // "A car goes about 100 km/h and a bike about 20 km/h. How many times faster is the car?"
  const pool = THINGS.filter(t => t.speed !== undefined && t.level <= 4)
  for (let tries = 0; tries < 200; tries++) {
    const [a, b] = rng.sample(pool, 2)
    const [fast, slow] = a.speed! > b.speed! ? [a, b] : [b, a]
    const ratio = fast.speed! / slow.speed!
    const k = Math.round(ratio)
    if (k < 2 || k > 12 || Math.abs(ratio - k) > 0.12 * k) continue
    const answer = `${k} times`
    const decoys = nearbyNumbers(rng, k, 4, 3, 2, 30).filter(d => d !== k).map(d => `${d} times`)
    const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
    const prompt = [`${cap(fast.n)} goes about ${speedText(slow.speed! * k, false)}.`, `${cap(slow.n)} goes about ${speedText(slow.speed!, false)}.`, `About how many times faster is ${fast.n}?`]
    return riddle({ family: 'comparisons', skill: 'thinking: reasoning with quantities', prompt, choices, answer: idx, spoken: `${prompt.join(' ')} ${texts(choices)}?`, metric: 46 + k / 4, grade, tier, key: `comparisons|times|${fast.n}|${slow.n}` })
  }
  return estimateQ(grade, tier, 4, rng)
}

const UNITS = [
  { big: 'km', small: 'm', f: 1000, what: 'longer' }, { big: 'm', small: 'cm', f: 100, what: 'longer' }, { big: 'cm', small: 'mm', f: 10, what: 'longer' },
  { big: 'kg', small: 'g', f: 1000, what: 'heavier' }, { big: 'hours', small: 'minutes', f: 60, what: 'longer' }, { big: 'litres', small: 'ml', f: 1000, what: 'more' },
  { big: 'minutes', small: 'seconds', f: 60, what: 'longer' },
]
const money = (c: number) => c < 100 ? `${c} cents` : `$${(c / 100).toFixed(2)}`

function unitQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const mode = rng.pick(['cost', 'weigh', 'travel', 'compare', 'convert', 'compare'] as const)
  if (mode === 'compare') {
    const u = rng.pick(UNITS)
    const A = rng.int(1, 5)
    const same = rng.bool(0.25)
    const B = same ? A * u.f : Math.round(A * u.f * rng.pick([0.5, 0.75, 1.25, 1.5, 2]))
    const big = `${A} ${u.big}`, small = `${B} ${u.small}`
    const answer = same ? 'they are the same' : A * u.f > B ? big : small
    const { choices, answer: idx } = shuffled(rng, answer, [big, small, 'they are the same', 'cannot tell'].filter(x => x !== answer), n)
    const prompt = [`Which is ${u.what}:`, `${big} or ${small}?`]
    return riddle({ family: 'comparisons', skill: 'thinking: units', prompt, choices, answer: idx, spoken: `${prompt.join(' ')} ${texts(choices)}?`, metric: 52 + (same ? 2 : 0), grade, tier, key: `comparisons|compare|${big}|${small}` })
  }
  if (mode === 'convert') {
    const u = rng.pick(UNITS)
    const A = rng.int(2, 9)
    const answer = String(A * u.f)
    const decoys = [String(A * u.f * 10), String(Math.round(A * u.f / 10)), String(A * u.f + A), String(A + u.f), String(A * u.f * 100)].filter(d => d !== answer)
    const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
    const q = `How many ${u.small} are in ${A} ${u.big}?`
    return riddle({ family: 'comparisons', skill: 'thinking: units', prompt: [q], choices, answer: idx, spoken: `${q} ${texts(choices)}?`, metric: 51 + Math.log10(u.f), grade, tier, key: `comparisons|convert|${A}|${u.big}` })
  }
  // Proportional reasoning: k items -> m items.
  const k = rng.int(2, 5)
  const j = rng.pick([2, 3, 4])
  const unitRate = rng.bool(0.3)
  const m = unitRate ? 1 : k * j
  let per: number, item: string, fmt: (v: number) => string, q: string[]
  if (mode === 'cost') {
    per = rng.pick([5, 10, 15, 20, 25, 30, 40, 50]); item = rng.pick(['pencils', 'stickers', 'apples', 'erasers', 'marbles']); fmt = money
    q = [`${k} ${item} cost ${fmt(k * per)}.`, m === 1 ? `How much does 1 ${item.slice(0, -1)} cost?` : `How much do ${m} ${item} cost?`]
  } else if (mode === 'weigh') {
    per = rng.pick([50, 100, 120, 150, 200, 250]); item = rng.pick(['apples', 'oranges', 'potatoes', 'books', 'pears']); fmt = (v: number) => v >= 1000 && v % 100 === 0 ? `${v / 1000} kg` : `${v} g`
    q = [`${k} ${item} weigh ${fmt(k * per)}.`, m === 1 ? `How much does 1 ${item.slice(0, -1)} weigh?` : `How much do ${m} ${item} weigh?`]
  } else {
    per = rng.pick([40, 50, 60, 80, 100]); item = rng.pick(['a car', 'a train', 'a bus', 'a boat']); fmt = (v: number) => `${v} km`
    const hours = m
    q = [`${cap(item)} travels ${fmt(k * per)} in ${k} hours.`, hours === 1 ? 'How far does it go in 1 hour?' : `How far does it go in ${hours} hours?`]
  }
  const answer = fmt(m * per)
  const wrong = [k * per + m, k * per * m, m * per + per, k * per + (m - k) * per / 2, m * per * 2, Math.round(m * per / 2)].map(v => Math.round(v)).filter(v => v > 0 && v !== m * per)
  const { choices, answer: idx } = shuffled(rng, answer, rng.shuffle([...new Set(wrong)]).map(fmt), n)
  return riddle({ family: 'comparisons', skill: 'thinking: proportional reasoning', prompt: q, choices, answer: idx, spoken: `${q.join(' ')} ${texts(choices)}?`, metric: 54 + (unitRate ? 2 : j), grade, tier, key: `comparisons|${mode}|${k}|${per}|${m}` })
}

/** Which is bigger/heavier/faster: concrete pairs (K-1), superlatives (2), estimation (3), real quantities (4), units and proportions (5). */
export const comparisons: Generator = {
  id: 'comparisons',
  name: 'Bigger, heavier, faster',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  make(grade, tier, rng) {
    const level = pickLevel(grade, tier, rng)
    if (level <= 2) return relativeQ(grade, tier, level, rng)
    if (level === 3) return rng.bool(0.75) ? estimateQ(grade, tier, 3, rng) : relativeQ(grade, tier, 3, rng)
    if (level === 4) return rng.bool(0.5) ? estimateQ(grade, tier, 4, rng) : quantityQ(grade, tier, rng)
    return unitQ(grade, tier, rng)
  },
}

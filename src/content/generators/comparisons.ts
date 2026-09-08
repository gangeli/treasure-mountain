import type { Generator, Grade, Tier, Riddle } from '../types'
import type { Rng } from '../../engine/rng'
import { riddle, shuffled, choiceCount, cap, numberWord, nearbyNumbers } from '../types'
import { THINGS, marginFor, canEstimate, EST_MARGIN, QTY_MARGIN, type Attr, type Thing } from '../data/comparisons'
import { pickLevel, wrap } from './thinkingUtil'

interface AttrDef {
  attr: Attr
  more: string
  most: string
  least: string
  /** Only things measured by height. */
  tall?: boolean
  /** "longer" makes no sense for things measured by height. */
  noTall?: boolean
  /** "bigger" is about bulk, so long thin things (a pencil, a feather) do not belong. */
  bulk?: boolean
}
const ATTRS: AttrDef[] = [
  { attr: 'len', more: 'bigger', most: 'biggest', least: 'smallest', bulk: true },
  { attr: 'len', more: 'longer', most: 'longest', least: 'shortest', noTall: true },
  { attr: 'len', more: 'taller', most: 'tallest', least: 'shortest', tall: true },
  { attr: 'mass', more: 'heavier', most: 'heaviest', least: 'lightest' },
  { attr: 'speed', more: 'faster', most: 'fastest', least: 'slowest' },
]

// ------------------------------------------------------------------ numbers people actually say

/** Mantissas a person would use out loud: "6 feet", never "5.6 feet". */
const LADDER = [1, 1.2, 1.5, 1.8, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10]

/** Rounds to the nearest value on the ladder (within ~11%), so answers and decoys read naturally. */
export function snap(v: number): number {
  if (v === 0) return 0
  const s = v < 0 ? -1 : 1
  const a = Math.abs(v)
  const e = Math.floor(Math.log10(a))
  const m = a / Math.pow(10, e)
  const best = LADDER.reduce((b, x) => Math.abs(x - m) < Math.abs(b - m) ? x : b, LADDER[0])
  return Number((s * best * Math.pow(10, e)).toPrecision(4))
}
export const nice = (v: number): string => String(snap(v))

/** "1 foot", not "1 feet". Abbreviations (cm, kg, km/h) are never pluralised. */
const SINGULAR: Record<string, string> = { feet: 'foot', inches: 'inch', miles: 'mile', pounds: 'pound', ounces: 'ounce', tons: 'ton', 'metric tons': 'metric ton' }
const unit = (v: number, u: string): string => `${nice(v)} ${snap(v) === 1 && SINGULAR[u] ? SINGULAR[u] : u}`

export const lenText = (m: number, imperial: boolean): string => {
  if (!imperial) return m >= 1000 ? unit(m / 1000, 'km') : m >= 1 ? unit(m, 'm') : unit(m * 100, 'cm')
  const ft = m * 3.281
  return ft >= 5280 ? unit(ft / 5280, 'miles') : ft >= 1 ? unit(ft, 'feet') : unit(m * 39.37, 'inches')
}
export const massText = (kg: number, imperial: boolean): string => {
  if (!imperial) return kg >= 1000 ? unit(kg / 1000, 'metric tons') : kg >= 1 ? unit(kg, 'kg') : unit(kg * 1000, 'g')
  const lb = kg * 2.205
  return lb >= 2000 ? unit(lb / 2000, 'tons') : lb >= 1 ? unit(lb, 'pounds') : unit(kg * 35.27, 'ounces')
}
export const speedText = (kmh: number, imperial: boolean): string => imperial ? unit(kmh * 0.621, 'mph') : unit(kmh, 'km/h')

/** Reads a formatted measurement back to a comparable number, so the generator can check its own margins. */
const SCALE: Record<string, number> = {
  mm: 0.001, cm: 0.01, m: 1, km: 1000, inch: 0.0254, inches: 0.0254, foot: 0.3048, feet: 0.3048, mile: 1609, miles: 1609,
  g: 0.001, kg: 1, 'metric ton': 1000, 'metric tons': 1000, ounce: 0.02835, ounces: 0.02835, pound: 0.4536, pounds: 0.4536, ton: 907, tons: 907,
  'km/h': 1, mph: 1.609,
}
export function measure(text: string): number | null {
  const m = /^([\d.]+) (.+)$/.exec(text.trim())
  const s = m ? SCALE[m[2]] : undefined
  return m && s !== undefined ? Number(m[1]) * s : null
}

const texts = (cs: { text?: string }[]) => cs.map(c => c.text).join(', ')
const fits = (lines: string[]) => lines.every(l => l.length <= 46)

// ------------------------------------------------------------------ the margin rule

interface Spread { sorted: Thing[]; best: number[]; attr: Attr; ratio: number }
const spreadCache = new Map<string, Spread>()

/**
 * Things of one kind sorted by value, plus `best[i]` = the longest run starting at i in which every
 * step is at least `ratio` times the one before. That run length is what makes the margin rule
 * cheap: a set of k things that are pairwise `ratio` apart exists exactly when some best[i] >= k.
 */
function spreadTable(def: AttrDef, maxLevel: number, ratio: number): Spread {
  const key = `${def.more}|${maxLevel}|${ratio}`
  const hit = spreadCache.get(key)
  if (hit) return hit
  const attr = def.attr
  const sorted = THINGS
    .filter(t => t.level <= maxLevel && t[attr] !== undefined && (!def.tall || t.tall) && (!def.noTall || !t.tall) && (!def.bulk || !t.slim))
    .sort((a, b) => a[attr]! - b[attr]!)
  const best = sorted.map(() => 1)
  for (let i = sorted.length - 1; i >= 0; i--) {
    for (let j = i + 1; j < sorted.length; j++) {
      if (sorted[j][attr]! >= sorted[i][attr]! * ratio) best[i] = Math.max(best[i], 1 + best[j])
    }
  }
  const table = { sorted, best, attr, ratio }
  spreadCache.set(key, table)
  return table
}

/**
 * Picks `k` things whose values differ pairwise by at least the table's ratio, uniformly at random
 * among the sets that work. Returns null when the data cannot supply such a set.
 */
export function pickSpread(rng: Rng, table: Spread, k: number): Thing[] | null {
  const { sorted, best, attr } = table
  const out: Thing[] = []
  let from = 0
  let floor = -Infinity
  for (let need = k; need > 0; need--) {
    const options: number[] = []
    for (let i = from; i < sorted.length; i++) if (sorted[i][attr]! >= floor && best[i] >= need) options.push(i)
    if (!options.length) return null
    const i = rng.pick(options)
    out.push(sorted[i])
    floor = sorted[i][attr]! * table.ratio
    from = i + 1
  }
  return out
}

// ------------------------------------------------------------------ question shapes

function relativeQ(grade: Grade, tier: Tier, level: Grade, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const margin = marginFor(grade)
  const maxLevel = Math.min(3, level)
  // Two-way comparisons are the easiest shape, so they stay in the youngest grades' first tier.
  const pair = n === 3 && tier === 1 && grade <= 1 && (level === 0 || rng.bool(0.35))
  const k = pair ? 2 : n
  const defs = rng.shuffle(ATTRS.filter(d => level >= 1 || d.attr !== 'speed'))
  let def: AttrDef | undefined
  let things: Thing[] | null = null
  for (const ratio of [margin, 3, 2, 1]) {
    for (const d of defs) {
      things = pickSpread(rng, spreadTable(d, maxLevel, ratio), k)
      if (things) { def = d; break }
    }
    if (things) break
  }
  if (!def || !things) throw new Error(`comparisons: no ${k} things for grade ${grade} level ${level}`)
  const attr = def.attr

  if (pair) {
    const [a, b] = things
    const best = a[attr]! > b[attr]! ? a : b
    const other = best === a ? b : a
    const { choices, answer } = shuffled(rng, best.n, [other.n, 'they are the same'], n)
    const line = `${a.n} or ${b.n}?`
    const prompt = line.length <= 46 ? [`Which is ${def.more}:`, line] : [`Which is ${def.more}:`, `${a.n} or`, `${b.n}?`]
    return riddle({
      family: 'comparisons', skill: `thinking: comparing (${def.more})`, prompt, choices, answer,
      spoken: `${prompt.join(' ')} ${texts(choices)}?`, metric: level * 10 + 1, grade, tier,
      key: `comparisons|${def.more}|${[a.n, b.n].sort().join('/')}`,
    })
  }

  const least = level >= 2 && rng.bool(0.4)
  const best = things.reduce((m, t) => (least ? t[attr]! < m[attr]! : t[attr]! > m[attr]!) ? t : m)
  const { choices, answer } = shuffled(rng, best.n, things.filter(t => t !== best).map(t => t.n), n)
  const word = least ? def.least : def.most
  const shapes = [[`Which one is the ${word}?`], [`Which of these is the ${word}?`]]
  if (attr === 'speed') shapes.push(['Think about how things move!', `Which of these is the ${word}?`])
  return riddle({
    family: 'comparisons', skill: `thinking: comparing (${word})`, prompt: rng.pick(shapes), choices, answer,
    spoken: `Which one is the ${word}? ${texts(choices)}?`, metric: level * 10 + 3 + (least ? 2 : 0) + (n === 4 ? 1 : 0), grade, tier,
    key: `comparisons|${word}|${things.map(t => t.n).sort().join('/')}`,
  })
}

/** Sensible ranges for "about how ...": nothing a child cannot picture, nothing with silly units. */
const inRange = (attr: Attr, v: number) => attr === 'len' ? v >= 0.01 && v < 1000 : attr === 'mass' ? v >= 0.05 && v < 1e6 : true

function estimateQ(grade: Grade, tier: Tier, level: Grade, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const imperial = rng.bool(0.4)
  const attrs: Attr[] = level >= 4 ? ['speed', 'speed', 'mass', 'len'] : ['len', 'len', 'mass']
  const maxLevel = Math.min(4, level)
  const fmtFor = (a: Attr) => a === 'len' ? (x: number) => lenText(x, imperial) : a === 'mass' ? (x: number) => massText(x, imperial) : (x: number) => speedText(x, imperial)
  for (let tries = 0; tries < 40; tries++) {
    const attr = rng.pick(attrs)
    const cands = THINGS.filter(t => t.level <= maxLevel && t[attr] !== undefined && canEstimate(t, attr) && inRange(attr, t[attr]!))
    if (!cands.length) continue
    const t = rng.pick(cands)
    const v = t[attr]!
    const fmt = fmtFor(attr)
    const answer = fmt(v)
    const shown = measure(answer)
    if (shown === null) continue
    // Grade 3 has not met decimals yet, so its estimates are whole numbers of a sensible unit.
    if (level <= 3 && answer.includes('.')) continue
    // Every decoy is a wrong power of ten: at least EST_MARGIN times away from the answer, so no
    // real-world variation in the thing itself can make a decoy defensible.
    const factors = [10, 0.1, rng.bool() ? 100 : 0.01, 1000, 0.001, 20, 0.05]
    const decoys: string[] = []
    for (const f of factors) {
      const text = fmt(v * f)
      const m = measure(text)
      if (m === null || text === answer || decoys.includes(text) || text.startsWith('0.0')) continue
      if (Math.max(m, shown) / Math.min(m, shown) < EST_MARGIN) continue
      decoys.push(text)
      if (decoys.length >= n) break
    }
    if (decoys.length < n - 1) continue
    const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
    const q = attr === 'len' ? (t.tall ? `About how tall is ${t.n}?` : `About how long is ${t.n}?`) : attr === 'mass' ? `About how heavy is ${t.n}?` : `About how fast can ${t.n} go?`
    return riddle({
      family: 'comparisons', skill: 'thinking: estimating', prompt: wrap(q), choices, answer: idx,
      spoken: `${q} ${texts(choices)}?`, metric: level * 10 + 2 + (attr === 'speed' ? 3 : 0), grade, tier,
      key: `comparisons|estimate|${t.n}|${attr}|${imperial ? 'i' : 'm'}`,
    })
  }
  throw new Error(`comparisons: no estimation item for level ${level}`)
}

function quantityQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const mode = rng.pick(['many', 'times', 'many'] as const)
  if (mode === 'many') {
    // "Which is heavier: one car or ten bicycles?" Only things with a settled weight take part, and
    // the winning side must beat the other by QTY_MARGIN so "about the same" is never defensible.
    const pool = THINGS.filter(t => t.plural && t.mass !== undefined)
    for (let tries = 0; tries < 200; tries++) {
      const [a, b] = rng.sample(pool, 2)
      const [heavy, light] = a.mass! > b.mass! ? [a, b] : [b, a]
      const k = rng.pick([2, 3, 4, 5, 10, 20, 50, 100])
      const lots = k * light.mass!
      const r = Math.max(heavy.mass!, lots) / Math.min(heavy.mass!, lots)
      // Below QTY_MARGIN the answer is a coin flip; far above it no multiplying is needed at all.
      if (r < QTY_MARGIN || r > 15) continue
      const one = `one ${heavy.n.replace(/^an? /, '')}`
      const many = `${numberWord(k)} ${light.plural}`
      const line = `${one} or ${many}?`
      if (one.length > 26 || many.length > 26 || !fits([line])) continue
      const answer = heavy.mass! > lots ? one : many
      const { choices, answer: idx } = shuffled(rng, answer, [answer === one ? many : one, 'about the same', 'cannot tell'], n)
      const prompt = ['Which is heavier:', line]
      return riddle({
        family: 'comparisons', skill: 'thinking: reasoning with quantities', prompt, choices, answer: idx,
        spoken: `${prompt.join(' ')} ${texts(choices)}?`, metric: 44 + Math.log10(k) * 2, grade, tier,
        key: `comparisons|many|${heavy.n}|${k}|${light.n}`,
      })
    }
  }
  // "A car goes about 100 km/h and a bike about 20 km/h. How many times faster is the car?"
  const pool = THINGS.filter(t => t.speed !== undefined && t.level <= 4 && canEstimate(t, 'speed'))
  for (let tries = 0; tries < 200; tries++) {
    const [a, b] = rng.sample(pool, 2)
    const [fast, slow] = a.speed! > b.speed! ? [a, b] : [b, a]
    const k = Math.round(fast.speed! / slow.speed!)
    if (k < 2 || k > 12) continue
    // Show round speeds whose ratio is exactly k, and only when they stay true to the real values.
    const slowShown = snap(slow.speed!)
    const fastShown = k * slowShown
    if (Math.abs(fastShown - fast.speed!) > 0.15 * fast.speed!) continue
    const answer = `${k} times`
    const decoys = nearbyNumbers(rng, k, 4, 3, 2, 30).filter(d => d !== k).map(d => `${d} times`)
    const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
    const prompt = [`${cap(fast.n)} goes about ${fastShown} km/h.`, `${cap(slow.n)} goes about ${slowShown} km/h.`, ...wrap(`About how many times faster is ${fast.n}?`)]
    if (!fits(prompt) || prompt.length > 6) continue
    return riddle({
      family: 'comparisons', skill: 'thinking: reasoning with quantities', prompt, choices, answer: idx,
      spoken: `${prompt.join(' ')} ${texts(choices)}?`, metric: 46 + k / 4, grade, tier,
      key: `comparisons|times|${fast.n}|${slow.n}`,
    })
  }
  return estimateQ(grade, tier, 4, rng)
}

interface Unit { big: string; small: string; f: number; what: string; bigWord?: boolean; smallWord?: boolean }
const UNITS: Unit[] = [
  { big: 'km', small: 'm', f: 1000, what: 'longer' }, { big: 'm', small: 'cm', f: 100, what: 'longer' }, { big: 'cm', small: 'mm', f: 10, what: 'longer' },
  { big: 'kg', small: 'g', f: 1000, what: 'heavier' }, { big: 'liter', small: 'mL', f: 1000, what: 'more', bigWord: true },
  { big: 'hour', small: 'minute', f: 60, what: 'longer', bigWord: true, smallWord: true },
  { big: 'minute', small: 'second', f: 60, what: 'longer', bigWord: true, smallWord: true },
]
/** Two-step conversions for grade 5's harder tiers. */
const HARD_UNITS: Unit[] = [
  { big: 'hour', small: 'second', f: 3600, what: 'longer', bigWord: true, smallWord: true },
  { big: 'km', small: 'cm', f: 100000, what: 'longer' }, { big: 'kg', small: 'mg', f: 1000000, what: 'heavier' },
  { big: 'm', small: 'mm', f: 1000, what: 'longer' }, { big: 'liter', small: 'mL', f: 1000, what: 'more', bigWord: true },
]
/** "1 minute", "2 minutes", "3 kg". */
const amount = (v: number, u: string, word?: boolean) => `${v} ${word && v !== 1 ? u + 's' : u}`
const plural = (u: string, word?: boolean) => word ? u + 's' : u
const money = (c: number) => c < 100 ? `${c} cents` : `$${(c / 100).toFixed(2)}`

function unitQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const n = choiceCount(grade)
  // Tier 3 keeps only the shapes that need more than one step.
  const hard = tier === 3 || (tier === 2 && rng.bool(0.5))
  const mode = tier === 3
    ? rng.pick(['convert', 'cost', 'weigh', 'travel'] as const)
    : rng.pick(['compare', 'convert', 'cost', 'weigh', 'travel', 'compare'] as const)

  if (mode === 'compare') {
    const u = rng.pick(UNITS)
    const A = rng.int(1, 5)
    const same = rng.bool(0.25)
    const B = same ? A * u.f : Math.round(A * u.f * rng.pick([0.5, 0.75, 1.25, 1.5, 2]))
    const big = amount(A, u.big, u.bigWord), small = amount(B, u.small, u.smallWord)
    const answer = same ? 'they are the same' : A * u.f > B ? big : small
    const { choices, answer: idx } = shuffled(rng, answer, [big, small, 'they are the same', 'cannot tell'].filter(x => x !== answer), n)
    const prompt = [`Which is ${u.what}:`, `${big} or ${small}?`]
    return riddle({
      family: 'comparisons', skill: 'thinking: units', prompt, choices, answer: idx,
      spoken: `${prompt.join(' ')} ${texts(choices)}?`, metric: 51 + (same ? 1 : 0), grade, tier,
      key: `comparisons|compare|${big}|${small}`,
    })
  }

  if (mode === 'convert') {
    const u = rng.pick(hard ? HARD_UNITS : UNITS)
    const A = hard && u.f >= 1000 && rng.bool(0.5) ? rng.pick([1.5, 2.5, 3.5, 4.5]) : rng.int(2, 9)
    const total = Math.round(A * u.f)
    const answer = String(total)
    // Wrong power of ten, forgetting to multiply, off by one, and dropping the decimal part.
    const decoys = [total * 10, Math.round(total / 10), total * 100, u.f, Math.floor(A) * u.f, (Math.floor(A) + 1) * u.f]
      .map(String).filter(d => d !== answer && d !== '0' && d.length <= 26)
    const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
    const q = `How many ${plural(u.small, u.smallWord)} are in ${amount(A, u.big, u.bigWord)}?`
    return riddle({
      family: 'comparisons', skill: 'thinking: units', prompt: wrap(q), choices, answer: idx,
      spoken: `${q} ${texts(choices)}?`, metric: (hard ? 58 : 53) + Math.log10(u.f) / 3, grade, tier,
      key: `comparisons|convert|${A}|${u.big}|${u.small}`,
    })
  }

  // Proportional reasoning. The easy shape scales up by a whole number; the hard shape asks for a
  // count that is not a multiple of the one given, so the child has to find the unit rate first.
  const k = rng.int(2, 6)
  let m: number
  if (hard) { do { m = rng.int(2, 12) } while (m === k || m % k === 0) }
  else m = rng.bool(0.3) ? 1 : k * rng.pick([2, 3, 4])
  let per: number, item: string, fmt: (v: number) => string, q: string[]
  if (mode === 'cost') {
    per = rng.pick([5, 10, 15, 20, 25, 30, 40, 50]); item = rng.pick(['pencils', 'stickers', 'apples', 'erasers', 'marbles']); fmt = money
    q = [`${k} ${item} cost ${fmt(k * per)}.`, m === 1 ? `How much does 1 ${item.slice(0, -1)} cost?` : `How much do ${m} ${item} cost?`]
  } else if (mode === 'weigh') {
    per = rng.pick([50, 100, 120, 150, 200, 250]); item = rng.pick(['apples', 'oranges', 'potatoes', 'books', 'pears']); fmt = (v: number) => v >= 1000 && v % 100 === 0 ? `${v / 1000} kg` : `${v} g`
    q = [`${k} ${item} weigh ${fmt(k * per)}.`, m === 1 ? `How much does 1 ${item.slice(0, -1)} weigh?` : `How much do ${m} ${item} weigh?`]
  } else {
    per = rng.pick([40, 50, 60, 80, 100]); item = rng.pick(['a car', 'a train', 'a bus', 'a boat']); fmt = (v: number) => `${v} km`
    q = [`${cap(item)} travels ${fmt(k * per)} in ${k} hours.`, m === 1 ? 'How far does it go in 1 hour?' : `How far does it go in ${m} hours?`]
  }
  const answer = fmt(m * per)
  const wrong = [k * per + m, k * per * m, m * per + per, k * per + (m - k) * per / 2, m * per * 2, Math.round(m * per / 2), (m + 1) * per]
    .map(v => Math.round(v)).filter(v => v > 0 && v !== m * per)
  const { choices, answer: idx } = shuffled(rng, answer, rng.shuffle([...new Set(wrong)]).map(fmt), n)
  return riddle({
    family: 'comparisons', skill: 'thinking: proportional reasoning', prompt: q, choices, answer: idx,
    spoken: `${q.join(' ')} ${texts(choices)}?`, metric: hard ? 60 : 54 + (m === 1 ? 1 : 2), grade, tier,
    key: `comparisons|${mode}|${k}|${per}|${m}`,
  })
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

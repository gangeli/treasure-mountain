import type { Generator, Visual, CounterItem } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys, wrap, twoNames, plural, fracStr, cents, fmtDec, COUNTER_ITEMS, gcd } from './mathutil'
import type { Rng } from '../../engine/rng'

const OBJS = ['sticker', 'marble', 'cookie', 'balloon', 'book', 'shell', 'crayon', 'toy car', 'block', 'button', 'pencil', 'card', 'rock', 'apple', 'flower', 'coin']
/** Counter sprites a verb is true of: you only eat food, and only round things roll away. */
const EDIBLE: CounterItem[] = ['apple', 'cookie']
const ROUND: CounterItem[] = ['ball', 'balloon', 'acorn', 'apple']

interface Problem {
  text: string
  /** Expression the test recomputes; must equal the numeric value of `ans`. */
  expr: string
  ans: number
  /** Preferred decoys (wrong operation etc.), numeric. */
  pref: number[]
  fmt?: (v: number) => string
  /** Fraction answers: decoys as [num, den]. */
  frac?: { num: number; den: number; pref: [number, number][] }
  visual?: Visual
  magnitude: number
  skill: string
  spread?: number
  /** Decimal answers: granularity (10 = tenths, 100 = hundredths). */
  units?: number
}
type Template = (rng: Rng, tier: number) => Problem

const natDec = (units: number, places: number): string => {
  let s = fmtDec(units, places)
  if (s.includes('.')) { s = s.replace(/0+$/, ''); if (s.endsWith('.')) s = s.slice(0, -1) }
  return s
}
const isAre = (n: number) => n === 1 ? 'is' : 'are'
/** "1 rolls away" / "3 roll away". */
const verb = (n: number, sing: string, plur: string) => n === 1 ? sing : plur

// ------------------------------------------------------------------ K and grade 1: one step with counters
/** Per-tier band: totals stay inside [min, max] and each part is at least `part`. */
interface Band { min: number; max: number; part: number }

function addSubTemplates(band: (t: number) => Band, withPictures: boolean, withCompare: boolean): Template[] {
  const pick = (rng: Rng, tier: number, pool: readonly CounterItem[] = COUNTER_ITEMS) => {
    const { min, max, part } = band(tier)
    const t = rng.int(min, max)
    const a = rng.int(part, t - part), b = t - a
    const item = rng.pick(pool)
    const [N, N2] = twoNames(rng)
    return { a, b, t, item, items: plural(item, 2), N, N2 }
  }
  type C = ReturnType<typeof pick>
  const add = (text: (c: C) => string, pool?: readonly CounterItem[], skill = 'math: addition word problems'): Template => (rng, tier) => {
    const c = pick(rng, tier, pool)
    // The picture shows the two addends from the prompt, not two equal groups.
    return { text: text(c), expr: `${c.a}+${c.b}`, ans: c.t, pref: [c.a - c.b, c.b - c.a, c.t + 1, c.t - 1, c.a, c.b], magnitude: c.t, skill, visual: withPictures ? { kind: 'counters', item: c.item, count: c.t, groups: [c.a, c.b] } : undefined }
  }
  const sub = (text: (c: C) => string, pool?: readonly CounterItem[], skill = 'math: subtraction word problems'): Template => (rng, tier) => {
    const c = pick(rng, tier, pool)
    return { text: text(c), expr: `${c.t}-${c.b}`, ans: c.a, pref: [c.t + c.b, c.a + 1, c.a - 1, c.b, c.t], magnitude: c.t, skill, visual: withPictures ? { kind: 'counters', item: c.item, count: c.t, crossed: c.b } : undefined }
  }
  const templates: Template[] = [
    add(c => `${c.N} has ${c.a} ${plural(c.item, c.a)}. ${c.N2} gives ${c.N} ${c.b} more. How many ${c.items} does ${c.N} have now?`),
    add(c => `${c.a} ${plural(c.item, c.a)} ${isAre(c.a)} in a bowl. ${c.N} puts in ${c.b} more. How many ${c.items} are in the bowl now?`),
    add(c => `${c.N} has ${c.a} ${plural(c.item, c.a)}. ${c.N2} has ${c.b}. How many ${c.items} do they have in all?`),
    add(c => `${c.N} finds ${c.a} ${plural(c.item, c.a)}. Then ${c.N} finds ${c.b} more. How many ${c.items} did ${c.N} find?`),
    add(c => `There ${isAre(c.a)} ${c.a} ${plural(c.item, c.a)} on the table and ${c.b} on the floor. How many ${c.items} are there?`),
    add(c => `${c.N} picks ${c.a} ${plural(c.item, c.a)} and ${c.N2} picks ${c.b}. How many ${c.items} did they pick?`),
    add(c => `${c.a} ${plural(c.item, c.a)} ${isAre(c.a)} on a leaf. ${c.b} more ${verb(c.b, 'crawls', 'crawl')} on. How many ${c.items} are on the leaf now?`, ['bug']),
    sub(c => `${c.N} has ${c.t} ${plural(c.item, c.t)}. ${c.N} eats ${c.b}. How many ${c.items} are left?`, EDIBLE),
    sub(c => `${c.t} ${plural(c.item, c.t)} are in a box. ${c.N} takes ${c.b} out. How many are still in the box?`),
    sub(c => `${c.N} has ${c.t} ${plural(c.item, c.t)}. ${c.N} gives ${c.b} to ${c.N2}. How many does ${c.N} keep?`),
    sub(c => `There are ${c.t} ${plural(c.item, c.t)}. ${c.b} ${verb(c.b, 'rolls', 'roll')} away. How many ${c.items} are left?`, ROUND),
    sub(c => `${c.N} had ${c.t} ${plural(c.item, c.t)} and lost ${c.b}. How many ${c.items} does ${c.N} have now?`),
    sub(c => `${c.t} ${c.items} are in a tank. ${c.b} ${verb(c.b, 'swims', 'swim')} away. How many ${c.items} are left?`, ['fish']),
    sub(c => `There are ${c.t} ${plural(c.item, c.t)} out. ${c.N} puts ${c.b} away. How many ${c.items} are still out?`),
  ]
  // Difference-unknown is a grade-1 standard (1.OA.A.1); kindergarten only adds to and takes from.
  if (withCompare) templates.push(sub(c => `${c.N} has ${c.t} ${plural(c.item, c.t)}. ${c.N2} has ${c.b}. How many more does ${c.N} have?`, undefined, 'math: comparing word problems'))
  return templates
}

const K_BAND = (t: number): Band => t === 1 ? { min: 2, max: 5, part: 1 } : t === 2 ? { min: 6, max: 7, part: 2 } : { min: 8, max: 10, part: 2 }
const G1_BAND = (t: number): Band => t === 1 ? { min: 4, max: 10, part: 1 } : t === 2 ? { min: 11, max: 15, part: 2 } : { min: 16, max: 20, part: 3 }

const K_TEMPLATES = addSubTemplates(K_BAND, true, false)
const G1_TEMPLATES: Template[] = [
  ...addSubTemplates(G1_BAND, false, true),
  (rng, tier) => {
    // Missing addend: at tier 3 the target and the gap both have to be worth working for.
    const { min, max } = G1_BAND(tier)
    const gap = tier === 1 ? 1 : tier === 2 ? 2 : 3
    const t = rng.int(min, max), a = rng.int(1, t - gap)
    const [N] = twoNames(rng); const o = rng.pick(OBJS)
    return { text: `${N} has ${a} ${plural(o, a)}. How many more does ${N} need to have ${t}?`, expr: `${t}-${a}`, ans: t - a, pref: [t + a, t - a + 1, t - a - 1, a], magnitude: t, skill: 'math: missing addend' }
  },
  (rng, tier) => { const { min, max } = G1_BAND(tier); const t = rng.int(min, max), a = rng.int(1, t - 1), b = t - a; const [N] = twoNames(rng); return { text: `${N} read ${a} ${plural('page', a)} on Monday and ${b} ${plural('page', b)} on Tuesday. How many pages in all?`, expr: `${a}+${b}`, ans: t, pref: [a - b, t + 1, t - 1, b], magnitude: t, skill: 'math: addition word problems' } },
  (rng, tier) => { const { min, max } = G1_BAND(tier); const t = rng.int(min, max), b = rng.int(1, t - 1); return { text: `A bus has ${t} kids on it. ${b} ${verb(b, 'gets', 'get')} off. How many kids are on the bus now?`, expr: `${t}-${b}`, ans: t - b, pref: [t + b, t - b + 1, t - b - 1, b], magnitude: t, skill: 'math: subtraction word problems' } },
  (rng, tier) => { const { min, max } = G1_BAND(tier); const t = rng.int(min, max), a = rng.int(1, t - 1); return { text: `There were ${t} birds in a tree. Some flew away. Now there are ${a}. How many flew away?`, expr: `${t}-${a}`, ans: t - a, pref: [t + a, t - a + 1, t - a - 1, a], magnitude: t, skill: 'math: missing part' } },
  (rng, tier) => { const { min, max } = G1_BAND(tier); const t = rng.int(min, max), b = rng.int(1, Math.max(1, t - 4)), a = t - b; const [N, N2] = twoNames(rng); return { text: `${N} is ${a} years old. ${N2} is ${b} ${b === 1 ? 'year' : 'years'} older. How old is ${N2}?`, expr: `${a}+${b}`, ans: t, pref: [a - b, t + 1, t - 1, b], magnitude: t, skill: 'math: addition word problems' } },
]

// ------------------------------------------------------------------ grade 2: within 100
const G2_TEMPLATES: Template[] = (() => {
  const rng1 = (rng: Rng, tier: number) => { const max = tier === 1 ? 30 : tier === 2 ? 60 : 100; const a = rng.int(5, max - 5), b = rng.int(3, max - a); const [N, N2] = twoNames(rng); const o = rng.pick(OBJS); return { a, b, t: a + b, N, N2, o, os: plural(o, 2), max } }
  type C = ReturnType<typeof rng1>
  const add = (text: (c: C) => string, fmt?: (v: number) => string): Template => (rng, tier) => { const c = rng1(rng, tier); return { text: text(c), expr: `${c.a}+${c.b}`, ans: c.t, pref: [c.a - c.b, c.t + 10, c.t - 10, c.t + 1, c.t - 1], magnitude: c.t, skill: 'math: addition word problems', fmt, spread: 6 } }
  const sub = (text: (c: C) => string, fmt?: (v: number) => string, skill = 'math: subtraction word problems'): Template => (rng, tier) => { const c = rng1(rng, tier); return { text: text(c), expr: `${c.t}-${c.b}`, ans: c.a, pref: [c.t + c.b, c.a + 10, c.a - 10, c.a + 1, c.a - 1], magnitude: c.t, skill, fmt, spread: 6 } }
  return [
    add(c => `${c.N} has ${c.a} ${c.os} and ${c.N2} has ${c.b}. How many ${c.os} do they have altogether?`),
    add(c => `A shop sold ${c.a} apples in the morning and ${c.b} in the afternoon. How many apples did it sell?`),
    add(c => `${c.N} saved ${c.a}¢ and then saved ${c.b}¢ more. How much has ${c.N} saved?`, cents),
    add(c => `A train has ${c.a} people on it. ${c.b} more get on. How many people are on the train now?`),
    add(c => `${c.N} counted ${c.a} red cars and ${c.b} blue cars. How many cars did ${c.N} count?`),
    add(c => `The team scored ${c.a} points in the first half and ${c.b} in the second. What was the total?`),
    add(c => `It is ${c.a} steps to the park and ${c.b} more steps to the pond. How many steps is that in all?`),
    sub(c => `A jar has ${c.t} buttons. ${c.N} takes out ${c.b}. How many buttons are left in the jar?`),
    sub(c => `${c.N} read ${c.t} pages. ${c.N2} read ${c.b} pages. How many more pages did ${c.N} read?`, undefined, 'math: comparing word problems'),
    sub(c => `A book has ${c.t} pages. ${c.N} has read ${c.b} of them. How many pages are left to read?`),
    sub(c => `There are ${c.t} seats in the hall. ${c.b} are taken. How many seats are empty?`),
    sub(c => `${c.N} needs ${c.t} ${c.os} for a game. ${c.N} has ${c.b}. How many more are needed?`, undefined, 'math: missing addend'),
    sub(c => `${c.N} had ${c.t} crayons and gave ${c.b} to ${c.N2}. How many crayons does ${c.N} have left?`),
    sub(c => `A rope is ${c.t} cm long. ${c.N} cuts off ${c.b} cm. How long is the rope now?`, v => `${v} cm`),
  ]
})()

// ------------------------------------------------------------------ grade 3: multiplication, division, two steps
const G3_TEMPLATES: Template[] = (() => {
  /**
   * Per-tier operand floors, so a tier-2 or tier-3 card is never a 2s-table fact that tier 1 could
   * also draw. The two factors always differ, which also stops the answer from being a number the
   * prompt already printed.
   */
  const km = (rng: Rng, tier: number) => {
    const k = rng.int(tier === 1 ? 2 : tier === 2 ? 4 : 6, tier === 1 ? 5 : tier === 2 ? 8 : 9)
    let m = rng.int(tier === 1 ? 2 : tier === 2 ? 5 : 6, tier === 1 ? 5 : tier === 2 ? 9 : 12)
    if (m === k) m = m + 1 <= (tier === 1 ? 6 : tier === 2 ? 10 : 13) ? m + 1 : m - 1
    return { k, m }
  }
  const names = (rng: Rng) => { const [N, N2] = twoNames(rng); const o = rng.pick(OBJS); return { N, N2, o, os: plural(o, 2) } }
  const mult = (text: (c: any) => string): Template => (rng, tier) => { const { k, m } = km(rng, tier); const c = { ...names(rng), k, m }; return { text: text(c), expr: `${k}*${m}`, ans: k * m, pref: [k + m, k * (m + 1), k * (m - 1), k * m + 1], magnitude: k * m, skill: 'math: multiplication word problems' } }
  const div = (text: (c: any) => string, askGroups = false): Template => (rng, tier) => { const { k, m } = km(rng, tier); const c = { ...names(rng), k, m, t: k * m }; return { text: text(c), expr: askGroups ? `${k * m}/${m}` : `${k * m}/${k}`, ans: askGroups ? k : m, pref: [askGroups ? m : k, k * m - (askGroups ? m : k), (askGroups ? k : m) + 1, (askGroups ? k : m) - 1], magnitude: k * m, skill: 'math: division word problems' } }
  const two = (text: (c: any) => string, expr: (c: any) => string, ans: (c: any) => number, pref: (c: any) => number[], fmt?: (v: number) => string): Template => (rng, tier) => {
    const { k, m } = km(rng, tier)
    const a = rng.int(10, tier === 1 ? 30 : 60)
    // `g` is what is given away out of `a`: never more than there is, so the story stays possible
    // and the running total never goes below zero (negatives are a grade-6 standard).
    const c = { ...names(rng), k, m, t: k * m, b: rng.int(1, Math.max(1, k * m - 1)), c: rng.int(1, tier === 1 ? 5 : 9), a, g: rng.int(1, a - 1) }
    return { text: text(c), expr: expr(c), ans: ans(c), pref: pref(c), magnitude: k * m + c.a, skill: 'math: two-step word problems', fmt }
  }
  return [
    mult(c => `${c.N} has ${c.k} bags with ${c.m} ${c.os} in each bag. How many ${c.os} does ${c.N} have?`),
    mult(c => `There are ${c.k} rows of ${c.m} chairs. How many chairs are there?`),
    (rng, tier) => { let k = rng.int(tier === 1 ? 2 : tier === 2 ? 4 : 6, tier === 1 ? 5 : tier === 2 ? 8 : 12); if (k === 8) k = 9; return { text: `A spider has 8 legs. How many legs do ${k} spiders have?`, expr: `${k}*8`, ans: k * 8, pref: [k + 8, k * 6, k * 8 + 8, k * 8 - 8, k * 4], magnitude: k * 8, skill: 'math: multiplication word problems' } },
    mult(c => `${c.N} buys ${c.k} packs of ${c.m} pencils. How many pencils is that?`),
    mult(c => `Each box holds ${c.m} ${c.os}. How many ${c.os} are in ${c.k} boxes?`),
    div(c => `${c.t} ${c.os} are shared equally by ${c.k} kids. How many does each kid get?`),
    div(c => `${c.N} puts ${c.t} cookies into bags of ${c.m}. How many bags does ${c.N} fill?`, true),
    div(c => `${c.t} students sit in ${c.k} equal rows. How many students are in each row?`),
    div(c => `${c.N} has ${c.t} ${c.os} and puts ${c.m} in each box. How many boxes are needed?`, true),
    two(c => `${c.N} had ${c.a} stickers, gave ${c.g} to ${c.N2} and then got ${c.c} more. How many stickers now?`, c => `${c.a}-${c.g}+${c.c}`, c => c.a - c.g + c.c, c => [c.a + c.g + c.c, c.a - c.g - c.c, c.a - c.g, c.a + c.c]),
    two(c => `${c.N} buys ${c.k} packs of ${c.m} ${c.os} and gives away ${c.b}. How many ${c.os} are left?`, c => `${c.k}*${c.m}-${c.b}`, c => c.k * c.m - c.b, c => [c.k * c.m + c.b, c.k * c.m, c.k + c.m - c.b, c.k * c.m - c.b + 1]),
    two(c => `A box holds ${c.m} eggs. ${c.N} has ${c.k} full boxes and ${c.c} extra ${plural('egg', c.c)}. How many eggs?`, c => `${c.k}*${c.m}+${c.c}`, c => c.k * c.m + c.c, c => [c.k * c.m - c.c, c.k * c.m, c.k + c.m + c.c, c.k * (c.m + c.c)]),
    two(c => `${c.N} has ${c.a + c.k * c.m}¢ and buys ${c.k} stickers at ${c.m}¢ each. How much money is left?`, c => `${c.a + c.k * c.m}-${c.k}*${c.m}`, c => c.a, c => [c.a + 2 * c.k * c.m, c.a + c.k * c.m - c.m, c.a + c.k * c.m - c.k, c.a + c.m], cents),
    two(c => `${c.N} reads ${c.m} pages a day for ${c.k} days. The book has ${c.k * c.m + c.a} pages. How many pages are left?`, c => `${c.k * c.m + c.a}-${c.k}*${c.m}`, c => c.a, c => [c.a + 2 * c.k * c.m, c.a + c.k * c.m - c.m, c.a + c.m, c.a + c.k]),
    two(c => `${c.k} kids each bring ${c.m} balloons. ${c.b} ${verb(c.b, 'balloon pops', 'balloons pop')}. How many balloons are left?`, c => `${c.k}*${c.m}-${c.b}`, c => c.k * c.m - c.b, c => [c.k * c.m + c.b, c.k * c.m, c.k + c.m - c.b, c.k * c.m - c.b - 1]),
    two(c => `There are ${c.k * c.m + c.b} kids at the park. ${c.b} ${verb(c.b, 'goes', 'go')} home. The rest make ${c.k} equal teams. How many on each team?`, c => `(${c.k * c.m + c.b}-${c.b})/${c.k}`, c => c.m, c => [c.k, c.m + 1, c.m - 1, c.k * c.m]),
  ]
})()

// ------------------------------------------------------------------ grade 4: multi-step
const G4_TEMPLATES: Template[] = (() => {
  const base = (rng: Rng, tier: number) => {
    const k = rng.int(tier === 1 ? 2 : tier === 2 ? 3 : 4, tier === 1 ? 5 : tier === 2 ? 7 : 9)
    const m = rng.int(tier === 1 ? 6 : tier === 2 ? 10 : 12, tier === 1 ? 12 : tier === 2 ? 25 : 50)
    const [N, N2] = twoNames(rng); const o = rng.pick(OBJS)
    return { k, m, N, N2, o, os: plural(o, 2), b: rng.int(3, Math.max(4, Math.floor(k * m / 2))), c: rng.int(2, tier === 1 ? 9 : 30), q: rng.int(2, 4), r: rng.int(tier === 1 ? 5 : 8, tier === 1 ? 12 : 30) }
  }
  type C = ReturnType<typeof base>
  const T = (text: (c: C) => string, expr: (c: C) => string, ans: (c: C) => number, pref: (c: C) => number[], fmt?: (v: number) => string, skill = 'math: multi-step word problems'): Template => (rng, tier) => {
    const c = base(rng, tier)
    return { text: text(c), expr: expr(c), ans: ans(c), pref: pref(c), magnitude: c.k * c.m, skill, fmt, spread: Math.max(3, Math.round(c.k * c.m * 0.1)) }
  }
  // The riders left over after the full buses must fit on the last bus, or the story contradicts itself.
  const spill = (c: C) => (c.c % c.m === 0 ? 1 : c.c % c.m)
  // The rope is cut into more pieces than are used, so the two steps cannot cancel.
  const pieces = (c: C) => c.k + 3
  // Classes and buses must differ, or multiplying then dividing just reprints a number from the prompt.
  const buses = (c: C) => (c.q === c.k ? c.q + 1 : c.q)
  // Earning and spending the same amount each week makes the subtraction free.
  const spend = (c: C) => (c.b === c.m ? c.b + 1 : c.b)
  return [
    T(c => `${c.N} has ${c.k} boxes of ${c.m} crayons and gives away ${c.b} crayons. How many crayons are left?`, c => `${c.k}*${c.m}-${c.b}`, c => c.k * c.m - c.b, c => [c.k * c.m + c.b, c.k * c.m, c.k * (c.m - c.b), c.k + c.m - c.b]),
    T(c => `A bus holds ${c.m} people. ${c.k} buses are full and ${spill(c)} ${spill(c) === 1 ? 'person rides' : 'people ride'} on one more bus. How many people in all?`, c => `${c.k}*${c.m}+${spill(c)}`, c => c.k * c.m + spill(c), c => [c.k * c.m - spill(c), c.k * c.m, (c.k + 1) * c.m, c.k * (c.m + spill(c))]),
    T(c => `${c.N} reads ${c.m} pages a day for ${c.k} days. The book has ${c.k * c.m + c.r} pages. How many pages are left?`, c => `${c.k * c.m + c.r}-${c.k}*${c.m}`, c => c.r, c => [c.r + 2 * c.k * c.m, c.r + c.k * c.m - c.m, c.r + c.m, c.k * c.m]),
    T(c => `${c.k} classes of ${c.m * buses(c)} students ride ${buses(c)} buses, the same number on each bus. How many students on each bus?`, c => `${c.k}*${c.m * buses(c)}/${buses(c)}`, c => c.k * c.m, c => [c.k * c.m * buses(c), c.m * buses(c), c.k * c.m + buses(c), c.k * c.m - buses(c)]),
    T(c => `${c.N} earns $${c.m} a week for ${c.k} weeks and then spends $${spend(c)}. How much money is left?`, c => `${c.k}*${c.m}-${spend(c)}`, c => c.k * c.m - spend(c), c => [c.k * c.m + spend(c), c.k * c.m, c.m - spend(c) + c.k, c.k * (c.m - spend(c))], v => `$${v}`),
    T(c => `A hall has ${c.k} rows of ${c.m} chairs. ${c.b} chairs are empty. How many chairs are being used?`, c => `${c.k}*${c.m}-${c.b}`, c => c.k * c.m - c.b, c => [c.k * c.m + c.b, c.k * c.m, c.k * (c.m - c.b), c.k + c.m + c.b]),
    T(c => `${c.N} runs ${c.m} km every day for ${c.k} days. ${c.N2} runs ${c.k * c.m - c.b} km in total. How many more km does ${c.N} run?`, c => `${c.k}*${c.m}-(${c.k * c.m - c.b})`, c => c.b, c => [2 * c.k * c.m - c.b, c.k * c.m, c.b + c.m, c.b + c.k], v => `${v} km`),
    T(c => `A bakery bakes ${c.k * c.m * c.q} rolls and packs them in bags of ${c.q}. It sells ${c.b} bags. How many bags are left?`, c => `${c.k * c.m * c.q}/${c.q}-${c.b}`, c => c.k * c.m - c.b, c => [c.k * c.m + c.b, c.k * c.m, c.k * c.m * c.q - c.b, c.k * c.m - c.b - c.q]),
    T(c => `A rope ${pieces(c) * c.m} cm long is cut into ${pieces(c)} equal pieces. ${c.N} uses ${c.q} of the pieces. How many cm does ${c.N} use?`, c => `${pieces(c) * c.m}/${pieces(c)}*${c.q}`, c => c.m * c.q, c => [c.m, pieces(c) * c.m - c.q, c.m * c.q + c.m, c.m * (c.q + 1), pieces(c) * c.q], v => `${v} cm`),
    T(c => `${c.N} buys ${c.k} packs of ${c.m} cards and ${c.N2} buys ${c.q} packs of ${c.r} cards. How many cards do they have in all?`, c => `${c.k}*${c.m}+${c.q}*${c.r}`, c => c.k * c.m + c.q * c.r, c => [c.k * c.m + c.r, c.m + c.q * c.r, (c.k + c.q) * (c.m + c.r), c.k * c.m + c.q * c.r + c.k]),
    T(c => `A farmer collects ${c.k * c.m + c.b} eggs. ${c.b} break. The rest go into cartons of ${c.k}. How many cartons are filled?`, c => `(${c.k * c.m + c.b}-${c.b})/${c.k}`, c => c.m, c => [c.m + 1, c.m - 1, c.k, Math.floor((c.k * c.m + c.b) / c.k)]),
    T(c => `Tickets cost $${c.m} each. ${c.N} buys ${c.k} tickets and pays with $${c.k * c.m + c.b}. How much change does ${c.N} get?`, c => `${c.k * c.m + c.b}-${c.k}*${c.m}`, c => c.b, c => [c.b + 2 * c.k * c.m, c.b + c.k * c.m - c.m, c.b + c.m, c.k * c.m], v => `$${v}`),
    T(c => `${c.k} shelves hold ${c.m} books each. ${c.N} adds ${c.c} more books. How many books are there now?`, c => `${c.k}*${c.m}+${c.c}`, c => c.k * c.m + c.c, c => [c.k * c.m - c.c, c.k * c.m, c.k * (c.m + c.c), c.k + c.m + c.c]),
    T(c => `A theater has ${c.k} rows of ${c.m} seats. ${c.b} seats are broken. How many seats can be used?`, c => `${c.k}*${c.m}-${c.b}`, c => c.k * c.m - c.b, c => [c.k * c.m + c.b, c.k * c.m, c.k * (c.m - c.b), c.m - c.b]),
  ]
})()

// ------------------------------------------------------------------ grade 5: decimals, fractions and rates
const G5_TEMPLATES: Template[] = (() => {
  const names = (rng: Rng) => { const [N, N2] = twoNames(rng); return { N, N2 } }
  const dec = (units: number, places: number) => natDec(units, places)
  const D = (text: (c: any) => string, expr: (c: any) => string, ansUnits: (c: any) => number, pref: (c: any) => number[], unit: string, skill: string): Template => (rng, tier) => {
    const places = tier === 1 ? 1 : 2
    const p = Math.pow(10, places)
    const a = rng.int(p, 9 * p), b = rng.int(1, a - 1), k = rng.int(2, tier === 3 ? 6 : 4)
    const c = { ...names(rng), a, b, k, p, places, A: dec(a, places), B: dec(b, places) }
    const ans = ansUnits(c)
    return { text: text(c), expr: expr(c), ans: ans / p, pref: pref(c).map(v => v / p), fmt: v => unit === '$' ? '$' + v.toFixed(2) : dec(Math.round(v * p), places) + ' ' + unit, magnitude: ans / p, skill, units: p }
  }
  const F = (text: (c: any) => string, expr: (c: any) => string, num: (c: any) => number, den: (c: any) => number, pref: (c: any) => [number, number][], skill: string): Template => (rng, tier) => {
    const d = rng.pick(tier === 1 ? [3, 4] : tier === 2 ? [3, 4, 5, 6, 8] : [4, 5, 6, 8, 10, 12])
    const a = rng.int(2, d - 1), b = rng.int(1, a - 1), k = rng.int(2, tier === 1 ? 3 : 6)
    const c = { ...names(rng), d, a, b, k }
    const nn = num(c), dd = den(c)
    return { text: text(c), expr: expr(c), ans: nn / dd, pref: [], frac: { num: nn, den: dd, pref: pref(c) }, magnitude: 10 + d, skill }
  }
  const R = (text: (c: any) => string, expr: (c: any) => string, ans: (c: any) => number, pref: (c: any) => number[], fmt: (v: number) => string, skill: string): Template => (rng, tier) => {
    const v = rng.int(tier === 1 ? 4 : tier === 2 ? 12 : 20, tier === 1 ? 12 : 90) * (tier === 1 ? 5 : 1), h = rng.int(2, tier === 1 ? 5 : 9), half = tier >= 2 && rng.bool(0.5)
    const c = { ...names(rng), v, h, half, H: half ? `${h}.5` : `${h}`, hv: half ? h + 0.5 : h }
    return { text: text(c), expr: expr(c), ans: ans(c), pref: pref(c), fmt, magnitude: ans(c), skill, units: 10 }
  }
  return [
    D(c => `${c.N} ran ${c.A} km on Monday and ${c.B} km on Tuesday. How far did ${c.N} run in all?`, c => `${c.A}+${c.B}`, c => c.a + c.b, c => [c.a - c.b, c.a + c.b + c.p, c.a + c.b - c.p, c.a + c.b + 1], 'km', 'math: decimal word problems'),
    D(c => `A ribbon is ${c.A} m long. ${c.N} cuts off ${c.B} m. How much ribbon is left?`, c => `${c.A}-${c.B}`, c => c.a - c.b, c => [c.a + c.b, c.a - c.b + c.p, c.a - c.b - c.p, c.a - c.b + 1], 'm', 'math: decimal word problems'),
    D(c => `It rained ${c.A} inches on Monday and ${c.B} inches on Tuesday. How much more rain fell on Monday?`, c => `${c.A}-${c.B}`, c => c.a - c.b, c => [c.a + c.b, c.a - c.b + c.p, c.a - c.b + 1, c.a - c.b - 1], 'inches', 'math: decimal word problems'),
    D(c => `${c.N} earns $${c.A} an hour and works ${c.k} hours. How much does ${c.N} earn?`, c => `${c.A}*${c.k}`, c => c.a * c.k, c => [c.a + c.k * c.p, c.a * (c.k + 1), c.a * (c.k - 1), c.a * c.k + c.p], '$', 'math: money word problems'),
    D(c => `A tank holds ${dec(c.a * c.k + c.b, c.places)} L of water. It uses ${c.A} L a day for ${c.k} days. How much water is left?`, c => `${dec(c.a * c.k + c.b, c.places)}-${c.A}*${c.k}`, c => c.b, c => [c.b + 2 * c.a * c.k, c.b + c.a * c.k - c.a, c.b + c.a, c.a * c.k], 'L', 'math: decimal word problems'),
    D(c => `${c.N} walks ${c.A} km to school and the same distance back, every day for ${c.k} days. How far is that in all?`, c => `${c.A}*2*${c.k}`, c => c.a * 2 * c.k, c => [c.a * c.k, c.a * 2 * (c.k + 1), c.a * 2 * c.k + c.p, c.a * (2 * c.k - 1)], 'km', 'math: decimal word problems'),
    D(c => `${c.N} buys ${c.k} notebooks at $${c.A} each and pays with $${dec(c.a * c.k + c.b, c.places)}. How much change does ${c.N} get?`, c => `${dec(c.a * c.k + c.b, c.places)}-${c.A}*${c.k}`, c => c.b, c => [c.b + 2 * c.a * c.k, c.b + c.a * c.k - c.a, c.b + c.a, c.a * c.k], '$', 'math: money word problems'),
    D(c => `A board is ${dec(c.a * c.k, c.places)} m long. It is cut into ${c.k} equal pieces. How long is each piece?`, c => `${dec(c.a * c.k, c.places)}/${c.k}`, c => c.a, c => [c.a * c.k * c.k, c.a + c.k * c.p, c.a - c.p, c.a + c.p, c.a * 10], 'm', 'math: decimal word problems'),
    F(c => `${c.N} had ${c.a}/${c.d} of a pizza and ate ${c.b}/${c.d} of the pizza. How much of the pizza is left?`, c => `${c.a}/${c.d}-${c.b}/${c.d}`, c => c.a - c.b, c => c.d, c => [[c.a + c.b, c.d], [c.a - c.b, 2 * c.d], [c.a - c.b + 1, c.d], [c.a - c.b - 1, c.d]], 'math: fraction word problems'),
    F(c => `A recipe needs ${c.b}/${c.d} cup of sugar. ${c.N} makes ${c.k} batches. How many cups of sugar are needed?`, c => `${c.b}/${c.d}*${c.k}`, c => c.b * c.k, c => c.d, c => [[c.b + c.k, c.d], [c.b * c.k, c.d * c.k], [c.b * c.k + 1, c.d], [c.b, c.d * c.k]], 'math: fraction word problems'),
    (rng, tier) => {
      // Sharing: more pizzas than friends and never an exact multiple, so the answer is a mixed
      // number and the item is grade-5 work rather than "half a pizza each".
      const f = rng.int(2, tier === 1 ? 4 : tier === 2 ? 5 : 6)
      let p = rng.int(f + 1, f * 3)
      if (p % f === 0) p += 1
      return { text: `${f} friends share ${p} pizzas equally. How much pizza does each friend get?`, expr: `${p}/${f}`, ans: p / f, pref: [], frac: { num: p, den: f, pref: [[f, p], [p + 1, f], [p, f + 1], [p - 1, f], [p + f, f]] }, magnitude: 10 + f + p, skill: 'math: fraction word problems' }
    },
    F(c => `${c.N} drank ${c.b}/${c.d} of a bottle of juice and ${c.N2} drank ${c.a - c.b}/${c.d}. What fraction of the bottle did they drink?`, c => `${c.b}/${c.d}+${c.a - c.b}/${c.d}`, c => c.a, c => c.d, c => [[c.a, 2 * c.d], [c.a + 1, c.d], [c.a - 1, c.d], [2 * c.b - c.a, c.d]], 'math: fraction word problems'),
    (rng, tier) => {
      const d = rng.pick(tier === 1 ? [2, 4, 5] : [3, 4, 5, 6, 8, 10]); const a = rng.pick(Array.from({ length: d - 1 }, (_, i) => i + 1).filter(x => gcd(x, d) === 1)); const t = d * rng.int(tier === 1 ? 3 : 4, tier === 1 ? 8 : 15)
      const girls = t * a / d
      return { text: `${a}/${d} of the ${t} students in a class are girls. How many boys are in the class?`, expr: `${t}-${t}*${a}/${d}`, ans: t - girls, pref: [girls, t / d, t - girls + d, t - girls - d, t - a], magnitude: t, skill: 'math: fraction word problems' }
    },
    R(c => `A car travels ${c.v} miles per hour. How far does it go in ${c.H} hours?`, c => `${c.v}*${c.H}`, c => c.v * c.hv, c => [c.v + c.hv, c.v * (c.hv + 1), c.v * (c.hv - 1), c.v * c.hv + 10], v => `${natDec(Math.round(v * 10), 1)} miles`, 'math: rate word problems'),
    R(c => `A printer prints ${c.v} pages every minute. How many pages does it print in ${c.h} minutes?`, c => `${c.v}*${c.h}`, c => c.v * c.h, c => [c.v + c.h, c.v * (c.h + 1), c.v * (c.h - 1), c.v * c.h + 10], v => `${v} pages`, 'math: rate word problems'),
    R(c => `A train travels ${c.v * c.h} km in ${c.h} hours. What is its speed in km per hour?`, c => `${c.v * c.h}/${c.h}`, c => c.v, c => [c.v * c.h, c.v + c.h, c.v + 10, c.v - 10, c.v * c.h - c.h], v => `${v} km per hour`, 'math: rate word problems'),
    R(c => `${c.N} types ${c.v} words a minute. How many words in ${c.h} minutes?`, c => `${c.v}*${c.h}`, c => c.v * c.h, c => [c.v + c.h, c.v * (c.h + 1), c.v * (c.h - 1), c.v * c.h + c.v], v => `${v} words`, 'math: rate word problems'),
  ]
})()

const BY_GRADE: Template[][] = [K_TEMPLATES, G1_TEMPLATES, G2_TEMPLATES, G3_TEMPLATES, G4_TEMPLATES, G5_TEMPLATES]
const BASE = [0, 10, 22, 40, 60, 78]

/** Fraction decoys as text, never equal in value to num/den. */
function fracDecoys(rng: Rng, num: number, den: number, pref: [number, number][], count: number): string[] {
  const out: string[] = []
  const seen = new Set<string>([fracStr(num, den)])
  const push = (a: number, b: number) => { if (b <= 0 || a <= 0 || a * den === num * b) return; const t = fracStr(a, b); if (!seen.has(t)) { seen.add(t); out.push(t) } }
  for (const [a, b] of pref) push(a, b)
  let tries = 0
  while (out.length < count && tries++ < 100) push(rng.int(1, den + 2), rng.pick([den, den * 2, den + 1]))
  return rng.shuffle(out)
}

/** One-step (K-2), multiplication/division and two-step (3), multi-step (4), fractions, decimals and rates (5). */
export const wordproblems: Generator = {
  id: 'wordproblems',
  name: 'Word problems',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.2, 1: 1.5, 2: 1.5, 3: 1.6, 4: 1.6, 5: 1.6 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const tpl = rng.pick(BY_GRADE[grade])
    const p = tpl(rng, tier)
    const lines = wrap(p.text, 46)
    let choices, answer
    if (p.frac) {
      const ans = fracStr(p.frac.num, p.frac.den)
      const decoys = fracDecoys(rng, p.frac.num, p.frac.den, p.frac.pref, n + 1)
      ;({ choices, answer } = shuffled(rng, ans, decoys, n))
    } else {
      const fmt = p.fmt ?? String
      if (p.units) {
        // Decimal answers: generate decoys at the template's granularity (tenths or hundredths).
        const U = p.units
        const units = Math.round(p.ans * U)
        const pref = p.pref.map(v => Math.round(v * U))
        const d = numDecoys(rng, units, n - 1, pref, Math.max(3, Math.round(units * 0.15)), 1).map(u => fmt(u / U))
        ;({ choices, answer } = shuffled(rng, fmt(p.ans), d, n))
      } else {
        // No answer in this family is ever 0, so a decoy of 0 is only ever eliminable filler.
        const d = numDecoys(rng, p.ans, n - 1, p.pref, p.spread ?? Math.max(2, Math.round(p.ans * 0.2)), 1).map(fmt)
        ;({ choices, answer } = shuffled(rng, fmt(p.ans), d, n))
      }
    }
    const spoken = `${p.text} ${sayChoices(choices)}?`
    return mathRiddle({
      family: 'wordproblems', skill: p.skill, prompt: lines, visual: p.visual,
      choices, answer, spoken, metric: BASE[grade] + tier * 2 + Math.log2(Math.max(2, p.magnitude)) * 1.5, grade, tier,
    }, `num:${p.expr}`)
  },
}

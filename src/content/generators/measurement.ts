import type { Generator, Grade, Tier, Riddle } from '../types'
import type { Rng } from '../../engine/rng'
import { shuffled, choiceCount, cap } from '../types'
import { mathRiddle, sayChoices, numDecoys, fmtInt, fmtDec, wrap, NAMES } from './mathutil'

// K: ordered triples [least, middle, most]. The heaviest item is always unambiguous ("rock" was not:
// a pebble is lighter than an apple).
const HEAVY = [['feather', 'apple', 'brick'], ['leaf', 'book', 'rock'], ['balloon', 'shoe', 'bowling ball'], ['button', 'cup', 'chair'], ['ant', 'cat', 'elephant'], ['sock', 'pumpkin', 'car'], ['crayon', 'bag of flour', 'bike'], ['paper clip', 'banana', 'TV'], ['pencil', 'brick', 'horse'], ['cotton ball', 'orange', 'piano'], ['bubble', 'egg', 'truck'], ['ribbon', 'melon', 'cow']]
const LONG = [['ant', 'pencil', 'bus'], ['crayon', 'broom', 'train'], ['spoon', 'baseball bat', 'road'], ['key', 'ruler', 'river'], ['coin', 'shoe', 'snake'], ['bead', 'rope', 'street'], ['pea', 'carrot', 'ladder'], ['button', 'book', 'bed'], ['pin', 'scarf', 'bridge'], ['seed', 'stick', 'fence']]
const TALL = [['mouse', 'dog', 'giraffe'], ['flower', 'child', 'tree'], ['cup', 'chair', 'house'], ['ball', 'table', 'tower'], ['cat', 'horse', 'building'], ['bug', 'bush', 'mountain'], ['shoe', 'door', 'lighthouse'], ['book', 'lamp', 'skyscraper']]
// Everything here is a word a five-year-old knows (no thimble, no egg cup).
const HOLDS = [['spoon', 'cup', 'bathtub'], ['cup', 'bucket', 'pool'], ['spoon', 'bottle', 'bathtub'], ['glass', 'jug', 'pond'], ['teaspoon', 'bowl', 'sink'], ['cup', 'pot', 'lake']]
/** The scale art draws one short centred label per pan, so both pictured items must be short words. */
const SCALE_TRIPLES = HEAVY.filter(t => !t[0].includes(' ') && !t[2].includes(' ') && t[0].length <= 8 && t[2].length <= 8)
const SAME_WEIGHT = 'They weigh the same'

// Grade 1: which unit / which tool. Inches and feet only -- metric prefixes and ounces/pounds/tons
// are grades 3-4 content and their words are well past a six-year-old's decoding.
const UNIT_ITEMS: { thing: string; unit: string }[] = [
  { thing: 'a pencil', unit: 'inches' }, { thing: 'a crayon', unit: 'inches' }, { thing: 'a spoon', unit: 'inches' }, { thing: 'a book', unit: 'inches' }, { thing: 'a shoe', unit: 'inches' }, { thing: 'your hand', unit: 'inches' },
  { thing: 'a room', unit: 'feet' }, { thing: 'a bed', unit: 'feet' }, { thing: 'a car', unit: 'feet' }, { thing: 'a door', unit: 'feet' }, { thing: 'a tree', unit: 'feet' }, { thing: 'a school bus', unit: 'feet' },
]
const US_UNITS = ['inches', 'feet', 'miles']
/** Ordered short-to-long unit sets for "which one is longer?". */
const UNIT_SIZES = [['1 inch', '1 foot', '1 mile'], ['1 inch', '1 foot', '1 yard'], ['1 foot', '1 yard', '1 mile'], ['1 inch', '1 yard', '1 mile']]
const TOOLS: { q: string; a: string }[] = [
  { q: 'how heavy a dog is', a: 'a scale' }, { q: 'how long a table is', a: 'a ruler' }, { q: 'how much water fits in a jug', a: 'a measuring cup' }, { q: 'how long recess lasts', a: 'a clock' }, { q: 'how hot it is outside', a: 'a thermometer' },
  { q: 'how tall you are', a: 'a ruler' }, { q: 'how heavy a watermelon is', a: 'a scale' }, { q: 'how much milk is in a bowl', a: 'a measuring cup' }, { q: 'how long a song is', a: 'a clock' }, { q: 'your temperature', a: 'a thermometer' },
]
const TOOL_NAMES = ['a scale', 'a ruler', 'a measuring cup', 'a clock', 'a thermometer']

// Grade 2: estimates (value, unit) with decoys a factor of 10 away. `tall` items are asked with
// "About how tall is...?", which is the vocabulary grade 2 is taught.
const ESTIMATES: { thing: string; v: number; unit: string; tall?: boolean }[] = [
  { thing: 'a crayon', v: 10, unit: 'cm' }, { thing: 'a pencil', v: 15, unit: 'cm' }, { thing: 'a book', v: 25, unit: 'cm' }, { thing: 'your finger', v: 5, unit: 'cm' }, { thing: 'a spoon', v: 15, unit: 'cm' }, { thing: 'an ant', v: 1, unit: 'cm' },
  { thing: 'a door', v: 2, unit: 'm', tall: true }, { thing: 'a car', v: 4, unit: 'm' }, { thing: 'a bed', v: 2, unit: 'm' }, { thing: 'a bus', v: 10, unit: 'm' }, { thing: 'a classroom', v: 8, unit: 'm' }, { thing: 'a football field', v: 100, unit: 'm' }, { thing: 'a tree', v: 20, unit: 'm', tall: true },
  { thing: 'a pencil', v: 7, unit: 'inches' }, { thing: 'a spoon', v: 6, unit: 'inches' }, { thing: 'a book', v: 9, unit: 'inches' }, { thing: 'a door', v: 7, unit: 'feet', tall: true }, { thing: 'a car', v: 15, unit: 'feet' }, { thing: 'a bus', v: 40, unit: 'feet' }, { thing: 'a classroom', v: 30, unit: 'feet' },
]
const OTHER_UNIT: Record<string, string> = { cm: 'm', m: 'cm', inches: 'feet', feet: 'inches' }

// Grade 3: how many X in Y.
const FACTS: [string, string, number, number][] = [
  ['minutes', 'an hour', 60, 1], ['seconds', 'a minute', 60, 1], ['hours', 'a day', 24, 1], ['days', 'a week', 7, 1], ['months', 'a year', 12, 1], ['inches', 'a foot', 12, 1],
  ['feet', 'a yard', 3, 2], ['cups', 'a pint', 2, 2], ['pints', 'a quart', 2, 2], ['quarts', 'a gallon', 4, 2], ['cups', 'a quart', 4, 2], ['ounces', 'a pound', 16, 2], ['centimeters', 'a meter', 100, 2], ['minutes', 'half an hour', 30, 2],
  ['weeks', 'a year', 52, 3], ['days', 'a year', 365, 3], ['meters', 'a kilometer', 1000, 3], ['grams', 'a kilogram', 1000, 3], ['millimeters', 'a centimeter', 10, 3], ['inches', 'a yard', 36, 3], ['seconds', 'an hour', 3600, 3], ['pounds', 'a ton', 2000, 3],
]

// Grades 4-5: conversions big -> small.
const CONV: { big: string; small: string; f: number; level: number }[] = [
  { big: 'feet', small: 'inches', f: 12, level: 1 }, { big: 'yards', small: 'feet', f: 3, level: 1 }, { big: 'meters', small: 'centimeters', f: 100, level: 1 }, { big: 'hours', small: 'minutes', f: 60, level: 1 }, { big: 'weeks', small: 'days', f: 7, level: 1 },
  { big: 'kilometers', small: 'meters', f: 1000, level: 2 }, { big: 'kilograms', small: 'grams', f: 1000, level: 2 }, { big: 'minutes', small: 'seconds', f: 60, level: 2 }, { big: 'gallons', small: 'quarts', f: 4, level: 2 }, { big: 'days', small: 'hours', f: 24, level: 2 }, { big: 'liters', small: 'milliliters', f: 1000, level: 2 },
  { big: 'pounds', small: 'ounces', f: 16, level: 3 }, { big: 'centimeters', small: 'millimeters', f: 10, level: 3 }, { big: 'yards', small: 'inches', f: 36, level: 3 }, { big: 'quarts', small: 'cups', f: 4, level: 3 }, { big: 'tons', small: 'pounds', f: 2000, level: 3 },
]
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
/** Bar-chart subjects are all countable, so no choice claims a unit the picture never draws. */
const CHART = ['books', 'laps', 'goals', 'stickers', 'points', 'stars']
const singular = (u: string) => u === 'feet' ? 'foot' : u === 'inches' ? 'inch' : u.replace(/s$/, '')
/** "1 minute", "2 minutes", "1 foot". Always carries its unit, whatever the unit is. */
const withUnit = (v: number, u: string) => `${fmtInt(v)} ${v === 1 ? singular(u) : u}`
/**
 * The independent answer check in test/math.test.ts reads "3 hours" as a duration (180 minutes), so
 * an hour count that is displayed as a whole number is checked in minutes.
 */
const checkVal = (expr: string, u: string) => u === 'hours' ? `(${expr})*60` : expr
/** Two-step conversion stories by big unit: (name, "3 meters", "170 centimeters", "centimeters") -> text. */
const TWO_STEP: Record<string, (name: string, big: string, cut: string, small: string) => string> = {
  meters: (n, b, c, s) => `${n} has ${b} of ribbon and uses ${c}. How many ${s} are left?`,
  liters: (n, b, c, s) => `${n} has ${b} of juice and pours out ${c}. How many ${s} are left?`,
  hours: (n, b, c, s) => `${n} has ${b} of free time and reads for ${c}. How many ${s} are left?`,
  feet: (n, b, c, s) => `A board is ${b} long. ${n} cuts off ${c}. How many ${s} are left?`,
  kilograms: (n, b, c, s) => `A bag holds ${b} of rice. ${n} uses ${c}. How many ${s} are left?`,
  yards: (n, b, c, s) => `A rope is ${b} long. ${n} cuts off ${c}. How many ${s} are left?`,
  kilometers: (n, b, c, s) => `A trail is ${b} long. ${n} has walked ${c}. How many ${s} are left?`,
  minutes: (n, b, c, s) => `A song is ${b} long. ${n} has heard ${c} of it. How many ${s} are left?`,
}

const natDec = (units: number, places: number): string => {
  let s = fmtDec(units, places)
  if (s.includes('.')) { s = s.replace(/0+$/, ''); if (s.endsWith('.')) s = s.slice(0, -1) }
  return s
}

/** Longer/heavier (K), units and tools (1), estimates and thermometers (2), facts (3), conversions (4), decimal conversions and bar charts (5). */

/** Bar-chart values: single units for grade 3, the fuller spread from grade 4 up. */
const SMALL_VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
const BIG_VALUES = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20]

/**
 * Reading a bar chart. Written once and asked from grade 3 up: scaled picture and bar graphs are a
 * 3rd-grade standard, and until this was shared the chart lived at grade 5 only, which left grades
 * 3 and 4 with almost no riddle that has a picture at all.
 */
function barChart(mode: string, grade: Grade, tier: Tier, rng: Rng, n: number, base: number, pool: number[]): Riddle {
  const what = rng.pick(CHART)
  const values = rng.sample(pool, 5)
  // A caption, not a sentence: "The chart shows stickers for each day." wrapped to a third line
  // beside the chart and drove the whole question down to 26px type.
  const prompt0 = `${cap(what)} each day:`
  const vis = { kind: 'bars', values, labels: DAYS } as const
  if (mode === 'bars') {
    const most = rng.bool()
    const target = most ? Math.max(...values) : Math.min(...values)
    const label = DAYS[values.indexOf(target)]
    const { choices, answer } = shuffled(rng, label, DAYS.filter(d => d !== label), n)
    const prompt = [prompt0, `Which day had the ${most ? 'most' : 'fewest'} ${what}?`]
    return mathRiddle({ family: 'measurement', skill: 'math: reading bar charts', prompt, visual: vis, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: base + tier * 3, grade, tier }, most ? 'barmax' : 'barmin')
  }
  if (mode === 'barsDiff') {
    const [i, j] = rng.sample([0, 1, 2, 3, 4], 2)
    const hi = values[i] > values[j] ? i : j, lo = hi === i ? j : i
    const diff = values[hi] - values[lo]
    const decoys = numDecoys(rng, diff, n - 1, [values[hi] + values[lo], values[hi], values[lo], diff + 1, diff - 1], 3, 1).map(String)
    const { choices, answer } = shuffled(rng, String(diff), decoys, n)
    const prompt = [prompt0, `How many more ${what} on ${DAYS[hi]} than ${DAYS[lo]}?`]
    return mathRiddle({ family: 'measurement', skill: 'math: reading bar charts', prompt, visual: vis, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: base + 2 + tier * 3, grade, tier }, `num:${values[hi]}-${values[lo]}`)
  }
  const total = values.reduce((a, b) => a + b, 0)
  const decoys = numDecoys(rng, total, n - 1, [total - Math.min(...values), total + Math.max(...values), total + 1, total - 1, total + 5], 6, 1).map(String)
  const { choices, answer } = shuffled(rng, String(total), decoys, n)
  const prompt = [prompt0, `How many ${what} in the whole week?`]
  return mathRiddle({ family: 'measurement', skill: 'math: reading bar charts', prompt, visual: vis, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: base + 4 + tier * 3, grade, tier }, `num:${values.join('+')}`)
}

export const measurement: Generator = {
  id: 'measurement',
  name: 'Measurement',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.2, 1: 1, 2: 1, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)

    if (grade === 0) {
      type M = 'heavy' | 'long' | 'tall' | 'holds' | 'scale'
      const modes: M[] = tier === 1 ? ['heavy', 'long'] : tier === 2 ? ['heavy', 'long', 'tall', 'scale'] : ['heavy', 'long', 'tall', 'holds', 'scale']
      const mode = rng.pick(modes)
      // Tier 3 draws from the half of each table the easier tiers never see.
      const half = <T>(t: T[]): T[] => tier === 3 ? t.slice(Math.floor(t.length / 2)) : t.slice(0, Math.ceil(t.length / 2))
      if (mode === 'scale') {
        const [a, , c] = rng.pick(half(SCALE_TRIPLES))
        const askHeavy = tier === 3 ? rng.bool() : true
        // Only the two objects the picture draws are offered, plus the state the pans could be in.
        // Nothing on the list is an object the child cannot see, so nothing is answerable by
        // elimination, and the comparative now matches what is drawn.
        const leftHeavy = rng.bool()
        const ans = askHeavy ? c : a
        const { choices, answer } = shuffled(rng, ans, [askHeavy ? a : c, SAME_WEIGHT], n)
        const prompt = ['Look at the scale.', `Which one is ${askHeavy ? 'heavier' : 'lighter'}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: comparing weight', prompt, visual: { kind: 'scale', left: leftHeavy ? c : a, right: leftHeavy ? a : c, heavier: leftHeavy ? 'left' : 'right' }, choices, answer, spoken: `Look at the scale. Which one is ${askHeavy ? 'heavier' : 'lighter'}? ${sayChoices(choices)}?`, metric: 6 + tier, grade, tier }, '')
      }
      const table = mode === 'heavy' ? HEAVY : mode === 'long' ? LONG : mode === 'tall' ? TALL : HOLDS
      const triple = rng.pick(half(table))
      const most = rng.bool(tier === 1 ? 0.75 : 0.6)
      const words = mode === 'heavy' ? ['heaviest', 'lightest'] : mode === 'long' ? ['longest', 'shortest'] : mode === 'tall' ? ['tallest', 'shortest'] : ['the most', 'the least']
      const ans = most ? triple[2] : triple[0]
      const { choices, answer } = shuffled(rng, ans, triple.filter(t => t !== ans), n)
      const prompt = [mode === 'holds' ? `Which one holds ${most ? words[0] : words[1]}?` : `Which one is the ${most ? words[0] : words[1]}?`]
      return mathRiddle({ family: 'measurement', skill: `math: comparing ${mode === 'heavy' ? 'weight' : mode === 'holds' ? 'capacity' : 'length'}`, prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 4 + tier + (most ? 0 : 1), grade, tier }, '')
    }

    if (grade === 1) {
      // Tier 1 mixes the unit choice with the tool question rather than running one template 14 times.
      const mode = rng.pick(tier === 1 ? ['unit', 'tool'] : ['unit', 'tool', 'bigger'])
      if (mode === 'bigger') {
        const set = rng.pick(UNIT_SIZES)
        const longer = rng.bool()
        const ans = longer ? set[2] : set[0]
        const { choices, answer } = shuffled(rng, ans, rng.shuffle(set.filter(u => u !== ans)), n)
        const prompt = [`Which one is ${longer ? 'longer' : 'shorter'}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: choosing units', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 18 + tier * 2, grade, tier }, '')
      }
      // Tier 3 uses the objects the easier tiers do not.
      const oddEven = <T>(t: T[]): T[] => t.filter((_, i) => (tier === 3 ? i % 2 === 1 : i % 2 === 0))
      if (mode === 'tool') {
        const t = rng.pick(oddEven(TOOLS))
        const { choices, answer } = shuffled(rng, t.a, rng.shuffle(TOOL_NAMES.filter(x => x !== t.a)), n)
        const prompt = ['What would you use to measure', `${t.q}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: measuring tools', prompt, choices, answer, spoken: `What would you use to measure ${t.q}? ${sayChoices(choices)}?`, metric: 12 + tier * 2, grade, tier }, '')
      }
      const item = rng.pick(oddEven(UNIT_ITEMS))
      const { choices, answer } = shuffled(rng, item.unit, rng.shuffle(US_UNITS.filter(u => u !== item.unit)), n)
      const prompt = ['Which unit is best to measure', `${item.thing}?`]
      return mathRiddle({ family: 'measurement', skill: 'math: choosing units', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 12 + tier * 2, grade, tier }, '')
    }

    if (grade === 2) {
      const mode = rng.pick(tier === 1 ? ['estimate', 'thermo'] : tier === 2 ? ['estimate', 'thermo', 'weather'] : ['estimate', 'thermo', 'weather', 'change'])
      if (mode === 'estimate') {
        const e = rng.pick(ESTIMATES)
        const txt = (v: number, u: string) => `${fmtInt(v)} ${v === 1 && (u === 'inches' || u === 'feet') ? singular(u) : u}`
        const other = OTHER_UNIT[e.unit]
        // Two decoys must never be the same length in different words: "2500 cm" and "25 m" are one
        // wrong answer written twice, and it costs the question a choice.
        const FACTOR: Record<string, number> = { cm: 1, m: 100, inches: 1, feet: 12 }
        const asBase = (v: number, u: string): number => v * (FACTOR[u] ?? 1)
        const cands: [number, string][] = [[e.v * 10, e.unit], [e.v, other], [Math.max(1, Math.round(e.v / 10)), e.unit], [e.v * 100, e.unit]]
        const seenLen = new Set([asBase(e.v, e.unit)])
        const decoys: string[] = []
        for (const [v, u] of cands) {
          const base = asBase(v, u)
          if (seenLen.has(base)) continue
          seenLen.add(base)
          decoys.push(txt(v, u))
        }
        rng.shuffle(decoys)
        const { choices, answer } = shuffled(rng, txt(e.v, e.unit), decoys, n)
        const prompt = [`About how ${e.tall ? 'tall' : 'long'} is ${e.thing}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: estimating length', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 22 + tier * 3, grade, tier }, '')
      }
      // The thermometer art ticks every 10 degrees F (5 C), so both the reading and every decoy sit
      // on a tick: a 1-degree decoy cannot be told from the answer in the picture.
      const unit: 'F' | 'C' = tier === 3 && rng.bool(0.5) ? 'C' : 'F'
      const tick = unit === 'F' ? 10 : 5
      // Celsius stays at or above zero: negative numbers are a grade-6 standard.
      const deg = unit === 'F' ? rng.int(2, tier === 1 ? 8 : 10) * 10 : rng.int(0, 8) * 5
      if (mode === 'weather') {
        const label = unit === 'F' ? (deg >= 85 ? 'hot' : deg <= 40 ? 'cold' : 'mild') : (deg >= 30 ? 'hot' : deg <= 5 ? 'cold' : 'mild')
        if (label === 'mild') return measurement.make(grade, tier, rng)
        const { choices, answer } = shuffled(rng, label, [label === 'hot' ? 'cold' : 'hot', 'just right'], n)
        const prompt = [`The thermometer shows ${deg}°${unit}.`, 'What is the weather like?']
        return mathRiddle({ family: 'measurement', skill: 'math: temperature', prompt, visual: { kind: 'thermometer', degrees: deg, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 26 + tier * 3, grade, tier }, '')
      }
      if (mode === 'change') {
        const delta = rng.int(1, 3) * tick
        const up = rng.bool() || deg - delta < 0
        const ans = up ? deg + delta : deg - delta
        const decoys = numDecoys(rng, ans, n - 1, [deg, up ? deg - delta : deg + delta, ans + tick, ans - tick, ans + 2 * tick], tick * 2, 0).map(d => `${d}°${unit}`)
        const { choices, answer } = shuffled(rng, `${ans}°${unit}`, decoys, n)
        const prompt = [`The thermometer shows ${deg}°${unit}.`, `It gets ${delta}° ${up ? 'warmer' : 'colder'}. What is it now?`]
        return mathRiddle({ family: 'measurement', skill: 'math: temperature', prompt, visual: { kind: 'thermometer', degrees: deg, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 30 + tier * 3, grade, tier }, `num:${deg}${up ? '+' : '-'}${delta}`)
      }
      const steps = rng.shuffle([1, -1, 2, -2, 3, -3]).map(j => deg + j * tick).filter(d => d >= (unit === 'C' ? 0 : 0))
      const { choices, answer } = shuffled(rng, `${deg}°${unit}`, steps.map(d => `${d}°${unit}`), n)
      const prompt = ['What temperature does the', 'thermometer show?']
      return mathRiddle({ family: 'measurement', skill: 'math: reading a thermometer', prompt, visual: { kind: 'thermometer', degrees: deg, unit }, choices, answer, spoken: `What temperature does the thermometer show? ${sayChoices(choices)}?`, metric: 22 + tier * 3 + (unit === 'C' ? 2 : 0), grade, tier }, `num:${deg}`)
    }

    if (grade === 3) {
      // Reading a scaled bar graph is a 3rd-grade standard, and it is one of the few riddles at this
      // grade that comes with a picture, so it is one item in four from tier 2 on.
      if (tier >= 2 && rng.bool(0.25)) return barChart(tier === 2 ? 'bars' : 'barsDiff', grade, tier, rng, n, 39, SMALL_VALUES)
      // Tier 3 is the multi-step question almost every time, and its plain recalls are the level-3
      // facts only, so it is no longer a re-run of tier 2.
      const multi = tier === 3 && rng.bool(0.8)
      const pool = multi
        ? FACTS.filter(f => f[3] >= 2 && f[2] <= 100)
        : FACTS.filter(f => tier === 3 ? f[3] === 3 : f[3] <= tier && (tier === 1 || f[3] >= tier - 1))
      const [what, inWhat, v] = rng.pick(pool)
      if (multi) {
        const k = rng.int(2, 6)
        const ans = v * k
        const decoys = numDecoys(rng, ans, n - 1, [v + k, v * (k + 1), v * (k - 1), ans + v / 2, ans + 10, ans - 10], Math.max(3, Math.round(ans / 10)), 1).map(fmtInt)
        const { choices, answer } = shuffled(rng, fmtInt(ans), decoys, n)
        const plural = inWhat.replace(/^an? /, '').replace(/^half /, '')
        const prompt = [`How many ${what} are in ${k} ${plural}${plural.endsWith('s') ? '' : 's'}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: measurement facts', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 34 + tier * 4 + Math.log2(ans) * 2, grade, tier }, `num:${v}*${k}`)
      }
      // Near misses derived from the fact itself; `sameSize` keeps decoys within an order of
      // magnitude so a child cannot cross two of four choices off on sight.
      const near = v >= 100 ? [v + v / 10, v - v / 10, v + 100, v - 100] : [v + 2, v - 2, v + 10, v - 10]
      const decoys = numDecoys(rng, v, n - 1, [v * 2, Math.round(v / 2), v * 10, Math.round(v / 10), ...near], Math.max(2, Math.round(v / 5)), 1, Number.MAX_SAFE_INTEGER, true).map(fmtInt)
      const { choices, answer } = shuffled(rng, fmtInt(v), decoys, n)
      const prompt = [`How many ${what} are in ${inWhat}?`]
      return mathRiddle({ family: 'measurement', skill: 'math: measurement facts', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 30 + tier * 4 + Math.log2(v) * 2, grade, tier }, `num:${v}`)
    }

    if (grade === 4) {
      // Charts again, with the fuller spread of values and the harder questions the grade can take.
      if (rng.bool(0.25)) return barChart(tier === 1 ? 'bars' : tier === 2 ? 'barsDiff' : 'barsTotal', grade, tier, rng, n, 44, BIG_VALUES)
      const mode = rng.pick(tier === 1 ? ['up'] : tier === 2 ? ['up', 'down'] : ['up', 'down', 'mixed'])
      // At tier 2 the "up" conversions are level-2 only, so no tier-2 card is character-for-character
      // a tier-1 card; level-1 facts come back only in the new "down" direction.
      const levels = mode === 'up'
        ? (tier === 1 ? [1] : tier === 2 ? [2] : [2, 3])
        : (tier === 2 ? [1, 2] : [1, 2, 3])
      const c = rng.pick(CONV.filter(x => levels.includes(x.level)))
      if (mode === 'mixed') {
        const big = rng.int(1, 5), extra = rng.int(1, c.f - 1)
        const ans = big * c.f + extra
        const decoys = numDecoys(rng, ans, n - 1, [big + extra, big * c.f, ans + c.f, ans - c.f, (big + 1) * c.f, ans + 10], Math.max(3, Math.round(c.f / 2)), 1).map(v => withUnit(v, c.small))
        const { choices, answer } = shuffled(rng, withUnit(ans, c.small), decoys, n)
        const prompt = [`${withUnit(big, c.big)} ${withUnit(extra, c.small)} = ? ${c.small}`]
        return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${big} ${c.big} and ${extra} ${c.small} is how many ${c.small}? ${sayChoices(choices)}?`, metric: 52 + tier * 3 + Math.log2(ans) * 2, grade, tier }, `num:${checkVal(`${big}*${c.f}+${extra}`, c.small)}`)
      }
      const k = rng.int(2, c.f >= 100 ? 9 : 12)
      if (mode === 'down') {
        const small = k * c.f
        const decoys = numDecoys(rng, k, n - 1, [k + 1, k - 1, k * 2, k + 10, Math.round(small / 10), k * c.f], 3, 1).map(v => withUnit(v, c.big))
        const { choices, answer } = shuffled(rng, withUnit(k, c.big), decoys, n)
        const prompt = [`${fmtInt(small)} ${c.small} = ? ${c.big}`]
        return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${fmtInt(small)} ${c.small} is how many ${c.big}? ${sayChoices(choices)}?`, metric: 50 + tier * 3 + Math.log2(small) * 2, grade, tier }, `num:${checkVal(`${small}/${c.f}`, c.big)}`)
      }
      const ans = k * c.f
      const decoys = numDecoys(rng, ans, n - 1, [k + c.f, ans + c.f, ans - c.f, ans * 10, Math.round(ans / 10), (k + 1) * c.f], Math.max(3, Math.round(c.f / 2)), 1).map(v => withUnit(v, c.small))
      const { choices, answer } = shuffled(rng, withUnit(ans, c.small), decoys, n)
      const prompt = [`${k} ${c.big} = ? ${c.small}`]
      return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${k} ${c.big} is how many ${c.small}? ${sayChoices(choices)}?`, metric: 48 + tier * 3 + Math.log2(ans) * 2, grade, tier }, `num:${checkVal(`${k}*${c.f}`, c.small)}`)
    }

    // grade 5 -- bar charts are one item in three, and the harder chart questions are held back.
    const mode = rng.pick(tier === 1 ? ['decimalUp', 'decimalUp', 'bars'] : tier === 2 ? ['decimalUp', 'decimalDown', 'barsDiff', 'twoStep'] : ['decimalUp', 'decimalDown', 'twoStep', 'barsTotal'])
    if (mode.startsWith('bars')) return barChart(mode, grade, tier, rng, n, 60, BIG_VALUES)
    const c = rng.pick(CONV.filter(x => x.f >= 4 && (mode !== 'twoStep' || TWO_STEP[x.big])))
    if (mode === 'twoStep') {
      const name = rng.pick(NAMES)
      const big = rng.int(1, 5), cut = rng.int(1, big * c.f - 1)
      const ans = big * c.f - cut
      // Never cut exactly half: "a 1-yard rope, cut off 18 inches, how many inches are left?" has
      // the answer written in the question.
      if (ans === cut) return measurement.make(grade, tier, rng)
      const decoys = numDecoys(rng, ans, n - 1, [big * c.f + cut, big - cut, cut, ans + c.f, ans - c.f], Math.max(3, Math.round(c.f / 4)), 1).map(v => withUnit(v, c.small))
      const { choices, answer } = shuffled(rng, withUnit(ans, c.small), decoys, n)
      const prompt = wrap(TWO_STEP[c.big](name, withUnit(big, c.big), withUnit(cut, c.small), c.small))
      return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 68 + tier * 3 + Math.log2(ans) / 2, grade, tier }, `num:${checkVal(`${big}*${c.f}-${cut}`, c.small)}`)
    }
    // decimal conversions
    const places = tier === 1 ? 1 : 2
    const p = Math.pow(10, places)
    if (mode === 'decimalDown') {
      // small -> big with a decimal result, e.g. 350 cm = 3.5 m
      const bigUnits = rng.int(1, 9) * p + rng.int(1, p - 1)
      const small = bigUnits * c.f / p
      if (!Number.isInteger(small)) return measurement.make(grade, tier, rng)
      const decoys = numDecoys(rng, bigUnits, n - 1, [bigUnits * 10, Math.round(bigUnits / 10), bigUnits + p, bigUnits - p, small], Math.max(2, p / 2), 1).map(v => `${natDec(v, places)} ${c.big}`)
      const { choices, answer } = shuffled(rng, `${natDec(bigUnits, places)} ${c.big}`, decoys, n)
      const prompt = [`${fmtInt(small)} ${c.small} = ? ${c.big}`]
      return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${fmtInt(small)} ${c.small} is how many ${c.big}? ${sayChoices(choices)}?`, metric: 66 + tier * 3 + places * 2, grade, tier }, `num:${fmtInt(small).replace(/,/g, '')}/${c.f}`)
    }
    const bigUnits = rng.int(1, 9) * p + rng.pick([p / 2, p / 4, p / 5, 3 * p / 4].filter(Number.isInteger))
    const small = bigUnits * c.f / p
    if (!Number.isInteger(small)) return measurement.make(grade, tier, rng)
    const bigT = natDec(bigUnits, places)
    const decoys = numDecoys(rng, small, n - 1, [small * 10, Math.round(small / 10), small + c.f, small - c.f, bigUnits], Math.max(3, Math.round(c.f / 4)), 1).map(v => withUnit(v, c.small))
    const { choices, answer } = shuffled(rng, withUnit(small, c.small), decoys, n)
    const prompt = [`${bigT} ${c.big} = ? ${c.small}`]
    return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${bigT} ${c.big} is how many ${c.small}? ${sayChoices(choices)}?`, metric: 64 + tier * 3 + places * 2, grade, tier }, `num:${checkVal(`${bigT}*${c.f}`, c.small)}`)
  },
}

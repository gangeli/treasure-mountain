import type { Generator } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys, fmtInt, fmtDec, wrap, NAMES } from './mathutil'

// K: ordered triples [least, middle, most].
const HEAVY = [['feather', 'apple', 'rock'], ['leaf', 'book', 'brick'], ['balloon', 'shoe', 'bowling ball'], ['button', 'cup', 'chair'], ['ant', 'cat', 'elephant'], ['sock', 'pumpkin', 'car'], ['crayon', 'bag of flour', 'bike'], ['paper clip', 'banana', 'TV'], ['pencil', 'brick', 'horse'], ['cotton ball', 'orange', 'piano'], ['bubble', 'egg', 'truck'], ['ribbon', 'melon', 'cow']]
const LONG = [['ant', 'pencil', 'bus'], ['crayon', 'broom', 'train'], ['spoon', 'baseball bat', 'road'], ['key', 'ruler', 'river'], ['coin', 'shoe', 'snake'], ['bead', 'rope', 'street'], ['pea', 'carrot', 'ladder'], ['button', 'book', 'bed'], ['pin', 'scarf', 'bridge'], ['seed', 'stick', 'fence']]
const TALL = [['mouse', 'dog', 'giraffe'], ['flower', 'child', 'tree'], ['cup', 'chair', 'house'], ['ball', 'table', 'tower'], ['cat', 'horse', 'building'], ['bug', 'bush', 'mountain'], ['shoe', 'door', 'lighthouse'], ['book', 'lamp', 'skyscraper']]
const HOLDS = [['spoon', 'cup', 'bathtub'], ['cup', 'bucket', 'pool'], ['thimble', 'bottle', 'bathtub'], ['glass', 'jug', 'pond'], ['teaspoon', 'bowl', 'sink'], ['egg cup', 'pot', 'lake']]

// Grade 1: which unit / which tool.
const UNIT_ITEMS: { thing: string; unit: string; system: 'us' | 'metric' | 'weight' }[] = [
  { thing: 'a pencil', unit: 'inches', system: 'us' }, { thing: 'a crayon', unit: 'inches', system: 'us' }, { thing: 'a spoon', unit: 'inches', system: 'us' }, { thing: 'a book', unit: 'inches', system: 'us' }, { thing: 'a shoe', unit: 'inches', system: 'us' }, { thing: 'your hand', unit: 'inches', system: 'us' },
  { thing: 'a room', unit: 'feet', system: 'us' }, { thing: 'a bed', unit: 'feet', system: 'us' }, { thing: 'a car', unit: 'feet', system: 'us' }, { thing: 'a door', unit: 'feet', system: 'us' }, { thing: 'a tree', unit: 'feet', system: 'us' }, { thing: 'a school bus', unit: 'feet', system: 'us' },
  { thing: 'a trip to another city', unit: 'miles', system: 'us' }, { thing: 'a long road', unit: 'miles', system: 'us' }, { thing: 'a river', unit: 'miles', system: 'us' }, { thing: 'a plane trip', unit: 'miles', system: 'us' }, { thing: 'a highway', unit: 'miles', system: 'us' },
  { thing: 'a finger', unit: 'centimeters', system: 'metric' }, { thing: 'an eraser', unit: 'centimeters', system: 'metric' }, { thing: 'a key', unit: 'centimeters', system: 'metric' }, { thing: 'a pencil', unit: 'centimeters', system: 'metric' },
  { thing: 'a classroom', unit: 'meters', system: 'metric' }, { thing: 'a bus', unit: 'meters', system: 'metric' }, { thing: 'a swimming pool', unit: 'meters', system: 'metric' }, { thing: 'a house', unit: 'meters', system: 'metric' },
  { thing: 'a trip between two towns', unit: 'kilometers', system: 'metric' }, { thing: 'a marathon', unit: 'kilometers', system: 'metric' }, { thing: 'a long river', unit: 'kilometers', system: 'metric' },
  { thing: 'a letter', unit: 'ounces', system: 'weight' }, { thing: 'a cookie', unit: 'ounces', system: 'weight' }, { thing: 'a person', unit: 'pounds', system: 'weight' }, { thing: 'a dog', unit: 'pounds', system: 'weight' }, { thing: 'a bag of apples', unit: 'pounds', system: 'weight' }, { thing: 'a truck', unit: 'tons', system: 'weight' }, { thing: 'an elephant', unit: 'tons', system: 'weight' }, { thing: 'a whale', unit: 'tons', system: 'weight' },
]
const UNITS: Record<string, string[]> = { us: ['inches', 'feet', 'miles'], metric: ['centimeters', 'meters', 'kilometers'], weight: ['ounces', 'pounds', 'tons'] }
const TOOLS: { q: string; a: string }[] = [
  { q: 'how heavy a dog is', a: 'a scale' }, { q: 'how long a table is', a: 'a ruler' }, { q: 'how much water fits in a jug', a: 'a measuring cup' }, { q: 'how long recess lasts', a: 'a clock' }, { q: 'how hot it is outside', a: 'a thermometer' },
  { q: 'how tall you are', a: 'a ruler' }, { q: 'how heavy a watermelon is', a: 'a scale' }, { q: 'how much milk is in a bowl', a: 'a measuring cup' }, { q: 'how long a song is', a: 'a clock' }, { q: 'if you have a fever', a: 'a thermometer' },
]
const TOOL_NAMES = ['a scale', 'a ruler', 'a measuring cup', 'a clock', 'a thermometer']

// Grade 2: estimates (value, unit) with decoys a factor of 10 away.
const ESTIMATES: { thing: string; v: number; unit: string }[] = [
  { thing: 'a crayon', v: 10, unit: 'cm' }, { thing: 'a pencil', v: 15, unit: 'cm' }, { thing: 'a book', v: 25, unit: 'cm' }, { thing: 'your finger', v: 5, unit: 'cm' }, { thing: 'a spoon', v: 15, unit: 'cm' }, { thing: 'an ant', v: 1, unit: 'cm' },
  { thing: 'a door', v: 2, unit: 'm' }, { thing: 'a car', v: 4, unit: 'm' }, { thing: 'a bed', v: 2, unit: 'm' }, { thing: 'a bus', v: 10, unit: 'm' }, { thing: 'a classroom', v: 8, unit: 'm' }, { thing: 'a football field', v: 100, unit: 'm' }, { thing: 'a tall tree', v: 20, unit: 'm' },
  { thing: 'a pencil', v: 7, unit: 'inches' }, { thing: 'a spoon', v: 6, unit: 'inches' }, { thing: 'a book', v: 9, unit: 'inches' }, { thing: 'a door', v: 7, unit: 'feet' }, { thing: 'a car', v: 15, unit: 'feet' }, { thing: 'a bus', v: 40, unit: 'feet' }, { thing: 'a classroom', v: 30, unit: 'feet' },
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
const singular = (u: string) => u === 'feet' ? 'foot' : u.replace(/s$/, '')
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
/** "N hours" would read as a duration in minutes to the tests; hours get plain-number choices. */
const unitSuffix = (u: string) => u === 'hours' ? '' : ` ${u}`
/** "1 minute", "2 minutes", "3" (hours). */
const withUnit = (v: number, u: string) => u === 'hours' ? fmtInt(v) : `${fmtInt(v)} ${v === 1 ? singular(u) : u}`

const natDec = (units: number, places: number): string => {
  let s = fmtDec(units, places)
  if (s.includes('.')) { s = s.replace(/0+$/, ''); if (s.endsWith('.')) s = s.slice(0, -1) }
  return s
}

/** Longer/heavier (K), units and tools (1), estimates and thermometers (2), facts (3), conversions (4), decimal conversions and bar charts (5). */
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
      if (mode === 'scale') {
        const [a, b, c] = rng.pick(HEAVY)
        const leftHeavy = rng.bool()
        const left = leftHeavy ? c : a, right = leftHeavy ? a : c
        const askHeavy = tier === 3 ? rng.bool() : true
        const ans = askHeavy ? c : a
        const { choices, answer } = shuffled(rng, ans, [askHeavy ? a : c, b], n)
        const prompt = ['Look at the scale.', `Which one is ${askHeavy ? 'heavier' : 'lighter'}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: comparing weight', prompt, visual: { kind: 'scale', left, right, heavier: leftHeavy ? 'left' : 'right' }, choices, answer, spoken: `Look at the scale. Which one is ${askHeavy ? 'heavier' : 'lighter'}? ${sayChoices(choices)}?`, metric: 6 + tier, grade, tier }, '')
      }
      const table = mode === 'heavy' ? HEAVY : mode === 'long' ? LONG : mode === 'tall' ? TALL : HOLDS
      const triple = rng.pick(table)
      const most = tier === 1 ? true : rng.bool(0.6)
      const words = mode === 'heavy' ? ['heaviest', 'lightest'] : mode === 'long' ? ['longest', 'shortest'] : mode === 'tall' ? ['tallest', 'shortest'] : ['the most', 'the least']
      const ans = most ? triple[2] : triple[0]
      const { choices, answer } = shuffled(rng, ans, triple.filter(t => t !== ans), n)
      const prompt = [mode === 'holds' ? `Which one holds ${most ? words[0] : words[1]}?` : `Which one is the ${most ? words[0] : words[1]}?`]
      return mathRiddle({ family: 'measurement', skill: `math: comparing ${mode === 'heavy' ? 'weight' : mode === 'holds' ? 'capacity' : 'length'}`, prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 4 + tier + (most ? 0 : 1), grade, tier }, '')
    }

    if (grade === 1) {
      const mode = rng.pick(tier === 1 ? ['unit', 'unit'] : tier === 2 ? ['unit', 'tool'] : ['unit', 'tool', 'weight'])
      if (mode === 'tool') {
        const t = rng.pick(TOOLS)
        const { choices, answer } = shuffled(rng, t.a, rng.shuffle(TOOL_NAMES.filter(x => x !== t.a)), n)
        const prompt = ['What would you use to measure', `${t.q}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: measuring tools', prompt, choices, answer, spoken: `What would you use to measure ${t.q}? ${sayChoices(choices)}?`, metric: 16, grade, tier }, '')
      }
      const systems = mode === 'weight' ? ['weight'] : tier === 1 ? ['us'] : ['us', 'metric']
      const sys = rng.pick(systems)
      const item = rng.pick(UNIT_ITEMS.filter(u => u.system === sys))
      const { choices, answer } = shuffled(rng, item.unit, rng.shuffle(UNITS[sys].filter(u => u !== item.unit)), n)
      const prompt = mode === 'weight' ? ['Which unit is best to weigh', `${item.thing}?`] : ['Which unit is best to measure', `${item.thing}?`]
      return mathRiddle({ family: 'measurement', skill: 'math: choosing units', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 14 + (sys === 'us' ? 0 : 2) + (mode === 'weight' ? 2 : 0), grade, tier }, '')
    }

    if (grade === 2) {
      const mode = rng.pick(tier === 1 ? ['estimate', 'thermo'] : tier === 2 ? ['estimate', 'thermo', 'thermo'] : ['estimate', 'thermo', 'weather'])
      if (mode === 'estimate') {
        const e = rng.pick(ESTIMATES)
        const txt = (v: number, u: string) => `${v} ${u}`
        const other = OTHER_UNIT[e.unit]
        const decoys = rng.shuffle([txt(e.v * 10, e.unit), txt(e.v, other), txt(Math.max(1, Math.round(e.v / 10)), e.unit), txt(e.v * 100, e.unit)].filter(t => t !== txt(e.v, e.unit)))
        const { choices, answer } = shuffled(rng, txt(e.v, e.unit), decoys, n)
        const prompt = [`About how long is ${e.thing}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: estimating length', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 24 + tier, grade, tier }, '')
      }
      const unit = tier === 3 && rng.bool(0.5) ? 'C' : 'F'
      const deg = unit === 'F' ? (tier === 1 ? rng.int(2, 10) * 10 : tier === 2 ? rng.int(4, 20) * 5 : rng.int(10, 105)) : rng.int(-5, 40)
      if (mode === 'weather') {
        const label = unit === 'F' ? (deg >= 85 ? 'hot' : deg <= 40 ? 'cold' : 'mild') : (deg >= 30 ? 'hot' : deg <= 5 ? 'cold' : 'mild')
        if (label === 'mild') return measurement.make(grade, tier, rng)
        const { choices, answer } = shuffled(rng, label, [label === 'hot' ? 'cold' : 'hot', 'just right'], n)
        const prompt = [`The thermometer shows ${deg}°${unit}.`, 'What is the weather like?']
        return mathRiddle({ family: 'measurement', skill: 'math: temperature', prompt, visual: { kind: 'thermometer', degrees: deg, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 30, grade, tier }, '')
      }
      const step = tier === 1 ? 10 : tier === 2 ? 5 : 2
      const decoys = numDecoys(rng, deg, n - 1, [deg + step, deg - step, deg + 2 * step, deg - 2 * step, deg + 1, deg - 1], step * 2, unit === 'C' ? -20 : 0).map(d => `${d}°${unit}`)
      const { choices, answer } = shuffled(rng, `${deg}°${unit}`, decoys, n)
      const prompt = ['What temperature does the', 'thermometer show?']
      return mathRiddle({ family: 'measurement', skill: 'math: reading a thermometer', prompt, visual: { kind: 'thermometer', degrees: deg, unit }, choices, answer, spoken: `What temperature does the thermometer show? ${sayChoices(choices)}?`, metric: 24 + (step === 10 ? 0 : step === 5 ? 3 : 6) + tier, grade, tier }, `num:${deg}`)
    }

    if (grade === 3) {
      const pool = FACTS.filter(f => f[3] <= tier && (tier === 1 || f[3] >= tier - 1))
      const [what, inWhat, v] = rng.pick(pool)
      const multi = tier === 3 && rng.bool(0.4) && v <= 100
      if (multi) {
        const k = rng.int(2, 6)
        const ans = v * k
        const decoys = numDecoys(rng, ans, n - 1, [v + k, v * (k + 1), v * (k - 1), ans + v / 2, ans + 10, ans - 10], Math.max(3, Math.round(ans / 10)), 1).map(String)
        const { choices, answer } = shuffled(rng, String(ans), decoys, n)
        const plural = inWhat.replace(/^an? /, '').replace(/^half /, '')
        const prompt = [`How many ${what} are in ${k} ${plural}${plural.endsWith('s') ? '' : 's'}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: measurement facts', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 40 + Math.log2(ans) * 2, grade, tier }, `num:${v}*${k}`)
      }
      const near = v >= 100 ? [v + v / 10, v - v / 10, v + 100, v - 100] : [v + 2, v - 2, v + 10, v - 10]
      const decoys = numDecoys(rng, v, n - 1, [v * 2, v / 2, v * 10, v / 10, ...near, ...[7, 12, 24, 60, 100, 365, 52, 16, 1000].filter(x => x !== v)], Math.max(2, Math.round(v / 5)), 1).map(String)
      const { choices, answer } = shuffled(rng, String(v), decoys, n)
      const prompt = [`How many ${what} are in ${inWhat}?`]
      return mathRiddle({ family: 'measurement', skill: 'math: measurement facts', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 36 + Math.log2(v) * 2, grade, tier }, `num:${v}`)
    }

    if (grade === 4) {
      const c = rng.pick(CONV.filter(x => x.level <= tier && (tier === 1 || x.level >= tier - 1)))
      const mode = rng.pick(tier === 1 ? ['up'] : tier === 2 ? ['up', 'down'] : ['up', 'down', 'mixed'])
      if (mode === 'mixed') {
        const big = rng.int(1, 5), extra = rng.int(1, c.f - 1)
        const ans = big * c.f + extra
        const decoys = numDecoys(rng, ans, n - 1, [big + extra, big * c.f, ans + c.f, ans - c.f, (big + 1) * c.f, ans + 10], Math.max(3, Math.round(c.f / 2)), 1).map(v => `${fmtInt(v)}${unitSuffix(c.small)}`)
        const { choices, answer } = shuffled(rng, `${fmtInt(ans)}${unitSuffix(c.small)}`, decoys, n)
        const prompt = [`${big} ${big === 1 ? singular(c.big) : c.big} ${extra} ${c.small} = ? ${c.small}`]
        return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${big} ${c.big} and ${extra} ${c.small} is how many ${c.small}? ${sayChoices(choices)}?`, metric: 56 + Math.log2(ans) * 2, grade, tier }, `num:${big}*${c.f}+${extra}`)
      }
      const k = rng.int(2, c.f >= 100 ? 9 : 12)
      if (mode === 'down') {
        const small = k * c.f
        const decoys = numDecoys(rng, k, n - 1, [small * c.f, k + 1, k - 1, k * 2, small - c.f, k + 10], 3, 1).map(v => withUnit(v, c.big))
        const { choices, answer } = shuffled(rng, withUnit(k, c.big), decoys, n)
        const prompt = [`${fmtInt(small)} ${c.small} = ? ${c.big}`]
        return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${fmtInt(small)} ${c.small} is how many ${c.big}? ${sayChoices(choices)}?`, metric: 54 + Math.log2(small) * 2, grade, tier }, `num:${small}/${c.f}`)
      }
      const ans = k * c.f
      const decoys = numDecoys(rng, ans, n - 1, [k + c.f, ans + c.f, ans - c.f, ans * 10, ans / 10, (k + 1) * c.f], Math.max(3, Math.round(c.f / 2)), 1).map(v => `${fmtInt(v)}${unitSuffix(c.small)}`)
      const { choices, answer } = shuffled(rng, `${fmtInt(ans)}${unitSuffix(c.small)}`, decoys, n)
      const prompt = [`${k} ${c.big} = ? ${c.small}`]
      return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${k} ${c.big} is how many ${c.small}? ${sayChoices(choices)}?`, metric: 52 + Math.log2(ans) * 2, grade, tier }, `num:${k}*${c.f}`)
    }

    // grade 5
    const mode = rng.pick(tier === 1 ? ['decimalUp', 'bars', 'barsDiff'] : tier === 2 ? ['decimalUp', 'decimalDown', 'bars', 'barsDiff', 'twoStep'] : ['decimalUp', 'decimalDown', 'twoStep', 'barsDiff', 'barsTotal'])
    if (mode.startsWith('bars')) {
      const what = rng.pick([{ q: 'rain', unit: 'mm' }, { q: 'snow', unit: 'cm' }, { q: 'books', unit: '' }, { q: 'laps', unit: '' }])
      const values = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 14, 15, 16, 18, 20], 5)
      const countable = !what.unit
      const prompt0 = countable ? `The chart shows ${what.q} for each day.` : `The chart shows ${what.q} for one week.`
      const much = countable ? 'many' : 'much'
      const u = (v: number) => what.unit ? `${v} ${what.unit}` : String(v)
      if (mode === 'bars') {
        const most = rng.bool()
        const target = most ? Math.max(...values) : Math.min(...values)
        const label = DAYS[values.indexOf(target)]
        const { choices, answer } = shuffled(rng, label, DAYS.filter(d => d !== label), n)
        const prompt = [prompt0, `Which day had the ${most ? 'most' : countable ? 'fewest' : 'least'} ${what.q}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: reading bar charts', prompt, visual: { kind: 'bars', values, labels: DAYS }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 68, grade, tier }, most ? 'barmax' : 'barmin')
      }
      if (mode === 'barsDiff') {
        const [i, j] = rng.sample([0, 1, 2, 3, 4], 2)
        const hi = values[i] > values[j] ? i : j, lo = hi === i ? j : i
        const diff = values[hi] - values[lo]
        const decoys = numDecoys(rng, diff, n - 1, [values[hi] + values[lo], values[hi], values[lo], diff + 1, diff - 1], 3, 1).map(u)
        const { choices, answer } = shuffled(rng, u(diff), decoys, n)
        const prompt = [prompt0, `How ${much} more ${what.q} on ${DAYS[hi]} than ${DAYS[lo]}?`]
        return mathRiddle({ family: 'measurement', skill: 'math: reading bar charts', prompt, visual: { kind: 'bars', values, labels: DAYS }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 70, grade, tier }, `num:${values[hi]}-${values[lo]}`)
      }
      const total = values.reduce((a, b) => a + b, 0)
      const decoys = numDecoys(rng, total, n - 1, [total - Math.min(...values), total + Math.max(...values), total + 1, total - 1, total + 5], 6, 1).map(u)
      const { choices, answer } = shuffled(rng, u(total), decoys, n)
      const prompt = [prompt0, `How ${much} ${what.q} in the whole week?`]
      return mathRiddle({ family: 'measurement', skill: 'math: reading bar charts', prompt, visual: { kind: 'bars', values, labels: DAYS }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 72, grade, tier }, `num:${values.join('+')}`)
    }
    const c = rng.pick(CONV.filter(x => x.f >= 4 && (mode !== 'twoStep' || TWO_STEP[x.big])))
    if (mode === 'twoStep') {
      const name = rng.pick(NAMES)
      const big = rng.int(1, 5), cut = rng.int(1, big * c.f - 1)
      const ans = big * c.f - cut
      const decoys = numDecoys(rng, ans, n - 1, [big * c.f + cut, big - cut, cut, ans + c.f, ans - c.f], Math.max(3, Math.round(c.f / 4)), 1).map(v => `${fmtInt(v)}${unitSuffix(c.small)}`)
      const { choices, answer } = shuffled(rng, `${fmtInt(ans)}${unitSuffix(c.small)}`, decoys, n)
      const prompt = wrap(TWO_STEP[c.big](name, `${big} ${big === 1 ? singular(c.big) : c.big}`, `${fmtInt(cut)} ${c.small}`, c.small))
      return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 76 + Math.log2(ans) * 2, grade, tier }, `num:${big}*${c.f}-${cut}`)
    }
    // decimal conversions
    const places = tier === 1 ? 1 : 2
    const p = Math.pow(10, places)
    if (mode === 'decimalDown') {
      // small -> big with a decimal result, e.g. 350 cm = 3.5 m
      const bigUnits = rng.int(1, 9) * p + rng.int(1, p - 1)
      const small = bigUnits * c.f / p
      if (!Number.isInteger(small)) return measurement.make(grade, tier, rng)
      const ans = natDec(bigUnits, places)
      const suffix = unitSuffix(c.big)
      const decoys = numDecoys(rng, bigUnits, n - 1, [bigUnits * 10, Math.round(bigUnits / 10), bigUnits + p, bigUnits - p, small], Math.max(2, p / 2), 1).map(v => `${natDec(v, places)}${suffix}`)
      const { choices, answer } = shuffled(rng, `${ans}${suffix}`, decoys, n)
      const prompt = [`${fmtInt(small)} ${c.small} = ? ${c.big}`]
      return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${fmtInt(small)} ${c.small} is how many ${c.big}? ${sayChoices(choices)}?`, metric: 72 + places * 4, grade, tier }, `num:${fmtInt(small).replace(/,/g, '')}/${c.f}`)
    }
    const bigUnits = rng.int(1, 9) * p + rng.pick([p / 2, p / 4, p / 5, 3 * p / 4].filter(Number.isInteger))
    const small = bigUnits * c.f / p
    if (!Number.isInteger(small)) return measurement.make(grade, tier, rng)
    const bigT = natDec(bigUnits, places)
    const decoys = numDecoys(rng, small, n - 1, [small * 10, small / 10, small + c.f, small - c.f, bigUnits], Math.max(3, Math.round(c.f / 4)), 1).map(v => `${fmtInt(v)}${unitSuffix(c.small)}`)
    const { choices, answer } = shuffled(rng, `${fmtInt(small)}${unitSuffix(c.small)}`, decoys, n)
    const prompt = [`${bigT} ${c.big} = ? ${c.small}`]
    return mathRiddle({ family: 'measurement', skill: 'math: unit conversions', prompt, choices, answer, spoken: `${bigT} ${c.big} is how many ${c.small}? ${sayChoices(choices)}?`, metric: 70 + places * 4, grade, tier }, `num:${bigT}*${c.f}`)
  },
}

import type { Generator } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys, fmtInt, fmtDec } from './mathutil'
import type { Rng } from '../../engine/rng'

const PLACE = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'hundred thousands', 'millions']
const DPLACE = ['', 'tenths', 'hundredths', 'thousandths']

/** Number with `digits` digits, all distinct, no leading zero. */
function distinctDigits(rng: Rng, digits: number): number {
  const ds = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], digits)
  if (ds[0] === 0) [ds[0], ds[1]] = [ds[1], ds[0]]
  return Number(ds.join(''))
}
const digitAt = (v: number, place: number): number => Math.floor(v / Math.pow(10, place)) % 10
/**
 * Decoy digits. Ask for exactly the number wanted: `numDecoys` takes its preferred values first,
 * so the digits that really are in the number are kept instead of being shuffled away by a
 * later slice, and a child cannot answer by finding the one choice the number contains.
 */
const digitDecoys = (rng: Rng, v: number, d: number, count: number): string[] => {
  const others = [...new Set([...String(v)].map(Number).filter(x => x !== d))]
  return numDecoys(rng, d, count, rng.shuffle(others), 4, 0, 9).map(String)
}
/** Permutations of the digits of v (as numbers, no leading zero, not v). */
function digitPerms(rng: Rng, v: number, count: number, place: number, d: number): number[] {
  const ds = [...String(v)]
  const out = new Set<number>()
  let tries = 0
  while (out.size < count && tries++ < 100) {
    const p = rng.shuffle(ds)
    if (p[0] === '0') continue
    const x = Number(p.join(''))
    if (x !== v && digitAt(x, place) !== d) out.add(x)
  }
  return [...out]
}
/** Expanded form "4,000 + 500 + 7". */
const expanded = (v: number): string => [...String(v)].map((c, i, a) => Number(c) * Math.pow(10, a.length - 1 - i)).filter(x => x > 0).map(fmtInt).join(' + ')

/** Tens and ones (1) up to millions (4) and decimal places (5), with rounding and expanded form. */
export const placevalue: Generator = {
  id: 'placevalue',
  name: 'Place value',
  area: 'math',
  grades: [1, 2, 3, 4, 5],
  weight: { 1: 1.2, 2: 1.2, 3: 1.2, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const skill = 'math: place value'

    if (grade === 5) {
      type M = 'digit' | 'value' | 'roundTenth' | 'roundWhole' | 'roundHundredth' | 'which' | 'expanded'
      const modes: M[] = tier === 1 ? ['digit', 'value', 'digit'] : tier === 2 ? ['digit', 'value', 'roundTenth', 'roundWhole'] : ['roundHundredth', 'roundTenth', 'which', 'expanded', 'value']
      const mode = rng.pick(modes)
      // Always three decimal places: the whole part plus three digits give four in-number decoys.
      const places = 3
      const whole = rng.int(0, 9)
      const fracDigits = rng.sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => x !== whole), places)
      if (fracDigits[places - 1] === 0) {
        // A trailing zero hides the last place, but swapping in a fixed 5 could repeat a digit the
        // number already shows (5.45 has two 5s, so "the value of the 5" has two right answers).
        // Take a digit the number does not use, keeping every digit of the number distinct.
        const used = new Set([whole, ...fracDigits])
        fracDigits[places - 1] = rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9].filter(x => !used.has(x)))
      }
      const units = whole * Math.pow(10, places) + Number(fracDigits.join(''))
      const text = (units / Math.pow(10, places)).toFixed(places)
      const metricBase = 75 + places * 4
      if (mode === 'digit') {
        const pl = rng.int(1, places)
        const d = fracDigits[pl - 1]
        const decoys = numDecoys(rng, d, n - 1, [...fracDigits.filter(x => x !== d), whole], 4, 0, 9).map(String)
        const { choices, answer } = shuffled(rng, String(d), decoys, n)
        const prompt = [`Which digit is in the ${DPLACE[pl]}`, `place of ${text}?`]
        return mathRiddle({ family: 'placevalue', skill, prompt, choices, answer, spoken: `Which digit is in the ${DPLACE[pl]} place of ${text}? ${sayChoices(choices)}?`, metric: metricBase + 2, grade, tier }, `digitof:${text},${-pl}`)
      }
      if (mode === 'value') {
        const pl = rng.pick(fracDigits.map((d, i) => d === 0 ? -1 : i + 1).filter(i => i > 0))
        const d = fracDigits[pl - 1]
        // Guard: never name a digit that the number shows twice — both copies would be right.
        if ([...text].filter(c => c === String(d)).length !== 1) return placevalue.make(grade, tier, rng)
        const val = (d / Math.pow(10, pl)).toFixed(pl)
        const decoys = [d / 10, d / 100, d / 1000, d, d * 10].map((v, i) => i === 3 || i === 4 ? String(v) : v.toFixed(i === 0 ? 1 : i === 1 ? 2 : 3)).filter(s => s !== val)
        const { choices, answer } = shuffled(rng, val, rng.shuffle(decoys), n)
        const prompt = [`What is the value of the ${d} in ${text}?`]
        return mathRiddle({ family: 'placevalue', skill, prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metricBase + 4, grade, tier }, `num:${d}/${Math.pow(10, pl)}`)
      }
      if (mode === 'which') {
        const pl = rng.int(1, places)
        const d = fracDigits[pl - 1]
        const perms = digitPerms(rng, units, n + 2, places - pl, d).map(u => (u / Math.pow(10, places)).toFixed(places))
        const { choices, answer } = shuffled(rng, text, perms, n)
        const prompt = [`Which number has a ${d} in the`, `${DPLACE[pl]} place?`]
        return mathRiddle({ family: 'placevalue', skill, prompt, choices, answer, spoken: `Which number has a ${d} in the ${DPLACE[pl]} place? ${sayChoices(choices)}?`, metric: metricBase + 5, grade, tier }, `digit:${-pl},${d}`)
      }
      if (mode === 'expanded') {
        const parts = [whole, ...fracDigits.map((d, i) => d / Math.pow(10, i + 1))].filter(x => x > 0)
        const ans = parts.map((p, i) => i === 0 && Number.isInteger(p) ? String(p) : p.toFixed(String(p).length - 2)).join(' + ')
        const wrong1 = [whole, ...fracDigits.map((d, i) => d / Math.pow(10, i + 2))].filter(x => x > 0).map((p, i) => i === 0 && Number.isInteger(p) ? String(p) : p.toFixed(String(p).length - 2)).join(' + ')
        const wrong2 = [whole, ...fracDigits].filter(x => x > 0).map(String).join(' + ')
        const wrong3 = [whole, ...fracDigits.map((d, i) => d / Math.pow(10, places - i))].filter(x => x > 0).map((p, i) => i === 0 && Number.isInteger(p) ? String(p) : p.toFixed(String(p).length - 2)).join(' + ')
        const { choices, answer } = shuffled(rng, ans, [wrong1, wrong2, wrong3], n)
        const prompt = [`Which shows ${text} in expanded form?`]
        return mathRiddle({ family: 'placevalue', skill, prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metricBase + 6, grade, tier }, `num:${text}`)
      }
      // Rounding decimals, worked in whole thousandths. Floats get exact ties wrong:
      // Math.round(1.025 * 100) / 100 is 1.02 because 1.025 * 100 lands just under 102.5, while
      // every grade-5 textbook rounds a half up to 1.03. Integers make the tie exact.
      const to = mode === 'roundTenth' ? 1 : mode === 'roundHundredth' ? 2 : 0
      const roundUnits = (u: number, step: number): number => { const q = Math.floor(u / step), rem = u - q * step; return rem * 2 >= step ? q + 1 : q }
      const step = Math.pow(10, places - to)
      const ansUnits = roundUnits(units, step)
      const ans = fmtDec(ansUnits, to)
      const downU = Math.floor(units / step)
      const cand = [
        fmtDec(downU, to), fmtDec(units % step === 0 ? downU : downU + 1, to),
        fmtDec(ansUnits + 1, to), fmtDec(ansUnits - 1, to),
        ...[0, 1, 2].filter(o => o !== to).map(o => fmtDec(roundUnits(units, Math.pow(10, places - o)), o)),
        text,
      ].filter(s => Number(s) >= 0 && Number(s) !== Number(ans))
      const { choices, answer } = shuffled(rng, ans, rng.shuffle([...new Set(cand)]), n)
      const label = to === 0 ? 'whole number' : to === 1 ? 'tenth' : 'hundredth'
      const prompt = [`Round ${text} to the nearest ${label}.`]
      return mathRiddle({ family: 'placevalue', skill: 'math: rounding decimals', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metricBase + 8 + to * 2, grade, tier }, `roundu:${units},${places},${to}`)
    }

    // Whole numbers, grades 1-4.
    const digits = grade === 1 ? 2 : grade === 2 ? 3 : grade === 3 ? 4 : (tier === 1 ? 6 : 7)
    type M = 'compose' | 'tensCount' | 'onesCount' | 'digit' | 'value' | 'which' | 'expandedTo' | 'expandedFrom' | 'round'
    const modes: M[] = grade === 1 ? (tier === 1 ? ['compose'] : tier === 2 ? ['compose', 'tensCount'] : ['compose', 'tensCount', 'onesCount', 'which'])
      : grade === 2 ? (tier === 1 ? ['compose', 'digit'] : tier === 2 ? ['compose', 'digit', 'value'] : ['digit', 'value', 'which', 'expandedTo'])
        : grade === 3 ? (tier === 1 ? ['compose', 'digit', 'expandedTo'] : tier === 2 ? ['digit', 'value', 'round'] : ['round', 'value', 'which', 'expandedFrom'])
          : (tier === 1 ? ['digit', 'value', 'round'] : tier === 2 ? ['value', 'round', 'expandedFrom', 'digit'] : ['round', 'expandedFrom', 'which', 'value'])
    const mode = rng.pick(modes)
    const v = grade === 1 ? (tier === 1 ? rng.int(11, 50) : rng.int(11, 99)) : distinctDigits(rng, digits)
    // Four-digit choices carry a thousands separator at every grade: grade-2 texts write 1,000 too.
    const fmt = (x: number) => x >= 1000 || grade >= 3 ? fmtInt(x) : String(x)
    const metricBase = 10 * digits
    const ds = [...String(v)].map(Number)

    if (mode === 'compose') {
      const partsText = ds.map((d, i) => `${d} ${d === 1 ? PLACE[ds.length - 1 - i].replace(/s$/, '') : PLACE[ds.length - 1 - i]}`).filter((_, i) => grade === 1 ? true : ds[i] > 0)
      const swapped = Number([...String(v)].reverse().join(''))
      const sum = ds.reduce((a, b) => a + b, 0)
      const decoys = numDecoys(rng, v, n - 1, [swapped, sum, ds[0] * Math.pow(10, digits - 1), v + 10, v - 10, v + 1], 3, 1).map(fmt)
      const { choices, answer } = shuffled(rng, fmt(v), decoys, n)
      const line = grade === 1 ? `${partsText[0]} and ${partsText[1]} = ?` : partsText.join(', ')
      const prompt = grade === 1 ? [line] : [line, '= ?']
      return mathRiddle({ family: 'placevalue', skill, prompt, choices, answer, spoken: `${partsText.join(', ')}. What number is that? ${sayChoices(choices)}?`, metric: metricBase, grade, tier }, `num:${ds.map((d, i) => `${d}*${Math.pow(10, ds.length - 1 - i)}`).join('+')}`)
    }
    if (mode === 'tensCount' || mode === 'onesCount') {
      const t = Math.floor(v / 10), o = v % 10
      const ans = mode === 'tensCount' ? t : o
      const decoys = numDecoys(rng, ans, n - 1, [mode === 'tensCount' ? o : t, t + o, ans + 1, ans - 1], 3, 0, 20).map(String)
      const { choices, answer } = shuffled(rng, String(ans), decoys, n)
      // "How many ones are in 84?" is literally 84; say which digit is meant instead.
      const prompt = mode === 'tensCount' ? [`How many tens are in ${v}?`] : [`${v} = ${t} tens and ? ones`]
      return mathRiddle({ family: 'placevalue', skill, prompt, choices, answer, spoken: mode === 'tensCount' ? `How many tens are in ${v}? ${sayChoices(choices)}?` : `${v} is ${t} tens and how many ones? ${sayChoices(choices)}?`, metric: metricBase + 2, grade, tier }, mode === 'tensCount' ? `num:floor(${v}/10)` : `num:${v}%10`)
    }
    if (mode === 'digit') {
      // Reading the ones digit is a grade-2 skill: grade 3 asks tens and up, grade 4 hundreds and up.
      const minPlace = Math.min(grade >= 4 ? 2 : grade === 3 ? 1 : 0, digits - 1)
      const place = rng.int(minPlace, digits - 1)
      const d = digitAt(v, place)
      const { choices, answer } = shuffled(rng, String(d), digitDecoys(rng, v, d, n - 1), n)
      const prompt = digits <= 4 ? [`Which digit is in the ${PLACE[place]}`, `place of ${fmt(v)}?`] : [`Which digit is in the`, `${PLACE[place]} place of ${fmt(v)}?`]
      return mathRiddle({ family: 'placevalue', skill, prompt, choices, answer, spoken: `Which digit is in the ${PLACE[place]} place of ${fmt(v)}? ${sayChoices(choices)}?`, metric: metricBase + 2 + place, grade, tier }, `digitof:${v},${place}`)
    }
    if (mode === 'value') {
      const place = rng.int(1, digits - 1)
      const d = digitAt(v, place)
      if (d === 0) return placevalue.make(grade, tier, rng)
      const val = d * Math.pow(10, place)
      const decoys = numDecoys(rng, val, n - 1, [d, val * 10, val / 10, d * Math.pow(10, place - 1) + digitAt(v, place - 1), val + Math.pow(10, place)], Math.pow(10, place), 1).map(fmt)
      const { choices, answer } = shuffled(rng, fmt(val), decoys, n)
      const prompt = [`What is the value of the ${d} in ${fmt(v)}?`]
      return mathRiddle({ family: 'placevalue', skill, prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metricBase + 4 + place, grade, tier }, `num:${d}*${Math.pow(10, place)}`)
    }
    if (mode === 'which') {
      const place = rng.int(0, digits - 1)
      const d = digitAt(v, place)
      const perms = digitPerms(rng, v, n + 2, place, d)
      const fill: number[] = []
      const lo = Math.pow(10, digits - 1), hi = Math.pow(10, digits) - 1
      let tries = 0
      while (fill.length < n + 2 && tries++ < 200) { const x = rng.int(lo, hi); if (x !== v && digitAt(x, place) !== d && !fill.includes(x)) fill.push(x) }
      const { choices, answer } = shuffled(rng, fmt(v), [...perms, ...fill].map(fmt), n)
      const prompt = [`Which number has a ${d} in the`, `${PLACE[place]} place?`]
      return mathRiddle({ family: 'placevalue', skill, prompt, choices, answer, spoken: `Which number has a ${d} in the ${PLACE[place]} place? ${sayChoices(choices)}?`, metric: metricBase + 3 + place, grade, tier }, `digit:${place},${d}`)
    }
    if (mode === 'expandedTo') {
      const swapped = Number([...String(v)].reverse().join(''))
      const decoys = numDecoys(rng, v, n - 1, [swapped, v + 10, v - 10, v + 100, v - 100, v + 1], 20, 1).map(fmt)
      const { choices, answer } = shuffled(rng, fmt(v), decoys, n)
      const prompt = [`${expanded(v)} = ?`]
      return mathRiddle({ family: 'placevalue', skill: 'math: expanded form', prompt, choices, answer, spoken: `${expanded(v).replace(/\+/g, 'plus')} equals what? ${sayChoices(choices)}?`, metric: metricBase + 5, grade, tier }, `num:${expanded(v).replace(/,/g, '')}`)
    }
    if (mode === 'expandedFrom') {
      // Keep the expanded form short enough for a choice: 4 digits, or 5 digits with two zeros.
      let ev = v
      if (digits > 4) {
        const dd = [...String(distinctDigits(rng, 5))].map(Number)
        for (const i of rng.sample([1, 2, 3, 4], 2)) dd[i] = 0
        ev = Number(dd.join(''))
      }
      const eds = [...String(ev)].map(Number)
      const ans = expanded(ev)
      const wrongs = new Set<string>()
      // Drop a zero from one term, add a zero to one term, or use bare digits.
      const terms = eds.map((d, i) => d * Math.pow(10, eds.length - 1 - i)).filter(x => x > 0)
      for (let i = 0; i < terms.length && wrongs.size < 6; i++) {
        if (terms[i] >= 10) wrongs.add(terms.map((t, j) => j === i ? t / 10 : t).map(fmtInt).join(' + '))
        wrongs.add(terms.map((t, j) => j === i ? t * 10 : t).map(fmtInt).join(' + '))
      }
      wrongs.add(eds.filter(d => d > 0).join(' + '))
      wrongs.add(terms.map((t, j) => j === terms.length - 1 ? t * 10 : t).map(fmtInt).join(' + '))
      wrongs.delete(ans)
      const { choices, answer } = shuffled(rng, ans, rng.shuffle([...wrongs].filter(s => s.length <= 26)), n)
      const prompt = [`Which shows ${fmt(ev)} in expanded form?`]
      return mathRiddle({ family: 'placevalue', skill: 'math: expanded form', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: metricBase + 6, grade, tier }, `num:${ev}`)
    }
    // round
    const place = grade === 3 ? (tier === 2 ? 1 : rng.pick([1, 2])) : (tier === 1 ? 3 : tier === 2 ? rng.pick([3, 4]) : rng.pick([4, 5, 6]))
    const p = Math.pow(10, place)
    // A number that is already a multiple of the place rounds to itself, and the floor/ceil decoys
    // collapse onto the answer; draw another number instead.
    if (v % p === 0) return placevalue.make(grade, tier, rng)
    const rounded = Math.round(v / p) * p
    const decoys = numDecoys(rng, rounded, n - 1, [Math.floor(v / p) * p, Math.ceil(v / p) * p, Math.round(v / (p * 10)) * p * 10, Math.round(v / (p / 10)) * (p / 10), rounded + p, rounded - p], p, 0).map(fmt)
    const { choices, answer } = shuffled(rng, fmt(rounded), decoys, n)
    const label = place === 1 ? 'ten' : place === 2 ? 'hundred' : place === 3 ? 'thousand' : place === 4 ? 'ten thousand' : place === 5 ? 'hundred thousand' : 'million'
    const prompt = [`Round ${fmt(v)} to the nearest`, `${label}.`]
    return mathRiddle({ family: 'placevalue', skill: 'math: rounding', prompt, choices, answer, spoken: `Round ${fmt(v)} to the nearest ${label}. ${sayChoices(choices)}?`, metric: metricBase + 8 + place, grade, tier }, `num:round(${v}/${p})*${p}`)
  },
}

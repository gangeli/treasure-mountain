import type { Rng } from '../../engine/rng'
import type { Riddle, Choice } from '../types'
import { riddle, nearbyNumbers } from '../types'

/**
 * Shared helpers for the math families.
 *
 * Every math riddle carries a machine-readable `check` in its key (`family|check|prompt|choices`)
 * so that `test/math.test.ts` can recompute the answer independently of the generator:
 *   num:<expr>     the answer's numeric value equals eval(expr) (+ - * / % floor round, parens)
 *   max / min      the answer's value is strictly the largest / smallest of the choices
 *   asc / desc     the answer is a comma list in ascending / descending order, decoys are not
 *   stmt           the answer is a true "a < b" / "a > b" / "a = b" statement, decoys are false
 *   between:a,b    the answer is strictly between a and b, decoys are not
 *   parity:even|odd, prime, composite, multiple:n, factor:n, gcf:a,b, lcm:a,b
 *   period:p       pattern visual: the next item is items[items.length - p]
 *   rule           first prompt line is a number sequence; the answer is the rule that fits
 *   roundu:u,p,t   u * 10^-p rounded half-up to t decimal places (exact: no float ties)
 *   angle          the answer names the angle type of the prompt's angle visual
 *   barmax / barmin  bar-chart visual: the answer label has the largest / smallest value
 *   (empty)        answer validated by construction (e.g. names of shapes)
 */
export function mathRiddle(base: Omit<Riddle, 'key' | 'spoken'> & { spoken?: string }, check: string): Riddle {
  const key = `${base.family}|${check}|${base.prompt.join('/')}|${base.choices.map(c => c.text ?? JSON.stringify(c.visual)).join(',')}`
  return riddle({ ...base, key })
}

/** Reads the text choices out loud: "3, 5, 7". */
export const sayChoices = (choices: Choice[]): string => choices.map(c => c.text ?? '').filter(Boolean).join(', ')

const digitCount = (v: number): number => String(Math.abs(Math.round(v))).length

/**
 * Distinct numeric decoys: preferred near-miss candidates first (wrong operation, off-by-one...),
 * then filled up from a spread around the answer. Never contains the answer.
 *
 * `sameSize` drops preferred candidates that are more than one order of magnitude below the answer
 * (3 offered against 300): a child rules those out on sight, so they waste a choice.
 */
export function numDecoys(rng: Rng, answer: number, count: number, preferred: number[], spread: number, min = 0, max = Number.MAX_SAFE_INTEGER, sameSize = false): number[] {
  const out: number[] = []
  const seen = new Set<number>([answer])
  const wantInt = Number.isInteger(answer)
  const minDigits = sameSize ? digitCount(answer) - 1 : 0
  for (const p of rng.shuffle(preferred)) {
    if (!Number.isFinite(p) || seen.has(p) || p < min || p > max || (wantInt && !Number.isInteger(p))) continue
    if (digitCount(p) < minDigits) continue
    seen.add(p); out.push(p)
    if (out.length >= count) break
  }
  if (out.length < count) {
    for (const v of nearbyNumbers(rng, answer, count + out.length + 2, spread, min, max)) {
      if (seen.has(v)) continue
      seen.add(v); out.push(v)
      if (out.length >= count) break
    }
  }
  return rng.shuffle(out)
}

/** Decoys in integer "units" (e.g. tenths) formatted as decimals. */
export function decDecoys(rng: Rng, answerUnits: number, places: number, count: number, preferred: number[], spread: number, min = 0): string[] {
  return numDecoys(rng, answerUnits, count, preferred, spread, min).map(u => fmtDec(u, places))
}

export const fmtDec = (units: number, places: number): string => (units / Math.pow(10, places)).toFixed(places)

/** 1234567 -> "1,234,567" */
export const fmtInt = (n: number): string => n.toLocaleString('en-US')

export const cents = (c: number): string => `${c}¢`
export const dollars = (c: number): string => `$${(c / 100).toFixed(2)}`
/** Money text: cents below a dollar (for K-3) or dollars. */
export const money = (c: number, forceDollars = false): string => (c < 100 && !forceDollars ? cents(c) : dollars(c))

export const gcd = (a: number, b: number): number => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a }
export const lcm = (a: number, b: number): number => (a * b) / gcd(a, b)

/** "3/4" in simplest form; whole numbers as "2"; improper -> mixed when `mixed`. */
export function fracStr(num: number, den: number, mixed = true): string {
  if (num === 0) return '0'
  const g = gcd(num, den)
  num /= g; den /= g
  if (den === 1) return String(num)
  if (mixed && num > den) { const w = Math.floor(num / den); return `${w} ${num - w * den}/${den}` }
  return `${num}/${den}`
}
export const fracWord = (num: number, den: number): string => {
  const nums = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
  const dens = ['', 'whole', 'half', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth']
  const d = num === 1 ? dens[den] : den === 2 ? 'halves' : dens[den] + 's'
  return `${nums[num]} ${d}`
}

/** 12-hour clock text: "3:05". */
export const clockText = (h: number, m: number): string => `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}`
/** Minutes-since-midnight -> "3:05 p.m." */
export const clock24Text = (mins: number): string => {
  mins = ((mins % 1440) + 1440) % 1440
  const h = Math.floor(mins / 60), m = mins % 60
  return `${clockText(h === 0 ? 12 : h, m)} ${h < 12 ? 'a.m.' : 'p.m.'}`
}
export const hourWord = (h: number): string => String(((h + 11) % 12) + 1)

/** Wraps text into lines of at most `width` characters, breaking at sentence ends when it can. */
export function wrap(text: string, width = 46): string[] {
  const lines: string[] = []
  let cur = ''
  const flush = () => { if (cur) lines.push(cur); cur = '' }
  // Split after sentence punctuation that is followed by a space (so 5.17 or $2.50 never break).
  const sentences = text.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean)
  for (const s of sentences) {
    if (s.length <= width) {
      if (cur.length === 0) cur = s
      else if (cur.length + 1 + s.length <= width) cur += ' ' + s
      else { flush(); cur = s }
      continue
    }
    for (const w of s.split(/\s+/).filter(Boolean)) {
      if (cur.length === 0) cur = w
      else if (cur.length + 1 + w.length <= width) cur += ' ' + w
      else { flush(); cur = w }
    }
  }
  flush()
  return lines
}

export const NAMES = ['Sam', 'Ava', 'Leo', 'Mia', 'Max', 'Zoe', 'Eli', 'Ivy', 'Ben', 'Ana', 'Kai', 'Lily', 'Omar', 'Nina', 'Jack', 'Ruby', 'Tom', 'Emma', 'Noah', 'Lucy', 'Finn', 'Maya', 'Owen', 'Rosa', 'Theo', 'Sara', 'Luis', 'Jade', 'Hugo', 'Cleo']
/** Two different names. */
export const twoNames = (rng: Rng): [string, string] => { const [a, b] = rng.sample(NAMES, 2); return [a, b] }

/** True when the spoken form of n starts with a vowel sound: eight, eleven, eighteen, eighty-... */
const vowelNumber = (n: number): boolean => n >= 100 ? vowelNumber(Math.floor(n / 100)) : n === 8 || n === 11 || n === 18 || (n >= 80 && n <= 89)
/**
 * "a" or "an" for the word (or amount) that follows: "an apple", "an eraser", "an 87¢ marble",
 * "an $18.00 kite". Amounts go by how the number is said, not by its first character.
 */
export function article(s: string): string {
  const t = s.trim()
  const m = /^\$?(\d+)/.exec(t)
  if (m) return vowelNumber(Number(m[1])) ? 'an' : 'a'
  return /^[aeiou]/i.test(t) ? 'an' : 'a'
}

export const plural = (word: string, n: number): string => {
  if (n === 1) return word
  if (word === 'fish' || word === 'sheep') return word
  if (/(s|x|ch|sh)$/.test(word)) return word + 'es'
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies'
  return word + 's'
}

/** Shared item lists for word problems and counters. */
export const COUNTER_ITEMS = ['apple', 'star', 'ball', 'fish', 'flower', 'heart', 'balloon', 'bug', 'cookie', 'acorn'] as const

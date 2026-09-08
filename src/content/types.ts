import type { Rng } from '../engine/rng'

/** 0 = Kindergarten, 1..5 = grades 1-5. */
export type Grade = 0 | 1 | 2 | 3 | 4 | 5
/** Tier 1 = mountain level 1 (easiest) ... tier 3 = mountain level 3 (hardest for the grade). */
export type Tier = 1 | 2 | 3

export const GRADES: Grade[] = [0, 1, 2, 3, 4, 5]
export const TIERS: Tier[] = [1, 2, 3]
export const gradeName = (g: Grade): string => g === 0 ? 'Kindergarten' : ['', '1st grade', '2nd grade', '3rd grade', '4th grade', '5th grade'][g]
export const gradeShort = (g: Grade): string => g === 0 ? 'K' : String(g)

export type CounterItem = 'apple' | 'star' | 'ball' | 'fish' | 'flower' | 'coin' | 'block' | 'heart' | 'balloon' | 'bug' | 'cookie' | 'acorn'
export type ShapeName = 'circle' | 'square' | 'triangle' | 'rectangle' | 'pentagon' | 'hexagon' | 'oval' | 'star' | 'rhombus' | 'trapezoid' | 'octagon' | 'heart' | 'cube' | 'sphere' | 'cone' | 'cylinder' | 'pyramid'
export type CoinName = 'penny' | 'nickel' | 'dime' | 'quarter'

/**
 * Pictures a riddle can ask the renderer to draw. Pure data so that content tests run headless.
 * The renderer decides sizes; generators only say what to show.
 */
export type Visual =
  /** `groups` = equal groups (a number) or explicit group sizes (an array, e.g. [3, 2] for 3 + 2). */
  | { kind: 'counters'; item: CounterItem; count: number; groups?: number | number[]; crossed?: number }
  | { kind: 'clock'; hour: number; minute: number }
  | { kind: 'coins'; coins: CoinName[] }
  | { kind: 'fraction'; shape: 'circle' | 'bar'; parts: number; shaded: number }
  | { kind: 'shape'; name: ShapeName; color?: string }
  | { kind: 'pattern'; items: { shape: ShapeName; color: string }[]; blank?: boolean }
  | { kind: 'tenframe'; count: number }
  | { kind: 'grid'; w: number; h: number; unit?: string }
  | { kind: 'array'; rows: number; cols: number; item: CounterItem }
  | { kind: 'numberline'; from: number; to: number; mark?: number; step?: number }
  | { kind: 'angle'; degrees: number }
  | { kind: 'letter'; text: string; lower?: boolean }
  | { kind: 'text'; text: string }
  | { kind: 'thermometer'; degrees: number; unit: 'F' | 'C' }
  | { kind: 'scale'; left: string; right: string; heavier: 'left' | 'right' | 'none' }
  | { kind: 'bars'; values: number[]; labels: string[] }

export interface Choice {
  /** Text shown (and read aloud). Optional when a visual is given. */
  text?: string
  visual?: Visual
}

export interface Riddle {
  /** Generator family id, e.g. 'rhymes'. */
  family: string
  /** Skill tag shown in the parent report, e.g. 'phonics: rhyming'. */
  skill: string
  /** Lines of the prompt as displayed on the scroll (max ~5 lines of ~40 chars). */
  prompt: string[]
  /** Segments to paint red inside the prompt (exact substrings), e.g. the rhyme ending. */
  highlight?: string[]
  /** True when the prompt is in verse (the elf speaks in rhyme). */
  verse?: boolean
  /** Picture above/next to the prompt. */
  visual?: Visual
  choices: Choice[]
  /** Index into choices. */
  answer: number
  /** Plain-language version for read-aloud. */
  spoken: string
  /** A generator-specific difficulty number; larger is harder. Used by ramp tests. */
  metric: number
  grade: Grade
  tier: Tier
  /** Key used to avoid repeats within a session. */
  key: string
}

export interface Generator {
  id: string
  /** Family name for reports. */
  name: string
  /** 'reading' | 'math' | 'thinking' */
  area: 'reading' | 'math' | 'thinking'
  /** Which grades this family is available for (K = 0). */
  grades: Grade[]
  /** Relative weight per grade (defaults to 1). */
  weight?: Partial<Record<Grade, number>>
  /** Produce one riddle. Must be deterministic given rng. */
  make: (grade: Grade, tier: Tier, rng: Rng) => Riddle
}

/** How many answer choices a grade sees. */
export const choiceCount = (grade: Grade): number => grade <= 2 ? 3 : 4

// ---------------------------------------------------------------------------------- helpers

export function riddle(base: Omit<Riddle, 'key' | 'spoken'> & { spoken?: string; key?: string }): Riddle {
  const spoken = base.spoken ?? base.prompt.join(' ')
  // Choices are sorted for the key: the same question with its buttons shuffled is one riddle, so
  // the session dedupe cannot serve it twice in a row.
  const key = base.key ?? `${base.family}|${base.prompt.join('/')}|${base.choices.map(c => c.text ?? JSON.stringify(c.visual)).sort().join(',')}`
  return { ...base, spoken, key }
}

/** Builds a choice list from an answer and decoys, shuffled, returning the answer index. */
export function shuffled<T extends string | Choice>(rng: Rng, answer: T, decoys: T[], n: number): { choices: Choice[]; answer: number } {
  const toChoice = (x: T): Choice => typeof x === 'string' ? { text: x } : x
  const seen = new Set<string>()
  const keyOf = (c: Choice) => (c.text ?? JSON.stringify(c.visual)).toLowerCase()
  const ans = toChoice(answer)
  seen.add(keyOf(ans))
  const picked: Choice[] = []
  for (const d of decoys) {
    const c = toChoice(d)
    const k = keyOf(c)
    if (seen.has(k)) continue
    seen.add(k)
    picked.push(c)
    if (picked.length >= n - 1) break
  }
  if (picked.length < n - 1) throw new Error(`not enough decoys for ${ans.text ?? 'visual'}: need ${n - 1}, have ${picked.length}`)
  const all = rng.shuffle([ans, ...picked])
  return { choices: all, answer: all.indexOf(ans) }
}

export const numberWords = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty']
const tensWords = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety']
export function numberWord(n: number): string {
  if (n <= 20) return numberWords[n]
  if (n < 100) return tensWords[Math.floor(n / 10)] + (n % 10 ? '-' + numberWords[n % 10] : '')
  if (n === 100) return 'one hundred'
  if (n < 1000) return numberWords[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + numberWord(n % 100) : '')
  return String(n)
}

/** Distinct random integers near a target (for numeric decoys), excluding the answer. */
export function nearbyNumbers(rng: Rng, answer: number, count: number, spread: number, min = 0, max = Number.MAX_SAFE_INTEGER): number[] {
  const out = new Set<number>()
  let tries = 0
  while (out.size < count && tries++ < 200) {
    const d = rng.int(1, Math.max(1, spread)) * (rng.bool() ? 1 : -1)
    const v = answer + d
    if (v !== answer && v >= min && v <= max) out.add(v)
  }
  // Fallback: walk outwards deterministically.
  let step = 1
  while (out.size < count) {
    for (const v of [answer + step, answer - step]) if (v !== answer && v >= min && v <= max && out.size < count) out.add(v)
    step++
    if (step > 100000) break
  }
  return rng.shuffle([...out])
}

export const ordinal = (n: number): string => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]) }
export const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
// The article follows the sound, not the letter: a university, a one-way street, an hour.
const TAKES_A = /^(uni|use|usu|ufo|euro|eu|one|once)/i
const TAKES_AN = /^(hour|honest|honor|heir)/i
export const an = (w: string): string => (TAKES_A.test(w) ? 'a ' : TAKES_AN.test(w) || /^[aeiou]/i.test(w) ? 'an ' : 'a ') + w

import type { Rng } from '../../engine/rng'
import type { Grade, Tier, Riddle } from '../types'
import { riddle, shuffled, choiceCount } from '../types'

/**
 * A fact-style question used by the thinking/science families.
 * `level` is the grade it is written for (0 = K ... 5). `d` are plausible decoys (>= 3).
 * `hard` marks a question that only appears at tier 2-3 of its level.
 */
export interface Fact {
  level: Grade
  q: string
  a: string
  d: string[]
  /**
   * Difficulty band inside the level: 1 = easiest third, 2 = middle, 3 = hardest. When a fact table
   * bands its entries, tier 1/2/3 of a grade draw disjoint bands (see `bandedSource`), so a tier is
   * never a reshuffle of the tier below it and next year's hard content cannot leak down a grade.
   * Tables without bands keep the older `hard`-flag behaviour.
   */
  band?: 1 | 2 | 3
  hard?: boolean
  skill?: string
  /** Optional verse lines used instead of wrapping `q` (K-2 elves like to rhyme). */
  verse?: string[]
}

/** Greedy word wrap into lines of at most `width` characters. `\n` forces a break. */
export function wrap(text: string, width = 46): string[] {
  const lines: string[] = []
  for (const para of text.split('\n')) {
    let cur = ''
    for (const w of para.split(/\s+/).filter(Boolean)) {
      if (!cur) cur = w
      else if (cur.length + 1 + w.length <= width) cur += ' ' + w
      else { lines.push(cur); cur = w }
    }
    if (cur) lines.push(cur)
  }
  return lines
}

/**
 * Which data level to draw from. Tier 1 leans a little on the previous grade's level, tier 2 is
 * the grade itself and tier 3 mixes in the next grade's level, so the metric ramps within a grade
 * and across grades.
 */
export function pickLevel(grade: Grade, tier: Tier, rng: Rng): Grade {
  if (tier === 1) return grade > 0 && rng.bool(0.25) ? (grade - 1) as Grade : grade
  if (tier === 2) return grade
  return grade < 5 && rng.bool(0.3) ? (grade + 1) as Grade : grade
}

/**
 * Where a banded table draws from for one (grade, tier). Tier 1 is this grade's easy band plus a
 * little review of last grade's easy band; tier 2 is this grade's middle band plus last grade's
 * hard band; tier 3 is this grade's hard band plus a taste of next grade's easy band. The three
 * tiers of a grade never share an item, no item ever appears more than one grade early, and two
 * bands of the same level never meet in one tier (so a question can never hand another one away).
 */
export function bandedSource(grade: Grade, tier: Tier, rng: Rng): { level: Grade; bands: (1 | 2 | 3)[] } {
  if (tier === 1) {
    return grade > 0 && rng.bool(0.25) ? { level: (grade - 1) as Grade, bands: [1] } : { level: grade, bands: [1] }
  }
  if (tier === 2) {
    return grade > 0 && rng.bool(0.25) ? { level: (grade - 1) as Grade, bands: [3] } : { level: grade, bands: [2] }
  }
  return grade < 5 && rng.bool(0.3) ? { level: (grade + 1) as Grade, bands: [1] } : { level: grade, bands: [3] }
}

/** Difficulty number for a banded fact: the level dominates, the band separates the tiers. */
export const bandMetric = (f: Fact): number => f.level * 10 + ((f.band ?? 1) - 1) * 3 + Math.min(3, f.q.length / 25)

const LEADS = ['Think hard, my friend!', 'Here is a question for you.', 'A puzzle for a clever climber!', 'Riddle me this:', 'Let me see what you know.']

/** Builds a riddle from a Fact table for the given grade/tier. */
export function factRiddle(family: string, skill: string, facts: readonly Fact[], grade: Grade, tier: Tier, rng: Rng, forcedLevel?: Grade): Riddle {
  const banded = forcedLevel === undefined && facts.some(f => f.band !== undefined)
  let f: Fact
  let metric: number
  if (banded) {
    const src = bandedSource(grade, tier, rng)
    let pool = facts.filter(x => x.level === src.level && src.bands.includes(x.band ?? 1))
    if (pool.length === 0) pool = facts.filter(x => x.level === grade)
    if (pool.length === 0) throw new Error(`${family}: no facts for level ${src.level} bands ${src.bands.join('/')}`)
    f = rng.pick(pool)
    metric = bandMetric(f)
  } else {
    const level = forcedLevel ?? pickLevel(grade, tier, rng)
    let pool = facts.filter(x => x.level === level && (tier >= 2 || !x.hard))
    if (pool.length === 0) pool = facts.filter(x => x.level === level)
    if (pool.length === 0) pool = facts.filter(x => x.level === grade)
    if (pool.length === 0) throw new Error(`${family}: no facts for level ${level}`)
    const hard = pool.filter(x => x.hard)
    f = tier === 3 && hard.length && rng.bool(0.5) ? rng.pick(hard) : rng.pick(pool)
    metric = f.level * 10 + (f.hard ? 5 : 0) + Math.min(5, f.q.length / 25)
  }
  const n = choiceCount(grade)
  const { choices, answer } = shuffled(rng, f.a, rng.shuffle(f.d), n)
  const body = f.verse ?? wrap(f.q)
  const prompt = !f.verse && body.length <= 3 && rng.bool(0.35) ? [rng.pick(LEADS), ...body] : body
  return riddle({
    family, skill: f.skill ?? skill, prompt, verse: !!f.verse, choices, answer,
    spoken: `${f.verse ? f.verse.join(' ') : f.q} ${choices.map(c => c.text).join(', ')}?`,
    metric, grade, tier,
    key: `${family}|${f.q}`,
  })
}

/** Convenience for "spoken": the prompt sentence followed by the choices. */

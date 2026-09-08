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

const LEADS = ['Think hard, my friend!', 'Here is a question for you.', 'A puzzle for a clever climber!', 'Riddle me this:', 'Let me see what you know.']

/** Builds a riddle from a Fact table for the given grade/tier. */
export function factRiddle(family: string, skill: string, facts: readonly Fact[], grade: Grade, tier: Tier, rng: Rng): Riddle {
  const level = pickLevel(grade, tier, rng)
  let pool = facts.filter(f => f.level === level && (tier >= 2 || !f.hard))
  if (pool.length === 0) pool = facts.filter(f => f.level === level)
  if (pool.length === 0) pool = facts.filter(f => f.level === grade)
  if (pool.length === 0) throw new Error(`${family}: no facts for level ${level}`)
  const hard = pool.filter(f => f.hard)
  const f = tier === 3 && hard.length && rng.bool(0.5) ? rng.pick(hard) : rng.pick(pool)
  const n = choiceCount(grade)
  const { choices, answer } = shuffled(rng, f.a, rng.shuffle(f.d), n)
  const body = f.verse ?? wrap(f.q)
  const prompt = !f.verse && body.length <= 3 && rng.bool(0.35) ? [rng.pick(LEADS), ...body] : body
  return riddle({
    family, skill: f.skill ?? skill, prompt, verse: !!f.verse, choices, answer,
    spoken: `${f.verse ? f.verse.join(' ') : f.q} ${choices.map(c => c.text).join(', ')}?`,
    metric: f.level * 10 + (f.hard ? 5 : 0) + Math.min(5, f.q.length / 25), grade, tier,
    key: `${family}|${f.q}`,
  })
}

/** Convenience for "spoken": the prompt sentence followed by the choices. */
export const readChoices = (lead: string, choices: { text?: string }[]): string => `${lead} ${choices.map(c => c.text ?? '').filter(Boolean).join(', ')}?`

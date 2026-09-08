import type { Rng } from '../engine/rng'
import type { Generator, Grade, Riddle, Tier } from './types'
import { GENERATORS } from './generators'

export function generatorsFor(grade: Grade): Generator[] {
  return GENERATORS.filter(g => g.grades.includes(grade))
}

/** One entry of the recent history: the area and family of a riddle already asked. */
export const recentEntry = (r: Riddle): string => `${r.area ?? 'reading'} ${r.family}`

/**
 * Picks a riddle for the grade and tier, avoiding keys in `seen` and balancing the three areas
 * (reading / math / thinking) so a hunt never turns into all-math or all-phonics. `recent` holds
 * the entries recentEntry() made for the riddles already asked this climb, most recent last.
 */
export function pickRiddle(grade: Grade, tier: Tier, rng: Rng, seen: Set<string>, recent: string[] = []): Riddle {
  const gens = generatorsFor(grade)
  if (gens.length === 0) throw new Error('no generators for grade ' + grade)
  // The last four riddles push their own area down, and their own family down harder: two rhyme
  // riddles running is duller than two reading riddles running.
  const areaCount: Record<string, number> = {}
  const famCount: Record<string, number> = {}
  for (const e of recent.slice(-4)) {
    const sp = e.indexOf(' ')
    const area = sp < 0 ? e : e.slice(0, sp)
    const fam = sp < 0 ? '' : e.slice(sp + 1)
    areaCount[area] = (areaCount[area] || 0) + 1
    if (fam) famCount[fam] = (famCount[fam] || 0) + 1
  }
  const weights = gens.map(g => {
    const base = g.weight?.[grade] ?? 1
    return base / (1 + 1.5 * (areaCount[g.area] || 0)) / (1 + 3 * (famCount[g.id] || 0))
  })
  for (let attempt = 0; attempt < 40; attempt++) {
    const gen = rng.weighted(gens, weights)
    const r = safeMake(gen, grade, tier, rng)
    if (r && !seen.has(r.key)) return r
  }
  // Give up on novelty: return anything valid.
  for (let attempt = 0; attempt < 40; attempt++) {
    const gen = rng.pick(gens)
    const r = safeMake(gen, grade, tier, rng)
    if (r) return r
  }
  throw new Error('could not generate a riddle')
}

function safeMake(gen: Generator, grade: Grade, tier: Tier, rng: Rng): Riddle | null {
  try {
    const r = gen.make(grade, tier, rng)
    r.area = gen.area
    return r
  } catch { return null }
}

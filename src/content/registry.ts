import type { Rng } from '../engine/rng'
import type { Generator, Grade, Riddle, Tier } from './types'
import { GENERATORS } from './generators'

export function generatorsFor(grade: Grade): Generator[] {
  return GENERATORS.filter(g => g.grades.includes(grade))
}

/**
 * Picks a riddle for the grade and tier, avoiding keys in `seen` and balancing the three areas
 * (reading / math / thinking) so a hunt never turns into all-math or all-phonics.
 */
export function pickRiddle(grade: Grade, tier: Tier, rng: Rng, seen: Set<string>, recentAreas: string[] = []): Riddle {
  const gens = generatorsFor(grade)
  if (gens.length === 0) throw new Error('no generators for grade ' + grade)
  const areaCount: Record<string, number> = { reading: 0, math: 0, thinking: 0 }
  for (const a of recentAreas.slice(-4)) areaCount[a] = (areaCount[a] || 0) + 1
  const weights = gens.map(g => {
    const base = g.weight?.[grade] ?? 1
    const penalty = 1 / (1 + 1.5 * (areaCount[g.area] || 0))
    return base * penalty
  })
  for (let attempt = 0; attempt < 40; attempt++) {
    const gen = rng.weighted(gens, weights)
    const r = safeMake(gen, grade, tier, rng)
    if (r && !seen.has(r.key)) return r
  }
  // Give up on novelty: return anything valid.
  for (let attempt = 0; attempt < 40; attempt++) {
    const r = safeMake(rng.pick(gens), grade, tier, rng)
    if (r) return r
  }
  throw new Error('could not generate a riddle')
}

function safeMake(gen: Generator, grade: Grade, tier: Tier, rng: Rng): Riddle | null {
  try { return gen.make(grade, tier, rng) } catch { return null }
}

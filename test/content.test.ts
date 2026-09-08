import { describe, it, expect } from 'vitest'
import { Rng } from '../src/engine/rng'
import { GENERATORS } from '../src/content/generators'
import { GRADES } from '../src/content/types'
import { pickRiddle, generatorsFor } from '../src/content/registry'
import { standardChecks } from './helpers'

describe('all registered generators', () => {
  standardChecks(GENERATORS, it, expect)
})

describe('registry', () => {
  it('every grade has enough families across all three areas', () => {
    const full = GENERATORS.length >= 14
    for (const grade of GRADES) {
      const gens = generatorsFor(grade)
      const areas = new Set(gens.map(g => g.area))
      expect(gens.length, `grade ${grade} has ${gens.length} families`).toBeGreaterThanOrEqual(full ? 14 : 3)
      if (full) expect([...areas].sort()).toEqual(['math', 'reading', 'thinking'])
    }
  })
  it('pickRiddle avoids repeats and balances areas', () => {
    for (const grade of GRADES) {
      const rng = new Rng('pick-' + grade)
      const seen = new Set<string>()
      const areas: string[] = []
      for (let i = 0; i < 60; i++) {
        const r = pickRiddle(grade, ((i % 3) + 1) as any, rng, seen, areas)
        expect(seen.has(r.key)).toBe(false)
        seen.add(r.key)
        areas.push(GENERATORS.find(g => g.id === r.family)!.area)
      }
      const counts: Record<string, number> = {}
      for (const a of areas) counts[a] = (counts[a] || 0) + 1
      for (const a of Object.keys(counts)) expect(counts[a]).toBeGreaterThan(8)
    }
  })
})

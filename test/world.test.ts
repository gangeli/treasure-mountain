import { describe, it, expect } from 'vitest'
import { generateLevel, treasuresForStars, starsForTotal, KINDS } from '../src/game/world'
import { GRADES } from '../src/content/types'
import { loopDist } from '../src/game/layout'

const matches = (g: any, t: any) => (g.count === t.count ? 1 : 0) + (g.descriptor === t.descriptor ? 1 : 0) + (g.kind === t.kind ? 1 : 0)

describe('level generation', () => {
  for (const grade of GRADES) for (const no of [1, 2, 3] as const) for (const stars of [0, 2, 4, 7]) {
    it(`grade ${grade} level ${no} stars ${stars}: clue constraints hold for 40 seeds`, () => {
      for (let seed = 1; seed <= 40; seed++) {
        const T = treasuresForStars(stars)
        const lv = generateLevel(no, seed, grade, T, stars)
        const threes = lv.groups.filter(g => matches(g, lv.target) === 3)
        const twos = lv.groups.filter(g => matches(g, lv.target) === 2)
        expect(threes.length, `seed ${seed} key groups`).toBe(1)
        expect(threes[0].hides).toBe('key')
        expect(twos.length, `seed ${seed} treasure groups`).toBe(T)
        for (const g of twos) expect(g.hides).toBe('treasure')
        for (const g of lv.groups) if (matches(g, lv.target) <= 1) expect(g.hides).toBeNull()
        expect(lv.treasures).toBe(T)
        expect(lv.groups.length).toBeGreaterThanOrEqual(11)
        // Every descriptor is drawable for its kind, and counts are in range for the grade.
        for (const g of lv.groups) {
          const kd = KINDS.find(k => k.kind === g.kind)!
          expect(kd.levels).toContain(no)
          expect(kd.descriptors).toContain(g.descriptor)
          expect(g.count).toBeLessThanOrEqual(grade <= 1 ? 3 : 4)
        }
        // Groups don't overlap each other or features.
        const things = [...lv.groups.map(g => ({ x: g.x, w: g.width })), ...lv.features.map(f => ({ x: f.x, w: f.width }))]
        for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) {
          expect(loopDist(things[i].x, things[j].x), `overlap seed ${seed}`).toBeGreaterThan((things[i].w + things[j].w) / 2 - 1)
        }
        // No two groups of one kind carry colours that red-green colour blindness hides, or the
        // clue words would be unusable for about one boy in twelve.
        const CONF = new Set(['red|green', 'green|red', 'orange|green', 'green|orange', 'green|yellow', 'yellow|green', 'red|orange', 'orange|red', 'blue|purple', 'purple|blue'])
        for (let i = 0; i < lv.groups.length; i++) for (let j = i + 1; j < lv.groups.length; j++) {
          const a = lv.groups[i], b = lv.groups[j]
          if (a.kind === b.kind) expect(CONF.has(`${a.descriptor}|${b.descriptor}`), `${a.kind}: ${a.descriptor} vs ${b.descriptor}`).toBe(false)
        }
        // Words
        expect(lv.clueWords.number).toBeTruthy()
        expect(lv.clueWords.object).toBeTruthy()
      }
    })
  }
  it('is deterministic for a seed', () => {
    const a = generateLevel(2, 7, 3, 3, 1), b = generateLevel(2, 7, 3, 3, 1)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
  it('stars and thresholds', () => {
    expect(starsForTotal(0)).toBe(0); expect(starsForTotal(5)).toBe(1); expect(starsForTotal(24)).toBe(1); expect(starsForTotal(300)).toBe(7)
    // The original announces the count at every rank-up: 2,2,3,3,4,4 for Trainee..5 stars.
    expect([0, 1, 2, 3, 4, 5, 6, 7].map(treasuresForStars)).toEqual([2, 2, 3, 3, 4, 4, 5, 5])
  })
})

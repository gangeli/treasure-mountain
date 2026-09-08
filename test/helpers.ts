import { Rng } from '../src/engine/rng'
import { TIERS, choiceCount, type Generator, type Riddle } from '../src/content/types'

export function validateRiddle(r: Riddle, grade: number, gen: string): string[] {
  const errs: string[] = []
  if (r.choices.length !== choiceCount(grade as any)) errs.push(`choice count ${r.choices.length}`)
  if (r.answer < 0 || r.answer >= r.choices.length) errs.push('answer index out of range')
  const keys = r.choices.map(c => (c.text ?? JSON.stringify(c.visual)).trim().toLowerCase())
  if (new Set(keys).size !== keys.length) errs.push('duplicate choices: ' + keys.join('|'))
  for (const c of r.choices) if (!c.text && !c.visual) errs.push('empty choice')
  for (const c of r.choices) if (c.text !== undefined && c.text.trim() === '') errs.push('blank choice text')
  if (r.prompt.length === 0 || r.prompt.length > 6) errs.push(`prompt lines ${r.prompt.length}`)
  for (const line of r.prompt) if (line.length > 46) errs.push(`line too long (${line.length}): ${line}`)
  for (const c of r.choices) if (c.text && c.text.length > 26) errs.push(`choice too long: ${c.text}`)
  if (!r.spoken || r.spoken.length < 5) errs.push('spoken missing')
  // What the voice actually says. A slash is read out as "slash" (3/4 -> "three slash four",
  // km/h -> "K M slash H") and a blank line is read as "underscore underscore underscore".
  if (r.spoken?.includes('/')) errs.push(`spoken has a slash: ${r.spoken}`)
  if (r.spoken?.includes('_')) errs.push(`spoken has a blank: ${r.spoken}`)
  // Symbols a speech synthesiser drops on the floor, taking the meaning with them: "3¢" comes out
  // "three", "30°" comes out "thirty", and 736 = 737 / 736 < 737 / 736 > 737 all come out the same.
  const mute = r.spoken?.match(/[¢°$×÷=<>≤≥]|\s[-−]\s/)
  if (mute) errs.push(`spoken has a symbol the voice drops (${mute[0].trim()}): ${r.spoken}`)
  // Unit abbreviations are spelled out, not read: "6 sq cm" comes out "six S Q C M".
  const abbrev = r.spoken?.match(/\b\d+\s(sq\s)?(mm|cm|km|ft|yd|mi|lb|oz|kg|mL|L)\b/)
  if (abbrev) errs.push(`spoken has an unread unit (${abbrev[0]}): ${r.spoken}`)
  if (!r.key) errs.push('key missing')
  if (typeof r.metric !== 'number' || Number.isNaN(r.metric)) errs.push('metric missing')
  if (r.family !== gen) errs.push(`family ${r.family} != ${gen}`)
  if (!r.skill) errs.push('skill missing')
  if (r.grade !== grade) errs.push('grade mismatch')
  // A highlight the prompt does not contain paints nothing: the red cue for the rhyme ending, the
  // contraction or the word being asked about silently disappears. (It did once, for every family
  // at once, when richText stopped matching multi-word and quoted highlights.)
  if (r.highlight) {
    const hay = r.prompt.join(' ').toLowerCase()
    for (const h of r.highlight) {
      if (!h.trim()) errs.push('empty highlight')
      else if (!hay.includes(h.toLowerCase())) errs.push(`highlight "${h}" is not in the prompt`)
    }
  }
  return errs
}

/** Runs the standard validity + variety + ramp checks over a list of generators (vitest `it` callbacks). */
export function standardChecks(gens: Generator[], it: (name: string, fn: () => void) => void, expect: any, seeds = 150): void {
  for (const gen of gens) {
    for (const grade of gen.grades) {
      for (const tier of TIERS) {
        it(`${gen.id} grade ${grade} tier ${tier}: valid and varied`, () => {
          const rng = new Rng(`${gen.id}-${grade}-${tier}`)
          const keys = new Set<string>()
          const errs: string[] = []
          for (let i = 0; i < seeds; i++) {
            const r = gen.make(grade, tier, rng)
            keys.add(r.key)
            const e = validateRiddle(r, grade, gen.id)
            if (e.length) errs.push(`seed ${i}: ${e.join('; ')} :: ${r.prompt.join(' / ')} [${r.choices.map(c => c.text ?? 'pic').join(', ')}]`)
          }
          expect(errs.slice(0, 5)).toEqual([])
          expect(keys.size, `${gen.id} g${grade} t${tier} only ${keys.size} distinct riddles`).toBeGreaterThanOrEqual(12)
        })
      }
    }
    const avgMetric = (grade: number, tier: number) => {
      const rng = new Rng(`ramp-${gen.id}-${grade}-${tier}`)
      let s = 0
      for (let i = 0; i < 200; i++) s += gen.make(grade as any, tier as any, rng).metric
      return s / 200
    }
    it(`${gen.id}: tier 3 is not easier than tier 1 within each grade`, () => {
      for (const grade of gen.grades) {
        const t1 = avgMetric(grade, 1), t3 = avgMetric(grade, 3)
        expect(t3, `grade ${grade}: t1=${t1.toFixed(1)} t3=${t3.toFixed(1)}`).toBeGreaterThanOrEqual(t1 * 0.97 - 0.5)
      }
    })
    it(`${gen.id}: tier 2 is a step up from tier 1`, () => {
      // The defect this catches: two tiers drawing the same pool, so mountain levels 1 and 2 ask
      // the same difficulty and only the scenery changes.
      for (const grade of gen.grades) {
        const t1 = avgMetric(grade, 1), t2 = avgMetric(grade, 2)
        expect(t2, `grade ${grade}: t1=${t1.toFixed(1)} t2=${t2.toFixed(1)}`).toBeGreaterThan(t1 * 1.02)
      }
    })
    it(`${gen.id}: each grade's tier 1 is not easier than the previous grade's tier 1`, () => {
      const gs = gen.grades
      for (let i = 1; i < gs.length; i++) {
        const prev = avgMetric(gs[i - 1], 1), cur = avgMetric(gs[i], 1)
        expect(cur, `grade ${gs[i]} t1=${cur.toFixed(1)} < grade ${gs[i - 1]} t1=${prev.toFixed(1)}`).toBeGreaterThanOrEqual(prev * 0.97 - 0.5)
      }
    })
  }
}

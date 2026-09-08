import type { Generator, Choice, ShapeName } from '../types'
import { shuffled, choiceCount, an } from '../types'
import { mathRiddle, sayChoices, numDecoys } from './mathutil'
import type { Rng } from '../../engine/rng'

const SIDES: Partial<Record<ShapeName, number>> = { triangle: 3, square: 4, rectangle: 4, rhombus: 4, trapezoid: 4, pentagon: 5, hexagon: 6, octagon: 8, circle: 0, oval: 0, star: 10, heart: 0 }
const CORNERS: Partial<Record<ShapeName, number>> = { triangle: 3, square: 4, rectangle: 4, rhombus: 4, trapezoid: 4, pentagon: 5, hexagon: 6, octagon: 8, circle: 0, oval: 0 }
const FLAT: ShapeName[] = ['circle', 'square', 'triangle', 'rectangle', 'pentagon', 'hexagon', 'oval', 'star', 'rhombus', 'trapezoid', 'octagon', 'heart']
const SOLIDS: ShapeName[] = ['cube', 'sphere', 'cone', 'cylinder', 'pyramid']
const FACES: Record<string, number> = { cube: 6, pyramid: 5, cylinder: 3, cone: 2, sphere: 0 }
const QUADS: ShapeName[] = ['square', 'rectangle', 'rhombus', 'trapezoid']
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple']
const vis = (name: ShapeName, color: string): Choice => ({ visual: { kind: 'shape', name, color } })
const angleType = (d: number) => d < 90 ? 'acute' : d === 90 ? 'right' : d < 180 ? 'obtuse' : 'straight'
const ANGLE_TYPES = ['acute', 'right', 'obtuse', 'straight']
/**
 * Real-world look-alikes. None may contain the solid's own name (a child who can read would score
 * without knowing any geometry), which `looksFor` enforces; "a dice" is gone because it is plural.
 */
const LOOKS: Record<string, string[]> = {
  cube: ['a sugar lump', 'a moving box', 'a block', 'a box with square faces'],
  sphere: ['a ball', 'a globe', 'a marble', 'an orange'],
  cone: ['a party hat', 'a funnel', 'a witch hat'],
  cylinder: ['a can of soup', 'a drum', 'a log', 'a paper towel roll'],
  pyramid: ['a tent with a square floor', 'a tent with 4 slanted sides'],
}
const looksFor = (solid: string): string[] => LOOKS[solid].filter(p => !p.toLowerCase().includes(solid))
/**
 * A square IS a rectangle, so a square picture is a defensible answer to "Which shape is a
 * rectangle?". The reverse is not true, so only this direction is filtered.
 */
const badPictureDecoy = (target: ShapeName, decoy: ShapeName): boolean => target === 'rectangle' && decoy === 'square'

function nameOrPick(rng: Rng, pool: ShapeName[], n: number, grade: number, tier: number, color: string, skill: string) {
  const base = grade === 0 ? 4 : grade === 1 ? 12 : 22
  const name = rng.pick(pool)
  const metric = base + pool.indexOf(name) + tier * 2
  if (rng.bool()) {
    // Visual prompt, text choices: naming a rectangle "square" is simply wrong, so no filter needed.
    const { choices, answer } = shuffled(rng, name, rng.shuffle(pool.filter(s => s !== name)), n)
    const prompt = [rng.pick(['What is this shape called?', 'What shape is this?', 'Which word names this shape?'])]
    return mathRiddle({ family: 'shapes', skill, prompt, visual: { kind: 'shape', name, color }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric, grade: grade as any, tier: tier as any }, '')
  }
  const pics = rng.shuffle(pool.filter(s => s !== name && !badPictureDecoy(name, s))).map(s => vis(s, rng.pick(COLORS)))
  const { choices, answer } = shuffled(rng, vis(name, color), pics, n)
  const prompt = [`Which shape is ${an(name)}?`]
  return mathRiddle({ family: 'shapes', skill, prompt, choices, answer, spoken: `${prompt[0]} Look at the shapes and pick one.`, metric, grade: grade as any, tier: tier as any }, '')
}

/** Naming (K), sides and corners (1), solids (2), quadrilaterals and perimeter (3), angles and area (4), volume, coordinates and angle sums (5). */
export const shapes: Generator = {
  id: 'shapes',
  name: 'Shapes and geometry',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 1.2, 2: 1, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const color = rng.pick(COLORS)

    if (grade === 0) {
      // Tier 3 adds hexagon (K.G.A.2) and keeps one decorative shape rather than four.
      const pool: ShapeName[] = tier === 1 ? ['circle', 'square', 'triangle'] : tier === 2 ? ['circle', 'square', 'triangle', 'rectangle'] : ['circle', 'square', 'triangle', 'rectangle', 'oval', 'hexagon', 'star']
      if (tier === 3 && rng.bool(0.3)) {
        const name = rng.pick(['triangle', 'square', 'rectangle'] as ShapeName[])
        const s = SIDES[name]!
        const decoys = numDecoys(rng, s, n - 1, [s + 1, s - 1, s + 2], 2, 0, 8).map(String)
        const { choices, answer } = shuffled(rng, String(s), decoys, n)
        const prompt = [`How many sides does ${an(name)} have?`]
        return mathRiddle({ family: 'shapes', skill: 'math: shapes', prompt, visual: { kind: 'shape', name, color }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 12, grade, tier }, `num:${s}`)
      }
      return nameOrPick(rng, pool, n, grade, tier, color, 'math: shapes')
    }

    if (grade === 1) {
      // Tier 3 never draws a triangle/square/rectangle question: those are the tier-1 items.
      const pool: ShapeName[] = tier === 1 ? ['triangle', 'square', 'rectangle', 'circle'] : tier === 2 ? ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon'] : ['pentagon', 'hexagon', 'octagon', 'rhombus', 'trapezoid', 'circle', 'oval']
      const mode = rng.pick(tier === 1 ? ['sides', 'corners', 'which'] : tier === 2 ? ['sides', 'corners', 'which', 'name'] : ['sides', 'corners', 'which', 'name', 'noCorners'])
      if (mode === 'name') return nameOrPick(rng, pool, n, grade, tier, color, 'math: shapes')
      if (mode === 'noCorners') {
        const round: ShapeName[] = ['circle', 'oval']
        const name = rng.pick(round)
        const decoys = rng.shuffle(pool.filter(s => (CORNERS[s] ?? 1) > 0)).map(s => vis(s, rng.pick(COLORS)))
        const { choices, answer } = shuffled(rng, vis(name, color), decoys, n)
        const prompt = ['Which shape has no corners?']
        return mathRiddle({ family: 'shapes', skill: 'math: sides and corners', prompt, choices, answer, spoken: `${prompt[0]} Look at the shapes and pick one.`, metric: 18, grade, tier }, '')
      }
      const name = rng.pick(pool.filter(s => (SIDES[s] ?? 0) > 0))
      const s = SIDES[name]!
      if (mode === 'which') {
        const decoys = rng.shuffle(pool.filter(x => SIDES[x] !== s)).map(x => vis(x, rng.pick(COLORS)))
        const { choices, answer } = shuffled(rng, vis(name, color), decoys, n)
        const what = rng.bool() ? 'sides' : 'corners'
        const prompt = [`Which shape has ${s} ${what}?`]
        return mathRiddle({ family: 'shapes', skill: 'math: sides and corners', prompt, choices, answer, spoken: `${prompt[0]} Look at the shapes and pick one.`, metric: 12 + s, grade, tier }, '')
      }
      const decoys = numDecoys(rng, s, n - 1, [s + 1, s - 1, s + 2, s - 2], 2, 0, 10).map(String)
      const { choices, answer } = shuffled(rng, String(s), decoys, n)
      const prompt = [`How many ${mode} does ${an(name)} have?`]
      return mathRiddle({ family: 'shapes', skill: 'math: sides and corners', prompt, visual: { kind: 'shape', name, color }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 12 + s, grade, tier }, `num:${s}`)
    }

    if (grade === 2) {
      const mode = rng.pick(tier === 1 ? ['name3d', 'which3d', 'is3d'] : tier === 2 ? ['name3d', 'which3d', 'is3d', 'looks'] : ['name3d', 'which3d', 'looks', 'faces', 'flat'])
      const solid = rng.pick(SOLIDS)
      if (mode === 'name3d' || mode === 'which3d') return nameOrPick(rng, SOLIDS, n, grade, tier, color, 'math: solid shapes')
      if (mode === 'is3d' || mode === 'flat') {
        const solidTarget = mode === 'is3d'
        const ans = solidTarget ? solid : rng.pick(FLAT.slice(0, 6))
        const decoys = (solidTarget ? rng.shuffle(FLAT.slice(0, 6)) : rng.shuffle(SOLIDS)).map(s => vis(s, rng.pick(COLORS)))
        const { choices, answer } = shuffled(rng, vis(ans, color), decoys, n)
        const prompt = [solidTarget ? 'Which of these is a solid (3D) shape?' : 'Which of these is a flat (2D) shape?']
        return mathRiddle({ family: 'shapes', skill: 'math: solid shapes', prompt, choices, answer, spoken: `${prompt[0]} Look at the shapes and pick one.`, metric: 22 + tier * 2, grade, tier }, '')
      }
      if (mode === 'looks') {
        const { choices, answer } = shuffled(rng, solid, rng.shuffle(SOLIDS.filter(s => s !== solid)), n)
        const prompt = ['Which solid is shaped like', `${rng.pick(looksFor(solid))}?`]
        return mathRiddle({ family: 'shapes', skill: 'math: solid shapes', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 26 + tier * 2, grade, tier }, '')
      }
      // Faces: "pyramid" alone does not fix the count (a tetrahedron has 4), so the prompt names the
      // base and 4 is never offered as a decoy.
      const s = rng.pick(['cube', 'pyramid'] as const)
      const f = FACES[s]
      const decoys = numDecoys(rng, f, n + 1, [f + 1, f + 2, f - 2, f + 3], 3, 1, 12).filter(v => !(s === 'pyramid' && v === 4)).map(String)
      const { choices, answer } = shuffled(rng, String(f), decoys, n)
      const prompt = s === 'cube' ? ['How many flat faces does a cube have?'] : ['How many flat faces does this', 'square pyramid have?']
      return mathRiddle({ family: 'shapes', skill: 'math: solid shapes', prompt, visual: { kind: 'shape', name: s, color }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 28 + tier * 2, grade, tier }, `num:${f}`)
    }

    if (grade === 3) {
      const mode = rng.pick(tier === 1 ? ['quad', 'notQuad', 'perimeter', 'describe'] : tier === 2 ? ['describe', 'perimeter', 'perimeterSquare', 'notQuad'] : ['describe', 'perimeter', 'perimeterSquare', 'missingSide'])
      if (mode === 'quad') {
        const name = rng.pick(QUADS)
        const decoys = rng.shuffle(['triangle', 'pentagon', 'hexagon', 'octagon', 'circle'] as ShapeName[]).map(s => vis(s, rng.pick(COLORS)))
        const { choices, answer } = shuffled(rng, vis(name, color), decoys, n)
        const prompt = ['Which shape is a quadrilateral?', '(It has 4 sides.)']
        return mathRiddle({ family: 'shapes', skill: 'math: quadrilaterals', prompt, choices, answer, spoken: `Which shape is a quadrilateral, a shape with 4 sides? Look at the shapes and pick one.`, metric: 36 + tier * 2, grade, tier }, '')
      }
      if (mode === 'notQuad') {
        const name = rng.pick(['triangle', 'pentagon', 'hexagon', 'octagon'] as ShapeName[])
        const decoys = rng.shuffle(QUADS).map(s => vis(s, rng.pick(COLORS)))
        const { choices, answer } = shuffled(rng, vis(name, color), decoys, n)
        const prompt = ['Which shape is NOT a quadrilateral?']
        return mathRiddle({ family: 'shapes', skill: 'math: quadrilaterals', prompt, choices, answer, spoken: `Which shape is not a quadrilateral? Look at the shapes and pick one.`, metric: 37 + tier * 2, grade, tier }, '')
      }
      if (mode === 'describe') {
        const facts: [string[], ShapeName][] = [
          [['4 equal sides and 4 square corners.'], 'square'],
          // Not "opposite sides the same length": a square has that too, and a square IS a
          // rectangle, so that clue had two right answers with the square sitting in the choices.
          // Two long and two short sides rules the square out. ("its" was wrong after "I am" too.)
          [['4 square corners, 2 long sides', 'and 2 short sides.'], 'rectangle'],
          [['4 equal sides but no square corners.'], 'rhombus'],
          [['exactly one pair of parallel sides.'], 'trapezoid'],
          [['3 sides and 3 corners.'], 'triangle'],
          [['6 sides.'], 'hexagon'],
          [['5 sides.'], 'pentagon'],
          [['8 sides.'], 'octagon'],
        ]
        const [desc, name] = rng.pick(facts)
        const { choices, answer } = shuffled(rng, name, rng.shuffle([...QUADS, 'triangle', 'pentagon', 'hexagon', 'octagon'].filter(s => s !== name) as ShapeName[]), n)
        const prompt = ['I am a shape with', ...desc, 'What am I?']
        return mathRiddle({ family: 'shapes', skill: 'math: quadrilaterals', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 39 + tier * 2, grade, tier }, '')
      }
      const unit = rng.pick(['cm', 'm', 'in', 'ft'])
      if (mode === 'perimeterSquare') {
        const s = rng.int(2, 12)
        const p = 4 * s
        const decoys = numDecoys(rng, p, n - 1, [s * s, 2 * s, 3 * s, p + s, p - s], 4, 1).map(v => `${v} ${unit}`)
        const { choices, answer } = shuffled(rng, `${p} ${unit}`, decoys, n)
        const prompt = [`Each side of a square is ${s} ${unit}.`, 'What is its perimeter?']
        return mathRiddle({ family: 'shapes', skill: 'math: perimeter', prompt, visual: { kind: 'grid', w: s, h: s, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 40 + tier * 2 + p / 4, grade, tier }, `num:4*${s}`)
      }
      const w = rng.int(tier === 1 ? 2 : 3, tier === 1 ? 6 : 12), h = rng.int(1, tier === 1 ? 5 : 9)
      if (w === h) return shapes.make(grade, tier, rng)
      const p = 2 * (w + h)
      if (mode === 'missingSide') {
        const decoys = numDecoys(rng, h, n - 1, [p - w, (p - w) / 2, h + 1, h - 1, p / 2], 3, 1).map(v => `${v} ${unit}`)
        const { choices, answer } = shuffled(rng, `${h} ${unit}`, decoys, n)
        const prompt = [`A rectangle has a perimeter of ${p} ${unit}.`, `One side is ${w} ${unit}. How long is`, 'the side next to it?']
        return mathRiddle({ family: 'shapes', skill: 'math: perimeter', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 44 + tier * 2 + p / 4, grade, tier }, `num:(${p}-2*${w})/2`)
      }
      // "long" must name the longer side, and the picture is drawn the same way round.
      const lng = Math.max(w, h), wid = Math.min(w, h)
      const decoys = numDecoys(rng, p, n - 1, [w * h, w + h, 2 * w + h, w + 2 * h, p + 2, p - 2], 4, 1).map(v => `${v} ${unit}`)
      const { choices, answer } = shuffled(rng, `${p} ${unit}`, decoys, n)
      const prompt = [`A rectangle is ${lng} ${unit} long and ${wid} ${unit} wide.`, 'What is its perimeter?']
      return mathRiddle({ family: 'shapes', skill: 'math: perimeter', prompt, visual: { kind: 'grid', w: lng, h: wid, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 40 + tier * 2 + p / 4, grade, tier }, `num:2*(${lng}+${wid})`)
    }

    if (grade === 4) {
      // The angle strand ramps: name the drawn angle (t1), pick an angle by measure (t2),
      // reason about a straight line (t3). Tier 3 no longer re-serves the tier-1 picture item.
      const mode = rng.pick(tier === 1 ? ['angle', 'area', 'angle'] : tier === 2 ? ['angle', 'angleDeg', 'area', 'areaSquare'] : ['area', 'areaSquare', 'sideFromArea', 'areaOrPerimeter', 'straightLine'])
      const unit = rng.pick(['cm', 'm', 'in', 'ft'])
      if (mode === 'angle') {
        // Never near 180: at that size a drawn 170° cannot be told from a straight line.
        const deg = rng.pick(tier === 1 ? [30, 45, 60, 90, 120, 135, 150] : [20, 40, 70, 80, 85, 90, 95, 100, 110, 160])
        const t = angleType(deg)
        const { choices, answer } = shuffled(rng, t, rng.shuffle(ANGLE_TYPES.filter(x => x !== t)), n)
        const prompt = ['What kind of angle is this?']
        return mathRiddle({ family: 'shapes', skill: 'math: angles', prompt, visual: { kind: 'angle', degrees: deg }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 48 + tier * 4 + (deg > 80 && deg < 100 && deg !== 90 ? 2 : 0), grade, tier }, 'angle')
      }
      if (mode === 'angleDeg') {
        const t = rng.pick(ANGLE_TYPES)
        const inRange = (d: number) => angleType(d) === t
        const pool = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]
        const ans = rng.pick(pool.filter(inRange))
        const decoys = rng.shuffle(pool.filter(d => !inRange(d))).map(d => `${d}°`)
        const { choices, answer } = shuffled(rng, `${ans}°`, decoys, n)
        const prompt = [`Which angle is ${t === 'acute' || t === 'obtuse' ? an(t) : `a ${t}`} angle?`]
        return mathRiddle({ family: 'shapes', skill: 'math: angles', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 50 + tier * 4, grade, tier }, `angletype:${t}`)
      }
      if (mode === 'straightLine') {
        const a = rng.pick([20, 25, 30, 40, 45, 50, 55, 60, 65, 70, 75, 80, 100, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160])
        const ans = 180 - a
        const decoys = numDecoys(rng, ans, n - 1, [a, 90 - a, ans + 10, ans - 10, 360 - a, ans + 5], 12, 1, 179).map(v => `${v}°`)
        const { choices, answer } = shuffled(rng, `${ans}°`, decoys, n)
        const prompt = ['Two angles make a straight line.', `One is ${a}°. How big is the other?`]
        return mathRiddle({ family: 'shapes', skill: 'math: angles', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 50 + tier * 4, grade, tier }, `num:180-${a}`)
      }
      const w = rng.int(tier === 1 ? 2 : 4, tier === 1 ? 9 : 15), h = rng.int(2, tier === 1 ? 6 : 12)
      if (mode === 'areaSquare') {
        const a = w * w
        const decoys = numDecoys(rng, a, n - 1, [4 * w, 2 * w, a + w, a - w, w * (w + 1)], 5, 1).map(v => `${v} sq ${unit}`)
        const { choices, answer } = shuffled(rng, `${a} sq ${unit}`, decoys, n)
        const prompt = [`Each side of a square is ${w} ${unit}.`, 'What is its area?']
        return mathRiddle({ family: 'shapes', skill: 'math: area', prompt, visual: { kind: 'grid', w, h: w, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 53 + tier * 2 + w, grade, tier }, `num:${w}*${w}`)
      }
      if (mode === 'sideFromArea') {
        const a = w * h
        const decoys = numDecoys(rng, h, n - 1, [a - w, h + 1, h - 1, a / 2, w], 3, 1).map(v => `${v} ${unit}`)
        const { choices, answer } = shuffled(rng, `${h} ${unit}`, decoys, n)
        const prompt = [`A rectangle has an area of ${a} sq ${unit}.`, `It is ${w} ${unit} long. How wide is it?`]
        return mathRiddle({ family: 'shapes', skill: 'math: area', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 54 + tier * 2 + a / 10, grade, tier }, `num:${a}/${w}`)
      }
      if (mode === 'areaOrPerimeter') {
        const askArea = rng.bool()
        const a = w * h, p = 2 * (w + h)
        const ans = askArea ? a : p
        const decoys = numDecoys(rng, ans, n - 1, [askArea ? p : a, w + h, ans + 2, ans - 2, ans + w], 5, 1).map(v => askArea ? `${v} sq ${unit}` : `${v} ${unit}`)
        const { choices, answer } = shuffled(rng, askArea ? `${a} sq ${unit}` : `${p} ${unit}`, decoys, n)
        const prompt = [`A rectangle is ${w} ${unit} by ${h} ${unit}.`, `What is its ${askArea ? 'area' : 'perimeter'}?`]
        return mathRiddle({ family: 'shapes', skill: askArea ? 'math: area' : 'math: perimeter', prompt, visual: { kind: 'grid', w, h, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 54 + tier * 2 + a / 10, grade, tier }, askArea ? `num:${w}*${h}` : `num:2*(${w}+${h})`)
      }
      const a = w * h
      const lng = Math.max(w, h), wid = Math.min(w, h)
      const decoys = numDecoys(rng, a, n - 1, [2 * (w + h), w + h, a + w, a - w, a + h, w * (h + 1)], 5, 1).map(v => `${v} sq ${unit}`)
      const { choices, answer } = shuffled(rng, `${a} sq ${unit}`, decoys, n)
      const prompt = [`A rectangle is ${lng} ${unit} long and ${wid} ${unit} wide.`, 'What is its area?']
      return mathRiddle({ family: 'shapes', skill: 'math: area', prompt, visual: { kind: 'grid', w: lng, h: wid, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 52 + tier * 2 + a / 10, grade, tier }, `num:${lng}*${wid}`)
    }

    // grade 5
    const mode = rng.pick(tier === 1 ? ['volume', 'triangle', 'dist'] : tier === 2 ? ['volume', 'triangle', 'dist', 'move'] : ['volume', 'triangle', 'move', 'cubeVolume'])
    const unit = rng.pick(['cm', 'm', 'in', 'ft'])
    if (mode === 'volume' || mode === 'cubeVolume') {
      const l = rng.int(2, tier === 1 ? 5 : 9), w = mode === 'cubeVolume' ? l : rng.int(2, tier === 1 ? 5 : 8), h = mode === 'cubeVolume' ? l : rng.int(2, tier === 1 ? 4 : 7)
      const v = l * w * h
      const decoys = numDecoys(rng, v, n - 1, [l + w + h, l * w, 2 * (l * w + w * h + l * h), v + l, v - l, v + l * w], 8, 1).map(x => `${x} cubic ${unit}`)
      const { choices, answer } = shuffled(rng, `${v} cubic ${unit}`, decoys, n)
      const prompt = mode === 'cubeVolume' ? [`Each edge of a cube is ${l} ${unit}.`, 'What is its volume?'] : [`A box is ${l} ${unit} long, ${w} ${unit} wide`, `and ${h} ${unit} tall. What is its volume?`]
      return mathRiddle({ family: 'shapes', skill: 'math: volume', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: (mode === 'cubeVolume' ? 66 : 64) + tier * 3 + v / 20, grade, tier }, `num:${l}*${w}*${h}`)
    }
    if (mode === 'triangle') {
      // Tiers 1-2 use friendly multiples of 5; tier 3 uses any angles. The given pair is always
      // printed smallest first so {25, 35} and {35, 25} are one riddle, not two.
      let a: number, b: number
      if (tier === 3) { a = rng.int(11, 150); b = rng.int(11, 168 - a) } else { a = rng.int(2, tier === 1 ? 10 : 15) * 5; b = rng.int(2, Math.min(15, (170 - a) / 5)) * 5 }
      if (a > b) [a, b] = [b, a]
      const c = 180 - a - b
      if (c < 10) return shapes.make(grade, tier, rng)
      // Nothing above 179° can be an angle of a triangle, so those decoys are ruled out on sight.
      const decoys = numDecoys(rng, c, n - 1, [a + b, 180 - a, 180 - b, c + 10, c - 10, 90 - a > 0 ? 90 - a : c + 5], 10, 1, 179).map(x => `${x}°`)
      const { choices, answer } = shuffled(rng, `${c}°`, decoys, n)
      const prompt = [`Two angles of a triangle are ${a}° and ${b}°.`, 'What is the third angle?']
      return mathRiddle({ family: 'shapes', skill: 'math: angles in a triangle', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 64 + tier * 4, grade, tier }, `num:180-${a}-${b}`)
    }
    if (mode === 'dist') {
      // Real coordinate work: the prompt never prints the answer, unlike a "which point is at" lookup.
      const vertical = rng.bool()
      const fixed = rng.int(0, 8)
      const near = rng.int(0, 6), far = rng.int(near + 2, 8)
      const [p, q] = rng.bool() ? [near, far] : [far, near]
      const d = far - near
      const at = (v: number) => vertical ? `(${fixed}, ${v})` : `(${v}, ${fixed})`
      const decoys = numDecoys(rng, d, n - 1, [p + q, d + 1, d - 1, Math.max(p, q), Math.min(p, q)], 3, 1, 16).map(String)
      const { choices, answer } = shuffled(rng, String(d), decoys, n)
      const prompt = [`Point A is at ${at(p)}.`, `Point B is at ${at(q)}.`, 'How many units apart are they?']
      return mathRiddle({ family: 'shapes', skill: 'math: coordinates', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 62 + tier * 3, grade, tier }, `num:${Math.max(p, q)}-${Math.min(p, q)}`)
    }
    // move on the grid (first quadrant only: negative coordinates are a grade-6 standard)
    const x = rng.int(0, 6), y = rng.int(0, 6), dx = rng.int(1, 5), dy = rng.int(1, 5)
    const right = rng.bool(0.7) || x - dx < 0, up = rng.bool(0.7) || y - dy < 0
    const nx = right ? x + dx : x - dx, ny = up ? y + dy : y - dy
    const pt = (a: number, b: number) => `(${a}, ${b})`
    const raw: [number, number][] = [[ny, nx], [right ? x - dx : x + dx, ny], [nx, up ? y - dy : y + dy], [x, ny], [nx, y], [nx + 1, ny], [nx, ny + 1]]
    const decoyPts = raw.filter(([a, b]) => a >= 0 && b >= 0 && !(a === nx && b === ny)).map(([a, b]) => pt(a, b))
    const { choices, answer } = shuffled(rng, pt(nx, ny), rng.shuffle([...new Set(decoyPts)]), n)
    const prompt = [`Start at ${pt(x, y)}. Move ${dx} ${right ? 'right' : 'left'}`, `and ${dy} ${up ? 'up' : 'down'}. Where are you now?`]
    return mathRiddle({ family: 'shapes', skill: 'math: coordinates', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 64 + tier * 3, grade, tier }, `pt:${nx},${ny}`)
  },
}

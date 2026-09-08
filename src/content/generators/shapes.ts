import type { Generator, Choice, ShapeName } from '../types'
import { shuffled, choiceCount, an, cap } from '../types'
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
const LOOKS: Record<string, string[]> = {
  cube: ['a dice', 'a box with square faces', 'a block'], sphere: ['a ball', 'a globe', 'a marble'], cone: ['an ice cream cone', 'a party hat', 'a traffic cone'],
  cylinder: ['a can of soup', 'a drum', 'a log'], pyramid: ['the pyramids of Egypt', 'a tent with a square floor'],
}

function nameOrPick(rng: Rng, pool: ShapeName[], n: number, grade: number, tier: number, color: string, skill: string) {
  const name = rng.pick(pool)
  if (rng.bool()) {
    // Visual prompt, text choices.
    const { choices, answer } = shuffled(rng, name, rng.shuffle(pool.filter(s => s !== name)), n)
    const prompt = [rng.pick(['What is this shape called?', 'What shape is this?', 'Which word names this shape?'])]
    return mathRiddle({ family: 'shapes', skill, prompt, visual: { kind: 'shape', name, color }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 4 + pool.indexOf(name) + tier, grade: grade as any, tier: tier as any }, '')
  }
  const { choices, answer } = shuffled(rng, vis(name, color), rng.shuffle(pool.filter(s => s !== name)).map(s => vis(s, rng.pick(COLORS))), n)
  const prompt = [`Which shape is ${an(name)}?`]
  return mathRiddle({ family: 'shapes', skill, prompt, choices, answer, spoken: `${prompt[0]} Look at the shapes and pick one.`, metric: 4 + pool.indexOf(name) + tier, grade: grade as any, tier: tier as any }, '')
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
      const pool: ShapeName[] = tier === 1 ? ['circle', 'square', 'triangle'] : tier === 2 ? ['circle', 'square', 'triangle', 'rectangle'] : ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval']
      if (tier === 3 && rng.bool(0.3)) {
        const name = rng.pick(['triangle', 'square', 'rectangle'] as ShapeName[])
        const s = SIDES[name]!
        const decoys = numDecoys(rng, s, n - 1, [s + 1, s - 1, s + 2], 2, 0, 8).map(String)
        const { choices, answer } = shuffled(rng, String(s), decoys, n)
        const prompt = [`How many sides does ${an(name)} have?`]
        return mathRiddle({ family: 'shapes', skill: 'math: shapes', prompt, visual: { kind: 'shape', name, color }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 10, grade, tier }, `num:${s}`)
      }
      return nameOrPick(rng, pool, n, grade, tier, color, 'math: shapes')
    }

    if (grade === 1) {
      const pool: ShapeName[] = tier === 1 ? ['triangle', 'square', 'rectangle', 'circle'] : tier === 2 ? ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon'] : ['triangle', 'pentagon', 'hexagon', 'octagon', 'rhombus', 'trapezoid', 'circle', 'oval']
      const mode = rng.pick(tier === 1 ? ['sides', 'corners', 'which'] : tier === 2 ? ['sides', 'corners', 'which', 'name'] : ['sides', 'corners', 'which', 'name', 'noCorners'])
      if (mode === 'name') return nameOrPick(rng, pool, n, grade, tier, color, 'math: shapes')
      if (mode === 'noCorners') {
        const round: ShapeName[] = ['circle', 'oval']
        const name = rng.pick(round)
        const decoys = rng.shuffle(pool.filter(s => (CORNERS[s] ?? 1) > 0)).map(s => vis(s, rng.pick(COLORS)))
        const { choices, answer } = shuffled(rng, vis(name, color), decoys, n)
        const prompt = ['Which shape has no corners?']
        return mathRiddle({ family: 'shapes', skill: 'math: sides and corners', prompt, choices, answer, spoken: `${prompt[0]} Look at the shapes and pick one.`, metric: 16, grade, tier }, '')
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
        return mathRiddle({ family: 'shapes', skill: 'math: solid shapes', prompt, choices, answer, spoken: `${prompt[0]} Look at the shapes and pick one.`, metric: 24, grade, tier }, '')
      }
      if (mode === 'looks') {
        const { choices, answer } = shuffled(rng, solid, rng.shuffle(SOLIDS.filter(s => s !== solid)), n)
        const prompt = [`Which solid is shaped like ${rng.pick(LOOKS[solid])}?`]
        return mathRiddle({ family: 'shapes', skill: 'math: solid shapes', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 26, grade, tier }, '')
      }
      const s = rng.pick(['cube', 'pyramid'] as const)
      const f = FACES[s]
      const decoys = numDecoys(rng, f, n - 1, [f + 1, f - 1, f + 2, 4], 2, 1, 12).map(String)
      const { choices, answer } = shuffled(rng, String(f), decoys, n)
      const prompt = [`How many flat faces does ${an(s)} have?`]
      return mathRiddle({ family: 'shapes', skill: 'math: solid shapes', prompt, visual: { kind: 'shape', name: s, color }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 28, grade, tier }, `num:${f}`)
    }

    if (grade === 3) {
      const mode = rng.pick(tier === 1 ? ['quad', 'notQuad', 'perimeter'] : tier === 2 ? ['describe', 'perimeter', 'notQuad', 'perimeter'] : ['describe', 'perimeter', 'perimeterSquare', 'missingSide'])
      if (mode === 'quad') {
        const name = rng.pick(QUADS)
        const decoys = rng.shuffle(['triangle', 'pentagon', 'hexagon', 'octagon', 'circle'] as ShapeName[]).map(s => vis(s, rng.pick(COLORS)))
        const { choices, answer } = shuffled(rng, vis(name, color), decoys, n)
        const prompt = ['Which shape is a quadrilateral?', '(It has 4 sides.)']
        return mathRiddle({ family: 'shapes', skill: 'math: quadrilaterals', prompt, choices, answer, spoken: `Which shape is a quadrilateral, a shape with 4 sides? Look at the shapes and pick one.`, metric: 40, grade, tier }, '')
      }
      if (mode === 'notQuad') {
        const name = rng.pick(['triangle', 'pentagon', 'hexagon', 'octagon'] as ShapeName[])
        const decoys = rng.shuffle(QUADS).map(s => vis(s, rng.pick(COLORS)))
        const { choices, answer } = shuffled(rng, vis(name, color), decoys, n)
        const prompt = ['Which shape is NOT a quadrilateral?']
        return mathRiddle({ family: 'shapes', skill: 'math: quadrilaterals', prompt, choices, answer, spoken: `Which shape is not a quadrilateral? Look at the shapes and pick one.`, metric: 41, grade, tier }, '')
      }
      if (mode === 'describe') {
        const facts: [string[], ShapeName][] = [
          [['4 equal sides and 4 square corners.'], 'square'],
          [['4 square corners, and its opposite', 'sides are the same length.'], 'rectangle'],
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
        return mathRiddle({ family: 'shapes', skill: 'math: quadrilaterals', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 43, grade, tier }, '')
      }
      const unit = rng.pick(['cm', 'm', 'in', 'ft'])
      if (mode === 'perimeterSquare') {
        const s = rng.int(2, 12)
        const p = 4 * s
        const decoys = numDecoys(rng, p, n - 1, [s * s, 2 * s, 3 * s, p + s, p - s], 4, 1).map(v => `${v} ${unit}`)
        const { choices, answer } = shuffled(rng, `${p} ${unit}`, decoys, n)
        const prompt = [`Each side of a square is ${s} ${unit}.`, 'What is its perimeter?']
        return mathRiddle({ family: 'shapes', skill: 'math: perimeter', prompt, visual: { kind: 'grid', w: s, h: s, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 46 + s, grade, tier }, `num:4*${s}`)
      }
      const w = rng.int(tier === 1 ? 2 : 3, tier === 1 ? 6 : 12), h = rng.int(1, tier === 1 ? 5 : 9)
      if (w === h) return shapes.make(grade, tier, rng)
      if (mode === 'missingSide') {
        const p = 2 * (w + h)
        const decoys = numDecoys(rng, h, n - 1, [p - w, (p - w) / 2, h + 1, h - 1, p / 2], 3, 1).map(v => `${v} ${unit}`)
        const { choices, answer } = shuffled(rng, `${h} ${unit}`, decoys, n)
        const prompt = [`A rectangle has a perimeter of ${p} ${unit}.`, `One side is ${w} ${unit}. How long is`, 'the side next to it?']
        return mathRiddle({ family: 'shapes', skill: 'math: perimeter', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 50 + p / 4, grade, tier }, `num:(${p}-2*${w})/2`)
      }
      const p = 2 * (w + h)
      const decoys = numDecoys(rng, p, n - 1, [w * h, w + h, 2 * w + h, w + 2 * h, p + 2, p - 2], 4, 1).map(v => `${v} ${unit}`)
      const { choices, answer } = shuffled(rng, `${p} ${unit}`, decoys, n)
      const prompt = [`A rectangle is ${w} ${unit} long and ${h} ${unit} wide.`, 'What is its perimeter?']
      return mathRiddle({ family: 'shapes', skill: 'math: perimeter', prompt, visual: { kind: 'grid', w, h, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 44 + p / 4, grade, tier }, `num:2*(${w}+${h})`)
    }

    if (grade === 4) {
      const mode = rng.pick(tier === 1 ? ['angle', 'area', 'angle'] : tier === 2 ? ['angle', 'area', 'areaSquare', 'angleDeg'] : ['angle', 'area', 'sideFromArea', 'angleDeg', 'areaOrPerimeter'])
      const unit = rng.pick(['cm', 'm', 'in', 'ft'])
      if (mode === 'angle') {
        const deg = rng.pick(tier === 1 ? [30, 45, 60, 90, 120, 135, 150] : tier === 2 ? [20, 40, 70, 90, 100, 110, 160] : [10, 80, 85, 90, 95, 100, 170, 180])
        const t = angleType(deg)
        const types = tier === 3 ? ['acute', 'right', 'obtuse', 'straight'] : ['acute', 'right', 'obtuse']
        const decoys = rng.shuffle(types.filter(x => x !== t))
        if (decoys.length < n - 1) decoys.push('straight', 'reflex')
        const { choices, answer } = shuffled(rng, t, decoys.filter(x => x !== t), n)
        const prompt = ['What kind of angle is this?']
        return mathRiddle({ family: 'shapes', skill: 'math: angles', prompt, visual: { kind: 'angle', degrees: deg }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 55 + (deg > 80 && deg < 100 && deg !== 90 ? 6 : 0), grade, tier }, 'angle')
      }
      if (mode === 'angleDeg') {
        const t = rng.pick(['acute', 'right', 'obtuse', 'straight'])
        const inRange = (d: number) => angleType(d) === t
        const pool = [15, 30, 45, 60, 75, 90, 105, 120, 135, 150, 165, 180]
        const ans = rng.pick(pool.filter(inRange))
        const decoys = rng.shuffle(pool.filter(d => !inRange(d))).map(d => `${d}°`)
        const { choices, answer } = shuffled(rng, `${ans}°`, decoys, n)
        const prompt = [`Which angle is ${t === 'acute' || t === 'obtuse' ? an(t) : `a ${t}`} angle?`]
        return mathRiddle({ family: 'shapes', skill: 'math: angles', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 58, grade, tier }, `angletype:${t}`)
      }
      const w = rng.int(tier === 1 ? 2 : 4, tier === 1 ? 9 : 15), h = rng.int(2, tier === 1 ? 6 : 12)
      if (mode === 'areaSquare') {
        const a = w * w
        const decoys = numDecoys(rng, a, n - 1, [4 * w, 2 * w, a + w, a - w, w * (w + 1)], 5, 1).map(v => `${v} sq ${unit}`)
        const { choices, answer } = shuffled(rng, `${a} sq ${unit}`, decoys, n)
        const prompt = [`Each side of a square is ${w} ${unit}.`, 'What is its area?']
        return mathRiddle({ family: 'shapes', skill: 'math: area', prompt, visual: { kind: 'grid', w, h: w, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 57 + w, grade, tier }, `num:${w}*${w}`)
      }
      if (mode === 'sideFromArea') {
        const a = w * h
        const decoys = numDecoys(rng, h, n - 1, [a - w, h + 1, h - 1, a / 2, w], 3, 1).map(v => `${v} ${unit}`)
        const { choices, answer } = shuffled(rng, `${h} ${unit}`, decoys, n)
        const prompt = [`A rectangle has an area of ${a} sq ${unit}.`, `It is ${w} ${unit} long. How wide is it?`]
        return mathRiddle({ family: 'shapes', skill: 'math: area', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 60 + a / 10, grade, tier }, `num:${a}/${w}`)
      }
      if (mode === 'areaOrPerimeter') {
        const askArea = rng.bool()
        const a = w * h, p = 2 * (w + h)
        const ans = askArea ? a : p
        const decoys = numDecoys(rng, ans, n - 1, [askArea ? p : a, w + h, ans + 2, ans - 2, ans + w], 5, 1).map(v => askArea ? `${v} sq ${unit}` : `${v} ${unit}`)
        const { choices, answer } = shuffled(rng, askArea ? `${a} sq ${unit}` : `${p} ${unit}`, decoys, n)
        const prompt = [`A rectangle is ${w} ${unit} by ${h} ${unit}.`, `What is its ${askArea ? 'area' : 'perimeter'}?`]
        return mathRiddle({ family: 'shapes', skill: askArea ? 'math: area' : 'math: perimeter', prompt, visual: { kind: 'grid', w, h, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 60 + a / 10, grade, tier }, askArea ? `num:${w}*${h}` : `num:2*(${w}+${h})`)
      }
      const a = w * h
      const decoys = numDecoys(rng, a, n - 1, [2 * (w + h), w + h, a + w, a - w, a + h, w * (h + 1)], 5, 1).map(v => `${v} sq ${unit}`)
      const { choices, answer } = shuffled(rng, `${a} sq ${unit}`, decoys, n)
      const prompt = [`A rectangle is ${w} ${unit} long and ${h} ${unit} wide.`, 'What is its area?']
      return mathRiddle({ family: 'shapes', skill: 'math: area', prompt, visual: { kind: 'grid', w, h, unit }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 56 + a / 10, grade, tier }, `num:${w}*${h}`)
    }

    // grade 5
    const mode = rng.pick(tier === 1 ? ['volume', 'triangle', 'point'] : tier === 2 ? ['volume', 'triangle', 'point', 'move'] : ['volume', 'triangle', 'move', 'cubeVolume', 'triangleTwo'])
    const unit = rng.pick(['cm', 'm', 'in', 'ft'])
    if (mode === 'volume' || mode === 'cubeVolume') {
      const l = rng.int(2, tier === 1 ? 5 : 9), w = mode === 'cubeVolume' ? l : rng.int(2, tier === 1 ? 5 : 8), h = mode === 'cubeVolume' ? l : rng.int(2, tier === 1 ? 4 : 7)
      const v = l * w * h
      const decoys = numDecoys(rng, v, n - 1, [l + w + h, l * w, 2 * (l * w + w * h + l * h), v + l, v - l, v + l * w], 8, 1).map(x => `${x} cubic ${unit}`)
      const { choices, answer } = shuffled(rng, `${v} cubic ${unit}`, decoys, n)
      const prompt = mode === 'cubeVolume' ? [`Each edge of a cube is ${l} ${unit}.`, 'What is its volume?'] : [`A box is ${l} ${unit} long, ${w} ${unit} wide`, `and ${h} ${unit} tall. What is its volume?`]
      return mathRiddle({ family: 'shapes', skill: 'math: volume', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 70 + v / 20, grade, tier }, `num:${l}*${w}*${h}`)
    }
    if (mode === 'triangle' || mode === 'triangleTwo') {
      const a = rng.int(2, tier === 1 ? 10 : 15) * 5, b = rng.int(2, Math.min(15, (170 - a) / 5)) * 5
      const c = 180 - a - b
      if (c < 10) return shapes.make(grade, tier, rng)
      const decoys = numDecoys(rng, c, n - 1, [a + b, 180 - a, 180 - b, 360 - a - b, c + 10, c - 10, 90 - a > 0 ? 90 - a : c + 5], 10, 1).map(x => `${x}°`)
      const { choices, answer } = shuffled(rng, `${c}°`, decoys, n)
      const prompt = mode === 'triangle'
        ? [`Two angles of a triangle are ${a}° and ${b}°.`, 'What is the third angle?']
        : [`A triangle has angles of ${a}°, ${b}° and ?°.`, 'The angles add up to 180°. Find ?.']
      return mathRiddle({ family: 'shapes', skill: 'math: angles in a triangle', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 72, grade, tier }, `num:180-${a}-${b}`)
    }
    if (mode === 'point') {
      const pts: [number, number][] = []
      const seen = new Set<string>()
      while (pts.length < 4) { const p: [number, number] = [rng.int(0, 6), rng.int(0, 6)]; const k = p.join(','); if (!seen.has(k)) { seen.add(k); pts.push(p) } }
      // Make one decoy the swapped coordinates when possible.
      const [x, y] = pts[0]
      if (x !== y && !seen.has(`${y},${x}`)) pts[1] = [y, x]
      const labels = ['A', 'B', 'C', 'D']
      const order = rng.shuffle([0, 1, 2, 3])
      const lines = [`A is at (${pts[order[0]].join(', ')})   B is at (${pts[order[1]].join(', ')})`, `C is at (${pts[order[2]].join(', ')})   D is at (${pts[order[3]].join(', ')})`]
      const ansLabel = labels[order.indexOf(0)]
      const { choices, answer } = shuffled(rng, ansLabel, labels.filter(l => l !== ansLabel), n)
      const prompt = [...lines, `Which point is at (${x}, ${y})?`]
      return mathRiddle({ family: 'shapes', skill: 'math: coordinates', prompt, choices, answer, spoken: `${lines.join('. ')}. Which point is at ${x}, ${y}? ${sayChoices(choices)}?`, metric: 70, grade, tier }, '')
    }
    // move on the grid
    const x = rng.int(0, 6), y = rng.int(0, 6), dx = rng.int(1, 5), dy = rng.int(1, 5)
    const right = rng.bool(0.7) || x - dx < 0, up = rng.bool(0.7) || y - dy < 0
    const nx = right ? x + dx : x - dx, ny = up ? y + dy : y - dy
    const pt = (a: number, b: number) => `(${a}, ${b})`
    const decoyPts = [pt(ny, nx), pt(right ? x - dx : x + dx, ny), pt(nx, up ? y - dy : y + dy), pt(x + dy, y + dx), pt(nx + 1, ny), pt(nx, ny - 1)].filter(p => p !== pt(nx, ny))
    const { choices, answer } = shuffled(rng, pt(nx, ny), rng.shuffle([...new Set(decoyPts)]), n)
    const prompt = [`Start at ${pt(x, y)}. Move ${dx} ${right ? 'right' : 'left'}`, `and ${dy} ${up ? 'up' : 'down'}. Where are you now?`]
    return mathRiddle({ family: 'shapes', skill: 'math: coordinates', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 74, grade, tier }, `pt:${nx},${ny}`)
  },
}

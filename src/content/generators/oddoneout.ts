import type { Generator, Choice, ShapeName, CounterItem, Tier } from '../types'
import type { Rng } from '../../engine/rng'
import { riddle, shuffled, choiceCount } from '../types'
import { ODD_SETS } from '../data/oddoneout'

/** Colours the renderer can paint; picture items only ever differ on one attribute at a time. */
const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple']
/** No rectangle: a square is a rectangle, so the two must never be sorted against each other. */
const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart', 'hexagon']
const COUNTER_ITEMS: CounterItem[] = ['apple', 'star', 'ball', 'fish', 'flower', 'coin', 'block', 'heart', 'balloon', 'bug', 'cookie', 'acorn']

const PROMPTS = (n: number) => [
  ['Which one does not belong?'],
  ['One of these is not like the others.', 'Which one is it?'],
  [`${n === 4 ? 'Three' : 'Two'} of these go together.`, 'Which one is the odd one out?'],
]

const shapeWords = (choices: Choice[]) =>
  choices.map(c => (c.visual && c.visual.kind === 'shape' ? `a ${c.visual.color} ${c.visual.name}` : '')).join(', ')

/**
 * Kindergarten sorts pictures, one attribute per tier: colour (t1), shape (t2), how many (t3).
 * Each item is built so that only the named attribute groups the pictures - the other attributes are
 * all different, so there is never a second reading.
 */
function pictures(tier: Tier, rng: Rng): ReturnType<typeof riddle> {
  if (tier === 1) {
    // Three different shapes; two share a colour. Shape gives no grouping at all.
    const [s1, s2, s3] = rng.sample(SHAPES, 3)
    const [c1, c2] = rng.sample(COLORS, 2)
    const odd: Choice = { visual: { kind: 'shape', name: s3, color: c2 } }
    const same: Choice[] = [{ visual: { kind: 'shape', name: s1, color: c1 } }, { visual: { kind: 'shape', name: s2, color: c1 } }]
    const { choices, answer } = shuffled(rng, odd, same, 3)
    const prompt = rng.pick([['Which one is a different color?'], ['Look at the colors.', 'Which color is not like the others?']])
    return riddle({
      family: 'oddoneout', skill: 'thinking: sorting by color', prompt, choices, answer,
      spoken: `Which one is a different color? ${shapeWords(choices)}?`,
      metric: 2, grade: 0, tier, key: `oddoneout|k-color|${choices.map(c => JSON.stringify(c.visual)).join(',')}`,
    })
  }
  if (tier === 2) {
    // Three different colours; two share a shape. Colour gives no grouping at all.
    const [s1, s2] = rng.sample(SHAPES, 2)
    const [c1, c2, c3] = rng.sample(COLORS, 3)
    const odd: Choice = { visual: { kind: 'shape', name: s2, color: c3 } }
    const same: Choice[] = [{ visual: { kind: 'shape', name: s1, color: c1 } }, { visual: { kind: 'shape', name: s1, color: c2 } }]
    const { choices, answer } = shuffled(rng, odd, same, 3)
    const prompt = rng.pick([['Which one is a different shape?'], ['Look at the shapes.', 'Which shape is not like the others?']])
    return riddle({
      family: 'oddoneout', skill: 'thinking: sorting by shape', prompt, choices, answer,
      spoken: `Which one is a different shape? ${shapeWords(choices)}?`,
      metric: 4, grade: 0, tier, key: `oddoneout|k-shape|${choices.map(c => JSON.stringify(c.visual)).join(',')}`,
    })
  }
  // Tier 3: three different things; two groups hold the same number and one does not. The child has
  // to count, so the hardest kindergarten tier asks for more than "which picture looks different".
  const [i1, i2, i3] = rng.sample(COUNTER_ITEMS, 3)
  const same = rng.int(3, 6)
  const diff = rng.bool() ? same + rng.int(2, 3) : Math.max(1, same - rng.int(2, 3))
  const odd: Choice = { visual: { kind: 'counters', item: i3, count: diff } }
  const rest: Choice[] = [{ visual: { kind: 'counters', item: i1, count: same } }, { visual: { kind: 'counters', item: i2, count: same } }]
  const { choices, answer } = shuffled(rng, odd, rest, 3)
  const prompt = rng.pick([['Which one shows a different number?'], ['Count each group.', 'Which group has a different number?']])
  const spoken = `Which one shows a different number? ${choices.map(c => (c.visual && c.visual.kind === 'counters' ? `${c.visual.count} ${c.visual.item}s` : '')).join(', ')}?`
  return riddle({
    family: 'oddoneout', skill: 'thinking: sorting by number', prompt, choices, answer, spoken,
    metric: 6, grade: 0, tier, key: `oddoneout|k-count|${choices.map(c => JSON.stringify(c.visual)).join(',')}`,
  })
}

/**
 * Odd one out. K sorts pictures by colour, shape and number (one attribute per tier). Grades 1-5 draw
 * word sets from `ODD_SETS`, where each (grade, tier) owns its own band: no set is shared by two
 * tiers of a grade or by two grades, so tier 3 can never repeat something tier 1 asked.
 */
export const oddoneout: Generator = {
  id: 'oddoneout',
  name: 'Odd one out',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 1.2, 2: 1, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    if (grade === 0) return pictures(tier, rng)
    const n = choiceCount(grade)
    const pool = ODD_SETS.filter(s => s.level === grade && s.band === tier)
    const set = rng.pick(pool)
    const others = rng.sample(set.others, n - 1)
    const { choices, answer } = shuffled(rng, set.odd, others, n)
    // A tier-1 hint names the attribute out loud, which is what makes tier 1 the gentle version.
    const hint = tier === 1 && rng.bool(0.5)
    const base = rng.pick(PROMPTS(n))
    const prompt = hint ? [...base, `Hint: most of these ${set.why}.`] : base
    return riddle({
      family: 'oddoneout', skill: grade <= 2 ? 'thinking: categories' : 'thinking: classifying', prompt, choices, answer,
      spoken: `${base.join(' ')} ${choices.map(c => c.text).join(', ')}?`,
      metric: grade * 10 + tier * 2 + (hint ? 0 : 1), grade, tier,
      key: `oddoneout|${set.odd}|${[...others].sort().join(',')}`,
    })
  },
}

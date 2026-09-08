import type { Generator, Choice, ShapeName } from '../types'
import { riddle, shuffled, choiceCount } from '../types'
import { ODD_SETS } from '../data/oddoneout'
import { pickLevel, wrap } from './thinkingUtil'

const COLORS = ['red', 'blue', 'green', 'yellow', 'orange', 'purple']
const SHAPES: ShapeName[] = ['circle', 'square', 'triangle', 'star', 'heart', 'rectangle']

const PROMPTS = (n: number) => [
  ['Which one does not belong?'],
  ['One of these is not like the others.', 'Which one is it?'],
  [`${n === 4 ? 'Three' : 'Two'} of these go together.`, 'Which one is the odd one out?'],
]

/**
 * Odd one out. K: colour and shape pictures ("Which one is a different colour?"); 1: simple categories;
 * 2: a shared attribute; 3: two attributes; 4: abstract; 5: conceptual.
 */
export const oddoneout: Generator = {
  id: 'oddoneout',
  name: 'Odd one out',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 1.2, 2: 1, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const level = pickLevel(grade, tier, rng)
    if (level === 0) {
      // Picture mode: two items share a colour and one does not (or two share a shape and one does not).
      // Every choice is a distinct picture, so we ask about the attribute explicitly.
      const byShape = tier === 1 ? false : tier === 2 ? true : rng.bool()
      const [c1, c2] = rng.sample(COLORS, 2)
      const [s1, s2] = rng.sample(SHAPES, 2)
      let items: Choice[]
      let odd: Choice
      if (byShape) {
        // same shape s1 in two colours, plus shape s2 in c1: the different *shape* is the odd one.
        odd = { visual: { kind: 'shape', name: s2, color: c1 } }
        items = [{ visual: { kind: 'shape', name: s1, color: c1 } }, { visual: { kind: 'shape', name: s1, color: c2 } }]
      } else {
        odd = { visual: { kind: 'shape', name: s1, color: c2 } }
        items = [{ visual: { kind: 'shape', name: s1, color: c1 } }, { visual: { kind: 'shape', name: s2, color: c1 } }]
      }
      if (n === 4) items.push({ visual: { kind: 'shape', name: byShape ? s1 : rng.pick(SHAPES.filter(s => s !== s1 && s !== s2)), color: byShape ? rng.pick(COLORS.filter(c => c !== c1 && c !== c2)) : c1 } })
      const { choices, answer } = shuffled(rng, odd, items, n)
      const prompt = byShape ? rng.pick([['Which one is a different shape?'], ['Look at the shapes.', 'Which shape is not like the others?']]) : rng.pick([['Which one is a different colour?'], ['Look at the colours.', 'Which one is not like the others?']])
      const spoken = byShape ? `Which one is a different shape? ${choices.map(c => c.visual && c.visual.kind === 'shape' ? `a ${c.visual.color} ${c.visual.name}` : '').join(', ')}?` : `Which one is a different colour? ${choices.map(c => c.visual && c.visual.kind === 'shape' ? `a ${c.visual.color} ${c.visual.name}` : '').join(', ')}?`
      return riddle({
        family: 'oddoneout', skill: byShape ? 'thinking: sorting by shape' : 'thinking: sorting by colour', prompt, choices, answer, spoken,
        metric: byShape ? 4 : 2, grade, tier,
        key: `oddoneout|k|${byShape ? 'shape' : 'colour'}|${choices.map(c => JSON.stringify(c.visual)).join(',')}`,
      })
    }
    const pool = ODD_SETS.filter(s => s.level === level)
    const set = rng.pick(pool)
    const others = rng.sample(set.others, n - 1)
    const { choices, answer } = shuffled(rng, set.odd, others, n)
    const hint = grade <= 2 && tier === 1 && rng.bool(0.5)
    const base = rng.pick(PROMPTS(n))
    const prompt = hint ? [...base, ...wrap(`Hint: most of these are ${set.why}.`)] : base
    const avgLen = [set.odd, ...others].reduce((s, w) => s + w.length, 0) / n
    return riddle({
      family: 'oddoneout', skill: level <= 2 ? 'thinking: categories' : 'thinking: classifying', prompt, choices, answer,
      spoken: `${base.join(' ')} ${choices.map(c => c.text).join(', ')}?`,
      metric: level * 10 + (hint ? 0 : 3) + Math.min(4, avgLen / 2), grade, tier,
      key: `oddoneout|${set.odd}|${[...others].sort().join(',')}`,
    })
  },
}

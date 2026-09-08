import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap, sayChoices} from '../types'
import { ANALOGIES, type Analogy, type Relation } from '../data/analogies'
import { tierWindow, rankIn } from './textutil'

function levels(grade: Grade, tier: Tier): number[] {
  const table: Partial<Record<Grade, number[][]>> = {
    3: [[3], [3, 4], [4]],
    4: [[4], [4, 5], [5]],
    5: [[4, 5], [5], [5]],
  }
  return table[grade]![tier - 1]
}

/** Relations that are too close to tell apart when used as pair decoys. */
const NEAR: Record<Relation, Relation[]> = {
  antonym: ['antonym'], synonym: ['synonym', 'degree'], degree: ['degree', 'synonym'],
  'part/whole': ['part/whole', 'category'], category: ['category', 'part/whole'],
  'worker/tool': ['worker/tool', 'object/function'], 'object/function': ['object/function', 'worker/tool'],
  'animal/home': ['animal/home'], 'animal/baby': ['animal/baby'],
}

const RELATION_NAME: Record<Relation, string> = {
  antonym: 'opposites', synonym: 'words that mean the same', 'part/whole': 'part and whole', 'worker/tool': 'worker and tool',
  'animal/home': 'animal and home', 'animal/baby': 'animal and baby', 'object/function': 'object and its use', degree: 'degree', category: 'kind of thing',
}

export const analogies: Generator = {
  id: 'analogies',
  name: 'Analogies',
  area: 'reading',
  grades: [3, 4, 5],
  weight: { 3: 0.9, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const lv = levels(grade, tier)
    const pool = ANALOGIES.filter(a => lv.includes(a.level))
    // Inside a level the relations run from the plainest (opposites, synonyms) to the ones that
    // turn on specific vocabulary (a baby swan is a cygnet, a beaver lives in a lodge), so each
    // tier takes its own window: two tiers on the same level are not the same questions.
    const window = lv.flatMap(l => tierWindow(pool.filter(x => x.level === l), tier))
    const a: Analogy = rng.pick(window.length >= 6 ? window : pool)
    const rank = rankIn(ANALOGIES.filter(x => x.level === a.level), a) * 5
    type Mode = 'fill' | 'colon' | 'pair'
    const modes: Mode[] = grade === 3 ? ['fill', 'fill', tier === 3 ? 'colon' : 'fill'] : grade === 4 ? (tier === 1 ? ['fill', 'colon'] : ['fill', 'colon', 'pair']) : ['fill', 'colon', 'pair', 'pair']
    const mode = rng.pick(modes)
    if (mode === 'pair') {
      // "Which pair goes together like hot : cold?" - decoy pairs come from clearly different relations.
      const others = rng.shuffle(pool.concat(ANALOGIES).filter(x => x !== a && !NEAR[a.rel].includes(x.rel)))
      const decoys = others.map(x => `${x.a} : ${x.b}`).filter(s => s.length <= 26)
      const answer = `${a.c} : ${a.d}`
      const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
      const prompt = [`${a.a} : ${a.b}`, 'Which pair goes together', 'in the same way?']
      return riddle({
        family: 'analogies', skill: `thinking: analogies (${RELATION_NAME[a.rel]})`, prompt, choices, answer: idx,
        spoken: `${a.a} goes with ${a.b}. Which pair goes together in the same way? ${sayChoices(choices)}?`,
        metric: a.level * 10 + a.d.length + 3 + rank, grade, tier,
        key: `analogies|pair|${a.a}|${a.b}`,
      })
    }
    // Decoys: the hand-picked wrong-relation words, then fourth words of other analogies with the same relation.
    const extra = rng.shuffle(ANALOGIES.filter(x => x !== a && x.rel === a.rel && x.d !== a.d && x.c !== a.c)).map(x => x.d)
    const decoys = [...rng.shuffle(a.decoys), ...extra].filter(w => w !== a.d && w !== a.c)
    const { choices, answer } = shuffled(rng, a.d, decoys, n)
    const prompt = mode === 'colon'
      ? [`${a.a} : ${a.b} :: ${a.c} : ___`, 'Which word finishes the analogy?']
      : rng.pick([[`${cap(a.a)} is to ${a.b}`, `as ${a.c} is to ___.`], [`${cap(a.a)} is to ${a.b} as ${a.c} is to ___.`]]).flatMap(l => l.length > 46 ? [l.slice(0, l.indexOf(' as ')), l.slice(l.indexOf(' as ') + 1)] : [l])
    return riddle({
      family: 'analogies', skill: `thinking: analogies (${RELATION_NAME[a.rel]})`, prompt, highlight: [a.a, a.b, a.c], choices, answer,
      spoken: `${a.a} is to ${a.b} as ${a.c} is to blank. ${sayChoices(choices)}?`,
      metric: a.level * 10 + a.d.length + (mode === 'colon' ? 1 : 0) + rank, grade, tier,
      key: `analogies|${a.a}|${a.b}|${a.c}|${mode}`,
    })
  },
}

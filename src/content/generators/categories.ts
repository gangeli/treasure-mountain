import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { CATEGORIES, overlapping, type Category } from '../data/categories'

type Mode = 'which' | 'odd' | 'name'

function levelsFor(grade: Grade, tier: Tier): number[] {
  const table: Record<Grade, number[][]> = {
    0: [[1], [1], [1, 2]],
    1: [[1, 2], [2], [2]],
    2: [[2], [2, 3], [3]],
    3: [[3], [3], [3, 4]],
    4: [[3, 4], [4], [4]],
    5: [[4], [4], [4]],
  }
  return table[grade][tier - 1]
}

function modesFor(grade: Grade, tier: Tier): Mode[] {
  if (grade === 0) return ['which']
  if (grade === 1) return tier === 3 ? ['which', 'odd'] : ['which']
  if (grade === 2) return tier === 1 ? ['which', 'odd'] : ['odd', 'odd', 'which']
  if (grade === 3) return tier === 1 ? ['odd', 'which'] : ['odd', 'name']
  if (grade === 4) return tier === 1 ? ['odd', 'name'] : ['name', 'odd']
  return tier === 1 ? ['name', 'odd'] : ['name', 'name', 'odd']
}

/** Words that are members of no category overlapping `cat`; same-domain ones first. */
function outsiders(rng: { shuffle<T>(a: readonly T[]): T[] }, cat: Category): string[] {
  const over = new Set(overlapping(cat))
  const banned = new Set([...over].flatMap(c => c.members.map(m => m.toLowerCase())))
  const ok = (c: Category) => !over.has(c)
  const same = rng.shuffle(CATEGORIES.filter(c => ok(c) && c.domain === cat.domain && Math.abs(c.level - cat.level) <= 1).flatMap(c => c.members))
  const near = rng.shuffle(CATEGORIES.filter(c => ok(c) && c.domain !== cat.domain && Math.abs(c.level - cat.level) <= 1).flatMap(c => c.members))
  const any = rng.shuffle(CATEGORIES.filter(ok).flatMap(c => c.members))
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of [...same, ...near, ...any]) {
    const k = w.toLowerCase()
    if (banned.has(k) || seen.has(k) || w.length > 26) continue
    seen.add(k)
    out.push(w)
  }
  return out
}

const list = (xs: string[]): string => xs.join(', ')

/** Which is a fruit (K-1), which does not belong (2+), and naming the category (3-5). */
export const categories: Generator = {
  id: 'categories',
  name: 'Categories',
  area: 'reading',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 1.3, 2: 1.2, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const levels = levelsFor(grade, tier)
    const mode = rng.pick(modesFor(grade, tier))
    const pool = CATEGORIES.filter(c => levels.includes(c.level) && c.members.length >= (mode === 'name' ? 3 : n))
    const cat = rng.pick(pool)
    const skill = mode === 'name' ? 'vocabulary: naming categories' : mode === 'odd' ? 'thinking: which does not belong' : 'vocabulary: categories'

    if (mode === 'which') {
      const answerW = rng.pick(cat.members.filter(m => m.length <= 26))
      const { choices, answer } = shuffled(rng, answerW, outsiders(rng, cat), n)
      const prompt = grade === 0 && rng.bool(0.4) ? ['Look at these three words.', `Which one is ${cat.one}?`] : [`Which one is ${cat.one}?`]
      return riddle({
        family: 'categories', skill, prompt, choices, answer,
        spoken: `Which one is ${cat.one}? ${list(choices.map(c => c.text ?? ''))}?`,
        metric: cat.level * 10 + answerW.length / 2, grade, tier,
      })
    }

    if (mode === 'odd') {
      const members = rng.sample(cat.members.filter(m => m.length <= 26), n - 1)
      const outsider = outsiders(rng, cat)[0]
      const { choices, answer } = shuffled(rng, outsider, members, n)
      const hint = grade <= 2 || (grade === 3 && tier === 1)
      const count = n - 1 === 3 ? 'Three' : 'Two'
      const prompt = hint ? ['Which one does not belong?', `${count} of these are ${cat.many}.`] : ['Which one does not belong?']
      return riddle({
        family: 'categories', skill, prompt, choices, answer,
        spoken: `${prompt.join(' ')} ${list(choices.map(c => c.text ?? ''))}?`,
        metric: cat.level * 10 + (hint ? 3 : 6) + outsider.length / 4, grade, tier,
      })
    }

    // name: "Oak, pine, and maple are all ___."
    let shown = rng.sample(cat.members, 3)
    let line = `${cap(shown[0])}, ${shown[1]}, and ${shown[2]}`
    for (let t = 0; t < 6 && line.length > 46; t++) { shown = rng.sample(cat.members, 3); line = `${cap(shown[0])}, ${shown[1]}, and ${shown[2]}` }
    if (line.length > 46) { shown = shown.slice(0, 2); line = `${cap(shown[0])} and ${shown[1]}` }
    const over = new Set(overlapping(cat))
    const decoyCats = rng.shuffle(CATEGORIES.filter(c => !over.has(c) && c.many.length <= 26))
      .sort((a, b) => (a.domain === cat.domain ? 0 : 1) - (b.domain === cat.domain ? 0 : 1))
    const { choices, answer } = shuffled(rng, cat.many, decoyCats.map(c => c.many), n)
    const prompt = [line, shown.length === 3 ? 'are all ___.' : 'are both ___.']
    return riddle({
      family: 'categories', skill, prompt, highlight: shown, choices, answer,
      spoken: `${shown.join(', ')}. These are all what? ${list(choices.map(c => c.text ?? ''))}?`,
      metric: cat.level * 10 + 8 + cat.many.length / 4, grade, tier,
    })
  },
}

import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { CATEGORIES, overlapping, allMembers, byId, type Category } from '../data/categories'
import { tierWindow, rankIn } from './textutil'

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
  if (grade === 1) return tier === 3 ? ['odd', 'odd', 'which'] : tier === 2 ? ['which', 'which', 'odd'] : ['which']
  if (grade === 2) return tier === 1 ? ['which', 'odd'] : ['odd', 'odd', 'which']
  if (grade === 3) return tier === 1 ? ['odd', 'which'] : ['odd', 'name']
  if (grade === 4) return tier === 1 ? ['odd', 'name'] : ['name', 'odd']
  return tier === 1 ? ['name', 'odd'] : ['name', 'name', 'odd']
}

/**
 * Decoy words for `cat`. With `decoysFrom`, they come from those sibling categories and only the
 * category's own (explicit and implicit) members are banned; otherwise from categories that share
 * no member with `cat`, same domain first, banning every member of any overlapping category.
 */
function outsiders(rng: { shuffle<T>(a: readonly T[]): T[] }, cat: Category, grade: number): string[] {
  const maxLevel = grade <= 1 ? 2 : cat.level + 1
  let banned: Set<string>
  let pools: string[][]
  if (cat.decoysFrom) {
    banned = new Set(allMembers(cat))
    const from = cat.decoysFrom.map(byId)
    pools = [rng.shuffle(from.filter(c => c.level <= maxLevel).flatMap(c => c.members)), rng.shuffle(from.flatMap(c => c.members))]
  } else {
    const over = new Set(overlapping(cat))
    banned = new Set([...over].flatMap(allMembers))
    const ok = (c: Category) => !over.has(c) && c.level <= maxLevel && c.level >= cat.level - 1
    pools = [
      rng.shuffle(CATEGORIES.filter(c => ok(c) && c.domain === cat.domain).flatMap(c => c.members)),
      rng.shuffle(CATEGORIES.filter(c => ok(c) && c.domain !== cat.domain).flatMap(c => c.members)),
      rng.shuffle(CATEGORIES.filter(c => !over.has(c)).flatMap(c => c.members)),
    ]
  }
  const seen = new Set<string>()
  const out: string[] = []
  for (const w of pools.flat()) {
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
    // The category list runs from the ones a child names first (colors, animals) to the ones that
    // come later (instruments, minerals), so each tier takes its own window of the level.
    const window = levels.flatMap(l => tierWindow(pool.filter(c => c.level === l), tier))
    const cat = rng.pick(window.length >= 4 ? window : pool)
    const rank = rankIn(CATEGORIES.filter(c => c.level === cat.level), cat) * 5
    const skill = mode === 'name' ? 'vocabulary: naming categories' : mode === 'odd' ? 'thinking: which does not belong' : 'vocabulary: categories'

    if (mode === 'which') {
      const answerW = rng.pick(cat.members.filter(m => m.length <= 26))
      const { choices, answer } = shuffled(rng, answerW, outsiders(rng, cat, grade), n)
      const prompt = grade === 0 && rng.bool(0.4) ? ['Look at these three words.', `Which one is ${cat.one}?`] : [`Which one is ${cat.one}?`]
      return riddle({
        family: 'categories', skill, prompt, choices, answer,
        spoken: `Which one is ${cat.one}? ${list(choices.map(c => c.text ?? ''))}?`,
        metric: cat.level * 10 + answerW.length / 2 + rank, grade, tier,
      })
    }

    if (mode === 'odd') {
      const pool2 = cat.members.filter(m => m.length <= 26)
      const outsider = outsiders(rng, cat, grade)[0]
      // Number sets need one rule, not two: with 7 as the outsider, members 14 and 21 make "not a
      // multiple of 7" a second, equally good reason to pick a different choice.
      const num = (x: string) => /^\d+$/.test(x) ? parseInt(x) : 0
      const out = num(outsider)
      const coprime = pool2.filter(m => { const v = num(m); return v > 0 && v % out !== 0 && out % v !== 0 })
      const members = rng.sample(out > 1 && coprime.length >= n - 1 ? coprime : pool2, n - 1)
      const { choices, answer } = shuffled(rng, outsider, members, n)
      // Number sets always carry the rule: with 19 against 25 and 4, "the only prime" and "the only
      // square" are both true, and only the hint line says which one is being asked.
      const hint = grade <= 2 || (grade === 3 && tier === 1) || cat.domain === 'math'
      const count = n - 1 === 3 ? 'Three' : 'Two'
      const prompt = hint ? ['Which one does not belong?', `${count} of these are ${cat.many}.`] : ['Which one does not belong?']
      return riddle({
        family: 'categories', skill, prompt, choices, answer,
        spoken: `${prompt.join(' ')} ${list(choices.map(c => c.text ?? ''))}?`,
        metric: cat.level * 10 + (hint ? 3 : 6) + outsider.length / 4 + rank, grade, tier,
      })
    }

    // name: "Oak, pine, and maple are all ___."
    let shown = rng.sample(cat.members, 3)
    let line = `${cap(shown[0])}, ${shown[1]}, and ${shown[2]}`
    for (let t = 0; t < 6 && line.length > 46; t++) { shown = rng.sample(cat.members, 3); line = `${cap(shown[0])}, ${shown[1]}, and ${shown[2]}` }
    if (line.length > 46) { shown = shown.slice(0, 2); line = `${cap(shown[0])} and ${shown[1]}` }
    // Decoy names: sibling categories (decoysFrom) first, then same-domain ones; never a superset like "animals".
    const over = new Set(overlapping(cat))
    const okName = (c: Category) => !over.has(c) && !c.broad && c.many.length <= 26
    const siblings = cat.decoysFrom ? rng.shuffle(cat.decoysFrom.map(byId).filter(okName)) : []
    const rest = rng.shuffle(CATEGORIES.filter(c => okName(c) && !siblings.includes(c)))
      .sort((a, b) => (a.domain === cat.domain ? 0 : 1) - (b.domain === cat.domain ? 0 : 1))
    const decoyCats = [...siblings, ...rest]
    const { choices, answer } = shuffled(rng, cat.many, decoyCats.map(c => c.many), n)
    const prompt = [line, shown.length === 3 ? 'are all ___.' : 'are both ___.']
    return riddle({
      family: 'categories', skill, prompt, highlight: shown, choices, answer,
      spoken: `${shown.join(', ')}. These are all what? ${list(choices.map(c => c.text ?? ''))}?`,
      metric: cat.level * 10 + 8 + cat.many.length / 4 + rank, grade, tier,
    })
  },
}

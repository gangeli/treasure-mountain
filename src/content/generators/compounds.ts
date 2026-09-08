import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { COMPOUNDS, compoundWord, type Compound } from '../data/compounds'
import { OPPOSITES } from '../data/opposites'
import { SYNONYMS } from '../data/synonyms'
import { SYLLABLE_WORDS } from '../data/syllables'
import { FAMILIES } from '../data/phonics'

function levelsFor(grade: Grade, tier: Tier): number[] {
  const table: Partial<Record<Grade, number[][]>> = {
    1: [[1], [1, 2], [2]],
    2: [[2], [2, 3], [3]],
    3: [[3], [3, 4], [4]],
    4: [[3, 4], [4], [4]],
  }
  return (table[grade] ?? [[4], [4], [4]])[tier - 1]
}

const HALVES = new Set(COMPOUNDS.flatMap(c => [c.a, c.b]))
/** Real words known to the content data, for judging whether a wrong split looks plausible. */
const LEXICON = new Set<string>([
  ...HALVES,
  ...OPPOSITES.flatMap(p => [p.a, p.b]),
  ...SYNONYMS.flatMap(g => g.words),
  ...Object.values(SYLLABLE_WORDS).flat(),
  ...FAMILIES.flatMap(f => f.words),
].map(w => w.toLowerCase()))

/** Compounds sharing exactly one half with `x` (never the reversed word). */
function sharingHalf(x: Compound): Compound[] {
  const w = compoundWord(x)
  return COMPOUNDS.filter(c => c !== x && compoundWord(c) !== w && compoundWord(c) !== x.b + x.a && ((c.a === x.a) !== (c.b === x.b)))
}

/** Three worked examples then a blank (the original game's format); grade 4 tier 3 also splits compounds. */
export const compounds: Generator = {
  id: 'compounds',
  name: 'Compound words',
  area: 'reading',
  grades: [1, 2, 3, 4],
  weight: { 1: 1, 2: 1.5, 3: 1.2, 4: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const levels = levelsFor(grade, tier)
    const pool = COMPOUNDS.filter(c => levels.includes(c.level))
    const target = rng.pick(pool)
    const word = compoundWord(target)
    const split = grade === 4 && (tier === 3 ? rng.bool(0.45) : tier === 2 && rng.bool(0.2))

    if (split) {
      const byA = rng.shuffle(sharingHalf(target).filter(c => c.a === target.a))
      const byB = rng.shuffle(sharingHalf(target).filter(c => c.b === target.b))
      const decoys: string[] = []
      if (byA.length) decoys.push(`${target.a} + ${byA[0].b}`)
      if (byB.length) decoys.push(`${byB[0].a} + ${target.b}`)
      // A wrong split of the word itself, only when it looks plausible: exactly one piece is a real word
      // (flash + light -> fla + shlight is silly; new + sprint would be arguable, so both-real is skipped too).
      const splits = rng.shuffle([target.a.length - 1, target.a.length + 1, target.a.length - 2, target.a.length + 2])
        .filter(k => k >= 2 && k <= word.length - 2)
        .map(k => [word.slice(0, k), word.slice(k)])
        .filter(([l, r]) => LEXICON.has(l) !== LEXICON.has(r))
      if (splits.length) decoys.push(`${splits[0][0]} + ${splits[0][1]}`)
      for (const c of rng.shuffle(pool)) { if (decoys.length >= n + 1) break; if (c !== target) decoys.push(`${c.a} + ${c.b}`) }
      const { choices, answer } = shuffled(rng, `${target.a} + ${target.b}`, rng.shuffle(decoys).filter(d => d.length <= 26), n)
      const prompt = [`Which two words make "${word}"?`]
      return riddle({
        family: 'compounds', skill: 'vocabulary: compound words', prompt, highlight: [word], choices, answer,
        spoken: `Which two words make the word ${word}? ${choices.map(c => (c.text ?? '').replace(' + ', ' plus ')).join(', ')}?`,
        metric: target.level * 10 + word.length + 6, grade, tier,
      })
    }

    // Worked examples: three compounds at or below this level, not the target.
    const maxLevel = Math.max(...levels)
    const exPool = COMPOUNDS.filter(c => c !== target && c.level <= maxLevel && c.level >= maxLevel - 1)
    const examples = rng.sample(exPool, 3)
    const exWords = new Set(examples.map(compoundWord))
    const shared = rng.shuffle(sharingHalf(target)).filter(c => !exWords.has(compoundWord(c)))
    const others = rng.shuffle(pool).filter(c => c !== target && !exWords.has(compoundWord(c)) && !shared.includes(c))
    const decoys = [...shared, ...others].map(compoundWord)
    const { choices, answer } = shuffled(rng, word, decoys, n)
    const prompt = [...examples.map(e => `${cap(e.a)} + ${e.b} = ${compoundWord(e)}`), `${cap(target.a)} + ${target.b} = ______.`]
    return riddle({
      family: 'compounds', skill: 'vocabulary: compound words', prompt, highlight: [`${cap(target.a)} + ${target.b}`], choices, answer,
      spoken: `${examples.map(e => `${e.a} plus ${e.b} is ${compoundWord(e)}`).join('. ')}. ${target.a} plus ${target.b} is what? ${choices.map(c => c.text).join(', ')}?`,
      metric: target.level * 10 + word.length, grade, tier,
    })
  },
}

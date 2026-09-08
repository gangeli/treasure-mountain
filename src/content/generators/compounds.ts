import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap, sayChoices} from '../types'
import { COMPOUNDS, compoundWord, type Compound } from '../data/compounds'
import { OPPOSITES } from '../data/opposites'
import { SYNONYMS } from '../data/synonyms'
import { SYLLABLE_WORDS } from '../data/syllables'
import { FAMILIES } from '../data/phonics'

/** How hard a compound is to read: the whole word plus its longest half. Also the metric. */
const hardness = (c: Compound): number => compoundWord(c).length + Math.max(c.a.length, c.b.length)
const reversedOf = (c: Compound): string => c.b + c.a

/**
 * Level N belongs to grade N and to nobody else, and inside a level the three tiers get three
 * non-overlapping bands sorted by hardness. So a word is never an answer in two grades, and tier 3
 * can never draw a word tier 1 could.
 */
const LEVELS: (1 | 2 | 3 | 4)[] = [1, 2, 3, 4]
const BANDS: Record<number, Compound[][]> = {}
for (const level of LEVELS) {
  const all = COMPOUNDS.filter(c => c.level === level)
    .slice()
    .sort((x, y) => hardness(x) - hardness(y) || compoundWord(x).localeCompare(compoundWord(y)))
  const size = Math.ceil(all.length / 3)
  BANDS[level] = [all.slice(0, size), all.slice(size, 2 * size), all.slice(2 * size)]
}

/**
 * Compounds of the same level that share one half with `x` - the only decoys worth offering, since
 * a child then has to read past the first element. Never `x` itself and never its reversal
 * ("tubbath" for bathtub), which must not be offered as if it were a compound.
 */
const RELATED = new Map<Compound, Compound[]>()
for (const level of LEVELS) {
  const all = COMPOUNDS.filter(c => c.level === level)
  for (const x of all) {
    RELATED.set(x, all.filter(c => c !== x && compoundWord(c) !== compoundWord(x) && compoundWord(c) !== reversedOf(x)
      && (c.a === x.a || c.b === x.b || c.a === x.b || c.b === x.a)))
  }
}

/** Targets with enough on-theme decoys to fill the choice list. */
const POOLS: Record<number, Compound[][]> = {}
for (const level of LEVELS) POOLS[level] = BANDS[level].map(band => {
  const need = level <= 2 ? 2 : 3
  const ok = band.filter(c => RELATED.get(c)!.length >= need)
  return ok.length >= 12 ? ok : band.filter(c => RELATED.get(c)!.length >= 1)
})

/** How often "Which two words make X?" replaces the fill-in format: the format ramp. */
const REVERSE_P: Record<number, number[]> = { 1: [0, 0, 0], 2: [0, 0, 0], 3: [0, 0, 0.35], 4: [0.3, 0.6, 1] }

const HALVES = new Set(COMPOUNDS.flatMap(c => [c.a, c.b]))
/** Real words known to the content data, for judging whether a wrong split looks plausible. */
const LEXICON = new Set<string>([
  ...HALVES,
  ...OPPOSITES.flatMap(p => [p.a, p.b]),
  ...SYNONYMS.flatMap(g => g.words),
  ...Object.values(SYLLABLE_WORDS).flat(),
  ...FAMILIES.flatMap(f => f.words),
].map(w => w.toLowerCase()))

/**
 * Worked examples come from the year below (for grade 1, from the shortest grade-2 words), never
 * from this grade's own answer pool: an example must not pre-answer another riddle of the hunt.
 */
function examplePool(level: number): Compound[] {
  return level > 1 ? COMPOUNDS.filter(c => c.level === level - 1) : BANDS[2][0]
}

/** Three worked examples then a blank; grades 3-4 also ask which two words make a compound. */
export const compounds: Generator = {
  id: 'compounds',
  name: 'Compound words',
  area: 'reading',
  grades: [1, 2, 3, 4],
  weight: { 1: 1, 2: 1.5, 3: 1.2, 4: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const level = grade as 1 | 2 | 3 | 4
    const pool = POOLS[level][tier - 1]
    const target = rng.pick(pool)
    const word = compoundWord(target)
    const reversed = reversedOf(target)
    const related = RELATED.get(target)!
    const levelPool = BANDS[level].flat()
    const reverse = rng.bool(REVERSE_P[level][tier - 1])
    const metric = level * 10 + hardness(target) + (reverse ? 8 : 0)

    if (reverse) {
      const pair = (c: Compound) => `${c.a} + ${c.b}`
      const byA = rng.shuffle(related.filter(c => c.a === target.a))
      const byB = rng.shuffle(related.filter(c => c.b === target.b))
      const decoys: string[] = []
      if (byA.length) decoys.push(pair(byA[0]))
      if (byB.length) decoys.push(pair(byB[0]))
      // A wrong split of the word itself, only when it looks plausible: exactly one piece is a real
      // word (flash + light -> fla + shlight is silly; new + sprint would be arguable, so both-real
      // is skipped too).
      const splits = rng.shuffle([target.a.length - 1, target.a.length + 1, target.a.length - 2, target.a.length + 2])
        .filter(k => k >= 2 && k <= word.length - 2)
        .map(k => [word.slice(0, k), word.slice(k)])
        .filter(([l, r]) => LEXICON.has(l) !== LEXICON.has(r))
      if (splits.length) decoys.push(`${splits[0][0]} + ${splits[0][1]}`)
      for (const c of [...rng.shuffle(related), ...rng.shuffle(levelPool)]) { if (decoys.length >= n + 2) break; if (c !== target) decoys.push(pair(c)) }
      // The on-theme decoys stay in front so they are the ones actually offered. A reversed
      // compound ("tub + bath" for bathtub) is never offered, since it is not a compound at all.
      const clean = [...new Set(decoys)].filter(d => d.length <= 26 && d !== `${target.b} + ${target.a}`)
      const { choices, answer } = shuffled(rng, pair(target), clean, n)
      const prompt = [`Which two words make "${word}"?`]
      return riddle({
        family: 'compounds', skill: 'vocabulary: compound words', prompt, highlight: [word], choices, answer,
        spoken: `Which two words make the word ${word}? ${sayChoices(choices, c => (c.text ?? '').replace(' + ', ' plus '))}?`,
        metric, grade, tier, key: `compounds|${word}`,
      })
    }

    // Examples never come from this tier's answers, and never from the target's own word family,
    // which is where the decoys come from.
    const exPool = examplePool(level).filter(c => c !== target && !related.includes(c) && compoundWord(c) !== word && compoundWord(c) !== reversed)
    const examples = rng.sample(exPool, 3)
    const exWords = new Set(examples.map(compoundWord))
    const usable = (c: Compound) => c !== target && !exWords.has(compoundWord(c)) && compoundWord(c) !== word && compoundWord(c) !== reversed
    const shared = rng.shuffle(related).filter(usable)
    const others = rng.shuffle(levelPool).filter(c => usable(c) && !shared.includes(c))
    const decoys = [...shared, ...others].map(compoundWord)
    const { choices, answer } = shuffled(rng, word, decoys, n)
    const prompt = [...examples.map(e => `${cap(e.a)} + ${e.b} = ${compoundWord(e)}`), `${cap(target.a)} + ${target.b} = ______.`]
    return riddle({
      family: 'compounds', skill: 'vocabulary: compound words', prompt, highlight: [`${cap(target.a)} + ${target.b}`], choices, answer,
      spoken: `${examples.map(e => `${e.a} plus ${e.b} is ${compoundWord(e)}`).join('. ')}. ${target.a} plus ${target.b} is what? ${sayChoices(choices)}?`,
      metric, grade, tier, key: `compounds|${word}`,
    })
  },
}

/** Exported for the content tests: the answer pool of one grade and tier. */
export const compoundPool = (grade: Grade, tier: Tier): Compound[] => POOLS[grade as 1 | 2 | 3 | 4][tier - 1]

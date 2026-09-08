import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { FAMILIES, familyClass, classesOf, PROMPT_ONLY, isCvc, type Family } from '../data/phonics'

/** Which families a grade/tier draws from, and how hard its decoys may be. */
interface Plan {
  /** Family pool: [level] or [level, group] selectors. */
  pick: [number, ('a' | 'i' | 'o')?][]
  /** Levels the decoys come from (K never sees vowel teams; tier 1 of K never sees blends). */
  decoyLevels: number[]
  /** K tier 1 shows and offers plain CVC words only. */
  cvcOnly?: boolean
}

/**
 * The ramp. K walks short a/i -> short o/u/e -> blends; grade 1 ends on vowel teams; grade 2 ends on
 * two-syllable families; grades 3-5 leave one-syllable rhymes behind and finish on three-syllable
 * families and rhymes that are spelled differently and have to be matched by ear.
 */
const PLANS: Record<Grade, [Plan, Plan, Plan]> = {
  0: [
    { pick: [[1, 'a'], [1, 'i']], decoyLevels: [1], cvcOnly: true },
    { pick: [[1, 'o']], decoyLevels: [1, 2] },
    { pick: [[2]], decoyLevels: [1, 2] },
  ],
  1: [
    { pick: [[1, 'o'], [2]], decoyLevels: [1, 2] },
    { pick: [[2]], decoyLevels: [1, 2, 3] },
    { pick: [[3]], decoyLevels: [2, 3] },
  ],
  2: [
    { pick: [[2], [3]], decoyLevels: [2, 3] },
    { pick: [[3]], decoyLevels: [2, 3] },
    { pick: [[4]], decoyLevels: [3, 4] },
  ],
  3: [
    { pick: [[3]], decoyLevels: [3, 4] },
    { pick: [[4]], decoyLevels: [3, 4] },
    { pick: [[4], [5]], decoyLevels: [4, 5] },
  ],
  4: [
    { pick: [[4]], decoyLevels: [4, 5] },
    { pick: [[4], [5]], decoyLevels: [4, 5] },
    { pick: [[5], [6]], decoyLevels: [4, 5, 6] },
  ],
  5: [
    { pick: [[5]], decoyLevels: [4, 5, 6] },
    { pick: [[5], [6]], decoyLevels: [4, 5, 6] },
    { pick: [[6]], decoyLevels: [4, 5, 6] },
  ],
}

const MAX_LINE = 46

/** Words of a family a grade/tier may show at all. */
const usable = (f: Family, plan: Plan): string[] => f.words.filter(w => !plan.cvcOnly || isCvc(w))

/** Words that may be the answer: never a capitalised prompt word, never a not-yet-taught pattern. */
function answerable(f: Family, plan: Plan, grade: Grade, tier: Tier): string[] {
  const taught = grade >= 2 || (grade === 1 && tier === 3)
  return usable(f, plan).filter(w => !PROMPT_ONLY.has(w.toLowerCase()) && (taught || !(f.advanced ?? []).includes(w)))
}

type Fmt = { n: number; lines: (ws: string[]) => string[] }

/** The elf speaks in verse for K-2. */
const VERSE_FMTS: Fmt[] = [
  { n: 6, lines: ws => [`${cap(ws[0])}, ${ws[1]}, ${ws[2]}`, 'Please help me out this time.', `${cap(ws[3])}, ${ws[4]}, ${ws[5]}`, 'And pick a word to rhyme.'] },
  { n: 4, lines: ws => [`${cap(ws[0])}, ${ws[1]}, ${ws[2]}, ${ws[3]}`, 'All these words rhyme, you see.', 'Find one more that rhymes', 'And give it to me!'] },
  { n: 4, lines: ws => [`${cap(ws[0])} and ${ws[1]}, ${ws[2]} and ${ws[3]}`, 'Sound the same at the end.', 'Which word rhymes with them?', 'Tell me, my friend!'] },
  { n: 3, lines: ws => [`${cap(ws[0])}, ${ws[1]}, ${ws[2]}`, 'These three words rhyme, you see.', 'Which word rhymes with them?', 'Please pick it out for me!'] },
  { n: 2, lines: ws => [`${cap(ws[0])} and ${ws[1]} sound the same.`, 'Now finish off my rhyme:', 'Which word rhymes with them?', 'Pick it out this time!'] },
]
/** Plain prompts for grades 3-5. */
const PLAIN_FMTS: Fmt[] = [
  { n: 4, lines: ws => [`${cap(ws[0])}, ${ws[1]}, ${ws[2]}, ${ws[3]}.`, 'These words all rhyme.', 'Which word rhymes with them?'] },
  { n: 3, lines: ws => [`${cap(ws[0])}, ${ws[1]}, ${ws[2]}.`, 'These words all rhyme.', 'Which word rhymes with them?'] },
  { n: 2, lines: ws => [`${cap(ws[0])} and ${ws[1]} rhyme.`, 'Which word rhymes with them?'] },
]

/** The longest ending the shown rhyming words share in spelling (at least two letters). */
function sharedEnding(words: string[]): string[] | undefined {
  const lo = words.map(w => w.toLowerCase())
  const min = Math.min(...lo.map(w => w.length))
  let k = 0
  while (k < min - 1 && lo.every(w => w[w.length - 1 - k] === lo[0][lo[0].length - 1 - k])) k++
  return k >= 2 ? [lo[0].slice(lo[0].length - k)] : undefined
}

export const rhymes: Generator = {
  id: 'rhymes',
  name: 'Rhymes',
  area: 'reading',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 2, 1: 2, 2: 1.5, 3: 1, 4: 0.7, 5: 0.5 },
  make(grade, tier, rng) {
    const plan = PLANS[grade][tier - 1]
    const inPlan = (f: Family) => plan.pick.some(([lvl, group]) => f.level === lvl && (!group || f.group === group))
    // Families big enough for a prompt of at least two words plus an answer; the bigger the family,
    // the more likely it is drawn, so one tiny family cannot dominate a tier.
    const pool = FAMILIES.filter(f => inPlan(f) && usable(f, plan).length >= 3 && answerable(f, plan, grade, tier).length >= 1)
    const fam: Family = rng.weighted(pool, pool.map(f => Math.max(1, usable(f, plan).length - 2)))

    const answer = rng.pick(answerable(fam, plan, grade, tier))
    const rest = usable(fam, plan).filter(w => w !== answer)
    const bag = rng.shuffle(rest)

    const verse = grade <= 2
    const fmts = (verse ? VERSE_FMTS : PLAIN_FMTS)
      .filter(f => f.n <= bag.length)
      .filter(f => f.lines(bag.slice(0, f.n)).every(l => l.length <= MAX_LINE))
    // Longer prompts are better evidence of the pattern, so they are drawn more often.
    const fmt = fmts.length ? rng.weighted(fmts, fmts.map(f => f.n)) : { n: 2, lines: PLAIN_FMTS[2].lines }
    const shown = bag.slice(0, fmt.n)
    const prompt = fmt.lines(shown)
    // Sound-alike families (great / straight / weight) get a nudge that spelling will not help.
    if (fam.varied && !verse) prompt.push('Listen for the sound, not the spelling.')

    // Decoys: never a word from a family that rhymes with this one (by sound class, not spelling),
    // never a capitalised word, and never above the reading level of the tier.
    const cls = familyClass(fam)
    const pickedShown = new Set([answer, ...shown])
    const candidates = FAMILIES
      .filter(f => plan.decoyLevels.includes(f.level) && familyClass(f) !== cls)
      .flatMap(f => f.words)
      .filter(w => !pickedShown.has(w) && !PROMPT_ONLY.has(w.toLowerCase()) && !classesOf(w).has(cls) && !w.endsWith(fam.end) && (!plan.cvcOnly || isCvc(w)))
    const unique = [...new Set(candidates)]
    // Prefer decoys of a similar length to the answer, but never run out of them.
    const near = rng.shuffle(unique.filter(w => Math.abs(w.length - answer.length) <= 2))
    const far = rng.shuffle(unique.filter(w => Math.abs(w.length - answer.length) > 2))
    const n = choiceCount(grade)
    const { choices, answer: idx } = shuffled(rng, answer, [...near, ...far], n)

    return riddle({
      family: 'rhymes', skill: 'phonics: rhyming', prompt, verse: verse || undefined,
      // The spelling the shown words actually share, not the family's phonetic key: the -ery family
      // is spelled "merry, berry, cherry", so highlighting "ery" painted nothing at all.
      highlight: fam.varied ? undefined : sharedEnding(shown),
      choices, answer: idx,
      spoken: `${shown.join(', ')}. These words rhyme. Which word rhymes with them? ${choices.map(c => c.text).join(', ')}?`,
      // Two tiers can draw the same family level (kindergarten's -at/-it then -op), so the metric
      // also counts what else changes: whether the words are limited to simple CVC, and how far
      // above the family the decoys are allowed to come from.
      metric: fam.level * 10 + answer.length + (plan.cvcOnly ? 0 : 3) + Math.max(0, Math.max(...plan.decoyLevels) - fam.level) * 2, grade, tier,
    })
  },
}

import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, sayChoices} from '../types'
import { NOUNS, VERBS, type Noun, type Verb } from '../data/plurals'

/** Noun levels per grade/tier: 1 regular -s, 2 -es/-ies, 3 irregular, 4 -ves/-oes, 5 Latin/Greek. */
function nounLevels(grade: Grade, tier: Tier): number[] {
  const table: Partial<Record<Grade, number[][]>> = {
    1: [[1], [1, 2], [2]],
    2: [[2], [2, 3], [3]],
    3: [[3], [3, 4], [4]],
    4: [[4], [4, 5], [5]],
    5: [[4, 5], [5], [5]],
  }
  return table[grade]![tier - 1]
}

/** Verb levels (past tense) per grade/tier; null = no verbs at this grade. */
function verbLevels(grade: Grade, tier: Tier): number[] | null {
  const table: Partial<Record<Grade, number[][]>> = {
    3: [[3], [3, 4], [4]],
    4: [[4], [4, 5], [5]],
    5: [[4, 5], [5], [5]],
  }
  return table[grade]?.[tier - 1] ?? null
}

/** Common wrong plural forms: explicit ones first, then generic child errors (-s, -es, apostrophe, unchanged). */
export function nounWrongs(n: Noun): string[] {
  const s = n.singular
  const cands = [...(n.wrong ?? []), s + 's', ...(s.endsWith('e') ? [] : [s + 'es']), s + "'s", s]
  if (s.endsWith('y')) cands.push(s + 'es', s.slice(0, -1) + 'ies')
  const bad = new Set([n.plural, ...(n.alt ?? [])].map(w => w.toLowerCase()))
  const out: string[] = []
  for (const c of cands) if (!bad.has(c.toLowerCase()) && !out.includes(c)) out.push(c)
  return out
}

/** Common wrong past-tense forms: explicit ones first, then over-regularised and wrong-tense forms. */
export function verbWrongs(v: Verb): string[] {
  const b = v.base
  const cands = [...(v.wrong ?? [])]
  if (!b.endsWith('e')) cands.push(b + 'ed')
  if (b.endsWith('y')) cands.push(b.slice(0, -1) + 'ied')
  if (v.level >= 4) cands.push(v.past + 'ed')
  cands.push(b, b.endsWith('e') ? b.slice(0, -1) + 'ing' : b + 'ing', b + 's')
  const bad = new Set([v.past, ...(v.alt ?? [])].map(w => w.toLowerCase()))
  const out: string[] = []
  for (const c of cands) if (!bad.has(c.toLowerCase()) && !out.includes(c)) out.push(c)
  return out
}

const COUNTS = ['two', 'three', 'four', 'five', 'six', 'ten']
const MARKERS = ['Yesterday', 'Last night', 'Last week', 'This morning', 'A year ago', 'Long ago']

export const plurals: Generator = {
  id: 'plurals',
  name: 'Plurals and tenses',
  area: 'reading',
  grades: [1, 2, 3, 4, 5],
  weight: { 1: 1.2, 2: 1.2, 3: 1, 4: 0.8, 5: 0.7 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const vl = verbLevels(grade, tier)
    const useVerb = vl !== null && rng.bool(grade === 3 && tier === 1 ? 0.4 : 0.55)
    if (useVerb) {
      const pool = VERBS.filter(v => vl!.includes(v.level))
      const v = rng.pick(pool)
      const obj = v.obj ? ' ' + v.obj : ''
      const { choices, answer } = shuffled(rng, v.past, rng.shuffle(verbWrongs(v)), n)
      type Mode = 'today' | 'everyday' | 'name' | 'context'
      const modes: Mode[] = grade >= 5 ? ['today', 'everyday', 'name', 'context', 'context'] : grade === 4 ? ['today', 'everyday', 'name', 'context'] : ['today', 'everyday', 'today']
      const mode = rng.pick(modes)
      let prompt: string[]
      let spoken: string
      // What the red cue points at. In the "context" framing the base verb never appears, so the
      // time marker is highlighted instead - it is the word that tells you the tense.
      let hl: string[] = [v.base]
      const skill = v.level === 3 ? 'grammar: past tense (-ed)' : 'grammar: irregular past tense'
      if (mode === 'today') {
        prompt = [`Today I ${v.base}${obj}.`, `Yesterday I ___${obj}.`]
        spoken = `Today I ${v.base}${obj}. Yesterday I blank${obj}. Which word fills the blank?`
      } else if (mode === 'everyday') {
        prompt = [`Every day I ${v.base}${obj}.`, `${rng.pick(MARKERS)} I ___${obj} too.`]
        spoken = `${prompt[0]} ${prompt[1].replace('___', 'blank')} Which word fills the blank?`
      } else if (mode === 'name') {
        prompt = [`What is the past tense of "${v.base}"?`]
        spoken = `What is the past tense of ${v.base}?`
      } else {
        // Singular subjects only: "the kids wore a hat" reads as one hat between them.
        const subj = rng.pick(['I', 'my friend', 'my sister', 'the teacher'])
        const marker = rng.pick(MARKERS)
        hl = [marker]
        prompt = [`${marker}, ${subj} ___${obj}.`, 'Which word fills the blank?']
        spoken = `${prompt[0].replace('___', 'blank')} Which word fills the blank?`
      }
      return riddle({
        family: 'plurals', skill, prompt, highlight: mode === 'name' ? [] : hl, choices, answer,
        spoken: `${spoken} ${sayChoices(choices)}?`,
        metric: v.level * 10 + v.past.length + (mode === 'context' ? 3 : 0), grade, tier,
        // One riddle per verb: all four framings ask for the same past tense, and a child should
        // not be asked for "sat" twice in one climb because the sentence around it changed.
        key: `plurals|verb|${v.base}`,
      })
    }
    const levels = nounLevels(grade, tier)
    const pool = NOUNS.filter(x => levels.includes(x.level))
    const noun = rng.pick(pool)
    const { choices, answer } = shuffled(rng, noun.plural, rng.shuffle(nounWrongs(noun)), n)
    type Mode = 'one' | 'have' | 'here' | 'name'
    // "I have one crisis. My friend has six ___" is nonsense: the counting frames are for concrete
    // nouns, so the Latin and Greek plurals are only ever asked by name.
    const modes: Mode[] = noun.level >= 5 ? ['name']
      : grade >= 3 ? ['one', 'have', 'here', 'name', 'name'] : grade === 2 ? ['one', 'have', 'here', 'name'] : ['one', 'have', 'here']
    const mode = rng.pick(modes)
    const count = rng.pick(COUNTS)
    let prompt: string[]
    if (mode === 'one') prompt = [`One ${noun.singular}, ${count} ___.`]
    else if (mode === 'have') prompt = [`I have one ${noun.singular}.`, `My friend has ${count} ___.`]
    else if (mode === 'here') prompt = [`Here is one ${noun.singular}.`, `Here are ${count} ___.`]
    else prompt = [`What is the plural of "${noun.singular}"?`]
    const skill = noun.level <= 2 ? 'grammar: plural nouns' : 'grammar: irregular plurals'
    return riddle({
      family: 'plurals', skill, prompt, highlight: mode === 'name' ? [] : [noun.singular], choices, answer,
      spoken: `${prompt.join(' ').replace('___', 'blank')} ${mode === 'name' ? '' : 'Which word fills the blank? '}${sayChoices(choices)}?`,
      metric: noun.level * 10 + noun.plural.length, grade, tier,
      key: `plurals|noun|${noun.singular}`,
    })
  },
}


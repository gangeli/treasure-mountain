import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { CONTRACTIONS, type Contraction } from '../data/contractions'

function levels(grade: Grade, tier: Tier): number[] {
  const table: Partial<Record<Grade, number[][]>> = {
    2: [[1], [1, 2], [2]],
    3: [[2], [2, 3], [3]],
  }
  return table[grade]![tier - 1]
}

/** Every expansion a contraction can stand for (so decoys never collide with a valid answer). */
const expansions = (c: Contraction): string[] => [c.full, ...(c.alt ?? [])].map(s => s.toLowerCase())

/** Misplaced-apostrophe spellings of a contraction, e.g. don't -> dont, do'nt, d'ont. */
export function misspellings(short: string): string[] {
  const bare = short.replace("'", '')
  const pos = short.indexOf("'")
  const out = [bare]
  // Apostrophe one step off (do'nt), at the end (dont'), then two steps off; most plausible first.
  for (const i of [pos - 1, pos + 1, bare.length, pos - 2, pos + 2]) {
    if (i < 1 || i > bare.length || i === pos) continue
    const w = bare.slice(0, i) + "'" + bare.slice(i)
    if (!out.includes(w)) out.push(w)
  }
  return out
}

// A sentence to hide the expansion in, so some items ask for a contraction in context rather than
// as an isolated word pair. Frames are built from the expansion itself: a pronoun-led one takes a
// tail chosen by its verb, a bare negative gets a subject that agrees with its auxiliary, and the
// handful that start with a question word or "there"/"here" have a frame of their own.
const SUBJECTS = { one: ['The dog', 'My friend', 'The cat'], many: ['The dogs', 'My friends', 'The cats'] }
const PRONOUNS = new Set(['i', 'you', 'he', 'she', 'we', 'they', 'it'])
const TAIL: Record<string, string[]> = {
  am: ['ready.', 'right here.'], is: ['ready.', 'right here.'], are: ['ready.', 'right here.'],
  will: ['be there.', 'help you.'], have: ['a plan.', 'two cats.'], would: ['like a snack.', 'be happy.'],
}
/** Which subject a bare negative needs, and what follows it: "The dog did not know." */
const NEG: Record<string, ['one' | 'many' | 'any', string]> = {
  is: ['one', 'here.'], was: ['one', 'here.'], does: ['one', 'know.'], has: ['one', 'left yet.'],
  are: ['many', 'here.'], were: ['many', 'here.'], do: ['many', 'know.'], have: ['many', 'left yet.'],
  did: ['any', 'know.'], had: ['any', 'left yet.'],
  could: ['any', 'go yet.'], would: ['any', 'go yet.'], should: ['any', 'go yet.'], will: ['any', 'go yet.'],
}
/** Expansions that need their own frame, because the verb is not the last word or the sentence asks. */
const FRAMES: Record<string, string> = {
  'that is': 'That is my book.', 'there is': 'There is a bug on it.', 'here is': 'Here is your hat.',
  'what is': 'What is that noise?', 'where is': 'Where is my hat?', 'who is': 'Who is at the door?',
  'how is': 'How is your day?', 'when is': 'When is the show?',
  'there will': 'There will be cake.', 'that will': 'That will be fun.', 'who will': 'Who will go first?',
  'let us': 'Let us go now.',
}

/** A natural sentence containing `c.full`, or null when this expansion has no safe frame. */
export function sentenceFor(c: Contraction, pick: (xs: string[]) => string): string | null {
  const full = c.full.toLowerCase()
  if (FRAMES[full]) return FRAMES[full]
  const w = full.split(' ')
  if (full === 'cannot' || full === 'can not') return `${pick(SUBJECTS[pick(['one', 'many']) as 'one' | 'many'])} ${c.full} go yet.`
  if (w.length === 2 && w[1] === 'not') {
    const neg = NEG[w[0]]
    if (!neg) return null
    const num = neg[0] === 'any' ? (pick(['one', 'many']) as 'one' | 'many') : neg[0]
    return `${pick(SUBJECTS[num])} ${c.full} ${neg[1]}`
  }
  if (w.length === 2 && PRONOUNS.has(w[0]) && TAIL[w[1]]) return `${cap(c.full)} ${pick(TAIL[w[1]])}`
  return null
}

export const contractions: Generator = {
  id: 'contractions',
  name: 'Contractions',
  area: 'reading',
  grades: [2, 3],
  weight: { 2: 1, 3: 0.9 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const lv = levels(grade, tier)
    const top = Math.max(...lv)
    const pool = CONTRACTIONS.filter(c => lv.includes(c.level))
    // A mixed tier leans on its harder half, so tier 2 is not a rerun of tier 1.
    const harder = pool.filter(c => c.level === top)
    const c = rng.pick(lv.length > 1 && rng.bool(0.65) ? harder : pool)
    type Mode = 'expand' | 'contract' | 'spell' | 'sentence'
    const sentence = sentenceFor(c, xs => rng.pick(xs))
    const modes: Mode[] = tier === 1 ? ['expand', 'contract', 'sentence']
      : tier === 2 ? ['expand', 'contract', 'spell', 'sentence']
      : ['contract', 'spell', 'expand', 'sentence']
    let mode = rng.pick(modes)
    if (mode === 'spell' && misspellings(c.short).length < n - 1) mode = 'contract'
    if (mode === 'sentence' && !sentence) mode = 'contract'
    const first = c.full.split(' ')[0].toLowerCase()
    const last = c.full.split(' ').slice(-1)[0].toLowerCase()
    // Related contractions: share the first word (I'm / I'll / I've) or the second (can't / don't / isn't).
    const related = (x: Contraction) => { const w = x.full.toLowerCase().split(' '); return w[0] === first || w[w.length - 1] === last }
    // Decoys stay inside the levels this grade has met: a 2nd grader should not be choosing between
    // "they've" and "might've".
    const gradeTop = Math.max(...levels(grade, 3))
    const others = CONTRACTIONS.filter(x => x !== c && x.short.toLowerCase() !== c.short.toLowerCase() && Math.abs(x.level - c.level) <= 1 && x.level <= gradeTop)
    const ranked = [...rng.shuffle(others.filter(related)), ...rng.shuffle(others.filter(x => !related(x)))]
    // One riddle per contraction per mode: the three phrasings below are the same question, and
    // asking a child "make 'you are' shorter" right after "which contraction means 'you are'" is a repeat.
    const key = `contractions|${mode}|${c.short}`
    if (mode === 'expand') {
      const mine = new Set(expansions(c))
      const decoys = ranked.map(x => x.full).filter(f => !mine.has(f.toLowerCase()))
      const { choices, answer } = shuffled(rng, c.full, decoys, n)
      const prompt = rng.pick([[`"${c.short}" is short for ___.`], [`What two words make "${c.short}"?`], [`"${c.short}" means ___.`]])
      return riddle({
        family: 'contractions', skill: 'grammar: contractions', prompt, highlight: [c.short], choices, answer, key,
        spoken: `${c.short} is short for which words? ${choices.map(c => c.text).join(', ')}?`,
        metric: c.level * 10 + c.full.length, grade, tier,
      })
    }
    if (mode === 'contract') {
      const decoys = ranked.map(x => x.short)
      const { choices, answer } = shuffled(rng, c.short, decoys, n)
      const prompt = rng.pick([[`Which contraction means "${c.full}"?`], [`Make "${c.full}" shorter.`, 'Which word is it?'], [`"${c.full}" can be written as ___.`]])
      return riddle({
        family: 'contractions', skill: 'grammar: contractions', prompt, highlight: [c.full], choices, answer, key,
        spoken: `Which contraction means ${c.full}? ${choices.map(c => c.text).join(', ')}?`,
        metric: c.level * 10 + c.full.length + 2, grade, tier,
      })
    }
    if (mode === 'sentence') {
      const decoys = ranked.map(x => x.short)
      const { choices, answer } = shuffled(rng, c.short, decoys, n)
      return riddle({
        family: 'contractions', skill: 'grammar: contractions', prompt: [`"${sentence}"`, 'Which contraction fits the red words?'],
        highlight: [c.full], choices, answer, key,
        spoken: `${sentence} Which contraction can replace ${c.full}? ${choices.map(c => c.text).join(', ')}?`,
        metric: c.level * 10 + c.full.length + 3, grade, tier,
      })
    }
    const decoys = misspellings(c.short)
    const { choices, answer } = shuffled(rng, c.short, decoys, n)
    const prompt = rng.pick([[`Which is the right way to write "${c.full}"?`], [`"${c.full}" as a contraction.`, 'Where does the apostrophe go?'], ['Which contraction is spelled correctly?', `It means "${c.full}".`]])
    return riddle({
      family: 'contractions', skill: 'grammar: apostrophes', prompt, highlight: [c.full], choices, answer, key,
      spoken: `Which is the right way to write the contraction for ${c.full}? ${choices.map(c => c.text).join(', ')}?`,
      metric: c.level * 10 + c.full.length + 4, grade, tier,
    })
  },
}

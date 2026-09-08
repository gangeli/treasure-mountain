import type { Generator, Grade, Tier, Riddle } from '../types'
import type { Rng } from '../../engine/rng'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { SEQUENCES, CAUSE_EFFECT } from '../data/events'
import { factRiddle, pickLevel, wrap } from './thinkingUtil'

export const NAMES = ['Ann', 'Ben', 'Cy', 'Dev', 'Eli', 'Fay', 'Gus', 'Ida', 'Jo', 'Kim', 'Lou', 'Max', 'Nia', 'Oli', 'Pat', 'Raj', 'Sam', 'Tia', 'Uma', 'Vic', 'Wes', 'Zed', 'Ava', 'Leo', 'Mia', 'Noah', 'Zoe', 'Ali', 'Omar', 'Kai', 'Lena', 'Tom']

// ------------------------------------------------------------------ logic puzzles (grade 5)

/**
 * A clue about an assignment of names to items (ranks or objects). Ranks are items in order, index 0
 * being first / most.
 */
export type Clue =
  | { kind: 'is'; who: string; what: string }
  | { kind: 'not'; who: string; what: string }
  | { kind: 'before'; a: string; b: string }
  | { kind: 'rightafter'; a: string; b: string }

export interface LogicPuzzle {
  kind: 'chain' | 'race' | 'match'
  names: string[]
  items: string[]
  clues: Clue[]
  /** ['who', item] asks which name has the item; ['what', name] asks which item the name has. */
  ask: ['who', string] | ['what', string]
  lines: string[]
  question: string
  answer: string
  decoys: string[]
}

function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr]
  const out: T[][] = []
  arr.forEach((x, i) => { for (const rest of permutations([...arr.slice(0, i), ...arr.slice(i + 1)])) out.push([x, ...rest]) })
  return out
}

/** All assignments name -> item (a permutation of `items`) satisfying every clue. */
export function solveLogic(names: string[], items: string[], clues: Clue[]): Record<string, string>[] {
  const rank = (it: string) => items.indexOf(it)
  const ok = (as: Record<string, string>) => clues.every(c => {
    switch (c.kind) {
      case 'is': return as[c.who] === c.what
      case 'not': return as[c.who] !== c.what
      case 'before': return rank(as[c.a]) < rank(as[c.b])
      case 'rightafter': return rank(as[c.a]) === rank(as[c.b]) + 1
    }
  })
  return permutations(items).map(p => Object.fromEntries(names.map((nm, i) => [nm, p[i]]))).filter(ok)
}

const CHAIN_ATTRS = [
  { more: 'taller', less: 'shorter', most: 'tallest', least: 'shortest' },
  { more: 'older', less: 'younger', most: 'oldest', least: 'youngest' },
  { more: 'faster', less: 'slower', most: 'fastest', least: 'slowest' },
  { more: 'heavier', less: 'lighter', most: 'heaviest', least: 'lightest' },
]
const RACES = ['running race', 'swimming race', 'sack race', 'bike race', 'spelling contest']
const PLACES = ['first', 'second', 'third']
const MATCH_THEMES = [
  { noun: 'pet', items: ['cat', 'dog', 'fish'], intro: (ns: string[]) => `${ns[0]}, ${ns[1]} and ${ns[2]} each have one pet: a cat, a dog and a fish.`, has: 'has the', q: (n: string) => `Which pet does ${n} have?`, who: (it: string) => `Who has the ${it}?` },
  { noun: 'fruit', items: ['apple', 'pear', 'plum'], intro: (ns: string[]) => `${ns[0]}, ${ns[1]} and ${ns[2]} each eat one fruit: an apple, a pear and a plum.`, has: 'eats the', q: (n: string) => `Which fruit does ${n} eat?`, who: (it: string) => `Who eats the ${it}?` },
  { noun: 'hat', items: ['red hat', 'blue hat', 'green hat'], intro: (ns: string[]) => `${ns[0]}, ${ns[1]} and ${ns[2]} each wear a hat: one red, one blue and one green.`, has: 'wears the', q: (n: string) => `Which hat does ${n} wear?`, who: (it: string) => `Who wears the ${it}?` },
  { noun: 'instrument', items: ['drum', 'flute', 'piano'], intro: (ns: string[]) => `${ns[0]}, ${ns[1]} and ${ns[2]} each play one instrument: a drum, a flute and a piano.`, has: 'plays the', q: (n: string) => `Which instrument does ${n} play?`, who: (it: string) => `Who plays the ${it}?` },
]

/** Builds a random three-clue logic puzzle with a unique solution (brute-force checked). */
export function logicPuzzle(rng: Rng, tier: Tier): LogicPuzzle {
  const kinds: LogicPuzzle['kind'][] = tier === 1 ? ['chain', 'chain', 'race'] : tier === 2 ? ['chain', 'race', 'match'] : ['race', 'match', 'match', 'chain']
  const kind = rng.pick(kinds)
  if (kind === 'chain') {
    const count = tier === 3 ? 4 : 3
    const names = rng.sample(NAMES, count)
    const attr = rng.pick(CHAIN_ATTRS)
    const items = names.map((_, i) => String(i + 1)) // rank 1 = most
    const order = rng.shuffle(names) // order[0] is the most
    const clues: Clue[] = []
    for (let i = 0; i + 1 < order.length; i++) clues.push({ kind: 'before', a: order[i], b: order[i + 1] })
    const shown = tier === 1 ? clues : rng.shuffle(clues)
    const lines = shown.map(c => c.kind === 'before' ? (tier >= 2 && rng.bool(0.4) ? `${c.b} is ${attr.less} than ${c.a}.` : `${c.a} is ${attr.more} than ${c.b}.`) : '')
    const askKind = rng.pick(count === 3 ? ['most', 'least', 'middle'] : ['most', 'least'])
    const target = askKind === 'most' ? '1' : askKind === 'least' ? String(count) : '2'
    const question = askKind === 'most' ? `Who is the ${attr.most}?` : askKind === 'least' ? `Who is the ${attr.least}?` : 'Who is in the middle?'
    const answer = order[Number(target) - 1]
    return { kind, names, items, clues, ask: ['who', target], lines, question, answer, decoys: [...names.filter(n => n !== answer), 'cannot tell'] }
  }
  const names = rng.sample(NAMES, 3)
  const theme = rng.pick(MATCH_THEMES)
  const items = kind === 'race' ? PLACES : theme.items
  const truth = rng.shuffle(items)
  const as: Record<string, string> = Object.fromEntries(names.map((n, i) => [n, truth[i]]))
  const rank = (it: string) => items.indexOf(it)
  // Candidate clues that are true of the assignment.
  const cands: Clue[] = []
  for (const who of names) {
    cands.push({ kind: 'is', who, what: as[who] })
    for (const what of items) if (what !== as[who]) cands.push({ kind: 'not', who, what })
  }
  if (kind === 'race') for (const a of names) for (const b of names) {
    if (a === b) continue
    if (rank(as[a]) < rank(as[b])) cands.push({ kind: 'before', a, b })
    if (rank(as[a]) === rank(as[b]) + 1) cands.push({ kind: 'rightafter', a, b })
  }
  let clues: Clue[] = []
  const want = tier === 1 ? 2 : 3
  for (let tries = 0; tries < 60; tries++) {
    const pick = rng.sample(cands, Math.min(want, cands.length))
    // At most one direct "is" clue keeps it a puzzle.
    if (pick.filter(c => c.kind === 'is').length > 1) continue
    if (solveLogic(names, items, pick).length === 1) { clues = pick; break }
  }
  if (clues.length === 0) clues = names.slice(0, 2).map(who => ({ kind: 'is', who, what: as[who] }) as Clue)
  const race = rng.pick(RACES)
  const lines = clues.map(c => {
    switch (c.kind) {
      case 'is': return kind === 'race' ? `${c.who} came ${c.what}.` : `${c.who} ${theme.has} ${c.what}.`
      case 'not': return kind === 'race' ? `${c.who} did not come ${c.what}.` : `${c.who} does not have the ${c.what}.`
      case 'before': return rng.bool() ? `${c.a} finished before ${c.b}.` : `${c.b} finished after ${c.a}.`
      case 'rightafter': return `${c.a} finished right after ${c.b}.`
    }
  })
  const intro = kind === 'race' ? `${names[0]}, ${names[1]} and ${names[2]} had a ${race}.` : theme.intro(names)
  const askWho = rng.bool(0.6)
  if (askWho) {
    const target = rng.pick(items)
    const answer = names.find(n => as[n] === target)!
    const question = kind === 'race' ? (target === 'first' ? 'Who won?' : `Who came ${target}?`) : theme.who(target)
    return { kind, names, items, clues, ask: ['who', target], lines: [intro, ...lines], question, answer, decoys: [...names.filter(n => n !== answer), 'cannot tell'] }
  }
  const who = rng.pick(names)
  const answer = as[who]
  const question = kind === 'race' ? `Where did ${who} finish?` : theme.q(who)
  return { kind, names, items, clues, ask: ['what', who], lines: [intro, ...lines], question, answer, decoys: [...items.filter(i => i !== answer), 'cannot tell'] }
}

function logicRiddle(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const p = logicPuzzle(rng, tier)
  const { choices, answer } = shuffled(rng, p.answer, rng.shuffle(p.decoys), n)
  const prompt = [...p.lines.flatMap(l => wrap(l)), p.question]
  return riddle({
    family: 'events', skill: 'thinking: logical deduction', prompt, choices, answer,
    spoken: `${p.lines.join(' ')} ${p.question} ${choices.map(c => c.text).join(', ')}?`,
    metric: 50 + p.clues.length * 2 + (p.names.length - 3) * 3 + (p.kind === 'chain' ? 0 : 3), grade, tier,
    key: `events|logic|${p.kind}|${p.lines.join('/')}|${p.question}`,
  })
}

// ------------------------------------------------------------------ sequences (K-3)

function sequenceQ(grade: Grade, tier: Tier, level: Grade, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const pool = SEQUENCES.filter(s => s.level === level)
  const seq = rng.pick(pool)
  const steps = seq.steps
  type Mode = 'first' | 'next' | 'last' | 'before'
  const modes: Mode[] = level === 0 ? (steps.length >= 3 ? ['first', 'first', 'next', 'last'] : ['first', 'last']) : level === 1 ? ['first', 'next', 'next', 'last'] : ['first', 'next', 'next', 'last', 'before']
  const mode = tier === 1 && level >= 2 ? rng.pick(modes.filter(m => m !== 'before')) : rng.pick(modes)
  let answer: string, others: string[], ref = ''
  if (mode === 'first') { answer = steps[0]; others = steps.slice(1) }
  else if (mode === 'last') { answer = steps[steps.length - 1]; others = steps.slice(0, -1) }
  else if (mode === 'next') { const i = rng.int(0, steps.length - 2); ref = steps[i]; answer = steps[i + 1]; others = steps.filter((_, j) => j !== i && j !== i + 1) }
  else { const i = rng.int(1, steps.length - 1); ref = steps[i]; answer = steps[i - 1]; others = steps.filter((_, j) => j !== i && j !== i - 1) }
  // Fill up decoys from other sequences at the same level when the sequence is short.
  const fillers = rng.shuffle(pool.filter(s => s !== seq).flatMap(s => s.steps)).filter(s => !steps.includes(s))
  const decoys = [...rng.shuffle(others), ...(level === 0 && steps.length === 2 ? ['both at the same time'] : []), ...fillers]
  const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
  const topic = seq.topic
  let prompt: string[]
  if (level === 0) {
    const listed = rng.shuffle(steps).join(', ')
    prompt = mode === 'first' ? [...wrap(`${cap(topic)}: ${listed}.`), 'What do you do first?']
      : mode === 'last' ? [...wrap(`${cap(topic)}: ${listed}.`), 'What do you do last?']
      : [`First you ${ref}.`, 'What do you do next?']
  } else if (level === 1) {
    prompt = mode === 'first' ? [`Think about ${topic}.`, 'What happens first?']
      : mode === 'last' ? [`Think about ${topic}.`, 'What is the last thing you do?']
      : [...wrap(`After you ${ref}, what do you do next?`)]
  } else if (level === 2) {
    prompt = mode === 'first' ? [`The life cycle of ${topic}.`, 'What comes first?']
      : mode === 'last' ? [`The life cycle of ${topic}.`, 'What is the last stage?']
      : mode === 'next' ? [`The life cycle of ${topic}.`, `This stage: ${ref}.`, 'What comes next?']
      : [`The life cycle of ${topic}.`, `This stage: ${ref}.`, 'What comes just before it?']
  } else {
    prompt = mode === 'first' ? [`${cap(topic)}.`, 'What is the very first step?']
      : mode === 'last' ? [`${cap(topic)}.`, 'What is the last step?']
      : mode === 'next' ? [`${cap(topic)}.`, ...wrap(`You have just done this: ${ref}.`), 'What do you do next?']
      : [`${cap(topic)}.`, ...wrap(`What must you do just before this: ${ref}?`)]
  }
  const bonus = mode === 'first' ? 0 : mode === 'last' ? 1 : mode === 'next' ? 3 : 4
  return riddle({
    family: 'events', skill: level === 2 ? 'science: life cycles' : 'thinking: sequencing', prompt, choices, answer: idx,
    spoken: `${prompt.join(' ')} ${choices.map(c => c.text).join(', ')}?`,
    metric: level * 10 + steps.length + bonus, grade, tier,
    key: `events|${topic}|${mode}|${ref}`,
  })
}

/** Sequences of events: first/next/last (K), daily routines (1), life cycles (2), procedures (3), cause and effect (4), logic puzzles (5). */
export const events: Generator = {
  id: 'events',
  name: 'Sequences of events',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  make(grade, tier, rng) {
    const level = pickLevel(grade, tier, rng)
    if (level <= 3) return sequenceQ(grade, tier, level, rng)
    if (level === 4) return factRiddle('events', 'thinking: cause and effect', CAUSE_EFFECT, grade, tier, rng, 4)
    return logicRiddle(grade, tier, rng)
  },
}

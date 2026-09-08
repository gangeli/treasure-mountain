import type { Generator, Grade, Tier, Riddle } from '../types'
import type { Rng } from '../../engine/rng'
import { riddle, shuffled, choiceCount, cap, sayChoices} from '../types'
import { SEQUENCES, CAUSE_SIMPLE, CAUSE_MEDIUM, CAUSE_HARD, type Sequence } from '../data/events'
import type { Fact } from './thinkingUtil'
import { wrap } from './thinkingUtil'

/**
 * Short first names for the deduction puzzles. All <= 4 characters so a four-name intro line still
 * fits the scroll, and drawn through `pickNames` so no two names in one puzzle look alike.
 */
export const NAMES = ['Ann', 'Bea', 'Cy', 'Dev', 'Eve', 'Fay', 'Gus', 'Hal', 'Ida', 'Jo', 'Kim', 'Lou', 'Max', 'Nia', 'Oli', 'Pat', 'Raj', 'Sam', 'Tess', 'Uma', 'Vic', 'Wes', 'Zed', 'Ava', 'Leo', 'Mia', 'Noah', 'Zoe', 'Ali', 'Omar', 'Kai', 'Lena', 'Tom', 'Rosa', 'Finn', 'Ivy', 'Jack', 'Ruby', 'Hugo', 'Cleo', 'Nina', 'Dot', 'Gil', 'Pia', 'Ted', 'Val', 'Wren']

/**
 * True when two names are close enough to be mixed up while holding a puzzle in your head:
 * same initial, same last two letters (Nia/Tia rhyme), or the same length with one letter changed.
 */
export function confusableNames(a: string, b: string): boolean {
  const x = a.toLowerCase(), y = b.toLowerCase()
  if (x[0] === y[0]) return true
  if (x.slice(-2) === y.slice(-2)) return true
  if (x.length === y.length) {
    let diff = 0
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) diff++
    if (diff <= 1) return true
  }
  return false
}

function pickNames(rng: Rng, k: number): string[] {
  const distinct = (s: string[]) => s.every((a, i) => s.every((b, j) => i === j || !confusableNames(a, b)))
  for (let t = 0; t < 40; t++) {
    const s = rng.sample(NAMES, k)
    if (distinct(s)) return s
  }
  const out: string[] = []
  for (const n of rng.shuffle(NAMES)) {
    if (out.every(o => !confusableNames(o, n))) out.push(n)
    if (out.length === k) break
  }
  return out
}

// ------------------------------------------------------------------ logic puzzles (grades 4-5)

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

/** True when no clue can be dropped without losing the unique solution. */
export function minimalClues(names: string[], items: string[], clues: Clue[]): boolean {
  if (solveLogic(names, items, clues).length !== 1) return false
  return clues.every((_, i) => solveLogic(names, items, clues.filter((__, j) => j !== i)).length > 1)
}

const CHAIN_ATTRS = [
  { more: 'taller', less: 'shorter', most: 'tallest', least: 'shortest' },
  { more: 'older', less: 'younger', most: 'oldest', least: 'youngest' },
  { more: 'faster', less: 'slower', most: 'fastest', least: 'slowest' },
  { more: 'heavier', less: 'lighter', most: 'heaviest', least: 'lightest' },
]
const RACES = ['running race', 'swimming race', 'sack race', 'bike race', 'spelling bee']
const PLACES = ['first', 'second', 'third', 'fourth']

/** Short verbs keep two clues on one 46-character line. */
interface MatchTheme {
  items: string[]
  list: string
  has: (who: string, it: string) => string
  hasnot: (who: string, it: string) => string
  what: (who: string) => string
  who: (it: string) => string
}
const MATCH_THEMES: MatchTheme[] = [
  {
    items: ['cat', 'dog', 'fish', 'bird'], list: 'Each has one pet: cat, dog, fish, bird.',
    has: (w, i) => `${w} has the ${i}.`, hasnot: (w, i) => `${w} has no ${i}.`,
    what: w => `Which pet does ${w} have?`, who: i => `Who has the ${i}?`,
  },
  {
    items: ['apple', 'pear', 'plum', 'fig'], list: 'Each eats one fruit: apple, pear, plum, fig.',
    has: (w, i) => `${w} eats the ${i}.`, hasnot: (w, i) => `${w} eats no ${i}.`,
    what: w => `What does ${w} eat?`, who: i => `Who eats the ${i}?`,
  },
  {
    items: ['milk', 'juice', 'water', 'tea'], list: 'Each drinks one: milk, juice, water, tea.',
    has: (w, i) => `${w} drinks the ${i}.`, hasnot: (w, i) => `${w} drinks no ${i}.`,
    what: w => `What does ${w} drink?`, who: i => `Who drinks the ${i}?`,
  },
  {
    items: ['drum', 'flute', 'harp', 'horn'], list: 'Each plays one: drum, flute, harp, horn.',
    has: (w, i) => `${w} plays the ${i}.`, hasnot: (w, i) => `${w} plays no ${i}.`,
    what: w => `What does ${w} play?`, who: i => `Who plays the ${i}?`,
  },
]

export interface LogicSpec {
  kinds: LogicPuzzle['kind'][]
  /** Present the comparison clues out of order. */
  shuffleClues: boolean
  /** Mix "A is taller than B" with "B is shorter than A". */
  mixDirection: boolean
  minClues: number
  maxClues: number
}

/** Which shape of deduction puzzle a grade/tier gets. Grade 4 only ever sees the plain chain. */
export function logicSpec(grade: Grade, tier: Tier): LogicSpec {
  if (grade <= 4) return { kinds: ['chain'], shuffleClues: false, mixDirection: false, minClues: 3, maxClues: 3 }
  if (tier === 1) return { kinds: ['chain'], shuffleClues: true, mixDirection: true, minClues: 3, maxClues: 3 }
  if (tier === 2) return { kinds: ['chain', 'race'], shuffleClues: true, mixDirection: true, minClues: 3, maxClues: 4 }
  return { kinds: ['race', 'match'], shuffleClues: true, mixDirection: true, minClues: 4, maxClues: 6 }
}

/** Greedily packs up to two short sentences onto a line. */
export function packLines(sentences: string[], width = 46): string[] {
  const out: string[] = []
  const count: number[] = []
  for (const s of sentences) {
    const i = out.length - 1
    if (i >= 0 && count[i] < 2 && out[i].length + 1 + s.length <= width) { out[i] += ' ' + s; count[i]++ }
    else { out.push(s); count.push(1) }
  }
  return out
}

function chainPuzzle(rng: Rng, spec: LogicSpec): LogicPuzzle {
  const names = pickNames(rng, 4)
  const attr = rng.pick(CHAIN_ATTRS)
  const items = names.map((_, i) => String(i + 1)) // rank 1 = most
  const order = rng.shuffle(names) // order[0] is the most
  const clues: Clue[] = []
  for (let i = 0; i + 1 < order.length; i++) clues.push({ kind: 'before', a: order[i], b: order[i + 1] })
  const shown = spec.shuffleClues ? rng.shuffle(clues) : clues
  const lines = packLines(shown.map(c => c.kind === 'before' && spec.mixDirection && rng.bool(0.4)
    ? `${c.b} is ${attr.less} than ${c.a}.`
    : `${(c as { a: string }).a} is ${attr.more} than ${(c as { b: string }).b}.`))
  const askKind = rng.pick(['most', 'least', 'second', 'third'] as const)
  const target = askKind === 'most' ? '1' : askKind === 'second' ? '2' : askKind === 'third' ? '3' : '4'
  const question = askKind === 'most' ? `Who is the ${attr.most}?`
    : askKind === 'least' ? `Who is the ${attr.least}?`
    : askKind === 'second' ? `Who is the second ${attr.most}?`
    : `Who is the second ${attr.least}?`
  const answer = order[Number(target) - 1]
  return { kind: 'chain', names, items, clues, ask: ['who', target], lines, question, answer, decoys: names.filter(n => n !== answer) }
}

/** Builds a minimal, uniquely-solvable clue set for a bijection puzzle by adding then pruning. */
function minimalSet(rng: Rng, names: string[], items: string[], cands: Clue[]): Clue[] {
  // At most one clue may name someone's item outright, or the puzzle stops being a deduction. It
  // goes first so it actually earns its place: a page of nothing but negatives is a slog to read.
  const isClues = cands.filter(c => c.kind === 'is')
  const lead: Clue[] = isClues.length && rng.bool(0.75) ? [rng.pick(isClues)] : []
  const bag = [...lead, ...rng.shuffle(cands.filter(c => c.kind !== 'is'))]
  let cur: Clue[] = []
  for (const c of bag) {
    if (solveLogic(names, items, cur).length === 1) break
    cur.push(c)
  }
  if (solveLogic(names, items, cur).length !== 1) return []
  for (const c of rng.shuffle(cur)) {
    const rest = cur.filter(x => x !== c)
    if (solveLogic(names, items, rest).length === 1) cur = rest
  }
  return cur
}

function bijectionPuzzle(rng: Rng, spec: LogicSpec, kind: 'race' | 'match'): LogicPuzzle | null {
  const names = pickNames(rng, 4)
  const theme = rng.pick(MATCH_THEMES)
  const items = kind === 'race' ? PLACES : theme.items
  const truth = rng.shuffle(items)
  const as: Record<string, string> = Object.fromEntries(names.map((n, i) => [n, truth[i]]))
  const rank = (it: string) => items.indexOf(it)
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
  const clues = minimalSet(rng, names, items, cands)
  if (clues.length < spec.minClues || clues.length > spec.maxClues) return null

  const shown = spec.shuffleClues ? rng.shuffle(clues) : clues
  const sentences = shown.map(c => {
    switch (c.kind) {
      case 'is': return kind === 'race' ? `${c.who} came ${c.what}.` : theme.has(c.who, c.what)
      case 'not': return kind === 'race' ? `${c.who} was not ${c.what}.` : theme.hasnot(c.who, c.what)
      case 'before': return spec.mixDirection && rng.bool(0.4) ? `${c.b} lost to ${c.a}.` : `${c.a} beat ${c.b}.`
      case 'rightafter': return `${c.a} came just after ${c.b}.`
    }
  })
  const intro = kind === 'race'
    ? [`The ${rng.pick(RACES)}: ${names.join(', ')}.`]
    : [`Four friends: ${names.join(', ')}.`, theme.list]
  const lines = [...intro, ...packLines(sentences)]

  // Never ask something a clue states outright, and never ask something the clues about that one
  // name (or that one place/object) already settle by themselves -- otherwise the puzzle collapses
  // into "cross off three boxes in a row" and the rest of the clue set is decoration.
  const stated = clues.filter(c => c.kind === 'is') as { who: string; what: string }[]
  const mentions = (c: Clue, side: 'who' | 'what', target: string) =>
    c.kind === 'is' || c.kind === 'not'
      ? (side === 'what' ? c.who === target : c.what === target)
      : side === 'what' && (c.a === target || c.b === target)
  const needsWholeSet = (side: 'who' | 'what', target: string) => {
    const local = clues.filter(c => mentions(c, side, target))
    const cell = (sol: Record<string, string>) => side === 'who' ? names.find(n => sol[n] === target)! : sol[target]
    return new Set(solveLogic(names, items, local).map(cell)).size > 1
  }
  const askableItems = items.filter(it => !stated.some(c => c.what === it) && needsWholeSet('who', it))
  const askableNames = names.filter(nm => !stated.some(c => c.who === nm) && needsWholeSet('what', nm))
  if (askableItems.length === 0 && askableNames.length === 0) return null
  const askWho = askableNames.length === 0 || (askableItems.length > 0 && rng.bool(0.6))
  if (askWho) {
    const target = rng.pick(askableItems)
    const answer = names.find(n => as[n] === target)!
    const question = kind === 'race' ? `Who came ${target}?` : theme.who(target)
    return { kind, names, items, clues, ask: ['who', target], lines, question, answer, decoys: names.filter(n => n !== answer) }
  }
  const who = rng.pick(askableNames)
  const answer = as[who]
  const question = kind === 'race' ? `Where did ${who} finish?` : theme.what(who)
  return { kind, names, items, clues, ask: ['what', who], lines, question, answer, decoys: items.filter(i => i !== answer) }
}

/**
 * Builds a random logic puzzle whose clue set is minimal (no clue follows from the others) and whose
 * solution is unique -- both brute-force checked here, so no decoy can be a defensible answer.
 */
export function logicPuzzle(rng: Rng, spec: LogicSpec): LogicPuzzle {
  const fits = (p: LogicPuzzle) => p.lines.length + 1 <= 6 && p.lines.every(l => l.length <= 46) && p.question.length <= 46
  for (let tries = 0; tries < 60; tries++) {
    const kind = rng.pick(spec.kinds)
    const p = kind === 'chain' ? chainPuzzle(rng, spec) : bijectionPuzzle(rng, spec, kind)
    if (p && fits(p) && minimalClues(p.names, p.items, p.clues)) return p
  }
  return chainPuzzle(rng, spec) // 3 links over 4 names: always minimal, unique and short
}

const KIND_BONUS = { chain: 0, race: 3, match: 5 }

function logicRiddle(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const n = choiceCount(grade)
  const spec = logicSpec(grade, tier)
  const p = logicPuzzle(rng, spec)
  const { choices, answer } = shuffled(rng, p.answer, rng.shuffle(p.decoys), n)
  const nots = p.clues.filter(c => c.kind === 'not').length
  return riddle({
    family: 'events', skill: 'thinking: logical deduction', prompt: [...p.lines, p.question], choices, answer,
    spoken: `${p.lines.join(' ')} ${p.question} ${sayChoices(choices)}?`,
    metric: 40 + p.names.length * 2 + p.clues.length * 2 + KIND_BONUS[p.kind] + (spec.shuffleClues ? 2 : 0) + (spec.mixDirection ? 1 : 0) + nots,
    grade, tier,
    key: `events|logic|${p.kind}|${p.lines.join('/')}|${p.question}`,
  })
}

// ------------------------------------------------------------------ sequences (K-3)

export type SeqMode = 'first' | 'last' | 'next' | 'before'

/** The canonical order plus every other order the data says an adult would also accept. */
export const acceptedOrders = (s: Sequence): string[][] => [s.steps, ...(s.alts ?? [])]

/**
 * Every step that could defensibly answer `mode` (relative to `ref`) under *some* accepted order.
 * A question is only asked when this returns exactly one step -- which is also what guarantees that
 * no decoy is a defensible alternative answer.
 */
export function acceptedAnswers(s: Sequence, mode: SeqMode, ref: string): string[] {
  const out = new Set<string>()
  for (const order of acceptedOrders(s)) {
    if (mode === 'first' || mode === 'last') {
      if (s.cyclic) return [] // a loop has no first or last stage
      out.add(mode === 'first' ? order[0] : order[order.length - 1])
      continue
    }
    const i = order.indexOf(ref)
    if (i < 0) return []
    if (mode === 'next') { if (i === order.length - 1) return []; out.add(order[i + 1]) }
    else { if (i === 0) return []; out.add(order[i - 1]) }
  }
  return [...out]
}

/** K scenarios come in two sizes: the 3-step ones are listed out, the 4-step ones carry tier 3. */
type Band = 'short' | 'long' | 'any'
interface SeqQ { seq: Sequence; mode: SeqMode; ref: string; answer: string }

const inBand = (s: Sequence, band: Band) => band === 'any' || (band === 'short' ? s.steps.length === 3 : s.steps.length >= 4)

const candCache = new Map<string, SeqQ[]>()
/** Questions of this shape that have exactly one defensible answer and enough same-scenario decoys. */
export function seqCandidates(level: Grade, mode: SeqMode, band: Band, decoys: number): SeqQ[] {
  const cacheKey = `${level}|${mode}|${band}|${decoys}`
  const hit = candCache.get(cacheKey)
  if (hit) return hit
  const out: SeqQ[] = []
  for (const seq of SEQUENCES) {
    if (seq.level !== level || !inBand(seq, band)) continue
    const refs = mode === 'first' || mode === 'last' ? [''] : seq.steps
    for (const ref of refs) {
      // K only ever asks "First you X. What next?", so the reference step must be the first one.
      if (level === 0 && mode === 'next' && ref !== seq.steps[0]) continue
      const accepted = acceptedAnswers(seq, mode, ref)
      if (accepted.length !== 1) continue
      const answer = accepted[0]
      if (seq.steps.filter(x => x !== answer && x !== ref).length < decoys) continue
      out.push({ seq, mode, ref, answer })
    }
  }
  candCache.set(cacheKey, out)
  return out
}

/** Each tier of each level gets its own question shape, so no item is reused across tiers. */
export function seqPlan(level: Grade, tier: Tier): { modes: SeqMode[]; band: Band } {
  if (level === 0) {
    return tier === 1 ? { modes: ['first'], band: 'short' }
      : tier === 2 ? { modes: ['last'], band: 'short' }
      : { modes: ['first', 'last', 'next'], band: 'long' }
  }
  return tier === 1 ? { modes: ['first', 'last'], band: 'any' }
    : tier === 2 ? { modes: ['next'], band: 'any' }
    : { modes: ['before'], band: 'any' }
}

/** Lists the steps in an order that is not one of the accepted ones, so the list is never a hint. */
function listing(seq: Sequence, rng: Rng): string {
  const accepted = new Set(acceptedOrders(seq).map(o => o.join('>')))
  let order = rng.shuffle(seq.steps)
  for (let i = 0; i < 8 && accepted.has(order.join('>')); i++) order = rng.shuffle(seq.steps)
  return order.join(', ')
}

const MODE_BONUS: Record<SeqMode, number> = { first: 0, last: 1, next: 3, before: 4 }

function seqPrompt(q: SeqQ, level: Grade, rng: Rng): string[] {
  const { seq, mode, ref } = q
  if (level === 0) {
    if (mode === 'next') return [`First you ${ref}.`, 'What do you do next?']
    return [...wrap(`${cap(seq.topic)}: ${listing(seq, rng)}.`), mode === 'first' ? 'What do you do first?' : 'What do you do last?']
  }
  if (level === 1) {
    const head = `Think about ${seq.topic}.`
    if (mode === 'first') return [head, 'What happens first?']
    if (mode === 'last') return [head, 'What is the last thing you do?']
    if (mode === 'next') return [head, ...wrap(`After you ${ref}, what do you do next?`)]
    return [head, ...wrap(`What do you do just before you ${ref}?`)]
  }
  if (level === 2) {
    const title = seq.title ?? `The life cycle of ${seq.topic}.`
    if (mode === 'first') return [title, 'What comes first?']
    if (mode === 'last') return [title, 'What is the last stage?']
    if (mode === 'next') return [title, `This stage: ${ref}.`, 'What comes next?']
    return [title, `This stage: ${ref}.`, 'What comes just before it?']
  }
  const head = seq.title ?? `${cap(seq.topic)}.`
  if (mode === 'first') return [head, 'What is the very first step?']
  if (mode === 'last') return [head, 'What is the last step?']
  if (mode === 'next') return [head, 'You have just done this:', `${ref}.`, 'What do you do next?']
  return [head, 'You are about to do this:', `${ref}.`, 'What did you do just before?']
}

function sequenceQ(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const level = grade as Grade
  const n = choiceCount(grade)
  const plan = seqPlan(level, tier)
  const pool = plan.modes.flatMap(m => seqCandidates(level, m, plan.band, n - 1))
  if (pool.length === 0) throw new Error(`events: no sequence questions for level ${level} tier ${tier}`)
  // A question whose own prompt says the answer is not a question. "The life cycle of an oak tree.
  // What is the last stage?" has the answer, "oak tree", in its first line, and a child can match
  // the words without knowing anything about oak trees.
  const givesItAway = (c: SeqQ): boolean => {
    const text = seqPrompt(c, level, rng).join(' ').toLowerCase()
    return new RegExp(`\\b${c.answer.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(text)
  }
  // Only from grade 2 up: below that the prompt is "First you <the step before>", which cannot name
  // the answer, and the handful of questions the check would drop there are the ones that repeat a
  // noun ("fill the tub" then "get in the tub"), which is not a giveaway and is most of the variety
  // kindergarten's tier 3 has.
  const usable = level >= 2 ? pool.filter(c => !givesItAway(c)) : pool
  const q = rng.pick(usable.length ? usable : pool)
  // Every decoy is another step of the same scenario, so none of them is eliminable on topic alone.
  const decoys = rng.shuffle(q.seq.steps.filter(x => x !== q.answer && x !== q.ref))
  const { choices, answer } = shuffled(rng, q.answer, decoys, n)
  const prompt = seqPrompt(q, level, rng)
  const skill = q.seq.skill ?? (level === 2 ? 'science: life cycles' : 'thinking: sequencing')
  return riddle({
    family: 'events', skill, prompt, choices, answer,
    spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`,
    metric: level * 10 + q.seq.steps.length + MODE_BONUS[q.mode], grade, tier,
    key: `events|seq|${level}|${q.seq.topic}|${q.mode}|${q.ref}`,
  })
}

// ------------------------------------------------------------------ cause and effect (grade 4)

const CAUSE_LEADS = ['Think it through!', 'Here is a puzzle for you.', 'Use what you know.']

function causeRiddle(grade: Grade, tier: Tier, rng: Rng): Riddle {
  const band: Fact[] = tier === 1 ? CAUSE_SIMPLE : tier === 2 ? CAUSE_MEDIUM : CAUSE_HARD
  const f = rng.pick(band)
  const n = choiceCount(grade)
  const { choices, answer } = shuffled(rng, f.a, rng.shuffle(f.d), n)
  const body = wrap(f.q)
  const prompt = body.length === 1 && rng.bool(0.35) ? [rng.pick(CAUSE_LEADS), ...body] : body
  return riddle({
    family: 'events', skill: 'thinking: cause and effect', prompt, choices, answer,
    spoken: `${f.q} ${sayChoices(choices)}?`,
    metric: 40 + (tier - 1) * 3 + Math.min(3, f.q.length / 30), grade, tier,
    key: `events|cause|${f.q}`,
  })
}

/**
 * Sequences of events: first/last (K), daily routines (1), life cycles (2), procedures (3),
 * cause and effect (4), logical deduction (5). Each grade owns one skill and each tier one question
 * shape, so nothing an easier tier asks can come back at a harder one.
 */
export const events: Generator = {
  id: 'events',
  name: 'Sequences of events',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  make(grade, tier, rng) {
    if (grade === 5) return logicRiddle(grade, tier, rng)
    if (grade === 4) return tier === 3 && rng.bool(0.35) ? logicRiddle(grade, tier, rng) : causeRiddle(grade, tier, rng)
    return sequenceQ(grade, tier, rng)
  },
}

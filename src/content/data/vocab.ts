import { OPPOSITES, EXTRA_ANTONYMS } from './opposites'
import { SYNONYMS, EXTRA_SYNONYMS } from './synonyms'

const norm = (w: string): string => w.toLowerCase().trim()

const ANT = new Map<string, Set<string>>()
const SYN = new Map<string, Set<string>>()
const add = (m: Map<string, Set<string>>, k: string, v: string) => { let s = m.get(k); if (!s) { s = new Set(); m.set(k, s) } s.add(v) }
const link = (m: Map<string, Set<string>>, x: string, y: string) => { add(m, norm(x), y); add(m, norm(y), x) }
for (const p of OPPOSITES) link(ANT, p.a, p.b)
for (const [x, y] of EXTRA_ANTONYMS) link(ANT, x, y)
for (const g of SYNONYMS) for (const x of g.words) for (const y of g.words) if (x !== y) add(SYN, norm(x), y)
for (const [x, y] of EXTRA_SYNONYMS) link(SYN, x, y)

/** Direct antonyms of `w` (riddle pairs plus the extra links that only block decoys). */
export function antonymsOf(w: string): string[] { return [...(ANT.get(norm(w)) ?? [])] }

/** Every word listed as meaning about the same as `w` (groups plus the extra links). */
export function synonymsOf(w: string): string[] { return [...(SYN.get(norm(w)) ?? [])] }

const RELATED = new Map<string, Set<string>>()

/**
 * Words that mean the same as, or the opposite of, `w` within two hops through the synonym and
 * antonym data (synonyms of antonyms, antonyms of synonyms...). None of these is a safe decoy
 * for a synonym or antonym riddle about `w`.
 */
export function relatedTo(w: string): Set<string> {
  const cached = RELATED.get(norm(w))
  if (cached) return cached
  const seen = new Set<string>([norm(w)])
  let frontier = [norm(w)]
  for (let hop = 0; hop < 2; hop++) {
    const next: string[] = []
    for (const x of frontier) for (const y of [...synonymsOf(x), ...antonymsOf(x)]) {
      const k = norm(y)
      if (!seen.has(k)) { seen.add(k); next.push(k) }
    }
    frontier = next
  }
  RELATED.set(norm(w), seen)
  return seen
}

const stem = (w: string): string => norm(w).replace(/^(un|in|im|dis|non|ir|il|mis)/, '').replace(/(ness|less|ful|ly|ing|est|er|ed|es|s)$/, '')

/** True when two words share a root (happy/unhappy, care/careful, quick/quickly). */
export function sameRoot(a: string, b: string): boolean {
  const x = norm(a), y = norm(b)
  if (x === y) return true
  if (x.length >= 3 && y.length >= 3 && (x.includes(y) || y.includes(x))) return true
  const sx = stem(x), sy = stem(y)
  if (sx.length >= 3 && sy.length >= 3 && (sx === sy || sx.startsWith(sy) || sy.startsWith(sx))) return true
  return false
}

/**
 * Words with more than one everyday meaning, where the other meaning would make a second choice
 * defensible ("light" = bright or not heavy; "hard" = firm or difficult; "kind" = nice or a type).
 *
 * They may be *asked about* only when the pair or group they come from glosses them (see `gloss` in
 * the data files), and they are never offered as a decoy: a decoy carries no sense pin, so a child
 * reading the other sense would have two right answers.
 */
export const AMBIGUOUS: ReadonlySet<string> = new Set([
  'light', 'hard', 'tough', 'short', 'right', 'left', 'back', 'kind', 'mean', 'fine', 'fair',
  'cool', 'sharp', 'dull', 'rough', 'plain', 'last', 'present', 'close', 'complete', 'question',
  'mad', 'bright', 'order', 'lie', 'gain', 'desert', 'certain', 'fall', 'rock', 'work', 'part',
  'save', 'trip', 'sink', 'wake', 'watch', 'cross', 'odd', 'minute', 'second', 'well', 'train',
  'wave', 'spring', 'park', 'match', 'bat', 'block', 'tie', 'stick', 'point', 'change', 'record',
])

/** True when `w` needs its sense pinned before it can be asked, and may never be a decoy. */
export const isAmbiguous = (w: string): boolean => AMBIGUOUS.has(norm(w))

/**
 * True when two words are close enough that offering both as decoys in one riddle would let a
 * child cancel them out (or make one of them defensible): same/opposite meaning, or same root.
 */
export function tooClose(a: string, b: string): boolean {
  const x = norm(a), y = norm(b)
  if (x === y) return true
  if (sameRoot(x, y)) return true
  return synonymsOf(x).some(w => norm(w) === y) || antonymsOf(x).some(w => norm(w) === y)
}

const NEG_PREFIXES = ['un', 'in', 'im', 'ir', 'il', 'dis', 'non', 'mis']
const affixRoot = (w: string): string => norm(w).replace(/ly$/, '').replace(/(ful|less)$/, '')

/** True when `b` is `a` plus (or minus) a negative prefix, or the careful/careless -ful/-less swap. */
export function isNegationPair(a: string, b: string): boolean {
  const x = norm(a), y = norm(b)
  const [shortW, longW] = x.length <= y.length ? [x, y] : [y, x]
  for (const p of NEG_PREFIXES) if (longW.startsWith(p) && longW.slice(p.length) === shortW) return true
  return affixRoot(x) !== x && affixRoot(y) !== y && affixRoot(x) === affixRoot(y)
}

/** Every word that is itself a negative-affix form of its partner, e.g. "dishonest", "careless". */
export const AFFIX_WORDS: ReadonlySet<string> = new Set(
  OPPOSITES.filter(p => isNegationPair(p.a, p.b))
    .flatMap(p => (p.a.length > p.b.length ? [p.a] : [p.b]))
    .map(norm),
)

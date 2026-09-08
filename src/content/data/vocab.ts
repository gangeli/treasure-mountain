import { OPPOSITES } from './opposites'
import { SYNONYMS } from './synonyms'

const norm = (w: string): string => w.toLowerCase().trim()

const ANT = new Map<string, Set<string>>()
const SYN = new Map<string, Set<string>>()
const add = (m: Map<string, Set<string>>, k: string, v: string) => { let s = m.get(k); if (!s) { s = new Set(); m.set(k, s) } s.add(v) }
for (const p of OPPOSITES) { add(ANT, norm(p.a), p.b); add(ANT, norm(p.b), p.a) }
for (const g of SYNONYMS) for (const x of g.words) for (const y of g.words) if (x !== y) add(SYN, norm(x), y)

/** Direct antonyms of `w` listed in OPPOSITES (either direction). */
export function antonymsOf(w: string): string[] { return [...(ANT.get(norm(w)) ?? [])] }

/** Every other word in a synonym group that contains `w`. */
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

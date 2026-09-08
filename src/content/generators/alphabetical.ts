import type { Generator } from '../types'
import { riddle, shuffled, choiceCount } from '../types'
import { WORDS } from '../data/wordlist'
import type { Rng } from '../../engine/rng'

const commonPrefix = (a: string, b: string): number => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i }
const maxShared = (ws: string[]): number => { let m = 0; for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) m = Math.max(m, commonPrefix(ws[i], ws[j])); return m }
const minGap = (ws: string[]): number => { let g = 26; for (let i = 0; i < ws.length; i++) for (let j = i + 1; j < ws.length; j++) g = Math.min(g, Math.abs(ws[i].charCodeAt(0) - ws[j].charCodeAt(0))); return g }

/** Picks `k` words that share exactly the first `depth` letters (and differ at letter depth+1 where possible). */
function drawGroup(rng: Rng, k: number, depth: number, extraPair: boolean): string[] | null {
  const groups = new Map<string, string[]>()
  for (const w of WORDS) { const p = w.slice(0, depth); if (!groups.has(p)) groups.set(p, []); groups.get(p)!.push(w) }
  const usable = [...groups.values()].filter(g => g.length >= k && new Set(g.map(w => w[depth] ?? '')).size >= (extraPair ? k - 1 : k))
  if (!usable.length) return null
  const g = rng.pick(usable)
  const shuffledG = rng.shuffle(g)
  const out: string[] = []
  const seen = new Set<string>()
  // First words with distinct next letters, then (if extraPair) one that shares the next letter too.
  for (const w of shuffledG) { const c = w[depth] ?? ''; if (!seen.has(c)) { seen.add(c); out.push(w); if (out.length >= (extraPair ? k - 1 : k)) break } }
  if (extraPair) {
    const more = shuffledG.find(w => !out.includes(w) && seen.has(w[depth] ?? '') && !out.some(o => o === w))
    if (more) out.push(more)
  }
  while (out.length < k) { const w = shuffledG.find(x => !out.includes(x)); if (!w) break; out.push(w) }
  return out.length >= k ? out.slice(0, k) : null
}

/** Grade-2 draw: distinct first letters, at least `gap` apart in the alphabet. */
function drawSpread(rng: Rng, k: number, gap: number): string[] {
  for (let t = 0; t < 40; t++) {
    const ws = rng.sample(WORDS, k)
    if (new Set(ws.map(w => w[0])).size === k && minGap(ws) >= gap) return ws
  }
  // Deterministic fallback: walk letters far apart.
  const byLetter = new Map<string, string[]>()
  for (const w of WORDS) { if (!byLetter.has(w[0])) byLetter.set(w[0], []); byLetter.get(w[0])!.push(w) }
  const letters = rng.shuffle([...byLetter.keys()]).sort()
  const step = Math.max(1, Math.floor(letters.length / k))
  return Array.from({ length: k }, (_, i) => rng.pick(byLetter.get(letters[(i * step) % letters.length])!))
}

export const alphabetical: Generator = {
  id: 'alphabetical',
  name: 'ABC order',
  area: 'reading',
  grades: [2, 3, 4],
  weight: { 2: 1, 3: 1, 4: 0.8 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const last = tier >= 2 && rng.bool(0.4)
    // How far into the words a child has to read, by grade and tier. Grade 2 starts with first
    // letters far apart and ends on words that share one; grade 3 lives on the second letter and
    // ends on the third; grade 4 starts on the third. Every tier is a step past the one below it,
    // so tier 3 is never the same task as tier 1 with different words.
    let words: string[] | null = null
    if (grade === 2) {
      if (tier === 1) words = drawSpread(rng, n, 4)
      else if (tier === 2) words = rng.bool(0.4) ? drawGroup(rng, n, 1, false) : drawSpread(rng, n, 1)
      else words = rng.bool(0.8) ? drawGroup(rng, n, 1, false) : drawSpread(rng, n, 1)
    } else if (grade === 3) {
      if (tier === 1) words = drawGroup(rng, n, 1, false)
      else if (tier === 2) words = drawGroup(rng, n, 1, rng.bool(0.4))
      else words = rng.bool(0.5) ? drawGroup(rng, n, 2, false) : drawGroup(rng, n, 1, true)
    } else {
      if (tier === 1) words = drawGroup(rng, n, 2, false)
      else if (tier === 2) words = drawGroup(rng, n, 2, rng.bool(0.4))
      else words = rng.bool(0.5) ? drawGroup(rng, n, 3, false) : drawGroup(rng, n, 2, true)
    }
    words = words ?? drawGroup(rng, n, 2, false) ?? drawGroup(rng, n, 1, false) ?? drawSpread(rng, n, 1)
    const sorted = [...words].sort()
    const answer = last ? sorted[sorted.length - 1] : sorted[0]
    const { choices, answer: idx } = shuffled(rng, answer, words.filter(w => w !== answer), n)
    const which = last ? 'LAST' : 'FIRST'
    const prompt = rng.pick([
      [`Which word comes ${which} in ABC order?`],
      ['Put these words in ABC order.', `Which one comes ${which.toLowerCase()}?`],
      ['In a dictionary, which of these', `words would you find ${which.toLowerCase()}?`],
    ])
    const shared = maxShared(words)
    const gapTerm = shared === 0 ? 5 - Math.min(5, minGap(words)) : 5
    return riddle({
      family: 'alphabetical', skill: 'reading: alphabetical order', prompt, choices, answer: idx,
      // Only one of the three phrasings shouted FIRST/LAST; now the word that flips the answer is
      // red in all of them.
      highlight: [which, which.toLowerCase()],
      spoken: `Which word comes ${which.toLowerCase()} in alphabetical order? ${choices.map(c => c.text).join(', ')}?`,
      metric: shared * 10 + gapTerm + (last ? 3 : 0), grade, tier,
      key: `alphabetical|${which}|${sorted.join(',')}`,
    })
  },
}

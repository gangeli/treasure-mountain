/** Wraps a sentence into lines of at most `max` characters at word boundaries. */
export function wrap(text: string, max = 46): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    if (!cur) cur = w
    else if (cur.length + 1 + w.length <= max) cur += ' ' + w
    else { lines.push(cur); cur = w }
  }
  if (cur) lines.push(cur)
  // Avoid an orphan: a last line of one short word reads as a mistake on the scroll, so pull a word
  // down from the line above it, which keeps the same number of lines.
  const last = lines.length - 1
  if (lines.length >= 2 && !lines[last].includes(' ') && lines[last].length <= 8) {
    const above = lines[last - 1].split(' ')
    if (above.length >= 3) {
      lines[last] = above.pop()! + ' ' + lines[last]
      lines[last - 1] = above.join(' ')
    }
  }
  return lines
}

/** Fits an optional lead-in line plus a wrapped sentence into <= 6 lines. */
export function lines(...parts: (string | string[])[]): string[] {
  return parts.flatMap(p => (typeof p === 'string' ? wrap(p) : p))
}

/** Replaces the blank with the word (for spoken text or keys). */
export const fill = (sentence: string, word: string): string => sentence.replace('___', word)
export const spokenBlank = (sentence: string): string => sentence.replace('___', 'blank')

/**
 * The slice of an ordered pool a tier draws from. Word lists in this game are authored from the
 * words a child meets first to the ones they meet last, so tier 1 takes the front of the list and
 * tier 3 the back, with an overlap in the middle. Two tiers on the same level then still ask
 * different questions.
 */
export function tierWindow<T>(pool: T[], tier: 1 | 2 | 3): T[] {
  const m = pool.length
  if (m < 6) return pool
  const from = tier === 1 ? 0 : tier === 2 ? Math.floor(m * 0.3) : Math.floor(m * 0.55)
  const to = tier === 1 ? Math.ceil(m * 0.6) : tier === 2 ? Math.ceil(m * 0.85) : m
  return pool.slice(from, to)
}

/** 0 for the first item of an ordered pool, 1 for the last: how far in an item sits. */
export function rankIn<T>(pool: T[], item: T): number {
  const i = pool.indexOf(item)
  return pool.length > 1 && i >= 0 ? i / (pool.length - 1) : 0
}

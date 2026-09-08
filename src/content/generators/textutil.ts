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
  return lines
}

/** Fits an optional lead-in line plus a wrapped sentence into <= 6 lines. */
export function lines(...parts: (string | string[])[]): string[] {
  return parts.flatMap(p => (typeof p === 'string' ? wrap(p) : p))
}

/** Replaces the blank with the word (for spoken text or keys). */
export const fill = (sentence: string, word: string): string => sentence.replace('___', word)
export const spokenBlank = (sentence: string): string => sentence.replace('___', 'blank')

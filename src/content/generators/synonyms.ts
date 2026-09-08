import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { SYNONYMS, type SynGroup } from '../data/synonyms'
import { OPPOSITES } from '../data/opposites'
import { relatedTo, sameRoot } from '../data/vocab'

function levelsFor(grade: Grade, tier: Tier): number[] {
  const table: Partial<Record<Grade, number[][]>> = {
    1: [[1], [1], [1, 2]],
    2: [[1, 2], [2], [2]],
    3: [[2, 3], [3], [3]],
    4: [[3], [3, 4], [4]],
    5: [[4], [4], [4]],
  }
  return (table[grade] ?? [[4], [4], [4]])[tier - 1]
}

const fits = (lines: string[]): boolean => lines.every(l => l.length <= 46)

/** Synonyms: big/large (1), happy/glad (2), shades of meaning (3), tier-2/3 vocabulary (4-5). */
export const synonyms: Generator = {
  id: 'synonyms',
  name: 'Synonyms',
  area: 'reading',
  grades: [1, 2, 3, 4, 5],
  weight: { 1: 1, 2: 1.2, 3: 1.2, 4: 1.2, 5: 1.2 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const levels = levelsFor(grade, tier)
    const pool = SYNONYMS.filter(g => levels.includes(g.level))
    const pairText = (a: string, b: string) => `${a} / ${b}`
    const pairMode = grade >= 4 && (tier === 3 ? rng.bool(0.4) : tier === 2 && rng.bool(0.2))

    if (pairMode) {
      const group = rng.pick(pool.filter(g => g.words.some((x, i) => g.words.some((y, j) => i < j && pairText(x, y).length <= 26))))
      const pairs = group.words.flatMap((x, i) => group.words.slice(i + 1).map(y => pairText(x, y))).filter(t => t.length <= 26)
      const answerT = rng.pick(pairs)
      const related = new Set(group.words.flatMap(w => [...relatedTo(w)]))
      // Decoy 1: an antonym pair. Decoys 2-3: unrelated word pairs of the same part of speech.
      const decoys: string[] = []
      const ants = rng.shuffle(OPPOSITES.filter(p => p.level >= 3 && p.pos === group.pos && !related.has(p.a) && !related.has(p.b) && pairText(p.a, p.b).length <= 26))
      if (ants.length) decoys.push(pairText(ants[0].a, ants[0].b))
      const words = rng.shuffle(SYNONYMS.filter(g => g !== group && g.level >= 3 && g.pos === group.pos).flatMap(g => g.words)).filter(w => !related.has(w.toLowerCase()))
      for (let i = 0; i + 1 < words.length && decoys.length < n + 2; i += 2) {
        const x = words[i], y = words[i + 1]
        if (relatedTo(x).has(y.toLowerCase()) || sameRoot(x, y)) continue
        decoys.push(pairText(x, y))
      }
      const { choices, answer } = shuffled(rng, answerT, rng.shuffle(decoys).filter(d => d.length <= 26), n)
      const prompt = ['Which pair of words are synonyms?', '(Words that mean almost the same.)']
      return riddle({
        family: 'synonyms', skill: 'vocabulary: synonyms', prompt, choices, answer,
        spoken: `Which pair of words are synonyms, words that mean almost the same? ${choices.map(c => (c.text ?? '').replace(' / ', ' and ')).join(', ')}?`,
        metric: group.level * 10 + 8 + answerT.length / 2, grade, tier,
      })
    }

    const group: SynGroup = rng.pick(pool)
    const [word, answerW] = rng.sample(group.words, 2)
    const banned = new Set([...relatedTo(word), ...relatedTo(answerW)])
    const candidates = rng.shuffle(SYNONYMS.filter(g => g !== group && g.pos === group.pos && Math.abs(g.level - group.level) <= 1).flatMap(g => g.words))
      .filter(w => !banned.has(w.toLowerCase()) && !sameRoot(w, word) && !sameRoot(w, answerW))
    const decoys = [...candidates].sort((x, y) => Math.abs(x.length - answerW.length) - Math.abs(y.length - answerW.length)).slice(0, 8)
    const { choices, answer } = shuffled(rng, answerW, rng.shuffle(decoys), n)
    const list = choices.map(c => c.text).join(', ')

    let prompt: string[]
    let verse = false
    if (grade <= 2 && rng.bool(0.5)) {
      verse = true
      prompt = rng.bool()
        ? [`Another word for ${word}:`, 'Do you know one? Think it through.', `Which word here means ${word}?`, "Pick it and I'll cheer for you!"]
        : [`${cap(word)}, ${word}, ${word}!`, 'Which word means the same?', 'Find it here and you will win', 'This little word game!']
      if (!fits(prompt)) prompt = [`Another word for ${word} is ___.`]
    } else {
      const options = [
        [`Another word for ${word} is ___.`],
        [`Which word means almost the same as ${word}?`],
        [`Which word means about the same as ${word}?`],
        ...(grade >= 4 ? [[`Which word is a synonym of ${word}?`]] : []),
      ].filter(fits)
      prompt = rng.pick(options)
    }
    return riddle({
      family: 'synonyms', skill: 'vocabulary: synonyms', prompt, verse, highlight: [word], choices, answer,
      spoken: `Which word means almost the same as ${word}? ${list}?`,
      metric: group.level * 10 + answerW.length, grade, tier,
    })
  },
}

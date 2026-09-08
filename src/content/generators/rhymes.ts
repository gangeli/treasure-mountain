import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { FAMILIES, rhymeClass, type Family } from '../data/phonics'

/** Rhyme families available to a grade/tier. */
function familyLevels(grade: Grade, tier: Tier): number[] {
  const table: Record<Grade, number[][]> = {
    0: [[1], [1], [1, 2]],
    1: [[1, 2], [2], [2, 3]],
    2: [[2, 3], [3], [3, 4]],
    3: [[3], [3, 4], [4]],
    4: [[3, 4], [4], [4]],
    5: [[4], [4], [4]],
  }
  return table[grade][tier - 1]
}

const VERSES = [
  (ws: string[]) => [`${cap(ws[0])}, ${ws[1]}, ${ws[2]}`, 'Please help me out this time.', `${cap(ws[3])}, ${ws[4]}, ${ws[5]}`, 'And pick a word to rhyme.'],
  (ws: string[]) => [`${cap(ws[0])}, ${ws[1]}, ${ws[2]}, ${ws[3]}`, 'All these words rhyme, you see.', 'Find one more that rhymes', 'And give it to me!'],
  (ws: string[]) => [`${cap(ws[0])} and ${ws[1]}, ${ws[2]} and ${ws[3]}`, 'Sound the same at the end.', 'Which word rhymes with them?', 'Tell me, my friend!'],
]

export const rhymes: Generator = {
  id: 'rhymes',
  name: 'Rhymes',
  area: 'reading',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 2, 1: 2, 2: 1.5, 3: 1, 4: 0.7, 5: 0.5 },
  make(grade, tier, rng) {
    const levels = familyLevels(grade, tier)
    const pool = FAMILIES.filter(f => levels.includes(f.level) && f.words.length >= 3)
    const fam: Family = rng.pick(pool)
    const need = fam.words.length >= 7 ? 6 : Math.min(4, fam.words.length - 1)
    const words = rng.sample(fam.words, Math.min(need + 1, fam.words.length))
    const answer = words[words.length - 1]
    const shown = words.slice(0, -1)
    // Decoys: words from other families whose rhyme class differs and that don't end in the same letters.
    const cls = rhymeClass(fam.end)
    const others = FAMILIES.filter(f => rhymeClass(f.end) !== cls && !f.end.endsWith(fam.end.slice(-2)) && Math.abs(f.level - fam.level) <= 1)
    const decoys = rng.shuffle(others.flatMap(f => f.words)).filter(w => !w.endsWith(fam.end) && Math.abs(w.length - answer.length) <= 2)
    const n = choiceCount(grade)
    const { choices, answer: idx } = shuffled(rng, answer, decoys, n)
    const verse = shown.length >= 6 ? VERSES[0](shown) : shown.length >= 4 ? rng.pick(VERSES.slice(1))(shown) : [`${shown.map(cap).join(', ')}.`, 'These words rhyme.', 'Pick one more word that rhymes.']
    return riddle({
      family: 'rhymes', skill: 'phonics: rhyming', prompt: verse, verse: true,
      highlight: shown.map(w => w.slice(w.length - fam.end.length)),
      choices, answer: idx,
      spoken: `${shown.join(', ')}. These words rhyme. Which word rhymes with them? ${choices.map(c => c.text).join(', ')}?`,
      metric: fam.level * 10 + answer.length, grade, tier,
    })
  },
}

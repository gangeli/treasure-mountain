import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { OPPOSITES, type Opposite } from '../data/opposites'
import { SYNONYMS } from '../data/synonyms'
import { relatedTo, sameRoot } from '../data/vocab'

function levelsFor(grade: Grade, tier: Tier): number[] {
  const table: Record<Grade, number[][]> = {
    0: [[1], [1], [1, 2]],
    1: [[1, 2], [2], [2]],
    2: [[2], [2, 3], [3]],
    3: [[3], [3], [3, 4]],
    4: [[3, 4], [4], [4]],
    5: [[4], [4], [4]],
  }
  return table[grade][tier - 1]
}

const fits = (lines: string[]): boolean => lines.every(l => l.length <= 46)

/** Antonyms: concrete pairs for K-1, wider for 2-3, abstract and academic for 4-5 (with "which pair" at the top tiers). */
export const opposites: Generator = {
  id: 'opposites',
  name: 'Opposites',
  area: 'reading',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1, 1: 1.3, 2: 1.3, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const levels = levelsFor(grade, tier)
    const pool = OPPOSITES.filter(p => levels.includes(p.level))
    const pairMode = grade >= 4 && (tier === 3 ? rng.bool(0.4) : tier === 2 && grade === 5 && rng.bool(0.25))
    const pairText = (a: string, b: string) => `${a} / ${b}`

    if (pairMode) {
      const target = rng.pick(pool.filter(p => pairText(p.a, p.b).length <= 26))
      const related = new Set([...relatedTo(target.a), ...relatedTo(target.b)])
      // Decoy 1: a synonym pair (looks like a word pair, means the same). Decoys 2-3: unrelated pairs.
      const synGroups = rng.shuffle(SYNONYMS.filter(g => g.level >= 3 && !g.words.some(w => related.has(w.toLowerCase()))))
      const decoys: string[] = []
      for (const g of synGroups.slice(0, 2)) { const [x, y] = rng.sample(g.words, 2); decoys.push(pairText(x, y)) }
      const words = rng.shuffle(OPPOSITES.filter(p => p.level >= 3 && p.pos === target.pos).flatMap(p => [p.a, p.b])).filter(w => !related.has(w.toLowerCase()))
      for (let i = 0; i + 1 < words.length && decoys.length < n + 2; i += 2) {
        const x = words[i], y = words[i + 1]
        if (relatedTo(x).has(y.toLowerCase()) || sameRoot(x, y)) continue
        decoys.push(pairText(x, y))
      }
      const { choices, answer } = shuffled(rng, pairText(target.a, target.b), rng.shuffle(decoys).filter(d => d.length <= 26), n)
      const prompt = ['Which pair of words are opposites?']
      return riddle({
        family: 'opposites', skill: 'vocabulary: antonyms', prompt, choices, answer,
        spoken: `Which pair of words are opposites? ${choices.map(c => (c.text ?? '').replace(' / ', ' and ')).join(', ')}?`,
        metric: target.level * 10 + 8 + Math.max(target.a.length, target.b.length), grade, tier,
      })
    }

    const pair: Opposite = rng.pick(pool)
    const flip = rng.bool()
    const word = flip ? pair.b : pair.a
    const answerW = flip ? pair.a : pair.b
    const banned = new Set([...relatedTo(word), ...relatedTo(answerW)])
    const candidates = rng.shuffle(OPPOSITES.filter(p => p.pos === pair.pos && Math.abs(p.level - pair.level) <= (grade <= 1 ? 0 : 1)).flatMap(p => [p.a, p.b]))
      .filter(w => !banned.has(w.toLowerCase()) && !sameRoot(w, word) && !sameRoot(w, answerW))
    // Prefer decoys of similar length to the answer so length is not a giveaway.
    const decoys = [...candidates].sort((x, y) => Math.abs(x.length - answerW.length) - Math.abs(y.length - answerW.length)).slice(0, 8)
    const { choices, answer } = shuffled(rng, answerW, rng.shuffle(decoys), n)
    const list = choices.map(c => c.text).join(', ')

    let prompt: string[]
    let verse = false
    if (grade <= 2 && rng.bool(0.6)) {
      verse = true
      const intro = rng.shuffle(OPPOSITES.filter(p => p.level === 1 && !banned.has(p.a) && !banned.has(p.b) && p.a !== word && p.b !== word)).slice(0, 2)
      const v = rng.int(0, 1)
      prompt = v === 0
        ? [`${cap(word)} is the word I say.`, 'Its opposite, please, today!']
        : [`${cap(intro[0].a)} and ${intro[0].b}, ${intro[1].a} and ${intro[1].b}:`, 'Opposites, you see!', `Now the opposite of ${word},`, 'Please pick it out for me.']
      if (!fits(prompt)) { prompt = [`${cap(word)} is the word I say.`, 'Its opposite, please, today!'] }
    } else {
      const options = [
        [`What is the opposite of ${word}?`],
        [`The opposite of ${word} is ___.`],
        [`Which word means the opposite of ${word}?`],
        ...(grade >= 4 ? [[`Which word is an antonym of ${word}?`]] : []),
      ].filter(fits)
      prompt = rng.pick(options)
    }
    return riddle({
      family: 'opposites', skill: grade >= 4 ? 'vocabulary: antonyms' : 'vocabulary: opposites', prompt, verse, highlight: [word], choices, answer,
      spoken: `What is the opposite of ${word}? ${list}?`,
      metric: pair.level * 10 + answerW.length, grade, tier,
    })
  },
}

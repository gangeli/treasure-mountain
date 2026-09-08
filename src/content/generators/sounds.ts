import type { Generator } from '../types'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { BEGINNING, ENDING, DIGRAPHS, BLENDS } from '../data/phonics'

/** Beginning sounds (K), ending sounds (K-1), digraphs (1) and blends (2). */
export const sounds: Generator = {
  id: 'sounds',
  name: 'Letter sounds',
  area: 'reading',
  grades: [0, 1, 2],
  weight: { 0: 2, 1: 1.5, 2: 0.8 },
  make(grade, tier, rng) {
    type Mode = 'begin' | 'end' | 'digraph' | 'blend'
    const modes: Mode[] = grade === 0 ? (tier === 1 ? ['begin'] : ['begin', 'end']) : grade === 1 ? (tier === 1 ? ['end', 'begin'] : ['end', 'digraph']) : (tier === 1 ? ['digraph', 'blend'] : ['blend'])
    const mode = rng.pick(modes)
    const table = mode === 'begin' ? BEGINNING : mode === 'end' ? ENDING : mode === 'digraph' ? DIGRAPHS : BLENDS
    const keys = Object.keys(table)
    const key = rng.pick(keys)
    const words = rng.sample(table[key], Math.min(5, table[key].length))
    const answer = words[words.length - 1]
    const shown = words.slice(0, -1)
    const startsWith = (w: string) => w.startsWith(key)
    const endsWith = (w: string) => w.endsWith(key) || (key === 'k' && w.endsWith('ck')) || (key === 'ss' && w.endsWith('s'))
    const matches = mode === 'end' ? endsWith : startsWith
    const decoyPool = rng.shuffle(keys.filter(k => k !== key).flatMap(k => table[k])).filter(w => !matches(w) && (mode === 'end' ? !w.endsWith(key[key.length - 1]) : w[0] !== key[0]))
    const n = choiceCount(grade)
    const { choices, answer: idx } = shuffled(rng, answer, decoyPool, n)
    const what = mode === 'begin' ? `begin with ${key}` : mode === 'end' ? `end with ${key}` : `start with ${key}`
    const prompt = mode === 'end'
      ? [`${cap(shown.join(', '))}`, `These words all end with ${key}.`, `Do you see one more ${key} word?`, 'Please pick it for me, then.']
      : [`${cap(shown.join(', '))}`, `These words all ${what}.`, `Find one more ${key} word`, 'And pick it, my friend.']
    return riddle({
      family: 'sounds', skill: mode === 'begin' ? 'phonics: beginning sounds' : mode === 'end' ? 'phonics: ending sounds' : mode === 'digraph' ? 'phonics: digraphs' : 'phonics: blends',
      prompt, verse: true, highlight: [key, ...shown.map(() => key)], choices, answer: idx,
      spoken: `${shown.join(', ')}. These words all ${what}. Which word also ${mode === 'end' ? 'ends' : 'begins'} with ${key.split('').join(' ')}? ${choices.map(c => c.text).join(', ')}?`,
      metric: (mode === 'begin' ? 1 : mode === 'end' ? 2 : mode === 'digraph' ? 3 : 4) * 10 + answer.length, grade, tier,
    })
  },
}

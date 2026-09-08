import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount } from '../types'
import { CONTRACTIONS, type Contraction } from '../data/contractions'

function levels(grade: Grade, tier: Tier): number[] {
  const table: Partial<Record<Grade, number[][]>> = {
    2: [[1], [1, 2], [2]],
    3: [[2], [2, 3], [3]],
  }
  return table[grade]![tier - 1]
}

/** Every expansion a contraction can stand for (so decoys never collide with a valid answer). */
const expansions = (c: Contraction): string[] => [c.full, ...(c.alt ?? [])].map(s => s.toLowerCase())

/** Misplaced-apostrophe spellings of a contraction, e.g. don't -> dont, do'nt, d'ont. */
export function misspellings(short: string): string[] {
  const bare = short.replace("'", '')
  const pos = short.indexOf("'")
  const out = [bare]
  for (let i = 1; i < bare.length; i++) {
    if (i === pos) continue
    out.push(bare.slice(0, i) + "'" + bare.slice(i))
  }
  out.push(bare + "'")
  return out
}

export const contractions: Generator = {
  id: 'contractions',
  name: 'Contractions',
  area: 'reading',
  grades: [2, 3],
  weight: { 2: 1, 3: 0.9 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const lv = levels(grade, tier)
    const pool = CONTRACTIONS.filter(c => lv.includes(c.level))
    const c = rng.pick(pool)
    type Mode = 'expand' | 'contract' | 'spell'
    const modes: Mode[] = tier === 1 ? ['expand', 'contract'] : tier === 2 ? ['expand', 'contract', 'spell'] : ['contract', 'spell', 'spell', 'expand']
    const mode = rng.pick(modes)
    const first = c.full.split(' ')[0].toLowerCase()
    const last = c.full.split(' ').slice(-1)[0].toLowerCase()
    // Related contractions: share the first word (I'm / I'll / I've) or the second (can't / don't / isn't).
    const related = (x: Contraction) => { const w = x.full.toLowerCase().split(' '); return w[0] === first || w[w.length - 1] === last }
    const others = CONTRACTIONS.filter(x => x !== c && x.short.toLowerCase() !== c.short.toLowerCase() && Math.abs(x.level - c.level) <= 1)
    const ranked = [...rng.shuffle(others.filter(related)), ...rng.shuffle(others.filter(x => !related(x)))]
    if (mode === 'expand') {
      const mine = new Set(expansions(c))
      const decoys = ranked.map(x => x.full).filter(f => !mine.has(f.toLowerCase()))
      const { choices, answer } = shuffled(rng, c.full, decoys, n)
      const prompt = rng.pick([[`${c.short} is short for ___.`], [`What two words make "${c.short}"?`], [`${c.short} means ___.`]])
      return riddle({
        family: 'contractions', skill: 'grammar: contractions', prompt, highlight: [c.short], choices, answer,
        spoken: `${c.short} is short for which words? ${choices.map(c => c.text).join(', ')}?`,
        metric: c.level * 10 + c.full.length, grade, tier,
      })
    }
    if (mode === 'contract') {
      const decoys = ranked.map(x => x.short)
      const { choices, answer } = shuffled(rng, c.short, decoys, n)
      const prompt = rng.pick([[`Which contraction means "${c.full}"?`], [`Make "${c.full}" shorter.`, 'Which word is it?'], [`"${c.full}" can be written as ___.`]])
      return riddle({
        family: 'contractions', skill: 'grammar: contractions', prompt, highlight: [c.full], choices, answer,
        spoken: `Which contraction means ${c.full}? ${choices.map(c => c.text).join(', ')}?`,
        metric: c.level * 10 + c.full.length + 2, grade, tier,
      })
    }
    const decoys = rng.shuffle(misspellings(c.short))
    const { choices, answer } = shuffled(rng, c.short, decoys, n)
    const prompt = rng.pick([[`Which is the right way to write "${c.full}"?`], [`"${c.full}" as a contraction.`, 'Where does the apostrophe go?'], ['Which contraction is spelled correctly?', `It means "${c.full}".`]])
    return riddle({
      family: 'contractions', skill: 'grammar: apostrophes', prompt, highlight: [c.full], choices, answer,
      spoken: `Which is the right way to write the contraction for ${c.full}? ${choices.map(c => c.text).join(', ')}?`,
      metric: c.level * 10 + c.full.length + 4, grade, tier,
    })
  },
}

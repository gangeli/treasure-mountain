import type { Generator } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys, fmtDec, COUNTER_ITEMS, plural, NAMES } from './mathutil'

const natDec = (units: number, places: number): string => {
  let s = fmtDec(units, places)
  if (s.includes('.')) { s = s.replace(/0+$/, ''); if (s.endsWith('.')) s = s.slice(0, -1) }
  return s
}

/** Sharing (2), facts (3), 3-digit by 1-digit with remainders (4), 2-digit divisors and decimals (5). */
export const divide: Generator = {
  id: 'divide',
  name: 'Division',
  area: 'math',
  grades: [2, 3, 4, 5],
  weight: { 2: 0.7, 3: 1.4, 4: 1.4, 5: 1.2 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)

    if (grade === 2) {
      const d = rng.int(2, tier === 1 ? 3 : tier === 2 ? 4 : 5)
      const q = rng.int(tier === 1 ? 1 : 2, tier === 1 ? 5 : tier === 2 ? 6 : 8)
      const t = d * q
      const item = rng.pick(COUNTER_ITEMS)
      const items = plural(item, 2)
      const decoys = numDecoys(rng, q, n - 1, [q - 1, q + 1, d, t - d, q + 2, t], 2, 1)
      const { choices, answer } = shuffled(rng, String(q), decoys.map(String), n)
      const symbolic = tier === 3 && rng.bool(0.35)
      const name = rng.pick(NAMES)
      const prompt = symbolic ? [`${t} ÷ ${d} = ?`] : rng.pick([
        [`${d} friends share ${t} ${items} equally.`, 'How many does each friend get?'],
        [`${t} ${items} go into ${d} bags equally.`, 'How many in each bag?'],
        [`${name} puts ${t} ${items} in ${d} equal rows.`, 'How many in each row?'],
        [`Share ${t} ${items} between ${d} plates.`, 'How many on each plate?'],
      ])
      return mathRiddle({
        family: 'divide', skill: 'math: sharing equally', prompt,
        visual: { kind: 'counters', item, count: t, groups: tier === 1 ? d : undefined },
        choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: Math.log2(t) * 8, grade, tier,
      }, `num:${t}/${d}`)
    }

    if (grade === 3) {
      const [dLo, dHi, qLo, qHi] = tier === 1 ? [2, 5, 1, 10] : tier === 2 ? [2, 9, 2, 10] : [6, 10, 6, 12]
      const d = rng.int(dLo, dHi), q = rng.int(qLo, qHi)
      const t = d * q
      const missing = tier >= 2 && rng.bool(0.3)
      if (missing) {
        const decoys = numDecoys(rng, d, n - 1, [d - 1, d + 1, q, t - q, d + 2], 3, 1)
        const { choices, answer } = shuffled(rng, String(d), decoys.map(String), n)
        const prompt = [`${t} ÷ ? = ${q}`, 'What is the missing number?']
        return mathRiddle({ family: 'divide', skill: 'math: division facts', prompt, choices, answer, spoken: `${t} divided by what equals ${q}? ${sayChoices(choices)}?`, metric: Math.log2(t) * 8 + 3, grade, tier }, `num:${t}/${q}`)
      }
      const related = [d - 1, d + 1].filter(x => x > 1 && t % x === 0).map(x => t / x)
      const decoys = numDecoys(rng, q, n - 1, [q - 1, q + 1, d, t - d, ...related, q + 2], 3, 0)
      const { choices, answer } = shuffled(rng, String(q), decoys.map(String), n)
      const prompt = [`${t} ÷ ${d} = ?`]
      return mathRiddle({ family: 'divide', skill: 'math: division facts', prompt, choices, answer, spoken: `What is ${t} divided by ${d}? ${sayChoices(choices)}?`, metric: Math.log2(t) * 8, grade, tier }, `num:${t}/${d}`)
    }

    if (grade === 4) {
      const withRem = tier === 3 ? rng.bool(0.7) : tier === 2 ? rng.bool(0.25) : false
      const d = rng.int(2, tier === 1 ? 5 : 9)
      const q = tier === 1 ? rng.int(11, 25) : rng.int(12, Math.floor(999 / d))
      const r = withRem ? rng.int(1, d - 1) : 0
      const t = q * d + r
      if (withRem) {
        const askRem = rng.bool(0.6)
        if (askRem) {
          const decoys = numDecoys(rng, r, n - 1, [r + 1, r - 1, d - r, d, q % 10, 0], 2, 0, Math.max(d, r + 2))
          const { choices, answer } = shuffled(rng, String(r), decoys.map(String), n)
          const prompt = [`${t} ÷ ${d}`, 'What is the remainder?']
          return mathRiddle({ family: 'divide', skill: 'math: division with remainders', prompt, choices, answer, spoken: `${t} divided by ${d}. What is the remainder? ${sayChoices(choices)}?`, metric: Math.log2(t) * 8 + 10, grade, tier }, `num:${t}%${d}`)
        }
        const decoys = numDecoys(rng, q, n - 1, [q + 1, q - 1, q + 10, q - 10, Math.floor(t / (d + 1)), Math.floor(t / (d - 1))], 4, 1)
        const { choices, answer } = shuffled(rng, String(q), decoys.map(String), n)
        const prompt = [`${t} ÷ ${d}`, 'What is the quotient?', '(Ignore the remainder.)']
        return mathRiddle({ family: 'divide', skill: 'math: division with remainders', prompt, choices, answer, spoken: `${t} divided by ${d}. What is the quotient, ignoring the remainder? ${sayChoices(choices)}?`, metric: Math.log2(t) * 8 + 10, grade, tier }, `num:floor(${t}/${d})`)
      }
      const decoys = numDecoys(rng, q, n - 1, [q + 1, q - 1, q + 10, q - 10, t - d, Math.floor(t / (d + 1))], 4, 1)
      const { choices, answer } = shuffled(rng, String(q), decoys.map(String), n)
      const prompt = [`${t} ÷ ${d} = ?`]
      return mathRiddle({ family: 'divide', skill: 'math: long division', prompt, choices, answer, spoken: `What is ${t} divided by ${d}? ${sayChoices(choices)}?`, metric: Math.log2(t) * 8, grade, tier }, `num:${t}/${d}`)
    }

    // grade 5
    const kind = tier === 1 ? 'exact' : tier === 2 ? rng.pick(['exact', 'exact', 'decimal']) : rng.pick(['exact', 'decimal', 'remainder'])
    if (kind === 'decimal') {
      const places = tier === 2 ? 1 : rng.pick([1, 2])
      const d = rng.int(2, 9)
      const qu = rng.int(2, places === 1 ? 99 : 399)
      const tu = qu * d
      const decoys = numDecoys(rng, qu, n - 1, [qu * 10, Math.round(qu / 10), qu + d, qu - d, qu + 1, qu - 1], Math.max(3, Math.round(qu * 0.1)), 1)
      const tT = natDec(tu, places)
      const { choices, answer } = shuffled(rng, natDec(qu, places), decoys.map(v => natDec(v, places)), n)
      const prompt = [`${tT} ÷ ${d} = ?`]
      return mathRiddle({ family: 'divide', skill: 'math: dividing decimals', prompt, choices, answer, spoken: `What is ${tT} divided by ${d}? ${sayChoices(choices)}?`, metric: Math.log2(tu) * 8 + places * 15, grade, tier }, `num:${tT}/${d}`)
    }
    const d = rng.int(11, tier === 1 ? 20 : 40)
    const q = rng.int(tier === 1 ? 5 : 10, tier === 1 ? 30 : 60)
    if (kind === 'remainder') {
      const r = rng.int(1, d - 1)
      const t = q * d + r
      const decoys = numDecoys(rng, r, n - 1, [r + 1, r - 1, d - r, r + 10, r - 10, q], 4, 0, d + 5)
      const { choices, answer } = shuffled(rng, String(r), decoys.map(String), n)
      const prompt = [`${t} ÷ ${d}`, 'What is the remainder?']
      return mathRiddle({ family: 'divide', skill: 'math: two-digit divisors', prompt, choices, answer, spoken: `${t} divided by ${d}. What is the remainder? ${sayChoices(choices)}?`, metric: Math.log2(t) * 8 + 10, grade, tier }, `num:${t}%${d}`)
    }
    const t = q * d
    const decoys = numDecoys(rng, q, n - 1, [q + 1, q - 1, q + 2, q - 2, d, Math.floor(t / (d + 1)), Math.floor(t / (d - 1))], 3, 1)
    const { choices, answer } = shuffled(rng, String(q), decoys.map(String), n)
    const prompt = [`${t} ÷ ${d} = ?`]
    return mathRiddle({ family: 'divide', skill: 'math: two-digit divisors', prompt, choices, answer, spoken: `What is ${t} divided by ${d}? ${sayChoices(choices)}?`, metric: Math.log2(t) * 8, grade, tier }, `num:${t}/${d}`)
  },
}

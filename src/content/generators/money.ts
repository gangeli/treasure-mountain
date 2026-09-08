import type { Generator, Choice, CoinName } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, numDecoys, cents, dollars, NAMES, twoNames } from './mathutil'
import type { Rng } from '../../engine/rng'

const VALUE: Record<CoinName, number> = { penny: 1, nickel: 5, dime: 10, quarter: 25 }
const COINS: CoinName[] = ['penny', 'nickel', 'dime', 'quarter']
const sum = (cs: CoinName[]) => cs.reduce((s, c) => s + VALUE[c], 0)
const ITEMS = ['toy', 'pencil', 'sticker', 'eraser', 'apple', 'cookie', 'balloon', 'ring', 'card', 'marble', 'notebook', 'yo-yo', 'kite', 'book', 'hat', 'ball']

/** Random handful of coins from `kinds`, at most `max` coins. */
function handful(rng: Rng, kinds: CoinName[], min: number, max: number): CoinName[] {
  const k = rng.int(min, max)
  const cs: CoinName[] = []
  for (let i = 0; i < k; i++) cs.push(rng.pick(kinds))
  // Sort biggest first so the picture reads naturally.
  return cs.sort((a, b) => VALUE[b] - VALUE[a])
}

/** Coin names (K), counting coins (1-2), change (3), dollars and cents (4), multi-step (5). */
export const money: Generator = {
  id: 'money',
  name: 'Money',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1, 1: 1.2, 2: 1.2, 3: 1.2, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)

    if (grade === 0) {
      const mode = rng.pick(tier === 1 ? ['name', 'name', 'most'] : tier === 2 ? ['name', 'most', 'worth'] : ['name', 'most', 'worth', 'least'])
      const pool = tier === 1 ? COINS.slice(0, 3) : COINS
      if (mode === 'name') {
        const coin = rng.pick(pool)
        const { choices, answer } = shuffled(rng, coin, rng.shuffle(COINS.filter(c => c !== coin)), n)
        const prompt = [rng.pick(['What is this coin called?', 'Which coin is this?', 'What is the name of this coin?'])]
        return mathRiddle({ family: 'money', skill: 'math: coin names', prompt, visual: { kind: 'coins', coins: [coin] }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 4 + COINS.indexOf(coin), grade, tier }, '')
      }
      if (mode === 'worth') {
        const coin = rng.pick(pool)
        const txt = (v: number) => `${v} cent${v === 1 ? '' : 's'}`
        const { choices, answer } = shuffled(rng, txt(VALUE[coin]), rng.shuffle(COINS.filter(c => c !== coin).map(c => txt(VALUE[c]))), n)
        const prompt = [`How much is a ${coin} worth?`]
        return mathRiddle({ family: 'money', skill: 'math: coin values', prompt, visual: { kind: 'coins', coins: [coin] }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 6 + COINS.indexOf(coin), grade, tier }, `num:${VALUE[coin]}`)
      }
      const picked = rng.sample(pool, n)
      const most = mode === 'most'
      const target = picked.reduce((a, b) => (most ? VALUE[b] > VALUE[a] : VALUE[b] < VALUE[a]) ? b : a)
      const vis = (c: CoinName): Choice => ({ visual: { kind: 'coins', coins: [c] } })
      const { choices, answer } = shuffled(rng, vis(target), picked.filter(c => c !== target).map(vis), n)
      const prompt = [`Which coin is worth the ${most ? 'most' : 'least'}?`]
      return mathRiddle({ family: 'money', skill: 'math: coin values', prompt, choices, answer, spoken: `${prompt[0]} Look at the coins and pick one.`, metric: 7 + tier, grade, tier }, most ? 'max' : 'min')
    }

    if (grade === 1 || grade === 2) {
      type M = 'count' | 'more' | 'howMany' | 'which'
      const modes: M[] = grade === 1 ? ['count', 'count', 'count'] : (tier === 1 ? ['count', 'howMany'] : tier === 2 ? ['count', 'more', 'howMany'] : ['count', 'more', 'howMany', 'which'])
      const mode = rng.pick(modes)
      if (mode === 'count') {
        const kinds: CoinName[] = grade === 1 ? (tier === 1 ? rng.pick([['penny'], ['nickel']]) : tier === 2 ? rng.pick([['dime'], ['penny', 'nickel']]) : ['penny', 'nickel', 'dime'])
          : (tier === 1 ? ['quarter', 'dime', 'nickel'] : ['quarter', 'dime', 'nickel', 'penny'])
        const cs = handful(rng, kinds, grade === 1 ? 2 : 3, grade === 1 ? (tier === 1 ? 6 : 8) : 8)
        const total = sum(cs)
        const decoys = numDecoys(rng, total, n - 1, [cs.length, total + 5, total - 5, total + 1, total - 1, total + 10, total - 10], 5, 1).map(cents)
        const { choices, answer } = shuffled(rng, cents(total), decoys, n)
        const prompt = [rng.pick(['How much money is this?', 'Count the coins. How much money?', 'How much money do you see?'])]
        return mathRiddle({ family: 'money', skill: 'math: counting coins', prompt, visual: { kind: 'coins', coins: cs }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 12 + total / 4 + cs.length, grade, tier }, `num:${cs.map(c => VALUE[c]).join('+')}`)
      }
      if (mode === 'howMany') {
        const coin = rng.pick(tier === 1 ? ['dime', 'quarter'] : ['dime', 'quarter', 'nickel'] as CoinName[])
        const k = 100 / VALUE[coin]
        const decoys = numDecoys(rng, k, n - 1, [k + 1, k - 1, k * 2, k / 2, VALUE[coin]], 3, 1).map(String)
        const { choices, answer } = shuffled(rng, String(k), decoys, n)
        const prompt = [`How many ${coin === 'penny' ? 'pennies' : coin + 's'} make one dollar?`]
        return mathRiddle({ family: 'money', skill: 'math: making a dollar', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 30 + k / 2, grade, tier }, `num:100/${VALUE[coin]}`)
      }
      if (mode === 'more') {
        const have = rng.int(1, 19) * 5
        const need = 100 - have
        const decoys = numDecoys(rng, need, n - 1, [have, need + 5, need - 5, need + 10, need - 10, 100 - need + 10], 10, 1).map(cents)
        const { choices, answer } = shuffled(rng, cents(need), decoys, n)
        const prompt = [`You have ${cents(have)}. How much more`, 'do you need to make one dollar?']
        return mathRiddle({ family: 'money', skill: 'math: making a dollar', prompt, choices, answer, spoken: `You have ${have} cents. How much more do you need to make one dollar? ${sayChoices(choices)}?`, metric: 32 + need / 5, grade, tier }, `num:100-${have}`)
      }
      // which set of coins makes an amount
      const cs = handful(rng, ['quarter', 'dime', 'nickel'], 2, 4)
      const total = sum(cs)
      const describe = (list: CoinName[]) => {
        const counts: Partial<Record<CoinName, number>> = {}
        for (const c of list) counts[c] = (counts[c] || 0) + 1
        return COINS.slice().reverse().filter(c => counts[c]).map(c => `${counts[c]} ${c === 'penny' ? (counts[c] === 1 ? 'penny' : 'pennies') : c + (counts[c] === 1 ? '' : 's')}`).join(', ')
      }
      const alts: CoinName[][] = []
      let tries = 0
      while (alts.length < n + 2 && tries++ < 60) {
        const alt = handful(rng, ['quarter', 'dime', 'nickel'], 2, 4)
        const d = describe(alt)
        if (sum(alt) !== total && d.length <= 26 && !alts.some(a => describe(a) === d)) alts.push(alt)
      }
      const ansText = describe(cs)
      if (ansText.length > 26 || alts.length < n - 1) return money.make(grade, tier, rng)
      const { choices, answer } = shuffled(rng, ansText, alts.map(describe), n)
      const prompt = [`Which coins make ${cents(total)}?`]
      return mathRiddle({ family: 'money', skill: 'math: counting coins', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 34 + total / 5, grade, tier }, '')
    }

    if (grade === 3) {
      const item = rng.pick(ITEMS)
      const [me] = twoNames(rng)
      if (tier === 3 && rng.bool(0.4)) {
        // Two items, pay with a dollar.
        const a = rng.int(2, 9) * 5, b = rng.int(2, 9) * 5
        const item2 = rng.pick(ITEMS.filter(i => i !== item))
        const change = 100 - a - b
        if (change <= 0) return money.make(grade, tier, rng)
        const decoys = numDecoys(rng, change, n - 1, [a + b, 100 - a, 100 - b, change + 5, change - 5, change + 10], 10, 1).map(cents)
        const { choices, answer } = shuffled(rng, cents(change), decoys, n)
        const prompt = [`A ${item} costs ${cents(a)} and a ${item2} costs ${cents(b)}.`, `${me} pays for both with one dollar.`, 'How much change does ' + me + ' get?']
        return mathRiddle({ family: 'money', skill: 'math: making change', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 50 + (a + b) / 10, grade, tier }, `num:100-${a}-${b}`)
      }
      const price = tier === 1 ? rng.int(1, 9) * 5 : rng.int(11, 94)
      const payOpts = tier === 1 ? [25, 50, 75, 100].filter(p => p > price) : tier === 2 ? [50, 75, 100].filter(p => p > price) : [100]
      const pay = rng.pick(payOpts)
      const change = pay - price
      const decoys = numDecoys(rng, change, n - 1, [pay + price, change + 5, change - 5, change + 10, change - 10, price, change + 1, change - 1], 8, 1).map(cents)
      const { choices, answer } = shuffled(rng, cents(change), decoys, n)
      const payText = pay === 100 ? 'one dollar' : pay === 25 ? 'a quarter' : cents(pay)
      const prompt = rng.pick([
        [`A ${item} costs ${cents(price)}.`, `You pay with ${payText}.`, 'How much change do you get?'],
        [`${me} buys a ${item} for ${cents(price)}`, `and pays with ${payText}.`, `How much change does ${me} get?`],
        [`You pay ${payText} for a ${cents(price)} ${item}.`, 'What is your change?'],
      ])
      return mathRiddle({ family: 'money', skill: 'math: making change', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 45 + change / 10 + (price % 5 ? 4 : 0), grade, tier }, `num:${pay}-${price}`)
    }

    if (grade === 4) {
      const [me, other] = twoNames(rng)
      const item = rng.pick(ITEMS), item2 = rng.pick(ITEMS.filter(i => i !== item))
      const mode = rng.pick(tier === 1 ? ['add', 'sub'] : tier === 2 ? ['add', 'sub', 'left'] : ['add3', 'left', 'sub', 'add'])
      const step = tier === 1 ? 25 : tier === 2 ? 5 : 1
      const r = (lo: number, hi: number) => rng.int(Math.ceil(lo / step), Math.floor(hi / step)) * step
      if (mode === 'add' || mode === 'add3') {
        const a = r(100, 999), b = r(100, 899), c = mode === 'add3' ? r(100, 599) : 0
        const total = a + b + c
        const decoys = numDecoys(rng, total, n - 1, [Math.abs(a - b) + c, total + 100, total - 100, total + 25, total - 25, total + 10, total - 10], 50, 1).map(dollars)
        const { choices, answer } = shuffled(rng, dollars(total), decoys, n)
        const prompt = mode === 'add3'
          ? [`${me} buys a ${item} for ${dollars(a)}, a ${item2}`, `for ${dollars(b)} and a snack for ${dollars(c)}.`, 'How much is that in all?']
          : rng.pick([[`${dollars(a)} + ${dollars(b)} = ?`], [`${me} has ${dollars(a)}. ${other} gives ${me}`, `${dollars(b)} more. How much does ${me} have?`], [`A ${item} costs ${dollars(a)} and a ${item2}`, `costs ${dollars(b)}. What is the total?`]])
        return mathRiddle({ family: 'money', skill: 'math: adding money', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 60 + Math.log2(total / 25) * 2 + (c ? 4 : 0) + (step === 1 ? 3 : 0), grade, tier }, `num:${a}+${b}+${c}`)
      }
      const a = r(300, 1999), b = r(100, a - 50)
      const diff = a - b
      const decoys = numDecoys(rng, diff, n - 1, [a + b, diff + 100, diff - 100, diff + 25, diff - 25, diff + 10, diff - 10], 50, 1).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(diff), decoys, n)
      const prompt = mode === 'sub'
        ? rng.pick([[`${dollars(a)} - ${dollars(b)} = ?`], [`A ${item} costs ${dollars(a)}. A ${item2} costs ${dollars(b)}.`, 'How much more does the ' + item + ' cost?']])
        : [`${me} has ${dollars(a)} and spends ${dollars(b)}`, `on a ${item}. How much is left?`]
      return mathRiddle({ family: 'money', skill: 'math: subtracting money', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 60 + Math.log2(a / 25) * 2 + (step === 1 ? 3 : 0), grade, tier }, `num:${a}-${b}`)
    }

    // grade 5: multi-step
    const [me] = twoNames(rng)
    const item = rng.pick(ITEMS), item2 = rng.pick(ITEMS.filter(i => i !== item))
    const mode = rng.pick(tier === 1 ? ['multi', 'save', 'twoKinds'] : tier === 2 ? ['multiChange', 'twoKinds', 'save', 'half'] : ['multiChange', 'twoKinds', 'percent', 'unit'])
    if (mode === 'multi' || mode === 'multiChange') {
      const k = rng.int(2, 6), price = rng.int(tier === 1 ? 5 : 3, tier === 1 ? 40 : 99) * 5
      const cost = k * price
      if (mode === 'multi') {
        const decoys = numDecoys(rng, cost, n - 1, [price + k, cost + price, cost - price, cost + 100, cost - 100], 50, 5).map(dollars)
        const { choices, answer } = shuffled(rng, dollars(cost), decoys, n)
        const prompt = [`${me} buys ${k} ${item}s at ${dollars(price)} each.`, 'How much does that cost?']
        return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 80 + k * 2, grade, tier }, `num:${k}*${price}`)
      }
      const pay = Math.ceil(cost / 500) * 500 + (rng.bool() ? 500 : 0)
      const change = pay - cost
      if (change <= 0) return money.make(grade, tier, rng)
      const decoys = numDecoys(rng, change, n - 1, [cost, pay - price, change + price, change - price, change + 100, change - 100], 50, 5).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(change), decoys, n)
      const prompt = [`${me} buys ${k} ${item}s at ${dollars(price)} each`, `and pays with ${dollars(pay)}.`, 'How much change does ' + me + ' get?']
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 86 + k * 2, grade, tier }, `num:${pay}-${k}*${price}`)
    }
    if (mode === 'twoKinds') {
      const k1 = rng.int(2, 5), p1 = rng.int(3, 60) * 5, k2 = rng.int(1, 4), p2 = rng.int(3, 60) * 5
      const total = k1 * p1 + k2 * p2
      const decoys = numDecoys(rng, total, n - 1, [p1 + p2, k1 * p1 + p2, p1 + k2 * p2, total + 100, total - 100, (k1 + k2) * p1], 50, 5).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(total), decoys, n)
      const prompt = [`${me} buys ${k1} ${item}s at ${dollars(p1)} each and`, `${k2} ${item2}${k2 > 1 ? 's' : ''} at ${dollars(p2)} each.`, 'How much does ' + me + ' spend?']
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 84 + k1 + k2, grade, tier }, `num:${k1}*${p1}+${k2}*${p2}`)
    }
    if (mode === 'save') {
      const week = rng.int(4, 40) * 25, weeks = rng.int(3, 8)
      const total = week * weeks
      const decoys = numDecoys(rng, total, n - 1, [week + weeks, total + week, total - week, total + 100], 100, 25).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(total), decoys, n)
      const prompt = [`${me} saves ${dollars(week)} every week.`, `How much is saved after ${weeks} weeks?`]
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 80 + weeks, grade, tier }, `num:${week}*${weeks}`)
    }
    if (mode === 'half') {
      const price = rng.int(3, 30) * 100 + rng.pick([0, 50])
      const sale = price / 2
      const decoys = numDecoys(rng, sale, n - 1, [price * 2, price - 50, sale + 100, sale - 100, sale + 50], 100, 25).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(sale), decoys, n)
      const prompt = [`A ${item} costs ${dollars(price)}. Today it is`, 'half price. What is the sale price?']
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 82, grade, tier }, `num:${price}/2`)
    }
    if (mode === 'percent') {
      const price = rng.int(2, 30) * 100
      const pct = rng.pick([10, 20, 25, 50])
      const sale = price - price * pct / 100
      const decoys = numDecoys(rng, sale, n - 1, [price * pct / 100, price - pct, sale + 100, sale - 100, price + price * pct / 100], 100, 25).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(sale), decoys, n)
      const prompt = [`A ${item} costs ${dollars(price)}. It is on sale`, `for ${pct}% off. What is the sale price?`]
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 90, grade, tier }, `num:${price}-${price}*${pct}/100`)
    }
    // unit price
    const k = rng.pick([2, 3, 4, 5, 6, 8, 10]), unit = rng.int(2, 30) * 5
    const total = k * unit
    const decoys = numDecoys(rng, unit, n - 1, [total, unit + 5, unit - 5, unit * 2, Math.round(total / (k - 1))], 20, 5).map(dollars)
    const { choices, answer } = shuffled(rng, dollars(unit), decoys, n)
    const prompt = [`${k} ${item}s cost ${dollars(total)} altogether.`, `How much does one ${item} cost?`]
    return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 88 + k, grade, tier }, `num:${total}/${k}`)
  },
}

import type { Generator, Choice, CoinName } from '../types'
import { shuffled, choiceCount, cap } from '../types'
import { mathRiddle, sayChoices, numDecoys, cents, dollars, twoNames, article } from './mathutil'
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
/** Guarantees the set contains `coin` (grade-1 tier 3 always mixes in a dime). */
function withCoin(rng: Rng, cs: CoinName[], coin: CoinName): CoinName[] {
  if (cs.includes(coin)) return cs
  const out = cs.slice()
  out[rng.int(0, out.length - 1)] = coin
  return out.sort((a, b) => VALUE[b] - VALUE[a])
}
/**
 * One notation for every choice in a riddle: plain cents while everything stays under a dollar,
 * dollars-and-cents as soon as any amount reaches 100¢ (2.MD.8 wants "$1.25", never "125¢").
 */
function centsFmt(values: number[]): { fmt: (c: number) => string; over: boolean } {
  const over = values.some(v => v >= 100)
  return { fmt: (c: number) => over ? dollars(c) : cents(c), over }
}
/** Counting a pile is harder with more coins and more kinds of coin, not with a bigger total. */
const countMetric = (cs: CoinName[]): number => 12 + cs.length * 2 + new Set(cs).size * 4 + sum(cs) / 10

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
      // Naming a coin is the easiest thing here, so it stays in tier 1; "worth the most/least"
      // (a dime beating a nickel although it is smaller) is the hardest and stays in tier 3.
      type M = 'name' | 'worth' | 'most' | 'least'
      const modes: M[] = tier === 1 ? ['name'] : tier === 2 ? ['name', 'worth'] : ['worth', 'most', 'least']
      const mode = rng.pick(modes)
      const vis = (c: CoinName): Choice => ({ visual: { kind: 'coins', coins: [c] } })
      if (mode === 'name') {
        // Picture choices: a five-year-old cannot read "quarter" or "nickel", so asking them to
        // pick the word tests reading, not coins. The coin name is spoken in the prompt instead.
        const coin = rng.pick(COINS)
        const { choices, answer } = shuffled(rng, vis(coin), rng.shuffle(COINS.filter(c => c !== coin)).map(vis), n)
        const prompt = [rng.pick([`Which coin is the ${coin}?`, `Find the ${coin}.`, `Can you find the ${coin}?`])]
        return mathRiddle({ family: 'money', skill: 'math: coin names', prompt, choices, answer, spoken: `${prompt[0]} Look at the coins and pick one.`, metric: 4 + COINS.indexOf(coin), grade, tier }, `num:${VALUE[coin]}`)
      }
      if (mode === 'worth') {
        const coin = rng.pick(COINS)
        const txt = (v: number) => `${v} cent${v === 1 ? '' : 's'}`
        const { choices, answer } = shuffled(rng, txt(VALUE[coin]), rng.shuffle(COINS.filter(c => c !== coin).map(c => txt(VALUE[c]))), n)
        const prompt = [`How much is a ${coin} worth?`]
        return mathRiddle({ family: 'money', skill: 'math: coin values', prompt, visual: { kind: 'coins', coins: [coin] }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 6 + COINS.indexOf(coin), grade, tier }, `num:${VALUE[coin]}`)
      }
      const picked = rng.sample(COINS, n)
      const most = mode === 'most'
      const target = picked.reduce((a, b) => (most ? VALUE[b] > VALUE[a] : VALUE[b] < VALUE[a]) ? b : a)
      const { choices, answer } = shuffled(rng, vis(target), picked.filter(c => c !== target).map(vis), n)
      const prompt = [`Which coin is worth the ${most ? 'most' : 'least'}?`]
      // One difficulty for one riddle: the same question must not score higher in a higher tier.
      return mathRiddle({ family: 'money', skill: 'math: coin values', prompt, choices, answer, spoken: `${prompt[0]} Look at the coins and pick one.`, metric: 10, grade, tier }, most ? 'max' : 'min')
    }

    if (grade === 1 || grade === 2) {
      type M = 'count' | 'more' | 'howMany' | 'which'
      // Grade 2: "how many dimes/quarters make a dollar" is tier 1, nickels and "how much more"
      // are tier 2, and the big piles plus "which coins make N¢" are tier 3 — no mode in two tiers.
      const modes: M[] = grade === 1 ? ['count'] : (tier === 1 ? ['count', 'count', 'howMany'] : tier === 2 ? ['count', 'more', 'howMany'] : ['count', 'count', 'more', 'which'])
      const mode = rng.pick(modes)
      if (mode === 'count') {
        let cs: CoinName[]
        if (grade === 1) {
          cs = tier === 1 ? handful(rng, rng.pick([['penny'] as CoinName[], ['nickel'] as CoinName[]]), 2, 6)
            : tier === 2 ? handful(rng, rng.pick([['dime'] as CoinName[], ['penny', 'nickel'] as CoinName[]]), 2, 8)
              // Tier 3 always mixes a dime into at least three coins, so it beats the tier-2 pairs.
              : withCoin(rng, handful(rng, ['penny', 'nickel', 'dime'], 3, 6), 'dime')
        } else {
          cs = tier === 1 ? handful(rng, ['quarter', 'dime', 'nickel'], 3, 5) : tier === 2 ? handful(rng, COINS, 4, 6) : handful(rng, COINS, 6, 8)
          // Grade-2 tier 1 stays under a dollar and under six coins: the big piles belong in tier 3.
          for (let i = 0; i < 20 && tier === 1 && sum(cs) > 99; i++) cs = handful(rng, ['quarter', 'dime', 'nickel'], 3, 5)
        }
        const total = sum(cs)
        // "counted the coins instead of their value" only reads as a near miss under a dollar.
        const vals = numDecoys(rng, total, n - 1, [...(total < 100 ? [cs.length] : [total + 25, total - 25]), total + 5, total - 5, total + 1, total - 1, total + 10, total - 10], 5, 1)
        const { fmt, over } = centsFmt([total, ...vals])
        const { choices, answer } = shuffled(rng, fmt(total), vals.map(fmt), n)
        const prompt = [rng.pick(['How much money is this?', 'Count the coins. How much money?', 'How much money do you see?'])]
        const expr = cs.map(c => VALUE[c]).join('+')
        return mathRiddle({ family: 'money', skill: 'math: counting coins', prompt, visual: { kind: 'coins', coins: cs }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: countMetric(cs), grade, tier }, over ? `num:(${expr})/100` : `num:${expr}`)
      }
      if (mode === 'howMany') {
        const coin: CoinName = tier === 1 ? rng.pick(['dime', 'quarter'] as CoinName[]) : 'nickel'
        const k = 100 / VALUE[coin]
        const decoys = numDecoys(rng, k, n - 1, [k + 1, k - 1, k * 2, k / 2, VALUE[coin]], 3, 1).map(String)
        const { choices, answer } = shuffled(rng, String(k), decoys, n)
        const prompt = [`How many ${coin === 'penny' ? 'pennies' : coin + 's'} make one dollar?`]
        return mathRiddle({ family: 'money', skill: 'math: making a dollar', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 30 + k / 2, grade, tier }, `num:100/${VALUE[coin]}`)
      }
      if (mode === 'more') {
        const have = rng.int(1, 19) * 5
        const need = 100 - have
        const vals = numDecoys(rng, need, n - 1, [have, need + 5, need - 5, need + 10, need - 10, 100 - need + 10], 10, 1)
        const { fmt, over } = centsFmt([need, ...vals])
        const { choices, answer } = shuffled(rng, fmt(need), vals.map(fmt), n)
        const prompt = [`You have ${cents(have)}. How much more`, 'do you need to make one dollar?']
        return mathRiddle({ family: 'money', skill: 'math: making a dollar', prompt, choices, answer, spoken: `You have ${have} cents. How much more do you need to make one dollar? ${sayChoices(choices)}?`, metric: 32 + need / 5, grade, tier }, over ? `num:(100-${have})/100` : `num:100-${have}`)
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
      const prompt = [`Which coins make ${total >= 100 ? dollars(total) : cents(total)}?`]
      return mathRiddle({ family: 'money', skill: 'math: counting coins', prompt, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 34 + total / 5, grade, tier }, '')
    }

    if (grade === 3) {
      const item = rng.pick(ITEMS)
      const [me] = twoNames(rng)
      if (tier === 3) {
        if (rng.bool(0.5)) {
          // Two items, pay with a dollar.
          const a = rng.int(2, 9) * 5, b = rng.int(2, 9) * 5
          const item2 = rng.pick(ITEMS.filter(i => i !== item))
          const change = 100 - a - b
          if (change <= 0) return money.make(grade, tier, rng)
          const vals = numDecoys(rng, change, n - 1, [a + b, 100 - a, 100 - b, change + 5, change - 5, change + 10], 10, 1)
          const { fmt, over } = centsFmt([change, ...vals])
          const { choices, answer } = shuffled(rng, fmt(change), vals.map(fmt), n)
          const prompt = [`${cap(article(item))} ${item} costs ${cents(a)} and ${article(item2)} ${item2} costs ${cents(b)}.`, `${me} pays for both with one dollar.`, `How much change does ${me} get?`]
          return mathRiddle({ family: 'money', skill: 'math: making change', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 52 + (a + b) / 10, grade, tier }, over ? `num:(100-${a}-${b})/100` : `num:100-${a}-${b}`)
        }
        // Change from a bill, with a dollars-and-cents price: the grade-3 step past sub-dollar change.
        const pay = rng.pick([500, 1000])
        const price = rng.int(105, pay - 60)
        const change = pay - price
        const vals = numDecoys(rng, change, n - 1, [price, pay + price, change + 100, change - 100, change + 10, change - 10, change + 5], 40, 5)
        const { choices, answer } = shuffled(rng, dollars(change), vals.map(dollars), n)
        const prompt = [`${cap(article(item))} ${item} costs ${dollars(price)}.`, `You pay with ${dollars(pay)}.`, 'How much change do you get?']
        return mathRiddle({ family: 'money', skill: 'math: making change', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 58 + change / 100, grade, tier }, `num:(${pay}-${price})/100`)
      }
      // Single item, change from a coin or a dollar: multiples of 5 in tier 1, any cents in tier 2.
      const price = tier === 1 ? rng.int(1, 9) * 5 : rng.int(11, 94)
      const payOpts = tier === 1 ? [25, 50, 75, 100].filter(p => p > price) : [50, 75, 100].filter(p => p > price)
      const pay = rng.pick(payOpts)
      const change = pay - price
      // Never make change that equals the price, or the child can read the answer straight off the
      // question without subtracting anything (a 25c toy paid for with 50c).
      if (change === price) return money.make(grade, tier, rng)
      const vals = numDecoys(rng, change, n - 1, [pay + price, change + 5, change - 5, change + 10, change - 10, price, change + 1, change - 1], 8, 1)
      const { fmt, over } = centsFmt([change, ...vals])
      const { choices, answer } = shuffled(rng, fmt(change), vals.map(fmt), n)
      const payText = pay === 100 ? 'one dollar' : pay === 25 ? 'a quarter' : cents(pay)
      const prompt = rng.pick([
        [`${cap(article(item))} ${item} costs ${cents(price)}.`, `You pay with ${payText}.`, 'How much change do you get?'],
        [`${me} buys ${article(item)} ${item} for ${cents(price)}`, `and pays with ${payText}.`, `How much change does ${me} get?`],
        [`You pay ${payText} for ${article(cents(price))} ${cents(price)} ${item}.`, 'What is your change?'],
      ])
      return mathRiddle({ family: 'money', skill: 'math: making change', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 45 + change / 10 + (price % 5 ? 4 : 0), grade, tier }, over ? `num:(${pay}-${price})/100` : `num:${pay}-${price}`)
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
          ? [`${me} buys ${article(item)} ${item} for ${dollars(a)}, ${article(item2)} ${item2}`, `for ${dollars(b)} and a snack for ${dollars(c)}.`, 'How much is that in all?']
          : rng.pick([[`${dollars(a)} + ${dollars(b)} = ?`], [`${me} has ${dollars(a)}. ${other} gives ${me}`, `${dollars(b)} more. How much does ${me} have?`], [`${cap(article(item))} ${item} costs ${dollars(a)} and ${article(item2)} ${item2}`, `costs ${dollars(b)}. What is the total?`]])
        return mathRiddle({ family: 'money', skill: 'math: adding money', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 60 + Math.log2(total / 25) * 2 + (c ? 4 : 0) + (step === 1 ? 6 : step === 5 ? 3 : 0), grade, tier }, `num:(${a}+${b}+${c})/100`)
      }
      const a = r(300, 1999), b = r(100, a - 50)
      const diff = a - b
      // Not exactly half: $10.00 - $5.00 = $5.00 has its answer written in the question.
      if (diff === b) return money.make(grade, tier, rng)
      const decoys = numDecoys(rng, diff, n - 1, [a + b, diff + 100, diff - 100, diff + 25, diff - 25, diff + 10, diff - 10], 50, 1).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(diff), decoys, n)
      const prompt = mode === 'sub'
        ? rng.pick([[`${dollars(a)} - ${dollars(b)} = ?`], [`${cap(article(item))} ${item} costs ${dollars(a)}.`, `${cap(article(item2))} ${item2} costs ${dollars(b)}.`, `How much more does the ${item} cost?`]])
        : [`${me} has ${dollars(a)} and spends ${dollars(b)}`, `on ${article(item)} ${item}. How much is left?`]
      return mathRiddle({ family: 'money', skill: 'math: subtracting money', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 60 + Math.log2(a / 25) * 2 + (step === 1 ? 6 : step === 5 ? 3 : 0), grade, tier }, `num:(${a}-${b})/100`)
    }

    // grade 5: multi-step
    const [me] = twoNames(rng)
    const item = rng.pick(ITEMS), item2 = rng.pick(ITEMS.filter(i => i !== item))
    // Tier 1 is one operation (repeated buying, weekly saving, half price), tier 2 adds a second
    // step (two kinds of item, buying then change), tier 3 fractions and unit price. Two-kind
    // problems used to run in all three tiers, which flattened tiers 1 and 2 to the same measure.
    const mode = rng.pick(tier === 1 ? ['multi', 'save', 'half', 'multi'] : tier === 2 ? ['multiChange', 'twoKinds', 'save', 'twoKinds'] : ['multiChange', 'twoKinds', 'fracOff', 'unit'])
    if (mode === 'multi' || mode === 'multiChange') {
      const k = rng.int(2, 6), price = rng.int(tier === 1 ? 5 : 3, tier === 1 ? 40 : 99) * 5
      const cost = k * price
      if (mode === 'multi') {
        // Near misses are off-by-one products and place-value slips, not "price with the count
        // stuck on as cents" ($9.50 x 4 -> $9.54), which no grade-5 child would ever choose.
        const decoys = numDecoys(rng, cost, n - 1, [(k - 1) * price, (k + 1) * price, cost + 100, cost - 100, Math.round(cost / 10)], 50, 5).map(dollars)
        const { choices, answer } = shuffled(rng, dollars(cost), decoys, n)
        const prompt = [`${me} buys ${k} ${item}s at ${dollars(price)} each.`, 'How much does that cost?']
        return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 80 + k * 2, grade, tier }, `num:(${k}*${price})/100`)
      }
      const pay = Math.ceil(cost / 500) * 500 + (rng.bool() ? 500 : 0)
      const change = pay - cost
      if (change <= 0) return money.make(grade, tier, rng)
      const decoys = numDecoys(rng, change, n - 1, [cost, pay - price, change + price, change - price, change + 100, change - 100], 50, 5).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(change), decoys, n)
      const prompt = [`${me} buys ${k} ${item}s at ${dollars(price)} each`, `and pays with ${dollars(pay)}.`, `How much change does ${me} get?`]
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 86 + k * 2, grade, tier }, `num:(${pay}-${k}*${price})/100`)
    }
    if (mode === 'twoKinds') {
      // Both counts are at least 2: "1 apple at $0.50 each" is not English.
      const k1 = rng.int(2, 5), p1 = rng.int(3, 60) * 5, k2 = rng.int(2, 4), p2 = rng.int(3, 60) * 5
      const total = k1 * p1 + k2 * p2
      // Near misses keep the same order of magnitude: forgetting one multiplication, or using
      // one price for every item. A bare p1 + p2 is far too small to tempt anyone.
      const decoys = numDecoys(rng, total, n - 1, [k1 * p1 + p2, k1 * p1, total + p2, total - p2, (k1 + k2) * p1, total + 100, total - 100], 50, 5).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(total), decoys, n)
      const prompt = [`${me} buys ${k1} ${item}s at ${dollars(p1)} each and`, `${k2} ${item2}s at ${dollars(p2)} each.`, `How much does ${me} spend?`]
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 84 + k1 + k2, grade, tier }, `num:(${k1}*${p1}+${k2}*${p2})/100`)
    }
    if (mode === 'save') {
      const week = rng.int(4, 40) * 25, weeks = rng.int(3, 8)
      const total = week * weeks
      const decoys = numDecoys(rng, total, n - 1, [week * (weeks - 1), week * (weeks + 1), total + week, total - week, Math.round(total / 10)], 100, 25).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(total), decoys, n)
      const prompt = [`${me} saves ${dollars(week)} every week.`, `How much is saved after ${weeks} weeks?`]
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 80 + weeks, grade, tier }, `num:(${week}*${weeks})/100`)
    }
    if (mode === 'half') {
      const price = rng.int(3, 30) * 100 + rng.pick([0, 50])
      const sale = price / 2
      const decoys = numDecoys(rng, sale, n - 1, [price * 2, price - 50, sale + 100, sale - 100, sale + 50], 100, 25).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(sale), decoys, n)
      const prompt = [`${cap(article(item))} ${item} costs ${dollars(price)}. Today it is`, 'half price. What is the sale price?']
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 82, grade, tier }, `num:(${price}/2)/100`)
    }
    if (mode === 'fracOff') {
      // Percent is a grade-6 standard (6.RP.3c); a fifth grader takes a fraction off instead.
      const price = rng.int(2, 30) * 100
      const { den, word } = rng.pick([{ den: 2, word: 'half' }, { den: 4, word: '1/4' }, { den: 5, word: '1/5' }, { den: 10, word: '1/10' }])
      const sale = price - price / den
      const decoys = numDecoys(rng, sale, n - 1, [price / den, price + price / den, sale + 100, sale - 100, price - den * 100], 100, 25).map(dollars)
      const { choices, answer } = shuffled(rng, dollars(sale), decoys, n)
      const prompt = [`${cap(article(item))} ${item} costs ${dollars(price)}. It is on sale`, `for ${word} off. What is the sale price?`]
      return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 90, grade, tier }, `num:(${price}-${price}/${den})/100`)
    }
    // unit price
    const k = rng.pick([2, 3, 4, 5, 6, 8, 10]), unit = rng.int(2, 30) * 5
    const total = k * unit
    const decoys = numDecoys(rng, unit, n - 1, [total, unit + 5, unit - 5, unit * 2, Math.round(total / (k - 1))], 20, 5).map(dollars)
    const { choices, answer } = shuffled(rng, dollars(unit), decoys, n)
    const prompt = [`${k} ${item}s cost ${dollars(total)} altogether.`, `How much does one ${item} cost?`]
    return mathRiddle({ family: 'money', skill: 'math: money problems', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 88 + k, grade, tier }, `num:(${total}/${k})/100`)
  },
}

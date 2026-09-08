import type { Generator, Choice } from '../types'
import { shuffled, choiceCount } from '../types'
import { mathRiddle, sayChoices, clockText, clock24Text, numDecoys, NAMES } from './mathutil'
import type { Rng } from '../../engine/rng'

const clockVisual = (h: number, m: number): Choice => ({ visual: { kind: 'clock', hour: ((h + 11) % 12) + 1, minute: m } })
const norm = (h: number) => ((h + 11) % 12) + 1
/** Minutes (0..719) on a 12-hour clock as "h:mm". */
const t12 = (mins: number) => clockText(norm(Math.floor(((mins % 720) + 720) % 720 / 60) || 12), ((mins % 60) + 60) % 60)
const durText = (mins: number): string => {
  const h = Math.floor(mins / 60), m = mins % 60
  if (h === 0) return `${m} minutes`
  const hs = `${h} hour${h === 1 ? '' : 's'}`
  return m === 0 ? hs : `${hs} ${m} minute${m === 1 ? '' : 's'}`
}
/** Distinct clock-time decoys (12-hour, in minutes) different from the answer. */
function timeDecoys(rng: Rng, ans: number, prefs: number[], count: number, step: number): number[] {
  const out: number[] = []
  const seen = new Set<number>([((ans % 720) + 720) % 720])
  const push = (v: number) => { v = ((v % 720) + 720) % 720; if (!seen.has(v)) { seen.add(v); out.push(v) } }
  for (const p of rng.shuffle(prefs)) { push(p); if (out.length >= count) break }
  let k = 1
  while (out.length < count) { push(ans + k * step); push(ans - k * step); k++ }
  return rng.shuffle(out).slice(0, count)
}
const DAYPARTS: { q: string; a: string; d: string[] }[] = [
  { q: 'When does the sun come up?', a: 'morning', d: ['night', 'evening'] },
  { q: 'When do we see the moon and stars?', a: 'night', d: ['morning', 'afternoon'] },
  { q: 'When do you eat breakfast?', a: 'morning', d: ['afternoon', 'night'] },
  { q: 'When do you eat dinner?', a: 'evening', d: ['morning', 'afternoon'] },
  { q: 'Which part of the day comes first?', a: 'morning', d: ['afternoon', 'night'] },
  { q: 'Which comes right after morning?', a: 'afternoon', d: ['evening', 'night'] },
  { q: 'Which part of the day comes last?', a: 'night', d: ['morning', 'afternoon'] },
  { q: 'When do you go to bed?', a: 'night', d: ['morning', 'afternoon'] },
  { q: 'When is it dark outside?', a: 'night', d: ['morning', 'afternoon'] },
  { q: 'Which comes right before night?', a: 'evening', d: ['morning', 'afternoon'] },
  { q: 'When do you wake up?', a: 'morning', d: ['evening', 'night'] },
  { q: 'When do you eat lunch?', a: 'afternoon', d: ['morning', 'night'] },
]

/** Clocks (K-3), elapsed time (3-5), a.m./p.m. (5). */
export const time: Generator = {
  id: 'time',
  name: 'Telling time',
  area: 'math',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.2, 1: 1.2, 2: 1.2, 3: 1, 4: 1, 5: 0.8 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const skill = 'math: telling time'

    if (grade <= 2) {
      type M = 'whichClock' | 'read' | 'dayparts' | 'words' | 'elapsed'
      const modes: M[] = grade === 0 ? (tier === 1 ? ['whichClock', 'whichClock', 'dayparts'] : tier === 2 ? ['whichClock', 'read', 'dayparts'] : ['whichClock', 'read', 'dayparts'])
        : grade === 1 ? (tier === 1 ? ['read', 'whichClock'] : tier === 2 ? ['read', 'whichClock', 'words'] : ['read', 'whichClock', 'words', 'elapsed'])
          : (tier === 1 ? ['read', 'whichClock'] : tier === 2 ? ['read', 'whichClock', 'words'] : ['read', 'words', 'elapsed'])
      const mode = rng.pick(modes)
      if (mode === 'dayparts') {
        const q = rng.pick(DAYPARTS)
        const { choices, answer } = shuffled(rng, q.a, q.d, n)
        return mathRiddle({ family: 'time', skill: 'math: parts of the day', prompt: [q.q], choices, answer, spoken: `${q.q} ${sayChoices(choices)}?`, metric: 6, grade, tier }, '')
      }
      // Minute granularity by grade/tier.
      const minuteOpts = grade === 0 ? [0] : grade === 1 ? (tier === 1 ? [0] : tier === 2 ? [30] : [0, 30]) : (tier === 1 ? [0, 5, 10, 20, 25, 35, 40, 50, 55] : tier === 2 ? [15, 45, 30, 5, 25, 35, 55] : [5, 10, 15, 20, 25, 35, 40, 45, 50, 55])
      const h = rng.int(1, 12), m = rng.pick(minuteOpts)
      const ans = h * 60 + m
      const metric = grade === 0 ? 8 : grade === 1 ? 15 + (m ? 4 : 0) : 25 + (m % 15 ? 4 : 0) + (m % 30 ? 2 : 0)
      const swapped = m === 0 ? 12 * 60 + h * 5 : Math.floor(m / 5) * 60 + h * 5
      const prefs = [ans + 60, ans - 60, swapped, ans + 30, ans - 30, ans + 5, ans - 5, ans + 15, ans - 15].filter(v => v !== ans)
      if (mode === 'whichClock') {
        const decoyMins = timeDecoys(rng, ans, prefs.filter(v => grade === 0 ? v % 60 === 0 : grade === 1 ? v % 30 === 0 : v % 5 === 0), n - 1, grade === 0 ? 60 : grade === 1 ? 30 : 5)
        const decoys = decoyMins.map(v => clockVisual(Math.floor(v / 60), v % 60))
        const { choices, answer } = shuffled(rng, clockVisual(h, m), decoys, n)
        const said = m === 0 ? `${h} o'clock` : m === 30 && grade <= 1 ? `half past ${h}` : grade === 2 && m === 15 && tier >= 2 ? `quarter past ${h}` : clockText(h, m)
        const prompt = [`Which clock shows ${said}?`]
        return mathRiddle({ family: 'time', skill, prompt, choices, answer, spoken: `${prompt[0]} Look at the clocks and pick one.`, metric, grade, tier }, `num:${h}*60+${m}`)
      }
      if (mode === 'elapsed') {
        const add = rng.int(1, 2)
        const target = (h + add) * 60 + m
        const decoys = timeDecoys(rng, target, [target + 60, target - 60, target - 2 * add * 60, target + 30, target - 30], n - 1, 60)
        const { choices, answer } = shuffled(rng, t12(target), decoys.map(t12), n)
        const prompt = [`It is ${clockText(h, m)} now.`, `What time will it be in ${add} hour${add > 1 ? 's' : ''}?`]
        return mathRiddle({ family: 'time', skill: 'math: elapsed time', prompt, visual: { kind: 'clock', hour: h, minute: m }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: metric + 6, grade, tier }, `num:(${norm(h + add)}*60+${m})`)
      }
      if (mode === 'words') {
        // Another way to say the time.
        const wordsFor = (mins: number): string => { const hh = Math.floor(mins / 60) || 12, mm = mins % 60; return mm === 0 ? `${norm(hh)} o'clock` : mm === 30 ? `half past ${norm(hh)}` : mm === 15 ? `quarter past ${norm(hh)}` : mm === 45 ? `quarter to ${norm(hh + 1)}` : clockText(hh, mm) }
        const allowed = grade === 1 ? [0, 30] : [0, 15, 30, 45]
        const mm = rng.pick(allowed)
        const a = h * 60 + mm
        const decoys = timeDecoys(rng, a, [a + 15, a - 15, a + 30, a - 30, a + 60, a - 60].filter(v => allowed.includes(((v % 60) + 60) % 60)), n - 1, 15)
        const { choices, answer } = shuffled(rng, wordsFor(a), decoys.map(wordsFor), n)
        const prompt = [`The clock shows ${clockText(h, mm)}.`, 'Which is another way to say it?']
        return mathRiddle({ family: 'time', skill, prompt, visual: { kind: 'clock', hour: h, minute: mm }, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: metric + 3 + (mm % 30 ? 2 : 0), grade, tier }, `num:${h}*60+${mm}`)
      }
      // read the clock (text choices)
      const asWords = grade === 0 || (grade === 1 && rng.bool(0.4))
      const txt = (v: number) => { const hh = Math.floor(v / 60) || 12, mm = v % 60; return asWords ? (mm === 0 ? `${norm(hh)} o'clock` : `half past ${norm(hh)}`) : clockText(hh, mm) }
      const decoys = timeDecoys(rng, ans, prefs.filter(v => grade === 0 ? v % 60 === 0 : grade === 1 ? v % 30 === 0 : v % 5 === 0), n - 1, grade === 0 ? 60 : grade === 1 ? 30 : 5)
      const { choices, answer } = shuffled(rng, txt(ans), decoys.map(txt), n)
      const prompt = [rng.pick(['What time does the clock show?', 'What time is it?', 'Look at the clock. What time is it?'])]
      return mathRiddle({ family: 'time', skill, prompt, visual: { kind: 'clock', hour: h, minute: m }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric, grade, tier }, `num:${h}*60+${m}`)
    }

    if (grade === 3) {
      type M = 'read' | 'elapsedH' | 'howLong'
      const modes: M[] = tier === 1 ? ['read', 'elapsedH'] : tier === 2 ? ['read', 'elapsedH', 'howLong'] : ['read', 'elapsedH', 'howLong']
      const mode = rng.pick(modes)
      const toMinute = tier >= 2
      const h = rng.int(1, 12), m = toMinute ? rng.int(1, 59) : rng.int(0, 11) * 5
      if (mode === 'read') {
        const ans = h * 60 + m
        const swapped = Math.floor(m / 5) * 60 + h * 5
        const prefs = [ans + 60, ans - 60, swapped, ans + 5, ans - 5, ans + 10, ans - 10, ans + 1, ans - 1].filter(v => v !== ans)
        const decoys = timeDecoys(rng, ans, prefs, n - 1, 5)
        const { choices, answer } = shuffled(rng, t12(ans), decoys.map(t12), n)
        const prompt = ['What time does the clock show?']
        return mathRiddle({ family: 'time', skill, prompt, visual: { kind: 'clock', hour: h, minute: m }, choices, answer, spoken: `${prompt[0]} ${sayChoices(choices)}?`, metric: 40 + (m % 5 ? 6 : 0), grade, tier }, `num:${h}*60+${m}`)
      }
      const startM = tier === 1 ? 0 : rng.pick([0, 30, 15, 45])
      const hours = rng.int(1, tier === 1 ? 4 : 6)
      if (mode === 'elapsedH') {
        const start = h * 60 + startM
        const target = start + hours * 60
        const decoys = timeDecoys(rng, target, [target + 60, target - 60, start - hours * 60, target + 30, target - 30], n - 1, 60)
        const { choices, answer } = shuffled(rng, t12(target), decoys.map(t12), n)
        const prompt = [`It is ${clockText(h, startM)}.`, `What time is it in ${hours} hour${hours > 1 ? 's' : ''}?`]
        return mathRiddle({ family: 'time', skill: 'math: elapsed time', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric: 42 + hours * 2 + (startM ? 3 : 0) + (h + hours > 12 ? 3 : 0), grade, tier }, `num:(${norm(h + hours)}*60+${startM})`)
      }
      // how many hours between two times
      const endH = norm(h + hours)
      const decoys = numDecoys(rng, hours, n - 1, [hours + 1, hours - 1, hours + 2, Math.abs(endH - h) !== hours ? Math.abs(endH - h) : hours + 3], 2, 1).map(d => `${d} hour${d === 1 ? '' : 's'}`)
      const { choices, answer } = shuffled(rng, `${hours} hour${hours === 1 ? '' : 's'}`, decoys, n)
      const prompt = [`How much time passes from`, `${clockText(h, startM)} to ${clockText(endH, startM)}?`]
      return mathRiddle({ family: 'time', skill: 'math: elapsed time', prompt, choices, answer, spoken: `How much time passes from ${clockText(h, startM)} to ${clockText(endH, startM)}? ${sayChoices(choices)}?`, metric: 44 + hours * 2 + (h + hours > 12 ? 4 : 0), grade, tier }, `num:${hours}*60`)
    }

    if (grade === 4) {
      const name = rng.pick(NAMES)
      const h = rng.int(1, 12)
      let m: number, add: number
      if (tier === 1) { m = rng.int(0, 6) * 5; add = rng.int(1, Math.floor((55 - m) / 5)) * 5 }
      else if (tier === 2) { m = rng.int(6, 11) * 5; add = rng.int(Math.ceil((65 - m) / 5), 11) * 5 }
      else { m = rng.int(0, 11) * 5; add = 60 + rng.int(1, 11) * 5 }
      const start = h * 60 + m, target = start + add
      const crosses = m + add >= 60
      const metric = 55 + (crosses ? 5 : 0) + Math.round(add / 10)
      const mode = rng.pick(['later', 'howLong', 'ends'] as const)
      if (mode === 'howLong') {
        const wrongSub = Math.abs((target % 60) - m) + (Math.floor(target / 60) - h) * 60
        const decoys = numDecoys(rng, add, n - 1, [add + 5, add - 5, add + 10, add - 10, wrongSub, add + 60, add - 60], 10, 5).map(durText)
        const { choices, answer } = shuffled(rng, durText(add), decoys, n)
        const prompt = [`How much time passes from`, `${t12(start)} to ${t12(target)}?`]
        return mathRiddle({ family: 'time', skill: 'math: elapsed time', prompt, choices, answer, spoken: `How much time passes from ${t12(start)} to ${t12(target)}? ${sayChoices(choices)}?`, metric, grade, tier }, `num:${add}`)
      }
      const decoys = timeDecoys(rng, target, [target + 5, target - 5, target + 10, target - 10, target + 60, target - 60, start + (add % 60) - (crosses ? 0 : 60)], n - 1, 5)
      const { choices, answer } = shuffled(rng, t12(target), decoys.map(t12), n)
      const prompt = mode === 'later'
        ? [`It is ${t12(start)}.`, `What time will it be in ${durText(add)}?`]
        : [`${name}'s ${rng.pick(['movie', 'game', 'class', 'lesson', 'trip', 'show'])} starts at ${t12(start)}`, `and lasts ${durText(add)}.`, 'When does it end?']
      return mathRiddle({ family: 'time', skill: 'math: elapsed time', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric, grade, tier }, `num:(${norm(Math.floor(target / 60))}*60+${target % 60})`)
    }

    // grade 5: a.m./p.m. across hours and minutes
    const name = rng.pick(NAMES)
    const startH24 = tier === 1 ? rng.int(7, 11) : rng.int(6, 22)
    const startM = rng.int(0, 11) * 5
    const start = startH24 * 60 + startM
    const add = tier === 1 ? rng.int(1, 4) * 60 + rng.int(0, 11) * 5 : tier === 2 ? rng.int(1, 8) * 60 + rng.int(1, 11) * 5 : rng.int(2, 11) * 60 + rng.int(1, 11) * 5
    const end = start + add
    const crossesNoon = Math.floor(start / 720) !== Math.floor(end / 720)
    const metric = 75 + Math.round(add / 30) + (crossesNoon ? 5 : 0)
    const mode = rng.pick(['later', 'howLong', 'ends'] as const)
    if (mode === 'howLong') {
      const raw12 = Math.abs((end % 720) - (start % 720))
      const decoys = numDecoys(rng, add, n - 1, [add + 30, add - 30, add + 60, add - 60, raw12 !== add ? raw12 : add + 90, 720 - raw12], 30, 5).map(durText)
      const { choices, answer } = shuffled(rng, durText(add), decoys, n)
      const act = rng.pick(['School', 'The trip', 'The show', 'Camp', 'The game', 'Practice'])
      const prompt = [`${act} starts at ${clock24Text(start)} and`, `ends at ${clock24Text(end)}. How long is it?`]
      return mathRiddle({ family: 'time', skill: 'math: elapsed time', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric, grade, tier }, `num:(${Math.floor(end / 60)}*60+${end % 60})-(${startH24}*60+${startM})`)
    }
    const decoys = numDecoys(rng, end, n - 1, [end + 60, end - 60, end + 720, end - 720, end + 30, end - 30, end + 5, end - 5], 60, 0, 2879).map(clock24Text)
    const { choices, answer } = shuffled(rng, clock24Text(end), decoys, n)
    const prompt = mode === 'later'
      ? [`It is ${clock24Text(start)}. What time will`, `it be in ${durText(add)}?`]
      : [`${name}'s ${rng.pick(['flight', 'train', 'bus', 'movie', 'game'])} starts at ${clock24Text(start)}`, `and lasts ${durText(add)}.`, 'When does it end?']
    return mathRiddle({ family: 'time', skill: 'math: elapsed time', prompt, choices, answer, spoken: `${prompt.join(' ')} ${sayChoices(choices)}?`, metric, grade, tier }, `num:${startH24}*60+${startM}+${add}`)
  },
}

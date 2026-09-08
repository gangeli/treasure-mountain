import type { Generator } from '../types'
import { riddle, shuffled, choiceCount } from '../types'
import { RIDDLES } from '../data/riddles'
import { bandedSource } from './thinkingUtil'

const OPENERS = ['Riddle, riddle, guess me true!', 'Listen close, here is a clue:', 'Hear my riddle, if you please:', 'A riddle from the elf for you:']
const CLOSERS = ['What am I?', 'Can you guess what I am?', 'Tell me, what am I?', 'Do you know what I am?']
const PLAIN_OPENERS = ['Here is a riddle for you.', 'Think carefully about this one.', 'A tricky riddle, climber!']

/** Classic "what am I?" riddles: concrete for K-1, classic for 2-3, wordplay and lateral thinking for 4-5. */
export const riddles: Generator = {
  id: 'riddles',
  name: 'Riddles',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1, 1: 1.2, 2: 1.5, 3: 1.5, 4: 1.5, 5: 1.5 },
  make(grade, tier, rng) {
    // Tier 1/2/3 draw disjoint bands, so a riddle never shows up at two tiers of the same grade and
    // the next grade's hardest riddles never leak downwards.
    const src = bandedSource(grade, tier, rng)
    const pool = RIDDLES.filter(r => r.level === src.level && src.bands.includes(r.band))
    const entry = rng.pick(pool)
    const n = choiceCount(grade)
    const { choices, answer } = shuffled(rng, entry.a, rng.shuffle(entry.d), n)
    const isQuestion = /\?$/.test(entry.lines[entry.lines.length - 1])
    const clues = entry.lines
    let prompt: string[]
    if (entry.verse) {
      const opener = clues.length <= 3 && rng.bool(0.6) ? [rng.pick(OPENERS)] : []
      prompt = [...opener, ...clues, ...(isQuestion ? [] : [rng.pick(CLOSERS)])]
    } else {
      const opener = clues.length <= 3 && rng.bool(0.3) ? [rng.pick(PLAIN_OPENERS)] : []
      prompt = [...opener, ...clues, ...(isQuestion ? [] : [rng.pick(CLOSERS)])]
    }
    const clueText = clues.join(' ')
    return riddle({
      family: 'riddles', skill: 'thinking: riddles', prompt, verse: entry.verse, choices, answer,
      spoken: `${clueText}${isQuestion ? '' : ' What am I?'} ${choices.map(c => c.text).join(', ')}?`,
      metric: entry.level * 10 + (entry.band - 1) * 3 + Math.min(3, clueText.length / 30), grade, tier,
      key: `riddles|${entry.a}|${clues[0]}`,
    })
  },
}

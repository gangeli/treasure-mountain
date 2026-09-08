import type { Generator, Grade, Tier } from '../types'
import type { Rng } from '../../engine/rng'
import { riddle, shuffled, choiceCount, cap } from '../types'
import { OPPOSITES, type Opposite } from '../data/opposites'
import { SYNONYMS } from '../data/synonyms'
import { relatedTo, sameRoot, isAmbiguous, tooClose, isNegationPair, AFFIX_WORDS } from '../data/vocab'

const fits = (lines: string[]): boolean => lines.every(l => l.length <= 46)
const lower = (s: string) => s.toLowerCase()
/** 0..17: the difficulty band of a (grade, tier) pool. Pools are disjoint, so bands never overlap. */
const bandOf = (grade: Grade, tier: Tier): number => grade * 3 + (tier - 1)

/** The words of a pair that may be *asked about*: a multi-sense word only when the pair pins its sense. */
const askable = (p: Opposite): string[] => [p.a, p.b].filter(w => !isAmbiguous(w) || p.gloss?.[w])

interface Cand { w: string; g: Grade }

/**
 * Decoys that are never a second right answer: not related to the asked word or the answer at any
 * strength (two hops through the whole data set), never multi-sense (no sense pin on a choice),
 * never a word the prompt just used, and never close enough to another decoy to cancel it out.
 */
function pickDecoys(cands: Cand[], need: number, banned: Set<string>, avoid: string[]): string[] {
  const out: string[] = []
  for (const c of cands) {
    if (isAmbiguous(c.w) || banned.has(lower(c.w))) continue
    if (avoid.some(a => tooClose(a, c.w) || sameRoot(a, c.w))) continue
    if (out.some(d => tooClose(d, c.w))) continue
    out.push(c.w)
    if (out.length >= need) break
  }
  return out
}

/** Same part of speech, nearest grade band first, then affix-shaped or answer-length lookalikes. */
function candidates(rng: Rng, grade: Grade, pos: string, answerW: string, affixItem: boolean, span: number): Cand[] {
  const raw: Cand[] = OPPOSITES.filter(p => p.pos === pos && Math.abs(p.grade - grade) <= span)
    .flatMap(p => [{ w: p.a, g: p.grade }, { w: p.b, g: p.grade }])
  const score = (c: Cand) => 10 * Math.abs(c.g - grade) +
    (answerW.endsWith('ly') && !c.w.endsWith('ly') ? 5 : 0) +
    (affixItem ? (AFFIX_WORDS.has(lower(c.w)) ? 0 : 4) : Math.min(4, Math.abs(c.w.length - answerW.length)))
  return rng.shuffle(raw).sort((x, y) => score(x) - score(y))
}

/** Two words that could never be read as opposites: unrelated, and sharing no scale at all. */
const unrelatedPair = (x: string, y: string): boolean => {
  if (tooClose(x, y) || isAmbiguous(x) || isAmbiguous(y)) return false
  const rx = relatedTo(x)
  for (const w of relatedTo(y)) if (rx.has(w)) return false
  return true
}

/** Antonyms: concrete pairs for K-1, wider for 2-3, abstract and academic for 4-5 (with "which pair" at the top tiers). */
export const opposites: Generator = {
  id: 'opposites',
  name: 'Opposites',
  area: 'reading',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1, 1: 1.3, 2: 1.3, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const band = bandOf(grade, tier)
    // One disjoint pool per (grade, tier): tier 3 can never draw what tier 1 could.
    const pool = OPPOSITES.filter(p => p.grade === grade && p.tier === tier)
    const pairText = (a: string, b: string) => `${a} / ${b}`
    const pairMode = grade >= 4 && (tier === 3 ? rng.bool(0.4) : tier === 2 && grade === 5 && rng.bool(0.25))

    if (pairMode) {
      const target = rng.pick(pool.filter(p => pairText(p.a, p.b).length <= 26 && askable(p).length > 0))
      const related = new Set([...relatedTo(target.a), ...relatedTo(target.b)])
      const clean = (w: string) => !isAmbiguous(w) && !related.has(lower(w)) && !sameRoot(w, target.a) && !sameRoot(w, target.b)
      const decoys: string[] = []
      // Decoys 1-2: synonym pairs - they look like a word pair but mean the same, never the opposite.
      const synGroups = rng.shuffle(SYNONYMS.filter(g => Math.abs(g.grade - grade) <= 1 && g.words.filter(clean).length >= 2))
      for (const g of synGroups.slice(0, 2)) {
        const [x, y] = rng.sample(g.words.filter(clean), 2)
        if (pairText(x, y).length <= 26) decoys.push(pairText(x, y))
      }
      // Decoys 3+: two words that share no scale at all, so neither reading makes them opposites.
      const words = rng.shuffle(OPPOSITES.filter(p => Math.abs(p.grade - grade) <= 1 && p.pos === target.pos).flatMap(p => [p.a, p.b])).filter(clean)
      for (let i = 0; i + 1 < words.length && decoys.length < n + 2; i += 2) {
        const x = words[i], y = words[i + 1]
        if (!unrelatedPair(x, y) || pairText(x, y).length > 26) continue
        decoys.push(pairText(x, y))
      }
      const { choices, answer } = shuffled(rng, pairText(target.a, target.b), rng.shuffle(decoys), n)
      const prompt = ['Which pair of words are opposites?']
      return riddle({
        family: 'opposites', skill: 'vocabulary: antonyms', prompt, choices, answer,
        spoken: `Which pair of words are opposites? ${choices.map(c => (c.text ?? '').replace(' / ', ' and ')).join(', ')}?`,
        metric: 10 + band * 6 + 8 + Math.max(target.a.length, target.b.length), grade, tier,
        key: `opposites-pair|${grade}|${tier}|${[target.a, target.b].sort().join('-')}`,
      })
    }

    const pair: Opposite = rng.pick(pool.filter(p => askable(p).length > 0))
    const asked = askable(pair)
    // Ask about the plainer word where there is a choice: the answer may be advanced, the question should not.
    const word = asked.length > 1 && rng.bool(0.6) ? asked.reduce((a, b) => (b.length < a.length ? b : a)) : rng.pick(asked)
    const answerW = word === pair.a ? pair.b : pair.a
    const gloss = pair.gloss?.[word]
    const banned = new Set([...relatedTo(word), ...relatedTo(answerW)])
    const affixItem = isNegationPair(word, answerW)

    // Verse for the little ones: two extra opposite pairs prime the idea before the question.
    let intro: Opposite[] = []
    const verse = grade <= 2 && !gloss && rng.bool(0.6)
    if (verse) {
      intro = rng.shuffle(OPPOSITES.filter(p => p.grade <= grade && p !== pair && !isAmbiguous(p.a) && !isAmbiguous(p.b)))
        .filter(p => ![p.a, p.b].some(w => banned.has(lower(w)) || sameRoot(w, word) || sameRoot(w, answerW)))
        .slice(0, 2)
    }
    // A word the priming couplet just said must not turn up as a choice.
    const primed = intro.flatMap(p => [p.a, p.b])
    const avoid = [word, answerW, ...primed]

    let decoys: string[] = []
    for (const span of [1, 2, 5]) {
      decoys = pickDecoys(candidates(rng, grade, pair.pos, answerW, affixItem, span), n + 1, banned, avoid)
      if (decoys.length >= n - 1) break
    }
    if (decoys.length < n - 1) {
      const any = rng.shuffle(OPPOSITES.flatMap(p => [{ w: p.a, g: p.grade }, { w: p.b, g: p.grade }] as Cand[]))
      decoys = [...decoys, ...pickDecoys(any, n + 1, banned, [...avoid, ...decoys])]
    }
    const { choices, answer } = shuffled(rng, answerW, decoys, n)
    const list = choices.map(c => c.text).join(', ')

    let prompt: string[]
    const glossLine = gloss ? [`(${word} = ${gloss})`] : []
    if (verse && intro.length === 2) {
      const v = rng.int(0, 1)
      prompt = v === 0
        ? [`${cap(word)} is the word I say.`, 'Its opposite, please, today!']
        : [`${cap(intro[0].a)} and ${intro[0].b}, ${intro[1].a} and ${intro[1].b}:`, 'Opposites, you see!', `Now the opposite of ${word},`, 'Please pick it out for me.']
      if (!fits(prompt)) prompt = [`${cap(word)} is the word I say.`, 'Its opposite, please, today!']
    } else {
      const options = [
        [`What is the opposite of ${word}?`, ...glossLine],
        [`The opposite of ${word} is ___.`, ...glossLine],
        [`Which word means the opposite of ${word}?`, ...glossLine],
        ...(grade >= 4 ? [[`Which word is an antonym of ${word}?`, ...glossLine]] : []),
      ].filter(fits)
      prompt = rng.pick(options)
    }
    return riddle({
      family: 'opposites', skill: grade >= 4 ? 'vocabulary: antonyms' : 'vocabulary: opposites',
      prompt, verse: verse && intro.length === 2, highlight: [word], choices, answer,
      spoken: `What is the opposite of ${word}${gloss ? `, meaning ${gloss}` : ''}? ${list}?`,
      metric: 10 + band * 6 + answerW.length, grade, tier,
      key: `opposites|${grade}|${tier}|${[pair.a, pair.b].sort().join('-')}`,
    })
  },
}

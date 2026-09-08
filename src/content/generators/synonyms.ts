import type { Generator, Grade, Tier } from '../types'
import type { Rng } from '../../engine/rng'
import { riddle, shuffled, choiceCount, cap, sayChoices} from '../types'
import { SYNONYMS, type SynGroup } from '../data/synonyms'
import { OPPOSITES } from '../data/opposites'
import { relatedTo, sameRoot, isAmbiguous, tooClose } from '../data/vocab'

const fits = (lines: string[]): boolean => lines.every(l => l.length <= 46)
const lower = (s: string) => s.toLowerCase()
/** 0..17: the difficulty band of a (grade, tier) pool. Pools are disjoint, so bands never overlap. */
const bandOf = (grade: Grade, tier: Tier): number => grade * 3 + (tier - 1)

/** The words of a group that may be *asked about*: a multi-sense word only when the group pins its sense. */
const askable = (g: SynGroup): string[] => g.words.filter(w => !isAmbiguous(w) || g.gloss?.[w])

interface Cand { w: string; g: Grade }

/**
 * Decoys that are never a second right answer: not a synonym or antonym of the asked word or of the
 * answer at any strength (two hops through the whole data set), never multi-sense, and never close
 * enough to another decoy for the two to cancel each other out.
 */
function pickDecoys(cands: Cand[], need: number, banned: Set<string>, avoid: string[]): string[] {
  const out: string[] = []
  for (const c of cands) {
    if (isAmbiguous(c.w) || banned.has(lower(c.w))) continue
    if (avoid.some(a => tooClose(a, c.w))) continue
    if (out.some(d => tooClose(d, c.w))) continue
    out.push(c.w)
    if (out.length >= need) break
  }
  return out
}

/** Same part of speech, nearest grade band first, then words of about the answer's length. */
function candidates(rng: Rng, grade: Grade, group: SynGroup, answerW: string, span: number): Cand[] {
  const raw: Cand[] = SYNONYMS.filter(g => g !== group && g.pos === group.pos && Math.abs(g.grade - grade) <= span)
    .flatMap(g => g.words.map(w => ({ w, g: g.grade })))
  const score = (c: Cand) => 10 * Math.abs(c.g - grade) +
    (answerW.endsWith('ly') && !c.w.endsWith('ly') ? 5 : 0) + Math.min(4, Math.abs(c.w.length - answerW.length))
  return rng.shuffle(raw).sort((x, y) => score(x) - score(y))
}

/** Two words that could never be read as meaning the same: unrelated, sharing no scale at all. */
const unrelatedPair = (x: string, y: string): boolean => {
  if (tooClose(x, y) || isAmbiguous(x) || isAmbiguous(y)) return false
  const rx = relatedTo(x)
  for (const w of relatedTo(y)) if (rx.has(w)) return false
  return true
}

/** Synonyms: big/large (grade 1), shades of meaning (grade 3), academic vocabulary (grades 4-5). */
export const synonyms: Generator = {
  id: 'synonyms',
  name: 'Synonyms',
  area: 'reading',
  grades: [1, 2, 3, 4, 5],
  weight: { 1: 1, 2: 1.2, 3: 1.2, 4: 1.2, 5: 1.2 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const band = bandOf(grade, tier)
    // One disjoint pool per (grade, tier): a pair asked at grade 3 never comes back at grade 4.
    const pool = SYNONYMS.filter(g => g.grade === grade && g.tier === tier)
    const pairText = (a: string, b: string) => `${a} / ${b}`
    const pairMode = grade >= 4 && (tier === 3 ? rng.bool(0.4) : tier === 2 && rng.bool(0.2))

    if (pairMode) {
      const usable = pool.filter(g => g.words.some((x, i) => g.words.some((y, j) => i < j && pairText(x, y).length <= 26)))
      const group = rng.pick(usable)
      const pairs = group.words.flatMap((x, i) => group.words.slice(i + 1).map(y => pairText(x, y))).filter(t => t.length <= 26)
      const answerT = rng.pick(pairs)
      const related = new Set(group.words.flatMap(w => [...relatedTo(w)]))
      const clean = (w: string) => !isAmbiguous(w) && !related.has(lower(w)) && !group.words.some(g => sameRoot(g, w))
      const decoys: string[] = []
      // Decoys 1-2: real antonym pairs - two words that are related, but the wrong way round.
      const ants = rng.shuffle(OPPOSITES.filter(p => Math.abs(p.grade - grade) <= 1 && p.pos === group.pos &&
        clean(p.a) && clean(p.b) && pairText(p.a, p.b).length <= 26))
      for (const p of ants.slice(0, 2)) decoys.push(pairText(p.a, p.b))
      // Decoys 3+: two words that share no scale at all, so they mean neither the same nor the opposite.
      const words = rng.shuffle(SYNONYMS.filter(g => g !== group && Math.abs(g.grade - grade) <= 1 && g.pos === group.pos).flatMap(g => g.words)).filter(clean)
      for (let i = 0; i + 1 < words.length && decoys.length < n + 2; i += 2) {
        const x = words[i], y = words[i + 1]
        if (!unrelatedPair(x, y) || pairText(x, y).length > 26) continue
        decoys.push(pairText(x, y))
      }
      const { choices, answer } = shuffled(rng, answerT, rng.shuffle(decoys), n)
      const prompt = ['Which pair of words are synonyms?', '(Words that mean almost the same.)']
      return riddle({
        family: 'synonyms', skill: 'vocabulary: synonyms', prompt, choices, answer,
        spoken: `Which pair of words are synonyms, words that mean almost the same? ${sayChoices(choices, c => (c.text ?? '').replace(' / ', ' and '))}?`,
        metric: 10 + band * 6 + 8 + answerT.length / 2, grade, tier,
        key: `synonyms-pair|${grade}|${tier}|${answerT.split(' / ').sort().join('-')}`,
      })
    }

    const group: SynGroup = rng.pick(pool.filter(g => askable(g).length > 0))
    const asked = askable(group)
    // Ask about the plainer word where there is a choice: the answer may be advanced, the question should not.
    const word = asked.length > 1 && rng.bool(0.6) ? asked.reduce((a, b) => (b.length < a.length ? b : a)) : rng.pick(asked)
    const answerW = rng.pick(group.words.filter(w => w !== word))
    const gloss = group.gloss?.[word]
    const banned = new Set([...relatedTo(word), ...relatedTo(answerW)])
    const avoid = [word, answerW, ...group.words]

    let decoys: string[] = []
    for (const span of [1, 2, 5]) {
      decoys = pickDecoys(candidates(rng, grade, group, answerW, span), n + 1, banned, avoid)
      if (decoys.length >= n - 1) break
    }
    if (decoys.length < n - 1) {
      const any = rng.shuffle(SYNONYMS.filter(g => g !== group).flatMap(g => g.words.map(w => ({ w, g: g.grade } as Cand))))
      decoys = [...decoys, ...pickDecoys(any, n + 1, banned, [...avoid, ...decoys])]
    }
    const { choices, answer } = shuffled(rng, answerW, decoys, n)
    const list = sayChoices(choices)

    let prompt: string[]
    const glossLine = gloss ? [`(${word} = ${gloss})`] : []
    const verse = grade <= 2 && !gloss && rng.bool(0.5)
    // A verse that contains the answer answers itself: "This little word game!" wanting "little".
    const says = (lines: string[]): boolean => new RegExp(`\\b${(choices[answer].text ?? '').toLowerCase()}\\b`).test(lines.join(' ').toLowerCase())
    if (verse) {
      const vs = [
        [`Another word for ${word}:`, 'Do you know one? Think it through.', `Which word here means ${word}?`, "Pick it and I'll cheer for you!"],
        [`${cap(word)}, ${word}, ${word}!`, 'Which word means the same?', 'Find it here and you will win', 'This little word game!'],
      ].filter(pp => fits(pp) && !says(pp))
      prompt = vs.length ? rng.pick(vs) : [`Another word for ${word} is ___.`]
    } else {
      const options = [
        [`Another word for ${word} is ___.`, ...glossLine],
        [`Which word means almost the same as ${word}?`, ...glossLine],
        [`Which word means about the same as ${word}?`, ...glossLine],
        ...(grade >= 4 ? [[`Which word is a synonym of ${word}?`, ...glossLine]] : []),
      ].filter(pp => fits(pp) && !says(pp))
      prompt = options.length ? rng.pick(options) : [`Another word for ${word} is ___.`]
    }
    return riddle({
      family: 'synonyms', skill: 'vocabulary: synonyms', prompt, verse, highlight: [word], choices, answer,
      spoken: `Which word means almost the same as ${word}${gloss ? `, meaning ${gloss}` : ''}? ${list}?`,
      metric: 10 + band * 6 + answerW.length, grade, tier,
      key: `synonyms|${grade}|${tier}|${[word, answerW].sort().join('-')}`,
    })
  },
}

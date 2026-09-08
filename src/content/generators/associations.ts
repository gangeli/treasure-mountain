import type { Generator, Grade, Tier } from '../types'
import { riddle, shuffled, choiceCount, cap, an } from '../types'
import { ASSOCIATIONS, type Assoc, type Rel } from '../data/associations'

interface Plan { rels: Rel[]; levels: number[]; rev: number }

/** Relations, data levels and how often the question is reversed ("Who lives in a nest?"). */
function planFor(grade: Grade, tier: Tier): Plan {
  const table: Record<Grade, Plan[]> = {
    0: [{ rels: ['lives', 'sound'], levels: [1], rev: 0 }, { rels: ['lives', 'sound', 'does'], levels: [1], rev: 0.2 }, { rels: ['lives', 'does', 'sound'], levels: [1, 2], rev: 0.3 }],
    1: [{ rels: ['lives', 'sound', 'does'], levels: [1, 2], rev: 0.2 }, { rels: ['lives', 'does', 'works'], levels: [2], rev: 0.3 }, { rels: ['does', 'works', 'uses'], levels: [2], rev: 0.3 }],
    2: [{ rels: ['does', 'works', 'uses'], levels: [2], rev: 0.2 }, { rels: ['works', 'uses'], levels: [2, 3], rev: 0.3 }, { rels: ['works', 'uses'], levels: [3], rev: 0.5 }],
    3: [{ rels: ['uses', 'works'], levels: [3], rev: 0.3 }, { rels: ['uses', 'part'], levels: [3], rev: 0.4 }, { rels: ['part', 'uses'], levels: [3, 4], rev: 0.5 }],
    4: [{ rels: ['part'], levels: [3, 4], rev: 0.3 }, { rels: ['part', 'function'], levels: [4], rev: 0.4 }, { rels: ['function', 'part'], levels: [4], rev: 0.5 }],
    5: [{ rels: ['part', 'function'], levels: [4], rev: 0.3 }, { rels: ['function'], levels: [4], rev: 0.5 }, { rels: ['function'], levels: [4], rev: 0.6 }],
  }
  return table[grade][tier - 1]
}

const REL_RANK: Record<Rel, number> = { sound: 1, lives: 1.5, does: 2, works: 3, uses: 3.5, part: 4.5, function: 5.5 }
const SKILL: Record<Rel, string> = {
  lives: 'vocabulary: where it lives', sound: 'vocabulary: animal sounds', does: 'vocabulary: what it does',
  works: 'vocabulary: where people work', uses: 'vocabulary: who uses what', part: 'vocabulary: part and whole', function: 'vocabulary: what it is used for',
}

const same = (x: string, y: string): boolean => x.toLowerCase() === y.toLowerCase()
/** "a nest", "the ocean", "Antarctica" — the article a home/workplace/whole takes. */
const withArt = (w: string, art?: string): string => art === undefined ? an(w) : art === '' ? w : `${art} ${w}`
const artOf = (p: Assoc): string => p.art === undefined ? an(p.b).split(' ')[0] : p.art
const PLURAL = new Set(['drumsticks', 'wire cutters', 'scissors', 'binoculars', 'pliers'])
const subject = (p: Assoc): string => p.art !== undefined && (p.rel === 'does' || p.rel === 'sound') ? withArt(p.a, p.art) : an(p.a)
const toolArt = (w: string): string => PLURAL.has(w) ? w : an(w)

/** Every acceptable answer for `p` (its own answer, `also`, and other pairs with the same subject and relation). */
function acceptable(p: Assoc): Set<string> {
  const out = new Set<string>([p.b.toLowerCase(), ...(p.also ?? []).map(x => x.toLowerCase())])
  for (const q of ASSOCIATIONS) if (q.rel === p.rel && same(q.a, p.a)) { out.add(q.b.toLowerCase()); for (const x of q.also ?? []) out.add(x.toLowerCase()) }
  return out
}

/** Where it lives / what it says / does / where it works / what it uses / part of / used for. */
export const associations: Generator = {
  id: 'associations',
  name: 'Word associations',
  area: 'reading',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1.5, 1: 1.3, 2: 1.2, 3: 1, 4: 1, 5: 1 },
  make(grade, tier, rng) {
    const n = choiceCount(grade)
    const plan = planFor(grade, tier)
    const rel = rng.pick(plan.rels)
    const pool = ASSOCIATIONS.filter(p => p.rel === rel && plan.levels.includes(p.level))
    const p = rng.pick(pool)
    const rev = rng.bool(plan.rev)
    const peers = rng.shuffle(ASSOCIATIONS.filter(q => q.rel === rel && q !== p && Math.abs(q.level - p.level) <= 1))
    const verse = grade <= 2 && rng.bool(0.5)
    const metric = REL_RANK[rel] * 10 + p.level * 5 + (rev ? 3 : 0)
    const spokenList = (choices: { text?: string }[]) => choices.map(c => c.text ?? '').join(', ')

    if (rev) {
      // "Who lives in a nest?" — decoys are subjects for which the answer is not acceptable.
      const ok = peers.filter(q => !same(q.a, p.a) && !acceptable(q).has(p.b.toLowerCase()) && (rel !== 'part' || q.dom !== p.dom))
      const decoys = ok.map(q => q.a).filter(w => w.length <= 26)
      const { choices, answer } = shuffled(rng, p.a, decoys, n)
      const b = p.b
      const prompt: string[] = rel === 'lives' ? [`Who lives in ${withArt(b, p.art)}?`]
        : rel === 'sound' ? [`Who says "${b}"?`]
          : rel === 'does' ? [`Which one ${b}?`]
            : rel === 'works' ? [`Who works in ${withArt(b, p.art)}?`]
              : rel === 'uses' ? [`Who uses ${toolArt(b)}?`]
                : rel === 'part' ? [`Which one is part of ${withArt(b, p.art)}?`]
                  : ['Which one is used for', `${b}?`]
      return riddle({
        family: 'associations', skill: SKILL[rel], prompt, highlight: [b], choices, answer,
        spoken: `${prompt.join(' ')} ${spokenList(choices)}?`, metric, grade, tier,
      })
    }

    const banned = acceptable(p)
    const okPeers = peers.filter(q => !banned.has(q.b.toLowerCase()) && (rel !== 'part' || q.dom !== p.dom))
    const decoyPairs = okPeers.filter(q => q.b.length <= 26)
    // Fill-in-the-blank only when every choice takes the same article as the answer ("A bird lives in a ___").
    const sameArt = decoyPairs.filter(q => artOf(q) === artOf(p))
    const useFill = (rel === 'lives' || rel === 'works' || rel === 'part' || rel === 'uses') && sameArt.length >= n - 1 && rng.bool(0.6)
    const fromPairs = useFill ? sameArt : decoyPairs
    const { choices, answer } = shuffled(rng, p.b, fromPairs.map(q => q.b), n)
    const art = artOf(p)
    const blank = art ? `${art} ___` : '___'
    let prompt: string[]
    if (rel === 'lives') {
      prompt = verse ? [`Where does ${subject(p)} live?`, 'Tell me if you can,', 'Then I will be', 'Your biggest fan!']
        : useFill ? [`${cap(subject(p))} lives in ${blank}.`] : [`Where does ${subject(p)} live?`]
    } else if (rel === 'sound') {
      prompt = verse ? ['Listen, listen! What do you hear?', `${cap(subject(p))} says ___, loud and clear!`] : [`What does ${subject(p)} say?`]
    } else if (rel === 'does') {
      prompt = verse ? [`What does ${subject(p)} do all day?`, 'Pick the word and be on your way!'] : [`What does ${subject(p)} do?`]
    } else if (rel === 'works') {
      prompt = useFill ? [`${cap(an(p.a))} works in ${blank}.`] : [`Where does ${an(p.a)} work?`]
    } else if (rel === 'uses') {
      prompt = useFill ? [`${cap(an(p.a))} uses ${blank}.`] : [`What does ${an(p.a)} use?`]
    } else if (rel === 'part') {
      prompt = useFill ? [`${cap(an(p.a))} is part of ${blank}.`] : [`What is ${an(p.a)} part of?`]
    } else {
      prompt = [`What is ${an(p.a)} used for?`]
    }
    const spoken = rel === 'lives' ? `Where does ${subject(p)} live?` : rel === 'sound' ? `What does ${subject(p)} say?` : rel === 'does' ? `What does ${subject(p)} do?`
      : rel === 'works' ? `Where does ${an(p.a)} work?` : rel === 'uses' ? `What does ${an(p.a)} use?` : rel === 'part' ? `What is ${an(p.a)} part of?` : `What is ${an(p.a)} used for?`
    return riddle({
      family: 'associations', skill: SKILL[rel], prompt, verse: verse && (rel === 'lives' || rel === 'sound' || rel === 'does'), highlight: [p.a], choices, answer,
      spoken: `${spoken} ${spokenList(choices)}?`, metric, grade, tier,
    })
  },
}

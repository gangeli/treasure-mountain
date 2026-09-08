import { Rng } from '../engine/rng'
import type { Grade } from '../content/types'
import { LOOP_W, wrapX } from './layout'

export type LevelNo = 1 | 2 | 3

/** Scenery kinds, by level. Singular and plural names; which descriptors can be drawn for them. */
export interface KindDef { kind: string; plural: string; descriptors: string[]; levels: LevelNo[]; width: number }

export const KINDS: KindDef[] = [
  { kind: 'tree', plural: 'trees', descriptors: ['small', 'big', 'tall', 'round'], levels: [1], width: 110 },
  { kind: 'bush', plural: 'bushes', descriptors: ['small', 'big', 'round', 'green'], levels: [1, 2], width: 90 },
  { kind: 'rock', plural: 'rocks', descriptors: ['small', 'big', 'round', 'grey', 'brown'], levels: [1, 2, 3], width: 80 },
  { kind: 'flower', plural: 'flowers', descriptors: ['red', 'yellow', 'blue', 'purple', 'tall', 'small'], levels: [1, 2], width: 50 },
  { kind: 'mushroom', plural: 'mushrooms', descriptors: ['red', 'blue', 'spotted', 'small', 'big'], levels: [1], width: 60 },
  { kind: 'log', plural: 'logs', descriptors: ['short', 'long', 'brown'], levels: [1], width: 120 },
  { kind: 'stump', plural: 'stumps', descriptors: ['small', 'big', 'brown'], levels: [1, 3], width: 70 },
  { kind: 'fern', plural: 'ferns', descriptors: ['green', 'small', 'big'], levels: [1], width: 80 },
  { kind: 'boulder', plural: 'boulders', descriptors: ['big', 'round', 'grey', 'brown'], levels: [2], width: 120 },
  { kind: 'lantern', plural: 'lanterns', descriptors: ['red', 'yellow', 'green', 'small', 'tall'], levels: [2], width: 50 },
  { kind: 'sign', plural: 'signs', descriptors: ['round', 'yellow', 'blue', 'small', 'tall'], levels: [2], width: 70 },
  { kind: 'nest', plural: 'nests', descriptors: ['small', 'big', 'round', 'brown'], levels: [2], width: 80 },
  { kind: 'fence', plural: 'fences', descriptors: ['short', 'tall', 'brown', 'white'], levels: [2], width: 120 },
  { kind: 'cart', plural: 'carts', descriptors: ['small', 'big', 'red', 'brown'], levels: [2], width: 110 },
  { kind: 'crystal', plural: 'crystals', descriptors: ['purple', 'blue', 'green', 'tall', 'small'], levels: [2, 3], width: 60 },
  { kind: 'pine', plural: 'pines', descriptors: ['small', 'tall', 'snowy', 'green'], levels: [3], width: 100 },
  { kind: 'shovel', plural: 'shovels', descriptors: ['red', 'blue', 'yellow', 'tall', 'short'], levels: [3], width: 50 },
  { kind: 'snowman', plural: 'snowmen', descriptors: ['small', 'big', 'round'], levels: [3], width: 90 },
  { kind: 'icicle', plural: 'icicles', descriptors: ['long', 'short', 'blue', 'white'], levels: [3], width: 50 },
  { kind: 'gem', plural: 'gems', descriptors: ['red', 'blue', 'green', 'big', 'small'], levels: [3], width: 60 },
  { kind: 'flag', plural: 'flags', descriptors: ['red', 'blue', 'yellow', 'tall', 'short'], levels: [3], width: 50 },
]

export const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four']

export interface Group {
  id: number
  x: number          // centre on the loop
  count: number
  descriptor: string
  kind: string
  width: number
  /** What is hidden behind the group. */
  hides: 'key' | 'treasure' | null
  /** Set once a coin has been dropped here. */
  searched: boolean
  /** Treasure id if it hides one (for the prize art). */
  treasure?: string
}

export interface Feature { type: 'clubhouse' | 'netrock' | 'tunnel' | 'keyhole' | 'secret' | 'bridge' | 'fountain' | 'castledoor' | 'coincache'; x: number; width: number; pair?: number }

export interface Level {
  no: LevelNo
  seed: number
  groups: Group[]
  features: Feature[]
  target: { count: number; descriptor: string; kind: string }
  clueWords: { number: string; descriptor: string; object: string }
  treasures: number
  netPrice: number
}

export const TREASURE_NAMES = ['lamp', 'balloon', 'boxcar', 'teddy bear', 'kite', 'drum', 'top', 'robot', 'sailboat', 'trumpet', 'yo-yo', 'rocket', 'doll', 'ball', 'crown jewel', 'music box', 'puzzle', 'paint set', 'toy car', 'jack-in-the-box']

const kindsFor = (level: LevelNo, grade: Grade): KindDef[] => {
  const base = KINDS.filter(k => k.levels.includes(level))
  // Youngest players get the most concrete kinds.
  if (grade <= 1) return base.filter(k => ['tree', 'bush', 'rock', 'flower', 'mushroom', 'boulder', 'lantern', 'nest', 'fence', 'pine', 'shovel', 'snowman', 'gem', 'flag', 'log', 'stump', 'sign', 'cart', 'crystal', 'icicle', 'fern'].includes(k.kind))
  return base
}

const descriptorsFor = (k: KindDef, grade: Grade): string[] => {
  if (grade <= 1) return k.descriptors.filter(d => ['small', 'big', 'tall', 'red', 'yellow', 'blue', 'green', 'round', 'short', 'long', 'white', 'purple', 'brown', 'snowy', 'spotted', 'grey'].includes(d))
  return k.descriptors
}

const matches = (g: { count: number; descriptor: string; kind: string }, t: { count: number; descriptor: string; kind: string }): number =>
  (g.count === t.count ? 1 : 0) + (g.descriptor === t.descriptor ? 1 : 0) + (g.kind === t.kind ? 1 : 0)

/**
 * Generates a level: fixed features around the loop, then scenery groups arranged so that exactly
 * one group matches all three clue words (the key), exactly `treasures` match exactly two, and all
 * others match at most one.
 */
export function generateLevel(no: LevelNo, seed: number, grade: Grade, treasures: number, stars: number): Level {
  for (let attempt = 0; attempt < 30; attempt++) {
    const lv = tryGenerate(no, seed, grade, treasures, stars, attempt)
    if (lv) return lv
  }
  throw new Error(`could not lay out level ${no} seed ${seed}`)
}

function tryGenerate(no: LevelNo, seed: number, grade: Grade, treasures: number, stars: number, attempt: number): Level | null {
  const rng = new Rng(`level-${no}-${seed}-${grade}-${treasures}-${attempt}`)
  const kinds = kindsFor(no, grade)
  const maxCount = grade <= 1 ? 3 : 4

  // --- target triple: must have at least `treasures` possible two-word near misses
  const twoMatchSpace = (t: { count: number; descriptor: string; kind: string }): number => {
    const kd = KINDS.find(k => k.kind === t.kind)!
    return (maxCount - 1) + (descriptorsFor(kd, grade).length - 1) + kinds.filter(k => k.kind !== t.kind && descriptorsFor(k, grade).includes(t.descriptor)).length
  }
  let tk = rng.pick(kinds)
  let target = { count: rng.int(1, maxCount), descriptor: rng.pick(descriptorsFor(tk, grade)), kind: tk.kind }
  for (let i = 0; i < 40 && twoMatchSpace(target) < treasures + 1; i++) {
    tk = rng.pick(kinds)
    target = { count: rng.int(1, maxCount), descriptor: rng.pick(descriptorsFor(tk, grade)), kind: tk.kind }
  }
  if (twoMatchSpace(target) < treasures) return null

  const triples: { count: number; descriptor: string; kind: string; hides: 'key' | 'treasure' | null }[] = []
  triples.push({ ...target, hides: 'key' })
  const seen = new Set<string>([`${target.count}|${target.descriptor}|${target.kind}`])
  const tryAdd = (t: { count: number; descriptor: string; kind: string }, hides: 'treasure' | null, wantMatches: number): boolean => {
    const key = `${t.count}|${t.descriptor}|${t.kind}`
    if (seen.has(key)) return false
    if (matches(t, target) !== wantMatches) return false
    const kd = KINDS.find(k => k.kind === t.kind)!
    if (!descriptorsFor(kd, grade).includes(t.descriptor)) return false
    seen.add(key)
    triples.push({ ...t, hides })
    return true
  }

  // --- treasure groups: differ from the target in exactly one attribute
  let guard = 0
  while (triples.filter(t => t.hides === 'treasure').length < treasures && guard++ < 500) {
    const which = rng.int(0, 2)
    if (which === 0) {
      const counts = [1, 2, 3, 4].filter(c => c !== target.count && c <= maxCount)
      tryAdd({ count: rng.pick(counts), descriptor: target.descriptor, kind: target.kind }, 'treasure', 2)
    } else if (which === 1) {
      const ds = descriptorsFor(tk, grade).filter(d => d !== target.descriptor)
      if (ds.length) tryAdd({ count: target.count, descriptor: rng.pick(ds), kind: target.kind }, 'treasure', 2)
    } else {
      const ks = kinds.filter(k => k.kind !== target.kind && descriptorsFor(k, grade).includes(target.descriptor))
      if (ks.length) tryAdd({ count: target.count, descriptor: target.descriptor, kind: rng.pick(ks).kind }, 'treasure', 2)
    }
  }
  // If the descriptor/kind space is too small for the requested treasures, fall back to count variants only
  // (always possible when treasures <= 6: up to 3 count variants + descriptor variants + kind variants).
  if (triples.filter(t => t.hides === 'treasure').length < treasures) {
    for (const k of kinds) for (const d of descriptorsFor(k, grade)) for (let c = 1; c <= maxCount; c++) {
      if (triples.filter(t => t.hides === 'treasure').length >= treasures) break
      tryAdd({ count: c, descriptor: d, kind: k.kind }, 'treasure', 2)
    }
  }

  // --- filler groups (0 or 1 match)
  const totalGroups = Math.max(11, treasures + 6) + Math.min(2, Math.floor(stars / 3))
  guard = 0
  while (triples.length < totalGroups && guard++ < 2000) {
    const k = rng.pick(kinds)
    const t = { count: rng.int(1, maxCount), descriptor: rng.pick(descriptorsFor(k, grade)), kind: k.kind }
    const m = matches(t, target)
    if (m <= 1) tryAdd(t, null, m)
  }

  // --- features at fixed fractions of the loop
  const features: Feature[] = []
  const place = (type: Feature['type'], frac: number, width: number, pair?: number) => features.push({ type, x: wrapX(frac * LOOP_W), width, pair })
  if (no === 1) place('clubhouse', 0.03, 300)
  place('netrock', no === 1 ? 0.2 : 0.14, 150)
  place('tunnel', 0.36, 170, 1)
  place('tunnel', 0.86, 170, 0)
  if (no === 1) place('secret', 0.57, 130)
  if (no === 2) place('bridge', 0.5, 280)
  if (no === 1) place('keyhole', 0.73, 150)
  if (no === 2) place('fountain', 0.73, 170)
  if (no === 3) place('castledoor', 0.73, 240)
  features.sort((a, b) => a.x - b.x)

  // --- pack groups into the gaps between features
  const items = triples.map((t, i) => {
    const kd = KINDS.find(k => k.kind === t.kind)!
    return { i, t, kd, width: kd.width * t.count + 10 * (t.count - 1) + 30 }
  })
  interface Gap { from: number; len: number; items: typeof items }
  const gaps: Gap[] = []
  for (let f = 0; f < features.length; f++) {
    const a = features[f], b = features[(f + 1) % features.length]
    const from = a.x + a.width / 2 + 30
    let len = (b.x - b.width / 2 - 30) - from
    if (len < 0) len += LOOP_W
    gaps.push({ from, len, items: [] })
  }
  // keep the player's start (x ~ 120) clear on level 1: it sits right after the clubhouse anyway
  const capacity = (g: Gap) => g.len - g.items.reduce((s, it) => s + it.width, 0) - 40 * (g.items.length + 1)
  let placed = 0
  for (const it of items) {
    let best: Gap | null = null
    for (const g of gaps) if (capacity(g) >= it.width && (!best || capacity(g) > capacity(best))) best = g
    if (!best) { if (it.t.hides) return null; continue } // a key/treasure group must fit; fillers may be dropped
    best.items.push(it)
    placed++
  }
  if (placed < 11) return null
  const groups: Group[] = []
  for (const g of gaps) {
    const order = rng.shuffle(g.items)
    const used = order.reduce((s, it) => s + it.width, 0)
    const gap = (g.len - used) / (order.length + 1)
    let x = g.from + gap
    for (const it of order) {
      const cx = x + it.width / 2
      groups.push({ id: it.i, x: wrapX(cx), count: it.t.count, descriptor: it.t.descriptor, kind: it.t.kind, width: it.width, hides: it.t.hides, searched: false, treasure: it.t.hides === 'treasure' ? rng.pick(TREASURE_NAMES) : undefined })
      x += it.width + gap
    }
  }
  groups.sort((a, b) => a.x - b.x)

  const kd = KINDS.find(k => k.kind === target.kind)!
  return {
    no, seed, groups, features, target,
    clueWords: { number: NUMBER_WORDS[target.count], descriptor: target.descriptor, object: target.count === 1 ? kd.kind : kd.plural },
    treasures: groups.filter(g => g.hides === 'treasure').length,
    netPrice: stars >= 5 ? 3 : 4,
  }
}

export const groupLabel = (g: { count: number; descriptor: string; kind: string }): string => {
  const kd = KINDS.find(k => k.kind === g.kind)!
  return `${NUMBER_WORDS[g.count]} ${g.descriptor} ${g.count === 1 ? kd.kind : kd.plural}`
}

export const treasuresForStars = (stars: number): number => Math.min(6, 2 + stars)
export const STAR_THRESHOLDS = [5, 25, 70, 115, 170, 230, 300]
export const RANK_NAMES = ['Trainee', 'Explorer', 'Pathfinder', 'Ranger', 'Trailblazer', 'Summiteer', 'Mountain Master', 'Champion']
export const starsForTotal = (total: number): number => STAR_THRESHOLDS.filter(t => total >= t).length

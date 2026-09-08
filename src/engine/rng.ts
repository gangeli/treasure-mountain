/** Small, fast, seedable PRNG (mulberry32). Deterministic so puzzles and tests are reproducible. */
export class Rng {
  private s: number
  constructor(seed: number | string = 1) {
    this.s = typeof seed === 'string' ? hashString(seed) : seed >>> 0
    if (this.s === 0) this.s = 0x9e3779b9
  }
  /** Uniform in [0, 1). */
  next(): number {
    let t = (this.s += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  /** Integer in [lo, hi] inclusive. */
  int(lo: number, hi: number): number {
    if (hi < lo) [lo, hi] = [hi, lo]
    return lo + Math.floor(this.next() * (hi - lo + 1))
  }
  float(lo: number, hi: number): number { return lo + this.next() * (hi - lo) }
  bool(p = 0.5): boolean { return this.next() < p }
  pick<T>(arr: readonly T[]): T {
    if (arr.length === 0) throw new Error('pick from empty array')
    return arr[Math.floor(this.next() * arr.length)]
  }
  /** Returns a new shuffled copy (Fisher-Yates). */
  shuffle<T>(arr: readonly T[]): T[] {
    const a = arr.slice()
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }
  /** Picks n distinct elements. */
  sample<T>(arr: readonly T[], n: number): T[] {
    if (n > arr.length) throw new Error(`sample ${n} from ${arr.length}`)
    return this.shuffle(arr).slice(0, n)
  }
  /** Weighted pick: weights need not sum to 1. */
  weighted<T>(items: readonly T[], weights: readonly number[]): T {
    let total = 0
    for (const w of weights) total += w
    let r = this.next() * total
    for (let i = 0; i < items.length; i++) {
      r -= weights[i]
      if (r < 0) return items[i]
    }
    return items[items.length - 1]
  }
  fork(label: string): Rng { return new Rng(hashString(label + ':' + this.int(0, 1 << 30))) }
}

export function hashString(s: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

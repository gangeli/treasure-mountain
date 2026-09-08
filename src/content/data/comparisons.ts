import type { Grade } from '../types'

/** The quantity a comparison is about. */
export type Attr = 'len' | 'mass' | 'speed'

/**
 * Things a child can compare. Every name must have **one** obvious real-world referent, because the
 * generator turns these numbers into "which is bigger/heavier/faster" answers: if a name covers a
 * range (a "ladder", a "shark", a "balloon") a child can defend the wrong choice. Prefer a specific
 * name ("a stepladder", "a great white shark", "a party balloon") over a generic one.
 *
 * `len` is metres (length, or height when `tall`), `mass` kilograms, `speed` km/h. `level` is the
 * first grade expected to know the thing.
 */
export interface Thing {
  n: string
  level: Grade
  len?: number
  mass?: number
  speed?: number
  /** Measured by height: used for "taller", never for "longer". */
  tall?: boolean
  /** Long and thin, so "bigger/smaller" (bulk) is ambiguous: compared by length only. */
  slim?: boolean
  /**
   * Attributes whose typical value a child can actually be expected to know, i.e. the ones the
   * "About how heavy/tall/fast is ...?" questions may ask about. Everything else is comparison-only.
   */
  est?: Attr[]
  /** Plural form. Only set when the mass is stable enough for "one X or twenty Ys?". */
  plural?: string
}

const T = (n: string, level: Grade, v: Omit<Thing, 'n' | 'level'>): Thing => ({ n, level, ...v })

export const THINGS: Thing[] = [
  // ---------------------------------------------------------------- animals
  T('a mouse', 0, { len: 0.08, mass: 0.02, speed: 13, est: [] }),
  T('a cat', 0, { len: 0.5, mass: 4, speed: 48, est: ['mass'], plural: 'cats' }),
  T('a big dog', 0, { len: 1, mass: 30, speed: 40, est: [] }),
  T('a rabbit', 0, { len: 0.4, mass: 2, speed: 45, est: [] }),
  T('an elephant', 0, { len: 3.2, mass: 5000, speed: 40, tall: true, est: ['mass'], plural: 'elephants' }),
  T('a giraffe', 0, { len: 5.5, mass: 1200, speed: 60, tall: true, est: ['len'] }),
  T('a horse', 0, { len: 2.4, mass: 500, speed: 70, est: ['mass', 'speed'], plural: 'horses' }),
  T('a cheetah', 1, { len: 1.3, mass: 50, speed: 110, est: ['speed'] }),
  T('a snail', 0, { len: 0.03, mass: 0.01, speed: 0.05, est: ['speed'] }),
  T('a giant tortoise', 1, { len: 1.2, mass: 200, speed: 0.3, est: [] }),
  T('a blue whale', 1, { len: 30, mass: 150000, speed: 30, est: ['len', 'mass'] }),
  T('an ant', 0, { len: 0.005, mass: 0.000005, speed: 0.3, est: [] }),
  T('a bee', 0, { len: 0.015, mass: 0.0001, speed: 25, est: [] }),
  T('an eagle', 1, { len: 0.9, mass: 5, speed: 150, est: [] }),
  T('a sparrow', 1, { len: 0.15, mass: 0.03, speed: 40, est: [] }),
  T('a cow', 0, { len: 2.5, mass: 700, speed: 25, est: ['mass'], plural: 'cows' }),
  T('a sheep', 0, { len: 1.2, mass: 80, speed: 30, est: [], plural: 'sheep' }),
  T('a pig', 0, { len: 1.5, mass: 200, speed: 17, est: [], plural: 'pigs' }),
  T('a chicken', 0, { len: 0.4, mass: 2.5, speed: 15, est: [], plural: 'chickens' }),
  T('a lion', 0, { len: 2, mass: 190, speed: 80, est: ['mass'] }),
  T('a grizzly bear', 1, { len: 2.4, mass: 300, speed: 55, est: [] }),
  T('a frog', 0, { len: 0.08, mass: 0.05, speed: 8, est: [] }),
  T('a goldfish', 0, { len: 0.1, mass: 0.05, speed: 5, est: [] }),
  T('a crocodile', 1, { len: 4, mass: 500, speed: 17, est: ['len'] }),
  T('a hippo', 1, { len: 3.5, mass: 1500, speed: 30, est: [] }),
  T('a kangaroo', 1, { len: 1.5, mass: 60, speed: 60, est: [] }),
  T('an emperor penguin', 1, { len: 1.1, mass: 30, speed: 10, tall: true, est: ['len'] }),
  T('a great white shark', 2, { len: 4.5, mass: 1000, speed: 50, est: ['len'] }),
  T('a dolphin', 1, { len: 3, mass: 200, speed: 50, est: ['len'] }),
  T('a butterfly', 0, { len: 0.1, mass: 0.0005, speed: 20, est: [] }),
  T('an ostrich', 2, { len: 2.5, mass: 130, speed: 70, tall: true, est: ['speed'] }),
  // ---------------------------------------------------------------- vehicles
  T('a bicycle', 0, { len: 1.8, mass: 12, speed: 20, est: ['len', 'mass', 'speed'], plural: 'bicycles' }),
  T('a car', 0, { len: 4.5, mass: 1500, speed: 100, est: ['len', 'mass', 'speed'], plural: 'cars' }),
  T('a bus', 0, { len: 12, mass: 12000, speed: 80, est: ['len', 'speed'], plural: 'buses' }),
  T('a train', 1, { len: 200, mass: 400000, speed: 200, est: [] }),
  T('a high-speed train', 3, { speed: 300, est: ['speed'] }),
  T('a jet plane', 1, { len: 40, mass: 70000, speed: 900, est: ['len', 'speed'] }),
  T('a rocket', 3, { len: 70, mass: 500000, speed: 28000, tall: true, est: [] }),
  T('a skateboard', 1, { len: 0.8, mass: 3, speed: 15, est: ['len', 'speed'] }),
  T('a kick scooter', 0, { len: 0.9, mass: 5, speed: 10, est: ['speed'] }),
  T('a truck', 0, { len: 16, mass: 20000, speed: 90, est: ['speed'], plural: 'trucks' }),
  T('a helicopter', 2, { len: 15, mass: 5000, speed: 250, est: ['speed'] }),
  T('a rowboat', 1, { len: 4, mass: 60, speed: 8, est: ['len', 'speed'] }),
  T('a tractor', 1, { len: 4, mass: 5000, speed: 30, est: ['speed'] }),
  T('a cruise ship', 3, { len: 300, mass: 100000000, speed: 40, est: ['len'] }),
  T('a hot-air balloon', 2, { len: 20, mass: 500, speed: 30, tall: true, est: ['len'] }),
  // ---------------------------------------------------------------- people and moving things
  T('a walking person', 1, { speed: 5, est: ['speed'] }),
  T('a running child', 1, { speed: 12, est: ['speed'] }),
  T('a sprinter', 3, { speed: 37, est: ['speed'] }),
  T('sound', 4, { speed: 1235, est: ['speed'] }),
  T('a grown-up', 0, { len: 1.7, mass: 70, tall: true, est: ['len', 'mass'] }),
  T('a child', 0, { len: 1.2, mass: 30, tall: true, est: ['len', 'mass'] }),
  // ---------------------------------------------------------------- everyday objects
  T('a pencil', 0, { len: 0.18, mass: 0.007, slim: true, est: ['len'] }),
  T('a book', 0, { len: 0.25, mass: 0.5, est: ['len', 'mass'], plural: 'books' }),
  T('a brick', 0, { len: 0.2, mass: 2, est: ['len', 'mass'], plural: 'bricks' }),
  T('a feather', 0, { len: 0.1, mass: 0.001, slim: true, est: [] }),
  T('an apple', 0, { len: 0.08, mass: 0.15, est: ['mass'], plural: 'apples' }),
  T('a watermelon', 0, { len: 0.4, mass: 8, est: ['mass'], plural: 'watermelons' }),
  T('an egg', 0, { len: 0.06, mass: 0.06, est: ['mass'], plural: 'eggs' }),
  T('a coin', 0, { len: 0.02, mass: 0.005, est: [], plural: 'coins' }),
  T('a bed', 0, { len: 2, mass: 40, est: ['len'] }),
  T('a door', 0, { len: 2, mass: 30, tall: true, est: ['len'] }),
  T('a table', 0, { len: 1.5, mass: 20, est: ['len'], plural: 'tables' }),
  T('a chair', 0, { len: 0.9, mass: 5, tall: true, est: ['len'], plural: 'chairs' }),
  T('a fridge', 0, { len: 1.8, mass: 80, tall: true, est: ['len'] }),
  T('a piano', 1, { len: 1.5, mass: 300, est: [] }),
  T('a two-story house', 0, { len: 8, mass: 100000, tall: true, est: ['len'] }),
  T('an oak tree', 0, { len: 20, mass: 10000, tall: true, est: [] }),
  T('a mountain', 0, { len: 3000, tall: true, est: [] }),
  T('a football field', 2, { len: 100, est: ['len'] }),
  T('an Olympic pool', 2, { len: 50, est: ['len'] }),
  T('a classroom', 1, { len: 8, est: ['len'] }),
  T('a stepladder', 1, { len: 1.8, mass: 8, tall: true, est: ['len'] }),
  T('a spoon', 0, { len: 0.15, mass: 0.03, slim: true, est: ['len'] }),
  T('a 1-liter water bottle', 1, { len: 0.3, mass: 1, tall: true, est: ['len', 'mass'] }),
  T('a backpack', 0, { len: 0.4, mass: 3, est: ['mass'], plural: 'backpacks' }),
  T('a party balloon', 0, { len: 0.3, mass: 0.003, est: [] }),
  T('a flower', 0, { len: 0.3, mass: 0.02, tall: true, est: [] }),
  T('a basketball', 1, { len: 0.24, mass: 0.6, est: ['len', 'mass'], plural: 'basketballs' }),
  T('a bowling ball', 2, { len: 0.22, mass: 6, est: ['mass'], plural: 'bowling balls' }),
  T('a bag of sugar', 2, { len: 0.15, mass: 1, est: ['mass'], plural: 'bags of sugar' }),
  T('a hammer', 1, { len: 0.3, mass: 0.5, slim: true, est: ['mass'] }),
  T('a laptop', 2, { len: 0.35, mass: 1.5, est: ['mass'], plural: 'laptops' }),
  T('a marble', 0, { len: 0.015, mass: 0.005, est: [] }),
  T('a pea', 0, { len: 0.01, mass: 0.0005, est: [] }),
  T('a grain of rice', 1, { len: 0.007, mass: 0.00002, slim: true, est: [] }),
  T('a paper clip', 1, { len: 0.03, mass: 0.001, slim: true, est: [] }),
  T('a bathtub', 1, { len: 1.7, mass: 40, est: ['len'] }),
  T('a bridge', 2, { len: 500, est: [] }),
  T('a lighthouse', 2, { len: 40, tall: true, est: [] }),
  T('a skyscraper', 3, { len: 250, tall: true, est: [] }),
  T('a cup', 0, { len: 0.1, mass: 0.3, est: ['mass'], plural: 'cups' }),
  T('a shoe', 0, { len: 0.28, mass: 0.4, est: ['len'], plural: 'shoes' }),
  T('a soccer ball', 0, { len: 0.22, mass: 0.43, est: ['mass'], plural: 'soccer balls' }),
  T('a school desk', 1, { len: 0.6, mass: 15, est: ['len'], plural: 'school desks' }),
]

/** Lookup by display name (used by the generator and by the tests that re-check the margin rule). */
export const THING_BY_NAME: Record<string, Thing> = Object.fromEntries(THINGS.map(t => [t.n, t]))

/**
 * How many times bigger the answer must be than every decoy on the compared quantity. Real-world
 * sizes vary, so a 2x "win" is not a win at all; K-2 get a huge margin because they compare from
 * pictures in their head.
 */
export const marginFor = (grade: Grade): number => grade <= 2 ? 10 : 3

/** How far every decoy must be from the answer in an estimation question. */
export const EST_MARGIN = 5

/** How much the winning side must beat the other in "one X or twenty Ys?". */
export const QTY_MARGIN = 3

export const canEstimate = (t: Thing, attr: Attr): boolean => (t.est ?? []).includes(attr)

import type { Generator } from '../types'
import { EARTHSKY_FACTS } from '../data/earthsky'
import { factRiddle } from './thinkingUtil'

/** Earth and sky: day/night and weather (K), sun/moon/stars (1), water cycle (2), planets (3), moon phases and rocks (4), gravity and Earth's layers (5). */
export const earthsky: Generator = {
  id: 'earthsky',
  name: 'Earth and sky',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  weight: { 0: 1, 1: 1, 2: 1, 3: 1.2, 4: 1.2, 5: 1.2 },
  make: (grade, tier, rng) => factRiddle('earthsky', 'science: earth and sky', EARTHSKY_FACTS, grade, tier, rng),
}

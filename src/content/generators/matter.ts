import type { Generator } from '../types'
import { MATTER_FACTS } from '../data/matter'
import { factRiddle } from './thinkingUtil'

/** Matter and machines: hot/cold, float/sink (K), push/pull and materials (1), states of matter (2), magnets and simple machines (3), energy, light and sound (4), electricity, forces and changes (5). */
export const matter: Generator = {
  id: 'matter',
  name: 'Matter and machines',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  make: (grade, tier, rng) => factRiddle('matter', 'science: matter and machines', MATTER_FACTS, grade, tier, rng),
}

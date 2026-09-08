import type { Generator } from '../types'
import { BODY_FACTS } from '../data/body'
import { factRiddle } from './thinkingUtil'

/** The body and senses: five senses (K), body parts (1), teeth/bones/food (2), organs (3), systems (4), cells and nutrition (5). */
export const body: Generator = {
  id: 'body',
  name: 'The body and senses',
  area: 'thinking',
  grades: [0, 1, 2, 3, 4, 5],
  make: (grade, tier, rng) => factRiddle('body', 'science: the body', BODY_FACTS, grade, tier, rng),
}

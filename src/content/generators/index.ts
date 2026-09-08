import type { Generator } from '../types'
import { rhymes } from './rhymes'
import { sounds } from './sounds'
import { counting, addSub } from './counting'
import { MATH } from './math'
import { READING2 } from './reading2'
import { READING } from './reading'

/** Every puzzle family. Order matters only for reports. */
export const GENERATORS: Generator[] = [
  rhymes,
  sounds,
  counting,
  addSub,
  ...MATH,
  ...READING,
  ...READING2,
]

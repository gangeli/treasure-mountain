import type { Generator } from '../types'
import { rhymes } from './rhymes'
import { sounds } from './sounds'
import { counting, addSub } from './counting'

/** Every puzzle family. Order matters only for reports. */
export const GENERATORS: Generator[] = [
  rhymes,
  sounds,
  counting,
  addSub,
]

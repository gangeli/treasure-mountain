import type { Generator } from '../types'
import { oddoneout } from './oddoneout'
import { riddles } from './riddles'
import { animals } from './animals'
import { earthsky } from './earthsky'
import { body } from './body'
import { matter } from './matter'
import { events } from './events'
import { comparisons } from './comparisons'

/** Thinking and science families (K-5). */
export const THINKING: Generator[] = [oddoneout, riddles, animals, earthsky, body, matter, events, comparisons]

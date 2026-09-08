import type { Generator } from '../types'
import { compare } from './compare'
import { multiply } from './multiply'
import { divide } from './divide'
import { sequences } from './sequences'
import { placevalue } from './placevalue'
import { time } from './time'
import { money } from './money'
import { shapes } from './shapes'
import { fractions } from './fractions'
import { wordproblems } from './wordproblems'
import { evenodd } from './evenodd'
import { measurement } from './measurement'

/** Math families beyond counting/addsub (which live in counting.ts). */
export const MATH: Generator[] = [compare, multiply, divide, sequences, placevalue, time, money, shapes, fractions, wordproblems, evenodd, measurement]

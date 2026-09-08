import type { Generator } from '../types'
import { letters } from './letters'
import { vowels } from './vowels'
import { compounds } from './compounds'
import { opposites } from './opposites'
import { synonyms } from './synonyms'
import { categories } from './categories'
import { associations } from './associations'
import { syllables } from './syllables'

/** Reading and language families (rhymes and sounds live in their own files). */
export const READING: Generator[] = [letters, vowels, compounds, opposites, synonyms, categories, associations, syllables]

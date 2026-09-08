import type { Generator } from '../types'
import { plurals } from './plurals'
import { contractions } from './contractions'
import { homophones } from './homophones'
import { affixes } from './affixes'
import { analogies } from './analogies'
import { alphabetical } from './alphabetical'
import { sentences } from './sentences'
import { partsofspeech } from './partsofspeech'
import { vocabulary } from './vocabulary'

/** Reading and language families: word forms, spelling, vocabulary and grammar. */
export const READING2: Generator[] = [plurals, contractions, homophones, affixes, analogies, alphabetical, sentences, partsofspeech, vocabulary]

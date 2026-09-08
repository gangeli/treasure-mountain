import type { Grade, Tier } from '../types'

/**
 * Antonym pairs, partitioned into one disjoint pool per (grade, tier).
 *
 * A pair lives in exactly one pool, so tier 3 can never draw a riddle tier 1 could and no pair is
 * reused in a later grade. Pools are ordered by difficulty: within a grade tier 1 < tier 2 < tier 3,
 * and every pool of grade g + 1 is harder than the matching pool of grade g.
 *
 * `pos` keeps decoys in the same part of speech. `gloss` pins the sense of a word that has more
 * than one common meaning (light = bright vs light = not heavy); a multi-sense word may only be the
 * asked word when this pair glosses it, and is never offered as a decoy (see `AMBIGUOUS` in vocab).
 */
export type Pos = 'adj' | 'noun' | 'verb' | 'adv'
export interface Opposite {
  a: string
  b: string
  grade: Grade
  tier: Tier
  pos: Pos
  gloss?: Record<string, string>
}

const o = (a: string, b: string, grade: Grade, tier: Tier, pos: Pos = 'adj', gloss?: Record<string, string>): Opposite =>
  ({ a, b, grade, tier, pos, gloss })

export const OPPOSITES: Opposite[] = [
  // ---------------------------------------------------------------- Kindergarten
  // K tier 1: the shortest, most concrete pairs a five-year-old already says out loud.
  o('hot', 'cold', 0, 1), o('big', 'small', 0, 1), o('wet', 'dry', 0, 1), o('happy', 'sad', 0, 1),
  o('up', 'down', 0, 1, 'adv'), o('in', 'out', 0, 1, 'adv'), o('yes', 'no', 0, 1, 'adv'), o('on', 'off', 0, 1, 'adv'),
  o('day', 'night', 0, 1, 'noun'), o('top', 'bottom', 0, 1, 'noun'),
  o('go', 'stop', 0, 1, 'verb'), o('sit', 'stand', 0, 1, 'verb'), o('push', 'pull', 0, 1, 'verb'),
  // K tier 2: still one syllable, a little less obvious.
  o('fast', 'slow', 0, 2), o('old', 'new', 0, 2), o('good', 'bad', 0, 2), o('loud', 'quiet', 0, 2),
  o('open', 'shut', 0, 2), o('full', 'empty', 0, 2), o('clean', 'dirty', 0, 2),
  o('hard', 'soft', 0, 2, 'adj', { hard: 'firm to touch' }), o('light', 'dark', 0, 2, 'adj', { light: 'bright' }),
  o('boy', 'girl', 0, 2, 'noun'), o('front', 'back', 0, 2, 'noun'),
  o('laugh', 'cry', 0, 2, 'verb'), o('give', 'take', 0, 2, 'verb'),
  // K tier 3: two-syllable words and pairs that need a picture in the head.
  o('tall', 'short', 0, 3), o('thick', 'thin', 0, 3), o('sweet', 'sour', 0, 3), o('high', 'low', 0, 3),
  o('first', 'last', 0, 3), o('black', 'white', 0, 3), o('awake', 'asleep', 0, 3),
  o('warm', 'cool', 0, 3, 'adj', { cool: 'a bit cold' }),
  o('near', 'far', 0, 3, 'adv'), o('over', 'under', 0, 3, 'adv'), o('inside', 'outside', 0, 3, 'adv'), o('more', 'less', 0, 3, 'adv'),
  o('smile', 'frown', 0, 3, 'verb'), o('sleep', 'wake', 0, 3, 'verb'),

  // ---------------------------------------------------------------- Grade 1
  o('long', 'short', 1, 1), o('wide', 'narrow', 1, 1), o('young', 'old', 1, 1), o('same', 'different', 1, 1),
  o('true', 'false', 1, 1), o('heavy', 'light', 1, 1, 'adj', { light: 'like a feather' }),
  o('right', 'wrong', 1, 1, 'adj', { right: 'correct' }),
  o('come', 'go', 1, 1, 'verb'), o('win', 'lose', 1, 1, 'verb'), o('begin', 'end', 1, 1, 'verb'),
  o('early', 'late', 1, 1, 'adv'), o('before', 'after', 1, 1, 'adv'), o('above', 'below', 1, 1, 'adv'),
  // G1 tier 2
  o('deep', 'shallow', 1, 2), o('strong', 'weak', 1, 2), o('rich', 'poor', 1, 2),
  o('smooth', 'rough', 1, 2, 'adj', { rough: 'bumpy to touch' }), o('easy', 'hard', 1, 2, 'adj', { hard: 'tricky to do' }),
  o('float', 'sink', 1, 2, 'verb'), o('buy', 'sell', 1, 2, 'verb'), o('remember', 'forget', 1, 2, 'verb'),
  o('always', 'never', 1, 2, 'adv'), o('together', 'apart', 1, 2, 'adv'),
  o('summer', 'winter', 1, 2, 'noun'), o('friend', 'enemy', 1, 2, 'noun'),
  o('left', 'right', 1, 2, 'noun', { right: 'the direction' }),
  // G1 tier 3
  o('brave', 'scared', 1, 3), o('kind', 'cruel', 1, 3), o('polite', 'rude', 1, 3), o('safe', 'dangerous', 1, 3),
  o('healthy', 'sick', 1, 3), o('tight', 'loose', 1, 3), o('straight', 'crooked', 1, 3), o('wild', 'tame', 1, 3),
  o('noisy', 'silent', 1, 3), o('cheap', 'expensive', 1, 3),
  o('start', 'finish', 1, 3, 'verb'), o('arrive', 'leave', 1, 3, 'verb'),
  o('question', 'answer', 1, 3, 'noun'), o('floor', 'ceiling', 1, 3, 'noun'),

  // ---------------------------------------------------------------- Grade 2
  o('ancient', 'modern', 2, 1), o('careful', 'careless', 2, 1), o('cheerful', 'gloomy', 2, 1),
  o('exciting', 'boring', 2, 1), o('fresh', 'stale', 2, 1), o('giant', 'tiny', 2, 1), o('tidy', 'messy', 2, 1),
  o('fancy', 'plain', 2, 1), o('gentle', 'fierce', 2, 1), o('sweet', 'bitter', 2, 1),
  o('build', 'destroy', 2, 1, 'verb'), o('find', 'lose', 2, 1, 'verb'), o('rise', 'fall', 2, 1, 'verb'),
  o('sunrise', 'sunset', 2, 1, 'noun'), o('land', 'sea', 2, 1, 'noun'),
  // G2 tier 2
  o('proud', 'ashamed', 2, 2), o('guilty', 'innocent', 2, 2), o('honest', 'dishonest', 2, 2),
  o('patient', 'impatient', 2, 2), o('rare', 'common', 2, 2), o('sturdy', 'flimsy', 2, 2),
  o('calm', 'stormy', 2, 2), o('private', 'public', 2, 2), o('lazy', 'hardworking', 2, 2),
  o('sharp', 'dull', 2, 2, 'adj', { sharp: 'like a knife blade' }),
  o('increase', 'decrease', 2, 2, 'verb'), o('appear', 'vanish', 2, 2, 'verb'), o('freeze', 'melt', 2, 2, 'verb'),
  o('hero', 'villain', 2, 2, 'noun'), o('truth', 'lie', 2, 2, 'noun', { lie: 'a story that is not true' }),
  // G2 tier 3
  o('victory', 'defeat', 2, 3, 'noun'), o('success', 'failure', 2, 3, 'noun'), o('entrance', 'exit', 2, 3, 'noun'),
  o('problem', 'solution', 2, 3, 'noun'), o('strength', 'weakness', 2, 3, 'noun'), o('beginning', 'ending', 2, 3, 'noun'),
  o('accept', 'refuse', 2, 3, 'verb'), o('attack', 'defend', 2, 3, 'verb'), o('borrow', 'lend', 2, 3, 'verb'),
  o('gather', 'scatter', 2, 3, 'verb'), o('praise', 'scold', 2, 3, 'verb'),
  o('forward', 'backward', 2, 3, 'adv'), o('often', 'seldom', 2, 3, 'adv'),

  // ---------------------------------------------------------------- Grade 3
  o('crowded', 'deserted', 3, 1), o('ordinary', 'unusual', 3, 1), o('harsh', 'mild', 3, 1), o('timid', 'bold', 3, 1),
  o('fortunate', 'unfortunate', 3, 1), o('obedient', 'disobedient', 3, 1), o('grateful', 'ungrateful', 3, 1),
  o('helpful', 'harmful', 3, 1), o('brief', 'lengthy', 3, 1), o('valuable', 'worthless', 3, 1),
  o('famous', 'unknown', 3, 1), o('awkward', 'graceful', 3, 1), o('peaceful', 'violent', 3, 1),
  // G3 tier 2: verbs
  o('stretch', 'shrink', 3, 2, 'verb'), o('tighten', 'loosen', 3, 2, 'verb'), o('whisper', 'shout', 3, 2, 'verb'),
  o('connect', 'separate', 3, 2, 'verb'), o('raise', 'lower', 3, 2, 'verb'), o('chase', 'flee', 3, 2, 'verb'),
  o('capture', 'release', 3, 2, 'verb'), o('repair', 'damage', 3, 2, 'verb'), o('obey', 'disobey', 3, 2, 'verb'),
  o('agree', 'disagree', 3, 2, 'verb'), o('admit', 'deny', 3, 2, 'verb'), o('save', 'spend', 3, 2, 'verb'),
  o('hurry', 'delay', 3, 2, 'verb'),
  // G3 tier 3: manner adverbs and abstract nouns
  o('quickly', 'slowly', 3, 3, 'adv'), o('loudly', 'softly', 3, 3, 'adv'), o('carefully', 'carelessly', 3, 3, 'adv'),
  o('politely', 'rudely', 3, 3, 'adv'), o('happily', 'sadly', 3, 3, 'adv'), o('upward', 'downward', 3, 3, 'adv'),
  o('inward', 'outward', 3, 3, 'adv'), o('wisely', 'foolishly', 3, 3, 'adv'),
  o('honestly', 'dishonestly', 3, 3, 'adv'),
  o('advantage', 'disadvantage', 3, 3, 'noun'), o('majority', 'minority', 3, 3, 'noun'),
  o('peace', 'war', 3, 3, 'noun'), o('love', 'hate', 3, 3, 'noun'), o('wisdom', 'foolishness', 3, 3, 'noun'),
  o('agreement', 'disagreement', 3, 3, 'noun'),

  // ---------------------------------------------------------------- Grade 4
  o('ascend', 'descend', 4, 1, 'verb'), o('expand', 'contract', 4, 1, 'verb'), o('include', 'exclude', 4, 1, 'verb'),
  o('construct', 'demolish', 4, 1, 'verb'), o('conceal', 'reveal', 4, 1, 'verb'), o('unite', 'divide', 4, 1, 'verb'),
  o('permit', 'forbid', 4, 1, 'verb'), o('inhale', 'exhale', 4, 1, 'verb'), o('import', 'export', 4, 1, 'verb'),
  o('succeed', 'fail', 4, 1, 'verb'), o('encourage', 'discourage', 4, 1, 'verb'), o('approve', 'reject', 4, 1, 'verb'),
  o('strengthen', 'weaken', 4, 1, 'verb'),
  // G4 tier 2: academic adjectives
  o('abundant', 'scarce', 4, 2), o('simple', 'complicated', 4, 2), o('permanent', 'temporary', 4, 2),
  o('flexible', 'rigid', 4, 2), o('visible', 'invisible', 4, 2), o('artificial', 'natural', 4, 2),
  o('mature', 'immature', 4, 2), o('humble', 'arrogant', 4, 2), o('cautious', 'reckless', 4, 2),
  o('vague', 'precise', 4, 2), o('hostile', 'friendly', 4, 2), o('obvious', 'obscure', 4, 2),
  o('transparent', 'opaque', 4, 2),
  // G4 tier 3
  o('optimistic', 'pessimistic', 4, 3), o('eager', 'reluctant', 4, 3), o('fertile', 'barren', 4, 3),
  o('urban', 'rural', 4, 3), o('vertical', 'horizontal', 4, 3), o('major', 'minor', 4, 3),
  o('superior', 'inferior', 4, 3), o('sincere', 'insincere', 4, 3),
  o('frequently', 'rarely', 4, 3, 'adv'), o('voluntarily', 'reluctantly', 4, 3, 'adv'),
  o('temporarily', 'permanently', 4, 3, 'adv'), o('literally', 'figuratively', 4, 3, 'adv'),
  o('deliberately', 'accidentally', 4, 3, 'adv'),

  // ---------------------------------------------------------------- Grade 5
  o('wealth', 'poverty', 5, 1, 'noun'), o('courage', 'cowardice', 5, 1, 'noun'), o('harmony', 'conflict', 5, 1, 'noun'),
  o('chaos', 'order', 5, 1, 'noun'), o('surplus', 'shortage', 5, 1, 'noun'), o('fiction', 'nonfiction', 5, 1, 'noun'),
  o('predator', 'prey', 5, 1, 'noun'), o('ancestor', 'descendant', 5, 1, 'noun'), o('optimist', 'pessimist', 5, 1, 'noun'),
  o('cause', 'effect', 5, 1, 'noun'), o('profit', 'loss', 5, 1, 'noun'), o('maximum', 'minimum', 5, 1, 'noun'),
  o('justice', 'injustice', 5, 1, 'noun'),
  o('interior', 'exterior', 5, 1, 'noun'),
  // G5 tier 2: academic verbs
  o('attract', 'repel', 5, 2, 'verb'), o('surrender', 'resist', 5, 2, 'verb'), o('deteriorate', 'improve', 5, 2, 'verb'),
  o('summon', 'dismiss', 5, 2, 'verb'), o('abolish', 'establish', 5, 2, 'verb'), o('simplify', 'complicate', 5, 2, 'verb'),
  o('praise', 'criticize', 5, 2, 'verb'), o('accelerate', 'decelerate', 5, 2, 'verb'), o('conserve', 'waste', 5, 2, 'verb'),
  o('exaggerate', 'understate', 5, 2, 'verb'), o('illuminate', 'darken', 5, 2, 'verb'), o('retreat', 'advance', 5, 2, 'verb'),
  o('inflate', 'deflate', 5, 2, 'verb'),
  // G5 tier 3
  o('prosperous', 'impoverished', 5, 3), o('fragile', 'durable', 5, 3), o('generous', 'stingy', 5, 3),
  o('diligent', 'negligent', 5, 3), o('considerate', 'thoughtless', 5, 3), o('genuine', 'counterfeit', 5, 3),
  o('legible', 'illegible', 5, 3), o('audible', 'inaudible', 5, 3), o('rational', 'irrational', 5, 3),
  o('significant', 'trivial', 5, 3), o('compulsory', 'optional', 5, 3), o('domestic', 'foreign', 5, 3),
  o('meticulous', 'sloppy', 5, 3),
]

/**
 * Extra antonym links that are never asked as riddles but must still block decoys: words that are
 * opposites of each other through a sense the riddle pools do not use.
 */
export const EXTRA_ANTONYMS: Array<[string, string]> = [
  ['rough', 'polite'], ['rough', 'gentle'], ['rough', 'mild'], ['rough', 'calm'], ['smooth', 'harsh'],
  ['hard', 'easy'], ['hard', 'gentle'], ['light', 'heavy'], ['dull', 'shiny'], ['dull', 'exciting'],
  ['dull', 'bright'], ['dull', 'interesting'], ['sharp', 'blunt'], ['plain', 'fancy'],
  ['cool', 'hot'], ['warm', 'cold'], ['high', 'deep'], ['low', 'tall'],
  ['first', 'final'], ['last', 'first'], ['short', 'long'], ['short', 'tall'],
  ['win', 'fail'], ['lose', 'succeed'], ['victory', 'loss'], ['defeat', 'triumph'],
  ['begin', 'finish'], ['start', 'end'], ['beginning', 'end'], ['ending', 'beginning'],
  ['come', 'leave'], ['arrive', 'depart'], ['bold', 'shy'], ['bold', 'afraid'],
  ['tame', 'fierce'], ['common', 'unusual'], ['ordinary', 'special'],
  ['minimum', 'most'], ['maximum', 'least'], ['order', 'mess'], ['tidy', 'chaos'],
  ['peace', 'conflict'], ['war', 'harmony'], ['love', 'dislike'], ['praise', 'scorn'],
  ['scarce', 'plentiful'], ['abundant', 'meager'], ['rare', 'plentiful'],
  ['humble', 'boastful'], ['humble', 'conceited'], ['generous', 'selfish'], ['generous', 'miserly'],
  ['stingy', 'charitable'], ['reckless', 'careful'], ['cautious', 'careless'],
  ['obvious', 'unclear'], ['vague', 'exact'], ['vague', 'clear'], ['precise', 'sloppy'],
  ['sturdy', 'fragile'], ['durable', 'flimsy'], ['fragile', 'strong'],
  ['famous', 'obscure'], ['unknown', 'well-known'], ['brief', 'long'], ['lengthy', 'short'],
  ['delay', 'rush'], ['hurry', 'linger'], ['save', 'waste'], ['conserve', 'squander'],
  ['deny', 'confirm'], ['admit', 'refuse'], ['agree', 'refuse'], ['accept', 'reject'],
  ['permit', 'prohibit'], ['forbid', 'allow'], ['forbid', 'permit'],
  ['expand', 'shrink'], ['contract', 'stretch'], ['increase', 'shrink'], ['decrease', 'grow'],
  ['inferior', 'better'], ['superior', 'worse'], ['major', 'trivial'], ['significant', 'minor'],
  ['sincere', 'dishonest'], ['genuine', 'fake'], ['genuine', 'false'], ['counterfeit', 'real'],
  ['guilty', 'blameless'], ['innocent', 'wicked'], ['brave', 'cowardly'], ['courage', 'fear'],
  ['wealth', 'need'], ['poverty', 'riches'], ['rich', 'needy'], ['poor', 'wealthy'],
  ['healthy', 'ill'], ['sick', 'well'], ['noisy', 'hushed'], ['silent', 'loud'],
  ['awake', 'sleepy'], ['asleep', 'alert'], ['dangerous', 'harmless'], ['safe', 'harmful'],
]

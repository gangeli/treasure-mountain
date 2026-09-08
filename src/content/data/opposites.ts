/**
 * Antonym pairs. Level 1 = K-1 concrete, 2 = grades 1-2, 3 = grades 2-3 precise pairs,
 * 4 = grades 4-5 abstract / academic. `pos` keeps decoys in the same part of speech.
 */
export type Pos = 'adj' | 'noun' | 'verb' | 'adv'
export interface Opposite { a: string; b: string; level: 1 | 2 | 3 | 4; pos: Pos }

const o = (a: string, b: string, level: 1 | 2 | 3 | 4, pos: Pos = 'adj'): Opposite => ({ a, b, level, pos })

export const OPPOSITES: Opposite[] = [
  // level 1: K-1 concrete
  o('hot', 'cold', 1), o('big', 'small', 1), o('up', 'down', 1, 'adv'), o('in', 'out', 1, 'adv'), o('wet', 'dry', 1),
  o('happy', 'sad', 1), o('fast', 'slow', 1), o('day', 'night', 1, 'noun'), o('open', 'closed', 1), o('on', 'off', 1, 'adv'),
  o('yes', 'no', 1, 'adv'), o('good', 'bad', 1), o('old', 'new', 1), o('tall', 'short', 1), o('hard', 'soft', 1),
  o('loud', 'quiet', 1), o('light', 'dark', 1), o('full', 'empty', 1), o('clean', 'dirty', 1), o('top', 'bottom', 1, 'noun'),
  o('front', 'back', 1, 'noun'), o('boy', 'girl', 1, 'noun'), o('push', 'pull', 1, 'verb'), o('go', 'stop', 1, 'verb'), o('laugh', 'cry', 1, 'verb'),
  o('sit', 'stand', 1, 'verb'), o('come', 'go', 1, 'verb'), o('give', 'take', 1, 'verb'), o('over', 'under', 1, 'adv'), o('near', 'far', 1, 'adv'),
  o('long', 'short', 1), o('high', 'low', 1), o('young', 'old', 1), o('first', 'last', 1), o('sweet', 'sour', 1),
  o('inside', 'outside', 1, 'adv'), o('sun', 'moon', 1, 'noun'), o('morning', 'night', 1, 'noun'), o('warm', 'cool', 1), o('thick', 'thin', 1),
  // level 2: grades 1-2
  o('early', 'late', 2, 'adv'), o('before', 'after', 2, 'adv'), o('above', 'below', 2, 'adv'), o('left', 'right', 2, 'noun'), o('heavy', 'light', 2),
  o('wide', 'narrow', 2), o('deep', 'shallow', 2), o('strong', 'weak', 2), o('rich', 'poor', 2), o('smooth', 'rough', 2),
  o('sharp', 'dull', 2), o('same', 'different', 2), o('true', 'false', 2), o('right', 'wrong', 2), o('easy', 'hard', 2),
  o('safe', 'dangerous', 2), o('awake', 'asleep', 2), o('alive', 'dead', 2), o('friend', 'enemy', 2, 'noun'), o('question', 'answer', 2, 'noun'),
  o('beginning', 'end', 2, 'noun'), o('summer', 'winter', 2, 'noun'), o('sunrise', 'sunset', 2, 'noun'), o('floor', 'ceiling', 2, 'noun'), o('land', 'sea', 2, 'noun'),
  o('buy', 'sell', 2, 'verb'), o('win', 'lose', 2, 'verb'), o('start', 'finish', 2, 'verb'), o('remember', 'forget', 2, 'verb'), o('find', 'lose', 2, 'verb'),
  o('float', 'sink', 2, 'verb'), o('whisper', 'shout', 2, 'verb'), o('build', 'destroy', 2, 'verb'), o('arrive', 'leave', 2, 'verb'), o('rise', 'fall', 2, 'verb'),
  o('always', 'never', 2, 'adv'), o('more', 'less', 2, 'adv'), o('many', 'few', 2), o('kind', 'mean', 2), o('brave', 'scared', 2),
  o('polite', 'rude', 2), o('cheap', 'expensive', 2), o('noisy', 'silent', 2), o('tight', 'loose', 2), o('straight', 'crooked', 2),
  o('fat', 'thin', 2), o('healthy', 'sick', 2), o('wild', 'tame', 2), o('busy', 'idle', 2), o('together', 'apart', 2, 'adv'),
  // level 3: grades 2-3
  o('ancient', 'modern', 3), o('simple', 'complicated', 3), o('careful', 'careless', 3), o('cheerful', 'gloomy', 3), o('calm', 'stormy', 3),
  o('crowded', 'empty', 3), o('exciting', 'boring', 3), o('fresh', 'stale', 3), o('generous', 'selfish', 3), o('gentle', 'rough', 3),
  o('giant', 'tiny', 3), o('guilty', 'innocent', 3), o('honest', 'dishonest', 3), o('lazy', 'hardworking', 3), o('narrow', 'broad', 3),
  o('ordinary', 'unusual', 3), o('patient', 'impatient', 3), o('plain', 'fancy', 3), o('polite', 'impolite', 3), o('private', 'public', 3),
  o('rare', 'common', 3), o('shiny', 'dull', 3), o('sturdy', 'flimsy', 3), o('tidy', 'messy', 3), o('victory', 'defeat', 3, 'noun'),
  o('success', 'failure', 3, 'noun'), o('entrance', 'exit', 3, 'noun'), o('hero', 'villain', 3, 'noun'), o('north', 'south', 3, 'noun'), o('east', 'west', 3, 'noun'),
  o('problem', 'solution', 3, 'noun'), o('strength', 'weakness', 3, 'noun'), o('truth', 'lie', 3, 'noun'), o('advantage', 'disadvantage', 3, 'noun'), o('cause', 'effect', 3, 'noun'),
  o('accept', 'refuse', 3, 'verb'), o('attack', 'defend', 3, 'verb'), o('increase', 'decrease', 3, 'verb'), o('appear', 'vanish', 3, 'verb'), o('borrow', 'lend', 3, 'verb'),
  o('freeze', 'melt', 3, 'verb'), o('gather', 'scatter', 3, 'verb'), o('praise', 'scold', 3, 'verb'), o('stretch', 'shrink', 3, 'verb'), o('tighten', 'loosen', 3, 'verb'),
  o('forward', 'backward', 3, 'adv'), o('often', 'seldom', 3, 'adv'), o('loudly', 'softly', 3, 'adv'), o('quickly', 'slowly', 3, 'adv'), o('carefully', 'carelessly', 3, 'adv'),
  // level 4: grades 4-5 abstract / academic
  o('abundant', 'scarce', 4), o('ascend', 'descend', 4, 'verb'), o('expand', 'contract', 4, 'verb'), o('include', 'exclude', 4, 'verb'), o('encourage', 'discourage', 4, 'verb'),
  o('construct', 'demolish', 4, 'verb'), o('conceal', 'reveal', 4, 'verb'), o('unite', 'divide', 4, 'verb'), o('permit', 'forbid', 4, 'verb'), o('praise', 'criticize', 4, 'verb'),
  o('approve', 'reject', 4, 'verb'), o('strengthen', 'weaken', 4, 'verb'), o('inhale', 'exhale', 4, 'verb'), o('import', 'export', 4, 'verb'), o('succeed', 'fail', 4, 'verb'),
  o('generous', 'stingy', 4), o('optimistic', 'pessimistic', 4), o('permanent', 'temporary', 4), o('flexible', 'rigid', 4), o('visible', 'invisible', 4),
  o('maximum', 'minimum', 4), o('major', 'minor', 4), o('positive', 'negative', 4), o('vertical', 'horizontal', 4), o('interior', 'exterior', 4),
  o('humble', 'arrogant', 4), o('cautious', 'reckless', 4), o('vague', 'precise', 4), o('fertile', 'barren', 4), o('hostile', 'friendly', 4),
  o('mature', 'immature', 4), o('obvious', 'obscure', 4), o('scarce', 'plentiful', 4), o('transparent', 'opaque', 4), o('urban', 'rural', 4),
  o('artificial', 'natural', 4), o('fiction', 'nonfiction', 4, 'noun'), o('predator', 'prey', 4, 'noun'), o('ancestor', 'descendant', 4, 'noun'), o('optimist', 'pessimist', 4, 'noun'),
  o('wealth', 'poverty', 4, 'noun'), o('courage', 'cowardice', 4, 'noun'), o('harmony', 'conflict', 4, 'noun'), o('order', 'chaos', 4, 'noun'), o('surplus', 'shortage', 4, 'noun'),
  o('frequently', 'rarely', 4, 'adv'), o('voluntarily', 'reluctantly', 4, 'adv'), o('literally', 'figuratively', 4, 'adv'), o('temporarily', 'permanently', 4, 'adv'), o('fortunately', 'unfortunately', 4, 'adv'),
  o('eager', 'reluctant', 4), o('sincere', 'insincere', 4), o('fragile', 'sturdy', 4), o('prosperous', 'impoverished', 4), o('superior', 'inferior', 4),
]

import type { Grade, Tier } from '../types'
import type { Pos } from './opposites'

/**
 * Synonym groups, partitioned into one disjoint pool per (grade, tier), exactly like `OPPOSITES`.
 *
 * Every word in a group means about the same thing at that level, so any two of them make a valid
 * riddle. A group lives in one pool only, so no pair is re-asked in a harder tier or a later grade.
 * Shades of the same lemma are deliberately spread across grades (angry/mad at grade 1,
 * angry/furious at grade 3) - `relatedTo` keeps the other shade out of the choices.
 *
 * `gloss` pins the sense of a multi-sense word; a word listed in `AMBIGUOUS` (vocab.ts) may only be
 * the asked word when its group glosses it, and is never offered as a decoy.
 */
export interface SynGroup {
  words: string[]
  grade: Grade
  tier: Tier
  pos: Pos
  gloss?: Record<string, string>
}

const g = (words: string[], grade: Grade, tier: Tier, pos: Pos = 'adj', gloss?: Record<string, string>): SynGroup =>
  ({ words, grade, tier, pos, gloss })

export const SYNONYMS: SynGroup[] = [
  // ---------------------------------------------------------------- Grade 1
  g(['big', 'large'], 1, 1), g(['small', 'little'], 1, 1), g(['happy', 'glad'], 1, 1), g(['sad', 'unhappy'], 1, 1),
  g(['fast', 'quick'], 1, 1), g(['loud', 'noisy'], 1, 1), g(['quiet', 'silent'], 1, 1),
  g(['start', 'begin'], 1, 1, 'verb'), g(['jump', 'hop'], 1, 1, 'verb'),
  g(['home', 'house'], 1, 1, 'noun'), g(['rock', 'stone'], 1, 1, 'noun'), g(['pal', 'buddy', 'friend'], 1, 1, 'noun'),
  // G1 tier 2
  g(['pretty', 'lovely'], 1, 2), g(['smart', 'clever'], 1, 2), g(['funny', 'silly'], 1, 2),
  g(['scared', 'afraid'], 1, 2), g(['angry', 'mad'], 1, 2), g(['tired', 'sleepy'], 1, 2),
  g(['cold', 'chilly'], 1, 2), g(['wet', 'damp'], 1, 2),
  g(['shout', 'yell'], 1, 2, 'verb'), g(['stop', 'halt'], 1, 2, 'verb'),
  g(['gift', 'present'], 1, 2, 'noun'), g(['bag', 'sack'], 1, 2, 'noun'),
  g(['cup', 'mug'], 1, 2, 'noun'), g(['coat', 'jacket'], 1, 2, 'noun'),
  // G1 tier 3
  g(['nice', 'kind', 'friendly'], 1, 3), g(['neat', 'tidy'], 1, 3), g(['hot', 'boiling'], 1, 3), g(['sick', 'ill'], 1, 3),
  g(['run', 'dash'], 1, 3, 'verb'), g(['fix', 'mend'], 1, 3, 'verb'), g(['pick', 'choose'], 1, 3, 'verb'),
  g(['shut', 'close'], 1, 3, 'verb'),
  g(['road', 'street'], 1, 3, 'noun'), g(['kid', 'child'], 1, 3, 'noun'), g(['couch', 'sofa'], 1, 3, 'noun'),
  g(['story', 'tale'], 1, 3, 'noun'),

  // ---------------------------------------------------------------- Grade 2
  g(['brave', 'bold'], 2, 1), g(['strong', 'mighty'], 2, 1), g(['weak', 'feeble'], 2, 1),
  g(['rich', 'wealthy'], 2, 1), g(['poor', 'needy'], 2, 1), g(['dirty', 'filthy'], 2, 1), g(['clean', 'spotless'], 2, 1),
  g(['make', 'build', 'create'], 2, 1, 'verb'), g(['cry', 'weep', 'sob'], 2, 1, 'verb'), g(['talk', 'speak', 'chat'], 2, 1, 'verb'),
  g(['job', 'work', 'task'], 2, 1, 'noun'), g(['trip', 'journey'], 2, 1, 'noun'), g(['hill', 'mound'], 2, 1, 'noun'),
  // G2 tier 2
  g(['strange', 'weird'], 2, 2), g(['real', 'genuine'], 2, 2), g(['fake', 'phony'], 2, 2),
  g(['shy', 'bashful'], 2, 2), g(['calm', 'peaceful'], 2, 2), g(['wild', 'untamed'], 2, 2),
  g(['break', 'smash'], 2, 2, 'verb'), g(['ask', 'question'], 2, 2, 'verb'), g(['answer', 'reply'], 2, 2, 'verb'),
  g(['help', 'assist'], 2, 2, 'verb'),
  g(['boat', 'ship'], 2, 2, 'noun'), g(['forest', 'woods'], 2, 2, 'noun'), g(['idea', 'thought'], 2, 2, 'noun'),
  g(['path', 'trail'], 2, 2, 'noun'),
  // G2 tier 3
  g(['old', 'aged'], 2, 3), g(['new', 'recent'], 2, 3), g(['hard', 'difficult', 'tough'], 2, 3, 'adj', { hard: 'tricky to do' }),
  g(['easy', 'simple'], 2, 3), g(['whole', 'entire'], 2, 3), g(['famous', 'well-known'], 2, 3),
  g(['huge', 'enormous'], 2, 3), g(['sad', 'miserable'], 2, 3),
  g(['hurry', 'rush'], 2, 3, 'verb'), g(['grab', 'snatch'], 2, 3, 'verb'), g(['toss', 'fling'], 2, 3, 'verb'),
  g(['smile', 'grin'], 2, 3, 'verb'),
  g(['error', 'mistake'], 2, 3, 'noun'), g(['sea', 'ocean'], 2, 3, 'noun'),

  // ---------------------------------------------------------------- Grade 3
  g(['angry', 'furious'], 3, 1), g(['happy', 'joyful'], 3, 1), g(['sad', 'sorrowful'], 3, 1),
  g(['scared', 'terrified'], 3, 1), g(['tiny', 'miniature'], 3, 1), g(['good', 'excellent'], 3, 1),
  g(['bad', 'awful', 'terrible'], 3, 1), g(['tired', 'exhausted'], 3, 1), g(['hungry', 'starving'], 3, 1),
  g(['cold', 'freezing'], 3, 1), g(['hot', 'scorching'], 3, 1), g(['pretty', 'gorgeous'], 3, 1),
  g(['smart', 'brilliant', 'intelligent'], 3, 1),
  // G3 tier 2
  g(['careful', 'cautious'], 3, 2), g(['lazy', 'sluggish'], 3, 2), g(['honest', 'truthful'], 3, 2),
  g(['polite', 'courteous'], 3, 2), g(['rude', 'disrespectful'], 3, 2), g(['fast', 'rapid', 'swift'], 3, 2),
  g(['strange', 'peculiar'], 3, 2), g(['brave', 'courageous', 'valiant'], 3, 2), g(['quiet', 'hushed'], 3, 2),
  g(['walk', 'stroll'], 3, 2, 'verb'), g(['eat', 'devour', 'gobble'], 3, 2, 'verb'),
  g(['laugh', 'giggle', 'chuckle'], 3, 2, 'verb'), g(['fall', 'tumble', 'topple'], 3, 2, 'verb'),
  // G3 tier 3
  g(['gather', 'collect', 'assemble'], 3, 3, 'verb'), g(['hide', 'conceal'], 3, 3, 'verb'),
  g(['leave', 'depart'], 3, 3, 'verb'), g(['show', 'display'], 3, 3, 'verb'),
  g(['find', 'discover', 'locate'], 3, 3, 'verb'), g(['guess', 'estimate'], 3, 3, 'verb'),
  g(['scare', 'frighten'], 3, 3, 'verb'), g(['stay', 'remain'], 3, 3, 'verb'),
  g(['noise', 'racket'], 3, 3, 'noun'), g(['danger', 'peril', 'hazard'], 3, 3, 'noun'),
  g(['enemy', 'foe', 'rival'], 3, 3, 'noun'), g(['feast', 'banquet'], 3, 3, 'noun'), g(['rule', 'law'], 3, 3, 'noun'),

  // ---------------------------------------------------------------- Grade 4
  g(['brief', 'concise'], 4, 1), g(['crucial', 'vital', 'essential'], 4, 1),
  g(['see', 'view', 'observe'], 4, 1, 'verb'),
  g(['fear', 'dread', 'terror'], 4, 1, 'noun'), g(['joy', 'delight', 'bliss'], 4, 1, 'noun'),
  g(['remedy', 'cure', 'treatment'], 4, 1, 'noun'), g(['goal', 'aim', 'objective'], 4, 1, 'noun'),
  g(['method', 'technique', 'procedure'], 4, 1, 'noun'),
  g(['quickly', 'rapidly', 'swiftly'], 4, 1, 'adv'), g(['quietly', 'silently'], 4, 1, 'adv'),
  g(['softly', 'gently'], 4, 1, 'adv'), g(['often', 'frequently', 'regularly'], 4, 1, 'adv'),
  g(['almost', 'nearly', 'practically'], 4, 1, 'adv'),
  // G4 tier 2
  g(['abundant', 'plentiful', 'ample'], 4, 2), g(['scarce', 'sparse'], 4, 2), g(['ancient', 'antique'], 4, 2),
  g(['difficult', 'challenging'], 4, 2), g(['eager', 'keen', 'enthusiastic'], 4, 2),
  g(['fragile', 'delicate', 'brittle'], 4, 2), g(['generous', 'charitable'], 4, 2), g(['stingy', 'miserly'], 4, 2),
  g(['hostile', 'unfriendly', 'aggressive'], 4, 2), g(['humble', 'modest'], 4, 2),
  g(['arrogant', 'conceited', 'boastful'], 4, 2), g(['loyal', 'faithful', 'devoted'], 4, 2),
  g(['clumsy', 'awkward', 'ungainly'], 4, 2),
  // G4 tier 3
  g(['obvious', 'evident', 'apparent'], 4, 3), g(['peculiar', 'bizarre'], 4, 3),
  g(['precise', 'exact', 'accurate'], 4, 3), g(['reluctant', 'unwilling', 'hesitant'], 4, 3),
  g(['sturdy', 'durable', 'robust'], 4, 3), g(['vacant', 'unoccupied'], 4, 3),
  g(['vast', 'immense', 'expansive'], 4, 3), g(['weary', 'fatigued'], 4, 3),
  g(['diligent', 'industrious'], 4, 3), g(['gloomy', 'dismal', 'dreary'], 4, 3),
  g(['abandon', 'desert', 'forsake'], 4, 3, 'verb'), g(['acquire', 'obtain', 'gain'], 4, 3, 'verb'),
  g(['demolish', 'destroy', 'wreck'], 4, 3, 'verb'),

  // ---------------------------------------------------------------- Grade 5
  g(['affluent', 'prosperous'], 5, 1), g(['catastrophe', 'disaster', 'calamity'], 5, 1, 'noun'),
  g(['quarrel', 'argument', 'dispute'], 5, 1, 'noun'), g(['portion', 'part', 'segment'], 5, 1, 'noun'),
  g(['summit', 'peak', 'pinnacle'], 5, 1, 'noun'), g(['dwelling', 'residence', 'abode'], 5, 1, 'noun'),
  g(['persuade', 'convince', 'coax'], 5, 1, 'verb'), g(['prohibit', 'forbid', 'ban'], 5, 1, 'verb'),
  g(['require', 'need', 'demand'], 5, 1, 'verb'), g(['tremble', 'shake', 'quiver'], 5, 1, 'verb'),
  g(['vanish', 'disappear', 'fade'], 5, 1, 'verb'), g(['wander', 'roam', 'ramble'], 5, 1, 'verb'),
  g(['examine', 'inspect', 'investigate'], 5, 1, 'verb'),
  // G5 tier 2
  g(['sufficient', 'adequate'], 5, 2), g(['grateful', 'thankful', 'appreciative'], 5, 2),
  g(['tranquil', 'serene', 'placid'], 5, 2),
  g(['conclude', 'finish', 'complete'], 5, 2, 'verb'), g(['comprehend', 'understand'], 5, 2, 'verb'),
  g(['neglect', 'ignore', 'overlook'], 5, 2, 'verb'),
  g(['sorrow', 'grief', 'misery'], 5, 2, 'noun'), g(['courage', 'bravery', 'valor'], 5, 2, 'noun'),
  g(['rarely', 'seldom', 'infrequently'], 5, 2, 'adv'), g(['eventually', 'finally', 'ultimately'], 5, 2, 'adv'),
  g(['entirely', 'completely', 'wholly'], 5, 2, 'adv'), g(['promptly', 'immediately', 'instantly'], 5, 2, 'adv'),
  g(['deliberately', 'intentionally', 'purposely'], 5, 2, 'adv'),
  // G5 tier 3
  g(['meticulous', 'thorough', 'painstaking'], 5, 3), g(['candid', 'frank', 'forthright'], 5, 3),
  g(['meager', 'scant', 'paltry'], 5, 3), g(['benevolent', 'kindhearted', 'compassionate'], 5, 3),
  g(['inevitable', 'unavoidable', 'certain'], 5, 3), g(['ambiguous', 'unclear', 'murky'], 5, 3),
  g(['obstinate', 'stubborn', 'headstrong'], 5, 3), g(['perilous', 'hazardous', 'treacherous'], 5, 3),
  g(['solitary', 'isolated', 'secluded'], 5, 3),
  g(['diminish', 'dwindle'], 5, 3, 'verb'), g(['anticipate', 'expect', 'foresee'], 5, 3, 'verb'),
  g(['fabricate', 'invent', 'concoct'], 5, 3, 'verb'),
  g(['adversary', 'opponent', 'antagonist'], 5, 3, 'noun'),
]

/**
 * Extra synonym links that are never asked as riddles but must still block decoys: words that mean
 * about the same through a shade or a sense the riddle pools do not pair up directly.
 */
export const EXTRA_SYNONYMS: Array<[string, string]> = [
  ['victory', 'success'], ['defeat', 'failure'], ['defeat', 'loss'], ['success', 'triumph'],
  ['rough', 'rude'], ['rough', 'harsh'], ['rough', 'bumpy'], ['smooth', 'even'],
  ['small', 'tiny'], ['little', 'tiny'], ['big', 'huge'], ['large', 'huge'], ['big', 'enormous'],
  ['giant', 'huge'], ['giant', 'enormous'], ['tiny', 'little'],
  ['show', 'reveal'], ['display', 'reveal'], ['hide', 'cover'], ['conceal', 'cover'],
  ['rich', 'affluent'], ['rich', 'prosperous'], ['wealthy', 'affluent'], ['wealthy', 'prosperous'],
  ['calm', 'tranquil'], ['calm', 'serene'], ['peaceful', 'tranquil'], ['peaceful', 'serene'],
  ['enemy', 'adversary'], ['foe', 'opponent'], ['rival', 'opponent'], ['enemy', 'opponent'],
  ['help', 'aid'], ['assist', 'aid'], ['help', 'support'],
  ['scared', 'frightened'], ['afraid', 'frightened'], ['scared', 'fearful'], ['terrified', 'petrified'],
  ['glad', 'cheerful'], ['happy', 'cheerful'], ['joyful', 'delighted'], ['happy', 'delighted'],
  ['smart', 'bright'], ['clever', 'bright'], ['smart', 'wise'],
  ['tired', 'weary'], ['tired', 'fatigued'], ['exhausted', 'drained'], ['weary', 'exhausted'],
  ['begin', 'commence'], ['start', 'commence'], ['finish', 'complete'], ['end', 'conclude'],
  ['quick', 'swift'], ['fast', 'speedy'], ['quick', 'rapid'], ['quick', 'speedy'],
  ['stingy', 'selfish'], ['generous', 'giving'], ['generous', 'unselfish'],
  ['sturdy', 'strong'], ['mighty', 'powerful'], ['strong', 'powerful'], ['durable', 'tough'],
  ['dirty', 'grimy'], ['clean', 'neat'], ['messy', 'untidy'], ['messy', 'sloppy'], ['tidy', 'orderly'],
  ['brief', 'short'], ['lengthy', 'long'], ['unusual', 'strange'], ['common', 'ordinary'],
  ['plentiful', 'abundant'], ['scarce', 'rare'], ['scarce', 'meager'],
  ['bold', 'brave'], ['bold', 'daring'], ['fierce', 'violent'], ['gentle', 'mild'], ['gentle', 'soft'],
  ['harsh', 'severe'], ['worthless', 'useless'], ['valuable', 'precious'],
  ['famous', 'renowned'], ['unknown', 'obscure'], ['awkward', 'clumsy'],
  ['deserted', 'empty'], ['deserted', 'vacant'], ['crowded', 'packed'],
  ['dangerous', 'risky'], ['dangerous', 'perilous'], ['safe', 'secure'],
  ['expensive', 'costly'], ['cheap', 'inexpensive'], ['shout', 'holler'], ['yell', 'holler'],
  ['choose', 'select'], ['pick', 'select'], ['mend', 'repair'], ['fix', 'repair'],
  ['child', 'youngster'], ['kid', 'youngster'], ['fear', 'fright'], ['difficult', 'arduous'],
  ['starving', 'famished'], ['hungry', 'famished'], ['freezing', 'icy'], ['freezing', 'frigid'],
  ['cold', 'frigid'], ['cold', 'icy'], ['scorching', 'sweltering'], ['hot', 'sweltering'],
  ['scorching', 'blazing'], ['gorgeous', 'stunning'], ['pretty', 'stunning'], ['pretty', 'beautiful'],
  ['lovely', 'beautiful'], ['idea', 'notion'], ['thought', 'notion'], ['error', 'blunder'],
  ['mistake', 'blunder'], ['trip', 'voyage'], ['journey', 'voyage'], ['boat', 'vessel'], ['ship', 'vessel'],
  ['forest', 'woodland'], ['grab', 'seize'], ['snatch', 'seize'], ['toss', 'throw'], ['fling', 'throw'],
  ['walk', 'hike'], ['wander', 'roam'], ['stay', 'linger'], ['remain', 'linger'],
  ['guess', 'predict'], ['estimate', 'predict'], ['scare', 'startle'], ['frighten', 'startle'],
  ['noise', 'clamor'], ['racket', 'clamor'], ['rule', 'regulation'], ['law', 'regulation'],
  ['answer', 'response'], ['reply', 'response'], ['solution', 'answer'],
  ['obvious', 'clear'], ['evident', 'clear'], ['precise', 'accurate'],
  ['lazy', 'idle'], ['sluggish', 'idle'], ['diligent', 'hardworking'], ['industrious', 'hardworking'], ['gloomy', 'miserable'], ['dismal', 'miserable'],
]

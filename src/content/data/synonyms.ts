import type { Pos } from './opposites'

/**
 * Synonym groups: every word in a group means about the same thing to a child at that level.
 * Level 1 = grade 1, 2 = grade 2, 3 = grade 3 shades, 4 = grades 4-5 vocabulary.
 */
export interface SynGroup { words: string[]; level: 1 | 2 | 3 | 4; pos: Pos }

const g = (words: string[], level: 1 | 2 | 3 | 4, pos: Pos = 'adj'): SynGroup => ({ words, level, pos })

export const SYNONYMS: SynGroup[] = [
  // level 1
  g(['big', 'large', 'huge'], 1), g(['small', 'little', 'tiny'], 1), g(['happy', 'glad', 'cheerful'], 1), g(['sad', 'unhappy', 'gloomy'], 1),
  g(['fast', 'quick', 'speedy'], 1), g(['slow', 'poky'], 1), g(['loud', 'noisy'], 1), g(['quiet', 'silent', 'hushed'], 1),
  g(['pretty', 'beautiful', 'lovely'], 1), g(['smart', 'clever', 'bright'], 1), g(['funny', 'silly', 'goofy'], 1), g(['scared', 'afraid', 'frightened'], 1),
  g(['angry', 'mad', 'cross'], 1), g(['tired', 'sleepy'], 1), g(['cold', 'chilly', 'freezing'], 1), g(['hot', 'boiling'], 1),
  g(['nice', 'kind', 'friendly'], 1), g(['mean', 'unkind', 'cruel'], 1), g(['wet', 'damp', 'soggy'], 1), g(['neat', 'tidy', 'orderly'], 1),
  g(['begin', 'start'], 1, 'verb'), g(['stop', 'halt', 'quit'], 1, 'verb'), g(['look', 'see', 'watch'], 1, 'verb'), g(['shout', 'yell', 'holler'], 1, 'verb'),
  g(['jump', 'leap', 'hop'], 1, 'verb'), g(['run', 'dash', 'sprint'], 1, 'verb'), g(['fix', 'repair', 'mend'], 1, 'verb'), g(['pick', 'choose', 'select'], 1, 'verb'),
  g(['home', 'house'], 1, 'noun'), g(['kid', 'child', 'youngster'], 1, 'noun'), g(['road', 'street'], 1, 'noun'), g(['rock', 'stone'], 1, 'noun'),
  g(['gift', 'present'], 1, 'noun'), g(['bag', 'sack'], 1, 'noun'), g(['pal', 'friend', 'buddy'], 1, 'noun'), g(['couch', 'sofa'], 1, 'noun'),
  // level 2
  g(['brave', 'bold', 'courageous'], 2), g(['strong', 'powerful', 'mighty'], 2), g(['weak', 'feeble', 'frail'], 2), g(['rich', 'wealthy'], 2),
  g(['poor', 'needy', 'penniless'], 2), g(['old', 'ancient', 'aged'], 2), g(['new', 'fresh', 'recent'], 2), g(['hard', 'difficult', 'tough'], 2),
  g(['easy', 'simple'], 2), g(['dirty', 'filthy', 'grimy'], 2), g(['clean', 'spotless'], 2), g(['strange', 'odd', 'weird'], 2),
  g(['real', 'true', 'genuine'], 2), g(['fake', 'false', 'phony'], 2), g(['sick', 'ill', 'unwell'], 2), g(['whole', 'entire', 'complete'], 2),
  g(['shy', 'timid', 'bashful'], 2), g(['calm', 'peaceful', 'relaxed'], 2), g(['wild', 'untamed'], 2), g(['famous', 'well-known'], 2),
  g(['end', 'finish', 'complete'], 2, 'verb'), g(['make', 'build', 'create'], 2, 'verb'), g(['break', 'smash', 'shatter'], 2, 'verb'), g(['cry', 'weep', 'sob'], 2, 'verb'),
  g(['talk', 'speak', 'chat'], 2, 'verb'), g(['ask', 'question', 'inquire'], 2, 'verb'), g(['answer', 'reply', 'respond'], 2, 'verb'), g(['help', 'assist', 'aid'], 2, 'verb'),
  g(['hurry', 'rush', 'hasten'], 2, 'verb'), g(['grab', 'seize', 'snatch'], 2, 'verb'), g(['shut', 'close'], 2, 'verb'), g(['toss', 'throw', 'fling'], 2, 'verb'),
  g(['error', 'mistake', 'blunder'], 2, 'noun'), g(['job', 'work', 'task'], 2, 'noun'), g(['story', 'tale'], 2, 'noun'), g(['trip', 'journey', 'voyage'], 2, 'noun'),
  g(['boat', 'ship', 'vessel'], 2, 'noun'), g(['forest', 'woods'], 2, 'noun'), g(['hill', 'mound'], 2, 'noun'), g(['idea', 'thought', 'notion'], 2, 'noun'),
  // level 3: shades of meaning
  g(['angry', 'furious', 'enraged'], 3), g(['happy', 'joyful', 'delighted'], 3), g(['sad', 'miserable', 'sorrowful'], 3), g(['scared', 'terrified', 'petrified'], 3),
  g(['big', 'enormous', 'gigantic'], 3), g(['small', 'minute', 'miniature'], 3), g(['good', 'excellent', 'superb'], 3), g(['bad', 'awful', 'terrible'], 3),
  g(['tired', 'exhausted', 'drained'], 3), g(['hungry', 'starving', 'famished'], 3), g(['cold', 'frigid', 'icy'], 3), g(['hot', 'sweltering', 'blazing', 'scorching'], 3),
  g(['smart', 'brilliant', 'intelligent'], 3), g(['pretty', 'gorgeous', 'stunning'], 3), g(['fast', 'rapid', 'swift'], 3), g(['careful', 'cautious', 'wary'], 3),
  g(['lazy', 'idle', 'sluggish'], 3), g(['honest', 'truthful', 'sincere'], 3), g(['polite', 'courteous', 'respectful'], 3), g(['rude', 'impolite', 'disrespectful'], 3),
  g(['walk', 'stroll', 'wander'], 3, 'verb'), g(['eat', 'devour', 'gobble'], 3, 'verb'), g(['laugh', 'giggle', 'chuckle'], 3, 'verb'), g(['fall', 'tumble', 'topple'], 3, 'verb'),
  g(['gather', 'collect', 'assemble'], 3, 'verb'), g(['hide', 'conceal'], 3, 'verb'), g(['leave', 'depart', 'exit'], 3, 'verb'), g(['show', 'display', 'reveal'], 3, 'verb'),
  g(['find', 'discover', 'locate'], 3, 'verb'), g(['guess', 'estimate', 'predict'], 3, 'verb'), g(['scare', 'frighten', 'startle'], 3, 'verb'), g(['stay', 'remain', 'linger'], 3, 'verb'),
  g(['noise', 'racket', 'clamor'], 3, 'noun'), g(['danger', 'peril', 'hazard'], 3, 'noun'), g(['enemy', 'foe', 'rival'], 3, 'noun'), g(['feast', 'banquet'], 3, 'noun'),
  g(['fear', 'dread', 'terror'], 3, 'noun'), g(['joy', 'delight', 'bliss'], 3, 'noun'), g(['rule', 'law', 'regulation'], 3, 'noun'), g(['answer', 'solution', 'response'], 3, 'noun'),
  g(['quickly', 'rapidly', 'swiftly'], 3, 'adv'), g(['quietly', 'softly', 'silently'], 3, 'adv'), g(['often', 'frequently', 'regularly'], 3, 'adv'), g(['almost', 'nearly', 'practically'], 3, 'adv'),
  // level 4: grades 4-5 vocabulary
  g(['abundant', 'plentiful', 'ample'], 4), g(['scarce', 'rare', 'sparse'], 4), g(['ancient', 'antique', 'archaic'], 4), g(['brief', 'short', 'concise'], 4),
  g(['crucial', 'vital', 'essential'], 4), g(['difficult', 'challenging', 'arduous'], 4), g(['eager', 'keen', 'enthusiastic'], 4), g(['fragile', 'delicate', 'brittle'], 4),
  g(['generous', 'charitable', 'giving'], 4), g(['stingy', 'miserly', 'selfish'], 4), g(['hostile', 'unfriendly', 'aggressive'], 4), g(['humble', 'modest', 'unassuming'], 4),
  g(['arrogant', 'conceited', 'boastful'], 4), g(['loyal', 'faithful', 'devoted'], 4), g(['obvious', 'evident', 'apparent'], 4), g(['odd', 'peculiar', 'unusual'], 4),
  g(['precise', 'exact', 'accurate'], 4), g(['reluctant', 'unwilling', 'hesitant'], 4), g(['sturdy', 'durable', 'robust'], 4), g(['vacant', 'empty', 'unoccupied'], 4),
  g(['vast', 'immense', 'expansive'], 4), g(['wealthy', 'affluent', 'prosperous'], 4), g(['weary', 'fatigued', 'exhausted'], 4), g(['clumsy', 'awkward', 'ungainly'], 4),
  g(['diligent', 'hardworking', 'industrious'], 4), g(['gloomy', 'dismal', 'dreary'], 4), g(['brave', 'valiant', 'fearless'], 4), g(['calm', 'tranquil', 'serene'], 4),
  g(['abandon', 'desert', 'forsake'], 4, 'verb'), g(['acquire', 'obtain', 'gain'], 4, 'verb'), g(['assist', 'support', 'aid'], 4, 'verb'), g(['conclude', 'finish', 'complete'], 4, 'verb'),
  g(['demolish', 'destroy', 'wreck'], 4, 'verb'), g(['examine', 'inspect', 'investigate'], 4, 'verb'), g(['persuade', 'convince', 'coax'], 4, 'verb'), g(['prohibit', 'forbid', 'ban'], 4, 'verb'),
  g(['require', 'need', 'demand'], 4, 'verb'), g(['tremble', 'shake', 'quiver'], 4, 'verb'), g(['vanish', 'disappear', 'fade'], 4, 'verb'), g(['wander', 'roam', 'drift'], 4, 'verb'),
  g(['catastrophe', 'disaster', 'calamity'], 4, 'noun'), g(['dwelling', 'residence', 'home'], 4, 'noun'), g(['goal', 'aim', 'objective'], 4, 'noun'), g(['method', 'technique', 'procedure'], 4, 'noun'),
  g(['portion', 'part', 'segment'], 4, 'noun'), g(['quarrel', 'argument', 'dispute'], 4, 'noun'), g(['remedy', 'cure', 'treatment'], 4, 'noun'), g(['summit', 'peak', 'top'], 4, 'noun'),
  g(['rarely', 'seldom', 'infrequently'], 4, 'adv'), g(['eventually', 'finally', 'ultimately'], 4, 'adv'), g(['entirely', 'completely', 'wholly'], 4, 'adv'), g(['promptly', 'immediately', 'instantly'], 4, 'adv'),
]

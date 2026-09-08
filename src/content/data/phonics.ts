/** Word families for rhyming. Each family: the ending and real, child-friendly words that share it. */
export interface Family {
  /** Spelling ending shared by (most of) the words; painted red in the prompt. */
  end: string
  words: string[]
  /**
   * 1 CVC (K), 2 blends/digraphs/-ck/-ng (grade 1), 3 vowel teams and silent e (grade 2),
   * 4 two-syllable (grades 3-4), 5 three-syllable (grades 4-5),
   * 6 rhymes whose spellings differ, so they must be matched by sound (grades 4-5).
   */
  level: 1 | 2 | 3 | 4 | 5 | 6
  /** Sub-pool inside level 1 so K tiers get different families: short a, short i, short o/u/e. */
  group?: 'a' | 'i' | 'o'
  /** Rhyme class when the spelling ending does not identify the sound (see rhymeClass). */
  cls?: string
  /** The words rhyme by sound but not by a shared spelling: no ending is highlighted. */
  varied?: boolean
  /** Words that may be shown in the prompt but never offered as an answer or a decoy (capitalised words). */
  promptOnly?: string[]
  /** Words that may only be the answer once the pattern is taught (grade 2+, or grade 1 tier 3). */
  advanced?: string[]
}

export const FAMILIES: Family[] = [
  // --- level 1: CVC, short a ------------------------------------------------------------------
  { end: 'at', words: ['cat', 'hat', 'bat', 'rat', 'mat', 'sat', 'fat', 'pat'], level: 1, group: 'a' },
  { end: 'an', words: ['can', 'man', 'pan', 'fan', 'ran', 'van', 'tan'], level: 1, group: 'a' },
  { end: 'ap', words: ['cap', 'map', 'nap', 'tap', 'lap', 'gap', 'zap'], level: 1, group: 'a' },
  { end: 'ag', words: ['bag', 'rag', 'tag', 'wag', 'nag', 'flag'], level: 1, group: 'a' },
  { end: 'ad', words: ['dad', 'sad', 'mad', 'bad', 'pad', 'had', 'lad'], level: 1, group: 'a' },
  { end: 'am', words: ['jam', 'ham', 'ram', 'yam', 'dam', 'clam'], level: 1, group: 'a' },
  // --- level 1: CVC, short i -----------------------------------------------------------------
  { end: 'ig', words: ['pig', 'wig', 'dig', 'big', 'fig', 'jig', 'rig'], level: 1, group: 'i' },
  { end: 'in', words: ['pin', 'fin', 'win', 'tin', 'bin', 'chin', 'grin'], level: 1, group: 'i' },
  { end: 'ip', words: ['lip', 'hip', 'dip', 'rip', 'tip', 'zip', 'sip'], level: 1, group: 'i' },
  { end: 'it', words: ['sit', 'hit', 'bit', 'fit', 'kit', 'lit', 'pit'], level: 1, group: 'i' },
  { end: 'id', words: ['lid', 'kid', 'hid', 'bid', 'did', 'rid'], level: 1, group: 'i' },
  // --- level 1: CVC, short o / u / e ----------------------------------------------------------
  { end: 'ot', words: ['pot', 'hot', 'dot', 'cot', 'lot', 'not', 'got', 'rot'], level: 1, group: 'o' },
  { end: 'op', words: ['top', 'mop', 'hop', 'pop', 'cop', 'stop', 'drop'], level: 1, group: 'o' },
  { end: 'og', words: ['dog', 'log', 'fog', 'hog', 'jog', 'frog', 'bog'], level: 1, group: 'o' },
  { end: 'ug', words: ['bug', 'mug', 'rug', 'hug', 'jug', 'tug', 'dug'], level: 1, group: 'o' },
  { end: 'un', words: ['sun', 'fun', 'run', 'bun', 'nun', 'spun'], level: 1, group: 'o' },
  { end: 'ut', words: ['nut', 'hut', 'cut', 'but', 'rut', 'shut'], level: 1, group: 'o' },
  { end: 'ub', words: ['tub', 'cub', 'rub', 'sub', 'hub', 'club'], level: 1, group: 'o' },
  { end: 'ed', words: ['bed', 'red', 'fed', 'led', 'wed', 'shed', 'sled'], level: 1, group: 'o' },
  { end: 'en', words: ['hen', 'pen', 'ten', 'men', 'den', 'then', 'when'], level: 1, group: 'o' },
  { end: 'et', words: ['net', 'pet', 'wet', 'jet', 'get', 'let', 'vet', 'met'], level: 1, group: 'o' },
  // --- level 2: blends, digraphs, -ck / -ng / -ll ----------------------------------------------
  { end: 'ack', words: ['back', 'pack', 'sack', 'jack', 'rack', 'snack', 'track', 'black'], level: 2 },
  { end: 'ick', words: ['kick', 'lick', 'pick', 'sick', 'tick', 'stick', 'brick', 'chick'], level: 2 },
  // 'knock' has a silent k, so it is only offered as an answer from grade 2 (or grade 1 tier 3).
  { end: 'ock', words: ['sock', 'rock', 'lock', 'dock', 'clock', 'block', 'knock'], level: 2, advanced: ['knock'] },
  { end: 'uck', words: ['duck', 'luck', 'truck', 'stuck', 'buck', 'cluck'], level: 2 },
  { end: 'ing', words: ['king', 'ring', 'sing', 'wing', 'swing', 'string', 'bring', 'thing'], level: 2 },
  { end: 'ang', words: ['bang', 'hang', 'rang', 'sang', 'gang', 'fang'], level: 2 },
  { end: 'ink', words: ['pink', 'sink', 'wink', 'drink', 'think', 'blink', 'stink'], level: 2 },
  { end: 'ank', words: ['bank', 'tank', 'thank', 'sank', 'blank', 'plank', 'drank'], level: 2 },
  { end: 'unk', words: ['bunk', 'junk', 'trunk', 'skunk', 'chunk', 'dunk'], level: 2 },
  { end: 'ump', words: ['jump', 'bump', 'lump', 'pump', 'dump', 'stump', 'plump'], level: 2 },
  { end: 'amp', words: ['camp', 'lamp', 'stamp', 'damp', 'ramp', 'champ'], level: 2 },
  { end: 'est', words: ['nest', 'best', 'rest', 'test', 'vest', 'west', 'chest'], level: 2 },
  { end: 'ish', words: ['fish', 'dish', 'wish', 'swish', 'squish'], level: 2 },
  { end: 'ash', words: ['cash', 'dash', 'mash', 'rash', 'splash', 'trash', 'flash', 'crash'], level: 2 },
  { end: 'ell', words: ['bell', 'sell', 'tell', 'well', 'shell', 'smell', 'spell', 'yell'], level: 2 },
  { end: 'ill', words: ['hill', 'fill', 'pill', 'will', 'still', 'spill', 'drill', 'chill'], level: 2 },
  { end: 'all', words: ['ball', 'call', 'fall', 'hall', 'tall', 'wall', 'small', 'mall'], level: 2 },
  // --- level 3: vowel teams and silent e -------------------------------------------------------
  { end: 'ain', words: ['rain', 'train', 'pain', 'main', 'chain', 'brain', 'grain', 'plain'], level: 3 },
  { end: 'ake', words: ['cake', 'lake', 'make', 'bake', 'rake', 'snake', 'wake', 'shake'], level: 3 },
  { end: 'ame', words: ['game', 'name', 'same', 'came', 'tame', 'flame', 'frame', 'blame'], level: 3 },
  { end: 'ate', words: ['gate', 'late', 'date', 'plate', 'skate', 'state', 'crate'], level: 3 },
  { end: 'eat', words: ['eat', 'seat', 'heat', 'meat', 'neat', 'treat', 'wheat', 'beat'], level: 3 },
  { end: 'eep', words: ['deep', 'keep', 'jeep', 'sheep', 'sleep', 'sweep', 'creep', 'peep'], level: 3 },
  { end: 'ide', words: ['ride', 'hide', 'side', 'wide', 'slide', 'bride', 'glide', 'tide'], level: 3 },
  { end: 'ight', words: ['light', 'night', 'right', 'sight', 'bright', 'fight', 'tight', 'flight'], level: 3 },
  { end: 'ine', words: ['line', 'nine', 'pine', 'fine', 'mine', 'shine', 'vine', 'spine'], level: 3 },
  { end: 'oat', words: ['boat', 'coat', 'goat', 'float', 'moat', 'throat'], level: 3 },
  { end: 'oke', words: ['joke', 'poke', 'woke', 'smoke', 'broke', 'spoke', 'choke'], level: 3 },
  { end: 'ool', words: ['cool', 'pool', 'tool', 'school', 'stool', 'drool', 'spool'], level: 3 },
  { end: 'oon', words: ['moon', 'soon', 'noon', 'spoon', 'balloon', 'cartoon', 'raccoon'], level: 3 },
  { end: 'ay', words: ['day', 'play', 'say', 'way', 'stay', 'gray', 'clay', 'tray'], level: 3 },
  { end: 'ail', words: ['mail', 'nail', 'sail', 'tail', 'pail', 'snail', 'trail', 'rail'], level: 3 },
  // 'bow' is a heteronym (bow of a ribbon does not rhyme with cow), so it is not in this family.
  { end: 'ow', words: ['cow', 'how', 'now', 'wow', 'plow', 'vow', 'brow', 'chow'], level: 3 },
  { end: 'own', words: ['down', 'town', 'clown', 'brown', 'crown', 'frown', 'gown'], level: 3 },
  // --- level 4: two-syllable --------------------------------------------------------------------
  { end: 'ower', words: ['flower', 'power', 'tower', 'shower'], level: 4 },
  { end: 'unny', words: ['funny', 'sunny', 'bunny', 'runny'], level: 4 },
  { end: 'andle', words: ['candle', 'handle', 'sandal'], level: 4 },
  { end: 'etter', words: ['letter', 'better', 'wetter', 'sweater'], level: 4 },
  { end: 'ubble', words: ['bubble', 'double', 'trouble', 'rubble'], level: 4 },
  { end: 'able', words: ['table', 'cable', 'stable', 'label', 'fable'], level: 4 },
  { end: 'otion', words: ['motion', 'potion', 'lotion', 'ocean', 'notion'], level: 4 },
  { end: 'itten', words: ['kitten', 'mitten', 'written', 'bitten'], level: 4 },
  { end: 'elly', words: ['jelly', 'belly', 'smelly'], level: 4 },
  { end: 'ocket', words: ['rocket', 'pocket', 'socket', 'locket'], level: 4 },
  { end: 'andy', words: ['candy', 'handy', 'sandy', 'dandy'], level: 4 },
  { end: 'eather', words: ['feather', 'weather', 'leather', 'together'], level: 4 },
  { end: 'easure', words: ['treasure', 'measure', 'pleasure'], level: 4 },
  { end: 'ation', words: ['station', 'nation', 'vacation', 'creation', 'location'], level: 4 },
  { end: 'ickle', words: ['pickle', 'tickle', 'nickel', 'trickle'], level: 4 },
  { end: 'umble', words: ['tumble', 'grumble', 'stumble', 'mumble', 'crumble'], level: 4 },
  { end: 'inkle', words: ['twinkle', 'sprinkle', 'wrinkle', 'crinkle'], level: 4 },
  { end: 'iggle', words: ['giggle', 'wiggle', 'jiggle', 'wriggle'], level: 4 },
  { end: 'ummy', words: ['tummy', 'yummy', 'gummy', 'crummy'], level: 4 },
  { end: 'utter', words: ['butter', 'flutter', 'mutter', 'clutter', 'shutter'], level: 4 },
  { end: 'ipper', words: ['zipper', 'flipper', 'slipper', 'dipper'], level: 4 },
  { end: 'icket', words: ['ticket', 'cricket', 'picket', 'thicket'], level: 4 },
  { end: 'ery', words: ['very', 'berry', 'cherry', 'merry', 'ferry'], level: 4 },
  // Month names are capitalised, so they are prompt words only: a capital letter must never
  // point at the answer (and a capitalised decoy is trivially eliminated).
  { end: 'ember', words: ['member', 'remember', 'ember', 'September', 'December', 'November'], level: 4, promptOnly: ['September', 'December', 'November'] },
  // --- level 5: three-syllable --------------------------------------------------------------
  { end: 'ation', words: ['imagination', 'destination', 'combination', 'explanation', 'celebration', 'decoration', 'invitation', 'information'], level: 5 },
  { end: 'ate', words: ['celebrate', 'decorate', 'operate', 'hesitate', 'concentrate', 'demonstrate', 'illustrate'], level: 5 },
  { end: 'ention', words: ['attention', 'invention', 'intention', 'prevention', 'convention'], level: 5 },
  { end: 'ection', words: ['collection', 'direction', 'protection', 'connection', 'election', 'infection'], level: 5 },
  { end: 'astic', words: ['fantastic', 'elastic', 'plastic', 'drastic'], level: 5 },
  { end: 'ility', words: ['ability', 'agility', 'humility', 'fragility', 'stability'], level: 5 },
  { end: 'icious', words: ['delicious', 'suspicious', 'ambitious', 'nutritious', 'superstitious'], level: 5 },
  { end: 'ision', words: ['television', 'decision', 'division', 'collision', 'vision'], level: 5 },
  // --- level 6: same sound, different spelling (match by ear) ---------------------------------
  { end: 'eight', cls: 'ate', varied: true, words: ['great', 'straight', 'weight', 'eight', 'freight', 'wait', 'plate', 'skate'], level: 6 },
  { end: 'oh', cls: 'oh', varied: true, words: ['though', 'toe', 'sew', 'go', 'snow', 'dough', 'hoe', 'slow'], level: 6 },
  { end: 'erd', cls: 'erd', varied: true, words: ['heard', 'bird', 'word', 'herd', 'third', 'nerd'], level: 6 },
  { end: 'unny', cls: 'unny', varied: true, words: ['money', 'honey', 'funny', 'sunny', 'bunny', 'runny'], level: 6 },
  { end: 'igh', cls: 'iLong', varied: true, words: ['butterfly', 'dragonfly', 'firefly', 'multiply', 'satisfy', 'goodbye'], level: 6 },
  { end: 'air', cls: 'air', varied: true, words: ['bear', 'hair', 'there', 'share', 'chair', 'stare', 'pear', 'where'], level: 6 },
  { end: 'oo', cls: 'oo', varied: true, words: ['blue', 'shoe', 'through', 'two', 'chew', 'grew', 'glue', 'true'], level: 6 },
  { end: 'ear', cls: 'eer', varied: true, words: ['here', 'hear', 'deer', 'cheer', 'clear', 'near', 'year'], level: 6 },
  { end: 'ore', cls: 'or', varied: true, words: ['four', 'door', 'more', 'store', 'floor', 'roar', 'pour', 'shore'], level: 6 },
  { end: 'uff', cls: 'uff', varied: true, words: ['rough', 'tough', 'enough', 'stuff', 'puff', 'fluff'], level: 6 },
]

/** Rhyme sound classes so decoys never accidentally rhyme (e.g. -ain vs -ane, -eat vs -eet). */
export const RHYME_ALIASES: Record<string, string> = {
  ain: 'ane', ane: 'ane', eat: 'eet', eet: 'eet', ight: 'ite', ite: 'ite', ake: 'ake', oat: 'ote', ote: 'ote', oke: 'oke',
  ay: 'ay', ail: 'ale', ale: 'ale', ow: 'ow', own: 'own', unny: 'unny', oney: 'unny', andle: 'andle', able: 'able',
  otion: 'otion', ery: 'ery', ember: 'ember', ation: 'ation', ool: 'ool', oon: 'oon', ine: 'ine', ide: 'ide', ate: 'ate',
  ame: 'ame', eight: 'ate', ait: 'ate',
}
export const rhymeClass = (end: string): string => RHYME_ALIASES[end] ?? end
/** The sound class of a whole family (an explicit `cls` wins over the spelling ending). */
export const familyClass = (f: Family): string => f.cls ?? rhymeClass(f.end)

const WORD_CLASSES = new Map<string, Set<string>>()
for (const f of FAMILIES) {
  for (const w of f.words) {
    const k = w.toLowerCase()
    if (!WORD_CLASSES.has(k)) WORD_CLASSES.set(k, new Set())
    WORD_CLASSES.get(k)!.add(familyClass(f))
  }
}
/** Every rhyme class a word belongs to; used to keep decoys from rhyming with the answer. */
export const classesOf = (w: string): Set<string> => WORD_CLASSES.get(w.toLowerCase()) ?? new Set<string>()
/** Words that may never be an answer or a decoy anywhere (capitalised prompt words). */
export const PROMPT_ONLY = new Set(FAMILIES.flatMap(f => f.promptOnly ?? []).map(w => w.toLowerCase()))

/** A plain consonant-vowel-consonant word: the only thing a K tier-1 child can decode. */
export const isCvc = (w: string): boolean => /^[bcdfghjklmnpqrstvwxyz][aeiou][bcdfghjklmnpqrstvwxyz]$/.test(w)
/** No initial blend or digraph (kindergarten reading level). */
export const noInitialBlend = (w: string): boolean => /^[a-z][aeiou]/.test(w)

/** Picture-able words by first letter (K beginning sounds). */
export const BEGINNING: Record<string, string[]> = {
  b: ['ball', 'bat', 'bug', 'bed', 'bus', 'box', 'bee', 'bear'],
  c: ['cat', 'cup', 'car', 'cow', 'cap', 'can', 'cake', 'corn'],
  d: ['dog', 'duck', 'dot', 'dig', 'doll', 'door', 'desk'],
  f: ['fox', 'fan', 'fish', 'fig', 'fun', 'foot', 'frog'],
  g: ['goat', 'gum', 'gas', 'gap', 'gate', 'girl', 'gift'],
  h: ['hat', 'hen', 'hop', 'hug', 'hill', 'hand', 'horse'],
  j: ['jam', 'jet', 'jog', 'jug', 'jar', 'jump', 'jeep'],
  k: ['kite', 'key', 'kid', 'king', 'kick', 'kitten', 'kangaroo'],
  l: ['lip', 'log', 'leg', 'lamp', 'lion', 'leaf', 'lock'],
  m: ['map', 'mud', 'mop', 'man', 'milk', 'moon', 'mouse'],
  n: ['net', 'nut', 'nap', 'nose', 'nest', 'nine', 'nail'],
  p: ['pig', 'pan', 'pot', 'pen', 'pin', 'pie', 'pear'],
  r: ['rug', 'rat', 'red', 'run', 'rock', 'ring', 'rain'],
  s: ['sun', 'sock', 'sit', 'sad', 'six', 'seal', 'soap'],
  t: ['top', 'tub', 'ten', 'tap', 'tent', 'toy', 'tree'],
  v: ['van', 'vet', 'vase', 'vest', 'vine', 'violin'],
  w: ['web', 'wig', 'wax', 'wet', 'wing', 'worm', 'wall', 'wave', 'wood'],
  y: ['yak', 'yes', 'yarn', 'yell', 'yard', 'yo-yo', 'yawn'],
  z: ['zip', 'zoo', 'zap', 'zebra', 'zero', 'zigzag'],
}

/** Words grouped by final sound for "ending sound" riddles (K-1). */
export const ENDING: Record<string, string[]> = {
  n: ['sun', 'fan', 'pen', 'fin', 'ten', 'man', 'can', 'run', 'pin', 'bun'],
  t: ['cat', 'hat', 'net', 'pot', 'nut', 'sit', 'bat', 'jet', 'hut', 'mat'],
  p: ['cup', 'map', 'top', 'lip', 'hop', 'cap', 'mop', 'zip', 'nap', 'tip'],
  g: ['dog', 'pig', 'bug', 'log', 'wig', 'rug', 'bag', 'jug', 'leg', 'fog'],
  d: ['bed', 'red', 'lid', 'mud', 'dad', 'kid', 'pad', 'rod', 'sad', 'bud'],
  m: ['jam', 'ham', 'gum', 'hum', 'yam', 'ram', 'dim', 'rim', 'sum', 'drum'],
  b: ['tub', 'cab', 'web', 'rib', 'cub', 'job', 'sob', 'rub', 'crab', 'grab'],
  k: ['duck', 'sock', 'rock', 'back', 'kick', 'book', 'milk', 'lock', 'pick', 'truck'],
  x: ['fox', 'box', 'six', 'wax', 'mix', 'ax', 'ox', 'fix'],
  ss: ['kiss', 'miss', 'boss', 'moss', 'dress', 'mess', 'less', 'grass', 'glass', 'pass'],
  ll: ['bell', 'ball', 'doll', 'hill', 'well', 'fill', 'tall', 'wall', 'shell', 'pull'],
}

/** Digraphs at the START of a word (grade 1 tier 2, grade 2 tier 1 review). */
export const DIGRAPHS: Record<string, string[]> = {
  sh: ['ship', 'shop', 'shut', 'shell', 'sheep', 'shoe', 'shark', 'shirt'],
  ch: ['chip', 'chop', 'chin', 'chick', 'chair', 'cheese', 'chest', 'cherry'],
  th: ['this', 'that', 'thin', 'thumb', 'three', 'think', 'thorn', 'throw'],
  wh: ['when', 'whip', 'what', 'whale', 'wheel', 'white', 'whisper', 'wheat'],
  qu: ['queen', 'quilt', 'quick', 'quiet', 'quack', 'question'],
}

/** The same digraphs at the END of a word: harder, so grade 1 tier 3. */
export const ENDING_DIGRAPHS: Record<string, string[]> = {
  sh: ['fish', 'dish', 'wish', 'push', 'brush', 'crash', 'flash', 'trash'],
  ch: ['much', 'such', 'beach', 'lunch', 'bench', 'peach', 'teach', 'reach'],
  tch: ['watch', 'catch', 'match', 'patch', 'witch', 'pitch', 'ditch', 'hatch'],
  th: ['bath', 'math', 'path', 'with', 'teeth', 'tooth', 'both', 'mouth'],
  ng: ['ring', 'king', 'song', 'wing', 'long', 'strong', 'swing', 'thing'],
  ck: ['duck', 'sock', 'black', 'stick', 'truck', 'clock', 'snack', 'brick'],
}

/** Blends at the start of a word: two-letter (grade 2 tiers 1-2) and three-letter (tier 3). */
export const BLENDS: Record<string, string[]> = {
  bl: ['blue', 'black', 'block', 'blow', 'blanket', 'blink'],
  cl: ['clap', 'clock', 'cloud', 'clip', 'clean', 'climb'],
  fl: ['flag', 'flip', 'flat', 'fly', 'flower', 'float'],
  gl: ['glad', 'glue', 'glass', 'globe', 'glow', 'glove'],
  pl: ['plan', 'play', 'plum', 'plant', 'plate', 'plus'],
  sl: ['slip', 'slide', 'sled', 'slow', 'sleep', 'slug'],
  br: ['brick', 'bread', 'brush', 'bring', 'brown', 'branch'],
  cr: ['crab', 'crib', 'crop', 'crow', 'crown', 'cross'],
  dr: ['drum', 'drip', 'dress', 'drop', 'draw', 'dragon'],
  fr: ['frog', 'free', 'fruit', 'fresh', 'friend', 'frame'],
  gr: ['grab', 'green', 'grass', 'grin', 'grape', 'grow'],
  pr: ['print', 'press', 'prize', 'pretty', 'proud', 'pray'],
  tr: ['trip', 'tree', 'truck', 'train', 'trap', 'trick'],
  sk: ['skip', 'skin', 'skate', 'sky', 'skunk', 'sketch'],
  sm: ['smile', 'small', 'smell', 'smoke', 'smart', 'smooth'],
  sn: ['snap', 'snail', 'snake', 'snow', 'sniff', 'snack'],
  sp: ['spin', 'spot', 'spoon', 'spider', 'spill', 'space'],
  st: ['stop', 'star', 'stick', 'step', 'stone', 'stamp'],
  sw: ['swim', 'swing', 'sweet', 'swan', 'sweep', 'switch'],
  str: ['strap', 'street', 'string', 'strong', 'straw', 'stripe'],
  spr: ['spring', 'spray', 'sprout', 'sprint', 'sprinkle', 'spread'],
  scr: ['scrub', 'scream', 'screen', 'scratch', 'scribble', 'scrap'],
  spl: ['splash', 'split', 'splint', 'splendid', 'splatter', 'splinter'],
  squ: ['squid', 'squish', 'square', 'squeeze', 'squirrel', 'squeak'],
  thr: ['three', 'throw', 'throne', 'thread', 'through', 'thrill'],
}

/** Blends at the END of a word (grade 2 tier 3). */
export const FINAL_BLENDS: Record<string, string[]> = {
  nd: ['hand', 'sand', 'wind', 'bend', 'pond', 'land', 'friend', 'round'],
  nt: ['tent', 'ant', 'plant', 'paint', 'print', 'went', 'front', 'point'],
  st: ['nest', 'best', 'fast', 'list', 'most', 'last', 'rest', 'toast'],
  mp: ['jump', 'lamp', 'camp', 'stamp', 'bump', 'ramp', 'limp', 'damp'],
  nk: ['bank', 'pink', 'think', 'drink', 'sink', 'trunk', 'skunk', 'blank'],
  lt: ['belt', 'melt', 'salt', 'quilt', 'built', 'felt', 'tilt', 'bolt'],
  ft: ['gift', 'left', 'soft', 'lift', 'raft', 'craft', 'drift', 'swift'],
}

/**
 * The sound a word ends with, written the way the riddles ask for it ('duck' -> k, 'fox' -> ks,
 * 'bank' -> nk). Used to keep decoys from sharing the ending sound the riddle asks about.
 */
export function endSoundOf(w: string): string {
  const s = w.toLowerCase()
  for (const p of ['nd', 'nt', 'mp', 'nk', 'lt', 'ft', 'st']) if (s.endsWith(p)) return p
  if (/ng$/.test(s)) return 'ng'
  if (/(ck|k)$/.test(s)) return 'k'
  if (/sh$/.test(s)) return 'sh'
  if (/(tch|ch)$/.test(s)) return 'ch'
  if (/th$/.test(s)) return 'th'
  if (/x$/.test(s)) return 'ks'
  if (/(ss|ce|se|s)$/.test(s)) return 's'
  if (/(ll|le|l)$/.test(s)) return 'l'
  return s.slice(-1)
}

/** The sound a riddle means when it asks for words ending with `key` ('ss' -> s, 'ck' -> k). */
export const endKeySound = (key: string): string => (key === 'ss' ? 's' : key === 'll' ? 'l' : key === 'ck' ? 'k' : key === 'x' ? 'ks' : key)

/** The sound a word begins with: c and k are the same sound, so they never decoy for each other. */
export const beginSoundOf = (key: string): string => (key === 'c' ? 'k' : key)

/** Words with a known syllable count. */
export const SYLLABLES: Record<number, string[]> = {
  1: ['cat', 'dog', 'sun', 'tree', 'book', 'fish', 'jump', 'ball', 'milk', 'frog', 'house', 'chair', 'bread', 'star', 'moon'],
  2: ['apple', 'tiger', 'rabbit', 'pencil', 'window', 'happy', 'water', 'monkey', 'garden', 'yellow', 'basket', 'cookie', 'pillow', 'button', 'candle'],
  3: ['banana', 'elephant', 'butterfly', 'umbrella', 'tomato', 'hamburger', 'dinosaur', 'computer', 'kangaroo', 'potato', 'telephone', 'strawberry', 'family', 'animal', 'piano'],
  4: ['watermelon', 'alligator', 'caterpillar', 'helicopter', 'television', 'calculator', 'information', 'macaroni', 'dictionary', 'invitation', 'motorcycle', 'thermometer'],
}

/**
 * Vowel sounds for the "same vowel sound" riddles (grades 1-2). Grouped BY SOUND, not by spelling:
 * every word in a group really has that sound, and no word appears in two groups, so a decoy drawn
 * from another group can never also be a correct answer.
 *
 * Words left out on purpose: "read" (red / reed), "tune" and "news" (/toon/ or /tyoon/ by region),
 * "dog", "log", "off", "song" and friends (for the many speakers without the cot-caught merger these
 * are not the short o of "hop"), "roof" and "root" (/oo/ or the book vowel), "bow", "live", "wind".
 * Long u is split in two pools that must never share a choice list: /yoo/ (cube) and /oo/ (moon).
 */
export interface VowelSound {
  /** How the prompt names the sound; the riddle adds the word "sound" after it. */
  label: string
  /** Read-aloud noun phrase, e.g. 'short a sound'. */
  spoken: string
  /** 1 = short vowels, 2 = long vowels / silent e, 3 = the tricky /yoo/ and /oo/ pools. */
  band: 1 | 2 | 3
  /** Same letter, other sound: the most useful decoy (cake for "short a"). */
  contrast?: string
  /** Sounds that must never appear in the same choice list (both would be defensible answers). */
  conflicts?: string[]
  words: string[]
}

export const VOWEL_SOUNDS: Record<string, VowelSound> = {
  'short a': { label: 'short a', spoken: 'short a sound', band: 1, contrast: 'long a', words: ['cat', 'hat', 'bat', 'map', 'bag', 'jam', 'fan', 'pan', 'sad', 'cap', 'ham', 'van', 'flag', 'rat'] },
  'short e': { label: 'short e', spoken: 'short e sound', band: 1, contrast: 'long e', words: ['bed', 'red', 'pen', 'net', 'hen', 'leg', 'wet', 'ten', 'jet', 'egg', 'nest', 'desk', 'vest', 'sled'] },
  'short i': { label: 'short i', spoken: 'short i sound', band: 1, contrast: 'long i', words: ['pig', 'six', 'fish', 'lip', 'wig', 'bin', 'hit', 'dig', 'sit', 'kid', 'chin', 'ship', 'gift', 'milk'] },
  'short o': { label: 'short o', spoken: 'short o sound', band: 1, contrast: 'long o', words: ['top', 'pot', 'hop', 'mop', 'box', 'fox', 'sock', 'rock', 'lock', 'clock', 'drop', 'spot', 'hot', 'pop'] },
  'short u': { label: 'short u', spoken: 'short u sound', band: 1, contrast: 'long u', words: ['bug', 'sun', 'cup', 'rug', 'nut', 'mud', 'tub', 'bus', 'hug', 'duck', 'drum', 'jump', 'gum', 'truck'] },
  'long a': { label: 'long a', spoken: 'long a sound', band: 2, contrast: 'short a', words: ['cake', 'rain', 'play', 'name', 'gate', 'train', 'day', 'lake', 'wave', 'snail', 'tail', 'plate', 'whale', 'paint'] },
  'long e': { label: 'long e', spoken: 'long e sound', band: 2, contrast: 'short e', words: ['tree', 'bee', 'leaf', 'seed', 'sheep', 'green', 'meat', 'key', 'feet', 'beach', 'queen', 'team', 'sleep', 'seal'] },
  'long i': { label: 'long i', spoken: 'long i sound', band: 2, contrast: 'short i', words: ['kite', 'bike', 'ride', 'light', 'nine', 'pie', 'sky', 'time', 'mice', 'night', 'fly', 'smile', 'five', 'hive'] },
  'long o': { label: 'long o', spoken: 'long o sound', band: 2, contrast: 'short o', words: ['boat', 'rope', 'snow', 'goat', 'bone', 'road', 'nose', 'toe', 'coat', 'home', 'stone', 'soap', 'phone', 'bowl'] },
  // /yoo/: the letter u says its own name. Never mixed with the /oo/ pool below.
  'long u': { label: 'long u (as in cube)', spoken: 'long u sound, the one in cube', band: 3, contrast: 'short u', conflicts: ['oo'], words: ['cube', 'cute', 'mule', 'mute', 'huge', 'fuse', 'few', 'music', 'human', 'menu'] },
  // /oo/: spelled oo, ue, ui, u_e, ou. Many programs also call this "long u", so it never meets it.
  oo: { label: 'oo (as in moon)', spoken: 'oo sound, the one in moon', band: 3, contrast: 'long o', conflicts: ['long u'], words: ['moon', 'spoon', 'blue', 'glue', 'flute', 'fruit', 'boot', 'zoo', 'broom', 'school', 'tooth', 'food', 'juice', 'noon', 'pool', 'soup'] },
}

/** The one sound group a word belongs to (words never appear in two groups). */
const VOWEL_OF = new Map<string, string>()
for (const [k, s] of Object.entries(VOWEL_SOUNDS)) for (const w of s.words) VOWEL_OF.set(w, k)
export const vowelSoundOf = (w: string): string | undefined => VOWEL_OF.get(w.toLowerCase())

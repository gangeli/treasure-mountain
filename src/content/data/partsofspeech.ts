/**
 * Word lists per part of speech. The lists are disjoint and avoid words that commonly serve as two
 * parts of speech (run, play, cool...) so any word from another list is a safe decoy.
 * Sentences carry tags for every content word so that "in this sentence, which word is a ..." has
 * exactly one right answer and the other tagged words are the decoys.
 */
export type Pos = 'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'conjunction' | 'preposition' | 'article'

export const POS_LISTS: Record<'noun' | 'verb' | 'adjective' | 'adverb' | 'pronoun' | 'conjunction', string[]> = {
  noun: ['apple', 'chair', 'teacher', 'mountain', 'river', 'kitten', 'bicycle', 'elephant', 'window', 'garden', 'pencil', 'ocean', 'castle', 'doctor', 'banana', 'forest', 'cookie', 'planet', 'blanket', 'rabbit', 'village', 'giraffe', 'umbrella', 'sandwich', 'library', 'dragon', 'meadow', 'pillow', 'turtle', 'kitchen', 'butterfly', 'engine', 'candle', 'tiger', 'island', 'teacup', 'wagon', 'feather', 'violin', 'bakery', 'penguin', 'ladder', 'jacket', 'beetle', 'canyon'],
  verb: ['eat', 'sing', 'write', 'read', 'grow', 'carry', 'listen', 'speak', 'bring', 'teach', 'build', 'throw', 'follow', 'arrive', 'become', 'believe', 'decide', 'explain', 'forget', 'imagine', 'remember', 'understand', 'wander', 'tumble', 'gather', 'deliver', 'discover', 'protect', 'invent', 'enjoy', 'choose', 'destroy', 'prefer', 'describe', 'borrow', 'vanish', 'tremble', 'scatter', 'obey', 'devour', 'munch', 'pounce', 'scurry', 'admire'],
  adjective: ['happy', 'tiny', 'enormous', 'purple', 'fluffy', 'gentle', 'shiny', 'brave', 'silent', 'sleepy', 'ancient', 'bright', 'clever', 'curious', 'delicious', 'eager', 'fierce', 'gigantic', 'gloomy', 'graceful', 'hungry', 'jolly', 'lazy', 'lovely', 'mighty', 'narrow', 'nervous', 'noisy', 'playful', 'polite', 'proud', 'rusty', 'scary', 'silly', 'slippery', 'velvety', 'sour', 'sticky', 'sturdy', 'tasty', 'wooden', 'wrinkled', 'fragile', 'humble', 'timid'],
  adverb: ['quickly', 'slowly', 'quietly', 'loudly', 'happily', 'sadly', 'gently', 'carefully', 'suddenly', 'eagerly', 'bravely', 'softly', 'rarely', 'always', 'never', 'often', 'everywhere', 'soon', 'almost', 'gracefully', 'angrily', 'silently', 'easily', 'neatly', 'proudly', 'calmly', 'wildly'],
  pronoun: ['I', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'us', 'them', 'mine', 'yours', 'hers', 'ours', 'theirs', 'myself', 'yourself', 'himself', 'herself', 'itself', 'ourselves', 'themselves', 'someone', 'anyone', 'everyone', 'nobody', 'everybody'],
  conjunction: ['and', 'but', 'or', 'so', 'yet', 'nor', 'because', 'although', 'since', 'unless', 'while', 'until', 'after', 'before', 'if', 'though', 'whereas', 'whenever', 'wherever', 'once', 'whether', 'than'],
}

/**
 * Conjunctions that are never anything else. Used as decoys in other questions, and as the only
 * conjunctions asked about out of context: "after", "before", "since", "until", "while", "once" and
 * "than" are prepositions or adverbs just as often, so on their own they have no single answer.
 */
export const PURE_CONJUNCTIONS = ['and', 'but', 'or', 'nor', 'because', 'although', 'unless', 'whereas', 'whether', 'if', 'though', 'whenever', 'wherever']

export interface TaggedSentence { text: string; tags: Record<string, Pos> }
const T = (text: string, tags: Record<string, Pos>): TaggedSentence => ({ text, tags })

export const TAGGED: TaggedSentence[] = [
  T('The tiny frog jumped quickly.', { The: 'article', tiny: 'adjective', frog: 'noun', jumped: 'verb', quickly: 'adverb' }),
  T('A hungry bear ate the berries.', { A: 'article', hungry: 'adjective', bear: 'noun', ate: 'verb', berries: 'noun' }),
  T('She quietly closed the heavy door.', { She: 'pronoun', quietly: 'adverb', closed: 'verb', heavy: 'adjective', door: 'noun' }),
  T('My brother ran home because it was late.', { brother: 'noun', ran: 'verb', because: 'conjunction', late: 'adjective', it: 'pronoun' }),
  T('The old clock ticked loudly.', { The: 'article', old: 'adjective', clock: 'noun', ticked: 'verb', loudly: 'adverb' }),
  T('We carefully carried the fragile vase.', { We: 'pronoun', carefully: 'adverb', carried: 'verb', fragile: 'adjective', vase: 'noun' }),
  T('The brave knight fought bravely.', { The: 'article', brave: 'adjective', knight: 'noun', fought: 'verb', bravely: 'adverb' }),
  T('They laughed happily at the silly clown.', { They: 'pronoun', laughed: 'verb', happily: 'adverb', silly: 'adjective', clown: 'noun' }),
  T('A gentle breeze blew softly.', { A: 'article', gentle: 'adjective', breeze: 'noun', blew: 'verb', softly: 'adverb' }),
  T('I will stay inside if it rains.', { I: 'pronoun', stay: 'verb', inside: 'adverb', if: 'conjunction', rains: 'verb' }),
  T('The curious puppy sniffed the shoe.', { The: 'article', curious: 'adjective', puppy: 'noun', sniffed: 'verb', shoe: 'noun' }),
  T('He suddenly dropped the wet towel.', { He: 'pronoun', suddenly: 'adverb', dropped: 'verb', wet: 'adjective', towel: 'noun' }),
  T('The shiny car stopped near the fence.', { The: 'article', shiny: 'adjective', car: 'noun', stopped: 'verb', near: 'preposition', fence: 'noun' }),
  T('Birds sing sweetly every morning.', { Birds: 'noun', sing: 'verb', sweetly: 'adverb', every: 'article', morning: 'noun' }),
  T('We ate pizza and watched a movie.', { We: 'pronoun', ate: 'verb', pizza: 'noun', and: 'conjunction', watched: 'verb', movie: 'noun' }),
  T('The clever fox escaped easily.', { The: 'article', clever: 'adjective', fox: 'noun', escaped: 'verb', easily: 'adverb' }),
  T('She wanted juice, but there was only milk.', { She: 'pronoun', wanted: 'verb', juice: 'noun', but: 'conjunction', only: 'adverb', milk: 'noun' }),
  T('The sleepy kitten yawned slowly.', { The: 'article', sleepy: 'adjective', kitten: 'noun', yawned: 'verb', slowly: 'adverb' }),
  T('Grandma baked delicious cookies yesterday.', { Grandma: 'noun', baked: 'verb', delicious: 'adjective', cookies: 'noun', yesterday: 'adverb' }),
  T('They waited patiently for the bus.', { They: 'pronoun', waited: 'verb', patiently: 'adverb', for: 'preposition', bus: 'noun' }),
  T('The enormous whale swam gracefully.', { The: 'article', enormous: 'adjective', whale: 'noun', swam: 'verb', gracefully: 'adverb' }),
  T('You can play outside until dinner is ready.', { You: 'pronoun', play: 'verb', outside: 'adverb', until: 'conjunction', dinner: 'noun', ready: 'adjective' }),
  T('A nervous student whispered the answer.', { A: 'article', nervous: 'adjective', student: 'noun', whispered: 'verb', answer: 'noun' }),
  T('The rusty gate creaked loudly.', { The: 'article', rusty: 'adjective', gate: 'noun', creaked: 'verb', loudly: 'adverb' }),
  T('He finished his homework although he was tired.', { He: 'pronoun', finished: 'verb', homework: 'noun', although: 'conjunction', tired: 'adjective' }),
  T('Wild horses galloped across the meadow.', { Wild: 'adjective', horses: 'noun', galloped: 'verb', across: 'preposition', meadow: 'noun' }),
  T('The mighty river flowed swiftly.', { The: 'article', mighty: 'adjective', river: 'noun', flowed: 'verb', swiftly: 'adverb' }),
  T('We will go swimming unless it storms.', { We: 'pronoun', go: 'verb', swimming: 'noun', unless: 'conjunction', storms: 'verb' }),
  T('The proud rooster crowed early.', { The: 'article', proud: 'adjective', rooster: 'noun', crowed: 'verb', early: 'adverb' }),
  T('Everyone cheered when the team scored.', { Everyone: 'pronoun', cheered: 'verb', when: 'conjunction', team: 'noun', scored: 'verb' }),
  T('The busy bees buzzed noisily.', { The: 'article', busy: 'adjective', bees: 'noun', buzzed: 'verb', noisily: 'adverb' }),
  T('Sam painted the fence while I raked leaves.', { Sam: 'noun', painted: 'verb', fence: 'noun', while: 'conjunction', I: 'pronoun', raked: 'verb', leaves: 'noun' }),
  T('The little mouse hid quietly.', { The: 'article', little: 'adjective', mouse: 'noun', hid: 'verb', quietly: 'adverb' }),
  T('A fierce storm shook the tall trees.', { A: 'article', fierce: 'adjective', storm: 'noun', shook: 'verb', tall: 'adjective', trees: 'noun' }),
  T('They visited the museum, and then they ate lunch.', { They: 'pronoun', visited: 'verb', museum: 'noun', and: 'conjunction', then: 'adverb', ate: 'verb', lunch: 'noun' }),
  T('The polite boy thanked the driver warmly.', { The: 'article', polite: 'adjective', boy: 'noun', thanked: 'verb', driver: 'noun', warmly: 'adverb' }),
  T('Nobody answered, so she knocked again.', { Nobody: 'pronoun', answered: 'verb', so: 'conjunction', she: 'pronoun', knocked: 'verb', again: 'adverb' }),
  T('The golden leaves fell gently.', { The: 'article', golden: 'adjective', leaves: 'noun', fell: 'verb', gently: 'adverb' }),
]

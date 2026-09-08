import { SYLLABLES } from './phonics'

/**
 * Words with an unambiguous syllable count (extends phonics.SYLLABLES). Words whose count
 * varies by accent (fire, flower, family, camera, chocolate, interesting...) are left out.
 */
const EXTRA: Record<number, string[]> = {
  1: ['hat', 'car', 'bed', 'duck', 'cake', 'boat', 'rain', 'shoe', 'bird', 'cup', 'door', 'egg', 'hand', 'king', 'leaf', 'nest', 'pig',
    'ring', 'sock', 'truck', 'web', 'box', 'bus', 'coat', 'drum', 'flag', 'goat', 'horse', 'ice', 'key', 'lamp', 'mouse', 'nose',
    'plant', 'rock', 'snake', 'train', 'whale', 'wolf', 'cheese', 'school', 'friend', 'green', 'sleep', 'cloud', 'night', 'stone',
    'grass', 'fruit', 'juice', 'heart', 'bench', 'clock', 'sheep', 'spoon', 'street', 'branch', 'ghost', 'beach'],
  2: ['baby', 'table', 'paper', 'robot', 'sister', 'summer', 'turtle', 'zebra', 'kitten', 'puppy', 'doctor', 'pizza', 'jacket', 'ladder',
    'lemon', 'magnet', 'muffin', 'napkin', 'panda', 'pumpkin', 'rocket', 'seven', 'spider', 'sunny', 'teacher', 'wagon', 'winter',
    'carrot', 'dragon', 'mitten', 'mirror', 'morning', 'number', 'picture', 'purple', 'silver', 'sandwich', 'chicken', 'dolphin',
    'donkey', 'hammer', 'insect', 'jelly', 'kitchen', 'letter', 'market', 'music', 'ocean', 'peanut', 'rainbow', 'ribbon', 'bucket',
    'dinner', 'candy', 'finger', 'giraffe', 'balloon', 'guitar', 'parrot', 'pillow', 'walrus', 'engine', 'planet', 'river'],
  3: ['tomorrow', 'cucumber', 'broccoli', 'gorilla', 'octopus', 'hospital', 'holiday', 'grandmother', 'ladybug', 'newspaper',
    'pineapple', 'popsicle', 'radio', 'rectangle', 'spaghetti', 'submarine', 'tornado', 'triangle', 'vitamin', 'volcano', 'wonderful',
    'yesterday', 'basketball', 'bicycle', 'carpenter', 'crocodile', 'envelope', 'fantastic', 'furniture', 'important', 'magazine',
    'microwave', 'orchestra', 'oxygen', 'paragraph', 'president', 'remember', 'skeleton', 'sunflower', 'telescope',
    'together', 'tricycle', 'video', 'violin', 'adventure', 'apartment', 'astronaut', 'blueberry', 'cinnamon', 'dangerous',
    'electric', 'excellent', 'gasoline', 'hurricane', 'imagine', 'jellyfish', 'lemonade', 'lollipop', 'mosquito', 'parachute',
    'porcupine', 'tangerine', 'understand', 'vacation', 'xylophone', 'zucchini', 'delicious', 'dinosaur', 'chimpanzee', 'tomato'],
  4: ['kindergarten', 'pepperoni', 'avocado', 'celebration', 'escalator', 'ravioli', 'rhinoceros', 'tarantula', 'harmonica',
    'independent', 'mathematics', 'photographer', 'population', 'presentation', 'supermarket', 'transportation', 'apologize',
    'automobile', 'binoculars', 'community', 'conversation', 'decoration', 'education', 'elevator', 'environment', 'experiment',
    'generation', 'geography', 'gymnasium', 'impossible', 'incredible', 'invisible', 'librarian', 'necessary',
    'operation', 'original', 'peninsula', 'prehistoric', 'remarkable', 'salamander', 'secretary', 'spectacular', 'stegosaurus',
    'ventilator', 'watermelon', 'alligator', 'caterpillar', 'helicopter', 'television', 'calculator', 'information', 'macaroni'],
}

/**
 * Left out of the merged lists: counts that vary by accent or speed (fam-ly / fam-i-ly,
 * med-i-cine / med-cine, cau-li-flow-er), and month names, whose capital letter would make them
 * stand out among the lowercase choices whatever their syllable count.
 */
const EXCLUDE = new Set(['family', 'medicine', 'cauliflower', 'october', 'january'])

function merge(n: number): string[] {
  const seen = new Set<string>(EXCLUDE)
  const out: string[] = []
  for (const w of [...(SYLLABLES[n] ?? []), ...(EXTRA[n] ?? [])]) {
    const key = w.toLowerCase()
    if (!seen.has(key)) { seen.add(key); out.push(w) }
  }
  return out
}

/** Words by syllable count, 1..4. */
export const SYLLABLE_WORDS: Record<number, string[]> = { 1: merge(1), 2: merge(2), 3: merge(3), 4: merge(4) }

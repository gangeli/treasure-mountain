import type { Grade } from '../types'
import type { Fact } from '../generators/thinkingUtil'

export type AnimalClass = 'mammal' | 'bird' | 'reptile' | 'fish' | 'insect' | 'amphibian' | 'arachnid' | 'mollusc' | 'crustacean' | 'worm'
export type Diet = 'herbivore' | 'carnivore' | 'omnivore'
export type Habitat = 'farm' | 'forest' | 'ocean' | 'desert' | 'Arctic' | 'Antarctic' | 'rainforest' | 'grassland' | 'pond' | 'garden' | 'river' | 'cave' | 'mountains'

/**
 * One animal and the facts a child learns about it. Fields are omitted when there is no clear,
 * well-known answer.
 *
 * The `*Also` lists are the heart of the "only one defensible answer" rule: they name every *other*
 * value a well-informed child could defend for this animal, so the generator can keep those out of
 * the decoy list. An owl really does nest, a sheep really is a herd, a snake really does live on
 * grassland - so none of them may be offered as a wrong answer to those questions.
 */
export interface Animal {
  n: string
  cls: AnimalClass
  sound?: string
  /** Other sounds a child could fairly say this animal makes (birds all "chirp"). */
  soundAlso?: string[]
  baby?: string
  /** Other baby names that also fit (every baby bird is a "chick"). */
  babyAlso?: string[]
  home?: string
  /** Other homes this animal also lives in. */
  homeAlso?: string[]
  group?: string
  /** Other collective nouns that are also correct (a herd of sheep). */
  groupAlso?: string[]
  diet?: Diet
  hab?: Habitat
  /** Other habitats this animal really lives in. */
  habAlso?: Habitat[]
  /** Legs a child can count. 0 = none. Omitted where the answer is arguable (flippers, claws). */
  legs?: number
  /** True when the animal can fly under its own power. */
  flies?: boolean
  /** A mammal with obvious fur (not a whale or a dolphin). */
  furry?: boolean
  /** Irregular plural for "a group of ___ is called a ..." (tuna, sheep, geese, donkeys). */
  plural?: string
  /** Lives in too many places to be a habitat answer *or* a habitat decoy. */
  vague?: boolean
}

const A = (n: string, cls: AnimalClass, rest: Omit<Animal, 'n' | 'cls'> = {}): Animal => ({ n, cls, ...rest })

/** The five farm buildings; farm animals are at home in all of them, so they never decoy each other. */
const FARM_HOMES = ['barn', 'stable', 'sty', 'coop', 'pen']
const otherFarmHomes = (own?: string) => FARM_HOMES.filter(h => h !== own)

export const ANIMALS: Animal[] = [
  // ---- the farm
  A('cow', 'mammal', { sound: 'moo', baby: 'calf', home: 'barn', homeAlso: otherFarmHomes('barn'), group: 'herd', diet: 'herbivore', hab: 'farm', legs: 4, furry: true }),
  A('pig', 'mammal', { sound: 'oink', baby: 'piglet', home: 'sty', homeAlso: otherFarmHomes('sty'), diet: 'omnivore', hab: 'farm', legs: 4, furry: true }),
  A('sheep', 'mammal', { sound: 'baa', baby: 'lamb', home: 'pen', homeAlso: otherFarmHomes('pen'), group: 'flock', groupAlso: ['herd'], diet: 'herbivore', hab: 'farm', legs: 4, furry: true, plural: 'sheep' }),
  A('horse', 'mammal', { sound: 'neigh', baby: 'foal', home: 'stable', homeAlso: otherFarmHomes('stable'), group: 'herd', diet: 'herbivore', hab: 'farm', legs: 4, furry: true }),
  A('hen', 'bird', { sound: 'cluck', soundAlso: ['chirp'], baby: 'chick', home: 'coop', homeAlso: [...otherFarmHomes('coop'), 'nest'], group: 'flock', diet: 'omnivore', hab: 'farm', legs: 2 }),
  A('goat', 'mammal', { baby: 'kid', homeAlso: FARM_HOMES, group: 'herd', diet: 'herbivore', hab: 'farm', legs: 4, furry: true }),
  A('donkey', 'mammal', { sound: 'hee-haw', baby: 'foal', homeAlso: FARM_HOMES, diet: 'herbivore', hab: 'farm', legs: 4, furry: true, plural: 'donkeys' }),
  A('turkey', 'bird', { sound: 'gobble', soundAlso: ['chirp'], group: 'flock', diet: 'omnivore', homeAlso: [...FARM_HOMES, 'nest'], hab: 'farm', habAlso: ['forest'], legs: 2, vague: true, plural: 'turkeys' }),
  A('dog', 'mammal', { sound: 'woof', baby: 'puppy', home: 'kennel', group: 'pack', diet: 'omnivore', legs: 4, furry: true, vague: true }),
  A('cat', 'mammal', { sound: 'meow', baby: 'kitten', diet: 'carnivore', legs: 4, furry: true, vague: true }),

  // ---- pond and river
  A('duck', 'bird', { sound: 'quack', soundAlso: ['chirp'], baby: 'duckling', babyAlso: ['chick'], homeAlso: [...FARM_HOMES, 'nest'], group: 'flock', diet: 'omnivore', hab: 'pond', habAlso: ['river', 'farm'], legs: 2, flies: true }),
  A('goose', 'bird', { sound: 'honk', soundAlso: ['chirp'], baby: 'gosling', babyAlso: ['chick'], home: 'nest', group: 'gaggle', groupAlso: ['flock'], diet: 'herbivore', hab: 'pond', habAlso: ['river', 'farm'], legs: 2, flies: true, plural: 'geese' }),
  A('swan', 'bird', { soundAlso: ['chirp'], baby: 'cygnet', babyAlso: ['chick'], home: 'nest', diet: 'herbivore', hab: 'pond', habAlso: ['river'], legs: 2, flies: true }),
  A('frog', 'amphibian', { sound: 'ribbit', baby: 'tadpole', diet: 'carnivore', hab: 'pond', habAlso: ['garden', 'river', 'forest'], legs: 4 }),
  A('toad', 'amphibian', { sound: 'croak', baby: 'tadpole', diet: 'carnivore', hab: 'garden', habAlso: ['pond', 'forest'], legs: 4 }),
  A('newt', 'amphibian', { diet: 'carnivore', hab: 'pond', habAlso: ['garden'], legs: 4 }),
  A('crocodile', 'reptile', { baby: 'hatchling', diet: 'carnivore', hab: 'river', habAlso: ['pond'], legs: 4 }),
  A('hippo', 'mammal', { baby: 'calf', diet: 'herbivore', hab: 'river', habAlso: ['grassland'], legs: 4 }),
  A('platypus', 'mammal', { baby: 'puggle', diet: 'carnivore', hab: 'river', legs: 4, furry: true, plural: 'platypuses' }),
  A('turtle', 'reptile', { baby: 'hatchling', homeAlso: ['shell'], diet: 'omnivore', hab: 'pond', habAlso: ['river', 'ocean'], legs: 4 }),

  // ---- woods and garden
  A('bear', 'mammal', { baby: 'cub', home: 'den', homeAlso: ['cave'], diet: 'omnivore', hab: 'forest', habAlso: ['mountains', 'cave'], legs: 4, furry: true }),
  A('panda', 'mammal', { baby: 'cub', diet: 'herbivore', hab: 'forest', habAlso: ['mountains'], legs: 4, furry: true }),
  A('wolf', 'mammal', { baby: 'pup', home: 'den', group: 'pack', diet: 'carnivore', hab: 'forest', habAlso: ['grassland', 'mountains', 'Arctic'], legs: 4, furry: true, vague: true, plural: 'wolves' }),
  A('fox', 'mammal', { baby: 'kit', home: 'den', diet: 'omnivore', hab: 'forest', habAlso: ['grassland', 'mountains', 'garden', 'farm'], legs: 4, furry: true, vague: true, plural: 'foxes' }),
  A('deer', 'mammal', { baby: 'fawn', group: 'herd', diet: 'herbivore', hab: 'forest', habAlso: ['grassland', 'mountains'], legs: 4, furry: true, plural: 'deer' }),
  A('squirrel', 'mammal', { baby: 'kit', diet: 'herbivore', hab: 'forest', habAlso: ['garden'], legs: 4, furry: true }),
  A('koala', 'mammal', { baby: 'joey', diet: 'herbivore', hab: 'forest', legs: 4, furry: true }),
  A('hedgehog', 'mammal', { baby: 'hoglet', diet: 'carnivore', hab: 'garden', habAlso: ['forest', 'grassland'], legs: 4 }),
  A('mole', 'mammal', { baby: 'pup', home: 'burrow', diet: 'carnivore', hab: 'garden', habAlso: ['grassland', 'farm', 'forest'], legs: 4, furry: true }),
  A('rabbit', 'mammal', { baby: 'bunny', home: 'burrow', diet: 'herbivore', hab: 'grassland', habAlso: ['garden', 'forest', 'farm'], legs: 4, furry: true, vague: true }),
  A('mouse', 'mammal', { sound: 'squeak', baby: 'pup', home: 'burrow', diet: 'omnivore', legs: 4, furry: true, vague: true, plural: 'mice' }),
  A('bat', 'mammal', { sound: 'squeak', baby: 'pup', home: 'cave', group: 'colony', diet: 'carnivore', hab: 'cave', habAlso: ['forest', 'garden'], flies: true, furry: true }),
  A('owl', 'bird', { sound: 'hoot', soundAlso: ['chirp'], baby: 'owlet', babyAlso: ['chick'], home: 'hollow tree', homeAlso: ['nest'], diet: 'carnivore', hab: 'forest', habAlso: ['grassland', 'garden', 'farm'], legs: 2, flies: true, vague: true }),
  A('robin', 'bird', { sound: 'tweet', soundAlso: ['chirp'], baby: 'chick', home: 'nest', diet: 'omnivore', hab: 'garden', habAlso: ['forest'], legs: 2, flies: true }),
  A('crow', 'bird', { sound: 'caw', soundAlso: ['chirp'], baby: 'chick', home: 'nest', diet: 'omnivore', legs: 2, flies: true, vague: true }),
  A('hawk', 'bird', { soundAlso: ['chirp'], baby: 'chick', home: 'nest', diet: 'carnivore', hab: 'forest', habAlso: ['grassland', 'mountains', 'desert'], legs: 2, flies: true, vague: true }),
  A('eagle', 'bird', { soundAlso: ['chirp'], baby: 'eaglet', babyAlso: ['chick'], home: 'nest', diet: 'carnivore', hab: 'mountains', habAlso: ['forest', 'grassland'], legs: 2, flies: true }),
  A('snail', 'mollusc', { home: 'shell', diet: 'herbivore', hab: 'garden', habAlso: ['forest', 'pond'], legs: 0, vague: true }),
  A('earthworm', 'worm', { home: 'soil', homeAlso: ['burrow'], hab: 'garden', habAlso: ['farm', 'forest', 'grassland'], legs: 0, vague: true }),
  A('spider', 'arachnid', { baby: 'spiderling', home: 'web', diet: 'carnivore', hab: 'garden', habAlso: ['forest', 'farm', 'cave'], legs: 8, vague: true }),
  A('bee', 'insect', { sound: 'buzz', baby: 'larva', home: 'hive', group: 'swarm', groupAlso: ['colony'], diet: 'herbivore', hab: 'garden', habAlso: ['grassland', 'forest', 'farm'], legs: 6, flies: true, vague: true }),
  A('ant', 'insect', { baby: 'larva', home: 'anthill', group: 'colony', groupAlso: ['swarm'], diet: 'omnivore', hab: 'garden', habAlso: ['forest', 'grassland', 'farm'], legs: 6, vague: true }),
  A('butterfly', 'insect', { baby: 'caterpillar', diet: 'herbivore', hab: 'garden', habAlso: ['grassland', 'forest'], legs: 6, flies: true, vague: true, plural: 'butterflies' }),
  A('ladybug', 'insect', { baby: 'larva', diet: 'carnivore', hab: 'garden', habAlso: ['grassland', 'forest', 'farm'], legs: 6, flies: true, vague: true }),
  A('grasshopper', 'insect', { baby: 'nymph', diet: 'herbivore', hab: 'grassland', habAlso: ['garden', 'farm'], legs: 6, vague: true }),
  A('cricket', 'insect', { sound: 'chirp', baby: 'nymph', hab: 'grassland', habAlso: ['garden', 'forest', 'farm'], legs: 6, vague: true }),

  // ---- grassland, desert and mountains
  A('lion', 'mammal', { sound: 'roar', baby: 'cub', home: 'den', group: 'pride', diet: 'carnivore', hab: 'grassland', legs: 4, furry: true }),
  A('elephant', 'mammal', { baby: 'calf', group: 'herd', diet: 'herbivore', hab: 'grassland', habAlso: ['forest'], legs: 4 }),
  A('giraffe', 'mammal', { baby: 'calf', diet: 'herbivore', hab: 'grassland', legs: 4 }),
  A('zebra', 'mammal', { baby: 'foal', group: 'herd', diet: 'herbivore', hab: 'grassland', legs: 4 }),
  A('rhino', 'mammal', { baby: 'calf', diet: 'herbivore', hab: 'grassland', legs: 4 }),
  A('kangaroo', 'mammal', { baby: 'joey', group: 'mob', diet: 'herbivore', hab: 'grassland', habAlso: ['forest', 'desert'], legs: 4, furry: true }),
  A('ostrich', 'bird', { soundAlso: ['chirp'], baby: 'chick', home: 'nest', group: 'flock', diet: 'omnivore', hab: 'grassland', habAlso: ['desert'], legs: 2, plural: 'ostriches' }),
  A('camel', 'mammal', { baby: 'calf', group: 'caravan', groupAlso: ['herd'], diet: 'herbivore', hab: 'desert', habAlso: ['grassland'], legs: 4, furry: true }),
  A('snake', 'reptile', { sound: 'hiss', home: 'burrow', diet: 'carnivore', hab: 'desert', habAlso: ['grassland', 'forest', 'garden', 'rainforest', 'farm'], legs: 0, vague: true }),
  A('lizard', 'reptile', { baby: 'hatchling', diet: 'carnivore', hab: 'desert', habAlso: ['grassland', 'forest', 'garden', 'rainforest'], legs: 4, vague: true }),
  A('tortoise', 'reptile', { baby: 'hatchling', homeAlso: ['shell'], diet: 'herbivore', hab: 'desert', habAlso: ['grassland', 'forest'], legs: 4, vague: true }),
  A('polar bear', 'mammal', { baby: 'cub', home: 'den', diet: 'carnivore', hab: 'Arctic', habAlso: ['ocean'], legs: 4, furry: true }),
  A('penguin', 'bird', { soundAlso: ['chirp'], baby: 'chick', homeAlso: ['nest'], group: 'colony', diet: 'carnivore', hab: 'Antarctic', habAlso: ['ocean'], legs: 2 }),

  // ---- rainforest
  A('tiger', 'mammal', { sound: 'roar', baby: 'cub', diet: 'carnivore', hab: 'rainforest', habAlso: ['grassland'], legs: 4, furry: true }),
  A('parrot', 'bird', { sound: 'squawk', soundAlso: ['chirp'], baby: 'chick', home: 'nest', group: 'flock', diet: 'herbivore', hab: 'rainforest', legs: 2, flies: true }),
  A('monkey', 'mammal', { baby: 'infant', group: 'troop', diet: 'omnivore', hab: 'rainforest', legs: 4, furry: true, plural: 'monkeys' }),
  A('gorilla', 'mammal', { baby: 'infant', group: 'troop', diet: 'herbivore', hab: 'rainforest', legs: 4, furry: true }),
  A('chimpanzee', 'mammal', { baby: 'infant', group: 'troop', diet: 'omnivore', hab: 'rainforest', legs: 4, furry: true }),
  A('sloth', 'mammal', { diet: 'herbivore', hab: 'rainforest', legs: 4, furry: true, plural: 'sloths' }),

  // ---- the sea
  A('whale', 'mammal', { baby: 'calf', group: 'pod', diet: 'carnivore', hab: 'ocean' }),
  A('dolphin', 'mammal', { baby: 'calf', group: 'pod', diet: 'carnivore', hab: 'ocean' }),
  A('seal', 'mammal', { baby: 'pup', group: 'colony', diet: 'carnivore', hab: 'ocean', habAlso: ['Arctic', 'Antarctic'], furry: true }),
  A('shark', 'fish', { baby: 'pup', diet: 'carnivore', hab: 'ocean', legs: 0 }),
  A('clownfish', 'fish', { baby: 'fry', diet: 'omnivore', hab: 'ocean', legs: 0 }),
  A('tuna', 'fish', { baby: 'fry', group: 'school', diet: 'carnivore', hab: 'ocean', legs: 0, plural: 'tuna' }),
  A('salmon', 'fish', { baby: 'fry', group: 'school', diet: 'carnivore', hab: 'river', habAlso: ['ocean'], legs: 0, plural: 'salmon' }),
  A('goldfish', 'fish', { baby: 'fry', diet: 'omnivore', hab: 'pond', legs: 0, plural: 'goldfish' }),
  A('octopus', 'mollusc', { diet: 'carnivore', hab: 'ocean', plural: 'octopuses' }),
  A('crab', 'crustacean', { homeAlso: ['shell'], diet: 'omnivore', hab: 'ocean' }),
]

/** Baby names a K child is expected to know (used as answers; the rest only appear as decoys). */
export const KNOWN_BABIES = ['calf', 'piglet', 'lamb', 'puppy', 'kitten', 'foal', 'duckling', 'chick', 'kid', 'tadpole', 'cub', 'joey', 'fawn', 'caterpillar', 'gosling', 'owlet', 'bunny', 'cygnet']

export const CLASS_NAMES: AnimalClass[] = ['mammal', 'bird', 'reptile', 'fish', 'insect', 'amphibian']

/** Animals whose class surprises younger children. Grade 3+ only, and never the "easy class" answer. */
export const TRICKY = ['bat', 'whale', 'dolphin', 'platypus', 'penguin', 'ostrich', 'seal', 'turtle', 'tortoise', 'spider', 'snail', 'crab', 'earthworm', 'newt', 'toad']

/**
 * Words that name a creature, a food-web role or an animal class. Any fact that puts one of these in
 * its choices has to carry a `claim`, so its answer and decoys can be checked against the trait
 * table instead of being taken on trust.
 */
export const CREATURE_WORDS: string[] = [
  ...ANIMALS.map(a => a.n),
  'beetle', 'fly', 'moth', 'worm', 'jellyfish', 'walrus', 'squid', 'seahorse', 'sparrow', 'trout', 'starfish', 'clam', 'lobster',
  'caterpillar', 'salamander', 'echidna', 'opossum', 'wombat', 'emu', 'kiwi', 'human', 'antelope', 'gazelle', 'wildebeest', 'buffalo',
  'scorpion', 'rattlesnake', 'snowy owl', 'Arctic fox', 'fennec fox',
  'mushroom', 'fungus', 'oak tree', 'grass', 'moss', 'algae', 'bacteria', 'mold',
  'mammals', 'birds', 'reptiles', 'insects', 'amphibians', 'fish',
  'mammal', 'bird', 'reptile', 'insect', 'amphibian', 'crustacean',
]

/**
 * Every choice phrase that makes a claim true. A fact tagged with a claim is correct only if its
 * answer is in the list and none of its decoys are - which is what stops a decoy from quietly being
 * a second right answer.
 */
export const ANIMAL_CLAIMS: Record<string, string[]> = {
  'feeds its babies milk': ['mammals'],
  'is a group with feathers': ['birds'],
  'class of a frog': ['an amphibian'],
  'lays eggs': [
    'a hen', 'a duck', 'a goose', 'a swan', 'a turkey', 'an ostrich', 'a penguin', 'an owl', 'a robin', 'a crow', 'a hawk',
    'an eagle', 'a parrot', 'a flamingo', 'a snake', 'a lizard', 'a turtle', 'a tortoise', 'a crocodile', 'a frog', 'a toad',
    'a newt', 'a fish', 'a shark', 'a butterfly', 'a bee', 'an ant', 'a spider', 'a snail', 'a platypus',
  ],
  'has six legs': ['an ant', 'a bee', 'a butterfly', 'a ladybug', 'a beetle', 'a fly', 'a moth', 'a grasshopper', 'a cricket'],
  'has scales and gills': ['a fish', 'a shark', 'a tuna', 'a salmon', 'a goldfish', 'a clownfish', 'a seahorse'],
  'is cold-blooded': [
    'a lizard', 'a snake', 'a turtle', 'a tortoise', 'a crocodile', 'a frog', 'a toad', 'a newt', 'a fish', 'a shark',
    'a tuna', 'a salmon', 'an ant', 'a bee', 'a spider', 'a snail', 'a crab',
  ],
  'has fur': ['a bear', 'a dog', 'a cat', 'a mouse', 'a bat', 'a fox', 'a rabbit', 'a wolf', 'a lion', 'a tiger', 'a squirrel', 'a mole', 'a polar bear', 'a horse', 'a cow'],
  'is an insect': ['a beetle', 'an ant', 'a bee', 'a butterfly', 'a ladybug', 'a grasshopper', 'a cricket', 'a fly', 'a moth'],
  'is a reptile': ['a snake', 'a lizard', 'a turtle', 'a tortoise', 'a crocodile'],
  'is a bird': ['a penguin', 'an ostrich', 'an owl', 'an eagle', 'a hawk', 'a hen', 'a duck', 'a goose', 'a swan', 'a robin', 'a crow', 'a parrot', 'a turkey', 'a sparrow'],
  'is a mammal': ['a bat', 'a whale', 'a dolphin', 'a seal', 'a walrus', 'a platypus', 'a dog', 'a cat', 'a cow', 'a horse', 'a bear', 'a lion', 'a mouse', 'a kangaroo', 'a koala', 'a human'],
  'has a shell': ['a turtle', 'a tortoise', 'a snail', 'a crab', 'a clam', 'a lobster'],
  'is a producer': ['grass', 'an oak tree', 'moss', 'algae'],
  'is what plants need': ['sunlight', 'water', 'air'],
  'lives in the Arctic': ['a polar bear', 'a walrus', 'a seal', 'an Arctic fox', 'a snowy owl'],
  'lives in a hot desert': ['a camel', 'a scorpion', 'a rattlesnake', 'a fennec fox', 'a tortoise', 'a lizard'],
  'is prey for a lion': ['a zebra', 'an antelope', 'a gazelle', 'a wildebeest', 'a buffalo'],
  'never leaves the ocean': ['a whale', 'a dolphin', 'a shark', 'an octopus', 'a tuna', 'a clownfish', 'a seahorse'],
  'is a decomposer': ['an earthworm', 'a fungus', 'a mushroom', 'bacteria', 'mold'],
  'is a top predator': ['an eagle', 'a hawk', 'an owl', 'a lion', 'a shark', 'a wolf', 'a polar bear', 'a tiger', 'a crocodile'],
  'is a consumer': ['a deer', 'a rabbit', 'a fox', 'an owl', 'a hawk', 'a mouse', 'a wolf', 'a snail', 'a caterpillar', 'a grasshopper', 'a zebra'],
  'is a mammal that lays eggs': ['a platypus', 'an echidna'],
  'is an invertebrate': ['an octopus', 'a jellyfish', 'a snail', 'a crab', 'a worm', 'an earthworm', 'a beetle', 'a spider', 'an ant', 'a bee', 'a butterfly', 'a clam', 'a starfish', 'a squid'],
  'is a vertebrate': ['a salmon', 'an eagle', 'a frog', 'a snake', 'a shark', 'a dog', 'a bat', 'a whale', 'a trout', 'a lizard', 'a turtle', 'an owl', 'a human', 'a newt'],
  'is a marsupial': ['a kangaroo', 'a koala', 'an opossum', 'a wombat'],
  'goes through metamorphosis': ['a butterfly', 'a frog', 'a moth', 'a beetle', 'a ladybug'],
  'is warm-blooded': ['an owl', 'an eagle', 'a dog', 'a cat', 'a whale', 'a bat', 'a cow', 'a hen', 'a penguin', 'a human'],
  'is a bird that cannot fly': ['an ostrich', 'a penguin', 'an emu', 'a kiwi'],
  'class of a seahorse': ['a fish'],
  'is an amphibian': ['a newt', 'a frog', 'a toad', 'a salamander'],
}

/** A fact question plus, where its choices name creatures, the claim that decides them. */
export type AnimalFact = Fact & { claim?: string }

/**
 * Fact questions by level: 2 classes and diets, 3 adaptations, 4 food chains and habitats,
 * 5 ecosystems, life cycles and classification. `band` splits a level into the tier that asks it.
 */
const F = (level: Grade, band: 1 | 2 | 3, q: string, a: string, d: string[], claim?: string): AnimalFact =>
  claim === undefined ? { level, band, q, a, d } : { level, band, q, a, d, claim }

export const ANIMAL_FACTS: AnimalFact[] = [
  // ---------------------------------------------------------- level 2: classes and what they eat
  F(2, 1, 'Which group of animals feeds its babies milk?', 'mammals', ['birds', 'reptiles', 'fish'], 'feeds its babies milk'),
  F(2, 1, 'Which group of animals has feathers?', 'birds', ['mammals', 'reptiles', 'insects'], 'is a group with feathers'),
  F(2, 1, 'A frog is which kind of animal?', 'an amphibian', ['a reptile', 'a mammal', 'a fish'], 'class of a frog'),
  F(2, 1, 'Which of these animals lays eggs?', 'a hen', ['a cow', 'a dog', 'a cat'], 'lays eggs'),
  F(2, 1, 'Animals that eat only plants are called ...', 'herbivores', ['carnivores', 'omnivores', 'predators']),
  F(2, 1, 'Animals that eat only meat are called ...', 'carnivores', ['herbivores', 'omnivores', 'prey']),
  F(2, 2, 'An animal that eats plants and meat is ...', 'an omnivore', ['a herbivore', 'a carnivore', 'a vegetarian']),
  F(2, 2, 'Which of these animals has six legs?', 'an ant', ['a spider', 'a mouse', 'a snake'], 'has six legs'),
  F(2, 2, 'Which animal has scales and gills?', 'a fish', ['a frog', 'a duck', 'a seal'], 'has scales and gills'),
  F(2, 2, 'Which of these animals has fur?', 'a bear', ['a snake', 'a fish', 'a frog'], 'has fur'),
  F(2, 2, 'Which animal is a reptile?', 'a snake', ['a frog', 'a fish', 'a bat'], 'is a reptile'),
  F(2, 3, 'Which of these animals is cold-blooded?', 'a lizard', ['a dog', 'a cat', 'a cow'], 'is cold-blooded'),
  F(2, 3, 'Which of these animals is an insect?', 'a beetle', ['a worm', 'a snail', 'a spider'], 'is an insect'),
  F(2, 3, 'Which of these animals is a bird?', 'a penguin', ['a bat', 'a butterfly', 'a dolphin'], 'is a bird'),
  F(2, 3, 'Which of these animals is a mammal?', 'a bat', ['an owl', 'a snake', 'a butterfly'], 'is a mammal'),
  F(2, 3, 'Which of these animals has a shell?', 'a turtle', ['a frog', 'a mouse', 'a shark'], 'has a shell'),

  // -------------------------------------------------------------------- level 3: how bodies help
  F(3, 1, 'Why does a camel have a hump?', 'to store fat for energy', ['to store water', 'to carry people', 'to keep cool']),
  F(3, 1, 'Why do polar bears have white fur?', 'to hide in the snow', ['to stay cool', 'to swim faster', 'to scare seals']),
  F(3, 1, 'Why does a giraffe have a long neck?', 'to reach high leaves', ['to see over hills', 'to run faster', 'to drink water']),
  F(3, 1, 'Why do ducks have webbed feet?', 'to paddle in water', ['to climb trees', 'to dig holes', 'to hold food']),
  F(3, 1, 'Why does a hedgehog have spines?', 'to protect itself', ['to keep warm', 'to dig faster', 'to catch bugs']),
  F(3, 1, 'Why do fish have fins?', 'to swim and steer', ['to breathe', 'to keep warm', 'to catch flies']),
  F(3, 1, 'Why does a turtle have a shell?', 'for protection', ['to swim faster', 'to keep warm', 'to carry eggs']),
  F(3, 2, 'Why does an owl have such big eyes?', 'to see well at night', ['to look scary', 'to see colors', 'to cry a lot']),
  F(3, 2, "What do a rabbit's long ears help it do?", 'hear danger coming', ['run faster', 'dig burrows', 'stay dry']),
  F(3, 2, 'Why do elephants flap their big ears?', 'to cool down', ['to fly', 'to hear better', 'to scare mice']),
  F(3, 2, 'Why does a frog have a long sticky tongue?', 'to catch insects', ['to drink water', 'to clean itself', 'to sing loudly']),
  F(3, 2, 'How does a woodpecker find its food?', 'it pecks holes in trees', ['it dives into water', 'it digs in mud', 'it steals nests']),
  F(3, 2, 'Why do some birds fly south in the fall?', 'to find food and warmth', ['to lay eggs', 'to escape cats', 'to see the sea']),
  F(3, 2, 'Why does a penguin have a thick layer of fat?', 'to keep warm', ['to run fast', 'to look big', 'to change color']),
  F(3, 3, 'Why do zebras have stripes?', 'to confuse predators', ['to stay warm', 'to attract bees', 'to look pretty']),
  F(3, 3, 'Why do camels have long eyelashes?', 'to keep out sand', ['to look pretty', 'to see farther', 'to keep cool']),
  F(3, 3, 'How does a stick insect stay safe?', 'it looks like a twig', ['it runs very fast', 'it bites hard', 'it makes a loud sound']),
  F(3, 3, 'Why do many desert animals rest all day?', 'the daytime is too hot', ['they cannot see', 'food only grows then', 'they like the moon']),
  F(3, 3, 'Why do some moths look like tree bark?', 'so birds cannot spot them', ['to keep warm', 'to eat the bark', 'to fly faster']),
  F(3, 3, 'Why do bears sleep through the winter?', 'food is hard to find', ['they are lazy', 'it is too bright', 'they dislike snow']),
  F(3, 3, 'Why does a walrus have thick blubber?', 'to stay warm in cold seas', ['to float upright', 'to swim faster', 'to store fresh water']),

  // ------------------------------------------------------------- level 4: habitats and food chains
  F(4, 1, 'In a food chain, which of these is a producer?', 'grass', ['a rabbit', 'a fox', 'an owl'], 'is a producer'),
  F(4, 1, 'Which of these is a producer?', 'an oak tree', ['a deer', 'a wolf', 'a mushroom'], 'is a producer'),
  F(4, 1, 'What do producers need to make their own food?', 'sunlight', ['meat', 'insects', 'other plants'], 'is what plants need'),
  F(4, 1, 'Which animal lives in the Arctic?', 'a polar bear', ['a penguin', 'a camel', 'a lion'], 'lives in the Arctic'),
  F(4, 1, 'Which animal lives in a hot desert?', 'a camel', ['a polar bear', 'a dolphin', 'a frog'], 'lives in a hot desert'),
  F(4, 1, 'A habitat is ...', 'where a living thing lives', ['what an animal eats', "an animal's baby", 'a kind of food chain']),
  F(4, 2, 'Animals that hunt other animals are called ...', 'predators', ['prey', 'producers', 'herbivores']),
  F(4, 2, 'Grass, then rabbit, then fox. The fox is ...', 'a predator', ['a producer', 'the prey', 'a plant']),
  F(4, 2, 'Grass, then rabbit, then fox. A rabbit is ...', 'prey for the fox', ['a producer', 'a predator', 'a decomposer']),
  F(4, 2, 'Which of these is prey for a lion?', 'a zebra', ['a crocodile', 'a hippo', 'an eagle'], 'is prey for a lion'),
  F(4, 2, 'Which animal never leaves the ocean?', 'a whale', ['a frog', 'a duck', 'a crocodile'], 'never leaves the ocean'),
  F(4, 2, 'Where does the energy in a food chain start?', 'the sun', ['the soil', 'the ocean', 'the rain']),
  F(4, 3, 'Which of these is a decomposer?', 'an earthworm', ['an eagle', 'a deer', 'a shark'], 'is a decomposer'),
  F(4, 3, 'Which living thing breaks down dead leaves?', 'a fungus', ['a rabbit', 'a hawk', 'a frog'], 'is a decomposer'),
  F(4, 3, 'Which animal is at the top of its food chain?', 'an eagle', ['a mouse', 'a grasshopper', 'a rabbit'], 'is a top predator'),
  F(4, 3, 'Which of these is a consumer in a food chain?', 'a deer', ['grass', 'an oak tree', 'moss'], 'is a consumer'),
  F(4, 3, 'What if all the grass in a field died?', 'rabbits would go hungry', ['foxes would eat grass', 'nothing would change', 'more rabbits would come']),
  F(4, 3, 'What happens to a food chain if plants die?', 'every animal has less food', ['nothing changes', 'plants grow back fast', 'the sun goes out']),
  F(4, 3, 'Grass, then rabbit, then fox. Rabbits eat ...', 'plants', ['meat', 'other rabbits', 'plants and meat']),

  // ------------------------------------- level 5: classification, life cycles and whole ecosystems
  F(5, 1, 'Which mammal lays eggs?', 'a platypus', ['a bat', 'a whale', 'a kangaroo'], 'is a mammal that lays eggs'),
  F(5, 1, 'A spider is not an insect because it has ...', 'eight legs', ['six legs', 'no wings', 'a hard shell']),
  F(5, 1, 'What does camouflage give an animal?', 'color that helps it hide', ['a warmer home', 'a way to fly', 'a bigger family']),
  F(5, 1, 'Why do plants matter in every food chain?', 'they make the first food', ['they eat insects', 'they drink the rain', 'they hide the prey']),
  F(5, 1, 'Which animal is a marsupial?', 'a kangaroo', ['a rabbit', 'a bear', 'a wolf'], 'is a marsupial'),
  F(5, 1, 'Which animal goes through metamorphosis?', 'a butterfly', ['a cat', 'a horse', 'a snake'], 'goes through metamorphosis'),
  F(5, 1, 'Which of these animals is warm-blooded?', 'an owl', ['a snake', 'a frog', 'a shark'], 'is warm-blooded'),
  F(5, 2, "A frog's life cycle goes ...", 'egg, tadpole, frog', ['tadpole, egg, frog', 'frog, egg, tadpole', 'egg, frog, tadpole']),
  F(5, 2, "In a butterfly's life cycle, what comes right after the caterpillar?", 'the chrysalis', ['the egg', 'the butterfly', 'the nectar']),
  F(5, 2, 'All the living things in a place plus their surroundings are called ...', 'an ecosystem', ['a habitat', 'a food chain', 'a population']),
  F(5, 2, 'What do decomposers return to the soil?', 'nutrients', ['sunlight', 'oxygen', 'sand']),
  F(5, 2, 'Whales are mammals because they ...', 'breathe air and make milk', ['live in the ocean', 'have fins', 'are very big']),
  F(5, 2, 'One kind of animal in one place is called ...', 'a population', ['an ecosystem', 'a habitat', 'a food web']),
  F(5, 2, 'Many food chains linked together make ...', 'a food web', ['a habitat', 'a life cycle', 'a population']),
  F(5, 3, 'Which bird cannot fly?', 'an ostrich', ['an eagle', 'a parrot', 'a swan'], 'is a bird that cannot fly'),
  F(5, 3, 'Which fact is true of every bird?', 'it lays eggs', ['it can fly', 'it sings', 'it migrates']),
  F(5, 3, 'A seahorse is which kind of animal?', 'a fish', ['a mammal', 'an insect', 'a crustacean'], 'class of a seahorse'),
  F(5, 3, 'Which of these animals is an amphibian?', 'a newt', ['a turtle', 'a lizard', 'a snake'], 'is an amphibian'),
  F(5, 3, 'What happens when a new predator arrives?', 'some prey numbers drop', ['plants stop growing', 'the sun gets hotter', 'nothing changes at all']),
  F(5, 3, 'If every fox left a meadow, what would happen?', 'rabbit numbers would rise', ['the grass would die', 'rabbits would leave too', 'more foxes would arrive']),
  F(5, 3, 'What happens to energy up a food chain?', 'less is passed along', ['it doubles', 'it stays the same', 'it turns into water']),
]

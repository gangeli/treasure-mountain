import type { Grade } from '../types'
import type { Fact } from '../generators/thinkingUtil'

export type AnimalClass = 'mammal' | 'bird' | 'reptile' | 'fish' | 'insect' | 'amphibian' | 'arachnid' | 'mollusc' | 'crustacean' | 'worm'
export type Diet = 'herbivore' | 'carnivore' | 'omnivore'
export type Habitat = 'farm' | 'forest' | 'ocean' | 'desert' | 'Arctic' | 'Antarctic' | 'rainforest' | 'grassland' | 'pond' | 'garden' | 'river' | 'cave' | 'mountains'

/** One animal and the facts a child learns about it. Fields are omitted when there is no clear, well-known answer. */
export interface Animal {
  n: string
  cls: AnimalClass
  sound?: string
  baby?: string
  home?: string
  group?: string
  diet?: Diet
  hab?: Habitat
  /** Not a good "which animal lives in X" answer because it lives in many places. */
  vague?: boolean
}

const A = (n: string, cls: AnimalClass, rest: Omit<Animal, 'n' | 'cls'> = {}): Animal => ({ n, cls, ...rest })

export const ANIMALS: Animal[] = [
  A('cow', 'mammal', { sound: 'moo', baby: 'calf', home: 'barn', group: 'herd', diet: 'herbivore', hab: 'farm' }),
  A('pig', 'mammal', { sound: 'oink', baby: 'piglet', home: 'sty', diet: 'omnivore', hab: 'farm' }),
  A('sheep', 'mammal', { sound: 'baa', baby: 'lamb', home: 'pen', group: 'flock', diet: 'herbivore', hab: 'farm' }),
  A('dog', 'mammal', { sound: 'woof', baby: 'puppy', home: 'kennel', group: 'pack', diet: 'omnivore', vague: true }),
  A('cat', 'mammal', { sound: 'meow', baby: 'kitten', diet: 'carnivore', vague: true }),
  A('horse', 'mammal', { sound: 'neigh', baby: 'foal', home: 'stable', group: 'herd', diet: 'herbivore', hab: 'farm' }),
  A('duck', 'bird', { sound: 'quack', baby: 'duckling', group: 'flock', diet: 'omnivore', hab: 'pond' }),
  A('hen', 'bird', { sound: 'cluck', baby: 'chick', home: 'coop', group: 'flock', diet: 'omnivore', hab: 'farm' }),
  A('goat', 'mammal', { baby: 'kid', home: 'pen', group: 'herd', diet: 'herbivore', hab: 'farm' }),
  A('donkey', 'mammal', { sound: 'hee-haw', baby: 'foal', home: 'stable', diet: 'herbivore', hab: 'farm' }),
  A('turkey', 'bird', { sound: 'gobble', baby: 'poult', group: 'flock', diet: 'omnivore', hab: 'farm' }),
  A('goose', 'bird', { sound: 'honk', baby: 'gosling', home: 'nest', group: 'gaggle', diet: 'herbivore', hab: 'pond' }),
  A('swan', 'bird', { baby: 'cygnet', home: 'nest', diet: 'herbivore', hab: 'pond' }),
  A('frog', 'amphibian', { sound: 'ribbit', baby: 'tadpole', diet: 'carnivore', hab: 'pond' }),
  A('toad', 'amphibian', { sound: 'croak', baby: 'tadpole', diet: 'carnivore', hab: 'garden' }),
  A('newt', 'amphibian', { diet: 'carnivore', hab: 'pond' }),
  A('lion', 'mammal', { sound: 'roar', baby: 'cub', home: 'den', group: 'pride', diet: 'carnivore', hab: 'grassland' }),
  A('tiger', 'mammal', { sound: 'roar', baby: 'cub', diet: 'carnivore', hab: 'rainforest' }),
  A('bear', 'mammal', { sound: 'growl', baby: 'cub', home: 'den', diet: 'omnivore', hab: 'forest' }),
  A('polar bear', 'mammal', { sound: 'growl', baby: 'cub', home: 'den', diet: 'carnivore', hab: 'Arctic' }),
  A('panda', 'mammal', { baby: 'cub', diet: 'herbivore', hab: 'forest' }),
  A('wolf', 'mammal', { sound: 'howl', baby: 'pup', home: 'den', group: 'pack', diet: 'carnivore', hab: 'forest' }),
  A('fox', 'mammal', { baby: 'cub', home: 'den', diet: 'omnivore', hab: 'forest' }),
  A('deer', 'mammal', { baby: 'fawn', group: 'herd', diet: 'herbivore', hab: 'forest' }),
  A('squirrel', 'mammal', { baby: 'kit', hab: 'forest' }),
  A('hedgehog', 'mammal', { baby: 'hoglet', hab: 'garden' }),
  A('mole', 'mammal', { baby: 'pup', home: 'burrow', diet: 'carnivore', hab: 'garden' }),
  A('rabbit', 'mammal', { baby: 'bunny', home: 'burrow', diet: 'herbivore', hab: 'grassland' }),
  A('mouse', 'mammal', { sound: 'squeak', baby: 'pup', home: 'burrow', diet: 'omnivore', vague: true }),
  A('bat', 'mammal', { sound: 'squeak', baby: 'pup', home: 'cave', group: 'colony', diet: 'carnivore', hab: 'cave' }),
  A('owl', 'bird', { sound: 'hoot', baby: 'owlet', home: 'hollow tree', diet: 'carnivore', hab: 'forest' }),
  A('robin', 'bird', { sound: 'tweet', baby: 'chick', home: 'nest', diet: 'omnivore', hab: 'garden' }),
  A('crow', 'bird', { sound: 'caw', baby: 'chick', home: 'nest', diet: 'omnivore', vague: true }),
  A('eagle', 'bird', { sound: 'screech', baby: 'eaglet', home: 'nest', diet: 'carnivore', hab: 'mountains' }),
  A('hawk', 'bird', { sound: 'screech', baby: 'chick', home: 'nest', diet: 'carnivore', hab: 'forest' }),
  A('parrot', 'bird', { sound: 'squawk', baby: 'chick', home: 'nest', group: 'flock', diet: 'herbivore', hab: 'rainforest' }),
  A('ostrich', 'bird', { baby: 'chick', home: 'nest', group: 'flock', diet: 'omnivore', hab: 'grassland' }),
  A('flamingo', 'bird', { baby: 'chick', home: 'nest', group: 'flock', diet: 'omnivore', hab: 'pond' }),
  A('penguin', 'bird', { baby: 'chick', group: 'colony', diet: 'carnivore', hab: 'Antarctic' }),
  A('bee', 'insect', { sound: 'buzz', baby: 'larva', home: 'hive', group: 'swarm', diet: 'herbivore', hab: 'garden' }),
  A('ant', 'insect', { baby: 'larva', home: 'anthill', group: 'colony', diet: 'omnivore', hab: 'garden' }),
  A('butterfly', 'insect', { baby: 'caterpillar', diet: 'herbivore', hab: 'garden' }),
  A('ladybug', 'insect', { baby: 'larva', diet: 'carnivore', hab: 'garden' }),
  A('grasshopper', 'insect', { sound: 'chirp', baby: 'nymph', diet: 'herbivore', hab: 'grassland' }),
  A('cricket', 'insect', { sound: 'chirp', baby: 'nymph', hab: 'grassland' }),
  A('spider', 'arachnid', { baby: 'spiderling', home: 'web', diet: 'carnivore', hab: 'garden' }),
  A('snail', 'mollusc', { home: 'shell', diet: 'herbivore', hab: 'garden' }),
  A('earthworm', 'worm', { home: 'soil', hab: 'garden' }),
  A('snake', 'reptile', { sound: 'hiss', home: 'burrow', diet: 'carnivore', hab: 'desert' }),
  A('lizard', 'reptile', { baby: 'hatchling', diet: 'carnivore', hab: 'desert' }),
  A('crocodile', 'reptile', { baby: 'hatchling', diet: 'carnivore', hab: 'river' }),
  A('turtle', 'reptile', { baby: 'hatchling', diet: 'omnivore', hab: 'pond' }),
  A('tortoise', 'reptile', { baby: 'hatchling', diet: 'herbivore', hab: 'desert' }),
  A('elephant', 'mammal', { sound: 'trumpet', baby: 'calf', group: 'herd', diet: 'herbivore', hab: 'grassland' }),
  A('giraffe', 'mammal', { baby: 'calf', diet: 'herbivore', hab: 'grassland' }),
  A('zebra', 'mammal', { baby: 'foal', group: 'herd', diet: 'herbivore', hab: 'grassland' }),
  A('rhino', 'mammal', { baby: 'calf', diet: 'herbivore', hab: 'grassland' }),
  A('hippo', 'mammal', { baby: 'calf', diet: 'herbivore', hab: 'river' }),
  A('kangaroo', 'mammal', { baby: 'joey', group: 'mob', diet: 'herbivore', hab: 'grassland' }),
  A('koala', 'mammal', { baby: 'joey', diet: 'herbivore', hab: 'forest' }),
  A('camel', 'mammal', { baby: 'calf', group: 'caravan', diet: 'herbivore', hab: 'desert' }),
  A('monkey', 'mammal', { sound: 'chatter', baby: 'infant', group: 'troop', diet: 'omnivore', hab: 'rainforest' }),
  A('gorilla', 'mammal', { baby: 'infant', group: 'troop', diet: 'herbivore', hab: 'rainforest' }),
  A('chimpanzee', 'mammal', { baby: 'infant', group: 'troop', diet: 'omnivore', hab: 'rainforest' }),
  A('sloth', 'mammal', { baby: 'cub', diet: 'herbivore', hab: 'rainforest' }),
  A('whale', 'mammal', { baby: 'calf', group: 'pod', diet: 'carnivore', hab: 'ocean' }),
  A('dolphin', 'mammal', { sound: 'click', baby: 'calf', group: 'pod', diet: 'carnivore', hab: 'ocean' }),
  A('seal', 'mammal', { sound: 'bark', baby: 'pup', group: 'colony', diet: 'carnivore', hab: 'ocean' }),
  A('shark', 'fish', { baby: 'pup', diet: 'carnivore', hab: 'ocean' }),
  A('clownfish', 'fish', { baby: 'fry', diet: 'omnivore', hab: 'ocean' }),
  A('tuna', 'fish', { baby: 'fry', group: 'school', diet: 'carnivore', hab: 'ocean' }),
  A('salmon', 'fish', { baby: 'fry', group: 'school', diet: 'carnivore', hab: 'river' }),
  A('goldfish', 'fish', { baby: 'fry', group: 'school', diet: 'omnivore', hab: 'pond' }),
  A('octopus', 'mollusc', { diet: 'carnivore', hab: 'ocean' }),
  A('crab', 'crustacean', { diet: 'omnivore', hab: 'ocean' }),
  A('platypus', 'mammal', { baby: 'puggle', home: 'burrow', diet: 'carnivore', hab: 'river' }),
]

/** Baby names a K child is expected to know (used as answers; the rest only appear as decoys for older grades). */
export const KNOWN_BABIES = ['calf', 'piglet', 'lamb', 'puppy', 'kitten', 'foal', 'duckling', 'chick', 'kid', 'tadpole', 'cub', 'joey', 'fawn', 'caterpillar', 'gosling', 'owlet', 'bunny']

export const CLASS_NAMES: AnimalClass[] = ['mammal', 'bird', 'reptile', 'fish', 'insect', 'amphibian']

/** Fact questions by level: 2 classes and diets, 3 adaptations, 4 food chains and habitats, 5 ecosystems, life cycles, classification. */
const F = (level: Grade, q: string, a: string, d: string[], hard = false): Fact => ({ level, q, a, d, hard })

export const ANIMAL_FACTS: Fact[] = [
  F(2, 'Which group of animals feeds its babies milk?', 'mammals', ['birds', 'reptiles', 'fish']),
  F(2, 'Which group of animals has feathers?', 'birds', ['mammals', 'reptiles', 'insects']),
  F(2, 'A frog is which kind of animal?', 'an amphibian', ['a reptile', 'a mammal', 'a fish']),
  F(2, 'Which of these animals lays eggs?', 'a hen', ['a cow', 'a dog', 'a cat']),
  F(2, 'Animals that eat only plants are called ...', 'herbivores', ['carnivores', 'omnivores', 'predators']),
  F(2, 'Animals that eat only meat are called ...', 'carnivores', ['herbivores', 'omnivores', 'prey']),
  F(2, 'An animal that eats both plants and meat is ...', 'an omnivore', ['a herbivore', 'a carnivore', 'a producer']),
  F(2, 'Which of these animals has six legs?', 'an ant', ['a spider', 'a mouse', 'a snake']),
  F(2, 'Which animal has scales and breathes with gills?', 'a fish', ['a frog', 'a duck', 'an otter']),
  F(2, 'Which of these animals is cold-blooded?', 'a lizard', ['a dog', 'a cat', 'a cow'], true),
  F(2, 'Which of these animals has fur?', 'a bear', ['a snake', 'a fish', 'a frog']),
  F(2, 'Which of these animals is an insect?', 'a beetle', ['a worm', 'a snail', 'a spider'], true),
  F(2, 'Which animal is a reptile?', 'a snake', ['a frog', 'a fish', 'a bat']),
  F(3, 'Why does a camel have a hump?', 'to store fat for energy', ['to store water', 'to carry people', 'to keep cool']),
  F(3, 'Why do polar bears have white fur?', 'to hide in the snow', ['to stay cool', 'to swim faster', 'to scare seals']),
  F(3, 'Why does a giraffe have a long neck?', 'to reach high leaves', ['to see over hills', 'to run faster', 'to drink water']),
  F(3, 'Why do ducks have webbed feet?', 'to paddle in water', ['to climb trees', 'to dig holes', 'to hold food']),
  F(3, 'Why does a hedgehog have spines?', 'to protect itself', ['to keep warm', 'to dig faster', 'to catch bugs']),
  F(3, 'How does a chameleon hide from enemies?', 'it changes colour', ['it digs a hole', 'it plays dead', 'it flies away']),
  F(3, 'Why do bears sleep through the winter?', 'food is hard to find', ['they are lazy', 'it is too bright', 'they dislike snow']),
  F(3, 'Why do some birds migrate in autumn?', 'to find food and warmth', ['to lay eggs', 'to escape cats', 'to see the sea']),
  F(3, 'Why does an owl have such big eyes?', 'to see well at night', ['to look scary', 'to see colours', 'to cry a lot']),
  F(3, "What do a rabbit's long ears help it do?", 'hear danger coming', ['run faster', 'dig burrows', 'stay dry']),
  F(3, 'Why do fish have fins?', 'to swim and steer', ['to breathe', 'to keep warm', 'to catch flies']),
  F(3, 'Why do zebras have stripes?', 'to confuse predators', ['to stay warm', 'to attract bees', 'to look pretty'], true),
  F(3, 'Why does a penguin have a thick layer of fat?', 'to keep warm', ['to float', 'to run fast', 'to look big']),
  F(3, 'Why do elephants flap their big ears?', 'to cool down', ['to fly', 'to hear better', 'to scare mice']),
  F(3, 'How does a woodpecker find its food?', 'it pecks holes in trees', ['it dives into water', 'it digs in mud', 'it steals nests']),
  F(3, 'Why does a turtle have a shell?', 'for protection', ['to swim faster', 'to keep warm', 'to carry eggs']),
  F(3, 'Why does a frog have a long sticky tongue?', 'to catch insects', ['to drink water', 'to clean itself', 'to sing loudly']),
  F(3, 'Why do camels have long eyelashes?', 'to keep out sand', ['to look pretty', 'to see farther', 'to keep cool'], true),
  F(4, 'In a food chain, which of these is a producer?', 'grass', ['rabbit', 'fox', 'owl']),
  F(4, 'Which of these is a producer?', 'an oak tree', ['a deer', 'a wolf', 'a mushroom']),
  F(4, 'What do producers need to make their own food?', 'sunlight', ['meat', 'insects', 'other plants']),
  F(4, 'In the food chain grass, then rabbit, then fox, the fox is ...', 'a predator', ['a producer', 'the prey', 'a plant']),
  F(4, 'In the food chain grass, then rabbit, then fox, the rabbit is ...', 'prey for the fox', ['a producer', 'a predator', 'a decomposer']),
  F(4, 'Which of these is a decomposer?', 'an earthworm', ['an eagle', 'a deer', 'a shark']),
  F(4, 'Which living thing breaks down dead leaves?', 'fungus', ['a rabbit', 'a hawk', 'a frog'], true),
  F(4, 'Where does the energy in a food chain come from first?', 'the sun', ['the soil', 'the ocean', 'the animals']),
  F(4, 'Which animal is at the top of its food chain?', 'an eagle', ['a mouse', 'a grasshopper', 'a rabbit']),
  F(4, 'What would happen if all the grass in a meadow died?', 'rabbits would go hungry', ['foxes would eat grass', 'nothing would change', 'more rabbits would come']),
  F(4, 'Which animal lives in the Arctic?', 'a polar bear', ['a penguin', 'a camel', 'a lion']),
  F(4, 'Which animal lives in a hot desert?', 'a camel', ['a polar bear', 'a dolphin', 'a frog']),
  F(4, 'Which animal spends its whole life in the ocean?', 'a whale', ['a frog', 'a duck', 'a crocodile']),
  F(4, 'A habitat is ...', 'where a living thing lives', ['what an animal eats', "an animal's baby", 'a kind of food chain']),
  F(4, 'Which of these is prey for a lion?', 'a zebra', ['a crocodile', 'a hippo', 'an eagle']),
  F(4, 'Animals that hunt other animals are called ...', 'predators', ['prey', 'producers', 'herbivores']),
  F(4, 'Which of these is a consumer in a food chain?', 'a deer', ['grass', 'an oak tree', 'moss'], true),
  F(5, 'Which mammal lays eggs?', 'a platypus', ['a bat', 'a whale', 'a kangaroo']),
  F(5, 'A spider is not an insect because it has ...', 'eight legs', ['no wings', 'a hard shell', 'two eyes']),
  F(5, 'Which of these is an invertebrate?', 'an octopus', ['a frog', 'a snake', 'a shark']),
  F(5, 'Which of these is a vertebrate?', 'a salmon', ['a snail', 'a jellyfish', 'a beetle']),
  F(5, 'Which animal is a marsupial?', 'a kangaroo', ['a rabbit', 'a bear', 'a wolf']),
  F(5, 'Which animal goes through metamorphosis?', 'a butterfly', ['a cat', 'a horse', 'a snake']),
  F(5, "What is the correct order of a frog's life cycle?", 'egg, tadpole, frog', ['tadpole, egg, frog', 'frog, egg, tadpole', 'egg, frog, tadpole']),
  F(5, "In a butterfly's life cycle, what comes right after the caterpillar?", 'the chrysalis', ['the egg', 'the butterfly', 'the nectar']),
  F(5, 'Which of these animals is warm-blooded?', 'an owl', ['a snake', 'a frog', 'a trout']),
  F(5, 'All the living things in a place, together with their surroundings, are called ...', 'an ecosystem', ['a habitat', 'a food chain', 'a population']),
  F(5, 'What do decomposers return to the soil?', 'nutrients', ['sunlight', 'oxygen', 'sand']),
  F(5, 'Whales are mammals because they ...', 'breathe air and make milk', ['live in the ocean', 'have fins', 'are very big']),
  F(5, 'Which of these animals is an amphibian?', 'a newt', ['a turtle', 'a lizard', 'a snake'], true),
  F(5, 'Which of these animals has a backbone?', 'an eagle', ['a worm', 'a crab', 'a jellyfish']),
  F(5, 'A group of the same kind of animal living in one place is called ...', 'a population', ['an ecosystem', 'a habitat', 'a food web']),
  F(5, 'Which of these animals is a reptile?', 'a crocodile', ['a salamander', 'a frog', 'a toad'], true),
  F(5, 'Which fact is true of every bird?', 'it lays eggs', ['it can fly', 'it sings', 'it migrates']),
  F(5, 'Many food chains linked together make ...', 'a food web', ['a habitat', 'a life cycle', 'a population']),
  F(5, 'Which change would harm a pond ecosystem the most?', 'draining the water', ['a rainy week', 'a new duck', 'more lily pads']),
  F(5, 'Which bird cannot fly?', 'an ostrich', ['an eagle', 'a parrot', 'a swan']),
]

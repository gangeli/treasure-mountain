/**
 * Categories for "Which one is a fruit?" / "Which does not belong?" / "Apple, pear and plum are all ___."
 * `one` is how a single member is named ("a fruit"), `many` the plural ("fruits").
 * `domain` groups categories so decoys are plausible (same domain) but never members.
 * Level 1 = K, 2 = grades 1-2, 3 = grade 3, 4 = grades 4-5.
 */
export type Domain = 'food' | 'animals' | 'home' | 'nature' | 'people' | 'science' | 'language' | 'math' | 'places' | 'arts' | 'time'
export interface Category { id: string; one: string; many: string; members: string[]; level: 1 | 2 | 3 | 4; domain: Domain }

const k = (id: string, one: string, many: string, level: 1 | 2 | 3 | 4, domain: Domain, members: string[]): Category => ({ id, one, many, level, domain, members })

export const CATEGORIES: Category[] = [
  // level 1 (K)
  k('fruits', 'a fruit', 'fruits', 1, 'food', ['apple', 'banana', 'orange', 'grape', 'pear', 'peach', 'plum', 'cherry', 'strawberry', 'watermelon', 'lemon', 'mango']),
  k('vegetables', 'a vegetable', 'vegetables', 1, 'food', ['carrot', 'broccoli', 'pea', 'potato', 'onion', 'lettuce', 'corn', 'spinach', 'cabbage', 'cucumber', 'celery', 'bean']),
  k('drinks', 'a drink', 'drinks', 1, 'food', ['milk', 'juice', 'water', 'tea', 'lemonade', 'cocoa', 'soda', 'smoothie']),
  k('baked', 'a baked treat', 'baked treats', 1, 'food', ['cake', 'pie', 'cookie', 'brownie', 'cupcake', 'muffin', 'donut', 'bread', 'pretzel', 'bagel', 'croissant', 'scone']),
  k('colors', 'a color', 'colors', 1, 'arts', ['red', 'blue', 'green', 'yellow', 'purple', 'pink', 'brown', 'black', 'white', 'gray']),
  k('animals', 'an animal', 'animals', 1, 'animals', ['dog', 'cat', 'cow', 'pig', 'horse', 'lion', 'bear', 'rabbit', 'elephant', 'monkey', 'duck', 'frog']),
  k('pets', 'a pet', 'pets', 1, 'animals', ['dog', 'cat', 'hamster', 'goldfish', 'rabbit', 'guinea pig', 'turtle', 'gerbil']),
  k('shapes', 'a shape', 'shapes', 1, 'math', ['circle', 'square', 'triangle', 'rectangle', 'star', 'heart', 'oval', 'diamond']),
  k('numbers', 'a number', 'numbers', 1, 'math', ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']),
  k('body', 'a body part', 'body parts', 1, 'people', ['hand', 'foot', 'nose', 'ear', 'eye', 'knee', 'elbow', 'arm', 'leg', 'mouth', 'finger', 'toe']),
  k('clothes', 'a piece of clothing', 'clothes', 1, 'home', ['shirt', 'pants', 'dress', 'hat', 'sock', 'shoe', 'coat', 'jacket', 'scarf', 'glove', 'skirt', 'sweater']),
  k('toys', 'a toy', 'toys', 1, 'home', ['doll', 'ball', 'kite', 'puzzle', 'blocks', 'teddy bear', 'yo-yo', 'jump rope', 'marbles', 'puppet']),
  // level 2 (grades 1-2)
  k('vehicles', 'a vehicle', 'vehicles', 2, 'home', ['car', 'bus', 'truck', 'train', 'bike', 'boat', 'airplane', 'helicopter', 'motorcycle', 'scooter', 'van', 'taxi']),
  k('farm', 'a farm animal', 'farm animals', 2, 'animals', ['cow', 'pig', 'sheep', 'goat', 'horse', 'chicken', 'duck', 'turkey', 'donkey', 'rooster']),
  k('insects', 'an insect', 'insects', 2, 'animals', ['ant', 'bee', 'butterfly', 'beetle', 'fly', 'mosquito', 'grasshopper', 'ladybug', 'moth', 'dragonfly', 'cricket', 'wasp']),
  k('sea', 'a sea animal', 'sea animals', 2, 'animals', ['shark', 'whale', 'dolphin', 'octopus', 'crab', 'jellyfish', 'seal', 'starfish', 'lobster', 'seahorse', 'squid', 'clam']),
  k('birds', 'a bird', 'birds', 2, 'animals', ['robin', 'eagle', 'owl', 'parrot', 'penguin', 'sparrow', 'hawk', 'crow', 'swan', 'flamingo', 'pigeon', 'hummingbird']),
  k('babies', 'a baby animal', 'baby animals', 2, 'animals', ['puppy', 'kitten', 'calf', 'lamb', 'foal', 'chick', 'duckling', 'piglet', 'cub', 'fawn', 'joey', 'tadpole']),
  k('furniture', 'a piece of furniture', 'furniture', 2, 'home', ['chair', 'table', 'bed', 'sofa', 'desk', 'dresser', 'bookshelf', 'stool', 'bench', 'cabinet', 'couch', 'crib']),
  k('kitchen', 'a kitchen tool', 'kitchen tools', 2, 'home', ['spoon', 'fork', 'knife', 'pot', 'pan', 'bowl', 'plate', 'cup', 'whisk', 'ladle', 'kettle', 'spatula']),
  k('tools', 'a tool', 'tools', 2, 'home', ['hammer', 'saw', 'drill', 'screwdriver', 'wrench', 'pliers', 'shovel', 'rake', 'axe', 'chisel', 'tape measure', 'crowbar']),
  k('rooms', 'a room in a house', 'rooms', 2, 'home', ['kitchen', 'bedroom', 'bathroom', 'living room', 'garage', 'attic', 'basement', 'hallway', 'closet', 'dining room', 'pantry', 'nursery']),
  k('school', 'a school supply', 'school supplies', 2, 'home', ['pencil', 'eraser', 'notebook', 'crayon', 'ruler', 'backpack', 'glue', 'scissors', 'marker', 'folder', 'stapler', 'chalk']),
  k('sports', 'a sport', 'sports', 2, 'people', ['soccer', 'baseball', 'tennis', 'basketball', 'swimming', 'hockey', 'golf', 'football', 'volleyball', 'gymnastics', 'skiing', 'wrestling']),
  k('jobs', 'a job', 'jobs', 2, 'people', ['teacher', 'doctor', 'farmer', 'nurse', 'chef', 'pilot', 'firefighter', 'dentist', 'baker', 'plumber', 'mechanic', 'lawyer']),
  k('weather', 'a kind of weather', 'kinds of weather', 2, 'nature', ['rain', 'snow', 'wind', 'sunshine', 'fog', 'hail', 'thunder', 'lightning', 'sleet', 'drizzle', 'breeze', 'storm']),
  k('seasons', 'a season', 'seasons', 2, 'time', ['spring', 'summer', 'fall', 'winter']),
  k('days', 'a day of the week', 'days of the week', 2, 'time', ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']),
  k('months', 'a month', 'months', 2, 'time', ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']),
  k('flowers', 'a flower', 'flowers', 2, 'nature', ['rose', 'tulip', 'daisy', 'lily', 'sunflower', 'daffodil', 'violet', 'orchid', 'poppy', 'iris', 'pansy', 'marigold']),
  k('trees', 'a tree', 'trees', 2, 'nature', ['oak', 'maple', 'pine', 'birch', 'willow', 'palm', 'cedar', 'elm', 'spruce', 'redwood', 'fir', 'sequoia']),
  k('instruments', 'a musical instrument', 'musical instruments', 2, 'arts', ['piano', 'guitar', 'drum', 'violin', 'flute', 'trumpet', 'harp', 'cello', 'clarinet', 'tuba', 'banjo', 'saxophone']),
  k('vowels', 'a vowel', 'vowels', 2, 'language', ['a', 'e', 'i', 'o', 'u']),
  k('consonants', 'a consonant', 'consonants', 2, 'language', ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'v', 'w', 'z']),
  k('even', 'an even number', 'even numbers', 2, 'math', ['2', '4', '6', '8', '10', '12', '14', '16', '18', '20', '24', '30', '46', '58', '72']),
  k('odd', 'an odd number', 'odd numbers', 2, 'math', ['1', '3', '5', '7', '9', '11', '13', '15', '17', '19', '21', '25', '37', '49', '63']),
  // level 3 (grade 3)
  k('mammals', 'a mammal', 'mammals', 3, 'animals', ['dog', 'cow', 'horse', 'whale', 'dolphin', 'bear', 'elephant', 'lion', 'monkey', 'bat', 'deer', 'tiger', 'giraffe', 'kangaroo', 'seal']),
  k('reptiles', 'a reptile', 'reptiles', 3, 'animals', ['snake', 'lizard', 'turtle', 'crocodile', 'alligator', 'gecko', 'iguana', 'tortoise', 'chameleon', 'cobra', 'python']),
  k('amphibians', 'an amphibian', 'amphibians', 3, 'animals', ['frog', 'toad', 'salamander', 'newt']),
  k('fish', 'a fish', 'fish', 3, 'animals', ['salmon', 'trout', 'tuna', 'goldfish', 'shark', 'cod', 'catfish', 'bass', 'swordfish', 'sardine', 'minnow', 'carp']),
  k('dinosaurs', 'a dinosaur', 'dinosaurs', 3, 'animals', ['Tyrannosaurus', 'Triceratops', 'Stegosaurus', 'Velociraptor', 'Brachiosaurus', 'Diplodocus', 'Ankylosaurus', 'Spinosaurus', 'Iguanodon']),
  k('planets', 'a planet', 'planets', 3, 'science', ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune']),
  k('stars', 'a star', 'stars', 3, 'science', ['the Sun', 'Sirius', 'Polaris', 'Vega', 'Betelgeuse', 'Rigel', 'Alpha Centauri', 'Antares']),
  k('solids', 'a solid', 'solids', 3, 'science', ['ice', 'rock', 'wood', 'brick', 'coin', 'glass', 'bone', 'steel', 'salt', 'chalk']),
  k('liquids', 'a liquid', 'liquids', 3, 'science', ['water', 'milk', 'juice', 'oil', 'honey', 'vinegar', 'lava', 'syrup', 'gasoline', 'paint']),
  k('gases', 'a gas', 'gases', 3, 'science', ['air', 'steam', 'oxygen', 'helium', 'carbon dioxide', 'hydrogen', 'nitrogen', 'water vapor', 'neon']),
  k('solidshapes', 'a solid shape', 'solid shapes', 3, 'math', ['cube', 'sphere', 'cone', 'cylinder', 'pyramid', 'prism']),
  k('continents', 'a continent', 'continents', 3, 'places', ['Asia', 'Africa', 'Europe', 'Australia', 'Antarctica', 'North America', 'South America']),
  k('oceans', 'an ocean', 'oceans', 3, 'places', ['Pacific', 'Atlantic', 'Indian', 'Arctic', 'Southern']),
  k('countries', 'a country', 'countries', 3, 'places', ['France', 'Japan', 'Brazil', 'Canada', 'Mexico', 'Egypt', 'India', 'Italy', 'Spain', 'China', 'Kenya', 'Peru']),
  k('states', 'a U.S. state', 'U.S. states', 3, 'places', ['Texas', 'Ohio', 'Florida', 'Maine', 'Utah', 'Iowa', 'Nevada', 'Oregon', 'Alaska', 'Hawaii', 'Kansas', 'Vermont']),
  k('strings', 'a string instrument', 'string instruments', 3, 'arts', ['guitar', 'violin', 'cello', 'harp', 'banjo', 'viola', 'mandolin', 'ukulele', 'double bass']),
  k('percussion', 'a percussion instrument', 'percussion instruments', 3, 'arts', ['drum', 'cymbals', 'xylophone', 'tambourine', 'maracas', 'bongo', 'gong', 'timpani', 'marimba']),
  k('brass', 'a brass instrument', 'brass instruments', 3, 'arts', ['trumpet', 'trombone', 'tuba', 'French horn', 'bugle', 'cornet']),
  k('woodwinds', 'a woodwind instrument', 'woodwind instruments', 3, 'arts', ['flute', 'clarinet', 'oboe', 'bassoon', 'saxophone', 'piccolo', 'recorder']),
  k('senses', 'one of the five senses', 'senses', 3, 'people', ['sight', 'hearing', 'smell', 'taste', 'touch']),
  k('landforms', 'a landform', 'landforms', 3, 'nature', ['mountain', 'valley', 'hill', 'plain', 'plateau', 'canyon', 'cliff', 'island', 'peninsula', 'volcano', 'dune', 'mesa']),
  k('waters', 'a body of water', 'bodies of water', 3, 'nature', ['ocean', 'lake', 'river', 'pond', 'stream', 'bay', 'gulf', 'sea', 'creek', 'lagoon', 'marsh', 'strait']),
  k('plantparts', 'a part of a plant', 'parts of a plant', 3, 'science', ['root', 'stem', 'leaf', 'seed', 'petal', 'bud', 'bark', 'branch', 'blossom', 'pollen']),
  k('lengths', 'a unit of length', 'units of length', 3, 'math', ['inch', 'foot', 'yard', 'mile', 'centimeter', 'meter', 'kilometer', 'millimeter']),
  k('weights', 'a unit of weight', 'units of weight', 3, 'math', ['ounce', 'pound', 'ton', 'gram', 'kilogram', 'milligram']),
  k('timeunits', 'a unit of time', 'units of time', 3, 'math', ['second', 'minute', 'hour', 'day', 'week', 'month', 'year', 'decade', 'century']),
  // level 4 (grades 4-5)
  k('nouns', 'a noun', 'nouns', 4, 'language', ['table', 'city', 'teacher', 'river', 'book', 'idea', 'bridge', 'kitten', 'ocean', 'garden', 'planet', 'doctor']),
  k('verbs', 'a verb', 'verbs', 4, 'language', ['run', 'jump', 'sing', 'write', 'think', 'swim', 'eat', 'climb', 'whisper', 'build', 'sleep', 'shout']),
  k('adjectives', 'an adjective', 'adjectives', 4, 'language', ['tall', 'happy', 'soft', 'shiny', 'quiet', 'enormous', 'cold', 'brave', 'purple', 'sticky', 'ancient', 'gentle']),
  k('adverbs', 'an adverb', 'adverbs', 4, 'language', ['quickly', 'softly', 'always', 'never', 'carefully', 'loudly', 'suddenly', 'gently', 'often', 'happily']),
  k('punctuation', 'a punctuation mark', 'punctuation marks', 4, 'language', ['period', 'comma', 'question mark', 'exclamation point', 'apostrophe', 'colon', 'semicolon', 'hyphen', 'quotation mark']),
  k('languages', 'a language', 'languages', 4, 'language', ['English', 'Spanish', 'French', 'Chinese', 'Arabic', 'Hindi', 'German', 'Japanese', 'Portuguese', 'Russian', 'Italian', 'Swahili']),
  k('metals', 'a metal', 'metals', 4, 'science', ['iron', 'gold', 'silver', 'copper', 'aluminum', 'tin', 'lead', 'zinc', 'nickel', 'platinum', 'titanium', 'mercury']),
  k('rocks', 'a kind of rock', 'kinds of rock', 4, 'science', ['granite', 'marble', 'sandstone', 'limestone', 'slate', 'basalt', 'pumice', 'obsidian', 'shale']),
  k('minerals', 'a mineral', 'minerals', 4, 'science', ['quartz', 'feldspar', 'mica', 'talc', 'calcite', 'gypsum', 'halite', 'graphite', 'garnet']),
  k('organs', 'an organ of the body', 'organs', 4, 'people', ['heart', 'lungs', 'brain', 'stomach', 'liver', 'kidney', 'skin', 'intestines', 'bladder', 'pancreas']),
  k('machines', 'a simple machine', 'simple machines', 4, 'science', ['lever', 'pulley', 'wedge', 'screw', 'wheel and axle', 'inclined plane']),
  k('energy', 'an energy source', 'energy sources', 4, 'science', ['solar power', 'wind power', 'coal', 'natural gas', 'nuclear power', 'hydropower', 'geothermal heat', 'biofuel']),
  k('cellparts', 'a part of a cell', 'parts of a cell', 4, 'science', ['nucleus', 'membrane', 'cytoplasm', 'cell wall', 'chloroplast', 'mitochondria', 'vacuole', 'ribosome']),
  k('civilizations', 'an ancient civilization', 'ancient civilizations', 4, 'people', ['the Egyptians', 'the Romans', 'the Greeks', 'the Aztecs', 'the Maya', 'the Incas', 'the Vikings', 'the Persians']),
  k('cities', 'a city', 'cities', 4, 'places', ['Paris', 'Tokyo', 'London', 'Rome', 'Chicago', 'Cairo', 'Sydney', 'Boston', 'Madrid', 'Berlin', 'Toronto', 'Denver']),
  k('primes', 'a prime number', 'prime numbers', 4, 'math', ['2', '3', '5', '7', '11', '13', '17', '19', '23', '29', '31', '37']),
  k('composites', 'a composite number', 'composite numbers', 4, 'math', ['4', '6', '8', '9', '10', '12', '14', '15', '16', '18', '20', '21', '25', '27']),
  k('herbivores', 'a plant-eater', 'plant-eaters', 4, 'animals', ['cow', 'deer', 'rabbit', 'giraffe', 'elephant', 'horse', 'sheep', 'koala', 'panda', 'zebra']),
  k('carnivores', 'a meat-eater', 'meat-eaters', 4, 'animals', ['lion', 'tiger', 'wolf', 'shark', 'eagle', 'crocodile', 'hawk', 'polar bear', 'cheetah', 'leopard']),
  k('polygons', 'a polygon', 'polygons', 4, 'math', ['triangle', 'square', 'rectangle', 'pentagon', 'hexagon', 'octagon', 'rhombus', 'trapezoid', 'parallelogram']),
  k('capitals', 'a state capital', 'state capitals', 4, 'places', ['Austin', 'Sacramento', 'Albany', 'Denver', 'Boston', 'Atlanta', 'Phoenix', 'Honolulu', 'Nashville', 'Salem']),
]

/** Categories that share at least one member with `cat` (including itself); their members are never decoys for it. */
export function overlapping(cat: Category): Category[] {
  const cached = OVERLAP.get(cat)
  if (cached) return cached
  const set = new Set(cat.members.map(m => m.toLowerCase()))
  const out = CATEGORIES.filter(c => c === cat || c.members.some(m => set.has(m.toLowerCase())))
  OVERLAP.set(cat, out)
  return out
}
const OVERLAP = new Map<Category, Category[]>()

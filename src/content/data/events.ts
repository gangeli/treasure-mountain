import type { Grade } from '../types'
import type { Fact } from '../generators/thinkingUtil'

/** An ordered sequence of events. Level 0 everyday 2-3 steps, 1 daily routine, 2 life cycles, 3 procedures. */
export interface Sequence { level: Grade; topic: string; steps: string[]; /** Heading used for life cycles when "The life cycle of <topic>" reads badly. */ title?: string }

const Q = (level: Grade, topic: string, steps: string[], title?: string): Sequence => ({ level, topic, steps, title })

export const SEQUENCES: Sequence[] = [
  // ---- K: first / next / last
  Q(0, 'getting dressed', ['put on socks', 'put on shoes']),
  Q(0, 'lunch', ['wash your hands', 'eat your lunch']),
  Q(0, 'going out', ['open the door', 'walk outside']),
  Q(0, 'a drink', ['pour the milk', 'drink the milk']),
  Q(0, 'an egg', ['crack the egg', 'cook the egg', 'eat the egg']),
  Q(0, 'playtime', ['put on your coat', 'go out to play']),
  Q(0, 'morning', ['wake up', 'get dressed', 'eat breakfast']),
  Q(0, 'a banana', ['peel the banana', 'eat the banana']),
  Q(0, 'bath time', ['fill the tub', 'get in the bath', 'wash with soap']),
  Q(0, 'a seed', ['plant the seed', 'water it', 'watch it grow']),
  Q(0, 'bedtime', ['brush your teeth', 'climb into bed', 'go to sleep']),
  Q(0, 'catch', ['get the ball', 'throw the ball', 'catch the ball']),
  Q(0, 'a book', ['open the book', 'read the book', 'close the book']),
  Q(0, 'pyjamas', ['put on your pyjamas', 'climb into bed']),
  Q(0, 'the road', ['look both ways', 'cross the road']),
  Q(0, 'home', ['take off your shoes', 'put on slippers']),
  // ---- 1: daily routine
  Q(1, 'a school morning', ['wake up', 'get dressed', 'eat breakfast', 'go to school']),
  Q(1, 'leaving the house', ['eat breakfast', 'brush your teeth', 'put on your coat', 'walk to school']),
  Q(1, 'after school', ['come home', 'do your homework', 'eat dinner', 'go to bed']),
  Q(1, 'brushing teeth', ['put paste on the brush', 'brush your teeth', 'rinse your mouth', 'put the brush away']),
  Q(1, 'toast', ['toast the bread', 'spread the butter', 'add the jam', 'eat the toast']),
  Q(1, 'dinner', ['wash your hands', 'set the table', 'eat dinner', 'clear the table']),
  Q(1, 'bedtime', ['put on pyjamas', 'read a story', 'turn off the light', 'go to sleep']),
  Q(1, 'the start of class', ['line up', 'walk to the classroom', 'sit down', 'listen to the teacher']),
  Q(1, 'lunchtime', ['eat lunch', 'play outside', 'go back inside', 'read a book']),
  Q(1, 'a glass of water', ['get a cup', 'pour the water', 'drink the water', 'wash the cup']),
  Q(1, 'the bus', ['get dressed', 'eat breakfast', 'pack your bag', 'catch the bus']),
  Q(1, 'swimming', ['put on your swimsuit', 'jump in the pool', 'swim', 'dry off with a towel']),
  Q(1, 'tidying up', ['pick up the toys', 'put the toys in the box', 'close the lid', 'put the box away']),
  Q(1, 'washing up', ['scrape the plates', 'wash the dishes', 'dry the dishes', 'put them away']),
  Q(1, 'homework', ['take out your book', 'read the page', 'answer the questions', 'hand it in']),
  // ---- 2: life cycles
  Q(2, 'a butterfly', ['egg', 'caterpillar', 'chrysalis', 'butterfly']),
  Q(2, 'a flower', ['seed', 'sprout', 'small plant', 'flower']),
  Q(2, 'a frog', ['egg', 'tadpole', 'froglet', 'frog']),
  Q(2, 'a hen', ['egg', 'chick', 'hen']),
  Q(2, 'an oak tree', ['acorn', 'seedling', 'young tree', 'oak tree']),
  Q(2, 'a ladybug', ['egg', 'larva', 'pupa', 'ladybug']),
  Q(2, 'a person', ['baby', 'child', 'teenager', 'adult']),
  Q(2, 'a dog', ['puppy', 'young dog', 'adult dog']),
  Q(2, 'a grasshopper', ['egg', 'nymph', 'grasshopper']),
  Q(2, 'a turtle', ['egg', 'hatchling', 'young turtle', 'adult turtle']),
  Q(2, 'a sunflower', ['seed', 'seedling', 'bud', 'sunflower']),
  Q(2, 'a bean plant', ['bean seed', 'roots grow', 'shoot grows', 'leaves open']),
  Q(2, 'a duck', ['egg', 'duckling', 'duck']),
  Q(2, 'a bear', ['cub', 'young bear', 'adult bear']),
  Q(2, 'making seeds', ['a flower blooms', 'bees carry pollen', 'seeds form', 'seeds fall down'], 'How a plant makes seeds.'),
  Q(2, 'the water cycle', ['rain falls', 'water flows to rivers', 'rivers reach the sea', 'water evaporates'], 'The water cycle.'),
  // ---- 3: procedures
  Q(3, 'baking a cake', ['mix flour and eggs', 'pour into a tin', 'bake in the oven', 'let it cool', 'eat the cake']),
  Q(3, 'planting a seed', ['dig a hole', 'put in the seed', 'cover with soil', 'water it']),
  Q(3, 'a sandwich', ['get two slices of bread', 'spread the butter', 'add the cheese', 'cut it in half']),
  Q(3, 'a cup of tea', ['boil the water', 'put a tea bag in the cup', 'pour in the water', 'wait a minute', 'drink the tea']),
  Q(3, 'washing clothes', ['sort the clothes', 'put them in the machine', 'add the soap', 'start the machine', 'hang them up']),
  Q(3, 'a snowman', ['roll a big ball of snow', 'roll a smaller ball', 'stack them', 'add a face']),
  Q(3, 'posting a letter', ['write the letter', 'fold it', 'put it in the envelope', 'add a stamp', 'post it']),
  Q(3, 'painting', ['put on an apron', 'dip the brush', 'paint the picture', 'wash the brush', 'let it dry']),
  Q(3, 'a bike ride', ['put on your helmet', 'check the brakes', 'ride the bike', 'put the bike away']),
  Q(3, 'an experiment', ['ask a question', 'make a guess', 'do the test', 'write the result']),
  Q(3, 'popcorn', ['heat the pan', 'add the kernels', 'wait for the pops', 'pour into a bowl']),
  Q(3, 'washing hands', ['wet your hands', 'add soap', 'scrub for 20 seconds', 'rinse', 'dry']),
  Q(3, 'a jigsaw puzzle', ['tip out the pieces', 'find the edges', 'join the edges', 'fill the middle']),
  Q(3, 'the library', ['choose a book', 'take it to the desk', 'borrow it', 'read it', 'return it']),
  Q(3, 'a houseplant', ['check the soil', 'water the plant', 'put it in the light', 'wait for it to grow']),
  Q(3, 'pitching a tent', ['find flat ground', 'lay out the tent', 'push in the pegs', 'raise the poles']),
]

const F = (level: Grade, q: string, a: string, d: string[], hard = false): Fact => ({ level, q, a, d, hard })

/** Cause and effect (level 4). */
export const CAUSE_EFFECT: Fact[] = [
  F(4, 'Why did the ice cube melt?', 'it was left in the sun', ['it was in the freezer', 'someone looked at it', 'it was cold outside']),
  F(4, 'The plant on the windowsill died. What was the most likely cause?', 'nobody watered it', ['it had plenty of water', 'it was near the window', 'the pot was blue']),
  F(4, 'Why was the kitchen floor wet?', 'someone spilled water', ['the sun was shining', 'the door was locked', 'the radio was on']),
  F(4, 'The cookies burned. What caused it?', 'they baked too long', ['the oven was off', 'they were too cold', 'there was too much jam']),
  F(4, 'Why did the puddle disappear?', 'the sun dried it up', ['it rained more', 'it froze solid', 'a bird drank it']),
  F(4, 'Sam forgot his umbrella. What happened?', 'he got wet in the rain', ['he got sunburnt', 'he stayed dry', 'he found a coin']),
  F(4, 'The alarm clock did not ring. What most likely happened?', 'she woke up late', ['she woke up early', 'she ate breakfast', 'it snowed']),
  F(4, 'It snowed all night. What was the effect?', 'the roads were covered', ['the flowers bloomed', 'the pool was warm', 'the lake dried up']),
  F(4, 'The boy studied hard. What was the effect?', 'he did well on the test', ['he forgot everything', 'he lost his book', 'he missed the bus']),
  F(4, 'The bread went mouldy. Why?', 'it was left out too long', ['it was eaten', 'it was fresh', 'it was in the freezer']),
  F(4, 'Why did the balloon pop?', 'it touched a sharp pin', ['it was tied tight', 'it was red', 'it floated up']),
  F(4, 'Why did the milk go sour?', 'it was left out too long', ['it was cold', 'it was in a cup', 'it was white']),
  F(4, 'Why did the crops grow so well this year?', 'plenty of rain and sun', ['there was a drought', 'it was very dark', 'it snowed all summer']),
  F(4, 'The car stopped in the road. Why?', 'it ran out of fuel', ['the radio was on', 'it was painted blue', 'the driver was happy']),
  F(4, 'The tower of blocks fell over. Why?', 'it was too tall and wobbly', ['it was very short', 'it was made of blocks', 'it was red']),
  F(4, 'Why did the room get dark?', 'the sun set', ['the light was turned on', 'a cloud went away', 'it got warm']),
  F(4, 'The ice on the pond melted. What was the cause?', 'the weather got warmer', ['it snowed', 'the wind stopped', 'ducks swam on it']),
  F(4, 'The bike tyre went flat. What caused it?', 'it ran over a nail', ['it was brand new', 'it was pumped up', 'the bell rang']),
  F(4, 'Ana watered the seeds every day. What was the effect?', 'they sprouted', ['they froze', 'they vanished', 'they turned to stone']),
  F(4, 'Why did the paper turn yellow and crinkly?', 'it was left in the sun', ['it was in a drawer', 'it was brand new', 'someone wrote on it'], true),
]

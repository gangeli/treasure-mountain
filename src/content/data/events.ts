import type { Grade } from '../types'
import type { Fact } from '../generators/thinkingUtil'

/**
 * An ordered sequence of events. Level 0 everyday K steps, 1 daily routine, 2 life cycles,
 * 3 procedures.
 *
 * `steps` is the canonical order. `alts` lists *other orders a careful adult would also accept* --
 * they exist so the generator can refuse to ask a question whose answer differs between accepted
 * orders (and so no decoy is ever a defensible answer). Keep `alts` honest: if a real household
 * could do two steps the other way round, say so here instead of quietly asserting one order.
 *
 * `cyclic` marks a loop (the water cycle) where "first" and "last" are meaningless; only
 * next/before questions are asked.
 */
export interface Sequence {
  level: Grade
  topic: string
  steps: string[]
  /** Heading used when "The life cycle of <topic>" reads badly. */
  title?: string
  /** Overrides the default skill tag for this scenario. */
  skill?: string
  /** Other defensible orderings of the same steps (each a permutation of `steps`). */
  alts?: string[][]
  /** True for a loop with no first or last stage. */
  cyclic?: boolean
}

const Q = (level: Grade, topic: string, steps: string[], extra: Partial<Sequence> = {}): Sequence => ({ level, topic, steps, ...extra })

export const SEQUENCES: Sequence[] = [
  // ---- K, short (3 steps): the whole list is shown, the child puts first/last in place.
  Q(0, 'getting dressed', ['put on socks', 'put on shoes', 'tie your laces']),
  Q(0, 'lunch', ['open your lunchbox', 'eat your lunch', 'close the lunchbox']),
  Q(0, 'going out', ['open the door', 'walk outside', 'close the door']),
  Q(0, 'a drink', ['get a cup', 'pour the milk', 'drink the milk']),
  Q(0, 'an egg', ['crack the egg', 'cook the egg', 'eat the egg']),
  Q(0, 'playtime', ['put on your coat', 'open the door', 'go out to play']),
  Q(0, 'a banana', ['pick up the banana', 'peel the banana', 'eat the banana']),
  Q(0, 'a seed', ['plant the seed', 'water the seed', 'watch it grow']),
  Q(0, 'bedtime', ['brush your teeth', 'climb into bed', 'go to sleep']),
  Q(0, 'catch', ['find a ball', 'throw the ball', 'catch the ball']),
  Q(0, 'a book', ['open the book', 'read the book', 'close the book']),
  Q(0, 'pajamas', ['take off your shoes', 'put on your pajamas', 'climb into bed']),
  Q(0, 'the road', ['stop at the curb', 'look both ways', 'cross the road']),
  Q(0, 'a snack', ['wash your hands', 'get an apple', 'eat the apple']),
  Q(0, 'a drawing', ['get a crayon', 'draw a picture', 'show your teacher']),
  Q(0, 'a balloon', ['blow up the balloon', 'tie a knot', 'let it float']),
  Q(0, 'a puddle', ['put on your boots', 'jump in the puddle', 'wipe your feet']),
  // ---- K, long (4 steps): used only at K tier 3.
  Q(0, 'bath time', ['fill the tub', 'get in the tub', 'wash with soap', 'get out and dry']),
  Q(0, 'morning', ['wake up', 'get out of bed', 'get dressed', 'go downstairs']),
  Q(0, 'making toast', ['get the bread', 'put it in the toaster', 'wait for the pop', 'spread the butter']),
  Q(0, 'a sandcastle', ['fill the bucket', 'pat down the sand', 'turn it over', 'lift the bucket']),
  Q(0, 'a snowball', ['put on your gloves', 'scoop up the snow', 'pat it into a ball', 'throw the snowball']),
  Q(0, 'a painting', ['get some paper', 'dip the brush', 'paint a picture', 'hang it up']),
  Q(0, 'a bike', ['put on your helmet', 'get on the bike', 'pedal along', 'get off the bike']),
  Q(0, 'washing your face', ['turn on the tap', 'wet the cloth', 'wash your face', 'dry your face']),
  Q(0, 'feeding a cat', ['open the cat food', 'fill the bowl', 'call the cat', 'watch her eat']),
  Q(0, 'story time', ['pick a book', 'sit on the rug', 'listen to the story', 'clap your hands']),
  // ---- 1: daily routines. Each chain is pinned: no step is defensible in two places.
  Q(1, 'a school morning', ['wake up', 'get out of bed', 'eat breakfast', 'go to school']),
  Q(1, 'leaving the house', ['find your shoes', 'put on your shoes', 'open the front door', 'walk to school']),
  Q(1, 'after school', ['walk home', 'open the front door', 'hang up your coat', 'have a snack']),
  Q(1, 'brushing teeth', ['put paste on the brush', 'brush your teeth', 'rinse your mouth', 'put the brush away']),
  Q(1, 'toast', ['get out the bread', 'toast the bread', 'spread the butter', 'eat the toast']),
  Q(1, 'dinner', ['set the table', 'serve the food', 'eat dinner', 'clear the table']),
  Q(1, 'bedtime', ['put on pajamas', 'read a story', 'turn off the light', 'go to sleep']),
  Q(1, 'the start of class', ['walk to the classroom', 'put your bag away', 'sit down', 'listen to the teacher']),
  Q(1, 'lunchtime', ['line up for lunch', 'open your lunchbox', 'eat your lunch', 'play outside']),
  Q(1, 'a glass of water', ['get a cup', 'turn on the tap', 'fill the cup', 'drink the water']),
  Q(1, 'the bus', ['pack your bag', 'put on your coat', 'walk to the bus stop', 'catch the bus']),
  Q(1, 'swimming', ['put on your swimsuit', 'jump in the pool', 'swim a lap', 'dry off with a towel']),
  Q(1, 'tidying up', ['pick up the toys', 'put the toys in the box', 'close the lid', 'put the box away']),
  Q(1, 'washing up', ['scrape the plates', 'wash the dishes', 'dry the dishes', 'put them away']),
  Q(1, 'homework', ['take out your book', 'read the page', 'answer the questions', 'hand it in']),
  Q(1, 'the school bell', ['line up in the yard', 'walk in a line', 'go into class', 'sit at your desk']),
  Q(1, 'a haircut', ['sit in the chair', 'get your hair cut', 'look in the mirror', 'pay at the desk']),
  Q(1, 'a birthday cake', ['light the candles', 'sing happy birthday', 'blow out the candles', 'eat the cake']),
  // Dressing and breakfast really do happen in either order, so only first/last can be asked here.
  Q(1, 'getting ready', ['wake up', 'get dressed', 'eat breakfast', 'leave the house'],
    { alts: [['wake up', 'eat breakfast', 'get dressed', 'leave the house']] }),
  // ---- 2: life cycles
  Q(2, 'a butterfly', ['egg', 'caterpillar', 'chrysalis', 'butterfly']),
  Q(2, 'a moth', ['egg', 'caterpillar', 'cocoon', 'moth']),
  Q(2, 'a flower', ['seed', 'sprout', 'small plant', 'flower']),
  Q(2, 'a frog', ['egg', 'tadpole', 'froglet', 'frog']),
  Q(2, 'a hen', ['egg', 'chick', 'young hen', 'hen']),
  Q(2, 'an oak tree', ['acorn', 'seedling', 'young tree', 'oak tree']),
  Q(2, 'an apple tree', ['apple seed', 'seedling', 'young tree', 'apple tree']),
  Q(2, 'a ladybug', ['egg', 'larva', 'pupa', 'ladybug']),
  Q(2, 'a mosquito', ['egg', 'wriggler', 'pupa', 'mosquito']),
  Q(2, 'a person', ['baby', 'child', 'teenager', 'adult']),
  Q(2, 'a turtle', ['egg', 'hatchling', 'young turtle', 'adult turtle']),
  Q(2, 'a sunflower', ['seed', 'seedling', 'bud', 'sunflower']),
  Q(2, 'a pea plant', ['pea seed', 'seedling', 'vine with flowers', 'pea pods']),
  Q(2, 'a dog', ['puppy', 'young dog', 'adult dog']),
  Q(2, 'a cat', ['kitten', 'young cat', 'adult cat']),
  Q(2, 'a grasshopper', ['egg', 'nymph', 'grasshopper']),
  Q(2, 'a duck', ['egg', 'duckling', 'duck']),
  Q(2, 'a bear', ['cub', 'young bear', 'adult bear']),
  Q(2, 'making seeds', ['a flower blooms', 'bees carry pollen', 'seeds form', 'seeds fall down'],
    { title: 'How a plant makes seeds.', skill: 'science: how plants grow' }),
  // Germination, not a whole life cycle -- titled and tagged as such.
  Q(2, 'a bean seed', ['bean seed', 'roots grow', 'shoot grows', 'leaves open'],
    { title: 'How a bean seed grows.', skill: 'science: how plants grow' }),
  // ---- 3: procedures (5 steps, so all four choices come from the same procedure)
  Q(3, 'baking a cake', ['mix flour and eggs', 'pour into a tin', 'bake in the oven', 'let it cool', 'eat the cake']),
  Q(3, 'planting a seed', ['dig a hole', 'put in the seed', 'cover with soil', 'water it', 'wait for a sprout']),
  Q(3, 'a sandwich', ['get two slices of bread', 'spread the butter', 'add the cheese', 'put the slices together', 'cut it in half']),
  Q(3, 'a cup of tea', ['fill the kettle', 'boil the water', 'pour it on the tea bag', 'wait a minute', 'drink the tea']),
  Q(3, 'washing clothes', ['sort the clothes', 'put them in the machine', 'close the door', 'start the machine', 'hang them up']),
  Q(3, 'a snowman', ['pack the snow', 'roll a big ball', 'roll a smaller ball', 'stack them', 'add a face']),
  Q(3, 'mailing a letter', ['write the letter', 'fold it', 'put it in an envelope', 'seal the envelope', 'mail it']),
  Q(3, 'a bike ride', ['unlock the bike', 'put on your helmet', 'ride the bike', 'park the bike', 'lock the bike']),
  Q(3, 'an experiment', ['ask a question', 'make a guess', 'do the test', 'write the result', 'tell the class']),
  Q(3, 'popcorn', ['heat the pan', 'add the kernels', 'put on the lid', 'wait for the pops', 'pour into a bowl']),
  Q(3, 'washing hands', ['wet your hands', 'add soap', 'scrub for 20 seconds', 'rinse your hands', 'dry your hands']),
  Q(3, 'a jigsaw puzzle', ['tip out the pieces', 'turn them face up', 'find the edges', 'join the edges', 'fill the middle']),
  Q(3, 'the library', ['choose a book', 'take it to the desk', 'borrow it', 'read it', 'return it']),
  Q(3, 'repotting a plant', ['fill a pot with soil', 'make a hole in the soil', 'put the plant in', 'press the soil down', 'water it']),
  // Poles and pegs genuinely go either way round; apron and paints likewise.
  Q(3, 'pitching a tent', ['find flat ground', 'lay out the tent', 'raise the poles', 'push in the pegs', 'get inside'],
    { alts: [['find flat ground', 'lay out the tent', 'push in the pegs', 'raise the poles', 'get inside']] }),
  Q(3, 'painting', ['put on an apron', 'open the paints', 'dip the brush', 'paint the picture', 'wash the brush'],
    { alts: [['open the paints', 'put on an apron', 'dip the brush', 'paint the picture', 'wash the brush']] }),
  Q(3, 'the water cycle', ['the sun warms the sea', 'water rises as vapor', 'clouds form', 'rain falls', 'rivers run to the sea'],
    { title: 'The water cycle.', skill: 'science: the water cycle', cyclic: true }),
]

const F = (q: string, a: string, d: string[], hard = false): Fact => ({ level: 4, q, a, d, hard })

/**
 * Cause and effect (grade 4). Three disjoint bands, one per tier, so no item can show up at two
 * tiers of the same grade. Every item must have exactly one plausible cause or effect: the decoys
 * are things that either could not produce the result or point the other way.
 */

/** Tier 1: one obvious physical cause. */
export const CAUSE_SIMPLE: Fact[] = [
  F('Why did the ice cube melt?', 'it was left in the sun', ['it was in the freezer', 'it was cold outside', 'someone looked at it']),
  F('Why was the kitchen floor wet?', 'someone spilled water', ['the sun was shining', 'the door was locked', 'the radio was on']),
  F('Why did the balloon pop?', 'it touched a sharp pin', ['it was tied tight', 'it was bright red', 'someone let go of it']),
  F('It snowed all night. What happened?', 'the roads turned white', ['the flowers bloomed', 'the pool got warm', 'the lake dried up']),
  F('Why did the room get dark?', 'the sun went down', ['a light was turned on', 'a cloud moved away', 'the window opened']),
  F('Sam forgot his umbrella. What happened?', 'he got wet in the rain', ['he got sunburned', 'he stayed dry', 'he found a coin']),
  F('The cookies burned. What caused it?', 'they baked too long', ['the oven was off', 'they were too cold', 'there was too much jam']),
  F('Why did the puddle dry up?', 'the sun warmed it', ['it rained even more', 'it froze solid', 'a bird landed in it']),
  F('Ana watered the seeds every day. What happened?', 'they sprouted', ['they froze', 'they vanished', 'they turned to stone']),
  F('Why did the ice on the pond melt?', 'the weather got warmer', ['it snowed hard', 'the wind stopped', 'ducks swam past']),
  F('The bike tire went flat. What caused it?', 'it rolled over a nail', ['it was brand new', 'it was pumped up', 'the bell rang']),
  F('Why did the milk go sour?', 'it sat out for days', ['it was kept cold', 'it was in a cup', 'it was white']),
  F('Why did the candle go out?', 'the wind blew on it', ['it was just lit', 'the room was still', 'it was made of wax']),
  F('Leo dropped the glass. What happened?', 'it broke on the floor', ['it filled with milk', 'it grew taller', 'it floated away']),
]

/** Tier 2: the cause takes one step of inference. */
export const CAUSE_MEDIUM: Fact[] = [
  F('The plant on the sill drooped. Why?', 'nobody watered it', ['it got water each day', 'it stood in the light', 'the pot was blue']),
  F('The alarm clock did not ring. What happened?', 'she woke up late', ['she woke up early', 'she ate breakfast', 'it snowed outside']),
  F('The bread went moldy. Why?', 'it sat out for weeks', ['it was eaten fast', 'it was baked today', 'it was kept frozen']),
  F('Why did the crops grow well this year?', 'there was rain and sun', ['there was a drought', 'the fields stayed dark', 'it snowed all summer']),
  F('The car stopped on the road. Why?', 'it ran out of gas', ['the radio was on', 'it was painted blue', 'the driver was happy']),
  F('The block tower fell over. Why?', 'it was tall and wobbly', ['it was two blocks high', 'it stood on flat ground', 'the blocks were red']),
  F('The boy studied every night. What happened?', 'he did well on the test', ['he forgot everything', 'he lost his book', 'he missed the bus']),
  F('Why did the beach sand feel so hot?', 'the sun beat down on it', ['a cloud covered it', 'it rained all day', 'the wind was cold']),
  F('The lights went out in the storm. Why?', 'a power line came down', ['the sun came out', 'a door was opened', 'the rain was warm']),
  F('Why did the paint stay wet so long?', 'the air was very damp', ['the sun was hot', 'a fan blew on it', 'the paint was thin']),
  F('The snowman shrank by noon. Why?', 'the day warmed up', ['more snow fell', 'the wind was icy', 'it was still night']),
  F('Why were there no birds at the feeder?', 'the feeder was empty', ['it was full of seed', 'the day was calm', 'the feeder was new']),
  F('The library book was late. What happened?', 'she paid a small fine', ['she got a free book', 'the library closed', 'the book grew longer']),
  F('Why did the room fill with smoke?', 'the toast burned', ['the window was open', 'the fan was on', 'the bread was fresh']),
]

/** Tier 3: the cause needs a rule the child has learned, not just a memory. */
export const CAUSE_HARD: Fact[] = [
  F('Why do the rocks on the shore feel smooth?', 'waves wore them down', ['the tide never moves', 'someone painted them', 'fish polished them']),
  F('Why did the paper turn yellow and stiff?', 'it sat in the sunlight', ['it stayed in a drawer', 'it was made today', 'someone wrote on it']),
  F('The fish in the pond died in summer. Why?', 'the water got too warm', ['the pond was shaded', 'it rained often', 'the fish were fed']),
  F('Why did the metal bridge creak in the heat?', 'the metal expanded', ['the metal shrank', 'the air got colder', 'the paint dried']),
  F('The seedlings grew tall and pale. Why?', 'they had too little light', ['they had too much light', 'the soil was rich', 'the pot was large']),
  F('Why did the lake drop all summer?', 'more water evaporated', ['it rained every day', 'the lake froze over', 'a river flowed in']),
  F('Why did the iron gate turn orange?', 'rain made it rust', ['it was painted orange', 'the sun bleached it', 'it was made of gold']),
  F('The town flooded after the rain. Why?', 'the drains were blocked', ['the drains were clear', 'the rain was light', 'the river was low']),
  F('Why did the bread dough rise in the bowl?', 'the yeast made gas', ['the flour was cold', 'the bowl was small', 'the oven was off']),
  F('Why did the air on the peak feel thin?', 'the peak was very high', ['the peak was low', 'the day was warm', 'the wind had stopped']),
  F('Why did the sea ice break up early?', 'the winter stayed mild', ['the winter was harsh', 'much more snow fell', 'the sun never rose']),
  F('Soup cools fast in a wide flat bowl. Why?', 'more of it meets the air', ['the bowl holds the heat', 'the soup is boiling', 'the room is hot']),
  F('Why did the cold glass get wet outside?', 'damp air cooled on it', ['the glass was empty', 'water soaked through', 'someone spilled it']),
  F('Why did the echo come back so late?', 'the cliff was far away', ['the cliff was close', 'the shout was quiet', 'the air was still']),
]

/** All grade-4 cause-and-effect items (the three tier bands together). */
export const CAUSE_EFFECT: Fact[] = [...CAUSE_SIMPLE, ...CAUSE_MEDIUM, ...CAUSE_HARD]

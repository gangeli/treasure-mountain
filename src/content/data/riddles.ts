import type { Grade } from '../types'

/**
 * A "what am I?" riddle. `level` is the grade it is written for (0 = K). `lines` are the clue lines.
 * `band` is the difficulty band inside the level (1 easiest ... 3 hardest): tier 1, tier 2 and tier 3
 * of a grade draw disjoint bands, so a riddle never turns up at two tiers of the same grade.
 */
export interface RiddleEntry { level: Grade; band: 1 | 2 | 3; lines: string[]; a: string; d: string[]; verse?: boolean }

const R = (level: Grade, band: 1 | 2 | 3, lines: string[], a: string, d: string[], verse = level <= 2): RiddleEntry =>
  ({ level, band, lines, a, d, verse })

/**
 * Rules the reviewers asked for, kept in the data:
 *  - exactly one choice may fit every clue (the bus riddle names the street, so a plane cannot fit);
 *  - a decoy is never a second right answer ("a bed"/"a bath" are gone from the trouble riddle);
 *  - at least one decoy copies the answer's surface form, so a bare noun answer is never the only
 *    choice without "a/an/the/your";
 *  - no two riddles that share an answer can land in the same grade and tier (see the band notes).
 */
export const RIDDLES: RiddleEntry[] = [
  // ---- K band 1: one animal or object, two short clues, in verse.
  R(0, 1, ['I am yellow and bright.', 'I shine in the sky all day.'], 'the sun', ['the moon', 'a cloud', 'a lamp']),
  R(0, 1, ['I have four legs and a tail.', 'I say woof, woof!'], 'a dog', ['a cat', 'a cow', 'a duck']),
  R(0, 1, ['I am round.', 'You can kick me or throw me.'], 'a ball', ['a block', 'a cup', 'a hat']),
  R(0, 1, ['I am red and crunchy.', 'I grow on a tree.'], 'an apple', ['a banana', 'a carrot', 'a lemon']),
  R(0, 1, ['I say moo.', 'I give you milk to drink.'], 'a cow', ['a pig', 'a hen', 'a duck']),
  R(0, 1, ['I have feathers and wings.', 'I lay eggs and say cluck!'], 'a hen', ['a cat', 'a cow', 'a frog']),
  R(0, 1, ['You wear me on your feet', 'To keep them warm and dry.'], 'socks', ['gloves', 'a hat', 'a coat']),
  R(0, 1, ['I am long and yellow.', 'A monkey likes to peel me.'], 'a banana', ['an apple', 'a pear', 'a plum']),
  R(0, 1, ['I am green.', 'I hop and say ribbit!'], 'a frog', ['a fish', 'a duck', 'a pig']),
  R(0, 1, ['I have two wheels.', 'You pedal to make me go.'], 'a bike', ['a car', 'a bus', 'a boat']),
  R(0, 1, ['I have a very long neck.', 'I eat leaves from tall trees.'], 'a giraffe', ['a cat', 'a horse', 'a pig']),
  R(0, 1, ['I have big ears and a trunk.', 'I am very, very big.'], 'an elephant', ['a horse', 'a mouse', 'a butterfly']),
  R(0, 1, ['I have a long thin tail.', 'I squeak and I nibble cheese.'], 'a mouse', ['a dog', 'a cow', 'a duck']),
  R(0, 1, ['I am a huge gray animal.', 'I live in the sea and spout water.'], 'a whale', ['a cat', 'a bird', 'a bee']),
  // ---- K band 2: three clues, or a clue that needs a little thought.
  R(0, 2, ['I am white and fluffy.', 'I float up in the sky.', 'Rain falls out of me.'], 'a cloud', ['the sun', 'a sheep', 'a pillow']),
  R(0, 2, ['I am hot and bright.', 'I sit on a birthday cake.'], 'a candle', ['a cup', 'a spoon', 'a plate']),
  R(0, 2, ['I am orange and long.', 'I grow under the ground.', 'Bunnies love to eat me!'], 'a carrot', ['an apple', 'a pea', 'a grape']),
  R(0, 2, ['I am cold and white.', 'I fall from the sky in winter.', 'You can build a snowman with me.'], 'snow', ['rain', 'sun', 'mud']),
  R(0, 2, ['I have a hard shell.', 'I walk very, very slowly.'], 'a turtle', ['a rabbit', 'a fish', 'a bird']),
  R(0, 2, ['I fly up high on a string', 'When the wind blows.'], 'a kite', ['a ball', 'a hat', 'a boat']),
  R(0, 2, ['I have black and white stripes.', 'I look a bit like a horse.'], 'a zebra', ['a lion', 'a bear', 'a dog']),
  R(0, 2, ['You sleep on me at night.', 'I have a soft pillow.'], 'a bed', ['a chair', 'a desk', 'a tub']),
  R(0, 2, ['I shine at night.', 'Sometimes I look round.', 'Sometimes I look thin.'], 'the moon', ['the sun', 'a kite', 'a star']),
  R(0, 2, ['I am a big yellow fruit.', 'I taste very sour!'], 'a lemon', ['an apple', 'a banana', 'a grape']),
  R(0, 2, ['You put me on your head.', 'I keep your ears warm.'], 'a hat', ['a shoe', 'a cup', 'a sock']),
  R(0, 2, ['I have two wings and I sing.', 'I build a nest in a tree.'], 'a bird', ['a cat', 'a fish', 'a dog']),
  R(0, 2, ['I am sweet and sticky.', 'Bees make me in their hive.'], 'honey', ['milk', 'water', 'soup']),
  R(0, 2, ['I have a spout and a handle.', 'You water the garden with me.'], 'a watering can', ['a drinking cup', 'a rubber rain boot', 'a summer sun hat']),
  // ---- K band 3: three clues, or a part-and-use clue pair.
  R(0, 3, ['I am round with bumpy skin.', 'You peel me and eat my segments.'], 'an orange', ['a banana', 'a carrot', 'an apple']),
  R(0, 3, ['I have a handle but no legs.', 'You drink warm cocoa from me.'], 'a mug', ['a plate', 'a fork', 'a shoe']),
  R(0, 3, ['I am soft and squishy.', 'You rest your head on me at night.'], 'a pillow', ['a chair', 'a spoon', 'a boot']),
  R(0, 3, ['I have laces and a sole.', 'You wear me outside on your foot.'], 'a shoe', ['a hat', 'a glove', 'a mitten']),
  R(0, 3, ['I am full of water and glass.', 'Fish swim round and round in me.'], 'a fish tank', ['a bird cage', 'a lunch box', 'a dog bed']),
  R(0, 3, ['I am little and I have six legs.', 'I carry crumbs back to my nest.'], 'an ant', ['a bird', 'a cat', 'a fish']),
  R(0, 3, ['I am thin and green.', 'I grow all over the ground.', 'Cows like to eat me.'], 'grass', ['sand', 'a rock', 'a shoe']),
  // ---- Grade 1 band 1: concrete things named from two plain clues.
  R(1, 1, ['I have a tail and fins.', 'I live in water and swim.'], 'a fish', ['a frog', 'a duck', 'a crab']),
  R(1, 1, ['I have a roof and a door.', 'A family lives in me.'], 'a house', ['a car', 'a shed', 'a bus']),
  R(1, 1, ['I have petals and a stem.', 'Bees like to visit me.'], 'a flower', ['a tree', 'a rock', 'grass']),
  R(1, 1, ['I have four legs but cannot walk.', 'You sit on me.'], 'a chair', ['a rug', 'a lamp', 'a door']),
  R(1, 1, ['I light up the room', 'When you flip a switch.'], 'a lamp', ['a fan', 'a clock', 'a radio']),
  R(1, 1, ['I have a hood and long sleeves.', 'I keep you warm outside.'], 'a coat', ['socks', 'shorts', 'a hat']),
  R(1, 1, ['I have a long tail and whiskers.', 'I purr and say meow.'], 'a cat', ['a dog', 'a cow', 'a mouse']),
  // ---- Grade 1 band 2: a part-name clue plus a use clue.
  R(1, 2, ['I have numbers and two hands.', 'I tell you the time.'], 'a clock', ['a calendar', 'a ruler', 'a book']),
  R(1, 2, ['I have many seats and wheels.', 'I stop on your street.', 'I carry lots of people.'], 'a bus', ['a bike', 'a boat', 'a truck']),
  R(1, 2, ['I have a trunk but I am not an elephant.', 'I have leaves and branches.'], 'a tree', ['a flower', 'a bush', 'grass']),
  R(1, 2, ['I am sweet and cold.', 'You eat me from a cone.'], 'ice cream', ['hot soup', 'birthday cake', 'toast']),
  R(1, 2, ['I have teeth but I never bite.', 'I fix your hair.'], 'a comb', ['soap', 'a towel', 'a hat']),
  R(1, 2, ['I am the room where you cook.', 'I have a stove and a sink.'], 'a kitchen', ['a bedroom', 'a garage', 'a bathroom']),
  R(1, 2, ['You put me on to see better.', 'I sit on your nose.'], 'glasses', ['gloves', 'a scarf', 'a hat']),
  R(1, 2, ['I am full of pages and words.', 'You open me to read.'], 'a book', ['a pen', 'a desk', 'a box']),
  // ---- Grade 1 band 3: two clues that must be combined.
  R(1, 3, ['I have black and white keys.', 'You play me to make music.'], 'a piano', ['a drum', 'a flute', 'a guitar']),
  R(1, 3, ['I have six strings.', 'You strum me to make music.'], 'a guitar', ['a drum', 'a piano', 'a horn']),
  R(1, 3, ['I am big and cold inside.', 'I keep your food fresh.'], 'a fridge', ['an oven', 'a sink', 'a cupboard']),
  R(1, 3, ['I fall from clouds.', 'I make puddles on the ground.'], 'rain', ['wind', 'sun', 'fog']),
  R(1, 3, ['I have a point and I write.', 'You can rub out my marks.'], 'a pencil', ['a pen', 'a marker', 'a crayon']),
  R(1, 3, ['I hoot at night.', 'I have big round eyes.'], 'an owl', ['a hen', 'a duck', 'a crow']),
  R(1, 3, ['I am yellow and I buzz.', 'I make sweet honey.'], 'a bee', ['a fly', 'an ant', 'a moth']),
  // ---- Grade 2 band 1: one body-part word used the odd way.
  R(2, 1, ['I have a neck but no head.', 'You can fill me up with juice.'], 'a bottle', ['a cup', 'a spoon', 'a bowl']),
  R(2, 1, ['I have a tongue but I cannot talk.', 'You tie me up every morning.'], 'a shoe', ['a sock', 'a glove', 'a hat']),
  R(2, 1, ['I have a head and a tail', 'But I have no body at all.'], 'a coin', ['a kite', 'a snake', 'a dog']),
  R(2, 1, ['I have an eye but cannot see.', 'I help you sew.'], 'a needle', ['a button', 'a thread', 'a pin']),
  R(2, 1, ['I have a thumb and four fingers', 'But I am not alive.'], 'a glove', ['a hand', 'a sock', 'a mitten']),
  R(2, 1, ['I have a cap but no head.', 'I grow in damp, dark places.'], 'a mushroom', ['a hat', 'a tree', 'a flower']),
  R(2, 1, ['I have a trunk, tusks and big ears.'], 'an elephant', ['a rhino', 'a hippo', 'a giraffe']),
  // ---- Grade 2 band 2: two or three body-part words that must all fit.
  R(2, 2, ['I have hands but no arms', 'And a face but no eyes.'], 'a clock', ['a doll', 'a mirror', 'a book']),
  R(2, 2, ['I have many teeth but I never eat.', 'I pull two sides together.'], 'a zipper', ['a comb', 'a button', 'a belt']),
  R(2, 2, ['I have four legs but cannot walk.', 'You eat your dinner on me.'], 'a table', ['a ladder', 'a wagon', 'a bed']),
  R(2, 2, ['I have a bed but never sleep.', 'I have a mouth but never eat.', 'I run but never walk.'], 'a river', ['a pillow', 'a lion', 'a road']),
  R(2, 2, ['The more I dry,', 'The wetter I get.'], 'a towel', ['soap', 'an umbrella', 'a hat']),
  R(2, 2, ['I carry my home on my back', 'And leave a slimy trail.'], 'a snail', ['a turtle', 'a worm', 'a beetle']),
  R(2, 2, ['I have a spine but no bones.', 'I am full of stories.'], 'a book', ['a fish', 'a cat', 'a ladder']),
  R(2, 2, ['I have a neck but no head', 'And arms but no hands.'], 'a shirt', ['a giraffe', 'a bottle', 'a snake']),
  // ---- Grade 2 band 3: the clue contradicts itself until you find the trick.
  R(2, 3, ['I go up and down', 'But I never move.'], 'stairs', ['ladders', 'a slide', 'a swing']),
  R(2, 3, ['I fly all day on my pole', 'But I never go anywhere.'], 'a flag', ['a bird', 'a plane', 'a bee']),
  R(2, 3, ['I have scales and a forked tongue', 'But no legs at all.'], 'a snake', ['a lizard', 'a fish', 'a frog']),
  R(2, 3, ['I am full of holes', 'But I still hold water.'], 'a sponge', ['a bucket', 'a net', 'a cup']),
  R(2, 3, ['I have ears but I cannot hear.', 'I grow tall in a field.'], 'corn', ['grass', 'a mouse', 'a radio']),
  R(2, 3, ['I have a lid and a handle.', 'I whistle when the water boils.'], 'a kettle', ['a cup', 'a plate', 'a spoon']),
  R(2, 3, ['I have four wheels and a box.', 'You pull me along by my handle.', 'Toys ride inside me.'], 'a wagon', ['a bike', 'a boat', 'a kite']),
  // ---- Grade 3 band 1: one-line wordplay questions.
  R(3, 1, ['What can you catch but never throw?'], 'a cold', ['a ball', 'a fish', 'a frisbee']),
  R(3, 1, ['What gets bigger the more you take away?'], 'a hole', ['a cake', 'a pile', 'a rope']),
  R(3, 1, ['What goes up when the rain comes down?'], 'an umbrella', ['a rain puddle', 'a rubber boot', 'a storm cloud']),
  R(3, 1, ['What has to be broken before you use it?'], 'an egg', ['a cup', 'a toy', 'a plate']),
  R(3, 1, ['What has bark but never bites?'], 'a tree', ['a dog', 'a seal', 'a fox']),
  R(3, 1, ['What runs all around a garden', 'but never moves?'], 'a fence', ['a dog', 'a hose', 'a mower']),
  R(3, 1, ['What kind of nut has no shell?'], 'a doughnut', ['a walnut', 'a peanut', 'an acorn']),
  // ---- Grade 3 band 2: a word with two meanings, or a small hidden trick.
  R(3, 2, ['What can travel around the world', 'while staying in a corner?'], 'a stamp', ['a ship', 'a globe', 'a plane']),
  R(3, 2, ['What kind of band never plays music?'], 'a rubber band', ['a rock band', 'a marching band', 'a jazz band']),
  R(3, 2, ['What can fill a whole room', 'but takes up no space?'], 'light', ['smoke', 'water', 'sand']),
  R(3, 2, ['What has one head, one foot', 'and four legs?'], 'a bed', ['a horse', 'a chair', 'a duck']),
  R(3, 2, ['What is easy to get into', 'but hard to get out of?'], 'trouble', ['a car', 'a coat', 'water']),
  R(3, 2, ['What kind of tree can you carry', 'in your hand?'], 'a palm', ['an oak', 'a pine', 'a maple']),
  R(3, 2, ['What building has the most stories?'], 'a library', ['a barn', 'a garage', 'a shed']),
  R(3, 2, ['What kind of room has no doors', 'or windows?'], 'a mushroom', ['a bedroom', 'a kitchen', 'a closet']),
  // ---- Grade 3 band 3: several clues, all of which must fit.
  R(3, 3, ['I have cities but no houses,', 'forests but no trees,', 'and rivers but no water.'], 'a map', ['a photo', 'a poster', 'a story']),
  R(3, 3, ['What has words but never speaks?'], 'a book', ['a radio', 'a parrot', 'a teacher']),
  R(3, 3, ['What has one foot but no legs', 'and carries its house around?'], 'a snail', ['a turtle', 'a crab', 'a worm']),
  R(3, 3, ['What can you break', 'without touching it?'], 'a promise', ['a plate', 'a pencil', 'a crayon']),
  R(3, 3, ['What starts with T, ends with T', 'and has T in it?'], 'a teapot', ['a tent', 'toast', 'a ticket']),
  R(3, 3, ['What comes down but never goes up?'], 'rain', ['smoke', 'a balloon', 'a kite']),
  R(3, 3, ['What can you serve', 'but never eat?'], 'a tennis ball', ['a birthday cake', 'a hot dinner', 'an apple pie']),
  // ---- Grade 4 band 1: a single pun, stated plainly.
  R(4, 1, ['What has keys but cannot open', 'a single lock?'], 'a piano', ['a safe', 'a car', 'a drum']),
  R(4, 1, ['What has a bottom at the top?'], 'your legs', ['a tall hat', 'a steep hill', 'a rowing boat']),
  R(4, 1, ['What word is spelled wrong', 'in every dictionary?'], 'wrong', ['every', 'spelled', 'word']),
  R(4, 1, ['What kind of cup cannot hold water?'], 'a cupcake', ['a teacup', 'a paper cup', 'a mug']),
  R(4, 1, ['What goes through towns and fields', 'but never moves?'], 'a road', ['a train', 'a cloud', 'a horse']),
  R(4, 1, ['What has many needles', 'but never sews?'], 'a pine tree', ['a tailor', 'a doctor', 'a haystack']),
  R(4, 1, ['What has lots of eyes', 'but cannot see?'], 'a potato', ['a needle', 'a spider', 'a fly']),
  // ---- Grade 4 band 2: the pun sits in a phrase, not a single word.
  R(4, 2, ['What kind of coat is best put on wet?'], 'a coat of paint', ['a raincoat', 'a fur coat', 'a winter coat']),
  R(4, 2, ['What word becomes shorter', 'when you add two letters to it?'], 'short', ['long', 'small', 'tiny']),
  R(4, 2, ['What can you keep', 'after giving it to someone?'], 'your word', ['a birthday gift', 'a gold coin', 'a library book']),
  R(4, 2, ['The more you take,', 'the more you leave behind.', 'What are they?'], 'footsteps', ['coins', 'cookies', 'breaths']),
  R(4, 2, ['What belongs to you,', 'but other people use it more?'], 'your name', ['your bike', 'your book', 'your desk']),
  R(4, 2, ['What is always coming', 'but never arrives?'], 'tomorrow', ['the bus', 'the mail', 'winter']),
  R(4, 2, ['What can go up a chimney down', 'but not down a chimney up?'], 'an umbrella', ['a puff of smoke', 'a paper kite', 'a witch\'s broom']),
  R(4, 2, ['What is at the end of a rainbow?'], 'the letter W', ['the letter R', 'the letter O', 'the letter B']),
  // ---- Grade 4 band 3: metaphor riddles and letter puzzles.
  R(4, 3, ['What comes once in a minute,', 'twice in a moment,', 'but never in a thousand years?'], 'the letter M', ['the letter T', 'the letter E', 'the letter N']),
  R(4, 3, ['I am not alive, but I grow.', 'I have no lungs, but I need air.', 'I have no mouth, but water kills me.'], 'fire', ['smoke', 'a rock', 'a plant']),
  R(4, 3, ['I speak without a mouth', 'and hear without ears.', 'I have no body, but I come alive', 'with the wind.'], 'an echo', ['a whistle', 'a kite', 'a flag']),
  R(4, 3, ['What gets sharper', 'the more you use it?'], 'your brain', ['a pencil', 'a knife', 'a spoon']),
  R(4, 3, ['What is so fragile', 'that saying its name breaks it?'], 'silence', ['glass', 'an egg', 'a bubble']),
  R(4, 3, ['What five-letter word has six left', 'when two letters are taken away?'], 'sixty', ['seven', 'eight', 'ninety']),
  R(4, 3, ['What has branches but no fruit,', 'no trunk and no leaves?'], 'a bank', ['a tree', 'a river', 'a road']),
  // ---- Grade 5 band 1: one step of lateral thinking.
  R(5, 1, ['What has 13 hearts', 'but no other organs?'], 'a deck of cards', ['a hospital ward', 'a giant octopus', 'a valentine card']),
  R(5, 1, ['What has four wheels and flies?'], 'a garbage truck', ['a jumbo plane', 'a rescue helicopter', 'a school bus']),
  R(5, 1, ['What invention lets you look', 'right through a wall?'], 'a window', ['a telescope', 'a mirror', 'a ladder']),
  R(5, 1, ['If you drop a yellow hat in the Red Sea,', 'what does it become?'], 'wet', ['red', 'orange', 'dry']),
  R(5, 1, ['What goes up but never comes down?'], 'your age', ['a balloon', 'a rocket', 'smoke']),
  R(5, 1, ['I am always in front of you,', 'but I can never be seen.'], 'the future', ['the wind', 'your shadow', 'a mirror']),
  R(5, 1, ['Which weighs more: a kilogram', 'of feathers or a kilogram of rocks?'], 'they weigh the same', ['the feathers', 'the rocks', 'it depends on the size']),
  // ---- Grade 5 band 2: a story or a self-referring clue.
  R(5, 2, ['What can you hold in your right hand', 'but never in your left hand?'], 'your left hand', ['a sharp pencil', 'a tennis ball', 'a mobile phone']),
  R(5, 2, ['A man walked in the rain with no hat,', 'hood or umbrella, yet not one hair', 'on his head got wet. How?'], 'he was bald', ['he ran fast', 'the rain was warm', 'he walked backwards']),
  R(5, 2, ['What can you make', 'that nobody can see, not even you?'], 'noise', ['music', 'a cake', 'a painting']),
  R(5, 2, ['I am lighter than a feather,', 'yet the strongest person cannot', 'hold me for five minutes.'], 'your breath', ['a bubble', 'a cloud', 'a snowflake']),
  R(5, 2, ['Which month has 28 days?'], 'all of them', ['February', 'only the short ones', 'none of them']),
  R(5, 2, ["Mary's father has five daughters:", 'Nana, Nene, Nini, Nono and ...?', "What is the fifth daughter's name?"], 'Mary', ['Nunu', 'Nina', 'Nona']),
  R(5, 2, ['A boy kicked a ball as hard as he could', 'and it came straight back to him', 'without touching anything. How?'], 'he kicked it straight up', ['it hit a tree and rolled back', 'a friend threw it back to him', 'it bounced off a garden wall']),
  R(5, 2, ['What breaks but never falls,', 'and what falls but never breaks?'], 'day and night', ['glass and rain', 'waves and leaves', 'a cup and a ball']),
  // ---- Grade 5 band 3: word puzzles and traps that need two steps.
  R(5, 3, ['What five-letter word sounds', 'like it has only one letter?'], 'queue', ['quiet', 'cough', 'aisle']),
  R(5, 3, ['Take away the whole of me', 'and there is still some left over.', 'What word am I?'], 'wholesome', ['handsome', 'awesome', 'nowhere']),
  R(5, 3, ['I have keys but open no locks.', 'I have space but no room.', 'You can enter, but not go in.'], 'a keyboard', ['a grand piano', 'an empty house', 'a parked car']),
  R(5, 3, ['Two fathers and two sons went fishing.', 'Each caught one fish, but they', 'came home with only three. How?'], 'grandpa, dad and son', ['one fish got away', 'they ate one fish', 'two fish were tiny']),
  R(5, 3, ['Forward I am heavy,', 'but backward I am not.', 'What word am I?'], 'ton', ['lot', 'pot', 'big']),
  R(5, 3, ['What has a ring but no finger', 'and calls you from far away?'], 'a telephone', ['a hand mirror', 'a skipping rope', 'a wax candle']),
  R(5, 3, ['A farmer has 17 sheep.', 'All but nine of them run away.', 'How many sheep are left?'], 'nine', ['eight', 'seventeen', 'zero']),
  R(5, 3, ['A rooster lays an egg on a roof.', 'Which way does the egg roll?'], 'roosters lay no eggs', ['to the left of the roof', 'to the right of the roof', 'straight down the roof']),
  R(5, 3, ['What is black when it is clean', 'and white when it is dirty?'], 'a chalkboard', ['a white shirt', 'a glass window', 'a dinner plate']),
  R(5, 3, ['I am dug from a mine and shut in wood.', 'I am never let out again,', 'yet almost everyone uses me.'], 'pencil lead', ['coal', 'a diamond', 'a candle']),
  R(5, 3, ['Which English word has three', 'double letters in a row?'], 'bookkeeper', ['committee', 'balloon', 'success']),
  R(5, 3, ['A doctor gives you three pills', 'and says take one every half hour.', 'How long until they are all gone?'], 'one hour', ['half an hour', 'ninety minutes', 'three hours']),
  R(5, 3, ['I am an odd number.', 'Take away one letter', 'and I become even. What am I?'], 'seven', ['nine', 'eleven', 'thirty']),
  R(5, 3, ['What can be seen in the middle of', 'March and April, but never at the', 'start or end of either month?'], 'the letter R', ['the letter M', 'the letter A', 'the letter L']),
]

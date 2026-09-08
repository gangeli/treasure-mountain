# Treasure Mountain remake: design document

This is the design for a from-scratch remake of The Learning Company's *Super Solvers: Treasure
Mountain!* (1990) for the browser (installable as a web app) and Android. The research behind it is
in [`research/treasure-mountain.md`](research/treasure-mountain.md) (mechanics of the original,
with sources and confidence levels). This document says what *we* build: which original rules are
kept verbatim, where we deviate and why, how the six grade versions (K-5) of every puzzle work, and
how the screens, art and sound are laid out.

## 1. Goals

1. **Faithful loop.** Catch elves with a net, answer the scroll riddle, win a clue word, drop coins
   in front of scenery that matches the clue words to uncover treasures (two matching words) or the
   key (all three), climb to the next of three mountain levels, climb the castle, fill the chest,
   send the Master of Mischief packing, earn stars on the rank poster, and eventually win the crown.
2. **Six grade levels (K-5), selectable at the start.** Every puzzle type exists in a version for
   each grade, with a difficulty ramp inside a grade (mountain level 1 -> 2 -> 3, and by rank).
3. **Made for small hands.** Tap-to-walk, big buttons, three (K-2) or four (3-5) answer choices,
   an optional read-aloud button, no time pressure, no way to lose.
4. **Tiny and private.** One self-contained HTML file (about 580 KB, 185 KB over the wire; the
   signed APK is under 200 KB); all art is drawn with Canvas 2D, all sound is synthesised. No
   network after first load, nothing leaves the device.

## 2. What is kept from the original (verbatim rules)

| Rule | Original | Remake |
| --- | --- | --- |
| Levels | Three looping levels around the mountain, then the castle | Same |
| Starting kit | 5 coins, 10 nets, 0 treasures | Same |
| Throwing a net | Costs 1 net whether or not it catches | Same |
| Catching an elf | +1 coin (any elf); scroll elves open a riddle | Same |
| Correct answer | +2 coins and a clue word | Same |
| Clue words | Three per level: a number, a descriptor and an object, each shown in its own slot | Same |
| Searching | Drop a coin in front of a scenery group; it POOFs away for a moment | Same |
| What you find | All three words match: the key. Exactly two: a treasure. Otherwise nothing | Same |
| Net shop | A rock marked "NETS 4 COINS": drop a coin next to it to buy 5 nets | Same (price 3 or 4 by rank) |
| Can't lose | Out of nets and coins: the shop gives free nets; coins appear on the ground when you are broke | Same |
| Key | Walk to the keyhole; the tree/door grows ladder rungs; climb up | Same |
| Tunnels | One per level; a shortcut across the loop (level 1 has a secret coin cache) | Same |
| Level 2 -> 3 | "Ride the water up" on the elf fountain | Same |
| Castle | Ladders to the throne room; the Master of Mischief can knock you down at higher ranks | Same (barrel-free, just trick ladders and his arm) |
| Throne room | Deposit treasures in the chest; the Master of Mischief steams and is blown off; you keep one treasure as a prize | Same |
| Ranks | Stars at 5, 25, 70, 115, 170, 230, 300 total treasures | Same thresholds, rank names below |
| Treasures per level | 2 at rank 0, +1 per star, max 6 | Same |
| Elf dust | From star 2 up some elves throw dust that steals a coin | Same |
| Collapsing bridge | From star 3 up the level 2 bridge collapses under you unless you jump | Same |

Rank names (the original's are not documented beyond "Trainee" and "Champion"; the rest are ours):
Trainee (0 stars), Explorer (1), Pathfinder (2), Ranger (3), Trailblazer (4), Summiteer (5),
Mountain Master (6), Champion (7: the crown is won).

## 3. Where we deviate, and why

* **Grade selection.** The original was one game for ages 5-9. We add a first screen that picks
  the grade (K, 1, 2, 3, 4, 5). Each grade keeps its own rank, treasures and prize shelf.
* **Riddle content.** The original had a few dozen fixed riddle templates for one age band. We
  generate riddles from 41 puzzle families (19 reading, 14 math, 8 thinking), each parameterised
  per grade and per tier
  (see section 5), so the game never runs dry and each grade sees age-appropriate work.
* **Answer feedback.** The original gave the clue word on a correct answer. We add: on a wrong
  answer the choice is crossed out with a short hint ("Try again!"); a second miss reveals the
  answer and the elf runs off (no clue word, no coin loss). K and 1 get a third try.
* **Read-aloud.** A speaker button reads the riddle with the browser's speech synthesis where it
  exists (Chrome, Safari, most Android WebViews). Silent fallback.
* **Controls.** Touch: tap the ground to walk, tap an elf to run at it and throw the net when in
  range, tap a scenery group to walk in front of it, big NET / COIN / JUMP buttons. Keyboard:
  arrows, Space (net), Down (coin), Up (jump/enter). Both always work.
* **HUD.** The three-box bottom panel is kept (clue words / prompt / counters) but the DOS menu bar
  is replaced by a pause button. The prompt box doubles as the on-screen button bar on touch.
* **The crown.** As in the original the crown is won at 300 treasures (7 stars). Every ascent still
  has its own ending (chest, prize, slide down), so a session always ends on a high.
* **Elves talk in verse when the riddle does**, as in the original; but every riddle also has a
  one-line plain version for the read-aloud.

## 4. Game structure and screens

1. **Title.** The mountain (three terraces, clubhouse, castle), animated elves peeking, the logo,
   PLAY, sound/music toggles, Install (web only, when the browser offers it), About.
2. **Grade select.** "Who is climbing today?" Six cards: K, 1st, 2nd, 3rd, 4th, 5th, each with its
   stars and total treasures. A long-press/"reset" is under Options, not here.
3. **Clubhouse.** Rank poster (thresholds, star, rank name, total treasures), the prize shelf, and a
   START button. First visit shows the intro text ("The elves can help you...").
4. **Level (play).** Side view, looping world of 6 screens (7680 logical px), the HUD below.
   Entities: player, 6-9 elves (2-3 with scrolls at any time; a caught scroll elf respawns as a
   plain elf and a new scroll appears elsewhere), scenery groups, tunnel, net rock, keyhole, exit.
5. **Riddle overlay.** Scroll panel, elf dancing at the right, prompt text (with any drawing: clock,
   coins, shapes, counters), choices in a column, selection box, speaker button.
6. **Clue bubble.** "Good job, Super Solver! You have won a clue word to help you find the key: two".
7. **Castle climb.** Three floors of ladders; some ladders are trick ladders (they end short) from
   star 3; the Master's arm sweeps from a wall hole from star 4; falling just sends you down a floor.
8. **Throne room.** Cutscene: chest opens, treasures fly in, the Master of Mischief steams and is
   blasted out of the window, a prize pops out, then the slide down.
9. **Rank screen.** The poster again, with the star moving up when a threshold is crossed. Then
   the clubhouse; the next ascent has one more treasure per level.
10. **Crown ending.** At 300 treasures: the crown rises from the chest, fireworks, "You saved
    Treasure Mountain!", the poster shows the crown.
11. **Pause / options.** Resume, sound, music, how to play, change grade, quit to title.

Progress is saved after every clue, treasure, key and screen change, so closing the app mid-level
resumes at the same point (the level layout is regenerated from its saved seed).

## 5. Puzzle families and the K-5 ramp

Every riddle is produced by a generator `gen(grade, tier, rng)` where `grade` is 0 (K) to 5 and
`tier` is 1, 2 or 3. Tier 1 is used on mountain level 1, tier 2 on level 2, tier 3 on level 3;
from star 3 on, level 1 uses tier 2, and from star 5 on all levels use tier 3, so the same grade
gets harder as the child ranks up. Choices: 3 for grades K-2, 4 for grades 3-5.

Generators are deterministic given the RNG, never repeat a prompt within a session, and each has
a per-grade *availability* and *weight* so the mix shifts with grade (phonics-heavy for K-1,
vocabulary and multi-step arithmetic for 4-5). Every family is listed below with what it asks at
each grade; the exact number ranges are in `src/content/generators/*.ts` and are checked by tests.

### Reading and language

| Family | K | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Rhymes | CVC word families (cat/hat), 3 choices with a clear non-rhyme | CVC + blends (ship/chip) | vowel teams (rain/train) | multi-syllable rhymes | slant and multi-syllable | rare rhymes / near rhymes flagged |
| Beginning/ending sounds | first letter of picture-words (b: ball, bat, bug) | ending sounds; digraphs (sh, ch) | blends (str, pl) | -- | -- | -- |
| Letters | "Which is the letter B?" / big-little matching | alphabet order neighbours | -- | -- | -- | -- |
| Compound words | -- | sun + shine | bird + bath (three worked examples then a blank) | harder pairs, decoys share a half | split a compound | -- |
| Opposites | hot/cold, big/small | up/down, fast/slow, more | wide/narrow, ancient/modern-lite | precise pairs (shallow/deep) | abstract (generous/stingy) | academic (abundant/scarce) |
| Synonyms | -- | big/large | happy/glad | shades (angry/furious) | tier-2 vocabulary | tier-3 vocabulary |
| Categories | Which is an animal? | Which is a fruit/vehicle? | Which does not belong? | subtler categories (mammals vs reptiles) | abstract categories | odd-one-out with two plausible answers |
| Where it lives / what it does | bird-nest, fish-water | bee-hive, bear-den | tool-job (hammer-nail) | worker-place | part-whole | function-object |
| Plurals and tenses | -- | cat-cats | mouse-mice, child-children | run-ran | irregular past | tense in context |
| Contractions | -- | -- | can't, I'm | won't, they've | -- | -- |
| Syllables | -- | 1 vs 2 syllables | count to 3 | count to 4 | -- | -- |
| Homophones | -- | -- | sea/see, two/too | their/there/they're | more pairs, context sentence | subtle pairs |
| Prefixes and suffixes | -- | -- | -- | un-, re-, -ful | pre-, dis-, -less, -ness | mis-, inter-, -able, -tion |
| Analogies | -- | -- | -- | hot:cold :: up:__ | part/whole, worker/tool | function, degree |
| Alphabetical order | -- | -- | first letter | second letter | third letter | -- |
| Sentence completion | I see a __ (sight words) | short sentence, picture-word | context clue | context clue, harder word | vocabulary in context | academic vocabulary |
| Parts of speech | -- | -- | -- | noun/verb | adjective/adverb | pronoun, conjunction |

### Math

| Family | K | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Counting | count 1-10 drawn objects; which number comes next | count to 20; ten-frames | count by 2s/5s/10s to 100 | skip counting from any number | -- | -- |
| Number words | one..ten | eleven..twenty | to one hundred | -- | -- | -- |
| Compare | which is more (pictures); bigger number to 10 | to 100 | to 1000 | 4-digit; < > = | fractions with like denominators; decimals tenths | fractions unlike denominators; decimals thousandths |
| Add | within 5 with objects | within 20 | within 100 | 3-digit | multi-digit; decimals tenths | decimals; fractions |
| Subtract | within 5 with objects | within 20 | within 100 | 3-digit | multi-digit; decimals | decimals; fractions |
| Multiply | -- | -- | equal groups (2 x 3 as pictures) | facts to 10x10 | 2-digit x 1-digit; x 10s | 2-digit x 2-digit; decimals |
| Divide | -- | -- | share equally (pictures) | facts | 3-digit by 1-digit, remainders | 2-digit divisors |
| Sequences | shape patterns ABAB | number patterns +1/+2 | +5/+10, backwards | x2, +/-7, +/-9 | two-step rules | squares, Fibonacci-like |
| Place value | -- | tens and ones | hundreds | thousands; round to 10/100 | to millions; round | decimals place value |
| Time | day/night, clock hours | hours and half hours | five minutes | to the minute; elapsed time (hours) | elapsed time (minutes) | elapsed across hours |
| Money | penny/nickel/dime names | count pennies, nickels, dimes | quarters, make a dollar | make change under $1 | dollars and cents add | multi-step money |
| Shapes | circle/square/triangle names; sides | sides and corners | 2D vs 3D names | quadrilaterals; perimeter | angles; area of rectangles | volume; coordinate grid |
| Fractions | halves (pictures) | halves and quarters | thirds; which picture shows 1/3 | compare unit fractions | equivalent fractions | add/subtract fractions |
| Word problems | one-step add within 5 | one-step within 20 | one-step within 100 | two-step; multiplication | multi-step | multi-step with fractions/decimals |
| Even/odd, factors | -- | -- | even or odd | even/odd to 100 | factors, multiples | prime, GCF |
| Measurement | longer/shorter; heavier | inches vs feet vs miles (which unit) | cm/m estimates | minutes in an hour, etc. | unit conversions | conversions with decimals |

### Thinking and science

| Family | K | 1 | 2 | 3 | 4 | 5 |
| --- | --- | --- | --- | --- | --- | --- |
| Odd one out | color/shape | category | attribute | two-attribute | abstract | conceptual |
| Riddles ("I have hands but no arms") | very concrete | concrete | classic riddles | wordplay | multi-clue | lateral |
| Animals | sounds, babies | homes, groups | classes (mammal/bird) | adaptations | food chains | ecosystems |
| Earth and sky | day/night, seasons, weather | sun/moon/stars | water cycle words | planets order | moon phases, rock types | solar system facts, gravity |
| The body and senses | five senses | body parts | teeth/bones | organs | systems | cells |
| Matter and machines | hot/cold, wet/dry | float/sink | solid/liquid/gas | magnets, simple machines | energy forms | electricity, forces |
| Sequences of events | first/next/last with pictures-in-words | daily routine | life cycles | procedures | cause and effect | logical deduction |
| Which is bigger/heavier/faster | concrete | concrete | relative | estimation | real quantities | unit reasoning |

### Difficulty ramp checks (enforced by tests)

* Within a grade, tier 3 uses larger numbers / longer words / more abstract vocabulary than tier 1.
* Across grades, tier 1 of grade g+1 is at least as hard as tier 2 of grade g on each generator's
  own metric (number magnitude, word length or list rank).
* Each grade has at least 14 families available; K has at least 8 with pictures/counters.
* Decoys are plausible (same category / same length / near the answer) but never also correct.

## 6. Clue words and scenery groups

Each level is generated from a seed with 11-14 scenery groups placed around the loop. A group has
a count (1-4), a descriptor and a kind, drawn accordingly:

* kinds by level: **1** trees, bushes, rocks, flowers, mushrooms, logs, stumps, ferns;
  **2** rocks, boulders, lanterns, signs, nests, flowers, fences, carts, crystals;
  **3** pines, shovels, snowmen, icicles, gems, stumps, flags, rocks.
* descriptors: each kind uses ONE dimension only, so its descriptors are mutually exclusive and a
  child can always tell which group a clue word means: sizes/shapes for trees (small, big, tall,
  round), rocks (small, big, round, flat), boulders (round, pointy, flat, cracked), logs, stumps,
  ferns, pines (small, tall, snowy), snowmen, icicles (long, short, thick), fences (short, tall,
  long), signs (round, square, striped); colours for flowers, lanterns, shovels, gems, flags,
  crystals; a distinct feature for mushrooms (red, blue, yellow, spotted), nests and carts (small,
  big, empty). No descriptor names the default look of every instance (no "green bush").
* number words: one, two, three, four (K-1 use one to three).

The hunt target is a group whose (count, descriptor, kind) triple is unique; the generator then
adjusts the other groups so that exactly T groups (T = treasures for this rank) match exactly two
of the three words and every other group matches at most one. Dropping a coin in front of a
group that already gave up its item finds nothing again.

Clue words are handed out in a random order but each lands in its own slot (number / descriptor /
object), exactly like the original's HUD.

## 7. Economy and pacing

* Start: 5 coins, 10 nets. Elf caught: +1 coin. Riddle solved: +2 coins. Coin drop: -1.
  Net shop: 4 coins for 5 nets (3 at star 5+ when elf dust is around).
* Coins on the ground appear (one at a time, at most 3 per level) whenever coins < 2 and nets = 0,
  so the player can always buy nets.
* Elf dust (star 2+): a dusting elf throws a puff; if it hits, -1 coin (never below 0).
* Score isn't shown; treasures are the score, like the original.
* Average ascent (tested by the automated playtest with a perfect player): about 9-12 riddles.

## 8. Art direction

* Logical canvas 1280 x 720, letterboxed. Play area 1280 x 560, HUD 1280 x 160 below.
* Palette: an "EGA remembered fondly" palette: deep blue frame (#1b3a5c), grey-blue rock backdrops,
  saturated grass green, cyan accents, warm browns, magenta/purple for the mine, icy whites and
  pale blues for the summit. Flat fills with one darker shade per colour and a thin dark outline,
  so everything reads at tablet size and stays crisp as vectors.
* Characters: the Super Solver (red feathered cap, cyan tunic, red trousers, brown boots, yellow
  backpack, blue hoop net) with a 6-frame walk cycle, jump, net swing and "crouch to drop coin";
  elves (pointed caps in three colours, tunics, big shoes, scroll or balloon or dust pouch) with a
  4-frame run, a stunned "under the net" pose and a dance; the Master of Mischief (big round head,
  wild orange hair, red nose, crown, purple robe) with steam and a blast-off.
* Backgrounds are drawn once per level into an offscreen canvas per screen; entities are drawn
  every frame. Parallax: one far layer (mountain silhouettes / sky) at 0.3x.
* Text: a rounded sans-serif system stack at 30-40 px for riddles (min 28 px), with letter-spacing
  and generous line height; red for the clue word and the highlighted rhyme letters, as the original.

## 9. Sound

All synthesised (see `src/engine/audio.ts`): a title march, one loop per level (pastoral,
brisk mine, airy summit), a castle theme and a victory loop; effects for steps, jump, net swing,
catch, miss, scroll open, right/wrong, coin, clue, poof/dig, treasure, key, ladder, fanfare,
elf laugh, dust, gate, crown.

## 10. Persistence

`localStorage` key `treasure-mountain-v1`: per-grade profile (stars, total treasures, prizes,
riddles seen/right per family for the difficulty report), settings, and the current run (level,
seed, coins, nets, clue words found, treasures found, position). Nothing else is stored.

## 11. Testing

* `test/content.test.ts`: every generator x grade x tier x 300 seeds is valid, choices unique,
  answer present, decoys never also correct, prompts fit the scroll, ramp monotonic.
* `test/world.test.ts`: level generation constraints for all ranks and seeds.
* `test/game.test.ts`: the pure game state machine, driven headless: full ascent with a perfect
  player, a player who fails every riddle (still finishes: free nets, ground coins), save/restore.
* `e2e/playtest.mjs`: Playwright plays a full ascent at each grade in the real build through real
  taps and key presses (optionally at a preset rank, to exercise elf dust, the broken bridge, trick
  ladders and the Master's arm) and writes screenshots; `e2e/screenshots.mjs` renders every screen
  and art sheet for review; `e2e/pwa.mjs` checks the service worker, manifest, saved progress and
  an offline reload; `e2e/difficulty.mjs` writes `DIFFICULTY.md`; `e2e/samples.mjs` dumps riddles
  per family x grade x tier for review.

# Treasure Mountain! (1990) — how the original game works

Research notes gathered while building this remake. The goal was to get the mechanics right, so
this document records *what the original actually does*, with the evidence for each claim.

Every mechanic below is tagged:

* **[source]** — taken from the game's own data files (the strongest evidence available: this is the
  program telling you what it does).
* **[screens]** — read off actual screenshots of the DOS version.
* **[docs]** — manuals, catalogues, contemporary magazine reviews.
* **[assumption]** — not confirmed anywhere; what this remake chose to do, and why.

## 1. The primary sources

The decisive source is the original 1990 DOS release itself, preserved at
<https://archive.org/details/msdos_Super_Solvers_Treasure_Mountain_1990>. The game ships as twenty
files; four of them are readable text once unpacked:

| File | What it holds |
| --- | --- |
| `HELP.DAT` (3,726 b) | The complete in-game help, including the rules and the whole key map. |
| `SST.EXE` (115,011 b) | Every message the game prints: hints, rank-up text, errors, the ending. |
| `ALL_PUZS` (43,887 b) | The puzzle bank: **360 riddles**, dictionary-compressed. |
| `PRG_DICT` (3,328 b) | The compression dictionary: 208 fixed-width 16-byte words. |

`ALL_PUZS` is compressed with a trivial scheme: any byte ≥ 0x80 is an index into `PRG_DICT`
(byte − 0x80), bytes < 0x80 are literal ASCII, `0x0D` ends a line and `0x00` ends a puzzle. Decoding
it recovers all 360 puzzles exactly as the game shows them (the decoder used here is in
`docs/research/decode_puzzles.py`).

Secondary sources: a screenshot Let's Play of the DOS version
(<https://lparchive.org/Super-Solvers-Series/> parts 10–13, ~77 screenshots read directly), the
English Wikipedia article, oldgames.sk, the Learning Company Fall 1991 catalogue, and reviews in
*Computer Gaming World* #83 (June 1991), *Compute!* #131 (July 1991) and *PC Magazine* (April 1991).

## 2. Story

Verbatim from the opening sequence **[source]**:

> The Master of Mischief has stolen the crown and hidden the treasures of Treasure Mountain!
>
> You, the Super Solver, must find the treasures and take them to the top of the mountain. Hidden
> keys can open the gateways up the mountain.
>
> The elves can help you. Catch them in your net to get coins and clue words. They will help you
> find treasures and the keys.
>
> As the treasure chest is filled, you will earn your stars, win the crown, and save Treasure
> Mountain!

And from `HELP.DAT` **[source]**:

> The Master of Mischief has stolen the crown! Now he wants to take all the magic gold from Treasure
> Mountain!

The player character is the **Super Solver**. Note that Wikipedia calls the protagonist a "Super
Seeker" and files the game under a "Super Seekers" series; the game's own text only ever says *Super
Solver* and *Super Solvers Series*, and the title screen reads "A Super Solvers Adventure"
**[source] [screens]**. This remake follows the game.

**Flutter the butterfly** is the player's guide, and — charmingly — *is* the mouse cursor
**[source]**:

> Hi! My name is Flutter. As your guide, I will give you New Player Hints to help you learn to play
> the game.
>
> Your guide, Flutter the butterfly, is your mouse cursor. To walk, move Flutter left or right as
> you hold the mouse button down.

## 3. The core loop

From `HELP.DAT`, the rules in the game's own words **[source]**:

> To stop him, collect hidden treasures and bring them to the castle at the top of the mountain.
>
> To move up the mountain, find the key that unlocks the special pathway to the next level. Catch
> elves in your net to get gold coins.
>
> Some elves will ask you questions. Answer them to win clue words. Clue words help you find
> treasures and keys.
>
> When you see a place that matches 2 of the 3 clue words, drop a coin to find a treasure. Only one
> place matches all 3 clue words. That's where you will find the key!
>
> Get new clue words and find a new key on all 3 levels of the mountain to get to the castle.

So the loop is: **catch elf → answer riddle → win a clue word → deduce which scenery group the three
words describe → drop a coin there → key (3 of 3) or treasure (2 of 3) → key opens the way up →
repeat on three levels → castle → deposit treasures → prize → back to the clubhouse.**

The mountain is a **loop**: walk far enough in one direction and you come back round **[screens]**.
Each level has a **tunnel** that cuts across it as a shortcut **[screens]**. Tunnels are not always
kind: `SST.EXE` contains "Whoops! You slid down a tunnel. Find your way back up the mountain."
**[source]**, so at least some tunnels drop the player back down.

## 4. Controls

The complete key map, verbatim from `HELP.DAT` **[source]**:

| Key | Action |
| --- | --- |
| ← or → | Walk left or right |
| ↑ | Go into a tunnel or cave; open a lock with a key; climb up |
| ↑ with ← or → | **Flip** and move left or right |
| Space bar | Drop your net to catch an elf |
| ↓ | Drop a coin; climb down |
| ↓ or ↑ | Cycle among menu items **or move the answer box** |
| Enter | Select the highlighted menu item or answer choice |
| F1 / F2 / F3 | Help / File / Options on the menu bar |
| Esc | Exit (quit) the game |

The **flip** is a somersault, and it is the game's only evasive move: it is how the player dodges
elf dust and crosses gaps **[source]**:

> Some elves throw magic elf dust and try to take your gold coins. Flip up and over the dust when it
> comes at you.
>
> Look out for gaps in the path! If you don't flip over a gap, you will fall down the mountain.

With a mouse, the player drags Flutter around: hold the button and move Flutter left/right to walk,
to the bottom of the path to swing the net, above the path to flip; click a ladder to mount it
**[source]**.

## 5. Nets and coins

The net is not a stack of nets — it is **one net that wears out**, and it is repaired at a **net
cave** **[source]**:

> When your net wears out, find a net cave and drop coins there to have your net repaired.

> Your net has worn out! Find the net cave. Drop coins there to open the cave. When the cave is
> open, press [↑] to fix your net.
>
> You need coins to fix your net. Look for coins on the path.

The HUD nevertheless counts the net down like an ammunition counter, 10 → 9 → 8 as throws are made
**[screens]**, and the net cave is a rock with **NETS 4 COINS** (sometimes **NETS 3 COINS**) carved
into it **[screens]** — so the price varies. oldgames.sk states four coins buys five nets, and that
when the player has neither nets nor enough coins the rock moves aside and gives nets free, making
the game impossible to lose **[docs]**. The game's own "Look for coins on the path" **[source]**
corroborates the second half: coins appear on the ground when the player is broke.

Coin income **[docs] [screens]**: catching any elf gives 1 coin; answering its riddle correctly
gives 2 more. Counters in the screenshots move consistently with this.

Spending a coin is the only way to search: "You have no coins to drop. Catch an elf in your net to
get a coin." **[source]**

## 6. The riddles

**360 puzzles** ship with the game, every one with **exactly three choices** **[source]**. The
format in `ALL_PUZS` is: 2–6 lines of prompt, then `~`, then the correct answer, then two decoys.
Prompt lines run to at most 43 characters and choices to at most 28 **[source]**.

Two typographic conventions **[source]**: words wrapped in backticks are drawn **in red** (the
example words, the operative words), and `____` marks the blank to fill.

Most riddles are **in verse**. This is the game's signature voice. Four verbatim examples:

> \`Fig, pig, wig\`
> Please help me out this time.
> \`Dig, jig, rig\`
> And pick a word to rhyme.
> → **big** / dog / fin

> \`Fun, pen, fan, fin\`
> These words all end with \`n\`.
> Do you see one more \`n\` word?
> Please pick it for me, then.
> → **sun** / dim / fat

> Base + ball = \`baseball\`
> Birth + day = \`birthday\`
> Tooth + brush = \`toothbrush\`
> Bird + bath = ____.
> → **birdbath** / bathtub / birdhouse

> I have a silly game for you.
> I play the game this way:
> \`Up\` is \`down\` and \`hot\` is \`cold\`.
> \`Big\` is \`small\` and \`night\` is ____.
> → **day** / dark / old

The bank covers: rhymes; starting sounds (including digraphs and blends — `Throw, three, thrill,
threw`); ending sounds; short and long vowel sounds; letter substitution ("Start with \`cake\`. Take
away the \`c\`. Put a new letter in its place."); letters that can be added to a word family ("What
letters could we add to the front of \`ake\`?"); compound words; synonyms ("We have two words for
many things"); opposites; homophones ("Which word sounds the same as \`made\`, but doesn't mean the
same?"); number words; counting; addition and subtraction word problems (usually about elves,
birds, coins or frogs); money and change; superlatives; shapes; word roots ("\`Tri\` means three.
\`Pod\` means foot."); categories; guessing riddles; and a strong seam of **nature, science and
outdoor-safety** content — plants making oxygen, woodpeckers, tree swallows, hummingbirds, seasons,
hibernating bears, saving water, putting out a campfire, and where not to sit down in the woods
**[source]**.

On a **correct** answer the game shows one of four congratulations, then the clue word **[source]**:

> Great! You got it right! Here is your new clue word:
> Good job, Super Solver! You have won a clue word to help you find the key:
> Yes! That's right! Here is your new clue word:
> Great job, Super Solver! Here is your new clue word:

On a **wrong** answer the elf escapes at once — there is no second try **[source]**:

> Oops! That's not it! Try to catch me again!
> Oops! You missed it this time. Try to catch me again!
> Oops! You missed it! (Sometimes I miss it, too.) Catch me again for the clue!
> Sorry! That's not the answer. Catch me and try again!

There is no penalty beyond the lost net and lost clue: nothing in `SST.EXE` deducts coins for a wrong
answer.

## 7. Clue words and the hiding places

The clue-word vocabulary is a fixed list in `SST.EXE`, and it comes in three groups **[source]**:

* **Numbers**: three, four, five, seven, eight, nine (and *two*, seen in a screenshot **[screens]**).
* **Descriptions**: triangle, round, square, rectangle, small, tall, short, and the superlatives
  biggest, smallest, tallest, shortest.
* **Objects**: tree, flower, bush, flag, mushroom, sign, nest, pinecone, rock, shovel — plus the
  plurals trees, flowers, bushes, flags, mushrooms, signs, nests, pinecones, rocks, shovels — and
  the plural-only berries, acorns, sleds, snowballs, snowmen.

So a hunt target is a phrase like *two small trees*, *three round rocks*, *four tall shovels*
**[screens]**. The HUD keeps the three words in three fixed slots (number / description / object)
and fills each slot as its word is won, not in the order they arrive **[screens]**.

Dropping a coin in front of a group makes it vanish in a cyan **POOF** cloud for a few seconds,
revealing whatever is behind it **[screens]**. The rules, again from the game **[source]**:

> Good job! You found a treasure! This hiding place matches 2 of the 3 clue words.

> You must have the key to open the lock. The key is hidden in a place that matches all 3 clue
> words.

> You found the key! Find the lock and press [↑] to open it.
> You are on your way to the top! Use [↑] to climb up.

Level 1's lock is a keyhole in a big tree, which grows ladder rungs; level 2's exit is an elf
fountain signposted **RIDE THE WATER UP**; level 3's is the castle door **[screens]**.

## 8. Ranks, stars and treasure counts

The rank ladder is **Trainee**, then one to six stars, then **CHAMPION** **[source]** — the star
count is literally drawn as `*`, `**`, … `******` in the executable, and `CHAMPION` is a separate
string. The thresholds are shown on a poster in the clubhouse: **5, 25, 70, 115, 170, 230, 300**
total treasures **[screens]**.

How many treasures are hidden per level is set by the rank, and the game states it outright at each
rank-up **[source]**:

| Rank | Treasures per level | What else changes |
| --- | --- | --- |
| Trainee | 2 | — |
| 1 star | 2 | — |
| 2 stars | 3 | **"Look out for elf dust!"** |
| 3 stars | 3 | — |
| 4 stars | 4 | **"Watch out for gaps in the path!"** |
| 5 stars | 4 | — |
| 6 stars | 5 (inferred from the pattern) | — |
| Champion | — | The crown is won |

Verbatim: *"As a 2-star Super Solver, you can find 3 treasures on each level of the mountain. Look
out for elf dust!"* and *"As a 4-star Super Solver, you can find 4 treasures on each level of the
mountain. Watch out for gaps in the path!"* **[source]**

So difficulty rises in two ways: more to find, and new hazards — elf dust at two stars, gaps in the
path at four. A Let's Play also reports the castle's ladder maze growing more complex with rank
**[docs]**.

## 9. The castle and the ending

The castle is a maze of ladders. The controls there **[source]**: *"Use [↑] and [↓] to climb up and
down. Use [←] and [→] to jump to another ladder."* The walls carry framed portraits of the Master of
Mischief; at the top is the throne room with a large pink-and-gold treasure chest, a green
pedestal-fountain, and a slide back down the mountain **[screens]**.

At the top the treasures go into the chest, the Master of Mischief steams and is blown out of the
window, and the player keeps one treasure as a **prize** **[screens]**:

> Take as many treasures to the castle as you can on each trip up the mountain. You will earn points
> and win a prize. Your prize will go back down to the clubhouse with you. **[source]**

End-of-climb messages scale with how much was found **[source]**: *"Nice going! You collected 1
treasure in that game…"*, *"Good work! You collected N treasures in that game…"*, *"Great job! You
found all N treasures on the mountain this time…"* — each ending *"Walk out the door to play
again."*

In the clubhouse **[source]**:

> In the clubhouse, walk through the prize rooms to see all your prizes. Play with your prizes one
> at a time on the shelf in the clubhouse.
>
> As the treasure chest in the castle fills up, you go up in rank and earn stars. When the chest is
> full, you win the crown and save Treasure Mountain!

Winning **[source]**:

> You have won the crown and become the Champion of Treasure Mountain!
>
> You can still collect treasures. See how many points you can earn!

and a printable certificate:

> Today [name] won back the crown and became the Champion of Treasure Mountain. Thanks to this
> brave, bright Super Solver, the magic and beauty of Treasure Mountain will live on for many years
> to come.

## 10. Screens and HUD

The screen is 320×200 EGA, 16 colours **[screens]**. Layout:

* A top menu bar: `Help F1 | File F2 | Options F3`.
* The play area, framed in blue.
* A three-box bottom panel on dark blue:
  * **left** — `Clue Words:` with a key icon (grey until the key is found, then gold) and three
    red-underlined slots;
  * **middle** — the current prompt, e.g. `Press [↓] to drop coin.` or `[↓] or [↑] to Move Box /
    [Enter] to Select`;
  * **right** — `Coins` (money-bag icon), `Net` (hoop-net icon), `Treasure` (chest icon with small
    diamonds above it showing how many treasures the level holds and how many are found).

A new game starts with **Coins 5, Net 10, Treasure 0** **[screens]**.

Other screens: the title screen ("The Learning Company presents TREASURE MOUNTAIN! — A Super Solvers
Adventure … ©1990 V 1.0"); a sign-in list of player names (the game saves per player, and the list
can fill up); the clubhouse with the rank poster and prize rooms; the riddle scroll (a cyan panel
with leafy corners and the caught elf dancing at the right edge); a `Press [Enter] to go on` white
speech-bubble; the castle; the throne room **[screens] [source]**.

Options are just **New Player Hints**, **Music** and **Sound** **[source]**.

## 11. Art and sound

EGA's 16 colours, used flat and saturated: grey-blue rock walls with green vine leaves, bright green
grass, cyan accents, warm browns. Level 1 is wooded (big trees, ferns, mushrooms, a clubhouse
pavilion, a butterfly), level 2 is the elf mine (timber mine entrances, `ELF XING` and `MINE TUNNEL`
signs, a rope bridge, carts, crystals), level 3 is the snowy summit (snow-capped pines, shovels in
the snow, an ice cave full of gems, the castle door) **[screens]**.

The Super Solver wears a red Robin-Hood cap with a white feather, a cyan tunic, red trousers, brown
boots and a yellow backpack, and carries a blue hoop net **[screens]**. The elves are about half his
height, in pointed caps (red, green, blue), tunics and big shoes; some carry a rolled yellow scroll,
some a balloon, some a dust pouch **[screens]**. The Master of Mischief has a big round head, wild
orange hair, a red nose and the stolen crown **[screens]**.

Sound is PC speaker / AdLib / Tandy (`SFX.IBM`, `TUNES.IBM`, `SFX.TAN`, `TUNES.TAN`) **[source]**.
The music is credited to Paul Webb and reportedly includes arrangements of Bach's *Solfeggietto* and
Beethoven's *Contredanse No. 1* **[docs]**.

## 12. Not this game

Care is needed with claims found online, because the three *Treasure* games share a mountain and a
villain:

* ***Treasure MathStorm!*** (1992) is set on the *same* mountain but snowbound, and is
  maths-only: the player carries treasures to the castle, catches elves with a *net gun*, buys
  things from an elf shop, and fixes the weather machine. Snowballs, the ice cave and the shop
  belong to MathStorm, not to Treasure Mountain **[docs]**.
* ***Treasure Cove!*** (1992) is underwater, with fish, gems and a very different loop **[docs]**.
* ***Treasure Galaxy!*** (1994) is in space **[docs]**.

Claims often mis-attributed to Treasure Mountain: buying nets *from a shop* (MathStorm), a *time
limit* (there is none — reviewers praised the absence of time pressure **[docs]**), and *29 ascents
to finish* (an estimate from a Let's Play, not a rule).

## 13. What this remake changes, and why

The remake keeps every rule in sections 3–9. Deliberate deviations, all in service of "a five-year-
old and a ten-year-old can both climb this mountain":

| Original | This remake | Why |
| --- | --- | --- |
| One age band (5–9) | Six grade levels, K–5, chosen at the start | The brief |
| 360 hand-written puzzles | 41 generator families producing fresh riddles per grade and tier | Six grades × three tiers needs far more content than a fixed bank, and the child should not meet the same riddle twice |
| Wrong answer → elf escapes at once | Two tries (three for K and grade 1), then the answer is shown | A single try on a four-line verse riddle is harsh for a five-year-old |
| Riddle text only | Optional read-aloud via speech synthesis | Pre-readers |
| Keyboard/mouse-drag | Tap-to-walk, tap-an-elf-to-net, big NET/COIN/JUMP buttons; keyboard identical to the original | Tablets |
| Flip (↑+direction) dodges dust and gaps | Jump (↑) does the same job | One fewer thing to learn; same function |
| Net "wears out", repaired at a net cave | Same, shown as a net counter and a NETS-for-coins rock, as the original's own screenshots do | Matches what the player actually sees |
| Prize rooms to walk through | A prize shelf on one screen | Fewer screens for small hands |
| Six ranks + Champion | Same names for the first and last (Trainee, Champion); the five in between are new (Explorer, Pathfinder, Ranger, Trailblazer, Summiteer, Mountain Master) | The original's intermediate ranks are drawn as star counts, not words **[source]** |

## 14. Still unknown

* The exact treasure count at 6 stars. The pattern 2,2,3,3,4,4 implies 5; the remake uses the real
  table for 0–5 stars and 5 treasures for 6–7 **[assumption]**.
* Whether the net price varies with rank or with location. Screenshots show both `NETS 4 COINS` and
  `NETS 3 COINS` on the same playthrough **[screens]**; the remake charges 4, dropping to 3 at five
  stars **[assumption]**.
* How many hiding places a level holds. Screenshots show a dozen or so groups; the remake generates
  11–14 **[assumption]**.
* Which tunnels slide the player down, and how far. The remake's tunnels are always a plain shortcut
  **[assumption]**.
* The words of the intermediate ranks, if they have any (see the table above).

## 15. Reception, for the record

*Computer Gaming World* #83 (June 1991) gave four stars out of five **[docs]**:

> An easy-to-play, visually appealing, non-violent arcade-style game for beginners. The player
> explores the beautiful, magical setting of Treasure Mountain and enlists the help of elves to find
> clues to the treasure. Clues consist of beginner-level number and letter puzzles, so some reading
> ability (or the participation of a parent) is a must. Plenty of time is allowed players who might
> be frustrated at more advanced, fast-paced games. New player hints help kids learn how to play.

The Learning Company's own Fall 1991 catalogue described it as **[docs]**:

> The fantasy exploration game that enriches reading, thinking, math, and science skills. To win
> back the crown from the Master of Mischief, Super Solvers must find treasures hidden along the
> trail and lock them safely away in the treasure chest at the top of the mountain. Mischievous
> elves will try to use tricks to outwit you along the way. (Ages 5–9)

## 16. Sources

* Game files: <https://archive.org/details/msdos_Super_Solvers_Treasure_Mountain_1990>
  (`HELP.DAT`, `SST.EXE`, `ALL_PUZS`, `PRG_DICT`)
* Screenshot Let's Play (DOS, ~77 screenshots): <https://lparchive.org/Super-Solvers-Series/> parts 10–13
* Wikipedia: <https://en.wikipedia.org/wiki/Treasure_Mountain!>
* oldgames.sk: <https://www.oldgames.sk/en/game/super-solvers-treasure-mountain>
* *Computer Gaming World* #83, June 1991, p. 82: <https://archive.org/download/cgw_museum_pdfs/cgw_83_djvu.txt>
* *Compute!* #131, July 1991: <https://archive.org/stream/1991-07-compute-magazine/Compute_Issue_131_1991_Jul_djvu.txt>
* The Learning Company Software Catalog, Fall 1991: <https://archive.org/details/tlc-catalog-1991>
* *Treasure Mountain!* User's Guide, 1997 v2.0: <https://archive.org/details/treasuremountain0000unse_b1n6>

The 360 original puzzles are quoted here only as evidence of the game's mechanics and voice; they
are The Learning Company's work and none of them ship in this remake, whose riddles are all
generated from scratch.

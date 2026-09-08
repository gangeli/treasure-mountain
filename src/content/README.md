# Puzzle content: how generators work

Every riddle the elves ask comes from a **generator** (`Generator` in `types.ts`): a family of
puzzles parameterised by `grade` (0 = K ... 5) and `tier` (1..3, the mountain level; tier 3 is the
hardest version for that grade). `make(grade, tier, rng)` must be deterministic given the RNG and
must only use the RNG for randomness (`rng.int`, `rng.pick`, `rng.sample`, `rng.shuffle`,
`rng.bool`, `rng.weighted`).

## Contract (enforced by `test/helpers.ts` -> `standardChecks`)

* `choices.length === choiceCount(grade)` (3 for K-2, 4 for 3-5). Use `shuffled(rng, answer, decoys, n)`
  which dedups, shuffles and returns the answer index; give it *more* decoys than needed.
* Prompt: 1-6 lines, each <= 46 characters. Choice text <= 26 characters. The scroll is wide but
  the font is large (children).
* `spoken`: one plain sentence for text-to-speech, ending with the choices read out.
* `metric`: a number that grows with difficulty (number size, word length, list level...). Tests
  check that tier 3 >= tier 1 within a grade and that grade g+1 tier 1 >= grade g tier 1 (on
  average over 200 draws, 3% tolerance). Make the metric reflect what you actually ramp.
* Variety: >= 12 distinct `key`s in 150 draws for every (grade, tier). Use big word lists.
* `family` must equal the generator `id`; `skill` is a short label like `math: telling time`.
* Never throw for a listed grade/tier. If a data pool is too small, enlarge the data.

## Quality bar

* **Correct.** Every answer must be unambiguously right and every decoy unambiguously wrong for a
  child at that grade. For synonyms/antonyms/categories, filter decoys against the *whole* data
  (a decoy must not be another valid answer). For rhymes, check the rhyme class, not the spelling.
* **Age-appropriate reading level.** K riddles use very short words and, where possible, a
  `visual` (counters, ten frame, shapes...). Grade 5 can use tier-3 academic vocabulary.
* **Plausible decoys.** Same category / similar length / near-miss numbers (a "wrong operation"
  answer, an off-by-one, a common misconception), never nonsense words.
* **Kind tone.** The elves are cheerful. Verse (`verse: true`) is welcome for K-2, e.g.
  "Fig, pig, wig / Please help me out this time. / Dig, jig, rig / And pick a word to rhyme."
  Plain prompts are fine for 3-5.
* **Pictures.** Use only the `Visual` kinds in `types.ts` (counters, clock, coins, fraction, shape,
  pattern, tenframe, grid, array, numberline, angle, letter, text, thermometer, scale, bars).
  Choices may be visual too (`{ visual: {...} }`), e.g. "Which shape has 3 sides?".
* **No repetition by construction.** Randomise both the items and the phrasing.

## Files

* `data/*.ts`: word lists and fact tables (plain exported constants, typed).
* `generators/<family>.ts`: one file per family exporting a `Generator`.
* `generators/reading.ts`, `generators/math.ts`, `generators/thinking.ts`: arrays per area, merged in
  `generators/index.ts`.
* `test/<area>.test.ts`: `standardChecks(<AREA>, it, expect)` plus any family-specific checks
  (e.g. "no decoy is also a synonym").

Run `npx vitest run test/<area>.test.ts` and `npx tsc --noEmit` before finishing.

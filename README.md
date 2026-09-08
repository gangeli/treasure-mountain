# Treasure Mountain (K-5 remake)

A from-scratch remake of The Learning Company's 1990 educational adventure *Super Solvers: Treasure
Mountain!* for the browser (installable as a web app on iPad, iPhone, Android and desktops) and as a
tiny Android APK. Catch elves with your net, answer their riddles to win clue words, drop magic coins
in front of the scenery that matches the clues to uncover treasures and the key, climb the three
levels of the mountain, fill the chest in the castle and win back the crown from the Master of
Mischief.

* **Play now:** [gangeli.github.io/treasure-mountain/play/](https://gangeli.github.io/treasure-mountain/play/)
  runs the game in the browser; "Add to Home Screen" (Safari on iOS) or "Install app" (Chrome) turns
  it into a full-screen, offline app with its own icon.
* **Install the APK:** see the [GitHub Pages site](https://gangeli.github.io/treasure-mountain/) for
  the APK and step-by-step sideloading instructions.
* **Grades K-5:** every puzzle family (rhymes, letter sounds, compound words, opposites, synonyms,
  categories, analogies, homophones, prefixes and suffixes, counting, adding, multiplying, fractions,
  time, money, shapes, measurement, word problems, animals, earth and sky, the body, matter and
  machines, riddles, odd one out, and more) comes in a version for each grade, and gets harder as
  the child earns stars.
* **Size:** the whole game is one HTML file - 207 KB gzipped over the wire; the signed APK is 217 KB.
  All art is vector, drawn with Canvas 2D; all sound is synthesized. Nothing leaves the device.

## Layout

| Path | What it is |
| --- | --- |
| `src/engine/` | Platform layer: letterboxed canvas, fixed-step loop, pointer/keyboard input, WebAudio synth and sequencer, localStorage save, seeded RNG. |
| `src/content/` | The puzzle generators (one file per family under `generators/`, word lists and fact tables under `data/`), the riddle types and the registry that balances reading / math / thinking. |
| `src/game/` | Pure game logic: level generation with the clue-word constraints (`world.ts`), the state machine for every screen (`game.ts`), UI hit regions (`ui.ts`). No DOM, so everything is unit-testable. |
| `src/art/` | Everything drawn: palette, drawing helpers, backdrops, characters, scenery, features, HUD, riddle pictures, screens. |
| `android/` | A one-Activity WebView app that bundles `dist/index.html`. |
| `docs/` | The GitHub Pages site (install instructions, screenshots) and the design and research documents. |
| `e2e/` | Playwright tools: screenshots of every screen, the real-input playtest, the offline/PWA and `file://` checks, headless audio rendering, icon rendering, and the sample and difficulty dumps. |
| `test/` | Vitest suites: content validity and difficulty ramps, level generation, game flow. |

## Building

Requires Node 22. The Android build additionally needs JDK 17+ and the Android SDK (platform 35,
build-tools 35).

```sh
npm ci
npm test                              # content, world and game-flow tests
npm run build                         # typecheck + dist/index.html (single file) + sw.js + manifest
node e2e/screenshots.mjs e2e/out/shots  # renders every screen to PNG (needs Chromium)
node e2e/playtest.mjs                  # plays a full ascent at every grade through the real UI
cd android && ./gradlew :app:assembleRelease   # signed APK in app/build/outputs/apk/release/
```

The release keystore in `android/app/release.keystore` is intentionally committed: it only exists
so that new builds install over old ones on a sideloaded tablet.

## Documents

* [`docs/DESIGN.md`](docs/DESIGN.md): what the remake keeps from the original, what it changes, the
  K-5 puzzle matrix, screens, economy, art and sound.
* [`docs/research/treasure-mountain.md`](docs/research/treasure-mountain.md): notes on the original
  game's mechanics gathered while building this, with sources and confidence levels.
* [`docs/DIFFICULTY.md`](docs/DIFFICULTY.md): measured difficulty per family, grade and tier, with
  an example riddle for each and a sample of what one climb asks at every grade.

MIT licensed. Not affiliated with The Learning Company.

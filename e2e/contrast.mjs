// WCAG contrast for every text-on-background pair the game draws. Reading is the whole point of
// this game, and a colour that looks fine to an adult on a laptop can be unreadable to a child on a
// tablet in a bright room, so the ratios are checked rather than eyeballed.
// Usage: node e2e/contrast.mjs
const P = {
  ink: '#1a2238', inkSoft: '#2d3a5c', frame: '#1b3a5c', panel: '#0f2747', panelDeep: '#0a1c33',
  panelLine: '#5aa9ff', cyan: '#39d6e8', cyanPale: '#a8f0f6', scroll: '#5fdad9', scrollEdge: '#2aa6a8',
  white: '#ffffff', cream: '#fff6d8', yellow: '#ffd23f', gold: '#f6c445', orange: '#ff8c1a',
  red: '#e63946', redDark: '#b3202c', pink: '#ff6fb1', purple: '#7b4bb8', purpleDark: '#4d2a7f',
  blue: '#2f6fe4', blueDark: '#1e48a3', bluePale: '#8fc1ff', skyTop: '#6fbaff', skyBottom: '#c9ecff',
  green: '#3fb544', greenDark: '#2b8a33', greenLight: '#7fe07a', grass: '#46b83f',
  rockWall: '#7f8ba3', mine: '#7d6a9c', snow: '#f4fbff',
}
const lin = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const lum = hex => {
  const n = parseInt(hex.slice(1), 16)
  const r = lin(((n >> 16) & 255) / 255), g = lin(((n >> 8) & 255) / 255), b = lin((n & 255) / 255)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const lumOf = hex => lum(hex)
const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05) }

// Every text-on-background pair the game actually draws, read out of the screen code.
const PAIRS = [
  ['riddle prompt', P.ink, P.scroll],
  ['riddle answer text', P.ink, P.cream],
  ['answer badge number', P.white, P.blueDark],
  ['HUD label', P.cream, P.panel],
  ['HUD number', P.white, P.panel],
  ['clue word', P.yellow, P.panelDeep],
  ['clue placeholder', P.bluePale, P.panelDeep],
  ['big button label', P.white, P.green],
  ['blue button label', P.white, P.blue],
  ['title tagline', P.blueDark, P.cyanPale],
  ['grade card rank', P.inkSoft, P.cream],
  ...[['K', P.pink], ['1st', P.orange], ['2nd', P.yellow], ['3rd', P.green], ['4th', P.cyan], ['5th', P.purple]]
    .map(([n, bg]) => [`grade card header ${n}`, (ratio(P.ink, bg) >= ratio(P.cream, bg) ? P.ink : P.cream), bg]),
  ['poster threshold', P.blueDark, P.cyan],
  ['howto step title', P.blueDark, P.cream],
  ['howto step body', P.ink, P.cream],
  ['about body', P.white, P.panel],
  ['clue bubble word', P.redDark, P.white],
  ['bubble text', P.ink, P.white],
  ['castle THRONE label', P.purpleDark, P.cream],
  ['message bubble', P.ink, P.white],
  ['sign text on scenery', P.ink, P.cream],
  ['crown subtitle', P.white, '#2a4a78'],
  ['rank +treasures', P.yellow, '#1e2f57'],
]
// The one pair allowed below the line: every big-button label is drawn at 34-44px in weight 900
// with a 5px navy outline around each glyph, which carries the separation the fill colour does not
// and which the WCAG formula has no way to see.
const OUTLINED = new Set(['big button label'])

let failures = 0
for (const [what, fg, bg] of PAIRS) {
  const r = ratio(fg, bg)
  const want = 4.5
  const ok = r >= want || OUTLINED.has(what)
  if (!ok) failures++
  const grade = OUTLINED.has(what) ? 'outlined' : r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA-large' : 'FAIL'
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${grade.padEnd(9)} ${r.toFixed(2).padStart(5)}  ${what}  (${fg} on ${bg})`)
}
console.log(failures ? `\n${failures} pair(s) below 4.5:1` : `\nall ${PAIRS.length} text pairs are readable`)
process.exit(failures ? 1 : 0)

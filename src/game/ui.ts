import type { Riddle } from '../content/types'
import type { Game } from './game'
import { W, H, HUD_Y } from './layout'

export interface Button { id: string; x: number; y: number; w: number; h: number; label: string; icon?: string; disabled?: boolean; toggled?: boolean; big?: boolean }

export function gradeCardRects(): { x: number; y: number; w: number; h: number }[] {
  const out = []
  const w = 320, h = 200, gapX = 40, gapY = 36
  const x0 = (W - (3 * w + 2 * gapX)) / 2, y0 = 190
  for (let i = 0; i < 6; i++) out.push({ x: x0 + (i % 3) * (w + gapX), y: y0 + Math.floor(i / 3) * (h + gapY), w, h })
  return out
}

/** Scroll layout: prompt on the top part, choices at the bottom-left, elf at the right. */
export const SCROLL = { x: 40, y: 36, w: 1200, h: 500 }

export function riddleChoiceRects(r: Riddle): { x: number; y: number; w: number; h: number }[] {
  const n = r.choices.length
  const visualChoices = r.choices.some(c => c.visual)
  const out = []
  if (visualChoices) {
    // Picture answers take all the room the prompt leaves, and sit centred. Pinned at 190x150 in
    // the bottom-left corner, "which group has the most flowers?" drew five flowers the size of
    // raisins under 380px of empty scroll.
    const gap = 24
    const avail = SCROLL.w - 120 - 110 // margins, and the elf dancing at the right edge
    const w = Math.min(300, Math.floor((avail - gap * (n - 1)) / n))
    const bottom = SCROLL.y + SCROLL.h - 40
    // A prompt picture owns the top right of the scroll down to y+280; otherwise allow the prompt
    // its biggest type (46px) for the lines it has.
    const top = SCROLL.y + (r.visual ? 294 : 40 + r.prompt.length * 62)
    const h = Math.max(150, Math.min(260, bottom - top))
    const x0 = SCROLL.x + 60 + Math.max(0, (avail - (n * w + (n - 1) * gap)) / 2)
    for (let i = 0; i < n; i++) out.push({ x: x0 + i * (w + gap), y: bottom - h, w, h })
  } else if (r.prompt.length >= 4 && n === 4 && !r.visual) {
    // A long prompt (the grade-5 logic puzzles run to six lines) needs the top of the scroll, so
    // four answers go in two columns instead of a stack that would run into the text. Two columns
    // also keep the buttons 66px tall rather than the 60px a stack of four would leave: on a phone
    // that is the difference between a 9mm target and an 8mm one, with 4mm between neighbours, and
    // a mis-tap here costs one of the two tries.
    const w = 400, h = 66, gapX = 20, gapY = 10
    const y0 = SCROLL.y + SCROLL.h - 30 - (2 * h + gapY)
    for (let i = 0; i < n; i++) out.push({ x: SCROLL.x + 60 + (i % 2) * (w + gapX), y: y0 + Math.floor(i / 2) * (h + gapY), w, h })
  } else {
    // Stacked answers stop short of the prompt picture, which occupies x 690-1130. At the full 820
    // the first button reached under it: the bar chart lost Monday and Tuesday off its axis, the
    // balance scale lost the foot of its stand and the thermometer its bulb.
    // Four lines counts as long. At the roomier spacing a four-line prompt could only shrink to
    // 24px, which still ran 15-25px under the first answer button on 426 of the 20,000 riddles
    // e2e/textfit.ts measures - every compound-word chain, every three-line riddle-of-the-elf, and
    // every rhyme that carries "Listen for the sound, not the spelling."
    const long = r.prompt.length >= 4
    // 60px was a 31-pixel button on a phone with 4 pixels between it and its neighbour. The three
    // answers a K-2 verse riddle stacks are the tap targets that matter most, so they keep 66.
    const h = long ? 66 : n === 4 ? 66 : 76, gap = long ? 8 : 10, w = r.visual ? 560 : 820
    const y0 = SCROLL.y + SCROLL.h - 30 - n * h - (n - 1) * gap
    for (let i = 0; i < n; i++) out.push({ x: SCROLL.x + 60, y: y0 + i * (h + gap), w, h })
  }
  return out
}

export function uiButtons(g: Game): Button[] {
  const b: Button[] = []
  if (g.paused) {
    const items = [['p-resume', 'Keep playing', '▶'], ['p-howto', 'How to play', '?'], ['p-sound', g.settings.sound ? 'Sound: on' : 'Sound: off', 'speaker'], ['p-music', g.settings.music ? 'Music: on' : 'Music: off', '♫'], ['p-quit', 'Quit to title', '⌂']]
    items.forEach(([id, label, icon], i) => b.push({ id, x: W / 2 - 220, y: 200 + i * 78, w: 440, h: 68, label, icon }))
    return b
  }
  switch (g.screen) {
    case 'title':
      b.push({ id: 'play', x: 200, y: 385, w: 340, h: 92, label: 'PLAY', big: true })
      b.push({ id: 'howto', x: 100, y: 505, w: 260, h: 68, label: 'How to play' })
      b.push({ id: 'about', x: 380, y: 505, w: 260, h: 68, label: 'About' })
      // A speaker, not a second music note: side by side with the music toggle two notes were one
      // control drawn twice. (The struck-through note glyph also rendered as tofu on some fonts.)
      b.push({ id: 'sound', x: W - 158, y: 12, w: 72, h: 72, label: '', icon: 'speaker', toggled: g.settings.sound })
      b.push({ id: 'music', x: W - 80, y: 12, w: 72, h: 72, label: '', icon: '♫', toggled: g.settings.music })
      if (g.installable && !g.isApp) b.push({ id: 'install', x: 20, y: 12, w: 200, h: 68, label: 'Install app', icon: '⤓' })
      break
    case 'grade':
      b.push({ id: 'back', x: 20, y: 12, w: 140, h: 68, label: 'Back', icon: '‹' })
      break
    case 'clubhouse':
      b.push({ id: 'start', x: W / 2 - 200, y: H - 130, w: 400, h: 90, label: g.canResume() ? 'NEW CLIMB' : 'START CLIMBING', big: true })
      if (g.canResume()) b.push({ id: 'resume', x: W / 2 + 230, y: H - 122, w: 300, h: 74, label: 'Continue climb', icon: '▶' })
      b.push({ id: 'back', x: 20, y: 12, w: 140, h: 68, label: 'Back', icon: '‹' })
      b.push({ id: 'howto', x: W - 236, y: 12, w: 216, h: 68, label: 'How to play', icon: '?' })
      break
    case 'level': {
      const run = g.run!
      // Centred in the middle HUD panel (which carries no prompt on the level screen): at +74 the
      // buttons hung over the panel's bottom edge and read as cut off.
      const cx = 450, y = HUD_Y + 46, w = 110, h = 76
      b.push({ id: 'net', x: cx, y, w, h, label: `Net`, icon: 'net', disabled: run.nets <= 0 })
      b.push({ id: 'coin', x: cx + w + 12, y, w, h, label: `Coin`, icon: 'coin', disabled: run.coins <= 0 })
      b.push({ id: 'jump', x: cx + 2 * (w + 12), y, w, h, label: 'Jump', icon: 'jump' })
      b.push({ id: 'pause', x: W - 84, y: 8, w: 72, h: 72, label: '', icon: 'pause' })
      // Reads the clue words out. The three words are the only text a pre-reader has to act on,
      // and they are what a child forgets while hunting the far side of the level. Sized for the
      // device this is played on: the game letterboxes 1280x720 into a phone's 800x360 CSS pixels,
      // so everything on screen is half the size these numbers say. At 52x48 this button was 4.5mm
      // across on a phone, which is smaller than a five-year-old's fingertip.
      b.push({ id: 'sayclues', x: 348, y: 626, w: 76, h: 64, label: '', icon: 'speaker' })
      break
    }
    case 'castle':
      b.push({ id: 'pause', x: W - 84, y: 8, w: 72, h: 72, label: '', icon: 'pause' })
      break
    case 'riddle': {
      const rv = g.riddle!
      b.push({ id: 'speak', x: SCROLL.x + SCROLL.w - 116, y: SCROLL.y + 14, w: 76, h: 76, label: '', icon: 'speaker' })
      if (rv.phase === 'ask') riddleChoiceRects(rv.riddle).forEach((r, i) => b.push({ id: 'choice' + i, ...r, label: rv.riddle.choices[i].text ?? '', disabled: rv.wrong.includes(i) }))
      else b.push({ id: 'goon', x: 470, y: HUD_Y + 70, w: 340, h: 74, label: rv.phase === 'wrong' ? 'Try again' : 'Go on', big: true })
      break
    }
    case 'clue': b.push({ id: 'goon', x: 470, y: HUD_Y + 70, w: 340, h: 74, label: 'Go on', big: true }); break
    case 'throne': case 'rank': case 'crown': b.push({ id: 'continue', x: W / 2 - 170, y: H - 100, w: 340, h: 74, label: g.screen === 'throne' ? 'Skip' : 'Continue', big: true }); break
    case 'intro': b.push({ id: 'continue', x: W / 2 - 170, y: H - 100, w: 340, h: 74, label: "Let's go!", big: true }); break
    case 'howto': case 'about': b.push({ id: 'back', x: 20, y: 12, w: 140, h: 68, label: 'Back', icon: '‹' }); break
  }
  return b
}

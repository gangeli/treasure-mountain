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
    const w = 190, h = 150, gap = 24
    const x0 = SCROLL.x + 60
    for (let i = 0; i < n; i++) out.push({ x: x0 + i * (w + gap), y: SCROLL.y + SCROLL.h - h - 40, w, h })
  } else {
    const h = n === 4 ? 66 : 76, gap = 10, w = 560
    const y0 = SCROLL.y + SCROLL.h - 30 - n * h - (n - 1) * gap
    for (let i = 0; i < n; i++) out.push({ x: SCROLL.x + 60, y: y0 + i * (h + gap), w, h })
  }
  return out
}

export function uiButtons(g: Game): Button[] {
  const b: Button[] = []
  if (g.paused) {
    const items = [['p-resume', 'Keep playing', '▶'], ['p-howto', 'How to play', '?'], ['p-sound', g.settings.sound ? 'Sound: on' : 'Sound: off', '♪'], ['p-music', g.settings.music ? 'Music: on' : 'Music: off', '♫'], ['p-quit', 'Quit to title', '⌂']]
    items.forEach(([id, label, icon], i) => b.push({ id, x: W / 2 - 220, y: 200 + i * 78, w: 440, h: 64, label, icon }))
    return b
  }
  switch (g.screen) {
    case 'title':
      b.push({ id: 'play', x: 200, y: 385, w: 340, h: 92, label: 'PLAY', big: true })
      b.push({ id: 'howto', x: 100, y: 505, w: 260, h: 58, label: 'How to play' })
      b.push({ id: 'about', x: 380, y: 505, w: 260, h: 58, label: 'About' })
      b.push({ id: 'sound', x: W - 150, y: 16, w: 60, h: 60, label: '', icon: g.settings.sound ? '♪' : '♪̸', toggled: g.settings.sound })
      b.push({ id: 'music', x: W - 80, y: 16, w: 60, h: 60, label: '', icon: '♫', toggled: g.settings.music })
      if (g.installable && !g.isApp) b.push({ id: 'install', x: 20, y: 16, w: 200, h: 56, label: 'Install app', icon: '⤓' })
      break
    case 'grade':
      b.push({ id: 'back', x: 20, y: 16, w: 130, h: 56, label: 'Back', icon: '‹' })
      break
    case 'clubhouse':
      b.push({ id: 'start', x: W / 2 - 200, y: H - 130, w: 400, h: 90, label: g.canResume() ? 'NEW CLIMB' : 'START CLIMBING', big: true })
      if (g.canResume()) b.push({ id: 'resume', x: W / 2 + 230, y: H - 122, w: 300, h: 74, label: 'Continue climb', icon: '▶' })
      b.push({ id: 'back', x: 20, y: 16, w: 130, h: 56, label: 'Back', icon: '‹' })
      b.push({ id: 'howto', x: W - 230, y: 16, w: 210, h: 56, label: 'How to play', icon: '?' })
      break
    case 'level': {
      const run = g.run!
      const cx = 450, y = HUD_Y + 74, w = 110, h = 74
      b.push({ id: 'net', x: cx, y, w, h, label: `Net`, icon: 'net', disabled: run.nets <= 0 })
      b.push({ id: 'coin', x: cx + w + 12, y, w, h, label: `Coin`, icon: 'coin', disabled: run.coins <= 0 })
      b.push({ id: 'jump', x: cx + 2 * (w + 12), y, w, h, label: 'Jump', icon: 'jump' })
      b.push({ id: 'pause', x: W - 70, y: 12, w: 58, h: 58, label: '', icon: 'pause' })
      break
    }
    case 'castle':
      b.push({ id: 'pause', x: W - 70, y: 12, w: 58, h: 58, label: '', icon: 'pause' })
      break
    case 'riddle': {
      const rv = g.riddle!
      b.push({ id: 'speak', x: SCROLL.x + SCROLL.w - 90, y: SCROLL.y + 20, w: 64, h: 64, label: '', icon: 'speaker' })
      if (rv.phase === 'ask') riddleChoiceRects(rv.riddle).forEach((r, i) => b.push({ id: 'choice' + i, ...r, label: rv.riddle.choices[i].text ?? '', disabled: rv.wrong.includes(i) }))
      else b.push({ id: 'goon', x: 470, y: HUD_Y + 70, w: 340, h: 74, label: rv.phase === 'wrong' ? 'Try again' : 'Go on', big: true })
      break
    }
    case 'clue': b.push({ id: 'goon', x: 470, y: HUD_Y + 70, w: 340, h: 74, label: 'Go on', big: true }); break
    case 'throne': case 'rank': case 'crown': b.push({ id: 'continue', x: W / 2 - 170, y: H - 100, w: 340, h: 74, label: g.screen === 'throne' ? 'Skip' : 'Continue', big: true }); break
    case 'intro': b.push({ id: 'continue', x: W / 2 - 170, y: H - 100, w: 340, h: 74, label: "Let's go!", big: true }); break
    case 'howto': case 'about': b.push({ id: 'back', x: 20, y: 16, w: 130, h: 56, label: 'Back', icon: '‹' }); break
  }
  return b
}

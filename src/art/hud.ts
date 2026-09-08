import { P } from './palette'
import { type Ctx, roundRect, circle, text, line, rr, fillStroke, star, poly, measure } from './draw'
import { W, H, HUD_Y, HUD_H } from '../game/layout'
import type { Game } from '../game/game'
import type { Button } from '../game/ui'
import { drawKey, drawNet } from './characters'

const BOX_Y = HUD_Y + 14
const BOX_H = HUD_H - 26

/** The three-box bottom panel: clue words | prompt / buttons | counters. */
export function drawHud(ctx: Ctx, g: Game, buttons: Button[]): void {
  ctx.fillStyle = P.frame; ctx.fillRect(0, HUD_Y, W, HUD_H)
  const run = g.run
  // Left: clue words
  roundRect(ctx, 14, BOX_Y, 412, BOX_H, 10, P.panel, P.panelLine, 3)
  text(ctx, 'Clue Words:', 32, BOX_Y + 24, { size: 22, color: P.white, weight: 800 })
  drawKey(ctx, 46, BOX_Y + 80, 1.25, !!run?.hasKey)
  const slots: (keyof NonNullable<typeof run>['clues'])[] = ['number', 'descriptor', 'object']
  slots.forEach((s, i) => {
    // A slot to fill rather than a red rule: an underline sat halfway between two labels and read
    // as if it belonged to the one below it.
    const y = BOX_Y + 52 + i * 30
    const w = run?.clues[s]
    roundRect(ctx, 80, y - 14, 322, 28, 8, w ? P.panelDeep : P.panelDeep, w ? P.gold : P.panelLine, w ? 2.5 : 2)
    if (w) text(ctx, w, 96, y, { size: 24, color: P.gold, weight: 800 })
    else { ctx.save(); ctx.globalAlpha = 0.5; text(ctx, ['number', 'what it looks like', 'what it is'][i], 96, y, { size: 16, color: P.bluePale, weight: 600 }); ctx.restore() }
  })
  // Middle: prompt box (buttons drawn by drawButtons)
  roundRect(ctx, 440, BOX_Y, 400, BOX_H, 10, P.panel, P.panelLine, 3)
  const prompt = hudPrompt(g)
  prompt.forEach((l, i) => text(ctx, l, 640, BOX_Y + BOX_H / 2 - (prompt.length - 1) * 16 + i * 32, { size: 24, align: 'center', color: P.white, weight: 800 }))
  // Right: counters
  roundRect(ctx, 854, BOX_Y, 412, BOX_H, 10, P.panel, P.panelLine, 3)
  const cols = [['Coins', run?.coins ?? 0], ['Net', run?.nets ?? 0], ['Treasure', run?.treasures.length ?? 0]] as const
  cols.forEach(([label, val], i) => {
    const cx = 854 + 70 + i * 137
    text(ctx, label, cx, BOX_Y + 22, { size: 20, color: P.white, weight: 800, align: 'center' })
    if (i === 0) coinBag(ctx, cx, BOX_Y + 70)
    else if (i === 1) { ctx.save(); ctx.translate(cx + 4, BOX_Y + 96); ctx.rotate(0.35); drawNet(ctx, 0.45); ctx.restore() }
    else chest(ctx, cx, BOX_Y + 72, g.lvl && run ? g.lvl.level.groups.filter(gp => gp.hides === 'treasure' && run.searched.includes(gp.id)).length : 0, g.lvl ? g.lvl.level.treasures : 0, 0)
    text(ctx, String(val), cx, BOX_Y + 110, { size: 28, color: P.white, weight: 900, align: 'center' })
    if (i < 2) line(ctx, cx + 68, BOX_Y + 10, cx + 68, BOX_Y + BOX_H - 10, P.panelLine, 2)
  })
  drawButtons(ctx, buttons, g)
  // Message bubble above the player's head (clamped to the screen)
  const msg = g.lvl?.message
  if (msg && msg.text.length && g.screen === 'level' && g.lvl) {
    const L = 7680; let d = g.lvl.player.x - g.lvl.camX; d = ((d % L) + L) % L; if (d > L - 400) d -= L
    drawBubble(ctx, msg.text, Math.max(200, Math.min(W - 200, d)), 300 - g.lvl.player.y, 'down')
  }
}

function hudPrompt(g: Game): string[] {
  // The number keys follow the number of answers: grades 3-5 have four, and the hint used to say
  // "press 1, 2, 3" with a fourth button on screen.
  if (g.screen === 'riddle' && g.riddle?.phase === 'ask') {
    const keys = g.riddle.riddle.choices.map((_, i) => i + 1).join(', ')
    return ['Pick the answer!', `Tap it, or press ${keys}`]
  }
  if (g.screen === 'castle') return ['Climb to the top!', 'Tap a ladder']
  return []
}

function coinBag(ctx: Ctx, x: number, y: number): void {
  ctx.beginPath(); ctx.moveTo(x - 10, y - 16); ctx.quadraticCurveTo(x - 30, y + 2, x - 22, y + 24); ctx.quadraticCurveTo(x, y + 36, x + 22, y + 24); ctx.quadraticCurveTo(x + 30, y + 2, x + 10, y - 16); ctx.closePath(); fillStroke(ctx, P.rockLight, P.ink, 2.5)
  roundRect(ctx, x - 12, y - 22, 24, 9, 3, P.brown, P.ink, 2)
  circle(ctx, x + 26, y + 18, 9, P.gold, P.ink, 2); circle(ctx, x + 26, y + 18, 4, P.goldDark, 'rgba(0,0,0,0)', 0)
}

function chest(ctx: Ctx, x: number, y: number, found: number, total: number, _searched: number): void {
  // diamonds above the chest: one per treasure on the level, filled when found
  for (let i = 0; i < total; i++) {
    const dx = x - (total - 1) * 9 + i * 18, dy = y - 26
    const on = i < found
    poly(ctx, [[dx, dy - 7], [dx + 6, dy], [dx, dy + 7], [dx - 6, dy]], on ? P.yellow : P.panel, on ? P.ink : P.bluePale, 1.5)
  }
  roundRect(ctx, x - 22, y - 10, 44, 30, 4, P.gold, P.ink, 2.5)
  roundRect(ctx, x - 24, y - 20, 48, 16, 5, P.goldDark, P.ink, 2.5)
  roundRect(ctx, x - 5, y - 8, 10, 10, 2, P.ink, P.ink, 0)
}

/** Buttons drawn over the pale-blue screens; a blue face would vanish into the sky. */
const OVER_SKY = new Set(['back', 'howto', 'about', 'install', 'sound', 'music'])

export function drawButtons(ctx: Ctx, buttons: Button[], g: Game): void {
  for (const b of buttons) {
    if (b.id.startsWith('choice')) continue // drawn by the riddle screen
    ctx.save()
    if (b.disabled) ctx.globalAlpha = 0.45
    const big = !!b.big
    // Buttons that sit on the blue sky screens get a cream face, or they are blue on blue.
    const onSky = OVER_SKY.has(b.id)
    const fill = big ? P.green : b.toggled === false ? P.rockDark : onSky ? P.cream : P.blue
    const edge = big ? P.greenDark : b.toggled === false ? P.inkSoft : onSky ? '#d8c48c' : P.blueDark
    const label = big ? P.white : b.toggled === false ? P.white : onSky ? P.ink : P.white
    roundRect(ctx, b.x, b.y + 4, b.w, b.h, 14, edge, P.ink, 3)
    roundRect(ctx, b.x, b.y, b.w, b.h - 4, 14, fill, P.ink, 3)
    // Gloss only over the top third, above the cap height, and faded so it cannot cut the text.
    ctx.save()
    const gh = (b.h - 4) * 0.34
    const gg = ctx.createLinearGradient(0, b.y + 4, 0, b.y + 4 + gh)
    gg.addColorStop(0, 'rgba(255,255,255,0.34)'); gg.addColorStop(1, 'rgba(255,255,255,0)')
    rr(ctx, b.x + 6, b.y + 5, b.w - 12, gh, 10); ctx.fillStyle = gg; ctx.fill()
    ctx.restore()
    const cx = b.x + b.w / 2, cy = b.y + (b.h - 4) / 2
    if (b.icon === 'net') { ctx.save(); ctx.translate(cx - 4, cy + 22); ctx.rotate(0.6); drawNet(ctx, 0.34); ctx.restore(); text(ctx, b.label, cx, cy + 22, { size: 15, color: P.white, weight: 800, align: 'center' }) }
    else if (b.icon === 'coin') { circle(ctx, cx, cy - 8, 15, P.gold, P.ink, 2.5); circle(ctx, cx, cy - 8, 8, P.goldDark, 'rgba(0,0,0,0)', 0); text(ctx, b.label, cx, cy + 22, { size: 15, color: P.white, weight: 800, align: 'center' }) }
    else if (b.icon === 'jump') { poly(ctx, [[cx, cy - 22], [cx + 14, cy - 6], [cx + 6, cy - 6], [cx + 6, cy + 6], [cx - 6, cy + 6], [cx - 6, cy - 6], [cx - 14, cy - 6]], P.white, P.ink, 2.5); text(ctx, b.label, cx, cy + 22, { size: 15, color: P.white, weight: 800, align: 'center' }) }
    else if (b.icon === 'pause') { ctx.fillStyle = P.white; ctx.fillRect(cx - 11, cy - 12, 8, 24); ctx.fillRect(cx + 3, cy - 12, 8, 24) }
    else if (b.icon === 'speaker') { poly(ctx, [[cx - 16, cy - 7], [cx - 6, cy - 7], [cx + 4, cy - 17], [cx + 4, cy + 17], [cx - 6, cy + 7], [cx - 16, cy + 7]], P.white, P.ink, 2); ctx.strokeStyle = P.white; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx + 6, cy, 10, -0.9, 0.9); ctx.stroke(); ctx.beginPath(); ctx.arc(cx + 6, cy, 17, -0.9, 0.9); ctx.stroke() }
    else if (b.id === 'back') { poly(ctx, [[b.x + 34, cy - 11], [b.x + 34, cy + 11], [b.x + 19, cy]], label, P.ink, 2); text(ctx, b.label, b.x + 46, cy, { size: 24, color: label, weight: 800 }) }
    else if (b.icon && b.label) { text(ctx, b.icon, b.x + 30, cy, { size: 28, color: label, weight: 800, align: 'center' }); text(ctx, b.label, b.x + 56, cy, { size: big ? 30 : 22, color: label, weight: 800 }) }
    else if (b.icon) { text(ctx, b.icon, cx, cy, { size: 30, color: label, weight: 800, align: 'center' }); if (b.toggled === false) line(ctx, cx - 14, cy + 14, cx + 14, cy - 14, P.red, 4) }
    else text(ctx, b.label, cx, cy, { size: big ? 36 : 24, color: label, weight: 900, align: 'center', font: big ? '"Fredoka","Nunito","Trebuchet MS",sans-serif' : undefined, spacing: big ? 2 : 0 })
    ctx.restore()
  }
  void g
}

/** White speech bubble with a tail. */
export function drawBubble(ctx: Ctx, lines: string[], x: number, y: number, tail: 'down' | 'right' | 'none' = 'down', size = 24, minW = 320): void {
  const w = Math.max(minW, ...lines.map(l => measure(ctx, l, size))) + 56
  const h = lines.length * (size * 1.35) + 34
  const bx = Math.max(16, Math.min(W - w - 16, x - w / 2)), by = y - h
  ctx.beginPath()
  rr(ctx, bx, by, w, h, 22)
  fillStroke(ctx, P.white, P.ink, 3)
  if (tail === 'down') poly(ctx, [[x - 14, by + h - 2], [x + 14, by + h - 2], [x, by + h + 18]], P.white, P.ink, 3)
  ctx.fillStyle = P.white; ctx.fillRect(x - 12, by + h - 4, 24, 5)
  lines.forEach((l, i) => text(ctx, l, bx + w / 2, by + 20 + size * 0.7 + i * size * 1.35, { size, color: P.ink, weight: 700, align: 'center' }))
}

/** Full-screen dim + the pause menu card. */
export function drawPause(ctx: Ctx, buttons: Button[], g: Game): void {
  ctx.fillStyle = 'rgba(10,20,40,0.6)'; ctx.fillRect(0, 0, W, H)
  roundRect(ctx, W / 2 - 280, 110, 560, 500, 24, P.panel, P.panelLine, 4)
  text(ctx, 'Paused', W / 2, 160, { size: 40, color: P.yellow, weight: 900, align: 'center', font: '"Fredoka","Nunito","Trebuchet MS",sans-serif' })
  drawButtons(ctx, buttons, g)
}

/**
 * Earned stars are gold, unearned ones are hollow. Filled-vs-empty is the cue a five-year-old
 * reads; a colour difference alone is not enough, so an unearned star must not look solid.
 * `onDark` swaps the hollow fill for the dark-panel version used inside the HUD.
 */
export function drawStars(ctx: Ctx, x: number, y: number, n: number, max = 7, size = 14, onDark = false): void {
  for (let i = 0; i < max; i++) {
    const earned = i < n
    star(ctx, x + i * (size * 2.2), y, size, earned ? P.yellow : (onDark ? P.panel : P.white), P.ink, 2)
  }
}

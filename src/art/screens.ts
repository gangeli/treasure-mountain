import { P } from './palette'
import { type Ctx, roundRect, circle, ellipse, text, line, poly, vgrad, h1, richText, wrap, measure, star, rr, fillStroke } from './draw'
import { W, H, PLAY_H } from '../game/layout'
import type { Game } from '../game/game'
import { CASTLE_FLOORS, CASTLE_FLOOR_Y, CASTLE_FLOOR_H } from '../game/game'
import type { Button } from '../game/ui'
import { SCROLL, riddleChoiceRects, gradeCardRects } from '../game/ui'
import { drawPlayer, drawElf, drawMaster, drawCrown, drawKey, drawNet } from './characters'
import { drawHud, drawBubble, drawStars } from './hud'
import { drawVisual } from './visuals'
import { drawTreasure, scallop } from './features'
import { drawFrame } from './backgrounds'
import { drawLevelScene } from './render'
import { leaf } from './backgrounds'
import { gradeName, gradeShort, type Grade } from '../content/types'
import { STAR_THRESHOLDS, RANK_NAMES, starsForTotal } from '../game/world'

const DISPLAY = '"Fredoka","Nunito","Trebuchet MS",sans-serif'

export function drawScreen(ctx: Ctx, g: Game, buttons: Button[]): void {
  switch (g.screen) {
    case 'title': title(ctx, g); break
    case 'grade': gradeSelect(ctx, g); break
    case 'clubhouse': clubhouse(ctx, g); break
    case 'intro': intro(ctx, g); break
    case 'riddle': riddle(ctx, g); drawHud(ctx, g, buttons.filter(b => !b.id.startsWith('choice'))); break
    case 'clue': riddle(ctx, g, true); drawHud(ctx, g, buttons); break
    case 'castle': castle(ctx, g); drawHud(ctx, g, buttons); break
    case 'throne': throne(ctx, g); drawHud(ctx, g, []); break
    case 'rank': rank(ctx, g); ctx.fillStyle = P.frame; ctx.fillRect(0, PLAY_H, W, H - PLAY_H); break
    case 'crown': crown(ctx, g); break
    case 'howto': howto(ctx, g); break
    case 'about': about(ctx, g); break
  }
}

// ------------------------------------------------------------------ shared bits
function sky(ctx: Ctx, top = '#5fb0ff', bottom = '#cfefff'): void { ctx.fillStyle = vgrad(ctx, 0, H, top, bottom); ctx.fillRect(0, 0, W, H) }

/** The mountain as seen on the title screen: three terraces spiralling up to the castle. */
export function drawMountain(ctx: Ctx, x: number, y: number, s: number, t: number): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  // rock body
  ctx.beginPath(); ctx.moveTo(-300, 0); ctx.quadraticCurveTo(-260, -160, -170, -300); ctx.quadraticCurveTo(-90, -430, -20, -470); ctx.quadraticCurveTo(80, -430, 150, -300); ctx.quadraticCurveTo(250, -150, 300, 0); ctx.closePath()
  fillStroke(ctx, P.rock, P.ink, 4)
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = P.rockDark; ctx.beginPath(); ctx.moveTo(40, -420); ctx.quadraticCurveTo(140, -300, 300, 0); ctx.lineTo(120, 0); ctx.quadraticCurveTo(100, -200, 40, -420); ctx.closePath(); ctx.fill(); ctx.restore()
  // three green terraces (paths) winding around
  const terraces = [[-280, -30, 560, 60], [-200, -170, 400, 50], [-120, -300, 240, 42]]
  terraces.forEach(([tx, ty, tw, th], i) => {
    ctx.beginPath(); ctx.ellipse(tx + tw / 2, ty, tw / 2, th / 2, 0, 0, Math.PI * 2); ctx.closePath(); fillStroke(ctx, i === 2 ? P.greenLight : P.green, P.ink, 3)
    ctx.fillStyle = P.greenDark; ctx.beginPath(); ctx.ellipse(tx + tw / 2, ty + th * 0.2, tw / 2 - 10, th * 0.2, 0, 0, Math.PI); ctx.fill()
    // tiny trees on each terrace
    for (let k = 0; k < 4 + (2 - i) * 2; k++) { const px = tx + 30 + (k / (4 + (2 - i) * 2)) * (tw - 60); const ph = 26 - i * 4; poly(ctx, [[px - 10, ty], [px, ty - ph], [px + 10, ty]], P.greenDark, P.ink, 2) }
  })
  // snow cap
  ctx.beginPath(); ctx.moveTo(-90, -360); ctx.quadraticCurveTo(-20, -470, 80, -380); ctx.quadraticCurveTo(40, -350, 10, -370); ctx.quadraticCurveTo(-30, -340, -90, -360); ctx.closePath(); fillStroke(ctx, P.snow, P.ink, 3)
  // castle on top
  const cx = -10, cy = -400
  roundRect(ctx, cx - 60, cy - 60, 120, 70, 6, P.rockLight, P.ink, 3)
  for (const s2 of [-1, 1]) { roundRect(ctx, cx + s2 * 62 - 16, cy - 100, 32, 110, 4, P.rockLight, P.ink, 3); for (let k = 0; k < 3; k++) ctx.fillRect(cx + s2 * 62 - 14 + k * 11, cy - 110, 7, 10); poly(ctx, [[cx + s2 * 62 - 18, cy - 100], [cx + s2 * 62, cy - 140], [cx + s2 * 62 + 18, cy - 100]], P.blue, P.ink, 3) }
  roundRect(ctx, cx - 14, cy - 40, 28, 50, 12, P.ink, P.ink, 0)
  roundRect(ctx, cx - 40, cy - 46, 16, 20, 4, P.cyanPale, P.ink, 2); roundRect(ctx, cx + 24, cy - 46, 16, 20, 4, P.cyanPale, P.ink, 2)
  line(ctx, cx, cy - 60, cx, cy - 100, P.ink, 3); poly(ctx, [[cx, cy - 100], [cx + 26, cy - 92], [cx, cy - 84]], P.red, P.ink, 2)
  // clubhouse at the foot
  roundRect(ctx, -250, -20, 70, 40, 4, P.wood, P.ink, 3); poly(ctx, [[-260, -20], [-215, -50], [-170, -20]], P.woodDark, P.ink, 3)
  // winding path
  ctx.strokeStyle = P.cream; ctx.lineWidth = 8; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(-200, 0); ctx.quadraticCurveTo(-120, -60, 80, -40); ctx.quadraticCurveTo(220, -60, 120, -150); ctx.quadraticCurveTo(0, -200, -150, -170); ctx.quadraticCurveTo(-200, -250, -40, -290); ctx.quadraticCurveTo(70, -300, 30, -340); ctx.stroke()
  ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; ctx.setLineDash([6, 8]); ctx.stroke(); ctx.setLineDash([])
  // an elf peeking
  drawElf(ctx, -150 + Math.sin(t) * 6, -170, 1, 'dance', t, 1, 'scroll')
  ctx.restore()
}

// ------------------------------------------------------------------ title
function title(ctx: Ctx, g: Game): void {
  const t = g.time
  sky(ctx)
  // sun and clouds
  circle(ctx, 1100, 110, 60, P.yellow, 'rgba(0,0,0,0)', 0)
  ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#fff'; for (let i = 0; i < 5; i++) { const cx = ((i * 330 + t * 12) % (W + 300)) - 150, cy = 80 + (i % 3) * 60; ctx.beginPath(); ctx.arc(cx, cy, 34, 0, 7); ctx.arc(cx + 40, cy - 14, 44, 0, 7); ctx.arc(cx + 90, cy, 32, 0, 7); ctx.fill() } ctx.restore()
  // ground
  ctx.fillStyle = P.grass; ctx.fillRect(0, 600, W, H - 600); ctx.fillStyle = P.grassDark; ctx.fillRect(0, 600, W, 6)
  drawMountain(ctx, 1040, 600, 0.8, t)
  // stone-framed panel with the logo, like the original
  roundRect(ctx, 60, 50, 620, 300, 26, P.rockDark, P.ink, 4)
  roundRect(ctx, 82, 72, 576, 256, 18, P.scroll, P.scrollEdge, 4)
  text(ctx, 'A Super Solvers Adventure', 370, 110, { size: 22, align: 'center', color: P.purpleDark, weight: 800, spacing: 1 })
  ctx.save(); ctx.translate(370, 210); ctx.rotate(-0.03)
  text(ctx, 'TREASURE', 0, -40, { size: 84, align: 'center', color: P.orange, weight: 900, font: DISPLAY, outline: P.ink, outlineWidth: 10, spacing: 2 })
  text(ctx, 'TREASURE', 0, -46, { size: 84, align: 'center', color: P.yellow, weight: 900, font: DISPLAY, spacing: 2 })
  text(ctx, 'MOUNTAIN!', 0, 44, { size: 84, align: 'center', color: P.redDark, weight: 900, font: DISPLAY, outline: P.ink, outlineWidth: 10, spacing: 2 })
  text(ctx, 'MOUNTAIN!', 0, 38, { size: 84, align: 'center', color: P.red, weight: 900, font: DISPLAY, spacing: 2 })
  ctx.restore()
  text(ctx, 'Catch elves · Solve riddles · Find the treasure', 370, 298, { size: 22, align: 'center', color: P.blueDark, weight: 800 })
  // the Super Solver strolling towards the mountain
  drawPlayer(ctx, 730 + Math.sin(t * 0.5) * 20, 600, 1, 'walk', t, t * 120)
  text(ctx, 'Grades K-5 · free · no ads · works offline', W / 2, H - 22, { size: 18, align: 'center', color: P.white, weight: 700, outline: P.grassDark, outlineWidth: 4 })
}

// ------------------------------------------------------------------ grade select
/** Cream on dark fills, navy on light ones (relative luminance, WCAG weights). */
function readableOn(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  const lin = (c: number) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4) }
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255)
  return L > 0.42 ? P.ink : P.cream
}

/** The Trainee badge: a little knapsack, so every grade card has something in the badge slot. */
function drawKnapsack(ctx: Ctx, x: number, y: number): void {
  roundRect(ctx, x - 20, y - 18, 40, 38, 10, P.brown)
  ctx.fillStyle = P.brownDark; ctx.fillRect(x - 20, y - 2, 40, 7)
  roundRect(ctx, x - 11, y - 30, 22, 14, 6, P.brownLight, P.ink, 2.5)
  roundRect(ctx, x - 6, y + 4, 12, 11, 3, P.gold, P.ink, 2)
  ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(x - 14, y - 16); ctx.quadraticCurveTo(x - 24, y - 2, x - 15, y + 12); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x + 14, y - 16); ctx.quadraticCurveTo(x + 24, y - 2, x + 15, y + 12); ctx.stroke()
}

function gradeSelect(ctx: Ctx, g: Game): void {
  sky(ctx, '#3c7dd9', '#9fd0ff')
  // A low mountain band behind the cards, so the entry screen reads as the way into the game.
  ctx.save(); ctx.globalAlpha = 0.35
  ctx.fillStyle = '#2f6fb8'
  ctx.beginPath(); ctx.moveTo(0, H)
  for (let x = 0; x <= W; x += 24) ctx.lineTo(x, 560 - 90 * Math.abs(Math.sin(x / 420)) - 40 * Math.abs(Math.sin(x / 150 + 1.2)))
  ctx.lineTo(W, H); ctx.closePath(); ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#3f8f45'; ctx.fillRect(0, 660, W, H - 660)
  ctx.fillStyle = '#57a851'; ctx.fillRect(0, 660, W, 7)

  text(ctx, 'Who is climbing today?', W / 2, 90, { size: 54, align: 'center', color: P.yellow, weight: 900, font: DISPLAY, outline: P.ink, outlineWidth: 8 })
  text(ctx, 'Pick your grade. Each grade keeps its own treasures and stars.', W / 2, 145, { size: 22, align: 'center', color: P.white, weight: 700 })
  // Small, and behind the cards, so they sit inside the grass band instead of being clipped.
  ctx.save(); ctx.translate(96, 702); ctx.scale(0.66, 0.66); drawElf(ctx, 0, 0, 1, 'dance', g.time, 1, 'scroll'); ctx.restore()
  ctx.save(); ctx.translate(W - 120, 702); ctx.scale(0.62, 0.62); drawPlayer(ctx, 0, 0, -1, 'idle', g.time, 0); ctx.restore()
  const cards = gradeCardRects()
  const colors = [P.pink, P.orange, P.yellow, P.green, P.cyan, P.purple]
  cards.forEach((c, i) => {
    const prof = g.profiles[i]
    roundRect(ctx, c.x, c.y + 6, c.w, c.h, 22, P.ink, P.ink, 0)
    // Body first, then the header clipped to the card so its bottom corners cannot round away
    // and leave a sliver of cream; the outline is stroked last, so the border is one clean line.
    rr(ctx, c.x, c.y, c.w, c.h, 22)
    ctx.fillStyle = P.cream; ctx.fill()
    ctx.save(); ctx.clip()
    ctx.fillStyle = colors[i]; ctx.fillRect(c.x, c.y, c.w, 64)
    ctx.restore()
    line(ctx, c.x, c.y + 64, c.x + c.w, c.y + 64, P.ink, 4)
    rr(ctx, c.x, c.y, c.w, c.h, 22); ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke()
    // Cream on the dark headers, navy on the light ones; navy on purple was 2.7:1.
    const headText = readableOn(colors[i])
    text(ctx, i === 0 ? 'K' : gradeShort(i as Grade), c.x + 50, c.y + 34, { size: 40, align: 'center', color: headText, weight: 900, font: DISPLAY })
    text(ctx, gradeName(i as Grade), c.x + 96, c.y + 34, { size: 28, color: headText, weight: 900, font: DISPLAY })
    const stars = prof ? starsForTotal(prof.total) : 0
    drawStars(ctx, c.x + 36, c.y + 100, stars, 7, 13)
    text(ctx, RANK_NAMES[stars], c.x + 24, c.y + 140, { size: 22, color: P.inkSoft, weight: 800 })
    text(ctx, `${prof?.total ?? 0} treasures`, c.x + 24, c.y + 172, { size: 20, color: P.inkSoft, weight: 700 })
    // Every card carries a badge in the same slot, so the untouched grades do not look unfinished.
    if (prof?.crown) drawCrown(ctx, c.x + c.w - 50, c.y + 150, 22)
    else if (prof && prof.prizes.length) drawTreasure(ctx, prof.prizes[prof.prizes.length - 1], c.x + c.w - 50, c.y + 150, 0.8)
    else drawKnapsack(ctx, c.x + c.w - 50, c.y + 158)
  })
}

// ------------------------------------------------------------------ clubhouse
function clubhouse(ctx: Ctx, g: Game): void {
  const t = g.time
  // wooden interior
  ctx.fillStyle = '#c98a4b'; ctx.fillRect(0, 0, W, H)
  ctx.strokeStyle = '#a86d33'; ctx.lineWidth = 3; for (let y = 0; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
  ctx.fillStyle = '#7a4a1f'; ctx.fillRect(0, 500, W, H - 500); ctx.fillStyle = '#93602c'; for (let x = 0; x < W; x += 120) ctx.fillRect(x, 500, 110, 220)
  // window with the mountain outside
  roundRect(ctx, 60, 60, 300, 220, 14, P.skyTop, P.ink, 5)
  ctx.save(); ctx.beginPath(); rr(ctx, 60, 60, 300, 220, 14); ctx.clip(); ctx.fillStyle = P.skyBottom; ctx.fillRect(60, 160, 300, 120); drawMountainSmall(ctx, 210, 280, 0.42, t); ctx.restore()
  line(ctx, 210, 60, 210, 280, P.ink, 5); line(ctx, 60, 170, 360, 170, P.ink, 5)
  // rank poster
  poster(ctx, 640, 80, g)
  // prize shelf
  text(ctx, prizesLabel(g), 210, 318, { size: 20, align: 'center', color: P.cream, weight: 800 })
  roundRect(ctx, 50, 400, 320, 16, 4, '#5c3a17', P.ink, 3)
  roundRect(ctx, 50, 480, 320, 16, 4, '#5c3a17', P.ink, 3)
  const prizes = g.profile().prizes.slice(-10)
  prizes.forEach((p, i) => drawTreasure(ctx, p, 84 + (i % 5) * 63, (i < 5 ? 400 : 480) - 28, 0.75))
  // doorway to the mountain
  roundRect(ctx, 1030, 110, 200, 460, 26, P.woodDark, P.ink, 4)
  ctx.save(); ctx.beginPath(); rr(ctx, 1048, 128, 164, 442, 18); ctx.clip(); ctx.fillStyle = vgrad(ctx, 128, 570, P.skyTop, P.skyBottom); ctx.fillRect(1048, 128, 164, 442); ctx.fillStyle = P.grass; ctx.fillRect(1048, 440, 164, 130); ctx.fillStyle = P.grassDark; ctx.fillRect(1048, 440, 164, 6); drawMountain(ctx, 1160, 440, 0.32, t); ctx.restore()
  roundRect(ctx, 1048, 128, 164, 442, 18, 'rgba(0,0,0,0)', P.ink, 3)
  text(ctx, 'to the mountain →', 1130, 92, { size: 20, align: 'center', color: P.cream, weight: 800 })
  // the Super Solver waiting by the door
  drawPlayer(ctx, 968, 570, 1, 'idle', t, 0)
  if (!g.profile().ascents && !g.canResume()) drawBubble(ctx, ['Welcome to the clubhouse, Super Solver!', "The Master of Mischief stole the crown. Let's climb the mountain!"], 640, 96, 'none', 21, 700)
}

function drawMountainSmall(ctx: Ctx, x: number, y: number, s: number, t: number): void { drawMountain(ctx, x, y, s, t) }
function prizesLabel(g: Game): string { const n = g.profile().prizes.length; return n === 0 ? 'My prizes (none yet)' : n === 1 ? 'My prize' : `My prizes (${n})` }

/** The rank poster with the seven thresholds. */
function poster(ctx: Ctx, x: number, y: number, g: Game, animTotal?: number): void {
  const prof = g.profile()
  const total = animTotal ?? prof.total
  const w = 560, h = 450
  // trapezoid poster
  poly(ctx, [[x - w / 2 + 40, y], [x + w / 2 - 40, y], [x + w / 2, y + h], [x - w / 2, y + h]], P.cream, P.ink, 4)
  poly(ctx, [[x - w / 2 + 60, y + 60], [x + w / 2 - 60, y + 60], [x + w / 2 - 20, y + h - 120], [x - w / 2 + 20, y + h - 120]], P.scroll, P.scrollEdge, 3)
  text(ctx, gradeName(g.grade), x, y + 32, { size: 30, align: 'center', color: P.ink, weight: 900, font: DISPLAY })
  const rows = [...STAR_THRESHOLDS].reverse()
  rows.forEach((th, i) => {
    const ry = y + 78 + i * 34
    const reached = total >= th
    // The poster is a trapezoid that widens downward, so its rules have to widen with it: they were
    // narrowing, and crossed the panel edge they were meant to sit inside.
    line(ctx, x - w / 2 + 76 - i * 5, ry + 16, x + w / 2 - 76 + i * 5, ry + 16, P.scrollEdge, 2)
    text(ctx, String(th), x - w / 2 + 110, ry, { size: 24, align: 'right', color: reached ? P.blueDark : P.inkSoft, weight: 900 })
    text(ctx, RANK_NAMES[7 - i], x - w / 2 + 130, ry, { size: 20, color: reached ? P.blueDark : P.inkSoft, weight: 800 })
    if (reached) star(ctx, x + w / 2 - 110 + i * 5, ry, 11, P.yellow, P.ink, 2)
  })
  const stars = starsForTotal(total)
  roundRect(ctx, x - w / 2 + 40, y + h - 112, w - 80, 34, 6, P.pink, P.ink, 3)
  text(ctx, RANK_NAMES[stars], x, y + h - 95, { size: 24, align: 'center', color: P.white, weight: 900 })
  roundRect(ctx, x - w / 2 + 30, y + h - 70, w - 60, 40, 6, P.white, P.ink, 3)
  text(ctx, `Total Treasures   ${total}`, x, y + h - 50, { size: 26, align: 'center', color: P.ink, weight: 900 })
}

// ------------------------------------------------------------------ intro
function intro(ctx: Ctx, g: Game): void {
  const t = g.time
  sky(ctx)
  ctx.fillStyle = P.grass; ctx.fillRect(0, 600, W, H - 600)
  drawMountain(ctx, 1040, 600, 0.8, t)
  roundRect(ctx, 60, 60, 640, 470, 26, P.rockDark, P.ink, 4)
  roundRect(ctx, 82, 82, 596, 426, 18, P.scroll, P.scrollEdge, 4)
  const lines = ['The Master of Mischief has stolen', 'the crown and hidden the treasures', 'all over Treasure Mountain!', '', 'The elves can help you. Catch them in', 'your net to get coins and clue words.', 'They will help you find treasures', 'and the keys.', '', 'As the treasure chest is filled, you will', 'earn your stars, win the crown, and', 'save Treasure Mountain!']
  lines.forEach((l, i) => text(ctx, l, 110, 118 + i * 30, { size: 25, color: P.ink, weight: 800 }))
  drawPlayer(ctx, 740 + Math.sin(t * 0.7) * 20, 600, 1, 'walk', t, t * 120)
}

// ------------------------------------------------------------------ riddle scroll
function riddle(ctx: Ctx, g: Game, clueMode = false): void {
  const rv = g.riddle!
  const r = rv.riddle
  const t = g.time
  // backdrop: the level, dimmed
  if (g.lvl) drawLevelScene(ctx, g)
  ctx.fillStyle = 'rgba(8,20,40,0.55)'; ctx.fillRect(0, 0, W, PLAY_H)
  // scroll paper
  const S = SCROLL
  roundRect(ctx, S.x, S.y + 8, S.w, S.h, 28, P.scrollEdge, P.ink, 0)
  roundRect(ctx, S.x, S.y, S.w, S.h, 28, P.scroll, P.ink, 4)
  // rolled ends
  for (const side of [S.x + 14, S.x + S.w - 14]) { roundRect(ctx, side - 14, S.y - 10, 28, S.h + 20, 14, P.cream, P.ink, 3); ctx.fillStyle = P.yellowDark; ctx.fillRect(side - 8, S.y - 4, 16, 6); ctx.fillRect(side - 8, S.y + S.h - 2, 16, 6) }
  // vines in the corners
  // The top-left vine hangs straight down the margin: at 0.4 it grew into the first line of text.
  for (const [vx, vy, rot] of [[S.x + 34, S.y + 18, 1.5], [S.x + S.w - 60, S.y + 18, 2.6], [S.x + 40, S.y + S.h - 20, -0.6]]) {
    for (let k = 0; k < 4; k++) leaf(ctx, vx + Math.cos(rot) * k * 22, vy + Math.sin(rot) * k * 22, 10, rot + (k % 2 ? 0.9 : -0.9), k % 2 ? P.leafLight : P.leaf)
  }
  // the elf dancing at the right edge
  drawElf(ctx, S.x + S.w - 110, S.y + S.h - 40, -1, rv.phase === 'reveal' ? 'run' : 'dance', t, ((rv as any).elfId ?? 0) % 3, 'none')
  // prompt text (with visual)
  const hasVisual = !!r.visual
  const promptX = S.x + 60, promptY = S.y + 60
  const textW = hasVisual ? 570 : S.w - 250
  const rects = riddleChoiceRects(r)
  // The biggest type at which the wrapped prompt still stops short of the first answer button. A
  // four-line prompt at 38px used to run underneath it, and the last line was unreadable.
  const ceiling = Math.min(...rects.map(rc => rc.y)) - 14
  let size = 24
  let rows: string[] = []
  for (const sz of [46, 42, 38, 34, 30, 28, 26, 24]) {
    size = sz
    rows = r.prompt.flatMap(l => wrap(ctx, l, textW, sz))
    if (promptY - sz / 2 + rows.length * sz * 1.3 <= ceiling) break
  }
  let y = promptY
  for (const l of rows) { richText(ctx, l, promptX, y, size, P.ink, r.highlight ?? [], P.redDark); y += size * 1.3 }
  if (r.visual) drawVisual(ctx, r.visual, S.x + 640, S.y + 30, 440, 250)
  // choices
  rects.forEach((rc, i) => {
    const c = r.choices[i]
    const wrong = rv.wrong.includes(i)
    const isAnswer = i === r.answer
    const showRight = (rv.phase === 'right' || rv.phase === 'reveal') && isAnswer
    const selected = rv.selected === i && rv.phase === 'ask'
    let fill = P.cream, edge: string = P.ink
    if (wrong) { fill = '#d9d9d9'; edge = P.rockDark }
    if (showRight) { fill = P.greenLight; edge = P.greenDark }
    if (selected) edge = P.red
    roundRect(ctx, rc.x, rc.y, rc.w, rc.h, 14, fill, edge, selected || showRight ? 5 : 3)
    if (c.visual) drawVisual(ctx, c.visual, rc.x + 8, rc.y + 8, rc.w - 16, rc.h - 16)
    else {
      const tx = rc.w <= 500 ? rc.x + 46 : rc.x + 26
      const room = rc.w - (tx - rc.x) - 18
      let ts = (c.text ?? '').length > 18 ? 26 : 32
      while (ts > 15 && measure(ctx, c.text ?? '', ts, 800) > room) ts -= 1
      text(ctx, c.text ?? '', tx, rc.y + rc.h / 2, { size: ts, color: wrong ? P.rockDark : P.ink, weight: 800 })
    }
    if (wrong) line(ctx, rc.x + 14, rc.y + rc.h / 2, rc.x + rc.w - 14, rc.y + rc.h / 2, P.red, 4)
    if (showRight) { circle(ctx, rc.x + rc.w - 26, rc.y + rc.h / 2, 16, P.green, P.ink, 2.5); line(ctx, rc.x + rc.w - 34, rc.y + rc.h / 2, rc.x + rc.w - 28, rc.y + rc.h / 2 + 7, P.white, 4); line(ctx, rc.x + rc.w - 28, rc.y + rc.h / 2 + 7, rc.x + rc.w - 16, rc.y + rc.h / 2 - 8, P.white, 4) }
    // Picture answers sit in a row, so their number goes inside the card: to the left it landed on
    // the neighbouring card's border.
    if (rv.phase === 'ask' && !wrong) {
      // Inside the card for pictures and for the two-column layout, where a badge to the left of
      // the second column would sit on the first column's button.
      const inside = !!c.visual || rc.w <= 500
      const bx = inside ? rc.x + 22 : rc.x - 24, by = c.visual ? rc.y + 22 : inside ? rc.y + rc.h / 2 : rc.y + rc.h / 2
      circle(ctx, bx, by, 14, P.scrollEdge, P.ink, 2)
      text(ctx, String(i + 1), bx, by + 1, { size: 18, align: 'center', color: P.white, weight: 900 })
    }
  })
  // feedback bubbles
  if (clueMode || rv.phase === 'right') {
    const lines = rv.clueWord ? ['Good job, Super Solver!', 'You have won a clue word', 'to help you find the key:'] : ['Good job, Super Solver!', 'You earned 2 coins.']
    bigBubble(ctx, lines, rv.clueWord)
  } else if (rv.phase === 'wrong') bigBubble(ctx, ['Oops, not that one.', rv.triesLeft > 0 ? `Try again! (${rv.triesLeft} ${rv.triesLeft === 1 ? 'try' : 'tries'} left)` : ''])
  else if (rv.phase === 'reveal') bigBubble(ctx, ['The answer was:', '', 'The elf runs away. Catch another', 'elf to try a new riddle!'], r.choices[r.answer].text ?? '(picture)', 1)
  drawFrame(ctx)
}

function bigBubble(ctx: Ctx, lines: string[], word?: string, wordLine = lines.length): void {
  // Sits above the answer buttons (which start at y 258), so the child can still see which choice
  // was the right one while the bubble congratulates them.
  const w = 760, h = 214, x = W / 2 - w / 2, y = 34
  ctx.save(); ctx.globalAlpha = 0.98
  scallop(ctx, x + w / 2, y + h / 2, w / 2 - 30, h / 2 - 14, 16)
  fillStroke(ctx, P.white, P.ink, 3)
  ctx.restore()
  const filtered = lines.filter((l, i) => l !== '' || i === wordLine - 1)
  filtered.forEach((l, i) => text(ctx, l, W / 2, y + 46 + i * 36, { size: 28, align: 'center', color: P.ink, weight: 800 }))
  if (word) text(ctx, word, W / 2, y + 48 + Math.min(wordLine, filtered.length) * 36, { size: 38, align: 'center', color: P.redDark, weight: 900, font: DISPLAY })
}

// ------------------------------------------------------------------ castle
function castle(ctx: Ctx, g: Game): void {
  const c = g.castle!
  const t = g.time
  ctx.fillStyle = '#4a5f8e'; ctx.fillRect(0, 0, W, PLAY_H)
  // stone wall
  ctx.strokeStyle = '#33456d'; ctx.lineWidth = 2
  for (let r = 0; r < 20; r++) for (let k = 0; k < 14; k++) { const sx = k * 100 + (r % 2) * 50 - 50, sy = r * 30; ctx.fillStyle = (r + k) % 3 === 0 ? '#54699a' : '#4a5f8e'; ctx.fillRect(sx, sy, 96, 26); ctx.strokeRect(sx, sy, 96, 26) }
  // portraits of the Master of Mischief on the walls
  for (let f = 1; f < CASTLE_FLOORS; f++) for (const px of (f === CASTLE_FLOORS - 1 ? [160, 640] : [160, 640, 1120])) { const py = CASTLE_FLOOR_Y(f) - 70; roundRect(ctx, px - 26, py - 30, 52, 60, 4, P.goldDark, P.ink, 3); roundRect(ctx, px - 20, py - 24, 40, 48, 2, P.purplePale, P.ink, 2); drawMaster(ctx, px, py + 24, t, 'smug', 0.22) }
  // floors
  for (let f = 0; f < CASTLE_FLOORS; f++) {
    const fy = CASTLE_FLOOR_Y(f)
    roundRect(ctx, -10, fy, W + 20, 18, 0, P.woodDark, P.ink, 3)
    ctx.fillStyle = P.wood; for (let x = 0; x < W; x += 80) ctx.fillRect(x + 4, fy + 4, 72, 10)
  }
  // ladders
  c.ladders.forEach((l, i) => {
    const y0 = CASTLE_FLOOR_Y(l.floor), y1 = CASTLE_FLOOR_Y(l.floor + 1) + 18
    const top = l.trick ? y0 - CASTLE_FLOOR_H * 0.62 : y1
    for (const s of [-1, 1]) line(ctx, l.x + s * 22, y0, l.x + s * 22, top, P.ink, 8), line(ctx, l.x + s * 22, y0, l.x + s * 22, top, l.trick ? P.rockDark : P.wood, 4)
    for (let ry = y0 - 16; ry > top + 6; ry -= 22) { line(ctx, l.x - 22, ry, l.x + 22, ry, P.ink, 6); line(ctx, l.x - 22, ry, l.x + 22, ry, l.trick ? P.rockDark : P.wood, 3) }
    if (l.trick) { line(ctx, l.x - 26, top + 4, l.x - 8, top - 14, P.ink, 4); line(ctx, l.x + 26, top + 4, l.x + 10, top - 12, P.ink, 4) }
    void i
  })
  // holes with the Master's arm
  for (const h of c.holes) {
    const hy = CASTLE_FLOOR_Y(h.floor) - 60
    // A recess in the wall, not a flat black disc: a stone rim with a lit top edge and a dark
    // opening, so it still reads as a hole when the Master's arm is not out.
    circle(ctx, h.x, hy, 32, '#3a4c78', P.ink, 3)
    ctx.save(); ctx.strokeStyle = '#6f84b8'; ctx.lineWidth = 3
    ctx.beginPath(); ctx.arc(h.x, hy, 28, Math.PI * 1.05, Math.PI * 1.85); ctx.stroke(); ctx.restore()
    circle(ctx, h.x, hy + 2, 23, '#16203a', 'rgba(0,0,0,0)', 0)
    if (h.active) { const k = Math.sin(((h.t % 3) - 2.1) / 0.9 * Math.PI); const len = Math.max(0, k) * 90; roundRect(ctx, h.x - 12, hy - 10, len + 12, 22, 10, P.purple, P.ink, 3); circle(ctx, h.x + len + 4, hy, 14, P.skin, P.ink, 3) }
  }
  // throne room door on the top floor
  const dy = CASTLE_FLOOR_Y(CASTLE_FLOORS - 1)
  roundRect(ctx, 1000, dy - 140, 100, 140, 40, P.ink, P.ink, 0)
  roundRect(ctx, 1008, dy - 132, 84, 132, 34, c.state === 'door' ? P.yellow : '#7a5a2a', P.ink, 3)
  drawKey(ctx, 1050, dy - 76, 1.2, true)
  roundRect(ctx, 1012, dy - 124, 76, 24, 5, P.cream, P.ink, 2.5)
  text(ctx, 'THRONE', 1050, dy - 112, { size: 13, align: 'center', color: P.purpleDark, weight: 900 })
  // the Super Solver
  const py = CASTLE_FLOOR_Y(c.floor) - (c.state === 'climb' || c.state === 'fall' ? c.y : 0)
  drawPlayer(ctx, c.x, py, c.facing, c.state === 'climb' ? 'climb' : c.state === 'fall' ? 'fall' : c.state === 'hit' ? 'hit' : 'idle', c.t, 0)
  if (c.floor === 0 && c.t < 4 && c.state === 'walk') drawBubble(ctx, ['Climb the ladders to the throne room!', 'Tap a ladder to climb it. Gray ladders are tricks!'], 640, 330, 'none')
  drawFrame(ctx)
}

// ------------------------------------------------------------------ throne room cutscene
function throne(ctx: Ctx, g: Game): void {
  const t = g.time, step = g.sceneStep, st = g.sceneT
  ctx.fillStyle = '#3d5081'; ctx.fillRect(0, 0, W, PLAY_H)
  ctx.strokeStyle = '#2b3a63'; ctx.lineWidth = 2
  for (let r = 0; r < 14; r++) for (let k = 0; k < 14; k++) { const sx = k * 100 + (r % 2) * 50 - 50, sy = r * 30; ctx.fillStyle = (r + k) % 3 === 0 ? '#4a5f96' : '#3d5081'; ctx.fillRect(sx, sy, 96, 26); ctx.strokeRect(sx, sy, 96, 26) }
  // floor
  ctx.fillStyle = P.woodDark; ctx.fillRect(0, 420, W, PLAY_H - 420); ctx.fillStyle = P.wood; for (let x = 0; x < W; x += 90) ctx.fillRect(x + 4, 426, 82, PLAY_H - 430)
  // window with the Master of Mischief (until blown off)
  roundRect(ctx, 100, 80, 220, 230, 30, P.ink, P.ink, 0)
  ctx.fillStyle = step >= 5 ? P.skyTop : '#1c2848'; ctx.fillRect(112, 92, 196, 206)
  if (step < 5) drawMaster(ctx, 210, 300, t, step >= 3 ? 'angry' : 'smug', 0.85)
  else if (step === 5) { const k = Math.min(1, st / 1.8); drawMaster(ctx, 210 + k * 900, 300 - Math.sin(k * Math.PI) * 300 + k * 200, t, 'blown', 0.85 * (1 - k * 0.6)) }
  roundRect(ctx, 100, 80, 220, 230, 30, 'rgba(0,0,0,0)', P.rockLight, 8)
  // The fountain: a stone basin, a column, an upper bowl and a jet of water falling back into it.
  // (It was a green box with a blue ball on top, which read as an unfinished shape.)
  const fx = 640
  roundRect(ctx, 566, 368, 148, 52, 14, P.rockLight, P.ink, 3)
  ctx.fillStyle = P.rockDark; ctx.fillRect(572, 404, 136, 8)
  ellipse(ctx, fx, 368, 76, 15, P.cyan, P.ink, 3)
  ctx.save(); ctx.globalAlpha = 0.45; ellipse(ctx, fx - 22, 365, 22, 5, P.white, 'rgba(0,0,0,0)', 0); ctx.restore()
  roundRect(ctx, fx - 15, 318, 30, 54, 8, P.rockLight, P.ink, 3)
  ellipse(ctx, fx, 316, 48, 13, P.rockLight, P.ink, 3)
  ellipse(ctx, fx, 314, 34, 7, P.cyan, P.ink, 2)
  // Water: a welling jet above the bowl, drips off its rim, and ripples in the basin. (Drawn as
  // arcs, the falling water read as a basket handle over a tub.)
  const jet = 24 + Math.sin(t * 3) * 4
  ctx.beginPath(); ctx.moveTo(fx - 7, 314); ctx.quadraticCurveTo(fx, 314 - jet * 1.5, fx + 7, 314); ctx.closePath()
  fillStroke(ctx, P.cyan, P.ink, 2)
  ctx.save(); ctx.strokeStyle = P.cyan; ctx.lineWidth = 4; ctx.lineCap = 'round'
  for (const side of [-1, 1]) {
    const drip = ((t * 60 + (side > 0 ? 20 : 0)) % 46)
    ctx.beginPath(); ctx.moveTo(fx + side * 40, 322 + drip); ctx.lineTo(fx + side * 40, 330 + drip); ctx.stroke()
  }
  ctx.globalAlpha = 0.5; ctx.strokeStyle = P.white; ctx.lineWidth = 2
  for (const r of [26, 46]) { ctx.beginPath(); ctx.ellipse(fx, 370, r, r * 0.2, 0, 0, Math.PI * 2); ctx.stroke() }
  ctx.restore()
  // The slide back down: a chute out through the wall, with a rail and legs under it.
  roundRect(ctx, 958, 268, 46, 84, 14, '#1c2848', P.ink, 3)
  ctx.beginPath()
  ctx.moveTo(986, 300); ctx.bezierCurveTo(1080, 306, 1120, 372, 1268, 392)
  ctx.lineTo(1268, 428); ctx.bezierCurveTo(1120, 408, 1080, 342, 986, 336)
  ctx.closePath(); fillStroke(ctx, P.cyan, P.ink, 3)
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = P.cyanDark
  ctx.beginPath(); ctx.moveTo(986, 330); ctx.bezierCurveTo(1080, 336, 1120, 402, 1268, 422); ctx.lineTo(1268, 428)
  ctx.bezierCurveTo(1120, 408, 1080, 342, 986, 336); ctx.closePath(); ctx.fill(); ctx.restore()
  ctx.save(); ctx.strokeStyle = P.cyanDark; ctx.lineWidth = 7; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(990, 288); ctx.bezierCurveTo(1084, 294, 1124, 360, 1268, 380); ctx.stroke(); ctx.restore()
  for (const [lx, ly] of [[1096, 372], [1210, 404]]) { ctx.fillStyle = P.rockDark; ctx.fillRect(lx, ly, 10, 420 - ly); ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.strokeRect(lx, ly, 10, 420 - ly) }
  roundRect(ctx, 1010, 246, 96, 30, 8, P.cream, P.ink, 3)
  text(ctx, 'SLIDE', 1058, 261, { size: 18, align: 'center', color: P.ink, weight: 900 })
  // treasure chest
  const open = step >= 2
  roundRect(ctx, 330, 330, 200, 90, 12, P.pink, P.ink, 4)
  ctx.fillStyle = P.magenta; ctx.fillRect(340, 370, 180, 10)
  if (open) { poly(ctx, [[330, 330], [530, 330], [520, 260], [340, 260]], P.pink, P.ink, 4); ctx.fillStyle = P.gold; ctx.fillRect(345, 322, 170, 10) }
  else roundRect(ctx, 326, 300, 208, 40, 14, P.magenta, P.ink, 4)
  roundRect(ctx, 420, 340, 20, 22, 4, P.gold, P.ink, 2.5)
  // treasures flying into the chest during step 2, then a glow
  const treasures = g.run?.treasures ?? []
  if (step === 2) treasures.forEach((name, i) => { const k = Math.max(0, Math.min(1, (st - i * 0.15) / 1.2)); const x0 = 900, y0 = 300, x1 = 430, y1 = 300; drawTreasure(ctx, name, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 160, 1 - k * 0.3) })
  if (step >= 2) { ctx.save(); ctx.globalAlpha = 0.6 + Math.sin(t * 6) * 0.2; for (let i = 0; i < 5; i++) star(ctx, 360 + i * 36, 290 - (i % 2) * 20, 9, P.yellow, 'rgba(0,0,0,0)', 0, 4); ctx.restore() }
  // the Super Solver
  const px = step === 0 ? 1100 - Math.min(1, st / 1.2) * 230 : 870
  drawPlayer(ctx, px, 420, -1, step === 0 ? 'walk' : 'idle', t, step === 0 ? st * 300 : 0)
  // prize
  if (step >= 6) { roundRect(ctx, 740, 120, 300, 140, 20, P.cream, P.ink, 4); text(ctx, 'Your prize:', 890, 150, { size: 24, align: 'center', color: P.inkSoft, weight: 800 }); drawTreasure(ctx, g.prize, 890, 215, 1.4); text(ctx, g.prize, 890, 250, { size: 22, align: 'center', color: P.ink, weight: 900 }) }
  // captions
  const cap = ['The throne room!', 'Time to fill the treasure chest.', `${treasures.length} treasure${treasures.length === 1 ? '' : 's'} go into the chest!`, 'The Master of Mischief is not happy...', 'The magic of the mountain wakes up!', 'Off he goes!', 'You keep one treasure as a prize.'][step] ?? ''
  if (cap) text(ctx, cap, W / 2, 40, { size: 34, align: 'center', color: P.yellow, weight: 900, outline: P.ink, outlineWidth: 6, font: DISPLAY })
  drawFrame(ctx)
}

// ------------------------------------------------------------------ rank screen
function rank(ctx: Ctx, g: Game): void {
  // Night sky with a glow behind the poster. (It used to be a grey checkerboard, which reads as the
  // transparency pattern from an image editor rather than as a celebration.)
  ctx.fillStyle = vgrad(ctx, 0, PLAY_H, '#16224a', '#3a5a9c'); ctx.fillRect(0, 0, W, PLAY_H)
  const glow = ctx.createRadialGradient(W / 2, 260, 40, W / 2, 260, 520)
  glow.addColorStop(0, 'rgba(255,214,80,0.30)'); glow.addColorStop(1, 'rgba(255,214,80,0)')
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, PLAY_H)
  ctx.save(); ctx.fillStyle = '#ffffff'
  for (let i = 0; i < 60; i++) {
    const sx = h1(i * 3.1) * W, sy = h1(i * 7.7) * PLAY_H
    ctx.globalAlpha = 0.25 + h1(i * 2.3) * 0.5 * (0.6 + 0.4 * Math.sin(g.time * 2 + i))
    ctx.beginPath(); ctx.arc(sx, sy, 1.2 + h1(i) * 1.8, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
  const k = Math.min(1, g.sceneT / 1.5)
  const shown = Math.round(g.rankFrom + (g.rankTo - g.rankFrom) * k)
  poster(ctx, W / 2, 50, g, shown)
  const gained = g.rankTo - g.rankFrom
  text(ctx, `+${gained} treasures this climb!`, W / 2, PLAY_H - 40, { size: 30, align: 'center', color: P.yellow, weight: 900, outline: P.ink, outlineWidth: 6, font: DISPLAY })
  if (starsForTotal(g.rankTo) > starsForTotal(g.rankFrom) && k >= 1) {
    // Celebration stars circle around the poster, never over its text.
    ctx.save(); ctx.globalAlpha = 0.9
    for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2 + g.time * 0.7; const sx = W / 2 + Math.cos(a) * 545, sy = 280 + Math.sin(a) * 240; if (Math.abs(sx - W / 2) < 330 && sy > 40 && sy < 510) continue; star(ctx, sx, sy, 14 + (i % 3) * 3, i % 2 ? P.yellow : P.white, P.ink, 2) }
    ctx.restore()
    text(ctx, 'NEW STAR!', W / 2, 38, { size: 40, align: 'center', color: P.yellow, weight: 900, outline: P.ink, outlineWidth: 8, font: DISPLAY })
  }
  drawFrame(ctx)
}

// ------------------------------------------------------------------ crown ending
function crown(ctx: Ctx, g: Game): void {
  const t = g.time
  sky(ctx, '#1b3a5c', '#5fb0ff')
  for (let i = 0; i < 40; i++) { const k = ((t * 0.3 + i * 0.13) % 1); const x = (i * 331) % W, y = H - k * H; star(ctx, x, y, 6 + (i % 3) * 3, [P.yellow, P.pink, P.cyan, P.white][i % 4], 'rgba(0,0,0,0)', 0, 4) }
  ctx.fillStyle = P.grass; ctx.fillRect(0, 600, W, H - 600)
  drawMountain(ctx, 640, 600, 0.62, t)
  const bob = Math.sin(t * 2) * 8
  // A glow that fades out, not a flat yellow disc at 45% - over the blue sky that came out olive.
  const r = 150 + Math.sin(t * 3) * 10
  const halo = ctx.createRadialGradient(640, 205 + bob, 10, 640, 205 + bob, r)
  halo.addColorStop(0, 'rgba(255,226,120,0.85)'); halo.addColorStop(0.45, 'rgba(255,210,63,0.35)'); halo.addColorStop(1, 'rgba(255,210,63,0)')
  ctx.save(); ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(640, 205 + bob, r, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  drawCrown(ctx, 640, 235 + bob, 90)
  text(ctx, 'You won back the crown!', W / 2, 56, { size: 54, align: 'center', color: P.yellow, weight: 900, outline: P.ink, outlineWidth: 10, font: DISPLAY })
  text(ctx, `Treasure Mountain is saved, ${gradeName(g.grade)} Champion!`, W / 2, 110, { size: 26, align: 'center', color: P.white, weight: 800, outline: P.ink, outlineWidth: 5 })
  drawPlayer(ctx, 300 + Math.sin(t) * 10, 600, 1, 'jump', t, 0)
  for (let i = 0; i < 4; i++) drawElf(ctx, 900 + i * 80, 600, -1, 'dance', t + i, i % 3, 'none')
}

// ------------------------------------------------------------------ help & about
function howto(ctx: Ctx, g: Game): void {
  const t = g.time
  sky(ctx, '#3c7dd9', '#9fd0ff')
  text(ctx, 'How to play', W / 2, 56, { size: 48, align: 'center', color: P.yellow, weight: 900, font: DISPLAY, outline: P.ink, outlineWidth: 8 })
  // The steps sit on a cream card: white body text over the pale bottom of the sky gradient came
  // out at about 2:1 contrast, which no child can read.
  roundRect(ctx, 40, 92, W - 80, 560, 22, P.cream, P.ink, 4)
  const steps = [
    ['1', 'Catch an elf.', 'Tap an elf (or press Space) to swing your net. Each throw uses one net.'],
    ['2', 'Answer the riddle.', 'Elves with scrolls ask a riddle. A right answer wins a clue word and 2 coins.'],
    ['3', 'Find the treasure.', 'Three clue words describe a group of things, like "two small trees".'],
    ['4', 'Drop a coin.', 'Stand in front of things that match your clue words and tap COIN.'],
    ['5', 'All three match: the KEY.', 'Two of three match: a TREASURE. Bring the key to the tree, fountain or door.'],
    ['6', 'Climb to the castle.', 'Fill the chest at the top, send the Master of Mischief packing, earn stars!'],
  ]
  steps.forEach(([n, head, body], i) => {
    const y = 118 + i * 88
    if (i) line(ctx, 76, y - 16, W - 76, y - 16, P.scrollEdge, 2)
    circle(ctx, 100, y + 22, 26, P.yellow, P.ink, 3); text(ctx, n, 100, y + 23, { size: 28, align: 'center', color: P.ink, weight: 900 })
    text(ctx, head, 150, y + 8, { size: 26, color: P.blueDark, weight: 900 })
    text(ctx, body, 150, y + 40, { size: 21, color: P.ink, weight: 700 })
    howtoIcon(ctx, i, 1160, y + 24, t)
  })
  text(ctx, 'Need more nets? Drop coins at the NETS rock. No nets and no coins? The rock helps you out.', W / 2, H - 36, { size: 20, align: 'center', color: P.white, weight: 800, outline: P.ink, outlineWidth: 5 })
}

/** The little picture beside each how-to-play step, so the page is not six lines of text. */
function howtoIcon(ctx: Ctx, i: number, x: number, y: number, t: number): void {
  ctx.save()
  // Scaled to 0.75, or the elf's hat pokes out through the top of the card.
  if (i === 0) { ctx.save(); ctx.translate(x - 18, y + 30); ctx.scale(0.75, 0.75); drawElf(ctx, 0, 0, -1, 'run', t, 1, 'none'); ctx.restore(); ctx.save(); ctx.translate(x + 32, y + 14); ctx.rotate(0.5); drawNet(ctx, 0.45); ctx.restore() }
  else if (i === 1) { roundRect(ctx, x - 40, y - 26, 80, 52, 8, P.scroll, P.ink, 3); for (let k = 0; k < 3; k++) line(ctx, x - 28, y - 12 + k * 13, x + 28, y - 12 + k * 13, P.scrollEdge, 3) }
  else if (i === 2) { drawTreasure(ctx, 'kite', x, y - 4, 0.68) }
  else if (i === 3) { circle(ctx, x, y, 22, P.gold, P.ink, 3); circle(ctx, x, y, 12, P.goldDark, 'rgba(0,0,0,0)', 0) }
  else if (i === 4) { drawKey(ctx, x, y - 6, 1.6, true) }
  else { drawCrown(ctx, x, y + 10, 60) }
  ctx.restore()
}

function about(ctx: Ctx, g: Game): void {
  sky(ctx, '#3c7dd9', '#9fd0ff')
  text(ctx, 'About', W / 2, 56, { size: 48, align: 'center', color: P.yellow, weight: 900, font: DISPLAY, outline: P.ink, outlineWidth: 8 })
  const lines = [
    'Treasure Mountain is a free, open-source remake of The Learning',
    "Company's 1990 educational game Super Solvers: Treasure Mountain!",
    '',
    'Catch elves, solve riddles, find treasures with clue words, and win',
    'back the crown from the Master of Mischief. Puzzles come in versions',
    'for kindergarten through 5th grade, in reading, math, science and',
    'thinking, and get harder as you earn stars.',
    '',
    'Everything is drawn and synthesized in code, so the whole game is a',
    'few hundred kilobytes and works offline. Nothing leaves your device.',
    '',
    'Not affiliated with The Learning Company. MIT licensed.',
  ]
  // On a card: the sky gradient is at its palest behind the last paragraph, where white text was
  // down to about 2:1.
  roundRect(ctx, 120, 96, W - 240, lines.length * 34 + 28, 20, 'rgba(12,28,58,0.72)', P.blueDark, 3)
  lines.forEach((l, i) => text(ctx, l, W / 2, 124 + i * 34, { size: 22, align: 'center', color: P.white, weight: 700 }))
  drawElf(ctx, 200, 640, 1, 'dance', g.time, 0, 'scroll'); drawElf(ctx, 1080, 640, -1, 'dance', g.time + 1, 2, 'balloon')
}

export { poster }

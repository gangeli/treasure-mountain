import { P } from './palette'
import { type Ctx, circle, ellipse, poly, line, roundRect, fillStroke, shadowBlob, text, star } from './draw'
import type { Feature, LevelNo } from '../game/world'
import { drawKey } from './characters'

/** Draws a fixed level feature with its base at (x, groundY). */
export function drawFeature(ctx: Ctx, f: Feature, x: number, y: number, no: LevelNo, t: number, opts: { netPrice: number; hasKey: boolean; secretUsed: boolean; bridgeGap: boolean; progress?: number }): void {
  switch (f.type) {
    case 'clubhouse': return clubhouse(ctx, x, y)
    case 'netrock': return netRock(ctx, x, y, opts.netPrice, t)
    case 'tunnel': return tunnel(ctx, x, y, no)
    case 'secret': return secretRock(ctx, x, y, opts.secretUsed)
    case 'bridge': return bridge(ctx, x, y, opts.bridgeGap)
    case 'keyhole': return keyholeTree(ctx, x, y, opts.hasKey, opts.progress ?? 0)
    case 'fountain': return fountain(ctx, x, y, t, opts.hasKey, opts.progress ?? 0)
    case 'castledoor': return castleDoor(ctx, x, y, opts.hasKey, opts.progress ?? 0)
    case 'coincache': return
  }
}

function clubhouse(ctx: Ctx, x: number, y: number): void {
  const w = 260, h = 150
  shadowBlob(ctx, x, y, w / 2)
  // deck
  roundRect(ctx, x - w / 2 - 10, y - 26, w + 20, 26, 4, P.wood)
  ctx.fillStyle = P.woodDark; for (let i = 0; i < 5; i++) ctx.fillRect(x - w / 2 - 6 + i * (w / 4.4), y - 22, 3, 18)
  // dark doorway
  roundRect(ctx, x - 62, y - h + 44, 124, h - 70, 8, P.ink, P.ink, 0)
  // posts
  for (const s of [-1, 1]) { roundRect(ctx, x + s * 100 - 9, y - h + 30, 18, h - 56, 3, P.blue); roundRect(ctx, x + s * 100 - 13, y - h + 26, 26, 12, 3, P.blueDark, P.ink, 2) }
  // roof
  poly(ctx, [[x - w / 2 - 20, y - h + 30], [x, y - h - 30], [x + w / 2 + 20, y - h + 30]], P.wood)
  ctx.strokeStyle = P.woodDark; ctx.lineWidth = 3
  for (let i = 1; i < 6; i++) { const f = i / 6; ctx.beginPath(); ctx.moveTo(x - (w / 2 + 20) * (1 - f), y - h + 30 - 60 * f); ctx.lineTo(x + (w / 2 + 20) * (1 - f), y - h + 30 - 60 * f); ctx.stroke() }
  // sign board
  roundRect(ctx, x - 90, y - h + 40, 180, 34, 4, P.cream)
  text(ctx, 'CLUBHOUSE', x, y - h + 57, { size: 22, align: 'center', color: P.blueDark, weight: 800, spacing: 1 })
  // flag
  line(ctx, x, y - h - 30, x, y - h - 70, P.ink, 4); poly(ctx, [[x, y - h - 70], [x + 32, y - h - 60], [x, y - h - 50]], P.red, P.ink, 2)
}

function netRock(ctx: Ctx, x: number, y: number, price: number, t: number): void {
  const w = 130, h = 120
  shadowBlob(ctx, x, y, w / 2)
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w / 2 - 10, y - h * 0.5, x - w * 0.3, y - h * 0.8); ctx.quadraticCurveTo(x - w * 0.05, y - h - 8, x + w * 0.25, y - h * 0.85); ctx.quadraticCurveTo(x + w / 2 + 6, y - h * 0.55, x + w / 2, y); ctx.closePath()
  fillStroke(ctx, P.rock)
  ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x - w * 0.2, y - h * 0.65, w * 0.14, h * 0.1, -0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  text(ctx, 'NETS', x, y - h * 0.62, { size: 26, align: 'center', color: P.ink, weight: 900, font: '"Fredoka","Nunito","Trebuchet MS",sans-serif' })
  text(ctx, String(price), x, y - h * 0.4, { size: 30, align: 'center', color: P.redDark, weight: 900, font: '"Fredoka","Nunito","Trebuchet MS",sans-serif' })
  text(ctx, 'COINS', x, y - h * 0.2, { size: 22, align: 'center', color: P.ink, weight: 900, font: '"Fredoka","Nunito","Trebuchet MS",sans-serif' })
  // a net leaning on the rock, bobbing
  ctx.save(); ctx.translate(x + w / 2 - 6, y - 10 + Math.sin(t * 2) * 1.5); ctx.rotate(0.35)
  line(ctx, 0, 0, 0, -70, P.ink, 6); line(ctx, 0, 0, 0, -70, P.wood, 3)
  ctx.beginPath(); ctx.ellipse(0, -90, 16, 20, 0, 0, Math.PI * 2); ctx.lineWidth = 5; ctx.strokeStyle = P.ink; ctx.stroke(); ctx.lineWidth = 2.5; ctx.strokeStyle = P.blue; ctx.stroke()
  ctx.restore()
}

function tunnel(ctx: Ctx, x: number, y: number, no: LevelNo): void {
  const w = 150, h = 140
  if (no === 2) {
    // timber mine entrance
    roundRect(ctx, x - w / 2, y - h + 20, w, h - 20, 0, P.ink, P.ink, 0)
    ctx.fillStyle = P.purpleDark; ctx.fillRect(x - w / 2 + 12, y - h + 32, w - 24, h - 40)
    roundRect(ctx, x - w / 2 - 12, y - h, w + 24, 22, 3, P.wood)
    roundRect(ctx, x - w / 2 - 12, y - h + 10, 18, h - 10, 3, P.wood); roundRect(ctx, x + w / 2 - 6, y - h + 10, 18, h - 10, 3, P.wood)
    // 120px was narrower than the words, so the last letter sat outside the plate.
    roundRect(ctx, x - 74, y - h - 34, 148, 34, 5, P.cream)
    text(ctx, 'MINE TUNNEL', x, y - h - 17, { size: 18, align: 'center', color: P.purpleDark, weight: 800 })
    // lantern
    line(ctx, x + w / 2 - 20, y - h + 22, x + w / 2 - 20, y - h + 40, P.ink, 2)
    roundRect(ctx, x + w / 2 - 30, y - h + 40, 20, 26, 4, P.orange); ctx.fillStyle = P.yellow; ctx.fillRect(x + w / 2 - 25, y - h + 46, 10, 14)
    // rails
    line(ctx, x - 40, y, x - 20, y - 60, P.rockDark, 4); line(ctx, x + 40, y, x + 20, y - 60, P.rockDark, 4)
  } else {
    // cave mouth in the rock
    ctx.beginPath(); ctx.moveTo(x - w / 2 - 20, y); ctx.quadraticCurveTo(x - w / 2 - 24, y - h * 0.7, x - w * 0.2, y - h); ctx.quadraticCurveTo(x + w * 0.1, y - h - 16, x + w / 2 + 8, y - h * 0.7); ctx.quadraticCurveTo(x + w / 2 + 26, y - h * 0.3, x + w / 2 + 20, y); ctx.closePath()
    fillStroke(ctx, no === 3 ? P.rockLight : P.rock)
    ctx.beginPath(); ctx.moveTo(x - w * 0.36, y); ctx.quadraticCurveTo(x - w * 0.4, y - h * 0.6, x - w * 0.1, y - h * 0.76); ctx.quadraticCurveTo(x + w * 0.2, y - h * 0.8, x + w * 0.38, y - h * 0.45); ctx.lineTo(x + w * 0.36, y); ctx.closePath()
    fillStroke(ctx, P.ink, P.ink, 3)
    if (no === 3) {
      // gems glint inside the ice cave
      for (let i = 0; i < 4; i++) { const gx = x - 30 + i * 22, gy = y - 30 - (i % 2) * 34; poly(ctx, [[gx - 7, gy], [gx, gy - 12], [gx + 7, gy], [gx, gy + 6]], [P.cyan, P.pink, P.green, P.yellow][i], 'rgba(0,0,0,0)', 0) }
      for (let i = 0; i < 5; i++) poly(ctx, [[x - 50 + i * 26, y - h * 0.7], [x - 42 + i * 26, y - h * 0.45 + (i % 2) * 8], [x - 34 + i * 26, y - h * 0.7]], P.ice, P.ink, 1.5)
    } else {
      // moss over the mouth
      ctx.fillStyle = P.greenDark; ctx.beginPath(); ctx.ellipse(x, y - h * 0.82, w * 0.3, 10, 0, 0, Math.PI * 2); ctx.fill()
    }
  }
}

function secretRock(ctx: Ctx, x: number, y: number, used: boolean): void {
  const w = 120, h = 96
  shadowBlob(ctx, x, y, w / 2)
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w * 0.45, y - h * 0.55); ctx.lineTo(x - w * 0.15, y - h); ctx.lineTo(x + w * 0.35, y - h * 0.9); ctx.lineTo(x + w / 2, y - h * 0.4); ctx.lineTo(x + w * 0.42, y); ctx.closePath()
  fillStroke(ctx, P.rockDark)
  ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(x - w * 0.15, y - h * 0.6, w * 0.16, h * 0.1, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  if (!used) { ctx.save(); ctx.globalAlpha = 0.85; star(ctx, x + w * 0.2, y - h * 0.55, 6, P.yellow, 'rgba(0,0,0,0)', 0, 4); ctx.restore() }
  // little crack that hints at the passage
  ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y - 8); ctx.lineTo(x + 2, y - 30); ctx.lineTo(x - 6, y - 50); ctx.stroke()
}

function bridge(ctx: Ctx, x: number, y: number, gap: boolean): void {
  const w = 280
  // chasm below the deck
  ctx.fillStyle = P.ink; ctx.fillRect(x - w / 2 + 20, y - 4, w - 40, 60)
  ctx.fillStyle = P.mineDark; ctx.fillRect(x - w / 2 + 20, y + 30, w - 40, 30)
  // planks
  const planks = 11
  for (let i = 0; i < planks; i++) {
    const px = x - w / 2 + 24 + i * ((w - 48) / planks)
    const broken = gap && i >= 4 && i <= 6
    if (broken) { if (i === 4 || i === 6) { ctx.save(); ctx.translate(px + 10, y + 2); ctx.rotate(i === 4 ? 0.9 : -0.9); roundRect(ctx, -10, 0, 20, 30, 3, P.wood, P.ink, 2.5); ctx.restore() } continue }
    roundRect(ctx, px, y - 8, (w - 48) / planks - 4, 12, 2, P.wood, P.ink, 2.5)
  }
  // rope rails and posts
  for (const s of [-1, 1]) { roundRect(ctx, x + s * (w / 2 - 12) - 8, y - 64, 16, 64, 3, P.woodDark) }
  ctx.strokeStyle = P.cyanDark; ctx.lineWidth = 4
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, y - 58); ctx.quadraticCurveTo(x, y - 34, x + w / 2 - 4, y - 58); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(x - w / 2 + 4, y - 36); ctx.quadraticCurveTo(x, y - 18, x + w / 2 - 4, y - 36); ctx.stroke()
  for (let i = 1; i < 8; i++) { const px = x - w / 2 + i * (w / 8); const sag = 24 * Math.sin((i / 8) * Math.PI); line(ctx, px, y - 58 + sag, px, y - 6, P.cyanDark, 2) }
}

function keyholeTree(ctx: Ctx, x: number, y: number, hasKey: boolean, progress: number): void {
  const trunkW = 90, trunkH = 320
  shadowBlob(ctx, x, y, trunkW * 0.8)
  ctx.beginPath(); ctx.moveTo(x - trunkW / 2, y - trunkH); ctx.lineTo(x - trunkW / 2 - 4, y - 40); ctx.quadraticCurveTo(x - trunkW * 0.7, y, x - trunkW, y); ctx.lineTo(x + trunkW, y); ctx.quadraticCurveTo(x + trunkW * 0.7, y, x + trunkW / 2 + 4, y - 40); ctx.lineTo(x + trunkW / 2, y - trunkH); ctx.closePath()
  fillStroke(ctx, P.brown)
  ctx.fillStyle = P.brownDark; ctx.fillRect(x + 14, y - trunkH + 10, 12, trunkH - 30); ctx.fillRect(x - 30, y - trunkH + 40, 6, trunkH - 100)
  // canopy top (partly above the play area)
  // A scalloped canopy rather than a flat ellipse, so it reads as leaves.
  scallop(ctx, x, y - trunkH - 10, 168, 74, 11)
  fillStroke(ctx, P.green)
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = P.greenLight
  scallop(ctx, x - 46, y - trunkH - 30, 78, 32, 6, 0.4); ctx.fill(); ctx.restore()
  // keyhole plate
  roundRect(ctx, x - 22, y - 120, 44, 56, 8, P.gold)
  ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(x, y - 100, 8, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x - 4, y - 100, 8, 22)
  // rungs grow with progress (0..1)
  const rungs = 8
  for (let i = 0; i < rungs; i++) {
    if ((i + 1) / rungs > progress + 0.001) break
    const ry = y - 60 - i * 40
    roundRect(ctx, x - 34, ry - 6, 68, 12, 4, P.rockLight)
  }
  if (hasKey && progress === 0) drawKey(ctx, x + 50, y - 150 + Math.sin(Date.now() / 300) * 4, 1.2, true)
}

function fountain(ctx: Ctx, x: number, y: number, t: number, active: boolean, progress: number): void {
  const w = 160
  shadowBlob(ctx, x, y, w / 2)
  // basin
  ctx.beginPath(); ctx.moveTo(x - w / 2, y - 50); ctx.lineTo(x - w * 0.4, y); ctx.lineTo(x + w * 0.4, y); ctx.lineTo(x + w / 2, y - 50); ctx.closePath(); fillStroke(ctx, P.rockLight)
  ellipse(ctx, x, y - 50, w / 2, 16, P.cyan, P.ink, 3)
  // pedestal & spout
  roundRect(ctx, x - 14, y - 120, 28, 70, 5, P.rock)
  ellipse(ctx, x, y - 120, 36, 10, P.rockLight, P.ink, 2.5)
  // sign
  roundRect(ctx, x - w / 2 - 70, y - 150, 100, 60, 6, P.magenta)
  text(ctx, 'RIDE THE', x - w / 2 - 20, y - 132, { size: 17, align: 'center', color: P.white, weight: 800 })
  text(ctx, 'WATER UP', x - w / 2 - 20, y - 108, { size: 17, align: 'center', color: P.white, weight: 800 })
  line(ctx, x - w / 2 - 20, y - 90, x - w / 2 - 20, y, P.ink, 6); line(ctx, x - w / 2 - 20, y - 90, x - w / 2 - 20, y, P.wood, 3)
  // water jet: idle burble, or a tall column when active
  const jetH = active ? 120 + progress * 380 : 30 + Math.sin(t * 6) * 6
  ctx.save(); ctx.globalAlpha = 0.85
  ctx.beginPath(); ctx.moveTo(x - 12, y - 120); ctx.quadraticCurveTo(x - 24, y - 120 - jetH * 0.6, x - 8, y - 120 - jetH); ctx.lineTo(x + 8, y - 120 - jetH); ctx.quadraticCurveTo(x + 24, y - 120 - jetH * 0.6, x + 12, y - 120); ctx.closePath()
  fillStroke(ctx, P.cyan, P.blueDark, 2)
  ctx.fillStyle = P.cyanPale
  for (let i = 0; i < 6; i++) { const k = (t * 1.5 + i / 6) % 1; ctx.beginPath(); ctx.arc(x + Math.sin(i * 2.1) * 8, y - 120 - k * jetH, 3 + (1 - k) * 2, 0, Math.PI * 2); ctx.fill() }
  ctx.restore()
}

function castleDoor(ctx: Ctx, x: number, y: number, hasKey: boolean, progress: number): void {
  const w = 200, h = 300
  // stone arch wall
  ctx.beginPath(); ctx.moveTo(x - w / 2 - 40, y); ctx.lineTo(x - w / 2 - 40, y - h + 40); ctx.quadraticCurveTo(x - w / 2 - 40, y - h - 40, x, y - h - 40); ctx.quadraticCurveTo(x + w / 2 + 40, y - h - 40, x + w / 2 + 40, y - h + 40); ctx.lineTo(x + w / 2 + 40, y); ctx.closePath()
  fillStroke(ctx, P.rock)
  // stones
  ctx.strokeStyle = P.rockDark; ctx.lineWidth = 2
  for (let r = 0; r < 7; r++) for (let c = 0; c < 5; c++) { const sx = x - w / 2 - 34 + c * 56 + (r % 2) * 28, sy = y - 18 - r * 40; if (Math.abs(sx - x) < w / 2 - 20 && sy > y - h + 20) continue; ctx.strokeRect(sx, sy - 30, 48, 30) }
  // door opening (dark) with the door leaf swinging open by progress
  ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w / 2, y - h + 60); ctx.quadraticCurveTo(x - w / 2, y - h, x, y - h); ctx.quadraticCurveTo(x + w / 2, y - h, x + w / 2, y - h + 60); ctx.lineTo(x + w / 2, y); ctx.closePath()
  fillStroke(ctx, P.ink, P.ink, 3)
  // stairs inside
  ctx.fillStyle = P.rockDark; for (let i = 0; i < 4; i++) ctx.fillRect(x - 40 + i * 6, y - 20 - i * 22, 80 - i * 12, 8)
  // door leaf
  ctx.save(); ctx.translate(x - w / 2, y); ctx.scale(1 - progress * 0.9, 1)
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -h + 60); ctx.quadraticCurveTo(0, -h, w / 2, -h); ctx.quadraticCurveTo(w, -h, w, -h + 60); ctx.lineTo(w, 0); ctx.closePath(); fillStroke(ctx, P.wood)
  ctx.fillStyle = P.woodDark; for (let i = 1; i < 5; i++) ctx.fillRect(i * (w / 5) - 2, -h + 30, 4, h - 40)
  roundRect(ctx, 20, -h * 0.7, w - 40, 12, 3, P.rockDark, P.ink, 2); roundRect(ctx, 20, -h * 0.3, w - 40, 12, 3, P.rockDark, P.ink, 2)
  // keyhole plate
  roundRect(ctx, w * 0.62, -h * 0.5, 34, 46, 6, P.gold, P.ink, 2.5)
  ctx.fillStyle = P.ink; ctx.beginPath(); ctx.arc(w * 0.62 + 17, -h * 0.5 + 16, 6, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(w * 0.62 + 14, -h * 0.5 + 16, 6, 18)
  ctx.restore()
  // banners
  for (const s of [-1, 1]) { poly(ctx, [[x + s * (w / 2 + 12) - 12, y - h + 20], [x + s * (w / 2 + 12) + 12, y - h + 20], [x + s * (w / 2 + 12) + 12, y - h + 80], [x + s * (w / 2 + 12), y - h + 96], [x + s * (w / 2 + 12) - 12, y - h + 80]], P.purple, P.ink, 2.5) }
  if (hasKey && progress === 0) drawKey(ctx, x + w / 2 + 60, y - 120 + Math.sin(Date.now() / 300) * 4, 1.2, true)
}

/** A coin lying on the ground, spinning. */
export function drawGroundCoin(ctx: Ctx, x: number, y: number, t: number): void {
  const sq = Math.abs(Math.cos(t * 4))
  shadowBlob(ctx, x, y, 12)
  ctx.save(); ctx.translate(x, y - 14 - Math.abs(Math.sin(t * 3)) * 6); ctx.scale(Math.max(0.15, sq), 1)
  circle(ctx, 0, 0, 12, P.gold, P.ink, 2.5); circle(ctx, 0, 0, 7, P.goldDark, 'rgba(0,0,0,0)', 0); star(ctx, 0, 0, 5, P.gold, 'rgba(0,0,0,0)', 0)
  ctx.restore()
}

/** The POOF cloud that hides scenery while a coin search reveals what is behind it. */
export function drawPoof(ctx: Ctx, x: number, y: number, t: number): void {
  const k = Math.min(1, t / 0.35)
  const fade = t > 1.0 ? Math.max(0, 1 - (t - 1.0) / 0.4) : 1
  ctx.save(); ctx.globalAlpha = fade
  const r = 40 + k * 50
  ctx.fillStyle = P.cyanPale; ctx.strokeStyle = P.cyanDark; ctx.lineWidth = 3
  scallop(ctx, x, y, r * 1.05, r * 0.75, 9, t * 0.5)
  ctx.fill(); ctx.stroke()
  text(ctx, 'POOF', x, y, { size: 34 + k * 10, align: 'center', color: P.magenta, weight: 900, outline: P.white, outlineWidth: 6, font: '"Fredoka","Nunito","Trebuchet MS",sans-serif' })
  ctx.restore()
}

/** A cloud outline made of bumps with no inner lines: arcs around points on an ellipse. */
export function scallop(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, bumps: number, rot = 0): void {
  ctx.beginPath()
  for (let i = 0; i < bumps; i++) {
    const a = rot + (i / bumps) * Math.PI * 2
    const bx = cx + Math.cos(a) * rx, by = cy + Math.sin(a) * ry
    const br = (Math.PI * 2 * Math.min(rx, ry)) / bumps * 0.62
    ctx.arc(bx, by, br, a - 1.35, a + 1.35)
  }
  ctx.closePath()
}

export function drawSparkle(ctx: Ctx, x: number, y: number, t: number): void {
  ctx.save(); ctx.globalAlpha = Math.max(0, 1 - t)
  for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2 + t * 2; const d = 20 + t * 70; star(ctx, x + Math.cos(a) * d, y + Math.sin(a) * d * 0.6 - t * 40, 8 - t * 5, i % 2 ? P.yellow : P.white, 'rgba(0,0,0,0)', 0, 4) }
  ctx.restore()
}

/** Small prize / treasure icons (toys) for the treasure reveal, the shelf and the throne room. */
export function drawTreasure(ctx: Ctx, name: string, x: number, y: number, s = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  const seed = [...name].reduce((a, c) => a + c.charCodeAt(0), 0)
  switch (name) {
    case 'lamp': roundRect(ctx, -10, -10, 20, 26, 4, P.gold); poly(ctx, [[-22, -10], [22, -10], [14, -34], [-14, -34]], P.red); line(ctx, 0, -34, 0, -42, P.ink, 3); break
    case 'balloon': line(ctx, 0, 0, 4, 30, P.ink, 2); ellipse(ctx, 0, -8, 18, 22, P.red); ellipse(ctx, -6, -14, 4, 6, 'rgba(255,255,255,0.6)', 'rgba(0,0,0,0)', 0); break
    case 'boxcar': roundRect(ctx, -26, -22, 52, 30, 4, P.blue); circle(ctx, -14, 12, 7, P.ink, P.ink, 0); circle(ctx, 14, 12, 7, P.ink, P.ink, 0); ctx.fillStyle = P.bluePale; ctx.fillRect(-18, -16, 12, 10); ctx.fillRect(6, -16, 12, 10); break
    case 'teddy bear': circle(ctx, 0, 6, 16, P.brownLight); circle(ctx, 0, -14, 12, P.brownLight); circle(ctx, -10, -22, 5, P.brownLight, P.ink, 2); circle(ctx, 10, -22, 5, P.brownLight, P.ink, 2); circle(ctx, -4, -15, 1.8, P.ink, P.ink, 0); circle(ctx, 4, -15, 1.8, P.ink, P.ink, 0); circle(ctx, 0, -10, 2.5, P.ink, P.ink, 0); break
    case 'kite': {
      // Sits 10px higher than it used to: with the tail hanging below, the kite's middle was well
      // under the origin, so on the prize card it pushed past the card and over its own name.
      poly(ctx, [[0, -40], [18, -16], [0, 12], [-18, -16]], P.yellow)
      line(ctx, 0, -40, 0, 12, P.ink, 1.5); line(ctx, -18, -16, 18, -16, P.ink, 1.5)
      // A ribbon tail with outlined bows, at the same weight as everything else.
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(0, 12); ctx.bezierCurveTo(10, 20, -4, 28, 8, 38); ctx.stroke()
      for (const [bx, by] of [[6, 20], [1, 29], [8, 38]]) {
        poly(ctx, [[bx - 6, by - 4], [bx, by], [bx - 6, by + 4]], P.red, P.ink, 1.5)
        poly(ctx, [[bx + 6, by - 4], [bx, by], [bx + 6, by + 4]], P.red, P.ink, 1.5)
      }
      break
    }
    case 'drum': ellipse(ctx, 0, 8, 22, 8, P.red); ctx.fillStyle = P.red; ctx.fillRect(-22, -12, 44, 20); line(ctx, -22, -12, -22, 8, P.ink, 3); line(ctx, 22, -12, 22, 8, P.ink, 3); ellipse(ctx, 0, -12, 22, 8, P.cream); break
    case 'top': poly(ctx, [[-20, -14], [20, -14], [0, 22]], P.purple); ellipse(ctx, 0, -14, 20, 7, P.pink); line(ctx, 0, -20, 0, -30, P.ink, 4); break
    case 'robot': {
      // arms and legs first so the body overlaps them
      roundRect(ctx, -26, -8, 12, 22, 5, P.blueDark, P.ink, 2); roundRect(ctx, 14, -8, 12, 22, 5, P.blueDark, P.ink, 2)
      roundRect(ctx, -12, 14, 10, 12, 4, P.blueDark, P.ink, 2); roundRect(ctx, 2, 14, 10, 12, 4, P.blueDark, P.ink, 2)
      roundRect(ctx, -16, -12, 32, 28, 6, P.blue)
      roundRect(ctx, -8, -4, 16, 12, 3, P.cyanPale, P.ink, 2)
      roundRect(ctx, -13, -36, 26, 24, 7, P.blue)
      circle(ctx, -5, -26, 4, P.white, P.ink, 1.5); circle(ctx, 5, -26, 4, P.white, P.ink, 1.5)
      circle(ctx, -4, -25, 2, P.ink, P.ink, 0); circle(ctx, 6, -25, 2, P.ink, P.ink, 0)
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.arc(0, -19, 5, 0.2, Math.PI - 0.2); ctx.stroke()
      line(ctx, 0, -36, 0, -45, P.ink, 2); circle(ctx, 0, -47, 3.5, P.red, P.ink, 1.5)
      break
    }
    case 'sailboat': poly(ctx, [[-24, 8], [24, 8], [16, 22], [-16, 22]], P.brown); line(ctx, 0, 8, 0, -34, P.ink, 3); poly(ctx, [[2, -34], [26, 4], [2, 4]], P.white); poly(ctx, [[-2, -26], [-20, 4], [-2, 4]], P.red); break
    case 'trumpet': line(ctx, -26, 0, 10, 0, P.ink, 10); line(ctx, -26, 0, 10, 0, P.gold, 6); poly(ctx, [[10, -6], [30, -18], [30, 18], [10, 6]], P.gold); for (let i = 0; i < 3; i++) roundRect(ctx, -12 + i * 9, -12, 5, 8, 1, P.gold, P.ink, 1.5); break
    case 'yo-yo': circle(ctx, 0, 4, 18, P.green); circle(ctx, 0, 4, 5, P.greenDark, P.ink, 1.5); line(ctx, 0, -14, 0, -36, P.ink, 2); break
    case 'rocket': poly(ctx, [[0, -40], [14, -10], [14, 16], [-14, 16], [-14, -10]], P.rockLight); circle(ctx, 0, -8, 5, P.cyan, P.ink, 1.5); poly(ctx, [[-14, 0], [-26, 22], [-14, 16]], P.red); poly(ctx, [[14, 0], [26, 22], [14, 16]], P.red); poly(ctx, [[-8, 16], [0, 32], [8, 16]], P.orange, P.ink, 1.5); break
    case 'doll': {
      // Arms, a face and hair either side: a circle over a triangle read as a traffic cone.
      poly(ctx, [[-9, -8], [9, -8], [17, 22], [-17, 22]], P.pink)
      for (const sx of [-1, 1]) { roundRect(ctx, sx > 0 ? 8 : -20, -6, 12, 7, 3, P.skin); roundRect(ctx, sx * 7 - 4, 22, 8, 6, 3, P.skin) }
      circle(ctx, 0, -20, 12, P.skin)
      ctx.fillStyle = P.yellow; ctx.beginPath(); ctx.arc(0, -22, 13, Math.PI, 0); ctx.fill()
      for (const sx of [-1, 1]) { ellipse(ctx, sx * 12, -18, 5, 9, P.yellow, P.ink, 2); circle(ctx, sx * 4, -21, 1.8, P.ink, P.ink, 0) }
      ctx.strokeStyle = P.ink; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.arc(0, -18, 5, 0.5, Math.PI - 0.5); ctx.stroke()
      break
    }
    case 'ball': circle(ctx, 0, 0, 20, P.red); ctx.fillStyle = P.white; ctx.beginPath(); ctx.ellipse(0, 0, 20, 8, 0, 0, Math.PI * 2); ctx.fill(); circle(ctx, 0, 0, 20, 'rgba(0,0,0,0)'); break
    case 'crown jewel': poly(ctx, [[-18, -8], [-9, -22], [9, -22], [18, -8], [0, 20]], P.cyan); ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-12, -8); ctx.lineTo(-6, -18); ctx.lineTo(0, -8); ctx.closePath(); ctx.fill(); ctx.restore(); break
    case 'music box': roundRect(ctx, -24, -8, 48, 28, 4, P.purple); roundRect(ctx, -24, -20, 48, 12, 3, P.purpleDark); ctx.fillStyle = P.gold; ctx.font = '700 18px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('♪', 0, 12); break
    case 'puzzle': {
      // One piece lifted out of the corner, with the tabs that make it a jigsaw rather than a grid.
      roundRect(ctx, -22, -22, 44, 44, 4, P.green)
      ctx.strokeStyle = P.ink; ctx.lineWidth = 2
      ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -6); ctx.arc(0, 0, 6, -Math.PI / 2, Math.PI / 2, true); ctx.lineTo(0, 22)
      ctx.moveTo(-22, 0); ctx.lineTo(-6, 0); ctx.arc(0, 0, 6, Math.PI, 0); ctx.lineTo(22, 0); ctx.stroke()
      roundRect(ctx, 6, -40, 20, 20, 3, P.greenLight, P.ink, 2)
      ctx.beginPath(); ctx.arc(16, -20, 5, Math.PI, 0, true); fillStroke(ctx, P.greenLight, P.ink, 2)
      break
    }
    case 'paint set': roundRect(ctx, -26, -14, 52, 30, 4, P.rockLight); [P.red, P.yellow, P.blue, P.green].forEach((c, i) => circle(ctx, -18 + i * 12, 0, 5, c, P.ink, 1.5)); line(ctx, -20, 20, 10, -24, P.ink, 4); line(ctx, -20, 20, 10, -24, P.wood, 2); break
    case 'toy car': roundRect(ctx, -26, -8, 52, 20, 6, P.yellow); roundRect(ctx, -14, -22, 28, 16, 5, P.yellow); ctx.fillStyle = P.cyanPale; ctx.fillRect(-10, -19, 20, 10); circle(ctx, -14, 12, 7, P.ink, P.ink, 0); circle(ctx, 14, 12, 7, P.ink, P.ink, 0); break
    case 'jack-in-the-box': roundRect(ctx, -20, -4, 40, 30, 3, P.red); roundRect(ctx, -22, -10, 44, 8, 2, P.blue); line(ctx, 0, -4, 0, -30, P.ink, 3); circle(ctx, 0, -38, 12, P.skin); poly(ctx, [[-12, -46], [0, -62], [12, -46]], P.green, P.ink, 2); break
    default: circle(ctx, 0, 0, 16 + (seed % 5), P.gold); star(ctx, 0, 0, 8, P.yellow, 'rgba(0,0,0,0)', 0)
  }
  ctx.restore()
}

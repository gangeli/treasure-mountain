import { P, NAMED } from './palette'
import { type Ctx, circle, ellipse, poly, line, roundRect, fillStroke, shadowBlob, h1, star } from './draw'
import type { Group } from '../game/world'
import { KINDS } from '../game/world'
import { leaf } from './backgrounds'

/** Size multiplier for a descriptor (1 = normal). Kind-specific defaults are applied by drawKind. */
function sizeFor(desc: string): number {
  switch (desc) {
    case 'small': return 0.62
    case 'big': return 1.35
    case 'tall': return 1.0
    case 'short': return 0.7
    case 'long': return 1.35
    default: return 1
  }
}
const tallFor = (desc: string): number => desc === 'tall' ? 1.6 : desc === 'short' ? 0.7 : 1
const colorFor = (desc: string, fallback: string): string => NAMED[desc] ?? fallback

/**
 * Draws a scenery group with its base at (x, groundY). Objects are spread evenly over the group's
 * width. `hidden` fades the group away (POOF search), `seed` varies details.
 */
export function drawGroup(ctx: Ctx, g: Group, x: number, groundY: number, t: number, hidden = 0): void {
  const kd = KINDS.find(k => k.kind === g.kind)!
  const slot = kd.width + 10
  const x0 = x - ((g.count - 1) * slot) / 2
  ctx.save()
  if (hidden > 0) ctx.globalAlpha = Math.max(0, 1 - hidden)
  for (let i = 0; i < g.count; i++) {
    const ox = x0 + i * slot
    drawKind(ctx, g.kind, g.descriptor, ox, groundY, t, g.id * 31 + i)
  }
  ctx.restore()
}

export function drawKind(ctx: Ctx, kind: string, desc: string, x: number, y: number, t: number, seed: number): void {
  const s = sizeFor(desc), tall = tallFor(desc), r = h1(seed)
  switch (kind) {
    case 'tree': return tree(ctx, x, y, s, tall, desc === 'round', r)
    case 'bush': return bush(ctx, x, y, s, desc === 'round', colorFor(desc, P.green), r)
    case 'rock': return rock(ctx, x, y, s * 0.9, desc === 'round', colorFor(desc, P.rock), r)
    case 'boulder': return rock(ctx, x, y, s * 1.5, desc === 'round', colorFor(desc, P.rock), r)
    case 'flower': return flower(ctx, x, y, desc === 'small' ? 0.7 : 1, tall, colorFor(desc, P.pink), r)
    case 'mushroom': return mushroom(ctx, x, y, s, colorFor(desc, P.red), desc === 'spotted', r)
    case 'log': return log(ctx, x, y, s)
    case 'stump': return stump(ctx, x, y, s)
    case 'fern': return fern(ctx, x, y, s, t, r)
    case 'lantern': return lantern(ctx, x, y, s, tall, colorFor(desc, P.orange), t)
    case 'sign': return sign(ctx, x, y, s, tall, desc === 'round', colorFor(desc, P.cream), r)
    case 'nest': return nest(ctx, x, y, s, desc === 'round', r)
    case 'fence': return fence(ctx, x, y, s, tall, colorFor(desc, P.wood))
    case 'cart': return cart(ctx, x, y, s, colorFor(desc, P.wood))
    case 'crystal': return crystal(ctx, x, y, s, tall, colorFor(desc, P.purplePale), r)
    case 'pine': return pine(ctx, x, y, s, tall, desc === 'snowy', r)
    case 'shovel': return shovel(ctx, x, y, tall, colorFor(desc, P.blue))
    case 'snowman': return snowman(ctx, x, y, s, r)
    case 'icicle': return icicle(ctx, x, y, s, desc === 'long' ? 1.4 : desc === 'short' ? 0.7 : 1, colorFor(desc, P.ice))
    case 'gem': return gem(ctx, x, y, s, colorFor(desc, P.red), r)
    case 'flag': return flag(ctx, x, y, tall, colorFor(desc, P.red), t)
  }
}

// ------------------------------------------------------------------ plants
function tree(ctx: Ctx, x: number, y: number, s: number, tall: number, round: boolean, r: number): void {
  const trunkH = 70 * s * tall, trunkW = 22 * s
  shadowBlob(ctx, x, y, 36 * s)
  // trunk with a flare at the base
  ctx.beginPath(); ctx.moveTo(x - trunkW / 2, y - trunkH); ctx.lineTo(x - trunkW / 2 - 2, y - 20); ctx.quadraticCurveTo(x - trunkW, y, x - trunkW * 1.3, y); ctx.lineTo(x + trunkW * 1.3, y); ctx.quadraticCurveTo(x + trunkW, y, x + trunkW / 2 + 2, y - 20); ctx.lineTo(x + trunkW / 2, y - trunkH); ctx.closePath()
  fillStroke(ctx, P.brown)
  ctx.fillStyle = P.brownDark; ctx.fillRect(x + trunkW * 0.15, y - trunkH + 6, trunkW * 0.25, trunkH - 12)
  // canopy: blocky squarish canopy like the original's "small trees", or round
  const cw = 90 * s, ch = (round ? 70 : 64) * s
  const cy = y - trunkH - ch * 0.5
  if (round) {
    circle(ctx, x, cy, cw / 2, P.green)
    ctx.save(); ctx.globalAlpha = 0.45; circle(ctx, x - cw * 0.15, cy - ch * 0.15, cw * 0.28, P.greenLight, 'rgba(0,0,0,0)', 0); ctx.restore()
  } else {
    // three lobes
    ctx.beginPath()
    ctx.moveTo(x - cw / 2, cy + ch / 2)
    ctx.quadraticCurveTo(x - cw / 2 - 8, cy - ch * 0.2, x - cw * 0.25, cy - ch * 0.35)
    ctx.quadraticCurveTo(x - cw * 0.1, cy - ch * 0.8, x + cw * 0.1, cy - ch * 0.5)
    ctx.quadraticCurveTo(x + cw * 0.45, cy - ch * 0.75, x + cw / 2, cy - ch * 0.1)
    ctx.quadraticCurveTo(x + cw / 2 + 6, cy + ch * 0.3, x + cw * 0.3, cy + ch / 2)
    ctx.closePath()
    fillStroke(ctx, P.green)
    ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = P.greenLight
    ctx.beginPath(); ctx.ellipse(x - cw * 0.12, cy - ch * 0.18, cw * 0.28, ch * 0.22, -0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
    ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = P.greenDark
    ctx.beginPath(); ctx.ellipse(x + cw * 0.15, cy + ch * 0.22, cw * 0.3, ch * 0.18, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  }
  if (r > 0.5) { circle(ctx, x + cw * 0.2, cy - ch * 0.1, 5 * s, P.red, P.ink, 1.5); circle(ctx, x - cw * 0.25, cy + ch * 0.15, 5 * s, P.red, P.ink, 1.5) }
}

function bush(ctx: Ctx, x: number, y: number, s: number, round: boolean, color: string, r: number): void {
  shadowBlob(ctx, x, y, 40 * s)
  const w = 84 * s, h = (round ? 60 : 50) * s
  ctx.beginPath()
  if (round) ctx.ellipse(x, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2)
  else { ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x - w / 2, y - h * 0.9, x - w * 0.2, y - h); ctx.quadraticCurveTo(x, y - h * 1.25, x + w * 0.2, y - h); ctx.quadraticCurveTo(x + w / 2, y - h * 0.9, x + w / 2, y); ctx.closePath() }
  fillStroke(ctx, color)
  ctx.save(); ctx.globalAlpha = 0.4; ctx.fillStyle = P.greenLight; ctx.beginPath(); ctx.ellipse(x - w * 0.18, y - h * 0.62, w * 0.22, h * 0.2, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  // little leaf marks
  ctx.strokeStyle = P.greenDark; ctx.lineWidth = 2
  for (let i = 0; i < 4; i++) { const lx = x - w * 0.3 + i * w * 0.2, ly = y - h * (0.3 + (i % 2) * 0.3); ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + 6, ly - 8); ctx.stroke() }
  if (r > 0.6) for (let i = 0; i < 3; i++) circle(ctx, x - w * 0.25 + i * w * 0.25, y - h * (0.45 + (i % 2) * 0.25), 4 * s, P.blue, P.ink, 1.5)
}

function flower(ctx: Ctx, x: number, y: number, s: number, tall: number, color: string, r: number): void {
  const stemH = 46 * s * tall
  line(ctx, x, y, x, y - stemH, P.ink, 5); line(ctx, x, y, x, y - stemH, P.greenDark, 2.5)
  leaf(ctx, x, y - stemH * 0.45, 8 * s, -0.5, P.green); leaf(ctx, x, y - stemH * 0.3, 8 * s, 3.5, P.green)
  const cy = y - stemH, pr = 11 * s
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + r; ellipse(ctx, cx(x, a, pr * 1.1), cy + Math.sin(a) * pr * 1.1, pr * 0.62, pr * 0.42, color, P.ink, 2, a) }
  circle(ctx, x, cy, pr * 0.55, P.yellow, P.ink, 2)
}
const cx = (x: number, a: number, r: number) => x + Math.cos(a) * r

function mushroom(ctx: Ctx, x: number, y: number, s: number, color: string, spotted: boolean, r: number): void {
  shadowBlob(ctx, x, y, 24 * s)
  const stemH = 34 * s, capW = 52 * s
  roundRect(ctx, x - 9 * s, y - stemH, 18 * s, stemH, 6 * s, P.cream)
  ctx.beginPath(); ctx.moveTo(x - capW / 2, y - stemH + 4); ctx.quadraticCurveTo(x - capW / 2, y - stemH - 34 * s, x, y - stemH - 36 * s); ctx.quadraticCurveTo(x + capW / 2, y - stemH - 34 * s, x + capW / 2, y - stemH + 4); ctx.closePath()
  fillStroke(ctx, color)
  if (spotted || r > 0.5) { circle(ctx, x - 12 * s, y - stemH - 12 * s, 5 * s, P.white, P.ink, 1.5); circle(ctx, x + 8 * s, y - stemH - 22 * s, 4 * s, P.white, P.ink, 1.5); circle(ctx, x + 14 * s, y - stemH - 6 * s, 3.5 * s, P.white, P.ink, 1.5) }
}

function log(ctx: Ctx, x: number, y: number, s: number): void {
  const w = 110 * s, h = 34
  shadowBlob(ctx, x, y, w / 2)
  roundRect(ctx, x - w / 2, y - h, w, h, 12, P.brown)
  ctx.fillStyle = P.brownDark; ctx.fillRect(x - w / 2 + 14, y - h + 8, w - 28, 4); ctx.fillRect(x - w / 2 + 20, y - 12, w - 40, 4)
  ellipse(ctx, x + w / 2 - 2, y - h / 2, 10, h / 2, P.brownLight, P.ink, 2.5)
  circle(ctx, x + w / 2 - 2, y - h / 2, 4, P.brown, P.ink, 1.5)
}

function stump(ctx: Ctx, x: number, y: number, s: number): void {
  const w = 56 * s, h = 34 * s
  shadowBlob(ctx, x, y, w / 2)
  roundRect(ctx, x - w / 2, y - h, w, h, 6, P.brown)
  ctx.fillStyle = P.brownDark; ctx.fillRect(x - w / 2 + 8, y - h + 10, 5, h - 14); ctx.fillRect(x + w / 2 - 14, y - h + 12, 5, h - 16)
  ellipse(ctx, x, y - h, w / 2, 9 * s, P.brownLight, P.ink, 2.5)
  ellipse(ctx, x, y - h, w / 4, 4 * s, P.brown, P.ink, 1.5)
}

function fern(ctx: Ctx, x: number, y: number, s: number, t: number, r: number): void {
  ctx.strokeStyle = P.ink; ctx.lineWidth = 2
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i - 2) * 0.42 + Math.sin(t + i + r * 6) * 0.04
    const len = (40 + (i === 2 ? 14 : 0)) * s
    const ex = x + Math.cos(a) * len, ey = y + Math.sin(a) * len
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * len * 0.5 - 4, y + Math.sin(a) * len * 0.5, ex, ey); ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = P.greenDark; ctx.stroke()
    for (let k = 1; k <= 4; k++) { const f = k / 5; const px = x + Math.cos(a) * len * f, py = y + Math.sin(a) * len * f; leaf(ctx, px, py, 6 * s, a - 1.2, P.greenLight); leaf(ctx, px, py, 6 * s, a + 1.2 + Math.PI, P.green) }
  }
}

function pine(ctx: Ctx, x: number, y: number, s: number, tall: number, snowy: boolean, r: number): void {
  const h = 110 * s * tall, w = 76 * s
  shadowBlob(ctx, x, y, w / 2)
  roundRect(ctx, x - 8 * s, y - 24, 16 * s, 24, 3, P.brown)
  for (let i = 0; i < 3; i++) {
    const ty = y - 18 - i * h * 0.28, tw = w * (1 - i * 0.22), th = h * 0.42
    poly(ctx, [[x - tw / 2, ty], [x, ty - th], [x + tw / 2, ty]], i === 1 ? P.greenDark : P.green)
    if (snowy || r > 0.6) { ctx.beginPath(); ctx.moveTo(x - tw * 0.3, ty - th * 0.45); ctx.quadraticCurveTo(x, ty - th * 0.75, x + tw * 0.3, ty - th * 0.45); ctx.quadraticCurveTo(x, ty - th * 0.3, x - tw * 0.3, ty - th * 0.45); ctx.closePath(); fillStroke(ctx, P.snow, P.ink, 1.5) }
  }
  if (r > 0.3) for (let i = 0; i < 3; i++) circle(ctx, x - 16 + i * 16, y - 40 - i * 22 * tall, 4, i % 2 ? P.red : P.yellow, P.ink, 1.5)
}

// ------------------------------------------------------------------ rocks and minerals
function rock(ctx: Ctx, x: number, y: number, s: number, round: boolean, color: string, r: number): void {
  const w = 70 * s, h = (round ? 56 : 46) * s
  shadowBlob(ctx, x, y, w / 2)
  ctx.beginPath()
  if (round) ctx.ellipse(x, y - h / 2 + 4, w / 2, h / 2, 0, 0, Math.PI * 2)
  else { ctx.moveTo(x - w / 2, y); ctx.lineTo(x - w * 0.42, y - h * 0.7); ctx.lineTo(x - w * 0.1, y - h); ctx.lineTo(x + w * 0.3, y - h * 0.85); ctx.lineTo(x + w / 2, y - h * 0.35); ctx.lineTo(x + w * 0.45, y); ctx.closePath() }
  fillStroke(ctx, color)
  ctx.save(); ctx.globalAlpha = 0.45; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x - w * 0.18, y - h * 0.62, w * 0.2, h * 0.14, -0.4, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  ctx.save(); ctx.globalAlpha = 0.3; ctx.fillStyle = P.ink; ctx.beginPath(); ctx.ellipse(x + w * 0.15, y - h * 0.22, w * 0.25, h * 0.14, 0.3, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  if (r > 0.5) { ctx.strokeStyle = P.rockDark; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x + w * 0.1, y - h * 0.8); ctx.lineTo(x + w * 0.2, y - h * 0.5); ctx.lineTo(x + w * 0.1, y - h * 0.3); ctx.stroke() }
}

function crystal(ctx: Ctx, x: number, y: number, s: number, tall: number, color: string, r: number): void {
  const h = 60 * s * tall, w = 30 * s
  shadowBlob(ctx, x, y, w)
  poly(ctx, [[x - w, y], [x - w * 0.7, y - h * 0.6], [x - w * 0.2, y - h], [x + w * 0.2, y - h * 0.75], [x + w * 0.9, y - h * 0.45], [x + w, y]], color)
  ctx.save(); ctx.globalAlpha = 0.5; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - w * 0.5, y - h * 0.2); ctx.lineTo(x - w * 0.25, y - h * 0.9); ctx.lineTo(x - w * 0.15, y - h * 0.55); ctx.closePath(); ctx.fill(); ctx.restore()
  if (r > 0.4) poly(ctx, [[x + w * 0.6, y], [x + w * 0.9, y - h * 0.4], [x + w * 1.4, y - h * 0.25], [x + w * 1.6, y]], color)
}

function gem(ctx: Ctx, x: number, y: number, s: number, color: string, r: number): void {
  const w = 30 * s, h = 34 * s
  shadowBlob(ctx, x, y, w)
  poly(ctx, [[x - w, y - h * 0.62], [x - w * 0.55, y - h], [x + w * 0.55, y - h], [x + w, y - h * 0.62], [x, y]], color)
  ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - w * 0.7, y - h * 0.64); ctx.lineTo(x - w * 0.45, y - h * 0.92); ctx.lineTo(x - w * 0.2, y - h * 0.64); ctx.closePath(); ctx.fill(); ctx.restore()
  ctx.strokeStyle = 'rgba(26,34,56,0.5)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - w, y - h * 0.62); ctx.lineTo(x + w, y - h * 0.62); ctx.stroke()
  if (r > 0.5) star(ctx, x + w * 0.8, y - h * 1.1, 6 * s, P.white, 'rgba(0,0,0,0)', 0, 4)
}

function icicle(ctx: Ctx, x: number, y: number, s: number, len: number, color: string): void {
  // an ice spike growing from the ground (a frozen drip)
  const h = 70 * s * len, w = 22 * s
  shadowBlob(ctx, x, y, w)
  poly(ctx, [[x - w, y], [x - w * 0.5, y - h * 0.5], [x, y - h], [x + w * 0.5, y - h * 0.55], [x + w, y]], color)
  ctx.save(); ctx.globalAlpha = 0.6; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(x - w * 0.55, y - h * 0.15); ctx.lineTo(x - w * 0.25, y - h * 0.8); ctx.lineTo(x - w * 0.1, y - h * 0.3); ctx.closePath(); ctx.fill(); ctx.restore()
}

// ------------------------------------------------------------------ made things
function lantern(ctx: Ctx, x: number, y: number, s: number, tall: number, color: string, t: number): void {
  const poleH = 90 * s * tall
  line(ctx, x, y, x, y - poleH, P.ink, 8); line(ctx, x, y, x, y - poleH, P.woodDark, 4)
  line(ctx, x, y - poleH, x + 22, y - poleH + 6, P.ink, 6); line(ctx, x, y - poleH, x + 22, y - poleH + 6, P.woodDark, 3)
  const ly = y - poleH + 6
  line(ctx, x + 22, ly, x + 22, ly + 10, P.ink, 2)
  const glow = 0.5 + Math.sin(t * 6) * 0.1
  ctx.save(); const gr = ctx.createRadialGradient(x + 22, ly + 30, 4, x + 22, ly + 30, 60 * s); gr.addColorStop(0, `rgba(255,220,120,${glow})`); gr.addColorStop(1, 'rgba(255,220,120,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x + 22, ly + 30, 60 * s, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  roundRect(ctx, x + 22 - 12 * s, ly + 10, 24 * s, 34 * s, 5, color)
  ctx.fillStyle = P.yellow; ctx.fillRect(x + 22 - 6 * s, ly + 18, 12 * s, 18 * s)
  roundRect(ctx, x + 22 - 15 * s, ly + 6, 30 * s, 8, 2, P.ink, P.ink, 0)
  roundRect(ctx, x + 22 - 14 * s, ly + 42 * s, 28 * s, 6, 2, P.ink, P.ink, 0)
}

function sign(ctx: Ctx, x: number, y: number, s: number, tall: number, round: boolean, color: string, r: number): void {
  const poleH = 70 * s * tall
  line(ctx, x, y, x, y - poleH, P.ink, 8); line(ctx, x, y, x, y - poleH, P.wood, 4)
  const bw = 60 * s, bh = 36 * s
  if (round) circle(ctx, x, y - poleH - bh * 0.5, bw * 0.55, color)
  else roundRect(ctx, x - bw / 2, y - poleH - bh, bw, bh, 5, color)
  const words = ['ELF XING', 'MINE', 'KEEP OUT', 'NETS →', 'TREASURE?', 'CAVE']
  const w = words[Math.floor(r * words.length) % words.length]
  ctx.fillStyle = P.ink; ctx.font = `800 ${Math.round(12 * s)}px "Nunito", "Trebuchet MS", sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(w, x, y - poleH - bh * 0.5)
}

function nest(ctx: Ctx, x: number, y: number, s: number, round: boolean, r: number): void {
  const w = 62 * s, h = (round ? 34 : 26) * s
  shadowBlob(ctx, x, y, w / 2)
  ctx.beginPath(); ctx.ellipse(x, y - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.closePath(); fillStroke(ctx, P.brownLight)
  ctx.strokeStyle = P.brownDark; ctx.lineWidth = 2
  for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.moveTo(x - w * 0.4 + i * w * 0.16, y - h * 0.15); ctx.lineTo(x - w * 0.3 + i * w * 0.16, y - h * 0.8); ctx.stroke() }
  ellipse(ctx, x, y - h * 0.75, w * 0.4, h * 0.3, P.brownDark, P.ink, 2)
  const eggs = 1 + Math.floor(r * 3)
  for (let i = 0; i < eggs; i++) ellipse(ctx, x - (eggs - 1) * 8 * s + i * 16 * s, y - h * 0.8, 7 * s, 9 * s, P.cyanPale, P.ink, 2)
}

function fence(ctx: Ctx, x: number, y: number, s: number, tall: number, color: string): void {
  const w = 100 * s, h = 46 * tall
  for (let i = 0; i < 4; i++) { const px = x - w / 2 + i * (w / 3); roundRect(ctx, px - 6, y - h, 12, h, 3, color); poly(ctx, [[px - 6, y - h], [px, y - h - 8], [px + 6, y - h]], color, P.ink, 2.5) }
  roundRect(ctx, x - w / 2 - 6, y - h * 0.75, w + 12, 9, 2, color)
  roundRect(ctx, x - w / 2 - 6, y - h * 0.35, w + 12, 9, 2, color)
}

function cart(ctx: Ctx, x: number, y: number, s: number, color: string): void {
  const w = 96 * s, h = 44 * s
  shadowBlob(ctx, x, y, w / 2)
  circle(ctx, x - w * 0.3, y - 12 * s, 13 * s, P.rockDark); circle(ctx, x + w * 0.3, y - 12 * s, 13 * s, P.rockDark)
  poly(ctx, [[x - w / 2, y - h - 14], [x + w / 2, y - h - 14], [x + w * 0.4, y - 18], [x - w * 0.4, y - 18]], color)
  ctx.fillStyle = P.brownDark; ctx.fillRect(x - w / 2 + 4, y - h - 4, w - 8, 4); ctx.fillRect(x - w * 0.42, y - 32, w * 0.84, 4)
  // cargo: gold nuggets
  for (let i = 0; i < 4; i++) circle(ctx, x - w * 0.3 + i * w * 0.2, y - h - 16 - (i % 2) * 6, 8 * s, P.gold, P.ink, 2)
}

function shovel(ctx: Ctx, x: number, y: number, tall: number, color: string): void {
  const h = 84 * tall
  ctx.save(); ctx.translate(x, y); ctx.rotate(0.12)
  // blade stuck in the ground
  poly(ctx, [[-14, -26], [14, -26], [12, 4], [0, 12], [-12, 4]], P.rock)
  ctx.fillStyle = P.rockDark; ctx.fillRect(-2, -24, 4, 30)
  line(ctx, 0, -24, 0, -h, P.ink, 9); line(ctx, 0, -24, 0, -h, P.wood, 5)
  roundRect(ctx, -14, -h - 12, 28, 14, 6, color)
  ctx.restore()
  // little snow at the base
  ctx.fillStyle = P.snow; ctx.beginPath(); ctx.ellipse(x, y, 22, 6, 0, 0, Math.PI * 2); ctx.fill()
}

function snowman(ctx: Ctx, x: number, y: number, s: number, r: number): void {
  shadowBlob(ctx, x, y, 36 * s)
  circle(ctx, x, y - 26 * s, 30 * s, P.snow)
  circle(ctx, x, y - 66 * s, 22 * s, P.snow)
  circle(ctx, x, y - 98 * s, 16 * s, P.snow)
  circle(ctx, x - 6 * s, y - 100 * s, 2.5, P.ink, P.ink, 0); circle(ctx, x + 6 * s, y - 100 * s, 2.5, P.ink, P.ink, 0)
  poly(ctx, [[x, y - 96 * s], [x + 16 * s, y - 92 * s], [x, y - 90 * s]], P.orange, P.ink, 1.5)
  for (let i = 0; i < 3; i++) circle(ctx, x, y - 54 * s - i * 12 * s, 2.5, P.ink, P.ink, 0)
  // hat
  roundRect(ctx, x - 20 * s, y - 112 * s, 40 * s, 6, 2, P.ink, P.ink, 0); roundRect(ctx, x - 13 * s, y - 132 * s, 26 * s, 22 * s, 3, r > 0.5 ? P.ink : P.red)
  // stick arms
  line(ctx, x - 20 * s, y - 66 * s, x - 42 * s, y - 84 * s, P.brownDark, 3); line(ctx, x + 20 * s, y - 66 * s, x + 42 * s, y - 80 * s, P.brownDark, 3)
  // scarf
  roundRect(ctx, x - 20 * s, y - 84 * s, 40 * s, 8, 3, P.red, P.ink, 2)
}

function flag(ctx: Ctx, x: number, y: number, tall: number, color: string, t: number): void {
  const h = 100 * tall
  line(ctx, x, y, x, y - h, P.ink, 7); line(ctx, x, y, x, y - h, P.rockLight, 3)
  circle(ctx, x, y - h, 5, P.gold, P.ink, 2)
  const w = 44, fh = 28
  const wave = Math.sin(t * 5) * 4
  ctx.beginPath(); ctx.moveTo(x, y - h + 4); ctx.quadraticCurveTo(x + w * 0.5, y - h + 4 + wave, x + w, y - h + 2); ctx.lineTo(x + w - 6, y - h + fh / 2); ctx.lineTo(x + w, y - h + fh); ctx.quadraticCurveTo(x + w * 0.5, y - h + fh - wave, x, y - h + fh + 2); ctx.closePath()
  fillStroke(ctx, color, P.ink, 2.5)
  star(ctx, x + 18, y - h + 16, 7, P.white, 'rgba(0,0,0,0)', 0)
}

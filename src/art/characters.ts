import { P, CAP_COLORS, CAP_DARK } from './palette'
import { type Ctx, circle, ellipse, poly, line, roundRect, shadowBlob, rr, fillStroke } from './draw'
import type { PlayerState } from '../game/types'

/**
 * The Super Solver. Drawn with feet at (x, y); about 130px tall. `facing` flips horizontally.
 * States drive the pose; `t` is the time in the state, `walkT` the distance walked.
 */
export function drawPlayer(ctx: Ctx, x: number, y: number, facing: 1 | -1, state: PlayerState, t: number, walkT: number, netSwing = 0): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(facing, 1)
  const walking = state === 'walk'
  const ph = walkT / 24
  const legSwing = walking ? Math.sin(ph) * 22 : 0
  const bob = walking ? Math.abs(Math.cos(ph)) * 4 : state === 'idle' ? Math.sin(t * 2) * 1.5 : 0
  const crouch = state === 'drop' ? Math.sin(Math.min(1, t / 0.3) * Math.PI) * 18 : state === 'hit' ? 6 : 0
  const jump = state === 'jump'
  const climb = state === 'climb' || state === 'ride'
  if (!climb && state !== 'enter') shadowBlob(ctx, 0, 2, 34)
  ctx.translate(0, -bob + crouch)

  // ---- legs & boots
  const legL = jump ? -12 : climb ? Math.sin(t * 8) * 16 : legSwing
  const legR = jump ? 10 : climb ? -Math.sin(t * 8) * 16 : -legSwing
  drawLeg(ctx, -12, legL, jump)
  drawLeg(ctx, 12, legR, jump)

  // ---- backpack (behind the body)
  roundRect(ctx, -34, -96 - (crouch ? 4 : 0), 26, 40, 8, P.yellow)
  roundRect(ctx, -32, -92, 8, 10, 3, P.yellowDark, P.ink, 2)

  // ---- body: cyan tunic with belt
  ctx.beginPath()
  ctx.moveTo(-26, -100); ctx.quadraticCurveTo(-30, -60, -24, -44); ctx.lineTo(24, -44); ctx.quadraticCurveTo(30, -60, 26, -100); ctx.closePath()
  fillStroke(ctx, P.cyan)
  ctx.fillStyle = P.cyanDark; ctx.fillRect(-23, -58, 46, 8)
  roundRect(ctx, -6, -60, 12, 12, 3, P.yellow, P.ink, 2)
  // collar
  poly(ctx, [[-14, -100], [0, -88], [14, -100]], P.cyanPale, P.ink, 2)

  // ---- arms
  const armA = state === 'net' ? netSwing : walking ? -legSwing * 0.7 : jump ? -60 : climb ? Math.sin(t * 8 + 1.5) * 40 : state === 'drop' ? 45 : 0
  // back arm
  drawArm(ctx, -22, -92, -armA * 0.6 - 20, P.cyan)
  // front arm with the net
  ctx.save()
  ctx.translate(22, -92)
  ctx.rotate((armA - 10) * Math.PI / 180)
  drawArmSeg(ctx, P.cyan)
  // net handle held at the hand
  ctx.translate(0, 34)
  ctx.rotate(-Math.PI / 2 + 0.15)
  drawNet(ctx)
  ctx.restore()

  // ---- head
  const hy = -112
  circle(ctx, 0, hy, 24, P.skin)
  // hair tuft
  ctx.fillStyle = P.hair
  ctx.beginPath(); ctx.moveTo(-22, hy - 6); ctx.quadraticCurveTo(-8, hy - 30, 22, hy - 10); ctx.quadraticCurveTo(10, hy - 16, -2, hy - 12); ctx.quadraticCurveTo(-12, hy - 12, -22, hy - 6); ctx.closePath(); ctx.fill()
  // eye and smile (facing right)
  circle(ctx, 10, hy - 2, 4, P.ink, P.ink, 0)
  circle(ctx, 11.5, hy - 3.5, 1.4, P.white, P.white, 0)
  ctx.strokeStyle = P.ink; ctx.lineWidth = 2.5; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.arc(8, hy + 6, 8, 0.2, Math.PI - 0.6); ctx.stroke()
  // nose
  ctx.beginPath(); ctx.moveTo(20, hy + 2); ctx.lineTo(25, hy + 5); ctx.stroke()
  // ---- Robin Hood cap with feather
  ctx.beginPath()
  ctx.moveTo(-28, hy - 8); ctx.quadraticCurveTo(-6, hy - 44, 30, hy - 22); ctx.lineTo(36, hy - 14); ctx.quadraticCurveTo(6, hy - 30, -28, hy - 8); ctx.closePath()
  fillStroke(ctx, P.red)
  ctx.beginPath(); ctx.moveTo(-28, hy - 8); ctx.quadraticCurveTo(0, hy - 18, 36, hy - 14); ctx.lineTo(34, hy - 8); ctx.quadraticCurveTo(0, hy - 12, -26, hy - 4); ctx.closePath()
  fillStroke(ctx, P.redDark, P.ink, 2)
  // feather
  ctx.save(); ctx.translate(-16, hy - 24); ctx.rotate(-0.9)
  ellipse(ctx, 0, -14, 6, 18, P.white, P.ink, 2)
  line(ctx, 0, 2, 0, -30, P.rockDark, 1.5)
  ctx.restore()
  ctx.restore()
}

function drawLeg(ctx: Ctx, x: number, swing: number, tucked: boolean): void {
  ctx.save(); ctx.translate(x, -46); ctx.rotate(swing * Math.PI / 180)
  roundRect(ctx, -9, -2, 18, tucked ? 26 : 34, 6, P.red)
  // boot
  const by = tucked ? 22 : 30
  ctx.beginPath(); ctx.moveTo(-10, by); ctx.lineTo(-10, by + 14); ctx.lineTo(16, by + 14); ctx.quadraticCurveTo(18, by + 4, 8, by + 2); ctx.lineTo(8, by); ctx.closePath()
  fillStroke(ctx, P.brown)
  ctx.fillStyle = P.brownDark; ctx.fillRect(-10, by + 10, 26, 4)
  ctx.restore()
}

function drawArm(ctx: Ctx, x: number, y: number, deg: number, color: string): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(deg * Math.PI / 180); drawArmSeg(ctx, color); ctx.restore()
}
function drawArmSeg(ctx: Ctx, color: string): void {
  roundRect(ctx, -8, -4, 16, 36, 7, color)
  circle(ctx, 0, 36, 8, P.skin, P.ink, 2.5)
}

/** The hoop net, drawn along +y (handle) with the hoop at the end. Origin at the hand. */
export function drawNet(ctx: Ctx, scale = 1): void {
  ctx.save(); ctx.scale(scale, scale)
  line(ctx, 0, 10, 0, -60, P.ink, 8)
  line(ctx, 0, 10, 0, -60, P.wood, 4)
  // hoop
  ctx.beginPath(); ctx.ellipse(0, -84, 22, 26, 0, 0, Math.PI * 2)
  ctx.lineWidth = 6; ctx.strokeStyle = P.ink; ctx.stroke()
  ctx.lineWidth = 3; ctx.strokeStyle = P.blue; ctx.stroke()
  // mesh
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = P.cyanPale
  ctx.beginPath(); ctx.ellipse(0, -84, 20, 24, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
  ctx.strokeStyle = 'rgba(30,72,163,0.5)'; ctx.lineWidth = 1
  for (let i = -16; i <= 16; i += 8) { ctx.beginPath(); ctx.moveTo(i, -106); ctx.lineTo(i, -62); ctx.stroke() }
  for (let j = -100; j <= -68; j += 8) { ctx.beginPath(); ctx.moveTo(-20, j); ctx.lineTo(20, j); ctx.stroke() }
  ctx.restore()
}

export type ElfPose = 'run' | 'caught' | 'dance' | 'stand'

/** An elf, feet at (x, y), about 70px tall. */
export function drawElf(ctx: Ctx, x: number, y: number, facing: 1 | -1, pose: ElfPose, t: number, color: number, item: 'none' | 'scroll' | 'balloon' | 'dust' = 'none'): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(facing, 1)
  const cap = CAP_COLORS[color % 3], capDark = CAP_DARK[color % 3]
  const tunic = color === 0 ? P.blue : color === 1 ? P.purple : P.green
  const tunicDark = color === 0 ? P.blueDark : color === 1 ? P.purpleDark : P.greenDark
  const run = pose === 'run'
  const ph = t * 14
  const swing = run ? Math.sin(ph) * 30 : pose === 'dance' ? Math.sin(t * 10) * 12 : 0
  const bob = run ? Math.abs(Math.cos(ph)) * 3 : pose === 'dance' ? Math.abs(Math.sin(t * 10)) * 6 : 0
  if (pose !== 'caught') shadowBlob(ctx, 0, 1, 20)
  ctx.translate(0, -bob)
  if (pose === 'caught') {
    // Sitting under the net: legs out front, dizzy
    ctx.translate(0, 8)
  }
  // legs
  for (const s of [-1, 1]) {
    ctx.save(); ctx.translate(s * 7, -26); ctx.rotate((pose === 'caught' ? -60 * s : swing * s) * Math.PI / 180)
    roundRect(ctx, -5, 0, 10, 22, 4, P.red, P.ink, 2.5)
    // big shoe
    ctx.beginPath(); ctx.moveTo(-6, 18); ctx.lineTo(-6, 28); ctx.lineTo(14, 28); ctx.quadraticCurveTo(18, 22, 10, 20); ctx.lineTo(6, 18); ctx.closePath(); fillStroke(ctx, P.brown, P.ink, 2.5)
    ctx.restore()
  }
  // tunic
  ctx.beginPath(); ctx.moveTo(-16, -56); ctx.lineTo(-20, -24); ctx.lineTo(20, -24); ctx.lineTo(16, -56); ctx.closePath(); fillStroke(ctx, tunic, P.ink, 2.5)
  ctx.fillStyle = tunicDark; ctx.fillRect(-19, -32, 38, 5)
  // arms
  const armSwing = run ? -swing : pose === 'dance' ? 50 + Math.sin(t * 10) * 30 : pose === 'caught' ? 20 : 10
  ctx.save(); ctx.translate(-14, -52); ctx.rotate((armSwing * 0.8 + 25) * Math.PI / 180); roundRect(ctx, -4, 0, 9, 22, 4, tunic, P.ink, 2.5); circle(ctx, 0, 24, 5, P.elfSkin, P.ink, 2); ctx.restore()
  ctx.save(); ctx.translate(14, -52); ctx.rotate((-armSwing * 0.8 - 25 - (item !== 'none' ? 40 : 0)) * Math.PI / 180); roundRect(ctx, -4, 0, 9, 22, 4, tunic, P.ink, 2.5); circle(ctx, 0, 24, 5, P.elfSkin, P.ink, 2)
  // held item
  if (item === 'scroll') { ctx.translate(0, 26); ctx.rotate(0.3); roundRect(ctx, -6, -18, 12, 32, 5, P.cream, P.ink, 2); ctx.fillStyle = P.yellowDark; ctx.fillRect(-6, -18, 12, 5); ctx.fillRect(-6, 9, 12, 5) }
  if (item === 'dust') { ctx.translate(0, 28); roundRect(ctx, -8, -8, 16, 16, 6, P.purple, P.ink, 2); circle(ctx, 0, -9, 4, P.yellow, P.ink, 1.5) }
  ctx.restore()
  if (item === 'balloon') {
    line(ctx, 18, -70, 28, -120, P.ink, 1.5)
    ellipse(ctx, 30, -136, 16, 20, P.red, P.ink, 2.5)
    ellipse(ctx, 25, -142, 4, 6, 'rgba(255,255,255,0.6)', 'rgba(0,0,0,0)', 0)
  }
  // head
  const hy = -70
  circle(ctx, 0, hy, 15, P.elfSkin, P.ink, 2.5)
  // pointy ears
  poly(ctx, [[-13, hy - 2], [-26, hy - 10], [-14, hy + 6]], P.elfSkin, P.ink, 2)
  // face
  if (pose === 'caught') {
    line(ctx, 4, hy - 4, 10, hy + 2, P.ink, 2); line(ctx, 10, hy - 4, 4, hy + 2, P.ink, 2)
    ctx.beginPath(); ctx.arc(6, hy + 7, 4, 0, Math.PI * 2); ctx.lineWidth = 2; ctx.strokeStyle = P.ink; ctx.stroke()
  } else {
    circle(ctx, 6, hy - 2, 2.6, P.ink, P.ink, 0)
    ctx.strokeStyle = P.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(5, hy + 4, 5, 0.1, Math.PI - 0.4); ctx.stroke()
    circle(ctx, 12, hy + 3, 2.5, '#ff9aa8', '#ff9aa8', 0)
  }
  // cap: tall pointed hat flopping back
  ctx.beginPath(); ctx.moveTo(-18, hy - 8); ctx.quadraticCurveTo(-10, hy - 30, -34, hy - 44); ctx.quadraticCurveTo(-6, hy - 40, 14, hy - 22); ctx.lineTo(19, hy - 9); ctx.closePath(); fillStroke(ctx, cap, P.ink, 2.5)
  ctx.beginPath(); ctx.moveTo(-18, hy - 8); ctx.quadraticCurveTo(0, hy - 14, 19, hy - 9); ctx.lineTo(18, hy - 3); ctx.quadraticCurveTo(0, hy - 8, -18, hy - 3); ctx.closePath(); fillStroke(ctx, capDark, P.ink, 2)
  circle(ctx, -34, hy - 44, 4, P.yellow, P.ink, 2)
  ctx.restore()
}

/** The Master of Mischief: a big round head with wild hair, red nose and the stolen crown. */
export function drawMaster(ctx: Ctx, x: number, y: number, t: number, mood: 'smug' | 'angry' | 'blown' = 'smug', scale = 1): void {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale)
  if (mood === 'blown') ctx.rotate(Math.sin(t * 20) * 0.3)
  // robe
  ctx.beginPath(); ctx.moveTo(-48, 0); ctx.quadraticCurveTo(-56, -60, -30, -90); ctx.lineTo(30, -90); ctx.quadraticCurveTo(56, -60, 48, 0); ctx.closePath(); fillStroke(ctx, P.purple)
  ctx.fillStyle = P.purpleDark; ctx.fillRect(-40, -20, 80, 8)
  // hands
  circle(ctx, -46, -40, 9, P.skin, P.ink, 2.5); circle(ctx, 46, -40, 9, P.skin, P.ink, 2.5)
  // head
  const hy = -125
  circle(ctx, 0, hy, 42, P.skin)
  // wild orange hair: a ring of tufts around the top of the head, bristling when angry
  for (let i = 0; i < 11; i++) {
    const a = Math.PI * 0.95 + (i / 10) * Math.PI * 1.1
    const jit = mood === 'angry' ? 6 + Math.sin(t * 30 + i) * 4 : 0
    const rr = 40 + (i % 2 ? 14 : 6) + jit
    circle(ctx, Math.cos(a) * rr, hy + Math.sin(a) * rr, 13 + (i % 3) * 3, i % 2 ? P.orange : '#ff9f3d', P.ink, 2.5)
  }
  circle(ctx, 0, hy, 42, P.skin) // face over hair roots
  // sideburns / bushy eyebrows base
  circle(ctx, -40, hy + 12, 10, P.orange, P.ink, 2.5); circle(ctx, 40, hy + 12, 10, P.orange, P.ink, 2.5)
  // brows and eyes
  const angry = mood !== 'smug'
  for (const s of [-1, 1]) {
    ctx.beginPath(); ctx.moveTo(s * 8, hy - 16); ctx.lineTo(s * 24, hy - (angry ? 8 : 20)); ctx.lineWidth = 4; ctx.strokeStyle = P.ink; ctx.lineCap = 'round'; ctx.stroke()
    circle(ctx, s * 16, hy - 4, 8, P.white, P.ink, 2.5)
    circle(ctx, s * 16 + (mood === 'blown' ? 0 : s * 2), hy - 3, 3.5, P.ink, P.ink, 0)
  }
  // nose
  circle(ctx, 0, hy + 10, 11, P.red, P.ink, 2.5)
  // mouth / mustache
  ctx.strokeStyle = P.ink; ctx.lineWidth = 3
  if (mood === 'smug') { ctx.beginPath(); ctx.arc(0, hy + 18, 16, 0.3, Math.PI - 0.3); ctx.stroke() }
  else { ellipse(ctx, 0, hy + 26, 12, 8, P.redDark, P.ink, 2.5) }
  ctx.fillStyle = P.orange; ctx.beginPath(); ctx.moveTo(-6, hy + 16); ctx.quadraticCurveTo(-24, hy + 8, -30, hy + 24); ctx.quadraticCurveTo(-18, hy + 20, -6, hy + 22); ctx.closePath(); ctx.fill(); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(6, hy + 16); ctx.quadraticCurveTo(24, hy + 8, 30, hy + 24); ctx.quadraticCurveTo(18, hy + 20, 6, hy + 22); ctx.closePath(); ctx.fill(); ctx.stroke()
  // crown
  drawCrown(ctx, 0, hy - 48, 30)
  // steam when angry
  if (mood === 'angry') {
    ctx.save(); ctx.globalAlpha = 0.7
    for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const k = (t * 3 + i) % 1; circle(ctx, s * (50 + k * 30), hy - k * 20 - i * 6, 8 - k * 4, P.white, 'rgba(0,0,0,0)', 0) }
    ctx.restore()
  }
  ctx.restore()
}

export function drawCrown(ctx: Ctx, x: number, y: number, w: number): void {
  const h = w * 0.7
  ctx.beginPath(); ctx.moveTo(x - w, y); ctx.lineTo(x - w, y - h * 0.8); ctx.lineTo(x - w * 0.5, y - h * 0.35); ctx.lineTo(x, y - h * 1.05); ctx.lineTo(x + w * 0.5, y - h * 0.35); ctx.lineTo(x + w, y - h * 0.8); ctx.lineTo(x + w, y); ctx.closePath()
  fillStroke(ctx, P.gold, P.ink, 2.5)
  ctx.fillStyle = P.goldDark; ctx.fillRect(x - w + 2, y - 6, w * 2 - 4, 6)
  circle(ctx, x - w, y - h * 0.8, 4, P.red, P.ink, 1.5); circle(ctx, x, y - h * 1.05, 4.5, P.blue, P.ink, 1.5); circle(ctx, x + w, y - h * 0.8, 4, P.green, P.ink, 1.5)
  circle(ctx, x, y - 12, 4, P.red, P.ink, 1.5)
}

/** Small key icon (for the HUD and the found-key effect). */
export function drawKey(ctx: Ctx, x: number, y: number, s: number, gold: boolean): void {
  const c = gold ? P.gold : '#6f7ea0', cd = gold ? P.goldDark : '#4b5878'
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s)
  circle(ctx, 0, -10, 9, c, P.ink, 2)
  circle(ctx, 0, -10, 3.5, cd, P.ink, 1.5)
  rr(ctx, -3, -2, 6, 22, 2); fillStroke(ctx, c, P.ink, 2)
  ctx.fillStyle = c; ctx.strokeStyle = P.ink; ctx.lineWidth = 2
  rr(ctx, 3, 10, 6, 4, 1); ctx.fill(); ctx.stroke(); rr(ctx, 3, 16, 5, 4, 1); ctx.fill(); ctx.stroke()
  ctx.restore()
}

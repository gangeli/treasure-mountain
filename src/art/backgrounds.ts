import { P } from './palette'
import { type Ctx, vgrad, h1, poly, circle } from './draw'
import { W, PLAY_H, GROUND_Y, LOOP_W, wrapX } from '../game/layout'
import type { LevelNo } from '../game/world'

export interface Theme {
  skyTop: string; skyBottom: string; far: string; farDark: string; wall: string; wallDark: string; wallLight: string
  ground: string; groundDark: string; groundLight: string; vine: string; vineLight: string
}

export const THEMES: Record<LevelNo, Theme> = {
  1: { skyTop: '#5fb0ff', skyBottom: '#cfefff', far: '#6fa7c9', farDark: '#4f86a8', wall: '#8593ab', wallDark: '#66748f', wallLight: '#a7b3c7', ground: '#46b83f', groundDark: '#2f8f2c', groundLight: '#72d35f', vine: '#2f9b3a', vineLight: '#6fd35e' },
  2: { skyTop: '#f2a45c', skyBottom: '#ffe0b3', far: '#a67c9c', farDark: '#7c5a7e', wall: '#8b7aa6', wallDark: '#655683', wallLight: '#ab9cc4', ground: '#5bb54a', groundDark: '#3b8a33', groundLight: '#8ad86a', vine: '#3a8f4a', vineLight: '#7fcf6a' },
  3: { skyTop: '#9ed3ff', skyBottom: '#eef9ff', far: '#8ab6d8', farDark: '#6a95b9', wall: '#7a8aa6', wallDark: '#5a6a88', wallLight: '#b9c8da', ground: '#67c05e', groundDark: '#3f9042', groundLight: '#a8e69a', vine: '#4c9c4c', vineLight: '#9fdc8f' },
}

/** Draws the whole backdrop for a level at camera x (loop coordinates). */
export function drawBackdrop(ctx: Ctx, no: LevelNo, camX: number, t: number): void {
  const th = THEMES[no]
  // Sky
  ctx.fillStyle = vgrad(ctx, 0, GROUND_Y, th.skyTop, th.skyBottom)
  ctx.fillRect(0, 0, W, GROUND_Y)
  // Sun (level 1 & 3) or warm haze (level 2)
  const sunX = W - 200 - (camX * 0.05) % 300, sunY = 90
  if (no !== 2) { circle(ctx, sunX, sunY, 46, no === 3 ? '#fff4c2' : P.yellow, 'rgba(0,0,0,0)', 0); ctx.save(); ctx.globalAlpha = 0.35; circle(ctx, sunX, sunY, 66, no === 3 ? '#fff4c2' : P.yellow, 'rgba(0,0,0,0)', 0); ctx.restore() }
  else { ctx.save(); ctx.globalAlpha = 0.5; circle(ctx, sunX - 100, sunY + 30, 70, '#ffd28a', 'rgba(0,0,0,0)', 0); ctx.restore() }
  // Clouds (parallax 0.15)
  for (let i = 0; i < 6; i++) {
    const cx = ((i * 700 + 200 - camX * 0.15) % (LOOP_W * 0.15 + W + 400) + (LOOP_W * 0.15 + W + 400)) % (LOOP_W * 0.15 + W + 400) - 200
    const cy = 60 + h1(i + 3) * 120
    cloud(ctx, cx, cy, 60 + h1(i) * 40, no === 3 ? 0.95 : 0.85)
  }
  // Far mountains (parallax 0.3)
  drawFarHills(ctx, camX * 0.3, th, no)
  // Rock wall band with vines along its top edge
  drawWall(ctx, camX, th, no, t)
  // Ground
  drawGround(ctx, camX, th, no)
}

function cloud(ctx: Ctx, x: number, y: number, s: number, alpha: number): void {
  ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.arc(x, y, s * 0.5, 0, Math.PI * 2)
  ctx.arc(x + s * 0.55, y - s * 0.15, s * 0.6, 0, Math.PI * 2)
  ctx.arc(x + s * 1.2, y, s * 0.45, 0, Math.PI * 2)
  ctx.arc(x + s * 0.6, y + s * 0.2, s * 0.5, 0, Math.PI * 2)
  ctx.fill(); ctx.restore()
}

function drawFarHills(ctx: Ctx, px: number, th: Theme, no: LevelNo): void {
  const base = 250
  const period = 1900
  const off = ((px % period) + period) % period
  for (const layer of [0, 1]) {
    const pts: number[][] = [[-10, GROUND_Y + 5]]
    for (let x = -300; x <= W + 300; x += 20) {
      const wx = x + off + layer * 500
      let y = base + 40 * layer
      y -= 70 * Math.abs(Math.sin(wx / 330)) + 40 * Math.abs(Math.sin(wx / 133 + 1.7)) + 25 * Math.abs(Math.sin(wx / 61 + layer))
      if (no === 3) y -= 60
      pts.push([x, y])
    }
    pts.push([W + 10, GROUND_Y + 5])
    poly(ctx, pts, layer ? th.far : th.farDark, 'rgba(0,0,0,0)', 0)
    if (no === 3) {
      // snow caps: the same ridge line, but only where it rises above the snow line, filled down to it
      const snowLine = base + 40 * layer - 150
      ctx.save(); ctx.globalAlpha = 0.9; ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      let open = false
      for (let i = 1; i < pts.length - 1; i++) {
        const [x, y] = pts[i]
        if (y < snowLine) { if (!open) { ctx.moveTo(x, snowLine); open = true } ctx.lineTo(x, y) }
        else if (open) { ctx.lineTo(x, snowLine); ctx.closePath(); open = false }
      }
      if (open) ctx.closePath()
      ctx.fill(); ctx.restore()
    }
  }
}

function drawWall(ctx: Ctx, camX: number, th: Theme, no: LevelNo, t: number): void {
  const top = 150
  // Undulating top edge of the rock band
  const pts: number[][] = [[-10, GROUND_Y + 10]]
  for (let x = -40; x <= W + 40; x += 32) {
    const wx = wrapX(camX + x)
    const y = top + 26 * Math.sin(wx / 210) + 14 * Math.sin(wx / 73 + 2) + (no === 3 ? 30 : 0)
    pts.push([x, y])
  }
  pts.push([W + 10, GROUND_Y + 10])
  poly(ctx, pts, th.wall, 'rgba(0,0,0,0)', 0)
  // Light band near the top and darker base
  ctx.save(); ctx.globalAlpha = 0.35; ctx.fillStyle = th.wallLight
  ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y + 40) : ctx.moveTo(x, y)); ctx.lineTo(W + 10, top + 90); ctx.lineTo(-10, top + 90); ctx.closePath(); ctx.fill()
  ctx.globalAlpha = 0.25; ctx.fillStyle = th.wallDark; ctx.fillRect(-10, GROUND_Y - 70, W + 20, 80)
  ctx.restore()
  // Cracks and boulders embedded in the wall: deterministic per 160px bucket
  ctx.strokeStyle = th.wallDark; ctx.lineWidth = 3; ctx.lineCap = 'round'
  const b0 = Math.floor(camX / 160) - 1
  for (let b = b0; b <= b0 + W / 160 + 2; b++) {
    const wb = ((b % (LOOP_W / 160)) + LOOP_W / 160) % (LOOP_W / 160)
    const sx = b * 160 - camX + (camX < 0 ? 0 : 0)
    const x = ((sx % (LOOP_W)) + LOOP_W) % LOOP_W > W + 200 ? sx - LOOP_W : sx
    const r1 = h1(wb * 7 + 1), r2 = h1(wb * 7 + 2), r3 = h1(wb * 7 + 3)
    // crack
    const cx = x + r1 * 140, cy = top + 70 + r2 * 150
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + 12 - r3 * 30, cy + 30); ctx.lineTo(cx + 5, cy + 60 + r1 * 30); ctx.stroke()
    // embedded stones with a soft outline
    if (r3 > 0.45) {
      const ex = x + 80 + r2 * 60, ey = top + 120 + r3 * 180, rx = 16 + r1 * 12, ry = 10 + r2 * 6
      ctx.fillStyle = r2 > 0.5 ? th.wallLight : th.wallDark
      ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, r1, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = th.wallDark; ctx.lineWidth = 2; ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.ellipse(ex - rx * 0.3, ey - ry * 0.3, rx * 0.4, ry * 0.35, r1, 0, Math.PI * 2); ctx.fill()
    }
    if (no === 2 && r1 > 0.55) {
      // timber props in the mine wall
      ctx.fillStyle = P.woodDark; ctx.fillRect(x + 30 + r2 * 80, top + 40, 14, GROUND_Y - top - 40)
      ctx.fillStyle = P.wood; ctx.fillRect(x + 32 + r2 * 80, top + 40, 6, GROUND_Y - top - 40)
    }
    if (no === 3) {
      // snow lying on every ledge of the rock band's top edge
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      for (let k = 0; k <= 160; k += 16) {
        const wx = wrapX(camX + x + k)
        const yy = top + 26 * Math.sin(wx / 210) + 14 * Math.sin(wx / 73 + 2) + 30
        k === 0 ? ctx.moveTo(x + k, yy + 14) : ctx.lineTo(x + k, yy + 14)
      }
      for (let k = 160; k >= 0; k -= 16) {
        const wx = wrapX(camX + x + k)
        const yy = top + 26 * Math.sin(wx / 210) + 14 * Math.sin(wx / 73 + 2) + 30
        ctx.lineTo(x + k, yy + 2 - 3 * Math.sin(wx / 37))
      }
      ctx.closePath(); ctx.fill()
      if (r2 > 0.55) { ctx.beginPath(); ctx.ellipse(x + 40 + r1 * 90, top + 150 + r3 * 150, 26 + r3 * 14, 7, 0, 0, Math.PI * 2); ctx.fill() }
    }
  }
  // A leafy fringe along the top edge and hanging vines (level 1 & 2), swaying gently
  if (no !== 3) {
    for (let x = -40; x <= W + 40; x += 18) {
      const wx = wrapX(camX + x)
      const i = Math.floor(wx / 18)
      const r = h1(i * 3 + 11)
      const y = top + 26 * Math.sin(wx / 210) + 14 * Math.sin(wx / 73 + 2)
      leaf(ctx, x, y - 4, 10 + r * 5, (r - 0.5) * 1.2 + (i % 2 ? 0.2 : 2.9), i % 2 ? th.vineLight : th.vine)
    }
    for (let x = -40; x <= W + 40; x += 34) {
      const wx = wrapX(camX + x)
      const i = Math.floor(wx / 34)
      const r = h1(i * 7 + 5)
      if (r < 0.35) continue
      const y = top + 26 * Math.sin(wx / 210) + 14 * Math.sin(wx / 73 + 2)
      const len = 40 + r * 110
      const sway = Math.sin(t * 1.1 + i * 0.7) * 5
      const bend = (r - 0.5) * 40
      ctx.strokeStyle = th.vine; ctx.lineWidth = 3.5; ctx.lineCap = 'round'
      ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + bend, y + len * 0.4, x + bend + sway, y + len * 0.7, x + sway * 1.5, y + len); ctx.stroke()
      const n = 3 + Math.floor(r * 3)
      for (let k = 0; k < n; k++) {
        const f = (k + 0.7) / n
        const lx = x + bend * (f * (1 - f) * 4) * 0.5 + sway * f * 1.2, ly = y + len * f
        const side = k % 2 ? 1 : -1
        leaf(ctx, lx, ly, 8 + r * 5, side > 0 ? 0.5 + f * 0.6 : Math.PI - 0.5 - f * 0.6, k % 2 ? th.vineLight : th.vine)
      }
      // a tendril curl at the tip
      ctx.beginPath(); ctx.arc(x + sway * 1.5 + 6, y + len + 2, 6, Math.PI, Math.PI * 2.4); ctx.lineWidth = 2; ctx.stroke()
    }
  }
}

export function leaf(ctx: Ctx, x: number, y: number, s: number, rot: number, color: string): void {
  ctx.save(); ctx.translate(x, y); ctx.rotate(rot)
  ctx.fillStyle = color
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s, -s * 0.8, s * 1.8, 0); ctx.quadraticCurveTo(s, s * 0.8, 0, 0); ctx.closePath(); ctx.fill()
  ctx.strokeStyle = P.ink; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.restore()
}

function drawGround(ctx: Ctx, camX: number, th: Theme, no: LevelNo): void {
  // Grass band
  ctx.fillStyle = th.ground; ctx.fillRect(0, GROUND_Y, W, PLAY_H - GROUND_Y)
  ctx.fillStyle = th.groundLight; ctx.fillRect(0, GROUND_Y, W, 8)
  ctx.fillStyle = th.groundDark; ctx.fillRect(0, PLAY_H - 26, W, 26)
  ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(W, GROUND_Y); ctx.stroke()
  // Grass tufts along the bottom edge and a few on the field, deterministic per 36px bucket
  const b0 = Math.floor(camX / 36) - 1
  for (let b = b0; b <= b0 + W / 36 + 2; b++) {
    const wb = ((b % (LOOP_W / 36)) + LOOP_W / 36) % (LOOP_W / 36)
    const x = b * 36 - camX
    const r = h1(wb * 5 + 2)
    tuft(ctx, x + r * 20, PLAY_H - 22, 8 + r * 8, th.groundLight)
    if (r > 0.6) tuft(ctx, x + 10, GROUND_Y + 18 + r * 40, 5 + r * 5, r > 0.8 ? th.groundLight : th.groundDark)
    if (no === 3 && r > 0.35) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(x + 18, GROUND_Y + 20 + (r * 50) % 40, 34 + r * 30, 9, 0, 0, Math.PI * 2); ctx.fill() }
    if (no === 2 && r > 0.85) { ctx.fillStyle = th.groundDark; ctx.beginPath(); ctx.ellipse(x + 18, GROUND_Y + 30 + (r * 70) % 40, 16, 5, 0, 0, Math.PI * 2); ctx.fill() }
  }
}

function tuft(ctx: Ctx, x: number, y: number, s: number, color: string): void {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.moveTo(x - s, y); ctx.quadraticCurveTo(x - s * 0.6, y - s * 1.6, x - s * 0.3, y)
  ctx.quadraticCurveTo(x, y - s * 2.2, x + s * 0.3, y)
  ctx.quadraticCurveTo(x + s * 0.7, y - s * 1.5, x + s, y)
  ctx.closePath(); ctx.fill()
}

/** Blue frame around the play area, like the original. */
export function drawFrame(ctx: Ctx): void {
  ctx.strokeStyle = P.frame; ctx.lineWidth = 8; ctx.strokeRect(4, 4, W - 8, PLAY_H - 8)
  ctx.strokeStyle = P.frameLight; ctx.lineWidth = 2; ctx.strokeRect(9, 9, W - 18, PLAY_H - 18)
}

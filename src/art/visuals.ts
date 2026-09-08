import { P } from './palette'
import { type Ctx, circle, ellipse, poly, line, roundRect, text, measure, star, heart, fillStroke, rr } from './draw'
import type { Visual, CounterItem, ShapeName, CoinName } from '../content/types'

/**
 * Draws a riddle picture centred in the box (x, y, w, h), scaled to fit. Pure vector so it looks
 * crisp at any size. Returns nothing; callers decide layout.
 */
export function drawVisual(ctx: Ctx, v: Visual, x: number, y: number, w: number, h: number): void {
  ctx.save()
  switch (v.kind) {
    case 'counters': counters(ctx, v, x, y, w, h); break
    case 'clock': clock(ctx, v.hour, v.minute, x + w / 2, y + h / 2, Math.min(w, h) / 2 - 6); break
    case 'coins': coins(ctx, v.coins, x, y, w, h); break
    case 'fraction': fraction(ctx, v.shape, v.parts, v.shaded, x, y, w, h); break
    case 'shape': shape(ctx, v.name, x + w / 2, y + h / 2, Math.min(w, h) * 0.42, v.color ?? P.cyan); break
    case 'pattern': pattern(ctx, v.items, !!v.blank, x, y, w, h); break
    case 'tenframe': tenframe(ctx, v.count, x, y, w, h); break
    case 'grid': grid(ctx, v.w, v.h, v.unit, x, y, w, h); break
    case 'array': arrayViz(ctx, v.rows, v.cols, v.item, x, y, w, h); break
    case 'numberline': numberline(ctx, v.from, v.to, v.mark, v.step, x, y, w, h); break
    case 'angle': angle(ctx, v.degrees, x, y, w, h); break
    case 'letter': letterCard(ctx, v.text, x, y, w, h); break
    case 'text': {
      // Shrink to fit: "45 __ 54" at 64px ran off the right of its box.
      let ts = Math.min(h * 0.6, 64)
      while (ts > 16 && measure(ctx, v.text, ts, 900) > w - 16) ts -= 2
      text(ctx, v.text, x + w / 2, y + h / 2, { size: ts, align: 'center', color: P.ink, weight: 900 })
      break
    }
    case 'thermometer': thermometer(ctx, v.degrees, v.unit, x, y, w, h); break
    case 'scale': scale(ctx, v.left, v.right, v.heavier, x, y, w, h); break
    case 'bars': bars(ctx, v.values, v.labels, x, y, w, h); break
  }
  ctx.restore()
}

// ------------------------------------------------------------------ counters
export function drawItem(ctx: Ctx, item: CounterItem, x: number, y: number, r: number, crossed = false): void {
  switch (item) {
    case 'apple': circle(ctx, x, y + r * 0.1, r, P.red, P.ink, 2.5); line(ctx, x, y - r * 0.8, x + r * 0.15, y - r * 1.25, P.brownDark, 3); poly(ctx, [[x + r * 0.15, y - r * 1.05], [x + r * 0.7, y - r * 1.3], [x + r * 0.55, y - r * 0.85]], P.green, P.ink, 1.5); break
    case 'star': star(ctx, x, y, r, P.yellow, P.ink, 2.5); break
    case 'ball': circle(ctx, x, y, r, P.blue, P.ink, 2.5); ctx.beginPath(); ctx.arc(x, y, r * 0.98, 0.3, 1.4); ctx.strokeStyle = P.white; ctx.lineWidth = r * 0.3; ctx.stroke(); break
    case 'fish': ellipse(ctx, x, y, r, r * 0.6, P.orange, P.ink, 2.5); poly(ctx, [[x + r * 0.8, y], [x + r * 1.4, y - r * 0.5], [x + r * 1.4, y + r * 0.5]], P.orange, P.ink, 2.5); circle(ctx, x - r * 0.45, y - r * 0.12, r * 0.12, P.ink, P.ink, 0); break
    case 'flower': for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; circle(ctx, x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.42, P.pink, P.ink, 2) } circle(ctx, x, y, r * 0.35, P.yellow, P.ink, 2); break
    case 'coin': circle(ctx, x, y, r, P.gold, P.ink, 2.5); circle(ctx, x, y, r * 0.6, P.goldDark, 'rgba(0,0,0,0)', 0); break
    case 'block': roundRect(ctx, x - r, y - r, r * 2, r * 2, r * 0.2, P.cyan, P.ink, 2.5); break
    case 'heart': heart(ctx, x, y, r * 0.9, P.red, P.ink, 2.5); break
    case 'balloon': line(ctx, x, y + r * 0.9, x + r * 0.2, y + r * 1.8, P.ink, 1.5); ellipse(ctx, x, y, r * 0.8, r, P.purple, P.ink, 2.5); break
    case 'bug': ellipse(ctx, x, y, r, r * 0.8, P.red, P.ink, 2.5); circle(ctx, x - r * 0.8, y, r * 0.4, P.ink, P.ink, 0); line(ctx, x, y - r * 0.8, x, y + r * 0.8, P.ink, 2); circle(ctx, x - r * 0.35, y - r * 0.3, r * 0.15, P.ink, P.ink, 0); circle(ctx, x + r * 0.4, y + r * 0.25, r * 0.15, P.ink, P.ink, 0); break
    case 'cookie': circle(ctx, x, y, r, P.brownLight, P.ink, 2.5); for (let i = 0; i < 4; i++) circle(ctx, x + Math.cos(i * 1.7) * r * 0.5, y + Math.sin(i * 2.3) * r * 0.5, r * 0.14, P.brownDark, P.brownDark, 0); break
    case 'acorn': ellipse(ctx, x, y + r * 0.2, r * 0.7, r * 0.8, P.brownLight, P.ink, 2.5); ctx.beginPath(); ctx.arc(x, y - r * 0.2, r * 0.75, Math.PI, 0); ctx.closePath(); fillStroke(ctx, P.brown, P.ink, 2.5); line(ctx, x, y - r * 0.9, x, y - r * 1.2, P.ink, 3); break
  }
  if (crossed) { line(ctx, x - r * 1.1, y - r * 1.1, x + r * 1.1, y + r * 1.1, P.red, 4); line(ctx, x + r * 1.1, y - r * 1.1, x - r * 1.1, y + r * 1.1, P.red, 4) }
}

function counters(ctx: Ctx, v: Extract<Visual, { kind: 'counters' }>, x: number, y: number, w: number, h: number): void {
  const n = v.count
  // Group sizes: explicit array, or n split into equal groups, or one group.
  const gcount = typeof v.groups === 'number' ? v.groups : 0
  const sizes: number[] = Array.isArray(v.groups) ? v.groups.filter(g => g > 0) : gcount > 1 ? Array.from({ length: gcount }, (_, i) => Math.floor(n / gcount) + (i < n % gcount ? 1 : 0)) : [n]
  if (sizes.length > 1) {
    // Each group is a dashed box of up to 5 per row; boxes sit side by side with a "+" between.
    const rowsOf = (k: number) => Math.ceil(k / 5)
    const cols = sizes.map(k => Math.min(5, k))
    const rows = Math.max(...sizes.map(rowsOf))
    const gapUnits = 0.7
    const cell = Math.min(w / (cols.reduce((a, b) => a + b, 0) + (sizes.length - 1) * gapUnits + 0.4), h / (rows + 0.3), 110)
    const r = cell * 0.34
    const totalW = cols.reduce((a, b) => a + b, 0) * cell + (sizes.length - 1) * gapUnits * cell
    let gx = x + (w - totalW) / 2
    const y0 = y + (h - rows * cell) / 2 + cell / 2
    let drawn = 0
    sizes.forEach((k, gi) => {
      const gw = cols[gi] * cell
      rr(ctx, gx - 6, y0 - cell / 2 - 6, gw + 12, rowsOf(k) * cell + 12, 14); ctx.strokeStyle = P.inkSoft; ctx.lineWidth = 2; ctx.setLineDash([8, 6]); ctx.stroke(); ctx.setLineDash([])
      for (let i = 0; i < k; i++) {
        const crossed = v.crossed !== undefined && drawn >= n - v.crossed
        drawItem(ctx, v.item, gx + (i % 5) * cell + cell / 2, y0 + Math.floor(i / 5) * cell, r, crossed)
        drawn++
      }
      if (gi < sizes.length - 1) text(ctx, '+', gx + gw + gapUnits * cell / 2, y0 + (rows - 1) * cell / 2, { size: cell * 0.6, align: 'center', color: P.ink, weight: 900, outline: P.scroll, outlineWidth: 6 })
      gx += gw + gapUnits * cell
    })
    return
  }
  // Sibling pictures (the answer choices of "which group has the most?") lay out for the same
  // number, so every item is drawn at the same size and only the count differs.
  const layout = Math.max(n, v.scaleTo ?? 0)
  const perRow = layout <= 5 ? layout : layout <= 10 ? 5 : layout <= 12 ? 6 : 7
  const rows = Math.ceil(layout / perRow)
  const cell = Math.min(w / perRow, h / rows, layout <= 3 ? 130 : layout <= 6 ? 110 : 90)
  const r = cell * 0.34
  const x0 = x + (w - perRow * cell) / 2 + cell / 2, y0 = y + (h - rows * cell) / 2 + cell / 2
  for (let i = 0; i < n; i++) {
    const row = Math.floor(i / perRow), col = i % perRow
    const crossed = v.crossed !== undefined && i >= n - v.crossed
    drawItem(ctx, v.item, x0 + col * cell, y0 + row * cell, r, crossed)
  }
}

// ------------------------------------------------------------------ clock
export function clock(ctx: Ctx, hour: number, minute: number, cx: number, cy: number, r: number): void {
  circle(ctx, cx, cy, r, P.white, P.ink, Math.max(2.5, r * 0.035))
  circle(ctx, cx, cy, r * 0.93, 'rgba(0,0,0,0)', P.blueDark, Math.max(1.5, r * 0.018))
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2 - Math.PI / 2
    const big = i % 5 === 0
    line(ctx, cx + Math.cos(a) * r * 0.88, cy + Math.sin(a) * r * 0.88, cx + Math.cos(a) * r * (big ? 0.78 : 0.83), cy + Math.sin(a) * r * (big ? 0.78 : 0.83), P.ink, big ? Math.max(2, r * 0.025) : Math.max(1, r * 0.012))
  }
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2
    text(ctx, String(i), cx + Math.cos(a) * r * 0.64, cy + Math.sin(a) * r * 0.64, { size: r * 0.2, align: 'center', color: P.ink, weight: 800 })
  }
  const ma = (minute / 60) * Math.PI * 2 - Math.PI / 2
  const ha = ((hour % 12) / 12 + minute / 720) * Math.PI * 2 - Math.PI / 2
  // Both hands stop inside the ring of numerals (which sits at 0.64r): at 0.74r the minute hand
  // covered the very numeral it was pointing at, so 3:40 hid its own 8.
  line(ctx, cx, cy, cx + Math.cos(ha) * r * 0.36, cy + Math.sin(ha) * r * 0.36, P.ink, Math.max(4, r * 0.07))
  line(ctx, cx, cy, cx + Math.cos(ma) * r * 0.52, cy + Math.sin(ma) * r * 0.52, P.red, Math.max(3, r * 0.045))
  circle(ctx, cx, cy, Math.max(3, r * 0.05), P.ink, P.ink, 0)
}

// ------------------------------------------------------------------ coins
export function drawCoin(ctx: Ctx, name: CoinName, x: number, y: number, r: number): void {
  const copper = name === 'penny'
  circle(ctx, x, y, r, copper ? '#d9885a' : '#d6dbe3', P.ink, 2.5)
  circle(ctx, x, y, r * 0.86, 'rgba(0,0,0,0)', copper ? '#a95f33' : '#8d95a3', 2)
  const label = name === 'penny' ? '1¢' : name === 'nickel' ? '5¢' : name === 'dime' ? '10¢' : '25¢'
  text(ctx, label, x, y - r * 0.05, { size: r * 0.62, align: 'center', color: P.ink, weight: 900 })
  text(ctx, name.toUpperCase(), x, y + r * 0.5, { size: r * 0.26, align: 'center', color: P.inkSoft, weight: 800 })
}

function coins(ctx: Ctx, list: CoinName[], x: number, y: number, w: number, h: number): void {
  const n = list.length
  const perRow = n <= 4 ? n : Math.ceil(n / 2)
  const rows = Math.ceil(n / perRow)
  const cell = Math.min(w / perRow, h / rows, 120)
  const x0 = x + (w - perRow * cell) / 2 + cell / 2, y0 = y + (h - rows * cell) / 2 + cell / 2
  list.forEach((c, i) => { const rad = (c === 'quarter' ? 0.44 : c === 'nickel' ? 0.38 : c === 'penny' ? 0.35 : 0.3) * cell; drawCoin(ctx, c, x0 + (i % perRow) * cell, y0 + Math.floor(i / perRow) * cell, rad) })
}

// ------------------------------------------------------------------ fractions and shapes
function fraction(ctx: Ctx, shp: 'circle' | 'bar', parts: number, shaded: number, x: number, y: number, w: number, h: number): void {
  if (shp === 'circle') {
    const r = Math.min(w, h) / 2 - 8, cx = x + w / 2, cy = y + h / 2
    for (let i = 0; i < parts; i++) {
      const a0 = -Math.PI / 2 + (i / parts) * Math.PI * 2, a1 = -Math.PI / 2 + ((i + 1) / parts) * Math.PI * 2
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, a0, a1); ctx.closePath(); fillStroke(ctx, i < shaded ? P.cyan : P.white, P.ink, 3)
    }
  } else {
    const bw = w - 16, bh = Math.min(h - 16, 90), bx = x + 8, by = y + (h - bh) / 2
    for (let i = 0; i < parts; i++) { ctx.beginPath(); ctx.rect(bx + (i * bw) / parts, by, bw / parts, bh); fillStroke(ctx, i < shaded ? P.cyan : P.white, P.ink, 3) }
  }
}

export function shape(ctx: Ctx, name: ShapeName, cx: number, cy: number, r: number, color: string): void {
  const reg = (n: number, rot = -Math.PI / 2) => { const pts: number[][] = []; for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]) } poly(ctx, pts, color, P.ink, 3) }
  switch (name) {
    case 'circle': circle(ctx, cx, cy, r, color, P.ink, 3); break
    case 'square': poly(ctx, [[cx - r * 0.85, cy - r * 0.85], [cx + r * 0.85, cy - r * 0.85], [cx + r * 0.85, cy + r * 0.85], [cx - r * 0.85, cy + r * 0.85]], color, P.ink, 3); break
    case 'rectangle': poly(ctx, [[cx - r * 1.1, cy - r * 0.6], [cx + r * 1.1, cy - r * 0.6], [cx + r * 1.1, cy + r * 0.6], [cx - r * 1.1, cy + r * 0.6]], color, P.ink, 3); break
    case 'triangle': reg(3); break
    case 'pentagon': reg(5); break
    case 'hexagon': reg(6, 0); break
    case 'octagon': reg(8, Math.PI / 8); break
    case 'oval': ellipse(ctx, cx, cy, r * 1.15, r * 0.7, color, P.ink, 3); break
    case 'star': star(ctx, cx, cy, r, color, P.ink, 3); break
    case 'heart': heart(ctx, cx, cy, r * 0.9, color, P.ink, 3); break
    case 'rhombus': poly(ctx, [[cx, cy - r], [cx + r * 0.7, cy], [cx, cy + r], [cx - r * 0.7, cy]], color, P.ink, 3); break
    case 'trapezoid': poly(ctx, [[cx - r * 0.6, cy - r * 0.6], [cx + r * 0.6, cy - r * 0.6], [cx + r * 1.1, cy + r * 0.6], [cx - r * 1.1, cy + r * 0.6]], color, P.ink, 3); break
    case 'cube': { const d = r * 0.4; poly(ctx, [[cx - r * 0.7, cy - r * 0.3], [cx + r * 0.3, cy - r * 0.3], [cx + r * 0.3, cy + r * 0.7], [cx - r * 0.7, cy + r * 0.7]], color, P.ink, 3); poly(ctx, [[cx - r * 0.7, cy - r * 0.3], [cx - r * 0.7 + d, cy - r * 0.3 - d], [cx + r * 0.3 + d, cy - r * 0.3 - d], [cx + r * 0.3, cy - r * 0.3]], P.cyanPale, P.ink, 3); poly(ctx, [[cx + r * 0.3, cy - r * 0.3], [cx + r * 0.3 + d, cy - r * 0.3 - d], [cx + r * 0.3 + d, cy + r * 0.7 - d], [cx + r * 0.3, cy + r * 0.7]], P.cyanDark, P.ink, 3); break }
    case 'sphere': circle(ctx, cx, cy, r, color, P.ink, 3); ctx.save(); ctx.globalAlpha = 0.5; circle(ctx, cx - r * 0.3, cy - r * 0.3, r * 0.25, P.white, 'rgba(0,0,0,0)', 0); ctx.restore(); ellipse(ctx, cx, cy + r * 0.4, r * 0.7, r * 0.2, 'rgba(0,0,0,0)', P.inkSoft, 1.5); break
    case 'cone': poly(ctx, [[cx, cy - r], [cx + r * 0.8, cy + r * 0.6], [cx - r * 0.8, cy + r * 0.6]], color, P.ink, 3); ellipse(ctx, cx, cy + r * 0.6, r * 0.8, r * 0.25, P.cyanDark, P.ink, 3); break
    case 'cylinder': ctx.beginPath(); ctx.rect(cx - r * 0.7, cy - r * 0.7, r * 1.4, r * 1.4); fillStroke(ctx, color, P.ink, 3); ellipse(ctx, cx, cy + r * 0.7, r * 0.7, r * 0.22, color, P.ink, 3); ellipse(ctx, cx, cy - r * 0.7, r * 0.7, r * 0.22, P.cyanPale, P.ink, 3); break
    case 'pyramid': poly(ctx, [[cx, cy - r], [cx + r * 0.9, cy + r * 0.6], [cx - r * 0.9, cy + r * 0.6]], color, P.ink, 3); poly(ctx, [[cx, cy - r], [cx + r * 0.9, cy + r * 0.6], [cx + r * 0.2, cy + r * 0.85]], P.cyanDark, P.ink, 3); break
  }
}

function pattern(ctx: Ctx, items: { shape: ShapeName; color: string }[], blank: boolean, x: number, y: number, w: number, h: number): void {
  const n = items.length + (blank ? 1 : 0)
  const cell = Math.min(w / n, h, 96)
  const x0 = x + (w - n * cell) / 2 + cell / 2, cy = y + h / 2
  // Big enough to compare with the same shape on an answer card: at 0.36 the pattern read as a
  // miniature of the choices rather than the same object.
  items.forEach((it, i) => shape(ctx, it.shape, x0 + i * cell, cy, cell * 0.42, it.color))
  if (blank) { rr(ctx, x0 + items.length * cell - cell * 0.4, cy - cell * 0.4, cell * 0.8, cell * 0.8, 10); ctx.setLineDash([8, 6]); ctx.lineWidth = 3; ctx.strokeStyle = P.inkSoft; ctx.stroke(); ctx.setLineDash([]); text(ctx, '?', x0 + items.length * cell, cy, { size: cell * 0.5, align: 'center', color: P.inkSoft, weight: 900 }) }
}

function tenframe(ctx: Ctx, count: number, x: number, y: number, w: number, h: number): void {
  const frames = count > 10 ? 2 : 1
  const cell = Math.min((w - (frames - 1) * 30) / (frames * 5), h / 2, 64)
  const fw = cell * 5, x0 = x + (w - (frames * fw + (frames - 1) * 30)) / 2, y0 = y + (h - cell * 2) / 2
  for (let f = 0; f < frames; f++) {
    for (let i = 0; i < 10; i++) {
      const cx = x0 + f * (fw + 30) + (i % 5) * cell, cy = y0 + Math.floor(i / 5) * cell
      ctx.beginPath(); ctx.rect(cx, cy, cell, cell); fillStroke(ctx, P.white, P.ink, 3)
      if (f * 10 + i < count) circle(ctx, cx + cell / 2, cy + cell / 2, cell * 0.32, P.blue, P.ink, 2.5)
    }
  }
}

function grid(ctx: Ctx, gw: number, gh: number, unit: string | undefined, x: number, y: number, w: number, h: number): void {
  const cell = Math.min((w - 60) / gw, (h - 50) / gh, 44)
  const x0 = x + (w - gw * cell) / 2, y0 = y + (h - gh * cell) / 2 - 8
  for (let r = 0; r < gh; r++) for (let c = 0; c < gw; c++) { ctx.beginPath(); ctx.rect(x0 + c * cell, y0 + r * cell, cell, cell); fillStroke(ctx, P.cyanPale, P.ink, 2) }
  text(ctx, `${gw} ${unit ?? ''}`.trim(), x0 + (gw * cell) / 2, y0 + gh * cell + 20, { size: 20, align: 'center', color: P.ink, weight: 800 })
  ctx.save(); ctx.translate(x0 - 18, y0 + (gh * cell) / 2); ctx.rotate(-Math.PI / 2); text(ctx, `${gh} ${unit ?? ''}`.trim(), 0, 0, { size: 20, align: 'center', color: P.ink, weight: 800 }); ctx.restore()
}

function arrayViz(ctx: Ctx, rows: number, cols: number, item: CounterItem, x: number, y: number, w: number, h: number): void {
  const cell = Math.min(w / cols, h / rows, 56)
  const x0 = x + (w - cols * cell) / 2 + cell / 2, y0 = y + (h - rows * cell) / 2 + cell / 2
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) drawItem(ctx, item, x0 + c * cell, y0 + r * cell, cell * 0.32)
}

function numberline(ctx: Ctx, from: number, to: number, mark: number | undefined, stepN: number | undefined, x: number, y: number, w: number, h: number): void {
  const st = stepN ?? 1
  const n = Math.round((to - from) / st)
  const x0 = x + 30, x1 = x + w - 30, cy = y + h / 2
  line(ctx, x0 - 10, cy, x1 + 10, cy, P.ink, 4)
  poly(ctx, [[x1 + 10, cy - 7], [x1 + 22, cy], [x1 + 10, cy + 7]], P.ink, P.ink, 1)
  poly(ctx, [[x0 - 10, cy - 7], [x0 - 22, cy], [x0 - 10, cy + 7]], P.ink, P.ink, 1)
  // Label size follows the tick spacing, and when the ticks are tight only every other one is
  // labelled: at 20px on a 0-10 line the numbers ran into each other ("9" and "10" touched).
  const gap = (x1 - x0) / n
  const size = Math.max(11, Math.min(20, gap * 0.85))
  const every = gap < 24 ? 2 : 1
  for (let i = 0; i <= n; i++) {
    const px = x0 + (i / n) * (x1 - x0)
    line(ctx, px, cy - 12, px, cy + 12, P.ink, 3)
    if (i % every !== 0 && i !== n) continue
    const v = from + i * st
    text(ctx, Number.isInteger(v) ? String(v) : v.toFixed(2).replace(/0+$/, '').replace(/\.$/, ''), px, cy + 26 + size / 2, { size, align: 'center', color: P.ink, weight: 800 })
  }
  if (mark !== undefined) {
    const px = x0 + ((mark - from) / (to - from)) * (x1 - x0)
    const mw = Math.max(7, Math.min(12, gap * 0.55))
    poly(ctx, [[px, cy - 16], [px - mw, cy - 40], [px + mw, cy - 40]], P.red, P.ink, 2.5)
  }
}

function angle(ctx: Ctx, deg: number, x: number, y: number, w: number, h: number): void {
  const cx = x + w * 0.35, cy = y + h * 0.75, len = Math.min(w * 0.55, h * 0.7)
  const a = -deg * Math.PI / 180
  line(ctx, cx, cy, cx + len, cy, P.ink, 5)
  line(ctx, cx, cy, cx + Math.cos(a) * len, cy + Math.sin(a) * len, P.ink, 5)
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, len * 0.35, a, 0); ctx.closePath(); ctx.fillStyle = 'rgba(57,214,232,0.5)'; ctx.fill(); ctx.strokeStyle = P.cyanDark; ctx.lineWidth = 3; ctx.stroke()
  if (Math.abs(deg - 90) < 0.5) { ctx.strokeStyle = P.ink; ctx.lineWidth = 3; ctx.strokeRect(cx, cy - 22, 22, 22) }
}

function letterCard(ctx: Ctx, t: string, x: number, y: number, w: number, h: number): void {
  const s = Math.min(w, h) - 12
  roundRect(ctx, x + (w - s) / 2, y + (h - s) / 2, s, s, 14, P.cream, P.ink, 3)
  text(ctx, t, x + w / 2, y + h / 2 + s * 0.04, { size: s * 0.62, align: 'center', color: P.blueDark, weight: 900 })
}

function thermometer(ctx: Ctx, deg: number, unit: 'F' | 'C', x: number, y: number, w: number, h: number): void {
  // Tube, bulb, graduations and labels all scale with the box. At the old fixed 26px width and 30px
  // inset the thermometer was a spindle on the big riddle card, and on a small card the scale used
  // barely half the tube's height - so the mercury sat far below where the number said it should.
  const lo = unit === 'F' ? 0 : -10, hi = unit === 'F' ? 100 : 40
  const tw = Math.max(16, Math.min(44, h * 0.14))
  const br = tw * 0.78
  const top = y + Math.max(20, h * 0.1), bulbY = y + h - br - 4, bottom = bulbY - 4
  const span = bottom - top, pad = Math.max(5, Math.min(14, span * 0.08))
  const ls = Math.max(11, Math.min(22, span * 0.12))
  const tickLong = tw * 0.62, tickShort = tw * 0.34
  // Centre the tube *and* its label column in the box, or the whole picture sits off to the left.
  const cx = x + (w - (tw + tickLong + 6 + measure(ctx, String(hi), ls, 800))) / 2 + tw / 2
  roundRect(ctx, cx - tw / 2, top, tw, span, tw / 2, P.white, P.ink, 3)
  const f = Math.max(0, Math.min(1, (deg - lo) / (hi - lo)))
  const level = bottom - pad - f * (span - pad * 2)
  const mw = Math.max(6, tw - 12)
  ctx.fillStyle = P.red; ctx.fillRect(cx - mw / 2, level, mw, bottom - level)
  circle(ctx, cx, bulbY, br, P.red, P.ink, 3)
  // The column is redrawn into the bulb: the bulb's own outline otherwise cut a navy line across
  // the mercury and left the column looking detached from the bulb.
  ctx.fillStyle = P.red; ctx.fillRect(cx - mw / 2, level, mw, bulbY - level)
  const stepT = unit === 'F' ? 10 : 5
  const labelEvery = span > 150 ? stepT * 2 : stepT * 4
  for (let v = lo; v <= hi; v += stepT) {
    const py = bottom - pad - ((v - lo) / (hi - lo)) * (span - pad * 2), lab = (v - lo) % labelEvery === 0
    line(ctx, cx + tw / 2, py, cx + tw / 2 + (lab ? tickLong : tickShort), py, P.ink, 2)
    if (lab) text(ctx, String(v), cx + tw / 2 + tickLong + 6, py, { size: ls, color: P.ink, weight: 800 })
  }
  text(ctx, '°' + unit, cx, top - 6, { size: Math.max(14, Math.min(26, span * 0.13)), align: 'center', color: P.ink, weight: 800 })
}

function scale(ctx: Ctx, left: string, right: string, heavier: 'left' | 'right' | 'none', x: number, y: number, w: number, h: number): void {
  // The heavier pan goes DOWN. A positive canvas rotation lifts the left end, so 'left' has to be
  // the negative tilt: the picture used to show the heavy side rising.
  const cx = x + w / 2, base = y + h - 16, tilt = heavier === 'left' ? -0.18 : heavier === 'right' ? 0.18 : 0
  poly(ctx, [[cx - 40, base], [cx + 40, base], [cx + 8, base - 30], [cx - 8, base - 30]], P.rockDark, P.ink, 3)
  line(ctx, cx, base - 30, cx, base - 90, P.ink, 8)
  ctx.save(); ctx.translate(cx, base - 90); ctx.rotate(tilt)
  line(ctx, -w * 0.38, 0, w * 0.38, 0, P.ink, 8); line(ctx, -w * 0.38, 0, w * 0.38, 0, P.gold, 4)
  for (const s of [-1, 1]) { const px = s * w * 0.36; line(ctx, px, 0, px - 22, 40, P.ink, 2); line(ctx, px, 0, px + 22, 40, P.ink, 2); ctx.beginPath(); ctx.moveTo(px - 30, 40); ctx.quadraticCurveTo(px, 70, px + 30, 40); ctx.closePath(); fillStroke(ctx, P.gold, P.ink, 3) }
  ctx.restore()
  // Labels are drawn upright under each pan, not inside the tilted beam, where a long word ran off
  // the pan at an angle and read as decoration rather than as the object being weighed.
  for (const s of [-1, 1]) {
    const px = cx + s * w * 0.36 * Math.cos(tilt), py = base - 90 + s * w * 0.36 * Math.sin(tilt)
    const label = s < 0 ? left : right
    let size = 18
    while (size > 10 && measure(ctx, label, size, 800) > w * 0.34) size -= 1
    // Kept inside the picture box: on a tilted beam the low pan pushed its label off the edge.
    const half = measure(ctx, label, size, 800) / 2 + 4
    const lx = Math.max(x + half, Math.min(x + w - half, px))
    text(ctx, label, lx, Math.min(py + 72, base - 4), { size, align: 'center', color: P.ink, weight: 800 })
  }
}

function bars(ctx: Ctx, values: number[], labels: string[], x: number, y: number, w: number, h: number): void {
  const n = values.length, max = Math.max(...values, 1)
  const gap = 12, bw = Math.min(70, (w - 60 - gap * (n + 1)) / n)
  const x0 = x + 50, base = y + h - 34, top = y + 14
  line(ctx, x0 - 10, base, x + w - 10, base, P.ink, 3); line(ctx, x0 - 10, base, x0 - 10, top, P.ink, 3)
  values.forEach((v, i) => {
    const bx = x0 + gap + i * (bw + gap), bh = (v / max) * (base - top - 10)
    ctx.beginPath(); ctx.rect(bx, base - bh, bw, bh); fillStroke(ctx, [P.blue, P.green, P.orange, P.purple, P.red, P.cyan][i % 6], P.ink, 2.5)
    text(ctx, String(v), bx + bw / 2, base - bh - 12, { size: 16, align: 'center', color: P.ink, weight: 800 })
    text(ctx, labels[i] ?? '', bx + bw / 2, base + 16, { size: 15, align: 'center', color: P.ink, weight: 800 })
  })
}

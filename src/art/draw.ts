import { P } from './palette'

export type Ctx = CanvasRenderingContext2D

/** Filled + outlined path helper. Call between beginPath/closePath. */
export function fillStroke(ctx: Ctx, fill: string | CanvasGradient, stroke: string = P.ink, width = 3): void {
  ctx.fillStyle = fill
  ctx.fill()
  if (width > 0) { ctx.lineWidth = width; ctx.strokeStyle = stroke; ctx.lineJoin = 'round'; ctx.stroke() }
}

export function rr(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const rad = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + rad, y)
  ctx.arcTo(x + w, y, x + w, y + h, rad)
  ctx.arcTo(x + w, y + h, x, y + h, rad)
  ctx.arcTo(x, y + h, x, y, rad)
  ctx.arcTo(x, y, x + w, y, rad)
  ctx.closePath()
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string | CanvasGradient, stroke: string = P.ink, width = 3): void {
  rr(ctx, x, y, w, h, r)
  fillStroke(ctx, fill, stroke, width)
}

export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient, stroke: string = P.ink, width = 3): void {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.closePath(); fillStroke(ctx, fill, stroke, width)
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string | CanvasGradient, stroke: string = P.ink, width = 3, rot = 0): void {
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); ctx.closePath(); fillStroke(ctx, fill, stroke, width)
}

export function poly(ctx: Ctx, pts: number[][], fill: string | CanvasGradient, stroke: string = P.ink, width = 3): void {
  ctx.beginPath()
  pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
  ctx.closePath()
  fillStroke(ctx, fill, stroke, width)
}

export function line(ctx: Ctx, x1: number, y1: number, x2: number, y2: number, color: string = P.ink, width = 3): void {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.stroke()
}

export function vgrad(ctx: Ctx, y0: number, y1: number, c0: string, c1: string): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1); g.addColorStop(0, c0); g.addColorStop(1, c1); return g
}

export const FONT = '"Nunito", "Fredoka", "Trebuchet MS", "Segoe UI", Verdana, system-ui, sans-serif'
export const FONT_DISPLAY = '"Fredoka", "Nunito", "Trebuchet MS", "Segoe UI", system-ui, sans-serif'

export interface TextOpts { size?: number; color?: string; align?: CanvasTextAlign; weight?: number | string; outline?: string; outlineWidth?: number; font?: string; baseline?: CanvasTextBaseline; spacing?: number }

export function text(ctx: Ctx, s: string, x: number, y: number, o: TextOpts = {}): void {
  ctx.font = `${o.weight ?? 700} ${o.size ?? 24}px ${o.font ?? FONT}`
  ctx.textAlign = o.align ?? 'left'
  ctx.textBaseline = o.baseline ?? 'middle'
  if ((ctx as any).letterSpacing !== undefined) (ctx as any).letterSpacing = (o.spacing ?? 0) + 'px'
  if (o.outline) { ctx.lineWidth = o.outlineWidth ?? Math.max(3, (o.size ?? 24) / 6); ctx.strokeStyle = o.outline; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y) }
  ctx.fillStyle = o.color ?? P.ink
  ctx.fillText(s, x, y)
  if ((ctx as any).letterSpacing !== undefined) (ctx as any).letterSpacing = '0px'
}

export function measure(ctx: Ctx, s: string, size: number, weight: number | string = 700, font = FONT): number {
  ctx.font = `${weight} ${size}px ${font}`
  return ctx.measureText(s).width
}

/** Word-wraps a string into lines that fit maxWidth at the given font size. */
export function wrap(ctx: Ctx, s: string, maxWidth: number, size: number, weight: number | string = 700): string[] {
  const words = s.split(' ')
  const lines: string[] = []
  let cur = ''
  for (const w of words) {
    const t = cur ? cur + ' ' + w : w
    if (measure(ctx, t, size, weight) > maxWidth && cur) { lines.push(cur); cur = w } else cur = t
  }
  if (cur) lines.push(cur)
  return lines
}

/**
 * Draws text where listed substrings are painted in `hiColor` (rhyme endings, clue words, the words
 * a riddle is asking about). A highlight may be a phrase ("do not"), and it still matches when the
 * word carries punctuation or sits inside quotes ("let's") or is capitalised at the start of a
 * sentence - all three are how riddle prompts actually write them.
 */
export function richText(ctx: Ctx, s: string, x: number, y: number, size: number, color: string, hi: string[], hiColor: string, align: CanvasTextAlign = 'left'): void {
  ctx.font = `700 ${size}px ${FONT}`
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  const total = ctx.measureText(s).width
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x
  const put = (t: string, c: string) => { if (!t) return; ctx.fillStyle = c; ctx.fillText(t, cx, y); cx += ctx.measureText(t).width }
  // Split off leading/trailing punctuation so `"let's"` still matches the highlight `let's`.
  const SPLIT = /^([^\p{L}\p{N}]*)(.*?)([^\p{L}\p{N}]*)$/u
  const parts = s.split(/(\s+)/).map(t => {
    if (/^\s+$/.test(t) || t === '') return { space: true, raw: t, lead: '', core: '', trail: '' }
    const m = SPLIT.exec(t)!
    return { space: false, raw: t, lead: m[1], core: m[2], trail: m[3] }
  })
  const phrases = hi.filter(Boolean).map(h => h.toLowerCase().split(/\s+/))
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.space) { put(p.raw, color); continue }
    // Does a highlight phrase start here? Compare word by word, skipping the spaces between.
    let span = 0
    for (const ph of phrases) {
      const idx: number[] = []
      for (let j = i; j < parts.length && idx.length < ph.length; j++) if (!parts[j].space) idx.push(j)
      if (idx.length < ph.length) continue
      if (ph.every((w, k) => parts[idx[k]].core.toLowerCase() === w)) { span = Math.max(span, idx[ph.length - 1] - i + 1); }
    }
    if (span > 0) {
      for (let j = i; j < i + span; j++) {
        const q = parts[j]
        if (q.space) { put(q.raw, color); continue }
        put(q.lead, color); put(q.core, hiColor); put(q.trail, color)
      }
      i += span - 1
      continue
    }
    // A shorter highlight inside the word is a word ending: "cat" with the rhyme "at" in red.
    const ending = hi.find(h => h && !h.includes(' ') && h.length < p.core.length && p.core.toLowerCase().endsWith(h.toLowerCase()))
    put(p.lead, color)
    if (ending) { put(p.core.slice(0, p.core.length - ending.length), color); put(p.core.slice(p.core.length - ending.length), hiColor) }
    else put(p.core, color)
    put(p.trail, color)
  }
}

export function shadowBlob(ctx: Ctx, x: number, y: number, rx: number, ry = rx * 0.35): void {
  ctx.save(); ctx.globalAlpha = 0.22; ctx.fillStyle = P.ink
  ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore()
}

/** Tiny deterministic hash for scattering details without an RNG. */
export const h1 = (n: number): number => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s) }

export function star(ctx: Ctx, x: number, y: number, r: number, fill: string, stroke: string = P.ink, width = 2, points = 5): void {
  ctx.beginPath()
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points
    const rad = i % 2 === 0 ? r : r * 0.45
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)
  }
  ctx.closePath(); fillStroke(ctx, fill, stroke, width)
}

export function heart(ctx: Ctx, x: number, y: number, s: number, fill: string, stroke: string = P.ink, width = 2): void {
  ctx.beginPath()
  ctx.moveTo(x, y + s * 0.9)
  ctx.bezierCurveTo(x - s * 1.6, y - s * 0.2, x - s * 0.6, y - s * 1.2, x, y - s * 0.4)
  ctx.bezierCurveTo(x + s * 0.6, y - s * 1.2, x + s * 1.6, y - s * 0.2, x, y + s * 0.9)
  ctx.closePath(); fillStroke(ctx, fill, stroke, width)
}

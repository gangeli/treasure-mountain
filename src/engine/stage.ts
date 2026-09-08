/**
 * The Stage owns the single <canvas>, keeps a fixed logical resolution (1280x720, 16:9),
 * letterboxes it into the window, and renders crisply at the device pixel ratio.
 */
export const LOGICAL_W = 1280
export const LOGICAL_H = 720

export interface StageMetrics {
  scale: number
  offsetX: number
  offsetY: number
  cssW: number
  cssH: number
}

export class Stage {
  readonly canvas: HTMLCanvasElement
  readonly ctx: CanvasRenderingContext2D
  metrics: StageMetrics = { scale: 1, offsetX: 0, offsetY: 0, cssW: LOGICAL_W, cssH: LOGICAL_H }
  private dpr = 1

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) throw new Error('2d context unavailable')
    this.ctx = ctx
    this.resize()
    window.addEventListener('resize', () => this.resize())
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => this.resize())
  }

  resize(): void {
    const vw = Math.max(1, Math.floor(window.innerWidth))
    const vh = Math.max(1, Math.floor(window.innerHeight))
    const scale = Math.min(vw / LOGICAL_W, vh / LOGICAL_H)
    const cssW = Math.round(LOGICAL_W * scale)
    const cssH = Math.round(LOGICAL_H * scale)
    const offsetX = Math.floor((vw - cssW) / 2)
    const offsetY = Math.floor((vh - cssH) / 2)
    this.dpr = Math.min(3, window.devicePixelRatio || 1)
    this.canvas.style.width = cssW + 'px'
    this.canvas.style.height = cssH + 'px'
    this.canvas.style.left = offsetX + 'px'
    this.canvas.style.top = offsetY + 'px'
    this.canvas.width = Math.round(cssW * this.dpr)
    this.canvas.height = Math.round(cssH * this.dpr)
    this.metrics = { scale, offsetX, offsetY, cssW, cssH }
  }

  /** Sets up the context transform so that drawing code works in logical units. */
  begin(): CanvasRenderingContext2D {
    const { ctx } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    const s = (this.canvas.width / LOGICAL_W)
    ctx.setTransform(s, 0, 0, s, 0, 0)
    return ctx
  }

  /** Converts a client (CSS pixel) coordinate into logical units. */
  toLogical(clientX: number, clientY: number): { x: number; y: number } {
    const m = this.metrics
    return { x: (clientX - m.offsetX) / m.scale, y: (clientY - m.offsetY) / m.scale }
  }
}

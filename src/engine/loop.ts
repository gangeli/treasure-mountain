/** Fixed-step game loop: update() runs at exactly STEP seconds, render() once per animation frame. */
export const STEP = 1 / 60

export class Loop {
  private raf = 0
  private last = 0
  private acc = 0
  running = false
  constructor(private update: (dt: number) => void, private render: (alpha: number) => void) {}

  start(): void {
    if (this.running) return
    this.running = true
    this.last = performance.now()
    const tick = (now: number) => {
      if (!this.running) return
      let frame = (now - this.last) / 1000
      this.last = now
      if (frame > 0.25) frame = 0.25 // tab was hidden: don't spiral
      this.acc += frame
      let steps = 0
      while (this.acc >= STEP && steps < 8) {
        this.update(STEP)
        this.acc -= STEP
        steps++
      }
      if (steps === 8) this.acc = 0
      this.render(this.acc / STEP)
      this.raf = requestAnimationFrame(tick)
    }
    this.raf = requestAnimationFrame(tick)
  }

  stop(): void {
    this.running = false
    cancelAnimationFrame(this.raf)
  }
}

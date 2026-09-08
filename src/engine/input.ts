import type { Stage } from './stage'

export type PointerKind = 'down' | 'move' | 'up' | 'cancel'
export interface PointerEv { kind: PointerKind; x: number; y: number; id: number }
export interface KeyEv { kind: 'down' | 'up'; key: string; repeat: boolean }

/**
 * Normalises mouse/touch/pen and keyboard input into logical-coordinate events that the game
 * consumes once per update step. Held keys are tracked so movement can be polled.
 */
export class Input {
  readonly pointer: PointerEv[] = []
  readonly keys: KeyEv[] = []
  readonly held = new Set<string>()
  /** Current pointer position in logical coords (last seen), and whether a pointer is down. */
  px = -1
  py = -1
  down = false
  /** Set whenever any user gesture happens; used to unlock audio. */
  onGesture: (() => void) | null = null

  constructor(stage: Stage) {
    const c = stage.canvas
    c.style.touchAction = 'none'
    const toEv = (e: PointerEvent, kind: PointerKind): PointerEv => {
      const p = stage.toLogical(e.clientX, e.clientY)
      return { kind, x: p.x, y: p.y, id: e.pointerId }
    }
    c.addEventListener('pointerdown', e => {
      e.preventDefault()
      c.setPointerCapture(e.pointerId)
      const ev = toEv(e, 'down')
      this.px = ev.x; this.py = ev.y; this.down = true
      this.pointer.push(ev)
      this.onGesture?.()
    })
    c.addEventListener('pointermove', e => {
      const ev = toEv(e, 'move')
      this.px = ev.x; this.py = ev.y
      this.pointer.push(ev)
    })
    const up = (kind: PointerKind) => (e: PointerEvent) => {
      const ev = toEv(e, kind)
      this.px = ev.x; this.py = ev.y; this.down = false
      this.pointer.push(ev)
    }
    c.addEventListener('pointerup', up('up'))
    c.addEventListener('pointercancel', up('cancel'))
    c.addEventListener('contextmenu', e => e.preventDefault())
    window.addEventListener('keydown', e => {
      if (e.target instanceof HTMLInputElement) return
      const key = normKey(e)
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' ', 'Enter', 'Backspace', 'Tab'].includes(e.key)) e.preventDefault()
      if (!e.repeat) this.held.add(key)
      this.keys.push({ kind: 'down', key, repeat: e.repeat })
      this.onGesture?.()
    })
    window.addEventListener('keyup', e => {
      const key = normKey(e)
      this.held.delete(key)
      this.keys.push({ kind: 'up', key, repeat: false })
    })
    window.addEventListener('blur', () => this.held.clear())
  }

  /** Drains queued events. Call once per update step. */
  drain(): { pointer: PointerEv[]; keys: KeyEv[] } {
    const pointer = this.pointer.splice(0)
    const keys = this.keys.splice(0)
    return { pointer, keys }
  }
}

function normKey(e: KeyboardEvent): string {
  if (e.key === ' ') return 'Space'
  if (e.key.length === 1) return e.key.toLowerCase()
  return e.key
}

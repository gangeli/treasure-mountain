import { P } from './palette'
import { type Ctx, text, roundRect } from './draw'
import { W, H, GROUND_Y } from '../game/layout'
import { drawPlayer, drawElf, drawMaster, drawCrown, drawKey } from './characters'
import { drawKind } from './scenery'
import { drawFeature, drawTreasure, drawGroundCoin, drawPoof } from './features'
import { drawVisual } from './visuals'
import { KINDS, TREASURE_NAMES, type LevelNo } from '../game/world'
import { THEMES } from './backgrounds'
import type { Visual } from '../content/types'

/** Review sheets: every graphic element laid out on a grid with labels (test mode only). */
export function drawSheet(ctx: Ctx, name: string, t: number): void {
  ctx.fillStyle = '#e9eef5'; ctx.fillRect(0, 0, W, H)
  const label = (s: string, x: number, y: number) => text(ctx, s, x, y, { size: 14, align: 'center', color: P.inkSoft, weight: 700 })
  switch (name) {
    case 'sheet-characters': {
      text(ctx, 'Characters', 20, 24, { size: 22, weight: 900 })
      const states = ['idle', 'walk', 'jump', 'net', 'drop', 'climb', 'hit'] as const
      states.forEach((s, i) => { const x = 90 + i * 165; drawPlayer(ctx, x, 200, 1, s, s === 'net' ? 0.12 : 0.4, 30, s === 'net' ? 20 : 0); label(s, x, 225) })
      ;[0, 0.06, 0.12, 0.2, 0.3, 0.42].forEach((tt, i) => { const x = 90 + i * 165; drawPlayer(ctx, x, 400, 1, 'net', tt, 0, -120 + Math.min(1, tt / 0.25) * 170); label(`net t=${tt}`, x, 425) })
      drawPlayer(ctx, 1100, 400, -1, 'walk', 0.5, 60); label('facing left', 1100, 425)
      const elves: [string, any, any][] = [['run', 'run', 'none'], ['scroll', 'run', 'scroll'], ['balloon', 'run', 'balloon'], ['dust', 'run', 'dust'], ['caught', 'caught', 'none'], ['dance', 'dance', 'none'], ['stand', 'stand', 'scroll']]
      elves.forEach(([n, pose, item], i) => { const x = 80 + i * 120; drawElf(ctx, x, 580, 1, pose, 0.3, i % 3, item); label(n, x, 600) })
      drawMaster(ctx, 1000, 600, 0.3, 'smug', 0.9); label('smug', 1000, 620)
      drawMaster(ctx, 1150, 600, 0.3, 'angry', 0.9); label('angry', 1150, 620)
      drawCrown(ctx, 1100, 690, 40); drawKey(ctx, 1200, 690, 1.5, true); drawKey(ctx, 1240, 690, 1.5, false)
      break
    }
    case 'sheet-scenery1': case 'sheet-scenery2': case 'sheet-scenery3': {
      const no = parseInt(name.slice(-1)) as LevelNo
      const th = THEMES[no]
      ctx.fillStyle = th.ground; ctx.fillRect(0, 0, W, H)
      text(ctx, `Scenery, level ${no}: every kind x descriptor`, 20, 24, { size: 22, weight: 900, color: P.white, outline: P.ink, outlineWidth: 4 })
      const kinds = KINDS.filter(k => k.levels.includes(no))
      let x = 60, y = 150
      for (const k of kinds) {
        for (const d of k.descriptors) {
          const w = Math.max(84, k.width * 0.95)
          if (x + w > W - 20) { x = 60; y += 165 }
          drawKind(ctx, k.kind, d, x, y, t, x * 7 + y)
          label(`${d} ${k.kind}`, x, y + 22)
          x += w + 20
        }
      }
      break
    }
    case 'sheet-features': {
      ctx.fillStyle = THEMES[1].ground; ctx.fillRect(0, 0, W, H)
      text(ctx, 'Features', 20, 24, { size: 22, weight: 900, color: P.white, outline: P.ink, outlineWidth: 4 })
      const feats: [any, number, number, LevelNo, any][] = [
        [{ type: 'clubhouse', x: 0, width: 300 }, 180, 330, 1, {}],
        [{ type: 'netrock', x: 0, width: 150 }, 420, 330, 1, { netPrice: 4 }],
        [{ type: 'tunnel', x: 0, width: 170 }, 620, 330, 1, {}],
        [{ type: 'tunnel', x: 0, width: 170 }, 830, 330, 2, {}],
        [{ type: 'tunnel', x: 0, width: 170 }, 1040, 330, 3, {}],
        [{ type: 'secret', x: 0, width: 130 }, 1200, 330, 1, {}],
        [{ type: 'keyhole', x: 0, width: 150 }, 160, 690, 1, { hasKey: true, progress: 0.5 }],
        [{ type: 'fountain', x: 0, width: 170 }, 470, 690, 2, { hasKey: true, progress: 0.3 }],
        [{ type: 'castledoor', x: 0, width: 240 }, 760, 690, 3, { hasKey: false, progress: 0.4 }],
        [{ type: 'bridge', x: 0, width: 280 }, 1080, 690, 2, { bridgeGap: true }],
      ]
      for (const [f, x, y, no, o] of feats) drawFeature(ctx, f, x, y, no, t, { netPrice: 4, hasKey: false, secretUsed: false, bridgeGap: false, ...o })
      drawGroundCoin(ctx, 1230, 690, t); drawPoof(ctx, 1200, 560, 0.5)
      break
    }
    case 'sheet-treasures': {
      text(ctx, 'Treasures (prizes)', 20, 24, { size: 22, weight: 900 })
      TREASURE_NAMES.forEach((n, i) => { const x = 100 + (i % 7) * 170, y = 130 + Math.floor(i / 7) * 160; roundRect(ctx, x - 60, y - 60, 120, 120, 12, P.white, P.inkSoft, 2); drawTreasure(ctx, n, x, y + 10, 1.4); label(n, x, y + 78) })
      break
    }
    case 'sheet-visuals': {
      text(ctx, 'Riddle pictures', 20, 24, { size: 22, weight: 900 })
      const vs: [string, Visual][] = [
        ['counters 7 apples', { kind: 'counters', item: 'apple', count: 7 }],
        ['counters 3+2 groups', { kind: 'counters', item: 'fish', count: 5, groups: 2 }],
        ['counters crossed', { kind: 'counters', item: 'cookie', count: 6, crossed: 2 }],
        ['clock 3:40', { kind: 'clock', hour: 3, minute: 40 }],
        ['coins', { kind: 'coins', coins: ['quarter', 'dime', 'nickel', 'penny'] }],
        ['fraction circle 3/4', { kind: 'fraction', shape: 'circle', parts: 4, shaded: 3 }],
        ['fraction bar 2/5', { kind: 'fraction', shape: 'bar', parts: 5, shaded: 2 }],
        ['shape hexagon', { kind: 'shape', name: 'hexagon' }],
        ['shape cylinder', { kind: 'shape', name: 'cylinder' }],
        ['pattern', { kind: 'pattern', items: [{ shape: 'circle', color: '#e63946' }, { shape: 'square', color: '#2f6fe4' }, { shape: 'circle', color: '#e63946' }], blank: true }],
        ['tenframe 13', { kind: 'tenframe', count: 13 }],
        ['grid 5x3', { kind: 'grid', w: 5, h: 3, unit: 'cm' }],
        ['array 3x4', { kind: 'array', rows: 3, cols: 4, item: 'star' }],
        ['numberline', { kind: 'numberline', from: 0, to: 10, mark: 7 }],
        ['angle 60', { kind: 'angle', degrees: 60 }],
        ['letter B', { kind: 'letter', text: 'B' }],
        ['thermometer 72F', { kind: 'thermometer', degrees: 72, unit: 'F' }],
        ['scale', { kind: 'scale', left: 'rock', right: 'feather', heavier: 'left' }],
        ['bars', { kind: 'bars', values: [3, 7, 5, 2], labels: ['Mon', 'Tue', 'Wed', 'Thu'] }],
        ['text 45 __ 54', { kind: 'text', text: '45 __ 54' }],
      ]
      vs.forEach(([n, v], i) => { const x = 20 + (i % 5) * 250, y = 50 + Math.floor(i / 5) * 165; roundRect(ctx, x, y, 236, 130, 10, P.scroll, P.scrollEdge, 2); drawVisual(ctx, v, x + 6, y + 6, 224, 118); label(n, x + 118, y + 145) })
      break
    }
  }
  void GROUND_Y
}

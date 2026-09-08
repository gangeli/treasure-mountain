import { Stage } from './engine/stage'
import { Loop } from './engine/loop'
import { Input } from './engine/input'
import { AudioEngine } from './engine/audio'
import { loadSave, writeSave } from './engine/storage'
import { Game } from './game/game'
import { render } from './art/render'
import { drawTreasure } from './art/features'
import { TREASURE_NAMES } from './game/world'
import { drawSheet } from './art/sheet'
import type { Grade } from './content/types'

declare global {
  interface Window { __tm?: any; tmBack?: () => boolean; tmPause?: () => void; tmResume?: () => void; AndroidHost?: { isApp(): boolean } }
}

const params = new URLSearchParams(location.search)
const testMode = params.has('test')

const canvas = document.getElementById('game') as HTMLCanvasElement
const stage = new Stage(canvas)
const input = new Input(stage)
const audio = new AudioEngine()
const save = testMode ? null : loadSave()
const game = new Game(save, testMode ? { seed: params.get('seed') ?? 'test', fast: params.has('fast') } : {})
if (testMode && params.has('stars')) { const totals = [0, 5, 25, 70, 115, 170, 230, 300]; const total = totals[Math.min(7, parseInt(params.get('stars') || '0'))]; for (let g = 0; g <= 5; g++) game.profile(g as Grade).total = total }
game.isApp = !!(window.AndroidHost && window.AndroidHost.isApp())
game.onSave = data => { if (!testMode) writeSave(data) }
audio.setSound(game.settings.sound)
audio.setMusic(game.settings.music)
input.onGesture = () => audio.unlock()
document.getElementById('boot')?.remove()

// Install prompt (PWA)
let deferredInstall: any = null
window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; game.installable = true })
window.addEventListener('appinstalled', () => { deferredInstall = null; game.installable = false })

// Speech synthesis for the read-aloud button (and automatically for K-1 riddles).
function speak(text: string): void {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 0.92; u.pitch = 1.05; u.lang = 'en-US'
    window.speechSynthesis.speak(u)
  } catch { /* no speech available */ }
}

function update(dt: number): void {
  const { pointer, keys } = input.drain()
  game.portraitHint = window.innerHeight > window.innerWidth * 1.1 && stage.metrics.scale < 0.55
  for (const k of keys) { if (k.kind === 'down' && !k.repeat) game.keyDown(k.key); else if (k.kind === 'up') game.keyUp(k.key) }
  for (const p of pointer) if (p.kind === 'down') game.tap(p.x, p.y)
  game.update(dt)
  // Side effects requested by the game
  for (const s of game.events.sfx) audio.sfx(s)
  game.events.sfx.length = 0
  audio.play(game.events.music)
  audio.setSound(game.settings.sound); audio.setMusic(game.settings.music)
  if (game.speak) { if (!testMode && (game.grade <= 1 || (game as any)._speakRequested)) speak(game.speak); game.speak = null; (game as any)._speakRequested = false }
  if ((game as any).installRequested) { (game as any).installRequested = false; if (deferredInstall) { deferredInstall.prompt(); deferredInstall = null } }
}

// The speaker button always speaks, even for older grades.
const origPress = game.pressButton.bind(game)
game.pressButton = (id: string) => { if (id === 'speak' || id === 'sayclues') (game as any)._speakRequested = true; origPress(id) }

const loop = new Loop(update, () => render(stage.begin(), game))
loop.start()

// Android back button / lifecycle hooks
window.tmBack = () => game.back()
window.tmPause = () => { if (game.screen === 'level' || game.screen === 'castle') { if (!game.paused) game.togglePause() } }
window.tmResume = () => { audio.unlock() }
document.addEventListener('visibilitychange', () => { if (document.hidden) window.tmPause?.() })

// Service worker (web only)
if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !testMode) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}

// Test hooks: screenshots and scripted play from Playwright.
if (testMode) {
  const shots = ['title', 'grade', 'clubhouse', 'intro', 'level1', 'level2', 'level3', 'riddle', 'riddle-visual', 'riddle-long', 'clue', 'castle', 'throne', 'rank', 'crown', 'howto', 'about', 'pause', 'level1-poof', 'level1-key', 'sheet-characters', 'sheet-scenery1', 'sheet-scenery2', 'sheet-scenery3', 'sheet-features', 'sheet-treasures', 'sheet-visuals']
  window.__tm = {
    ready: true,
    game,
    AudioEngine,
    shots: () => shots,
    drawTreasure,
    treasureNames: [...TREASURE_NAMES, 'medal'],
    /**
     * Mean milliseconds to draw one frame of the current screen (e2e/perf.mjs). Canvas 2D calls
     * only queue work, so a bare timer around them measures nothing; reading one pixel back forces
     * the queue to be rasterised, and the cost of the readback itself is measured and subtracted.
     */
    renderMs(n: number): number {
      const flush = (): void => { stage.ctx.getImageData(0, 0, 1, 1) }
      render(stage.begin(), game); flush()
      const b0 = performance.now()
      for (let i = 0; i < n; i++) flush()
      const baseline = performance.now() - b0
      const t0 = performance.now()
      for (let i = 0; i < n; i++) { render(stage.begin(), game); flush() }
      return Math.max(0, performance.now() - t0 - baseline) / n
    },
    backingPixels: (): number => stage.canvas.width * stage.canvas.height,
    /**
     * The mean brightness of each of the next n frames, stepped at 1/60s (e2e/flash.mjs). A game
     * for children must not flash: WCAG 2.3.1 draws the line at three flashes a second over a
     * large part of the screen, and photosensitive epilepsy is commonest between ages 7 and 19.
     */
    luma(n: number): number[] {
      const out: number[] = []
      for (let i = 0; i < n; i++) {
        game.update(1 / 60)
        render(stage.begin(), game)
        const d = stage.ctx.getImageData(0, 0, stage.canvas.width, stage.canvas.height).data
        let sum = 0, count = 0
        for (let p = 0; p < d.length; p += 4 * 37) { sum += 0.2126 * d[p] + 0.7152 * d[p + 1] + 0.0722 * d[p + 2]; count++ }
        out.push(sum / count / 255)
      }
      return out
    },
    show(name: string) {
      const g = game
      if (name.startsWith('sheet-')) { loop.stop(); drawSheet(stage.begin(), name, 0.3); return }
      if (!loop.running) loop.start()
      const setup = (grade: Grade = 2) => { g.profiles = {}; g.grade = grade; g.profile(grade); g.run = null; g.lvl = null; g.goto('clubhouse') }
      const startLevel = (no: 1 | 2 | 3) => { setup(); g.pressButton('start'); if (g.screen === 'intro') g.advanceScene(); if (no > 1) g.startLevel(no, 777, false); g.lvl!.camX = g.lvl!.player.x - 500 }
      switch (name) {
        case 'title': g.goto('title'); break
        case 'grade': g.profiles = { 0: { grade: 0, total: 7, prizes: ['kite'], ascents: 1, crown: false }, 3: { grade: 3, total: 120, prizes: ['robot'], ascents: 12, crown: false } } as any; g.goto('grade'); break
        case 'clubhouse': setup(); g.profile().total = 31; g.profile().prizes = ['lamp', 'balloon', 'boxcar', 'kite', 'drum', 'robot']; g.profile().ascents = 5; g.pressButton('start'); g.startLevel(2, 5, false); g.goto('clubhouse'); break
        case 'intro': setup(); g.pressButton('start'); if (g.screen !== 'intro') g.goto('intro'); break
        case 'level1': startLevel(1); break
        case 'level2': startLevel(2); break
        case 'level3': startLevel(3); break
        // 78 frames = 1.3s: the treasure or key has finished rising out of the ground and the cloud
        // has nearly faded. At 40 the picture was a cloud with nothing coming out of it.
        case 'level1-poof': startLevel(1); { const grp = g.lvl!.level.groups.find(x => x.hides === 'treasure')!; g.lvl!.player.x = grp.x; g.lvl!.camX = grp.x - 500; g.run!.coins = 5; g.dropCoin(); for (let i = 0; i < 78; i++) g.update(1 / 60) } break
        case 'level1-key': startLevel(1); { g.run!.clues = { ...g.lvl!.level.clueWords }; const grp = g.lvl!.level.groups.find(x => x.hides === 'key')!; g.lvl!.player.x = grp.x; g.lvl!.camX = grp.x - 500; g.run!.coins = 5; g.dropCoin(); for (let i = 0; i < 78; i++) g.update(1 / 60) } break
        case 'riddle': case 'riddle-visual': case 'riddle-long': case 'clue': {
          startLevel(1)
          const elf = g.lvl!.elves.find(e => e.kind === 'scroll')!
          elf.speed = 0; g.lvl!.player.x = elf.x - 80; g.lvl!.player.facing = 1
          g.throwNet(); for (let i = 0; i < 40; i++) g.update(1 / 60)
          if (name === 'riddle-visual') { const r = Game.riddleFor(0, 1, 'visual-shot'); let tries = 0; let rr = r; while (!rr.visual && tries++ < 50) rr = Game.riddleFor(0, 1, 'visual-shot' + tries); g.riddle!.riddle = rr }
          // The longest prompt the game can ask (a grade-5 logic puzzle), to check that the text
          // and the four answers still fit on the scroll together.
          if (name === 'riddle-long') { let rr = Game.riddleFor(5, 3, 'long-shot'); let tries = 0; while (rr.prompt.length < 6 && tries++ < 300) rr = Game.riddleFor(5, 3, 'long-shot' + tries); g.riddle!.riddle = rr }
          if (name === 'clue') { g.selectChoice(g.riddle!.riddle.answer, true); g.riddleContinue() }
          break
        }
        case 'castle': startLevel(3); g.profile().total = 130; (g as any).enterCastle(); break
        case 'throne': startLevel(3); g.run!.treasures = ['lamp', 'balloon', 'kite']; (g as any).enterThrone(); g.sceneStep = 2; g.sceneT = 0.6; break
        case 'rank': setup(); g.rankFrom = 20; g.rankTo = 26; g.goto('rank'); g.sceneT = 5; break
        case 'crown': setup(4); g.goto('crown'); break
        case 'howto': g.goto('howto'); break
        case 'about': g.goto('about'); break
        case 'pause': startLevel(2); g.togglePause(); break
      }
      game.update(1 / 60)
      render(stage.begin(), game)
    },
    step(seconds: number) { const n = Math.round(seconds * 60); for (let i = 0; i < n; i++) update(1 / 60) },
  }
}

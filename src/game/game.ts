import { Rng, hashString } from '../engine/rng'
import type { Grade, Riddle, Tier } from '../content/types'
import { pickRiddle, recentEntry } from '../content/registry'
import { generateLevel, treasuresForStars, starsForTotal, STAR_THRESHOLDS, groupLabel, type Group, type Feature } from './world'
import { LOOP_W, wrapX, loopDelta, loopDist, W, PLAY_H } from './layout'
import type { Screen, Profile, Player, Elf, Run, RiddleView, CastleState, LevelState, Events, Effect } from './types'
import type { SaveData } from '../engine/storage'
import { defaultSave } from '../engine/storage'
import { uiButtons, riddleChoiceRects, gradeCardRects, type Button } from './ui'

export const WALK_SPEED = 300
export const ELF_BASE_SPEED = 150
const JUMP_V = 520
const GRAVITY = 1500
const NET_RANGE = 150       // how far in front of the player the net reaches
const NET_TIME = 0.45
const DROP_TIME = 0.6
export const START_COINS = 5
export const START_NETS = 10
export const NETS_PER_PURCHASE = 5
/** Rank at which each hazard appears, following the original's rank-up announcements. */
export const DUST_STAR = 2          // "Look out for elf dust!"
export const GAP_STAR = 4           // "Watch out for gaps in the path!"
/** The story on the first climb. Here rather than in the art so it can be read out loud too. */
export const INTRO_LINES = [
  'The Master of Mischief has stolen', 'the crown and hidden the treasures', 'all over Treasure Mountain!', '',
  'The elves can help you. Catch them in', 'your net to get coins and clue words.', 'They will help you find treasures', 'and the keys.', '',
  'As the treasure chest is filled, you will', 'earn your stars, win the crown, and', 'save Treasure Mountain!',
]
export const TRICK_LADDER_STAR = 3  // the castle's ladder maze grows with rank
export const CASTLE_FLOORS = 4
export const CASTLE_FLOOR_H = 118
export const CASTLE_FLOOR_Y = (floor: number): number => PLAY_H - 40 - floor * CASTLE_FLOOR_H

export interface GameOptions {
  /** Deterministic seed for the whole session (tests). */
  seed?: number | string
  /** Skip cutscene waits (tests). */
  fast?: boolean
}

export class Game {
  screen: Screen = 'title'
  grade: Grade = 0
  profiles: Record<number, Profile> = {}
  settings = defaultSave().settings
  run: Run | null = null
  lvl: LevelState | null = null
  riddle: RiddleView | null = null
  castle: CastleState | null = null
  /** Cutscene clock for throne / rank / crown / intro screens. */
  sceneT = 0
  sceneStep = 0
  rankFrom = 0
  rankTo = 0
  prize = ''
  events: Events = { sfx: [], music: 'none' }
  speak: string | null = null
  held = new Set<string>()
  time = 0
  installable = false
  isApp = false
  /** Set by the presenter when the viewport is portrait and the game would be tiny. */
  onSave: ((data: SaveData) => void) | null = null
  private rng: Rng
  private fast: boolean
  private lastSaveAt = 0
  /** Grade of the saved, unfinished climb (if any), so choosing that grade again offers to continue it. */
  savedRunGrade: Grade | null = null
  /** Set when the pause overlay is open. */
  paused = false
  pauseIndex = 0
  firstRun = true

  constructor(save?: SaveData | null, opts: GameOptions = {}) {
    this.rng = new Rng(opts.seed ?? Math.floor(Math.random() * 1e9))
    this.fast = !!opts.fast
    if (save) this.loadSave(save)
  }

  // ------------------------------------------------------------------ persistence
  /**
   * Reads a save back. Everything here comes from localStorage, which a browser extension, a
   * half-finished write or an older build of the game can leave in any shape at all, so nothing is
   * trusted: a bad field falls back to its default rather than crashing the child's whole game.
   */
  loadSave(save: SaveData): void {
    const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
    const isGrade = (v: unknown): v is Grade => typeof v === 'number' && Number.isInteger(v) && v >= 0 && v <= 5
    const num = (v: unknown, max: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.min(max, Math.floor(v))) : 0)
    const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : [])

    if (isObj(save.settings)) this.settings = { sound: save.settings.sound !== false, music: save.settings.music !== false }
    const saved = isObj(save.profiles) ? save.profiles : {}
    let count = 0
    for (const [k, v] of Object.entries(saved)) {
      const grade = Number(k)
      if (!isGrade(grade) || !isObj(v)) continue
      this.profiles[grade] = { grade, total: num(v.total, 1e6), prizes: strs(v.prizes), ascents: num(v.ascents, 1e6), crown: v.crown === true }
      count++
    }
    if (isGrade(save.grade)) this.grade = save.grade
    const last = save.lastRun as { run?: unknown; grade?: unknown } | null
    if (isObj(last) && isObj(last.run) && isGrade(last.grade) && this.validRun(last.run)) {
      this.run = last.run as unknown as Run
      this.grade = last.grade
      this.savedRunGrade = last.grade
    }
    this.firstRun = count === 0
  }

  /** A resumable climb: every field the level and castle code reads, in the shape it expects. */
  private validRun(r: Record<string, unknown>): boolean {
    const fin = (v: unknown): boolean => typeof v === 'number' && Number.isFinite(v)
    const strArr = (v: unknown): boolean => Array.isArray(v) && v.every(x => typeof x === 'string')
    return [1, 2, 3].includes(r.levelNo as number) && fin(r.seed) && fin(r.coins) && (r.coins as number) >= 0 &&
      fin(r.nets) && (r.nets as number) >= 0 && strArr(r.treasures) && !!r.clues && typeof r.clues === 'object' &&
      typeof r.hasKey === 'boolean' && Array.isArray(r.searched) && r.searched.every(fin) &&
      typeof r.secretUsed === 'boolean' && fin(r.groundCoinsSpawned) && strArr(r.seen) && strArr(r.recent) && fin(r.playerX)
  }

  toSave(): SaveData {
    const base = defaultSave()
    return { ...base, grade: this.grade, settings: this.settings, profiles: this.profiles, lastRun: this.run ? { run: this.run, grade: this.grade, screen: this.screen } : null }
  }

  private save(): void { this.onSave?.(this.toSave()) }

  profile(grade: Grade = this.grade): Profile {
    if (!this.profiles[grade]) this.profiles[grade] = { grade, total: 0, prizes: [], ascents: 0, crown: false }
    return this.profiles[grade]
  }
  stars(): number { return starsForTotal(this.profile().total) }
  treasuresPerLevel(): number { return treasuresForStars(this.stars()) }
  tierFor(levelNo: number): Tier {
    const s = this.stars()
    if (s >= 5) return 3
    const t = levelNo + (s >= 3 ? 1 : 0)
    return Math.min(3, Math.max(1, t)) as Tier
  }

  // ------------------------------------------------------------------ flow
  private sfx(name: Events['sfx'][number]): void { this.events.sfx.push(name) }
  private music(name: Events['music']): void { this.events.music = name }

  goto(screen: Screen): void {
    this.screen = screen
    this.sceneT = 0
    this.sceneStep = 0
    this.paused = false
    if (screen === 'title') this.music('title')
    if (screen === 'clubhouse' || screen === 'grade' || screen === 'rank' || screen === 'intro' || screen === 'howto' || screen === 'about') this.music('title')
    if (screen === 'level' && this.run) this.music(`level${this.run.levelNo}` as Events['music'])
    if (screen === 'castle' || screen === 'throne') this.music('castle')
    if (screen === 'crown') this.music('win')
  }

  /** Called from the title screen. */
  play(): void { this.sfx('click'); this.goto('grade') }

  chooseGrade(grade: Grade): void {
    this.grade = grade
    this.profile(grade)
    this.sfx('click')
    // Keep an unfinished climb only for the grade it belongs to.
    if (this.savedRunGrade !== grade) this.run = null
    this.goto('clubhouse')
    this.save()
  }

  /** Resume a saved run for the saved grade. */
  canResume(): boolean { return !!this.run }
  resume(): void {
    if (!this.run) return
    this.profile(this.grade)
    this.startLevel(this.run.levelNo, this.run.seed, true)
  }

  startAscent(): void {
    this.sfx('click')
    const seed = this.rng.int(1, 1e9)
    this.run = {
      levelNo: 1, seed, coins: START_COINS, nets: START_NETS, treasures: [], clues: {}, hasKey: false, searched: [], secretUsed: false,
      groundCoinsSpawned: 0, seen: [], recent: [], playerX: 130,
    }
    this.savedRunGrade = this.grade
    if (this.profile().ascents === 0 && this.firstRun) {
      // Read out for K and 1st, like everything else they cannot read yet: this is the only place
      // the game explains why there is a mountain to climb.
      this.speak = INTRO_LINES.filter(Boolean).join(' ')
      this.goto('intro'); return
    }
    this.startLevel(1, seed)
  }

  startLevel(no: 1 | 2 | 3, seed: number, restoring = false): void {
    const run = this.run!
    run.levelNo = no
    run.seed = seed
    if (!restoring) { run.clues = {}; run.hasKey = false; run.searched = []; run.groundCoinsSpawned = 0; run.playerX = 130 }
    const level = generateLevel(no, seed, this.grade, this.treasuresPerLevel(), this.stars())
    const player: Player = { x: run.playerX, y: 0, vy: 0, facing: 1, state: 'idle', t: 0, targetX: null, walkT: 0 }
    this.lvl = { level, player, elves: [], dusts: [], effects: [], groundCoins: [], camX: 0, message: null, transition: null, scrollElfTimer: 0, bridgeBroken: false }
    this.spawnElves()
    this.lvl.camX = wrapX(player.x - W * 0.42)
    this.goto('level')
    if (!restoring && no === 1 && this.profile().ascents === 0) this.showMessage(['Tap an elf to throw your net.', 'Catch one with a scroll for a riddle!'], 6)
    this.save()
  }

  // ------------------------------------------------------------------ elves
  private spawnElves(): void {
    const lvl = this.lvl!
    const stars = this.stars()
    const n = 7 + Math.floor(stars / 2)
    lvl.elves = []
    for (let i = 0; i < n; i++) {
      const kind: Elf['kind'] = i < 3 ? 'scroll' : (stars >= DUST_STAR && i === 3) ? 'dust' : (stars >= DUST_STAR + 2 && i === 4) ? 'dust' : i === n - 1 ? 'balloon' : 'plain'
      lvl.elves.push(this.makeElf(i, kind, wrapX(lvl.player.x + 500 + (i * LOOP_W) / n)))
    }
  }

  private makeElf(id: number, kind: Elf['kind'], x: number): Elf {
    const stars = this.stars()
    return { id, x, dir: this.rng.bool() ? 1 : -1, speed: ELF_BASE_SPEED + this.rng.int(0, 60) + stars * 12, kind, state: 'run', t: 0, color: this.rng.int(0, 2), cooldown: this.rng.float(1, 3) }
  }

  // ------------------------------------------------------------------ input
  keyDown(key: string): void {
    this.held.add(key)
    if (this.paused) { this.pauseKey(key); return }
    switch (this.screen) {
      case 'title': if (key === 'Enter' || key === 'Space') this.play(); break
      case 'grade': {
        const n = key === '0' || key === 'k' ? 0 : /^[1-5]$/.test(key) ? parseInt(key) : -1
        if (n >= 0) this.chooseGrade(n as Grade)
        if (key === 'Escape') this.goto('title')
        break
      }
      case 'intro': if (key === 'Enter' || key === 'Space') this.startLevel(1, this.run!.seed); break
      case 'clubhouse':
        // Enter matches the big button, which is "new climb"; C is the other one. Without it a
        // keyboard player could never pick up a climb they had left half-finished.
        if (key === 'Enter' || key === 'Space') this.startAscent()
        if (key === 'c' && this.canResume()) { this.sfx('click'); this.resume() }
        if (key === 'Escape') this.goto('grade')
        break
      case 'howto': case 'about': if (key === 'Enter' || key === 'Space' || key === 'Escape') this.goto(this.run ? 'clubhouse' : 'title'); break
      case 'level':
        if (key === 'Space') this.throwNet()
        else if (key === 'ArrowDown' || key === 'c') this.dropCoin()
        else if (key === 'ArrowUp' || key === 'w') this.useUp()
        else if (key === 'Escape' || key === 'p') this.togglePause()
        break
      case 'riddle': this.riddleKey(key); break
      case 'clue': if (key === 'Enter' || key === 'Space') this.closeClue(); break
      case 'castle':
        if (key === 'Escape' || key === 'p') this.togglePause()
        break
      case 'throne': case 'rank': case 'crown': if (key === 'Enter' || key === 'Space') this.advanceScene(); break
    }
  }
  keyUp(key: string): void { this.held.delete(key) }

  tap(x: number, y: number): void {
    const btn = this.buttons().find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h && !b.disabled)
    if (btn) { this.pressButton(btn.id); return }
    if (this.paused) return
    switch (this.screen) {
      case 'title': if (y < 560) this.play(); break
      case 'intro': this.startLevel(1, this.run!.seed); break
      case 'grade': {
        const cards = gradeCardRects()
        const i = cards.findIndex(c => x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h)
        if (i >= 0) this.chooseGrade(i as Grade)
        break
      }
      case 'clubhouse': break
      case 'level': this.levelTap(x, y); break
      case 'riddle': this.riddleTap(x, y); break
      case 'clue': this.closeClue(); break
      case 'castle': this.castleTap(x, y); break
      case 'throne': case 'rank': case 'crown': this.advanceScene(); break
      case 'howto': case 'about': this.goto(this.run ? 'clubhouse' : 'title'); break
    }
  }

  buttons(): Button[] { return uiButtons(this) }

  pressButton(id: string): void {
    switch (id) {
      case 'play': this.play(); break
      case 'howto': this.sfx('click'); this.goto('howto'); break
      case 'about': this.sfx('click'); this.goto('about'); break
      case 'sound': this.settings.sound = !this.settings.sound; this.sfx('click'); this.save(); break
      case 'music': this.settings.music = !this.settings.music; this.sfx('click'); this.save(); break
      case 'install': this.events.sfx.push('click'); (this as any).installRequested = true; break
      case 'back': this.sfx('click'); this.goto(this.screen === 'grade' ? 'title' : this.screen === 'clubhouse' ? 'grade' : 'title'); break
      case 'start': this.startAscent(); break
      case 'resume': this.sfx('click'); this.resume(); break
      case 'net': this.throwNet(); break
      case 'coin': this.dropCoin(); break
      case 'jump': this.jump(); break
      case 'pause': this.togglePause(); break
      case 'p-resume': this.togglePause(); break
      case 'p-howto': this.paused = false; this.sfx('click'); (this as any)._returnTo = this.screen; this.goto('howto'); break
      case 'p-sound': this.settings.sound = !this.settings.sound; this.sfx('click'); this.save(); break
      case 'p-music': this.settings.music = !this.settings.music; this.sfx('click'); this.save(); break
      case 'p-quit': this.paused = false; this.sfx('click'); this.save(); this.goto('title'); break
      case 'speak': if (this.riddle) this.speak = this.riddle.riddle.spoken; break
      case 'sayclues': {
        const c = this.run?.clues
        if (!c) break
        const have = [c.number, c.descriptor, c.object].filter(Boolean) as string[]
        this.speak = have.length === 0 ? 'You have no clue words yet. Catch an elf carrying a scroll.'
          : have.length === 3 ? `Find ${have.join(' ')}, and drop a coin in front of them.`
          : `So far your clue words are: ${have.join(', ')}. Catch more elves for the rest.`
        break
      }
      case 'goon': if (this.screen === 'riddle') this.riddleContinue(); else if (this.screen === 'clue') this.closeClue(); else this.advanceScene(); break
      case 'continue': this.advanceScene(); break
      default:
        if (id.startsWith('choice')) this.selectChoice(parseInt(id.slice(6)), true)
        else if (id.startsWith('grade')) this.chooseGrade(parseInt(id.slice(5)) as Grade)
    }
  }

  togglePause(): void {
    if (this.screen !== 'level' && this.screen !== 'castle') return
    this.paused = !this.paused
    this.sfx('click')
    if (this.paused) this.save()
  }
  private pauseKey(key: string): void {
    if (key === 'Escape' || key === 'p' || key === 'Enter') this.togglePause()
  }

  /** Android back button: returns true when handled. */
  back(): boolean {
    if (this.paused) { this.paused = false; return true }
    switch (this.screen) {
      case 'title': return false
      case 'grade': this.goto('title'); return true
      case 'clubhouse': this.goto('grade'); return true
      case 'level': case 'castle': this.togglePause(); return true
      case 'riddle': return true
      case 'clue': this.closeClue(); return true
      case 'howto': case 'about': this.goto(this.run ? 'clubhouse' : 'title'); return true
      default: this.advanceScene(); return true
    }
  }

  // ------------------------------------------------------------------ level play
  private levelTap(x: number, y: number): void {
    const lvl = this.lvl!
    if (y >= PLAY_H) return
    if (lvl.transition) return
    const worldX = wrapX(lvl.camX + x)
    // Tap on an elf: run at it and net it when close.
    const elf = lvl.elves.find(e => e.state === 'run' && loopDist(e.x, worldX) < 60 && y > 300)
    const p = lvl.player
    if (elf) {
      const d = loopDelta(p.x, elf.x)
      p.facing = d >= 0 ? 1 : -1
      if (Math.abs(d) <= NET_RANGE + 20) { this.throwNet(); return }
      p.targetX = wrapX(elf.x - Math.sign(d) * 90)
      ;(p as any).chase = elf.id
      return
    }
    // Tap on a feature: walk there and use it.
    const feat = lvl.level.features.find(f => loopDist(f.x, worldX) < f.width / 2 + 20)
    if (feat && y > 120) {
      p.targetX = feat.x
      ;(p as any).useAt = feat.type
      p.facing = loopDelta(p.x, feat.x) >= 0 ? 1 : -1
      return
    }
    // Tap on a scenery group: walk in front of it.
    const group = lvl.level.groups.find(g => loopDist(g.x, worldX) < g.width / 2 + 10)
    if (group && y > 200) {
      p.targetX = group.x
      p.facing = loopDelta(p.x, group.x) >= 0 ? 1 : -1
      ;(p as any).useAt = null
      return
    }
    // Tap high above the player: jump. Otherwise walk there.
    if (y < 260 && loopDist(worldX, p.x) < 120) { this.jump(); return }
    p.targetX = worldX
    ;(p as any).useAt = null
    ;(p as any).chase = null
    p.facing = loopDelta(p.x, worldX) >= 0 ? 1 : -1
  }

  jump(): void {
    const lvl = this.lvl; if (!lvl || lvl.transition) return
    const p = lvl.player
    if (p.y === 0 && (p.state === 'idle' || p.state === 'walk')) { p.vy = JUMP_V; p.state = 'jump'; p.t = 0; this.sfx('jump') }
  }

  throwNet(): void {
    const lvl = this.lvl; if (!lvl || lvl.transition) return
    const p = lvl.player
    if (p.state !== 'idle' && p.state !== 'walk' && p.state !== 'jump') return
    const run = this.run!
    if (run.nets <= 0) { this.showMessage(['No nets left!', `Buy nets at the rock: drop ${lvl.level.netPrice} coins.`], 3); this.sfx('miss'); return }
    run.nets--
    p.state = 'net'; p.t = 0; p.targetX = null; (p as any).chase = null
    this.sfx('net')
    // Resolve the catch at the end of the swing (see updatePlayer).
    ;(p as any).netPending = true
  }

  private resolveNet(): void {
    const lvl = this.lvl!, p = lvl.player, run = this.run!
    const front = (e: Elf) => { const d = loopDelta(p.x, e.x); return Math.sign(d) === p.facing || Math.abs(d) < 30 ? Math.abs(d) : 1e9 }
    const target = lvl.elves.filter(e => e.state === 'run' && front(e) <= NET_RANGE).sort((a, b) => front(a) - front(b))[0]
    if (!target) { this.sfx('miss'); return }
    target.state = 'caught'; target.t = 0
    target.x = wrapX(p.x + p.facing * Math.min(NET_RANGE - 20, Math.max(50, Math.abs(loopDelta(p.x, target.x)))))
    this.sfx('catch')
    run.coins++
    this.addEffect('text', target.x, 120, '+1')
    if (target.kind === 'scroll') {
      this.openRiddle(target)
    } else if (target.kind === 'balloon') {
      run.coins++
      this.addEffect('text', target.x, 90, '+1')
    }
  }

  private openRiddle(elf: Elf): void {
    const run = this.run!
    const seen = new Set(run.seen)
    const r = pickRiddle(this.grade, this.tierFor(run.levelNo), this.rng, seen, run.recent)
    run.seen.push(r.key)
    if (run.seen.length > 200) run.seen.shift()
    run.recent.push(recentEntry(r))
    if (run.recent.length > 8) run.recent.shift()
    // Two tries, never more than one short of the number of choices. Three tries against the three
    // choices K and grade 1 see would hand the answer to a child who has only ruled the other two
    // out: the riddle could not be failed, and the coins and clue words stopped saying anything
    // about reading. One slip is forgiven at every grade; the second ends the riddle, and then the
    // answer is shown either way.
    this.riddle = { riddle: r, selected: 0, wrong: [], triesLeft: Math.min(2, r.choices.length - 1), phase: 'ask', t: 0, coinsWon: 0 }
    ;(this.riddle as any).elfId = elf.id
    this.sfx('scroll')
    this.goto('riddle')
    this.speak = r.spoken
  }

  private riddleKey(key: string): void {
    const rv = this.riddle!
    if (rv.phase !== 'ask') { if (key === 'Enter' || key === 'Space') this.riddleContinue(); return }
    const n = rv.riddle.choices.length
    if (key === 'ArrowDown' || key === 'ArrowRight') { rv.selected = (rv.selected + 1) % n; this.sfx('tick') }
    else if (key === 'ArrowUp' || key === 'ArrowLeft') { rv.selected = (rv.selected + n - 1) % n; this.sfx('tick') }
    else if (key === 'Enter' || key === 'Space') this.selectChoice(rv.selected, true)
    else if (/^[1-4]$/.test(key) && parseInt(key) <= n) this.selectChoice(parseInt(key) - 1, true)
  }

  private riddleTap(x: number, y: number): void {
    const rv = this.riddle!
    if (rv.phase !== 'ask') { this.riddleContinue(); return }
    const rects = riddleChoiceRects(rv.riddle)
    const i = rects.findIndex(r => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h)
    if (i >= 0) this.selectChoice(i, true)
  }

  /** Selects (and with confirm, answers) a choice. */
  selectChoice(i: number, confirm: boolean): void {
    const rv = this.riddle!
    if (rv.phase !== 'ask' || rv.wrong.includes(i)) return
    rv.selected = i
    if (!confirm) return
    const run = this.run!
    if (i === rv.riddle.answer) {
      rv.phase = 'right'; rv.t = 0
      run.coins += 2; rv.coinsWon = 2
      this.sfx('right')
      // Clue word: fill a random empty slot.
      const empty = (['number', 'descriptor', 'object'] as const).filter(s => !run.clues[s])
      if (empty.length) {
        const slot = this.rng.pick(empty)
        const word = this.lvl!.level.clueWords[slot]
        run.clues[slot] = word
        rv.clueWord = word; rv.clueSlot = slot
      }
      this.save()
    } else {
      rv.wrong.push(i)
      rv.triesLeft--
      this.sfx('wrong')
      if (rv.triesLeft <= 0) { rv.phase = 'reveal'; rv.t = 0 }
      else { rv.phase = 'wrong'; rv.t = 0 }
    }
  }

  riddleContinue(): void {
    const rv = this.riddle!
    if (rv.phase === 'wrong') { rv.phase = 'ask'; rv.t = 0; return }
    if (rv.phase === 'right') {
      // Read the clue word out. A five-year-old who cannot yet read "small" has no other way to
      // use the three words in the panel; main.ts speaks only for K and 1st unless asked.
      if (rv.clueWord) { this.sfx('clue'); this.speak = `You won a clue word: ${rv.clueWord}`; this.goto('clue'); return }
      this.finishRiddle(); return
    }
    if (rv.phase === 'reveal') { this.finishRiddle(); return }
  }

  closeClue(): void { this.finishRiddle() }

  private finishRiddle(): void {
    const rv = this.riddle
    const lvl = this.lvl!
    if (rv) {
      const elf = lvl.elves.find(e => e.id === (rv as any).elfId)
      if (elf) { elf.state = 'flee'; elf.t = 0; elf.kind = 'plain'; elf.dir = lvl.player.facing }
      lvl.scrollElfTimer = 4
      if (rv.phase === 'reveal') this.showMessage(['That elf got away. Catch another one', 'and try again!'], 3)
    }
    this.riddle = null
    this.goto('level')
    this.save()
    const run = this.run!
    if (run.clues.number && run.clues.descriptor && run.clues.object && !(run as any).allCluesMsg) {
      (run as any).allCluesMsg = true
      this.showMessage(['You have all three clue words!', `Find ${groupLabel(lvl.level.target)} and drop a coin.`], 5)
      this.speak = `You have all three clue words. Find ${groupLabel(lvl.level.target)}, and drop a coin.`
    }
  }

  dropCoin(): void {
    const lvl = this.lvl; if (!lvl || lvl.transition) return
    const p = lvl.player, run = this.run!, level = lvl.level
    if (p.state !== 'idle' && p.state !== 'walk') return
    p.targetX = null; (p as any).chase = null
    // Net rock?
    const rock = level.features.find(f => f.type === 'netrock' && loopDist(f.x, p.x) < f.width / 2 + 40)
    if (rock) {
      if (run.coins >= level.netPrice) {
        run.coins -= level.netPrice; run.nets += NETS_PER_PURCHASE
        p.state = 'drop'; p.t = 0
        this.sfx('coin'); this.addEffect('text', p.x, 160, `+${NETS_PER_PURCHASE} nets`)
        this.showMessage([`You bought ${NETS_PER_PURCHASE} nets for ${level.netPrice} coins.`], 2.5)
      } else if (run.nets === 0) {
        run.nets += NETS_PER_PURCHASE
        this.sfx('coin'); this.addEffect('text', p.x, 160, 'free nets!')
        this.showMessage(['The rock rolls aside...', `Free nets! Here are ${NETS_PER_PURCHASE}.`], 3)
      } else {
        this.showMessage([`Nets cost ${level.netPrice} coins.`, `You have ${run.coins}. Catch more elves!`], 3); this.sfx('nothing')
      }
      this.save()
      return
    }
    const group = level.groups.find(g => loopDist(g.x, p.x) < g.width / 2 + 30)
    if (!group) { this.showMessage(['Drop coins in front of trees, rocks,', 'flowers... things that match your clues.'], 3); this.sfx('nothing'); return }
    if (run.coins <= 0) { this.showMessage(['You have no coins!', 'Catch elves to earn coins.'], 3); this.sfx('nothing'); return }
    run.coins--
    p.state = 'drop'; p.t = 0
    this.sfx('dig')
    this.addEffect('poof', group.x, 330)
    ;(lvl as any).pendingReveal = { group, t: 0.5 }
  }

  private revealGroup(group: Group): void {
    const run = this.run!, lvl = this.lvl!
    const already = run.searched.includes(group.id)
    if (!already) run.searched.push(group.id)
    if (!already && group.hides === 'key') {
      run.hasKey = true
      this.sfx('treasure')
      this.addEffect('sparkle', group.x, 380)
      const exit = lvl.level.no === 1 ? 'the keyhole in the big tree' : lvl.level.no === 2 ? 'the elf fountain' : 'the castle door'
      this.showMessage(['You found the KEY!', `Take it to ${exit}.`], 4)
    } else if (!already && group.hides === 'treasure') {
      run.treasures.push(group.treasure || 'toy')
      this.sfx('treasure')
      this.addEffect('sparkle', group.x, 380)
      this.showMessage([`A treasure! You found a ${group.treasure}.`], 3)
      // Elves like to watch.
    } else {
      this.sfx('nothing')
      this.showMessage(already ? ['Nothing more here.'] : ['Nothing here. Try somewhere that matches', 'more of your clue words.'], 2.5)
    }
    this.save()
  }

  /** Up arrow / tapping a feature: tunnels, secret cave, keyhole, fountain, castle door. */
  useUp(): void {
    const lvl = this.lvl; if (!lvl || lvl.transition) return
    const p = lvl.player, level = lvl.level
    const feat = level.features.find(f => loopDist(f.x, p.x) < f.width / 2 + 10)
    if (!feat) { this.jump(); return }
    this.useFeature(feat)
  }

  private useFeature(feat: Feature): void {
    const lvl = this.lvl!, p = lvl.player, run = this.run!, level = lvl.level
    if (p.state !== 'idle' && p.state !== 'walk') return
    p.targetX = null
    switch (feat.type) {
      case 'tunnel': {
        const other = level.features.filter(f => f.type === 'tunnel').find(f => f !== feat)!
        lvl.transition = { kind: 'tunnel', t: 0, to: other.x }
        p.state = 'enter'; p.t = 0
        this.sfx('gate')
        break
      }
      case 'secret': {
        if (run.secretUsed) { this.showMessage(['The secret cave is empty now.'], 2); return }
        run.secretUsed = true
        run.coins += 3
        lvl.transition = { kind: 'secret', t: 0 }
        p.state = 'enter'; p.t = 0
        this.sfx('coin')
        this.showMessage(['A secret cave!', 'You found 3 coins.'], 3)
        this.save()
        break
      }
      case 'keyhole': case 'fountain': case 'castledoor': {
        if (!run.hasKey) { this.showMessage(['It is locked. Find the key first:', `drop a coin at ${groupLabel(level.target)}.`], 3.5); this.sfx('nothing'); return }
        lvl.transition = { kind: feat.type === 'keyhole' ? 'climb' : feat.type === 'fountain' ? 'ride' : 'castle', t: 0 }
        p.state = feat.type === 'fountain' ? 'ride' : feat.type === 'keyhole' ? 'climb' : 'enter'; p.t = 0
        this.sfx(feat.type === 'keyhole' ? 'ladder' : 'gate')
        break
      }
      case 'clubhouse': this.showMessage(['This is your clubhouse.', 'Climb the mountain to fill the chest!'], 3); break
      case 'netrock': this.dropCoin(); break
      case 'bridge': break
    }
  }

  showMessage(text: string[], seconds: number): void { if (this.lvl) this.lvl.message = { text, t: seconds } }
  private addEffect(kind: Effect['kind'], x: number, y: number, text?: string): void { this.lvl?.effects.push({ kind, x, y, t: 0, text }) }

  // ------------------------------------------------------------------ update
  update(dt: number): void {
    this.time += dt
    if (this.paused) return
    switch (this.screen) {
      case 'level': this.updateLevel(dt); break
      case 'riddle': this.updateRiddle(dt); break
      case 'castle': this.updateCastle(dt); break
      case 'throne': case 'rank': case 'crown': case 'intro': case 'clue': this.sceneT += dt; if (this.screen === 'throne') this.updateThrone(); break
      default: this.sceneT += dt
    }
    if (this.time - this.lastSaveAt > 10 && (this.screen === 'level' || this.screen === 'castle')) { this.lastSaveAt = this.time; this.save() }
  }

  private updateRiddle(dt: number): void {
    const rv = this.riddle!
    rv.t += dt
    if (rv.phase === 'wrong' && rv.t > 1.2) { rv.phase = 'ask'; rv.t = 0 }
  }

  private updateLevel(dt: number): void {
    const lvl = this.lvl!, run = this.run!, p = lvl.player
    // A POOF lives 2.2s: the cloud puffs and fades over the first 1.4, then what was hidden rises
    // out of the empty air and is held on screen on its own for the rest.
    lvl.effects = lvl.effects.filter(e => (e.t += dt) < (e.kind === 'text' ? 1.2 : e.kind === 'poof' ? 2.2 : 1.0))
    if (lvl.message && (lvl.message.t -= dt) <= 0) lvl.message = null
    const pr = (lvl as any).pendingReveal as { group: Group; t: number } | undefined
    if (pr && (pr.t -= dt) <= 0) { (lvl as any).pendingReveal = undefined; this.revealGroup(pr.group) }

    if (lvl.transition) { this.updateTransition(dt); return }

    this.updatePlayer(dt)
    this.updateElves(dt)
    this.updateDust(dt)

    // Ground coins when broke.
    if (run.nets === 0 && run.coins < lvl.level.netPrice && run.groundCoinsSpawned < 3 && lvl.groundCoins.length === 0) {
      run.groundCoinsSpawned++
      lvl.groundCoins.push({ x: wrapX(p.x + p.facing * 500), t: 0 })
    }
    for (const c of lvl.groundCoins) { c.t += dt; if (loopDist(c.x, p.x) < 40 && p.y < 30) { run.coins++; this.sfx('coin'); this.addEffect('text', c.x, 160, '+1'); c.t = -1 } }
    lvl.groundCoins = lvl.groundCoins.filter(c => c.t >= 0)

    // Camera: keep the player around 42% from the left, wrapping.
    const want = wrapX(p.x - W * 0.42)
    const d = loopDelta(lvl.camX, want)
    lvl.camX = wrapX(lvl.camX + d * Math.min(1, dt * 6))
    run.playerX = p.x
  }

  private updateTransition(dt: number): void {
    const lvl = this.lvl!, run = this.run!, p = lvl.player, tr = lvl.transition!
    tr.t += dt
    p.t += dt
    const dur = this.fast ? 0.1 : (tr.kind === 'tunnel' ? 1.2 : tr.kind === 'secret' ? 1.5 : tr.kind === 'climb' ? 2.6 : tr.kind === 'ride' ? 2.6 : 1.6)
    if (tr.t < dur) return
    lvl.transition = null
    p.state = 'idle'; p.t = 0
    switch (tr.kind) {
      case 'tunnel': p.x = wrapX(tr.to! + 90 * p.facing); lvl.camX = wrapX(p.x - W * 0.42); break
      case 'secret': break
      case 'climb': case 'ride': {
        const next = (run.levelNo + 1) as 1 | 2 | 3
        run.treasures = run.treasures.slice()
        this.sfx('fanfare')
        this.startLevel(next, this.rng.int(1, 1e9))
        break
      }
      case 'castle': this.enterCastle(); break
    }
  }

  private updatePlayer(dt: number): void {
    const lvl = this.lvl!, p = lvl.player
    p.t += dt
    // Keyboard movement overrides tap-to-walk.
    let move = 0
    if (this.held.has('ArrowLeft') || this.held.has('a')) move -= 1
    if (this.held.has('ArrowRight') || this.held.has('d')) move += 1
    if (move !== 0) { p.targetX = null; (p as any).chase = null }
    if (p.state === 'net') {
      if ((p as any).netPending && p.t >= NET_TIME * 0.55) { (p as any).netPending = false; this.resolveNet() }
      if (p.t >= NET_TIME) { p.state = 'idle'; p.t = 0 }
      return
    }
    if (p.state === 'drop') { if (p.t >= DROP_TIME) { p.state = 'idle'; p.t = 0 } return }
    if (p.state === 'hit') { if (p.t >= 0.6) { p.state = 'idle'; p.t = 0 } return }
    // Chasing an elf: retarget as it moves.
    const chase = (p as any).chase as number | null
    if (chase != null) {
      const elf = lvl.elves.find(e => e.id === chase)
      if (!elf || elf.state !== 'run') { (p as any).chase = null; p.targetX = null }
      else {
        const d = loopDelta(p.x, elf.x)
        if (Math.abs(d) <= NET_RANGE - 10 && p.y === 0) { p.facing = d >= 0 ? 1 : -1; (p as any).chase = null; p.targetX = null; this.throwNet(); return }
        p.targetX = wrapX(elf.x - Math.sign(d) * 80)
      }
    }
    if (p.targetX != null && move === 0) {
      const d = loopDelta(p.x, p.targetX)
      if (Math.abs(d) < 8) {
        p.targetX = null
        const use = (p as any).useAt as Feature['type'] | null
        if (use) { (p as any).useAt = null; const f = lvl.level.features.find(f => f.type === use && loopDist(f.x, p.x) < f.width / 2 + 40); if (f && p.y === 0) this.useFeature(f) }
      } else move = Math.sign(d)
    }
    // Gap in the path (level 2). The original warns about gaps at 4 stars: "Watch out for gaps in the path!"
    const bridge = lvl.level.features.find(f => f.type === 'bridge')
    const gapActive = !!bridge && this.stars() >= GAP_STAR
    if (move !== 0) {
      const nx = wrapX(p.x + move * WALK_SPEED * dt)
      if (gapActive && bridge && p.y === 0 && p.targetX != null && loopDist(nx, bridge.x) < 95 && loopDist(p.x, bridge.x) >= 95) {
        p.targetX = null; move = 0
        this.showMessage(['The bridge is out! Jump across.'], 2.5)
      }
    }
    if (move !== 0) {
      p.facing = move > 0 ? 1 : -1
      p.x = wrapX(p.x + move * WALK_SPEED * dt)
      p.walkT += WALK_SPEED * dt
      if (p.state === 'idle') { p.state = 'walk'; p.t = 0 }
      if (p.state === 'walk' && Math.floor(p.walkT / 60) !== Math.floor((p.walkT - WALK_SPEED * dt) / 60)) this.sfx('step')
    } else if (p.state === 'walk') { p.state = 'idle'; p.t = 0 }
    // Vertical.
    if (p.y > 0 || p.vy !== 0) {
      p.vy -= GRAVITY * dt
      p.y += p.vy * dt
      if (p.y <= 0) { p.y = 0; p.vy = 0; if (p.state === 'jump' || p.state === 'fall') { p.state = 'idle'; p.t = 0; this.sfx('land') } }
    }
    if (gapActive && bridge && p.y === 0 && loopDist(p.x, bridge.x) < 55 && p.state !== 'fall') {
      // Fell into the gap (110 px wide; a jump covers about 200): back to the near edge.
      const side = loopDelta(bridge.x, p.x) < 0 ? -1 : 1
      p.x = wrapX(bridge.x + side * 110)
      p.state = 'fall'; p.t = 0; p.targetX = null
      this.sfx('miss'); this.showMessage(['Whoa! Jump over the broken bridge.'], 2.5)
      p.state = 'idle'
    }
  }

  private updateElves(dt: number): void {
    const lvl = this.lvl!, p = lvl.player
    const stars = this.stars()
    lvl.scrollElfTimer -= dt
    const scrolls = lvl.elves.filter(e => e.kind === 'scroll' && e.state !== 'gone').length
    if (scrolls < 3 && lvl.scrollElfTimer <= 0) {
      // Promote a plain elf that is off screen into a scroll elf.
      const cand = lvl.elves.filter(e => e.kind === 'plain' && e.state === 'run' && loopDist(e.x, p.x) > 800)
      if (cand.length) { this.rng.pick(cand).kind = 'scroll'; lvl.scrollElfTimer = 6 }
    }
    for (const e of lvl.elves) {
      e.t += dt
      switch (e.state) {
        case 'run': {
          // Turn around now and then; shy away from the player a little at higher ranks.
          e.cooldown -= dt
          if (e.cooldown <= 0) { e.cooldown = this.rng.float(1.5, 4); if (this.rng.bool(0.5)) e.dir = -e.dir as 1 | -1 }
          const d = loopDelta(p.x, e.x)
          if (stars >= 1 && Math.abs(d) < 220 && p.state === 'walk' && this.rng.bool(0.02)) e.dir = (Math.sign(d) || 1) as 1 | -1
          e.x = wrapX(e.x + e.dir * e.speed * dt)
          if (e.kind === 'dust' && Math.abs(d) < 320 && e.cooldown < 1 && (e as any).dustT === undefined) {
            (e as any).dustT = 0
            lvl.dusts.push({ x: e.x, y: 70, vx: -Math.sign(d) * 260 || 260, vy: 120, t: 0 })
            this.sfx('elfLaugh')
          }
          if ((e as any).dustT !== undefined) { (e as any).dustT += dt; if ((e as any).dustT > 5) (e as any).dustT = undefined }
          break
        }
        case 'caught': if (e.t > 1.4) { e.state = 'flee'; e.t = 0; e.dir = p.facing } break
        case 'dance': break
        case 'flee': {
          e.x = wrapX(e.x + e.dir * e.speed * 1.4 * dt)
          if (e.t > 1.5) { e.state = 'run'; e.t = 0 }
          break
        }
        case 'gone': break
      }
    }
  }

  private updateDust(dt: number): void {
    const lvl = this.lvl!, p = lvl.player, run = this.run!
    for (const d of lvl.dusts) {
      d.t += dt
      d.x = wrapX(d.x + d.vx * dt)
      d.vy -= 400 * dt
      d.y += d.vy * dt
      if (d.y <= 0) d.t = 99
      if (loopDist(d.x, p.x) < 40 && Math.abs(d.y - (p.y + 60)) < 60 && p.state !== 'hit') {
        d.t = 99
        if (run.coins > 0) { run.coins--; this.addEffect('text', p.x, 160, '-1'); this.showMessage(['Elf dust! That elf stole a coin.'], 2) }
        p.state = 'hit'; p.t = 0
        this.addEffect('dustpuff', p.x, 100)
        this.sfx('miss')
      }
    }
    lvl.dusts = lvl.dusts.filter(d => d.t < 3)
  }

  // ------------------------------------------------------------------ castle
  private enterCastle(): void {
    const stars = this.stars()
    const rng = this.rng
    const ladders: CastleState['ladders'] = []
    for (let f = 0; f < CASTLE_FLOORS - 1; f++) {
      const n = 2 + (stars >= TRICK_LADDER_STAR ? 1 : 0)
      const xs = rng.shuffle([220, 500, 780, 1060]).slice(0, n)
      const trickIndex = stars >= TRICK_LADDER_STAR ? rng.int(0, n - 1) : -1
      xs.forEach((x, i) => ladders.push({ floor: f, x, trick: i === trickIndex }))
    }
    const holes: CastleState['holes'] = []
    // Never 640: the Master's portraits hang at 160, 640 and 1120, and a hole there was drawn as a
    // black disc on top of a gold picture frame. And never within reach of a ladder head (220, 500,
    // 780, 1060): a hole at 450 or 830 caught the player the instant they stepped off the ladder,
    // with nothing they could have done about it, and could knock them down the same ladder over
    // and over. Every position here is at least 90px clear of all four.
    const HOLE_X = [350, 400, 900, 950]
    if (stars >= 4) for (let f = 1; f < CASTLE_FLOORS; f++) holes.push({ floor: f, x: rng.pick(HOLE_X), t: rng.float(0, 2), active: false })
    this.castle = { floor: 0, x: 100, y: 0, onLadder: null, ladders, holes, state: 'walk', t: 0, facing: 1, targetX: null, hint: null }
    this.goto('castle')
    this.showMessage([], 0)
  }

  private castleTap(x: number, y: number): void {
    const c = this.castle!
    if (c.state !== 'walk') return
    // Tap a ladder on the current floor: walk to it and climb. Otherwise walk to x.
    const floorTapped = Math.max(0, Math.min(CASTLE_FLOORS - 1, Math.round((PLAY_H - 40 - y) / CASTLE_FLOOR_H)))
    const ladder = c.ladders.filter(l => l.floor === c.floor).find(l => Math.abs(l.x - x) < 60)
    if (ladder && floorTapped >= c.floor) { c.targetX = ladder.x; (c as any).climbAt = ladder; return }
    const door = c.floor === CASTLE_FLOORS - 1 && x > 960
    if (door) { c.targetX = 1050; (c as any).climbAt = null; return }
    c.targetX = Math.max(60, Math.min(1220, x)); (c as any).climbAt = null
  }

  private updateCastle(dt: number): void {
    const c = this.castle!
    c.t += dt
    if (c.hint && (c.hint.t -= dt) <= 0) c.hint = null
    let move = 0
    if (this.held.has('ArrowLeft') || this.held.has('a')) move -= 1
    if (this.held.has('ArrowRight') || this.held.has('d')) move += 1
    const up = this.held.has('ArrowUp') || this.held.has('w')
    if (move !== 0) c.targetX = null
    switch (c.state) {
      case 'walk': {
        if (c.targetX != null) { const d = c.targetX - c.x; if (Math.abs(d) < 6) { c.targetX = null; const l = (c as any).climbAt; if (l) { (c as any).climbAt = null; this.startClimb(l) } else if (c.floor === CASTLE_FLOORS - 1 && Math.abs(c.x - 1050) < 60) { c.state = 'door'; c.t = 0; this.sfx('gate') } } else move = Math.sign(d) }
        if (move !== 0) { c.facing = move > 0 ? 1 : -1; c.x = Math.max(60, Math.min(1220, c.x + move * WALK_SPEED * dt)) }
        if (up && c.floor < CASTLE_FLOORS - 1) { const l = c.ladders.find(l => l.floor === c.floor && Math.abs(l.x - c.x) < 40); if (l) this.startClimb(l) }
        if (c.floor === CASTLE_FLOORS - 1 && Math.abs(c.x - 1050) < 60 && (up || this.held.has('Enter'))) { c.state = 'door'; c.t = 0; this.sfx('gate') }
        // Holes: the Master's arm sweeps out periodically; if the player is right in front, they are knocked to the floor below.
        for (const h of c.holes) {
          h.t += dt
          const period = 3
          h.active = (h.t % period) > period - 0.9
          // c.t is the time since the state last changed, so this also gives half a second of grace
          // to anyone who has just stepped off a ladder or been knocked down onto this floor.
          if (h.active && h.floor === c.floor && Math.abs(h.x - c.x) < 70 && c.state === 'walk' && c.t > 0.5) {
            c.state = 'hit'; c.t = 0; this.sfx('miss')
            c.hint = { text: ['The Master knocked you down a floor!', 'Wait for the arm to go back in, then run past.'], t: 4 }
          }
        }
        break
      }
      case 'climb': {
        const l = c.ladders[c.onLadder!]
        const top = CASTLE_FLOOR_H
        const trickStop = l.trick ? top * 0.62 : top
        c.y += 170 * dt
        if (c.y >= trickStop) {
          if (l.trick) {
            c.state = 'fall'; c.t = 0; this.sfx('miss')
            // Without this a child climbs, slides back down and is told nothing at all.
            c.hint = { text: ['That ladder was a trick!', 'Gray ladders stop halfway. Try another one.'], t: 4 }
          }
          else { c.y = 0; c.floor++; c.onLadder = null; c.state = 'walk'; c.t = 0; this.sfx('ladder'); if (c.floor === CASTLE_FLOORS - 1) this.sfx('fanfare') }
        }
        break
      }
      case 'fall': { c.y -= 260 * dt; if (c.y <= 0) { c.y = 0; c.onLadder = null; c.state = 'walk'; c.t = 0 } break }
      // Being knocked down a floor cancels where the player was walking to. Without this the walk
      // resumed on the floor below and climbed the ladder it had been aiming at up there, so the
      // Super Solver went up a ladder that was not drawn anywhere near them.
      case 'hit': { c.x -= c.facing * 120 * dt; if (c.t > 0.7) { c.state = 'walk'; c.t = 0; c.targetX = null; (c as any).climbAt = null; if (c.floor > 0) c.floor-- } break }
      case 'door': if (c.t > (this.fast ? 0.1 : 1.2)) { c.state = 'done'; this.enterThrone() } break
      case 'done': break
    }
  }

  private startClimb(l: CastleState['ladders'][number]): void {
    const c = this.castle!
    if (l.floor !== c.floor) return
    c.onLadder = c.ladders.indexOf(l); c.x = l.x; c.y = 0; c.state = 'climb'; c.t = 0; c.targetX = null
    this.sfx('ladder')
  }

  // ------------------------------------------------------------------ throne, rank, crown
  private enterThrone(): void {
    const run = this.run!, prof = this.profile()
    this.prize = run.treasures.length ? this.rng.pick(run.treasures) : 'medal'
    this.rankFrom = prof.total
    this.rankTo = prof.total + run.treasures.length
    this.goto('throne')
  }

  /** Throne cutscene steps advance on a timer; tapping skips ahead. */
  private throneSteps = [1.2, 2.2, 2.2, 1.6, 1.4, 2.0, 99]
  private updateThrone(): void {
    const lim = this.fast ? 0.05 : this.throneSteps[this.sceneStep]
    if (this.sceneT >= lim && this.sceneStep < this.throneSteps.length - 1) { this.sceneStep++; this.sceneT = 0; if (this.sceneStep === 2) this.sfx('treasure'); if (this.sceneStep === 4) this.sfx('elfLaugh'); if (this.sceneStep === 5) this.sfx('fanfare') }
  }

  advanceScene(): void {
    switch (this.screen) {
      case 'throne':
        if (this.sceneStep < this.throneSteps.length - 1) { this.sceneStep = this.throneSteps.length - 1; this.sceneT = 0; return }
        this.completeAscent(); break
      case 'rank': {
        const prof = this.profile()
        if (prof.total >= STAR_THRESHOLDS[STAR_THRESHOLDS.length - 1] && !prof.crown) { prof.crown = true; this.save(); this.goto('crown'); return }
        this.goto('clubhouse'); break
      }
      case 'crown': this.goto('clubhouse'); break
      case 'intro': this.startLevel(1, this.run!.seed); break
    }
  }

  private completeAscent(): void {
    const run = this.run!, prof = this.profile()
    prof.total += run.treasures.length
    prof.ascents++
    prof.prizes.push(this.prize)
    if (prof.prizes.length > 60) prof.prizes.shift()
    this.run = null
    this.savedRunGrade = null
    this.lvl = null
    this.castle = null
    this.sfx(starsForTotal(this.rankTo) > starsForTotal(this.rankFrom) ? 'crown' : 'fanfare')
    this.goto('rank')
    this.save()
  }

  // ------------------------------------------------------------------ helpers for the renderer / tests
  cluesFound(): number { const c = this.run?.clues; return c ? ['number', 'descriptor', 'object'].filter(k => (c as any)[k]).length : 0 }
  /** Deterministic riddle for tests. */
  static riddleFor(grade: Grade, tier: Tier, seed: string): Riddle { return pickRiddle(grade, tier, new Rng(hashString(seed)), new Set()) }
}

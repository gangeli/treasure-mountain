import type { Grade } from '../content/types'
import type { Riddle } from '../content/types'
import type { Level } from './world'
import type { MusicName, SfxName } from '../engine/audio'

export type Screen = 'title' | 'grade' | 'clubhouse' | 'intro' | 'level' | 'riddle' | 'clue' | 'castle' | 'throne' | 'rank' | 'crown' | 'howto' | 'about'

export interface Profile {
  grade: Grade
  total: number
  prizes: string[]
  ascents: number
  crown: boolean
}

export type PlayerState = 'idle' | 'walk' | 'jump' | 'net' | 'drop' | 'climb' | 'ride' | 'enter' | 'fall' | 'hit'

export interface Player {
  x: number
  y: number      // height above the ground (>= 0)
  vy: number
  facing: 1 | -1
  state: PlayerState
  t: number      // time in state
  targetX: number | null
  walkT: number  // distance walked, for the walk cycle
}

export type ElfKind = 'plain' | 'scroll' | 'dust' | 'balloon'
export type ElfState = 'run' | 'caught' | 'dance' | 'flee' | 'gone'

export interface Elf {
  id: number
  x: number
  dir: 1 | -1
  speed: number
  kind: ElfKind
  state: ElfState
  t: number
  color: number   // cap colour variant 0..2
  cooldown: number
}

export interface Dust { x: number; y: number; vx: number; vy: number; t: number }
export interface Effect { kind: 'poof' | 'sparkle' | 'text' | 'dustpuff'; x: number; y: number; t: number; text?: string }
export interface GroundCoin { x: number; t: number }

export interface Run {
  levelNo: 1 | 2 | 3
  seed: number
  coins: number
  nets: number
  treasures: string[]
  clues: { number?: string; descriptor?: string; object?: string }
  hasKey: boolean
  searched: number[]
  secretUsed: boolean
  groundCoinsSpawned: number
  /** Riddle keys already seen this ascent. */
  seen: string[]
  recentAreas: string[]
  playerX: number
}

export interface RiddleView {
  riddle: Riddle
  selected: number
  wrong: number[]
  triesLeft: number
  /** 'ask' | 'right' | 'wrong' | 'reveal' */
  phase: 'ask' | 'right' | 'wrong' | 'reveal'
  t: number
  clueWord?: string
  clueSlot?: 'number' | 'descriptor' | 'object'
  coinsWon: number
}

export interface CastleState {
  floor: number
  x: number
  y: number             // 0 = on the floor; ladder progress in px while climbing
  onLadder: number | null
  ladders: { floor: number; x: number; trick: boolean }[]
  holes: { floor: number; x: number; t: number; active: boolean }[]
  state: 'walk' | 'climb' | 'fall' | 'hit' | 'door' | 'done'
  t: number
  facing: 1 | -1
  targetX: number | null
  falls: number
}

export interface LevelState {
  level: Level
  player: Player
  elves: Elf[]
  dusts: Dust[]
  effects: Effect[]
  groundCoins: GroundCoin[]
  camX: number
  /** Timed message bubble shown above the HUD prompt box. */
  message: { text: string[]; t: number } | null
  /** Transition timers: entering a tunnel, climbing, riding. */
  transition: { kind: 'tunnel' | 'climb' | 'ride' | 'castle' | 'secret'; t: number; to?: number } | null
  scrollElfTimer: number
  bridgeBroken: boolean
}

export interface Events {
  sfx: SfxName[]
  music: MusicName
}

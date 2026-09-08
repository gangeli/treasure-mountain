/**
 * All audio is synthesised with WebAudio: no sample files. Sound effects are short oscillator
 * envelopes in the spirit of the 1990 AdLib/PC-speaker originals, and music is a tiny step
 * sequencer playing square/triangle voices with a look-ahead scheduler.
 */
export type SfxName =
  | 'step' | 'jump' | 'land' | 'net' | 'catch' | 'miss' | 'scroll' | 'right' | 'wrong' | 'coin'
  | 'clue' | 'dig' | 'treasure' | 'nothing' | 'ladder' | 'fanfare' | 'crown' | 'click' | 'elfLaugh' | 'tick' | 'gate' | 'lose'

export type MusicName = 'title' | 'level1' | 'level2' | 'level3' | 'castle' | 'win' | 'none'

interface Note { t: number; n: number | null; d: number; v?: number }

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private musicGain: GainNode | null = null
  private sfxGain: GainNode | null = null
  soundOn = true
  musicOn = true
  private current: MusicName = 'none'
  private seqTimer = 0
  private seqPos = 0
  private seqStart = 0
  private seqLoopLen = 0
  private seqNotes: { voice: 'sq' | 'tri' | 'bass'; notes: Note[] }[] = []
  private nodes: AudioScheduledSourceNode[] = []

  get unlocked(): boolean { return !!this.ctx && this.ctx.state === 'running' }

  /** Builds the gain graph on a context. Shared by unlock() and by attach() in the audio test. */
  attach(ctx: BaseAudioContext): void {
    this.ctx = ctx as AudioContext
    this.master = ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(ctx.destination)
    this.musicGain = ctx.createGain(); this.musicGain.gain.value = this.musicOn ? 0.55 : 0; this.musicGain.connect(this.master)
    this.sfxGain = ctx.createGain(); this.sfxGain.gain.value = this.soundOn ? 1 : 0; this.sfxGain.connect(this.master)
  }

  unlock(): void {
    if (!this.ctx) {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext
        this.attach(new AC())
      } catch { return }
    }
    if (this.ctx!.state !== 'running') this.ctx!.resume().catch(() => {})
    if (this.current !== 'none' && this.seqTimer === 0) this.startSequencer()
  }

  setSound(on: boolean): void { this.soundOn = on; if (this.sfxGain) this.sfxGain.gain.value = on ? 1 : 0 }
  setMusic(on: boolean): void {
    this.musicOn = on
    if (this.musicGain && this.ctx) this.musicGain.gain.setTargetAtTime(on ? 0.55 : 0, this.ctx.currentTime, 0.05)
  }

  // ------------------------------------------------------------------ sound effects
  private tone(freq: number, dur: number, opts: { type?: OscillatorType; vol?: number; slide?: number; at?: number; attack?: number; decay?: number } = {}): void {
    if (!this.ctx || !this.sfxGain || !this.soundOn) return
    const c = this.ctx
    const t0 = c.currentTime + (opts.at || 0)
    const o = c.createOscillator()
    o.type = opts.type || 'square'
    o.frequency.setValueAtTime(freq, t0)
    if (opts.slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, opts.slide), t0 + dur)
    const g = c.createGain()
    const vol = opts.vol ?? 0.25
    const a = opts.attack ?? 0.005
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + a)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur + (opts.decay ?? 0))
    o.connect(g); g.connect(this.sfxGain)
    o.start(t0); o.stop(t0 + dur + (opts.decay ?? 0) + 0.02)
  }

  private noise(dur: number, opts: { vol?: number; at?: number; hp?: number; lp?: number } = {}): void {
    if (!this.ctx || !this.sfxGain || !this.soundOn) return
    const c = this.ctx
    const t0 = c.currentTime + (opts.at || 0)
    const len = Math.max(1, Math.floor(c.sampleRate * dur))
    const buf = c.createBuffer(1, len, c.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    const s = c.createBufferSource(); s.buffer = buf
    const g = c.createGain()
    g.gain.setValueAtTime(opts.vol ?? 0.2, t0)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    let node: AudioNode = s
    if (opts.hp) { const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = opts.hp; node.connect(f); node = f }
    if (opts.lp) { const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.lp; node.connect(f); node = f }
    node.connect(g); g.connect(this.sfxGain)
    s.start(t0); s.stop(t0 + dur + 0.02)
  }

  sfx(name: SfxName): void {
    if (!this.ctx) return
    switch (name) {
      // Softer and duller: it fires on every footstep, and at vol 0.5 through a 700-3000Hz band the
      // walk was a bright click peaking 60% above every other cue, over and over. Peak is down from
      // 0.158 to about 0.085 and the energy by a third; not so far down that the headless audio
      // check, whose floor is a 0.05 peak over 8ms, can fail on an unlucky draw of the noise.
      case 'step': this.noise(0.075, { vol: 0.34, hp: 500, lp: 2200 }); break
      case 'jump': this.tone(300, 0.15, { slide: 700, type: 'square', vol: 0.15 }); break
      case 'land': this.noise(0.09, { vol: 0.3, lp: 900 }); this.tone(150, 0.07, { type: 'triangle', vol: 0.12, slide: 90 }); break
      case 'net': this.noise(0.18, { vol: 0.15, hp: 1500 }); this.tone(900, 0.12, { slide: 300, type: 'triangle', vol: 0.12 }); break
      case 'catch':
        this.tone(523, 0.08, { vol: 0.2 }); this.tone(659, 0.08, { at: 0.08, vol: 0.2 }); this.tone(784, 0.16, { at: 0.16, vol: 0.2 }); break
      case 'miss': this.tone(220, 0.2, { slide: 110, type: 'sawtooth', vol: 0.12 }); break
      case 'elfLaugh':
        for (let i = 0; i < 4; i++) this.tone(900 + i * 60, 0.07, { at: i * 0.075, type: 'square', vol: 0.18, slide: 700 }); break
      case 'scroll': this.noise(0.28, { vol: 0.3, hp: 400, lp: 2500 }); this.tone(660, 0.1, { at: 0.22, type: 'triangle', vol: 0.2 }); break
      case 'right':
        [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, { at: i * 0.09, type: 'square', vol: 0.18 })); break
      case 'wrong': this.tone(200, 0.25, { type: 'sawtooth', vol: 0.12, slide: 150 }); this.tone(150, 0.3, { at: 0.2, type: 'sawtooth', vol: 0.12, slide: 100 }); break
      case 'coin': this.tone(1200, 0.05, { type: 'square', vol: 0.15 }); this.tone(1800, 0.18, { at: 0.05, type: 'square', vol: 0.15 }); break
      case 'clue': [784, 988, 1175].forEach((f, i) => this.tone(f, 0.15, { at: i * 0.12, type: 'triangle', vol: 0.2 })); break
      case 'dig': this.noise(0.16, { vol: 0.75, lp: 800 }); this.noise(0.16, { vol: 0.6, lp: 650, at: 0.17 }); break
      case 'nothing': this.tone(330, 0.15, { type: 'triangle', vol: 0.12, slide: 250 }); break
      case 'treasure':
        [523, 659, 784, 1047, 1319, 1568].forEach((f, i) => this.tone(f, 0.2, { at: i * 0.07, type: 'square', vol: 0.16 }))
        this.tone(2093, 0.6, { at: 0.45, type: 'triangle', vol: 0.15, decay: 0.3 }); break
      case 'ladder': this.tone(400, 0.06, { type: 'triangle', vol: 0.22 }); this.tone(500, 0.06, { at: 0.09, type: 'triangle', vol: 0.22 }); break
      case 'gate': this.noise(0.5, { vol: 0.12, lp: 500 }); this.tone(196, 0.5, { type: 'triangle', vol: 0.12, slide: 262 }); break
      case 'fanfare':
        [[392, 0], [392, 0.12], [392, 0.24], [523, 0.36], [659, 0.6], [523, 0.75], [659, 0.9]].forEach(([f, at]) => this.tone(f, 0.18, { at, vol: 0.18 }))
        this.tone(784, 0.8, { at: 1.05, vol: 0.18, decay: 0.3 }); break
      case 'crown':
        [523, 659, 784, 1047, 784, 1047, 1319, 1568, 2093].forEach((f, i) => this.tone(f, 0.16, { at: i * 0.1, type: 'triangle', vol: 0.2 }))
        this.tone(2093, 1.2, { at: 0.95, type: 'square', vol: 0.12, decay: 0.5 }); break
      case 'click': this.tone(760, 0.05, { type: 'square', vol: 0.22 }); break
      case 'tick': this.tone(1000, 0.04, { type: 'square', vol: 0.14 }); break
      case 'lose': [392, 370, 349, 330].forEach((f, i) => this.tone(f, 0.25, { at: i * 0.22, type: 'triangle', vol: 0.15 })); break
    }
  }

  // ------------------------------------------------------------------ music
  play(name: MusicName): void {
    if (name === this.current) return
    this.current = name
    this.stopSequencer()
    if (name === 'none' || !this.ctx) return
    const song = SONGS[name]
    if (!song) return
    // Prime the sequencer state; startSequencer also schedules the first window and the interval.
    this.seqNotes = song.tracks
    this.seqLoopLen = song.length
    this.seqStart = this.ctx.currentTime + 0.05
    this.seqPos = 0
    this.startSequencer()
  }

  /** Schedules every note that starts before `horizon` (an absolute context time). */
  private scheduleUntil(horizon: number): void {
    const song = SONGS[this.current]
    if (!song || !this.ctx) return
    const stepSec = 1 / (song.bpm / 60) / 4 // sixteenth notes
    while (this.seqStart + this.seqPos * stepSec < horizon) {
      const stepInLoop = this.seqPos % this.seqLoopLen
      for (const track of this.seqNotes) {
        for (const note of track.notes) {
          if (note.t === stepInLoop && note.n !== null) {
            this.voice(track.voice, note.n, this.seqStart + this.seqPos * stepSec, note.d * stepSec, note.v ?? 1)
          }
        }
      }
      this.seqPos++
    }
  }

  /** Schedules `seconds` of the current song in one go (offline rendering in the audio test). */
  renderAhead(seconds: number): void {
    if (!this.ctx) return
    this.scheduleUntil(this.ctx.currentTime + seconds)
  }

  private startSequencer(): void {
    if (!this.ctx) return
    const song = SONGS[this.current]
    if (!song) return
    this.seqNotes = song.tracks
    this.seqLoopLen = song.length
    this.seqStart = this.ctx.currentTime + 0.05
    this.seqPos = 0
    this.scheduleUntil(this.ctx.currentTime + 0.35)
    this.seqTimer = window.setInterval(() => { if (this.ctx) this.scheduleUntil(this.ctx.currentTime + 0.35) }, 120)
  }

  private stopSequencer(): void {
    if (this.seqTimer) { clearInterval(this.seqTimer); this.seqTimer = 0 }
    for (const n of this.nodes) { try { n.stop() } catch { /* already stopped */ } }
    this.nodes = []
  }

  private voice(kind: 'sq' | 'tri' | 'bass', midi: number, t: number, dur: number, vel: number): void {
    if (!this.ctx || !this.musicGain) return
    const c = this.ctx
    const freq = 440 * Math.pow(2, (midi - 69) / 12)
    const o = c.createOscillator()
    o.type = kind === 'sq' ? 'square' : 'triangle'
    o.frequency.value = freq
    const g = c.createGain()
    const vol = (kind === 'sq' ? 0.09 : kind === 'bass' ? 0.16 : 0.13) * vel
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01)
    g.gain.setValueAtTime(vol, t + Math.max(0.02, dur * 0.7))
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
    o.connect(g); g.connect(this.musicGain)
    o.start(t); o.stop(t + dur + 0.01)
    this.nodes.push(o)
    if (this.nodes.length > 64) this.nodes.splice(0, 32)
  }
}

// ---------------------------------------------------------------------------- songs
// Tiny tracker format: each track is a string of 16th-note steps separated by spaces.
// Tokens: note names like C4, E5; '-' rest; '=' sustain previous note. Octave numbers are MIDI.
function track(voice: 'sq' | 'tri' | 'bass', pattern: string, transpose = 0): { voice: 'sq' | 'tri' | 'bass'; notes: Note[] } {
  const names: Record<string, number> = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 }
  const toks = pattern.trim().split(/\s+/)
  const notes: Note[] = []
  let cur: Note | null = null
  toks.forEach((tok, i) => {
    if (tok === '-') { cur = null; return }
    if (tok === '=') { if (cur) cur.d++; return }
    const m = /^([A-G][#b]?)(\d)$/.exec(tok)
    if (!m) throw new Error('bad note ' + tok)
    const midi = 12 * (parseInt(m[2]) + 1) + names[m[1]] + transpose
    cur = { t: i, n: midi, d: 1 }
    notes.push(cur)
  })
  return { voice, notes }
}

interface Song { bpm: number; length: number; tracks: ReturnType<typeof track>[] }

const SONGS: Record<MusicName, Song | null> = {
  none: null,
  // Bright, marching title theme in C major: the "let's climb the mountain" tune.
  title: {
    bpm: 132, length: 64,
    tracks: [
      track('sq', 'C5 = E5 = G5 = E5 = C5 = E5 = G5 = A5 = G5 = = = E5 = = = F5 = A5 = C6 = A5 = F5 = A5 = C6 = D6 = C6 = = = A5 = = = ' +
                  'E5 = G5 = B5 = G5 = E5 = G5 = B5 = C6 = B5 = = = G5 = = = A5 = G5 = F5 = E5 = D5 = E5 = F5 = D5 = C5 = = = = = = ='),
      track('tri', 'E4 = = = G4 = = = E4 = = = G4 = = = C4 = = = F4 = = = A4 = = = F4 = = = ' +
                   'G4 = = = B4 = = = G4 = = = B4 = = = F4 = = = D4 = = = E4 = = = = = = ='),
      track('bass', 'C3 - - - C3 - - - G2 - - - G2 - - - F2 - - - F2 - - - C3 - - - C3 - - - ' +
                    'G2 - - - G2 - - - E2 - - - E2 - - - F2 - - - G2 - - - C3 - - - C3 - - -'),
    ],
  },
  // Level 1: gentle pastoral walk (F major, lilting).
  level1: {
    bpm: 120, length: 64,
    tracks: [
      track('sq', 'F5 = = A5 = = C6 = A5 = = F5 = = = = G5 = = Bb5 = = D6 = Bb5 = = G5 = = = = ' +
                  'A5 = = C6 = = E6 = C6 = = A5 = = = = Bb5 = A5 = G5 = F5 = E5 = F5 = = = = = =', -12),
      track('tri', 'F4 = = = A4 = = = C5 = = = A4 = = = G4 = = = Bb4 = = = D5 = = = Bb4 = = = ' +
                   'A4 = = = C5 = = = E5 = = = C5 = = = Bb4 = = = G4 = = = F4 = = = = = = =', -12),
      track('bass', 'F2 - - - - - C3 - F2 - - - - - C3 - G2 - - - - - D3 - G2 - - - - - D3 - ' +
                    'A2 - - - - - E3 - A2 - - - - - E3 - Bb2 - - - - - C3 - F2 - - - - - - -'),
    ],
  },
  // Level 2: brisker, minor-tinged climb (D minor -> F).
  level2: {
    bpm: 138, length: 64,
    tracks: [
      track('sq', 'D5 = F5 = A5 = D6 = A5 = F5 = D5 = = = C5 = E5 = G5 = C6 = G5 = E5 = C5 = = = ' +
                  'Bb4 = D5 = F5 = Bb5 = F5 = D5 = Bb4 = = = A4 = C5 = E5 = A5 = G5 = E5 = A5 = = ='),
      track('tri', 'D4 = = = A4 = = = D4 = = = A4 = = = C4 = = = G4 = = = C4 = = = G4 = = = ' +
                   'Bb3 = = = F4 = = = Bb3 = = = F4 = = = A3 = = = E4 = = = A3 = = = E4 = = ='),
      track('bass', 'D2 - D2 - - - D2 - D2 - D2 - - - D2 - C2 - C2 - - - C2 - C2 - C2 - - - C2 - ' +
                    'Bb1 - Bb1 - - - Bb1 - Bb1 - Bb1 - - - Bb1 - A1 - A1 - - - A1 - A1 - A1 - - - A1 -'),
    ],
  },
  // Level 3: airy, high mountain (G major, sparse).
  level3: {
    bpm: 126, length: 64,
    tracks: [
      track('sq', 'G5 = = = B5 = D6 = G6 = = = = = = = F#6 = = = D6 = B5 = A5 = = = = = = = ' +
                  'E6 = = = C6 = G5 = E5 = = = = = = = D6 = = = B5 = G5 = D5 = = = = = = ='),
      track('tri', 'G4 = = = = = = = D5 = = = = = = = D4 = = = = = = = A4 = = = = = = = ' +
                   'C5 = = = = = = = G4 = = = = = = = D4 = = = = = = = G4 = = = = = = ='),
      track('bass', 'G2 - - - - - - - G2 - - - - - - - D2 - - - - - - - D2 - - - - - - - ' +
                    'C2 - - - - - - - C2 - - - - - - - D2 - - - - - - - G2 - - - - - - -'),
    ],
  },
  // Castle: regal, slow (C major with a fanfare shape).
  castle: {
    bpm: 100, length: 64,
    tracks: [
      track('sq', 'C5 = = = C5 = = = G5 = = = = = = = E5 = = = E5 = = = C6 = = = = = = = ' +
                  'A5 = = = A5 = = = F5 = = = D5 = = = G5 = = = = = = = = = = = = = = ='),
      track('tri', 'E4 = = = = = = = G4 = = = = = = = G4 = = = = = = = C5 = = = = = = = ' +
                   'F4 = = = = = = = A4 = = = = = = = B4 = = = = = = = = = = = = = = ='),
      track('bass', 'C3 - - - - - - - C3 - - - - - - - C3 - - - - - - - E3 - - - - - - - ' +
                    'F2 - - - - - - - F2 - - - - - - - G2 - - - - - - - G2 - - - - - - -'),
    ],
  },
  // Victory: a short loop of the fanfare.
  win: {
    bpm: 140, length: 32,
    tracks: [
      track('sq', 'C5 = E5 = G5 = C6 = = = = = G5 = C6 = E6 = = = = = = = D6 = C6 = = = = = = ='),
      track('tri', 'C4 = = = E4 = = = G4 = = = = = = = E4 = = = G4 = = = C5 = = = = = = ='),
      track('bass', 'C3 - - - C3 - - - G2 - - - G2 - - - F2 - - - G2 - - - C3 - - - - - - -'),
    ],
  },
}

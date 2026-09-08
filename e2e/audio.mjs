// Renders every sound effect and every music track through an OfflineAudioContext in the browser
// and checks that each one actually produces audio (non-silent, not clipping, right sort of length).
// Nobody can hear a synthesiser in CI, so this is how we know the sound is not silence.
// Usage: npx tsx e2e/audio.mjs   (run `npx vite build` first)
import { serve, launch, playwright } from './lib.mjs'
// The real cue lists, imported rather than copied, so a sound added tomorrow is measured too.
import { SFX_NAMES, MUSIC_NAMES } from '../src/engine/audio.ts'

const pw = await playwright()
const { server, url } = await serve('dist')
const { browser, page } = await launch(pw, { dpr: 1 })
await page.goto(url + '?test=1')
await page.waitForFunction(() => window.__tm && window.__tm.ready)

const result = await page.evaluate(async ([SFX, MUSIC]) => {
  const { AudioEngine } = window.__tm
  if (!AudioEngine) return { error: 'AudioEngine not exposed on window.__tm' }

  // Measure a rendered buffer: peak amplitude and how much of it is audible.
  const measure = buf => {
    const d = buf.getChannelData(0)
    let peak = 0, energy = 0, loud = 0
    for (let i = 0; i < d.length; i++) {
      const a = Math.abs(d[i])
      if (a > peak) peak = a
      energy += d[i] * d[i]
      if (a > 0.005) loud++
    }
    return { peak, rms: Math.sqrt(energy / d.length), audibleMs: Math.round((loud / buf.sampleRate) * 1000) }
  }

  const sfx = {}
  for (const name of SFX) {
    const ctx = new OfflineAudioContext(1, 44100 * 3, 44100)
    const engine = new AudioEngine()
    engine.attach(ctx)                 // build the graph against the offline context
    engine.sfx(name)
    const buf = await ctx.startRendering()
    sfx[name] = measure(buf)
  }
  const music = {}
  for (const name of MUSIC) {
    const ctx = new OfflineAudioContext(1, 44100 * 4, 44100)
    const engine = new AudioEngine()
    engine.attach(ctx)
    engine.play(name)
    engine.renderAhead(4)              // schedule 4 seconds of the sequence up front
    const buf = await ctx.startRendering()
    music[name] = measure(buf)
  }
  // The worst moment the game can produce: music playing and every sound a catch can set off at
  // once. Nothing in the mix may clip, and no single cue may be loud enough to make that likely.
  const busyCtx = new OfflineAudioContext(1, 44100 * 4, 44100)
  const busy = new AudioEngine()
  busy.attach(busyCtx)
  busy.play('level2'); busy.renderAhead(4)
  for (const s of ['net', 'catch', 'coin', 'right', 'clue', 'treasure', 'fanfare', 'step', 'jump']) busy.sfx(s)
  const mix = measure(await busyCtx.startRendering())
  return { sfx, music, mix }
}, [SFX_NAMES, MUSIC_NAMES])

await browser.close()
server.close()

if (result.error) { console.error(result.error); process.exit(1) }

// Short UI ticks are meant to be brief; everything else should ring for a moment.
const SHORT = new Set(['step', 'land', 'click', 'tick', 'dig', 'ladder'])
let failures = 0
const check = (kind, name, m, minMs) => {
  const problems = []
  // Every cue must be loud enough to hear over a tablet speaker, and none may clip.
  if (m.peak < 0.05) problems.push(`too quiet (peak ${m.peak.toFixed(4)})`)
  if (m.peak > 0.95) problems.push(`clipping (peak ${m.peak.toFixed(3)})`)
  if (m.audibleMs < minMs) problems.push(`too short (${m.audibleMs}ms audible, want >= ${minMs}ms)`)
  const status = problems.length ? 'FAIL ' + problems.join('; ') : 'ok'
  if (problems.length) failures++
  console.log(`${kind.padEnd(6)} ${name.padEnd(10)} peak ${m.peak.toFixed(3)}  rms ${m.rms.toFixed(4)}  ${String(m.audibleMs).padStart(4)}ms  ${status}`)
}
for (const [name, m] of Object.entries(result.sfx)) check('sfx', name, m, SHORT.has(name) ? 8 : 20)
for (const [name, m] of Object.entries(result.music)) check('music', name, m, 1500)

// Headroom. Nine sounds at once is more than a child can trigger, so if that stays clear of full
// scale the real mix never clips - and if a voice gain is raised too far one day, this is what says
// so rather than a parent hearing it crackle.
const mix = result.mix
const mixDb = (20 * Math.log10(mix.peak)).toFixed(1)
if (mix.peak > 0.85) { console.log(`\nmix  music + 9 sounds  peak ${mix.peak.toFixed(3)} (${mixDb} dBFS)  FAIL too close to clipping`); failures++ }
else console.log(`\nmix  music + 9 sounds  peak ${mix.peak.toFixed(3)} (${mixDb} dBFS)  ok, ${(0.85 / mix.peak).toFixed(1)}x headroom`)

console.log(failures ? `\n${failures} audio problems` : '\nall sounds and music produce audio')
process.exit(failures ? 1 : 0)

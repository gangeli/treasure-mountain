// Measures whether the text of every riddle actually fits where it is drawn: the prompt above the
// answer buttons, and each answer inside its own button. The scroll shrinks type to fit, but only
// so far - below its floor the text runs out of its box, and nothing else in the project would
// notice. Samples every family x grade x tier and reports the worst cases.
// Usage: npx tsx e2e/textfit.ts [samplesPerCell]
import { Rng } from '../src/engine/rng'
import { GENERATORS } from '../src/content/generators/index'
import { TIERS, type Grade, type Tier, type Riddle } from '../src/content/types'
import { riddleChoiceRects, SCROLL } from '../src/game/ui'
import { serve, launch, playwright } from './lib.mjs'

declare const process: { argv: string[]; exit(code: number): never }

const per = parseInt(process.argv[2] || '60')

const riddles: { gen: string; grade: Grade; tier: Tier; r: Riddle }[] = []
for (const gen of GENERATORS) {
  for (const g of gen.grades) for (const t of TIERS) {
    const rng = new Rng(`fit-${gen.id}-${g}-${t}`)
    const seen = new Set<string>()
    for (let i = 0, guard = 0; i < per && guard < per * 6; guard++) {
      const r = gen.make(g, t as Tier, rng)
      if (seen.has(r.key)) continue
      seen.add(r.key); i++
      riddles.push({ gen: gen.id, grade: g, tier: t as Tier, r })
    }
  }
}

// The same geometry the riddle screen uses, so the numbers mean something.
interface Case {
  gen: string; grade: Grade; tier: Tier; prompt: string[]; hasVisual: boolean
  promptX: number; promptY: number; textW: number; ceiling: number
  choices: { text: string | null; w: number; h: number }[]
}
interface Fit { gen: string; grade: Grade; tier: Tier; size: number; rows: number; promptOver: number; widest: number; worstChoice: number; clipped: number; sample: string }

const cases: Case[] = riddles.map(({ gen, grade, tier, r }) => {
  const rects = riddleChoiceRects(r)
  return {
    gen, grade, tier,
    prompt: r.prompt,
    hasVisual: !!r.visual,
    promptX: SCROLL.x + 60,
    promptY: SCROLL.y + (r.verse ? 74 : 64),
    textW: (r.visual ? 600 : 1040) - 20,
    ceiling: Math.min(...rects.map(rc => rc.y)) - 14,
    choices: r.choices.map((c, i) => ({ text: c.text ?? null, w: rects[i].w, h: rects[i].h })),
  }
})

const pw = await playwright()
const { server, url } = await serve('dist')
const { browser, page } = await launch(pw, { dpr: 1 })
await page.goto(url + '?test&seed=1')
await page.waitForFunction(() => (window as any).__tm && (window as any).__tm.ready)

// tsx compiles this file with esbuild's keepNames on, which wraps every function in a __name()
// helper that does not exist inside the page. Defining it there is cheaper than fighting the loader.
await page.evaluate('window.__name = (f) => f')

const out: Fit[] = await page.evaluate((cases: Case[]) => {
  const FONT = '"Nunito", "Fredoka", "Trebuchet MS", "Segoe UI", Verdana, system-ui, sans-serif'
  const cv = document.createElement('canvas')
  const ctx = cv.getContext('2d')!
  const measure = (s: string, size: number, weight: number | string = 700): number => { ctx.font = `${weight} ${size}px ${FONT}`; return ctx.measureText(s).width }
  const wrap = (s: string, maxWidth: number, size: number): string[] => {
    const words = s.split(' '); const lines: string[] = []; let cur = ''
    for (const w of words) { const t = cur ? cur + ' ' + w : w; if (measure(t, size) > maxWidth && cur) { lines.push(cur); cur = w } else cur = t }
    if (cur) lines.push(cur)
    const last = lines.length - 1
    if (lines.length >= 2 && !lines[last].includes(' ') && lines[last].length <= 8) {
      const above = lines[last - 1].split(' ')
      if (above.length >= 3) { lines[last] = above.pop()! + ' ' + lines[last]; lines[last - 1] = above.join(' ') }
    }
    return lines
  }
  const SIZES = [46, 42, 38, 34, 30, 28, 26, 24]
  const res: Fit[] = []
  for (const c of cases) {
    const fits = (sz: number, rw: string[]): boolean => c.promptY - sz / 2 + rw.length * sz * 1.3 <= c.ceiling
    let size = 24, rows: string[] = []
    for (const sz of SIZES) {
      if (sz < 34) break
      const rw = c.prompt.flatMap((l: string) => wrap(l, c.textW, sz))
      if (rw.length === c.prompt.length && fits(sz, rw)) { size = sz; rows = rw; break }
    }
    if (!rows.length) for (const sz of SIZES) { size = sz; rows = c.prompt.flatMap((l: string) => wrap(l, c.textW, sz)); if (fits(sz, rows)) break }
    const bottom = c.promptY - size / 2 + rows.length * size * 1.3
    const promptOver = Math.max(0, bottom - c.ceiling)
    const widest = Math.max(0, ...rows.map((l: string) => measure(l, size) - c.textW))
    let worstChoice = 99, clipped = 0
    for (const ch of c.choices) {
      if (ch.text == null) continue
      const tx = ch.w <= 500 ? 46 : 26
      const room = ch.w - tx - 18
      let ts = ch.text.length > 18 ? 26 : 32
      while (ts > 15 && measure(ch.text, ts, 800) > room) ts -= 1
      if (measure(ch.text, ts, 800) > room) clipped++
      worstChoice = Math.min(worstChoice, ts)
    }
    res.push({ gen: c.gen, grade: c.grade, tier: c.tier, size, rows: rows.length, promptOver, widest, worstChoice, clipped, sample: c.prompt.join(' / ') })
  }
  return res
}, cases)

const over = out.filter(o => o.promptOver > 0.5 || o.widest > 0.5 || o.clipped > 0)
const tiny = out.filter(o => o.worstChoice < 20)
const small = out.filter(o => o.size <= 26)
console.log(`checked ${out.length} riddles`)
console.log(`prompt or answer text that does not fit: ${over.length}`)
const byCell: Record<string, { n: number; worst: number; sample: string }> = {}
for (const o of over) {
  const k = `${o.gen} g${o.grade}t${o.tier}`
  const worst = Math.max(o.promptOver, o.widest)
  if (!byCell[k]) byCell[k] = { n: 0, worst: 0, sample: '' }
  byCell[k].n++
  if (worst > byCell[k].worst) { byCell[k].worst = worst; byCell[k].sample = o.sample }
}
for (const [k, v] of Object.entries(byCell).sort((a, b) => b[1].worst - a[1].worst)) console.log(`  ${k}: ${v.n} over, worst ${v.worst.toFixed(0)}px - ${v.sample}`)
console.log(`answers shrunk below 20px: ${tiny.length}`)
for (const o of tiny.slice(0, 6)) console.log(`  ${o.gen} g${o.grade}t${o.tier} answer at ${o.worstChoice}px: ${o.sample}`)
console.log(`prompts at 26px or smaller: ${small.length}`)
for (const o of small.slice(0, 0)) console.log(`  ${o.gen} g${o.grade}t${o.tier} ${o.size}px x${o.rows}: ${o.sample}`)
await browser.close(); server.close()
process.exit(over.length ? 1 : 0)

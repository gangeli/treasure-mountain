// Dump samples for one family: node scripts-one.mjs <file> <exportName> [per]
import { Rng } from './src/engine/rng.ts'
const [, , file, name, perS] = process.argv
const per = parseInt(perS || '14')
const gen = (await import(file))[name]
const vis = v => v ? ` {picture: ${JSON.stringify(v)}}` : ''
for (const g of gen.grades) for (const t of [1, 2, 3]) {
  console.log(`## Grade ${g === 0 ? 'K' : g}, tier ${t}`)
  const rng = new Rng(`sample-${gen.id}-${g}-${t}`)
  const seen = new Set()
  let n = 0, guard = 0
  while (n < per && guard++ < per * 8) {
    const r = gen.make(g, t, rng)
    if (seen.has(r.key)) continue
    seen.add(r.key); n++
    console.log(`${n}. ${r.prompt.join(' / ')}${vis(r.visual)}`)
    console.log(`   choices: ${r.choices.map((c, i) => (i === r.answer ? '*' : '') + (c.text ?? 'PICTURE' + vis(c.visual))).join(' | ')}   [${r.skill}; metric ${r.metric.toFixed(1)}]`)
  }
  console.log('')
}

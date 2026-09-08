// Dumps sample riddles per family x grade x tier as markdown for human/agent review.
import { mkdirSync, writeFileSync } from 'node:fs'
import { Rng } from '../src/engine/rng.ts'
import { GENERATORS } from '../src/content/generators/index.ts'
import { TIERS } from '../src/content/types.ts'
const out = process.argv[2] || 'e2e/out/samples'
const per = parseInt(process.argv[3] || '14')
mkdirSync(out, { recursive: true })
const vis = v => v ? ` {picture: ${JSON.stringify(v)}}` : ''
for (const gen of GENERATORS) {
  const lines = [`# ${gen.name} (${gen.id}, ${gen.area})`, '', `Grades: ${gen.grades.map(g => g === 0 ? 'K' : g).join(', ')}. Each riddle: prompt lines / choices with the answer marked *; skill; metric.`, '']
  for (const g of gen.grades) for (const t of TIERS) {
    lines.push(`## Grade ${g === 0 ? 'K' : g}, tier ${t}`, '')
    const rng = new Rng(`sample-${gen.id}-${g}-${t}`)
    const seen = new Set()
    let n = 0, guard = 0
    while (n < per && guard++ < per * 6) {
      const r = gen.make(g, t, rng)
      if (seen.has(r.key)) continue
      seen.add(r.key); n++
      lines.push(`${n}. ${r.prompt.join(' / ')}${vis(r.visual)}`)
      lines.push(`   choices: ${r.choices.map((c, i) => (i === r.answer ? '*' : '') + (c.text ?? 'PICTURE' + vis(c.visual))).join(' | ')}   [${r.skill}; metric ${r.metric.toFixed(1)}]`)
    }
    lines.push('')
  }
  writeFileSync(`${out}/${gen.id}.md`, lines.join('\n'))
}
console.log('wrote', GENERATORS.length, 'sample files to', out)

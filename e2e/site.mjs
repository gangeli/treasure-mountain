// The GitHub Pages site is the page a parent lands on, most often on a phone. This loads it at a
// desktop and a phone width and checks the two things that break a static page silently: script
// errors, and content wider than the viewport (which takes the whole page sideways, not just the
// thing that overflowed - the per-grade table did exactly that).
// Usage: node e2e/site.mjs
import { serve, launch, playwright } from './lib.mjs'

const WIDTHS = [['desktop', 1280, 900], ['tablet', 820, 1180], ['phone', 390, 844], ['small phone', 320, 568]]
const pw = await playwright()
const { server, url } = await serve('docs')
const problems = []
for (const [name, width, height] of WIDTHS) {
  const { browser, page } = await launch(pw, { width, height, dpr: 1 })
  page.on('pageerror', e => problems.push(`${name}: script error ${e.message}`))
  await page.goto(url + '/index.html')
  await page.waitForTimeout(300)
  const r = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth
    const wide = []
    for (const el of document.querySelectorAll('body *')) {
      // Anything inside a box that scrolls on its own is allowed to be wider than the page.
      let p = el.parentElement, inScroller = false
      while (p && p !== document.body) { if (getComputedStyle(p).overflowX === 'auto' || getComputedStyle(p).overflowX === 'scroll') { inScroller = true; break } p = p.parentElement }
      if (inScroller) continue
      const b = el.getBoundingClientRect()
      if (b.width > 0 && (b.right > vw + 1 || b.left < -1)) wide.push(`<${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''}> ${Math.round(b.left)}..${Math.round(b.right)}`)
    }
    return { vw, scrollW: document.documentElement.scrollWidth, wide: wide.slice(0, 4), imgs: [...document.images].filter(i => !i.alt).length, links: [...document.links].map(a => a.getAttribute('href')) }
  })
  if (r.scrollW > r.vw + 1) problems.push(`${name} (${width}px): the page scrolls sideways to ${r.scrollW}px — ${r.wide.join(', ')}`)
  if (r.imgs) problems.push(`${name}: ${r.imgs} image(s) with no alt text`)
  console.log(`${name.padEnd(12)} ${width}x${height}  page ${r.scrollW}px wide, ${r.links.length} links, every image has alt text`)
  await browser.close()
}
server.close()
if (problems.length) { console.error('\n' + problems.join('\n')); process.exit(1) }
console.log('\nthe site lays out inside every width')

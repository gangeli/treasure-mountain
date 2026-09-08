// Shared helpers for the Playwright-driven tools: a static server for dist/, a Chromium page
// sized to the game's 16:9 canvas, and a way to call into the game's test hooks (window.__tm).
import { createServer } from 'node:http'
import { readFileSync, existsSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.css': 'text/css' }

export function serve(dir, port = 0) {
  return new Promise(resolve => {
    const server = createServer((req, res) => {
      let p = decodeURIComponent((req.url || '/').split('?')[0])
      if (p.endsWith('/')) p += 'index.html'
      const file = join(dir, p)
      if (!existsSync(file) || statSync(file).isDirectory()) { res.writeHead(404); res.end('nope'); return }
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' })
      res.end(readFileSync(file))
    })
    server.listen(port, '127.0.0.1', () => resolve({ server, url: `http://127.0.0.1:${server.address().port}/` }))
  })
}

export async function launch(playwright, { width = 1280, height = 720, dpr = 1 } = {}) {
  const browser = await playwright.chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr, hasTouch: true })
  const page = await context.newPage()
  page.on('pageerror', e => { console.error('PAGE ERROR:', e.message); process.exitCode = 1 })
  page.on('console', m => { if (m.type() === 'error') console.error('CONSOLE ERROR:', m.text()) })
  return { browser, context, page }
}

export function playwright() {
  // Playwright is a devDependency, but fall back to the globally installed copy (NODE_PATH).
  return import('playwright')
}

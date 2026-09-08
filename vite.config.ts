import { defineConfig, type Plugin } from 'vite'
import { readFileSync, writeFileSync, readdirSync, statSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'

// Inlines the single IIFE bundle and the CSS into index.html so the game is one self-contained
// HTML file. This is what lets the Android WebView load it from file:// (module scripts are
// blocked there by CORS) and keeps the web build tiny: index.html + manifest + icons + sw.js.
function singleFile(): Plugin {
  return {
    name: 'tm-single-file',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      const html = bundle['index.html']
      if (!html || html.type !== 'asset') return
      let src = String(html.source)
      for (const [name, chunk] of Object.entries(bundle)) {
        if (chunk.type === 'chunk' && name.endsWith('.js')) {
          const re = new RegExp(`<script[^>]*src="[./]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*></script>`)
          // Drop the head script tag and append the code at the end of <body> so the DOM exists when it runs.
          src = src.replace(re, '')
          src = src.replace('</body>', () => `<script>${chunk.code.replace(/<\/script/gi, '<\\/script')}</script>\n</body>`)
          delete bundle[name]
        } else if (chunk.type === 'asset' && name.endsWith('.css')) {
          const re = new RegExp(`<link[^>]*href="[./]*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`)
          src = src.replace(re, () => `<style>${String(chunk.source)}</style>`)
          delete bundle[name]
        }
      }
      src = src.replace(/<link rel="modulepreload"[^>]*>/g, '')
      html.source = src
    },
  }
}

// Writes sw.js after the build with a precache list of everything in dist/ and a version hash
// derived from the contents, so every deploy invalidates the old cache exactly once.
function serviceWorker(): Plugin {
  let outDir = 'dist'
  return {
    name: 'tm-service-worker',
    configResolved(c) { outDir = c.build.outDir },
    closeBundle() {
      const files: string[] = []
      const walk = (dir: string, prefix: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f)
          if (statSync(p).isDirectory()) walk(p, prefix + f + '/')
          else if (f !== 'sw.js') files.push(prefix + f)
        }
      }
      walk(outDir, '')
      let hash = 0
      for (const f of files.sort()) {
        const data = readFileSync(join(outDir, f))
        for (let i = 0; i < data.length; i++) hash = (hash * 31 + data[i]) | 0
      }
      const version = 'tm-' + (hash >>> 0).toString(36)
      const sw = `// Treasure Mountain service worker (generated at build time)
const VERSION = '${version}';
const FILES = ${JSON.stringify(files.map(f => './' + f))};
self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(hit => hit || fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match('./index.html'))));
});
`
      writeFileSync(join(outDir, 'sw.js'), sw)
      const vf = join(outDir, '.vite')
      if (existsSync(vf)) rmSync(vf, { recursive: true, force: true })
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [singleFile(), serviceWorker()],
  build: {
    target: 'es2020',
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: 100000,
    rollupOptions: {
      output: { format: 'iife', inlineDynamicImports: true, entryFileNames: 'game.js', assetFileNames: '[name][extname]' },
    },
    minify: 'esbuild',
    reportCompressedSize: true,
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
} as any)

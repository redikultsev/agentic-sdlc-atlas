// Render the first slide of a built deck to a 1280x720 PNG (the social preview and the catalog card).
// Usage: node tools/cover.mjs <built deck dir> <out.png> [slide number, default 1]. Uses the installed Chrome.
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, resolve } from 'node:path'

const [dir, out] = process.argv.slice(2, 4).map(p => resolve(p))
const slideNo = process.argv[4] || "1"
const base = '/' + dir.split('/').pop() + '/'
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' }

const server = createServer(async (req, res) => {
  let path = decodeURIComponent(req.url.split('?')[0])
  if (!path.startsWith(base)) { res.writeHead(404).end(); return }
  path = path.slice(base.length) || 'index.html'
  try {
    const body = await readFile(join(dir, path))
    res.writeHead(200, { 'content-type': types[extname(path)] || 'application/octet-stream' }).end(body)
  } catch {
    res.writeHead(200, { 'content-type': 'text/html' }).end(await readFile(join(dir, 'index.html')))
  }
}).listen(0, '127.0.0.1')
await new Promise(r => server.once('listening', r))
const port = server.address().port

const browser = await chromium.launch({ channel: 'chrome' })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto(`http://127.0.0.1:${port}${base}${slideNo}?embedded=true`, { waitUntil: 'networkidle' })
await page.waitForTimeout(4000)
const slide = await page.$('#slide-content') ?? page
await slide.screenshot({ path: out })
await browser.close()
server.close()
console.log('cover:', out)

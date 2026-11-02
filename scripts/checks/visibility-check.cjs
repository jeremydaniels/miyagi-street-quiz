// Hiding rules for subjects, departments and General. Serves a build itself (port 4190).
// Usage: node visibility-check.cjs <build folder> <B|C>. See README.md for the two builds.
//   B: real files without government.json and general.json -> Art and General hidden
//   C: only a not-ready physics.json -> nothing ready, message shown
const { chromium } = require('playwright')
const http = require('http'), fs = require('fs'), path = require('path')
const [dir, variant] = process.argv.slice(2)
const PORT = 4190, URL = `http://localhost:${PORT}/`
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + `[${variant}] ` + m); if (!c) fails++ }
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
const server = http.createServer((req, res) => {
  let f = path.join(dir, decodeURIComponent(req.url.split('?')[0]))
  if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(dir, 'index.html')
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' })
  fs.createReadStream(f).pipe(res)
})
;(async () => {
  await new Promise((r) => server.listen(PORT, r))
  const b = await chromium.launch()
  for (const size of [{ name: 'android-412x915', width: 412, height: 915 }, { name: 'iphone-se-375x667', width: 375, height: 667 }]) {
    const p = await b.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    const errs = []; p.on('pageerror', (e) => errs.push(e.message))
    const btn = (n) => p.getByRole('button', { name: n, exact: true })
    await p.goto(URL)
    const startButtons = (await p.locator('.actions button').allTextContents()).map((t) => t.trim())
    if (variant === 'B') {
      ok(JSON.stringify(startButtons) === '["By department"]', `${size.name}: General hidden (${startButtons})`)
      await btn('By department').click()
      const depts = (await p.locator('.actions button').allTextContents()).map((t) => t.trim())
      ok(JSON.stringify(depts) === '["Science","Commercial"]', `${size.name}: Art hidden, no ready subjects (${depts})`)
    } else {
      ok(startButtons.length === 0, `${size.name}: no By department / General buttons (${startButtons})`)
      ok(await p.getByText('There are no questions yet.').isVisible(), `${size.name}: plain message shown`)
      ok(await btn('Menu').isVisible(), `${size.name}: Menu still available`)
      ok(!/route|shoot/i.test(await p.evaluate(() => document.body.innerText)), `${size.name}: no "route"/"shoot" in text`)
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${size.name}: no sideways overflow`)
      fs.mkdirSync(path.join(__dirname, 'output', 'shots'), { recursive: true })
      await p.screenshot({ path: path.join(__dirname, 'output', 'shots', `${size.name}-19-nothing-ready.png`) })
    }
    ok(errs.length === 0, `${size.name}: no page errors ${errs.join('; ')}`)
    await p.close()
  }
  await b.close(); server.close()
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
  process.exit(fails ? 1 : 0)
})()

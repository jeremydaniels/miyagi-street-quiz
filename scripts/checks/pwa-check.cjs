// Installability, offline use, background updates and Reset questions applying an update.
// Serves two builds itself (port 4180): node pwa-check.cjs <v1 build folder> <v2 build folder>. See README.md.
const { chromium } = require('playwright')
const http = require('http'), fs = require('fs'), path = require('path')
const [V1, V2] = process.argv.slice(2).map((d) => path.resolve(d || ''))
if (!process.argv[3]) { console.error('Usage: node pwa-check.cjs <v1 build folder> <v2 build folder>'); process.exit(2) }
const PORT = 4180, URL = `http://localhost:${PORT}/`
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + m); if (!c) fails++ }

// Tiny static server, like Vercel: no-cache, SPA fallback. Root can be switched (= a deploy).
let root = V1, server = null
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' }
function start() {
  return new Promise((r) => {
    server = http.createServer((req, res) => {
      let f = path.join(root, decodeURIComponent(req.url.split('?')[0]))
      if (!fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html')
      res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream', 'cache-control': 'public, max-age=0, must-revalidate' })
      fs.createReadStream(f).pipe(res)
    }).listen(PORT, r)
  })
}
const stop = () => new Promise((r) => { server.closeAllConnections(); server.close(r) })

;(async () => {
  const b = await chromium.launch()
  await start()

  const helpers = (p) => {
    const btn = (n) => p.getByRole('button', { name: n, exact: true })
    const btnStart = (n) => p.getByRole('button', { name: new RegExp('^' + n) })
        const meta = () => p.locator('.meta').first().textContent()
    const answerAll = async () => { for (let i = 0; i < 3; i++) await btn('Got it').click() }
    const onStart = async () => (await p.locator('h1').textContent()) === 'What kind of questions?'
    return { btn, btnStart, meta, answerAll, onStart }
  }
  const swReady = (p) => p.evaluate(async () => { await navigator.serviceWorker.ready; return !!navigator.serviceWorker.controller })
  const waitWaiting = (p) => p.waitForFunction(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting, null, { timeout: 20000, polling: 200 })
  const bundle = (p) => p.evaluate(() => document.querySelector('script[type=module]').getAttribute('src'))
  const v1Bundle = '/assets/' + fs.readFileSync(path.join(V1, 'index.html'), 'utf8').match(/index-[^"]+\.js/)[0]
  const v2Bundle = '/assets/' + fs.readFileSync(path.join(V2, 'index.html'), 'utf8').match(/index-[^"]+\.js/)[0]

  console.log('-- A. installable (Chrome checks)')
  {
    const ctx = await b.newContext(); const p = await ctx.newPage()
    await p.goto(URL); await swReady(p)
    const cdp = await ctx.newCDPSession(p)
    const m = await cdp.send('Page.getAppManifest')
    ok(m.errors.length === 0, 'manifest parses with no errors ' + JSON.stringify(m.errors))
    const inst = await cdp.send('Page.getInstallabilityErrors')
    ok(inst.installabilityErrors.length === 0, 'no installability errors ' + JSON.stringify(inst.installabilityErrors))
    const head = await p.evaluate(() => ({
      apple: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href'),
      capable: document.querySelector('meta[name=apple-mobile-web-app-capable]')?.content,
      title: document.querySelector('meta[name=apple-mobile-web-app-title]')?.content,
    }))
    const iconRes = await p.request.get(URL + 'icons/apple-touch-icon.png')
    ok(head.apple === '/icons/apple-touch-icon.png' && iconRes.ok() && head.capable === 'yes' && head.title === 'Street Quiz', 'iOS tags + apple-touch-icon served')
    await ctx.close()
  }

  console.log('-- B. offline: load once, server off + network off, reload, both routes')
  {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage()
    const { btn, btnStart, meta, answerAll, onStart } = helpers(p)
    await p.goto(URL); await swReady(p)
    await stop(); await ctx.setOffline(true)
    const failed = []; p.on('requestfailed', (r) => failed.push(r.url()))
    const notFromSW = []; p.on('response', (r) => { if (!r.fromServiceWorker()) notFromSW.push(r.url()) })
    await p.reload()
    ok((await p.title()) === 'Miyagi Street Quiz' && (await btn('By department').isVisible()), 'app loads offline')
    await btn('By department').click(); await btn('Commercial').click(); await btnStart('Commerce').click()
    ok((await meta()).includes('Commerce'), 'Commerce quiz offline')
    await answerAll(); ok((await p.locator('.score').textContent()) === '3/3', 'Commerce score offline')
    await btn('Next person').click()
    await btn('General').click(); await answerAll(); ok((await p.locator('.score').textContent()) === '3/3', 'General score offline')
    await btn('Next person').click()
    ok(await onStart(), 'back at start after two offline quizzes')
    ok(failed.length === 0, 'no failed requests ' + failed.join(', '))
    ok(notFromSW.length === 0, 'every response came from the service worker ' + notFromSW.join(', '))
    await ctx.close(); await start()
  }

  console.log('-- C. update downloads in background, no reload, applies on fresh open')
  {
    root = V1
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); let p = await ctx.newPage()
    let { btn, meta, answerAll } = helpers(p)
    await p.goto(URL); await swReady(p); await p.reload()   // a returning user: page controlled by v1
    let navs = 0; p.on('framenavigated', (f) => { if (f === p.mainFrame()) navs++ })
    await p.evaluate(() => { window.__noReload = true })
    await btn('General').click(); await btn('Got it').click()
    ok((await meta()).startsWith('Medium'), 'mid-quiz on Medium (v1)')
    root = V2   // deploy
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))  // app comes back to screen
    await waitWaiting(p)
    ok(true, 'new version downloaded and waiting')
    await p.waitForTimeout(1500)
    ok(await p.evaluate(() => window.__noReload === true) && navs === 0, 'no reload happened')
    ok((await meta()).startsWith('Medium') && (await bundle(p)) === v1Bundle, 'still mid-quiz on v1')
    await btn('Got it').click(); await btn('Got it').click()
    await btn('Next person').click()
    ok(await p.evaluate(() => window.__noReload === true) && navs === 0, 'finished quiz with no reload')
    await p.close()   // app fully closed
    p = await ctx.newPage(); ({ btn } = helpers(p))
    await p.goto(URL)
    ok((await bundle(p)) === v2Bundle, 'fresh open runs v2')
    let seen = false
    await btn('General').click()
    for (let i = 0; i < 8 && !seen; i++) {
      seen = (await p.locator('.question').textContent()).startsWith('UPDATED:')
      if (!seen) await btn('Swap question').click()
    }
    ok(seen, 'changed question appears after reopening')
    await ctx.close()
  }

  console.log('-- D. Reset questions: no update waiting -> no reload; update waiting -> applies it')
  {
    root = V1
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 } }); const p = await ctx.newPage()
    const { btn, answerAll, onStart } = helpers(p)
    const decks = () => p.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('miyagi-street-quiz')).decks).length)
    await p.goto(URL); await swReady(p); await p.reload()
    await btn('General').click(); await answerAll(); await btn('Next person').click()
    ok((await decks()) === 3, 'three decks in use before Reset questions')
    await p.evaluate(() => { window.__noReload = true })
    let navs = 0; p.on('framenavigated', (f) => { if (f === p.mainFrame()) navs++ })
    await btn('Menu').click(); p.once('dialog', (d) => d.accept()); await btn('Reset questions').click()
    await p.waitForTimeout(1500)
    ok((await decks()) === 0 && navs === 0 && (await p.evaluate(() => window.__noReload === true)), 'no update waiting: decks reset, no reload')
    await btn('General').click(); await answerAll(); await btn('Next person').click()
    ok((await decks()) === 3, 'decks in use again')
    root = V2
    await p.evaluate(() => document.dispatchEvent(new Event('visibilitychange')))
    await waitWaiting(p)
    ok((await bundle(p)) === v1Bundle && navs === 0, 'update waiting, still v1, no reload')
    await btn('Menu').click(); p.once('dialog', (d) => d.accept())
    await Promise.all([p.waitForEvent('load', { timeout: 15000 }), btn('Reset questions').click()])
    await p.getByRole('button', { name: 'By department', exact: true }).waitFor()
    ok((await p.evaluate(() => window.__noReload)) === undefined, 'page reloaded once after Reset questions')
    ok((await bundle(p)) === v2Bundle, 'now running v2')
    ok(await onStart(), 'on the start screen after reload')
    ok((await decks()) === 0, 'saved decks were reset before reload')
    await ctx.close()
  }

  await stop(); await b.close()
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
  process.exit(fails ? 1 : 0)
})()

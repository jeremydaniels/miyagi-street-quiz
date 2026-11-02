// Hiding rules for subjects, departments and General. Uses builds from test-build.cjs (made in a
// temporary copy of the repo, so data/questions/ is never touched). Serves the build itself (port 4190).
// Usage: node scripts/checks/visibility-check.cjs <build folder> <B|C>
//   B: "some-missing" build (only biology.json and commerce.json) -> Art and General hidden
//   C: "nothing-ready" build (only the incomplete Test Partial subject) -> message shown
const { chromium } = require('playwright')
const fs = require('fs'), path = require('path')
const { serve, stopServer, requireBuildDir } = require('./lib.cjs')
const variant = process.argv[3]
const usage = 'Usage: node scripts/checks/visibility-check.cjs <build folder> <B|C>'
const DIR = requireBuildDir(process.argv[2], usage)
if (!['B', 'C'].includes(variant)) { console.error(usage); process.exit(2) }
const PORT = 4190, URL = `http://localhost:${PORT}/`
const SHOTS = path.join(__dirname, 'output', 'shots')
let fails = 0
const ok = (c, m) => { console.log((c ? 'PASS ' : 'FAIL ') + `[${variant}] ` + m); if (!c) fails++ }

;(async () => {
  const server = await serve(DIR, PORT)
  const b = await chromium.launch()
  for (const size of [{ name: 'android-412x915', width: 412, height: 915 }, { name: 'iphone-se-375x667', width: 375, height: 667 }]) {
    const p = await b.newPage({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    const errs = []; p.on('pageerror', (e) => errs.push(e.message))
    const btn = (n) => p.getByRole('button', { name: n, exact: true })
    const buttons = async () => (await p.locator('.buttons button').allTextContents()).map((t) => t.trim())
    await p.goto(URL)
    const startButtons = await buttons()
    if (variant === 'B') {
      ok(JSON.stringify(startButtons) === '["By department"]', `${size.name}: General hidden (${startButtons})`)
      await btn('By department').click()
      const depts = await buttons()
      ok(JSON.stringify(depts) === '["Science","Commercial"]', `${size.name}: Art hidden, it has no ready subjects (${depts})`)
      await btn('Science').click()
      ok(JSON.stringify(await buttons()) === '["Biology"]', `${size.name}: Science shows only Biology`)
      await btn('← Back').click(); await btn('Commercial').click()
      ok(JSON.stringify(await buttons()) === '["Commerce"]', `${size.name}: Commercial shows only Commerce`)
    } else {
      ok(startButtons.length === 0, `${size.name}: no By department / General buttons (${startButtons})`)
      ok(await p.getByText('There are no questions yet.').isVisible(), `${size.name}: plain message shown`)
      ok(await btn('Menu').isVisible(), `${size.name}: Menu still available`)
      ok(!/route|shoot/i.test(await p.evaluate(() => document.body.innerText)), `${size.name}: no "route"/"shoot" in text`)
      ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${size.name}: no sideways overflow`)
      fs.mkdirSync(SHOTS, { recursive: true })
      await p.screenshot({ path: path.join(SHOTS, `${size.name}-19-nothing-ready.png`) })
    }
    ok(errs.length === 0, `${size.name}: no page errors ${errs.join('; ')}`)
    await p.close()
  }
  await b.close(); await stopServer(server)
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
  process.exit(fails ? 1 : 0)
})()

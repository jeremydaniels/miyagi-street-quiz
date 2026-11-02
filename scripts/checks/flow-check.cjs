// Walks the whole flow on the real question files. Needs `npm run preview` on port 4173.
// See README.md.
const { chromium } = require('playwright')
const URL = 'http://localhost:4173'
let fails = 0
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++ }

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  const btn = (name) => p.getByRole('button', { name, exact: true })
  const meta = () => p.locator('.meta').first().textContent()
  const question = () => p.locator('.question').textContent()
  const answers = () => p.locator('.answer li').allTextContents()
  const bannedText = async (where) => {
    const t = await p.evaluate(() => document.body.innerText)
    ok(!/route|shoot/i.test(t), `${where}: no "route"/"shoot" in text`)
  }
  const onStart = async () => (await p.locator('h1').textContent()) === 'What kind of questions?'
  await p.goto(URL)

  ok(await onStart(), 'start heading "What kind of questions?"')
  ok(await btn('By department').isVisible() && await btn('General').isVisible(), 'By department + General buttons')
  ok((await p.getByText(/people|count/i).count()) === 0, 'no person count shown')
  await bannedText('start')
  const heights = await p.$$eval('button', (bs) => bs.map((b) => b.getBoundingClientRect().height))
  ok(heights.every((h) => h >= 56), `start buttons >= 56px (${heights.join(',')})`)

  await btn('By department').click()
  ok(await btn('Science').isVisible() && await btn('Commercial').isVisible() && await btn('Art').isVisible(), 'all three departments shown (each has a ready subject)')
  await bannedText('department')
  await btn('← Back').click()
  ok(await onStart(), 'department back -> start')

  await btn('By department').click()
  const expected = { Science: ['Biology'], Commercial: ['Commerce'], Art: ['Government'] }
  for (const [d, subs] of Object.entries(expected)) {
    await btn(d).click()
    const shown = (await p.locator('.actions button').allTextContents()).map((t) => t.trim())
    ok(JSON.stringify(shown) === JSON.stringify(subs), `${d}: only ready subjects shown (${shown})`)
    ok((await p.locator('button:disabled').count()) === 0 && (await p.getByText(/questions yet/i).count()) === 0, `${d}: no disabled subjects, no "questions yet" labels`)
    await bannedText(`${d} subject`)
    await btn('← Back').click()
  }
  ok(await btn('Commercial').isVisible(), 'subject back -> department')

  await btn('Commercial').click(); await btn('Commerce').click()
  ok((await meta()) === 'Easy · 1 of 3 · Commerce', 'easy header: ' + (await meta()))
  ok((await btn('Show answer').count()) === 0, 'no Show answer button')
  ok(await p.locator('.answer').isVisible() && (await answers()).length > 0, 'answer section shown straight away')
  ok(await btn('Swap question').isEnabled(), 'Swap available alongside answers')
  const swapBox = await btn('Swap question').boundingBox(), qBox = await p.locator('.question').boundingBox(), aBox = await p.locator('.answer').boundingBox()
  ok(swapBox.y > qBox.y + qBox.height - 1 && swapBox.y + swapBox.height <= aBox.y + 1, 'Swap sits between the question and the answers')
  ok(await btn('← Back').isVisible(), 'back visible on unmarked easy')
  await btn('← Back').click()
  ok(await btn('Commerce').isVisible(), 'easy back -> subject')
  await btn('Commerce').click()

  const q1 = await question(), a1 = await answers()
  await btn('Swap question').click()
  const q2 = await question(), a2 = await answers()
  ok(q1 !== q2 && a1.join() !== a2.join(), `swap changes question and answers ("${q1}" -> "${q2}")`)
  ok(!(await p.getByText('Any one of these').isVisible()), 'no "Any one" label for single answer')
  await bannedText('question')
  await btn('Got it').click()

  ok((await meta()) === 'Medium · 2 of 3 · Commerce', 'medium header')
  ok((await btn('← Back').count()) === 0, 'no back after marking')
  ok(await btn('Swap question').isEnabled(), 'swap still available on next question')
  if (!(await question()).includes('three types of occupation')) await btn('Swap question').click()
  ok(await p.getByText('All of these').isVisible(), '"All of these" for match all')
  await btn('Missed it').click()

  ok((await meta()) === 'Hard · 3 of 3 · Commerce', 'hard header')
  ok(await p.getByText('Any one of these').isVisible(), '"Any one of these" for mention-one')
  await btn('Got it').click()

  ok((await p.locator('.score').textContent()) === '2/3', 'score 2/3')
  const recap = await p.locator('.recap li').allTextContents()
  ok(recap.length === 3 && recap[0].startsWith('✓') && recap[1].startsWith('✗') && recap[2].startsWith('✓'), 'recap ✓✗✓')
  ok((await btn('← Back').count()) === 0 && (await btn('End quiz').count()) === 0, 'no back/end on score')
  await bannedText('score')
  await btn('Next person').click()
  ok(await onStart(), 'Next person -> start screen')

  await btn('General').click()
  ok((await meta()).startsWith('Easy · 1 of 3 · General'), 'general starts at easy')
  await btn('← Back').click()
  ok(await onStart(), 'general easy back -> start')

  await btn('General').click()
  await btn('Got it').click()
  let dialogMsg = ''
  p.once('dialog', (d) => { dialogMsg = d.message(); d.dismiss() })
  await btn('End quiz').click()
  ok(dialogMsg === 'End this quiz?', 'end quiz confirm text: ' + dialogMsg)
  ok((await meta()).startsWith('Medium'), 'cancel keeps quiz going')
  const endBox = await btn('End quiz').boundingBox()
  const markBox = await btn('Missed it').boundingBox()
  ok(endBox.y + endBox.height < 120 && endBox.x > 200 && markBox.y - (endBox.y + endBox.height) >= 300, `end quiz in top-right corner, far from main buttons (${Math.round(markBox.y - endBox.y - endBox.height)}px gap)`)
  p.once('dialog', (d) => d.accept())
  await btn('End quiz').click()
  ok(await onStart(), 'confirm end -> start screen')

  let sawNote = false
  for (let i = 0; i < 20 && !sawNote; i++) {
    await btn('General').click()
    await btn('Got it').click()
    sawNote = (await p.locator('.note').count()) > 0
    p.once('dialog', (d) => d.accept())
    await btn('End quiz').click()
  }
  ok(sawNote, 'note shown when present')

  ok(errs.length === 0, 'no page errors ' + errs.join('; '))
  await b.close()
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
  process.exit(fails ? 1 : 0)
})()

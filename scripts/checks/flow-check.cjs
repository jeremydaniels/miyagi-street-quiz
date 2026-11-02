// Walks the whole flow on the real question bank. Needs the real build on `npm run preview` (port 4173).
// Only reads data/questions/. See README.md.
const { chromium } = require('playwright')
const { readQuestions, openQuestion, deckStartingWith } = require('./lib.cjs')
const URL = 'http://localhost:4173'
const all = readQuestions()
const byId = (id) => all.find((q) => q.id === id)
let fails = 0
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++ }

// Every subject is ready, so every department shows its full list.
const EXPECTED_SUBJECTS = {
  Science: ['Physics', 'Chemistry', 'Biology', 'Mathematics', 'Agric', 'English'],
  Commercial: ['Commerce', 'Accounting', 'Economics', 'Mathematics', 'English'],
  Art: ['Government', 'Literature', 'CRS', 'IRS', 'History', 'English'],
}

;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 390, height: 844 } })
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  const btn = (name) => p.getByRole('button', { name, exact: true })
  const meta = () => p.locator('.meta').first().textContent()
  const question = () => p.locator('.question').textContent()
  const label = () => p.locator('.answer-label').textContent()
  const segments = () => p.$$eval('.progress-bar span', (s) => s.map((e) => e.className).join())
  const bannedText = async (where) => {
    const t = await p.evaluate(() => document.body.innerText)
    ok(!/route|shoot/i.test(t), `${where}: no "route"/"shoot" in text`)
  }
  const onStart = async () => (await p.locator('h1').textContent()) === 'What kind of questions?'
  await p.goto(URL)
  await p.evaluate(() => localStorage.clear()); await p.reload()

  // Start screen
  ok(await onStart(), 'start heading "What kind of questions?"')
  ok(await btn('By department').isVisible() && await btn('General').isVisible(), 'By department + General buttons')
  ok(await p.locator('.topbar .brand img.logo').isVisible() && (await p.locator('.topbar .brand').textContent()) === 'Street Quiz', 'top bar: logo + "Street Quiz"')
  const heights = await p.$$eval('button', (bs) => bs.map((b) => [b.classList.contains('pill'), b.getBoundingClientRect().height]))
  ok(heights.every(([pill, h]) => h >= (pill ? 44 : 56)), `buttons >= 56px, top-bar pills >= 44px (${heights.map(([, h]) => h).join(',')})`)
  await bannedText('start')

  // Departments and subjects
  await btn('By department').click()
  ok((await p.locator('h1').textContent()) === 'Which department?' && await p.locator('.topbar img.logo').isVisible(), 'department heading and logo')
  const depts = (await p.locator('.buttons button').allTextContents()).map((t) => t.trim())
  ok(JSON.stringify(depts) === '["Science","Commercial","Art"]', `all three departments shown (${depts})`)
  await bannedText('department')
  await btn('← Back').click()
  ok(await onStart(), 'department back -> start')

  await btn('By department').click()
  for (const [d, subs] of Object.entries(EXPECTED_SUBJECTS)) {
    await btn(d).click()
    ok((await p.locator('.kicker').textContent()) === d && (await p.locator('h1').textContent()) === 'Best subject?', `${d}: "${d}" above "Best subject?"`)
    const shown = (await p.locator('.buttons button').allTextContents()).map((t) => t.trim())
    ok(JSON.stringify(shown) === JSON.stringify(subs), `${d}: all subjects shown in order (${shown})`)
    ok((await p.locator('button:disabled').count()) === 0 && (await p.getByText(/questions yet/i).count()) === 0, `${d}: no disabled subjects, no "questions yet" labels`)
    await bannedText(`${d} subject`)
    await btn('← Back').click()
  }
  ok(await btn('Commercial').isVisible(), 'subject back -> department')

  // A Commerce quiz with known questions: com-e-001 (one answer), com-m-001 (all), com-h-002 (any one, with note)
  const extra = {
    'commerce:medium': deckStartingWith(all, 'commerce', 'medium', ['com-m-001']),
    'commerce:hard': deckStartingWith(all, 'commerce', 'hard', ['com-h-002']),
  }
  await openQuestion(p, all, byId('com-e-001'), extra)
  ok((await meta()) === 'Easy · 1 of 3 · Commerce', 'easy header: ' + (await meta()))
  ok((await segments()) === 'done,,', 'progress bar: one done, two upcoming')
  ok((await btn('Show answer').count()) === 0, 'no Show answer button')
  ok((await question()) === byId('com-e-001').q && (await label()) === 'Answer', 'single answer shown straight away, labelled "Answer"')
  ok(await btn('Swap question').isEnabled(), 'Swap available alongside answers')
  const swapBox = await btn('Swap question').boundingBox(), qBox = await p.locator('.question').boundingBox(), aBox = await p.locator('.answer').boundingBox()
  ok(swapBox.y > qBox.y + qBox.height - 1 && swapBox.y + swapBox.height <= aBox.y + 1, 'Swap sits between the question and the answers')
  ok(await btn('← Back').isVisible(), 'back visible on unmarked easy')
  await btn('← Back').click()
  ok(await btn('Commerce').isVisible(), 'easy back -> subject')
  await btn('Commerce').click()
  ok((await question()) === byId('com-e-002').q, 'next card after going back is com-e-002')
  await btn('Swap question').click()
  ok((await question()) === byId('com-e-003').q && (await p.locator('.answer li').allTextContents()).join() === byId('com-e-003').answers.join(), 'swap shows the next card and its answers')
  await bannedText('question')
  await btn('Got it').click()

  ok((await meta()) === 'Medium · 2 of 3 · Commerce', 'medium header')
  ok((await segments()) === 'done,done,', 'progress bar: two done, one upcoming')
  ok((await btn('← Back').count()) === 0, 'no back after marking')
  ok(await btn('Swap question').isEnabled(), 'swap still available on next question')
  ok((await label()) === 'Answer · all of these', '"Answer · all of these" for match all')
  await btn('Missed it').click()

  ok((await meta()) === 'Hard · 3 of 3 · Commerce', 'hard header')
  ok((await label()) === 'Answer · any one of these', '"Answer · any one of these" for mention-one')
  ok((await p.locator('.note').textContent()) === byId('com-h-002').note, 'note shown when present')
  ok((await segments()) === 'done,done,done', 'progress bar: all three done')
  await btn('Got it').click()

  ok((await p.locator('.score').textContent()) === '2/3', 'score 2/3')
  ok((await p.locator('.score-subject').textContent()) === 'Commerce' && await p.locator('.score-block img.logo-large').isVisible(), 'score: logo and subject name')
  const recap = await p.locator('.recap li').allTextContents()
  ok(recap.length === 3 && recap[0].startsWith('✓') && recap[1].startsWith('✗') && recap[2].startsWith('✓'), 'recap ✓✗✓')
  ok((await btn('← Back').count()) === 0 && (await btn('End quiz').count()) === 0, 'no back/end on score')
  await bannedText('score')
  await btn('Next person').click()
  ok(await onStart(), 'Next person -> start screen')

  // General: Back, then End quiz
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

  ok(errs.length === 0, 'no page errors ' + errs.join('; '))
  await b.close()
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
  process.exit(fails ? 1 : 0)
})()

// Deck logic, saved data and Reset questions. Uses the "test-subjects" build from test-build.cjs, which
// adds three made-up Science subjects (Test Deck, Test Single, Test Partial) in a temporary copy of the
// repo. Serves that build itself on port 4191; never touches data/questions/.
// Usage: node scripts/checks/deck-check.cjs <test-subjects build folder>
const { chromium } = require('playwright')
const { KEY, readQuestions, serve, stopServer, requireBuildDir, levelPlan } = require('./lib.cjs')
const DIR = requireBuildDir(process.argv[2], 'Usage: node scripts/checks/deck-check.cjs <test-subjects build folder>\nBuild it with: node scripts/checks/test-build.cjs test-subjects <folder>')
const PORT = 4191, URL = `http://localhost:${PORT}/`
let fails = 0
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++ }
const TDK_E = ['tdk-e-001', 'tdk-e-002', 'tdk-e-003', 'tdk-e-004']
const TDK_M = ['tdk-m-001', 'tdk-m-002', 'tdk-m-003', 'tdk-m-004']
const GEN_E = readQuestions().filter((q) => q.subject === 'general' && q.level === 'easy').map((q) => q.id)
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

;(async () => {
  const server = await serve(DIR, PORT)
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  const btn = (name) => p.getByRole('button', { name, exact: true })
  const meta = () => p.locator('.meta').first().textContent()
  const st = async () => JSON.parse(await p.evaluate((k) => localStorage.getItem(k), KEY))
  const lastOf = async (key) => (await st()).decks[key].last
  const setSaved = async (val) => { await p.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, typeof val === 'string' ? val : JSON.stringify(val)]); await p.reload() }
  const endQuiz = async () => { p.once('dialog', (d) => d.accept()); await btn('End quiz').click() }
  const toSubject = async (subj, count = 3) => { await btn('By department').click(); await btn('Science').click(); await btn(subj).click(); await btn(String(count)).click() }

  await p.goto(URL)
  await p.evaluate(() => localStorage.clear()); await p.reload()

  console.log('-- 1. not-ready subjects hidden; single-question Swap disabled')
  await btn('By department').click(); await btn('Science').click()
  const shown = (await p.locator('.buttons button').allTextContents()).map((t) => t.trim())
  ok(JSON.stringify(shown) === JSON.stringify(['Mixed', 'Physics', 'Chemistry', 'Biology', 'Mathematics', 'Agric', 'English', 'Test Deck', 'Test Single']), `Science shows ready subjects only, Test Partial (no hard questions) hidden: ${shown}`)
  ok((await p.getByText(/questions yet/i).count()) === 0 && (await p.locator('button:disabled').count()) === 0, 'no disabled subjects or "questions yet" labels')
  await btn('Test Single').click(); await btn('3').click()
  ok(await btn('Swap question').isDisabled(), 'Test Single easy: Swap disabled (one question)')
  await btn('Got it').click()
  ok((await meta()).startsWith('Medium') && await btn('Swap question').isDisabled(), 'Test Single medium: Swap disabled')
  await endQuiz()

  console.log('-- 2. full deck before repeat, no repeat across reshuffle')
  async function cycle(open, key, ids, rounds) {
    await p.evaluate(() => localStorage.clear()); await p.reload()
    await open()
    const seq = [await lastOf(key)]
    for (let i = 1; i < ids.length * rounds; i++) { await btn('Swap question').click(); seq.push(await lastOf(key)) }
    await endQuiz()
    let good = true, noRepeat = true
    for (let r = 0; r < rounds; r++) if (!sameSet(seq.slice(r * ids.length, (r + 1) * ids.length), ids)) good = false
    for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) noRepeat = false
    ok(good, `${key}: each round of ${ids.length} shows all ${ids.length} (${rounds} rounds)`)
    ok(noRepeat, `${key}: no back-to-back repeat incl. across reshuffles`)
  }
  await cycle(() => toSubject('Test Deck'), 'testdeck:easy', TDK_E, 6)
  await cycle(async () => { await btn('General').click(); await btn('3').click() }, 'general:easy', GEN_E, 3)
  await p.evaluate(() => localStorage.clear()); await p.reload()
  let twoOk = true, prev = null
  for (let i = 0; i < 6; i++) {
    await toSubject('Test Deck'); await btn('Got it').click(); await btn('Got it').click()
    const cur = await lastOf('testdeck:hard'); if (cur === prev) twoOk = false; prev = cur
    await endQuiz()
  }
  ok(twoOk, 'testdeck:hard (2 cards) alternates across 6 quizzes')

  console.log('-- 2b. long quizzes on small decks; Mixed pool')
  await p.evaluate(() => localStorage.clear()); await p.reload()
  await toSubject('Test Single', 10)
  const singleLevels = []
  for (let i = 0; i < 10; i++) { singleLevels.push((await meta()).split(' · ')[0].toLowerCase()); await btn('Got it').click() }
  ok(JSON.stringify(singleLevels) === JSON.stringify(levelPlan(10)), 'Test Single (1 card per level): 10-question quiz follows the 4/3/3 split, repeating its cards')
  ok((await p.locator('.score').textContent()) === '10/10', 'Test Single 10-question quiz completes: 10/10')
  await btn('Next person').click()
  await btn('By department').click(); await btn('Science').click(); await btn('Mixed').click(); await btn('10').click()
  const mixedSubjects = []
  for (let i = 0; i < 10; i++) {
    mixedSubjects.push(await p.locator('.progress .subject').textContent())
    if (i === 3) { await btn('Swap question').click(); mixedSubjects.push(await p.locator('.progress .subject').textContent()) }
    await btn('Got it').click()
  }
  ok(!mixedSubjects.includes('Test Partial'), 'Mixed never uses the hidden Test Partial subject')
  ok(mixedSubjects.every((s, i) => i === 0 || s !== mixedSubjects[i - 1]), `Mixed: no subject twice in a row, incl. after Swap (${mixedSubjects.join(', ')})`)
  ok((await p.locator('.score-subject').textContent()) === 'Science · Mixed', 'score label "Science · Mixed"')
  await btn('Next person').click()

  console.log('-- 3. survives reload')
  await p.evaluate(() => localStorage.clear()); await p.reload()
  await toSubject('Test Deck')
  const seen = [await lastOf('testdeck:easy')]
  await btn('Swap question').click(); seen.push(await lastOf('testdeck:easy'))
  await endQuiz(); await p.reload()
  await toSubject('Test Deck')
  const after = [await lastOf('testdeck:easy')]
  await btn('Swap question').click(); after.push(await lastOf('testdeck:easy'))
  await endQuiz()
  ok(sameSet([...seen, ...after], TDK_E), `after reload, next draws are the unseen two (${seen} | ${after})`)
  ok(!('personCount' in (await st())), 'saved data has no person count')

  console.log('-- 4. new ids join the current round')
  await setSaved({ decks: { 'testdeck:easy': { order: ['tdk-e-001', 'tdk-e-002', 'tdk-e-003'], next: 0 } } })
  await toSubject('Test Deck')
  const four = [await lastOf('testdeck:easy')]
  for (let i = 0; i < 3; i++) { await btn('Swap question').click(); four.push(await lastOf('testdeck:easy')) }
  await endQuiz()
  ok(sameSet(four, TDK_E), 'tdk-e-004 (not in saved deck) drawn within the round: ' + four)

  console.log('-- 5. old, bad and stale saved data')
  await setSaved({ personCount: 7, decks: { 'testdeck:easy': { order: ['tdk-e-003', 'tdk-e-001', 'tdk-e-004', 'tdk-e-002'], next: 1, last: 'tdk-e-003' } } })
  ok(errs.length === 0 && await btn('General').isVisible(), 'old saved data with a person count loads without errors')
  await toSubject('Test Deck')
  ok((await lastOf('testdeck:easy')) === 'tdk-e-001', 'old data: deck position kept (next card tdk-e-001)')
  ok(!('personCount' in (await st())), 'old data: person count dropped on next save')
  await endQuiz()

  await setSaved({ personCount: -1, decks: { 'testdeck:easy': { order: ['tdk-e-002', 'tdk-e-004', 'tdk-e-001', 'tdk-e-003'], next: 2 } } })
  await toSubject('Test Deck')
  ok((await lastOf('testdeck:easy')) === 'tdk-e-001', 'invalid old person count is ignored, decks kept')
  await endQuiz()

  await setSaved('{not json')
  await toSubject('Test Deck'); ok((await meta()).startsWith('Easy'), 'unreadable JSON -> fresh start, still playable'); await endQuiz()
  ok((await st()).decks['testdeck:easy'] !== undefined, 'storage rewritten with valid data')

  await setSaved({ decks: [] })
  ok(await btn('General').isVisible() && Object.keys((await st()).decks).length === 0, 'decks not an object -> whole entry fresh')

  await setSaved({ decks: { 'testdeck:easy': { order: ['tdk-e-002', 'tdk-e-999', 'tdk-e-004', 'tdk-e-001', 'tdk-e-003'], next: 1, last: 'tdk-e-002' } } })
  await toSubject('Test Deck')
  const kept = [await lastOf('testdeck:easy')]
  for (let i = 0; i < 2; i++) { await btn('Swap question').click(); kept.push(await lastOf('testdeck:easy')) }
  await endQuiz()
  ok(kept.join() === 'tdk-e-004,tdk-e-001,tdk-e-003', 'missing id dropped, remaining cards in saved order: ' + kept)

  await setSaved({ decks: {
    'testdeck:easy': { order: ['tdk-e-001', 'tdk-e-002'], next: 99 },
    'testdeck:medium': { order: ['tdk-m-003', 'tdk-m-001', 'tdk-m-002', 'tdk-m-004'], next: 0 },
  } })
  await toSubject('Test Deck')
  ok(TDK_E.includes(await lastOf('testdeck:easy')), 'broken testdeck:easy replaced by fresh deck')
  await btn('Got it').click()
  ok((await lastOf('testdeck:medium')) === 'tdk-m-003', 'valid testdeck:medium kept its saved order')
  await endQuiz()

  await setSaved({ decks: { 'testdeck:easy': { order: ['tdk-e-001', 'tdk-e-001'], next: 0 } } })
  await toSubject('Test Deck')
  ok((await st()).decks['testdeck:easy'].order.length === 4, 'deck with duplicate ids reset')
  await endQuiz()

  console.log('-- 6. Reset questions')
  await setSaved({ decks: { 'testdeck:easy': { order: TDK_E, next: 2, last: 'tdk-e-002' }, 'testdeck:medium': { order: TDK_M, next: 1, last: 'tdk-m-001' } } })
  const menu = btn('Menu')
  ok((await menu.boundingBox()).height >= 44, 'Menu pill >= 44px (top-bar exception)')
  await menu.click()
  ok((await btn('Reset questions').boundingBox()).height >= 56, 'Reset questions >= 56px')
  let msg = ''
  p.once('dialog', (d) => { msg = d.message(); d.dismiss() })
  await btn('Reset questions').click()
  ok(msg === 'Reset all questions? Questions already asked will come up again.', 'confirm text: ' + msg)
  ok((await st()).decks['testdeck:easy'].next === 2, 'cancel changes nothing')
  ok((await btn('Reset questions').count()) === 0, 'menu closes after cancel')
  await menu.click(); p.once('dialog', (d) => d.accept()); await btn('Reset questions').click()
  ok(Object.keys((await st()).decks).length === 0, 'confirm -> every deck cleared')
  await p.reload()
  ok(Object.keys((await st()).decks).length === 0, 'reset survives reload')
  ok(!/shoot|route/i.test(await p.evaluate(() => document.body.innerText)), 'no "shoot"/"route" in text')

  ok(errs.length === 0, 'no page errors ' + errs.join('; '))

  console.log('-- 7. localStorage throws')
  const ctx2 = await b.newContext()
  await ctx2.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('blocked') }
    Storage.prototype.setItem = () => { throw new Error('blocked') }
  })
  const p2 = await ctx2.newPage(); const errs2 = []; p2.on('pageerror', (e) => errs2.push(e.message))
  await p2.goto(URL)
  const b2 = (n) => p2.getByRole('button', { name: n, exact: true })
  await b2('General').click(); await b2('3').click()
  for (let i = 0; i < 3; i++) await b2('Got it').click()
  ok((await p2.locator('.score').isVisible()) && errs2.length === 0, 'full quiz works with storage blocked ' + errs2.join('; '))
  await b2('Next person').click()
  ok(await b2('General').isVisible(), 'back at start')

  await b.close(); await stopServer(server)
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
  process.exit(fails ? 1 : 0)
})()

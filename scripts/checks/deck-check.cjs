// Deck logic, saved data and Reset questions. Needs the temporary test files from README.md
// built into the app, and `npm run preview` on port 4173.
const { chromium } = require('playwright')
const URL = 'http://localhost:4173'
const KEY = 'miyagi-street-quiz'
let fails = 0
const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++ }
const GEN_E = ['gen-e-001', 'gen-e-002', 'gen-e-003', 'gen-e-004']
const CHM_E = ['chm-e-001', 'chm-e-002', 'chm-e-003']
const sameSet = (a, b) => a.length === b.length && [...a].sort().join() === [...b].sort().join()

;(async () => {
  const b = await chromium.launch()
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } })
  const p = await ctx.newPage()
  const errs = []
  p.on('pageerror', (e) => errs.push(e.message))
  const btn = (name) => p.getByRole('button', { name, exact: true })
  const meta = () => p.locator('.meta').first().textContent()
  const raw = () => p.evaluate((k) => localStorage.getItem(k), KEY)
  const st = async () => JSON.parse(await raw())
  const lastOf = async (key) => (await st()).decks[key].last
  const setSaved = async (val) => { await p.evaluate(([k, v]) => localStorage.setItem(k, v), [KEY, typeof val === 'string' ? val : JSON.stringify(val)]); await p.reload() }
  const endQuiz = async () => { p.once('dialog', (d) => d.accept()); await btn('End quiz').click() }
  const toSubject = async (dept, subj) => { await btn('By department').click(); await btn(dept).click(); await btn(subj).click() }
  const answerAll = async () => { for (let i = 0; i < 3; i++) await btn('Got it').click() }

  await p.goto(URL)
  await p.evaluate(() => localStorage.clear()); await p.reload()

  console.log('-- 1. not-ready subjects hidden; single-question Swap disabled')
  await btn('By department').click(); await btn('Science').click()
  const shown = (await p.locator('.buttons button').allTextContents()).map((t) => t.trim())
  ok(JSON.stringify(shown) === JSON.stringify(['Chemistry', 'Biology']), `Science shows only ready subjects: ${shown} (Physics, with no hard questions, hidden)`)
  ok((await p.getByText(/questions yet/i).count()) === 0 && (await p.locator('button:disabled').count()) === 0, 'no disabled subjects or "questions yet" labels')
  await btn('Chemistry').click()
  await btn('Got it').click()
  ok((await meta()).startsWith('Medium') && await btn('Swap question').isDisabled(), 'Chemistry medium: Swap disabled (one question)')
  await endQuiz()

  console.log('-- 2. full deck before repeat, no repeat across reshuffle')
  async function cycle(dept, subj, key, ids, rounds) {
    await p.evaluate(() => localStorage.clear()); await p.reload()
    if (dept) await toSubject(dept, subj); else await btn('General').click()
    const seq = [await lastOf(key)]
    for (let i = 1; i < ids.length * rounds; i++) { await btn('Swap question').click(); seq.push(await lastOf(key)) }
    await endQuiz()
    let good = true, noRepeat = true
    for (let r = 0; r < rounds; r++) if (!sameSet(seq.slice(r * ids.length, (r + 1) * ids.length), ids)) good = false
    for (let i = 1; i < seq.length; i++) if (seq[i] === seq[i - 1]) noRepeat = false
    ok(good, `${key}: each round of ${ids.length} shows all ${ids.length} (${rounds} rounds)`)
    ok(noRepeat, `${key}: no back-to-back repeat incl. across reshuffles`)
  }
  await cycle('Science', 'Chemistry', 'chemistry:easy', CHM_E, 6)
  await cycle(null, 'General', 'general:easy', GEN_E, 5)
  await p.evaluate(() => localStorage.clear()); await p.reload()
  let twoOk = true, prev = null
  for (let i = 0; i < 6; i++) {
    await toSubject('Science', 'Chemistry'); await btn('Got it').click(); await btn('Got it').click()
    const cur = await lastOf('chemistry:hard'); if (cur === prev) twoOk = false; prev = cur
    await endQuiz()
  }
  ok(twoOk, 'chemistry:hard (2 cards) alternates across 6 quizzes')

  console.log('-- 3. survives reload')
  await p.evaluate(() => localStorage.clear()); await p.reload()
  await btn('General').click()
  const seen = [await lastOf('general:easy')]
  await btn('Swap question').click(); seen.push(await lastOf('general:easy'))
  await endQuiz(); await p.reload()
  await btn('General').click()
  const after = [await lastOf('general:easy')]
  await btn('Swap question').click(); after.push(await lastOf('general:easy'))
  await endQuiz()
  ok(sameSet([...seen, ...after], GEN_E), `after reload, next draws are the unseen two (${seen} | ${after})`)
  ok(!('personCount' in (await st())), 'saved data has no person count')

  console.log('-- 4. new ids join the current round')
  await setSaved({ decks: { 'general:easy': { order: ['gen-e-001', 'gen-e-002', 'gen-e-003'], next: 0 } } })
  await btn('General').click()
  const four = [await lastOf('general:easy')]
  for (let i = 0; i < 3; i++) { await btn('Swap question').click(); four.push(await lastOf('general:easy')) }
  await endQuiz()
  ok(sameSet(four, GEN_E), 'gen-e-004 (not in saved deck) drawn within the round: ' + four)

  console.log('-- 5. old, bad and stale saved data')
  await setSaved({ personCount: 7, decks: { 'general:easy': { order: ['gen-e-003', 'gen-e-001', 'gen-e-004', 'gen-e-002'], next: 1, last: 'gen-e-003' } } })
  ok(errs.length === 0 && await btn('General').isVisible(), 'old saved data with a person count loads without errors')
  await btn('General').click()
  ok((await lastOf('general:easy')) === 'gen-e-001', 'old data: deck position kept (next card gen-e-001)')
  ok(!('personCount' in (await st())), 'old data: person count dropped on next save')
  await endQuiz()

  await setSaved({ personCount: -1, decks: { 'general:easy': { order: ['gen-e-002', 'gen-e-004', 'gen-e-001', 'gen-e-003'], next: 2 } } })
  await btn('General').click()
  ok((await lastOf('general:easy')) === 'gen-e-001', 'invalid old person count is ignored, decks kept')
  await endQuiz()

  await setSaved('{not json')
  await btn('General').click(); ok((await meta()).startsWith('Easy'), 'unreadable JSON -> fresh start, still playable'); await endQuiz()
  ok((await st()).decks['general:easy'] !== undefined, 'storage rewritten with valid data')

  await setSaved({ decks: [] })
  ok(await btn('General').isVisible() && Object.keys((await st()).decks).length === 0, 'decks not an object -> whole entry fresh')

  await setSaved({ decks: { 'general:easy': { order: ['gen-e-002', 'gen-e-999', 'gen-e-004', 'gen-e-001', 'gen-e-003'], next: 1, last: 'gen-e-002' } } })
  await btn('General').click()
  const kept = [await lastOf('general:easy')]
  for (let i = 0; i < 2; i++) { await btn('Swap question').click(); kept.push(await lastOf('general:easy')) }
  await endQuiz()
  ok(kept.join() === 'gen-e-004,gen-e-001,gen-e-003', 'missing id dropped, remaining cards in saved order: ' + kept)

  await setSaved({ decks: {
    'general:easy': { order: ['gen-e-001', 'gen-e-002'], next: 99 },
    'general:medium': { order: ['gen-m-003', 'gen-m-001', 'gen-m-002', 'gen-m-004'], next: 0 },
  } })
  await btn('General').click()
  ok(GEN_E.includes(await lastOf('general:easy')), 'broken general:easy replaced by fresh deck')
  await btn('Got it').click()
  ok((await lastOf('general:medium')) === 'gen-m-003', 'valid general:medium kept its saved order')
  await endQuiz()

  await setSaved({ decks: { 'general:easy': { order: ['gen-e-001', 'gen-e-001'], next: 0 } } })
  await btn('General').click()
  ok((await st()).decks['general:easy'].order.length === 4, 'deck with duplicate ids reset')
  await endQuiz()

  console.log('-- 6. Reset questions')
  await setSaved({ decks: { 'general:easy': { order: GEN_E, next: 2, last: 'gen-e-002' } } })
  const menu = btn('Menu')
  ok((await menu.boundingBox()).height >= 44, 'Menu pill >= 44px (top-bar exception)')
  await menu.click()
  ok((await btn('Reset questions').boundingBox()).height >= 56, 'Reset questions >= 56px')
  let msg = ''
  p.once('dialog', (d) => { msg = d.message(); d.dismiss() })
  await btn('Reset questions').click()
  ok(msg === 'Reset all questions? Questions already asked will come up again.', 'confirm text: ' + msg)
  ok((await st()).decks['general:easy'].next === 2, 'cancel changes nothing')
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
  await b2('General').click()
  for (let i = 0; i < 3; i++) await b2('Got it').click()
  ok((await p2.locator('.score').isVisible()) && errs2.length === 0, 'full quiz works with storage blocked ' + errs2.join('; '))
  await b2('Next person').click()
  ok(await b2('General').isVisible(), 'back at start')

  await b.close()
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
  process.exit(fails ? 1 : 0)
})()

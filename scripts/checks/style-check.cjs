// Screenshots every screen at two phone sizes and checks layout, tap sizes, contrast, focus,
// motion and wording. Needs `npm run preview` on port 4173. Screenshots go to output/shots/.
const { chromium } = require('playwright')
const fs = require('fs'), path = require('path')
const URL = 'http://localhost:4173'
const KEY = 'miyagi-street-quiz'
const SHOTS = path.join(__dirname, 'output', 'shots')
fs.mkdirSync(SHOTS, { recursive: true })
const qdir = path.join(__dirname, '..', '..', 'data', 'questions')
const all = fs.readdirSync(qdir).flatMap((f) => JSON.parse(fs.readFileSync(path.join(qdir, f), 'utf8')))
const longestQ = all.reduce((a, b) => (b.q.length > a.q.length ? b : a))
const mostAnswers = all.reduce((a, b) => (b.answers.length > a.answers.length ? b : a))
console.log(`longest question: ${longestQ.id} (${longestQ.q.length} chars); most answers: ${mostAnswers.id} (${mostAnswers.answers.length})`)
let fails = 0
const ok = (c, m) => { if (!c) { console.log('FAIL ' + m); fails++ } else console.log('PASS ' + m) }

const SIZES = [
  { name: 'android-412x915', width: 412, height: 915 },
  { name: 'iphone-se-375x667', width: 375, height: 667 },
]

// Page-side layout audit
async function audit(p, label) {
  const r = await p.evaluate(() => {
    const W = window.innerWidth
    const problems = []
    if (document.documentElement.scrollWidth > W) problems.push(`page scrolls sideways (${document.documentElement.scrollWidth} > ${W})`)
    for (const el of document.querySelectorAll('body *')) {
      const b = el.getBoundingClientRect()
      if (b.width === 0) continue
      if (b.left < -0.5 || b.right > W + 0.5) problems.push(`${el.tagName}.${el.className} off-screen (${Math.round(b.left)}..${Math.round(b.right)})`)
      if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible') problems.push(`${el.tagName}.${el.className} clips text`)
    }
    const small = []
    for (const btn of document.querySelectorAll('button')) {
      const h = btn.getBoundingClientRect().height
      const min = btn.closest('.topbar') ? 44 : 56
      if (h < min - 0.5) small.push(`${btn.textContent.trim()} ${h}px`)
      if (btn.scrollWidth > btn.clientWidth + 1) problems.push(`button "${btn.textContent.trim()}" text overflows`)
    }
    // contrast of every button + key text against effective background
    const parse = (c) => c.match(/[\d.]+/g).map(Number)
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b) }
    const bgOf = (el) => { while (el) { const c = parse(getComputedStyle(el).backgroundColor); if (c.length < 4 || c[3] > 0) return c; el = el.parentElement } return [255, 255, 255] }
    const low = []
    for (const el of document.querySelectorAll('button, h1, p, li, span')) {
      if (!el.textContent.trim() || el.getBoundingClientRect().width === 0) continue
      const fg = lum(parse(getComputedStyle(el).color)), bg = lum(bgOf(el))
      const ratio = (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05)
      if (ratio < 7) low.push(`"${el.textContent.trim().slice(0, 20)}" ${ratio.toFixed(1)}`)
    }
    const weights = [...document.querySelectorAll('button, h1, p, li, span')].map((e) => Number(getComputedStyle(e).fontWeight))
    const banned = /route|shoot/i.test(document.body.innerText)
    // Top-bar pill outlines must reach 3:1 against the page (non-text contrast)
    const weakPills = [...document.querySelectorAll('.topbar button')].filter((btn) => {
      const fg = lum(parse(getComputedStyle(btn).borderTopColor)), bg = lum(bgOf(btn.parentElement))
      return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05) < 3
    }).map((b) => b.textContent.trim())
    const fontOk = getComputedStyle(document.body).fontFamily.startsWith('Outfit') && [...document.fonts].some((f) => f.family.replace(/"/g, '') === 'Outfit' && f.status === 'loaded')
    const dots = getComputedStyle(document.querySelector('main')).backgroundImage.includes('radial-gradient')
    return { problems, small, low, minWeight: Math.min(...weights), banned, weakPills, fontOk, dots }
  })
  ok(r.weakPills.length === 0, `${label}: pill outlines >= 3:1 ${r.weakPills.join(', ')}`)
  ok(r.fontOk, `${label}: Outfit font loaded and in use`)
  const wantDots = /route|score/.test(label)
  ok(r.dots === wantDots, `${label}: dot grid ${wantDots ? 'shown' : 'not shown'}`)
  ok(!r.banned, `${label}: no "route"/"shoot" in text`)
  ok(r.problems.length === 0, `${label}: no overflow/cut-off ${r.problems.slice(0, 5).join('; ')}`)
  ok(r.small.length === 0, `${label}: tap targets ${r.small.join(', ')}`)
  ok(r.low.length === 0, `${label}: contrast >= 7:1 ${r.low.slice(0, 5).join(', ')}`)
  ok(r.minWeight >= 600, `${label}: no thin text (min weight ${r.minWeight})`)
}

;(async () => {
  const b = await chromium.launch()
  for (const size of SIZES) {
    console.log(`== ${size.name}`)
    const ctx = await b.newContext({ viewport: { width: size.width, height: size.height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true })
    const p = await ctx.newPage()
    const errs = []; p.on('pageerror', (e) => errs.push(e.message))
    const btn = (n) => p.getByRole('button', { name: n, exact: true })
    const btnStart = (n) => p.getByRole('button', { name: new RegExp('^' + n) })
    let n = 0
    const shot = async (name, opts = {}) => {
      await p.evaluate(() => document.fonts.ready)
      await audit(p, `${size.name} ${name}`)
      await p.screenshot({ path: path.join(SHOTS, `${size.name}-${String(++n).padStart(2, '0')}-${name}.png`), ...opts })
    }
    // Seed decks so specific questions come up.
    const seed = async (decks) => {
      await p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, { decks }])
      await p.reload()
    }
    await p.goto(URL)
    await seed({})

    await shot('route')
    await btn('Menu').click(); await shot('route-menu'); await btn('Menu').click()
    await btn('By department').click(); await shot('department')
    for (const d of ['Science', 'Commercial', 'Art']) { await btn(d).click(); await shot('subject-' + d.toLowerCase()); await btn('← Back').click() }

    // Commerce: easy single answer, medium "all", hard 10 answers
    await seed({
      'commerce:easy': { order: ['com-e-001', 'com-e-002'], next: 0 },
      'commerce:medium': { order: ['com-m-001', 'com-m-002'], next: 0 },
      'commerce:hard': { order: [mostAnswers.id, 'com-h-001'], next: 0 },
    })
    await btn('By department').click(); await btn('Commercial').click(); await btnStart('Commerce').click()
    await shot('question-easy')
    await btn('Got it').click()
    ok((await btn('← Back').count()) === 0, `${size.name}: no Back after marking`)
    await shot('question-all-of-these-no-back')
    await btn('Missed it').click()
    await shot('question-10-answers-top')
    await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const clear = await p.evaluate(() => {
      const last = [...document.querySelectorAll('.answer li')].pop().getBoundingClientRect()
      const bar = document.querySelector('.actions.sticky').getBoundingClientRect()
      return { lastBottom: last.bottom, barTop: bar.top, barBottom: bar.bottom, vh: window.innerHeight }
    })
    ok(clear.lastBottom <= clear.barTop && Math.abs(clear.barBottom - clear.vh) < 1, `${size.name}: last of ${mostAnswers.answers.length} answers fully visible above the fixed buttons (${Math.round(clear.lastBottom)} <= ${Math.round(clear.barTop)})`)
    await shot('question-10-answers-bottom')
    await btn('Got it').click()
    await shot('score')

    // Longest question + note (General / Biology)
    await btn('Next person').click()
    const lqKey = `${longestQ.subject}:${longestQ.level}`
    const noteQ = all.find((q) => q.note && q.subject === 'general' && q.level === 'medium')
    const firstThen = (q) => ({ order: [q.id, ...all.filter((x) => x.subject === q.subject && x.level === q.level && x.id !== q.id).map((x) => x.id)], next: 0 })
    const decks = { [lqKey]: firstThen(longestQ), 'general:medium': firstThen(noteQ) }
    await seed(decks)
    if (longestQ.subject === 'general') { await btn('General').click() } else {
      const dept = { biology: 'Science', commerce: 'Commercial', government: 'Art' }[longestQ.subject]
      await btn('By department').click(); await btn(dept).click(); await btnStart(longestQ.subject[0].toUpperCase() + longestQ.subject.slice(1)).click()
      for (const lvl of ['easy', 'medium', 'hard']) { if (lvl === longestQ.level) break; await btn('Got it').click() }
    }
    ok((await p.locator('.question').textContent()) === longestQ.q, `${size.name}: longest question shown`)
    await shot('question-longest')
    p.once('dialog', (d) => d.accept()); await btn('End quiz').click()
    await btn('General').click(); await btn('Got it').click()
    ok(await p.locator('.note').isVisible(), `${size.name}: note visible`)
    await shot('question-note')

    // Score with misses for the camera shot
    await btn('Missed it').click(); await btn('Got it').click()
    await shot('score-mixed')

    // Focus visible
    await btn('Next person').click()
    await p.keyboard.press('Tab')
    const focus = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return { tag: document.activeElement.tagName, style: s.outlineStyle, width: parseFloat(s.outlineWidth) } })
    ok(focus.tag === 'BUTTON' && focus.style !== 'none' && focus.width >= 3, `${size.name}: keyboard focus outline visible (${JSON.stringify(focus)})`)
    await shot('route-focus')

    // Reduced motion + dark mode
    await p.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' })
    const env = await p.evaluate(() => {
      const moving = [...document.querySelectorAll('*')].filter((e) => { const s = getComputedStyle(e); return (s.transitionDuration.split(',').some((d) => parseFloat(d) > 0)) || s.animationName !== 'none' })
      return { moving: moving.length, bg: getComputedStyle(document.body).backgroundColor, text: getComputedStyle(document.body).color }
    })
    ok(env.moving === 0, `${size.name}: no transitions/animations`)
    ok(env.bg === 'rgb(255, 255, 255)' && env.text === 'rgb(17, 17, 17)', `${size.name}: stays light in dark mode (${env.bg})`)
    await p.emulateMedia({ reducedMotion: null, colorScheme: null })
    ok(errs.length === 0, `${size.name}: no page errors ${errs.join('; ')}`)
    await ctx.close()
  }
  await b.close()
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED')
  process.exit(fails ? 1 : 0)
})()

// Shared helpers for the check scripts. Reads the real question files but never writes to them.
const fs = require('fs'), path = require('path'), http = require('http')

const ROOT = path.join(__dirname, '..', '..')
const KEY = 'miyagi-street-quiz'
const LEVELS = ['easy', 'medium', 'hard']

// Real question bank, read-only.
function readQuestions(dir = path.join(ROOT, 'data', 'questions')) {
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
}

const SUBJECT_NAMES = JSON.parse(fs.readFileSync(path.join(ROOT, 'src', 'subjects.json'), 'utf8'))

// Department -> subject ids, read from src/questions.ts so navigation follows the app.
function readDepartments() {
  const src = fs.readFileSync(path.join(ROOT, 'src', 'questions.ts'), 'utf8')
  const out = {}
  for (const [, dept, list] of src.matchAll(/(science|commercial|art): \[([^\]]*)\]/g)) {
    out[dept] = [...list.matchAll(/'([^']+)'/g)].map((m) => m[1])
  }
  return out
}
const DEPARTMENT_NAMES = { science: 'Science', commercial: 'Commercial', art: 'Art' }

// A saved deck for subject+level that draws `firstIds` first, then every other id of that level.
// It must list every id: ids missing from a saved deck are shuffled in by the app.
function deckStartingWith(all, subject, level, firstIds = []) {
  const rest = all.filter((q) => q.subject === subject && q.level === level && !firstIds.includes(q.id)).map((q) => q.id)
  return { order: [...firstIds, ...rest], next: 0 }
}

// How many easy/medium/hard questions each count has (difficulty always climbs).
const SPLITS = { 3: [1, 1, 1], 5: [2, 2, 1], 7: [3, 2, 2], 10: [4, 3, 3] }
const levelPlan = (count) => SPLITS[count].flatMap((n, i) => Array(n).fill(LEVELS[i]))

// Saves decks, reloads, then starts a `count`-question quiz in q's subject and opens `q` as the first
// question of its level (marking earlier questions Got it).
async function openQuestion(p, all, q, extraDecks = {}, count = 3) {
  const decks = { ...extraDecks }
  for (const level of LEVELS) {
    decks[`${q.subject}:${level}`] = deckStartingWith(all, q.subject, level, level === q.level ? [q.id] : [])
    if (level === q.level) break
  }
  await p.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [KEY, { decks }])
  await p.reload()
  const btn = (n) => p.getByRole('button', { name: n, exact: true })
  if (q.subject === 'general') {
    await btn('General').click()
  } else {
    const depts = readDepartments()
    const dept = Object.keys(depts).find((d) => depts[d].includes(q.subject))
    await btn('By department').click()
    await btn(DEPARTMENT_NAMES[dept]).click()
    await btn(SUBJECT_NAMES[q.subject]).click()
  }
  await btn(String(count)).click()
  const before = levelPlan(count).indexOf(q.level)
  for (let i = 0; i < before; i++) await btn('Got it').click()
}

// Tiny static server for a built app folder (SPA fallback, no caching, like Vercel).
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' }
function serve(getRoot, port) {
  const rootOf = typeof getRoot === 'function' ? getRoot : () => getRoot
  const server = http.createServer((req, res) => {
    const root = rootOf()
    let f = path.join(root, decodeURIComponent(req.url.split('?')[0]))
    if (!f.startsWith(root) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) f = path.join(root, 'index.html')
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'public, max-age=0, must-revalidate' })
    fs.createReadStream(f).pipe(res)
  })
  return new Promise((resolve) => server.listen(port, () => resolve(server)))
}
const stopServer = (server) => new Promise((r) => { server.closeAllConnections(); server.close(r) })

function requireBuildDir(arg, usage) {
  if (!arg || !fs.existsSync(path.join(arg, 'index.html'))) {
    console.error(usage)
    process.exit(2)
  }
  return path.resolve(arg)
}

module.exports = { ROOT, KEY, LEVELS, SPLITS, levelPlan, readQuestions, SUBJECT_NAMES, readDepartments, deckStartingWith, openQuestion, serve, stopServer, requireBuildDir }

// Builds a test version of the app in a temporary copy of the repo, so data/questions/ and the
// rest of the repo are never changed. Usage: node scripts/checks/test-build.cjs <variant> <out folder>
//
// Variants:
//   real           the app as it is (PWA check v1)
//   updated        the text of gen-e-001 changed to "UPDATED: …" (PWA check v2)
//   test-subjects  real questions plus three made-up Science subjects (deck check):
//                    "Test Deck"    4 easy, 4 medium, 2 hard
//                    "Test Single"  1 easy, 1 medium, 1 hard   (Swap disabled everywhere)
//                    "Test Partial" 2 easy, 1 medium, no hard  (must be hidden)
//   some-missing   only biology.json and commerce.json (visibility check B)
//   nothing-ready  no real questions, only "Test Partial" (visibility check C)
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process')
const { ROOT } = require('./lib.cjs')

const [variant, outArg] = process.argv.slice(2)
const VARIANTS = ['real', 'updated', 'test-subjects', 'some-missing', 'nothing-ready']
if (!VARIANTS.includes(variant) || !outArg) {
  console.error(`Usage: node scripts/checks/test-build.cjs <${VARIANTS.join('|')}> <out folder>`)
  process.exit(2)
}
const out = path.resolve(outArg)
if (out === ROOT || out.startsWith(ROOT + path.sep)) {
  console.error('The out folder must be outside the repo.')
  process.exit(2)
}

const q = (id, subject, level, text) => ({ id, subject, level, q: text, answers: ['a'], match: 'one' })
const TEST_SUBJECTS = {
  testdeck: { name: 'Test Deck', questions: [
    ...[1, 2, 3, 4].map((n) => q(`tdk-e-00${n}`, 'testdeck', 'easy', `TEST deck easy ${n}`)),
    ...[1, 2, 3, 4].map((n) => q(`tdk-m-00${n}`, 'testdeck', 'medium', `TEST deck medium ${n}`)),
    ...[1, 2].map((n) => q(`tdk-h-00${n}`, 'testdeck', 'hard', `TEST deck hard ${n}`)),
  ] },
  testsingle: { name: 'Test Single', questions: [
    q('tsg-e-001', 'testsingle', 'easy', 'TEST single easy'),
    q('tsg-m-001', 'testsingle', 'medium', 'TEST single medium'),
    q('tsg-h-001', 'testsingle', 'hard', 'TEST single hard'),
  ] },
  testpartial: { name: 'Test Partial', questions: [
    q('tpt-e-001', 'testpartial', 'easy', 'TEST partial easy 1'),
    q('tpt-e-002', 'testpartial', 'easy', 'TEST partial easy 2'),
    q('tpt-m-001', 'testpartial', 'medium', 'TEST partial medium'),
  ] },
}

// 1. Temporary copy of the repo (node_modules is linked, not copied).
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'msq-test-build-'))
const SKIP = new Set(['.git', 'node_modules', 'dist', path.join('scripts', 'checks', 'output')])
fs.cpSync(ROOT, work, { recursive: true, filter: (src) => !SKIP.has(path.relative(ROOT, src)) })
fs.symlinkSync(path.join(ROOT, 'node_modules'), path.join(work, 'node_modules'), 'dir')
const qdir = path.join(work, 'data', 'questions')

// 2. Apply the variant, in the copy only.
function addTestSubjects(names) {
  const subjectsPath = path.join(work, 'src', 'subjects.json')
  const subjects = JSON.parse(fs.readFileSync(subjectsPath, 'utf8'))
  for (const id of names) {
    subjects[id] = TEST_SUBJECTS[id].name
    fs.writeFileSync(path.join(qdir, `${id}.json`), JSON.stringify(TEST_SUBJECTS[id].questions, null, 2))
  }
  fs.writeFileSync(subjectsPath, JSON.stringify(subjects, null, 2))
  const qts = path.join(work, 'src', 'questions.ts')
  const src = fs.readFileSync(qts, 'utf8')
  const updated = src.replace(/science: \[([^\]]*)\]/, (_, list) => `science: [${list}, ${names.map((n) => `'${n}'`).join(', ')}]`)
  if (updated === src) throw new Error('Could not find the Science subject list in src/questions.ts')
  fs.writeFileSync(qts, updated)
}
function keepOnly(files) {
  for (const f of fs.readdirSync(qdir)) if (!files.includes(f)) fs.rmSync(path.join(qdir, f))
}

if (variant === 'updated') {
  const p = path.join(qdir, 'general.json')
  const text = fs.readFileSync(p, 'utf8')
  const changed = text.replace('"What is the capital of Nigeria?"', '"UPDATED: What is the capital of Nigeria?"')
  if (changed === text) throw new Error('gen-e-001 text not found')
  fs.writeFileSync(p, changed)
} else if (variant === 'test-subjects') {
  addTestSubjects(['testdeck', 'testsingle', 'testpartial'])
} else if (variant === 'some-missing') {
  keepOnly(['biology.json', 'commerce.json'])
} else if (variant === 'nothing-ready') {
  keepOnly([])
  addTestSubjects(['testpartial'])
}

// 3. Build in the copy (question check + Vite build) and copy the result out.
try {
  execFileSync(process.execPath, ['scripts/validate-questions.mjs'], { cwd: work, stdio: 'inherit' })
  execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--logLevel', 'warn'], { cwd: work, stdio: 'inherit' })
  fs.rmSync(out, { recursive: true, force: true })
  fs.cpSync(path.join(work, 'dist'), out, { recursive: true })
  console.log(`Built "${variant}" into ${out}`)
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}

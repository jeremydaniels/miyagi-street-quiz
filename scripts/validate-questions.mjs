// Checks every file in data/questions/ before the app is built.
// Runs as the first step of `npm run build` (locally and on Vercel), and on its
// own with `npm run check-questions`. Lists every problem it finds, then fails.
// The rules are in docs/spec.md under "Question data".

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('..', import.meta.url))
const questionsDir = join(root, 'data', 'questions')
const subjectIds = Object.keys(JSON.parse(readFileSync(join(root, 'src', 'subjects.json'), 'utf8')))
const LEVELS = ['easy', 'medium', 'hard']
const MATCHES = ['one', 'all']

const problems = new Map() // file name -> list of messages
function report(file, message) {
  if (!problems.has(file)) problems.set(file, [])
  problems.get(file).push(message)
}

const isText = (value) => typeof value === 'string'
const isBlank = (value) => !isText(value) || value.trim() === ''
const show = (value) => JSON.stringify(value)

function jsonErrorMessage(error, text) {
  const message = String(error.message)
  const lineCol = message.match(/line (\d+) column (\d+)/)
  if (lineCol) return `near line ${lineCol[1]}, column ${lineCol[2]}`
  const position = message.match(/position (\d+)/)
  if (position) {
    const before = text.slice(0, Number(position[1])).split('\n')
    return `near line ${before.length}, column ${before[before.length - 1].length + 1}`
  }
  return `(${message})`
}

let files
try {
  files = readdirSync(questionsDir).filter((name) => name.endsWith('.json')).sort()
} catch {
  console.error('Question file check failed: the folder data/questions/ could not be found.')
  process.exit(1)
}

const seenIds = new Map() // id -> { file, position }
let questionCount = 0

for (const file of files) {
  const fileSubject = file.slice(0, -'.json'.length)
  const fileSubjectKnown = subjectIds.includes(fileSubject)
  if (!fileSubjectKnown) {
    report(
      file,
      `the file name "${file}" isn't a known subject. It must be one of: ${subjectIds.map((id) => id + '.json').join(', ')}.`,
    )
  }

  const text = readFileSync(join(questionsDir, file), 'utf8')
  let data
  try {
    data = JSON.parse(text)
  } catch (error) {
    report(
      file,
      `this file isn't valid JSON, so none of its questions could be read. Look ${jsonErrorMessage(error, text)} for a missing comma, quote or bracket.`,
    )
    continue
  }
  if (!Array.isArray(data)) {
    report(file, 'this file must be a list of questions, starting with [ and ending with ].')
    continue
  }

  data.forEach((question, index) => {
    const position = index + 1
    questionCount++

    if (typeof question !== 'object' || question === null || Array.isArray(question)) {
      report(file, `question ${position}: this isn't a question. Each question must be written inside { and }.`)
      return
    }

    const { id, subject, level, q, answers, match, note } = question
    const hasId = !isBlank(id)
    const label = hasId ? id : `question ${position} (no id)`
    const say = (message) => report(file, `${label}: ${message}`)

    if (!hasId) {
      say('this question has no id.')
    } else {
      const earlier = seenIds.get(id)
      if (earlier) {
        const where = earlier.file === file ? 'earlier in this file' : `in ${earlier.file}`
        say(`this id is already used ${where} (question ${earlier.position}). Every id must be unique.`)
      } else {
        seenIds.set(id, { file, position })
      }
    }

    if (isBlank(subject)) {
      say('the subject is missing.')
    } else if (!subjectIds.includes(subject)) {
      say(`the subject ${show(subject)} isn't a known subject.`)
    } else if (fileSubjectKnown && subject !== fileSubject) {
      say(`the subject is ${show(subject)}, but this file is for ${show(fileSubject)}. Move the question to ${subject}.json or fix its subject.`)
    }

    if (level === undefined) {
      say('the level is missing. It must be easy, medium or hard.')
    } else if (!LEVELS.includes(level)) {
      say(`the level is ${show(level)}. It must be easy, medium or hard.`)
    }

    if (isBlank(q)) say('the question text (q) is empty.')

    if (answers === undefined) {
      say('there are no answers. Add an answers list, like ["Abuja"].')
    } else if (!Array.isArray(answers)) {
      say('the answers must be a list, like ["Abuja"].')
    } else if (answers.length === 0) {
      say('the answers list is empty. Add at least one answer.')
    } else {
      answers.forEach((answer, i) => {
        if (!isText(answer)) say(`answer ${i + 1} isn't text. Put it in quotes.`)
        else if (answer.trim() === '') say(`answer ${i + 1} is empty.`)
      })
    }

    if (match === undefined) {
      say('"match" is missing. It must be "one" or "all".')
    } else if (!MATCHES.includes(match)) {
      say(`"match" is ${show(match)}. It must be "one" or "all".`)
    }

    if (note !== undefined && !isText(note)) say("the note isn't text. Put it in quotes, or remove it.")
  })
}

const total = [...problems.values()].reduce((sum, list) => sum + list.length, 0)
if (total === 0) {
  console.log(`Question files OK: ${files.length} files, ${questionCount} questions.`)
} else {
  const lines = [`Question file check failed: ${total} problem${total === 1 ? '' : 's'} found.`, '']
  for (const [file, list] of problems) {
    lines.push(file)
    for (const message of list) lines.push(`  • ${message}`)
    lines.push('')
  }
  lines.push('Fix these in data/questions/ and deploy again.')
  console.error(lines.join('\n'))
  process.exit(1)
}

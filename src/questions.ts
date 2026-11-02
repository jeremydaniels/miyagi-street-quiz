import subjectNames from './subjects.json'

export type Level = 'easy' | 'medium' | 'hard'

export type Question = {
  id: string
  subject: string
  level: Level
  q: string
  answers: string[]
  match: 'one' | 'all'
  note?: string
}

export type Department = 'science' | 'commercial' | 'art'

export const LEVELS: Level[] = ['easy', 'medium', 'hard']

export const LEVEL_NAMES: Record<Level, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}

// Subject ids and display names. Also read by scripts/validate-questions.mjs.
export const SUBJECT_NAMES: Record<string, string> = subjectNames

export const DEPARTMENT_NAMES: Record<Department, string> = {
  science: 'Science',
  commercial: 'Commercial',
  art: 'Art',
}

export const DEPARTMENT_SUBJECTS: Record<Department, string[]> = {
  science: ['physics', 'chemistry', 'biology', 'mathematics', 'agric', 'english'],
  commercial: ['commerce', 'accounting', 'economics', 'mathematics', 'english'],
  art: ['government', 'literature', 'crs', 'irs', 'history', 'english'],
}

// Every file in data/questions/ is bundled into the app at build time.
const files = import.meta.glob<Question[]>('../data/questions/*.json', {
  eager: true,
  import: 'default',
})

const allQuestions: Question[] = Object.values(files).flat()

export function questionsFor(subject: string, level: Level): Question[] {
  return allQuestions.filter((q) => q.subject === subject && q.level === level)
}

export function countFor(subject: string, level: Level): number {
  return questionsFor(subject, level).length
}

// Levels with no questions for this subject. A subject is only playable when this is empty.
export function missingLevels(subject: string): Level[] {
  return LEVELS.filter((level) => countFor(subject, level) === 0)
}

// Label for a subject that can't be played yet, or null if it's ready.
export function notReadyLabel(subject: string): string | null {
  const missing = missingLevels(subject)
  if (missing.length === 0) return null
  if (missing.length === LEVELS.length) return 'No questions yet'
  const names = missing.map((level) => level.toLowerCase())
  const list =
    names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}`
  return `No ${list} questions yet`
}

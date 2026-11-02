import { draw } from './decks.ts'
import {
  DEPARTMENT_NAMES,
  SUBJECT_NAMES,
  countFor,
  readySubjects,
  type Department,
  type Level,
  type Question,
} from './questions.ts'

// What the interviewer picked: one subject (or General), or Mixed across a department.
export type Choice =
  | { kind: 'subject'; subject: string; department: Department | null }
  | { kind: 'mixed'; department: Department }

export const COUNTS = [3, 5, 7, 10] as const
export type Count = (typeof COUNTS)[number]

// Difficulty always climbs: [easy, medium, hard] questions for each count.
const SPLITS: Record<Count, [number, number, number]> = {
  3: [1, 1, 1],
  5: [2, 2, 1],
  7: [3, 2, 2],
  10: [4, 3, 3],
}

export function levelPlan(count: Count): Level[] {
  const [easy, medium, hard] = SPLITS[count]
  return [
    ...Array<Level>(easy).fill('easy'),
    ...Array<Level>(medium).fill('medium'),
    ...Array<Level>(hard).fill('hard'),
  ]
}

// Mixed is only offered when there's more than one ready subject to mix.
export function canMix(department: Department): boolean {
  return readySubjects(department).length > 1
}

export function choiceLabel(choice: Choice): string {
  return choice.kind === 'mixed' ? `${DEPARTMENT_NAMES[choice.department]} · Mixed` : SUBJECT_NAMES[choice.subject]
}

function poolFor(choice: Choice): string[] {
  return choice.kind === 'mixed' ? readySubjects(choice.department) : [choice.subject]
}

// Next card for this level. For Mixed, pick a subject at random from the pool, avoiding the
// subject just shown when another is available, then take that subject's next card.
export function drawQuestion(choice: Choice, level: Level, avoidSubject?: string): Question {
  const pool = poolFor(choice)
  const others = pool.filter((s) => s !== avoidSubject)
  const options = others.length > 0 ? others : pool
  const subject = options[Math.floor(Math.random() * options.length)]
  return draw(subject, level)
}

export function canSwap(choice: Choice, level: Level): boolean {
  const pool = poolFor(choice)
  return pool.length > 1 || countFor(pool[0], level) > 1
}

import { questionsFor, type Level, type Question } from './questions.ts'

// One shuffled deck per subject + level, saved on the phone so a closed app
// picks up where it left off. See "Deck logic" in docs/spec.md.

type Deck = {
  order: string[] // shuffled question ids
  next: number // index of the next card to draw
  last?: string // id shown most recently, to avoid a repeat across a reshuffle
}

type Saved = {
  decks: Record<string, Deck>
}

const STORAGE_KEY = 'miyagi-street-quiz'

let state: Saved = load()

function shuffle<T>(items: T[]): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function isDeck(value: unknown): value is Deck {
  if (typeof value !== 'object' || value === null) return false
  const d = value as Record<string, unknown>
  if (!Array.isArray(d.order) || !d.order.every((id) => typeof id === 'string')) return false
  if (new Set(d.order).size !== d.order.length) return false
  if (!Number.isInteger(d.next) || (d.next as number) < 0 || (d.next as number) > d.order.length) return false
  if (d.last !== undefined && typeof d.last !== 'string') return false
  return true
}

// Unreadable entry -> start completely fresh. A single broken deck -> drop just that deck.
// Older saved data may also hold a person count; it's ignored and dropped on the next save.
function load(): Saved {
  const fresh: Saved = { decks: {} }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === null) return fresh
    const data: unknown = JSON.parse(raw)
    if (typeof data !== 'object' || data === null) return fresh
    const { decks } = data as Record<string, unknown>
    if (typeof decks !== 'object' || decks === null || Array.isArray(decks)) return fresh
    const kept: Record<string, Deck> = {}
    for (const [key, deck] of Object.entries(decks)) {
      if (isDeck(deck)) kept[key] = { order: deck.order, next: deck.next, last: deck.last }
    }
    return { decks: kept }
  } catch {
    return fresh
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable or full: keep going in memory.
  }
}

// Bring a deck in line with the current question files: drop ids that no longer
// exist, and shuffle new ids into the cards not yet drawn this round.
function sync(deck: Deck, poolIds: string[]): Deck {
  const exists = new Set(poolIds)
  const drawn = deck.order.slice(0, deck.next).filter((id) => exists.has(id))
  const remaining = deck.order.slice(deck.next).filter((id) => exists.has(id))
  const known = new Set([...drawn, ...remaining])
  for (const id of shuffle(poolIds.filter((id) => !known.has(id)))) {
    remaining.splice(Math.floor(Math.random() * (remaining.length + 1)), 0, id)
  }
  return { order: [...drawn, ...remaining], next: drawn.length, last: deck.last }
}

function reshuffle(poolIds: string[], last?: string): string[] {
  const order = shuffle(poolIds)
  if (order.length > 1 && order[0] === last) {
    const j = 1 + Math.floor(Math.random() * (order.length - 1))
    ;[order[0], order[j]] = [order[j], order[0]]
  }
  return order
}

// Take the next card from this subject + level's deck. Swap uses this too.
export function draw(subject: string, level: Level): Question {
  const pool = questionsFor(subject, level)
  if (pool.length === 0) throw new Error(`No ${level} questions for ${subject}`)
  const poolIds = pool.map((q) => q.id)
  const key = `${subject}:${level}`

  const saved = state.decks[key]
  let deck: Deck = saved ? sync(saved, poolIds) : { order: reshuffle(poolIds), next: 0 }
  if (deck.next >= deck.order.length) {
    deck = { order: reshuffle(poolIds, deck.last), next: 0, last: deck.last }
  }

  const id = deck.order[deck.next]
  state = { ...state, decks: { ...state.decks, [key]: { ...deck, next: deck.next + 1, last: id } } }
  save()
  return pool.find((q) => q.id === id)!
}

// Reshuffle every deck: each starts fresh the next time it's used.
export function resetQuestions() {
  state = { decks: {} }
  save()
}

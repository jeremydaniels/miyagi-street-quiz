import type { Question } from '../questions.ts'

export type Result = { question: Question; gotIt: boolean }

type Props = {
  results: Result[]
  onNextPerson: () => void
}

export default function ScoreScreen({ results, onNextPerson }: Props) {
  const score = results.filter((r) => r.gotIt).length
  return (
    <main className="screen">
      <p className="score">
        {score}/{results.length}
      </p>
      <ul className="recap">
        {results.map((r) => (
          <li key={r.question.id}>
            <span aria-label={r.gotIt ? 'Got it' : 'Missed it'}>{r.gotIt ? '✓' : '✗'}</span>{' '}
            {r.question.q}
          </li>
        ))}
      </ul>
      <div className="buttons">
        <button onClick={onNextPerson}>Next person</button>
      </div>
    </main>
  )
}

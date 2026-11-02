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
      <div className="content">
        <div className="score-block">
          <p className="score-label">Score</p>
          <p className="score">
            {score}/{results.length}
          </p>
        </div>
        <ul className="recap">
          {results.map((r) => (
            <li key={r.question.id}>
              <span
                className={`mark ${r.gotIt ? 'got' : 'missed'}`}
                aria-label={r.gotIt ? 'Got it' : 'Missed it'}
              >
                {r.gotIt ? '✓' : '✗'}
              </span>
              <span>{r.question.q}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="actions">
        <button className="primary" onClick={onNextPerson}>
          Next person
        </button>
      </div>
    </main>
  )
}

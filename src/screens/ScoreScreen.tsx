import Logo from '../Logo.tsx'
import type { Question } from '../questions.ts'

export type Result = { question: Question; gotIt: boolean }

type Props = {
  label: string
  results: Result[]
  onNextPerson: () => void
}

export default function ScoreScreen({ label, results, onNextPerson }: Props) {
  const score = results.filter((r) => r.gotIt).length
  return (
    <main className="screen dots">
      <div className="content">
        <div className="score-block">
          <Logo large />
          <p className="score-subject">{label}</p>
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
      {/* Fixed to the bottom so it stays visible when a long recap scrolls */}
      <div className="actions sticky">
        <button className="primary" onClick={onNextPerson}>
          Next person
        </button>
      </div>
    </main>
  )
}

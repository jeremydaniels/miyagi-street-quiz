import { useState } from 'react'
import { LEVEL_NAMES, SUBJECT_NAMES, countFor, type Question } from '../questions.ts'

type Props = {
  question: Question
  number: number
  onSwap: () => void
  onMark: (gotIt: boolean) => void
  onBack?: () => void
  onEnd: () => void
}

export default function QuestionScreen({ question, number, onSwap, onMark, onBack, onEnd }: Props) {
  const [revealed, setRevealed] = useState(false)
  const canSwap = countFor(question.subject, question.level) > 1

  let answersLabel: string | null = null
  if (question.match === 'all') answersLabel = 'All of these'
  else if (question.answers.length > 1) answersLabel = 'Any one of these'

  function endQuiz() {
    if (window.confirm("End this quiz? It won't count.")) onEnd()
  }

  return (
    <main className="screen">
      {onBack && (
        <button className="back" onClick={onBack}>
          ← Back
        </button>
      )}
      <p className="meta">
        {LEVEL_NAMES[question.level]} · {number} of 3 · {SUBJECT_NAMES[question.subject]}
      </p>
      <p className="question">{question.q}</p>

      {!revealed ? (
        <div className="buttons">
          <button onClick={() => setRevealed(true)}>Show answer</button>
          <button onClick={onSwap} disabled={!canSwap}>
            Swap question
          </button>
        </div>
      ) : (
        <>
          <section className="answer">
            {answersLabel && <p className="answer-label">{answersLabel}</p>}
            <ul>
              {question.answers.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            {question.note && <p className="note">{question.note}</p>}
          </section>
          <div className="buttons">
            <button onClick={() => onMark(true)}>Got it</button>
            <button onClick={() => onMark(false)}>Missed it</button>
          </div>
        </>
      )}

      <button className="end" onClick={endQuiz}>
        End quiz
      </button>
    </main>
  )
}

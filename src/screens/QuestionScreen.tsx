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
  const canSwap = countFor(question.subject, question.level) > 1

  let answersLabel: string | null = null
  if (question.match === 'all') answersLabel = 'All of these'
  else if (question.answers.length > 1) answersLabel = 'Any one of these'

  function endQuiz() {
    if (window.confirm('End this quiz?')) onEnd()
  }

  return (
    <main className="screen question-screen">
      <header className="topbar">
        {onBack && (
          <button className="back" onClick={onBack}>
            ← Back
          </button>
        )}
        <button className="end" onClick={endQuiz}>
          End quiz
        </button>
      </header>

      <div className="content">
        <p className="meta progress">
          <span className="level">
            {LEVEL_NAMES[question.level]} · {number} of 3
          </span>
          <span className="sep"> · </span>
          <span className="subject">{SUBJECT_NAMES[question.subject]}</span>
        </p>
        <p className="question">{question.q}</p>

        <button onClick={onSwap} disabled={!canSwap}>
          Swap question
        </button>

        <section className="answer">
          {answersLabel && <p className="answer-label">{answersLabel}</p>}
          <ul>
            {question.answers.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
          {question.note && <p className="note">{question.note}</p>}
        </section>
      </div>

      <div className="actions sticky">
        <div className="pair">
          <button className="missed" onClick={() => onMark(false)}>
            <span className="icon" aria-hidden="true">
              ✗
            </span>
            Missed it
          </button>
          <button className="got" onClick={() => onMark(true)}>
            <span className="icon" aria-hidden="true">
              ✓
            </span>
            Got it
          </button>
        </div>
      </div>
    </main>
  )
}

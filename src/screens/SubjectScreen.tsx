import Logo from '../Logo.tsx'
import { DEPARTMENT_NAMES, SUBJECT_NAMES, readySubjects, type Department } from '../questions.ts'
import { canMix } from '../quiz.ts'

type Props = {
  department: Department
  onPick: (subject: string) => void
  onMixed: () => void
  onBack: () => void
}

export default function SubjectScreen({ department, onPick, onMixed, onBack }: Props) {
  return (
    <main className="screen">
      <header className="topbar">
        <button className="pill" onClick={onBack}>
          ← Back
        </button>
        <Logo />
      </header>
      <div className="bottom-group">
        <div className="heading-block">
          <p className="kicker">{DEPARTMENT_NAMES[department]}</p>
          <h1>Best subject?</h1>
        </div>
        <div className="buttons">
          {canMix(department) && (
            <button className="primary" onClick={onMixed}>
              Mixed
            </button>
          )}
          {readySubjects(department).map((subject) => (
            <button key={subject} onClick={() => onPick(subject)}>
              {SUBJECT_NAMES[subject]}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

import { DEPARTMENT_NAMES, SUBJECT_NAMES, readySubjects, type Department } from '../questions.ts'

type Props = {
  department: Department
  onPick: (subject: string) => void
  onBack: () => void
}

export default function SubjectScreen({ department, onPick, onBack }: Props) {
  return (
    <main className="screen">
      <header className="topbar">
        <button className="back" onClick={onBack}>
          ← Back
        </button>
      </header>
      <div className="content">
        <h1>{DEPARTMENT_NAMES[department]} subject</h1>
      </div>
      <div className="actions">
        {readySubjects(department).map((subject) => (
          <button key={subject} onClick={() => onPick(subject)}>
            {SUBJECT_NAMES[subject]}
          </button>
        ))}
      </div>
    </main>
  )
}

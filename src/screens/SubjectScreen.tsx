import {
  DEPARTMENT_NAMES,
  DEPARTMENT_SUBJECTS,
  SUBJECT_NAMES,
  notReadyLabel,
  type Department,
} from '../questions.ts'

type Props = {
  department: Department
  onPick: (subject: string) => void
  onBack: () => void
}

export default function SubjectScreen({ department, onPick, onBack }: Props) {
  return (
    <main className="screen">
      <button className="back" onClick={onBack}>
        ← Back
      </button>
      <h1>{DEPARTMENT_NAMES[department]} subject</h1>
      <div className="buttons">
        {DEPARTMENT_SUBJECTS[department].map((subject) => {
          const notReady = notReadyLabel(subject)
          return (
            <button key={subject} onClick={() => onPick(subject)} disabled={notReady !== null}>
              {SUBJECT_NAMES[subject]}
              {notReady && <span className="sub">{notReady}</span>}
            </button>
          )
        })}
      </div>
    </main>
  )
}

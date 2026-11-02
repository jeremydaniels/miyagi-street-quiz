import { DEPARTMENT_NAMES, type Department } from '../questions.ts'

type Props = {
  onPick: (department: Department) => void
  onBack: () => void
}

const DEPARTMENTS: Department[] = ['science', 'commercial', 'art']

export default function DepartmentScreen({ onPick, onBack }: Props) {
  return (
    <main className="screen">
      <button className="back" onClick={onBack}>
        ← Back
      </button>
      <h1>Department</h1>
      <div className="buttons">
        {DEPARTMENTS.map((d) => (
          <button key={d} onClick={() => onPick(d)}>
            {DEPARTMENT_NAMES[d]}
          </button>
        ))}
      </div>
    </main>
  )
}

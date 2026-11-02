import { DEPARTMENT_NAMES, type Department } from '../questions.ts'

type Props = {
  onPick: (department: Department) => void
  onBack: () => void
}

const DEPARTMENTS: Department[] = ['science', 'commercial', 'art']

export default function DepartmentScreen({ onPick, onBack }: Props) {
  return (
    <main className="screen">
      <header className="topbar">
        <button className="back" onClick={onBack}>
          ← Back
        </button>
      </header>
      <div className="content">
        <h1>Department</h1>
      </div>
      <div className="actions">
        {DEPARTMENTS.map((d) => (
          <button key={d} onClick={() => onPick(d)}>
            {DEPARTMENT_NAMES[d]}
          </button>
        ))}
      </div>
    </main>
  )
}

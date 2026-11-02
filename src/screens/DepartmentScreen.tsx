import Logo from '../Logo.tsx'
import { DEPARTMENT_NAMES, readyDepartments, type Department } from '../questions.ts'

type Props = {
  onPick: (department: Department) => void
  onBack: () => void
}

export default function DepartmentScreen({ onPick, onBack }: Props) {
  return (
    <main className="screen">
      <header className="topbar">
        <button className="pill" onClick={onBack}>
          ← Back
        </button>
        <Logo />
      </header>
      <div className="bottom-group">
        <h1>Which department?</h1>
        <div className="buttons">
          {readyDepartments().map((d) => (
            <button key={d} onClick={() => onPick(d)}>
              {DEPARTMENT_NAMES[d]}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

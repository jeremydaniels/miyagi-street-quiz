import { useState } from 'react'
import Logo from '../Logo.tsx'
import { isReady, readyDepartments } from '../questions.ts'

type Props = {
  onDepartment: () => void
  onGeneral: () => void
  onResetQuestions: () => void
}

export default function RouteScreen({ onDepartment, onGeneral, onResetQuestions }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const showDepartment = readyDepartments().length > 0
  const showGeneral = isReady('general')

  function resetQuestions() {
    if (window.confirm('Reset all questions? Questions already asked will come up again.')) {
      onResetQuestions()
    }
    setMenuOpen(false)
  }

  return (
    <main className="screen dots">
      <header className="topbar">
        <div className="brand">
          <Logo />
          <span>Street Quiz</span>
        </div>
        <button className="pill" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
          Menu
        </button>
      </header>
      {menuOpen && (
        <div className="menu">
          <button onClick={resetQuestions}>Reset questions</button>
        </div>
      )}
      <div className="bottom-group">
        <h1>What kind of questions?</h1>
        {!showDepartment && !showGeneral ? (
          <p className="message">There are no questions yet.</p>
        ) : (
          <div className="buttons">
            {showDepartment && (
              <button className="primary" onClick={onDepartment}>
                By department
              </button>
            )}
            {showGeneral && <button onClick={onGeneral}>General</button>}
          </div>
        )}
      </div>
    </main>
  )
}

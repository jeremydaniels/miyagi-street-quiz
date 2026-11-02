import { useState } from 'react'
import { notReadyLabel } from '../questions.ts'

type Props = {
  personCount: number
  onDepartment: () => void
  onGeneral: () => void
  onNewShoot: () => void
}

export default function RouteScreen({ personCount, onDepartment, onGeneral, onNewShoot }: Props) {
  const [menuOpen, setMenuOpen] = useState(false)
  const generalNotReady = notReadyLabel('general')

  function newShoot() {
    if (
      window.confirm(
        'Start a new shoot? This resets the person count to 0 and reshuffles every question.',
      )
    ) {
      onNewShoot()
    }
    setMenuOpen(false)
  }

  return (
    <main className="screen">
      <div className="topbar">
        <p className="meta">People this shoot: {personCount}</p>
        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen}>
          Menu
        </button>
      </div>
      {menuOpen && (
        <div className="menu">
          <button onClick={newShoot}>New shoot</button>
        </div>
      )}
      <h1>Choose a route</h1>
      <div className="buttons">
        <button onClick={onDepartment}>Department</button>
        <button onClick={onGeneral} disabled={generalNotReady !== null}>
          General
          {generalNotReady && <span className="sub">{generalNotReady}</span>}
        </button>
      </div>
    </main>
  )
}

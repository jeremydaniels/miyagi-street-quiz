import Logo from '../Logo.tsx'
import { COUNTS, type Count } from '../quiz.ts'

type Props = {
  label: string
  onPick: (count: Count) => void
  onBack: () => void
}

export default function CountScreen({ label, onPick, onBack }: Props) {
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
          <p className="kicker">{label}</p>
          <h1>How many questions?</h1>
        </div>
        <div className="buttons">
          {COUNTS.map((count) => (
            <button key={count} onClick={() => onPick(count)}>
              {count}
            </button>
          ))}
        </div>
      </div>
    </main>
  )
}

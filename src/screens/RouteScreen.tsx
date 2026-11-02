import { notReadyLabel } from '../questions.ts'

type Props = {
  personCount: number
  onDepartment: () => void
  onGeneral: () => void
}

export default function RouteScreen({ personCount, onDepartment, onGeneral }: Props) {
  const generalNotReady = notReadyLabel('general')
  return (
    <main className="screen">
      <p className="meta">People this shoot: {personCount}</p>
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

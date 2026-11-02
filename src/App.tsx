import { useState } from 'react'
import { LEVELS, type Department, type Question } from './questions.ts'
import { draw, newShoot, savePersonCount, savedPersonCount } from './decks.ts'
import RouteScreen from './screens/RouteScreen.tsx'
import DepartmentScreen from './screens/DepartmentScreen.tsx'
import SubjectScreen from './screens/SubjectScreen.tsx'
import QuestionScreen from './screens/QuestionScreen.tsx'
import ScoreScreen, { type Result } from './screens/ScoreScreen.tsx'

type Screen =
  | { name: 'route' }
  | { name: 'department' }
  | { name: 'subject'; department: Department }
  | { name: 'question'; department: Department | null; question: Question; results: Result[] }
  | { name: 'score'; results: Result[] }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'route' })
  const [personCount, setPersonCount] = useState(savedPersonCount)

  function startQuiz(subject: string, department: Department | null) {
    setScreen({ name: 'question', department, question: draw(subject, 'easy'), results: [] })
  }

  switch (screen.name) {
    case 'route':
      return (
        <RouteScreen
          personCount={personCount}
          onDepartment={() => setScreen({ name: 'department' })}
          onGeneral={() => startQuiz('general', null)}
          onNewShoot={() => {
            newShoot()
            setPersonCount(0)
          }}
        />
      )

    case 'department':
      return (
        <DepartmentScreen
          onPick={(department) => setScreen({ name: 'subject', department })}
          onBack={() => setScreen({ name: 'route' })}
        />
      )

    case 'subject':
      return (
        <SubjectScreen
          department={screen.department}
          onPick={(subject) => startQuiz(subject, screen.department)}
          onBack={() => setScreen({ name: 'department' })}
        />
      )

    case 'question': {
      const { department, question, results } = screen
      // Back is only offered before anything has been marked.
      const onBack =
        results.length > 0
          ? undefined
          : () =>
              setScreen(department ? { name: 'subject', department } : { name: 'route' })
      return (
        <QuestionScreen
          key={question.id}
          question={question}
          number={results.length + 1}
          onBack={onBack}
          onSwap={() =>
            setScreen({ ...screen, question: draw(question.subject, question.level) })
          }
          onMark={(gotIt) => {
            const nextResults = [...results, { question, gotIt }]
            const nextLevel = LEVELS[nextResults.length]
            setScreen(
              nextLevel
                ? { ...screen, question: draw(question.subject, nextLevel), results: nextResults }
                : { name: 'score', results: nextResults },
            )
          }}
          onEnd={() => setScreen({ name: 'route' })}
        />
      )
    }

    case 'score':
      return (
        <ScoreScreen
          results={screen.results}
          onNextPerson={() => {
            const next = personCount + 1
            savePersonCount(next)
            setPersonCount(next)
            setScreen({ name: 'route' })
          }}
        />
      )
  }
}

import { useState } from 'react'
import { type Department, type Question } from './questions.ts'
import { resetQuestions } from './decks.ts'
import { applyWaitingUpdate } from './pwa.ts'
import { canSwap, choiceLabel, drawQuestion, levelPlan, type Choice, type Count } from './quiz.ts'
import RouteScreen from './screens/RouteScreen.tsx'
import DepartmentScreen from './screens/DepartmentScreen.tsx'
import SubjectScreen from './screens/SubjectScreen.tsx'
import CountScreen from './screens/CountScreen.tsx'
import QuestionScreen from './screens/QuestionScreen.tsx'
import ScoreScreen, { type Result } from './screens/ScoreScreen.tsx'

type Quiz = { choice: Choice; count: Count }

type Screen =
  | { name: 'route' }
  | { name: 'department' }
  | { name: 'subject'; department: Department }
  | { name: 'count'; choice: Choice }
  | { name: 'question'; quiz: Quiz; question: Question; results: Result[] }
  | { name: 'score'; quiz: Quiz; results: Result[] }

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'route' })

  function startQuiz(choice: Choice, count: Count) {
    const first = levelPlan(count)[0]
    setScreen({ name: 'question', quiz: { choice, count }, question: drawQuestion(choice, first), results: [] })
  }

  // The screen before "How many questions?": Subject on the Department route, start on General.
  function beforeCount(choice: Choice): Screen {
    return choice.department ? { name: 'subject', department: choice.department } : { name: 'route' }
  }

  switch (screen.name) {
    case 'route':
      return (
        <RouteScreen
          onDepartment={() => setScreen({ name: 'department' })}
          onGeneral={() => setScreen({ name: 'count', choice: { kind: 'subject', subject: 'general', department: null } })}
          onResetQuestions={() => {
            resetQuestions()
            // The reset is already saved, so this is the one safe moment to switch versions.
            applyWaitingUpdate()
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

    case 'subject': {
      const { department } = screen
      return (
        <SubjectScreen
          department={department}
          onPick={(subject) => setScreen({ name: 'count', choice: { kind: 'subject', subject, department } })}
          onMixed={() => setScreen({ name: 'count', choice: { kind: 'mixed', department } })}
          onBack={() => setScreen({ name: 'department' })}
        />
      )
    }

    case 'count': {
      const { choice } = screen
      return (
        <CountScreen
          label={choiceLabel(choice)}
          onPick={(count) => startQuiz(choice, count)}
          onBack={() => setScreen(beforeCount(choice))}
        />
      )
    }

    case 'question': {
      const { quiz, question, results } = screen
      const plan = levelPlan(quiz.count)
      return (
        <QuestionScreen
          key={question.id}
          question={question}
          number={results.length + 1}
          total={quiz.count}
          canSwap={canSwap(quiz.choice, question.level)}
          // Back is only offered before anything has been marked.
          onBack={results.length > 0 ? undefined : () => setScreen({ name: 'count', choice: quiz.choice })}
          onSwap={() =>
            setScreen({ ...screen, question: drawQuestion(quiz.choice, question.level, question.subject) })
          }
          onMark={(gotIt) => {
            const nextResults = [...results, { question, gotIt }]
            const nextLevel = plan[nextResults.length]
            setScreen(
              nextLevel
                ? { ...screen, question: drawQuestion(quiz.choice, nextLevel, question.subject), results: nextResults }
                : { name: 'score', quiz, results: nextResults },
            )
          }}
          onEnd={() => setScreen({ name: 'route' })}
        />
      )
    }

    case 'score':
      return (
        <ScoreScreen
          label={choiceLabel(screen.quiz.choice)}
          results={screen.results}
          onNextPerson={() => setScreen({ name: 'route' })}
        />
      )
  }
}

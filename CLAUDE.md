# Miyagi Street Quiz

A phone app (PWA) used by an interviewer during street quizzes with JAMB students in Lagos. The interviewer taps through the flow as the conversation happens: route, department, subject, then three questions (easy, medium, hard), then a score.

**Read `docs/spec.md` before starting any task.** It is the source of truth for the flow, the rules for questions, and the deck logic.

## Stack

- Vite + React + TypeScript (strict mode)
- Plain CSS. No UI library or CSS framework unless approved.
- PWA support added in its own task (likely `vite-plugin-pwa`, to be approved at that point)
- Hosted on Vercel
- No backend, no database, no accounts, no analytics

## How we work

- **Show a plan and wait for approval before writing any code.**
- **Ask before adding any dependency**, including dev dependencies.
- One task per prompt. Respect anything the prompt marks as out of scope, even if it looks like a quick win.
- Work directly on `main`. Commit once per task with a clear message. No branches, no PRs.
- Keep the code small and readable. Prefer a few clear components over abstraction.

## Data

- The question bank is the folder `data/questions/`, one JSON file per subject (`biology.json`, `general.json`, ...). It is the source of truth.
- The app loads every file in that folder automatically (Vite's `import.meta.glob`), so adding a question file for an existing subject needs no code change.
- Subject ids and display names live in `src/subjects.json`. To add a new subject, add it there, add it to the right department in `DEPARTMENT_SUBJECTS` in `src/questions.ts`, then add its question file.
- Never write, rewrite, or delete questions unless the task asks for it. Questions are written and checked by hand for Nigerian phrasing.
- A validation check (`scripts/validate-questions.mjs`) runs first on every build and fails it if any question file has a problem: invalid JSON, a missing or duplicate id, an unknown subject or one that doesn't match the file name, a bad level or `match`, an empty question or answer, or a note that isn't text. It lists every problem in plain words. Run it on its own with `npm run check-questions`.

## Design constraints

- Phone-first and one-handed: the interviewer holds the phone while talking to someone.
- Large tap targets (at least 56px tall) and large question text.
- End quiz is a deliberate exception to the 56px rule: it's 44px tall and set apart from the main buttons so it's hard to tap by accident.
- High contrast, readable in bright sunlight.
- Must work fully offline once installed.
- Every screen needs a clear way back, except after a question has been marked.

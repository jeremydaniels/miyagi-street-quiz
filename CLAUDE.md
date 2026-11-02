# Miyagi Street Quiz

A phone app (PWA) used by an interviewer during street quizzes with JAMB students in Lagos. The interviewer taps through the flow as the conversation happens: route, department, subject, then three questions (easy, medium, hard), then a score.

**Read `docs/spec.md` before starting any task.** It is the source of truth for the flow, the rules for questions, and the deck logic.

## Stack

- Vite + React + TypeScript (strict mode)
- Plain CSS. No UI library or CSS framework unless approved.
- PWA via `vite-plugin-pwa` (manifest and service worker settings in `vite.config.ts`, registration in `src/pwa.ts`)
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
- Top-bar pills (Back, Menu and End quiz) are a deliberate exception to the 56px rule: they're 44px tall and sit in the top bar, away from the thumb zone and the main buttons, so they're hard to tap by accident.
- High contrast, readable in bright sunlight.
- Must work fully offline once installed.
- Updates download in the background and wait. A new version takes effect only when the app is next opened fresh, or when Reset questions is confirmed (after the reset is saved). Nothing else may ever reload the app: no update popups, no reload mid-quiz. See `src/pwa.ts`.
- Branding: colours, type, spacing and radii are CSS variables at the top of `src/index.css` (every text colour pair there reaches 7:1). The font is Outfit, self-hosted in `src/assets/fonts/` (variable `woff2`, SIL Open Font License in `OFL.txt`). The Miyagi mark is `src/assets/miyagi-mark.png`.
- App icons in `public/icons/` are the Miyagi mark centred on white. To change them, replace the files with new ones of the same names and sizes: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (keep the design inside the middle 80%), `apple-touch-icon.png` (180×180, no transparency) and `favicon.svg`.
- Every screen needs a clear way back, except after a question has been marked.

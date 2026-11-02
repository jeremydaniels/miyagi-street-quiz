# Spec: Miyagi Street Quiz

## What this is

Miyagi Labs is filming street quizzes with JAMB students in Lagos. An interviewer walks up to a student, confirms they're writing JAMB (that part happens off-app), and quizzes them on camera. This app is the interviewer's clicker: each tap matches what was just said out loud, so the interviewer never stops to type.

The person using the app is the interviewer, not the student.

## The flow

### 1. Route

Heading: "What kind of questions?". Two big buttons: **By department** (the orange primary button) and **General**. The top bar shows the Miyagi mark with "Street Quiz" on the left.

Also on this screen: a menu with **Reset questions** (see Deck logic).

The app's text never uses the word "route"; it's only the name used in these docs and the code.

### 2. Department (Department route only)

Heading: "Which department?". Three buttons: **Science**, **Commercial**, **Art**. Back goes to Route.

### 3. Subject (Department route only)

The department name (small, in orange) above the heading "Best subject?", then **Mixed** (the orange primary button) followed by the ready subjects for that department (see below). Picking a subject or Mixed goes to "How many questions?". Back goes to Department.

| Department | Subjects |
|---|---|
| Science | Physics, Chemistry, Biology, Mathematics, Agric, English |
| Commercial | Commerce, Accounting, Economics, Mathematics, English |
| Art | Government, Literature, CRS, IRS, History, English |

Mathematics and English are the same subject wherever they appear (one shared pool each).

The General route skips screens 2 and 3 and uses the `general` subject: **General** goes straight to "How many questions?".

**Mixed** draws each question from any ready subject in the department (including English and Mathematics), picking a subject at random but not the subject of the question just shown, where another is available. Swap question picks the same way. Mixed is only shown when the department has at least two ready subjects.

Only ready subjects are shown:

- A subject is ready when it has at least one question at every level (easy, medium and hard). Subjects that aren't ready are hidden, not shown disabled.
- If `general` isn't ready, the **General** button is hidden.
- A department with no ready subjects is hidden on the Department screen. If no department has a ready subject, **By department** is hidden.
- If nothing is ready at all, the Route screen shows "There are no questions yet." instead of buttons.
- If a level has only one question, **Swap question** is disabled on that screen.

### 4. How many questions?

What was picked (small, in orange: e.g. "Biology", "Science · Mixed" or "General") above the heading "How many questions?", then four buttons: **3**, **5**, **7**, **10**. Back goes to Subject on the Department route, or to Route on the General route.

### 5. Questions

As many questions as chosen. Difficulty always climbs from easy to hard:

| Count | Easy | Medium | Hard |
|---|---|---|---|
| 3 | 1 | 1 | 1 |
| 5 | 2 | 2 | 1 |
| 7 | 3 | 2 | 2 |
| 10 | 4 | 3 | 3 |

Each question is drawn from its subject's deck for that level (see Deck logic), so there are no repeats until a deck runs out. Each screen shows, top to bottom:

- A thin progress bar with one segment per question, then the level and progress as a tag (e.g. "Medium · 4 of 7") and the question's own subject name (in Mixed this changes from question to question)
- The question, in large text
- **Swap question**, directly under the question: draws another question for the same level, from the same deck (or, in Mixed, the same pool of subjects). For when the student or the crowd has already heard it. Available until the question is marked.
- The answer section, shown straight away (there's no separate reveal step):
  - Label it "Answer". If `match` is `"one"` and there's more than one answer, label it "Answer · any one of these".
  - If `match` is `"all"`, label it "Answer · all of these".
  - Show `note` if present (guidance for the interviewer).
- Two buttons in a bar fixed to the bottom of the screen: **Missed it** and **Got it**. Tapping either moves to the next question. There's no going back after marking. If the question and answers don't fit, the content scrolls and the bar stays put.

The interviewer judges close matches. Students won't always use textbook wording.

Back (before the first question is marked) goes to "How many questions?". Every question screen also has a small **End quiz** button, kept apart from the main buttons so it can't be tapped by accident. It asks "End this quiz?" and, if confirmed, returns to Route. It's there for when a student walks off mid-quiz.

### 6. Score

- The Miyagi mark, the subject name ("General", or the department name and "Mixed", e.g. "Science · Mixed") and a big score out of the chosen count, e.g. **6/7**
- A recap of every question with a tick or cross. If it doesn't fit, the page scrolls.
- **Next person**, fixed to the bottom of the screen: returns to Route

## Rules for questions

These rules matter more than anything else in the app. Questions are written by hand. Code never generates them.

1. **Say it the way you'd ask a student out loud.** Short and plain, with no formal build-up ("Nigeria consists of how many states?" is wrong; "How many states are in Nigeria?" is right).
2. **Use Nigerian classroom wording.** If students memorised a definition in a set form, keep that form, because it's what triggers the answer ("What is the process by which plants make their food?", "What is the basic unit of life?").
3. **One thing per question**, with a short answer: a word, a name, a number, or a short list.
4. **Easy, Medium, Hard are relative to a normal SS3 student.** Hard should still be answerable by a student who has studied that subject.
5. **General questions must be answerable by any student regardless of department**: JSS-level school knowledge (Basic Science, Social Studies, Civic Education, basic English and Maths) or common Nigerian general knowledge. No senior-secondary, department-specific content.
6. **"Mention one" questions list every acceptable answer**, in plain words, so the interviewer can check quickly.
7. **No current affairs or anything that goes out of date** (current office holders, recent events).

Target: about 10 questions per subject per level.

## Question data

Folder: `data/questions/`, one file per subject, named by subject id (e.g. `biology.json`). Each file is an array of question objects for that subject. The app loads every file in the folder automatically.

To add questions, replace or add a subject file on GitHub. Vercel redeploys, and the installed app picks up the new questions the next time it opens with data.

```ts
type Question = {
  id: string;            // unique, e.g. "bio-e-001"
  subject: string;       // one of the subject ids below
  level: "easy" | "medium" | "hard";
  q: string;             // the question as it should be read out
  answers: string[];     // at least one
  match: "one" | "all";  // "one": any listed answer is correct. "all": the student must give all of them
  note?: string;         // optional guidance for the interviewer
};
```

Subject ids: `english`, `physics`, `chemistry`, `biology`, `mathematics`, `agric`, `commerce`, `accounting`, `economics`, `government`, `literature`, `crs`, `irs`, `history`, `general`.

The subject ids and their display names live in `src/subjects.json`. To add a new subject, add it there, add it to the right department in `DEPARTMENT_SUBJECTS` in `src/questions.ts`, then add its question file.

Ids are prefixed by subject and level, e.g. `chm-e-001`, so files never collide.

A build-time validation check fails the build if any file isn't valid JSON or isn't a list, or any question has a missing or duplicate id (across all files), an unknown subject or one that doesn't match its file name, a level that isn't easy, medium or hard, an empty `q`, an empty `answers` array or empty answer, a `match` that isn't "one" or "all", or a `note` that isn't text. It lists every problem, naming the file and question, in plain words. Run it on its own with `npm run check-questions`.

A subject without questions at every level is hidden from the app (see "Only ready subjects are shown" under the Subject screen).

## Deck logic

- Each subject and level pair is its own deck, e.g. `government:easy`.
- A deck is a shuffled list of question ids. Each draw (including a swap) takes the next one.
- When a deck runs out, reshuffle all of its questions and keep going. If possible, the first card after a reshuffle should not be the one just shown.
- Decks are saved on the phone (localStorage), so closing the app doesn't reset anything.
- **Reset questions** (in the Route screen's menu) reshuffles every deck, so questions already asked can come up again. It asks "Reset all questions? Questions already asked will come up again." first.
- When questions are added to the file, new ids join their deck on the next reshuffle (or immediately, if simpler).

## PWA

- Installable to the home screen on Android and iPhone, with an app name and icon.
- Works fully offline after the first load, including the question bank.
- Portrait only.

## Out of scope for v1

- Any backend, database, login, or analytics
- Editing questions inside the app
- Multiple-choice options
- Recording audio or video
- Timers

## Open questions

- Miyagi branding: colours, logo, and app name on the home screen.
- Whether the score screen should show a line for the camera, like a Miyagi call to action.

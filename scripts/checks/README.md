# Check scripts

Browser checks used while building the app. They drive the built app in a headless Chromium
browser and print `PASS` / `FAIL` lines, ending with `ALL PASSED` or `N FAILED` (and a non-zero
exit code on failure).

They are **not** part of the build, `npm run build`, or the Vercel deploy. Run them by hand.

**They never create, change or delete anything in `data/questions/`.** They only read it. Checks
that need incomplete, missing or changed questions use test builds made by `test-build.cjs` in a
temporary copy of the repo (see below), which is deleted afterwards.

## What you need

- **Node.js** (the same one used for the app).
- **Playwright with Chromium.** It is *not* in `package.json`, on purpose. Before running the
  checks, install it without saving it to the project:

  ```sh
  npm install --no-save playwright
  npx playwright install chromium
  ```

  `--no-save` leaves `package.json` and `package-lock.json` untouched. Running `npm install`
  again later removes it; just repeat the two commands.
- **ImageMagick** (optional): only for gluing screenshots into a sheet, see the end of this page.

All commands below are run from the repo root.

## The files

| File | What it is |
|---|---|
| `flow-check.cjs` | The whole flow on the real questions: start screen, every department's full subject list, answers shown straight away, Swap position and behaviour, "Answer" labels, notes, progress bar, Back rules, End quiz text and position, score and recap, Next person. |
| `style-check.cjs` | Screenshots of every screen at Android 412×915 and iPhone SE 375×667, plus: no overflow or cut-off text (including the longest question and the longest answer list in the bank), last answer clears the bottom bar, buttons ≥ 56px (top-bar pills 44px), text contrast ≥ 7:1, pill outlines ≥ 3:1, no thin text, Outfit font in use, dot grid only where it belongs, visible focus, no animation, stays light in dark mode, no "route"/"shoot" in any text. |
| `deck-check.cjs` | Deck logic and saved data: a subject missing a level is hidden, Swap disabled when a level has one question, every card shown before a repeat (made-up 4-card and 2-card decks, and the real 10-card General easy deck), no repeat across a reshuffle, decks survive a reload, new ids join the round, old/broken/stale saved data, Reset questions, blocked storage. |
| `visibility-check.cjs` | Hiding rules: a department with no ready subjects and General hidden (variant B); nothing ready shows "There are no questions yet." (variant C). |
| `pwa-check.cjs` | Installable (Chrome's own checks, iOS tags), works fully offline after one load (including font and logo), updates download quietly with no reload, a fresh open runs the new version, Reset questions applies a waiting update. |
| `test-build.cjs` | Makes the test builds the last three checks need. |
| `lib.cjs` | Helpers shared by the checks (reading questions, opening a specific question, a tiny static server). |

The flow and style checks open specific questions by setting the saved deck order before starting a
quiz, so they don't depend on which card happens to come up.

## Test builds (`test-build.cjs`)

```sh
node scripts/checks/test-build.cjs <variant> <out folder>
```

It copies the repo to a temporary folder (linking `node_modules`), changes **only that copy**, runs
the question check and the Vite build there, copies `dist/` to the out folder and deletes the copy.
The out folder must be outside the repo.

| Variant | What's different in the copy | Used by |
|---|---|---|
| `real` | Nothing | `pwa-check` (v1) |
| `updated` | The text of `gen-e-001` becomes "UPDATED: What is the capital of Nigeria?" | `pwa-check` (v2) |
| `test-subjects` | Three made-up Science subjects are added (to `subjects.json`, the Science list and their own question files): **Test Deck** (4 easy, 4 medium, 2 hard), **Test Single** (1 per level, so Swap is disabled), **Test Partial** (no hard questions, so it must be hidden) | `deck-check` |
| `some-missing` | Only `biology.json` and `commerce.json` are kept | `visibility-check` B |
| `nothing-ready` | No real question files; only Test Partial | `visibility-check` C |

## Running them

### Flow and style (real build)

```sh
npm run build
npm run preview          # leave running, in its own terminal (port 4173)
node scripts/checks/flow-check.cjs
node scripts/checks/style-check.cjs   # screenshots go to scripts/checks/output/shots/
```

### Deck, visibility and PWA (test builds; each serves its own build)

```sh
node scripts/checks/test-build.cjs test-subjects /tmp/msq/test-subjects
node scripts/checks/test-build.cjs some-missing  /tmp/msq/some-missing
node scripts/checks/test-build.cjs nothing-ready /tmp/msq/nothing-ready
node scripts/checks/test-build.cjs real          /tmp/msq/real
node scripts/checks/test-build.cjs updated       /tmp/msq/updated

node scripts/checks/deck-check.cjs /tmp/msq/test-subjects                  # port 4191
node scripts/checks/visibility-check.cjs /tmp/msq/some-missing B           # port 4190
node scripts/checks/visibility-check.cjs /tmp/msq/nothing-ready C          # port 4190
node scripts/checks/pwa-check.cjs /tmp/msq/real /tmp/msq/updated           # port 4180
```

Afterwards, `git status data/` should show nothing.

## If the questions change

- `flow-check` expects every subject to be ready and lists each department's subjects in order.
  Update `EXPECTED_SUBJECTS` there if subjects are added, removed or reordered.
- It also opens a few specific questions by id (`com-e-001`, `com-e-002`, `com-e-003`,
  `com-m-001`, `com-h-002`). If those change, pick others with the same properties: one answer,
  `match: "all"`, and a "Mention one" question with a note.
- `style-check` finds the longest question, the longest answer list and a General medium question
  with a note on its own.
- `test-build.cjs` changes the text "What is the capital of Nigeria?" for the `updated` build; if
  that question changes, update the text there.

## Screenshot sheets (optional)

With ImageMagick installed, glue the screenshots into one image per phone size:

```sh
cd scripts/checks/output/shots
montage iphone-se-375x667-*.png -thumbnail x700 -tile 6x -geometry +14+14 -background '#bbbbbb' ../sheet-iphone.png
montage android-412x915-*.png -thumbnail x700 -tile 6x -geometry +14+14 -background '#bbbbbb' ../sheet-android.png
```

`scripts/checks/output/` is ignored by git.

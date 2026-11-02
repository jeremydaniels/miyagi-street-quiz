# Check scripts

Browser checks used while building the app. They drive the built app in a headless Chromium
browser and print `PASS` / `FAIL` lines, ending with `ALL PASSED` or `N FAILED` (and a non-zero
exit code on failure).

They are **not** part of the build, `npm run build`, or the Vercel deploy. Run them by hand.

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

## The five checks

| Script | What it checks | Needs |
|---|---|---|
| `flow-check.cjs` | The whole flow on the real questions: start screen wording, departments and subjects shown, answers shown straight away, Swap position and behaviour, labels and notes, Back rules, End quiz text and position, score and recap, Next person. | Real build on `npm run preview` |
| `style-check.cjs` | Screenshots of every screen at Android 412×915 and iPhone SE 375×667, plus: no overflow or cut-off text (including the longest question and the longest answer list), last answer clears the bottom bar, buttons ≥ 56px (End quiz 44px), text contrast ≥ 7:1, no thin text, visible focus, no animation, stays light in dark mode, no "route"/"shoot" in any text. | Real build on `npm run preview` |
| `deck-check.cjs` | Deck logic and saved data: not-ready subjects hidden, Swap disabled for a single question, every card shown before a repeat, no repeat across a reshuffle, decks survive a reload, new ids join the round, old/broken/stale saved data, Reset questions, blocked storage. | Build **with the two test files below**, on `npm run preview` |
| `visibility-check.cjs` | Hiding rules: a department with no ready subjects and General hidden (variant B); nothing ready shows "There are no questions yet." (variant C). | Two special builds, below. Serves them itself |
| `pwa-check.cjs` | Installable (Chrome's own checks, iOS tags), works fully offline after one load, updates download quietly with no reload, a fresh open runs the new version, Reset questions applies a waiting update. | Two builds, v1 and v2, below. Serves them itself |

## Running them

### Flow and style (real questions)

```sh
npm run build
npm run preview          # leave running, in its own terminal (port 4173)
node scripts/checks/flow-check.cjs
node scripts/checks/style-check.cjs   # screenshots go to scripts/checks/output/shots/
```

### Deck check (temporary test questions)

Add these two files to `data/questions/`, then build and preview as above and run
`node scripts/checks/deck-check.cjs`. They give a subject with no hard questions (Physics, should
be hidden) and a subject with one medium question (Chemistry, Swap disabled there).

`data/questions/physics.json`

```json
[
  {"id": "phy-e-001", "subject": "physics", "level": "easy", "q": "TEST physics easy 1", "answers": ["a"], "match": "one"},
  {"id": "phy-e-002", "subject": "physics", "level": "easy", "q": "TEST physics easy 2", "answers": ["a"], "match": "one"},
  {"id": "phy-e-003", "subject": "physics", "level": "easy", "q": "TEST physics easy 3", "answers": ["a"], "match": "one"},
  {"id": "phy-m-001", "subject": "physics", "level": "medium", "q": "TEST physics medium 1", "answers": ["a"], "match": "one"}
]
```

`data/questions/chemistry.json`

```json
[
  {"id": "chm-e-001", "subject": "chemistry", "level": "easy", "q": "TEST chemistry easy 1", "answers": ["a"], "match": "one"},
  {"id": "chm-e-002", "subject": "chemistry", "level": "easy", "q": "TEST chemistry easy 2", "answers": ["a"], "match": "one"},
  {"id": "chm-e-003", "subject": "chemistry", "level": "easy", "q": "TEST chemistry easy 3", "answers": ["a"], "match": "one"},
  {"id": "chm-m-001", "subject": "chemistry", "level": "medium", "q": "TEST chemistry medium 1", "answers": ["a"], "match": "one"},
  {"id": "chm-h-001", "subject": "chemistry", "level": "hard", "q": "TEST chemistry hard 1", "answers": ["a"], "match": "one"},
  {"id": "chm-h-002", "subject": "chemistry", "level": "hard", "q": "TEST chemistry hard 2", "answers": ["a"], "match": "one"}
]
```

These assume Physics and Chemistry have no real questions yet. If they do, use two other
Science subjects that don't, and adjust the names in the script.

### Visibility check (two special builds)

Each build is copied out of `dist/` before the next one replaces it.

- **Variant B:** temporarily remove `government.json` and `general.json` from `data/questions/`,
  run `npm run build`, copy `dist/` to e.g. `/tmp/varB`.
- **Variant C:** temporarily leave only this one file in `data/questions/`, run `npm run build`,
  copy `dist/` to e.g. `/tmp/varC`:

  `data/questions/physics.json`

  ```json
  [{"id": "phy-e-001", "subject": "physics", "level": "easy", "q": "TEST", "answers": ["a"], "match": "one"}]
  ```

```sh
node scripts/checks/visibility-check.cjs /tmp/varB B
node scripts/checks/visibility-check.cjs /tmp/varC C
```

### PWA check (two versions)

- **v1:** `npm run build` with the real questions, copy `dist/` to e.g. `/tmp/v1`.
- **v2:** temporarily change `"What is the capital of Nigeria?"` in `general.json` to
  `"UPDATED: What is the capital of Nigeria?"`, run `npm run build`, copy `dist/` to e.g. `/tmp/v2`.

```sh
node scripts/checks/pwa-check.cjs /tmp/v1 /tmp/v2
```

## Afterwards: put the questions back

The deck, visibility and PWA checks all need temporary changes to `data/questions/`. **Never
commit them.** When you're done:

```sh
rm -f data/questions/physics.json data/questions/chemistry.json   # only if they're test files
git checkout -- data/questions
git status data/                                                   # should show nothing
npm run build
```

Check the `rm` line first: if Physics or Chemistry ever get real question files, don't delete them.

## Screenshot sheets (optional)

With ImageMagick installed, glue the screenshots into one image per phone size:

```sh
cd scripts/checks/output/shots
montage iphone-se-375x667-*.png -thumbnail x700 -tile 6x -geometry +14+14 -background '#bbbbbb' ../sheet-iphone.png
montage android-412x915-*.png -thumbnail x700 -tile 6x -geometry +14+14 -background '#bbbbbb' ../sheet-android.png
```

`scripts/checks/output/` is ignored by git.

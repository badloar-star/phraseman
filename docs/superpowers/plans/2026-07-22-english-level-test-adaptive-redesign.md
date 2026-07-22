# English Level Test Adaptive Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the uncalibrated theta-based English test with a transparent A1-first staircase, repair and validate the 240-item bank, remove false precision, and deploy the verified result.

**Architecture:** `engine.js` remains the single owner of routing, deterministic option shuffling, stopping, and result interpretation. The six level JSON files remain authoritative; the generator validates them and produces byte-deterministic web/functions outputs without writing during `--check`. `app.js` and `certificate.js` render the engine result but do not calculate proficiency.

**Tech Stack:** Browser JavaScript, Node.js 22 `node:test`, JSON content banks, Firebase Hosting, Firebase Functions only when the API contract changes.

---

### Task 1: Lock the adaptive routing contract in RED tests

**Files:**
- Create: `functions-english-test/adaptive_engine_contract.test.js`
- Modify: `knowly-www/english-level-test/engine.js`

- [ ] **Step 1: Write failing engine tests**

Load `engine.js` in a VM with a real question bank and add assertions equivalent to:

```js
test('starts with two simple A1 anchors of different skills', () => {
  const engine = createEngine(1);
  const first = engine.pickNextQuestion();
  answer(engine, first, true);
  const second = engine.pickNextQuestion();
  assert.equal(first.level, 'A1');
  assert.equal(second.level, 'A1');
  assert.notEqual(first.skill, second.skill);
  assert.ok(first.difficulty <= A1_ANCHOR_MAX_DIFFICULTY);
  assert.ok(second.difficulty <= A1_ANCHOR_MAX_DIFFICULTY);
});

test('an error or skip lowers the next challenge and never promotes', () => {
  const engine = createEngine(2);
  completeTwoCorrectA1Anchors(engine);
  const a2 = engine.pickNextQuestion();
  answer(engine, a2, false);
  assert.equal(engine.pickNextQuestion().level, 'A1');
});

test('two correct answers promote by one level only', () => {
  const engine = createEngine(3);
  completeTwoCorrectA1Anchors(engine);
  assert.equal(engine.pickNextQuestion().level, 'A2');
});
```

Add complete-route tests for all-wrong, all-skip, all-correct, direct C1/C2 evidence, deterministic option shuffle, and repeatable seeds.

- [ ] **Step 2: Run RED**

Run:

```powershell
node --test functions-english-test/adaptive_engine_contract.test.js
```

Expected: failures showing that calibration starts at A2/B1, options are not shuffled, all-skip returns A1 with confidence, and C2 can be awarded without C2 items.

- [ ] **Step 3: Implement the staircase engine**

Replace theta routing with centralized constants and explicit evidence:

```js
const CONFIG = Object.freeze({
  minQuestions: 12,
  maxQuestions: 20,
  anchorCount: 2,
  promoteAfterCorrect: 2,
  upperLevelEvidence: 3,
  upperLevelCorrect: 2,
});

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
```

The engine must:

- select two low-difficulty A1 anchors with different skills;
- keep `currentLevelIndex`, per-level `{ shown, correct, skipped }`, and the current correct streak;
- promote by one level after two correct answers at the current level;
- demote the next question by one level after an error/skip;
- stop between 12 and 20 questions using direct evidence;
- return `Pre-A1`/`insufficientData` for no A1 evidence;
- require at least three shown/two correct C1 or C2 items for those labels;
- shuffle a shallow question copy with seeded Fisher–Yates and remap `correctIndex`;
- preserve recent-question avoidance and public API names used by `app.js`.

- [ ] **Step 4: Run GREEN and syntax checks**

```powershell
node --test functions-english-test/adaptive_engine_contract.test.js
node --check knowly-www/english-level-test/engine.js
```

Expected: all engine contract tests pass; syntax exits 0.

- [ ] **Step 5: Commit only task files**

```powershell
git add -- functions-english-test/adaptive_engine_contract.test.js knowly-www/english-level-test/engine.js
git commit -m "feat: replace English test routing with A1-first staircase"
```

### Task 2: Make bank generation strict and read-only in check mode

**Files:**
- Create: `functions-english-test/question_bank_quality.test.js`
- Modify: `scripts/generate_english_test_assets.mjs`

- [ ] **Step 1: Write failing validation tests**

Assert that every source item has the new review fields, that the six levels contain 40 items each, that listening is not present, that forbidden meta-answers are absent, and that `--check` preserves hashes of both generated outputs.

```js
const REQUIRED_REVIEW_FIELDS = [
  'targetConstruct',
  'cefrRationale',
  'dialect',
  'reviewStatus',
  'ambiguityNotes',
];

assert.equal(question.reviewStatus, 'reviewed');
assert.ok(['neutral', 'british', 'american'].includes(question.dialect));
assert.ok(!question.options.some((value) => /all (?:are|of the above)/i.test(value)));
```

- [ ] **Step 2: Run RED**

```powershell
node --test functions-english-test/question_bank_quality.test.js
```

Expected: missing review metadata, forbidden meta-answers, skewed per-level answer positions, and write-on-check failures.

- [ ] **Step 3: Strengthen the generator**

Extend `validateQuestion` with:

- required review fields;
- four unique non-empty options;
- `reviewStatus === 'reviewed'`;
- allowed dialect/skills/formats;
- level-specific difficulty ranges;
- no `All of the above`/`All are acceptable`;
- per-level position balance tolerance;
- at least three represented text skills per level.

Refactor generation so `buildOutput()` is pure, normal generation writes both files, and `--check` only compares existing text with the built text.

- [ ] **Step 4: Run the focused tests**

```powershell
node --test functions-english-test/question_bank_quality.test.js
```

Expected: remaining failures only concern source-bank content not yet revised.

- [ ] **Step 5: Commit validator files after Task 3 turns them green**

Do not commit a deliberately failing repository state; stage these files together with Task 3.

### Task 3: Repair and align all six source banks

**Files:**
- Modify: `content/english-test/questions/A1.json`
- Modify: `content/english-test/questions/A2.json`
- Modify: `content/english-test/questions/B1.json`
- Modify: `content/english-test/questions/B2.json`
- Modify: `content/english-test/questions/C1.json`
- Modify: `content/english-test/questions/C2.json`
- Regenerate: `knowly-www/english-level-test/data/questions.en.json`
- Regenerate: `functions-english-test/data/questions.en.json`

- [ ] **Step 1: Add review metadata to every source item**

Every question receives non-empty `targetConstruct`, `cefrRationale`, `dialect`, `reviewStatus: "reviewed"`, and `ambiguityNotes`. Use level-specific rationale that names the actual construct and context; do not use placeholders.

- [ ] **Step 2: Normalize cross-level difficulty ranges**

Use these explicit ranges, with stable ascending order inside each level:

```text
A1: 0.50–1.20
A2: 1.30–2.20
B1: 2.30–3.10
B2: 3.20–3.90
C1: 4.00–4.70
C2: 4.80–5.50
```

- [ ] **Step 3: Rewrite the confirmed broken and ambiguous items**

Repair all IDs listed in design section 6.3. At minimum the corrected forms must include:

```text
en-c1-006: "Seldom has a candidate demonstrated ..."
en-c2-006: "I would sooner hand in my resignation ..."
en-c2-010: "Little did they know that ..."
en-c2-029: one unambiguously correct reduced/passive-relative form; no meta-answer
```

For every ambiguity, change the prompt/context or distractors so only one answer survives. Avoid dialect-dependent distractors unless the prompt names the dialect.

- [ ] **Step 4: Add low-level pragmatics coverage**

Convert appropriate A1/A2 request, café, invitation, permission, and service-context items into genuine contextual-choice pragmatics items. Preserve 40 items per level and retain all existing IDs.

- [ ] **Step 5: Balance stored correct positions per level**

Reorder options and remap `correctIndex` so each level has exactly 10 keys in each stored position. Runtime shuffling remains mandatory as a separate defence.

- [ ] **Step 6: Regenerate outputs**

```powershell
node scripts/generate_english_test_assets.mjs
node scripts/generate_english_test_assets.mjs --check
```

Expected: 240 validated questions; identical output hashes; check performs no writes.

- [ ] **Step 7: Run GREEN bank tests and commit**

```powershell
node --test functions-english-test/question_bank_quality.test.js
```

Expected: all bank-quality tests pass.

```powershell
git add -- scripts/generate_english_test_assets.mjs functions-english-test/question_bank_quality.test.js content/english-test/questions knowly-www/english-level-test/data/questions.en.json functions-english-test/data/questions.en.json
git commit -m "fix: align English test bank and answer keys"
```

### Task 4: Remove false precision from result, certificate, and landing copy

**Files:**
- Create: `functions-english-test/client_assessment_copy_contract.test.js`
- Modify: `knowly-www/english-level-test/app.js`
- Modify: `knowly-www/english-level-test/certificate.js`
- Modify: `knowly-www/english-level-test/index.html`

- [ ] **Step 1: Write failing copy and result tests**

Require:

- no `statConfidence`, `result.confidence`, or certificate `Confidence`;
- no `Точная оценка` claim;
- visible preliminary text-scope wording;
- neutral `Pre-A1`/insufficient-data wording;
- question count/progress based on the new maximum 20;
- unified asset revision bump from `20260722-2` to the next revision.

- [ ] **Step 2: Run RED**

```powershell
node --test functions-english-test/client_assessment_copy_contract.test.js
```

Expected: failures on old confidence/index UI and exact-assessment copy.

- [ ] **Step 3: Update result rendering**

Render level, correct answers, and answered/total. For insufficient data render the neutral message from the design. Preserve CTA, certificate creation, share, live counter, consent, and analytics behavior.

- [ ] **Step 4: Update certificate and share copy**

Replace the certificate subtitle with a text-scope statement such as:

```text
Preliminary text-based assessment · 14/18 correct
```

Do not claim official certification or confidence. `Pre-A1` remains a valid filename-safe label.

- [ ] **Step 5: Run GREEN and syntax checks**

```powershell
node --test functions-english-test/client_assessment_copy_contract.test.js
node --check knowly-www/english-level-test/app.js
node --check knowly-www/english-level-test/certificate.js
```

Expected: all pass.

- [ ] **Step 6: Commit task files**

```powershell
git add -- functions-english-test/client_assessment_copy_contract.test.js knowly-www/english-level-test/app.js knowly-www/english-level-test/certificate.js knowly-www/english-level-test/index.html
git commit -m "fix: present English assessment without false precision"
```

### Task 5: Prove the whole adaptive system with simulations

**Files:**
- Create: `functions-english-test/adaptive_engine_simulation.test.js`

- [ ] **Step 1: Write deterministic multi-seed simulations**

Run at least 2,000 seeds per strategy:

- all wrong;
- all skipped;
- all correct;
- uniform random choice;
- fixed displayed positions 1–4.

Assertions:

```js
assert.equal(allWrong.maxQuestions, 20);
assert.deepEqual(allWrong.finalLevels, ['Pre-A1']);
assert.equal(allCorrect.attemptsWithoutC2Items, 0);
assert.equal(fixedPosition.highLevelRate <= 0.02, true);
assert.equal(firstFour.some((question) => question.level === 'B1'), false);
```

- [ ] **Step 2: Run RED if any invariant remains violated**

```powershell
node --test functions-english-test/adaptive_engine_simulation.test.js
```

Expected: any residual selection/position bias is visible as a deterministic failure.

- [ ] **Step 3: Make minimal engine/bank corrections and rerun GREEN**

Do not relax the invariants to fit the implementation. Adjust routing, shuffle, or bank balance, then rerun until all simulations pass.

- [ ] **Step 4: Commit simulation gate**

```powershell
git add -- functions-english-test/adaptive_engine_simulation.test.js knowly-www/english-level-test/engine.js content/english-test/questions knowly-www/english-level-test/data/questions.en.json functions-english-test/data/questions.en.json
git commit -m "test: guard English assessment trajectories"
```

### Task 6: Run focused regression and browser journeys

**Files:**
- Modify only if needed: `.codex-tmp/elt_mobile_regression_test.cjs`
- Modify only if needed: `.codex-tmp/elt_smoke_test.cjs`
- Modify only if needed: `.codex-tmp/elt_extra_test.cjs`

- [ ] **Step 1: Run the complete narrow Node suite**

```powershell
Set-Location functions-english-test
npm test
```

Expected: all counter, security, engine, bank, simulation, and copy contracts pass.

- [ ] **Step 2: Run syntax and generator gates**

```powershell
node --check knowly-www/english-level-test/engine.js
node --check knowly-www/english-level-test/app.js
node --check knowly-www/english-level-test/certificate.js
node scripts/generate_english_test_assets.mjs --check
```

Expected: all exit 0; source hashes remain unchanged during check.

- [ ] **Step 3: Run browser journeys**

```powershell
node .codex-tmp/elt_mobile_regression_test.cjs
node .codex-tmp/elt_certificate_race_test.cjs
node .codex-tmp/elt_smoke_test.cjs
node .codex-tmp/elt_extra_test.cjs
```

Expected: mobile start, new A1 flow, result, certificate, keyboard, counter, reduced motion, and CTA pass with no JavaScript errors.

- [ ] **Step 4: Perform independent bounded review**

Review exact correctness of routing, upper-level evidence, bank keys, privacy, accessibility, and deploy scope. Any P0/P1 blocks release; add a failing regression before repair.

### Task 7: Deploy narrowly and verify production

**Files:**
- No additional source changes unless production verification exposes a regression.

- [ ] **Step 1: Confirm deploy delta**

Verify that only English Test hosting assets changed; deploy `englishTestApi` only if its source contract changed. Never deploy admin, Firestore rules, indexes, or unrelated functions.

- [ ] **Step 2: Deploy Hosting**

```powershell
npm run hosting:knowly-www
```

Expected: only Firebase Hosting target `knowlywww` succeeds.

- [ ] **Step 3: Verify production without fake completion**

Check:

- live HTML/JS/bank revision;
- first two questions are simple A1 and different skills;
- all-wrong/skip browser route stops at or before 20 with Pre-A1/insufficient data;
- no confidence or exact-assessment wording;
- GET counter remains `no-store` and unchanged by an invalid POST;
- no valid synthetic completion is submitted.

- [ ] **Step 4: Produce final report**

Report changed files, RED/GREEN counts, simulations, browser results, review verdict, exact deploy target, production evidence, preserved user changes, and residual product hypotheses.

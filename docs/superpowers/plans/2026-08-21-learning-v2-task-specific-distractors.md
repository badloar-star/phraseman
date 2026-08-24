# Learning V2 Task-Specific Distractors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace mechanical Lesson 1 distractor projection with task-specific minimal traps, remove ambiguous grammar answers and duplicate success copy, and enforce the rule for sessions 1–10, session 11, and future lessons.

**Architecture:** Keep authored phrases and approved intros unchanged. Add a focused task-distractor selector that consumes the exact target, activity family, tested slot, rejected-answer evidence, and curriculum boundary; the learner projection may only consume its result. A fail-closed gate evaluates the actual projected interactions, not only source metadata.

**Tech Stack:** TypeScript, Jest, `tsx` contract gates, existing Learning V2 source→shard→client-child pipeline, standalone HTML owner mock.

---

### Task 1: Reproduce the four owner-reported defects

**Files:**
- Create: `tests/learning_v2_task_specific_distractor_projection.test.ts`
- Read: `modules/learning-v2/content/source/authored_sessions_v1.ts`
- Read: `modules/learning-v2/content/source/session_shard_from_source_v1.ts`
- Read: `modules/learning-v2/content/source/session_package_from_shard_v1.ts`

- [ ] **Step 1: Write the failing projection test**

Build session 11 through the real source→shard→client-child path and assert the
exact owner examples:

```ts
const byPrompt = Object.fromEntries(
  learner.interactions.map((task) => [task.prompt, task]),
);

expect(optionsFor(byPrompt, 'Ты уставший?')).toEqual(
  expect.arrayContaining(['Are', 'you', 'tired', 'Is', 'Do']),
);
expect(optionsFor(byPrompt, 'Ты уставший?')).not.toEqual(
  expect.arrayContaining(['isn’t', 'aren’t']),
);

expect(optionsFor(byPrompt, 'Ты счастлив?')).toEqual(['Are', 'Is', 'Do']);
expect(optionsFor(byPrompt, 'Ты дома?')).toEqual([
  'Are you at home?',
  'Are you in home?',
  'Are you on home?',
]);

expect(successForTarget(shard, 'Are you tired?')).not.toMatch(
  /Are you tired\?\.\s*Are you tired\?/u,
);
```

- [ ] **Step 2: Run RED**

Run:

```powershell
npx jest tests/learning_v2_task_specific_distractor_projection.test.ts --runInBand
```

Expected: FAIL showing `isn’t/aren’t`, the ambiguous positive/negative gap,
unrelated speed-match phrases, and duplicated success target.

### Task 2: Add a task-specific distractor selector

**Files:**
- Create: `modules/learning-v2/content/source/task_specific_distractors_v1.ts`
- Test: `tests/learning_v2_task_specific_distractors.test.ts`

- [ ] **Step 1: Write selector unit tests**

```ts
expect(selectTaskDistractors({
  family: 'phrase_builder',
  target: 'Are you tired?',
  testedToken: 'Are',
  curriculumTokens: ['am', 'is', 'are', 'do'],
})).toMatchObject({
  responseMode: 'extra_tokens',
  correct: 'Are',
  distractors: [
    { value: 'Is', testedDimension: 'agreement' },
    { value: 'Do', testedDimension: 'auxiliary' },
  ],
});

expect(selectTaskDistractors({
  family: 'speed_match',
  target: 'Are you at home?',
  testedToken: 'at',
  curriculumTokens: ['at', 'in', 'on'],
})).toMatchObject({
  responseMode: 'whole_phrase',
  distractors: [
    { value: 'Are you in home?', testedDimension: 'preposition' },
    { value: 'Are you on home?', testedDimension: 'preposition' },
  ],
});
```

Also assert that positive `Are you happy?` rejects polarity-changing `aren’t`
and that a missing pair throws `task_specific_distractors_insufficient`.

- [ ] **Step 2: Run RED**

```powershell
npx jest tests/learning_v2_task_specific_distractors.test.ts --runInBand
```

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the minimal selector**

Define the explicit contract:

```ts
export type TestedDimension =
  | 'agreement'
  | 'auxiliary'
  | 'order'
  | 'polarity'
  | 'preposition'
  | 'collocation'
  | 'sound'
  | 'orthography'
  | 'semantic_neighbor';

export type TaskDistractor = Readonly<{
  value: string;
  correct: string;
  testedDimension: TestedDimension;
}>;

export function selectTaskDistractors(
  input: TaskDistractorInput,
): TaskDistractorSelection;
```

Use exact pair rules and one-slot substitution. Never fall back to the first
two elements of a broad category; throw on fewer than two admissible traps.

- [ ] **Step 4: Run GREEN**

```powershell
npx jest tests/learning_v2_task_specific_distractors.test.ts --runInBand
```

Expected: PASS.

### Task 3: Integrate the selector into real learner projections

**Files:**
- Modify: `modules/learning-v2/content/source/session_package_from_shard_v1.ts:145-390`
- Modify: `modules/learning-v2/content/source/lesson1_distractor_catalog_v2.ts:17-130`
- Test: `tests/learning_v2_task_specific_distractor_projection.test.ts`

- [ ] **Step 1: Replace phrase-builder arbitrary slicing**

Remove the projection path equivalent to:

```ts
card.contentItem.rejectedAnswers.map((answer) => answer.value).slice(0, 2)
```

Call `selectTaskDistractors` with the current family and target. Preserve the
correct target tiles and append only returned `extra_tokens`.

- [ ] **Step 2: Make grammar gaps semantically unique**

Include the locale-native meaning in the prompt:

```ts
prompt: `${instruction} ${meaning} — ${gap.prompt}`
```

Use selector output for `Are / Is / Do`; do not include a polarity-changing
form unless polarity is the declared tested dimension.

- [ ] **Step 3: Replace speed-match cross-card sampling**

For preposition/collocation targets, generate whole-phrase one-slot variants
from the exact target. Do not pass `otherCards` as distractors for this family.

- [ ] **Step 4: Preserve task-appropriate traps**

Keep listening options as acoustic minimal pairs and vocabulary options as
same-category semantic neighbors. Both paths must be explicit selector modes,
not a generic cross-card fallback.

- [ ] **Step 5: Run projection GREEN**

```powershell
npx jest tests/learning_v2_task_specific_distractor_projection.test.ts --runInBand
```

Expected: PASS for all four screenshot regressions.

### Task 4: Remove duplicate success targets without losing the answer

**Files:**
- Modify: `modules/learning-v2/content/source/session_shard_from_source_v1.ts:340-420`
- Test: `tests/learning_v2_success_copy_projection.test.ts`

- [ ] **Step 1: Write RED cases**

```ts
expect(singleTargetSuccess('Are you tired?', 'Are you tired? — Это вопрос.'))
  .toBe('Are you tired? — Это вопрос.');
expect(singleTargetSuccess('Are you tired?', 'Связка выходит вперёд.'))
  .toBe('Are you tired? Связка выходит вперёд.');
expect(singleTargetSuccess('I am ready.', 'I am ready. Форма согласована.'))
  .toBe('I am ready. Форма согласована.');
```

- [ ] **Step 2: Run RED**

```powershell
npx jest tests/learning_v2_success_copy_projection.test.ts --runInBand
```

Expected: FAIL because `singleTargetSuccess` is missing.

- [ ] **Step 3: Implement punctuation-aware deduplication**

Export a pure helper that normalizes apostrophes/spacing for comparison, keeps
authored punctuation, and prepends the target only when the explanation does
not already begin with it. Use it in `successMessageByLocale` for all locales.

- [ ] **Step 4: Run GREEN**

```powershell
npx jest tests/learning_v2_success_copy_projection.test.ts --runInBand
```

Expected: PASS.

### Task 5: Add a fail-closed projected-content gate

**Files:**
- Create: `tests/learning_v2_task_specific_distractor_gate.ts`
- Modify: `package.json:9-12`
- Modify: `tests/learning_v2_lesson1_authoring_registry_gate.ts:114-130`
- Modify: `docs/v2/LEARNING_CONTENT_STYLE_BIBLE.ru.md`
- Modify: `docs/v2/СТАРТ В2.md`

- [ ] **Step 1: Write the gate over actual projected tasks**

For sessions 1–11 and any subsequently unlocked source, build client-child
interactions for all eight locales and fail on:

```ts
duplicate_success_target
double_terminal_punctuation
builder_unrelated_polarity
grammar_gap_multiple_valid_answers
speed_match_cross_phrase_distractor
feedback_missing_selected_trap
feedback_duplicate_skeleton
```

- [ ] **Step 2: Run RED against current projections**

```powershell
node --import tsx tests/learning_v2_task_specific_distractor_gate.ts
```

Expected: FAIL with at least the known session 9–11 ambiguity and session 11
builder/success defects.

- [ ] **Step 3: Connect the gate permanently**

Append it to `learning-v2:lesson1-authoring-gate` and update the registry test's
exact expected command. Record the task-specific rules and the listening/
meaning exception in both normative documents.

- [ ] **Step 4: Run GREEN gates**

```powershell
npm run learning-v2:lesson1-authoring-gate
npm run learning-v2:lesson1-distractor-gate
npm run learning-v2:lesson1-distractor-template-gate
```

Expected: all commands exit 0 with PASS and zero findings.

### Task 6: Rebuild and verify the owner mock

**Files:**
- Regenerate: `.codex-tmp/learning-v2-authoring-registry/session-11-real.html`
- Regenerate: `.codex-tmp/learning-v2-authoring-registry/session-11-real-data.js`

- [ ] **Step 1: Rebuild only session 11**

```powershell
node scripts/build_learning_v2_lesson1_real_session_mock.mjs --from 11 --to 11 --output .codex-tmp/learning-v2-authoring-registry/session-11-real.html --data-output .codex-tmp/learning-v2-authoring-registry/session-11-real-data.js
```

Expected: `SESSIONS 1` and exit 0.

- [ ] **Step 2: Browser-smoke the exact screens**

With Playwright, verify visible options and feedback for task 2, task 3 and the
`at home` speed-match task. Assert target/explanation colors remain distinct.

- [ ] **Step 3: Run focused static verification**

```powershell
npx eslint modules/learning-v2/content/source/task_specific_distractors_v1.ts modules/learning-v2/content/source/session_package_from_shard_v1.ts modules/learning-v2/content/source/session_shard_from_source_v1.ts tests/learning_v2_task_specific_distractors.test.ts tests/learning_v2_task_specific_distractor_projection.test.ts tests/learning_v2_success_copy_projection.test.ts tests/learning_v2_task_specific_distractor_gate.ts
```

Expected: exit 0, no errors or warnings.

- [ ] **Step 4: Preserve authoring state**

Run:

```powershell
npm run learning-v2:lesson1-authoring-preflight -- --session 11
```

Expected: `LOCKED: 1-10`, `CURRENT: 11`, `CURRENT STATUS: AUTO_PASS`,
`FORBIDDEN: 12-56`. Do not mark session 11 `LOCKED` before owner review.

### Commit policy for this dirty checkout

The repository contains extensive unrelated staged and unstaged owner work.
During execution, do not create a commit, branch or worktree and do not modify
the unrelated index. Report the exact bounded diff; commit only after the owner
provides a clean/isolation instruction.

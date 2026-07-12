# Lessons 1–32 Linguistic Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Исправить подтверждённые EN→RU-дефекты уроков 1–32, доказать накопительное словарное покрытие, безопасно убрать необоснованные повторы и разгрузить урок 31 без изменения phrase id, порядка и количества фраз.

**Architecture:** Лингвистические правки защищаются табличными регрессионными тестами. Словарный аудит использует те же функции нормализации и фактический `lessonWordBank()`, что runtime, а не отдельный regex-парсер. Очистка сырого словаря и переработка L31 выполняются только после появления воспроизводимого coverage-контракта.

**Tech Stack:** TypeScript, React Native data modules, Jest, `tsx`, существующие lesson audit scripts.

---

## File map

- Create `tests/lesson_linguistic_remediation.test.ts`: точные контракты подтверждённых phrase/RU-исправлений.
- Create `tests/lesson_cumulative_vocabulary_coverage.test.ts`: накопительное покрытие и runtime-дедупликация.
- Create `tests/lesson31_complex_object_remediation.test.ts`: модели Complex Object и лексическая нагрузка L31.
- Modify `app/lesson_data_1_8_phrases_source.ts` and generated EN source consumed by runtime: L6 и связанные токены.
- Modify `app/lesson_data_1_8_phrases_es.gen.ts`: синхронные runtime-поля L5/L6, если `lesson_data_all.ts` использует этот экспорт.
- Modify `app/lesson_data_9_16_phrases_es.gen.ts`: L11–L14.
- Modify `app/lesson_data_17_24.ts`: L19/L22 и контекстные `outside`.
- Modify `app/lesson_data_25_32.ts`: L27–L32, включая L31.
- Modify `app/lesson_words.tsx`: audit-only exports, `battery`, затем доказанные raw-дубли.
- Modify `tests/lesson_words_bank_regression.test.ts`: singular gloss, legacy aliases и runtime bank.
- Modify `tests/lesson_31_reported_alignment.test.ts`: заменить устаревшие точные ожидания L31.

## Task 0: Isolated execution workspace

**Files:** no production files.

- [ ] **Step 1: Record the current dirty tree without changing it**

Run:

```powershell
git status --short | Set-Content .codex-tmp/lesson-remediation-root-status.txt
git diff --name-only -- app/lesson_data_1_8_phrases_source.ts app/lesson_data_1_8_phrases_es.gen.ts app/lesson_data_9_16_phrases_es.gen.ts app/lesson_data_17_24.ts app/lesson_data_25_32.ts app/lesson_words.tsx tests
```

Expected: target lesson files have no unrelated local diff. If any target is dirty, stop and inspect overlap.

- [ ] **Step 2: Create an isolated worktree from commit `07eec8405` or the current committed successor**

Run using the `using-git-worktrees` skill. Branch name:

```text
codex/lessons-1-32-linguistic-remediation
```

Expected: clean worktree; no admin/Functions/user changes copied into it.

- [ ] **Step 3: Verify baseline narrow tests**

Run:

```powershell
npx jest --runTestsByPath tests/lesson_phrases_regression.test.ts tests/lesson_options_correctness.test.ts tests/lesson_words_bank_regression.test.ts --runInBand
```

Expected: record the exact baseline. Pre-existing failure is reported before implementation and not silently absorbed.

## Task 1: Exact linguistic regression contracts

**Files:**

- Create: `tests/lesson_linguistic_remediation.test.ts`
- Modify later: the five lesson-data files listed in the file map.

- [ ] **Step 1: Write a failing table-driven test**

Create a test with exact approved cases. The initial RED table must include at least:

```ts
const EXPECTED = [
  { lessonId: 6, id: 'lesson6_phrase_35', english: 'How do you find it?', russian: 'Как тебе это?' },
  { lessonId: 12, id: 'lesson12_phrase_8', english: 'We made a plan last week', russian: 'Мы составили план на прошлой неделе' },
  { lessonId: 13, id: 'lesson13_phrase_19', english: 'I will pay rent next month', russian: 'Я оплачу аренду в следующем месяце' },
  { lessonId: 27, id: 'lesson27_phrase_36', english: 'You said that you did not see it', russian: 'Ты сказал, что не видел этого' },
  { lessonId: 31, id: 'lesson31_phrase_35', english: 'That brave firefighter made that panicked family follow the emergency exit signs.', russian: 'Тот храбрый пожарный заставил запаниковавшую семью следовать указателям к аварийному выходу.' },
  { lessonId: 32, id: 'lesson32_phrase_15', english: 'They opened the door to the room where we waited.', russian: 'Они открыли дверь в комнату, где мы ждали.' },
] as const;
```

For every row, assert:

```ts
const phrase = getLessonData(row.lessonId).find((item) => item.id === row.id);
expect(phrase).toMatchObject({ english: row.english, russian: row.russian });
expect(getLessonData(row.lessonId).filter((item) => item.id === row.id)).toHaveLength(1);
```

Also assert `getLessonData(id)` has 50 phrases and unique ids for all 32 lessons.

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/lesson_linguistic_remediation.test.ts --runInBand
```

Expected: FAIL on the old translations/phrases, not on import errors.

- [ ] **Step 3: Expand the table with every unambiguous P2 and contextual `outside` case**

Use the approved audit report. Each changed phrase receives one exact expected EN/RU row. Do not add the nine disputed L31 aspect rows to the required-change table; keep them in a `REVIEW_ONLY_IDS` constant and assert only that their ids still exist.

- [ ] **Step 4: Implement the minimal synchronized data changes**

For every changed object update:

```ts
{
  id: '...',
  english: 'approved sentence',
  russian: 'утверждённый перевод',
  words: [/* correct values in the same order as the new EN surface */],
}
```

Update UK only when the changed EN makes the existing UK meaning false. Update `alternatives`, `wordsEn` and local distractors when present. Preserve ids and array order.

- [ ] **Step 5: Run GREEN and focused regressions**

```powershell
npx jest --runTestsByPath tests/lesson_linguistic_remediation.test.ts tests/lesson_phrases_regression.test.ts tests/lesson_options_correctness.test.ts --runInBand
```

Expected: PASS, 0 failed suites.

- [ ] **Step 6: Commit only Task 1 files**

```powershell
git add tests/lesson_linguistic_remediation.test.ts app/lesson_data_1_8_phrases_source.ts app/lesson_data_1_8_phrases_es.gen.ts app/lesson_data_9_16_phrases_es.gen.ts app/lesson_data_17_24.ts app/lesson_data_25_32.ts tests/lesson_31_reported_alignment.test.ts
git commit -m "fix: correct lesson translations and phrasing"
```

## Task 2: Singular battery gloss

**Files:**

- Modify: `tests/lesson_words_bank_regression.test.ts`
- Modify: `app/lesson_words.tsx:1095-1097`

- [ ] **Step 1: Add the failing runtime assertion**

```ts
it('keeps the singular battery lemma with singular glosses', () => {
  const rows = lessonWordBank(11).filter((word) => word.en === 'battery');
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ ru: 'Батарейка', uk: 'Батарейка' });
  expect(lessonWordBank(11).some((word) => word.en === 'batteries')).toBe(false);
});
```

- [ ] **Step 2: Run RED**

```powershell
npx jest --runTestsByPath tests/lesson_words_bank_regression.test.ts --runInBand
```

Expected: FAIL because the plural surface can override the singular gloss during lemma merging.

- [ ] **Step 3: Make the smallest source correction**

Ensure the raw `batteries` row cannot replace singular RU/UK glosses. Prefer removal of the redundant plural row only if the existing `batteries: 'battery'` legacy alias and regression test prove saved progress remains readable; otherwise correct the merge precedence.

- [ ] **Step 4: Run GREEN and audit**

```powershell
npx jest --runTestsByPath tests/lesson_words_bank_regression.test.ts --runInBand
node scripts/audit_lesson_words_vocab.mjs
```

Expected: battery warning absent. Remaining duplicate warnings are recorded for Task 4/5.

- [ ] **Step 5: Commit**

```powershell
git add app/lesson_words.tsx tests/lesson_words_bank_regression.test.ts
git commit -m "fix: preserve singular battery vocabulary gloss"
```

## Task 3: Shared cumulative vocabulary coverage

**Files:**

- Modify: `app/lesson_words.tsx:2190-2385`
- Create: `tests/lesson_cumulative_vocabulary_coverage.test.ts`

- [ ] **Step 1: Add read-only audit exports without copying morphology**

Expose pure wrappers around existing internals:

```ts
export function lessonVocabularyCoverageCandidates(surface: string): string[] {
  const verbLex = collectVerbSurfaceLexicon(WORDS_BY_LESSON);
  return coverageTokenCandidates(surface, verbLex);
}

export function lessonVocabularyCoverageText(english: string): string {
  return phraseTextForCoverage(english);
}
```

If direct export couples UI tests to React Native, move only these pure functions and their required constants to `app/lesson_vocabulary_normalization.ts`, then import them back into `lesson_words.tsx`.

- [ ] **Step 2: Add failing unit cases for normalization**

```ts
expect(candidates('worked')).toContain('work');
expect(candidates('working')).toContain('work');
expect(candidates('batteries')).toContain('battery');
expect(candidates('better')).toContain('good');
expect(candidates('went')).toContain('go');
expect(normalize("don't")).toContain("don't");
```

Add chunk assertions for L16: `wake up`, `get up`, `put on`, `take off`, `turn on`, `turn off`, `look for`, `clean up`, `throw away`, `give back`, `find out`, `go back`.

- [ ] **Step 3: Run RED**

```powershell
npx jest --runTestsByPath tests/lesson_cumulative_vocabulary_coverage.test.ts --runInBand
```

Expected: FAIL because audit exports/classifier do not yet exist or real candidates remain uncovered.

- [ ] **Step 4: Implement the classifier using runtime banks**

Define:

```ts
type CoverageStatus = 'introduced_now' | 'known_before' | 'covered_irregular' | 'structural' | 'ambiguous' | 'missing';
type CoverageFinding = { lessonId: number; phraseId: string; surface: string; key: string; status: CoverageStatus; reason?: string };
```

Process multiword chunks before single tokens. Maintain prior `lessonWordBank()` keys and cumulative irregular lemmas. Permit ambiguity only through objects shaped as:

```ts
const AMBIGUOUS: ReadonlyArray<{ lessonId: number; phraseId: string; surface: string; reason: string }> = [];
```

The test must fail on unused exceptions and on every `missing` finding.

- [ ] **Step 5: Run GREEN without hiding content words**

```powershell
npx jest --runTestsByPath tests/lesson_cumulative_vocabulary_coverage.test.ts tests/pos_coverage_audit.test.ts --runInBand
```

Expected: PASS or a concrete list of content gaps. Add real missing vocabulary to the correct first-introduction lesson; do not put content words into the structural list.

- [ ] **Step 6: Commit**

```powershell
git add app/lesson_words.tsx app/lesson_vocabulary_normalization.ts tests/lesson_cumulative_vocabulary_coverage.test.ts
git commit -m "test: enforce cumulative lesson vocabulary coverage"
```

Omit `app/lesson_vocabulary_normalization.ts` from `git add` if the fallback extraction was unnecessary.

## Task 4: Prove runtime deduplication and legacy compatibility

**Files:**

- Modify: `tests/lesson_cumulative_vocabulary_coverage.test.ts`
- Modify: `tests/lesson_words_bank_regression.test.ts`

- [ ] **Step 1: Add the duplicate-key contract**

```ts
it('does not expose the same normalized key in later lesson banks', () => {
  const seen = new Map<string, number>();
  for (let lessonId = 1; lessonId <= 32; lessonId++) {
    for (const word of lessonWordBank(lessonId)) {
      const key = normalizedBankKey(word);
      expect({ key, firstLesson: seen.get(key), lessonId }).toEqual({ key, firstLesson: undefined, lessonId });
      seen.set(key, lessonId);
    }
  }
});
```

Replace the illustrative assertion with a failure message that reports key, first lesson, later lesson and POS. New-POS/new-sense exceptions require `{ key, firstLesson, laterLesson, reason }` and must be consumed.

- [ ] **Step 2: Add legacy alias assertions**

Assert at minimum that plural legacy keys such as `batteries` migrate to the same progress key as `battery` and that removing a raw duplicate does not change the visible first-introduction card.

- [ ] **Step 3: Run RED or establish the existing GREEN baseline**

```powershell
npx jest --runTestsByPath tests/lesson_cumulative_vocabulary_coverage.test.ts tests/lesson_words_bank_regression.test.ts --runInBand
```

Expected: if runtime already fully deduplicates, the new contract may pass immediately; in that case temporarily mutate one key inside the test fixture or isolate `buildWordsByLessonForBank` with a synthetic duplicate to demonstrate the test fails, then restore the real implementation.

- [ ] **Step 4: Fix runtime only if the real contract fails**

Keep first introduction by lesson order. Preserve different POS/sense only through an explicit exception backed by a test.

- [ ] **Step 5: Verify and commit**

```powershell
npx jest --runTestsByPath tests/lesson_cumulative_vocabulary_coverage.test.ts tests/lesson_words_bank_regression.test.ts --runInBand
git add tests/lesson_cumulative_vocabulary_coverage.test.ts tests/lesson_words_bank_regression.test.ts app/lesson_words.tsx
git commit -m "test: prove lesson vocabulary deduplication"
```

## Task 5: Remove only proven raw duplicates

**Files:**

- Modify: `app/lesson_words.tsx:424-2364`
- Modify: `tests/lesson_cumulative_vocabulary_coverage.test.ts`

- [ ] **Step 1: Generate a read-only candidate table**

For each later raw row report first lesson, later lesson, normalized key, POS, RU/UK gloss equality, whether runtime already hides it, and whether a legacy alias references it. Write bulky output only to `.codex-tmp/lesson-remediation/raw-duplicate-candidates.json`.

- [ ] **Step 2: Write a failing fixture for one batch**

Start with L1–8. A candidate is removable only when:

```ts
expect(candidate).toMatchObject({ samePos: true, sameSense: true, hiddenAtRuntime: true, legacyAliasRequired: false });
```

- [ ] **Step 3: Remove the minimal L1–8 raw repeats**

Do not touch homonyms, different POS, chunks, different glosses or alias-backed forms.

- [ ] **Step 4: Verify the batch**

```powershell
npx jest --runTestsByPath tests/lesson_cumulative_vocabulary_coverage.test.ts tests/lesson_words_bank_regression.test.ts --runInBand
node scripts/audit_lesson_words_vocab.mjs
```

Expected: runtime banks unchanged; raw duplicate count decreases; coverage remains green.

- [ ] **Step 5: Repeat RED/GREEN for L9–16, L17–24 and L25–32**

Each range is a separate patch and commit. Never mechanically delete all 267 keys.

- [ ] **Step 6: Commit each range**

```powershell
git add app/lesson_words.tsx tests/lesson_cumulative_vocabulary_coverage.test.ts
git commit -m "refactor: remove proven lesson vocabulary duplicates L1-L8"
```

Repeat with the actual range in the message.

## Task 6: Reduce lesson 31 lexical load

**Files:**

- Create: `tests/lesson31_complex_object_remediation.test.ts`
- Modify: `app/lesson_data_25_32.ts:6947-7913`
- Modify: `tests/lesson_31_reported_alignment.test.ts`

- [ ] **Step 1: Capture the exact 50-id baseline and coverage baseline**

```ts
const IDS = LESSON_31_PHRASES.map((phrase) => phrase.id);
expect(IDS).toEqual(Array.from({ length: 50 }, (_, index) => `lesson31_phrase_${index + 1}`));
```

Count first-introduced content keys using the Task 3 classifier and save the exact baseline in the RED output.

- [ ] **Step 2: Define allowed Complex Object models**

```ts
const MODEL = /\b(?:want|expect|ask|tell)\b.+\bto\b|\b(?:make|let|see|hear)\b/i;
for (const phrase of LESSON_31_PHRASES) expect(phrase.english).toMatch(MODEL);
```

Supplement the broad regex with table-driven expected model per phrase id so a sentence cannot pass merely by containing an unrelated verb.

- [ ] **Step 3: Set a concrete lexical target and run RED**

Choose the threshold after measuring baseline: require at least a 40% reduction in L31 first-introduced content keys while retaining model diversity. Run:

```powershell
npx jest --runTestsByPath tests/lesson31_complex_object_remediation.test.ts --runInBand
```

Expected: FAIL on lexical-load threshold.

- [ ] **Step 4: Simplify `want/expect`, then verify**

Replace only background B2–C1 vocabulary with frequent L1–30 words. Preserve ids and the target model. Update RU, UK if necessary, `words/wordsEn`, alternatives and distractors.

```powershell
npx jest --runTestsByPath tests/lesson31_complex_object_remediation.test.ts tests/lesson_options_correctness.test.ts --runInBand
```

- [ ] **Step 5: Simplify `ask/tell`, `make/let`, then `see/hear` in separate RED/GREEN batches**

After each batch, run the same tests plus cumulative coverage. Do not globally force perfective RU after perception verbs; decide each sentence from its meaning.

- [ ] **Step 6: Run the full L31 gate**

```powershell
npx jest --runTestsByPath tests/lesson31_complex_object_remediation.test.ts tests/lesson_31_reported_alignment.test.ts tests/lesson_linguistic_remediation.test.ts tests/lesson_cumulative_vocabulary_coverage.test.ts tests/lesson_phrases_regression.test.ts tests/lesson_options_correctness.test.ts --runInBand
```

Expected: PASS; 50 ids unchanged; lexical target achieved; options and coverage green.

- [ ] **Step 7: Commit each model group or the verified final L31 batch**

```powershell
git add app/lesson_data_25_32.ts tests/lesson31_complex_object_remediation.test.ts tests/lesson_31_reported_alignment.test.ts
git commit -m "refactor: focus lesson 31 on complex object"
```

## Task 7: Final focused verification and review

**Files:** all files changed by Tasks 1–6.

- [ ] **Step 1: Run the final Jest gate**

```powershell
npx jest --runTestsByPath tests/lesson_linguistic_remediation.test.ts tests/lesson31_complex_object_remediation.test.ts tests/lesson_cumulative_vocabulary_coverage.test.ts tests/lesson_phrases_regression.test.ts tests/lesson_options_correctness.test.ts tests/lesson_words_bank_regression.test.ts tests/pos_coverage_audit.test.ts --runInBand
```

Expected: all listed suites PASS with 0 failed tests.

- [ ] **Step 2: Run structural audits independently**

```powershell
npm run audit:lesson-sections
npm run audit:lesson-prepositions
npm run audit:lesson-intros
node scripts/audit_lesson_words_vocab.mjs
```

Expected: no new critical findings; remaining audit limitations are reported rather than hidden.

- [ ] **Step 3: Check invariants and diff**

```powershell
git diff --check
git status --short
git diff --stat
```

Confirm no admin, Functions, assets, audio or unrelated user files changed.

- [ ] **Step 4: Record audio follow-up without generating audio**

List every changed English phrase whose existing audio may now be stale. Do not regenerate TTS without a separate explicit audio request and spend guard.

- [ ] **Step 5: Submit the actual final diff and verification evidence to advisor**

Completion requires `DECISION: APPROVED`. Apply any `CHANGES_REQUIRED` findings and resubmit.

- [ ] **Step 6: Final integration choice**

Use the `finishing-a-development-branch` skill. Do not merge, push or create a PR without the user-selected integration action.

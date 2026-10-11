# L4 Audit Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair every confirmed S01–S12 Learning V2 L4 audit finding, prevent recurrence, and rebuild only after fresh source-bound reviews.

**Architecture:** Treat authored RU/UK markdown and atomic JSON as the source pair, then prove their release and mockup projections. Pipeline parsing and feedback propagation receive regression fixtures first; content is repaired in small session batches and never approved with stale receipts.

**Tech Stack:** Node.js ESM pipeline, node:test, Learning V2 markdown/JSON sources, release and mockup builders.

---

### Task 1: New-word parser and first-contact contract

**Files:**
- Modify: `content/learning-v2-course/pipeline/prejudge_choreography.mjs`
- Modify: `content/learning-v2-course/pipeline/single_phrase_release.mjs`
- Test: `content/learning-v2-course/pipeline/prejudge_choreography.test.mjs`

- [ ] Write RU and UK fixtures with singular `**Новое слово:**` / `**Нове слово:**` and assert the parsed new-word list is nonempty.
- [ ] Run the fixture and record the original failure (`newWords: []`).
- [ ] Parse singular and plural headings and require three meaningful, distinct word-first contacts before a new word can pass.
- [ ] Run `node --test content/learning-v2-course/pipeline/prejudge_choreography.test.mjs content/learning-v2-course/pipeline/single_phrase_release.test.mjs`; expected: PASS.

### Task 2: Choice-feedback projection contract

**Files:**
- Inspect/modify: `content/learning-v2-course/pipeline/build_release.mjs`
- Test: `content/learning-v2-course/pipeline/build_release_feedback.test.mjs`
- Modify: affected `practice.atomic.json` under `sessions/en/l04/s04` through `s12`

- [ ] Add one failing fixture whose wrong selectable response lacks its own localized `choiceFeedback` in the learner projection.
- [ ] Preserve response-ID-to-feedback mapping in both locales; do not accept generic feedback.
- [ ] Run the focused release-feedback test and build a temporary scoped release; inspect every listed response ID.

### Task 3: Repair S01–S08 audited content

**Files:**
- Modify only audited source trios in `sessions/en/l04/s01` through `s08`

- [ ] Correct S01/S02/S05/S07 artificial humour only where the full paragraph remains unnatural.
- [ ] Repair S05 i03 context, S06 i11 tile parity, S08 i01 wording, i04 distractor parity, and i12 neighbourhood transfer.
- [ ] Add response-specific feedback for the listed selectable interactions, preserving RU/UK/atomic parity.
- [ ] For each changed session run pre-judge, RU/UK facts, RU/UK single, and source/projection comparison.

### Task 4: Repair S09–S11 audited content

**Files:**
- Modify only audited source trios in `sessions/en/l04/s09` through `s11`

- [ ] Make S10 hotel introduction uniquely answerable; remove padding contacts and give i12 an independent short-answer final.
- [ ] Make S11 station text natural, restore genuine retrieval work without a word dump, and align semantic evidence to current intros.
- [ ] Add response-specific feedback for every listed interaction.
- [ ] Run the same four session gates and inspect exact release projections.

### Task 5: Coherent S12 rewrite and prevention checklist

**Files:**
- Modify: `sessions/en/l04/s12/final.ru.md`, `final.uk.md`, `practice.atomic.json`
- Modify: active author/judge checklist source after locating its canonical file

- [ ] Rewrite S12 as one station-announcement scenario with constructible tiles, matched prompt/target/location, and dedicated short answers.
- [ ] Prove no future grammar and no intro/practice/final exact-repeat bypass.
- [ ] Require reader and taste evidence to cite actual projected prompts/options/feedback and reject non-humour as humour.

### Task 6: Fresh acceptance and owner mockup

**Files:**
- Regenerate only current receipts/status/release artifacts after each source batch is fully green.

- [ ] Create fresh guardians and seven independent receipts bound to the final source hashes for every altered session.
- [ ] Run canonical scoped release, native manifest build/check, and mockup build.
- [ ] Reload the existing owner mockup tab and verify the changed sessions and response feedback appear in the projection.
- [ ] Record each audit item as fixed with its path, or as a justified non-defect with evidence.

### Task 7: Learner-scene boundary and intro-structure regressions

**Files:**
- Inspect/modify: `content/learning-v2-course/pipeline/build_mockup.mjs` and its header parser dependency
- Test: `content/learning-v2-course/pipeline/build_mockup_pairs.test.mjs`
- Modify: audited intros in `sessions/en/l04/s01` through `s12`

- [ ] Add a built-HTML assertion that a learner card scene excludes `**Операция:**`, `**Новые слова:**`, `**Возвращаются:**`, and raw grammar metadata.
- [ ] Parse the first human scene paragraph separately from source metadata; do not hide the fields with CSS.
- [ ] Audit intro first sentences against the existing target-plus-translation contract and move people/event framing to the question only where the actual source violates it.

### Task 8: Preserve valid later retrieval

**Files:**
- Modify/test: `content/learning-v2-course/pipeline/single_phrase_release.mjs` and its focused test

- [ ] Add a fixture with three valid initial word-first contacts followed by a later retrieval card.
- [ ] Assert the later retrieval is not counted as a forbidden fourth initial contact.
- [ ] Keep the singular-header and real missing-contact failures from Task 1 green.

# Learning V2 English L4 Curriculum Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Freeze and synchronize the complete English L4 7×8 curriculum contract before any learner-facing L4 session is authored.

**Architecture:** The human-readable 56-row factory plan is the curriculum authority, while the V2 grammar and lexical registries are deterministic projections with stable `lesson-04` identities. Contract tests parse both sides, compare them exactly, scan prior learner sources, enforce the L4 grammar boundary, and protect normalized intro/practice target uniqueness.

**Tech Stack:** Markdown curriculum contracts, TypeScript registries and `tsx` gates, Node.js `node:test` pipeline tests, SHA-256 canonical blueprint hashing.

**Execution choice:** The owner selected agent execution. This plan is being executed by one delegated writer; commits, push, deploy, release, preauthoring, and L4 session authoring are outside the authorized packet.

---

### Task 1: Add the failing L4 curriculum contract

**Files:**
- Create: `tests/learning_v2_english_l4_curriculum_contract.test.ts`
- Read: `content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md`
- Read: `modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2.ts`

- [x] **Step 1: Encode the exact S01 row and 56 lexical cells**

```ts
const exactS01 = "| 1 | новая | сообщить о наличии одного места: `There is a/an + singular count noun` (полная форма) | pharmacy, library, bakery | у стойки заселения отмечаем на карте три места рядом с новым домом |";
assert.equal(rows[0]?.raw, exactS01, "l4_s01_owner_locked_row");
assert.deepEqual(rows.map((row) => row.words), EXPECTED_WORD_CELLS);
```

- [x] **Step 2: Add topology, scene, prior-source, grammar, mapping, and machine parity assertions**

The test must require 56 ordered sessions, 7 chapter headings, eight sessions per chapter, 56 distinct scene fingerprints, no L5+ grammar markers, no new-surface occurrence in current L1–L3 learner sources, stable `lesson-04` machine IDs, and the exact five-operation prerequisite chain.

- [x] **Step 3: Run RED**

Run: `npx tsx tests/learning_v2_english_l4_curriculum_contract.test.ts`
Expected: exit 1 with `l4_authoritative_section_missing` before the L4 section exists.

### Task 2: Strengthen exact assessed-target uniqueness

**Files:**
- Modify: `content/learning-v2-course/pipeline/single_phrase_release.mjs`
- Modify: `content/learning-v2-course/pipeline/single_phrase_release.test.mjs`
- Modify: `content/learning-v2-course/pipeline/build_release.mjs`
- Modify: `content/learning-v2-course/pipeline/verify_all_single_phrase_sources.mjs`

- [x] **Step 1: Write the regression first**

```js
const intro = { pages: [{ pageId: "en:lesson-04:session-01:intro1", question: { choicesByLocale: { ru: [{ text: "There is a pharmacy." }] } } }] };
const practice = [{ interactionId: "en:lesson-04:session-01:i04", family: "phrase_builder", modePayload: { targetPhrase: "There is a pharmacy." } }];
assert.equal(introPracticeTargetRepeatIssues(intro, practice)[0].reason, "intro_practice_exact_primary_target_repeat");
```

- [x] **Step 2: Run RED**

Run: `node --test content/learning-v2-course/pipeline/single_phrase_release.test.mjs`
Expected: exit 1 because `introPracticeTargetRepeatIssues` is not exported.

- [x] **Step 3: Implement normalized target comparison**

Normalize whitespace, Unicode terminal punctuation, and case consistently for cross-family and same-family checks. Read only the first assessed intro choice and the activity family's primary target. Skip explanatory prose and exactly three required contacts in three distinct families for an exact planned lexical surface, including planned multiword units such as `post office`; reject any fourth exact contact and do not infer an exemption from a word-card payload flag.

- [x] **Step 4: Wire the guard into both production paths**

Call it from `build_release.mjs` before projection for RU and localized sources, and from `verify_all_single_phrase_sources.mjs` for every current source sidecar.

- [x] **Step 5: Run GREEN**

Run: `node --test content/learning-v2-course/pipeline/single_phrase_release.test.mjs`
Expected: all tests pass, including the pharmacy regression.

### Task 3: Author the exact 56-row curriculum

**Files:**
- Modify: `content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md`
- Create: `docs/superpowers/specs/2026-10-04-learning-v2-english-l4-curriculum-design.md`

- [x] **Step 1: Add the identity and grammar boundary**

Record factory `en/l04` → functional V2 E09, while preserving runtime `lesson-04`. List the exact allowed operations and explicit L5+ exclusions.

- [x] **Step 2: Add seven chapters with eight exact rows each**

Use the frozen session proposal, the exact S01 row, one to five unique new senses on every row, and a distinct concrete scene on every row. Remove later reuse of `pharmacy`, `library`, and `bakery` as new L4 words.

- [x] **Step 3: Document the design and non-goals**

Explain authority, mapping, lexical invariants, prerequisite order, target-repeat semantics, deterministic evidence, and the owner fingerprint approval boundary.

### Task 4: Synchronize the machine projection

**Files:**
- Modify: `modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2.ts`
- Modify: `modules/learning-v2/curriculum/en/grammar_operations_en_v2.ts`
- Modify: `tests/learning_v2_lexical_progression_gate_v2.ts`

- [x] **Step 1: Project every L4 row to `lesson-04`**

Create assignments for absolute ordinals 169–224. Each assignment must use the exact plan surface and a canonical example containing that surface.

- [x] **Step 2: Add explicit existential negatives**

```ts
operation(4, "existence_place", "existential_negatives", "Сообщить, что одного или нескольких предметов нет.", "Для одного используй there isn't a/an; для нескольких — there aren't any.", "there isn't a|an + singular; there aren't any + plural", "There isn't a doorbell.", "There aren't any handrails.")
```

- [x] **Step 3: Permit the constitutional one-to-five lexical delta**

Change the V2 per-session lexical cap assertion from two to five. Keep uniqueness, grounding, and retrieval checks unchanged.

- [x] **Step 4: Run focused machine GREEN**

Run:

```powershell
npx tsx tests/learning_v2_english_l4_curriculum_contract.test.ts
npx tsx tests/learning_v2_lesson4_existence_prerequisite_gate_v2.ts
npx tsx tests/learning_v2_lexical_progression_gate_v2.ts
npx tsx tests/learning_v2_prerequisite_dag_gate_v2.ts
```

Expected: four PASS exits with the L4 contract reporting `rows=56`, `lexical_surfaces=58`, `runtime=lesson-04`, and `v2_episode=E09`.

### Task 5: Record the cross-contour mapping

**Files:**
- Modify: `docs/v2/03-learning-architecture-and-curriculum.md`
- Modify: `content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md`

- [x] **Step 1: Add the E09 connection beside the episode authority**

State that E09 owns the functional scenario connection and that exact deltas come from factory L4.

- [x] **Step 2: State stable runtime identity in both authorities**

Both documents must contain `en/l04`, E09, and `lesson-04`; neither may authorize renumbering.

### Task 6: Verify and bind exact owner evidence

**Files:**
- Read: all changed files
- Modify only with exact owner evidence: `modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts` approved fingerprint

- [x] **Step 1: Run focused and full Learning V2 gates**

Run the new L4 contract, all V2 curriculum gates, the Learning V2 blueprint suite, the pipeline Node tests, and the global single-phrase verifier.

Outcome: focused gates, the aggregate blueprint gate, both curriculum suites, and all 206 pipeline tests pass. The aggregate and dedicated density gates use one canonical lexical-density policy: L4 keeps one to five new senses in every session, including checkpoints; other checkpoints keep their retrieval-only rule; later non-checkpoints may be explicitly retrieval-only. The global verifier correctly holds the pre-existing L1 S01 source because `I am here.` is assessed in both intro and phrase-builder practice; this packet does not authorize rewriting learner source. A deterministic inventory found 1,005 logical legacy collisions across 163 sessions for a separate bounded source-repair packet. The exact current fingerprint is owner-approved from the owner's repeated 2026-10-04 instructions to start and continue Lesson 4.

- [x] **Step 2: Run TypeScript and scoped lint**

Run `npm run typecheck` and lint only the changed TypeScript/JavaScript files with the repository's ESLint invocation. Save bulky output under `.codex-tmp` and report decisive lines.

- [x] **Step 3: Run native and diff checks**

Run the relevant factory/native manifest check without authoring or releasing L4 content. Inspect `git diff --check`, the exact changed-file diff, and the curriculum SHA-256.

- [x] **Step 4: Hand off to fresh reviewers**

Report RED/GREEN commands, counts, changed files, SHA, preserved unrelated dirty work, and the exact owner-approved blueprint fingerprint. The owner repeatedly authorized starting and continuing Lesson 4 on 2026-10-04, so bind only that current fingerprint and supersede earlier entries. Do not commit, push, deploy, or release.

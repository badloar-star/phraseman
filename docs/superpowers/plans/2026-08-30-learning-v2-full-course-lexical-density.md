# Learning V2 Full-Course Lexical Density Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. The repository owner forbids creating another worktree or delegated coding task without explicit permission, so this plan is executed inline in the trusted checkout with one writer.

**Goal:** Make every one of the 1,568 non-checkpoint English Learning V2 session packets introduce useful new lexical senses, keep all 224 checkpoints free of new lexicon, diversify the first chapter to 20 senses, and publish a fresh owner-review fingerprint and HTML map.

**Architecture:** Add one explicit session-level lexical assignment source that owns first-introduction placement, canonical examples, and retrieval intent. Exact packets consume that source instead of inferring vocabulary from a small legacy pool and cycling operation examples. Deterministic gates enforce cardinality, uniqueness, grammar grounding, forward retrieval, checkpoint purity, first-chapter content, fingerprint integrity, and owner-map freshness.

**Tech Stack:** TypeScript, Node.js `assert`, SHA-256 canonical fingerprinting, existing Learning V2 blueprint modules, focused `npx tsx` gates, generated static owner-review HTML.

---

## File structure

- Create `modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2.ts`: canonical session-level lexical assignments and session-specific examples.
- Create `tests/learning_v2_noncheckpoint_lexical_density_gate_v2.ts`: fail-closed global contract and exact first-chapter assertions.
- Modify `modules/learning-v2/curriculum/en/lexical_progression_en_v2.ts`: materialize planned senses and retrieval edges from explicit assignments.
- Modify `modules/learning-v2/curriculum/en/exact_session_packets_en_v2.ts`: consume session-specific examples and remove blind two-example cycling.
- Modify `tests/learning_v2_lexical_progression_gate_v2.ts`: replace the obsolete two-senses maximum with the owner-approved per-role ranges and non-checkpoint requirement.
- Modify `tests/learning_v2_course_start_prerequisite_gate_v2.ts`: assert all 20 first-chapter senses, session boundaries, and checkpoint purity.
- Modify `scripts/learning_v2_curriculum_blueprint_gate_v2.ts`: include lexical-density findings in the aggregate status.
- Modify `modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts`: preserve old approvals as historical constants while the changed body computes a new pending fingerprint.
- Modify `modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2.ts`: record the previous fingerprint as superseded by the lexical-density decision.
- Modify `scripts/build_learning_v2_curriculum_owner_map_v2.ts`: show lexical counts, first-introduction words, retrieval words, and session-specific examples.
- Modify `tests/learning_v2_curriculum_owner_map_v2_gate.mjs`: verify the regenerated map and new lexical markers.
- Modify `docs/v2/СТАРТ В2.md`, `docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md`, and `docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md`: publish the new authoritative counts, fingerprint, status, and route.

### Task 1: Add the global RED lexical-density gate

**Files:**
- Create: `tests/learning_v2_noncheckpoint_lexical_density_gate_v2.ts`
- Modify: `scripts/learning_v2_curriculum_blueprint_gate_v2.ts`

- [ ] **Step 1: Write the failing global gate**

Create a direct `node:assert/strict` gate that imports `LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2`, planned senses, and retrieval edges. Its decisive assertions are:

```ts
const checkpoints = packets.filter((packet) => packet.sessionWithinChapter === 8);
const teaching = packets.filter((packet) => packet.sessionWithinChapter !== 8);

assert.equal(packets.length, 1_792, "packet_count");
assert.equal(teaching.length, 1_568, "noncheckpoint_count");
assert.equal(checkpoints.length, 224, "checkpoint_count");
assert.equal(
  teaching.every((packet) => packet.newLexicalSenseIds.length > 0),
  true,
  "every_noncheckpoint_introduces_new_lexicon",
);
assert.equal(
  checkpoints.every((packet) => packet.newLexicalSenseIds.length === 0),
  true,
  "checkpoints_introduce_no_lexicon",
);
```

Add uniqueness, canonical-example grounding, forward-edge, and no-future-checkpoint-use assertions. For the first chapter assert the exact rows approved in the design and 20 unique first introductions before Session 8.

- [ ] **Step 2: Run the gate and record RED**

Run:

```powershell
npx tsx tests/learning_v2_noncheckpoint_lexical_density_gate_v2.ts
```

Expected: FAIL at `every_noncheckpoint_introduces_new_lexicon`; the failure message prints the exact current missing count and the first chapter exposes only `here/ready` as new senses.

- [ ] **Step 3: Add the gate to the aggregate script without weakening failure semantics**

The aggregate script must expose `lexical_density_findings` separately. A missing or thrown density gate is a finding, never a skipped check.

- [ ] **Step 4: Commit the RED evidence**

```powershell
git add -- tests/learning_v2_noncheckpoint_lexical_density_gate_v2.ts scripts/learning_v2_curriculum_blueprint_gate_v2.ts
git commit -m "test(learning-v2): require new lexicon outside checkpoints"
```

### Task 2: Introduce an explicit session lexical-assignment contract

**Files:**
- Create: `modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2.ts`
- Modify: `tests/learning_v2_noncheckpoint_lexical_density_gate_v2.ts`

- [ ] **Step 1: Extend RED with assignment-source invariants**

Assert one assignment for each non-checkpoint packet, none for checkpoints, unique sense IDs, one first-introduction session per sense, and 2–4 session-specific canonical examples.

- [ ] **Step 2: Verify the new assertions fail because the module is absent**

Run the focused gate. Expected: module/import failure before implementation; this is the correct RED for the new source boundary.

- [ ] **Step 3: Create the assignment types and fail-closed constructor**

```ts
export type LearningV2EnglishSessionLexicalItemV2 = Readonly<{
  id: string;
  english: string;
  glossRu: string;
  partOfSpeech: string;
  groundingOperationId: string;
}>;

export type LearningV2EnglishSessionLexicalAssignmentV2 = Readonly<{
  sessionId: `lesson-${string}:session:${string}`;
  absoluteSessionOrdinal: number;
  newSenses: readonly LearningV2EnglishSessionLexicalItemV2[];
  retrievalSenseIds: readonly string[];
  canonicalExamples: readonly string[];
}>;
```

Export an immutable array and index it by absolute/session ID. Duplicate IDs or assignments throw at module initialization.

- [ ] **Step 4: Add the exact first-chapter assignments**

Encode the approved 20 senses:

```text
S1 here ready fine
S2 happy sad tired
S3 busy free late
S4 hungry thirsty sick
S5 cold hot warm
S6 calm nervous excited
S7 angry scared
S8 checkpoint: no assignment and no new senses
```

Each new word must appear in a natural `I am ...` canonical example. S7 introduces its two words through word-first contacts before spoken production.

- [ ] **Step 5: Run the focused gate**

Expected: the first-chapter assertions pass; the global count still fails because Lessons 1–32 are not fully assigned yet.

- [ ] **Step 6: Commit the assignment boundary and first chapter**

```powershell
git add -- modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2.ts tests/learning_v2_noncheckpoint_lexical_density_gate_v2.ts
git commit -m "feat(learning-v2): plan diverse I am vocabulary"
```

### Task 3: Author the complete 32-lesson session lexical matrix

**Files:**
- Modify: `modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2.ts`
- Modify: `docs/v2/curriculum/en/COURSE_OVERVIEW_32_LESSONS.ru.md`
- Test: `tests/learning_v2_noncheckpoint_lexical_density_gate_v2.ts`

- [ ] **Step 1: Add fail-fast per-lesson diagnostics**

The gate prints only missing session IDs grouped by lesson and fails with exact counts. It also rejects `hello`, `name`, duplicate new senses, slash-bundled lexical items, single-letter fragments, and words absent from their canonical examples.

- [ ] **Step 2: Author assignments lesson by lesson in grammar order**

For each lesson, author all 49 non-checkpoint rows before moving to the next lesson. Use the lesson's grammar operations and prohibited constructs as the boundary. Each row contains 1–3 useful first-introduction senses, previously introduced retrieval IDs, and 2–4 natural examples. The required target ranges are:

```text
introduce / guided extension: 2–3 new senses
guided application: 2–3
diagnostic repair: 1–2
listening retrieval: 1–2
spoken production: 1–2
checkpoint: 0
```

The course therefore contains at least 1,568 unique planned senses. Existing legacy vocabulary is only a candidate pool; assignment order is decided by grammar fit, frequency, and naturalness.

- [ ] **Step 3: Run the gate after each completed lesson**

```powershell
npx tsx tests/learning_v2_noncheckpoint_lexical_density_gate_v2.ts
```

Expected while incomplete: exact remaining lesson/session IDs. Expected after Lesson 32: PASS with `noncheckpoints=1568 checkpoints=224 planned_senses>=1568`.

- [ ] **Step 4: Perform the required drift-check after each lesson-equivalent batch**

Re-read the applicable `СТАРТ В2` authority block and verify grammar boundary, no future constructs, lexical first introduction, and changed-context retrieval. Record `ON TRACK` or stop at `HOLD`.

- [ ] **Step 5: Commit each completed lesson as an isolated curriculum batch**

Use the exact subject:

```powershell
git add -- modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2.ts docs/v2/curriculum/en/COURSE_OVERVIEW_32_LESSONS.ru.md
git commit -m "content(learning-v2): plan lesson NN vocabulary"
```

Replace `NN` with the two-digit lesson ordinal. Do not combine unrelated worktree changes.

### Task 4: Materialize planned senses, examples, and retrieval edges

**Files:**
- Modify: `modules/learning-v2/curriculum/en/lexical_progression_en_v2.ts`
- Modify: `modules/learning-v2/curriculum/en/exact_session_packets_en_v2.ts`
- Modify: `tests/learning_v2_lexical_progression_gate_v2.ts`
- Modify: `tests/learning_v2_exact_session_packets_gate_v2.ts`
- Modify: `tests/learning_v2_semantic_alignment_gate_v2.ts`

- [ ] **Step 1: Write RED assertions against the materialized projections**

Require exact parity between assignment rows, planned senses, packet `newLexicalSenseIds`, packet canonical examples, and forward retrieval edges.

- [ ] **Step 2: Run the three focused gates and verify RED**

```powershell
npx tsx tests/learning_v2_lexical_progression_gate_v2.ts
npx tsx tests/learning_v2_exact_session_packets_gate_v2.ts
npx tsx tests/learning_v2_semantic_alignment_gate_v2.ts
```

Expected: parity and obsolete `no_more_than_two_new_senses_in_one_session` assertions fail.

- [ ] **Step 3: Replace candidate-pool inference with explicit assignments**

`lexical_progression_en_v2.ts` maps every `newSenses` entry to one planned sense with the assignment's exact introduction ordinal. It derives forward edges from explicit `retrievalSenseIds` plus required delayed retrieval targets. It preserves `REQUIRES_MANUAL_AUTHORING` and `definitionByLocale: null`.

- [ ] **Step 4: Replace blind example cycling in exact packets**

`exact_session_packets_en_v2.ts` reads the assignment for each non-checkpoint packet. `activityPlan` distributes examples without repeating an exact `target + family` pair; if the assignment cannot cover 17 interactions under that rule, construction throws `learning_v2_activity_example_diversity_insufficient:<sessionId>`.

- [ ] **Step 5: Run focused GREEN gates**

Expected: lexical progression, exact packet, semantic alignment, and lexical density all PASS.

- [ ] **Step 6: Commit the canonical projection**

```powershell
git add -- modules/learning-v2/curriculum/en/lexical_progression_en_v2.ts modules/learning-v2/curriculum/en/exact_session_packets_en_v2.ts tests/learning_v2_lexical_progression_gate_v2.ts tests/learning_v2_exact_session_packets_gate_v2.ts tests/learning_v2_semantic_alignment_gate_v2.ts
git commit -m "feat(learning-v2): materialize full-course lexical progression"
```

### Task 5: Supersede the old fingerprint and rebuild owner review

**Files:**
- Modify: `modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts`
- Modify: `modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2.ts`
- Modify: `scripts/build_learning_v2_curriculum_owner_map_v2.ts`
- Modify: `tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts`
- Modify: `tests/learning_v2_curriculum_owner_map_v2_gate.mjs`
- Modify: `docs/v2/СТАРТ В2.md`
- Modify: `docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md`
- Modify: `docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md`

- [ ] **Step 1: Write RED fingerprint/map assertions**

Require the old `3a4ca...` fingerprint to resolve as `SUPERSEDED`, the current body to be `PENDING`, and the owner HTML to include the current fingerprint plus `1,568 non-checkpoint lexical introductions`, `224 lexical-pure checkpoints`, and the 20 first-chapter words.

- [ ] **Step 2: Run artifact and map gates to verify RED**

```powershell
npx tsx tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts
node tests/learning_v2_curriculum_owner_map_v2_gate.mjs
```

- [ ] **Step 3: Update approval history without approving the new body**

Keep every historical fingerprint. Mark `3a4ca...` superseded by `owner-required-new-lexicon-in-every-noncheckpoint-session-2026-08-30`. Do not copy the old approval to the new hash.

- [ ] **Step 4: Update the owner map renderer**

Show per session: new sense count, exact new words, retrieval words, canonical examples, grammar operation, and checkpoint status. The complete map remains clickable for all 1,792 packets.

- [ ] **Step 5: Rebuild the map**

```powershell
npx tsx scripts/build_learning_v2_curriculum_owner_map_v2.ts
```

- [ ] **Step 6: Update authority documents with generated evidence**

Record the new exact fingerprint, planned-sense count, retrieval-edge count, lexical-density PASS, owner map path, and `OWNER REVIEW REQUIRED`. Do not claim learner-facing authoring is approved.

- [ ] **Step 7: Run artifact/map GREEN gates**

Expected: both PASS with the same exact fingerprint and `owner=PENDING`.

- [ ] **Step 8: Commit the review packet**

```powershell
git add -- modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2.ts scripts/build_learning_v2_curriculum_owner_map_v2.ts tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts tests/learning_v2_curriculum_owner_map_v2_gate.mjs 'docs/v2/СТАРТ В2.md' docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md
git commit -m "docs(learning-v2): publish lexical-density blueprint review"
```

### Task 6: Final focused verification and handoff

**Files:**
- Modify: `docs/v2/HANDOVER.md`

- [ ] **Step 1: Run the narrow deterministic packet**

```powershell
npx tsx tests/learning_v2_noncheckpoint_lexical_density_gate_v2.ts
npx tsx tests/learning_v2_lexical_progression_gate_v2.ts
npx tsx tests/learning_v2_exact_session_packets_gate_v2.ts
npx tsx tests/learning_v2_semantic_alignment_gate_v2.ts
npx tsx tests/learning_v2_course_start_prerequisite_gate_v2.ts
npx tsx tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts
node tests/learning_v2_curriculum_owner_map_v2_gate.mjs
npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts
```

Expected:

```text
lexical density: PASS
lexical progression: PASS
exact packets: PASS
semantic alignment: PASS
course start: PASS
artifact integrity: PASS owner=PENDING
owner map: PASS
aggregate: HOLD only because approval_pass=false
```

- [ ] **Step 2: Check scope and unstaged collateral**

```powershell
git diff --check
git status --short
git diff --name-only HEAD~1..HEAD
```

Confirm no unrelated dirty file was staged, reverted, or overwritten.

- [ ] **Step 3: Update the handover milestone**

Record RED/GREEN commands, decisive counts, exact fingerprint, map path, open approval gate, commit IDs, and the next legal action: owner review of the new fingerprint. State explicitly that there was no deploy, publish, TTS, Firebase write, or push.

- [ ] **Step 4: Commit the handover only**

```powershell
git add -- docs/v2/HANDOVER.md
git commit -m "docs(learning-v2): hand over lexical-density blueprint"
```

## Self-review result

- Spec coverage: all twelve design sections map to Tasks 1–6.
- Placeholder scan: no unresolved marker, deferred implementation instruction, or unspecified verification command remains.
- Type consistency: assignment types, packet fields, sense fields, and gate names are stable throughout the plan.
- Scope boundary: this plan changes curriculum planning and owner review only; learner-facing copy, localization authoring, audio generation, runtime UI, deploy, and release remain excluded.

# Learning V2 Course Blueprint 32 × 56 — implementation plan

> **Owner decision:** learner-facing authoring is paused until the English
> curriculum is researched, fully planned, validated and reviewed as an exact
> 32 × 56 blueprint. The same workflow becomes mandatory for every future
> target language.

**Goal:** create a source-backed, inspectable and mechanically protected plan
for all 1,792 English Learning V2 sessions before authoring continues.

**Architecture:** human-authored target-language research dossier and 32 lesson
blueprints are the authority. A deterministic compiler may materialize the
1,792 session packets and coverage matrices, but it must never invent grammar,
lexicon, prerequisites, review edges or can-do outcomes.

**Canonical design:**
`docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md`

---

## Non-negotiable execution order

1. Freeze learner-facing Session 4+ authoring.
2. Establish the target-language research dossier and evidence ledger.
3. Define contracts and failing structural gates.
4. Author all 32 lesson boundaries and their prerequisite graph.
5. Author all 224 chapter outcomes.
6. Author all 1,792 exact session packets.
7. Materialize grammar, lexical, prerequisite, can-do and retrieval coverage.
8. Build the owner HTML curriculum map from the exact same source.
9. Audit already-authored Sessions 1–3 against their packets; preserve content
   that conforms and repair only explicit mismatches.
10. Obtain owner approval of the complete blueprint fingerprint.
11. Only then resume sequential learner-facing authoring from Session 4.

No later task may be used to bypass an earlier incomplete task.

---

## Phase 1 — Research authority

### Task 1.1: Add the curriculum start route

**Files:**

- Create: `docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md`
- Modify: `docs/v2/СТАРТ В2.md`

**Acceptance criteria:**

- every Learning V2 authoring request reads the target-language dossier, the
  course overview, the exact lesson blueprint and exact session packet;
- absence or stale fingerprint produces HOLD, never an inferred plan;
- new target languages must create their own research dossier before lesson
  planning.

### Task 1.2: Write the English research dossier

**Files:**

- Create: `docs/v2/curriculum/en/RESEARCH_DOSSIER.ru.md`
- Create: `docs/v2/curriculum/en/SOURCE_EVIDENCE_LEDGER.md`

**Required contents:**

- target learner and honest course boundary;
- English structural inventory within that boundary;
- prerequisite relations and known transfer risks for the eight locales;
- lexical selection and sense-ID policy;
- pronunciation and speech constraints;
- retrieval/interleaving policy with evidence vs product hypotheses clearly
  separated;
- CEFR/English Profile/Cambridge links and evidence receipts;
- explicit exclusions and uncertainty ledger.

**Acceptance criteria:** no pedagogical sequence is asserted without either a
source reference or an owner-labelled product hypothesis.

### Task 1.3: Freeze the 32-lesson scenario shell

**Files:**

- Create: `docs/v2/curriculum/en/COURSE_OVERVIEW_32_LESSONS.ru.md`

**Acceptance criteria:** all existing lesson titles and scenario outcomes are
preserved; each lesson receives a hard grammar boundary, lexical domains,
entry prerequisites, exit can-do and forbidden future constructs.

---

## Phase 2 — Contracts and RED gates

### Task 2.1: Define immutable curriculum contracts

**Files:**

- Create: `modules/learning-v2/curriculum/contracts/course_blueprint_v1.ts`
- Create: `modules/learning-v2/curriculum/contracts/target_language_dossier_v1.ts`
- Test: `tests/learning_v2_course_blueprint_contract.test.ts`

**Acceptance criteria:** contracts represent course, lesson, chapter, session,
grammar operation, lexical sense, prerequisite edge, review edge, source
evidence and fingerprint without optional escape hatches for required fields.

### Task 2.2: Add deterministic structural validation

**Files:**

- Create: `modules/learning-v2/curriculum/validation/course_blueprint_validation_v1.ts`
- Create: `tests/learning_v2_course_blueprint_gate.test.ts`

**RED cases:** wrong lesson/session counts, cyclic prerequisites, future-topic
leakage, missing grammar/review target, repeated first lexical introduction,
unexplained grammar, intro/practice/probe mismatch, orphan can-do, stale owner
map and cross-language English-order cloning.

### Task 2.3: Add narrow package scripts

**Files:**

- Create: `scripts/learning_v2_curriculum_blueprint_gate.ts`
- Modify: `package.json`

**Acceptance criteria:** one narrow command validates only curriculum blueprint
artifacts and does not invoke full Jest, full TypeScript or an app build.

---

## Phase 3 — English course graph

### Task 3.1: Define grammar operation registry

**Files:**

- Create: `modules/learning-v2/curriculum/en/grammar_operations_en_v1.ts`
- Test: `tests/learning_v2_english_grammar_coverage.test.ts`

**Acceptance criteria:** every operation has one stable ID, prerequisites,
meaning/function, form boundary, contrast set, introduction lesson/session,
review stages, independent probe and explicit exclusions.

### Task 3.2: Define lexical sense ledger

**Files:**

- Create: `modules/learning-v2/curriculum/en/lexical_senses_en_v1.ts`
- Test: `tests/learning_v2_english_lexical_ledger.test.ts`

**Acceptance criteria:** every packet declares `introduce_and_retrieve` or a
justified `retrieval_only` plan. New senses serve the can-do instead of a quota;
each sense has one first-introduction packet, word-first status, locale-ready
gloss intent, later-session/later-lesson/delayed retrieval edges and no
accidental reintroduction as new. Every chapter shows lexical growth and
consolidation, not filler or endless reuse of the same small set.

### Task 3.3: Author lesson blueprints 01–32

**Files:**

- Create: `modules/learning-v2/curriculum/en/lessons/lesson_01_blueprint_v1.ts`
  through `lesson_32_blueprint_v1.ts`
- Create: `modules/learning-v2/curriculum/en/course_blueprint_en_v1.ts`

**Per-lesson acceptance criteria:** exactly 7 chapters and 56 session
definitions; all grammar and lexicon stay inside the lesson boundary; session
8/16/24/32/40/48 are chapter checkpoints and 56 is lesson final transfer.

**Review cadence:** review one lesson at a time in the owner map. Do not author
learner-facing content during this phase.

---

## Phase 4 — Exact 1,792 session packets

### Task 4.1: Materialize packets without invention

**Files:**

- Create: `modules/learning-v2/curriculum/en/session_packets_en_v1.ts`
- Create: `modules/learning-v2/curriculum/en/compile_session_packets_en_v1.ts`
- Test: `tests/learning_v2_1792_session_packets.test.ts`

**Acceptance criteria:** exactly 1,792 packets; compiler only normalizes and
flattens human-authored definitions; every packet has an exact grammar
operation or explicit review set, prerequisite IDs, lexicon, review edges,
mode functions, probe and source references.

Every review packet also declares a measurable `learningDelta`; identical
training/evidence prompts and filler repetition fail validation.

### Task 4.2: Materialize coverage matrices

**Files:**

- Create: `modules/learning-v2/curriculum/en/coverage_en_v1.ts`
- Test: `tests/learning_v2_curriculum_coverage_matrices.test.ts`

**Acceptance criteria:** construct × session, lexical sense × session,
can-do × session and retrieval-delay matrices have no orphan objectives,
forgotten core vocabulary or missing delayed probes.

---

## Phase 5 — Owner review surface

### Task 5.1: Build the curriculum owner map

**Files:**

- Create: `scripts/build_learning_v2_curriculum_owner_map.ts`
- Generate: `.codex-tmp/learning-v2-curriculum-owner-map/index.html`
- Test: `tests/learning_v2_curriculum_owner_map.test.ts`

**Acceptance criteria:** the HTML exposes all 32 lessons and all 56 packets per
lesson, prerequisites, grammar/review status, new/retrieved lexicon, probes,
source receipts and conflicts. It is regenerated from the same source and
displays the matching fingerprint.

### Task 5.2: Make freshness mandatory

**Files:**

- Modify: `scripts/learning_v2_curriculum_blueprint_gate.ts`
- Modify: `docs/v2/СТАРТ В2.md`

**Acceptance criteria:** source changes with a stale owner map fail the gate;
every completed lesson-plan revision regenerates the map before it may be
presented as complete.

---

## Phase 6 — Existing content conformance

### Task 6.1: Audit English Sessions 1–3

**Files:**

- Create: `docs/v2/curriculum/en/LESSON_01_SESSIONS_01_03_CONFORMANCE.md`
- Modify only if required by explicit mismatch:
  `modules/learning-v2/content/episode_01_*`

**Acceptance criteria:** each authored objective, intro, practice mode,
distractor, lexical item and probe maps to its exact packet; conforming material
is retained; repair scope is listed before source edits.

### Task 6.2: Lock the blueprint revision

**Files:**

- Create: `docs/v2/curriculum/en/OWNER_APPROVAL.md`
- Modify: `docs/v2/СТАРТ В2.md`

**Acceptance criteria:** owner-approved fingerprint, date and accepted findings
are explicit. Session 4 remains HOLD until this receipt exists.

---

## Phase 7 — New target-language bootstrap

### Task 7.1: Add a reusable language bootstrap contract

**Files:**

- Create: `docs/v2/curriculum/TARGET_LANGUAGE_BOOTSTRAP_TEMPLATE.ru.md`
- Create: `modules/learning-v2/curriculum/contracts/target_language_bootstrap_v1.ts`
- Test: `tests/learning_v2_target_language_bootstrap_gate.test.ts`

**Acceptance criteria:** a language cannot enter authoring merely by translating
or cloning English order. It must provide its own structural inventory,
prerequisite graph, transfer analysis, lexical ledger, 32 lesson adaptations,
224 chapter outcomes, 1,792 packets and owner-approved fingerprint.

---

## Verification policy

- During writing: run only the smallest focused gate for the edited artifact.
- Before each lesson-plan review: run curriculum structural validation and
  regenerate the owner map.
- Before final owner approval: acquire the shared heavy-process semaphore only
  if a genuinely heavy command is required. Prefer the narrow blueprint command.
- A model assertion never overrides a failing deterministic gate.

## Current state

- Design: approved and documented.
- Learner-facing Session 4+: HOLD.
- Phase 1: ready to execute.
- Existing Sessions 1–3: preserved pending conformance audit.

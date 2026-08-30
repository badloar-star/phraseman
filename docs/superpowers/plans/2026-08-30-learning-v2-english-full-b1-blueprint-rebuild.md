# Learning V2 English Full-B1 Grammar-First Blueprint Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Заменить устаревший английский Learning V2 blueprint полным grammar-first планом PRE-A1 → функциональный B1 для 32 уроков, 224 глав и 1 792 точных сессий, не изменяя learner-facing Sessions 1–3 до отдельного owner approval нового fingerprint.

**Architecture:** Новый canonical blueprint собирается параллельным набором `v2`-модулей сверху вниз: scope → grammar registry → prerequisite DAG → lessons → chapters → lexical ledger → exact packets → coverage matrices → fingerprint → owner map. Старый `v1` остаётся историческим слепком, но его fingerprint получает статус `SUPERSEDED`; новый `v2` остаётся `PENDING`, пока владелец явно не утвердит показанный owner map. Каждый нижний слой ссылается только на ID из уже прошедшего верхнего слоя, а отдельные детерминированные gates запрещают скрытую грамматику, бессмысленную лексику, неверные режимы и расхождение артефактов.

**Tech Stack:** TypeScript, Node.js, `tsx`, `node:assert/strict`, canonical SHA-256 через `hashCanonicalBody`, статический HTML owner-review, Markdown contract documentation.

---

## Scope boundary

Этот план строит и проверяет новый canonical curriculum package до owner-review. Он сознательно не:

- переписывает learner-facing `episode_01_session_01..03`;
- разрешает authoring Session 4+;
- генерирует TTS, изображения или production payloads;
- меняет runtime, Firebase, экономику или release surface;
- записывает `APPROVED` без отдельного явного решения владельца по новому fingerprint.

После owner approval нужен отдельный implementation plan: последовательно привести Sessions 1–3 к новым packets, добиться нуля conformance findings и только затем открыть Session 4.

## File map

### Historical authority and status

- Modify: `modules/learning-v2/curriculum/en/course_blueprint_en_v1.ts` — оставить старое canonical body неизменным, изменить только статус approval на `SUPERSEDED`.
- Create: `modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2.ts` — единственная таблица старого и нового fingerprint/status.
- Modify: `tests/learning_v2_english_course_blueprint_owner_approval_gate.ts` — запретить старому fingerprint авторизовать новое authoring.

### New canonical `v2` model

- Create: `modules/learning-v2/curriculum/contracts/course_blueprint_v2.ts` — типы lesson/chapter/session/activity/choice-feedback и строгие assertions.
- Create: `modules/learning-v2/curriculum/en/full_b1_scope_en_v2.ts` — 32 major systems, B1 inventory, exclusions and source refs.
- Create: `modules/learning-v2/curriculum/en/grammar_operations_en_v2.ts` — human-authored microgrammar registry.
- Create: `modules/learning-v2/curriculum/en/prerequisite_dag_en_v2.ts` — directed prerequisite graph and validation.
- Create: `modules/learning-v2/curriculum/en/lesson_blueprints_en_v2.ts` — exact 32-lesson spine.
- Create: `modules/learning-v2/curriculum/en/chapter_blueprints_en_v2.ts` — exact 224 dependency-safe chapter records.
- Create: `modules/learning-v2/curriculum/en/lexical_senses_en_v2.ts` — lexical senses, eight-locale card definitions, audio asset IDs and retrieval edges.
- Create: `modules/learning-v2/curriculum/en/exact_session_packets_en_v2.ts` — 1 792 exact packets, each with 3 intros + 17 practices.
- Create: `modules/learning-v2/curriculum/en/coverage_matrices_en_v2.ts` — grammar, lexical, mode and assessment traceability.
- Create: `modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts` — canonical body, fingerprint and `PENDING` status.
- Create: `modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2.ts` — computed counts/fingerprint manifest consumed by docs and owner map.
- Create: `modules/learning-v2/curriculum/validation/course_blueprint_validation_v2.ts` — cross-layer semantic validator.

### Deterministic gates

- Create: `tests/learning_v2_full_b1_scope_gate_v2.ts`.
- Create: `tests/learning_v2_grammar_registry_gate_v2.ts`.
- Create: `tests/learning_v2_prerequisite_dag_gate_v2.ts`.
- Create: `tests/learning_v2_lesson_blueprints_gate_v2.ts`.
- Create: `tests/learning_v2_chapter_blueprints_gate_v2.ts`.
- Create: `tests/learning_v2_lexical_registry_gate_v2.ts`.
- Create: `tests/learning_v2_exact_session_packets_gate_v2.ts`.
- Create: `tests/learning_v2_activity_semantics_gate_v2.ts`.
- Create: `tests/learning_v2_coverage_matrices_gate_v2.ts`.
- Create: `tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts`.
- Modify: `package.json` — добавить один узкий aggregate command `learning-v2:curriculum-blueprint-v2-gate`.

### Owner-review and documentation

- Create: `scripts/build_learning_v2_curriculum_owner_map_v2.ts` — сериализовать только новый package.
- Modify: `scripts/build_learning_v2_curriculum_owner_map.mjs` — показать supersession, 32/224/1792, exact packets and `PENDING` fingerprint.
- Modify: `tests/learning_v2_curriculum_owner_map_gate.mjs` — проверять новый map contract.
- Modify: `docs/v2/СТАРТ В2.md` — сделать новый approved design и v2-gate обязательным route item.
- Modify: `docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md` — записать top-down authoring sequence and stop conditions.
- Replace: `docs/v2/curriculum/en/COURSE_OVERVIEW_32_LESSONS.ru.md` — 32 grammar-first lessons from approved design.
- Modify: `docs/v2/curriculum/en/RESEARCH_DOSSIER.ru.md` — source-to-scope rationale.
- Modify: `docs/v2/curriculum/en/SOURCE_EVIDENCE_LEDGER.md` — stable evidence IDs referenced by v2 records.
- Create: `docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md` — counts, findings, fingerprint and approval instructions.
- Modify: `docs/v2/HANDOVER.md` — exact current phase, gate output and next legal action.

## Task 1: Supersede the old approval without touching its canonical body

**Files:**
- Create: `modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2.ts`
- Modify: `modules/learning-v2/curriculum/en/course_blueprint_en_v1.ts:36-40`
- Modify: `tests/learning_v2_english_course_blueprint_owner_approval_gate.ts`

- [ ] **Step 1: Write the failing supersession assertions**

Replace the old approval expectations with:

```ts
import assert from "node:assert/strict";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v1";
import { LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2 } from "../modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2";

const OLD = "013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a";
assert.equal(LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1.blueprintFingerprint, OLD);
assert.equal(LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V1.ownerApproval, "SUPERSEDED");
assert.deepEqual(LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2[OLD], {
  status: "SUPERSEDED",
  reason: "OWNER_DECISION_FULL_B1_GRAMMAR_FIRST_REBUILD_2026_08_30",
});
```

- [ ] **Step 2: Run the focused gate and confirm RED**

Run: `npx tsx tests/learning_v2_english_course_blueprint_owner_approval_gate.ts`

Expected: FAIL because the registry module is absent or the old status is still `APPROVED`.

- [ ] **Step 3: Add the immutable approval registry and superseded status**

```ts
export type LearningV2EnglishBlueprintApprovalStatusV2 =
  | "SUPERSEDED"
  | "PENDING"
  | "APPROVED";

export const LEARNING_V2_ENGLISH_BLUEPRINT_APPROVAL_REGISTRY_V2 = Object.freeze({
  "013e742080c20d6a71fc731dc55ac26aaeb0e1fda2d3e6fd59712b65fdc1695a": Object.freeze({
    status: "SUPERSEDED" as const,
    reason: "OWNER_DECISION_FULL_B1_GRAMMAR_FIRST_REBUILD_2026_08_30" as const,
  }),
});
```

Change only `ownerApproval` in the v1 export to `"SUPERSEDED" as const`; do not change `body`, counts or fingerprint inputs.

- [ ] **Step 4: Run the focused gate and confirm GREEN**

Run: `npx tsx tests/learning_v2_english_course_blueprint_owner_approval_gate.ts`

Expected: `LEARNING V2 ENGLISH COURSE BLUEPRINT OWNER APPROVAL GATE: PASS`.

- [ ] **Step 5: Commit the supersession boundary**

```bash
git add modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2.ts modules/learning-v2/curriculum/en/course_blueprint_en_v1.ts tests/learning_v2_english_course_blueprint_owner_approval_gate.ts
git commit -m "fix: supersede obsolete English blueprint approval"
```

## Task 2: Define the complete v2 contract before authoring data

**Files:**
- Create: `modules/learning-v2/curriculum/contracts/course_blueprint_v2.ts`
- Create: `tests/learning_v2_course_blueprint_contract_gate_v2.ts`

- [ ] **Step 1: Write RED tests for exact interaction and choice contracts**

```ts
import assert from "node:assert/strict";
import {
  assertLearningV2CurriculumSessionPacketV2,
  type LearningV2CurriculumSessionPacketV2,
} from "../modules/learning-v2/curriculum/contracts/course_blueprint_v2";

const VALID: LearningV2CurriculumSessionPacketV2 = Object.freeze({
  sessionId: "lesson-01:session:01",
  lessonOrdinal: 1,
  chapterOrdinal: 1,
  sessionOrdinal: 1,
  role: "introduce_grammar",
  grammarOperationIds: Object.freeze(["en.be.present.affirmative.i_am"]),
  reviewOperationIds: Object.freeze([]),
  primaryCanDoStep: "Сообщить одну информацию о себе через I am.",
  prerequisiteSessionIds: Object.freeze([]),
  newLexicalSenseIds: Object.freeze(["en.ready.adjective.01"]),
  retrievalLexicalSenseIds: Object.freeze([]),
  introInteractions: Object.freeze([
    Object.freeze({ slot: 1, purpose: "meaning", operationIds: Object.freeze(["en.be.present.affirmative.i_am"]), checkActivityId: "l01s01a01" }),
    Object.freeze({ slot: 2, purpose: "form", operationIds: Object.freeze(["en.be.present.affirmative.i_am"]), checkActivityId: "l01s01a02" }),
    Object.freeze({ slot: 3, purpose: "diagnostic_trap", operationIds: Object.freeze(["en.be.present.affirmative.i_am"]), checkActivityId: "l01s01a03" }),
  ]),
  practiceInteractions: Object.freeze(Array.from({ length: 17 }, (_, index) => Object.freeze({
    activityId: `l01s01a${String(index + 4).padStart(2, "0")}`,
    slot: index + 4,
    modeFamily: (["phrase_builder", "listen_choose", "listen_build_dictation", "context_gap_grammar", "speed_match", "scripted_repeat_compare"] as const)[index % 6],
    targetOperationIds: Object.freeze(["en.be.present.affirmative.i_am"]),
    targetLexicalSenseIds: Object.freeze(["en.ready.adjective.01"]),
    support: index < 5 ? "high" : index < 12 ? "medium" : "low",
    independentEvidence: index === 16,
  }))),
  sourceEvidenceRefs: Object.freeze(["EV-CEFR-B1-GRAMMAR-01"]),
});

assert.doesNotThrow(() => assertLearningV2CurriculumSessionPacketV2(VALID));
assert.throws(
  () => assertLearningV2CurriculumSessionPacketV2({ ...VALID, introInteractions: VALID.introInteractions.slice(0, 2) }),
  /learning_v2_v2_intro_count_invalid/,
);
assert.throws(
  () => assertLearningV2CurriculumSessionPacketV2({ ...VALID, practiceInteractions: VALID.practiceInteractions.slice(0, 16) }),
  /learning_v2_v2_practice_count_invalid/,
);
```

- [ ] **Step 2: Run the contract test and confirm RED**

Run: `npx tsx tests/learning_v2_course_blueprint_contract_gate_v2.ts`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `course_blueprint_v2`.

- [ ] **Step 3: Implement exact v2 types and assertion codes**

Define these unions and records in `course_blueprint_v2.ts`:

```ts
export const LEARNING_V2_ACTIVE_MODE_FAMILIES_V2 = Object.freeze([
  "phrase_builder",
  "listen_choose",
  "listen_build_dictation",
  "context_gap_grammar",
  "speed_match",
  "scripted_repeat_compare",
] as const);

export type LearningV2ModeFamilyV2 = typeof LEARNING_V2_ACTIVE_MODE_FAMILIES_V2[number];
export type LearningV2IntroPurposeV2 = "meaning" | "form" | "diagnostic_trap" | "recenter";
export type LearningV2SupportV2 = "maximum" | "high" | "medium" | "low" | "minimal" | "none";
export type LearningV2BlueprintApprovalV2 = "PENDING" | "APPROVED";
```

Add `LearningV2ChoiceOptionV2` with `optionId`, `text`, `isCorrect`, `diagnosticErrorId`, and `feedbackByLocale` for exactly `ru/uk/es/pt-BR/vi/id/tr/pl`. Add mode-native payload unions so `speed_match` owns exactly four `pairs`, builders own whole-word `tiles`, and choice modes own exactly four `options`.

Every audio-bearing payload also contains:

```ts
type LearningV2AudioContractV2 = Readonly<{
  audioAssetId: string;
  preloadBeforeSession: true;
  replayEnabled: true;
  autoplayOnEntry: boolean;
}>;

type LearningV2SpeechContractV2 = Readonly<{
  interaction: "hold_press_release";
  releaseEndsCapture: true;
  ownerPreviewSkipEnabled: true;
  accessibilityEquivalentEnabled: true;
  singleMeasurementIsSoleGate: false;
}>;

type LearningV2MotionContractV2 = Readonly<{
  blocksInteraction: false;
  reducedMotionPreservesMeaning: true;
}>;
```

The assertion must emit stable codes for 3 intros, 17 practices, slot sequence 1–20, unknown mode, letter tiles, missing locale feedback, invalid correct-answer count, missing audio preload/replay, incorrect speech lifecycle and motion that blocks interaction.

- [ ] **Step 4: Run the focused contract gate**

Run: `npx tsx tests/learning_v2_course_blueprint_contract_gate_v2.ts`

Expected: PASS and `LEARNING V2 COURSE BLUEPRINT V2 CONTRACT GATE: PASS`.

- [ ] **Step 5: Commit the contract**

```bash
git add modules/learning-v2/curriculum/contracts/course_blueprint_v2.ts tests/learning_v2_course_blueprint_contract_gate_v2.ts
git commit -m "feat: define exact Learning V2 blueprint v2 contract"
```

## Task 3: Encode the approved 32-lesson full-B1 scope

**Files:**
- Create: `modules/learning-v2/curriculum/en/full_b1_scope_en_v2.ts`
- Create: `tests/learning_v2_full_b1_scope_gate_v2.ts`
- Modify: `docs/v2/curriculum/en/RESEARCH_DOSSIER.ru.md`
- Modify: `docs/v2/curriculum/en/SOURCE_EVIDENCE_LEDGER.md`

- [ ] **Step 1: Write the exact lesson-system gate**

```ts
const EXPECTED = Object.freeze([
  "present_be_affirmative", "present_be_questions_negatives", "nouns_core_determiners", "existence_place",
  "possession", "present_simple_affirmative", "present_simple_questions_negatives", "ability_requests_instructions",
  "present_continuous", "present_simple_vs_continuous", "past_be_existence", "past_simple_affirmative",
  "past_simple_questions_negatives", "past_continuous", "planned_future", "will_future",
  "countability_quantification", "comparison_degree", "ability_permission", "obligation_prohibition_advice",
  "verb_complement_patterns", "pronoun_reference", "present_perfect_experience_result", "present_perfect_duration_contrast",
  "past_habits_narrative_ordering", "zero_first_conditional", "second_conditional_wishes", "passive_voice",
  "defining_relative_clauses", "reported_speech", "complex_questions_clause_linking", "probability_deduction",
]);
assert.deepEqual(LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2.lessons.map((row) => row.majorSystemId), EXPECTED);
assert.equal(LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2.lessons.every((row) => row.introducesNewMajorSystem), true);
assert.equal(LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2.lessons.some((row) => row.checkpointOnly), false);
```

- [ ] **Step 2: Run the scope gate and confirm RED**

Run: `npx tsx tests/learning_v2_full_b1_scope_gate_v2.ts`

Expected: FAIL because `full_b1_scope_en_v2.ts` does not exist.

- [ ] **Step 3: Add the exact 32 rows from the approved design**

Each row must contain:

```ts
type LearningV2EnglishLessonScopeV2 = Readonly<{
  lessonOrdinal: number;
  majorSystemId: string;
  titleRu: string;
  includedSubsystems: readonly string[];
  excludedExtensions: readonly string[];
  terminalCanDoRu: string;
  introducesNewMajorSystem: true;
  checkpointOnly: false;
  sourceEvidenceRefs: readonly string[];
}>;
```

Transcribe all 32 lesson systems and subsystem boundaries from sections 4–5 of the approved design. Add stable evidence rows for CEFR B1 scope, English Profile descriptors and the project grammar/content bibles; every scope row references at least one external-scope evidence ID and one owner-contract ID.

- [ ] **Step 4: Run the scope gate**

Run: `npx tsx tests/learning_v2_full_b1_scope_gate_v2.ts`

Expected: `LEARNING V2 FULL B1 SCOPE V2 GATE: PASS` with `lessons=32 checkpoint_only=0`.

- [ ] **Step 5: Commit scope and evidence**

```bash
git add modules/learning-v2/curriculum/en/full_b1_scope_en_v2.ts tests/learning_v2_full_b1_scope_gate_v2.ts docs/v2/curriculum/en/RESEARCH_DOSSIER.ru.md docs/v2/curriculum/en/SOURCE_EVIDENCE_LEDGER.md
git commit -m "feat: encode approved English full B1 scope"
```

## Task 4: Author the microgrammar registry

**Files:**
- Create: `modules/learning-v2/curriculum/en/grammar_operations_en_v2.ts`
- Create: `tests/learning_v2_grammar_registry_gate_v2.ts`

- [ ] **Step 1: Write RED tests for ownership, coverage and atomicity**

```ts
for (const lesson of LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2.lessons) {
  const owned = OPERATIONS.filter((operation) => operation.lessonOrdinal === lesson.lessonOrdinal);
  assert.ok(owned.length >= 1, `lesson_major_system_has_no_operation:${lesson.lessonOrdinal}`);
  assert.ok(owned.every((operation) => operation.majorSystemId === lesson.majorSystemId));
}
assert.equal(new Set(OPERATIONS.map((operation) => operation.id)).size, OPERATIONS.length);
assert.equal(OPERATIONS.some((operation) => operation.formBoundary.some((form) => form.includes(" / "))), false);
assert.equal(OPERATIONS.every((operation) => operation.fullSessionBeforeUse), true);
```

- [ ] **Step 2: Run the registry gate and confirm RED**

Run: `npx tsx tests/learning_v2_grammar_registry_gate_v2.ts`

Expected: FAIL because the v2 registry is absent.

- [ ] **Step 3: Add human-authored operations grouped by lesson**

Use this exact record shape:

```ts
export type LearningV2EnglishGrammarOperationV2 = Readonly<{
  id: string;
  lessonOrdinal: number;
  majorSystemId: string;
  communicativeFunctionRu: string;
  decisionRuleRu: string;
  formBoundary: readonly string[];
  positiveExamples: readonly [string, string];
  diagnosticErrorIds: readonly string[];
  prerequisiteOperationIds: readonly string[];
  prohibitedExtensionIds: readonly string[];
  fullSessionBeforeUse: true;
  sourceEvidenceRefs: readonly string[];
}>;
```

Split each approved lesson system into atomic form/meaning decisions. Do not place `to`, auxiliary `do`, a new tense, a new clause type or a new pronoun role inside examples before its own operation exists. `positiveExamples` must demonstrate the operation itself and may use only prior operations plus the current operation.

- [ ] **Step 4: Run the registry and scope gates together**

Run: `npx tsx tests/learning_v2_full_b1_scope_gate_v2.ts && npx tsx tests/learning_v2_grammar_registry_gate_v2.ts`

Expected: both PASS; output includes `lesson_systems=32`, unique operation count and `future_grammar_examples=0`.

- [ ] **Step 5: Commit the registry**

```bash
git add modules/learning-v2/curriculum/en/grammar_operations_en_v2.ts tests/learning_v2_grammar_registry_gate_v2.ts
git commit -m "feat: author full B1 microgrammar registry"
```

## Task 5: Build and prove the prerequisite DAG

**Files:**
- Create: `modules/learning-v2/curriculum/en/prerequisite_dag_en_v2.ts`
- Create: `tests/learning_v2_prerequisite_dag_gate_v2.ts`

- [ ] **Step 1: Write failing DAG invariants**

Test duplicate/self/missing/future edges, cycles, and reachability:

```ts
const findings = validateLearningV2EnglishGrammarPrerequisiteDagV2(DAG);
assert.deepEqual(findings, []);
assert.equal(DAG.operations.every((operation) => isReachableFromCourseStart(operation.id, DAG)), true);
assert.equal(DAG.edges.every((edge) => {
  const from = BY_ID.get(edge.prerequisiteOperationId)!;
  const to = BY_ID.get(edge.dependentOperationId)!;
  return from.lessonOrdinal <= to.lessonOrdinal;
}), true);
```

- [ ] **Step 2: Run and confirm RED**

Run: `npx tsx tests/learning_v2_prerequisite_dag_gate_v2.ts`

Expected: FAIL because the v2 DAG does not exist.

- [ ] **Step 3: Implement edges derived only from authored prerequisite IDs**

Expose:

```ts
export const LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_EDGES_V2 = Object.freeze(
  OPERATIONS.flatMap((operation) => operation.prerequisiteOperationIds.map((prerequisiteOperationId) => Object.freeze({
    prerequisiteOperationId,
    dependentOperationId: operation.id,
  }))),
);
```

Implement stable finding codes `dag_duplicate_edge`, `dag_self_edge`, `dag_edge_operation_missing`, `dag_future_prerequisite`, `dag_cycle`, and `dag_unreachable_operation`.

- [ ] **Step 4: Run registry + DAG gates**

Run: `npx tsx tests/learning_v2_grammar_registry_gate_v2.ts && npx tsx tests/learning_v2_prerequisite_dag_gate_v2.ts`

Expected: PASS with `cycles=0 unreachable=0 future_edges=0`.

- [ ] **Step 5: Commit the DAG**

```bash
git add modules/learning-v2/curriculum/en/prerequisite_dag_en_v2.ts tests/learning_v2_prerequisite_dag_gate_v2.ts
git commit -m "feat: prove English full B1 prerequisite graph"
```

## Task 6: Materialize 32 lesson blueprints

**Files:**
- Create: `modules/learning-v2/curriculum/en/lesson_blueprints_en_v2.ts`
- Create: `tests/learning_v2_lesson_blueprints_gate_v2.ts`
- Replace: `docs/v2/curriculum/en/COURSE_OVERVIEW_32_LESSONS.ru.md`

- [ ] **Step 1: Write the exact 32-lesson gate**

```ts
assert.equal(LESSONS.length, 32);
assert.deepEqual(LESSONS.map((lesson) => lesson.lessonOrdinal), Array.from({ length: 32 }, (_, i) => i + 1));
for (const lesson of LESSONS) {
  assert.equal(lesson.chapterCount, 7);
  assert.equal(lesson.sessionCount, 56);
  assert.equal(lesson.checkpointOnly, false);
  assert.ok(lesson.ownedGrammarOperationIds.length > 0);
  assert.equal(lesson.ownedGrammarOperationIds.every((id) => OPERATION_BY_ID.get(id)?.lessonOrdinal === lesson.lessonOrdinal), true);
}
```

- [ ] **Step 2: Run and confirm RED**

Run: `npx tsx tests/learning_v2_lesson_blueprints_gate_v2.ts`

Expected: FAIL because `lesson_blueprints_en_v2.ts` is absent.

- [ ] **Step 3: Implement one exact record per approved lesson**

```ts
export type LearningV2EnglishLessonBlueprintV2 = Readonly<{
  lessonId: `lesson-${string}`;
  lessonOrdinal: number;
  titleRu: string;
  majorSystemId: string;
  terminalCanDoRu: string;
  ownedGrammarOperationIds: readonly string[];
  deliberateReviewOperationIds: readonly string[];
  chapterCount: 7;
  sessionCount: 56;
  checkpointOnly: false;
  sourceEvidenceRefs: readonly string[];
}>;
```

The Markdown overview must render the same 32 rows and operation counts from the TypeScript authority; it must not contain `hello/name` as a lesson objective or any review-only lesson.

- [ ] **Step 4: Run the lesson gate and documentation parity check**

Run: `npx tsx tests/learning_v2_lesson_blueprints_gate_v2.ts`

Expected: PASS with `lessons=32 review_only_lessons=0`.

- [ ] **Step 5: Commit lessons**

```bash
git add modules/learning-v2/curriculum/en/lesson_blueprints_en_v2.ts tests/learning_v2_lesson_blueprints_gate_v2.ts docs/v2/curriculum/en/COURSE_OVERVIEW_32_LESSONS.ru.md
git commit -m "feat: materialize 32 grammar-first lesson blueprints"
```

## Task 7: Materialize 224 dependency-safe chapter blueprints

**Files:**
- Create: `modules/learning-v2/curriculum/en/chapter_blueprints_en_v2.ts`
- Create: `tests/learning_v2_chapter_blueprints_gate_v2.ts`

- [ ] **Step 1: Write failing chapter topology and alignment tests**

```ts
assert.equal(CHAPTERS.length, 224);
for (const lesson of LESSONS) {
  const chapters = CHAPTERS.filter((chapter) => chapter.lessonOrdinal === lesson.lessonOrdinal);
  assert.deepEqual(chapters.map((chapter) => chapter.chapterOrdinal), [1, 2, 3, 4, 5, 6, 7]);
  assert.equal(chapters.every((chapter) => chapter.majorSystemId === lesson.majorSystemId), true);
  assert.equal(chapters.every((chapter) => chapter.newOperationIds.length + chapter.reviewOperationIds.length > 0), true);
}
```

- [ ] **Step 2: Run and confirm RED**

Run: `npx tsx tests/learning_v2_chapter_blueprints_gate_v2.ts`

Expected: FAIL because the v2 chapter module is absent.

- [ ] **Step 3: Author seven chapter steps per lesson**

Use:

```ts
export type LearningV2EnglishChapterBlueprintV2 = Readonly<{
  chapterId: `lesson-${string}:chapter:${string}`;
  lessonOrdinal: number;
  chapterOrdinal: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  majorSystemId: string;
  titleRu: string;
  primaryCanDoStepRu: string;
  newOperationIds: readonly string[];
  reviewOperationIds: readonly string[];
  prohibitedOperationIds: readonly string[];
  transferContextRu: string;
  independentEvidenceRu: string;
  sourceEvidenceRefs: readonly string[];
}>;
```

Distribute the lesson's operations in prerequisite order. A chapter with fewer than three new operations uses named guided extension/retrieval sessions; it does not invent unrelated grammar. Chapter 7 integrates only the current major system plus explicit prior review IDs.

- [ ] **Step 4: Run lesson, DAG and chapter gates**

Run: `npx tsx tests/learning_v2_lesson_blueprints_gate_v2.ts && npx tsx tests/learning_v2_prerequisite_dag_gate_v2.ts && npx tsx tests/learning_v2_chapter_blueprints_gate_v2.ts`

Expected: all PASS; `chapters=224 unknown_operations=0 future_operations=0`.

- [ ] **Step 5: Commit chapters**

```bash
git add modules/learning-v2/curriculum/en/chapter_blueprints_en_v2.ts tests/learning_v2_chapter_blueprints_gate_v2.ts
git commit -m "feat: author 224 dependency-safe chapter blueprints"
```

## Task 8: Build the lexical ledger without quotas

**Files:**
- Create: `modules/learning-v2/curriculum/en/lexical_senses_en_v2.ts`
- Create: `tests/learning_v2_lexical_registry_gate_v2.ts`

- [ ] **Step 1: Write RED tests for useful, localized, retrievable senses**

```ts
for (const sense of SENSES) {
  assert.deepEqual(Object.keys(sense.definitionByLocale).sort(), ["es", "id", "pl", "pt-BR", "ru", "tr", "uk", "vi"]);
  assert.ok(sense.audioAssetId.length > 0);
  assert.ok(sense.neededBySessionIds.length > 0);
  assert.ok(EDGES.some((edge) => edge.senseId === sense.id && edge.targetAbsoluteSessionOrdinal > sense.introductionAbsoluteSessionOrdinal));
  assert.equal(Object.values(sense.definitionByLocale).some((definition) => definition.toLowerCase().includes(sense.english.toLowerCase())), false, `${sense.id}:definition_must_not_be_circular`);
}
assert.equal(SESSIONS_WITH_MORE_THAN_TWO_NEW_SENSES.length, 0);
```

- [ ] **Step 2: Run and confirm RED**

Run: `npx tsx tests/learning_v2_lexical_registry_gate_v2.ts`

Expected: FAIL because the v2 lexical ledger is absent.

- [ ] **Step 3: Author only grammar-supporting senses**

```ts
export type LearningV2EnglishLexicalSenseV2 = Readonly<{
  id: string;
  english: string;
  partOfSpeech: string;
  definitionByLocale: Readonly<Record<"ru" | "uk" | "es" | "pt-BR" | "vi" | "id" | "tr" | "pl", string>>;
  audioAssetId: string;
  firstEncounterCard: Readonly<{
    blockingBeforeFirstInteraction: true;
    durableUnlockOnFirstDisplay: true;
    suppressBlockingOverlayOnReplay: true;
  }>;
  introductionAbsoluteSessionOrdinal: number;
  neededBySessionIds: readonly string[];
  knownTargetLanguageDependencies: readonly string[];
  sourceEvidenceRefs: readonly string[];
}>;
```

Allocate zero to two new senses only when a chapter's natural examples require them. The gate must reject a sense with no consuming session, a circular/unknown-word definition, missing locale, missing audio asset ID, incomplete first-encounter card policy or no future retrieval edge. Repetition is deliberate and does not create a duplicate sense ID.

- [ ] **Step 4: Run the lexical gate**

Run: `npx tsx tests/learning_v2_lexical_registry_gate_v2.ts`

Expected: PASS with counts for senses, retrieval edges, zero-new sessions and two-new sessions; no fixed per-lesson quota assertion.

- [ ] **Step 5: Commit the lexical ledger**

```bash
git add modules/learning-v2/curriculum/en/lexical_senses_en_v2.ts tests/learning_v2_lexical_registry_gate_v2.ts
git commit -m "feat: add grammar-grounded lexical ledger"
```

## Task 9: Materialize exact 1,792 session packets

**Files:**
- Create: `modules/learning-v2/curriculum/en/exact_session_packets_en_v2.ts`
- Create: `tests/learning_v2_exact_session_packets_gate_v2.ts`

- [ ] **Step 1: Write the full topology and session-shape gate**

```ts
assert.equal(PACKETS.length, 1792);
assert.equal(new Set(PACKETS.map((packet) => packet.sessionId)).size, 1792);
for (const packet of PACKETS) {
  assert.deepEqual(packet.introInteractions.map((item) => item.slot), [1, 2, 3]);
  assert.deepEqual(packet.practiceInteractions.map((item) => item.slot), Array.from({ length: 17 }, (_, i) => i + 4));
  assert.equal(packet.newLexicalSenseIds.length <= 2, true);
  assert.equal(new Set(packet.practiceInteractions.map((item) => item.modeFamily)).size, 6);
  assert.equal(packet.practiceInteractions.some((item, index, all) => index > 0 && item.modeFamily === all[index - 1].modeFamily), false);
}
```

- [ ] **Step 2: Run and confirm RED**

Run: `npx tsx tests/learning_v2_exact_session_packets_gate_v2.ts`

Expected: FAIL because exact v2 packets are absent.

- [ ] **Step 3: Implement the fixed eight-session chapter progression**

The builder must use these eight roles in order:

```ts
const CHAPTER_SESSION_ROLES = Object.freeze([
  "introduce_grammar",
  "introduce_or_guided_extension",
  "introduce_or_diagnostic_contrast",
  "guided_application",
  "diagnostic_repair",
  "listening_retrieval",
  "spoken_production",
  "checkpoint",
] as const);
```

For every packet, author three intro records tied to the packet operation/review set and seventeen activity records whose mode-native payloads are explicit. Checkpoint ordinals `8/16/24/32/40/48/56` add no grammar and no scored new lexicon; Session 56 uses a changed prompt and integrates the lesson system.

- [ ] **Step 4: Run exact-packet and base contract gates**

Run: `npx tsx tests/learning_v2_course_blueprint_contract_gate_v2.ts && npx tsx tests/learning_v2_exact_session_packets_gate_v2.ts`

Expected: PASS with `packets=1792 intros=5376 practices=30464 checkpoint_packets=224`.

- [ ] **Step 5: Commit exact packets**

```bash
git add modules/learning-v2/curriculum/en/exact_session_packets_en_v2.ts tests/learning_v2_exact_session_packets_gate_v2.ts
git commit -m "feat: materialize 1792 exact grammar-first packets"
```

## Task 10: Enforce mode-native activities, distractors and feedback

**Files:**
- Create: `tests/learning_v2_activity_semantics_gate_v2.ts`
- Modify: `modules/learning-v2/curriculum/validation/course_blueprint_validation_v2.ts`

- [ ] **Step 1: Write explicit RED fixtures for every forbidden failure**

Add one fixture per stable finding code:

```ts
expectFinding(withDuplicateDistractor(VALID_CHOICE), "choice_duplicate_distractor");
expectFinding(withSecondCorrect(VALID_CHOICE), "choice_correct_count_invalid");
expectFinding(withSlashBundle(VALID_CHOICE), "choice_non_atomic_option");
expectFinding(withMissingOptionFeedback(VALID_CHOICE), "choice_feedback_missing");
expectFinding(withFiveSpeedPairs(VALID_SPEED_MATCH), "speed_match_pair_count_invalid");
expectFinding(withUnknownSpeedWord(VALID_SPEED_MATCH), "speed_match_unfamiliar_target");
expectFinding(withLetterTile(VALID_BUILDER), "builder_letter_tile_forbidden");
expectFinding(withMode("sound_contrast"), "mode_family_forbidden");
expectFinding(withTargetLeak(VALID_LISTEN_CHOOSE), "listen_choose_target_text_leak");
expectFinding(withAudioPreload(false), "audio_preload_required");
expectFinding(withAudioReplay(false), "audio_replay_required");
expectFinding(withSpeechInteraction("tap_toggle"), "speech_hold_release_required");
expectFinding(withOwnerPreviewSkip(false), "speech_owner_preview_skip_required");
expectFinding(withAccessibilityEquivalent(false), "speech_accessibility_equivalent_required");
expectFinding(withBlockingMotion(true), "motion_must_not_block_interaction");
expectFinding(withInterfaceLanguageCheck(), "intro_interface_language_test_forbidden");
```

- [ ] **Step 2: Run and confirm RED**

Run: `npx tsx tests/learning_v2_activity_semantics_gate_v2.ts`

Expected: FAIL because semantic validators are not yet implemented.

- [ ] **Step 3: Implement the validators without weakening packet data**

Add pure functions:

```ts
export function validateLearningV2ChoiceActivityV2(activity: LearningV2ChoiceActivityV2): readonly LearningV2CurriculumFindingV2[];
export function validateLearningV2SpeedMatchV2(activity: LearningV2SpeedMatchActivityV2, knownSenseIds: ReadonlySet<string>): readonly LearningV2CurriculumFindingV2[];
export function validateLearningV2BuilderV2(activity: LearningV2BuilderActivityV2): readonly LearningV2CurriculumFindingV2[];
export function validateLearningV2SessionActivitySequenceV2(packet: LearningV2CurriculumSessionPacketV2): readonly LearningV2CurriculumFindingV2[];
export function validateLearningV2AudioSpeechMotionV2(activity: LearningV2PracticeInteractionV2): readonly LearningV2CurriculumFindingV2[];
```

Correct-position distribution must be deterministic and non-degenerate across each session: at least three distinct positions appear, and position `0` is not used by more than half of choice activities.

- [ ] **Step 4: Run semantic and packet gates**

Run: `npx tsx tests/learning_v2_activity_semantics_gate_v2.ts && npx tsx tests/learning_v2_exact_session_packets_gate_v2.ts`

Expected: both PASS with zero semantic findings.

- [ ] **Step 5: Commit semantic gates**

```bash
git add modules/learning-v2/curriculum/validation/course_blueprint_validation_v2.ts tests/learning_v2_activity_semantics_gate_v2.ts
git commit -m "test: enforce mode-native activity semantics"
```

## Task 11: Enforce intro-to-practice and prerequisite alignment

**Files:**
- Modify: `modules/learning-v2/curriculum/validation/course_blueprint_validation_v2.ts`
- Create: `tests/learning_v2_semantic_alignment_gate_v2.ts`

- [ ] **Step 1: Write RED semantic drift cases**

```ts
expectFinding(withIntroOperation("en.future.unexplained"), "intro_operation_outside_packet");
expectFinding(withPracticeOperation("en.future.unexplained"), "practice_operation_outside_intro_or_review");
expectFinding(withExampleMissingClaimedForm(), "canonical_example_missing_operation_form");
expectFinding(withFutureGrammarExample(), "canonical_example_future_grammar");
expectFinding(withUnusedNewSense(), "new_lexeme_absent_from_grounded_contacts");
expectFinding(withCheckpointNewGrammar(), "checkpoint_new_grammar_forbidden");
expectFinding(withCopiedIndependentPrompt(), "independent_probe_not_changed_context");
```

- [ ] **Step 2: Run and confirm RED**

Run: `npx tsx tests/learning_v2_semantic_alignment_gate_v2.ts`

Expected: FAIL with missing semantic finding codes.

- [ ] **Step 3: Implement cross-layer validation**

`validateLearningV2CourseBlueprintV2` receives scope, operations, DAG, lessons, chapters, lexicon and packets. It must build ID maps once, validate in absolute session order, and reject any operation before its first full-session introduction. Grounded lexical contacts count only meaning-bearing activity occurrences before the first scored use; card display metadata is required but does not itself count as one of the three contacts.

- [ ] **Step 4: Run alignment, DAG and exact-packet gates**

Run: `npx tsx tests/learning_v2_semantic_alignment_gate_v2.ts && npx tsx tests/learning_v2_prerequisite_dag_gate_v2.ts && npx tsx tests/learning_v2_exact_session_packets_gate_v2.ts`

Expected: all PASS; `future_grammar=0 ungrounded_lexicon=0 copied_probes=0`.

- [ ] **Step 5: Commit alignment validation**

```bash
git add modules/learning-v2/curriculum/validation/course_blueprint_validation_v2.ts tests/learning_v2_semantic_alignment_gate_v2.ts
git commit -m "test: block curriculum semantic drift"
```

## Task 12: Build coverage matrices and canonical fingerprint

**Files:**
- Create: `modules/learning-v2/curriculum/en/coverage_matrices_en_v2.ts`
- Create: `modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts`
- Create: `modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2.ts`
- Create: `tests/learning_v2_coverage_matrices_gate_v2.ts`
- Create: `tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts`

- [ ] **Step 1: Write RED coverage and fingerprint assertions**

```ts
for (const row of GRAMMAR_MATRIX) {
  assert.ok(row.introductionSessionId);
  assert.ok(row.guidedPracticeSessionIds.length > 0);
  assert.ok(row.productionSessionIds.length > 0);
  assert.ok(row.independentEvidenceSessionIds.length > 0);
}
for (const row of LEXICAL_MATRIX) {
  assert.ok(row.introductionSessionId);
  assert.ok(row.groundedContactActivityIds.length >= 3);
  assert.ok(row.futureRetrievalSessionIds.length > 0);
}
assert.equal(BLUEPRINT.lessonCount, 32);
assert.equal(BLUEPRINT.chapterCount, 224);
assert.equal(BLUEPRINT.sessionPacketCount, 1792);
assert.equal(BLUEPRINT.ownerApproval, "PENDING");
```

- [ ] **Step 2: Run and confirm RED**

Run: `npx tsx tests/learning_v2_coverage_matrices_gate_v2.ts && npx tsx tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts`

Expected: FAIL because matrices and canonical v2 body do not exist.

- [ ] **Step 3: Build matrices and hash only canonical body**

```ts
const body = Object.freeze({
  schemaVersion: "learning-v2-english-course-blueprint.v2" as const,
  targetLanguage: "en" as const,
  scope: LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2,
  grammarOperations: OPERATIONS,
  grammarPrerequisiteDag: DAG,
  lessons: LESSONS,
  chapters: CHAPTERS,
  lexicalSenses: SENSES,
  lexicalRetrievalEdges: EDGES,
  sessionPackets: PACKETS,
  coverageMatrices: MATRICES,
});

export const LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 = Object.freeze({
  ...body,
  blueprintFingerprint: hashCanonicalBody(body),
  ownerApproval: "PENDING" as const,
});

export const LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2 = Object.freeze({
  schemaVersion: LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.schemaVersion,
  fingerprint: LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.blueprintFingerprint,
  ownerApproval: LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.ownerApproval,
  lessonCount: 32,
  chapterCount: 224,
  sessionPacketCount: 1792,
  introInteractionCount: 5376,
  practiceInteractionCount: 30464,
});
```

The integrity test computes the hash independently and verifies that any one-field mutation changes it and leaves approval unauthorized.

- [ ] **Step 4: Run coverage and integrity gates**

Run: `npx tsx tests/learning_v2_coverage_matrices_gate_v2.ts && npx tsx tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts`

Expected: PASS with a non-empty 64-character fingerprint and `owner=PENDING`.

- [ ] **Step 5: Commit matrices and canonical body**

```bash
git add modules/learning-v2/curriculum/en/coverage_matrices_en_v2.ts modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2.ts tests/learning_v2_coverage_matrices_gate_v2.ts tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts
git commit -m "feat: assemble canonical full B1 blueprint v2"
```

## Task 13: Add the narrow aggregate gate

**Files:**
- Create: `scripts/learning_v2_curriculum_blueprint_gate_v2.ts`
- Modify: `package.json:9-11`

- [ ] **Step 1: Write the aggregate command in package.json**

```json
"learning-v2:curriculum-blueprint-v2-gate": "npx tsx tests/learning_v2_course_blueprint_contract_gate_v2.ts && npx tsx tests/learning_v2_full_b1_scope_gate_v2.ts && npx tsx tests/learning_v2_grammar_registry_gate_v2.ts && npx tsx tests/learning_v2_prerequisite_dag_gate_v2.ts && npx tsx tests/learning_v2_lesson_blueprints_gate_v2.ts && npx tsx tests/learning_v2_chapter_blueprints_gate_v2.ts && npx tsx tests/learning_v2_lexical_registry_gate_v2.ts && npx tsx tests/learning_v2_exact_session_packets_gate_v2.ts && npx tsx tests/learning_v2_activity_semantics_gate_v2.ts && npx tsx tests/learning_v2_semantic_alignment_gate_v2.ts && npx tsx tests/learning_v2_coverage_matrices_gate_v2.ts && npx tsx tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts && npx tsx scripts/learning_v2_curriculum_blueprint_gate_v2.ts"
```

- [ ] **Step 2: Run the command and confirm it fails until the summary script exists**

Run: `npm run learning-v2:curriculum-blueprint-v2-gate`

Expected: all preceding gates PASS, final command FAIL with missing `learning_v2_curriculum_blueprint_gate_v2.ts`.

- [ ] **Step 3: Implement a compact summary script**

Print exactly:

```text
LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: PASS
lessons=32 chapters=224 packets=1792
intro_interactions=5376 practice_interactions=30464
scope_findings=0 dag_findings=0 semantic_findings=0
owner_approval=PENDING fingerprint=<64 lowercase hex chars>
```

Set exit code `1` if any count or finding differs.

- [ ] **Step 4: Run the aggregate gate once, without full-project Jest or tsc**

Run: `npm run learning-v2:curriculum-blueprint-v2-gate`

Expected: PASS with the exact five-line summary above.

- [ ] **Step 5: Commit the aggregate gate**

```bash
git add package.json scripts/learning_v2_curriculum_blueprint_gate_v2.ts
git commit -m "test: add full B1 blueprint aggregate gate"
```

## Task 14: Rebuild the clickable owner map from v2 authority

**Files:**
- Create: `scripts/build_learning_v2_curriculum_owner_map_v2.ts`
- Modify: `scripts/build_learning_v2_curriculum_owner_map.mjs`
- Modify: `tests/learning_v2_curriculum_owner_map_gate.mjs`

- [ ] **Step 1: Change the owner-map gate to the new visible contract**

Required markers:

```js
const markers = [
  'data-curriculum-lessons="32"',
  'data-curriculum-chapters="224"',
  'data-curriculum-exact-packets="1792"',
  'data-owner-approval="PENDING"',
  "FULL B1 GRAMMAR-FIRST · OWNER REVIEW REQUIRED",
  "Present be affirmative",
  "Probability and deduction",
  "SUPERSEDED BY OWNER DECISION — FULL B1 GRAMMAR-FIRST REBUILD",
];
```

Also assert the HTML contains the current v2 fingerprint and does not display the old fingerprint as approved.

- [ ] **Step 2: Run the map gate and confirm RED**

Run: `node tests/learning_v2_curriculum_owner_map_gate.mjs`

Expected: FAIL because the existing map still serializes v1.

- [ ] **Step 3: Serialize v2 and render drill-down at all layers**

The map must show:

```text
course → 32 lesson cards → 7 chapter cards → 8 session packets
session packet → 3 intro rows + 17 practice rows
practice row → mode family, target operation IDs, lexical IDs, support, feedback payload
```

The header displays `PENDING`, the full fingerprint, counts and zero/non-zero finding totals. A session modal must never contain generic prose such as “exact role not yet authored”.

- [ ] **Step 4: Build and gate the owner map**

Run: `npx tsx scripts/build_learning_v2_curriculum_owner_map_v2.ts && node tests/learning_v2_curriculum_owner_map_gate.mjs`

Expected: PASS and updated `.codex-tmp/learning-v2-curriculum-owner-map/index.html`.

- [ ] **Step 5: Commit builder and gate, not generated temp HTML**

```bash
git add scripts/build_learning_v2_curriculum_owner_map_v2.ts scripts/build_learning_v2_curriculum_owner_map.mjs tests/learning_v2_curriculum_owner_map_gate.mjs
git commit -m "feat: render full B1 curriculum owner map"
```

## Task 15: Update the mandatory route and owner-review receipt

**Files:**
- Modify: `docs/v2/СТАРТ В2.md`
- Modify: `docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md`
- Create: `docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md`
- Modify: `docs/v2/HANDOVER.md`

- [ ] **Step 1: Add a docs-parity assertion to the artifact-integrity gate**

The test reads all four Markdown files and requires the current v2 fingerprint, `PENDING`, `32`, `224`, `1792`, the design spec path and the aggregate gate command. It also requires the old fingerprint to be adjacent to `SUPERSEDED`, never `APPROVED`.

- [ ] **Step 2: Run the integrity gate and confirm RED**

Run: `npx tsx tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts`

Expected: FAIL with `docs_blueprint_fingerprint_missing` or `docs_old_approval_not_superseded`.

- [ ] **Step 3: Update the route documents and review receipt**

Record this exact mandatory sequence:

```text
read СТАРТ В2
→ read approved design spec
→ read current v2 owner-review receipt
→ run learning-v2:curriculum-blueprint-v2-gate
→ confirm ON TRACK
→ inspect the exact packet being authored
→ after every completed session, rebuild owner review and run drift-check
```

The receipt states that blueprint construction is complete, learner authoring remains blocked, Sessions 1–3 remain preserved, Session 4+ remains blocked, and the only legal next owner action is inspect/approve/reject the displayed fingerprint.

- [ ] **Step 4: Run aggregate gate and docs parity**

Run: `npm run learning-v2:curriculum-blueprint-v2-gate`

Expected: PASS, `owner_approval=PENDING`, and the same fingerprint in code, docs and owner map input.

- [ ] **Step 5: Commit documentation**

```bash
git add docs/v2/СТАРТ\ В2.md docs/v2/curriculum/START_CURRICULUM_BLUEPRINT.ru.md docs/v2/curriculum/en/FULL_B1_BLUEPRINT_OWNER_REVIEW_2026-08-30.md docs/v2/HANDOVER.md tests/learning_v2_blueprint_artifact_integrity_gate_v2.ts
git commit -m "docs: route Learning V2 authoring through full B1 blueprint"
```

## Task 16: Final bounded verification and owner handoff

**Files:**
- Verify only; no source changes unless a focused gate exposes a defect.

- [ ] **Step 1: Confirm the dirty-worktree boundary**

Run: `git status --short`

Expected: unrelated user/other-agent changes remain present and untouched; only plan-owned paths appear in this work's commits.

- [ ] **Step 2: Run the single aggregate blueprint gate**

Run: `npm run learning-v2:curriculum-blueprint-v2-gate`

Expected: PASS with `32 / 224 / 1792`, zero findings and `PENDING`.

- [ ] **Step 3: Rebuild and verify the owner map**

Run: `npx tsx scripts/build_learning_v2_curriculum_owner_map_v2.ts && node tests/learning_v2_curriculum_owner_map_gate.mjs`

Expected: PASS; the map opens locally and every lesson, chapter and session is clickable.

- [ ] **Step 4: Verify no learner-facing content changed**

Run: `git diff --name-only 862630313..HEAD | rg "episode_01_session_|modules/learning-v2/content/(?!course_topology)"`

Expected: no output. If the local `rg` build does not support lookahead, use `git diff --name-only 862630313..HEAD | rg "episode_01_session_"` and inspect the short result manually.

- [ ] **Step 5: Present the owner decision packet**

Report only:

```text
fingerprint=<new v2 fingerprint>
status=PENDING
counts=32 lessons / 224 chapters / 1,792 sessions
findings=0
owner_map=<absolute path to .codex-tmp/learning-v2-curriculum-owner-map/index.html>
next=owner approves or rejects this fingerprint; no learner authoring proceeds automatically
```

Do not edit approval status in this task. After explicit approval, write the separate Sessions 1–3 reconciliation plan.

---

## Implementation discipline

- Use one writer only. Do not create a branch, worktree or delegated coding task without a new explicit owner request.
- Read `docs/v2/СТАРТ В2.md` and its route before each execution batch; perform the prescribed drift-check after every completed session-equivalent artifact or ten minutes, whichever comes first.
- Run only focused `tsx`/Node gates in this plan. Do not run full Jest, full `tsc`, Metro, Android build or asset scan.
- Never weaken a failing gate. Fix the canonical data or validator that caused the finding.
- Commit only the exact paths listed in each task; preserve the shared dirty worktree.
- Keep generated owner-map HTML in `.codex-tmp/`; commit its builder and deterministic gate, not the generated artifact.

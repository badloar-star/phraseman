# Learning V2 Curriculum Contracts and DAG Implementation Plan

> **For agentic workers:** execute inline in the current shared checkout. Do not
> create a branch, worktree, delegated coding task or commit without an explicit
> owner request. Use test-driven development and the mandatory Learning V2
> recenter after every completed curriculum session packet.

**Goal:** create the typed authority and deterministic validation needed before
the 32 × 56 English curriculum can be authored as exact session packets.

**Architecture:** immutable TypeScript contracts represent grammar operations,
lexical plans, phrase frames, canonical examples and prerequisite edges.
Validation is pure and returns explicit findings; a narrow executable gate is
the only machine admission point. The contracts do not generate pedagogical
content.

**Tech Stack:** TypeScript, `tsx` executable gates, existing
`hashCanonicalBody`, Node.js owner-map builder.

**Canonical spec:**
`docs/v2/LEARNING_V2_COURSE_BLUEPRINT_32X56_DESIGN.ru.md`

---

## File structure

- `modules/learning-v2/curriculum/contracts/course_blueprint_v1.ts` — immutable
  public types and stable IDs only.
- `modules/learning-v2/curriculum/validation/course_blueprint_validation_v1.ts`
  — pure structural/content-boundary validation and findings.
- `modules/learning-v2/curriculum/en/grammar_operations_en_v1.ts` — human-
  authored English grammar operation registry.
- `modules/learning-v2/curriculum/en/prerequisite_dag_en_v1.ts` — explicit
  English prerequisite edges and cycle/future-reference validation input.
- `tests/learning_v2_course_blueprint_contract_gate.ts` — RED/GREEN contract
  and phrase-planning tests.
- `tests/learning_v2_grammar_prerequisite_dag_gate.ts` — RED/GREEN DAG tests.
- `scripts/learning_v2_curriculum_blueprint_gate.ts` — narrow command combining
  only curriculum findings.
- `package.json` — one narrow `learning-v2:curriculum-blueprint-gate` script.

---

### Task 1: Define the immutable packet contract

**Files:**

- Create: `tests/learning_v2_course_blueprint_contract_gate.ts`
- Create: `modules/learning-v2/curriculum/contracts/course_blueprint_v1.ts`

- [ ] **Step 1: write the failing import and packet fixture**

The test imports `assertLearningV2CurriculumSessionPacketV1` and constructs one
valid packet with:

```ts
const VALID_PACKET = Object.freeze({
  sessionId: "lesson-01:session:01",
  lessonOrdinal: 1,
  chapterOrdinal: 1,
  sessionOrdinal: 1,
  role: "introduce_grammar",
  primaryCanDoStep: "Сказать, что я нахожусь здесь.",
  grammarOperationId: "en.copula.i_am.affirmative",
  reviewConstructIds: Object.freeze([]),
  learningDelta: Object.freeze(["support_fade"]),
  prerequisiteObjectiveIds: Object.freeze([]),
  newLexicalSenseIds: Object.freeze(["en.here.place.1"]),
  retrievalLexicalSenseIds: Object.freeze([]),
  lexicalPlanRole: "introduce_and_retrieve",
  lexicalReviewOnlyReason: null,
  phraseFrameIds: Object.freeze(["en.frame.i_am_complement"]),
  canonicalEnglishExamples: Object.freeze(["I am here.", "I'm here."]),
  allowedLexicalSlotSenseIds: Object.freeze(["en.here.place.1"]),
  forbiddenSurfaceFormIds: Object.freeze(["en.form.he_is"]),
  prohibitedConstructIds: Object.freeze(["en.copula.third_person"]),
  sessionKind: "words_then_phrases",
  learningFunctions: Object.freeze(["notice", "retrieve", "produce"]),
  requiredModeFamilies: Object.freeze(["listen_choose", "phrase_builder"]),
  supportStart: "maximum",
  supportEnd: "low",
  independentProbeId: "en.l01.s01.independent.i_am_here",
  delayedProbeIds: Object.freeze(["en.l01.s05.delayed.i_am_here"]),
  reviewSourceSessionIds: Object.freeze([]),
  sourceEvidenceRefs: Object.freeze(["OC-AUTHORING-01"]),
});
```

The test must expect PASS for this fixture and HOLD for each single mutation:
both grammar/review empty, both grammar/review populated, zero/one/five examples,
empty phrase frames, `retrieval_only` without reason/senses, new sense absent
from allowed slots, or duplicate canonical examples.

- [ ] **Step 2: run RED**

Run:

```powershell
npx tsx tests/learning_v2_course_blueprint_contract_gate.ts
```

Expected: failure because the contract module does not exist.

- [ ] **Step 3: implement types and assertion**

Export these exact types:

```ts
export type LearningV2CurriculumLearningDeltaV1 =
  | "support_fade"
  | "delayed_retrieval"
  | "changed_context"
  | "contrast_discrimination"
  | "productive_shift"
  | "targeted_error_repair"
  | "transfer";

export type LearningV2CurriculumLexicalPlanRoleV1 =
  | "introduce_and_retrieve"
  | "retrieval_only";

export type LearningV2CurriculumSessionPacketV1 = Readonly<{
  sessionId: string;
  lessonOrdinal: number;
  chapterOrdinal: number;
  sessionOrdinal: number;
  role: "introduce_grammar" | "extend_grammar" | "guided_application" |
    "retrieval" | "variation" | "near_transfer_repair" | "voice" |
    "checkpoint" | "final_exam";
  primaryCanDoStep: string;
  grammarOperationId: string | null;
  reviewConstructIds: readonly string[];
  learningDelta: readonly LearningV2CurriculumLearningDeltaV1[];
  prerequisiteObjectiveIds: readonly string[];
  newLexicalSenseIds: readonly string[];
  retrievalLexicalSenseIds: readonly string[];
  lexicalPlanRole: LearningV2CurriculumLexicalPlanRoleV1;
  lexicalReviewOnlyReason: string | null;
  phraseFrameIds: readonly string[];
  canonicalEnglishExamples: readonly [string, string, ...string[]];
  allowedLexicalSlotSenseIds: readonly string[];
  forbiddenSurfaceFormIds: readonly string[];
  prohibitedConstructIds: readonly string[];
  sessionKind: string;
  learningFunctions: readonly string[];
  requiredModeFamilies: readonly string[];
  supportStart: "maximum" | "high" | "medium" | "low" | "minimal";
  supportEnd: "high" | "medium" | "low" | "minimal" | "none";
  independentProbeId: string;
  delayedProbeIds: readonly string[];
  reviewSourceSessionIds: readonly string[];
  sourceEvidenceRefs: readonly string[];
}>;
```

`assertLearningV2CurriculumSessionPacketV1` throws one stable error code per
failed rule and never fills missing values.

- [ ] **Step 4: run GREEN**

Run the same command. Expected:

```text
LEARNING V2 COURSE BLUEPRINT CONTRACT GATE: PASS
```

---

### Task 2: Add pure blueprint findings

**Files:**

- Modify: `tests/learning_v2_course_blueprint_contract_gate.ts`
- Create: `modules/learning-v2/curriculum/validation/course_blueprint_validation_v1.ts`

- [ ] **Step 1: add RED cases**

Build a programmatic 32 × 56 structural fixture from `VALID_PACKET`, changing
only stable IDs/ordinals. Assert findings for wrong counts, duplicate session
IDs, checkpoint at a wrong ordinal, stale/future review source, phrase examples
containing a forbidden surface form and missing source evidence.

- [ ] **Step 2: run RED**

Expected: missing validator import.

- [ ] **Step 3: implement pure validator**

Export:

```ts
export type LearningV2CurriculumFindingV1 = Readonly<{
  severity: "blocker" | "error" | "warning";
  code: string;
  lessonOrdinal: number | null;
  sessionOrdinal: number | null;
  message: string;
}>;

export function validateLearningV2CourseBlueprintV1(input: Readonly<{
  lessons: readonly Readonly<{
    lessonOrdinal: number;
    sessions: readonly LearningV2CurriculumSessionPacketV1[];
  }>[];
  forbiddenSurfaceFormsById: Readonly<Record<string, readonly string[]>>;
}>): readonly LearningV2CurriculumFindingV1[];
```

Validation must return findings rather than mutate packets or infer missing
content. `forbiddenSurfaceFormsById` is the deterministic ID-to-literal lookup
needed to inspect examples; the validator must report an unknown referenced ID
rather than compare an opaque ID directly with prose. Exact topology constants
come from `course_topology_v1.ts`.

- [ ] **Step 4: run GREEN**

Expected contract gate PASS with all negative fixtures detected.

---

### Task 3: Define English grammar operations

**Files:**

- Create: `tests/learning_v2_grammar_prerequisite_dag_gate.ts`
- Create: `modules/learning-v2/curriculum/en/grammar_operations_en_v1.ts`

- [ ] **Step 1: write RED registry checks**

The test requires every operation to have a unique stable ID, one lesson owner,
one communicative function, a form boundary, prerequisites, prohibited
extensions and evidence refs. It also asserts lesson 1 contains only affirmative
`I am / I'm` and `you are / you're` operations and excludes questions,
negation, third person, demonstratives and articles.

- [ ] **Step 2: run RED**

Expected: missing English registry module.

- [ ] **Step 3: implement the registry contract and first complete lesson slice**

Export:

```ts
export type LearningV2EnglishGrammarOperationV1 = Readonly<{
  id: string;
  lessonOrdinal: number;
  communicativeFunction: string;
  formBoundary: readonly string[];
  prerequisiteOperationIds: readonly string[];
  prohibitedExtensionIds: readonly string[];
  sourceEvidenceRefs: readonly string[];
}>;

export const LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1:
  readonly LearningV2EnglishGrammarOperationV1[];
```

The first GREEN slice contains the full owner-approved Lesson 1 boundary; later
lessons are added only through subsequent recentered curriculum packets.

- [ ] **Step 4: run GREEN**

Expected:

```text
LEARNING V2 GRAMMAR PREREQUISITE DAG GATE: PASS
```

---

### Task 4: Validate the prerequisite DAG

**Files:**

- Modify: `tests/learning_v2_grammar_prerequisite_dag_gate.ts`
- Create: `modules/learning-v2/curriculum/en/prerequisite_dag_en_v1.ts`

- [ ] **Step 1: add RED fixtures**

Edges are directed `prerequisiteOperationId → dependentOperationId`. Assert
rejection of self-edge, duplicate edge, missing endpoint, cycle and any edge
where the prerequisite is first owned by a later lesson than its dependent.

- [ ] **Step 2: run RED**

Expected: validator import failure.

- [ ] **Step 3: implement deterministic graph validation**

Use a color-marked DFS (`unvisited`, `visiting`, `visited`) and return explicit
findings. Never delete an edge to make the graph pass.

- [ ] **Step 4: run GREEN**

Expected DAG gate PASS and all negative fixtures detected.

---

### Task 5: Add the narrow executable gate

**Files:**

- Create: `scripts/learning_v2_curriculum_blueprint_gate.ts`
- Modify: `package.json`

- [ ] **Step 1: add the script entry**

```json
"learning-v2:curriculum-blueprint-gate": "npx tsx tests/learning_v2_course_blueprint_contract_gate.ts && npx tsx tests/learning_v2_grammar_prerequisite_dag_gate.ts && npx tsx scripts/learning_v2_curriculum_blueprint_gate.ts"
```

- [ ] **Step 2: implement the gate summary**

It prints only decisive counts and exits non-zero for any blocker/error:

```text
LEARNING V2 CURRICULUM BLUEPRINT GATE: PASS
lessons=32 chapters=224 session_slots=1792
exact_packets=<count> hold_packets=<count>
grammar_operations=<count> dag_edges=<count>
```

- [ ] **Step 3: run the narrow command**

Expected initial result may remain `HOLD` because 1,792 exact packets are not
yet authored; contract and DAG test commands must independently PASS. Do not
weaken the course-count gate to claim completion.

---

### Task 6: Recenter and prepare Lesson 1 packet planning

**Files:**

- Update generated owner map:
  `.codex-tmp/learning-v2-curriculum-owner-map/index.html`
- Record receipt in:
  `docs/v2/curriculum/en/LESSON_01_PACKET_PLANNING_RECEIPT.md`

- [ ] **Step 1: run the full mandatory recenter**

Use `docs/v2/curriculum/AFTER_EVERY_SESSION_RECENTER.ru.md`; record exact
document/fingerprint status.

- [ ] **Step 2: expose registry/DAG status in the owner map**

The map displays operation count, DAG findings and exact packet HOLD reasons. It
must not display invented session content.

- [ ] **Step 3: verify freshness**

Rebuild the map and parse its client script. Expected: 32 lessons, 224 chapters,
1,792 slots and the current source timestamp/fingerprint.

---

## Completion boundary for this plan

This plan is complete when the contracts, validator, initial English registry,
DAG validation and narrow gate exist with fresh evidence. It does **not** claim
that the 224 chapters or 1,792 packets are authored. The next plan expands the
owner-approved grammar registry across all 32 lessons, then writes exact packets
one at a time with mandatory recenter receipts.

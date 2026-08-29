import assert from "node:assert/strict";

import {
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1,
} from "../modules/learning-v2/curriculum/en/grammar_operations_en_v1";
import {
  LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_EDGES_V1,
  validateLearningV2EnglishGrammarPrerequisiteDagV1,
  type LearningV2EnglishGrammarPrerequisiteDagInputV1,
} from "../modules/learning-v2/curriculum/en/prerequisite_dag_en_v1";

const ids = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1.map(
  (operation) => operation.id,
);

assert.equal(
  new Set(ids).size,
  ids.length,
  "grammar_operation_id_duplicate",
);

for (const operation of LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1) {
  assert.match(operation.id, /^en\.[a-z0-9_.]+$/);
  assert.ok(
    Number.isSafeInteger(operation.lessonOrdinal) &&
      operation.lessonOrdinal >= 1 &&
      operation.lessonOrdinal <= 32,
    `${operation.id}:lesson_owner_invalid`,
  );
  assert.ok(
    operation.communicativeFunction.trim().length > 0,
    `${operation.id}:communicative_function_missing`,
  );
  assert.ok(
    operation.formBoundary.length > 0 &&
      operation.formBoundary.every((form) => form.trim().length > 0),
    `${operation.id}:form_boundary_missing`,
  );
  assert.ok(
    Array.isArray(operation.prerequisiteOperationIds),
    `${operation.id}:prerequisites_missing`,
  );
  assert.ok(
    operation.prohibitedExtensionIds.length > 0,
    `${operation.id}:prohibited_extensions_missing`,
  );
  assert.ok(
    operation.sourceEvidenceRefs.length > 0,
    `${operation.id}:source_evidence_missing`,
  );
}

const lesson1 = LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1.filter(
  (operation) => operation.lessonOrdinal === 1,
);

const REQUIRED_COURSE_OPERATION_IDS = Object.freeze([
  "en.copula.i_am.affirmative",
  "en.demonstrative.this_is.singular",
  "en.possessive.determiners.my_your",
  "en.present_simple.i_you.affirmative",
  "en.present_simple.third_person_s.affirmative",
  "en.present_simple.do_does.questions",
  "en.modal.can.ability",
  "en.existential.there_is.affirmative",
  "en.quantifier.how_much.question",
  "en.present_continuous.affirmative",
  "en.past_copula.was_were.affirmative",
  "en.past_simple.affirmative_regular",
  "en.modal.should.advice",
  "en.future.be_going_to.intention",
  "en.direction.from_to",
  "en.request.id_like",
  "en.quantifier.a_little",
  "en.comparison.comparative_er",
  "en.present_perfect.experience",
  "en.modal.must.obligation",
  "en.pronoun.object",
  "en.present_contrast.simple_vs_continuous",
  "en.past_continuous.affirmative",
  "en.degree.too_adjective",
  "en.conditional.zero",
  "en.relative.who.subject",
  "en.reporting.say.complement",
] as const);

for (const requiredId of REQUIRED_COURSE_OPERATION_IDS) {
  assert.ok(ids.includes(requiredId), `course_operation_missing:${requiredId}`);
}

assert.ok(
  LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1.length >= 100,
  "english_grammar_registry_is_still_a_lesson_01_slice",
);

assert.deepEqual(
  lesson1.map((operation) => operation.id),
  [
    "en.copula.i_am.affirmative",
    "en.copula.i_am.contraction",
    "en.copula.you_are.affirmative",
    "en.copula.you_are.contraction",
  ],
  "lesson_01_exact_grammar_boundary",
);

const lesson1Surface = lesson1
  .flatMap((operation) => [
    operation.id,
    ...operation.formBoundary,
  ])
  .join(" ")
  .toLowerCase();

for (const forbidden of [
  "question",
  "negation",
  "he ",
  "she ",
  "it ",
  "we ",
  "they ",
  "this",
  "that",
  "article",
]) {
  assert.equal(
    lesson1Surface.includes(forbidden),
    false,
    `lesson_01_future_construct_leak:${forbidden}`,
  );
}

const VALID_DAG: LearningV2EnglishGrammarPrerequisiteDagInputV1 =
  Object.freeze({
    operations: LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1,
    edges: LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_EDGES_V1,
  });

function expectDagFinding(
  input: LearningV2EnglishGrammarPrerequisiteDagInputV1,
  expectedCode: string,
): void {
  const findings = validateLearningV2EnglishGrammarPrerequisiteDagV1(input);
  assert.ok(
    findings.some((finding) => finding.code === expectedCode),
    `${expectedCode}\nactual=${findings.map((finding) => finding.code).join(",")}`,
  );
}

assert.deepEqual(
  validateLearningV2EnglishGrammarPrerequisiteDagV1(VALID_DAG),
  [],
);

expectDagFinding(
  Object.freeze({
    ...VALID_DAG,
    edges: Object.freeze([
      ...VALID_DAG.edges,
      Object.freeze({
        prerequisiteOperationId: "en.copula.i_am.affirmative",
        dependentOperationId: "en.copula.i_am.affirmative",
      }),
    ]),
  }),
  "dag_self_edge",
);

expectDagFinding(
  Object.freeze({
    ...VALID_DAG,
    edges: Object.freeze([...VALID_DAG.edges, VALID_DAG.edges[0]]),
  }),
  "dag_duplicate_edge",
);

expectDagFinding(
  Object.freeze({
    ...VALID_DAG,
    edges: Object.freeze([
      ...VALID_DAG.edges,
      Object.freeze({
        prerequisiteOperationId: "en.copula.i_am.affirmative",
        dependentOperationId: "en.operation.missing",
      }),
    ]),
  }),
  "dag_edge_operation_missing",
);

expectDagFinding(
  Object.freeze({
    ...VALID_DAG,
    edges: Object.freeze([
      ...VALID_DAG.edges,
      Object.freeze({
        prerequisiteOperationId: "en.copula.i_am.contraction",
        dependentOperationId: "en.copula.i_am.affirmative",
      }),
    ]),
  }),
  "dag_cycle",
);

const LATER_OPERATION = Object.freeze({
  id: "en.synthetic.later_operation",
  lessonOrdinal: 2,
  communicativeFunction: "Synthetic future prerequisite test fixture.",
  formBoundary: Object.freeze(["synthetic form"]),
  prerequisiteOperationIds: Object.freeze([]),
  prohibitedExtensionIds: Object.freeze(["en.synthetic.out_of_scope"]),
  sourceEvidenceRefs: Object.freeze(["OC-AUTHORING-01"]),
});

expectDagFinding(
  Object.freeze({
    operations: Object.freeze([
      ...VALID_DAG.operations,
      LATER_OPERATION,
    ]),
    edges: Object.freeze([
      ...VALID_DAG.edges,
      Object.freeze({
        prerequisiteOperationId: LATER_OPERATION.id,
        dependentOperationId: "en.copula.i_am.affirmative",
      }),
    ]),
  }),
  "dag_future_prerequisite",
);

process.stdout.write("LEARNING V2 GRAMMAR PREREQUISITE DAG GATE: PASS\n");

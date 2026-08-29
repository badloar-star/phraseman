import assert from "node:assert/strict";

import {
  assertLearningV2CurriculumSessionPacketV1,
  type LearningV2CurriculumSessionPacketV1,
} from "../modules/learning-v2/curriculum/contracts/course_blueprint_v1";
import {
  validateLearningV2CourseBlueprintV1,
  type LearningV2CourseBlueprintValidationInputV1,
} from "../modules/learning-v2/curriculum/validation/course_blueprint_validation_v1";
import {
  LEARNING_V2_COURSE_LESSON_COUNT_V1,
  LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1,
  LEARNING_V2_LESSON_SESSION_COUNT_V1,
  learningV2CourseSessionIdV1,
} from "../modules/learning-v2/content/course_topology_v1";

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

function expectCode(input: unknown, expectedCode: string): void {
  assert.throws(
    () => assertLearningV2CurriculumSessionPacketV1(input),
    (error: unknown) =>
      error instanceof Error && error.message === expectedCode,
    expectedCode,
  );
}

assert.doesNotThrow(() =>
  assertLearningV2CurriculumSessionPacketV1(VALID_PACKET),
);

expectCode(
  {
    ...VALID_PACKET,
    grammarOperationId: null,
    reviewConstructIds: Object.freeze([]),
  },
  "learning_v2_curriculum_packet_grammar_or_review_required",
);

expectCode(
  {
    ...VALID_PACKET,
    reviewConstructIds: Object.freeze(["en.copula.i_am.affirmative"]),
  },
  "learning_v2_curriculum_packet_grammar_and_review_conflict",
);

for (const examples of [
  Object.freeze([]),
  Object.freeze(["I am here."]),
  Object.freeze(["I am here.", "I'm here.", "I am right here.", "I'm right here.", "Here I am."]),
]) {
  expectCode(
    { ...VALID_PACKET, canonicalEnglishExamples: examples },
    "learning_v2_curriculum_packet_canonical_examples_count",
  );
}

expectCode(
  { ...VALID_PACKET, phraseFrameIds: Object.freeze([]) },
  "learning_v2_curriculum_packet_phrase_frames_required",
);

expectCode(
  {
    ...VALID_PACKET,
    grammarOperationId: null,
    reviewConstructIds: Object.freeze(["en.copula.i_am.affirmative"]),
    newLexicalSenseIds: Object.freeze([]),
    retrievalLexicalSenseIds: Object.freeze(["en.here.place.1"]),
    lexicalPlanRole: "retrieval_only",
    lexicalReviewOnlyReason: null,
  },
  "learning_v2_curriculum_packet_retrieval_only_reason_required",
);

expectCode(
  {
    ...VALID_PACKET,
    grammarOperationId: null,
    reviewConstructIds: Object.freeze(["en.copula.i_am.affirmative"]),
    newLexicalSenseIds: Object.freeze([]),
    retrievalLexicalSenseIds: Object.freeze([]),
    lexicalPlanRole: "retrieval_only",
    lexicalReviewOnlyReason: "Отложенное извлечение ранее введённого материала.",
  },
  "learning_v2_curriculum_packet_retrieval_only_senses_required",
);

expectCode(
  { ...VALID_PACKET, allowedLexicalSlotSenseIds: Object.freeze([]) },
  "learning_v2_curriculum_packet_new_sense_outside_allowed_slots",
);

expectCode(
  {
    ...VALID_PACKET,
    canonicalEnglishExamples: Object.freeze(["I am here.", "I am here."]),
  },
  "learning_v2_curriculum_packet_canonical_examples_duplicate",
);

function buildValidPacket(
  lessonOrdinal: number,
  sessionOrdinal: number,
): LearningV2CurriculumSessionPacketV1 {
  const isCheckpoint =
    LEARNING_V2_LESSON_CHECKPOINT_SESSION_ORDINALS_V1.includes(
      sessionOrdinal as never,
    );
  const packet: unknown = Object.freeze({
    ...VALID_PACKET,
    sessionId: learningV2CourseSessionIdV1(lessonOrdinal, sessionOrdinal),
    lessonOrdinal,
    chapterOrdinal: Math.ceil(sessionOrdinal / 8),
    sessionOrdinal,
    role:
      sessionOrdinal === LEARNING_V2_LESSON_SESSION_COUNT_V1
        ? "final_exam"
        : isCheckpoint
          ? "checkpoint"
          : "guided_application",
    grammarOperationId: `en.synthetic.l${lessonOrdinal}.s${sessionOrdinal}`,
    newLexicalSenseIds: Object.freeze([
      `en.synthetic.lexeme.l${lessonOrdinal}.s${sessionOrdinal}`,
    ]),
    allowedLexicalSlotSenseIds: Object.freeze([
      `en.synthetic.lexeme.l${lessonOrdinal}.s${sessionOrdinal}`,
    ]),
    independentProbeId: `en.synthetic.probe.l${lessonOrdinal}.s${sessionOrdinal}`,
  });
  assertLearningV2CurriculumSessionPacketV1(packet);
  return packet;
}

const VALID_COURSE: LearningV2CourseBlueprintValidationInputV1 = Object.freeze({
  lessons: Object.freeze(
    Array.from(
      { length: LEARNING_V2_COURSE_LESSON_COUNT_V1 },
      (_, lessonIndex) => {
        const lessonOrdinal = lessonIndex + 1;
        return Object.freeze({
          lessonOrdinal,
          sessions: Object.freeze(
            Array.from(
              { length: LEARNING_V2_LESSON_SESSION_COUNT_V1 },
              (_, sessionIndex) =>
                buildValidPacket(lessonOrdinal, sessionIndex + 1),
            ),
          ),
        });
      },
    ),
  ),
  forbiddenSurfaceFormsById: Object.freeze({
    "en.form.he_is": Object.freeze(["he is", "he's"]),
  }),
});

function replaceSession(
  input: LearningV2CourseBlueprintValidationInputV1,
  lessonOrdinal: number,
  sessionOrdinal: number,
  patch: Partial<LearningV2CurriculumSessionPacketV1>,
): LearningV2CourseBlueprintValidationInputV1 {
  return Object.freeze({
    ...input,
    lessons: Object.freeze(
      input.lessons.map((lesson) =>
        lesson.lessonOrdinal !== lessonOrdinal
          ? lesson
          : Object.freeze({
              ...lesson,
              sessions: Object.freeze(
                lesson.sessions.map((session) =>
                  session.sessionOrdinal !== sessionOrdinal
                    ? session
                    : Object.freeze({ ...session, ...patch }),
                ),
              ),
            }),
      ),
    ),
  });
}

function expectFinding(
  input: LearningV2CourseBlueprintValidationInputV1,
  expectedCode: string,
): void {
  const findings = validateLearningV2CourseBlueprintV1(input);
  assert.ok(
    findings.some((finding) => finding.code === expectedCode),
    `${expectedCode}\nactual=${findings.map((finding) => finding.code).join(",")}`,
  );
}

assert.deepEqual(validateLearningV2CourseBlueprintV1(VALID_COURSE), []);

expectFinding(
  Object.freeze({
    ...VALID_COURSE,
    lessons: Object.freeze(VALID_COURSE.lessons.slice(0, -1)),
  }),
  "course_lesson_count_invalid",
);

expectFinding(
  Object.freeze({
    ...VALID_COURSE,
    lessons: Object.freeze([
      Object.freeze({
        ...VALID_COURSE.lessons[0],
        sessions: Object.freeze(VALID_COURSE.lessons[0].sessions.slice(0, -1)),
      }),
      ...VALID_COURSE.lessons.slice(1),
    ]),
  }),
  "lesson_session_count_invalid",
);

expectFinding(
  replaceSession(VALID_COURSE, 1, 2, {
    sessionId: VALID_COURSE.lessons[0].sessions[0].sessionId,
  }),
  "session_id_duplicate",
);

expectFinding(
  replaceSession(VALID_COURSE, 1, 7, { role: "checkpoint" }),
  "checkpoint_role_wrong_ordinal",
);

expectFinding(
  replaceSession(VALID_COURSE, 1, 2, {
    reviewSourceSessionIds: Object.freeze(["lesson-01:session:99"]),
  }),
  "review_source_missing",
);

expectFinding(
  replaceSession(VALID_COURSE, 1, 1, {
    reviewSourceSessionIds: Object.freeze(["lesson-01:session:02"]),
  }),
  "review_source_not_prior",
);

expectFinding(
  replaceSession(VALID_COURSE, 1, 1, {
    canonicalEnglishExamples: Object.freeze(["He is here.", "He's here."]),
  }),
  "forbidden_surface_form_in_example",
);

expectFinding(
  replaceSession(VALID_COURSE, 1, 1, {
    sourceEvidenceRefs: Object.freeze([]),
  }),
  "source_evidence_missing",
);

process.stdout.write("LEARNING V2 COURSE BLUEPRINT CONTRACT GATE: PASS\n");

/**
 * Human-authored English grammar operations for the course blueprint.
 *
 * This registry grows only after the applicable lesson boundary is recentered
 * and reviewed. It is not a grammar generator and does not contain exercises.
 */

import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_02_30_V1 } from "./grammar_operations_en_course_v1";

export type LearningV2EnglishGrammarOperationV1 = Readonly<{
  id: string;
  lessonOrdinal: number;
  communicativeFunction: string;
  formBoundary: readonly string[];
  prerequisiteOperationIds: readonly string[];
  prohibitedExtensionIds: readonly string[];
  sourceEvidenceRefs: readonly string[];
}>;

const LESSON_01_PROHIBITED_EXTENSIONS = Object.freeze([
  "en.copula.third_person.affirmative",
  "en.copula.plural.affirmative",
  "en.copula.negation",
  "en.copula.question",
  "en.demonstratives.singular",
  "en.article.indefinite",
  "en.possession",
  "en.lexical_verb_frame",
]);

const LESSON_01_EVIDENCE = Object.freeze([
  "EV-EP-01",
  "OC-SCENARIO-01",
  "OC-AUTHORING-01",
  "PH-GRAMMAR-01",
]);

const LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_LESSON_01_V1 = Object.freeze([
  Object.freeze({
    id: "en.copula.i_am.affirmative",
    lessonOrdinal: 1,
    communicativeFunction:
      "Назвать себя или сообщить одну утвердительную информацию о себе.",
    formBoundary: Object.freeze(["I am + familiar complement"]),
    prerequisiteOperationIds: Object.freeze([]),
    prohibitedExtensionIds: LESSON_01_PROHIBITED_EXTENSIONS,
    sourceEvidenceRefs: LESSON_01_EVIDENCE,
  }),
  Object.freeze({
    id: "en.copula.i_am.contraction",
    lessonOrdinal: 1,
    communicativeFunction:
      "Выразить ту же утвердительную информацию о себе формой I'm.",
    formBoundary: Object.freeze(["I'm + familiar complement"]),
    prerequisiteOperationIds: Object.freeze([
      "en.copula.i_am.affirmative",
    ]),
    prohibitedExtensionIds: LESSON_01_PROHIBITED_EXTENSIONS,
    sourceEvidenceRefs: LESSON_01_EVIDENCE,
  }),
  Object.freeze({
    id: "en.copula.you_are.affirmative",
    lessonOrdinal: 1,
    communicativeFunction:
      "Сообщить одну утвердительную информацию собеседнику через you are.",
    formBoundary: Object.freeze(["You are + familiar complement"]),
    prerequisiteOperationIds: Object.freeze([
      "en.copula.i_am.affirmative",
    ]),
    prohibitedExtensionIds: LESSON_01_PROHIBITED_EXTENSIONS,
    sourceEvidenceRefs: LESSON_01_EVIDENCE,
  }),
  Object.freeze({
    id: "en.copula.you_are.contraction",
    lessonOrdinal: 1,
    communicativeFunction:
      "Выразить ту же утвердительную информацию собеседнику формой you're.",
    formBoundary: Object.freeze(["You're + familiar complement"]),
    prerequisiteOperationIds: Object.freeze([
      "en.copula.you_are.affirmative",
    ]),
    prohibitedExtensionIds: LESSON_01_PROHIBITED_EXTENSIONS,
    sourceEvidenceRefs: LESSON_01_EVIDENCE,
  }),
] satisfies readonly LearningV2EnglishGrammarOperationV1[]);

export const LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V1 = Object.freeze([
  ...LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_LESSON_01_V1,
  ...LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_02_30_V1,
]);

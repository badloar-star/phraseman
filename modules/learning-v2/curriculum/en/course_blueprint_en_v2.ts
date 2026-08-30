import { createHash } from "node:crypto";

import { LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2 } from "./chapter_blueprints_en_v2";
import { LEARNING_V2_ENGLISH_COVERAGE_MATRICES_V2 } from "./coverage_matrices_en_v2";
import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "./exact_session_packets_en_v2";
import { LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2 } from "./full_b1_scope_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2 } from "./grammar_operations_en_v2";
import { LEARNING_V2_ENGLISH_LESSON_BLUEPRINTS_V2 } from "./lesson_blueprints_en_v2";
import {
  LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V2,
  LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2,
} from "./lexical_senses_en_v2";
import { LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V2 } from "./prerequisite_dag_en_v2";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (typeof value !== "object" || value === null) return value;
  const record = value as Readonly<Record<string, unknown>>;
  return Object.fromEntries(
    Object.keys(record)
      .sort()
      .map((key) => [key, canonicalize(record[key])]),
  );
}

export function hashLearningV2EnglishCourseBlueprintBodyV2(body: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(canonicalize(body)), "utf8")
    .digest("hex");
}

export const LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_BODY_V2 = Object.freeze({
  schemaVersion: "learning-v2-english-course-blueprint.v2" as const,
  targetLanguage: "en" as const,
  scope: LEARNING_V2_ENGLISH_FULL_B1_SCOPE_V2,
  grammarOperations: LEARNING_V2_ENGLISH_GRAMMAR_OPERATIONS_V2,
  grammarPrerequisiteDag: LEARNING_V2_ENGLISH_GRAMMAR_PREREQUISITE_DAG_V2,
  lessons: LEARNING_V2_ENGLISH_LESSON_BLUEPRINTS_V2,
  chapters: LEARNING_V2_ENGLISH_CHAPTER_BLUEPRINTS_V2,
  lexicalSenses: LEARNING_V2_ENGLISH_LEXICAL_SENSES_V2,
  lexicalRetrievalEdges: LEARNING_V2_ENGLISH_LEXICAL_RETRIEVAL_EDGES_V2,
  sessionPackets: LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2,
  coverageMatrices: LEARNING_V2_ENGLISH_COVERAGE_MATRICES_V2,
});

export const LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 = Object.freeze({
  ...LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_BODY_V2,
  blueprintFingerprint: hashLearningV2EnglishCourseBlueprintBodyV2(
    LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_BODY_V2,
  ),
  ownerApproval: "PENDING" as const,
});

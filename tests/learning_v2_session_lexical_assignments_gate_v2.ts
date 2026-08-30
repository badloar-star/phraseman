import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";
import { LEARNING_V2_ENGLISH_PLANNED_LEXICAL_RETRIEVAL_EDGES_V2 } from "../modules/learning-v2/curriculum/en/lexical_progression_en_v2";
import { LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2 } from "../modules/learning-v2/curriculum/en/session_lexical_assignments_en_v2";

const assignments = LEARNING_V2_ENGLISH_SESSION_LEXICAL_ASSIGNMENTS_V2;
const findings: string[] = [];

const expectedCourseStartLexicon = new Map<string, readonly string[]>([
  ["lesson-01:session:01", ["here", "ready", "fine"]],
  ["lesson-01:session:02", ["happy", "sad", "tired"]],
  ["lesson-01:session:03", ["busy", "free", "late"]],
  ["lesson-01:session:04", ["hungry", "thirsty", "sick"]],
  ["lesson-01:session:05", ["cold", "hot", "warm"]],
  ["lesson-01:session:06", ["calm", "nervous", "excited"]],
  ["lesson-01:session:07", ["angry", "scared"]],
]);

const expectedHeSheItLexicon = new Map<string, readonly string[]>([
  ["lesson-01:session:09", ["tall", "short", "young"]],
  ["lesson-01:session:10", ["old", "kind", "funny"]],
  ["lesson-01:session:11", ["smart", "strong", "quiet"]],
  ["lesson-01:session:12", ["loud", "friendly", "helpful"]],
  ["lesson-01:session:13", ["small", "big", "clean"]],
  ["lesson-01:session:14", ["dirty", "open", "closed"]],
  ["lesson-01:session:15", ["easy", "difficult", "important"]],
]);

const sessionIds = assignments.map((assignment) => assignment.sessionId);
if (new Set(sessionIds).size !== sessionIds.length) {
  findings.push("assignment_session_ids_not_unique");
}

const allSenseIds = assignments.flatMap((assignment) =>
  assignment.newSenses.map((sense) => sense.id)
);
if (new Set(allSenseIds).size !== allSenseIds.length) {
  findings.push("assignment_sense_ids_not_unique");
}

for (const assignment of assignments) {
  if (assignment.canonicalExamples.length < 2 || assignment.canonicalExamples.length > 4) {
    findings.push(
      `canonical_example_count_invalid:${assignment.sessionId}:${assignment.canonicalExamples.length}`,
    );
  }

  const normalizedExamples =
    ` ${assignment.canonicalExamples.join(" ").toLowerCase().replace(/[^a-z]+/g, " ")} `;
  for (const sense of assignment.newSenses) {
    if (!normalizedExamples.includes(` ${sense.english.toLowerCase()} `)) {
      findings.push(`new_sense_absent_from_examples:${assignment.sessionId}:${sense.id}`);
    }
  }

  const packet = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.find(
    (candidate) => candidate.sessionId === assignment.sessionId,
  );
  if (!packet) {
    findings.push(`assigned_packet_missing:${assignment.sessionId}`);
    continue;
  }
  const expectedNewSenseIds = assignment.newSenses.map((sense) => sense.id);
  if (JSON.stringify(packet.newLexicalSenseIds) !== JSON.stringify(expectedNewSenseIds)) {
    findings.push(`assigned_packet_new_senses_mismatch:${assignment.sessionId}`);
  }
  if (JSON.stringify(packet.retrievalLexicalSenseIds) !== JSON.stringify(assignment.retrievalSenseIds)) {
    findings.push(`assigned_packet_retrieval_senses_mismatch:${assignment.sessionId}`);
  }
  if (JSON.stringify(packet.canonicalExamples) !== JSON.stringify(assignment.canonicalExamples)) {
    findings.push(`assigned_packet_examples_mismatch:${assignment.sessionId}`);
  }
  for (const senseId of assignment.retrievalSenseIds) {
    if (!LEARNING_V2_ENGLISH_PLANNED_LEXICAL_RETRIEVAL_EDGES_V2.some((edge) =>
      edge.senseId === senseId &&
      edge.targetAbsoluteSessionOrdinal === assignment.absoluteSessionOrdinal
    )) {
      findings.push(`assigned_retrieval_edge_missing:${assignment.sessionId}:${senseId}`);
    }
  }
}

for (const [sessionId, expectedEnglish] of expectedCourseStartLexicon) {
  const assignment = assignments.find((candidate) => candidate.sessionId === sessionId);
  if (!assignment) {
    findings.push(`course_start_assignment_missing:${sessionId}`);
    continue;
  }
  const actualEnglish = assignment.newSenses.map((sense) => sense.english);
  if (JSON.stringify(actualEnglish) !== JSON.stringify(expectedEnglish)) {
    findings.push(
      `course_start_lexicon_mismatch:${sessionId}:expected=${expectedEnglish.join(",")}:actual=${actualEnglish.join(",")}`,
    );
  }
  if (assignment.grammarOperationId !== "en.grammar.present_be_affirmative.i_am") {
    findings.push(`course_start_operation_mismatch:${sessionId}:${assignment.grammarOperationId}`);
  }
}

for (const [sessionId, expectedEnglish] of expectedHeSheItLexicon) {
  const assignment = assignments.find((candidate) => candidate.sessionId === sessionId);
  if (!assignment) {
    findings.push(`he_she_it_assignment_missing:${sessionId}`);
    continue;
  }
  const actualEnglish = assignment.newSenses.map((sense) => sense.english);
  if (JSON.stringify(actualEnglish) !== JSON.stringify(expectedEnglish)) {
    findings.push(
      `he_she_it_lexicon_mismatch:${sessionId}:expected=${expectedEnglish.join(",")}:actual=${actualEnglish.join(",")}`,
    );
  }
  if (assignment.grammarOperationId !== "en.grammar.present_be_affirmative.he_she_it_is") {
    findings.push(`he_she_it_operation_mismatch:${sessionId}:${assignment.grammarOperationId}`);
  }
}

if (assignments.some((assignment) => assignment.sessionId === "lesson-01:session:08")) {
  findings.push("course_start_checkpoint_must_not_have_lexical_assignment");
}
if (assignments.some((assignment) => assignment.sessionId === "lesson-01:session:16")) {
  findings.push("he_she_it_checkpoint_must_not_have_lexical_assignment");
}

const courseStartSenseCount = assignments
  .filter((assignment) => expectedCourseStartLexicon.has(assignment.sessionId))
  .reduce((count, assignment) => count + assignment.newSenses.length, 0);
if (courseStartSenseCount !== 20) {
  findings.push(`course_start_sense_count:${courseStartSenseCount}`);
}

const heSheItSenseCount = assignments
  .filter((assignment) => expectedHeSheItLexicon.has(assignment.sessionId))
  .reduce((count, assignment) => count + assignment.newSenses.length, 0);
if (heSheItSenseCount !== 21) {
  findings.push(`he_she_it_sense_count:${heSheItSenseCount}`);
}

assert.equal(
  findings.length,
  0,
  `learning_v2_session_lexical_assignment_findings=${findings.length}\n${findings.join("\n")}`,
);

process.stdout.write(
  `LEARNING V2 SESSION LEXICAL ASSIGNMENTS GATE V2: PASS assignments=${assignments.length} course_start_senses=${courseStartSenseCount} he_she_it_senses=${heSheItSenseCount}\n`,
);

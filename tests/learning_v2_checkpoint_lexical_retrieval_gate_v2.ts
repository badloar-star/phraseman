import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";
import { LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2 } from "../modules/learning-v2/curriculum/en/lexical_progression_en_v2";

const sessionFlagIndex = process.argv.indexOf("--session");
const requestedSessionId = sessionFlagIndex >= 0
  ? process.argv[sessionFlagIndex + 1]
  : undefined;

if (sessionFlagIndex >= 0 && !requestedSessionId) {
  throw new Error("learning_v2_checkpoint_retrieval_session_id_required");
}

const allCheckpoints = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2.filter(
  (packet) => packet.sessionWithinChapter === 8,
);
const checkpoints = requestedSessionId
  ? allCheckpoints.filter((packet) => packet.sessionId === requestedSessionId)
  : allCheckpoints;
const senseById = new Map(
  LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2.map((sense) => [sense.id, sense]),
);
const findings: string[] = [];

if (requestedSessionId && checkpoints.length !== 1) {
  findings.push(`checkpoint_session_not_found:${requestedSessionId}`);
}

if (!requestedSessionId && checkpoints.length !== 224) {
  findings.push(`checkpoint_count:${checkpoints.length}`);
}

for (const checkpoint of checkpoints) {
  if (checkpoint.newLexicalSenseIds.length > 0) {
    findings.push(`checkpoint_new_lexicon_forbidden:${checkpoint.sessionId}`);
  }

  if (checkpoint.retrievalLexicalSenseIds.length === 0) {
    findings.push(`checkpoint_retrieval_missing:${checkpoint.sessionId}`);
  }

  if (
    new Set(checkpoint.retrievalLexicalSenseIds).size !==
    checkpoint.retrievalLexicalSenseIds.length
  ) {
    findings.push(`checkpoint_retrieval_duplicate:${checkpoint.sessionId}`);
  }

  for (const senseId of checkpoint.retrievalLexicalSenseIds) {
    const sense = senseById.get(senseId);
    if (!sense) {
      findings.push(`checkpoint_retrieval_sense_missing:${checkpoint.sessionId}:${senseId}`);
      continue;
    }

    if (sense.introductionAbsoluteSessionOrdinal >= checkpoint.absoluteSessionOrdinal) {
      findings.push(`checkpoint_uses_future_sense:${checkpoint.sessionId}:${senseId}`);
    }
  }
}

assert.equal(
  findings.length,
  0,
  `learning_v2_checkpoint_lexical_retrieval_findings=${findings.length}\n${findings
    .slice(0, 224)
    .join("\n")}`,
);

process.stdout.write(
  `LEARNING V2 CHECKPOINT LEXICAL RETRIEVAL GATE V2: PASS checkpoints=${checkpoints.length} retrieval_senses=${checkpoints.reduce((sum, checkpoint) => sum + checkpoint.retrievalLexicalSenseIds.length, 0)}\n`,
);

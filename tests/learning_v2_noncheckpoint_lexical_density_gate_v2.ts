import assert from "node:assert/strict";

import { LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2 } from "../modules/learning-v2/curriculum/en/exact_session_packets_en_v2";
import {
  LEARNING_V2_ENGLISH_PLANNED_LEXICAL_RETRIEVAL_EDGES_V2,
  LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2,
} from "../modules/learning-v2/curriculum/en/lexical_progression_en_v2";

const packets = LEARNING_V2_ENGLISH_EXACT_SESSION_PACKETS_V2;
const senses = LEARNING_V2_ENGLISH_PLANNED_LEXICAL_SENSES_V2;
const edges = LEARNING_V2_ENGLISH_PLANNED_LEXICAL_RETRIEVAL_EDGES_V2;
const checkpoints = packets.filter((packet) => packet.sessionWithinChapter === 8);
const nonCheckpoints = packets.filter((packet) => packet.sessionWithinChapter !== 8);
const senseById = new Map(senses.map((sense) => [sense.id, sense]));
const findings: string[] = [];

if (packets.length !== 1_792) findings.push(`packet_count:${packets.length}`);
if (nonCheckpoints.length !== 1_568) findings.push(`noncheckpoint_count:${nonCheckpoints.length}`);
if (checkpoints.length !== 224) findings.push(`checkpoint_count:${checkpoints.length}`);

for (const packet of nonCheckpoints) {
  if (packet.newLexicalSenseIds.length === 0) {
    findings.push(`noncheckpoint_new_lexicon_missing:${packet.sessionId}`);
  }
}

for (const packet of checkpoints) {
  if (packet.newLexicalSenseIds.length > 0) {
    findings.push(`checkpoint_new_lexicon_forbidden:${packet.sessionId}`);
  }
}

const senseIds = senses.map((sense) => sense.id);
if (new Set(senseIds).size !== senseIds.length) findings.push("planned_sense_ids_not_unique");

const introductionPacketsBySenseId = new Map<string, string[]>();
for (const packet of packets) {
  for (const senseId of packet.newLexicalSenseIds) {
    const introductions = introductionPacketsBySenseId.get(senseId) ?? [];
    introductions.push(packet.sessionId);
    introductionPacketsBySenseId.set(senseId, introductions);

    const sense = senseById.get(senseId);
    if (!sense) {
      findings.push(`packet_new_sense_missing_from_ledger:${packet.sessionId}:${senseId}`);
      continue;
    }
    const normalizedExamples = ` ${packet.canonicalExamples.join(" ").toLowerCase().replace(/[^a-z]+/g, " ")} `;
    if (!normalizedExamples.includes(` ${sense.english.toLowerCase()} `)) {
      findings.push(`new_sense_absent_from_canonical_examples:${packet.sessionId}:${senseId}`);
    }
  }
}

for (const sense of senses) {
  const introductions = introductionPacketsBySenseId.get(sense.id) ?? [];
  if (introductions.length !== 1) {
    findings.push(`sense_first_introduction_count:${sense.id}:${introductions.length}`);
  }
  if (!edges.some((edge) =>
    edge.senseId === sense.id &&
    edge.targetAbsoluteSessionOrdinal > sense.introductionAbsoluteSessionOrdinal
  )) {
    findings.push(`forward_retrieval_missing:${sense.id}`);
  }
}

for (const checkpoint of checkpoints) {
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

const expectedFirstChapterNewLexicon = new Map<number, readonly string[]>([
  [1, ["en.here.adverb.01", "en.ready.adjective.01", "en.fine.adjective.01"]],
  [2, ["en.happy.adjective.01", "en.sad.adjective.01", "en.tired.adjective.01"]],
  [3, ["en.busy.adjective.01", "en.free.adjective.01", "en.late.adjective.01"]],
  [4, ["en.hungry.adjective.01", "en.thirsty.adjective.01", "en.sick.adjective.01"]],
  [5, ["en.cold.adjective.01", "en.hot.adjective.01", "en.warm.adjective.01"]],
  [6, ["en.calm.adjective.01", "en.nervous.adjective.01", "en.excited.adjective.01"]],
  [7, ["en.angry.adjective.01", "en.scared.adjective.01"]],
  [8, []],
]);

const firstChapterPackets = packets.filter(
  (packet) => packet.lessonOrdinal === 1 && packet.chapterOrdinal === 1,
);
for (const packet of firstChapterPackets) {
  const expected = [...(expectedFirstChapterNewLexicon.get(packet.sessionWithinChapter) ?? [])].sort();
  const actual = [...packet.newLexicalSenseIds].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    findings.push(
      `course_start_lexicon_mismatch:${packet.sessionId}:expected=${expected.join(",")}:actual=${actual.join(",")}`,
    );
  }
}

const firstChapterSenseIds = new Set(
  firstChapterPackets.flatMap((packet) => packet.newLexicalSenseIds),
);
if (firstChapterSenseIds.size !== 20) {
  findings.push(`course_start_unique_sense_count:${firstChapterSenseIds.size}`);
}

const expectedSecondChapterNewLexicon = new Map<number, readonly string[]>([
  [1, ["en.tall.adjective.01", "en.short.adjective.01", "en.young.adjective.01"]],
  [2, ["en.old.adjective.01", "en.kind.adjective.01", "en.funny.adjective.01"]],
  [3, ["en.smart.adjective.01", "en.strong.adjective.01", "en.quiet.adjective.01"]],
  [4, ["en.loud.adjective.01", "en.friendly.adjective.01", "en.helpful.adjective.01"]],
  [5, ["en.small.adjective.01", "en.big.adjective.01", "en.clean.adjective.01"]],
  [6, ["en.dirty.adjective.01", "en.open.adjective.01", "en.closed.adjective.01"]],
  [7, ["en.easy.adjective.01", "en.difficult.adjective.01", "en.important.adjective.01"]],
  [8, []],
]);

const secondChapterPackets = packets.filter(
  (packet) => packet.lessonOrdinal === 1 && packet.chapterOrdinal === 2,
);
for (const packet of secondChapterPackets) {
  const expected = [...(expectedSecondChapterNewLexicon.get(packet.sessionWithinChapter) ?? [])].sort();
  const actual = [...packet.newLexicalSenseIds].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    findings.push(
      `he_she_it_lexicon_mismatch:${packet.sessionId}:expected=${expected.join(",")}:actual=${actual.join(",")}`,
    );
  }
}

const secondChapterSenseIds = new Set(
  secondChapterPackets.flatMap((packet) => packet.newLexicalSenseIds),
);
if (secondChapterSenseIds.size !== 21) {
  findings.push(`he_she_it_unique_sense_count:${secondChapterSenseIds.size}`);
}

const expectedThirdChapterNewLexicon = new Map<number, readonly string[]>([
  [1, ["en.welcome.adjective.01", "en.safe.adjective.01", "en.right.adjective.01"]],
  [2, ["en.wrong.adjective.01", "en.early.adverb.01", "en.lucky.adjective.01"]],
  [3, ["en.together.adverb.01", "en.alone.adjective.01", "en.nearby.adverb.01"]],
  [4, ["en.lost.adjective.01", "en.prepared.adjective.01", "en.careful.adjective.01"]],
  [5, ["en.inside.adverb.01", "en.outside.adverb.01", "en.upstairs.adverb.01"]],
  [6, ["en.rich.adjective.01", "en.poor.adjective.01", "en.famous.adjective.01"]],
  [7, ["en.married.adjective.01", "en.single.adjective.01", "en.different.adjective.01"]],
  [8, []],
]);

const thirdChapterPackets = packets.filter(
  (packet) => packet.lessonOrdinal === 1 && packet.chapterOrdinal === 3,
);
for (const packet of thirdChapterPackets) {
  const expected = [...(expectedThirdChapterNewLexicon.get(packet.sessionWithinChapter) ?? [])].sort();
  const actual = [...packet.newLexicalSenseIds].sort();
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    findings.push(
      `you_we_they_lexicon_mismatch:${packet.sessionId}:expected=${expected.join(",")}:actual=${actual.join(",")}`,
    );
  }
}

const thirdChapterSenseIds = new Set(
  thirdChapterPackets.flatMap((packet) => packet.newLexicalSenseIds),
);
if (thirdChapterSenseIds.size !== 21) {
  findings.push(`you_we_they_unique_sense_count:${thirdChapterSenseIds.size}`);
}

assert.equal(
  findings.length,
  0,
  `learning_v2_noncheckpoint_lexical_density_findings=${findings.length}\n${findings.slice(0, 80).join("\n")}`,
);

process.stdout.write(
  `LEARNING V2 NONCHECKPOINT LEXICAL DENSITY GATE V2: PASS noncheckpoints=${nonCheckpoints.length} checkpoints=${checkpoints.length} planned_senses=${senses.length}\n`,
);

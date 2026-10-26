import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2 } from "../modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2";
import { LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2 } from "../modules/learning-v2/curriculum/en/course_blueprint_en_v2";

const APPROVED_FINGERPRINT = "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const approvedPacket = LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_V2.sessionPackets.find(
  (packet) => packet.lessonOrdinal === 1 && packet.sessionOrdinal === 16,
);

assert.equal(LEARNING_V2_ENGLISH_COURSE_BLUEPRINT_MANIFEST_V2.fingerprint, APPROVED_FINGERPRINT);
assert.ok(approvedPacket, "the approved blueprint must contain L01/S16");
assert.equal(approvedPacket.role, "checkpoint");
assert.deepEqual(approvedPacket.newLexicalSenseIds, [], "the exact checkpoint introduces no lexical senses");
assert.deepEqual(approvedPacket.reviewOperationIds, [
  "en.grammar.present_be_affirmative.i_am",
  "en.grammar.present_be_affirmative.he_she_it_is",
]);
assert.equal(approvedPacket.retrievalLexicalSenseIds.length, 21);

// The exact blueprint packet is the editorial admission authority. The older
// episode map/source projection is deliberately not allowed to manufacture a
// PASS when the currently accepted prefix does not prove this packet's IDs.
const preflight = spawnSync(process.execPath, [
  path.join(repoRoot, "content", "learning-v2-course", "pipeline", "run.mjs"),
  "preflight",
  "--session",
  "en/l01/s16",
  "--backend",
  "disabled",
], { cwd: repoRoot, encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
const preflightOutput = `${preflight.stdout || ""}\n${preflight.stderr || ""}`;

assert.equal(preflight.status, 1, "S16 must remain fail-closed until the exact accepted prefix satisfies d956");
assert.match(preflightOutput, /AUTHORING HOLD/u);
const missingRetrievalSenseIds = [...preflightOutput.matchAll(
  /accepted_prefix_retrieval_sense_missing:([^\s]+)/gu,
)].map((match) => match[1]);
assert.deepEqual(missingRetrievalSenseIds, approvedPacket.retrievalLexicalSenseIds);
assert.match(
  preflightOutput,
  /accepted_prefix_review_operation_missing:en\.grammar\.present_be_affirmative\.he_she_it_is/u,
);
assert.doesNotMatch(
  preflightOutput,
  /accepted_prefix_review_operation_missing:en\.grammar\.present_be_affirmative\.i_am/u,
);

console.log(
  "Learning V2 session 16 exact d956 editorial admission gate: HOLD (expected fail-closed prerequisite result)",
);

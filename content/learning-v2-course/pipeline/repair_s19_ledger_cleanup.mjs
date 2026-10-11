import fs from "node:fs";

const file = "migration/single-phrase-2026-10-03/preservation-ledger.json";
const ledger = JSON.parse(fs.readFileSync(file, "utf8"));
const session = "en:lesson-01:session-19";
const i16 = `${session}:i16`;
const i20 = `${session}:i20`;

// The new builder still checks the same lexical fact (serious), but exposes
// the complete phrase instead of a gap. Keep the original source segment and
// map it explicitly to the reviewed target.
for (const row of ledger.rows) {
  if (row.courseSessionId === session && row.oldInteractionId === i16 && row.segmentIndex === 1) {
    row.newInteractionId = i16;
    row.newTargetSegment = "He is serious.";
    row.correctText = "He is serious.";
    row.audioTranscript = null;
  }
  if (row.courseSessionId === session && row.oldInteractionId === `${session}:i07` && row.segmentIndex === 1) {
    row.audioTranscript = null;
  }
}

// Three answer-revealing repetition steps were replaced by one independent
// recording. Retire every old segment; the one retained phrase is still
// evidenced by the replacement interaction.
ledger.amendments = (ledger.amendments ?? []).filter((amendment) => !(amendment.courseSessionId === session && (
  (!amendment.action && amendment.oldInteractionId === i16 && amendment.segmentIndex === 1) ||
  (amendment.action === "retire" && amendment.oldInteractionId === i20) ||
  (amendment.action === "replacement" && amendment.newInteractionId === i20)
)));
ledger.amendments.push({
  courseSessionId: session, oldInteractionId: i16, segmentIndex: 1,
  from: "He is ___ .", to: "He is serious.",
  reason: "The same serious fact is assessed as an independently assembled complete phrase (2026-10-10).",
});
const oldTargets = ["He is not angry.", "She is not rude.", "He is not slow."];
for (const [index, from] of oldTargets.entries()) {
  ledger.amendments.push({
    action: "retire", courseSessionId: session, oldInteractionId: i20,
    segmentIndex: index + 1, from, replacementInteractionId: i20,
    to: "He is not angry.",
    reason: "Three answer-revealing voice steps replaced with one independent response (2026-10-10).",
  });
}
ledger.amendments.push({
  action: "replacement", courseSessionId: session, newInteractionId: i20,
  retires: oldTargets.map((_, index) => ({ oldInteractionId: i20, segmentIndex: index + 1 })),
  reason: "One independent response replaces the answer-revealing voice chain (2026-10-10).",
});

fs.writeFileSync(file, `${JSON.stringify(ledger, null, 2)}\n`);

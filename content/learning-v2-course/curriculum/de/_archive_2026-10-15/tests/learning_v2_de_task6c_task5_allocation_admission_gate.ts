import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  germanTask6cTask5AllocationAdmissionTestHarnessDeV1,
  isGermanTask6cTask5AllocationAdmissionDeV1,
  loadGermanTask6cTask5AllocationAdmissionDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_task5_allocation_admission_de_v1";

function clone(): Record<string, unknown> {
  return JSON.parse(
    JSON.stringify(
      germanTask6cTask5AllocationAdmissionTestHarnessDeV1.readFixedRegistryForTest(),
    ),
  ) as Record<string, unknown>;
}
function rows(value: Record<string, unknown>): Record<string, unknown>[] {
  return value.rows as Record<string, unknown>[];
}
function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(process.cwd(), relative), "utf8"),
  ) as Record<string, unknown>;
}
function fails(
  mutate: (value: Record<string, unknown>) => void,
  pattern: RegExp,
): void {
  const value = clone();
  mutate(value);
  assert.throws(
    () =>
      germanTask6cTask5AllocationAdmissionTestHarnessDeV1.validateUntrustedRegistryForTest(
        value,
      ),
    pattern,
  );
}

const admitted = loadGermanTask6cTask5AllocationAdmissionDeV1();
assert.equal(loadGermanTask6cTask5AllocationAdmissionDeV1.length, 0);
assert.equal(isGermanTask6cTask5AllocationAdmissionDeV1(admitted), true);
assert.equal(Object.isFrozen(admitted), true);
assert.equal(admitted.status, "TASK5_ADMITTED_FOR_TASK6C_ALLOCATION_ONLY");
assert.equal(admitted.rowsAdmitted, 4);
assert.equal(admitted.rowsPromoted, 0);
assert.equal(admitted.canonicalRegistryStatus, "NOT_CANONICAL");
assert.equal(admitted.canonicalPromotion, false);
assert.equal(admitted.task7Unlock, false);
assert.equal(admitted.packetMaterializationAuthority, false);
assert.equal(admitted.learnerFacingAuthority, false);
assert.equal(admitted.releaseAuthority, false);
assert.deepEqual(
  admitted.rows.map((row) => [
    row.sourcePlanId,
    row.firstIntroductionPacketId,
    row.firstScoredPacketId,
  ]),
  [
    ["de_lex_plan_l01_c03_briefkasten_v1", "de_l01_c03_s18", "de_l01_c03_s24"],
    ["de_lex_plan_l01_c04_buero_v1", "de_l01_c04_s26", "de_l01_c04_s32"],
    ["de_lex_plan_l01_c05_garten_v1", "de_l01_c05_s34", "de_l01_c05_s40"],
    ["de_lex_plan_l01_c06_hausmeister_v1", "de_l01_c06_s42", "de_l01_c06_s48"],
  ],
);

// Closed schema, fixed source identities, and no caller-selected evidence roots.
fails((value) => {
  delete value.rows;
}, /schema_invalid/u);
fails((value) => {
  value.extra = true;
}, /schema_invalid/u);
fails((value) => {
  rows(value)[0].extra = true;
}, /schema_invalid/u);
fails((value) => {
  (value.sourceBindings as Record<string, unknown>).sixNounManifestPath =
    "../../english.json";
}, /forbidden_content|source_binding_invalid/u);
fails((value) => {
  (value.sourceBindings as Record<string, unknown>).sixNounManifestSha256 =
    "0".repeat(64);
}, /source_binding_invalid/u);
fails((value) => {
  (value.sourceBindings as Record<string, unknown>).targetAllocationSha256 =
    "0".repeat(64);
}, /source_binding_invalid/u);
fails((value) => {
  (value.sourceBindings as Record<string, unknown>).sixNounClosureSha256 =
    "0".repeat(64);
}, /source_binding_invalid/u);

// Exact Task5 identity, noun packages, target mapping, chronology and Swiss sense exclusion.
fails((value) => {
  rows(value)[0].canonicalSenseId = rows(value)[1].canonicalSenseId;
}, /row_identity_invalid|duplicate_invalid/u);
fails((value) => {
  rows(value)[0].sourcePlanId = "de_lex_plan_l01_c01_nachbarin_v1";
}, /row_identity_invalid/u);
fails((value) => {
  rows(value)[0].plannedSenseId = "de_plan_l01_c03_checkpoint_01_v1";
}, /row_identity_invalid/u);
fails((value) => {
  rows(value)[0].sourceChapterId = "de_l01_c04";
}, /row_identity_invalid/u);
fails((value) => {
  rows(value)[0].task5SituationContext = "dictionary-only";
}, /row_identity_invalid/u);
fails((value) => {
  rows(value)[0].firstIntroductionPacketId = "de_l01_c03_s24";
}, /row_identity_invalid/u);
fails((value) => {
  rows(value)[0].firstScoredPacketId = "de_l01_c03_s18";
}, /row_identity_invalid|chronology_invalid/u);
fails((value) => {
  rows(value)[0].sourceAnchor = "d-1-1";
}, /row_identity_invalid/u);
fails((value) => {
  rows(value)[1].lemma = "Garten";
}, /row_identity_invalid/u);
fails((value) => {
  rows(value)[1].article = "der";
}, /row_identity_invalid/u);
fails((value) => {
  rows(value)[1].plural = "Gärten";
}, /row_identity_invalid/u);
fails((value) => {
  rows(value)[3].sourceAnchor = "d-1-2";
}, /row_identity_invalid|swiss_sense_invalid/u);

// The durable candidate requires its fixed independent-review closure, not raw evidence alone.
const closure = readJson(
  "docs/v2/curriculum/de/task6c-l01-six-noun-closure-v1/F.json",
);
const native = readJson(
  "docs/v2/curriculum/de/task6c-l01-six-noun-closure-v1/review.native.record.json",
);
const adversarial = readJson(
  "docs/v2/curriculum/de/task6c-l01-six-noun-closure-v1/review.adversarial.record.json",
);
function closureFails(
  mutate: (
    f: Record<string, unknown>,
    n: Record<string, unknown>,
    a: Record<string, unknown>,
  ) => void,
  pattern: RegExp,
): void {
  const f = JSON.parse(JSON.stringify(closure)) as Record<string, unknown>;
  const n = JSON.parse(JSON.stringify(native)) as Record<string, unknown>;
  const a = JSON.parse(JSON.stringify(adversarial)) as Record<string, unknown>;
  mutate(f, n, a);
  assert.throws(
    () =>
      germanTask6cTask5AllocationAdmissionTestHarnessDeV1.validateUntrustedClosureRecordsForTest(
        f,
        n,
        a,
      ),
    pattern,
  );
}
closureFails((f) => {
  f.stage = "P";
}, /closure_status_invalid/u);
closureFails((f) => {
  delete f.reviews;
}, /closure_schema_invalid/u);
closureFails((f) => {
  (f.reviews as Record<string, Record<string, unknown>>).native.sha256 =
    "0".repeat(64);
}, /closure_review_invalid/u);
closureFails((f) => {
  (f.status as Record<string, unknown>).candidateAcceptance = "REJECTED";
}, /closure_status_invalid/u);
closureFails((f) => {
  (f.status as Record<string, unknown>).task7Unlock = true;
}, /closure_status_invalid/u);
closureFails((_, n) => {
  n.verdict = "FAIL";
}, /review_verdict_invalid/u);
closureFails((_, n) => {
  n.reviewerRole = "AUTHOR";
}, /review_verdict_invalid/u);
closureFails((_, __, a) => {
  a.status = "PASS";
}, /review_verdict_invalid/u);
assert.throws(
  () =>
    germanTask6cTask5AllocationAdmissionTestHarnessDeV1.validateUntrustedClosureRecordsForTest(
      null,
      native,
      adversarial,
    ),
  /closure_schema_invalid/u,
);

// This is allocation-only: no canonical, Task7, packet, learner, release, English, RU/UK, translation, productive or register escalation.
fails((value) => {
  value.status = "CANONICAL";
}, /status_invalid/u);
fails((value) => {
  value.rowsPromoted = 1;
}, /ceiling_invalid/u);
fails((value) => {
  value.canonicalPromotion = true;
}, /ceiling_invalid/u);
fails((value) => {
  value.task7Unlock = true;
}, /ceiling_invalid/u);
fails((value) => {
  value.packetMaterializationAuthority = true;
}, /ceiling_invalid/u);
fails((value) => {
  value.learnerFacingAuthority = true;
}, /ceiling_invalid/u);
fails((value) => {
  value.releaseAuthority = true;
}, /ceiling_invalid/u);
fails((value) => {
  (rows(value)[0] as Record<string, unknown>).learnerText = "x";
}, /schema_invalid/u);
fails((value) => {
  (rows(value)[0] as Record<string, unknown>).translation = "x";
}, /schema_invalid/u);
fails((value) => {
  (rows(value)[0] as Record<string, unknown>).register = "x";
}, /schema_invalid/u);
fails((value) => {
  (rows(value)[0] as Record<string, unknown>).language = "ru";
}, /forbidden_content|schema_invalid/u);

// The immutable six-noun source gate covers raw-byte / span hash swaps and must remain GREEN.
process.stdout.write(
  "TASK6C_TASK5_ALLOCATION_ADMISSION status=TASK5_ADMITTED_FOR_TASK6C_ALLOCATION_ONLY rows=4 rowsPromoted=0 task7Unlock=false packetMaterializationAuthority=false learnerFacingAuthority=false releaseAuthority=false\\n",
);

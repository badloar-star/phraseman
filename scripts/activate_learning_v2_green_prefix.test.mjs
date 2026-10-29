import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  assertSessionCanonicalForActivation,
  planAcceptedGreenPrefix,
} from "./activate_learning_v2_green_prefix.mjs";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

test("activation rejects a MACHINE_VALIDATED receipt even when its candidate hash matches", () => {
  const session = "en/l01/s02";
  const candidateBundleSha256 = "a".repeat(64);
  assert.throws(() => assertSessionCanonicalForActivation({
    acceptance: {
      session,
      state: "MACHINE_VALIDATED",
      candidateBundleSha256,
      releaseAuthority: false,
    },
    manifest: { candidateBundleSha256 },
    session,
  }), /acceptance_manifest_mismatch:en\/l01\/s02/u);
});

test("plans the accepted green prefix through S15 with exact source-bound audio omissions", async () => {
  const plan = await planAcceptedGreenPrefix({
    repoRoot: process.cwd(),
    requestedThrough: "en/l01/s15",
  });

  assert.deepEqual(
    plan.sessions.map((entry) => entry.session),
    ["en/l01/s01", "en/l01/s02", "en/l01/s03", "en/l01/s04", "en/l01/s05", "en/l01/s06", "en/l01/s07", "en/l01/s08", "en/l01/s09", "en/l01/s10", "en/l01/s11", "en/l01/s12", "en/l01/s13", "en/l01/s14", "en/l01/s15"],
  );
  assert.equal(plan.blockedAt, null);
  assert.deepEqual(plan.sessions[5]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-06:i16",
    "en:lesson-01:session-06:i19",
  ]);
  assert.deepEqual(plan.sessions[6]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-07:i14",
    "en:lesson-01:session-07:i16",
  ]);
  assert.deepEqual(plan.sessions[7]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-08:i17:s02",
  ]);
  assert.deepEqual(plan.sessions[8]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-09:i14",
    "en:lesson-01:session-09:i18:s02",
    "en:lesson-01:session-09:i18:s04",
  ]);
  assert.deepEqual(plan.sessions[9]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-10:i12",
    "en:lesson-01:session-10:i18",
  ]);
  assert.deepEqual(plan.sessions[10]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-11:i17",
    "en:lesson-01:session-11:i18",
  ]);
  assert.deepEqual(plan.sessions[11]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-12:i08",
    "en:lesson-01:session-12:i16",
    "en:lesson-01:session-12:i20",
  ]);
  assert.deepEqual(plan.sessions[12]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-13:i18",
  ]);
  assert.deepEqual(plan.sessions[13]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-14:i10",
  ]);
  assert.deepEqual(plan.sessions[14]?.disabledSourceInteractionIds, [
    "en:lesson-01:session-15:i15",
    "en:lesson-01:session-15:i17:s02",
  ]);
});

test("the accepted green prefix through S15 is byte-identical in release and app projections", async () => {
  const repoRoot = process.cwd();
  const plan = await planAcceptedGreenPrefix({ repoRoot, requestedThrough: "en/l01/s15" });
  for (const session of plan.sessions) {
    for (const entry of session.candidateFiles) {
      const candidate = fs.readFileSync(path.join(repoRoot, session.candidateRoot, entry.path));
      assert.equal(candidate.length, entry.bytes, `candidate bytes ${entry.path}`);
      assert.equal(sha256(candidate), entry.sha256, `candidate sha ${entry.path}`);
      for (const projectionRoot of [
        "content/learning-v2-course/release",
        "modules/learning-v2/content/factory_native/generated_release",
      ]) {
        const projection = fs.readFileSync(path.join(repoRoot, projectionRoot, entry.path));
        assert.equal(sha256(projection), entry.sha256, `${projectionRoot}/${entry.path}`);
      }
    }
  }
});

test("activation remains HOLD and exposes exactly S01-S15, leaving S16 closed", () => {
  const activation = JSON.parse(fs.readFileSync(
    path.join(process.cwd(), "content/learning-v2-course/activation/en/active-sessions.v1.json"),
    "utf8",
  ));
  assert.equal(activation.courseReleaseState, "HOLD");
  assert.deepEqual(
    activation.activeSessions.map((entry) => entry.session),
    ["en/l01/s01", "en/l01/s02", "en/l01/s03", "en/l01/s04", "en/l01/s05", "en/l01/s06", "en/l01/s07", "en/l01/s08", "en/l01/s09", "en/l01/s10", "en/l01/s11", "en/l01/s12", "en/l01/s13", "en/l01/s14", "en/l01/s15"],
  );
  assert.equal(activation.activeSessions.some((entry) => entry.session === "en/l01/s16"), false);
  assert.equal(activation.activeSessions.at(-1)?.session, "en/l01/s15");
  assert.match(activation.activeSessions.at(-1)?.acceptanceReceiptPath ?? "", /\/s15\/a7dc0771ac43c4e9682b6eaf2ba91b1fb88dffa0f1d59a8d1523f8b41377266f\/acceptance-receipt\.json$/u);
  assert.match(activation.activeSessions.at(-1)?.acceptanceReceiptSha256 ?? "", /^[a-f0-9]{64}$/u);
});

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  persistReleaseAttemptReceipt,
  recenterReceiptDigest,
  validateRecenterReceipt,
} from "./recenter_receipt.mjs";

const processEpoch = "7dc288c8-2619-40bd-b954-4a8977a7cdbf";

const pack = Object.freeze({
  schemaVersion: "learning-v2-recenter-pack.v1",
  targetLanguage: "de",
  sessionId: "de_l01_s01",
  phase: "PRE_AUTHOR",
  applicability: "teaching",
  packDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  instructionSetDigest: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  blueprintFingerprint: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  packetFingerprint: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd",
  previousReleasedRangeDigest: "sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
  authoredRuDigest: null,
  authoredUkDigest: null,
  releaseAttemptId: null,
  mockupFingerprint: null,
  mockupManifestFingerprint: null,
  releaseFingerprint: null,
  releaseManifestFingerprint: null,
  postReceiptDigest: null,
  contentJudgeBundleDigest: null,
  releaseAttemptHistoryDigest: null,
  sources: [{ path: "C:/instruction.md", sha256: "sha256:abababababababababababababababababababababababababababababababab" }],
  blueprint: { path: "C:/blueprint.json", sha256: "sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc" },
  exactPacket: { path: "C:/packet.json", sha256: "sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd" },
  previousReleased: [],
  requirements: [
    {
      id: "DE-TEST-001",
      sourcePath: "repo/instruction.md",
      sourceSection: "Always",
      phase: ["PRE_AUTHOR", "POST_AUTHOR", "RELEASE_PROJECTION"],
      applicability: "always",
      severity: "HOLD",
      assertion: "Always applies.",
      family: "work_method",
    },
    {
      id: "DE-TEST-002",
      sourcePath: "repo/teaching.md",
      sourceSection: "Teaching",
      phase: ["PRE_AUTHOR", "POST_AUTHOR", "RELEASE_PROJECTION"],
      applicability: "teaching",
      severity: "HOLD",
      assertion: "Teaching applies.",
      family: "exact_packet",
    },
  ],
});

function result(requirementId, overrides = {}) {
  return {
    requirementId,
    verdict: "PASS",
    evidence: [{
      path: "C:/instruction.md",
      sha256: "sha256:abababababababababababababababababababababababababababababababab",
      section: "Exact section",
      fact: "Exact observed fact",
    }],
    authorDirective: "Concrete directive.",
    notApplicableReason: null,
    ...overrides,
  };
}

function receipt(overrides = {}) {
  return {
    schemaVersion: "learning-v2-recenter-receipt.v1",
    phase: "PRE_AUTHOR",
    status: "ON_TRACK",
    targetLanguage: "de",
    sessionId: "de_l01_s01",
    processEpoch,
    packDigest: pack.packDigest,
    instructionSetDigest: pack.instructionSetDigest,
    blueprintFingerprint: pack.blueprintFingerprint,
    packetFingerprint: pack.packetFingerprint,
    previousReleasedRangeDigest: pack.previousReleasedRangeDigest,
    preReceiptDigest: null,
    authoredRuDigest: null,
    authoredUkDigest: null,
    releaseAttemptId: null,
    mockupFingerprint: null,
    mockupManifestFingerprint: null,
    releaseFingerprint: null,
    releaseManifestFingerprint: null,
    postReceiptDigest: null,
    contentJudgeBundleDigest: null,
    releaseAttemptHistoryDigest: null,
    requirementResults: [result("DE-TEST-001"), result("DE-TEST-002")],
    mustFix: [],
    ...overrides,
  };
}

test("valid PRE_AUTHOR receipt covers every exact requirement", () => {
  const valid = receipt({
    requirementResults: [
      result("DE-TEST-001", { evidence: [{ path: "C:/instruction.md", sha256: pack.sources[0].sha256, section: "Always", fact: "Read." }] }),
      result("DE-TEST-002", { evidence: [{ path: "C:/packet.json", sha256: pack.exactPacket.sha256, section: "Teaching", fact: "Checked." }] }),
    ],
  });
  assert.deepEqual(validateRecenterReceipt({
    receipt: valid,
    pack,
    expectedPhase: "PRE_AUTHOR",
    processEpoch,
  }), []);
});

test("absent and wrong identity receipts are rejected", () => {
  assert.match(
    validateRecenterReceipt({
      receipt: null,
      pack,
      expectedPhase: "PRE_AUTHOR",
      processEpoch,
    }).join("\n"),
    /receipt_absent/u,
  );

  const issues = validateRecenterReceipt({
    receipt: receipt({
      targetLanguage: "en",
      sessionId: "de_l01_s02",
      phase: "POST_AUTHOR",
      processEpoch: "old-process",
    }),
    pack,
    expectedPhase: "PRE_AUTHOR",
    processEpoch,
  }).join("\n");
  assert.match(issues, /target_language_mismatch/u);
  assert.match(issues, /session_id_mismatch/u);
  assert.match(issues, /phase_mismatch/u);
  assert.match(issues, /process_epoch_mismatch/u);

  const missingEpoch = receipt({ processEpoch: undefined });
  assert.match(validateRecenterReceipt({
    receipt: missingEpoch,
    pack,
    expectedPhase: "PRE_AUTHOR",
    processEpoch: undefined,
  }).join("\n"), /process_epoch_required/u);
});

test("all content-addressed identities must match the current pack", () => {
  const stale = receipt({
    packDigest: "sha256:1".padEnd(71, "1"),
    instructionSetDigest: "sha256:2".padEnd(71, "2"),
    blueprintFingerprint: "sha256:3".padEnd(71, "3"),
    packetFingerprint: "sha256:4".padEnd(71, "4"),
    previousReleasedRangeDigest: "sha256:5".padEnd(71, "5"),
  });
  const issues = validateRecenterReceipt({
    receipt: stale,
    pack,
    expectedPhase: "PRE_AUTHOR",
    processEpoch,
  }).join("\n");
  for (const field of [
    "pack_digest_stale",
    "instruction_set_digest_stale",
    "blueprint_fingerprint_stale",
    "packet_fingerprint_stale",
    "previous_released_range_digest_stale",
  ]) assert.match(issues, new RegExp(field, "u"));
});

test("requirement coverage is exact and each result carries evidence", () => {
  const broken = receipt({
    requirementResults: [
      result("DE-TEST-001", { evidence: [] }),
      result("DE-TEST-001"),
      result("DE-UNKNOWN-999"),
    ],
  });
  const issues = validateRecenterReceipt({
    receipt: broken,
    pack,
    expectedPhase: "PRE_AUTHOR",
    processEpoch,
  }).join("\n");
  assert.match(issues, /duplicate_requirement_result:DE-TEST-001/u);
  assert.match(issues, /unknown_requirement_result:DE-UNKNOWN-999/u);
  assert.match(issues, /missing_requirement_result:DE-TEST-002/u);
  assert.match(issues, /requirement_evidence_required:DE-TEST-001/u);
  const invented = receipt({
    requirementResults: [
      result("DE-TEST-001"),
      result("DE-TEST-002", { evidence: [{ path: "C:/ghost.md", sha256: "sha256:0".padEnd(71, "0"), section: "Ghost", fact: "Invented." }] }),
    ],
  });
  assert.match(validateRecenterReceipt({ receipt: invented, pack, expectedPhase: "PRE_AUTHOR", processEpoch }).join("\n"), /evidence_path_outside_pack/u);
});

test("HOLD, illegal NOT_APPLICABLE, and non-empty mustFix prevent PASS", () => {
  const broken = receipt({
    requirementResults: [
      result("DE-TEST-001", {
        verdict: "NOT_APPLICABLE",
        notApplicableReason: "Claimed exception.",
      }),
      result("DE-TEST-002", { verdict: "HOLD" }),
    ],
    mustFix: ["Fix it"],
  });
  const issues = validateRecenterReceipt({
    receipt: broken,
    pack,
    expectedPhase: "PRE_AUTHOR",
    processEpoch,
  }).join("\n");
  assert.match(issues, /always_requirement_not_applicable:DE-TEST-001/u);
  assert.match(issues, /requirement_hold:DE-TEST-002/u);
  assert.match(issues, /must_fix_not_empty/u);
});

test("POST_AUTHOR receipt binds RU, UK, current process, and exact PRE receipt", () => {
  const pre = receipt();
  const postPack = {
    ...pack,
    phase: "POST_AUTHOR",
    authoredRuDigest: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    authoredUkDigest: "sha256:9999999999999999999999999999999999999999999999999999999999999999",
    authoredRu: { path: "C:/final.ru.md", sha256: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" },
    authoredUk: { path: "C:/final.uk.md", sha256: "sha256:9999999999999999999999999999999999999999999999999999999999999999" },
  };
  const validPost = receipt({
    phase: "POST_AUTHOR",
    status: "PASS",
    packDigest: postPack.packDigest,
    authoredRuDigest: postPack.authoredRuDigest,
    authoredUkDigest: postPack.authoredUkDigest,
    preReceiptDigest: recenterReceiptDigest(pre),
  });
  assert.deepEqual(validateRecenterReceipt({
    receipt: validPost,
    pack: postPack,
    expectedPhase: "POST_AUTHOR",
    processEpoch,
    preReceipt: pre,
    prePack: pack,
  }), []);

  const stale = {
    ...validPost,
    preReceiptDigest: "sha256:0".padEnd(71, "0"),
    authoredRuDigest: "sha256:1".padEnd(71, "1"),
    authoredUkDigest: "sha256:2".padEnd(71, "2"),
  };
  const issues = validateRecenterReceipt({
    receipt: stale,
    pack: postPack,
    expectedPhase: "POST_AUTHOR",
    processEpoch,
    preReceipt: pre,
    prePack: pack,
  }).join("\n");
  assert.match(issues, /pre_receipt_digest_stale/u);
  assert.match(issues, /authored_ru_digest_stale/u);
  assert.match(issues, /authored_uk_digest_stale/u);

  const invalidPre = { ...pre, schemaVersion: "bad", status: "HOLD" };
  const invalidPrePost = {
    ...validPost,
    preReceiptDigest: recenterReceiptDigest(invalidPre),
  };
  assert.match(validateRecenterReceipt({
    receipt: invalidPrePost,
    pack: postPack,
    expectedPhase: "POST_AUTHOR",
    processEpoch,
    preReceipt: invalidPre,
    prePack: pack,
  }).join("\n"), /pre_receipt_invalid/u);

  const alienPrePack = {
    ...pack,
    sessionId: "de_l01_s09",
    instructionSetDigest: "sha256:1111111111111111111111111111111111111111111111111111111111111111",
    blueprintFingerprint: "sha256:2222222222222222222222222222222222222222222222222222222222222222",
    packetFingerprint: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    previousReleasedRangeDigest: "sha256:4444444444444444444444444444444444444444444444444444444444444444",
  };
  const alienPre = receipt({
    sessionId: alienPrePack.sessionId,
    instructionSetDigest: alienPrePack.instructionSetDigest,
    blueprintFingerprint: alienPrePack.blueprintFingerprint,
    packetFingerprint: alienPrePack.packetFingerprint,
    previousReleasedRangeDigest: alienPrePack.previousReleasedRangeDigest,
  });
  const crossSessionPost = {
    ...validPost,
    preReceiptDigest: recenterReceiptDigest(alienPre),
  };
  const crossIssues = validateRecenterReceipt({
    receipt: crossSessionPost,
    pack: postPack,
    expectedPhase: "POST_AUTHOR",
    processEpoch,
    preReceipt: alienPre,
    prePack: alienPrePack,
  }).join("\n");
  assert.match(crossIssues, /pre_post_session_mismatch/u);
  assert.match(crossIssues, /pre_post_instruction_set_mismatch/u);
  assert.match(crossIssues, /pre_post_blueprint_mismatch/u);
  assert.match(crossIssues, /pre_post_packet_mismatch/u);
  assert.match(crossIssues, /pre_post_previous_range_mismatch/u);
});

test("RELEASE_PROJECTION binds exact POST receipt, release package, mockup, and attempt", () => {
  const pre = receipt({ requirementResults: [
    result("DE-TEST-001", { evidence: [{ path: "C:/instruction.md", sha256: pack.sources[0].sha256, section: "Always", fact: "Read." }] }),
    result("DE-TEST-002", { evidence: [{ path: "C:/packet.json", sha256: pack.exactPacket.sha256, section: "Teaching", fact: "Checked." }] }),
  ] });
  const postPack = {
    ...pack,
    phase: "POST_AUTHOR",
    authoredRuDigest: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    authoredUkDigest: "sha256:9999999999999999999999999999999999999999999999999999999999999999",
    authoredRu: { path: "C:/final.ru.md", sha256: "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff" },
    authoredUk: { path: "C:/final.uk.md", sha256: "sha256:9999999999999999999999999999999999999999999999999999999999999999" },
  };
  const post = receipt({
    phase: "POST_AUTHOR",
    status: "PASS",
    authoredRuDigest: postPack.authoredRuDigest,
    authoredUkDigest: postPack.authoredUkDigest,
    preReceiptDigest: recenterReceiptDigest(pre),
    requirementResults: pre.requirementResults,
  });
  const releasePack = {
    ...postPack,
    phase: "RELEASE_PROJECTION",
    applicability: "release",
    releaseAttemptId: "5880d0e0-43e6-4c55-b5ce-d314c65079d8",
    releaseFingerprint: "sha256:6666666666666666666666666666666666666666666666666666666666666666",
    releaseManifestFingerprint: "sha256:5555555555555555555555555555555555555555555555555555555555555555",
    mockupFingerprint: "sha256:8888888888888888888888888888888888888888888888888888888888888888",
    mockupManifestFingerprint: "sha256:7777777777777777777777777777777777777777777777777777777777777777",
    contentJudgeBundleDigest: "sha256:4444444444444444444444444444444444444444444444444444444444444444",
    releaseAttemptHistoryDigest: "sha256:3333333333333333333333333333333333333333333333333333333333333333",
    releasePackage: { path: "C:/release/de/l01/s01/learner-package.json", sha256: "sha256:6666666666666666666666666666666666666666666666666666666666666666" },
    releaseManifest: { path: "C:/release/de/l01/s01/release.manifest.json", sha256: "sha256:5555555555555555555555555555555555555555555555555555555555555555" },
    mockup: { path: "C:/.codex-tmp/learning-v2-owner-review-de/l01/s01/index.html", sha256: "sha256:8888888888888888888888888888888888888888888888888888888888888888" },
    mockupManifest: { path: "C:/.codex-tmp/learning-v2-owner-review-de/l01/s01/manifest.json", sha256: "sha256:7777777777777777777777777777777777777777777777777777777777777777" },
    contentJudgeReceipts: [{ path: "C:/judges/learner.json", sha256: "sha256:2222222222222222222222222222222222222222222222222222222222222222" }],
    previousReleaseAttempts: [],
  };
  const releaseReceipt = receipt({
    phase: "RELEASE_PROJECTION",
    status: "PASS",
    authoredRuDigest: releasePack.authoredRuDigest,
    authoredUkDigest: releasePack.authoredUkDigest,
    preReceiptDigest: recenterReceiptDigest(pre),
    postReceiptDigest: recenterReceiptDigest(post),
    releaseAttemptId: releasePack.releaseAttemptId,
    releaseFingerprint: releasePack.releaseFingerprint,
    releaseManifestFingerprint: releasePack.releaseManifestFingerprint,
    mockupFingerprint: releasePack.mockupFingerprint,
    mockupManifestFingerprint: releasePack.mockupManifestFingerprint,
    contentJudgeBundleDigest: releasePack.contentJudgeBundleDigest,
    releaseAttemptHistoryDigest: releasePack.releaseAttemptHistoryDigest,
    requirementResults: pre.requirementResults,
  });
  assert.deepEqual(validateRecenterReceipt({
    receipt: releaseReceipt,
    pack: releasePack,
    expectedPhase: "RELEASE_PROJECTION",
    processEpoch,
    preReceipt: pre,
    prePack: pack,
    postReceipt: post,
    postPack,
  }), []);

  const stale = { ...releaseReceipt, releaseAttemptId: "wrong", mockupFingerprint: "sha256:0".padEnd(71, "0") };
  const issues = validateRecenterReceipt({
    receipt: stale,
    pack: releasePack,
    expectedPhase: "RELEASE_PROJECTION",
    processEpoch,
    preReceipt: pre,
    prePack: pack,
    postReceipt: post,
    postPack,
  }).join("\n");
  assert.match(issues, /release_attempt_id_stale/u);
  assert.match(issues, /mockup_fingerprint_stale/u);

  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-de-attempt-"));
  try {
    const validation = {
      pack: releasePack,
      processEpoch,
      preReceipt: pre,
      prePack: pack,
      postReceipt: post,
      postPack,
    };
    const receiptPath = persistReleaseAttemptReceipt({ repoRoot, receipt: releaseReceipt, validation });
    assert.equal(fs.existsSync(receiptPath), true);
    assert.throws(
      () => persistReleaseAttemptReceipt({ repoRoot, receipt: releaseReceipt, validation }),
      /release_attempt_id_reused/u,
    );
  } finally {
    fs.rmSync(repoRoot, { recursive: true, force: true });
  }
});

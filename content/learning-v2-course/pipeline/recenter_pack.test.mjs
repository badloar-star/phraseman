import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { buildRecenterPack } from "./recenter_pack.mjs";

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");
const digest = (value) => `sha256:${hash(value)}`;
const generatorVersion = "learning-v2-de-projection.v1";
const releaseAttemptId = "5880d0e0-43e6-4c55-b5ce-d314c65079d8";
const requiredJudges = [
  "learner",
  "taste",
  "nonsense",
  "pedagogy",
  "reader",
  "progression",
  "locale_batch",
  "locale_ru",
  "locale_uk",
];

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-de-recenter-"));
  const repoRoot = path.join(root, "repo");
  const desktopCodexRoot = path.join(root, "desktop");
  fs.mkdirSync(repoRoot, { recursive: true });
  fs.mkdirSync(desktopCodexRoot, { recursive: true });

  const instructionPath = path.join(repoRoot, "instruction.md");
  const blueprintPath = path.join(
    repoRoot,
    "modules/learning-v2/curriculum/de/course_blueprint_de_v1.json",
  );
  const exactPacketPath = path.join(
    repoRoot,
    "content/learning-v2-course/curriculum/de/packets/l01/s02.json",
  );
  const previousRuPath = path.join(
    repoRoot,
    "content/learning-v2-course/sessions/de/l01/s01/final.ru.md",
  );
  const previousUkPath = path.join(
    repoRoot,
    "content/learning-v2-course/sessions/de/l01/s01/final.uk.md",
  );
  const previousReleaseReceiptPath = path.join(
    repoRoot,
    "content/learning-v2-course/sessions/de/l01/s01/recenter.release.json",
  );
  const authoredRuPath = path.join(
    repoRoot,
    "content/learning-v2-course/sessions/de/l01/s02/final.ru.md",
  );
  const authoredUkPath = path.join(
    repoRoot,
    "content/learning-v2-course/sessions/de/l01/s02/final.uk.md",
  );
  const mockupPath = path.join(
    repoRoot,
    ".codex-tmp/learning-v2-owner-review-de/l01/s02/index.html",
  );
  const mockupManifestPath = path.join(
    repoRoot,
    ".codex-tmp/learning-v2-owner-review-de/l01/s02/manifest.json",
  );
  const releasePackagePath = path.join(
    repoRoot,
    "content/learning-v2-course/release/de/l01/s02/learner-package.json",
  );
  const releaseManifestPath = path.join(
    repoRoot,
    "content/learning-v2-course/release/de/l01/s02/release.manifest.json",
  );
  const sessionRoot = path.join(
    repoRoot,
    "content/learning-v2-course/sessions/de/l01/s02",
  );
  const judgeReceiptPaths = requiredJudges.map((judge) => path.join(
    sessionRoot,
    `final.judge_${judge}.json`,
  ));
  const attemptHistoryRoot = path.join(sessionRoot, "release-attempts");

  for (const filePath of [
    blueprintPath,
    exactPacketPath,
    previousRuPath,
    previousUkPath,
    previousReleaseReceiptPath,
    authoredRuPath,
    authoredUkPath,
    mockupPath,
    mockupManifestPath,
    releasePackagePath,
    releaseManifestPath,
    ...judgeReceiptPaths,
  ]) fs.mkdirSync(path.dirname(filePath), { recursive: true });

  fs.writeFileSync(instructionPath, "instruction-v1", "utf8");
  fs.writeFileSync(blueprintPath, "blueprint-v1", "utf8");
  fs.writeFileSync(exactPacketPath, "packet-v1", "utf8");
  fs.writeFileSync(previousRuPath, "previous-ru-v1", "utf8");
  fs.writeFileSync(previousUkPath, "previous-uk-v1", "utf8");
  fs.writeFileSync(previousReleaseReceiptPath, JSON.stringify({
    targetLanguage: "de",
    sessionId: "de_l01_s01",
    phase: "RELEASE_PROJECTION",
    status: "PASS",
    releaseFingerprint: "sha256:previous-release",
    mockupFingerprint: "sha256:previous-mockup",
  }), "utf8");
  fs.writeFileSync(authoredRuPath, "authored-ru-v1", "utf8");
  fs.writeFileSync(authoredUkPath, "authored-uk-v1", "utf8");
  let contentJudgeBundleDigest = null;
  const writeContentJudgeReceipts = (instructionSetDigest) => {
    for (const [index, judge] of requiredJudges.entries()) {
      fs.writeFileSync(judgeReceiptPaths[index], JSON.stringify({
        schemaVersion: "learning-v2-de-content-judge.v1",
        judge,
        status: "PASS",
        targetLanguage: "de",
        sessionId: "de_l01_s02",
        authoredRuDigest: `sha256:${hash(fs.readFileSync(authoredRuPath))}`,
        authoredUkDigest: `sha256:${hash(fs.readFileSync(authoredUkPath))}`,
        blueprintFingerprint: `sha256:${hash(fs.readFileSync(blueprintPath))}`,
        packetFingerprint: `sha256:${hash(fs.readFileSync(exactPacketPath))}`,
        instructionSetDigest,
      }), "utf8");
    }
    contentJudgeBundleDigest = digest(JSON.stringify(requiredJudges.map((judge, index) => ({
      judge,
      sha256: digest(fs.readFileSync(judgeReceiptPaths[index])),
    }))));
  };
  const projectionIdentity = () => ({
    targetLanguage: "de",
    sessionId: "de_l01_s02",
    interfaceLocales: ["ru", "uk"],
    authoredRuDigest: digest(fs.readFileSync(authoredRuPath)),
    authoredUkDigest: digest(fs.readFileSync(authoredUkPath)),
    blueprintFingerprint: digest(fs.readFileSync(blueprintPath)),
    packetFingerprint: digest(fs.readFileSync(exactPacketPath)),
    contentJudgeBundleDigest,
    generatorVersion,
  });
  const payload = {
    ru: { intro: [{ body: "RU intro" }], practice: [{ prompt: "RU prompt" }] },
    uk: { intro: [{ body: "UK intro" }], practice: [{ prompt: "UK prompt" }] },
  };
  const localePayloadDigests = () => ({
    ru: digest(JSON.stringify(payload.ru)),
    uk: digest(JSON.stringify(payload.uk)),
  });
  const writeReleasePackage = () => fs.writeFileSync(releasePackagePath, JSON.stringify({
    schemaVersion: "learning-v2-de-learner-package.v1",
    ...projectionIdentity(),
    payload,
  }), "utf8");
  const writeMockup = () => fs.writeFileSync(mockupPath, `<html data-target-language="de"><script id="learning-v2-de-projection" type="application/json">${JSON.stringify({
    schemaVersion: "learning-v2-de-owner-mockup-projection.v1",
    ...projectionIdentity(),
    releaseAttemptId,
    releaseFingerprint: digest(fs.readFileSync(releasePackagePath)),
    localePayloadDigests: localePayloadDigests(),
  })}</script><script id="learning-v2-de-rendered-payload" type="application/json">${JSON.stringify(payload)}</script><main data-learning-v2-locale="ru"></main><main data-learning-v2-locale="uk"></main></html>`, "utf8");
  const writeReleaseManifest = () => fs.writeFileSync(releaseManifestPath, JSON.stringify({
    schemaVersion: "learning-v2-de-release-candidate.v1",
    targetLanguage: "de",
    sessionId: "de_l01_s02",
    releaseAttemptId,
    authoredRuDigest: `sha256:${hash(fs.readFileSync(authoredRuPath))}`,
    authoredUkDigest: `sha256:${hash(fs.readFileSync(authoredUkPath))}`,
    blueprintFingerprint: `sha256:${hash(fs.readFileSync(blueprintPath))}`,
    packetFingerprint: `sha256:${hash(fs.readFileSync(exactPacketPath))}`,
    releaseFingerprint: `sha256:${hash(fs.readFileSync(releasePackagePath))}`,
    contentJudgeBundleDigest,
    generatorVersion,
  }), "utf8");
  const writeMockupManifest = () => fs.writeFileSync(mockupManifestPath, JSON.stringify({
    schemaVersion: "learning-v2-de-owner-mockup-candidate.v1",
    targetLanguage: "de",
    sessionId: "de_l01_s02",
    releaseAttemptId,
    authoredRuDigest: `sha256:${hash(fs.readFileSync(authoredRuPath))}`,
    authoredUkDigest: `sha256:${hash(fs.readFileSync(authoredUkPath))}`,
    blueprintFingerprint: `sha256:${hash(fs.readFileSync(blueprintPath))}`,
    packetFingerprint: `sha256:${hash(fs.readFileSync(exactPacketPath))}`,
    releaseFingerprint: `sha256:${hash(fs.readFileSync(releasePackagePath))}`,
    mockupFingerprint: `sha256:${hash(fs.readFileSync(mockupPath))}`,
    contentJudgeBundleDigest,
    generatorVersion,
  }), "utf8");

  const manifest = {
    schemaVersion: "learning-v2-de-requirements.v1",
    targetLanguage: "de",
    interfaceLocales: ["ru", "uk"],
    sourceDocuments: [{
      sourcePath: "repo/instruction.md",
      sha256: hash("instruction-v1"),
    }],
    requirements: [{
      id: "DE-TEST-001",
      sourcePath: "repo/instruction.md",
      sourceSection: "instruction-v1",
      phase: ["PRE_AUTHOR", "POST_AUTHOR", "RELEASE_PROJECTION"],
      applicability: "always",
      severity: "HOLD",
      assertion: "Read the exact instruction.",
      family: "work_method",
    }],
  };

  const input = {
    manifest,
    roots: { repoRoot, desktopCodexRoot },
    sessionId: "de_l01_s02",
    phase: "PRE_AUTHOR",
    applicability: "teaching",
    blueprintPath,
    exactPacketPath,
    previousReleasedPaths: [previousRuPath, previousUkPath],
    previousReleaseReceiptPaths: [previousReleaseReceiptPath],
    createdAt: "2026-09-19T10:00:00.000Z",
  };
  const instructionSetDigest = buildRecenterPack(input).instructionSetDigest;
  writeContentJudgeReceipts(instructionSetDigest);
  writeReleasePackage();
  writeMockup();
  writeReleaseManifest();
  writeMockupManifest();

  return {
    root,
    input,
    manifest,
    instructionPath,
    exactPacketPath,
    previousRuPath,
    previousReleaseReceiptPath,
    authoredRuPath,
    authoredUkPath,
    mockupPath,
    mockupManifestPath,
    releasePackagePath,
    releaseManifestPath,
    judgeReceiptPaths,
    attemptHistoryRoot,
    writeReleaseManifest,
    writeMockupManifest,
    writeReleasePackage,
    writeMockup,
  };
}

test("pack reads source bytes at invocation and records normalized content evidence", () => {
  const fx = fixture();
  try {
    const first = buildRecenterPack(fx.input);
    assert.equal(first.schemaVersion, "learning-v2-recenter-pack.v1");
    assert.equal(first.targetLanguage, "de");
    assert.equal(first.sessionId, "de_l01_s02");
    assert.equal(first.phase, "PRE_AUTHOR");
    assert.equal(first.sources.length, 1);
    assert.equal(first.sources[0].path, path.resolve(fx.instructionPath));
    assert.equal(first.sources[0].bytes, Buffer.byteLength("instruction-v1"));
    assert.equal(first.sources[0].sha256, `sha256:${hash("instruction-v1")}`);
    assert.equal(first.sources[0].content, "instruction-v1");
    assert.equal(first.blueprint.content, "blueprint-v1");
    assert.equal(first.exactPacket.content, "packet-v1");
    assert.equal(first.previousReleased.length, 2);
    assert.equal(first.previousReleased[0].content.startsWith("previous-"), true);

    fs.writeFileSync(fx.instructionPath, "instruction-v2", "utf8");
    const updatedManifest = structuredClone(fx.manifest);
    updatedManifest.sourceDocuments[0].sha256 = hash("instruction-v2");
    updatedManifest.requirements[0].sourceSection = "instruction-v2";
    const second = buildRecenterPack({ ...fx.input, manifest: updatedManifest });
    assert.notEqual(second.instructionSetDigest, first.instructionSetDigest);
    assert.equal(second.sources[0].content, "instruction-v2");
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("missing or stale required sources produce HOLD", () => {
  const fx = fixture();
  try {
    fs.rmSync(fx.instructionPath);
    assert.throws(
      () => buildRecenterPack(fx.input),
      /recenter_pack_hold:source_missing/u,
    );
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("packet and previous release bytes are part of pack identity", () => {
  const fx = fixture();
  try {
    const first = buildRecenterPack(fx.input);
    fs.writeFileSync(fx.exactPacketPath, "packet-v2", "utf8");
    const packetChanged = buildRecenterPack(fx.input);
    assert.notEqual(packetChanged.packetFingerprint, first.packetFingerprint);
    assert.notEqual(packetChanged.packDigest, first.packDigest);

    fs.writeFileSync(fx.previousRuPath, "previous-ru-v2", "utf8");
    const historyChanged = buildRecenterPack(fx.input);
    assert.notEqual(
      historyChanged.previousReleasedRangeDigest,
      packetChanged.previousReleasedRangeDigest,
    );
    assert.notEqual(historyChanged.packDigest, packetChanged.packDigest);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("every prior German session requires exact RU and UK released evidence", () => {
  const fx = fixture();
  try {
    assert.throws(
      () => buildRecenterPack({
        ...fx.input,
        sessionId: "de_l01_s09",
        previousReleasedPaths: [],
      }),
      /recenter_pack_hold:previous_release_range_incomplete/u,
    );
    assert.throws(
      () => buildRecenterPack({
        ...fx.input,
        previousReleasedPaths: [fx.previousRuPath, fx.previousRuPath],
      }),
      /recenter_pack_hold:previous_release_identity_invalid/u,
    );
    assert.throws(
      () => buildRecenterPack({ ...fx.input, previousReleaseReceiptPaths: [] }),
      /recenter_pack_hold:previous_release_receipts_incomplete/u,
    );
    assert.throws(
      () => buildRecenterPack({
        ...fx.input,
        blueprintPath: fx.instructionPath,
      }),
      /recenter_pack_hold:blueprint_path_invalid/u,
    );
    for (const sessionId of ["de_l00_s01", "de_l33_s01", "de_l01_s00", "de_l01_s57"]) {
      assert.throws(
        () => buildRecenterPack({ ...fx.input, sessionId }),
        /recenter_pack_hold:session_id_invalid/u,
      );
    }
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("POST_AUTHOR is bound to exact RU and UK authored bytes", () => {
  const fx = fixture();
  try {
    assert.throws(
      () => buildRecenterPack({ ...fx.input, phase: "POST_AUTHOR" }),
      /recenter_pack_hold:post_author_locales_required/u,
    );

    const post = buildRecenterPack({
      ...fx.input,
      phase: "POST_AUTHOR",
      authoredLocalePaths: {
        ru: fx.authoredRuPath,
        uk: fx.authoredUkPath,
      },
    });
    assert.equal(post.authoredRuDigest, `sha256:${hash("authored-ru-v1")}`);
    assert.equal(post.authoredUkDigest, `sha256:${hash("authored-uk-v1")}`);

    fs.writeFileSync(fx.authoredUkPath, "authored-uk-v2", "utf8");
    const changed = buildRecenterPack({
      ...fx.input,
      phase: "POST_AUTHOR",
      authoredLocalePaths: {
        ru: fx.authoredRuPath,
        uk: fx.authoredUkPath,
      },
    });
    assert.notEqual(changed.packDigest, post.packDigest);
    assert.notEqual(changed.authoredUkDigest, post.authoredUkDigest);
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("RELEASE_PROJECTION requires exact German release and mockup for this attempt", () => {
  const fx = fixture();
  try {
    const base = {
      ...fx.input,
      phase: "RELEASE_PROJECTION",
      applicability: "release",
      authoredLocalePaths: { ru: fx.authoredRuPath, uk: fx.authoredUkPath },
      releaseAttemptId,
      releasePackagePath: fx.releasePackagePath,
      releaseManifestPath: fx.releaseManifestPath,
      mockupPath: fx.mockupPath,
      mockupManifestPath: fx.mockupManifestPath,
    };
    assert.throws(
      () => buildRecenterPack({ ...base, mockupPath: undefined }),
      /recenter_pack_hold:release_projection_artifacts_required/u,
    );
    assert.throws(
      () => buildRecenterPack({ ...base, releaseAttemptId: "not-an-attempt" }),
      /recenter_pack_hold:release_attempt_id_invalid/u,
    );
    assert.throws(
      () => buildRecenterPack({ ...base, mockupPath: fx.authoredRuPath }),
      /recenter_pack_hold:mockup_path_invalid/u,
    );
    assert.throws(
      () => buildRecenterPack({ ...base, applicability: "teaching" }),
      /recenter_pack_hold:release_projection_applicability_invalid/u,
    );
    fs.writeFileSync(fx.mockupPath, "<html>stale-or-edited</html>", "utf8");
    assert.throws(
      () => buildRecenterPack(base),
      /recenter_pack_hold:mockup_manifest_mockup_fingerprint_mismatch/u,
    );
    fx.writeMockup();
    fx.writeMockupManifest();
    const release = buildRecenterPack(base);
    assert.equal(release.releaseAttemptId, releaseAttemptId);
    assert.equal(release.releaseFingerprint, `sha256:${hash(fs.readFileSync(fx.releasePackagePath))}`);
    assert.equal(release.mockupFingerprint, `sha256:${hash(fs.readFileSync(fx.mockupPath))}`);

    fs.writeFileSync(fx.authoredUkPath, "authored-uk-v2", "utf8");
    assert.throws(
      () => buildRecenterPack(base),
      /recenter_pack_hold:(content_judge_receipt|release_manifest)_authored_uk_digest_mismatch/u,
    );

    fs.writeFileSync(fx.authoredUkPath, "authored-uk-v1", "utf8");
    fx.writeReleaseManifest();
    fx.writeMockupManifest();
    fs.rmSync(fx.judgeReceiptPaths[0]);
    assert.throws(
      () => buildRecenterPack(base),
      /recenter_pack_hold:content_judge_receipt_missing/u,
    );
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("RELEASE_PROJECTION rejects reused attempt IDs and wrong German namespaces", () => {
  const fx = fixture();
  try {
    const base = {
      ...fx.input,
      phase: "RELEASE_PROJECTION",
      applicability: "release",
      authoredLocalePaths: { ru: fx.authoredRuPath, uk: fx.authoredUkPath },
      releaseAttemptId,
      releasePackagePath: fx.releasePackagePath,
      releaseManifestPath: fx.releaseManifestPath,
      mockupPath: fx.mockupPath,
      mockupManifestPath: fx.mockupManifestPath,
    };
    assert.throws(
      () => buildRecenterPack({
        ...base,
        mockupPath: path.join(fx.input.roots.repoRoot, "content/learning-v2-course/mockup/index.html"),
      }),
      /recenter_pack_hold:mockup_path_invalid/u,
    );
    assert.throws(
      () => buildRecenterPack({
        ...base,
        releasePackagePath: base.releasePackagePath.replace("s02", "s03"),
      }),
      /recenter_pack_hold:release_package_path_invalid/u,
    );
    fs.mkdirSync(fx.attemptHistoryRoot, { recursive: true });
    fs.writeFileSync(path.join(fx.attemptHistoryRoot, `${releaseAttemptId}.receipt.json`), JSON.stringify({
      releaseAttemptId,
      status: "PASS",
    }), "utf8");
    assert.throws(
      () => buildRecenterPack(base),
      /recenter_pack_hold:release_attempt_id_reused/u,
    );
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("RELEASE_PROJECTION rejects unbound or English mockup bytes even at the German path", () => {
  const fx = fixture();
  try {
    const base = {
      ...fx.input,
      phase: "RELEASE_PROJECTION",
      applicability: "release",
      authoredLocalePaths: { ru: fx.authoredRuPath, uk: fx.authoredUkPath },
      releaseAttemptId,
      releasePackagePath: fx.releasePackagePath,
      releaseManifestPath: fx.releaseManifestPath,
      mockupPath: fx.mockupPath,
      mockupManifestPath: fx.mockupManifestPath,
    };
    fs.writeFileSync(fx.mockupPath, "<html lang=\"en\">English unrelated page</html>", "utf8");
    fx.writeMockupManifest();
    assert.throws(
      () => buildRecenterPack(base),
      /recenter_pack_hold:mockup_projection_missing/u,
    );

    fx.writeMockup();
    fx.writeMockupManifest();
    const releaseValue = JSON.parse(fs.readFileSync(fx.releasePackagePath, "utf8"));
    releaseValue.interfaceLocales = ["ru"];
    fs.writeFileSync(fx.releasePackagePath, JSON.stringify(releaseValue), "utf8");
    fx.writeReleaseManifest();
    fx.writeMockup();
    fx.writeMockupManifest();
    assert.throws(
      () => buildRecenterPack(base),
      /recenter_pack_hold:release_package_interface_locales_mismatch/u,
    );

    fx.writeReleasePackage();
    fx.writeReleaseManifest();
    fx.writeMockup();
    fx.writeMockupManifest();
    const emptyPayload = JSON.parse(fs.readFileSync(fx.releasePackagePath, "utf8"));
    emptyPayload.payload = { ru: {}, uk: {} };
    fs.writeFileSync(fx.releasePackagePath, JSON.stringify(emptyPayload), "utf8");
    fx.writeReleaseManifest();
    fx.writeMockup();
    fx.writeMockupManifest();
    assert.throws(
      () => buildRecenterPack(base),
      /recenter_pack_hold:release_package_payload_ru_empty/u,
    );
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("RELEASE_PROJECTION binds attempt ID and rendered RU+UK payload to HTML bytes", () => {
  const fx = fixture();
  try {
    const base = {
      ...fx.input,
      phase: "RELEASE_PROJECTION",
      applicability: "release",
      authoredLocalePaths: { ru: fx.authoredRuPath, uk: fx.authoredUkPath },
      releaseAttemptId,
      releasePackagePath: fx.releasePackagePath,
      releaseManifestPath: fx.releaseManifestPath,
      mockupPath: fx.mockupPath,
      mockupManifestPath: fx.mockupManifestPath,
    };

    const changedHtml = fs.readFileSync(fx.mockupPath, "utf8")
      .replace("RU intro", "unbound rendered text");
    fs.writeFileSync(fx.mockupPath, changedHtml, "utf8");
    fx.writeMockupManifest();
    assert.throws(
      () => buildRecenterPack(base),
      /recenter_pack_hold:mockup_rendered_payload_mismatch/u,
    );

    fx.writeMockup();
    const nextAttemptId = "9aa4d43a-bf27-4b0a-a37e-ea8f9f42f60a";
    for (const manifestPath of [fx.releaseManifestPath, fx.mockupManifestPath]) {
      const value = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      value.releaseAttemptId = nextAttemptId;
      if (manifestPath === fx.mockupManifestPath) {
        value.mockupFingerprint = digest(fs.readFileSync(fx.mockupPath));
      }
      fs.writeFileSync(manifestPath, JSON.stringify(value), "utf8");
    }
    assert.throws(
      () => buildRecenterPack({ ...base, releaseAttemptId: nextAttemptId }),
      /recenter_pack_hold:mockup_projection_release_attempt_id_mismatch/u,
    );
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("RELEASE_PROJECTION rejects judge PASS after any instruction-set change", () => {
  const fx = fixture();
  try {
    fs.writeFileSync(fx.instructionPath, "instruction-v1 updated", "utf8");
    fx.manifest.sourceDocuments[0].sha256 = hash("instruction-v1 updated");
    const base = {
      ...fx.input,
      phase: "RELEASE_PROJECTION",
      applicability: "release",
      authoredLocalePaths: { ru: fx.authoredRuPath, uk: fx.authoredUkPath },
      releaseAttemptId,
      releasePackagePath: fx.releasePackagePath,
      releaseManifestPath: fx.releaseManifestPath,
      mockupPath: fx.mockupPath,
      mockupManifestPath: fx.mockupManifestPath,
    };
    assert.throws(
      () => buildRecenterPack(base),
      /recenter_pack_hold:content_judge_receipt_instruction_set_digest_mismatch/u,
    );
  } finally {
    fs.rmSync(fx.root, { recursive: true, force: true });
  }
});

test("all recenter judge prompts require one content-addressed row per requirement", () => {
  const promptRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "prompts");
  for (const name of [
    "judge_recenter_pre.md",
    "judge_recenter_post.md",
    "judge_recenter_release.md",
  ]) {
    const prompt = fs.readFileSync(path.join(promptRoot, name), "utf8");
    assert.match(prompt, /ровно одна строка `requirementResults`/u);
    assert.match(prompt, /evidence/u);
    assert.match(prompt, /NOT_APPLICABLE/u);
    assert.match(prompt, /content-addressed evidence/u);
    if (name === "judge_recenter_release.md") {
      assert.match(prompt, /German owner mockup/u);
      assert.match(prompt, /mockupFingerprint/u);
      assert.match(prompt, /releaseAttemptId/u);
    }
  }
});

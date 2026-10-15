import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  buildSessionCandidateReceiptForWrite,
  prepareSessionCandidateSnapshot,
  writeSessionCandidateEvidence,
} from "./build_session_candidate_receipt.mjs";
import { runFrozenV2SemanticGate } from "./session_candidate_projection_parity.mjs";
import { computeV2ToolchainClosure } from "./session_candidate_toolchain_closure.mjs";

const REPO = path.resolve(import.meta.dirname, "../../..");
const OUTPUTS = path.join(REPO, "content/learning-v2-course/outputs");
const S01_MANIFEST = "content/learning-v2-course/sessions/en/l01/s01/owner-review-preview-manifest.json";
const S02_MANIFEST = "content/learning-v2-course/sessions/en/l01/s02/owner-review-preview-manifest.json";
const APPROVED_FINGERPRINT = "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da";
const S02_PACKET_SHA256 = "6686bac631ede28475f122b1992d6ac265aabf02ca26cc376ce9ba23fc4639c1";

function read(relative) {
  return JSON.parse(fs.readFileSync(path.join(REPO, ...relative.split("/")), "utf8"));
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function makeCandidate(t, interactionCount) {
  const candidateRoot = path.join(OUTPUTS, `s02-v2-contract-test-${process.pid}-${Date.now()}-${interactionCount}`);
  t.after(() => fs.rmSync(candidateRoot, { recursive: true, force: true }));
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s02-source-"));
  t.after(() => fs.rmSync(sourceRoot, { recursive: true, force: true }));
  const sourceSession = path.join(sourceRoot, "en/l01/s02");
  fs.mkdirSync(sourceSession, { recursive: true });
  for (const name of ["final.ru.md", "final.uk.md", "locales_batch.md", "practice.atomic.json"]) {
    fs.copyFileSync(path.join(REPO, "content/learning-v2-course/sessions/en/l01/s02", name), path.join(sourceSession, name));
  }
  const build = spawnSync(process.execPath, [
    path.join(REPO, "content/learning-v2-course/pipeline/build_release.mjs"),
    "--session", "en/l01/s02",
    "--locales", "ru,uk",
    "--source-root", sourceRoot,
    "--out", candidateRoot,
    "--candidate-preview",
    "--v2-omit-legacy-explanation-sidecar",
  ], { cwd: REPO, encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr || build.stdout);
  if (interactionCount !== 17) {
    const projectionRoot = path.join(candidateRoot, "en/l01/s02");
    for (const name of ["learner.json", "learner.uk.json"]) {
      const document = read(path.relative(REPO, path.join(projectionRoot, name)).split(path.sep).join("/"));
      const template = document.interactions.at(-1);
      while (document.interactions.length < interactionCount) {
        const ordinal = document.interactions.length + 1;
        document.interactions.push({ ...template, interactionId: `en:lesson-01:session-02:i${String(ordinal).padStart(2, "0")}` });
      }
      document.practiceInteractionCount = interactionCount;
      writeJson(path.join(projectionRoot, name), document);
    }
    const answers = read(path.relative(REPO, path.join(projectionRoot, "answers.json")).split(path.sep).join("/"));
    const template = answers.at(-1);
    while (answers.length < interactionCount) {
      const ordinal = answers.length + 1;
      answers.push({ ...template, interactionId: `en:lesson-01:session-02:i${String(ordinal).padStart(2, "0")}` });
    }
    writeJson(path.join(projectionRoot, "answers.json"), answers);
  }
  return candidateRoot;
}

function bindings(candidateRoot) {
  const s01 = read(S01_MANIFEST);
  const s02 = read(S02_MANIFEST);
  return {
    repoRoot: REPO,
    session: "en/l01/s02",
    candidateRoot,
    receiptSchemaVersion: "v2",
    predecessorReceiptPath: s01.candidateReceiptPath,
    acceptedPredecessorReceiptPath: s01.acceptanceReceiptPath,
    revisionPredecessorReceiptPath: s02.candidateReceiptPath,
    ownerReviewManifestPath: S02_MANIFEST,
  };
}

test("v2 candidate preview explicitly omits a stale legacy explanation sidecar without weakening strict builds", (t) => {
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s02-v2-sidecar-source-"));
  const strictOutput = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s02-v2-sidecar-strict-"));
  const v2Output = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s02-v2-sidecar-v2-"));
  const cleanOutput = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s02-v2-sidecar-clean-"));
  for (const directory of [sourceRoot, strictOutput, v2Output, cleanOutput]) {
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  }
  const sourceSession = path.join(sourceRoot, "en/l01/s02");
  fs.mkdirSync(sourceSession, { recursive: true });
  for (const name of ["final.ru.md", "final.uk.md", "locales_batch.md", "practice.atomic.json"]) {
    fs.copyFileSync(path.join(REPO, "content/learning-v2-course/sessions/en/l01/s02", name), path.join(sourceSession, name));
  }
  fs.writeFileSync(path.join(sourceSession, "practice.explanations.v1.json"), `${JSON.stringify({
    schemaVersion: "stale_legacy_sidecar_SHOULD_NOT_LEAK",
  })}\n`);

  const buildScript = path.join(REPO, "content/learning-v2-course/pipeline/build_release.mjs");
  const build = (out, extra = []) => spawnSync(process.execPath, [
    buildScript,
    "--session", "en/l01/s02",
    "--locales", "ru,uk",
    "--source-root", sourceRoot,
    "--out", out,
    "--candidate-preview",
    ...extra,
  ], { cwd: REPO, encoding: "utf8" });

  const strict = build(strictOutput);
  assert.notEqual(strict.status, 0);
  assert.match(strict.stderr || strict.stdout, /practice_explanations_v1_hold/u);

  const v2 = build(v2Output, ["--v2-omit-legacy-explanation-sidecar"]);
  assert.equal(v2.status, 0, v2.stderr || v2.stdout);

  fs.rmSync(path.join(sourceSession, "practice.explanations.v1.json"));
  const clean = build(cleanOutput);
  assert.equal(clean.status, 0, clean.stderr || clean.stdout);

  const projectionNames = ["answers.json", "auxiliary.json", "intro.json", "learner.json", "learner.uk.json"];
  const v2Session = path.join(v2Output, "en/l01/s02");
  const cleanSession = path.join(cleanOutput, "en/l01/s02");
  assert.deepEqual(fs.readdirSync(v2Session).sort(), projectionNames);
  let serializedProjection = "";
  for (const name of projectionNames) {
    const v2Bytes = fs.readFileSync(path.join(v2Session, name));
    const cleanBytes = fs.readFileSync(path.join(cleanSession, name));
    assert.deepEqual(v2Bytes, cleanBytes, `${name} must be byte-identical to a source snapshot without the legacy sidecar`);
    assert.doesNotMatch(v2Bytes.toString("utf8"), /SHOULD_NOT_LEAK/u);
    serializedProjection += v2Bytes.toString("utf8");
  }
  assert.doesNotMatch(serializedProjection, /response(?:Analysis|Diagnostics)ById/u);
  assert.match(fs.readFileSync(path.join(v2Session, "learner.json"), "utf8"), /feedbackByLocale/u,
    "atomic wrong-answer feedback remains in the learner projection");

  const ordinaryReleaseAttempt = spawnSync(process.execPath, [
    buildScript,
    "--session", "en/l01/s02",
    "--locales", "ru,uk",
    "--source-root", sourceRoot,
    "--out", v2Output,
    "--v2-omit-legacy-explanation-sidecar",
  ], { cwd: REPO, encoding: "utf8" });
  assert.notEqual(ordinaryReleaseAttempt.status, 0);
  assert.match(ordinaryReleaseAttempt.stderr || ordinaryReleaseAttempt.stdout, /v2_explanation_omission_requires_candidate_preview/u);

  const sourceReleaseCheckAttempt = spawnSync(process.execPath, [
    buildScript,
    "--session", "en/l01/s02",
    "--locales", "ru,uk",
    "--check-source-release",
    "--v2-omit-legacy-explanation-sidecar",
  ], { cwd: REPO, encoding: "utf8" });
  assert.notEqual(sourceReleaseCheckAttempt.status, 0);
  assert.match(sourceReleaseCheckAttempt.stderr || sourceReleaseCheckAttempt.stdout,
    /v2_explanation_omission_requires_candidate_preview/u);

  const s01Attempt = spawnSync(process.execPath, [
    buildScript,
    "--session", "en/l01/s01",
    "--locales", "ru,uk",
    "--source-root", sourceRoot,
    "--out", v2Output,
    "--candidate-preview",
    "--v2-omit-legacy-explanation-sidecar",
  ], { cwd: REPO, encoding: "utf8" });
  assert.notEqual(s01Attempt.status, 0);
  assert.match(s01Attempt.stderr || s01Attempt.stdout, /v2_explanation_omission_session_scope:en\/l01\/s01/u);
});

test("revised S02 v2 derives 3/17 from the verified d956 packet and binds the full revision chain", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const receipt = await buildSessionCandidateReceiptForWrite(options);

  assert.equal(receipt.schemaVersion, "learning_v2_session_candidate_content_receipt_v2");
  assert.deepEqual(receipt.projection, { fileCount: 5, introPages: 3, practiceInteractions: 17 });
  assert.deepEqual(receipt.blueprintAuthority, {
    schemaVersion: "learning_v2_blueprint_authoring_contract_v2",
    blueprintFingerprint: APPROVED_FINGERPRINT,
    sessionPacketSha256: S02_PACKET_SHA256,
    introPlanItemCount: 3,
    activityPlanItemCount: 17,
  });
  assert.equal(receipt.frozenPredecessor.receiptPath, read(S01_MANIFEST).candidateReceiptPath);
  assert.equal(receipt.acceptedPredecessor.acceptanceReceiptPath, read(S01_MANIFEST).acceptanceReceiptPath);
  assert.equal(receipt.frozenRevisionPredecessor.receiptPath, read(S02_MANIFEST).candidateReceiptPath);
  assert.equal(Object.hasOwn(receipt, "frozenOwnerReviewHead"), false);
  assert.equal(receipt.files.some((entry) => entry.path.endsWith("/practice.explanations.v1.json")), false);

  const snapshotOrigins = read(receipt.sourceSnapshot.indexPath).entries.map((entry) => entry.originalPath);
  for (const required of [
    "modules/learning-v2/curriculum/en/course_blueprint_en_v2.ts",
    "modules/learning-v2/curriculum/en/course_blueprint_manifest_en_v2.ts",
    "modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2.ts",
    "content/learning-v2-course/judgements/owner/2026-10-14_english_blueprint_d956_approval.md",
    "content/learning-v2-course/pipeline/l01s02_d956_packet.test.mjs",
    "content/learning-v2-course/pipeline/l01s02_feedback_repair.test.mjs",
    "content/learning-v2-course/pipeline/audit_actor_clarity.mjs",
    "content/learning-v2-course/pipeline/authoring_admission.mjs",
    "content/learning-v2-course/pipeline/session_acceptance_receipt_v2.test.mjs",
    "modules/learning-v2/content/learner_visible_text_v1.js",
  ]) assert.ok(snapshotOrigins.includes(required), `v2 snapshot binds ${required}`);
  assert.ok(snapshotOrigins.includes("content/learning-v2-course/curriculum/en/ПЛАН_КУРСА.md"), "legacy plan remains historical evidence");
  const index = read(receipt.sourceSnapshot.indexPath);
  assert.equal(index.entries.find((entry) => entry.originalPath.endsWith("/ПЛАН_КУРСА.md"))?.category, "historical_evidence");
});

test("revised S02 v2 rejects a legacy 21-interaction projection", async (t) => {
  const candidateRoot = makeCandidate(t, 21);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  await assert.rejects(
    buildSessionCandidateReceiptForWrite(options),
    /candidate_practice_inventory_mismatch:learner\.json/u,
  );
});

test("revised S02 v2 rejects a structurally valid projection that is not the deterministic source build", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const auxiliaryPath = path.join(candidateRoot, "en/l01/s02/auxiliary.json");
  const auxiliary = JSON.parse(fs.readFileSync(auxiliaryPath, "utf8"));
  writeJson(auxiliaryPath, { ...auxiliary, injectedArbitraryField: true });
  await assert.rejects(
    buildSessionCandidateReceiptForWrite(options),
    /candidate_projection_byte_mismatch:auxiliary\.json/u,
  );
});

test("revised S02 v2 requires accepted S01, frozen S01, and old S02 revision without making the mutable owner head authoritative", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  for (const missing of [
    "predecessorReceiptPath",
    "acceptedPredecessorReceiptPath",
    "revisionPredecessorReceiptPath",
  ]) {
    const incomplete = { ...options };
    delete incomplete[missing];
    await assert.rejects(buildSessionCandidateReceiptForWrite(incomplete), /required/u, missing);
  }
  const withoutMutableOwnerHead = { ...options };
  delete withoutMutableOwnerHead.ownerReviewManifestPath;
  const receipt = await buildSessionCandidateReceiptForWrite(withoutMutableOwnerHead);
  assert.equal(Object.hasOwn(receipt, "frozenOwnerReviewHead"), false);
});

test("revised S02 v2 rejects a projection directory junction", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const projectionRoot = path.join(candidateRoot, "en/l01/s02");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s02-projection-junction-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.cpSync(projectionRoot, outside, { recursive: true });
  fs.rmSync(projectionRoot, { recursive: true, force: true });
  fs.symlinkSync(outside, projectionRoot, "junction");
  await assert.rejects(buildSessionCandidateReceiptForWrite(options), /candidate_projection_.*(?:linked_component|path_outside_root)/u);
});

test("revised S02 v2 rejects a source snapshot junction", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const snapshotSession = path.join(candidateRoot, "source-snapshot/content/learning-v2-course/sessions/en/l01/s02");
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-s02-snapshot-junction-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.cpSync(snapshotSession, outside, { recursive: true });
  fs.rmSync(snapshotSession, { recursive: true, force: true });
  fs.symlinkSync(outside, snapshotSession, "junction");
  await assert.rejects(buildSessionCandidateReceiptForWrite(options), /candidate_snapshot_file_(?:linked_component|path_outside_root)/u);
});

test("v2 publication never overwrites a changed mutable owner pointer and writes its immutable head before the receipt", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const ownerDirectory = path.join(candidateRoot, "owner-head");
  fs.mkdirSync(ownerDirectory, { recursive: true });
  const ownerManifest = path.join(ownerDirectory, "manifest.json");
  fs.copyFileSync(path.join(REPO, ...S02_MANIFEST.split("/")), ownerManifest);
  const options = {
    ...bindings(candidateRoot),
    ownerReviewManifestPath: path.relative(REPO, ownerManifest).split(path.sep).join("/"),
  };
  let pointerBytesAfterConcurrentChange;
  const receipt = await writeSessionCandidateEvidence({
    ...options,
    beforeV2ReceiptCommit: ({ immutableHeadPath, receiptPath }) => {
      assert.equal(fs.existsSync(immutableHeadPath), true, "immutable private head is published first");
      assert.equal(fs.existsSync(receiptPath), false, "content receipt is the final publication record");
      pointerBytesAfterConcurrentChange = `${fs.readFileSync(ownerManifest, "utf8")} `;
      fs.writeFileSync(ownerManifest, pointerBytesAfterConcurrentChange);
    },
  });
  assert.equal(fs.readFileSync(ownerManifest, "utf8"), pointerBytesAfterConcurrentChange);
  const receiptPath = path.join(candidateRoot, "content-receipt.json");
  const receiptSha256 = (await import("node:crypto")).createHash("sha256").update(fs.readFileSync(receiptPath)).digest("hex");
  const immutableHeadPath = path.join(candidateRoot, "private-heads", `${receiptSha256}.json`);
  const immutableHead = JSON.parse(fs.readFileSync(immutableHeadPath, "utf8"));
  assert.equal(immutableHead.contentReceiptSha256, receiptSha256);
  assert.equal(immutableHead.candidateBundleSha256, receipt.candidateBundleSha256);
});

test("v2 publication ignores a mutable owner pointer even when its parent is a junction", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-owner-head-junction-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.copyFileSync(path.join(REPO, ...S02_MANIFEST.split("/")), path.join(outside, "manifest.json"));
  const ownerDirectory = path.join(candidateRoot, "owner-head-link");
  fs.symlinkSync(outside, ownerDirectory, "junction");
  const receipt = await writeSessionCandidateEvidence({
    ...bindings(candidateRoot),
    ownerReviewManifestPath: path.relative(REPO, path.join(ownerDirectory, "manifest.json")).split(path.sep).join("/"),
  });
  assert.equal(receipt.schemaVersion, "learning_v2_session_candidate_content_receipt_v2");
});

test("v2 publication rejects a private-heads junction before writing outside the candidate", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-private-heads-junction-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, path.join(candidateRoot, "private-heads"), "junction");

  await assert.rejects(
    writeSessionCandidateEvidence(bindings(candidateRoot)),
    /candidate_immutable_private_heads_(?:linked_component|path_outside_root)/u,
  );
  assert.deepEqual(fs.readdirSync(outside), [], "a rejected head parent must receive no files");
  assert.equal(fs.existsSync(path.join(candidateRoot, "content-receipt.json")), false);
});

test("v2 publication rejects a private-heads junction swapped in immediately before exclusive open", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-private-heads-race-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  let swapped = false;

  await assert.rejects(
    writeSessionCandidateEvidence({
      ...bindings(candidateRoot),
      beforeV2PrivateHeadOpen: ({ parentPath }) => {
        const displaced = `${parentPath}.displaced`;
        fs.renameSync(parentPath, displaced);
        fs.symlinkSync(outside, parentPath, "junction");
        swapped = true;
      },
    }),
    /candidate_immutable_private_head_parent_(?:linked_component|path_outside_root|changed)/u,
  );
  assert.equal(swapped, true, "the deterministic race hook ran");
  assert.deepEqual(fs.readdirSync(outside), [], "the swapped external directory receives no file");
  assert.equal(fs.existsSync(path.join(candidateRoot, "content-receipt.json")), false);
});

test("v2 publication revalidates the opened private head before writing any content", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-private-head-open-race-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const displaced = path.join(candidateRoot, "private-heads.displaced");
  let swapped = false;

  await assert.rejects(
    writeSessionCandidateEvidence({
      ...bindings(candidateRoot),
      afterV2PrivateHeadOpenBeforeWrite: ({ parentPath }) => {
        swapped = true;
        fs.renameSync(parentPath, displaced);
        fs.symlinkSync(outside, parentPath, "junction");
      },
    }),
    /(?:candidate_immutable_private_head_(?:path_invalid|path_outside_repo|changed)|EPERM)/u,
  );
  assert.equal(swapped, true, "the deterministic post-open race hook attempted the swap");
  assert.deepEqual(fs.readdirSync(outside), [], "the swapped external directory receives no file");
  const openedDirectory = fs.existsSync(displaced) ? displaced : path.join(candidateRoot, "private-heads");
  const openedFiles = fs.readdirSync(openedDirectory).map((name) => path.join(openedDirectory, name));
  assert.equal(openedFiles.length, 1);
  assert.equal(fs.statSync(openedFiles[0]).size, 0, "the opened file is rejected before content bytes are written");
});

for (const race of [
  { name: "review manifest", hook: "beforeV2ManifestOpen", error: "candidate_review_manifest_parent" },
  { name: "content receipt", hook: "beforeV2ContentReceiptOpen", error: "candidate_content_receipt_parent" },
]) {
  test(`v2 publication rejects a candidate-root junction swapped before ${race.name} open`, async (t) => {
    const candidateRoot = makeCandidate(t, 17);
    const displaced = `${candidateRoot}.displaced`;
    t.after(() => fs.rmSync(displaced, { recursive: true, force: true }));
    const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-publication-race-"));
    t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
    let swapped = false;

    await assert.rejects(
      writeSessionCandidateEvidence({
        ...bindings(candidateRoot),
        [race.hook]: () => {
          fs.renameSync(candidateRoot, displaced);
          fs.symlinkSync(outside, candidateRoot, "junction");
          swapped = true;
        },
      }),
      new RegExp(`${race.error}_(?:linked_component|path_outside_root|changed)`, "u"),
    );
    assert.equal(swapped, true, "the deterministic race hook ran");
    assert.deepEqual(fs.readdirSync(outside), [], "the swapped external directory receives no file");
  });
}

test("v2 snapshot rejects a source-snapshot junction swapped in immediately before file publication", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-snapshot-race-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  let swapped = false;

  await assert.rejects(
    prepareSessionCandidateSnapshot({
      ...bindings(candidateRoot),
      beforeV2SnapshotFileCommit: ({ snapshotRoot }) => {
        if (swapped) return;
        const displaced = `${snapshotRoot}.displaced`;
        fs.renameSync(snapshotRoot, displaced);
        fs.symlinkSync(outside, snapshotRoot, "junction");
        swapped = true;
      },
    }),
    /candidate_snapshot_file_parent_(?:linked_component|path_outside_root|changed)/u,
  );
  assert.equal(swapped, true, "the deterministic race hook ran");
  assert.deepEqual(fs.readdirSync(outside), [], "the swapped external directory receives no file");
});

test("candidate CLI accepts the explicit v2 receipt selector", () => {
  const result = spawnSync(process.execPath, [
    path.join(import.meta.dirname, "build_session_candidate_receipt.mjs"),
    "--session", "en/l01/s02",
    "--candidate", "content/learning-v2-course/outputs/s02-v2-cli-not-created",
    "--receipt-version", "v2",
  ], { cwd: REPO, encoding: "utf8" });
  assert.notEqual(result.status, 0);
  assert.doesNotMatch(result.stderr, /unknown_argument:--receipt-version/u);
});

test("frozen S02 semantic gates reject invalid snapshot A even after live source B is valid", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const indexPath = path.join(candidateRoot, "source-snapshot/index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const frozenAtomic = index.entries.find((entry) => entry.originalPath.endsWith("/practice.atomic.json"));
  assert.ok(frozenAtomic);
  const frozenAtomicPath = path.join(REPO, ...frozenAtomic.snapshotPath.split("/"));
  const invalidAtomic = JSON.parse(fs.readFileSync(frozenAtomicPath, "utf8"));
  invalidAtomic.interactionsByLocale.ru[0].family = "invalid_family_from_snapshot_a";
  fs.writeFileSync(frozenAtomicPath, `${JSON.stringify(invalidAtomic, null, 2)}\n`);
  const crypto = await import("node:crypto");
  const frozenBytes = fs.readFileSync(frozenAtomicPath);
  frozenAtomic.bytes = frozenBytes.length;
  frozenAtomic.sha256 = crypto.createHash("sha256").update(frozenBytes).digest("hex");
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  const indexSha256 = crypto.createHash("sha256").update(fs.readFileSync(indexPath)).digest("hex");

  await assert.rejects(runFrozenV2SemanticGate({
    repoRoot: REPO,
    candidateRoot: path.relative(REPO, candidateRoot).split(path.sep).join("/"),
    sourceSnapshotIndexPath: path.relative(REPO, indexPath).split(path.sep).join("/"),
    sourceSnapshotIndexSha256: indexSha256,
    check: "s02_exact_packet",
  }), /candidate_snapshot_semantic_gate_failed:s02_exact_packet/u);
});

test("frozen S02 semantic gates reject a live toolchain that differs from the receipt-bound snapshot", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const indexPath = path.join(candidateRoot, "source-snapshot/index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const frozenTool = index.entries.find((entry) => entry.originalPath.endsWith("/l01s02_feedback_repair.test.mjs"));
  assert.ok(frozenTool);
  const frozenToolPath = path.join(REPO, ...frozenTool.snapshotPath.split("/"));
  fs.appendFileSync(frozenToolPath, "\n// frozen strict toolchain A\n");
  const frozenBytes = fs.readFileSync(frozenToolPath);
  frozenTool.bytes = frozenBytes.length;
  frozenTool.sha256 = (await import("node:crypto")).createHash("sha256").update(frozenBytes).digest("hex");
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  const indexSha256 = (await import("node:crypto")).createHash("sha256").update(fs.readFileSync(indexPath)).digest("hex");

  await assert.rejects(runFrozenV2SemanticGate({
    repoRoot: REPO,
    candidateRoot: path.relative(REPO, candidateRoot).split(path.sep).join("/"),
    sourceSnapshotIndexPath: path.relative(REPO, indexPath).split(path.sep).join("/"),
    sourceSnapshotIndexSha256: indexSha256,
    check: "feedback_locale_parity",
  }), /candidate_live_toolchain_mismatch:content\/learning-v2-course\/pipeline\/l01s02_feedback_repair\.test\.mjs/u);
});

test("projection rebuild rejects a live build script that differs from the receipt-bound snapshot", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const indexPath = path.join(candidateRoot, "source-snapshot/index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const frozenTool = index.entries.find((entry) => entry.originalPath.endsWith("/build_release.mjs"));
  assert.ok(frozenTool);
  const frozenToolPath = path.join(REPO, ...frozenTool.snapshotPath.split("/"));
  fs.appendFileSync(frozenToolPath, "\n// frozen strict build A\n");
  const frozenBytes = fs.readFileSync(frozenToolPath);
  frozenTool.bytes = frozenBytes.length;
  frozenTool.sha256 = (await import("node:crypto")).createHash("sha256").update(frozenBytes).digest("hex");
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  await assert.rejects(
    buildSessionCandidateReceiptForWrite(options),
    /candidate_live_toolchain_mismatch:content\/learning-v2-course\/pipeline\/build_release\.mjs/u,
  );
});

test("projection rebuild binds transitive local dependencies such as single_phrase_release", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const indexPath = path.join(candidateRoot, "source-snapshot/index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const frozenDependency = index.entries.find((entry) => entry.originalPath.endsWith("/single_phrase_release.mjs"));
  assert.ok(frozenDependency, "transitive local dependency must be receipt-bound");
  const frozenDependencyPath = path.join(REPO, ...frozenDependency.snapshotPath.split("/"));
  fs.appendFileSync(frozenDependencyPath, "\n// frozen strict dependency A\n");
  const frozenBytes = fs.readFileSync(frozenDependencyPath);
  frozenDependency.bytes = frozenBytes.length;
  frozenDependency.sha256 = (await import("node:crypto")).createHash("sha256").update(frozenBytes).digest("hex");
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  await assert.rejects(
    buildSessionCandidateReceiptForWrite(options),
    /candidate_live_toolchain_mismatch:content\/learning-v2-course\/pipeline\/single_phrase_release\.mjs/u,
  );
});

test("projection rebuild binds the learner-visible text projector used by build_release", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const indexPath = path.join(candidateRoot, "source-snapshot/index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const dependencyPath = "modules/learning-v2/content/learner_visible_text_v1.js";
  const frozenDependency = index.entries.find((entry) => entry.originalPath === dependencyPath);
  assert.ok(frozenDependency, "learner-visible prompt projection code must be receipt-bound");
  const frozenDependencyPath = path.join(REPO, ...frozenDependency.snapshotPath.split("/"));
  fs.appendFileSync(frozenDependencyPath, "\n// frozen learner-visible projection A\n");
  const frozenBytes = fs.readFileSync(frozenDependencyPath);
  frozenDependency.bytes = frozenBytes.length;
  frozenDependency.sha256 = (await import("node:crypto")).createHash("sha256").update(frozenBytes).digest("hex");
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  await assert.rejects(
    buildSessionCandidateReceiptForWrite(options),
    /candidate_live_toolchain_mismatch:modules\/learning-v2\/content\/learner_visible_text_v1\.js/u,
  );
});

test("bound toolchain rejects a missing learner-visible text projector before execution", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const indexPath = path.join(candidateRoot, "source-snapshot/index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const dependencyPath = "modules/learning-v2/content/learner_visible_text_v1.js";
  index.entries = index.entries.filter((entry) => entry.originalPath !== dependencyPath);
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
  const indexSha256 = (await import("node:crypto")).createHash("sha256").update(fs.readFileSync(indexPath)).digest("hex");

  await assert.rejects(
    runFrozenV2SemanticGate({
      repoRoot: REPO,
      candidateRoot: path.relative(REPO, candidateRoot).split(path.sep).join("/"),
      sourceSnapshotIndexPath: path.relative(REPO, indexPath).split(path.sep).join("/"),
      sourceSnapshotIndexSha256: indexSha256,
      check: "feedback_locale_parity",
    }),
    /candidate_bound_toolchain_closure_mismatch:modules\/learning-v2\/content\/learner_visible_text_v1\.js/u,
  );
});

test("bound toolchain rejects missing and extra closure members", async (t) => {
  const candidateRoot = makeCandidate(t, 17);
  const options = bindings(candidateRoot);
  await prepareSessionCandidateSnapshot(options);
  const indexPath = path.join(candidateRoot, "source-snapshot/index.json");
  const original = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  const singlePhrasePath = "content/learning-v2-course/pipeline/single_phrase_release.mjs";
  const withoutDependency = {
    ...original,
    entries: original.entries.filter((entry) => entry.originalPath !== singlePhrasePath),
  };
  fs.writeFileSync(indexPath, `${JSON.stringify(withoutDependency, null, 2)}\n`);
  let indexSha256 = (await import("node:crypto")).createHash("sha256").update(fs.readFileSync(indexPath)).digest("hex");
  await assert.rejects(runFrozenV2SemanticGate({
    repoRoot: REPO,
    candidateRoot: path.relative(REPO, candidateRoot).split(path.sep).join("/"),
    sourceSnapshotIndexPath: path.relative(REPO, indexPath).split(path.sep).join("/"),
    sourceSnapshotIndexSha256: indexSha256,
    check: "feedback_locale_parity",
  }), /candidate_bound_toolchain_closure_mismatch:content\/learning-v2-course\/pipeline\/single_phrase_release\.mjs/u);

  const extraOriginalPath = "content/learning-v2-course/pipeline/not-an-executable-dependency.mjs";
  const extraSnapshotPath = path.join(candidateRoot, "source-snapshot", ...extraOriginalPath.split("/"));
  fs.mkdirSync(path.dirname(extraSnapshotPath), { recursive: true });
  fs.writeFileSync(extraSnapshotPath, "export const unused = true;\n");
  const extraBytes = fs.readFileSync(extraSnapshotPath);
  const withExtra = {
    ...original,
    entries: [...original.entries, {
      category: "contract",
      originalPath: extraOriginalPath,
      snapshotPath: path.relative(REPO, extraSnapshotPath).split(path.sep).join("/"),
      bytes: extraBytes.length,
      sha256: (await import("node:crypto")).createHash("sha256").update(extraBytes).digest("hex"),
    }].sort((left, right) => left.originalPath.localeCompare(right.originalPath)),
  };
  fs.writeFileSync(indexPath, `${JSON.stringify(withExtra, null, 2)}\n`);
  indexSha256 = (await import("node:crypto")).createHash("sha256").update(fs.readFileSync(indexPath)).digest("hex");
  await assert.rejects(runFrozenV2SemanticGate({
    repoRoot: REPO,
    candidateRoot: path.relative(REPO, candidateRoot).split(path.sep).join("/"),
    sourceSnapshotIndexPath: path.relative(REPO, indexPath).split(path.sep).join("/"),
    sourceSnapshotIndexSha256: indexSha256,
    check: "feedback_locale_parity",
  }), /candidate_bound_toolchain_closure_mismatch:content\/learning-v2-course\/pipeline\/not-an-executable-dependency\.mjs/u);
});

test("toolchain closure fails closed on dynamic and unresolved local imports", (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-toolchain-closure-"));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  const entry = path.join(repoRoot, "entry.mjs");
  fs.writeFileSync(entry, "const name = './dependency.mjs'; await import(name);\n");
  assert.throws(
    () => computeV2ToolchainClosure(repoRoot, ["entry.mjs"]),
    /toolchain_dynamic_import_unresolved:entry\.mjs/u,
  );
  fs.writeFileSync(entry, "import './missing.mjs';\n");
  assert.throws(
    () => computeV2ToolchainClosure(repoRoot, ["entry.mjs"]),
    /toolchain_local_import_unresolved:entry\.mjs:\.\/missing\.mjs/u,
  );
  fs.writeFileSync(entry, [
    'import { createRequire } from "node:module";',
    'const localRequire = createRequire(import.meta.url);',
    'localRequire(resolveLocalModuleAtRuntime());',
    "",
  ].join("\n"));
  assert.throws(
    () => computeV2ToolchainClosure(repoRoot, ["entry.mjs"]),
    /toolchain_dynamic_loader_unsupported:entry\.mjs/u,
  );
  fs.writeFileSync(entry, "const dependency = require.resolve('./dependency.cjs');\n");
  assert.throws(
    () => computeV2ToolchainClosure(repoRoot, ["entry.mjs"]),
    /toolchain_dynamic_loader_unsupported:entry\.mjs/u,
  );
});

for (const corruption of [
  { name: "immutable head", file: "immutableHeadPath", error: "candidate_publication_immutable_head" },
  { name: "review manifest", file: "manifestPath", error: "candidate_publication_review_manifest" },
]) {
  test(`v2 receipt-last publication rejects ${corruption.name} corruption before receipt`, async (t) => {
    const candidateRoot = makeCandidate(t, 17);
    const receiptPath = path.join(candidateRoot, "content-receipt.json");
    let hookRan = false;
    await assert.rejects(
      writeSessionCandidateEvidence({
        ...bindings(candidateRoot),
        beforeV2ReceiptCommit: (paths) => {
          hookRan = true;
          fs.appendFileSync(paths[corruption.file], "corrupt");
        },
      }),
      new RegExp(`${corruption.error}_(?:mismatch|invalid|changed)`, "u"),
    );
    assert.equal(hookRan, true);
    assert.equal(fs.existsSync(receiptPath), false, "RECEIPT_PUBLISHED must remain false");
  });
}

import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  buildSessionMachineValidationReceipt,
  buildSessionAcceptanceReceipt,
  SESSION_ACCEPTANCE_V2_REQUIRED_GATES,
  sessionAcceptanceV2CanonicalGateCommands,
  validateSessionMachineValidationReceipt,
  validateSessionAcceptanceReceipt,
} from "./session_acceptance_receipt.mjs";
import { writeSessionCandidateEvidence } from "./build_session_candidate_receipt.mjs";
import { promoteSessionCandidate } from "./promote_session_candidate.mjs";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");
const jsonBytes = (value) => Buffer.from(`${JSON.stringify(value, null, 2)}\n`);
const REQUIRED_GATES = [
  "blueprint_authority",
  "s02_exact_packet",
  "feedback_locale_parity",
  "actor_clarity",
  "candidate_build_source_projection",
  "receipt_history",
];

function write(root, relative, value) {
  const absolute = path.join(root, ...relative.split("/"));
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, Buffer.isBuffer(value) ? value : jsonBytes(value));
  return absolute;
}

function fixture(t, gateIds = REQUIRED_GATES) {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-acceptance-v2-"));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  const session = "en/l01/s02";
  const sessionId = "en:lesson-01:session-02";
  const candidateRoot = "content/learning-v2-course/outputs/s02-v2-fixture";
  const projectionNames = ["intro.json", "auxiliary.json", "learner.json", "learner.uk.json", "answers.json"];
  const localeFile = `${candidateRoot}/source-snapshot/content/learning-v2-course/sessions/${session}/locales_batch.md`;
  const indexFile = `${candidateRoot}/source-snapshot/index.json`;
  const localeBytes = Buffer.from("locale evidence\n");
  const indexBytes = jsonBytes({ schemaVersion: "learning_v2_session_source_snapshot_v2", courseSessionId: sessionId });
  const candidateEntries = projectionNames.map((name) => {
    const candidateFile = `${candidateRoot}/${session}/${name}`;
    const candidateBytes = jsonBytes(name === "answers.json"
      ? Array.from({ length: 17 }, (_, index) => ({ interactionId: `${sessionId}:i${String(index + 1).padStart(2, "0")}` }))
      : name === "intro.json"
        ? { courseSessionId: sessionId, pageCount: 3, pages: [{}, {}, {}] }
        : name.startsWith("learner")
          ? { courseSessionId: sessionId, practiceInteractionCount: 17, interactions: Array.from({ length: 17 }, (_, index) => ({ interactionId: `${sessionId}:i${String(index + 1).padStart(2, "0")}` })) }
          : { courseSessionId: sessionId });
    write(repoRoot, candidateFile, candidateBytes);
    return { category: "candidate", path: candidateFile, bytes: candidateBytes.length, sha256: sha256(candidateBytes) };
  });
  write(repoRoot, localeFile, localeBytes);
  write(repoRoot, indexFile, indexBytes);
  const files = [
    ...candidateEntries,
    { category: "source", path: localeFile, bytes: localeBytes.length, sha256: sha256(localeBytes) },
    { category: "snapshot_index", path: indexFile, bytes: indexBytes.length, sha256: sha256(indexBytes) },
  ].sort((a, b) => a.path.localeCompare(b.path));
  const candidateStable = files.filter((entry) => entry.category === "candidate")
    .map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest }));
  const stable = files.map(({ category, path: file, bytes, sha256: digest }) => ({ category, path: file, bytes, sha256: digest }));
  const candidateReceipt = {
    schemaVersion: "learning_v2_session_candidate_content_receipt_v2",
    courseSessionId: sessionId,
    releaseAuthority: false,
    immutableContentOnly: true,
    candidateRoot,
    candidateBundleSha256: sha256(JSON.stringify(candidateStable)),
    inventorySha256: sha256(JSON.stringify(stable)),
    blueprintAuthority: {
      schemaVersion: "learning_v2_blueprint_authoring_contract_v2",
      blueprintFingerprint: "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da",
      sessionPacketSha256: "6686bac631ede28475f122b1992d6ac265aabf02ca26cc376ce9ba23fc4639c1",
      introPlanItemCount: 3,
      activityPlanItemCount: 17,
    },
    projection: { fileCount: 5, introPages: 3, practiceInteractions: 17 },
    sourceSnapshot: { indexPath: indexFile, indexSha256: sha256(indexBytes), originCount: 1 },
    fileCount: files.length,
    files,
  };
  const candidateReceiptPath = `${candidateRoot}/content-receipt.json`;
  const candidateReceiptAbsolute = write(repoRoot, candidateReceiptPath, candidateReceipt);
  const contentReceiptSha256 = sha256(fs.readFileSync(candidateReceiptAbsolute));
  const identity = {
    sessionId,
    candidateBundleSha256: candidateReceipt.candidateBundleSha256,
    contentReceiptSha256,
  };
  const reviewEvidence = ["blind_learner", "language_pedagogy_locale"].map((dimension, index) => {
    const artifactPath = `content/learning-v2-course/judgements/s02-v2-${dimension}.json`;
    write(repoRoot, artifactPath, { ...identity, dimension, verdict: "PASS", findings: [] });
    return { dimension, artifactPath, dispatchProvenance: { agent: `/root/reviewer-${index}`, configuredModel: "gpt-6-luna" } };
  });
  const gatePath = "content/learning-v2-course/judgements/s02-v2-gates.json";
  const canonicalCommands = sessionAcceptanceV2CanonicalGateCommands(candidateReceiptPath);
  write(repoRoot, gatePath, {
    schemaVersion: "learning_v2_session_deterministic_gate_report_v1",
    ...identity,
    candidateInventorySha256: candidateReceipt.inventorySha256,
    sourceFingerprint: candidateReceipt.sourceSnapshot.indexSha256,
    verdict: "PASS",
    gates: gateIds.map((id) => ({
      id,
      verdict: "PASS",
      command: canonicalCommands.find((entry) => entry.id === id)?.command ?? "invalid",
      exitCode: 0,
    })),
  });
  return { repoRoot, session, candidateReceipt, candidateReceiptPath, gatePath, reviewEvidence };
}

async function realV2Fixture(t, gateIds = REQUIRED_GATES) {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const suffix = `${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const candidateRoot = path.join(repoRoot, `content/learning-v2-course/outputs/s02-acceptance-v2-${suffix}`);
  t.after(() => fs.rmSync(candidateRoot, { recursive: true, force: true }));
  const session = "en/l01/s02";
  const sessionId = "en:lesson-01:session-02";
  const sourceRoot = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-acceptance-source-"));
  t.after(() => fs.rmSync(sourceRoot, { recursive: true, force: true }));
  const sourceSession = path.join(sourceRoot, session);
  fs.mkdirSync(sourceSession, { recursive: true });
  for (const name of ["final.ru.md", "final.uk.md", "locales_batch.md", "practice.atomic.json"]) {
    fs.copyFileSync(path.join(repoRoot, "content/learning-v2-course/sessions", session, name), path.join(sourceSession, name));
  }
  const build = spawnSync(process.execPath, [
    path.join(repoRoot, "content/learning-v2-course/pipeline/build_release.mjs"),
    "--session", session,
    "--locales", "ru,uk",
    "--source-root", sourceRoot,
    "--out", candidateRoot,
    "--candidate-preview",
  ], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(build.status, 0, build.stderr || build.stdout);

  const s01Manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "content/learning-v2-course/sessions/en/l01/s01/owner-review-preview-manifest.json"), "utf8"));
  const s02ManifestPath = path.join(repoRoot, "content/learning-v2-course/sessions/en/l01/s02/owner-review-preview-manifest.json");
  const temporaryOwnerHead = path.join(candidateRoot, "owner-review-head.json");
  fs.copyFileSync(s02ManifestPath, temporaryOwnerHead);
  const options = {
    repoRoot,
    session,
    candidateRoot,
    receiptSchemaVersion: "v2",
    predecessorReceiptPath: s01Manifest.candidateReceiptPath,
    acceptedPredecessorReceiptPath: s01Manifest.acceptanceReceiptPath,
    revisionPredecessorReceiptPath: JSON.parse(fs.readFileSync(s02ManifestPath, "utf8")).candidateReceiptPath,
    ownerReviewManifestPath: path.relative(repoRoot, temporaryOwnerHead).split(path.sep).join("/"),
  };
  const candidateReceipt = await writeSessionCandidateEvidence(options);
  const candidateReceiptPath = `${candidateReceipt.candidateRoot}/content-receipt.json`;
  const contentReceiptSha256 = sha256(fs.readFileSync(path.join(repoRoot, ...candidateReceiptPath.split("/"))));
  const identity = { sessionId, candidateBundleSha256: candidateReceipt.candidateBundleSha256, contentReceiptSha256 };
  const reviewEvidence = ["blind_learner", "language_pedagogy_locale"].map((dimension, index) => {
    const artifactPath = `${candidateReceipt.candidateRoot}/evidence/${dimension}.json`;
    write(repoRoot, artifactPath, { ...identity, dimension, verdict: "PASS", findings: [] });
    return { dimension, artifactPath, dispatchProvenance: { agent: `/root/reviewer-${index}`, configuredModel: "gpt-6-luna" } };
  });
  const commands = sessionAcceptanceV2CanonicalGateCommands(candidateReceiptPath);
  const gatePath = `${candidateReceipt.candidateRoot}/evidence/deterministic-gates.json`;
  write(repoRoot, gatePath, {
    schemaVersion: "learning_v2_session_deterministic_gate_report_v1",
    ...identity,
    candidateInventorySha256: candidateReceipt.inventorySha256,
    sourceFingerprint: candidateReceipt.sourceSnapshot.indexSha256,
    verdict: "PASS",
    gates: gateIds.map((id) => ({
      id,
      command: commands.find((entry) => entry.id === id)?.command ?? `invalid ${id}`,
      verdict: "PASS",
      exitCode: 0,
    })),
  });
  return { repoRoot, session, candidateReceipt, candidateReceiptPath, gatePath, reviewEvidence };
}

test("S02 v2 machine validation binds the fixed deterministic gate set and advisory-only claims", async (t) => {
  assert.deepEqual(SESSION_ACCEPTANCE_V2_REQUIRED_GATES, REQUIRED_GATES);
  const fx = await realV2Fixture(t);
  const receipt = await buildSessionMachineValidationReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  });
  assert.equal(receipt.schemaVersion, "learning_v2_session_machine_validation_receipt_v1");
  assert.equal(receipt.state, "MACHINE_VALIDATED");
  assert.equal(receipt.releaseAuthority, false);
  assert.equal(receipt.semanticAuthority, false);
  assert.equal(receipt.candidateBundleSha256, fx.candidateReceipt.candidateBundleSha256);
  assert.deepEqual(receipt.advisoryClaims.map((claim) => ({
    trustClass: claim.trustClass,
    configuredModelClaim: claim.configuredModelClaim,
    runIdClaim: claim.runIdClaim,
    advisoryOnly: claim.advisoryOnly,
    semanticAuthority: claim.semanticAuthority,
  })), [
    { trustClass: "self_declared_untrusted", configuredModelClaim: "gpt-6-luna", runIdClaim: "/root/reviewer-0", advisoryOnly: true, semanticAuthority: false },
    { trustClass: "self_declared_untrusted", configuredModelClaim: "gpt-6-luna", runIdClaim: "/root/reviewer-1", advisoryOnly: true, semanticAuthority: false },
  ]);

  const storedPath = `${fx.candidateReceipt.candidateRoot}/evidence/machine-validation-receipt.json`;
  write(fx.repoRoot, storedPath, receipt);
  const validated = await validateSessionMachineValidationReceipt({
    repoRoot: fx.repoRoot,
    machineValidationReceiptPath: storedPath,
  });
  assert.equal(validated.machineValidationReceiptSha256, sha256(fs.readFileSync(path.join(fx.repoRoot, ...storedPath.split("/")))));

  const missing = await realV2Fixture(t, REQUIRED_GATES.slice(0, -1));
  await assert.rejects(buildSessionMachineValidationReceipt({
    repoRoot: missing.repoRoot,
    session: missing.session,
    candidateReceiptPath: missing.candidateReceiptPath,
    deterministicGateReportPath: missing.gatePath,
    reviewEvidence: missing.reviewEvidence,
  }), /deterministic_gate_set_invalid/u);
});

test("a self-declared Luna PASS cannot canonicalize or promote an S02 v2 candidate", async (t) => {
  const fx = await realV2Fixture(t);
  await assert.rejects(buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  }), /trusted_review_attestation_required/u);
  await assert.rejects(promoteSessionCandidate({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
    ownerReviewManifestPath: "content/learning-v2-course/sessions/en/l01/s02/owner-review-preview-manifest.json",
  }), /trusted_review_attestation_required/u);
});

test("a MACHINE_VALIDATED receipt is rejected by the acceptance and activation trust boundary", async (t) => {
  const fx = await realV2Fixture(t);
  const machine = await buildSessionMachineValidationReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  });
  const storedPath = `${fx.candidateReceipt.candidateRoot}/evidence/machine-validation-receipt.json`;
  write(fx.repoRoot, storedPath, machine);
  await assert.rejects(validateSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    acceptanceReceiptPath: storedPath,
  }), /acceptance_receipt_invalid/u);
});

test("advisory PASS claims cannot override a deterministic v2 gate failure", async (t) => {
  const fx = await realV2Fixture(t);
  const gateAbsolute = path.join(fx.repoRoot, ...fx.gatePath.split("/"));
  const gate = JSON.parse(fs.readFileSync(gateAbsolute, "utf8"));
  gate.verdict = "BLOCK";
  gate.gates[0].verdict = "BLOCK";
  gate.gates[0].exitCode = 1;
  fs.writeFileSync(gateAbsolute, jsonBytes(gate));
  await assert.rejects(buildSessionMachineValidationReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  }), /deterministic_gate_report_invalid/u);
});

test("machine validation records only the configured Luna claim used by this v2 lane", async (t) => {
  const fx = await realV2Fixture(t);
  fx.reviewEvidence[0].dispatchProvenance.configuredModel = "gpt-6-sol";
  await assert.rejects(buildSessionMachineValidationReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  }), /review_model_claim_invalid:blind_learner/u);
});

test("S02 v2 acceptance rejects a handwritten receipt without the frozen revision chain", async (t) => {
  const fx = await realV2Fixture(t);
  delete fx.candidateReceipt.frozenRevisionPredecessor;
  fs.writeFileSync(
    path.join(fx.repoRoot, ...fx.candidateReceiptPath.split("/")),
    `${JSON.stringify(fx.candidateReceipt, null, 2)}\n`,
  );
  await assert.rejects(buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  }), /candidate_receipt_v2_history_invalid/u);
});

test("S02 v2 acceptance requires the exact five candidate projection files", async (t) => {
  const fx = fixture(t);
  const receiptPath = path.join(fx.repoRoot, ...fx.candidateReceiptPath.split("/"));
  const removed = fx.candidateReceipt.files.find((entry) => entry.path.endsWith("/learner.uk.json"));
  fs.rmSync(path.join(fx.repoRoot, ...removed.path.split("/")));
  fx.candidateReceipt.files = fx.candidateReceipt.files.filter((entry) => entry !== removed);
  fx.candidateReceipt.fileCount = fx.candidateReceipt.files.length;
  const stable = fx.candidateReceipt.files.map(({ category, path: file, bytes, sha256: digest }) => ({ category, path: file, bytes, sha256: digest }));
  const candidateStable = fx.candidateReceipt.files.filter((entry) => entry.category === "candidate")
    .map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest }));
  fx.candidateReceipt.inventorySha256 = sha256(JSON.stringify(stable));
  fx.candidateReceipt.candidateBundleSha256 = sha256(JSON.stringify(candidateStable));
  fs.writeFileSync(receiptPath, jsonBytes(fx.candidateReceipt));
  await assert.rejects(buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  }), /candidate_receipt_v2_projection_invalid/u);
});

test("S02 v2 machine validation rejects self-declared non-canonical gate commands", async (t) => {
  const fx = await realV2Fixture(t);
  const gate = JSON.parse(fs.readFileSync(path.join(fx.repoRoot, ...fx.gatePath.split("/")), "utf8"));
  gate.gates = gate.gates.map((entry) => ({ ...entry, command: "node --version" }));
  fs.writeFileSync(path.join(fx.repoRoot, ...fx.gatePath.split("/")), jsonBytes(gate));
  await assert.rejects(buildSessionMachineValidationReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  }), /deterministic_gate_command_invalid/u);
});

test("machine-validation advisory evidence cannot escape the repository through a junction", async (t) => {
  const fx = await realV2Fixture(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-acceptance-escape-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  const escapedArtifact = path.join(outside, "review.json");
  const first = fx.reviewEvidence[0];
  const raw = JSON.parse(fs.readFileSync(path.join(fx.repoRoot, ...first.artifactPath.split("/")), "utf8"));
  fs.writeFileSync(escapedArtifact, jsonBytes(raw));
  const junction = path.join(path.dirname(path.join(fx.repoRoot, ...first.artifactPath.split("/"))), "escape");
  fs.symlinkSync(outside, junction, "junction");
  first.artifactPath = `${path.dirname(first.artifactPath).split(path.sep).join("/")}/escape/review.json`;

  await assert.rejects(buildSessionMachineValidationReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  }), /review_artifact_path_outside_repo/u);
});

test("candidate projection files cannot escape the repository through a junction", async (t) => {
  const fx = fixture(t);
  const projection = path.join(fx.repoRoot, ...`${fx.candidateReceipt.candidateRoot}/${fx.session}`.split("/"));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), "learning-v2-candidate-escape-"));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.cpSync(projection, outside, { recursive: true });
  fs.rmSync(projection, { recursive: true, force: true });
  fs.symlinkSync(outside, projection, "junction");

  await assert.rejects(buildSessionAcceptanceReceipt({
    repoRoot: fx.repoRoot,
    session: fx.session,
    candidateReceiptPath: fx.candidateReceiptPath,
    deterministicGateReportPath: fx.gatePath,
    reviewEvidence: fx.reviewEvidence,
  }), /candidate_file_path_outside_repo/u);
});

test("the immutable historical S02 v1 acceptance still validates byte-for-byte", async () => {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  const manifest = JSON.parse(fs.readFileSync(path.join(repoRoot, "content/learning-v2-course/sessions/en/l01/s02/owner-review-preview-manifest.json"), "utf8"));
  const validated = await validateSessionAcceptanceReceipt({ repoRoot, acceptanceReceiptPath: manifest.acceptanceReceiptPath });
  assert.equal(validated.acceptanceReceiptSha256, manifest.acceptanceReceiptSha256);
  const candidate = JSON.parse(fs.readFileSync(path.join(repoRoot, ...validated.candidateReceiptPath.split("/")), "utf8"));
  assert.equal(candidate.schemaVersion, "learning_v2_session_candidate_content_receipt_v1");
  assert.equal(candidate.projection.practiceInteractions, 21);
});

test("all immutable historical S01-S15 v1 acceptances still validate", async () => {
  const repoRoot = path.resolve(import.meta.dirname, "../../..");
  for (let ordinal = 1; ordinal <= 15; ordinal += 1) {
    const short = `s${String(ordinal).padStart(2, "0")}`;
    const manifest = JSON.parse(fs.readFileSync(path.join(
      repoRoot,
      `content/learning-v2-course/sessions/en/l01/${short}/owner-review-preview-manifest.json`,
    ), "utf8"));
    const validated = await validateSessionAcceptanceReceipt({
      repoRoot,
      acceptanceReceiptPath: manifest.acceptanceReceiptPath,
    });
    assert.equal(validated.acceptanceReceiptSha256, manifest.acceptanceReceiptSha256, short);
    const candidate = JSON.parse(fs.readFileSync(path.join(repoRoot, ...validated.candidateReceiptPath.split("/")), "utf8"));
    assert.equal(candidate.schemaVersion, "learning_v2_session_candidate_content_receipt_v1", short);
  }
});

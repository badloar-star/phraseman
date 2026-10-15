#!/usr/bin/env node
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateSessionAcceptanceReceipt } from "./session_acceptance_receipt.mjs";
import {
  APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT,
  runEnglishBlueprintIntegrityGate,
} from "./authoring_admission.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";
import {
  assertDirectoryContainedNoLinks,
  readRegularFileContained,
  readRegularFileContainedWithIdentity,
  rebuildAndVerifyV2Projection,
} from "./session_candidate_projection_parity.mjs";
import { computeV2ToolchainClosure } from "./session_candidate_toolchain_closure.mjs";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(PIPELINE, "../../..");
const REQUIRED_ROLES = Object.freeze(["learner", "reader", "pedagogy", "nonsense", "taste", "progression", "locale"]);
const PROJECTION_NAMES = Object.freeze(["intro.json", "auxiliary.json", "learner.json", "learner.uk.json", "answers.json"]);
const PREVIEW_NAMES = Object.freeze(["index.html", "external.html", "app.js", "data.js"]);
const SUPPORTED_SESSIONS = new Set(["en/l01/s01", "en/l01/s02", "en/l01/s03", "en/l01/s04", "en/l01/s05", "en/l01/s06", "en/l01/s07", "en/l01/s08", "en/l01/s09", "en/l01/s10", "en/l01/s11", "en/l01/s12", "en/l01/s13", "en/l01/s14", "en/l01/s15"]);
const EXPECTED_INTERACTION_COUNTS = Object.freeze({
  "en/l01/s01": 20,
  "en/l01/s02": 21,
  "en/l01/s03": 21,
  "en/l01/s04": 21,
  "en/l01/s05": 20,
  "en/l01/s06": 19,
  "en/l01/s07": 18,
  "en/l01/s08": 21,
  "en/l01/s09": 21,
  "en/l01/s10": 20,
  "en/l01/s11": 18,
  "en/l01/s12": 20,
  "en/l01/s13": 18,
  "en/l01/s14": 18,
  "en/l01/s15": 22,
});
const SOURCE_EVIDENCE_BY_SESSION = Object.freeze({
  "en/l01/s01": "content/learning-v2-course/judgements/2026-10-13_l01_s01_source_evidence.md",
  "en/l01/s02": "content/learning-v2-course/judgements/2026-10-13_l01_s02_source_evidence.md",
});
const EXPLANATION_SIDECAR_SESSIONS = new Set(["en/l01/s01", "en/l01/s02"]);
const CANDIDATE_SCHEMA_V1 = "learning_v2_session_candidate_content_receipt_v1";
const CANDIDATE_SCHEMA_V2 = "learning_v2_session_candidate_content_receipt_v2";
const SNAPSHOT_SCHEMA_V1 = "learning_v2_session_source_snapshot_v1";
const SNAPSHOT_SCHEMA_V2 = "learning_v2_session_source_snapshot_v2";
const BLUEPRINT_CONTRACT_SCHEMA = "learning_v2_blueprint_authoring_contract_v2";
const S02_PACKET_SHA256 = "6686bac631ede28475f122b1992d6ac265aabf02ca26cc376ce9ba23fc4639c1";
const USAGE = "Usage: node build_session_candidate_receipt.mjs --session en/l01/s01|en/l01/s02|en/l01/s03|en/l01/s04|en/l01/s05|en/l01/s06|en/l01/s07|en/l01/s08|en/l01/s09|en/l01/s10|en/l01/s11|en/l01/s12|en/l01/s13|en/l01/s14|en/l01/s15 --candidate <new-candidate-directory> [--receipt-version v1|v2] [--predecessor-receipt <frozen-previous-course-content-receipt>] [--accepted-predecessor-receipt <validated-previous-session-acceptance-receipt>] [--revision-predecessor-receipt <frozen-current-session-content-receipt>] [--owner-review-manifest <current-owner-review-preview-manifest>]";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function candidateSchema(options = {}) {
  if (options.receiptSchemaVersion === undefined || options.receiptSchemaVersion === "v1") return CANDIDATE_SCHEMA_V1;
  if (options.receiptSchemaVersion === "v2" && options.session === "en/l01/s02") return CANDIDATE_SCHEMA_V2;
  throw new Error(`candidate_receipt_schema_unsupported:${options.receiptSchemaVersion}:${options.session}`);
}

function verifiedBlueprintContractV2(repoRoot, session) {
  const result = runEnglishBlueprintIntegrityGate(repoRoot, session);
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  if (result.status !== 0 || !/LEARNING V2 CURRICULUM BLUEPRINT V2 GATE: PASS/u.test(output)) {
    throw new Error("candidate_blueprint_gate_failed");
  }
  const encoded = /^authoring_contract_base64=([A-Za-z0-9+/=]+)$/mu.exec(output)?.[1];
  let contract;
  try {
    contract = JSON.parse(Buffer.from(encoded || "", "base64").toString("utf8"));
  } catch {
    throw new Error("candidate_blueprint_contract_invalid");
  }
  return normalizeBlueprintContractV2(contract, session);
}

function normalizeBlueprintContractV2(contract, session) {
  if (contract?.schemaVersion !== BLUEPRINT_CONTRACT_SCHEMA
    || (contract.session !== undefined && contract.session !== session)
    || contract.blueprintFingerprint !== APPROVED_ENGLISH_BLUEPRINT_FINGERPRINT
    || contract.sessionPacketSha256 !== S02_PACKET_SHA256
    || contract.introPlanItemCount !== 3
    || contract.activityPlanItemCount !== 17) {
    throw new Error("candidate_blueprint_contract_invalid");
  }
  return Object.freeze({
    schemaVersion: contract.schemaVersion,
    blueprintFingerprint: contract.blueprintFingerprint,
    sessionPacketSha256: contract.sessionPacketSha256,
    introPlanItemCount: contract.introPlanItemCount,
    activityPlanItemCount: contract.activityPlanItemCount,
  });
}

function sessionIdentity(session) {
  const match = /^([a-z]{2})\/l(\d{2})\/s(\d{2})$/u.exec(String(session ?? ""));
  if (!match) throw new Error(`invalid_session:${session}`);
  const [, language, lesson, sessionNumber] = match;
  return { language, lesson, sessionNumber, courseSessionId: `${language}:lesson-${lesson}:session-${sessionNumber}` };
}

function normalizedRelative(repoRoot, absolute) {
  const relative = path.relative(path.resolve(repoRoot), path.resolve(absolute));
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`path_outside_repo:${absolute}`);
  return relative.split(path.sep).join("/");
}

function realRepoContainedPath(repoRoot, absolute, label) {
  let realRepo;
  let realAbsolute;
  try {
    realRepo = fs.realpathSync(path.resolve(repoRoot));
    realAbsolute = fs.realpathSync(path.resolve(absolute));
  } catch {
    throw new Error(`${label}_path_invalid`);
  }
  const relative = path.relative(realRepo, realAbsolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label}_path_outside_repo`);
  }
  return realAbsolute;
}

function absoluteFromRepo(repoRoot, value) {
  if (path.isAbsolute(value)) return path.resolve(value);
  return path.resolve(repoRoot, ...String(value).split(/[\\/]/u));
}

function canonicalRepoRelativePath(repoRoot, value, label) {
  if (typeof value !== "string" || !value) throw new Error(`${label}_path_invalid`);
  if (!path.isAbsolute(value) && value.includes("\\")) throw new Error(`${label}_path_not_canonical`);
  const absolute = absoluteFromRepo(repoRoot, value);
  const relative = normalizedRelative(repoRoot, absolute);
  if (!path.isAbsolute(value) && relative !== value) throw new Error(`${label}_path_not_canonical`);
  return { absolute: realRepoContainedPath(repoRoot, absolute, label), relative };
}

function checkedCandidateRoot({ repoRoot, candidateRoot, sessionNumber }) {
  const outputs = path.resolve(repoRoot, "content/learning-v2-course/outputs");
  const absolute = path.resolve(candidateRoot);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) throw new Error(`candidate_root_missing:${candidateRoot}`);
  const realOutputs = assertDirectoryContainedNoLinks(repoRoot, outputs, "candidate_outputs_root");
  const realCandidate = assertDirectoryContainedNoLinks(repoRoot, absolute, "candidate_root");
  if (path.dirname(realCandidate) !== realOutputs || !new RegExp(`^s${sessionNumber}-[a-z0-9][a-z0-9-]*$`, "u").test(path.basename(realCandidate))) {
    throw new Error(`candidate_root_not_direct_output_child:${candidateRoot}`);
  }
  return realCandidate;
}

function hashFile(repoRoot, category, absolute) {
  const bytes = readRegularFileContained(repoRoot, absolute, "receipt_inventory_file");
  return { category, path: normalizedRelative(repoRoot, absolute), bytes: bytes.length, sha256: sha256(bytes) };
}

function verifyFrozenPredecessor({ repoRoot, receiptPath, expectedCourseSessionId }) {
  const absoluteReceipt = path.resolve(receiptPath);
  const storedBytes = fs.readFileSync(absoluteReceipt);
  const stored = JSON.parse(storedBytes.toString("utf8"));
  if (stored.courseSessionId !== expectedCourseSessionId || stored.releaseAuthority !== false || stored.immutableContentOnly !== true) {
    throw new Error("frozen_predecessor_receipt_invalid");
  }
  if (!Array.isArray(stored.files) || stored.fileCount !== stored.files.length) throw new Error("frozen_predecessor_inventory_invalid");
  for (const entry of stored.files) {
    const absolute = path.resolve(repoRoot, ...String(entry.path).split("/"));
    if (normalizedRelative(repoRoot, absolute) !== entry.path) throw new Error(`frozen_predecessor_path_invalid:${entry.path}`);
    const bytes = fs.readFileSync(absolute);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`frozen_predecessor_file_mismatch:${entry.path}`);
  }
  const stable = stored.schemaVersion === "learning_v2_session_candidate_content_receipt_v1"
    ? JSON.stringify(stored.files.map(({ category, path: file, bytes, sha256: digest }) => ({ category, path: file, bytes, sha256: digest })))
    : JSON.stringify(stored.files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })));
  if (sha256(stable) !== stored.inventorySha256) throw new Error("frozen_predecessor_inventory_sha_mismatch");
  return {
    status: "PASS",
    receiptPath: normalizedRelative(repoRoot, absoluteReceipt),
    receiptSha256: sha256(storedBytes),
    inventorySha256: stored.inventorySha256,
  };
}

function verifyFrozenAcceptedPredecessor({ repoRoot, receiptPath, currentSession }) {
  const currentNumber = Number(currentSession.slice(-2));
  const predecessorNumber = String(currentNumber - 1).padStart(2, "0");
  const errorPrefix = `s${currentSession.slice(-2)}`;
  if (!receiptPath) throw new Error(`${errorPrefix}_predecessor_receipt_required`);
  let predecessorBinding;
  try {
    predecessorBinding = canonicalRepoRelativePath(repoRoot, receiptPath, `${errorPrefix}_predecessor_receipt`);
  } catch (error) {
    if (error instanceof Error && error.message === `${errorPrefix}_predecessor_receipt_path_invalid`) {
      throw new Error(`${errorPrefix}_frozen_predecessor_receipt_invalid`);
    }
    throw error;
  }
  const absoluteReceipt = predecessorBinding.absolute;
  let storedBytes;
  let stored;
  try {
    storedBytes = fs.readFileSync(absoluteReceipt);
    stored = JSON.parse(storedBytes.toString("utf8"));
  } catch {
    throw new Error(`${errorPrefix}_frozen_predecessor_receipt_invalid`);
  }
  if (stored.schemaVersion !== "learning_v2_session_candidate_content_receipt_v1"
    || stored.courseSessionId !== `en:lesson-01:session-${predecessorNumber}`
    || stored.releaseAuthority !== false
    || stored.immutableContentOnly !== true
    || typeof stored.candidateRoot !== "string"
    || !new RegExp(`^content/learning-v2-course/outputs/s${predecessorNumber}-[a-z0-9][a-z0-9-]*$`, "u").test(stored.candidateRoot)
    || !Number.isSafeInteger(stored.fileCount)
    || !Array.isArray(stored.files)
    || stored.fileCount !== stored.files.length
    || !/^[0-9a-f]{64}$/u.test(String(stored.inventorySha256 ?? ""))
    || !/^[0-9a-f]{64}$/u.test(String(stored.candidateBundleSha256 ?? ""))) {
    throw new Error(`${errorPrefix}_frozen_predecessor_receipt_invalid`);
  }
  let candidateAbsolute;
  let expectedReceiptPath;
  try {
    candidateAbsolute = path.resolve(repoRoot, ...stored.candidateRoot.split("/"));
    if (normalizedRelative(repoRoot, candidateAbsolute) !== stored.candidateRoot) throw new Error("candidate_root_not_canonical");
    expectedReceiptPath = path.resolve(repoRoot, ...`${stored.candidateRoot}/content-receipt.json`.split("/"));
    if (expectedReceiptPath !== absoluteReceipt || predecessorBinding.relative !== `${stored.candidateRoot}/content-receipt.json`) {
      throw new Error("receipt_path_not_canonical");
    }
    const outputs = fs.realpathSync(path.resolve(repoRoot, "content/learning-v2-course/outputs"));
    const realCandidate = fs.realpathSync(candidateAbsolute);
    const realReceipt = fs.realpathSync(absoluteReceipt);
    if (path.dirname(realCandidate) !== outputs || path.dirname(realReceipt) !== realCandidate
      || path.basename(realCandidate) !== path.basename(stored.candidateRoot)) {
      throw new Error("candidate_root_not_direct_output_child");
    }
  } catch {
    throw new Error(`${errorPrefix}_frozen_predecessor_receipt_invalid`);
  }

  const seen = new Set();
  const stableEntries = [];
  const candidateStableEntries = [];
  for (const entry of stored.files) {
    if (!entry || typeof entry.category !== "string" || typeof entry.path !== "string"
      || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || !/^[0-9a-f]{64}$/u.test(String(entry.sha256 ?? ""))
      || seen.has(entry.path)) {
      throw new Error(`${errorPrefix}_frozen_predecessor_inventory_invalid`);
    }
    let absolute;
    try {
      absolute = path.resolve(repoRoot, ...entry.path.split("/"));
      if (normalizedRelative(repoRoot, absolute) !== entry.path) throw new Error("entry_path_not_canonical");
      absolute = realRepoContainedPath(repoRoot, absolute, `${errorPrefix}_frozen_predecessor`);
    } catch {
      throw new Error(`${errorPrefix}_frozen_predecessor_path_invalid:${entry.path}`);
    }
    let bytes;
    try {
      bytes = fs.readFileSync(absolute);
    } catch {
      throw new Error(`${errorPrefix}_frozen_predecessor_file_mismatch:${entry.path}`);
    }
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) {
      throw new Error(`${errorPrefix}_frozen_predecessor_file_mismatch:${entry.path}`);
    }
    seen.add(entry.path);
    stableEntries.push({ category: entry.category, path: entry.path, bytes: entry.bytes, sha256: entry.sha256 });
    if (entry.category === "candidate") candidateStableEntries.push({ path: entry.path, bytes: entry.bytes, sha256: entry.sha256 });
  }
  if (sha256(JSON.stringify(stableEntries)) !== stored.inventorySha256) throw new Error(`${errorPrefix}_frozen_predecessor_inventory_sha_mismatch`);
  if (sha256(JSON.stringify(candidateStableEntries)) !== stored.candidateBundleSha256) throw new Error(`${errorPrefix}_frozen_predecessor_bundle_sha_mismatch`);
  const binding = {
    status: "PASS",
    receiptPath: normalizedRelative(repoRoot, absoluteReceipt),
    receiptSha256: sha256(storedBytes),
    inventorySha256: stored.inventorySha256,
  };
  // The immutable S09 v4 receipt predates serialization of the predecessor
  // bundle hash. Keep the value available to acceptance validation while
  // reproducing that exact historical JSON shape.
  Object.defineProperty(binding, "candidateBundleSha256", {
    value: stored.candidateBundleSha256,
    enumerable: currentSession !== "en/l01/s09",
  });
  return binding;
}

async function verifyAcceptedPreviousPredecessor({ repoRoot, acceptanceReceiptPath, frozenPredecessor, currentSession }) {
  const currentNumber = Number(currentSession.slice(-2));
  const predecessorNumber = String(currentNumber - 1).padStart(2, "0");
  const errorPrefix = `s${currentSession.slice(-2)}`;
  if (!acceptanceReceiptPath) throw new Error(`${errorPrefix}_accepted_predecessor_receipt_required`);
  const normalizedAcceptanceReceiptPath = canonicalRepoRelativePath(
    repoRoot,
    acceptanceReceiptPath,
    `${errorPrefix}_accepted_predecessor_receipt`,
  ).relative;
  const accepted = await validateSessionAcceptanceReceipt({ repoRoot, acceptanceReceiptPath: normalizedAcceptanceReceiptPath });
  if (accepted.session !== `en/l01/s${predecessorNumber}` || accepted.courseSessionId !== `en:lesson-01:session-${predecessorNumber}`) {
    throw new Error(`${errorPrefix}_accepted_predecessor_wrong_session`);
  }
  if (accepted.candidateReceiptPath !== frozenPredecessor.receiptPath
    || accepted.candidateReceiptSha256 !== frozenPredecessor.receiptSha256
    || accepted.candidateBundleSha256 !== frozenPredecessor.candidateBundleSha256) {
    throw new Error(`${errorPrefix}_accepted_predecessor_candidate_mismatch`);
  }
  return {
    status: "PASS",
    acceptanceReceiptPath: accepted.acceptanceReceiptPath,
    acceptanceReceiptSha256: accepted.acceptanceReceiptSha256,
    candidateReceiptPath: accepted.candidateReceiptPath,
    candidateReceiptSha256: accepted.candidateReceiptSha256,
    candidateBundleSha256: accepted.candidateBundleSha256,
  };
}

function requiresAcceptedPredecessor(session, schemaVersion = CANDIDATE_SCHEMA_V1) {
  return (schemaVersion === CANDIDATE_SCHEMA_V2 && session === "en/l01/s02")
    || /^en\/l01\/s(?:0[5-9]|1[0-5])$/u.test(session ?? "");
}

function requireAcceptedPredecessorPaths(options) {
  const { session, predecessorReceiptPath, acceptedPredecessorReceiptPath } = options;
  if (!requiresAcceptedPredecessor(session, candidateSchema(options))) return;
  const errorPrefix = `s${session.slice(-2)}`;
  if (!predecessorReceiptPath) throw new Error(`${errorPrefix}_predecessor_receipt_required`);
  if (!acceptedPredecessorReceiptPath) throw new Error(`${errorPrefix}_accepted_predecessor_receipt_required`);
}

async function verifyAcceptedPredecessors(options = {}) {
  if (!requiresAcceptedPredecessor(options.session, candidateSchema(options))) return null;
  requireAcceptedPredecessorPaths(options);
  const repoRoot = options.repoRoot ?? DEFAULT_REPO;
  const frozenPredecessor = verifyFrozenAcceptedPredecessor({
    repoRoot,
    receiptPath: options.predecessorReceiptPath,
    currentSession: options.session,
  });
  const acceptedPredecessor = await verifyAcceptedPreviousPredecessor({
    repoRoot,
    acceptanceReceiptPath: options.acceptedPredecessorReceiptPath,
    frozenPredecessor,
    currentSession: options.session,
  });
  return { frozenPredecessor, acceptedPredecessor };
}

function requireV2RevisionBindings(options) {
  if (candidateSchema(options) !== CANDIDATE_SCHEMA_V2) return;
  if (!options.revisionPredecessorReceiptPath) throw new Error("s02_revision_predecessor_receipt_required");
}

function verifyFrozenRevisionPredecessor({ repoRoot, receiptPath, expectedCourseSessionId }) {
  let revisionBinding;
  try {
    revisionBinding = canonicalRepoRelativePath(repoRoot, receiptPath, "revision_predecessor_receipt");
  } catch {
    throw new Error("frozen_revision_predecessor_receipt_invalid");
  }
  const absoluteReceipt = revisionBinding.absolute;
  let storedBytes;
  let stored;
  try {
    storedBytes = readRegularFileContained(repoRoot, absoluteReceipt, "revision_predecessor_receipt");
    stored = JSON.parse(storedBytes.toString("utf8"));
  } catch {
    throw new Error("frozen_revision_predecessor_receipt_invalid");
  }
  if (stored.schemaVersion !== "learning_v2_session_candidate_content_receipt_v1"
    || stored.courseSessionId !== expectedCourseSessionId
    || stored.releaseAuthority !== false
    || stored.immutableContentOnly !== true
    || typeof stored.candidateRoot !== "string"
    || typeof stored.candidateBundleSha256 !== "string"
    || !Array.isArray(stored.files)
    || stored.fileCount !== stored.files.length
    || new Set(stored.files.map((entry) => entry.path)).size !== stored.files.length) {
    throw new Error("frozen_revision_predecessor_receipt_invalid");
  }
  const expectedReceiptPath = path.resolve(repoRoot, ...`${stored.candidateRoot}/content-receipt.json`.split("/"));
  if (expectedReceiptPath !== absoluteReceipt) throw new Error("frozen_revision_predecessor_receipt_invalid");
  for (const entry of stored.files) {
    if (!entry || typeof entry.category !== "string" || typeof entry.path !== "string"
      || !Number.isSafeInteger(entry.bytes) || entry.bytes < 0 || typeof entry.sha256 !== "string") {
      throw new Error("frozen_revision_predecessor_inventory_invalid");
    }
    let absolute = path.resolve(repoRoot, ...entry.path.split("/"));
    if (normalizedRelative(repoRoot, absolute) !== entry.path) throw new Error(`frozen_revision_predecessor_path_invalid:${entry.path}`);
    absolute = realRepoContainedPath(repoRoot, absolute, "frozen_revision_predecessor");
    const bytes = readRegularFileContained(repoRoot, absolute, "frozen_revision_predecessor");
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`frozen_revision_predecessor_file_mismatch:${entry.path}`);
  }
  const stable = JSON.stringify(stored.files.map(({ category, path: file, bytes, sha256: digest }) => ({ category, path: file, bytes, sha256: digest })));
  if (sha256(stable) !== stored.inventorySha256) throw new Error("frozen_revision_predecessor_inventory_sha_mismatch");
  const candidateStable = JSON.stringify(stored.files
    .filter((entry) => entry.category === "candidate")
    .map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })));
  if (sha256(candidateStable) !== stored.candidateBundleSha256) throw new Error("frozen_revision_predecessor_bundle_sha_mismatch");
  return {
    status: "PASS",
    receiptPath: revisionBinding.relative,
    receiptSha256: sha256(storedBytes),
    inventorySha256: stored.inventorySha256,
    candidateBundleSha256: stored.candidateBundleSha256,
  };
}

function validateProjection({ repoRoot = DEFAULT_REPO, candidateRoot, session, courseSessionId, blueprintAuthority = null }) {
  const expectedInteractionCount = blueprintAuthority?.activityPlanItemCount ?? EXPECTED_INTERACTION_COUNTS[session];
  const expectedIntroCount = blueprintAuthority?.introPlanItemCount ?? 3;
  if (!Number.isInteger(expectedInteractionCount)) throw new Error(`candidate_session_inventory_unknown:${session}`);
  const projectionRoot = path.join(candidateRoot, ...session.split("/"));
  const documents = Object.fromEntries(PROJECTION_NAMES.map((name) => {
    const absolute = path.join(projectionRoot, name);
    if (!fs.existsSync(absolute)) throw new Error(`candidate_projection_missing:${name}`);
    return [name, JSON.parse(readRegularFileContained(repoRoot, absolute, `candidate_projection_${name}`).toString("utf8"))];
  }));
  for (const name of ["intro.json", "auxiliary.json", "learner.json", "learner.uk.json"]) {
    if (documents[name].courseSessionId !== courseSessionId) throw new Error(`candidate_course_session_mismatch:${name}`);
  }
  if (documents["intro.json"].pages?.length !== expectedIntroCount || documents["intro.json"].pageCount !== expectedIntroCount) throw new Error("candidate_intro_inventory_mismatch");
  for (const name of ["learner.json", "learner.uk.json"]) {
    if (documents[name].interactions?.length !== expectedInteractionCount || documents[name].practiceInteractionCount !== expectedInteractionCount) throw new Error(`candidate_practice_inventory_mismatch:${name}`);
  }
  const answers = documents["answers.json"];
  if (!Array.isArray(answers) || answers.length !== expectedInteractionCount || answers.some((entry) => !String(entry.interactionId ?? "").startsWith(`${courseSessionId}:`))) {
    throw new Error("candidate_answers_inventory_mismatch");
  }
  const identitySets = ["learner.json", "learner.uk.json"].map((name) => documents[name].interactions.map((entry) => entry.interactionId));
  const answerIdentities = answers.map((entry) => entry.interactionId);
  if (identitySets.some((identities) => new Set(identities).size !== expectedInteractionCount)
    || new Set(answerIdentities).size !== expectedInteractionCount
    || JSON.stringify([...identitySets[0]].sort()) !== JSON.stringify([...identitySets[1]].sort())
    || JSON.stringify([...identitySets[0]].sort()) !== JSON.stringify([...answerIdentities].sort())) {
    throw new Error("candidate_interaction_identity_mismatch");
  }
  return PROJECTION_NAMES.map((name) => path.join(projectionRoot, name));
}

function originalInputInventoryV2(repoRoot, session, identity) {
  if (session !== "en/l01/s02") throw new Error(`unsupported_v2_session_scope:${identity.courseSessionId}`);
  const sessionBase = `content/learning-v2-course/sessions/${session}`;
  const toolchain = computeV2ToolchainClosure(repoRoot);
  const approvalRegistry = "modules/learning-v2/curriculum/en/blueprint_approval_registry_en_v2.ts";
  return [
    ...["final.ru.md", "final.uk.md", "locales_batch.md", "practice.atomic.json"]
      .map((name) => ["source", `${sessionBase}/${name}`]),
    ...(!toolchain.includes(approvalRegistry) ? [["blueprint_authority", approvalRegistry]] : []),
    ["owner_approval", "content/learning-v2-course/judgements/owner/2026-10-14_english_blueprint_d956_approval.md"],
    ["historical_evidence", `content/learning-v2-course/curriculum/${identity.language}/ПЛАН_КУРСА.md`],
    ...[
      "tests/learning_v2_english_course_blueprint_owner_approval_gate.ts",
      "tests/learning_v2_exact_session_packets_gate_v2.ts",
      "content/learning-v2-course/pipeline/build_session_candidate_receipt.test.mjs",
      "content/learning-v2-course/pipeline/build_session_candidate_receipt_v2.test.mjs",
      "content/learning-v2-course/pipeline/session_acceptance_receipt_v2.test.mjs",
    ].map((relative) => ["verification_evidence", relative]),
    ...toolchain.map((relative) => ["contract", relative]),
  ];
}

function ensureContainedDirectoryTree(root, target, label) {
  const realRoot = assertDirectoryContainedNoLinks(path.dirname(path.resolve(root)), path.resolve(root), `${label}_root`);
  const relative = path.relative(path.resolve(root), path.resolve(target));
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error(`${label}_path_outside_root`);
  }
  let cursor = path.resolve(root);
  for (const component of relative.split(path.sep)) {
    cursor = path.join(cursor, component);
    try {
      fs.mkdirSync(cursor);
    } catch (error) {
      if (error?.code !== "EEXIST") throw error;
    }
    const resolved = assertDirectoryContainedNoLinks(realRoot, cursor, label);
    if (path.dirname(resolved) !== fs.realpathSync(path.dirname(cursor))) throw new Error(`${label}_changed`);
  }
  return assertDirectoryContainedNoLinks(realRoot, target, label);
}

function originalInputInventory(repoRoot, session, identity, schemaVersion = CANDIDATE_SCHEMA_V1) {
  if (!SUPPORTED_SESSIONS.has(session)) throw new Error(`unsupported_session_scope:${identity.courseSessionId}`);
  if (schemaVersion === CANDIDATE_SCHEMA_V2) {
    return originalInputInventoryV2(repoRoot, session, identity)
      .map(([category, originalPath]) => ({ category, originalPath, absolute: path.join(repoRoot, ...originalPath.split("/")) }));
  }
  const sessionBase = `content/learning-v2-course/sessions/${session}`;
  const explanationSidecar = `${sessionBase}/practice.explanations.v1.json`;
  const sourceEvidence = SOURCE_EVIDENCE_BY_SESSION[session];
  const rows = [
    ...["final.ru.md", "final.uk.md", "locales_batch.md", "practice.atomic.json"].map((name) => ["source", `${sessionBase}/${name}`]),
    ...(EXPLANATION_SIDECAR_SESSIONS.has(session)
      || (Number(identity.sessionNumber) >= 6 && fs.existsSync(path.join(repoRoot, ...explanationSidecar.split("/"))))
        ? [["source", explanationSidecar]]
        : []),
    ...[
      ...(sourceEvidence ? [sourceEvidence] : []),
      `content/learning-v2-course/curriculum/${identity.language}/ПЛАН_КУРСА.md`,
      "content/learning-v2-course/migration/single-phrase-2026-10-03/preservation-ledger.json",
    ].map((relative) => ["evidence", relative]),
    ...[
      "content/learning-v2-course/pipeline/build_release.mjs",
      "content/learning-v2-course/pipeline/practice_explanations_v1.mjs",
      `content/learning-v2-course/pipeline/l${identity.lesson}s${identity.sessionNumber}_feedback_repair.test.mjs`,
      ...(["en/l01/s14", "en/l01/s15"].includes(session)
        ? [`content/learning-v2-course/pipeline/l01s${identity.sessionNumber}_specific_feedback.test.mjs`]
        : []),
      "content/learning-v2-course/pipeline/build_session_candidate_receipt.mjs",
      "content/learning-v2-course/pipeline/build_session_candidate_receipt.test.mjs",
      ...(Number(identity.sessionNumber) >= 5 ? ["content/learning-v2-course/pipeline/session_acceptance_receipt.mjs"] : []),
    ].map((relative) => ["contract", relative]),
  ];
  return rows.map(([category, originalPath]) => ({ category, originalPath, absolute: path.join(repoRoot, ...originalPath.split("/")) }));
}

export async function prepareSessionCandidateSnapshot(options = {}) {
  const { repoRoot = DEFAULT_REPO, candidateRoot, session } = options;
  const identity = sessionIdentity(session);
  const schemaVersion = candidateSchema(options);
  const blueprintAuthority = schemaVersion === CANDIDATE_SCHEMA_V2
    ? verifiedBlueprintContractV2(repoRoot, session)
    : null;
  const checkedCandidate = checkedCandidateRoot({ repoRoot, candidateRoot, sessionNumber: identity.sessionNumber });
  const snapshotRoot = path.join(checkedCandidate, "source-snapshot");
  if (fs.existsSync(snapshotRoot)) throw new Error("candidate_snapshot_already_exists");
  if (schemaVersion === CANDIDATE_SCHEMA_V2) ensureContainedDirectoryTree(checkedCandidate, snapshotRoot, "candidate_snapshot_root");
  const entries = [];
  for (const { category, originalPath, absolute } of originalInputInventory(repoRoot, session, identity, schemaVersion)) {
    const snapshotAbsolute = path.join(snapshotRoot, ...originalPath.split("/"));
    const bytes = schemaVersion === CANDIDATE_SCHEMA_V2
      ? readRegularFileContained(repoRoot, absolute, "candidate_snapshot_origin")
      : fs.readFileSync(absolute);
    if (schemaVersion === CANDIDATE_SCHEMA_V2) {
      ensureContainedDirectoryTree(checkedCandidate, path.dirname(snapshotAbsolute), "candidate_snapshot_file_parent");
      if (options.beforeV2SnapshotFileCommit) await options.beforeV2SnapshotFileCommit({ snapshotRoot, snapshotAbsolute, originalPath });
      writeExclusiveDurableFile(checkedCandidate, snapshotAbsolute, bytes, "candidate_snapshot_file");
    } else {
      fs.mkdirSync(path.dirname(snapshotAbsolute), { recursive: true });
      await writeMockupFile(snapshotAbsolute, bytes);
    }
    entries.push({
      category,
      originalPath,
      snapshotPath: normalizedRelative(repoRoot, snapshotAbsolute),
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }
  entries.sort((left, right) => left.originalPath.localeCompare(right.originalPath));
  const index = {
    schemaVersion: schemaVersion === CANDIDATE_SCHEMA_V2 ? SNAPSHOT_SCHEMA_V2 : SNAPSHOT_SCHEMA_V1,
    courseSessionId: identity.courseSessionId,
    ...(blueprintAuthority ? { blueprintAuthority } : {}),
    entries,
  };
  const indexBytes = Buffer.from(`${JSON.stringify(index, null, 2)}\n`, "utf8");
  if (schemaVersion === CANDIDATE_SCHEMA_V2) {
    writeExclusiveDurableFile(checkedCandidate, path.join(snapshotRoot, "index.json"), indexBytes, "candidate_snapshot_index");
  } else {
    await writeMockupFile(path.join(snapshotRoot, "index.json"), indexBytes);
  }
  return index;
}

function readCandidateSnapshot({ repoRoot, candidateRoot, session, identity, schemaVersion, blueprintAuthority }) {
  const indexPath = path.join(candidateRoot, "source-snapshot/index.json");
  const indexBytes = schemaVersion === CANDIDATE_SCHEMA_V2
    ? readRegularFileContained(repoRoot, indexPath, "candidate_snapshot_index")
    : fs.readFileSync(indexPath);
  const index = JSON.parse(indexBytes.toString("utf8"));
  const expectedSnapshotSchema = schemaVersion === CANDIDATE_SCHEMA_V2 ? SNAPSHOT_SCHEMA_V2 : SNAPSHOT_SCHEMA_V1;
  if (index.schemaVersion !== expectedSnapshotSchema || index.courseSessionId !== identity.courseSessionId || !Array.isArray(index.entries)) {
    throw new Error("candidate_snapshot_index_invalid");
  }
  const frozenBlueprintAuthority = schemaVersion === CANDIDATE_SCHEMA_V2
    ? normalizeBlueprintContractV2(index.blueprintAuthority, session)
    : null;
  if (schemaVersion === CANDIDATE_SCHEMA_V2 && blueprintAuthority
    && JSON.stringify(frozenBlueprintAuthority) !== JSON.stringify(blueprintAuthority)) {
    throw new Error("candidate_snapshot_index_invalid");
  }
  const candidatePrefix = normalizedRelative(repoRoot, candidateRoot);
  const expected = originalInputInventory(repoRoot, session, identity, schemaVersion).map(({ category, originalPath }) => ({
    category,
    originalPath,
    snapshotPath: `${candidatePrefix}/source-snapshot/${originalPath}`,
  })).sort((left, right) => left.originalPath.localeCompare(right.originalPath));
  const declared = index.entries.map(({ category, originalPath, snapshotPath }) => ({ category, originalPath, snapshotPath }))
    .sort((left, right) => left.originalPath.localeCompare(right.originalPath));
  if (JSON.stringify(declared) !== JSON.stringify(expected)) throw new Error("candidate_snapshot_inventory_mismatch");
  if (new Set(index.entries.map((entry) => entry.originalPath)).size !== index.entries.length) throw new Error("candidate_snapshot_origin_duplicate");
  const files = index.entries.map((entry) => {
    const absolute = path.resolve(repoRoot, ...String(entry.snapshotPath).split("/"));
    const expectedRoot = path.join(candidateRoot, "source-snapshot") + path.sep;
    if (!absolute.startsWith(expectedRoot) || normalizedRelative(repoRoot, absolute) !== entry.snapshotPath) throw new Error(`candidate_snapshot_path_invalid:${entry.snapshotPath}`);
    const bytes = schemaVersion === CANDIDATE_SCHEMA_V2
      ? readRegularFileContained(repoRoot, absolute, "candidate_snapshot_file")
      : fs.readFileSync(absolute);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`candidate_snapshot_file_mismatch:${entry.originalPath}`);
    return hashFile(repoRoot, entry.category, absolute);
  });
  files.push(hashFile(repoRoot, "snapshot_index", indexPath));
  return {
    files,
    indexPath: normalizedRelative(repoRoot, indexPath),
    indexSha256: sha256(indexBytes),
    origins: index.entries,
    blueprintAuthority: frozenBlueprintAuthority,
  };
}

function buildSessionCandidateReceiptInternal(options = {}, verifiedAcceptedPredecessors = null) {
  const {
    repoRoot = DEFAULT_REPO,
    candidateRoot,
    session,
    predecessorReceiptPath,
    revisionPredecessorReceiptPath,
    s01ReceiptPath,
  } = options;
  const identity = sessionIdentity(session);
  const schemaVersion = candidateSchema(options);
  if (!SUPPORTED_SESSIONS.has(session)) throw new Error(`unsupported_session_scope:${identity.courseSessionId}`);
  requireAcceptedPredecessorPaths(options);
  requireV2RevisionBindings(options);
  if (requiresAcceptedPredecessor(session, schemaVersion) && !verifiedAcceptedPredecessors) throw new Error(`s${identity.sessionNumber}_acceptance_validation_required`);
  const checkedCandidate = checkedCandidateRoot({ repoRoot, candidateRoot, sessionNumber: identity.sessionNumber });
  const snapshot = readCandidateSnapshot({ repoRoot, candidateRoot: checkedCandidate, session, identity, schemaVersion, blueprintAuthority: null });
  const blueprintAuthority = snapshot.blueprintAuthority;
  const projectionFiles = validateProjection({ repoRoot, candidateRoot: checkedCandidate, session, courseSessionId: identity.courseSessionId, blueprintAuthority });
  const previewExisting = PREVIEW_NAMES.filter((name) => fs.existsSync(path.join(checkedCandidate, name)));
  if (previewExisting.length !== 0 && previewExisting.length !== PREVIEW_NAMES.length) throw new Error(`candidate_preview_partial:${previewExisting.join(",")}`);
  if (schemaVersion === CANDIDATE_SCHEMA_V2) {
    rebuildAndVerifyV2Projection({
      repoRoot,
      candidateRoot: normalizedRelative(repoRoot, checkedCandidate),
      sourceSnapshotIndexPath: snapshot.indexPath,
      sourceSnapshotIndexSha256: snapshot.indexSha256,
    });
  }
  const candidateFiles = [...projectionFiles, ...previewExisting.map((name) => path.join(checkedCandidate, name))];
  const files = [
    ...snapshot.files,
    ...candidateFiles.map((absolute) => hashFile(repoRoot, "candidate", absolute)),
  ].sort((left, right) => left.path.localeCompare(right.path));
  if (new Set(files.map((entry) => entry.path)).size !== files.length) throw new Error("receipt_inventory_duplicate");
  const candidateEntries = files.filter((entry) => entry.category === "candidate");
  const candidateStable = JSON.stringify(candidateEntries.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })));
  const stable = JSON.stringify(files.map(({ category, path: file, bytes, sha256: digest }) => ({ category, path: file, bytes, sha256: digest })));
  const frozenRevisionPredecessor = revisionPredecessorReceiptPath
    ? verifyFrozenRevisionPredecessor({
        repoRoot,
        receiptPath: revisionPredecessorReceiptPath,
        expectedCourseSessionId: identity.courseSessionId,
      })
    : null;
  if (session === "en/l01/s04" && !predecessorReceiptPath) throw new Error("s04_predecessor_receipt_required");
  const candidateBundleSha256 = sha256(candidateStable);
  if (frozenRevisionPredecessor?.candidateBundleSha256 === candidateBundleSha256) {
    throw new Error("revision_candidate_bundle_unchanged");
  }
  return {
    schemaVersion,
    courseSessionId: identity.courseSessionId,
    releaseAuthority: false,
    candidateRoot: normalizedRelative(repoRoot, checkedCandidate),
    immutableContentOnly: true,
    candidateBundleSha256,
    fileCount: files.length,
    inventorySha256: sha256(stable),
    projection: {
      fileCount: PROJECTION_NAMES.length,
      introPages: blueprintAuthority?.introPlanItemCount ?? 3,
      practiceInteractions: blueprintAuthority?.activityPlanItemCount ?? EXPECTED_INTERACTION_COUNTS[session],
    },
    preview: { generated: previewExisting.length === PREVIEW_NAMES.length, fileCount: previewExisting.length },
    sourceSnapshot: { indexPath: snapshot.indexPath, indexSha256: snapshot.indexSha256, originCount: snapshot.origins.length },
    frozenPredecessor: identity.sessionNumber === "01"
      ? null
      : requiresAcceptedPredecessor(session, schemaVersion)
        ? verifiedAcceptedPredecessors.frozenPredecessor
        : verifyFrozenPredecessor({
          repoRoot,
          receiptPath: predecessorReceiptPath ?? s01ReceiptPath ?? path.join(repoRoot, "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013/content-receipt.json"),
          expectedCourseSessionId: `en:lesson-${identity.lesson}:session-${String(Number(identity.sessionNumber) - 1).padStart(2, "0")}`,
        }),
    ...(verifiedAcceptedPredecessors ? { acceptedPredecessor: verifiedAcceptedPredecessors.acceptedPredecessor } : {}),
    ...(frozenRevisionPredecessor ? { frozenRevisionPredecessor } : {}),
    ...(blueprintAuthority ? { blueprintAuthority } : {}),
    files,
  };
}

export function buildSessionCandidateReceipt(options = {}) {
  return buildSessionCandidateReceiptInternal(options);
}

export async function buildSessionCandidateReceiptForWrite(options = {}) {
  const acceptedPredecessors = await verifyAcceptedPredecessors(options);
  return buildSessionCandidateReceiptInternal(options, acceptedPredecessors);
}

export function buildInitialReviewManifest({ receipt }) {
  if (receipt.releaseAuthority !== false) throw new Error("receipt_release_authority_must_be_false");
  return {
    schemaVersion: "learning_v2_session_review_evidence_manifest_v1",
    courseSessionId: receipt.courseSessionId,
    candidateRoot: receipt.candidateRoot,
    candidateBundleSha256: receipt.candidateBundleSha256,
    candidateReceiptPath: `${receipt.candidateRoot}/content-receipt.json`,
    candidateReceiptInventorySha256: receipt.inventorySha256,
    requiredRoles: [...REQUIRED_ROLES],
    eligibleRoles: [],
    missingRoles: [...REQUIRED_ROLES],
    roles: [],
    textReviewComplete: false,
    releaseAuthority: false,
  };
}

function buildPrivatePreviewManifest({ receipt, receiptSha256 }) {
  const sessionNumber = sessionIdentity(receipt.courseSessionId.replace(/^([a-z]{2}):lesson-(\d{2}):session-(\d{2})$/u, "$1/l$2/s$3")).sessionNumber;
  const candidateFiles = receipt.files
    .filter((entry) => entry.category === "candidate" && entry.path.includes(`/en/l01/s${sessionNumber}/`))
    .map((entry) => ({
      path: entry.path.slice(`${receipt.candidateRoot}/`.length),
      bytes: entry.bytes,
      sha256: entry.sha256,
    }));
  return {
    schemaVersion: "learning_v2_session_private_preview_manifest_v1",
    courseSessionId: receipt.courseSessionId,
    releaseAuthority: false,
    reviewStatus: "HOLD",
    textVerified: false,
    textReviewEvidencePersisted: false,
    candidateRoot: receipt.candidateRoot,
    candidateReceiptPath: `${receipt.candidateRoot}/content-receipt.json`,
    candidateReceiptInventorySha256: receipt.inventorySha256,
    contentReceiptSha256: receiptSha256,
    candidateBundleSha256: receipt.candidateBundleSha256,
    candidateFiles,
    holdReason: "Current independent text reviews are not persisted as artifacts bound to this exact content receipt. This private preview is not release authority.",
    ...(receipt.schemaVersion === CANDIDATE_SCHEMA_V2 ? {
      revisionPredecessorReceiptPath: receipt.frozenRevisionPredecessor.receiptPath,
      revisionPredecessorReceiptSha256: receipt.frozenRevisionPredecessor.receiptSha256,
    } : {}),
  };
}

function sameFileIdentity(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function writeExclusiveDurableFile(root, targetPath, bytes, label, beforeOpen, afterOpenBeforeWrite) {
  const requestedRoot = path.resolve(root);
  const requestedParent = path.resolve(path.dirname(targetPath));
  const resolvedRoot = assertDirectoryContainedNoLinks(path.dirname(requestedRoot), requestedRoot, `${label}_root`);
  const capturedParent = requestedParent === requestedRoot
    ? resolvedRoot
    : assertDirectoryContainedNoLinks(resolvedRoot, requestedParent, `${label}_parent`);
  if (beforeOpen) beforeOpen({ rootPath: resolvedRoot, parentPath: path.dirname(targetPath), targetPath });
  const refreshedRoot = assertDirectoryContainedNoLinks(path.dirname(requestedRoot), requestedRoot, `${label}_parent`);
  if (refreshedRoot !== resolvedRoot) throw new Error(`${label}_parent_changed`);
  const verifiedParent = requestedParent === requestedRoot
    ? refreshedRoot
    : assertDirectoryContainedNoLinks(refreshedRoot, requestedParent, `${label}_parent`);
  if (verifiedParent !== capturedParent) throw new Error(`${label}_parent_changed`);
  const verifiedTarget = path.join(verifiedParent, path.basename(targetPath));
  let fd;
  let writtenIdentity;
  try {
    fd = fs.openSync(verifiedTarget, "wx");
    const opened = fs.fstatSync(fd);
    if (!opened.isFile()) throw new Error(`${label}_not_regular_file`);
    if (afterOpenBeforeWrite) afterOpenBeforeWrite({ rootPath: resolvedRoot, parentPath: requestedParent, targetPath: verifiedTarget });
    const openedPath = realRepoContainedPath(resolvedRoot, verifiedTarget, label);
    const named = fs.statSync(openedPath);
    if (path.dirname(openedPath) !== capturedParent || !sameFileIdentity(opened, named)) throw new Error(`${label}_changed`);
    fs.writeFileSync(fd, bytes);
    fs.fsyncSync(fd);
    const after = fs.fstatSync(fd);
    if (!sameFileIdentity(opened, after) || after.size !== bytes.length) throw new Error(`${label}_changed`);
    const finalRoot = assertDirectoryContainedNoLinks(path.dirname(requestedRoot), requestedRoot, `${label}_root`);
    const finalPath = realRepoContainedPath(finalRoot, verifiedTarget, label);
    const finalNamed = fs.statSync(finalPath);
    if (finalRoot !== resolvedRoot || path.dirname(finalPath) !== capturedParent || !sameFileIdentity(after, finalNamed)) {
      throw new Error(`${label}_changed`);
    }
    writtenIdentity = Object.freeze({ dev: after.dev, ino: after.ino, size: after.size });
  } catch (error) {
    if (error?.code === "EEXIST") throw new Error(`${label}_already_exists`);
    throw error;
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
  }
  return writtenIdentity;
}

function verifyPublishedArtifact(root, targetPath, expectedBytes, expectedIdentity, label) {
  let artifact;
  try {
    artifact = readRegularFileContainedWithIdentity(root, targetPath, label);
  } catch {
    throw new Error(`${label}_invalid`);
  }
  if (!artifact.bytes.equals(expectedBytes)
    || artifact.size !== expectedIdentity?.size
    || artifact.dev !== expectedIdentity?.dev
    || artifact.ino !== expectedIdentity?.ino) {
    throw new Error(`${label}_mismatch`);
  }
  return artifact;
}

function immutablePrivateHeadPath({ candidateRoot, receiptBytes }) {
  return path.join(candidateRoot, "private-heads", `${sha256(receiptBytes)}.json`);
}

function buildImmutablePrivateHead({ receipt, receiptBytes }) {
  return {
    ...buildPrivatePreviewManifest({ receipt, receiptSha256: sha256(receiptBytes) }),
    schemaVersion: "learning_v2_session_immutable_private_head_v2",
    immutable: true,
    mutablePointerAuthority: false,
  };
}

function verifyImmutablePrivateHead({ repoRoot, receipt, candidateReceiptSha256 }) {
  if (receipt?.schemaVersion !== CANDIDATE_SCHEMA_V2 || !/^[0-9a-f]{64}$/u.test(String(candidateReceiptSha256 ?? ""))) {
    throw new Error("candidate_immutable_private_head_invalid");
  }
  const expectedPath = `${receipt.candidateRoot}/private-heads/${candidateReceiptSha256}.json`;
  let bytes;
  let head;
  try {
    bytes = readRegularFileContained(repoRoot, path.resolve(repoRoot, ...expectedPath.split("/")), "candidate_immutable_private_head");
    head = JSON.parse(bytes.toString("utf8"));
  } catch {
    throw new Error("candidate_immutable_private_head_invalid");
  }
  if (head.schemaVersion !== "learning_v2_session_immutable_private_head_v2"
    || head.immutable !== true
    || head.mutablePointerAuthority !== false
    || head.releaseAuthority !== false
    || head.courseSessionId !== receipt.courseSessionId
    || head.candidateRoot !== receipt.candidateRoot
    || head.candidateReceiptPath !== `${receipt.candidateRoot}/content-receipt.json`
    || head.contentReceiptSha256 !== candidateReceiptSha256
    || head.candidateReceiptInventorySha256 !== receipt.inventorySha256
    || head.candidateBundleSha256 !== receipt.candidateBundleSha256) {
    throw new Error("candidate_immutable_private_head_invalid");
  }
  return Object.freeze({ path: expectedPath, sha256: sha256(bytes), bytes: bytes.length });
}

function verifyAdvancedOwnerReviewHead({ repoRoot, manifestPath, receipt, candidateReceiptPath, candidateReceiptSha256 }) {
  const frozenHead = receipt?.frozenOwnerReviewHead;
  const revision = receipt?.frozenRevisionPredecessor;
  if (!frozenHead || !revision
    || frozenHead.status !== "PASS"
    || frozenHead.candidateReceiptPath !== revision.receiptPath
    || frozenHead.contentReceiptSha256 !== revision.receiptSha256
    || !/^[0-9a-f]{64}$/u.test(String(frozenHead.manifestSha256 ?? ""))) {
    throw new Error("candidate_receipt_v2_owner_head_invalid");
  }
  const binding = canonicalRepoRelativePath(repoRoot, manifestPath, "s02_owner_review_manifest");
  let manifest;
  try {
    manifest = JSON.parse(readRegularFileContained(repoRoot, binding.absolute, "s02_owner_review_manifest").toString("utf8"));
  } catch {
    throw new Error("candidate_receipt_v2_owner_head_invalid");
  }
  if (binding.relative !== frozenHead.manifestPath
    || manifest.courseSessionId !== receipt.courseSessionId
    || manifest.releaseAuthority !== false
    || manifest.candidateReceiptPath !== candidateReceiptPath
    || manifest.contentReceiptSha256 !== candidateReceiptSha256
    || manifest.candidateBundleSha256 !== receipt.candidateBundleSha256
    || manifest.revisionPredecessorReceiptPath !== revision.receiptPath
    || manifest.revisionPredecessorReceiptSha256 !== revision.receiptSha256
    || manifest.previousOwnerReviewManifestSha256 !== frozenHead.manifestSha256) {
    throw new Error("candidate_receipt_v2_owner_head_invalid");
  }
  return Object.freeze({
    manifestPath: binding.relative,
    manifestSha256: sha256(readRegularFileContained(repoRoot, binding.absolute, "s02_owner_review_manifest")),
  });
}

async function advanceOwnerReviewPreviewHead({
  repoRoot,
  session,
  ownerReviewManifestPath,
  receipt,
  receiptBytes,
  beforeOwnerHeadCommit,
}) {
  const manifestPath = absoluteFromRepo(
    repoRoot,
    ownerReviewManifestPath ?? `content/learning-v2-course/sessions/${session}/owner-review-preview-manifest.json`,
  );
  const expected = receipt.frozenRevisionPredecessor;
  if (!expected) return;
  const manifestParent = path.dirname(manifestPath);
  const capturedParent = assertDirectoryContainedNoLinks(repoRoot, manifestParent, "owner_review_manifest_parent");
  readRegularFileContained(repoRoot, manifestPath, "owner_review_manifest");
  const capturedTarget = fs.realpathSync(manifestPath);
  if (path.dirname(capturedTarget) !== capturedParent) {
    throw new Error("revision_head_changed");
  }
  const targetPath = capturedTarget;
  const lockPath = `${targetPath}.revision-head.lock`;
  const temporaryPath = `${targetPath}.revision-head-${process.pid}-${crypto.randomBytes(8).toString("hex")}.tmp`;
  let lockFd;
  let ownsLock = false;
  let temporaryWritten = false;
  try {
    try {
      lockFd = fs.openSync(lockPath, "wx");
      ownsLock = true;
    } catch (error) {
      if (error.code === "EEXIST") throw new Error("revision_head_changed");
      throw error;
    }
    const currentBytes = readRegularFileContained(repoRoot, manifestPath, "owner_review_manifest");
    const current = JSON.parse(currentBytes.toString("utf8"));
    if (current.courseSessionId !== receipt.courseSessionId
      || current.releaseAuthority !== false
      || current.candidateReceiptPath !== expected.receiptPath
      || current.contentReceiptSha256 !== expected.receiptSha256
      || (receipt.frozenOwnerReviewHead
        && (normalizedRelative(repoRoot, targetPath) !== receipt.frozenOwnerReviewHead.manifestPath
          || sha256(currentBytes) !== receipt.frozenOwnerReviewHead.manifestSha256))) {
      throw new Error("revision_head_changed");
    }
    const next = buildPrivatePreviewManifest({ receipt, receiptSha256: sha256(receiptBytes) });
    const nextBytes = Buffer.from(`${JSON.stringify(next, null, 2)}\n`, "utf8");
    const temporaryFd = fs.openSync(temporaryPath, "wx");
    try {
      fs.writeFileSync(temporaryFd, nextBytes);
      fs.fsyncSync(temporaryFd);
      temporaryWritten = true;
    } finally {
      fs.closeSync(temporaryFd);
    }
    if (beforeOwnerHeadCommit) await beforeOwnerHeadCommit({ manifestPath, targetPath, temporaryPath });
    const resolvedParent = assertDirectoryContainedNoLinks(repoRoot, manifestParent, "owner_review_manifest_parent");
    if (resolvedParent !== capturedParent || fs.realpathSync(manifestPath) !== targetPath) throw new Error("revision_head_changed");
    const latestBytes = readRegularFileContained(repoRoot, manifestPath, "owner_review_manifest");
    if (!latestBytes.equals(currentBytes)) throw new Error("revision_head_changed");
    fs.renameSync(temporaryPath, targetPath);
    temporaryWritten = false;
  } finally {
    if (lockFd !== undefined) fs.closeSync(lockFd);
    if (ownsLock && fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
    if (temporaryWritten && fs.existsSync(temporaryPath)) fs.unlinkSync(temporaryPath);
  }
}

export async function writeSessionCandidateEvidence(options) {
  const receiptPath = path.join(path.resolve(options.candidateRoot), "content-receipt.json");
  const manifestPath = path.join(path.resolve(options.candidateRoot), "review-evidence-manifest.json");
  requireAcceptedPredecessorPaths(options);
  requireV2RevisionBindings(options);
  if (fs.existsSync(receiptPath) || fs.existsSync(manifestPath)) throw new Error("candidate_evidence_already_exists");
  await verifyAcceptedPredecessors(options);
  await prepareSessionCandidateSnapshot(options);
  return materializePreparedSessionCandidateEvidence(options);
}

export async function materializePreparedSessionCandidateEvidence(options) {
  let receiptPath = path.join(path.resolve(options.candidateRoot), "content-receipt.json");
  let manifestPath = path.join(path.resolve(options.candidateRoot), "review-evidence-manifest.json");
  requireAcceptedPredecessorPaths(options);
  requireV2RevisionBindings(options);
  if (fs.existsSync(receiptPath) || fs.existsSync(manifestPath)) throw new Error("candidate_evidence_already_exists");
  const receipt = await buildSessionCandidateReceiptForWrite(options);
  const manifest = buildInitialReviewManifest({ receipt });
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  const identity = sessionIdentity(options.session);
  const checkedCandidate = checkedCandidateRoot({
    repoRoot: options.repoRoot ?? DEFAULT_REPO,
    candidateRoot: options.candidateRoot,
    sessionNumber: identity.sessionNumber,
  });
  if (normalizedRelative(options.repoRoot ?? DEFAULT_REPO, checkedCandidate) !== receipt.candidateRoot) {
    throw new Error("candidate_root_changed_before_publication");
  }
  receiptPath = path.join(checkedCandidate, "content-receipt.json");
  manifestPath = path.join(checkedCandidate, "review-evidence-manifest.json");
  if (receipt.schemaVersion === CANDIDATE_SCHEMA_V2) {
    const immutableHeadsRoot = path.join(checkedCandidate, "private-heads");
    ensureContainedDirectoryTree(checkedCandidate, immutableHeadsRoot, "candidate_immutable_private_heads");
    const immutableHeadPath = immutablePrivateHeadPath({ candidateRoot: checkedCandidate, receiptBytes });
    const immutableHeadBytes = Buffer.from(`${JSON.stringify(buildImmutablePrivateHead({ receipt, receiptBytes }), null, 2)}\n`, "utf8");
    const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, "utf8");
    const immutableHeadIdentity = writeExclusiveDurableFile(
      checkedCandidate,
      immutableHeadPath,
      immutableHeadBytes,
      "candidate_immutable_private_head",
      options.beforeV2PrivateHeadOpen,
      options.afterV2PrivateHeadOpenBeforeWrite,
    );
    try {
      const manifestIdentity = writeExclusiveDurableFile(
        checkedCandidate,
        manifestPath,
        manifestBytes,
        "candidate_review_manifest",
        options.beforeV2ManifestOpen,
        options.afterV2ManifestOpenBeforeWrite,
      );
      if (options.beforeV2ReceiptCommit) await options.beforeV2ReceiptCommit({ immutableHeadPath, manifestPath, receiptPath });
      const finalCandidate = checkedCandidateRoot({ repoRoot: options.repoRoot ?? DEFAULT_REPO, candidateRoot: options.candidateRoot, sessionNumber: identity.sessionNumber });
      if (finalCandidate !== checkedCandidate) throw new Error("candidate_root_changed_before_receipt");
      verifyPublishedArtifact(checkedCandidate, immutableHeadPath, immutableHeadBytes, immutableHeadIdentity, "candidate_publication_immutable_head");
      verifyPublishedArtifact(checkedCandidate, manifestPath, manifestBytes, manifestIdentity, "candidate_publication_review_manifest");
      verifyImmutablePrivateHead({
        repoRoot: options.repoRoot ?? DEFAULT_REPO,
        receipt,
        candidateReceiptSha256: sha256(receiptBytes),
      });
      writeExclusiveDurableFile(
        checkedCandidate,
        receiptPath,
        receiptBytes,
        "candidate_content_receipt",
        options.beforeV2ContentReceiptOpen,
        options.afterV2ContentReceiptOpenBeforeWrite,
      );
    } catch (error) {
      throw error;
    }
  } else {
    await writeMockupFile(receiptPath, receiptBytes);
    checkedCandidateRoot({ repoRoot: options.repoRoot ?? DEFAULT_REPO, candidateRoot: options.candidateRoot, sessionNumber: identity.sessionNumber });
    await writeMockupFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    await advanceOwnerReviewPreviewHead({ ...options, receipt, receiptBytes });
  }
  return receipt;
}

export {
  validateProjection as validateSessionCandidateProjection,
  verifyAcceptedPreviousPredecessor,
  verifyAdvancedOwnerReviewHead,
  verifyFrozenAcceptedPredecessor,
  verifyFrozenRevisionPredecessor,
  verifyImmutablePrivateHead,
};

function parseCli(args) {
  const result = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help") return { help: true };
    if (!["--session", "--candidate", "--receipt-version", "--s01-receipt", "--predecessor-receipt", "--accepted-predecessor-receipt", "--revision-predecessor-receipt", "--owner-review-manifest"].includes(arg)) throw new Error(`unknown_argument:${arg}`);
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error(`missing_value:${arg}`);
    const key = {
      "s01-receipt": "s01ReceiptPath",
      "predecessor-receipt": "predecessorReceiptPath",
      "accepted-predecessor-receipt": "acceptedPredecessorReceiptPath",
      "revision-predecessor-receipt": "revisionPredecessorReceiptPath",
      "owner-review-manifest": "ownerReviewManifestPath",
      "receipt-version": "receiptSchemaVersion",
    }[arg.slice(2)] ?? arg.slice(2);
    result[key] = value;
  }
  if (!result.session || !result.candidate) throw new Error("session_and_candidate_required");
  return result;
}

async function main(args = process.argv.slice(2)) {
  try {
    const parsed = parseCli(args);
    if (parsed.help) { console.log(USAGE); return 0; }
    const receipt = await writeSessionCandidateEvidence({
      repoRoot: DEFAULT_REPO,
      candidateRoot: path.resolve(parsed.candidate),
      session: parsed.session,
      ...(parsed.receiptSchemaVersion ? { receiptSchemaVersion: parsed.receiptSchemaVersion } : {}),
      ...(parsed.predecessorReceiptPath ? { predecessorReceiptPath: /^en\/l01\/s0[56]$/u.test(parsed.session) ? parsed.predecessorReceiptPath : path.resolve(parsed.predecessorReceiptPath) } : {}),
      ...(parsed.acceptedPredecessorReceiptPath ? { acceptedPredecessorReceiptPath: /^en\/l01\/s0[56]$/u.test(parsed.session) ? parsed.acceptedPredecessorReceiptPath : path.resolve(parsed.acceptedPredecessorReceiptPath) } : {}),
      ...(parsed.revisionPredecessorReceiptPath ? { revisionPredecessorReceiptPath: path.resolve(parsed.revisionPredecessorReceiptPath) } : {}),
      ...(parsed.ownerReviewManifestPath ? { ownerReviewManifestPath: path.resolve(parsed.ownerReviewManifestPath) } : {}),
      ...(parsed.s01ReceiptPath ? { s01ReceiptPath: path.resolve(parsed.s01ReceiptPath) } : {}),
    });
    console.log(JSON.stringify({ output: `${receipt.candidateRoot}/content-receipt.json`, files: receipt.fileCount, candidateBundleSha256: receipt.candidateBundleSha256, inventorySha256: receipt.inventorySha256 }));
    return 0;
  } catch (error) {
    console.error(`[SESSION_RECEIPT][ERROR] ${error.message}`);
    console.error(USAGE);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();

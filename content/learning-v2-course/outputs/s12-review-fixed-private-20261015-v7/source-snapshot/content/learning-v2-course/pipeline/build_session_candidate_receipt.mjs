#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validateSessionAcceptanceReceipt } from "./session_acceptance_receipt.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(PIPELINE, "../../..");
const REQUIRED_ROLES = Object.freeze(["learner", "reader", "pedagogy", "nonsense", "taste", "progression", "locale"]);
const PROJECTION_NAMES = Object.freeze(["intro.json", "auxiliary.json", "learner.json", "learner.uk.json", "answers.json"]);
const PREVIEW_NAMES = Object.freeze(["index.html", "external.html", "app.js", "data.js"]);
const SUPPORTED_SESSIONS = new Set(["en/l01/s01", "en/l01/s02", "en/l01/s03", "en/l01/s04", "en/l01/s05", "en/l01/s06", "en/l01/s07", "en/l01/s08", "en/l01/s09", "en/l01/s10", "en/l01/s11", "en/l01/s12"]);
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
});
const SOURCE_EVIDENCE_BY_SESSION = Object.freeze({
  "en/l01/s01": "content/learning-v2-course/judgements/2026-10-13_l01_s01_source_evidence.md",
  "en/l01/s02": "content/learning-v2-course/judgements/2026-10-13_l01_s02_source_evidence.md",
});
const EXPLANATION_SIDECAR_SESSIONS = new Set(["en/l01/s01", "en/l01/s02"]);
const USAGE = "Usage: node build_session_candidate_receipt.mjs --session en/l01/s01|en/l01/s02|en/l01/s03|en/l01/s04|en/l01/s05|en/l01/s06|en/l01/s07|en/l01/s08|en/l01/s09|en/l01/s10|en/l01/s11|en/l01/s12 --candidate <new-candidate-directory> [--predecessor-receipt <frozen-previous-course-content-receipt>] [--accepted-predecessor-receipt <validated-previous-session-acceptance-receipt>] [--revision-predecessor-receipt <frozen-current-session-content-receipt>] [--owner-review-manifest <current-owner-review-preview-manifest>]";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

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
  return { absolute, relative };
}

function checkedCandidateRoot({ repoRoot, candidateRoot, sessionNumber }) {
  const outputs = path.resolve(repoRoot, "content/learning-v2-course/outputs");
  const absolute = path.resolve(candidateRoot);
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isDirectory()) throw new Error(`candidate_root_missing:${candidateRoot}`);
  const realOutputs = fs.realpathSync(outputs);
  const realCandidate = fs.realpathSync(absolute);
  if (path.dirname(realCandidate) !== realOutputs || !new RegExp(`^s${sessionNumber}-[a-z0-9][a-z0-9-]*$`, "u").test(path.basename(realCandidate))) {
    throw new Error(`candidate_root_not_direct_output_child:${candidateRoot}`);
  }
  return realCandidate;
}

function hashFile(repoRoot, category, absolute) {
  const bytes = fs.readFileSync(absolute);
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
  const predecessorBinding = canonicalRepoRelativePath(repoRoot, receiptPath, `${errorPrefix}_predecessor_receipt`);
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
  return {
    status: "PASS",
    receiptPath: normalizedRelative(repoRoot, absoluteReceipt),
    receiptSha256: sha256(storedBytes),
    inventorySha256: stored.inventorySha256,
    candidateBundleSha256: stored.candidateBundleSha256,
  };
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

function requireAcceptedPredecessorPaths({ session, predecessorReceiptPath, acceptedPredecessorReceiptPath }) {
  if (!/^en\/l01\/s0[5-9]$|^en\/l01\/s1[012]$/u.test(session ?? "")) return;
  const errorPrefix = `s${session.slice(-2)}`;
  if (!predecessorReceiptPath) throw new Error(`${errorPrefix}_predecessor_receipt_required`);
  if (!acceptedPredecessorReceiptPath) throw new Error(`${errorPrefix}_accepted_predecessor_receipt_required`);
}

async function verifyAcceptedPredecessors(options = {}) {
  if (!/^en\/l01\/s0[5-9]$|^en\/l01\/s1[012]$/u.test(options.session ?? "")) return null;
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

function verifyFrozenRevisionPredecessor({ repoRoot, receiptPath, expectedCourseSessionId }) {
  const absoluteReceipt = path.resolve(receiptPath);
  let storedBytes;
  let stored;
  try {
    storedBytes = fs.readFileSync(absoluteReceipt);
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
    const absolute = path.resolve(repoRoot, ...entry.path.split("/"));
    if (normalizedRelative(repoRoot, absolute) !== entry.path) throw new Error(`frozen_revision_predecessor_path_invalid:${entry.path}`);
    const bytes = fs.readFileSync(absolute);
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
    receiptPath: normalizedRelative(repoRoot, absoluteReceipt),
    receiptSha256: sha256(storedBytes),
    inventorySha256: stored.inventorySha256,
    candidateBundleSha256: stored.candidateBundleSha256,
  };
}

function validateProjection({ candidateRoot, session, courseSessionId }) {
  const expectedInteractionCount = EXPECTED_INTERACTION_COUNTS[session];
  if (!Number.isInteger(expectedInteractionCount)) throw new Error(`candidate_session_inventory_unknown:${session}`);
  const projectionRoot = path.join(candidateRoot, ...session.split("/"));
  const documents = Object.fromEntries(PROJECTION_NAMES.map((name) => {
    const absolute = path.join(projectionRoot, name);
    if (!fs.existsSync(absolute)) throw new Error(`candidate_projection_missing:${name}`);
    return [name, JSON.parse(fs.readFileSync(absolute, "utf8"))];
  }));
  for (const name of ["intro.json", "auxiliary.json", "learner.json", "learner.uk.json"]) {
    if (documents[name].courseSessionId !== courseSessionId) throw new Error(`candidate_course_session_mismatch:${name}`);
  }
  if (documents["intro.json"].pages?.length !== 3 || documents["intro.json"].pageCount !== 3) throw new Error("candidate_intro_inventory_mismatch");
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

function originalInputInventory(repoRoot, session, identity) {
  if (!SUPPORTED_SESSIONS.has(session)) throw new Error(`unsupported_session_scope:${identity.courseSessionId}`);
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
      "content/learning-v2-course/pipeline/build_session_candidate_receipt.mjs",
      "content/learning-v2-course/pipeline/build_session_candidate_receipt.test.mjs",
      ...(Number(identity.sessionNumber) >= 5 ? ["content/learning-v2-course/pipeline/session_acceptance_receipt.mjs"] : []),
    ].map((relative) => ["contract", relative]),
  ];
  return rows.map(([category, originalPath]) => ({ category, originalPath, absolute: path.join(repoRoot, ...originalPath.split("/")) }));
}

export async function prepareSessionCandidateSnapshot({ repoRoot = DEFAULT_REPO, candidateRoot, session } = {}) {
  const identity = sessionIdentity(session);
  const checkedCandidate = checkedCandidateRoot({ repoRoot, candidateRoot, sessionNumber: identity.sessionNumber });
  const snapshotRoot = path.join(checkedCandidate, "source-snapshot");
  if (fs.existsSync(snapshotRoot)) throw new Error("candidate_snapshot_already_exists");
  const entries = [];
  for (const { category, originalPath, absolute } of originalInputInventory(repoRoot, session, identity)) {
    const snapshotAbsolute = path.join(snapshotRoot, ...originalPath.split("/"));
    const bytes = fs.readFileSync(absolute);
    fs.mkdirSync(path.dirname(snapshotAbsolute), { recursive: true });
    await writeMockupFile(snapshotAbsolute, bytes);
    entries.push({
      category,
      originalPath,
      snapshotPath: normalizedRelative(repoRoot, snapshotAbsolute),
      bytes: bytes.length,
      sha256: sha256(bytes),
    });
  }
  entries.sort((left, right) => left.originalPath.localeCompare(right.originalPath));
  const index = { schemaVersion: "learning_v2_session_source_snapshot_v1", courseSessionId: identity.courseSessionId, entries };
  await writeMockupFile(path.join(snapshotRoot, "index.json"), `${JSON.stringify(index, null, 2)}\n`);
  return index;
}

function readCandidateSnapshot({ repoRoot, candidateRoot, session, identity }) {
  const indexPath = path.join(candidateRoot, "source-snapshot/index.json");
  const indexBytes = fs.readFileSync(indexPath);
  const index = JSON.parse(indexBytes.toString("utf8"));
  if (index.schemaVersion !== "learning_v2_session_source_snapshot_v1" || index.courseSessionId !== identity.courseSessionId || !Array.isArray(index.entries)) {
    throw new Error("candidate_snapshot_index_invalid");
  }
  const candidatePrefix = normalizedRelative(repoRoot, candidateRoot);
  const expected = originalInputInventory(repoRoot, session, identity).map(({ category, originalPath }) => ({
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
    const bytes = fs.readFileSync(absolute);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`candidate_snapshot_file_mismatch:${entry.originalPath}`);
    return hashFile(repoRoot, entry.category, absolute);
  });
  files.push(hashFile(repoRoot, "snapshot_index", indexPath));
  return { files, indexPath: normalizedRelative(repoRoot, indexPath), indexSha256: sha256(indexBytes), origins: index.entries };
}

function buildSessionCandidateReceiptInternal(options = {}, verifiedAcceptedPredecessors = null) {
  const {
    repoRoot = DEFAULT_REPO,
    candidateRoot,
    session,
    predecessorReceiptPath,
    acceptedPredecessorReceiptPath,
    revisionPredecessorReceiptPath,
    s01ReceiptPath,
  } = options;
  const identity = sessionIdentity(session);
  if (!SUPPORTED_SESSIONS.has(session)) throw new Error(`unsupported_session_scope:${identity.courseSessionId}`);
  requireAcceptedPredecessorPaths({ session, predecessorReceiptPath, acceptedPredecessorReceiptPath });
  if ((/^en\/l01\/s0[5678]$/u.test(session) || session === "en/l01/s10" || session === "en/l01/s11" || session === "en/l01/s12") && !verifiedAcceptedPredecessors) throw new Error(`s${identity.sessionNumber}_acceptance_validation_required`);
  const checkedCandidate = checkedCandidateRoot({ repoRoot, candidateRoot, sessionNumber: identity.sessionNumber });
  const projectionFiles = validateProjection({ candidateRoot: checkedCandidate, session, courseSessionId: identity.courseSessionId });
  const previewExisting = PREVIEW_NAMES.filter((name) => fs.existsSync(path.join(checkedCandidate, name)));
  if (previewExisting.length !== 0 && previewExisting.length !== PREVIEW_NAMES.length) throw new Error(`candidate_preview_partial:${previewExisting.join(",")}`);
  const snapshot = readCandidateSnapshot({ repoRoot, candidateRoot: checkedCandidate, session, identity });
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
    schemaVersion: "learning_v2_session_candidate_content_receipt_v1",
    courseSessionId: identity.courseSessionId,
    releaseAuthority: false,
    candidateRoot: normalizedRelative(repoRoot, checkedCandidate),
    immutableContentOnly: true,
    candidateBundleSha256,
    fileCount: files.length,
    inventorySha256: sha256(stable),
    projection: { fileCount: PROJECTION_NAMES.length, introPages: 3, practiceInteractions: EXPECTED_INTERACTION_COUNTS[session] },
    preview: { generated: previewExisting.length === PREVIEW_NAMES.length, fileCount: previewExisting.length },
    sourceSnapshot: { indexPath: snapshot.indexPath, indexSha256: snapshot.indexSha256, originCount: snapshot.origins.length },
    frozenPredecessor: identity.sessionNumber === "01"
      ? null
      : (/^en\/l01\/s0[5678]$/u.test(session) || session === "en/l01/s10" || session === "en/l01/s11" || session === "en/l01/s12")
        ? verifiedAcceptedPredecessors.frozenPredecessor
        : verifyFrozenPredecessor({
          repoRoot,
          receiptPath: predecessorReceiptPath ?? s01ReceiptPath ?? path.join(repoRoot, "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013/content-receipt.json"),
          expectedCourseSessionId: `en:lesson-${identity.lesson}:session-${String(Number(identity.sessionNumber) - 1).padStart(2, "0")}`,
        }),
    ...(verifiedAcceptedPredecessors ? { acceptedPredecessor: verifiedAcceptedPredecessors.acceptedPredecessor } : {}),
    ...(frozenRevisionPredecessor ? { frozenRevisionPredecessor } : {}),
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
  };
}

async function advanceOwnerReviewPreviewHead({ repoRoot, session, ownerReviewManifestPath, receipt, receiptBytes }) {
  const manifestPath = path.resolve(ownerReviewManifestPath ?? path.join(repoRoot, `content/learning-v2-course/sessions/${session}/owner-review-preview-manifest.json`));
  const expected = receipt.frozenRevisionPredecessor;
  if (!expected) return;
  const lockPath = `${manifestPath}.revision-head.lock`;
  let lockFd;
  let ownsLock = false;
  try {
    try {
      lockFd = fs.openSync(lockPath, "wx");
      ownsLock = true;
    } catch (error) {
      if (error.code === "EEXIST") throw new Error("revision_head_changed");
      throw error;
    }
    const current = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    if (current.courseSessionId !== receipt.courseSessionId
      || current.releaseAuthority !== false
      || current.candidateReceiptPath !== expected.receiptPath
      || current.contentReceiptSha256 !== expected.receiptSha256) {
      throw new Error("revision_head_changed");
    }
    const next = buildPrivatePreviewManifest({ receipt, receiptSha256: sha256(receiptBytes) });
    await writeMockupFile(manifestPath, `${JSON.stringify(next, null, 2)}\n`);
  } finally {
    if (lockFd !== undefined) fs.closeSync(lockFd);
    if (ownsLock && fs.existsSync(lockPath)) fs.unlinkSync(lockPath);
  }
}

export async function writeSessionCandidateEvidence(options) {
  const receiptPath = path.join(path.resolve(options.candidateRoot), "content-receipt.json");
  const manifestPath = path.join(path.resolve(options.candidateRoot), "review-evidence-manifest.json");
  requireAcceptedPredecessorPaths(options);
  if (fs.existsSync(receiptPath) || fs.existsSync(manifestPath)) throw new Error("candidate_evidence_already_exists");
  await verifyAcceptedPredecessors(options);
  await prepareSessionCandidateSnapshot(options);
  return materializePreparedSessionCandidateEvidence(options);
}

export async function materializePreparedSessionCandidateEvidence(options) {
  const receiptPath = path.join(path.resolve(options.candidateRoot), "content-receipt.json");
  const manifestPath = path.join(path.resolve(options.candidateRoot), "review-evidence-manifest.json");
  requireAcceptedPredecessorPaths(options);
  if (fs.existsSync(receiptPath) || fs.existsSync(manifestPath)) throw new Error("candidate_evidence_already_exists");
  const receipt = await buildSessionCandidateReceiptForWrite(options);
  const manifest = buildInitialReviewManifest({ receipt });
  const receiptBytes = Buffer.from(`${JSON.stringify(receipt, null, 2)}\n`, "utf8");
  await writeMockupFile(receiptPath, receiptBytes);
  await writeMockupFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  await advanceOwnerReviewPreviewHead({ ...options, receipt, receiptBytes });
  return receipt;
}

function parseCli(args) {
  const result = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help") return { help: true };
    if (!["--session", "--candidate", "--s01-receipt", "--predecessor-receipt", "--accepted-predecessor-receipt", "--revision-predecessor-receipt", "--owner-review-manifest"].includes(arg)) throw new Error(`unknown_argument:${arg}`);
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error(`missing_value:${arg}`);
    const key = {
      "s01-receipt": "s01ReceiptPath",
      "predecessor-receipt": "predecessorReceiptPath",
      "accepted-predecessor-receipt": "acceptedPredecessorReceiptPath",
      "revision-predecessor-receipt": "revisionPredecessorReceiptPath",
      "owner-review-manifest": "ownerReviewManifestPath",
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

#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { writeMockupFile } from "./write_mockup_file.mjs";

const PIPELINE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(PIPELINE, "../../..");
const REQUIRED_ROLES = Object.freeze(["learner", "reader", "pedagogy", "nonsense", "taste", "progression", "locale"]);
const PROJECTION_NAMES = Object.freeze(["intro.json", "auxiliary.json", "learner.json", "learner.uk.json", "answers.json"]);
const PREVIEW_NAMES = Object.freeze(["index.html", "external.html", "app.js", "data.js"]);
const USAGE = "Usage: node build_session_candidate_receipt.mjs --session en/l01/s02 --candidate <new-candidate-directory> [--s01-receipt <frozen-s01-content-receipt>]";

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

function verifyFrozenS01({ repoRoot, receiptPath }) {
  const absoluteReceipt = path.resolve(receiptPath);
  const storedBytes = fs.readFileSync(absoluteReceipt);
  const stored = JSON.parse(storedBytes.toString("utf8"));
  if (stored.courseSessionId !== "en:lesson-01:session-01" || stored.releaseAuthority !== false || stored.immutableContentOnly !== true) {
    throw new Error("frozen_predecessor_receipt_invalid");
  }
  if (!Array.isArray(stored.files) || stored.fileCount !== stored.files.length) throw new Error("frozen_predecessor_inventory_invalid");
  for (const entry of stored.files) {
    const absolute = path.resolve(repoRoot, ...String(entry.path).split("/"));
    if (normalizedRelative(repoRoot, absolute) !== entry.path) throw new Error(`frozen_predecessor_path_invalid:${entry.path}`);
    const bytes = fs.readFileSync(absolute);
    if (bytes.length !== entry.bytes || sha256(bytes) !== entry.sha256) throw new Error(`frozen_predecessor_file_mismatch:${entry.path}`);
  }
  const stable = JSON.stringify(stored.files.map(({ path: file, bytes, sha256: digest }) => ({ path: file, bytes, sha256: digest })));
  if (sha256(stable) !== stored.inventorySha256) throw new Error("frozen_predecessor_inventory_sha_mismatch");
  return {
    status: "PASS",
    receiptPath: normalizedRelative(repoRoot, absoluteReceipt),
    receiptSha256: sha256(storedBytes),
    inventorySha256: stored.inventorySha256,
  };
}

function validateProjection({ candidateRoot, session, courseSessionId }) {
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
    if (documents[name].interactions?.length !== 21 || documents[name].practiceInteractionCount !== 21) throw new Error(`candidate_practice_inventory_mismatch:${name}`);
  }
  const answers = documents["answers.json"];
  if (!Array.isArray(answers) || answers.length !== 21 || answers.some((entry) => !String(entry.interactionId ?? "").startsWith(`${courseSessionId}:`))) {
    throw new Error("candidate_answers_inventory_mismatch");
  }
  const identitySets = ["learner.json", "learner.uk.json"].map((name) => documents[name].interactions.map((entry) => entry.interactionId));
  const answerIdentities = answers.map((entry) => entry.interactionId);
  if (identitySets.some((identities) => new Set(identities).size !== 21)
    || new Set(answerIdentities).size !== 21
    || JSON.stringify([...identitySets[0]].sort()) !== JSON.stringify([...identitySets[1]].sort())
    || JSON.stringify([...identitySets[0]].sort()) !== JSON.stringify([...answerIdentities].sort())) {
    throw new Error("candidate_interaction_identity_mismatch");
  }
  return PROJECTION_NAMES.map((name) => path.join(projectionRoot, name));
}

function originalInputInventory(repoRoot, session, identity) {
  if (identity.courseSessionId !== "en:lesson-01:session-02") throw new Error(`unsupported_session_scope:${identity.courseSessionId}`);
  const sessionBase = `content/learning-v2-course/sessions/${session}`;
  const rows = [
    ...["final.ru.md", "final.uk.md", "locales_batch.md", "practice.atomic.json", "practice.explanations.v1.json"].map((name) => ["source", `${sessionBase}/${name}`]),
    ...[
      "content/learning-v2-course/judgements/2026-10-13_l01_s02_source_evidence.md",
      `content/learning-v2-course/curriculum/${identity.language}/ПЛАН_КУРСА.md`,
      "content/learning-v2-course/migration/single-phrase-2026-10-03/preservation-ledger.json",
    ].map((relative) => ["evidence", relative]),
    ...[
      "content/learning-v2-course/pipeline/build_release.mjs",
      "content/learning-v2-course/pipeline/practice_explanations_v1.mjs",
      `content/learning-v2-course/pipeline/l${identity.lesson}s${identity.sessionNumber}_feedback_repair.test.mjs`,
      "content/learning-v2-course/pipeline/build_session_candidate_receipt.mjs",
      "content/learning-v2-course/pipeline/build_session_candidate_receipt.test.mjs",
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

export function buildSessionCandidateReceipt({
  repoRoot = DEFAULT_REPO,
  candidateRoot,
  session,
  s01ReceiptPath = path.join(repoRoot, "content/learning-v2-course/outputs/s01-i13-scene-fixed-20261013/content-receipt.json"),
} = {}) {
  const identity = sessionIdentity(session);
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
  return {
    schemaVersion: "learning_v2_session_candidate_content_receipt_v1",
    courseSessionId: identity.courseSessionId,
    releaseAuthority: false,
    candidateRoot: normalizedRelative(repoRoot, checkedCandidate),
    immutableContentOnly: true,
    candidateBundleSha256: sha256(candidateStable),
    fileCount: files.length,
    inventorySha256: sha256(stable),
    projection: { fileCount: PROJECTION_NAMES.length, introPages: 3, practiceInteractions: 21 },
    preview: { generated: previewExisting.length === PREVIEW_NAMES.length, fileCount: previewExisting.length },
    sourceSnapshot: { indexPath: snapshot.indexPath, indexSha256: snapshot.indexSha256, originCount: snapshot.origins.length },
    frozenPredecessor: verifyFrozenS01({ repoRoot, receiptPath: s01ReceiptPath }),
    files,
  };
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

export async function writeSessionCandidateEvidence(options) {
  const receiptPath = path.join(path.resolve(options.candidateRoot), "content-receipt.json");
  const manifestPath = path.join(path.resolve(options.candidateRoot), "review-evidence-manifest.json");
  if (fs.existsSync(receiptPath) || fs.existsSync(manifestPath)) throw new Error("candidate_evidence_already_exists");
  await prepareSessionCandidateSnapshot(options);
  const receipt = buildSessionCandidateReceipt(options);
  const manifest = buildInitialReviewManifest({ receipt });
  await writeMockupFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
  await writeMockupFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return receipt;
}

function parseCli(args) {
  const result = {};
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (arg === "--help") return { help: true };
    if (!["--session", "--candidate", "--s01-receipt"].includes(arg)) throw new Error(`unknown_argument:${arg}`);
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error(`missing_value:${arg}`);
    result[arg.slice(2).replace("s01-receipt", "s01ReceiptPath")] = value;
  }
  if (!result.session || !result.candidate) throw new Error("session_and_candidate_required");
  return result;
}

async function main(args = process.argv.slice(2)) {
  try {
    const parsed = parseCli(args);
    if (parsed.help) { console.log(USAGE); return 0; }
    const receipt = await writeSessionCandidateEvidence({ repoRoot: DEFAULT_REPO, candidateRoot: path.resolve(parsed.candidate), session: parsed.session, ...(parsed.s01ReceiptPath ? { s01ReceiptPath: path.resolve(parsed.s01ReceiptPath) } : {}) });
    console.log(JSON.stringify({ output: `${receipt.candidateRoot}/content-receipt.json`, files: receipt.fileCount, candidateBundleSha256: receipt.candidateBundleSha256, inventorySha256: receipt.inventorySha256 }));
    return 0;
  } catch (error) {
    console.error(`[SESSION_RECEIPT][ERROR] ${error.message}`);
    console.error(USAGE);
    return 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = await main();

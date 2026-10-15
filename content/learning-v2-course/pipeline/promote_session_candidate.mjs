#!/usr/bin/env node
import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { buildSessionAcceptanceReceipt, validateSessionAcceptanceReceipt } from "./session_acceptance_receipt.mjs";
import { writeMockupFile } from "./write_mockup_file.mjs";

const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function absoluteInRepo(repoRoot, relativePath, label) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\\")) throw new Error(`${label}_path_invalid`);
  const absolute = path.resolve(repoRoot, ...relativePath.split("/"));
  const relative = path.relative(path.resolve(repoRoot), absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error(`${label}_path_outside_repo`);
  return absolute;
}

function readOwnerManifest({ repoRoot, ownerReviewManifestPath, acceptance }) {
  const absolute = absoluteInRepo(repoRoot, ownerReviewManifestPath, "owner_manifest");
  const bytes = fs.readFileSync(absolute);
  const manifest = JSON.parse(bytes.toString("utf8"));
  if (manifest.schemaVersion !== "learning_v2_session_private_preview_manifest_v1"
    || manifest.courseSessionId !== acceptance.courseSessionId
    || manifest.releaseAuthority !== false
    || manifest.candidateRoot !== acceptance.candidateRoot
    || manifest.candidateReceiptPath !== acceptance.candidateReceiptPath
    || manifest.candidateBundleSha256 !== acceptance.candidateBundleSha256
    || manifest.candidateReceiptInventorySha256 !== acceptance.candidateInventorySha256
    || manifest.contentReceiptSha256 !== acceptance.candidateReceiptSha256) {
    throw new Error("owner_manifest_candidate_mismatch");
  }
  return { absolute, bytes, manifest };
}

function acceptedRelativePath(acceptance) {
  return `content/learning-v2-course/accepted/${acceptance.session}/${acceptance.candidateBundleSha256}/acceptance-receipt.json`;
}

function createImmutableAcceptance({ repoRoot, acceptanceReceiptPath, acceptance }) {
  const absolute = absoluteInRepo(repoRoot, acceptanceReceiptPath, "acceptance_receipt");
  const encoded = Buffer.from(`${JSON.stringify(acceptance, null, 2)}\n`);
  if (fs.existsSync(absolute)) {
    const existing = fs.readFileSync(absolute);
    if (!existing.equals(encoded)) throw new Error("acceptance_receipt_immutable_conflict");
    return { created: false, absolute, bytes: existing };
  }
  const acceptedRoot = path.dirname(absolute);
  const parent = path.dirname(acceptedRoot);
  fs.mkdirSync(parent, { recursive: true });
  fs.mkdirSync(acceptedRoot);
  try {
    fs.writeFileSync(absolute, encoded, { flag: "wx" });
  } catch (error) {
    try { fs.rmdirSync(acceptedRoot); } catch {}
    throw error;
  }
  return { created: true, absolute, bytes: encoded };
}

export async function promoteSessionCandidate({
  repoRoot = process.cwd(),
  session,
  candidateReceiptPath,
  deterministicGateReportPath,
  reviewEvidence,
  ownerReviewManifestPath = `content/learning-v2-course/sessions/${session}/owner-review-preview-manifest.json`,
} = {}) {
  const acceptance = await buildSessionAcceptanceReceipt({ repoRoot, session, candidateReceiptPath, deterministicGateReportPath, reviewEvidence });
  const owner = readOwnerManifest({ repoRoot, ownerReviewManifestPath, acceptance });
  const acceptanceReceiptPath = acceptedRelativePath(acceptance);
  const stored = createImmutableAcceptance({ repoRoot, acceptanceReceiptPath, acceptance });
  const validated = await validateSessionAcceptanceReceipt({ repoRoot, acceptanceReceiptPath });
  const acceptanceReceiptSha256 = validated.acceptanceReceiptSha256;

  const nextManifest = { ...owner.manifest };
  nextManifest.reviewStatus = "TEXT_CANONICAL";
  nextManifest.textVerified = true;
  nextManifest.textReviewEvidencePersisted = true;
  nextManifest.acceptanceReceiptPath = acceptanceReceiptPath;
  nextManifest.acceptanceReceiptSha256 = acceptanceReceiptSha256;
  delete nextManifest.requiredRoles;
  delete nextManifest.eligibleRoles;
  delete nextManifest.missingRoles;
  delete nextManifest.roles;
  delete nextManifest.holdReason;
  const currentBytes = fs.readFileSync(owner.absolute);
  if (sha256(currentBytes) !== sha256(owner.bytes)) throw new Error("owner_manifest_cas_conflict");
  await writeMockupFile(owner.absolute, `${JSON.stringify(nextManifest, null, 2)}\n`);
  return Object.freeze({
    created: stored.created,
    acceptanceReceiptPath,
    acceptanceReceiptSha256,
    acceptanceReceipt: acceptance,
    ownerReviewManifestPath,
  });
}

function parseArgs(args) {
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const name = args[index];
    if (!name.startsWith("--")) throw new Error(`argument_unknown:${name}`);
    const value = args[++index];
    if (!value || value.startsWith("--")) throw new Error(`argument_value_missing:${name}`);
    result[name.slice(2)] = value;
  }
  return result;
}

const isDirect = process.argv[1] ? import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href : false;
if (isDirect) {
  const args = parseArgs(process.argv.slice(2));
  const required = ["session", "candidate-receipt", "gate-report", "blind-review", "blind-agent", "language-review", "language-agent"];
  for (const name of required) if (!args[name]) throw new Error(`argument_required:${name}`);
  const result = await promoteSessionCandidate({
    session: args.session,
    candidateReceiptPath: args["candidate-receipt"],
    deterministicGateReportPath: args["gate-report"],
    ownerReviewManifestPath: args["owner-manifest"] ?? `content/learning-v2-course/sessions/${args.session}/owner-review-preview-manifest.json`,
    reviewEvidence: [
      { dimension: "blind_learner", artifactPath: args["blind-review"], dispatchProvenance: { agent: args["blind-agent"], configuredModel: "gpt-6-luna" } },
      { dimension: "language_pedagogy_locale", artifactPath: args["language-review"], dispatchProvenance: { agent: args["language-agent"], configuredModel: "gpt-6-luna" } },
    ],
  });
  process.stdout.write(`${JSON.stringify(result)}\n`);
}

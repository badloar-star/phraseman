#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateSessionCandidateProjection,
  verifiedSessionBlueprintAuthorityV2,
  verifyAcceptedPreviousPredecessor,
  verifyFrozenAcceptedPredecessor,
  verifyFrozenRevisionPredecessor,
  verifyImmutablePrivateHead,
} from "./build_session_candidate_receipt.mjs";
import { rebuildAndVerifyV2Projection, runFrozenV2SemanticGate } from "./session_candidate_projection_parity.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_REPO = path.resolve(HERE, "../../..");
const SCHEMA = "learning_v2_session_candidate_content_receipt_v2";
const sha256 = (bytes) => crypto.createHash("sha256").update(bytes).digest("hex");

function sameJson(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function sessionFromCourseSessionId(courseSessionId) {
  const match = /^([a-z]{2}):lesson-(\d{2}):session-(\d{2})$/u.exec(String(courseSessionId ?? ""));
  if (!match) throw new Error("candidate_receipt_v2_invalid");
  return `${match[1]}/l${match[2]}/s${match[3]}`;
}

function readReceipt(repoRoot, relativePath) {
  if (typeof relativePath !== "string" || !relativePath || relativePath.includes("\\")) throw new Error("candidate_receipt_path_invalid");
  const lexical = path.resolve(repoRoot, ...relativePath.split("/"));
  const lexicalRelative = path.relative(path.resolve(repoRoot), lexical);
  if (!lexicalRelative || lexicalRelative === ".." || lexicalRelative.startsWith(`..${path.sep}`) || path.isAbsolute(lexicalRelative)) {
    throw new Error("candidate_receipt_path_outside_repo");
  }
  const realRepo = fs.realpathSync(path.resolve(repoRoot));
  const realReceipt = fs.realpathSync(lexical);
  const realRelative = path.relative(realRepo, realReceipt);
  if (!realRelative || realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
    throw new Error("candidate_receipt_path_outside_repo");
  }
  const bytes = fs.readFileSync(realReceipt);
  const receipt = JSON.parse(bytes.toString("utf8"));
  const session = sessionFromCourseSessionId(receipt.courseSessionId);
  if (receipt.schemaVersion !== SCHEMA
    || receipt.releaseAuthority !== false || receipt.immutableContentOnly !== true
    || relativePath !== `${receipt.candidateRoot}/content-receipt.json`) {
    throw new Error("candidate_receipt_v2_invalid");
  }
  return { receipt, receiptSha256: sha256(bytes), session };
}

function verifyProjection(repoRoot, receipt, session) {
  const authority = receipt.blueprintAuthority;
  const expectedAuthority = verifiedSessionBlueprintAuthorityV2(repoRoot, session);
  if (!sameJson(authority, expectedAuthority)) {
    throw new Error("candidate_receipt_v2_authority_invalid");
  }
  const expected = ["answers.json", "auxiliary.json", "intro.json", "learner.json", "learner.uk.json"]
    .map((name) => `${receipt.candidateRoot}/${session}/${name}`).sort();
  const actual = receipt.files?.filter((entry) => entry.category === "candidate").map((entry) => entry.path).sort();
  if (!sameJson(actual, expected)) throw new Error("candidate_receipt_v2_projection_invalid");
  validateSessionCandidateProjection({
    candidateRoot: path.resolve(repoRoot, ...receipt.candidateRoot.split("/")),
    session,
    courseSessionId: receipt.courseSessionId,
    blueprintAuthority: authority,
  });
  rebuildAndVerifyV2Projection({
    repoRoot,
    candidateRoot: receipt.candidateRoot,
    sourceSnapshotIndexPath: receipt.sourceSnapshot?.indexPath,
    sourceSnapshotIndexSha256: receipt.sourceSnapshot?.indexSha256,
  });
}

async function verifyHistory(repoRoot, candidateReceiptPath, receipt, receiptSha256, session) {
  if (!receipt.frozenPredecessor || !receipt.acceptedPredecessor || !receipt.frozenRevisionPredecessor) {
    throw new Error("candidate_receipt_v2_history_invalid");
  }
  const frozenPredecessor = verifyFrozenAcceptedPredecessor({
    repoRoot,
    receiptPath: receipt.frozenPredecessor.receiptPath,
    currentSession: session,
  });
  const acceptedPredecessor = await verifyAcceptedPreviousPredecessor({
    repoRoot,
    acceptanceReceiptPath: receipt.acceptedPredecessor.acceptanceReceiptPath,
    frozenPredecessor,
    currentSession: session,
  });
  const frozenRevisionPredecessor = verifyFrozenRevisionPredecessor({
    repoRoot,
    receiptPath: receipt.frozenRevisionPredecessor.receiptPath,
    expectedCourseSessionId: receipt.courseSessionId,
  });
  if (!sameJson(receipt.frozenPredecessor, frozenPredecessor)
    || !sameJson(receipt.acceptedPredecessor, acceptedPredecessor)
    || !sameJson(receipt.frozenRevisionPredecessor, frozenRevisionPredecessor)) {
    throw new Error("candidate_receipt_v2_history_invalid");
  }
  verifyImmutablePrivateHead({ repoRoot, receipt, candidateReceiptSha256: receiptSha256 });
}

export async function verifySessionCandidateReceiptV2({ repoRoot = DEFAULT_REPO, candidateReceiptPath, check }) {
  const { receipt, receiptSha256, session } = readReceipt(repoRoot, candidateReceiptPath);
  if (["blueprint_authority", "s02_exact_packet", "feedback_locale_parity", "actor_clarity"].includes(check)) {
    await runFrozenV2SemanticGate({
      repoRoot,
      candidateRoot: receipt.candidateRoot,
      sourceSnapshotIndexPath: receipt.sourceSnapshot?.indexPath,
      sourceSnapshotIndexSha256: receipt.sourceSnapshot?.indexSha256,
      check,
    });
  } else if (check === "blueprint_packet_coverage") {
    await runFrozenV2SemanticGate({
      repoRoot,
      candidateRoot: receipt.candidateRoot,
      sourceSnapshotIndexPath: receipt.sourceSnapshot?.indexPath,
      sourceSnapshotIndexSha256: receipt.sourceSnapshot?.indexSha256,
      check: "blueprint_authority",
    });
    if (!sameJson(receipt.blueprintAuthority, verifiedSessionBlueprintAuthorityV2(repoRoot, session))) {
      throw new Error("candidate_receipt_v2_authority_invalid");
    }
  } else if (check === "candidate_build_source_projection") verifyProjection(repoRoot, receipt, session);
  else if (check === "receipt_history") await verifyHistory(repoRoot, candidateReceiptPath, receipt, receiptSha256, session);
  else throw new Error(`candidate_receipt_v2_check_invalid:${check}`);
  return Object.freeze({ status: "PASS", check });
}

function parseCli(args) {
  const value = (name) => {
    const index = args.indexOf(name);
    return index === -1 ? null : args[index + 1];
  };
  return { candidateReceiptPath: value("--candidate-receipt"), check: value("--check") };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await verifySessionCandidateReceiptV2(parseCli(process.argv.slice(2)));
    process.stdout.write(`SESSION CANDIDATE V2 ${result.check}: PASS\n`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  buildSessionCandidateReceiptForWrite,
  prepareSessionCandidateSnapshot,
} from "./build_session_candidate_receipt.mjs";
import { sessionAcceptanceV2CanonicalGateCommands } from "./session_acceptance_receipt.mjs";

const REPO = path.resolve(import.meta.dirname, "../../..");
const OUTPUTS = path.join(REPO, "content/learning-v2-course/outputs");
const APPROVED_FINGERPRINT = "d956442e0946194e3de8105601ae993fe6f7932e7904cc3e4e972fc8444875da";
const S03_PACKET_SHA256 = "5d176bab7751cfdd52097224b9687cae89c6283185a7c33be9cf1c72b50bf60c";
const S03_SEMANTIC_COVERAGE_SHA256 = "a83f3e79748ea8fdf37fd6e48c2652774fa38b928dc1f34d9930680d9d3194a1";

function read(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(REPO, ...relativePath.split("/")), "utf8"));
}

function candidateRoot(t, sessionNumber) {
  const root = path.join(
    OUTPUTS,
    `s${sessionNumber}-blueprint-bound-v2-test-${process.pid}-${Date.now()}`,
  );
  fs.mkdirSync(root);
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test("S03 v2 snapshot binds its exact d956 packet and semantic operation/lexical coverage", async (t) => {
  const root = candidateRoot(t, "03");
  const snapshot = await prepareSessionCandidateSnapshot({
    repoRoot: REPO,
    candidateRoot: root,
    session: "en/l01/s03",
    receiptSchemaVersion: "v2",
  });

  assert.equal(snapshot.courseSessionId, "en:lesson-01:session-03");
  assert.deepEqual(snapshot.blueprintAuthority, {
    schemaVersion: "learning_v2_blueprint_authoring_contract_v2",
    session: "en/l01/s03",
    sessionId: "lesson-01:session:03",
    blueprintFingerprint: APPROVED_FINGERPRINT,
    sessionPacketSha256: S03_PACKET_SHA256,
    semanticCoverageSha256: S03_SEMANTIC_COVERAGE_SHA256,
    introPlanItemCount: 3,
    activityPlanItemCount: 17,
  });
});

test("S03 v2 acceptance commands use a generic exact packet/coverage gate, never the S02-only gate", () => {
  const candidateReceiptPath = "content/learning-v2-course/outputs/s03-example/content-receipt.json";
  const gates = sessionAcceptanceV2CanonicalGateCommands(candidateReceiptPath, "en/l01/s03");
  assert.deepEqual(gates.map(({ id }) => id), [
    "blueprint_authority",
    "blueprint_packet_coverage",
    "feedback_locale_parity",
    "actor_clarity",
    "candidate_build_source_projection",
    "receipt_history",
  ]);
  assert.ok(gates.every(({ command }) => command.includes(candidateReceiptPath)));
  assert.ok(gates.every(({ command }) => !command.includes("s02_exact_packet")));
});

test("S03 v2 receipt fails closed when the frozen packet authority is changed", async (t) => {
  const root = candidateRoot(t, "03");
  const s02 = read("content/learning-v2-course/sessions/en/l01/s02/owner-review-preview-manifest.json");
  const s03 = read("content/learning-v2-course/sessions/en/l01/s03/owner-review-preview-manifest.json");
  const options = {
    repoRoot: REPO,
    candidateRoot: root,
    session: "en/l01/s03",
    receiptSchemaVersion: "v2",
    predecessorReceiptPath: s02.candidateReceiptPath,
    acceptedPredecessorReceiptPath: s02.acceptanceReceiptPath,
    revisionPredecessorReceiptPath: s03.candidateReceiptPath,
  };
  await prepareSessionCandidateSnapshot(options);
  const indexPath = path.join(root, "source-snapshot/index.json");
  const index = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  index.blueprintAuthority.sessionPacketSha256 = "0".repeat(64);
  fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);

  await assert.rejects(
    buildSessionCandidateReceiptForWrite(options),
    /candidate_snapshot_index_invalid/u,
  );
});

test("legacy S02 v2 acceptance commands remain reproducible for an already materialized candidate", () => {
  const gates = sessionAcceptanceV2CanonicalGateCommands(
    "content/learning-v2-course/outputs/s02-example/content-receipt.json",
    "en/l01/s02",
  );
  assert.equal(gates[1].id, "s02_exact_packet");
});

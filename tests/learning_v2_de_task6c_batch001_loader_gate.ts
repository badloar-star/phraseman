import assert from "node:assert/strict";

import { loadGermanTask6cBatch001TransportClaimsDeV1 } from "../modules/learning-v2/curriculum/de/task6c_batch001_transport_claim_loader_de_v1";
import {
  resolveGermanTask6cDirectTransportClaimDeV1,
  resolveGermanTask6cTask5TransportClaimDeV1,
} from "../modules/learning-v2/curriculum/de/task6c_additive_source_plan_contract_de_v1";

const registry = loadGermanTask6cBatch001TransportClaimsDeV1();

assert.equal(
  registry.authorityVersion,
  "learning-v2-german-task6c-batch-001-transport-claims.v1",
);
assert.equal(registry.status, "PROPOSED_NOT_CANONICAL");
assert.equal(registry.task7Unlock, false);
assert.equal(registry.claims.length, 14);
assert.equal(
  new Set(registry.claims.map((claim) => claim.sourcePlanId)).size,
  14,
);
assert.equal(
  registry.claims.filter((claim) => claim.transport.cachePath.endsWith(".pdf"))
    .length,
  7,
);
assert.equal(
  registry.claims.filter((claim) => claim.transport.cachePath.endsWith(".json"))
    .length,
  7,
);
for (const claim of registry.claims) {
  assert.equal(claim.status, "HOLD");
  assert.equal(claim.sourceKind, "TASK5");
  assert.equal(claim.directEvidenceStatus, "NOT_DIRECT_EVIDENCE");
  assert.equal(claim.task5Binding.lessonId, "de_l01");
  assert.ok(claim.task5Binding.chapterId.startsWith("de_l01_c"));
  assert.ok(claim.task5Binding.checkpointPacketId.startsWith("de_l01_c"));
  assert.ok(claim.task5Binding.semanticIdentity.length > 0);
  const task5Path = resolveGermanTask6cTask5TransportClaimDeV1(
    claim.sourcePlanId,
  );
  assert.equal(task5Path.sourcePlanId, claim.sourcePlanId);
  assert.throws(
    () => resolveGermanTask6cDirectTransportClaimDeV1(claim.sourcePlanId),
    /direct_transport_claim_not_direct_evidence/u,
  );
  assert.ok(claim.claimBody.length > 0);
  assert.match(claim.claimBodySha256, /^[a-f0-9]{64}$/u);
  assert.match(claim.transport.cacheSha256, /^[a-f0-9]{64}$/u);
  assert.match(claim.transport.responseSha256, /^[a-f0-9]{64}$/u);
  assert.ok(claim.transport.responseBytes > 0);
  assert.ok(claim.sourceUrl.startsWith("https://"));
  assert.ok(claim.sourceAnchor.length > 0);
}
const pdfClaims = registry.claims.filter((claim) =>
  claim.transport.cachePath.endsWith(".pdf"),
);
const catalogOnlyClaims = registry.claims.filter((claim) =>
  claim.transport.cachePath.endsWith(".json"),
);
assert.equal(pdfClaims.length, 7);
assert.equal(catalogOnlyClaims.length, 7);
for (const claim of pdfClaims) {
  assert.equal(claim.sourceEvidenceStatus, "BINARY_TRANSPORT_PROVENANCE_ONLY");
  assert.equal(
    claim.transport.responseVerification,
    "BINARY_RAW_RESPONSE_VERIFIED",
  );
}
for (const claim of catalogOnlyClaims) {
  assert.equal(claim.sourceEvidenceStatus, "CATALOG_PROVENANCE_ONLY");
  assert.equal(
    claim.transport.responseVerification,
    "UNAVAILABLE_RAW_RESPONSE_BYTES_ABSENT",
  );
}
assert.throws(
  () => resolveGermanTask6cTask5TransportClaimDeV1("de_lex_plan_not_roster_v1"),
  /task6c_task5_transport_claim_unknown/u,
);
assert.throws(
  () =>
    resolveGermanTask6cTask5TransportClaimDeV1(
      registry.claims[0].sourcePlanId,
      "ADDITIVE",
    ),
  /task6c_task5_transport_claim_source_kind_invalid/u,
);

assert.throws(
  () => loadGermanTask6cBatch001TransportClaimsDeV1({ expectedClaimCount: 13 }),
  /task6c_batch001_claim_count_mismatch/u,
);
assert.throws(
  () =>
    loadGermanTask6cBatch001TransportClaimsDeV1({ mutateForTest: "claimBody" }),
  /task6c_batch001_claim_body_hash_mismatch/u,
);
assert.throws(
  () =>
    loadGermanTask6cBatch001TransportClaimsDeV1({
      mutateForTest: "cacheSha256",
    }),
  /task6c_batch001_cache_sha256_mismatch/u,
);
assert.throws(
  () =>
    loadGermanTask6cBatch001TransportClaimsDeV1({
      mutateForTest: "responseSha256",
    }),
  /task6c_batch001_response_sha256_mismatch/u,
);
assert.throws(
  () =>
    loadGermanTask6cBatch001TransportClaimsDeV1({ mutateForTest: "cachePath" }),
  /task6c_batch001_cache_missing/u,
);
assert.throws(
  () =>
    Reflect.apply(loadGermanTask6cBatch001TransportClaimsDeV1, undefined, [
      { claims: [{ synthetic: true }] },
    ]),
  /task6c_batch001_loader_options_unknown/u,
);

process.stdout.write(
  "TASK6C_BATCH001_TRANSPORT_LOADER status=HOLD task7Unlock=false hostile=PASS\\n",
);

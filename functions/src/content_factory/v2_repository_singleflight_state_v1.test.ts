import {
  canonicalJsonV1,
  sha256Utf8,
} from "../../../modules/learning-v2/policies/decision_registry";
import { V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1 } from "./v2_firebase_repository_trust_root_v1";
import {
  V2_REPOSITORY_SINGLEFLIGHT_COLLECTION_V1,
  V2_REPOSITORY_SINGLEFLIGHT_MAX_LEASE_SECONDS_V1,
  V2_REPOSITORY_SINGLEFLIGHT_MAX_STATE_BYTES_V1,
  V2_REPOSITORY_SINGLEFLIGHT_MIN_LEASE_SECONDS_V1,
  V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_PREFIX_V1,
  decideV2RepositorySingleflightClaimV1,
  decideV2RepositorySingleflightFinalizeV1,
  parseV2RepositorySingleflightStateV1,
  serializeV2RepositorySingleflightStateV1,
  v2RepositorySingleflightDocumentPathV1,
  type V2RepositorySingleflightClaimV1,
  type V2RepositorySingleflightIdentityV1,
  type V2RepositorySingleflightReceiptPinV1,
} from "./v2_repository_singleflight_state_v1";

const hash = (value: string): string => sha256Utf8(value);
const identity: V2RepositorySingleflightIdentityV1 = Object.freeze({
  planFingerprint: hash("plan"),
  courseContractFingerprint: hash("course-contract"),
  repositoryScopeFingerprint: hash("plan-global-repository-scope"),
  resolverContractFingerprint: hash("resolver-contract"),
  requestFingerprint: hash("request"),
});
const tokenA = "worker-a-token-000000000000000000000001";
const tokenB = "worker-b-token-000000000000000000000002";
const now = 1_800_000_000_000;

function createClaim(
  leaseSeconds = V2_REPOSITORY_SINGLEFLIGHT_MIN_LEASE_SECONDS_V1,
): V2RepositorySingleflightClaimV1 {
  const decision = decideV2RepositorySingleflightClaimV1({
    currentRaw: null,
    identity,
    claimToken: tokenA,
    nowEpochMs: now,
    leaseSeconds,
  });
  if (decision.kind !== "create") throw new Error("test_create_expected");
  return decision.command.next as V2RepositorySingleflightClaimV1;
}

function pin(
  receiptFingerprint = hash("receipt"),
  generation = "generation-1",
  contentHash = hash("receipt-full-canonical-bytes"),
): V2RepositorySingleflightReceiptPinV1 {
  return Object.freeze({
    objectPath: `${V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_PREFIX_V1}/${identity.planFingerprint}/${receiptFingerprint}.json`,
    contentHash,
    objectGeneration: generation,
    byteSize: 1024,
  });
}

describe("V2 repository direct-key single-flight state", () => {
  it("derives its Firestore collection and receipt prefix from the trust root", () => {
    expect(V2_REPOSITORY_SINGLEFLIGHT_COLLECTION_V1).toBe(
      V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.firestore.repositoryAuthState,
    );
    expect(V2_REPOSITORY_SINGLEFLIGHT_RECEIPT_PREFIX_V1).toBe(
      V2_FIREBASE_REPOSITORY_NAMESPACE_BODY_V1.storage
        .repositoryOriginReceiptPrefix,
    );
  });

  it("creates an exact bounded claim for the direct plan key", () => {
    const decision = decideV2RepositorySingleflightClaimV1({
      currentRaw: null,
      identity,
      claimToken: tokenA,
      nowEpochMs: now,
      leaseSeconds: 120,
    });
    expect(decision).toMatchObject({
      kind: "create",
      command: {
        documentPath: `${V2_REPOSITORY_SINGLEFLIGHT_COLLECTION_V1}/${identity.planFingerprint}`,
        expectedOperationRevision: null,
        expectedOperationFingerprint: null,
        next: {
          state: "claiming",
          claimEpoch: 1,
          operationRevision: 1,
          createdAtEpochMs: now,
          updatedAtEpochMs: now,
          leaseExpiresAtEpochMs: now + 120_000,
          claimTokenHash: sha256Utf8(tokenA),
        },
      },
    });
    if (decision.kind !== "create") throw new Error("test_create_expected");
    expect(
      serializeV2RepositorySingleflightStateV1(decision.command.next),
    ).toBe(canonicalJsonV1(decision.command.next));
    expect(
      parseV2RepositorySingleflightStateV1(
        canonicalJsonV1(decision.command.next),
      ),
    ).toEqual(decision.command.next);
  });

  it("returns in_progress without a write while the lease is active", () => {
    const claim = createClaim();
    expect(
      decideV2RepositorySingleflightClaimV1({
        currentRaw: canonicalJsonV1(claim),
        identity,
        claimToken: tokenB,
        nowEpochMs: now + 59_999,
        leaseSeconds: 60,
      }),
    ).toEqual({
      kind: "in_progress",
      documentPath: v2RepositorySingleflightDocumentPathV1(
        identity.planFingerprint,
      ),
      claimEpoch: 1,
      retryAtEpochMs: now + 60_000,
      operationFingerprint: claim.operationFingerprint,
    });
  });

  it("takes over an expired lease with exact revision and fingerprint CAS", () => {
    const claim = createClaim();
    const decision = decideV2RepositorySingleflightClaimV1({
      currentRaw: canonicalJsonV1(claim),
      identity,
      claimToken: tokenB,
      nowEpochMs: now + 60_000,
      leaseSeconds: 300,
    });
    expect(decision).toMatchObject({
      kind: "stale_takeover",
      command: {
        expectedOperationRevision: 1,
        expectedOperationFingerprint: claim.operationFingerprint,
        next: {
          claimEpoch: 2,
          operationRevision: 2,
          claimTokenHash: sha256Utf8(tokenB),
          createdAtEpochMs: now,
          updatedAtEpochMs: now + 60_000,
          leaseExpiresAtEpochMs: now + 360_000,
        },
      },
    });
  });

  it("finalizes only the current epoch/token and returns exact replay", () => {
    const claim = createClaim(300);
    const receiptFingerprint = hash("receipt");
    const receiptPin = pin(receiptFingerprint);
    const finalized = decideV2RepositorySingleflightFinalizeV1({
      currentRaw: canonicalJsonV1(claim),
      identity,
      claimEpoch: 1,
      claimToken: tokenA,
      nowEpochMs: now + 1_000,
      receiptFingerprint,
      receiptPin,
    });
    expect(finalized).toMatchObject({
      kind: "finalize",
      command: {
        expectedOperationRevision: 1,
        expectedOperationFingerprint: claim.operationFingerprint,
        next: {
          state: "committed",
          claimEpoch: 1,
          operationRevision: 2,
          receiptFingerprint,
          receiptPin,
          committedAtEpochMs: now + 1_000,
        },
      },
    });
    expect(receiptPin.contentHash).not.toBe(receiptFingerprint);
    if (finalized.kind !== "finalize")
      throw new Error("test_finalize_expected");
    const committedRaw = canonicalJsonV1(finalized.command.next);
    const replay = decideV2RepositorySingleflightFinalizeV1({
      currentRaw: committedRaw,
      identity,
      claimEpoch: 1,
      claimToken: tokenA,
      nowEpochMs: now + 2_000,
      receiptFingerprint,
      receiptPin,
    });
    expect(replay).toMatchObject({
      kind: "exact_replay",
      committed: {
        operationFingerprint: finalized.command.next.operationFingerprint,
      },
    });
    expect(
      decideV2RepositorySingleflightClaimV1({
        currentRaw: committedRaw,
        identity,
        claimToken: tokenB,
        nowEpochMs: now + 2_000,
        leaseSeconds: 60,
      }),
    ).toMatchObject({
      kind: "exact_replay",
      committed: {
        operationFingerprint: finalized.command.next.operationFingerprint,
      },
    });
  });

  it("rejects the stale loser after takeover", () => {
    const first = createClaim();
    const takeover = decideV2RepositorySingleflightClaimV1({
      currentRaw: canonicalJsonV1(first),
      identity,
      claimToken: tokenB,
      nowEpochMs: now + 60_000,
      leaseSeconds: 60,
    });
    if (takeover.kind !== "stale_takeover") {
      throw new Error("test_takeover_expected");
    }
    expect(() =>
      decideV2RepositorySingleflightFinalizeV1({
        currentRaw: canonicalJsonV1(takeover.command.next),
        identity,
        claimEpoch: 1,
        claimToken: tokenA,
        nowEpochMs: now + 61_000,
        receiptFingerprint: hash("receipt"),
        receiptPin: pin(),
      }),
    ).toThrow("v2_repository_singleflight_claim_lost");
  });

  it("rejects receipt pin substitution and conflicting replay", () => {
    const claim = createClaim(300);
    const receiptFingerprint = hash("receipt");
    expect(() =>
      decideV2RepositorySingleflightFinalizeV1({
        currentRaw: canonicalJsonV1(claim),
        identity,
        claimEpoch: 1,
        claimToken: tokenA,
        nowEpochMs: now + 1_000,
        receiptFingerprint,
        receiptPin: {
          ...pin(receiptFingerprint),
          objectPath: "learning-v2/repository-auth/wrong/receipt.json",
        },
      }),
    ).toThrow("v2_repository_singleflight_receipt_pin_invalid");

    const finalized = decideV2RepositorySingleflightFinalizeV1({
      currentRaw: canonicalJsonV1(claim),
      identity,
      claimEpoch: 1,
      claimToken: tokenA,
      nowEpochMs: now + 1_000,
      receiptFingerprint,
      receiptPin: pin(receiptFingerprint),
    });
    if (finalized.kind !== "finalize")
      throw new Error("test_finalize_expected");
    expect(() =>
      decideV2RepositorySingleflightFinalizeV1({
        currentRaw: canonicalJsonV1(finalized.command.next),
        identity,
        claimEpoch: 1,
        claimToken: tokenA,
        nowEpochMs: now + 2_000,
        receiptFingerprint,
        receiptPin: pin(receiptFingerprint, "substituted-generation"),
      }),
    ).toThrow("v2_repository_singleflight_commit_conflict");
    expect(() =>
      decideV2RepositorySingleflightFinalizeV1({
        currentRaw: canonicalJsonV1(finalized.command.next),
        identity,
        claimEpoch: 1,
        claimToken: tokenA,
        nowEpochMs: now + 2_000,
        receiptFingerprint,
        receiptPin: pin(
          receiptFingerprint,
          "generation-1",
          hash("substituted-full-receipt-bytes"),
        ),
      }),
    ).toThrow("v2_repository_singleflight_commit_conflict");
  });

  it("enforces lease bounds, identity conflicts, expiry and token rotation", () => {
    for (const leaseSeconds of [
      V2_REPOSITORY_SINGLEFLIGHT_MIN_LEASE_SECONDS_V1 - 1,
      V2_REPOSITORY_SINGLEFLIGHT_MAX_LEASE_SECONDS_V1 + 1,
    ]) {
      expect(() =>
        decideV2RepositorySingleflightClaimV1({
          currentRaw: null,
          identity,
          claimToken: tokenA,
          nowEpochMs: now,
          leaseSeconds,
        }),
      ).toThrow("v2_repository_singleflight_claim_input_invalid");
    }
    const claim = createClaim();
    expect(() =>
      decideV2RepositorySingleflightClaimV1({
        currentRaw: canonicalJsonV1(claim),
        identity: { ...identity, requestFingerprint: hash("different") },
        claimToken: tokenB,
        nowEpochMs: now + 1_000,
        leaseSeconds: 60,
      }),
    ).toThrow("v2_repository_singleflight_identity_conflict");
    for (const changedIdentity of [
      { ...identity, courseContractFingerprint: hash("different-course") },
      {
        ...identity,
        repositoryScopeFingerprint: hash("different-repository-scope"),
      },
    ]) {
      expect(() =>
        decideV2RepositorySingleflightClaimV1({
          currentRaw: canonicalJsonV1(claim),
          identity: changedIdentity,
          claimToken: tokenB,
          nowEpochMs: now + 1_000,
          leaseSeconds: 60,
        }),
      ).toThrow("v2_repository_singleflight_identity_conflict");
    }
    expect(() =>
      decideV2RepositorySingleflightClaimV1({
        currentRaw: canonicalJsonV1(claim),
        identity,
        claimToken: tokenA,
        nowEpochMs: now + 60_000,
        leaseSeconds: 60,
      }),
    ).toThrow("v2_repository_singleflight_takeover_token_reused");
    expect(() =>
      decideV2RepositorySingleflightFinalizeV1({
        currentRaw: canonicalJsonV1(claim),
        identity,
        claimEpoch: 1,
        claimToken: tokenA,
        nowEpochMs: now + 60_000,
        receiptFingerprint: hash("receipt"),
        receiptPin: pin(),
      }),
    ).toThrow("v2_repository_singleflight_lease_expired");
  });

  it("rejects lease-expiry overflow and accepts the exact safe boundary", () => {
    const leaseSeconds = V2_REPOSITORY_SINGLEFLIGHT_MAX_LEASE_SECONDS_V1;
    const safeNow = Number.MAX_SAFE_INTEGER - leaseSeconds * 1000;
    const boundary = decideV2RepositorySingleflightClaimV1({
      currentRaw: null,
      identity,
      claimToken: tokenA,
      nowEpochMs: safeNow,
      leaseSeconds,
    });
    expect(boundary).toMatchObject({
      kind: "create",
      command: {
        next: { leaseExpiresAtEpochMs: Number.MAX_SAFE_INTEGER },
      },
    });
    if (boundary.kind !== "create") throw new Error("test_create_expected");
    expect(() =>
      serializeV2RepositorySingleflightStateV1(boundary.command.next),
    ).not.toThrow();

    expect(() =>
      decideV2RepositorySingleflightClaimV1({
        currentRaw: null,
        identity,
        claimToken: tokenA,
        nowEpochMs: safeNow + 1,
        leaseSeconds,
      }),
    ).toThrow("v2_repository_singleflight_claim_input_invalid");
  });

  it("rejects noncanonical, tampered and oversized persisted states", () => {
    const claim = createClaim();
    expect(() =>
      parseV2RepositorySingleflightStateV1(
        JSON.stringify({ ...claim, unexpected: true }),
      ),
    ).toThrow();
    expect(() =>
      parseV2RepositorySingleflightStateV1(
        canonicalJsonV1({ ...claim, claimEpoch: 2 }),
      ),
    ).toThrow("v2_repository_singleflight_claim_invalid");
    expect(() =>
      parseV2RepositorySingleflightStateV1(
        `{ "schemaVersion":"${claim.schemaVersion}" }`,
      ),
    ).toThrow("v2_repository_singleflight_state_invalid");
    expect(() =>
      parseV2RepositorySingleflightStateV1(
        `{"padding":"${"x".repeat(V2_REPOSITORY_SINGLEFLIGHT_MAX_STATE_BYTES_V1)}"}`,
      ),
    ).toThrow("v2_repository_singleflight_state_invalid");
  });
});

import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import {
  assertOwnerRepositoryEconomicClosureForReceipt,
  auditOwnerRepositoryEconomicClosurePage,
  auditOwnerRepositoryEconomicManifestPage,
  createEmptyOwnerRepositoryEconomicManifest,
  isOwnerRepositoryEconomicClosureAuditCursor,
  lookupOwnerRepositoryCanonicalEconomicLedgerClosure,
  parseOwnerRepositoryEconomicManifestBlob,
  planOwnerRepositoryCanonicalIndexRepair,
  planOwnerRepositoryCanonicalEconomicClosure,
  planOwnerRepositoryOperationAlias,
  type OwnerRepositoryEconomicManifestV2,
} from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import {
  planOwnerRepositoryRadixBatch,
  type OwnerRepositoryRadixBlob,
  type OwnerRepositoryRadixNodeRefV1,
} from "../modules/learning-v2/progress/owner_repository_radix";
import {
  createWalletState,
  reduceAuthorizedWalletOperation,
  type WalletOperationLedgerEntryV1,
} from "../modules/learning-v2/progress/wallet_reducer";
import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;
const hash = (character: string) => character.repeat(64);
const makeOperation = (input: {
  readonly operationId: string;
  readonly sourceReceiptId: string;
  readonly sourceReceiptFingerprint: string;
  readonly walletRevisionBefore?: number;
}) => {
  const sourceReceiptRef = {
    receiptType: "required_session_credit_settlement" as const,
    receiptId: input.sourceReceiptId,
    receiptFingerprint: input.sourceReceiptFingerprint,
  };
  return createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: input.operationId,
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash,
      operationReason: "initial_required_session",
      sourceReceiptRef,
    }),
    accountScopeHash,
    accountGeneration: generation,
    currency: "access_star",
    kind: "earning_credit",
    amountSubunits: 36 * WALLET_SUBUNITS_PER_STAR,
    earningCategory: "lesson",
    operationReason: "initial_required_session",
    sourceReceiptRef,
    walletRevisionBefore: input.walletRevisionBefore ?? 0,
    origin: {
      kind: "course",
      courseId: "english-core",
      studyTarget: "en",
      requiredSessionOrdinal: 1,
    },
  });
};
const operation = makeOperation({
  operationId: "wallet-credit-1",
  sourceReceiptId: "required-session-credit-1",
  sourceReceiptFingerprint: hash("c"),
});
const applied = reduceAuthorizedWalletOperation(
  createWalletState({ accountScopeHash }),
  operation,
  { currentAccountGeneration: generation },
);
const otherOperation = makeOperation({
  operationId: "wallet-credit-2",
  sourceReceiptId: "required-session-credit-2",
  sourceReceiptFingerprint: hash("d"),
});
const otherApplied = reduceAuthorizedWalletOperation(
  createWalletState({ accountScopeHash }),
  otherOperation,
  { currentAccountGeneration: generation },
);
const aliasOperation = makeOperation({
  operationId: "wallet-credit-alias",
  sourceReceiptId: "required-session-credit-1",
  sourceReceiptFingerprint: hash("c"),
  walletRevisionBefore: 1,
});
const aliasApplied = reduceAuthorizedWalletOperation(
  applied.state,
  aliasOperation,
  {
    currentAccountGeneration: generation,
    subjectLedgerEntry: applied.subjectLedgerEntry,
  },
);

const values = new Map<string, string>();
const resolver = (ref: OwnerRepositoryRadixNodeRefV1) =>
  values.get(ref.blobKey) ?? null;
const addBlobs = (blobs: readonly OwnerRepositoryRadixBlob[]) => {
  for (const blob of blobs) values.set(blob.ref.blobKey, blob.encoded);
};
const manifestKind = (indexKind: "operation" | "subject" | "receipt") =>
  `${indexKind}_index_manifest` as const;
const legacyManifestBlob = (
  indexKind: "operation" | "subject" | "receipt",
  shards: readonly unknown[] = [],
) => {
  const encoded = canonicalJsonV1({
    schemaVersion: "learning-v2-owner-repository-blob.v1",
    accountScopeHash,
    kind: manifestKind(indexKind),
    payload: {
      schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
      indexKind,
      shardBits: 8,
      shards,
    },
  });
  const blobFingerprint = sha256Utf8(encoded);
  return {
    encoded,
    ref: {
      schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
      kind: manifestKind(indexKind),
      blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
      blobFingerprint,
    },
  };
};
const createEmptySet = async () => ({
  operation: await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "operation",
  ),
  subject: await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "subject",
  ),
  receipt: await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "receipt",
  ),
});
const planClosure = async (
  emptyInput?: Awaited<ReturnType<typeof createEmptySet>>,
) => {
  const empty = emptyInput ?? (await createEmptySet());
  return planOwnerRepositoryCanonicalEconomicClosure({
    accountScopeHash,
    operationManifest: empty.operation.manifest,
    subjectManifest: empty.subject.manifest,
    receiptManifest: empty.receipt.manifest,
    operationLedgerEntry: applied.operationLedgerEntry,
    subjectLedgerEntry: applied.subjectLedgerEntry,
    appliedReceipt: applied.appliedReceipt,
    resolveNode: resolver,
  });
};

beforeEach(() => values.clear());

describe("Learning V2 owner repository economic manifests", () => {
  it("materializes strict deterministic empty manifests and round-trips exact blobs", async () => {
    for (const indexKind of ["operation", "subject", "receipt"] as const) {
      const empty = await createEmptyOwnerRepositoryEconomicManifest(
        accountScopeHash,
        indexKind,
      );
      const repeated = await createEmptyOwnerRepositoryEconomicManifest(
        accountScopeHash,
        indexKind,
      );
      expect(repeated).toEqual(empty);
      expect(empty.manifest).toMatchObject({
        indexKind,
        entryCount: 0,
        rootNodeRef: null,
      });
      expect(empty.manifestBlob.ref.blobFingerprint).toBe(
        sha256Utf8(empty.manifestBlob.encoded),
      );
      const parsed = await parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash,
        indexKind,
        ref: empty.manifestBlob.ref,
        raw: empty.manifestBlob.encoded,
        resolveNode: resolver,
      });
      expect(parsed).toMatchObject({ manifest: empty.manifest, legacy: false });
      expect(parsed.sourceManifestBlob).toEqual(empty.manifestBlob);
      expect(parsed.normalizedManifestBlob).toEqual(empty.manifestBlob);
      expect(Object.isFrozen(parsed.manifest)).toBe(true);
    }
  });

  it("derives and inserts exactly one canonical missing index key", async () => {
    const expected = {
      operation_id: {
        indexKind: "operation",
        logicalKey: applied.operationLedgerEntry.operationId,
      },
      operation_fingerprint: {
        indexKind: "operation",
        logicalKey: applied.operationLedgerEntry.operationFingerprint,
      },
      semantic_subject: {
        indexKind: "subject",
        logicalKey: applied.subjectLedgerEntry.semanticSubjectFingerprint,
      },
      applied_receipt: {
        indexKind: "receipt",
        logicalKey: applied.appliedReceipt.appliedReceiptFingerprint,
      },
    } as const;
    for (const keyKind of Object.keys(expected) as Array<keyof typeof expected>) {
      values.clear();
      const empty = await createEmptySet();
      const plan = await planOwnerRepositoryCanonicalIndexRepair({
        accountScopeHash,
        operationManifest: empty.operation.manifest,
        subjectManifest: empty.subject.manifest,
        receiptManifest: empty.receipt.manifest,
        appliedReceipt: applied.appliedReceipt,
        repairKeyKind: keyKind,
        resolveNode: resolver,
      });
      expect(plan).toMatchObject({
        indexKind: expected[keyKind].indexKind,
        keyKind,
        logicalKey: expected[keyKind].logicalKey,
        changed: true,
        manifest: { entryCount: 1 },
      });
      addBlobs(plan.immutableNodeBlobs);
      const replay = await planOwnerRepositoryCanonicalIndexRepair({
        accountScopeHash,
        operationManifest: keyKind.startsWith("operation_")
          ? plan.manifest as OwnerRepositoryEconomicManifestV2<"operation">
          : empty.operation.manifest,
        subjectManifest: keyKind === "semantic_subject"
          ? plan.manifest as OwnerRepositoryEconomicManifestV2<"subject">
          : empty.subject.manifest,
        receiptManifest: keyKind === "applied_receipt"
          ? plan.manifest as OwnerRepositoryEconomicManifestV2<"receipt">
          : empty.receipt.manifest,
        appliedReceipt: applied.appliedReceipt,
        repairKeyKind: keyKind,
        resolveNode: resolver,
      });
      expect(replay).toMatchObject({ changed: false, immutableNodeBlobs: [] });
    }
  });

  it("normalizes only exact legacy-v1 empty manifests without confusing source and V2 blobs", async () => {
    for (const indexKind of ["operation", "subject", "receipt"] as const) {
      const legacy = legacyManifestBlob(indexKind);
      const parsed = await parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash,
        indexKind,
        ref: legacy.ref,
        raw: legacy.encoded,
        resolveNode: resolver,
      });
      expect(parsed.legacy).toBe(true);
      expect(parsed.sourceManifest).toEqual({
        schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
        indexKind,
        shardBits: 8,
        shards: [],
      });
      expect(parsed.manifest).toMatchObject({
        schemaVersion: "learning-v2-owner-repository-index-manifest.v2",
        indexKind,
        entryCount: 0,
        rootNodeRef: null,
      });
      expect(parsed.sourceManifestBlob).toEqual(legacy);
      expect(parsed.normalizedManifestBlob.ref).not.toEqual(legacy.ref);
      expect(JSON.parse(parsed.normalizedManifestBlob.encoded)).toMatchObject({
        payload: {
          schemaVersion: "learning-v2-owner-repository-index-manifest.v2",
        },
      });
      const malformed = legacyManifestBlob(indexKind, [{ prefix: "00" }]);
      await expect(
        parseOwnerRepositoryEconomicManifestBlob({
          accountScopeHash,
          indexKind,
          ref: malformed.ref,
          raw: malformed.encoded,
          resolveNode: resolver,
        }),
      ).rejects.toThrow("owner_economic_manifest_indeterminate");
    }
  });

  it("plans exactly four canonical lifetime keys and resolves an exact closure", async () => {
    const empty = await createEmptySet();
    const plan = await planClosure(empty);
    addBlobs(plan.immutableNodeBlobs);
    expect(plan).toMatchObject({
      changed: true,
      operationManifest: { entryCount: 2 },
      subjectManifest: { entryCount: 1 },
      receiptManifest: { entryCount: 1 },
    });
    await expect(
      Promise.all([
        parseOwnerRepositoryEconomicManifestBlob({
          accountScopeHash,
          indexKind: "operation",
          ref: plan.operationManifestBlob.ref,
          raw: plan.operationManifestBlob.encoded,
          resolveNode: resolver,
        }),
        parseOwnerRepositoryEconomicManifestBlob({
          accountScopeHash,
          indexKind: "subject",
          ref: plan.subjectManifestBlob.ref,
          raw: plan.subjectManifestBlob.encoded,
          resolveNode: resolver,
        }),
        parseOwnerRepositoryEconomicManifestBlob({
          accountScopeHash,
          indexKind: "receipt",
          ref: plan.receiptManifestBlob.ref,
          raw: plan.receiptManifestBlob.encoded,
          resolveNode: resolver,
        }),
      ]),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ legacy: false }),
        expect.objectContaining({ legacy: false }),
        expect.objectContaining({ legacy: false }),
      ]),
    );
    const closure = await lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
      accountScopeHash,
      operationManifest: plan.operationManifest,
      subjectManifest: plan.subjectManifest,
      receiptManifest: plan.receiptManifest,
      operationId: operation.operationId,
      operationFingerprint: operation.operationFingerprint,
      semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
      resolveNode: resolver,
    });
    expect(closure).toEqual({
      status: "canonical",
      operationLedgerEntry: applied.operationLedgerEntry,
      subjectLedgerEntry: applied.subjectLedgerEntry,
      appliedReceipt: applied.appliedReceipt,
    });
    await expect(
      assertOwnerRepositoryEconomicClosureForReceipt({
        accountScopeHash,
        operationManifest: plan.operationManifest,
        subjectManifest: plan.subjectManifest,
        receiptManifest: plan.receiptManifest,
        appliedReceipt: applied.appliedReceipt,
        resolveNode: resolver,
      }),
    ).resolves.toEqual({
      operationLedgerEntry: applied.operationLedgerEntry,
      subjectLedgerEntry: applied.subjectLedgerEntry,
      appliedReceipt: applied.appliedReceipt,
    });
    const replay = await planOwnerRepositoryCanonicalEconomicClosure({
      accountScopeHash,
      operationManifest: plan.operationManifest,
      subjectManifest: plan.subjectManifest,
      receiptManifest: plan.receiptManifest,
      operationLedgerEntry: applied.operationLedgerEntry,
      subjectLedgerEntry: applied.subjectLedgerEntry,
      appliedReceipt: applied.appliedReceipt,
      resolveNode: resolver,
    });
    expect(replay).toMatchObject({ changed: false, immutableNodeBlobs: [] });
    expect(replay.operationManifestBlob).toEqual(plan.operationManifestBlob);
    expect(Object.isFrozen(plan.immutableNodeBlobs)).toBe(true);
  });

  it("adds a verifiable two-key alias without changing canonical subject or receipt", async () => {
    const canonical = await planClosure();
    addBlobs(canonical.immutableNodeBlobs);
    const alias = await planOwnerRepositoryOperationAlias({
      accountScopeHash,
      operationManifest: canonical.operationManifest,
      subjectManifest: canonical.subjectManifest,
      receiptManifest: canonical.receiptManifest,
      authorizedAliasOperation: aliasOperation,
      resolveNode: resolver,
    });
    addBlobs(alias.immutableNodeBlobs);
    expect(alias).toMatchObject({
      changed: true,
      operationManifest: { entryCount: 4 },
      aliasEntry: {
        schemaVersion: "learning-v2-wallet-operation-alias-ledger-entry.v2",
        operationId: aliasOperation.operationId,
        operationFingerprint: aliasOperation.operationFingerprint,
        canonicalOperationId: operation.operationId,
        authorizedAliasOperation: aliasOperation,
        appliedReceipt: applied.appliedReceipt,
      },
    });
    const closure = await lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
      accountScopeHash,
      operationManifest: alias.operationManifest,
      subjectManifest: canonical.subjectManifest,
      receiptManifest: canonical.receiptManifest,
      operationId: aliasOperation.operationId,
      operationFingerprint: aliasOperation.operationFingerprint,
      semanticSubjectFingerprint: aliasOperation.semanticSubjectFingerprint,
      resolveNode: resolver,
    });
    expect(closure).toEqual({
      status: "alias",
      operationLedgerEntry: alias.aliasEntry,
      subjectLedgerEntry: applied.subjectLedgerEntry,
      appliedReceipt: applied.appliedReceipt,
    });
    const replay = await planOwnerRepositoryOperationAlias({
      accountScopeHash,
      operationManifest: alias.operationManifest,
      subjectManifest: canonical.subjectManifest,
      receiptManifest: canonical.receiptManifest,
      authorizedAliasOperation: aliasOperation,
      resolveNode: resolver,
    });
    expect(replay).toMatchObject({ changed: false, immutableNodeBlobs: [] });
    expect(replay.operationManifestBlob).toEqual(alias.operationManifestBlob);

    let cursor = null;
    let audit;
    do {
      audit = await auditOwnerRepositoryEconomicClosurePage({
        accountScopeHash,
        operationManifest: alias.operationManifest,
        subjectManifest: canonical.subjectManifest,
        receiptManifest: canonical.receiptManifest,
        cursor,
        maxNodes: 16,
        resolveNode: resolver,
        readBudget: {
          maxExternalReads: 128,
          maxExternalBytes: 8 * 1024 * 1024,
        },
      });
      cursor = audit.cursor;
    } while (!audit.done);
    expect(audit.done).toBe(true);
  });

  it("audits every stored economic value through the typed paged boundary", async () => {
    const plan = await planClosure();
    addBlobs(plan.immutableNodeBlobs);
    for (const [indexKind, manifest, expectedEntries] of [
      ["operation", plan.operationManifest, 2],
      ["subject", plan.subjectManifest, 1],
      ["receipt", plan.receiptManifest, 1],
    ] as const) {
      const audit = await auditOwnerRepositoryEconomicManifestPage({
        accountScopeHash,
        indexKind,
        manifest,
        cursor: null,
        maxNodes: 8,
        resolveNode: resolver,
      });
      expect(audit.radix).toMatchObject({
        done: true,
        visitedEntryCount: expectedEntries,
      });
      expect(audit.typedValues).toHaveLength(expectedEntries);
      expect(Object.isFrozen(audit.typedValues)).toBe(true);
    }

    const poisoned = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: {
        schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
        indexKind: "operation",
        shardBits: 8,
        shards: [],
      },
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: "poisoned-audit-operation",
          value: { garbage: true },
        },
      ],
      resolveNode: () => null,
    });
    addBlobs(poisoned.immutableBlobs);
    await expect(
      auditOwnerRepositoryEconomicManifestPage({
        accountScopeHash,
        indexKind: "operation",
        manifest: poisoned.manifest,
        cursor: null,
        maxNodes: 8,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");
  });

  it("crosslinks all four lifetime families with a bounded closure cursor", async () => {
    const plan = await planClosure();
    addBlobs(plan.immutableNodeBlobs);
    let page = await auditOwnerRepositoryEconomicClosurePage({
      accountScopeHash,
      operationManifest: plan.operationManifest,
      subjectManifest: plan.subjectManifest,
      receiptManifest: plan.receiptManifest,
      cursor: null,
      maxNodes: 1,
      resolveNode: resolver,
    });
    expect(page.done).toBe(false);
    expect(isOwnerRepositoryEconomicClosureAuditCursor(page.cursor)).toBe(true);
    await expect(
      auditOwnerRepositoryEconomicClosurePage({
        accountScopeHash,
        operationManifest: plan.operationManifest,
        subjectManifest: plan.subjectManifest,
        receiptManifest: plan.receiptManifest,
        cursor: { ...page.cursor! },
        maxNodes: 1,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_invalid");
    while (!page.done) {
      page = await auditOwnerRepositoryEconomicClosurePage({
        accountScopeHash,
        operationManifest: plan.operationManifest,
        subjectManifest: plan.subjectManifest,
        receiptManifest: plan.receiptManifest,
        cursor: page.cursor,
        maxNodes: 1,
        resolveNode: resolver,
      });
    }
    expect(page.cursor).toBeNull();

    const empty = await createEmptySet();
    const otherPlan = await planOwnerRepositoryCanonicalEconomicClosure({
      accountScopeHash,
      operationManifest: empty.operation.manifest,
      subjectManifest: empty.subject.manifest,
      receiptManifest: empty.receipt.manifest,
      operationLedgerEntry: otherApplied.operationLedgerEntry,
      subjectLedgerEntry: otherApplied.subjectLedgerEntry,
      appliedReceipt: otherApplied.appliedReceipt,
      resolveNode: resolver,
    });
    addBlobs(otherPlan.immutableNodeBlobs);
    let mixed = await auditOwnerRepositoryEconomicClosurePage({
      accountScopeHash,
      operationManifest: plan.operationManifest,
      subjectManifest: otherPlan.subjectManifest,
      receiptManifest: otherPlan.receiptManifest,
      cursor: null,
      maxNodes: 8,
      resolveNode: resolver,
    });
    await expect(
      (async () => {
        while (!mixed.done) {
          mixed = await auditOwnerRepositoryEconomicClosurePage({
            accountScopeHash,
            operationManifest: plan.operationManifest,
            subjectManifest: otherPlan.subjectManifest,
            receiptManifest: otherPlan.receiptManifest,
            cursor: mixed.cursor,
            maxNodes: 8,
            resolveNode: resolver,
          });
        }
      })(),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");
  });

  it("accepts only subject+receipt as the intentional pre-alias partial state", async () => {
    const empty = await createEmptySet();
    const full = await planClosure(empty);
    addBlobs(full.immutableNodeBlobs);
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest: empty.operation.manifest,
        subjectManifest: full.subjectManifest,
        receiptManifest: full.receiptManifest,
        operationId: aliasOperation.operationId,
        operationFingerprint: aliasOperation.operationFingerprint,
        semanticSubjectFingerprint: aliasOperation.semanticSubjectFingerprint,
        resolveNode: resolver,
      }),
    ).resolves.toEqual({
      status: "subject_only",
      subjectLedgerEntry: applied.subjectLedgerEntry,
      appliedReceipt: applied.appliedReceipt,
    });
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest: full.operationManifest,
        subjectManifest: empty.subject.manifest,
        receiptManifest: full.receiptManifest,
        operationId: operation.operationId,
        operationFingerprint: operation.operationFingerprint,
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest: empty.operation.manifest,
        subjectManifest: full.subjectManifest,
        receiptManifest: empty.receipt.manifest,
        operationId: operation.operationId,
        operationFingerprint: operation.operationFingerprint,
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");
  });

  it("rejects a one-key operation pair and a poisoned alias ledger value", async () => {
    const empty = await createEmptySet();
    const oneOperationKey = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: empty.operation.manifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: applied.operationLedgerEntry.operationId,
          value: applied.operationLedgerEntry,
        },
      ],
      resolveNode: resolver,
    });
    addBlobs(oneOperationKey.immutableBlobs);
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest:
          oneOperationKey.manifest as OwnerRepositoryEconomicManifestV2<"operation">,
        subjectManifest: empty.subject.manifest,
        receiptManifest: empty.receipt.manifest,
        operationId: operation.operationId,
        operationFingerprint: operation.operationFingerprint,
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");

    const aliasEntry: WalletOperationLedgerEntryV1 = {
      ...applied.operationLedgerEntry,
      operationId: "wallet-credit-alias",
      operationFingerprint: hash("d"),
    };
    await expect(
      planOwnerRepositoryCanonicalEconomicClosure({
        accountScopeHash,
        operationManifest: empty.operation.manifest,
        subjectManifest: empty.subject.manifest,
        receiptManifest: empty.receipt.manifest,
        operationLedgerEntry: aliasEntry,
        subjectLedgerEntry: applied.subjectLedgerEntry,
        appliedReceipt: applied.appliedReceipt,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_invalid");
  });

  it("rejects stored radix values bound to the wrong typed key and stored v1 alias rows", async () => {
    const empty = await createEmptySet();
    const wrongOperationId = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: empty.operation.manifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: "different-operation-id",
          value: applied.operationLedgerEntry,
        },
      ],
      resolveNode: resolver,
    });
    addBlobs(wrongOperationId.immutableBlobs);
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest:
          wrongOperationId.manifest as OwnerRepositoryEconomicManifestV2<"operation">,
        subjectManifest: empty.subject.manifest,
        receiptManifest: empty.receipt.manifest,
        operationId: "different-operation-id",
        operationFingerprint: operation.operationFingerprint,
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");

    const wrongOperationFingerprint = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: empty.operation.manifest,
      mutations: [
        {
          keyKind: "operation_fingerprint",
          logicalKey: hash("f"),
          value: applied.operationLedgerEntry,
        },
      ],
      resolveNode: resolver,
    });
    addBlobs(wrongOperationFingerprint.immutableBlobs);
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest:
          wrongOperationFingerprint.manifest as OwnerRepositoryEconomicManifestV2<"operation">,
        subjectManifest: empty.subject.manifest,
        receiptManifest: empty.receipt.manifest,
        operationId: operation.operationId,
        operationFingerprint: hash("f"),
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");

    const wrongSubject = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "subject",
      manifest: empty.subject.manifest,
      mutations: [
        {
          keyKind: "semantic_subject",
          logicalKey: hash("f"),
          value: applied.subjectLedgerEntry,
        },
      ],
      resolveNode: resolver,
    });
    addBlobs(wrongSubject.immutableBlobs);
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest: empty.operation.manifest,
        subjectManifest:
          wrongSubject.manifest as OwnerRepositoryEconomicManifestV2<"subject">,
        receiptManifest: empty.receipt.manifest,
        operationId: aliasOperation.operationId,
        operationFingerprint: aliasOperation.operationFingerprint,
        semanticSubjectFingerprint: hash("f"),
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");

    const subjectOnly = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "subject",
      manifest: empty.subject.manifest,
      mutations: [
        {
          keyKind: "semantic_subject",
          logicalKey: applied.subjectLedgerEntry.semanticSubjectFingerprint,
          value: applied.subjectLedgerEntry,
        },
      ],
      resolveNode: resolver,
    });
    const wrongReceipt = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "receipt",
      manifest: empty.receipt.manifest,
      mutations: [
        {
          keyKind: "applied_receipt",
          logicalKey: applied.appliedReceipt.appliedReceiptFingerprint,
          value: otherApplied.appliedReceipt,
        },
      ],
      resolveNode: resolver,
    });
    addBlobs([...subjectOnly.immutableBlobs, ...wrongReceipt.immutableBlobs]);
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest: empty.operation.manifest,
        subjectManifest:
          subjectOnly.manifest as OwnerRepositoryEconomicManifestV2<"subject">,
        receiptManifest:
          wrongReceipt.manifest as OwnerRepositoryEconomicManifestV2<"receipt">,
        operationId: aliasOperation.operationId,
        operationFingerprint: aliasOperation.operationFingerprint,
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");

    const aliasRows = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: empty.operation.manifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: aliasOperation.operationId,
          value: aliasApplied.operationLedgerEntry,
        },
        {
          keyKind: "operation_fingerprint",
          logicalKey: aliasOperation.operationFingerprint,
          value: aliasApplied.operationLedgerEntry,
        },
      ],
      resolveNode: resolver,
    });
    const full = await planClosure(empty);
    addBlobs([...aliasRows.immutableBlobs, ...full.immutableNodeBlobs]);
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest:
          aliasRows.manifest as OwnerRepositoryEconomicManifestV2<"operation">,
        subjectManifest: full.subjectManifest,
        receiptManifest: full.receiptManifest,
        operationId: aliasOperation.operationId,
        operationFingerprint: aliasOperation.operationFingerprint,
        semanticSubjectFingerprint: aliasOperation.semanticSubjectFingerprint,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");
  });

  it("fails closed on typed key/value drift, conflicts, and one mixed closure plan", async () => {
    const empty = await createEmptySet();
    const full = await planClosure(empty);
    addBlobs(full.immutableNodeBlobs);
    await expect(
      planOwnerRepositoryCanonicalEconomicClosure({
        accountScopeHash,
        operationManifest: full.operationManifest,
        subjectManifest: empty.subject.manifest,
        receiptManifest: full.receiptManifest,
        operationLedgerEntry: applied.operationLedgerEntry,
        subjectLedgerEntry: applied.subjectLedgerEntry,
        appliedReceipt: applied.appliedReceipt,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");

    const wrongSubject = {
      ...applied.subjectLedgerEntry,
      canonicalOperationId: "other-operation",
    };
    await expect(
      planOwnerRepositoryCanonicalEconomicClosure({
        accountScopeHash,
        operationManifest: empty.operation.manifest,
        subjectManifest: empty.subject.manifest,
        receiptManifest: empty.receipt.manifest,
        operationLedgerEntry: applied.operationLedgerEntry,
        subjectLedgerEntry: wrongSubject,
        appliedReceipt: applied.appliedReceipt,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_invalid");

    const conflictingOperation = {
      ...applied.operationLedgerEntry,
      semanticFingerprint: hash("e"),
    };
    const conflictTree = await planOwnerRepositoryRadixBatch({
      accountScopeHash,
      indexKind: "operation",
      manifest: empty.operation.manifest,
      mutations: [
        {
          keyKind: "operation_id",
          logicalKey: operation.operationId,
          value: conflictingOperation,
        },
      ],
      resolveNode: resolver,
    });
    addBlobs(conflictTree.immutableBlobs);
    await expect(
      planOwnerRepositoryCanonicalEconomicClosure({
        accountScopeHash,
        operationManifest:
          conflictTree.manifest as OwnerRepositoryEconomicManifestV2<"operation">,
        subjectManifest: empty.subject.manifest,
        receiptManifest: empty.receipt.manifest,
        operationLedgerEntry: applied.operationLedgerEntry,
        subjectLedgerEntry: applied.subjectLedgerEntry,
        appliedReceipt: applied.appliedReceipt,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");
  });

  it("allows only exact 0-of-4 insertion or exact 4-of-4 replay across every occupancy", async () => {
    for (let mask = 0; mask < 16; mask += 1) {
      const empty = await createEmptySet();
      const operationPlan = await planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "operation",
        manifest: empty.operation.manifest,
        mutations: [
          ...(mask & 1
            ? [
                {
                  keyKind: "operation_id" as const,
                  logicalKey: operation.operationId,
                  value: applied.operationLedgerEntry,
                },
              ]
            : []),
          ...(mask & 2
            ? [
                {
                  keyKind: "operation_fingerprint" as const,
                  logicalKey: operation.operationFingerprint,
                  value: applied.operationLedgerEntry,
                },
              ]
            : []),
        ],
        resolveNode: resolver,
      });
      const subjectPlan = await planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "subject",
        manifest: empty.subject.manifest,
        mutations:
          mask & 4
            ? [
                {
                  keyKind: "semantic_subject",
                  logicalKey: operation.semanticSubjectFingerprint,
                  value: applied.subjectLedgerEntry,
                },
              ]
            : [],
        resolveNode: resolver,
      });
      const receiptPlan = await planOwnerRepositoryRadixBatch({
        accountScopeHash,
        indexKind: "receipt",
        manifest: empty.receipt.manifest,
        mutations:
          mask & 8
            ? [
                {
                  keyKind: "applied_receipt",
                  logicalKey: applied.appliedReceipt.appliedReceiptFingerprint,
                  value: applied.appliedReceipt,
                },
              ]
            : [],
        resolveNode: resolver,
      });
      addBlobs([
        ...operationPlan.immutableBlobs,
        ...subjectPlan.immutableBlobs,
        ...receiptPlan.immutableBlobs,
      ]);
      const candidate = planOwnerRepositoryCanonicalEconomicClosure({
        accountScopeHash,
        operationManifest:
          operationPlan.manifest as OwnerRepositoryEconomicManifestV2<"operation">,
        subjectManifest:
          subjectPlan.manifest as OwnerRepositoryEconomicManifestV2<"subject">,
        receiptManifest:
          receiptPlan.manifest as OwnerRepositoryEconomicManifestV2<"receipt">,
        operationLedgerEntry: applied.operationLedgerEntry,
        subjectLedgerEntry: applied.subjectLedgerEntry,
        appliedReceipt: applied.appliedReceipt,
        resolveNode: resolver,
      });
      if (mask === 0) {
        await expect(candidate).resolves.toMatchObject({ changed: true });
      } else if (mask === 15) {
        await expect(candidate).resolves.toMatchObject({
          changed: false,
          immutableNodeBlobs: [],
        });
      } else {
        await expect(candidate).rejects.toThrow(
          "owner_economic_manifest_indeterminate",
        );
      }
    }
  });

  it("strictly parses manifest envelopes and never executes accessors", async () => {
    const empty = await createEmptyOwnerRepositoryEconomicManifest(
      accountScopeHash,
      "operation",
    );
    let getterRuns = 0;
    const hostileRef = { ...empty.manifestBlob.ref } as Record<string, unknown>;
    Object.defineProperty(hostileRef, "blobFingerprint", {
      enumerable: true,
      get() {
        getterRuns += 1;
        return empty.manifestBlob.ref.blobFingerprint;
      },
    });
    await expect(
      parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash,
        indexKind: "operation",
        ref: hostileRef as never,
        raw: empty.manifestBlob.encoded,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");
    expect(getterRuns).toBe(0);

    const wrongKindRef = {
      ...empty.manifestBlob.ref,
      kind: "subject_index_manifest" as const,
    };
    await expect(
      parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash,
        indexKind: "operation",
        ref: wrongKindRef,
        raw: empty.manifestBlob.encoded,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");
    await expect(
      parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash,
        indexKind: "operation",
        ref: empty.manifestBlob.ref,
        raw: ` ${empty.manifestBlob.encoded}`,
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_economic_manifest_indeterminate");
    for (const readBudget of [null, false, 0, ""] as const) {
      await expect(
        parseOwnerRepositoryEconomicManifestBlob({
          accountScopeHash,
          indexKind: "operation",
          ref: empty.manifestBlob.ref,
          raw: empty.manifestBlob.encoded,
          resolveNode: resolver,
          readBudget: readBudget as never,
        }),
      ).rejects.toThrow("owner_economic_manifest_invalid");
    }
    await expect(
      parseOwnerRepositoryEconomicManifestBlob({
        accountScopeHash,
        indexKind: "operation",
        ref: empty.manifestBlob.ref,
        raw: empty.manifestBlob.encoded,
        resolveNode: resolver,
        readBudget: undefined,
      }),
    ).rejects.toThrow("owner_economic_manifest_invalid");
  });

  it("enforces one aggregate resolver budget across the four closure lookups", async () => {
    const plan = await planClosure();
    addBlobs(plan.immutableNodeBlobs);
    let reads = 0;
    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest: plan.operationManifest,
        subjectManifest: plan.subjectManifest,
        receiptManifest: plan.receiptManifest,
        operationId: operation.operationId,
        operationFingerprint: operation.operationFingerprint,
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        resolveNode: (ref) => {
          reads += 1;
          return resolver(ref);
        },
        readBudget: { maxExternalReads: 2, maxExternalBytes: 64 * 1024 * 1024 },
      }),
    ).rejects.toThrow("owner_economic_manifest_read_budget_exceeded");
    expect(reads).toBe(2);

    await expect(
      planOwnerRepositoryCanonicalEconomicClosure({
        accountScopeHash,
        operationManifest: plan.operationManifest,
        subjectManifest: plan.subjectManifest,
        receiptManifest: plan.receiptManifest,
        operationLedgerEntry: applied.operationLedgerEntry,
        subjectLedgerEntry: applied.subjectLedgerEntry,
        appliedReceipt: applied.appliedReceipt,
        resolveNode: resolver,
        readBudget: { maxExternalReads: 2, maxExternalBytes: 64 * 1024 * 1024 },
      }),
    ).rejects.toThrow("owner_economic_manifest_read_budget_exceeded");

    const bytesByKind = Object.fromEntries(
      plan.immutableNodeBlobs.map((blob) => {
        const envelope = JSON.parse(blob.encoded) as {
          payload: { indexKind: string };
        };
        return [envelope.payload.indexKind, utf8ByteLengthV1(blob.encoded)];
      }),
    );
    const firstTwoBytes =
      Number(bytesByKind.operation) + Number(bytesByKind.subject);
    await expect(
      planOwnerRepositoryCanonicalEconomicClosure({
        accountScopeHash,
        operationManifest: plan.operationManifest,
        subjectManifest: plan.subjectManifest,
        receiptManifest: plan.receiptManifest,
        operationLedgerEntry: applied.operationLedgerEntry,
        subjectLedgerEntry: applied.subjectLedgerEntry,
        appliedReceipt: applied.appliedReceipt,
        resolveNode: resolver,
        readBudget: { maxExternalReads: 10, maxExternalBytes: firstTwoBytes },
      }),
    ).rejects.toThrow("owner_economic_manifest_read_budget_exceeded");

    await expect(
      lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
        accountScopeHash,
        operationManifest: plan.operationManifest,
        subjectManifest: plan.subjectManifest,
        receiptManifest: plan.receiptManifest,
        operationId: operation.operationId,
        operationFingerprint: operation.operationFingerprint,
        semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
        resolveNode: resolver,
        readBudget: undefined,
      }),
    ).rejects.toThrow("owner_economic_manifest_invalid");

    const canonical = canonicalJsonV1(
      JSON.parse(plan.operationManifestBlob.encoded),
    );
    expect(canonical).toBe(plan.operationManifestBlob.encoded);
  });
});

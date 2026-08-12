import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import { createEmptyOwnerRepositoryCourseManifest } from "../modules/learning-v2/progress/owner_repository_course_manifest";
import {
  createEmptyOwnerRepositoryEconomicManifest,
} from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import type {
  OwnerRepositoryEconomicManifestBlob,
} from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import type {
  OwnerRepositoryRadixNodeRefV1,
} from "../modules/learning-v2/progress/owner_repository_radix";
import {
  createGenesisOwnerRepositoryRootV2,
  type OwnerRepositoryRootV2,
} from "../modules/learning-v2/progress/owner_repository_root_v2";
import {
  planOwnerRepositoryWalletCredit,
} from "../modules/learning-v2/progress/owner_repository_wallet_credit_plan";
import {
  materializeOwnerRepositoryWalletStateBlob,
  parseOwnerRepositoryWalletStateBlob,
} from "../modules/learning-v2/progress/owner_repository_wallet_blob";
import { createWalletState } from "../modules/learning-v2/progress/wallet_reducer";
import { canonicalJsonV1, sha256Utf8 } from "../modules/learning-v2/policies/decision_registry";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;
const hash = (character: string) => character.repeat(64);
const makeOperation = (input: {
  readonly operationId: string;
  readonly sourceReceiptId: string;
  readonly sourceReceiptFingerprint: string;
  readonly walletRevisionBefore: number;
  readonly accountGeneration?: number;
  readonly amountSubunits?: number;
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
    accountGeneration: input.accountGeneration ?? generation,
    currency: "access_star",
    kind: "earning_credit",
    amountSubunits: input.amountSubunits ?? 36 * WALLET_SUBUNITS_PER_STAR,
    earningCategory: "lesson",
    operationReason: "initial_required_session",
    sourceReceiptRef,
    walletRevisionBefore: input.walletRevisionBefore,
    origin: {
      kind: "course",
      courseId: "english-core",
      studyTarget: "en",
      requiredSessionOrdinal: 1,
    },
  });
};
const firstOperation = makeOperation({
  operationId: "wallet-credit-1",
  sourceReceiptId: "required-session-credit-1",
  sourceReceiptFingerprint: hash("c"),
  walletRevisionBefore: 0,
});
const secondOperation = makeOperation({
  operationId: "wallet-credit-2",
  sourceReceiptId: "required-session-credit-2",
  sourceReceiptFingerprint: hash("d"),
  walletRevisionBefore: 1,
});
const aliasOperation = makeOperation({
  operationId: "wallet-credit-alias",
  sourceReceiptId: "required-session-credit-1",
  sourceReceiptFingerprint: hash("c"),
  walletRevisionBefore: 1,
});

const values = new Map<string, string>();
const resolver = (ref: OwnerRepositoryRadixNodeRefV1) => values.get(ref.blobKey) ?? null;
const addPlanned = (blobs: readonly { readonly ref: { readonly blobKey: string }; readonly encoded: string }[]) => {
  for (const blob of blobs) values.set(blob.ref.blobKey, blob.encoded);
};
const plannedBlob = <T extends "operation_index_manifest" | "subject_index_manifest" | "receipt_index_manifest">(
  blobs: readonly { readonly ref: { readonly kind: string }; readonly encoded: string }[],
  kind: T,
): OwnerRepositoryEconomicManifestBlob => {
  const found = blobs.find((blob) => blob.ref.kind === kind);
  if (!found) throw new Error(`missing ${kind} fixture`);
  return found as OwnerRepositoryEconomicManifestBlob;
};
const legacyManifestBlob = (indexKind: "operation" | "subject" | "receipt") => {
  const kind = `${indexKind}_index_manifest` as
    "operation_index_manifest" | "subject_index_manifest" | "receipt_index_manifest";
  const encoded = canonicalJsonV1({
    schemaVersion: "learning-v2-owner-repository-blob.v1",
    accountScopeHash,
    kind,
    payload: {
      schemaVersion: "learning-v2-owner-repository-index-manifest.v1",
      indexKind,
      shardBits: 8,
      shards: [],
    },
  });
  const blobFingerprint = sha256Utf8(encoded);
  return {
    manifestBlob: {
      encoded,
      ref: {
        schemaVersion: "learning-v2-owner-repository-blob-ref.v1" as const,
        kind,
        blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
        blobFingerprint,
      },
    },
  };
};

const createGenesisFixture = async (legacy = false) => {
  const wallet = materializeOwnerRepositoryWalletStateBlob(createWalletState({ accountScopeHash }));
  const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
  const operation = legacy
    ? legacyManifestBlob("operation")
    : await createEmptyOwnerRepositoryEconomicManifest(accountScopeHash, "operation");
  const subject = legacy
    ? legacyManifestBlob("subject")
    : await createEmptyOwnerRepositoryEconomicManifest(accountScopeHash, "subject");
  const receipt = legacy
    ? legacyManifestBlob("receipt")
    : await createEmptyOwnerRepositoryEconomicManifest(accountScopeHash, "receipt");
  const root = createGenesisOwnerRepositoryRootV2({
    accountScopeHash,
    currentGeneration: generation,
    walletStateRef: wallet.blob.ref,
    courseStateManifestRef: course.manifestBlob.ref,
    operationIndexManifestRef: operation.manifestBlob.ref,
    subjectIndexManifestRef: subject.manifestBlob.ref,
    receiptIndexManifestRef: receipt.manifestBlob.ref,
  });
  return { wallet, course, operation, subject, receipt, root };
};
const planInput = (
  fixture: Awaited<ReturnType<typeof createGenesisFixture>>,
  operation = firstOperation,
) => ({
  rootBefore: fixture.root.root,
  walletStateBeforeBlob: fixture.wallet.blob,
  operationManifestBlob: fixture.operation.manifestBlob,
  subjectManifestBlob: fixture.subject.manifestBlob,
  receiptManifestBlob: fixture.receipt.manifestBlob,
  authorizedOperation: operation,
  resolveNode: resolver,
});
const rehashRoot = (
  root: OwnerRepositoryRootV2,
  mutation: Partial<Omit<OwnerRepositoryRootV2, "rootFingerprint">>,
) => {
  const { rootFingerprint: _discarded, ...body } = root;
  const nextBody = { ...body, ...mutation };
  return { ...nextBody, rootFingerprint: sha256Utf8(canonicalJsonV1(nextBody)) };
};
const differentRef = <T extends { readonly kind: string }>(
  ref: T,
  character: string,
): T => {
  const blobFingerprint = hash(character);
  return {
    ...ref,
    blobFingerprint,
    blobKey: `learning_v2_owner_repository:v1:${accountScopeHash}:blob:${blobFingerprint}`,
  };
};

beforeEach(() => values.clear());

describe("Learning V2 owner repository pure wallet-credit plan", () => {
  it("derives wallet, four-key COW, journal and successor root from one verified genesis", async () => {
    const fixture = await createGenesisFixture();
    const planned = await planOwnerRepositoryWalletCredit(planInput(fixture));
    expect(planned.status).toBe("applied");
    if (planned.status !== "applied") throw new Error("expected applied");
    expect(planned.appliedReceipt).toMatchObject({
      operationId: firstOperation.operationId,
      revisionBefore: 0,
      revisionAfter: 1,
      balanceBeforeSubunits: 0,
      balanceAfterSubunits: 36 * WALLET_SUBUNITS_PER_STAR,
    });
    expect(planned.successorRoot.root).toMatchObject({
      repositoryRevision: 1,
      journalSequence: 1,
      previousRootFingerprint: fixture.root.root.rootFingerprint,
      walletStateRef: planned.walletStateAfterBlob.ref,
      courseStateManifestRef: fixture.root.root.courseStateManifestRef,
      journalHeadRef: planned.journalRecordBlob.ref,
    });
    expect(planned.journalRecord).toMatchObject({
      previousJournalRecordRef: null,
      walletStateBeforeRef: fixture.wallet.blob.ref,
      walletStateAfterRef: planned.walletStateAfterBlob.ref,
      appliedReceiptFingerprint: planned.appliedReceipt.appliedReceiptFingerprint,
    });
    expect(planned.immutableBlobs.map((blob) => blob.ref.kind)).toEqual(expect.arrayContaining([
      "wallet_state",
      "operation_index_manifest",
      "subject_index_manifest",
      "receipt_index_manifest",
      "index_radix_node",
      "journal_record",
    ]));
    expect(Object.isFrozen(planned.successorRoot.root)).toBe(true);
    expect(fixture.root.root).toMatchObject({ repositoryRevision: 0, journalSequence: 0 });
  });

  it("upgrades exact legacy-empty economic manifests only through the effect successor", async () => {
    const fixture = await createGenesisFixture(true);
    const planned = await planOwnerRepositoryWalletCredit(planInput(fixture));
    expect(planned.status).toBe("applied");
    if (planned.status !== "applied") throw new Error("expected applied");
    const cases = [
      ["operationIndexManifestBeforeRef", "operationIndexManifestAfterRef", fixture.operation.manifestBlob,
        "operation_index_manifest", 2],
      ["subjectIndexManifestBeforeRef", "subjectIndexManifestAfterRef", fixture.subject.manifestBlob,
        "subject_index_manifest", 1],
      ["receiptIndexManifestBeforeRef", "receiptIndexManifestAfterRef", fixture.receipt.manifestBlob,
        "receipt_index_manifest", 1],
    ] as const;
    for (const [beforeKey, afterKey, beforeBlob, kind, entryCount] of cases) {
      expect(planned.journalRecord[beforeKey]).toEqual(beforeBlob.ref);
      expect(JSON.parse(beforeBlob.encoded)).toMatchObject({
        payload: { schemaVersion: "learning-v2-owner-repository-index-manifest.v1", shards: [] },
      });
      const after = plannedBlob(planned.immutableBlobs, kind);
      expect(JSON.parse(after.encoded)).toMatchObject({
        payload: { schemaVersion: "learning-v2-owner-repository-index-manifest.v2", entryCount },
      });
      expect(planned.journalRecord[afterKey]).toEqual(after.ref);
    }
  });

  it("replays the exact operation with zero blobs and appends a second distinct credit", async () => {
    const fixture = await createGenesisFixture();
    const first = await planOwnerRepositoryWalletCredit(planInput(fixture));
    if (first.status !== "applied") throw new Error("expected applied");
    addPlanned(first.immutableBlobs);
    const replay = await planOwnerRepositoryWalletCredit({
      rootBefore: first.successorRoot.root,
      walletStateBeforeBlob: first.walletStateAfterBlob,
      operationManifestBlob: plannedBlob(first.immutableBlobs, "operation_index_manifest"),
      subjectManifestBlob: plannedBlob(first.immutableBlobs, "subject_index_manifest"),
      receiptManifestBlob: plannedBlob(first.immutableBlobs, "receipt_index_manifest"),
      authorizedOperation: firstOperation,
      resolveNode: resolver,
    });
    expect(replay).toMatchObject({
      status: "replayed",
      appliedReceipt: first.appliedReceipt,
      immutableBlobs: [],
    });

    const second = await planOwnerRepositoryWalletCredit({
      rootBefore: first.successorRoot.root,
      walletStateBeforeBlob: first.walletStateAfterBlob,
      operationManifestBlob: plannedBlob(first.immutableBlobs, "operation_index_manifest"),
      subjectManifestBlob: plannedBlob(first.immutableBlobs, "subject_index_manifest"),
      receiptManifestBlob: plannedBlob(first.immutableBlobs, "receipt_index_manifest"),
      authorizedOperation: secondOperation,
      resolveNode: resolver,
    });
    expect(second.status).toBe("applied");
    if (second.status !== "applied") throw new Error("expected second applied");
    expect(second.successorRoot.root).toMatchObject({ repositoryRevision: 2, journalSequence: 2 });
    expect(second.journalRecord.previousJournalRecordRef).toEqual(first.journalRecordBlob.ref);
    expect(second.appliedReceipt.balanceAfterSubunits).toBe(72 * WALLET_SUBUNITS_PER_STAR);
  });

  it("returns the explicit alias-repair seam without writing or crediting twice", async () => {
    const fixture = await createGenesisFixture();
    const first = await planOwnerRepositoryWalletCredit(planInput(fixture));
    if (first.status !== "applied") throw new Error("expected applied");
    addPlanned(first.immutableBlobs);
    const subjectAfterBlob = plannedBlob(first.immutableBlobs, "subject_index_manifest");
    const receiptAfterBlob = plannedBlob(first.immutableBlobs, "receipt_index_manifest");
    const tornCanonicalRoot = createGenesisOwnerRepositoryRootV2({
      accountScopeHash,
      currentGeneration: generation,
      walletStateRef: first.walletStateAfterBlob.ref,
      courseStateManifestRef: fixture.course.manifestBlob.ref,
      operationIndexManifestRef: fixture.operation.manifestBlob.ref,
      subjectIndexManifestRef: subjectAfterBlob.ref,
      receiptIndexManifestRef: receiptAfterBlob.ref,
    });
    await expect(planOwnerRepositoryWalletCredit({
      rootBefore: tornCanonicalRoot.root,
      walletStateBeforeBlob: first.walletStateAfterBlob,
      operationManifestBlob: fixture.operation.manifestBlob,
      subjectManifestBlob: subjectAfterBlob,
      receiptManifestBlob: receiptAfterBlob,
      authorizedOperation: firstOperation,
      resolveNode: resolver,
    })).rejects.toThrow("owner_repository_wallet_credit_plan_indeterminate");
    await expect(planOwnerRepositoryWalletCredit({
      rootBefore: tornCanonicalRoot.root,
      walletStateBeforeBlob: first.walletStateAfterBlob,
      operationManifestBlob: fixture.operation.manifestBlob,
      subjectManifestBlob: subjectAfterBlob,
      receiptManifestBlob: receiptAfterBlob,
      authorizedOperation: aliasOperation,
      resolveNode: resolver,
    })).resolves.toMatchObject({ status: "alias_repair_required", immutableBlobs: [] });
    const alias = await planOwnerRepositoryWalletCredit({
      rootBefore: first.successorRoot.root,
      walletStateBeforeBlob: first.walletStateAfterBlob,
      operationManifestBlob: plannedBlob(first.immutableBlobs, "operation_index_manifest"),
      subjectManifestBlob: plannedBlob(first.immutableBlobs, "subject_index_manifest"),
      receiptManifestBlob: plannedBlob(first.immutableBlobs, "receipt_index_manifest"),
      authorizedOperation: aliasOperation,
      resolveNode: resolver,
    });
    expect(alias).toEqual({
      status: "alias_repair_required",
      appliedReceipt: first.appliedReceipt,
      authorizedOperation: aliasOperation,
      root: first.successorRoot.root,
      immutableBlobs: [],
    });

    const semanticConflict = makeOperation({
      operationId: "wallet-credit-semantic-conflict",
      sourceReceiptId: "required-session-credit-1",
      sourceReceiptFingerprint: hash("c"),
      walletRevisionBefore: 1,
      amountSubunits: 40 * WALLET_SUBUNITS_PER_STAR,
    });
    await expect(planOwnerRepositoryWalletCredit({
      rootBefore: first.successorRoot.root,
      walletStateBeforeBlob: first.walletStateAfterBlob,
      operationManifestBlob: plannedBlob(first.immutableBlobs, "operation_index_manifest"),
      subjectManifestBlob: plannedBlob(first.immutableBlobs, "subject_index_manifest"),
      receiptManifestBlob: plannedBlob(first.immutableBlobs, "receipt_index_manifest"),
      authorizedOperation: semanticConflict,
      resolveNode: resolver,
    })).rejects.toThrow("owner_repository_wallet_credit_plan_conflict");
  });

  it("fails closed on missing selected nodes, wrong source refs, stale generation and accessors", async () => {
    const fixture = await createGenesisFixture();
    const first = await planOwnerRepositoryWalletCredit(planInput(fixture));
    if (first.status !== "applied") throw new Error("expected applied");
    addPlanned(first.immutableBlobs);
    const operationNode = first.immutableBlobs.find((blob) => blob.ref.kind === "index_radix_node");
    if (!operationNode) throw new Error("missing node fixture");
    values.delete(operationNode.ref.blobKey);
    await expect(planOwnerRepositoryWalletCredit({
      rootBefore: first.successorRoot.root,
      walletStateBeforeBlob: first.walletStateAfterBlob,
      operationManifestBlob: plannedBlob(first.immutableBlobs, "operation_index_manifest"),
      subjectManifestBlob: plannedBlob(first.immutableBlobs, "subject_index_manifest"),
      receiptManifestBlob: plannedBlob(first.immutableBlobs, "receipt_index_manifest"),
      authorizedOperation: firstOperation,
      resolveNode: resolver,
    })).rejects.toThrow("owner_repository_wallet_credit_plan_indeterminate");

    await expect(planOwnerRepositoryWalletCredit({
      ...planInput(fixture),
      operationManifestBlob: fixture.subject.manifestBlob,
    })).rejects.toThrow("owner_repository_wallet_credit_plan_indeterminate");
    const mismatchedRoots = [
      rehashRoot(fixture.root.root, {
        walletStateRef: differentRef(fixture.root.root.walletStateRef, "1"),
      }),
      rehashRoot(fixture.root.root, {
        operationIndexManifestRef: differentRef(fixture.root.root.operationIndexManifestRef, "2"),
      }),
      rehashRoot(fixture.root.root, {
        subjectIndexManifestRef: differentRef(fixture.root.root.subjectIndexManifestRef, "3"),
      }),
      rehashRoot(fixture.root.root, {
        receiptIndexManifestRef: differentRef(fixture.root.root.receiptIndexManifestRef, "4"),
      }),
    ];
    for (const rootBefore of mismatchedRoots) {
      await expect(planOwnerRepositoryWalletCredit({
        ...planInput(fixture),
        rootBefore,
      })).rejects.toThrow("owner_repository_wallet_credit_plan_indeterminate");
    }
    const stale = makeOperation({
      operationId: "stale-credit",
      sourceReceiptId: "stale-source",
      sourceReceiptFingerprint: hash("e"),
      walletRevisionBefore: 0,
      accountGeneration: generation + 1,
    });
    await expect(planOwnerRepositoryWalletCredit(planInput(fixture, stale))).rejects.toThrow(
      "owner_repository_wallet_credit_plan_invalid",
    );
    const {
      operationFingerprint: _operationFingerprint,
      semanticFingerprint: _semanticFingerprint,
      ...unmaterializedOperation
    } = firstOperation;
    await expect(planOwnerRepositoryWalletCredit({
      ...planInput(fixture),
      authorizedOperation: unmaterializedOperation,
    })).rejects.toThrow("owner_repository_wallet_credit_plan_invalid");
    await expect(planOwnerRepositoryWalletCredit({
      ...planInput(fixture),
      authorizedOperation: { ...firstOperation, operationFingerprint: hash("9") },
    })).rejects.toThrow("owner_repository_wallet_credit_plan_invalid");
    const outOfOrder = makeOperation({
      operationId: "out-of-order-credit",
      sourceReceiptId: "out-of-order-source",
      sourceReceiptFingerprint: hash("f"),
      walletRevisionBefore: 1,
    });
    await expect(planOwnerRepositoryWalletCredit(planInput(fixture, outOfOrder))).rejects.toThrow(
      "owner_repository_wallet_credit_plan_reauthorize_required",
    );

    let getterRuns = 0;
    const hostile = { ...planInput(fixture) } as Record<string, unknown>;
    Object.defineProperty(hostile, "authorizedOperation", {
      enumerable: true,
      get() { getterRuns += 1; return firstOperation; },
    });
    await expect(planOwnerRepositoryWalletCredit(hostile)).rejects.toThrow(
      "owner_repository_wallet_credit_plan_invalid",
    );
    expect(getterRuns).toBe(0);

    await expect(planOwnerRepositoryWalletCredit({
      ...planInput(fixture),
      readBudget: undefined,
    })).rejects.toThrow("owner_repository_wallet_credit_plan_invalid");
    await expect(planOwnerRepositoryWalletCredit({
      ...planInput(fixture),
      readBudget: null,
    })).rejects.toThrow("owner_repository_wallet_credit_plan_invalid");
    addPlanned(first.immutableBlobs);
    await expect(planOwnerRepositoryWalletCredit({
      rootBefore: first.successorRoot.root,
      walletStateBeforeBlob: first.walletStateAfterBlob,
      operationManifestBlob: plannedBlob(first.immutableBlobs, "operation_index_manifest"),
      subjectManifestBlob: plannedBlob(first.immutableBlobs, "subject_index_manifest"),
      receiptManifestBlob: plannedBlob(first.immutableBlobs, "receipt_index_manifest"),
      authorizedOperation: firstOperation,
      resolveNode: resolver,
      readBudget: { maxExternalReads: 0, maxExternalBytes: 0 },
    })).rejects.toThrow("owner_repository_wallet_credit_plan_budget_exceeded");
  });

  it("round-trips the wallet blob canonically and rejects envelope/ref tampering", () => {
    const materialized = materializeOwnerRepositoryWalletStateBlob(createWalletState({ accountScopeHash }));
    expect(parseOwnerRepositoryWalletStateBlob({
      accountScopeHash,
      ref: materialized.blob.ref,
      raw: materialized.blob.encoded,
    })).toEqual(materialized);
    expect(materialized.blob.ref.blobFingerprint).toBe(sha256Utf8(materialized.blob.encoded));
    expect(canonicalJsonV1(JSON.parse(materialized.blob.encoded))).toBe(materialized.blob.encoded);
    expect(() => parseOwnerRepositoryWalletStateBlob({
      accountScopeHash,
      ref: { ...materialized.blob.ref, blobFingerprint: hash("f") },
      raw: materialized.blob.encoded,
    })).toThrow("owner_repository_wallet_blob_invalid");
    expect(() => parseOwnerRepositoryWalletStateBlob({
      accountScopeHash,
      ref: materialized.blob.ref,
      raw: ` ${materialized.blob.encoded}`,
    })).toThrow("owner_repository_wallet_blob_invalid");

    const foreign = materializeOwnerRepositoryWalletStateBlob(createWalletState({
      accountScopeHash: "bbbbbbbbbbbbbbbb",
    }));
    expect(() => parseOwnerRepositoryWalletStateBlob({
      accountScopeHash,
      ref: foreign.blob.ref,
      raw: foreign.blob.encoded,
    })).toThrow("owner_repository_wallet_blob_invalid");
    let getterRuns = 0;
    const hostileRef = { ...materialized.blob.ref };
    Object.defineProperty(hostileRef, "blobFingerprint", {
      enumerable: true,
      get() { getterRuns += 1; return materialized.blob.ref.blobFingerprint; },
    });
    expect(() => parseOwnerRepositoryWalletStateBlob({
      accountScopeHash,
      ref: hostileRef,
      raw: materialized.blob.encoded,
    })).toThrow("owner_repository_wallet_blob_invalid");
    expect(getterRuns).toBe(0);
    expect(() => parseOwnerRepositoryWalletStateBlob({
      accountScopeHash,
      ref: materialized.blob.ref,
      raw: "x".repeat(512 * 1024 + 1),
    })).toThrow("owner_repository_wallet_blob_invalid");
  });
});

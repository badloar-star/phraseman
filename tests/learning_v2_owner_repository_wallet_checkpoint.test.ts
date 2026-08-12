import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import { canonicalJsonV1, sha256Utf8 } from "../modules/learning-v2/policies/decision_registry";
import { createEmptyOwnerRepositoryCourseManifest } from "../modules/learning-v2/progress/owner_repository_course_manifest";
import {
  createEmptyOwnerRepositoryEconomicManifest,
  type OwnerRepositoryEconomicManifestBlob,
} from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import type { OwnerRepositoryRadixNodeRefV1 } from "../modules/learning-v2/progress/owner_repository_radix";
import {
  advanceOwnerRepositoryRootV2Generation,
  createGenesisOwnerRepositoryRootV2,
  migrateVerifiedGenesisOwnerRepositoryRootV1,
} from "../modules/learning-v2/progress/owner_repository_root_v2";
import type { OwnerRepositoryRootV1 } from "../modules/learning-v2/progress/owner_repository";
import {
  OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL,
  appendOwnerRepositoryWalletCreditCheckpointPage,
  appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition,
  createOwnerRepositoryWalletCheckpointAccumulator,
  createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration,
  matchOwnerRepositoryWalletCheckpointProjection,
  materializeOwnerRepositoryWalletCheckpoint,
  ownerRepositoryWalletCheckpointKey,
  parseOwnerRepositoryWalletCheckpoint,
} from "../modules/learning-v2/progress/owner_repository_wallet_checkpoint";
import { foldOwnerRepositoryWalletCreditPage } from "../modules/learning-v2/progress/owner_repository_wallet_credit_page";
import { materializeOwnerRepositoryWalletStateBlob } from "../modules/learning-v2/progress/owner_repository_wallet_blob";
import {
  planOwnerRepositoryWalletCredit,
  type OwnerRepositoryPlannedImmutableBlobV1,
} from "../modules/learning-v2/progress/owner_repository_wallet_credit_plan";
import { createWalletState, type WalletAppliedReceiptV1 } from "../modules/learning-v2/progress/wallet_reducer";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;
const values = new Map<string, string>();
const resolver = (ref: OwnerRepositoryRadixNodeRefV1) => values.get(ref.blobKey) ?? null;
const addBlobs = (blobs: readonly OwnerRepositoryPlannedImmutableBlobV1[]) => {
  for (const blob of blobs) values.set(blob.ref.blobKey, blob.encoded);
};
const manifestBlob = <K extends "operation" | "subject" | "receipt">(
  blobs: readonly OwnerRepositoryPlannedImmutableBlobV1[],
  indexKind: K,
): OwnerRepositoryEconomicManifestBlob<K> => {
  const found = blobs.find((blob) => blob.ref.kind === `${indexKind}_index_manifest`);
  if (!found) throw new Error(`missing ${indexKind} manifest fixture`);
  return found as OwnerRepositoryEconomicManifestBlob<K>;
};
const operation = (
  ordinal: number,
  walletRevisionBefore: number,
  accountGeneration = generation,
) => {
  const sourceReceiptRef = {
    receiptType: "required_session_credit_settlement" as const,
    receiptId: `wallet-checkpoint-source-${ordinal}`,
    receiptFingerprint: ordinal.toString(16).padStart(64, "0"),
  };
  return createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: `wallet-checkpoint-operation-${ordinal}`,
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash,
      operationReason: "initial_required_session",
      sourceReceiptRef,
    }),
    accountScopeHash,
    accountGeneration,
    currency: "access_star",
    kind: "earning_credit",
    amountSubunits: WALLET_SUBUNITS_PER_STAR,
    earningCategory: "lesson",
    operationReason: "initial_required_session",
    sourceReceiptRef,
    walletRevisionBefore,
    origin: {
      kind: "course",
      courseId: "english-core",
      studyTarget: "en",
      requiredSessionOrdinal: ordinal,
    },
  });
};

const genesis = async () => {
  const wallet = materializeOwnerRepositoryWalletStateBlob(createWalletState({ accountScopeHash }));
  const course = await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
  const operationManifest = await createEmptyOwnerRepositoryEconomicManifest(accountScopeHash, "operation");
  const subjectManifest = await createEmptyOwnerRepositoryEconomicManifest(accountScopeHash, "subject");
  const receiptManifest = await createEmptyOwnerRepositoryEconomicManifest(accountScopeHash, "receipt");
  const root = createGenesisOwnerRepositoryRootV2({
    accountScopeHash,
    currentGeneration: generation,
    walletStateRef: wallet.blob.ref,
    courseStateManifestRef: course.manifestBlob.ref,
    operationIndexManifestRef: operationManifest.manifestBlob.ref,
    subjectIndexManifestRef: subjectManifest.manifestBlob.ref,
    receiptIndexManifestRef: receiptManifest.manifestBlob.ref,
  });
  return { wallet, course, operationManifest, subjectManifest, receiptManifest, root };
};

const v1GenesisRoot = (start: Awaited<ReturnType<typeof genesis>>): OwnerRepositoryRootV1 => {
  const body = {
    schemaVersion: "learning-v2-owner-repository-root.v1" as const,
    accountScopeHash,
    currentGeneration: generation,
    repositoryRevision: 0,
    journalSequence: 0,
    previousRootFingerprint: null,
    journalHeadRef: null,
    walletStateRef: start.wallet.blob.ref,
    courseStateRefs: [] as const,
    operationIndexManifestRef: start.operationManifest.manifestBlob.ref,
    subjectIndexManifestRef: start.subjectManifest.manifestBlob.ref,
    receiptIndexManifestRef: start.receiptManifest.manifestBlob.ref,
  };
  return { ...body, rootFingerprint: sha256Utf8(canonicalJsonV1(body)) };
};

const deriveCanonical = async (
  count: number,
  suppliedStart?: Awaited<ReturnType<typeof genesis>>,
  accountGeneration = generation,
) => {
  const start = suppliedStart ?? await genesis();
  let root = start.root;
  let wallet = start.wallet.blob;
  let operationManifest = start.operationManifest.manifestBlob;
  let subjectManifest = start.subjectManifest.manifestBlob;
  let receiptManifest = start.receiptManifest.manifestBlob;
  const receipts: WalletAppliedReceiptV1[] = [];
  for (let index = 0; index < count; index += 1) {
    const plan = await planOwnerRepositoryWalletCredit({
      rootBefore: root.root,
      walletStateBeforeBlob: wallet,
      operationManifestBlob: operationManifest,
      subjectManifestBlob: subjectManifest,
      receiptManifestBlob: receiptManifest,
      authorizedOperation: operation(index + 1, index, accountGeneration),
      resolveNode: resolver,
    });
    if (plan.status !== "applied") throw new Error("checkpoint fixture plan failed");
    if (plan.successorRoot.root.schemaVersion !== "learning-v2-owner-repository-root.v2") {
      throw new Error("checkpoint fixture expected a v2 successor root");
    }
    addBlobs(plan.immutableBlobs);
    receipts.push(plan.appliedReceipt);
    root = plan.successorRoot as typeof root;
    wallet = plan.walletStateAfterBlob;
    operationManifest = manifestBlob(plan.immutableBlobs, "operation");
    subjectManifest = manifestBlob(plan.immutableBlobs, "subject");
    receiptManifest = manifestBlob(plan.immutableBlobs, "receipt");
  }
  return { start, ending: { root, wallet, operationManifest, subjectManifest, receiptManifest }, receipts };
};

const pageInput = (
  start: Awaited<ReturnType<typeof genesis>>,
  receipts: readonly WalletAppliedReceiptV1[],
) => ({
  startingRoot: start.root.root,
  walletStateBeforeBlob: start.wallet.blob,
  operationManifestBlob: start.operationManifest.manifestBlob,
  subjectManifestBlob: start.subjectManifest.manifestBlob,
  receiptManifestBlob: start.receiptManifest.manifestBlob,
  canonicalAppliedReceipts: receipts,
  resolveNode: resolver,
});

const bootstrap = async (start: Awaited<ReturnType<typeof genesis>>) => {
  const accumulator = createOwnerRepositoryWalletCheckpointAccumulator({
    startingRoot: start.root,
    previousCheckpoint: null,
  });
  const checkpoint = materializeOwnerRepositoryWalletCheckpoint({
    accumulator,
    endingWalletStateBlob: start.wallet.blob,
  });
  return matchOwnerRepositoryWalletCheckpointProjection({
    checkpoint,
    checkpointRoot: start.root.root,
    walletStateBlob: start.wallet.blob,
    courseManifestBlob: start.course.manifestBlob,
    operationManifestBlob: start.operationManifest.manifestBlob,
    subjectManifestBlob: start.subjectManifest.manifestBlob,
    receiptManifestBlob: start.receiptManifest.manifestBlob,
    resolveNode: resolver,
  });
};

beforeEach(() => values.clear());

describe("Learning V2 RootV2 wallet checkpoint codec", () => {
  it("materializes the unique fresh bootstrap and rejects an ambiguous revision-offset anchor", async () => {
    const start = await genesis();
    const fresh = await bootstrap(start);
    expect(fresh.key).toBe(ownerRepositoryWalletCheckpointKey(
      accountScopeHash,
      start.root.root.rootFingerprint,
    ));
    expect(fresh.checkpoint.walletRevision).toBe(0);
    expect(fresh.checkpoint.operationEntryCount).toBe(0);
    expect(Object.isFrozen(fresh.checkpoint.walletStateRef)).toBe(true);
    expect(parseOwnerRepositoryWalletCheckpoint({
      accountScopeHash,
      checkpointRoot: start.root.root,
      key: fresh.key,
      raw: fresh.encoded,
      walletStateBlob: start.wallet.blob,
    })).toEqual(fresh);

    const advanced = advanceOwnerRepositoryRootV2Generation({
      root: start.root.root,
      targetGeneration: generation + 1,
    });
    expect(() => materializeOwnerRepositoryWalletCheckpoint({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: advanced,
        previousCheckpoint: null,
      }),
      endingWalletStateBlob: start.wallet.blob,
    })).toThrow("owner_repository_wallet_checkpoint_invalid");
  });

  it("admits only the codec-verified V1 genesis migration bootstrap and chains its first window", async () => {
    const base = await genesis();
    const rootV1 = v1GenesisRoot(base);
    const targetGeneration = generation + 1;
    const migratedRoot = await migrateVerifiedGenesisOwnerRepositoryRootV1({
      rootV1,
      targetGeneration,
      emptyCourseStateManifestBlob: base.course.manifestBlob,
      resolveCourseNode: resolver,
    });
    const migrationAccumulator = await createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration({
      rootV1,
      targetGeneration,
      emptyCourseStateManifestBlob: base.course.manifestBlob,
      resolveCourseNode: resolver,
      migratedRoot,
    });
    const candidate = materializeOwnerRepositoryWalletCheckpoint({
      accumulator: migrationAccumulator,
      endingWalletStateBlob: base.wallet.blob,
    });
    const migrationCheckpoint = await matchOwnerRepositoryWalletCheckpointProjection({
      checkpoint: candidate,
      checkpointRoot: migratedRoot.root,
      walletStateBlob: base.wallet.blob,
      courseManifestBlob: base.course.manifestBlob,
      operationManifestBlob: base.operationManifest.manifestBlob,
      subjectManifestBlob: base.subjectManifest.manifestBlob,
      receiptManifestBlob: base.receiptManifest.manifestBlob,
      resolveNode: resolver,
    });
    expect(migrationCheckpoint.checkpoint.bootstrapOrigin)
      .toBe("verified_v1_genesis_migration");
    expect(migrationCheckpoint.checkpoint.repositoryRevision).toBe(1);
    expect(migrationCheckpoint.checkpoint.journalSequence).toBe(0);

    const migratedStart = { ...base, root: migratedRoot };
    const fixture = await deriveCanonical(
      OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL,
      migratedStart,
      targetGeneration,
    );
    values.clear();
    const page = await foldOwnerRepositoryWalletCreditPage(pageInput(
      migratedStart,
      fixture.receipts,
    ));
    const accumulator = appendOwnerRepositoryWalletCreditCheckpointPage({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: migratedRoot,
        previousCheckpoint: migrationCheckpoint,
      }),
      page,
    });
    const next = materializeOwnerRepositoryWalletCheckpoint({
      accumulator,
      endingWalletStateBlob: page.endingWalletStateBlob,
    });
    expect(next.checkpoint.bootstrapOrigin).toBeNull();
    expect(next.checkpoint.repositoryRevision).toBe(17);
    expect(next.checkpoint.journalSequence).toBe(16);

    const ordinaryRollover = advanceOwnerRepositoryRootV2Generation({
      root: base.root.root,
      targetGeneration,
    });
    await expect(createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration({
      rootV1,
      targetGeneration,
      emptyCourseStateManifestBlob: base.course.manifestBlob,
      resolveCourseNode: resolver,
      migratedRoot: ordinaryRollover,
    })).rejects.toThrow("owner_repository_wallet_checkpoint_mismatch");
  }, 60_000);

  it("folds exactly 16 credits and derives lifetime counts without caller authority", async () => {
    const fixture = await deriveCanonical(OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL);
    values.clear();
    const prior = await bootstrap(fixture.start);
    const page = await foldOwnerRepositoryWalletCreditPage(pageInput(fixture.start, fixture.receipts));
    addBlobs(page.immutableBlobs);
    const accumulator = appendOwnerRepositoryWalletCreditCheckpointPage({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: fixture.start.root,
        previousCheckpoint: prior,
      }),
      page,
    });
    const candidate = materializeOwnerRepositoryWalletCheckpoint({
      accumulator,
      endingWalletStateBlob: page.endingWalletStateBlob,
    });
    const checkpoint = await matchOwnerRepositoryWalletCheckpointProjection({
      checkpoint: candidate,
      checkpointRoot: page.endingRoot.root,
      walletStateBlob: page.endingWalletStateBlob,
      courseManifestBlob: fixture.start.course.manifestBlob,
      operationManifestBlob: page.endingOperationManifestBlob,
      subjectManifestBlob: page.endingSubjectManifestBlob,
      receiptManifestBlob: page.endingReceiptManifestBlob,
      resolveNode: resolver,
    });
    expect(checkpoint.checkpoint.checkpointRootFingerprint).toBe(
      fixture.ending.root.root.rootFingerprint,
    );
    expect(checkpoint.checkpoint.walletCreditTransitions).toBe(16);
    expect(checkpoint.checkpoint.rootTransitions).toBe(16);
    expect(checkpoint.checkpoint.walletRevision).toBe(16);
    expect(checkpoint.checkpoint.operationEntryCount).toBe(32);
    expect(checkpoint.checkpoint.subjectEntryCount).toBe(16);
    expect(checkpoint.checkpoint.receiptEntryCount).toBe(16);
    await expect(matchOwnerRepositoryWalletCheckpointProjection({
      checkpoint: candidate,
      checkpointRoot: page.endingRoot.root,
      walletStateBlob: page.endingWalletStateBlob,
      courseManifestBlob: fixture.start.course.manifestBlob,
      operationManifestBlob: fixture.start.operationManifest.manifestBlob,
      subjectManifestBlob: page.endingSubjectManifestBlob,
      receiptManifestBlob: page.endingReceiptManifestBlob,
      resolveNode: resolver,
    })).rejects.toThrow("owner_repository_wallet_checkpoint_mismatch");
  });

  it("produces the same accumulator and checkpoint across 16 vs 8+8 page partitions", async () => {
    const fixture = await deriveCanonical(16);
    values.clear();
    const prior = await bootstrap(fixture.start);
    const onePage = await foldOwnerRepositoryWalletCreditPage(pageInput(fixture.start, fixture.receipts));
    const oneAccumulator = appendOwnerRepositoryWalletCreditCheckpointPage({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: fixture.start.root,
        previousCheckpoint: prior,
      }),
      page: onePage,
    });

    const first = await foldOwnerRepositoryWalletCreditPage(pageInput(
      fixture.start,
      fixture.receipts.slice(0, 8),
    ));
    addBlobs(first.immutableBlobs);
    const second = await foldOwnerRepositoryWalletCreditPage({
      startingRoot: first.endingRoot.root,
      walletStateBeforeBlob: first.endingWalletStateBlob,
      operationManifestBlob: first.endingOperationManifestBlob,
      subjectManifestBlob: first.endingSubjectManifestBlob,
      receiptManifestBlob: first.endingReceiptManifestBlob,
      canonicalAppliedReceipts: fixture.receipts.slice(8),
      resolveNode: resolver,
    });
    const splitAccumulator = appendOwnerRepositoryWalletCreditCheckpointPage({
      accumulator: appendOwnerRepositoryWalletCreditCheckpointPage({
        accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
          startingRoot: fixture.start.root,
          previousCheckpoint: prior,
        }),
        page: first,
      }),
      page: second,
    });
    expect(splitAccumulator.pageAccumulatorFingerprint).toBe(
      oneAccumulator.pageAccumulatorFingerprint,
    );
    expect(materializeOwnerRepositoryWalletCheckpoint({
      accumulator: splitAccumulator,
      endingWalletStateBlob: second.endingWalletStateBlob,
    })).toEqual(materializeOwnerRepositoryWalletCheckpoint({
      accumulator: oneAccumulator,
      endingWalletStateBlob: onePage.endingWalletStateBlob,
    }));
  });

  it("closes a window on generation rollover and preserves every economic projection", async () => {
    const start = await genesis();
    const prior = await bootstrap(start);
    const successor = advanceOwnerRepositoryRootV2Generation({
      root: start.root.root,
      targetGeneration: generation + 1,
    });
    const accumulator = appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: start.root,
        previousCheckpoint: prior,
      }),
      successorRoot: successor,
    });
    const checkpoint = materializeOwnerRepositoryWalletCheckpoint({
      accumulator,
      endingWalletStateBlob: start.wallet.blob,
    });
    expect(checkpoint.checkpoint.generationRolloverTransitions).toBe(1);
    expect(checkpoint.checkpoint.walletCreditTransitions).toBe(0);
    expect(checkpoint.checkpoint.journalSequence).toBe(0);
    expect(checkpoint.checkpoint.walletStateRef).toEqual(start.root.root.walletStateRef);
    expect(checkpoint.checkpoint.operationIndexManifestRef)
      .toEqual(start.root.root.operationIndexManifestRef);
    const oneCredit = await deriveCanonical(1);
    values.clear();
    const page = await foldOwnerRepositoryWalletCreditPage(pageInput(
      oneCredit.start,
      oneCredit.receipts,
    ));
    expect(() => appendOwnerRepositoryWalletCreditCheckpointPage({
      accumulator,
      page,
    })).toThrow("owner_repository_wallet_checkpoint_invalid");
    expect(() => appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition({
      accumulator,
      successorRoot: advanceOwnerRepositoryRootV2Generation({
        root: successor.root,
        targetGeneration: generation + 2,
      }),
    })).toThrow("owner_repository_wallet_checkpoint_invalid");

    const fifteen = await deriveCanonical(15);
    values.clear();
    const fifteenPrior = await bootstrap(fifteen.start);
    const fifteenPage = await foldOwnerRepositoryWalletCreditPage(pageInput(
      fifteen.start,
      fifteen.receipts,
    ));
    const beforeRollover = appendOwnerRepositoryWalletCreditCheckpointPage({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: fifteen.start.root,
        previousCheckpoint: fifteenPrior,
      }),
      page: fifteenPage,
    });
    const rolloverRoot = advanceOwnerRepositoryRootV2Generation({
      root: fifteenPage.endingRoot.root,
      targetGeneration: generation + 1,
    });
    const closedAtSixteen = appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition({
      accumulator: beforeRollover,
      successorRoot: rolloverRoot,
    });
    const rolloverCheckpoint = materializeOwnerRepositoryWalletCheckpoint({
      accumulator: closedAtSixteen,
      endingWalletStateBlob: fifteenPage.endingWalletStateBlob,
    });
    expect(rolloverCheckpoint.checkpoint.rootTransitions).toBe(16);
    expect(rolloverCheckpoint.checkpoint.walletCreditTransitions).toBe(15);
    expect(rolloverCheckpoint.checkpoint.generationRolloverTransitions).toBe(1);
    expect(rolloverCheckpoint.checkpoint.repositoryRevision).toBe(16);
    expect(rolloverCheckpoint.checkpoint.journalSequence).toBe(15);
  });

  it("requires exact previous checkpoint linkage and rejects reset attempts", async () => {
    const fixture = await deriveCanonical(OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL);
    values.clear();
    const prior = await bootstrap(fixture.start);
    const page = await foldOwnerRepositoryWalletCreditPage(pageInput(fixture.start, fixture.receipts));
    const accumulator = appendOwnerRepositoryWalletCreditCheckpointPage({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: fixture.start.root,
        previousCheckpoint: prior,
      }),
      page,
    });
    const checkpoint = materializeOwnerRepositoryWalletCheckpoint({
      accumulator,
      endingWalletStateBlob: page.endingWalletStateBlob,
    });
    expect(() => createOwnerRepositoryWalletCheckpointAccumulator({
      startingRoot: page.endingRoot,
      previousCheckpoint: null,
    })).toThrow("owner_repository_wallet_checkpoint_invalid");
    expect(() => createOwnerRepositoryWalletCheckpointAccumulator({
      startingRoot: fixture.start.root,
      previousCheckpoint: checkpoint,
    })).toThrow();

    const forgedResetPage = {
      ...page,
      endingOperationManifestBlob: fixture.start.operationManifest.manifestBlob,
      endingSubjectManifestBlob: fixture.start.subjectManifest.manifestBlob,
      endingReceiptManifestBlob: fixture.start.receiptManifest.manifestBlob,
      immutableBlobs: [],
      parentRootHistory: [],
    };
    expect(() => appendOwnerRepositoryWalletCreditCheckpointPage({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: fixture.start.root,
        previousCheckpoint: prior,
      }),
      page: forgedResetPage,
    })).toThrow("owner_repository_wallet_checkpoint_invalid");
  });

  it("fails closed on canonical count/root/key tampering and hostile nested accessors", async () => {
    const fixture = await deriveCanonical(OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL);
    values.clear();
    const prior = await bootstrap(fixture.start);
    const page = await foldOwnerRepositoryWalletCreditPage(pageInput(fixture.start, fixture.receipts));
    const checkpoint = materializeOwnerRepositoryWalletCheckpoint({
      accumulator: appendOwnerRepositoryWalletCreditCheckpointPage({
        accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
          startingRoot: fixture.start.root,
          previousCheckpoint: prior,
        }),
        page,
      }),
      endingWalletStateBlob: page.endingWalletStateBlob,
    });
    const parsed = JSON.parse(checkpoint.encoded) as Record<string, unknown>;
    parsed.operationEntryCount = 1;
    const { checkpointFingerprint: _old, ...body } = parsed;
    parsed.checkpointFingerprint = sha256Utf8(canonicalJsonV1(body));
    await expect(Promise.resolve().then(() => parseOwnerRepositoryWalletCheckpoint({
      accountScopeHash,
      checkpointRoot: page.endingRoot.root,
      key: checkpoint.key,
      raw: canonicalJsonV1(parsed),
      walletStateBlob: page.endingWalletStateBlob,
    }))).rejects.toThrow("owner_repository_wallet_checkpoint_indeterminate");

    const walletTamper = JSON.parse(checkpoint.encoded) as Record<string, unknown>;
    walletTamper.walletStateFingerprint = "f".repeat(64);
    const { checkpointFingerprint: _walletOld, ...walletBody } = walletTamper;
    walletTamper.checkpointFingerprint = sha256Utf8(canonicalJsonV1(walletBody));
    expect(() => parseOwnerRepositoryWalletCheckpoint({
      accountScopeHash,
      checkpointRoot: page.endingRoot.root,
      key: checkpoint.key,
      raw: canonicalJsonV1(walletTamper),
      walletStateBlob: page.endingWalletStateBlob,
    })).toThrow("owner_repository_wallet_checkpoint_mismatch");

    const pageStartTamper = JSON.parse(checkpoint.encoded) as Record<string, unknown>;
    pageStartTamper.pageStartingRootFingerprint = "e".repeat(64);
    const { checkpointFingerprint: _pageOld, ...pageStartBody } = pageStartTamper;
    pageStartTamper.checkpointFingerprint = sha256Utf8(canonicalJsonV1(pageStartBody));
    expect(() => parseOwnerRepositoryWalletCheckpoint({
      accountScopeHash,
      checkpointRoot: page.endingRoot.root,
      key: checkpoint.key,
      raw: canonicalJsonV1(pageStartTamper),
      walletStateBlob: page.endingWalletStateBlob,
    })).toThrow("owner_repository_wallet_checkpoint_indeterminate");
    expect(() => parseOwnerRepositoryWalletCheckpoint({
      accountScopeHash,
      checkpointRoot: page.endingRoot.root,
      key: `${checkpoint.key}:wrong`,
      raw: checkpoint.encoded,
      walletStateBlob: page.endingWalletStateBlob,
    })).toThrow("owner_repository_wallet_checkpoint_mismatch");

    let getterRuns = 0;
    const hostileRoot = { ...fixture.start.root.root } as Record<string, unknown>;
    Object.defineProperty(hostileRoot, "accountScopeHash", {
      enumerable: true,
      get() { getterRuns += 1; return accountScopeHash; },
    });
    expect(() => createOwnerRepositoryWalletCheckpointAccumulator({
      startingRoot: { root: hostileRoot, encoded: fixture.start.root.encoded },
      previousCheckpoint: null,
    })).toThrow("owner_repository_wallet_checkpoint_invalid");
    expect(getterRuns).toBe(0);

    const hostileTransition = { ...page.transitions[0] } as Record<string, unknown>;
    Object.defineProperty(hostileTransition, "journalRecord", {
      enumerable: true,
      get() { getterRuns += 1; return page.transitions[0].journalRecord; },
    });
    expect(() => appendOwnerRepositoryWalletCreditCheckpointPage({
      accumulator: createOwnerRepositoryWalletCheckpointAccumulator({
        startingRoot: fixture.start.root,
        previousCheckpoint: prior,
      }),
      page: { ...page, transitions: [hostileTransition] },
    })).toThrow("owner_repository_wallet_checkpoint_invalid");
    expect(getterRuns).toBe(0);

    expect(() => parseOwnerRepositoryWalletCheckpoint({
      accountScopeHash,
      checkpointRoot: page.endingRoot.root,
      key: checkpoint.key,
      raw: `${checkpoint.encoded}${" ".repeat(64 * 1024)}`,
      walletStateBlob: page.endingWalletStateBlob,
    })).toThrow("owner_repository_wallet_checkpoint_indeterminate");
  });
});

import {
  WALLET_SUBUNITS_PER_STAR,
  createWalletAuthorizedOperation,
  deriveWalletSemanticSubjectFingerprint,
} from "../modules/learning-v2/contracts/wallet";
import { createEmptyOwnerRepositoryCourseManifest } from "../modules/learning-v2/progress/owner_repository_course_manifest";
import {
  createEmptyOwnerRepositoryEconomicManifest,
  type OwnerRepositoryEconomicManifestBlob,
} from "../modules/learning-v2/progress/owner_repository_economic_manifest";
import type { OwnerRepositoryRadixNodeRefV1 } from "../modules/learning-v2/progress/owner_repository_radix";
import { createGenesisOwnerRepositoryRootV2 } from "../modules/learning-v2/progress/owner_repository_root_v2";
import {
  OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS,
  foldOwnerRepositoryWalletCreditPage,
} from "../modules/learning-v2/progress/owner_repository_wallet_credit_page";
import { materializeOwnerRepositoryWalletStateBlob } from "../modules/learning-v2/progress/owner_repository_wallet_blob";
import {
  planOwnerRepositoryWalletCredit,
  type OwnerRepositoryPlannedImmutableBlobV1,
} from "../modules/learning-v2/progress/owner_repository_wallet_credit_plan";
import {
  createWalletState,
  type WalletAppliedReceiptV1,
} from "../modules/learning-v2/progress/wallet_reducer";

const accountScopeHash = "aaaaaaaaaaaaaaaa";
const generation = 4;
const values = new Map<string, string>();
const resolver = (ref: OwnerRepositoryRadixNodeRefV1) =>
  values.get(ref.blobKey) ?? null;
const addBlobs = (blobs: readonly OwnerRepositoryPlannedImmutableBlobV1[]) => {
  for (const blob of blobs) values.set(blob.ref.blobKey, blob.encoded);
};
const manifestBlob = <K extends "operation" | "subject" | "receipt">(
  blobs: readonly OwnerRepositoryPlannedImmutableBlobV1[],
  indexKind: K,
): OwnerRepositoryEconomicManifestBlob<K> => {
  const found = blobs.find(
    (blob) => blob.ref.kind === `${indexKind}_index_manifest`,
  );
  if (!found) throw new Error(`missing ${indexKind} manifest fixture`);
  return found as OwnerRepositoryEconomicManifestBlob<K>;
};
const operation = (ordinal: number, walletRevisionBefore: number) => {
  const sourceReceiptRef = {
    receiptType: "required_session_credit_settlement" as const,
    receiptId: `wallet-page-source-${ordinal}`,
    receiptFingerprint: ordinal.toString(16).padStart(64, "0"),
  };
  return createWalletAuthorizedOperation({
    schemaVersion: "learning-v2-wallet-authorized-operation.v1",
    authority: "trusted_server_boundary",
    operationId: `wallet-page-operation-${ordinal}`,
    semanticSubjectFingerprint: deriveWalletSemanticSubjectFingerprint({
      accountScopeHash,
      operationReason: "initial_required_session",
      sourceReceiptRef,
    }),
    accountScopeHash,
    accountGeneration: generation,
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
      requiredSessionOrdinal: Math.min(ordinal, 384),
    },
  });
};

const genesis = async () => {
  const wallet = materializeOwnerRepositoryWalletStateBlob(
    createWalletState({ accountScopeHash }),
  );
  const course =
    await createEmptyOwnerRepositoryCourseManifest(accountScopeHash);
  const operationManifest = await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "operation",
  );
  const subjectManifest = await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "subject",
  );
  const receiptManifest = await createEmptyOwnerRepositoryEconomicManifest(
    accountScopeHash,
    "receipt",
  );
  const root = createGenesisOwnerRepositoryRootV2({
    accountScopeHash,
    currentGeneration: generation,
    walletStateRef: wallet.blob.ref,
    courseStateManifestRef: course.manifestBlob.ref,
    operationIndexManifestRef: operationManifest.manifestBlob.ref,
    subjectIndexManifestRef: subjectManifest.manifestBlob.ref,
    receiptIndexManifestRef: receiptManifest.manifestBlob.ref,
  });
  return { wallet, operationManifest, subjectManifest, receiptManifest, root };
};

const deriveCanonical = async (count: number) => {
  const start = await genesis();
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
      authorizedOperation: operation(index + 1, index),
      resolveNode: resolver,
    });
    if (
      plan.status !== "applied" ||
      plan.successorRoot.root.schemaVersion !==
        "learning-v2-owner-repository-root.v2"
    )
      throw new Error("failed to derive canonical page fixture");
    addBlobs(plan.immutableBlobs);
    receipts.push(plan.appliedReceipt);
    root = plan.successorRoot as typeof root;
    wallet = plan.walletStateAfterBlob;
    operationManifest = manifestBlob(plan.immutableBlobs, "operation");
    subjectManifest = manifestBlob(plan.immutableBlobs, "subject");
    receiptManifest = manifestBlob(plan.immutableBlobs, "receipt");
  }
  return {
    start,
    ending: {
      root,
      wallet,
      operationManifest,
      subjectManifest,
      receiptManifest,
    },
    receipts,
  };
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

beforeEach(() => values.clear());

describe("Learning V2 bounded wallet-credit page fold", () => {
  it("reconstructs an ordered multi-record page byte-exactly", async () => {
    const fixture = await deriveCanonical(3);
    values.clear();
    const folded = await foldOwnerRepositoryWalletCreditPage(
      pageInput(fixture.start, fixture.receipts),
    );
    expect(folded.endingRoot).toEqual(fixture.ending.root);
    expect(folded.endingWalletStateBlob).toEqual(fixture.ending.wallet);
    expect(folded.endingOperationManifestBlob).toEqual(
      fixture.ending.operationManifest,
    );
    expect(folded.endingSubjectManifestBlob).toEqual(
      fixture.ending.subjectManifest,
    );
    expect(folded.endingReceiptManifestBlob).toEqual(
      fixture.ending.receiptManifest,
    );
    expect(folded.transitions).toHaveLength(3);
    expect(folded.parentRootHistory).toHaveLength(3);
    for (let index = 0; index < folded.transitions.length; index += 1) {
      const parent =
        index === 0
          ? folded.startingRoot
          : folded.transitions[index - 1].successorRoot;
      const transition = folded.transitions[index];
      expect(folded.parentRootHistory[index]).toEqual({
        rootFingerprint: parent.root.rootFingerprint,
        encoded: parent.encoded,
      });
      expect(transition.journalRecord.journalSequence).toBe(index + 1);
      expect(transition.journalRecord.rootBeforeFingerprint).toBe(
        parent.root.rootFingerprint,
      );
      expect(transition.journalRecord.previousJournalRecordRef).toEqual(
        index === 0
          ? null
          : folded.transitions[index - 1].journalRecordBlob.ref,
      );
      expect(transition.successorRoot.root.previousRootFingerprint).toBe(
        parent.root.rootFingerprint,
      );
    }
    expect(Object.isFrozen(folded)).toBe(true);
  });

  it("folds the full 128-record boundary across radix splits byte-exactly", async () => {
    const fixture = await deriveCanonical(
      OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS,
    );
    values.clear();
    let resolverCalls = 0;
    const folded = await foldOwnerRepositoryWalletCreditPage({
      ...pageInput(fixture.start, fixture.receipts),
      resolveNode: () => {
        resolverCalls += 1;
        throw new Error("genesis page must resolve from its generated overlay");
      },
      readBudget: { maxExternalReads: 0, maxExternalBytes: 0 },
    });
    expect(resolverCalls).toBe(0);
    expect(folded.transitions).toHaveLength(
      OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS,
    );
    expect(folded.parentRootHistory).toHaveLength(
      OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS,
    );
    expect(folded.endingRoot).toEqual(fixture.ending.root);
    expect(folded.endingWalletStateBlob).toEqual(fixture.ending.wallet);
    expect(folded.endingOperationManifestBlob).toEqual(
      fixture.ending.operationManifest,
    );
    expect(folded.endingSubjectManifestBlob).toEqual(
      fixture.ending.subjectManifest,
    );
    expect(folded.endingReceiptManifestBlob).toEqual(
      fixture.ending.receiptManifest,
    );
  }, 120_000);

  it("continues across pages without resetting global operation/subject/receipt uniqueness", async () => {
    const fixture = await deriveCanonical(3);
    values.clear();
    const firstPage = await foldOwnerRepositoryWalletCreditPage(
      pageInput(fixture.start, fixture.receipts.slice(0, 2)),
    );
    addBlobs(firstPage.immutableBlobs);
    const secondPage = await foldOwnerRepositoryWalletCreditPage({
      startingRoot: firstPage.endingRoot.root,
      walletStateBeforeBlob: firstPage.endingWalletStateBlob,
      operationManifestBlob: firstPage.endingOperationManifestBlob,
      subjectManifestBlob: firstPage.endingSubjectManifestBlob,
      receiptManifestBlob: firstPage.endingReceiptManifestBlob,
      canonicalAppliedReceipts: [fixture.receipts[2]],
      resolveNode: resolver,
    });
    expect(secondPage.endingRoot).toEqual(fixture.ending.root);
    await expect(
      foldOwnerRepositoryWalletCreditPage({
        startingRoot: firstPage.endingRoot.root,
        walletStateBeforeBlob: firstPage.endingWalletStateBlob,
        operationManifestBlob: firstPage.endingOperationManifestBlob,
        subjectManifestBlob: firstPage.endingSubjectManifestBlob,
        receiptManifestBlob: firstPage.endingReceiptManifestBlob,
        canonicalAppliedReceipts: [fixture.receipts[0]],
        resolveNode: resolver,
      }),
    ).rejects.toThrow("owner_repository_wallet_credit_page_indeterminate");
  });

  it("rejects gaps, reordering and duplicates instead of sorting or replaying", async () => {
    const fixture = await deriveCanonical(3);
    values.clear();
    for (const receipts of [
      [fixture.receipts[1]],
      [fixture.receipts[1], fixture.receipts[0]],
      [fixture.receipts[0], fixture.receipts[0]],
    ]) {
      await expect(
        foldOwnerRepositoryWalletCreditPage(pageInput(fixture.start, receipts)),
      ).rejects.toThrow("owner_repository_wallet_credit_page_indeterminate");
    }
  });

  it("enforces page/input/budget bounds before hostile traversal", async () => {
    const fixture = await deriveCanonical(1);
    values.clear();
    let getterRuns = 0;
    const oversized = Array.from(
      { length: OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS + 1 },
      () => fixture.receipts[0],
    );
    Object.defineProperty(oversized, "0", {
      enumerable: true,
      get() {
        getterRuns += 1;
        return fixture.receipts[0];
      },
    });
    await expect(
      foldOwnerRepositoryWalletCreditPage(pageInput(fixture.start, oversized)),
    ).rejects.toThrow("owner_repository_wallet_credit_page_invalid");
    expect(getterRuns).toBe(0);

    const hostile = { ...pageInput(fixture.start, fixture.receipts) } as Record<
      string,
      unknown
    >;
    Object.defineProperty(hostile, "startingRoot", {
      enumerable: true,
      get() {
        getterRuns += 1;
        return fixture.start.root.root;
      },
    });
    await expect(foldOwnerRepositoryWalletCreditPage(hostile)).rejects.toThrow(
      "owner_repository_wallet_credit_page_invalid",
    );
    expect(getterRuns).toBe(0);

    const hostileRoot = { ...fixture.start.root.root } as Record<
      string,
      unknown
    >;
    Object.defineProperty(hostileRoot, "accountScopeHash", {
      enumerable: true,
      get() {
        getterRuns += 1;
        return accountScopeHash;
      },
    });
    await expect(
      foldOwnerRepositoryWalletCreditPage({
        ...pageInput(fixture.start, fixture.receipts),
        startingRoot: hostileRoot,
      }),
    ).rejects.toThrow("owner_repository_wallet_credit_page_invalid");
    expect(getterRuns).toBe(0);

    await expect(
      foldOwnerRepositoryWalletCreditPage({
        ...pageInput(fixture.start, fixture.receipts),
        readBudget: undefined,
      }),
    ).rejects.toThrow("owner_repository_wallet_credit_page_invalid");

    const continued = await deriveCanonical(2);
    const first = await foldOwnerRepositoryWalletCreditPage(
      pageInput(continued.start, continued.receipts.slice(0, 1)),
    );
    addBlobs(first.immutableBlobs);
    await expect(
      foldOwnerRepositoryWalletCreditPage({
        startingRoot: first.endingRoot.root,
        walletStateBeforeBlob: first.endingWalletStateBlob,
        operationManifestBlob: first.endingOperationManifestBlob,
        subjectManifestBlob: first.endingSubjectManifestBlob,
        receiptManifestBlob: first.endingReceiptManifestBlob,
        canonicalAppliedReceipts: [continued.receipts[1]],
        resolveNode: resolver,
        readBudget: { maxExternalReads: 0, maxExternalBytes: 0 },
      }),
    ).rejects.toThrow("owner_repository_wallet_credit_page_budget_exceeded");
  });

  it("does not charge generated overlay nodes as external storage reads", async () => {
    const fixture = await deriveCanonical(2);
    values.clear();
    let resolverCalls = 0;
    const folded = await foldOwnerRepositoryWalletCreditPage({
      ...pageInput(fixture.start, fixture.receipts),
      resolveNode: () => {
        resolverCalls += 1;
        throw new Error(
          "generated overlay must be resolved before external storage",
        );
      },
      readBudget: { maxExternalReads: 0, maxExternalBytes: 0 },
    });
    expect(resolverCalls).toBe(0);
    expect(folded.endingRoot).toEqual(fixture.ending.root);
  });
});

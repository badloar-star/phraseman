import {
  createWalletAuthorizedOperation,
  detachBoundedWalletJson,
  type WalletAuthorizedOperationV1,
} from "../contracts/wallet";
import {
  canonicalJsonV1,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import type { OwnerRepositoryBlobRefV1 } from "./owner_repository";
import {
  lookupOwnerRepositoryCanonicalEconomicLedgerClosure,
  parseOwnerRepositoryEconomicManifestBlob,
  planOwnerRepositoryCanonicalEconomicClosure,
  planOwnerRepositoryCanonicalEconomicClosureV2,
} from "./owner_repository_economic_manifest";
import {
  createOwnerRepositoryWalletCreditEffectRecordV2,
  materializeOwnerRepositoryWalletCreditEffectRecordBlobV2,
  type OwnerRepositoryWalletCreditEffectRecordBlobV2,
  type OwnerRepositoryWalletCreditEffectRecordV2,
} from "./owner_repository_economic_effect_v2";
import {
  createOwnerRepositoryWalletCreditJournalRecord,
  type OwnerRepositoryWalletCreditJournalRecordV1,
} from "./owner_repository_journal";
import {
  bindOwnerRepositoryWalletCreditSuccessorRootV2,
  materializeOwnerRepositoryJournalRecordBlob,
  type OwnerRepositoryJournalRecordBlobV1,
} from "./owner_repository_root_fold";
import {
  parseOwnerRepositoryRootV2,
  type OwnerRepositoryRootV2,
  type OwnerRepositoryRootV2Materialization,
} from "./owner_repository_root_v2";
import type {
  OwnerRepositoryRootV3,
  OwnerRepositoryRootV3Materialization,
} from "./owner_repository_root_v3";
import type {
  OwnerRepositoryRadixNodeRefV1,
  OwnerRepositoryRadixNodeResolver,
  OwnerRepositoryRadixReadBudget,
} from "./owner_repository_radix";
import {
  parseOwnerRepositoryWalletStateBlob,
  materializeOwnerRepositoryWalletStateBlob,
  type OwnerRepositoryWalletStateBlobV1,
} from "./owner_repository_wallet_blob";
import {
  reduceAuthorizedWalletOperation,
  type WalletAppliedReceiptV1,
} from "./wallet_reducer";

export interface OwnerRepositoryPlannedImmutableBlobV1 {
  readonly ref: OwnerRepositoryBlobRefV1;
  readonly encoded: string;
}

export type OwnerRepositoryWalletCreditPlanResult =
  | Readonly<{
      readonly status: "applied";
      readonly appliedReceipt: WalletAppliedReceiptV1;
      readonly authorizedOperation: WalletAuthorizedOperationV1;
      readonly journalRecord: OwnerRepositoryWalletCreditJournalRecordV1;
      readonly journalRecordBlob: OwnerRepositoryJournalRecordBlobV1;
      readonly walletStateAfterBlob: OwnerRepositoryWalletStateBlobV1;
      readonly successorRoot:
        | OwnerRepositoryRootV2Materialization
        | OwnerRepositoryRootV3Materialization;
      readonly immutableBlobs: readonly OwnerRepositoryPlannedImmutableBlobV1[];
    }>
  | Readonly<{
      readonly status: "replayed";
      readonly appliedReceipt: WalletAppliedReceiptV1;
      readonly authorizedOperation: WalletAuthorizedOperationV1;
      readonly root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3;
      readonly immutableBlobs: readonly [];
    }>
  | Readonly<{
      readonly status: "alias_repair_required";
      readonly appliedReceipt: WalletAppliedReceiptV1;
      readonly authorizedOperation: WalletAuthorizedOperationV1;
      readonly root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3;
      readonly immutableBlobs: readonly [];
    }>;

export type OwnerRepositoryWalletCreditPlanV2Result =
  | Readonly<{
      readonly status: "applied";
      readonly appliedReceipt: WalletAppliedReceiptV1;
      readonly authorizedOperation: WalletAuthorizedOperationV1;
      readonly journalRecord: OwnerRepositoryWalletCreditEffectRecordV2;
      readonly journalRecordBlob: OwnerRepositoryWalletCreditEffectRecordBlobV2;
      readonly walletStateAfterBlob: OwnerRepositoryWalletStateBlobV1;
      readonly successorRoot: OwnerRepositoryRootV3Materialization;
      readonly immutableBlobs: readonly OwnerRepositoryPlannedImmutableBlobV1[];
    }>
  | Readonly<{
      readonly status: "replayed" | "alias_repair_required";
      readonly appliedReceipt: WalletAppliedReceiptV1;
      readonly authorizedOperation: WalletAuthorizedOperationV1;
      readonly root: OwnerRepositoryRootV3;
      readonly immutableBlobs: readonly [];
    }>;

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const DEFAULT_READ_BUDGET = Object.freeze({
  maxExternalReads: 256,
  maxExternalBytes: 64 * 1024 * 1024,
});
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (): never => {
  throw new Error("owner_repository_wallet_credit_plan_invalid");
};
const indeterminate = (): never => {
  throw new Error("owner_repository_wallet_credit_plan_indeterminate");
};
const readRecord = (
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
    return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (
    ownKeys.some((key) => typeof key !== "string") ||
    requiredKeys.some(
      (key) => !Object.prototype.hasOwnProperty.call(descriptors, key),
    ) ||
    ownKeys.some(
      (key) =>
        typeof key !== "string" ||
        (!requiredKeys.includes(key) && !optionalKeys.includes(key)),
    )
  )
    return invalid();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of ownKeys as string[]) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      return invalid();
    result[key] = descriptor.value;
  }
  return result;
};
const safe = (value: unknown, maximum: number): value is number =>
  Number.isSafeInteger(value) &&
  !Object.is(value, -0) &&
  Number(value) >= 0 &&
  Number(value) <= maximum;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return value;
};
const same = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const parseBlobInput = (
  input: unknown,
): Readonly<{ ref: OwnerRepositoryBlobRefV1; encoded: string }> => {
  const value = readRecord(input, ["ref", "encoded"]);
  if (typeof value.encoded !== "string") return invalid();
  return { ref: value.ref as OwnerRepositoryBlobRefV1, encoded: value.encoded };
};
const parseReadBudget = (
  input: unknown,
  present: boolean,
): OwnerRepositoryRadixReadBudget => {
  if (!present) return DEFAULT_READ_BUDGET;
  if (input === undefined) return invalid();
  const value = readRecord(input, ["maxExternalReads", "maxExternalBytes"]);
  if (
    !safe(value.maxExternalReads, 100_000) ||
    !safe(value.maxExternalBytes, 1024 * 1024 * 1024)
  )
    return invalid();
  return deepFreeze({
    maxExternalReads: Number(value.maxExternalReads),
    maxExternalBytes: Number(value.maxExternalBytes),
  });
};
interface PlanResolverSession {
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly budgetExceeded: boolean;
}
const createSharedResolver = (
  resolver: unknown,
  budget: OwnerRepositoryRadixReadBudget,
): PlanResolverSession => {
  if (typeof resolver !== "function") return invalid();
  const cache = new Map<string, unknown>();
  let reads = 0;
  let bytes = 0;
  let budgetExceeded = false;
  const resolveNode = async (ref: OwnerRepositoryRadixNodeRefV1) => {
    if (cache.has(ref.blobKey)) return cache.get(ref.blobKey);
    if (reads >= budget.maxExternalReads) {
      budgetExceeded = true;
      throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
    }
    let raw: unknown;
    try {
      raw = await (resolver as OwnerRepositoryRadixNodeResolver)(ref);
    } catch {
      return indeterminate();
    }
    reads += 1;
    if (typeof raw === "string") {
      try {
        bytes += utf8ByteLengthV1(raw);
      } catch {
        return indeterminate();
      }
      if (!Number.isSafeInteger(bytes) || bytes > budget.maxExternalBytes) {
        budgetExceeded = true;
        throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
      }
    }
    cache.set(ref.blobKey, raw);
    return raw;
  };
  return {
    resolveNode,
    get budgetExceeded() {
      return budgetExceeded;
    },
  };
};

/**
 * Repository-internal pure plan. It accepts only a fully materialized server operation,
 * verifies every selected before projection, and performs no durable writes or CAS.
 * The authority label is not authentication; the server repository must own materialization.
 * `rootBefore` must already belong to a repository-verified current graph/checkpoint;
 * this selected-projection planner does not prove journal/course ancestry by itself.
 */
export const planOwnerRepositoryWalletCredit = async (
  input: unknown,
): Promise<OwnerRepositoryWalletCreditPlanResult> => {
  const request = readRecord(
    input,
    [
      "rootBefore",
      "walletStateBeforeBlob",
      "operationManifestBlob",
      "subjectManifestBlob",
      "receiptManifestBlob",
      "authorizedOperation",
      "resolveNode",
    ],
    ["readBudget", "promotedCheckpointAnchor"],
  );
  let detachedRoot: unknown;
  let detachedOperation: unknown;
  try {
    detachedRoot = detachBoundedWalletJson(
      request.rootBefore,
      "owner_repository_wallet_credit_plan_invalid",
    );
    detachedOperation = detachBoundedWalletJson(
      request.authorizedOperation,
      "owner_repository_wallet_credit_plan_invalid",
    );
  } catch {
    return invalid();
  }
  if (
    !isRecord(detachedRoot) ||
    typeof detachedRoot.accountScopeHash !== "string" ||
    !ACCOUNT.test(detachedRoot.accountScopeHash) ||
    !isRecord(detachedOperation) ||
    !Object.prototype.hasOwnProperty.call(
      detachedOperation,
      "semanticFingerprint",
    ) ||
    !Object.prototype.hasOwnProperty.call(
      detachedOperation,
      "operationFingerprint",
    )
  )
    return invalid();
  let root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3;
  let operation: WalletAuthorizedOperationV1;
  try {
    if (detachedRoot.schemaVersion === "learning-v2-owner-repository-root.v2") {
      if (
        Object.prototype.hasOwnProperty.call(
          request,
          "promotedCheckpointAnchor",
        )
      ) {
        return invalid();
      }
      root = parseOwnerRepositoryRootV2(
        detachedRoot,
        detachedRoot.accountScopeHash,
      ).root;
    } else if (
      detachedRoot.schemaVersion === "learning-v2-owner-repository-root.v3"
    ) {
      if (
        !Object.prototype.hasOwnProperty.call(
          request,
          "promotedCheckpointAnchor",
        )
      ) {
        return invalid();
      }
      const { parseOwnerRepositoryRootV3 } =
        await import("./owner_repository_root_v3");
      root = parseOwnerRepositoryRootV3(
        detachedRoot,
        detachedRoot.accountScopeHash,
      ).root;
    } else {
      return invalid();
    }
    operation = createWalletAuthorizedOperation(detachedOperation);
  } catch {
    return invalid();
  }
  if (
    operation.accountScopeHash !== root.accountScopeHash ||
    operation.accountGeneration > root.currentGeneration
  )
    return invalid();
  const walletBlobInput = parseBlobInput(request.walletStateBeforeBlob);
  const operationManifestBlob = parseBlobInput(request.operationManifestBlob);
  const subjectManifestBlob = parseBlobInput(request.subjectManifestBlob);
  const receiptManifestBlob = parseBlobInput(request.receiptManifestBlob);
  let walletBefore: ReturnType<typeof parseOwnerRepositoryWalletStateBlob>;
  try {
    walletBefore = parseOwnerRepositoryWalletStateBlob({
      accountScopeHash: root.accountScopeHash,
      ref: walletBlobInput.ref,
      raw: walletBlobInput.encoded,
    });
  } catch {
    return indeterminate();
  }
  if (
    !same(walletBefore.blob.ref, root.walletStateRef) ||
    walletBefore.state.accountScopeHash !== root.accountScopeHash
  )
    return indeterminate();
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const budget = parseReadBudget(request.readBudget, hasReadBudget);
  const resolverSession = createSharedResolver(request.resolveNode, budget);
  const resolveNode = resolverSession.resolveNode;
  let operationManifest;
  let subjectManifest;
  let receiptManifest;
  try {
    operationManifest = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: root.accountScopeHash,
      indexKind: "operation",
      ref: operationManifestBlob.ref,
      raw: operationManifestBlob.encoded,
      resolveNode,
      readBudget: budget,
    });
    subjectManifest = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: root.accountScopeHash,
      indexKind: "subject",
      ref: subjectManifestBlob.ref,
      raw: subjectManifestBlob.encoded,
      resolveNode,
      readBudget: budget,
    });
    receiptManifest = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: root.accountScopeHash,
      indexKind: "receipt",
      ref: receiptManifestBlob.ref,
      raw: receiptManifestBlob.encoded,
      resolveNode,
      readBudget: budget,
    });
  } catch (error) {
    if (
      resolverSession.budgetExceeded ||
      (error instanceof Error && error.message.includes("budget_exceeded"))
    ) {
      throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
    }
    return indeterminate();
  }
  if (
    !same(
      operationManifest.sourceManifestBlob.ref,
      root.operationIndexManifestRef,
    ) ||
    !same(
      subjectManifest.sourceManifestBlob.ref,
      root.subjectIndexManifestRef,
    ) ||
    !same(receiptManifest.sourceManifestBlob.ref, root.receiptIndexManifestRef)
  )
    return indeterminate();
  let closure;
  try {
    closure = await lookupOwnerRepositoryCanonicalEconomicLedgerClosure({
      accountScopeHash: root.accountScopeHash,
      operationManifest: operationManifest.manifest,
      subjectManifest: subjectManifest.manifest,
      receiptManifest: receiptManifest.manifest,
      operationId: operation.operationId,
      operationFingerprint: operation.operationFingerprint,
      semanticSubjectFingerprint: operation.semanticSubjectFingerprint,
      resolveNode,
      readBudget: budget,
    });
  } catch (error) {
    if (
      resolverSession.budgetExceeded ||
      (error instanceof Error && error.message.includes("budget_exceeded"))
    ) {
      throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
    }
    return indeterminate();
  }
  // A new effect or alias must be fenced by the active generation. An exact
  // lifetime replay may retain its older issuance generation because the
  // complete immutable ledger closure below proves that no new value is being
  // minted under the stale fence.
  if (
    (closure.status === "absent" || closure.status === "subject_only") &&
    operation.accountGeneration !== root.currentGeneration
  ) {
    return invalid();
  }
  let reduction;
  try {
    reduction = reduceAuthorizedWalletOperation(
      walletBefore.state,
      operation,
      closure.status === "canonical" || closure.status === "alias"
        ? {
            currentAccountGeneration: operation.accountGeneration,
            operationLedgerEntry: closure.operationLedgerEntry,
            subjectLedgerEntry: closure.subjectLedgerEntry,
          }
        : closure.status === "subject_only"
          ? {
              currentAccountGeneration: root.currentGeneration,
              subjectLedgerEntry: closure.subjectLedgerEntry,
            }
          : { currentAccountGeneration: root.currentGeneration },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "wallet_operation_out_of_order"
    ) {
      throw new Error(
        "owner_repository_wallet_credit_plan_reauthorize_required",
      );
    }
    if (
      error instanceof Error &&
      error.message === "wallet_operation_conflict"
    ) {
      throw new Error("owner_repository_wallet_credit_plan_conflict");
    }
    return indeterminate();
  }
  if (closure.status === "subject_only") {
    if (
      operation.operationId === closure.appliedReceipt.operationId ||
      operation.operationFingerprint ===
        closure.appliedReceipt.operationFingerprint ||
      reduction.operationLedgerEntry.operationId !== operation.operationId ||
      reduction.operationLedgerEntry.operationFingerprint !==
        operation.operationFingerprint ||
      reduction.operationLedgerEntry.canonicalOperationId !==
        closure.appliedReceipt.operationId ||
      reduction.changed ||
      !reduction.ledgerWriteRequired ||
      reduction.appliedReceipt.appliedReceiptFingerprint !==
        closure.appliedReceipt.appliedReceiptFingerprint
    )
      return indeterminate();
    return deepFreeze({
      status: "alias_repair_required" as const,
      appliedReceipt: reduction.appliedReceipt,
      authorizedOperation: operation,
      root,
      immutableBlobs: [] as const,
    });
  }
  if (!reduction.changed) {
    if (
      reduction.ledgerWriteRequired ||
      (closure.status !== "canonical" && closure.status !== "alias")
    )
      return indeterminate();
    return deepFreeze({
      status: "replayed" as const,
      appliedReceipt: reduction.appliedReceipt,
      authorizedOperation: operation,
      root,
      immutableBlobs: [] as const,
    });
  }
  if (
    closure.status !== "absent" ||
    !reduction.ledgerWriteRequired ||
    reduction.operationLedgerEntry.schemaVersion !==
      "learning-v2-wallet-operation-ledger-entry.v1" ||
    reduction.expectedRevision !== walletBefore.state.revision ||
    reduction.nextRevision !== walletBefore.state.revision + 1
  )
    return indeterminate();
  let closurePlan;
  try {
    closurePlan = await planOwnerRepositoryCanonicalEconomicClosure({
      accountScopeHash: root.accountScopeHash,
      operationManifest: operationManifest.manifest,
      subjectManifest: subjectManifest.manifest,
      receiptManifest: receiptManifest.manifest,
      operationLedgerEntry: reduction.operationLedgerEntry,
      subjectLedgerEntry: reduction.subjectLedgerEntry,
      appliedReceipt: reduction.appliedReceipt,
      resolveNode,
      readBudget: budget,
    });
  } catch (error) {
    if (
      resolverSession.budgetExceeded ||
      (error instanceof Error && error.message.includes("budget_exceeded"))
    ) {
      throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
    }
    return indeterminate();
  }
  if (
    !closurePlan.changed ||
    root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
    root.journalSequence === Number.MAX_SAFE_INTEGER
  )
    return indeterminate();
  const walletAfter = materializeOwnerRepositoryWalletStateBlob(
    reduction.state,
  );
  const record = createOwnerRepositoryWalletCreditJournalRecord({
    accountScopeHash: root.accountScopeHash,
    journalSequence: root.journalSequence + 1,
    repositoryRevisionBefore: root.repositoryRevision,
    rootBeforeFingerprint: root.rootFingerprint,
    previousJournalRecordRef: root.journalHeadRef,
    walletStateBeforeRef: root.walletStateRef,
    walletStateAfterRef: walletAfter.blob.ref,
    operationIndexManifestBeforeRef: root.operationIndexManifestRef,
    operationIndexManifestAfterRef: closurePlan.operationManifestBlob.ref,
    subjectIndexManifestBeforeRef: root.subjectIndexManifestRef,
    subjectIndexManifestAfterRef: closurePlan.subjectManifestBlob.ref,
    receiptIndexManifestBeforeRef: root.receiptIndexManifestRef,
    receiptIndexManifestAfterRef: closurePlan.receiptManifestBlob.ref,
    appliedReceipt: reduction.appliedReceipt,
  });
  const journalRecordBlob = materializeOwnerRepositoryJournalRecordBlob(record);
  const successorRoot =
    root.schemaVersion === "learning-v2-owner-repository-root.v2"
      ? bindOwnerRepositoryWalletCreditSuccessorRootV2({
          rootBefore: root,
          journalRecordBlob,
        })
      : (
          await import("./owner_repository_root_v3")
        ).bindOwnerRepositoryWalletCreditSuccessorRootV3({
          rootBefore: root,
          journalRecordBlob,
          promotedCheckpointAnchor: request.promotedCheckpointAnchor,
        });
  const immutableBlobs: OwnerRepositoryPlannedImmutableBlobV1[] = [
    walletAfter.blob,
    ...closurePlan.immutableNodeBlobs,
    closurePlan.operationManifestBlob,
    closurePlan.subjectManifestBlob,
    closurePlan.receiptManifestBlob,
    journalRecordBlob,
  ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey));
  if (
    !same(successorRoot.root.walletStateRef, walletAfter.blob.ref) ||
    successorRoot.root.repositoryRevision !== root.repositoryRevision + 1 ||
    successorRoot.root.journalSequence !== root.journalSequence + 1 ||
    successorRoot.root.previousRootFingerprint !== root.rootFingerprint
  )
    return indeterminate();
  return deepFreeze({
    status: "applied" as const,
    appliedReceipt: reduction.appliedReceipt,
    authorizedOperation: operation,
    journalRecord: record,
    journalRecordBlob,
    walletStateAfterBlob: walletAfter.blob,
    successorRoot,
    immutableBlobs,
  });
};

/**
 * Cycle-free publication plan for an already admitted RootV3 graph. The
 * historical planner remains the closed reducer/replay authority; this layer
 * replaces only the new-effect journal and lifetime index representation.
 * It performs no writes and the supplied RootV3 must still be fenced by the
 * repository before any returned blob is staged.
 */
export const planOwnerRepositoryWalletCreditV2 = async (
  input: unknown,
): Promise<OwnerRepositoryWalletCreditPlanV2Result> => {
  const request = readRecord(
    input,
    [
      "rootBefore",
      "walletStateBeforeBlob",
      "operationManifestBlob",
      "subjectManifestBlob",
      "receiptManifestBlob",
      "authorizedOperation",
      "resolveNode",
      "promotedCheckpointAnchor",
    ],
    ["readBudget"],
  );
  if (typeof request.resolveNode !== "function") return invalid();
  let stableRoot: unknown;
  let stableWalletBlob: unknown;
  let stableOperationManifestBlob: unknown;
  let stableSubjectManifestBlob: unknown;
  let stableReceiptManifestBlob: unknown;
  let stableOperation: unknown;
  let stableReadBudget: unknown;
  try {
    stableRoot = detachBoundedWalletJson(
      request.rootBefore,
      "owner_repository_wallet_credit_plan_invalid",
    );
    stableWalletBlob = detachBoundedWalletJson(
      request.walletStateBeforeBlob,
      "owner_repository_wallet_credit_plan_invalid",
    );
    stableOperationManifestBlob = detachBoundedWalletJson(
      request.operationManifestBlob,
      "owner_repository_wallet_credit_plan_invalid",
    );
    stableSubjectManifestBlob = detachBoundedWalletJson(
      request.subjectManifestBlob,
      "owner_repository_wallet_credit_plan_invalid",
    );
    stableReceiptManifestBlob = detachBoundedWalletJson(
      request.receiptManifestBlob,
      "owner_repository_wallet_credit_plan_invalid",
    );
    stableOperation = detachBoundedWalletJson(
      request.authorizedOperation,
      "owner_repository_wallet_credit_plan_invalid",
    );
    if (Object.prototype.hasOwnProperty.call(request, "readBudget")) {
      stableReadBudget = detachBoundedWalletJson(
        request.readBudget,
        "owner_repository_wallet_credit_plan_invalid",
      );
    }
  } catch {
    return invalid();
  }
  if (
    !isRecord(stableRoot) ||
    stableRoot.schemaVersion !== "learning-v2-owner-repository-root.v3" ||
    typeof stableRoot.accountScopeHash !== "string" ||
    !ACCOUNT.test(stableRoot.accountScopeHash)
  )
    return invalid();
  const { parseOwnerRepositoryRootV3,
    bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3 } =
    await import("./owner_repository_root_v3");
  let root: OwnerRepositoryRootV3;
  try {
    root = parseOwnerRepositoryRootV3(
      stableRoot,
      stableRoot.accountScopeHash,
    ).root;
  } catch {
    return invalid();
  }
  const hasReadBudget = Object.prototype.hasOwnProperty.call(
    request,
    "readBudget",
  );
  const readBudget = parseReadBudget(stableReadBudget, hasReadBudget);
  const externalResolver = createSharedResolver(request.resolveNode, readBudget);
  const stableInput = {
    rootBefore: root,
    walletStateBeforeBlob: stableWalletBlob,
    operationManifestBlob: stableOperationManifestBlob,
    subjectManifestBlob: stableSubjectManifestBlob,
    receiptManifestBlob: stableReceiptManifestBlob,
    authorizedOperation: stableOperation,
    promotedCheckpointAnchor: request.promotedCheckpointAnchor,
    resolveNode: externalResolver.resolveNode,
    readBudget,
  };
  let legacyPlan: OwnerRepositoryWalletCreditPlanResult;
  try {
    legacyPlan = await planOwnerRepositoryWalletCredit(stableInput);
  } catch (error) {
    if (externalResolver.budgetExceeded) {
      throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
    }
    throw error;
  }
  if (legacyPlan.status !== "applied") {
    if (legacyPlan.root.schemaVersion !==
      "learning-v2-owner-repository-root.v3") return indeterminate();
    return legacyPlan as OwnerRepositoryWalletCreditPlanV2Result;
  }
  const operationBlob = parseBlobInput(stableOperationManifestBlob);
  const subjectBlob = parseBlobInput(stableSubjectManifestBlob);
  const receiptBlob = parseBlobInput(stableReceiptManifestBlob);
  let operationManifest;
  let subjectManifest;
  let receiptManifest;
  try {
    operationManifest = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: root.accountScopeHash,
      indexKind: "operation",
      ref: operationBlob.ref,
      raw: operationBlob.encoded,
      resolveNode: externalResolver.resolveNode,
      readBudget,
    });
    subjectManifest = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: root.accountScopeHash,
      indexKind: "subject",
      ref: subjectBlob.ref,
      raw: subjectBlob.encoded,
      resolveNode: externalResolver.resolveNode,
      readBudget,
    });
    receiptManifest = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: root.accountScopeHash,
      indexKind: "receipt",
      ref: receiptBlob.ref,
      raw: receiptBlob.encoded,
      resolveNode: externalResolver.resolveNode,
      readBudget,
    });
  } catch (error) {
    if (
      externalResolver.budgetExceeded ||
      (error instanceof Error && error.message.includes("budget_exceeded"))
    ) {
      throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
    }
    return indeterminate();
  }
  if (
    !same(operationManifest.sourceManifestBlob.ref,
      root.operationIndexManifestRef) ||
    !same(subjectManifest.sourceManifestBlob.ref,
      root.subjectIndexManifestRef) ||
    !same(receiptManifest.sourceManifestBlob.ref,
      root.receiptIndexManifestRef)
  )
    return indeterminate();
  const record = createOwnerRepositoryWalletCreditEffectRecordV2({
    accountScopeHash: root.accountScopeHash,
    journalSequence: root.journalSequence + 1,
    repositoryRevisionBefore: root.repositoryRevision,
    rootBeforeFingerprint: root.rootFingerprint,
    previousJournalRecordRef: root.journalHeadRef,
    walletStateBeforeRef: root.walletStateRef,
    walletStateAfterRef: legacyPlan.walletStateAfterBlob.ref,
    operationIndexManifestBeforeRef: root.operationIndexManifestRef,
    subjectIndexManifestBeforeRef: root.subjectIndexManifestRef,
    receiptIndexManifestBeforeRef: root.receiptIndexManifestRef,
    appliedReceipt: legacyPlan.appliedReceipt,
  });
  const journalRecordBlob =
    materializeOwnerRepositoryWalletCreditEffectRecordBlobV2(record);
  let closurePlan;
  try {
    closurePlan = await planOwnerRepositoryCanonicalEconomicClosureV2({
      accountScopeHash: root.accountScopeHash,
      operationManifest: operationManifest.manifest,
      subjectManifest: subjectManifest.manifest,
      receiptManifest: receiptManifest.manifest,
      journalRecordBlob,
      resolveNode: externalResolver.resolveNode,
      readBudget,
    });
  } catch (error) {
    if (
      externalResolver.budgetExceeded ||
      (error instanceof Error && error.message.includes("budget_exceeded"))
    ) {
      throw new Error("owner_repository_wallet_credit_plan_budget_exceeded");
    }
    return indeterminate();
  }
  if (!closurePlan.changed) return indeterminate();
  let successorRoot: OwnerRepositoryRootV3Materialization;
  try {
    successorRoot = bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3({
      rootBefore: root,
      journalRecordBlob,
      operationIndexManifestAfterRef: closurePlan.operationManifestBlob.ref,
      subjectIndexManifestAfterRef: closurePlan.subjectManifestBlob.ref,
      receiptIndexManifestAfterRef: closurePlan.receiptManifestBlob.ref,
      promotedCheckpointAnchor: request.promotedCheckpointAnchor,
    });
  } catch {
    return indeterminate();
  }
  const immutableBlobs: OwnerRepositoryPlannedImmutableBlobV1[] = [
    legacyPlan.walletStateAfterBlob,
    ...closurePlan.immutableNodeBlobs,
    closurePlan.operationManifestBlob,
    closurePlan.subjectManifestBlob,
    closurePlan.receiptManifestBlob,
    journalRecordBlob,
  ].sort((left, right) => left.ref.blobKey.localeCompare(right.ref.blobKey));
  return deepFreeze({
    status: "applied" as const,
    appliedReceipt: legacyPlan.appliedReceipt,
    authorizedOperation: legacyPlan.authorizedOperation,
    journalRecord: record,
    journalRecordBlob,
    walletStateAfterBlob: legacyPlan.walletStateAfterBlob,
    successorRoot,
    immutableBlobs,
  });
};

import {
  canonicalJsonV1,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import { detachBoundedWalletJson } from "../contracts/wallet";
import type { OwnerRepositoryBlobRefV1 } from "./owner_repository";
import type { OwnerRepositoryEconomicManifestBlob } from "./owner_repository_economic_manifest";
import type {
  OwnerRepositoryRadixNodeRefV1,
  OwnerRepositoryRadixNodeResolver,
  OwnerRepositoryRadixReadBudget,
} from "./owner_repository_radix";
import {
  parseOwnerRepositoryRootV2,
  type OwnerRepositoryRootV2Materialization,
} from "./owner_repository_root_v2";
import type { OwnerRepositoryWalletStateBlobV1 } from "./owner_repository_wallet_blob";
import {
  planOwnerRepositoryWalletCredit,
  type OwnerRepositoryPlannedImmutableBlobV1,
  type OwnerRepositoryWalletCreditPlanResult,
} from "./owner_repository_wallet_credit_plan";
import {
  parseWalletAppliedReceipt,
  type WalletAppliedReceiptV1,
} from "./wallet_reducer";

export const OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS = 128;

type AppliedPlan = Extract<
  OwnerRepositoryWalletCreditPlanResult,
  { readonly status: "applied" }
>;

export interface OwnerRepositoryWalletCreditPageRootHistoryV1 {
  readonly rootFingerprint: string;
  readonly encoded: string;
}

export interface OwnerRepositoryWalletCreditPageFoldResult {
  readonly startingRoot: OwnerRepositoryRootV2Materialization;
  readonly endingRoot: OwnerRepositoryRootV2Materialization;
  readonly endingWalletStateBlob: OwnerRepositoryWalletStateBlobV1;
  readonly endingOperationManifestBlob: OwnerRepositoryEconomicManifestBlob<"operation">;
  readonly endingSubjectManifestBlob: OwnerRepositoryEconomicManifestBlob<"subject">;
  readonly endingReceiptManifestBlob: OwnerRepositoryEconomicManifestBlob<"receipt">;
  readonly transitions: readonly AppliedPlan[];
  readonly immutableBlobs: readonly OwnerRepositoryPlannedImmutableBlobV1[];
  readonly parentRootHistory: readonly OwnerRepositoryWalletCreditPageRootHistoryV1[];
}

const VERIFIED_PAGE_FOLDS = new WeakSet<object>();

/** Runtime capability check: only this module's completed, frozen fold result can pass. */
export const isOwnerRepositoryWalletCreditPageFoldResult = (
  input: unknown,
): input is OwnerRepositoryWalletCreditPageFoldResult =>
  typeof input === "object" && input !== null && VERIFIED_PAGE_FOLDS.has(input);

const DEFAULT_READ_BUDGET = Object.freeze({
  maxExternalReads: 4_096,
  maxExternalBytes: 128 * 1024 * 1024,
});
const MAX_READS = 100_000;
const MAX_BYTES = 1024 * 1024 * 1024;
const MAX_PAGE_INPUT_BYTES = 8 * 1024 * 1024;
const MAX_PAGE_GENERATED_BYTES = 64 * 1024 * 1024;
const MAX_PAGE_BLOBS = 8_192;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (): never => {
  throw new Error("owner_repository_wallet_credit_page_invalid");
};
const indeterminate = (): never => {
  throw new Error("owner_repository_wallet_credit_page_indeterminate");
};
const readRecord = (
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
    return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some((key) => typeof key !== "string") ||
    requiredKeys.some(
      (key) => !Object.prototype.hasOwnProperty.call(descriptors, key),
    ) ||
    keys.some(
      (key) =>
        typeof key !== "string" ||
        (!requiredKeys.includes(key) && !optionalKeys.includes(key)),
    )
  )
    return invalid();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
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
const same = (left: unknown, right: unknown) =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const parseBudget = (
  input: unknown,
  present: boolean,
): OwnerRepositoryRadixReadBudget => {
  if (!present) return DEFAULT_READ_BUDGET;
  if (input === undefined) return invalid();
  const value = readRecord(input, ["maxExternalReads", "maxExternalBytes"]);
  if (
    !safe(value.maxExternalReads, MAX_READS) ||
    !safe(value.maxExternalBytes, MAX_BYTES)
  ) {
    return invalid();
  }
  return deepFreeze({
    maxExternalReads: Number(value.maxExternalReads),
    maxExternalBytes: Number(value.maxExternalBytes),
  });
};
const parseReceipts = (input: unknown): readonly WalletAppliedReceiptV1[] => {
  if (
    !Array.isArray(input) ||
    Object.getPrototypeOf(input) !== Array.prototype ||
    input.length < 1 ||
    input.length > OWNER_REPOSITORY_WALLET_CREDIT_PAGE_MAX_RECORDS
  ) {
    return invalid();
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (
    keys.some((key) => typeof key !== "string") ||
    keys.length !== input.length + 1 ||
    !Object.prototype.hasOwnProperty.call(descriptors, "length")
  )
    return invalid();
  const receipts: WalletAppliedReceiptV1[] = [];
  let inputBytes = 0;
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable)
      return invalid();
    try {
      const receipt = parseWalletAppliedReceipt(descriptor.value);
      inputBytes += utf8ByteLengthV1(canonicalJsonV1(receipt));
      if (
        !Number.isSafeInteger(inputBytes) ||
        inputBytes > MAX_PAGE_INPUT_BYTES
      ) {
        throw new Error("page_input_overflow");
      }
      receipts.push(receipt);
    } catch {
      return invalid();
    }
  }
  return deepFreeze(receipts);
};
const manifestBlob = <K extends "operation" | "subject" | "receipt">(
  blobs: readonly OwnerRepositoryPlannedImmutableBlobV1[],
  indexKind: K,
): OwnerRepositoryEconomicManifestBlob<K> => {
  const kind = `${indexKind}_index_manifest`;
  const found = blobs.find((blob) => blob.ref.kind === kind);
  if (!found) return indeterminate();
  return found as OwnerRepositoryEconomicManifestBlob<K>;
};

/**
 * Pure forward fold over one canonical wallet-credit page. The starting graph must already
 * be repository-verified. This function performs no storage writes and does not create a
 * checkpoint trust anchor; it only derives the exact next transitions and lifetime indexes.
 * Receipt hashes and the `trusted_server_boundary` label are not authentication: callers may
 * pass only receipts already established by repository journal/checkpoint verification.
 */
export const foldOwnerRepositoryWalletCreditPage = async (
  input: unknown,
): Promise<OwnerRepositoryWalletCreditPageFoldResult> => {
  const request = readRecord(
    input,
    [
      "startingRoot",
      "walletStateBeforeBlob",
      "operationManifestBlob",
      "subjectManifestBlob",
      "receiptManifestBlob",
      "canonicalAppliedReceipts",
      "resolveNode",
    ],
    ["readBudget"],
  );
  if (typeof request.resolveNode !== "function") return invalid();
  const receipts = parseReceipts(request.canonicalAppliedReceipts);
  const hasBudget = Object.prototype.hasOwnProperty.call(request, "readBudget");
  const budget = parseBudget(request.readBudget, hasBudget);
  let startingRoot: OwnerRepositoryRootV2Materialization;
  try {
    const detachedRoot = detachBoundedWalletJson(
      request.startingRoot,
      "owner_repository_wallet_credit_page_invalid",
    );
    if (
      !isRecord(detachedRoot) ||
      typeof detachedRoot.accountScopeHash !== "string"
    ) {
      return invalid();
    }
    startingRoot = parseOwnerRepositoryRootV2(
      detachedRoot,
      detachedRoot.accountScopeHash,
    );
  } catch {
    return invalid();
  }
  const overlay = new Map<string, string>();
  const externalCache = new Map<string, unknown>();
  let externalReads = 0;
  let externalBytes = 0;
  let budgetExceeded = false;
  const resolveNode: OwnerRepositoryRadixNodeResolver = async (
    ref: OwnerRepositoryRadixNodeRefV1,
  ) => {
    if (overlay.has(ref.blobKey)) return overlay.get(ref.blobKey)!;
    if (externalCache.has(ref.blobKey)) return externalCache.get(ref.blobKey);
    if (externalReads >= budget.maxExternalReads) {
      budgetExceeded = true;
      throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
    }
    let raw: unknown;
    try {
      raw = await (request.resolveNode as OwnerRepositoryRadixNodeResolver)(
        ref,
      );
    } catch {
      return indeterminate();
    }
    externalReads += 1;
    if (typeof raw === "string") {
      try {
        externalBytes += utf8ByteLengthV1(raw);
      } catch {
        return indeterminate();
      }
      if (
        !Number.isSafeInteger(externalBytes) ||
        externalBytes > budget.maxExternalBytes
      ) {
        budgetExceeded = true;
        throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
      }
    }
    externalCache.set(ref.blobKey, raw);
    return raw;
  };
  let currentRoot = startingRoot;
  let currentWallet = request.walletStateBeforeBlob;
  let currentOperation = request.operationManifestBlob;
  let currentSubject = request.subjectManifestBlob;
  let currentReceipt = request.receiptManifestBlob;
  const transitions: AppliedPlan[] = [];
  const immutable = new Map<string, OwnerRepositoryPlannedImmutableBlobV1>();
  const parentRootHistory: OwnerRepositoryWalletCreditPageRootHistoryV1[] = [];
  let generatedBytes = 0;
  let generatedBlobs = 0;
  const accountGenerated = (encoded: string): void => {
    let bytes: number;
    try {
      bytes = utf8ByteLengthV1(encoded);
    } catch {
      throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
    }
    generatedBytes += bytes;
    generatedBlobs += 1;
    if (
      !Number.isSafeInteger(generatedBytes) ||
      generatedBytes > MAX_PAGE_GENERATED_BYTES ||
      !Number.isSafeInteger(generatedBlobs) ||
      generatedBlobs > MAX_PAGE_BLOBS
    ) {
      throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
    }
  };
  for (const receipt of receipts) {
    let plan: OwnerRepositoryWalletCreditPlanResult;
    try {
      plan = await planOwnerRepositoryWalletCredit({
        rootBefore: currentRoot.root,
        walletStateBeforeBlob: currentWallet,
        operationManifestBlob: currentOperation,
        subjectManifestBlob: currentSubject,
        receiptManifestBlob: currentReceipt,
        authorizedOperation: receipt.authorizedOperation,
        resolveNode,
      });
    } catch (error) {
      if (
        budgetExceeded ||
        (error instanceof Error && error.message.includes("budget_exceeded"))
      ) {
        throw new Error("owner_repository_wallet_credit_page_budget_exceeded");
      }
      return indeterminate();
    }
    if (
      plan.status !== "applied" ||
      plan.successorRoot.root.schemaVersion !==
        "learning-v2-owner-repository-root.v2" ||
      !same(plan.appliedReceipt, receipt)
    )
      return indeterminate();
    accountGenerated(currentRoot.encoded);
    parentRootHistory.push(
      deepFreeze({
        rootFingerprint: currentRoot.root.rootFingerprint,
        encoded: currentRoot.encoded,
      }),
    );
    for (const blob of plan.immutableBlobs) {
      const existing = immutable.get(blob.ref.blobKey);
      if (existing && existing.encoded !== blob.encoded) return indeterminate();
      if (!existing) {
        accountGenerated(blob.encoded);
        immutable.set(blob.ref.blobKey, blob);
      }
      if (blob.ref.kind === "index_radix_node")
        overlay.set(blob.ref.blobKey, blob.encoded);
    }
    transitions.push(plan);
    currentRoot = plan.successorRoot as OwnerRepositoryRootV2Materialization;
    currentWallet = plan.walletStateAfterBlob;
    currentOperation = manifestBlob(plan.immutableBlobs, "operation");
    currentSubject = manifestBlob(plan.immutableBlobs, "subject");
    currentReceipt = manifestBlob(plan.immutableBlobs, "receipt");
  }
  const result = deepFreeze({
    startingRoot,
    endingRoot: currentRoot,
    endingWalletStateBlob: currentWallet as OwnerRepositoryWalletStateBlobV1,
    endingOperationManifestBlob:
      currentOperation as OwnerRepositoryEconomicManifestBlob<"operation">,
    endingSubjectManifestBlob:
      currentSubject as OwnerRepositoryEconomicManifestBlob<"subject">,
    endingReceiptManifestBlob:
      currentReceipt as OwnerRepositoryEconomicManifestBlob<"receipt">,
    transitions,
    immutableBlobs: [...immutable.values()].sort((left, right) =>
      left.ref.blobKey.localeCompare(right.ref.blobKey),
    ),
    parentRootHistory,
  });
  VERIFIED_PAGE_FOLDS.add(result);
  return result;
};

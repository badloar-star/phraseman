import {
  createAuthorizedCourseUnlockRequest,
  type AuthorizedCourseUnlockRequestV1,
} from "../contracts/course_unlock";
import { isWalletIdentifier } from "../contracts/wallet";
import { canonicalJsonV1 } from "../policies/decision_registry";
import type { OwnerRepositoryBlobRefV1 } from "./owner_repository";
import {
  materializeOwnerRepositoryCourseUnlockStateBlob,
  parseOwnerRepositoryCourseUnlockStateBlob,
  type OwnerRepositoryCourseUnlockStateBlobV1,
} from "./owner_repository_course_blob";
import {
  createOwnerRepositoryCourseUnlockEffectRecordV2,
  materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2,
  parseOwnerRepositoryCourseUnlockEffectRecordBlobV2,
  type OwnerRepositoryCourseUnlockEffectRecordBlobV2,
} from "./owner_repository_course_unlock_effect_v2";
import {
  parseOwnerRepositoryCourseUnlockEconomicIndexValueV2,
  type OwnerRepositoryCourseUnlockOperationIndexValueV2,
  type OwnerRepositoryCourseUnlockReceiptIndexValueV2,
  type OwnerRepositoryCourseUnlockSubjectIndexValueV2,
} from "./owner_repository_course_unlock_economic_values_v2";
import {
  lookupOwnerRepositoryCourseState,
  parseOwnerRepositoryCourseManifestBlob,
  planOwnerRepositoryCourseStateMutation,
  type OwnerRepositoryCourseManifestBlob,
  type OwnerRepositoryCourseStateManifestV1,
} from "./owner_repository_course_manifest";
import {
  parseOwnerRepositoryEconomicManifestBlob,
  planOwnerRepositoryCourseUnlockEconomicClosureV2,
  type OwnerRepositoryCourseUnlockEconomicClosurePlanV2,
  type OwnerRepositoryEconomicManifestBlob,
  type OwnerRepositoryEconomicManifestV2,
} from "./owner_repository_economic_manifest";
import {
  lookupOwnerRepositoryRadix,
  type OwnerRepositoryRadixBlob,
  type OwnerRepositoryRadixNodeResolver,
} from "./owner_repository_radix";
import {
  bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3FromV2,
  bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3,
  parseOwnerRepositoryRootV3,
  type OwnerRepositoryRootV3,
  type OwnerRepositoryRootV3Materialization,
} from "./owner_repository_root_v3";
import {
  parseOwnerRepositoryRootV2,
  type OwnerRepositoryRootV2,
} from "./owner_repository_root_v2";
import {
  materializeOwnerRepositoryWalletStateBlob,
  parseOwnerRepositoryWalletStateBlob,
  type OwnerRepositoryWalletStateBlobV1,
} from "./owner_repository_wallet_blob";
import {
  createCourseUnlockState,
  reduceAuthorizedCourseUnlock,
  type CourseUnlockAppliedReceiptV1,
  type CourseUnlockReductionResult,
  type CourseUnlockStateV1,
} from "./course_unlock_reducer";
import type { WalletStateV1 } from "./wallet_reducer";

export type OwnerRepositoryCourseUnlockPlanImmutableBlob = Readonly<{
  readonly ref: OwnerRepositoryBlobRefV1;
  readonly encoded: string;
}>;

export type OwnerRepositoryCourseUnlockPlanResult =
  | Readonly<{
      readonly status: "insufficient_balance";
      readonly requiredSubunits: number;
      readonly currentBalanceSubunits: number;
      readonly root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3;
      readonly walletState: WalletStateV1;
      readonly courseUnlockState: CourseUnlockStateV1;
    }>
  | Readonly<{
      readonly status: "replayed";
      readonly appliedReceipt: CourseUnlockAppliedReceiptV1;
      readonly root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3;
      readonly walletState: WalletStateV1;
      readonly courseUnlockState: CourseUnlockStateV1;
    }>
  | Readonly<{
      readonly status: "planned";
      readonly appliedReceipt: CourseUnlockAppliedReceiptV1;
      readonly rootBefore: OwnerRepositoryRootV2 | OwnerRepositoryRootV3;
      readonly successorRoot: OwnerRepositoryRootV3Materialization;
      readonly walletStateAfterBlob: OwnerRepositoryWalletStateBlobV1;
      readonly courseStateAfterBlob: OwnerRepositoryCourseUnlockStateBlobV1;
      readonly courseManifestAfterBlob: OwnerRepositoryCourseManifestBlob;
      readonly journalRecordBlob: OwnerRepositoryCourseUnlockEffectRecordBlobV2;
      readonly economicClosure: OwnerRepositoryCourseUnlockEconomicClosurePlanV2;
      readonly immutableBlobs: readonly OwnerRepositoryCourseUnlockPlanImmutableBlob[];
    }>;

export type OwnerRepositoryCourseUnlockBlobResolver = (
  ref: OwnerRepositoryBlobRefV1,
) => unknown | Promise<unknown>;

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (): never => {
  throw new Error("owner_repository_course_unlock_plan_invalid");
};
const indeterminate = (): never => {
  throw new Error("owner_repository_course_unlock_plan_indeterminate");
};
const same = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const deepFreeze = <T>(value: T): T => {
  const stack: unknown[] = [value];
  const seen = new Set<object>();
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current !== "object" || current === null || seen.has(current)) {
      continue;
    }
    seen.add(current);
    Object.freeze(current);
    for (const child of Object.values(current as Record<string, unknown>)) {
      stack.push(child);
    }
  }
  return value;
};
const readRecord = (
  input: unknown,
  keys: readonly string[],
  optionalKeys: readonly string[] = [],
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) {
    return invalid();
  }
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const own = Reflect.ownKeys(descriptors);
  if (
    own.length < keys.length ||
    own.length > keys.length + optionalKeys.length ||
    own.some((key) => typeof key !== "string" ||
      (!keys.includes(key) && !optionalKeys.includes(key))) ||
    own.some((key) => {
      if (typeof key !== "string") return true;
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    }) ||
    keys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key))
  ) {
    return invalid();
  }
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of own) {
    if (typeof key !== "string") return invalid();
    result[key] = descriptors[key].value;
  }
  return result;
};
const requireRaw = async (
  resolver: OwnerRepositoryCourseUnlockBlobResolver,
  ref: OwnerRepositoryBlobRefV1,
): Promise<string> => {
  let raw: unknown;
  try {
    raw = await resolver(ref);
  } catch {
    return indeterminate();
  }
  if (typeof raw !== "string") return indeterminate();
  return raw;
};
const uniqueBlobs = (
  blobs: readonly OwnerRepositoryCourseUnlockPlanImmutableBlob[],
): readonly OwnerRepositoryCourseUnlockPlanImmutableBlob[] => {
  const sorted = [...blobs].sort((left, right) =>
    left.ref.blobKey.localeCompare(right.ref.blobKey),
  );
  const result: OwnerRepositoryCourseUnlockPlanImmutableBlob[] = [];
  for (const blob of sorted) {
    const previous = result[result.length - 1];
    if (previous?.ref.blobKey === blob.ref.blobKey) {
      if (previous.encoded !== blob.encoded || !same(previous.ref, blob.ref)) {
        return indeterminate();
      }
      continue;
    }
    result.push(blob);
  }
  return deepFreeze(result);
};

const parseEconomicManifests = async (input: {
  readonly accountScopeHash: string;
  readonly root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3;
  readonly operationManifestBlob: unknown;
  readonly subjectManifestBlob: unknown;
  readonly receiptManifestBlob: unknown;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
}): Promise<Readonly<{
  operation: OwnerRepositoryEconomicManifestV2<"operation">;
  subject: OwnerRepositoryEconomicManifestV2<"subject">;
  receipt: OwnerRepositoryEconomicManifestV2<"receipt">;
}>> => {
  const operationBlob = readRecord(input.operationManifestBlob, ["ref", "encoded"]);
  const subjectBlob = readRecord(input.subjectManifestBlob, ["ref", "encoded"]);
  const receiptBlob = readRecord(input.receiptManifestBlob, ["ref", "encoded"]);
  try {
    const operation = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: input.accountScopeHash,
      indexKind: "operation",
      ref: operationBlob.ref as OwnerRepositoryEconomicManifestBlob<"operation">["ref"],
      raw: operationBlob.encoded,
      resolveNode: input.resolveNode,
    });
    const subject = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: input.accountScopeHash,
      indexKind: "subject",
      ref: subjectBlob.ref as OwnerRepositoryEconomicManifestBlob<"subject">["ref"],
      raw: subjectBlob.encoded,
      resolveNode: input.resolveNode,
    });
    const receipt = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: input.accountScopeHash,
      indexKind: "receipt",
      ref: receiptBlob.ref as OwnerRepositoryEconomicManifestBlob<"receipt">["ref"],
      raw: receiptBlob.encoded,
      resolveNode: input.resolveNode,
    });
    const legacyV2Genesis = input.root.schemaVersion ===
      "learning-v2-owner-repository-root.v2" &&
      operation.manifest.entryCount === 0 &&
      subject.manifest.entryCount === 0 &&
      receipt.manifest.entryCount === 0;
    if (
      (!legacyV2Genesis && (operation.legacy || subject.legacy || receipt.legacy)) ||
      (input.root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
        (!same(operation.normalizedManifestBlob.ref,
          input.root.operationIndexManifestRef) ||
          !same(subject.normalizedManifestBlob.ref,
            input.root.subjectIndexManifestRef) ||
          !same(receipt.normalizedManifestBlob.ref,
            input.root.receiptIndexManifestRef)))
    ) {
      return indeterminate();
    }
    return deepFreeze({
      operation: operation.manifest,
      subject: subject.manifest,
      receipt: receipt.manifest,
    });
  } catch {
    return indeterminate();
  }
};

const lookupCourseLedger = async (input: {
  readonly accountScopeHash: string;
  readonly operationManifest: OwnerRepositoryEconomicManifestV2<"operation">;
  readonly subjectManifest: OwnerRepositoryEconomicManifestV2<"subject">;
  readonly receiptManifest: OwnerRepositoryEconomicManifestV2<"receipt">;
  readonly authorizedRequest: AuthorizedCourseUnlockRequestV1;
  readonly walletState: WalletStateV1;
  readonly courseState: CourseUnlockStateV1;
  readonly resolveNode: OwnerRepositoryRadixNodeResolver;
  readonly resolveBlob: OwnerRepositoryCourseUnlockBlobResolver;
}): Promise<Readonly<{
  operationLedgerEntry?: OwnerRepositoryCourseUnlockOperationIndexValueV2["ledgerEntry"];
  subjectLedgerEntry?: OwnerRepositoryCourseUnlockSubjectIndexValueV2["ledgerEntry"];
  repositoryVerifiedAncestry?: Readonly<{
    schemaVersion: "learning-v2-course-unlock-repository-ancestry.v1";
    canonicalAppliedReceiptFingerprint: string;
    currentWalletStateFingerprint: string;
    currentCourseStateFingerprint: string;
    proofSource: "authoritative_compound_journal";
  }>;
}>> => {
  const request = input.authorizedRequest;
  let byId;
  let byFingerprint;
  let subject;
  try {
    byId = await lookupOwnerRepositoryRadix({
      accountScopeHash: input.accountScopeHash,
      indexKind: "operation",
      manifest: input.operationManifest,
      keyKind: "operation_id",
      logicalKey: request.operationId,
      resolveNode: input.resolveNode,
    });
    byFingerprint = await lookupOwnerRepositoryRadix({
      accountScopeHash: input.accountScopeHash,
      indexKind: "operation",
      manifest: input.operationManifest,
      keyKind: "operation_fingerprint",
      logicalKey: request.operationFingerprint,
      resolveNode: input.resolveNode,
    });
    subject = await lookupOwnerRepositoryRadix({
      accountScopeHash: input.accountScopeHash,
      indexKind: "subject",
      manifest: input.subjectManifest,
      keyKind: "semantic_subject",
      logicalKey: request.semanticSubjectFingerprint,
      resolveNode: input.resolveNode,
    });
  } catch {
    return indeterminate();
  }
  if (!byId && !byFingerprint && !subject) return deepFreeze({});
  if (!byId || !byFingerprint || !subject) return indeterminate();
  let operationById: OwnerRepositoryCourseUnlockOperationIndexValueV2;
  let operationByFingerprint: OwnerRepositoryCourseUnlockOperationIndexValueV2;
  let subjectValue: OwnerRepositoryCourseUnlockSubjectIndexValueV2;
  try {
    operationById = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
      accountScopeHash: input.accountScopeHash,
      indexKind: "operation",
      keyKind: "operation_id",
      logicalKey: request.operationId,
      value: byId.value,
    }) as OwnerRepositoryCourseUnlockOperationIndexValueV2;
    operationByFingerprint =
      parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash: input.accountScopeHash,
        indexKind: "operation",
        keyKind: "operation_fingerprint",
        logicalKey: request.operationFingerprint,
        value: byFingerprint.value,
      }) as OwnerRepositoryCourseUnlockOperationIndexValueV2;
    subjectValue = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
      accountScopeHash: input.accountScopeHash,
      indexKind: "subject",
      keyKind: "semantic_subject",
      logicalKey: request.semanticSubjectFingerprint,
      value: subject.value,
    }) as OwnerRepositoryCourseUnlockSubjectIndexValueV2;
  } catch {
    return indeterminate();
  }
  if (
    !same(operationById, operationByFingerprint) ||
    !same(operationById.effectBinding, subjectValue.effectBinding)
  ) {
    return indeterminate();
  }
  const binding = operationById.effectBinding;
  let receiptEntry;
  try {
    receiptEntry = await lookupOwnerRepositoryRadix({
      accountScopeHash: input.accountScopeHash,
      indexKind: "receipt",
      manifest: input.receiptManifest,
      keyKind: "applied_receipt",
      logicalKey: binding.appliedReceiptFingerprint,
      resolveNode: input.resolveNode,
    });
  } catch {
    return indeterminate();
  }
  if (!receiptEntry) return indeterminate();
  let receiptValue: OwnerRepositoryCourseUnlockReceiptIndexValueV2;
  try {
    receiptValue = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
      accountScopeHash: input.accountScopeHash,
      indexKind: "receipt",
      keyKind: "applied_receipt",
      logicalKey: binding.appliedReceiptFingerprint,
      value: receiptEntry.value,
    }) as OwnerRepositoryCourseUnlockReceiptIndexValueV2;
  } catch {
    return indeterminate();
  }
  if (!same(receiptValue.effectBinding, binding)) return indeterminate();
  const journalRaw = await requireRaw(
    input.resolveBlob,
    binding.canonicalEffectJournalRecordRef,
  );
  let journal: OwnerRepositoryCourseUnlockEffectRecordBlobV2;
  try {
    journal = parseOwnerRepositoryCourseUnlockEffectRecordBlobV2({
      accountScopeHash: input.accountScopeHash,
      ref: binding.canonicalEffectJournalRecordRef,
      raw: journalRaw,
    });
  } catch {
    return indeterminate();
  }
  if (
    journal.record.journalRecordFingerprint !==
      binding.canonicalEffectJournalRecordFingerprint ||
    journal.record.appliedReceiptFingerprint !==
      binding.appliedReceiptFingerprint ||
    !same(journal.record.appliedReceipt, receiptValue.appliedReceipt)
  ) {
    return indeterminate();
  }
  return deepFreeze({
    operationLedgerEntry: operationById.ledgerEntry,
    subjectLedgerEntry: subjectValue.ledgerEntry,
    repositoryVerifiedAncestry: {
      schemaVersion:
        "learning-v2-course-unlock-repository-ancestry.v1" as const,
      canonicalAppliedReceiptFingerprint: binding.appliedReceiptFingerprint,
      currentWalletStateFingerprint: input.walletState.stateFingerprint,
      currentCourseStateFingerprint: input.courseState.stateFingerprint,
      proofSource: "authoritative_compound_journal" as const,
    },
  });
};

/**
 * Resolves one already-committed course purchase through all four typed
 * economic coordinates and the immutable compound journal. A lone operation
 * row is never enough authority for replay.
 */
export const lookupOwnerRepositoryCanonicalCourseUnlockReceiptByOperationIdV2 =
  async (input: unknown): Promise<CourseUnlockAppliedReceiptV1 | undefined> => {
    const request = readRecord(input, [
      "accountScopeHash",
      "operationManifest",
      "subjectManifest",
      "receiptManifest",
      "operationId",
      "resolveNode",
      "resolveBlob",
    ]);
    if (
      typeof request.accountScopeHash !== "string" ||
      !ACCOUNT.test(request.accountScopeHash) ||
      !isWalletIdentifier(request.operationId) ||
      typeof request.resolveNode !== "function" ||
      typeof request.resolveBlob !== "function"
    ) {
      return invalid();
    }
    const accountScopeHash = request.accountScopeHash;
    const operationId = request.operationId;
    const operationManifest =
      request.operationManifest as OwnerRepositoryEconomicManifestV2<"operation">;
    const subjectManifest =
      request.subjectManifest as OwnerRepositoryEconomicManifestV2<"subject">;
    const receiptManifest =
      request.receiptManifest as OwnerRepositoryEconomicManifestV2<"receipt">;
    const resolveNode = request.resolveNode as OwnerRepositoryRadixNodeResolver;
    const resolveBlob = request.resolveBlob as OwnerRepositoryCourseUnlockBlobResolver;
    let byId;
    try {
      byId = await lookupOwnerRepositoryRadix({
        accountScopeHash,
        indexKind: "operation",
        manifest: operationManifest,
        keyKind: "operation_id",
        logicalKey: operationId,
        resolveNode,
      });
    } catch {
      return indeterminate();
    }
    if (!byId) return undefined;
    let operationValue: OwnerRepositoryCourseUnlockOperationIndexValueV2;
    try {
      operationValue = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "operation",
        keyKind: "operation_id",
        logicalKey: operationId,
        value: byId.value,
      }) as OwnerRepositoryCourseUnlockOperationIndexValueV2;
    } catch {
      return indeterminate();
    }
    const binding = operationValue.effectBinding;
    const ledger = operationValue.ledgerEntry;
    let byFingerprint;
    let subject;
    let receipt;
    try {
      [byFingerprint, subject, receipt] = await Promise.all([
        lookupOwnerRepositoryRadix({
          accountScopeHash,
          indexKind: "operation",
          manifest: operationManifest,
          keyKind: "operation_fingerprint",
          logicalKey: ledger.operationFingerprint,
          resolveNode,
        }),
        lookupOwnerRepositoryRadix({
          accountScopeHash,
          indexKind: "subject",
          manifest: subjectManifest,
          keyKind: "semantic_subject",
          logicalKey: ledger.semanticSubjectFingerprint,
          resolveNode,
        }),
        lookupOwnerRepositoryRadix({
          accountScopeHash,
          indexKind: "receipt",
          manifest: receiptManifest,
          keyKind: "applied_receipt",
          logicalKey: binding.appliedReceiptFingerprint,
          resolveNode,
        }),
      ]);
    } catch {
      return indeterminate();
    }
    if (!byFingerprint || !subject || !receipt) return indeterminate();
    let fingerprintValue: OwnerRepositoryCourseUnlockOperationIndexValueV2;
    let subjectValue: OwnerRepositoryCourseUnlockSubjectIndexValueV2;
    let receiptValue: OwnerRepositoryCourseUnlockReceiptIndexValueV2;
    try {
      fingerprintValue = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "operation",
        keyKind: "operation_fingerprint",
        logicalKey: ledger.operationFingerprint,
        value: byFingerprint.value,
      }) as OwnerRepositoryCourseUnlockOperationIndexValueV2;
      subjectValue = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "subject",
        keyKind: "semantic_subject",
        logicalKey: ledger.semanticSubjectFingerprint,
        value: subject.value,
      }) as OwnerRepositoryCourseUnlockSubjectIndexValueV2;
      receiptValue = parseOwnerRepositoryCourseUnlockEconomicIndexValueV2({
        accountScopeHash,
        indexKind: "receipt",
        keyKind: "applied_receipt",
        logicalKey: binding.appliedReceiptFingerprint,
        value: receipt.value,
      }) as OwnerRepositoryCourseUnlockReceiptIndexValueV2;
    } catch {
      return indeterminate();
    }
    if (
      !same(fingerprintValue, operationValue) ||
      !same(subjectValue.effectBinding, binding) ||
      !same(receiptValue.effectBinding, binding) ||
      receiptValue.appliedReceipt.authorizedRequest.operationId !== operationId ||
      !same(receiptValue.appliedReceipt, ledger.appliedReceipt) ||
      !same(subjectValue.ledgerEntry.appliedReceipt, ledger.appliedReceipt)
    ) {
      return indeterminate();
    }
    const journalRaw = await requireRaw(
      resolveBlob,
      binding.canonicalEffectJournalRecordRef,
    );
    let journal: OwnerRepositoryCourseUnlockEffectRecordBlobV2;
    try {
      journal = parseOwnerRepositoryCourseUnlockEffectRecordBlobV2({
        accountScopeHash,
        ref: binding.canonicalEffectJournalRecordRef,
        raw: journalRaw,
      });
    } catch {
      return indeterminate();
    }
    if (
      journal.record.journalRecordFingerprint !==
        binding.canonicalEffectJournalRecordFingerprint ||
      journal.record.appliedReceiptFingerprint !==
        binding.appliedReceiptFingerprint ||
      !same(journal.record.appliedReceipt, receiptValue.appliedReceipt)
    ) {
      return indeterminate();
    }
    return receiptValue.appliedReceipt;
  };

export const planOwnerRepositoryCourseUnlock = async (
  input: unknown,
): Promise<OwnerRepositoryCourseUnlockPlanResult> => {
  const request = readRecord(input, [
    "accountScopeHash",
    "rootBefore",
    "walletStateBlob",
    "courseManifestBlob",
    "operationManifestBlob",
    "subjectManifestBlob",
    "receiptManifestBlob",
    "authorizedRequest",
    "resolveNode",
    "resolveBlob",
  ], ["promotedCheckpointAnchor", "adoptionBase"]);
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.resolveNode !== "function" ||
    typeof request.resolveBlob !== "function"
  ) {
    return invalid();
  }
  const accountScopeHash = request.accountScopeHash;
  let root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3;
  let walletState: WalletStateV1;
  let walletStateBlob: OwnerRepositoryWalletStateBlobV1;
  let courseManifest: OwnerRepositoryCourseStateManifestV1;
  let courseManifestBlob: OwnerRepositoryCourseManifestBlob;
  let authorizedRequest: AuthorizedCourseUnlockRequestV1;
  try {
    const detachedRoot = request.rootBefore as Record<string, unknown>;
    root = detachedRoot.schemaVersion ===
      "learning-v2-owner-repository-root.v3"
      ? parseOwnerRepositoryRootV3(detachedRoot, accountScopeHash).root
      : parseOwnerRepositoryRootV2(detachedRoot, accountScopeHash).root;
    const walletBlob = readRecord(request.walletStateBlob, ["ref", "encoded"]);
    const parsedWallet = parseOwnerRepositoryWalletStateBlob({
      accountScopeHash,
      ref: walletBlob.ref,
      raw: walletBlob.encoded,
    });
    walletStateBlob = parsedWallet.blob;
    walletState = parsedWallet.state;
    const courseBlob = readRecord(request.courseManifestBlob, ["ref", "encoded"]);
    const parsedCourseManifest = await parseOwnerRepositoryCourseManifestBlob({
        accountScopeHash,
        ref: courseBlob.ref as OwnerRepositoryCourseManifestBlob["ref"],
        raw: courseBlob.encoded,
        resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
      });
    courseManifest = parsedCourseManifest.manifest;
    courseManifestBlob = parsedCourseManifest.manifestBlob;
    authorizedRequest = createAuthorizedCourseUnlockRequest(
      request.authorizedRequest,
    );
  } catch {
    return indeterminate();
  }
  if (
    root.currentGeneration !== authorizedRequest.accountGeneration ||
    root.accountScopeHash !== authorizedRequest.accountScopeHash ||
    !same(root.walletStateRef, walletStateBlob.ref) ||
    !same(root.courseStateManifestRef, courseManifestBlob.ref)
  ) {
    return indeterminate();
  }
  const hasPromotedCheckpointAnchor = Object.prototype.hasOwnProperty.call(
    request,
    "promotedCheckpointAnchor",
  );
  const hasAdoptionBase = Object.prototype.hasOwnProperty.call(
    request,
    "adoptionBase",
  );
  if (root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
    root.walletCheckpointPromotionRequired &&
    !hasPromotedCheckpointAnchor) {
    throw new Error("owner_repository_course_unlock_checkpoint_promotion_required");
  }
  if ((root.schemaVersion === "learning-v2-owner-repository-root.v3" &&
      hasAdoptionBase) ||
    (root.schemaVersion === "learning-v2-owner-repository-root.v2" &&
      !hasAdoptionBase) ||
    (root.schemaVersion === "learning-v2-owner-repository-root.v2" &&
      hasPromotedCheckpointAnchor)) return invalid();
  let courseEntry;
  try {
    const courseIdentityFingerprint = createCourseUnlockState({
      accountScopeHash,
      courseId: authorizedRequest.courseId,
      studyTarget: authorizedRequest.studyTarget,
    }).courseIdentityFingerprint;
    courseEntry = await lookupOwnerRepositoryCourseState({
      accountScopeHash,
      manifest: courseManifest,
      courseIdentityFingerprint,
      resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
    });
  } catch {
    return indeterminate();
  }
  let courseState: CourseUnlockStateV1;
  let courseStateBeforeBlob:
    | Readonly<{
        state: CourseUnlockStateV1;
        blob: OwnerRepositoryCourseUnlockStateBlobV1;
      }>
    | undefined;
  if (!courseEntry) {
    courseState = createCourseUnlockState({
      accountScopeHash,
      courseId: authorizedRequest.courseId,
      studyTarget: authorizedRequest.studyTarget,
    });
  } else {
    const raw = await requireRaw(
      request.resolveBlob as OwnerRepositoryCourseUnlockBlobResolver,
      courseEntry.stateRef,
    );
    try {
      courseStateBeforeBlob = parseOwnerRepositoryCourseUnlockStateBlob({
        accountScopeHash,
        ref: courseEntry.stateRef,
        raw,
      });
      courseState = courseStateBeforeBlob.state;
    } catch {
      return indeterminate();
    }
  }
  const manifests = await parseEconomicManifests({
    accountScopeHash,
    root,
    operationManifestBlob: request.operationManifestBlob,
    subjectManifestBlob: request.subjectManifestBlob,
    receiptManifestBlob: request.receiptManifestBlob,
    resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
  });
  const ledger = await lookupCourseLedger({
    accountScopeHash,
    operationManifest: manifests.operation,
    subjectManifest: manifests.subject,
    receiptManifest: manifests.receipt,
    authorizedRequest,
    walletState,
    courseState,
    resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
    resolveBlob: request.resolveBlob as OwnerRepositoryCourseUnlockBlobResolver,
  });
  let reduction: CourseUnlockReductionResult;
  try {
    reduction = reduceAuthorizedCourseUnlock({
      walletState,
      courseUnlockState: courseState,
      authorizedRequest,
      lookup: {
        currentAccountGeneration: root.currentGeneration,
        ...ledger,
      },
    });
  } catch {
    return indeterminate();
  }
  if (reduction.status === "insufficient_balance") {
    return deepFreeze({
      status: "insufficient_balance" as const,
      requiredSubunits: reduction.requiredSubunits,
      currentBalanceSubunits: reduction.currentBalanceSubunits,
      root,
      walletState,
      courseUnlockState: courseState,
    });
  }
  if (!reduction.ledgerWriteRequired) {
    if (
      reduction.walletState.stateFingerprint !== walletState.stateFingerprint ||
      reduction.courseUnlockState.stateFingerprint !== courseState.stateFingerprint
    ) {
      return indeterminate();
    }
    return deepFreeze({
      status: "replayed" as const,
      appliedReceipt: reduction.appliedReceipt,
      root,
      walletState,
      courseUnlockState: courseState,
    });
  }
  if (ledger.operationLedgerEntry || ledger.subjectLedgerEntry) {
    return indeterminate();
  }
  const walletAfter = materializeOwnerRepositoryWalletStateBlob(
    reduction.walletState,
  );
  const courseAfter = materializeOwnerRepositoryCourseUnlockStateBlob(
    reduction.courseUnlockState,
  );
  if (!same(walletAfter.state, reduction.walletState)) return indeterminate();
  const nextCourseEntry = deepFreeze({
    schemaVersion: "learning-v2-owner-repository-course-entry.v1" as const,
    courseIdentityFingerprint:
      reduction.courseUnlockState.courseIdentityFingerprint,
    stateRef: courseAfter.blob.ref,
  });
  const coursePlan = await planOwnerRepositoryCourseStateMutation({
    accountScopeHash,
    manifest: courseManifest,
    expectedEntry: courseEntry ?? null,
    nextEntry: nextCourseEntry,
    resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
  });
  if (!coursePlan.changed) return indeterminate();
  const record = createOwnerRepositoryCourseUnlockEffectRecordV2({
    accountScopeHash,
    journalSequence: root.journalSequence + 1,
    repositoryRevisionBefore: root.repositoryRevision,
    rootBeforeFingerprint: root.rootFingerprint,
    previousJournalRecordRef: root.journalHeadRef,
    walletStateBeforeRef: walletStateBlob.ref,
    walletStateAfterRef: walletAfter.blob.ref,
    courseStateBeforeRef: courseStateBeforeBlob
      ? {
          schemaVersion: "learning-v2-owner-repository-course-ref.v1",
          courseIdentityFingerprint: courseState.courseIdentityFingerprint,
          stateRef: courseStateBeforeBlob.blob.ref,
        }
      : null,
    courseStateAfterRef: {
      schemaVersion: "learning-v2-owner-repository-course-ref.v1",
      courseIdentityFingerprint:
        reduction.courseUnlockState.courseIdentityFingerprint,
      stateRef: courseAfter.blob.ref,
    },
    courseStateManifestBeforeRef: root.courseStateManifestRef,
    courseStateManifestAfterRef: coursePlan.manifestBlob.ref,
    operationIndexManifestBeforeRef: root.operationIndexManifestRef,
    subjectIndexManifestBeforeRef: root.subjectIndexManifestRef,
    receiptIndexManifestBeforeRef: root.receiptIndexManifestRef,
    appliedReceipt: reduction.appliedReceipt,
  });
  const journalRecordBlob =
    materializeOwnerRepositoryCourseUnlockEffectRecordBlobV2(record);
  const economicClosure =
    await planOwnerRepositoryCourseUnlockEconomicClosureV2({
      accountScopeHash,
      operationManifest: manifests.operation,
      subjectManifest: manifests.subject,
      receiptManifest: manifests.receipt,
      journalRecordBlob,
      resolveNode: request.resolveNode as OwnerRepositoryRadixNodeResolver,
    });
  if (!economicClosure.changed) return indeterminate();
  const successorInput = {
    journalRecordBlob,
    operationIndexManifestAfterRef:
      economicClosure.operationManifestBlob.ref,
    subjectIndexManifestAfterRef:
      economicClosure.subjectManifestBlob.ref,
    receiptIndexManifestAfterRef:
      economicClosure.receiptManifestBlob.ref,
  };
  const successorRoot = root.schemaVersion ===
    "learning-v2-owner-repository-root.v3"
    ? bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3({
        rootBefore: root,
        ...successorInput,
        promotedCheckpointAnchor: hasPromotedCheckpointAnchor
          ? request.promotedCheckpointAnchor
          : null,
      })
    : bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3FromV2({
        adoptionBase: request.adoptionBase,
        ...successorInput,
      });
  const immutableBlobs = uniqueBlobs([
    ...(walletAfter.blob.ref.blobKey === walletStateBlob.ref.blobKey
      ? []
      : [walletAfter.blob]),
    courseAfter.blob,
    coursePlan.manifestBlob,
    ...coursePlan.immutableNodeBlobs,
    journalRecordBlob,
    economicClosure.operationManifestBlob,
    economicClosure.subjectManifestBlob,
    economicClosure.receiptManifestBlob,
    ...economicClosure.immutableNodeBlobs,
  ] as readonly (
    | OwnerRepositoryCourseUnlockPlanImmutableBlob
    | OwnerRepositoryRadixBlob
  )[]);
  return deepFreeze({
    status: "planned" as const,
    appliedReceipt: reduction.appliedReceipt,
    rootBefore: root,
    successorRoot,
    walletStateAfterBlob: walletAfter.blob,
    courseStateAfterBlob: courseAfter.blob,
    courseManifestAfterBlob: coursePlan.manifestBlob,
    journalRecordBlob,
    economicClosure,
    immutableBlobs,
  });
};

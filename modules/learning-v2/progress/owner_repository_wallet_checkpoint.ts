import { detachBoundedWalletJson } from "../contracts/wallet";
import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import type { OwnerRepositoryBlobRefV1, OwnerRepositoryRootV1 } from "./owner_repository";
import {
  parseOwnerRepositoryCourseManifestBlob,
  type OwnerRepositoryCourseManifestBlob,
} from "./owner_repository_course_manifest";
import {
  parseOwnerRepositoryEconomicManifestBlob,
  type OwnerRepositoryEconomicManifestBlob,
} from "./owner_repository_economic_manifest";
import type {
  OwnerRepositoryRadixNodeRefV1,
  OwnerRepositoryRadixNodeResolver,
} from "./owner_repository_radix";
import {
  isOwnerRepositoryWalletCreditPageFoldResult,
  type OwnerRepositoryWalletCreditPageFoldResult,
} from "./owner_repository_wallet_credit_page";
import {
  bindOwnerRepositoryWalletCreditSuccessorRootV2,
  parseOwnerRepositoryJournalRecordBlob,
} from "./owner_repository_root_fold";
import {
  advanceOwnerRepositoryRootV2Generation,
  migrateVerifiedGenesisOwnerRepositoryRootV1,
  parseOwnerRepositoryRootV2,
  parseOwnerRepositoryRootV2Raw,
  type OwnerRepositoryRootV2,
  type OwnerRepositoryRootV2Materialization,
} from "./owner_repository_root_v2";
import {
  parseOwnerRepositoryWalletStateBlob,
  type OwnerRepositoryWalletStateBlobV1,
} from "./owner_repository_wallet_blob";

export const OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL = 16;

export interface OwnerRepositoryWalletCheckpointV1 {
  readonly schemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v1";
  readonly checkpointKind: "wallet_credit_only";
  readonly bootstrapOrigin: "fresh_v2_genesis" | "verified_v1_genesis_migration" | null;
  readonly accountScopeHash: string;
  readonly checkpointRootFingerprint: string;
  readonly currentGeneration: number;
  readonly repositoryRevision: number;
  readonly journalSequence: number;
  readonly previousRootFingerprint: string | null;
  readonly journalHeadRef: OwnerRepositoryBlobRefV1 | null;
  readonly walletStateRef: OwnerRepositoryBlobRefV1;
  readonly courseStateManifestRef: OwnerRepositoryBlobRefV1;
  readonly operationIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly subjectIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly receiptIndexManifestRef: OwnerRepositoryBlobRefV1;
  readonly walletStateFingerprint: string;
  readonly walletRevision: number;
  readonly canonicalEffectCount: number;
  readonly operationEntryCount: number;
  readonly subjectEntryCount: number;
  readonly receiptEntryCount: number;
  readonly pageStartingRootFingerprint: string;
  readonly pageStartingRepositoryRevision: number;
  readonly pageStartingJournalSequence: number;
  readonly previousCheckpointRootFingerprint: string | null;
  readonly previousCheckpointFingerprint: string | null;
  readonly walletCreditTransitions: number;
  readonly generationRolloverTransitions: number;
  readonly rootTransitions: number;
  readonly pageAccumulatorFingerprint: string;
  readonly checkpointFingerprint: string;
}

export interface OwnerRepositoryWalletCheckpointMaterialization {
  readonly checkpoint: OwnerRepositoryWalletCheckpointV1;
  readonly key: string;
  readonly encoded: string;
}

export interface OwnerRepositoryWalletCheckpointAccumulator {
  readonly startingRoot: OwnerRepositoryRootV2Materialization;
  readonly endingRoot: OwnerRepositoryRootV2Materialization;
  readonly previousCheckpoint: OwnerRepositoryWalletCheckpointMaterialization | null;
  readonly bootstrapOrigin: "fresh_v2_genesis" | "verified_v1_genesis_migration" | null;
  readonly walletCreditTransitions: number;
  readonly generationRolloverTransitions: number;
  readonly rootTransitions: number;
  readonly pageAccumulatorFingerprint: string;
  readonly closedByGenerationRollover: boolean;
}

const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const MAX_BYTES = 64 * 1024;
const CHECKPOINT_KEYS = [
  "schemaVersion", "checkpointKind", "bootstrapOrigin", "accountScopeHash", "checkpointRootFingerprint",
  "currentGeneration", "repositoryRevision", "journalSequence", "previousRootFingerprint",
  "journalHeadRef", "walletStateRef", "courseStateManifestRef", "operationIndexManifestRef",
  "subjectIndexManifestRef", "receiptIndexManifestRef", "walletStateFingerprint",
  "walletRevision", "canonicalEffectCount", "operationEntryCount", "subjectEntryCount",
  "receiptEntryCount", "pageStartingRootFingerprint", "pageStartingRepositoryRevision",
  "pageStartingJournalSequence", "previousCheckpointRootFingerprint",
  "previousCheckpointFingerprint", "walletCreditTransitions", "generationRolloverTransitions",
  "rootTransitions", "pageAccumulatorFingerprint", "checkpointFingerprint",
] as const;
const ACCUMULATORS = new WeakSet<object>();
const CHECKPOINTS = new WeakSet<object>();
const LOCALLY_MATERIALIZED_CHECKPOINTS = new WeakSet<object>();
const PROJECTION_MATCHED_CHECKPOINTS = new WeakSet<object>();
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (): never => { throw new Error("owner_repository_wallet_checkpoint_invalid"); };
const indeterminate = (): never => {
  throw new Error("owner_repository_wallet_checkpoint_indeterminate");
};
const mismatch = (): never => { throw new Error("owner_repository_wallet_checkpoint_mismatch"); };
const overflow = (): never => { throw new Error("owner_repository_wallet_checkpoint_overflow"); };
const safe = (value: unknown): value is number =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const same = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const readRecord = (
  input: unknown,
  requiredKeys: readonly string[],
  optionalKeys: readonly string[] = [],
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string") ||
    requiredKeys.some((key) => !Object.prototype.hasOwnProperty.call(descriptors, key)) ||
    keys.some((key) => typeof key !== "string" ||
      (!requiredKeys.includes(key) && !optionalKeys.includes(key)))) return invalid();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys as string[]) {
    const descriptor = descriptors[key];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return invalid();
    result[key] = descriptor.value;
  }
  return result;
};
const denseArray = (input: unknown, maximum: number): readonly unknown[] => {
  if (!Array.isArray(input) || Object.getPrototypeOf(input) !== Array.prototype ||
    input.length > maximum) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const keys = Reflect.ownKeys(descriptors);
  if (keys.some((key) => typeof key !== "string") || keys.length !== input.length + 1 ||
    !Object.prototype.hasOwnProperty.call(descriptors, "length")) return invalid();
  const values: unknown[] = [];
  for (let index = 0; index < input.length; index += 1) {
    const descriptor = descriptors[String(index)];
    if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) return invalid();
    values.push(descriptor.value);
  }
  return values;
};
const checkedAdd = (left: number, right: number): number => {
  const value = left + right;
  if (!safe(value)) return overflow();
  return value;
};
const checkedDouble = (value: number): number => {
  if (!safe(value) || value > Math.floor(Number.MAX_SAFE_INTEGER / 2)) return overflow();
  return value * 2;
};
const parseRootMaterialization = (input: unknown): OwnerRepositoryRootV2Materialization => {
  const value = readRecord(input, ["root", "encoded"]);
  if (typeof value.encoded !== "string") return invalid();
  let detached: unknown;
  try { detached = detachBoundedWalletJson(value.root, "owner_repository_wallet_checkpoint_invalid"); }
  catch { return invalid(); }
  if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") return invalid();
  let parsed: OwnerRepositoryRootV2Materialization;
  try { parsed = parseOwnerRepositoryRootV2(detached, detached.accountScopeHash); }
  catch { return invalid(); }
  if (parsed.encoded !== value.encoded) return invalid();
  return parsed;
};
const hashBody = (body: unknown): string => sha256Utf8(canonicalJsonV1(body));

export const ownerRepositoryWalletCheckpointKey = (
  accountScopeHash: string,
  checkpointRootFingerprint: string,
): string => {
  if (typeof accountScopeHash !== "string" || !ACCOUNT.test(accountScopeHash) ||
    typeof checkpointRootFingerprint !== "string" || !HASH.test(checkpointRootFingerprint)) {
    return invalid();
  }
  return `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${checkpointRootFingerprint}`;
};

const accumulatorSeed = (
  root: OwnerRepositoryRootV2,
  previous: OwnerRepositoryWalletCheckpointMaterialization | null,
  bootstrapOrigin: OwnerRepositoryWalletCheckpointAccumulator["bootstrapOrigin"],
): string => hashBody({
  schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-page-seed.v1",
  accountScopeHash: root.accountScopeHash,
  pageStartingRootFingerprint: root.rootFingerprint,
  previousCheckpointRootFingerprint: previous?.checkpoint.checkpointRootFingerprint ?? null,
  previousCheckpointFingerprint: previous?.checkpoint.checkpointFingerprint ?? null,
  bootstrapOrigin,
});

const freezeAccumulator = (
  value: OwnerRepositoryWalletCheckpointAccumulator,
): OwnerRepositoryWalletCheckpointAccumulator => {
  const frozen = deepFreeze(value);
  ACCUMULATORS.add(frozen as object);
  return frozen;
};

/**
 * Starts deterministic checkpoint induction from a repository-verified RootV2. A self-hashed
 * root/checkpoint is not authentication; the caller must already have verified storage ancestry.
 */
export const createOwnerRepositoryWalletCheckpointAccumulator = (
  input: unknown,
): OwnerRepositoryWalletCheckpointAccumulator => {
  const request = readRecord(input, ["startingRoot", "previousCheckpoint"]);
  const startingRoot = parseRootMaterialization(request.startingRoot);
  let previous: OwnerRepositoryWalletCheckpointMaterialization | null = null;
  if (request.previousCheckpoint === null) {
    if (startingRoot.root.journalSequence !== 0 || startingRoot.root.journalHeadRef !== null ||
      startingRoot.root.repositoryRevision !== 0 ||
      startingRoot.root.previousRootFingerprint !== null) {
      return invalid();
    }
  } else {
    if (!isRecord(request.previousCheckpoint) ||
      !PROJECTION_MATCHED_CHECKPOINTS.has(request.previousCheckpoint)) {
      return invalid();
    }
    previous = request.previousCheckpoint as unknown as OwnerRepositoryWalletCheckpointMaterialization;
    if (previous.checkpoint.accountScopeHash !== startingRoot.root.accountScopeHash ||
      previous.checkpoint.checkpointRootFingerprint !== startingRoot.root.rootFingerprint ||
      previous.checkpoint.repositoryRevision !== startingRoot.root.repositoryRevision ||
      previous.checkpoint.journalSequence !== startingRoot.root.journalSequence ||
      previous.key !== ownerRepositoryWalletCheckpointKey(
        startingRoot.root.accountScopeHash,
        startingRoot.root.rootFingerprint,
      )) return invalid();
  }
  return freezeAccumulator({
    startingRoot,
    endingRoot: startingRoot,
    previousCheckpoint: previous,
    bootstrapOrigin: previous === null ? "fresh_v2_genesis" : null,
    walletCreditTransitions: 0,
    generationRolloverTransitions: 0,
    rootTransitions: 0,
    pageAccumulatorFingerprint: accumulatorSeed(
      startingRoot.root,
      previous,
      previous === null ? "fresh_v2_genesis" : null,
    ),
    closedByGenerationRollover: false,
  });
};

/**
 * `Verified` here means re-derived by the closed V1→V2 migration codec. It is not proof that
 * the migrated root is the durable active root; repository fence/CAS admission remains external.
 */
export const createOwnerRepositoryWalletCheckpointAccumulatorFromVerifiedV1Migration = async (
  input: unknown,
): Promise<OwnerRepositoryWalletCheckpointAccumulator> => {
  const request = readRecord(input, [
    "rootV1", "targetGeneration", "emptyCourseStateManifestBlob", "resolveCourseNode",
    "migratedRoot",
  ]);
  if (typeof request.resolveCourseNode !== "function") return invalid();
  const migratedRoot = parseRootMaterialization(request.migratedRoot);
  let expected: OwnerRepositoryRootV2Materialization;
  try {
    expected = await migrateVerifiedGenesisOwnerRepositoryRootV1({
      rootV1: request.rootV1 as OwnerRepositoryRootV1,
      targetGeneration: request.targetGeneration as number,
      emptyCourseStateManifestBlob: request.emptyCourseStateManifestBlob as OwnerRepositoryCourseManifestBlob,
      resolveCourseNode: request.resolveCourseNode as OwnerRepositoryRadixNodeResolver,
    });
  } catch { return invalid(); }
  if (!same(expected, migratedRoot)) return mismatch();
  return freezeAccumulator({
    startingRoot: migratedRoot,
    endingRoot: migratedRoot,
    previousCheckpoint: null,
    bootstrapOrigin: "verified_v1_genesis_migration",
    walletCreditTransitions: 0,
    generationRolloverTransitions: 0,
    rootTransitions: 0,
    pageAccumulatorFingerprint: accumulatorSeed(
      migratedRoot.root,
      null,
      "verified_v1_genesis_migration",
    ),
    closedByGenerationRollover: false,
  });
};

export const appendOwnerRepositoryWalletCreditCheckpointPage = (
  input: unknown,
): OwnerRepositoryWalletCheckpointAccumulator => {
  const request = readRecord(input, ["accumulator", "page"]);
  if (!isRecord(request.accumulator) || !ACCUMULATORS.has(request.accumulator) ||
    (request.accumulator as unknown as OwnerRepositoryWalletCheckpointAccumulator)
      .closedByGenerationRollover ||
    !isOwnerRepositoryWalletCreditPageFoldResult(request.page)) return invalid();
  const accumulator = request.accumulator as unknown as OwnerRepositoryWalletCheckpointAccumulator;
  const page = request.page as OwnerRepositoryWalletCreditPageFoldResult;
  const pageStart = parseRootMaterialization(page.startingRoot);
  if (!same(pageStart, accumulator.endingRoot)) return mismatch();
  const transitions = denseArray(
    page.transitions,
    OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL - accumulator.rootTransitions,
  );
  if (transitions.length < 1 ||
    checkedAdd(accumulator.rootTransitions, transitions.length) >
      OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL) return invalid();
  let current = accumulator.endingRoot;
  let fingerprint = accumulator.pageAccumulatorFingerprint;
  for (const candidate of transitions) {
    const transition = readRecord(candidate, [
      "status", "appliedReceipt", "authorizedOperation", "journalRecord", "journalRecordBlob",
      "walletStateAfterBlob", "successorRoot", "immutableBlobs",
    ]);
    if (transition.status !== "applied") return invalid();
    const suppliedBlob = readRecord(transition.journalRecordBlob, ["ref", "encoded"]);
    let parsedBlob: ReturnType<typeof parseOwnerRepositoryJournalRecordBlob>;
    let successor: OwnerRepositoryRootV2Materialization;
    try {
      parsedBlob = parseOwnerRepositoryJournalRecordBlob({
        accountScopeHash: current.root.accountScopeHash,
        ref: suppliedBlob.ref,
        raw: suppliedBlob.encoded,
      });
      successor = bindOwnerRepositoryWalletCreditSuccessorRootV2({
        rootBefore: current.root,
        journalRecordBlob: { ref: suppliedBlob.ref, encoded: suppliedBlob.encoded },
      });
    } catch { return invalid(); }
    const suppliedSuccessor = parseRootMaterialization(transition.successorRoot);
    let detachedRecord: unknown;
    try {
      detachedRecord = detachBoundedWalletJson(
        transition.journalRecord,
        "owner_repository_wallet_checkpoint_invalid",
      );
    } catch { return invalid(); }
    if (parsedBlob.record.recordKind !== "wallet_credit" ||
      !same(parsedBlob.record, detachedRecord) ||
      !same(successor, suppliedSuccessor) ||
      current.root.currentGeneration !== successor.root.currentGeneration ||
      !same(current.root.courseStateManifestRef, successor.root.courseStateManifestRef)) {
      return mismatch();
    }
    fingerprint = hashBody({
      schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-step.v1",
      previousAccumulatorFingerprint: fingerprint,
      transitionKind: "wallet_credit",
      rootBeforeFingerprint: current.root.rootFingerprint,
      rootAfterFingerprint: successor.root.rootFingerprint,
      repositoryRevisionBefore: current.root.repositoryRevision,
      repositoryRevisionAfter: successor.root.repositoryRevision,
      journalSequenceBefore: current.root.journalSequence,
      journalSequenceAfter: successor.root.journalSequence,
      journalRecordFingerprint: parsedBlob.record.journalRecordFingerprint,
      journalRecordBlobFingerprint: parsedBlob.blob.ref.blobFingerprint,
    });
    current = successor;
  }
  const pageEnd = parseRootMaterialization(page.endingRoot);
  const endingWallet = readRecord(page.endingWalletStateBlob, ["ref", "encoded"]);
  const endingOperation = readRecord(page.endingOperationManifestBlob, ["ref", "encoded"]);
  const endingSubject = readRecord(page.endingSubjectManifestBlob, ["ref", "encoded"]);
  const endingReceipt = readRecord(page.endingReceiptManifestBlob, ["ref", "encoded"]);
  if (!same(current, pageEnd) || !same(endingWallet.ref, current.root.walletStateRef) ||
    !same(endingOperation.ref, current.root.operationIndexManifestRef) ||
    !same(endingSubject.ref, current.root.subjectIndexManifestRef) ||
    !same(endingReceipt.ref, current.root.receiptIndexManifestRef)) return mismatch();
  return freezeAccumulator({
    ...accumulator,
    endingRoot: current,
    walletCreditTransitions: checkedAdd(accumulator.walletCreditTransitions, transitions.length),
    rootTransitions: checkedAdd(accumulator.rootTransitions, transitions.length),
    pageAccumulatorFingerprint: fingerprint,
  });
};

export const appendOwnerRepositoryWalletGenerationRolloverCheckpointTransition = (
  input: unknown,
): OwnerRepositoryWalletCheckpointAccumulator => {
  const request = readRecord(input, ["accumulator", "successorRoot"]);
  if (!isRecord(request.accumulator) || !ACCUMULATORS.has(request.accumulator)) return invalid();
  const accumulator = request.accumulator as unknown as OwnerRepositoryWalletCheckpointAccumulator;
  if (accumulator.closedByGenerationRollover || accumulator.generationRolloverTransitions !== 0 ||
    accumulator.rootTransitions >= OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL) return invalid();
  const successor = parseRootMaterialization(request.successorRoot);
  let expected: OwnerRepositoryRootV2Materialization;
  try {
    expected = advanceOwnerRepositoryRootV2Generation({
      root: accumulator.endingRoot.root,
      targetGeneration: successor.root.currentGeneration,
    });
  } catch { return invalid(); }
  if (!same(expected, successor)) return mismatch();
  const before = accumulator.endingRoot.root;
  const after = successor.root;
  const fingerprint = hashBody({
    schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-step.v1",
    previousAccumulatorFingerprint: accumulator.pageAccumulatorFingerprint,
    transitionKind: "generation_rollover",
    rootBeforeFingerprint: before.rootFingerprint,
    rootAfterFingerprint: after.rootFingerprint,
    repositoryRevisionBefore: before.repositoryRevision,
    repositoryRevisionAfter: after.repositoryRevision,
    generationBefore: before.currentGeneration,
    generationAfter: after.currentGeneration,
    journalSequence: before.journalSequence,
    journalHeadRef: before.journalHeadRef,
    walletStateRef: before.walletStateRef,
    courseStateManifestRef: before.courseStateManifestRef,
    operationIndexManifestRef: before.operationIndexManifestRef,
    subjectIndexManifestRef: before.subjectIndexManifestRef,
    receiptIndexManifestRef: before.receiptIndexManifestRef,
  });
  return freezeAccumulator({
    ...accumulator,
    endingRoot: successor,
    generationRolloverTransitions: 1,
    rootTransitions: checkedAdd(accumulator.rootTransitions, 1),
    pageAccumulatorFingerprint: fingerprint,
    closedByGenerationRollover: true,
  });
};

const materializeBody = (
  body: Omit<OwnerRepositoryWalletCheckpointV1, "checkpointFingerprint">,
): OwnerRepositoryWalletCheckpointMaterialization => {
  let encoded: string;
  const checkpoint = deepFreeze({ ...body, checkpointFingerprint: hashBody(body) });
  try { encoded = canonicalJsonV1(checkpoint); }
  catch { return invalid(); }
  if (utf8ByteLengthV1(encoded) > MAX_BYTES) return overflow();
  return deepFreeze({
    checkpoint,
    key: ownerRepositoryWalletCheckpointKey(
      checkpoint.accountScopeHash,
      checkpoint.checkpointRootFingerprint,
    ),
    encoded,
  });
};

/**
 * Materializes a structural checkpoint candidate. Before persistence or reuse as a previous
 * checkpoint it must pass `matchOwnerRepositoryWalletCheckpointProjection`.
 */
export const materializeOwnerRepositoryWalletCheckpoint = (
  input: unknown,
): OwnerRepositoryWalletCheckpointMaterialization => {
  const request = readRecord(input, ["accumulator", "endingWalletStateBlob"]);
  if (!isRecord(request.accumulator) || !ACCUMULATORS.has(request.accumulator)) return invalid();
  const accumulator = request.accumulator as unknown as OwnerRepositoryWalletCheckpointAccumulator;
  if (accumulator.previousCheckpoint === null) {
    const freshBootstrap = accumulator.bootstrapOrigin === "fresh_v2_genesis" &&
      accumulator.rootTransitions === 0 &&
      accumulator.endingRoot.root.journalSequence === 0 &&
      accumulator.endingRoot.root.repositoryRevision === 0 &&
      accumulator.endingRoot.root.previousRootFingerprint === null;
    const verifiedMigration = accumulator.bootstrapOrigin === "verified_v1_genesis_migration" &&
      accumulator.rootTransitions === 0 && accumulator.endingRoot.root.journalSequence === 0 &&
      accumulator.endingRoot.root.repositoryRevision === 1 &&
      accumulator.endingRoot.root.previousRootFingerprint !== null;
    if (!freshBootstrap && !verifiedMigration) return invalid();
  } else if (accumulator.rootTransitions !== OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL &&
    !accumulator.closedByGenerationRollover) return invalid();
  const suppliedWallet = readRecord(request.endingWalletStateBlob, ["ref", "encoded"]);
  let wallet: ReturnType<typeof parseOwnerRepositoryWalletStateBlob>;
  try {
    wallet = parseOwnerRepositoryWalletStateBlob({
      accountScopeHash: accumulator.endingRoot.root.accountScopeHash,
      ref: suppliedWallet.ref,
      raw: suppliedWallet.encoded,
    });
  } catch { return invalid(); }
  const root = accumulator.endingRoot.root;
  if (!same(wallet.blob.ref, root.walletStateRef) || wallet.state.revision !== root.journalSequence) {
    return mismatch();
  }
  const canonicalEffectCount = root.journalSequence;
  const created = materializeBody({
    schemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v1",
    checkpointKind: "wallet_credit_only",
    bootstrapOrigin: accumulator.bootstrapOrigin,
    accountScopeHash: root.accountScopeHash,
    checkpointRootFingerprint: root.rootFingerprint,
    currentGeneration: root.currentGeneration,
    repositoryRevision: root.repositoryRevision,
    journalSequence: root.journalSequence,
    previousRootFingerprint: root.previousRootFingerprint,
    journalHeadRef: root.journalHeadRef,
    walletStateRef: root.walletStateRef,
    courseStateManifestRef: root.courseStateManifestRef,
    operationIndexManifestRef: root.operationIndexManifestRef,
    subjectIndexManifestRef: root.subjectIndexManifestRef,
    receiptIndexManifestRef: root.receiptIndexManifestRef,
    walletStateFingerprint: wallet.state.stateFingerprint,
    walletRevision: wallet.state.revision,
    canonicalEffectCount,
    operationEntryCount: checkedDouble(canonicalEffectCount),
    subjectEntryCount: canonicalEffectCount,
    receiptEntryCount: canonicalEffectCount,
    pageStartingRootFingerprint: accumulator.startingRoot.root.rootFingerprint,
    pageStartingRepositoryRevision: accumulator.startingRoot.root.repositoryRevision,
    pageStartingJournalSequence: accumulator.startingRoot.root.journalSequence,
    previousCheckpointRootFingerprint:
      accumulator.previousCheckpoint?.checkpoint.checkpointRootFingerprint ?? null,
    previousCheckpointFingerprint:
      accumulator.previousCheckpoint?.checkpoint.checkpointFingerprint ?? null,
    walletCreditTransitions: accumulator.walletCreditTransitions,
    generationRolloverTransitions: accumulator.generationRolloverTransitions,
    rootTransitions: accumulator.rootTransitions,
    pageAccumulatorFingerprint: accumulator.pageAccumulatorFingerprint,
  });
  const parsed = parseOwnerRepositoryWalletCheckpoint({
    accountScopeHash: root.accountScopeHash,
    checkpointRoot: root,
    key: created.key,
    raw: created.encoded,
    walletStateBlob: { ref: suppliedWallet.ref, encoded: suppliedWallet.encoded },
  });
  LOCALLY_MATERIALIZED_CHECKPOINTS.add(parsed);
  return parsed;
};

/**
 * Matches the structural checkpoint candidate to the exact repository-verified projection
 * blobs. Radix parsing here validates canonical roots/counts, not the deferred lifetime audit.
 * A checkpoint parsed from storage is therefore not admitted as a previous authority by this
 * function; the later repository window verifier must provide that durable admission boundary.
 */
export const matchOwnerRepositoryWalletCheckpointProjection = async (
  input: unknown,
): Promise<OwnerRepositoryWalletCheckpointMaterialization> => {
  const request = readRecord(input, [
    "checkpoint", "checkpointRoot", "walletStateBlob", "courseManifestBlob",
    "operationManifestBlob", "subjectManifestBlob", "receiptManifestBlob", "resolveNode",
  ]);
  if (!isRecord(request.checkpoint) || !CHECKPOINTS.has(request.checkpoint) ||
    typeof request.resolveNode !== "function") return invalid();
  const checkpoint = request.checkpoint as unknown as OwnerRepositoryWalletCheckpointMaterialization;
  let detachedRoot: unknown;
  let root: OwnerRepositoryRootV2;
  try {
    detachedRoot = detachBoundedWalletJson(
      request.checkpointRoot,
      "owner_repository_wallet_checkpoint_invalid",
    );
    if (!isRecord(detachedRoot) || typeof detachedRoot.accountScopeHash !== "string") return invalid();
    root = parseOwnerRepositoryRootV2(detachedRoot, detachedRoot.accountScopeHash).root;
  } catch { return invalid(); }
  if (root.rootFingerprint !== checkpoint.checkpoint.checkpointRootFingerprint) return mismatch();
  const walletBlob = readRecord(request.walletStateBlob, ["ref", "encoded"]);
  const courseBlob = readRecord(request.courseManifestBlob, ["ref", "encoded"]);
  const operationBlob = readRecord(request.operationManifestBlob, ["ref", "encoded"]);
  const subjectBlob = readRecord(request.subjectManifestBlob, ["ref", "encoded"]);
  const receiptBlob = readRecord(request.receiptManifestBlob, ["ref", "encoded"]);
  const externalCache = new Map<string, unknown>();
  let externalReads = 0;
  let externalBytes = 0;
  const resolveNode: OwnerRepositoryRadixNodeResolver = async (ref: OwnerRepositoryRadixNodeRefV1) => {
    if (externalCache.has(ref.blobKey)) return externalCache.get(ref.blobKey);
    if (externalReads >= 64) return overflow();
    let raw: unknown;
    try { raw = await (request.resolveNode as OwnerRepositoryRadixNodeResolver)(ref); }
    catch { return indeterminate(); }
    externalReads += 1;
    if (typeof raw === "string") {
      try { externalBytes = checkedAdd(externalBytes, utf8ByteLengthV1(raw)); }
      catch { return overflow(); }
      if (externalBytes > 64 * 1024 * 1024) return overflow();
    }
    externalCache.set(ref.blobKey, raw);
    return raw;
  };
  let wallet: ReturnType<typeof parseOwnerRepositoryWalletStateBlob>;
  let course: Awaited<ReturnType<typeof parseOwnerRepositoryCourseManifestBlob>>;
  let operation: Awaited<ReturnType<typeof parseOwnerRepositoryEconomicManifestBlob<"operation">>>;
  let subject: Awaited<ReturnType<typeof parseOwnerRepositoryEconomicManifestBlob<"subject">>>;
  let receipt: Awaited<ReturnType<typeof parseOwnerRepositoryEconomicManifestBlob<"receipt">>>;
  try {
    wallet = parseOwnerRepositoryWalletStateBlob({
      accountScopeHash: root.accountScopeHash,
      ref: walletBlob.ref,
      raw: walletBlob.encoded,
    });
    course = await parseOwnerRepositoryCourseManifestBlob({
      accountScopeHash: root.accountScopeHash,
      ref: courseBlob.ref as OwnerRepositoryCourseManifestBlob["ref"],
      raw: courseBlob.encoded,
      resolveNode,
    });
    operation = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: root.accountScopeHash,
      indexKind: "operation",
      ref: operationBlob.ref as OwnerRepositoryEconomicManifestBlob<"operation">["ref"],
      raw: operationBlob.encoded,
      resolveNode,
    });
    subject = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: root.accountScopeHash,
      indexKind: "subject",
      ref: subjectBlob.ref as OwnerRepositoryEconomicManifestBlob<"subject">["ref"],
      raw: subjectBlob.encoded,
      resolveNode,
    });
    receipt = await parseOwnerRepositoryEconomicManifestBlob({
      accountScopeHash: root.accountScopeHash,
      indexKind: "receipt",
      ref: receiptBlob.ref as OwnerRepositoryEconomicManifestBlob<"receipt">["ref"],
      raw: receiptBlob.encoded,
      resolveNode,
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("overflow")) throw error;
    return indeterminate();
  }
  const expected = checkpoint.checkpoint;
  if (!same(wallet.blob.ref, root.walletStateRef) ||
    !same(course.manifestBlob.ref, root.courseStateManifestRef) ||
    !same(operation.sourceManifestBlob.ref, root.operationIndexManifestRef) ||
    !same(subject.sourceManifestBlob.ref, root.subjectIndexManifestRef) ||
    !same(receipt.sourceManifestBlob.ref, root.receiptIndexManifestRef) ||
    wallet.state.stateFingerprint !== expected.walletStateFingerprint ||
    wallet.state.revision !== expected.walletRevision || course.manifest.entryCount !== 0 ||
    operation.manifest.entryCount !== expected.operationEntryCount ||
    subject.manifest.entryCount !== expected.subjectEntryCount ||
    receipt.manifest.entryCount !== expected.receiptEntryCount) return mismatch();
  if (LOCALLY_MATERIALIZED_CHECKPOINTS.has(checkpoint)) {
    PROJECTION_MATCHED_CHECKPOINTS.add(checkpoint);
  }
  return checkpoint;
};

/**
 * Structural projection match only. It does not authenticate a checkpoint or recursively audit
 * previous checkpoints, journal records, radix nodes, or the repository CAS lineage.
 */
export const parseOwnerRepositoryWalletCheckpoint = (
  input: unknown,
): OwnerRepositoryWalletCheckpointMaterialization => {
  let request: Readonly<Record<string, unknown>>;
  try {
    request = readRecord(input, [
      "accountScopeHash", "checkpointRoot", "key", "raw", "walletStateBlob",
    ]);
  }
  catch { return indeterminate(); }
  if (typeof request.accountScopeHash !== "string" || !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.key !== "string" || typeof request.raw !== "string") return indeterminate();
  let detachedRoot: unknown;
  let root: OwnerRepositoryRootV2;
  let wallet: ReturnType<typeof parseOwnerRepositoryWalletStateBlob>;
  try {
    detachedRoot = detachBoundedWalletJson(
      request.checkpointRoot,
      "owner_repository_wallet_checkpoint_indeterminate",
    );
    if (!isRecord(detachedRoot) || typeof detachedRoot.accountScopeHash !== "string") {
      return indeterminate();
    }
    root = parseOwnerRepositoryRootV2(detachedRoot, request.accountScopeHash).root;
    const suppliedWallet = readRecord(request.walletStateBlob, ["ref", "encoded"]);
    wallet = parseOwnerRepositoryWalletStateBlob({
      accountScopeHash: request.accountScopeHash,
      ref: suppliedWallet.ref,
      raw: suppliedWallet.encoded,
    });
  } catch { return indeterminate(); }
  let detached: unknown;
  try {
    if (utf8ByteLengthV1(request.raw) > MAX_BYTES) return indeterminate();
    detached = detachBoundedWalletJson(
      JSON.parse(request.raw),
      "owner_repository_wallet_checkpoint_indeterminate",
    );
    if (canonicalJsonV1(detached) !== request.raw) return indeterminate();
  } catch { return indeterminate(); }
  if (!isRecord(detached) || Reflect.ownKeys(detached).length !== CHECKPOINT_KEYS.length ||
    !Reflect.ownKeys(detached).every((key) => typeof key === "string" &&
      (CHECKPOINT_KEYS as readonly string[]).includes(key)) ||
    detached.schemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" ||
    detached.checkpointKind !== "wallet_credit_only" ||
    ![null, "fresh_v2_genesis", "verified_v1_genesis_migration"].includes(
      detached.bootstrapOrigin as null | string,
    ) ||
    detached.accountScopeHash !== request.accountScopeHash ||
    typeof detached.checkpointRootFingerprint !== "string" ||
    !HASH.test(detached.checkpointRootFingerprint) ||
    typeof detached.walletStateFingerprint !== "string" || !HASH.test(detached.walletStateFingerprint) ||
    typeof detached.pageStartingRootFingerprint !== "string" ||
    !HASH.test(detached.pageStartingRootFingerprint) ||
    typeof detached.pageAccumulatorFingerprint !== "string" ||
    !HASH.test(detached.pageAccumulatorFingerprint) ||
    typeof detached.checkpointFingerprint !== "string" || !HASH.test(detached.checkpointFingerprint)) {
    return indeterminate();
  }
  const numericKeys = [
    "currentGeneration", "repositoryRevision", "journalSequence", "walletRevision",
    "canonicalEffectCount", "operationEntryCount", "subjectEntryCount", "receiptEntryCount",
    "pageStartingRepositoryRevision", "pageStartingJournalSequence", "walletCreditTransitions",
    "generationRolloverTransitions", "rootTransitions",
  ] as const;
  if (numericKeys.some((key) => !safe(detached[key]))) return indeterminate();
  const previousCheckpointRootFingerprint = detached.previousCheckpointRootFingerprint;
  const previousCheckpointFingerprint = detached.previousCheckpointFingerprint;
  if ((previousCheckpointRootFingerprint === null) !== (previousCheckpointFingerprint === null) ||
    (previousCheckpointRootFingerprint !== null &&
      (typeof previousCheckpointRootFingerprint !== "string" ||
        !HASH.test(previousCheckpointRootFingerprint))) ||
    (previousCheckpointFingerprint !== null &&
      (typeof previousCheckpointFingerprint !== "string" || !HASH.test(previousCheckpointFingerprint)))) {
    return indeterminate();
  }
  const rootTransitions = Number(detached.rootTransitions);
  const credits = Number(detached.walletCreditTransitions);
  const rollovers = Number(detached.generationRolloverTransitions);
  const sequence = Number(detached.journalSequence);
  const revision = Number(detached.repositoryRevision);
  const startSequence = Number(detached.pageStartingJournalSequence);
  const startRevision = Number(detached.pageStartingRepositoryRevision);
  let operationCount: number;
  try { operationCount = checkedDouble(sequence); }
  catch { return indeterminate(); }
  if (rootTransitions > OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL || rollovers > 1 ||
    credits + rollovers !== rootTransitions || startSequence > sequence || startRevision > revision ||
    sequence - startSequence !== credits || revision - startRevision !== rootTransitions ||
    detached.walletRevision !== sequence || detached.canonicalEffectCount !== sequence ||
    detached.operationEntryCount !== operationCount || detached.subjectEntryCount !== sequence ||
    detached.receiptEntryCount !== sequence) return indeterminate();
  if (previousCheckpointRootFingerprint === null) {
    const freshBootstrap = detached.bootstrapOrigin === "fresh_v2_genesis" &&
      rootTransitions === 0 && credits === 0 && rollovers === 0 &&
      sequence === 0 && detached.pageStartingRootFingerprint === detached.checkpointRootFingerprint &&
      startRevision === revision && startSequence === sequence && revision === 0 &&
      detached.previousRootFingerprint === null;
    const verifiedMigration = detached.bootstrapOrigin === "verified_v1_genesis_migration" &&
      rootTransitions === 0 && credits === 0 && rollovers === 0 && sequence === 0 &&
      detached.pageStartingRootFingerprint === detached.checkpointRootFingerprint &&
      startRevision === revision && startSequence === sequence && revision === 1 &&
      detached.previousRootFingerprint !== null;
    if (!freshBootstrap && !verifiedMigration) return indeterminate();
  } else {
    if (detached.bootstrapOrigin !== null ||
      previousCheckpointRootFingerprint !== detached.pageStartingRootFingerprint ||
      (rootTransitions !== OWNER_REPOSITORY_WALLET_CHECKPOINT_INTERVAL && rollovers !== 1)) {
      return indeterminate();
    }
  }
  const rootMatches =
    detached.checkpointRootFingerprint === root.rootFingerprint &&
    detached.currentGeneration === root.currentGeneration &&
    detached.repositoryRevision === root.repositoryRevision &&
    detached.journalSequence === root.journalSequence &&
    detached.previousRootFingerprint === root.previousRootFingerprint &&
    same(detached.journalHeadRef, root.journalHeadRef) &&
    same(detached.walletStateRef, root.walletStateRef) &&
    same(detached.courseStateManifestRef, root.courseStateManifestRef) &&
    same(detached.operationIndexManifestRef, root.operationIndexManifestRef) &&
    same(detached.subjectIndexManifestRef, root.subjectIndexManifestRef) &&
    same(detached.receiptIndexManifestRef, root.receiptIndexManifestRef);
  if (!rootMatches || !same(wallet.blob.ref, root.walletStateRef) ||
    detached.walletStateFingerprint !== wallet.state.stateFingerprint ||
    detached.walletRevision !== wallet.state.revision ||
    request.key !== ownerRepositoryWalletCheckpointKey(
    request.accountScopeHash,
    root.rootFingerprint,
  )) return mismatch();
  const { checkpointFingerprint, ...body } = detached as unknown as OwnerRepositoryWalletCheckpointV1;
  if (checkpointFingerprint !== hashBody(body)) return indeterminate();
  const checkpoint = deepFreeze(detached as unknown as OwnerRepositoryWalletCheckpointV1);
  const result = deepFreeze({ checkpoint, key: request.key, encoded: request.raw });
  CHECKPOINTS.add(result);
  return result;
};

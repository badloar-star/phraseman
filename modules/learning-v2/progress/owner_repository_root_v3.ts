import { detachBoundedWalletJson } from "../contracts/wallet";
import { canonicalJsonV1, sha256Utf8, utf8ByteLengthV1 } from "../policies/decision_registry";
import type {
  OwnerRepositoryBlobRefV1,
  OwnerRepositoryRootV1,
} from "./owner_repository";
import type { OwnerRepositoryCourseManifestBlob } from "./owner_repository_course_manifest";
import type { OwnerRepositoryRadixNodeResolver } from "./owner_repository_radix";
import {
  parseOwnerRepositoryJournalRecordBlob,
  bindOwnerRepositoryWalletCreditSuccessorRootV2,
  type OwnerRepositoryJournalRecordBlobV1,
} from "./owner_repository_root_fold";
import {
  migrateVerifiedGenesisOwnerRepositoryRootV1,
  parseOwnerRepositoryRootV2,
  type OwnerRepositoryRootV2,
  type OwnerRepositoryRootV2Materialization,
} from "./owner_repository_root_v2";
import type {
  OwnerRepositoryMissingIndexEntryJournalRecordV1,
  OwnerRepositoryOperationAliasJournalRecordV1,
  OwnerRepositoryWalletCreditJournalRecordV1,
} from "./owner_repository_journal";
import {
  parseOwnerRepositoryWalletCheckpoint,
  type OwnerRepositoryWalletCheckpointMaterialization,
} from "./owner_repository_wallet_checkpoint";
import type { OwnerRepositoryWalletStateBlobV1 } from "./owner_repository_wallet_blob";
import {
  parseOwnerRepositoryOperationAliasRecordBlobV2,
  parseOwnerRepositoryWalletCreditEffectRecordBlobV2,
  type OwnerRepositoryOperationAliasRecordBlobV2,
  type OwnerRepositoryOperationAliasRecordV2,
  type OwnerRepositoryWalletCreditEffectRecordBlobV2,
  type OwnerRepositoryWalletCreditEffectRecordV2,
} from "./owner_repository_economic_effect_v2";
import {
  parseOwnerRepositoryCourseUnlockEffectRecordBlobV2,
  type OwnerRepositoryCourseUnlockEffectRecordBlobV2,
  type OwnerRepositoryCourseUnlockEffectRecordV2,
} from "./owner_repository_course_unlock_effect_v2";

export interface OwnerRepositoryWalletCheckpointAnchorV1 {
  readonly schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1";
  readonly checkpointSchemaVersion:
    | "learning-v2-owner-repository-wallet-checkpoint.v1"
    | "learning-v2-owner-repository-wallet-checkpoint.v2"
    | "learning-v2-owner-repository-economic-checkpoint.v3";
  readonly checkpointKind: "wallet_credit_only" | "economic_mixed";
  readonly accountScopeHash: string;
  readonly checkpointKey: string;
  readonly checkpointRootFingerprint: string;
  readonly checkpointFingerprint: string;
  readonly checkpointCurrentGeneration: number;
  readonly checkpointRepositoryRevision: number;
  readonly checkpointJournalSequence: number;
  readonly bootstrapOrigin: "fresh_v2_genesis" | "verified_v1_genesis_migration" | null;
}

export interface OwnerRepositoryRootV3 {
  readonly schemaVersion: "learning-v2-owner-repository-root.v3";
  readonly accountScopeHash: string;
  readonly currentGeneration: number;
  readonly repositoryRevision: number;
  readonly journalSequence: number;
  readonly previousRootFingerprint: string;
  readonly journalHeadRef: OwnerRepositoryRootV2["journalHeadRef"];
  readonly walletStateRef: OwnerRepositoryRootV2["walletStateRef"];
  readonly courseStateManifestRef: OwnerRepositoryRootV2["courseStateManifestRef"];
  readonly operationIndexManifestRef: OwnerRepositoryRootV2["operationIndexManifestRef"];
  readonly subjectIndexManifestRef: OwnerRepositoryRootV2["subjectIndexManifestRef"];
  readonly receiptIndexManifestRef: OwnerRepositoryRootV2["receiptIndexManifestRef"];
  readonly walletCheckpointAnchor: OwnerRepositoryWalletCheckpointAnchorV1;
  readonly walletCheckpointLagRootTransitions: number;
  readonly walletCheckpointPromotionRequired: boolean;
  readonly rootFingerprint: string;
}

export interface OwnerRepositoryRootV3Materialization {
  readonly root: OwnerRepositoryRootV3;
  readonly encoded: string;
  readonly authority: "structural_candidate";
}

export interface OwnerRepositoryWalletCheckpointAnchorCandidateV1 {
  readonly anchor: OwnerRepositoryWalletCheckpointAnchorV1;
  readonly source:
    | "checkpoint_v1_codec"
    | "checkpoint_v2_structural_candidate"
    | "checkpoint_v3_structural_candidate";
  readonly authority: "structural_candidate";
}

/**
 * Nominal future repository authority. This codec intentionally exposes no constructor:
 * only the bounded history-window verifier may admit a structural candidate for CAS.
 */
declare const OWNER_REPOSITORY_ADMITTED_ROOT_V3: unique symbol;
export interface OwnerRepositoryAdmittedRootV3 {
  readonly candidate: OwnerRepositoryRootV3Materialization;
  readonly [OWNER_REPOSITORY_ADMITTED_ROOT_V3]: true;
}
declare const OWNER_REPOSITORY_ADMITTED_CHECKPOINT_ANCHOR: unique symbol;
export interface OwnerRepositoryAdmittedCheckpointAnchorV1 {
  readonly candidate: OwnerRepositoryWalletCheckpointAnchorCandidateV1;
  readonly [OWNER_REPOSITORY_ADMITTED_CHECKPOINT_ANCHOR]: true;
}

export interface OwnerRepositoryRootV3AdoptionBase {
  readonly rootBefore: OwnerRepositoryRootV2Materialization;
  readonly anchorCandidate: OwnerRepositoryWalletCheckpointAnchorCandidateV1;
  readonly authority: "structural_candidate";
}

const ROOT_MAX_BYTES = 64 * 1024;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const ROOT_KEYS = [
  "schemaVersion", "accountScopeHash", "currentGeneration", "repositoryRevision",
  "journalSequence", "previousRootFingerprint", "journalHeadRef", "walletStateRef",
  "courseStateManifestRef", "operationIndexManifestRef", "subjectIndexManifestRef",
  "receiptIndexManifestRef", "walletCheckpointAnchor", "walletCheckpointLagRootTransitions",
  "walletCheckpointPromotionRequired", "rootFingerprint",
] as const;
const ANCHOR_KEYS = [
  "schemaVersion", "checkpointSchemaVersion", "checkpointKind", "accountScopeHash",
  "checkpointKey", "checkpointRootFingerprint", "checkpointFingerprint",
  "checkpointCurrentGeneration", "checkpointRepositoryRevision", "checkpointJournalSequence",
  "bootstrapOrigin",
] as const;
const ANCHOR_CANDIDATES = new WeakSet<object>();
const ADOPTION_BASES = new WeakSet<object>();
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (): never => { throw new Error("owner_repository_root_v3_invalid"); };
const mismatch = (): never => { throw new Error("owner_repository_root_v3_mismatch"); };
const overflow = (): never => { throw new Error("owner_repository_root_v3_overflow"); };
const safe = (value: unknown): value is number =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const same = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const readRecord = (input: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (ownKeys.length !== keys.length || ownKeys.some((key) =>
    typeof key !== "string" || !keys.includes(key)) || keys.some((key) => {
    const descriptor = descriptors[key];
    return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
  })) return invalid();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys) result[key] = descriptors[key].value;
  return result;
};
const checkpointKey = (accountScopeHash: string, rootFingerprint: string): string =>
  `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${rootFingerprint}`;
const parseRootV2Materialization = (input: unknown): OwnerRepositoryRootV2Materialization => {
  const request = readRecord(input, ["root", "encoded"]);
  if (typeof request.encoded !== "string") return invalid();
  let detached: unknown;
  try { detached = detachBoundedWalletJson(request.root, "owner_repository_root_v3_invalid"); }
  catch { return invalid(); }
  if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") return invalid();
  let parsed: OwnerRepositoryRootV2Materialization;
  try { parsed = parseOwnerRepositoryRootV2(detached, detached.accountScopeHash); }
  catch { return invalid(); }
  if (parsed.encoded !== request.encoded) return invalid();
  return parsed;
};

const parseAnchor = (
  input: unknown,
  expectedAccountScopeHash?: string,
): OwnerRepositoryWalletCheckpointAnchorV1 => {
  const value = readRecord(input, ANCHOR_KEYS);
  if (value.schemaVersion !== "learning-v2-owner-repository-wallet-checkpoint-anchor.v1" ||
    (value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" &&
      value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v2" &&
      value.checkpointSchemaVersion !== "learning-v2-owner-repository-economic-checkpoint.v3") ||
    (value.checkpointKind !== "wallet_credit_only" &&
      value.checkpointKind !== "economic_mixed") ||
    (value.checkpointSchemaVersion === "learning-v2-owner-repository-economic-checkpoint.v3"
      ? value.checkpointKind !== "economic_mixed"
      : value.checkpointKind !== "wallet_credit_only") ||
    typeof value.accountScopeHash !== "string" ||
    !ACCOUNT.test(value.accountScopeHash) ||
    (expectedAccountScopeHash !== undefined && value.accountScopeHash !== expectedAccountScopeHash) ||
    typeof value.checkpointRootFingerprint !== "string" || !HASH.test(value.checkpointRootFingerprint) ||
    typeof value.checkpointFingerprint !== "string" || !HASH.test(value.checkpointFingerprint) ||
    value.checkpointKey !== checkpointKey(value.accountScopeHash, value.checkpointRootFingerprint) ||
    !safe(value.checkpointCurrentGeneration) || !safe(value.checkpointRepositoryRevision) ||
    !safe(value.checkpointJournalSequence) ||
    ![null, "fresh_v2_genesis", "verified_v1_genesis_migration"].includes(
      value.bootstrapOrigin as null | string,
    )) return invalid();
  if (value.bootstrapOrigin === "fresh_v2_genesis" &&
    (value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" ||
      value.checkpointJournalSequence !== 0 || value.checkpointRepositoryRevision !== 0)) {
    return invalid();
  }
  if (value.bootstrapOrigin === "verified_v1_genesis_migration" &&
    (value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" ||
      value.checkpointJournalSequence !== 0 || value.checkpointRepositoryRevision !== 1)) {
    return invalid();
  }
  if (value.checkpointSchemaVersion !== "learning-v2-owner-repository-wallet-checkpoint.v1" &&
    value.bootstrapOrigin !== null) return invalid();
  return deepFreeze({
    schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1",
    checkpointSchemaVersion: value.checkpointSchemaVersion as
      OwnerRepositoryWalletCheckpointAnchorV1["checkpointSchemaVersion"],
    checkpointKind: value.checkpointKind as OwnerRepositoryWalletCheckpointAnchorV1["checkpointKind"],
    accountScopeHash: value.accountScopeHash,
    checkpointKey: value.checkpointKey as string,
    checkpointRootFingerprint: value.checkpointRootFingerprint,
    checkpointFingerprint: value.checkpointFingerprint,
    checkpointCurrentGeneration: Number(value.checkpointCurrentGeneration),
    checkpointRepositoryRevision: Number(value.checkpointRepositoryRevision),
    checkpointJournalSequence: Number(value.checkpointJournalSequence),
    bootstrapOrigin: value.bootstrapOrigin as OwnerRepositoryWalletCheckpointAnchorV1["bootstrapOrigin"],
  });
};

const brandAnchorCandidate = (
  anchor: OwnerRepositoryWalletCheckpointAnchorV1,
  source: OwnerRepositoryWalletCheckpointAnchorCandidateV1["source"],
): OwnerRepositoryWalletCheckpointAnchorCandidateV1 => {
  const candidate = deepFreeze({ anchor, source, authority: "structural_candidate" as const });
  ANCHOR_CANDIDATES.add(candidate);
  return candidate;
};

/**
 * Structural V2-checkpoint identity only. The Checkpoint V2 codec and repository window
 * verifier must validate the exact stored bytes before this candidate can reach CAS.
 */
export const materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate = (
  input: unknown,
): OwnerRepositoryWalletCheckpointAnchorCandidateV1 => {
  const anchor = parseAnchor(input);
  if (anchor.checkpointSchemaVersion !==
      "learning-v2-owner-repository-wallet-checkpoint.v2" || anchor.bootstrapOrigin !== null) {
    return invalid();
  }
  return brandAnchorCandidate(anchor, "checkpoint_v2_structural_candidate");
};

/**
 * Structural V3 economic-checkpoint identity only. Exact checkpoint bytes,
 * projections and bounded history must be verified before repository admission.
 */
export const materializeOwnerRepositoryEconomicCheckpointV3AnchorCandidate = (
  input: unknown,
): OwnerRepositoryWalletCheckpointAnchorCandidateV1 => {
  const anchor = parseAnchor(input);
  if (anchor.checkpointSchemaVersion !==
      "learning-v2-owner-repository-economic-checkpoint.v3" ||
    anchor.checkpointKind !== "economic_mixed" ||
    anchor.bootstrapOrigin !== null) return invalid();
  return brandAnchorCandidate(anchor, "checkpoint_v3_structural_candidate");
};

/**
 * Derives a structural anchor from exact Checkpoint V1 bytes parsed by the closed V1 codec.
 * This proves codec identity, not durable storage/current-root ancestry.
 */
export const parseOwnerRepositoryWalletCheckpointV1AnchorCandidate = (
  input: unknown,
): OwnerRepositoryWalletCheckpointAnchorCandidateV1 => {
  const request = readRecord(input, ["checkpoint", "checkpointRoot", "walletStateBlob"]);
  const supplied = readRecord(request.checkpoint, ["checkpoint", "key", "encoded"]);
  let detachedCheckpoint: unknown;
  try {
    detachedCheckpoint = detachBoundedWalletJson(
      supplied.checkpoint,
      "owner_repository_root_v3_invalid",
    );
  } catch { return invalid(); }
  if (!isRecord(detachedCheckpoint) ||
    typeof detachedCheckpoint.accountScopeHash !== "string") return invalid();
  let parsed: OwnerRepositoryWalletCheckpointMaterialization;
  try {
    parsed = parseOwnerRepositoryWalletCheckpoint({
      accountScopeHash: detachedCheckpoint.accountScopeHash,
      checkpointRoot: request.checkpointRoot,
      key: supplied.key,
      raw: supplied.encoded,
      walletStateBlob: request.walletStateBlob as OwnerRepositoryWalletStateBlobV1,
    });
  } catch { return invalid(); }
  const checkpoint = parsed.checkpoint;
  return brandAnchorCandidate(parseAnchor({
    schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1",
    checkpointSchemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v1",
    checkpointKind: "wallet_credit_only",
    accountScopeHash: checkpoint.accountScopeHash,
    checkpointKey: parsed.key,
    checkpointRootFingerprint: checkpoint.checkpointRootFingerprint,
    checkpointFingerprint: checkpoint.checkpointFingerprint,
    checkpointCurrentGeneration: checkpoint.currentGeneration,
    checkpointRepositoryRevision: checkpoint.repositoryRevision,
    checkpointJournalSequence: checkpoint.journalSequence,
    bootstrapOrigin: checkpoint.bootstrapOrigin,
  }), "checkpoint_v1_codec");
};

const materialize = (
  body: Omit<OwnerRepositoryRootV3, "rootFingerprint">,
): OwnerRepositoryRootV3Materialization => {
  const root = deepFreeze({ ...body, rootFingerprint: sha256Utf8(canonicalJsonV1(body)) });
  const encoded = canonicalJsonV1(root);
  if (utf8ByteLengthV1(encoded) > ROOT_MAX_BYTES) return overflow();
  return deepFreeze({ root, encoded, authority: "structural_candidate" as const });
};

const validateCommonWithV2 = (
  value: Record<string, unknown>,
  accountScopeHash: string,
): OwnerRepositoryRootV2 => {
  const body = {
    schemaVersion: "learning-v2-owner-repository-root.v2" as const,
    accountScopeHash,
    currentGeneration: value.currentGeneration,
    repositoryRevision: value.repositoryRevision,
    journalSequence: value.journalSequence,
    previousRootFingerprint: value.previousRootFingerprint,
    journalHeadRef: value.journalHeadRef,
    walletStateRef: value.walletStateRef,
    courseStateManifestRef: value.courseStateManifestRef,
    operationIndexManifestRef: value.operationIndexManifestRef,
    subjectIndexManifestRef: value.subjectIndexManifestRef,
    receiptIndexManifestRef: value.receiptIndexManifestRef,
  };
  const candidate = { ...body, rootFingerprint: sha256Utf8(canonicalJsonV1(body)) };
  return parseOwnerRepositoryRootV2(candidate, accountScopeHash).root;
};

export const parseOwnerRepositoryRootV3 = (
  input: unknown,
  expectedAccountScopeHash: string,
): OwnerRepositoryRootV3Materialization => {
  if (typeof expectedAccountScopeHash !== "string" || !ACCOUNT.test(expectedAccountScopeHash)) {
    return invalid();
  }
  let detached: unknown;
  try { detached = detachBoundedWalletJson(input, "owner_repository_root_v3_invalid"); }
  catch { return invalid(); }
  if (!isRecord(detached) || Reflect.ownKeys(detached).length !== ROOT_KEYS.length ||
    !Reflect.ownKeys(detached).every((key) => typeof key === "string" &&
      (ROOT_KEYS as readonly string[]).includes(key)) ||
    detached.schemaVersion !== "learning-v2-owner-repository-root.v3" ||
    detached.accountScopeHash !== expectedAccountScopeHash ||
    typeof detached.previousRootFingerprint !== "string" ||
    !HASH.test(detached.previousRootFingerprint) ||
    typeof detached.rootFingerprint !== "string" || !HASH.test(detached.rootFingerprint) ||
    !safe(detached.walletCheckpointLagRootTransitions) ||
    typeof detached.walletCheckpointPromotionRequired !== "boolean") return invalid();
  let common: OwnerRepositoryRootV2;
  let anchor: OwnerRepositoryWalletCheckpointAnchorV1;
  try {
    common = validateCommonWithV2(detached, expectedAccountScopeHash);
    anchor = parseAnchor(detached.walletCheckpointAnchor, expectedAccountScopeHash);
  } catch { return invalid(); }
  const revisionDelta = common.repositoryRevision - anchor.checkpointRepositoryRevision;
  const sequenceDelta = common.journalSequence - anchor.checkpointJournalSequence;
  const nonWalletTransitions = revisionDelta - sequenceDelta;
  if (anchor.checkpointRootFingerprint === detached.rootFingerprint ||
    anchor.checkpointCurrentGeneration > common.currentGeneration || revisionDelta < 1 ||
    revisionDelta > 16 || sequenceDelta < 0 || sequenceDelta > revisionDelta ||
    nonWalletTransitions < 0 || nonWalletTransitions > 1 ||
    (nonWalletTransitions === 0) !==
      (anchor.checkpointCurrentGeneration === common.currentGeneration) ||
    detached.walletCheckpointLagRootTransitions !== revisionDelta ||
    detached.walletCheckpointPromotionRequired !==
      (revisionDelta === 16 || nonWalletTransitions === 1)) return invalid();
  const body = {
    schemaVersion: "learning-v2-owner-repository-root.v3" as const,
    accountScopeHash: common.accountScopeHash,
    currentGeneration: common.currentGeneration,
    repositoryRevision: common.repositoryRevision,
    journalSequence: common.journalSequence,
    previousRootFingerprint: common.previousRootFingerprint as string,
    journalHeadRef: common.journalHeadRef,
    walletStateRef: common.walletStateRef,
    courseStateManifestRef: common.courseStateManifestRef,
    operationIndexManifestRef: common.operationIndexManifestRef,
    subjectIndexManifestRef: common.subjectIndexManifestRef,
    receiptIndexManifestRef: common.receiptIndexManifestRef,
    walletCheckpointAnchor: anchor,
    walletCheckpointLagRootTransitions: revisionDelta,
    walletCheckpointPromotionRequired: detached.walletCheckpointPromotionRequired,
  };
  const rebuilt = materialize(body);
  if (!same(rebuilt.root, detached)) return invalid();
  return rebuilt;
};

export const parseOwnerRepositoryRootV3Raw = (
  raw: unknown,
  expectedAccountScopeHash: string,
): OwnerRepositoryRootV3Materialization => {
  let parsed: unknown;
  try {
    if (typeof raw !== "string" || utf8ByteLengthV1(raw) > ROOT_MAX_BYTES) return invalid();
    parsed = JSON.parse(raw) as unknown;
    if (canonicalJsonV1(parsed) !== raw) return invalid();
  } catch { return invalid(); }
  const result = parseOwnerRepositoryRootV3(parsed, expectedAccountScopeHash);
  if (result.encoded !== raw) return invalid();
  return result;
};

const assertAnchorMatchesRoot = (
  candidate: OwnerRepositoryWalletCheckpointAnchorCandidateV1,
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
): OwnerRepositoryWalletCheckpointAnchorV1 => {
  if (!ANCHOR_CANDIDATES.has(candidate as object)) return invalid();
  const anchor = candidate.anchor;
  if (anchor.accountScopeHash !== root.accountScopeHash ||
    anchor.checkpointRootFingerprint !== root.rootFingerprint ||
    anchor.checkpointCurrentGeneration !== root.currentGeneration ||
    anchor.checkpointRepositoryRevision !== root.repositoryRevision ||
    anchor.checkpointJournalSequence !== root.journalSequence) return mismatch();
  return anchor;
};

const adoptionBase = (
  rootBefore: OwnerRepositoryRootV2Materialization,
  candidate: OwnerRepositoryWalletCheckpointAnchorCandidateV1,
): OwnerRepositoryRootV3AdoptionBase => {
  const value = deepFreeze({
    rootBefore,
    anchorCandidate: candidate,
    authority: "structural_candidate" as const,
  });
  ADOPTION_BASES.add(value);
  return value;
};

export const createOwnerRepositoryRootV3AdoptionBaseFromFreshV2 = (
  input: unknown,
): OwnerRepositoryRootV3AdoptionBase => {
  const request = readRecord(input, ["rootBefore", "checkpointAnchorCandidate"]);
  const rootBefore = parseRootV2Materialization(request.rootBefore);
  if (!isRecord(request.checkpointAnchorCandidate) ||
    !ANCHOR_CANDIDATES.has(request.checkpointAnchorCandidate) ||
    rootBefore.root.repositoryRevision !== 0 || rootBefore.root.journalSequence !== 0 ||
    rootBefore.root.previousRootFingerprint !== null || rootBefore.root.journalHeadRef !== null) {
    return invalid();
  }
  const candidate = request.checkpointAnchorCandidate as unknown as
    OwnerRepositoryWalletCheckpointAnchorCandidateV1;
  const anchor = assertAnchorMatchesRoot(candidate, rootBefore.root);
  if (candidate.source !== "checkpoint_v1_codec" ||
    anchor.bootstrapOrigin !== "fresh_v2_genesis") return invalid();
  return adoptionBase(rootBefore, candidate);
};

export const createOwnerRepositoryRootV3AdoptionBaseFromVerifiedV1Migration = async (
  input: unknown,
): Promise<OwnerRepositoryRootV3AdoptionBase> => {
  const request = readRecord(input, [
    "rootV1", "targetGeneration", "emptyCourseStateManifestBlob", "resolveCourseNode",
    "migratedRoot", "checkpointAnchorCandidate",
  ]);
  if (typeof request.resolveCourseNode !== "function" ||
    !isRecord(request.checkpointAnchorCandidate) ||
    !ANCHOR_CANDIDATES.has(request.checkpointAnchorCandidate)) return invalid();
  const migratedRoot = parseRootV2Materialization(request.migratedRoot);
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
  const candidate = request.checkpointAnchorCandidate as unknown as
    OwnerRepositoryWalletCheckpointAnchorCandidateV1;
  const anchor = assertAnchorMatchesRoot(candidate, migratedRoot.root);
  if (candidate.source !== "checkpoint_v1_codec" ||
    anchor.bootstrapOrigin !== "verified_v1_genesis_migration") return invalid();
  return adoptionBase(migratedRoot, candidate);
};

export const createOwnerRepositoryRootV3AdoptionBaseFromV2Seq1 = (
  input: unknown,
): OwnerRepositoryRootV3AdoptionBase => {
  const request = readRecord(input, [
    "rootBefore", "parentRoot", "parentJournalRecordBlob", "checkpointAnchorCandidate",
  ]);
  const rootBefore = parseRootV2Materialization(request.rootBefore);
  const parentRoot = parseRootV2Materialization(request.parentRoot);
  if (!isRecord(request.checkpointAnchorCandidate) ||
    !ANCHOR_CANDIDATES.has(request.checkpointAnchorCandidate) ||
    rootBefore.root.journalSequence !== 1 || parentRoot.root.journalSequence !== 0 ||
    rootBefore.root.previousRootFingerprint !== parentRoot.root.rootFingerprint ||
    rootBefore.root.repositoryRevision !== parentRoot.root.repositoryRevision + 1 ||
    rootBefore.root.currentGeneration !== parentRoot.root.currentGeneration) return invalid();
  let rebuilt: OwnerRepositoryRootV2Materialization;
  try {
    rebuilt = bindOwnerRepositoryWalletCreditSuccessorRootV2({
      rootBefore: parentRoot.root,
      journalRecordBlob: request.parentJournalRecordBlob,
    });
  } catch { return invalid(); }
  if (!same(rebuilt, rootBefore)) return mismatch();
  const candidate = request.checkpointAnchorCandidate as unknown as
    OwnerRepositoryWalletCheckpointAnchorCandidateV1;
  if (candidate.source !== "checkpoint_v1_codec") return invalid();
  assertAnchorMatchesRoot(candidate, parentRoot.root);
  return adoptionBase(rootBefore, candidate);
};

const parseWalletRecord = (
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
  input: unknown,
): Readonly<{
  record: OwnerRepositoryWalletCreditJournalRecordV1;
  blob: OwnerRepositoryJournalRecordBlobV1;
}> => {
  const supplied = readRecord(input, ["ref", "encoded"]);
  let parsed: ReturnType<typeof parseOwnerRepositoryJournalRecordBlob>;
  try {
    parsed = parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash: root.accountScopeHash,
      ref: supplied.ref,
      raw: supplied.encoded,
    });
  } catch { return invalid(); }
  if (parsed.record.recordKind !== "wallet_credit") return invalid();
  const record = parsed.record as OwnerRepositoryWalletCreditJournalRecordV1;
  if (root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
    root.journalSequence === Number.MAX_SAFE_INTEGER ||
    record.accountScopeHash !== root.accountScopeHash ||
    record.acceptedAccountGeneration !== root.currentGeneration ||
    record.repositoryRevisionBefore !== root.repositoryRevision ||
    record.rootBeforeFingerprint !== root.rootFingerprint ||
    record.journalSequence !== root.journalSequence + 1 ||
    !same(record.previousJournalRecordRef, root.journalHeadRef) ||
    !same(record.walletStateBeforeRef, root.walletStateRef) ||
    !same(record.operationIndexManifestBeforeRef, root.operationIndexManifestRef) ||
    !same(record.subjectIndexManifestBeforeRef, root.subjectIndexManifestRef) ||
    !same(record.receiptIndexManifestBeforeRef, root.receiptIndexManifestRef)) return mismatch();
  return { record, blob: parsed.blob };
};

const anchorForV3Successor = (
  root: OwnerRepositoryRootV3,
  promoted: unknown,
): OwnerRepositoryWalletCheckpointAnchorV1 => {
  if (root.walletCheckpointPromotionRequired) {
    if (!isRecord(promoted) || !ANCHOR_CANDIDATES.has(promoted)) return invalid();
    const candidate = promoted as unknown as OwnerRepositoryWalletCheckpointAnchorCandidateV1;
    if (candidate.source !== "checkpoint_v2_structural_candidate" &&
      candidate.source !== "checkpoint_v3_structural_candidate") return invalid();
    return assertAnchorMatchesRoot(candidate, root);
  }
  if (promoted !== null) return invalid();
  return root.walletCheckpointAnchor;
};

const walletSuccessorBody = (
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
  anchor: OwnerRepositoryWalletCheckpointAnchorV1,
  record: OwnerRepositoryWalletCreditJournalRecordV1,
  journalBlob: OwnerRepositoryJournalRecordBlobV1,
): Omit<OwnerRepositoryRootV3, "rootFingerprint"> => ({
  schemaVersion: "learning-v2-owner-repository-root.v3",
  accountScopeHash: root.accountScopeHash,
  currentGeneration: root.currentGeneration,
  repositoryRevision: root.repositoryRevision + 1,
  journalSequence: record.journalSequence,
  previousRootFingerprint: root.rootFingerprint,
  journalHeadRef: journalBlob.ref,
  walletStateRef: record.walletStateAfterRef,
  courseStateManifestRef: root.courseStateManifestRef,
  operationIndexManifestRef: record.operationIndexManifestAfterRef,
  subjectIndexManifestRef: record.subjectIndexManifestAfterRef,
  receiptIndexManifestRef: record.receiptIndexManifestAfterRef,
  walletCheckpointAnchor: anchor,
  walletCheckpointLagRootTransitions: root.repositoryRevision + 1 -
    anchor.checkpointRepositoryRevision,
  walletCheckpointPromotionRequired:
    root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
});

/** Pure structural successor; it is not eligible for persistence without repository admission. */
export const bindOwnerRepositoryWalletCreditSuccessorRootV3FromV2 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, ["adoptionBase", "journalRecordBlob"]);
  if (!isRecord(request.adoptionBase) || !ADOPTION_BASES.has(request.adoptionBase)) return invalid();
  const base = request.adoptionBase as unknown as OwnerRepositoryRootV3AdoptionBase;
  const parsed = parseWalletRecord(base.rootBefore.root, request.journalRecordBlob);
  const created = materialize(walletSuccessorBody(
    base.rootBefore.root,
    base.anchorCandidate.anchor,
    parsed.record,
    parsed.blob,
  ));
  return parseOwnerRepositoryRootV3(created.root, created.root.accountScopeHash);
};

/** Pure structural successor; the bounded ancestry verifier must admit root and anchor before CAS. */
export const bindOwnerRepositoryWalletCreditSuccessorRootV3 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, ["rootBefore", "journalRecordBlob", "promotedCheckpointAnchor"]);
  let detached: unknown;
  try { detached = detachBoundedWalletJson(request.rootBefore, "owner_repository_root_v3_invalid"); }
  catch { return invalid(); }
  if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") return invalid();
  const root = parseOwnerRepositoryRootV3(detached, detached.accountScopeHash).root;
  const anchor = anchorForV3Successor(root, request.promotedCheckpointAnchor);
  const parsed = parseWalletRecord(root, request.journalRecordBlob);
  const created = materialize(walletSuccessorBody(root, anchor, parsed.record, parsed.blob));
  return parseOwnerRepositoryRootV3(created.root, root.accountScopeHash);
};

const parseWalletEffectV2 = (
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
  blobInput: unknown,
  afterInput: unknown,
): Readonly<{
  record: OwnerRepositoryWalletCreditEffectRecordV2;
  blob: OwnerRepositoryWalletCreditEffectRecordBlobV2;
  operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  subjectIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  receiptIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
}> => {
  const supplied = readRecord(blobInput, ["ref", "encoded", "record"]);
  let blob: OwnerRepositoryWalletCreditEffectRecordBlobV2;
  try {
    blob = parseOwnerRepositoryWalletCreditEffectRecordBlobV2({
      accountScopeHash: root.accountScopeHash,
      ref: supplied.ref,
      raw: supplied.encoded,
    });
  } catch {
    return invalid();
  }
  if (!same(blob.record, supplied.record)) return invalid();
  const record = blob.record;
  if (
    root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
    root.journalSequence === Number.MAX_SAFE_INTEGER ||
    record.accountScopeHash !== root.accountScopeHash ||
    record.acceptedAccountGeneration !== root.currentGeneration ||
    record.repositoryRevisionBefore !== root.repositoryRevision ||
    record.rootBeforeFingerprint !== root.rootFingerprint ||
    record.journalSequence !== root.journalSequence + 1 ||
    !same(record.previousJournalRecordRef, root.journalHeadRef) ||
    !same(record.walletStateBeforeRef, root.walletStateRef) ||
    !same(
      record.operationIndexManifestBeforeRef,
      root.operationIndexManifestRef,
    ) ||
    !same(record.subjectIndexManifestBeforeRef, root.subjectIndexManifestRef) ||
    !same(record.receiptIndexManifestBeforeRef, root.receiptIndexManifestRef)
  )
    return mismatch();
  let detachedAfter: unknown;
  try {
    detachedAfter = detachBoundedWalletJson(
      afterInput,
      "owner_repository_root_v3_invalid",
    );
  } catch {
    return invalid();
  }
  const after = readRecord(detachedAfter, [
    "operationIndexManifestAfterRef",
    "subjectIndexManifestAfterRef",
    "receiptIndexManifestAfterRef",
  ]);
  return {
    record,
    blob,
    operationIndexManifestAfterRef:
      after.operationIndexManifestAfterRef as OwnerRepositoryBlobRefV1,
    subjectIndexManifestAfterRef:
      after.subjectIndexManifestAfterRef as OwnerRepositoryBlobRefV1,
    receiptIndexManifestAfterRef:
      after.receiptIndexManifestAfterRef as OwnerRepositoryBlobRefV1,
  };
};

const walletEffectV2SuccessorBody = (
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
  anchor: OwnerRepositoryWalletCheckpointAnchorV1,
  parsed: ReturnType<typeof parseWalletEffectV2>,
): Omit<OwnerRepositoryRootV3, "rootFingerprint"> => ({
  schemaVersion: "learning-v2-owner-repository-root.v3",
  accountScopeHash: root.accountScopeHash,
  currentGeneration: root.currentGeneration,
  repositoryRevision: root.repositoryRevision + 1,
  journalSequence: parsed.record.journalSequence,
  previousRootFingerprint: root.rootFingerprint,
  journalHeadRef: parsed.blob.ref,
  walletStateRef: parsed.record.walletStateAfterRef,
  courseStateManifestRef: root.courseStateManifestRef,
  operationIndexManifestRef: parsed.operationIndexManifestAfterRef,
  subjectIndexManifestRef: parsed.subjectIndexManifestAfterRef,
  receiptIndexManifestRef: parsed.receiptIndexManifestAfterRef,
  walletCheckpointAnchor: anchor,
  walletCheckpointLagRootTransitions:
    root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision,
  walletCheckpointPromotionRequired:
    root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
});

/** V2 effect adoption uses a pre-COW journal blob plus exact planned after refs. */
export const bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3FromV2 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, [
    "adoptionBase",
    "journalRecordBlob",
    "operationIndexManifestAfterRef",
    "subjectIndexManifestAfterRef",
    "receiptIndexManifestAfterRef",
  ]);
  if (
    !isRecord(request.adoptionBase) ||
    !ADOPTION_BASES.has(request.adoptionBase)
  )
    return invalid();
  const base = request.adoptionBase as unknown as OwnerRepositoryRootV3AdoptionBase;
  const parsed = parseWalletEffectV2(
    base.rootBefore.root,
    request.journalRecordBlob,
    {
      operationIndexManifestAfterRef:
        request.operationIndexManifestAfterRef,
      subjectIndexManifestAfterRef: request.subjectIndexManifestAfterRef,
      receiptIndexManifestAfterRef: request.receiptIndexManifestAfterRef,
    },
  );
  const created = materialize(
    walletEffectV2SuccessorBody(
      base.rootBefore.root,
      base.anchorCandidate.anchor,
      parsed,
    ),
  );
  return parseOwnerRepositoryRootV3(created.root, created.root.accountScopeHash);
};

/** Existing RootV3 successor; repository ancestry/COW admission remains separate. */
export const bindOwnerRepositoryWalletCreditEffectV2SuccessorRootV3 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, [
    "rootBefore",
    "journalRecordBlob",
    "operationIndexManifestAfterRef",
    "subjectIndexManifestAfterRef",
    "receiptIndexManifestAfterRef",
    "promotedCheckpointAnchor",
  ]);
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(
      request.rootBefore,
      "owner_repository_root_v3_invalid",
    );
  } catch {
    return invalid();
  }
  if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") {
    return invalid();
  }
  const root = parseOwnerRepositoryRootV3(
    detached,
    detached.accountScopeHash,
  ).root;
  const anchor = anchorForV3Successor(
    root,
    request.promotedCheckpointAnchor,
  );
  const parsed = parseWalletEffectV2(root, request.journalRecordBlob, {
    operationIndexManifestAfterRef: request.operationIndexManifestAfterRef,
    subjectIndexManifestAfterRef: request.subjectIndexManifestAfterRef,
    receiptIndexManifestAfterRef: request.receiptIndexManifestAfterRef,
  });
  const created = materialize(walletEffectV2SuccessorBody(root, anchor, parsed));
  return parseOwnerRepositoryRootV3(created.root, root.accountScopeHash);
};

const parseCourseUnlockEffectV2 = (
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
  blobInput: unknown,
  afterInput: unknown,
): Readonly<{
  record: OwnerRepositoryCourseUnlockEffectRecordV2;
  blob: OwnerRepositoryCourseUnlockEffectRecordBlobV2;
  operationIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  subjectIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
  receiptIndexManifestAfterRef: OwnerRepositoryBlobRefV1;
}> => {
  const supplied = readRecord(blobInput, ["ref", "encoded", "record"]);
  let blob: OwnerRepositoryCourseUnlockEffectRecordBlobV2;
  try {
    blob = parseOwnerRepositoryCourseUnlockEffectRecordBlobV2({
      accountScopeHash: root.accountScopeHash,
      ref: supplied.ref,
      raw: supplied.encoded,
    });
  } catch {
    return invalid();
  }
  if (!same(blob.record, supplied.record)) return invalid();
  const record = blob.record;
  if (
    root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
    root.journalSequence === Number.MAX_SAFE_INTEGER ||
    record.accountScopeHash !== root.accountScopeHash ||
    record.acceptedAccountGeneration !== root.currentGeneration ||
    record.repositoryRevisionBefore !== root.repositoryRevision ||
    record.rootBeforeFingerprint !== root.rootFingerprint ||
    record.journalSequence !== root.journalSequence + 1 ||
    !same(record.previousJournalRecordRef, root.journalHeadRef) ||
    !same(record.walletStateBeforeRef, root.walletStateRef) ||
    !same(record.courseStateManifestBeforeRef, root.courseStateManifestRef) ||
    !same(
      record.operationIndexManifestBeforeRef,
      root.operationIndexManifestRef,
    ) ||
    !same(record.subjectIndexManifestBeforeRef, root.subjectIndexManifestRef) ||
    !same(record.receiptIndexManifestBeforeRef, root.receiptIndexManifestRef)
  ) {
    return mismatch();
  }
  let detachedAfter: unknown;
  try {
    detachedAfter = detachBoundedWalletJson(
      afterInput,
      "owner_repository_root_v3_invalid",
    );
  } catch {
    return invalid();
  }
  const after = readRecord(detachedAfter, [
    "operationIndexManifestAfterRef",
    "subjectIndexManifestAfterRef",
    "receiptIndexManifestAfterRef",
  ]);
  return {
    record,
    blob,
    operationIndexManifestAfterRef:
      after.operationIndexManifestAfterRef as OwnerRepositoryBlobRefV1,
    subjectIndexManifestAfterRef:
      after.subjectIndexManifestAfterRef as OwnerRepositoryBlobRefV1,
    receiptIndexManifestAfterRef:
      after.receiptIndexManifestAfterRef as OwnerRepositoryBlobRefV1,
  };
};

const courseUnlockEffectV2SuccessorBody = (
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
  anchor: OwnerRepositoryWalletCheckpointAnchorV1,
  parsed: ReturnType<typeof parseCourseUnlockEffectV2>,
): Omit<OwnerRepositoryRootV3, "rootFingerprint"> => ({
  schemaVersion: "learning-v2-owner-repository-root.v3",
  accountScopeHash: root.accountScopeHash,
  currentGeneration: root.currentGeneration,
  repositoryRevision: root.repositoryRevision + 1,
  journalSequence: parsed.record.journalSequence,
  previousRootFingerprint: root.rootFingerprint,
  journalHeadRef: parsed.blob.ref,
  walletStateRef: parsed.record.walletStateAfterRef,
  courseStateManifestRef: parsed.record.courseStateManifestAfterRef,
  operationIndexManifestRef: parsed.operationIndexManifestAfterRef,
  subjectIndexManifestRef: parsed.subjectIndexManifestAfterRef,
  receiptIndexManifestRef: parsed.receiptIndexManifestAfterRef,
  walletCheckpointAnchor: anchor,
  walletCheckpointLagRootTransitions:
    root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision,
  walletCheckpointPromotionRequired:
    root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
});

/** V2 adoption for one exact compound wallet-debit + course-access effect. */
export const bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3FromV2 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, [
    "adoptionBase",
    "journalRecordBlob",
    "operationIndexManifestAfterRef",
    "subjectIndexManifestAfterRef",
    "receiptIndexManifestAfterRef",
  ]);
  if (
    !isRecord(request.adoptionBase) ||
    !ADOPTION_BASES.has(request.adoptionBase)
  ) {
    return invalid();
  }
  const base =
    request.adoptionBase as unknown as OwnerRepositoryRootV3AdoptionBase;
  const parsed = parseCourseUnlockEffectV2(
    base.rootBefore.root,
    request.journalRecordBlob,
    {
      operationIndexManifestAfterRef:
        request.operationIndexManifestAfterRef,
      subjectIndexManifestAfterRef: request.subjectIndexManifestAfterRef,
      receiptIndexManifestAfterRef: request.receiptIndexManifestAfterRef,
    },
  );
  const created = materialize(
    courseUnlockEffectV2SuccessorBody(
      base.rootBefore.root,
      base.anchorCandidate.anchor,
      parsed,
    ),
  );
  return parseOwnerRepositoryRootV3(created.root, created.root.accountScopeHash);
};

/** Existing RootV3 compound successor; persistence still requires history admission. */
export const bindOwnerRepositoryCourseUnlockEffectV2SuccessorRootV3 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, [
    "rootBefore",
    "journalRecordBlob",
    "operationIndexManifestAfterRef",
    "subjectIndexManifestAfterRef",
    "receiptIndexManifestAfterRef",
    "promotedCheckpointAnchor",
  ]);
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(
      request.rootBefore,
      "owner_repository_root_v3_invalid",
    );
  } catch {
    return invalid();
  }
  if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") {
    return invalid();
  }
  const root = parseOwnerRepositoryRootV3(
    detached,
    detached.accountScopeHash,
  ).root;
  const anchor = anchorForV3Successor(
    root,
    request.promotedCheckpointAnchor,
  );
  const parsed = parseCourseUnlockEffectV2(root, request.journalRecordBlob, {
    operationIndexManifestAfterRef: request.operationIndexManifestAfterRef,
    subjectIndexManifestAfterRef: request.subjectIndexManifestAfterRef,
    receiptIndexManifestAfterRef: request.receiptIndexManifestAfterRef,
  });
  const created = materialize(
    courseUnlockEffectV2SuccessorBody(root, anchor, parsed),
  );
  return parseOwnerRepositoryRootV3(created.root, root.accountScopeHash);
};

type OwnerRepositoryNoWalletJournalRecordV1 =
  | OwnerRepositoryOperationAliasJournalRecordV1
  | OwnerRepositoryMissingIndexEntryJournalRecordV1;

const parseOperationAliasV2 = (
  root: OwnerRepositoryRootV3,
  input: unknown,
): Readonly<{
  record: OwnerRepositoryOperationAliasRecordV2;
  blob: OwnerRepositoryOperationAliasRecordBlobV2;
}> => {
  const supplied = readRecord(input, ["ref", "encoded", "record"]);
  let parsed: OwnerRepositoryOperationAliasRecordBlobV2;
  try {
    parsed = parseOwnerRepositoryOperationAliasRecordBlobV2({
      accountScopeHash: root.accountScopeHash,
      ref: supplied.ref,
      raw: supplied.encoded,
    });
  } catch {
    return invalid();
  }
  const record = parsed.record;
  if (
    !same(record, supplied.record) ||
    root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
    root.journalSequence === Number.MAX_SAFE_INTEGER ||
    record.accountScopeHash !== root.accountScopeHash ||
    record.acceptedAccountGeneration !== root.currentGeneration ||
    record.repositoryRevisionBefore !== root.repositoryRevision ||
    record.rootBeforeFingerprint !== root.rootFingerprint ||
    record.journalSequence !== root.journalSequence + 1 ||
    !same(record.previousJournalRecordRef, root.journalHeadRef) ||
    !same(record.walletStateRef, root.walletStateRef) ||
    !same(record.operationIndexManifestBeforeRef,
      root.operationIndexManifestRef) ||
    !same(record.subjectIndexManifestRef, root.subjectIndexManifestRef) ||
    !same(record.receiptIndexManifestRef, root.receiptIndexManifestRef)
  ) return mismatch();
  return { record, blob: parsed };
};

/**
 * Structural bound-alias successor. Canonical-effect ancestry and the exact
 * two-key COW must still be proven by the repository window before CAS.
 */
export const bindOwnerRepositoryOperationAliasV2SuccessorRootV3 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, [
    "rootBefore",
    "journalRecordBlob",
    "promotedCheckpointAnchor",
  ]);
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(
      request.rootBefore,
      "owner_repository_root_v3_invalid",
    );
  } catch {
    return invalid();
  }
  if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") {
    return invalid();
  }
  const root = parseOwnerRepositoryRootV3(
    detached,
    detached.accountScopeHash,
  ).root;
  const anchor = anchorForV3Successor(
    root,
    request.promotedCheckpointAnchor,
  );
  const parsed = parseOperationAliasV2(root, request.journalRecordBlob);
  const created = materialize({
    schemaVersion: "learning-v2-owner-repository-root.v3",
    accountScopeHash: root.accountScopeHash,
    currentGeneration: root.currentGeneration,
    repositoryRevision: root.repositoryRevision + 1,
    journalSequence: parsed.record.journalSequence,
    previousRootFingerprint: root.rootFingerprint,
    journalHeadRef: parsed.blob.ref,
    walletStateRef: root.walletStateRef,
    courseStateManifestRef: root.courseStateManifestRef,
    operationIndexManifestRef:
      parsed.record.operationIndexManifestAfterRef,
    subjectIndexManifestRef: root.subjectIndexManifestRef,
    receiptIndexManifestRef: root.receiptIndexManifestRef,
    walletCheckpointAnchor: anchor,
    walletCheckpointLagRootTransitions: root.repositoryRevision + 1 -
      anchor.checkpointRepositoryRevision,
    walletCheckpointPromotionRequired:
      root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
  });
  return parseOwnerRepositoryRootV3(created.root, root.accountScopeHash);
};

const parseNoWalletRecord = (
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
  input: unknown,
  expectedKind: OwnerRepositoryNoWalletJournalRecordV1["recordKind"],
): Readonly<{
  record: OwnerRepositoryNoWalletJournalRecordV1;
  blob: OwnerRepositoryJournalRecordBlobV1;
}> => {
  const supplied = readRecord(input, ["ref", "encoded"]);
  let parsed: ReturnType<typeof parseOwnerRepositoryJournalRecordBlob>;
  try {
    parsed = parseOwnerRepositoryJournalRecordBlob({
      accountScopeHash: root.accountScopeHash,
      ref: supplied.ref,
      raw: supplied.encoded,
    });
  } catch { return invalid(); }
  if (parsed.record.recordKind !== expectedKind) return invalid();
  const record = parsed.record as OwnerRepositoryNoWalletJournalRecordV1;
  if (root.repositoryRevision === Number.MAX_SAFE_INTEGER ||
    root.journalSequence === Number.MAX_SAFE_INTEGER ||
    record.accountScopeHash !== root.accountScopeHash ||
    record.acceptedAccountGeneration !== root.currentGeneration ||
    record.repositoryRevisionBefore !== root.repositoryRevision ||
    record.rootBeforeFingerprint !== root.rootFingerprint ||
    record.journalSequence !== root.journalSequence + 1 ||
    !same(record.previousJournalRecordRef, root.journalHeadRef) ||
    !same(record.walletStateRef, root.walletStateRef) ||
    !same(record.operationIndexManifestBeforeRef, root.operationIndexManifestRef)) {
    return mismatch();
  }
  if (record.recordKind === "operation_alias") {
    if (!same(record.subjectIndexManifestRef, root.subjectIndexManifestRef) ||
      !same(record.receiptIndexManifestRef, root.receiptIndexManifestRef)) {
      return mismatch();
    }
  } else if (!same(record.subjectIndexManifestBeforeRef, root.subjectIndexManifestRef) ||
    !same(record.receiptIndexManifestBeforeRef, root.receiptIndexManifestRef)) {
    return mismatch();
  }
  return { record, blob: parsed.blob };
};

const noWalletSuccessorBody = (
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
  anchor: OwnerRepositoryWalletCheckpointAnchorV1,
  record: OwnerRepositoryNoWalletJournalRecordV1,
  journalBlob: OwnerRepositoryJournalRecordBlobV1,
): Omit<OwnerRepositoryRootV3, "rootFingerprint"> => ({
  schemaVersion: "learning-v2-owner-repository-root.v3",
  accountScopeHash: root.accountScopeHash,
  currentGeneration: root.currentGeneration,
  repositoryRevision: root.repositoryRevision + 1,
  journalSequence: record.journalSequence,
  previousRootFingerprint: root.rootFingerprint,
  journalHeadRef: journalBlob.ref,
  walletStateRef: root.walletStateRef,
  courseStateManifestRef: root.courseStateManifestRef,
  operationIndexManifestRef: record.operationIndexManifestAfterRef,
  subjectIndexManifestRef: record.recordKind === "operation_alias"
    ? record.subjectIndexManifestRef
    : record.subjectIndexManifestAfterRef,
  receiptIndexManifestRef: record.recordKind === "operation_alias"
    ? record.receiptIndexManifestRef
    : record.receiptIndexManifestAfterRef,
  walletCheckpointAnchor: anchor,
  walletCheckpointLagRootTransitions: root.repositoryRevision + 1 -
    anchor.checkpointRepositoryRevision,
  walletCheckpointPromotionRequired:
    root.repositoryRevision + 1 - anchor.checkpointRepositoryRevision === 16,
});

const bindNoWalletSuccessorFromV2 = (
  input: unknown,
  expectedKind: OwnerRepositoryNoWalletJournalRecordV1["recordKind"],
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, ["adoptionBase", "journalRecordBlob"]);
  if (!isRecord(request.adoptionBase) || !ADOPTION_BASES.has(request.adoptionBase)) {
    return invalid();
  }
  const base = request.adoptionBase as unknown as OwnerRepositoryRootV3AdoptionBase;
  const parsed = parseNoWalletRecord(
    base.rootBefore.root,
    request.journalRecordBlob,
    expectedKind,
  );
  const created = materialize(noWalletSuccessorBody(
    base.rootBefore.root,
    base.anchorCandidate.anchor,
    parsed.record,
    parsed.blob,
  ));
  return parseOwnerRepositoryRootV3(created.root, created.root.accountScopeHash);
};

const bindNoWalletSuccessor = (
  input: unknown,
  expectedKind: OwnerRepositoryNoWalletJournalRecordV1["recordKind"],
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, [
    "rootBefore",
    "journalRecordBlob",
    "promotedCheckpointAnchor",
  ]);
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(
      request.rootBefore,
      "owner_repository_root_v3_invalid",
    );
  } catch { return invalid(); }
  if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") {
    return invalid();
  }
  const root = parseOwnerRepositoryRootV3(detached, detached.accountScopeHash).root;
  const anchor = anchorForV3Successor(root, request.promotedCheckpointAnchor);
  const parsed = parseNoWalletRecord(root, request.journalRecordBlob, expectedKind);
  const created = materialize(noWalletSuccessorBody(root, anchor, parsed.record, parsed.blob));
  return parseOwnerRepositoryRootV3(created.root, root.accountScopeHash);
};

/** Structural alias successor only; repository graph validation is mandatory before CAS. */
export const bindOwnerRepositoryOperationAliasSuccessorRootV3FromV2 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => bindNoWalletSuccessorFromV2(
  input,
  "operation_alias",
);

/** Structural alias successor only; it does not prove canonical-effect reachability/COW. */
export const bindOwnerRepositoryOperationAliasSuccessorRootV3 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => bindNoWalletSuccessor(
  input,
  "operation_alias",
);

/** Structural one-key repair successor only; no persisted corruption is authorized here. */
export const bindOwnerRepositoryMissingIndexRepairSuccessorRootV3FromV2 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => bindNoWalletSuccessorFromV2(
  input,
  "missing_index_entry",
);

/** Structural one-key repair successor only; repository admission/COW proof are separate. */
export const bindOwnerRepositoryMissingIndexRepairSuccessorRootV3 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => bindNoWalletSuccessor(
  input,
  "missing_index_entry",
);

const rolloverBody = (
  root: OwnerRepositoryRootV2 | OwnerRepositoryRootV3,
  anchor: OwnerRepositoryWalletCheckpointAnchorV1,
  targetGeneration: number,
): Omit<OwnerRepositoryRootV3, "rootFingerprint"> => {
  if (!safe(targetGeneration) || targetGeneration <= root.currentGeneration ||
    root.repositoryRevision === Number.MAX_SAFE_INTEGER) return invalid();
  return {
    schemaVersion: "learning-v2-owner-repository-root.v3",
    accountScopeHash: root.accountScopeHash,
    currentGeneration: targetGeneration,
    repositoryRevision: root.repositoryRevision + 1,
    journalSequence: root.journalSequence,
    previousRootFingerprint: root.rootFingerprint,
    journalHeadRef: root.journalHeadRef,
    walletStateRef: root.walletStateRef,
    courseStateManifestRef: root.courseStateManifestRef,
    operationIndexManifestRef: root.operationIndexManifestRef,
    subjectIndexManifestRef: root.subjectIndexManifestRef,
    receiptIndexManifestRef: root.receiptIndexManifestRef,
    walletCheckpointAnchor: anchor,
    walletCheckpointLagRootTransitions: root.repositoryRevision + 1 -
      anchor.checkpointRepositoryRevision,
    walletCheckpointPromotionRequired: true,
  };
};

/** Pure structural rollover; it does not establish durable checkpoint/current-root authority. */
export const advanceOwnerRepositoryRootV3GenerationFromV2 = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, ["adoptionBase", "targetGeneration"]);
  if (!isRecord(request.adoptionBase) || !ADOPTION_BASES.has(request.adoptionBase)) return invalid();
  const base = request.adoptionBase as unknown as OwnerRepositoryRootV3AdoptionBase;
  const created = materialize(rolloverBody(
    base.rootBefore.root,
    base.anchorCandidate.anchor,
    request.targetGeneration as number,
  ));
  return parseOwnerRepositoryRootV3(created.root, created.root.accountScopeHash);
};

/** Pure structural rollover; only a repository-admitted result may later reach CAS. */
export const advanceOwnerRepositoryRootV3Generation = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, ["rootBefore", "targetGeneration", "promotedCheckpointAnchor"]);
  let detached: unknown;
  try { detached = detachBoundedWalletJson(request.rootBefore, "owner_repository_root_v3_invalid"); }
  catch { return invalid(); }
  if (!isRecord(detached) || typeof detached.accountScopeHash !== "string") return invalid();
  const root = parseOwnerRepositoryRootV3(detached, detached.accountScopeHash).root;
  const anchor = anchorForV3Successor(root, request.promotedCheckpointAnchor);
  const created = materialize(rolloverBody(root, anchor, request.targetGeneration as number));
  return parseOwnerRepositoryRootV3(created.root, root.accountScopeHash);
};

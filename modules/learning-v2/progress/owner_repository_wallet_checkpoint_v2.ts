import { detachBoundedWalletJson } from "../contracts/wallet";
import {
  canonicalJsonV1,
  sha256Utf8,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  parseOwnerRepositoryCourseManifestBlob,
  type OwnerRepositoryCourseManifestBlob,
} from "./owner_repository_course_manifest";
import {
  parseOwnerRepositoryEconomicManifestBlob,
  type OwnerRepositoryEconomicIndexKind,
  type OwnerRepositoryEconomicManifestBlob,
} from "./owner_repository_economic_manifest";
import type {
  OwnerRepositoryRadixNodeRefV1,
  OwnerRepositoryRadixNodeResolver,
} from "./owner_repository_radix";
import {
  materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate,
  parseOwnerRepositoryRootV3,
  type OwnerRepositoryRootV3,
  type OwnerRepositoryRootV3Materialization,
  type OwnerRepositoryWalletCheckpointAnchorCandidateV1,
  type OwnerRepositoryWalletCheckpointAnchorV1,
} from "./owner_repository_root_v3";
import {
  parseOwnerRepositoryWalletStateBlob,
  type OwnerRepositoryWalletStateBlobV1,
} from "./owner_repository_wallet_blob";

export interface OwnerRepositoryWalletCheckpointV2 {
  readonly schemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v2";
  readonly checkpointKind: "wallet_credit_only";
  readonly accountScopeHash: string;
  readonly checkpointRoot: OwnerRepositoryRootV3;
  readonly checkpointRootFingerprint: string;
  readonly previousCheckpointAnchor: OwnerRepositoryWalletCheckpointAnchorV1;
  readonly currentGeneration: number;
  readonly repositoryRevision: number;
  readonly journalSequence: number;
  readonly windowRootTransitions: number;
  readonly walletCreditTransitions: number;
  readonly generationRolloverTransitions: number;
  readonly walletStateFingerprint: string;
  readonly walletRevision: number;
  readonly canonicalEffectCount: number;
  readonly operationEntryCount: number;
  readonly subjectEntryCount: number;
  readonly receiptEntryCount: number;
  readonly checkpointFingerprint: string;
}

export interface OwnerRepositoryWalletCheckpointV2Materialization {
  readonly checkpoint: OwnerRepositoryWalletCheckpointV2;
  readonly key: string;
  readonly encoded: string;
  readonly authority: "structural_candidate";
}

const MAX_BYTES = 64 * 1024;
const MAX_EXTERNAL_READS = 64;
const MAX_EXTERNAL_BYTES = 64 * 1024 * 1024;
const ACCOUNT = /^[a-f0-9]{16,128}$/;
const HASH = /^[a-f0-9]{64}$/;
const KEYS = [
  "schemaVersion",
  "checkpointKind",
  "accountScopeHash",
  "checkpointRoot",
  "checkpointRootFingerprint",
  "previousCheckpointAnchor",
  "currentGeneration",
  "repositoryRevision",
  "journalSequence",
  "windowRootTransitions",
  "walletCreditTransitions",
  "generationRolloverTransitions",
  "walletStateFingerprint",
  "walletRevision",
  "canonicalEffectCount",
  "operationEntryCount",
  "subjectEntryCount",
  "receiptEntryCount",
  "checkpointFingerprint",
] as const;
const CHECKPOINTS = new WeakSet<object>();
const PROJECTION_MATCHED = new WeakSet<object>();
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const invalid = (): never => {
  throw new Error("owner_repository_wallet_checkpoint_v2_invalid");
};
const mismatch = (): never => {
  throw new Error("owner_repository_wallet_checkpoint_v2_mismatch");
};
const indeterminate = (): never => {
  throw new Error("owner_repository_wallet_checkpoint_v2_indeterminate");
};
const overflow = (): never => {
  throw new Error("owner_repository_wallet_checkpoint_v2_overflow");
};
const safe = (value: unknown): value is number =>
  Number.isSafeInteger(value) && !Object.is(value, -0) && Number(value) >= 0;
const checkedAdd = (left: number, right: number): number => {
  const result = left + right;
  if (!Number.isSafeInteger(result)) return overflow();
  return result;
};
const checkedDouble = (value: number): number => checkedAdd(value, value);
const same = (left: unknown, right: unknown): boolean =>
  canonicalJsonV1(left) === canonicalJsonV1(right);
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value))
    return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>))
    deepFreeze(child);
  return value;
};
const readRecord = (
  input: unknown,
  keys: readonly string[],
): Readonly<Record<string, unknown>> => {
  if (!isRecord(input) || Object.getPrototypeOf(input) !== Object.prototype)
    return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(input);
  const ownKeys = Reflect.ownKeys(descriptors);
  if (
    ownKeys.length !== keys.length ||
    ownKeys.some((key) => typeof key !== "string" || !keys.includes(key)) ||
    keys.some((key) => {
      const descriptor = descriptors[key];
      return !descriptor || !("value" in descriptor) || !descriptor.enumerable;
    })
  )
    return invalid();
  const result = Object.create(null) as Record<string, unknown>;
  for (const key of keys) result[key] = descriptors[key].value;
  return result;
};
export const ownerRepositoryWalletCheckpointV2Key = (
  accountScopeHash: string,
  rootFingerprint: string,
): string => {
  if (
    typeof accountScopeHash !== "string" ||
    !ACCOUNT.test(accountScopeHash) ||
    typeof rootFingerprint !== "string" ||
    !HASH.test(rootFingerprint)
  )
    return invalid();
  return `learning_v2_owner_repository:v1:${accountScopeHash}:wallet-checkpoint:${rootFingerprint}`;
};

const parseRootCandidate = (
  input: unknown,
): OwnerRepositoryRootV3Materialization => {
  const request = readRecord(input, ["root", "encoded", "authority"]);
  if (
    request.authority !== "structural_candidate" ||
    typeof request.encoded !== "string"
  ) {
    return invalid();
  }
  let detached: unknown;
  try {
    detached = detachBoundedWalletJson(
      request.root,
      "owner_repository_wallet_checkpoint_v2_invalid",
    );
  } catch {
    return invalid();
  }
  if (!isRecord(detached) || typeof detached.accountScopeHash !== "string")
    return invalid();
  let parsed: OwnerRepositoryRootV3Materialization;
  try {
    parsed = parseOwnerRepositoryRootV3(detached, detached.accountScopeHash);
  } catch {
    return invalid();
  }
  if (parsed.encoded !== request.encoded) return invalid();
  return parsed;
};

const materializeBody = (
  body: Omit<OwnerRepositoryWalletCheckpointV2, "checkpointFingerprint">,
): OwnerRepositoryWalletCheckpointV2Materialization => {
  const checkpoint = deepFreeze({
    ...body,
    checkpointFingerprint: sha256Utf8(canonicalJsonV1(body)),
  });
  const encoded = canonicalJsonV1(checkpoint);
  if (utf8ByteLengthV1(encoded) > MAX_BYTES) return overflow();
  const result = deepFreeze({
    checkpoint,
    key: ownerRepositoryWalletCheckpointV2Key(
      checkpoint.accountScopeHash,
      checkpoint.checkpointRootFingerprint,
    ),
    encoded,
    authority: "structural_candidate" as const,
  });
  CHECKPOINTS.add(result);
  return result;
};

const assertClosedRoot = (
  root: OwnerRepositoryRootV3,
): Readonly<{
  rootTransitions: number;
  walletCredits: number;
  rollovers: number;
}> => {
  const rootTransitions =
    root.repositoryRevision -
    root.walletCheckpointAnchor.checkpointRepositoryRevision;
  const walletCredits =
    root.journalSequence -
    root.walletCheckpointAnchor.checkpointJournalSequence;
  const rollovers = rootTransitions - walletCredits;
  if (
    !root.walletCheckpointPromotionRequired ||
    rootTransitions < 1 ||
    rootTransitions > 16 ||
    walletCredits < 0 ||
    walletCredits > rootTransitions ||
    rollovers < 0 ||
    rollovers > 1 ||
    root.walletCheckpointLagRootTransitions !== rootTransitions ||
    (rootTransitions !== 16 && rollovers !== 1)
  )
    return invalid();
  return { rootTransitions, walletCredits, rollovers };
};

/** Structural parser only; it does not admit checkpoint ancestry or current storage authority. */
export const parseOwnerRepositoryWalletCheckpointV2 = (
  input: unknown,
): OwnerRepositoryWalletCheckpointV2Materialization => {
  let request: Readonly<Record<string, unknown>>;
  try {
    request = readRecord(input, [
      "accountScopeHash",
      "checkpointRoot",
      "key",
      "raw",
      "walletStateBlob",
    ]);
  } catch {
    return indeterminate();
  }
  if (
    typeof request.accountScopeHash !== "string" ||
    !ACCOUNT.test(request.accountScopeHash) ||
    typeof request.key !== "string" ||
    typeof request.raw !== "string"
  )
    return indeterminate();
  let detachedRoot: unknown;
  let root: OwnerRepositoryRootV3;
  let wallet: ReturnType<typeof parseOwnerRepositoryWalletStateBlob>;
  try {
    detachedRoot = detachBoundedWalletJson(
      request.checkpointRoot,
      "owner_repository_wallet_checkpoint_v2_indeterminate",
    );
    if (!isRecord(detachedRoot)) return indeterminate();
    root = parseOwnerRepositoryRootV3(
      detachedRoot,
      request.accountScopeHash,
    ).root;
    const suppliedWallet = readRecord(request.walletStateBlob, [
      "ref",
      "encoded",
    ]);
    wallet = parseOwnerRepositoryWalletStateBlob({
      accountScopeHash: request.accountScopeHash,
      ref: suppliedWallet.ref,
      raw: suppliedWallet.encoded,
    });
  } catch {
    return indeterminate();
  }
  let detached: unknown;
  try {
    if (utf8ByteLengthV1(request.raw) > MAX_BYTES) return indeterminate();
    detached = detachBoundedWalletJson(
      JSON.parse(request.raw),
      "owner_repository_wallet_checkpoint_v2_indeterminate",
    );
    if (canonicalJsonV1(detached) !== request.raw) return indeterminate();
  } catch {
    return indeterminate();
  }
  if (
    !isRecord(detached) ||
    Reflect.ownKeys(detached).length !== KEYS.length ||
    !Reflect.ownKeys(detached).every(
      (key) =>
        typeof key === "string" && (KEYS as readonly string[]).includes(key),
    ) ||
    detached.schemaVersion !==
      "learning-v2-owner-repository-wallet-checkpoint.v2" ||
    detached.checkpointKind !== "wallet_credit_only" ||
    detached.accountScopeHash !== request.accountScopeHash ||
    typeof detached.checkpointRootFingerprint !== "string" ||
    !HASH.test(detached.checkpointRootFingerprint) ||
    typeof detached.walletStateFingerprint !== "string" ||
    !HASH.test(detached.walletStateFingerprint) ||
    typeof detached.checkpointFingerprint !== "string" ||
    !HASH.test(detached.checkpointFingerprint)
  )
    return indeterminate();
  const numbers = [
    "currentGeneration",
    "repositoryRevision",
    "journalSequence",
    "windowRootTransitions",
    "walletCreditTransitions",
    "generationRolloverTransitions",
    "walletRevision",
    "canonicalEffectCount",
    "operationEntryCount",
    "subjectEntryCount",
    "receiptEntryCount",
  ] as const;
  if (numbers.some((key) => !safe(detached[key]))) return indeterminate();
  let window: ReturnType<typeof assertClosedRoot>;
  let expectedOperationEntryCount: number;
  try {
    window = assertClosedRoot(root);
    expectedOperationEntryCount = checkedDouble(root.journalSequence);
  } catch {
    return indeterminate();
  }
  const canonicalEffectCount = root.journalSequence;
  if (
    !same(detached.checkpointRoot, root) ||
    !same(detached.previousCheckpointAnchor, root.walletCheckpointAnchor) ||
    detached.checkpointRootFingerprint !== root.rootFingerprint ||
    detached.currentGeneration !== root.currentGeneration ||
    detached.repositoryRevision !== root.repositoryRevision ||
    detached.journalSequence !== root.journalSequence ||
    detached.windowRootTransitions !== window.rootTransitions ||
    detached.walletCreditTransitions !== window.walletCredits ||
    detached.generationRolloverTransitions !== window.rollovers ||
    detached.walletStateFingerprint !== wallet.state.stateFingerprint ||
    detached.walletRevision !== wallet.state.revision ||
    detached.walletRevision !== root.journalSequence ||
    detached.canonicalEffectCount !== canonicalEffectCount ||
    detached.operationEntryCount !== expectedOperationEntryCount ||
    detached.subjectEntryCount !== canonicalEffectCount ||
    detached.receiptEntryCount !== canonicalEffectCount ||
    request.key !==
      ownerRepositoryWalletCheckpointV2Key(
        root.accountScopeHash,
        root.rootFingerprint,
      )
  ) {
    return indeterminate();
  }
  const body = { ...detached } as Record<string, unknown>;
  delete body.checkpointFingerprint;
  if (sha256Utf8(canonicalJsonV1(body)) !== detached.checkpointFingerprint)
    return indeterminate();
  const result = deepFreeze({
    checkpoint: detached as unknown as OwnerRepositoryWalletCheckpointV2,
    key: request.key,
    encoded: request.raw,
    authority: "structural_candidate" as const,
  });
  CHECKPOINTS.add(result);
  return result;
};

const parseManifest = async <K extends OwnerRepositoryEconomicIndexKind>(
  accountScopeHash: string,
  indexKind: K,
  blob: unknown,
  resolveNode: OwnerRepositoryRadixNodeResolver,
) => {
  const supplied = readRecord(blob, ["ref", "encoded"]);
  return parseOwnerRepositoryEconomicManifestBlob({
    accountScopeHash,
    indexKind,
    ref: supplied.ref as OwnerRepositoryEconomicManifestBlob<K>["ref"],
    raw: supplied.encoded,
    resolveNode,
  });
};

/** Exact current projection match; still not a durable ancestry/storage admission. */
export const matchOwnerRepositoryWalletCheckpointV2Projection = async (
  input: unknown,
): Promise<OwnerRepositoryWalletCheckpointV2Materialization> => {
  const request = readRecord(input, [
    "checkpoint",
    "walletStateBlob",
    "courseManifestBlob",
    "operationManifestBlob",
    "subjectManifestBlob",
    "receiptManifestBlob",
    "resolveNode",
  ]);
  if (
    !isRecord(request.checkpoint) ||
    !CHECKPOINTS.has(request.checkpoint) ||
    typeof request.resolveNode !== "function"
  )
    return invalid();
  const checkpoint =
    request.checkpoint as unknown as OwnerRepositoryWalletCheckpointV2Materialization;
  const root = checkpoint.checkpoint.checkpointRoot;
  const walletBlob = readRecord(request.walletStateBlob, ["ref", "encoded"]);
  const courseBlob = readRecord(request.courseManifestBlob, ["ref", "encoded"]);
  const cache = new Map<string, unknown>();
  let reads = 0;
  let bytes = 0;
  const resolveNode: OwnerRepositoryRadixNodeResolver = async (
    ref: OwnerRepositoryRadixNodeRefV1,
  ) => {
    if (cache.has(ref.blobKey)) return cache.get(ref.blobKey);
    if (reads >= MAX_EXTERNAL_READS) return overflow();
    let raw: unknown;
    try {
      raw = await (request.resolveNode as OwnerRepositoryRadixNodeResolver)(
        ref,
      );
    } catch {
      return indeterminate();
    }
    reads += 1;
    if (typeof raw === "string") {
      bytes = checkedAdd(bytes, utf8ByteLengthV1(raw));
      if (bytes > MAX_EXTERNAL_BYTES) return overflow();
    }
    cache.set(ref.blobKey, raw);
    return raw;
  };
  try {
    const wallet = parseOwnerRepositoryWalletStateBlob({
      accountScopeHash: root.accountScopeHash,
      ref: walletBlob.ref,
      raw: walletBlob.encoded,
    });
    const course = await parseOwnerRepositoryCourseManifestBlob({
      accountScopeHash: root.accountScopeHash,
      ref: courseBlob.ref as OwnerRepositoryCourseManifestBlob["ref"],
      raw: courseBlob.encoded,
      resolveNode,
    });
    const operation = await parseManifest(
      root.accountScopeHash,
      "operation",
      request.operationManifestBlob,
      resolveNode,
    );
    const subject = await parseManifest(
      root.accountScopeHash,
      "subject",
      request.subjectManifestBlob,
      resolveNode,
    );
    const receipt = await parseManifest(
      root.accountScopeHash,
      "receipt",
      request.receiptManifestBlob,
      resolveNode,
    );
    const expected = checkpoint.checkpoint;
    if (
      !same(wallet.blob.ref, root.walletStateRef) ||
      !same(course.manifestBlob.ref, root.courseStateManifestRef) ||
      !same(operation.sourceManifestBlob.ref, root.operationIndexManifestRef) ||
      !same(subject.sourceManifestBlob.ref, root.subjectIndexManifestRef) ||
      !same(receipt.sourceManifestBlob.ref, root.receiptIndexManifestRef) ||
      wallet.state.stateFingerprint !== expected.walletStateFingerprint ||
      wallet.state.revision !== expected.walletRevision ||
      course.manifest.entryCount !== 0 ||
      operation.manifest.entryCount !== expected.operationEntryCount ||
      subject.manifest.entryCount !== expected.subjectEntryCount ||
      receipt.manifest.entryCount !== expected.receiptEntryCount
    )
      return mismatch();
  } catch (error) {
    if (error instanceof Error && error.message.includes("overflow"))
      throw error;
    return indeterminate();
  }
  PROJECTION_MATCHED.add(checkpoint);
  return checkpoint;
};

/**
 * Materializes and immediately projection-matches a closed RootV3 checkpoint candidate.
 * The result is still structural-only until the future bounded history verifier admits it.
 */
export const materializeOwnerRepositoryWalletCheckpointV2 = async (
  input: unknown,
): Promise<OwnerRepositoryWalletCheckpointV2Materialization> => {
  const request = readRecord(input, [
    "checkpointRoot",
    "walletStateBlob",
    "courseManifestBlob",
    "operationManifestBlob",
    "subjectManifestBlob",
    "receiptManifestBlob",
    "resolveNode",
  ]);
  const rootCandidate = parseRootCandidate(request.checkpointRoot);
  const root = rootCandidate.root;
  const window = assertClosedRoot(root);
  const walletBlob = readRecord(request.walletStateBlob, ["ref", "encoded"]);
  let wallet: ReturnType<typeof parseOwnerRepositoryWalletStateBlob>;
  try {
    wallet = parseOwnerRepositoryWalletStateBlob({
      accountScopeHash: root.accountScopeHash,
      ref: walletBlob.ref,
      raw: walletBlob.encoded,
    });
  } catch {
    return invalid();
  }
  if (
    !same(wallet.blob.ref, root.walletStateRef) ||
    wallet.state.revision !== root.journalSequence
  ) {
    return mismatch();
  }
  const canonicalEffectCount = root.journalSequence;
  const created = materializeBody({
    schemaVersion: "learning-v2-owner-repository-wallet-checkpoint.v2",
    checkpointKind: "wallet_credit_only",
    accountScopeHash: root.accountScopeHash,
    checkpointRoot: root,
    checkpointRootFingerprint: root.rootFingerprint,
    previousCheckpointAnchor: root.walletCheckpointAnchor,
    currentGeneration: root.currentGeneration,
    repositoryRevision: root.repositoryRevision,
    journalSequence: root.journalSequence,
    windowRootTransitions: window.rootTransitions,
    walletCreditTransitions: window.walletCredits,
    generationRolloverTransitions: window.rollovers,
    walletStateFingerprint: wallet.state.stateFingerprint,
    walletRevision: wallet.state.revision,
    canonicalEffectCount,
    operationEntryCount: checkedDouble(canonicalEffectCount),
    subjectEntryCount: canonicalEffectCount,
    receiptEntryCount: canonicalEffectCount,
  });
  const parsed = parseOwnerRepositoryWalletCheckpointV2({
    accountScopeHash: root.accountScopeHash,
    checkpointRoot: root,
    key: created.key,
    raw: created.encoded,
    walletStateBlob: request.walletStateBlob,
  });
  return matchOwnerRepositoryWalletCheckpointV2Projection({
    checkpoint: parsed,
    walletStateBlob: request.walletStateBlob,
    courseManifestBlob: request.courseManifestBlob,
    operationManifestBlob: request.operationManifestBlob,
    subjectManifestBlob: request.subjectManifestBlob,
    receiptManifestBlob: request.receiptManifestBlob,
    resolveNode: request.resolveNode,
  });
};

/** Converts only an exact projection-matched Checkpoint V2 into a RootV3 anchor candidate. */
export const createOwnerRepositoryWalletCheckpointV2AnchorCandidate = (
  input: unknown,
): OwnerRepositoryWalletCheckpointAnchorCandidateV1 => {
  const request = readRecord(input, ["checkpoint"]);
  if (
    !isRecord(request.checkpoint) ||
    !CHECKPOINTS.has(request.checkpoint) ||
    !PROJECTION_MATCHED.has(request.checkpoint)
  )
    return invalid();
  const checkpoint =
    request.checkpoint as unknown as OwnerRepositoryWalletCheckpointV2Materialization;
  const value = checkpoint.checkpoint;
  return materializeOwnerRepositoryWalletCheckpointV2AnchorCandidate({
    schemaVersion: "learning-v2-owner-repository-wallet-checkpoint-anchor.v1",
    checkpointSchemaVersion:
      "learning-v2-owner-repository-wallet-checkpoint.v2",
    checkpointKind: "wallet_credit_only",
    accountScopeHash: value.accountScopeHash,
    checkpointKey: checkpoint.key,
    checkpointRootFingerprint: value.checkpointRootFingerprint,
    checkpointFingerprint: value.checkpointFingerprint,
    checkpointCurrentGeneration: value.currentGeneration,
    checkpointRepositoryRevision: value.repositoryRevision,
    checkpointJournalSequence: value.journalSequence,
    bootstrapOrigin: null,
  });
};

/** Runtime capability predicate for the future repository-window verifier. */
export const isOwnerRepositoryWalletCheckpointV2ProjectionMatched = (
  value: unknown,
): value is OwnerRepositoryWalletCheckpointV2Materialization =>
  isRecord(value) && CHECKPOINTS.has(value) && PROJECTION_MATCHED.has(value);

import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  createLesson1LocalProgressStore,
  type Lesson1ResultInput,
} from "./lesson1_local_progress";
import {
  createProgressOutbox,
  progressOutboxPayloadFingerprint,
} from "./progress_outbox";
import {
  parseRequiredSessionCompletionEnvelope,
  requiredSessionCompletionMutationId,
  type RequiredSessionCompletionEnvelopeV3,
} from "./required_session_completion_envelope";
import {
  progressAccountKey,
  type ProgressAccountScope,
  type ProgressGenerationGuard,
  type ProgressStorage,
} from "./progress_store";
import { withProgressStorageLock } from "./progress_storage_lock";
import { createRequiredSessionSpoolIndex } from "./required_session_spool_index";

interface RequiredSessionLocalCommitEntryV1 {
  readonly schemaVersion: "learning-v2-required-session-local-commit-entry.v1";
  readonly mutationId: string;
  readonly payloadFingerprint: string;
  readonly completionEnvelope: RequiredSessionCompletionEnvelopeV3;
  readonly localProgressOperation: Lesson1ResultInput;
  readonly entryFingerprint: string;
}

interface RequiredSessionLocalCommitJournalV1 {
  readonly schemaVersion: "learning-v2-required-session-local-commit-journal.v1";
  readonly accountKey: string;
  readonly entries: readonly RequiredSessionLocalCommitEntryV1[];
  readonly journalFingerprint: string;
}

export interface RequiredSessionLocalCommitResult {
  readonly mutationId: string;
  readonly payloadFingerprint: string;
}

const ENTRY_BODY_KEYS = [
  "schemaVersion", "mutationId", "payloadFingerprint", "completionEnvelope",
  "localProgressOperation",
] as const;
const ENTRY_KEYS = [...ENTRY_BODY_KEYS, "entryFingerprint"] as const;
const JOURNAL_BODY_KEYS = ["schemaVersion", "accountKey", "entries"] as const;
const JOURNAL_KEYS = [...JOURNAL_BODY_KEYS, "journalFingerprint"] as const;
const OPERATION_KEYS = ["operationId", "sessionId", "status", "awarded"] as const;
const AWARD_KEYS = ["xp", "shards"] as const;
const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_LEGACY_PENDING_COMMITS = 16;
const MAX_JOURNAL_BYTES = 1024 * 1024;
const MAX_ENTRY_BYTES = 96 * 1024;
const MAX_LEGACY_INDEX_SCAN_KEYS = 4_096;
const MAX_LEGACY_GLOBAL_SCAN_KEYS = 16_384;
const MAX_DRAIN_ENTRIES = 128;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === "string" && keys.includes(key));
};
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const fail = (code = "required_session_local_commit_corrupt"): never => {
  throw new Error(code);
};
const journalKey = (scope: ProgressAccountScope): string =>
  `v2:required-session-local-commit:v1:${progressAccountKey(scope)}`;
const entryPrefix = (scope: ProgressAccountScope): string =>
  `v2:required-session-local-commit:v2:${progressAccountKey(scope)}:`;
const entryKey = (scope: ProgressAccountScope, mutationId: string): string =>
  `${entryPrefix(scope)}${encodeURIComponent(mutationId)}`;
const prepareKey = (scope: ProgressAccountScope): string =>
  `v2:required-session-local-commit:v3:${progressAccountKey(scope)}:prepare`;
const legacyIndexMarkerKey = (scope: ProgressAccountScope): string =>
  `v2:required-session-local-commit-index:v1:${progressAccountKey(scope)}:legacy-scan-complete`;
const legacyIndexMarkerValue = (scope: ProgressAccountScope): string =>
  `learning-v2-required-session-spool-index-legacy-scan-complete.v1:${progressAccountKey(scope)}`;
const lockKey = (scope: ProgressAccountScope): string =>
  `required-session-local-commit:${progressAccountKey(scope)}`;

const localProgressOperationFor = (
  envelope: RequiredSessionCompletionEnvelopeV3,
): Lesson1ResultInput => ({
  operationId: `required-session-local:${hashCanonicalBody({
    schemaVersion: "learning-v2-required-session-local-progress-operation.v1",
    accountScopeHash: envelope.accountScopeHash,
    accountGeneration: envelope.accountGeneration,
    seasonId: envelope.seasonId,
    studyTarget: envelope.studyTarget,
    learnerSourceLocale: envelope.learnerSourceLocale,
    localSessionId: envelope.localSessionId,
  })}`,
  sessionId: envelope.localSessionId,
  status: "completed",
  awarded: { xp: 0, shards: 0 },
});

const parseOperation = (input: unknown): Lesson1ResultInput => {
  if (!isRecord(input) || !exactKeys(input, OPERATION_KEYS) ||
    typeof input.operationId !== "string" || !ID.test(input.operationId) ||
    typeof input.sessionId !== "string" || !ID.test(input.sessionId) ||
    input.status !== "completed" || !isRecord(input.awarded) ||
    !exactKeys(input.awarded, AWARD_KEYS) || input.awarded.xp !== 0 ||
    input.awarded.shards !== 0) return fail();
  return deepFreeze({
    operationId: input.operationId,
    sessionId: input.sessionId,
    status: "completed",
    awarded: { xp: 0, shards: 0 },
  });
};

const parseEntry = (input: unknown): RequiredSessionLocalCommitEntryV1 => {
  if (!isRecord(input) || !exactKeys(input, ENTRY_KEYS) ||
    input.schemaVersion !== "learning-v2-required-session-local-commit-entry.v1" ||
    typeof input.mutationId !== "string" || !ID.test(input.mutationId) ||
    typeof input.payloadFingerprint !== "string" || !HASH.test(input.payloadFingerprint) ||
    typeof input.entryFingerprint !== "string" || !HASH.test(input.entryFingerprint)) return fail();
  let completionEnvelope: RequiredSessionCompletionEnvelopeV3;
  try { completionEnvelope = parseRequiredSessionCompletionEnvelope(input.completionEnvelope); }
  catch { return fail(); }
  const localProgressOperation = parseOperation(input.localProgressOperation);
  if (requiredSessionCompletionMutationId(completionEnvelope) !== input.mutationId ||
    progressOutboxPayloadFingerprint(completionEnvelope) !== input.payloadFingerprint ||
    canonicalJsonV1(localProgressOperation) !== canonicalJsonV1(
      localProgressOperationFor(completionEnvelope),
    )) return fail();
  const body = {
    schemaVersion: "learning-v2-required-session-local-commit-entry.v1" as const,
    mutationId: input.mutationId,
    payloadFingerprint: input.payloadFingerprint,
    completionEnvelope,
    localProgressOperation,
  };
  if (hashCanonicalBody(body) !== input.entryFingerprint) return fail();
  return deepFreeze({ ...body, entryFingerprint: input.entryFingerprint });
};

const emptyJournal = (accountKey: string): RequiredSessionLocalCommitJournalV1 => {
  const body = {
    schemaVersion: "learning-v2-required-session-local-commit-journal.v1" as const,
    accountKey,
    entries: Object.freeze([]) as readonly RequiredSessionLocalCommitEntryV1[],
  };
  return deepFreeze({ ...body, journalFingerprint: hashCanonicalBody(body) });
};

const encodeJournal = (
  accountKey: string,
  entries: readonly RequiredSessionLocalCommitEntryV1[],
): string => {
  const body = {
    schemaVersion: "learning-v2-required-session-local-commit-journal.v1" as const,
    accountKey,
    entries: Object.freeze([...entries]),
  };
  const encoded = canonicalJsonV1({ ...body, journalFingerprint: hashCanonicalBody(body) });
  if (encoded.length > MAX_JOURNAL_BYTES || utf8ByteLengthV1(encoded) > MAX_JOURNAL_BYTES) {
    fail("required_session_local_commit_overflow");
  }
  return encoded;
};

const parseJournal = (raw: string | null, accountKey: string): RequiredSessionLocalCommitJournalV1 => {
  if (raw === null) return emptyJournal(accountKey);
  if (raw.length > MAX_JOURNAL_BYTES || utf8ByteLengthV1(raw) > MAX_JOURNAL_BYTES) return fail();
  let input: unknown;
  try { input = JSON.parse(raw) as unknown; } catch { return fail(); }
  if (!isRecord(input) || !exactKeys(input, JOURNAL_KEYS) ||
    input.schemaVersion !== "learning-v2-required-session-local-commit-journal.v1" ||
    input.accountKey !== accountKey || !Array.isArray(input.entries) ||
    input.entries.length > MAX_LEGACY_PENDING_COMMITS ||
    typeof input.journalFingerprint !== "string" || !HASH.test(input.journalFingerprint)) {
    return fail();
  }
  const entries = input.entries.map(parseEntry);
  if (new Set(entries.map((entry) => entry.mutationId)).size !== entries.length) return fail();
  const body = {
    schemaVersion: "learning-v2-required-session-local-commit-journal.v1" as const,
    accountKey,
    entries: Object.freeze(entries),
  };
  if (hashCanonicalBody(body) !== input.journalFingerprint ||
    canonicalJsonV1({ ...body, journalFingerprint: input.journalFingerprint }) !== raw) return fail();
  return deepFreeze({ ...body, journalFingerprint: input.journalFingerprint });
};

const assertEnvelopeScope = (
  scope: ProgressAccountScope,
  envelope: RequiredSessionCompletionEnvelopeV3,
): void => {
  if (envelope.accountScopeHash !== scope.accountScopeHash ||
    envelope.accountGeneration !== scope.generation ||
    envelope.seasonId !== scope.seasonId || envelope.studyTarget !== scope.studyTarget ||
    envelope.learnerSourceLocale !== scope.learnerSourceLocale) {
    fail("required_session_local_commit_scope_mismatch");
  }
};

const materializeEntry = (
  scope: ProgressAccountScope,
  input: unknown,
  requiredSessionIds: readonly string[],
): RequiredSessionLocalCommitEntryV1 => {
  let completionEnvelope: RequiredSessionCompletionEnvelopeV3;
  try { completionEnvelope = parseRequiredSessionCompletionEnvelope(input); }
  catch { return fail("required_session_local_commit_invalid"); }
  assertEnvelopeScope(scope, completionEnvelope);
  if (!requiredSessionIds.includes(completionEnvelope.localSessionId)) {
    fail("required_session_local_commit_session_invalid");
  }
  const mutationId = requiredSessionCompletionMutationId(completionEnvelope);
  const body = {
    schemaVersion: "learning-v2-required-session-local-commit-entry.v1" as const,
    mutationId,
    payloadFingerprint: progressOutboxPayloadFingerprint(completionEnvelope),
    completionEnvelope,
    localProgressOperation: localProgressOperationFor(completionEnvelope),
  };
  return parseEntry({ ...body, entryFingerprint: hashCanonicalBody(body) });
};

const encodeEntry = (entry: RequiredSessionLocalCommitEntryV1): string => {
  const encoded = canonicalJsonV1(entry);
  if (utf8ByteLengthV1(encoded) > MAX_ENTRY_BYTES) {
    return fail("required_session_local_commit_overflow");
  }
  return encoded;
};

const parseStoredEntry = (raw: string): RequiredSessionLocalCommitEntryV1 => {
  if (raw.length > MAX_ENTRY_BYTES || utf8ByteLengthV1(raw) > MAX_ENTRY_BYTES) return fail();
  let input: unknown;
  try { input = JSON.parse(raw) as unknown; } catch { return fail(); }
  const entry = parseEntry(input);
  if (canonicalJsonV1(entry) !== raw) return fail();
  return entry;
};

/**
 * One local durable journal projects a completed run into both local progress
 * and the background outbox. A crash after any write is repaired idempotently.
 * No network transport exists in this coordinator.
 */
export const createRequiredSessionLocalCommitCoordinator = (
  storage: ProgressStorage,
  isCurrentGeneration: ProgressGenerationGuard,
  requiredSessionIdsInput: readonly string[],
) => {
  if (requiredSessionIdsInput.length !== 12 ||
    new Set(requiredSessionIdsInput).size !== requiredSessionIdsInput.length ||
    requiredSessionIdsInput.some((sessionId) => !ID.test(sessionId))) {
    fail("required_session_local_commit_session_contract_invalid");
  }
  const requiredSessionIds = Object.freeze([...requiredSessionIdsInput]);
  const removeItemMethod = storage.removeItem;
  const getAllKeysMethod = storage.getAllKeys;
  if (typeof removeItemMethod !== "function" || typeof getAllKeysMethod !== "function") {
    throw new Error("required_session_local_commit_storage_unsupported");
  }
  const removeItem = removeItemMethod.bind(storage);
  const getAllKeys = getAllKeysMethod.bind(storage);
  // Native writes must keep the outer account-transition lease until they
  // actually settle. Never inherit an adapter timeout that abandons a late
  // write after the account wipe lock has been released.
  const durableStorage: ProgressStorage = Object.freeze({
    getItem: storage.getItem.bind(storage),
    setItem: storage.setItem.bind(storage),
    removeItem,
    getAllKeys,
    operationTimeoutMs: null,
  });
  const spoolIndex = createRequiredSessionSpoolIndex(durableStorage, isCurrentGeneration);
  const assertCurrent = (scope: ProgressAccountScope): void => {
    if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
  };
  const writeExactly = async (
    scope: ProgressAccountScope,
    key: string,
    encoded: string,
  ): Promise<void> => {
    assertCurrent(scope);
    const existing = await durableStorage.getItem(key);
    if (existing !== null && existing !== encoded) {
      fail("required_session_local_commit_conflict");
    }
    if (existing === null) await durableStorage.setItem(key, encoded);
    assertCurrent(scope);
    if (await durableStorage.getItem(key) !== encoded) {
      fail("required_session_local_commit_indeterminate");
    }
    assertCurrent(scope);
  };
  const removeExactly = async (scope: ProgressAccountScope, key: string): Promise<void> => {
    assertCurrent(scope);
    await durableStorage.removeItem!(key);
    assertCurrent(scope);
    if (await durableStorage.getItem(key) !== null) {
      fail("required_session_local_commit_indeterminate");
    }
  };
  const replaceExactly = async (
    scope: ProgressAccountScope,
    key: string,
    expected: string,
    encoded: string,
  ): Promise<void> => {
    assertCurrent(scope);
    if (await durableStorage.getItem(key) !== expected) {
      fail("required_session_local_commit_conflict");
    }
    await durableStorage.setItem(key, encoded);
    assertCurrent(scope);
    if (await durableStorage.getItem(key) !== encoded) {
      fail("required_session_local_commit_indeterminate");
    }
  };
  const recoverPreparedEntry = async (scope: ProgressAccountScope): Promise<void> => {
    const key = prepareKey(scope);
    const raw = await durableStorage.getItem(key);
    if (raw === null) return;
    const entry = parseStoredEntry(raw);
    assertEnvelopeScope(scope, entry.completionEnvelope);
    await writeExactly(scope, entryKey(scope, entry.mutationId), raw);
    await spoolIndex.append(scope, entry.mutationId);
    await removeExactly(scope, key);
  };
  const readLegacySpoolKeys = async (scope: ProgressAccountScope): Promise<{
    readonly markerKey: string;
    readonly markerValue: string;
    readonly alreadyComplete: boolean;
    readonly keys: readonly string[];
  }> => {
    assertCurrent(scope);
    const markerKey = legacyIndexMarkerKey(scope);
    const markerValue = legacyIndexMarkerValue(scope);
    const marker = await durableStorage.getItem(markerKey);
    if (marker !== null) {
      if (marker !== markerValue) fail("required_session_local_commit_corrupt");
      return Object.freeze({ markerKey, markerValue, alreadyComplete: true, keys: [] });
    }
    const prefix = entryPrefix(scope);
    const allKeys = await durableStorage.getAllKeys!();
    if (allKeys.length > MAX_LEGACY_GLOBAL_SCAN_KEYS) {
      fail("required_session_local_commit_history_upgrade_required");
    }
    const keys = allKeys
      .filter((key): key is string => typeof key === "string" && key.startsWith(prefix))
      .sort();
    if (keys.length > MAX_LEGACY_INDEX_SCAN_KEYS) {
      fail("required_session_local_commit_history_upgrade_required");
    }
    assertCurrent(scope);
    return Object.freeze({ markerKey, markerValue, alreadyComplete: false, keys });
  };
  const projectLocalProgress = async (
    scope: ProgressAccountScope,
    entry: RequiredSessionLocalCommitEntryV1,
  ): Promise<void> => {
    const localProgress = createLesson1LocalProgressStore(
      durableStorage,
      isCurrentGeneration,
      requiredSessionIds,
    );
    await localProgress.applyResult(scope, entry.localProgressOperation);
    assertCurrent(scope);
    const persistedProgress = await localProgress.load(scope);
    const persistedOperation = persistedProgress.operations[entry.localProgressOperation.operationId];
    if (!persistedOperation || canonicalJsonV1(persistedOperation) !==
      canonicalJsonV1(entry.localProgressOperation)) {
      fail("required_session_local_commit_indeterminate");
    }
  };
  const projectEntry = async (
    scope: ProgressAccountScope,
    key: string,
    expectedEntry?: RequiredSessionLocalCommitEntryV1,
  ): Promise<"projected" | "outbox_full"> => {
    const raw = await durableStorage.getItem(key);
    if (raw === null) {
      const mutationId = decodeURIComponent(key.slice(entryPrefix(scope).length));
      const projected = (await createProgressOutbox(durableStorage, isCurrentGeneration)
        .list(scope)).find((candidate) => candidate.mutationId === mutationId);
      if (projected === undefined) return fail("required_session_local_commit_indeterminate");
      const reconstructed = materializeEntry(scope, projected.payload, requiredSessionIds);
      if (reconstructed.mutationId !== mutationId ||
        reconstructed.payloadFingerprint !== projected.payloadFingerprint) {
        fail("required_session_local_commit_indeterminate");
      }
      await projectLocalProgress(scope, reconstructed);
      return "projected";
    }
    const entry = parseStoredEntry(raw);
    if (key !== entryKey(scope, entry.mutationId)) {
      fail("required_session_local_commit_changed");
    }
    if (expectedEntry && entry.entryFingerprint !== expectedEntry.entryFingerprint) {
      fail("required_session_local_commit_changed");
    }
    assertEnvelopeScope(scope, entry.completionEnvelope);
    const outbox = createProgressOutbox(durableStorage, isCurrentGeneration);
    await projectLocalProgress(scope, entry);
    try {
      await outbox.enqueue(scope, entry.mutationId, entry.completionEnvelope);
    } catch (error) {
      if (error instanceof Error && (
        error.message === "progress_outbox_capacity" ||
        error.message === "progress_outbox_overflow"
      )) {
        return "outbox_full";
      }
      throw error;
    }
    assertCurrent(scope);
    const persistedOutbox = (await outbox.list(scope)).find((candidate) =>
      candidate.mutationId === entry.mutationId);
    if (!persistedOutbox || persistedOutbox.payloadFingerprint !== entry.payloadFingerprint) {
      fail("required_session_local_commit_indeterminate");
    }
    await removeExactly(scope, key);
    return "projected";
  };
  const drainLegacyJournal = async (
    scope: ProgressAccountScope,
    budget: number,
  ): Promise<{ readonly repaired: number; readonly stopped: boolean }> => {
    const accountKey = progressAccountKey(scope);
    const key = journalKey(scope);
    const storedRaw = await durableStorage.getItem(key);
    if (storedRaw === null) return Object.freeze({ repaired: 0, stopped: false });
    let currentRaw = storedRaw;
    let journal = parseJournal(currentRaw, accountKey);
    let repaired = 0;
    while (journal.entries.length > 0 && repaired < budget) {
      const entry = journal.entries[0]!;
      assertEnvelopeScope(scope, entry.completionEnvelope);
      const storedKey = entryKey(scope, entry.mutationId);
      await writeExactly(scope, storedKey, encodeEntry(entry));
      const result = await projectEntry(scope, storedKey, entry);
      if (result === "outbox_full") {
        return Object.freeze({ repaired, stopped: true });
      }
      const remaining = journal.entries.slice(1);
      if (remaining.length === 0) {
        await removeExactly(scope, key);
        journal = emptyJournal(accountKey);
      } else {
        const nextRaw = encodeJournal(accountKey, remaining);
        await replaceExactly(scope, key, currentRaw, nextRaw);
        currentRaw = nextRaw;
        journal = parseJournal(nextRaw, accountKey);
      }
      repaired += 1;
    }
    return Object.freeze({ repaired, stopped: journal.entries.length > 0 });
  };
  const drainLegacySpool = async (
    scope: ProgressAccountScope,
    budget: number,
  ): Promise<{ readonly repaired: number; readonly stopped: boolean }> => {
    const discovery = await readLegacySpoolKeys(scope);
    if (discovery.alreadyComplete) return Object.freeze({ repaired: 0, stopped: false });
    let repaired = 0;
    for (const key of discovery.keys) {
      if (repaired >= budget) return Object.freeze({ repaired, stopped: true });
      const raw = await durableStorage.getItem(key);
      if (raw === null) continue;
      const entry = parseStoredEntry(raw);
      if (key !== entryKey(scope, entry.mutationId)) fail();
      assertEnvelopeScope(scope, entry.completionEnvelope);
      // New V3 writes use the same entry blob prefix, but are already covered
      // by the paged index and must remain behind all true legacy work.
      if (await spoolIndex.has(scope, entry.mutationId)) continue;
      const result = await projectEntry(scope, key, entry);
      if (result === "outbox_full") return Object.freeze({ repaired, stopped: true });
      repaired += 1;
    }
    await writeExactly(scope, discovery.markerKey, discovery.markerValue);
    return Object.freeze({ repaired, stopped: false });
  };
  const drain = async (scope: ProgressAccountScope): Promise<number> => {
    await recoverPreparedEntry(scope);
    let repaired = 0;
    const legacyJournal = await drainLegacyJournal(scope, MAX_DRAIN_ENTRIES);
    repaired += legacyJournal.repaired;
    if (legacyJournal.stopped || repaired >= MAX_DRAIN_ENTRIES) return repaired;
    const legacySpool = await drainLegacySpool(scope, MAX_DRAIN_ENTRIES - repaired);
    repaired += legacySpool.repaired;
    if (legacySpool.stopped || repaired >= MAX_DRAIN_ENTRIES) return repaired;
    while (repaired < MAX_DRAIN_ENTRIES) {
      const page = await spoolIndex.peek(scope);
      if (page.length === 0) break;
      let stopped = false;
      for (const mutationId of page) {
        if (repaired >= MAX_DRAIN_ENTRIES) break;
        const result = await projectEntry(scope, entryKey(scope, mutationId));
        if (result === "outbox_full") {
          stopped = true;
          break;
        }
        await spoolIndex.shift(scope, mutationId);
        repaired += 1;
      }
      if (stopped) break;
    }
    return repaired;
  };
  return {
    async commit(
      scope: ProgressAccountScope,
      envelopeInput: unknown,
    ): Promise<RequiredSessionLocalCommitResult> {
      const entry = materializeEntry(scope, envelopeInput, requiredSessionIds);
      return withProgressStorageLock(lockKey(scope), async () => {
        assertCurrent(scope);
        await recoverPreparedEntry(scope);
        const encoded = encodeEntry(entry);
        // Persist the exact learner completion before any migration/index
        // maintenance write. A process cut at the first durable write must
        // still leave enough bytes to reconstruct the original run.
        await writeExactly(scope, prepareKey(scope), encoded);
        await recoverPreparedEntry(scope);
        // The map projection is immediate even when the transport outbox is
        // full; only the invisible upload remains paged in the durable spool.
        await projectLocalProgress(scope, entry);
        return Object.freeze({
          mutationId: entry.mutationId,
          payloadFingerprint: entry.payloadFingerprint,
        });
      }, null);
    },
    recover(scope: ProgressAccountScope): Promise<number> {
      return withProgressStorageLock(lockKey(scope), async () => {
        assertCurrent(scope);
        return drain(scope);
      }, null);
    },
    async pendingCount(scope: ProgressAccountScope): Promise<number> {
      return withProgressStorageLock(lockKey(scope), async () => {
        assertCurrent(scope);
        await recoverPreparedEntry(scope);
        const legacyRaw = await durableStorage.getItem(journalKey(scope));
        const legacyCount = parseJournal(legacyRaw, progressAccountKey(scope)).entries.length;
        const indexedCount = await spoolIndex.count(scope);
        const marker = await durableStorage.getItem(legacyIndexMarkerKey(scope));
        if (marker !== null && marker !== legacyIndexMarkerValue(scope)) fail();
        return legacyCount + indexedCount + (marker === null ? 1 : 0);
      }, null);
    },
  };
};

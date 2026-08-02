export interface Lesson1ProgressStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

export interface Lesson1ProgressAccountScope {
  readonly stableId: string | null;
  readonly accountScopeHash: string;
  readonly seasonId: string;
  readonly studyTarget: string;
  readonly learnerSourceLocale: string;
  readonly generation: number;
}

export type Lesson1ProgressGenerationGuard = (
  scope: Lesson1ProgressAccountScope,
) => boolean;

export interface Lesson1ResultInput {
  readonly operationId: string;
  readonly sessionId: string;
  readonly status: "in_progress" | "completed";
  /** Values already decided by the owning legacy/result flow; this layer never prices them. */
  readonly awarded: {
    readonly xp: number;
    readonly shards: number;
  };
}

export interface LegacyLesson1SnapshotInput {
  readonly progressJson: string | null;
  readonly bestScoreRaw: string | null;
  readonly passCountRaw: string | null;
  /** Kept byte-for-byte as compatibility evidence; never parsed or rewritten. */
  readonly totalXpRaw: string | null;
  /** Kept byte-for-byte as compatibility evidence; never parsed or rewritten. */
  readonly shardsBalanceRaw: string | null;
}

export interface LegacyLesson1MigrationInput extends LegacyLesson1SnapshotInput {
  readonly operationId: string;
}

type LegacyLessonStatus = "none" | "in_progress" | "completed";
type LegacyMigrationBlockedReason =
  | "legacy_progress_invalid"
  | "legacy_best_score_invalid"
  | "legacy_pass_count_invalid"
  | "legacy_economy_invalid";

export type LegacyLesson1Recognition =
  | {
      readonly status: "recognized";
      readonly legacyLessonStatus: LegacyLessonStatus;
      readonly source: LegacyLesson1SnapshotInput;
    }
  | {
      readonly status: "blocked";
      readonly reason: LegacyMigrationBlockedReason;
      readonly source: LegacyLesson1SnapshotInput;
    };

type StoredMigrationState =
  | { readonly status: "not_checked" }
  | (LegacyLesson1Recognition & { readonly operationId: string });

interface StoredOperation extends Lesson1ResultInput {}

export interface Lesson1LocalProgressState {
  readonly schemaVersion: "learning-v2-lesson1-progress.v1";
  readonly accountKey: string;
  readonly requiredSessionIds: readonly string[];
  readonly lessonStatus: "not_started" | "in_progress" | "completed";
  readonly sessions: Readonly<
    Record<string, "in_progress" | "completed">
  >;
  readonly operations: Readonly<Record<string, StoredOperation>>;
  readonly migration: StoredMigrationState;
  readonly revision: number;
}

export interface Lesson1ResultApplication {
  readonly state: Lesson1LocalProgressState;
  readonly changed: boolean;
  readonly acceptedAward: Lesson1ResultInput["awarded"] | null;
}

export interface Lesson1MigrationApplication {
  readonly state: Lesson1LocalProgressState;
  readonly changed: boolean;
}

const MAX_OPERATIONS = 128;
const MAX_STORAGE_BYTES = 256 * 1024;
const LEGACY_CELL_STATES = new Set([
  "empty",
  "correct",
  "replay_correct",
  "wrong",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmpty = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isNullableString = (value: unknown): value is string | null =>
  value === null || typeof value === "string";

const isOperationId = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9._:-]{1,160}$/.test(value);

const isNonNegativeInteger = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;

const cloneSource = (
  source: LegacyLesson1SnapshotInput,
): LegacyLesson1SnapshotInput => ({
  progressJson: source.progressJson,
  bestScoreRaw: source.bestScoreRaw,
  passCountRaw: source.passCountRaw,
  totalXpRaw: source.totalXpRaw,
  shardsBalanceRaw: source.shardsBalanceRaw,
});

const rawUnsignedIntegerIsValid = (value: string | null): boolean =>
  value === null || /^\d+$/.test(value);

const bestScoreIsValid = (value: string | null): boolean => {
  if (value === null) return true;
  if (!/^\d+(?:\.\d+)?$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 5;
};

const parseLegacyCells = (
  progressJson: string | null,
): readonly string[] | undefined => {
  if (progressJson === null) return [];
  try {
    const parsed: unknown = JSON.parse(progressJson);
    if (
      !Array.isArray(parsed) ||
      parsed.length > 50 ||
      parsed.some(
        (entry) => typeof entry !== "string" || !LEGACY_CELL_STATES.has(entry),
      )
    ) {
      return undefined;
    }
    return parsed;
  } catch {
    return undefined;
  }
};

export const inspectLegacyLesson1Snapshot = (
  input: LegacyLesson1SnapshotInput,
): LegacyLesson1Recognition => {
  const source = cloneSource(input);
  const cells = parseLegacyCells(input.progressJson);
  if (!cells) {
    return { status: "blocked", reason: "legacy_progress_invalid", source };
  }
  if (!bestScoreIsValid(input.bestScoreRaw)) {
    return { status: "blocked", reason: "legacy_best_score_invalid", source };
  }
  if (!rawUnsignedIntegerIsValid(input.passCountRaw)) {
    return { status: "blocked", reason: "legacy_pass_count_invalid", source };
  }
  if (
    !rawUnsignedIntegerIsValid(input.totalXpRaw) ||
    !rawUnsignedIntegerIsValid(input.shardsBalanceRaw)
  ) {
    return { status: "blocked", reason: "legacy_economy_invalid", source };
  }

  const completed =
    cells.length === 50 &&
    cells.every((cell) => cell === "correct" || cell === "replay_correct");
  const bestScore = Number(input.bestScoreRaw ?? "0");
  const passCount = Number(input.passCountRaw ?? "0");
  const started =
    cells.some((cell) => cell !== "empty") || bestScore > 0 || passCount > 0;

  return {
    status: "recognized",
    legacyLessonStatus: completed
      ? "completed"
      : started
        ? "in_progress"
        : "none",
    source,
  };
};

const accountKey = (scope: Lesson1ProgressAccountScope): string => {
  if (!/^[a-f0-9]{16,128}$/.test(scope.accountScopeHash)) {
    throw new Error("lesson1_progress_scope_hash_invalid");
  }
  if (!Number.isSafeInteger(scope.generation) || scope.generation < 0) {
    throw new Error("lesson1_progress_generation_invalid");
  }
  if (
    !isNonEmpty(scope.seasonId) ||
    !isNonEmpty(scope.studyTarget) ||
    !isNonEmpty(scope.learnerSourceLocale)
  ) {
    throw new Error("lesson1_progress_scope_invalid");
  }
  return [
    scope.accountScopeHash,
    scope.seasonId,
    scope.studyTarget,
    scope.learnerSourceLocale,
    `g${scope.generation}`,
  ].join(":");
};

const storageKey = (scope: Lesson1ProgressAccountScope): string =>
  `learning_v2_lesson1_progress:${accountKey(scope)}`;

const validateSessionContract = (sessionIds: readonly string[]): string[] => {
  if (
    sessionIds.length !== 12 ||
    sessionIds.some((sessionId) => !isNonEmpty(sessionId)) ||
    new Set(sessionIds).size !== sessionIds.length
  ) {
    throw new Error("lesson1_session_contract_invalid");
  }
  return [...sessionIds];
};

const createInitialState = (
  scope: Lesson1ProgressAccountScope,
  requiredSessionIds: readonly string[],
): Lesson1LocalProgressState => ({
  schemaVersion: "learning-v2-lesson1-progress.v1",
  accountKey: accountKey(scope),
  requiredSessionIds: [...requiredSessionIds],
  lessonStatus: "not_started",
  sessions: {},
  operations: {},
  migration: { status: "not_checked" },
  revision: 0,
});

const sameArray = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((entry, index) => entry === right[index]);

const isStoredOperation = (value: unknown): value is StoredOperation =>
  isRecord(value) &&
  isOperationId(value.operationId) &&
  isNonEmpty(value.sessionId) &&
  (value.status === "in_progress" || value.status === "completed") &&
  isRecord(value.awarded) &&
  isNonNegativeInteger(value.awarded.xp) &&
  isNonNegativeInteger(value.awarded.shards);

const isStoredLegacySource = (
  value: unknown,
): value is LegacyLesson1SnapshotInput =>
  isRecord(value) &&
  isNullableString(value.progressJson) &&
  isNullableString(value.bestScoreRaw) &&
  isNullableString(value.passCountRaw) &&
  isNullableString(value.totalXpRaw) &&
  isNullableString(value.shardsBalanceRaw);

const isStoredMigration = (value: unknown): value is StoredMigrationState => {
  if (!isRecord(value)) return false;
  if (value.status === "not_checked") {
    return Object.keys(value).length === 1;
  }
  if (!isOperationId(value.operationId) || !isStoredLegacySource(value.source)) {
    return false;
  }
  if (value.status === "recognized") {
    return ["none", "in_progress", "completed"].includes(
      String(value.legacyLessonStatus),
    );
  }
  return (
    value.status === "blocked" &&
    [
      "legacy_progress_invalid",
      "legacy_best_score_invalid",
      "legacy_pass_count_invalid",
      "legacy_economy_invalid",
    ].includes(String(value.reason))
  );
};

const assertStoredState = (
  value: unknown,
  expectedAccountKey: string,
  requiredSessionIds: readonly string[],
): Lesson1LocalProgressState => {
  if (
    !isRecord(value) ||
    value.schemaVersion !== "learning-v2-lesson1-progress.v1" ||
    value.accountKey !== expectedAccountKey ||
    !Array.isArray(value.requiredSessionIds) ||
    !value.requiredSessionIds.every(isNonEmpty) ||
    !sameArray(value.requiredSessionIds, requiredSessionIds) ||
    !isRecord(value.sessions) ||
    !Object.entries(value.sessions).every(
      ([sessionId, status]) =>
        requiredSessionIds.includes(sessionId) &&
        (status === "in_progress" || status === "completed"),
    ) ||
    !isRecord(value.operations) ||
    Object.keys(value.operations).length > MAX_OPERATIONS ||
    !Object.entries(value.operations).every(
      ([operationId, operation]) =>
        operationId ===
          (isStoredOperation(operation) ? operation.operationId : undefined) &&
        isStoredOperation(operation) &&
        requiredSessionIds.includes(operation.sessionId),
    ) ||
    !isStoredMigration(value.migration) ||
    !isNonNegativeInteger(value.revision)
  ) {
    throw new Error("lesson1_progress_corrupt");
  }
  const derived = deriveLessonStatus(
    value.sessions as Record<string, "in_progress" | "completed">,
    requiredSessionIds,
  );
  if (value.lessonStatus !== derived) {
    throw new Error("lesson1_progress_corrupt");
  }
  return value as unknown as Lesson1LocalProgressState;
};

const deriveLessonStatus = (
  sessions: Readonly<Record<string, "in_progress" | "completed">>,
  requiredSessionIds: readonly string[],
): Lesson1LocalProgressState["lessonStatus"] => {
  if (Object.keys(sessions).length === 0) return "not_started";
  return requiredSessionIds.every(
    (sessionId) => sessions[sessionId] === "completed",
  )
    ? "completed"
    : "in_progress";
};

const sameResult = (
  left: StoredOperation,
  right: Lesson1ResultInput,
): boolean =>
  left.operationId === right.operationId &&
  left.sessionId === right.sessionId &&
  left.status === right.status &&
  left.awarded.xp === right.awarded.xp &&
  left.awarded.shards === right.awarded.shards;

const reduceResult = (
  state: Lesson1LocalProgressState,
  input: Lesson1ResultInput,
): Lesson1ResultApplication => {
  if (
    !isOperationId(input.operationId) ||
    !state.requiredSessionIds.includes(input.sessionId) ||
    (input.status !== "in_progress" && input.status !== "completed") ||
    !isNonNegativeInteger(input.awarded.xp) ||
    !isNonNegativeInteger(input.awarded.shards)
  ) {
    throw new Error("lesson1_result_invalid");
  }
  const existing = state.operations[input.operationId];
  if (existing) {
    if (!sameResult(existing, input)) {
      throw new Error("lesson1_operation_conflict");
    }
    return { state, changed: false, acceptedAward: null };
  }
  if (Object.keys(state.operations).length >= MAX_OPERATIONS) {
    throw new Error("lesson1_operation_ledger_full");
  }
  const previousSession = state.sessions[input.sessionId];
  const nextSessions = {
    ...state.sessions,
    [input.sessionId]:
      previousSession === "completed" ? "completed" : input.status,
  };
  const stored: StoredOperation = {
    operationId: input.operationId,
    sessionId: input.sessionId,
    status: input.status,
    awarded: { xp: input.awarded.xp, shards: input.awarded.shards },
  };
  const nextState: Lesson1LocalProgressState = {
    ...state,
    sessions: nextSessions,
    operations: { ...state.operations, [input.operationId]: stored },
    lessonStatus: deriveLessonStatus(nextSessions, state.requiredSessionIds),
    revision: state.revision + 1,
  };
  return {
    state: nextState,
    changed: true,
    acceptedAward: stored.awarded,
  };
};

const sameLegacySource = (
  left: LegacyLesson1SnapshotInput,
  right: LegacyLesson1SnapshotInput,
): boolean =>
  left.progressJson === right.progressJson &&
  left.bestScoreRaw === right.bestScoreRaw &&
  left.passCountRaw === right.passCountRaw &&
  left.totalXpRaw === right.totalXpRaw &&
  left.shardsBalanceRaw === right.shardsBalanceRaw;

const reduceLegacyMigration = (
  state: Lesson1LocalProgressState,
  input: LegacyLesson1MigrationInput,
): Lesson1MigrationApplication => {
  if (!isOperationId(input.operationId)) {
    throw new Error("lesson1_migration_operation_invalid");
  }
  const source = cloneSource(input);
  if (state.migration.status !== "not_checked") {
    if (
      state.migration.operationId === input.operationId &&
      sameLegacySource(state.migration.source, source)
    ) {
      return { state, changed: false };
    }
    throw new Error("lesson1_migration_conflict");
  }
  const recognition = inspectLegacyLesson1Snapshot(source);
  return {
    state: {
      ...state,
      migration: { ...recognition, operationId: input.operationId },
      revision: state.revision + 1,
    },
    changed: true,
  };
};

const storageLocks = new WeakMap<
  Lesson1ProgressStorage,
  Map<string, Promise<void>>
>();

const withStorageLock = async <T>(
  storage: Lesson1ProgressStorage,
  key: string,
  task: () => Promise<T>,
): Promise<T> => {
  const locks = storageLocks.get(storage) ?? new Map<string, Promise<void>>();
  storageLocks.set(storage, locks);
  const prior = locks.get(key) ?? Promise.resolve();
  let release: (() => void) | undefined;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const currentChain = prior.then(() => current);
  locks.set(key, currentChain);
  await prior;
  try {
    return await task();
  } finally {
    release?.();
    if (locks.get(key) === currentChain) locks.delete(key);
  }
};

const encodeState = (state: Lesson1LocalProgressState): string => {
  const encoded = JSON.stringify(state);
  if (encoded.length > MAX_STORAGE_BYTES) {
    throw new Error("lesson1_progress_storage_overflow");
  }
  return encoded;
};

export const createLesson1LocalProgressStore = (
  storage: Lesson1ProgressStorage,
  isCurrentGeneration: Lesson1ProgressGenerationGuard,
  requiredSessionIdsInput: readonly string[],
) => {
  const requiredSessionIds = validateSessionContract(requiredSessionIdsInput);

  const assertGeneration = (scope: Lesson1ProgressAccountScope): void => {
    if (!isCurrentGeneration(scope)) {
      throw new Error("lesson1_progress_generation_stale");
    }
  };

  const load = async (
    scope: Lesson1ProgressAccountScope,
  ): Promise<Lesson1LocalProgressState> => {
    assertGeneration(scope);
    const raw = await storage.getItem(storageKey(scope));
    if (raw === null) return createInitialState(scope, requiredSessionIds);
    if (raw.length > MAX_STORAGE_BYTES) {
      throw new Error("lesson1_progress_corrupt");
    }
    try {
      return assertStoredState(
        JSON.parse(raw) as unknown,
        accountKey(scope),
        requiredSessionIds,
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "lesson1_progress_corrupt"
      ) {
        throw error;
      }
      throw new Error("lesson1_progress_corrupt");
    }
  };

  return {
    load,
    inspectLegacySnapshot: inspectLegacyLesson1Snapshot,
    async applyResult(
      scope: Lesson1ProgressAccountScope,
      input: Lesson1ResultInput,
    ): Promise<Lesson1ResultApplication> {
      assertGeneration(scope);
      const key = storageKey(scope);
      return withStorageLock(storage, key, async () => {
        assertGeneration(scope);
        const application = reduceResult(await load(scope), input);
        if (application.changed) {
          assertGeneration(scope);
          await storage.setItem(key, encodeState(application.state));
        }
        return application;
      });
    },
    async recordLegacySnapshot(
      scope: Lesson1ProgressAccountScope,
      input: LegacyLesson1MigrationInput,
    ): Promise<Lesson1MigrationApplication> {
      assertGeneration(scope);
      const key = storageKey(scope);
      return withStorageLock(storage, key, async () => {
        assertGeneration(scope);
        const application = reduceLegacyMigration(await load(scope), input);
        if (application.changed) {
          assertGeneration(scope);
          await storage.setItem(key, encodeState(application.state));
        }
        return application;
      });
    },
  };
};

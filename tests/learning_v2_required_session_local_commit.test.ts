import type { V2CompiledRequiredSession } from "../modules/learning-v2/content/session_compiler";
import { createLesson1LocalProgressStore } from "../modules/learning-v2/progress/lesson1_local_progress";
import {
  createProgressOutbox,
  progressOutboxPayloadFingerprint,
} from "../modules/learning-v2/progress/progress_outbox";
import {
  deriveLocalOfflineProgressAccountScopeHash,
  LOCAL_OFFLINE_PROGRESS_GENERATION,
} from "../modules/learning-v2/progress/progress_account_scope";
import { canonicalJsonV1, hashCanonicalBody } from "../modules/learning-v2/policies/decision_registry";
import {
  materializeRequiredSessionCompletionEnvelope,
  requiredSessionCompletionMutationId,
} from "../modules/learning-v2/progress/required_session_completion_envelope";
import { createRequiredSessionLocalCommitCoordinator } from "../modules/learning-v2/progress/required_session_local_commit";
import type {
  ProgressGenerationGuard,
  ProgressStorage,
} from "../modules/learning-v2/progress/progress_store";
import { progressAccountKey } from "../modules/learning-v2/progress/progress_store";
import { getLesson1SessionRuntime } from "../modules/learning-v2/runtime/lesson1_session_runtime";

const SESSION_IDS = ["understand", "use", "master"].flatMap((zone) =>
  [1, 2, 3, 4].map((index) => `lesson-1-${zone}-${index}`));
const stableId = "stable-user-1";
const scope = {
  stableId,
  accountScopeHash: deriveLocalOfflineProgressAccountScopeHash(stableId),
  seasonId: "learning-v2",
  studyTarget: "en",
  learnerSourceLocale: "ru",
  generation: LOCAL_OFFLINE_PROGRESS_GENERATION,
};

const envelopeFor = (session: V2CompiledRequiredSession, sessionRunId: string) => {
  const runtime = getLesson1SessionRuntime();
  return materializeRequiredSessionCompletionEnvelope({
    scope,
    episodeId: runtime.payload.episodeId,
    sessionSetId: runtime.sessionSetId,
    sessionSetHash: runtime.sessionSetHash,
    localSessionId: SESSION_IDS[session.ordinal - 1],
    sessionRunId,
    session,
    taskResults: session.cards.map((card) => ({
      taskId: card.cardId,
      disposition: "completed" as const,
      learnerAttempts: 1,
      hintUsed: false,
    })),
  });
};

const localCommitEntryFor = (envelope: ReturnType<typeof envelopeFor>) => {
  const mutationId = requiredSessionCompletionMutationId(envelope);
  const localProgressOperation = {
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
  } as const;
  const body = {
    schemaVersion: "learning-v2-required-session-local-commit-entry.v1" as const,
    mutationId,
    payloadFingerprint: progressOutboxPayloadFingerprint(envelope),
    completionEnvelope: envelope,
    localProgressOperation,
  };
  return { ...body, entryFingerprint: hashCanonicalBody(body) };
};

const backingStorage = () => {
  const values = new Map<string, string>();
  const getAllKeys = jest.fn(async () => [...values.keys()]);
  const storage: ProgressStorage = {
    getItem: async (key) => values.get(key) ?? null,
    setItem: async (key, value) => { values.set(key, value); },
    removeItem: async (key) => { values.delete(key); },
    getAllKeys,
  };
  return { values, storage, getAllKeys };
};

describe("required-session local completion journal", () => {
  it.each([1, 2, 3, 4])(
    "repairs a process cut after durable write %i without duplicate progress or outbox work",
    async (failAfterWrite) => {
      const backing = backingStorage();
      let writes = 0;
      const cut = () => {
        writes += 1;
        if (writes === failAfterWrite) throw new Error("simulated_process_cut");
      };
      const cuttingStorage: ProgressStorage = {
        getItem: backing.storage.getItem,
        removeItem: async (key) => {
          await backing.storage.removeItem!(key);
          cut();
        },
        getAllKeys: backing.storage.getAllKeys,
        setItem: async (key, value) => {
          await backing.storage.setItem(key, value);
          cut();
        },
      };
      const session = getLesson1SessionRuntime().compiled.sessions[0];
      const envelope = envelopeFor(session, `session-run-cut-${failAfterWrite}`);
      await expect(createRequiredSessionLocalCommitCoordinator(
        cuttingStorage,
        () => true,
        SESSION_IDS,
      ).commit(scope, envelope)).rejects.toThrow("simulated_process_cut");

      const recovered = createRequiredSessionLocalCommitCoordinator(
        backing.storage,
        () => true,
        SESSION_IDS,
      );
      await recovered.recover(scope);
      await recovered.recover(scope);
      expect(await recovered.pendingCount(scope)).toBe(0);
      const outbox = createProgressOutbox(backing.storage, () => true);
      const pending = await outbox.list(scope);
      expect(pending).toHaveLength(1);
      expect(pending[0].mutationId).toBe(requiredSessionCompletionMutationId(envelope));
      const progress = await createLesson1LocalProgressStore(
        backing.storage,
        () => true,
        SESSION_IDS,
      ).load(scope);
      expect(progress.sessions[SESSION_IDS[0]]).toBe("completed");
      expect(Object.values(progress.operations).filter((operation) =>
        operation.status === "completed")).toHaveLength(1);
    },
  );

  it("rejects a stale generation without projecting its journal into another account", async () => {
    const backing = backingStorage();
    let currentGeneration: number = LOCAL_OFFLINE_PROGRESS_GENERATION;
    const guard: ProgressGenerationGuard = (candidate) =>
      candidate.generation === currentGeneration;
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const coordinator = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      guard,
      SESSION_IDS,
    );
    await coordinator.commit(scope, envelopeFor(session, "session-run-current"));
    currentGeneration = 1;
    await expect(coordinator.recover(scope)).rejects.toThrow("progress_generation_stale");
    const nextScope = {
      ...scope,
      generation: 1,
      accountScopeHash: "f".repeat(64),
    };
    expect(await createProgressOutbox(backing.storage, guard).list(nextScope)).toEqual([]);
  });

  it("rejects envelope/account substitution before the first durable write", async () => {
    const backing = backingStorage();
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const wrongScope = {
      ...scope,
      accountScopeHash: deriveLocalOfflineProgressAccountScopeHash("other-user"),
    };
    await expect(createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    ).commit(wrongScope, envelopeFor(session, "session-run-foreign")))
      .rejects.toThrow("required_session_local_commit_scope_mismatch");
    expect(backing.values.size).toBe(0);
  });

  it.each([
    ["spool append", "v2:required-session-local-commit:v2:", "set"],
    ["map projection", "learning_v2_lesson1_progress:", "set"],
    ["prepare clear", "v2:required-session-local-commit:v3:", "remove"],
  ] as const)("fails indeterminate when a successful %s write is silently dropped", async (
    _label,
    targetPrefix,
    targetOperation,
  ) => {
    const backing = backingStorage();
    const storage: ProgressStorage = {
      getItem: backing.storage.getItem,
      removeItem: async (key) => {
        if (targetOperation === "remove" && key.startsWith(targetPrefix)) return;
        await backing.storage.removeItem!(key);
      },
      getAllKeys: backing.storage.getAllKeys,
      setItem: async (key, value) => {
        if (targetOperation === "set" && key.startsWith(targetPrefix)) return;
        await backing.storage.setItem(key, value);
      },
    };
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const envelope = envelopeFor(session, `silent-${targetPrefix}-${targetOperation}`);
    await expect(createRequiredSessionLocalCommitCoordinator(
      storage,
      () => true,
      SESSION_IDS,
    ).commit(scope, envelope)).rejects.toThrow("required_session_local_commit_indeterminate");

    const recovered = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    );
    await recovered.recover(scope);
    expect(await recovered.pendingCount(scope)).toBe(0);
  });

  it("fails indeterminate when background outbox projection is silently dropped", async () => {
    const backing = backingStorage();
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    await createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    ).commit(scope, envelopeFor(session, "silent-background-outbox"));
    const droppingStorage: ProgressStorage = {
      ...backing.storage,
      setItem: async (key, value) => {
        if (key.startsWith("v2:outbox:v2:")) return;
        await backing.storage.setItem(key, value);
      },
    };

    await expect(createRequiredSessionLocalCommitCoordinator(
      droppingStorage,
      () => true,
      SESSION_IDS,
    ).recover(scope)).rejects.toThrow("required_session_local_commit_indeterminate");
  });

  it("detects a wrong-value journal append before projecting either destination", async () => {
    const backing = backingStorage();
    const storage: ProgressStorage = {
      getItem: backing.storage.getItem,
      removeItem: backing.storage.removeItem,
      getAllKeys: backing.storage.getAllKeys,
      setItem: async (key, value) => {
        await backing.storage.setItem(
          key,
          key.startsWith("v2:required-session-local-commit:v2:") ? `${value} ` : value,
        );
      },
    };
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    await expect(createRequiredSessionLocalCommitCoordinator(
      storage,
      () => true,
      SESSION_IDS,
    ).commit(scope, envelopeFor(session, "wrong-journal-value")))
      .rejects.toThrow("required_session_local_commit_indeterminate");
    expect(Array.from(backing.values.keys()).some((key) =>
      key.startsWith("v2:outbox:"))).toBe(false);
    expect(Array.from(backing.values.keys()).some((key) =>
      key.startsWith("learning_v2_lesson1_progress:"))).toBe(false);
  });

  it("keeps more than 128 fully offline repeats durable without blocking local completion", async () => {
    const backing = backingStorage();
    const coordinator = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    );
    const outbox = createProgressOutbox(backing.storage, () => true);
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    for (let index = 0; index < 129; index += 1) {
      const envelope = envelopeFor(session, `repeat-run-${String(index).padStart(3, "0")}`);
      await coordinator.commit(scope, envelope);
    }
    const progress = await createLesson1LocalProgressStore(
      backing.storage,
      () => true,
      SESSION_IDS,
    ).load(scope);
    expect(Object.keys(progress.operations)).toHaveLength(1);
    expect(progress.sessions[SESSION_IDS[0]]).toBe("completed");
    await coordinator.recover(scope);
    expect((await outbox.list(scope)).filter((item) => item.status === "pending").length)
      .toBeGreaterThan(0);
    expect(await coordinator.pendingCount(scope)).toBeGreaterThan(0);
    const observed = new Set<string>();
    while (await coordinator.pendingCount(scope) > 0) {
      for (const item of await outbox.list(scope)) {
        if (item.status === "pending") {
          observed.add(item.mutationId);
          await outbox.completeAccepted(scope, item);
        }
      }
      await coordinator.recover(scope);
    }
    expect(await coordinator.pendingCount(scope)).toBe(0);
    for (const item of await outbox.list(scope)) {
      if (item.status === "pending") observed.add(item.mutationId);
    }
    expect(observed.size).toBe(129);
    expect(backing.getAllKeys).toHaveBeenCalledTimes(1);
  });

  it("finishes the current session without scanning or draining historical backlog", async () => {
    const backing = backingStorage();
    backing.storage.getAllKeys = jest.fn(async () => {
      throw new Error("historical_scan_must_not_run_on_interactive_commit");
    });
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const coordinator = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    );

    await expect(coordinator.commit(scope, envelopeFor(session, "instant-current-run")))
      .resolves.toEqual(expect.objectContaining({ mutationId: expect.any(String) }));
    expect(backing.storage.getAllKeys).not.toHaveBeenCalled();
    const progress = await createLesson1LocalProgressStore(
      backing.storage,
      () => true,
      SESSION_IDS,
    ).load(scope);
    expect(progress.sessions[SESSION_IDS[0]]).toBe("completed");
  });

  it("preserves legacy journal FIFO ahead of a newly committed indexed run", async () => {
    const backing = backingStorage();
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const legacyA = localCommitEntryFor(envelopeFor(session, "legacy-fifo-a"));
    const legacyB = localCommitEntryFor(envelopeFor(session, "legacy-fifo-b"));
    const journalBody = {
      schemaVersion: "learning-v2-required-session-local-commit-journal.v1" as const,
      accountKey: progressAccountKey(scope),
      entries: [legacyA, legacyB],
    };
    backing.values.set(
      `v2:required-session-local-commit:v1:${progressAccountKey(scope)}`,
      canonicalJsonV1({
        ...journalBody,
        journalFingerprint: hashCanonicalBody(journalBody),
      }),
    );
    const coordinator = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    );
    const current = envelopeFor(session, "indexed-fifo-c");
    await coordinator.commit(scope, current);
    expect(await createProgressOutbox(backing.storage, () => true).list(scope)).toEqual([]);

    await coordinator.recover(scope);
    expect((await createProgressOutbox(backing.storage, () => true).list(scope))
      .map((item) => item.mutationId)).toEqual([
      legacyA.mutationId,
      legacyB.mutationId,
      requiredSessionCompletionMutationId(current),
    ]);
  });

  it("never lets a new interactive commit overtake an older indexed backlog", async () => {
    const backing = backingStorage();
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const coordinator = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    );
    const olderA = envelopeFor(session, "indexed-order-a");
    const olderB = envelopeFor(session, "indexed-order-b");
    const newestC = envelopeFor(session, "indexed-order-c");
    await coordinator.commit(scope, olderA);
    await coordinator.commit(scope, olderB);
    const accountKey = progressAccountKey(scope);
    backing.values.set(
      `v2:required-session-local-commit-index:v1:${accountKey}:legacy-scan-complete`,
      `learning-v2-required-session-spool-index-legacy-scan-complete.v1:${accountKey}`,
    );
    await coordinator.commit(scope, newestC);
    const outbox = createProgressOutbox(backing.storage, () => true);
    expect(await outbox.list(scope)).toEqual([]);

    await coordinator.recover(scope);
    expect((await outbox.list(scope)).map((item) => item.mutationId)).toEqual([
      requiredSessionCompletionMutationId(olderA),
      requiredSessionCompletionMutationId(olderB),
      requiredSessionCompletionMutationId(newestC),
    ]);
  });

  it("never discards an indexed completion whose entry vanished before projection", async () => {
    const backing = backingStorage();
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const envelope = envelopeFor(session, "missing-entry-before-projection");
    const coordinator = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    );
    await coordinator.commit(scope, envelope);
    const mutationId = requiredSessionCompletionMutationId(envelope);
    const storedEntryKey = [...backing.values.keys()].find((key) =>
      key.startsWith("v2:required-session-local-commit:v2:") &&
      key.endsWith(encodeURIComponent(mutationId)));
    expect(storedEntryKey).toBeDefined();
    backing.values.delete(storedEntryKey!);

    await expect(coordinator.recover(scope))
      .rejects.toThrow("required_session_local_commit_indeterminate");
    expect(await coordinator.pendingCount(scope)).toBeGreaterThan(0);
  });

  it("repairs a cut after entry removal but before the indexed shift", async () => {
    const backing = backingStorage();
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const envelope = envelopeFor(session, "entry-remove-before-shift-cut");
    await createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    ).commit(scope, envelope);
    let cut = true;
    const cuttingStorage: ProgressStorage = {
      ...backing.storage,
      removeItem: async (key) => {
        await backing.storage.removeItem!(key);
        if (cut && key.startsWith("v2:required-session-local-commit:v2:")) {
          cut = false;
          throw new Error("simulated_cut_after_entry_remove");
        }
      },
    };
    await expect(createRequiredSessionLocalCommitCoordinator(
      cuttingStorage,
      () => true,
      SESSION_IDS,
    ).recover(scope)).rejects.toThrow("simulated_cut_after_entry_remove");

    const recovered = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    );
    await recovered.recover(scope);
    expect(await recovered.pendingCount(scope)).toBe(0);
    const item = (await createProgressOutbox(backing.storage, () => true).list(scope))[0];
    expect(item).toMatchObject({
      mutationId: requiredSessionCompletionMutationId(envelope),
      payloadFingerprint: progressOutboxPayloadFingerprint(envelope),
    });
  });

  it("rejects a forged outbox alias for a missing indexed entry", async () => {
    const backing = backingStorage();
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const original = envelopeFor(session, "missing-entry-original");
    const forgedPayload = envelopeFor(session, "missing-entry-forged-payload");
    const coordinator = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    );
    await coordinator.commit(scope, original);
    const mutationId = requiredSessionCompletionMutationId(original);
    const storedEntryKey = [...backing.values.keys()].find((key) =>
      key.startsWith("v2:required-session-local-commit:v2:") &&
      key.endsWith(encodeURIComponent(mutationId)));
    expect(storedEntryKey).toBeDefined();
    backing.values.delete(storedEntryKey!);
    await createProgressOutbox(backing.storage, () => true)
      .enqueue(scope, mutationId, forgedPayload);

    await expect(coordinator.recover(scope))
      .rejects.toThrow("required_session_local_commit_indeterminate");
  });

  it("rejects a cross-account envelope hidden inside a self-consistent journal", async () => {
    const backing = backingStorage();
    const otherScope = {
      ...scope,
      stableId: "stable-user-2",
      accountScopeHash: deriveLocalOfflineProgressAccountScopeHash("stable-user-2"),
    };
    const session = getLesson1SessionRuntime().compiled.sessions[0];
    const otherEnvelope = envelopeFor(session, "foreign-journal-run");
    const foreignCoordinator = createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    );
    await expect(foreignCoordinator.commit(otherScope, otherEnvelope))
      .rejects.toThrow("required_session_local_commit_scope_mismatch");

    const originalEnvelope = envelopeFor(session, "foreign-journal-source");
    const foreignInput = { ...originalEnvelope, accountScopeHash: otherScope.accountScopeHash };
    // Re-materialize through the public envelope codec so the nested envelope is valid.
    const foreignEnvelope = materializeRequiredSessionCompletionEnvelope({
      scope: otherScope,
      episodeId: getLesson1SessionRuntime().payload.episodeId,
      sessionSetId: getLesson1SessionRuntime().sessionSetId,
      sessionSetHash: getLesson1SessionRuntime().sessionSetHash,
      localSessionId: SESSION_IDS[0],
      sessionRunId: String(foreignInput.sessionRunId),
      session,
      taskResults: session.cards.map((card) => ({
        taskId: card.cardId,
        disposition: "completed" as const,
        learnerAttempts: 1,
        hintUsed: false,
      })),
    });
    const mutationId = requiredSessionCompletionMutationId(foreignEnvelope);
    const localProgressOperation = {
      operationId: `required-session-local:${hashCanonicalBody({
        schemaVersion: "learning-v2-required-session-local-progress-operation.v1",
        accountScopeHash: foreignEnvelope.accountScopeHash,
        accountGeneration: foreignEnvelope.accountGeneration,
        seasonId: foreignEnvelope.seasonId,
        studyTarget: foreignEnvelope.studyTarget,
        learnerSourceLocale: foreignEnvelope.learnerSourceLocale,
        localSessionId: foreignEnvelope.localSessionId,
      })}`,
      sessionId: foreignEnvelope.localSessionId,
      status: "completed",
      awarded: { xp: 0, shards: 0 },
    } as const;
    const entryBody = {
      schemaVersion: "learning-v2-required-session-local-commit-entry.v1",
      mutationId,
      payloadFingerprint: progressOutboxPayloadFingerprint(foreignEnvelope),
      completionEnvelope: foreignEnvelope,
      localProgressOperation,
    } as const;
    const entry = { ...entryBody, entryFingerprint: hashCanonicalBody(entryBody) };
    const journalBody = {
      schemaVersion: "learning-v2-required-session-local-commit-journal.v1",
      accountKey: progressAccountKey(scope),
      entries: [entry],
    } as const;
    backing.values.set(
      `v2:required-session-local-commit:v1:${progressAccountKey(scope)}`,
      canonicalJsonV1({ ...journalBody, journalFingerprint: hashCanonicalBody(journalBody) }),
    );
    await expect(createRequiredSessionLocalCommitCoordinator(
      backing.storage,
      () => true,
      SESSION_IDS,
    ).recover(scope)).rejects.toThrow("required_session_local_commit_scope_mismatch");
    expect(await createProgressOutbox(backing.storage, () => true).list(scope)).toEqual([]);
  });
});

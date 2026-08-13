import {
  AppState,
  InteractionManager,
  type AppStateStatus,
} from "react-native";
import { subscribeAccountGeneration } from "./account_generation";
import { subscribeNetStatus } from "./net_status";
import {
  attemptPendingRequiredSessionCompletions,
  type RequiredSessionCompletionSyncAttempt,
} from "./learning_v2_required_session_completion_sync";
import { attemptPendingLearningV2ActivityReleasedCompletionsV1 } from "./learning_v2_activity_released_completion_sync_v1";
import { attemptPendingLearningV2ActivityReleasedSubmissionsV2 } from "./learning_v2_activity_released_submission_sync_v2";
import {
  attemptLearningV2CompletionCredentialAdmission,
  type LearningV2CompletionCredentialAdmission,
} from "./learning_v2_completion_credential_admission";
import {
  activeLearningV2CompletionRetryScope,
  clearLearningV2CompletionRetryCursor,
  loadLearningV2CompletionRetryCursor,
  materializeLearningV2CompletionRetryCursor,
  persistLearningV2CompletionRetryCursor,
  LEARNING_V2_COMPLETION_RETRY_MAX_REVISION,
  type LearningV2CompletionRetryCursor,
} from "./learning_v2_completion_retry_cursor";

const MAX_INTERACTIVE_SURFACES = 8;
const MAX_BACKGROUND_SYNC_FLIGHTS = 8;
const MAX_CONTINUATION_WAKES = 4;
const CONTINUATION_DELAY_MS = 5_000;
const RETRY_DELAYS_MS = [10_000, 30_000, 60_000, 120_000, 300_000] as const;

type ScheduledTask = Readonly<{ cancel(): void }>;
type SchedulerRuntime = Readonly<{
  currentAppState(): AppStateStatus;
  subscribeAppState(listener: (state: AppStateStatus) => void): () => void;
  subscribeAccount(listener: () => void): () => void;
  subscribeConnectivity(listener: (online: boolean) => void): () => void;
  afterInteractions(work: () => void): ScheduledTask;
  setTimer(work: () => void, delayMs: number): ScheduledTask;
  now(): number;
  activeAccountScopeHash(): string | null;
  loadCursor(
    scopeHash: string,
    nowMs: number,
  ): Promise<LearningV2CompletionRetryCursor | null>;
  persistCursor(cursor: LearningV2CompletionRetryCursor): Promise<void>;
  clearCursor(scopeHash: string, expectedRevision?: number): Promise<void>;
  flush(): Promise<RequiredSessionCompletionSyncAttempt>;
  admitCredentials(): Promise<LearningV2CompletionCredentialAdmission>;
}>;

type InteractiveSurface = object;

export const createLearningV2CompletionBackgroundScheduler = (
  runtime: SchedulerRuntime,
) => {
  const surfaces = new Set<InteractiveSurface>();
  let appState = runtime.currentAppState();
  let installed = false;
  let unsubscribers: (() => void)[] = [];
  let scheduled: Readonly<{ task: ScheduledTask; ticket: object }> | null =
    null;
  let retryTimer: Readonly<{
    task: ScheduledTask;
    scopeHash: string;
    at: number;
  }> | null = null;
  const inFlights = new Map<string, Promise<void>>();
  const credentialAdmissions = new Map<
    string,
    Readonly<{
      accountEpoch: number;
      promise: Promise<void>;
    }>
  >();
  const wakesPendingAfterFlight = new Set<string>();
  let bypassBackoffPending = false;
  let continuationWakes = 0;
  let generation = 0;
  let accountEpoch = 0;
  let observedAccountScopeHash: string | null = null;

  const canRunNow = (): boolean => surfaces.size === 0;
  const cancelRetryTimer = () => {
    retryTimer?.task.cancel();
    retryTimer = null;
  };
  const scheduleRetryAt = (scopeHash: string, at: number) => {
    cancelRetryTimer();
    const task = runtime.setTimer(
      () => {
        if (
          !retryTimer ||
          retryTimer.scopeHash !== scopeHash ||
          retryTimer.at !== at
        )
          return;
        retryTimer = null;
        requestWake();
      },
      Math.max(0, at - runtime.now()),
    );
    retryTimer = Object.freeze({ task, scopeHash, at });
  };
  const loadCursor = (scopeHash: string) =>
    runtime.loadCursor(scopeHash, runtime.now());
  const persistRetry = async (
    scopeHash: string,
    previous: LearningV2CompletionRetryCursor | null,
    reason: LearningV2CompletionRetryCursor["reason"],
  ) => {
    const failureOrdinal =
      reason === "retryable_failure"
        ? Math.min((previous?.failureOrdinal ?? 0) + 1, 8)
        : 0;
    const delay =
      reason === "bounded_continuation"
        ? CONTINUATION_DELAY_MS
        : RETRY_DELAYS_MS[
            Math.min(
              Math.max(0, failureOrdinal - 1),
              RETRY_DELAYS_MS.length - 1,
            )
          ]!;
    const cursor = materializeLearningV2CompletionRetryCursor({
      schemaVersion: "learning-v2-required-session-completion-retry-cursor.v1",
      accountScopeHash: scopeHash,
      revision:
        previous?.revision === LEARNING_V2_COMPLETION_RETRY_MAX_REVISION
          ? 1
          : (previous?.revision ?? 0) + 1,
      failureOrdinal,
      nextAttemptAtMs: runtime.now() + delay,
      reason,
    });
    await runtime.persistCursor(cursor);
    scheduleRetryAt(scopeHash, cursor.nextAttemptAtMs);
  };
  const reserveAttempt = async (
    scopeHash: string,
    previous: LearningV2CompletionRetryCursor | null,
  ): Promise<LearningV2CompletionRetryCursor> => {
    const cursor = materializeLearningV2CompletionRetryCursor({
      schemaVersion: "learning-v2-required-session-completion-retry-cursor.v1",
      accountScopeHash: scopeHash,
      revision:
        previous?.revision === LEARNING_V2_COMPLETION_RETRY_MAX_REVISION
          ? 1
          : (previous?.revision ?? 0) + 1,
      failureOrdinal: previous?.failureOrdinal ?? 0,
      nextAttemptAtMs: runtime.now() + RETRY_DELAYS_MS[0],
      reason: "attempt_reserved",
    });
    await runtime.persistCursor(cursor);
    return cursor;
  };

  const startCredentialAdmission = (
    scopeHash: string,
    cursor: LearningV2CompletionRetryCursor,
    admissionAccountEpoch: number,
  ): void => {
    const admissionKey = `${scopeHash}:${admissionAccountEpoch}`;
    scheduleRetryAt(scopeHash, cursor.nextAttemptAtMs);
    if (credentialAdmissions.has(admissionKey)) return;
    let promise!: Promise<void>;
    promise = runtime
      .admitCredentials()
      .then(async (disposition) => {
        const current = credentialAdmissions.get(admissionKey);
        if (
          !current ||
          current.promise !== promise ||
          admissionAccountEpoch !== accountEpoch ||
          runtime.activeAccountScopeHash() !== scopeHash
        )
          return;
        if (disposition === "ready" || disposition === "published") {
          bypassBackoffPending = true;
          if (canRunNow()) requestWake(true);
          return;
        }
        if (disposition === "deferred" || disposition === "stale") return;
        if (!canRunNow()) return;
        await persistRetry(scopeHash, cursor, "retryable_failure");
      })
      .catch(async () => {
        if (
          runtime.activeAccountScopeHash() !== scopeHash ||
          admissionAccountEpoch !== accountEpoch ||
          !canRunNow()
        )
          return;
        try {
          await persistRetry(scopeHash, cursor, "retryable_failure");
        } catch {
          /* fail closed */
        }
      })
      .finally(() => {
        const current = credentialAdmissions.get(admissionKey);
        if (current?.promise === promise)
          credentialAdmissions.delete(admissionKey);
      });
    credentialAdmissions.set(
      admissionKey,
      Object.freeze({
        accountEpoch: admissionAccountEpoch,
        promise,
      }),
    );
  };

  const run = (ticket: object): void => {
    if (scheduled?.ticket !== ticket) return;
    scheduled = null;
    if (!canRunNow()) return;
    const scopeHash = runtime.activeAccountScopeHash();
    if (!scopeHash) return;
    const runAccountEpoch = accountEpoch;
    const flightKey = `${scopeHash}:${runAccountEpoch}`;
    if (inFlights.has(flightKey)) return;
    if (inFlights.size >= MAX_BACKGROUND_SYNC_FLIGHTS) {
      scheduleRetryAt(scopeHash, runtime.now() + RETRY_DELAYS_MS[0]);
      return;
    }
    const runGeneration = generation;
    const bypassBackoff = bypassBackoffPending;
    bypassBackoffPending = false;
    let continueAfterSettlement = false;

    let flight!: Promise<void>;
    flight = (async () => {
      let cursor = await loadCursor(scopeHash);
      if (
        runGeneration !== generation ||
        !canRunNow() ||
        runtime.activeAccountScopeHash() !== scopeHash
      )
        return;
      if (bypassBackoff && cursor) {
        // Ignore the due time, but keep the predecessor durable until the
        // successor attempt reservation is exact-written. There is no
        // process-cut window with no pacing record.
      } else if (cursor && cursor.nextAttemptAtMs > runtime.now()) {
        scheduleRetryAt(scopeHash, cursor.nextAttemptAtMs);
        return;
      }
      if (
        runGeneration !== generation ||
        !canRunNow() ||
        runtime.activeAccountScopeHash() !== scopeHash
      )
        return;
      cursor = await reserveAttempt(scopeHash, cursor);
      if (
        runGeneration !== generation ||
        !canRunNow() ||
        runtime.activeAccountScopeHash() !== scopeHash
      )
        return;
      const outcome = await runtime.flush();
      if (
        runGeneration !== generation ||
        runtime.activeAccountScopeHash() !== scopeHash
      )
        return;
      if (outcome.disposition === "credentials_required") {
        startCredentialAdmission(scopeHash, cursor, accountEpoch);
        return;
      }
      if (outcome.disposition === "deferred") {
        scheduleRetryAt(scopeHash, cursor.nextAttemptAtMs);
        return;
      }
      if (outcome.disposition === "retryable_failure") {
        continuationWakes = 0;
        await persistRetry(scopeHash, cursor, "retryable_failure");
        return;
      }
      if (outcome.disposition === "bounded_continuation") {
        if (continuationWakes < MAX_CONTINUATION_WAKES) {
          continuationWakes += 1;
          continueAfterSettlement = true;
        } else {
          continuationWakes = 0;
          await persistRetry(scopeHash, cursor, "bounded_continuation");
        }
        return;
      }
      continuationWakes = 0;
      if (cursor) await runtime.clearCursor(scopeHash, cursor.revision);
      cancelRetryTimer();
    })()
      .catch(async () => {
        if (
          runGeneration !== generation ||
          runtime.activeAccountScopeHash() !== scopeHash
        )
          return;
        continuationWakes = 0;
        try {
          await persistRetry(
            scopeHash,
            await loadCursor(scopeHash),
            "retryable_failure",
          );
        } catch {
          /* fail closed */
        }
      })
      .finally(() => {
        if (inFlights.get(flightKey) === flight) inFlights.delete(flightKey);
        const shouldWake =
          continueAfterSettlement || wakesPendingAfterFlight.has(flightKey);
        wakesPendingAfterFlight.delete(flightKey);
        if (
          shouldWake &&
          runAccountEpoch === accountEpoch &&
          runtime.activeAccountScopeHash() === scopeHash
        ) {
          requestWake(continueAfterSettlement);
        }
      });
    inFlights.set(flightKey, flight);
  };

  function requestWake(bypassBackoff = false): void {
    if (!installed || !canRunNow() || !runtime.activeAccountScopeHash()) return;
    if (bypassBackoff) bypassBackoffPending = true;
    const scopeHash = runtime.activeAccountScopeHash();
    if (!scopeHash) return;
    const flightKey = `${scopeHash}:${accountEpoch}`;
    if (inFlights.has(flightKey)) {
      wakesPendingAfterFlight.add(flightKey);
      return;
    }
    if (scheduled) return;
    const ticket = Object.freeze({});
    const task = runtime.afterInteractions(() => run(ticket));
    scheduled = Object.freeze({ task, ticket });
  }

  const install = (): void => {
    if (installed) return;
    installed = true;
    appState = runtime.currentAppState();
    observedAccountScopeHash = runtime.activeAccountScopeHash();
    unsubscribers = [
      runtime.subscribeAppState((next) => {
        appState = next;
        generation += 1;
        requestWake();
      }),
      runtime.subscribeAccount(() => {
        const nextScopeHash = runtime.activeAccountScopeHash();
        const sameScopeGenerationChange =
          nextScopeHash !== null && nextScopeHash === observedAccountScopeHash;
        observedAccountScopeHash = nextScopeHash;
        generation += 1;
        accountEpoch += 1;
        continuationWakes = 0;
        bypassBackoffPending = false;
        cancelRetryTimer();
        scheduled?.task.cancel();
        scheduled = null;
        requestWake(sameScopeGenerationChange);
      }),
      runtime.subscribeConnectivity((online) => {
        if (!online) return;
        continuationWakes = 0;
        requestWake(true);
      }),
    ];
    requestWake();
  };

  const enterInteractiveSurface = (): (() => void) => {
    install();
    if (surfaces.size >= MAX_INTERACTIVE_SURFACES) {
      throw new Error("learning_v2_completion_surface_capacity");
    }
    const surface = Object.freeze({});
    surfaces.add(surface);
    generation += 1;
    scheduled?.task.cancel();
    scheduled = null;
    cancelRetryTimer();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      surfaces.delete(surface);
      generation += 1;
      if (surfaces.size === 0) requestWake();
    };
  };

  const notifyConnectivityAvailable = () => {
    continuationWakes = 0;
    generation += 1;
    requestWake(true);
  };
  const snapshot = () =>
    Object.freeze({
      installed,
      appState,
      activeInteractiveSurfaces: surfaces.size,
      scheduled: scheduled !== null,
      retryScheduled: retryTimer !== null,
      inFlight: inFlights.size > 0,
      credentialAdmissions: credentialAdmissions.size,
    });
  const resetForTests = () => {
    generation += 1;
    accountEpoch += 1;
    scheduled?.task.cancel();
    scheduled = null;
    cancelRetryTimer();
    unsubscribers.forEach((unsubscribe) => unsubscribe());
    unsubscribers = [];
    installed = false;
    observedAccountScopeHash = null;
    surfaces.clear();
    continuationWakes = 0;
    wakesPendingAfterFlight.clear();
    bypassBackoffPending = false;
    if (inFlights.size > 0)
      throw new Error("learning_v2_completion_scheduler_reset_in_flight");
    if (credentialAdmissions.size > 0) {
      throw new Error(
        "learning_v2_completion_scheduler_reset_credential_in_flight",
      );
    }
  };

  return Object.freeze({
    install,
    enterInteractiveSurface,
    notifyConnectivityAvailable,
    snapshot,
    resetForTests,
  });
};

const scheduler = createLearningV2CompletionBackgroundScheduler({
  currentAppState: () => AppState.currentState,
  subscribeAppState: (listener) => {
    const subscription = AppState.addEventListener("change", listener);
    return () => subscription.remove();
  },
  subscribeAccount: (listener) => {
    const subscription = subscribeAccountGeneration(() => listener());
    return () => subscription.remove();
  },
  subscribeConnectivity: subscribeNetStatus,
  afterInteractions: (work) => InteractionManager.runAfterInteractions(work),
  setTimer: (work, delayMs) => {
    const id = setTimeout(work, delayMs);
    return { cancel: () => clearTimeout(id) };
  },
  now: Date.now,
  activeAccountScopeHash: activeLearningV2CompletionRetryScope,
  loadCursor: loadLearningV2CompletionRetryCursor,
  persistCursor: persistLearningV2CompletionRetryCursor,
  clearCursor: clearLearningV2CompletionRetryCursor,
  flush: async () => {
    const legacy = await attemptPendingRequiredSessionCompletions();
    if (legacy.disposition !== "drained") return legacy;
    const submissions =
      await attemptPendingLearningV2ActivityReleasedSubmissionsV2();
    if (submissions.disposition !== "drained") {
      return Object.freeze({
        processed: legacy.processed + submissions.processed,
        disposition: submissions.disposition,
      });
    }
    const released =
      await attemptPendingLearningV2ActivityReleasedCompletionsV1();
    return Object.freeze({
      processed: legacy.processed + submissions.processed + released.processed,
      disposition: released.disposition,
    });
  },
  admitCredentials: attemptLearningV2CompletionCredentialAdmission,
});

export const ensureLearningV2CompletionBackgroundSchedulerInstalled =
  scheduler.install;
export const enterLearningV2InteractiveSurface =
  scheduler.enterInteractiveSurface;
export const notifyLearningV2CompletionConnectivityAvailable =
  scheduler.notifyConnectivityAvailable;
export const learningV2CompletionBackgroundSchedulerSnapshot =
  scheduler.snapshot;
export const __resetLearningV2CompletionBackgroundSchedulerForTests =
  scheduler.resetForTests;

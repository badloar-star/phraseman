/*
 * Android Account V2 provider-transition authority.
 *
 * The existing client controller owns the encrypted account scope and its
 * hydration timer. This adapter owns the provider-mutation order around that
 * controller: close the old scope, mutate Firebase Auth, then open the current
 * authenticated scope (which schedules hydration). It intentionally contains
 * no Firebase or React Native imports so the contract is deterministic.
 */

export type AccountsV2ProviderSignInResult = Readonly<{
  result: string;
  error?: string;
}>;

export type AccountsV2AuthTransitionPhase =
  | 'idle'
  | 'closing_old'
  | 'authenticating'
  | 'opening_new'
  | 'hydrating'
  | 'cancelled'
  | 'error'
  | 'signed_out';

export type AccountsV2AuthTransitionState = Readonly<{
  phase: AccountsV2AuthTransitionPhase;
  uid: string | null;
  error: string | null;
}>;

export type AccountsV2SessionUidResult =
  | Readonly<{ outcome: 'closed'; uid: null }>
  | Readonly<{ outcome: 'opened'; uid: string; hydrationScheduled: boolean }>
  | Readonly<{ outcome: 'not_opened'; uid: string | null; reason: string }>;

export type AccountsV2ObservedUidResult = AccountsV2SessionUidResult | Readonly<{ outcome: 'deferred' }>;

export type AccountsV2AuthTransitionPorts = Readonly<{
  currentAuthUid: () => string | null;
  /** The live client gate; a same-UID observation must still close when it turns off. */
  isEnabled?: () => boolean;
  /** null closes the current scope; a uid opens it and schedules hydration. */
  setSessionUid: (uid: string | null) => Promise<AccountsV2SessionUidResult>;
  onStateChange?: (state: AccountsV2AuthTransitionState) => void;
}>;

export type AccountsV2AuthTransitionCoordinator = Readonly<{
  runProviderSignIn<T extends AccountsV2ProviderSignInResult>(authenticate: () => Promise<T>): Promise<T>;
  runProviderSignOut(authenticate: () => Promise<void>): Promise<void>;
  observeAuthUid(uid: string | null): Promise<AccountsV2ObservedUidResult>;
  status(): AccountsV2AuthTransitionState;
}>;

function errorCode(error: unknown): string {
  if (error instanceof Error && error.message.trim()) return error.message.trim().slice(0, 120);
  return 'provider_transition_failed';
}

function normalizedUid(uid: string | null): string | null {
  const value = String(uid ?? '').trim();
  return value.length > 0 ? value : null;
}

export function createAccountsV2AuthTransitionCoordinator(
  ports: AccountsV2AuthTransitionPorts,
): AccountsV2AuthTransitionCoordinator {
  let state: AccountsV2AuthTransitionState = Object.freeze({ phase: 'idle', uid: null, error: null });
  let activeProviderTransitions = 0;
  let transitionTail: Promise<void> = Promise.resolve();
  // Firebase Auth may already expose a uid before the controller has opened
  // any encrypted scope. Only a confirmed setSessionUid result establishes
  // authority; never infer an open scope from Auth alone.
  let sessionUid: string | null = null;
  let hasDeferredAuthUid = false;

  const publish = (
    phase: AccountsV2AuthTransitionPhase,
    uid: string | null,
    error: string | null = null,
  ): void => {
    state = Object.freeze({ phase, uid: normalizedUid(uid), error });
    ports.onStateChange?.(state);
  };

  const applySessionUid = async (uid: string | null): Promise<AccountsV2SessionUidResult> => {
    const result = await ports.setSessionUid(uid);
    if (result.outcome === 'closed') sessionUid = null;
    if (result.outcome === 'opened') sessionUid = result.uid;
    return result;
  };

  const observeAuthUid = (uid: string | null): Promise<AccountsV2ObservedUidResult> => {
    const normalized = normalizedUid(uid);
    if (activeProviderTransitions > 0) {
      hasDeferredAuthUid = true;
      return Promise.resolve(Object.freeze({ outcome: 'deferred' }));
    }
    // Listener callbacks are fire-and-forget at the app boundary. They must
    // share the provider FIFO, otherwise two rapid Firebase emissions can
    // open/close encrypted scopes concurrently and let an older operation
    // finish after the newer one.
    return enqueueTransition(async () => {
      // A provider transition may have been queued after this observation but
      // before its slot started. Defer to the transition's authoritative drain
      // instead of applying a listener event in the middle of it.
      if (activeProviderTransitions > 0) {
        hasDeferredAuthUid = true;
        return Object.freeze({ outcome: 'deferred' });
      }
      // Remote Config can turn the client off while Firebase remains signed in.
      // Do not let same-UID deduplication bypass the controller's flag-off stop
      // path; close the encrypted scope through the same authority first.
      if (ports.isEnabled?.() === false) {
        if (sessionUid === null) return Object.freeze({ outcome: 'closed', uid: null });
        const closed = await applySessionUid(null);
        if (closed.outcome !== 'closed') {
          throw new Error(closed.outcome === 'not_opened' ? closed.reason : 'scope_close_not_confirmed');
        }
        return closed;
      }
      if (normalized === sessionUid) {
        // A same-UID foreground observation is not always a no-op: the
        // controller may have fail-closed its runner during reauth while the
        // authoritative identity stayed unchanged. Reapply the uid so the
        // controller can safely resume (it remains a no-op when healthy).
        return normalized === null
          ? Object.freeze({ outcome: 'closed', uid: null })
          : applySessionUid(normalized);
      }
      return applySessionUid(normalized);
    });
  };

  const finishProviderTransition = async (): Promise<void> => {
    activeProviderTransitions -= 1;
    if (activeProviderTransitions > 0 || !hasDeferredAuthUid) return;
    hasDeferredAuthUid = false;
    // A listener event may have been queued before a newer provider
    // transition completed. Firebase's current auth state is authoritative at
    // the drain point; never reopen a stale listener UID over the scope that
    // the newer transition just established (or closed).
    const uid = normalizedUid(ports.currentAuthUid());
    if (uid === sessionUid) return;
    try {
      await applySessionUid(uid);
    } catch (error) {
      publish('error', sessionUid, errorCode(error));
    }
  };

  const reopenCurrentScope = async (): Promise<AccountsV2SessionUidResult> => {
    const uid = normalizedUid(ports.currentAuthUid());
    if (uid === null) return Object.freeze({ outcome: 'closed', uid: null });
    return applySessionUid(uid);
  };

  const recoverAfterProviderFailure = async (
    phase: 'cancelled' | 'error',
    error: string | null,
  ): Promise<void> => {
    const reopened = await reopenCurrentScope();
    if (reopened.outcome !== 'opened' || !reopened.hydrationScheduled) {
      publish('error', null, reopened.outcome === 'not_opened' ? reopened.reason : 'hydration_not_scheduled');
      return;
    }
    publish(phase, reopened.uid, error);
  };

  /** Provider mutations share one FIFO; a sign-out cannot overlap a sign-in. */
  const enqueueTransition = <T>(work: () => Promise<T>): Promise<T> => {
    const previous = transitionTail;
    let release!: () => void;
    const slot = new Promise<void>((resolve) => { release = resolve; });
    transitionTail = previous.then(() => slot, () => slot);
    return previous.then(work).finally(release);
  };

  const runProviderSignIn = <T extends AccountsV2ProviderSignInResult>(
    authenticate: () => Promise<T>,
  ): Promise<T> => {
    // Count at invocation time, not when this FIFO slot starts. Listener
    // events must stay deferred across queued transitions as well.
    activeProviderTransitions += 1;
    return enqueueTransition(async () => {
    const oldUid = normalizedUid(ports.currentAuthUid());
    try {
      publish('closing_old', oldUid);
      try {
        const closed = await applySessionUid(null);
        if (closed.outcome !== 'closed') {
          throw new Error(closed.outcome === 'not_opened' ? closed.reason : 'scope_close_not_confirmed');
        }
      } catch (error) {
        publish('error', oldUid, errorCode(error));
        throw error;
      }

      publish('authenticating', oldUid);
      let outcome: T;
      try {
        outcome = await authenticate();
      } catch (error) {
        await recoverAfterProviderFailure('error', errorCode(error));
        throw error;
      }

      if (outcome.result === 'cancelled' || outcome.result === 'error') {
        await recoverAfterProviderFailure(
          outcome.result,
          outcome.result === 'error' ? outcome.error ?? 'provider_error' : null,
        );
        return outcome;
      }

      const uid = normalizedUid(ports.currentAuthUid());
      if (uid === null) {
        const error = new Error('accounts_v2_authenticated_uid_missing');
        publish('error', null, error.message);
        throw error;
      }
      publish('opening_new', uid);
      let opened: AccountsV2SessionUidResult;
      try {
        opened = await applySessionUid(uid);
      } catch (error) {
        publish('error', uid, errorCode(error));
        throw error;
      }
      if (opened.outcome !== 'opened') {
        publish('error', uid, opened.outcome === 'not_opened' ? opened.reason : 'scope_not_opened');
        return outcome;
      }
      if (!opened.hydrationScheduled) {
        publish('error', uid, 'hydration_not_scheduled');
        return outcome;
      }
      publish('hydrating', uid);
      return outcome;
    } finally {
      await finishProviderTransition();
    }
    });
  };

  const runProviderSignOut = (authenticate: () => Promise<void>): Promise<void> => {
    activeProviderTransitions += 1;
    return enqueueTransition(async () => {
    const oldUid = normalizedUid(ports.currentAuthUid());
    try {
      publish('closing_old', oldUid);
      try {
        const closed = await applySessionUid(null);
        if (closed.outcome !== 'closed') {
          throw new Error(closed.outcome === 'not_opened' ? closed.reason : 'scope_close_not_confirmed');
        }
      } catch (error) {
        publish('error', oldUid, errorCode(error));
        throw error;
      }

      publish('authenticating', oldUid);
      try {
        await authenticate();
      } catch (error) {
        await recoverAfterProviderFailure('error', errorCode(error));
        throw error;
      }
      publish('signed_out', null);
    } finally {
      await finishProviderTransition();
    }
    });
  };

  return Object.freeze({
    runProviderSignIn,
    runProviderSignOut,
    observeAuthUid,
    status: () => state,
  });
}

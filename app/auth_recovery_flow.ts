import { adoptAuthRecoveryHandoffOnDefaultAuth } from './auth_recovery_adoption';
import { acquireAuthRecoveryNativeCredential } from './auth_provider';
import {
  startSecondaryAuthRecoverySession,
  type SecondaryAuthRecoverySession,
  type SecondaryRecoveryProvider,
} from './auth_recovery_secondary';
import { getStableId } from './stable_id';

const MAX_CODE_LIFETIME_SEC = 86_400;
const RESEND_COOLDOWN_MS = 60_000;
const MAX_HANDOFF_ELIGIBILITY_MS = 10 * 60 * 1000;
const MAX_ACK_DEADLINE_MS = 65 * 60 * 1000;

export type AuthRecoveryFlowState = Readonly<{
  stage:
    | 'idle'
    | 'starting'
    | 'ready'
    | 'requesting'
    | 'code_sent'
    | 'confirming'
    | 'adopting'
    | 'completed'
    | 'ack_pending'
    | 'quarantined'
    | 'failed'
    | 'cancelled';
  provider?: SecondaryRecoveryProvider;
  maskedEmail?: string;
  expiresAt?: number;
  resendAvailableAt?: number;
  reason?: string;
}>;

export type AuthRecoveryFlowOptions = Readonly<{
  now?: () => number;
  createRequestId?: () => string;
}>;

export type AuthRecoveryFlowController = Readonly<{
  getState: () => AuthRecoveryFlowState;
  start: (provider: SecondaryRecoveryProvider) => Promise<AuthRecoveryFlowState>;
  requestCode: () => Promise<AuthRecoveryFlowState>;
  resendCode: () => Promise<AuthRecoveryFlowState>;
  confirmCode: (code: string) => Promise<{ result: 'completed' | 'ack_pending' } | {
    result: 'quarantined'; reason: string;
  }>;
  cancel: () => Promise<void>;
  dispose: () => Promise<void>;
}>;

function flowError(code: string, cause?: unknown): Error {
  const error = new Error(code);
  if (cause !== undefined) (error as Error & { cause?: unknown }).cause = cause;
  return error;
}

function defaultRequestId(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Crypto = require('expo-crypto') as { randomUUID?: () => string };
  const requestId = Crypto.randomUUID?.();
  if (!requestId) throw flowError('auth_recovery_request_id_unavailable');
  return requestId;
}

function opaque(value: unknown, code: string, maxLength = 160): string {
  const normalized = String(value ?? '').trim();
  if (!normalized || normalized.length > maxLength || normalized.includes('/')) {
    throw flowError(code);
  }
  return normalized;
}

function retryableRecoveryError(
  error: unknown,
  phase: 'request' | 'confirm' | 'issue',
): boolean {
  const value = error && typeof error === 'object'
    ? error as { code?: unknown; message?: unknown }
    : {};
  const code = String(value.code ?? '').toLowerCase();
  const message = String(value.message ?? error ?? '').toLowerCase();
  const serverMessage = message.replace(/^\[[^\]]+\]\s*/, '');
  if (code === 'functions/unavailable' || code === 'functions/cancelled') return true;
  if (phase === 'issue') {
    if (code === 'functions/aborted') return serverMessage === 'recovery_handoff_busy';
    if (code === 'functions/deadline-exceeded') {
      return serverMessage !== 'recovery_handoff_expired';
    }
    if (code === 'functions/internal') {
      return serverMessage === 'recovery_handoff_unavailable'
        || serverMessage === 'recovery_handoff_mint_failed';
    }
    return false;
  }
  if (code === 'functions/deadline-exceeded' || code === 'functions/internal') return true;
  if (
    serverMessage === 'recovery_code_invalid' || serverMessage === 'recovery_rate_limited'
  ) return true;
  return message === 'functions/unavailable'
    || serverMessage === 'recovery_send_failed'
    || serverMessage === 'recovery_confirm_unavailable';
}

let activeFlowOwner: symbol | null = null;

export function createAuthRecoveryFlow(
  options: AuthRecoveryFlowOptions = {},
): AuthRecoveryFlowController {
  const owner = Symbol('auth-recovery-flow');
  const now = options.now ?? Date.now;
  const createRequestId = options.createRequestId ?? defaultRequestId;
  let state: AuthRecoveryFlowState = { stage: 'idle' };
  let provider: SecondaryRecoveryProvider | null = null;
  let stableId = '';
  let session: SecondaryAuthRecoverySession | null = null;
  let cleanupPromise: Promise<void> | null = null;
  let activeOperation: Promise<unknown> | null = null;
  let cancelPromise: Promise<void> | null = null;
  let cancelRequested = false;
  let recoveryEventId = '';
  let handoffRequestId = '';

  const snapshot = (): AuthRecoveryFlowState => ({ ...state });

  const releaseGlobal = (): void => {
    if (activeFlowOwner === owner) activeFlowOwner = null;
  };

  const setState = (next: AuthRecoveryFlowState): AuthRecoveryFlowState => {
    state = next;
    return snapshot();
  };

  const cleanupSecondary = (): Promise<void> => {
    if (!session) return cleanupPromise ?? Promise.resolve();
    if (!cleanupPromise) {
      const target = session;
      cleanupPromise = target.cleanup().then(() => {
        if (session === target) session = null;
      });
    }
    return cleanupPromise;
  };

  const assertStable = async (): Promise<void> => {
    if (String(await getStableId() ?? '').trim() !== stableId) {
      throw flowError('auth_recovery_stable_id_changed');
    }
  };

  const failClosed = async (error: unknown): Promise<never> => {
    const original = error instanceof Error ? error : flowError('auth_recovery_flow_failed', error);
    setState({ stage: 'failed', ...(provider ? { provider } : {}), reason: original.message });
    try {
      await cleanupSecondary();
    } catch (cleanupError) {
      releaseGlobal();
      throw flowError('auth_recovery_secondary_cleanup_failed', { original, cleanupError });
    }
    releaseGlobal();
    throw original;
  };

  const checkCancelled = async (): Promise<void> => {
    if (!cancelRequested) return;
    try {
      await cleanupSecondary();
    } catch (error) {
      await failClosed(flowError('auth_recovery_secondary_cleanup_failed', error));
    }
    setState({ stage: 'cancelled', ...(provider ? { provider } : {}) });
    releaseGlobal();
    throw flowError('auth_recovery_flow_cancelled');
  };

  const track = <T>(operation: () => Promise<T>): Promise<T> => {
    if (activeOperation) return Promise.reject(flowError('auth_recovery_flow_in_progress'));
    const task = operation().finally(() => {
      if (activeOperation === task) activeOperation = null;
    });
    activeOperation = task;
    return task;
  };

  const start = (selectedProvider: SecondaryRecoveryProvider): Promise<AuthRecoveryFlowState> => track(async () => {
    if (state.stage !== 'idle') throw flowError('auth_recovery_flow_invalid_state');
    if (activeFlowOwner && activeFlowOwner !== owner) {
      throw flowError('auth_recovery_flow_global_in_progress');
    }
    activeFlowOwner = owner;
    provider = selectedProvider;
    setState({ stage: 'starting', provider });
    try {
      stableId = String(await getStableId() ?? '').trim();
      if (!stableId) throw flowError('auth_recovery_local_stable_required');
      await checkCancelled();
      const result = await startSecondaryAuthRecoverySession(
        provider,
        acquireAuthRecoveryNativeCredential,
      );
      if (result.result === 'cancelled') {
        setState({ stage: 'cancelled', provider });
        releaseGlobal();
        return snapshot();
      }
      session = result.session;
      await checkCancelled();
      if (
        session.provider !== provider
        || !opaque(session.authUid, 'auth_recovery_secondary_session_invalid', 128)
      ) {
        throw flowError('auth_recovery_secondary_session_invalid');
      }
      await assertStable();
      await checkCancelled();
      return setState({ stage: 'ready', provider });
    } catch (error) {
      if (cancelRequested && (error as Error)?.message === 'auth_recovery_flow_cancelled') throw error;
      return failClosed(error);
    }
  });

  const performRequest = async (): Promise<AuthRecoveryFlowState> => {
    const currentSession = session;
    if (!currentSession || !provider) throw flowError('auth_recovery_flow_invalid_state');
    const previous = state.stage === 'code_sent' ? snapshot() : { stage: 'ready' as const, provider };
    setState({ stage: 'requesting', provider });
    try {
      await assertStable();
      const result = await currentSession.requestCode(stableId);
      await checkCancelled();
      await assertStable();
      await checkCancelled();
      if (
        result.provider !== provider
        || !result.maskedEmail.trim()
        || !Number.isFinite(result.expiresInSec)
        || result.expiresInSec <= 0
        || result.expiresInSec > MAX_CODE_LIFETIME_SEC
      ) {
        throw flowError('auth_recovery_code_expiry_invalid');
      }
      return setState({
        stage: 'code_sent',
        provider,
        maskedEmail: result.maskedEmail.trim(),
        expiresAt: now() + result.expiresInSec * 1000,
        resendAvailableAt: now() + RESEND_COOLDOWN_MS,
      });
    } catch (error) {
      if (cancelRequested) throw error;
      if (retryableRecoveryError(error, 'request')) {
        state = previous;
        throw error;
      }
      return failClosed(error);
    }
  };

  const requestCode = (): Promise<AuthRecoveryFlowState> => track(async () => {
    if (state.stage !== 'ready') throw flowError('auth_recovery_flow_invalid_state');
    return performRequest();
  });

  const resendCode = (): Promise<AuthRecoveryFlowState> => track(async () => {
    if (state.stage !== 'code_sent') throw flowError('auth_recovery_flow_invalid_state');
    if (typeof state.resendAvailableAt !== 'number' || now() < state.resendAvailableAt) {
      throw flowError('auth_recovery_resend_not_due');
    }
    return performRequest();
  });

  const confirmCode = (rawCode: string): Promise<{
    result: 'completed' | 'ack_pending';
  } | { result: 'quarantined'; reason: string }> => track(async () => {
    if (state.stage !== 'code_sent' || !session || !provider) {
      throw flowError('auth_recovery_flow_invalid_state');
    }
    const code = String(rawCode ?? '').trim();
    if (!/^\d{6}$/.test(code)) throw flowError('auth_recovery_code_invalid');
    if (typeof state.expiresAt !== 'number' || state.expiresAt <= now()) {
      throw flowError('auth_recovery_code_expired');
    }
    const codeSentState = snapshot();
    const currentSession = session;
    setState({ stage: 'confirming', provider });
    let customToken = '';
    let operationPhase: 'confirm' | 'issue' | 'adopt' = 'confirm';
    try {
      await assertStable();
      const confirmation = await currentSession.confirmCode(stableId, code);
      await checkCancelled();
      await assertStable();
      if (confirmation.stableId !== stableId) {
        throw flowError('auth_recovery_handoff_stable_mismatch');
      }
      const confirmedEventId = opaque(
        confirmation.recoveryEventId,
        'auth_recovery_handoff_event_invalid',
      );
      if (recoveryEventId && recoveryEventId !== confirmedEventId) {
        throw flowError('auth_recovery_handoff_event_mismatch');
      }
      if (
        !Number.isFinite(confirmation.handoffEligibleUntil)
        || confirmation.handoffEligibleUntil <= now()
        || confirmation.handoffEligibleUntil > now() + MAX_HANDOFF_ELIGIBILITY_MS
      ) {
        throw flowError('auth_recovery_handoff_eligibility_invalid');
      }
      recoveryEventId = confirmedEventId;
      if (!handoffRequestId) {
        handoffRequestId = opaque(createRequestId(), 'auth_recovery_request_id_invalid');
      }
      operationPhase = 'issue';
      const issued = await currentSession.issueHandoffToken(recoveryEventId, handoffRequestId);
      await checkCancelled();
      await assertStable();
      if (issued.stableId !== stableId) {
        throw flowError('auth_recovery_handoff_stable_mismatch');
      }
      if (
        !Number.isFinite(issued.handoffAcknowledgeUntil)
        || issued.handoffAcknowledgeUntil <= now()
        || issued.handoffAcknowledgeUntil > now() + MAX_ACK_DEADLINE_MS
      ) {
        throw flowError('auth_recovery_handoff_deadline_invalid');
      }
      customToken = issued.customToken;
      try {
        await cleanupSecondary();
      } catch (error) {
        setState({ stage: 'failed', provider, reason: 'auth_recovery_secondary_cleanup_failed' });
        releaseGlobal();
        // A secondary implementation can throw arbitrary text after the one-time
        // token has been issued. Never retain that text (or a cause containing it).
        throw flowError('auth_recovery_secondary_cleanup_failed');
      }
      await checkCancelled();
      await assertStable();
      // Do not yield on the false path: checking cancellation and crossing into
      // `adopting` must be one synchronous boundary. Once adopting, cancel()
      // waits for the authoritative terminal result instead of overriding it.
      if (cancelRequested) await checkCancelled();
      setState({ stage: 'adopting', provider });
      operationPhase = 'adopt';
      const result = await adoptAuthRecoveryHandoffOnDefaultAuth({
        customToken,
        recoveryEventId,
        stableId,
        expectedUid: currentSession.authUid,
        handoffAcknowledgeUntil: issued.handoffAcknowledgeUntil,
      });
      customToken = '';
      if (result.result === 'completed' || result.result === 'ack_pending') {
        setState({ stage: result.result, provider });
        releaseGlobal();
        return result;
      }
      if (result.result === 'quarantined') {
        setState({ stage: 'quarantined', provider, reason: result.reason });
        releaseGlobal();
        return result;
      }
      throw flowError('auth_recovery_adoption_response_invalid');
    } catch (error) {
      customToken = '';
      if (operationPhase === 'adopt') {
        return failClosed(flowError('auth_recovery_adoption_failed'));
      }
      if (cancelRequested) throw error;
      if (
        retryableRecoveryError(error, operationPhase)
        && session
      ) {
        state = codeSentState;
        throw error;
      }
      if ((error as Error)?.message === 'auth_recovery_secondary_cleanup_failed') throw error;
      return failClosed(error);
    }
  });

  const cancel = (): Promise<void> => {
    if (
      state.stage === 'completed'
      || state.stage === 'ack_pending'
      || state.stage === 'quarantined'
      || state.stage === 'failed'
      || state.stage === 'cancelled'
    ) return Promise.resolve();
    if (state.stage === 'adopting') {
      if (!cancelPromise) {
        cancelPromise = (activeOperation ?? Promise.resolve()).then(() => undefined, () => undefined);
      }
      return cancelPromise;
    }
    cancelRequested = true;
    if (!cancelPromise) {
      cancelPromise = (async () => {
        const pending = activeOperation;
        if (session) {
          try {
            await cleanupSecondary();
          } catch (error) {
            setState({ stage: 'failed', ...(provider ? { provider } : {}), reason: 'auth_recovery_secondary_cleanup_failed' });
            releaseGlobal();
            throw flowError('auth_recovery_secondary_cleanup_failed', error);
          }
        }
        if (pending) await pending.catch(() => {});
        if (session) await cleanupSecondary();
        setState({ stage: 'cancelled', ...(provider ? { provider } : {}) });
        releaseGlobal();
      })();
    }
    return cancelPromise;
  };

  return {
    getState: snapshot,
    start,
    requestCode,
    resendCode,
    confirmCode,
    cancel,
    dispose: cancel,
  };
}

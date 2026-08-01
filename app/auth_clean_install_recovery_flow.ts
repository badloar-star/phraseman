import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { captureAccountGeneration, isCurrentAccountGeneration, type AccountGenerationToken } from './account_generation';
import { readAccountDeletePendingAuthRaw } from './account_delete_quarantine';
import { adoptCleanInstallRecoveryHandoff } from './auth_clean_install_recovery_adoption';
import { beginCleanInstallRecoveryTransition } from './auth_clean_install_recovery_transition';
import {
  AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS,
  clearCleanInstallRecoveryJournalIfExact,
  hashCleanInstallRequesterUid,
  persistCleanInstallChallenge,
  promoteCleanInstallRecoveryConfirmed,
  readCleanInstallRecoveryJournal,
} from './auth_clean_install_recovery_journal';
import { acquireAuthRecoveryNativeCredential } from './auth_provider';
import {
  startSecondaryAuthRecoverySession,
  type SecondaryAuthRecoverySession,
  type SecondaryRecoveryProvider,
} from './auth_recovery_secondary';
import { ensureAnonUser } from './cloud_sync';
import { getStableId } from './stable_id';

export const AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY = 'auth_clean_install_recovery_request_intent_v1';

type FlowStage = 'idle' | 'starting' | 'ready' | 'requesting' | 'code_sent'
  | 'confirming' | 'confirmed' | 'issuing' | 'adopting' | 'completed'
  | 'ack_pending' | 'quarantined' | 'cancelled' | 'failed';

export type CleanInstallRecoveryFlowState = Readonly<{
  stage: FlowStage;
  provider?: SecondaryRecoveryProvider;
  expiresAt?: number;
  retryAfterSec?: number;
  reason?: string;
}>;

export type CleanInstallRecoveryFlowOptions = Readonly<{
  now?: () => number;
  createRequestId?: () => string;
}>;

export type CleanInstallRecoveryFlowController = Readonly<{
  getState: () => CleanInstallRecoveryFlowState;
  start: (provider: SecondaryRecoveryProvider) => Promise<CleanInstallRecoveryFlowState>;
  requestCode: (email: string) => Promise<CleanInstallRecoveryFlowState>;
  resendCode: (email: string) => Promise<CleanInstallRecoveryFlowState>;
  confirmCode: (code: string) => Promise<{ result: 'completed' | 'ack_pending' } | { result: 'quarantined'; reason: string }>;
  resumeConfirmed: () => Promise<{ result: 'completed' | 'ack_pending' } | { result: 'quarantined'; reason: string }>;
  dispose: () => Promise<void>;
  cancel: () => Promise<void>;
}>;

type RequestIntent = Readonly<{
  version: 1;
  provider: SecondaryRecoveryProvider;
  sourceStableId: string;
  requesterUidHash: string;
  sourceAuthUidHash: string;
  sourceAccountGeneration: number;
  requestClientRequestId: string;
  confirmClientRequestId: string;
  handoffRequestId: string;
  createdAt: number;
  expiresAt: number;
  guardExpiresAt: number;
}>;

const LEGACY_INTENT_KEYS = [
  'version', 'provider', 'sourceStableId', 'requesterUidHash', 'sourceAuthUidHash',
  'sourceAccountGeneration', 'requestClientRequestId', 'confirmClientRequestId',
  'handoffRequestId', 'createdAt', 'expiresAt',
] as const;
const INTENT_KEYS = [...LEGACY_INTENT_KEYS, 'guardExpiresAt'] as const;

function flowError(code: string): Error { return new Error(code); }

function strictId(value: unknown, code: string, maxLength = 160): string {
  if (typeof value !== 'string') throw flowError(code);
  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength || normalized.includes('/')) throw flowError(code);
  return normalized;
}

function defaultRequestId(): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Crypto = require('expo-crypto') as { randomUUID?: () => string };
  return strictId(Crypto.randomUUID?.(), 'clean_recovery_request_id_unavailable');
}

function parseIntent(raw: string): RequestIntent {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw flowError('clean_recovery_request_intent_invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw flowError('clean_recovery_request_intent_invalid');
  }
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  const hasCurrentShape = keys.length === INTENT_KEYS.length
    && keys.every(key => INTENT_KEYS.includes(key as any));
  const hasLegacyShape = keys.length === LEGACY_INTENT_KEYS.length
    && keys.every(key => LEGACY_INTENT_KEYS.includes(key as any));
  if (!hasCurrentShape && !hasLegacyShape) {
    throw flowError('clean_recovery_request_intent_invalid');
  }
  const integer = (input: unknown): number => {
    if (typeof input !== 'number' || !Number.isInteger(input) || !Number.isFinite(input)) {
      throw flowError('clean_recovery_request_intent_invalid');
    }
    return input;
  };
  const provider = data.provider;
  if (data.version !== 1 || (provider !== 'google' && provider !== 'apple')) {
    throw flowError('clean_recovery_request_intent_invalid');
  }
  const hash = (input: unknown): string => {
    const normalized = strictId(input, 'clean_recovery_request_intent_invalid');
    if (!/^[a-f0-9]{64}$/.test(normalized)) throw flowError('clean_recovery_request_intent_invalid');
    return normalized;
  };
  const createdAt = integer(data.createdAt);
  const expiresAt = integer(data.expiresAt);
  const guardExpiresAt = hasCurrentShape ? integer(data.guardExpiresAt) : expiresAt;
  const sourceAccountGeneration = integer(data.sourceAccountGeneration);
  if (
    sourceAccountGeneration <= 0
    || expiresAt <= createdAt
    || expiresAt > createdAt + AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS
    || guardExpiresAt < createdAt
    || guardExpiresAt > expiresAt
  ) throw flowError('clean_recovery_request_intent_invalid');
  return {
    version: 1,
    provider,
    sourceStableId: strictId(data.sourceStableId, 'clean_recovery_request_intent_invalid'),
    requesterUidHash: hash(data.requesterUidHash),
    sourceAuthUidHash: hash(data.sourceAuthUidHash),
    sourceAccountGeneration,
    requestClientRequestId: strictId(data.requestClientRequestId, 'clean_recovery_request_intent_invalid'),
    confirmClientRequestId: strictId(data.confirmClientRequestId, 'clean_recovery_request_intent_invalid'),
    handoffRequestId: strictId(data.handoffRequestId, 'clean_recovery_request_intent_invalid'),
    createdAt,
    expiresAt,
    guardExpiresAt,
  };
}

async function persistIntent(intent: RequestIntent): Promise<string> {
  const raw = JSON.stringify(intent);
  await AsyncStorage.setItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY, raw);
  if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY) !== raw) {
    throw flowError('clean_recovery_request_intent_persist_failed');
  }
  return raw;
}

async function clearIntentIfExact(raw: string): Promise<void> {
  if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY) !== raw) return;
  await AsyncStorage.removeItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY);
  if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY) !== null) {
    throw flowError('clean_recovery_request_intent_clear_failed');
  }
}

async function replaceIntentIfExact(raw: string, intent: RequestIntent): Promise<string> {
  if (await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY) !== raw) {
    throw flowError('clean_recovery_request_intent_changed');
  }
  return persistIntent(intent);
}

async function expireIntentIfExact(raw: string, intent: RequestIntent, at: number): Promise<string> {
  const guardExpiresAt = Math.min(intent.expiresAt, Math.max(intent.createdAt, at));
  return replaceIntentIfExact(raw, { ...intent, guardExpiresAt });
}

async function assertNoPendingDelete(): Promise<void> {
  let raw: string | null;
  try { raw = await readAccountDeletePendingAuthRaw(); } catch { throw flowError('account_delete_guard_unavailable'); }
  if (raw !== null) throw flowError('account_delete_pending');
}

function defaultIdentity(): { uid: string; isAnonymous: boolean } | null {
  const current = auth()?.currentUser;
  const uid = typeof current?.uid === 'string' ? current.uid.trim() : '';
  return uid ? { uid, isAnonymous: current?.isAnonymous === true } : null;
}

let activeOwner: symbol | null = null;

export function createCleanInstallRecoveryFlow(
  options: CleanInstallRecoveryFlowOptions = {},
): CleanInstallRecoveryFlowController {
  const owner = Symbol('clean-install-recovery');
  const now = options.now ?? Date.now;
  const createRequestId = options.createRequestId ?? defaultRequestId;
  let state: CleanInstallRecoveryFlowState = { stage: 'idle' };
  let provider: SecondaryRecoveryProvider | null = null;
  let session: SecondaryAuthRecoverySession | null = null;
  let sourceStableId = '';
  let sourceAuthUid = '';
  let requesterUidHash = '';
  let sourceAuthUidHash = '';
  let sourceGeneration: AccountGenerationToken | null = null;
  let activeOperation: Promise<unknown> | null = null;
  let releaseSharedTransition: (() => void) | null = null;

  const snapshot = () => ({ ...state });
  const setState = (next: CleanInstallRecoveryFlowState) => { state = next; return snapshot(); };
  const release = () => {
    if (activeOwner === owner) activeOwner = null;
    releaseSharedTransition?.();
    releaseSharedTransition = null;
  };
  const track = <T>(work: () => Promise<T>): Promise<T> => {
    if (activeOperation) return Promise.reject(flowError('clean_recovery_flow_in_progress'));
    const task = work().finally(() => { if (activeOperation === task) activeOperation = null; });
    activeOperation = task;
    return task;
  };

  const assertScope = async (): Promise<void> => {
    if (!provider || !session || !sourceGeneration) throw flowError('clean_recovery_flow_not_started');
    if (session.provider !== provider || !session.authUid || await hashCleanInstallRequesterUid(session.authUid) !== requesterUidHash) {
      throw flowError('clean_recovery_provider_session_changed');
    }
    if (String(await getStableId() ?? '').trim() !== sourceStableId) {
      throw flowError('clean_recovery_source_stable_changed');
    }
    if (!isCurrentAccountGeneration(sourceGeneration, sourceStableId)) {
      throw flowError('clean_recovery_source_generation_changed');
    }
    const identity = defaultIdentity();
    if (!identity || !identity.isAnonymous || identity.uid !== sourceAuthUid) {
      throw flowError('clean_recovery_source_auth_changed');
    }
  };

  const journalScope = () => ({
    provider: provider!,
    sourceStableId,
    requesterUidHash,
    sourceAuthUidHash,
    sourceAccountGeneration: sourceGeneration!.generation,
    now: now(),
  });

  const createIntent = (): RequestIntent => {
    const createdAt = now();
    return {
      version: 1,
      provider: provider!,
      sourceStableId,
      requesterUidHash,
      sourceAuthUidHash,
      sourceAccountGeneration: sourceGeneration!.generation,
      requestClientRequestId: strictId(createRequestId(), 'clean_recovery_request_id_invalid'),
      confirmClientRequestId: strictId(createRequestId(), 'clean_recovery_request_id_invalid'),
      handoffRequestId: strictId(createRequestId(), 'clean_recovery_request_id_invalid'),
      createdAt,
      expiresAt: createdAt + AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS,
      guardExpiresAt: createdAt + AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS,
    };
  };

  const intentMatchesScope = (intent: RequestIntent): boolean => Boolean(
    provider
    && sourceGeneration
    && intent.provider === provider
    && intent.sourceStableId === sourceStableId
    && intent.requesterUidHash === requesterUidHash
    && intent.sourceAuthUidHash === sourceAuthUidHash
    && intent.sourceAccountGeneration === sourceGeneration.generation
    && intent.expiresAt > now()
  );

  const start = (selectedProvider: SecondaryRecoveryProvider) => track(async () => {
    if (state.stage !== 'idle') throw flowError('clean_recovery_flow_invalid_state');
    if (activeOwner && activeOwner !== owner) throw flowError('clean_recovery_flow_global_in_progress');
    provider = selectedProvider;
    setState({ stage: 'starting', provider });
    try {
      releaseSharedTransition = beginCleanInstallRecoveryTransition();
      activeOwner = owner;
      await assertNoPendingDelete();
      const ensuredStableId = String(await ensureAnonUser() ?? '').trim();
      sourceStableId = String(await getStableId() ?? '').trim();
      if (!sourceStableId || ensuredStableId !== sourceStableId) {
        throw flowError('clean_recovery_source_stable_unavailable');
      }
      const identity = defaultIdentity();
      if (!identity) throw flowError('clean_recovery_default_auth_not_hydrated');
      if (!identity.isAnonymous) throw flowError('clean_recovery_default_auth_not_anonymous');
      sourceAuthUid = identity.uid;
      sourceGeneration = captureAccountGeneration();
      if (
        sourceGeneration.phase !== 'active'
        || sourceGeneration.stableId !== sourceStableId
        || sourceGeneration.generation <= 0
        || !isCurrentAccountGeneration(sourceGeneration, sourceStableId)
      ) throw flowError('clean_recovery_source_generation_unavailable');
      await assertNoPendingDelete();
      const result = await startSecondaryAuthRecoverySession(
        provider,
        acquireAuthRecoveryNativeCredential,
      );
      if (result.result === 'cancelled') {
        release();
        return setState({ stage: 'cancelled', provider });
      }
      session = result.session;
      if (session.provider !== provider) throw flowError('clean_recovery_provider_session_changed');
      requesterUidHash = await hashCleanInstallRequesterUid(session.authUid);
      sourceAuthUidHash = await hashCleanInstallRequesterUid(sourceAuthUid);
      await assertScope();
      const existing = await readCleanInstallRecoveryJournal(journalScope());
      if (existing.status === 'quarantined') {
        return setState({ stage: 'quarantined', provider, reason: existing.reason });
      }
      if (existing.status === 'ready') {
        return setState({
          stage: existing.journal.phase === 'confirmed' ? 'confirmed' : 'code_sent',
          provider,
          expiresAt: existing.journal.expiresAt,
        });
      }
      return setState({ stage: 'ready', provider });
    } catch (error) {
      setState({ stage: 'failed', provider, reason: String((error as Error)?.message ?? error) });
      await session?.cleanup().catch(() => {});
      session = null;
      release();
      throw error;
    }
  });

  const requestCode = (email: string) => track(async () => {
    if (state.stage !== 'ready' || !provider || !session || !sourceGeneration) {
      throw flowError('clean_recovery_flow_invalid_state');
    }
    await assertNoPendingDelete();
    await assertScope();
    setState({ stage: 'requesting', provider });
    let intentRaw = await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY);
    let intent: RequestIntent;
    if (intentRaw) {
      intent = parseIntent(intentRaw);
      if (!intentMatchesScope(intent)) throw flowError('clean_recovery_request_intent_scope_mismatch');
    } else {
      intent = createIntent();
      intentRaw = await persistIntent(intent);
    }
    if (intent.guardExpiresAt <= now()) {
      intent = { ...intent, guardExpiresAt: intent.expiresAt };
      intentRaw = await replaceIntentIfExact(intentRaw, intent);
    }
    try {
      await assertNoPendingDelete();
      await assertScope();
      const result = await session.requestCleanInstallCode(email, intent.requestClientRequestId);
      await assertScope();
      if (
        !Number.isInteger(result.expiresInSec)
        || result.expiresInSec <= 0
        || !Number.isInteger(result.retryAfterSec)
        || result.retryAfterSec < 0
      ) throw flowError('clean_recovery_request_response_invalid');
      await persistCleanInstallChallenge({
        provider,
        sourceStableId,
        requesterUidHash,
        sourceAuthUidHash,
        sourceAccountGeneration: sourceGeneration.generation,
        challengeId: result.challengeId,
        requestClientRequestId: intent.requestClientRequestId,
        confirmClientRequestId: intent.confirmClientRequestId,
        expiresInSec: result.expiresInSec,
        now: now(),
      });
      return setState({
        stage: 'code_sent', provider,
        expiresAt: now() + Math.min(result.expiresInSec * 1000, AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS),
        retryAfterSec: result.retryAfterSec,
      });
    } catch (error) {
      try {
        intentRaw = await expireIntentIfExact(intentRaw, intent, now());
      } catch (expiryError) {
        setState({ stage: 'failed', provider, reason: String((expiryError as Error)?.message ?? expiryError) });
        throw expiryError;
      }
      setState({ stage: 'ready', provider });
      throw error;
    }
  });

  const resendCode = (email: string) => track(async () => {
    if (state.stage !== 'code_sent' || !provider || !session || !sourceGeneration) {
      throw flowError('clean_recovery_flow_invalid_state');
    }
    await assertNoPendingDelete();
    await assertScope();
    const current = await readCleanInstallRecoveryJournal(journalScope());
    if (current.status !== 'ready' || current.journal.phase !== 'challenge') {
      throw flowError('clean_recovery_challenge_unavailable');
    }
    setState({ stage: 'requesting', provider });
    let intentRaw = await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY);
    let intent: RequestIntent;
    if (intentRaw) {
      intent = parseIntent(intentRaw);
      if (!intentMatchesScope(intent)) throw flowError('clean_recovery_request_intent_scope_mismatch');
      if (intent.requestClientRequestId === current.journal.requestClientRequestId) {
        intent = createIntent();
        intentRaw = await replaceIntentIfExact(intentRaw, intent);
      }
    } else {
      intent = createIntent();
      intentRaw = await persistIntent(intent);
    }
    if (intent.guardExpiresAt <= now()) {
      intent = { ...intent, guardExpiresAt: intent.expiresAt };
      intentRaw = await replaceIntentIfExact(intentRaw, intent);
    }
    try {
      await assertNoPendingDelete();
      await assertScope();
      const result = await session.requestCleanInstallCode(email, intent.requestClientRequestId);
      await assertScope();
      if (
        !Number.isInteger(result.expiresInSec)
        || result.expiresInSec <= 0
        || !Number.isInteger(result.retryAfterSec)
        || result.retryAfterSec < 0
      ) throw flowError('clean_recovery_request_response_invalid');
      await persistCleanInstallChallenge({
        provider,
        sourceStableId,
        requesterUidHash,
        sourceAuthUidHash,
        sourceAccountGeneration: sourceGeneration.generation,
        challengeId: result.challengeId,
        requestClientRequestId: intent.requestClientRequestId,
        confirmClientRequestId: intent.confirmClientRequestId,
        expiresInSec: result.expiresInSec,
        now: now(),
      });
      return setState({
        stage: 'code_sent', provider,
        expiresAt: now() + Math.min(result.expiresInSec * 1000, AUTH_CLEAN_INSTALL_CHALLENGE_TTL_MS),
        retryAfterSec: result.retryAfterSec,
      });
    } catch (error) {
      try {
        intentRaw = await expireIntentIfExact(intentRaw, intent, now());
      } catch (expiryError) {
        setState({ stage: 'failed', provider, reason: String((expiryError as Error)?.message ?? expiryError) });
        throw expiryError;
      }
      setState({ stage: 'code_sent', provider, expiresAt: current.journal.expiresAt });
      throw error;
    }
  });

  const continueConfirmedInternal = async (
    ready: Extract<Awaited<ReturnType<typeof readCleanInstallRecoveryJournal>>, { status: 'ready' }>,
  ) => {
    if (!provider || !session || ready.journal.phase !== 'confirmed') {
      throw flowError('clean_recovery_flow_invalid_state');
    }
    await assertNoPendingDelete();
    await assertScope();
    setState({ stage: 'issuing', provider });
    const issued = await session.issueHandoffToken(
      ready.journal.recoveryEventId!,
      ready.journal.handoffRequestId!,
    );
    if (issued.stableId !== ready.journal.targetStableId) {
      throw flowError('clean_recovery_handoff_target_mismatch');
    }
    await assertNoPendingDelete();
    await assertScope();
    const expectedUid = session.authUid;
    await session.cleanup();
    session = null;
    await assertNoPendingDelete();
    setState({ stage: 'adopting', provider });
    const result = await adoptCleanInstallRecoveryHandoff({
      customToken: issued.customToken,
      recoveryEventId: ready.journal.recoveryEventId!,
      sourceStableId,
      targetStableId: ready.journal.targetStableId!,
      sourceAuthUid,
      expectedUid,
      sourceAccountGeneration: sourceGeneration!.generation,
      handoffAcknowledgeUntil: issued.handoffAcknowledgeUntil,
      cleanRecoveryJournalRaw: ready.raw,
    });
    if (result.result === 'completed' || result.result === 'ack_pending') {
      setState({ stage: result.result, provider });
      release();
      return { result: result.result };
    }
    if (result.result === 'quarantined') {
      setState({ stage: 'quarantined', provider, reason: result.reason });
      release();
      return result;
    }
    throw flowError('clean_recovery_adoption_response_invalid');
  };

  const confirmCode = (codeInput: string) => track(async () => {
    if (state.stage !== 'code_sent' || !provider || !session) {
      throw flowError('clean_recovery_flow_invalid_state');
    }
    const code = typeof codeInput === 'string' ? codeInput.trim() : '';
    if (!/^\d{6}$/.test(code)) throw flowError('clean_recovery_code_invalid');
    await assertNoPendingDelete();
    await assertScope();
    const current = await readCleanInstallRecoveryJournal(journalScope());
    if (current.status !== 'ready' || current.journal.phase !== 'challenge') {
      throw flowError('clean_recovery_challenge_unavailable');
    }
    setState({ stage: 'confirming', provider });
    let confirmationPersisted = false;
    try {
      await assertNoPendingDelete();
      const confirmation = await session.confirmCleanInstallCode(
        current.journal.challengeId,
        code,
        current.journal.confirmClientRequestId,
      );
      await assertScope();
      if (confirmation.stableId === sourceStableId) {
        throw flowError('clean_recovery_distinct_target_required');
      }
      const intentRaw = await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY);
      const handoffRequestId = intentRaw
        ? parseIntent(intentRaw).handoffRequestId
        : strictId('handoff-' + current.journal.confirmClientRequestId, 'clean_recovery_request_id_invalid');
      const rawConfirmed = await promoteCleanInstallRecoveryConfirmed(current.raw, {
        targetStableId: confirmation.stableId,
        recoveryEventId: confirmation.recoveryEventId,
        handoffRequestId,
        handoffEligibleUntil: confirmation.handoffEligibleUntil,
        now: now(),
      });
      if (intentRaw) await clearIntentIfExact(intentRaw);
      const promoted = await readCleanInstallRecoveryJournal(journalScope());
      if (promoted.status !== 'ready' || promoted.raw !== rawConfirmed || promoted.journal.phase !== 'confirmed') {
        throw flowError('clean_recovery_confirm_persist_failed');
      }
      confirmationPersisted = true;
      setState({ stage: 'confirmed', provider, expiresAt: promoted.journal.expiresAt });
      return await continueConfirmedInternal(promoted);
    } catch (error) {
      setState({
        stage: confirmationPersisted ? 'confirmed' : 'code_sent',
        provider,
        expiresAt: current.journal.expiresAt,
      });
      throw error;
    }
  });

  const resumeConfirmed = () => track(async () => {
    if (state.stage !== 'confirmed') throw flowError('clean_recovery_flow_invalid_state');
    const current = await readCleanInstallRecoveryJournal(journalScope());
    if (current.status !== 'ready' || current.journal.phase !== 'confirmed') {
      throw flowError('clean_recovery_confirmed_unavailable');
    }
    return continueConfirmedInternal(current);
  });

  const dispose = async () => {
    if (activeOperation) await activeOperation.catch(() => {});
    await session?.cleanup().catch(() => {});
    session = null;
    release();
  };
  const cancel = async () => {
    if (activeOperation) await activeOperation.catch(() => {});
    if (state.stage === 'confirmed' || state.stage === 'adopting') {
      throw flowError('clean_recovery_confirmed_cannot_cancel');
    }
    const current = provider && requesterUidHash && sourceAuthUidHash && sourceGeneration
      ? await readCleanInstallRecoveryJournal(journalScope())
      : null;
    if (current?.status === 'ready') await clearCleanInstallRecoveryJournalIfExact(current.raw);
    const intentRaw = await AsyncStorage.getItem(AUTH_CLEAN_INSTALL_REQUEST_INTENT_KEY);
    if (intentRaw) await clearIntentIfExact(intentRaw);
    await dispose();
    setState({ stage: 'cancelled', ...(provider ? { provider } : {}) });
  };

  return { getState: snapshot, start, requestCode, resendCode, confirmCode, resumeConfirmed, dispose, cancel };
}

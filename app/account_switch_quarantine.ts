import AsyncStorage from '@react-native-async-storage/async-storage';

export const ACCOUNT_SWITCH_QUARANTINE_KEY = 'account_switch_quarantine_v1';
export const ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY = 'account_switch_completion_receipt_v1';
export const ACCOUNT_SWITCH_POST_COMPLETION_HANDOFF_KEY = 'account_switch_post_completion_handoff_v1';
export const ACCOUNT_PROVIDER_HANDOFF_KEY = 'account_provider_handoff_v1';

export type AccountSwitchPhase =
  | 'prepared'
  | 'provider_signed_out'
  | 'local_data_cleared'
  | 'stable_id_cleared'
  | 'anonymous_authenticated'
  | 'fresh_stable_created'
  | 'ready';

export type AccountSwitchOwnerProvider = 'anonymous' | 'google' | 'apple' | 'none';

export type AccountProviderHandoffMarker = Readonly<{
  version: 1;
  phase: 'prepared' | 'credential_ready' | 'authenticated';
  operationId: string;
  nonce: string;
  ownerStableId: string;
  ownerAuthUid: string;
  provider: 'google' | 'apple';
  targetProviderSubject: string | null;
  targetAuthUid: string | null;
  createdAt: number;
  updatedAt: number;
}>;

export type AccountSwitchQuarantineMarker = Readonly<{
  version: 1;
  phase: AccountSwitchPhase;
  operationId: string;
  nonce: string;
  ownerStableId: string;
  ownerAuthUid: string | null;
  ownerProvider: AccountSwitchOwnerProvider;
  freshAuthUid: string | null;
  freshStableId: string | null;
  createdAt: number;
  updatedAt: number;
}>;

export type AccountSwitchQuarantineSnapshot = Readonly<{
  visible: boolean;
  status: 'idle' | 'recovering' | 'retryable' | 'quarantined';
  reason: string | null;
}>;

export type AccountSwitchRecoveryDependencies = Readonly<{
  readStableId(): Promise<string | null>;
  readCachedStableId(): string | null;
  readAuthUser(): {
    uid: string;
    isAnonymous: boolean;
    provider?: AccountSwitchOwnerProvider;
    providerSubject?: string;
    providerSubjects?: Readonly<Partial<Record<'google' | 'apple', string>>>;
  } | null;
  invalidateGeneration(): void;
  beginPremiumTransition(): void;
  quiesce(): Promise<boolean>;
  signOut(): Promise<void>;
  wipeLocalData(): Promise<void>;
  clearStableId(): Promise<void>;
  ensureAnonymousIdentity(): Promise<void>;
  activateGeneration(stableId: string): void;
}>;

export type AccountSwitchResumeResult =
  | Readonly<{ result: 'none' }>
  | Readonly<{ result: 'completed'; stableId: string; authUid: string }>
  | Readonly<{ result: 'retryable'; reason: string; detail?: string }>
  | Readonly<{ result: 'quarantined'; reason: string }>;

const PHASES: readonly AccountSwitchPhase[] = [
  'prepared',
  'provider_signed_out',
  'local_data_cleared',
  'stable_id_cleared',
  'anonymous_authenticated',
  'fresh_stable_created',
  'ready',
];

const MARKER_KEYS = [
  'version',
  'phase',
  'operationId',
  'nonce',
  'ownerStableId',
  'ownerAuthUid',
  'ownerProvider',
  'freshAuthUid',
  'freshStableId',
  'createdAt',
  'updatedAt',
] as const;

const COMPLETION_RECEIPT_KEYS = [
  'version', 'operationId', 'nonce', 'freshAuthUid', 'freshStableId', 'createdAt',
] as const;

const POST_COMPLETION_HANDOFF_KEYS = [
  'version', 'operationId', 'nonce', 'freshAuthUid', 'freshStableId', 'createdAt', 'expiresAt',
] as const;

const PROVIDER_HANDOFF_KEYS = [
  'version', 'phase', 'operationId', 'nonce', 'ownerStableId', 'ownerAuthUid',
  'provider', 'targetProviderSubject', 'targetAuthUid', 'createdAt', 'updatedAt',
] as const;

type AccountSwitchCompletionReceipt = Readonly<{
  version: 1;
  operationId: string;
  nonce: string;
  freshAuthUid: string;
  freshStableId: string;
  createdAt: number;
}>;

type AccountSwitchPostCompletionHandoff = Readonly<{
  version: 1;
  operationId: string;
  nonce: string;
  freshAuthUid: string;
  freshStableId: string;
  createdAt: number;
  expiresAt: number;
}>;

let mutationTail: Promise<void> = Promise.resolve();
let recoveryFlight: Promise<AccountSwitchResumeResult> | null = null;
let snapshot: AccountSwitchQuarantineSnapshot = {
  visible: false,
  status: 'idle',
  reason: null,
};
const listeners = new Set<() => void>();
const POST_COMPLETION_HANDOFF_TTL_MS = 24 * 60 * 60 * 1000;

function publish(next: AccountSwitchQuarantineSnapshot): void {
  snapshot = next;
  listeners.forEach((listener) => {
    try { listener(); } catch { /* a UI listener cannot interrupt the quarantine */ }
  });
}

export function getAccountSwitchQuarantineSnapshot(): AccountSwitchQuarantineSnapshot {
  return snapshot;
}

export function subscribeAccountSwitchQuarantine(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Boot has already observed the durable key but may still be waiting for
 * Firebase persistence hydration. Publish the wall without starting auth,
 * cloud, RevenueCat, or stable-id work.
 */
export function announceAccountSwitchQuarantinePresence(): void {
  publish({ visible: true, status: 'recovering', reason: null });
}

export function announceAccountSwitchQuarantineFailure(reason: string): void {
  publish({ visible: true, status: 'retryable', reason });
}

async function withMutation<T>(work: () => Promise<T>): Promise<T> {
  const previous = mutationTail;
  let release!: () => void;
  mutationTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await work();
  } finally {
    release();
  }
}

function strictId(value: unknown, code: string): string {
  if (typeof value !== 'string') throw new Error(code);
  const normalized = value.trim();
  if (
    normalized.length < 1
    || normalized.length > 160
    || normalized.includes('/')
    || !/^[A-Za-z0-9_.:-]+$/.test(normalized)
  ) throw new Error(code);
  return normalized;
}

function nullableId(value: unknown, code: string): string | null {
  if (value === null) return null;
  return strictId(value, code);
}

function timestamp(value: unknown): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new Error('account_switch_marker_invalid');
  }
  return value;
}

function parseMarker(raw: string): AccountSwitchQuarantineMarker {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('account_switch_marker_invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('account_switch_marker_invalid');
  }
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  if (
    keys.length !== MARKER_KEYS.length
    || keys.some((key) => !MARKER_KEYS.includes(key as typeof MARKER_KEYS[number]))
    || data.version !== 1
    || !PHASES.includes(data.phase as AccountSwitchPhase)
    || !['anonymous', 'google', 'apple', 'none'].includes(String(data.ownerProvider))
  ) throw new Error('account_switch_marker_invalid');
  const createdAt = timestamp(data.createdAt);
  const updatedAt = timestamp(data.updatedAt);
  if (updatedAt < createdAt) throw new Error('account_switch_marker_invalid');
  const marker: AccountSwitchQuarantineMarker = {
    version: 1,
    phase: data.phase as AccountSwitchPhase,
    operationId: strictId(data.operationId, 'account_switch_marker_invalid'),
    nonce: strictId(data.nonce, 'account_switch_marker_invalid'),
    ownerStableId: strictId(data.ownerStableId, 'account_switch_marker_invalid'),
    ownerAuthUid: nullableId(data.ownerAuthUid, 'account_switch_marker_invalid'),
    ownerProvider: data.ownerProvider as AccountSwitchOwnerProvider,
    freshAuthUid: nullableId(data.freshAuthUid, 'account_switch_marker_invalid'),
    freshStableId: nullableId(data.freshStableId, 'account_switch_marker_invalid'),
    createdAt,
    updatedAt,
  };
  const phaseIndex = PHASES.indexOf(marker.phase);
  if (phaseIndex < PHASES.indexOf('anonymous_authenticated') && (
    marker.freshAuthUid !== null || marker.freshStableId !== null
  )) throw new Error('account_switch_marker_invalid');
  if (marker.phase === 'anonymous_authenticated' && (
    marker.freshAuthUid === null || marker.freshStableId !== null
  )) throw new Error('account_switch_marker_invalid');
  if (phaseIndex >= PHASES.indexOf('fresh_stable_created') && (
    marker.freshAuthUid === null || marker.freshStableId === null
  )) throw new Error('account_switch_marker_invalid');
  return marker;
}

function parseCompletionReceipt(raw: string): AccountSwitchCompletionReceipt {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('account_switch_receipt_invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('account_switch_receipt_invalid');
  }
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  if (
    keys.length !== COMPLETION_RECEIPT_KEYS.length
    || keys.some((key) => !COMPLETION_RECEIPT_KEYS.includes(key as typeof COMPLETION_RECEIPT_KEYS[number]))
    || data.version !== 1
  ) throw new Error('account_switch_receipt_invalid');
  return {
    version: 1,
    operationId: strictId(data.operationId, 'account_switch_receipt_invalid'),
    nonce: strictId(data.nonce, 'account_switch_receipt_invalid'),
    freshAuthUid: strictId(data.freshAuthUid, 'account_switch_receipt_invalid'),
    freshStableId: strictId(data.freshStableId, 'account_switch_receipt_invalid'),
    createdAt: timestamp(data.createdAt),
  };
}

function parsePostCompletionHandoff(raw: string): AccountSwitchPostCompletionHandoff {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('account_switch_handoff_invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('account_switch_handoff_invalid');
  }
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  if (
    keys.length !== POST_COMPLETION_HANDOFF_KEYS.length
    || keys.some((key) => !POST_COMPLETION_HANDOFF_KEYS.includes(key as typeof POST_COMPLETION_HANDOFF_KEYS[number]))
    || data.version !== 1
  ) throw new Error('account_switch_handoff_invalid');
  const createdAt = timestamp(data.createdAt);
  const expiresAt = timestamp(data.expiresAt);
  if (expiresAt < createdAt) throw new Error('account_switch_handoff_invalid');
  return {
    version: 1,
    operationId: strictId(data.operationId, 'account_switch_handoff_invalid'),
    nonce: strictId(data.nonce, 'account_switch_handoff_invalid'),
    freshAuthUid: strictId(data.freshAuthUid, 'account_switch_handoff_invalid'),
    freshStableId: strictId(data.freshStableId, 'account_switch_handoff_invalid'),
    createdAt,
    expiresAt,
  };
}

function parseProviderHandoff(raw: string): AccountProviderHandoffMarker {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error('provider_handoff_invalid'); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('provider_handoff_invalid');
  }
  const data = value as Record<string, unknown>;
  const keys = Object.keys(data);
  if (
    keys.length !== PROVIDER_HANDOFF_KEYS.length
    || keys.some((key) => !PROVIDER_HANDOFF_KEYS.includes(key as typeof PROVIDER_HANDOFF_KEYS[number]))
    || data.version !== 1
    || !['prepared', 'credential_ready', 'authenticated'].includes(String(data.phase))
    || !['google', 'apple'].includes(String(data.provider))
  ) throw new Error('provider_handoff_invalid');
  const createdAt = timestamp(data.createdAt);
  const updatedAt = timestamp(data.updatedAt);
  if (updatedAt < createdAt) throw new Error('provider_handoff_invalid');
  const marker: AccountProviderHandoffMarker = {
    version: 1,
    phase: data.phase as AccountProviderHandoffMarker['phase'],
    operationId: strictId(data.operationId, 'provider_handoff_invalid'),
    nonce: strictId(data.nonce, 'provider_handoff_invalid'),
    ownerStableId: strictId(data.ownerStableId, 'provider_handoff_invalid'),
    ownerAuthUid: strictId(data.ownerAuthUid, 'provider_handoff_invalid'),
    provider: data.provider as AccountProviderHandoffMarker['provider'],
    targetProviderSubject: nullableId(data.targetProviderSubject, 'provider_handoff_invalid'),
    targetAuthUid: nullableId(data.targetAuthUid, 'provider_handoff_invalid'),
    createdAt,
    updatedAt,
  };
  if (
    (marker.phase === 'prepared' && (
      marker.targetProviderSubject !== null || marker.targetAuthUid !== null
    ))
    || (marker.phase === 'credential_ready' && marker.targetAuthUid !== null)
    || (marker.phase === 'authenticated' && marker.targetAuthUid === null)
  ) {
    throw new Error('provider_handoff_invalid');
  }
  return marker;
}

async function setVerified(key: string, value: string, errorCode: string): Promise<void> {
  await AsyncStorage.setItem(key, value);
  if (await AsyncStorage.getItem(key) !== value) throw new Error(errorCode);
}

async function removeVerified(key: string, errorCode: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (removeError) {
    // Native storage can commit the delete and then reject while transporting
    // its result. Read back in the same attempt: absence is the durable proof,
    // while presence preserves the original failure for a safe retry.
    try {
      if (await AsyncStorage.getItem(key) === null) return;
    } catch {
      // The delete result is unknowable; retain the fail-closed error below.
    }
    throw removeError;
  }
  if (await AsyncStorage.getItem(key) !== null) throw new Error(errorCode);
}

function providerProofFor(
  auth: ReturnType<AccountSwitchRecoveryDependencies['readAuthUser']>,
  provider: 'google' | 'apple',
): Readonly<{ linked: boolean; subject: string | null }> {
  if (!auth || auth.isAnonymous) return { linked: false, subject: null };
  if (auth.providerSubjects) {
    const subject = auth.providerSubjects[provider];
    return typeof subject === 'string' && subject.trim()
      ? { linked: true, subject: subject.trim() }
      : { linked: false, subject: null };
  }
  if (auth.provider !== provider) return { linked: false, subject: null };
  const subject = typeof auth.providerSubject === 'string' ? auth.providerSubject.trim() : '';
  return { linked: true, subject: subject || null };
}

export async function prepareProviderCredentialHandoff(input: Readonly<{
  operationId: string;
  nonce: string;
  ownerStableId: string;
  ownerAuthUid: string;
  provider: 'google' | 'apple';
  now?: number;
}>): Promise<AccountProviderHandoffMarker> {
  return withMutation(async () => {
    if (await AsyncStorage.getItem(ACCOUNT_PROVIDER_HANDOFF_KEY) !== null) {
      throw new Error('provider_handoff_active');
    }
    const now = timestamp(input.now ?? Date.now());
    const marker = parseProviderHandoff(JSON.stringify({
      version: 1,
      phase: 'prepared',
      operationId: strictId(input.operationId, 'provider_handoff_invalid'),
      nonce: strictId(input.nonce, 'provider_handoff_invalid'),
      ownerStableId: strictId(input.ownerStableId, 'provider_handoff_invalid'),
      ownerAuthUid: strictId(input.ownerAuthUid, 'provider_handoff_invalid'),
      provider: input.provider,
      targetProviderSubject: null,
      targetAuthUid: null,
      createdAt: now,
      updatedAt: now,
    }));
    await setVerified(ACCOUNT_PROVIDER_HANDOFF_KEY, JSON.stringify(marker), 'provider_handoff_persist_failed');
    publish({ visible: true, status: 'recovering', reason: null });
    return marker;
  });
}

export async function markProviderCredentialHandoffCredentialReady(
  expected: AccountProviderHandoffMarker,
  targetProviderSubject: string | null,
): Promise<AccountProviderHandoffMarker> {
  return withMutation(async () => {
    const raw = await AsyncStorage.getItem(ACCOUNT_PROVIDER_HANDOFF_KEY);
    if (raw !== JSON.stringify(expected)) throw new Error('provider_handoff_changed');
    if (expected.phase !== 'prepared') throw new Error('provider_handoff_phase_invalid');
    const marker = parseProviderHandoff(JSON.stringify({
      ...expected,
      phase: 'credential_ready',
      targetProviderSubject: targetProviderSubject === null
        ? null
        : strictId(targetProviderSubject, 'provider_handoff_invalid'),
      updatedAt: Math.max(Date.now(), expected.updatedAt),
    }));
    await setVerified(ACCOUNT_PROVIDER_HANDOFF_KEY, JSON.stringify(marker), 'provider_handoff_persist_failed');
    return marker;
  });
}

export async function markProviderCredentialHandoffAuthenticated(
  expected: AccountProviderHandoffMarker,
  targetAuthUid: string,
): Promise<AccountProviderHandoffMarker> {
  return withMutation(async () => {
    const raw = await AsyncStorage.getItem(ACCOUNT_PROVIDER_HANDOFF_KEY);
    if (raw !== JSON.stringify(expected)) throw new Error('provider_handoff_changed');
    if (expected.phase !== 'credential_ready') throw new Error('provider_handoff_phase_invalid');
    const marker = parseProviderHandoff(JSON.stringify({
      ...expected,
      phase: 'authenticated',
      targetAuthUid: strictId(targetAuthUid, 'provider_handoff_invalid'),
      updatedAt: Math.max(Date.now(), expected.updatedAt),
    }));
    await setVerified(ACCOUNT_PROVIDER_HANDOFF_KEY, JSON.stringify(marker), 'provider_handoff_persist_failed');
    return marker;
  });
}

export async function clearProviderCredentialHandoff(expected: AccountProviderHandoffMarker): Promise<void> {
  await withMutation(async () => {
    const raw = await AsyncStorage.getItem(ACCOUNT_PROVIDER_HANDOFF_KEY);
    if (raw !== JSON.stringify(expected)) throw new Error('provider_handoff_changed');
    await removeVerified(ACCOUNT_PROVIDER_HANDOFF_KEY, 'provider_handoff_clear_failed');
    publish({ visible: false, status: 'idle', reason: null });
  });
}

async function persistVerified(marker: AccountSwitchQuarantineMarker): Promise<AccountSwitchQuarantineMarker> {
  const raw = JSON.stringify(marker);
  await AsyncStorage.setItem(ACCOUNT_SWITCH_QUARANTINE_KEY, raw);
  if (await AsyncStorage.getItem(ACCOUNT_SWITCH_QUARANTINE_KEY) !== raw) {
    throw new Error('account_switch_marker_persist_failed');
  }
  publish({ visible: true, status: 'recovering', reason: null });
  return marker;
}

export async function prepareAccountSwitchQuarantine(input: Readonly<{
  operationId: string;
  nonce: string;
  ownerStableId: string;
  ownerAuthUid: string | null;
  ownerProvider: AccountSwitchOwnerProvider;
  now?: number;
}>): Promise<AccountSwitchQuarantineMarker> {
  return withMutation(async () => {
    const existing = await AsyncStorage.getItem(ACCOUNT_SWITCH_QUARANTINE_KEY);
    if (existing !== null) throw new Error('account_switch_transition_active');
    const now = timestamp(input.now ?? Date.now());
    return persistVerified({
      version: 1,
      phase: 'prepared',
      operationId: strictId(input.operationId, 'account_switch_operation_invalid'),
      nonce: strictId(input.nonce, 'account_switch_nonce_invalid'),
      ownerStableId: strictId(input.ownerStableId, 'account_switch_owner_invalid'),
      ownerAuthUid: nullableId(input.ownerAuthUid, 'account_switch_owner_invalid'),
      ownerProvider: input.ownerProvider,
      freshAuthUid: null,
      freshStableId: null,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function inspectAccountSwitchQuarantine(): Promise<
  | Readonly<{ status: 'none' }>
  | Readonly<{ status: 'corrupt'; raw: string }>
  | Readonly<{ status: 'ready'; marker: AccountSwitchQuarantineMarker; raw: string }>
> {
  const raw = await AsyncStorage.getItem(ACCOUNT_SWITCH_QUARANTINE_KEY);
  if (raw === null) {
    publish({ visible: false, status: 'idle', reason: null });
    return { status: 'none' };
  }
  try {
    const marker = parseMarker(raw);
    publish({ visible: true, status: 'recovering', reason: null });
    return { status: 'ready', marker, raw };
  } catch {
    publish({ visible: true, status: 'quarantined', reason: 'marker_invalid' });
    return { status: 'corrupt', raw };
  }
}

export async function advanceAccountSwitchQuarantine(
  expected: AccountSwitchQuarantineMarker,
  phase: AccountSwitchPhase,
  proof: Partial<Pick<AccountSwitchQuarantineMarker, 'freshAuthUid' | 'freshStableId'>> = {},
): Promise<AccountSwitchQuarantineMarker> {
  return withMutation(async () => {
    const raw = await AsyncStorage.getItem(ACCOUNT_SWITCH_QUARANTINE_KEY);
    if (raw === null || raw !== JSON.stringify(expected)) {
      throw new Error('account_switch_marker_changed');
    }
    if (phase === expected.phase) return expected;
    if (PHASES.indexOf(phase) !== PHASES.indexOf(expected.phase) + 1) {
      throw new Error('account_switch_phase_invalid');
    }
    return persistVerified(parseMarker(JSON.stringify({
      ...expected,
      phase,
      freshAuthUid: proof.freshAuthUid ?? expected.freshAuthUid,
      freshStableId: proof.freshStableId ?? expected.freshStableId,
      updatedAt: Math.max(Date.now(), expected.updatedAt),
    })));
  });
}

export async function clearCompletedAccountSwitchQuarantine(proof: Readonly<{
  operationId: string;
  nonce: string;
  freshAuthUid: string;
  freshStableId: string;
}>): Promise<boolean> {
  return withMutation(async () => {
    const raw = await AsyncStorage.getItem(ACCOUNT_SWITCH_QUARANTINE_KEY);
    if (raw === null) return false;
    let marker: AccountSwitchQuarantineMarker;
    try { marker = parseMarker(raw); } catch { return false; }
    if (
      marker.phase !== 'ready'
      || marker.operationId !== proof.operationId
      || marker.nonce !== proof.nonce
      || marker.freshAuthUid !== proof.freshAuthUid
      || marker.freshStableId !== proof.freshStableId
    ) return false;
    const receipt: AccountSwitchCompletionReceipt = {
      version: 1,
      operationId: marker.operationId,
      nonce: marker.nonce,
      freshAuthUid: marker.freshAuthUid,
      freshStableId: marker.freshStableId,
      createdAt: Date.now(),
    };
    const handoff: AccountSwitchPostCompletionHandoff = {
      version: 1,
      operationId: marker.operationId,
      nonce: marker.nonce,
      freshAuthUid: marker.freshAuthUid,
      freshStableId: marker.freshStableId,
      createdAt: receipt.createdAt,
      expiresAt: receipt.createdAt + POST_COMPLETION_HANDOFF_TTL_MS,
    };
    // The fresh anonymous account receives the welcome gift after this journal
    // completes. Keep an exact, short-lived proof of the already-confirmed
    // switch so that gift data is not mistaken for old account data.
    await setVerified(
      ACCOUNT_SWITCH_POST_COMPLETION_HANDOFF_KEY,
      JSON.stringify(handoff),
      'account_switch_handoff_persist_failed',
    );
    await setVerified(
      ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY,
      JSON.stringify(receipt),
      'account_switch_receipt_persist_failed',
    );
    await removeVerified(ACCOUNT_SWITCH_QUARANTINE_KEY, 'account_switch_marker_clear_failed');
    return true;
  });
}

export async function hasAccountSwitchPostCompletionHandoff(input: Readonly<{
  freshAuthUid: string;
  freshStableId: string;
  now?: number;
}>): Promise<boolean> {
  const raw = await AsyncStorage.getItem(ACCOUNT_SWITCH_POST_COMPLETION_HANDOFF_KEY);
  if (raw === null) return false;
  let handoff: AccountSwitchPostCompletionHandoff;
  try { handoff = parsePostCompletionHandoff(raw); } catch { return false; }
  const now = input.now ?? Date.now();
  return handoff.expiresAt >= now
    && handoff.freshAuthUid === input.freshAuthUid
    && handoff.freshStableId === input.freshStableId;
}

export async function consumeAccountSwitchPostCompletionHandoff(input: Readonly<{
  freshAuthUid: string;
  freshStableId: string;
  now?: number;
}>): Promise<boolean> {
  return withMutation(async () => {
    const raw = await AsyncStorage.getItem(ACCOUNT_SWITCH_POST_COMPLETION_HANDOFF_KEY);
    if (raw === null) return false;
    let handoff: AccountSwitchPostCompletionHandoff;
    try { handoff = parsePostCompletionHandoff(raw); } catch { return false; }
    const now = input.now ?? Date.now();
    if (
      handoff.expiresAt < now
      || handoff.freshAuthUid !== input.freshAuthUid
      || handoff.freshStableId !== input.freshStableId
    ) return false;
    await removeVerified(
      ACCOUNT_SWITCH_POST_COMPLETION_HANDOFF_KEY,
      'account_switch_handoff_clear_failed',
    );
    return true;
  });
}

function validOwnerStable(
  current: string | null,
  owner: string,
  allowAlreadyCleared = false,
): boolean {
  return current === owner || (allowAlreadyCleared && current === null);
}

async function resumeInternal(
  deps: AccountSwitchRecoveryDependencies,
): Promise<AccountSwitchResumeResult> {
  let raw: string | null;
  let receiptRaw: string | null;
  let providerHandoffRaw: string | null;
  try {
    [raw, receiptRaw, providerHandoffRaw] = await Promise.all([
      AsyncStorage.getItem(ACCOUNT_SWITCH_QUARANTINE_KEY),
      AsyncStorage.getItem(ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY),
      AsyncStorage.getItem(ACCOUNT_PROVIDER_HANDOFF_KEY),
    ]);
  } catch (error) {
    // An unreadable point-of-no-return journal is not evidence that no switch
    // exists. Keep every account-derived reader closed until storage recovers.
    deps.invalidateGeneration();
    deps.beginPremiumTransition();
    const detail = error instanceof Error ? error.message : 'unknown';
    publish({ visible: true, status: 'retryable', reason: 'marker_read_failed' });
    return { result: 'retryable', reason: 'marker_read_failed', detail };
  }
  if (raw === null && receiptRaw === null && providerHandoffRaw === null) {
    // A retry after an uncertain native remove response can prove that no
    // journal remains. Release a stale in-memory wall; cold boot will reach the
    // same state from durable storage.
    publish({ visible: false, status: 'idle', reason: null });
    return { result: 'none' };
  }

  // Presence alone is sufficient to close every account-derived reader. Parsing
  // never precedes invalidation, so even corrupt state cannot flash old access.
  deps.invalidateGeneration();
  deps.beginPremiumTransition();
  publish({ visible: true, status: 'recovering', reason: null });

  if (providerHandoffRaw !== null && (raw !== null || receiptRaw !== null)) {
    publish({ visible: true, status: 'quarantined', reason: 'journals_conflict' });
    return { result: 'quarantined', reason: 'journals_conflict' };
  }

  if (raw !== null && receiptRaw !== null) {
    let marker: AccountSwitchQuarantineMarker;
    let receipt: AccountSwitchCompletionReceipt;
    try {
      marker = parseMarker(raw);
      receipt = parseCompletionReceipt(receiptRaw);
    } catch {
      publish({ visible: true, status: 'quarantined', reason: 'receipt_marker_mismatch' });
      return { result: 'quarantined', reason: 'receipt_marker_mismatch' };
    }
    const exact = marker.phase === 'ready'
      && marker.operationId === receipt.operationId
      && marker.nonce === receipt.nonce
      && marker.freshAuthUid === receipt.freshAuthUid
      && marker.freshStableId === receipt.freshStableId;
    if (!exact) {
      publish({ visible: true, status: 'quarantined', reason: 'receipt_marker_mismatch' });
      return { result: 'quarantined', reason: 'receipt_marker_mismatch' };
    }
    try {
      await removeVerified(ACCOUNT_SWITCH_QUARANTINE_KEY, 'account_switch_marker_clear_failed');
      raw = null;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      publish({ visible: true, status: 'retryable', reason: 'marker_clear_failed' });
      return { result: 'retryable', reason: 'marker_clear_failed', detail };
    }
  }

  if (receiptRaw !== null) {
    let receipt: AccountSwitchCompletionReceipt;
    try { receipt = parseCompletionReceipt(receiptRaw); } catch {
      publish({ visible: true, status: 'quarantined', reason: 'receipt_invalid' });
      return { result: 'quarantined', reason: 'receipt_invalid' };
    }
    let quiesced = false;
    try { quiesced = await deps.quiesce(); } catch { quiesced = false; }
    if (!quiesced) {
      publish({ visible: true, status: 'retryable', reason: 'quiesce_failed' });
      return { result: 'retryable', reason: 'quiesce_failed' };
    }
    const currentAuth = deps.readAuthUser();
    const currentStable = await deps.readStableId();
    if (
      !currentAuth
      || !currentAuth.isAnonymous
      || currentAuth.uid !== receipt.freshAuthUid
      || currentStable !== receipt.freshStableId
    ) {
      publish({ visible: true, status: 'quarantined', reason: 'fresh_identity_invalid' });
      return { result: 'quarantined', reason: 'fresh_identity_invalid' };
    }
    try {
      await removeVerified(ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY, 'account_switch_receipt_clear_failed');
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      publish({ visible: true, status: 'retryable', reason: 'receipt_clear_failed' });
      return { result: 'retryable', reason: 'receipt_clear_failed', detail };
    }
    publish({ visible: false, status: 'idle', reason: null });
    deps.activateGeneration(currentStable);
    return { result: 'completed', stableId: currentStable, authUid: currentAuth.uid };
  }

  if (providerHandoffRaw !== null) {
    let handoff: AccountProviderHandoffMarker;
    try { handoff = parseProviderHandoff(providerHandoffRaw); } catch {
      publish({ visible: true, status: 'quarantined', reason: 'provider_handoff_invalid' });
      return { result: 'quarantined', reason: 'provider_handoff_invalid' };
    }
    const currentStable = await deps.readStableId();
    if (currentStable !== handoff.ownerStableId) {
      publish({ visible: true, status: 'quarantined', reason: 'owner_stable_mismatch' });
      return { result: 'quarantined', reason: 'owner_stable_mismatch' };
    }
    let quiesced = false;
    try { quiesced = await deps.quiesce(); } catch { quiesced = false; }
    if (!quiesced) {
      publish({ visible: true, status: 'retryable', reason: 'quiesce_failed' });
      return { result: 'retryable', reason: 'quiesce_failed' };
    }
    const currentAuth = deps.readAuthUser();
    try {
      if (currentAuth?.isAnonymous && currentAuth.uid === handoff.ownerAuthUid) {
        await clearProviderCredentialHandoff(handoff);
        deps.activateGeneration(handoff.ownerStableId);
        return { result: 'completed', stableId: handoff.ownerStableId, authUid: currentAuth.uid };
      }
      const currentProviderProof = providerProofFor(currentAuth, handoff.provider);
      if (
        currentAuth
        && currentAuth.isAnonymous === false
        && handoff.phase === 'credential_ready'
        && handoff.targetProviderSubject !== null
        && currentProviderProof.linked
        && currentProviderProof.subject === handoff.targetProviderSubject
      ) {
        handoff = await markProviderCredentialHandoffAuthenticated(handoff, currentAuth.uid);
      }
      const missingSubjectSafeRollback = Boolean(
        currentAuth
        && currentAuth.isAnonymous === false
        && handoff.phase === 'credential_ready'
        && handoff.targetProviderSubject === null
        && currentProviderProof.linked,
      );
      if (
        currentAuth
        && currentAuth.isAnonymous === false
        && !missingSubjectSafeRollback
        && (
          handoff.phase !== 'authenticated'
          || currentAuth.uid !== handoff.targetAuthUid
          || !currentProviderProof.linked
          || (
            handoff.targetProviderSubject !== null
            && currentProviderProof.subject !== handoff.targetProviderSubject
          )
        )
      ) {
        publish({ visible: true, status: 'quarantined', reason: 'provider_auth_mismatch' });
        return { result: 'quarantined', reason: 'provider_auth_mismatch' };
      }
      // The source was proven empty before this journal was created. Roll an
      // interrupted credential replacement back to a fresh anonymous identity;
      // this cannot delete provider B and prevents any A-local bytes under B auth.
      if (currentAuth) await deps.signOut();
      await deps.wipeLocalData();
      await deps.clearStableId();
      await deps.ensureAnonymousIdentity();
      const freshAuth = deps.readAuthUser();
      const freshStable = await deps.readStableId();
      if (
        !freshAuth?.isAnonymous
        || freshAuth.uid === handoff.ownerAuthUid
        || !freshStable
        || freshStable === handoff.ownerStableId
      ) throw new Error('fresh_identity_invalid');
      await clearProviderCredentialHandoff(handoff);
      deps.activateGeneration(freshStable);
      return { result: 'completed', stableId: freshStable, authUid: freshAuth.uid };
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      publish({ visible: true, status: 'retryable', reason: 'provider_handoff_recovery_failed' });
      return { result: 'retryable', reason: 'provider_handoff_recovery_failed', detail };
    }
  }

  if (raw === null) {
    publish({ visible: true, status: 'quarantined', reason: 'journal_state_invalid' });
    return { result: 'quarantined', reason: 'journal_state_invalid' };
  }
  let marker: AccountSwitchQuarantineMarker;
  try { marker = parseMarker(raw); } catch {
    publish({ visible: true, status: 'quarantined', reason: 'marker_invalid' });
    return { result: 'quarantined', reason: 'marker_invalid' };
  }

  let quiesced = false;
  try { quiesced = await deps.quiesce(); } catch { quiesced = false; }
  if (!quiesced) {
    publish({ visible: true, status: 'retryable', reason: 'quiesce_failed' });
    return { result: 'retryable', reason: 'quiesce_failed' };
  }

  for (;;) {
    try {
      if (marker.phase === 'prepared') {
        const currentStable = await deps.readStableId();
        const currentAuth = deps.readAuthUser();
        if (!validOwnerStable(currentStable, marker.ownerStableId)) {
          publish({ visible: true, status: 'quarantined', reason: 'owner_stable_mismatch' });
          return { result: 'quarantined', reason: 'owner_stable_mismatch' };
        }
        if (currentAuth && (
          marker.ownerAuthUid === null || currentAuth.uid !== marker.ownerAuthUid
        )) {
          publish({ visible: true, status: 'quarantined', reason: 'owner_auth_mismatch' });
          return { result: 'quarantined', reason: 'owner_auth_mismatch' };
        }
        if (currentAuth) {
          await deps.signOut();
          const afterSignOut = deps.readAuthUser();
          if (
            afterSignOut
            && (!afterSignOut.isAnonymous || afterSignOut.uid === marker.ownerAuthUid)
          ) throw new Error('signout_incomplete');
        }
        marker = await advanceAccountSwitchQuarantine(marker, 'provider_signed_out');
        continue;
      }

      if (marker.phase === 'provider_signed_out') {
        const currentStable = await deps.readStableId();
        const currentAuth = deps.readAuthUser();
        if (!validOwnerStable(currentStable, marker.ownerStableId)) {
          publish({ visible: true, status: 'quarantined', reason: 'owner_stable_mismatch' });
          return { result: 'quarantined', reason: 'owner_stable_mismatch' };
        }
        if (currentAuth && !currentAuth.isAnonymous) {
          publish({ visible: true, status: 'quarantined', reason: 'owner_auth_mismatch' });
          return { result: 'quarantined', reason: 'owner_auth_mismatch' };
        }
        await deps.wipeLocalData();
        marker = await advanceAccountSwitchQuarantine(marker, 'local_data_cleared');
        continue;
      }

      if (marker.phase === 'local_data_cleared') {
        const currentStable = await deps.readStableId();
        if (!validOwnerStable(currentStable, marker.ownerStableId, true)) {
          publish({ visible: true, status: 'quarantined', reason: 'owner_stable_mismatch' });
          return { result: 'quarantined', reason: 'owner_stable_mismatch' };
        }
        await deps.clearStableId();
        if (deps.readCachedStableId() !== null) throw new Error('stable_clear_incomplete');
        marker = await advanceAccountSwitchQuarantine(marker, 'stable_id_cleared');
        continue;
      }

      if (marker.phase === 'stable_id_cleared') {
        await deps.ensureAnonymousIdentity();
        const currentAuth = deps.readAuthUser();
        if (!currentAuth || !currentAuth.isAnonymous || currentAuth.uid === marker.ownerAuthUid) {
          publish({ visible: true, status: 'quarantined', reason: 'fresh_identity_invalid' });
          return { result: 'quarantined', reason: 'fresh_identity_invalid' };
        }
        marker = await advanceAccountSwitchQuarantine(marker, 'anonymous_authenticated', {
          freshAuthUid: currentAuth.uid,
        });
        continue;
      }

      if (marker.phase === 'anonymous_authenticated') {
        const currentAuth = deps.readAuthUser();
        const currentStable = await deps.readStableId();
        if (
          !currentAuth
          || !currentAuth.isAnonymous
          || currentAuth.uid !== marker.freshAuthUid
          || !currentStable
          || currentStable === marker.ownerStableId
        ) {
          publish({ visible: true, status: 'quarantined', reason: 'fresh_identity_invalid' });
          return { result: 'quarantined', reason: 'fresh_identity_invalid' };
        }
        marker = await advanceAccountSwitchQuarantine(marker, 'fresh_stable_created', {
          freshAuthUid: currentAuth.uid,
          freshStableId: currentStable,
        });
        continue;
      }

      if (marker.phase === 'fresh_stable_created') {
        const currentAuth = deps.readAuthUser();
        const currentStable = await deps.readStableId();
        if (
          !currentAuth
          || !currentAuth.isAnonymous
          || currentAuth.uid !== marker.freshAuthUid
          || currentStable !== marker.freshStableId
        ) {
          publish({ visible: true, status: 'quarantined', reason: 'fresh_identity_invalid' });
          return { result: 'quarantined', reason: 'fresh_identity_invalid' };
        }
        marker = await advanceAccountSwitchQuarantine(marker, 'ready', {
          freshAuthUid: currentAuth.uid,
          freshStableId: currentStable,
        });
        continue;
      }

      const currentAuth = deps.readAuthUser();
      const currentStable = await deps.readStableId();
      if (
        !currentAuth
        || !currentAuth.isAnonymous
        || currentAuth.uid !== marker.freshAuthUid
        || currentStable !== marker.freshStableId
      ) {
        publish({ visible: true, status: 'quarantined', reason: 'fresh_identity_invalid' });
        return { result: 'quarantined', reason: 'fresh_identity_invalid' };
      }
      const cleared = await clearCompletedAccountSwitchQuarantine({
        operationId: marker.operationId,
        nonce: marker.nonce,
        freshAuthUid: currentAuth.uid,
        freshStableId: currentStable!,
      });
      if (!cleared) {
        publish({ visible: true, status: 'quarantined', reason: 'marker_changed' });
        return { result: 'quarantined', reason: 'marker_changed' };
      }
      await removeVerified(ACCOUNT_SWITCH_COMPLETION_RECEIPT_KEY, 'account_switch_receipt_clear_failed');
      publish({ visible: false, status: 'idle', reason: null });
      deps.activateGeneration(currentStable!);
      return { result: 'completed', stableId: currentStable!, authUid: currentAuth.uid };
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown';
      const reason = marker.phase === 'provider_signed_out'
        ? 'wipe_failed'
        : marker.phase === 'prepared'
          ? 'signout_failed'
          : detail.startsWith('account_switch_marker_')
            ? 'marker_write_failed'
            : 'transition_failed';
      deps.invalidateGeneration();
      publish({ visible: true, status: 'retryable', reason });
      return { result: 'retryable', reason, detail };
    }
  }
}

export function resumeAccountSwitchQuarantine(
  deps: AccountSwitchRecoveryDependencies,
): Promise<AccountSwitchResumeResult> {
  if (!recoveryFlight) {
    const flight = resumeInternal(deps);
    recoveryFlight = flight;
    void flight.finally(() => {
      if (recoveryFlight === flight) recoveryFlight = null;
    }).catch(() => {});
  }
  return recoveryFlight;
}

/**
 * Cold-boot adapter kept lazy so merely checking marker presence cannot start
 * auth, cloud, RevenueCat, or stable-id work before Firebase hydration emits.
 */
export function resumeRuntimeAccountSwitchQuarantine(): Promise<AccountSwitchResumeResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const auth = require('@react-native-firebase/auth').default();
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const generation = require('./account_generation') as typeof import('./account_generation');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const premium = require('./premium_guard') as typeof import('./premium_guard');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const cloud = require('./cloud_sync') as typeof import('./cloud_sync');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const stable = require('./stable_id') as typeof import('./stable_id');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pendingLink = require('./pending_auth_link') as typeof import('./pending_auth_link');
  const timeoutMs = 10_000;
  return resumeAccountSwitchQuarantine({
    readStableId: async () => {
      const stableId = stable.peekStableId() ?? await stable.readExistingStableId().catch(() => null);
      generation.invalidateAccountGeneration();
      return stableId;
    },
    readCachedStableId: () => stable.peekStableId(),
    readAuthUser: () => {
      const user = auth?.currentUser;
      const uid = String(user?.uid ?? '').trim();
      const providers = Array.isArray(user?.providerData) ? user.providerData : [];
      const providerSubjects = providers.reduce((proofs: Partial<Record<'google' | 'apple', string>>, entry: {
        providerId?: string;
        uid?: string;
      }) => {
        const subject = String(entry?.uid ?? '').trim();
        if (!subject) return proofs;
        if (entry?.providerId === 'google.com') proofs.google = subject;
        if (entry?.providerId === 'apple.com') proofs.apple = subject;
        return proofs;
      }, {});
      const provider: AccountSwitchOwnerProvider = user?.isAnonymous === true
        ? 'anonymous'
        : providers.some((entry: { providerId?: string }) => entry?.providerId === 'apple.com')
          ? 'apple'
          : providers.some((entry: { providerId?: string }) => entry?.providerId === 'google.com')
            ? 'google'
            : 'none';
      const providerId = provider === 'google' ? 'google.com' : provider === 'apple' ? 'apple.com' : '';
      const providerSubject = providerId
        ? String(providers.find((entry: { providerId?: string }) => entry?.providerId === providerId)?.uid ?? '').trim()
        : '';
      return uid ? {
        uid,
        isAnonymous: user?.isAnonymous === true,
        provider,
        ...(Object.keys(providerSubjects).length > 0 ? { providerSubjects } : {}),
        ...(providerSubject ? { providerSubject } : {}),
      } : null;
    },
    invalidateGeneration: () => { generation.invalidateAccountGeneration(); },
    beginPremiumTransition: () => { premium.beginPremiumAccountTransition(); },
    quiesce: async () => {
      const [premiumIdle, restoreIdle, cloudIdle] = await Promise.all([
        premium.waitForPremiumAccountWorkIdleWithDeadline(timeoutMs),
        generation.waitForRestoreApplicationIdleWithDeadline(timeoutMs),
        cloud.quiesceCloudSyncForAccountTransition(timeoutMs),
      ]);
      return premiumIdle && restoreIdle && cloudIdle;
    },
    signOut: async () => {
      if (auth?.currentUser) await auth.signOut();
      cloud.resetAnonAuthCacheForSignOut();
    },
    wipeLocalData: async () => { await cloud.wipeLocalAccountData(); },
    clearStableId: async () => {
      await stable.clearStableId();
      await pendingLink.clearPendingAuthLink();
    },
    ensureAnonymousIdentity: async () => {
      await cloud.ensureAnonUser();
      await stable.getStableId();
    },
    activateGeneration: (stableId: string) => { generation.beginAccountGeneration(stableId); },
  });
}

export function __resetAccountSwitchQuarantineForTests(): void {
  mutationTail = Promise.resolve();
  recoveryFlight = null;
  snapshot = { visible: false, status: 'idle', reason: null };
  listeners.clear();
}

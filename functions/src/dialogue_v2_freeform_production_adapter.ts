import * as admin from 'firebase-admin';
import { HttpsError } from 'firebase-functions/v2/https';

import {
  createDialogueV2FreeformAuthorizationHandler,
} from './dialogue_v2_freeform_callable';
import { resolveStableUidForAuthInTransaction } from './auth_identity';
import {
  assertAccountUsable,
  readAuthAccountStateInTx,
  readStableAccountStateInTx,
} from './account_gate';
import {
  isAdminGrantActive,
  isGiftAccessActive,
  isStorePremiumActive,
  isVipActive,
  parseProgressMs,
  resolvePremiumAccess,
} from './premium_status';
import {
  createDialogueV2FreeformAuthorizedStartRepository,
  createDialogueV2FreeformAuthorizedTurnRepository,
  type DialogueV2FreeformSessionFirestoreRuntime,
} from './dialogue_v2_freeform_session_firestore_repository';
import type {
  DialogueV2FreeformSessionActor,
  DialogueV2FreeformSessionLedgerRepository,
} from './dialogue_v2_freeform_session_ledger';

export type DialogueV2FreeformProductionAuthorizationRuntime = Readonly<{
  db: FirebaseFirestore.Firestore;
  nowMs(): number;
}>;

export type DialogueV2FreeformAuthorizedStartRepositoryFactory = (
  runtime: DialogueV2FreeformSessionFirestoreRuntime,
) => DialogueV2FreeformSessionLedgerRepository;

export type DialogueV2FreeformAuthorizedTurnRepositoryFactory = (
  runtime: DialogueV2FreeformSessionFirestoreRuntime,
) => DialogueV2FreeformSessionLedgerRepository;

type AuthorizedTransactionState = {
  readonly database: FirebaseFirestore.Firestore;
  readonly actor: DialogueV2FreeformSessionActor;
  readonly transaction: FirebaseFirestore.Transaction;
  readonly nowMs: number;
  active: boolean;
};

const authorizedTransactionStates = new WeakMap<object, AuthorizedTransactionState>();

function issueAuthorizedTransactionCapability(
  state: AuthorizedTransactionState,
): object {
  const context = Object.freeze(Object.create(null) as object);
  authorizedTransactionStates.set(context, state);
  return context;
}

function requireActiveDialogueV2FreeformAuthorization(
  context: unknown,
  database: FirebaseFirestore.Firestore,
): Readonly<{
  actor: DialogueV2FreeformSessionActor;
  transaction: FirebaseFirestore.Transaction;
  nowMs: number;
}> {
  if (!context || typeof context !== 'object') {
    throw new Error('dialogue_v2_freeform_repository_authorization_required');
  }
  const state = authorizedTransactionStates.get(context);
  if (!state?.active || state.database !== database) {
    throw new Error('dialogue_v2_freeform_repository_authorization_required');
  }
  return Object.freeze({
    actor: state.actor,
    transaction: state.transaction,
    nowMs: state.nowMs,
  });
}

const buildAuthorizedStartRepository = createDialogueV2FreeformAuthorizedStartRepository;
const buildAuthorizedTurnRepository = createDialogueV2FreeformAuthorizedTurnRepository;

function productionRuntime(): DialogueV2FreeformProductionAuthorizationRuntime {
  return Object.freeze({
    db: admin.firestore(),
    nowMs: Date.now,
  });
}

function safeNowMs(runtime: DialogueV2FreeformProductionAuthorizationRuntime): number {
  const value = runtime.nowMs();
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new HttpsError(
      'failed-precondition',
      'dialogue_v2_freeform_entitlement_unavailable',
    );
  }
  return value;
}

function documentReadKey(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null;
  const candidate = value as Readonly<{
    collection?: unknown;
    kind?: unknown;
    id?: unknown;
    path?: unknown;
  }>;
  if (typeof candidate.path !== 'string') return null;
  return candidate.kind === 'doc'
    || (typeof candidate.id === 'string' && typeof candidate.collection === 'function')
    ? candidate.path
    : null;
}

const PLUS_LOG = '[FREEFORM-PLUS]';
const shortId = (id: string): string => id.slice(0, 6);
const errorReason = (error: unknown): string => String(
  (error as { code?: unknown })?.code ?? (error as { message?: unknown })?.message ?? error,
).slice(0, 160);

/** Срок относительно «сейчас» в часах: 'none' | '+12h' | '-30h' — без дат и uid в журнале. */
function relHours(value: unknown, nowMs: number): string {
  const ms = parseProgressMs(value);
  if (!(ms > 0)) return 'none';
  const hours = Math.round((ms - nowMs) / 3_600_000);
  return hours >= 0 ? `+${hours}h` : `${hours}h`;
}

/**
 * зачем (бэклог 241, «сперва логи»): 48 отказов «нужен Plus» за 3 дня очередями по 13–18 попыток, а журнал знал только код.
 * Печатаем, чей отказ (префиксы uid) и какое поле какой ветки решило. Документ уже прочитан в этой транзакции
 * (memoizeDocumentReads) — новых чтений нет. Никогда не бросает: отказ и так уйдёт клиенту.
 */
async function logPlusRefusal(
  db: FirebaseFirestore.Firestore,
  transaction: FirebaseFirestore.Transaction,
  authUid: string,
  stableAccountId: string,
  nowMs: number,
): Promise<void> {
  try {
    const snap = await transaction.get(db.collection('users').doc(stableAccountId));
    const data = (snap.exists ? snap.data() : undefined) ?? {};
    const progress = (data.progress ?? {}) as Record<string, unknown>;
    console.warn(PLUS_LOG, 'refused', JSON.stringify({
      auth: shortId(authUid),
      stable: shortId(stableAccountId),
      stableIsAuth: stableAccountId === authUid,
      docExists: snap.exists,
      identityHidden: data.identityHidden === true,
      plan: String(progress.premium_plan ?? 'none').slice(0, 40),
      expiry: relHours(progress.premium_expiry, nowMs),
      expiryRaw0: String(progress.premium_expiry ?? '') === '0',
      rcExpiry: relHours(progress.premium_rc_expiry_ms, nowMs),
      adminOverride: String(progress.admin_premium_override ?? 'none').slice(0, 10),
      vipActive: String(progress.vip_active ?? 'none').slice(0, 10),
      vipUntil: relHours(progress.vip_until ?? progress.vip_expiry, nowMs),
      branches: {
        store: isStorePremiumActive(progress, nowMs),
        admin: isAdminGrantActive(progress, nowMs),
        vip: isVipActive(progress, nowMs),
        gift: isGiftAccessActive(progress, nowMs),
      },
    }));
  } catch (error: unknown) {
    console.warn(PLUS_LOG, 'refused_snapshot_failed', JSON.stringify({
      auth: shortId(authUid), stable: shortId(stableAccountId), reason: errorReason(error),
    }));
  }
}

function memoizeDocumentReads(
  transaction: FirebaseFirestore.Transaction,
): FirebaseFirestore.Transaction {
  const reads = new Map<string, Promise<unknown>>();
  const memoizedGet = ((reference: unknown) => {
    const key = documentReadKey(reference);
    if (!key) {
      return Reflect.apply(transaction.get, transaction, [reference]);
    }
    const existing = reads.get(key);
    if (existing) return existing;
    const read = Reflect.apply(transaction.get, transaction, [reference]) as Promise<unknown>;
    reads.set(key, read);
    return read;
  }) as FirebaseFirestore.Transaction['get'];
  return new Proxy(transaction, {
    get: (target, property) => {
      if (property === 'get') return memoizedGet;
      const value = Reflect.get(target, property, target) as unknown;
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
}

export async function runDialogueV2FreeformProductionAuthorizationTransaction<T>(
  runtime: DialogueV2FreeformProductionAuthorizationRuntime,
  authUid: string,
  operation: (
    actor: DialogueV2FreeformSessionActor,
    nowMs: number,
    createStartRepository: DialogueV2FreeformAuthorizedStartRepositoryFactory,
    createTurnRepository: DialogueV2FreeformAuthorizedTurnRepositoryFactory,
  ) => Promise<T>,
): Promise<T> {
  if (typeof operation !== 'function') {
    throw new HttpsError(
      'failed-precondition',
      'dialogue_v2_freeform_entitlement_unavailable',
    );
  }
  const nowMs = safeNowMs(runtime);
  return runtime.db.runTransaction(async (rawTransaction) => {
    const transaction = memoizeDocumentReads(rawTransaction);
    let stableAccountId: string;
    try {
      stableAccountId = await resolveStableUidForAuthInTransaction(
        runtime.db,
        transaction,
        authUid,
      );
    } catch (error: unknown) {
      console.warn(PLUS_LOG, 'identity_unavailable', JSON.stringify({ auth: shortId(authUid), reason: errorReason(error) }));
      throw new HttpsError(
        'failed-precondition',
        'dialogue_v2_freeform_identity_unavailable',
      );
    }

    try {
      const [authState, stableState] = await Promise.all([
        readAuthAccountStateInTx(transaction, runtime.db, authUid, nowMs),
        readStableAccountStateInTx(transaction, runtime.db, stableAccountId, nowMs),
      ]);
      assertAccountUsable(authState);
      assertAccountUsable(stableState);
    } catch (error: unknown) {
      console.warn(PLUS_LOG, 'account_unavailable', JSON.stringify({ auth: shortId(authUid), stable: shortId(stableAccountId), reason: errorReason(error) }));
      throw new HttpsError(
        'failed-precondition',
        'dialogue_v2_freeform_account_unavailable',
      );
    }

    let isPremium: boolean;
    try {
      isPremium = await resolvePremiumAccess(
        runtime.db,
        stableAccountId,
        nowMs,
        authUid,
        transaction,
      );
    } catch (error: unknown) {
      console.warn(PLUS_LOG, 'entitlement_unavailable', JSON.stringify({ auth: shortId(authUid), stable: shortId(stableAccountId), reason: errorReason(error) }));
      throw new HttpsError(
        'failed-precondition',
        'dialogue_v2_freeform_entitlement_unavailable',
      );
    }
    if (isPremium !== true) {
      await logPlusRefusal(runtime.db, transaction, authUid, stableAccountId, nowMs);
      throw new HttpsError('permission-denied', 'dialogue_v2_freeform_plus_required');
    }
    const actor = Object.freeze({ authUid, stableAccountId });
    const state: AuthorizedTransactionState = {
      database: runtime.db,
      actor,
      transaction,
      nowMs,
      active: true,
    };
    const capability = issueAuthorizedTransactionCapability(state);
    const createStartRepository: DialogueV2FreeformAuthorizedStartRepositoryFactory = (
      repositoryRuntime,
    ) => buildAuthorizedStartRepository(
      repositoryRuntime,
      () => requireActiveDialogueV2FreeformAuthorization(
        capability,
        repositoryRuntime.db as FirebaseFirestore.Firestore,
      ),
    );
    Object.freeze(createStartRepository);
    const createTurnRepository: DialogueV2FreeformAuthorizedTurnRepositoryFactory = (
      repositoryRuntime,
    ) => buildAuthorizedTurnRepository(
      repositoryRuntime,
      () => requireActiveDialogueV2FreeformAuthorization(
        capability,
        repositoryRuntime.db as FirebaseFirestore.Firestore,
      ),
    );
    Object.freeze(createTurnRepository);
    try {
      return await operation(actor, nowMs, createStartRepository, createTurnRepository);
    } finally {
      state.active = false;
    }
  });
}

async function authorizeAtomically(
  runtime: DialogueV2FreeformProductionAuthorizationRuntime,
  authUid: string,
): Promise<void> {
  await runDialogueV2FreeformProductionAuthorizationTransaction(
    runtime,
    authUid,
    async () => undefined,
  );
}

/**
 * Constructible internal production authorization boundary. Identity, both
 * deletion fences and canonical Plus authority are read inside one Firestore
 * transaction. This authorization-only handler supplies a no-op operation, so
 * its transaction remains read-only; session start supplies its repository
 * create operation to the same transaction instead.
 */
export function createDialogueV2FreeformProductionAuthorizationHandler(
  runtime: DialogueV2FreeformProductionAuthorizationRuntime = productionRuntime(),
): ReturnType<
  typeof createDialogueV2FreeformAuthorizationHandler
> {
  return createDialogueV2FreeformAuthorizationHandler(Object.freeze({
    authorizeAtomic: (authUid: string) => authorizeAtomically(runtime, authUid),
  }));
}

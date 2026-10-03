import { createHash } from 'crypto';
import type { DocumentReference, Firestore, Transaction } from 'firebase-admin/firestore';
import { readAuthAccountStateInTx, readStableAccountStateInTx, type AccountState } from '../account_gate';
import { AccountAuthorityCallableError } from './callable_boundary';
import {
  accountAuthorityLogInfo,
  accountAuthorityServerCauseFields,
  attachAccountAuthorityFailureDetail,
} from './account_authority_log';
import {
  accountAuthorityAuthUidHash,
  accountAuthorityFingerprintFromAuthUidHash,
  accountAuthorityUidFingerprint,
} from './account_authority_policy';
import {
  asAccountId,
  asProviderSubject,
  asTenantId,
  type AccountId,
  type FirebaseAuthUid,
  type ProviderSubject,
  type ResolvedAccountPrincipal,
  type TenantId,
} from './lease_contract';

/*
 * Account Authority 2.0, S2a раунд 2: принципал (uid → accountId) в Firestore.
 *
 * Вынесено из firebase_lease_callable.ts, чтобы файл адаптера не разрастался:
 * здесь вся логика личности — ключ принципала, D-AA1, сверка с живым якорем
 * auth_links на каждом входе (H1) и метки удаления (H2).
 *
 * зачем (раунд 2, M4): принципал — якорь личности, поэтому у него НЕТ срока
 * жизни (expireAt). Он удаляется вместе с аккаунтом (S3/S4).
 */

export const PRINCIPALS_COLLECTION = 'account_authority_principals_v1';
const AUTH_LINKS_COLLECTION = 'auth_links';
const USERS_COLLECTION = 'users';
const PRINCIPAL_SCHEMA_V1 = 'account-authority-principal.v1';
const PRINCIPAL_SCHEMA_V2 = 'account-authority-principal.v2';

export type PrincipalAccountSource = 'new_account' | 'existing_stable_id' | 'rebound' | 'legacy';

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/**
 * Ключ документа принципала. Раунд 2, M1: строится из субъекта аренды (хеша
 * uid), а не из сырого uid, — тот же субъект видят вход, выход и удаление.
 */
export function principalRef(db: Firestore, tenantId: TenantId, leaseSubject: FirebaseAuthUid): DocumentReference {
  return db.collection(PRINCIPALS_COLLECTION).doc(sha256(JSON.stringify([tenantId, leaseSubject])));
}

export function providerSubjectFor(firebaseAuthUid: string): ProviderSubject {
  return asProviderSubject(`firebase-${sha256(firebaseAuthUid)}`);
}

export type StoredPrincipal = Readonly<ResolvedAccountPrincipal & {
  accountSource: PrincipalAccountSource | 'unknown';
  /** Значение auth_links/{uid}.stable_id, по которому принципал сверялся в последний раз. */
  anchorLink: string | null;
  createdAtMs: number | null;
}>;

/**
 * Принципал из Firestore. v2 хранит хеш uid, v1 (до S2a) — сырой uid; оба
 * сверяются с субъектом аренды. Иное — порча (internal).
 */
export function parseStoredPrincipal(data: unknown, tenantId: TenantId, leaseSubject: FirebaseAuthUid): StoredPrincipal {
  if (!isRecord(data)) throw new Error('account_authority_principal_invalid');
  let owner: string;
  if (data.schemaVersion === PRINCIPAL_SCHEMA_V2 && typeof data.authUidHash === 'string') {
    owner = accountAuthorityFingerprintFromAuthUidHash(data.authUidHash);
  } else if (data.schemaVersion === PRINCIPAL_SCHEMA_V1 && typeof data.firebaseAuthUid === 'string') {
    owner = accountAuthorityUidFingerprint(data.firebaseAuthUid);
  } else {
    throw new Error('account_authority_principal_invalid');
  }
  if (asTenantId(data.tenantId) !== tenantId || owner !== leaseSubject) {
    throw new Error('account_authority_principal_invalid');
  }
  const source = data.accountSource;
  return Object.freeze({
    accountId: asAccountId(data.accountId),
    providerSubject: asProviderSubject(data.providerSubject),
    accountSource: source === 'new_account' || source === 'existing_stable_id' || source === 'rebound' || source === 'legacy'
      ? source
      : 'unknown',
    anchorLink: typeof data.anchorLink === 'string' && data.anchorLink.length > 0 ? data.anchorLink : null,
    createdAtMs: typeof data.createdAtMs === 'number' ? data.createdAtMs : null,
  });
}

function storedPrincipal(
  principal: ResolvedAccountPrincipal,
  tenantId: TenantId,
  rawUid: string,
  accountSource: PrincipalAccountSource,
  anchorLink: string | null,
  createdAtMs: number,
  updatedAtMs: number,
): UnknownRecord {
  return {
    schemaVersion: PRINCIPAL_SCHEMA_V2,
    accountId: principal.accountId,
    tenantId,
    // зачем (S2a, пункт 7): сырой uid не хранится; сверка — по хешу.
    authUidHash: accountAuthorityAuthUidHash(rawUid),
    providerSubject: principal.providerSubject,
    accountSource,
    anchorLink,
    createdAtMs,
    updatedAtMs,
  };
}

export function identityUnresolved(reason: string): AccountAuthorityCallableError {
  return attachAccountAuthorityFailureDetail(
    new AccountAuthorityCallableError('failed-precondition', 'account_authority_identity_unresolved'),
    { stage: 'principal', reason },
  );
}

/**
 * Раунд 2, H2: метка удаления или надгробие → окончательный отказ. Смысл —
 * единая дверь account_gate (grace и «удалён» оба закрывают аренду).
 */
function assertNotDeleting(state: AccountState, subject: 'auth' | 'stable'): void {
  if (state.kind === 'active') return;
  throw attachAccountAuthorityFailureDetail(
    new AccountAuthorityCallableError('failed-precondition', 'account_authority_deletion_pending'),
    { stage: 'deletion', reason: `${subject}_${state.kind}` },
  );
}

/** H2: метка удаления uid и постоянный отказ (account_gate, 2 чтения). */
export async function assertAuthNotDeletingInTransaction(
  db: Firestore,
  transaction: Transaction,
  rawUid: string,
  nowMs: number,
): Promise<void> {
  assertNotDeleting(await readAuthAccountStateInTx(transaction, db, rawUid, nowMs), 'auth');
}

function cleanStableId(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function parseStableId(value: string): AccountId {
  try {
    return asAccountId(value);
  } catch (error) {
    throw attachAccountAuthorityFailureDetail(identityUnresolved('stable_id_invalid'), accountAuthorityServerCauseFields(error));
  }
}

/**
 * D-AA1 + H2 (+ раунд 3, M-R2-1/L-R2-1): живой аккаунт за stableId — либо
 * stableId из якоря auth_links вызывающего uid, либо accountId уже
 * привязанного принципала (проверяется на КАЖДОМ входе).
 *
 * Владение доказывает `auth_links/{uid}.stable_id` САМОГО вызывающего: якорь
 * пишет только сервер (правила запрещают клиенту запись), и тот же якорь —
 * доказательство владения в assertStableOwner (`authorization: 'link'`).
 * Скрытый дубль ведёт к каноническому, только если канонический принадлежит
 * этому uid (как findLiveAuthLinkAnchor в auth_identity.ts). Надгробие на
 * stableId или каноническом — отказ (assertStableDeletionNotPendingFromReads).
 * Аккаунт не определить — отказ, а не второй пустой аккаунт.
 */
async function verifyStableAccount(
  db: Firestore,
  transaction: Transaction,
  rawUid: string,
  candidateStableId: string,
  nowMs: number,
): Promise<AccountId> {
  const stableId = parseStableId(candidateStableId);
  assertNotDeleting(await readStableAccountStateInTx(transaction, db, stableId, nowMs), 'stable');
  const userSnapshot = await transaction.get(db.collection(USERS_COLLECTION).doc(stableId));
  if (!userSnapshot.exists) throw identityUnresolved('user_missing');
  const user = userSnapshot.data() ?? {};
  if (user.identityHidden !== true) return stableId;
  const canonicalStableId = cleanStableId(user.canonicalStableId);
  if (canonicalStableId.length === 0 || canonicalStableId === stableId) {
    throw identityUnresolved('hidden_without_canonical');
  }
  const canonicalId = parseStableId(canonicalStableId);
  assertNotDeleting(await readStableAccountStateInTx(transaction, db, canonicalId, nowMs), 'stable');
  const canonicalSnapshot = await transaction.get(db.collection(USERS_COLLECTION).doc(canonicalId));
  const canonicalOwner = canonicalSnapshot.exists ? cleanStableId(canonicalSnapshot.data()?.firebaseAuthUid) : '';
  if (canonicalOwner !== rawUid) throw identityUnresolved('canonical_not_owned');
  return canonicalId;
}

export type AcquirePrincipal = Readonly<{
  principal: ResolvedAccountPrincipal;
  /** Прежний accountId, если принципал только что перепривязан (H1); иначе null. */
  reboundFrom: AccountId | null;
  /** Отложенная запись принципала; вызывать после всех чтений транзакции. */
  write: ((transaction: Transaction) => void) | null;
}>;

/**
 * Принципал для ВХОДА внутри транзакции аренды.
 *
 * Раунд 2, H1: на каждом входе читается `auth_links/{uid}` (+1 чтение). Якорь —
 * правда сервера (relink, merge, recovery, канонизация). Если он указывает не
 * туда, куда принципал, принципал ПЕРЕПРИВЯЗЫВАЕТСЯ к якорю; вызывающий
 * освобождает аренду старого accountId. Якоря не было никогда — принципал как
 * есть; якорь был и исчез — отказ anchor_removed (раунд 3, M-R2-1). Якорь тот
 * же — проверяется сам аккаунт: удаление и канонизация (раунд 3, +3 чтения).
 *
 * Идемпотентно: принципал создаётся один раз (transaction.create); повторный
 * вход с тем же якорем ничего не пишет.
 */
export async function resolvePrincipalForAcquire(
  db: Firestore,
  transaction: Transaction,
  input: Readonly<{
    tenantId: TenantId;
    rawUid: string;
    leaseSubject: FirebaseAuthUid;
    nowMs: number;
    newAccountId: () => string;
  }>,
): Promise<AcquirePrincipal> {
  const ref = principalRef(db, input.tenantId, input.leaseSubject);
  const snapshot = await transaction.get(ref);
  const linkSnapshot = await transaction.get(db.collection(AUTH_LINKS_COLLECTION).doc(input.rawUid));
  const link = linkSnapshot.exists ? cleanStableId(linkSnapshot.data()?.stable_id) : '';
  const anchorLink = link.length > 0 ? link : null;

  if (!snapshot.exists) {
    const anchored = anchorLink === null
      ? null
      : await verifyStableAccount(db, transaction, input.rawUid, anchorLink, input.nowMs);
    const accountSource: PrincipalAccountSource = anchored === null ? 'new_account' : 'existing_stable_id';
    const principal = Object.freeze({
      accountId: anchored ?? asAccountId(input.newAccountId()),
      providerSubject: providerSubjectFor(input.rawUid),
    });
    accountAuthorityLogInfo('principal resolved', { stage: 'principal', status: 'created', type: accountSource });
    return Object.freeze({
      principal,
      reboundFrom: null,
      write: (target: Transaction) => {
        target.create(ref, storedPrincipal(
          principal, input.tenantId, input.rawUid, accountSource, anchorLink, input.nowMs, input.nowMs,
        ));
      },
    });
  }

  const stored = parseStoredPrincipal(snapshot.data(), input.tenantId, input.leaseSubject);
  const principal = Object.freeze({ accountId: stored.accountId, providerSubject: stored.providerSubject });
  if (anchorLink === null) {
    // зачем (раунд 3, M-R2-1): якорь был и исчез. Старое удаление стирает
    // auth_links всех uid аккаунта — второй uid не должен сохранить аренду.
    if (stored.anchorLink !== null) throw identityUnresolved('anchor_removed');
    accountAuthorityLogInfo('principal resolved', { stage: 'principal', status: 'existing', reason: 'no_anchor' });
    return Object.freeze({ principal, reboundFrom: null, write: null });
  }
  const anchorUnchanged = anchorLink === stored.anchorLink;
  // Раунд 3 (M-R2-1, L-R2-1): у привязанного к stableId принципала на КАЖДОМ
  // входе проверяется сам аккаунт — надгробие/удаление и канонизация (скрытый
  // дубль → канонический, если он принадлежит этому uid). Якорь сменился —
  // проверяется новый якорь (H1).
  const anchored = await verifyStableAccount(
    db, transaction, input.rawUid, anchorUnchanged ? stored.accountId : anchorLink, input.nowMs,
  );
  const createdAtMs = stored.createdAtMs ?? input.nowMs;
  if (anchored === stored.accountId) {
    if (anchorUnchanged) {
      accountAuthorityLogInfo('principal resolved', { stage: 'principal', status: 'existing', reason: 'anchor_unchanged' });
      return Object.freeze({ principal, reboundFrom: null, write: null });
    }
    // Якорь сменился, но ведёт туда же (например, канонизация) — только запомнить.
    accountAuthorityLogInfo('principal resolved', { stage: 'principal', status: 'existing', reason: 'anchor_confirmed' });
    return Object.freeze({
      principal,
      reboundFrom: null,
      write: (target: Transaction) => {
        target.set(ref, storedPrincipal(
          principal, input.tenantId, input.rawUid,
          stored.accountSource === 'unknown' ? 'legacy' : stored.accountSource,
          anchorLink, createdAtMs, input.nowMs,
        ));
      },
    });
  }
  const rebound = Object.freeze({ accountId: anchored, providerSubject: stored.providerSubject });
  accountAuthorityLogInfo('principal_rebound', {
    stage: 'principal',
    from: stored.accountSource,
    reason: anchorUnchanged ? 'canonicalized' : stored.anchorLink === null ? 'anchor_appeared' : 'anchor_changed',
  });
  return Object.freeze({
    principal: rebound,
    reboundFrom: stored.accountId,
    write: (target: Transaction) => {
      target.set(ref, storedPrincipal(
        rebound, input.tenantId, input.rawUid, 'rebound', anchorLink, createdAtMs, input.nowMs,
      ));
    },
  });
}

/**
 * Принципал только для чтения (выход, удаление): нет — null. Выход и удаление
 * никогда не создают и не перепривязывают принципал (раунд 2, L5).
 */
export async function readPrincipalInTransaction(
  db: Firestore,
  transaction: Transaction,
  tenantId: TenantId,
  leaseSubject: FirebaseAuthUid,
): Promise<StoredPrincipal | null> {
  const snapshot = await transaction.get(principalRef(db, tenantId, leaseSubject));
  if (!snapshot.exists) return null;
  return parseStoredPrincipal(snapshot.data(), tenantId, leaseSubject);
}

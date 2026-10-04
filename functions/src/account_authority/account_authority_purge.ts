import type { DocumentReference, Firestore, Query } from 'firebase-admin/firestore';
import {
  accountAuthorityLogInfo,
  accountAuthorityLogWarn,
} from './account_authority_log';
import {
  AA_ACCOUNTS_COLLECTION,
  AA_DELETE_JOBS_COLLECTION,
  AA_INSTALLATION_BINDING_QUOTA_COLLECTION,
  AA_INSTALLATION_BINDING_TOKENS_COLLECTION,
  AA_INSTALLATION_BINDINGS_COLLECTION,
  AA_PRIMARY_TENANT_ID,
  AA_PRINCIPALS_COLLECTION,
  AA_RETIRED_SESSIONS_SUBCOLLECTION,
} from './account_authority_collections';
import {
  accountAuthorityAuthUidHash,
  accountAuthorityFingerprintFromAuthUidHash,
} from './account_authority_policy';
import { ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN, type AccountDeletePurgePort } from './delete_contract';
import { asFirebaseAuthUid, asTenantId } from './lease_contract';
import { principalRef } from './account_principal_store';

/*
 * Account Authority 2.0, этап S3, пункты 2 и 3: стирание коллекций AA.
 *
 * Два входа:
 *   1) `createFirestoreAccountDeletePurgePort` — порт `AccountDeletePurgePort`
 *      для `runBoundedDeletePurge` (delete_contract.ts). Проход ограничен
 *      `maxItems` (≤ 450 — одна пачка Firestore < 500), курсор — номер прохода.
 *   2) `purgeAccountAuthorityForLegacyIdentities` — старое удаление
 *      (account_delete.ts) стирает AA всех личностей замыкания.
 *
 * зачем так (идемпотентность и возобновление): каждый проход ЗАНОВО находит
 * оставшиеся документы запросами — удалённое больше не находится. Поэтому
 * повтор того же прохода безопасен, обрыв посреди прохода (пачка не
 * записалась) просто повторяется, а курсор нужен контракту только для
 * обнаружения зацикливания. Порядок внутри аккаунта: сначала то, что
 * находится ТОЛЬКО через принципала (привязки, индекс токенов, счётчик квоты
 * по хешу uid), и лишь потом сам принципал — иначе обрыв между ними оставил
 * бы привязки, до которых больше не дойти.
 *
 * Чего порт (1) НЕ стирает: документ аренды (надгробие lifecycle deleted —
 * его пишет finishPurge в той же транзакции, что и job) и состояние удаления
 * (квитанция по контракту живёт 90 дней). Старое удаление (2) стирает всё.
 */

const CURSOR_PREFIX = 'aa-purge.v1:';
const LEGACY_MAX_PASSES = 50;

type Ref = DocumentReference;

/** Сборщик одного прохода: бюджет, дедупликация по пути, признак «есть ещё». */
type PassCollector = {
  readonly budget: number;
  readonly refs: Map<string, Ref>;
  truncated: boolean;
};

function newCollector(budget: number): PassCollector {
  return { budget, refs: new Map(), truncated: false };
}

function remaining(collector: PassCollector): number {
  return collector.budget - collector.refs.size;
}

function add(collector: PassCollector, ref: Ref): void {
  if (remaining(collector) < 1) {
    collector.truncated = true;
    return;
  }
  collector.refs.set(ref.path, ref);
}

async function addQuery(collector: PassCollector, query: Query): Promise<readonly Readonly<{ ref: Ref; data: unknown }>[]> {
  const limit = remaining(collector);
  if (limit < 1) {
    collector.truncated = true;
    return [];
  }
  const snapshot = await query.limit(limit).get();
  // Ровно limit документов — возможно, есть ещё: проход не может считаться последним.
  if (snapshot.docs.length >= limit) collector.truncated = true;
  for (const doc of snapshot.docs) add(collector, doc.ref);
  return snapshot.docs.map((doc) => Object.freeze({ ref: doc.ref, data: doc.data() }));
}

async function addDocIfExists(collector: PassCollector, ref: Ref): Promise<unknown | null> {
  if (remaining(collector) < 1) {
    collector.truncated = true;
    return null;
  }
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  add(collector, ref);
  return snapshot.data() ?? null;
}

/** Хеш uid из принципала: v2 хранит его, v1 — сырой uid. Иное — null. */
function principalAuthUidHash(data: unknown): string | null {
  if (typeof data !== 'object' || data === null) return null;
  const record = data as Record<string, unknown>;
  if (typeof record.authUidHash === 'string' && /^[0-9a-f]{64}$/.test(record.authUidHash)) return record.authUidHash;
  if (typeof record.firebaseAuthUid === 'string' && record.firebaseAuthUid.length > 0) {
    return accountAuthorityAuthUidHash(record.firebaseAuthUid);
  }
  return null;
}

/** Всё, что найдено по хешу uid: индекс токенов, привязки, счётчик квоты. */
async function collectUidDependents(db: Firestore, collector: PassCollector, authUidHash: string): Promise<void> {
  await addQuery(collector, db.collection(AA_INSTALLATION_BINDING_TOKENS_COLLECTION).where('authUidHash', '==', authUidHash));
  await addQuery(collector, db.collection(AA_INSTALLATION_BINDINGS_COLLECTION).where('authUidHash', '==', authUidHash));
  await addDocIfExists(collector, db.collection(AA_INSTALLATION_BINDING_QUOTA_COLLECTION).doc(authUidHash));
}

/**
 * Принципал удаляется только в проходе, где уже собраны ВСЕ его зависимые
 * (иначе хеш uid потерялся бы). Не влезли — принципал ждёт следующего прохода.
 */
async function collectPrincipalWithDependents(
  db: Firestore,
  collector: PassCollector,
  principal: Readonly<{ ref: Ref; data: unknown }>,
): Promise<void> {
  const authUidHash = principalAuthUidHash(principal.data);
  if (authUidHash === null) {
    accountAuthorityLogWarn('purge principal_without_uid_hash', { stage: 'purge', reason: 'principal_invalid' });
  } else {
    const before = collector.truncated;
    collector.truncated = false;
    await collectUidDependents(db, collector, authUidHash);
    const dependentsTruncated = collector.truncated;
    collector.truncated = before || dependentsTruncated;
    if (dependentsTruncated) {
      // Зависимые не уместились: принципал НЕ удаляем в этом проходе.
      collector.refs.delete(principal.ref.path);
      return;
    }
  }
  add(collector, principal.ref);
}

/** Принципалы аккаунта (по полю accountId; тенант — если задан). */
async function collectAccountPrincipals(
  db: Firestore,
  collector: PassCollector,
  accountId: string,
  tenantId: string | null,
): Promise<void> {
  let query: Query = db.collection(AA_PRINCIPALS_COLLECTION).where('accountId', '==', accountId);
  if (tenantId !== null) query = query.where('tenantId', '==', tenantId);
  const limit = remaining(collector);
  if (limit < 1) {
    collector.truncated = true;
    return;
  }
  const snapshot = await query.limit(limit).get();
  if (snapshot.docs.length >= limit) collector.truncated = true;
  for (const doc of snapshot.docs) {
    if (remaining(collector) < 1) {
      collector.truncated = true;
      return;
    }
    await collectPrincipalWithDependents(db, collector, Object.freeze({ ref: doc.ref, data: doc.data() }));
  }
}

async function commitDeletes(db: Firestore, refs: readonly Ref[]): Promise<void> {
  if (refs.length === 0) return;
  const batch = db.batch();
  for (const ref of refs) batch.delete(ref);
  await batch.commit();
}

function parseCursorSequence(cursor: string | null): number {
  if (cursor === null) return 0;
  if (!cursor.startsWith(CURSOR_PREFIX)) throw new Error('account_authority_purge_cursor_invalid');
  const value = Number(cursor.slice(CURSOR_PREFIX.length));
  if (!Number.isSafeInteger(value) || value < 1) throw new Error('account_authority_purge_cursor_invalid');
  return value;
}

/** S3, пункт 2: порт purge для runBoundedDeletePurge. */
export function createFirestoreAccountDeletePurgePort(db: Firestore): AccountDeletePurgePort {
  const port: AccountDeletePurgePort = {
    async purge(request) {
      const sequence = parseCursorSequence(request.cursor);
      const budget = Math.min(Math.max(1, request.maxItems), ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN);
      const collector = newCollector(budget);
      const accountRef = db.collection(AA_ACCOUNTS_COLLECTION).doc(request.accountId);
      await addQuery(collector, accountRef.collection(AA_RETIRED_SESSIONS_SUBCOLLECTION));
      await collectAccountPrincipals(db, collector, request.accountId, request.tenantId);
      const refs = [...collector.refs.values()];
      await commitDeletes(db, refs);
      const done = !collector.truncated;
      accountAuthorityLogInfo('purge pass', {
        stage: 'purge',
        status: done ? 'done' : 'more',
        pass: sequence + 1,
        deleted: refs.length,
        budget,
      });
      return Object.freeze({
        done,
        cursor: done ? null : `${CURSOR_PREFIX}${sequence + 1}`,
        purgedItems: refs.length,
      });
    },
  };
  return Object.freeze(port);
}

const NEW_ACCOUNT_ID_PREFIX = 'acct-';

/**
 * S3 раунд 2 (H-S3-2): чей аккаунт за принципалом удаляемого uid.
 * Принципал мог устареть — uid перепривязан к ЧУЖОМУ живому аккаунту S2.
 * Стирать аккаунт целиком можно, только если он в круге личности удаления
 * или это `acct-…`, созданный для этого uid (`accountSource: new_account`).
 * Иначе стирается лишь принципал и зависимые самого uid.
 */
export function legacyPrincipalAccountDecision(
  data: unknown,
  closure: ReadonlySet<string>,
): Readonly<{ wipe: boolean; accountId: string | null; reason: string }> {
  const record = typeof data === 'object' && data !== null ? data as Record<string, unknown> : {};
  const accountId = typeof record.accountId === 'string' && record.accountId.length > 0 ? record.accountId : null;
  if (accountId === null) return Object.freeze({ wipe: false, accountId: null, reason: 'no_account_id' });
  if (closure.has(accountId)) return Object.freeze({ wipe: true, accountId, reason: 'in_closure' });
  if (accountId.startsWith(NEW_ACCOUNT_ID_PREFIX) && record.accountSource === 'new_account') {
    return Object.freeze({ wipe: true, accountId, reason: 'own_new_account' });
  }
  return Object.freeze({ wipe: false, accountId, reason: 'foreign_account' });
}

/**
 * S3, пункт 3: старое удаление аккаунта стирает AA всех личностей замыкания.
 * Личность может быть и stableId (= accountId AA), и сырым uid — проверяются
 * обе трактовки; лишний поиск по чужой трактовке просто ничего не находит.
 * Аккаунт за принципалом uid стирается целиком только по правилу
 * legacyPrincipalAccountDecision (раунд 2, H-S3-2).
 * Порядок: аренда/отметки/состояние удаления → зависимые по хешу uid →
 * принципалы последними (обрыв не теряет связь uid → аккаунт).
 */
export async function purgeAccountAuthorityForLegacyIdentities(
  db: Firestore,
  identities: readonly string[],
  options: Readonly<{ maxItemsPerPass?: number; maxPasses?: number }> = {},
): Promise<Readonly<{ deleted: number; passes: number }>> {
  const clean = [...new Set(identities.map((item) => item.trim()).filter((item) => item.length > 0))];
  const budget = Math.min(Math.max(1, options.maxItemsPerPass ?? ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN), ACCOUNT_DELETE_PURGE_MAX_ITEMS_PER_RUN);
  const maxPasses = options.maxPasses ?? LEGACY_MAX_PASSES;
  const tenantId = asTenantId(AA_PRIMARY_TENANT_ID);
  accountAuthorityLogInfo('legacy_purge start', { stage: 'legacy_purge', identities: clean.length });
  if (clean.length === 0) {
    accountAuthorityLogInfo('legacy_purge skipped', { stage: 'legacy_purge', reason: 'no_identities' });
    return Object.freeze({ deleted: 0, passes: 0 });
  }
  const uidPrincipalRefs = clean.map((identity) => principalRef(
    db, tenantId, asFirebaseAuthUid(accountAuthorityFingerprintFromAuthUidHash(accountAuthorityAuthUidHash(identity))),
  ));
  // Связь uid → acct-… читается ДО любых удалений и живёт до конца вызова.
  const closure: ReadonlySet<string> = new Set(clean);
  const accountIds = new Set(clean);
  // guard-ok: личностей замыкания единицы (uid + stableId), удаление редкое.
  for (const ref of uidPrincipalRefs) {
    const snapshot = await ref.get();
    if (!snapshot.exists) continue;
    const decision = legacyPrincipalAccountDecision(snapshot.data(), closure);
    accountAuthorityLogInfo('legacy_purge principal_account', { stage: 'legacy_purge', status: decision.wipe ? 'wipe' : 'keep', reason: decision.reason });
    if (decision.wipe && decision.accountId !== null) accountIds.add(decision.accountId);
  }
  let deleted = 0;
  for (let pass = 1; pass <= maxPasses; pass += 1) {
    const collector = newCollector(budget);
    for (const accountId of accountIds) {
      const accountRef = db.collection(AA_ACCOUNTS_COLLECTION).doc(accountId);
      await addQuery(collector, accountRef.collection(AA_RETIRED_SESSIONS_SUBCOLLECTION));
      await addDocIfExists(collector, accountRef);
      await addDocIfExists(collector, db.collection(AA_DELETE_JOBS_COLLECTION).doc(accountId));
    }
    for (const identity of clean) {
      const before = collector.truncated;
      collector.truncated = false;
      await collectUidDependents(db, collector, accountAuthorityAuthUidHash(identity));
      const dependentsTruncated = collector.truncated;
      collector.truncated = before || dependentsTruncated;
    }
    for (const accountId of accountIds) await collectAccountPrincipals(db, collector, accountId, null);
    // Принципалы личностей по ключу — только если их зависимые уже собраны.
    if (!collector.truncated) {
      for (const ref of uidPrincipalRefs) await addDocIfExists(collector, ref);
    }
    const refs = [...collector.refs.values()];
    await commitDeletes(db, refs);
    deleted += refs.length;
    accountAuthorityLogInfo('legacy_purge pass', {
      stage: 'legacy_purge', pass, deleted: refs.length, status: collector.truncated ? 'more' : 'done',
    });
    if (!collector.truncated) return Object.freeze({ deleted, passes: pass });
  }
  // Не уложились: стадия падает, задача старого удаления повторится (идемпотентно).
  accountAuthorityLogWarn('legacy_purge incomplete', { stage: 'legacy_purge', reason: 'max_passes', deleted });
  throw new Error('account_authority_legacy_purge_incomplete');
}

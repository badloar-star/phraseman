import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { FieldPath, type Firestore } from 'firebase-admin/firestore';
import { onCall } from 'firebase-functions/v2/https';
import {
  ACCOUNTS_V2_ENTITY_TYPES,
  AccountsV2ApplyError,
  resolveCallerUid,
  type AccountsV2EntityType,
  type JsonValue,
} from '../accounts_v2_apply_core';
import { accountsV2FlagsReader, type AccountsV2FlagsReader } from '../accounts_v2_flags';
import { loadEntityRecord } from '../accounts_v2_store';
import { HOT_CALLABLE_OPTIONS } from '../callable_options';
import { decideAccountsV2Rate, type AccountsV2RateLimit } from './callable';
import { AccountsV2RateLimited, finalError, rateLimitedError, reauthError, retryableError } from './errors';
import { ACCOUNTS_V2_COLLECTIONS, accountsV2MetaPath, accountsV2UidPathSafe } from './firestore_port';

/*
 * Account V2, Пакет 6G (TG-4CAC183BF512) — чтение своей учётки V2 (гидрация).
 *
 * зачем: правила Firestore для accounts_v2/** закрыты для клиента целиком
 * (сторож rules_guard.test.ts) — новый телефон / новая установка получает своё
 * состояние ТОЛЬКО через эту функцию: uid берётся из auth, путь строится под
 * ним, чужое физически не адресуется. Постранично: по id документа (sha256),
 * курсор — id последнего документа страницы, страница ≤ 200 сущностей.
 *
 * Каждая запись проверяется тем же кодеком, что ядро (loadEntityRecord, fail
 * closed): битая запись не уходит клиенту, а считается в `skipped` (лог).
 * Наружу — только тип, id сущности, ревизия, время и разобранное состояние.
 *
 * Ворота: флаг syncEnabled (выкл → accounts_v2_disabled, 0 чтений данных) →
 * auth → uid для пути → курсор/размер → блок в памяти (0 чтений) → счётчик
 * частоты accounts_v2_meta/pull_rate (1 чтение + 1 запись; отказ — 1 чтение) →
 * один запрос страницы (≤ limit чтений). Клиент тянет один раз на установку и
 * при смене аккаунта — без опроса.
 */

export const ACCOUNTS_V2_PULL_PAGE_MAX = 200;
export const ACCOUNTS_V2_PULL_RATE: AccountsV2RateLimit = Object.freeze({
  windowMs: 60_000,
  maxCalls: 30,
  dayMs: 24 * 60 * 60 * 1000,
  /** 300 страниц × 200 = 60 000 сущностей в сутки — на порядки больше одной гидрации. */
  maxCallsPerDay: 300,
});
export const ACCOUNTS_V2_PULL_RATE_META = 'pull_rate';

const LOG = '[ACCOUNTS-V2]';
const DOC_ID = /^[0-9a-f]{64}$/;
const BLOCK_CACHE_MAX = 10_000;

export type AccountsV2PulledEntity = Readonly<{
  entityType: AccountsV2EntityType;
  entityId: string;
  revision: number;
  updatedAtMs: number;
  state: JsonValue;
}>;

export type AccountsV2PullResponse = Readonly<{
  entities: readonly AccountsV2PulledEntity[];
  /** null — страниц больше нет. */
  nextCursor: string | null;
  skipped: number;
  serverNowMs: number;
}>;

export type AccountsV2PullRequest = Readonly<{ auth?: Readonly<{ uid?: string }> | null; data: unknown }>;
export type StoredEntityDoc = Readonly<{ id: string; data: unknown }>;

export type AccountsV2PullPort = Readonly<{
  /** Счётчик частоты: decide получает сохранённый документ, его write пишется в той же транзакции. */
  consumeRate(uid: string, decide: (stored: Readonly<Record<string, unknown>> | null) => ReturnType<typeof decideAccountsV2Rate>): Promise<void>;
  /** Сущности под uid по возрастанию id документа, строго после afterDocId. */
  listEntities(uid: string, afterDocId: string | null, limit: number): Promise<readonly StoredEntityDoc[]>;
}>;

export type AccountsV2PullDeps = Readonly<{ nowMs: () => number; blockCache: Map<string, number>; rate: AccountsV2RateLimit }>;

const DEFAULT_DEPS: AccountsV2PullDeps = Object.freeze({
  nowMs: () => Date.now(), blockCache: new Map<string, number>(), rate: ACCOUNTS_V2_PULL_RATE,
});

function uidTag(uid: string): string {
  return createHash('sha256').update(uid).digest('hex').slice(0, 12);
}

function errorTag(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'none';
  return `name=${name} code=${code}`;
}

type Parsed = Readonly<{ ok: true; cursor: string | null; limit: number }> | Readonly<{ ok: false; code: string }>;

/** Запрос: `{ cursor?: sha256-hex | null, limit?: 1..200 }`, без лишних полей. */
export function parsePullRequest(data: unknown): Parsed {
  if (data === undefined || data === null) return { ok: true, cursor: null, limit: ACCOUNTS_V2_PULL_PAGE_MAX };
  if (typeof data !== 'object' || Array.isArray(data)) return { ok: false, code: 'request_not_object' };
  const raw = data as Record<string, unknown>;
  if (Object.keys(raw).some((key) => key !== 'cursor' && key !== 'limit')) return { ok: false, code: 'request_unknown_field' };
  const cursor = raw.cursor ?? null;
  if (cursor !== null && (typeof cursor !== 'string' || !DOC_ID.test(cursor))) return { ok: false, code: 'cursor_invalid' };
  const limit = raw.limit ?? ACCOUNTS_V2_PULL_PAGE_MAX;
  if (!Number.isSafeInteger(limit) || (limit as number) < 1 || (limit as number) > ACCOUNTS_V2_PULL_PAGE_MAX) {
    return { ok: false, code: 'limit_invalid' };
  }
  return { ok: true, cursor: cursor as string | null, limit: limit as number };
}

/** Запись хранилища → сущность для клиента; null — порча (fail closed, лог у вызывающего). */
export function decodeStoredEntity(doc: StoredEntityDoc): AccountsV2PulledEntity | null {
  const record = doc.data;
  if (typeof record !== 'object' || record === null) return null;
  const { entityType, entityIdJson, updatedAtMs } = record as Record<string, unknown>;
  if (typeof entityType !== 'string' || !(ACCOUNTS_V2_ENTITY_TYPES as readonly string[]).includes(entityType)) return null;
  let entityId: unknown;
  try {
    entityId = typeof entityIdJson === 'string' ? JSON.parse(entityIdJson) : null;
  } catch {
    // зачем: не немой catch — битый id сущности = порча записи, решает вызывающий (skipped).
    console.warn(`${LOG} pull entity_id_unparseable`);
    return null;
  }
  if (typeof entityId !== 'string') return null;
  try {
    const loaded = loadEntityRecord(record, entityType as AccountsV2EntityType, entityId);
    if (loaded === null || !Number.isSafeInteger(updatedAtMs)) return null;
    return Object.freeze({
      entityType: entityType as AccountsV2EntityType, entityId, revision: loaded.revision,
      updatedAtMs: updatedAtMs as number, state: loaded.state,
    });
  } catch (error) {
    if (error instanceof AccountsV2ApplyError) return null;
    throw error;
  }
}

function cachedBlock(cache: Map<string, number>, uid: string, nowMs: number): number | null {
  const until = cache.get(uid);
  if (until === undefined) return null;
  if (nowMs < until) return until;
  cache.delete(uid);
  return null;
}

/** Логика callable без firebase-functions — её гоняют тесты на фейковом порте. */
export async function handleAccountsV2PullMine(
  port: AccountsV2PullPort,
  request: AccountsV2PullRequest,
  flags: AccountsV2FlagsReader,
  deps: AccountsV2PullDeps = DEFAULT_DEPS,
): Promise<AccountsV2PullResponse> {
  const read = await flags.read();
  if (!read.ok) {
    console.warn(`${LOG} pull reject reason=flag_unavailable reads=0`);
    throw retryableError();
  }
  if (!read.flags.syncEnabled) {
    console.warn(`${LOG} pull reject reason=accounts_v2_disabled auth=${request.auth ? 'present' : 'missing'} reads=0`);
    throw finalError('failed-precondition', 'accounts_v2_disabled');
  }
  const caller = resolveCallerUid(request.auth ?? null);
  if (!caller.ok) {
    console.warn(`${LOG} pull reject reason=${caller.code}`);
    throw reauthError();
  }
  const { uid } = caller;
  const tag = uidTag(uid);
  if (!accountsV2UidPathSafe(uid)) {
    console.warn(`${LOG} pull reject reason=uid_not_path_safe uid=${tag}`);
    throw finalError('failed-precondition', 'uid_not_path_safe');
  }
  const parsed = parsePullRequest(request.data);
  if (!parsed.ok) {
    console.warn(`${LOG} pull reject reason=invalid_request code=${parsed.code} uid=${tag}`);
    throw finalError('invalid-argument', parsed.code);
  }
  const nowMs = deps.nowMs();
  const blocked = cachedBlock(deps.blockCache, uid, nowMs);
  if (blocked !== null) {
    console.warn(`${LOG} pull rate_limited_cached uid=${tag} retryAfterMs=${blocked - nowMs}`);
    throw rateLimitedError(blocked - nowMs);
  }
  try {
    await port.consumeRate(uid, (stored) => decideAccountsV2Rate(stored, nowMs, deps.rate, tag));
  } catch (error) {
    if (error instanceof AccountsV2RateLimited) {
      if (deps.blockCache.size >= BLOCK_CACHE_MAX) deps.blockCache.clear();
      deps.blockCache.set(uid, error.blockedUntilMs); // guard-ok: Map в памяти инстанса
      console.warn(`${LOG} pull rate_limited uid=${tag} retryAfterMs=${error.blockedUntilMs - nowMs}`);
      throw rateLimitedError(error.blockedUntilMs - nowMs);
    }
    console.error(`${LOG} pull rate_failed uid=${tag} ${errorTag(error)}`);
    throw retryableError();
  }
  let docs: readonly StoredEntityDoc[];
  try {
    docs = await port.listEntities(uid, parsed.cursor, parsed.limit);
  } catch (error) {
    console.error(`${LOG} pull list_failed uid=${tag} ${errorTag(error)}`);
    throw retryableError();
  }
  const entities: AccountsV2PulledEntity[] = [];
  let skipped = 0;
  for (const doc of docs) {
    const decoded = DOC_ID.test(doc.id) ? decodeStoredEntity(doc) : null;
    if (decoded === null) skipped += 1;
    else entities.push(decoded);
  }
  if (skipped > 0) console.warn(`${LOG} pull corrupt_skipped uid=${tag} count=${skipped}`);
  const nextCursor = docs.length === parsed.limit ? docs[docs.length - 1].id : null;
  console.info(`${LOG} pull page uid=${tag} cursor=${parsed.cursor === null ? 'start' : 'next'} `
    + `entities=${entities.length} skipped=${skipped} more=${nextCursor !== null}`);
  return Object.freeze({ entities: Object.freeze(entities), nextCursor, skipped, serverNowMs: nowMs });
}

/** Firestore-реализация: счётчик — одна транзакция; страница — один запрос с limit. */
export function createFirestorePullPort(db: Firestore): AccountsV2PullPort {
  return Object.freeze({
    async consumeRate(uid, decide) {
      const ref = db.doc(accountsV2MetaPath(uid, ACCOUNTS_V2_PULL_RATE_META));
      const refusal = await db.runTransaction(async (tx) => {
        const snapshot = await tx.get(ref);
        const decision = decide(snapshot.exists ? (snapshot.data() ?? null) as Readonly<Record<string, unknown>> | null : null);
        if (decision.write !== null) tx.set(ref, decision.write); // guard-ok: одна запись в транзакции
        return decision.allowed ? null : decision.error;
      });
      if (refusal !== null) throw refusal;
    },
    async listEntities(uid, afterDocId, limit) {
      if (!accountsV2UidPathSafe(uid)) throw new Error('accounts_v2_uid_not_path_safe');
      let query = db.collection('accounts_v2').doc(uid).collection(ACCOUNTS_V2_COLLECTIONS.entities)
        .orderBy(FieldPath.documentId()).limit(limit);
      if (afterDocId !== null) query = query.startAfter(afterDocId);
      const snapshot = await query.get(); // guard-ok: limit ≤ 200, только свой uid
      return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
    },
  });
}

/** Callable. Выключена флагом `config/accounts_v2.syncEnabled` (по умолчанию выкл). */
export const accountsV2PullMine = onCall(HOT_CALLABLE_OPTIONS, (request) => {
  const db = admin.firestore();
  return handleAccountsV2PullMine(createFirestorePullPort(db), { auth: request.auth ?? null, data: request.data },
    accountsV2FlagsReader(db));
});

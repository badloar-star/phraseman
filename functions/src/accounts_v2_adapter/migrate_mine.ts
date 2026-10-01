import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveCallerUid, type AccountsV2Receipt, type ValidatedBatch } from '../accounts_v2_apply_core';
import { accountsV2FlagsReader, type AccountsV2FlagsReader } from '../accounts_v2_flags';
import { HOT_CALLABLE_OPTIONS } from '../callable_options';
import {
  MIGRATION_EXPORT_FORMAT,
  MigrationInputError,
  runMigrationDryRun,
  type MigrationReport,
} from '../accounts_v2_migration/dry_run';
import { finalError, rateLimitedError, reauthError, retryableError } from './errors';
import { accountsV2MetaPath, accountsV2UidPathSafe, applyBatchInFirestore } from './firestore_port';

/*
 * Account V2, Пакет 6G (TG-4CAC183BF512) — перенос старых данных при первом
 * входе (решение владельца OD21: «при первом входе каждого», без массового запуска).
 *
 * зачем: клиент только ПРОСИТ перенос; сервер сам читает старые данные
 * ВЫЗЫВАЮЩЕГО (uid только из auth), строит операции тем же ядром dry-run
 * (Пакет 5: инвентарь, решения владельца, HOLD) и применяет их тем же
 * applyBatchInFirestore, что callable синхронизации. Ничего не удаляется (OD20).
 *
 * Ворота (по порядку, каждый ранний выход — лог [ACCOUNTS-V2] и ноль лишних чтений):
 *   флаг config/accounts_v2.syncEnabled (выкл → accounts_v2_disabled, 0 чтений данных) →
 *   auth → uid пригоден для пути → блок в памяти инстанса (0 чтений) →
 *   ОДНО чтение отметки accounts_v2/{uid}/accounts_v2_meta/migration:
 *     done той же версии  → already_done (повторный вход = ноль работы);
 *     hold моложе 24 ч     → hold из отметки (не перечитываем старые данные);
 *     попытка моложе окна → rate_limited (окно общее для всех инстансов — в отметке).
 *   → метка попытки → старый документ (auth_links → users/{id}) + страницы карточек
 *   → dry-run → hold: отметка hold, V2 не пишется; ready: пакеты по одному в
 *   транзакции ядра (повтор = duplicate), отметка done/partial.
 *
 * Стоимость первого входа: 1 (флаг, кэш 5 мин) + 1 (отметка) + 1 (метка) +
 *   2 (auth_links, маркер удаления) + 1 (users) + ≤ N страниц + 1 (проба
 *   personal_sync) + на пакет ≤ 50 операций: N+M чтений и записей + 1 запись отметки.
 * Повторный вход: 1 чтение отметки. Клиент зовёт перенос один раз на установку.
 *
 * Отметка: { status: 'done'|'hold'|'partial', version, atMs, lastAttemptAtMs,
 *   operations, nextBatch?, opsSha256?, holdReasons? } — только коды и числа.
 */

/** Версия переноса: другая версия в отметке = перенос не сделан (новый прогон ядра). */
export const ACCOUNTS_V2_MIGRATION_VERSION = 1;
export const ACCOUNTS_V2_MIGRATION_META = 'migration';
/** Пакетов ядра за один вызов: каждый — своя транзакция, вызов обязан уложиться в таймаут. */
export const ACCOUNTS_V2_MIGRATION_MAX_BATCHES_PER_CALL = 10;
/** Предел документов страниц карточек: больше — HOLD (не читаем без конца). */
export const ACCOUNTS_V2_MIGRATION_MAX_PAGES = 200;
export const ACCOUNTS_V2_MIGRATION_LIMITS = Object.freeze({
  /** Между попытками (не done): общий для всех инстансов, хранится в отметке. */
  attemptIntervalMs: 60_000,
  /** Продолжение partial — быстрее, но не чаще. */
  partialIntervalMs: 5_000,
  /** hold пересматривается не чаще раза в сутки. */
  holdRecheckMs: 24 * 60 * 60 * 1000,
});

const LOG = '[ACCOUNTS-V2]';
const USERS = 'users';
const AUTH_LINKS = 'auth_links';
const DELETION_MARKERS = 'account_deletion_auth_markers';
const FLASHCARD_PAGES = 'flashcard_pages';
const PERSONAL_SYNC = 'personal_sync_segments';
const BLOCK_CACHE_MAX = 10_000;

export type AccountsV2MigrationStatus = 'done' | 'already_done' | 'hold' | 'partial';
export type AccountsV2MigrateResponse = Readonly<{
  status: AccountsV2MigrationStatus;
  version: number;
  /** Операций ядра в этом вызове. */
  operations: number;
  outcomes: Readonly<Record<'applied' | 'duplicate' | 'conflict' | 'rejected', number>>;
  /** Причины HOLD — только коды отчёта (без путей и значений). */
  holdReasons: readonly string[];
  /** Старый документ найден (false — нечего переносить). */
  legacyFound: boolean;
}>;

type Meta = Readonly<Record<string, unknown>>;
export type LegacyDoc = Readonly<{ id: string; data: unknown }>;

/**
 * Порт данных переноса. Firestore-реализация — createFirestoreMigratePort; тесты дают свою.
 * Все методы — ТОЛЬКО под uid вызывающего / его старым документом.
 */
export type AccountsV2MigratePort = Readonly<{
  readMeta(uid: string): Promise<Meta | null>;
  writeMeta(uid: string, data: Meta): Promise<void>;
  /** id старого документа или отказ: удаление в процессе. */
  resolveLegacyDocId(uid: string): Promise<Readonly<{ ok: true; docId: string }> | Readonly<{ ok: false; reason: 'deletion_pending' }>>;
  readLegacyUser(docId: string): Promise<unknown | null>;
  readFlashcardPages(docId: string, limit: number): Promise<readonly LegacyDoc[]>;
  hasPersonalSync(docId: string): Promise<boolean>;
  applyBatch(uid: string, batch: ValidatedBatch, nowMs: number): Promise<readonly AccountsV2Receipt[]>;
}>;

export type AccountsV2MigrateDeps = Readonly<{
  nowMs: () => number;
  /** uid → blockedUntilMs (память инстанса: повторный отказ — 0 чтений). */
  blockCache: Map<string, number>;
}>;

const DEFAULT_DEPS: AccountsV2MigrateDeps = Object.freeze({ nowMs: () => Date.now(), blockCache: new Map<string, number>() });

export type AccountsV2MigrateRequest = Readonly<{ auth?: Readonly<{ uid?: string }> | null }>;

function uidTag(uid: string): string {
  return createHash('sha256').update(uid).digest('hex').slice(0, 12);
}

function errorTag(error: unknown): string {
  const name = error instanceof Error ? error.name : typeof error;
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : 'none';
  return `name=${name} code=${code}`;
}

function num(value: unknown): number | null {
  return Number.isSafeInteger(value) ? value as number : null;
}

function emptyOutcomes(): Record<'applied' | 'duplicate' | 'conflict' | 'rejected', number> {
  return { applied: 0, duplicate: 0, conflict: 0, rejected: 0 };
}

function respond(
  status: AccountsV2MigrationStatus, operations: number, outcomes = emptyOutcomes(),
  holdReasons: readonly string[] = [], legacyFound = true,
): AccountsV2MigrateResponse {
  return Object.freeze({
    status, version: ACCOUNTS_V2_MIGRATION_VERSION, operations, outcomes: Object.freeze({ ...outcomes }),
    holdReasons: Object.freeze([...holdReasons]), legacyFound,
  });
}

/**
 * Firestore Timestamp/GeoPoint/DocumentReference → простые значения (dry-run
 * принимает только простые объекты). Неизвестный класс — null (не тащим его в ядро).
 */
export function toPlainLegacyValue(value: unknown, depth = 0): unknown {
  if (depth > 64) return null;
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => toPlainLegacyValue(item, depth + 1));
  const proto = Reflect.getPrototypeOf(value);
  if (proto === Object.prototype || proto === null) {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) out[key] = toPlainLegacyValue(item, depth + 1);
    return out;
  }
  const toMillis = (value as { toMillis?: unknown }).toMillis;
  if (typeof toMillis === 'function') return Reflect.apply(toMillis, value, []) as unknown;
  return null;
}

function holdReasonsOf(report: MigrationReport): string[] {
  const reasons = new Set<string>();
  for (const entry of report.held) reasons.add(entry.reason); // guard-ok: Set в памяти
  for (const entry of report.conflicts) reasons.add(`conflict_${entry.kind}`); // guard-ok: Set в памяти
  return [...reasons].sort();
}

function cachedBlock(cache: Map<string, number>, uid: string, nowMs: number): number | null {
  const until = cache.get(uid);
  if (until === undefined) return null;
  if (nowMs < until) return until;
  cache.delete(uid);
  return null;
}

function rememberBlock(cache: Map<string, number>, uid: string, until: number): void {
  if (cache.size >= BLOCK_CACHE_MAX && !cache.has(uid)) {
    const oldest = cache.keys().next();
    console.warn(`${LOG} migrate cache_evict size=${cache.size}`);
    if (!oldest.done) cache.delete(oldest.value);
  }
  cache.set(uid, until); // guard-ok: Map в памяти инстанса
}

type Gate =
  | Readonly<{ kind: 'answer'; response: AccountsV2MigrateResponse }>
  | Readonly<{ kind: 'wait'; untilMs: number }>
  | Readonly<{ kind: 'run'; resumeFrom: number; opsSha256: string | null }>;

/** Решение по отметке: ответить сразу, ждать или работать (и откуда продолжать). */
export function decideAccountsV2Migration(meta: Meta | null, nowMs: number): Gate {
  if (meta === null) return { kind: 'run', resumeFrom: 0, opsSha256: null };
  const sameVersion = meta.version === ACCOUNTS_V2_MIGRATION_VERSION;
  const status = meta.status;
  const atMs = num(meta.atMs);
  if (sameVersion && status === 'done') {
    return { kind: 'answer', response: respond('already_done', 0, emptyOutcomes(), [], meta.legacyFound !== false) };
  }
  if (sameVersion && status === 'hold' && atMs !== null && nowMs - atMs >= 0 && nowMs - atMs < ACCOUNTS_V2_MIGRATION_LIMITS.holdRecheckMs) {
    const reasons = Array.isArray(meta.holdReasons) ? meta.holdReasons.filter((item): item is string => typeof item === 'string') : [];
    return { kind: 'answer', response: respond('hold', 0, emptyOutcomes(), reasons) };
  }
  const last = num(meta.lastAttemptAtMs);
  const interval = sameVersion && status === 'partial'
    ? ACCOUNTS_V2_MIGRATION_LIMITS.partialIntervalMs : ACCOUNTS_V2_MIGRATION_LIMITS.attemptIntervalMs;
  // зачем: время «из будущего» (часы инстансов) дальше окна — порча, не блокируем человека.
  if (last !== null && nowMs - last < interval && last - nowMs < interval) return { kind: 'wait', untilMs: last + interval };
  if (sameVersion && status === 'partial') {
    const next = num(meta.nextBatch);
    const sha = typeof meta.opsSha256 === 'string' ? meta.opsSha256 : null;
    if (next !== null && next > 0 && sha !== null) return { kind: 'run', resumeFrom: next, opsSha256: sha };
  }
  return { kind: 'run', resumeFrom: 0, opsSha256: null };
}

function countOutcomes(receipts: readonly AccountsV2Receipt[], into: Record<'applied' | 'duplicate' | 'conflict' | 'rejected', number>): void {
  for (const receipt of receipts) into[receipt.outcome] += 1;
}

/** Снимок старых данных в формате dry-run (MIGRATION_EXPORT_FORMAT). */
async function readLegacySnapshot(
  port: AccountsV2MigratePort, uid: string, docId: string, tag: string,
): Promise<Readonly<{ snapshot: unknown; found: boolean; pagesOverflow: boolean }>> {
  const user = await port.readLegacyUser(docId);
  if (user === null) {
    console.log(`${LOG} migrate legacy_absent uid=${tag} sameDoc=${docId === uid}`);
    return { snapshot: { format: MIGRATION_EXPORT_FORMAT, uid, user: null, subcollections: {} }, found: false, pagesOverflow: false };
  }
  const pages = await port.readFlashcardPages(docId, ACCOUNTS_V2_MIGRATION_MAX_PAGES + 1);
  const pagesOverflow = pages.length > ACCOUNTS_V2_MIGRATION_MAX_PAGES;
  // зачем: журналы телефона по инвентарю Пакета 5 — HOLD «нет решения владельца»;
  // достаточно знать, что они есть (limit 1), содержимое не читаем.
  const personal = await port.hasPersonalSync(docId);
  const subcollections: Record<string, unknown[]> = {
    [FLASHCARD_PAGES]: pages.slice(0, ACCOUNTS_V2_MIGRATION_MAX_PAGES).map((page) => ({ id: page.id, data: toPlainLegacyValue(page.data) })),
  };
  if (personal) subcollections[PERSONAL_SYNC] = [{ id: 'present', data: {} }];
  return {
    snapshot: { format: MIGRATION_EXPORT_FORMAT, uid, user: toPlainLegacyValue(user), subcollections },
    found: true,
    pagesOverflow,
  };
}

async function writeHold(
  port: AccountsV2MigratePort, uid: string, tag: string, nowMs: number, reasons: readonly string[], legacyFound: boolean,
): Promise<AccountsV2MigrateResponse> {
  await port.writeMeta(uid, {
    status: 'hold', version: ACCOUNTS_V2_MIGRATION_VERSION, atMs: nowMs, lastAttemptAtMs: nowMs,
    operations: 0, holdReasons: [...reasons], legacyFound,
  });
  console.warn(`${LOG} migrate hold uid=${tag} reasons=${reasons.join('|') || 'none'} writes=0_v2`);
  return respond('hold', 0, emptyOutcomes(), reasons, legacyFound);
}

/** Сам перенос: старые данные → dry-run → пакеты ядра. Ворота уже пройдены. */
async function runMigration(
  port: AccountsV2MigratePort, uid: string, tag: string, nowMs: number, gate: Extract<Gate, { kind: 'run' }>,
): Promise<AccountsV2MigrateResponse> {
  const resolved = await port.resolveLegacyDocId(uid);
  if (!resolved.ok) {
    console.warn(`${LOG} migrate reject reason=${resolved.reason} uid=${tag}`);
    throw finalError('failed-precondition', 'account_deletion_pending');
  }
  const legacy = await readLegacySnapshot(port, uid, resolved.docId, tag);
  if (legacy.pagesOverflow) return writeHold(port, uid, tag, nowMs, ['pages_over_limit'], true);
  let result;
  try {
    result = runMigrationDryRun(legacy.snapshot, { nowMs, legacyDocId: resolved.docId });
  } catch (error) {
    if (!(error instanceof MigrationInputError)) throw error;
    // зачем: конверт снимка собирает сервер — сюда попадает только непригодный uid/документ.
    console.warn(`${LOG} migrate input_rejected code=${error.code} uid=${tag}`);
    return writeHold(port, uid, tag, nowMs, [`input_${error.code}`], legacy.found);
  }
  const { report, batches } = result;
  if (report.status !== 'ready' || report.applyAllowed !== true) {
    return writeHold(port, uid, tag, nowMs, holdReasonsOf(report), legacy.found);
  }
  // зачем: продолжение partial допустимо, только если план тот же (иначе — с начала, повтор = duplicate).
  const start = gate.opsSha256 === report.operations.sha256 ? Math.min(gate.resumeFrom, batches.length) : 0;
  if (gate.resumeFrom > 0 && start === 0) console.log(`${LOG} migrate resume_restart reason=plan_changed uid=${tag}`);
  const end = Math.min(batches.length, start + ACCOUNTS_V2_MIGRATION_MAX_BATCHES_PER_CALL);
  const outcomes = emptyOutcomes();
  let operations = 0;
  for (let index = start; index < end; index += 1) {
    const receipts = await port.applyBatch(uid, batches[index], nowMs);
    countOutcomes(receipts, outcomes);
    operations += batches[index].operations.length;
  }
  const finished = end >= batches.length;
  await port.writeMeta(uid, finished
    ? {
      status: 'done', version: ACCOUNTS_V2_MIGRATION_VERSION, atMs: nowMs, lastAttemptAtMs: nowMs,
      operations: report.operations.count, legacyFound: legacy.found,
    }
    : {
      status: 'partial', version: ACCOUNTS_V2_MIGRATION_VERSION, atMs: nowMs, lastAttemptAtMs: nowMs,
      operations: report.operations.count, nextBatch: end, opsSha256: report.operations.sha256, legacyFound: legacy.found,
    });
  console.info(`${LOG} migrate ${finished ? 'done' : 'partial'} uid=${tag} batches=${start}..${end}/${batches.length} `
    + `ops=${operations} applied=${outcomes.applied} duplicate=${outcomes.duplicate} conflict=${outcomes.conflict} `
    + `rejected=${outcomes.rejected} legacy=${legacy.found ? 'found' : 'absent'}`);
  return respond(finished ? 'done' : 'partial', operations, outcomes, [], legacy.found);
}

/** Логика callable без firebase-functions: её гоняют тесты на фейковом порте. */
export async function handleAccountsV2MigrateMine(
  port: AccountsV2MigratePort,
  request: AccountsV2MigrateRequest,
  flags: AccountsV2FlagsReader,
  deps: AccountsV2MigrateDeps = DEFAULT_DEPS,
): Promise<AccountsV2MigrateResponse> {
  const read = await flags.read();
  if (!read.ok) {
    console.warn(`${LOG} migrate reject reason=flag_unavailable reads=0`);
    throw retryableError();
  }
  if (!read.flags.syncEnabled) {
    console.warn(`${LOG} migrate reject reason=accounts_v2_disabled auth=${request.auth ? 'present' : 'missing'} reads=0`);
    throw finalError('failed-precondition', 'accounts_v2_disabled');
  }
  const caller = resolveCallerUid(request.auth ?? null);
  if (!caller.ok) {
    console.warn(`${LOG} migrate reject reason=${caller.code}`);
    throw reauthError();
  }
  const { uid } = caller;
  const tag = uidTag(uid);
  if (!accountsV2UidPathSafe(uid)) {
    console.warn(`${LOG} migrate reject reason=uid_not_path_safe uid=${tag}`);
    throw finalError('failed-precondition', 'uid_not_path_safe');
  }
  const nowMs = deps.nowMs();
  const blocked = cachedBlock(deps.blockCache, uid, nowMs);
  if (blocked !== null) {
    console.warn(`${LOG} migrate rate_limited_cached uid=${tag} retryAfterMs=${blocked - nowMs}`);
    throw rateLimitedError(blocked - nowMs);
  }
  const gate = decideAccountsV2Migration(await port.readMeta(uid), nowMs);
  if (gate.kind === 'answer') {
    console.log(`${LOG} migrate ${gate.response.status} uid=${tag} reads=1`);
    return gate.response;
  }
  if (gate.kind === 'wait') {
    rememberBlock(deps.blockCache, uid, gate.untilMs);
    console.warn(`${LOG} migrate rate_limited uid=${tag} retryAfterMs=${gate.untilMs - nowMs}`);
    throw rateLimitedError(gate.untilMs - nowMs);
  }
  // зачем: метка попытки ДО чтения старых данных — окно частоты общее для всех инстансов,
  // даже если эта попытка упадёт посередине.
  await port.writeMeta(uid, { lastAttemptAtMs: nowMs });
  rememberBlock(deps.blockCache, uid, nowMs + ACCOUNTS_V2_MIGRATION_LIMITS.partialIntervalMs);
  console.info(`${LOG} migrate start uid=${tag} resumeFrom=${gate.resumeFrom}`);
  try {
    const response = await runMigration(port, uid, tag, nowMs, gate);
    // зачем (найдено E2E на эмуляторе): блок «попытка идёт» нужен только против
    // повторов НЕЗАВЕРШЁННОЙ работы. После done/hold повторный вход обязан получить
    // ответ из отметки (1 чтение), а не rate_limited. partial — блок остаётся (5 с).
    if (response.status !== 'partial') deps.blockCache.delete(uid);
    return response;
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    console.error(`${LOG} migrate failed uid=${tag} ${errorTag(error)}`);
    throw retryableError();
  }
}

/** Firestore-реализация порта: только точечные чтения под uid / его старым документом. */
export function createFirestoreMigratePort(db: Firestore): AccountsV2MigratePort {
  const metaRef = (uid: string) => db.doc(accountsV2MetaPath(uid, ACCOUNTS_V2_MIGRATION_META));
  return Object.freeze({
    async readMeta(uid) {
      const snapshot = await metaRef(uid).get(); // guard-ok: один документ отметки
      return snapshot.exists ? (snapshot.data() ?? null) as Meta | null : null;
    },
    async writeMeta(uid, data) {
      await metaRef(uid).set(data, { merge: true }); // guard-ok: один документ отметки
    },
    async resolveLegacyDocId(uid) {
      // зачем: то же правило владения, что firestore.rules (authLinkMapsToUser / isOwner):
      // привязка auth_links/{uid}.stable_id, иначе документ под самим uid.
      const [marker, link] = await Promise.all([
        db.collection(DELETION_MARKERS).doc(uid).get(), // guard-ok: один документ
        db.collection(AUTH_LINKS).doc(uid).get(), // guard-ok: один документ
      ]);
      if (marker.exists) return { ok: false, reason: 'deletion_pending' } as const;
      const stable = link.exists ? (link.data() ?? {}).stable_id : undefined;
      const docId = typeof stable === 'string' && stable.length > 0 && stable.length <= 128 && !stable.includes('/')
        && !/^__.*__$/.test(stable) ? stable : uid;
      return { ok: true, docId } as const;
    },
    async readLegacyUser(docId) {
      const snapshot = await db.collection(USERS).doc(docId).get(); // guard-ok: один документ
      return snapshot.exists ? (snapshot.data() ?? null) : null;
    },
    async readFlashcardPages(docId, limit) {
      const snapshot = await db.collection(USERS).doc(docId).collection(FLASHCARD_PAGES).limit(limit).get(); // guard-ok: limit
      return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
    },
    async hasPersonalSync(docId) {
      const snapshot = await db.collection(USERS).doc(docId).collection(PERSONAL_SYNC).limit(1).get(); // guard-ok: limit 1
      return !snapshot.empty;
    },
    applyBatch: (uid, batch, nowMs) => applyBatchInFirestore(db, uid, batch, nowMs),
  });
}

/**
 * Пакет 6G: опции — горячий callable проекта (App Check запломбирован владельцем,
 * enforceAppCheck = false), но таймаут длиннее: до 10 транзакций ядра за вызов.
 */
export const ACCOUNTS_V2_MIGRATE_OPTIONS = Object.freeze({ ...HOT_CALLABLE_OPTIONS, timeoutSeconds: 60, maxInstances: 20 });

/** Callable. Выключена флагом `config/accounts_v2.syncEnabled` (по умолчанию выкл). */
export const accountsV2MigrateMine = onCall(ACCOUNTS_V2_MIGRATE_OPTIONS, (request) => {
  const db = admin.firestore();
  return handleAccountsV2MigrateMine(createFirestoreMigratePort(db), { auth: request.auth ?? null }, accountsV2FlagsReader(db));
});

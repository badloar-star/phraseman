import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { resolveStableUidForAuth } from './auth_identity';
import { buildMigrationPatch, type ProgressMap } from './progress_events';

/**
 * Account V2, Пакет 8I (TG-41E8B2DA2340, решение координатора §67) — дозаливка облачного
 * progress, затёртого дефектом 8G (до caf7b9889 пустой снимок progressMigrateSnapshot
 * заменял progress целиком).
 *
 * зачем отдельный callable, а не режим миграции: семантика узкая — «добавить ОТСУТСТВУЮЩЕЕ».
 *  - пишутся только ключи, которых в облачном progress нет вовсе; существующие (даже ниже
 *    снимка) не трогаются → понижение и перезапись невозможны;
 *  - значения проходят тот же фильтр, что у исходной миграции (buildMigrationPatch: только
 *    структурные ключи уроков, best_score/pass_count/серия остаются в карантине) — уровень
 *    доверия к снимку клиента не выше, чем был;
 *  - запись точечная: непустой patch под `progress` при merge даёт маску `progress.<ключ>`
 *    (доказано на Admin SDK в тестах 8G/8I), пустой patch не пишется вообще;
 *  - раз в сутки на аккаунт: отметка `progressReseedAt` в корне users/{id}, читается в той же
 *    транзакции; клиенту она не записываема (firestore.rules, блок-лист маркеров прогресса).
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export const PROGRESS_RESEED_LIMITS = Object.freeze({
  // зачем: клиентский сборщик снимка даёт ~716 ключей (2 языка × 80 уроков × 4 поля + экзамены).
  maxKeys: 1000,
  maxKeyChars: 200,
  // тот же потолок, что buildMigrationPatch ставит прогрессу урока.
  maxValueChars: 20_000,
  maxTotalChars: 256 * 1024,
  minIntervalMs: DAY_MS,
  // зачем (ревью 8I, C-1): номер урока ограничен, чтобы изменённый клиент не дописывал
  // выдуманные lessonNNNN_* и не раздувал документ к лимиту 1 МБ (класс аварии 2026-09-01).
  // Отдельной серверной константы числа уроков старого курса в functions/src нет (есть только
  // курс Learning V2 и clampInt(…, 0, 500) событий — это не размер курса). Основной курс — 32
  // урока (app/main_course_access.ts MAIN_COURSE_LESSON_COUNT), а клиентский сборщик снимка
  // (app/progress_events_client.ts progressSnapshotKeys) берёт уроки 1..80 — больше в снимке
  // честного клиента быть не может. Потолок = граница сборщика.
  maxLessonId: 80,
});

// Ровно те ключи, что переносит buildMigrationPatch; группа — номер урока.
const RESEED_LESSON_KEY_RES: readonly RegExp[] = [
  /^(?:lesson_progress_v2::fr::)?lesson(\d+)_cellIndex$/,
  /^lesson(\d+)_progress$/,
  /^lesson_progress_v2::fr::(\d+)$/,
];

/** Номер урока для ключа, который переносит миграция; null — ключ не урочный. */
export function reseedLessonNumber(key: string): number | null {
  for (const re of RESEED_LESSON_KEY_RES) {
    const match = re.exec(key);
    if (match) return Number(match[1]);
  }
  return null;
}

export type ProgressReseedDecision =
  | 'reseeded'
  | 'not_wiped'
  | 'nothing_missing'
  | 'empty_snapshot'
  | 'rate_limited'
  | 'not_authoritative'
  | 'user_missing';

export type ProgressReseedPlan = Readonly<{
  decision: ProgressReseedDecision;
  userUpdate: Readonly<{ progress: ProgressMap; progressReseedAt: unknown }> | null;
  keys: readonly string[];
  // Сколько урочных ключей снимка отброшено из-за номера вне 1..maxLessonId (для лога).
  outOfRangeKeys?: number;
}>;

/** Снимок клиента: только строки/числа/булевы, с лимитами. Не объект → пустой снимок (как у миграции). */
export function normalizeReseedSnapshot(raw: unknown): ProgressMap {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const entries = Object.entries(raw as Record<string, unknown>);
  if (entries.length > PROGRESS_RESEED_LIMITS.maxKeys) throw new HttpsError('invalid-argument', 'snapshot_too_large');
  const out: ProgressMap = {};
  let total = 0;
  for (const [key, value] of entries) {
    if (key.length === 0 || key.length > PROGRESS_RESEED_LIMITS.maxKeyChars) throw new HttpsError('invalid-argument', 'snapshot_too_large');
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
    const size = typeof value === 'string' ? value.length : String(value).length;
    if (size > PROGRESS_RESEED_LIMITS.maxValueChars) throw new HttpsError('invalid-argument', 'snapshot_too_large');
    total += key.length + size;
    if (total > PROGRESS_RESEED_LIMITS.maxTotalChars) throw new HttpsError('invalid-argument', 'snapshot_too_large');
    out[key] = value;
  }
  return out;
}

/** progressReseedAt: Timestamp / число мс / ISO-строка → мс; иначе null (отметки нет). */
export function readReseedAtMs(raw: unknown): number | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw === 'string') {
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (raw && typeof raw === 'object' && typeof (raw as { toMillis?: unknown }).toMillis === 'function') {
    const ms = (raw as { toMillis: () => number }).toMillis();
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

export function planProgressReseed(input: Readonly<{
  snapshot: ProgressMap;
  existing: ProgressMap;
  userExists: boolean;
  serverAuthoritative: boolean;
  lastReseedAtMs: number | null;
  nowMs: number;
  serverTimestamp: () => unknown;
}>): ProgressReseedPlan {
  if (!input.userExists) return { decision: 'user_missing', userUpdate: null, keys: [] };
  // зачем: затирание 8G возможно только у аккаунтов, прошедших миграцию снимка (маркер
  // progressServerAuthoritative). Остальным переносить прогресс положено исходной миграцией.
  if (!input.serverAuthoritative) return { decision: 'not_authoritative', userUpdate: null, keys: [] };
  // зачем (ревью 8I, C-1): сервер сам проверяет признак затирания. Хотя бы один урочный ключ в
  // облаке (любой номер, любое значение, даже null) → облако не затёрто, дозаливки нет. Так
  // дозаливка однократна по существу: после первой записи облако уже «не затёрто».
  if (Object.keys(input.existing).some((key) => reseedLessonNumber(key) !== null)) {
    return { decision: 'not_wiped', userUpdate: null, keys: [] };
  }
  // Отметка в будущем (рассинхрон часов) тоже считается «моложе суток» — безопасная сторона.
  if (input.lastReseedAtMs !== null && input.nowMs - input.lastReseedAtMs < PROGRESS_RESEED_LIMITS.minIntervalMs) {
    return { decision: 'rate_limited', userUpdate: null, keys: [] };
  }
  if (Object.keys(input.snapshot).length === 0) return { decision: 'empty_snapshot', userUpdate: null, keys: [] };
  const missing: ProgressMap = {};
  let outOfRangeKeys = 0;
  for (const [key, value] of Object.entries(input.snapshot)) {
    const lesson = reseedLessonNumber(key);
    if (lesson !== null && (lesson < 1 || lesson > PROGRESS_RESEED_LIMITS.maxLessonId)) {
      outOfRangeKeys += 1;
      continue;
    }
    // «Только отсутствующие» здесь уже гарантировано: проверка not_wiped выше пропускает лишь
    // облако без единого урочного ключа, а patch состоит только из урочных ключей. Отдельный
    // фильтр по existing был бы мёртвым кодом (мутация M1 после C-1 стала эквивалентной).
    missing[key] = value;
  }
  // existing = {} — patch только из отсутствующих ключей (buildMigrationPatch выдаёт лишь ключи
  // своего входа); фильтр значений тот же, что у миграции.
  const patch = buildMigrationPatch(missing, {});
  const keys = Object.keys(patch).sort();
  if (keys.length === 0) return { decision: 'nothing_missing', userUpdate: null, keys: [], outOfRangeKeys };
  return { decision: 'reseeded', userUpdate: { progress: patch, progressReseedAt: input.serverTimestamp() }, keys, outOfRangeKeys };
}

type DocRef = { path: string };
type ReseedTransaction = {
  get: (ref: DocRef) => Promise<{ exists: boolean; data: () => Record<string, unknown> | undefined }>;
  set: (ref: DocRef, data: Record<string, unknown>, options: { merge: true }) => unknown;
};

export type ProgressReseedDeps = Readonly<{
  db: Readonly<{
    collection: (name: string) => { doc: (id: string) => DocRef };
    runTransaction: <T>(fn: (tx: ReseedTransaction) => Promise<T>) => Promise<T>;
  }>;
  resolveStableUid: (authUid: string, requestedStableId: unknown) => Promise<string>;
  now: () => Date;
  serverTimestamp: () => unknown;
  log: (line: string) => void;
}>;

export type ProgressReseedResult = Readonly<{
  ok: true;
  reseeded: boolean;
  reason: ProgressReseedDecision;
  keys: string[];
}>;

function asProgress(data: Record<string, unknown> | undefined): ProgressMap {
  const raw = data?.progress;
  return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as ProgressMap : {};
}

export async function handleProgressReseedMissing(
  request: Readonly<{ auth?: { uid?: string } | null; data?: unknown }>,
  deps: ProgressReseedDeps,
): Promise<ProgressReseedResult> {
  const authUid = request.auth?.uid;
  if (!authUid) {
    deps.log('[PROGRESS-RESEED] decision=unauthenticated');
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const data = (request.data && typeof request.data === 'object' ? request.data : {}) as Record<string, unknown>;
  let snapshot: ProgressMap;
  try {
    // Лимиты проверяются ДО любых чтений Firestore: большой снимок не стоит ни одного чтения.
    snapshot = normalizeReseedSnapshot(data.progress);
  } catch (error) {
    deps.log(`[PROGRESS-RESEED] decision=invalid_snapshot reason=${error instanceof HttpsError ? error.message : 'unknown'}`);
    throw error;
  }
  const stableUid = await deps.resolveStableUid(authUid, data.stableId);
  const userRef = deps.db.collection('users').doc(stableUid); // guard-ok: точечный doc(), не запрос коллекции
  const nowMs = deps.now().getTime();

  const plan = await deps.db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const root = userSnap.data();
    const existing = asProgress(root);
    const txPlan = planProgressReseed({
      snapshot,
      existing,
      userExists: userSnap.exists,
      serverAuthoritative: root?.progressServerAuthoritative === true,
      lastReseedAtMs: readReseedAtMs(root?.progressReseedAt),
      nowMs,
      serverTimestamp: deps.serverTimestamp,
    });
    // Лог решения без uid: ветка и размеры (правило владельца «логи на каждом решении»).
    deps.log(`[PROGRESS-RESEED] decision=${txPlan.decision} snapshot_keys=${Object.keys(snapshot).length} `
      + `existing_keys=${Object.keys(existing).length} written_keys=${txPlan.keys.length} out_of_range_keys=${txPlan.outOfRangeKeys ?? 0} `
      + `user_exists=${userSnap.exists} server_auth=${root?.progressServerAuthoritative === true}`);
    if (txPlan.userUpdate !== null) {
      // зачем литерал: перепись корневых полей 8A (accounts_v2_root_fields_code_census) видит
      // имена полей только в литерале. progress здесь всегда непустой → маска progress.<ключ>.
      tx.set(userRef, { progress: txPlan.userUpdate.progress, progressReseedAt: txPlan.userUpdate.progressReseedAt }, { merge: true });
    }
    return txPlan;
  });

  if (plan.decision === 'rate_limited') throw new HttpsError('resource-exhausted', 'rate_limited');
  return { ok: true, reseeded: plan.decision === 'reseeded', reason: plan.decision, keys: [...plan.keys] };
}

function defaultDeps(): ProgressReseedDeps {
  const db = admin.firestore();
  return {
    db: db as unknown as ProgressReseedDeps['db'],
    resolveStableUid: (authUid, requestedStableId) => resolveStableUidForAuth(db, authUid, requestedStableId, {
      requireKnownIdentity: true,
    }),
    now: () => new Date(),
    serverTimestamp: () => admin.firestore.FieldValue.serverTimestamp(),
    log: (line) => console.log(line),
  };
}

export const progressReseedMissing = onCall(HOT_CALLABLE_OPTIONS, async (request) => (
  handleProgressReseedMissing(request, defaultDeps())
));

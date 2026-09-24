import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { resolveStableUidForAuth } from './auth_identity';
import { HOT_CALLABLE_OPTIONS } from './callable_options';
import { getWeekKey, isoDateUtc } from './progress_events';
import {
  SPIRE_CONFIG_COLLECTION,
  SPIRE_CONFIG_DOC_ID,
  spireConfigStatus,
  type SpireConfigStatus,
} from './spire_config_contract';
import {
  SPIRE_GROUPS_COLLECTION,
  clampSpireTier,
  resolveSpireTier,
  savedSpireGroupId,
  spireMemberStepsUpdate,
} from './spire_groups';
import {
  SPIRE_PROGRESS_FIELD,
  SPIRE_REPORT_MAX_BATCH,
  spireEvaluateBatch,
  spireIsLang,
  spireNormalizeReport,
  spireParseWeekProgress,
  spireSerializeWeekProgress,
  spireWeekStartMsFromDate,
  type SpireLang,
} from './spire_progress_contract';

/**
 * spireReportSteps — приём ПАЧКИ отчётов о ступенях Шпиля (PM-275).
 *
 * зачем: владелец (TOWER_CONTRACT.md §5–§6, D56) — отчёт уходит пачкой при уходе
 * с экрана/в фон или раз в 5 минут, а не после каждой ступени. На пачку —
 * ОДНА транзакция: чтения users/{uid} + leaderboard/{uid} + своя комната
 * spire_groups (PM-277), записи — `progress.spire_week_v1` и своя строка
 * комнаты (TOWER_CONTRACT §5: «1 запись в группу + 1 в progress»), и только
 * если хоть что-то принято. Конфиг и отпечатки пакетов кэшируются в памяти
 * инстанса, поэтому обычный вызов не тратит на них чтений.
 *
 * Отказ по правдоподобию — не исключение: клиент получает честный ответ по
 * каждой строке (`results[]`), локальный прогресс на устройстве НЕ стирается
 * (TOWER_CONTRACT §5). Каждая отказанная строка пишется в лог с причиной
 * (правило «сперва логи»), префикс [SPIRE-REPORT].
 *
 * App Check НЕ требуется — запломбирован владельцем 2026-08-17, опции
 * HOT_CALLABLE_OPTIONS берутся как есть.
 */

const LOG = '[SPIRE-REPORT]';
const CONFIG_CACHE_MS = 5 * 60_000;
const PACK_HASH_CACHE_MS = 10 * 60_000;

type CachedConfig = { atMs: number; status: SpireConfigStatus };
let configCache: CachedConfig | null = null;
const packHashCache = new Map<string, { atMs: number; hash: string | null }>();

function log(event: string, fields: Record<string, unknown>): void {
  console.log(JSON.stringify({ tag: LOG, event, ...fields }));
}

function warn(event: string, fields: Record<string, unknown>): void {
  console.warn(JSON.stringify({ tag: LOG, event, ...fields }));
}

async function loadSpireConfigCached(nowMs: number): Promise<SpireConfigStatus> {
  if (configCache && nowMs - configCache.atMs < CONFIG_CACHE_MS) return configCache.status;
  // guard-ok: точечное чтение одного документа по id, не листинг коллекции; кэш 5 мин.
  const snap = await admin.firestore().collection(SPIRE_CONFIG_COLLECTION).doc(SPIRE_CONFIG_DOC_ID).get();
  const status = spireConfigStatus(snap.exists ? snap.data() : null);
  configCache = { atMs: nowMs, status };
  log('config_loaded', { exists: status.exists, valid: status.valid, live: status.liveForPlayers, integrity: status.config.integrity });
  return status;
}

/**
 * Ожидаемый отпечаток пакета недели. Пакет лежит в Storage
 * `spire_packs/{lang}/{tier}/{weekKey}.json` (TOWER_CONTRACT §3); отпечаток
 * берётся из его customMetadata.packHash — одно чтение метаданных, без
 * скачивания файла и без Firestore.
 *
 * ⚠️ Договор для PM-272 (сборка пакета): крон обязан класть `packHash` в
 * customMetadata файла. Пока пакета нет — null → отказ `pack_unknown`.
 */
async function resolveExpectedPackHash(lang: SpireLang, tier: number, weekKey: string, nowMs: number): Promise<string | null> {
  const key = `${lang}/${tier}/${weekKey}`;
  const cached = packHashCache.get(key);
  if (cached && nowMs - cached.atMs < PACK_HASH_CACHE_MS) return cached.hash;
  let hash: string | null = null;
  try {
    const [metadata] = await admin.storage().bucket().file(`spire_packs/${key}.json`).getMetadata();
    const raw = (metadata?.metadata as Record<string, unknown> | undefined)?.packHash;
    hash = typeof raw === 'string' && raw.length > 0 ? raw : null;
    if (!hash) warn('pack_hash_missing_in_metadata', { key });
  } catch (error) {
    // guard-ok: нет файла пакета — не падение функции, а честный отказ pack_unknown.
    warn('pack_metadata_unavailable', { key, reason: error instanceof Error ? error.message : String(error) });
    hash = null;
  }
  packHashCache.set(key, { atMs: nowMs, hash });
  return hash;
}

export const spireReportSteps = onCall(HOT_CALLABLE_OPTIONS, async (request) => {
  const startedAt = Date.now();
  const authUid = request.auth?.uid;
  if (!authUid) {
    warn('reject_unauthenticated', {});
    throw new HttpsError('unauthenticated', 'auth_required');
  }
  const data = (request.data ?? {}) as Record<string, unknown>;
  const lang = data.lang;
  if (!spireIsLang(lang)) {
    warn('reject_bad_lang', { authUid, lang: typeof lang === 'string' ? lang.slice(0, 8) : typeof lang });
    throw new HttpsError('invalid-argument', 'bad_spire_lang');
  }
  const reports = Array.isArray(data.reports) ? data.reports : [];
  if (reports.length === 0 || reports.length > SPIRE_REPORT_MAX_BATCH) {
    warn('reject_bad_batch_size', { authUid, lang, size: reports.length });
    throw new HttpsError('invalid-argument', 'bad_spire_batch_size');
  }

  const db = admin.firestore();
  let stableUid: string;
  try {
    stableUid = await resolveStableUidForAuth(db, authUid, data.stableId, {
      requireKnownIdentity: true,
      repairLinks: false,
    });
  } catch (error) {
    // guard-ok: без опознания писать некуда; причина обязана быть видна в логе.
    warn('reject_identity', {
      authUid,
      lang,
      reason: error instanceof HttpsError ? `${error.code}:${error.message}` : String(error),
    });
    throw error;
  }

  const now = new Date();
  const nowMs = now.getTime();
  const serverWeekKey = getWeekKey(isoDateUtc(now));
  const weekStartMs = spireWeekStartMsFromDate(now);
  const config = await loadSpireConfigCached(nowMs);
  if (!config.liveForPlayers) {
    // Шпиль выключен в админке: отчёты не выбрасываем — клиент держит очередь и
    // дошлёт, когда включат. Это не отказ по правдоподобию.
    warn('spire_not_live', { stableUid, lang, exists: config.exists, valid: config.valid, enabled: config.config.enabled });
    return { ok: false, reason: 'spire_not_live', weekKey: serverWeekKey, lang, results: [] };
  }

  const tiers = new Set<number>();
  for (const raw of reports) {
    const r = spireNormalizeReport(raw);
    if (r && r.weekKey === serverWeekKey) tiers.add(r.tier);
  }
  const expectedPackHashByTier: Record<number, string | null> = {};
  // guard-ok: не запись Firestore — чтение метаданных Storage, обычно 1 шпиль на пачку, кэш 10 мин.
  for (const tier of tiers) {
    expectedPackHashByTier[tier] = await resolveExpectedPackHash(lang, tier, serverWeekKey, nowMs);
  }

  // guard-ok: точечный документ по id, не листинг коллекции.
  const userRef = db.collection('users').doc(stableUid);
  // guard-ok: точечные документы по id, не листинг коллекции.
  const lbRef = db.collection('leaderboard').doc(stableUid);
  const outcome = await db.runTransaction(async (tx) => {
    const [snap, lbSnap] = await Promise.all([tx.get(userRef), tx.get(lbRef)]);
    const lbData = lbSnap.data();
    // Своя комната недели (PM-277). Нет комнаты — очки идут только в progress;
    // в комнату они попадут, когда человек в неё войдёт (spireJoinRoom) и
    // пришлёт следующую пачку: строка комнаты берёт итог из progress.
    // Чтение комнаты — +1 на пачку, не на ступень.
    const groupId = savedSpireGroupId(lbData, lang, serverWeekKey);
    const groupRef = groupId ? db.collection(SPIRE_GROUPS_COLLECTION).doc(groupId) : null;
    const groupSnap = groupRef ? await tx.get(groupRef) : null;
    const group = groupSnap?.exists ? groupSnap.data() : undefined;
    const roomValid = Boolean(group && group.weekId === serverWeekKey && group.lang === lang && group.members?.[stableUid]);
    if (groupId && !roomValid) {
      warn('room_invalid', { stableUid, lang, groupId, exists: groupSnap?.exists ?? false, weekId: group?.weekId ?? null, groupLang: group?.lang ?? null });
    }
    // Шпиль по серверу: комната недели главнее, иначе leaderboard.spireTiers (Гранит по умолчанию).
    const expectedTier = roomValid ? clampSpireTier(group?.tier) : resolveSpireTier(lbData, lang);
    const userData = snap.data();
    if (!snap.exists || userData?.identityHidden === true || userData?.levelSpinMergePending === true) {
      warn('reject_identity_transition', { stableUid, lang, exists: snap.exists });
      throw new HttpsError('failed-precondition', 'spire_identity_transition_pending');
    }
    const progress = (userData?.progress && typeof userData.progress === 'object') ? userData.progress as Record<string, unknown> : {};
    const rawField = progress[SPIRE_PROGRESS_FIELD];
    const weekProgress = spireParseWeekProgress(rawField);
    if (typeof rawField === 'string' && rawField.length > 0 && Object.keys(weekProgress).length === 0) {
      warn('progress_field_unreadable', { stableUid, lang, length: rawField.length });
    }
    const evaluation = spireEvaluateBatch({
      lang,
      existing: weekProgress[lang] ?? null,
      reports,
      serverNowMs: nowMs,
      serverWeekKey,
      weekStartMs,
      integrity: config.config.integrity,
      expectedPackHashByTier,
      expectedTier,
    });
    if (evaluation.changed) {
      const nextProgress = { ...weekProgress, [lang]: evaluation.record };
      // guard-ok: запись внутри runTransaction — её ошибка роняет await выше, молча не теряется.
      tx.set(userRef, {
        progress: { [SPIRE_PROGRESS_FIELD]: spireSerializeWeekProgress(nextProgress) },
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }
    // зачем: строка комнаты догоняет progress и без новых принятых ступеней —
    // если человек вошёл в комнату позже, чем отчитался, следующая же пачка
    // (даже из одних duplicate) поднимет его строку. spireMemberStepsUpdate
    // вернёт null, когда поднимать нечего, — тогда записи нет.
    if (roomValid && groupRef) {
      const current = (group?.members as Record<string, { steps?: unknown }> | undefined)?.[stableUid];
      const roomPatch = spireMemberStepsUpdate(stableUid, current, evaluation.record, nowMs);
      if (roomPatch) {
        // guard-ok: запись внутри runTransaction; точечный путь members.<uid> — только update.
        tx.update(groupRef, roomPatch);
      } else if (evaluation.changed) {
        log('room_not_raised', { stableUid, lang, groupId, roomSteps: current?.steps ?? null, serverSteps: evaluation.record.steps });
      }
    }
    return { ...evaluation, groupId: roomValid ? groupId : null, expectedTier };
  });

  for (const row of outcome.results) {
    if (row.verdict === 'rejected') {
      warn('report_rejected', { stableUid, lang, reportId: row.reportId, reason: row.reason, integrity: config.config.integrity });
    }
  }
  log('batch_done', {
    stableUid,
    lang,
    weekKey: serverWeekKey,
    size: reports.length,
    acceptedPassed: outcome.acceptedPassed,
    acceptedFailed: outcome.acceptedFailed,
    duplicates: outcome.results.filter((r) => r.verdict === 'duplicate').length,
    rejected: outcome.results.filter((r) => r.verdict === 'rejected').length,
    wrote: outcome.changed,
    serverSteps: outcome.record.steps,
    groupId: outcome.groupId,
    expectedTier: outcome.expectedTier,
    tookMs: Date.now() - startedAt,
  });

  return {
    ok: true,
    weekKey: serverWeekKey,
    lang,
    serverSteps: outcome.record.steps,
    reachedAtMs: outcome.record.reachedAtMs,
    totalMs: outcome.record.totalMs,
    results: outcome.results,
  };
});

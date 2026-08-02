import * as admin from 'firebase-admin';
import { onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from '../callable_options';
import { requireBusinessTierBackfillAccess, requireBusinessTierReadAccess, type CallableRequestLike } from './business_tier_access';
import { runBackfillStep } from './business_tier_backfill_runner';
import { downsampleBusinessHistory } from './business_tier_downsampling';
import { MAX_HISTORY_POINTS_PER_READ, readPeakTier, readRecentHistory, writePeakTier } from './business_tier_history_store';
import { buildBusinessTierSnapshot } from './business_tier_snapshot';
import { fetchActiveUserCount } from './app_tier_reader';

/**
 * Два входа owner-facing раздела «Стадия роста бизнеса».
 *
 * зачем ДВА разных гейта (business_tier_access.ts): читать панель может тот
 * же круг, что и общий свод Джарвиса (включая analyst), но запускать
 * бэкфилл — только owner/admin: это тяжёлый разовый пересчёт, стоящий
 * реальных денег на чтениях Firestore.
 *
 * Firebase-экономия чтения: один запрос истории с лимитом + один .count()
 * активных + один .count() тотала. MRR не требует отдельного запроса —
 * выводится из уже прочитанной истории (business_tier_snapshot.ts).
 */

const REGION = 'us-central1';

const READ_OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 30,
  memory: '256MiB' as const,
});

/**
 * зачем 9 минут: бэкфилл продолжаемый, но за один вызов проходит столько
 * страниц, сколько успеет — чем больше успел, тем меньше кликов владельцу.
 */
const BACKFILL_OPTIONS = Object.freeze({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 540,
  memory: '512MiB' as const,
});

/** Потолок точек истории за один ответ панели — график всё равно даунсемплится. */
const HISTORY_READ_LIMIT = Math.min(1_100, MAX_HISTORY_POINTS_PER_READ); // ~3 года дневных точек

async function readTotalUsers(db: FirebaseFirestore.Firestore): Promise<number> {
  try {
    // guard-ok: .count() — СЕРВЕРНАЯ агрегация, документы не выкачиваются и
    // тарифицируется как одно чтение (тот же приём, что admin_compliance.ts /
    // app_tier_reader.ts). limit() здесь был бы не экономией, а ошибкой —
    // он усёк бы сам результат подсчёта.
    const snap = await db.collection('users').count().get();
    const count = snap.data().count;
    return typeof count === 'number' && Number.isFinite(count) && count >= 0 ? count : 0;
  } catch {
    // Ноль тотала честнее выдуманного числа: тир от этого только занизится,
    // а панель покажет отсутствие данных, а не оптимистичную ложь.
    return 0;
  }
}

export const jarvisGetBusinessTier = onCall(READ_OPTIONS, async (request: CallableRequestLike) => {
  requireBusinessTierReadAccess(request);
  const db = admin.firestore();
  const nowMs = Date.now();

  const [history, activeResult, totalUsers, storedPeakTier] = await Promise.all([
    readRecentHistory({ db, limit: HISTORY_READ_LIMIT }),
    fetchActiveUserCount({ collection: db.collection('users'), nowMs }),
    readTotalUsers(db),
    readPeakTier(db),
  ]);

  const snapshot = buildBusinessTierSnapshot({
    history,
    totalUsers,
    activeUsers: activeResult.count,
    storedPeakTier,
    nowMs,
  });

  // зачем писать пик здесь: панель — единственное место, где считается
  // текущий тир; без записи храповик забывал бы достигнутое между вызовами.
  // Запись поднимает пик только вверх (writePeakTier сам это гарантирует).
  if (snapshot.hasData) {
    await writePeakTier(db, snapshot.currentTier, nowMs).catch(() => undefined);
  }

  return {
    ok: true,
    generatedAtMs: nowMs,
    snapshot,
    history: downsampleBusinessHistory(history, nowMs),
  };
});

export const jarvisRunBusinessTierBackfill = onCall(BACKFILL_OPTIONS, async (request: CallableRequestLike) => {
  requireBusinessTierBackfillAccess(request);
  const db = admin.firestore();
  const result = await runBackfillStep({ db, nowMs: Date.now() });
  return { ok: true, ...result };
});

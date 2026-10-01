/**
 * PM-112/113: счётчик уникальных текущих сохранений ролика.
 *
 * Связь «аккаунт ↔ ролик» лежит в `users/{stableUid}/video_favorites/{videoId}`
 * (id = videoId → один человек учитывается один раз). Агрегат НЕ инкрементится
 * клиентом и не ведётся триггером: сервер считает `count()` по collection group
 * и кладёт итог в `video_save_counts/public`. Поэтому:
 *   - клиент не может назначить число (правила запрещают запись агрегата);
 *   - убрал из избранного / удалил аккаунт (рекурсивный снос users/{uid}) —
 *     связи нет, следующий пересчёт уменьшает агрегат;
 *   - повтор события не меняет агрегат дважды: считается состояние, а не события.
 *
 * Пересчёт ленивый: клиент присылает ≤100 показанных роликов, сервер пересчитывает
 * только те, чьей записи нет или ей ≥ 6 ч. Без cron и без realtime-слушателей.
 *
 * Стоимость (тарифы Firestore): count() = 1 чтение на каждые 1000 записей индекса
 * (минимум 1). Пересчёт ролика ≈ 1 чтение; 100 роликов ≈ 100 чтений и 1 запись,
 * не чаще раза в 6 ч на ролик = ≤ 400 чтений/сутки на 100 роликов независимо от
 * числа людей. Вызов с только свежими роликами = 1 чтение документа агрегата.
 */
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';

const REGION = 'us-central1';
export const VIDEO_SAVE_COUNTS_DOC = 'video_save_counts/public';
export const VIDEO_FAVORITES_GROUP = 'video_favorites';
export const VIDEO_SAVE_COUNTS_TTL_MS = 6 * 60 * 60 * 1000;
export const VIDEO_SAVE_COUNTS_MAX_IDS = 100;
const VIDEO_ID_RE = /^[0-9A-Za-z_-]{11}$/;
const LOG = '[PM112-COUNTS]';

export type VideoSaveCountEntry = { n: number; atMs: number };

export function normalizeVideoIds(value: unknown): string[] {
  if (!Array.isArray(value)) throw new HttpsError('invalid-argument', 'video_ids_required');
  const ids = Array.from(new Set(value.map((item) => String(item ?? '').trim()).filter((id) => VIDEO_ID_RE.test(id))));
  if (ids.length > VIDEO_SAVE_COUNTS_MAX_IDS) throw new HttpsError('invalid-argument', 'too_many_video_ids');
  return ids;
}

export function staleIds(
  counts: Record<string, unknown> | undefined,
  ids: readonly string[],
  nowMs: number,
): string[] {
  return ids.filter((id) => {
    const entry = counts?.[id] as { atMs?: unknown } | undefined;
    const atMs = Number(entry?.atMs);
    return !Number.isFinite(atMs) || nowMs - atMs >= VIDEO_SAVE_COUNTS_TTL_MS;
  });
}

export type RefreshDeps = {
  readCounts: () => Promise<Record<string, unknown> | undefined>;
  countFavorites: (videoId: string) => Promise<number>;
  writeCounts: (patch: Record<string, VideoSaveCountEntry>) => Promise<void>;
  nowMs: number;
};

/** Ядро без Firebase: что пересчитать, как посчитать, что записать. */
export async function refreshVideoSaveCountsCore(ids: readonly string[], deps: RefreshDeps): Promise<{
  requested: number;
  recomputed: number;
  counts: Record<string, VideoSaveCountEntry>;
}> {
  const current = await deps.readCounts();
  const stale = staleIds(current, ids, deps.nowMs);
  if (stale.length === 0) {
    console.log(`${LOG} всё свежо: ${ids.length} роликов, пересчёта нет`);
    return { requested: ids.length, recomputed: 0, counts: {} };
  }
  const patch: Record<string, VideoSaveCountEntry> = {};
  // Пачками по 10: count() дешёвый, но бить 100 запросов разом незачем.
  for (let index = 0; index < stale.length; index += 10) {
    const chunk = stale.slice(index, index + 10);
    const values = await Promise.all(chunk.map(async (id) => {
      try {
        return Math.max(0, Math.floor(await deps.countFavorites(id)));
      } catch (error) {
        console.warn(`${LOG} count() для ${id} не удался — оставляю прежнее значение: ${String(error)}`);
        return null;
      }
    }));
    chunk.forEach((id, offset) => {
      const value = values[offset];
      if (value !== null) patch[id] = { n: value, atMs: deps.nowMs };
    });
  }
  if (Object.keys(patch).length > 0) await deps.writeCounts(patch);
  console.log(`${LOG} пересчитано ${Object.keys(patch).length} из ${stale.length} устаревших (запрошено ${ids.length})`);
  return { requested: ids.length, recomputed: Object.keys(patch).length, counts: patch };
}

export const refreshVideoSaveCounts = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 30,
  memory: '256MiB',
  maxInstances: 10,
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'auth_required');
  const ids = normalizeVideoIds(request.data?.videoIds);
  if (ids.length === 0) return { ok: true, requested: 0, recomputed: 0 };
  const db = admin.firestore();
  const ref = db.doc(VIDEO_SAVE_COUNTS_DOC);
  const result = await refreshVideoSaveCountsCore(ids, {
    nowMs: Date.now(),
    readCounts: async () => {
      const snap = await ref.get();
      return (snap.data()?.counts ?? undefined) as Record<string, unknown> | undefined;
    },
    countFavorites: async (videoId) => {
      // guard-ok: count() — агрегация на сервере, документы не выкачиваются (1 чтение на 1000 записей).
      const agg = await db.collectionGroup(VIDEO_FAVORITES_GROUP).where('videoId', '==', videoId).count().get();
      return agg.data().count;
    },
    writeCounts: async (patch) => {
      // merge по вложенной карте: параллельный пересчёт других роликов не затирается.
      await ref.set({ counts: patch, updatedAtMs: Date.now() }, { merge: true });
    },
  });
  return { ok: true, requested: result.requested, recomputed: result.recomputed };
});

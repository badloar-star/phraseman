// ═══════════════════════════════════════════════════════════════════════════
// video_save_counts.ts — счётчик уникальных сохранений ролика на клиенте
// (PM-112/113). Без realtime на каждой карточке.
//
// Данные: `video_save_counts/public` = { counts: { [videoId]: { n, atMs } } } —
// пишет ТОЛЬКО сервер (functions/src/video_save_counts.ts, count() по связям
// users/{uid}/video_favorites). Клиент число не назначает (PM-112-A3).
//
// Чтение: один документ на весь каталог, кэш в памяти и на диске 6 ч (PM-113-A1).
// Если для показанных роликов агрегат устарел/отсутствует — один вызов
// refreshVideoSaveCounts на ≤100 id, тоже не чаще раза в 6 ч с устройства.
// Своё нажатие видно сразу через displayVideoSaveCount (поправка ±1, A3).
// ═══════════════════════════════════════════════════════════════════════════

const LOG = '[PM113-COUNTS]';
export const VIDEO_SAVE_COUNTS_TTL_MS = 6 * 60 * 60 * 1000;
export const VIDEO_SAVE_COUNTS_MAX_IDS = 100;
const DISK_KEY = 'video_save_counts_cache_v1';

export type VideoSaveCountEntry = Readonly<{ n: number; atMs: number }>;
export type VideoSaveCounts = Readonly<Record<string, VideoSaveCountEntry>>;

type CachedCounts = Readonly<{ fetchedAtMs: number; counts: VideoSaveCounts }>;

export type VideoSaveCountsDeps = {
  readDoc: () => Promise<unknown | null>;
  refresh: (videoIds: readonly string[]) => Promise<unknown>;
  storage: { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void> };
  now: () => number;
};

/** Разбор документа агрегата: мусорные записи отбрасываются, число — целое ≥ 0. */
export function parseVideoSaveCounts(raw: unknown): VideoSaveCounts {
  const counts = raw && typeof raw === 'object' ? (raw as { counts?: unknown }).counts : null;
  if (!counts || typeof counts !== 'object') return {};
  const out: Record<string, VideoSaveCountEntry> = {};
  for (const [videoId, value] of Object.entries(counts as Record<string, unknown>)) {
    if (!/^[0-9A-Za-z_-]{11}$/.test(videoId) || !value || typeof value !== 'object') continue;
    const n = Number((value as { n?: unknown }).n);
    const atMs = Number((value as { atMs?: unknown }).atMs);
    if (!Number.isFinite(n) || !Number.isFinite(atMs)) continue;
    out[videoId] = { n: Math.max(0, Math.floor(n)), atMs };
  }
  return out;
}

/** Какие из показанных роликов надо пересчитать: нет записи или ей больше 6 ч. */
export function staleVideoSaveCountIds(counts: VideoSaveCounts, videoIds: readonly string[], nowMs: number): string[] {
  const unique = Array.from(new Set(videoIds.filter((id) => /^[0-9A-Za-z_-]{11}$/.test(id))));
  return unique
    .filter((id) => !counts[id] || nowMs - counts[id].atMs >= VIDEO_SAVE_COUNTS_TTL_MS)
    .slice(0, VIDEO_SAVE_COUNTS_MAX_IDS);
}

export function createVideoSaveCountsClient(deps: VideoSaveCountsDeps) {
  let memory: CachedCounts | null = null;
  let inFlight: Promise<VideoSaveCounts> | null = null;
  /** Когда этот телефон последний раз просил пересчёт конкретного ролика. */
  const refreshRequestedAt = new Map<string, number>();

  const readDisk = async (): Promise<CachedCounts | null> => {
    try {
      const raw = await deps.storage.getItem(DISK_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { fetchedAtMs?: unknown; counts?: unknown };
      if (typeof parsed?.fetchedAtMs !== 'number') return null;
      return { fetchedAtMs: parsed.fetchedAtMs, counts: parseVideoSaveCounts(parsed) };
    } catch (error) {
      console.warn(`${LOG} кэш на диске не читается: ${String(error)}`);
      return null;
    }
  };

  const writeDisk = async (value: CachedCounts) => {
    try {
      await deps.storage.setItem(DISK_KEY, JSON.stringify(value));
    } catch (error) {
      console.warn(`${LOG} кэш на диск не записан: ${String(error)}`);
    }
  };

  const fetchDoc = async (): Promise<CachedCounts> => {
    const raw = await deps.readDoc();
    const next = { fetchedAtMs: deps.now(), counts: parseVideoSaveCounts(raw) };
    memory = next;
    await writeDisk(next);
    return next;
  };

  /** Мгновенно: что уже есть в памяти (для первого кадра без ожидания). */
  const peek = (): VideoSaveCounts => memory?.counts ?? {};

  /**
   * Счётчики для показанных роликов. Сеть: документ — не чаще раза в 6 ч;
   * пересчёт — только для устаревших id и не чаще раза в 6 ч на id с устройства.
   */
  const get = (videoIds: readonly string[]): Promise<VideoSaveCounts> => {
    if (inFlight) return inFlight;
    inFlight = (async () => {
      const now = deps.now();
      if (!memory) memory = await readDisk();
      let current = memory;
      try {
        if (!current || now - current.fetchedAtMs >= VIDEO_SAVE_COUNTS_TTL_MS) {
          console.log(`${LOG} документ агрегата устарел/нет — читаю 1 документ`);
          current = await fetchDoc();
        }
        const stale = staleVideoSaveCountIds(current.counts, videoIds, now)
          .filter((id) => {
            const askedAt = refreshRequestedAt.get(id);
            return askedAt === undefined || now - askedAt >= VIDEO_SAVE_COUNTS_TTL_MS;
          });
        if (stale.length > 0) {
          // guard-ok: Map в памяти, не Firestore.
          stale.forEach((id) => refreshRequestedAt.set(id, now));
          console.log(`${LOG} пересчёт на сервере для ${stale.length} роликов`);
          await deps.refresh(stale);
          current = await fetchDoc();
        }
        return current.counts;
      } catch (error) {
        console.warn(`${LOG} счётчики не обновлены — показываю последние известные. ${String(error)}`);
        return current?.counts ?? {};
      }
    })().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  return { peek, get };
}

export type VideoSaveCountsClient = ReturnType<typeof createVideoSaveCountsClient>;

let defaultClient: VideoSaveCountsClient | null = null;

export function getVideoSaveCountsClient(): VideoSaveCountsClient {
  if (defaultClient) return defaultClient;
  defaultClient = createVideoSaveCountsClient({
    readDoc: async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const firestore = require('@react-native-firebase/firestore').default;
      const snap = await firestore().doc('video_save_counts/public').get();
      return snap.exists ? snap.data() ?? null : null;
    },
    refresh: async (videoIds) => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getApp } = require('@react-native-firebase/app');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getFunctions, httpsCallable } = require('@react-native-firebase/functions');
      const fn = httpsCallable(getFunctions(getApp(), 'us-central1'), 'refreshVideoSaveCounts');
      return (await fn({ videoIds })).data;
    },
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    storage: require('@react-native-async-storage/async-storage').default,
    now: () => Date.now(),
  });
  return defaultClient;
}

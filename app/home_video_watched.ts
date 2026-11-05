// Локальная память «видео досмотрено» для порядка ленты на Главной (слово владельца 05.11: просмотренное уходит в конец).
// зачем: никаких чтений Firestore — только AsyncStorage по аккаунту. Событие «досмотрел до конца» подключат Моменты/Ядро через markVideoWatched;
// до тех пор запись пуста и порядок источника не меняется (безопасная заглушка).
import AsyncStorage from '@react-native-async-storage/async-storage';
import { peekStableId } from './stable_id';
import type { WatchedVideoMap } from './home_video_order';

const LOG = '[HOME-VIDEO-WATCHED]';
const KEY_PREFIX = 'home_video_watched_v1';
const MAX_KEEP = 200;

function storageKey(): string | null {
  const owner = peekStableId();
  return owner ? `${KEY_PREFIX}:${owner}` : null;
}

export async function readWatchedVideos(): Promise<WatchedVideoMap> {
  const key = storageKey();
  if (!key) {
    console.log(`${LOG} read: аккаунт ещё не известен → пусто`); // guard-ok: ранний выход называет причину
    return {};
  }
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, number> = {};
    for (const [id, at] of Object.entries(parsed as Record<string, unknown>)) if (typeof at === 'number' && Number.isFinite(at)) out[id] = at;
    return out;
  } catch (error: unknown) {
    console.warn(`${LOG} read: сбой → пусто: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину
    return {};
  }
}

/** Отметить ролик досмотренным (подключает событие «досмотрел до конца»). Идемпотентна: повтор лишь обновляет время. */
export async function markVideoWatched(videoId: string, nowMs: number = Date.now()): Promise<void> {
  const key = storageKey();
  if (!key || !videoId) {
    console.log(`${LOG} mark: пропуск key=${String(key)} videoId=${videoId}`); // guard-ok: ранний выход называет причину
    return;
  }
  try {
    const current = { ...(await readWatchedVideos()), [videoId]: nowMs };
    const entries = Object.entries(current).sort((a, b) => b[1] - a[1]).slice(0, MAX_KEEP);
    await AsyncStorage.setItem(key, JSON.stringify(Object.fromEntries(entries)));
  } catch (error: unknown) {
    console.warn(`${LOG} mark: не записано videoId=${videoId}: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину
  }
}

/**
 * Позиция «продолжить с того же места» для роликов YouTube.
 *
 * зачем (§126 п.9, 04.10): жалоба «видео не помнит позицию» — позиция жила только в живой шине для
 * подсветки фраз. Здесь — память процесса + один ключ хранилища (до 50 роликов). Хранилище не читается
 * при импорте (PM-212): первое чтение — когда плеер готов. Запись не чаще раза в 10 с на ролик и сразу
 * при паузе/закрытии. Досмотренный ролик забывается — следующее открытие с начала.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'youtube_resume_positions_v1';
const MAX_VIDEOS = 50;
const PERSIST_EVERY_MS = 10_000;
/** Меньше этого — продолжать нечего, открываем с начала. */
export const YOUTUBE_RESUME_MIN_SEC = 5;

type Entry = { sec: number; at: number };
let memory: Map<string, Entry> | null = null;
let hydrating: Promise<Map<string, Entry>> | null = null;
const lastPersistAt = new Map<string, number>();

function hydrate(): Promise<Map<string, Entry>> {
  if (memory) return Promise.resolve(memory);
  if (hydrating) return hydrating;
  hydrating = AsyncStorage.getItem(STORAGE_KEY)
    .then((raw) => {
      const map = new Map<string, Entry>();
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, Entry>;
        for (const [videoId, entry] of Object.entries(parsed ?? {})) {
          if (entry && Number.isFinite(entry.sec) && Number.isFinite(entry.at)) map.set(videoId, { sec: entry.sec, at: entry.at });
        }
      }
      return map;
    })
    .catch((error: unknown) => {
      console.warn('[VIDEO-RESUME] чтение позиций не удалось — начинаем с пустого', String((error as Error)?.message ?? error).slice(0, 120));
      return new Map<string, Entry>();
    })
    .then((map) => {
      // Записи, сделанные до окончания чтения, свежее прочитанного — не затираем их.
      for (const [videoId, entry] of memory ?? []) map.set(videoId, entry);
      memory = map;
      hydrating = null;
      return map;
    });
  return hydrating;
}

function persist(map: Map<string, Entry>): void {
  const newest = [...map.entries()].sort((a, b) => b[1].at - a[1].at).slice(0, MAX_VIDEOS);
  void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(newest))).catch((error: unknown) => {
    console.warn('[VIDEO-RESUME] запись позиций не удалась', String((error as Error)?.message ?? error).slice(0, 120));
  });
}

/** Запомнить позицию. force — сразу записать в хранилище (пауза/закрытие). */
export function rememberYoutubePosition(videoId: string, sec: number, force = false): void {
  if (!videoId || !Number.isFinite(sec) || sec < 0) return;
  memory = memory ?? new Map();
  memory.set(videoId, { sec, at: Date.now() });
  const now = Date.now();
  if (!force && now - (lastPersistAt.get(videoId) ?? 0) < PERSIST_EVERY_MS) return;
  lastPersistAt.set(videoId, now);
  void hydrate().then(persist);
}

/** Ролик досмотрен — следующее открытие с начала. */
export function forgetYoutubePosition(videoId: string): void {
  if (!videoId) return;
  memory?.delete(videoId);
  void hydrate().then((map) => { map.delete(videoId); persist(map); });
}

/** Секунда, с которой продолжить, или null (нет записи / слишком рано). */
export async function readYoutubeResumeSec(videoId: string): Promise<number | null> {
  const entry = (await hydrate()).get(videoId);
  if (!entry || entry.sec < YOUTUBE_RESUME_MIN_SEC) return null;
  return Math.floor(entry.sec);
}

/** Только для тестов. */
export function __resetYoutubeResumeForTests(): void {
  memory = null;
  hydrating = null;
  lastPersistAt.clear();
}

/* expo-router: app/ files are treated as routes and need a default export. */
export default function __YoutubeResumeRouteShim() {
  return null;
}

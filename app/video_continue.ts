/**
 * «Продолжить» в ленте раздела «Видео»: последний недосмотренный ролик и секунда, на которой человек остановился.
 *
 * зачем (владелец 11.11, макет docs/work/mockups/video-hub-2026-11-11, экран 1; «да, перестраивай»): сверху ленты —
 * одна карточка «Продолжить». Место остановки в шине плеера живёт только в памяти и 30 минут
 * (app/youtube_player_seek_bus.ts), поэтому при следующем входе в приложение показать было нечего.
 * Здесь оно хранится НА ТЕЛЕФОНЕ (AsyncStorage, по аккаунту) — в облако не уходит, чтений и записей Firestore нет.
 * Запись — одна на аккаунт: только последний недосмотренный ролик.
 *
 * Правила (чистые функции ниже, проверяются tests/video_continue.test.ts):
 *  — запоминаем, если просмотрено от 10 секунд и меньше 90 % ролика (досмотренное «продолжать» незачем);
 *  — показываем не дольше 14 дней: старое «Продолжить» выглядит как чужое.
 * Карточка — не «долг на показ»: перед показом запись сверяется с фактом (срок, досмотрен ли ролик, есть ли он в каталоге).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { peekStableId } from './stable_id';

const LOG = '[VIDEO-CONTINUE]';
const KEY_PREFIX = 'video_continue_v1';
export const VIDEO_CONTINUE_MIN_SEC = 10;
export const VIDEO_CONTINUE_DONE_RATIO = 0.9;
export const VIDEO_CONTINUE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

export type VideoContinueRecord = Readonly<{
  videoId: string;
  positionSec: number;
  /** Длительность ролика из каталога; без неё остаток и полоса не показываются. */
  durationSec?: number;
  atMs: number;
}>;

/** Стоит ли запоминать эту позицию как «продолжить» (или, наоборот, пора забыть ролик). */
export function shouldRememberVideoContinue(positionSec: number, durationSec?: number): boolean {
  if (!Number.isFinite(positionSec) || positionSec < VIDEO_CONTINUE_MIN_SEC) return false;
  if (typeof durationSec === 'number' && Number.isFinite(durationSec) && durationSec > 0 && positionSec / durationSec >= VIDEO_CONTINUE_DONE_RATIO) return false;
  return true;
}

/** Запись, пригодная к показу прямо сейчас, или null с причиной в журнале вызывающего. */
export function freshVideoContinue(record: VideoContinueRecord | null, nowMs: number): VideoContinueRecord | null {
  if (!record) return null;
  if (nowMs - record.atMs > VIDEO_CONTINUE_TTL_MS) return null;
  if (!shouldRememberVideoContinue(record.positionSec, record.durationSec)) return null;
  return record;
}

/** Сколько минут осталось (округление вверх, минимум 1) или null, если длительность неизвестна. */
export function videoContinueMinutesLeft(record: VideoContinueRecord): number | null {
  if (typeof record.durationSec !== 'number' || !Number.isFinite(record.durationSec) || record.durationSec <= 0) return null;
  return Math.max(1, Math.ceil((record.durationSec - record.positionSec) / 60));
}

export function parseVideoContinue(raw: unknown): VideoContinueRecord | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  if (typeof row.videoId !== 'string' || !row.videoId) return null;
  if (typeof row.positionSec !== 'number' || !Number.isFinite(row.positionSec) || row.positionSec < 0) return null;
  if (typeof row.atMs !== 'number' || !Number.isFinite(row.atMs)) return null;
  const durationSec = typeof row.durationSec === 'number' && Number.isFinite(row.durationSec) && row.durationSec > 0 ? row.durationSec : undefined;
  return { videoId: row.videoId, positionSec: Math.floor(row.positionSec), atMs: row.atMs, ...(durationSec === undefined ? {} : { durationSec }) };
}

// ── состояние в памяти процесса: лента читает его синхронно в первом кадре ──
let memory: VideoContinueRecord | null = null;
let memoryOwner: string | null = null;
const listeners = new Set<() => void>();

function storageKey(owner: string): string {
  return `${KEY_PREFIX}:${owner}`;
}

function publish(next: VideoContinueRecord | null, owner: string | null): void {
  memory = next;
  memoryOwner = owner;
  for (const listener of listeners) listener();
}

export function subscribeVideoContinue(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** Что показать прямо сейчас (без диска и сети). Запись другого аккаунта не отдаётся. */
export function peekVideoContinue(nowMs: number = Date.now()): VideoContinueRecord | null {
  if (memoryOwner !== peekStableId()) return null;
  return freshVideoContinue(memory, nowMs);
}

/** Поднять запись с диска в память (один раз на аккаунт; вызывается лентой при монтировании). */
export async function hydrateVideoContinue(): Promise<void> {
  const owner = peekStableId();
  if (!owner) {
    console.log(`${LOG} hydrate: аккаунт ещё не известен → пропуск`); // guard-ok: ранний выход называет причину
    return;
  }
  if (memoryOwner === owner) return;
  try {
    const raw = await AsyncStorage.getItem(storageKey(owner));
    const record = raw ? parseVideoContinue(JSON.parse(raw)) : null;
    console.log(`${LOG} hydrate ${JSON.stringify({ from: 'disk', found: !!record, videoId: record?.videoId ?? null, positionSec: record?.positionSec ?? null, fresh: !!freshVideoContinue(record, Date.now()) })}`); // guard-ok: что поднято с диска
    if (peekStableId() === owner) publish(record, owner);
  } catch (error: unknown) {
    console.warn(`${LOG} hydrate: сбой чтения → карточки не будет: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину
    if (peekStableId() === owner) publish(null, owner);
  }
}

/**
 * Запомнить место остановки (экран ролика зовёт при уходе с него). Память обновляется сразу, диск — следом.
 * Досмотренный или едва начатый ролик не запоминается; если это был ролик из записи — запись стирается.
 */
export async function rememberVideoContinue(input: Readonly<{ videoId: string; positionSec: number; durationSec?: number }>, nowMs: number = Date.now()): Promise<void> {
  const owner = peekStableId();
  if (!owner || !input.videoId) {
    console.log(`${LOG} remember: пропуск owner=${String(!!owner)} videoId=${input.videoId}`); // guard-ok: ранний выход называет причину
    return;
  }
  const keep = shouldRememberVideoContinue(input.positionSec, input.durationSec);
  if (!keep && (memoryOwner !== owner || memory?.videoId !== input.videoId)) {
    console.log(`${LOG} remember: не запоминаем ${JSON.stringify({ videoId: input.videoId, positionSec: Math.floor(input.positionSec), durationSec: input.durationSec ?? null })} — меньше ${VIDEO_CONTINUE_MIN_SEC} с или ролик досмотрен; запись другого ролика не трогаем`); // guard-ok: ранний выход называет значение
    return;
  }
  const next: VideoContinueRecord | null = keep
    ? { videoId: input.videoId, positionSec: Math.floor(input.positionSec), atMs: nowMs, ...(typeof input.durationSec === 'number' && input.durationSec > 0 ? { durationSec: input.durationSec } : {}) }
    : null;
  publish(next, owner);
  try {
    if (next) await AsyncStorage.setItem(storageKey(owner), JSON.stringify(next));
    else await AsyncStorage.removeItem(storageKey(owner));
    console.log(`${LOG} remember ${JSON.stringify({ videoId: input.videoId, positionSec: Math.floor(input.positionSec), durationSec: input.durationSec ?? null, stored: !!next })}`); // guard-ok: что записано
  } catch (error: unknown) {
    console.warn(`${LOG} remember: не записано на диск videoId=${input.videoId}: ${error instanceof Error ? error.message : String(error)}`); // guard-ok: catch называет причину (в памяти значение уже есть)
  }
}

export function __resetVideoContinueForTests(): void {
  memory = null;
  memoryOwner = null;
  listeners.clear();
}

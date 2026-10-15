/**
 * Связь «список фраз ↔ плеер» без протаскивания пропсов через экраны.
 *
 * зачем (владелец 2026-09-25): тап по фразе перематывает видео к моменту, где
 * она звучит, а текущая фраза подсвечивается. Плеер и список живут в разных
 * ветках дерева (карточка ролика, герой, Главная), поэтому общаются через этот
 * крошечный канал, привязанный к videoId. Никакой сети; хранилище — только
 * разовая отметка задания дня «Посмотреть видео» (D49) через today_tasks_store.
 *
 * Одновременно играет максимум один плеер (родители держат ровно один
 * activeVideoId), поэтому на videoId — один обработчик перемотки.
 */

import { recordTodayTaskActivity } from '../modules/today-tasks/today_tasks_store';
import { noteTodayVideoPlaybackTick } from '../modules/today-tasks/today_tasks_video_ticks';

type SeekHandler = (seconds: number) => void;
type PositionListener = (positionSec: number) => void;

const seekHandlers = new Map<string, SeekHandler>();
const positionListeners = new Map<string, Set<PositionListener>>();
/** Перемотка, запрошенная до того, как плеер этого ролика появился на экране. */
let pendingSeek: { videoId: string; seconds: number; atMs: number } | null = null;
/** Отложенная перемотка живёт недолго: иначе старый тап сработал бы через минуты. */
const PENDING_TTL_MS = 15_000;

export function registerYoutubeSeekHandler(videoId: string, handler: SeekHandler): () => void {
  seekHandlers.set(videoId, handler);
  return () => {
    if (seekHandlers.get(videoId) === handler) seekHandlers.delete(videoId);
  };
}

/** Есть ли сейчас открытый плеер этого ролика (без побочных эффектов). */
export function hasYoutubeSeekHandler(videoId: string): boolean {
  return seekHandlers.has(videoId);
}

/** true — плеер этого ролика открыт и получил команду; false — плеера нет. */
export function requestYoutubeSeek(videoId: string, seconds: number): boolean {
  const handler = seekHandlers.get(videoId);
  console.log(`[VIDEO-SEEK] запрос ${videoId} → ${seconds}s, обработчик ${handler ? 'найден' : 'НЕ найден'}`);
  if (handler) {
    pendingSeek = null;
    handler(seconds);
    return true;
  }
  pendingSeek = { videoId, seconds, atMs: Date.now() };
  console.log(`[VIDEO-SEEK] плеера ${videoId} нет — перемотка на ${seconds}s отложена до его открытия`);
  return false;
}

/** Плеер забирает отложенную перемотку, когда YouTube внутри него готов. */
export function takePendingYoutubeSeek(videoId: string): number | null {
  const pending = pendingSeek;
  if (!pending || pending.videoId !== videoId) return null;
  pendingSeek = null;
  if (Date.now() - pending.atMs > PENDING_TTL_MS) {
    console.log(`[VIDEO-SEEK] отложенная перемотка ${videoId} устарела — пропущена`);
    return null;
  }
  return pending.seconds;
}

// зачем (Ревизор d2fe02fe4, координатор 15.10): позиция ролика переживает размонтирование экрана ролика (холодный возврат к хабу ниже в стеке) — модульная карта videoId → {секунда, время}
// с TTL 30 мин, без записи на диск (между запусками приложения не сохраняем). Вход в ролик с сохранённой позицией → startSec=sec, autoPlay=false.
const RESUME_TTL_MS = 30 * 60 * 1000;
const RESUME_MAX_ENTRIES = 40;
const resumePositions = new Map<string, { sec: number; atMs: number }>();

function rememberResume(videoId: string, sec: number): void {
  if (!videoId || !Number.isFinite(sec) || sec < 0) return;
  resumePositions.delete(videoId); // порядок вставки = свежесть
  resumePositions.set(videoId, { sec, atMs: Date.now() });
  while (resumePositions.size > RESUME_MAX_ENTRIES) {
    const oldest = resumePositions.keys().next().value;
    if (oldest === undefined) break;
    resumePositions.delete(oldest);
  }
}

/** Сохранённая позиция ролика (секунды) или null, если её нет / протухла / это начало ролика. Пишет [VIDEO-RESUME]. */
export function peekYoutubeResume(videoId: string, source: string, nowMs: number = Date.now()): number | null {
  const saved = resumePositions.get(videoId);
  if (!saved) { console.log(`[VIDEO-RESUME] ${JSON.stringify({ videoId, sec: null, ageMs: null, source, result: 'none' })}`); return null; } // guard-ok: позиции нет
  const ageMs = nowMs - saved.atMs;
  if (ageMs > RESUME_TTL_MS) {
    resumePositions.delete(videoId);
    console.log(`[VIDEO-RESUME] ${JSON.stringify({ videoId, sec: saved.sec, ageMs, source, result: 'expired' })}`); // guard-ok: позиция протухла
    return null;
  }
  const sec = Math.floor(saved.sec);
  console.log(`[VIDEO-RESUME] ${JSON.stringify({ videoId, sec, ageMs, source, result: sec > 0 ? 'resume' : 'start' })}`); // guard-ok: позиция найдена
  return sec > 0 ? sec : null;
}

export function __resetYoutubeResumeForTests(): void {
  resumePositions.clear();
}

export function publishYoutubePosition(videoId: string, positionSec: number): void {
  rememberResume(videoId, positionSec);
  positionListeners.get(videoId)?.forEach((listener) => listener(positionSec));
  // зачем (D49, «Сегодня»): плеер шлёт позицию раз в секунду только во время
  // воспроизведения — это и есть честная секунда просмотра для «Посмотреть видео».
  // Счёт в памяти; store зовётся один раз в день, на 60-й секунде (Q9: без монет).
  noteTodayVideoPlaybackTick(videoId, Date.now(), (watchedSec, id, dayKey) => {
    void recordTodayTaskActivity({ kind: 'video', units: watchedSec, unitKey: `video:${dayKey}`, source: `youtube:${id}` });
  });
}

export function subscribeYoutubePosition(videoId: string, listener: PositionListener): () => void {
  const set = positionListeners.get(videoId) ?? new Set<PositionListener>();
  set.add(listener);
  positionListeners.set(videoId, set);
  return () => {
    set.delete(listener);
    if (!set.size) positionListeners.delete(videoId);
  };
}

/** Индекс фразы, которая звучит сейчас: последняя, чьё время уже наступило. */
export function activePhraseIndex(startSecs: readonly (number | undefined)[], positionSec: number): number {
  let active = -1;
  for (let index = 0; index < startSecs.length; index += 1) {
    const start = startSecs[index];
    if (typeof start === 'number' && start <= positionSec + 0.25 && (active === -1 || start >= (startSecs[active] ?? -1))) active = index;
  }
  return active;
}

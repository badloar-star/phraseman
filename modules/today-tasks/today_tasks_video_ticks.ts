// ═══════════════════════════════════════════════════════════════════════════
// today_tasks_video_ticks.ts — «Посмотреть видео» в блоке «Сегодня» (D49).
//
// зачем: плеер шлёт позицию раз в секунду ТОЛЬКО пока ролик играет
// (app/youtube_player_seek_bus.ts → publishYoutubePosition). Считаем такие тики в
// памяти процесса; перемотка ползунком тиков не добавляет (тик = прошедшая секунда).
// зачем (владелец 17.10: «засчитывать только если посмотрели не менее 10 минут»; координатор 17.10):
// счёт только в памяти обнулялся при закрытии приложения — 7 минут и перезапуск = снова с нуля.
// Теперь каждую полную минуту — отметка в store (он пишет AsyncStorage на устройстве, без сети):
// после перезапуска минуты продолжаются, кольцо на «Сегодня» показывает минуты из 10, а задание
// закрывает сам store, когда набрано 600 с. Запись — раз в минуту, не каждую секунду.
// Q9: монет за сам просмотр нет — правило типа 'video' в today_tasks_core.
// ═══════════════════════════════════════════════════════════════════════════
import { todayLocalDayKey } from './today_tasks_core';

/** Тики чаще этого — дубль (второй слушатель/повтор моста), не секунда просмотра. */
const MIN_TICK_GAP_MS = 700;
/** Отметка на диск — раз в столько секунд просмотра. */
export const TODAY_VIDEO_CHECKPOINT_SEC = 60;

/** Метка запуска процесса: ключ минуты уникален между перезапусками (иначе store отбросит «m1» как дубль). */
let processTag = Date.now().toString(36);
let dayKey = '';
let watchedSec = 0;
let lastTickMs = 0;

export type VideoTickReport = (units: number, videoId: string, dayKey: string, unitKey: string) => void;

/**
 * Одна секунда воспроизведения. Возвращает true, если этот тик сделал отметку минуты.
 * report вынесен параметром ради тестов.
 */
export function noteTodayVideoPlaybackTick(videoId: string, nowMs: number, report: VideoTickReport): boolean {
  const today = todayLocalDayKey(nowMs);
  if (today !== dayKey) {
    if (dayKey) console.log(`[TODAY-TASKS] video:day_rollover ${JSON.stringify({ from: dayKey, to: today, watchedSec })}`);
    dayKey = today;
    watchedSec = 0;
    lastTickMs = 0;
  }
  if (lastTickMs && nowMs - lastTickMs < MIN_TICK_GAP_MS) return false;
  lastTickMs = nowMs;
  watchedSec += 1;
  if (watchedSec % TODAY_VIDEO_CHECKPOINT_SEC !== 0) return false;
  const minute = watchedSec / TODAY_VIDEO_CHECKPOINT_SEC;
  const unitKey = `video:${today}:${processTag}:m${minute}`;
  console.log(`[TODAY-TASKS] video:checkpoint ${JSON.stringify({ videoId, dayKey: today, minuteThisRun: minute, units: TODAY_VIDEO_CHECKPOINT_SEC, unitKey })}`);
  report(TODAY_VIDEO_CHECKPOINT_SEC, videoId, today, unitKey);
  return true;
}

/** Только для тестов. */
export function __resetTodayVideoTicks(nextProcessTag?: string): void {
  if (nextProcessTag) processTag = nextProcessTag;
  dayKey = '';
  watchedSec = 0;
  lastTickMs = 0;
}

// ═══════════════════════════════════════════════════════════════════════════
// today_tasks_video_ticks.ts — «Посмотреть видео» в блоке «Сегодня» (D49).
//
// зачем: плеер шлёт позицию раз в секунду ТОЛЬКО пока ролик играет
// (app/youtube_player_seek_bus.ts → publishYoutubePosition). Считаем такие тики в
// памяти процесса и, набрав 10 минут (600 с) реального просмотра за локальный день,
// один раз сообщаем store. Писать диск каждую секунду незачем; перемотка
// ползунком тиков не добавляет (тик = прошедшая секунда воспроизведения).
// Q9: монет за сам просмотр нет — правило типа 'video' в today_tasks_core.
// ═══════════════════════════════════════════════════════════════════════════
import { TODAY_TASK_RULES, todayLocalDayKey } from './today_tasks_core';

/** Тики чаще этого — дубль (второй слушатель/повтор моста), не секунда просмотра. */
const MIN_TICK_GAP_MS = 700;

let dayKey = '';
let watchedSec = 0;
let reported = false;
let lastTickMs = 0;

export type VideoTickReport = (watchedSec: number, videoId: string, dayKey: string) => void;

/**
 * Одна секунда воспроизведения. Возвращает true, если именно этот тик закрыл
 * порог и задание сообщено. report вынесен параметром ради тестов.
 */
export function noteTodayVideoPlaybackTick(videoId: string, nowMs: number, report: VideoTickReport): boolean {
  const today = todayLocalDayKey(nowMs);
  if (today !== dayKey) {
    if (dayKey) console.log(`[TODAY-TASKS] video:day_rollover ${JSON.stringify({ from: dayKey, to: today, watchedSec })}`);
    dayKey = today;
    watchedSec = 0;
    reported = false;
    lastTickMs = 0;
  }
  if (reported) return false;
  if (lastTickMs && nowMs - lastTickMs < MIN_TICK_GAP_MS) return false;
  lastTickMs = nowMs;
  watchedSec += 1;
  const needed = TODAY_TASK_RULES.video.unitsPerStep * TODAY_TASK_RULES.video.target;
  if (watchedSec < needed) return false;
  reported = true;
  console.log(`[TODAY-TASKS] video:threshold ${JSON.stringify({ videoId, watchedSec, dayKey: today })}`);
  report(watchedSec, videoId, today);
  return true;
}

/** Только для тестов. */
export function __resetTodayVideoTicks(): void {
  dayKey = '';
  watchedSec = 0;
  reported = false;
  lastTickMs = 0;
}

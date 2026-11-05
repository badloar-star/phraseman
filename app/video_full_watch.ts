// video_full_watch.ts — детектор «полного просмотра» видео (чистая функция, без React и сети).
// зачем (владелец 05.11: «что считать полным просмотром — 70 % видео, повторный просмотр не даёт»; Ядро: накопленные НЕПРЕРЫВНО сыгранные
// секунды ≥ 0,7 × длительность, перемотка вперёд и пауза не копятся, ended не обязателен): плеер шлёт позицию раз в секунду ТОЛЬКО пока ролик
// играет (app/youtube_player_seek_bus.publishYoutubePosition), поэтому «секунда просмотра» = шаг позиции ≈ 1 с при реальном ходе часов.
// Шаг больше реального времени (перемотка вперёд) или назад (перемотка) секунд не добавляет. Награда срабатывает один раз в момент 70 %.
export const VIDEO_FULL_WATCH_RATIO = 0.7;
/** Видео короче — не засчитываем (короткие ролики — ферма монет: 70 % от 10 с — это 7 секунд). */
export const VIDEO_FULL_MIN_DURATION_SEC = 30;
/** Тики чаще — дубль (второй слушатель/повтор моста), не секунда просмотра. */
export const VIDEO_FULL_MIN_TICK_GAP_MS = 700;
/** Шаг позиции между двумя тиками больше — это перемотка вперёд, а не ход видео (обычный шаг ≈ 1 с). */
export const VIDEO_FULL_MAX_STEP_SEC = 2.5;
/** Допуск: позиция может опередить настенные часы не больше чем на столько секунд (дрожание моста). */
const WALL_TOLERANCE_SEC = 1;

export type VideoFullEligibility = 'ok' | 'no_duration' | 'too_short' | 'live';

export type VideoFullState = Readonly<{
  videoId: string;
  durationSec: number;
  /** Непрерывно сыгранные секунды (без перемотки). */
  accumulatedSec: number;
  lastPosSec: number | null;
  lastTickMs: number | null;
  reached: boolean;
}>;

export type VideoFullTick = Readonly<{
  state: VideoFullState;
  /** true — ровно на этом тике набрано 70 % (один раз). */
  justReached: boolean;
  /** Что сделал тик — для журнала [VIDEO-FULL]. */
  action: 'start' | 'counted' | 'seek_forward' | 'seek_back' | 'duplicate' | 'already_reached' | 'invalid_position';
}>;

export function videoFullEligibility(durationSec: number | null | undefined, isLive: boolean | null | undefined): VideoFullEligibility {
  if (isLive === true) return 'live';
  if (typeof durationSec !== 'number' || !Number.isFinite(durationSec) || durationSec <= 0) return 'no_duration';
  if (durationSec < VIDEO_FULL_MIN_DURATION_SEC) return 'too_short';
  return 'ok';
}

export function videoFullTarget(durationSec: number): number {
  return durationSec * VIDEO_FULL_WATCH_RATIO;
}

export function createVideoFullState(videoId: string, durationSec: number): VideoFullState {
  return { videoId, durationSec, accumulatedSec: 0, lastPosSec: null, lastTickMs: null, reached: false };
}

export function feedVideoFullTick(state: VideoFullState, positionSec: number, nowMs: number): VideoFullTick {
  if (state.reached) return { state, justReached: false, action: 'already_reached' };
  if (!Number.isFinite(positionSec) || positionSec < 0) return { state, justReached: false, action: 'invalid_position' };
  if (state.lastPosSec === null || state.lastTickMs === null) {
    return { state: { ...state, lastPosSec: positionSec, lastTickMs: nowMs }, justReached: false, action: 'start' };
  }
  const wallGapMs = nowMs - state.lastTickMs;
  if (wallGapMs < VIDEO_FULL_MIN_TICK_GAP_MS) return { state, justReached: false, action: 'duplicate' };
  const delta = positionSec - state.lastPosSec;
  const moved = { ...state, lastPosSec: positionSec, lastTickMs: nowMs };
  if (delta <= 0) return { state: moved, justReached: false, action: 'seek_back' };
  if (delta > VIDEO_FULL_MAX_STEP_SEC || delta > wallGapMs / 1000 + WALL_TOLERANCE_SEC) return { state: moved, justReached: false, action: 'seek_forward' };
  const accumulatedSec = state.accumulatedSec + delta;
  const reached = accumulatedSec >= videoFullTarget(state.durationSec);
  return { state: { ...moved, accumulatedSec, reached }, justReached: reached, action: 'counted' };
}

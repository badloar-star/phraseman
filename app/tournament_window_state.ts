// ═══════════════════════════════════════════════════════════════════════════
// tournament_window_state.ts — в каком состоянии находится окно турниров.
//
// зачем 2026-07-27 (владелец): слот — это ОКНО в полчаса, внутри которого
// можно зайти, а не одна точка старта. Экран знал только два состояния
// («идёт отсчёт» / «сейчас играют») и после старта слота показывал мёртвый
// 00:00 до самой полуночи. Правило владельца:
//
//   • окно идёт            → таймер ПРОПАДАЕТ, вместо него статус окна;
//   • окно закончилось     → таймер ВОЗВРАЩАЕТСЯ и считает до следующего окна;
//   • я уже отыграл в окне → сразу отсчёт до СЛЕДУЮЩЕГО окна (один турнир
//                            на окно, за день можно пройти все окна);
//   • вошёл в последнюю секунду окна → турнир доигрывается нормально, окно
//                            закрывается только для НОВЫХ входов.
//
// Логика вынесена из экрана чистой функцией: её покрывает контрактный тест,
// а экран остаётся тонким. Время сюда передаётся снаружи (часы сервера,
// tournamentNow) — на клиентские часы полагаться нельзя.
// ═══════════════════════════════════════════════════════════════════════════

/** Запасная длина окна, пока не пришёл ответ сервера (TOURNAMENT_ENTRY_WINDOW_MS). */
export const FALLBACK_ENTRY_WINDOW_MS = 30 * 60 * 1000;

export type TournamentWindowPhase =
  /** До окна — крупный отсчёт, вход откроется за N минут до старта. */
  | 'countdown'
  /** Окно идёт, я в нём ещё не играл — можно войти. */
  | 'open'
  /** Окно идёт, но я в нём уже отыграл — считаем до следующего. */
  | 'played'
  /**
   * Владелец включил «активно весь день» — окон-точек нет вовсе, вход живой
   * круглые сутки, лимита «один вход в окно» тоже нет (окна как такового нет).
   */
  | 'all_day'
  /** Расписание пустое или ещё не загрузилось. */
  | 'idle';

export type TournamentWindowState = {
  phase: TournamentWindowPhase;
  /** Секунды до события, которое сейчас показывает таймер (0 — таймера нет). */
  secondsToShow: number;
  /** Секунды до конца текущего окна (только в 'open'). */
  secondsToWindowEnd: number;
  /** Окно, в которое реально идёт вход прямо сейчас. */
  activeWindowStartMs: number;
};

export type TournamentWindowInput = {
  /** Старты окон (мс) — включённые слоты, отсортированные по времени. */
  windowStartsMs: readonly number[];
  /** Часы сервера. */
  nowMs: number;
  /** Длина окна входа с сервера. */
  entryWindowMs?: number;
  /**
   * Старт окна, в котором игрок уже отыграл (маркер сервера
   * tournament_last_slot_key). 0 — не играл.
   */
  playedWindowStartMs?: number;
  /**
   * зачем 2026-08-04 (владелец: «сделай чтобы пользователи могли заходить
   * сколько угодно турниров на протяжении дня весь день»): флаг из
   * tournamentSchedule/config.allDayEnabled. Сервер в этом режиме уже принимает
   * вход в любой момент суток (functions/src/tournaments.ts: tournamentJoin
   * подменяет roomId на живую all-day комнату сам) — клиенту остаётся не
   * блокировать кнопку своей логикой «одно окно раз в день».
   */
  allDayEnabled?: boolean;
};

/**
 * Окно, идущее прямо сейчас: старт уже прошёл, но полчаса ещё не истекли.
 * Берём ПОСЛЕДНЕЕ подходящее — окна не должны накладываться, но если владелец
 * поставил слоты плотнее получаса, актуально позднее.
 */
function findLiveWindow(starts: readonly number[], nowMs: number, windowMs: number): number {
  let live = 0;
  for (const start of starts) {
    if (start <= nowMs && nowMs - start < windowMs) live = start;
  }
  return live;
}

/** Ближайшее окно строго в будущем. */
function findNextWindow(starts: readonly number[], nowMs: number): number {
  for (const start of starts) {
    if (start > nowMs) return start;
  }
  return 0;
}

const toSeconds = (ms: number): number => Math.max(0, Math.round(ms / 1000));

export function resolveTournamentWindowState(input: TournamentWindowInput): TournamentWindowState {
  // зачем 2026-08-04 (владелец): режим «весь день» — не окно с началом и
  // концом, а его отсутствие. Считать его как обычный слот (localTime 00:00)
  // ломается сразу после полуночи: старт уже в прошлом, следующего слота на
  // сегодня нет — findLiveWindow/findNextWindow оба дают 0, и экран решает,
  // что расписание пустое (phase 'idle', «Сейчас турниров нет»), хотя сервер
  // готов принять вход в любую секунду суток. Выходим раньше общей логики.
  if (input.allDayEnabled) {
    return { phase: 'all_day', secondsToShow: 0, secondsToWindowEnd: 0, activeWindowStartMs: 0 };
  }

  const windowMs = input.entryWindowMs && input.entryWindowMs > 0
    ? input.entryWindowMs
    : FALLBACK_ENTRY_WINDOW_MS;
  const starts = [...input.windowStartsMs].sort((left, right) => left - right);
  const { nowMs } = input;

  const liveStart = findLiveWindow(starts, nowMs, windowMs);
  const nextStart = findNextWindow(starts, nowMs);

  if (!liveStart && !nextStart) {
    return { phase: 'idle', secondsToShow: 0, secondsToWindowEnd: 0, activeWindowStartMs: 0 };
  }

  // Окна нет — просто ждём следующего. Обычный отсчёт.
  if (!liveStart) {
    return {
      phase: 'countdown',
      secondsToShow: toSeconds(nextStart - nowMs),
      secondsToWindowEnd: 0,
      activeWindowStartMs: 0,
    };
  }

  const windowEndsAtMs = liveStart + windowMs;

  // зачем: в этом окне уже играл — таймер не исчезает, а сразу целится в
  // следующее окно. Игрок всегда видит цель, а не «приходите позже».
  if (input.playedWindowStartMs && input.playedWindowStartMs === liveStart) {
    return {
      phase: 'played',
      // Следующего окна сегодня может не быть — тогда показываем конец текущего.
      secondsToShow: toSeconds((nextStart || windowEndsAtMs) - nowMs),
      secondsToWindowEnd: toSeconds(windowEndsAtMs - nowMs),
      activeWindowStartMs: liveStart,
    };
  }

  // Окно идёт и я в нём ещё не играл: таймера до старта нет — вход открыт
  // прямо сейчас, до последней секунды окна.
  return {
    phase: 'open',
    secondsToShow: 0,
    secondsToWindowEnd: toSeconds(windowEndsAtMs - nowMs),
    activeWindowStartMs: liveStart,
  };
}

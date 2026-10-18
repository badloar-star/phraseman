// ═══ Опросы на Главной 2.0 — расписание наборов (общее для приложения и сервера) ═══
// зачем (владелец 18.10, «опросы входят в сборку 134»; макет docs/design/v2-app/home-polls-v2.html): опрос появляется
// на Главной примерно раз в 3–4 дня. Расписание детерминированное по дате — его одинаково считают приложение (без сети)
// и сервер (проверка голоса), поэтому ни документа расписания, ни чтения Firestore для показа не нужно.
//
// Правило: от опорного дня каждая неделя даёт два дня запуска — день 0 и день 3 (промежутки 3 и 4 дня). Набор живёт от
// своего дня запуска до дня перед следующим, затем его сменяет следующий. После последнего из N наборов расписание
// заканчивается: повторять те же id нельзя, потому что сервер хранит бессрочный answered-флаг по id набора/вопроса.
// 100 наборов × 2 в неделю = 50 недель — один конечный цикл около года, как в макете.

/** Опорный день расписания: первый запуск — набор №1. Даты до него — опроса нет. */
export const HOME_POLLS_V2_ANCHOR_DATE_KEY = '2026-10-19';
/** Сколько наборов в конечном расписании — столько же в content/polls/home_polls_v2.json (сверяет тест). */
export const HOME_POLLS_V2_SET_COUNT = 100;
/** Дни запуска внутри недели от опорного дня. */
export const HOME_POLLS_V2_LAUNCH_WEEKDAYS = [0, 3] as const;

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type HomePollV2Window = Readonly<{
  /** Номер запуска от опорного дня (0, 1, 2, …). */
  launch: number;
  /** Индекс набора в списке (0…setCount-1). */
  setIndex: number;
  /** id набора: p2-001 … p2-100. */
  setId: string;
  /** Первый и последний день, когда набор показывается (локальный календарь, YYYY-MM-DD). */
  startDateKey: string;
  endDateKey: string;
}>;

function dayIndexOf(dateKey: string): number | null {
  if (!DATE_KEY_RE.test(dateKey)) return null;
  const ms = Date.parse(`${dateKey}T00:00:00Z`);
  const anchorMs = Date.parse(`${HOME_POLLS_V2_ANCHOR_DATE_KEY}T00:00:00Z`);
  if (!Number.isFinite(ms)) return null;
  return Math.round((ms - anchorMs) / DAY_MS);
}

function dateKeyOfDayIndex(dayIndex: number): string {
  const anchorMs = Date.parse(`${HOME_POLLS_V2_ANCHOR_DATE_KEY}T00:00:00Z`);
  return new Date(anchorMs + dayIndex * DAY_MS).toISOString().slice(0, 10);
}

/** id набора по индексу: 0 → p2-001. */
export function homePollV2SetIdForIndex(setIndex: number): string {
  return `p2-${String(setIndex + 1).padStart(3, '0')}`;
}

/**
 * Какой набор показывается в этот день. null — до опорного дня, неверная дата или пустой список.
 * Не зависит от сети и часового пояса: на вход — локальная дата устройства (YYYY-MM-DD).
 */
export function homePollV2WindowForDate(dateKey: string, setCount: number): HomePollV2Window | null {
  const dayIndex = dayIndexOf(dateKey);
  if (dayIndex === null || dayIndex < 0 || !Number.isInteger(setCount) || setCount <= 0) return null;
  const week = Math.floor(dayIndex / 7);
  const inWeek = dayIndex % 7;
  const second = inWeek >= HOME_POLLS_V2_LAUNCH_WEEKDAYS[1];
  const launch = week * 2 + (second ? 1 : 0);
  if (launch >= setCount) return null;
  const startDay = week * 7 + (second ? HOME_POLLS_V2_LAUNCH_WEEKDAYS[1] : HOME_POLLS_V2_LAUNCH_WEEKDAYS[0]);
  const endDay = second ? week * 7 + 6 : week * 7 + HOME_POLLS_V2_LAUNCH_WEEKDAYS[1] - 1;
  const setIndex = launch;
  return {
    launch,
    setIndex,
    setId: homePollV2SetIdForIndex(setIndex),
    startDateKey: dateKeyOfDayIndex(startDay),
    endDateKey: dateKeyOfDayIndex(endDay),
  };
}

/**
 * Сервер: можно ли сейчас голосовать в наборе. Устройство живёт в своём поясе — локальный день отличается от UTC
 * не больше чем на сутки, поэтому принимаем набор, активный вчера, сегодня или завтра по UTC.
 */
export function isHomePollV2SetVotableAt(setId: string, nowMs: number, setCount: number): boolean {
  const todayUtc = new Date(nowMs).toISOString().slice(0, 10);
  const base = dayIndexOf(todayUtc);
  if (base === null) return false;
  for (const delta of [-1, 0, 1]) {
    const window = homePollV2WindowForDate(dateKeyOfDayIndex(base + delta), setCount);
    if (window?.setId === setId) return true;
  }
  return false;
}

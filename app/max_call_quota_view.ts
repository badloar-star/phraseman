// Чистый модуль расчёта дедлайнов и пилюли минут для MAX-звонка.
//
// Экономическая граница живёт на сервере (резерв → сеттлмент → watchdog),
// поэтому клиент считает дедлайны от серверного max_seconds из ответа минта,
// а не от собственных представлений о квоте. Все локальные ограничения
// (остаток резерва, остаток дня, cap формата) применяются пессимистично:
// при любом расхождении клиент завершает звонок РАНЬШЕ, чем позже, — лучше
// попрощаться на пару секунд раньше, чем словить обрыв от watchdog'а.
//
// Ноль React/native-импортов: модуль детерминирован и покрыт юнит-тестами.

/** Ключевые моменты жизни звонка в абсолютном времени (ms epoch). */
export interface CallDeadlines {
  /** Момент отправки [WRAP_UP]: ИИ начинает прощаться, чтобы успеть до hard. */
  wrapAtMs: number;
  /** Unified deadline: дальше этой точки резерв не гарантирован. */
  hardAtMs: number;
  /** Точка принудительного teardown — grace-хвост на дозвучивание прощания. */
  teardownAtMs: number;
}

/**
 * Пессимистичная клиентская оценка длительности сессии в секундах:
 * min(серверный max_seconds, остаток резерва, остаток дня, cap формата).
 * Неизвестные ограничения (undefined/NaN) не учитываются — сервер всё равно
 * последняя инстанция; известные — floor'ятся вниз, чтобы дробные секунды
 * никогда не сдвигали дедлайн в оптимистичную сторону.
 */
export function resolveMaxSeconds(opts: {
  serverMaxSeconds: number;
  reserveRemainingSec?: number;
  dayRemainingSec?: number;
  formatCapSec?: number;
}): number {
  const bounds = [
    opts.serverMaxSeconds,
    opts.reserveRemainingSec,
    opts.dayRemainingSec,
    opts.formatCapSec,
  ].filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (bounds.length === 0) return 0;
  return Math.max(0, Math.floor(Math.min(...bounds)));
}

/**
 * Разворачивает длительность сессии в три момента: wrap → hard → teardown.
 * Wrap не может уехать раньше старта (сверхкороткая сессия прощается сразу),
 * teardown всегда строго после hard — хвост на дозвучивание прощания, после
 * него клиент рвёт соединение сам, не дожидаясь серверного watchdog'а.
 */
export function computeCallDeadlines(opts: {
  maxSeconds: number;
  startedAtMs: number;
  wrapUpLeadSec: number;
  graceTailSec: number;
}): CallDeadlines {
  // Отрицательные/битые входы читаем пессимистично как ноль: дедлайн «сейчас»
  // безопаснее для бюджета, чем дедлайн в бесконечности.
  const maxSeconds = Number.isFinite(opts.maxSeconds) ? Math.max(0, opts.maxSeconds) : 0;
  const lead = Number.isFinite(opts.wrapUpLeadSec) ? Math.max(0, opts.wrapUpLeadSec) : 0;
  const tail = Number.isFinite(opts.graceTailSec) ? Math.max(0, opts.graceTailSec) : 0;

  const hardAtMs = opts.startedAtMs + maxSeconds * 1000;
  // Не раньше старта: иначе [WRAP_UP] улетел бы до первого «алло».
  const wrapAtMs = Math.max(opts.startedAtMs, hardAtMs - lead * 1000);
  const teardownAtMs = hardAtMs + tail * 1000;
  return { wrapAtMs, hardAtMs, teardownAtMs };
}

/**
 * Гранулярность пилюли: минутная почти весь звонок (тикающий таймер давит на
 * ученика), посекундная — только в последние 60 секунд, когда точность важнее
 * спокойствия.
 */
export function pillGranularity(remainingSec: number): 'minutes' | 'seconds' {
  return remainingSec <= 60 ? 'seconds' : 'minutes';
}

/**
 * Текст пилюли. Минуты округляются ВВЕРХ: «4 мин» при 3:01 честнее для ученика,
 * чем «3 мин», и не создаёт ощущения, что время украли. Посекундный режим —
 * формат «M:SS». Отрицательный остаток клампится в ноль (сессия на teardown).
 *
 * minutesWord — локализованное слово минут («мин»/«хв»/«min»…): формула счёта
 * живёт ТОЛЬКО здесь, экран передаёт слово, а не дублирует Math.ceil — иначе
 * пилюля и каноника однажды тихо разъедутся в округлении.
 */
export function formatMinutesPill(
  remainingSec: number,
  granularity: 'minutes' | 'seconds',
  minutesWord = 'мин',
): string {
  const sec = Number.isFinite(remainingSec) ? Math.max(0, remainingSec) : 0;
  if (granularity === 'minutes') {
    return `${Math.ceil(sec / 60)} ${minutesWord}`;
  }
  const whole = Math.floor(sec);
  const m = Math.floor(whole / 60);
  const s = whole % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

/**
 * Тон пилюли. Функция чистая и монотонная по remainingSec, поэтому UI получает
 * пороги «по событиям перехода»: пока секунды тикают внутри одной зоны, тон не
 * меняется, и рендер/анимация (один amber-пульс) триггерится ровно один раз —
 * на смене значения, а не на каждом кадре.
 */
export function pillTone(remainingSec: number): 'normal' | 'amber' | 'red' {
  if (remainingSec <= 60) return 'red';
  if (remainingSec <= 300) return 'amber';
  return 'normal';
}

/* expo-router route shim: app/ files are treated as routes and need a default export. */
export default function __RouteShim() {
  return null;
}

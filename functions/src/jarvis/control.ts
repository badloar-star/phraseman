/**
 * Единый выключатель Джарвиса (бриф в12, в14, в18, в20).
 *
 * зачем свой, а не общий с admin_config/alerts: сейчас, выключая алерты об
 * ошибках, владелец гасил и Джарвиса — один рубильник на две разные вещи.
 * Здесь отдельный: можно замолчать Джарвиса, не теряя отчёты об ошибках.
 *
 * Модуль чистый — без Firestore, чтобы логику режимов проверить тестами
 * целиком. Чтение документа делает вызывающий.
 */

export const JARVIS_CONTROL_DOC = 'jarvis_control/global';

/**
 * off — не работает и не пишет;
 * quiet — следит, но молчит («не пиши мне сегодня» ≠ «перестань следить»);
 * observe — работает и пишет. Значение по умолчанию.
 */
export type JarvisMode = 'off' | 'quiet' | 'observe';

const KNOWN_MODES: readonly JarvisMode[] = ['off', 'quiet', 'observe'];

export interface JarvisControl {
  readonly mode: JarvisMode;
  /** Почему выключили. null — причины не оставили. Ничего не выдумываем. */
  readonly reason: string | null;
  readonly changedBy: string | null;
  readonly changedAtMs: number | null;
  /** Когда суточный крон отработал в последний раз. null — ещё ни разу. */
  readonly lastRunAtMs: number | null;
  /** Сколько находок было в последнем прогоне. */
  readonly lastRunOpenDecisions: number | null;
}

/**
 * зачем observe по умолчанию: пустая база не должна означать «выключено».
 * Отсутствие настройки — это «ещё не настраивали», а не решение владельца
 * прекратить надзор.
 */
export const DEFAULT_CONTROL: JarvisControl = Object.freeze({
  mode: 'observe' as JarvisMode,
  reason: null,
  changedBy: null,
  changedAtMs: null,
  lastRunAtMs: null,
  lastRunOpenDecisions: null,
});

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function parseControl(raw: unknown): JarvisControl {
  if (!raw || typeof raw !== 'object') return DEFAULT_CONTROL;
  const data = raw as Record<string, unknown>;
  // зачем откат в observe, а не в off: незнакомое значение режима — это
  // ошибка записи, и она не должна тихо выключать надзор.
  const mode = KNOWN_MODES.includes(data.mode as JarvisMode)
    ? (data.mode as JarvisMode)
    : DEFAULT_CONTROL.mode;
  return Object.freeze({
    mode,
    reason: text(data.reason),
    changedBy: text(data.changedBy),
    changedAtMs: num(data.changedAtMs),
    lastRunAtMs: num(data.lastRunAtMs),
    lastRunOpenDecisions: num(data.lastRunOpenDecisions),
  });
}

/** Можно ли вообще прогонять департаменты. */
export function canRun(control: JarvisControl): boolean {
  return control.mode !== 'off';
}

/** Можно ли писать владельцу. */
export function canNotify(control: JarvisControl): boolean {
  return control.mode === 'observe';
}

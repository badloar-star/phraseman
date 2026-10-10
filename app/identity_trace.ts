/*
 * Трассировка личности для разбора реальных случаев пользователей (AA S2c, §126).
 *
 * зачем (правило владельца «СПЕРВА ЛОГИ, ПОТОМ ПОЧИНКА»): три случая из обращений —
 *   [AUTH-LINK-GOOGLE] — после смены Google-аккаунта не привязывается Google;
 *   [PROFILE-FLIP]     — после перезапуска уровень/дни скачут между двумя профилями;
 *   [ACC-SWITCH-WIPE]  — выход из аккаунта упал на стирании (1.6.19).
 * Каждый лог — единый префикс задачи, чтобы владелец вытащил цепочку одним поиском.
 *
 * Правила приватности: uid, stableId, токены и nonce в лог НЕ попадают. Вместо них —
 * короткая метка `h:xxxxxxxx` (FNV-1a 32 бита): по ней видно «тот же / другой»
 * между строками и перезапусками, но восстановить идентификатор нельзя (вход —
 * случайный uuid/uid). Значения полей — только коды, числа, флаги и такие метки.
 *
 * Канал: console.warn (в релизе не вырезается, см. babel.config.js); отмеченные
 * `persist` строки дополнительно уходят в DebugLogger (переживают перезапуск —
 * нужно для [PROFILE-FLIP], где сравниваются соседние запуски). Персистятся
 * только решения и аномалии, не каждый шаг: журнал ограничен 160 записями.
 */
import { DebugLogger } from './debug-logger';

// зачем (AA S2d 🔴1): [PLUS-TRANSFER] — перенос Plus после смены аккаунта (тихое восстановление покупок).
export type IdentityTracePrefix = '[AUTH-LINK-GOOGLE]' | '[PROFILE-FLIP]' | '[ACC-SWITCH-WIPE]' | '[PLUS-TRANSFER]'
  // зачем (AA S2d раунд 3): долив копии гостя A в B после подтверждённого merge.
  | '[ACC-BACKUP-MERGE]'
  // зачем (10.10, ревью «Авторизации»): причины сбоя синхронных peek привязки и даты аккаунта.
  | '[AUTH-PEEK]'
  | '[AUTH-AVAIL]'; // зачем (11.10): сбой проверки «доступен ли вход через Apple» больше не немой

export type IdentityTraceValue = string | number | boolean | null;

export type IdentityTraceFields = Readonly<Record<string, IdentityTraceValue>>;

const MAX_STRING_FIELD = 80;

/**
 * Метка «тот же/другой» для идентификатора: `none` для пустого, иначе `h:` +
 * 8 hex FNV-1a. Не криптография — только корреляция строк лога.
 */
export function identityTag(value: unknown): string {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) return 'none';
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `h:${hash.toString(16).padStart(8, '0')}`;
}

/**
 * Монотонные миллисекунды для длительностей в трассировке. НЕ Date.now(): тесты и
 * логика входа подменяют Date.now() последовательностями значений, и лишний вызов
 * лога сдвигал бы их (сторож «зависшего входа» в auth_provider_behavior).
 */
export function identityTraceClockMs(): number {
  const perf = (globalThis as { performance?: { now?: () => number } }).performance;
  return typeof perf?.now === 'function' ? Math.round(perf.now()) : 0;
}

/**
 * Имя ключа хранилища без встроенных идентификаторов: часть ключей несёт
 * stableId/uid в имени (очереди, квитанции). uuid и длинные токены → <id>.
 */
export function redactStorageKey(key: string): string {
  return String(key)
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<id>')
    // Длинный буквенно-цифровой кусок (uid Firebase, sha256) — идентификатор.
    // зачем (S2c, ревью L-S2c-1): uid Firebase бывает БЕЗ единой цифры (~0,7%) — прежняя
    // проверка «есть и цифры, и буквы» пропускала его сырым. Слова ключа разделены `_`
    // и короче 16 символов, поэтому маскируем любой сплошной кусок от 16 символов.
    .replace(/[A-Za-z0-9]{16,}/g, '<id>')
    .slice(0, 60);
}

/** Код ошибки без текста (в тексте ошибки Firebase бывают email/uid). */
export function identityErrorCode(error: unknown): string {
  const rawCode = (error as { code?: unknown } | null)?.code;
  if (typeof rawCode === 'string' && /^[a-z0-9_./-]{1,64}$/i.test(rawCode)) return rawCode;
  const message = error instanceof Error ? error.message : '';
  // Свои коды приложения — snake_case без пробелов; чужой текст не пропускаем.
  if (/^[a-z0-9_:-]{1,80}$/i.test(message)) return message;
  return error instanceof Error ? 'error_without_code' : typeof error;
}

function boundFields(fields: IdentityTraceFields | undefined): Record<string, IdentityTraceValue> {
  const out: Record<string, IdentityTraceValue> = {};
  if (!fields) return out;
  for (const [key, value] of Object.entries(fields)) {
    out[key] = typeof value === 'string' && value.length > MAX_STRING_FIELD
      ? value.slice(0, MAX_STRING_FIELD)
      : value;
  }
  return out;
}

/**
 * Одна строка трассировки. Никогда не бросает: лог не имеет права сорвать
 * вход/выход/старт (ошибка самого лога печатается одной строкой).
 */
export function identityTrace(
  prefix: IdentityTracePrefix,
  event: string,
  fields?: IdentityTraceFields,
  options: Readonly<{ persist?: boolean }> = {},
): void {
  let line = `${prefix} ${event}`;
  try {
    line = `${prefix} ${event} ${JSON.stringify(boundFields(fields))}`;
    console.warn(line);
    if (options.persist === true) {
      DebugLogger.error(`${prefix} ${event}`, new Error(line), 'warning');
    }
  } catch (error) {
    // зачем: немой catch запрещён — причина сбоя самого лога видна разработчику.
    console.warn(`${prefix} trace_failed event=${event} kind=${error instanceof Error ? error.name : typeof error}`);
  }
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

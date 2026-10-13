// PM-229 (A1): серверный аналог клиентского swallowError — обработчик для
// `.catch(swallowed('модуль:операция', null))`, который НЕ глотает молча.
//
// зачем: правило владельца «запрет немого catch {}» — целые механизмы умирали
// месяцами из-за пустого catch. Здесь поведение прежнее (значение-заглушка, путь
// продолжается), но причина остаётся в Cloud Logging по единому префиксу
// [PM-229], и ошибку видно в метрике/поиске логов.
//
// Firebase-экономия: это одна строка в логе на сбой, без записи в Firestore;
// текст ошибки ограничен 300 знаками, чтобы не раздувать объём логов.
import * as logger from 'firebase-functions/logger';

export const SWALLOWED_ERROR_PREFIX = '[PM-229]';
const MAX_MESSAGE_CHARS = 300;

function describe(error: unknown): { code: string; message: string } {
  if (error && typeof error === 'object') {
    const e = error as { code?: unknown; message?: unknown };
    return {
      code: typeof e.code === 'string' || typeof e.code === 'number' ? String(e.code).slice(0, 64) : 'unknown',
      message: String(e.message ?? error).slice(0, MAX_MESSAGE_CHARS),
    };
  }
  return { code: 'unknown', message: String(error).slice(0, MAX_MESSAGE_CHARS) };
}

/** Логирует причину и возвращает заглушку; сам логгер никогда не бросает. */
export function reportSwallowedServer(tag: string, error: unknown): void {
  try {
    const { code, message } = describe(error);
    logger.warn(`${SWALLOWED_ERROR_PREFIX} swallowed ${tag}`, { tag, code, message });
  } catch (loggerError) {
    // Логгер сам упал — писать некуда; не пробрасываем, чтобы не сорвать основной путь.
    // eslint-disable-next-line no-console
    console.warn(`${SWALLOWED_ERROR_PREFIX} logger_failed ${tag}`, String(loggerError).slice(0, 120));
  }
}

/** Готовый обработчик: `.catch(swallowed('account_delete:read_user', null))`. */
export function swallowed<T>(tag: string, fallback: T): (error: unknown) => T {
  return (error: unknown): T => {
    reportSwallowedServer(tag, error);
    return fallback;
  };
}

// зачем (координатор 13.10, SERVER_SILENT_CATCH_R1): в Диалогах и пушах catch подменял исходную ошибку кодом категории
// (release_unavailable, provider_failed, session_not_found…) — в журнале было «что», но не «почему» (ответ Firestore/OpenAI).
// Пишем причину одной строкой, БЕЗ изменения поведения. Без личных данных: куски 20+ букв/цифр (uid, id документов, токены)
// маскируются; для разбора текста модели (omitMessage) сообщение не пишется вовсе — в нём фрагмент реплики.
export const SERVER_CAUSE_PREFIX = '[SERVER-CAUSE]';

export function maskServerCauseText(text: string): string {
  return text.replace(/[A-Za-z0-9_-]{20,}/g, '…').slice(0, MAX_MESSAGE_CHARS);
}

export function reportCauseServer(
  tag: string,
  error: unknown,
  opts: Readonly<{ omitMessage?: boolean; extra?: Readonly<Record<string, string | number | boolean>> }> = {},
): void {
  try {
    const { code } = describe(error);
    const name = error instanceof Error ? error.name.slice(0, 64) : typeof error;
    const fields: Record<string, unknown> = { tag, code, name, ...(opts.extra ?? {}) };
    if (!opts.omitMessage) fields.message = maskServerCauseText(describe(error).message);
    logger.warn(`${SERVER_CAUSE_PREFIX} ${tag}`, fields);
  } catch (loggerError) {
    // eslint-disable-next-line no-console
    console.warn(`${SERVER_CAUSE_PREFIX} logger_failed ${tag}`, String(loggerError).slice(0, 120));
  }
}

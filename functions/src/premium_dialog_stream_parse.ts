/**
 * Чистые парсеры стриминга диалога — БЕЗ зависимостей от firebase-admin и сети.
 *
 * зачем: держим их отдельным модулем, чтобы тест мог импортировать разбор, не
 * поднимая весь граф Cloud Functions (ts-jest на полном графе съедал 4 ГБ и падал
 * по памяти — известная болячка проекта, см. project_jest_watchman_ram).
 */

/**
 * Инкрементально достаёт содержимое поля `reply` из НЕДОПИСАННОГО JSON.
 *
 * В игровом режиме модель возвращает JSON-конверт, а не голый текст. Парсер
 * сохраняется как защита provider-boundary и для диагностики неполных чанков;
 * пользовательский поток публикуется только после проверки всего ответа.
 *
 * Функция МОНОТОННА: с ростом входа результат может только удлиняться.
 */
export function extractPartialReply(partialJson: string): string {
  const key = '"reply"';
  const k = partialJson.indexOf(key);
  if (k < 0) return '';
  const colon = partialJson.indexOf(':', k + key.length);
  if (colon < 0) return '';
  const start = partialJson.indexOf('"', colon + 1);
  if (start < 0) return '';

  let out = '';
  for (let i = start + 1; i < partialJson.length; i++) {
    const ch = partialJson[i];
    if (ch === '\\') {
      const next = partialJson[i + 1];
      if (next === undefined) break; // экранирование оборвалось на границе чанка
      if (next === 'n') out += '\n';
      else if (next === 't') out += '\t';
      else if (next === 'u') {
        const hex = partialJson.slice(i + 2, i + 6);
        if (hex.length < 4) break; // \u-эскейп ещё не доехал целиком
        out += String.fromCharCode(parseInt(hex, 16));
        i += 5;
        continue;
      } else out += next;
      i += 1;
      continue;
    }
    if (ch === '"') break; // строка reply закончилась
    out += ch;
  }
  return out;
}

/** Кадры, которые публикатор шлёт клиенту по ходу генерации. */
export type LiveDialogEvent =
  | { type: 'delta'; text: string; [key: string]: unknown }
  | { type: 'reset'; [key: string]: unknown };

export interface LiveReplyPublisher {
  /**
   * Принимает НАКОПЛЕННЫЙ сырой текст провайдера (не кусочек!) и публикует
   * только новый хвост видимой реплики. В игровом режиме видимая реплика —
   * поле `reply` из недописанного JSON, в обычном — сам текст.
   */
  push: (accumulatedRaw: string) => void;
  /**
   * Начало новой попытки генерации (анти-повтор отверг первый черновик):
   * клиенту уходит кадр `reset`, чтобы он стёр уже напечатанное. Если ничего
   * ещё не публиковалось — кадр не нужен, и он не отправляется.
   */
  reset: () => void;
  /** Сколько символов видимой реплики уже ушло клиенту (для логов задержки). */
  publishedLength: () => number;
}

/**
 * Живой публикатор реплики.
 *
 * зачем (владелец 2026-09-14: «ускорь на 100%, чтобы отвечали немедленно»):
 * раньше сервер держал ВЕСЬ ответ модели у себя до конца генерации и только
 * потом резал готовый текст на дельты — человек ждал 3–6 секунд с пустым
 * пузырём. Теперь каждый кусочек уходит сразу, как пришёл от провайдера.
 *
 * Монотонность гарантируется здесь: наружу уходит только хвост, который
 * ПРОДОЛЖАЕТ уже опубликованное. Если видимый текст на мгновение стал короче
 * (оборванный escape в JSON) или не продолжает опубликованное — кадр не шлём,
 * дождёмся следующего чанка. Финальный кадр `done` всё равно несёт авторитетный
 * текст, которым клиент заменяет черновик.
 */
export function createLiveReplyPublisher(
  gameMode: boolean,
  write: (event: LiveDialogEvent) => void,
): LiveReplyPublisher {
  let published = '';
  return {
    push: (accumulatedRaw) => {
      const visible = gameMode ? extractPartialReply(accumulatedRaw) : accumulatedRaw;
      if (visible.length <= published.length) return;
      if (!visible.startsWith(published)) return;
      const tail = visible.slice(published.length);
      published = visible;
      write({ type: 'delta', text: tail });
    },
    reset: () => {
      if (published.length > 0) write({ type: 'reset' });
      published = '';
    },
    publishedLength: () => published.length,
  };
}

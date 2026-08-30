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

export interface AcceptedDialogDelta {
  type: 'delta';
  text: string;
  [key: string]: unknown;
}

/** Публикует только уже проверенную полную реплику небольшими SSE-дельтами. */
export function emitAcceptedDialogReply(
  reply: string,
  write: (event: AcceptedDialogDelta) => void,
  chunkSize = 48,
): void {
  const safeChunkSize = Math.max(1, Math.min(256, Math.floor(chunkSize) || 48));
  for (let offset = 0; offset < reply.length; offset += safeChunkSize) {
    const text = reply.slice(offset, offset + safeChunkSize);
    if (text) write({ type: 'delta', text });
  }
}

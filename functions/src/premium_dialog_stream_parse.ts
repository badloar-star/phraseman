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
 * В игровом режиме модель возвращает JSON-конверт, а не голый текст. Чтобы человек
 * видел реплику по мере набора, а не после закрывающей скобки, вынимаем строку
 * reply прямо из частичного JSON. Работает потому, что в промпте reply стоит
 * ПЕРВЫМ полем конверта.
 *
 * Функция МОНОТОННА: с ростом входа результат может только удлиняться. На этом
 * держится отправка дельт — сервер шлёт лишь «хвост», сравнивая длину с уже
 * отправленным.
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

import { readFileSync } from 'fs';
import { isAbsolute, join } from 'path';

/**
 * Читает исходник для сторожей по тексту с окончаниями строк LF.
 *
 * зачем (координатор 05.10, 9d7efccaf): на ПК владельца core.autocrlf=true — в рабочей копии файлы с CRLF
 * (в индексе LF). Сторожа, сверяющие исходник с многострочными литералами или регулярками («\n»), ложно
 * краснели, хотя код на месте. Нормализация здесь, а не настройки git: те затронули бы все сессии и Codex.
 *
 * Путь — абсолютный или относительный к корню репозитория (как в большинстве сторожей).
 * Не для проверок, где важны точные байты файла (хеши, hash-lock): там читать файл напрямую.
 */
export function readSource(filePath: string): string {
  const absolute = isAbsolute(filePath) ? filePath : join(__dirname, '..', '..', filePath);
  return normalizeEol(readFileSync(absolute, 'utf8'));
}

/** CRLF и одиночный CR → LF. */
export function normalizeEol(text: string): string {
  return text.replace(/\r\n?/g, '\n');
}

import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Двойник tests/helpers/read_source.ts для тестов на node:test (.test.mjs). Своё имя с «_esm»: иначе jest при
// импорте './helpers/read_source' выбирал бы этот .mjs вместо .ts и падал на ESM.
// зачем (координатор 05.10, 9d7efccaf): на ПК владельца core.autocrlf=true — в рабочей копии CRLF (в индексе LF),
// сторожа по тексту исходника с многострочными ожиданиями ложно краснели. Не для проверок точных байтов (хеши).
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Путь абсолютный или относительный к корню репозитория. */
export function readSource(filePath) {
  const absolute = isAbsolute(filePath) ? filePath : join(repoRoot, filePath);
  return normalizeEol(readFileSync(absolute, 'utf8'));
}

/** CRLF и одиночный CR → LF. */
export function normalizeEol(text) {
  return text.replace(/\r\n?/g, '\n');
}

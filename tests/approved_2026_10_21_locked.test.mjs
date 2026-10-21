// УТВЕРЖДЕНО владельцем 21.10 (через координатора): «Найди пары» — вариант 2, Пик «Собери перевод» — вариант A, Plus — эталон кольца как есть.
// Эталоны переносятся в приложение 1 в 1 и проверяются Сверкой. Тест сверяет SHA-256 каждого файла (переводы строк нормализуются)
// с docs/design/v2-app/approved-2026-10-21.lock.json. Осознанная правка — только с прямым словом владельца:
// пересчитать хэши (node scripts/approved_2026_10_21_lock_update.mjs) и дописать его слова в APPROVED_2026-10-21_LOCKED.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/v2-app/approved-2026-10-21.lock.json'), 'utf8'));

for (const [file, hash] of Object.entries(lock.files)) {
  test(`утверждённый эталон 21.10 не изменён: ${file}`, () => {
    const text = fs.readFileSync(path.join(ROOT, 'docs/design/v2-app', file), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(crypto.createHash('sha256').update(text, 'utf8').digest('hex'), hash, `${file} изменён: ${lock.about}`);
  });
}

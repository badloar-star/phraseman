// ЗАФИКСИРОВАНО владельцем 04.10: макет «Мои ошибки — Панель» (docs/design/v2-app/mistakes-panel.html) одобрен
// («эти макеты одобряю отлично, их надо зафиксировать, чтобы никогда не потерять») и перенесётся в приложение 1 в 1.
// Тест сверяет SHA-256 каждого файла (переводы строк нормализуются) с docs/design/v2-app/mistakes-panel.lock.json.
// Осознанная правка — только с прямым словом владельца: пересчитать хэши (node scripts/mistakes_panel_lock_update.mjs) и дописать его слова в CARDS_LOCKED.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/design/v2-app/mistakes-panel.lock.json'), 'utf8'));

for (const [file, hash] of Object.entries(lock.files)) {
  test(`макет «Мои ошибки — Панель» не изменён: ${file}`, () => {
    const text = fs.readFileSync(path.join(ROOT, 'docs/design/v2-app', file), 'utf8').replace(/\r\n/g, '\n');
    assert.equal(crypto.createHash('sha256').update(text, 'utf8').digest('hex'), hash, `${file} изменён: ${lock.about}`);
  });
}

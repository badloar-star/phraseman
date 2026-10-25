// зачем (решение владельца Q63 «строгий сторож немых catch — с 26.10»; NIGHT_BACKLOG 26.10 стр. 176/191): до 26.10 сторож немых catch
// в pre-commit только предупреждал. Теперь коммит с немым catch в добавленных строках отклоняется. Сторож держит установщик хука:
// вызов с --strict и проверка кода возврата, как у соседних сторожей. Без проверки кода exit 1 сторожа проглатывался бы.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const installer = fs.readFileSync(path.join(ROOT, 'scripts/install-git-hooks.mjs'), 'utf8').replace(/\r\n/g, '\n');

test('pre-commit зовёт сторож немых catch строго и прерывает коммит по его коду', () => {
  assert.match(installer, /node scripts\/guard_silent_catch\.mjs --strict\nstatus=\$\?\nif \[ "\$status" -ne 0 \]; then\n  exit "\$status"\nfi/);
  assert.doesNotMatch(installer, /node scripts\/guard_silent_catch\.mjs\n/); // без --strict вызова не осталось
});

test('сторож в строгом режиме выходит с кодом 1 при находке, а не 0', () => {
  const guard = fs.readFileSync(path.join(ROOT, 'scripts/guard_silent_catch.mjs'), 'utf8');
  assert.match(guard, /const strict = process\.argv\.includes\('--strict'\);/);
  assert.match(guard, /process\.exit\(strict \? 1 : 0\);/);
});

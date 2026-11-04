// Сторож среза сборки (координатор 04.11): в релизной сборке RANK_GATES_NEW_USERS_SINCE_MS не может быть заглушкой MAX_SAFE_INTEGER —
// иначе «новых» нет и приветствие B-3, +500 за первое занятие и ранговые замки молча мертвы.
// Включается переменной RELEASE_CUT=1 (или STORE_RELEASE=1) в проверке среза; без неё проходит и напоминает.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = fs.readFileSync(path.join(root, 'app/rank_gates_new_user.ts'), 'utf8');
const match = /export const RANK_GATES_NEW_USERS_SINCE_MS\s*=\s*([^;]+);/.exec(src);
const cut = process.env.RELEASE_CUT === '1' || process.env.STORE_RELEASE === '1';
const MIN_PLAUSIBLE_MS = Date.UTC(2026, 0, 1);

test('константа момента релиза найдена в исходнике', () => {
  assert.ok(match, 'RANK_GATES_NEW_USERS_SINCE_MS не найдена в app/rank_gates_new_user.ts');
});

test('срез сборки: момент релиза подставлен (не MAX_SAFE_INTEGER, число-метка после 2026-01-01)', (t) => {
  const raw = match[1].trim();
  if (!cut) {
    t.diagnostic(`не срез сборки (RELEASE_CUT/STORE_RELEASE не заданы); значение сейчас: ${raw}`);
    return;
  }
  assert.ok(!/MAX_SAFE_INTEGER/.test(raw), `в срезе осталась заглушка: ${raw} — «новых» нет, приветствие/бонус/замки мертвы. Подставь момент релиза (мс).`);
  const value = Number(raw.replace(/_/g, ''));
  assert.ok(Number.isFinite(value) && value >= MIN_PLAUSIBLE_MS, `значение ${raw} не похоже на момент релиза (ожидается метка в мс после 2026-01-01)`);
  assert.ok(value <= Date.now() + 24 * 3600 * 1000, `значение ${raw} в будущем больше чем на сутки — новички не появятся до этого момента`);
});

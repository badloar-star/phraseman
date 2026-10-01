// зачем (владелец 01.10, окончательно): экран «Разбор твоих ошибок» убран из 2.0.
// Хаб «Работа над ошибками» не ведёт на него, маршрута в Stack нет; сам экран
// удаляет сессия «Ядро». Сторож не даёт вернуть вход по старой памяти.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hub = readFileSync(new URL('../app/mistakes_hub.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../app/_layout.tsx', import.meta.url), 'utf8');

test('the mistakes hub has no entry to the retired breakdown screen', () => {
  assert.doesNotMatch(hub, /mistakes-hub-analysis|phrase_analytics_screen/);
});

test('the root stack does not register the retired breakdown route', () => {
  assert.doesNotMatch(layout, /name="phrase_analytics_screen"/);
});

// зачем (решение владельца 01.10 через Ядро): экран «Разбор твоих ошибок» не удаляем —
// вход в него из хаба «Работа над ошибками». Замок Premium живёт на самом экране
// (пейвол source 'phrase_analytics'); хаб только показывает значок замка.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hub = readFileSync(new URL('../app/mistakes_hub.tsx', import.meta.url), 'utf8');
const screen = readFileSync(new URL('../app/phrase_analytics_screen.tsx', import.meta.url), 'utf8');

test('the mistakes hub opens the mistakes breakdown screen', () => {
  assert.match(hub, /testID="mistakes-hub-analysis"/);
  assert.match(hub, /router\.push\('\/phrase_analytics_screen'/);
  assert.match(hub, /hasPremiumAccess \? null : <Ionicons name="lock-closed"/);
});

test('the breakdown screen keeps its own Premium gate with the phrase_analytics paywall source', () => {
  assert.match(screen, /source: 'phrase_analytics'/);
  assert.match(screen, /!isPremium \?/);
});

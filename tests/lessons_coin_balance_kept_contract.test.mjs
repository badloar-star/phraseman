// зачем (Макеты 13.10, learn-014): вкладка «Уроки» в фоне (поверх окно Plus) обнуляла баланс монет — в шапке под шторкой «—»,
// при возврате число мигало «— → N». Баланс держится, пока тот же владелец и поколение аккаунта.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const src = fs.readFileSync(path.join(import.meta.dirname, '..', 'app', '(tabs)', 'lessons.tsx'), 'utf8');
const start = src.indexOf('function useLegacyCoinBalanceBinding(');
const hook = src.slice(start, src.indexOf('return binding;', start));

test('фон вкладки не обнуляет баланс; сброс только без владельца или при смене аккаунта', () => {
  assert.ok(start >= 0, 'хук баланса на месте');
  assert.doesNotMatch(hook, /if \(!enabled \|\| !ownerStableId\) \{\s*setBinding\(null\)/, 'обнуление по !enabled вернулось');
  assert.match(hook, /if \(!enabled\) return undefined;/);
  assert.match(hook, /prev\.ownerStableId === ownerStableId && prev\.accountGeneration === token\.generation \? prev : null/);
  assert.match(hook, /subscribeAccountGeneration\(\(nextToken\) => \{\s*setBinding\(null\);/, 'смена аккаунта по-прежнему сбрасывает баланс');
});

test('ранние выходы чтения баланса пишут причину', () => {
  assert.match(hook, /\[LESSONS-COINS\] баланс: чтение не durable/);
  assert.match(hook, /\[LESSONS-COINS\] баланс: поколение аккаунта сменилось/);
});

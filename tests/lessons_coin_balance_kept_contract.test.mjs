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
  // 15.10 (координатор, «—» ~1,3 с на каждом входе): иначе — последнее ПРОВЕРЕННОЕ значение того же владельца и поколения из памяти, не снимок
  assert.match(hook, /prev\.ownerStableId === ownerStableId && prev\.accountGeneration === token\.generation \? prev : cachedLegacyCoinBinding\(token\)/);
  assert.match(hook, /subscribeAccountGeneration\(\(nextToken\) => \{\s*setBinding\(null\);/, 'смена аккаунта по-прежнему сбрасывает баланс');
});

test('ранние выходы чтения баланса пишут причину', () => {
  assert.match(hook, /\[LESSONS-COINS\] баланс: чтение не durable/);
  assert.match(hook, /\[LESSONS-COINS\] баланс: поколение аккаунта сменилось/);
});

test('кэш баланса пишет только проверенная привязка; чужой владелец или поколение не показываются', () => {
  const cacheFn = src.slice(src.indexOf('function cachedLegacyCoinBinding('), src.indexOf('function useLegacyCoinBalanceBinding('));
  assert.match(cacheFn, /cached\.ownerStableId === owner && cached\.accountGeneration === token\.generation \? cached : null/);
  const writes = hook.match(/lastDurableLegacyCoinBinding = /g) ?? [];
  assert.equal(writes.length, 2, 'кэш пишут только durable-ответ и обновление уже проверенной привязки');
  assert.ok(hook.indexOf('durableReadValidated = true;') < hook.indexOf('lastDurableLegacyCoinBinding = durable;'));
  assert.match(hook, /\|\| !durableReadValidated[\s\S]*?lastDurableLegacyCoinBinding = refreshed;/);
});

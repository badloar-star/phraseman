import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';

// зачем (совет 2026-09-30, B7c): пейвол обещает Plus «Безлимит» тренировок с карточками.
// Сторожим это поведением ядра квоты, а не текстом: Plus проходит и после 30 стартов
// и НЕ тратит общий месячный лимит. Модуль тянет AsyncStorage/account_generation,
// поэтому транспилируем его TypeScript'ом и подменяем только эти два импорта.
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../app/monthly_training_sessions.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
});
const stubs = {
  '@react-native-async-storage/async-storage': { default: { getItem: async () => null, setItem: async () => {} } },
  './account_generation': { captureAccountGeneration: () => null, isCurrentAccountGeneration: () => true },
};
const mod = { exports: {} };
new Function('require', 'module', 'exports', outputText)((id) => {
  if (!(id in stubs)) throw new Error(`unexpected import ${id}`);
  return stubs[id];
}, mod, mod.exports);
const { createMonthlyTrainingSessionAccess, MONTHLY_TRAINING_SESSION_LIMIT } = mod.exports;

function memoryStorage() {
  const map = new Map();
  return {
    map,
    getItem: async (key) => (map.has(key) ? map.get(key) : null),
    setItem: async (key, value) => { map.set(key, value); },
  };
}

const token = { phase: 'active', stableId: 'stable-plus', generation: 1 };
const deps = (storage) => ({
  now: () => Date.UTC(2026, 8, 15, 12),
  timeZone: () => 'UTC',
  isCurrentAccount: () => true,
  storage,
});

test('Free is capped at the monthly limit', async () => {
  const storage = memoryStorage();
  const access = createMonthlyTrainingSessionAccess(deps(storage));
  for (let i = 0; i < MONTHLY_TRAINING_SESSION_LIMIT; i += 1) {
    const r = await access.consume({ token, receiptId: `free-${i}`, mode: 'swipe' });
    assert.equal(r.status, 'allowed');
  }
  const over = await access.consume({ token, receiptId: 'free-over', mode: 'swipe' });
  assert.equal(over.status, 'exhausted');
});

test('Plus is never exhausted and does not spend the shared monthly allowance', async () => {
  const storage = memoryStorage();
  const access = createMonthlyTrainingSessionAccess(deps(storage));
  for (let i = 0; i < MONTHLY_TRAINING_SESSION_LIMIT + 20; i += 1) {
    const r = await access.consume({ token, receiptId: `plus-${i}`, mode: 'blitz', hasPremiumAccess: true });
    assert.equal(r.status, 'allowed', `Plus start #${i + 1}`);
  }
  assert.equal(storage.map.size, 0, 'Plus starts are not recorded against the Free allowance');
  const preview = await access.preview({ token, hasPremiumAccess: true });
  assert.equal(preview.status, 'allowed');
});

test('Plus preview stays allowed even when the Free allowance is already used up', async () => {
  const storage = memoryStorage();
  const access = createMonthlyTrainingSessionAccess(deps(storage));
  for (let i = 0; i < MONTHLY_TRAINING_SESSION_LIMIT; i += 1) {
    await access.consume({ token, receiptId: `mixed-${i}`, mode: 'recall' });
  }
  assert.equal((await access.preview({ token })).status, 'exhausted');
  assert.equal((await access.preview({ token, hasPremiumAccess: true })).status, 'allowed');
  assert.equal((await access.consume({ token, receiptId: 'mixed-plus', mode: 'recall', hasPremiumAccess: true })).status, 'allowed');
});

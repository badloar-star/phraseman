// зачем: окно «Можно выбрать аккаунт» (overlays-runtime 038, OR-ACCOUNT-SWITCH-UNSYNCED-BACKUP) — одна кнопка «Продолжить» и значок закладки.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('../app/(tabs)/settings.tsx', import.meta.url), 'utf8');

test('окно после выхода без синхронизации: кнопка «Продолжить» и значок закладки', () => {
  const at = source.indexOf("L('Можно выбрать аккаунт'");
  assert.ok(at > 0, 'окно на месте');
  const block = source.slice(at - 200, at + 3200);
  assert.ok(block.includes('enqueueThemedBlockingInfoAlert('), 'идёт через очередь окон');
  assert.ok(block.includes("{ icon: 'bookmark' }"), 'значок закладки');
  assert.ok(block.includes("L('Продолжить'"), 'подпись кнопки «Продолжить»');
  assert.ok(!block.includes("showInfoAlert(\n                      L('Можно"), 'не общее «OK»');
});

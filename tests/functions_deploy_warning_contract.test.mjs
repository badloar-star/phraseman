import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DO_NOT_DEPLOY_UNTIL, deployWarningText } from '../scripts/functions_deploy_warning.mjs';

// зачем (координатор 12.10, п.60(8)): полный деплой функций в день релиза не должен молча выкатить то, что ждёт срока.
// Сторож: предупреждение подключено к predeploy, а каждое имя в списке — реальный экспорт (список не устаревает молча).
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('functions predeploy prints the do-not-deploy-until list', () => {
  const firebase = JSON.parse(read('firebase.json'));
  const main = firebase.functions.find((entry) => entry.codebase === 'default');
  assert.ok(main.predeploy.includes('node scripts/functions_deploy_warning.mjs'));
  const text = deployWarningText();
  for (const entry of DO_NOT_DEPLOY_UNTIL) assert.ok(text.includes(entry.name), entry.name);
});

test('every listed function is still exported by functions/src/index.ts', () => {
  const index = read('functions/src/index.ts');
  for (const entry of DO_NOT_DEPLOY_UNTIL) {
    assert.ok(new RegExp(`(^|[^A-Za-z0-9_])${entry.name}([^A-Za-z0-9_]|$)`, 'm').test(index), `${entry.name} не экспортируется — обнови список`);
  }
});

test('card TTS stays behind its server gate', () => {
  const worker = read('functions/src/card_tts_worker.ts');
  assert.match(worker, /isCardTtsEnabled\(admin\.firestore\(\)\)/);
  assert.match(worker, /resolveRemoteBool\(db, CARD_TTS_GATE_KEY, false\)/);
});

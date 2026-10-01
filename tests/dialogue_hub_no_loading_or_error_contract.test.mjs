// зачем (владелец 01.10): «Диалоги не загрузились — ТАКОГО НИГДЕ НЕ ДОЛЖНО БЫТЬ»,
// «не должно быть состояния "диалоги загружаются"». Хаб рисует каталог из того, что уже
// на телефоне (кэш → встроенный снимок), сеть обновляет фоном и тихо повторяет сама.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const hub = readFileSync(new URL('../components/dialogs/DialogueV2CatalogueContainer.tsx', import.meta.url), 'utf8')
  .replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '');

test('the dialogue hub renders no loading state', () => {
  assert.doesNotMatch(hub, /dialogue-v2-catalogue-loading/);
  assert.doesNotMatch(hub, /\{copy\.loading\}/);
  assert.doesNotMatch(hub, /ActivityIndicator/);
});

test('the dialogue hub renders no error card or manual retry', () => {
  assert.doesNotMatch(hub, /dialogue-v2-catalogue-unavailable/);
  assert.doesNotMatch(hub, /loadErrorTitle|loadErrorRetry/);
  assert.doesNotMatch(hub, /retryCatalogue/);
});

test('the first frame comes from the local catalogue and the network retries silently', () => {
  assert.match(hub, /peekDialogueV2Catalogue\(studyTarget\)/);
  assert.match(hub, /silentRetriesRef/);
  assert.match(hub, /setTimeout\(\(\) => setReloadNonce/);
});

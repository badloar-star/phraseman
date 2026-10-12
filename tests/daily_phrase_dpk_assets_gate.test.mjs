// зачем (координатор 12.10): пакеты фразы дня es/de/it — ресурсы .dpk; гейт release:precheck ловит их потерю в стор-сборке.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDpkSources, missingDpkInAssetList, DPK_TARGETS } from '../scripts/daily_phrase_dpk_assets_gate.mjs';

test('исходники пакетов .dpk в порядке', () => {
  assert.deepEqual(checkDpkSources(), []);
});

test('манифест без пакетов называет недостающие, с пакетами — пусто', () => {
  assert.deepEqual(missingDpkInAssetList([{ name: 'back-icon', type: 'png' }]), [...DPK_TARGETS]);
  assert.deepEqual(missingDpkInAssetList(DPK_TARGETS.map((name) => ({ name, type: 'dpk' }))), []);
  assert.deepEqual(missingDpkInAssetList([{ name: 'es', type: 'dpk' }]), ['de', 'it']);
});

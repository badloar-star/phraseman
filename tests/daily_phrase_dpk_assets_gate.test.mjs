// зачем (координатор 12.10): пакеты фразы дня es/de/it — ресурсы .dpk; гейт release:precheck ловит их потерю в стор-сборке.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkDpkSources, missingDpkInAssetList, missingDpkInBundles, DPK_TARGETS } from '../scripts/daily_phrase_dpk_assets_gate.mjs';

test('исходники пакетов .dpk в порядке', () => {
  assert.deepEqual(checkDpkSources(), []);
});

test('манифест без пакетов называет недостающие, с пакетами — пусто', () => {
  assert.deepEqual(missingDpkInAssetList([{ name: 'back-icon', type: 'png' }]), [...DPK_TARGETS]);
  assert.deepEqual(missingDpkInAssetList(DPK_TARGETS.map((name) => ({ name, type: 'dpk' }))), []);
  assert.deepEqual(missingDpkInAssetList([{ name: 'es', type: 'dpk' }]), ['de', 'it']);
});

// зачем (Ядро 13.10, PM-216): экспорт не кладёт .dpk в metadata.json (фильтр assetPatternsToBeBundled) — проверяем хэш в бандле.
test('бандл без хэша пакета называет недостающие; старый хэш (экспорт старше файла) — тоже недостающий', () => {
  const hashes = { es: 'eec9da8533b70752cc26685d5586e55e', de: 'cedde9c12af857cdf87d7e6b2cea2019', it: '3eb911af46d962cb13d0c58f89a20ceb' };
  const full = Buffer.from(`x${hashes.es}y${hashes.de}z${hashes.it}`);
  assert.deepEqual(missingDpkInBundles([full], hashes), []);
  assert.deepEqual(missingDpkInBundles([Buffer.from(`a${hashes.es}`), Buffer.from(`b${hashes.it}`)], hashes), ['de']);
  assert.deepEqual(missingDpkInBundles([full], { ...hashes, it: '00000000000000000000000000000000' }), ['it']);
  assert.deepEqual(missingDpkInBundles([full], { es: '', de: hashes.de, it: hashes.it }), ['es']);
});

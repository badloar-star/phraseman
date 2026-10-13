// зачем (координатор 12.10): стор-бандл не должен нести dev-модули и dev-маркеры («dev_vip_override», «HUB-LIFECYCLE»).
// зачем (Ядро 13.10, PM-216): «[DEV-STATE]» — общий префикс журналов боевых файлов; уехавший dev-модуль ищем точно, по source map.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { scanStoreBundleForDevStrings, scanStoreBundleSourceMaps } from '../scripts/store_bundle_dev_strings_gate.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'store-bundle-'));
const writeMap = (file, sources) => fs.writeFileSync(`${file}.map`, JSON.stringify({ version: 3, sources, mappings: '' }));

test('нет стор-экспорта — пропуск, а не красный', () => {
  assert.equal(scanStoreBundleForDevStrings(path.join(os.tmpdir(), 'nope-store-bundle-xyz')).status, 'skipped');
  assert.equal(scanStoreBundleSourceMaps(path.join(os.tmpdir(), 'nope-store-bundle-xyz'), ['dev_x_state']).status, 'skipped');
});

test('чистый бандл — OK', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '_expo', 'static', 'js', 'android'), { recursive: true });
  fs.writeFileSync(path.join(dir, '_expo', 'static', 'js', 'android', 'index.hbc'), Buffer.from([0xc6, 0x1f, 0x0b, 0x00, ...Buffer.from('hello world')]));
  const result = scanStoreBundleForDevStrings(dir);
  assert.equal(result.status, 'ok');
  assert.equal(result.files, 1);
});

test('dev-маркер в бинарном .hbc и в .js — отказ с файлом и строкой', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'index.hbc'), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from('xxHUB-LIFECYCLE seed'), Buffer.from([255])]));
  fs.writeFileSync(path.join(dir, 'chunk.js'), 'var a="dev_vip_override";');
  const result = scanStoreBundleForDevStrings(dir);
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.hits.map((h) => h.text).sort(), ['HUB-LIFECYCLE', 'dev_vip_override']);
});

test('строка журнала «[DEV-STATE]» из мёртвой dev-ветки боевого файла — не отказ', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'index.hbc'), Buffer.concat([Buffer.from([0xc6]), Buffer.from('[DEV-STATE] community: x')]));
  assert.equal(scanStoreBundleForDevStrings(dir).status, 'ok');
});

test('по карте: заглушка в бандле — OK, настоящий dev-модуль — отказ с путём', () => {
  const dir = tmp();
  const bundle = path.join(dir, 'index.hbc');
  fs.writeFileSync(bundle, Buffer.from([0xc6]));
  writeMap(bundle, ['/app/lesson1.tsx', '/store_release_stubs/dev_state/dev_cards_state_stub.ts', '/app/dev_cards_state_extra.ts']);
  assert.equal(scanStoreBundleSourceMaps(dir, ['dev_cards_state']).status, 'ok');
  writeMap(bundle, ['/app/lesson1.tsx', '\\app\\dev_cards_state.ts']);
  const leaked = scanStoreBundleSourceMaps(dir, ['dev_cards_state', 'dev_vip_override']);
  assert.equal(leaked.status, 'failed');
  assert.deepEqual(leaked.leaked.map((l) => l.source), ['/app/dev_cards_state.ts']);
});

test('нет карты рядом с бандлом — отказ (точная проверка без карты невозможна)', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'index.hbc'), Buffer.from([0xc6]));
  const result = scanStoreBundleSourceMaps(dir, ['dev_cards_state']);
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.missingMaps, ['index.hbc']);
});

test('гейт подключён в release:precheck', () => {
  const precheck = fs.readFileSync(new URL('../scripts/release_precheck.mjs', import.meta.url), 'utf8');
  assert.match(precheck, /scripts\/store_bundle_dev_strings_gate\.mjs/);
});

// зачем (координатор 12.10): стор-бандл не должен нести dev-строки («[DEV-STATE]», «dev_vip_override», «HUB-LIFECYCLE»).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { scanStoreBundleForDevStrings } from '../scripts/store_bundle_dev_strings_gate.mjs';

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'store-bundle-'));

test('нет стор-экспорта — пропуск, а не красный', () => {
  assert.equal(scanStoreBundleForDevStrings(path.join(os.tmpdir(), 'nope-store-bundle-xyz')).status, 'skipped');
});

test('чистый бандл — OK', () => {
  const dir = tmp();
  fs.mkdirSync(path.join(dir, '_expo', 'static', 'js', 'android'), { recursive: true });
  fs.writeFileSync(path.join(dir, '_expo', 'static', 'js', 'android', 'index.hbc'), Buffer.from([0xc6, 0x1f, 0x0b, 0x00, ...Buffer.from('hello world')]));
  const result = scanStoreBundleForDevStrings(dir);
  assert.equal(result.status, 'ok');
  assert.equal(result.files, 1);
});

test('dev-строка в бинарном .hbc и в .js — отказ с файлом и строкой', () => {
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'index.hbc'), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from('xx[DEV-STATE] seed'), Buffer.from([255])]));
  fs.writeFileSync(path.join(dir, 'chunk.js'), 'var a="dev_vip_override";');
  const result = scanStoreBundleForDevStrings(dir);
  assert.equal(result.status, 'failed');
  assert.deepEqual(result.hits.map((h) => h.text).sort(), ['[DEV-STATE]', 'dev_vip_override']);
});

test('гейт подключён в release:precheck', () => {
  const precheck = fs.readFileSync(new URL('../scripts/release_precheck.mjs', import.meta.url), 'utf8');
  assert.match(precheck, /scripts\/store_bundle_dev_strings_gate\.mjs/);
});

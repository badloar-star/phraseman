// Сторож (репетиция сборки 15.10): app/learning_v2_runtime_audio_omissions_v1.generated.ts = JSON фабрики в activation/,
// а рантайм-модуль омиссий не импортирует ничего из content/ (на чистой машине Metro этот путь не видит).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { OUTPUT_REL, SOURCE_REL, renderRuntimeAudioOmissionsModule } from '../scripts/generate_learning_v2_runtime_audio_omissions.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

test('сгенерированный модуль совпадает с JSON фабрики (иначе: node scripts/generate_learning_v2_runtime_audio_omissions.mjs)', () => {
  assert.equal(read(OUTPUT_REL), renderRuntimeAudioOmissionsModule(readFileSync(path.join(ROOT, SOURCE_REL), 'utf8')));
});

test('рантайм-модуль омиссий берёт данные из app/, а не из content/', () => {
  const src = read('app/learning_v2_factory_runtime_audio_omissions_v1.ts');
  assert.equal(/content\/learning-v2-course/.test(src.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')), false);
  assert.match(src, /learning_v2_runtime_audio_omissions_v1\.generated/);
});

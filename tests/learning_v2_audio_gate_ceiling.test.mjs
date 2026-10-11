// зачем (координатор 12.10): гейт озвучки V2 обязан быть КРАСНЫМ, если V2 входит в стор-сборку, а выпущено 0 занятий
// (раньше «каждое выпущенное собирается» при нуле выпущенных давало зелёный), и при отсутствии справки.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  learningV2ReleasedCeilingVerdict,
  parseLearningV2AvailabilityAdvisory,
} from '../scripts/learning_v2_availability_advisory.mjs';

const line = (obj) => `      [V2-AVAILABILITY] advisory ${JSON.stringify(obj)}`;

test('справка из вывода раннера: строка с отступом посреди лога', () => {
  const output = ['PASS tests/x', '  console.log', line({ manifest: 186, contiguousCeiling: 4, releasedByArtifact: 4 }), 'done'].join('\n');
  assert.deepEqual(parseLearningV2AvailabilityAdvisory(output), { manifest: 186, contiguousCeiling: 4, releasedByArtifact: 4 });
});

test('потолок 0 или выпущено 0 — красный', () => {
  assert.equal(learningV2ReleasedCeilingVerdict({ contiguousCeiling: 0, releasedByArtifact: 0 }).reason, 'zero_released_sessions');
  assert.equal(learningV2ReleasedCeilingVerdict({ contiguousCeiling: 5, releasedByArtifact: 0 }).ok, false);
  assert.equal(learningV2ReleasedCeilingVerdict({ contiguousCeiling: 0, releasedByArtifact: 5 }).ok, false);
});

test('выпущено и собирается — зелёный', () => {
  assert.deepEqual(learningV2ReleasedCeilingVerdict({ contiguousCeiling: 56, releasedByArtifact: 56 }),
    { ok: true, reason: 'released_sessions_present', released: 56, ceiling: 56 });
});

test('нет справки или битый JSON — красный, а не молчаливый зелёный', () => {
  assert.equal(parseLearningV2AvailabilityAdvisory('nothing here'), null);
  assert.equal(parseLearningV2AvailabilityAdvisory('[V2-AVAILABILITY] advisory {broken'), null);
  assert.equal(learningV2ReleasedCeilingVerdict(null).reason, 'advisory_missing');
  assert.equal(learningV2ReleasedCeilingVerdict({ manifest: 1 }).reason, 'advisory_fields_missing');
});

test('гейт зовёт разбор и даёт раннеру лимит кучи', () => {
  const gate = readFileSync(new URL('../scripts/learning_v2_audio_coverage_gate.mjs', import.meta.url), 'utf8');
  assert.match(gate, /learningV2ReleasedCeilingVerdict\(parseLearningV2AvailabilityAdvisory\(/);
  assert.match(gate, /const HEAP_FLAG = '--max-old-space-size=8192';/);
  assert.match(gate, /\[HEAP_FLAG, runner,/);
});

test('всё, что гейт импортирует из scripts/, попадает в архив EAS (.easignore)', () => {
  // зачем: scripts/* исключён из архива сборки, гейт запускается в eas-build-post-install — забытый помощник = «модуль не найден».
  const gate = readFileSync(new URL('../scripts/learning_v2_audio_coverage_gate.mjs', import.meta.url), 'utf8');
  const easignore = readFileSync(new URL('../.easignore', import.meta.url), 'utf8');
  const local = [...gate.matchAll(/from '\.\/([^']+)'/g)].map((m) => m[1]);
  assert.ok(local.includes('learning_v2_availability_advisory.mjs'));
  for (const file of local) assert.ok(easignore.includes(`!scripts/${file}`), `!scripts/${file} нет в .easignore`);
});

// Сторож «код приложения не ссылается на файлы, которые .easignore выкинет из архива EAS» (координатор 14.10, прогон Тем):
// иначе бандлер на сервере EAS падает «Unable to resolve» уже после загрузки архива — платная сборка сгорает.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findIgnoredImports, relativeSpecifiers } from '../scripts/easignore_runtime_imports_gate.mjs';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const read = (path) => normalizeEol(readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'));
const EASIGNORE = `/content/*
!/content/learning-v2-course/
/content/learning-v2-course/*
!/content/learning-v2-course/activation/
`;

test('finds require / import / dynamic import / re-export specifiers', () => {
  const src = `const a = require('../content/x.json');\nimport b from './b';\nconst c = import('../c');\nexport { d } from '../d';\nimport e from 'react';`;
  assert.deepEqual(relativeSpecifiers(src), ['../content/x.json', './b', '../c', '../d']);
});

test('an import into an excluded folder is a violation; the activation exception is clean', () => {
  const files = [
    { rel: 'app/bad.ts', source: "const m = require('../content/learning-v2-course/plan.json');" },
    { rel: 'app/ok.ts', source: "const m = require('../content/learning-v2-course/activation/en/x.json');" },
    { rel: 'app/plain.ts', source: "import x from './plain_helper';" },
  ];
  assert.deepEqual(findIgnoredImports(files, EASIGNORE), [
    { file: 'app/bad.ts', specifier: '../content/learning-v2-course/plan.json', target: 'content/learning-v2-course/plan.json' },
  ]);
});

test('the old blanket "/content/" rule would have caught the Codex manifest import', () => {
  const files = [{ rel: 'app/learning_v2_factory_runtime_audio_omissions_v1.ts', source: "require('../content/learning-v2-course/activation/en/runtime-audio-omissions.v1.json')" }];
  assert.equal(findIgnoredImports(files, '/content/\n').length, 1);
  assert.equal(findIgnoredImports(files, EASIGNORE).length, 0);
});

test('repository .easignore keeps the activation manifests and release_precheck runs the gate', () => {
  const easignore = read('.easignore');
  assert.match(easignore, /^!\/content\/learning-v2-course\/activation\/$/m);
  assert.doesNotMatch(easignore, /^\/content\/$/m);
  assert.match(read('scripts/release_precheck.mjs'), /scripts\/easignore_runtime_imports_gate\.mjs/);
});

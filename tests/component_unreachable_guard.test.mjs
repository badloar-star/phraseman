// Сторож доказательства component_unreachable (координатор 26.10): строка реестра «экрана нет в выпуске», потому что
// компонент нигде не импортируется. Краснеет, как только у такого компонента появился импорт в рабочем коде.
// Запуск: node --test tests/component_unreachable_guard.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { componentImporters, evaluateRegistry } from '../scripts/visual_parity_gate.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REGISTRY = path.join(ROOT, 'docs/phraseman-2.0/registries/visual_parity.json');

function unreachableRows() {
  const registry = JSON.parse(fs.readFileSync(REGISTRY, 'utf8'));
  return (registry.rows ?? []).filter((row) => row?.release_surface_proof?.kind === 'component_unreachable');
}

test('настоящий реестр: ни один компонент с доказательством component_unreachable не импортируется рабочим кодом', () => {
  for (const row of unreachableRows()) {
    for (const component of row.release_surface_proof.components ?? []) {
      assert.ok(fs.existsSync(path.join(ROOT, component)), `${row.id}: нет файла ${component}`);
      assert.deepEqual(componentImporters(ROOT, component), [], `${row.id}: ${component} снова достижим — строка реестра врёт`);
    }
  }
});

function sandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'unreachable-'));
  for (const sub of ['app', 'components/old', 'tests']) fs.mkdirSync(path.join(dir, sub), { recursive: true });
  fs.writeFileSync(path.join(dir, 'components/old/RetiredScreen.tsx'), 'export default function RetiredScreen() { return null; }\n');
  fs.writeFileSync(path.join(dir, 'app/home.tsx'), "import X from '../components/other';\nexport default X;\n");
  fs.writeFileSync(path.join(dir, 'tests/guard.test.mjs'), '// сторож component_unreachable\n');
  return dir;
}
const row = (proof) => ({ id: 'retired-001', screen: 'Экран', state: 'Снят', status: 'no_release_surface', reviewed_by: 'coordinator', release_surface_proof: proof });
const PROOF = { kind: 'component_unreachable', components: ['components/old/RetiredScreen.tsx'], guard_test: 'tests/guard.test.mjs' };
const codes = (result) => result.violations.map((v) => v.code);
const run = (dir, proof) => evaluateRegistry(dir, { rows: [row(proof)] }, { runGit: () => '' });

test('компонент без импортов — доказательство принимается', () => {
  const result = run(sandbox(), PROOF);
  assert.equal(result.ok, true, JSON.stringify(result.violations));
});

test('появился импорт (относительный, через @/, require или lazy import) — гейт краснеет и называет импортёра', () => {
  for (const line of [
    "import RetiredScreen from '../components/old/RetiredScreen';",
    "import RetiredScreen from '@/components/old/RetiredScreen';",
    "const RetiredScreen = require('../components/old/RetiredScreen.tsx');",
    "const Lazy = React.lazy(() => import('../components/old/RetiredScreen'));",
  ]) {
    const dir = sandbox();
    fs.writeFileSync(path.join(dir, 'app/revived.tsx'), `${line}\nexport default 1;\n`);
    assert.deepEqual(componentImporters(dir, 'components/old/RetiredScreen.tsx'), ['app/revived.tsx'], line);
    assert.deepEqual(codes(run(dir, PROOF)), ['release_surface_component_imported'], line);
  }
});

test('импорт из теста не делает компонент достижимым; нет файла / нет сторожа / пустой список — нарушения', () => {
  const dir = sandbox();
  fs.writeFileSync(path.join(dir, 'app/RetiredScreen.test.tsx'), "import R from '../components/old/RetiredScreen';\n");
  assert.equal(run(dir, PROOF).ok, true);
  assert.deepEqual(codes(run(dir, { ...PROOF, components: ['components/old/Gone.tsx'] })), ['release_surface_component_missing']);
  assert.deepEqual(codes(run(dir, { ...PROOF, guard_test: 'tests/none.test.mjs' })), ['release_surface_guard_missing']);
  assert.deepEqual(codes(run(dir, { ...PROOF, components: [] })), ['release_surface_components_missing']);
});

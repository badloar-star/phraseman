// Контракт плана Б R1 (docs/phraseman-2.0/R1_PLAN_B_HIDE_V2.md): гейты V2 №3/№4 «неприменимы» только при PHRASEMAN_R1_HIDE_V2=1
// И потолке выпущенных занятий 0; без переменной — запускаются как раньше; precheck и сервер EAS зовут обёртку.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { planBVerdict, readBundleCeiling, readVisibilitySwitch } from '../scripts/learning_v2_plan_b_gates.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('verdict: without the env the gates run; with it only a zero ceiling is not applicable', () => {
  assert.deepEqual(planBVerdict({ hide: false, ceiling: 0 }), { kind: 'run_gates' });
  assert.deepEqual(planBVerdict({ hide: false, ceiling: 7 }), { kind: 'run_gates' });
  assert.deepEqual(planBVerdict({ hide: true, ceiling: 0 }), { kind: 'not_applicable', by: 'ceiling0' });
  assert.equal(planBVerdict({ hide: true, ceiling: 3 }).kind, 'refuse');
  assert.equal(planBVerdict({ hide: true, ceiling: null }).kind, 'refuse');
});

// зачем (координатор 14.10): рубильник «V2 скрыт» тоже делает гейты неприменимыми — при любом потолке; без переменной гейты идут.
test('verdict: the visibility switch hides V2 at any ceiling, but only when plan B is declared', () => {
  assert.deepEqual(planBVerdict({ hide: true, ceiling: 4, switchHidden: true }), { kind: 'not_applicable', by: 'switch' });
  assert.deepEqual(planBVerdict({ hide: true, ceiling: null, switchHidden: true }), { kind: 'not_applicable', by: 'switch' });
  assert.equal(planBVerdict({ hide: true, ceiling: 4, switchHidden: false }).kind, 'refuse');
  assert.deepEqual(planBVerdict({ hide: false, ceiling: 4, switchHidden: true }), { kind: 'run_gates' });
  assert.equal(readVisibilitySwitch('export const LEARNING_V2_HIDDEN: boolean = true;'), true);
  assert.equal(readVisibilitySwitch('export const LEARNING_V2_HIDDEN: boolean = false;'), false);
  assert.equal(readVisibilitySwitch('nothing'), null);
  assert.equal(typeof readVisibilitySwitch(read('app/learning_v2_visibility_switch.ts')), 'boolean');
});

test('reads the bundle ceiling from the generated availability file', () => {
  assert.equal(readBundleCeiling('export const LEARNING_V2_BUNDLE_CONTIGUOUS_CEILING_V1 = 12;'), 12);
  assert.equal(readBundleCeiling('nothing here'), null);
  assert.equal(typeof readBundleCeiling(read('app/learning_v2_bundle_availability_v1.generated.ts')), 'number');
});

test('release precheck and the EAS post-install both go through the wrapper, plan B is off by default', () => {
  const precheck = read('scripts/release_precheck.mjs');
  assert.match(precheck, /script: 'scripts\/learning_v2_plan_b_gates\.mjs'/);
  assert.doesNotMatch(precheck, /script: 'scripts\/learning_v2_release_parity_gate\.mjs'/);
  assert.doesNotMatch(precheck, /script: 'scripts\/learning_v2_audio_coverage_gate\.mjs'/);
  const pkg = JSON.parse(read('package.json'));
  assert.match(pkg.scripts['eas-build-post-install'], /node scripts\/learning_v2_plan_b_gates\.mjs/);
  assert.doesNotMatch(pkg.scripts['eas-build-post-install'], /learning_v2_audio_coverage_gate|learning-v2:release-parity-gate/);
  assert.doesNotMatch(read('eas.json'), /PHRASEMAN_R1_HIDE_V2/);
});

test('lessons tab never opens V2 without released sessions, even from the direct route', () => {
  const lessons = read('app/(tabs)/lessons.tsx');
  // зачем (R92, 17.10): условие входа учитывает и язык интерфейса; причина ceiling0 остаётся для потолка 0
  assert.match(lessons, /if \(initial === "v2" && !learningV2CanOpen\) \{\s*console\.warn\(`\[V2-ROUTE\] reason=\$\{LEARNING_V2_COURSE_CAN_BE_OPENED_MANUALLY \? "ui_lang_without_v2" : "ceiling0"\}[^`]*`\);[^\n]*\n\s*return "lessons";/);
});

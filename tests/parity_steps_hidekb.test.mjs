// Шаг `hidekb` робота (scripts/parity_steps.mjs): убрать экранную клавиатуру ТОЛЬКО если она показана.
// зачем (Макеты 12.10, сбой Сверки): `back` без клавиатуры выходит с экрана — кадры settings-gap-023/profile-015 оказывались на Главной.
// Запуск: node --test tests/parity_steps_hidekb.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSteps, runSteps } from '../scripts/parity_steps.mjs';

test('hidekb разбирается как шаг без цели', () => {
  assert.deepEqual(parseSteps('type:Test; hidekb; tap:#x'), [{ op: 'type', value: 'Test' }, { op: 'hidekb', value: '' }, { op: 'tap', value: '#x' }]);
});

const fakeRun = (shown, calls) => (args) => {
  calls.push(args.join(' '));
  if (args.join(' ') === 'shell dumpsys input_method') return `... mInputShown=${shown ? 'true' : 'false'} ...`;
  return '';
};

test('hidekb: клавиатура показана — жмёт назад', async () => {
  const calls = [];
  await runSteps(fakeRun(true, calls), parseSteps('hidekb'), { afterStepMs: 0 });
  assert.ok(calls.includes('shell input keyevent 4'), calls.join('\n'));
});

test('hidekb: клавиатуры нет — ничего не нажимает (иначе back уходит с экрана)', async () => {
  const calls = [];
  await runSteps(fakeRun(false, calls), parseSteps('hidekb'), { afterStepMs: 0 });
  assert.ok(!calls.some((c) => c.includes('keyevent')), calls.join('\n'));
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyRecord, coinLanesOf, groupLosersByRoot, planText, reportText, resolveTarget,
} from './coin_reconcile_merged_losers_count.mjs';

// Пакет 8S: скрипт только читает; прод — только с явной командой владельца/координатора.

test('без цели — только план, без сети', () => {
  assert.deepEqual(resolveTarget({}, {}), { mode: 'plan', deep: false });
  assert.match(planText(), /identityHidden == true/);
  assert.match(planText(), /coinReconcileV1/);
});

test('запись и прод без команды владельца запрещены; эмулятор с прод-проектом — нет', () => {
  for (const flag of ['write', 'fix', 'delete', 'apply', 'execute', 'repair', 'grant', 'raise']) {
    assert.ok('error' in resolveTarget({ [flag]: true }, {}), flag);
  }
  assert.ok('error' in resolveTarget({ project: 'phraseman-ea0b3' }, {}));
  assert.ok('error' in resolveTarget({ 'owner-command': 'посчитай слитых со спинами' }, {}));
  assert.ok('error' in resolveTarget({ project: 'phraseman-ea0b3', 'owner-command': 'посчитай' }, {}));
  assert.ok('error' in resolveTarget({ project: 'phraseman-ea0b3', 'owner-command': 'посчитай слитых со спинами' }, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }));
  assert.deepEqual(
    resolveTarget({ project: 'phraseman-ea0b3', 'owner-command': 'посчитай слитых со спинами', deep: true }, {}),
    { mode: 'prod', projectId: 'phraseman-ea0b3', deep: true },
  );
  assert.ok('error' in resolveTarget({ emulator: true, project: 'x-project' }, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }));
});

test('цепочки сворачиваются до корня; цикл не зависает и считается битым', () => {
  const { groups, broken } = groupLosersByRoot([
    { id: 'a', canonical: 'b' }, { id: 'b', canonical: 'w' }, { id: 'c', canonical: 'w' },
    { id: 'x', canonical: 'y' }, { id: 'y', canonical: 'x' },
    { id: 'self', canonical: 'self' }, { id: 'empty', canonical: '' },
  ]);
  assert.deepEqual([...groups.entries()], [['w', ['a', 'b', 'c']]]);
  assert.equal(broken, 2);
});

test('запись до 8S — без mergedLoserCount; после — с ним', () => {
  assert.equal(classifyRecord(undefined), 'none');
  assert.equal(classifyRecord({ schemaVersion: 1, status: 'raised' }), 'pre_8s');
  assert.equal(classifyRecord({ schemaVersion: 1, status: 'raised', mergedLoserCount: 0 }), 'post_8s');
});

test('монетные дорожки — та же форма, что в сверке', () => {
  assert.deepEqual(coinLanesOf('r1', { deliveries: {
    base: { state: 'delivered', selectedGiftId: 'stars_500' },
    premium: { state: 'expired', selectedGiftId: 'stars_100' },
  } }), [{ opId: 'level_spin:r1.base', amount: 500 }]);
  assert.deepEqual(coinLanesOf('r2', { deliveries: { base: { state: 'delivered', selectedGiftId: 'stars_2000' } } }), []);
});

test('отчёт — только числа', () => {
  const text = reportText({ hidden_total: 12, pre_8s_roots_with_loser_spin_results: 3 });
  assert.match(text, /pre_8s_roots_with_loser_spin_results=3/);
  assert.doesNotMatch(text, /=[^0-9\n]/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { planText, reportText, resolveTarget } from './progress_migrate_marker_count.mjs';

// Пакет 8G: скрипт только читает; прод — только с командой владельца.

test('без цели — только план, без сети', () => {
  assert.deepEqual(resolveTarget({}, {}), { mode: 'plan' });
  assert.match(planText(), /count\(users\)/);
  assert.match(planText(), /progress_migrations/);
});

test('запись и прод без команды владельца запрещены; эмулятор с прод-проектом — нет', () => {
  for (const flag of ['write', 'fix', 'delete', 'apply', 'execute', 'repair']) {
    assert.ok('error' in resolveTarget({ [flag]: true }, {}), flag);
  }
  assert.ok('error' in resolveTarget({ project: 'phraseman-ea0b3' }, {}));
  assert.ok('error' in resolveTarget({ project: 'phraseman-ea0b3', 'owner-command': 'посчитай' }, {}));
  assert.ok('error' in resolveTarget({ project: 'phraseman-ea0b3', 'owner-command': 'посчитай пользователей без маркера' }, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }));
  assert.deepEqual(resolveTarget({ project: 'phraseman-ea0b3', 'owner-command': 'посчитай пользователей без маркера' }, {}), { mode: 'prod', projectId: 'phraseman-ea0b3' });
  assert.ok('error' in resolveTarget({ emulator: true, project: 'x-project' }, { FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' }));
});

test('отчёт — только числа', () => {
  const text = reportText({ users_total: 120, migration_markers: 100, users_server_authoritative: 90 });
  assert.match(text, /users_without_marker_estimate=20/);
  assert.doesNotMatch(text, /[a-zA-Z0-9]{20,}/);
});

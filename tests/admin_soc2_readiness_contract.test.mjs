import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('admin/v2/legacy.html', 'utf8');

test('admin exposes an actionable SOC 2 readiness workbench without product writes', () => {
  assert.match(source, /switchTab\('soc2-readiness'\)/);
  assert.match(source, /SOC 2 \/ Готовность/);

  const start = source.indexOf('<!-- SOC2 READINESS TAB -->');
  const end = source.indexOf('<!-- \/SOC2 READINESS TAB -->');
  assert.ok(start >= 0 && end > start, 'soc2_readiness_panel_markers_missing');
  const panel = source.slice(start, end);

  assert.match(panel, /не официальный SOC 2-отчёт/);
  assert.match(panel, /Контроли/);
  assert.match(panel, />17</);
  assert.match(panel, /Выполнено в журнале/);
  assert.match(panel, /soc2-completed-count/);
  assert.match(source, /Начать проверку/);
  assert.match(source, /Добавить доказательство/);
  assert.match(panel, /Экспорт журнала/);
  assert.match(source, /data-soc2-control-id=/);

  assert.match(source, /SOC2_READINESS_STORAGE_KEY/);
  assert.match(source, /ADMIN_TAB_KEYS = \[.*'soc2-readiness'/s);
  assert.doesNotMatch(source, /switchTab\('soc2-readiness'\)[^\n]*только чтение/);
  assert.match(source, /function soc2StartControl\(/);
  assert.match(source, /Новая проверка/);
  assert.match(source, /function soc2CompleteControl\(/);
  assert.match(source, /function exportSoc2ReadinessJournal\(/);
  const runtimeStart = source.indexOf('<script id="pm-soc2-readiness-runtime">');
  const runtimeEnd = source.indexOf('</script>', runtimeStart);
  assert.ok(runtimeStart >= 0 && runtimeEnd > runtimeStart, 'soc2_runtime_missing');
  const runtime = source.slice(runtimeStart, runtimeEnd);
  assert.doesNotMatch(runtime, /setDoc|addDoc|updateDoc|deleteDoc|httpsCallable/);
  assert.match(runtime, /Array\.isArray\(saved\.controls\)/);
  assert.match(runtime, /saved\.controls\.reduce/);
});

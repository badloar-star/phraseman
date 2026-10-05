import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source';

const legacy = normalizeEol(fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8'));

// зачем (04.10): в живой админке порядок секций поменялся, поэтому конец функции ищем
// по закрытию на втором отступе, а не по соседнему комментарию.
function functionBlock(startMarker: string): string {
  const start = legacy.indexOf(startMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  const tail = legacy.slice(start);
  const close = /\n {2}\}/.exec(tail);
  expect(close).not.toBeNull();
  return tail.slice(0, (close as RegExpExecArray).index);
}

describe('Legacy admin specialized Remote Config writers', () => {
  test('live admin has no direct Remote Config document or history writes', () => {
    expect(legacy).not.toMatch(/setDoc\s*\(\s*doc\s*\(\s*db\s*,\s*['"]remote_config['"]\s*,\s*['"]app['"]\s*\)/);
    expect(legacy).not.toMatch(/addDoc\s*\(\s*collection\s*\(\s*db\s*,\s*['"]remote_config_history['"]\s*\)/);
  });

  test.each([
    ['window.saveControlPanelPremium = async function()', false],
    ['window.saveControlPanelMaintenance = async function()', true],
  ])('%s uses the protected publisher (cached before-values where it diffs)', (start, usesBeforeValues) => {
    const block = functionBlock(start);
    // зачем (04.10): Plus/Free-пульт в 2.0 шлёт целиком свои ветки, before-значения не читает;
    // защита от гонки — expectedRevision внутри publishAdminRemoteConfigPatch (см. callable-контракт).
    if (usesBeforeValues) expect(block).toContain('loadAdminRemoteConfigWorkspace(false)');
    expect(block).toContain('await publishAdminRemoteConfigPatch(');
    expect(block).not.toMatch(/\b(?:getDoc|setDoc|addDoc|logAction)\s*\(/);
  });

  test('specialized publishers submit only their managed branches with generated reasons', () => {
    const premium = functionBlock('window.saveControlPanelPremium = async function()');
    const maintenance = functionBlock('window.saveControlPanelMaintenance = async function()');

    expect(premium).toContain("'Пульт Plus/Free: изменяемые доступы и лимиты'");
    expect(maintenance).toContain("'Технические работы: banner='");
  });

  test('retired weekly boon Remote Config has no admin reader or writer', () => {
    // зачем (04.10): старой admin/legacy.html больше нет — читаем единственную живую админку
    for (const html of [legacy]) {
      expect(html).not.toContain('weekly_boons_config');
      expect(html).not.toContain('loadWeeklyBoons');
      expect(html).not.toContain('saveWeeklyBoons');
      expect(html).not.toContain('loadControlPanelBoons');
    }
  });
});

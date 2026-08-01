import fs from 'node:fs';
import path from 'node:path';

const legacy = fs.readFileSync(path.resolve(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');

function functionBlock(startMarker: string, endMarker: string): string {
  const start = legacy.indexOf(startMarker);
  const end = legacy.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return legacy.slice(start, end);
}

describe('Legacy admin specialized Remote Config writers', () => {
  test('live admin has no direct Remote Config document or history writes', () => {
    expect(legacy).not.toMatch(/setDoc\s*\(\s*doc\s*\(\s*db\s*,\s*['"]remote_config['"]\s*,\s*['"]app['"]\s*\)/);
    expect(legacy).not.toMatch(/addDoc\s*\(\s*collection\s*\(\s*db\s*,\s*['"]remote_config_history['"]\s*\)/);
  });

  test.each([
    ['window.saveControlPanelPremium = async function()', '// ── Пульт: Weekly Boons'],
    ['window.saveWeeklyBoons = async function()', '// ── Пульт: управление ИИ'],
    ['window.saveControlPanelMaintenance = async function()', '// ── Remote Config changelog'],
  ])('%s uses cached before-values and the protected publisher', (start, end) => {
    const block = functionBlock(start, end);
    expect(block).toContain('loadAdminRemoteConfigWorkspace(false)');
    expect(block).toContain('await publishAdminRemoteConfigPatch(');
    expect(block).not.toMatch(/\b(?:getDoc|setDoc|addDoc|logAction)\s*\(/);
  });

  test('specialized publishers submit only their managed branches with generated reasons', () => {
    const premium = functionBlock('window.saveControlPanelPremium = async function()', '// ── Пульт: Weekly Boons');
    const boons = functionBlock('window.saveWeeklyBoons = async function()', '// ── Пульт: управление ИИ');
    const maintenance = functionBlock('window.saveControlPanelMaintenance = async function()', '// ── Remote Config changelog');

    expect(premium).toContain("'Премиум-пульт: '");
    expect(boons).toContain("{ texts: { weekly_boons_config: nextStr } }");
    expect(boons).toContain("'Недельные бонусы: обновлена конфигурация'");
    expect(maintenance).toContain("'Технические работы: banner='");
  });
});

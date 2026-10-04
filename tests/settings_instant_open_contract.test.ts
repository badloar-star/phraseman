import fs from 'node:fs';
import path from 'node:path';

// зачем (PM-214, §141 B): вкладка «Настройки» открывается со снимком строки аккаунта и тумблера напоминаний (память процесса по stableId),
// а не пустой с «прыжком». Тест держит ключевые швы: снимок по владельцу, синхронное начальное значение, фоновое обновление, сброс при смене аккаунта.
const source = fs.readFileSync(path.join(__dirname, '..', 'app', '(tabs)', 'settings.tsx'), 'utf8');

describe('settings instant open (PM-214)', () => {
  test('peek is keyed by the stable owner and logged', () => {
    expect(source).toContain('settingsPeek.owner === owner');
    expect(source).toContain('[SETTINGS-PEEK] read');
  });

  test('linked auth, auth readiness and notification prefs start from the peek', () => {
    expect(source).toContain('useState<LinkedAuth | null>(() => readSettingsPeek()?.linkedAuth ?? null)');
    expect(source).toContain("useState(() => readSettingsPeek()?.linkedAuth !== undefined)");
    expect(source).toContain('React.useState(() => readSettingsPeek()?.notifEnabled ?? false)');
    expect(source).toContain('React.useState(() => readSettingsPeek()?.notifHour ?? 19)');
  });

  test('real data still refreshes in the background and replaces the peek', () => {
    expect(source).toContain('writeSettingsPeek({ linkedAuth: info })');
    expect(source).toContain('writeSettingsPeek({ notifEnabled: s.enabled, notifHour: s.hour })');
    expect(source).toContain('writeSettingsPeek({ notifEnabled: val })');
  });

  test('a network failure keeps the last known row and the peek is dropped on link change and account switch', () => {
    expect(source).toContain('settingsPeek?.linkedAuth === undefined) setLinkedAuth(null)');
    expect(source.split('settingsPeek = null;').length - 1).toBeGreaterThanOrEqual(2);
  });
});

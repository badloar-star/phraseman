import fs from 'fs';
import path from 'path';

describe('settings dev admin gate', () => {
  it('shows the in-app admin panel entry only behind ENABLE_DEV_TOOLS', () => {
    const settingsSource = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'settings.tsx'), 'utf8');
    const adminLabelIndex = settingsSource.indexOf('settings-open-testers');
    // Гейт пишут двумя эквивалентными формами: `{ENABLE_DEV_TOOLS && (` или
    // `{ENABLE_DEV_TOOLS ? (` … `) : null}`. Обе одинаково корректно прячут вход в
    // проде (ENABLE_DEV_TOOLS=false при STORE_RELEASE=1). Инвариант — НАЛИЧИЕ гейта
    // перед строкой входа, а не его синтаксис.
    const guardAnd = settingsSource.lastIndexOf('{ENABLE_DEV_TOOLS && (', adminLabelIndex);
    const guardTernary = settingsSource.lastIndexOf('{ENABLE_DEV_TOOLS ? (', adminLabelIndex);
    const guardIndex = Math.max(guardAnd, guardTernary);
    const nextVipCardIndex = settingsSource.indexOf('{isVip && !isPremium', adminLabelIndex);

    expect(adminLabelIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(-1);
    expect(nextVipCardIndex).toBeGreaterThan(adminLabelIndex);
    expect(guardIndex).toBeLessThan(adminLabelIndex);
    expect(settingsSource.slice(guardIndex, nextVipCardIndex)).toContain('router.push(SETTINGS_TESTERS_ROUTE as any)');
  });

  it('uses Premium access, not store-only Premium, for the active settings card', () => {
    const settingsSource = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'settings.tsx'), 'utf8');

    expect(settingsSource).toContain('const { isPremium, isVip, hasPremiumAccess } = usePremium()');
    expect(settingsSource).toContain('{hasPremiumAccess ? (');
    expect(settingsSource).toContain('Plus доступ активен');
    expect(settingsSource).toContain('Plus access active');
    expect(settingsSource).not.toContain('{isPremium ? (\n          <TouchableOpacity');
  });
});

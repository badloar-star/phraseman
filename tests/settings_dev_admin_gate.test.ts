import fs from 'fs';
import path from 'path';

describe('settings dev admin gate', () => {
  const settingsSource = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'settings.tsx'), 'utf8');

  it('shows the in-app admin panel entry only behind ENABLE_DEV_TOOLS', () => {
    const adminLabelIndex = settingsSource.indexOf('settings-open-testers');
    // Гейт пишут двумя эквивалентными формами: `{ENABLE_DEV_TOOLS && (` или
    // `{ENABLE_DEV_TOOLS ? (` … `) : null}`. Обе одинаково корректно прячут вход в
    // проде (ENABLE_DEV_TOOLS=false при STORE_RELEASE=1). Инвариант — НАЛИЧИЕ гейта
    // перед строкой входа.
    const guardAnd = settingsSource.lastIndexOf('{ENABLE_DEV_TOOLS && (', adminLabelIndex);
    const guardTernary = settingsSource.lastIndexOf('{ENABLE_DEV_TOOLS ? (', adminLabelIndex);
    const guardIndex = Math.max(guardAnd, guardTernary);

    expect(adminLabelIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeGreaterThan(-1);
    expect(guardIndex).toBeLessThan(adminLabelIndex);
    // Строка входа в админку идёт сразу под гейтом.
    expect(settingsSource.slice(guardIndex, adminLabelIndex + 40)).toContain('router.push(SETTINGS_TESTERS_ROUTE as any)');
  });

  it('uses Premium access, not store-only Premium, for the active settings card', () => {
    // Плашка статуса Plus вынесена в переменную premiumPanel, но ветвление —
    // именно по hasPremiumAccess (полный доступ: подписка/VIP/intro), НЕ по
    // store-only isPremium. Инвариант — источник признака и тексты статуса.
    expect(settingsSource).toMatch(/const \{[^}]*hasPremiumAccess[^}]*\} = usePremium\(\)/);
    expect(settingsSource).toContain('const premiumPanel = hasPremiumAccess ? (');
    expect(settingsSource).toContain('Plus доступ активен');
    expect(settingsSource).toContain('Plus access active');
    // Статус-плашку внизу показываем только платным; предложение Plus для фри —
    // отдельно и ВВЕРХУ (после «Профиля»).
    expect(settingsSource).toContain('{hasPremiumAccess ? premiumPanel : null}');
    expect(settingsSource).toContain('{!hasPremiumAccess ? premiumPanel : null}');
  });
});

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
    // Верхняя плашка «Phraseman Plus» ветвится именно по hasPremiumAccess
    // (полный доступ: подписка/VIP/intro), НЕ по store-only isPremium.
    // Инвариант — источник признака и текст статуса.
    // 2026-07-26: подпись plusRowSub удалена (запрет владельца на подписи-расшифровки
    // под названием, редизайн по референсу Bevel) — статус живёт в plusRowLabel
    // («… активирован ✓»), короткий план — в plusRowValue справа.
    expect(settingsSource).toMatch(/const \{[^}]*hasPremiumAccess[^}]*\} = usePremium\(\)/);
    expect(settingsSource).toContain('const plusRowLabel = hasPremiumAccess');
    expect(settingsSource).toContain('const plusRowValue = hasPremiumAccess');
    expect(settingsSource).toContain('if (hasPremiumAccess) {');
    expect(settingsSource).toContain('testID="settings-plus-row"');
    expect(settingsSource).toContain("${L('активирован', 'активовано'");
    // Детали статуса (premiumDetails) показываем только платным.
    expect(settingsSource).toContain('const premiumDetails = hasPremiumAccess && plusAccessDetails.length > 0 ? (');
  });
});

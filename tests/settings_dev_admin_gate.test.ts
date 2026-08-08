import fs from 'fs';
import path from 'path';

describe('settings dev admin gate', () => {
  const settingsSource = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'settings.tsx'), 'utf8');

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

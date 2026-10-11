import fs from 'fs';
import path from 'path';

describe('settings dev admin gate', () => {
  const settingsSource = fs.readFileSync(path.join(process.cwd(), 'app', '(tabs)', 'settings.tsx'), 'utf8');

  it('uses Premium access, not store-only Premium, for the active settings card', () => {
    // Верхняя плашка «Phraseman Plus» ветвится именно по hasPremiumAccess
    // (полный доступ: подписка/VIP/intro), НЕ по store-only isPremium.
    // Инвариант — источник признака и текст статуса.
    // 2026-07-26: подпись plusRowSub удалена (запрет владельца на подписи-расшифровки
    // под названием, редизайн по референсу Bevel). 11.10 (паритет profile.html, макет A): заголовок —
    // «Подписка <тариф>» через tierName (владельцу Pro не писать «Plus», правило 2026-08-03),
    // статус — значением справа: «Не активна» / план / «Активна».
    expect(settingsSource).toMatch(/const \{[^}]*hasPremiumAccess[^}]*\} = usePremium\(\)/);
    expect(settingsSource).toContain('const plusRowLabel = hasPremiumAccess');
    // 11.10 (паритет profile.html, макет A): заголовок всегда «Подписка Plus/Pro», статус — значением справа.
    expect(settingsSource).toContain('const plusRowValue = !hasPremiumAccess');
    expect(settingsSource).toContain('if (hasPremiumAccess) {');
    expect(settingsSource).toContain('testID="settings-plus-row"');
    expect(settingsSource).toContain("L('Не активна', 'Не активна'");
    expect(settingsSource).toContain('L(`Подписка ${tierName}`');
    expect(settingsSource).toContain('const plusRowActiveValue = L(');
    // Детали статуса (premiumDetails) показываем только платным.
    expect(settingsSource).toContain('const premiumDetails = hasPremiumAccess && plusAccessDetails.length > 0 ? (');
  });
});

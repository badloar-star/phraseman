import fs from 'fs';
import path from 'path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'components', 'CleanOnboarding.tsx'), 'utf8');
const promoEntry = fs.readFileSync(path.join(root, 'app', 'promo_code_entry.tsx'), 'utf8');

// Контракт пересобранного пейвола онбординга (владелец, 2026-08-16, паттерн
// Bevel): закрытие крестиком СЛЕВА (= бесплатный путь), меню «···» СПРАВА с
// промокодом, кодом друга и восстановлением, оплата и юртексты — внизу.
describe('onboarding paywall header and codes menu contract', () => {
  it('closes with a left cross that routes to the free mandatory step', () => {
    const paywall = source.slice(
      source.indexOf('const renderOnboardingPaywall'),
      source.indexOf('const renderName'),
    );
    expect(source).toContain("testID={onClose ? 'onboarding-paywall-close' : 'onboarding-back'}");
    expect(paywall).toContain("onClose={() => go('name')}");
    // Прежний back-шеврон на пейволе не рисуем: у экрана цен один выход —
    // закрыть (или купить); истории «назад к триал-обещанию» нет.
    expect(paywall).not.toContain('onBack={back}');
  });

  it('keeps the codes menu on the right with promo, referral, and restore', () => {
    expect(source).toContain('testID="onboarding-paywall-menu"');
    expect(source).toContain('testID="onboarding-paywall-menu-promo"');
    expect(source).toContain('testID="onboarding-paywall-menu-referral"');
    expect(source).toContain('testID="onboarding-paywall-restore"');
    expect(source).toContain('Ввести промокод');
    expect(source).toContain('Код от друга');
    expect(source).toContain('Восстановить покупку');
  });

  it('redeems codes through the real production flows, not copies', () => {
    // Промокод: боевой путь redeem+persist экспортируется из promo_code_entry —
    // онбординг не дублирует запись VIP-снапшота.
    expect(source).toContain("await import('../app/promo_code_entry')");
    expect(source).toContain('redeemPromoCodeWithPersist');
    expect(promoEntry).toContain('export async function redeemPromoCodeWithPersist');
    expect(promoEntry).toContain('persistRedeemedPromoAccess({');
    // Код друга: та же точка входа, что и ручной ввод в /referrals.
    expect(source).toContain("await import('../app/referral_bootstrap')");
    expect(source).toContain('applyManualReferralCode');
    // Успешный промокод делает цены ненужными — уводим на финальный шаг.
    expect(source).toContain("setTimeout(() => { setCodeSheet(null); go('name'); }, 900)");
  });

  it('keeps payment reassurance and legal texts at the bottom of the paywall', () => {
    const paywall = source.slice(
      source.indexOf('const renderOnboardingPaywall'),
      source.indexOf('const renderName'),
    );
    expect(paywall).toContain('Сейчас ничего не спишем — напомним до конца пробного');
    expect(paywall).toContain('Отмена в любой момент в настройках магазина.');
    expect(paywall).toContain('KNOWLY_LEGAL_TERMS_URL');
    expect(paywall).toContain('KNOWLY_LEGAL_PRIVACY_URL');
    expect(paywall).toContain('testID="onboarding-paywall-continue-free"');
  });
});

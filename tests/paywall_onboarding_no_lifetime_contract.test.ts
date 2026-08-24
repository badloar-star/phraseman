// ════════════════════════════════════════════════════════════════════════════
// Контракт: на пейволе ОНБОРДИНГА нет третьего варианта «Phraseman Pro».
//
// Владелец 2026-07-27: новичок на первом платном экране выбирает из ДВУХ планов
// (месяц/год). Разовая покупка ×20 от годовой перегружает решение и роняет
// конверсию. Вне онбординга (после урока, энергия, профиль, win-back) Pro
// остаётся — там пользователь уже вовлечён.
//
// Гейт живёт в ОДНОЙ точке — usePaywallPurchase → lifetimeAvailable, поэтому
// действует сразу на все варианты пейвола A–G, а не на один экран.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';

const source = fs.readFileSync(
  path.join(__dirname, '..', 'app', 'paywall_purchase.ts'),
  'utf8',
);

describe('onboarding paywall hides the lifetime plan', () => {
  it('declares onboarding_plan as a source where lifetime is hidden', () => {
    expect(source).toContain('const LIFETIME_HIDDEN_SOURCES: ReadonlySet<string>');
    expect(source).toContain("new Set(['onboarding', 'onboarding_plan'])");
  });

  it('gates lifetimeAvailable by source, not only by the admin flag', () => {
    expect(source).toContain('!LIFETIME_HIDDEN_SOURCES.has(source)');
    // Прежний безусловный расчёт не должен вернуться.
    expect(source).not.toContain(
      'const lifetimeAvailable = lifetimeEnabled && (!!packages.lifetime || DEV_IAP_BYPASS);',
    );
  });

  it('blocks purchasing a hidden lifetime plan even if selection races', () => {
    expect(source).toContain(
      "if (selected === 'lifetime' && (!isLifetimeButtonEnabled() || LIFETIME_HIDDEN_SOURCES.has(source)))",
    );
  });

  it('falls back to the yearly plan when lifetime becomes unavailable', () => {
    expect(source).toContain("if (!lifetimeAvailable && selected === 'lifetime') setSelected('yearly');");
  });
});

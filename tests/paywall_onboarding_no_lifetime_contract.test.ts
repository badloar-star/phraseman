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
//
// ОБНОВЛЕНО 2026-08-24: владелец снял продажу Pro ПОЛНОСТЬЮ («подписку Pro убери
// целиком»), её место на витрине занял тариф MAX. Гейт по источнику остаётся —
// он переживёт возможный возврат Pro, — но поверх него встала пломба
// LIFETIME_SALE_RETIRED. Уже купившие Pro доступ сохраняют: он держится на
// entitlement RevenueCat, а не на видимости карточки.
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
      "if (selected === 'lifetime' && (LIFETIME_SALE_RETIRED || !isLifetimeButtonEnabled() || LIFETIME_HIDDEN_SOURCES.has(source)))",
    );
  });

  it('falls back to the yearly plan when lifetime becomes unavailable', () => {
    expect(source).toContain("if (!lifetimeAvailable && selected === 'lifetime') setSelected('yearly');");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// Пломба: продажа Phraseman Pro снята с витрины ВЕЗДЕ (владелец 2026-08-24).
// Сторож ловит тихий возврат карточки Pro — например, если кто-то вернёт
// дефолт флага в true, не зная о решении владельца.
// ════════════════════════════════════════════════════════════════════════════
describe('lifetime (Phraseman Pro) sale is retired everywhere', () => {
  it('seals lifetimeAvailable with a constant, not only with the admin flag', () => {
    expect(source).toContain('const LIFETIME_SALE_RETIRED = true;');
    expect(source).toContain('const lifetimeAvailable = !LIFETIME_SALE_RETIRED');
  });

  it('keeps the lifetime purchase code intact so Pro can be restored deliberately', () => {
    // Продажу вернуть можно снятием пломбы — путь покупки намеренно НЕ удалён.
    expect(source).toContain("if (plan === 'lifetime' && !lifetimeAvailable) return;");
  });

  it('ships the flag default as false so no build sells Pro', () => {
    const flags = fs.readFileSync(
      path.join(__dirname, '..', 'app', 'remote_flags.ts'),
      'utf8',
    );
    expect(flags).toContain('lifetime_button_enabled: false,');
  });
});

/**
 * Сторож: цена на пейволе = цена, которая спишется.
 *
 * Владелец 2026-09-04: «чтобы не было ошибок, когда на пейволе написано OFF, а
 * списывается полная цена через N дней» + «на ВСЕХ пейволах появляется новая
 * цена и заметная плашка про скидку».
 *
 * Класс бага, который сторожим: модуль детекта промо-цен стора
 * (premium_store_promo_display) уже существовал, но его НИКТО не звал — попал в
 * репозиторий WIP-снапшотом и остался мёртвым. Это ровно тот класс «механизм
 * есть, а данных не дали», из-за которого пейвол показывал бы обычную цену
 * рядом со словом «скидка».
 */
import fs from 'fs';
import path from 'path';

const read = (...p: string[]): string =>
  fs.readFileSync(path.join(process.cwd(), ...p), 'utf8');

const PAYWALLS = ['a', 'b', 'c', 'd', 'e', 'f', 'g'] as const;

describe('скидка стора доезжает до пейвола честно', () => {
  const hook = read('app', 'paywall_purchase.ts');

  it('детект промо подключён к хуку цен, а не лежит мёртвым', () => {
    expect(hook).toContain('getStorePromoPricing');
    // Промо считается для всех трёх планов: скидка может быть на любом.
    expect(hook).toContain('storePromo');
    expect(hook).toContain('selectedPromo');
  });

  it('источник цены — только стор: никаких флагов и хардкодов процента', () => {
    // Второй источник истины = рассинхрон «написано ≠ списано». Процент скидки
    // обязан приходить из данных стора, а не из константы в коде.
    const promoBlock = hook.slice(hook.indexOf('const storePromo'), hook.indexOf('const perDayLabel'));
    expect(promoBlock).not.toMatch(/discountPercent\s*[:=]\s*\d+/u);
    expect(promoBlock).not.toMatch(/PROMO_(ENABLED|PERCENT)/u);
  });

  it('скидка на пейволе не включает звук', () => {
    expect(hook).not.toContain("'pm.paywall.promo_reveal'");
    expect(hook).not.toContain('soundDirector');
  });

  it('плашка есть на ВСЕХ семи пейволах', () => {
    for (const key of PAYWALLS) {
      const screen = read('app', `paywall_${key}.tsx`);
      expect(screen).toContain('PaywallPromoBanner');
      expect(screen).toContain('promo={p.selectedPromo}');
    }
  });

  it('плашка показывает и цену со скидкой, и обычную, и что будет ПОТОМ', () => {
    // Третья строка обязательна: без неё человек не знает, сколько спишется
    // после промо-периода — ровно та ошибка, из-за которой заводили задачу.
    const banner = read('components', 'paywall', 'PaywallPromoBanner.tsx');
    expect(banner).toContain('promoPriceString');
    expect(banner).toContain('standardPriceString');
    expect(banner).toContain('paywall-promo-after');
    expect(banner).toContain('textDecorationLine');
  });

  it('плашка соблюдает запреты владельца по дизайну', () => {
    const banner = read('components', 'paywall', 'PaywallPromoBanner.tsx');
    // Контейнеры не обводим — разделяем тоном (правило владельца).
    expect(banner).not.toMatch(/borderWidth\s*:/u);
    expect(banner).not.toMatch(/adjustsFontSizeToFit/u);
  });

  it('звук скидки не зарегистрирован и не попадает в бандл', () => {
    const events = read('modules', 'audio', 'sound_events.ts');
    expect(events).not.toContain("'pm.paywall.promo_reveal'");
  });
});

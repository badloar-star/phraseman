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

describe('скидка стора доезжает до пейвола честно', () => {
  const hook = read('app', 'paywall_purchase.ts');

  it('детект промо подключён к хуку цен, а не лежит мёртвым', () => {
    expect(hook).toContain('getStorePromoPricing');
    // Промо считается для всех трёх планов: скидка может быть на любом.
    expect(hook).toContain('storePromo');
    expect(hook).toContain('selectedPromo');
  });

  it('промо привязано к платформе и проверенной iOS eligibility', () => {
    const promoBlock = hook.slice(hook.indexOf('const storePromo'), hook.indexOf('const perDayLabel'));
    expect(promoBlock).toContain('Platform.OS');
    expect(promoBlock).toContain('introEligibility');
    expect(promoBlock).toContain("?? 'unknown'");
  });

  it('чекаут остаётся purchasePackage того же выбранного пакета', () => {
    expect(hook).toContain('Purchases.purchasePackage(pkg)');
    expect(hook).not.toContain('Purchases.purchaseSubscriptionOption(');
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

  // 2026-09-30 (D78): пейволы A–G и их PaywallPromoBanner удалены. Единственный
  // пейвол Plus показывает промо-цену стора прямо на карточке тарифа.
  it('пейвол Plus показывает промо-цену, зачёркнутую обычную и что будет ПОТОМ', () => {
    const screen = read('components', 'paywall', 'PaywallPlusScreen.tsx');
    const plus = read('components', 'paywall', 'PaywallPlus.tsx');
    expect(screen).toContain('p.storePromo.yearly');
    expect(screen).toContain('p.storePromo.monthly');
    // зачем (D158, 11.10): промо-цена стора всегда первая; обычная цена получает «≈ », если она справочная, — поэтому в запасной ветке шаблон, а не голая переменная
    // 25.10 (Ревизор, прогон 05:00): строки тарифов переехали в PaywallPlanRows (коммит 1359f5244 «утверждённые строки Plus», 18.10, макет варианта A) — смысл тот же:
    // в строке крупно промо-цена стора (иначе обычная, с «≈ » для справочной), над ней зачёркнута обычная. Строгость прежняя, поменялось только место проверки.
    const rows = read('components', 'paywall', 'PaywallPlanRows.tsx');
    expect(rows).toContain("const shown = promo?.promoPriceString || `${approx ? '≈ ' : ''}${price}`;");
    expect(rows).toContain('{promo ? <Text style={[S.strike, { color: paint.mutedInk }]}>{promo.standardPriceString}</Text> : null}');
    expect(rows).toMatch(/strike: \{[^}]*textDecorationLine: 'line-through'/u);
    expect(rows).toContain('promo={yearlyPromo}');
    expect(rows).toContain('promo={monthlyPromo}');
    // плашка «Скидка действует сейчас» в PaywallPlus: промо-цена, зачёркнутая обычная и «далее {обычная}»
    expect(plus).toContain('standardPriceString');
    expect(plus).toContain("textDecorationLine: 'line-through'");
    // CTA называет первую реальную платную фазу, подпись — обычную цену после неё.
    expect(plus).toContain('args.yearlyPromo?.promoPriceString || `${args.yearlyApprox ?')
    expect(plus).toContain('fineAfterTrial(lang, args.yearlyPromo.standardPriceString)');
  });

  it('пейвол Plus соблюдает запреты владельца по дизайну', () => {
    const plus = read('components', 'paywall', 'PaywallPlus.tsx');
    expect(plus).not.toMatch(/borderWidth\s*:\s*([2-9]|\d{2,})/u);
    expect(plus).not.toMatch(/adjustsFontSizeToFit/u);
  });

  it('звук скидки не зарегистрирован и не попадает в бандл', () => {
    const events = read('modules', 'audio', 'sound_events.ts');
    expect(events).not.toContain("'pm.paywall.promo_reveal'");
  });
});

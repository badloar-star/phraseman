// ════════════════════════════════════════════════════════════════════════════
// lifetime_purchase.test.ts — кнопка Phraseman Pro (lifetime) на пейволах.
//
// Покрывает «дремлющую» механику: код готов, но кнопка показывается ТОЛЬКО
// когда (а) RevenueCat реально вернул lifetime-пакет И (б) админ-флаг включён.
// Нет продукта в RC → пакета нет → кнопка скрыта (безопасное состояние релиза).
// ════════════════════════════════════════════════════════════════════════════
import type { PurchasesPackage } from 'react-native-purchases';
import { resolvePremiumPackages } from '../app/revenuecat_init';
import { inferPremiumPlanFromProductId } from '../app/premium_revenuecat_state';
import {
  applyRemoteConfigSnapshot,
  isLifetimeButtonEnabled,
  __resetRemoteFlagsForTest,
} from '../app/remote_flags';

/** Минимальный фейковый пакет RevenueCat для resolvePremiumPackages. */
function pkg(packageType: string, identifier: string, priceString = '€99,99'): PurchasesPackage {
  return {
    identifier: packageType,
    packageType,
    product: { identifier, priceString },
  } as unknown as PurchasesPackage;
}

describe('lifetime Phraseman Pro — purchase plumbing', () => {
  describe('inferPremiumPlanFromProductId', () => {
    it('распознаёт lifetime по product id', () => {
      expect(inferPremiumPlanFromProductId('phraseman_lifetime')).toBe('lifetime');
      expect(inferPremiumPlanFromProductId('com.knowly.phraseman.forever')).toBe('lifetime');
      expect(inferPremiumPlanFromProductId('premium_one_time')).toBe('lifetime');
    });
    it('lifetime имеет приоритет над month/year в неоднозначном id', () => {
      // id содержит и "lifetime", и "month" — должно победить lifetime.
      expect(inferPremiumPlanFromProductId('lifetime_unlimited_months')).toBe('lifetime');
    });
    it('подписки по-прежнему распознаются корректно', () => {
      expect(inferPremiumPlanFromProductId('phraseman_yearly')).toBe('yearly');
      expect(inferPremiumPlanFromProductId('phraseman_monthly')).toBe('monthly');
    });
    it('неизвестный id падает в дефолт', () => {
      expect(inferPremiumPlanFromProductId('', 'yearly')).toBe('yearly');
      expect(inferPremiumPlanFromProductId('weird', 'monthly')).toBe('monthly');
    });
  });

  describe('resolvePremiumPackages', () => {
    it('возвращает lifetime по packageType LIFETIME', () => {
      const out = resolvePremiumPackages([
        pkg('MONTHLY', 'phraseman_monthly'),
        pkg('ANNUAL', 'phraseman_yearly'),
        pkg('LIFETIME', 'phraseman_lifetime'),
      ]);
      expect(out.lifetime?.product.identifier).toBe('phraseman_lifetime');
      expect(out.monthly?.product.identifier).toBe('phraseman_monthly');
      expect(out.yearly?.product.identifier).toBe('phraseman_yearly');
    });
    it('возвращает lifetime по id, когда packageType кастомный', () => {
      const out = resolvePremiumPackages([
        pkg('CUSTOM', 'phraseman_lifetime_forever'),
      ]);
      expect(out.lifetime?.product.identifier).toBe('phraseman_lifetime_forever');
    });
    it('БЕЗ lifetime-пакета → lifetime undefined (кнопка скрыта)', () => {
      const out = resolvePremiumPackages([
        pkg('MONTHLY', 'phraseman_monthly'),
        pkg('ANNUAL', 'phraseman_yearly'),
      ]);
      expect(out.lifetime).toBeUndefined();
    });
    it('пустой список → всё undefined', () => {
      const out = resolvePremiumPackages([]);
      expect(out.lifetime).toBeUndefined();
      expect(out.monthly).toBeUndefined();
      expect(out.yearly).toBeUndefined();
    });
  });

  describe('isLifetimeButtonEnabled (админ-флаг)', () => {
    beforeEach(() => __resetRemoteFlagsForTest());

    it('по умолчанию включён (продукт заведён в RC с 2026-06-21)', () => {
      expect(isLifetimeButtonEnabled()).toBe(true);
    });
    it('включается из remote_config', () => {
      applyRemoteConfigSnapshot({ bools: { lifetime_button_enabled: true } });
      expect(isLifetimeButtonEnabled()).toBe(true);
    });
    it('выключается обратно (живой kill кнопки без релиза)', () => {
      applyRemoteConfigSnapshot({ bools: { lifetime_button_enabled: true } });
      expect(isLifetimeButtonEnabled()).toBe(true);
      applyRemoteConfigSnapshot({ bools: { lifetime_button_enabled: false } });
      expect(isLifetimeButtonEnabled()).toBe(false);
    });
  });

  describe('гейт видимости кнопки = флаг И наличие пакета', () => {
    beforeEach(() => __resetRemoteFlagsForTest());

    const withLifetime = resolvePremiumPackages([pkg('LIFETIME', 'phraseman_lifetime')]);
    const withoutLifetime = resolvePremiumPackages([pkg('MONTHLY', 'phraseman_monthly')]);

    it('флаг off (явно выключен в Пульте) + пакет есть → скрыта', () => {
      applyRemoteConfigSnapshot({ bools: { lifetime_button_enabled: false } });
      expect(isLifetimeButtonEnabled() && !!withLifetime.lifetime).toBe(false);
    });
    it('флаг on + пакета нет → скрыта (продукт не заведён в RC)', () => {
      applyRemoteConfigSnapshot({ bools: { lifetime_button_enabled: true } });
      expect(isLifetimeButtonEnabled() && !!withoutLifetime.lifetime).toBe(false);
    });
    it('флаг on + пакет есть → показывается', () => {
      applyRemoteConfigSnapshot({ bools: { lifetime_button_enabled: true } });
      expect(isLifetimeButtonEnabled() && !!withLifetime.lifetime).toBe(true);
    });
  });
});

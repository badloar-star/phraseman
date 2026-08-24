// ════════════════════════════════════════════════════════════════════════════
// lifetime_purchase.test.ts — кнопка Phraseman Pro (lifetime) на пейволах.
//
// Покрывает «дремлющую» механику: код покупки готов и намеренно НЕ удалён,
// но продажа снята с витрины.
//
// ОБНОВЛЕНО 2026-08-24: владелец убрал продажу Pro ПОЛНОСТЬЮ, её место на
// пейволах занял тариф MAX. Дефолт флага теперь FALSE, а поверх флага в
// app/paywall_purchase.ts стоит пломба LIFETIME_SALE_RETIRED — то есть даже
// «флаг on + пакет есть» больше НЕ показывает Pro. Здесь остаётся проверка
// самой сантехники (распознавание продукта, резолв пакетов): она нужна,
// чтобы восстановление покупки у купивших продолжало работать.
// ════════════════════════════════════════════════════════════════════════════
import fs from 'fs';
import path from 'path';
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

    it('по умолчанию ВЫКЛЮЧЕН (продажа Pro снята владельцем 2026-08-24)', () => {
      expect(isLifetimeButtonEnabled()).toBe(false);
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
    // зачем: раньше здесь было «показывается». После снятия продажи (2026-08-24)
    // флаг и пакет — лишь ДВА из трёх условий: третьим стоит пломба
    // LIFETIME_SALE_RETIRED в usePaywallPurchase, и она гасит витрину даже когда
    // оба этих условия выполнены. Проверяем именно это, чтобы тест не создавал
    // ложного впечатления, будто Pro всё ещё продаётся.
    it('флаг on + пакет есть → всё равно НЕ продаётся: сверху пломба', () => {
      applyRemoteConfigSnapshot({ bools: { lifetime_button_enabled: true } });
      expect(isLifetimeButtonEnabled() && !!withLifetime.lifetime).toBe(true);

      const hook = fs.readFileSync(
        path.join(__dirname, '..', 'app', 'paywall_purchase.ts'),
        'utf8',
      );
      expect(hook).toContain('const LIFETIME_SALE_RETIRED = true;');
      expect(hook).toContain('const lifetimeAvailable = !LIFETIME_SALE_RETIRED');
    });
  });
});

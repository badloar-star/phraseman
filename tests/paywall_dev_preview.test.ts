// ════════════════════════════════════════════════════════════════════════════
// paywall_dev_preview.test.ts — плейсхолдеры пейвола для dev-сборки.
//
// Фиксирует: dev-превью даёт непустые цены + валидный lifetime-пакет + активный
// таймер, чтобы кнопка Phraseman Pro и блок urgency были видны в Metro (DEV_IAP_BYPASS),
// где RevenueCat не опрашивается. Реальные расчёты пейвола должны принимать эти
// строки без NaN/пустых значений.
// ════════════════════════════════════════════════════════════════════════════
import {
  DEV_PREVIEW_MONTHLY_PRICE,
  DEV_PREVIEW_YEARLY_PRICE,
  DEV_PREVIEW_YEARLY_PER_MONTH,
  DEV_PREVIEW_LIFETIME_PRICE,
  DEV_PREVIEW_LIFETIME_PACKAGE,
  DEV_PREVIEW_URGENCY,
} from '../app/paywall_dev_preview';
import { computeSavingsPct, computePerDayString, parsePriceNumeric } from '../app/paywall_pricing';
import { getDoubledPrice } from '../app/paywall_urgency';
import { resolvePremiumPackages } from '../app/revenuecat_init';

describe('paywall dev preview placeholders', () => {
  it('все цены — непустые строки', () => {
    for (const p of [
      DEV_PREVIEW_MONTHLY_PRICE,
      DEV_PREVIEW_YEARLY_PRICE,
      DEV_PREVIEW_YEARLY_PER_MONTH,
      DEV_PREVIEW_LIFETIME_PRICE,
    ]) {
      expect(typeof p).toBe('string');
      expect(p.trim().length).toBeGreaterThan(0);
      expect(parsePriceNumeric(p)).not.toBeNull();
    }
  });

  it('цены парсятся в осмысленные расчёты (без NaN)', () => {
    expect(computeSavingsPct({
      yearlyPriceStr: DEV_PREVIEW_YEARLY_PRICE,
      monthlyPriceStr: DEV_PREVIEW_MONTHLY_PRICE,
    })).toBeGreaterThan(0);
    expect(computePerDayString(DEV_PREVIEW_YEARLY_PRICE)).not.toBeNull();
  });

  it('futurePrice (×2) считается из плейсхолдера lifetime → таймер не скрыт', () => {
    expect(getDoubledPrice(DEV_PREVIEW_LIFETIME_PRICE)).not.toBeNull();
  });

  it('urgency-плейсхолдер активен (блок таймера видим)', () => {
    expect(DEV_PREVIEW_URGENCY.isActive).toBe(true);
    expect(DEV_PREVIEW_URGENCY.remainingMs).toBeGreaterThan(0);
    expect(DEV_PREVIEW_URGENCY.remainingFormatted).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  it('фейковый lifetime-пакет распознаётся как lifetime (кнопка Phraseman Pro)', () => {
    const out = resolvePremiumPackages([DEV_PREVIEW_LIFETIME_PACKAGE]);
    expect(out.lifetime?.product.identifier).toBe('phraseman_premium_lifetime_v1');
  });
});

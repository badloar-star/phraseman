/**
 * Утверждённый владельцем сезонный вариант A:
 * - ровный lime-бейдж в хедере Главной;
 * - диагональный −N% на углу цены во всех семи пейволах;
 * - стор, а не Remote Config, остаётся источником цены/процента.
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(ROOT, ...parts), 'utf8');

describe('seasonal offer variant A', () => {
  it('keeps the Home header badge horizontal, lime, and accessible', () => {
    const homeBadge = read('components', 'HomeDiscountBadge.tsx');
    expect(homeBadge).toContain("'#D9FF61'");
    expect(homeBadge).toContain("color=\"#12200A\"");
    expect(homeBadge).toContain('accessibilityRole="button"');
    expect(homeBadge).not.toMatch(/rotate\(/u);
  });

  it('uses one store-fed diagonal corner badge in every shared plan presentation', () => {
    const corner = read('components', 'paywall', 'PaywallPromoCorner.tsx');
    expect(corner).toContain('promoBadgeLabel');
    expect(corner).toContain("rotate: '-10deg'");
    expect(corner).toContain('PaywallBadgePop');
    expect(corner).not.toMatch(/discount_offer_badge_percent|discountPercent\s*[:=]\s*50/u);

    for (const file of ['PaywallPlanCards.tsx', 'PaywallPlanTiles.tsx']) {
      expect(read('components', 'paywall', file)).toContain('PaywallPromoCorner');
      expect(read('components', 'paywall', file)).toContain('promoPriceString');
    }
    expect(read('app', 'paywall_e.tsx')).toContain('PaywallPromoCorner');
  });

  it('passes the selected store promotion into all seven paywall price surfaces', () => {
    for (const letter of ['a', 'b', 'c', 'd', 'e', 'f', 'g']) {
      const screen = read('app', `paywall_${letter}.tsx`);
      expect(screen).toContain('p.selectedPromo');
      // CTA и sticky-панель обязаны называть первую реальную платную фазу,
      // а не стандартную цену, которая начнёт действовать позже.
      expect(screen).toContain('p.selectedPromo?.promoPriceString');
    }
  });

  it('keeps a separate admin control area explicit about store activation', () => {
    const admin = read('admin', 'v2', 'legacy.html');
    expect(admin).toContain('id="cp-seasonal-offer-card"');
    expect(admin).toContain('не активирует скидку в сторах');
    expect(admin).toContain('discount_offer_banner_enabled');
  });
});

import fs from 'fs';
import path from 'path';

const read = (...parts: string[]) => fs.readFileSync(path.join(process.cwd(), ...parts), 'utf8');

describe('level-up annual gift UI contract', () => {
  const layout = read('app', '_layout.tsx');
  const gifts = read('app', 'level_gifts_inventory.tsx');

  it('replaces only the automatic level-up paywall with the saved annual gift toast', () => {
    expect(layout).toContain("level_up_annual_gift_available");
    expect(layout).toContain('getLevelUpAnnualGiftOffer');
    expect(layout).not.toContain("source: 'afterwin_levelup'");
  });

  it('keeps the saved offer reachable from Gifts and gives it a dedicated screen', () => {
    expect(gifts).toContain('loadSavedLevelUpAnnualGiftOffer');
    expect(gifts).toContain("'/level_up_annual_gift_offer'");
    expect(read('app', 'level_up_annual_gift_offer.tsx')).toContain('purchaseLevelUpAnnualGift');
  });

  it('keeps a stable annual-gift status row beside the Plus settings surface', () => {
    const settings = read('app', '(tabs)', 'settings.tsx');
    expect(settings).toContain("from '../level_up_annual_gift'");
    expect(settings).toContain('loadSavedLevelUpAnnualGiftOffer');
    expect(settings).toContain('settings-level-up-annual-gift-status');
    expect(settings).toContain("state === 'trial_pending'");
    expect(settings).toContain("state === 'awaiting_first_paid_renewal'");
    expect(settings).toContain("state === 'granted'");
    expect(settings).toContain('offerExpiresAtMs');
    expect(settings).toContain('formatLevelUpAnnualGiftRemaining');
  });

  it('uses an explicitly dismissible, swipeable annual-only toast', () => {
    const toast = read('components', 'LevelUpAnnualGiftToast.tsx');
    expect(toast).toContain('PanResponder.create');
    expect(toast).toContain('accessibilityLabel');
    expect(toast).toContain("'/level_up_annual_gift_offer'");
    expect(toast).not.toContain('monthly');
  });

  it('states the six-month bonus and eighteen-month total on every gift surface', () => {
    const offer = read('app', 'level_up_annual_gift_offer.tsx');
    const toast = read('components', 'LevelUpAnnualGiftToast.tsx');
    expect(gifts).toContain('+6 месяцев к годовому доступу');
    expect(gifts).not.toContain('+3 месяца к годовому доступу');
    expect(offer).toContain('18 месяцев Premium');
    expect(offer).toContain('добавятся 6 месяцев');
    expect(toast).toContain('18 месяцев за цену года');
  });

  it('keeps the admin preview server-owned, 24-hour, and non-purchasable', () => {
    const admin = read('admin', 'v2', 'legacy.html');
    expect(admin).toContain('adminPreviewLevelUpAnnualGift');
    expect(admin).toContain("getAdminPreviewLevelUpAnnualGiftCallable()({})");
    expect(admin).toContain('Preview only');
    expect(admin).toContain('No purchase, no bonus, and no user record');
    expect(admin).toContain('Gifts');
  });
});

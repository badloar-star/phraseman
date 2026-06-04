import fs from 'fs';
import path from 'path';

describe('PremiumContext VIP event contract', () => {
  const source = fs.readFileSync(path.join(process.cwd(), 'components', 'PremiumContext.tsx'), 'utf8');

  it('updates VIP access immediately when admin activation emits vip_activated', () => {
    const start = source.indexOf("onAppEvent('vip_activated'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf("onAppEvent('vip_deactivated'", start));

    expect(body).toContain('setIsVip(true)');
    expect(body).toContain('setHasPremiumAccess(true)');
    expect(body).toContain('invalidatePremiumCache()');
    expect(body).toContain("syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: true, isPremium: true })");
  });

  it('keeps real Premium access when VIP is revoked', () => {
    const start = source.indexOf("onAppEvent('vip_deactivated'");
    expect(start).toBeGreaterThan(-1);
    const body = source.slice(start, source.indexOf('return () =>', start));

    expect(body).toContain('setIsVip(false)');
    expect(body).toContain('setHasPremiumAccess(isPremium)');
    expect(body).toContain("syncPublicProfileSnapshot({ reason: 'entitlement_change', isVip: false, isPremium })");
  });
});

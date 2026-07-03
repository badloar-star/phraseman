import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Контракт EntitlementExpiredHost — глобальная карточка «Premium/VIP закончился»
 * (закрывает «немое место №1» аудита 2026-06-11).
 *
 * Ловит регрессии: удаление стартовой диффа-детекции (события *_deactivated при
 * естественном истечении НЕ эмитятся — premium_guard.ts:158 пишет storage молча),
 * потерю локалей и отвал монтирования в _layout.
 */
const hostSrc = readFileSync(
  join(__dirname, '..', 'components', 'EntitlementExpiredHost.tsx'),
  'utf8',
);
const layoutSrc = readFileSync(join(__dirname, '..', 'app', '_layout.tsx'), 'utf8');
const arbiterSrc = readFileSync(
  join(__dirname, '..', 'components', 'overlay_arbiter_core.ts'),
  'utf8',
);

describe('EntitlementExpiredHost contract', () => {
  it('mounted in root layout inside OverlayArbiterProvider', () => {
    expect(layoutSrc).toContain("import EntitlementExpiredHost from '../components/EntitlementExpiredHost'");
    expect(layoutSrc).toContain('<EntitlementExpiredHost />');
    const providerOpen = layoutSrc.indexOf('<OverlayArbiterProvider>');
    const providerClose = layoutSrc.indexOf('</OverlayArbiterProvider>');
    const hostAt = layoutSrc.indexOf('<EntitlementExpiredHost />');
    expect(providerOpen).toBeGreaterThan(-1);
    expect(hostAt).toBeGreaterThan(providerOpen);
    expect(hostAt).toBeLessThan(providerClose);
  });

  it('has arbiter slot below streakRevive', () => {
    expect(arbiterSrc).toContain("'entitlementExpired'");
    const priorityBlock = arbiterSrc.slice(
      arbiterSrc.indexOf('OVERLAY_PRIORITY'),
      arbiterSrc.indexOf('EMPTY_OVERLAY_WANTS'),
    );
    expect(priorityBlock.indexOf("'streakRevive'")).toBeLessThan(
      priorityBlock.indexOf("'entitlementExpired'"),
    );
  });

  it('detects natural expiry via storage diff, not only events', () => {
    expect(hostSrc).toContain('getVerifiedRealPremiumStatus');
    expect(hostSrc).toContain('getVerifiedVipStatus');
    expect(hostSrc).toContain('getVerifiedPremiumAccessStatus');
    // Карточка только если подписка реально была активна + анти-спам кулдаун.
    expect(hostSrc).toContain('WAS_ACTIVE_KEY');
    expect(hostSrc).toContain('SHOW_COOLDOWN_MS');
    expect(hostSrc).toContain('hasAnyPlusAccess');
    expect(hostSrc).toContain('await AsyncStorage.removeItem(WAS_ACTIVE_KEY[k]).catch(() => {})');
    // Второй кандидат не перетирает первого в одной сессии.
    expect(hostSrc).toContain('prev ?? k');
  });

  it('keeps full locale coverage for both kinds', () => {
    for (const lang of ['ru', 'uk', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
      expect(hostSrc).toContain(`${lang.replace(/'/g, '')}`);
    }
    // У каждой локали обе ветки: premium и vip.
    const premiumCount = (hostSrc.match(/premium: \{/g) ?? []).length;
    const vipCount = (hostSrc.match(/vip: \{/g) ?? []).length;
    expect(premiumCount).toBe(8);
    expect(vipCount).toBe(8);
  });

  it('routes CTA to paywall with expiry context', () => {
    expect(hostSrc).toContain('navigateAfterModalClose');
    expect(hostSrc).toContain("pathname: '/premium_modal'");
    expect(hostSrc).toContain('premium_expired');
    expect(hostSrc).toContain('vip_expired');
  });

  it('uses Plus wording for the user-facing vip expiry card', () => {
    expect(hostSrc).toContain("kicker: 'Plus-доступ завершился'");
    expect(hostSrc).toContain("title: 'Plus закончился'");
    expect(hostSrc).not.toContain("kicker: 'VIP-доступ завершился'");
    expect(hostSrc).not.toContain("title: 'VIP закончился'");
  });
});

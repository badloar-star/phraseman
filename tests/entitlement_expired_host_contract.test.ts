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
    expect(hostSrc).toContain('accountEntitlementStorageKey');
    // зачем: PM-229 — немой обработчик теперь пишет причину в журнал; значение по умолчанию прежнее
    expect(hostSrc).toMatch(/await AsyncStorage\.removeItem\(wasActiveKey\)\.catch\((\(\) => \{\}|noteSwallowedHandler\('[^']+'\))\)/);
    // Второй кандидат не перетирает первого в одной сессии.
    expect(hostSrc).toContain('prev ?? { kind: k, account: expectedAccount }');
  });

  it('waits for an active account generation and rejects stale entitlement checks', () => {
    // Early boot returns false from premium_guard while stable identity is still
    // uninitialized. That is "not ready", not a verified Plus expiration.
    expect(hostSrc).toContain('captureAccountGeneration');
    expect(hostSrc).toContain('subscribeAccountGeneration');
    expect(hostSrc).toContain("accountGeneration.phase !== 'active'");
    expect(hostSrc).toContain('!accountGeneration.stableId');
    expect(hostSrc).toContain('isCurrentAccountGeneration');
  });

  it('opens the shared paywall with the matching expiry context for the current account', () => {
    expect(hostSrc).toContain('entitlementAccountIsCurrent(pending.account)');
    expect(hostSrc).toContain('openPremiumPaywall(router, {');
    expect(hostSrc).toContain("context: pending.kind === 'premium' ? 'premium_expired' : 'vip_expired'");
    expect(hostSrc).not.toContain('HybridSheetShell');
    expect(hostSrc).not.toContain('PlusLaunchSplashHost');
  });

  // и повторный прогон проверки истечения на каждом старте. Принимаем новый объект только при смене generation/stableId/phase.
  it('account generation state changes only when generation/stableId/phase change', () => {
    expect(hostSrc).toContain(
      'prev.generation === next.generation && prev.stableId === next.stableId && prev.phase === next.phase ? prev : next',
    );
    expect(hostSrc).not.toMatch(/setAccountGeneration\(next\);/);
  });
});

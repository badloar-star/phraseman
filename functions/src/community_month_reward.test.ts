import { buildAccessProjection } from './access_projection';
import { isGiftAccessActive, isRealPlusActive, realPlusUntilMs } from './premium_status';
import { communityPlusExpiry, communityRewardId } from './community_month_reward';

describe('community monthly rewards', () => {
  it('uses the same receipt key on retries', () => {
    expect(communityRewardId('2026-10', 'pack_1')).toBe(communityRewardId('2026-10', 'pack_1'));
    expect(communityRewardId('2026-10', 'pack_1')).not.toBe(communityRewardId('2026-10', 'pack_2'));
  });
  it('adds three calendar months after an existing entitlement without truncating it', () => {
    expect(communityPlusExpiry(Date.UTC(2026, 0, 31), 0)).toBe(Date.UTC(2026, 3, 30));
    expect(communityPlusExpiry(Date.UTC(2026, 0, 1), Date.UTC(2026, 1, 10))).toBe(Date.UTC(2026, 4, 10));
  });
  it('uses the server-owned contest grant in both AI access and native projection', () => {
    const now = Date.UTC(2026, 9, 26);
    const progress = { community_plus_until_ms: String(now + 1000) };
    expect(isGiftAccessActive(progress, now)).toBe(true);
    expect(isRealPlusActive(progress, now)).toBe(true);
    expect(realPlusUntilMs(progress, now)).toBe(now + 1000);
    expect(realPlusUntilMs(progress, now + 1000)).toBeNull();
    expect(buildAccessProjection(progress, now).premiumActive).toBe(true);
    expect(buildAccessProjection(progress, now + 1000).premiumActive).toBe(false);
  });
});

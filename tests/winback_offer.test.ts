import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  shouldShowWinback,
  markWinbackShown,
  recordLastActive,
  WINBACK_INACTIVITY_MS,
} from '../app/winback_offer';

describe('winback_offer', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
  });

  it('не показывает premium-пользователю', async () => {
    await recordLastActive(0);
    const now = WINBACK_INACTIVITY_MS + 10_000;
    expect(await shouldShowWinback({ isPremium: true, nowMs: now })).toBe(false);
  });

  it('не показывает при недавней активности', async () => {
    const t0 = 1_000_000;
    await recordLastActive(t0);
    expect(await shouldShowWinback({ isPremium: false, nowMs: t0 + 1000 })).toBe(false);
  });

  it('показывает после длительной неактивности', async () => {
    const t0 = 1_000_000;
    await recordLastActive(t0);
    const now = t0 + WINBACK_INACTIVITY_MS + 1;
    expect(await shouldShowWinback({ isPremium: false, nowMs: now })).toBe(true);
  });

  it('не показывает дважды (после markWinbackShown в том же окне)', async () => {
    const t0 = 1_000_000;
    await recordLastActive(t0);
    const now = t0 + WINBACK_INACTIVITY_MS + 1;
    await markWinbackShown(now);
    expect(await shouldShowWinback({ isPremium: false, nowMs: now + 100 })).toBe(false);
  });

  it('не показывает если нет записи последней активности', async () => {
    expect(await shouldShowWinback({ isPremium: false, nowMs: 9_999_999_999 })).toBe(false);
  });
});

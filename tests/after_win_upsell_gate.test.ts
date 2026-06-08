import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  canShowAfterWinUpsell,
  markAfterWinUpsellShown,
  AFTER_WIN_UPSELL_COOLDOWN_MS,
} from '../app/after_win_upsell_gate';

describe('after_win_upsell_gate', () => {
  beforeEach(() => {
    (AsyncStorage as unknown as { __reset: () => void }).__reset();
  });

  // реалистичный «сейчас» (как в проде ~1.7e12) — без прошлого показа кулдаун не активен
  const NOW = 1_700_000_000_000;

  it('разрешает показ когда не premium и кулдаун не активен', async () => {
    const ok = await canShowAfterWinUpsell({ isPremium: false, nowMs: NOW });
    expect(ok).toBe(true);
  });

  it('запрещает показ для premium-пользователя', async () => {
    const ok = await canShowAfterWinUpsell({ isPremium: true, nowMs: NOW });
    expect(ok).toBe(false);
  });

  it('запрещает показ внутри кулдауна после markShown', async () => {
    const t0 = 5_000_000;
    await markAfterWinUpsellShown(t0);
    const soon = t0 + AFTER_WIN_UPSELL_COOLDOWN_MS - 1;
    expect(await canShowAfterWinUpsell({ isPremium: false, nowMs: soon })).toBe(false);
  });

  it('снова разрешает показ после истечения кулдауна', async () => {
    const t0 = 5_000_000;
    await markAfterWinUpsellShown(t0);
    const later = t0 + AFTER_WIN_UPSELL_COOLDOWN_MS + 1;
    expect(await canShowAfterWinUpsell({ isPremium: false, nowMs: later })).toBe(true);
  });

  it('не показывает, если сегодня уже показывали обычный пейвол (анти-спам)', async () => {
    const nowMs = 9_000_000;
    // имитируем что streak-пейвол показан сегодня
    const todayKey = new Date(nowMs).toISOString().split('T')[0]!;
    await AsyncStorage.setItem('streak_paywall_shown', todayKey);
    expect(await canShowAfterWinUpsell({ isPremium: false, nowMs })).toBe(false);
  });
});

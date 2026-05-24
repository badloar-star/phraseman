jest.mock('expo-haptics', () => ({
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Soft: 'soft',
    Light: 'light',
    Medium: 'medium',
  },
  selectionAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
}));

import * as Haptics from 'expo-haptics';
import {
  HAPTIC_FEEDBACK_COOLDOWN_MS,
  HAPTIC_TAP_COOLDOWN_MS,
  __hapticsTestHooks,
  hapticSuccess,
  hapticTap,
  setHapticCacheEnabled,
} from '../hooks/use-haptics';

describe('haptics rate limit', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    __hapticsTestHooks.resetRateLimit();
    setHapticCacheEnabled(true);
    jest.spyOn(Date, 'now').mockReturnValue(1_000);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('suppresses repeated success feedback inside the global cooldown', async () => {
    await hapticSuccess();
    await hapticSuccess();

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);

    (Date.now as jest.Mock).mockReturnValue(1_000 + HAPTIC_FEEDBACK_COOLDOWN_MS + 1);
    await hapticSuccess();

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(2);
  });

  it('suppresses repeated tap feedback inside the tap cooldown', async () => {
    await hapticTap();
    await hapticTap();

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);

    (Date.now as jest.Mock).mockReturnValue(1_000 + HAPTIC_TAP_COOLDOWN_MS + 1);
    await hapticTap();

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(2);
  });
});


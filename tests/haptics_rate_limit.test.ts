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
    Heavy: 'heavy',
  },
  selectionAsync: jest.fn(async () => {}),
  notificationAsync: jest.fn(async () => {}),
  impactAsync: jest.fn(async () => {}),
}));

import * as Haptics from 'expo-haptics';
import {
  HAPTIC_FEEDBACK_COOLDOWN_MS,
  HAPTIC_TAP_AFTER_FEEDBACK_GUARD_MS,
  HAPTIC_TAP_COOLDOWN_MS,
  __hapticsTestHooks,
  hapticError,
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

  it('suppresses a light tap that lands right after a strong feedback (anti-stacking)', async () => {
    // Сценарий бага: кнопка даёт лёгкий tap, обработчик ответа — сильный success.
    // Они приходили почти одновременно и складывались в один сильный удар.
    await hapticSuccess();
    await hapticTap();

    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).not.toHaveBeenCalled();

    // За пределами guard-окна tap снова разрешён.
    (Date.now as jest.Mock).mockReturnValue(1_000 + HAPTIC_TAP_AFTER_FEEDBACK_GUARD_MS + 1);
    await hapticTap();

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('lets a strong feedback through even if a tap just fired (feedback wins)', async () => {
    // Обратный порядок: сперва лёгкий tap (нажатие), затем сильный error (неверно).
    // Смысловой сигнал ошибки ДОЛЖЕН пройти — гасится только лишний tap, не фидбэк.
    await hapticTap();
    await hapticError();

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.notificationAsync).toHaveBeenCalledTimes(1);
  });
});


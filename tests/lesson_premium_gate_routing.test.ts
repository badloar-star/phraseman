jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(),
  isTesterNoLimitsActive: jest.fn(),
}));
jest.mock('../app/monetization_policy', () => ({
  lessonPaywallContext: jest.fn((lessonId: number) => `lesson_${lessonId}`),
  requiresPremiumForLesson: jest.fn(),
}));
jest.mock('../app/lesson_lock_system', () => ({
  isLessonUnlockedByEarnedProgress: jest.fn(),
  isLessonUnlockedByPremiumCourse: jest.fn(),
}));
jest.mock('../app/navigation_back', () => ({
  markNextNavigationAsReplace: jest.fn(),
}));
jest.mock('../app/paywall_variant', () => ({
  refreshPaywallAbConfigInBackground: jest.fn(),
  resolvePaywallAbVariantSync: jest.fn(() => ({ variant: 'A' })),
}));

import { getVerifiedPremiumStatus, isTesterNoLimitsActive } from '../app/premium_guard';
import {
  requiresPremiumForLesson,
} from '../app/monetization_policy';
import {
  isLessonUnlockedByEarnedProgress,
  isLessonUnlockedByPremiumCourse,
} from '../app/lesson_lock_system';
import { markNextNavigationAsReplace } from '../app/navigation_back';
import { openLessonGateByRuntime, resolveLessonRuntimeGate } from '../app/lesson_premium_gate';

const mockPremium = getVerifiedPremiumStatus as jest.Mock;
const mockNoLimits = isTesterNoLimitsActive as jest.Mock;
const mockRequiresPremium = requiresPremiumForLesson as jest.Mock;
const mockEarned = isLessonUnlockedByEarnedProgress as jest.Mock;
const mockPremiumCourse = isLessonUnlockedByPremiumCourse as jest.Mock;
const mockMarkReplace = markNextNavigationAsReplace as jest.Mock;

function makeRouter() {
  return { replace: jest.fn() };
}

describe('openLessonGateByRuntime — Free/Plus/pearl policy', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNoLimits.mockResolvedValue(false);
    mockEarned.mockResolvedValue(false);
    mockRequiresPremium.mockImplementation((lessonId: number) => lessonId >= 4);
  });

  it('Free после третьего урока направляется на Plus', async () => {
    mockPremium.mockResolvedValue(false);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 9);

    expect(mockMarkReplace).toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalled();
  });

  it('точная жемчужная покупка доступна без Plus', async () => {
    mockPremium.mockResolvedValue(false);
    mockEarned.mockResolvedValue(true);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 20);

    expect(router.replace).not.toHaveBeenCalled();
    expect(mockPremium).not.toHaveBeenCalled();
  });

  it('у Plus непройденный последовательный урок закрыт прогрессом', async () => {
    mockPremium.mockResolvedValue(true);
    mockPremiumCourse.mockResolvedValue(false);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 20);

    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/lesson_menu' }),
    );
  });

  it('доступный урок → никакой навигации', async () => {
    mockPremium.mockResolvedValue(true);
    mockPremiumCourse.mockResolvedValue(true);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 20);

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('режим тестера "Без ограничений" → доступно, навигации нет', async () => {
    mockNoLimits.mockResolvedValue(true);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 9);

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('старый legacy-cap не оставляет урок открытым после Plus', async () => {
    mockPremium.mockResolvedValue(false);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 6, 'en');

    expect(router.replace).toHaveBeenCalled();
    expect(mockMarkReplace).toHaveBeenCalled();
  });

  it('ошибка чтения Plus-прогресса закрывает прямой доступ', async () => {
    mockPremium.mockResolvedValue(true);
    mockPremiumCourse.mockRejectedValue(new Error('storage unavailable'));

    await expect(resolveLessonRuntimeGate(20)).resolves.toBe('progress_required');
  });

  it('ошибка чтения Plus-прогресса ведёт на экран блокировки', async () => {
    mockPremium.mockResolvedValue(true);
    mockPremiumCourse.mockRejectedValue(new Error('storage unavailable'));

    const router = makeRouter();
    await openLessonGateByRuntime(router, 20);

    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/lesson_menu' }),
    );
    expect(mockMarkReplace).not.toHaveBeenCalled();
  });
});

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(),
  isTesterNoLimitsActive: jest.fn(),
}));
jest.mock('../app/monetization_policy', () => ({
  isLegacyLessonGrandfatheredOpen: jest.fn(),
  lessonPaywallContext: jest.fn((lessonId: number) => `lesson_${lessonId}`),
  requiresPremiumForLesson: jest.fn(),
}));
jest.mock('../app/legacy_free_lesson_access', () => ({
  readLegacyFreeLessonCap: jest.fn(),
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
  isLegacyLessonGrandfatheredOpen,
  requiresPremiumForLesson,
} from '../app/monetization_policy';
import { readLegacyFreeLessonCap } from '../app/legacy_free_lesson_access';
import {
  isLessonUnlockedByEarnedProgress,
  isLessonUnlockedByPremiumCourse,
} from '../app/lesson_lock_system';
import { markNextNavigationAsReplace } from '../app/navigation_back';
import { openLessonGateByRuntime } from '../app/lesson_premium_gate';

const mockPremium = getVerifiedPremiumStatus as jest.Mock;
const mockNoLimits = isTesterNoLimitsActive as jest.Mock;
const mockLegacyOpen = isLegacyLessonGrandfatheredOpen as jest.Mock;
const mockRequiresPremium = requiresPremiumForLesson as jest.Mock;
const mockReadLegacyCap = readLegacyFreeLessonCap as jest.Mock;
const mockEarned = isLessonUnlockedByEarnedProgress as jest.Mock;
const mockPremiumCourse = isLessonUnlockedByPremiumCourse as jest.Mock;
const mockMarkReplace = markNextNavigationAsReplace as jest.Mock;

function makeRouter() {
  return { replace: jest.fn() };
}

describe('openLessonGateByRuntime — основной курс открыт без редиректов', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockNoLimits.mockResolvedValue(false);
    mockReadLegacyCap.mockResolvedValue(3);
    mockLegacyOpen.mockImplementation((lessonId: number, cap: number) => cap > 3 && lessonId <= cap);
  });

  // Владелец 2026-09-17: уроки бесплатны (на оплату не шлём), но закрыты
  // прогрессом — отказ ведёт на промежуточный экран урока, а не на пейвол.
  it('урок 9 без премиума не отправляет на оплату даже при старом premium-флаге', async () => {
    mockPremium.mockResolvedValue(false);
    mockRequiresPremium.mockReturnValue(false); // основной курс бесплатен
    mockEarned.mockResolvedValue(false);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 9);

    expect(mockMarkReplace).not.toHaveBeenCalled();
    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/lesson_menu' }),
    );
  });

  it('отсутствие прогресса закрывает основной урок', async () => {
    mockPremium.mockResolvedValue(false);
    mockRequiresPremium.mockReturnValue(false); // бесплатный урок
    mockEarned.mockResolvedValue(false); // ещё не открыт прогрессом

    const router = makeRouter();
    await openLessonGateByRuntime(router, 4);

    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/lesson_menu' }),
    );
    expect(mockMarkReplace).not.toHaveBeenCalled();
  });

  it('у Plus несданный зачёт закрывает урок', async () => {
    mockPremium.mockResolvedValue(true);
    mockPremiumCourse.mockResolvedValue(false); // уровень закрыт

    const router = makeRouter();
    await openLessonGateByRuntime(router, 20);

    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/lesson_menu' }),
    );
  });

  it('доступный урок → никакой навигации', async () => {
    mockPremium.mockResolvedValue(true);
    mockPremiumCourse.mockResolvedValue(true); // уровень открыт → available

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

  it('allows direct entry inside the finalized legacy cap after Plus expires', async () => {
    mockReadLegacyCap.mockResolvedValue(6);
    mockPremium.mockResolvedValue(false);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 6, 'en');

    expect(router.replace).not.toHaveBeenCalled();
    expect(mockPremium).not.toHaveBeenCalled();
  });

  it('урок сразу над legacy-потолком закрыт прогрессом, но не пейволом', async () => {
    mockReadLegacyCap.mockResolvedValue(6);
    mockPremium.mockResolvedValue(false);
    mockRequiresPremium.mockReturnValue(false); // основной курс бесплатен
    mockEarned.mockResolvedValue(false);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 7, 'en');

    expect(router.replace).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/lesson_menu' }),
    );
    expect(mockMarkReplace).not.toHaveBeenCalled();
  });
});

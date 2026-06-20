import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(),
}));
jest.mock('../app/monetization_policy', () => ({
  lessonPaywallContext: jest.fn((lessonId: number) => `lesson_${lessonId}`),
  requiresPremiumForLesson: jest.fn(),
}));
jest.mock('../app/lesson_lock_system', () => ({
  isLessonUnlockedByEarnedProgress: jest.fn(),
  isLessonUnlockedByPremiumCourse: jest.fn(),
}));

import { getVerifiedPremiumStatus } from '../app/premium_guard';
import { requiresPremiumForLesson } from '../app/monetization_policy';
import {
  isLessonUnlockedByEarnedProgress,
  isLessonUnlockedByPremiumCourse,
} from '../app/lesson_lock_system';
import { openLessonGateByRuntime } from '../app/lesson_premium_gate';

const mockPremium = getVerifiedPremiumStatus as jest.Mock;
const mockRequiresPremium = requiresPremiumForLesson as jest.Mock;
const mockEarned = isLessonUnlockedByEarnedProgress as jest.Mock;
const mockPremiumCourse = isLessonUnlockedByPremiumCourse as jest.Mock;

function makeRouter() {
  return { replace: jest.fn() };
}

describe('openLessonGateByRuntime — премиум-лок ведёт сразу на пейвол', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
  });

  it('премиум-урок без премиума → router.replace на /premium_modal', async () => {
    mockPremium.mockResolvedValue(false);
    mockRequiresPremium.mockReturnValue(true);

    const router = makeRouter();
    await openLessonGateByRuntime(router, 9);

    expect(router.replace).toHaveBeenCalledTimes(1);
    const arg = router.replace.mock.calls[0][0];
    expect(arg.pathname).toBe('/premium_modal');
    expect(arg.params.context).toBe('lesson_9');
    expect(arg.params.lessons_done).toBe('8');
  });

  it('лок по прогрессу (фри, не открыт) → router.replace на /lesson_menu, НЕ на пейвол', async () => {
    mockPremium.mockResolvedValue(false);
    mockRequiresPremium.mockReturnValue(false); // бесплатный урок
    mockEarned.mockResolvedValue(false); // ещё не открыт прогрессом

    const router = makeRouter();
    await openLessonGateByRuntime(router, 4);

    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace.mock.calls[0][0].pathname).toBe('/lesson_menu');
  });

  it('лок по уровню (премиум, уровень не открыт) → router.replace на /lesson_menu', async () => {
    mockPremium.mockResolvedValue(true);
    mockPremiumCourse.mockResolvedValue(false); // уровень закрыт

    const router = makeRouter();
    await openLessonGateByRuntime(router, 20);

    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace.mock.calls[0][0].pathname).toBe('/lesson_menu');
  });

  it('доступный урок → никакой навигации', async () => {
    mockPremium.mockResolvedValue(true);
    mockPremiumCourse.mockResolvedValue(true); // уровень открыт → available

    const router = makeRouter();
    await openLessonGateByRuntime(router, 20);

    expect(router.replace).not.toHaveBeenCalled();
  });

  it('режим тестера "Без ограничений" → доступно, навигации нет', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true'); // tester_no_limits

    const router = makeRouter();
    await openLessonGateByRuntime(router, 9);

    expect(router.replace).not.toHaveBeenCalled();
  });
});

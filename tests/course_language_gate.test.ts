// Сторож (владелец 04.11): охранник урока запирает дополнительный язык нового пользователя (включая урок 1) и ведёт на пейвол language_add;
// Plus, тестер, первый язык и старые пользователи идут прежним путём. Плюс исходные контракты: онбординг фиксирует язык, меню/граница передают язык.
import fs from 'node:fs';
import path from 'node:path';

jest.mock('../app/premium_guard', () => ({
  getVerifiedPremiumStatus: jest.fn(),
  isPremiumAccessDecisionConfirmedForCurrentAccount: jest.fn(),
  isTesterNoLimitsActive: jest.fn(),
}));
jest.mock('../app/monetization_policy', () => ({
  lessonPaywallContext: jest.fn((lessonId: number) => `lesson_${lessonId}`),
  requiresPremiumForLesson: jest.fn((lessonId: number) => lessonId >= 4),
}));
jest.mock('../app/lesson_lock_system', () => ({
  isLessonUnlockedByEarnedProgress: jest.fn(),
  isLessonUnlockedByPremiumCourse: jest.fn(),
}));
jest.mock('../app/navigation_back', () => ({ markNextNavigationAsReplace: jest.fn() }));
const mockOpenPaywall = jest.fn();
jest.mock('../app/paywall_navigation', () => ({ openPremiumPaywall: (...args: unknown[]) => mockOpenPaywall(...args) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getVerifiedPremiumStatus, isPremiumAccessDecisionConfirmedForCurrentAccount, isTesterNoLimitsActive } from '../app/premium_guard';
import { isLessonUnlockedByEarnedProgress, isLessonUnlockedByPremiumCourse } from '../app/lesson_lock_system';
import { PRIMARY_COURSE_LANGUAGE_KEY, __resetCourseLanguageAccessForTests } from '../app/course_language_access';
import { lessonProgressKey } from '../app/target_storage_keys';
import { openLessonGateByRuntime, resolveLessonRuntimeGate } from '../app/lesson_premium_gate';

const premium = getVerifiedPremiumStatus as jest.Mock;
const confirmed = isPremiumAccessDecisionConfirmedForCurrentAccount as jest.Mock;
const tester = isTesterNoLimitsActive as jest.Mock;
const earned = isLessonUnlockedByEarnedProgress as jest.Mock;
const plusCourse = isLessonUnlockedByPremiumCourse as jest.Mock;
const storage = AsyncStorage as unknown as { __reset: () => void };

const writeRecord = (over: Partial<{ primary: string; newUser: boolean }> = {}) =>
  AsyncStorage.setItem(PRIMARY_COURSE_LANGUAGE_KEY, JSON.stringify({ v: 1, primary: 'en', newUser: true, atMs: 1, ...over }));

beforeEach(() => {
  storage.__reset();
  __resetCourseLanguageAccessForTests();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  tester.mockResolvedValue(false);
  confirmed.mockReturnValue(true);
  premium.mockResolvedValue(false);
  earned.mockResolvedValue(false);
  plusCourse.mockResolvedValue(true);
});
afterEach(() => jest.restoreAllMocks());

describe('resolveLessonRuntimeGate — замок дополнительного языка', () => {
  it('новый пользователь без Plus: урок 1 второго языка заперт (premium_required)', async () => {
    await writeRecord();
    await expect(resolveLessonRuntimeGate(1, 'es')).resolves.toBe('premium_required');
    await expect(resolveLessonRuntimeGate(2, 'es')).resolves.toBe('premium_required');
  });
  it('первый язык: урок 1 открыт как раньше', async () => {
    await writeRecord();
    await expect(resolveLessonRuntimeGate(1, 'en')).resolves.toBe('available');
  });
  it('старый пользователь и «нет записи»: ничего не запирается', async () => {
    await writeRecord({ newUser: false });
    await expect(resolveLessonRuntimeGate(1, 'es')).resolves.toBe('available');
    storage.__reset(); __resetCourseLanguageAccessForTests();
    await expect(resolveLessonRuntimeGate(1, 'es')).resolves.toBe('available');
  });
  it('Plus: замок снят, дальше прежнее правило Plus', async () => {
    await writeRecord();
    premium.mockResolvedValue(true);
    await expect(resolveLessonRuntimeGate(1, 'es')).resolves.toBe('available');
    await expect(resolveLessonRuntimeGate(9, 'es')).resolves.toBe('available');
  });
  it('окончание Plus / облачное восстановление: язык с начатым прогрессом остаётся доступным, без прогресса — снова заперт', async () => {
    await writeRecord();
    premium.mockResolvedValue(true);
    await expect(resolveLessonRuntimeGate(1, 'es')).resolves.toBe('available'); // был Plus
    await AsyncStorage.setItem(lessonProgressKey(2, 'es'), '30'); // человек начал язык
    premium.mockResolvedValue(false); // Plus закончился
    __resetCourseLanguageAccessForTests();
    await expect(resolveLessonRuntimeGate(1, 'es')).resolves.toBe('available');
    await expect(resolveLessonRuntimeGate(1, 'fr')).resolves.toBe('premium_required'); // другой язык без прогресса
  });
  it('тестер «без ограничений» не запирается', async () => {
    await writeRecord();
    tester.mockResolvedValue(true);
    await expect(resolveLessonRuntimeGate(1, 'es')).resolves.toBe('available');
  });
  it('доступ ещё не подтверждён (облако) → entitlement_pending, не пейвол', async () => {
    await writeRecord();
    confirmed.mockReturnValue(false);
    await expect(resolveLessonRuntimeGate(1, 'es')).resolves.toBe('entitlement_pending');
  });
});

describe('openLessonGateByRuntime — пейвол «Ещё один язык»', () => {
  it('замок языка ведёт на language_add, обычный платный урок — на контекст урока', async () => {
    await writeRecord();
    const router = { replace: jest.fn() };
    await openLessonGateByRuntime(router, 1, 'es');
    expect(mockOpenPaywall).toHaveBeenCalledWith(router, expect.objectContaining({ context: 'language_add' }), 'replace');

    mockOpenPaywall.mockClear();
    await openLessonGateByRuntime(router, 9, 'en'); // первый язык, урок 9 без Plus → обычный контекст урока
    expect(mockOpenPaywall).toHaveBeenCalledWith(router, expect.objectContaining({ context: 'lesson_9' }), 'replace');
  });
});

describe('исходные контракты', () => {
  const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
  it('онбординг фиксирует первый язык один раз после записи метки времени', () => {
    const src = read('components/CleanOnboarding.tsx');
    expect(src).toContain('await recordPrimaryCourseLanguageAtOnboarding();');
    expect(src.indexOf('[ONBOARDING_COMPLETED_AT_KEY, String(Date.now())]')).toBeLessThan(src.indexOf('await recordPrimaryCourseLanguageAtOnboarding();'));
  });
  it('меню урока и граница прямого входа передают язык на пейвол', () => {
    expect(read('app/lesson_runtime_access_boundary.tsx')).toContain('openLessonPremiumPaywall(router, lessonId, studyTarget)');
    expect(read('app/lesson_menu.tsx')).toContain("isCourseLanguageLockedSync(studyTarget) ? 'language_add'");
    expect(read('app/lesson_menu.tsx')).toContain('resolveCourseLanguageLock(studyTarget)');
  });
  it('ключ записи — только устройство: не в облачном синке', () => {
    const sync = read('app/cloud_sync.ts');
    expect(sync).not.toContain('primary_course_language_v1');
  });
  it('видео, карточки и Learning V2 замок языка не используют', () => {
    for (const rel of ['app/study_languages.ts', 'components/settings/StudyLanguagePicker.tsx', 'app/language_welcome.tsx']) {
      expect(read(rel)).not.toContain('course_language_access');
    }
  });
});

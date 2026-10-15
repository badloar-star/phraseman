// Координатор/Ревизор (d0de15329) 15.10: у платящего загрузочное восстановление идёт дольше 5 с — полная проверка урока
// отвечает premium_required по ещё не доехавшим данным. Граница сверяется с PremiumContext: Plus → урок открыт, Free → пейвол.
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import { act, renderHook } from '@testing-library/react-native';

let mockHasPremiumAccess = false;
const mockOpenPaywall = jest.fn();
const mockOpenGate = jest.fn();

jest.mock('../modules/lesson_first_frame', () => ({ __esModule: true, default: () => null }));
jest.mock('../components/StudyTargetContext', () => ({ useStudyTarget: () => ({ studyTarget: 'en' }) }));
jest.mock('../components/ThemeContext', () => ({ useTheme: () => ({ theme: {} }) }));
jest.mock('../components/PremiumContext', () => ({ usePremium: () => ({ hasPremiumAccess: mockHasPremiumAccess, accessResolved: true }) }));
jest.mock('../app/lesson_premium_gate', () => ({
  resolveLessonRuntimeGate: jest.fn(async () => 'premium_required'),
  openLessonPremiumPaywall: (...args: unknown[]) => mockOpenPaywall(...args),
  openLessonAccessGate: (...args: unknown[]) => mockOpenGate(...args),
}));

import { useLessonRuntimeAccessAuthorization } from '../app/lesson_runtime_access_boundary';

const router = { push: jest.fn(), replace: jest.fn() } as never;

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => jest.restoreAllMocks());

test('полная проверка сказала premium_required, контекст Plus → урок открыт, пейвола нет', async () => {
  mockHasPremiumAccess = true;
  const { result } = await renderHook(() => useLessonRuntimeAccessAuthorization(router, 7, 'en'));
  await act(async () => { await Promise.resolve(); });
  expect(result.current).toBe(true);
  expect(mockOpenPaywall).not.toHaveBeenCalled();
});

test('Free — решение прежнее: пейвол урока, контент не монтируется', async () => {
  mockHasPremiumAccess = false;
  const { result } = await renderHook(() => useLessonRuntimeAccessAuthorization(router, 7, 'en'));
  await act(async () => { await Promise.resolve(); });
  expect(result.current).toBe(false);
  expect(mockOpenPaywall).toHaveBeenCalledWith(router, 7);
});

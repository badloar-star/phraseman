// зачем (владелец 15.10, D196): общий гейт голосовой попытки любого микрофона на одном дневном счётчике Free — решение в кадре тапа (при нуле пейвол ai_voice_input),
// списание одной попытки на реальный старт записи, у Plus ничего не списывается (это решает общий модуль, здесь проверяем проводку хука).
(globalThis as typeof globalThis & { __DEV__?: boolean }).__DEV__ = false;

import { renderHook } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockTrack = jest.fn();
const mockGate = jest.fn();
const mockRecord = jest.fn();
let mockAllowance: { kind: 'plus' | 'limited' | 'unknown'; remaining: number | null; exhausted: boolean; limit: number } = { kind: 'limited', remaining: 3, exhausted: false, limit: 3 };

jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));
jest.mock('../components/PremiumContext', () => ({ usePremium: () => ({ accessResolved: true, hasPremiumAccess: false }) }));
jest.mock('../app/analytics', () => ({ trackEvent: (...args: unknown[]) => mockTrack(...args) }));
jest.mock('../app/voice_daily_allowance', () => ({
  VOICE_LIMIT_PAYWALL_CONTEXT: 'ai_voice_input',
  useVoiceDailyAllowance: () => mockAllowance,
  voiceDailyAllowanceGate: (...args: unknown[]) => mockGate(...args),
  recordVoiceDailyAttempt: (...args: unknown[]) => mockRecord(...args),
}));

import { useVoiceAttemptGate } from '../hooks/use_voice_attempt_gate';

beforeEach(() => {
  jest.clearAllMocks();
  mockAllowance = { kind: 'limited', remaining: 3, exhausted: false, limit: 3 };
  mockGate.mockReturnValue(true);
  jest.spyOn(console, 'log').mockImplementation(() => undefined);
});
afterEach(() => { jest.restoreAllMocks(); });

const mount = () => renderHook(() => useVoiceAttemptGate({ surface: 'lessons', source: 'lesson_speaking' }));

test('остаток есть: тап разрешён, пейвол не открывается, ничего не списано до старта записи', async () => {
  const { result } = await mount();
  expect(result.current.locked).toBe(false);
  expect(result.current.canStartAttempt()).toBe(true);
  expect(mockPush).not.toHaveBeenCalled();
  expect(mockRecord).not.toHaveBeenCalled();
});

test('лимит исчерпан: тап не стартует запись и открывает пейвол ai_voice_input с источником поверхности', async () => {
  mockGate.mockReturnValue(false);
  mockAllowance = { kind: 'limited', remaining: 0, exhausted: true, limit: 3 };
  const { result } = await mount();
  expect(result.current.locked).toBe(true);
  expect(result.current.canStartAttempt()).toBe(false);
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/premium_modal', params: { context: 'ai_voice_input', source: 'lesson_speaking' } });
  expect(mockTrack).toHaveBeenCalledWith('paywall_shown', { context: 'ai_voice_input', source: 'lesson_speaking' });
});

test('старт записи списывает попытку своей поверхности; каждая запись получает свой ключ', async () => {
  const { result } = await mount();
  result.current.commitStartedAttempt();
  result.current.commitStartedAttempt();
  expect(mockRecord).toHaveBeenCalledTimes(2);
  const [surfaceA, keyA, accessA] = mockRecord.mock.calls[0] as [string, string, unknown];
  const [, keyB] = mockRecord.mock.calls[1] as [string, string];
  expect(surfaceA).toBe('lessons');
  expect(keyA).not.toBe(keyB);
  expect(accessA).toEqual({ accessResolved: true, hasPremiumAccess: false });
});

test('tryStartAttempt = проверка + списание; при отказе гейта не списывает', async () => {
  const { result } = await mount();
  expect(result.current.tryStartAttempt()).toBe(true);
  expect(mockRecord).toHaveBeenCalledTimes(1);
  mockRecord.mockClear();
  mockGate.mockReturnValue(false);
  expect(result.current.tryStartAttempt()).toBe(false);
  expect(mockRecord).not.toHaveBeenCalled();
});

test('Plus и «неизвестно» не считаются исчерпанным лимитом (locked = false)', async () => {
  mockAllowance = { kind: 'plus', remaining: null, exhausted: false, limit: 3 };
  expect((await mount()).result.current.locked).toBe(false);
  mockAllowance = { kind: 'unknown', remaining: null, exhausted: false, limit: 3 };
  expect((await mount()).result.current.locked).toBe(false);
});

import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';

const mockPreview = jest.fn();
let mockFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: 'account-a', phase: 'active' }),
  subscribeAccountGeneration: () => ({ remove: jest.fn() }),
}));
jest.mock('../app/monthly_training_sessions', () => ({
  MONTHLY_TRAINING_SESSION_LIMIT: 30,
  previewMonthlyTrainingSessions: (...args: unknown[]) => mockPreview(...args),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => { mockFocusEffect = callback; },
}));

import { useFlashcardTrainingQuotaPreview } from '../hooks/useFlashcardTrainingQuotaPreview';

beforeEach(() => {
  mockPreview.mockReset();
  mockFocusEffect = null;
});

afterEach(async () => {
  await cleanup();
});

test('focus refreshes the local monthly training state after a session start', async () => {
  mockPreview
    .mockResolvedValueOnce({ status: 'allowed', used: 29, limit: 30, resetAt: 123, period: '2026-03', bypass: null })
    .mockResolvedValueOnce({ status: 'exhausted', used: 30, limit: 30, resetAt: 123, period: '2026-03', bypass: null });
  const hook = await renderHook(() => useFlashcardTrainingQuotaPreview());
  await waitFor(() => expect(hook.result.current.used).toBe(29));

  await act(async () => { mockFocusEffect?.(); await Promise.resolve(); });

  await waitFor(() => expect(hook.result.current.status).toBe('exhausted'));
  expect(mockPreview).toHaveBeenCalledTimes(2);
});

test('an exhausted monthly state refreshes once at the local-month boundary', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(1_000);
  try {
    mockPreview
      .mockResolvedValueOnce({ status: 'exhausted', used: 30, limit: 30, resetAt: 2_000, period: '2026-03', bypass: null })
      .mockResolvedValueOnce({ status: 'allowed', used: 0, limit: 30, resetAt: 10_000, period: '2026-04', bypass: null });
    const hook = await renderHook(() => useFlashcardTrainingQuotaPreview());
    await act(async () => { await Promise.resolve(); });
    expect(hook.result.current.status).toBe('exhausted');

    await act(async () => { jest.advanceTimersByTime(1_000); await Promise.resolve(); });

    expect(hook.result.current.status).toBe('allowed');
    expect(mockPreview).toHaveBeenCalledTimes(2);
    await hook.unmount();
  } finally {
    jest.useRealTimers();
  }
});

import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';

const mockPreview = jest.fn();
let mockFocusEffect: (() => void | (() => void)) | null = null;

jest.mock('../components/PremiumContext', () => ({
  usePremium: () => ({ accessResolved: true, hasPremiumAccess: false }),
}));
jest.mock('../app/account_generation', () => ({
  captureAccountGeneration: () => ({ generation: 1, stableId: 'account-a', phase: 'active' }),
  subscribeAccountGeneration: () => ({ remove: jest.fn() }),
}));
jest.mock('../app/revenue_quota_access', () => ({
  previewFlashcardTrainingQuota: (...args: unknown[]) => mockPreview(...args),
}));
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void | (() => void)) => { mockFocusEffect = callback; },
}));

import { configurePhoneStatePracticeBridge } from '../app/phone_state_practice_bridge';
import { useFlashcardTrainingQuotaPreview } from '../hooks/useFlashcardTrainingQuotaPreview';

beforeEach(() => {
  mockPreview.mockReset();
  mockFocusEffect = null;
});

afterEach(async () => {
  await cleanup();
  configurePhoneStatePracticeBridge(null);
});

test('an unavailable cold-start preview retries when the PhoneState runtime becomes ready', async () => {
  mockPreview
    .mockResolvedValueOnce({ status: 'unavailable', used: 0, limit: 3, resetAt: null, period: null, bypass: null })
    .mockResolvedValueOnce({ status: 'allowed', used: 0, limit: 3, resetAt: 123, period: 'ready', bypass: null });
  configurePhoneStatePracticeBridge(null);
  const hook = await renderHook(() => useFlashcardTrainingQuotaPreview());
  await waitFor(() => expect(hook.result.current.status).toBe('unavailable'));
  expect(mockPreview).toHaveBeenCalledTimes(1);

  await act(async () => {
    configurePhoneStatePracticeBridge({
      scope: { stableUid: 'account-a', accountGeneration: 1 },
      deviceId: 'device-a',
      store: {},
      triggerSync: jest.fn(),
    } as never);
  });

  await waitFor(() => expect(hook.result.current.status).toBe('allowed'));
  expect(mockPreview).toHaveBeenCalledTimes(2);
});

test('focus refreshes an allowed mounted preview after a direct third consume exhausted it', async () => {
  mockPreview
    .mockResolvedValueOnce({ status: 'allowed', used: 2, limit: 3, resetAt: 123, period: 'today', bypass: null })
    .mockResolvedValueOnce({ status: 'exhausted', used: 3, limit: 3, resetAt: 123, period: 'today', bypass: null });
  const hook = await renderHook(() => useFlashcardTrainingQuotaPreview());
  await waitFor(() => expect(hook.result.current.status).toBe('allowed'));

  await act(async () => { mockFocusEffect?.(); await Promise.resolve(); });

  await waitFor(() => expect(hook.result.current.status).toBe('exhausted'));
  expect(mockPreview).toHaveBeenCalledTimes(2);
});

test('focus refreshes an exhausted mounted preview after the local-day boundary', async () => {
  mockPreview
    .mockResolvedValueOnce({ status: 'exhausted', used: 3, limit: 3, resetAt: 123, period: 'yesterday', bypass: null })
    .mockResolvedValueOnce({ status: 'allowed', used: 0, limit: 3, resetAt: 456, period: 'today', bypass: null });
  const hook = await renderHook(() => useFlashcardTrainingQuotaPreview());
  await waitFor(() => expect(hook.result.current.status).toBe('exhausted'));

  await act(async () => { mockFocusEffect?.(); await Promise.resolve(); });

  await waitFor(() => expect(hook.result.current.status).toBe('allowed'));
  expect(mockPreview).toHaveBeenCalledTimes(2);
});

test('an exhausted mounted preview refreshes once at its exact reset boundary', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(1_000);
  try {
    mockPreview
      .mockResolvedValueOnce({ status: 'exhausted', used: 3, limit: 3, resetAt: 2_000, period: 'before', bypass: null })
      .mockResolvedValueOnce({ status: 'allowed', used: 0, limit: 3, resetAt: 10_000, period: 'after', bypass: null });
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

test('unmount cancels the pending reset-boundary refresh', async () => {
  jest.useFakeTimers();
  jest.setSystemTime(1_000);
  try {
    mockPreview.mockResolvedValue({ status: 'exhausted', used: 3, limit: 3, resetAt: 2_000, period: 'before', bypass: null });
    const hook = await renderHook(() => useFlashcardTrainingQuotaPreview());
    await act(async () => { await Promise.resolve(); });
    expect(mockPreview).toHaveBeenCalledTimes(1);
    await hook.unmount();

    await act(async () => { jest.advanceTimersByTime(1_000); await Promise.resolve(); });

    expect(mockPreview).toHaveBeenCalledTimes(1);
  } finally {
    jest.useRealTimers();
  }
});

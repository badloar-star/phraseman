import { act, cleanup, renderHook, waitFor } from '@testing-library/react-native';

import { callExplainMistake } from '../app/ai_mistake_explain_client';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
} from '../app/account_generation';
import { useMistakeExplain } from '../app/use_mistake_explain';

let consentGranted = true;
let consentHydrated = true;
let consentDecision = true;
let consentSubscriber: (() => void) | null = null;
let netOnline = true;
let netSubscriber: ((online: boolean) => void) | null = null;
const markLimitShown = jest.fn(async () => undefined);

jest.mock('../app/ai_mistake_explain_client', () => ({
  callExplainMistake: jest.fn(),
  warmExplainMistake: jest.fn(),
}));

jest.mock('../app/ai_explain_consent', () => ({
  hasAiExplainConsentDecision: () => consentDecision,
  isAiExplainConsentGranted: () => consentGranted,
  isAiExplainConsentHydrated: () => consentHydrated,
  recordAiExplainConsentToCloud: jest.fn(async () => undefined),
  setAiExplainConsent: jest.fn(async (next: 'granted' | 'denied') => {
    consentGranted = next === 'granted';
    consentDecision = true;
    consentSubscriber?.();
  }),
  subscribeAiExplainConsent: (listener: () => void) => {
    consentSubscriber = listener;
    return () => { consentSubscriber = null; };
  },
}));

jest.mock('../app/ai_mistake_explain_limit_session', () => ({
  hasShownAiMistakeLimitNoticeToday: jest.fn(async () => false),
  markAiMistakeLimitNoticeShownToday: () => markLimitShown(),
  peekAiMistakeLimitNoticeShownToday: jest.fn(() => false),
}));

jest.mock('../hooks/use-haptics', () => ({
  hapticTap: jest.fn(),
}));

jest.mock('../app/net_status', () => ({
  getNetStatus: () => netOnline ? 'online' : 'offline',
  subscribeNetStatus: (listener: (online: boolean) => void) => {
    netSubscriber = listener;
    return () => { netSubscriber = null; };
  },
}));

jest.mock('../app/mistake_token_resolver', () => ({
  resolveAllMistakeTokens: () => [],
  resolvePhraseMistakeToken: () => undefined,
}));

const callExplainMistakeMock = jest.mocked(callExplainMistake);

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const fullResponse = (text: string, variant: 'full' | 'eli5' = 'full') => ({
  ok: true as const,
  text,
  remainingQuota: 2,
  model: 'test-model',
  variant,
});

describe('useMistakeExplain bundled ELI5 state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callExplainMistakeMock.mockReset();
    jest.useRealTimers();
    consentGranted = true;
    consentHydrated = true;
    consentDecision = true;
    consentSubscriber = null;
    netOnline = true;
    netSubscriber = null;
    __resetAccountGenerationForTests();
    beginAccountGeneration('account-a');
  });

  afterEach(async () => {
    await cleanup();
  });

  it('opens the bundled simple explanation without a second request', async () => {
    callExplainMistakeMock.mockResolvedValue({
      ok: true,
      text: 'Full explanation',
      fullText: 'Full explanation',
      eli5Text: 'Simple explanation',
      remainingQuota: 2,
      model: 'test-model',
      variant: 'full',
    });

    const hook = await renderHook(() => useMistakeExplain({
      active: true,
      phraseKey: 'phrase-1:wrong-answer',
      lessonId: 7,
      phraseId: 'phrase-1',
      studyTarget: 'en',
      interfaceLang: 'ru',
      prompt: 'Greeting',
      userAnswer: 'Hello wrong',
      targetAnswer: 'Hello',
    }));

    await waitFor(() => {
      expect(hook.result.current.aiMistakeState).toBe('ready');
      expect(hook.result.current.eli5.state).toBe('ready');
    });

    expect(hook.result.current.eli5.text).toBe('Simple explanation');
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(1);
    expect(callExplainMistakeMock.mock.calls[0]?.[0].variant).toBe('full');

    await act(async () => {
      hook.result.current.eli5.onOpen();
    });

    expect(hook.result.current.eli5.open).toBe(true);
    expect(hook.result.current.eli5.state).toBe('ready');
    expect(hook.result.current.eli5.text).toBe('Simple explanation');
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(1);
  });

  it('does not warm, request, or retry an explanation while offline', async () => {
    netOnline = false;
    jest.useFakeTimers();
    const { warmExplainMistake } = await import('../app/ai_mistake_explain_client');
    const hook = await renderHook(() => useMistakeExplain(baseInput()));

    await act(async () => { await Promise.resolve(); });
    await act(async () => { hook.result.current.explain(); });
    await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });

    expect(warmExplainMistake).not.toHaveBeenCalled();
    expect(callExplainMistakeMock).not.toHaveBeenCalled();
    expect(hook.result.current.aiMistakeState).not.toBe('loading');
  });

  it('keeps transient failures silent and retries them in the background', async () => {
    jest.useFakeTimers();
    callExplainMistakeMock
      .mockRejectedValueOnce({ code: 'functions/unavailable', message: 'mistake_explain_provider_failed' })
      .mockResolvedValueOnce({
        ok: true,
        text: 'Recovered explanation',
        remainingQuota: 2,
        model: 'test-model',
        variant: 'full',
      });

    const hook = await renderHook(() => useMistakeExplain(baseInput()));

    await act(async () => { await Promise.resolve(); });
    expect(hook.result.current.aiMistakeState).toBe('loading');
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(1);

    await act(async () => { await jest.advanceTimersByTimeAsync(2_000); });

    expect(callExplainMistakeMock).toHaveBeenCalledTimes(2);
    expect(hook.result.current.aiMistakeState).toBe('ready');
    expect(hook.result.current.aiMistakeText).toBe('Recovered explanation');
  });

  it('keeps an unclassified internal failure silent and retries until ready', async () => {
    jest.useFakeTimers();
    callExplainMistakeMock
      .mockRejectedValueOnce({ code: 'functions/internal', message: 'unexpected validator envelope' })
      .mockResolvedValueOnce(fullResponse('Recovered internal explanation'));

    const hook = await renderHook(() => useMistakeExplain(baseInput()));

    await act(async () => { await Promise.resolve(); });
    expect(hook.result.current.aiMistakeState).toBe('loading');
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(1);

    await act(async () => { await jest.advanceTimersByTimeAsync(2_000); });

    expect(callExplainMistakeMock).toHaveBeenCalledTimes(2);
    expect(hook.result.current.aiMistakeState).toBe('ready');
    expect(hook.result.current.aiMistakeText).toBe('Recovered internal explanation');
  });

  it('keeps retrying unclassified failures at the capped delay until ready', async () => {
    jest.useFakeTimers();
    for (let attempt = 0; attempt < 7; attempt += 1) {
      callExplainMistakeMock.mockRejectedValueOnce({
        code: 'functions/internal',
        message: `unexpected failure ${attempt + 1}`,
      });
    }
    callExplainMistakeMock.mockResolvedValueOnce(fullResponse('Recovered after capped retries'));

    const hook = await renderHook(() => useMistakeExplain(baseInput()));
    await act(async () => { await Promise.resolve(); });

    const retryDelays = [2_000, 4_000, 8_000, 16_000, 30_000, 30_000, 30_000];
    for (const [index, delayMs] of retryDelays.entries()) {
      expect(hook.result.current.aiMistakeState).toBe('loading');
      expect(callExplainMistakeMock).toHaveBeenCalledTimes(index + 1);
      await act(async () => { await jest.advanceTimersByTimeAsync(delayMs); });
    }

    expect(callExplainMistakeMock).toHaveBeenCalledTimes(8);
    expect(hook.result.current.aiMistakeState).toBe('ready');
    expect(hook.result.current.aiMistakeText).toBe('Recovered after capped retries');
  });

  it('keeps a dismissed ELI5 request retrying without reopening the modal', async () => {
    jest.useFakeTimers();
    callExplainMistakeMock
      .mockResolvedValueOnce(fullResponse('Full explanation'))
      .mockRejectedValueOnce({ code: 'functions/internal', message: 'unexpected ELI5 failure' })
      .mockResolvedValueOnce(fullResponse('Recovered simple explanation', 'eli5'));

    const hook = await renderHook(() => useMistakeExplain(baseInput()));
    await act(async () => { await Promise.resolve(); });
    expect(hook.result.current.aiMistakeState).toBe('ready');

    await act(async () => { hook.result.current.eli5.onOpen(); });
    expect(hook.result.current.eli5.open).toBe(true);
    await act(async () => { hook.result.current.eli5.onClose(); });
    expect(hook.result.current.eli5.open).toBe(false);

    await act(async () => { await jest.advanceTimersByTimeAsync(2_000); });

    expect(callExplainMistakeMock).toHaveBeenCalledTimes(3);
    expect(hook.result.current.eli5.open).toBe(false);
    expect(hook.result.current.eli5.state).toBe('ready');
    expect(hook.result.current.eli5.text).toBe('Recovered simple explanation');
  });

  it('cancels an old retry when the phrase key changes', async () => {
    jest.useFakeTimers();
    callExplainMistakeMock
      .mockRejectedValueOnce({ code: 'functions/internal', message: 'old phrase failure' })
      .mockResolvedValueOnce(fullResponse('New phrase explanation'));
    const hook = await renderHook(
      ({ phraseKey }: { phraseKey: string }) => useMistakeExplain({ ...baseInput(), phraseKey }),
      { initialProps: { phraseKey: 'phrase-a:wrong' } },
    );
    await act(async () => { await Promise.resolve(); });

    await hook.rerender({ phraseKey: 'phrase-b:wrong' });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });

    expect(callExplainMistakeMock).toHaveBeenCalledTimes(2);
    expect(hook.result.current.aiMistakeState).toBe('ready');
    expect(hook.result.current.aiMistakeText).toBe('New phrase explanation');
  });

  it('cancels an old retry across an account generation change', async () => {
    jest.useFakeTimers();
    callExplainMistakeMock.mockRejectedValue({
      code: 'functions/internal',
      message: 'account-a failure',
    });
    const hook = await renderHook(() => useMistakeExplain(baseInput()));
    await act(async () => { await Promise.resolve(); });

    await act(async () => { beginAccountGeneration('account-b'); });
    await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });

    expect(callExplainMistakeMock).toHaveBeenCalledTimes(1);
    expect(hook.result.current.aiMistakeState).toBe('hidden');
    expect(hook.result.current.eli5.open).toBe(false);
  });

  it('discards an old account success and does not resend its payload under the new account', async () => {
    const oldRequest = deferred<ReturnType<typeof fullResponse>>();
    callExplainMistakeMock.mockImplementationOnce(() => oldRequest.promise);
    const hook = await renderHook(() => useMistakeExplain(baseInput()));
    await waitFor(() => expect(callExplainMistakeMock).toHaveBeenCalledTimes(1));

    await act(async () => { beginAccountGeneration('account-b'); });
    await act(async () => { oldRequest.resolve(fullResponse('Account A explanation')); });

    expect(callExplainMistakeMock).toHaveBeenCalledTimes(1);
    expect(hook.result.current.aiMistakeState).toBe('hidden');
    expect(hook.result.current.aiMistakeText).toBeNull();
  });

  it('cancels and closes a pending ELI5 request when consent is revoked', async () => {
    const pendingEli5 = deferred<ReturnType<typeof fullResponse>>();
    callExplainMistakeMock
      .mockResolvedValueOnce(fullResponse('Full explanation'))
      .mockImplementationOnce(() => pendingEli5.promise);
    const hook = await renderHook(() => useMistakeExplain(baseInput()));
    await waitFor(() => expect(hook.result.current.aiMistakeState).toBe('ready'));

    await act(async () => { hook.result.current.eli5.onOpen(); });
    expect(hook.result.current.eli5.open).toBe(true);

    await act(async () => {
      consentGranted = false;
      consentDecision = true;
      consentSubscriber?.();
    });
    await act(async () => { pendingEli5.resolve(fullResponse('Late simple explanation', 'eli5')); });

    expect(hook.result.current.eli5.open).toBe(false);
    expect(hook.result.current.eli5.state).toBe('idle');
    expect(hook.result.current.eli5.text).toBeNull();
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(2);
  });

  it('stops on the permanent free cap instead of scheduling endless retries', async () => {
    jest.useFakeTimers();
    callExplainMistakeMock.mockRejectedValue({
      code: 'functions/resource-exhausted',
      message: 'explain_free_daily_limit',
    });

    const hook = await renderHook(() => useMistakeExplain(baseInput()));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { await Promise.resolve(); });

    expect(hook.result.current.aiMistakeState).toBe('limit');
    expect(markLimitShown).toHaveBeenCalledTimes(1);

    await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(1);
  });

  it('stops an unbundled ELI5 request on the permanent free cap without retrying', async () => {
    jest.useFakeTimers();
    callExplainMistakeMock
      .mockResolvedValueOnce(fullResponse('Full explanation without a bundle'))
      .mockRejectedValueOnce({
        code: 'functions/resource-exhausted',
        message: 'explain_free_daily_limit',
      });

    const hook = await renderHook(() => useMistakeExplain(baseInput()));
    await act(async () => { await Promise.resolve(); });
    expect(hook.result.current.aiMistakeState).toBe('ready');

    await act(async () => { hook.result.current.eli5.onOpen(); });
    await act(async () => { await Promise.resolve(); });

    expect(hook.result.current.aiMistakeState).toBe('limit');
    expect(hook.result.current.eli5.open).toBe(false);
    expect(hook.result.current.eli5.state).toBe('idle');
    expect(hook.result.current.eli5.text).toBeNull();
    expect(markLimitShown).toHaveBeenCalledTimes(1);

    await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(2);
  });

  it('never adopts account B for account A payload when generation switches before effects flush', async () => {
    callExplainMistakeMock.mockResolvedValue(fullResponse('Must not be requested'));
    let switchedDuringRender = false;

    const hook = await renderHook(() => {
      const result = useMistakeExplain(baseInput());
      if (!switchedDuringRender) {
        switchedDuringRender = true;
        beginAccountGeneration('account-b');
      }
      return result;
    });
    await act(async () => { await Promise.resolve(); });

    expect(callExplainMistakeMock).not.toHaveBeenCalled();
    expect(hook.result.current.aiMistakeState).toBe('hidden');
    expect(hook.result.current.aiMistakeText).toBeNull();
  });

  it('does not run a deferred retry after unmount', async () => {
    jest.useFakeTimers();
    callExplainMistakeMock.mockRejectedValue({ code: 'functions/unavailable', message: 'transport unavailable' });
    const hook = await renderHook(() => useMistakeExplain(baseInput()));
    await act(async () => { await Promise.resolve(); });
    await hook.unmount();

    await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(1);
  });

  it('does not run a deferred retry after the surface becomes inactive', async () => {
    jest.useFakeTimers();
    callExplainMistakeMock.mockRejectedValue({ code: 'functions/unavailable', message: 'transport unavailable' });
    const hook = await renderHook(
      ({ active }: { active: boolean }) => useMistakeExplain(baseInput(active)),
      { initialProps: { active: true } },
    );
    await act(async () => { await Promise.resolve(); });
    await hook.rerender({ active: false });

    await act(async () => { await jest.advanceTimersByTimeAsync(120_000); });
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(1);
    expect(hook.result.current.aiMistakeState).toBe('hidden');
  });

  it('waits for consent hydration and keeps a denied decision fully hidden', async () => {
    consentGranted = false;
    consentHydrated = false;
    consentDecision = false;
    const hook = await renderHook(() => useMistakeExplain(baseInput()));

    expect(hook.result.current.aiMistakeState).toBe('hidden');
    expect(hook.result.current.consentGate.visible).toBe(false);
    expect(callExplainMistakeMock).not.toHaveBeenCalled();

    consentHydrated = true;
    consentDecision = true;
    await act(async () => { consentSubscriber?.(); });

    expect(hook.result.current.aiMistakeState).toBe('hidden');
    expect(hook.result.current.consentGate.visible).toBe(false);
    expect(callExplainMistakeMock).not.toHaveBeenCalled();
  });

  it('ignores an old full success after deactivate-reactivate with the same phrase', async () => {
    const oldRequest = deferred<ReturnType<typeof fullResponse>>();
    const newRequest = deferred<ReturnType<typeof fullResponse>>();
    callExplainMistakeMock
      .mockImplementationOnce(() => oldRequest.promise)
      .mockImplementationOnce(() => newRequest.promise);
    const hook = await renderHook(
      ({ active }: { active: boolean }) => useMistakeExplain(baseInput(active)),
      { initialProps: { active: true } },
    );
    await waitFor(() => expect(callExplainMistakeMock).toHaveBeenCalledTimes(1));

    await hook.rerender({ active: false });
    await hook.rerender({ active: true });
    await waitFor(() => expect(callExplainMistakeMock).toHaveBeenCalledTimes(2));

    await act(async () => { oldRequest.resolve(fullResponse('Old explanation')); });
    expect(hook.result.current.aiMistakeState).toBe('loading');
    expect(hook.result.current.aiMistakeText).toBeNull();

    await act(async () => { newRequest.resolve(fullResponse('New explanation')); });
    expect(hook.result.current.aiMistakeState).toBe('ready');
    expect(hook.result.current.aiMistakeText).toBe('New explanation');
  });

  it('does not schedule a retry from an old full rejection after same-phrase reactivation', async () => {
    jest.useFakeTimers();
    const oldRequest = deferred<ReturnType<typeof fullResponse>>();
    const newRequest = deferred<ReturnType<typeof fullResponse>>();
    callExplainMistakeMock
      .mockImplementationOnce(() => oldRequest.promise)
      .mockImplementationOnce(() => newRequest.promise);
    const hook = await renderHook(
      ({ active }: { active: boolean }) => useMistakeExplain(baseInput(active)),
      { initialProps: { active: true } },
    );
    await act(async () => { await Promise.resolve(); });
    await hook.rerender({ active: false });
    await hook.rerender({ active: true });
    await act(async () => { await Promise.resolve(); });

    await act(async () => { oldRequest.reject({ code: 'functions/unavailable' }); });
    await act(async () => { newRequest.resolve(fullResponse('New explanation')); });
    await act(async () => { await jest.advanceTimersByTimeAsync(2_000); });

    expect(callExplainMistakeMock).toHaveBeenCalledTimes(2);
    expect(hook.result.current.aiMistakeText).toBe('New explanation');
  });

  it('old ELI5 rejection cannot schedule or unlock a newer same-phrase request', async () => {
    jest.useFakeTimers();
    const oldEli5 = deferred<ReturnType<typeof fullResponse>>();
    const newEli5 = deferred<ReturnType<typeof fullResponse>>();
    callExplainMistakeMock
      .mockResolvedValueOnce(fullResponse('First full'))
      .mockImplementationOnce(() => oldEli5.promise)
      .mockResolvedValueOnce(fullResponse('Second full'))
      .mockImplementationOnce(() => newEli5.promise);
    const hook = await renderHook(
      ({ active }: { active: boolean }) => useMistakeExplain(baseInput(active)),
      { initialProps: { active: true } },
    );
    await act(async () => { await Promise.resolve(); });
    await act(async () => { hook.result.current.eli5.onOpen(); });
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(2);

    await hook.rerender({ active: false });
    await hook.rerender({ active: true });
    await act(async () => { await Promise.resolve(); });
    await act(async () => { hook.result.current.eli5.onOpen(); });
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(4);

    await act(async () => { oldEli5.reject({ code: 'functions/unavailable' }); });
    await act(async () => { await jest.advanceTimersByTimeAsync(2_000); });
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(4);
    expect(hook.result.current.eli5.state).toBe('loading');

    await act(async () => { newEli5.resolve(fullResponse('New simple', 'eli5')); });
    expect(hook.result.current.eli5.state).toBe('ready');
    expect(hook.result.current.eli5.text).toBe('New simple');
  });

  it('bundled ELI5 invalidates a separately pending ELI5 request', async () => {
    jest.useFakeTimers();
    const full = deferred<Awaited<ReturnType<typeof callExplainMistake>>>();
    const separateEli5 = deferred<ReturnType<typeof fullResponse>>();
    callExplainMistakeMock
      .mockImplementationOnce(() => full.promise)
      .mockImplementationOnce(() => separateEli5.promise)
      .mockResolvedValue(fullResponse('Unexpected retry', 'eli5'));
    const hook = await renderHook(() => useMistakeExplain(baseInput()));
    await act(async () => { await Promise.resolve(); });
    await act(async () => { hook.result.current.eli5.onOpen(); });
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(2);

    await act(async () => {
      full.resolve({ ...fullResponse('Full explanation'), eli5Text: 'Bundled simple' });
    });
    expect(hook.result.current.eli5.state).toBe('ready');
    expect(hook.result.current.eli5.text).toBe('Bundled simple');

    await act(async () => { separateEli5.reject({ code: 'functions/unavailable' }); });
    await act(async () => { await jest.advanceTimersByTimeAsync(2_000); });

    expect(hook.result.current.eli5.state).toBe('ready');
    expect(hook.result.current.eli5.text).toBe('Bundled simple');
    expect(callExplainMistakeMock).toHaveBeenCalledTimes(2);
  });
});

function baseInput(active = true) {
  return {
    active,
    phraseKey: 'phrase-1:wrong-answer',
    lessonId: 7,
    phraseId: 'phrase-1',
    studyTarget: 'en',
    interfaceLang: 'ru',
    prompt: 'Greeting',
    userAnswer: 'Hello wrong',
    targetAnswer: 'Hello',
  };
}

import { act, cleanup, renderHook } from '@testing-library/react-native';

import { useVoiceCapture } from '../components/learning-v2-lab/kimi/use_voice_capture';

type Listener = (payload?: unknown) => void;

let mockRuntimeActive = true;
const mockListeners = new Map<string, Listener[]>();
const mockSpeech = {
  requestPermissionsAsync: jest.fn<Promise<{ granted: boolean }>, []>(),
  supportsOnDeviceRecognition: jest.fn<Promise<boolean>, []>(),
  start: jest.fn(),
  stop: jest.fn(),
  abort: jest.fn(),
  addListener: jest.fn((event: string, callback: Listener) => {
    const callbacks = mockListeners.get(event) ?? [];
    callbacks.push(callback);
    mockListeners.set(event, callbacks);
    return { remove: jest.fn() };
  }),
};

jest.mock('../hooks/use_runtime_active', () => ({
  useRuntimeActive: () => mockRuntimeActive,
}));
jest.mock('../app/audio_session_coordinator', () => ({
  setManagedAudioMode: jest.fn(async () => undefined),
}));
jest.mock('expo-speech-recognition', () => ({
  ExpoSpeechRecognitionModule: mockSpeech,
}));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function latestListener(event: string): Listener {
  const callbacks = mockListeners.get(event) ?? [];
  const callback = callbacks[callbacks.length - 1];
  if (!callback) throw new Error(`Missing ${event} listener`);
  return callback;
}

describe('Kimi voice capture session lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockListeners.clear();
    mockRuntimeActive = true;
    mockSpeech.supportsOnDeviceRecognition.mockResolvedValue(true);
  });

  afterEach(async () => {
    await cleanup();
    await Promise.resolve();
  });

  test('does not start after a deferred permission resolves while blurred', async () => {
    const permission = deferred<{ granted: boolean }>();
    mockSpeech.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
    const hook = await renderHook(() => useVoiceCapture({ targetText: 'keep going' }));

    let startPromise!: Promise<void>;
    await act(async () => {
      startPromise = hook.result.current.start();
      await Promise.resolve();
    });

    mockRuntimeActive = false;
    await hook.rerender({});
    await act(async () => {
      permission.resolve({ granted: true });
      await startPromise;
    });

    expect(mockSpeech.start).not.toHaveBeenCalled();
    expect(mockSpeech.abort).toHaveBeenCalled();
    expect(hook.result.current.status).toBe('idle');
  });

  test('does not start after the press is released while permission is pending', async () => {
    const permission = deferred<{ granted: boolean }>();
    mockSpeech.requestPermissionsAsync.mockReturnValueOnce(permission.promise);
    const hook = await renderHook(() => useVoiceCapture({ targetText: 'keep going' }));

    let startPromise!: Promise<void>;
    await act(async () => {
      startPromise = hook.result.current.start();
      await Promise.resolve();
      hook.result.current.stop();
    });

    await act(async () => {
      permission.resolve({ granted: true });
      await startPromise;
    });

    expect(mockSpeech.start).not.toHaveBeenCalled();
    expect(hook.result.current.status).toBe('idle');
  });

  test('accepts final callbacks after stop for the current session but ignores queued callbacks from an older session', async () => {
    mockSpeech.requestPermissionsAsync.mockResolvedValue({ granted: true });
    const hook = await renderHook(() => useVoiceCapture({ targetText: 'keep going' }));

    await act(async () => {
      await hook.result.current.start();
    });
    const oldResult = latestListener('result');
    const oldEnd = latestListener('end');
    const oldError = latestListener('error');

    mockRuntimeActive = false;
    await hook.rerender({});
    mockRuntimeActive = true;
    await hook.rerender({});
    await act(async () => {
      await hook.result.current.start();
    });

    await act(async () => {
      oldResult({ results: [{ transcript: 'keep going' }], isFinal: true });
      oldEnd();
      oldError();
      await Promise.resolve();
    });
    expect(hook.result.current.status).toBe('listening');
    expect(hook.result.current.partial).toBe('');
    expect(hook.result.current.result).toBeNull();

    const currentResult = latestListener('result');
    const currentEnd = latestListener('end');
    await act(async () => {
      currentResult({ results: [{ transcript: 'keep' }], isFinal: false });
      hook.result.current.stop();
      currentEnd();
      await Promise.resolve();
    });

    expect(hook.result.current.status).toBe('done');
    expect(hook.result.current.result).toMatchObject({
      transcript: 'keep',
      allMatched: false,
    });
  });
});

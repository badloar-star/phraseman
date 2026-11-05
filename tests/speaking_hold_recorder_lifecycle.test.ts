const mockNative = { init: jest.fn(), start: jest.fn(), stop: jest.fn(), on: jest.fn() };
const mockWrite = jest.fn();
let mockOwnerStop: (() => void) | null = null;
let mockData: ((data: string) => void) | null = null;

jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('@fugood/react-native-audio-pcm-stream', () => ({ __esModule: true, default: mockNative }));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('expo-file-system', () => ({
  Paths: { cache: 'file:///cache' },
  Directory: class { exists = true; create() {} },
  File: class { uri = 'file:///cache/attempt.wav'; write = mockWrite; },
}));
jest.mock('../modules/audio/audio_runtime_arbiter', () => ({
  claimRecordingAudio: (stop: () => void) => {
    mockOwnerStop?.();
    mockOwnerStop = stop;
    return { release: () => { if (mockOwnerStop === stop) mockOwnerStop = null; } };
  },
}));

import { startHoldRecording } from '../app/speaking_hold_recorder';

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  mockWrite.mockReset();
  mockOwnerStop = null;
  mockData = null;
  mockNative.init.mockReturnValue(undefined);
  mockNative.on.mockImplementation((_event: string, callback: (data: string) => void) => {
    mockData = callback;
    return { remove: jest.fn() };
  });
});
afterEach(() => { mockOwnerStop?.(); jest.useRealTimers(); });

test('revoking capture makes its controller inactive; late cleanup cannot stop its successor', async () => {
  const first = startHoldRecording();
  await Promise.resolve();
  const second = startHoldRecording();
  await Promise.resolve();
  expect(first.isActive()).toBe(false);
  const stops = mockNative.stop.mock.calls.length;
  first.cancel();
  await first.stop();
  expect(mockNative.stop).toHaveBeenCalledTimes(stops);
  expect(second.isActive()).toBe(true);
  second.cancel();
});

test('release while native init is pending never starts capture afterwards', async () => {
  let resolveInit!: () => void;
  mockNative.init.mockReturnValue(new Promise<void>((resolve) => { resolveInit = resolve; }));
  const rec = startHoldRecording();
  expect(mockNative.start).not.toHaveBeenCalled();
  await rec.stop();
  resolveInit();
  await Promise.resolve();
  await Promise.resolve();
  expect(mockNative.start).not.toHaveBeenCalled();
});

test('native initialization failure is handled and leaves capture inactive', async () => {
  let rejectInit!: (error: Error) => void;
  // Attach an observer to keep RED from creating an unrelated unhandled rejection.
  const pending = new Promise<void>((_resolve, reject) => { rejectInit = reject; });
  void pending.catch(() => undefined);
  mockNative.init.mockReturnValue(pending);
  const rec = startHoldRecording();
  rejectInit(new Error('AudioRecord initialization failed'));
  await Promise.resolve();
  await Promise.resolve();
  expect(rec.isActive()).toBe(false);
  expect(mockNative.start).not.toHaveBeenCalled();
  await expect(rec.stop()).resolves.toBeNull();
});

test('normal capture preserves enough PCM as one WAV and stop remains idempotent', async () => {
  const rec = startHoldRecording();
  await Promise.resolve();
  mockData?.(Buffer.alloc(16000, 1).toString('base64'));
  await expect(rec.stop()).resolves.toBe('file:///cache/attempt.wav');
  await expect(rec.stop()).resolves.toBe('file:///cache/attempt.wav');
  expect(mockWrite).toHaveBeenCalledTimes(1);
});

test('diagnostics distinguish short PCM from a WAV write failure without storing speech', async () => {
  const short = startHoldRecording();
  await Promise.resolve();
  mockData?.(Buffer.alloc(3200).toString('base64'));
  await expect(short.stop()).resolves.toBeNull();
  expect(short.diagnostics?.()).toMatchObject({ why: 'too_short', pcmMs: 100, chunks: 1, peak: 0 });
  const failed = startHoldRecording();
  await Promise.resolve();
  mockData?.(Buffer.alloc(16000, 1).toString('base64'));
  mockWrite.mockImplementation(() => { throw new Error('disk unavailable'); });
  await expect(failed.stop()).resolves.toBeNull();
  expect(failed.diagnostics?.()).toMatchObject({ why: 'write_failed', pcmMs: 500, chunks: 1 });
});

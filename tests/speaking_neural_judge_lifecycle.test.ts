const mockStop = jest.fn();
const mockTranscribe = jest.fn();
jest.mock('react-native', () => ({ Platform: { OS: 'android' } }));
jest.mock('whisper.rn', () => ({ initWhisper: jest.fn(async () => ({ transcribe: mockTranscribe })) }), { virtual: true });
jest.mock('expo-file-system', () => ({
  Paths: { document: 'file:///documents' },
  Directory: class {},
  File: class { exists = true; size = 100_000_000; uri = 'file:///model.bin'; },
}));
jest.mock('../app/debug-logger', () => ({ DebugLogger: { error: jest.fn() } }));
jest.mock('../app/pronunciation_scoring_client', () => ({ scoreSpeechPronunciationTranscript: () => ({ score: 100 }) }));
import { judgeWithNeuralEngine, releaseNeuralJudge, NEURAL_JUDGE_TIMEOUT_MS } from '../app/speaking_neural_judge';

beforeEach(() => { jest.useFakeTimers(); jest.clearAllMocks(); });
afterEach(async () => { await releaseNeuralJudge(); jest.useRealTimers(); });

test('completed recognition clears its deadline instead of stopping a finished native job later', async () => {
  mockTranscribe.mockReturnValue({ stop: mockStop, promise: Promise.resolve({ result: 'hello' }) });
  await expect(judgeWithNeuralEngine({ wavUri: 'file:///synthetic.wav', targetText: 'hello' })).resolves.toMatchObject({ transcript: 'hello' });
  expect(jest.getTimerCount()).toBe(0);
  jest.advanceTimersByTime(NEURAL_JUDGE_TIMEOUT_MS);
  expect(mockStop).not.toHaveBeenCalled();
});

test('a native recognition failure also clears its deadline', async () => {
  mockTranscribe.mockImplementation(() => ({ stop: mockStop, promise: Promise.reject(new Error('native failed')) }));
  await expect(judgeWithNeuralEngine({ wavUri: 'file:///synthetic.wav', targetText: 'hello' })).resolves.toBeNull();
  expect(jest.getTimerCount()).toBe(0);
});

test('a genuinely pending recognition is stopped exactly once at its deadline', async () => {
  mockTranscribe.mockReturnValue({ stop: mockStop, promise: new Promise(() => undefined) });
  const pending = judgeWithNeuralEngine({ wavUri: 'file:///synthetic.wav', targetText: 'hello' });
  await jest.advanceTimersByTimeAsync(NEURAL_JUDGE_TIMEOUT_MS);
  await expect(pending).resolves.toBeNull();
  expect(mockStop).toHaveBeenCalledTimes(1);
});

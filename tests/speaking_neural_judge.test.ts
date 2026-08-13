import {
  ensureNeuralModel,
  isNeuralJudgeSupported,
  isNeuralModelReady,
  judgeWithNeuralEngine,
  loadWhisperModule,
  NEURAL_JUDGE_MODEL,
  NEURAL_JUDGE_TIMEOUT_MS,
  neuralControlScore,
} from '../app/speaking_neural_judge';
import { scoreSpeechPronunciationTranscript } from '../app/pronunciation_scoring_client';

describe('neural judge model spec', () => {
  it('downloads the quantized tiny.en over https into a dedicated directory', () => {
    expect(NEURAL_JUDGE_MODEL.url.startsWith('https://')).toBe(true);
    expect(NEURAL_JUDGE_MODEL.url.endsWith(NEURAL_JUDGE_MODEL.fileName)).toBe(true);
    expect(NEURAL_JUDGE_MODEL.fileName.endsWith('.bin')).toBe(true);
    expect(NEURAL_JUDGE_MODEL.directory.length).toBeGreaterThan(0);
    // Санити: минимум отсечёт оборванную загрузку, но не целую модель (~32МБ).
    expect(NEURAL_JUDGE_MODEL.minBytes).toBeGreaterThan(10 * 1024 * 1024);
    expect(NEURAL_JUDGE_MODEL.minBytes).toBeLessThan(35 * 1024 * 1024);
    expect(NEURAL_JUDGE_TIMEOUT_MS).toBeGreaterThanOrEqual(3000);
  });
});

describe('neural control score', () => {
  it('uses the same scale as the pronunciation scorer', () => {
    const target = 'I would like a coffee';
    const transcript = 'I would like a coffee';
    expect(neuralControlScore(target, transcript)).toBe(
      scoreSpeechPronunciationTranscript({ targetText: target, transcript }).score,
    );
  });

  it('returns null for an empty transcript (no verdict, no penalty)', () => {
    expect(neuralControlScore('hello there', '')).toBeNull();
    expect(neuralControlScore('hello there', '   ')).toBeNull();
  });

  it('scores a partial attempt below a full one', () => {
    const target = 'good morning my friend';
    const full = neuralControlScore(target, 'good morning my friend')!;
    const partial = neuralControlScore(target, 'good friend')!;
    expect(partial).toBeLessThan(full);
  });
});

describe('graceful degradation without the native package', () => {
  it('reports unsupported when whisper.rn is not in the binary', () => {
    // В тестовой среде пакета нет — модуль обязан тихо выключиться.
    expect(loadWhisperModule()).toBeNull();
    expect(isNeuralJudgeSupported()).toBe(false);
  });

  it('never throws from model checks in a non-native environment', () => {
    expect(() => isNeuralModelReady()).not.toThrow();
  });

  it('resolves the judge to null instead of throwing', async () => {
    await expect(
      judgeWithNeuralEngine({ wavUri: 'file:///tmp/a.wav', targetText: 'hello' }),
    ).resolves.toBeNull();
  });

  it('resolves ensureNeuralModel to false instead of throwing', async () => {
    await expect(ensureNeuralModel()).resolves.toBe(false);
  });
});

import {
  MISTAKE_PREWARM_LIMIT,
  __resetMistakePrewarmForTests,
  mistakePrewarmTargets,
  prewarmMistakeSessionExplanations,
} from '../app/mistake_explain_prewarm';
import type { MistakePracticeSessionEntry } from '../modules/mistake-practice/session';

jest.mock('../app/explain_phrase_client', () => ({ callExplainPhrase: jest.fn() }));
jest.mock('../app/ai_explain_consent', () => ({ isAiExplainConsentGranted: () => true }));
jest.mock('../app/net_status', () => ({ getNetStatus: () => 'online' }));

const entry = (index: number, phrase = `phrase ${index}`): MistakePracticeSessionEntry => ({
  mistakeId: `m-${index}`,
  cycleId: `c-${index}`,
  facet: 'word_order',
  support: 'production',
  exercise: {
    exerciseId: `e-${index}`,
    mistakeId: `m-${index}`,
    mode: 'lesson_typing',
    renderer: 'typing',
    prompt: `перевод ${index}`,
    correctAnswer: phrase,
    feedbackAnswer: phrase,
  },
} as MistakePracticeSessionEntry);

const noSleep = async () => undefined;

// зачем (владелец 2026-09-14): «тексты готовы ДО того, как юзер откроет».
// Разбор ответа предгенерировать нельзя, поэтому греем объяснение фразы.
describe('mistake session explanation prewarm', () => {
  beforeEach(() => { __resetMistakePrewarmForTests(); jest.clearAllMocks(); });

  test('warms each unique phrase once, capped for one session', () => {
    const queue = [entry(1), entry(2), entry(1, 'phrase 1'), ...Array.from({ length: 12 }, (_, i) => entry(100 + i))];
    const targets = mistakePrewarmTargets(queue);
    expect(targets).toHaveLength(MISTAKE_PREWARM_LIMIT);
    expect(new Set(targets.map((t) => t.phrase)).size).toBe(targets.length);
    expect(targets[0]).toEqual({ phrase: 'phrase 1', meaning: 'перевод 1' });
  });

  test('warms the queue in the background and never warms the same session twice', async () => {
    const explain = jest.fn(async () => ({ ok: true as const, text: 'x', status: 'ok' as const, fromCache: false }));
    const input = { sessionId: 's-1', queue: [entry(1), entry(2)], studyTarget: 'en', interfaceLang: 'ru' };
    const deps = { explain: explain as never, sleep: noSleep };

    await expect(prewarmMistakeSessionExplanations(input, deps)).resolves.toBe(2);
    expect(explain).toHaveBeenCalledTimes(2);

    await expect(prewarmMistakeSessionExplanations(input, deps)).resolves.toBe(0);
    expect(explain).toHaveBeenCalledTimes(2);
  });

  test('a failing phrase never stops the rest of the queue', async () => {
    const explain = jest.fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValue({ ok: true, text: 'x', status: 'ok', fromCache: false });
    await expect(prewarmMistakeSessionExplanations(
      { sessionId: 's-2', queue: [entry(1), entry(2), entry(3)], studyTarget: 'en', interfaceLang: 'ru' },
      { explain: explain as never, sleep: noSleep },
    )).resolves.toBe(2);
    expect(explain).toHaveBeenCalledTimes(3);
  });

  test('offline and missing consent skip the network entirely', async () => {
    const explain = jest.fn();
    await expect(prewarmMistakeSessionExplanations(
      { sessionId: 's-3', queue: [entry(1)], studyTarget: 'en', interfaceLang: 'ru' },
      { explain: explain as never, sleep: noSleep, isOnline: () => false },
    )).resolves.toBe(0);
    await expect(prewarmMistakeSessionExplanations(
      { sessionId: 's-4', queue: [entry(1)], studyTarget: 'en', interfaceLang: 'ru' },
      { explain: explain as never, sleep: noSleep, hasConsent: () => false },
    )).resolves.toBe(0);
    expect(explain).not.toHaveBeenCalled();
  });
});

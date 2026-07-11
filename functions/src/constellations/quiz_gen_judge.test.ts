// ════════════════════════════════════════════════════════════════════════════
// quiz_gen_judge.test.ts — грейдер корректности вопроса (Фаза 0/2 C1).
// Код-фильтр — чистая логика (0 токенов). Судья — с моком openAiChat: проверяем
// fail-closed (сбой/кривой ответ ⇒ ok:false) и проброс вердикта.
// ════════════════════════════════════════════════════════════════════════════

const mockOpenAiChat = jest.fn();
jest.mock('../explain/explain_provider', () => ({
  openAiChat: (...args: unknown[]) => mockOpenAiChat(...args),
}));

import { codeFilterQuiz, judgeQuizCandidate, type QuizCandidate } from './quiz_gen_judge';

const good: QuizCandidate = {
  question: 'She ___ to school every day.',
  options: ['goes', 'go', 'going', 'gone'],
  correctIndex: 0,
  level: 'A1',
};

describe('codeFilterQuiz — детерминированный код-фильтр (0 токенов)', () => {
  test('валидный вопрос проходит (null)', () => {
    expect(codeFilterQuiz(good)).toBeNull();
  });
  test('не 4 опции → bad_shape', () => {
    expect(codeFilterQuiz({ ...good, options: ['a', 'b', 'c'] })).toBe('bad_shape');
    expect(codeFilterQuiz({ ...good, options: ['a', 'b', 'c', 'd', 'e'] })).toBe('bad_shape');
  });
  test('дубли опций → bad_shape', () => {
    expect(codeFilterQuiz({ ...good, options: ['go', 'go', 'going', 'gone'] })).toBe('bad_shape');
  });
  test('пустая опция → bad_shape', () => {
    expect(codeFilterQuiz({ ...good, options: ['goes', '', 'going', 'gone'] })).toBe('bad_shape');
  });
  test('correctIndex вне диапазона → bad_shape', () => {
    expect(codeFilterQuiz({ ...good, correctIndex: 4 })).toBe('bad_shape');
    expect(codeFilterQuiz({ ...good, correctIndex: -1 })).toBe('bad_shape');
  });
  test('пустой вопрос → bad_shape', () => {
    expect(codeFilterQuiz({ ...good, question: '  ' })).toBe('bad_shape');
  });
});

describe('judgeQuizCandidate — LLM-судья (fail-closed)', () => {
  beforeEach(() => { mockOpenAiChat.mockReset(); });

  test('брак формы отклоняется БЕЗ вызова судьи (0 токенов)', async () => {
    const v = await judgeQuizCandidate({ ...good, correctIndex: 9 }, 'key');
    expect(v).toMatchObject({ ok: false, reason: 'bad_shape', promptTokens: 0 });
    expect(mockOpenAiChat).not.toHaveBeenCalled();
  });

  test('судья подтвердил → ok:true', async () => {
    mockOpenAiChat.mockResolvedValue({ text: '{"ok":true,"reason":"ok"}', promptTokens: 40, completionTokens: 5 });
    const v = await judgeQuizCandidate(good, 'key');
    expect(v).toMatchObject({ ok: true, reason: 'ok' });
    expect(mockOpenAiChat).toHaveBeenCalledTimes(1);
  });

  test('судья нашёл два верных → not_single_key', async () => {
    mockOpenAiChat.mockResolvedValue({ text: '{"ok":false,"reason":"not_single_key"}', promptTokens: 40, completionTokens: 5 });
    const v = await judgeQuizCandidate(good, 'key');
    expect(v).toMatchObject({ ok: false, reason: 'not_single_key' });
  });

  test('сбой провайдера → fail-closed (ok:false)', async () => {
    mockOpenAiChat.mockRejectedValue(new Error('network'));
    const v = await judgeQuizCandidate(good, 'key');
    expect(v).toMatchObject({ ok: false, reason: 'incoherent' });
  });

  test('кривой ответ судьи → fail-closed', async () => {
    mockOpenAiChat.mockResolvedValue({ text: 'not json at all', promptTokens: 40, completionTokens: 5 });
    const v = await judgeQuizCandidate(good, 'key');
    expect(v).toMatchObject({ ok: false, reason: 'incoherent' });
  });

  test('неизвестная причина от судьи схлопывается в incoherent', async () => {
    mockOpenAiChat.mockResolvedValue({ text: '{"ok":false,"reason":"made_up_reason"}', promptTokens: 40, completionTokens: 5 });
    const v = await judgeQuizCandidate(good, 'key');
    expect(v).toMatchObject({ ok: false, reason: 'incoherent' });
  });
});

// ════════════════════════════════════════════════════════════════════════════
// quiz_gen.test.ts — оркестратор генерации вопросов (Фаза 2).
// Мок openAiChat (генератор), мок судьи, fake-firestore. Проверяем: рубильник,
// запись ТОЛЬКО прошедших грейдер, correctIndex числом, парсер ответа.
// ════════════════════════════════════════════════════════════════════════════

type DocData = Record<string, unknown>;
const docs = new Map<string, DocData>();

const mockOpenAiChat = jest.fn();
const mockJudge = jest.fn();
let jobEnabled = true;

jest.mock('../explain/explain_provider', () => ({
  openAiChat: (...a: unknown[]) => mockOpenAiChat(...a),
}));
jest.mock('./quiz_gen_judge', () => ({
  judgeQuizCandidate: (...a: unknown[]) => mockJudge(...a),
}));
jest.mock('../openai_jobs_config', () => ({
  resolveJobConfig: jest.fn(async () => ({ model: 'gpt-4o-mini', globalDailyCap: 3000, enabled: jobEnabled })),
  assertJobEnabled: jest.fn(),
}));
jest.mock('firebase-admin', () => ({
  firestore: jest.fn(() => ({
    collection: (c: string) => ({
      doc: (id: string) => ({
        set: async (data: DocData) => { docs.set(`${c}/${id}`, { ...(docs.get(`${c}/${id}`) ?? {}), ...data }); },
      }),
    }),
  })),
}));

import { generateConstellationQuizzes, parseGenReply } from './quiz_gen';

function quizDocs(): DocData[] {
  return [...docs.entries()].filter(([p]) => p.startsWith('constellation_quizzes/')).map(([, d]) => d);
}

describe('parseGenReply', () => {
  test('валидный JSON парсится', () => {
    const r = parseGenReply('{"questions":[{"question":"q","options":["a","b","c","d"],"correctIndex":1}]}');
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ question: 'q', correctIndex: 1 });
  });
  test('JSON в прозе извлекается', () => {
    const r = parseGenReply('here: {"questions":[{"question":"q","options":["a","b"],"correctIndex":0}]} done');
    expect(r).toHaveLength(1);
  });
  test('мусор → пустой список', () => {
    expect(parseGenReply('not json')).toEqual([]);
    expect(parseGenReply('{"nope":1}')).toEqual([]);
  });
});

describe('generateConstellationQuizzes', () => {
  beforeEach(() => {
    docs.clear();
    mockOpenAiChat.mockReset();
    mockJudge.mockReset();
    jobEnabled = true;
  });

  test('рубильник выключен → ничего не генерим, skipped:true', async () => {
    jobEnabled = false;
    const r = await generateConstellationQuizzes('A1', 3, 'key');
    expect(r).toMatchObject({ skipped: true, accepted: 0 });
    expect(mockOpenAiChat).not.toHaveBeenCalled();
    expect(quizDocs()).toHaveLength(0);
  });

  test('пишет ТОЛЬКО прошедшие грейдер, correctIndex числом', async () => {
    mockOpenAiChat.mockResolvedValue({
      text: JSON.stringify({ questions: [
        { question: 'q1', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
        { question: 'q2', options: ['a', 'b', 'c', 'd'], correctIndex: 1 },
        { question: 'q3', options: ['a', 'b', 'c', 'd'], correctIndex: 2 },
      ] }),
      promptTokens: 100, completionTokens: 200,
    });
    // Судья: q1 ok, q2 отклонён, q3 ok.
    mockJudge
      .mockResolvedValueOnce({ ok: true, reason: 'ok' })
      .mockResolvedValueOnce({ ok: false, reason: 'not_single_key' })
      .mockResolvedValueOnce({ ok: true, reason: 'ok' });

    const r = await generateConstellationQuizzes('A1', 3, 'key');
    expect(r.accepted).toBe(2); // только q1 и q3
    const written = quizDocs();
    expect(written).toHaveLength(2);
    for (const d of written) {
      expect(d.status).toBe('ready');
      expect(d.level).toBe('A1');
      expect(typeof d.correctIndex).toBe('number'); // ЧИСЛО, не текст
      expect(typeof d.rand).toBe('number');
      expect(d.source).toBe('ai');
    }
  });

  test('останавливается на count принятых (не пишет лишнего)', async () => {
    mockOpenAiChat.mockResolvedValue({
      text: JSON.stringify({ questions: [
        { question: 'q1', options: ['a', 'b', 'c', 'd'], correctIndex: 0 },
        { question: 'q2', options: ['a', 'b', 'c', 'd'], correctIndex: 1 },
        { question: 'q3', options: ['a', 'b', 'c', 'd'], correctIndex: 2 },
      ] }),
      promptTokens: 100, completionTokens: 200,
    });
    mockJudge.mockResolvedValue({ ok: true, reason: 'ok' });
    const r = await generateConstellationQuizzes('A1', 1, 'key');
    expect(r.accepted).toBe(1);
    expect(quizDocs()).toHaveLength(1);
  });

  test('сбой провайдера → accepted:0, ничего не записано', async () => {
    mockOpenAiChat.mockRejectedValue(new Error('boom'));
    const r = await generateConstellationQuizzes('A1', 3, 'key');
    expect(r).toMatchObject({ accepted: 0, skipped: false });
    expect(quizDocs()).toHaveLength(0);
  });
});

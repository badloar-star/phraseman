/**
 * premiumDialogReview — финальный разбор диалога. Тестируем чистый парсер
 * ответа модели: он обязан пережить ограждения, битый JSON и мусорные поля.
 */

class FakeHttpsError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const mockFirestore = jest.fn();
const mockResolveStableUidForAuth = jest.fn();
const mockResolveConfiguredDialogModel = jest.fn();
const mockModelSupportsJsonObject = jest.fn();
const mockApplyTutorMemoryUpdate = jest.fn();
const mockReviewVoiceSafety = jest.fn();
const mockSanitizeClientSafetyFlags = jest.fn();
const mockEnforceRateLimit = jest.fn();
const mockResolvePremiumAccess = jest.fn();
const mockResolveRemoteBool = jest.fn();

jest.mock('firebase-functions/v2/https', () => ({
  HttpsError: FakeHttpsError,
  onCall: (optsOrHandler: unknown, maybeHandler?: unknown) =>
    typeof optsOrHandler === 'function' ? optsOrHandler : maybeHandler,
}));

jest.mock('firebase-functions/params', () => ({
  defineSecret: () => ({ value: () => 'sk-test-key' }),
}));

jest.mock('firebase-admin', () => ({
  apps: [],
  initializeApp: jest.fn(),
  firestore: mockFirestore,
}));

jest.mock('./callable_options', () => ({
  ENFORCE_APP_CHECK_OPENAI: false,
}));

jest.mock('./auth_identity', () => ({ resolveStableUidForAuth: mockResolveStableUidForAuth }));
jest.mock('./openai_dialog_model_config', () => ({
  resolveConfiguredDialogModel: mockResolveConfiguredDialogModel,
  modelSupportsJsonObject: mockModelSupportsJsonObject,
}));
jest.mock('./max_voice_tutor_memory', () => ({ applyTutorMemoryUpdate: mockApplyTutorMemoryUpdate }));
jest.mock('./max_voice_safety', () => ({
  reviewVoiceSafety: mockReviewVoiceSafety,
  sanitizeClientSafetyFlags: mockSanitizeClientSafetyFlags,
}));
jest.mock('./premium_dialog', () => ({
  enforceRateLimit: mockEnforceRateLimit,
  asInterfaceLang: (value: unknown) => (typeof value === 'string' ? value : 'ru'),
}));
// зачем: аудит безопасности 2026-08-22 добавил premium-гейт (тот же паттерн,
// что у send/translate) — по умолчанию мок пропускает всех (isPremium=true),
// чтобы существующие тесты парсера не зависели от гейта; конкретный тест на
// сам гейт переопределяет мок ниже.
mockResolvePremiumAccess.mockResolvedValue(true);
mockResolveRemoteBool.mockResolvedValue(true);
jest.mock('./premium_status', () => ({ resolvePremiumAccess: mockResolvePremiumAccess }));
jest.mock('./remote_gates', () => ({ resolveRemoteBool: mockResolveRemoteBool }));

import { parseReviewEnvelope, asReviewMode, buildReviewSystemPrompt, premiumDialogReview } from './premium_dialog_review';

describe('parseReviewEnvelope', () => {
  it('parses a clean review envelope', () => {
    const out = parseReviewEnvelope(
      JSON.stringify({
        praise: 'Ты отлично держал разговор!',
        corrections: [
          { original: 'I want latte do you has latte', corrected: 'I would like a latte, do you have lattes?', note: 'После "do you" нужен глагол have.' },
        ],
        tip: 'Попробуй фразу "Could I have…?"',
      }),
    );
    expect(out).not.toBeNull();
    expect(out!.praise).toContain('отлично');
    expect(out!.corrections).toHaveLength(1);
    expect(out!.corrections[0].corrected).toContain('would like');
    expect(out!.tip).toContain('Could I have');
  });

  it('strips ```json fences', () => {
    const out = parseReviewEnvelope('```json\n{"praise":"Молодец!","corrections":[],"tip":""}\n```');
    expect(out).not.toBeNull();
    expect(out!.praise).toBe('Молодец!');
    expect(out!.corrections).toEqual([]);
  });

  it('returns null on unparseable content', () => {
    expect(parseReviewEnvelope('not json')).toBeNull();
    expect(parseReviewEnvelope('{"praise":')).toBeNull();
    expect(parseReviewEnvelope('')).toBeNull();
  });

  it('returns null when the object carries nothing useful', () => {
    expect(parseReviewEnvelope('{"foo":"bar"}')).toBeNull();
  });

  it('drops broken correction items and caps the list at 8', () => {
    const corrections = Array.from({ length: 12 }, (_, i) => ({
      original: `phrase ${i}`,
      corrected: `better ${i}`,
      note: 'note',
    }));
    corrections[1] = { original: '', corrected: 'x', note: '' } as (typeof corrections)[number];
    const out = parseReviewEnvelope(JSON.stringify({ praise: 'ok', corrections, tip: '' }));
    expect(out).not.toBeNull();
    // 8 — максимум; битый элемент (пустой original) отброшен внутри первых восьми.
    expect(out!.corrections).toHaveLength(7);
    expect(out!.corrections.every((c) => c.original && c.corrected)).toBe(true);
  });

  it('accepts a corrections-only envelope (no praise/tip)', () => {
    const out = parseReviewEnvelope(
      JSON.stringify({ corrections: [{ original: 'a', corrected: 'b', note: '' }] }),
    );
    expect(out).not.toBeNull();
    expect(out!.corrections).toHaveLength(1);
  });

  it('bounds every voice field for a calm mobile review hierarchy', () => {
    const long = (label: string) => `${label} ${'word '.repeat(200)}`;
    const out = parseReviewEnvelope(JSON.stringify({
      praise: long('praise'),
      corrections: [{ original: long('original'), corrected: long('corrected'), note: long('note') }],
      tip: long('tip'),
    }), 'voice');

    expect(out!.praise.length).toBeLessThanOrEqual(240);
    expect(out!.corrections[0].original.length).toBeLessThanOrEqual(160);
    expect(out!.corrections[0].corrected.length).toBeLessThanOrEqual(160);
    expect(out!.corrections[0].note.length).toBeLessThanOrEqual(180);
    expect(out!.tip.length).toBeLessThanOrEqual(220);
  });

  it('preserves the legacy text-review field limits and multiple polish-shaped items', () => {
    const long = (label: string) => `${label} ${'word '.repeat(100)}`;
    const out = parseReviewEnvelope(JSON.stringify({
      praise: long('praise'),
      corrections: [
        { original: long('first'), corrected: long('better'), note: long('note'), kind: 'polish' },
        { original: 'second', corrected: 'second better', note: 'note', kind: 'polish' },
      ],
      tip: long('tip'),
    }), 'text');

    expect(out!.praise.length).toBeGreaterThan(240);
    expect(out!.praise.length).toBeLessThanOrEqual(500);
    expect(out!.corrections[0].original.length).toBeGreaterThan(160);
    expect(out!.corrections[0].original.length).toBeLessThanOrEqual(300);
    expect(out!.corrections.filter((item) => item.kind === 'polish')).toHaveLength(2);
    expect(out!.tip.length).toBeGreaterThan(220);
    expect(out!.tip.length).toBeLessThanOrEqual(400);
  });
});

// MAX Voice (МАКС ПЛАН §6.2): 'mode' param routes the review through a
// speech-aware prompt without changing the text-mode contract or output shape.
describe('asReviewMode', () => {
  it('defaults unknown/absent values to text (backward compatible)', () => {
    expect(asReviewMode(undefined)).toBe('text');
    expect(asReviewMode(null)).toBe('text');
    expect(asReviewMode('')).toBe('text');
    expect(asReviewMode('bogus')).toBe('text');
    expect(asReviewMode(42)).toBe('text');
  });

  it('recognizes voice', () => {
    expect(asReviewMode('voice')).toBe('voice');
  });
});

describe('buildReviewSystemPrompt mode awareness', () => {
  it('text mode (default) has no spoken-transcript caveat', () => {
    const prompt = buildReviewSystemPrompt('B1', 'Russian', '', 'en', 'text');
    expect(prompt).not.toContain('SPOKEN phone call');
  });

  it('voice mode tells the model to ignore filler words and speech artifacts', () => {
    const prompt = buildReviewSystemPrompt('B1', 'Russian', '', 'en', 'voice');
    expect(prompt).toContain('SPOKEN phone call');
    expect(prompt).toContain('filler words');
    expect(prompt).toMatch(/grammar.*word choice.*word order/i);
    expect(prompt).toContain('could plausibly be a speech-recognition error');
    expect(prompt).toContain('Never diagnose pronunciation from this transcript alone');
  });

  it('voice mode still returns the identical JSON contract instructions', () => {
    const prompt = buildReviewSystemPrompt('B1', 'Russian', '', 'en', 'voice');
    expect(prompt).toContain('"praise": "...", "corrections": [{"original": "...", "corrected": "...", "note": "..."}], "tip": "..."');
  });

  // зачем: владелец 2026-08-16 — разбор после звонка «ничего не разбирает».
  it('voice mode asks for "polish" items after real fixes; text mode does not', () => {
    const voice = buildReviewSystemPrompt('A2', 'Russian', '', 'en', 'voice');
    expect(voice).toContain('"kind": "polish"');
    expect(voice).toContain('AFTER all real mistakes');
    expect(voice).toContain('at most 1 polish item');
    expect(voice).toContain('At most 3 items');
    expect(buildReviewSystemPrompt('A2', 'Russian', '', 'en', 'text')).not.toContain('polish');
  });

  it('parser keeps only one main correction plus two detail items', () => {
    const out = parseReviewEnvelope(JSON.stringify({
      praise: 'ok',
      corrections: Array.from({ length: 6 }, (_, i) => ({ original: `bad ${i}`, corrected: `good ${i}`, note: 'n' })),
      tip: 't',
    }), 'voice');
    expect(out!.corrections).toHaveLength(3);
  });

  it('parser keeps kind=polish and defaults everything else to fix', () => {
    const out = parseReviewEnvelope(JSON.stringify({
      praise: 'ok',
      corrections: [
        { original: 'I want coffee', corrected: "I'd like a coffee, please", note: 'Так вежливее.', kind: 'polish' },
        { original: 'he go', corrected: 'he goes', note: '', kind: 'junk' },
        { original: 'a', corrected: 'b', note: '' },
      ],
      tip: '',
    }));
    expect(out!.corrections.map((c) => c.kind)).toEqual(['polish', 'fix', 'fix']);
  });

  it('parser never exposes more than one polish suggestion', () => {
    const out = parseReviewEnvelope(JSON.stringify({
      praise: 'ok',
      corrections: [
        { original: 'a', corrected: 'aa', note: 'n', kind: 'polish' },
        { original: 'b', corrected: 'bb', note: 'n', kind: 'polish' },
        { original: 'c', corrected: 'cc', note: 'n', kind: 'fix' },
      ],
      tip: 't',
    }), 'voice');
    expect(out!.corrections.filter((item) => item.kind === 'polish')).toHaveLength(1);
  });
});

// ── Учитель (mode 'tutor', вариант A — владелец 2026-08-16) ──────────────────

describe("mode 'tutor' — разбор урока с учителем и память", () => {
  it("asReviewMode принимает 'tutor'", () => {
    expect(asReviewMode('tutor')).toBe('tutor');
  });

  it('промпт учителя: судить только английские попытки, извлечь память (facts/recurringErrors/resolvedErrors), polish тоже есть', () => {
    const prompt = buildReviewSystemPrompt('A1', 'Russian', '', 'en', 'tutor');
    expect(prompt).toContain('LESSON with the learner\'s personal teacher');
    expect(prompt).toContain('never their Russian lines');
    expect(prompt).toContain('"memory"');
    expect(prompt).toContain('"recurringErrors"');
    expect(prompt).toContain('"resolvedErrors"');
    expect(prompt).toContain('"kind": "polish"');
    expect(prompt).toContain('SPOKEN phone call');
    expect(buildReviewSystemPrompt('A1', 'Russian', '', 'en', 'voice')).not.toContain('"memory"');
  });

  it('парсер сохраняет memory-объект и режет его потолками', () => {
    const out = parseReviewEnvelope(JSON.stringify({
      praise: 'ok',
      corrections: [],
      tip: 't',
      memory: {
        facts: ['name is Olga', 'lives in Kyiv', 'a', 'b', 'c', 'd', 'e', 'f'],
        recurringErrors: ['says I go yesterday'],
        resolvedErrors: 'not-an-array',
      },
    }));
    expect(out!.memory).toEqual({
      facts: ['name is Olga', 'lives in Kyiv', 'a', 'b', 'c', 'd'],
      recurringErrors: ['says I go yesterday'],
      resolvedErrors: [],
    });
    expect(parseReviewEnvelope(JSON.stringify({ praise: 'x', corrections: [], tip: '' }))!.memory).toBeUndefined();
  });
});

describe('tutor deterministic evidence durability', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFirestore.mockReturnValue({});
    mockResolveStableUidForAuth.mockResolvedValue('stable-1');
    mockResolveConfiguredDialogModel.mockResolvedValue('gpt-test');
    mockModelSupportsJsonObject.mockReturnValue(true);
    mockReviewVoiceSafety.mockResolvedValue({ categories: [] });
    mockSanitizeClientSafetyFlags.mockReturnValue([]);
    mockEnforceRateLimit.mockResolvedValue(undefined);
    mockApplyTutorMemoryUpdate.mockResolvedValue({
      callCount: 1,
      homework: ['How are you?'],
      nextTopic: 'greetings',
      goalMastery: {},
    });
  });

  it('awaits tutor evidence persistence before a provider failure can abort the callable', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: false,
      status: 503,
      text: async () => 'provider unavailable',
    });
    global.fetch = fetchMock as typeof fetch;
    const handler = premiumDialogReview as unknown as (request: unknown) => Promise<unknown>;

    await expect(handler({
      auth: { uid: 'auth-1' },
      data: {
        mode: 'tutor',
        sessionId: ' session-1 ',
        history: [{ role: 'user', content: 'Hello' }],
        homework: ['How are you?'],
        nextTopic: 'greetings',
        languagePreference: 'more_target',
        phraseResults: [{ text: 'Hello', result: 'pass' }],
        sceneOutcome: 'done',
        goalProgress: { goalId: 'a1_greet', mastery: 1 },
      },
    })).rejects.toMatchObject({ code: 'unavailable' });

    expect(mockApplyTutorMemoryUpdate).toHaveBeenCalledTimes(1);
    expect(mockApplyTutorMemoryUpdate.mock.calls[0][3]).toMatchObject({
      sessionId: ' session-1 ',
      homework: ['How are you?'],
      nextTopic: 'greetings',
      languagePreference: 'more_target',
      phraseResults: [{ text: 'Hello', result: 'pass' }],
      sceneOutcome: 'done',
      goalProgress: { goalId: 'a1_greet', mastery: 1 },
    });
    expect(mockApplyTutorMemoryUpdate.mock.invocationCallOrder[0]).toBeLessThan(fetchMock.mock.invocationCallOrder[0]);
  });

  it('commits and acknowledges tutor evidence even when speech recognition produced no learner turn', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    mockApplyTutorMemoryUpdate.mockResolvedValueOnce({
      callCount: 2,
      homework: ['How are you?'],
      nextTopic: 'greetings',
      goalMastery: { a1_greet: 2 },
    });
    const handler = premiumDialogReview as unknown as (request: unknown) => Promise<any>;

    const response = await handler({
      auth: { uid: 'auth-1' },
      data: {
        mode: 'tutor',
        sessionId: 'session-no-asr',
        history: [{ role: 'assistant', content: 'See you tomorrow.' }],
        homework: ['How are you?'],
        nextTopic: 'greetings',
        goalProgress: { goalId: 'a1_greet', mastery: 2 },
      },
    });

    expect(mockApplyTutorMemoryUpdate).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockEnforceRateLimit).not.toHaveBeenCalled();
    expect(response).toMatchObject({
      ok: true,
      praise: '',
      corrections: [],
      tip: '',
      tutorMemory: {
        callCount: 2,
        acceptedGoalProgress: { goalId: 'a1_greet', mastery: 2 },
      },
    });
  });

  it('does not return a false acknowledgement when tutor evidence persistence fails', async () => {
    const fetchMock = jest.fn();
    global.fetch = fetchMock as typeof fetch;
    mockApplyTutorMemoryUpdate.mockRejectedValueOnce(new Error('firestore unavailable'));
    const handler = premiumDialogReview as unknown as (request: unknown) => Promise<unknown>;

    await expect(handler({
      auth: { uid: 'auth-1' },
      data: {
        mode: 'tutor',
        sessionId: 'session-db-fail',
        history: [{ role: 'assistant', content: 'Goodbye.' }],
        homework: ['How are you?'],
        phraseResults: [{ text: 'How are you?', result: 'pass' }],
      },
    })).rejects.toThrow('firestore unavailable');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps history_required for non-tutor reviews with no learner turn', async () => {
    const handler = premiumDialogReview as unknown as (request: unknown) => Promise<unknown>;
    await expect(handler({
      auth: { uid: 'auth-1' },
      data: { mode: 'voice', history: [{ role: 'assistant', content: 'Hello' }] },
    })).rejects.toMatchObject({ code: 'invalid-argument' });
    expect(mockApplyTutorMemoryUpdate).not.toHaveBeenCalled();
  });
});

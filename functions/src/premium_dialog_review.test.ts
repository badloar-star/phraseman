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
  firestore: jest.fn(),
}));

jest.mock('./callable_options', () => ({
  ENFORCE_APP_CHECK_OPENAI: false,
}));

import { parseReviewEnvelope, asReviewMode, buildReviewSystemPrompt } from './premium_dialog_review';

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
    expect(out!.corrections.length).toBeLessThanOrEqual(8);
    expect(out!.corrections.every((c) => c.original && c.corrected)).toBe(true);
  });

  it('accepts a corrections-only envelope (no praise/tip)', () => {
    const out = parseReviewEnvelope(
      JSON.stringify({ corrections: [{ original: 'a', corrected: 'b', note: '' }] }),
    );
    expect(out).not.toBeNull();
    expect(out!.corrections).toHaveLength(1);
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
  });

  it('voice mode still returns the identical JSON contract instructions', () => {
    const prompt = buildReviewSystemPrompt('B1', 'Russian', '', 'en', 'voice');
    expect(prompt).toContain('"praise": "...", "corrections": [{"original": "...", "corrected": "...", "note": "..."}], "tip": "..."');
  });
});

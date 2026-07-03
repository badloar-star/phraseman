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

jest.mock('firebase-admin', () => {
  const firestore = jest.fn();
  (firestore as unknown as { FieldValue: Record<string, unknown> }).FieldValue = {
    increment: (value: number) => ({ __op: 'increment', value }),
    serverTimestamp: () => ({ __op: 'serverTimestamp' }),
  };
  return { firestore };
});

jest.mock('./callable_options', () => ({
  ENFORCE_APP_CHECK_OPENAI: false,
}));

jest.mock('./admin_alerts', () => ({
  ADMIN_ALERT_BOT_TOKEN: { value: () => 'telegram-token' },
  sendTelegramAlert: jest.fn(),
}));

import {
  __helpBoardTestHooks,
  buildHelpBoardCompassPrompt,
  helpBoardBestScore,
  helpBoardHotScore,
  moderateHelpBoardText,
  normalizeHelpBoardScope,
  parseCompassEnvelope,
  validateCompassAnswer,
} from './help_board';

describe('help_board contract helpers', () => {
  it('scopes boards by study target and interface language', () => {
    expect(normalizeHelpBoardScope('en', 'ru')).toEqual({
      targetLang: 'en',
      uiLang: 'ru',
      boardKey: 'en:ru',
    });
    expect(normalizeHelpBoardScope('fr', 'PT-br')).toEqual({
      targetLang: 'fr',
      uiLang: 'pt-BR',
      boardKey: 'fr:pt-BR',
    });
    expect(() => normalizeHelpBoardScope('en', 'xx')).toThrow('help_board_unsupported_language');
  });

  it('keeps ranking responsive to votes, comments, reports and age', () => {
    const now = Date.UTC(2026, 6, 1, 12, 0, 0);
    const base = { helpfulScore: 1, commentCount: 1, reportCount: 0, createdAt: now, lastActivityAt: now };

    expect(helpBoardHotScore({ ...base, helpfulScore: 4 }, now)).toBeGreaterThan(helpBoardHotScore(base, now));
    expect(helpBoardHotScore({ ...base, commentCount: 5 }, now)).toBeGreaterThan(helpBoardHotScore(base, now));
    expect(helpBoardHotScore({ ...base, reportCount: 2 }, now)).toBeLessThan(helpBoardHotScore(base, now));
    expect(helpBoardHotScore(base, now + 72 * 3_600_000)).toBeLessThan(helpBoardHotScore(base, now));
    expect(helpBoardBestScore({ helpfulScore: 5, commentCount: 3, reportCount: 0 }))
      .toBeGreaterThan(helpBoardBestScore({ helpfulScore: 5, commentCount: 3, reportCount: 2 }));
  });

  it('blocks links, private contact patterns and obvious spam before publication', () => {
    expect(moderateHelpBoardText('Please check https://example.com', 200).reasons).toContain('external_link');
    expect(moderateHelpBoardText('Write me at person@example.com', 200).reasons).toContain('external_contact');
    expect(moderateHelpBoardText('helloooooooooooo what is this', 200).reasons).toContain('spam_pattern');
    expect(moderateHelpBoardText('How do I use present perfect with since?', 200).status).toBe('clean');
  });

  it('prompts Compass as the tone-aware brain: 4 modes, board language, answer once', () => {
    const prompt = buildHelpBoardCompassPrompt({
      title: 'Past Simple or Present Perfect?',
      question: 'I have seen him yesterday. Is this correct?',
      targetLang: 'en',
      uiLang: 'ru',
    });

    expect(prompt).toContain('The board studies English.');
    // Тон-детектор: все 4 режима описаны.
    expect(prompt).toContain('"genuine"');
    expect(prompt).toContain('"offtopic"');
    expect(prompt).toContain('"rude"');
    expect(prompt).toContain('"dangerous"');
    // Ответ на языке сообщества (человеческое имя, не код).
    expect(prompt).toContain('ALWAYS write in Russian');
    // Предупреждение за грубость + безопасная реакция.
    expect(prompt).toContain('repeated behaviour leads to losing access');
    expect(prompt).toContain('never repeat or discuss their words');
    // Методика обучения и юмор сохранены.
    expect(prompt).toContain('Diagnose the likely confusion');
    expect(prompt).toContain('light wit is welcome');
    // JSON-конверт с вердиктом тона.
    expect(prompt).toContain('{"tone": "genuine|offtopic|rude|dangerous"');
    expect(prompt).toContain('does not invite a dialog with Compass');
  });

  it('parses the Compass envelope defensively', () => {
    expect(parseCompassEnvelope('{"tone":"rude","answer":"Так у нас не разговаривают."}'))
      .toEqual({ tone: 'rude', answer: 'Так у нас не разговаривают.' });
    expect(parseCompassEnvelope('```json\n{"tone":"offtopic","answer":"Привет!"}\n```'))
      .toEqual({ tone: 'offtopic', answer: 'Привет!' });
    // Не-JSON → весь текст = ответ, tone genuine (лучше показать, чем молчать).
    expect(parseCompassEnvelope('Просто текст ответа без конверта'))
      .toEqual({ tone: 'genuine', answer: 'Просто текст ответа без конверта' });
    // Неизвестный tone → genuine.
    expect(parseCompassEnvelope('{"tone":"angry","answer":"текст"}').tone).toBe('genuine');
    // Пустой answer в JSON → фолбэк на сырой текст.
    expect(parseCompassEnvelope('{"tone":"rude","answer":""}').answer).toContain('"tone"');
  });

  it('validates Compass output deterministically (replaces the off_topic LLM judge)', () => {
    const ru = 'Отличный вопрос! Present Perfect не дружит с yesterday: скажи "I saw him yesterday".';
    expect(validateCompassAnswer(ru, 'ru')).toEqual({ ok: true });
    // Огрызок.
    expect(validateCompassAnswer('Ок.', 'ru')).toEqual({ ok: false, reason: 'too_short' });
    // Ссылки/контакты в ответе запрещены.
    expect(validateCompassAnswer(`${ru} Подробнее: https://example.com`, 'ru'))
      .toEqual({ ok: false, reason: 'unsafe_output' });
    // Ответ не на языке сообщества (для кириллических языков).
    expect(validateCompassAnswer('This is a long answer written entirely in English for a Russian board.', 'ru'))
      .toEqual({ ok: false, reason: 'non_target_language' });
    // Для латинских языков сообщества языковой порог не применяется.
    expect(validateCompassAnswer('Great question! Use Past Simple with yesterday.', 'en')).toEqual({ ok: true });
  });

  it('exports the policy version for client and legal consent gates', () => {
    expect(__helpBoardTestHooks.HELP_BOARD_POLICY_VERSION).toBe(1);
    expect(__helpBoardTestHooks.helpBoardBoardKey('en', 'ru')).toBe('en:ru');
  });
});

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
  resolveShouldPost,
  validateCompassAnswer,
  validateHelpBoardAdminAction,
} from './help_board';

describe('help_board contract helpers', () => {
  it('routes global author bans through the Safety Center while preserving topic restrictions', () => {
    expect(() => validateHelpBoardAdminAction('ban_author')).toThrow('safety_moderation_required');
    expect(validateHelpBoardAdminAction('restrict_author')).toBe('restrict_author');
    expect(validateHelpBoardAdminAction('unrestrict_author')).toBe('unrestrict_author');
    expect(validateHelpBoardAdminAction('hide')).toBe('hide');
  });
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

  it('does NOT block innocent learning topics on 1-2 char blocklist garbage (regression: "Blocked by moderation")', () => {
    // Мусорные термы блоклиста ("a**"→"a", "am", "cu", "xx") вырождались в
    // 1-2 символа и по word-boundary матчили ЛЮБОЙ текст со словами "a"/"am".
    expect(moderateHelpBoardText('When should I use who versus whom in a sentence?', 4000).status).toBe('clean');
    expect(moderateHelpBoardText('Hello everyone, I am new here', 4000).status).toBe('clean');
    expect(moderateHelpBoardText('What does the idiom break a leg mean?', 4000).status).toBe('clean');
    expect(moderateHelpBoardText('Как правильно использовать a lot of в предложении?', 4000).status).toBe('clean');
    expect(moderateHelpBoardText('I am confused about past simple', 4000).status).toBe('clean');
  });

  it('still blocks real profanity after the min-length filter', () => {
    expect(moderateHelpBoardText('you are a fucking idiot', 4000).status).toBe('blocked');
    expect(moderateHelpBoardText('иди на хуй отсюда', 4000).status).toBe('blocked');
  });

  it('does not block innocent @mentions, dates or number sequences as contact (regression)', () => {
    // HANDLE_RE убран из юзерского гейта; PHONE_RE ужесточён под реальные телефоны.
    expect(moderateHelpBoardText('Ask @teacher for help with grammar', 4000).status).toBe('clean');
    expect(moderateHelpBoardText('How to say numbers: 1 2 3 4 5 6 7 8 in English', 4000).status).toBe('clean');
    expect(moderateHelpBoardText('The date 2024-05-14 — how to read it aloud?', 4000).status).toBe('clean');
  });

  it('does not compact-match a blocklist term inside a longer innocent word (regression)', () => {
    // "house" не должен ловиться внутри "warehouse"/"household".
    expect(moderateHelpBoardText('How do I describe a warehouse and a household?', 4000).status).toBe('clean');
  });

  it('routes soft signals (real phone / link) to review, not silent auto-block', () => {
    // Один «мягкий» триггер больше не топит тему — она уходит человеку на ревью.
    expect(moderateHelpBoardText('Call me at +1 415 555 0199 anytime', 4000).status).toBe('review');
    expect(moderateHelpBoardText('Check my blog at https://example.com/mypage', 4000).status).toBe('review');
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
    expect(prompt).toContain('Never repeat or discuss their words');
    // Методика обучения (диагностика ошибки) сохранена.
    expect(prompt).toContain('diagnose the likely confusion');
    // Явная установка на юмор + разные голоса под режимы.
    expect(prompt).toContain('You are genuinely funny');
    expect(prompt).toContain('the funny professor');
    expect(prompt).toContain('the charming showman');
    // Гардрейлы юмора: только в genuine/offtopic, не в rude/dangerous.
    expect(prompt).toContain('jokes are welcome ONLY in genuine and offtopic');
    expect(prompt).toContain('humor STRICTLY OFF');
    // JSON-конверт с вердиктом тона и решением «постить ли».
    expect(prompt).toContain('{"tone": "genuine|offtopic|rude|dangerous", "shouldPost": true|false');
    expect(prompt).toContain('does not invite a dialog with Compass');
    // Характер Компаса: сам решает, отвечать ли (STEP 3).
    expect(prompt).toContain('genuine → shouldPost: true, ALWAYS');
    expect(prompt).toContain('offtopic → shouldPost: true ONLY if');
    expect(prompt).toContain('prefer false');
  });

  it('parses the Compass envelope defensively', () => {
    expect(parseCompassEnvelope('{"tone":"rude","answer":"Так у нас не разговаривают."}'))
      .toEqual({ tone: 'rude', answer: 'Так у нас не разговаривают.', shouldPost: true });
    expect(parseCompassEnvelope('```json\n{"tone":"offtopic","answer":"Привет!"}\n```'))
      .toEqual({ tone: 'offtopic', answer: 'Привет!', shouldPost: true });
    // Не-JSON → весь текст = ответ, tone genuine (лучше показать, чем молчать).
    expect(parseCompassEnvelope('Просто текст ответа без конверта'))
      .toEqual({ tone: 'genuine', answer: 'Просто текст ответа без конверта', shouldPost: true });
    // Неизвестный tone → genuine.
    expect(parseCompassEnvelope('{"tone":"angry","answer":"текст"}').tone).toBe('genuine');
    // Пустой answer в JSON → фолбэк на сырой текст.
    expect(parseCompassEnvelope('{"tone":"rude","answer":""}').answer).toContain('"tone"');
    // shouldPost: явный false читается, отсутствие поля → true (не молчим зря).
    expect(parseCompassEnvelope('{"tone":"offtopic","shouldPost":false,"answer":"Ничего по делу."}').shouldPost).toBe(false);
    expect(parseCompassEnvelope('{"tone":"offtopic","shouldPost":true,"answer":"Есть что сказать."}').shouldPost).toBe(true);
    expect(parseCompassEnvelope('{"tone":"genuine","answer":"Ответ без поля shouldPost."}').shouldPost).toBe(true);
  });

  it('Compass decides whether to post by topic character (resolveShouldPost)', () => {
    // Вопросы по языку и грубые/опасные темы — отвечает ВСЕГДА, даже если модель
    // прислала shouldPost:false (модерация/де-эскалация не пропускаются).
    expect(resolveShouldPost('genuine', false)).toBe(true);
    expect(resolveShouldPost('rude', false)).toBe(true);
    expect(resolveShouldPost('dangerous', false)).toBe(true);
    // Оффтоп — решает сам Компас: если сказать нечего, молчит.
    expect(resolveShouldPost('offtopic', false)).toBe(false);
    expect(resolveShouldPost('offtopic', true)).toBe(true);
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

// зачем (жалоба владельца 11.11: «подсказки показывают чаще всего фразы невпопад, не в ответ на реплику собеседника, а рандом»;
// решение «Да, сделай» — ответы от ИИ и в свободном разговоре): готовые ответы пишет модель тем же вызовом, что и реплику.
// Сторож: хвост с ответами не попадает в ленту и в журнал сессии; старый клиент (без hintsLang) получает прежние инструкцию
// и ответ; новый — поле sayHints.
import {
  DIALOGUE_V2_FREEFORM_SAY_HINTS_FIXED_SENTENCES,
  dialogueV2FreeformSayHintsInstruction,
  dialogueV2FreeformSayHintsLanguage,
  splitDialogueV2FreeformSayHints,
} from './dialogue_v2_freeform_say_hints';
import {
  buildDialogueV2FreeformTextProducerRequest,
  createDialogueV2FreeformServerTextProducer,
  type DialogueV2FreeformTextProducerRequest,
} from './dialogue_v2_freeform_text_provider';
import { createDialogueV2FreeformSessionTurnHandler } from './dialogue_v2_freeform_session_turn_callable';

const NOW_MS = 2_000_000_000_000;
const SESSION_ID = `d2fs_${'S'.repeat(32)}`;
const TURN_ID = `d2ft_${'T'.repeat(16)}`;
const EN_RU = { studyTarget: 'en', hintsLang: 'ru' };

function serverTurn(overrides: Record<string, unknown> = {}) {
  return {
    sessionId: SESSION_ID,
    turnId: TURN_ID,
    studyTarget: 'en',
    userMessage: 'Hi! I like music.',
    sessionExpiresAtMs: NOW_MS + 60_000,
    priorTurns: [],
    languageBranchMemory: null,
    ...overrides,
  };
}

describe('свободный разговор: разбор хвоста с готовыми ответами', () => {
  it('отделяет реплику от ответов; ответы — фраза и перевод', () => {
    const split = splitDialogueV2FreeformSayHints(
      'Nice! What kind of music do you like?\n###HINTS###\nI like rock music. | Мне нравится рок.\nI listen to jazz every day. | Я слушаю джаз каждый день.',
      EN_RU,
    );
    expect(split).toEqual({
      message: 'Nice! What kind of music do you like?',
      hints: [
        { text: 'I like rock music.', meaning: 'Мне нравится рок.' },
        { text: 'I listen to jazz every day.', meaning: 'Я слушаю джаз каждый день.' },
      ],
      marker: true,
      rejected: 0,
    });
  });

  it('метки нет — текст как есть, ответов нет', () => {
    expect(splitDialogueV2FreeformSayHints('Nice! What music do you like?', EN_RU))
      .toEqual({ message: 'Nice! What music do you like?', hints: [], marker: false, rejected: 0 });
  });

  it('терпит вольную метку, маркеры списка и кавычки; язык интерфейса = изучаемому — без перевода', () => {
    const split = splitDialogueV2FreeformSayHints(
      'Do you cook at home?\n\n## hints ##\n1. "Yes, I cook every day." | Yes, I cook every day.\n- No, not often.',
      { studyTarget: 'en', hintsLang: 'en' },
    );
    expect(split.message).toBe('Do you cook at home?');
    expect(split.hints).toEqual([
      { text: 'Yes, I cook every day.', meaning: null },
      { text: 'No, not often.', meaning: null },
    ]);
  });

  it('выбрасывает эхо реплики, дубль, обрыв по лимиту, служебные метки и лишнее сверх трёх', () => {
    const split = splitDialogueV2FreeformSayHints([
      'Where do you live?',
      '###HINTS###',
      'Where do you live? | эхо',
      'I live in Kyiv. | Я живу в Киеве.',
      'i live in kyiv | дубль',
      'I live near the cen',
      'SERVER_AUTHORIZED thing. | утечка',
      'I live with my family. | Я живу с семьёй.',
      'I live in a small town. | Я живу в маленьком городе.',
      'I live far away. | четвёртый лишний',
    ].join('\n'), EN_RU);
    expect(split.hints.map((hint) => hint.text)).toEqual([
      'I live in Kyiv.', 'I live with my family.', 'I live in a small town.',
    ]);
    expect(split.rejected).toBe(4);
  });

  it('язык перевода — только из известных языков интерфейса', () => {
    expect(dialogueV2FreeformSayHintsLanguage('pt-BR')).toBe('pt-BR');
    expect(dialogueV2FreeformSayHintsLanguage('xx')).toBeNull();
    expect(dialogueV2FreeformSayHintsLanguage(7)).toBeNull();
  });
});

describe('свободный разговор: инструкция и производитель ответа', () => {
  it('без hintsLang инструкция прежняя — про готовые ответы ни слова', () => {
    const legacy = buildDialogueV2FreeformTextProducerRequest(serverTurn(), NOW_MS);
    expect(legacy.systemInstruction).not.toContain('###HINTS###');
    const again = buildDialogueV2FreeformTextProducerRequest(serverTurn(), NOW_MS, undefined);
    expect(again.systemInstruction).toBe(legacy.systemInstruction);
  });

  it('с hintsLang инструкция просит ответы именно на только что написанную реплику, с переводом на язык интерфейса', () => {
    const built = buildDialogueV2FreeformTextProducerRequest(serverTurn(), NOW_MS, 'ru');
    for (const sentence of DIALOGUE_V2_FREEFORM_SAY_HINTS_FIXED_SENTENCES) expect(built.systemInstruction).toContain(sentence);
    expect(built.systemInstruction).toContain('directly answers the chat message you just wrote');
    expect(built.systemInstruction).toContain('then its faithful Russian translation');
    expect(dialogueV2FreeformSayHintsInstruction({ studyLanguageName: 'English', studyTarget: 'en', hintsLang: 'en' }))
      .toContain('in English only, with no translation');
    // неизвестный язык — инструкция прежняя
    expect(buildDialogueV2FreeformTextProducerRequest(serverTurn(), NOW_MS, 'xx').systemInstruction).not.toContain('###HINTS###');
  });

  it('производитель возвращает в журнал только реплику, а ответы отдаёт отдельно', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const transport = jest.fn(async (_request: DialogueV2FreeformTextProducerRequest) => (
      'Nice! What kind of music do you like?\n###HINTS###\nI like rock music. | Мне нравится рок.\nI love jazz. | Я люблю джаз.'
    ));
    const producer = createDialogueV2FreeformServerTextProducer({ enabled: true, transport, nowMs: () => NOW_MS });
    const onSayHints = jest.fn();
    await expect(producer(serverTurn() as never, { hintsLang: 'ru', onSayHints }))
      .resolves.toBe('Nice! What kind of music do you like?');
    expect(onSayHints).toHaveBeenCalledWith([
      { text: 'I like rock music.', meaning: 'Мне нравится рок.' },
      { text: 'I love jazz.', meaning: 'Я люблю джаз.' },
    ]);
    expect(transport.mock.calls[0][0].systemInstruction).toContain('###HINTS###');
    const line = log.mock.calls.find((args) => args[0] === '[DIALOG-HINTS]');
    expect(JSON.parse(String(line?.[1]))).toEqual({
      surface: 'freeform_turn', studyTarget: 'en', hintsLang: 'ru', marker: true, accepted: 2, rejected: 0, replyValid: true,
    });
    log.mockRestore();
  });

  it('без опций путь прежний: запрос без добавки, ответ модели целиком — реплика', async () => {
    const transport = jest.fn(async (_request: DialogueV2FreeformTextProducerRequest) => 'Nice! What music do you like?');
    const producer = createDialogueV2FreeformServerTextProducer({ enabled: true, transport, nowMs: () => NOW_MS });
    await expect(producer(serverTurn() as never)).resolves.toBe('Nice! What music do you like?');
    expect(transport.mock.calls[0][0].systemInstruction).not.toContain('###HINTS###');
  });

  it('модель пересказала добавку про готовые ответы — такая реплика в ленту не уходит', async () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    const transport = jest.fn(async () => `Sure. ${DIALOGUE_V2_FREEFORM_SAY_HINTS_FIXED_SENTENCES[1]}`);
    const producer = createDialogueV2FreeformServerTextProducer({ enabled: true, transport, nowMs: () => NOW_MS });
    const onSayHints = jest.fn();
    await expect(producer(serverTurn() as never, { hintsLang: 'ru', onSayHints }))
      .rejects.toThrow('dialogue_v2_freeform_provider_failed');
    expect(onSayHints).not.toHaveBeenCalled();
    log.mockRestore();
  });
});

describe('свободный разговор: обработчик хода', () => {
  const turnResult = {
    ok: true as const, kind: 'new' as const, sessionId: SESSION_ID, turnId: TURN_ID,
    assistantMessage: 'Nice! What kind of music do you like?', expiresAtMs: NOW_MS + 60_000,
  };
  const data = { sessionId: SESSION_ID, turnId: TURN_ID, studyTarget: 'en', userMessage: 'Hi! I like music.' };
  const hints = [{ text: 'I like rock music.', meaning: 'Мне нравится рок.' }];

  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('запрос с hintsLang: поле снимается до строгого разбора хода, в ответе — sayHints', async () => {
    const runAuthorizedTurn = jest.fn(async (_uid: string, _input: unknown, options?: { onSayHints(h: unknown): void }) => {
      options?.onSayHints(hints);
      return turnResult;
    });
    const handler = createDialogueV2FreeformSessionTurnHandler({ runAuthorizedTurn } as never);
    await expect(handler({ auth: { uid: 'auth-user' }, data: { ...data, hintsLang: 'ru' } })).resolves.toEqual({
      ok: true, assistantMessage: turnResult.assistantMessage, sessionId: SESSION_ID, expiresAtMs: turnResult.expiresAtMs, sayHints: hints,
    });
    expect(runAuthorizedTurn.mock.calls[0][1]).toEqual(data);
    expect(runAuthorizedTurn.mock.calls[0][2]).toMatchObject({ hintsLang: 'ru' });
  });

  it('повтор хода (модель не вызывалась) — пустой sayHints, ход цел', async () => {
    const runAuthorizedTurn = jest.fn(async () => ({ ...turnResult, kind: 'replay' as const }));
    const handler = createDialogueV2FreeformSessionTurnHandler({ runAuthorizedTurn } as never);
    await expect(handler({ auth: { uid: 'auth-user' }, data: { ...data, hintsLang: 'ru' } }))
      .resolves.toMatchObject({ assistantMessage: turnResult.assistantMessage, sayHints: [] });
  });

  it('запрос без hintsLang: два аргумента и прежний точный набор полей ответа', async () => {
    const runAuthorizedTurn = jest.fn(async () => turnResult);
    const handler = createDialogueV2FreeformSessionTurnHandler({ runAuthorizedTurn } as never);
    expect(Object.keys(await handler({ auth: { uid: 'auth-user' }, data }))).toEqual(['ok', 'assistantMessage', 'sessionId', 'expiresAtMs']);
    expect(runAuthorizedTurn).toHaveBeenCalledWith('auth-user', data);
  });

  it('неизвестный язык и посторонние поля — неверный запрос, ход не начат', async () => {
    const runAuthorizedTurn = jest.fn(async () => turnResult);
    const handler = createDialogueV2FreeformSessionTurnHandler({ runAuthorizedTurn } as never);
    for (const extra of [{ hintsLang: 'xx' }, { hintsLang: 5 }, { hintsLang: 'ru', provider: 'x' }]) {
      await expect(handler({ auth: { uid: 'auth-user' }, data: { ...data, ...extra } }))
        .rejects.toMatchObject({ code: 'invalid-argument', message: 'dialogue_v2_freeform_session_turn_request_invalid' });
    }
    expect(runAuthorizedTurn).not.toHaveBeenCalled();
  });
});

// зачем («Перевести» в свободном разговоре, 25.10): перевод на язык интерфейса из профиля, кэш языка, любой сбой → null.
import {
  DIALOGUE_V2_FREEFORM_TRANSLATION_LANG_TTL_MS,
  canonicalDialogueV2FreeformTranslation,
  createDialogueV2FreeformReplyTranslator,
  dialogueV2FreeformInterfaceLanguageFromProfile,
} from './dialogue_v2_freeform_reply_translation';

const REPLY = 'Hi! How was your day?';

function setup(profile: unknown, translated: unknown = 'Привет! Как прошёл твой день?') {
  let now = 1_000;
  const readProfile = jest.fn(async () => profile);
  const translate = jest.fn(async () => translated);
  const log = jest.fn();
  const translator = createDialogueV2FreeformReplyTranslator({ readProfile, translate, nowMs: () => now, log });
  return { translator, readProfile, translate, log, advance: (ms: number) => { now += ms; } };
}

describe('язык интерфейса из профиля', () => {
  it('берёт lang, затем app_lang, затем progress', () => {
    expect(dialogueV2FreeformInterfaceLanguageFromProfile({ lang: 'uk', app_lang: 'ru' })).toBe('uk');
    expect(dialogueV2FreeformInterfaceLanguageFromProfile({ app_lang: 'pt-BR' })).toBe('pt-BR');
    expect(dialogueV2FreeformInterfaceLanguageFromProfile({ progress: { lang: 'tr' } })).toBe('tr');
  });

  it('неизвестный язык и пустой профиль — null', () => {
    expect(dialogueV2FreeformInterfaceLanguageFromProfile({ lang: 'xx' })).toBeNull();
    expect(dialogueV2FreeformInterfaceLanguageFromProfile(null)).toBeNull();
  });
});

describe('проверка перевода', () => {
  it('принимает обычный текст и отклоняет копию оригинала, пустое и управляющие символы', () => {
    expect(canonicalDialogueV2FreeformTranslation(' Привет! ', REPLY)).toBe('Привет!');
    expect(canonicalDialogueV2FreeformTranslation(REPLY, REPLY)).toBeNull();
    expect(canonicalDialogueV2FreeformTranslation('', REPLY)).toBeNull();
    expect(canonicalDialogueV2FreeformTranslation('a\u0007b', REPLY)).toBeNull();
    expect(canonicalDialogueV2FreeformTranslation(42, REPLY)).toBeNull();
  });
});

describe('переводчик ответа', () => {
  it('переводит на язык интерфейса и называет язык в инструкции', async () => {
    const { translator, translate } = setup({ lang: 'ru' });
    await expect(translator({ authUid: 'u1', studyTarget: 'en', assistantMessage: REPLY })).resolves.toBe('Привет! Как прошёл твой день?');
    expect(translate).toHaveBeenCalledWith(expect.stringContaining('into Russian'), REPLY);
  });

  it('язык интерфейса = язык изучения — без перевода и без запроса к модели', async () => {
    const { translator, translate, log } = setup({ lang: 'es' });
    await expect(translator({ authUid: 'u1', studyTarget: 'es', assistantMessage: REPLY })).resolves.toBeNull();
    expect(translate).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('skip', expect.objectContaining({ reason: 'same_language' }));
  });

  it('язык неизвестен — null с причиной', async () => {
    const { translator, log } = setup({});
    await expect(translator({ authUid: 'u1', studyTarget: 'en', assistantMessage: REPLY })).resolves.toBeNull();
    expect(log).toHaveBeenCalledWith('skip', expect.objectContaining({ reason: 'interface_language_unknown' }));
  });

  it('язык читается из профиля раз в 6 часов на uid', async () => {
    const { translator, readProfile, advance } = setup({ lang: 'ru' });
    await translator({ authUid: 'u1', studyTarget: 'en', assistantMessage: REPLY });
    await translator({ authUid: 'u1', studyTarget: 'en', assistantMessage: REPLY });
    expect(readProfile).toHaveBeenCalledTimes(1);
    advance(DIALOGUE_V2_FREEFORM_TRANSLATION_LANG_TTL_MS);
    await translator({ authUid: 'u1', studyTarget: 'en', assistantMessage: REPLY });
    expect(readProfile).toHaveBeenCalledTimes(2);
  });

  it('сбой чтения профиля, сбой модели и битый ответ — null, ход не падает', async () => {
    const failingRead = createDialogueV2FreeformReplyTranslator({
      readProfile: async () => { throw new Error('unavailable'); },
      translate: async () => 'x',
      nowMs: () => 0,
      log: jest.fn(),
    });
    await expect(failingRead({ authUid: 'u1', studyTarget: 'en', assistantMessage: REPLY })).resolves.toBeNull();

    const failingModel = createDialogueV2FreeformReplyTranslator({
      readProfile: async () => ({ lang: 'ru' }),
      translate: async () => { throw new Error('deadline'); },
      nowMs: () => 0,
      log: jest.fn(),
    });
    await expect(failingModel({ authUid: 'u1', studyTarget: 'en', assistantMessage: REPLY })).resolves.toBeNull();

    const { translator, log } = setup({ lang: 'ru' }, { not: 'text' });
    await expect(translator({ authUid: 'u1', studyTarget: 'en', assistantMessage: REPLY })).resolves.toBeNull();
    expect(log).toHaveBeenCalledWith('skip', expect.objectContaining({ reason: 'translation_invalid' }));
  });
});

// зачем («Перевести» по тапу, 25.10): язык присылает клиент; тот же язык, неизвестный язык, сбой модели и битый ответ → null.
import {
  canonicalDialogueV2FreeformTranslation,
  createDialogueV2FreeformReplyTranslator,
  dialogueV2FreeformTranslationLanguage,
} from './dialogue_v2_freeform_reply_translation';

const REPLY = 'Hi! How was your day?';

function setup(translated: unknown = 'Привет! Как прошёл твой день?') {
  const translate = jest.fn(async () => translated);
  const log = jest.fn();
  const translator = createDialogueV2FreeformReplyTranslator({ translate, nowMs: () => 0, log });
  return { translator, translate, log };
}

describe('язык перевода', () => {
  it('принимает 9 языков интерфейса и отклоняет остальное', () => {
    expect(dialogueV2FreeformTranslationLanguage('ru')).toBe('ru');
    expect(dialogueV2FreeformTranslationLanguage('pt-BR')).toBe('pt-BR');
    expect(dialogueV2FreeformTranslationLanguage('xx')).toBeNull();
    expect(dialogueV2FreeformTranslationLanguage(7)).toBeNull();
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

describe('переводчик реплики', () => {
  it('переводит на присланный язык и называет его в инструкции', async () => {
    const { translator, translate } = setup();
    await expect(translator({ translateTo: 'ru', studyTarget: 'en', assistantMessage: REPLY })).resolves.toBe('Привет! Как прошёл твой день?');
    expect(translate).toHaveBeenCalledWith(expect.stringContaining('into Russian'), REPLY);
  });

  it('язык перевода = язык изучения — без запроса к модели', async () => {
    const { translator, translate, log } = setup();
    await expect(translator({ translateTo: 'es', studyTarget: 'es', assistantMessage: REPLY })).resolves.toBeNull();
    expect(translate).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith('skip', expect.objectContaining({ reason: 'same_language' }));
  });

  it('неизвестный язык — null без запроса к модели', async () => {
    const { translator, translate } = setup();
    await expect(translator({ translateTo: 'xx', studyTarget: 'en', assistantMessage: REPLY })).resolves.toBeNull();
    expect(translate).not.toHaveBeenCalled();
  });

  it('сбой модели и битый ответ — null с причиной', async () => {
    const failing = createDialogueV2FreeformReplyTranslator({
      translate: async () => { throw new Error('deadline'); },
      nowMs: () => 0,
      log: jest.fn(),
    });
    await expect(failing({ translateTo: 'ru', studyTarget: 'en', assistantMessage: REPLY })).resolves.toBeNull();
    const { translator, log } = setup({ not: 'text' });
    await expect(translator({ translateTo: 'ru', studyTarget: 'en', assistantMessage: REPLY })).resolves.toBeNull();
    expect(log).toHaveBeenCalledWith('skip', expect.objectContaining({ reason: 'translation_invalid' }));
  });
});

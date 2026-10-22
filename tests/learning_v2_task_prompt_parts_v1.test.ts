// зачем (владелец, реестр №23, макет learning-v2-tasks-review.html «Предлагаем»): «что сделать», ситуация и цель —
// отдельными полями из нынешних склеенных строк, без правки контента. Примеры — реальные тексты из макета (уроки 1–3).
import {
  learningV2WordCardTranslationV1,
  splitLearningV2IntroBodyV1,
  splitLearningV2TaskPromptV1,
  splitSentencesV1,
} from '../modules/learning-v2/runtime/task_prompt_parts_v1';

describe('splitLearningV2TaskPromptV1', () => {
  it('phrase builder: instruction, situation card and the meaning as the goal', () => {
    expect(splitLearningV2TaskPromptV1({
      family: 'phrase_builder',
      prompt: 'Соберите фразу — коллега ищет вас, а вы уже в комнате',
      interfaceLocale: 'ru',
      modePayload: { explanationV1: { phrase: { meaningByLocale: { ru: 'Я здесь.', uk: 'Я тут.' } } } },
    })).toEqual({
      instruction: 'Собери фразу', icon: 'puzzle',
      situation: 'Коллега ищет вас, а вы уже в комнате.',
      goal: { label: 'Скажите по-английски', text: 'Я здесь.' },
      rule: 'dash_lead',
    });
  });

  it('gap: situation and the answer goal on separate lines', () => {
    const parts = splitLearningV2TaskPromptV1({
      family: 'context_gap_grammar',
      prompt: 'Вставьте слово — начальница звонит и спрашивает, добрались ли вы до офиса; ответьте, что вы уже здесь',
      interfaceLocale: 'ru',
    });
    expect(parts.instruction).toBe('Вставь слово');
    expect(parts.situation).toBe('Начальница звонит и спрашивает, добрались ли вы до офиса.');
    expect(parts.goal).toEqual({ label: null, text: 'Ответьте, что вы уже здесь.' });
  });

  it('speed match: one heading, no duplicated instruction line', () => {
    expect(splitLearningV2TaskPromptV1({ family: 'speed_match', prompt: 'Соедините пары', interfaceLocale: 'pl' }))
      .toMatchObject({ instruction: 'Połącz pary', icon: 'swap', situation: null, goal: null });
  });

  it('generic listening line has no situation; a line naming the speaker keeps it', () => {
    expect(splitLearningV2TaskPromptV1({ family: 'listen_choose', prompt: 'Послушайте и выберите', interfaceLocale: 'ru' }).situation).toBeNull();
    expect(splitLearningV2TaskPromptV1({ family: 'listen_build_dictation', prompt: 'Послушайте реплику коллеги перед началом встречи и соберите её', interfaceLocale: 'ru' }).situation)
      .toBe('Реплика коллеги перед началом встречи.');
  });

  it('a question mark inside quotes does not end the sentence; the trailing command leaves the situation', () => {
    expect(splitLearningV2TaskPromptV1({ family: 'phrase_builder', prompt: 'Брат невиновен. Мама спрашивает: «Is he guilty?» Ответьте коротким «нет»', interfaceLocale: 'ru' }))
      .toMatchObject({ situation: 'Брат невиновен. Мама спрашивает: «Is he guilty?»', goal: { label: null, text: 'Ответьте коротким «нет»' } });
    expect(splitLearningV2TaskPromptV1({ family: 'listen_build_dictation', prompt: 'Сестре всё ещё нехорошо. Подруга спрашивает: «Is she well?» Послушайте и соберите ваш ответ', interfaceLocale: 'ru' }))
      .toMatchObject({ situation: 'Сестре всё ещё нехорошо. Подруга спрашивает: «Is she well?»', goal: null });
  });

  it('colon quote: the command becomes the goal label, the quote the goal, context the situation', () => {
    expect(splitLearningV2TaskPromptV1({
      family: 'phrase_builder', prompt: 'Бабушка ищет бубен. Он рядом с диваном. Скажите ей: «Бубен рядом с диваном»', interfaceLocale: 'ru',
    })).toMatchObject({ situation: 'Бабушка ищет бубен. Он рядом с диваном.', goal: { label: 'Скажите ей', text: 'Бубен рядом с диваном' } });
  });

  it('a dash inside a quote is not a separator', () => {
    const parts = splitLearningV2TaskPromptV1({
      family: 'phrase_builder', prompt: 'Скажите с сильным впечатлением: «Укачивание в транспорте — такая проблема для меня».', interfaceLocale: 'ru',
    });
    expect(parts.rule).toBe('colon_quote');
    expect(parts.goal?.text).toBe('Укачивание в транспорте — такая проблема для меня');
  });

  it('instruction is localized on all nine interface languages', () => {
    for (const locale of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
      expect(splitLearningV2TaskPromptV1({ family: 'scripted_repeat_compare', prompt: '', interfaceLocale: locale }).instruction).not.toBe('');
    }
  });
});

describe('splitLearningV2IntroBodyV1', () => {
  it('lesson 1 page: situation, «Say it like this» phrase, word parts and one «why» line', () => {
    expect(splitLearningV2IntroBodyV1('В первый рабочий день начальница встречает новичков у входа. Вы стоите рядом, но она вас пока не заметила. Сообщите: `I am here` — «Я здесь». `I` — «я», `here` — «здесь». Между ними в этой полной английской фразе нужно `am`: `I am here`.'))
      .toEqual({
        situation: 'В первый рабочий день начальница встречает новичков у входа. Вы стоите рядом, но она вас пока не заметила.',
        phrase: { text: 'I am here.', meaning: 'Я здесь.' },
        parts: [{ word: 'I', meaning: 'я' }, { word: 'here', meaning: 'здесь' }],
        why: 'Между ними в этой полной английской фразе нужно am: I am here.',
        missing: [],
      });
  });

  it('bare-Latin format, meaning taken from the nearest quotes', () => {
    expect(splitLearningV2IntroBodyV1("Квартира две недели стояла закрытой. dusty — «пыльный». It is dusty — коротко It's dusty: «Она пыльная». Про полку говорим It."))
      .toMatchObject({ phrase: { text: 'It is dusty.', meaning: 'Она пыльная.' }, parts: [{ word: 'dusty', meaning: 'пыльный' }] });
  });

  it('reports what is missing instead of inventing it', () => {
    expect(splitLearningV2IntroBodyV1('Просто текст без английского.').missing).toEqual(['phrase', 'parts', 'why']);
  });
});

describe('learningV2WordCardTranslationV1', () => {
  it('shows the translation right away', () => {
    expect(learningV2WordCardTranslationV1('«занятый»: сейчас вы делаете что-то и не можете отвлечься.')).toBe('занятый');
    expect(learningV2WordCardTranslationV1('здесь: о месте')).toBe('здесь');
    expect(learningV2WordCardTranslationV1('')).toBeNull();
  });
});


// зачем (координатор 22.10: «ни один текст на экране не склеен из двух смыслов»): команда уходит в заголовок режима.
describe('no glued command + situation', () => {
  const split = (family: string, prompt: string) => splitLearningV2TaskPromptV1({ family, prompt, interfaceLocale: 'ru' });
  it('listening: the command goes to the heading, the speaker stays', () => {
    expect(split('listen_choose', 'Послушайте, что соседка говорит о стуле').situation).toBe('Соседка говорит о стуле.');
    expect(split('listen_choose', 'Послушайте вопрос мамы').situation).toBe('Вопрос мамы.');
    expect(split('listen_build_dictation', 'Послушайте и соберите фразу об освещении').situation).toBe('Фраза об освещении.');
    expect(split('listen_build_dictation', 'Послушайте брата: он говорит о второй строке накладной').situation).toBe('Он говорит о второй строке накладной.');
    expect(split('listen_choose', 'Послушайте друга у двери').situation).toBeNull();
    expect(split('listen_build_dictation', 'Соберите услышанное').situation).toBeNull();
  });
  it('a quoted command anywhere becomes the goal; the trailing heading command is dropped', () => {
    expect(split('context_gap_grammar', 'Спросите соседа: «Вы водите погрузчик?». Выберите слово.'))
      .toMatchObject({ situation: null, goal: { label: 'Спросите соседа', text: 'Вы водите погрузчик?' } });
  });
  it('a line that starts with a command has no situation', () => {
    expect(split('context_gap_grammar', 'Подтвердите, что знаете ответ. Know обозначает знание.'))
      .toMatchObject({ situation: null, goal: { label: null, text: 'Подтвердите, что знаете ответ. Know обозначает знание.' } });
  });
});


// зачем (владелец 22.10, «Честно: правило для всех»): подстановок по id нет — вместо сверки слово в слово проверяем структуру
// на ВСЁМ встроенном выпуске: команда, ситуация и цель раздельно, ничего не склеено, пустых нет.
describe('structure over the whole bundled release', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const root = path.join(__dirname, '..', 'modules', 'learning-v2', 'content', 'factory_native', 'generated_release', 'en');
  const IMPERATIVE_START = /^[A-Za-zА-ЯЁЇІЄҐа-яёїієґ’'ʼ-]+(?:ите|йте|іть|їть|те)(?=[\s,.:;!?]|$)/iu;
  const ASSIGNABLE = new Set(['listen_choose', 'listen_build_dictation', 'phrase_builder', 'context_gap_grammar', 'speed_match', 'scripted_repeat_compare']);
  it('no glued command in a situation, no empty task where a command needs content, instruction always present', () => {
    const glued: string[] = [];
    const empty: string[] = [];
    let checked = 0;
    for (const lesson of fs.readdirSync(root)) for (const session of fs.readdirSync(path.join(root, lesson))) {
      for (const [file, locale] of [['learner.json', 'ru'], ['learner.uk.json', 'uk']] as const) {
        const fp = path.join(root, lesson, session, file);
        if (!fs.existsSync(fp)) continue;
        const learner = JSON.parse(fs.readFileSync(fp, 'utf8')) as { interactions: { interactionId: string; family: string; prompt: string; modePayload?: { isWordCard?: boolean } }[] };
        for (const it of learner.interactions) {
          if (it.modePayload?.isWordCard || !ASSIGNABLE.has(it.family)) continue;
          checked += 1;
          const parts = splitLearningV2TaskPromptV1({ family: it.family, prompt: it.prompt, interfaceLocale: locale, modePayload: it.modePayload, interactionId: it.interactionId });
          if (!parts.instruction) empty.push(`${it.interactionId}:instruction`);
          if (parts.situation && splitSentencesV1(parts.situation).some((part) => IMPERATIVE_START.test(part))) glued.push(`${it.interactionId}: ${parts.situation}`);
          const listening = it.family === 'listen_choose' || it.family === 'listen_build_dictation' || it.family === 'speed_match';
          if (!listening && !parts.situation && !parts.goal) empty.push(`${it.interactionId}:${it.prompt}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(30_000);
    expect(glued.slice(0, 5)).toEqual([]);
    expect(empty.slice(0, 5)).toEqual([]);
  });
});

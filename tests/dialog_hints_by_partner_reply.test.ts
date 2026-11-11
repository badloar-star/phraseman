// зачем (жалоба владельца 25.10 «в диалогах подсказки почему не относятся никак к реплике собеседника»): подсказки «Можно сказать…» —
// ответы на ПОСЛЕДНЮЮ реплику собеседника; не распознали — подсказок нет (решение координатора: лучше не показывать, чем нерелевантные).
// Сторож на 10 реплик четырёх языков, мягкий ответ «скажи на изучаемом языке» пропускается, журнал [DIALOG-HINTS] называет причину.
// зачем (жалоба владельца 11.11: «подсказки показывают чаще всего фразы невпопад, не в ответ на реплику собеседника, а рандом»):
// локальный набор отвечает только там, где ответ точный (последний вопрос реплики: «как дела», предложение, «да/нет»); на «как
// тебя зовут» и «что будете заказывать» заготовленного ответа нет — подсказки там даёт сервер вместе с репликой (sayHints).
/* eslint-disable import/first */
const mockCallableRun = jest.fn();
jest.mock('@react-native-firebase/app', () => ({ getApp: jest.fn(() => ({ name: 'app' })) }));
jest.mock('@react-native-firebase/functions', () => ({
  getFunctions: jest.fn(() => ({ region: 'us-central1' })),
  httpsCallable: jest.fn(() => mockCallableRun),
}));

import {
  dialogueV2SayHintsForPartnerReply,
  lastPartnerReplyForHints,
  sayHintKindForPartnerReply,
} from '../app/dialogue_v2_say_hints_pick';
import { pickDialogueNotUnderstoodReply } from '../app/dialogue_v2_off_language';
import { parseDialogueV2TurnCoaching, sendDialogueV2CoachedTextTurn } from '../app/dialogue_v2_turn_coaching_client';
import { answerSayHints } from '../app/dialogue_v2_say_hints_answers';
import { readSource } from './helpers/read_source';

const TEN: ReadonlyArray<readonly [string, string, string | null]> = [
  ['en', 'Hello! How are you today?', 'howAreYou'],
  ['en', "Nice to meet you. What's your name?", null],
  ['en', 'Hi there! What would you like to drink?', null],
  ['en', 'Shall we meet at the station at six?', 'confirm'],
  ['en', 'Do you like living in the city?', 'generic'],
  ['en', 'The weather was terrible yesterday.', null],
  ['es', '¡Hola! ¿Cómo te llamas?', null],
  ['es', '¿Qué tal si vamos al cine mañana?', 'confirm'],
  ['fr', 'Bonjour ! Comment ça va ?', 'howAreYou'],
  ['de', 'Tschüss, bis morgen!', 'goodbye'],
];

describe('подсказки по реплике собеседника — 10 реплик', () => {
  it.each(TEN)('[%s] %s → %s', (target, text, kind) => {
    expect(sayHintKindForPartnerReply(text, target)?.kind ?? null).toBe(kind);
  });

  it('распознанная реплика даёт подсказки, нераспознанная — пусто', () => {
    const shown = dialogueV2SayHintsForPartnerReply({ screen: 'scenario', studyTarget: 'en', interfaceLang: 'ru', reply: { id: 'persona_3', text: 'How are you?' } });
    expect(shown.map((hint) => hint.text)).toContain("I'm fine, thank you. And you?");
    const hidden = dialogueV2SayHintsForPartnerReply({ screen: 'scenario', studyTarget: 'en', interfaceLang: 'ru', reply: { id: 'persona_5', text: 'The weather was terrible yesterday.' } });
    expect(hidden).toEqual([]);
    expect(dialogueV2SayHintsForPartnerReply({ screen: 'freeform', studyTarget: 'en', interfaceLang: 'ru', reply: null })).toEqual([]);
  });

  it('язык без набора (it) — пусто', () => {
    expect(sayHintKindForPartnerReply('Ciao! Come stai?', 'it')).toBeNull();
  });
});

describe('подсказка — ответ на реплику, а не случайная фраза (жалоба владельца 11.11)', () => {
  const texts = (text: string, target = 'en') => dialogueV2SayHintsForPartnerReply({
    screen: 'scenario', studyTarget: target, interfaceLang: 'ru', reply: { id: `r_${text.length}_${target}`, text },
  }).map((hint) => hint.text);

  it('случай из журнала: на «…How are you today?» не подсказываем сам вопрос «How are you?»', () => {
    const shown = texts("Hi! Nice to meet you. I'm Mila. How are you today?");
    expect(shown).toEqual(["I'm fine, thank you. And you?", 'Pretty good, thanks.']);
    expect(shown).not.toContain('How are you?');
  });

  it('решает ПОСЛЕДНИЙ вопрос реплики, а не её первое слово', () => {
    // приветствие в начале не даёт «Hello!», если дальше идёт вопрос
    expect(sayHintKindForPartnerReply('Hello! Welcome to the Grand Hotel. Do you have a reservation?', 'en')?.kind).toBe('generic');
    expect(texts('Hello! Welcome to the Grand Hotel. Do you have a reservation?')).toEqual(['Yes, of course.', 'No, not really.', "I don't know."]);
    expect(sayHintKindForPartnerReply('How are you? By the way, where do you live?', 'en')).toBeNull();
    expect(sayHintKindForPartnerReply('Hallo! Schön, dich zu sehen. Wie heißt du?', 'de')).toBeNull();
  });

  it('вопрос с выбором и «а у тебя?» — не «да/нет» и не предложение', () => {
    expect(sayHintKindForPartnerReply('Is it for here or to go?', 'en')).toBeNull();
    expect(sayHintKindForPartnerReply('I love jazz. How about you?', 'en')).toBeNull();
    expect(sayHintKindForPartnerReply('¿Quieres té o café?', 'es')).toBeNull();
    expect(sayHintKindForPartnerReply('Möchtest du Tee oder Kaffee?', 'de')).toBeNull();
  });

  it('вопросы «да/нет» четырёх языков распознаются, вопросы с вопросительным словом — нет', () => {
    expect(sayHintKindForPartnerReply('¿Te gusta vivir en la ciudad?', 'es')?.kind).toBe('generic');
    expect(sayHintKindForPartnerReply('¿Dónde vives ahora?', 'es')).toBeNull();
    expect(sayHintKindForPartnerReply('Est-ce que tu aimes le café ?', 'fr')?.kind).toBe('generic');
    expect(sayHintKindForPartnerReply('Où habites-tu ?', 'fr')).toBeNull();
    expect(sayHintKindForPartnerReply('Hast du heute Zeit?', 'de')?.kind).toBe('generic');
    expect(sayHintKindForPartnerReply('Was machst du heute?', 'de')).toBeNull();
  });

  it('приветствие и прощание — только когда в реплике нет вопроса; длинный рассказ с «Hi» — не приветствие', () => {
    expect(sayHintKindForPartnerReply('Hi there!', 'en')?.kind).toBe('greet');
    expect(sayHintKindForPartnerReply('Hi! I have your booking right here, room twelve on the second floor.', 'en')).toBeNull();
    expect(sayHintKindForPartnerReply('See you tomorrow! What time works for you?', 'en')).toBeNull();
  });

  it('набор ответов: каждый тип × язык обучения × язык интерфейса — фразы со смыслом, без повторов', () => {
    for (const kind of ['howAreYou', 'yesNo', 'proposal'] as const) for (const studyTarget of ['en', 'es', 'fr', 'de']) {
      for (const interfaceLang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl']) {
        const hints = answerSayHints({ studyTarget, kind, interfaceLang });
        expect(hints.length).toBeGreaterThanOrEqual(2);
        expect(new Set(hints.map((hint) => hint.text)).size).toBe(hints.length);
        for (const hint of hints) {
          if (interfaceLang === studyTarget) expect(hint.meaning).toBeNull();
          else expect(hint.meaning?.trim().length ?? 0).toBeGreaterThan(1);
        }
      }
    }
  });
});

describe('готовые ответы сервера на реплику (sayHints)', () => {
  const server = { replyText: "What's your name?", hints: Object.freeze([{ text: 'My name is Anna.', meaning: 'Меня зовут Анна.' }]) };
  const pick = (text: string, id: string) => dialogueV2SayHintsForPartnerReply({
    screen: 'scenario', studyTarget: 'en', interfaceLang: 'ru', reply: { id, text }, serverHints: server,
  });

  it('ответы сервера на ЭТУ реплику важнее локального набора — и показываются там, где локального ответа нет', () => {
    expect(pick("What's your name?", 's1')).toBe(server.hints);
  });

  it('ответы сервера на другую реплику не показываются — работает запасной локальный набор', () => {
    expect(pick('How are you?', 's2').map((hint) => hint.text)).toEqual(["I'm fine, thank you. And you?", 'Pretty good, thanks.']);
    expect(pick('The weather was terrible yesterday.', 's3')).toEqual([]);
  });

  describe('разбор ответа хода и версия запроса', () => {
    const baseCoaching = () => ({
      replyTranslations: ['Как тебя зовут?'], replyExplanations: ['Вопрос об имени.'], betterPhrasing: null, hint: null,
      mood: 'smile', activeObjectiveId: 'greet', dialogueEnded: false,
    });
    const request = {
      sessionId: `d2s_${'S'.repeat(32)}`, turnId: `d2t_${'T'.repeat(16)}`, studyTarget: 'en' as const,
      scenarioId: 'social_01', userMessage: 'Hello', interfaceLang: 'ru',
    };
    const okResponse = (coaching: Record<string, unknown>) => ({
      data: { ok: true, kind: 'reply', replayed: false, replies: [{ personaId: 'host', text: "What's your name?" }], coaching },
    });
    let warn: jest.SpyInstance;
    let log: jest.SpyInstance;
    beforeEach(() => {
      mockCallableRun.mockReset();
      warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
      log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    });
    afterEach(() => { warn.mockRestore(); log.mockRestore(); });

    it('sayHints разбираются; ответ без поля (сервер до выкладки, повтор хода) остаётся валидным — пусто', () => {
      const parsed = parseDialogueV2TurnCoaching({ ...baseCoaching(), allObjectivesComplete: false, sayHints: [
        { text: 'My name is Anna.', meaning: 'Меня зовут Анна.' }, { text: '  ', meaning: 'пусто' }, 'мусор',
      ] }, 1);
      expect(parsed?.sayHints).toEqual([{ text: 'My name is Anna.', meaning: 'Меня зовут Анна.' }]);
      expect(parseDialogueV2TurnCoaching(baseCoaching(), 1)?.sayHints).toEqual([]);
      const broken = parseDialogueV2TurnCoaching({ ...baseCoaching(), sayHints: 'no' }, 1);
      expect(broken?.sayHints).toEqual([]);
      expect(broken?.replyTranslations).toEqual(['Как тебя зовут?']);
    });

    // Порядок важен: первый тест — сервер знает версию 3; второй переводит модуль на версию 2 до перезапуска приложения.
    it('ход уходит с coachingVersion 3 и приносит готовые ответы', async () => {
      mockCallableRun.mockResolvedValueOnce(okResponse({ ...baseCoaching(), allObjectivesComplete: false, sayHints: [{ text: 'My name is Anna.', meaning: 'Меня зовут Анна.' }] }));
      const result = await sendDialogueV2CoachedTextTurn(request);
      expect(mockCallableRun).toHaveBeenCalledTimes(1);
      expect(mockCallableRun.mock.calls[0][0]).toMatchObject({ coachingVersion: 3, turnId: request.turnId });
      expect(result.kind === 'reply' ? result.coaching?.sayHints : null).toEqual([{ text: 'My name is Anna.', meaning: 'Меня зовут Анна.' }]);
    });

    it('сервер до выкладки отклонил версию 3 — тот же ход повторяется версией 2 и проходит; дальше сразу версия 2', async () => {
      mockCallableRun
        .mockRejectedValueOnce(Object.assign(new Error('dialogue_v2_turn_request_invalid'), { code: 'functions/invalid-argument' }))
        .mockResolvedValueOnce(okResponse({ ...baseCoaching(), allObjectivesComplete: false }))
        .mockResolvedValueOnce(okResponse({ ...baseCoaching(), allObjectivesComplete: false }));
      const result = await sendDialogueV2CoachedTextTurn(request);
      expect(mockCallableRun.mock.calls.map((call) => call[0].coachingVersion)).toEqual([3, 2]);
      expect(mockCallableRun.mock.calls[1][0].turnId).toBe(request.turnId);
      expect(result.kind === 'reply' ? result.coaching?.sayHints : null).toEqual([]);
      await sendDialogueV2CoachedTextTurn(request);
      expect(mockCallableRun.mock.calls.map((call) => call[0].coachingVersion)).toEqual([3, 2, 2]);
    });
  });
});

describe('какая реплика — последняя реплика собеседника', () => {
  const nudge = pickDialogueNotUnderstoodReply('en', null).text;
  it('мягкий ответ «скажи на изучаемом языке» пропускается — отвечаем на вопрос перед ним', () => {
    const messages = [
      { id: 'persona_0', author: 'persona', text: "What's your name?" },
      { id: 'learner_2', author: 'learner', text: 'Меня зовут Аня' },
      { id: 'persona_3', author: 'persona', text: nudge },
    ];
    const picked = lastPartnerReplyForHints(messages, (m) => m.author === 'persona');
    expect(picked).toEqual({ reply: { id: 'persona_0', text: "What's your name?" }, skippedNudge: 1 });
  });
  it('реплики ученика после вопроса не мешают', () => {
    const messages = [
      { id: 'a1', author: 'assistant', text: 'Hello! How are you?' },
      { id: 'l2', author: 'learner', text: 'Fine' },
    ];
    expect(lastPartnerReplyForHints(messages, (m) => m.author === 'assistant').reply?.id).toBe('a1');
  });
});

describe('журнал и проводка', () => {
  it('[DIALOG-HINTS] пишет реплику, источник, тип, ключ, причину и показанные фразы', () => {
    const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    dialogueV2SayHintsForPartnerReply({ screen: 'freeform', studyTarget: 'de', interfaceLang: 'ru', reply: { id: 'a9', text: 'Wie geht es dir?' } });
    const line = log.mock.calls.find((args) => args[0] === '[DIALOG-HINTS]');
    log.mockRestore();
    expect(line).toBeDefined();
    expect(JSON.parse(String(line![1]))).toEqual(expect.objectContaining({
      screen: 'freeform', replyId: 'a9', replyText: 'Wie geht es dir?', source: 'local_by_reply', kind: 'howAreYou', key: 'wie_gehts', reason: 'matched',
    }));
  });
  it('оба маршрута берут подсказки по последней реплике собеседника, не по цели шага и не по счёту реплик', () => {
    const session = readSource('app/dialogue_v2_session.tsx');
    const freeform = readSource('app/dialogue_v2_freeform.tsx');
    expect(session).toContain("lastPartnerReplyForHints(messages, (message) => message.author === 'persona')");
    expect(freeform).toContain("lastPartnerReplyForHints(messages, (message) => message.author === 'assistant')");
    expect(session).not.toContain('dialogueV2ScenarioSayHints');
    expect(freeform).not.toContain('dialogueV2FreeformSayHints');
  });
});

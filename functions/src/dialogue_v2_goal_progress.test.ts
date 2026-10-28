import type { DialogueV2LanguagePack } from '../../shared/dialogue_v2_language_pack_contract';
import { creditQuestionObjectives, type CompletionFeedback } from './dialogue_v2_completion_server';
import {
  advanceQuestionObjective,
  detectLearnerQuestion,
  isQuestionObjectiveLabel,
} from './dialogue_v2_goal_progress';
import { parseDialogueV2TurnCoaching } from './dialogue_v2_turn_coaching';

// зачем (координатор 28.10: «Задать один вопрос» в Диалогах не проходит ни у кого): цель засчитывается, когда ученик
// спросил — со знаком «?» или без, в начале или в середине реплики; утверждения цель не закрывают.

describe('распознавание вопроса ученика', () => {
  const questions: ReadonlyArray<readonly [string, string]> = [
    ['en', 'Can I ask you something?'],
    ['en', 'Where is the station?'],
    ['en', 'where is the station'],
    ['en', 'Nice to meet you. Where are you from'],
    ['en', 'I am from Kyiv, do you like it here'],
    ['en', 'I am fine, how about you'],
    ['en', 'Is the station far'],
    ['en', 'You live here, right'],
    ['es', '¿Dónde está la estación?'],
    ['es', 'donde esta la estacion'],
    ['es', 'Hola. Cómo te llamas'],
    ['fr', 'Où est la gare'],
    ['fr', 'Bonjour. Tu viens d’où ?'],
    ['fr', 'Parlez-vous anglais'],
    ['fr', 'Qui es-tu'],
    ['de', 'Wo ist der Bahnhof'],
    ['de', 'Hallo. Kannst du mir helfen'],
    ['de', 'Möchtest du Kaffee'],
  ];
  it.each(questions)('%s: «%s» — вопрос', (lang, text) => {
    expect(detectLearnerQuestion(text, lang).question).toBe(true);
  });

  const statements: ReadonlyArray<readonly [string, string]> = [
    ['en', 'I like coffee.'],
    ['en', 'What a nice day!'],
    ['en', 'Have a nice day'],
    ['en', 'When I was young, I lived here'],
    ['es', 'Me llamo Ana.'],
    ['es', 'Cuando era niño vivía aquí'],
    ['fr', 'Je quitte Paris demain'],
    ['de', 'Ich heiße Anna.'],
  ];
  it.each(statements)('%s: «%s» — не вопрос', (lang, text) => {
    expect(detectLearnerQuestion(text, lang).question).toBe(false);
  });

  // зачем (Ревизор 28.10): один знак без слова цель не закрывает.
  it('«?» и «??» без слова — не вопрос; «ok?» — вопрос', () => {
    expect(detectLearnerQuestion('?', 'en')).toEqual({ question: false, rule: 'none' });
    expect(detectLearnerQuestion('??', 'en')).toEqual({ question: false, rule: 'none' });
    expect(detectLearnerQuestion('¿?', 'es')).toEqual({ question: false, rule: 'none' });
    expect(detectLearnerQuestion('ok?', 'en')).toEqual({ question: true, rule: 'question_mark' });
  });

  it('NFD (диакритика отдельным символом) распознаётся так же', () => {
    expect(detectLearnerQuestion('Où est la gare'.normalize('NFD'), 'fr')).toEqual({ question: true, rule: 'wh:où' });
    expect(detectLearnerQuestion('donde esta'.normalize('NFD'), 'es').question).toBe(true);
  });
});

describe('«вопросная» цель по подписи на языке обучения', () => {
  it('Ask… / Hacer una pregunta / Poser une question / Frage stellen — да; «Answer a question» — нет', () => {
    expect(isQuestionObjectiveLabel('Ask one simple question', 'en')).toBe(true);
    expect(isQuestionObjectiveLabel('Ask about transport', 'en')).toBe(true);
    expect(isQuestionObjectiveLabel('Answer a question in return', 'en')).toBe(false);
    expect(isQuestionObjectiveLabel('Hacer una pregunta sencilla', 'es')).toBe(true);
    expect(isQuestionObjectiveLabel('Responder a una pregunta', 'es')).toBe(false);
    expect(isQuestionObjectiveLabel('Poser une question simple', 'fr')).toBe(true);
    expect(isQuestionObjectiveLabel('Répondre à une question en retour', 'fr')).toBe(false);
    expect(isQuestionObjectiveLabel('Eine einfache Frage stellen', 'de')).toBe(true);
    expect(isQuestionObjectiveLabel('Fragen, ob das passt', 'de')).toBe(true);
    expect(isQuestionObjectiveLabel('Eine Gegenfrage beantworten', 'de')).toBe(false);
  });
});

const SOCIAL_01 = [
  { id: 'objective_03', label: 'Say where you met' },
  { id: 'objective_04', label: 'Ask one simple question' },
  { id: 'objective_05', label: 'Answer a question in return' },
] as const;

describe('ход: указатель цели', () => {
  it('модель держит «спросить», ученик спросил (с «?», без, в середине) → следующая цель', () => {
    for (const text of ['Can I ask you something?', 'Where is the station?', 'where is the station', 'Nice to meet you. Where are you from']) {
      const step = advanceQuestionObjective({ activeObjectiveId: 'objective_04', objectives: SOCIAL_01, userMessage: text, studyTarget: 'en' });
      expect([text, step.activeObjectiveId, step.reason]).toEqual([text, 'objective_05', 'advanced']);
    }
  });

  it('утверждение — цель остаётся; не «вопросная» цель — не трогаем; последнюю не сдвигаем', () => {
    expect(advanceQuestionObjective({ activeObjectiveId: 'objective_04', objectives: SOCIAL_01, userMessage: 'I like tea', studyTarget: 'en' }))
      .toMatchObject({ activeObjectiveId: 'objective_04', advanced: false, reason: 'not_a_question' });
    expect(advanceQuestionObjective({ activeObjectiveId: 'objective_03', objectives: SOCIAL_01, userMessage: 'Where are you from?', studyTarget: 'en' }))
      .toMatchObject({ activeObjectiveId: 'objective_03', advanced: false, reason: 'not_question_objective' });
    const last = [{ id: 'a', label: 'Greet' }, { id: 'b', label: 'Ask about the event' }];
    expect(advanceQuestionObjective({ activeObjectiveId: 'b', objectives: last, userMessage: 'How was it?', studyTarget: 'en' }))
      .toMatchObject({ activeObjectiveId: 'b', advanced: false, reason: 'last_objective_kept' });
  });

  it('разбор хода: сервер сдвигает указатель и отдаёт решение для журнала', () => {
    const result = parseDialogueV2TurnCoaching({
      replyTranslations: ['Перевод'],
      replyExplanations: ['Разбор «Hi».'],
      betterPhrasing: null,
      hint: 'Спроси что-нибудь',
      mood: 'smile',
      activeObjectiveId: 'objective_04',
      dialogueEnded: false,
    }, {
      replyCount: 1,
      userMessage: 'Nice to meet you. Where are you from',
      studyTarget: 'en',
      objectiveIds: SOCIAL_01.map((o) => o.id),
      objectives: SOCIAL_01,
      assertStudyLanguage: () => undefined,
    });
    expect(result.coaching.activeObjectiveId).toBe('objective_05');
    expect(result.goal).toMatchObject({ modelActiveObjectiveId: 'objective_04', advanced: true, reason: 'advanced', detection: { question: true, rule: 'wh:where' } });
  });
});

describe('итог: «вопросная» цель met, если ученик спросил', () => {
  const pack = {
    studyTarget: 'en',
    scenario: { objectives: SOCIAL_01 },
  } as unknown as DialogueV2LanguagePack;
  const feedback = (status: 'met' | 'not_met'): CompletionFeedback => Object.freeze({
    overallAssessment: 'ok',
    nextStep: 'next',
    speakerPersonaId: 'host',
    objectiveResults: Object.freeze([
      Object.freeze({ objectiveId: 'objective_03', status: 'met' as const, evidenceMessageIds: Object.freeze(['u_0001']) }),
      Object.freeze({ objectiveId: 'objective_04', status, evidenceMessageIds: Object.freeze(['u_0001']) }),
      Object.freeze({ objectiveId: 'objective_05', status: 'not_met' as const, evidenceMessageIds: Object.freeze(['u_0001']) }),
    ]),
    evidenceMessageIds: Object.freeze(['u_0001']),
    languageNote: null,
  });
  beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });
  afterEach(() => { jest.restoreAllMocks(); });

  it('модель not_met, в реплике есть вопрос без «?» → met с доказательством этой реплики', () => {
    const ledger = { ids: ['u_0001', 'u_0002'], messages: { u_0001: 'Hi, I am Ana.', u_0002: 'We met at work. Where do you live' } };
    const out = creditQuestionObjectives(feedback('not_met'), pack, ledger, 'social_01');
    expect(out.objectiveResults[1]).toEqual({ objectiveId: 'objective_04', status: 'met', evidenceMessageIds: ['u_0002'] });
    expect(out.objectiveResults[2].status).toBe('not_met'); // «Answer a question» — не «вопросная»
    expect(out.evidenceMessageIds).toEqual(['u_0001', 'u_0002']);
  });

  it('вопросов нет — итог модели без изменений; модель уже met — без изменений', () => {
    const ledger = { ids: ['u_0001'], messages: { u_0001: 'Hi, I am Ana.' } };
    const notMet = feedback('not_met');
    expect(creditQuestionObjectives(notMet, pack, ledger, 'social_01')).toBe(notMet);
    const met = feedback('met');
    expect(creditQuestionObjectives(met, pack, { ids: ['u_0001'], messages: { u_0001: 'Where are you from?' } }, 'social_01')).toBe(met);
  });
});

/**
 * Контракт текстового урока с Максом: конверт хода и его инструменты.
 *
 * зачем (владелец 2026-09-14): «весь каркас Макса… он реально учит». Инструменты
 * (доска, отметка фразы, шаг мастерства, домашка) приезжают полями конверта —
 * если разбор сломается, урок молча превратится в обычную болтовню без доски и
 * без прогресса, и заметить это будет нечем.
 *
 * Отдельно сторожим: реплика спасается из ОБРЕЗАННОГО JSON. Иначе человек
 * увидит сырой JSON вместо слов учителя.
 */

import {
  assertTutorTextTargetLanguage,
  collectTutorTargetLanguageTexts,
  parseTutorEnvelope,
  sanitizeTutorTools,
} from './tutor_text_turn';
import { buildTutorTextPrompt, TUTOR_TEXT_PREFIX } from './tutor_text_prompt';
import { canDoGoalById } from './max_voice_can_do_goals';

const EMPTY_MEMORY = {
  schemaVersion: 2 as const,
  stableUid: 'u1',
  preferredName: null,
  learningGoal: null,
  pacePreference: null,
  conversationHooks: [],
  activeIssues: [],
  resolvedIssues: [],
  facts: [],
  recurringErrors: [],
  homework: [],
  nextTopic: '',
  lastTalkSummary: '',
  callCount: 0,
  lastCallAtMs: 0,
  lastCefr: 'A2',
  languagePreference: null,
  phraseQueue: [],
  scenesDone: 0,
  scenesTotal: 0,
  goalMastery: {},
  recentSessionIds: [],
};

describe('parseTutorEnvelope', () => {
  it('разбирает полный конверт урока с инструментами', () => {
    const out = parseTutorEnvelope(JSON.stringify({
      reply: "Скажи это сама: [[I'd like a table for two]].",
      board: { text: "I'd like a table for two.", meaning: 'Мне столик на двоих.' },
      phraseResult: { text: "I'd like a table for two.", ok: true },
      goalMastery: 2,
      homework: ['The bill, please.'],
      nextTopic: 'просим счёт',
      lessonComplete: false,
    }));
    expect(out).not.toBeNull();
    expect(out!.reply).toContain('Скажи это сама');
    expect(out!.tools.board).toEqual({ text: "I'd like a table for two.", meaning: 'Мне столик на двоих.' });
    expect(out!.tools.phraseResult).toEqual({ text: "I'd like a table for two.", ok: true });
    expect(out!.tools.goalMastery).toBe(2);
    expect(out!.tools.homework).toEqual(['The bill, please.']);
  });

  it('спасает реплику из ОБРЕЗАННОГО JSON, инструменты отбрасывает', () => {
    const out = parseTutorEnvelope('{"reply":"Привет! Сегодня учимся заказывать ужин.","board":{"text":"I\'d li');
    expect(out).not.toBeNull();
    expect(out!.reply).toBe('Привет! Сегодня учимся заказывать ужин.');
    expect(out!.truncated).toBe(true);
    expect(out!.tools.board).toBeNull();
  });

  it('пустая реплика = нечего показать, null', () => {
    expect(parseTutorEnvelope('{"reply":""}')).toBeNull();
    expect(parseTutorEnvelope('совсем не json')).toBeNull();
  });

  it('снимает ```json-ограждения', () => {
    const out = parseTutorEnvelope('```json\n{"reply":"Поехали!"}\n```');
    expect(out!.reply).toBe('Поехали!');
  });
});

describe('sanitizeTutorTools', () => {
  it('мусор превращает в пустые инструменты, не бросая', () => {
    const tools = sanitizeTutorTools({ board: 'строка', phraseResult: 5, homework: 'нет', goalMastery: 'три' });
    expect(tools.board).toBeNull();
    expect(tools.phraseResult).toBeNull();
    expect(tools.homework).toEqual([]);
    expect(tools.goalMastery).toBeNull();
  });

  it('мастерство зажимается в 0..3 — модель не выдаёт лишнего прогресса', () => {
    expect(sanitizeTutorTools({ goalMastery: 9 }).goalMastery).toBe(3);
    expect(sanitizeTutorTools({ goalMastery: -4 }).goalMastery).toBe(0);
  });

  it('снимает [[маркеры]] с доски и домашки — их вставляют в карточки как есть', () => {
    const tools = sanitizeTutorTools({
      board: { text: '[[To go, please]]', meaning: 'на вынос' },
      homework: ['[[The bill, please]]', ''],
    });
    expect(tools.board?.text).toBe('To go, please');
    expect(tools.homework).toEqual(['The bill, please']);
  });

  it('держит не больше трёх фраз домашки', () => {
    const tools = sanitizeTutorTools({ homework: ['a', 'b', 'c', 'd', 'e'] });
    expect(tools.homework).toHaveLength(3);
  });

  it('board без текста отбрасывается — пустую доску показывать нечем', () => {
    expect(sanitizeTutorTools({ board: { meaning: 'только перевод' } }).board).toBeNull();
  });
});

describe('buildTutorTextPrompt', () => {
  const base = {
    cefr: 'A2',
    interfaceLang: 'ru',
    studyTarget: 'en' as const,
    goal: canDoGoalById('a2_restaurant') ?? null,
    mastery: {},
    memory: EMPTY_MEMORY,
    turnIndex: 0,
    learnerName: '',
    nowMs: 1_700_000_000_000,
  };

  it('Макс — учитель, а не роль в сцене (прямое требование владельца)', () => {
    const prompt = buildTutorTextPrompt(base);
    expect(prompt).toContain('You TEACH');
    expect(prompt).toContain('not a role-play partner');
  });

  it('Макс говорит первым и никогда не молчит', () => {
    expect(TUTOR_TEXT_PREFIX).toContain('YOU ALWAYS SPEAK FIRST AND NEVER GO SILENT');
  });

  it('нет голосовых правил: они бессмысленны в тексте и стоили бы токенов', () => {
    const prompt = buildTutorTextPrompt(base);
    expect(prompt).not.toContain('SPEAK VERY SLOWLY');
    expect(prompt).not.toContain('fifteen seconds');
  });

  it('цель урока берётся из каталога can-do MAX', () => {
    const prompt = buildTutorTextPrompt(base);
    expect(prompt).toContain('CURRENT SPEAKING GOAL');
    expect(prompt).toContain('a2_restaurant');
  });

  it.each([
    ['es', 'Spanish', '[[Quisiera una mesa para dos]]'],
    ['fr', 'French', '[[Je voudrais une table pour deux]]'],
    ['de', 'German', '[[Ich hätte gern einen Tisch für zwei]]'],
  ] as const)('builds a native %s goal without leaking English catalog examples', (studyTarget, name, ownExample) => {
    const prompt = buildTutorTextPrompt({ ...base, studyTarget });
    expect(prompt).toContain(`Learning: ${name}`);
    expect(prompt).toContain(`exactly ${name}`);
    expect(prompt).toContain(ownExample);
    expect(prompt).not.toContain("I'd like a table for two");
    expect(prompt).not.toContain('going to / will');
  });

  it('без цели просит Макса предложить темы, а не молчать', () => {
    const prompt = buildTutorTextPrompt({ ...base, goal: null });
    expect(prompt).toContain('ask the learner what they want to practice today');
  });

  it('бюджет урока считается репликами: начало, практика, закрытие', () => {
    expect(buildTutorTextPrompt({ ...base, turnIndex: 0 })).toContain('very beginning');
    expect(buildTutorTextPrompt({ ...base, turnIndex: 5 })).toContain('teaching and first practice');
    expect(buildTutorTextPrompt({ ...base, turnIndex: 14 })).toContain('time to close');
  });

  it('имя ученика попадает в персональный блок, а его отсутствие не ломает промпт', () => {
    expect(buildTutorTextPrompt({ ...base, learnerName: 'Лена' })).toContain('Their name: Лена');
    expect(buildTutorTextPrompt(base)).toContain('do not know their name yet');
  });

  it('персональные данные идут В КОНЦЕ: префикс остаётся кэшируемым', () => {
    const prompt = buildTutorTextPrompt({ ...base, learnerName: 'Лена' });
    expect(prompt.indexOf('YOUR LEARNER')).toBeGreaterThan(prompt.indexOf('LESSON SHAPE'));
    expect(prompt.startsWith(TUTOR_TEXT_PREFIX.slice(0, 80))).toBe(true);
  });
});

describe('tutor target-language output boundary', () => {
  const envelope = {
    reply: 'Пояснение. [[Ich hätte gern einen Kaffee.]]',
    tools: {
      board: { text: 'Ich hätte gern einen Kaffee.', meaning: 'Я бы хотел кофе.' },
      phraseResult: { text: 'Ich hätte gern einen Kaffee.', ok: true },
      homework: ['Die Rechnung, bitte.'],
      nextTopic: 'заказ еды',
    },
    coach: {
      note: 'Пояснение по-русски',
      translation: 'Перевод по-русски',
      suggestions: ['Noch einen Tee, bitte.'],
      userFix: { corrected: 'Ich möchte bezahlen.', note: 'Комментарий' },
    },
  };

  it('collects only learner target-language spans and fields', () => {
    expect(collectTutorTargetLanguageTexts(envelope)).toEqual(expect.arrayContaining([
      'Ich hätte gern einen Kaffee.', 'Die Rechnung, bitte.', 'Noch einen Tee, bitte.', 'Ich möchte bezahlen.',
    ]));
    expect(collectTutorTargetLanguageTexts(envelope)).not.toEqual(expect.arrayContaining([
      'Пояснение по-русски', 'Перевод по-русски', 'заказ еды',
    ]));
  });

  it('rejects an English generated target span for German', () => {
    expect(() => assertTutorTextTargetLanguage({ ...envelope, reply: 'Попробуй: [[You are in the restaurant and this is the phrase for today.]]' }, 'de'))
      .toThrow('tutor_text_wrong_language');
  });
});

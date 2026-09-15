/**
 * Контракт памяти урока с Максом: что именно остаётся после закрывающего хода.
 *
 * зачем: до этой правки память только ЧИТАЛАСЬ — Макс забывал урок начисто и
 * вечно здоровался как на первом занятии. Такой дефект не даёт ни ошибки, ни
 * падения: человек просто не видит продолжения, а в логах чисто. Поймать это
 * можно только тестом на слияние.
 */

import {
  mergeTutorMemory,
  TUTOR_PHRASE_INTERVAL_DAYS,
  type TutorMemory,
  type TutorMemoryUpdate,
} from './max_voice_tutor_memory';

const NOW = 1_800_000_000_000;

const EMPTY: TutorMemory = {
  schemaVersion: 2,
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

/** Обновление ровно той формы, которую шлёт tutorTextTurn на закрывающем ходу. */
function lessonUpdate(over: Partial<TutorMemoryUpdate> = {}): TutorMemoryUpdate {
  return {
    nowMs: NOW,
    sessionId: 'tt_u1_1800000000',
    cefr: 'A2',
    homework: ['The bill, please.'],
    nextTopic: 'просим счёт',
    goalId: '',
    goalProgress: null,
    phraseResults: [{ text: 'The bill, please.', result: 'pass' }],
    enforceHomeworkEvidence: true,
    ...over,
  };
}

describe('память после урока с Максом', () => {
  it('сохраняет тему следующего урока — без неё афиша раздела пуста навсегда', () => {
    const next = mergeTutorMemory(EMPTY, lessonUpdate());
    expect(next.nextTopic).toBe('просим счёт');
  });

  it('засчитывает урок: счётчик занятий растёт, дата последнего обновляется', () => {
    const next = mergeTutorMemory(EMPTY, lessonUpdate());
    expect(next.callCount).toBe(1);
    expect(next.lastCallAtMs).toBe(NOW);
    expect(next.recentSessionIds[0]).toBe('tt_u1_1800000000');
  });

  it('удачная фраза встаёт в очередь повторения со сроком первого интервала', () => {
    const next = mergeTutorMemory(EMPTY, lessonUpdate());
    const item = next.phraseQueue.find((p) => p.text === 'The bill, please.');
    expect(item).toBeDefined();
    expect(item?.dueAtMs).toBe(NOW + TUTOR_PHRASE_INTERVAL_DAYS[0] * 86_400_000);
  });

  it('домашка без единой удачной попытки не сохраняется — пустой долг не заводим', () => {
    const next = mergeTutorMemory(
      EMPTY,
      lessonUpdate({ phraseResults: [{ text: 'The bill, please.', result: 'needs_work' }] }),
    );
    expect(next.homework).toEqual([]);
  });

  it('мастерство цели растёт на одну ступень за урок, а не прыжком до тройки', () => {
    const next = mergeTutorMemory(
      EMPTY,
      lessonUpdate({
        goalId: 'a1_greet',
        goalProgress: { goalId: 'a1_greet', mastery: 3, evidence: 'lesson' },
      }),
    );
    expect(next.goalMastery.a1_greet).toBe(1);
  });

  it('мастерство не падает: слабый урок не отнимает уже заработанное', () => {
    const prev: TutorMemory = { ...EMPTY, goalMastery: { a1_greet: 2 } };
    const next = mergeTutorMemory(
      prev,
      lessonUpdate({
        goalId: 'a1_greet',
        goalProgress: { goalId: 'a1_greet', mastery: 0, evidence: 'lesson' },
      }),
    );
    expect(next.goalMastery.a1_greet).toBe(2);
  });

  it('повторный ход того же урока не плодит записи в списке занятий', () => {
    const once = mergeTutorMemory(EMPTY, lessonUpdate());
    const twice = mergeTutorMemory(once, lessonUpdate());
    expect(twice.recentSessionIds).toEqual(['tt_u1_1800000000']);
  });
});

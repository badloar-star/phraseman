// зачем (владелец 11.10, ENERGY_MODES_OWNER_BRIEF): режим энергии Б — ошибка снимает энергию вместо сердечка, на последней
// энергии занятие останавливается, «продолжить» возвращает на то же место. Домен — чистая функция; режим — из рубильника.
import {
  createSessionAttemptsState,
  reduceSessionAttempts,
  SESSION_ATTEMPTS_MAX,
} from '../app/session_attempts/session_attempts_domain';
import {
  chargesEnergyOnMistake,
  energyActivityForAttemptsSessionId,
  isFreeInMistakeMode,
  isMistakeChargeActivity,
  peekEnergyMode,
} from '../app/energy_mode';
import { applyRemoteConfigSnapshot } from '../app/remote_flags';

const fresh = () => createSessionAttemptsState({ sessionId: 'lesson:en:1', questionId: 'q1' });

describe('домен: ошибка в режиме Б', () => {
  test('charged — энергия снята, сердечки не тронуты, занятие идёт', () => {
    const t = reduceSessionAttempts(fresh(), { type: 'energy_mistake', answerAttemptId: 'a1', outcome: 'charged' });
    expect(t.effect).toBe('energy_consumed');
    expect(t.state.phase).toBe('active');
    expect(t.state.remainingAttempts).toBe(SESSION_ATTEMPTS_MAX);
  });

  test('exhausted — последняя энергия: остановка stopped_no_energy', () => {
    const t = reduceSessionAttempts(fresh(), { type: 'energy_mistake', answerAttemptId: 'a1', outcome: 'exhausted' });
    expect(t.effect).toBe('energy_exhausted');
    expect(t.state.phase).toBe('stopped_no_energy');
    expect(t.state.remainingAttempts).toBe(SESSION_ATTEMPTS_MAX);
  });

  test('free — Plus: ничего не снято, эффекта нет', () => {
    const t = reduceSessionAttempts(fresh(), { type: 'energy_mistake', answerAttemptId: 'a1', outcome: 'free' });
    expect(t.effect).toBe('none');
    expect(t.state.phase).toBe('active');
  });

  test('повтор того же ответа (двойной тап) не снимает второй раз', () => {
    const first = reduceSessionAttempts(fresh(), { type: 'energy_mistake', answerAttemptId: 'a1', outcome: 'charged' });
    const again = reduceSessionAttempts(first.state, { type: 'energy_mistake', answerAttemptId: 'a1', outcome: 'charged' });
    expect(again.effect).toBe('none');
    expect(again.state).toBe(first.state);
  });

  test('в остановке ответы не принимаются, продолжение возвращает на тот же вопрос', () => {
    const stopped = reduceSessionAttempts(fresh(), { type: 'energy_mistake', answerAttemptId: 'a1', outcome: 'exhausted' }).state;
    const ignored = reduceSessionAttempts(stopped, { type: 'verdict', answerAttemptId: 'a2', verdict: 'correct' });
    expect(ignored.state).toBe(stopped);
    const resumed = reduceSessionAttempts(stopped, { type: 'resume_after_energy' });
    expect(resumed.effect).toBe('energy_resumed');
    expect(resumed.state.phase).toBe('active');
    expect(resumed.state.questionId).toBe('q1');
  });

  test('продолжение вне остановки — ничего не меняет', () => {
    const state = fresh();
    expect(reduceSessionAttempts(state, { type: 'resume_after_energy' }).state).toBe(state);
  });
});

describe('режим и виды занятий', () => {
  test('по умолчанию — режим А', () => {
    applyRemoteConfigSnapshot({});
    expect(peekEnergyMode()).toBe('start_charge');
  });

  test('рубильник energy_mistake_charge=true → режим Б', () => {
    applyRemoteConfigSnapshot({ bools: { energy_mistake_charge: true } });
    expect(peekEnergyMode()).toBe('mistake_charge');
    applyRemoteConfigSnapshot({ bools: { energy_mistake_charge: false } });
    expect(peekEnergyMode()).toBe('start_charge');
  });

  test('ключи сердечек всех экранов сопоставлены видам занятий', () => {
    expect(energyActivityForAttemptsSessionId('lesson:en:3')).toBe('classic_lesson');
    expect(energyActivityForAttemptsSessionId('lesson-words:en:3')).toBe('lesson_words');
    expect(energyActivityForAttemptsSessionId('irregular-verbs:en:2')).toBe('irregular_verbs');
    expect(energyActivityForAttemptsSessionId('mistake-practice:x')).toBe('mistake_practice');
    expect(energyActivityForAttemptsSessionId('flashcard-swipe:en:deck')).toBe('flashcards');
    expect(energyActivityForAttemptsSessionId('flashcard-blitz:en:all:1')).toBe('flashcards');
    expect(energyActivityForAttemptsSessionId('learning-v2-direct:1:1')).toBe('learning_v2_session');
    expect(energyActivityForAttemptsSessionId('learning-v2-route:x')).toBe('learning_v2_session');
    expect(energyActivityForAttemptsSessionId('something-else')).toBeNull();
  });

  test('диалоги, экзамены, Шпиль — не в режиме Б; занятия с сердечками — в нём', () => {
    expect(isMistakeChargeActivity('ai_dialog')).toBe(false);
    expect(isMistakeChargeActivity('level_exam')).toBe(false);
    expect(isMistakeChargeActivity('spire_step')).toBe(false);
    // ревью Opus 11.10: эти экраны пока не поддерживают остановку — остаются в режиме А
    expect(isMistakeChargeActivity('mistake_practice')).toBe(false);
    expect(isMistakeChargeActivity('preposition_drill')).toBe(false);
    expect(chargesEnergyOnMistake('classic_lesson', 'mistake_charge')).toBe(true);
    expect(chargesEnergyOnMistake('classic_lesson', 'start_charge')).toBe(false);
    expect(chargesEnergyOnMistake('ai_dialog', 'mistake_charge')).toBe(false);
    // координатор 11.10: отработка ошибок в режиме Б бесплатна целиком, в А — как сейчас
    expect(isFreeInMistakeMode('mistake_practice', 'mistake_charge')).toBe(true);
    expect(isFreeInMistakeMode('mistake_practice', 'start_charge')).toBe(false);
    expect(isFreeInMistakeMode('classic_lesson', 'mistake_charge')).toBe(false);
  });
});

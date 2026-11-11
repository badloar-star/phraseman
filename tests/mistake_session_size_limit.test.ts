import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';
import {
  MISTAKE_PRACTICE_MAX_SESSION,
  MISTAKE_RETRY_IDS_MAX,
  buildMistakePracticeSession,
  mistakePracticeLengthOptions,
  mistakePracticeSessionCount,
  parseMistakeRetryIdsParam,
} from '../modules/mistake-practice/session';
import { MISTAKE_STEPS_REQUIRED } from '../modules/mistake-practice/three_step_rule';

// зачем (владелец 11.11, D203 «да, ограничь»): в занятии ошибка проходит три шага, поэтому прежний потолок в 30 ошибок
// давал до 90 заданий подряд. Потолок — 10 ошибок: не больше 30 заданий, около 4 минут (макет mistakes-v3.html, «Отработать 10»).
const T0 = 1_760_000_000_000;

const captured = (index: number): MistakeEvent => ({
  eventId: `cap:${index}`,
  mistakeId: `mistake:v1:m${index}`,
  cycleId: `mistake-cycle:v1:m${index}`,
  type: 'captured',
  occurredAtMs: T0 + index,
  studyTarget: 'en',
  payload: {
    canonicalTarget: `She works at home ${index}`,
    facet: 'form',
    sourceKind: 'lesson_phrase',
    sourceId: `lesson-4:phrase-${index}`,
    sourceMeaning: `Она работает дома ${index}`,
    tokens: ['She', 'works', 'at', 'home', String(index)],
    distractors: ['work', 'working', 'in'],
    expected: 'works',
  },
});

const items = (count: number) => [...projectMistakes(Array.from({ length: count }, (_, index) => captured(index))).items.values()];

describe('mistake practice session size limit', () => {
  test('a session takes at most ten mistakes', () => {
    expect(MISTAKE_PRACTICE_MAX_SESSION).toBe(10);
    expect(mistakePracticeSessionCount('all', 48)).toBe(10);
    expect(mistakePracticeSessionCount('all', 7)).toBe(7);
  });

  test('no requested length can exceed the limit', () => {
    expect(mistakePracticeSessionCount('15', 48)).toBe(10);
    expect(mistakePracticeSessionCount('10', 48)).toBe(10);
    expect(mistakePracticeSessionCount('5', 48)).toBe(5);
  });

  test('a length above the limit is never offered', () => {
    const options = mistakePracticeLengthOptions(48);
    expect(options.find((option) => option.id === '15')?.enabled).toBe(false);
    expect(options.find((option) => option.id === '10')?.enabled).toBe(true);
    expect(options.at(-1)).toEqual({ id: 'all', count: 10, enabled: true });
  });

  test('with 34 waiting mistakes the session holds ten of them and at most thirty tasks', () => {
    const session = buildMistakePracticeSession({ items: items(34), requestedLength: 'all', nowMs: T0 + 1000 });
    expect(session.initialCount).toBe(10);
    expect(new Set(session.queue.map((entry) => entry.mistakeId)).size).toBe(10);
    expect(session.queue).toHaveLength(10 * MISTAKE_STEPS_REQUIRED);
  });

  test('the oldest mistakes go first, so the rest wait for the next session', () => {
    const session = buildMistakePracticeSession({ items: items(34), requestedLength: 'all', nowMs: T0 + 1000 });
    expect(session.queue.slice(0, 10).map((entry) => entry.mistakeId)).toEqual(
      Array.from({ length: 10 }, (_, index) => `mistake:v1:m${index}`),
    );
  });

  test('the «ещё N» route accepts no more ids than one session can hold', () => {
    expect(MISTAKE_RETRY_IDS_MAX).toBe(MISTAKE_PRACTICE_MAX_SESSION);
    const raw = Array.from({ length: 25 }, (_, index) => `mistake:v1:m${index}`).join(',');
    const parsed = parseMistakeRetryIdsParam(raw);
    expect(parsed.ids).toHaveLength(10);
    expect(parsed.overLimit).toBe(15);
  });
});

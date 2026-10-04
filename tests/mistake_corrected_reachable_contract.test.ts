/**
 * 04.10, «17 не уменьшается»: ошибка уходит из счётчика после 3 разных дней верных ответов в независимых
 * режимах; второй режим требуется, только если для этой ошибки он вообще возможен.
 */
import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { projectMistakes } from '../modules/mistake-practice/projection';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 9, 1, 10);

function event(type: MistakeEvent['type'], occurredAtMs: number, payload: Record<string, unknown> = {}): MistakeEvent {
  return {
    eventId: `${type}:${occurredAtMs}:${String(payload.mode ?? '')}`,
    mistakeId: 'mistake:v1:one',
    cycleId: 'cycle-1',
    type,
    occurredAtMs,
    studyTarget: 'en',
    payload,
  };
}

const answered = (day: number, mode: string, correct = true): MistakeEvent => event('practice_answered', T0 + day * DAY + 1, {
  correct,
  localDay: `2026-10-0${day + 1}`,
  mode,
  support: 'production',
});

test('meaning mistake (typing is the only independent mode) is corrected after 3 typing days', () => {
  const captured = event('captured', T0, { facet: 'meaning', canonicalTarget: 'I trust you', distractors: ['I hear you'] });
  const item = projectMistakes([captured, answered(0, 'lesson_typing'), answered(1, 'lesson_typing'), answered(2, 'lesson_typing')])
    .items.get('mistake:v1:one');
  expect(item?.status).toBe('corrected');
});

test('form mistake without audio needs only typing; two typing days are not enough', () => {
  const captured = event('captured', T0, { facet: 'form', canonicalTarget: 'She is ready' });
  const two = projectMistakes([captured, answered(0, 'lesson_typing'), answered(1, 'lesson_typing')]).items.get('mistake:v1:one');
  expect(two?.status).toBe('active');
  const three = projectMistakes([captured, answered(0, 'lesson_typing'), answered(1, 'lesson_typing'), answered(2, 'lesson_typing')])
    .items.get('mistake:v1:one');
  expect(three?.status).toBe('corrected');
});

test('pronunciation mistake with audio still needs two independent modes (typing + speech)', () => {
  const captured = event('captured', T0, { facet: 'pronunciation', canonicalTarget: 'I am afraid', audioRef: 'a.mp3' });
  const typingOnly = projectMistakes([captured, answered(0, 'lesson_typing'), answered(1, 'lesson_typing'), answered(2, 'lesson_typing')])
    .items.get('mistake:v1:one');
  expect(typingOnly?.status).toBe('active');
  const mixed = projectMistakes([captured, answered(0, 'lesson_typing'), answered(1, 'lesson_scripted_speech'), answered(2, 'lesson_typing')])
    .items.get('mistake:v1:one');
  expect(mixed?.status).toBe('corrected');
});

test('a wrong answer still resets the qualifying days', () => {
  const captured = event('captured', T0, { facet: 'meaning', canonicalTarget: 'I trust you' });
  const item = projectMistakes([
    captured, answered(0, 'lesson_typing'), answered(1, 'lesson_typing'), answered(2, 'lesson_typing', false), answered(3, 'lesson_typing'),
  ]).items.get('mistake:v1:one');
  expect(item?.status).toBe('active');
  expect(item?.qualifyingDays).toHaveLength(1);
});

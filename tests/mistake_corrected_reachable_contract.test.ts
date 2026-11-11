/**
 * Ошибка обязана быть достижимо исправимой (04.10, «17 не уменьшается»): какой бы она ни была, есть конечный путь,
 * после которого она уходит из счётчика.
 *
 * зачем (владелец 11.11, D203): путь теперь один для всех — три верных шага. Прежнее правило «три разных дня в независимых
 * режимах, для некоторых ошибок — в двух» отменено: оно и порождало ошибки, которые не уходили никогда.
 */
import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { MISTAKE_RULE_THREE_STEPS, projectMistakes } from '../modules/mistake-practice/projection';

const T0 = Date.UTC(2026, 9, 1, 10);
let seq = 0;

function event(type: MistakeEvent['type'], occurredAtMs: number, payload: Record<string, unknown> = {}): MistakeEvent {
  return {
    eventId: `${type}:${occurredAtMs}:${seq += 1}`,
    mistakeId: 'mistake:v1:one',
    cycleId: 'cycle-1',
    type,
    occurredAtMs,
    studyTarget: 'en',
    payload,
  };
}

const answered = (step: number, mode: string, correct = true): MistakeEvent => event('practice_answered', T0 + step + 1, {
  correct,
  localDay: '2026-10-01',
  mode,
  rule: MISTAKE_RULE_THREE_STEPS,
});

const status = (events: MistakeEvent[]) => projectMistakes(events).items.get('mistake:v1:one')?.status;

test.each([
  ['meaning', { canonicalTarget: 'I trust you', distractors: ['I hear you'] }, 'lesson_choice'],
  ['form', { canonicalTarget: 'She is ready' }, 'lesson_typing'],
  ['pronunciation', { canonicalTarget: 'I am afraid', audioRef: 'a.mp3' }, 'lesson_scripted_speech'],
  ['listening', { canonicalTarget: 'She works', audioRef: 'b.mp3' }, 'lesson_listening'],
  ['word_order', { canonicalTarget: 'I always drink coffee', tokens: ['I', 'always', 'drink', 'coffee'] }, 'lesson_ordered_tokens'],
  ['missing_token', { canonicalTarget: 'She works at home', tokens: ['She', 'works', 'at', 'home'] }, 'lesson_fill_gap'],
])('%s mistake is corrected by three correct steps in a single kind of task', (facet, content, mode) => {
  const captured = event('captured', T0, { facet, ...content });
  expect(status([captured, answered(0, mode), answered(1, mode)])).toBe('active');
  expect(status([captured, answered(0, mode), answered(1, mode), answered(2, mode)])).toBe('corrected');
});

test('three steps on one day are enough — no waiting for other days', () => {
  const captured = event('captured', T0, { facet: 'form', canonicalTarget: 'She is ready' });
  expect(status([captured, answered(0, 'lesson_choice'), answered(1, 'lesson_fill_gap'), answered(2, 'lesson_typing')])).toBe('corrected');
});

test('a miss costs one step, so the path stays finite: right, miss, right, right, right', () => {
  const captured = event('captured', T0, { facet: 'meaning', canonicalTarget: 'I trust you' });
  const path = [captured, answered(0, 'lesson_typing'), answered(1, 'lesson_typing', false), answered(2, 'lesson_typing'), answered(3, 'lesson_typing')];
  expect(status(path)).toBe('active');
  expect(status([...path, answered(4, 'lesson_typing')])).toBe('corrected');
});

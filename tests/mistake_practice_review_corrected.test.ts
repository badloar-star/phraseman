// зачем (владелец 04.10, «Повторить исправленные»): отработка умеет собирать сессию из уже исправленных
// ошибок для закрепления. Верный ответ в повторе не трогает «исправлена»; ошибка в повторе возвращает
// ошибку в активные. Без нового параметра всё как раньше байт в байт.
import type { MistakeEvent } from '../modules/mistake-practice/contracts';
import { projectMistakes, type MistakeProjectionItem } from '../modules/mistake-practice/projection';
import { correctedMistakeCount, selectCorrectedMistakesForReview } from '../modules/mistake-practice/scheduler';
import { buildMistakePracticeSession } from '../modules/mistake-practice/session';

const DAY = 24 * 60 * 60 * 1000;
const T0 = Date.UTC(2026, 7, 20, 10);

function item(index: number, status: MistakeProjectionItem['status'], correctedAtMs: number | null = null): MistakeProjectionItem {
  return {
    mistakeId: `mistake-${index}`,
    cycleId: 'cycle-1',
    studyTarget: 'en',
    status,
    firstCapturedAtMs: index,
    lastEventAtMs: index,
    // срок у исправленных далеко в будущем — повтор его не ждёт
    dueAtMs: status === 'corrected' ? 10 ** 15 : 0,
    correctedAtMs,
    captureCount: 1,
    hintCount: 0,
    qualifyingDays: [],
    qualifyingModes: [],
    hasIndependentProduction: false,
    lessonId: '1',
    facet: index % 2 ? 'meaning' : 'word_order',
    canonicalTarget: `I am ready ${index}.`,
    sourceMeaning: `Я готов ${index}.`,
    tokens: ['I', 'am', 'ready'],
    distractors: ['are'],
  };
}

const ITEMS = [
  item(1, 'active'),
  item(2, 'corrected', 300),
  item(3, 'corrected', 100),
  item(4, 'hidden'),
  item(5, 'corrected', 200),
];
const BASE = { items: ITEMS, requestedLength: 'all' as const, nowMs: 1_000 };

describe('сборка повтора исправленных', () => {
  test('без параметра pool сессия прежняя байт в байт', () => {
    const plain = buildMistakePracticeSession(BASE);
    expect(buildMistakePracticeSession({ ...BASE, pool: 'active' })).toEqual(plain);
    expect(plain.queue.map((entry) => entry.mistakeId)).toEqual(['mistake-1']);
    expect(plain).not.toHaveProperty('pool');
  });

  test("pool: 'corrected' берёт только исправленные, без учёта срока, давно исправленные первыми", () => {
    const review = buildMistakePracticeSession({ ...BASE, pool: 'corrected' });
    expect(review.queue.map((entry) => entry.mistakeId)).toEqual(['mistake-3', 'mistake-5', 'mistake-2']);
    expect(review.pool).toBe('corrected');
    expect(review.sessionId).not.toBe(buildMistakePracticeSession({ ...BASE, items: ITEMS.filter((i) => i.status === 'corrected').map((i) => ({ ...i, status: 'active' as const, dueAtMs: 0 })) }).sessionId);
  });

  test('facets работают и в повторе', () => {
    const review = buildMistakePracticeSession({ ...BASE, pool: 'corrected', facets: ['meaning'] });
    expect(review.queue.map((entry) => entry.mistakeId)).toEqual(['mistake-3', 'mistake-5']);
  });

  test('нет исправленных — понятный отказ, а не пустая сессия', () => {
    expect(() => buildMistakePracticeSession({ ...BASE, items: [item(1, 'active')], pool: 'corrected' }))
      .toThrow('mistake_practice_no_ready_mistakes');
  });

  test('счётчик для кнопки и выборка с лимитом', () => {
    expect(correctedMistakeCount(ITEMS)).toBe(3);
    expect(selectCorrectedMistakesForReview(ITEMS, { limit: 1 }).map((i) => i.mistakeId)).toEqual(['mistake-3']);
  });
});

// ── Журнал: ответы в повторе ────────────────────────────────────────────────
function event(type: MistakeEvent['type'], occurredAtMs: number, payload: Record<string, unknown> = {}): MistakeEvent {
  return {
    eventId: `${type}:${occurredAtMs}:${String(payload.mode ?? '')}:${String(payload.review ?? '')}:${String(payload.correct ?? '')}`,
    mistakeId: 'mistake:v1:one',
    cycleId: 'cycle-1',
    type,
    occurredAtMs,
    studyTarget: 'en',
    payload,
  };
}

const answer = (at: number, day: string, mode: string, extra: Record<string, unknown> = {}) =>
  event('practice_answered', at, { correct: true, independent: true, localDay: day, mode, support: 'production', ...extra });

const CORRECTED_HISTORY: MistakeEvent[] = [
  event('captured', T0, { lessonId: 'lesson-1', facet: 'word_order', canonicalTarget: 'I am ready.' }),
  answer(T0 + 1, '2026-08-20', 'lesson_scripted_speech'),
  answer(T0 + DAY, '2026-08-21', 'lesson_typing'),
  answer(T0 + DAY * 2, '2026-08-22', 'lesson_scripted_speech'),
];

describe('журнал: повтор исправленной ошибки', () => {
  test('исходная история даёт «исправлена»', () => {
    expect(projectMistakes(CORRECTED_HISTORY).items.get('mistake:v1:one')?.status).toBe('corrected');
  });

  test('верный ответ в повторе не меняет «исправлена»', () => {
    const item = projectMistakes([
      ...CORRECTED_HISTORY,
      answer(T0 + DAY * 5, '2026-08-25', 'lesson_typing', { review: true }),
    ]).items.get('mistake:v1:one');
    expect(item).toMatchObject({ status: 'corrected', correctedAtMs: T0 + DAY * 2 });
  });

  test('ошибка в повторе возвращает в активные: срок сейчас, путь к исправлению заново', () => {
    const at = T0 + DAY * 5;
    const item = projectMistakes([
      ...CORRECTED_HISTORY,
      answer(at, '2026-08-25', 'lesson_typing', { review: true, correct: false }),
    ]).items.get('mistake:v1:one');
    expect(item).toMatchObject({
      status: 'active',
      correctedAtMs: null,
      dueAtMs: at,
      qualifyingDays: [],
      qualifyingModes: [],
      hasIndependentProduction: false,
      supportPassCount: 0,
    });
  });

  test('после возврата следующий верный ответ НЕ исправляет её мгновенно', () => {
    const item = projectMistakes([
      ...CORRECTED_HISTORY,
      answer(T0 + DAY * 5, '2026-08-25', 'lesson_typing', { review: true, correct: false }),
      answer(T0 + DAY * 6, '2026-08-26', 'lesson_scripted_speech'),
    ]).items.get('mistake:v1:one');
    expect(item?.status).toBe('active');
    expect(item?.qualifyingDays).toEqual(['2026-08-26']);
  });

  test('неверный ответ БЕЗ пометки review по исправленной ошибке читается как раньше — игнорируется', () => {
    const item = projectMistakes([
      ...CORRECTED_HISTORY,
      answer(T0 + DAY * 5, '2026-08-25', 'lesson_typing', { correct: false }),
    ]).items.get('mistake:v1:one');
    expect(item?.status).toBe('corrected');
  });
});

// зачем (§59 координатора, баг серии 01.10): телефон раз в сутки присылает серию и список
// активных дней; сервер принимает только правдоподобное, иначе оставляет свою и называет причину.
import {
  activeRunEndingAt,
  applyProgressEvent,
  normalizeProgressEvent,
  parseAccountCreatedAtMs,
  PROGRESS_EVENT_TYPES,
  streakEvidencePlausibility,
} from './progress_events';

const now = new Date('2026-10-02T12:00:00.000Z');
const sixDays = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'];
const serverProgress = { streak_count: '1', last_active_date: '2026-10-01', streak_last_date: '2026-10-01' };

function streakSync(claimed: number, activeDays?: string[]) {
  return normalizeProgressEvent({
    eventId: `streak_sync:2026-10-02_${claimed}`,
    type: 'streak_sync',
    clientLocalDate: '2026-10-02',
    payload: {
      clientStreakCount: String(claimed),
      clientLastActiveDate: '2026-10-01',
      ...(activeDays ? { activeDays } : {}),
    },
  });
}

describe('streak_sync: правдоподобная серия телефона', () => {
  it('тип streak_sync добавлен в конец списка (порядок сверяется с клиентом)', () => {
    expect(PROGRESS_EVENT_TYPES[PROGRESS_EVENT_TYPES.length - 1]).toBe('streak_sync');
  });

  it('6 дней подряд в журнале: сервер принимает 6 и следующий день даёт 7', () => {
    const applied = applyProgressEvent(serverProgress, streakSync(6, sixDays), now, {
      accountCreatedAtMs: Date.parse('2026-09-01T00:00:00Z'),
    });
    expect(applied.streakEvidence).toMatchObject({ accepted: true, reason: 'plausible', claimed: 6 });
    expect(applied.streakCount).toBe(7);
    expect(applied.progressPatch.streak_count).toBe('7');
  });

  it('накрутка: заявлено 30 при 6 днях в журнале — отказ, серия сервера', () => {
    const applied = applyProgressEvent(serverProgress, streakSync(30, sixDays), now, {
      accountCreatedAtMs: Date.parse('2026-01-01T00:00:00Z'),
    });
    expect(applied.streakEvidence).toMatchObject({ accepted: false, reason: 'exceeds_active_run', cap: 6 });
    expect(applied.streakCount).toBe(2);
  });

  it('аккаунт создан вчера — 6 дней невозможны', () => {
    const applied = applyProgressEvent(serverProgress, streakSync(6, sixDays), now, {
      accountCreatedAtMs: Date.parse('2026-09-30T10:00:00Z'),
    });
    expect(applied.streakEvidence).toMatchObject({ accepted: false, reason: 'exceeds_account_age' });
    expect(applied.streakCount).toBe(2);
  });

  it('streak_sync без списка активных дней — отказ', () => {
    const applied = applyProgressEvent(serverProgress, streakSync(6), now, {});
    expect(applied.streakEvidence).toMatchObject({ accepted: false, reason: 'active_days_missing' });
  });

  // зачем (координатор §60+): стор-сборка 1.6.24 шлёт серию с уроком БЕЗ списка дней —
  // сервер обязан принимать как раньше, иначе у всех на текущей версии серия встанет.
  it('старый клиент: урок без списка дней — серия принимается как раньше', () => {
    const lesson = normalizeProgressEvent({
      eventId: 'lesson:1:complete:old_client',
      type: 'lesson_complete',
      clientLocalDate: '2026-10-02',
      payload: { lessonId: 1, score: 3, clientStreakCount: '6', clientLastActiveDate: '2026-10-01' },
    });
    const applied = applyProgressEvent(serverProgress, lesson, now, {
      accountCreatedAtMs: Date.parse('2026-09-01T00:00:00Z'),
    });
    expect(applied.streakEvidence).toMatchObject({ accepted: true, reason: 'plausible' });
    expect(applied.streakCount).toBe(7);
    // created_at у аккаунта нет — потолка нет, как раньше
    expect(applyProgressEvent(serverProgress, lesson, now, {}).streakCount).toBe(7);
  });

  it('старые события без списка проверяются только возрастом аккаунта', () => {
    const decision = streakEvidencePlausibility({
      claimed: 6, clientLast: '2026-10-01', activeDays: null, requireActiveDays: false, accountCreatedAtMs: null,
    });
    expect(decision).toMatchObject({ accepted: true, cap: null });
  });

  it('журнал в UTC может отставать на сутки от локальной даты серии', () => {
    const decision = streakEvidencePlausibility({
      claimed: 6, clientLast: '2026-10-02', activeDays: new Set(sixDays), requireActiveDays: true, accountCreatedAtMs: null,
    });
    expect(decision).toMatchObject({ accepted: true, cap: 7 });
  });

  it('вспомогательное: серия по журналу и дата создания аккаунта', () => {
    expect(activeRunEndingAt(new Set(sixDays), '2026-10-01')).toBe(6);
    expect(activeRunEndingAt(new Set(sixDays), '2026-09-29')).toBe(4);
    expect(parseAccountCreatedAtMs('2026-09-01T00:00:00Z')).toBe(Date.parse('2026-09-01T00:00:00Z'));
    expect(parseAccountCreatedAtMs({ toMillis: () => 123 })).toBe(123);
    expect(parseAccountCreatedAtMs(undefined)).toBeNull();
  });
});

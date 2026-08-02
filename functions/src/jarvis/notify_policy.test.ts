import {
  MAX_MESSAGES_PER_HOUR,
  QUIET_HOURS_END,
  QUIET_HOURS_START,
  isUrgentDepartment,
  shouldNotifyNow,
} from './notify_policy';

/** 2026-08-02, время в UTC. Киев = UTC+3 летом. */
function at(hourUtc: number): number {
  return Date.UTC(2026, 7, 2, hourUtc, 0, 0);
}

describe('Jarvis notify policy — wake at night only for what cannot wait', () => {
  test('a daytime finding goes out immediately', () => {
    const verdict = shouldNotifyNow({
      departments: ['content'], nowMs: at(12), sentInLastHour: 0,
    });
    expect(verdict.send).toBe(true);
  });

  test('an ordinary finding at night waits for morning', () => {
    // зачем: разбор очереди уроков не стоит того, чтобы будить человека.
    const verdict = shouldNotifyNow({
      departments: ['content', 'retention'], nowMs: at(2), sentInLastHour: 0,
    });
    expect(verdict.send).toBe(false);
    if (verdict.send) throw new Error('ожидалось молчание');
    expect(verdict.reason).toBe('quiet_hours');
  });

  test('lost money wakes the owner at night', () => {
    const verdict = shouldNotifyNow({
      departments: ['payments'], nowMs: at(2), sentInLastHour: 0,
    });
    expect(verdict.send).toBe(true);
  });

  test('a child-safety finding wakes the owner at night', () => {
    const verdict = shouldNotifyNow({
      departments: ['safety'], nowMs: at(3), sentInLastHour: 0,
    });
    expect(verdict.send).toBe(true);
  });

  test('one urgent department among quiet ones is enough to send', () => {
    const verdict = shouldNotifyNow({
      departments: ['content', 'payments', 'growth'], nowMs: at(2), sentInLastHour: 0,
    });
    expect(verdict.send).toBe(true);
  });

  test('the hourly cap stops a flood', () => {
    const verdict = shouldNotifyNow({
      departments: ['quality'], nowMs: at(12), sentInLastHour: MAX_MESSAGES_PER_HOUR,
    });
    expect(verdict.send).toBe(false);
    if (verdict.send) throw new Error('ожидалось молчание');
    expect(verdict.reason).toBe('rate_limited');
  });

  test('the cap never blocks lost money — a flood of failures is the alarm itself', () => {
    // зачем исключение: если платежи сыплются, лимит замолчал бы ровно тогда,
    // когда сообщать важнее всего.
    const verdict = shouldNotifyNow({
      departments: ['payments'], nowMs: at(12), sentInLastHour: MAX_MESSAGES_PER_HOUR * 3,
    });
    expect(verdict.send).toBe(true);
  });

  test('nothing to say means nothing is sent', () => {
    const verdict = shouldNotifyNow({ departments: [], nowMs: at(12), sentInLastHour: 0 });
    expect(verdict.send).toBe(false);
    if (verdict.send) throw new Error('ожидалось молчание');
    expect(verdict.reason).toBe('nothing_to_say');
  });

  test('quiet hours cover the night, not the working day', () => {
    expect(QUIET_HOURS_START).toBeGreaterThanOrEqual(19);
    expect(QUIET_HOURS_END).toBeLessThanOrEqual(9);
  });

  test('payments and safety are urgent; the rest are not', () => {
    expect(isUrgentDepartment('payments')).toBe(true);
    expect(isUrgentDepartment('safety')).toBe(true);
    expect(isUrgentDepartment('content')).toBe(false);
    expect(isUrgentDepartment('retention')).toBe(false);
  });
});

import { buildDailyDigestAlert, irelandDailyWindow, kyivWeeklyWindow, adminAlertDailyDigestsCron } from './admin_alert_digests';
import { ADMIN_ALERT_IDS } from './admin_alert_catalog';
import * as admin from 'firebase-admin';

jest.mock('firebase-admin', () => ({ firestore: Object.assign(jest.fn(), { Timestamp: { fromMillis: (value: number) => value } }) }));

describe('admin alert Ireland daily digest', () => {
  // зачем (владелец 21.10, №48): сводка теперь недельная — понедельник 10:00 по Киеву (в сентябре это 07:00 UTC).
  test('manual Scheduler runs with a future scheduleTime cannot consume next week\'s digest key', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    (admin.firestore as unknown as jest.Mock).mockReturnValue({collection: () => ({doc: () => ({create})})});
    const time = jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-14T08:00:00Z'));
    try {
      await adminAlertDailyDigestsCron.run({scheduleTime: '2026-09-21T07:00:00Z'});
      expect(create).toHaveBeenCalledWith(expect.objectContaining({sourceId: '2026-09-14:ownerWeeklyDigest'}));
    } finally {time.mockRestore();}
  });
  test('persists the scheduled window before any source aggregation can fail', async () => {
    const create = jest.fn().mockResolvedValue(undefined);
    const where = jest.fn(() => { throw new Error('source_unavailable'); });
    (admin.firestore as unknown as jest.Mock).mockReturnValue({
      collection: () => ({ doc: () => ({ create }), where }), collectionGroup: () => ({ where }),
    });
    await expect(adminAlertDailyDigestsCron.run({ scheduleTime: '2026-09-14T07:00:00Z' })).resolves.toBeUndefined();
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      eventType: 'ownerDailyDigest', status: 'pending', sourceId: '2026-09-14:ownerWeeklyDigest',
      payload: expect.objectContaining({ windowStartMs: Date.parse('2026-09-07T07:00:00Z'), windowEndMs: Date.parse('2026-09-14T07:00:00Z') }),
    }));
    expect(where).not.toHaveBeenCalled();
  });
  test('weekly window: Monday 10:00 Kyiv to the next Monday 10:00', () => {
    expect(kyivWeeklyWindow(Date.parse('2026-09-16T12:00:00Z'))).toEqual({
      key: '2026-09-14', startMs: Date.parse('2026-09-07T07:00:00Z'), endMs: Date.parse('2026-09-14T07:00:00Z'),
    });
    // Понедельник за минуту до 10:00 — ещё прошлая неделя.
    expect(kyivWeeklyWindow(Date.parse('2026-09-14T06:59:00Z')).key).toBe('2026-09-07');
  });
  test('weekly window stays DST-safe in Kyiv (167 h in spring, 169 h in autumn)', () => {
    const spring = kyivWeeklyWindow(Date.parse('2026-03-30T12:00:00Z'));
    expect(spring).toEqual({ key: '2026-03-30', startMs: Date.parse('2026-03-23T08:00:00Z'), endMs: Date.parse('2026-03-30T07:00:00Z') });
    expect(spring.endMs - spring.startMs).toBe(167 * 3_600_000);
    const autumn = kyivWeeklyWindow(Date.parse('2026-10-26T12:00:00Z'));
    expect(autumn).toEqual({ key: '2026-10-26', startMs: Date.parse('2026-10-19T07:00:00Z'), endMs: Date.parse('2026-10-26T08:00:00Z') });
    expect(autumn.endMs - autumn.startMs).toBe(169 * 3_600_000);
  });
  test('uses the completed 20:00 Ireland-local window', () => {
    expect(irelandDailyWindow(Date.parse('2026-09-12T20:37:00Z'))).toEqual({
      key: '2026-09-12',
      startMs: Date.parse('2026-09-11T19:00:00Z'),
      endMs: Date.parse('2026-09-12T19:00:00Z'),
    });
    expect(irelandDailyWindow(Date.parse('2026-09-12T18:59:00Z'))).toEqual({
      key: '2026-09-11',
      startMs: Date.parse('2026-09-10T19:00:00Z'),
      endMs: Date.parse('2026-09-11T19:00:00Z'),
    });
  });

  test('keeps calendar-day windows DST-safe in spring and autumn', () => {
    const spring = irelandDailyWindow(Date.parse('2026-03-29T20:15:00Z'));
    expect(spring).toEqual({
      key: '2026-03-29',
      startMs: Date.parse('2026-03-28T20:00:00Z'),
      endMs: Date.parse('2026-03-29T19:00:00Z'),
    });
    expect(spring.endMs - spring.startMs).toBe(23 * 60 * 60 * 1000);

    const autumn = irelandDailyWindow(Date.parse('2026-10-25T20:15:00Z'));
    expect(autumn).toEqual({
      key: '2026-10-25',
      startMs: Date.parse('2026-10-24T19:00:00Z'),
      endMs: Date.parse('2026-10-25T20:00:00Z'),
    });
    expect(autumn.endMs - autumn.startMs).toBe(25 * 60 * 60 * 1000);
  });

  test('builds exactly one idempotent aggregate-only outbox event', () => {
    const window = irelandDailyWindow(Date.parse('2026-09-12T20:15:00Z'));
    const metrics = ADMIN_ALERT_IDS
      .filter((eventType) => eventType !== 'ownerDailyDigest')
      .map((eventType, index) => ({ eventType, count: index }));
    const alert = buildDailyDigestAlert(window, { metrics, totalOwnerSignals: 31 });
    expect(alert).toMatchObject({
      eventType: 'ownerDailyDigest',
      source: 'digest.weekly_kyiv',
      sourceId: '2026-09-12:ownerWeeklyDigest',
      payload: { count: 31, windowStartMs: window.startMs, windowEndMs: window.endMs },
    });
    expect(alert.payload.metrics).toHaveLength(ADMIN_ALERT_IDS.length - 1);
    expect(JSON.stringify(alert)).not.toMatch(/@|fullUid|transactionId|activationCode/i);
  });
});

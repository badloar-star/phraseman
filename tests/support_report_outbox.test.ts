import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  enqueueSupportReport,
  flushSupportReportOutbox,
  listPendingSupportReports,
  resumePendingSupportReports,
  SUPPORT_REPORT_OUTBOX_MAX_ENTRIES,
  SUPPORT_REPORT_OUTBOX_TTL_MS,
  type PendingSupportReport,
} from '../app/support_report_outbox';
import {
  __resetAccountGenerationForTests,
  beginAccountGeneration,
  invalidateAccountGeneration,
  withAccountTransitionLock,
} from '../app/account_generation';

jest.mock('@react-native-async-storage/async-storage');

const ACCOUNT = 'support-account';
const NOW = 2_000_000_000_000;
const REPORT: PendingSupportReport = {
  id: 'support_2000000000000_abc',
  payload: {
    screen: 'settings_support',
    dataId: 'settings_support_request',
    dataText: 'In-app support request',
    comment: 'The lesson button does not respond.',
  },
  userName: 'Ada',
  lang: 'ru',
  queuedAtMs: NOW,
};

describe('support report durable background outbox', () => {
  beforeEach(async () => {
    __resetAccountGenerationForTests();
    await AsyncStorage.clear();
  });

  it('keeps a failed network delivery for a later foreground retry', async () => {
    await expect(enqueueSupportReport(ACCOUNT, REPORT, NOW)).resolves.toBe(true);
    const send = jest.fn(async () => 'failed' as const);

    await expect(flushSupportReportOutbox(ACCOUNT, send, NOW)).resolves.toEqual({ sent: 0, left: 1 });
    expect(send).toHaveBeenCalledWith(REPORT.payload, REPORT.userName, REPORT.lang, {
      awardSubmissionXp: false,
      expectedStableUid: ACCOUNT,
      idempotencyKey: REPORT.id,
    });
    expect(await listPendingSupportReports(ACCOUNT, NOW)).toEqual([REPORT]);
  });

  it('removes a row only after an explicit sent receipt', async () => {
    await enqueueSupportReport(ACCOUNT, REPORT, NOW);

    await expect(flushSupportReportOutbox(ACCOUNT, async () => 'sent', NOW))
      .resolves.toEqual({ sent: 1, left: 0 });
    expect(await listPendingSupportReports(ACCOUNT, NOW)).toEqual([]);
  });

  it('falls back to an empty snapshot when native key deletion fails after sent', async () => {
    await enqueueSupportReport(ACCOUNT, REPORT, NOW);
    (AsyncStorage.removeItem as jest.Mock).mockRejectedValueOnce(new Error('delete unavailable'));

    await expect(flushSupportReportOutbox(ACCOUNT, async () => 'sent', NOW))
      .resolves.toEqual({ sent: 1, left: 0 });
    expect(await AsyncStorage.getItem(`support_report_outbox_v1:${encodeURIComponent(ACCOUNT)}`))
      .toBe('[]');
  });

  it('keeps a throttled row instead of losing a second valid request', async () => {
    await enqueueSupportReport(ACCOUNT, REPORT, NOW);

    await expect(flushSupportReportOutbox(ACCOUNT, async () => 'throttled', NOW))
      .resolves.toEqual({ sent: 0, left: 1 });
  });

  it('retries a throttled background row while the app remains active', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-28T12:00:00.000Z'));
    try {
      const nowMs = Date.now();
      beginAccountGeneration(ACCOUNT);
      await enqueueSupportReport(ACCOUNT, { ...REPORT, queuedAtMs: nowMs }, nowMs);
      const send = jest.fn()
        .mockResolvedValueOnce('throttled')
        .mockResolvedValueOnce('sent');

      await resumePendingSupportReports(ACCOUNT, send);
      expect(send).toHaveBeenCalledTimes(1);
      await jest.advanceTimersByTimeAsync(61_000);
      await Promise.resolve();

      expect(send).toHaveBeenCalledTimes(2);
      expect(await listPendingSupportReports(ACCOUNT, Date.now())).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not overwrite older reports when the durable snapshot cannot be read', async () => {
    await enqueueSupportReport(ACCOUNT, REPORT, NOW);
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage busy'));
    const newer = {
      ...REPORT,
      id: 'support_2000000000001_read_failure',
      queuedAtMs: NOW + 1,
    };

    await expect(enqueueSupportReport(ACCOUNT, newer, NOW + 1)).resolves.toBe(false);
    expect(await listPendingSupportReports(ACCOUNT, NOW + 1)).toEqual([REPORT]);
  });

  it('preserves the existing queue at capacity instead of dropping its oldest report', async () => {
    for (let index = 0; index < SUPPORT_REPORT_OUTBOX_MAX_ENTRIES; index += 1) {
      await enqueueSupportReport(ACCOUNT, {
        ...REPORT,
        id: `support_capacity_${index}`,
        queuedAtMs: NOW + index,
      }, NOW + index);
    }
    const overflow = {
      ...REPORT,
      id: 'support_capacity_overflow',
      queuedAtMs: NOW + SUPPORT_REPORT_OUTBOX_MAX_ENTRIES,
    };

    await expect(enqueueSupportReport(
      ACCOUNT,
      overflow,
      overflow.queuedAtMs,
    )).resolves.toBe(false);
    expect((await listPendingSupportReports(ACCOUNT, overflow.queuedAtMs)).map((row) => row.id))
      .toEqual(Array.from(
        { length: SUPPORT_REPORT_OUTBOX_MAX_ENTRIES },
        (_, index) => `support_capacity_${index}`,
      ));
  });

  it('does not erase a new row when an older in-flight send completes', async () => {
    await enqueueSupportReport(ACCOUNT, REPORT, NOW);
    let release!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    let started!: () => void;
    const sendStarted = new Promise<void>((resolve) => { started = resolve; });
    const flushing = flushSupportReportOutbox(ACCOUNT, async () => {
      started();
      await gate;
      return 'sent';
    }, NOW);
    await sendStarted;

    const newer = {
      ...REPORT,
      id: 'support_2000000000001_def',
      payload: { ...REPORT.payload, comment: 'A different detailed problem.' },
      queuedAtMs: NOW + 1,
    };
    await enqueueSupportReport(ACCOUNT, newer, NOW + 1);
    release();
    await flushing;

    expect(await listPendingSupportReports(ACCOUNT, NOW + 1)).toEqual([newer]);
  });

  it('owner-binds the request without blocking an account transition on the network', async () => {
    const currentNowMs = Date.now();
    const currentReport = { ...REPORT, queuedAtMs: currentNowMs };
    beginAccountGeneration(ACCOUNT);
    await enqueueSupportReport(ACCOUNT, currentReport, currentNowMs);
    let signalStarted!: () => void;
    const started = new Promise<void>((resolve) => { signalStarted = resolve; });
    let releaseSend!: () => void;
    const sendGate = new Promise<void>((resolve) => { releaseSend = resolve; });
    let transportOptions: unknown;
    const resuming = resumePendingSupportReports(ACCOUNT, async (_payload, _name, _lang, options) => {
      transportOptions = options;
      signalStarted();
      await sendGate;
      return 'sent';
    });
    await expect(Promise.race([
      started.then(() => 'started' as const),
      new Promise<'start-timeout'>((resolve) => { setTimeout(() => resolve('start-timeout'), 2_000); }),
    ])).resolves.toBe('started');

    invalidateAccountGeneration();
    let transitionEntered = false;
    const switching = withAccountTransitionLock(async () => {
      transitionEntered = true;
      beginAccountGeneration('other-account');
    });
    await Promise.resolve();
    await Promise.resolve();
    expect(transitionEntered).toBe(true);
    expect(transportOptions).toEqual({
      awardSubmissionXp: false,
      expectedStableUid: ACCOUNT,
      idempotencyKey: REPORT.id,
    });

    releaseSend();
    await expect(Promise.race([
      Promise.all([resuming, switching]).then(() => 'settled' as const),
      new Promise<'settle-timeout'>((resolve) => { setTimeout(() => resolve('settle-timeout'), 2_000); }),
    ])).resolves.toBe('settled');
    expect(transitionEntered).toBe(true);
    expect(await listPendingSupportReports(ACCOUNT, currentNowMs)).toEqual([]);
  }, 15_000);

  it('purges expired free text from storage', async () => {
    const expired = { ...REPORT, queuedAtMs: NOW - SUPPORT_REPORT_OUTBOX_TTL_MS - 1 };
    const key = `support_report_outbox_v1:${encodeURIComponent(ACCOUNT)}`;
    await AsyncStorage.setItem(key, JSON.stringify([expired]));

    await expect(listPendingSupportReports(ACCOUNT, NOW)).resolves.toEqual([]);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });

  it('purges implausibly future-dated raw text instead of retaining it forever', async () => {
    const future = { ...REPORT, queuedAtMs: NOW + 24 * 60 * 60 * 1_000 };
    const key = `support_report_outbox_v1:${encodeURIComponent(ACCOUNT)}`;
    await AsyncStorage.setItem(key, JSON.stringify([future]));

    await expect(listPendingSupportReports(ACCOUNT, NOW)).resolves.toEqual([]);
    expect(await AsyncStorage.getItem(key)).toBeNull();
  });

  it('accepts a frozen sanitized diagnostic bundle in the durable row', async () => {
    const diagnostics = {
      version: 1 as const,
      capturedAtMs: NOW,
      events: [{ atMs: NOW - 1, event: 'navigation' as const, screen: '/settings' }],
    };
    const withDiagnostics: PendingSupportReport = {
      ...REPORT,
      payload: { ...REPORT.payload, diagnostics },
    };

    await expect(enqueueSupportReport(ACCOUNT, withDiagnostics, NOW)).resolves.toBe(true);
    expect(await listPendingSupportReports(ACCOUNT, NOW)).toEqual([withDiagnostics]);
  });
});

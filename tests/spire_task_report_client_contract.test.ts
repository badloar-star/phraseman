import AsyncStorage from '@react-native-async-storage/async-storage';
import fs from 'node:fs';
import path from 'node:path';
import {
  buildSpireTaskReportSubmission,
  canDrainSpireTaskReportOutbox,
  listPendingSpireTaskReports,
  retryPendingSpireTaskReports,
} from '../modules/spire/task_report_client';

jest.mock('@react-native-async-storage/async-storage');

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('Spire task report client seam', () => {
  test('builds an Italian contour report without falling back to another language', async () => {
    const sent: Array<Record<string, unknown>> = [];
    const submission = buildSpireTaskReportSubmission({
      stableUid: 'stable-it', taskId: 'arena-it-fill_gap-1-0000', studyTarget: 'it', weekId: '2026-W40',
      tier: 1, packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', floor: 1, step: 1, setIndex: 0, taskIndex: 0,
      reason: 'Ошибка',
    });
    await submission.submit({
      send: async (kind, payload) => { sent.push({ kind, payload }); return { ok: true, id: 'report-it', collection: 'error_reports' }; },
      removeFromRemainingRun: () => undefined,
    });
    expect(sent[0]).toMatchObject({ kind: 'spire_task_report', payload: { studyTarget: 'it', taskId: 'arena-it-fill_gap-1-0000' } });
  });

  test('cold-start drain waits for late Firebase Auth readiness and stays account-bound', () => {
    const base = { appIsActive: true, stableUid: 'stable-1', accountPhase: 'active' };
    expect(canDrainSpireTaskReportOutbox({ ...base, authenticatedUid: null })).toBe(false);
    expect(canDrainSpireTaskReportOutbox({ ...base, authenticatedUid: 'firebase-auth-1' })).toBe(true);
    expect(canDrainSpireTaskReportOutbox({ ...base, authenticatedUid: 'firebase-auth-1', stableUid: null })).toBe(false);
    expect(canDrainSpireTaskReportOutbox({ ...base, authenticatedUid: 'firebase-auth-1', appIsActive: false })).toBe(false);
  });
  test('removes immediately after durable enqueue before a pending network request settles, exactly once', async () => {
    let settle: ((value: { ok: true; id: string; collection: string }) => void) | undefined;
    const pending = new Promise<{ ok: true; id: string; collection: string }>((resolve) => { settle = resolve; });
    let markSendStarted: (() => void) | undefined;
    const sendStarted = new Promise<void>((resolve) => { markSendStarted = resolve; });
    const removed: string[] = [];
    const submission = buildSpireTaskReportSubmission({
      stableUid: 'stable-immediate', taskId: 'arena-es-fill_gap-1-0099', studyTarget: 'es', weekId: '2026-W40',
      tier: 1, packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', floor: 2, step: 1, setIndex: 0, taskIndex: 99,
      reason: 'Ошибка',
    });
    const resultPromise = submission.submit({
      send: async () => { markSendStarted?.(); return pending; },
      removeFromRemainingRun: (taskId) => removed.push(taskId),
    });
    await sendStarted;
    expect(removed).toEqual(['arena-es-fill_gap-1-0099']);
    settle?.({ ok: true, id: 'report-immediate', collection: 'error_reports' });
    await resultPromise;
    expect(removed).toEqual(['arena-es-fill_gap-1-0099']);
  });

  test('builds a stable owner-bound structured report and skips the local task immediately', async () => {
    const removed: string[] = [];
    const sent: Array<Record<string, unknown>> = [];
    const submission = buildSpireTaskReportSubmission({
      stableUid: 'stable-1',
      taskId: 'arena-fr-fill_gap-1-0000',
      studyTarget: 'fr',
      weekId: '2026-W40',
      tier: 1,
      packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456',
      floor: 2,
      step: 1,
      setIndex: 0,
      taskIndex: 4,
      reason: 'Неверный перевод',
    });

    await submission.submit({
      send: async (kind, payload, options) => {
        sent.push({ kind, payload, options });
        return { ok: true, id: 'report-1', collection: 'error_reports' };
      },
      removeFromRemainingRun: (taskId) => removed.push(taskId),
    });

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      kind: 'spire_task_report',
      payload: { taskId: 'arena-fr-fill_gap-1-0000', studyTarget: 'fr', weekId: '2026-W40' },
      options: { expectedStableUid: 'stable-1' },
    });
    expect(String((sent[0].options as Record<string, unknown>).idempotencyKey)).toMatch(/^spire-task-report-v1:/);
    expect(removed).toEqual(['arena-fr-fill_gap-1-0000']);
  });

  test('skips locally after durable enqueue but does not claim global quarantine when acceptance is unconfirmed', async () => {
    const removed: string[] = [];
    const submission = buildSpireTaskReportSubmission({
      stableUid: 'stable-1', taskId: 'arena-de-fill_gap-1-0000', studyTarget: 'de', weekId: '2026-W40',
      tier: 1, packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', floor: 2, step: 1, setIndex: 0, taskIndex: 4,
      reason: 'Ошибка',
    });
    await expect(submission.submit({ send: async () => null, removeFromRemainingRun: (taskId) => removed.push(taskId) }))
      .resolves.toEqual({ serverConfirmed: false, reportId: null });
    expect(removed).toEqual(['arena-de-fill_gap-1-0000']);
  });

  test('does not remove a task when durable enqueue and server delivery both fail', async () => {
    const removed: string[] = [];
    const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    storage.setItem.mockRejectedValueOnce(new Error('storage full'));
    const submission = buildSpireTaskReportSubmission({
      stableUid: 'stable-full', taskId: 'arena-de-fill_gap-1-0051', studyTarget: 'de', weekId: '2026-W40',
      tier: 1, packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', floor: 2, step: 1, setIndex: 0, taskIndex: 51,
      reason: 'Ошибка',
    });
    await expect(submission.submit({ send: async () => null, removeFromRemainingRun: (taskId) => removed.push(taskId) }))
      .resolves.toEqual({ serverConfirmed: false, reportId: null });
    expect(removed).toEqual([]);
  });

  test('removes after server acceptance when durable enqueue is unavailable', async () => {
    const removed: string[] = [];
    const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
    storage.setItem.mockRejectedValueOnce(new Error('storage full'));
    const submission = buildSpireTaskReportSubmission({
      stableUid: 'stable-full', taskId: 'arena-de-fill_gap-1-0052', studyTarget: 'de', weekId: '2026-W40',
      tier: 1, packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', floor: 2, step: 1, setIndex: 0, taskIndex: 52,
      reason: 'Ошибка',
    });
    await submission.submit({
      send: async () => ({ ok: true, id: 'server-report', collection: 'error_reports' }),
      removeFromRemainingRun: (taskId) => removed.push(taskId),
    });
    expect(removed).toEqual(['arena-de-fill_gap-1-0052']);
  });

  test('does not lose or remove the 51st report when the bounded outbox is full and server is unavailable', async () => {
    const owner = 'stable-capacity';
    const now = Date.now();
    await AsyncStorage.setItem(`spire_task_report_outbox_v1:${encodeURIComponent(owner)}`, JSON.stringify(
      Array.from({ length: 50 }, (_, index) => ({
        id: `pending-${index}`, stableUid: owner, queuedAtMs: now,
        payload: { taskId: `arena-es-fill_gap-1-${String(index).padStart(4, '0')}` },
      })),
    ));
    const removed: string[] = [];
    const submission = buildSpireTaskReportSubmission({
      stableUid: owner, taskId: 'arena-es-fill_gap-1-0051', studyTarget: 'es', weekId: '2026-W40',
      tier: 1, packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', floor: 2, step: 1, setIndex: 0, taskIndex: 51,
      reason: 'Ошибка',
    });
    await submission.submit({ send: async () => null, removeFromRemainingRun: (taskId) => removed.push(taskId) });
    expect(removed).toEqual([]);
    expect(await listPendingSpireTaskReports(owner)).toHaveLength(50);
  });

  test('keeps idempotency distinct for different tasks even when a maximum pack hash fills the prefix', async () => {
    const keys: string[] = [];
    for (const suffix of ['0000', '0001']) {
      const submission = buildSpireTaskReportSubmission({
        stableUid: 'stable-1',
        taskId: `arena-es-fill_gap-1-${suffix}`,
        studyTarget: 'es',
        weekId: '2026-W40',
        tier: 1,
        packHash: `sp1_${'a'.repeat(124)}`,
        floor: 2,
        step: 1,
        setIndex: 0,
        taskIndex: Number(suffix),
        reason: 'Ошибка',
      });
      await submission.submit({
        removeFromRemainingRun: () => undefined,
        send: async (_kind, _payload, options) => {
          keys.push(String(options.idempotencyKey));
          return { ok: true, id: 'report', collection: 'error_reports' };
        },
      });
    }

    expect(keys[0]).not.toBe(keys[1]);
    expect(keys.every((key) => key.length <= 120)).toBe(true);
  });

  test('keeps an unconfirmed report in an account-bound durable outbox and retries it', async () => {
    const submission = buildSpireTaskReportSubmission({
      stableUid: 'stable-owner', taskId: 'arena-de-fill_gap-1-0000', studyTarget: 'de', weekId: '2026-W40',
      tier: 1, packHash: 'sp1_abcdefghijklmnopqrstuvwxyz123456', floor: 2, step: 1, setIndex: 0, taskIndex: 4,
      reason: 'Ошибка',
    });
    await submission.submit({ send: async () => null, removeFromRemainingRun: () => undefined });
    expect(await listPendingSpireTaskReports('stable-owner')).toHaveLength(1);
    expect(await listPendingSpireTaskReports('different-owner')).toHaveLength(0);

    const calls: Array<Record<string, unknown>> = [];
    await expect(retryPendingSpireTaskReports('stable-owner', async (kind, payload, options) => {
      calls.push({ kind, payload, options });
      return { ok: true, id: 'report-1', collection: 'error_reports' };
    })).resolves.toEqual({ sent: 1, left: 0 });
    expect(calls[0]).toMatchObject({
      kind: 'spire_task_report',
      options: { expectedStableUid: 'stable-owner' },
    });
    const cloudSync = fs.readFileSync(path.join(__dirname, '..', 'app', 'cloud_sync.ts'), 'utf8');
    expect(cloudSync).toContain("'spire_task_report_outbox_v1:'");
  });
});

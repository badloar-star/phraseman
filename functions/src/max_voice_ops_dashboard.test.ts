import { HttpsError } from 'firebase-functions/v2/https';

import { emptyMaxVoiceOpsDaily } from './max_voice_ops';
import { getMaxVoiceOpsDashboard, type MaxVoiceOpsDashboardDependencies } from './max_voice_ops_dashboard';

const NOW = Date.UTC(2026, 7, 21, 12);
const request = (adminRole: string, data: unknown) => ({ auth: { uid: 'admin-1', token: { admin: true, adminRole } }, data });

function deps(rows = [emptyMaxVoiceOpsDaily('2026-08-21', NOW)]): MaxVoiceOpsDashboardDependencies {
  return {
    nowMs: () => NOW,
    readDays: jest.fn(async () => rows),
    appendAudit: jest.fn(async () => undefined),
    readUsage: jest.fn(async () => ({ calls: 3, seconds: 900, estCostUsd: 0.75, transcriptionCostUsd: 0.05 })),
  };
}

describe('MAX operations dashboard', () => {
  test('requires diagnostics.read and accepts only 1, 7, or 30 days', async () => {
    await expect(getMaxVoiceOpsDashboard(request('moderator', { days: 7 }), deps()))
      .rejects.toBeInstanceOf(HttpsError);
    await expect(getMaxVoiceOpsDashboard(request('owner', { days: 90 }), deps()))
      .rejects.toMatchObject({ code: 'invalid-argument' });
    await expect(getMaxVoiceOpsDashboard(request('owner', { days: 7, uid: 'x' }), deps()))
      .rejects.toMatchObject({ code: 'invalid-argument' });
  });

  test('reads at most 30 daily documents, suppresses small locale/level cells, and audits only the load', async () => {
    const row = {
      ...emptyMaxVoiceOpsDaily('2026-08-21', NOW),
      callsStarted: 12,
      callsConnected: 11,
      callsCompleted: 10,
      reviewsReady: 9,
      mintRejections: 9,
      mintRejectionReasons: {
        ...emptyMaxVoiceOpsDaily('x', 0).mintRejectionReasons,
        paywall: 4,
        daily_quota: 2,
        budget: 3,
      },
      localeCounts: { ...emptyMaxVoiceOpsDaily('x', 0).localeCounts, ru: 4, uk: 5 },
      levelCounts: { ...emptyMaxVoiceOpsDaily('x', 0).levelCounts, A1: 4, B2: 6 },
    };
    const d = deps([row]);
    const result = await getMaxVoiceOpsDashboard(request('owner', { days: 30 }), d);
    expect(d.readDays).toHaveBeenCalledWith(expect.any(Array));
    expect((d.readDays as jest.Mock).mock.calls[0][0]).toHaveLength(30);
    expect(result.distributions.localeCounts).toEqual(expect.objectContaining({ ru: null, uk: 5 }));
    expect(result.distributions.levelCounts).toEqual(expect.objectContaining({ A1: null, B2: 6 }));
    expect(result.totals.mintRejections).toBe(9);
    expect(result.distributions.mintRejectionReasons).toEqual(expect.objectContaining({
      paywall: 4,
      daily_quota: 2,
      budget: 3,
    }));
    expect(d.appendAudit).toHaveBeenCalledWith({ action: 'max_ops_read', actorUid: 'admin-1', days: 30, createdAtMs: NOW });
    expect(JSON.stringify((d.appendAudit as jest.Mock).mock.calls[0][0])).not.toMatch(/metric|locale|level|session|uid.*uid/i);
  });

  // зачем (владелец 2026-08-30): «сколько минут MAX использовано в общем и
  // сколько это стоило денег реально». Три окна агрегации: всё время, текущий
  // UTC-месяц, выбранный период дашборда; сбой агрегации не роняет дашборд.
  test('attaches usage money totals for all-time, current month, and the selected window', async () => {
    const d = deps();
    const result = await getMaxVoiceOpsDashboard(request('owner', { days: 7 }), d);

    expect(d.readUsage).toHaveBeenCalledTimes(3);
    expect((d.readUsage as jest.Mock).mock.calls[0][0]).toBeNull();
    expect((d.readUsage as jest.Mock).mock.calls[1][0]).toBe(Date.UTC(2026, 7, 1));
    expect((d.readUsage as jest.Mock).mock.calls[2][0]).toBe(NOW - 7 * 86_400_000);
    expect(result.usage).toMatchObject({
      source: 'voice_call_billing',
      basis: 'usage_tokens_x_price_table',
      allTime: { calls: 3, seconds: 900, estCostUsd: 0.75 },
    });
  });

  test('a failed usage aggregation degrades to usage:null without breaking the dashboard', async () => {
    const d = {
      ...deps(),
      readUsage: jest.fn(async () => { throw new Error('aggregation unavailable'); }),
    };
    jest.spyOn(console, 'error').mockImplementation(() => {});
    const result = await getMaxVoiceOpsDashboard(request('owner', { days: 7 }), d);
    expect(result.usage).toBeNull();
    expect(result.totals).toBeDefined();
    jest.restoreAllMocks();
  });
});

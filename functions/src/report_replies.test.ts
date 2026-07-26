import { HttpsError } from 'firebase-functions/v2/https';
import {
  normalizeReportReplyReward,
  normalizeStoredReportReplyClaimAmount,
  reportDocumentAllowsCoin,
  requireReportReplyPermission,
} from './report_replies';

describe('report reply one-coin contract', () => {
  test('requires the exact server-side permission for draft and send actions', () => {
    expect(() => requireReportReplyPermission({ auth: { token: { admin: true, adminRole: 'analyst' } } }, 'reports.reply.draft')).toThrow(HttpsError);
    expect(() => requireReportReplyPermission({ auth: { token: { admin: true, adminRole: 'moderator' } } }, 'reports.reply.send')).toThrow(HttpsError);
    // Админ без явной роли = owner (adminRole в проекте не выдаётся) — отправка ответов
    // на репорты не должна блокироваться отсутствием claim'а, которого никто не ставит.
    expect(() => requireReportReplyPermission({ auth: { token: { admin: true } } }, 'reports.reply.send')).not.toThrow();
    expect(() => requireReportReplyPermission({ auth: { token: {} } }, 'reports.reply.send')).toThrow(HttpsError);
    expect(() => requireReportReplyPermission({ auth: { token: { admin: true, adminRole: 'support' } } }, 'reports.reply.draft')).not.toThrow();
    expect(() => requireReportReplyPermission({ auth: { token: { admin: true, adminRole: 'support' } } }, 'reports.reply.send')).not.toThrow();
  });

  test('caps every stored legacy report reward at one coin', () => {
    expect(normalizeStoredReportReplyClaimAmount({ shards: 50 })).toBe(1);
    expect(normalizeStoredReportReplyClaimAmount({ shards: 1 })).toBe(1);
    expect(normalizeStoredReportReplyClaimAmount({ shards: 0 })).toBe(0);
    expect(normalizeStoredReportReplyClaimAmount({ coins: 2, shards: 50 })).toBe(0);
    expect(normalizeStoredReportReplyClaimAmount({ coins: 1, shards: 50 })).toBe(1);
  });

  test.each(['duplicate', 'in_progress', 'rejected', 'unconfirmed'])(
    'rejects a coin for %s',
    (resolution) => {
      expect(() => normalizeReportReplyReward({ resolution, coins: 1 })).toThrow(HttpsError);
      expect(normalizeReportReplyReward({ resolution, coins: 0 })).toEqual({ resolution, coins: 0 });
    },
  );

  test('allows exactly one coin only for confirmed_fixed', () => {
    expect(normalizeReportReplyReward({ resolution: 'confirmed_fixed', coins: 1 })).toEqual({
      resolution: 'confirmed_fixed',
      coins: 1,
    });
    for (const coins of [-1, 2, 1.5, Number.NaN]) {
      expect(() => normalizeReportReplyReward({ resolution: 'confirmed_fixed', coins })).toThrow(HttpsError);
    }
  });

  test('requires the persisted report to confirm the fixed result', () => {
    expect(reportDocumentAllowsCoin({ status: 'fixed' }, 'confirmed_fixed')).toBe(true);
    expect(reportDocumentAllowsCoin({ resolution: 'confirmed_fixed' }, 'confirmed_fixed')).toBe(true);
    expect(reportDocumentAllowsCoin({ status: 'reviewed' }, 'confirmed_fixed')).toBe(false);
    expect(reportDocumentAllowsCoin({ status: 'fixed' }, 'duplicate')).toBe(false);
  });
});

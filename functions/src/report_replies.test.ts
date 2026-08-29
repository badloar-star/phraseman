import { HttpsError } from 'firebase-functions/v2/https';
import {
  normalizeReportReplyReward,
  normalizeStoredReportReplyClaimAmount,
  normalizeStoredReportReplyRewardBundle,
  reportDocumentAllowsReward,
  reportDocumentAllowsCoin,
  reportRewardClaimReceipt,
  reportRecipientIdentityLookup,
  requireReportReplyPermission,
} from './report_replies';

describe('report reply reward bundle contract', () => {
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

  test('reads a stored exact bundle and keeps legacy one-pearl documents claimable', () => {
    expect(normalizeStoredReportReplyRewardBundle({
      resolution: 'confirmed_fixed',
      rewardBundle: { version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 10 },
    })).toEqual({ version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 10 });
    expect(normalizeStoredReportReplyRewardBundle({ coins: 1 })).toEqual({
      version: 1, severity: 'legacy', spins: 0, runes: 0, pearls: 1,
    });
    expect(normalizeStoredReportReplyRewardBundle({ coins: 0 })).toEqual({
      version: 1, severity: 'none', spins: 0, runes: 0, pearls: 0,
    });
    expect(() => normalizeStoredReportReplyRewardBundle({
      resolution: 'confirmed_fixed',
      rewardBundle: { version: 1, severity: 'serious', spins: 2, runes: 601, pearls: 5 },
    })).toThrow(HttpsError);
  });

  test('replays the same deterministic claim receipt on retry', () => {
    const bundle = { version: 1, severity: 'serious', spins: 2, runes: 600, pearls: 5 } as const;
    expect(reportRewardClaimReceipt('message-1', bundle, false)).toEqual({
      ok: true, eventId: 'message-1', rewardBundle: bundle, alreadyClaimed: false,
    });
    expect(reportRewardClaimReceipt('message-1', bundle, true)).toEqual({
      ok: true, eventId: 'message-1', rewardBundle: bundle, alreadyClaimed: true,
    });
  });

  test.each(['duplicate', 'in_progress', 'rejected', 'unconfirmed'])(
    'rejects a reward bundle for %s',
    (resolution) => {
      expect(() => normalizeReportReplyReward({
        resolution,
        rewardBundle: { version: 1, severity: 'minor', spins: 1, runes: 300, pearls: 1 },
      })).toThrow(HttpsError);
      expect(normalizeReportReplyReward({ resolution, rewardBundle: { version: 1, severity: 'none', spins: 0, runes: 0, pearls: 0 } })).toEqual({
        resolution,
        rewardBundle: { version: 1, severity: 'none', spins: 0, runes: 0, pearls: 0 },
      });
    },
  );

  test.each([
    ['minor', 1, 300, 1],
    ['serious', 2, 600, 5],
    ['critical', 3, 1000, 10],
  ] as const)('accepts the exact %s tier', (severity, spins, runes, pearls) => {
    expect(normalizeReportReplyReward({
      resolution: 'confirmed_fixed',
      rewardBundle: { version: 1, severity, spins, runes, pearls },
    })).toEqual({
      resolution: 'confirmed_fixed',
      rewardBundle: { version: 1, severity, spins, runes, pearls },
    });
  });

  test('rejects custom or mixed tier quantities', () => {
    for (const rewardBundle of [
      { version: 1, severity: 'minor', spins: 2, runes: 300, pearls: 1 },
      { version: 1, severity: 'serious', spins: 2, runes: 1000, pearls: 5 },
      { version: 1, severity: 'critical', spins: 3, runes: 1000, pearls: 9 },
      { version: 2, severity: 'critical', spins: 3, runes: 1000, pearls: 10 },
    ]) {
      expect(() => normalizeReportReplyReward({ resolution: 'confirmed_fixed', rewardBundle })).toThrow(HttpsError);
    }
  });

  test('normalizes the historical one-coin payload as a legacy one-pearl bundle', () => {
    expect(normalizeReportReplyReward({ resolution: 'confirmed_fixed', coins: 1 })).toEqual({
      resolution: 'confirmed_fixed',
      rewardBundle: { version: 1, severity: 'legacy', spins: 0, runes: 0, pearls: 1 },
    });
  });

  test('requires the persisted report to confirm the fixed result', () => {
    expect(reportDocumentAllowsCoin({ status: 'fixed' }, 'confirmed_fixed')).toBe(true);
    expect(reportDocumentAllowsCoin({ resolution: 'confirmed_fixed' }, 'confirmed_fixed')).toBe(true);
    expect(reportDocumentAllowsCoin({ status: 'reviewed' }, 'confirmed_fixed')).toBe(false);
    expect(reportDocumentAllowsCoin({ status: 'fixed' }, 'duplicate')).toBe(false);
    expect(reportDocumentAllowsReward({ status: 'fixed' }, 'confirmed_fixed')).toBe(true);
    expect(reportDocumentAllowsReward({ status: 'reviewed' }, 'confirmed_fixed')).toBe(false);
  });

  test('resolves a stored stable uid through its distinct report auth uid', () => {
    expect(reportRecipientIdentityLookup('error_reports', {
      uid: 'stable-user',
      authUid: 'firebase-auth-user',
    })).toEqual({
      originalUid: 'stable-user',
      authUid: 'firebase-auth-user',
      requestedStableId: 'stable-user',
    });
  });

  test('keeps the bounded legacy recipient fallback when a report has no auth uid', () => {
    expect(reportRecipientIdentityLookup('error_reports', { uid: 'legacy-identity' })).toEqual({
      originalUid: 'legacy-identity',
      authUid: 'legacy-identity',
    });
  });
});

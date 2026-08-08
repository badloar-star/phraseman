import { HttpsError } from 'firebase-functions/v2/https';
import fs from 'node:fs';
import path from 'node:path';

type AnyModule = Record<string, (...args: any[]) => any>;

function optionalModule(file: string): AnyModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(file) as AnyModule;
  } catch {
    return {};
  }
}

describe('final sensitive admin write normalizers', () => {
  const league = optionalModule('./admin_league_controls');
  const config = optionalModule('./admin_config_controls');
  const messages = optionalModule('./admin_app_messages');

  test('normalizes reasoned league mutations and rejects ambiguous points', () => {
    expect(typeof league.normalizeAdminLeagueResetInput).toBe('function');
    expect(typeof league.normalizeAdminLeagueMoveInput).toBe('function');
    if (!league.normalizeAdminLeagueResetInput || !league.normalizeAdminLeagueMoveInput) return;
    expect(league.normalizeAdminLeagueResetInput({
      groupId: '2026-W31_2_alpha', uid: 'stable-user', reason: 'Support correction',
      idempotencyKey: 'league-reset-1', requestId: 'league-request-1',
    })).toMatchObject({ groupId: '2026-W31_2_alpha', uid: 'stable-user' });
    expect(() => league.resolveAuthoritativeLeaguePoints({}, {}, {}, '2026-W31')).toThrow(HttpsError);
    expect(league.resolveAuthoritativeLeaguePoints(
      { weekKey: '2026-W31', weekPoints: 19, points: 120 },
      { progress: { week_points_v2: JSON.stringify({ weekKey: '2026-W31', points: 21 }), user_total_xp: 130 } },
      { points: 20, totalXp: 125 },
      '2026-W31',
      '2026-W31',
    )).toEqual({ points: 21, totalXp: 130 });
    expect(league.resolveAuthoritativeLeaguePoints(
      { weekKey: '2026-W30', weekPoints: 5000, points: 120 },
      { progress: { week_points_v2: JSON.stringify({ weekKey: '2026-W30', points: 4900 }), user_total_xp: 130 } },
      { points: 20, totalXp: 125 },
      '2026-W31',
      '2026-W31',
    )).toEqual({ points: 20, totalXp: 130 });
    expect(league.resolveAuthoritativeLeaguePoints(
      { weekKey: '2026-W30', groupWeekId: '2026-W31', weekPoints: 5000, points: 120 },
      { progress: { week_points_v2: JSON.stringify({ weekKey: '2026-W31', points: 21 }), user_total_xp: 130 } },
      { points: 20, totalXp: 125 },
      '2026-W31',
      '2026-W31',
    )).toEqual({ points: 21, totalXp: 130 });
    expect(() => league.resolveAuthoritativeLeaguePoints(
      { weekKey: '2026-W30', weekPoints: 5000, points: 120 },
      { progress: { week_points_v2: '{bad-json', user_total_xp: 130 } },
      { points: 20, totalXp: 125 },
      '2026-W31',
      '2026-W30',
    )).toThrow(HttpsError);
  });

  test('normalizes revision-CAS config writes and keeps alert tests server-owned', () => {
    expect(typeof config.normalizeAdminNavLayoutInput).toBe('function');
    expect(typeof config.normalizeAdminAlertsConfigInput).toBe('function');
    expect(typeof config.normalizeAdminAlertsTestInput).toBe('function');
    if (!config.normalizeAdminNavLayoutInput || !config.normalizeAdminAlertsConfigInput || !config.normalizeAdminAlertsTestInput) return;
    expect(config.normalizeAdminNavLayoutInput({
      order: ['overview', 'page:users'], pinned: ['overview'], hidden: [], expectedRevision: 4,
      reason: 'Publish navigation order', idempotencyKey: 'nav-1', requestId: 'nav-request-1',
    })).toMatchObject({ expectedRevision: 4, document: { order: ['overview', 'page:users'] } });
    expect(() => config.normalizeAdminAlertsConfigInput({
      enabled: true, chatId: '', spikeThreshold: 5, types: ['error_report'], expectedRevision: 1,
      reason: 'Publish alerts', idempotencyKey: 'alerts-1', requestId: 'alerts-request-1',
    })).toThrow(HttpsError);
    expect(config.normalizeAdminAlertsTestInput({
      expectedRevision: 1, reason: 'Verify saved Telegram alerts',
      idempotencyKey: 'alerts-test-1', requestId: 'alerts-test-request-1',
    })).not.toHaveProperty('chatId');
    expect(() => config.normalizeAdminAlertsTestInput({
      enabled: true, chatId: 'client-chat', types: ['error_report'], expectedRevision: 1,
      reason: 'Verify saved Telegram alerts', idempotencyKey: 'alerts-test-2', requestId: 'alerts-test-request-2',
    })).toThrow(HttpsError);
  });

  // зачем (владелец, 2026-08-03): App Check для админки выключен до явного разрешения
  // владельца (см. AGENTS.md «App Check для админки — НЕ ВКЛЮЧАТЬ»), поэтому отсутствие
  // request.app больше НЕ является причиной отказа. Права по-прежнему проверяются строго:
  // роль/claim admin остаются fail-closed — их проверки ниже не ослаблены.
  test('fails closed for support role, stale revision and replay mismatch', () => {
    expect(typeof config.requireAdminConfigActor).toBe('function');
    expect(typeof config.assertExpectedAdminConfigRevision).toBe('function');
    expect(typeof config.assertAdminConfigReplay).toBe('function');
    expect(typeof league.requireAdminLeagueActor).toBe('function');
    if (!config.requireAdminConfigActor || !config.assertExpectedAdminConfigRevision || !config.assertAdminConfigReplay || !league.requireAdminLeagueActor) return;
    const support = { app: {}, auth: { uid: 'support-1', token: { admin: true, adminRole: 'support' } } };
    const owner = { app: {}, auth: { uid: 'owner-1', token: { admin: true } } };
    // Без App Check-токена вызов ПРОХОДИТ (энфорс выключен по требованию владельца),
    // но владелец всё равно опознаётся как owner — замок держится на claim admin.
    expect(config.requireAdminConfigActor({ auth: owner.auth })).toMatchObject({ actorUid: 'owner-1', role: 'owner' });
    expect(() => config.requireAdminConfigActor(support)).toThrow(HttpsError);
    expect(config.requireAdminConfigActor(owner)).toMatchObject({ actorUid: 'owner-1', role: 'owner' });
    expect(() => league.requireAdminLeagueActor(support)).toThrow(HttpsError);
    expect(() => config.assertExpectedAdminConfigRevision(5, 4)).toThrow(HttpsError);
    expect(() => config.assertAdminConfigReplay({ actorUid: 'owner-2', requestFingerprint: 'same' }, 'owner-1', 'same')).toThrow(HttpsError);
  });

  test('VIP launch is bounded, fail-closed and preserves campaign targeting', () => {
    expect(typeof messages.normalizeVipSurveyCampaignInput).toBe('function');
    expect(typeof messages.assertBoundedActiveVipSurveyCount).toBe('function');
    if (!messages.normalizeVipSurveyCampaignInput || !messages.assertBoundedActiveVipSurveyCount) return;
    const vipContract = optionalModule('./vip_survey_contract');
    expect(vipContract.VIP_SURVEY_ID).toBe('vip_feedback_v2');
    expect(vipContract.VIP_SURVEY_REWARD_DAYS).toBe(30);
    const normalized = messages.normalizeVipSurveyCampaignInput({
      translations: { ru: { title: 'VIP', body: 'Survey' } }, audience: 'free', priority: 80,
      ttlDays: 30, targetAppVersions: ['1.2.3'], survey: { surveyId: 'vip_feedback_v2', rewardDays: 30 },
      reason: 'Launch VIP survey', idempotencyKey: 'vip-launch-1', requestId: 'vip-launch-request-1',
    }, 'admin@example.com', 1_800_000_000_000);
    expect(normalized.document).toMatchObject({ kind: 'vip_survey', active: true, audience: 'free', priority: 80, targetAppVersions: ['1.2.3'], vipSurvey: { surveyId: 'vip_feedback_v2', rewardDays: 30 } });
    expect(() => messages.normalizeVipSurveyCampaignInput({
      translations: { ru: { title: 'VIP', body: 'Survey' } }, audience: 'free', priority: 80,
      ttlDays: 30, targetAppVersions: ['1.2.3'], survey: { surveyId: 'other-survey', rewardDays: 7 },
      reason: 'Launch VIP survey', idempotencyKey: 'vip-launch-2', requestId: 'vip-launch-request-2',
    }, 'admin@example.com')).toThrow(HttpsError);
    expect(() => messages.assertBoundedActiveVipSurveyCount(51)).toThrow(HttpsError);
    expect(messages.assertBoundedActiveVipSurveyCount(50)).toBeUndefined();
  });
});

describe('sensitive callable source guards', () => {
  const root = path.resolve(__dirname);
  const messageSource = fs.readFileSync(path.join(root, 'admin_app_messages.ts'), 'utf8');

  test('every app-message writer uses the hard option and runtime App Check guard', () => {
    const names = [
      'adminSendPersonalAppMessage', 'adminCreateAppMessage', 'adminSetAppMessageActive',
      'adminUpdateAppMessage', 'adminDeleteAppMessage', 'adminCleanupExpiredAppMessages',
      'adminLaunchVipSurveyCampaign', 'adminDeactivateVipSurveyCampaign',
    ];
    for (const name of names) {
      const start = messageSource.indexOf(`export const ${name} = onCall(`);
      expect(start).toBeGreaterThanOrEqual(0);
      const next = messageSource.indexOf('\nexport const ', start + 1);
      const body = messageSource.slice(start, next < 0 ? messageSource.length : next);
      expect(body).toContain('ADMIN_SENSITIVE_WRITE_OPTIONS');
      expect(body).toContain('requireAdminAppCheck(request)');
    }
  });

  test('VIP launch and league move keep all connected writes in bounded transactions', () => {
    const leagueSource = fs.readFileSync(path.join(root, 'admin_league_controls.ts'), 'utf8');
    const launch = messageSource.slice(messageSource.indexOf('export const adminLaunchVipSurveyCampaign'));
    const move = leagueSource.slice(leagueSource.indexOf('export const adminMoveLeagueUser'));
    expect(launch).toContain(".limit(51)");
    expect(launch).toContain('assertBoundedActiveVipSurveyCount(active.size)');
    expect(launch).toContain('db.runTransaction(async (tx) =>');
    expect(move).toContain(".limit(51)");
    expect(move).toContain('db.runTransaction(async (tx) =>');
    expect(move).toContain('tx.set(oldGroupRef');
    expect(move).toContain('tx.set(targetGroupRef');
    expect(move).toContain('tx.set(leaderboardRef');
    expect(move).toContain('tx.set(userRef');
    expect(move).not.toContain('.catch(() =>');
  });
});

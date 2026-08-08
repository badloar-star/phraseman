import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('bounded admin control-plane deploy lane', () => {
  test('contains each approved endpoint exactly once and no broad functions target', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'functions/package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    const command = pkg.scripts?.['deploy:admin-control-plane'] ?? '';
    const expected = [
      'recordOnboardingFunnelEvent',
      'adminGetOnboardingFunnel',
      'recordAgeConsentSnapshot',
      'adminGrantAccess',
      'adminSetUserBan',
      'adminGrantReward',
      'adminSetShardBalance',
      'adminUpdateUserProfileField',
      'adminWarnUser',
      'adminResolveUserReport',
      'adminRequestUserMerge',
      'adminDeleteDuplicateUser',
      'adminMigrateLegacyAdminPremium',
      'adminResetUserProgress',
      'adminQueueAccountDeletion',
      'adminGetComplianceOverview',
      'adminListSafetyFlags',
      'adminMarkSafetyFlagsHandled',
      'adminGetRemoteConfigWorkspace',
      'adminPublishRemoteConfig',
      'adminRevokeReferralAttribution',
      'adminListReferrals',
      'adminGetReferralDashboard',
      'adminSpinStats',
      'adminSpinLogs',
      'adminSetSpinWeights',
      'adminSetReferralRouletteEnabled',
      'adminSetReferralRouletteEmergencyStop',
      'adminReferralHealth',
      'adminCreateAppMessage',
      'adminSetAppMessageActive',
      'adminUpdateAppMessage',
      'adminDeleteAppMessage',
      'adminCleanupExpiredAppMessages',
      'adminSendPersonalAppMessage',
      'adminLaunchVipSurveyCampaign',
      'adminDeactivateVipSurveyCampaign',
      'adminGetAdminConfigWorkspace',
      'adminPublishNavLayout',
      'adminPublishAlertsConfig',
      'adminTestAlerts',
      'adminResetLeaguePoints',
      'adminMoveLeagueUser',
    ];

    expect(command).toContain('deploy_lock_guard.mjs');
    expect(command).toContain('npm run build');
    expect(command).not.toMatch(/--only\s+["']?functions["']?(?:\s|$)/);
    const targets = [...command.matchAll(/functions:([A-Za-z0-9_]+)/g)].map((match) => match[1]);
    expect(targets).toEqual(expected);
    expect(new Set(targets).size).toBe(expected.length);
  });
});

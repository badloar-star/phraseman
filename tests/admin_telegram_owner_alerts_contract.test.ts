import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, '..', 'admin', 'v2', 'legacy.html'), 'utf8');

const IDS = [
  'newUser', 'referralAttributed', 'referralFirstLaunch', 'referralQualified', 'referralRewarded', 'banChanged',
  'lessonRating', 'vocabDialogueRating', 'arenaRating', 'lessonCompletionDigest',
  'contentReport', 'userReport', 'ideaOrCommunityReport', 'explanationReport', 'criticalError', 'authFailureSpike', 'safetyFlag', 'appErrorDigest', 'complianceRisk',
  'trialStart', 'premiumPurchase', 'renewal', 'cancellation', 'expiration', 'billingIssue', 'refund', 'refundSpike', 'ugcPurchase', 'promoGift', 'revenueDigest',
  'newIdea', 'websiteInbox', 'supportEmail', 'ugcSubmission', 'surveyDigest', 'cancelReason', 'appMessageDigest', 'cardPackDigest',
  'cronHealth', 'paymentWebhookFailure', 'adminAudit', 'pushJob', 'appMessagePublished', 'jarvisCritical', 'activityDigest', 'paywallDigest', 'ownerDailyDigest',
];

describe('canonical Telegram owner alerts admin UI', () => {
  test('contains the exact 47 selected event ids and no excluded signals', () => {
    expect(IDS).toHaveLength(47);
    for (const id of IDS) expect(source).toContain(`id:'${id}'`);
    expect(source).not.toContain("id:'maxRating'");
    expect(source).not.toContain("id:'dailyPhraseSaved'");
  });

  test('renders six categories, mode badges, preview and aggregate diagnostics', () => {
    for (const id of ['people', 'learning', 'reports', 'revenue', 'content', 'operations']) {
      expect(source).toContain(`id:'${id}'`);
    }
    expect(source).toContain('alerts-catalog-root');
    expect(source).toContain('alerts-preview');
    expect(source).toContain('adminGetAlertDiagnostics');
    expect(source).toContain('min-height:44px');
  });

  test('locks mandatory new users and saves only through the callable', () => {
    expect(source).toContain("required:true");
    expect(source).toContain("input.disabled = item.required === true");
    expect(source).toContain('getAdminPublishAlertsConfigCallable()');
    expect(source).not.toContain('getUpdates');
  });
});

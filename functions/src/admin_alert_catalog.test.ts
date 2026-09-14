import {
  ADMIN_ALERT_CATALOG,
  ADMIN_ALERT_IDS,
  adminAlertDefinition,
  canonicalAdminAlertType,
  isAdminAlertType,
} from './admin_alert_catalog';
import { normalizeAdminAlertsConfigInput } from './admin_config_controls';

const SELECTED_ALERT_IDS = [
  'newUser',
  'referralAttributed',
  'referralFirstLaunch',
  'referralQualified',
  'referralRewarded',
  'banChanged',
  'lessonRating',
  'vocabDialogueRating',
  'arenaRating',
  'lessonCompletionDigest',
  'contentReport',
  'userReport',
  'ideaOrCommunityReport',
  'explanationReport',
  'criticalError',
  'authFailureSpike',
  'safetyFlag',
  'appErrorDigest',
  'complianceRisk',
  'trialStart',
  'premiumPurchase',
  'renewal',
  'cancellation',
  'expiration',
  'billingIssue',
  'refund',
  'refundSpike',
  'ugcPurchase',
  'promoGift',
  'revenueDigest',
  'newIdea',
  'websiteInbox',
  'supportEmail',
  'ugcSubmission',
  'surveyDigest',
  'cancelReason',
  'appMessageDigest',
  'cardPackDigest',
  'cronHealth',
  'paymentWebhookFailure',
  'adminAudit',
  'pushJob',
  'appMessagePublished',
  'jarvisCritical',
  'activityDigest',
  'paywallDigest',
  'ownerDailyDigest',
] as const;

describe('admin owner alert catalog', () => {
  test('contains exactly the 47 events selected by the owner', () => {
    expect(ADMIN_ALERT_IDS).toEqual(SELECTED_ALERT_IDS);
    expect(ADMIN_ALERT_CATALOG).toHaveLength(47);
    expect(new Set(ADMIN_ALERT_IDS).size).toBe(47);
    expect(ADMIN_ALERT_IDS).not.toContain('maxRating');
    expect(ADMIN_ALERT_IDS).not.toContain('dailyPhraseSaved');
  });

  test('keeps new users mandatory and assigns every event a delivery mode', () => {
    expect(adminAlertDefinition('newUser')).toMatchObject({
      required: true,
      mode: 'instant',
      defaultEnabled: true,
    });
    expect(ADMIN_ALERT_CATALOG.every((item) => item.mode === 'instant' || item.mode === 'digest')).toBe(true);
    expect(ADMIN_ALERT_CATALOG.filter((item) => item.required).map((item) => item.id)).toEqual(['newUser']);
  });

  test('recognizes only catalog ids and maps legacy ids to their selected owner toggle', () => {
    expect(isAdminAlertType('premiumPurchase')).toBe(true);
    expect(isAdminAlertType('maxRating')).toBe(false);
    expect(canonicalAdminAlertType('contentReportDigest')).toBe('contentReport');
    expect(canonicalAdminAlertType('ideaReport')).toBe('ideaOrCommunityReport');
    expect(canonicalAdminAlertType('serialRefunder')).toBe('refundSpike');
    expect(canonicalAdminAlertType('not-real')).toBeNull();
  });

  test('admin config accepts every catalog type and forces new-user alerts on', () => {
    const types = Object.fromEntries(SELECTED_ALERT_IDS.map((id) => [id, id !== 'newUser']));
    const normalized = normalizeAdminAlertsConfigInput({
      enabled: true,
      chatId: '123456',
      spikePerHour: 5,
      types,
      reason: 'Owner approved Telegram alert selection',
      idempotencyKey: 'telegram-alert-catalog-v2',
      requestId: 'telegram-alert-catalog-v2-request',
      expectedRevision: 0,
    });

    expect(normalized.document.schemaVersion).toBe(2);
    expect(normalized.document.types.newUser).toBe(true);
    expect(Object.keys(normalized.document.types)).toEqual(SELECTED_ALERT_IDS);
  });

  test('admin config rejects unknown event types', () => {
    expect(() => normalizeAdminAlertsConfigInput({
      enabled: false,
      chatId: '',
      spikePerHour: 5,
      types: { newUser: true, arbitraryFirestoreDump: true },
      reason: 'reject unknown type',
      idempotencyKey: 'telegram-alert-invalid-type',
      requestId: 'telegram-alert-invalid-type-request',
      expectedRevision: 0,
    })).toThrow('unknown alert type');
  });
});

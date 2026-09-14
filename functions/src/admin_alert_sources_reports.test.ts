import { reportAlertFromCreate } from './admin_alert_sources_reports';

const NOW_MS = Date.UTC(2026, 8, 12, 22, 0);

describe('content/support Telegram sources', () => {
  test('a withdrawn submission tombstone is not a new moderation request', () => {
    expect(reportAlertFromCreate({collection: 'community_pack_submissions', documentId: 's1', data: {status: 'cancelled', submittedAt: NOW_MS}, nowMs: NOW_MS})).toBeNull();
  });
  test('moderation alerts use the persisted submittedAt rather than processing time', () => {
    expect(reportAlertFromCreate({collection: 'community_pack_submissions', documentId: 's1', data: {status: 'pending', submittedAt: NOW_MS}, nowMs: NOW_MS + 60000})?.occurredAtMs).toBe(NOW_MS);
  });
  test.each([
    ['user_ideas', 'newIdea', 'Новая идея', '#ideas'],
    ['website_contact_inbox', 'websiteInbox', 'Сайт', '#website-inbox'],
    ['support_inbox', 'supportEmail', 'Поддержка', '#gmail-support'],
    ['community_pack_submissions', 'ugcSubmission', 'Community Pack', '#community-packs'],
    ['community_pack_reports', 'ideaOrCommunityReport', 'Community Pack', '#community-packs'],
    ['subscription_cancel_surveys', 'cancelReason', 'Отмена подписки', '#cancel-surveys'],
    ['explain_report_entries', 'explanationReport', 'Объяснение', '#explain-reports'],
  ] as const)('maps %s safely', (collection, eventType, category, route) => {
    const alert = reportAlertFromCreate({
      collection,
      documentId: 'document-A1B2',
      data: {
        uid: 'stable-C3D4',
        message: 'private body must never leave Firestore',
        email: 'private@example.com',
        subject: 'private subject',
        createdAtMs: NOW_MS,
      },
      nowMs: NOW_MS + 1,
    });
    expect(alert).toMatchObject({
      eventType,
      source: `${collection}.created`,
      sourceId: 'document-A1B2',
      payload: { category, uidLast4: 'C3D4', route },
    });
    expect(JSON.stringify(alert)).not.toMatch(/private|example\.com/i);
  });

  test('ignores unsupported collections and missing ids', () => {
    expect(reportAlertFromCreate({ collection: 'unknown', documentId: 'x', data: {}, nowMs: NOW_MS })).toBeNull();
    expect(reportAlertFromCreate({ collection: 'user_ideas', documentId: '', data: {}, nowMs: NOW_MS })).toBeNull();
  });
});

import * as admin from 'firebase-admin';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { enqueueAdminAlert, type EnqueueAdminAlertInput } from './admin_alert_outbox';
import type { AdminAlertType } from './admin_alert_catalog';

const REGION = 'us-central1';
type Row = Readonly<Record<string, unknown>>;

const SOURCE_META = Object.freeze({
  user_ideas: { eventType: 'newIdea', category: 'Новая идея', route: '#ideas' },
  website_contact_inbox: { eventType: 'websiteInbox', category: 'Сайт', route: '#website-inbox' },
  support_inbox: { eventType: 'supportEmail', category: 'Поддержка', route: '#gmail-support' },
  community_pack_submissions: { eventType: 'ugcSubmission', category: 'Community Pack', route: '#community-packs' },
  community_pack_reports: { eventType: 'ideaOrCommunityReport', category: 'Community Pack', route: '#community-packs' },
  subscription_cancel_surveys: { eventType: 'cancelReason', category: 'Отмена подписки', route: '#cancel-surveys' },
  explain_report_entries: { eventType: 'explanationReport', category: 'Объяснение', route: '#explain-reports' },
} as const satisfies Readonly<Record<string, { eventType: AdminAlertType; category: string; route: string }>>);

export type AdminAlertReportCollection = keyof typeof SOURCE_META;

function last4(value: unknown): string {
  return String(value ?? '').replace(/[^A-Za-z0-9]/g, '').slice(-4);
}

function timeMs(data: Row, fallback: number): number {
  for (const value of [data.createdAtMs, data.receivedAtMs, data.submittedAt, data.createdAt]) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
    if (value && typeof value === 'object' && 'toMillis' in value) {
      const fn = (value as { toMillis?: unknown }).toMillis;
      if (typeof fn === 'function') {
        const result = Number(fn.call(value));
        if (Number.isFinite(result) && result > 0) return Math.floor(result);
      }
    }
  }
  return Math.floor(fallback);
}

export function reportAlertFromCreate(input: {
  readonly collection: string;
  readonly documentId: string;
  readonly data: Row;
  readonly nowMs: number;
}): EnqueueAdminAlertInput | null {
  const meta = SOURCE_META[input.collection as AdminAlertReportCollection];
  if (!meta || !input.documentId) return null;
  if (input.collection === 'community_pack_submissions' && input.data.status && input.data.status !== 'pending') return null;
  const uid = input.data.uid ?? input.data.stableUid ?? input.data.userId ?? input.data.buyerStableId;
  return {
    eventType: meta.eventType,
    source: `${input.collection}.created`,
    sourceId: input.documentId,
    occurredAtMs: timeMs(input.data, input.nowMs),
    payload: {
      category: meta.category,
      uidLast4: last4(uid),
      route: meta.route,
    },
  };
}

function trigger(collection: AdminAlertReportCollection) {
  return onDocumentCreated(
    { document: `${collection}/{documentId}`, region: REGION, retry: true },
    async (event) => {
      if (!event.data) return;
      const alert = reportAlertFromCreate({
        collection,
        documentId: String(event.params.documentId ?? ''),
        data: (event.data.data() ?? {}) as Row,
        nowMs: Date.now(),
      });
      if (alert) await enqueueAdminAlert(admin.firestore(), alert);
    },
  );
}

export const adminAlertOnUserIdeaCreated = trigger('user_ideas');
export const adminAlertOnWebsiteContactCreated = trigger('website_contact_inbox');
export const adminAlertOnSupportEmailCreated = trigger('support_inbox');
export const adminAlertOnCommunitySubmissionCreated = trigger('community_pack_submissions');
export const adminAlertOnCommunityPackReportCreated = trigger('community_pack_reports');
export const adminAlertOnCancelReasonCreated = trigger('subscription_cancel_surveys');
export const adminAlertOnExplanationReportCreated = trigger('explain_report_entries');

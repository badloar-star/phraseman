import { createHash, randomUUID } from 'crypto';
import * as admin from 'firebase-admin';
import { defineString } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { assertMarketingEmailConfiguration, loadSuppressedEmails, unsubscribeUrlFor } from './email_unsubscribe';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const IDEMPOTENCY_WINDOW_MS = 24 * 60 * 60 * 1000;
const PROCESSING_LEASE_MS = 10 * 60 * 1000;
const resendApiKey = defineString('RESEND_API_KEY', { default: '' });
const adminEmailFrom = defineString('ADMIN_EMAIL_FROM', { default: 'Phraseman <onboarding@resend.dev>' });

export type EmailCampaignClaimDecision = 'hold' | 'claim' | 'cancel' | 'busy' | 'terminal';

export function emailCampaignClaimDecision(
  campaign: { status?: unknown; holdUntilMs?: unknown; updatedAtMs?: unknown },
  nowMs = Date.now(),
): EmailCampaignClaimDecision {
  const status = String(campaign.status ?? '');
  if (status === 'queued_hold') {
    const holdUntilMs = Number(campaign.holdUntilMs || 0);
    return holdUntilMs > nowMs ? 'hold' : 'claim';
  }
  if (status === 'cancel_requested') return 'cancel';
  if (status === 'processing') {
    const updatedAtMs = Number(campaign.updatedAtMs || 0);
    return updatedAtMs > 0 && nowMs - updatedAtMs < PROCESSING_LEASE_MS ? 'busy' : 'claim';
  }
  return 'terminal';
}

export function emailCampaignFinalStatus(input: {
  accepted: number;
  failed: number;
  uncertain: number;
  cancelled: boolean;
}): 'completed' | 'partial_failed' | 'delivery_uncertain' | 'cancelled' | 'cancelled_partial' | 'failed' {
  if (input.cancelled) return input.accepted > 0 || input.failed > 0 || input.uncertain > 0 ? 'cancelled_partial' : 'cancelled';
  if (input.uncertain > 0) return 'delivery_uncertain';
  if (input.failed > 0) return input.accepted > 0 ? 'partial_failed' : 'failed';
  return 'completed';
}

export function emailCampaignActualCheckedCount(input: {
  accepted: number;
  failed: number;
  uncertain: number;
  suppressed: number;
  ineligible: number;
}): number {
  return ['accepted', 'failed', 'uncertain', 'suppressed', 'ineligible']
    .reduce((sum, key) => sum + Math.max(0, Number(input[key as keyof typeof input] || 0)), 0);
}

export interface ResendBatchMessage {
  from: string;
  to: string[];
  subject: string;
  text: string;
  html: string;
  headers?: Record<string, string>;
}

export interface EmailBatchContact {
  contactId: string;
  email: string;
  bulkEligibility: string;
}

export function buildEmailBatchFingerprint(messages: readonly ResendBatchMessage[]): string {
  return createHash('sha256').update(JSON.stringify(messages)).digest('hex').slice(0, 32);
}

export function sanitizeEmailProviderError(value: unknown): string {
  return String(value ?? '')
    .replace(/[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, '[email]')
    .replace(/Bearer\s+[^\s"']+/gi, 'Bearer [redacted]')
    .slice(0, 500);
}

export interface EmailCampaignBatchClaimInput {
  nowMs: number;
  leaseOwner: string;
  payloadFingerprint: string;
  idempotencyKey: string;
  recipientContactIds: string[];
  recipientCount: number;
  suppressedCount: number;
  ineligibleCount: number;
}

export async function claimEmailCampaignBatch(
  db: FirebaseFirestore.Firestore,
  campaignRef: FirebaseFirestore.DocumentReference,
  batchRef: FirebaseFirestore.DocumentReference,
  input: EmailCampaignBatchClaimInput,
): Promise<{ claimed: boolean; reason?: 'terminal' | 'busy' | 'cancelled' | 'manual_review' | 'payload_changed' }> {
  return db.runTransaction(async (tx) => {
    const [campaignSnap, snap] = await Promise.all([tx.get(campaignRef), tx.get(batchRef)]);
    const campaign = campaignSnap.data() || {};
    if (clean(campaign.status, 32) !== 'processing' || campaign.cancelFinalizing === true) {
      return { claimed: false, reason: 'cancelled' };
    }
    const existing = snap.data() || {};
    const state = clean(existing.state, 32);
    if (['accepted', 'failed', 'skipped', 'manual_review'].includes(state)) return { claimed: false, reason: 'terminal' };
    const leaseUntilMs = Number(existing.leaseUntilMs || 0);
    if (state === 'dispatching' && leaseUntilMs > input.nowMs && clean(existing.leaseOwner, 160) !== input.leaseOwner) {
      return { claimed: false, reason: 'busy' };
    }
    const firstAttemptAtMs = Number(existing.firstAttemptAtMs || 0);
    if (['dispatching', 'retryable', 'delivery_uncertain'].includes(state)) {
      const retryDecision = emailBatchRetryDecision(state === 'dispatching' ? 'delivery_uncertain' : state, firstAttemptAtMs, input.nowMs);
      if (retryDecision === 'manual_review') {
        tx.set(batchRef, { state: 'manual_review', leaseOwner: null, leaseUntilMs: 0, updatedAtMs: input.nowMs, error: 'provider_idempotency_window_expired' }, { merge: true });
        return { claimed: false, reason: 'manual_review' };
      }
    }
    const previousFingerprint = clean(existing.payloadFingerprint, 64);
    if (state && previousFingerprint && previousFingerprint !== input.payloadFingerprint) {
      tx.set(batchRef, {
        state: 'manual_review', leaseOwner: null, leaseUntilMs: 0,
        recipientCount: Number(existing.recipientCount || input.recipientCount),
        updatedAtMs: input.nowMs, error: 'payload_changed_after_dispatch',
      }, { merge: true });
      return { claimed: false, reason: 'payload_changed' };
    }
    tx.set(batchRef, {
      state: 'dispatching',
      leaseOwner: input.leaseOwner,
      leaseUntilMs: input.nowMs + PROCESSING_LEASE_MS,
      recipientContactIds: input.recipientContactIds,
      recipientCount: input.recipientCount,
      suppressedCount: input.suppressedCount,
      ineligibleCount: input.ineligibleCount,
      payloadFingerprint: input.payloadFingerprint,
      idempotencyKey: input.idempotencyKey,
      firstAttemptAtMs: firstAttemptAtMs || input.nowMs,
      lastAttemptAtMs: input.nowMs,
      attemptCount: Number(existing.attemptCount || 0) + 1,
      updatedAtMs: input.nowMs,
    }, { merge: true });
    return { claimed: true };
  });
}

export async function finalizeEmailCampaignBatch(
  db: FirebaseFirestore.Firestore,
  batchRef: FirebaseFirestore.DocumentReference,
  leaseOwner: string,
  patch: Record<string, unknown>,
): Promise<boolean> {
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(batchRef);
    const existing = snap.data() || {};
    if (clean(existing.leaseOwner, 160) !== leaseOwner) return false;
    if (existing.state === 'accepted' && patch.state !== 'accepted') return false;
    tx.set(batchRef, { ...patch, leaseOwner: null, leaseUntilMs: 0, updatedAtMs: Date.now() }, { merge: true });
    return true;
  });
}

export type ResendBatchResult = {
  state: 'accepted' | 'failed' | 'retryable' | 'delivery_uncertain';
  acceptedCount: number;
  providerIds: string[];
  error?: string;
  retryAfterSeconds?: number;
};

export function emailBatchRetryDecision(state: unknown, firstAttemptAtMs: number, nowMs = Date.now()): 'retry_same_key' | 'manual_review' | 'skip' {
  if (state !== 'delivery_uncertain' && state !== 'retryable') return 'skip';
  if (!firstAttemptAtMs || nowMs - firstAttemptAtMs >= IDEMPOTENCY_WINDOW_MS) return 'manual_review';
  return 'retry_same_key';
}

function normalizeEmail(value: unknown): string {
  const email = String(value ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : '';
}

export function selectEmailBatchRecipients(contacts: readonly EmailBatchContact[], suppressed: ReadonlySet<string>) {
  const recipients: EmailBatchContact[] = [];
  let suppressedCount = 0;
  let ineligibleCount = 0;
  const seen = new Set<string>();
  for (const contact of contacts) {
    const email = normalizeEmail(contact.email);
    if (!email || contact.bulkEligibility !== 'eligible') { ineligibleCount += 1; continue; }
    if (suppressed.has(email)) { suppressedCount += 1; continue; }
    if (seen.has(email)) continue;
    seen.add(email);
    recipients.push({ ...contact, email });
  }
  return { recipients, suppressedCount, ineligibleCount };
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function buildResendBatchMessages(
  recipients: readonly EmailBatchContact[],
  content: { subject: string; text: string },
  from: string,
  unsubscribeUrlFor: (email: string) => string,
): ResendBatchMessage[] {
  return recipients.map((recipient) => {
    const unsubscribeUrl = unsubscribeUrlFor(recipient.email);
    const text = `${content.text}\n\n--\nPhraseman\nОтписаться от рассылки: ${unsubscribeUrl}`;
    const html = `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#111"><div>${escapeHtml(content.text).replace(/\n/g, '<br>')}</div><hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0"><div style="font-size:12px;color:#6b7280">Phraseman · <a href="${escapeHtml(unsubscribeUrl)}" style="color:#6b7280">Отписаться от рассылки</a></div></body></html>`;
    return {
      from,
      to: [recipient.email],
      subject: content.subject,
      text,
      html,
      headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    };
  });
}

export async function sendResendBatch(
  messages: ResendBatchMessage[],
  idempotencyKey: string,
  apiKey: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResendBatchResult> {
  if (!messages.length) return { state: 'accepted', acceptedCount: 0, providerIds: [] };
  if (messages.length > 100) throw new Error('resend_batch_limit');
  if (!apiKey) throw new Error('resend_key_missing');
  try {
    const response = await fetchImpl('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json; charset=utf-8',
        'Idempotency-Key': String(idempotencyKey).slice(0, 256),
      },
      body: JSON.stringify(messages),
    });
    const body = await response.text();
    if (!response.ok) {
      const error = body.slice(0, 500) || `resend_http_${response.status}`;
      if (response.status === 429) {
        const retryAfterSeconds = Math.max(1, Number(response.headers.get('retry-after') || 1));
        return { state: 'retryable', acceptedCount: 0, providerIds: [], error, retryAfterSeconds };
      }
      if (response.status === 409) return { state: 'delivery_uncertain', acceptedCount: 0, providerIds: [], error };
      if (response.status >= 500) return { state: 'retryable', acceptedCount: 0, providerIds: [], error };
      return { state: 'failed', acceptedCount: 0, providerIds: [], error };
    }
    const parsed = JSON.parse(body || '{}') as { data?: Array<{ id?: string }> };
    const providerIds = Array.isArray(parsed.data) ? parsed.data.map((item) => String(item.id || '')).filter(Boolean) : [];
    return { state: 'accepted', acceptedCount: messages.length, providerIds };
  } catch (error) {
    return { state: 'delivery_uncertain', acceptedCount: 0, providerIds: [], error: error instanceof Error ? error.message.slice(0, 500) : String(error).slice(0, 500) };
  }
}

type CampaignRow = Record<string, unknown>;

function clean(value: unknown, max = 500): string {
  return String(value ?? '').trim().slice(0, max);
}

async function claimEmailCampaign(
  db: FirebaseFirestore.Firestore,
  campaignId: string,
  nowMs: number,
): Promise<{ claimed: boolean; reason: EmailCampaignClaimDecision | 'missing'; campaign?: CampaignRow }> {
  const ref = db.collection('email_campaigns').doc(campaignId);
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return { claimed: false, reason: 'missing' };
    const campaign = snap.data() || {};
    if (campaign.cancelFinalizing === true) {
      const updatedAtMs = Number(campaign.updatedAtMs || 0);
      if (updatedAtMs > 0 && nowMs - updatedAtMs < PROCESSING_LEASE_MS) return { claimed: false, reason: 'busy' as const };
      tx.set(ref, { status: 'processing', cancelFinalizing: true, updatedAtMs: nowMs }, { merge: true });
      return { claimed: true, reason: 'cancel' as const, campaign };
    }
    if (campaign.status === 'cancel_requested') {
      tx.set(ref, { status: 'processing', cancelFinalizing: true, updatedAtMs: nowMs }, { merge: true });
      return { claimed: true, reason: 'cancel' as const, campaign };
    }
    const decision = emailCampaignClaimDecision(campaign, nowMs);
    if (decision !== 'claim') return { claimed: false, reason: decision };
    tx.set(ref, {
      status: 'processing',
      processingStartedAtMs: Number(campaign.processingStartedAtMs || 0) || nowMs,
      updatedAtMs: nowMs,
      error: admin.firestore.FieldValue.delete(),
    }, { merge: true });
    return { claimed: true, reason: decision, campaign };
  });
}

async function readEmailBatchContacts(
  db: FirebaseFirestore.Firestore,
  contactIds: readonly string[],
): Promise<EmailBatchContact[]> {
  if (!contactIds.length) return [];
  const refs = contactIds.map((id) => db.collection('email_contacts').doc(id));
  const snaps = await db.getAll(...refs);
  return snaps.flatMap((snap) => {
    if (!snap.exists) return [];
    const data = snap.data() || {};
    return [{
      contactId: snap.id,
      email: clean(data.email, 320),
      bulkEligibility: clean(data.bulkEligibility, 32),
    }];
  });
}

interface StoredBatchSummary {
  accepted: number;
  failed: number;
  uncertain: number;
  suppressed: number;
  ineligible: number;
}

async function summarizeStoredBatches(
  campaignRef: FirebaseFirestore.DocumentReference,
): Promise<StoredBatchSummary> {
  const snap = await campaignRef.collection('batches').get();
  const summary: StoredBatchSummary = { accepted: 0, failed: 0, uncertain: 0, suppressed: 0, ineligible: 0 };
  for (const doc of snap.docs) {
    const data = doc.data();
    summary.accepted += Number(data.acceptedCount || 0);
    summary.failed += Number(data.failedCount || 0);
    summary.suppressed += Number(data.suppressedCount || 0);
    summary.ineligible += Number(data.ineligibleCount || 0);
    if (['manual_review', 'delivery_uncertain', 'retryable', 'dispatching'].includes(clean(data.state, 32))) {
      summary.uncertain += Number(data.recipientCount || 0);
    }
  }
  return summary;
}

async function finalizeEmailCampaign(
  db: FirebaseFirestore.Firestore,
  campaignRef: FirebaseFirestore.DocumentReference,
  cancelled: boolean,
): Promise<{ status: string; totals: StoredBatchSummary }> {
  const totals = await summarizeStoredBatches(campaignRef);
  return db.runTransaction(async (tx) => {
    const campaignSnap = await tx.get(campaignRef);
    const campaign = campaignSnap.data() || {};
    const currentStatus = clean(campaign.status, 32);
    const cancellationActive = cancelled
      || campaign.cancelFinalizing === true
      || ['cancel_requested', 'cancelled', 'cancelled_partial'].includes(currentStatus);
    const status = emailCampaignFinalStatus({ ...totals, cancelled: cancellationActive });
    const finishedAtMs = Date.now();
    tx.set(campaignRef, {
      status,
      targetCount: emailCampaignActualCheckedCount(totals),
      acceptedCount: totals.accepted,
      failedCount: totals.failed,
      uncertainCount: totals.uncertain,
      suppressedAtSendCount: totals.suppressed,
      ineligibleAtSendCount: totals.ineligible,
      providerMetricLabel: 'accepted_by_provider',
      finishedAtMs,
      updatedAtMs: finishedAtMs,
      retryPending: admin.firestore.FieldValue.delete(),
      cancelFinalizing: admin.firestore.FieldValue.delete(),
    }, { merge: true });
    return { status, totals };
  });
}

function campaignCancellationActive(data: FirebaseFirestore.DocumentSnapshot | FirebaseFirestore.QueryDocumentSnapshot): boolean {
  const status = clean(data.get('status'), 32);
  return data.get('cancelFinalizing') === true || ['cancel_requested', 'cancelled', 'cancelled_partial'].includes(status);
}

export async function processAdminEmailCampaign(
  campaignId: string,
  nowMs = Date.now(),
  fetchImpl: typeof fetch = fetch,
): Promise<{ status: string; reason?: string }> {
  const db = admin.firestore();
  const campaignRef = db.collection('email_campaigns').doc(campaignId);
  const claim = await claimEmailCampaign(db, campaignId, nowMs);
  if (!claim.claimed || !claim.campaign) return { status: 'skipped', reason: claim.reason };
  if (claim.reason === 'cancel') {
    const finalized = await finalizeEmailCampaign(db, campaignRef, true);
    return { status: finalized.status };
  }

  const campaign = claim.campaign;
  const previewId = clean(campaign.previewId, 160);
  if (!previewId) {
    await campaignRef.set({ status: 'failed', error: 'missing_preview', finishedAtMs: nowMs, updatedAtMs: nowMs }, { merge: true });
    return { status: 'failed', reason: 'missing_preview' };
  }

  const previewRef = db.collection('admin_email_previews').doc(previewId);
  const shardSnap = await previewRef.collection('recipient_shards').orderBy('__name__').get();
  const apiKey = resendApiKey.value();
  const from = adminEmailFrom.value();
  try {
    assertMarketingEmailConfiguration(from);
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'email_configuration_invalid';
    await campaignRef.set({ status: 'failed', error: reason, finishedAtMs: nowMs, updatedAtMs: nowMs }, { merge: true });
    return { status: 'failed', reason };
  }
  if (!apiKey) {
    await campaignRef.set({ status: 'failed', error: 'resend_key_missing', finishedAtMs: nowMs, updatedAtMs: nowMs }, { merge: true });
    return { status: 'failed', reason: 'resend_key_missing' };
  }

  let cancelled = false;
  const workerId = randomUUID();
  for (const shardDoc of shardSnap.docs) {
    const liveCampaign = await campaignRef.get();
    if (campaignCancellationActive(liveCampaign)) {
      cancelled = true;
      break;
    }

    const batchRef = campaignRef.collection('batches').doc(shardDoc.id);
    const contactIds = Array.isArray(shardDoc.get('contactIds'))
      ? (shardDoc.get('contactIds') as unknown[]).map((id) => clean(id, 160)).filter(Boolean).slice(0, 100)
      : [];
    const [contacts, suppressed] = await Promise.all([
      readEmailBatchContacts(db, contactIds),
      loadSuppressedEmails(db),
    ]);
    const selected = selectEmailBatchRecipients(contacts, suppressed);
    const messages = buildResendBatchMessages(
      selected.recipients,
      { subject: clean(campaign.subject, 140), text: clean(campaign.text, 6000) },
      from,
      unsubscribeUrlFor,
    );
    const fingerprint = buildEmailBatchFingerprint(messages);
    const idempotencyKey = `email/${campaignId}/${shardDoc.id}/${fingerprint}`.slice(0, 256);
    const attemptAtMs = Date.now();
    const batchClaim = await claimEmailCampaignBatch(db, campaignRef, batchRef, {
      nowMs: attemptAtMs,
      leaseOwner: workerId,
      payloadFingerprint: fingerprint,
      idempotencyKey,
      recipientContactIds: selected.recipients.map((item) => item.contactId),
      recipientCount: messages.length,
      suppressedCount: selected.suppressedCount,
      ineligibleCount: selected.ineligibleCount,
    });
    if (!batchClaim.claimed) {
      if (batchClaim.reason === 'busy') return { status: 'processing', reason: 'batch_busy' };
      if (batchClaim.reason === 'cancelled') {
        const finalized = await finalizeEmailCampaign(db, campaignRef, true);
        return { status: finalized.status };
      }
      continue;
    }

    if (!messages.length) {
      await finalizeEmailCampaignBatch(db, batchRef, workerId, { state: 'skipped', acceptedCount: 0, failedCount: 0 });
      continue;
    }

    const result = await sendResendBatch(messages, idempotencyKey, apiKey, fetchImpl);
    const failedCount = result.state === 'failed' ? messages.length : 0;
    const finalized = await finalizeEmailCampaignBatch(db, batchRef, workerId, {
      state: result.state,
      acceptedCount: result.acceptedCount,
      failedCount,
      providerIds: result.providerIds.slice(0, 100),
      error: result.error ? sanitizeEmailProviderError(result.error) : admin.firestore.FieldValue.delete(),
      retryAfterSeconds: result.retryAfterSeconds || admin.firestore.FieldValue.delete(),
    });
    if (!finalized) return { status: 'processing', reason: 'batch_lease_lost' };

    const campaignAfterBatch = await campaignRef.get();
    if (campaignCancellationActive(campaignAfterBatch)) {
      const cancelledCampaign = await finalizeEmailCampaign(db, campaignRef, true);
      return { status: cancelledCampaign.status };
    }

    if (result.state === 'retryable' || result.state === 'delivery_uncertain') {
      await campaignRef.set({ status: 'processing', updatedAtMs: Date.now(), retryPending: true }, { merge: true });
      return { status: 'processing', reason: result.state };
    }
  }

  const finalized = await finalizeEmailCampaign(db, campaignRef, cancelled);
  return { status: finalized.status };
}

export const adminEmailCampaignCreated = onDocumentCreated(
  { region: REGION, document: 'email_campaigns/{campaignId}', timeoutSeconds: 540, memory: '512MiB' },
  async (event) => {
    const campaignId = clean(event.params.campaignId, 160);
    if (!campaignId) return;
    const result = await processAdminEmailCampaign(campaignId);
    console.log('adminEmailCampaignCreated', JSON.stringify({ campaignId, ...result }));
  },
);

export const adminEmailCampaignsCron = onSchedule(
  { region: REGION, schedule: '*/5 * * * *', timeZone: 'UTC', timeoutSeconds: 540, memory: '512MiB' },
  async () => {
    const db = admin.firestore();
    const snap = await db.collection('email_campaigns')
      .where('status', 'in', ['queued_hold', 'processing', 'cancel_requested'])
      .limit(20)
      .get();
    for (const doc of snap.docs) {
      const result = await processAdminEmailCampaign(doc.id);
      console.log('adminEmailCampaignsCron', JSON.stringify({ campaignId: doc.id, ...result }));
    }
  },
);

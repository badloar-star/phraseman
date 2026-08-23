import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import { defineString } from 'firebase-functions/params';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

import { ENFORCE_APP_CHECK } from './callable_options';
import {
  isApplePrivateRelayEmail,
  normalizeEmailContactEmail,
  upsertEmailContact,
} from './email_contacts';
import {
  EMAIL_UNSUBSCRIBE_SECRETS,
  loadSuppressedEmails,
  unsubscribeUrlFor,
} from './email_unsubscribe';
import { RESEND_API_KEY } from './resend_secret';

const REGION = 'us-central1';
const MAX_RECIPIENTS = 5000;
const SEND_CONCURRENCY = 8;
const BACKFILL_PAGE_SIZE = 400;
const MAX_BACKFILL_DOCS_PER_COLLECTION = 50000;
const EMAIL_RE =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

const adminEmailFrom = defineString('ADMIN_EMAIL_FROM', { default: '' });

export interface NormalizedAdminEmailBroadcast {
  emails: string[];
  subject: string;
  text: string;
  audienceLabel: string;
}

function cleanString(value: unknown, max: number): string {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > max ? text.slice(0, max) : text;
}

export function normalizeEmailCandidate(value: unknown): string | null {
  const email = String(value ?? '').trim().toLowerCase().slice(0, 320);
  return EMAIL_RE.test(email) ? email : null;
}

function readEmailInput(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return value.split(/[\s,;]+/).filter(Boolean);
  return [];
}

export function normalizeBroadcastPayload(data: unknown): NormalizedAdminEmailBroadcast {
  const raw = data && typeof data === 'object' && !Array.isArray(data)
    ? data as Record<string, unknown>
    : {};
  const seen = new Set<string>();
  const emails = readEmailInput(raw.emails)
    .map(normalizeEmailCandidate)
    .filter((email): email is string => !!email)
    .filter((email) => {
      if (seen.has(email)) return false;
      seen.add(email);
      return true;
    });
  const subject = cleanString(raw.subject, 140);
  const text = cleanString(raw.text, 6000);
  const audienceLabel = cleanString(raw.audienceLabel, 120) || 'selected';

  if (!emails.length) throw new HttpsError('invalid-argument', 'emails_required');
  if (emails.length > MAX_RECIPIENTS) {
    throw new HttpsError('invalid-argument', `too_many_recipients:${MAX_RECIPIENTS}`);
  }
  if (subject.length < 3) throw new HttpsError('invalid-argument', 'subject_required');
  if (text.length < 10) throw new HttpsError('invalid-argument', 'text_required');

  return { emails, subject, text, audienceLabel };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * HTML-версия письма с явной UTF-8-разметкой. Без неё кириллица в некоторых
 * клиентах (Gmail) может превратиться в «?». HTML гарантирует charset=utf-8.
 * Для транзакционных писем (unsubscribeUrl не передан) футер отписки НЕ
 * добавляем: письмо не рассылка, отписываться не от чего.
 */
function buildHtmlBody(text: string, unsubscribeUrl?: string): string {
  const safeBody = escapeHtml(text).replace(/\n/g, '<br>');
  const base = `<!doctype html><html><head><meta charset="utf-8"></head>` +
    `<body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:15px;line-height:1.6;color:#111">` +
    `<div>${safeBody}</div>`;
  if (!unsubscribeUrl) return `${base}</body></html>`;
  const safeUrl = escapeHtml(unsubscribeUrl);
  return base +
    `<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">` +
    `<div style="font-size:12px;color:#6b7280">Phraseman · ` +
    `<a href="${safeUrl}" style="color:#6b7280">Отписаться от рассылки</a></div>` +
    `</body></html>`;
}

async function sendResendEmail(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  unsubscribeUrl?: string;
  idempotencyKey?: string;
}): Promise<{
  ok: boolean;
  id?: string;
  error?: string;
  errorKind?: 'http' | 'transport';
  httpStatus?: number;
  errorName?: 'concurrent_idempotent_requests' | 'invalid_idempotent_request';
}> {
  try {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${params.apiKey}`,
      'Content-Type': 'application/json; charset=utf-8',
    };
    if (params.idempotencyKey) headers['Idempotency-Key'] = params.idempotencyKey;
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        from: params.from,
        to: [params.to],
        subject: params.subject,
        text: params.text,
        html: buildHtmlBody(params.text, params.unsubscribeUrl),
        // RFC 8058: почтовые клиенты (Gmail/Apple) показывают кнопку «Отписаться».
        // Только для рассылок: транзакционным письмам List-Unsubscribe не нужен.
        headers: params.unsubscribeUrl
          ? {
            'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          }
          : undefined,
      }),
    });
    const body = await response.text();
    if (!response.ok) {
      let errorName: 'concurrent_idempotent_requests' | 'invalid_idempotent_request' | undefined;
      try {
        const parsed = JSON.parse(body) as { name?: unknown };
        if (
          parsed.name === 'concurrent_idempotent_requests'
          || parsed.name === 'invalid_idempotent_request'
        ) errorName = parsed.name;
      } catch {
        errorName = undefined;
      }
      return {
        ok: false,
        error: errorName ?? 'resend_http_error',
        errorKind: 'http',
        httpStatus: response.status,
        ...(errorName ? { errorName } : {}),
      };
    }
    try {
      const parsed = JSON.parse(body) as { id?: string };
      return { ok: true, id: parsed.id };
    } catch {
      return { ok: true };
    }
  } catch (error) {
    return { ok: false, error: String(error).slice(0, 500), errorKind: 'transport' };
  }
}

/**
 * Минимальная обёртка для ТРАНЗАКЦИОННЫХ писем (код восстановления и т.п.).
 * От рассылки отличается тем, что: без List-Unsubscribe/футера отписки, без
 * проверки suppression-листа (письмо запрошено самим юзером) и без кампании в
 * Firestore. Пустой RESEND_API_KEY не роняет модуль: возвращает
 * { ok: false, error: 'resend_key_missing' }, решение о HttpsError — у вызывающего.
 */
export async function sendTransactionalEmail(params: {
  to: string;
  subject: string;
  text: string;
  idempotencyKey?: string;
}): Promise<{ ok: boolean; id?: string; error?: string }> {
  const idempotencyKey = params.idempotencyKey?.trim();
  if (
    params.idempotencyKey !== undefined
    && (!idempotencyKey || !/^[A-Za-z0-9_./:-]{1,256}$/.test(idempotencyKey))
  ) {
    return { ok: false, error: 'resend_idempotency_key_invalid' };
  }
  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) return { ok: false, error: 'resend_key_missing' };
  const from = adminEmailFrom.value().trim();
  if (!from) return { ok: false, error: 'resend_from_missing' };
  const result = await sendResendEmail({
    apiKey,
    from,
    to: params.to,
    subject: params.subject,
    text: params.text,
    ...(idempotencyKey ? { idempotencyKey } : {}),
  });
  if (result.ok) return { ok: true, ...(result.id ? { id: result.id } : {}) };
  const retryableHttp = result.errorKind === 'http'
    && (
      result.httpStatus === 408
      || result.httpStatus === 429
      || (result.httpStatus ?? 0) >= 500
      || (result.httpStatus === 409 && result.errorName === 'concurrent_idempotent_requests')
    );
  return {
    ok: false,
    error: result.errorKind === 'http'
      ? retryableHttp ? 'resend_http_retryable' : 'resend_http_failed'
      : 'resend_transport_failed',
  };
}

async function sendBroadcastEmails(payload: NormalizedAdminEmailBroadcast, campaignId: string): Promise<{
  sentCount: number;
  failedCount: number;
  suppressedCount: number;
  errors: string[];
}> {
  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) throw new HttpsError('failed-precondition', 'resend_key_missing');
  const from = adminEmailFrom.value().trim();
  if (!from) throw new HttpsError('failed-precondition', 'resend_from_missing');
  let sentCount = 0;
  let failedCount = 0;
  const errors: string[] = [];

  // Убираем отписавшихся ДО отправки — это обязательное требование для рассылок.
  const suppressed = await loadSuppressedEmails(admin.firestore());
  const recipients = payload.emails.filter((email) => !suppressed.has(email));
  const suppressedCount = payload.emails.length - recipients.length;

  for (let index = 0; index < recipients.length; index += SEND_CONCURRENCY) {
    const chunk = recipients.slice(index, index + SEND_CONCURRENCY);
    const results = await Promise.all(chunk.map((email) => {
      const unsubscribeUrl = unsubscribeUrlFor(email);
      const text = `${payload.text}\n\n--\nPhraseman\nОтписаться от рассылки: ${unsubscribeUrl}`;
      return sendResendEmail({ apiKey, from, to: email, subject: payload.subject, text, unsubscribeUrl });
    }));
    results.forEach((result, offset) => {
      const email = chunk[offset];
      if (result.ok) {
        sentCount += 1;
      } else {
        failedCount += 1;
        if (errors.length < 20) errors.push(`${email}: ${result.error || 'send_failed'}`);
      }
    });
    if ((index + SEND_CONCURRENCY) % 80 === 0) {
      await admin.firestore().collection('email_campaigns').doc(campaignId).set({
        sentCount,
        failedCount,
        suppressedCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAtIso: new Date().toISOString(),
      }, { merge: true });
    }
  }

  return { sentCount, failedCount, suppressedCount, errors };
}

type BackfillResult = 'app' | 'site' | 'skipped_invalid' | 'skipped_relay' | null;

type BackfillStats = {
  scannedUsers: number;
  scannedAuthLinks: number;
  scannedWebOrders: number;
  scannedWebsiteInbox: number;
  writtenApp: number;
  writtenSite: number;
  skippedInvalid: number;
  skippedRelay: number;
  truncatedCollections: string[];
};

type ScannedKey = 'scannedUsers' | 'scannedAuthLinks' | 'scannedWebOrders' | 'scannedWebsiteInbox';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function firstEmailCandidate(...values: unknown[]): string | null {
  for (const value of values) {
    const email = normalizeEmailContactEmail(value);
    if (email) return email;
  }
  return null;
}

async function runBackfillTasks(tasks: Array<() => Promise<BackfillResult>>, stats: BackfillStats): Promise<void> {
  for (let index = 0; index < tasks.length; index += SEND_CONCURRENCY) {
    const results = await Promise.all(tasks.slice(index, index + SEND_CONCURRENCY).map((task) => task()));
    results.forEach((result) => {
      if (result === 'app') stats.writtenApp += 1;
      else if (result === 'site') stats.writtenSite += 1;
      else if (result === 'skipped_invalid') stats.skippedInvalid += 1;
      else if (result === 'skipped_relay') stats.skippedRelay += 1;
    });
  }
}

async function scanCollectionForEmailContacts(params: {
  db: FirebaseFirestore.Firestore;
  collectionName: string;
  scannedKey: ScannedKey;
  stats: BackfillStats;
  worker: (doc: FirebaseFirestore.QueryDocumentSnapshot) => Promise<BackfillResult>;
}): Promise<void> {
  const { db, collectionName, scannedKey, stats, worker } = params;
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  let scanned = 0;
  while (scanned < MAX_BACKFILL_DOCS_PER_COLLECTION) {
    const pageSize = Math.min(BACKFILL_PAGE_SIZE, MAX_BACKFILL_DOCS_PER_COLLECTION - scanned);
    let ref: FirebaseFirestore.Query = db.collection(collectionName)
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(pageSize);
    if (lastDoc) ref = ref.startAfter(lastDoc);
    const snap = await ref.get();
    if (snap.empty) break;
    scanned += snap.size;
    stats[scannedKey] += snap.size;
    lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    await runBackfillTasks(snap.docs.map((doc) => () => worker(doc)), stats);
    if (snap.size < pageSize) break;
  }
  if (scanned >= MAX_BACKFILL_DOCS_PER_COLLECTION) {
    stats.truncatedCollections.push(collectionName);
  }
}

async function backfillUserEmailContact(
  db: FirebaseFirestore.Firestore,
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<BackfillResult> {
  const data = doc.data() ?? {};
  const linked = asRecord(data.linkedAuth);
  const email = firstEmailCandidate(linked.email, data.email, data.authEmail, data.providerEmail);
  if (!email) return 'skipped_invalid';
  if (isApplePrivateRelayEmail(email)) return 'skipped_relay';
  const ok = await upsertEmailContact(db, {
    email,
    source: 'app',
    countSignal: false,
    provider: linked.provider || data.provider || 'app',
    providerUid: linked.providerUid || data.firebaseAuthUid,
    stableId: doc.id,
    displayName: linked.displayName || data.name || data.displayName,
    devicePlatform: linked.devicePlatform || data.devicePlatform,
    lastSignInAt: linked.lastSignInAt || linked.linkedAt || data.updatedAt || data.createdAt,
  });
  return ok ? 'app' : 'skipped_invalid';
}

async function backfillAuthLinkEmailContact(
  db: FirebaseFirestore.Firestore,
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<BackfillResult> {
  const data = doc.data() ?? {};
  const email = firstEmailCandidate(data.email);
  if (!email) return 'skipped_invalid';
  if (isApplePrivateRelayEmail(email)) return 'skipped_relay';
  const ok = await upsertEmailContact(db, {
    email,
    source: 'app',
    countSignal: false,
    provider: data.provider || 'app',
    providerUid: data.providerUid || doc.id,
    stableId: data.stable_id,
    displayName: data.displayName,
    devicePlatform: data.devicePlatform,
    lastSignInAt: data.lastSignInAt || data.linkedAt || data.updatedAt,
  });
  return ok ? 'app' : 'skipped_invalid';
}

async function backfillWebOrderEmailContact(
  db: FirebaseFirestore.Firestore,
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<BackfillResult> {
  const data = doc.data() ?? {};
  const email = firstEmailCandidate(data.email, data.customerEmail, data.payerEmail);
  if (!email) return 'skipped_invalid';
  const ok = await upsertEmailContact(db, {
    email,
    source: 'site',
    countSignal: false,
    provider: data.provider || 'web_order',
    orderId: doc.id,
    plan: data.plan || data.planDuration,
    amountCents: data.amountCents,
    currency: data.currency,
  });
  return ok ? 'site' : 'skipped_invalid';
}

async function backfillWebsiteInboxEmailContact(
  db: FirebaseFirestore.Firestore,
  doc: FirebaseFirestore.QueryDocumentSnapshot,
): Promise<BackfillResult> {
  const data = doc.data() ?? {};
  const email = firstEmailCandidate(data.email);
  if (!email) return 'skipped_invalid';
  const ok = await upsertEmailContact(db, {
    email,
    source: 'site',
    countSignal: false,
    provider: 'site_form',
    orderId: doc.id,
    plan: data.topic,
  });
  return ok ? 'site' : 'skipped_invalid';
}

export const adminEmailContactsBackfill = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 540,
  memory: '1GiB',
}, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'admin_only');
  }
  const db = admin.firestore();
  const stats: BackfillStats = {
    scannedUsers: 0,
    scannedAuthLinks: 0,
    scannedWebOrders: 0,
    scannedWebsiteInbox: 0,
    writtenApp: 0,
    writtenSite: 0,
    skippedInvalid: 0,
    skippedRelay: 0,
    truncatedCollections: [],
  };
  const startedAt = Date.now();

  await scanCollectionForEmailContacts({
    db,
    collectionName: 'users',
    scannedKey: 'scannedUsers',
    stats,
    worker: (doc) => backfillUserEmailContact(db, doc),
  });
  await scanCollectionForEmailContacts({
    db,
    collectionName: 'auth_links',
    scannedKey: 'scannedAuthLinks',
    stats,
    worker: (doc) => backfillAuthLinkEmailContact(db, doc),
  });
  await scanCollectionForEmailContacts({
    db,
    collectionName: 'web_premium_orders',
    scannedKey: 'scannedWebOrders',
    stats,
    worker: (doc) => backfillWebOrderEmailContact(db, doc),
  });
  await scanCollectionForEmailContacts({
    db,
    collectionName: 'website_contact_inbox',
    scannedKey: 'scannedWebsiteInbox',
    stats,
    worker: (doc) => backfillWebsiteInboxEmailContact(db, doc),
  });

  const finishedAtIso = new Date().toISOString();
  await db.collection('admin_log').doc().set({
    action: 'email_contacts_backfill',
    createdBy: cleanString(request.auth.token.email, 160) || 'admin',
    createdByUid: request.auth.uid || null,
    stats,
    durationMs: Date.now() - startedAt,
    ts: finishedAtIso,
  });

  return { ok: true, durationMs: Date.now() - startedAt, ...stats };
});

export const adminEmailBroadcast = onCall({
  region: REGION,
  enforceAppCheck: ENFORCE_APP_CHECK,
  timeoutSeconds: 540,
  memory: '512MiB',
  // зачем: рассылка строит ссылку отписки, значит подписывающий секрет обязан
  // быть в рантайме — иначе unsubscribeUrlFor упадёт на пустом значении.
  secrets: [RESEND_API_KEY, ...EMAIL_UNSUBSCRIBE_SECRETS],
}, async (request) => {
  if (!request.auth?.token?.admin) {
    throw new HttpsError('permission-denied', 'admin_only');
  }
  const payload = normalizeBroadcastPayload(request.data);
  const db = admin.firestore();
  const campaignRef = db.collection('email_campaigns').doc();
  const adminEmail = cleanString(request.auth.token.email, 160) || 'admin';
  const nowIso = new Date().toISOString();

  await campaignRef.set({
    status: 'processing',
    subject: payload.subject,
    textPreview: payload.text.slice(0, 500),
    textLength: payload.text.length,
    audienceLabel: payload.audienceLabel,
    requestedCount: payload.emails.length,
    recipientSample: payload.emails.slice(0, 50),
    createdBy: adminEmail,
    createdByUid: request.auth.uid || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdAtIso: nowIso,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAtIso: nowIso,
  });

  try {
    const summary = await sendBroadcastEmails(payload, campaignRef.id);
    const status = summary.sentCount > 0 ? 'done' : 'error';
    await campaignRef.set({
      status,
      sentCount: summary.sentCount,
      failedCount: summary.failedCount,
      suppressedCount: summary.suppressedCount,
      errors: summary.errors,
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      finishedAtIso: new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
      error: status === 'error' ? (summary.errors[0] || 'send_failed') : admin.firestore.FieldValue.delete(),
    }, { merge: true });
    await db.collection('admin_log').doc().set({
      action: 'email_campaign_send',
      collection: 'email_campaigns',
      docId: campaignRef.id,
      adminEmail,
      audienceLabel: payload.audienceLabel,
      requestedCount: payload.emails.length,
      sentCount: summary.sentCount,
      failedCount: summary.failedCount,
      suppressedCount: summary.suppressedCount,
      ts: new Date().toISOString(),
    });
    return { ok: true, campaignId: campaignRef.id, ...summary };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await campaignRef.set({
      status: 'error',
      error: message.slice(0, 500),
      finishedAt: admin.firestore.FieldValue.serverTimestamp(),
      finishedAtIso: new Date().toISOString(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAtIso: new Date().toISOString(),
    }, { merge: true });
    logger.error('adminEmailBroadcast failed', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'email_broadcast_failed');
  }
});

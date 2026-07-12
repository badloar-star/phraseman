import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';

const REGION = 'us-central1';
const LANGUAGES = ['Ru', 'Uk', 'Es', 'PtBr', 'Vi', 'Id', 'Tr', 'Pl'] as const;

type LanguageSuffix = (typeof LANGUAGES)[number];
type RecordValue = Record<string, unknown>;

export interface NormalizedAppMessageCreateInput {
  readonly document: Readonly<RecordValue>;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly requestFingerprint: string;
}

export interface NormalizedAppMessageToggleInput {
  readonly messageId: string;
  readonly active: boolean;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly requestFingerprint: string;
}

function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function requiredCommandFields(data: RecordValue): { reason: string; idempotencyKey: string; requestId: string } {
  const reason = text(data.reason, 500);
  const idempotencyKey = text(data.idempotencyKey, 120);
  const requestId = text(data.requestId, 160);
  if (!reason || !idempotencyKey || !requestId || !/^[A-Za-z0-9._:-]+$/.test(idempotencyKey)) {
    throw new HttpsError('invalid-argument', 'reason, idempotencyKey and requestId are required');
  }
  return { reason, idempotencyKey, requestId };
}

function languageContent(translations: RecordValue, suffix: LanguageSuffix, fallback: RecordValue): RecordValue {
  const key = suffix === 'PtBr' ? 'ptBr' : suffix.toLowerCase();
  const value = isRecord(translations[key]) ? translations[key] : {};
  return {
    title: text(value.title, 160) || text(fallback.title, 160),
    body: text(value.body, 2000) || text(fallback.body, 2000),
    pollQuestion: text(value.pollQuestion, 300) || text(fallback.pollQuestion, 300),
    pollOptions: Array.isArray(value.pollOptions) ? value.pollOptions : fallback.pollOptions,
  };
}

export function normalizeAppMessageCreateInput(data: unknown, actorEmail: string, nowMs = Date.now()): NormalizedAppMessageCreateInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request object required');
  const command = requiredCommandFields(data);
  const translations = isRecord(data.translations) ? data.translations : {};
  const ru = isRecord(translations.ru) ? translations.ru : {};
  const titleRu = text(ru.title, 160);
  const messageRu = text(ru.body, 2000);
  if (!titleRu || !messageRu) throw new HttpsError('invalid-argument', 'RU title and body are required');
  const kind = data.kind === 'poll' ? 'poll' : 'message';
  const audience = ['all', 'free', 'premium'].includes(String(data.audience)) ? String(data.audience) : 'all';
  const priority = Math.max(0, Math.min(99, Math.floor(Number(data.priority ?? 0))));
  const ttlDays = Math.max(1, Math.min(30, Math.floor(Number(data.ttlDays ?? 30))));
  if (!Number.isFinite(priority) || !Number.isFinite(ttlDays)) throw new HttpsError('invalid-argument', 'priority or ttlDays invalid');
  const active = data.active === true;
  const nowIso = new Date(nowMs).toISOString();
  const expiresAtMs = nowMs + ttlDays * 24 * 60 * 60 * 1000;
  const document: RecordValue = {
    kind,
    active,
    audience,
    priority,
    ttlDays,
    createdAt: nowIso,
    createdAtMs: nowMs,
    updatedAt: nowIso,
    updatedAtMs: nowMs,
    expiresAt: new Date(expiresAtMs).toISOString(),
    expiresAtMs,
    createdBy: actorEmail,
    updatedBy: actorEmail,
    readCount: 0,
    likeCount: 0,
    dislikeCount: 0,
  };

  for (const suffix of LANGUAGES) {
    const content = languageContent(translations, suffix, ru);
    document[`title${suffix}`] = content.title;
    document[`message${suffix}`] = content.body;
  }

  if (kind === 'poll') {
    const questionRu = text(ru.pollQuestion, 300);
    const ruOptions = Array.isArray(ru.pollOptions) ? ru.pollOptions.map((item) => text(item, 160)).filter(Boolean).slice(0, 6) : [];
    if (!questionRu || ruOptions.length < 2) throw new HttpsError('invalid-argument', 'Poll requires a RU question and 2-6 options');
    const options = ruOptions.map((optionRu, index) => {
      const option: RecordValue = { id: `option_${index + 1}`, textRu: optionRu };
      for (const suffix of LANGUAGES.filter((item) => item !== 'Ru')) {
        const content = languageContent(translations, suffix, ru);
        const translated = Array.isArray(content.pollOptions) ? text(content.pollOptions[index], 160) : '';
        option[`text${suffix}`] = translated || optionRu;
      }
      return option;
    });
    const poll: RecordValue = { questionRu, options, optionIds: options.map((option) => option.id), counts: {}, voteCount: 0 };
    for (const suffix of LANGUAGES.filter((item) => item !== 'Ru')) {
      poll[`question${suffix}`] = languageContent(translations, suffix, ru).pollQuestion || questionRu;
    }
    document.poll = poll;
    document.pollCounts = Object.fromEntries(options.map((option) => [String(option.id), 0]));
    document.pollVoteCount = 0;
    document.pollCountUpdatedAtMs = nowMs;
  }
  const requestFingerprint = JSON.stringify({ kind, active, audience, priority, ttlDays, translations });
  return Object.freeze({ document: Object.freeze(document), requestFingerprint, ...command });
}

export function normalizeAppMessageToggleInput(data: unknown): NormalizedAppMessageToggleInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request object required');
  const command = requiredCommandFields(data);
  const messageId = text(data.messageId, 160);
  if (!/^[A-Za-z0-9_-]{3,160}$/.test(messageId) || typeof data.active !== 'boolean') {
    throw new HttpsError('invalid-argument', 'valid messageId and active boolean required');
  }
  const requestFingerprint = JSON.stringify({ messageId, active: data.active });
  return Object.freeze({ messageId, active: data.active, requestFingerprint, ...command });
}

function roleFor(token: RecordValue): AdminRole {
  const role = token.adminRole;
  if (!hasAdminRole(role)) throw new HttpsError('permission-denied', 'adminRole claim required');
  return role;
}

function assertPermission(request: { auth?: { token?: RecordValue } }, permission: 'campaigns.read' | 'campaigns.write'): AdminRole {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = roleFor(request.auth.token);
  if (!hasPermission(role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  return role;
}

export const adminListAppMessages = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    assertPermission(request, 'campaigns.read');
    const limit = Math.max(1, Math.min(120, Math.floor(Number(request.data?.limit ?? 120))));
    const snap = await admin.firestore().collection('app_messages').orderBy('createdAtMs', 'desc').limit(limit).get();
    return { ok: true, items: snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) };
  },
);

export const adminCreateAppMessage = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth!.uid;
    const actorEmail = text(request.auth!.token.email, 320) || actorUid;
    const input = normalizeAppMessageCreateInput(request.data, actorEmail);
    const db = admin.firestore();
    const messageRef = db.collection('app_messages').doc();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = input.requestFingerprint;
    return db.runTransaction(async (tx) => {
      const operation = await tx.get(operationRef);
      if (operation.exists) {
        const previous = operation.data() ?? {};
        if (previous.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotencyKey reused for another payload');
        return { ok: true, messageId: String(previous.entityId ?? ''), auditId: String(previous.auditId ?? ''), replayed: true };
      }
      const audit = createAuditRecord({
        action: 'app_message.create', actorUid, role,
        entity: { collection: 'app_messages', id: messageRef.id }, reason: input.reason,
        before: {}, after: input.document, requestId: input.requestId,
        rollbackReference: messageRef.id, timestamp: new Date().toISOString(),
      });
      tx.create(messageRef, input.document);
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, { operationId: input.idempotencyKey, requestFingerprint: fingerprint, entityId: messageRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, messageId: messageRef.id, auditId: auditRef.id, replayed: false };
    });
  },
);

export const adminSetAppMessageActive = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth!.uid;
    const actorEmail = text(request.auth!.token.email, 320) || actorUid;
    const input = normalizeAppMessageToggleInput(request.data);
    const db = admin.firestore();
    const messageRef = db.collection('app_messages').doc(input.messageId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const fingerprint = input.requestFingerprint;
    return db.runTransaction(async (tx) => {
      const [message, operation] = await Promise.all([tx.get(messageRef), tx.get(operationRef)]);
      if (operation.exists) {
        const previous = operation.data() ?? {};
        if (previous.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotencyKey reused for another payload');
        return { ok: true, messageId: input.messageId, auditId: String(previous.auditId ?? ''), replayed: true };
      }
      if (!message.exists) throw new HttpsError('not-found', 'app_message_not_found');
      const before = message.data() ?? {};
      const after = { ...before, active: input.active, updatedAt: new Date().toISOString(), updatedAtMs: Date.now(), updatedBy: actorEmail };
      const audit = createAuditRecord({
        action: 'app_message.toggle', actorUid, role,
        entity: { collection: 'app_messages', id: input.messageId }, reason: input.reason,
        before, after, requestId: input.requestId, rollbackReference: input.messageId, timestamp: new Date().toISOString(),
      });
      tx.set(messageRef, after);
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, { operationId: input.idempotencyKey, requestFingerprint: fingerprint, entityId: input.messageId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, messageId: input.messageId, auditId: auditRef.id, replayed: false };
    });
  },
);

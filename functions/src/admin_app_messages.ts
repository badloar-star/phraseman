import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { ENFORCE_APP_CHECK } from './callable_options';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { clearAppMessagePollEngagement, deleteAppMessageWithEngagement } from './app_messages';

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

export interface NormalizedAppMessageUpdateInput {
  readonly messageId: string;
  readonly expectedUpdatedAtMs: number;
  readonly resetPollEngagement: boolean;
  readonly patch: Readonly<RecordValue>;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly requestFingerprint: string;
}

export interface NormalizedAppMessageDeleteInput {
  readonly messageId: string;
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly requestFingerprint: string;
}

export interface NormalizedAppMessageCleanupInput {
  readonly messageIds: readonly string[];
  readonly reason: string;
  readonly idempotencyKey: string;
  readonly requestId: string;
  readonly requestFingerprint: string;
}

export type PersonalAppMessageDeliveryMode = 'inbox' | 'next_login_modal';

export interface NormalizedPersonalAppMessageInput {
  readonly uid: string;
  readonly deliveryMode: PersonalAppMessageDeliveryMode;
  readonly document: Readonly<RecordValue>;
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
  const deliverySurface = data.deliverySurface === 'settings' ? 'settings' : 'inbox';
  const settingsSlot = deliverySurface === 'settings' && (data.settingsSlot === 'top' || data.settingsSlot === 'bottom')
    ? data.settingsSlot
    : null;
  if (deliverySurface === 'settings' && !settingsSlot) throw new HttpsError('invalid-argument', 'Settings slot must be top or bottom');
  const controlPercent = Math.max(0, Math.min(50, Math.floor(Number(data.controlPercent ?? 0))));
  if (!Number.isFinite(controlPercent)) throw new HttpsError('invalid-argument', 'controlPercent invalid');
  const priority = Math.max(0, Math.min(99, Math.floor(Number(data.priority ?? 0))));
  const ttlDays = Math.max(1, Math.min(30, Math.floor(Number(data.ttlDays ?? 30))));
  if (!Number.isFinite(priority) || !Number.isFinite(ttlDays)) throw new HttpsError('invalid-argument', 'priority or ttlDays invalid');
  const active = data.active === true;
  const nowIso = new Date(nowMs).toISOString();
  const expiresAtMs = nowMs + ttlDays * 24 * 60 * 60 * 1000;
  const document: RecordValue = {
    kind,
    active,
    status: active ? 'live' : 'draft',
    publishedAtMs: active ? nowMs : 0,
    audience,
    deliverySurface,
    settingsSlot,
    voteMode: deliverySurface === 'settings' ? 'fixed' : 'changeable',
    controlPercent,
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
    const rawRuOptions = Array.isArray(ru.pollOptions) ? ru.pollOptions.map((item) => text(item, 160)).filter(Boolean) : [];
    const maxPollOptions = deliverySurface === 'settings' ? 4 : 6;
    if (!questionRu || rawRuOptions.length < 2 || rawRuOptions.length > maxPollOptions) {
      throw new HttpsError('invalid-argument', `Poll requires a RU question and 2-${maxPollOptions} options`);
    }
    const ruOptions = rawRuOptions.slice(0, maxPollOptions);
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
  const requestFingerprint = JSON.stringify({ kind, active, audience, deliverySurface, settingsSlot, controlPercent, priority, ttlDays, translations });
  return Object.freeze({ document: Object.freeze(document), requestFingerprint, ...command });
}

export function normalizePersonalAppMessageInput(
  data: unknown,
  actorEmail: string,
  nowMs = Date.now(),
): NormalizedPersonalAppMessageInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request object required');
  if ('recipientUid' in data || 'firebaseUid' in data || 'authUid' in data) {
    throw new HttpsError('invalid-argument', 'uid is the only supported recipient identity');
  }
  const command = requiredCommandFields(data);
  const uid = text(data.uid, 160);
  const title = text(data.title, 160);
  const body = text(data.body, 2000);
  const deliveryMode = data.deliveryMode;
  if (!/^[A-Za-z0-9._-]{2,160}$/.test(uid)) throw new HttpsError('invalid-argument', 'valid stable uid required');
  if (!title || !body) throw new HttpsError('invalid-argument', 'title and body are required');
  if (deliveryMode !== 'inbox' && deliveryMode !== 'next_login_modal') {
    throw new HttpsError('invalid-argument', 'deliveryMode must be inbox or next_login_modal');
  }
  const createdAt = new Date(nowMs).toISOString();
  const document: RecordValue = {
    kind: 'personal_admin_message',
    recipientUid: uid,
    deliveryMode,
    title,
    body,
    active: true,
    createdAt,
    createdAtMs: nowMs,
    updatedAt: createdAt,
    updatedAtMs: nowMs,
    createdBy: actorEmail,
    nextLoginModalPending: deliveryMode === 'next_login_modal',
  };
  const requestFingerprint = JSON.stringify({ uid, deliveryMode, title, body });
  return Object.freeze({ uid, deliveryMode, document: Object.freeze(document), requestFingerprint, ...command });
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

function validMessageId(value: unknown): string {
  const messageId = text(value, 160);
  if (!/^[A-Za-z0-9_-]{3,160}$/.test(messageId)) throw new HttpsError('invalid-argument', 'valid messageId required');
  return messageId;
}

function contentPatchFromDocument(document: Readonly<RecordValue>): RecordValue {
  const patch: RecordValue = {
    kind: document.kind,
    audience: document.audience,
    deliverySurface: document.deliverySurface,
    settingsSlot: document.settingsSlot,
    voteMode: document.voteMode,
    controlPercent: document.controlPercent,
    priority: document.priority,
  };
  for (const suffix of LANGUAGES) {
    patch[`title${suffix}`] = document[`title${suffix}`];
    patch[`message${suffix}`] = document[`message${suffix}`];
  }
  patch.poll = document.kind === 'poll' ? document.poll : null;
  return patch;
}

export function normalizeAppMessageUpdateInput(data: unknown): NormalizedAppMessageUpdateInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request object required');
  const command = requiredCommandFields(data);
  const messageId = validMessageId(data.messageId);
  const expectedUpdatedAtMs = Math.floor(Number(data.expectedUpdatedAtMs ?? 0));
  if (!Number.isFinite(expectedUpdatedAtMs) || expectedUpdatedAtMs < 0) throw new HttpsError('invalid-argument', 'expectedUpdatedAtMs invalid');
  const normalized = normalizeAppMessageCreateInput({ ...data, active: false, ttlDays: 30 }, '', 0);
  const patch = contentPatchFromDocument(normalized.document);
  const poll = plainPoll(patch.poll);
  const preservedOptionIds = Array.isArray(data.pollOptionIds)
    ? data.pollOptionIds.map((id) => text(id, 40)).filter((id) => /^[A-Za-z0-9_-]{1,40}$/.test(id))
    : [];
  if (poll && Array.isArray(poll.options) && preservedOptionIds.length === poll.options.length) {
    poll.options = poll.options.map((value, index) => ({ ...(isRecord(value) ? value : {}), id: preservedOptionIds[index] }));
    poll.optionIds = preservedOptionIds;
    patch.poll = poll;
  }
  const resetPollEngagement = data.resetPollEngagement === true;
  const requestFingerprint = JSON.stringify({ messageId, expectedUpdatedAtMs, resetPollEngagement, patch });
  return Object.freeze({ messageId, expectedUpdatedAtMs, resetPollEngagement, patch: Object.freeze(patch), requestFingerprint, ...command });
}

export function normalizeAppMessageDeleteInput(data: unknown): NormalizedAppMessageDeleteInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request object required');
  const command = requiredCommandFields(data);
  const messageId = validMessageId(data.messageId);
  const requestFingerprint = JSON.stringify({ messageId });
  return Object.freeze({ messageId, requestFingerprint, ...command });
}

export function normalizeAppMessageCleanupInput(data: unknown): NormalizedAppMessageCleanupInput {
  if (!isRecord(data)) throw new HttpsError('invalid-argument', 'request object required');
  const command = requiredCommandFields(data);
  const messageIds = Array.isArray(data.messageIds)
    ? [...new Set(data.messageIds.map(validMessageId))].slice(0, 120)
    : [];
  if (!messageIds.length) throw new HttpsError('invalid-argument', 'messageIds required');
  const requestFingerprint = JSON.stringify({ messageIds });
  return Object.freeze({ messageIds: Object.freeze(messageIds), requestFingerprint, ...command });
}

export function appMessagePollStructureChanged(previous: unknown, next: unknown): boolean {
  if (!previous && !next) return false;
  if (!isRecord(previous) || !isRecord(next)) return true;
  const previousOptions = Array.isArray(previous.options) ? previous.options : [];
  const nextOptions = Array.isArray(next.options) ? next.options : [];
  if (previousOptions.length !== nextOptions.length) return true;
  return previousOptions.some((value, index) => {
    const before = isRecord(value) ? value : {};
    const after = isRecord(nextOptions[index]) ? nextOptions[index] : {};
    return text(before.id, 40) !== text(after.id, 40) || text(before.textRu, 160) !== text(after.textRu, 160);
  });
}

function roleFor(token: RecordValue): AdminRole {
  const role = token.adminRole;
  if (!hasAdminRole(role)) throw new HttpsError('permission-denied', 'adminRole claim required');
  return role;
}

function assertPermission(request: { auth?: { token?: RecordValue } }, permission: 'campaigns.read' | 'campaigns.write' | 'users.message.write'): AdminRole {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = roleFor(request.auth.token);
  if (!hasPermission(role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  return role;
}

export const adminSendPersonalAppMessage = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = assertPermission(request, 'users.message.write');
    const actorUid = request.auth!.uid;
    const actorEmail = text(request.auth!.token.email, 320) || actorUid;
    const input = normalizePersonalAppMessageInput(request.data, actorEmail);
    const db = admin.firestore();
    const userRef = db.collection('users').doc(input.uid);
    const messageRef = userRef.collection('user_messages').doc();
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();

    return db.runTransaction(async (tx) => {
      const [recipient, operation] = await Promise.all([tx.get(userRef), tx.get(operationRef)]);
      if (operation.exists) {
        const previous = operation.data() ?? {};
        assertOperationFingerprint(previous, input.requestFingerprint);
        assertOperationActor(previous, actorUid);
        return {
          ok: true,
          messageId: String(previous.entityId ?? ''),
          auditId: String(previous.auditId ?? ''),
          replayed: true,
        };
      }
      if (!recipient.exists) throw new HttpsError('not-found', 'personal_message_recipient_not_found');
      const recipientData = recipient.data() ?? {};
      if (recipientData.accountDeletedAtMs || recipientData.deleted === true) {
        throw new HttpsError('failed-precondition', 'personal_message_recipient_unavailable');
      }
      const audit = createAuditRecord({
        action: 'app_message.personal_send', actorUid, role,
        entity: { collection: `users/${input.uid}/user_messages`, id: messageRef.id },
        reason: input.reason, before: {}, after: input.document, requestId: input.requestId,
        rollbackReference: messageRef.id, timestamp: new Date().toISOString(),
      });
      tx.create(messageRef, input.document);
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey, recipientUid: input.uid });
      tx.create(operationRef, {
        operationId: input.idempotencyKey,
        requestFingerprint: input.requestFingerprint,
        actorUid,
        entityId: messageRef.id,
        recipientUid: input.uid,
        auditId: auditRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return { ok: true, messageId: messageRef.id, auditId: auditRef.id, replayed: false };
    });
  },
);

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
      const settingsQuery = input.document.active === true && input.document.deliverySurface === 'settings'
        ? db.collection('app_messages')
          .where('deliverySurface', '==', 'settings')
          .where('settingsSlot', '==', input.document.settingsSlot)
          .where('active', '==', true)
        : null;
      const [operation, activeInSlot] = await Promise.all([
        tx.get(operationRef),
        settingsQuery ? tx.get(settingsQuery) : Promise.resolve(null),
      ]);
      if (operation.exists) {
        const previous = operation.data() ?? {};
        if (previous.requestFingerprint !== fingerprint) throw new HttpsError('already-exists', 'idempotencyKey reused for another payload');
        assertOperationActor(previous, actorUid);
        return { ok: true, messageId: String(previous.entityId ?? ''), auditId: String(previous.auditId ?? ''), replayed: true };
      }
      const audit = createAuditRecord({
        action: 'app_message.create', actorUid, role,
        entity: { collection: 'app_messages', id: messageRef.id }, reason: input.reason,
        before: {}, after: input.document, requestId: input.requestId,
        rollbackReference: messageRef.id, timestamp: new Date().toISOString(),
      });
      if (activeInSlot) {
        const archivedAtMs = Date.now();
        activeInSlot.docs.forEach((document) => tx.set(document.ref, {
          active: false,
          status: 'archived',
          archivedAtMs,
          updatedAtMs: archivedAtMs,
          updatedBy: actorEmail,
        }, { merge: true }));
      }
      tx.create(messageRef, input.document);
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, { operationId: input.idempotencyKey, requestFingerprint: fingerprint, actorUid, entityId: messageRef.id, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
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
        assertOperationActor(previous, actorUid);
        return { ok: true, messageId: input.messageId, auditId: String(previous.auditId ?? ''), replayed: true };
      }
      if (!message.exists) throw new HttpsError('not-found', 'app_message_not_found');
      const before = message.data() ?? {};
      assertGenericAppMessage(before);
      if (before.adminOperationLock) throw new HttpsError('aborted', 'app_message_operation_in_progress');
      if (input.active && before.deliverySurface === 'settings' && (before.settingsSlot === 'top' || before.settingsSlot === 'bottom')) {
        const activeInSlot = await tx.get(
          db.collection('app_messages')
            .where('deliverySurface', '==', 'settings')
            .where('settingsSlot', '==', before.settingsSlot)
            .where('active', '==', true),
        );
        const archivedAtMs = Date.now();
        activeInSlot.docs
          .filter((document) => document.id !== input.messageId)
          .forEach((document) => tx.set(document.ref, {
            active: false,
            status: 'archived',
            archivedAtMs,
            updatedAtMs: archivedAtMs,
            updatedBy: actorEmail,
          }, { merge: true }));
      }
      const after = {
        ...before,
        active: input.active,
        status: input.active ? 'live' : 'inactive',
        publishedAtMs: input.active ? (Number(before.publishedAtMs || 0) || Date.now()) : Number(before.publishedAtMs || 0),
        updatedAt: new Date().toISOString(),
        updatedAtMs: Date.now(),
        updatedBy: actorEmail,
      };
      const audit = createAuditRecord({
        action: 'app_message.toggle', actorUid, role,
        entity: { collection: 'app_messages', id: input.messageId }, reason: input.reason,
        before, after, requestId: input.requestId, rollbackReference: input.messageId, timestamp: new Date().toISOString(),
      });
      tx.set(messageRef, after);
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.create(operationRef, { operationId: input.idempotencyKey, requestFingerprint: fingerprint, actorUid, entityId: input.messageId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, messageId: input.messageId, auditId: auditRef.id, replayed: false };
    });
  },
);

function assertOperationFingerprint(operation: RecordValue, fingerprint: string): void {
  if (operation.requestFingerprint !== fingerprint) {
    throw new HttpsError('already-exists', 'idempotencyKey reused for another payload');
  }
}

function assertOperationActor(operation: RecordValue, actorUid: string): void {
  if (operation.actorUid && operation.actorUid !== actorUid) throw new HttpsError('permission-denied', 'admin operation belongs to another actor');
}

function assertGenericAppMessage(data: RecordValue): void {
  const kind = text(data.kind, 40) || 'message';
  if (kind !== 'message' && kind !== 'poll') throw new HttpsError('failed-precondition', `app_message_managed_by_special_workflow:${kind}`);
}

function plainPoll(value: unknown): RecordValue | null {
  return isRecord(value) ? { ...value } : null;
}

export const adminUpdateAppMessage = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth!.uid;
    const actorEmail = text(request.auth!.token.email, 320) || actorUid;
    const input = normalizeAppMessageUpdateInput(request.data);
    const db = admin.firestore();
    const messageRef = db.collection('app_messages').doc(input.messageId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const claimed: RecordValue = await db.runTransaction(async (tx): Promise<RecordValue> => {
      const [message, operation] = await Promise.all([tx.get(messageRef), tx.get(operationRef)]);
      if (operation.exists) {
        const previousOperation = operation.data() ?? {};
        assertOperationFingerprint(previousOperation, input.requestFingerprint);
        assertOperationActor(previousOperation, actorUid);
        return previousOperation;
      }
      if (!message.exists) throw new HttpsError('not-found', 'app_message_not_found');
      const before = message.data() ?? {};
      assertGenericAppMessage(before);
      if (before.active !== false) throw new HttpsError('failed-precondition', 'app_message_must_be_inactive_before_edit');
      if (before.adminOperationLock) throw new HttpsError('aborted', 'app_message_operation_in_progress');
      if (input.expectedUpdatedAtMs > 0 && Number(before.updatedAtMs || 0) !== input.expectedUpdatedAtMs) {
        throw new HttpsError('aborted', 'app_message_changed_after_preview');
      }
      const structureChanged = appMessagePollStructureChanged(before.poll, input.patch.poll);
      if (before.deliverySurface === 'settings' && before.kind === 'poll' && structureChanged) {
        throw new HttpsError('failed-precondition', 'settings_poll_requires_new_campaign');
      }
      if (structureChanged && !input.resetPollEngagement) throw new HttpsError('failed-precondition', 'poll_structure_change_requires_reset');
      tx.set(messageRef, { active: false, adminOperationLock: input.idempotencyKey }, { merge: true });
      const pending = { operationId: input.idempotencyKey, requestFingerprint: input.requestFingerprint, actorUid, entityId: input.messageId, status: 'pending', before, structureChanged, createdAt: admin.firestore.FieldValue.serverTimestamp() };
      tx.create(operationRef, pending);
      return pending;
    });
    if (claimed.status === 'completed') return { ok: true, messageId: input.messageId, auditId: String(claimed.auditId ?? ''), replayed: true };
    const structureChanged = claimed.structureChanged === true;
    if (structureChanged) await clearAppMessagePollEngagement(db, messageRef);

    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
      const [message, operation] = await Promise.all([tx.get(messageRef), tx.get(operationRef)]);
      if (!operation.exists) throw new HttpsError('aborted', 'app_message_operation_missing');
      const currentOperation = operation.data() ?? claimed;
      assertOperationFingerprint(currentOperation, input.requestFingerprint);
      assertOperationActor(currentOperation, actorUid);
      if (currentOperation.status === 'completed') return { ok: true, messageId: input.messageId, auditId: String(currentOperation.auditId ?? ''), replayed: true };
      if (!message.exists) throw new HttpsError('not-found', 'app_message_not_found');
      const before = message.data() ?? {};
      if (before.active !== false) throw new HttpsError('failed-precondition', 'app_message_must_be_inactive_before_edit');
      if (before.adminOperationLock !== input.idempotencyKey) throw new HttpsError('aborted', 'app_message_operation_lock_lost');
      if (input.expectedUpdatedAtMs > 0 && Number(before.updatedAtMs || 0) !== input.expectedUpdatedAtMs) {
        throw new HttpsError('aborted', 'app_message_changed_after_preview');
      }
      const nowMs = Date.now();
      const after: RecordValue = {
        ...before,
        ...input.patch,
        active: false,
        updatedAt: new Date(nowMs).toISOString(),
        updatedAtMs: nowMs,
        updatedBy: actorEmail,
      };
      delete after.adminOperationLock;
      const nextPoll = plainPoll(input.patch.poll);
      if (!nextPoll) {
        delete after.poll;
        delete after.pollCounts;
        delete after.pollVoteCount;
        delete after.pollCountUpdatedAtMs;
        if (structureChanged) after.pollResetAtMs = nowMs;
      } else if (structureChanged) {
        const optionIds = Array.isArray(nextPoll.optionIds) ? nextPoll.optionIds.map((id) => text(id, 40)).filter(Boolean) : [];
        nextPoll.counts = Object.fromEntries(optionIds.map((id) => [id, 0]));
        nextPoll.voteCount = 0;
        after.poll = nextPoll;
        after.pollCounts = Object.fromEntries(optionIds.map((id) => [id, 0]));
        after.pollVoteCount = 0;
        after.pollCountUpdatedAtMs = nowMs;
        after.pollResetAtMs = nowMs;
      } else {
        const previousPoll = plainPoll(before.poll) ?? {};
        nextPoll.counts = previousPoll.counts ?? nextPoll.counts ?? {};
        nextPoll.voteCount = Number(previousPoll.voteCount ?? before.pollVoteCount ?? 0);
        after.poll = nextPoll;
      }
      const audit = createAuditRecord({
        action: 'app_message.update', actorUid, role,
        entity: { collection: 'app_messages', id: input.messageId }, reason: input.reason,
        before: isRecord(currentOperation.before) ? currentOperation.before : before, after, requestId: input.requestId,
        rollbackReference: input.messageId, timestamp: new Date(nowMs).toISOString(),
      });
      tx.set(messageRef, after);
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey, pollEngagementReset: structureChanged });
      tx.set(operationRef, { ...currentOperation, auditId: auditRef.id, status: 'completed', completedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, messageId: input.messageId, auditId: auditRef.id, replayed: false, pollEngagementReset: structureChanged };
    });
  },
);

export const adminDeleteAppMessage = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth!.uid;
    const input = normalizeAppMessageDeleteInput(request.data);
    const db = admin.firestore();
    const messageRef = db.collection('app_messages').doc(input.messageId);
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const claimed: RecordValue = await db.runTransaction(async (tx): Promise<RecordValue> => {
      const [message, operation] = await Promise.all([tx.get(messageRef), tx.get(operationRef)]);
      if (operation.exists) {
        const previousOperation = operation.data() ?? {};
        assertOperationFingerprint(previousOperation, input.requestFingerprint);
        assertOperationActor(previousOperation, actorUid);
        return previousOperation;
      }
      if (!message.exists) throw new HttpsError('not-found', 'app_message_not_found');
      const before = message.data() ?? {};
      assertGenericAppMessage(before);
      if (before.adminOperationLock) throw new HttpsError('aborted', 'app_message_operation_in_progress');
      tx.set(messageRef, { active: false, adminOperationLock: input.idempotencyKey, updatedAtMs: Date.now() }, { merge: true });
      const pending = { operationId: input.idempotencyKey, requestFingerprint: input.requestFingerprint, actorUid, entityId: input.messageId, status: 'pending', before, createdAt: admin.firestore.FieldValue.serverTimestamp() };
      tx.create(operationRef, pending);
      return pending;
    });
    if (claimed.status === 'completed') return { ok: true, messageId: input.messageId, auditId: String(claimed.auditId ?? ''), replayed: true };
    await deleteAppMessageWithEngagement(db, messageRef);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
      const operation = await tx.get(operationRef);
      const current: RecordValue = operation.data() ?? claimed;
      assertOperationFingerprint(current, input.requestFingerprint);
      assertOperationActor(current, actorUid);
      if (current.status === 'completed') return { ok: true, messageId: input.messageId, auditId: String(current.auditId ?? ''), replayed: true };
      const audit = createAuditRecord({
        action: 'app_message.delete', actorUid, role,
        entity: { collection: 'app_messages', id: input.messageId }, reason: input.reason,
        before: isRecord(current.before) ? current.before : {}, after: { deleted: true }, requestId: input.requestId,
        rollbackReference: input.messageId, timestamp: new Date().toISOString(),
      });
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.set(operationRef, { ...current, status: 'completed', auditId: auditRef.id, completedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, messageId: input.messageId, auditId: auditRef.id, replayed: false };
    });
  },
);

export const adminCleanupExpiredAppMessages = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK },
  async (request) => {
    const role = assertPermission(request, 'campaigns.write');
    const actorUid = request.auth!.uid;
    const input = normalizeAppMessageCleanupInput(request.data);
    const db = admin.firestore();
    const refs = input.messageIds.map((messageId) => db.collection('app_messages').doc(messageId));
    const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
    const claimed: RecordValue = await db.runTransaction(async (tx): Promise<RecordValue> => {
      const operation = await tx.get(operationRef);
      if (operation.exists) {
        const previousOperation = operation.data() ?? {};
        assertOperationFingerprint(previousOperation, input.requestFingerprint);
        assertOperationActor(previousOperation, actorUid);
        return previousOperation;
      }
      const messages = await Promise.all(refs.map((ref) => tx.get(ref)));
      const nowMs = Date.now();
      const beforeItems = messages.map((message, index) => {
        if (!message.exists) throw new HttpsError('not-found', `app_message_not_found:${input.messageIds[index]}`);
        const data = message.data() ?? {};
        if (Number(data.expiresAtMs || 0) > nowMs) throw new HttpsError('failed-precondition', `app_message_not_expired:${input.messageIds[index]}`);
        if (data.adminOperationLock) throw new HttpsError('aborted', `app_message_operation_in_progress:${input.messageIds[index]}`);
        tx.set(refs[index], { active: false, adminOperationLock: input.idempotencyKey, updatedAtMs: nowMs }, { merge: true });
        return { id: input.messageIds[index], titleRu: text(data.titleRu, 160), expiresAtMs: Number(data.expiresAtMs || 0), kind: text(data.kind, 40) };
      });
      const pending = { operationId: input.idempotencyKey, requestFingerprint: input.requestFingerprint, actorUid, entityId: 'expired_app_messages', status: 'pending', beforeItems, createdAt: admin.firestore.FieldValue.serverTimestamp() };
      tx.create(operationRef, pending);
      return pending;
    });
    if (claimed.status === 'completed') return { ok: true, deletedIds: input.messageIds, auditId: String(claimed.auditId ?? ''), replayed: true };
    for (const ref of refs) await deleteAppMessageWithEngagement(db, ref);
    const auditRef = db.collection('admin_log').doc();
    return db.runTransaction(async (tx) => {
      const operation = await tx.get(operationRef);
      const current: RecordValue = operation.data() ?? claimed;
      assertOperationFingerprint(current, input.requestFingerprint);
      assertOperationActor(current, actorUid);
      if (current.status === 'completed') return { ok: true, deletedIds: input.messageIds, auditId: String(current.auditId ?? ''), replayed: true };
      const audit = createAuditRecord({
        action: 'app_message.cleanup_expired', actorUid, role,
        entity: { collection: 'app_messages', id: 'expired_app_messages' }, reason: input.reason,
        before: { items: Array.isArray(current.beforeItems) ? current.beforeItems : [] }, after: { deletedIds: input.messageIds }, requestId: input.requestId,
        rollbackReference: input.idempotencyKey, timestamp: new Date().toISOString(),
      });
      tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
      tx.set(operationRef, { ...current, status: 'completed', auditId: auditRef.id, completedAt: admin.firestore.FieldValue.serverTimestamp() });
      return { ok: true, deletedIds: input.messageIds, auditId: auditRef.id, replayed: false };
    });
  },
);

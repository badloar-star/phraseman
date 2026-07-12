import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';
import { ADMIN_ALERT_BOT_TOKEN, dispatchTelegramAlert } from './admin_alerts';
import { ENFORCE_APP_CHECK } from './callable_options';

if (admin.apps.length === 0) admin.initializeApp();
const REGION = 'us-central1';
const CONFIG_PATH = 'admin_config/alerts';
const PREVIEW_TTL_MS = 30 * 60 * 1000;
const TYPES = ['userReport', 'criticalError', 'contentReportDigest', 'cancelRefundSpike', 'safetyFlag'] as const;
type AlertType = typeof TYPES[number];
type Row = Record<string, unknown>;
export interface EditableAlertsConfig extends Record<string, unknown> { enabled: boolean; chatId: string; types: Record<AlertType, boolean>; spikePerHour: number }
export interface AlertsPatch { enabled?: boolean; chatId?: string; types?: Partial<Record<AlertType, boolean>>; spikePerHour?: number }

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function clean(value: unknown, max: number): string { return String(value ?? '').trim().slice(0, max); }
function hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function numberValue(value: unknown): number { return typeof value === 'number' && Number.isFinite(value) ? value : Number(value) || 0; }
export function maskAlertsChatId(value: unknown): string {
  const chatId = clean(value, 80);
  if (!chatId) return '';
  if (chatId.length <= 6) return `${chatId.slice(0, 1)}…${chatId.slice(-1)}`;
  return `${chatId.slice(0, 3)}…${chatId.slice(-3)}`;
}

function projectAlertsConfig(value: EditableAlertsConfig) {
  return { ...value, chatId: maskAlertsChatId(value.chatId) };
}

export function projectAlertsHistory(value: unknown) {
  const row = record(value);
  const before = normalizeAlertsConfig(record(row.before)).editable;
  const after = normalizeAlertsConfig(record(row.after)).editable;
  return { ...row, before: projectAlertsConfig(before), after: projectAlertsConfig(after) };
}

export function normalizeAlertsConfig(value: unknown) {
  const raw = record(value); const types = record(raw.types);
  const editable: EditableAlertsConfig = {
    enabled: raw.enabled === true,
    chatId: clean(raw.chatId, 80),
    types: Object.fromEntries(TYPES.map((type) => [type, types[type] !== false])) as Record<AlertType, boolean>,
    spikePerHour: Math.max(1, Math.min(100, Math.floor(numberValue(raw.spikePerHour) || 5))),
  };
  return {
    configRevision: Math.max(0, Math.floor(numberValue(raw.configRevision))), editable,
    operational: {
      pendingContentReports: Math.max(0, Math.floor(numberValue(raw.pendingContentReports))),
      lastSentAt: Math.max(0, numberValue(raw.lastSentAt)), lastSentByType: record(raw.lastSentByType),
      testPingResult: clean(raw.testPingResult, 32), testPingResultAt: Math.max(0, numberValue(raw.testPingResultAt)),
      updatedAtMs: Math.max(0, numberValue(raw.updatedAtMs)), updatedBy: clean(raw.updatedBy, 160),
    },
  };
}

export function parseAlertsPatch(value: unknown): AlertsPatch {
  const raw = record(value); const allowed = new Set(['enabled', 'chatId', 'types', 'spikePerHour']);
  if (Object.keys(raw).some((key) => !allowed.has(key))) throw new Error('unknown_alerts_patch_key');
  const patch: AlertsPatch = {};
  if ('enabled' in raw) { if (typeof raw.enabled !== 'boolean') throw new Error('invalid_alerts_enabled'); patch.enabled = raw.enabled; }
  if ('chatId' in raw) { const chatId = clean(raw.chatId, 80); if (!/^-?\d{3,30}$/.test(chatId)) throw new Error('invalid_alerts_chat_id'); patch.chatId = chatId; }
  if ('spikePerHour' in raw) { const value = Math.floor(Number(raw.spikePerHour)); if (!Number.isFinite(value) || value < 1 || value > 100) throw new Error('invalid_spike_per_hour'); patch.spikePerHour = value; }
  if ('types' in raw) {
    const source = record(raw.types); if (Object.keys(source).some((key) => !TYPES.includes(key as AlertType))) throw new Error('unknown_alert_type');
    patch.types = {};
    for (const type of TYPES) if (type in source) { if (typeof source[type] !== 'boolean') throw new Error(`invalid_alert_type:${type}`); patch.types[type] = source[type] as boolean; }
  }
  if (!Object.keys(patch).length) throw new Error('empty_alerts_patch');
  return patch;
}

export function applyAlertsPatch(value: unknown, patch: AlertsPatch): Row {
  const raw = record(value); const currentTypes = record(raw.types);
  return { ...raw, ...(patch.enabled === undefined ? {} : { enabled: patch.enabled }), ...(patch.chatId === undefined ? {} : { chatId: patch.chatId }), ...(patch.spikePerHour === undefined ? {} : { spikePerHour: patch.spikePerHour }), ...(patch.types ? { types: { ...currentTypes, ...patch.types } } : {}) };
}

export function protectedAlertsChanges(before: EditableAlertsConfig, after: EditableAlertsConfig): string[] {
  const risks: string[] = [];
  if (before.enabled && !after.enabled) risks.push('master_disabled');
  if (before.chatId !== after.chatId) risks.push('destination_changed');
  if (before.types.criticalError && !after.types.criticalError) risks.push('critical_errors_disabled');
  if (before.types.safetyFlag && !after.types.safetyFlag) risks.push('safety_flags_disabled');
  if (after.spikePerHour > before.spikePerHour) risks.push('spike_threshold_raised');
  return risks;
}

function roleFor(request: { auth?: { token?: Row } }, permission: 'application.alerts.read' | 'application.alerts.write' | 'application.alerts.test') {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(request.auth.token); if (!role || !hasPermission(role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`); return role;
}
function fields(data: Row) { const reason = clean(data.reason, 500); const requestId = clean(data.requestId, 160); const idempotencyKey = clean(data.idempotencyKey, 160); if (!reason || !requestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required'); return { reason, requestId, idempotencyKey }; }

export const adminGetAlertsWorkspace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  roleFor(request, 'application.alerts.read'); const db = admin.firestore();
  const [configSnap, historySnap, testsSnap] = await Promise.all([db.doc(CONFIG_PATH).get(), db.collection('admin_alerts_history').orderBy('createdAtMs', 'desc').limit(30).get(), db.collection('admin_alert_test_commands').orderBy('createdAtMs', 'desc').limit(20).get()]);
  return { ok: true, config: normalizeAlertsConfig(configSnap.data() || {}), history: historySnap.docs.map((doc) => ({ id: doc.id, ...projectAlertsHistory(doc.data().projection) })), tests: testsSnap.docs.map((doc) => { const row = doc.data(); return { id: doc.id, status: clean(row.status, 40), chatIdMasked: clean(row.chatIdMasked, 80), createdAtMs: numberValue(row.createdAtMs), updatedAtMs: numberValue(row.updatedAtMs) }; }), fetchedAtMs: Date.now() };
});

export const adminPreviewAlertsConfig = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  roleFor(request, 'application.alerts.write'); const data = record(request.data); const reason = clean(data.reason, 500); const requestId = clean(data.requestId, 160); const expectedRevision = Math.max(0, Math.floor(Number(data.expectedRevision || 0)));
  if (!reason || !requestId) throw new HttpsError('invalid-argument', 'reason and requestId required');
  let patch: AlertsPatch; try { patch = parseAlertsPatch(data.patch); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_alerts_patch'); }
  const db = admin.firestore(); const snap = await db.doc(CONFIG_PATH).get(); const raw = snap.data() || {}; const current = normalizeAlertsConfig(raw);
  if (current.configRevision !== expectedRevision) throw new HttpsError('failed-precondition', 'alerts_config_changed');
  const afterRaw = applyAlertsPatch(raw, patch); const after = normalizeAlertsConfig({ ...afterRaw, configRevision: current.configRevision + 1 }); const risks = protectedAlertsChanges(current.editable, after.editable);
  const packet = { revision: current.configRevision, patch, before: current.editable, after: after.editable, reason, risks }; const packetHash = hash(packet); const confirmation = `ALERTS/${current.configRevision}/${packetHash.slice(0, 12)}`; const nowMs = Date.now(); const ref = db.collection('admin_alerts_previews').doc();
  await ref.create({ type: 'alerts_config', actorUid: request.auth!.uid, ...packet, fingerprint: packetHash, confirmation, requestId, createdAtMs: nowMs, expiresAtMs: nowMs + PREVIEW_TTL_MS });
  return { ok: true, previewId: ref.id, ...packet, fingerprint: packetHash, confirmation, rollbackPath: 'Restore the immutable before projection only if configRevision still matches.', expiresAtMs: nowMs + PREVIEW_TTL_MS };
});

export const adminApplyAlertsConfig = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = roleFor(request, 'application.alerts.write'); const data = record(request.data); const command = fields(data); const previewId = clean(data.previewId, 160); const confirmation = clean(data.confirmation, 160); const actorUid = request.auth!.uid; const db = admin.firestore();
  const configRef = db.doc(CONFIG_PATH); const previewRef = db.collection('admin_alerts_previews').doc(previewId); const operationRef = db.collection('admin_command_operations').doc(command.idempotencyKey); const historyRef = db.collection('admin_alerts_history').doc(); const auditRef = db.collection('admin_log').doc(); const requestFingerprint = hash({ previewId, confirmation });
  const prior = await operationRef.get(); if (prior.exists) { const row = prior.data() || {}; if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, configRevision: Number(row.configRevision || 0), replayed: true }; }
  return db.runTransaction(async (tx) => {
    const [operationSnap, previewSnap, configSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef), tx.get(configRef)]);
    if (operationSnap.exists) { const row = operationSnap.data() || {}; if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, configRevision: Number(row.configRevision || 0), replayed: true }; }
    if (!previewSnap.exists) throw new HttpsError('not-found', 'alerts_preview_not_found'); const preview = previewSnap.data() || {};
    if (preview.actorUid !== actorUid || preview.confirmation !== confirmation || preview.reason !== command.reason || preview.consumedAtMs || Number(preview.expiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'alerts_preview_invalid');
    const raw = configSnap.data() || {}; const current = normalizeAlertsConfig(raw); if (current.configRevision !== Number(preview.revision || 0)) throw new HttpsError('failed-precondition', 'alerts_config_changed');
    if (hash({ revision: current.configRevision, patch: preview.patch, before: preview.before, after: preview.after, reason: preview.reason, risks: preview.risks }) !== preview.fingerprint) throw new HttpsError('failed-precondition', 'alerts_preview_fingerprint_mismatch');
    const nextRevision = current.configRevision + 1; const nextRaw = applyAlertsPatch(raw, parseAlertsPatch(preview.patch)); const nowMs = Date.now(); const nextEditable = normalizeAlertsConfig(nextRaw).editable; const projection = { before: projectAlertsConfig(current.editable), after: projectAlertsConfig(nextEditable), risks: preview.risks, reason: command.reason, configRevision: nextRevision, createdAtMs: nowMs, rollbackPath: historyRef.id };
    const audit = createAuditRecord({ action: 'alerts_config.apply', actorUid, role, entity: { collection: 'admin_config', id: 'alerts' }, reason: command.reason, before: projection.before, after: projection.after, rollbackReference: historyRef.id, requestId: command.requestId, timestamp: new Date(nowMs).toISOString() });
    tx.set(configRef, { ...nextRaw, configRevision: nextRevision, updatedAtMs: nowMs, updatedBy: actorUid }, { merge: false }); tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, operationId: command.idempotencyKey }); tx.create(historyRef, { projection, operationId: command.idempotencyKey, createdAtMs: nowMs }); tx.create(auditRef, { ...audit, operationId: command.idempotencyKey }); tx.create(operationRef, { actorUid, requestFingerprint, configRevision: nextRevision, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: true, configRevision: nextRevision, replayed: false };
  });
});

export const adminPreviewAlertTest = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  roleFor(request, 'application.alerts.test'); const data = record(request.data); const chatId = clean(data.chatId, 80); const reason = clean(data.reason, 500); const requestId = clean(data.requestId, 160); if (!/^-?\d{3,30}$/.test(chatId) || !reason || !requestId) throw new HttpsError('invalid-argument', 'chatId, reason and requestId required');
  const packet = { chatId, reason }; const packetHash = hash(packet); const confirmation = `ALERT_TEST/${chatId}/${packetHash.slice(0, 12)}`; const nowMs = Date.now(); const ref = admin.firestore().collection('admin_alert_test_previews').doc(); await ref.create({ actorUid: request.auth!.uid, ...packet, fingerprint: packetHash, confirmation, requestId, createdAtMs: nowMs, expiresAtMs: nowMs + PREVIEW_TTL_MS }); return { ok: true, previewId: ref.id, chatIdMasked: maskAlertsChatId(chatId), reason, confirmation, consequence: 'Sends one test message without saving or enabling alert configuration.', expiresAtMs: nowMs + PREVIEW_TTL_MS };
});

export const adminQueueAlertTest = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [ADMIN_ALERT_BOT_TOKEN], timeoutSeconds: 60 }, async (request) => {
  const role = roleFor(request, 'application.alerts.test'); const data = record(request.data); const command = fields(data); const previewId = clean(data.previewId, 160); const confirmation = clean(data.confirmation, 160); const actorUid = request.auth!.uid; const db = admin.firestore(); const previewRef = db.collection('admin_alert_test_previews').doc(previewId); const operationRef = db.collection('admin_command_operations').doc(command.idempotencyKey); const commandRef = db.collection('admin_alert_test_commands').doc(command.idempotencyKey); const requestFingerprint = hash({ previewId, confirmation });
  const claim = await db.runTransaction(async (tx) => {
    const [operationSnap, previewSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef)]);
    if (operationSnap.exists) { const row = operationSnap.data() || {}; if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { replay: true, status: clean(row.status, 40), chatId: '' }; }
    if (!previewSnap.exists) throw new HttpsError('not-found', 'alert_test_preview_not_found'); const preview = previewSnap.data() || {};
    if (preview.actorUid !== actorUid || preview.confirmation !== confirmation || preview.reason !== command.reason || preview.consumedAtMs || Number(preview.expiresAtMs || 0) <= Date.now()) throw new HttpsError('failed-precondition', 'alert_test_preview_invalid');
    const chatId = clean(preview.chatId, 80); const nowMs = Date.now(); const chatIdMasked = maskAlertsChatId(chatId);
    tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, operationId: command.idempotencyKey }); tx.create(commandRef, { actorUid, status: 'dispatching', chatIdMasked, createdAtMs: nowMs, updatedAtMs: nowMs }); tx.create(operationRef, { actorUid, requestFingerprint, status: 'dispatching', commandId: commandRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { replay: false, status: 'dispatching', chatId };
  });
  if (claim.replay) return { ok: true, status: claim.status === 'dispatching' ? 'delivery_uncertain' : claim.status, replayed: true };
  const text = `✅ <b>Тест алертов Phraseman</b>\n\nПроверка защищённой Admin v2 команды.\n<i>${new Date().toISOString()}</i>`;
  const dispatched = await dispatchTelegramAlert(ADMIN_ALERT_BOT_TOKEN.value(), text, { enabled: true, chatId: claim.chatId }); const nowMs = Date.now();
  await Promise.all([commandRef.set({ status: dispatched.status, updatedAtMs: nowMs }, { merge: true }), operationRef.set({ status: dispatched.status, updatedAtMs: nowMs }, { merge: true }), db.collection('admin_log').add(createAuditRecord({ action: 'alerts_test.dispatch', actorUid, role, entity: { collection: 'admin_alert_test_commands', id: commandRef.id }, reason: command.reason, before: {}, after: { status: dispatched.status }, requestId: command.requestId, timestamp: new Date(nowMs).toISOString() }))]);
  return { ok: true, status: dispatched.status, replayed: false };
});

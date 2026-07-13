import { createHash } from 'crypto';
import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';
import { ENFORCE_APP_CHECK } from './callable_options';
import { isVipActive } from './premium_status';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const LANGS = ['ru', 'uk', 'es', 'ptBr', 'vi', 'id', 'tr', 'pl'] as const;
const RESPONSE_SCAN_LIMIT = 500;
const PREVIEW_TTL_MS = 30 * 60 * 1000;
type Row = Record<string, unknown>;
type LangKey = typeof LANGS[number];

export interface VipSurveyCampaign {
  campaignId: string;
  allVersions: boolean;
  targetAppVersions: string[];
  priority: number;
  ttlDays: number;
  translations: Record<LangKey, { title: string; body: string }>;
  audience: 'free';
  surveyId: 'vip_feedback_v2';
  rewardDays: 30;
}

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function clean(value: unknown, max: number): string { return String(value ?? '').trim().slice(0, max); }
function fingerprint(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function numberValue(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value && typeof value === 'object' && typeof (value as { toMillis?: unknown }).toMillis === 'function') return Number((value as { toMillis: () => number }).toMillis()) || 0;
  return Number(value) || 0;
}

export function normalizeVipSurveyCampaign(value: unknown): VipSurveyCampaign {
  const raw = record(value);
  const campaignId = clean(raw.campaignId, 80).toLowerCase();
  if (!/^[a-z0-9][a-z0-9-]{5,79}$/.test(campaignId)) throw new Error('invalid_campaign_id');
  const allVersions = raw.allVersions === true;
  const targetAppVersions = Array.isArray(raw.targetAppVersions)
    ? [...new Set(raw.targetAppVersions.map((item) => clean(item, 32)).filter((item) => /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?$/.test(item)))].slice(0, 20)
    : [];
  if (!allVersions && !targetAppVersions.length) throw new Error('target_versions_required');
  if (allVersions && targetAppVersions.length) throw new Error('all_versions_conflicts_with_targets');
  const priority = Math.floor(Number(raw.priority ?? 30));
  const ttlDays = Math.floor(Number(raw.ttlDays ?? 7));
  if (!Number.isFinite(priority) || priority < 0 || priority > 100) throw new Error('invalid_priority');
  if (!Number.isFinite(ttlDays) || ttlDays < 1 || ttlDays > 90) throw new Error('invalid_ttl_days');
  const source = record(raw.translations);
  const translations = {} as VipSurveyCampaign['translations'];
  for (const lang of LANGS) {
    const row = record(source[lang]);
    const title = clean(row.title, 160);
    const body = clean(row.body, 2_000);
    if (!title || !body) throw new Error(`missing_translation:${lang}`);
    translations[lang] = { title, body };
  }
  return { campaignId, allVersions, targetAppVersions, priority, ttlDays, translations, audience: 'free', surveyId: 'vip_feedback_v2', rewardDays: 30 };
}

export type VipSurveyResponseFilter = 'all' | 'vip' | 'review_yes' | 'store_opened' | 'current_vip_off';
export function parseVipSurveyResponseRequest(value: unknown) {
  const raw = record(value);
  const filter = ['all', 'vip', 'review_yes', 'store_opened', 'current_vip_off'].includes(String(raw.filter)) ? String(raw.filter) as VipSurveyResponseFilter : 'all';
  return { filter, query: clean(raw.query, 200).toLowerCase(), pageSize: Math.max(1, Math.min(100, Math.floor(Number(raw.pageSize || 50)))), cursor: clean(raw.cursor, 24) };
}

export function projectVipSurveyResponse(id: string, responseValue: unknown, userValue: unknown, nowMs = Date.now()) {
  const response = record(responseValue);
  const user = record(userValue);
  const progress = record(user.progress);
  const answers = record(response.answers);
  const safeAnswers = Object.fromEntries(Object.entries(answers).slice(0, 20).map(([key, value]) => {
    const answer = record(value);
    return [clean(key, 80), { optionId: clean(answer.optionId, 80), comment: clean(answer.comment, 500) }];
  }));
  return {
    id: clean(id, 160), uid: clean(response.uid || id, 160), name: clean(user.name || user.displayName, 160), email: clean(user.email, 320),
    submittedAtMs: numberValue(response.submittedAtMs || response.updatedAtMs), platform: clean(response.platform, 32), answers: safeAnswers,
    vipGranted: response.vipGranted === true, reviewIntent: clean(response.reviewIntent, 32), storeOpened: response.storeOpened === true,
    currentVipActive: isVipActive(progress, nowMs),
  };
}

function roleFor(request: { auth?: { token?: Row } }, permission: 'application.review_promo.read' | 'application.review_promo.write') {
  if (!request.auth?.token?.admin) throw new HttpsError('permission-denied', 'Admin only');
  const role = resolveAdminRole(request.auth.token);
  if (!role || !hasPermission(role, permission)) throw new HttpsError('permission-denied', `Role cannot use ${permission}`);
  return role;
}

function commandFields(data: Row) {
  const reason = clean(data.reason, 500); const requestId = clean(data.requestId, 160); const idempotencyKey = clean(data.idempotencyKey, 160);
  if (!reason || !requestId || !idempotencyKey) throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
  return { reason, requestId, idempotencyKey };
}

function campaignDocument(campaign: VipSurveyCampaign, actorUid: string, nowMs: number): Row {
  const expiresAtMs = nowMs + campaign.ttlDays * 86_400_000;
  const document: Row = {
    active: true, kind: 'vip_survey', audience: 'free', campaignId: campaign.campaignId, allVersions: campaign.allVersions,
    targetAppVersions: campaign.targetAppVersions, priority: campaign.priority, ttlDays: campaign.ttlDays,
    vipSurvey: { surveyId: 'vip_feedback_v2', rewardDays: 30 }, createdAt: new Date(nowMs).toISOString(), createdAtMs: nowMs,
    updatedAt: new Date(nowMs).toISOString(), updatedAtMs: nowMs, expiresAt: new Date(expiresAtMs).toISOString(), expiresAtMs, createdBy: actorUid, updatedBy: actorUid,
  };
  const suffix: Record<LangKey, string> = { ru: 'Ru', uk: 'Uk', es: 'Es', ptBr: 'PtBr', vi: 'Vi', id: 'Id', tr: 'Tr', pl: 'Pl' };
  for (const lang of LANGS) {
    document[`title${suffix[lang]}`] = campaign.translations[lang].title;
    document[`message${suffix[lang]}`] = campaign.translations[lang].body;
  }
  return document;
}

async function activeCampaigns(db: FirebaseFirestore.Firestore) {
  const snap = await db.collection('app_messages').where('kind', '==', 'vip_survey').where('active', '==', true).limit(100).get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Row }));
}

export const adminGetVipSurveyWorkspace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  roleFor(request, 'application.review_promo.read');
  const db = admin.firestore();
  const [stateSnap, active] = await Promise.all([db.collection('admin_vip_survey_state').doc('current').get(), activeCampaigns(db)]);
  const state = stateSnap.data() || {};
  return { ok: true, revision: Math.max(0, Number(state.revision || 0)), activeCampaigns: active.map(({ id, data }) => ({ id, campaignId: clean(data.campaignId || id, 80), priority: Number(data.priority || 0), expiresAtMs: numberValue(data.expiresAtMs), targetAppVersions: Array.isArray(data.targetAppVersions) ? data.targetAppVersions.slice(0, 20) : [], allVersions: data.allVersions === true, translations: Object.fromEntries(LANGS.map((lang) => [lang, { title: clean(data[`title${({ ru: 'Ru', uk: 'Uk', es: 'Es', ptBr: 'PtBr', vi: 'Vi', id: 'Id', tr: 'Tr', pl: 'Pl' } as Record<LangKey, string>)[lang]}`], 160), body: clean(data[`message${({ ru: 'Ru', uk: 'Uk', es: 'Es', ptBr: 'PtBr', vi: 'Vi', id: 'Id', tr: 'Tr', pl: 'Pl' } as Record<LangKey, string>)[lang]}`], 2_000) }])), updatedAtMs: numberValue(data.updatedAtMs) })), fetchedAtMs: Date.now() };
});

export const adminListVipSurveyResponses = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 90, memory: '512MiB' }, async (request) => {
  roleFor(request, 'application.review_promo.read');
  const parsed = parseVipSurveyResponseRequest(request.data);
  const db = admin.firestore();
  const snap = await db.collection('vip_survey_responses').orderBy('updatedAtMs', 'desc').limit(RESPONSE_SCAN_LIMIT).get();
  const raw = snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Row }));
  const uids = [...new Set(raw.map((row) => clean(row.data.uid || row.id, 160)).filter(Boolean))];
  const userSnaps = await Promise.all(uids.map((uid) => db.collection('users').doc(uid).get()));
  const users = new Map(userSnaps.map((doc) => [doc.id, doc.data() || {}]));
  const rows = raw.map(({ id, data }) => projectVipSurveyResponse(id, data, users.get(clean(data.uid || id, 160)) || {}));
  const matching = rows.filter((row) => {
    if (parsed.filter === 'vip' && !row.vipGranted) return false;
    if (parsed.filter === 'review_yes' && row.reviewIntent !== 'yes') return false;
    if (parsed.filter === 'store_opened' && !row.storeOpened) return false;
    if (parsed.filter === 'current_vip_off' && row.currentVipActive) return false;
    return !parsed.query || JSON.stringify(row).toLowerCase().includes(parsed.query);
  });
  const offset = Math.max(0, Number.parseInt(parsed.cursor || '0', 10) || 0);
  const items = matching.slice(offset, offset + parsed.pageSize);
  const answerDistributions: Record<string, Record<string, number>> = {};
  for (const row of rows) for (const [questionId, value] of Object.entries(row.answers)) {
    const optionId = clean(record(value).optionId, 80) || 'comment';
    answerDistributions[questionId] = answerDistributions[questionId] || {};
    answerDistributions[questionId][optionId] = (answerDistributions[questionId][optionId] || 0) + 1;
  }
  return { ok: true, items, summary: { responses: rows.length, vipGranted: rows.filter((row) => row.vipGranted).length, reviewYes: rows.filter((row) => row.reviewIntent === 'yes').length, storeOpened: rows.filter((row) => row.storeOpened).length, currentVipActive: rows.filter((row) => row.currentVipActive).length, answerDistributions }, scannedCount: raw.length, totalMatched: matching.length, nextCursor: offset + items.length < matching.length ? String(offset + items.length) : '', truncated: snap.size >= RESPONSE_SCAN_LIMIT };
});

export const adminPreviewVipSurveyCampaign = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  roleFor(request, 'application.review_promo.write');
  const data = record(request.data); const fields = commandFields({ ...data, idempotencyKey: data.idempotencyKey || 'preview' });
  const action = data.action === 'deactivate' ? 'deactivate' : 'activate';
  let campaign: VipSurveyCampaign | null = null;
  if (action === 'activate') try { campaign = normalizeVipSurveyCampaign(data.campaign); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_campaign'); }
  const expectedRevision = Math.max(0, Math.floor(Number(data.expectedRevision || 0)));
  const db = admin.firestore();
  const [stateSnap, active] = await Promise.all([db.collection('admin_vip_survey_state').doc('current').get(), activeCampaigns(db)]);
  const revision = Math.max(0, Number(stateSnap.data()?.revision || 0));
  if (revision !== expectedRevision) throw new HttpsError('failed-precondition', 'vip_survey_state_changed');
  if (active.length >= 80) throw new HttpsError('resource-exhausted', 'too_many_active_vip_surveys');
  const activeSet = active.map(({ id, data: row }) => ({ id, updatedAtMs: numberValue(row.updatedAtMs), expiresAtMs: numberValue(row.expiresAtMs) }));
  const nowMs = Date.now(); const packet = { action, revision, campaign, activeSet, reason: fields.reason };
  const packetFingerprint = fingerprint(packet); const confirmation = `VIP_SURVEY/${action}/${revision}/${packetFingerprint.slice(0, 12)}`;
  const previewRef = db.collection('admin_vip_survey_previews').doc();
  await previewRef.create({ type: 'vip_survey_campaign', actorUid: request.auth!.uid, ...packet, fingerprint: packetFingerprint, confirmation, requestId: fields.requestId, createdAtMs: nowMs, expiresAtMs: nowMs + PREVIEW_TTL_MS });
  return { ok: true, previewId: previewRef.id, ...packet, fingerprint: packetFingerprint, confirmation, stopPath: 'Deactivate all currently active vip_survey messages.', rollbackPath: 'Use immutable admin_vip_survey_history before expiry and only if revision still matches.', expiresAtMs: nowMs + PREVIEW_TTL_MS };
});

export const adminApplyVipSurveyCampaign = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const role = roleFor(request, 'application.review_promo.write');
  const data = record(request.data); const fields = commandFields(data); const previewId = clean(data.previewId, 160); const confirmation = clean(data.confirmation, 180);
  const actorUid = request.auth!.uid; const db = admin.firestore();
  const previewRef = db.collection('admin_vip_survey_previews').doc(previewId); const stateRef = db.collection('admin_vip_survey_state').doc('current');
  const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey); const auditRef = db.collection('admin_log').doc(); const historyRef = db.collection('admin_vip_survey_history').doc();
  const requestFingerprint = fingerprint({ previewId, confirmation });
  const existing = await operationRef.get();
  if (existing.exists) {
    const row = existing.data() || {}; if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict');
    return { ok: true, revision: Number(row.revision || 0), campaignId: clean(row.campaignId, 80), replayed: true };
  }
  return db.runTransaction(async (tx) => {
    const [operationSnap, previewSnap, stateSnap] = await Promise.all([tx.get(operationRef), tx.get(previewRef), tx.get(stateRef)]);
    if (operationSnap.exists) { const row = operationSnap.data() || {}; if (row.actorUid !== actorUid || row.requestFingerprint !== requestFingerprint) throw new HttpsError('already-exists', 'idempotency_conflict'); return { ok: true, revision: Number(row.revision || 0), campaignId: clean(row.campaignId, 80), replayed: true }; }
    if (!previewSnap.exists) throw new HttpsError('not-found', 'vip_survey_preview_not_found');
    const preview = previewSnap.data() || {};
    if (preview.actorUid !== actorUid || Number(preview.expiresAtMs || 0) <= Date.now() || preview.consumedAtMs || preview.confirmation !== confirmation || preview.reason !== fields.reason) throw new HttpsError('failed-precondition', 'vip_survey_preview_invalid');
    const revision = Math.max(0, Number(stateSnap.data()?.revision || 0));
    if (revision !== Number(preview.revision || 0)) throw new HttpsError('failed-precondition', 'vip_survey_state_changed');
    const activeQuery = db.collection('app_messages').where('kind', '==', 'vip_survey').where('active', '==', true).limit(100);
    const activeSnap = await tx.get(activeQuery);
    const activeDocs = activeSnap.docs;
    const currentSet = activeDocs.map((doc) => ({ id: doc.id, updatedAtMs: numberValue(doc.data().updatedAtMs), expiresAtMs: numberValue(doc.data().expiresAtMs) }));
    if (fingerprint({ action: preview.action, revision, campaign: preview.campaign || null, activeSet: currentSet, reason: preview.reason }) !== preview.fingerprint) throw new HttpsError('failed-precondition', 'vip_survey_preview_changed');
    const nowMs = Date.now();
    let campaignId = '';
    let campaignToCreate: VipSurveyCampaign | null = null;
    let campaignRef: FirebaseFirestore.DocumentReference | null = null;
    if (preview.action === 'activate') {
      campaignToCreate = normalizeVipSurveyCampaign(preview.campaign); campaignId = campaignToCreate.campaignId;
      campaignRef = db.collection('app_messages').doc(campaignId); const campaignSnap = await tx.get(campaignRef);
      if (campaignSnap.exists) throw new HttpsError('already-exists', 'campaign_id_already_used');
    }
    for (const doc of activeDocs) tx.update(doc.ref, { active: false, updatedAtMs: nowMs, updatedAt: new Date(nowMs).toISOString(), deactivatedAtMs: nowMs, deactivatedBy: actorUid });
    if (campaignRef && campaignToCreate) tx.create(campaignRef, campaignDocument(campaignToCreate, actorUid, nowMs));
    const nextRevision = revision + 1;
    const before = { revision, activeCampaigns: currentSet }; const after = { revision: nextRevision, activeCampaignId: campaignId, action: preview.action };
    const audit = createAuditRecord({ action: `vip_survey.${preview.action}`, actorUid, role, entity: { collection: 'app_messages', id: campaignId || 'active-vip-surveys' }, reason: fields.reason, before, after, rollbackReference: historyRef.id, requestId: fields.requestId, timestamp: new Date(nowMs).toISOString() });
    tx.set(stateRef, { revision: nextRevision, activeCampaignId: campaignId, updatedAtMs: nowMs, updatedBy: actorUid }, { merge: true });
    tx.update(previewRef, { consumedAtMs: nowMs, consumedBy: actorUid, operationId: fields.idempotencyKey });
    tx.create(historyRef, { ...audit, operationId: fields.idempotencyKey, previewId, campaign: preview.campaign || null });
    tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
    tx.create(operationRef, { actorUid, requestFingerprint, revision: nextRevision, campaignId, auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp() });
    return { ok: true, revision: nextRevision, campaignId, replayed: false };
  });
});

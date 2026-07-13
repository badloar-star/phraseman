import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import type { AdminPermission } from './admin/permissions';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  applyNativePatch, approveNativeMutation, asRecord, boundedLimit, cleanText, createNativePreview,
  documentVersion, parseMutationEnvelope, readBoundedCollection, requestNativeApproval,
  requireNativePermission, safeProjection, type NativeRow,
} from './admin_native_operations';

if (admin.apps.length === 0) admin.initializeApp();
const REGION = 'us-central1';

const CONTENT_SOURCES = Object.freeze({
  'community-packs': 'community_packs',
  'card-packs': 'card_packs',
  'daily-phrases': 'daily_phrases',
  'french-quizzes': 'adminContentDrafts/fr/quiz',
  'explain-reports': 'explain_report_entries',
  'full-content-control': 'plan_content_telemetry_events',
} as const);
type ContentCapability = keyof typeof CONTENT_SOURCES;

export function parseContentWorkspaceInput(value: unknown) {
  const data = asRecord(value); const capabilityId = cleanText(data.capabilityId || 'community-packs', 60) as ContentCapability;
  if (!Object.prototype.hasOwnProperty.call(CONTENT_SOURCES, capabilityId)) throw new Error('invalid_content_capability');
  return { capabilityId, limit: boundedLimit(data.limit), cursor: cleanText(data.cursor, 200) };
}

type ContentPlan = { collection: string; requiredPermission: AdminPermission; consequence: string; allowMissing?: boolean; forcedPatch?: NativeRow };
export function buildContentMutationPlan(action: string, _targetId: string, _before: NativeRow, _payload: NativeRow): ContentPlan {
  switch (action) {
    case 'community-pack-status': return { collection: 'community_packs', requiredPermission: 'content.publish', consequence: 'Changes publication visibility for one community pack.' };
    case 'card-pack-update': return { collection: 'card_packs', requiredPermission: 'content.publish', consequence: 'Updates bounded card-pack metadata or publication state.' };
    case 'daily-phrase-upsert': return { collection: 'daily_phrases', requiredPermission: 'content.publish', consequence: 'Creates or updates one scheduled daily phrase.', allowMissing: true };
    case 'french-draft': return { collection: 'adminContentDrafts/fr/quiz', requiredPermission: 'content.draft.write', consequence: 'Creates a deterministic French quiz draft in HOLD; it cannot activate production.', allowMissing: true, forcedPatch: { status: 'HOLD', activationApproved: false, productionReady: false } };
    case 'french-rollback': return { collection: 'adminContentRollbacks/fr/quiz', requiredPermission: 'content.publish', consequence: 'Creates a rollback draft without deleting history or activating French.', allowMissing: true, forcedPatch: { status: 'HOLD', activationApproved: false, productionReady: false, deleteHistoricalPayloads: false } };
    case 'explain-report-status': return { collection: 'explain_report_entries', requiredPermission: 'content.reports.write', consequence: 'Updates one explanation report workflow status; cached explanation content is unchanged.' };
    default: throw new Error('unsupported_content_action');
  }
}

function planFor(input: ReturnType<typeof parseMutationEnvelope>) {
  try { return buildContentMutationPlan(input.action, input.targetId, {}, input.payload); }
  catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'unsupported_content_action'); }
}

export const adminGetContentOperationsWorkspace = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { role } = requireNativePermission(request, 'content.read');
  let input: ReturnType<typeof parseContentWorkspaceInput>;
  try { input = parseContentWorkspaceInput(request.data); } catch (error) { throw new HttpsError('invalid-argument', error instanceof Error ? error.message : 'invalid_content_input'); }
  const source = CONTENT_SOURCES[input.capabilityId];
  try {
    const page = await readBoundedCollection(admin.firestore(), source, input.limit, input.cursor);
    return { ok: true, capabilityId: input.capabilityId, ...page, role, activationApproved: false, productionReady: false, sourceHealth: [{ source, state: 'ready', count: page.items.length }] };
  } catch (error) {
    return { ok: true, capabilityId: input.capabilityId, items: [], nextCursor: '', truncated: false, role, activationApproved: false, productionReady: false, sourceHealth: [{ source, state: 'error', message: cleanText(error instanceof Error ? error.message : error, 240) }] };
  }
});

export const adminGetContentOperationDetail = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  requireNativePermission(request, 'content.read'); const data = asRecord(request.data);
  const capabilityId = cleanText(data.capabilityId, 60) as ContentCapability; const id = cleanText(data.id, 200);
  if (!id || !Object.prototype.hasOwnProperty.call(CONTENT_SOURCES, capabilityId)) throw new HttpsError('invalid-argument', 'valid capabilityId and id required');
  const snap = await admin.firestore().collection(CONTENT_SOURCES[capabilityId]).doc(id).get(); if (!snap.exists) throw new HttpsError('not-found', 'content_row_not_found');
  return { ok: true, item: { id: snap.id, ...asRecord(safeProjection(snap.data())), version: documentVersion(snap.id, snap.data()) }, activationApproved: false, productionReady: false };
});

export const adminPreviewContentMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const input = parseMutationEnvelope(request.data); const plan = planFor(input); const actor = requireNativePermission(request, plan.requiredPermission);
  return createNativePreview({ db: admin.firestore(), packageId: 'content', ...actor, collection: plan.collection, action: input.action, targetId: input.targetId, reason: input.reason, expectedVersion: input.expectedVersion, payload: { ...input.payload, ...plan.forcedPatch }, consequence: plan.consequence, requiredPermission: plan.requiredPermission, requiresApproval: true, allowMissing: plan.allowMissing });
});

export const adminRequestContentApproval = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { actorUid } = requireNativePermission(request, 'content.draft.write'); const data = asRecord(request.data);
  return requestNativeApproval(admin.firestore(), actorUid, cleanText(data.previewId, 160), cleanText(data.confirmation, 240));
});

export const adminApproveContentMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { actorUid } = requireNativePermission(request, 'content.approve'); const data = asRecord(request.data);
  return approveNativeMutation(admin.firestore(), actorUid, cleanText(data.previewId, 160), cleanText(data.reason, 500));
});

const CONTENT_ACTIONS = new Set(['community-pack-status', 'card-pack-update', 'daily-phrase-upsert', 'french-draft', 'french-rollback', 'explain-report-status']);
export const adminApplyContentMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireNativePermission(request, 'content.draft.write'); const data = asRecord(request.data);
  return applyNativePatch({
    db: admin.firestore(), packageId: 'content', ...actor, previewId: cleanText(data.previewId, 160), confirmation: cleanText(data.confirmation, 240), idempotencyKey: cleanText(data.idempotencyKey, 160), allowedActions: CONTENT_ACTIONS,
    transform: ({ action, payload, nowMs }) => {
      const iso = new Date(nowMs).toISOString();
      if (action === 'community-pack-status') { const status = cleanText(payload.status, 40); if (!['published', 'unpublished', 'removed'].includes(status)) throw new HttpsError('invalid-argument', 'invalid pack status'); return { status, updatedAt: iso, updatedByUid: actor.actorUid }; }
      if (action === 'card-pack-update') { const patch: NativeRow = { updatedAt: iso, updatedByUid: actor.actorUid }; if (typeof payload.title === 'string') patch.title = cleanText(payload.title, 160); if (typeof payload.published === 'boolean') patch.published = payload.published; return patch; }
      if (action === 'daily-phrase-upsert') { const en = cleanText(payload.en, 500); const ru = cleanText(payload.ru, 500); const date = cleanText(payload.date, 10); if (!en || !ru || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpsError('invalid-argument', 'en, ru and ISO date required'); return { en, ru, date, order: Math.max(0, Math.floor(Number(payload.order) || 0)), enabled: payload.enabled !== false, updatedAt: iso, updatedByUid: actor.actorUid }; }
      if (action === 'french-draft') return { ...payload, studyTarget: 'fr', surface: 'quiz', status: 'HOLD', activationApproved: false, productionReady: false, rolloutPercent: 0, updatedAt: iso, updatedByUid: actor.actorUid };
      if (action === 'french-rollback') return { ...payload, studyTarget: 'fr', surface: 'quiz', status: 'HOLD', activationApproved: false, productionReady: false, deleteHistoricalPayloads: false, updatedAt: iso, updatedByUid: actor.actorUid };
      if (action === 'explain-report-status') { const status = cleanText(payload.status, 40); if (!['new', 'reviewing', 'resolved', 'dismissed'].includes(status)) throw new HttpsError('invalid-argument', 'invalid report status'); return { status, adminNote: cleanText(payload.adminNote, 500), updatedAtMs: nowMs, updatedByUid: actor.actorUid }; }
      throw new HttpsError('invalid-argument', 'unsupported_content_action');
    },
  });
});

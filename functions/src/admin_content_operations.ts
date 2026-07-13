import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { hasPermission, type AdminPermission } from './admin/permissions';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  applyCommunityPackModerationInTransaction,
  applyCommunitySubmissionModerationInTransaction,
  type CommunityPackModerationAction,
  type CommunitySubmissionModerationAction,
} from './community_packs';
import {
  applyNativePatch, approveNativeMutation, asRecord, boundedLimit, cleanText, createNativePreview,
  documentVersion, parseMutationEnvelope, projectNativeRow, readBoundedCollection, requestNativeApproval,
  requireNativePermission, type NativeRow,
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
  return { capabilityId, limit: boundedLimit(data.limit), cursor: cleanText(data.cursor, 200), fromDate: cleanText(data.fromDate, 10), toDate: cleanText(data.toDate, 10), query: cleanText(data.query, 120).toLowerCase(), status: cleanText(data.status, 40) };
}

function filterContentRows(items: NativeRow[], query: string, status: string): NativeRow[] {
  return items.filter((item) => (!status || cleanText(item.status, 40) === status) && (!query || JSON.stringify(item).toLowerCase().includes(query)));
}

type ContentPlan = { collection: string; requiredPermission: AdminPermission; consequence: string; allowMissing?: boolean; forcedPatch?: NativeRow };
export function buildContentMutationPlan(action: string, _targetId: string, _before: NativeRow, payload: NativeRow): ContentPlan {
  switch (action) {
    case 'community-submission-decision': return { collection: 'community_pack_submissions', requiredPermission: 'community.moderate', consequence: 'Approves, rejects or requests changes and notifies the author.' };
    case 'community-pack-status': return { collection: 'community_packs', requiredPermission: 'content.publish', consequence: 'Requests revision or removes one active community pack and notifies the author.' };
    case 'community-pack-report-status': return { collection: 'community_pack_reports', requiredPermission: 'community.moderate', consequence: 'Marks one community-pack report reviewed or resolved after its pack content was inspected.' };
    case 'card-pack-draft': return { collection: 'card_packs', requiredPermission: 'content.draft.write', consequence: 'Updates draft-only card-pack title/category metadata without publishing or changing price.' };
    case 'card-pack-update': return { collection: 'card_packs', requiredPermission: 'content.publish', consequence: 'Updates bounded card-pack metadata or publication state.' };
    case 'daily-phrase-draft': return { collection: 'daily_phrases', requiredPermission: 'content.draft.write', consequence: 'Creates or edits one unscheduled daily-phrase draft; it cannot activate or enter the queue.', allowMissing: true };
    case 'daily-phrase-upsert': return { collection: 'daily_phrases', requiredPermission: 'content.publish', consequence: 'Creates or updates one scheduled daily phrase with a rollback snapshot.', allowMissing: true };
    case 'daily-phrase-reorder': return { collection: 'admin_native_bulk_manifests', requiredPermission: 'content.publish', consequence: 'Reorders a bounded current/future daily-phrase queue and records the exact queue manifest.', allowMissing: true };
    case 'daily-phrase-import': return { collection: 'admin_native_bulk_manifests', requiredPermission: 'content.publish', consequence: 'Imports a bounded reviewed daily-phrase batch with per-row version checks and rollback snapshots.', allowMissing: true };
    case 'daily-phrase-rollback': return { collection: 'daily_phrases', requiredPermission: 'content.publish', consequence: 'Restores one daily phrase from its last stored rollback snapshot without deleting history.' };
    case 'french-draft': return { collection: 'adminContentDrafts/fr/quiz', requiredPermission: 'content.draft.write', consequence: 'Creates a deterministic French quiz draft in HOLD; it cannot activate production.', allowMissing: true, forcedPatch: { status: 'HOLD', activationApproved: false, productionReady: false } };
    case 'french-rollback': return { collection: 'adminContentRollbacks/fr/quiz', requiredPermission: 'content.publish', consequence: 'Creates a rollback draft without deleting history or activating French.', allowMissing: true, forcedPatch: { status: 'HOLD', activationApproved: false, productionReady: false, deleteHistoricalPayloads: false } };
    case 'explain-report-status': return { collection: 'explain_report_entries', requiredPermission: 'content.reports.write', consequence: 'Updates one explanation report workflow status; cached explanation content is unchanged.' };
    case 'explain-reports-bulk': return { collection: 'admin_native_bulk_manifests', requiredPermission: 'content.reports.write', consequence: 'Updates a bounded, version-checked set of explanation reports; cached explanation content is unchanged.', allowMissing: true };
    case 'explain-report-delete': return { collection: 'explain_report_entries', requiredPermission: 'content.reports.write', consequence: 'Permanently deletes one reviewed explanation-report entry after second-admin approval.' };
    case 'explain-cache-delete': { const collection = cleanText(payload.cacheCollection, 80); if (!['phrase_explanations', 'mistake_explanations', 'quiz_explanations'].includes(collection)) throw new Error('invalid_explain_cache_collection'); return { collection, requiredPermission: 'content.reports.write', consequence: 'Removes one cached explanation so a later user request can regenerate it.' }; }
    case 'explain-counter-delete': return { collection: 'explain_reports', requiredPermission: 'content.reports.write', consequence: 'Clears one reviewed explanation-report counter after second-admin approval.' };
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
  const source = CONTENT_SOURCES[input.capabilityId]; const db = admin.firestore(); const revealIdentity = hasPermission(role, 'users.read');
  try {
    if (input.capabilityId === 'community-packs') {
      const sources = ['community_pack_submissions', 'community_packs', 'community_pack_reports'];
      const pages = await Promise.all(sources.map((name) => readBoundedCollection(db, name, input.limit, '', revealIdentity)));
      const allItems = pages.flatMap((page, index) => page.items.map((item) => ({ ...item, source: sources[index] }))); return { ok: true, capabilityId: input.capabilityId, items: filterContentRows(allItems, input.query, input.status), sections: Object.fromEntries(sources.map((name, index) => [name, pages[index].items])), truncated: pages.some((page) => page.truncated), role, activationApproved: false, productionReady: false, sourceHealth: sources.map((name, index) => ({ source: name, state: 'ready', count: pages[index].items.length })) };
    }
    if (input.capabilityId === 'explain-reports') {
      const cacheSources = ['phrase_explanations', 'mistake_explanations', 'quiz_explanations']; const [entries, counters, ...caches] = await Promise.all([readBoundedCollection(db, 'explain_report_entries', input.limit, input.cursor, revealIdentity), readBoundedCollection(db, 'explain_reports', input.limit, '', revealIdentity), ...cacheSources.map((name) => readBoundedCollection(db, name, Math.min(input.limit, 80), '', revealIdentity))]);
      const entryItems = entries.items.map((item) => ({ ...item, source: 'explain_report_entries' })); const counterItems = counters.items.map((item) => ({ ...item, source: 'explain_reports' })); const cacheItems = caches.flatMap((page, index) => page.items.map((item) => ({ ...item, source: cacheSources[index] })));
      return { ok: true, capabilityId: input.capabilityId, items: filterContentRows([...entryItems, ...counterItems, ...cacheItems], input.query, input.status), nextCursor: entries.nextCursor, truncated: entries.truncated || counters.truncated || caches.some((page) => page.truncated), sections: { entries: entryItems, counters: counterItems, caches: cacheItems }, role, activationApproved: false, productionReady: false, sourceHealth: [{ source: 'explain_report_entries', state: 'ready', count: entries.items.length }, { source: 'explain_reports', state: 'ready', count: counters.items.length }, ...cacheSources.map((name, index) => ({ source: name, state: 'ready', count: caches[index].items.length }))] };
    }
    if (input.capabilityId === 'full-content-control') {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/; const to = datePattern.test(input.toDate) ? new Date(`${input.toDate}T00:00:00Z`) : new Date(); const from = datePattern.test(input.fromDate) ? new Date(`${input.fromDate}T00:00:00Z`) : new Date(to.getTime() - 6 * 86_400_000);
      const days = Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1; if (days < 1 || days > 31) throw new HttpsError('invalid-argument', 'content telemetry range must be 1..31 days');
      const rows: NativeRow[] = []; const health: NativeRow[] = [];
      for (let day = 0; day < days; day += 1) { const key = new Date(from.getTime() + day * 86_400_000).toISOString().slice(0, 10); const snap = await db.collection('plan_content_telemetry_events').doc(key).collection('events').orderBy(admin.firestore.FieldPath.documentId()).limit(input.limit).get(); rows.push(...snap.docs.map((doc) => ({ id: `${key}/${doc.id}`, day: key, ...asRecord(projectNativeRow(doc.data(), revealIdentity)), version: documentVersion(doc.id, doc.data()) }))); health.push({ source: `plan_content_telemetry_events/${key}/events`, state: 'ready', count: snap.size }); }
      return { ok: true, capabilityId: input.capabilityId, items: rows.slice(0, 1000), truncated: rows.length > 1000, nextCursor: '', role, activationApproved: false, productionReady: false, sourceHealth: health };
    }
    if (input.capabilityId === 'daily-phrases') {
      const [phrases, counts] = await Promise.all([readBoundedCollection(db, 'daily_phrases', input.limit, input.cursor, revealIdentity), readBoundedCollection(db, 'daily_phrase_save_counts', input.limit, '', revealIdentity)]); const phraseRows = phrases.items as NativeRow[]; const countRows = counts.items as NativeRow[]; const countById = new Map(countRows.map((row) => [cleanText(row.id, 160), Math.max(0, Number(row.savedCount) || 0)])); const merged: NativeRow[] = phraseRows.map((row) => ({ ...row, savedCount: Math.max(Number(row.savedCount) || 0, countById.get(cleanText(row.id, 160)) || 0) })); merged.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)); return { ok: true, capabilityId: input.capabilityId, ...phrases, items: filterContentRows(merged, input.query, input.status), sections: { phrases: merged, saveCounts: countRows }, truncated: phrases.truncated || counts.truncated, role, activationApproved: false, productionReady: false, sourceHealth: [{ source: 'daily_phrases', state: 'ready', count: phrases.items.length }, { source: 'daily_phrase_save_counts', state: 'ready', count: counts.items.length }] };
    }
    const page = await readBoundedCollection(db, source, input.limit, input.cursor, revealIdentity);
    return { ok: true, capabilityId: input.capabilityId, ...page, items: filterContentRows(page.items, input.query, input.status), role, activationApproved: false, productionReady: false, sourceHealth: [{ source, state: 'ready', count: page.items.length }] };
  } catch (error) {
    return { ok: true, capabilityId: input.capabilityId, items: [], nextCursor: '', truncated: false, role, activationApproved: false, productionReady: false, sourceHealth: [{ source, state: 'error', message: cleanText(error instanceof Error ? error.message : error, 240) }] };
  }
});

export const adminGetContentOperationDetail = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { role } = requireNativePermission(request, 'content.read'); const data = asRecord(request.data);
  const capabilityId = cleanText(data.capabilityId, 60) as ContentCapability; const id = cleanText(data.id, 200); const requestedSource = cleanText(data.source, 120);
  if (!id || !Object.prototype.hasOwnProperty.call(CONTENT_SOURCES, capabilityId)) throw new HttpsError('invalid-argument', 'valid capabilityId and id required');
  if (capabilityId === 'full-content-control') { const [day, eventId] = id.split('/'); if (!/^\d{4}-\d{2}-\d{2}$/.test(day || '') || !eventId) throw new HttpsError('invalid-argument', 'valid telemetry event id required'); const eventSnap = await admin.firestore().collection('plan_content_telemetry_events').doc(day).collection('events').doc(eventId).get(); if (!eventSnap.exists) throw new HttpsError('not-found', 'content_row_not_found'); return { ok: true, item: { id, day, ...asRecord(projectNativeRow(eventSnap.data(), hasPermission(role, 'users.read'))), version: documentVersion(eventSnap.id, eventSnap.data()) }, activationApproved: false, productionReady: false }; }
  const allowedSources: Partial<Record<ContentCapability, readonly string[]>> = { 'community-packs': ['community_pack_submissions', 'community_packs', 'community_pack_reports'], 'explain-reports': ['explain_report_entries', 'explain_reports', 'phrase_explanations', 'mistake_explanations', 'quiz_explanations'] };
  const source = requestedSource && allowedSources[capabilityId]?.includes(requestedSource) ? requestedSource : CONTENT_SOURCES[capabilityId];
  const snap = await admin.firestore().collection(source).doc(id).get(); if (!snap.exists) throw new HttpsError('not-found', 'content_row_not_found');
  return { ok: true, item: { id: snap.id, ...asRecord(projectNativeRow(snap.data(), hasPermission(role, 'users.read'))), version: documentVersion(snap.id, snap.data()) }, activationApproved: false, productionReady: false };
});

export const adminPreviewContentMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const input = parseMutationEnvelope(request.data); const plan = planFor(input); const actor = requireNativePermission(request, plan.requiredPermission);
  return createNativePreview({ db: admin.firestore(), packageId: 'content', ...actor, collection: plan.collection, action: input.action, targetId: input.targetId, reason: input.reason, expectedVersion: input.expectedVersion, payload: { ...input.payload, ...plan.forcedPatch }, consequence: plan.consequence, requiredPermission: plan.requiredPermission, requiresApproval: true, allowMissing: plan.allowMissing });
});

export const adminRequestContentApproval = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { actorUid } = requireNativePermission(request, 'content.read'); const data = asRecord(request.data);
  return requestNativeApproval(admin.firestore(), actorUid, cleanText(data.previewId, 160), cleanText(data.confirmation, 240));
});

export const adminApproveContentMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const { actorUid } = requireNativePermission(request, 'content.approve'); const data = asRecord(request.data);
  return approveNativeMutation(admin.firestore(), actorUid, cleanText(data.previewId, 160), cleanText(data.reason, 500));
});

const CONTENT_ACTIONS = new Set(['community-submission-decision', 'community-pack-status', 'community-pack-report-status', 'card-pack-draft', 'card-pack-update', 'daily-phrase-draft', 'daily-phrase-upsert', 'daily-phrase-reorder', 'daily-phrase-import', 'daily-phrase-rollback', 'french-draft', 'french-rollback', 'explain-report-status', 'explain-reports-bulk', 'explain-report-delete', 'explain-cache-delete', 'explain-counter-delete']);
export const adminApplyContentMutation = onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request) => {
  const actor = requireNativePermission(request, 'content.read'); const data = asRecord(request.data);
  return applyNativePatch({
    db: admin.firestore(), packageId: 'content', ...actor, previewId: cleanText(data.previewId, 160), confirmation: cleanText(data.confirmation, 240), idempotencyKey: cleanText(data.idempotencyKey, 160), allowedActions: CONTENT_ACTIONS,
    transform: async ({ action, targetId, before, canonicalBefore, payload, nowMs, db, tx }) => {
      const iso = new Date(nowMs).toISOString();
      if (action === 'community-submission-decision') {
        const decision = cleanText(payload.decision, 40) as CommunitySubmissionModerationAction;
        if (!['approve', 'reject', 'request_changes'].includes(decision)) throw new HttpsError('invalid-argument', 'invalid submission decision');
        const expected = cleanText(payload.expectedStatus || 'pending', 40);
        if (cleanText(before.status, 40) !== expected) throw new HttpsError('failed-precondition', 'submission_status_changed');
        const result = await applyCommunitySubmissionModerationInTransaction({ db, tx, submissionId: targetId, submission: canonicalBefore, action: decision, moderatorMessage: cleanText(payload.message, 3500), now: nowMs });
        return result.patch;
      }
      if (action === 'community-pack-status') {
        const decision = cleanText(payload.decision || payload.status, 40) as CommunityPackModerationAction;
        if (!['require_revision', 'remove'].includes(decision)) throw new HttpsError('invalid-argument', 'invalid pack decision');
        return applyCommunityPackModerationInTransaction({ db, tx, packId: targetId, pack: canonicalBefore, action: decision, moderatorMessage: cleanText(payload.message, 3500), now: nowMs });
      }
      if (action === 'community-pack-report-status') { const status = cleanText(payload.status, 40); if (!['reviewed', 'resolved'].includes(status)) throw new HttpsError('invalid-argument', 'invalid pack report status'); return { status, reviewNote: cleanText(payload.message, 500), reviewedAt: iso, reviewedByUid: actor.actorUid }; }
      if (action === 'card-pack-draft') { return { title: cleanText(payload.title, 160), category: cleanText(payload.category, 80), status: 'draft', updatedAt: iso, updatedByUid: actor.actorUid }; }
      if (action === 'card-pack-update') { const patch: NativeRow = { updatedAt: iso, updatedByUid: actor.actorUid }; if (typeof payload.title === 'string') patch.title = cleanText(payload.title, 160); if (payload.priceShards !== undefined) { const price = Math.floor(Number(payload.priceShards)); if (price < 0 || price > 1_000_000) throw new HttpsError('invalid-argument', 'invalid priceShards'); patch.priceShards = price; } if (typeof payload.category === 'string') patch.category = cleanText(payload.category, 80); if (typeof payload.status === 'string') { const status = cleanText(payload.status, 40); if (!['draft', 'published', 'unpublished', 'archived'].includes(status)) throw new HttpsError('invalid-argument', 'invalid card pack status'); patch.status = status; } return patch; }
      if (action === 'daily-phrase-draft') { const english = cleanText(payload.english || payload.en, 500); if (!english) throw new HttpsError('invalid-argument', 'english required'); return { english, literal: cleanText(payload.literal, 1000), meaning: cleanText(payload.meaning || payload.ru, 1000), text: cleanText(payload.text, 2000), literal_uk: cleanText(payload.literal_uk, 1000), meaning_uk: cleanText(payload.meaning_uk, 1000), text_uk: cleanText(payload.text_uk, 2000), scheduledDate: '', order: Math.max(1, Math.floor(Number(payload.order) || 1)), active: false, allowSave: payload.allowSave !== false, savedCount: Math.max(0, Number(before.savedCount) || 0), rollbackBefore: before, updatedAt: iso, updatedByUid: actor.actorUid }; }
      if (action === 'daily-phrase-upsert') { const english = cleanText(payload.english || payload.en, 500); const scheduledDate = cleanText(payload.scheduledDate || payload.date, 10); if (!english || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) throw new HttpsError('invalid-argument', 'english and valid scheduledDate required'); return { english, literal: cleanText(payload.literal, 1000), meaning: cleanText(payload.meaning || payload.ru, 1000), text: cleanText(payload.text, 2000), literal_uk: cleanText(payload.literal_uk, 1000), meaning_uk: cleanText(payload.meaning_uk, 1000), text_uk: cleanText(payload.text_uk, 2000), scheduledDate, order: Math.max(1, Math.floor(Number(payload.order) || 1)), active: payload.active !== false, allowSave: payload.allowSave !== false, savedCount: Math.max(0, Number(before.savedCount) || 0), rollbackBefore: before, updatedAt: iso, updatedByUid: actor.actorUid }; }
      if (action === 'daily-phrase-import') {
        const rows = Array.isArray(payload.items) ? payload.items.slice(0, 100).map(asRecord) : [];
        if (!rows.length) throw new HttpsError('invalid-argument', 'import items required');
        const refs = rows.map((row) => db.collection('daily_phrases').doc(cleanText(row.id, 160)));
        if (refs.some((ref) => !ref.id)) throw new HttpsError('invalid-argument', 'every import row requires id');
        const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
        snapshots.forEach((snapshot, index) => {
          const row = rows[index]; const scheduledDate = cleanText(row.scheduledDate || row.date, 10); const english = cleanText(row.english || row.en, 500);
          if (!english || !/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) throw new HttpsError('invalid-argument', 'every import row requires english and valid scheduledDate');
          const expected = cleanText(row.expectedVersion, 160);
          const actual = snapshot.exists ? documentVersion(snapshot.id, snapshot.data()) : 'missing';
          if (!expected) throw new HttpsError('invalid-argument', `daily_phrase_expected_version_required:${snapshot.id}`);
          if (expected !== actual) throw new HttpsError('aborted', `daily_phrase_version_changed:${snapshot.id}`);
          const previous = asRecord(snapshot.data());
          tx.set(snapshot.ref, { english, literal: cleanText(row.literal, 1000), meaning: cleanText(row.meaning || row.ru, 1000), scheduledDate, order: Math.max(1, Math.floor(Number(row.order) || index + 1)), active: row.active !== false, allowSave: row.allowSave !== false, savedCount: Math.max(0, Number(previous.savedCount) || 0), rollbackBefore: previous, updatedAt: iso, updatedByUid: actor.actorUid }, { merge: true });
        });
        return { kind: 'daily-phrase-import', importedAt: iso, importedCount: rows.length, phraseIds: refs.map((ref) => ref.id) };
      }
      if (action === 'daily-phrase-reorder') { const rows = Array.isArray(payload.items) ? payload.items.slice(0, 100).map(asRecord) : []; if (!rows.length) throw new HttpsError('invalid-argument', 'reorder items required'); const snapshots = await Promise.all(rows.map((row) => tx.get(db.collection('daily_phrases').doc(cleanText(row.id, 160))))); snapshots.forEach((snapshot, index) => { if (!snapshot.exists) throw new HttpsError('failed-precondition', 'daily_phrase_missing'); const row = rows[index]; const scheduledDate = cleanText(row.scheduledDate, 10); if (!/^\d{4}-\d{2}-\d{2}$/.test(scheduledDate)) throw new HttpsError('invalid-argument', 'valid scheduledDate required for every reorder row'); const expected = cleanText(row.expectedVersion, 160); if (!expected) throw new HttpsError('invalid-argument', `daily_phrase_expected_version_required:${snapshot.id}`); if (expected !== documentVersion(snapshot.id, snapshot.data())) throw new HttpsError('aborted', `daily_phrase_version_changed:${snapshot.id}`); tx.update(snapshot.ref, { scheduledDate, order: index + 1, rollbackBefore: asRecord(snapshot.data()), updatedAt: iso, updatedByUid: actor.actorUid }); }); return { kind: 'daily-phrase-reorder', reorderedAt: iso, reorderedCount: rows.length, queueIds: rows.map((row) => cleanText(row.id, 160)) }; }
      if (action === 'daily-phrase-rollback') { const rollback = asRecord(before.rollbackBefore); if (!Object.keys(rollback).length) throw new HttpsError('failed-precondition', 'daily_phrase_rollback_unavailable'); const restored = { ...rollback }; delete restored.id; delete restored.version; return { ...restored, rollbackBefore: before, rolledBackAt: iso, rolledBackByUid: actor.actorUid }; }
      if (action === 'french-draft') return { ...payload, studyTarget: 'fr', surface: 'quiz', status: 'HOLD', activationApproved: false, productionReady: false, rolloutPercent: 0, updatedAt: iso, updatedByUid: actor.actorUid };
      if (action === 'french-rollback') return { ...payload, studyTarget: 'fr', surface: 'quiz', status: 'HOLD', activationApproved: false, productionReady: false, deleteHistoricalPayloads: false, updatedAt: iso, updatedByUid: actor.actorUid };
      if (action === 'explain-report-status') { const status = cleanText(payload.status, 40); if (!['new', 'done', 'reviewing', 'resolved', 'dismissed'].includes(status)) throw new HttpsError('invalid-argument', 'invalid report status'); return { status, adminNote: cleanText(payload.adminNote, 500), reviewedAtMs: status === 'done' ? nowMs : before.reviewedAtMs, updatedAtMs: nowMs, updatedByUid: actor.actorUid }; }
      if (action === 'explain-reports-bulk') {
        const rows = Array.isArray(payload.items) ? payload.items.slice(0, 100).map(asRecord) : []; const status = cleanText(payload.status, 40);
        if (!rows.length || !['done', 'reviewing', 'resolved', 'dismissed'].includes(status)) throw new HttpsError('invalid-argument', 'bounded report items and valid status required');
        const refs = rows.map((row) => db.collection('explain_report_entries').doc(cleanText(row.id, 160))); const snapshots = await Promise.all(refs.map((ref) => tx.get(ref)));
        snapshots.forEach((snapshot, index) => { if (!snapshot.exists) throw new HttpsError('failed-precondition', 'explain_report_missing'); const expected = cleanText(rows[index].expectedVersion, 160); if (!expected || expected !== documentVersion(snapshot.id, snapshot.data())) throw new HttpsError('aborted', `explain_report_version_changed:${snapshot.id}`); tx.update(snapshot.ref, { status, adminNote: cleanText(payload.adminNote, 500), updatedAtMs: nowMs, updatedByUid: actor.actorUid }); });
        return { kind: 'explain-reports-bulk', status, updatedCount: rows.length, reportIds: refs.map((ref) => ref.id), completedAtMs: nowMs };
      }
      if (action === 'explain-report-delete' || action === 'explain-cache-delete' || action === 'explain-counter-delete') return { __deleteTarget: true };
      throw new HttpsError('invalid-argument', 'unsupported_content_action');
    },
  });
});

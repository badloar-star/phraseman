import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import {
  SPIRE_TASK_FLAGS_COLLECTION,
  isSpireFlaggableStudyTarget,
  parseSpireTaskFlagsDocStrict,
  spireFlaggedTaskIds,
  spireTaskFlagAdd,
  spireTaskFlagRemove,
  spireTaskFlagsDocId,
} from './spire_task_flag_contract';
import {
  SPIRE_TASK_INCIDENTS_COLLECTION,
  parseSpireTaskIncident,
  planSpireTaskIncidentStateChange,
  spireTaskIncidentId,
  spireTaskIncidentOperationId,
  type SpireTaskIncident,
  type SpireTaskIncidentLang,
  type SpireTaskIncidentState,
} from './spire_task_incident_contract';

type SpireFlaggableLang = 'es' | 'de' | 'fr';
type Row = Record<string, unknown>;

function requireSpireTaskFlagWriter(request: { auth?: { uid?: string; token?: Row } | null }): {
  actorUid: string;
  role: AdminRole;
} {
  const actorUid = String(request.auth?.uid ?? '').trim();
  const token = request.auth?.token;
  if (!actorUid || token?.admin !== true) throw new HttpsError('permission-denied', 'Admin role required');
  const role: AdminRole = hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
  if (!hasPermission(role, 'application.config.write')) {
    throw new HttpsError('permission-denied', 'Role cannot use application.config.write');
  }
  return { actorUid, role };
}

export function requireSpireTaskIncidentReader(request: { auth?: { uid?: string; token?: Row } | null }): {
  actorUid: string;
  role: AdminRole;
} {
  const actorUid = String(request.auth?.uid ?? '').trim();
  const token = request.auth?.token;
  if (!actorUid || token?.admin !== true) throw new HttpsError('permission-denied', 'Admin role required');
  const role: AdminRole = hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
  if (!hasPermission(role, 'reports.read')) {
    throw new HttpsError('permission-denied', 'Role cannot use reports.read');
  }
  return { actorUid, role };
}

function requireLang(data: Row): SpireFlaggableLang {
  const lang = data.lang;
  if (!isSpireFlaggableStudyTarget(lang)) throw new HttpsError('invalid-argument', 'spire_task_flag_lang_invalid');
  return lang;
}

function cleanToken(value: unknown, max = 200): string {
  const out = String(value ?? '').trim().slice(0, max);
  return /^[A-Za-z0-9._:-]+$/u.test(out) ? out : '';
}

function requireTaskId(data: Row, lang: SpireFlaggableLang): string {
  const taskId = cleanToken(data.taskId, 200);
  if (!taskId || !taskId.startsWith(`arena-${lang}-`)) {
    throw new HttpsError('invalid-argument', 'spire_task_incident_task_invalid');
  }
  return taskId;
}

function flagsRef(lang: SpireFlaggableLang, db = admin.firestore()): admin.firestore.DocumentReference {
  return db.collection(SPIRE_TASK_FLAGS_COLLECTION).doc(spireTaskFlagsDocId(lang));
}

function incidentRef(lang: SpireTaskIncidentLang, taskId: string, db = admin.firestore()): admin.firestore.DocumentReference {
  return db.collection(SPIRE_TASK_INCIDENTS_COLLECTION).doc(spireTaskIncidentId(lang, taskId));
}

function cleanReason(value: unknown): string {
  return String(value ?? '').trim().slice(0, 500);
}

function projectIncident(incident: SpireTaskIncident): Row {
  return {
    incidentId: spireTaskIncidentId(incident.studyTarget, incident.taskId),
    id: incident.latestReportId,
    taskId: incident.taskId,
    lang: incident.studyTarget,
    state: incident.state,
    revision: incident.revision,
    reportCount: incident.reportCount,
    latestReportId: incident.latestReportId,
    reason: incident.latestReason,
    createdAtMs: incident.latestReportedAtMs,
    weekId: incident.latestWeekId,
    tier: incident.latestTier,
    packHash: incident.latestPackHash,
    mode: incident.latestMode,
    difficulty: incident.latestDifficulty,
    quarantined: incident.state === 'quarantined',
    quarantineOwner: incident.quarantineOwner,
    manualHoldActive: incident.manualHoldActive,
    manualHoldRemains: incident.state === 'restored' && incident.manualHoldActive,
  };
}

type SpireIncidentPageCursor = Readonly<{ latestReportedAtMs: number; id: string }>;

function encodeSpireIncidentCursor(cursor: SpireIncidentPageCursor): string {
  return Buffer.from(JSON.stringify({ v: 1, ...cursor }), 'utf8').toString('base64url');
}

function decodeSpireIncidentCursor(raw: string): SpireIncidentPageCursor | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as Row;
    const latestReportedAtMs = Number(parsed.latestReportedAtMs);
    const rawId = String(parsed.id ?? '').trim();
    const id = cleanToken(rawId, 204);
    if (parsed.v !== 1 || !Number.isSafeInteger(latestReportedAtMs) || latestReportedAtMs < 1
      || !id || id !== rawId || !/^(?:es|fr|de)__arena-(?:es|fr|de)-[A-Za-z0-9_-]+$/u.test(id)) throw new Error('invalid');
    return { latestReportedAtMs, id };
  } catch {
    throw new HttpsError('invalid-argument', 'spire_task_incident_cursor_invalid');
  }
}

export function requireSpireIncidentCursor(value: unknown): string {
  const cursor = String(value ?? '').trim();
  if (!cursor) return '';
  if (cursor.length > 512 || !/^[A-Za-z0-9_-]+$/u.test(cursor)) {
    throw new HttpsError('invalid-argument', 'spire_task_incident_cursor_invalid');
  }
  decodeSpireIncidentCursor(cursor);
  return cursor;
}

export async function listActionableSpireTaskIncidents(input: Readonly<{
  db: admin.firestore.Firestore;
  lang: SpireFlaggableLang;
  limit: number;
  cursor: string;
}>): Promise<Row> {
  const decoded = decodeSpireIncidentCursor(input.cursor);
  let query: admin.firestore.Query = input.db.collection(SPIRE_TASK_INCIDENTS_COLLECTION)
    .where('studyTarget', '==', input.lang)
    .where('state', '==', 'quarantined')
    .orderBy('latestReportedAtMs', 'desc')
    .orderBy(admin.firestore.FieldPath.documentId(), 'asc');
  if (decoded) query = query.startAfter(decoded.latestReportedAtMs, decoded.id);
  const snapshot = await query.limit(input.limit + 1).get();
  const page = snapshot.docs.slice(0, input.limit);
  const incidents = page.map((snap) => {
    const taskId = snap.id.slice(`${input.lang}__`.length);
    return projectIncident(parseSpireTaskIncident(snap.data(), input.lang, taskId));
  });
  const hasMore = snapshot.size > input.limit;
  const last = page[page.length - 1];
  const lastData = last?.data() as Row | undefined;
  return {
    ok: true,
    lang: input.lang,
    incidents,
    reports: incidents,
    openCount: incidents.length,
    truncated: hasMore,
    nextCursor: hasMore && last && lastData
      ? encodeSpireIncidentCursor({ latestReportedAtMs: Number(lastData.latestReportedAtMs), id: last.id })
      : null,
  };
}

/** Canonical actionable-only, deterministic paginated source for the dedicated Spire queue. */
export const adminSpireTaskReportList = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    requireSpireTaskFlagWriter(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const lang = requireLang(data);
    const cursor = requireSpireIncidentCursor(data.cursor);
    const limit = Math.max(1, Math.min(100, Math.floor(Number(data.limit) || 50)));
    return listActionableSpireTaskIncidents({ db: admin.firestore(), lang, limit, cursor });
  },
);

/** Batch hydration used by the common report queue so every duplicate follows canonical incident state. */
export const adminSpireTaskIncidentStates = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    requireSpireTaskIncidentReader(request as { auth?: { uid?: string; token?: Row } });
    const items = Array.isArray(request.data?.items) ? request.data.items.slice(0, 100) : [];
    if (!items.length) return { ok: true, incidents: [] };
    const parsed: Array<{ lang: SpireFlaggableLang; taskId: string }> = items.map((raw: unknown) => {
      const data = (raw ?? {}) as Row;
      const lang = requireLang(data);
      return { lang, taskId: requireTaskId(data, lang) };
    });
    const db = admin.firestore();
    const snapshots = await db.getAll(...parsed.map(({ lang, taskId }) => incidentRef(lang, taskId)));
    const incidents = snapshots.flatMap((snapshot, index) => {
      if (!snapshot.exists) return [];
      const identity = parsed[index];
      return [projectIncident(parseSpireTaskIncident(snapshot.data(), identity.lang, identity.taskId))];
    });
    return { ok: true, incidents };
  },
);

/** Atomic canonical incident + strict flag + audit + durable operation transition. */
export async function setSpireTaskIncidentStateCore(input: Readonly<{
  db: admin.firestore.Firestore;
  actor: { actorUid: string; role: AdminRole };
  lang: SpireFlaggableLang;
  taskId: string;
  reportId: string;
  nextState: SpireTaskIncidentState;
  expectedRevision: number;
  reason: string;
  nowMs: number;
}>): Promise<Row> {
  const { db, actor, lang, taskId, reportId, nextState, expectedRevision, reason, nowMs } = input;
  const canonicalIncidentRef = incidentRef(lang, taskId, db);
  const flagRef = flagsRef(lang, db);
  const operationId = spireTaskIncidentOperationId(lang, taskId, expectedRevision, nextState);
  const operationRef = db.collection('admin_command_operations').doc(operationId);
  const reportRef = db.collection('error_reports').doc(reportId);
  const auditRef = db.collection('admin_log').doc();
  const fingerprint = JSON.stringify({ lang, taskId, reportId, expectedRevision, nextState });
  return db.runTransaction(async (tx) => {
    const [operationSnap, incidentSnap, flagSnap, reportSnap] = await Promise.all([
      tx.get(operationRef), tx.get(canonicalIncidentRef), tx.get(flagRef), tx.get(reportRef),
    ]);
    if (operationSnap.exists) {
      const operation = operationSnap.data() ?? {};
      if (operation.requestFingerprint !== fingerprint) {
        throw new HttpsError('already-exists', 'spire_task_incident_idempotency_mismatch');
      }
      return { ...(operation.result as Row), replayed: true };
    }
    if (!incidentSnap.exists) throw new HttpsError('not-found', 'spire_task_incident_not_found');
    if (!reportSnap.exists) throw new HttpsError('not-found', 'spire_task_report_not_found');
    const selectedReport = reportSnap.data() ?? {};
    if (selectedReport.contentScope !== 'spire'
      || selectedReport.spireLang !== lang
      || selectedReport.spireTaskId !== taskId) {
      throw new HttpsError('failed-precondition', 'spire_task_report_incident_mismatch');
    }
    const incident = parseSpireTaskIncident(incidentSnap.data(), lang, taskId);
    if (incident.revision !== expectedRevision) {
      throw new HttpsError('aborted', 'spire_task_incident_revision_changed');
    }
    const flags = parseSpireTaskFlagsDocStrict(flagSnap.exists ? flagSnap.data() : null, lang);
    let transition;
    try {
      transition = planSpireTaskIncidentStateChange({
        incident, nextState, actorUid: actor.actorUid, nowMs, flags,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'spire_task_incident_invalid';
      throw new HttpsError('failed-precondition', message);
    }
    const result = {
      ok: true, lang, taskId, nextState, revision: transition.incident.revision,
      reportCount: transition.incident.reportCount, latestReportId: transition.incident.latestReportId,
      quarantined: nextState === 'quarantined', quarantineOwner: transition.incident.quarantineOwner,
      manualHoldActive: transition.incident.manualHoldActive,
      manualHoldRemains: nextState === 'restored' && transition.incident.manualHoldActive,
      auditId: auditRef.id, operationId,
    };
    tx.set(canonicalIncidentRef, transition.incident);
    if (transition.nextFlags !== flags) tx.set(flagRef, transition.nextFlags);
    tx.update(reportRef, nextState === 'restored' ? {
      status: 'fixed',
      fixedAt: new Date(nowMs).toISOString(),
      fixedAtMs: nowMs,
      adminStatusUpdatedAtMs: nowMs,
      adminStatusUpdatedBy: actor.actorUid,
    } : {
      status: 'open',
      fixedAt: null,
      fixedAtMs: null,
      adminStatusUpdatedAtMs: nowMs,
      adminStatusUpdatedBy: actor.actorUid,
    });
    tx.create(auditRef, createAuditRecord({
      action: nextState === 'restored' ? 'spire_task_incident_restore' : 'spire_task_incident_reopen',
      actorUid: actor.actorUid, role: actor.role,
      entity: { collection: SPIRE_TASK_INCIDENTS_COLLECTION, id: canonicalIncidentRef.id }, reason,
      before: { state: incident.state, revision: incident.revision, reportCount: incident.reportCount, selectedReportStatus: selectedReport.status ?? null },
      after: { state: transition.incident.state, revision: transition.incident.revision, selectedReportStatus: nextState === 'restored' ? 'fixed' : 'open' },
      requestId: operationId, timestamp: new Date(nowMs).toISOString(),
    }));
    tx.create(operationRef, {
      operationId, requestFingerprint: fingerprint, actorUid: actor.actorUid, result,
      auditId: auditRef.id, createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { ...result, replayed: false };
  });
}

export const adminSpireTaskIncidentSetState = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireSpireTaskFlagWriter(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const lang = requireLang(data);
    const taskId = requireTaskId(data, lang);
    const reportId = cleanToken(data.reportId, 160);
    const nextState = String(data.nextState ?? '').trim() as SpireTaskIncidentState;
    const expectedRevision = Number(data.expectedRevision);
    const reason = cleanReason(data.reason);
    if ((nextState !== 'restored' && nextState !== 'quarantined')
      || !Number.isSafeInteger(expectedRevision)
      || expectedRevision < 1
      || !reportId
      || !reason) {
      throw new HttpsError('invalid-argument', 'spire_task_incident_fields_required');
    }
    const nowMs = Date.now();
    return setSpireTaskIncidentStateCore({
      db: admin.firestore(), actor, lang, taskId, reportId, nextState, expectedRevision, reason, nowMs,
    });
  },
);

export const adminSpireTaskFlagList = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    requireSpireTaskFlagWriter(request as { auth?: { uid?: string; token?: Row } });
    const lang = requireLang((request.data ?? {}) as Row);
    const snap = await flagsRef(lang).get();
    const doc = parseSpireTaskFlagsDocStrict(snap.exists ? snap.data() : null, lang);
    return { ok: true, lang, flaggedTaskIds: spireFlaggedTaskIds(doc), flagged: doc.flagged };
  },
);

export const adminSpireTaskFlagAdd = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireSpireTaskFlagWriter(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const lang = requireLang(data);
    const taskId = requireTaskId(data, lang);
    const reason = cleanReason(data.reason);
    if (!reason) throw new HttpsError('invalid-argument', 'spire_task_flag_reason_required');
    const db = admin.firestore();
    const ref = flagsRef(lang);
    const canonicalIncidentRef = incidentRef(lang, taskId);
    const auditRef = db.collection('admin_log').doc();
    const nowMs = Date.now();
    const result = await db.runTransaction(async (tx) => {
      const [before, incidentSnap] = await Promise.all([tx.get(ref), tx.get(canonicalIncidentRef)]);
      if (incidentSnap.exists) {
        throw new HttpsError('failed-precondition', 'spire_task_incident_requires_verified_reopen');
      }
      const beforeDoc = parseSpireTaskFlagsDocStrict(before.exists ? before.data() : null, lang);
      const nextDoc = spireTaskFlagAdd(beforeDoc, {
        taskId, reason, flaggedAtMs: nowMs, flaggedByUid: actor.actorUid,
      });
      tx.set(ref, nextDoc);
      tx.create(auditRef, createAuditRecord({
        action: 'spire_task_flag_add', actorUid: actor.actorUid, role: actor.role,
        entity: { collection: SPIRE_TASK_FLAGS_COLLECTION, id: spireTaskFlagsDocId(lang) },
        reason,
        before: { flaggedCount: spireFlaggedTaskIds(beforeDoc).length },
        after: { flaggedCount: spireFlaggedTaskIds(nextDoc).length, taskId },
        requestId: auditRef.id, timestamp: new Date(nowMs).toISOString(),
      }));
      return nextDoc;
    });
    return { ok: true, lang, flaggedTaskIds: spireFlaggedTaskIds(result) };
  },
);

export async function removeSpireTaskFlagCore(input: Readonly<{
  db: admin.firestore.Firestore;
  actor: { actorUid: string; role: AdminRole };
  lang: SpireFlaggableLang;
  taskId: string;
  reason: string;
  nowMs: number;
}>): Promise<Row> {
  const { db, actor, lang, taskId, reason, nowMs } = input;
  const ref = flagsRef(lang, db);
  const canonicalIncidentRef = incidentRef(lang, taskId, db);
  const auditRef = db.collection('admin_log').doc();
  return db.runTransaction(async (tx) => {
    const [before, incidentSnap] = await Promise.all([tx.get(ref), tx.get(canonicalIncidentRef)]);
    const incident = incidentSnap.exists
      ? parseSpireTaskIncident(incidentSnap.data(), lang, taskId)
      : null;
    if (incident?.state === 'quarantined') {
      throw new HttpsError('failed-precondition', 'spire_task_incident_requires_verified_restore');
    }
    const beforeDoc = parseSpireTaskFlagsDocStrict(before.exists ? before.data() : null, lang);
    const nextDoc = spireTaskFlagRemove(beforeDoc, taskId);
    const clearsManualHold = incident?.manualHoldActive === true;
    const nextIncident: SpireTaskIncident | null = clearsManualHold && incident
      ? Object.freeze({
        ...incident,
        manualHoldActive: false,
        revision: incident.revision + 1,
        updatedAtMs: nowMs,
      })
      : incident;
    if (nextDoc !== beforeDoc) tx.set(ref, nextDoc);
    if (clearsManualHold && nextIncident) tx.set(canonicalIncidentRef, nextIncident);
    if (nextDoc !== beforeDoc || clearsManualHold) {
      tx.create(auditRef, createAuditRecord({
        action: 'spire_task_flag_remove', actorUid: actor.actorUid, role: actor.role,
        entity: { collection: SPIRE_TASK_FLAGS_COLLECTION, id: spireTaskFlagsDocId(lang) },
        reason,
        before: {
          flaggedCount: spireFlaggedTaskIds(beforeDoc).length,
          taskId,
          manualHoldActive: incident?.manualHoldActive === true,
          incidentRevision: incident?.revision ?? null,
        },
        after: {
          flaggedCount: spireFlaggedTaskIds(nextDoc).length,
          manualHoldActive: nextIncident?.manualHoldActive === true,
          incidentRevision: nextIncident?.revision ?? null,
        },
        requestId: auditRef.id, timestamp: new Date(nowMs).toISOString(),
      }));
    }
    return {
      ok: true,
      lang,
      flaggedTaskIds: spireFlaggedTaskIds(nextDoc),
      revision: nextIncident?.revision ?? null,
      quarantineOwner: nextIncident?.quarantineOwner ?? null,
      manualHoldActive: nextIncident?.manualHoldActive === true,
      manualHoldRemains: nextIncident?.state === 'restored' && nextIncident.manualHoldActive,
    };
  });
}

export const adminSpireTaskFlagRemove = onCall(
  ADMIN_SENSITIVE_WRITE_OPTIONS,
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireSpireTaskFlagWriter(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const lang = requireLang(data);
    const taskId = requireTaskId(data, lang);
    const reason = cleanReason(data.reason) || 'unflag';
    const db = admin.firestore();
    const nowMs = Date.now();
    return removeSpireTaskFlagCore({ db, actor, lang, taskId, reason, nowMs });
  },
);

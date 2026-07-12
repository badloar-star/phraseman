import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { createAuditRecord } from './admin/audit_contract';
import { hasPermission, resolveAdminRole } from './admin/permissions';
import { ENFORCE_APP_CHECK } from './callable_options';
import {
  normalizeEmailContactEmail,
  projectEmailContactForAdmin,
  type EmailBulkEligibility,
  type EmailContactSource,
} from './email_contacts';
import { loadSuppressedEmails } from './email_unsubscribe';

if (admin.apps.length === 0) admin.initializeApp();

const REGION = 'us-central1';
const DIRECTORY_SCAN_LIMIT = 10_001;
const EXPORT_LIMIT = 5_000;

type Row = Record<string, unknown>;

export interface EmailDirectoryRequest {
  view: 'default' | 'legacy_table';
  source: 'all' | EmailContactSource;
  eligibility: 'all' | EmailBulkEligibility;
  suppression: 'all' | 'active' | 'suppressed';
  query: string;
  pageSize: number;
  cursor: string;
}

export interface RawEmailDirectoryRow {
  id: string;
  data: Row;
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

export function parseEmailDirectoryRequest(value: unknown): EmailDirectoryRequest {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
  const source = ['app', 'site'].includes(String(raw.source)) ? String(raw.source) as EmailContactSource : 'all';
  const eligibility = ['eligible', 'ineligible', 'unknown'].includes(String(raw.eligibility))
    ? String(raw.eligibility) as EmailBulkEligibility
    : 'all';
  const suppression = ['active', 'suppressed'].includes(String(raw.suppression))
    ? String(raw.suppression) as 'active' | 'suppressed'
    : 'all';
  const requestedPageSize = Number(raw.pageSize ?? 50);
  const view = raw.view === 'legacy_table' ? 'legacy_table' : 'default';
  const maximumPageSize = view === 'legacy_table' ? 1_000 : 200;
  const pageSize = Number.isFinite(requestedPageSize)
    ? Math.max(1, Math.min(maximumPageSize, Math.floor(requestedPageSize)))
    : 50;
  return {
    view,
    source,
    eligibility,
    suppression,
    pageSize,
    cursor: clean(raw.cursor, 160),
    query: clean(raw.query, 160).toLowerCase(),
  };
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => clean(item, 200)).filter(Boolean) : [];
}

function searchText(data: Row): string {
  return [
    data.email,
    data.lowerEmail,
    data.displayName,
    data.appLastDisplayName,
    data.contextLabel,
    data.appLastProvider,
    data.siteLastProvider,
    ...stringList(data.appStableIds),
    ...stringList(data.appProviderUids),
    ...stringList(data.siteOrderIds),
  ].map((value) => clean(value, 320).toLowerCase()).filter(Boolean).join(' ');
}

function sourcesOf(data: Row): EmailContactSource[] {
  return Array.isArray(data.sources)
    ? data.sources.filter((source): source is EmailContactSource => source === 'app' || source === 'site')
    : [];
}

function eligibilityOf(data: Row): EmailBulkEligibility {
  return ['eligible', 'ineligible', 'unknown'].includes(String(data.bulkEligibility))
    ? String(data.bulkEligibility) as EmailBulkEligibility
    : 'unknown';
}

function lastSeenOf(data: Row): number {
  const value = Number(data.lastSeenAtMs ?? 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function selectEmailDirectoryPage(
  rawRows: readonly RawEmailDirectoryRow[],
  request: EmailDirectoryRequest,
  suppressedEmails: ReadonlySet<string>,
) {
  const normalized = rawRows
    .filter((row) => !!normalizeEmailContactEmail(row.data.email ?? row.data.lowerEmail))
    .slice()
    .sort((left, right) => lastSeenOf(right.data) - lastSeenOf(left.data) || left.id.localeCompare(right.id));
  const counts = {
    all: normalized.length,
    app: normalized.filter((row) => sourcesOf(row.data).includes('app')).length,
    site: normalized.filter((row) => sourcesOf(row.data).includes('site')).length,
    eligible: normalized.filter((row) => eligibilityOf(row.data) === 'eligible').length,
    suppressed: normalized.filter((row) => suppressedEmails.has(normalizeEmailContactEmail(row.data.email ?? row.data.lowerEmail) || '')).length,
  };
  const filtered = normalized.filter((row) => {
    const email = normalizeEmailContactEmail(row.data.email ?? row.data.lowerEmail) || '';
    const suppressed = suppressedEmails.has(email);
    if (request.source !== 'all' && !sourcesOf(row.data).includes(request.source)) return false;
    if (request.eligibility !== 'all' && eligibilityOf(row.data) !== request.eligibility) return false;
    if (request.suppression === 'active' && suppressed) return false;
    if (request.suppression === 'suppressed' && !suppressed) return false;
    return !request.query || searchText(row.data).includes(request.query);
  });
  const cursorIndex = request.cursor ? filtered.findIndex((row) => row.id === request.cursor) : -1;
  const start = cursorIndex >= 0 ? cursorIndex + 1 : 0;
  const selected = filtered.slice(start, start + request.pageSize);
  const hasMore = start + selected.length < filtered.length;
  return {
    items: selected.map((row) => projectEmailContactForAdmin(row.id, row.data, suppressedEmails)),
    counts,
    filteredCount: filtered.length,
    nextCursor: hasMore && selected.length ? selected[selected.length - 1].id : null,
  };
}

function roleFor(request: { auth?: { token?: unknown; uid: string } }) {
  const token = request.auth?.token && typeof request.auth.token === 'object'
    ? request.auth.token as Row
    : {};
  const role = resolveAdminRole(token);
  if (!request.auth || !role) throw new HttpsError('permission-denied', 'Admin only');
  return role;
}

async function readEmailDirectory(db: FirebaseFirestore.Firestore): Promise<RawEmailDirectoryRow[]> {
  const snap = await db.collection('email_contacts').limit(DIRECTORY_SCAN_LIMIT).get();
  if (snap.size >= DIRECTORY_SCAN_LIMIT) {
    throw new HttpsError('resource-exhausted', 'email directory exceeds safe scan limit');
  }
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Row }));
}

function requireMutationFields(data: Row): { reason: string; requestId: string; idempotencyKey: string } {
  const reason = clean(data.reason, 500);
  const requestId = clean(data.requestId, 160);
  const idempotencyKey = clean(data.idempotencyKey, 160);
  if (!reason || !requestId || !idempotencyKey) {
    throw new HttpsError('invalid-argument', 'reason, requestId and idempotencyKey are required');
  }
  return { reason, requestId, idempotencyKey };
}

export const adminListEmailContacts = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 90, memory: '512MiB' },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'emails.directory.read')) throw new HttpsError('permission-denied', 'Role cannot read email contacts');
    const parsed = parseEmailDirectoryRequest(request.data);
    const db = admin.firestore();
    const [rows, suppressed] = await Promise.all([readEmailDirectory(db), loadSuppressedEmails(db)]);
    return { ok: true, ...selectEmailDirectoryPage(rows, parsed, suppressed), fetchedAtMs: Date.now() };
  },
);

export const adminExportEmailContacts = onCall(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, timeoutSeconds: 90, memory: '512MiB' },
  async (request) => {
    const role = roleFor(request);
    if (!hasPermission(role, 'emails.directory.export')) throw new HttpsError('permission-denied', 'Role cannot export email contacts');
    const data = request.data && typeof request.data === 'object' && !Array.isArray(request.data) ? request.data as Row : {};
    const fields = requireMutationFields(data);
    const parsed = parseEmailDirectoryRequest({ ...data, pageSize: 200, cursor: '' });
    const db = admin.firestore();
    const [rows, suppressed] = await Promise.all([readEmailDirectory(db), loadSuppressedEmails(db)]);
    const first = selectEmailDirectoryPage(rows, parsed, suppressed);
    if (first.filteredCount > EXPORT_LIMIT) throw new HttpsError('resource-exhausted', `email export exceeds ${EXPORT_LIMIT} contacts`);
    const emails: string[] = [];
    let page = first;
    while (true) {
      emails.push(...page.items.map((item) => item.email));
      if (!page.nextCursor) break;
      page = selectEmailDirectoryPage(rows, { ...parsed, cursor: page.nextCursor }, suppressed);
    }
    const audit = createAuditRecord({
      action: 'email_directory.export',
      actorUid: request.auth!.uid,
      role,
      entity: { collection: 'email_contacts', id: 'filtered-export' },
      reason: fields.reason,
      before: {},
      after: { source: parsed.source, eligibility: parsed.eligibility, suppression: parsed.suppression, query: parsed.query, count: emails.length },
      requestId: fields.requestId,
      timestamp: new Date().toISOString(),
    });
    const actorUid = request.auth!.uid;
    const fingerprint = JSON.stringify({ source: parsed.source, eligibility: parsed.eligibility, suppression: parsed.suppression, query: parsed.query });
    const operationRef = db.collection('admin_command_operations').doc(fields.idempotencyKey);
    const auditRef = db.collection('admin_log').doc();
    const replayed = await db.runTransaction(async (tx) => {
      const operationSnap = await tx.get(operationRef);
      if (operationSnap.exists) {
        const operation = operationSnap.data() ?? {};
        if (clean(operation.actorUid, 160) !== actorUid || clean(operation.requestFingerprint, 500) !== fingerprint) {
          throw new HttpsError('already-exists', 'idempotency conflict');
        }
        return true;
      }
      tx.create(auditRef, { ...audit, operationId: fields.idempotencyKey });
      tx.create(operationRef, {
        actorUid,
        requestFingerprint: fingerprint,
        auditId: auditRef.id,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return false;
    });
    return { ok: true, emails, count: emails.length, replayed };
  },
);

import { isApplePrivateRelayEmail, normalizeEmailContactEmail, type EmailBulkEligibility, type EmailContactSource } from './email_contacts';
import { isPremiumActive, toMillis } from './admin_push_jobs';

const ACTIVE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

type Row = Record<string, unknown>;
export type EmailAudienceKind = 'current' | 'all' | 'plus' | 'active' | 'free' | 'dormant' | 'app' | 'site';

export interface EmailAudienceDefinition {
  kind: EmailAudienceKind;
  filter?: {
    source?: 'all' | EmailContactSource;
    eligibility?: 'all' | EmailBulkEligibility;
    suppression?: 'all' | 'active' | 'suppressed';
    query?: string;
  };
}

export interface EmailCampaignDraft {
  subject: string;
  text: string;
  audience: EmailAudienceDefinition;
}

export interface EmailAudienceCandidate {
  contactId: string;
  email: string;
  sources: EmailContactSource[];
  bulkEligibility: EmailBulkEligibility;
  premiumActive: boolean;
  lastActiveAtMs: number;
  identityHidden: boolean;
  searchText?: string;
}

export interface RawEmailCampaignRow {
  id: string;
  data: Row;
}

function row(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function clean(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => clean(item, 200)).filter(Boolean) : [];
}

function contactSources(value: unknown): EmailContactSource[] {
  return Array.isArray(value)
    ? value.filter((source): source is EmailContactSource => source === 'app' || source === 'site')
    : [];
}

export function buildEmailAudienceCandidates(
  contactRows: readonly RawEmailCampaignRow[],
  userRows: readonly RawEmailCampaignRow[],
  nowMs = Date.now(),
): EmailAudienceCandidate[] {
  const usersById = new Map(userRows.map((user) => [user.id, user]));
  const usersByEmail = new Map<string, RawEmailCampaignRow[]>();
  for (const user of userRows) {
    const linked = row(user.data.linkedAuth);
    const email = normalizeEmailContactEmail(linked.email ?? user.data.email ?? user.data.lowerEmail);
    if (!email) continue;
    const list = usersByEmail.get(email) ?? [];
    list.push(user);
    usersByEmail.set(email, list);
  }
  return contactRows.map((contact) => {
    const email = normalizeEmailContactEmail(contact.data.email ?? contact.data.lowerEmail) || '';
    const linkedIds = [...stringList(contact.data.appStableIds), ...stringList(contact.data.appProviderUids)];
    const linkedUsers = [...new Set([
      ...linkedIds.map((id) => usersById.get(id)).filter((item): item is RawEmailCampaignRow => !!item),
      ...(usersByEmail.get(email) ?? []),
    ])];
    const eligibility = ['eligible', 'ineligible', 'unknown'].includes(String(contact.data.bulkEligibility))
      ? String(contact.data.bulkEligibility) as EmailBulkEligibility
      : 'unknown';
    const lastActiveAtMs = Math.max(
      toMillis(contact.data.appLastSignInAt),
      ...linkedUsers.map((user) => toMillis(user.data.last_active_at ?? user.data.lastActiveAt ?? user.data.updatedAt)),
    );
    return {
      contactId: contact.id,
      email,
      sources: contactSources(contact.data.sources),
      bulkEligibility: eligibility,
      premiumActive: linkedUsers.some((user) => isPremiumActive(user.data, nowMs)),
      lastActiveAtMs,
      identityHidden: linkedUsers.some((user) => user.data.identityHidden === true),
      searchText: [email, contact.data.displayName, contact.data.appLastDisplayName, contact.data.contextLabel, ...linkedIds, ...stringList(contact.data.siteOrderIds)].map((value) => clean(value, 320).toLowerCase()).filter(Boolean).join(' '),
    };
  });
}

async function readCampaignRows(db: FirebaseFirestore.Firestore, collectionName: string): Promise<RawEmailCampaignRow[]> {
  const out: RawEmailCampaignRow[] = [];
  let lastDoc: FirebaseFirestore.QueryDocumentSnapshot | null = null;
  while (true) {
    let query: FirebaseFirestore.Query = db.collection(collectionName).orderBy('__name__').limit(500);
    if (lastDoc) query = query.startAfter(lastDoc);
    const snap = await query.get();
    if (snap.empty) break;
    out.push(...snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as Row })));
    lastDoc = snap.docs[snap.docs.length - 1] ?? null;
    if (snap.size < 500) break;
    if (out.length > 50_000) throw new Error(`${collectionName}_scan_limit`);
  }
  return out;
}

export async function readEmailAudienceCandidates(db: FirebaseFirestore.Firestore, nowMs = Date.now()): Promise<EmailAudienceCandidate[]> {
  const [contacts, users] = await Promise.all([
    readCampaignRows(db, 'email_contacts'),
    readCampaignRows(db, 'users'),
  ]);
  return buildEmailAudienceCandidates(contacts, users, nowMs);
}

export function parseEmailCampaignDraft(value: unknown): EmailCampaignDraft {
  const raw = row(value);
  if (Array.isArray(raw.emails) || typeof raw.emails === 'string' || Array.isArray(raw.recipients)) {
    throw new Error('raw_recipients_forbidden');
  }
  const subject = clean(raw.subject, 140);
  const text = clean(raw.text, 6000);
  if (subject.length < 3) throw new Error('subject_required');
  if (text.length < 10) throw new Error('text_required');
  const rawAudience = row(raw.audience);
  const kind = clean(rawAudience.kind, 24) as EmailAudienceKind;
  if (!['current', 'all', 'plus', 'active', 'free', 'dormant', 'app', 'site'].includes(kind)) throw new Error('invalid_audience');
  const audience: EmailAudienceDefinition = { kind };
  if (kind === 'current') {
    const rawFilter = row(rawAudience.filter);
    audience.filter = {
      source: ['app', 'site'].includes(String(rawFilter.source)) ? String(rawFilter.source) as EmailContactSource : 'all',
      eligibility: ['eligible', 'ineligible', 'unknown'].includes(String(rawFilter.eligibility)) ? String(rawFilter.eligibility) as EmailBulkEligibility : 'all',
      suppression: ['active', 'suppressed'].includes(String(rawFilter.suppression)) ? String(rawFilter.suppression) as 'active' | 'suppressed' : 'all',
      query: clean(rawFilter.query, 160).toLowerCase(),
    };
  }
  return { subject, text, audience };
}

function matchesAudience(candidate: EmailAudienceCandidate, audience: EmailAudienceDefinition, nowMs: number): boolean {
  const active = candidate.lastActiveAtMs > 0 && nowMs - candidate.lastActiveAtMs <= ACTIVE_WINDOW_MS;
  switch (audience.kind) {
    case 'plus': return candidate.premiumActive;
    case 'active': return active;
    case 'free': return candidate.sources.includes('app') && !candidate.premiumActive;
    case 'dormant': return candidate.sources.includes('app') && candidate.lastActiveAtMs > 0 && !active;
    case 'app': return candidate.sources.includes('app');
    case 'site': return candidate.sources.includes('site');
    case 'current': {
      const filter = audience.filter ?? {};
      if (filter.source && filter.source !== 'all' && !candidate.sources.includes(filter.source)) return false;
      if (filter.eligibility && filter.eligibility !== 'all' && candidate.bulkEligibility !== filter.eligibility) return false;
      if (filter.query && !String(candidate.searchText || candidate.email).includes(filter.query)) return false;
      return true;
    }
    case 'all':
    default: return true;
  }
}

export function selectEmailCampaignAudience(
  candidates: readonly EmailAudienceCandidate[],
  audience: EmailAudienceDefinition,
  suppressedEmails: ReadonlySet<string>,
  nowMs = Date.now(),
) {
  const matched = candidates.filter((candidate) => matchesAudience(candidate, audience, nowMs));
  const recipients: EmailAudienceCandidate[] = [];
  const seen = new Set<string>();
  const summary = { directoryMatched: matched.length, recipientCount: 0, suppressed: 0, unknownPurpose: 0, ineligible: 0, hidden: 0, relay: 0, invalid: 0, duplicates: 0 };
  for (const candidate of matched) {
    const email = normalizeEmailContactEmail(candidate.email);
    if (!email) { summary.invalid += 1; continue; }
    if (isApplePrivateRelayEmail(email) && candidate.sources.includes('app')) { summary.relay += 1; continue; }
    if (candidate.identityHidden) { summary.hidden += 1; continue; }
    if (candidate.bulkEligibility === 'unknown') { summary.unknownPurpose += 1; continue; }
    if (candidate.bulkEligibility !== 'eligible') { summary.ineligible += 1; continue; }
    if (suppressedEmails.has(email)) { summary.suppressed += 1; continue; }
    if (seen.has(email)) { summary.duplicates += 1; continue; }
    seen.add(email);
    recipients.push({ ...candidate, email });
  }
  summary.recipientCount = recipients.length;
  return { recipients, summary };
}

export function buildEmailPreviewPlan(
  previewId: string,
  draft: EmailCampaignDraft,
  selection: ReturnType<typeof selectEmailCampaignAudience>,
  actorUid: string,
  nowMs = Date.now(),
  shardSize = 100,
) {
  const safeShardSize = Math.max(1, Math.min(200, Math.floor(shardSize)));
  const shards: Array<{ id: string; contactIds: string[]; count: number }> = [];
  for (let index = 0; index < selection.recipients.length; index += safeShardSize) {
    const contactIds = selection.recipients.slice(index, index + safeShardSize).map((item) => item.contactId);
    shards.push({ id: String(shards.length).padStart(4, '0'), contactIds, count: contactIds.length });
  }
  const expiresAtMs = nowMs + 24 * 60 * 60 * 1000;
  const document = {
    actorUid: clean(actorUid, 160),
    subject: draft.subject,
    text: draft.text,
    audience: draft.audience,
    summary: selection.summary,
    recipientCount: selection.recipients.length,
    shardCount: shards.length,
    createdAtMs: nowMs,
    expiresAtMs,
  };
  const response = {
    ok: true,
    previewId: clean(previewId, 160),
    content: { subject: draft.subject, text: draft.text },
    audience: draft.audience,
    summary: selection.summary,
    recipientCount: selection.recipients.length,
    generatedAtMs: nowMs,
    expiresAtMs,
    requiresApproval: true,
  };
  return { document, shards, response };
}

export function emailCampaignCancellationTarget(status: unknown): 'cancelled' | 'cancel_requested' | null {
  if (status === 'queued_hold') return 'cancelled';
  if (status === 'processing') return 'cancel_requested';
  return null;
}

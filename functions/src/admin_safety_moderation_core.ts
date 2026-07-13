type Row = Record<string, unknown>;

const REPORT_STATUSES = new Set(['new', 'reviewed', 'banned', 'archived']);
const SAFETY_CATEGORIES = new Set(['suicide', 'self_harm', 'abuse', 'violence', 'sexual_minors', 'sexual', 'hate', 'illicit']);
const AGE_BRACKETS = new Set(['adult', 'teen_safe', 'under13', 'unknown']);
const ANALYTICS_CONSENT = new Set(['granted', 'denied', 'unknown']);

function record(value: unknown): Row {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {};
}

function text(value: unknown, max = 2_000): string {
  return String(value ?? '').trim().slice(0, max);
}

function lower(value: unknown, max = 2_000): string {
  return text(value, max).toLowerCase();
}

function booleanOrNull(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function timestampMs(value: unknown): number {
  if (value && typeof value === 'object' && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    const result = Number((value as { toMillis: () => number }).toMillis());
    return Number.isFinite(result) && result > 0 ? Math.floor(result) : 0;
  }
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? Math.max(0, value.getTime()) : 0;
  if (typeof value === 'string' && value.trim() && !/^\d+$/.test(value.trim())) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return Math.max(0, parsed);
  }
  const result = Number(value);
  return Number.isFinite(result) && result > 0 ? Math.floor(result) : 0;
}

function normalizedEnum(value: unknown, allowed: ReadonlySet<string>, fallback: string): string {
  const normalized = lower(value, 80);
  return allowed.has(normalized) ? normalized : fallback;
}

export type SafetyModerationView = 'overview' | 'user-reports' | 'safety-flags' | 'age-consent' | 'policy-evidence' | 'ban-list' | 'other-reports';
export type SourceStatus = 'ready' | 'partial' | 'error';

export interface UserReportSummary {
  id: string;
  reportedUid: string;
  reportedName: string;
  reporterUid: string;
  reason: string;
  status: string;
  screen: string;
  platform: string;
  appVersion: string;
  createdAtMs: number;
}

export interface SafetyFlagSummary {
  id: string;
  uid: string;
  category: string;
  handled: boolean;
  ageBracket: string;
  mode: string;
  matchedTerm: string;
  textPreview: string;
  createdAtMs: number;
  disposition: string;
  handledBy: string;
  handledAtMs: number;
}

export interface ConsentAggregateInput {
  ageBracket: string;
  analyticsConsent: string;
  legalAccepted: boolean | null;
  platform: string;
  policyVersion: string;
  updatedAtMs: number;
}

export type BanConsistency = 'consistent' | 'inconsistent' | 'unavailable';

export interface BanSummary {
  uid: string;
  name: string;
  reason: string;
  bannedAtMs: number;
  bannedBy: string;
  usersBanned: boolean | null;
  leaderboardPresent: boolean | null;
  chatRestricted: boolean | null;
  consistency: BanConsistency;
}

export function projectUserReport(id: string, value: unknown): Readonly<UserReportSummary> {
  const row = record(value);
  return Object.freeze({
    id: text(id, 180),
    reportedUid: text(row.reportedUid ?? row.targetUid ?? row.uid, 180),
    reportedName: text(row.reportedName ?? row.targetName ?? row.name, 160),
    reporterUid: text(row.reporterUid, 180),
    reason: lower(row.reason, 80) || 'unknown',
    status: normalizedEnum(row.status, REPORT_STATUSES, 'new'),
    screen: lower(row.screen, 80),
    platform: lower(row.platform, 30),
    appVersion: text(row.appVersion, 80),
    createdAtMs: timestampMs(row.createdAtMs ?? row.createdAt),
  });
}

export function projectSafetyFlagSummary(id: string, value: unknown): Readonly<SafetyFlagSummary> {
  const row = record(value);
  return Object.freeze({
    id: text(id, 180),
    uid: text(row.uid ?? row.userId, 180),
    category: normalizedEnum(row.category, SAFETY_CATEGORIES, 'unknown'),
    handled: row.handled === true,
    ageBracket: normalizedEnum(row.ageBracket, AGE_BRACKETS, 'unknown'),
    mode: lower(row.mode, 80),
    matchedTerm: text(row.matchedTerm ?? row.term, 160),
    textPreview: text(row.userText ?? row.text, 120),
    createdAtMs: timestampMs(row.createdAtMs ?? row.createdAt),
    disposition: lower(row.disposition, 80),
    handledBy: text(row.handledBy, 180),
    handledAtMs: timestampMs(row.handledAtMs ?? row.handledAt),
  });
}

export function projectConsentAggregateInput(_id: string, value: unknown): Readonly<ConsentAggregateInput> {
  const row = record(value);
  return Object.freeze({
    ageBracket: normalizedEnum(row.ageBracket, AGE_BRACKETS, 'unknown'),
    analyticsConsent: normalizedEnum(row.analyticsConsent, ANALYTICS_CONSENT, 'unknown'),
    legalAccepted: booleanOrNull(row.legalAccepted),
    platform: lower(row.platform, 30) || 'unknown',
    policyVersion: text(row.policyVersion ?? row.termsVersion, 80),
    updatedAtMs: timestampMs(row.updatedAtMs ?? row.updatedAt),
  });
}

function inferBanConsistency(usersBanned: boolean | null, leaderboardPresent: boolean | null): BanConsistency {
  if (usersBanned == null || leaderboardPresent == null) return 'unavailable';
  return usersBanned === true && leaderboardPresent === false ? 'consistent' : 'inconsistent';
}

export function projectBanSummary(id: string, value: unknown): Readonly<BanSummary> {
  const row = record(value);
  const usersBanned = booleanOrNull(row.usersBanned);
  const leaderboardPresent = booleanOrNull(row.leaderboardPresent);
  return Object.freeze({
    uid: text(row.uid ?? id, 180),
    name: text(row.name, 160),
    reason: text(row.reason, 500),
    bannedAtMs: timestampMs(row.bannedAtMs ?? row.bannedAt),
    bannedBy: text(row.bannedBy, 180),
    usersBanned,
    leaderboardPresent,
    chatRestricted: booleanOrNull(row.chatRestricted),
    consistency: inferBanConsistency(usersBanned, leaderboardPresent),
  });
}

export function filterUserReportSummaries(rows: readonly Readonly<UserReportSummary>[], filters: { status?: unknown; reason?: unknown; query?: unknown }): Readonly<UserReportSummary>[] {
  const status = lower(filters.status, 30);
  const reason = lower(filters.reason, 80);
  const query = lower(filters.query, 200);
  return rows.filter((row) => (!status || status === 'all' || row.status === status)
    && (!reason || reason === 'all' || row.reason === reason)
    && (!query || [row.id, row.reportedUid, row.reportedName, row.reporterUid, row.reason, row.screen].join(' ').toLowerCase().includes(query)));
}

export function filterSafetyFlagSummaries(rows: readonly Readonly<SafetyFlagSummary>[], filters: { status?: unknown; category?: unknown; query?: unknown }): Readonly<SafetyFlagSummary>[] {
  const status = lower(filters.status, 30);
  const category = lower(filters.category, 80);
  const query = lower(filters.query, 200);
  return rows.filter((row) => (!status || status === 'all' || (status === 'open' ? !row.handled : status === 'handled' ? row.handled : true))
    && (!category || category === 'all' || row.category === category)
    && (!query || [row.id, row.uid, row.category, row.mode, row.matchedTerm, row.textPreview].join(' ').toLowerCase().includes(query)));
}

export function filterBanSummaries(rows: readonly Readonly<BanSummary>[], filters: { query?: unknown; sort?: unknown }): Readonly<BanSummary>[] {
  const query = lower(filters.query, 200);
  const sort = lower(filters.sort, 30) || 'date_desc';
  const filtered = rows.filter((row) => !query || [row.uid, row.name, row.reason, row.bannedBy].join(' ').toLowerCase().includes(query));
  return [...filtered].sort((a, b) => {
    if (sort === 'name') return a.name.localeCompare(b.name) || a.uid.localeCompare(b.uid);
    if (sort === 'date_asc') return a.bannedAtMs - b.bannedAtMs || a.uid.localeCompare(b.uid);
    return b.bannedAtMs - a.bannedAtMs || a.uid.localeCompare(b.uid);
  });
}

export interface SourceStateInput {
  scanned: number;
  matched: number;
  cap: number;
  hasMore: boolean;
  capturedAtMs: number;
  error?: unknown;
}

export function sourceState(input: SourceStateInput) {
  const error = text(input.error, 240);
  const status: SourceStatus = error ? 'error' : input.hasMore ? 'partial' : 'ready';
  return Object.freeze({
    status,
    scanned: Math.max(0, Math.floor(Number(input.scanned) || 0)),
    matched: Math.max(0, Math.floor(Number(input.matched) || 0)),
    cap: Math.max(0, Math.floor(Number(input.cap) || 0)),
    capturedAtMs: timestampMs(input.capturedAtMs),
    reason: error || (input.hasMore ? 'source_cap_reached' : ''),
  });
}

export function namedSourceState(name: unknown, input: SourceStateInput) {
  return Object.freeze({ name: text(name, 80), ...sourceState(input) });
}

export interface PolicyEvidenceOptions {
  nowMs?: number;
  staleAfterMs?: number;
  runtimeMinimumAge?: number | null;
  declaredMinimumAge?: number | null;
}

export function buildPolicyEvidence(rows: readonly Readonly<ConsentAggregateInput>[], options: PolicyEvidenceOptions = {}) {
  const nowMs = timestampMs(options.nowMs) || Date.now();
  const staleAfterMs = Math.max(1, Number(options.staleAfterMs) || 180 * 86_400_000);
  const ageBrackets = { adult: 0, teen_safe: 0, under13: 0, unknown: 0 };
  const analyticsConsent = { granted: 0, denied: 0, unknown: 0 };
  const legalAcceptance = { accepted: 0, notAccepted: 0, unknown: 0 };
  const platforms: Record<string, number> = {};
  let stale = 0;
  let invalid = 0;

  rows.forEach((row) => {
    ageBrackets[row.ageBracket as keyof typeof ageBrackets] += 1;
    analyticsConsent[row.analyticsConsent as keyof typeof analyticsConsent] += 1;
    if (row.legalAccepted === true) legalAcceptance.accepted += 1;
    else if (row.legalAccepted === false) legalAcceptance.notAccepted += 1;
    else legalAcceptance.unknown += 1;
    platforms[row.platform || 'unknown'] = (platforms[row.platform || 'unknown'] ?? 0) + 1;
    if (row.updatedAtMs > 0 && nowMs - row.updatedAtMs > staleAfterMs) stale += 1;
    if (row.ageBracket === 'unknown' || row.analyticsConsent === 'unknown') invalid += 1;
  });

  const declared = options.declaredMinimumAge == null ? null : Number(options.declaredMinimumAge);
  const runtime = options.runtimeMinimumAge == null ? null : Number(options.runtimeMinimumAge);
  return Object.freeze({
    sourceKind: 'client_reported_legacy_telemetry' as const,
    total: rows.length,
    ageBrackets: Object.freeze(ageBrackets),
    analyticsConsent: Object.freeze(analyticsConsent),
    legalAcceptance: Object.freeze(legalAcceptance),
    platforms: Object.freeze(Object.fromEntries(Object.entries(platforms).sort(([a], [b]) => a.localeCompare(b)))),
    stale,
    invalid,
    policyRuntimeMismatch: declared != null && declared > 0 && runtime !== declared,
    missingEvidence: Object.freeze(['append_only_server_ledger', 'guardian_relationship', 'jurisdiction', 'purpose_specific_legal_basis', 'server_timestamp']),
  });
}

export function csvCell(value: unknown): string {
  const raw = String(value ?? '');
  const safe = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function buildUserReportsCsv(rows: readonly Readonly<UserReportSummary>[]): string {
  const header = ['Report ID', 'Reported UID', 'Reported name', 'Reporter UID', 'Reason', 'Status', 'Screen', 'Platform', 'App version', 'Created at'];
  const body = rows.map((row) => [
    row.id, row.reportedUid, row.reportedName, row.reporterUid, row.reason, row.status,
    row.screen, row.platform, row.appVersion, row.createdAtMs ? new Date(row.createdAtMs).toISOString() : '',
  ].map(csvCell).join(','));
  return [header.join(','), ...body].join('\n');
}

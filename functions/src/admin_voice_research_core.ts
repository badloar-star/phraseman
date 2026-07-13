import { isVipActive, parseProgressMs } from './premium_status';

type Row = Record<string, unknown>;
const DAY_MS = 86_400_000;
const YEAR_MS = 365 * DAY_MS;

function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function text(value: unknown, max = 2000): string { return String(value ?? '').trim().slice(0, max); }
function lower(value: unknown, max = 2000): string { return text(value, max).toLowerCase(); }
function finite(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }

export interface IdeaProjection {
  id: string; uid: string; userName: string; title: string; description: string; benefit: string;
  category: string; status: string; lang: string; platform: string; appVersion: string;
  createdAtMs: number; decidedAtMs: number; decidedBy: string;
  decisionMessageRu: string; decisionMessageUk: string; decisionMessageEs: string;
  premiumGranted: boolean; premiumGrantUntilMs: number;
}

export function projectIdeaRow(id: string, value: unknown): IdeaProjection {
  const row = record(value);
  const status = ['pending', 'approved', 'rejected'].includes(lower(row.status, 20)) ? lower(row.status, 20) : 'pending';
  const category = ['feature', 'improvement', 'monetization', 'content', 'other'].includes(lower(row.category, 30)) ? lower(row.category, 30) : 'other';
  return Object.freeze({
    id: text(id, 180), uid: text(row.uid, 180), userName: text(row.userName ?? row.name, 160),
    title: text(row.title, 240), description: text(row.description, 3000), benefit: text(row.benefit, 1500),
    category, status, lang: lower(row.lang, 16) || 'ru', platform: lower(row.platform, 30), appVersion: text(row.appVersion, 80),
    createdAtMs: finite(row.createdAtMs ?? row.createdAt), decidedAtMs: finite(row.decidedAt ?? row.decidedAtMs), decidedBy: text(row.decidedBy, 180),
    decisionMessageRu: text(row.decisionMessageRu, 2500), decisionMessageUk: text(row.decisionMessageUk, 2500), decisionMessageEs: text(row.decisionMessageEs, 2500),
    premiumGranted: row.premiumGranted === true, premiumGrantUntilMs: finite(row.premiumGrantUntilMs),
  });
}

export function filterIdeaRows(rows: readonly IdeaProjection[], filters: { status?: unknown; category?: unknown; query?: unknown }): IdeaProjection[] {
  const status = lower(filters.status, 20); const category = lower(filters.category, 30); const query = lower(filters.query, 200);
  return rows.filter((row) => (!status || status === 'all' || row.status === status)
    && (!category || category === 'all' || row.category === category)
    && (!query || [row.id, row.uid, row.userName, row.title, row.description, row.benefit, row.category].join(' ').toLowerCase().includes(query)));
}

export type OnboardingSource = 'tiktok' | 'store' | 'social' | 'youtube' | 'google' | 'friends' | 'other' | 'unknown';
export interface OnboardingProjection { id: string; uid: string; source: OnboardingSource; platform: string; createdAtMs: number }

export function normalizeOnboardingSource(value: unknown): OnboardingSource {
  const raw = lower(value, 80).replace(/[\s_-]+/g, '');
  if (raw.includes('tiktok')) return 'tiktok';
  if (raw.includes('youtube')) return 'youtube';
  if (raw.includes('google') || raw.includes('search')) return 'google';
  if (raw.includes('friend') || raw.includes('recommend')) return 'friends';
  if (raw.includes('store') || raw.includes('appstore') || raw.includes('googleplay')) return 'store';
  if (['instagram', 'facebook', 'telegram', 'social', 'threads', 'vk'].some((item) => raw.includes(item))) return 'social';
  if (raw) return 'other';
  return 'unknown';
}

export function buildOnboardingSourceSummary(values: readonly Row[]) {
  const projected: OnboardingProjection[] = values.map((value, index) => ({
    id: text(value.id, 180) || `row-${index}`, uid: text(value.uid ?? value.userId, 180) || `anonymous:${text(value.id, 180) || index}`,
    source: normalizeOnboardingSource(value.source ?? value.value ?? value.onboardingSource), platform: lower(value.platform, 30), createdAtMs: finite(value.createdAtMs ?? value.createdAt),
  })).sort((a, b) => b.createdAtMs - a.createdAtMs || a.id.localeCompare(b.id));
  const seen = new Set<string>(); const latest = projected.filter((row) => { if (seen.has(row.uid)) return false; seen.add(row.uid); return true; });
  const bySource = latest.reduce<Record<string, number>>((result, row) => { result[row.source] = (result[row.source] ?? 0) + 1; return result; }, {});
  return Object.freeze({ totalEvents: projected.length, uniqueUsers: latest.length, topSource: Object.entries(bySource).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? '', bySource: Object.freeze(bySource), latest: Object.freeze(latest) });
}

export interface CancellationProjection {
  id: string; uid: string; userName: string; reason: string; reasonText: string; platform: string;
  lang: string; premiumPlan: string; appVersion: string; createdAtMs: number;
}

export function projectCancellationRow(id: string, value: unknown): CancellationProjection {
  const row = record(value);
  return Object.freeze({
    id: text(id, 180), uid: text(row.uid, 180), userName: text(row.userName ?? row.name, 160), reason: lower(row.reason, 80) || 'unknown',
    reasonText: text(row.reasonText ?? row.text ?? row.comment, 3000), platform: lower(row.platform, 30), lang: lower(row.lang, 16),
    premiumPlan: text(row.premiumPlan, 80), appVersion: text(row.appVersion, 80), createdAtMs: finite(row.createdAtMs ?? row.createdAt),
  });
}

function trend(recentShare: number | null, previousShare: number | null): 'up' | 'down' | 'stable' | 'unknown' {
  if (recentShare == null || previousShare == null) return 'unknown';
  const delta = recentShare - previousShare;
  return Math.abs(delta) < 0.03 ? 'stable' : delta > 0 ? 'up' : 'down';
}

export function buildCancellationSummary(rows: readonly CancellationProjection[], nowMs: number = Date.now()) {
  const byReason = rows.reduce<Record<string, number>>((result, row) => { result[row.reason] = (result[row.reason] ?? 0) + 1; return result; }, {});
  const recent = rows.filter((row) => row.createdAtMs >= nowMs - 14 * DAY_MS && row.createdAtMs <= nowMs);
  const previous = rows.filter((row) => row.createdAtMs >= nowMs - 28 * DAY_MS && row.createdAtMs < nowMs - 14 * DAY_MS);
  const specs = {
    price: ['too_expensive'], value: ['not_enough_value', 'not_using_enough'], technical: ['technical_issues'],
  } as const;
  const segments = Object.fromEntries(Object.entries(specs).map(([key, reasons]) => {
    const count = rows.filter((row) => (reasons as readonly string[]).includes(row.reason)).length;
    const recentShare = recent.length ? recent.filter((row) => (reasons as readonly string[]).includes(row.reason)).length / recent.length : null;
    const previousShare = previous.length ? previous.filter((row) => (reasons as readonly string[]).includes(row.reason)).length / previous.length : null;
    return [key, Object.freeze({ count, share: rows.length ? count / rows.length : 0, recentShare, previousShare, trend: trend(recentShare, previousShare) })];
  }));
  return Object.freeze({ total: rows.length, byReason: Object.freeze(byReason), segments: Object.freeze(segments) });
}

export function preserveIdeaRewardProgress(value: unknown, nowMs: number = Date.now()) {
  const progress = record(value); const nominalRewardUntilMs = nowMs + YEAR_MS;
  const vipActive = isVipActive(progress, nowMs);
  const vipUntil = parseProgressMs(progress.vip_until ?? progress.vip_expiry);
  if (vipActive && (vipUntil === 0 || vipUntil >= nominalRewardUntilMs)) return Object.freeze({ changed: false, nominalRewardUntilMs, patch: Object.freeze({}) });
  const grantAt = String(nowMs);
  return Object.freeze({ changed: true, nominalRewardUntilMs, patch: Object.freeze({
    vip_active: 'true', vip_plan: 'idea_reward', vip_from: grantAt, vip_until: String(Math.max(vipUntil, nominalRewardUntilMs)),
    vip_admin_override: 'true', vip_admin_grant_at: grantAt, vip_admin_grant_reason: 'user_idea_approved',
  }) });
}

function safeAnswer(value: unknown): string | string[] {
  if (Array.isArray(value)) return value.slice(0, 30).map((item) => text(item, 500));
  return text(value, 2000);
}

export function projectSurveyResponse(id: string, value: unknown) {
  const row = record(value); const answers = record(row.answers);
  const safeAnswers = Object.fromEntries(Object.entries(answers).slice(0, 100).map(([key, answer]) => [text(key, 80), safeAnswer(answer)]));
  return Object.freeze({ id: text(id, 180), uid: text(row.uid, 180), surveyId: text(row.surveyId, 80), submittedAtMs: finite(row.submittedAtMs), platform: lower(row.platform, 30), appVersion: text(row.appVersion, 80), answers: Object.freeze(safeAnswers), comment: text(row.comment ?? row.comments, 3000) });
}

export function csvCell(value: unknown): string {
  const raw = String(value ?? ''); const safe = /^[=+\-@]/.test(raw.trimStart()) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

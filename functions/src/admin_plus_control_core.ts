import { classifyActiveAccess, type AccessKind } from './admin_analytics_core';
import { isPremiumAccessActive, parseProgressMs, resolvePremiumAccessBreakdown } from './premium_status';

type Row = Record<string, unknown>;

export type PlusFindingKind =
  | 'double_access'
  | 'identity_duplicate_access'
  | 'name_duplicate_access'
  | 'legacy_admin_grant'
  | 'stale_premium_flag'
  | 'manual_store_fields'
  | 'vip_inactive_shape';

export interface PlusControlAccount {
  readonly uid: string;
  readonly name: string;
  readonly email: string;
  readonly xp: number;
  readonly identityHidden: boolean;
  readonly active: boolean;
  readonly primaryKind: AccessKind | 'inactive';
  readonly plan: string;
  readonly storeProduct: string;
  readonly storePeriod: string;
  readonly startsAtMs: number;
  readonly endsAtMs: number;
  readonly sources: Readonly<{
    store: boolean;
    vip: boolean;
    gift: boolean;
    legacyAdminGrant: boolean;
    manualOrUnknown: boolean;
  }>;
  readonly hasAccessShape: boolean;
  readonly hasVipShape: boolean;
  readonly premiumActiveFlag: boolean;
}

export interface PlusControlFinding {
  readonly id: string;
  readonly severity: 'critical' | 'warning' | 'info';
  readonly kind: PlusFindingKind;
  readonly title: string;
  readonly details: string;
  readonly uid: string;
  readonly name: string;
  readonly email: string;
  readonly matchedSignals?: readonly string[];
  readonly userCount?: number;
  readonly users: readonly Pick<PlusControlAccount, 'uid' | 'name' | 'email' | 'active' | 'primaryKind'>[];
}

function text(value: unknown, max = 240): string {
  return String(value ?? '').trim().slice(0, max);
}

function lower(value: unknown): string { return text(value).toLowerCase(); }
function truthy(value: unknown): boolean { return ['true', '1', 'yes', 'y', 'on'].includes(lower(value)); }
function falsy(value: unknown): boolean { return ['false', '0', 'no', 'n', 'off'].includes(lower(value)); }
function record(value: unknown): Row { return value && typeof value === 'object' && !Array.isArray(value) ? value as Row : {}; }
function finite(value: unknown): number { const n = Number(value); return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0; }

function hasRevenueCat(progress: Row): boolean {
  return Boolean(
    text(progress.premium_rc_product_id)
    || text(progress.premium_rc_store)
    || parseProgressMs(progress.premium_rc_updated_at)
    || parseProgressMs(progress.premium_rc_purchased_at_ms)
    || parseProgressMs(progress.premium_rc_expiry_ms),
  );
}

function vipShape(progress: Row): boolean {
  return Boolean(
    text(progress.vip_plan) || text(progress.vip_active) || text(progress.vip_admin_override)
    || parseProgressMs(progress.vip_from) || parseProgressMs(progress.vip_until ?? progress.vip_expiry)
    || text(progress.vip_admin_grant_at ?? progress.vip_grant_at),
  );
}

function startsAt(progress: Row, primary: AccessKind | 'inactive'): number {
  if (primary === 'vip') return parseProgressMs(progress.vip_from ?? progress.vip_admin_grant_at ?? progress.vip_grant_at);
  if (primary === 'gift') return 0;
  return parseProgressMs(progress.premium_rc_purchased_at_ms ?? progress.premium_admin_grant_at ?? progress.premium_rc_updated_at);
}

function endsAt(progress: Row, primary: AccessKind | 'inactive'): number {
  if (primary === 'vip') return parseProgressMs(progress.vip_until ?? progress.vip_expiry);
  if (primary === 'gift') return Math.max(parseProgressMs(progress.intro_access_until_ms), parseProgressMs(progress.loyalty_gift_until_ms));
  return parseProgressMs(progress.premium_rc_expiry_ms ?? progress.premium_expiry);
}

function projectAccount(input: Row, nowMs: number): PlusControlAccount | null {
  const progress = record(input.progress);
  const uid = text(input.id, 180);
  if (!uid) return null;
  const hasVip = vipShape(progress);
  const breakdown = resolvePremiumAccessBreakdown(progress, nowMs);
  const classified = classifyActiveAccess({ id: uid, identityHidden: false, progress }, nowMs);
  const classifiedKind = classified?.kind ?? 'inactive';
  const primaryKind = classifiedKind === 'admin_grant' && breakdown.vipShapeActive ? 'vip'
    : classifiedKind !== 'inactive' ? classifiedKind
      : breakdown.storeActive ? 'manual_or_unknown'
        : breakdown.giftActive ? 'gift'
          : breakdown.legacyAdminGrantActive ? 'admin_grant'
            : breakdown.vipShapeActive ? 'vip' : 'inactive';
  const store = primaryKind === 'store_trial' || primaryKind === 'store_subscription' || primaryKind === 'store_lifetime';
  const vip = breakdown.vipShapeActive;
  const gift = breakdown.giftActive;
  const legacyAdminGrant = breakdown.legacyAdminGrantActive && !hasVip;
  const manualOrUnknown = breakdown.storeActive && !hasRevenueCat(progress) && !breakdown.legacyAdminGrantActive;
  const premiumActiveFlag = truthy(progress.premium_active);
  const plan = lower(progress.premium_plan) || lower(progress.vip_plan);
  const hasAccessShape = Boolean(
    primaryKind !== 'inactive' || plan || hasVip || premiumActiveFlag
    || hasRevenueCat(progress) || text(progress.admin_premium_override)
    || parseProgressMs(progress.intro_access_until_ms) || parseProgressMs(progress.loyalty_gift_until_ms),
  );
  if (!hasAccessShape) return null;
  const linked = record(input.linkedAuth);
  const email = lower(input.email ?? linked.email ?? progress.email ?? progress.user_email);
  return Object.freeze({
    uid,
    name: text(input.name ?? progress.user_name, 160) || '?',
    email,
    xp: finite(input.xp ?? progress.user_total_xp),
    identityHidden: input.identityHidden === true,
    active: isPremiumAccessActive(progress, nowMs),
    primaryKind,
    plan,
    storeProduct: text(progress.premium_rc_product_id, 160),
    storePeriod: text(progress.premium_rc_period_type, 40).toUpperCase(),
    startsAtMs: startsAt(progress, primaryKind),
    endsAtMs: endsAt(progress, primaryKind),
    sources: Object.freeze({ store, vip, gift, legacyAdminGrant, manualOrUnknown }),
    hasAccessShape,
    hasVipShape: hasVip,
    premiumActiveFlag,
  });
}

function userProjection(account: PlusControlAccount) {
  return Object.freeze({ uid: account.uid, name: account.name, email: account.email, active: account.active, primaryKind: account.primaryKind });
}

function finding(account: PlusControlAccount, kind: PlusFindingKind, severity: PlusControlFinding['severity'], title: string, details: string): PlusControlFinding {
  return Object.freeze({ id: `${kind}:${account.uid}`, kind, severity, title, details, uid: account.uid, name: account.name, email: account.email, users: Object.freeze([userProjection(account)]) });
}

function identitySignals(input: Row): readonly { type: string; value: string }[] {
  const progress = record(input.progress);
  const linked = record(input.linkedAuth ?? progress.linkedAuth);
  const values = [
    { type: 'email', value: lower(input.email ?? linked.email ?? progress.email ?? progress.user_email) },
    { type: 'firebaseAuthUid', value: text(input.firebaseAuthUid ?? progress.firebaseAuthUid ?? progress.firebase_auth_uid, 220) },
    { type: 'canonicalStableId', value: text(input.canonicalStableId ?? progress.canonicalStableId ?? progress.canonical_stable_id, 220) },
    { type: 'providerUid', value: text(linked.uid ?? linked.providerUid ?? linked.providerUserId ?? progress.providerUid ?? progress.provider_uid, 220) },
  ].filter((item) => item.value);
  const seen = new Set<string>();
  return values.filter((item) => { const key = `${item.type}:${item.value}`; if (seen.has(key)) return false; seen.add(key); return true; });
}

function placeholderName(name: string): boolean {
  const value = lower(name);
  return !value || value === '?' || value === '-' || /^(beginner|learner|explorer|speaker|fluent|advanced|expert|scholar|master|legend)\s+#\d+$/i.test(value);
}

const severityRank = Object.freeze({ critical: 0, warning: 1, info: 2 });

export function buildPlusControlSnapshot(inputs: readonly Row[], nowMs: number = Date.now()) {
  const projected = inputs.map((row) => ({ input: row, account: projectAccount(row, nowMs) })).filter((row): row is { input: Row; account: PlusControlAccount } => Boolean(row.account));
  const accounts = projected.map((row) => row.account).sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name) || a.uid.localeCompare(b.uid));
  const findings: PlusControlFinding[] = [];

  for (const { account } of projected) {
    const source = account.sources;
    if (source.store && (source.vip || source.legacyAdminGrant)) findings.push(finding(account, 'double_access', 'critical', 'Платный и административный Plus активны одновременно', 'Проверьте, нужен ли административный доступ пользователю с активным Store/RevenueCat Plus.'));
    if (source.legacyAdminGrant) findings.push(finding(account, 'legacy_admin_grant', 'warning', 'Остался legacy admin_grant', 'Доступ всё ещё опирается на premium_plan=admin_grant или admin_premium_override. Переносите его только через защищённую операцию профиля.'));
    if (account.premiumActiveFlag && !source.store && !source.manualOrUnknown) findings.push(finding(account, 'stale_premium_flag', 'critical', 'premium_active не подтверждён источником доступа', 'Флаг premium_active=true не совпадает с серверной моделью Store/RevenueCat-доступа.'));
    if (source.manualOrUnknown) findings.push(finding(account, 'manual_store_fields', 'warning', 'Store-поля активны без RevenueCat provenance', 'premium_plan даёт доступ, но RevenueCat metadata отсутствует. Это может быть мигрированная покупка или ручная запись.'));
    if (account.hasVipShape && !source.vip) {
      const progress = record(projected.find((row) => row.account.uid === account.uid)?.input.progress);
      const future = parseProgressMs(progress.vip_from) > nowMs;
      findings.push(finding(account, 'vip_inactive_shape', future ? 'warning' : 'info', 'Поля административного Plus есть, но доступ не активен', future ? 'Дата начала находится в будущем.' : (falsy(progress.vip_active) || falsy(progress.vip_admin_override) ? 'Доступ отозван или выключен.' : 'Срок доступа истёк.')));
    }
  }

  const signalGroups = new Map<string, { type: string; rows: { input: Row; account: PlusControlAccount }[] }>();
  for (const row of projected) for (const signal of identitySignals(row.input)) {
    const key = `${signal.type}:${signal.value}`;
    const group = signalGroups.get(key) ?? { type: signal.type, rows: [] };
    group.rows.push(row); signalGroups.set(key, group);
  }
  const duplicateGroups = new Map<string, { signals: Set<string>; rows: { input: Row; account: PlusControlAccount }[] }>();
  for (const group of signalGroups.values()) {
    const unique = group.rows.filter((row, index, rows) => rows.findIndex((candidate) => candidate.account.uid === row.account.uid) === index);
    if (unique.length < 2 || !unique.some((row) => row.account.active)) continue;
    const signature = unique.map((row) => row.account.uid).sort().join('|');
    const merged = duplicateGroups.get(signature) ?? { signals: new Set<string>(), rows: unique };
    merged.signals.add(group.type); duplicateGroups.set(signature, merged);
  }
  for (const [signature, group] of duplicateGroups) {
    const activeCount = group.rows.filter((row) => row.account.active).length;
    const first = group.rows[0].account;
    findings.push(Object.freeze({
      id: `identity_duplicate_access:${signature}`,
      severity: activeCount >= 2 ? 'critical' : 'warning', kind: 'identity_duplicate_access',
      title: 'Несколько документов разделяют один идентификатор',
      details: `Документов: ${group.rows.length}. С активным доступом: ${activeCount}. Значения идентификаторов скрыты.`,
      uid: first.uid, name: first.name, email: first.email,
      matchedSignals: Object.freeze([...group.signals].sort()), userCount: group.rows.length,
      users: Object.freeze(group.rows.slice(0, 8).map((row) => userProjection(row.account))),
    }));
  }

  const identitySignatures = new Set(duplicateGroups.keys());
  const names = new Map<string, PlusControlAccount[]>();
  for (const account of accounts) {
    if (!account.active || placeholderName(account.name)) continue;
    const key = lower(account.name); const group = names.get(key) ?? []; group.push(account); names.set(key, group);
  }
  for (const [name, group] of names) {
    const unique = group.filter((row, index, rows) => rows.findIndex((candidate) => candidate.uid === row.uid) === index);
    if (unique.length < 2) continue;
    const signature = unique.map((row) => row.uid).sort().join('|');
    if (identitySignatures.has(signature)) continue;
    const first = unique[0];
    findings.push(Object.freeze({
      id: `name_duplicate_access:${signature}`, severity: 'warning', kind: 'name_duplicate_access',
      title: 'Одинаковое отображаемое имя у нескольких доступов', details: `Имя «${name}» найдено в ${unique.length} документах с активным доступом.`,
      uid: first.uid, name: first.name, email: first.email, userCount: unique.length,
      users: Object.freeze(unique.slice(0, 8).map(userProjection)),
    }));
  }

  findings.sort((a, b) => severityRank[a.severity] - severityRank[b.severity] || a.kind.localeCompare(b.kind) || a.uid.localeCompare(b.uid));
  const byKind: Record<AccessKind, number> = { store_trial: 0, store_subscription: 0, store_lifetime: 0, gift: 0, admin_grant: 0, vip: 0, manual_or_unknown: 0 };
  for (const account of accounts) if (account.active && account.primaryKind !== 'inactive' && !account.identityHidden) byKind[account.primaryKind] += 1;
  const activeAccessTotal = Object.values(byKind).reduce((sum, count) => sum + count, 0);
  const findingsByKind = findings.reduce<Record<string, number>>((result, row) => ({ ...result, [row.kind]: (result[row.kind] ?? 0) + 1 }), {});
  return Object.freeze({
    accounts: Object.freeze(accounts), findings: Object.freeze(findings),
    summary: Object.freeze({
      scannedUsers: inputs.length, accessDocuments: accounts.length,
      hiddenUsersExcluded: inputs.filter((row) => row.identityHidden === true).length,
      activeAccessTotal, storeBackedTotal: byKind.store_trial + byKind.store_subscription + byKind.store_lifetime,
      activeTrials: byKind.store_trial, byKind: Object.freeze(byKind),
      findingsTotal: findings.length, criticalFindings: findings.filter((row) => row.severity === 'critical').length,
      findingsByKind: Object.freeze(findingsByKind),
    }),
  });
}

function searchableAccount(row: PlusControlAccount): string {
  return [row.uid, row.name, row.email, row.primaryKind, row.plan, row.storeProduct, row.storePeriod].join(' ').toLowerCase();
}

export function filterPlusAccounts(rows: readonly PlusControlAccount[], input: { filter?: unknown; query?: unknown }) {
  const filter = lower(input.filter) || 'all'; const query = lower(input.query);
  return rows.filter((row) => {
    const matches = filter === 'all'
      || (filter === 'premium' && (row.sources.store || row.sources.manualOrUnknown))
      || (filter === 'vip_all' && (row.hasVipShape || row.sources.legacyAdminGrant))
      || (filter === 'vip_active' && (row.sources.vip || row.sources.legacyAdminGrant))
      || (filter === 'vip_expired' && (row.hasVipShape || row.sources.legacyAdminGrant) && !(row.sources.vip || row.sources.legacyAdminGrant))
      || (filter === 'active' && row.active)
      || (filter === 'store' && row.sources.store)
      || (filter === 'trial' && row.primaryKind === 'store_trial')
      || (filter === 'annual' && ['yearly', 'annual'].includes(row.plan))
      || (filter === 'monthly' && row.plan === 'monthly')
      || (filter === 'lifetime' && row.primaryKind === 'store_lifetime')
      || (filter === 'admin' && (row.sources.vip || row.sources.legacyAdminGrant))
      || (filter === 'legacy' && row.sources.legacyAdminGrant)
      || (filter === 'gift' && row.sources.gift)
      || (filter === 'manual' && row.sources.manualOrUnknown)
      || (filter === 'inactive' && !row.active);
    return matches && (!query || searchableAccount(row).includes(query));
  });
}

export function filterPlusFindings(rows: readonly PlusControlFinding[], input: { filter?: unknown; query?: unknown }) {
  const filter = lower(input.filter) || 'all'; const query = lower(input.query);
  return rows.filter((row) => {
    const matches = filter === 'all' || filter === row.kind || (filter === 'critical' && row.severity === 'critical');
    const hay = [row.uid, row.name, row.email, row.kind, row.severity, row.title, row.details, ...(row.matchedSignals ?? []), ...row.users.flatMap((user) => [user.uid, user.name, user.email])].join(' ').toLowerCase();
    return matches && (!query || hay.includes(query));
  });
}

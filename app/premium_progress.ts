export type PremiumProgressLike = Record<string, unknown> | null | undefined;

export type AdminPremiumProgressState = {
  active: boolean;
  plan: string;
  expiryMs: number;
  expiryValue: string;
  grantAt: string | null;
};

export type RealPremiumProgressState = {
  active: boolean;
  plan: string;
  expiryMs: number;
  expiryValue: string;
};

export type VipProgressState = {
  active: boolean;
  plan: string;
  fromMs: number;
  fromValue: string;
  untilMs: number;
  untilValue: string;
  grantAt: string | null;
  source: 'vip' | 'legacy_admin_premium';
  legacy: boolean;
};

function cleanProgressString(value: unknown): string {
  return String(value ?? '').trim();
}

function cleanProgressPlan(value: unknown): string {
  return cleanProgressString(value).toLowerCase();
}

function hasMeaningfulPlan(plan: string): boolean {
  return plan !== '' && plan !== 'null' && plan !== 'undefined';
}

function isStorePremiumPlan(plan: string): boolean {
  return plan === 'monthly' || plan === 'yearly' || plan === 'annual' || plan === 'lifetime';
}

function isTruthyProgressFlag(value: unknown): boolean {
  const v = cleanProgressString(value).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isFalsyProgressFlag(value: unknown): boolean {
  const v = cleanProgressString(value).toLowerCase();
  return v === 'false' || v === '0' || v === 'no';
}

function cleanProgressMs(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
}

export function parsePremiumProgressMs(value: unknown): number {
  if (value == null || value === '') return 0;
  if (typeof value === 'object') {
    const record = value as { toMillis?: () => number; seconds?: number };
    if (typeof record.toMillis === 'function') return cleanProgressMs(record.toMillis());
    if (typeof record.seconds === 'number') return cleanProgressMs(record.seconds * 1000);
  }
  return cleanProgressMs(value);
}

export function getAdminPremiumProgressState(
  progress: PremiumProgressLike,
  now = Date.now(),
): AdminPremiumProgressState | null {
  const data = progress ?? {};
  const plan = cleanProgressPlan(data.premium_plan);
  const override = cleanProgressString(data.admin_premium_override);
  const expiryMs = parsePremiumProgressMs(data.premium_expiry);
  const expiryValue = expiryMs > 0 ? String(expiryMs) : '0';
  const grantAt = cleanProgressString(data.premium_admin_grant_at) || null;
  const legacyAdminPlan = plan === 'admin_grant' && override !== 'false';
  const isAdminGrant = override === 'true' || legacyAdminPlan;

  if (!isAdminGrant) {
    const storePlan = plan === 'monthly' || plan === 'yearly';
    if (override === 'false' && !storePlan) {
      return { active: false, plan, expiryMs, expiryValue, grantAt };
    }
    return null;
  }

  return {
    active: hasMeaningfulPlan(plan) && (expiryMs <= 0 || expiryMs > now),
    plan,
    expiryMs,
    expiryValue,
    grantAt,
  };
}

export function getRealPremiumProgressState(
  progress: PremiumProgressLike,
  now = Date.now(),
): RealPremiumProgressState | null {
  const data = progress ?? {};
  const plan = cleanProgressPlan(data.premium_plan);
  const override = cleanProgressString(data.admin_premium_override).toLowerCase();
  const expiryMs = parsePremiumProgressMs(data.premium_expiry);
  const expiryValue = expiryMs > 0 ? String(expiryMs) : '0';

  if (!hasMeaningfulPlan(plan)) {
    if (override === 'false') return { active: false, plan, expiryMs, expiryValue };
    return null;
  }

  if (override === 'true' || plan === 'admin_grant' || !isStorePremiumPlan(plan)) {
    return null;
  }

  return {
    active: expiryMs <= 0 || expiryMs > now,
    plan,
    expiryMs,
    expiryValue,
  };
}

export function getVipProgressState(
  progress: PremiumProgressLike,
  now = Date.now(),
): VipProgressState | null {
  const data = progress ?? {};

  const vipPlanRaw = cleanProgressPlan(data.vip_plan);
  const vipOverrideRaw = cleanProgressString(data.vip_admin_override);
  const vipActiveFlag = isTruthyProgressFlag(data.vip_active);
  const vipRevoked = isFalsyProgressFlag(data.vip_admin_override) || isFalsyProgressFlag(data.vip_active);
  const vipFromMs = parsePremiumProgressMs(data.vip_from);
  const vipUntilMs = parsePremiumProgressMs(data.vip_until ?? data.vip_expiry);
  const vipGrantAt = cleanProgressString(data.vip_admin_grant_at ?? data.vip_grant_at) || null;
  const hasVipShape =
    hasMeaningfulPlan(vipPlanRaw) ||
    vipActiveFlag ||
    vipRevoked ||
    vipFromMs > 0 ||
    vipUntilMs > 0 ||
    !!vipGrantAt;

  if (hasVipShape) {
    const plan = hasMeaningfulPlan(vipPlanRaw) ? vipPlanRaw : 'admin_vip';
    const windowStarted = vipFromMs <= 0 || vipFromMs <= now;
    const windowOpen = vipUntilMs <= 0 || vipUntilMs > now;
    const active = !vipRevoked && (vipActiveFlag || isTruthyProgressFlag(vipOverrideRaw) || hasMeaningfulPlan(plan)) && windowStarted && windowOpen;
    return {
      active,
      plan,
      fromMs: vipFromMs,
      fromValue: vipFromMs > 0 ? String(vipFromMs) : '0',
      untilMs: vipUntilMs,
      untilValue: vipUntilMs > 0 ? String(vipUntilMs) : '0',
      grantAt: vipGrantAt,
      source: 'vip',
      legacy: false,
    };
  }

  const legacyAdmin = getAdminPremiumProgressState(data, now);
  if (!legacyAdmin) return null;
  return {
    active: legacyAdmin.active,
    plan: 'admin_vip',
    fromMs: 0,
    fromValue: '0',
    untilMs: legacyAdmin.expiryMs,
    untilValue: legacyAdmin.expiryValue,
    grantAt: legacyAdmin.grantAt,
    source: 'legacy_admin_premium',
    legacy: true,
  };
}

export function isVipProgressActive(
  progress: PremiumProgressLike,
  now = Date.now(),
): boolean {
  return getVipProgressState(progress, now)?.active ?? false;
}

export function isPremiumProgressActive(
  progress: PremiumProgressLike,
  now = Date.now(),
): boolean {
  const realState = getRealPremiumProgressState(progress, now);
  if (realState) return realState.active;
  return false;
}

export function isPremiumAccessProgressActive(
  progress: PremiumProgressLike,
  now = Date.now(),
): boolean {
  return isPremiumProgressActive(progress, now) || isVipProgressActive(progress, now);
}

/* expo-router route shim: keeps utility module from warning when discovered as route */
export default function __RouteShim() { return null; }

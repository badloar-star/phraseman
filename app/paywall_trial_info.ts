// ════════════════════════════════════════════════════════════════════════════
// paywall_trial_info.ts — честные данные о триале из пакета RevenueCat.
//
// Таймлайн «Сегодня → напомним → списание» рендерится ТОЛЬКО когда стор реально
// отдал бесплатную intro-фазу, и дни берутся из стора, а не из хардкода.
// iOS: product.introPrice { price, periodNumberOfUnits, periodUnit | period }.
// Android (RC 9+): product.defaultOption.freePhase.billingPeriod; старые сборки также
// могут отдать product.introductoryPrice. Где парс не удался, неизвестная или отличная
// от 3 дней фаза не получает trial-framing: обещание должно
// в точности совпадать с текущим годовым трёхдневным предложением в сторе.
// ════════════════════════════════════════════════════════════════════════════
import type { PurchasesPackage } from 'react-native-purchases';

export interface TrialInfo {
  hasTrial: boolean;
  /** Длительность бесплатной фазы в днях; null = есть триал, но длина неизвестна. */
  days: number | null;
}

const UNIT_DAYS: Record<string, number> = {
  DAY: 1,
  WEEK: 7,
  MONTH: 30,
  YEAR: 365,
};

type IntroPhaseLike = {
  price?: unknown;
  periodNumberOfUnits?: unknown;
  periodUnit?: unknown;
  period?: unknown; // ISO8601: 'P3D' | 'P1W' | 'P1M'
};

type StorePeriodLike = {
  unit?: unknown;
  value?: unknown;
  iso8601?: unknown;
};

type FreePhaseLike = {
  billingPeriod?: unknown;
  period?: unknown;
};

function parseIsoPeriodDays(raw: unknown): number | null {
  if (typeof raw !== 'string') return null;
  const m = /^P(\d+)([DWMY])$/i.exec(raw.trim());
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (!Number.isFinite(n) || n <= 0) return null;
  const mul = { D: 1, W: 7, M: 30, Y: 365 }[m[2].toUpperCase() as 'D' | 'W' | 'M' | 'Y'];
  return n * mul;
}

function parsePhaseDays(phase: IntroPhaseLike): number | null {
  const units = typeof phase.periodNumberOfUnits === 'number' ? phase.periodNumberOfUnits : null;
  const unit = typeof phase.periodUnit === 'string' ? phase.periodUnit.toUpperCase() : null;
  if (units && units > 0 && unit && UNIT_DAYS[unit]) return units * UNIT_DAYS[unit];
  return parseIsoPeriodDays(phase.period);
}

function parseStorePeriodDays(raw: unknown): number | null {
  const isoDays = parseIsoPeriodDays(raw);
  if (isoDays != null) return isoDays;
  if (!raw || typeof raw !== 'object') return null;

  const period = raw as StorePeriodLike;
  const objectIsoDays = parseIsoPeriodDays(period.iso8601);
  if (objectIsoDays != null) return objectIsoDays;

  const value = typeof period.value === 'number' ? period.value : null;
  const unit = typeof period.unit === 'string' ? period.unit.toUpperCase() : null;
  if (!value || value <= 0 || !unit || !UNIT_DAYS[unit]) return null;
  return value * UNIT_DAYS[unit];
}

function parseFreePhaseDays(phase: FreePhaseLike): number | null {
  return parseStorePeriodDays(phase.billingPeriod ?? phase.period);
}

/**
 * Бесплатный триал = intro-фаза с price === 0. Платная intro-цена (например,
 * первый месяц со скидкой) триалом НЕ считается — таймлайн «бесплатно» не врёт.
 */
export function getTrialInfo(
  pkg: PurchasesPackage | undefined | null,
  plan: 'monthly' | 'yearly' | 'lifetime' = 'yearly',
): TrialInfo {
  if (!pkg || plan !== 'yearly') return { hasTrial: false, days: null };
  const product = pkg.product as unknown as {
    introPrice?: IntroPhaseLike | null;
    introductoryPrice?: IntroPhaseLike | null;
    defaultOption?: { freePhase?: FreePhaseLike | null } | null;
    defaultSubscriptionOption?: { freePhase?: FreePhaseLike | null } | null;
  };

  // Google Billing / RevenueCat 9+: purchasePackage() buys the product's default option.
  // A freePhase is semantically free; only its store-provided duration remains to validate.
  const defaultOption = product?.defaultOption ?? product?.defaultSubscriptionOption;
  const freePhase = defaultOption?.freePhase;
  if (freePhase && typeof freePhase === 'object') {
    const days = parseFreePhaseDays(freePhase);
    return days === 3 ? { hasTrial: true, days: 3 } : { hasTrial: false, days: null };
  }

  const phase = product?.introPrice ?? product?.introductoryPrice;
  if (!phase || typeof phase !== 'object') return { hasTrial: false, days: null };
  const price = typeof phase.price === 'number' ? phase.price : null;
  if (price !== 0) return { hasTrial: false, days: null };
  const days = parsePhaseDays(phase);
  return days === 3 ? { hasTrial: true, days: 3 } : { hasTrial: false, days: null };
}

/** Только подтверждённый годовой трёхдневный trial можно показывать и напоминать. */
export function trialDaysOrDefault(info: TrialInfo): 3 | null {
  return info.hasTrial && info.days === 3 ? 3 : null;
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

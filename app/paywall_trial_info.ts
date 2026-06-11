// ════════════════════════════════════════════════════════════════════════════
// paywall_trial_info.ts — честные данные о триале из пакета RevenueCat.
//
// Таймлайн «Сегодня → напомним → списание» рендерится ТОЛЬКО когда стор реально
// отдал бесплатную intro-фазу, и дни берутся из стора, а не из хардкода.
// iOS: product.introPrice { price, periodNumberOfUnits, periodUnit | period }.
// Android (RC): product.introductoryPrice в той же форме. Где парс не удался,
// но бесплатная intro-фаза точно есть — fallback 3 дня (текущая стор-настройка).
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

/**
 * Бесплатный триал = intro-фаза с price === 0. Платная intro-цена (например,
 * первый месяц со скидкой) триалом НЕ считается — таймлайн «бесплатно» не врёт.
 */
export function getTrialInfo(pkg: PurchasesPackage | undefined | null): TrialInfo {
  if (!pkg) return { hasTrial: false, days: null };
  const product = pkg.product as unknown as {
    introPrice?: IntroPhaseLike | null;
    introductoryPrice?: IntroPhaseLike | null;
  };
  const phase = product?.introPrice ?? product?.introductoryPrice;
  if (!phase || typeof phase !== 'object') return { hasTrial: false, days: null };
  const price = typeof phase.price === 'number' ? phase.price : null;
  if (price !== null && price > 0) return { hasTrial: false, days: null };
  return { hasTrial: true, days: parsePhaseDays(phase) };
}

/** Дни триала для копирайта; fallback = 3 (текущая настройка сторов). */
export function trialDaysOrDefault(info: TrialInfo, fallback = 3): number {
  return info.hasTrial && info.days && info.days > 0 ? info.days : fallback;
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

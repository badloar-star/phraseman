// ════════════════════════════════════════════════════════════════════════════
// paywall_trial_info.ts — честные данные о триале из пакета RevenueCat.
//
// Таймлайн «Сегодня → напомним → списание» рендерится ТОЛЬКО когда стор реально
// отдал бесплатную intro-фазу, и дни берутся из стора, а не из хардкода.
// iOS: product.introPrice + явный результат eligibility API RevenueCat.
// Android: product.defaultOption.freePhase — применимая Play Billing фаза.
// Неизвестная eligibility или непарсибельная длительность означают «триал не
// обещаем»: синтетического fallback нет.
// ════════════════════════════════════════════════════════════════════════════
import type { PurchasesPackage } from 'react-native-purchases';
import { buildSubscriptionDisclosure } from './paywall_subscription_disclosure';

export interface TrialInfo {
  hasTrial: boolean;
  /** Длительность подтверждённой бесплатной фазы в днях. */
  days: number | null;
}

export type TrialEligibility = 'eligible' | 'ineligible' | 'unknown';

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
  billingPeriod?: {
    unit?: unknown;
    value?: unknown;
    iso8601?: unknown;
  } | null;
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
  const billing = phase.billingPeriod;
  if (billing && typeof billing === 'object') {
    const value = typeof billing.value === 'number' ? billing.value : null;
    const unit = typeof billing.unit === 'string' ? billing.unit.toUpperCase() : null;
    if (value && value > 0 && unit && UNIT_DAYS[unit]) return value * UNIT_DAYS[unit];
    const isoDays = parseIsoPeriodDays(billing.iso8601);
    if (isoDays) return isoDays;
  }
  const units = typeof phase.periodNumberOfUnits === 'number' ? phase.periodNumberOfUnits : null;
  const unit = typeof phase.periodUnit === 'string' ? phase.periodUnit.toUpperCase() : null;
  if (units && units > 0 && unit && UNIT_DAYS[unit]) return units * UNIT_DAYS[unit];
  return parseIsoPeriodDays(phase.period);
}

/**
 * Бесплатный триал = intro-фаза с price === 0. Платная intro-цена (например,
 * первый месяц со скидкой) триалом НЕ считается — таймлайн «бесплатно» не врёт.
 */
export function getTrialInfo(
  pkg: PurchasesPackage | undefined | null,
  iosEligibility: TrialEligibility = 'unknown',
): TrialInfo {
  if (!pkg) return { hasTrial: false, days: null };
  const product = pkg.product as unknown as {
    introPrice?: IntroPhaseLike | null;
    defaultOption?: { freePhase?: IntroPhaseLike | null } | null;
  };

  // Google Play: RevenueCat выбирает defaultOption для текущего пользователя;
  // freePhase в нём — применимая бесплатная фаза, а не просто оффер из каталога.
  const googlePhase = product?.defaultOption?.freePhase;
  if (googlePhase && typeof googlePhase === 'object') {
    const days = parsePhaseDays(googlePhase);
    return days ? { hasTrial: true, days } : { hasTrial: false, days: null };
  }

  // iOS: наличие introPrice у продукта не доказывает eligibility конкретного
  // store account. Unknown/ineligible всегда показывают обычные условия.
  if (iosEligibility !== 'eligible') return { hasTrial: false, days: null };
  const phase = product?.introPrice;
  if (!phase || typeof phase !== 'object') return { hasTrial: false, days: null };
  const price = typeof phase.price === 'number' ? phase.price : null;
  if (price !== 0) return { hasTrial: false, days: null };
  const days = parsePhaseDays(phase);
  return days ? { hasTrial: true, days } : { hasTrial: false, days: null };
}

/**
 * Строка для журнала [PAYWALL-TRIAL]: что магазин отдал по пакету и почему getTrialInfo решил так.
 * зачем (владелец 18.10: «пробный установлен и там, и там»): по журналу с устройства должно быть видно, даёт ли магазин
 * пробный КАЖДОМУ пакету: настройка в App Store / Play, а не код.
 */
export function describeTrialSource(
  pkg: PurchasesPackage | undefined | null,
  iosEligibility: TrialEligibility = 'unknown',
): string {
  if (!pkg) return 'пакета нет';
  const product = pkg.product as unknown as {
    identifier?: unknown;
    introPrice?: IntroPhaseLike | null;
    defaultOption?: { id?: unknown; freePhase?: IntroPhaseLike | null } | null;
  };
  const intro = product?.introPrice;
  const introText = intro && typeof intro === 'object'
    ? `цена=${String(intro.price)} период=${String(intro.periodNumberOfUnits ?? '')}${String(intro.periodUnit ?? '')}/${String(intro.period ?? '')} дней=${parsePhaseDays(intro) ?? '—'}`
    : 'нет';
  const free = product?.defaultOption?.freePhase;
  const freeText = free && typeof free === 'object'
    ? `дней=${parsePhaseDays(free) ?? '—'} iso=${String(free.billingPeriod?.iso8601 ?? '')}`
    : 'нет';
  const option = product?.defaultOption ? String(product.defaultOption.id ?? '?') : 'нет';
  return `продукт=${String(product?.identifier ?? '?')} introPrice[${introText}] defaultOption=${option} freePhase[${freeText}] eligibility=${iosEligibility}`;
}

/**
 * Раскрытие условий подписки на русском.
 *
 * зачем (координатор 12.10, требование сторов — условия на языке человека): боевой код теперь зовёт
 * buildSubscriptionDisclosure(lang, …) из paywall_subscription_disclosure.ts (9 языков). Эта функция осталась тонкой обёрткой
 * для русского — её контракт (tests/paywall_trial_info.test.ts) и прежние вызовы не меняются, текст один на оба пути.
 */
export function buildSubscriptionDisclosureRu({
  trialDays,
  price,
  period,
}: {
  trialDays: number | null;
  price: string;
  period: 'год' | 'месяц';
}): string {
  return buildSubscriptionDisclosure('ru', { trialDays, price, period: period === 'год' ? 'year' : 'month' });
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

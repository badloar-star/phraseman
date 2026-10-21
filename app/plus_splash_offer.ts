// ════════════════════════════════════════════════════════════════════════════
// plus_splash_offer.ts — цена годового Plus и срок пробного для заставки (№35), строго из магазина.
//
// зачем (владелец 21.10): «цены и пробный период — из стора (RevenueCat offerings), не захардкожены; срок пробного — тот, что отдаёт стор,
// а не «7 дней»». Берём ТЕ ЖЕ данные и ТЕМ ЖЕ путём, что пейвол: resolvePremiumPackages → годовой пакет → storePriceTrim(priceString);
// срок — getTrialInfo (intro-фаза с ценой 0 + право на пробный). Purchases.getOfferings() сам отдаёт кэш SDK, новых чтений Firebase нет.
// Весь запрос ограничен потолком: заставка не должна ждать магазин вечно — по таймауту она открывается в состоянии «Цена уточнится в магазине».
// ════════════════════════════════════════════════════════════════════════════
import { Platform } from 'react-native';
import Purchases, { INTRO_ELIGIBILITY_STATUS } from 'react-native-purchases';

import { initRevenueCat, resolvePremiumPackages } from './revenuecat_init';
import { isStoreBillingUnavailableError } from './paywall_billing_unavailable';
import { getTrialInfo, type TrialEligibility } from './paywall_trial_info';

const LOG = '[PLUS-SPLASH]';
/** Потолок всей загрузки цены (инициализация магазина + offerings + право на пробный). */
export const PLUS_SPLASH_OFFER_TIMEOUT_MS = 3_500;

export type PlusSplashOffer =
  /** Цена пришла; trialDays — только если магазин реально отдаёт бесплатную фазу и человек имеет на неё право. */
  | Readonly<{ kind: 'ready'; yearlyPrice: string; trialDays: number | null }>
  /** Магазин не ответил или годового пакета нет: заставка открывается, кнопка ведёт в пейвол, цену не выдумываем. */
  | Readonly<{ kind: 'no_prices'; reason: string }>
  /** Магазина на устройстве нет (billing_unavailable): заставку не показываем. */
  | Readonly<{ kind: 'store_unavailable' }>;

/** Как пейвол: цена без хвоста «/мес» (копия storePriceTrim, чтобы не тянуть в запуск весь модуль покупки на 1900 строк). */
export function plusSplashPriceTrim(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.replace(/\s*\/\s*(mo|month|мес|місяць|месяц)(?![a-zа-яёіїєґ]).*/i, '').trim();
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout:${label}:${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

export async function loadPlusSplashOffer(): Promise<PlusSplashOffer> {
  const startedAt = Date.now();
  const deadline = startedAt + PLUS_SPLASH_OFFER_TIMEOUT_MS;
  const left = () => Math.max(1, deadline - Date.now());
  console.warn(`${LOG} offer: запрос цены`, JSON.stringify({ platform: Platform.OS, timeoutMs: PLUS_SPLASH_OFFER_TIMEOUT_MS })); // guard-ok: вход
  try {
    await withTimeout(initRevenueCat(), left(), 'initRevenueCat');
    const offerings = await withTimeout(Purchases.getOfferings(), left(), 'getOfferings');
    const packages = resolvePremiumPackages(offerings.current?.availablePackages ?? []);
    const yearly = packages.yearly;
    const yearlyPrice = plusSplashPriceTrim(yearly?.product?.priceString);
    if (!yearly || !yearlyPrice) {
      console.warn(`${LOG} offer: годового пакета или цены нет`, JSON.stringify({ hasYearly: !!yearly, hasPrice: !!yearlyPrice, tookMs: Date.now() - startedAt })); // guard-ok: причина
      return { kind: 'no_prices', reason: yearly ? 'no_price_string' : 'no_yearly_package' };
    }
    let eligibility: TrialEligibility = 'unknown';
    if (Platform.OS === 'ios') {
      const productId = yearly.product.identifier;
      try {
        const statuses = await withTimeout(Purchases.checkTrialOrIntroductoryPriceEligibility([productId]), left(), 'eligibility');
        const status = statuses[productId]?.status;
        if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) eligibility = 'eligible';
        else if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE || status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS) eligibility = 'ineligible';
      } catch (error) {
        // зачем: право на пробный не выяснили — «unknown», пробный не обещаем (как в пейволе)
        console.warn(`${LOG} offer: проверка права на пробный не удалась → unknown`, error instanceof Error ? error.message : String(error)); // guard-ok: причина
      }
    }
    const trial = getTrialInfo(yearly, eligibility);
    const trialDays = trial.hasTrial && trial.days && trial.days > 0 ? trial.days : null;
    console.warn(`${LOG} offer: готово`, JSON.stringify({ yearlyPrice, eligibility, hasTrial: trial.hasTrial, trialDays, tookMs: Date.now() - startedAt })); // guard-ok: итог
    return { kind: 'ready', yearlyPrice, trialDays };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (isStoreBillingUnavailableError(error)) {
      console.warn(`${LOG} offer: магазина на устройстве нет (billing_unavailable)`, message); // guard-ok: причина
      return { kind: 'store_unavailable' };
    }
    console.warn(`${LOG} offer: магазин не ответил`, JSON.stringify({ message, tookMs: Date.now() - startedAt })); // guard-ok: причина
    return { kind: 'no_prices', reason: message.startsWith('timeout:') ? 'timeout' : 'error' };
  }
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __PlusSplashOfferRouteShim() { return null; }

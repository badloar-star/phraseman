// ════════════════════════════════════════════════════════════════════════════
// paywall_purchase.ts — общий хук покупки для пейволов A/B/C.
//
// Один источник правды для: загрузки пакетов RevenueCat, цен (ТОЛЬКО из стора,
// никаких хардкодов), честного триала, покупки/восстановления, событий воронки
// (trackEvent + paywall_funnel) и пуш-напоминания о конце триала.
//
// Общая покупка для активных A/B/C paywall-экранов:
//  - funnel-лог для админ-дашборда A/B
//  - запрос разрешения на пуш СРАЗУ после старта триала (момент Blinkist:
//    «напомним за день до списания» — лучший повод дать разрешение)
//  - реальное планирование напоминания
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import { isLifetimeButtonEnabled } from './remote_flags';
import {
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatPremiumMetadata,
} from './premium_revenuecat_state';
import { computeSavingsPct, computePerDayString } from './paywall_pricing';
import { getTrialInfo, trialDaysOrDefault, type TrialInfo } from './paywall_trial_info';
import { activateUrgencyIfNeeded, getUrgencyState, getDoubledPrice, type UrgencyState } from './paywall_urgency';
import { shouldShowExitTrialOffer, type PaywallCloseReason } from './paywall_trial_offer';
import { logPaywallFunnel } from './paywall_funnel';
import type { PaywallAbVariant } from './paywall_variant';
import {
  scheduleTrialEndReminder,
  schedulePaywallAbandonedNotification,
  requestNotificationPermission,
} from './notifications';
import {
  logExitTrialOfferShown,
  logExitTrialOfferAccepted,
  logExitTrialOfferDeclined,
} from './firebase';
import { safeRouterBack } from './navigation_back';
import { hapticTap } from '../hooks/use-haptics';
import { DEV_IAP_BYPASS } from './config';
import { trackEvent } from './analytics';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from './events';
import { markCelebrationPending } from './premium_celebration_state';
import { useEnergy } from '../components/EnergyContext';
import { invalidatePremiumCache } from './premium_guard';
import {
  activatePendingPersonalPlanAfterPremium,
  PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY,
} from './personal_plan_activation';

export type PaywallPlan = 'monthly' | 'yearly' | 'lifetime';
type PremiumPackages = { monthly?: PurchasesPackage; yearly?: PurchasesPackage; lifetime?: PurchasesPackage };

/** Маркер «exit-оффер уже показан» — один раз на устройство, без повторов. */
const EXIT_TRIAL_SEEN_KEY = 'paywall_exit_trial_offer_seen_v1';

export function storePriceTrim(raw: string | undefined | null): string {
  if (!raw) return '';
  return raw.replace(/\s*\/\s*(mo|month|мес|місяць|месяц)\b.*/i, '').trim();
}

function storePricePerMonthTrim(pkg: PurchasesPackage | undefined): string {
  const raw = (pkg?.product as { pricePerMonthString?: string | null } | undefined)?.pricePerMonthString;
  return storePriceTrim(raw);
}

export interface PaywallPurchaseArgs {
  variant: PaywallAbVariant;
  context: string;
  source: string;
  lang: Lang;
}

export function usePaywallPurchase({ variant, context, source, lang }: PaywallPurchaseArgs) {
  const router = useRouter();
  const { reload: reloadEnergy } = useEnergy();
  const [selected, setSelected] = useState<PaywallPlan>('yearly');
  const [packages, setPackages] = useState<PremiumPackages>({});
  const [loading, setLoading] = useState(false);
  // Сбой загрузки офферингов (сеть/стор). Влияет на видимость всех кнопок,
  // включая «Навсегда» — поэтому даём ретрай, а не молча скрываем.
  const [offeringsFailed, setOfferingsFailed] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [urgency, setUrgency] = useState<UrgencyState>({ isActive: false, remainingMs: 0, remainingFormatted: '00:00:00' });
  // Exit-intent: при закрытии с доступным стор-триалом перехватываем «3 дня бесплатно».
  const [exitOfferVisible, setExitOfferVisible] = useState(false);

  // Окно «старой цены» (77ч): активируем при первом показе пейвола и читаем
  // состояние. Тик раз в секунду живёт в PaywallPriceUrgency — здесь только старт.
  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        await activateUrgencyIfNeeded();
        const s = await getUrgencyState();
        if (!dead) setUrgency(s);
      } catch { /* некритично */ }
    })();
    return () => { dead = true; };
  }, []);

  // Загрузка офферингов с одним авто-ретраем при сбое: транзиентный сбой сети
  // не должен навсегда прятать кнопки (в т.ч. «Навсегда»). `dead` гасит гонку.
  const loadOfferings = useCallback(async (deadRef: { dead: boolean }): Promise<void> => {
    if (DEV_IAP_BYPASS) return;
    setLoading(true);
    setOfferingsFailed(false);
    const attempt = async (): Promise<boolean> => {
      try {
        await initRevenueCat();
        const o = await Purchases.getOfferings();
        if (!deadRef.dead) setPackages(resolvePremiumPackages(o.current?.availablePackages ?? []));
        return true;
      } catch {
        return false;
      }
    };
    try {
      let ok = await attempt();
      if (!ok && !deadRef.dead) {
        await new Promise((r) => setTimeout(r, 1500));
        if (!deadRef.dead) ok = await attempt();
      }
      if (!deadRef.dead && !ok) setOfferingsFailed(true);
    } finally {
      if (!deadRef.dead) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (DEV_IAP_BYPASS) return;
    const deadRef = { dead: false };
    const task = InteractionManager.runAfterInteractions(() => {
      void loadOfferings(deadRef);
    });
    return () => { deadRef.dead = true; task.cancel(); };
  }, [loadOfferings]);

  // Ручной ретрай для UI (кнопка «Повторить» при offeringsFailed).
  const reloadOfferings = useCallback(() => {
    const deadRef = { dead: false };
    void loadOfferings(deadRef);
  }, [loadOfferings]);

  // ── цены (только стор) ─────────────────────────────────────────────────────
  const yearlyPrice = storePriceTrim(packages.yearly?.product?.priceString);
  const monthlyPrice = storePriceTrim(packages.monthly?.product?.priceString);
  const lifetimePrice = storePriceTrim(packages.lifetime?.product?.priceString);
  const yearlyPerMonth = storePricePerMonthTrim(packages.yearly);
  const monthlyPerMonth = storePricePerMonthTrim(packages.monthly);
  // Кнопка «Навсегда» показывается, только когда админ-флаг включён И пакет
  // lifetime реально пришёл из RevenueCat (продукт заведён). Иначе — скрыта.
  const lifetimeAvailable = isLifetimeButtonEnabled() && !!packages.lifetime;

  const savingsPct = useMemo(() => computeSavingsPct({
    yearlyPerMonth: (packages.yearly?.product as { pricePerMonth?: number } | undefined)?.pricePerMonth ?? null,
    monthlyPerMonth: (packages.monthly?.product as { pricePerMonth?: number } | undefined)?.pricePerMonth ?? null,
    yearlyPriceStr: yearlyPrice || null,
    monthlyPriceStr: monthlyPrice || null,
  }), [packages, yearlyPrice, monthlyPrice]);

  const perDayLabel = useMemo(() => computePerDayString(
    yearlyPrice || null,
    (packages.yearly?.product as { price?: number } | undefined)?.price ?? null,
  ), [packages, yearlyPrice]);

  const selectedPkg = selected === 'lifetime' ? packages.lifetime : selected === 'yearly' ? packages.yearly : packages.monthly;
  const trial: TrialInfo = useMemo(() => getTrialInfo(selectedPkg), [selectedPkg]);
  const trialDays = trial.hasTrial ? trialDaysOrDefault(trial) : null;
  const ctaDisabled = purchasing || loading || restoring || (!DEV_IAP_BYPASS && !selectedPkg);

  // «Будущая» цена выбранного плана (×2 из реальной цены стора) — ТОЛЬКО для
  // отображения в PaywallPriceUrgency; в Purchases никогда не уходит.
  const selectedPrice = selected === 'lifetime' ? lifetimePrice : selected === 'yearly' ? yearlyPrice : monthlyPrice;
  const futurePrice = useMemo(() => (selectedPrice ? getDoubledPrice(selectedPrice) : null), [selectedPrice]);

  const selectPlan = useCallback((plan: PaywallPlan) => {
    hapticTap();
    setSelected(plan);
    void trackEvent('paywall_plan_select', { context, source, plan, paywall: variant });
  }, [context, source, variant]);

  // ── покупка ────────────────────────────────────────────────────────────────
  const finishPersonalPlanActivationFlow = useCallback(async () => {
    await activatePendingPersonalPlanAfterPremium();
    invalidatePremiumCache();
    await AsyncStorage.setItem('had_premium_ever', '1').catch(() => {});
    emitAppEvent('premium_activated');
    void reloadEnergy().catch(() => {});

    try {
      const pendingNickname = await AsyncStorage.getItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY);
      if (pendingNickname === '1') {
        await AsyncStorage.multiSet([
          ['onboarding_step', 'name'],
          [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
        ]);
        await AsyncStorage.removeItem('onboarding_done');
        emitAppEvent('personal_plan_onboarding_nickname_ready');
        router.replace('/(tabs)/home' as any);
        return;
      }
    } catch {
      // Fall through to the deterministic thank-you route.
    }

    router.replace('/personal_plan_thank_you' as any);
  }, [reloadEnergy, router]);

  const handlePurchase = useCallback(async () => {
    hapticTap();
    void trackEvent('paywall_cta_click', { context, source, plan: selected, paywall: variant });
    logPaywallFunnel('cta_click', { variant, context, plan: selected });
    if (DEV_IAP_BYPASS) {
      if (context === 'personal_plan') {
        await finishPersonalPlanActivationFlow();
        return;
      }
      safeRouterBack(router);
      return;
    }
    const pkg = selected === 'lifetime' ? packages.lifetime : selected === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg || purchasing) return;
    setPurchasing(true);
    void trackEvent('purchase_started', { context, source, plan: selected, product_id: pkg.product.identifier, paywall: variant });
    try {
      await initRevenueCat();
      if (!(await syncRevenueCatIdentity())) {
        Alert.alert(
          triLang(lang, { ru: 'Ошибка подключения', uk: 'Помилка з’єднання', es: 'Error de conexión' }),
          triLang(lang, { ru: 'Не удалось связаться с магазином. Попробуй позже.', uk: 'Не вдалося зв’язатися з магазином. Спробуй пізніше.', es: 'No pudimos contactar la tienda. Inténtalo más tarde.' }),
        );
        void trackEvent('purchase_failed', { context, plan: selected, paywall: variant, error: 'identity_sync' });
        return;
      }
      const pkgTrial = getTrialInfo(pkg);
      const { customerInfo } = await Purchases.purchasePackage(pkg); // RAW пакет — цена стора без изменений
      const metadata = revenueCatPremiumMetadata(customerInfo, pkg.product.identifier);
      const confirmedPlan = inferPremiumPlanFromProductId(metadata.productId, selected);
      await persistStorePremiumLocally(confirmedPlan, metadata);
      if (context !== 'personal_plan') {
        await markCelebrationPending();      // покажем празднование при возврате на экран
        emitAppEvent('premium_activated');
        void reloadEnergy().catch(() => {}); // премиум-бонус энергии виден сразу, без рестарта
      }
      void trackEvent('purchase_completed', { context, source, plan: selected, product_id: pkg.product.identifier, with_trial: pkgTrial.hasTrial, paywall: variant });
      logPaywallFunnel('purchase_completed', { variant, context, plan: selected });
      if (pkgTrial.hasTrial) {
        void trackEvent('trial_started', { context, plan: selected, product_id: pkg.product.identifier, paywall: variant });
        logPaywallFunnel('trial_started', { variant, context, plan: selected });
        // Момент Blinkist: триал только что начался — просим разрешение и реально
        // ставим напоминание за день до списания. Обещание таймлайна = правда.
        void (async () => {
          try {
            const granted = await requestNotificationPermission();
            if (!granted) return;
            const days = trialDaysOrDefault(pkgTrial);
            const price = storePriceTrim(pkg.product.priceString);
            const ok = await scheduleTrialEndReminder(
              days,
              triLang(lang, { ru: 'Триал заканчивается завтра', uk: 'Тріал закінчується завтра', es: 'Tu prueba termina mañana' }),
              triLang(lang, {
                ru: `Дальше — ${price}. Останешься? Отменить можно в два тапа.`,
                uk: `Далі — ${price}. Залишишся? Скасувати можна у два тапи.`,
                es: `Luego: ${price}. ¿Te quedas? Cancelar toma dos toques.`,
              }),
            );
            if (ok) void trackEvent('trial_reminder_scheduled', { context, plan: selected, paywall: variant, days });
          } catch { /* напоминание — best-effort */ }
        })();
      }
      if (context === 'personal_plan') {
        await finishPersonalPlanActivationFlow();
        return;
      }
      safeRouterBack(router);
    } catch (err: unknown) {
      if ((err as { userCancelled?: boolean })?.userCancelled) {
        void trackEvent('purchase_cancelled', { context, plan: selected, paywall: variant });
      } else {
        void trackEvent('purchase_failed', {
          context, plan: selected, paywall: variant,
          error: String((err as { message?: string })?.message ?? '').slice(0, 100),
        });
        Alert.alert(
          triLang(lang, { ru: 'Не удалось оформить', uk: 'Не вдалося оформити', es: 'No se pudo completar' }),
          triLang(lang, { ru: 'Попробуй ещё раз или восстанови покупки.', uk: 'Спробуй ще раз або віднови покупки.', es: 'Inténtalo de nuevo o restaura tus compras.' }),
        );
      }
    } finally {
      setPurchasing(false);
    }
  }, [selected, packages, purchasing, router, context, source, variant, lang, reloadEnergy, finishPersonalPlanActivationFlow]);

  // ── восстановление ─────────────────────────────────────────────────────────
  const handleRestore = useCallback(async () => {
    hapticTap();
    if (DEV_IAP_BYPASS || restoring) return;
    setRestoring(true);
    try {
      await initRevenueCat();
      if (!(await syncRevenueCatIdentity())) {
        Alert.alert(
          triLang(lang, { ru: 'Ошибка подключения', uk: 'Помилка з’єднання', es: 'Error de conexión' }),
          triLang(lang, { ru: 'Не удалось связаться с магазином. Попробуй позже.', uk: 'Не вдалося зв’язатися з магазином. Спробуй пізніше.', es: 'No pudimos contactar la tienda. Inténtalo más tarde.' }),
        );
        return;
      }
      const info = await Purchases.restorePurchases();
      const activeSubscriptions = info.activeSubscriptions ?? [];
      const hasActiveEntitlement = Object.keys(info.entitlements.active).length > 0;
      // Entitlements — авторитетный источник; activeSubscriptions используем только
      // как запасной (RC иногда задерживает entitlement при первом restore).
      if (hasActiveEntitlement || activeSubscriptions.length > 0) {
        const metadata = revenueCatPremiumMetadata(info);
        const plan = inferPremiumPlanFromProductId(
          metadata.productId,
          activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : 'monthly',
        );
        await persistStorePremiumLocally(plan, metadata);
        if (context !== 'personal_plan') {
          emitAppEvent('premium_activated');
          void reloadEnergy().catch(() => {}); // восстановленный премиум сразу видим в энергии
        }
        void trackEvent('subscription_restored', { context, paywall: variant });
        if (context === 'personal_plan') {
          await finishPersonalPlanActivationFlow();
          return;
        }
        safeRouterBack(router);
      } else {
        Alert.alert(
          triLang(lang, { ru: 'Покупки не найдены', uk: 'Покупки не знайдено', es: 'No se encontraron compras' }),
          triLang(lang, { ru: 'Активных подписок не обнаружено.', uk: 'Активних підписок не знайдено.', es: 'No hay suscripciones activas.' }),
        );
      }
    } catch {
      Alert.alert(
        triLang(lang, { ru: 'Ошибка', uk: 'Помилка', es: 'Error' }),
        triLang(lang, { ru: 'Не удалось восстановить покупки. Попробуй позже.', uk: 'Не вдалося відновити покупки. Спробуй пізніше.', es: 'No se pudieron restaurar las compras. Inténtalo más tarde.' }),
      );
    } finally {
      setRestoring(false);
    }
  }, [router, restoring, context, variant, lang, reloadEnergy, finishPersonalPlanActivationFlow]);

  // ── exit-intent оффер «3 дня бесплатно» ─────────────────────────────────────
  // Самый высокий ROI среди re-engagement-механик (Superwall: 17% revenue от
  // abandon). Показываем максимум один раз, только в high-value контекстах и
  // только когда стор реально отдаёт бесплатный триал. Решает paywall_trial_offer.
  const acceptExitOffer = useCallback(() => {
    hapticTap();
    void logExitTrialOfferAccepted(context, selected);
    void trackEvent('exit_trial_offer_accepted', { context, plan: selected, paywall: variant });
    setExitOfferVisible(false);
    void handlePurchase();
  }, [context, selected, variant, handlePurchase]);

  const dismissExitOffer = useCallback((reason: PaywallCloseReason) => {
    hapticTap();
    void logExitTrialOfferDeclined(context, selected);
    void trackEvent('exit_trial_offer_declined', { context, plan: selected, paywall: variant });
    setExitOfferVisible(false);
    void trackEvent('paywall_close', { context, source, paywall: variant, reason });
    logPaywallFunnel('close', { variant, context, plan: selected });
    void schedulePaywallAbandonedNotification(lang).catch(() => {});
    safeRouterBack(router);
  }, [context, selected, source, variant, lang, router]);

  // ── закрытие ───────────────────────────────────────────────────────────────
  const handleClose = useCallback((reason: 'close' | 'continue_free') => {
    hapticTap();
    if (DEV_IAP_BYPASS) {
      void trackEvent('paywall_close', { context, source, paywall: variant, reason });
      logPaywallFunnel('close', { variant, context, plan: selected });
      safeRouterBack(router);
      return;
    }
    void (async () => {
      let alreadySeen = true;
      try {
        alreadySeen = (await AsyncStorage.getItem(EXIT_TRIAL_SEEN_KEY)) === '1';
      } catch { /* при сбое чтения — считаем показанным, не назойливы */ }
      const showOffer = shouldShowExitTrialOffer({
        context,
        closeReason: reason,
        viewMode: 'purchase',
        openManageFromSettings: false,
        purchasing,
        restoring,
        hasStoreTrial: trial.hasTrial,
        alreadySeen,
        forceTrialUI: false,
      });
      if (showOffer) {
        try { await AsyncStorage.setItem(EXIT_TRIAL_SEEN_KEY, '1'); } catch { /* best-effort */ }
        void logExitTrialOfferShown(context, selected);
        void trackEvent('exit_trial_offer_shown', { context, plan: selected, paywall: variant });
        setExitOfferVisible(true);
        return;
      }
      void trackEvent('paywall_close', { context, source, paywall: variant, reason });
      logPaywallFunnel('close', { variant, context, plan: selected });
      void schedulePaywallAbandonedNotification(lang).catch(() => {});
      safeRouterBack(router);
    })();
  }, [router, context, source, variant, selected, purchasing, restoring, trial.hasTrial, lang]);

  return {
    selected, selectPlan,
    packages, loading, purchasing, restoring,
    offeringsFailed, reloadOfferings,
    yearlyPrice, monthlyPrice, yearlyPerMonth, monthlyPerMonth,
    lifetimePrice, lifetimeAvailable,
    savingsPct, perDayLabel,
    trial, trialDays, ctaDisabled,
    urgency, futurePrice,
    handlePurchase, handleRestore, handleClose,
    exitOfferVisible, acceptExitOffer, dismissExitOffer,
  };
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

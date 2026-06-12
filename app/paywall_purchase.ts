// ════════════════════════════════════════════════════════════════════════════
// paywall_purchase.ts — общий хук покупки для пейволов A/B/C.
//
// Один источник правды для: загрузки пакетов RevenueCat, цен (ТОЛЬКО из стора,
// никаких хардкодов), честного триала, покупки/восстановления, событий воронки
// (trackEvent + paywall_funnel) и пуш-напоминания о конце триала.
//
// Портировано с premium_modal_v2 (чистая реализация) + добавлено:
//  - funnel-лог для админ-дашборда A/B
//  - запрос разрешения на пуш СРАЗУ после старта триала (момент Blinkist:
//    «напомним за день до списания» — лучший повод дать разрешение)
//  - реальное планирование напоминания
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Alert, InteractionManager } from 'react-native';
import { useRouter } from 'expo-router';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import {
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatPremiumMetadata,
} from './premium_revenuecat_state';
import { computeSavingsPct, computePerDayString } from './paywall_pricing';
import { getTrialInfo, trialDaysOrDefault, type TrialInfo } from './paywall_trial_info';
import { logPaywallFunnel } from './paywall_funnel';
import type { PaywallAbVariant } from './paywall_variant';
import {
  scheduleTrialEndReminder,
  requestNotificationPermission,
} from './notifications';
import { safeRouterBack } from './navigation_back';
import { hapticTap } from '../hooks/use-haptics';
import { DEV_IAP_BYPASS } from './config';
import { trackEvent } from './analytics';
import { triLang, type Lang } from '../constants/i18n';
import { emitAppEvent } from './events';

export type PaywallPlan = 'monthly' | 'yearly';
type PremiumPackages = { monthly?: PurchasesPackage; yearly?: PurchasesPackage };

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
  const [selected, setSelected] = useState<PaywallPlan>('yearly');
  const [packages, setPackages] = useState<PremiumPackages>({});
  const [loading, setLoading] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    if (DEV_IAP_BYPASS) return;
    let dead = false;
    const task = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        setLoading(true);
        try {
          await initRevenueCat();
          const o = await Purchases.getOfferings();
          if (!dead) setPackages(resolvePremiumPackages(o.current?.availablePackages ?? []));
        } catch {
          // retry произойдёт при тапе на CTA
        } finally {
          if (!dead) setLoading(false);
        }
      })();
    });
    return () => { dead = true; task.cancel(); };
  }, []);

  // ── цены (только стор) ─────────────────────────────────────────────────────
  const yearlyPrice = storePriceTrim(packages.yearly?.product?.priceString);
  const monthlyPrice = storePriceTrim(packages.monthly?.product?.priceString);
  const yearlyPerMonth = storePricePerMonthTrim(packages.yearly);
  const monthlyPerMonth = storePricePerMonthTrim(packages.monthly);

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

  const selectedPkg = selected === 'yearly' ? packages.yearly : packages.monthly;
  const trial: TrialInfo = useMemo(() => getTrialInfo(selectedPkg), [selectedPkg]);
  const trialDays = trial.hasTrial ? trialDaysOrDefault(trial) : null;
  const ctaDisabled = purchasing || loading || restoring || (!DEV_IAP_BYPASS && !selectedPkg);

  const selectPlan = useCallback((plan: PaywallPlan) => {
    hapticTap();
    setSelected(plan);
    void trackEvent('paywall_plan_select', { context, source, plan, paywall: variant });
  }, [context, source, variant]);

  // ── покупка ────────────────────────────────────────────────────────────────
  const handlePurchase = useCallback(async () => {
    hapticTap();
    void trackEvent('paywall_cta_click', { context, source, plan: selected, paywall: variant });
    logPaywallFunnel('cta_click', { variant, context, plan: selected });
    if (DEV_IAP_BYPASS) { safeRouterBack(router); return; }
    const pkg = selected === 'yearly' ? packages.yearly : packages.monthly;
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
      emitAppEvent('premium_activated');
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
  }, [selected, packages, purchasing, router, context, source, variant, lang]);

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
      if (Object.keys(info.entitlements.active).length > 0 || activeSubscriptions.length > 0) {
        const metadata = revenueCatPremiumMetadata(info);
        const plan = inferPremiumPlanFromProductId(
          metadata.productId,
          activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : 'monthly',
        );
        await persistStorePremiumLocally(plan, metadata);
        emitAppEvent('premium_activated');
        void trackEvent('subscription_restored', { context, paywall: variant });
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
  }, [router, restoring, context, variant, lang]);

  // ── закрытие ───────────────────────────────────────────────────────────────
  const handleClose = useCallback((reason: 'close' | 'continue_free') => {
    hapticTap();
    void trackEvent('paywall_close', { context, source, paywall: variant, reason });
    logPaywallFunnel('close', { variant, context, plan: selected });
    safeRouterBack(router);
  }, [router, context, source, variant, selected]);

  return {
    selected, selectPlan,
    packages, loading, purchasing, restoring,
    yearlyPrice, monthlyPrice, yearlyPerMonth, monthlyPerMonth,
    savingsPct, perDayLabel,
    trial, trialDays, ctaDisabled,
    handlePurchase, handleRestore, handleClose,
  };
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

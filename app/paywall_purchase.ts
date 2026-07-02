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
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Alert, InteractionManager } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import Purchases, { type PurchasesPackage } from 'react-native-purchases';

import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import { isLifetimeButtonEnabled, isPaywallTimersEnabled } from './remote_flags';
import {
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatPremiumMetadata,
} from './premium_revenuecat_state';
import { computeSavingsPct, computePerDayString } from './paywall_pricing';
import { getTrialInfo, trialDaysOrDefault, type TrialInfo } from './paywall_trial_info';
import { activateUrgencyIfNeeded, getUrgencyState, getDoubledPrice, type UrgencyState } from './paywall_urgency';
import { shouldShowExitTrialOffer } from './paywall_trial_offer';
import { logPaywallFunnel } from './paywall_funnel';
import type { PaywallAbVariant } from './paywall_variant';
import {
  scheduleTrialEndReminder,
  schedulePaywallAbandonedNotification,
  requestNotificationPermission,
} from './notifications';
import { dismissPaywallModal, markNextNavigationAsReplace } from './navigation_back';
import { hapticTap } from '../hooks/use-haptics';
import { isFullAccess } from './age_gate';
import { DEV_IAP_BYPASS } from './config';
import {
  DEV_PREVIEW_MONTHLY_PRICE,
  DEV_PREVIEW_YEARLY_PRICE,
  DEV_PREVIEW_YEARLY_PER_MONTH,
  DEV_PREVIEW_LIFETIME_PRICE,
  DEV_PREVIEW_LIFETIME_PACKAGE,
  DEV_PREVIEW_URGENCY,
} from './paywall_dev_preview';
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

/** Exit-intent триал-оффер показываем не чаще одного раза на устройство. */
const EXIT_TRIAL_OFFER_SEEN_KEY = 'paywall_exit_trial_offer_seen_v1';
const ONBOARDING_TRIAL_REMINDER_CHOICE_KEY = 'onboarding_trial_reminder_choice_v1';

export function storePriceTrim(raw: string | undefined | null): string {
  if (!raw) return '';
  // (?![a-zа-яёіїєґ]) вместо \b: ASCII-\b не срабатывает после кириллицы
  // (мес/місяць/месяц), из-за чего RU/UK-суффиксы «/мес» не срезались.
  return raw.replace(/\s*\/\s*(mo|month|мес|місяць|месяц)(?![a-zа-яёіїєґ]).*/i, '').trim();
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
  /**
   * DEV/QA: форс «триал-режима» из тест-меню (_force_trial_ui=1). В Metro стора
   * нет (DEV_IAP_BYPASS) → trialDays обычно null, и триал-зависимое (trust-бейдж
   * «платить не нужно», exit-оффер, trial-таймлайн) не показать. Этот флаг
   * включает превью-триал ТОЛЬКО в dev-бандле. В сторе игнорируется.
   */
  forceTrialUI?: boolean;
}

export function usePaywallPurchase({ variant, context, source, lang, forceTrialUI }: PaywallPurchaseArgs) {
  const router = useRouter();
  const { reload: reloadEnergy } = useEnergy();
  const [selected, setSelected] = useState<PaywallPlan>('yearly');
  const [packages, setPackages] = useState<PremiumPackages>({});
  const [loading, setLoading] = useState(false);
  // Сбой загрузки офферингов (сеть/стор). Влияет на видимость всех кнопок,
  // включая Phraseman Pro — поэтому даём ретрай, а не молча скрываем.
  const [offeringsFailed, setOfferingsFailed] = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [urgency, setUrgency] = useState<UrgencyState>({ isActive: false, remainingMs: 0, remainingFormatted: '00:00:00' });

  // Окно «старой цены» (77ч): активируем при первом показе пейвола и читаем
  // состояние. Тик раз в секунду живёт в PaywallPriceUrgency — здесь только старт.
  // Гейт «Пульта»: при выключенном paywall_timers_enabled НЕ запускаем окно и
  // держим пустое неактивное состояние — тогда PaywallPriceUrgency возвращает
  // null во всех режимах (включая grace), и блок срочности скрыт у всех живьём.
  useEffect(() => {
    let dead = false;
    void (async () => {
      try {
        if (!isPaywallTimersEnabled()) {
          if (!dead) setUrgency({ isActive: false, remainingMs: 0, remainingFormatted: '00:00:00' });
          return;
        }
        await activateUrgencyIfNeeded();
        const s = await getUrgencyState();
        // dev-превью: показываем таймер всегда, даже если 77ч-окно у этого
        // устройства уже истекло (в стор-сборке используем реальный s).
        if (!dead) setUrgency(DEV_IAP_BYPASS && !s.isActive ? DEV_PREVIEW_URGENCY : s);
      } catch { /* некритично */ }
    })();
    return () => { dead = true; };
  }, []);

  // Загрузка офферингов с одним авто-ретраем при сбое: транзиентный сбой сети
  // не должен прятать кнопки бессрочно (в т.ч. Phraseman Pro). `dead` гасит гонку.
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

  // ── цены ───────────────────────────────────────────────────────────────────
  // В стор-сборке — ТОЛЬКО из стора (никаких хардкодов). В dev-сборке стор не
  // опрашивается (DEV_IAP_BYPASS), поэтому подставляем плейсхолдеры, чтобы таймер
  // и кнопка Phraseman Pro были видны и в Metro. В покупку плейсхолдеры не уходят.
  const yearlyPrice = storePriceTrim(packages.yearly?.product?.priceString) || (DEV_IAP_BYPASS ? DEV_PREVIEW_YEARLY_PRICE : '');
  const monthlyPrice = storePriceTrim(packages.monthly?.product?.priceString) || (DEV_IAP_BYPASS ? DEV_PREVIEW_MONTHLY_PRICE : '');
  const lifetimePrice = storePriceTrim(packages.lifetime?.product?.priceString) || (DEV_IAP_BYPASS ? DEV_PREVIEW_LIFETIME_PRICE : '');
  const yearlyPerMonth = storePricePerMonthTrim(packages.yearly) || (DEV_IAP_BYPASS ? DEV_PREVIEW_YEARLY_PER_MONTH : '');
  const monthlyPerMonth = storePricePerMonthTrim(packages.monthly);
  // Кнопка Phraseman Pro показывается, когда админ-флаг включён И пакет lifetime
  // реально пришёл из RevenueCat (продукт заведён). В dev-сборке пакета нет —
  // показываем превью кнопки, чтобы вёрстка была видна и в Metro.
  const lifetimeAvailable = isLifetimeButtonEnabled() && (!!packages.lifetime || DEV_IAP_BYPASS);

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

  const lifetimePkg = packages.lifetime ?? (DEV_IAP_BYPASS ? DEV_PREVIEW_LIFETIME_PACKAGE : undefined);
  const selectedPkg = selected === 'lifetime' ? lifetimePkg : selected === 'yearly' ? packages.yearly : packages.monthly;
  const trial: TrialInfo = useMemo(() => getTrialInfo(selectedPkg), [selectedPkg]);
  // В dev-бандле тест-меню может форсить триал-режим (_force_trial_ui=1), чтобы
  // увидеть trust-бейдж/exit-оффер/таймлайн без стора. В сторе forceTrialUI=false.
  const devForceTrial = DEV_IAP_BYPASS && forceTrialUI === true;
  const subscriptionTrialDays = trial.hasTrial ? trialDaysOrDefault(trial) : devForceTrial ? 3 : null;
  const trialDays = selected === 'lifetime' ? null : subscriptionTrialDays;
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
        // Возврат в онбординг на шаг «Имя»: слушатель _layout синхронно поднимает
        // непрозрачный оверлей. Намеренно НЕ навигируем на «Главную» — иначе кадр с
        // home + монтаж тяжёлого экрана (см. handleClose ниже).
        emitAppEvent('personal_plan_onboarding_nickname_ready');
        return;
      }
    } catch {
      // Fall through to the deterministic thank-you route.
    }

    // markNextNavigationAsReplace: the stack top is the paywall. Replace it so
    // back from the auth prompt host or the plan never returns to paywall.
    markNextNavigationAsReplace();
    router.replace('/personal_plan_thank_you' as any);
  }, [reloadEnergy, router]);

  const handlePurchase = useCallback(async () => {
    hapticTap();
    // Возрастной безопасный режим: покупки недоступны несовершеннолетним (<16).
    if (!isFullAccess()) {
      Alert.alert(
        triLang(lang, {
          ru: 'Покупки недоступны', uk: 'Покупки недоступні', es: 'Compras no disponibles',
          'pt-BR': 'Compras indisponíveis', vi: 'Không thể mua', id: 'Pembelian tidak tersedia',
          tr: 'Satın alma kullanılamıyor', pl: 'Zakupy niedostępne',
        }),
        triLang(lang, {
          ru: 'Покупки в приложении доступны с 16 лет.',
          uk: 'Покупки в додатку доступні з 16 років.',
          es: 'Las compras dentro de la app están disponibles a partir de los 16 años.',
          'pt-BR': 'As compras no app estão disponíveis a partir dos 16 anos.',
          vi: 'Mua hàng trong ứng dụng dành cho người từ 16 tuổi.',
          id: 'Pembelian dalam aplikasi tersedia mulai usia 16 tahun.',
          tr: 'Uygulama içi satın alımlar 16 yaşından itibaren kullanılabilir.',
          pl: 'Zakupy w aplikacji są dostępne od 16 roku życia.',
        }),
      );
      return;
    }
    void trackEvent('paywall_cta_click', { context, source, plan: selected, paywall: variant });
    if (source === 'afterwin_levelup' || context === 'level_up') {
      void trackEvent('afterwin_upsell_cta', { source: 'level_up', plan: selected, paywall: variant });
      void import('./firebase').then(({ logAfterWinUpsellCta }) =>
        logAfterWinUpsellCta('level_up', selected),
      ).catch(() => {});
    }
    logPaywallFunnel('cta_click', { variant, context, plan: selected });
    if (DEV_IAP_BYPASS) {
      if (context === 'personal_plan') {
        await finishPersonalPlanActivationFlow();
        return;
      }
      dismissPaywallModal(router);
      return;
    }
    const pkg = selected === 'lifetime' ? packages.lifetime : selected === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg || purchasing || restoring) return;
    setPurchasing(true);
    void trackEvent('purchase_started', { context, source, plan: selected, product_id: pkg.product.identifier, paywall: variant });
    try {
      await initRevenueCat();
      if (!(await syncRevenueCatIdentity())) {
        Alert.alert(
          triLang(lang, {
            ru: 'Ошибка подключения',
            uk: 'Помилка з’єднання',
            es: 'Error de conexión',
            'pt-BR': 'Erro de conexão',
            vi: 'Lỗi kết nối',
            id: 'Kesalahan koneksi',
            tr: 'Bağlantı hatası',
            pl: 'Błąd połączenia',
          }),
          triLang(lang, {
            ru: 'Не удалось связаться с магазином. Попробуй позже.',
            uk: 'Не вдалося зв’язатися з магазином. Спробуй пізніше.',
            es: 'No pudimos contactar la tienda. Inténtalo más tarde.',
            'pt-BR': 'Não foi possível contactar a loja. Tente mais tarde.',
            vi: 'Không liên hệ được với cửa hàng. Hãy thử lại sau.',
            id: 'Tidak bisa menghubungi toko. Coba lagi nanti.',
            tr: 'Mağazaya bağlanılamadı. Daha sonra tekrar dene.',
            pl: 'Nie udało się połączyć ze sklepem. Spróbuj później.',
          }),
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
        // Разовая покупка Phraseman Pro (lifetime) → синяя Pro-анимация; подписка → жёлтый Plus.
        await markCelebrationPending(null, confirmedPlan === 'lifetime' ? 'pro' : 'premium');
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
            const reminderChoice = context === 'personal_plan' && source === 'onboarding_plan'
              ? await AsyncStorage.getItem(ONBOARDING_TRIAL_REMINDER_CHOICE_KEY).catch(() => null)
              : null;
            if (reminderChoice === 'skip') return;
            const granted = await requestNotificationPermission();
            if (!granted) return;
            const days = trialDaysOrDefault(pkgTrial);
            const price = storePriceTrim(pkg.product.priceString);
            const ok = await scheduleTrialEndReminder(
              days,
              triLang(lang, {
                ru: 'Триал заканчивается завтра',
                uk: 'Тріал закінчується завтра',
                es: 'Tu prueba termina mañana',
                'pt-BR': 'Seu teste termina amanhã',
                vi: 'Dùng thử kết thúc vào ngày mai',
                id: 'Uji cobamu berakhir besok',
                tr: 'Denemen yarın bitiyor',
                pl: 'Okres próbny kończy się jutro',
              }),
              triLang(lang, {
                ru: `Дальше — ${price}. Останешься? Отменить можно в два тапа.`,
                uk: `Далі — ${price}. Залишишся? Скасувати можна у два тапи.`,
                es: `Luego: ${price}. ¿Te quedas? Cancelar toma dos toques.`,
                'pt-BR': `Depois: ${price}. Vai continuar? Cancelar leva dois toques.`,
                vi: `Sau đó: ${price}. Bạn tiếp tục chứ? Hủy chỉ mất hai lần chạm.`,
                id: `Berikutnya: ${price}. Tetap lanjut? Batal hanya dua ketukan.`,
                tr: `Sonra: ${price}. Devam edecek misin? İptal iki dokunuş.`,
                pl: `Dalej: ${price}. Zostajesz? Anulowanie to dwa stuknięcia.`,
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
      dismissPaywallModal(router);
    } catch (err: unknown) {
      if ((err as { userCancelled?: boolean })?.userCancelled) {
        void trackEvent('purchase_cancelled', { context, plan: selected, paywall: variant });
        logPaywallFunnel('purchase_cancelled', { variant, context, plan: selected });
      } else {
        void trackEvent('purchase_failed', {
          context, plan: selected, paywall: variant,
          error: String((err as { message?: string })?.message ?? '').slice(0, 100),
        });
        logPaywallFunnel('purchase_failed', { variant, context, plan: selected });
        Alert.alert(
          triLang(lang, {
            ru: 'Не удалось оформить',
            uk: 'Не вдалося оформити',
            es: 'No se pudo completar',
            'pt-BR': 'Não foi possível concluir',
            vi: 'Không hoàn tất được',
            id: 'Tidak bisa menyelesaikan',
            tr: 'Tamamlanamadı',
            pl: 'Nie udało się dokończyć',
          }),
          triLang(lang, {
            ru: 'Попробуй ещё раз или восстанови покупки.',
            uk: 'Спробуй ще раз або віднови покупки.',
            es: 'Inténtalo de nuevo o restaura tus compras.',
            'pt-BR': 'Tente de novo ou restaure suas compras.',
            vi: 'Hãy thử lại hoặc khôi phục giao dịch mua.',
            id: 'Coba lagi atau pulihkan pembelianmu.',
            tr: 'Tekrar dene veya satın alımları geri yükle.',
            pl: 'Spróbuj ponownie albo przywróć zakupy.',
          }),
        );
      }
    } finally {
      setPurchasing(false);
    }
  }, [selected, packages, purchasing, restoring, router, context, source, variant, lang, reloadEnergy, finishPersonalPlanActivationFlow]);

  // ── восстановление ─────────────────────────────────────────────────────────
  const handleRestore = useCallback(async () => {
    hapticTap();
    if (DEV_IAP_BYPASS || restoring || purchasing) return;
    setRestoring(true);
    try {
      await initRevenueCat();
      if (!(await syncRevenueCatIdentity())) {
        Alert.alert(
          triLang(lang, {
            ru: 'Ошибка подключения',
            uk: 'Помилка з’єднання',
            es: 'Error de conexión',
            'pt-BR': 'Erro de conexão',
            vi: 'Lỗi kết nối',
            id: 'Kesalahan koneksi',
            tr: 'Bağlantı hatası',
            pl: 'Błąd połączenia',
          }),
          triLang(lang, {
            ru: 'Не удалось связаться с магазином. Попробуй позже.',
            uk: 'Не вдалося зв’язатися з магазином. Спробуй пізніше.',
            es: 'No pudimos contactar la tienda. Inténtalo más tarde.',
            'pt-BR': 'Não foi possível contactar a loja. Tente mais tarde.',
            vi: 'Không liên hệ được với cửa hàng. Hãy thử lại sau.',
            id: 'Tidak bisa menghubungi toko. Coba lagi nanti.',
            tr: 'Mağazaya bağlanılamadı. Daha sonra tekrar dene.',
            pl: 'Nie udało się połączyć ze sklepem. Spróbuj później.',
          }),
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
        // Дефолт-эвристика на случай пустого productId: lifetime (non-consumable) живёт
        // в entitlements.active с productIdentifier, поэтому обычно productId заполнен и
        // ловится regex'ом. Но подстрахуемся — если среди активных есть lifetime-сигнал,
        // не деградируем в monthly/yearly.
        const restoreDefault: 'monthly' | 'yearly' | 'lifetime' =
          activeSubscriptions.some(s => /lifetime|forever|one.?time|onetime|perpetual/i.test(s)) ? 'lifetime'
          : activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly'
          : 'monthly';
        const plan = inferPremiumPlanFromProductId(metadata.productId, restoreDefault);
        await persistStorePremiumLocally(plan, metadata);
        if (context !== 'personal_plan') {
          emitAppEvent('premium_activated');
          void reloadEnergy().catch(() => {}); // восстановленный премиум сразу видим в энергии
        }
        void trackEvent('subscription_restored', { context, paywall: variant });
        logPaywallFunnel('restore_completed', { variant, context, plan });
        if (context === 'personal_plan') {
          await finishPersonalPlanActivationFlow();
          return;
        }
        dismissPaywallModal(router);
      } else {
        Alert.alert(
          triLang(lang, {
            ru: 'Покупки не найдены',
            uk: 'Покупки не знайдено',
            es: 'No se encontraron compras',
            'pt-BR': 'Compras não encontradas',
            vi: 'Không tìm thấy giao dịch mua',
            id: 'Pembelian tidak ditemukan',
            tr: 'Satın alma bulunamadı',
            pl: 'Nie znaleziono zakupów',
          }),
          triLang(lang, {
            ru: 'Активных подписок не обнаружено.',
            uk: 'Активних підписок не знайдено.',
            es: 'No hay suscripciones activas.',
            'pt-BR': 'Nenhuma assinatura ativa encontrada.',
            vi: 'Không có gói đăng ký đang hoạt động.',
            id: 'Tidak ada langganan aktif.',
            tr: 'Aktif abonelik bulunamadı.',
            pl: 'Nie znaleziono aktywnych subskrypcji.',
          }),
        );
      }
    } catch {
      Alert.alert(
        triLang(lang, {
          ru: 'Ошибка',
          uk: 'Помилка',
          es: 'Error',
          'pt-BR': 'Erro',
          vi: 'Lỗi',
          id: 'Error',
          tr: 'Hata',
          pl: 'Błąd',
        }),
        triLang(lang, {
          ru: 'Не удалось восстановить покупки. Попробуй позже.',
          uk: 'Не вдалося відновити покупки. Спробуй пізніше.',
          es: 'No se pudieron restaurar las compras. Inténtalo más tarde.',
          'pt-BR': 'Não foi possível restaurar as compras. Tente mais tarde.',
          vi: 'Không khôi phục được giao dịch mua. Hãy thử lại sau.',
          id: 'Tidak bisa memulihkan pembelian. Coba lagi nanti.',
          tr: 'Satın alımlar geri yüklenemedi. Daha sonra tekrar dene.',
          pl: 'Nie udało się przywrócić zakupów. Spróbuj później.',
        }),
      );
    } finally {
      setRestoring(false);
    }
  }, [router, restoring, purchasing, context, variant, lang, reloadEnergy, finishPersonalPlanActivationFlow]);

  // ── закрытие ───────────────────────────────────────────────────────────────
  // Фактическое закрытие пейвола (после exit-оффера или сразу, если оффер не нужен).
  const doClose = useCallback((reason: 'close' | 'continue_free') => {
    void trackEvent('paywall_close', { context, source, paywall: variant, reason });
    logPaywallFunnel('close', { variant, context, plan: selected });
    if (!DEV_IAP_BYPASS) void schedulePaywallAbandonedNotification(lang).catch(() => {});
    // Онбординг: закрытие пейвола (без покупки) НЕ выкидывает на home, а возвращает
    // на следующий шаг онбординга — ввод имени. Раньше safeRouterBack уводил на home
    // (premium_modal — транзитный редирект, в стек не кладётся → fallback=home), и
    // онбординг в этой сессии не продолжался. Эмитим тот же ивент, что и успешная
    // покупка плана: _layout слушает его, ставит onboarding_step='name' и снова
    // показывает онбординг-оверлей на шаге имени.
    if (source === 'onboarding_plan') {
      void (async () => {
        try {
          await AsyncStorage.multiSet([
            ['onboarding_step', 'name'],
            [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
          ]);
          await AsyncStorage.removeItem('onboarding_done');
        } catch { /* best-effort */ }
        // НЕ навигируем на '/(tabs)/home'. Слушатель в _layout по этому событию
        // синхронно поднимает непрозрачный онбординг-оверлей (absoluteFill, zIndex 50) —
        // он перекрывает оставшийся под ним пейвол. Навигация на «Главную» здесь
        // монтировала тяжёлый домашний экран (≈4с «думает») и на кадр показывала
        // «Главную» до подъёма оверлея (мелькание home перед экраном имени).
        emitAppEvent('personal_plan_onboarding_nickname_ready');
      })();
      return;
    }
    dismissPaywallModal(router);
  }, [router, context, source, variant, selected, lang]);

  // Exit-intent оффер триала: при попытке уйти с high-value контекста, когда в
  // сторе реально есть бесплатный триал, мягко спрашиваем «может, всё-таки 3 дня
  // бесплатно?» — без давления, с честным «платить не нужно, отмени за день».
  // Показываем ОДИН раз на устройство (кулдаун-ключ), и только если триал есть в
  // сторе — иначе это была бы пустая всплывашка. Не в онбординге.
  const exitOfferShownRef = useRef(false);
  const handleClose = useCallback((reason: 'close' | 'continue_free') => {
    hapticTap();
    // Перехват на выходе: показываем тёплый оффер один раз за сессию экрана.
    // DEV/QA: при форс-триале (_force_trial_ui) показываем на ЛЮБОМ контексте и без
    // «уже видели», чтобы можно было проверять многократно из тест-меню.
    const exitEligible = devForceTrial
      ? source !== 'onboarding_plan' && (reason === 'close' || reason === 'continue_free') && !!trialDays
      : shouldShowExitTrialOffer({
          context,
          closeReason: reason,
          viewMode: 'purchase',
          openManageFromSettings: false,
          purchasing,
          restoring,
          hasStoreTrial: !!trialDays,
          alreadySeen: false,
          forceTrialUI: false,
        });
    if (
      !exitOfferShownRef.current &&
      source !== 'onboarding_plan' &&
      exitEligible
    ) {
      exitOfferShownRef.current = true;
      void (async () => {
        try {
          const seen = await AsyncStorage.getItem(EXIT_TRIAL_OFFER_SEEN_KEY);
          // В dev-форсе кулдаун-ключ игнорируем — пусть показывается каждый раз.
          if (seen === '1' && !devForceTrial) { doClose(reason); return; }
          if (!devForceTrial) await AsyncStorage.setItem(EXIT_TRIAL_OFFER_SEEN_KEY, '1').catch(() => {});
        } catch { /* при сбое чтения — просто закрываем без оффера */ doClose(reason); return; }
        void trackEvent('paywall_exit_offer_shown', { context, source, paywall: variant });
        const days = trialDays ?? 3;
        Alert.alert(
          triLang(lang, {
            ru: `Точно уходишь? ${days} дня доступа — бесплатно`,
            uk: `Точно йдеш? ${days} дні доступу — безкоштовно`,
            es: `¿Seguro que te vas? ${days} días de acceso gratis`,
            'pt-BR': `Tem certeza? ${days} dias de acesso grátis`,
            vi: `Bạn chắc muốn rời đi? ${days} ngày dùng thử miễn phí`,
            id: `Yakin mau keluar? ${days} hari akses gratis`,
            tr: `Gerçekten çıkıyor musun? ${days} gün ücretsiz erişim`,
            pl: `Na pewno wychodzisz? ${days} dni dostępu za darmo`,
          }),
          triLang(lang, {
            ru: 'Платить сейчас не нужно — просто отмени подписку за день до конца пробного периода, и не спишется ничего.',
            uk: 'Платити зараз не треба — просто скасуй підписку за день до кінця пробного періоду, і нічого не спишеться.',
            es: 'No pagas ahora: solo cancela la suscripción un día antes de que acabe la prueba y no se cobrará nada.',
            'pt-BR': 'Você não paga agora: basta cancelar a assinatura um dia antes do fim do teste e nada será cobrado.',
            vi: 'Chưa phải trả tiền — chỉ cần hủy đăng ký trước khi hết hạn dùng thử một ngày là không bị tính phí.',
            id: 'Belum bayar sekarang — cukup batalkan langganan sehari sebelum masa uji coba berakhir, tak ada tagihan.',
            tr: 'Şimdi ödeme yok — deneme bitmeden bir gün önce aboneliği iptal et, hiçbir ücret alınmaz.',
            pl: 'Teraz nie płacisz — wystarczy anulować subskrypcję dzień przed końcem okresu próbnego i nic nie pobierzemy.',
          }),
          [
            {
              text: triLang(lang, {
                ru: `Попробовать ${days} дня бесплатно`,
                uk: `Спробувати ${days} дні безкоштовно`,
                es: `Probar ${days} días gratis`,
                'pt-BR': `Testar ${days} dias grátis`,
                vi: `Dùng thử ${days} ngày miễn phí`,
                id: `Coba ${days} hari gratis`,
                tr: `${days} gün ücretsiz dene`,
                pl: `Wypróbuj ${days} dni za darmo`,
              }),
              onPress: () => {
                void trackEvent('paywall_exit_offer_accepted', { context, source, paywall: variant });
                void handlePurchase();
              },
            },
            {
              text: triLang(lang, {
                ru: 'Не сейчас', uk: 'Не зараз', es: 'Ahora no', 'pt-BR': 'Agora não',
                vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz',
              }),
              style: 'cancel',
              onPress: () => {
                void trackEvent('paywall_exit_offer_declined', { context, source, paywall: variant });
                doClose(reason);
              },
            },
          ],
          { cancelable: false },
        );
      })();
      return;
    }
    doClose(reason);
  }, [context, source, variant, purchasing, restoring, trialDays, lang, handlePurchase, doClose, devForceTrial]);

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
  };
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

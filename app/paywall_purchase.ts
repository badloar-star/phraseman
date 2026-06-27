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
import { isLifetimeButtonEnabled, isPaywallTimersEnabled } from './remote_flags';
import {
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatPremiumMetadata,
} from './premium_revenuecat_state';
import { computeSavingsPct, computePerDayString } from './paywall_pricing';
import { getTrialInfo, trialDaysOrDefault, type TrialInfo } from './paywall_trial_info';
import { activateUrgencyIfNeeded, getUrgencyState, getDoubledPrice, type UrgencyState } from './paywall_urgency';
import { logPaywallFunnel } from './paywall_funnel';
import type { PaywallAbVariant } from './paywall_variant';
import {
  scheduleTrialEndReminder,
  schedulePaywallAbandonedNotification,
  requestNotificationPermission,
} from './notifications';
import { safeRouterBack } from './navigation_back';
import { hapticTap } from '../hooks/use-haptics';
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

  // ── цены ───────────────────────────────────────────────────────────────────
  // В стор-сборке — ТОЛЬКО из стора (никаких хардкодов). В dev-сборке стор не
  // опрашивается (DEV_IAP_BYPASS), поэтому подставляем плейсхолдеры, чтобы таймер
  // и кнопка «Навсегда» были видны и в Metro. В покупку плейсхолдеры не уходят.
  const yearlyPrice = storePriceTrim(packages.yearly?.product?.priceString) || (DEV_IAP_BYPASS ? DEV_PREVIEW_YEARLY_PRICE : '');
  const monthlyPrice = storePriceTrim(packages.monthly?.product?.priceString) || (DEV_IAP_BYPASS ? DEV_PREVIEW_MONTHLY_PRICE : '');
  const lifetimePrice = storePriceTrim(packages.lifetime?.product?.priceString) || (DEV_IAP_BYPASS ? DEV_PREVIEW_LIFETIME_PRICE : '');
  const yearlyPerMonth = storePricePerMonthTrim(packages.yearly) || (DEV_IAP_BYPASS ? DEV_PREVIEW_YEARLY_PER_MONTH : '');
  const monthlyPerMonth = storePricePerMonthTrim(packages.monthly);
  // Кнопка «Навсегда» показывается, когда админ-флаг включён И пакет lifetime
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
        // Возврат в онбординг на шаг «Имя»: слушатель _layout синхронно поднимает
        // непрозрачный оверлей. Намеренно НЕ навигируем на «Главную» — иначе кадр с
        // home + монтаж тяжёлого экрана (см. handleClose ниже).
        emitAppEvent('personal_plan_onboarding_nickname_ready');
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
        if (context === 'personal_plan') {
          await finishPersonalPlanActivationFlow();
          return;
        }
        safeRouterBack(router);
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
  // Без exit-intent оффера: триал и так виден на самом пейволе (таймлайн/ribbon),
  // дублировать всплывашкой не нужно. При закрытии планируем мягкое re-engage
  // напоминание через ~1ч (один раз за окно, кулдаун 23ч — не спамит).
  const handleClose = useCallback((reason: 'close' | 'continue_free') => {
    hapticTap();
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
    safeRouterBack(router);
  }, [router, context, source, variant, selected, lang]);

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

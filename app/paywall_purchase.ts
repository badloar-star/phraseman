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
import { Alert, AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import Purchases, { INTRO_ELIGIBILITY_STATUS, PURCHASES_ERROR_CODE, type PurchasesPackage } from 'react-native-purchases';

import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import { isLifetimeButtonEnabled, isPaywallTimersEnabled } from './remote_flags';
import {
  customerInfoConfirmsProductAccess,
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatCustomerInfoHasPremiumAccess,
  revenueCatPremiumMetadata,
} from './premium_revenuecat_state';
import { computeSavingsPct, computePerDayString } from './paywall_pricing';
import { getTrialInfo, type TrialEligibility, type TrialInfo } from './paywall_trial_info';
import { readOnboardingNotificationChoice } from './onboarding_notification_choice';
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
import { soundDirector } from '../modules/audio/sound_director';
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
import { createPaywallAnalyticsImpression, paywallImpressionParams, type PaywallAnalyticsImpression } from './paywall_analytics_impression';
import { trackProductOperationFailure } from './product_operation_analytics';
import { claimInitialInventoryResolution, classifyPaywallInventory } from './paywall_inventory_analytics';
import { triLang, type Lang } from '../constants/i18n';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import { persistPortableProgressRegister } from './phone_state_progress_register_bridge';
import { markCelebrationPending } from './premium_celebration_state';
import { useEnergy } from '../components/EnergyContext';
import { invalidatePremiumCache } from './premium_guard';
import { resumeLessonAfterPremium } from './paywall_lesson_continuation';
import { activatePendingPersonalPlanAfterPremium } from './personal_plan_activation';
import { prefetchWholePlanContentInBackground } from './plan_content_prefetch';
import type { PersonalPlanState } from './personal_plan_state';
import {
  hasCurrentPersonalPlanSunsetAccess,
  personalPlanPostPremiumRoute,
} from './personal_plan_post_premium';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
} from './account_generation';
import {
  commitRevenueCatResultForGeneration,
  runRevenueCatOperationForGeneration,
} from './revenuecat_account_identity';

export type PaywallPlan = 'monthly' | 'yearly' | 'lifetime';

/** Exit-intent оффер триала: готовая копия + колбэки под <ThemedConfirmModal>.
 *  Хук — .ts и JSX не рендерит, поэтому отдаёт состояние, а рисует его экран. */
export type ExitTrialOfferState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};
type PremiumPackages = { monthly?: PurchasesPackage; yearly?: PurchasesPackage; lifetime?: PurchasesPackage };

/**
 * Источники пейвола, где разовая покупка «Phraseman Pro» (lifetime) НЕ показывается.
 * Онбординг: новичок на первом экране выбирает из двух планов (месяц/год) —
 * третий вариант с ценой ×20 от годовой перегружает решение и роняет конверсию.
 * Во всех остальных точках входа (после урока, энергия, профиль, win-back) Pro
 * остаётся: там пользователь уже вовлечён и разовая покупка уместна.
 */
const LIFETIME_HIDDEN_SOURCES: ReadonlySet<string> = new Set(['onboarding', 'onboarding_plan']);

/**
 * Продажа «Phraseman Pro» (разовая покупка lifetime) СНЯТА С ВИТРИНЫ.
 *
 * Владелец 2026-08-24: «подписку Pro убери полностью», её место на пейволах
 * занимает тариф MAX (карточка/плитка MAX уже живёт в PaywallPlanCards,
 * PaywallPlanTiles и варианте E и уводит на /max_paywall).
 *
 * Это скрытие ПРОДАЖИ, а не отзыв доступа — прямое решение владельца:
 * уже купившие Pro сохраняют полный доступ навсегда. Их премиум держится на
 * entitlement RevenueCat (см. premium_guard/premium_revenuecat_state), а не на
 * видимости этой карточки, поэтому здесь трогать нечего.
 *
 * зачем именно константа, а не только дефолт флага: флаг lifetime_button_enabled
 * переопределяется из «Пульта» живьём, и случайный override вернул бы Pro на
 * витрину незаметно. Код покупки lifetime намеренно оставлен рабочим — вернуть
 * продажу можно снятием этой пломбы (одна строка) без разбора мёртвого кода.
 */
const LIFETIME_SALE_RETIRED = true;

// Онбординг уже содержит собственный финальный экран и после покупки сразу
// отдаёт управление приложению. Празднование Plus здесь стало бы вторым экраном
// после подтверждённой покупки, что прямо запрещено контрактом онбординга.
const ONBOARDING_PURCHASE_SOURCES = new Set(['onboarding', 'onboarding_plan']);

/** Exit-intent триал-оффер показываем не чаще одного раза на устройство. */
const EXIT_TRIAL_OFFER_SEEN_KEY = 'paywall_exit_trial_offer_seen_v1';

/**
 * Покупка ушла на внешнее подтверждение (iOS «Ask to Buy» у ребёнка, банковское
 * 3-D Secure). Это НЕ ошибка: платить повторно не нужно — доступ включится сам,
 * когда платёж подтвердят (слушатель customerInfo / TRANSFER-вебхук).
 */
function showPurchasePendingAlert(lang: Lang): void {
  Alert.alert(
    triLang(lang, {
      ru: 'Покупка ждёт подтверждения',
      uk: 'Покупка чекає підтвердження',
      es: 'Compra pendiente de aprobación',
      'pt-BR': 'Compra aguardando aprovação',
      vi: 'Giao dịch đang chờ xác nhận',
      id: 'Pembelian menunggu persetujuan',
      tr: 'Satın alma onay bekliyor',
      pl: 'Zakup czeka na zatwierdzenie',
    }),
    triLang(lang, {
      ru: 'Оплата ожидает подтверждения — например, родителя или банка. Как только её подтвердят, доступ включится сам. Покупать повторно не нужно.',
      uk: 'Оплата очікує підтвердження — наприклад, батьків або банку. Щойно її підтвердять, доступ увімкнеться сам. Купувати повторно не потрібно.',
      es: 'El pago espera aprobación, por ejemplo de tus padres o del banco. En cuanto lo aprueben, el acceso se activará solo. No necesitas comprar de nuevo.',
      'pt-BR': 'O pagamento aguarda aprovação — por exemplo, dos pais ou do banco. Assim que for aprovado, o acesso será ativado sozinho. Não é preciso comprar de novo.',
      vi: 'Thanh toán đang chờ xác nhận — ví dụ từ phụ huynh hoặc ngân hàng. Ngay khi được xác nhận, quyền truy cập sẽ tự bật. Không cần mua lại.',
      id: 'Pembayaran menunggu persetujuan — misalnya dari orang tua atau bank. Begitu disetujui, akses akan aktif otomatis. Tidak perlu membeli lagi.',
      tr: 'Ödeme onay bekliyor — örneğin ebeveyn veya banka onayı. Onaylanır onaylanmaz erişim kendiliğinden açılacak. Tekrar satın almana gerek yok.',
      pl: 'Płatność czeka na zatwierdzenie — np. przez rodzica lub bank. Gdy tylko zostanie zatwierdzona, dostęp włączy się sam. Nie musisz kupować ponownie.',
    }),
  );
}

function showDevPurchasePreviewAlert(lang: Lang): void {
  Alert.alert(
    triLang(lang, {
      ru: 'Предпросмотр покупки',
      uk: 'Попередній перегляд покупки',
      es: 'Vista previa de compra',
      'pt-BR': 'Prévia da compra',
      vi: 'Xem trước giao dịch mua',
      id: 'Pratinjau pembelian',
      tr: 'Satın alma önizlemesi',
      pl: 'Podgląd zakupu',
    }),
    triLang(lang, {
      ru: 'Покупка не запускалась: в обычной dev-сборке магазин отключён. Проверь реальную покупку в сборке с подключённым магазином или включи доступ через явный QA-инструмент.',
      uk: 'Покупка не запускалася: у звичайній dev-збірці магазин вимкнений. Перевір реальну покупку у збірці з підключеним магазином або ввімкни доступ через окремий QA-інструмент.',
      es: 'La compra no se inició: la tienda está desactivada en la compilación de desarrollo normal. Prueba una compra real en una compilación conectada a la tienda o activa el acceso con una herramienta de QA explícita.',
      'pt-BR': 'A compra não foi iniciada: a loja fica desativada na compilação de desenvolvimento comum. Teste uma compra real em uma compilação conectada à loja ou ative o acesso com uma ferramenta explícita de QA.',
      vi: 'Giao dịch mua chưa được bắt đầu: cửa hàng bị tắt trong bản dev thông thường. Hãy thử giao dịch thật trong bản có kết nối cửa hàng hoặc bật quyền truy cập bằng công cụ QA riêng.',
      id: 'Pembelian tidak dimulai: toko dinonaktifkan pada build dev biasa. Uji pembelian nyata pada build yang terhubung ke toko atau aktifkan akses melalui alat QA khusus.',
      tr: 'Satın alma başlatılmadı: normal geliştirme derlemesinde mağaza kapalıdır. Gerçek satın almayı mağazaya bağlı bir derlemede test et veya erişimi açık bir QA aracıyla etkinleştir.',
      pl: 'Zakup nie został rozpoczęty: sklep jest wyłączony w zwykłej wersji deweloperskiej. Sprawdź prawdziwy zakup w kompilacji połączonej ze sklepem albo włącz dostęp za pomocą jawnego narzędzia QA.',
    }),
  );
}

export function storePriceTrim(raw: string | undefined | null): string {
  if (!raw) return '';
  // (?![a-zа-яёіїєґ]) вместо \b: ASCII-\b не срабатывает после кириллицы
  // (мес/місяць/месяц), из-за чего RU/UK-суффиксы «/мес» не срезались.
  return raw.replace(/\s*\/\s*(mo|month|мес|місяць|месяц)(?![a-zа-яёіїєґ]).*/i, '').trim();
}

export type PurchaseErrorCategory =
  | 'network_error'
  | 'payment_error'
  | 'store_error'
  | 'configuration_error'
  | 'sdk_other'
  | 'unknown';

/** Privacy-safe analytics category. Raw SDK messages may contain user or payment details. */
export function purchaseErrorCategory(error: unknown): PurchaseErrorCategory {
  if (!error || typeof error !== 'object') return 'unknown';
  const code = String((error as { code?: unknown }).code ?? '').trim().toLowerCase();
  if (!code) return 'unknown';
  if (code.includes('network')) return 'network_error';
  if (code.includes('payment') || code.includes('purchase_not_allowed')) return 'payment_error';
  if (code.includes('store') || code.includes('product') || code.includes('package')) return 'store_error';
  if (code.includes('config') || code.includes('api_key')) return 'configuration_error';
  return 'sdk_other';
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
  impression?: PaywallAnalyticsImpression;
  /**
   * DEV/QA: форс «триал-режима» из тест-меню (_force_trial_ui=1). В Metro стора
   * нет (DEV_IAP_BYPASS) → trialDays обычно null, и триал-зависимое (trust-бейдж
   * «платить не нужно», exit-оффер, trial-таймлайн) не показать. Этот флаг
   * включает превью-триал ТОЛЬКО в dev-бандле. В сторе игнорируется.
   */
  forceTrialUI?: boolean;
  /** Allowlisted legacy lesson id to reopen after confirmed access. */
  resumeLessonId?: number | null;
}

export function usePaywallPurchase({ variant, context, source, lang, forceTrialUI, resumeLessonId, impression: suppliedImpression }: PaywallPurchaseArgs) {
  const router = useRouter();
  const { refillToMax } = useEnergy();
  const [impression] = useState(() => suppliedImpression ?? createPaywallAnalyticsImpression(Crypto.randomUUID));
  const [selected, setSelected] = useState<PaywallPlan>('yearly');
  const [packages, setPackages] = useState<PremiumPackages>({});
  const [introEligibility, setIntroEligibility] = useState<Record<string, TrialEligibility>>({});
  const packagesRef = useRef<PremiumPackages>({});
  const offeringsLoadInFlightRef = useRef(false);
  const [loading, setLoading] = useState(false);
  // Сбой загрузки офферингов (сеть/стор). Влияет на видимость всех кнопок,
  // включая Phraseman Pro — поэтому даём ретрай, а не молча скрываем.
  const [offeringsFailed, setOfferingsFailed] = useState(false);
  const inventoryResolutionEmittedRef = useRef({ emitted: false });
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const operationRef = useRef<'purchase' | 'restore' | null>(null);
  const [lifetimeEnabled, setLifetimeEnabled] = useState(() => isLifetimeButtonEnabled());
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

  useEffect(() => {
    const subscription = onAppEvent('remote_config_changed', () => {
      const next = isLifetimeButtonEnabled();
      setLifetimeEnabled(current => current === next ? current : next);
    });
    return () => subscription.remove();
  }, []);

  // Загрузка офферингов с одним авто-ретраем при сбое: транзиентный сбой сети
  // не должен прятать кнопки бессрочно (в т.ч. Phraseman Pro). `dead` гасит гонку.
  const loadOfferings = useCallback(async (
    deadRef: { dead: boolean },
    emitInitialResolution = false,
  ): Promise<void> => {
    if (DEV_IAP_BYPASS) return;
    if (offeringsLoadInFlightRef.current) return;
    offeringsLoadInFlightRef.current = true;
    setLoading(true);
    setOfferingsFailed(false);
    const attempt = async (): Promise<{ ok: boolean; resolvedPackages: PremiumPackages }> => {
      try {
        await initRevenueCat();
        const o = await Purchases.getOfferings();
        const resolvedPackages = resolvePremiumPackages(o.current?.availablePackages ?? []);
        let resolvedEligibility: Record<string, TrialEligibility> = {};
        if (Platform.OS === 'ios') {
          const productIds = [resolvedPackages.monthly, resolvedPackages.yearly]
            .map((item) => item?.product.identifier)
            .filter((value): value is string => Boolean(value));
          if (productIds.length > 0) {
            try {
              const statuses = await Purchases.checkTrialOrIntroductoryPriceEligibility(productIds);
              resolvedEligibility = Object.fromEntries(productIds.map((productId) => {
                const status = statuses[productId]?.status;
                if (status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE) {
                  return [productId, 'eligible'];
                }
                if (
                  status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_INELIGIBLE
                  || status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_NO_INTRO_OFFER_EXISTS
                ) {
                  return [productId, 'ineligible'];
                }
                return [productId, 'unknown'];
              }));
            } catch {
              resolvedEligibility = Object.fromEntries(productIds.map((productId) => [productId, 'unknown']));
            }
          }
        }
        if (!deadRef.dead) {
          packagesRef.current = resolvedPackages;
          setPackages(resolvedPackages);
          setIntroEligibility(resolvedEligibility);
        }
        return { ok: true, resolvedPackages };
      } catch {
        return { ok: false, resolvedPackages: {} };
      }
    };
    try {
      let loadAttempts = 1;
      let result = await attempt();
      if (!result.ok && !deadRef.dead) {
        await new Promise((r) => setTimeout(r, 1500));
        if (!deadRef.dead) {
          loadAttempts = 2;
          result = await attempt();
        }
      }
      if (!deadRef.dead && !result.ok) {
        setOfferingsFailed(true);
        trackProductOperationFailure('paywall', 'offerings_load', 'store_unavailable', true);
      }
      if (!deadRef.dead && emitInitialResolution && claimInitialInventoryResolution(inventoryResolutionEmittedRef.current)) {
        const inventory = classifyPaywallInventory({
          monthly: !!result.resolvedPackages.monthly,
          yearly: !!result.resolvedPackages.yearly,
          lifetime: !!result.resolvedPackages.lifetime,
        }, {
          loadSucceeded: result.ok,
          lifetimeExpected: isLifetimeButtonEnabled(),
          loadAttempts,
        });
        void trackEvent('paywall_inventory_resolved', {
          context,
          source,
          paywall: variant,
          ...inventory,
          ...paywallImpressionParams(impression),
        });
      }
    } finally {
      offeringsLoadInFlightRef.current = false;
      if (!deadRef.dead) setLoading(false);
    }
  }, [context, impression, source, variant]);

  useEffect(() => {
    if (DEV_IAP_BYPASS) return;
    const deadRef = { dead: false };
    const refreshIfPackagesMissing = () => {
      if (!packagesRef.current.monthly || !packagesRef.current.yearly) {
        void loadOfferings(deadRef, true);
      }
    };

    refreshIfPackagesMissing();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refreshIfPackagesMissing();
    });
    return () => {
      deadRef.dead = true;
      subscription.remove();
    };
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
  // зачем: владелец попросил убрать разовую покупку Pro с пейвола ОНБОРДИНГА —
  // новичку на первом экране нужен выбор из двух (месяц/год), третий вариант
  // с ценой ×20 перегружает решение. Вне онбординга (после урока, энергия,
  // профиль) Pro остаётся — там пользователь уже вовлечён.
  const lifetimeAvailable = !LIFETIME_SALE_RETIRED
    && lifetimeEnabled
    && !LIFETIME_HIDDEN_SOURCES.has(source)
    && (!!packages.lifetime || DEV_IAP_BYPASS);

  useEffect(() => {
    if (!lifetimeAvailable && selected === 'lifetime') setSelected('yearly');
  }, [lifetimeAvailable, selected]);

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
  const selectedPkg = selected === 'lifetime'
    ? (lifetimeAvailable ? lifetimePkg : undefined)
    : selected === 'yearly' ? packages.yearly : packages.monthly;
  const selectedProductId = selectedPkg?.product.identifier;
  const selectedEligibility = selectedProductId ? introEligibility[selectedProductId] ?? 'unknown' : 'unknown';
  const trial: TrialInfo = useMemo(
    () => getTrialInfo(selectedPkg, selectedEligibility),
    [selectedEligibility, selectedPkg],
  );
  // В dev-бандле тест-меню может форсить триал-режим (_force_trial_ui=1), чтобы
  // увидеть trust-бейдж/exit-оффер/таймлайн без стора. В сторе forceTrialUI=false.
  const devForceTrial = DEV_IAP_BYPASS && forceTrialUI === true;
  const subscriptionTrialDays = trial.hasTrial ? trial.days : devForceTrial ? 3 : null;
  const trialDays = selected === 'lifetime' ? null : subscriptionTrialDays;
  const selectedAvailable = DEV_IAP_BYPASS || Boolean(selectedPkg);
  const ctaDisabled = purchasing || loading || restoring || !selectedAvailable;

  // «Будущая» цена выбранного плана (×2 из реальной цены стора) — ТОЛЬКО для
  // отображения в PaywallPriceUrgency; в Purchases никогда не уходит.
  const selectedPrice = selected === 'lifetime' ? lifetimePrice : selected === 'yearly' ? yearlyPrice : monthlyPrice;
  const futurePrice = useMemo(() => (selectedPrice ? getDoubledPrice(selectedPrice) : null), [selectedPrice]);

  const selectPlan = useCallback((plan: PaywallPlan) => {
    if (plan === 'lifetime' && !lifetimeAvailable) return;
    hapticTap();
    // зачем: выбор тарифа был единственным действием на пейволе без слухового
    // отклика — вибрация есть, звука нет. Короткий сигнал подтверждает выбор,
    // не празднуя его: покупка ещё не совершена.
    soundDirector.request('pm.paywall.plan_select', { scope: 'paywall' });
    setSelected(plan);
    void trackEvent('paywall_plan_select', { context, source, plan, paywall: variant, ...paywallImpressionParams(impression) });
  }, [context, impression, lifetimeAvailable, source, variant]);

  // ── покупка ────────────────────────────────────────────────────────────────
  const finishOnboardingPaywallFlow = useCallback(async (
    isCurrent: () => boolean = () => true,
  ): Promise<boolean> => {
    if (!isCurrent()) return false;
    invalidatePremiumCache();
    await AsyncStorage.setItem('had_premium_ever', '1').catch(() => {});
    if (!isCurrent()) return false;
    emitAppEvent('premium_activated');
    if (!(await refillToMax(isCurrent))) return false;

    try {
      await persistPortableProgressRegister('onboarding_step', 'name');
      await persistPortableProgressRegister('onboarding_done', null);
      emitAppEvent('onboarding_paywall_completed');
      return true;
    } catch {
      return false;
    }
  }, [refillToMax]);

  const handlePurchase = useCallback(async () => {
    if (operationRef.current) return;
    // зачем: скрытый вариант нельзя купить ни при каких гонках — проверяем и
    // глобальный флаг, и гейт по источнику (в онбординге Pro скрыт).
    if (selected === 'lifetime' && (LIFETIME_SALE_RETIRED || !isLifetimeButtonEnabled() || LIFETIME_HIDDEN_SOURCES.has(source))) {
      setSelected('yearly');
      return;
    }
    hapticTap();
    void trackEvent('paywall_cta_click', { context, source, plan: selected, paywall: variant, ...paywallImpressionParams(impression) });
    if (source === 'afterwin_levelup' || context === 'level_up') {
      void trackEvent('afterwin_upsell_cta', { source: 'level_up', plan: selected, paywall: variant });
      void import('./firebase').then(({ logAfterWinUpsellCta }) =>
        logAfterWinUpsellCta('level_up', selected),
      ).catch(() => {});
    }
    logPaywallFunnel('cta_click', { variant, context, plan: selected });
    if (DEV_IAP_BYPASS) {
      showDevPurchasePreviewAlert(lang);
      return;
    }
    const pkg = selected === 'lifetime' ? packages.lifetime : selected === 'yearly' ? packages.yearly : packages.monthly;
    if (!pkg || purchasing || restoring) return;
    operationRef.current = 'purchase';
    const operationAccount = captureAccountGeneration();
    const isOperationAccountCurrent = () => isCurrentAccountGeneration(operationAccount);
    let activatedPersonalPlan: PersonalPlanState | null = null;
    setPurchasing(true);
    // зачем: между нажатием «Купить» и ответом стора проходит секунда-две, и
    // всё это время интерфейс молчал. Звук подтверждает, что запрос ушёл —
    // не празднование, а «принято, ждём».
    soundDirector.request('pm.purchase.start', { scope: 'paywall' });
    void trackEvent('purchase_started', { context, source, plan: selected, product_id: pkg.product.identifier, paywall: variant, ...paywallImpressionParams(impression) });
    try {
      if (
        context === 'personal_plan'
        && source !== 'onboarding_plan'
        && !(await hasCurrentPersonalPlanSunsetAccess())
      ) {
        markNextNavigationAsReplace();
        router.replace(personalPlanPostPremiumRoute(false) as any);
        return;
      }
      await initRevenueCat(isOperationAccountCurrent);
      if (!(await syncRevenueCatIdentity(isOperationAccountCurrent))) {
        // зачем: голый системный Alert не годится для фирменного фидбека — владелец
        // попросил заменить на тост-механизм (тот же, что в shards_shop/coin_exchange).
        // Ошибка обязана остаться видимой, а не молча уйти в тишину.
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не удалось связаться с магазином. Попробуй позже.',
          uk: 'Не вдалося зв’язатися з магазином. Спробуй пізніше.',
          es: 'No pudimos contactar la tienda. Inténtalo más tarde.',
          'pt-BR': 'Não foi possível contactar a loja. Tente mais tarde.',
          vi: 'Không liên hệ được với cửa hàng. Hãy thử lại sau.',
          id: 'Tidak bisa menghubungi toko. Coba lagi nanti.',
          tr: 'Mağazaya bağlanılamadı. Daha sonra tekrar dene.',
          pl: 'Nie udało się połączyć ze sklepem. Spróbuj później.',
        }));
        void trackEvent('purchase_failed', { context, plan: selected, paywall: variant, error: 'identity_sync', ...paywallImpressionParams(impression) });
        return;
      }
      const pkgEligibility = introEligibility[pkg.product.identifier] ?? 'unknown';
      const pkgTrial = getTrialInfo(pkg, pkgEligibility);
      const purchaseResult = await runRevenueCatOperationForGeneration(
        operationAccount,
        () => Purchases.purchasePackage(pkg), // RAW пакет — цена стора без изменений
      );
      if (purchaseResult.status !== 'ok') return;
      const { customerInfo } = purchaseResult.value;
      // Премиум включаем ТОЛЬКО при реально активном entitlement (как в restore):
      // deferred-исход / аномалия sandbox без этой проверки давали локальный
      // «премиум», которого нет на сервере, — доступ потом «отваливался».
      if (!customerInfoConfirmsProductAccess(customerInfo, pkg.product.identifier)) {
        // error-тег вместо отдельного имени события: тип AnalyticsEvent живёт в
        // analytics.ts, который сейчас правит другая сессия — не трогаем.
        void trackEvent('purchase_failed', {
          context, plan: selected, product_id: pkg.product.identifier, paywall: variant,
          error: 'no_active_entitlement_after_purchase',
          ...paywallImpressionParams(impression),
        });
        showPurchasePendingAlert(lang);
        return;
      }
      const metadata = revenueCatPremiumMetadata(customerInfo, pkg.product.identifier);
      const confirmedPlan = inferPremiumPlanFromProductId(metadata.productId, selected);
      const applied = await commitRevenueCatResultForGeneration(operationAccount, async (isCommitCurrent) => {
        if (!isCommitCurrent()) return false;
        const persisted = await persistStorePremiumLocally(
          confirmedPlan,
          metadata,
          isCommitCurrent,
          false,
          true,
        );
        if (!persisted || !isCommitCurrent()) return false;
        if (!(await refillToMax(isCommitCurrent))) return false;
        if (context === 'personal_plan') {
          activatedPersonalPlan = await activatePendingPersonalPlanAfterPremium();
          if (!isCommitCurrent()) return false;
        }
        // Разовая покупка Phraseman Pro (lifetime) → синяя Pro-анимация; подписка → жёлтый Plus.
        // В онбординге после подтверждения сразу открывается приложение — без
        // дополнительного экрана празднования поверх первого домашнего кадра.
        if (!ONBOARDING_PURCHASE_SOURCES.has(source)) {
          await markCelebrationPending(null, confirmedPlan === 'lifetime' ? 'pro' : 'premium');
        }
        if (!isCommitCurrent()) return false;
        emitAppEvent('premium_activated');
        return isCommitCurrent();
      });
      if (applied.status !== 'ok' || !applied.value) return;
      // зачем (Бандл-диета Ф1): план куплен → сразу фоновый префетч всех его
      // день-строк с сервера, чтобы контент лежал в кэше до входа в любой день.
      // Передаём состояние целиком: присваивание идёт внутри async-колбэка,
      // из-за чего TS сужает замыкание до never при обращении к полю.
      if (activatedPersonalPlan) prefetchWholePlanContentInBackground(activatedPersonalPlan);
      void trackEvent('purchase_completed', { context, source, plan: selected, product_id: pkg.product.identifier, with_trial: pkgTrial.hasTrial, paywall: variant, ...paywallImpressionParams(impression) });
      logPaywallFunnel('purchase_completed', { variant, context, plan: selected, price: storePriceTrim(pkg.product.priceString) || null });
      if (pkgTrial.hasTrial) {
        void trackEvent('trial_started', { context, plan: selected, product_id: pkg.product.identifier, paywall: variant, ...paywallImpressionParams(impression) });
        logPaywallFunnel('trial_started', { variant, context, plan: selected });
        // Момент Blinkist: триал только что начался — просим разрешение и реально
        // ставим напоминание за день до списания. Обещание таймлайна = правда.
        void (async () => {
          try {
            const reminderChoice = ONBOARDING_PURCHASE_SOURCES.has(source)
              ? await readOnboardingNotificationChoice()
              : null;
            if (reminderChoice === 'skip' || reminderChoice === 'blocked') return;
            const granted = await requestNotificationPermission();
            if (!granted) return;
            const days = pkgTrial.days;
            if (!days) return;
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
      if (source === 'onboarding') {
        if (!isOperationAccountCurrent()) return;
        const activated = await commitRevenueCatResultForGeneration(
          operationAccount,
          (isCommitCurrent) => finishOnboardingPaywallFlow(isCommitCurrent),
        );
        if (activated.status !== 'ok' || !activated.value) return;
        return;
      }
      // onboarding_plan is rendered inside CleanOnboarding, not as a route modal.
      // premium_activated above lets that component finish its own flow; dismissing
      // here would mutate an unrelated native-stack entry and can flash another screen.
      if (source === 'onboarding_plan') return;
      if (!isOperationAccountCurrent()) return;
      if (context === 'personal_plan' && source !== 'onboarding_plan') {
        const hasActivatedOrExistingPlan = activatedPersonalPlan
          ? await hasCurrentPersonalPlanSunsetAccess(activatedPersonalPlan)
          : await hasCurrentPersonalPlanSunsetAccess();
        if (!isOperationAccountCurrent()) return;
        const personalPlanRoute = personalPlanPostPremiumRoute(hasActivatedOrExistingPlan);
        markNextNavigationAsReplace();
        router.replace(personalPlanRoute as any);
        return;
      }
      if (resumeLessonAfterPremium(router, resumeLessonId)) return;
      dismissPaywallModal(router, source.startsWith('settings') ? '/(tabs)/settings' : undefined);
    } catch (err: unknown) {
      const errCode = String((err as { code?: unknown })?.code ?? '');
      if ((err as { userCancelled?: boolean })?.userCancelled) {
        void trackEvent('purchase_cancelled', { context, plan: selected, paywall: variant, ...paywallImpressionParams(impression) });
        logPaywallFunnel('purchase_cancelled', { variant, context, plan: selected });
      } else if (errCode === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        // Ask to Buy / 3-D Secure: оплата ушла на подтверждение. Раньше эта
        // ветка падала в общий «Не удалось оформить» — юзер путался и платил
        // повторно. Доступ включится сам после подтверждения платежа.
        void trackEvent('purchase_failed', {
          context, plan: selected, product_id: pkg.product.identifier, paywall: variant,
          error: 'payment_pending',
          ...paywallImpressionParams(impression),
        });
        showPurchasePendingAlert(lang);
      } else {
        void trackEvent('purchase_failed', {
          context, plan: selected, paywall: variant,
          error: purchaseErrorCategory(err),
          ...paywallImpressionParams(impression),
        });
        logPaywallFunnel('purchase_failed', { variant, context, plan: selected });
        // зачем: звучит ТОЛЬКО реальный отказ стора. Отмена пользователем и
        // «ожидает подтверждения» (Ask to Buy) — ветки выше, они молчат: там
        // человек сам всё контролирует, звук отказа читался бы как обвинение.
        soundDirector.request('pm.purchase.failed', { scope: 'paywall' });
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
      operationRef.current = null;
      setPurchasing(false);
    }
  }, [selected, packages, purchasing, restoring, router, context, source, variant, lang, refillToMax, finishOnboardingPaywallFlow, impression, introEligibility, resumeLessonId]);

  // ── восстановление ─────────────────────────────────────────────────────────
  const handleRestore = useCallback(async () => {
    if (operationRef.current) return;
    hapticTap();
    if (DEV_IAP_BYPASS || restoring || purchasing) return;
    operationRef.current = 'restore';
    const operationAccount = captureAccountGeneration();
    const isOperationAccountCurrent = () => isCurrentAccountGeneration(operationAccount);
    let activatedPersonalPlan: PersonalPlanState | null = null;
    setRestoring(true);
    try {
      if (
        context === 'personal_plan'
        && source !== 'onboarding_plan'
        && !(await hasCurrentPersonalPlanSunsetAccess())
      ) {
        markNextNavigationAsReplace();
        router.replace(personalPlanPostPremiumRoute(false) as any);
        return;
      }
      await initRevenueCat(isOperationAccountCurrent);
      if (!(await syncRevenueCatIdentity(isOperationAccountCurrent))) {
        // зачем: тот же фирменный тост вместо системного Alert, что и в purchase —
        // ошибка подключения к стору при восстановлении обязана остаться видимой.
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Не удалось связаться с магазином. Попробуй позже.',
          uk: 'Не вдалося зв’язатися з магазином. Спробуй пізніше.',
          es: 'No pudimos contactar la tienda. Inténtalo más tarde.',
          'pt-BR': 'Não foi possível contactar a loja. Tente mais tarde.',
          vi: 'Không liên hệ được với cửa hàng. Hãy thử lại sau.',
          id: 'Tidak bisa menghubungi toko. Coba lagi nanti.',
          tr: 'Mağazaya bağlanılamadı. Daha sonra tekrar dene.',
          pl: 'Nie udało się połączyć ze sklepem. Spróbuj później.',
        }));
        return;
      }
      const restoreResult = await runRevenueCatOperationForGeneration(
        operationAccount,
        () => Purchases.restorePurchases(),
      );
      if (restoreResult.status !== 'ok') return;
      const info = restoreResult.value;
      const activeSubscriptions = info.activeSubscriptions ?? [];
      if (revenueCatCustomerInfoHasPremiumAccess(info)) {
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
        const applied = await commitRevenueCatResultForGeneration(operationAccount, async (isCommitCurrent) => {
          if (!isCommitCurrent()) return false;
          const persisted = await persistStorePremiumLocally(
            plan,
            metadata,
            isCommitCurrent,
            false,
            true,
          );
          if (!persisted || !isCommitCurrent()) return false;
          if (!(await refillToMax(isCommitCurrent))) return false;
          if (context === 'personal_plan') {
            activatedPersonalPlan = await activatePendingPersonalPlanAfterPremium();
            if (!isCommitCurrent()) return false;
          }
          // То же празднование, что при покупке: без него после переустановки
          // юзер не понимал, что доступ вернулся, и порой оформлял заново.
          // Исключение — онбординг: его контракт завершает восстановление сразу
          // входом в приложение, без ещё одного экрана.
          if (!ONBOARDING_PURCHASE_SOURCES.has(source)) {
            await markCelebrationPending(null, plan === 'lifetime' ? 'pro' : 'premium');
          }
          if (!isCommitCurrent()) return false;
          emitAppEvent('premium_activated');
          return isCommitCurrent();
        });
        if (applied.status !== 'ok' || !applied.value) return;
        // зачем (Бандл-диета Ф1): восстановленная покупка тоже активирует план —
        // греем его контент фоном, как при обычной покупке (передаём состояние
        // целиком по той же причине, что и в ветке покупки выше).
        if (activatedPersonalPlan) prefetchWholePlanContentInBackground(activatedPersonalPlan);
        // зачем: раньше восстановление молча активировало премиум и закрывало пейвол —
        // владелец попросил короткое видимое подтверждение ДО навигации/закрытия,
        // тем же тост-механизмом. Логику активации/навигации ниже не трогаем.
        emitAppEvent('action_toast', actionToastTri('success', {
          ru: 'Покупки восстановлены',
          uk: 'Покупки відновлено',
          es: 'Compras restauradas',
          'pt-BR': 'Compras restauradas',
          vi: 'Đã khôi phục giao dịch mua',
          id: 'Pembelian dipulihkan',
          tr: 'Satın alımlar geri yüklendi',
          pl: 'Zakupy przywrócone',
        }));
        void trackEvent('subscription_restored', { context, paywall: variant });
        logPaywallFunnel('restore_completed', { variant, context, plan });
        if (source === 'onboarding') {
          if (!isOperationAccountCurrent()) return;
          const activated = await commitRevenueCatResultForGeneration(
            operationAccount,
            (isCommitCurrent) => finishOnboardingPaywallFlow(isCommitCurrent),
          );
          if (activated.status !== 'ok' || !activated.value) return;
          return;
        }
        if (source === 'onboarding_plan') return;
        if (!isOperationAccountCurrent()) return;
        if (context === 'personal_plan' && source !== 'onboarding_plan') {
          const hasActivatedOrExistingPlan = activatedPersonalPlan
            ? await hasCurrentPersonalPlanSunsetAccess(activatedPersonalPlan)
            : await hasCurrentPersonalPlanSunsetAccess();
          if (!isOperationAccountCurrent()) return;
          const personalPlanRoute = personalPlanPostPremiumRoute(hasActivatedOrExistingPlan);
          markNextNavigationAsReplace();
          router.replace(personalPlanRoute as any);
          return;
        }
        if (resumeLessonAfterPremium(router, resumeLessonId)) return;
        dismissPaywallModal(router, source.startsWith('settings') ? '/(tabs)/settings' : undefined);
      } else {
        // зачем: «активных покупок нет» — честная и ожидаемая ошибка (не баг), но
        // обязана остаться видимой пользователю. Системный Alert → фирменный тост.
        emitAppEvent('action_toast', actionToastTri('error', {
          ru: 'Активных подписок не обнаружено.',
          uk: 'Активних підписок не знайдено.',
          es: 'No hay suscripciones activas.',
          'pt-BR': 'Nenhuma assinatura ativa encontrada.',
          vi: 'Không có gói đăng ký đang hoạt động.',
          id: 'Tidak ada langganan aktif.',
          tr: 'Aktif abonelik bulunamadı.',
          pl: 'Nie znaleziono aktywnych subskrypcji.',
        }));
      }
    } catch {
      // зачем: сбой самого восстановления (сеть/стор) — тот же тост-механизм,
      // ошибка не должна тонуть молча.
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Не удалось восстановить покупки. Попробуй позже.',
        uk: 'Не вдалося відновити покупки. Спробуй пізніше.',
        es: 'No se pudieron restaurar las compras. Inténtalo más tarde.',
        'pt-BR': 'Não foi possível restaurar as compras. Tente mais tarde.',
        vi: 'Không khôi phục được giao dịch mua. Hãy thử lại sau.',
        id: 'Tidak bisa memulihkan pembelian. Coba lagi nanti.',
        tr: 'Satın alımlar geri yüklenemedi. Daha sonra tekrar dene.',
        pl: 'Nie udało się przywrócić zakupów. Spróbuj później.',
      }));
    } finally {
      operationRef.current = null;
      setRestoring(false);
    }
  }, [router, restoring, purchasing, context, source, variant, lang, refillToMax, finishOnboardingPaywallFlow, resumeLessonId]);

  // ── закрытие ───────────────────────────────────────────────────────────────
  // Фактическое закрытие пейвола (после exit-оффера или сразу, если оффер не нужен).
  const doClose = useCallback((reason: 'close' | 'continue_free') => {
    void trackEvent('paywall_close', { context, source, paywall: variant, reason, ...paywallImpressionParams(impression) });
    logPaywallFunnel('close', { variant, context, plan: selected });
    if (!DEV_IAP_BYPASS) void schedulePaywallAbandonedNotification(lang).catch(() => {});
    // Онбординг: закрытие пейвола (без покупки) НЕ выкидывает на home, а возвращает
    // на следующий шаг онбординга — ввод имени. Раньше safeRouterBack уводил на home
    // (premium_modal — транзитный редирект, в стек не кладётся → fallback=home), и
    // онбординг в этой сессии не продолжался. Эмитим тот же ивент, что и успешная
    // покупка плана: _layout слушает его, ставит onboarding_step='name' и снова
    // показывает онбординг-оверлей на шаге имени.
    if (source === 'onboarding') {
      void (async () => {
        try {
          await persistPortableProgressRegister('onboarding_step', 'name');
          await persistPortableProgressRegister('onboarding_done', null);
        } catch { /* best-effort */ }
        // НЕ навигируем на '/(tabs)/home'. Слушатель в _layout по этому событию
        // синхронно поднимает непрозрачный онбординг-оверлей (absoluteFill, zIndex 50) —
        // он перекрывает оставшийся под ним пейвол. Навигация на «Главную» здесь
        // монтировала тяжёлый домашний экран (≈4с «думает») и на кадр показывала
        // «Главную» до подъёма оверлея (мелькание home перед экраном имени).
        emitAppEvent('onboarding_paywall_completed');
      })();
      return;
    }
    dismissPaywallModal(router, source.startsWith('settings') ? '/(tabs)/settings' : undefined);
  }, [router, context, source, variant, selected, lang, impression]);

  // Exit-intent оффер триала: при попытке уйти с high-value контекста, когда в
  // сторе реально есть бесплатный триал, мягко напоминаем о подтверждённом числе
  // бесплатных дней — без давления и без синтетической длительности.
  // Показываем ОДИН раз на устройство (кулдаун-ключ), и только если триал есть в
  // сторе — иначе это была бы пустая всплывашка. Не в онбординге.
  // зачем: владелец увидел на экране СИСТЕМНЫЙ Alert вместо нашей модалки —
  // нативный диалог игнорирует тему приложения (белый лист с зелёными
  // капс-кнопками на Android). Оффер теперь живёт в состоянии, а рисует его
  // <ThemedConfirmModal> в экране пейвола — тот же компонент, что во всех
  // остальных подтверждениях приложения.
  const [exitOffer, setExitOffer] = useState<ExitTrialOfferState | null>(null);
  const exitOfferShownRef = useRef(false);
  const handleClose = useCallback((reason: 'close' | 'continue_free') => {
    hapticTap();
    // Перехват на выходе: показываем тёплый оффер один раз за сессию экрана.
    // DEV/QA: при форс-триале (_force_trial_ui) показываем на ЛЮБОМ контексте и без
    // «уже видели», чтобы можно было проверять многократно из тест-меню.
    const exitEligible = devForceTrial
      ? source !== 'onboarding' && (reason === 'close' || reason === 'continue_free') && !!trialDays
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
      source !== 'onboarding' &&
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
        void trackEvent('paywall_exit_offer_shown', { context, source, paywall: variant, ...paywallImpressionParams(impression) });
        const days = trialDays;
        if (!days) { doClose(reason); return; }
        setExitOffer({
          title: triLang(lang, {
            ru: `Точно уходишь? ${days} дня доступа — бесплатно`,
            uk: `Точно йдеш? ${days} дні доступу — безкоштовно`,
            es: `¿Seguro que te vas? ${days} días de acceso gratis`,
            'pt-BR': `Tem certeza? ${days} dias de acesso grátis`,
            vi: `Bạn chắc muốn rời đi? ${days} ngày dùng thử miễn phí`,
            id: `Yakin mau keluar? ${days} hari akses gratis`,
            tr: `Gerçekten çıkıyor musun? ${days} gün ücretsiz erişim`,
            pl: `Na pewno wychodzisz? ${days} dni dostępu za darmo`,
          }),
          message: triLang(lang, {
            ru: 'Платить сейчас не нужно — просто отмени подписку за день до конца пробного периода, и не спишется ничего.',
            uk: 'Платити зараз не треба — просто скасуй підписку за день до кінця пробного періоду, і нічого не спишеться.',
            es: 'No pagas ahora: solo cancela la suscripción un día antes de que acabe la prueba y no se cobrará nada.',
            'pt-BR': 'Você não paga agora: basta cancelar a assinatura um dia antes do fim do teste e nada será cobrado.',
            vi: 'Chưa phải trả tiền — chỉ cần hủy đăng ký trước khi hết hạn dùng thử một ngày là không bị tính phí.',
            id: 'Belum bayar sekarang — cukup batalkan langganan sehari sebelum masa uji coba berakhir, tak ada tagihan.',
            tr: 'Şimdi ödeme yok — deneme bitmeden bir gün önce aboneliği iptal et, hiçbir ücret alınmaz.',
            pl: 'Teraz nie płacisz — wystarczy anulować subskrypcję dzień przed końcem okresu próbnego i nic nie pobierzemy.',
          }),
          confirmLabel: triLang(lang, {
            ru: `Попробовать ${days} дня бесплатно`,
            uk: `Спробувати ${days} дні безкоштовно`,
            es: `Probar ${days} días gratis`,
            'pt-BR': `Testar ${days} dias grátis`,
            vi: `Dùng thử ${days} ngày miễn phí`,
            id: `Coba ${days} hari gratis`,
            tr: `${days} gün ücretsiz dene`,
            pl: `Wypróbuj ${days} dni za darmo`,
          }),
          cancelLabel: triLang(lang, {
            ru: 'Не сейчас', uk: 'Не зараз', es: 'Ahora no', 'pt-BR': 'Agora não',
            vi: 'Để sau', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz',
          }),
          onConfirm: () => {
            // Оффер убираем СРАЗУ (оптимистично), чтобы тап не ждал стора.
            setExitOffer(null);
            void trackEvent('paywall_exit_offer_accepted', { context, source, paywall: variant, ...paywallImpressionParams(impression) });
            void handlePurchase();
          },
          onCancel: () => {
            setExitOffer(null);
            void trackEvent('paywall_exit_offer_declined', { context, source, paywall: variant, ...paywallImpressionParams(impression) });
            doClose(reason);
          },
        });
      })();
      return;
    }
    doClose(reason);
  }, [context, source, variant, purchasing, restoring, trialDays, lang, handlePurchase, doClose, devForceTrial, impression]);

  return {
    selected, selectPlan,
    packages, loading, purchasing, restoring,
    offeringsFailed, reloadOfferings,
    yearlyPrice, monthlyPrice, yearlyPerMonth, monthlyPerMonth,
    lifetimePrice, lifetimeAvailable,
    savingsPct, perDayLabel,
    trial, trialDays, ctaDisabled, selectedAvailable,
    urgency, futurePrice,
    handlePurchase, handleRestore, handleClose,
    exitOffer,
  };
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

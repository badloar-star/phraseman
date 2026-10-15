// ════════════════════════════════════════════════════════════════════════════
// paywall_purchase.ts — общий хук покупки: единственный пейвол Plus
// (app/paywall_plus.tsx) и встроенный пейвол онбординга (CleanOnboarding).
//
// Один источник правды для: загрузки пакетов RevenueCat, цен (ТОЛЬКО из стора,
// никаких хардкодов), честного триала, покупки/восстановления, событий воронки
// (trackEvent + paywall_funnel) и пуш-напоминания о конце триала.
//
//  - funnel-лог для админ-дашборда
//  - напоминание за 2 дня до списания (trial_end_reminder_schedule.ts); вне
//    онбординга без разрешения — экран «Напомнить о конце пробного?» после покупки
//  - реальное планирование напоминания
// ════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { awaitWithinInitCap } from './paywall_init_cap';
import { clearThemedBlockingAlerts, enqueueThemedBlockingChoiceAlert, enqueueThemedBlockingInfoAlert, type ThemedBlockingAlertAction } from './themed_blocking_alert_queue'; // зачем: стеклянные окна вместо нативного Alert (overlays-runtime «purchase pending / status unknown»)
import AsyncStorage from '@react-native-async-storage/async-storage';
import { pickPaywallPrice, resolvePaywallReferencePrices, type PaywallPriceSource } from './paywall_reference_prices';
import { useRouter } from 'expo-router';
import * as Crypto from 'expo-crypto';
import Purchases, { INTRO_ELIGIBILITY_STATUS, PURCHASES_ERROR_CODE, type PurchasesPackage } from 'react-native-purchases';

import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import { isLifetimeButtonEnabled } from './remote_flags';
import {
  customerInfoConfirmsProductAccess,
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatCustomerInfoHasPremiumAccess,
  revenueCatPremiumMetadata,
} from './premium_revenuecat_state';
import { computeSavingsPct, computePerDayString } from './paywall_pricing';
import { getStorePromoPricing } from './premium_store_promo_display';
import { getTrialInfo, type TrialEligibility, type TrialInfo } from './paywall_trial_info';
import { readOnboardingNotificationChoice } from './onboarding_notification_choice';
import { logPaywallFunnel, type PaywallVariantLabel } from './paywall_funnel';
import {
  scheduleTrialEndReminder,
  schedulePaywallAbandonedNotification,
  requestNotificationPermission,
  requestNotificationPermissionWithFallback,
  getNotificationPermissionStatus,
} from './notifications';
import { canPromiseTrialReminder } from './trial_end_reminder_schedule';
import { dismissPaywallModal, markNextNavigationAsReplace } from './navigation_back';
import { hapticTap } from '../hooks/use-haptics';
import { DEV_IAP_BYPASS, IS_STORE_RELEASE } from './config';
import { isStoreBillingUnavailableError, shouldUseDevPricePreview, type StoreUnavailableReason } from './paywall_billing_unavailable';
import {
  DEV_PREVIEW_MONTHLY_PRICE,
  DEV_PREVIEW_YEARLY_PRICE,
  DEV_PREVIEW_YEARLY_PER_MONTH,
  DEV_PREVIEW_LIFETIME_PRICE,
  DEV_PREVIEW_LIFETIME_PACKAGE,
} from './paywall_dev_preview';
import { trackEvent } from './analytics';
import { createPaywallAnalyticsImpression, paywallImpressionParams, type PaywallAnalyticsImpression } from './paywall_analytics_impression';
import { trackProductOperationFailure } from './product_operation_analytics';
import { claimInitialInventoryResolution, classifyPaywallInventory } from './paywall_inventory_analytics';
import { triLang, type Lang } from '../constants/i18n';
import { actionToastTri, emitAppEvent, onAppEvent } from './events';
import {
  onboardingFinishFailureAction, postAccessFailureAction, PURCHASE_FAILURE_PHASE_LABEL, purchaseFailurePhase, purchaseFailureUi, purchaseStaleUi, purchaseUnverifiedUi, restoreStaleUi,
} from './paywall_purchase_failure';
import { previousAccountPurchaseCopy, unverifiedSameAccountCopy, type PurchaseCertainty } from './paywall_previous_account_copy';
import { applyDevPaywallView, getDevPaywallLinkState, type DevPaywallState } from './dev_paywall_state';
import { persistPortableProgressRegister } from './phone_state_progress_register_bridge';
import { markCelebrationPending } from './premium_celebration_state';
import { useEnergy } from '../components/EnergyContext';
import { invalidatePremiumCache } from './premium_guard';
import { resumeLessonAfterPremium } from './paywall_lesson_continuation';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  type AccountTransitionLockLease,
} from './account_generation';
import {
  commitRevenueCatResultForGeneration,
  readRevenueCatCustomerInfoForGeneration,
  runRevenueCatOperationForGeneration,
} from './revenuecat_account_identity';
import { DebugLogger, swallowError } from './debug-logger';
import { releaseReason } from './release_reason'; // зачем (координатор 13.10): DebugLogger.warn в релизе молчит — код причины уходит в журнал обращения
import { withPurchaseFlow } from './purchase_flow_activity';
import { LOAD_GATE_ATTEMPTS, LOAD_GATE_TOTAL_MS, loadGateBackoffMs } from './load_gate_config';
import {
  hydratePaywallPriceCache,
  peekPaywallPriceCache,
  savePaywallPriceCache,
  type PaywallPriceCache,
} from './paywall_price_cache';

/**
 * зачем (D158): ни один вызов магазина на пути к кнопке не имеет права висеть вечно.
 * Исходный промис продолжает жить (его поздний результат безвреден), но мы
 * перестаём его ждать и отдаём управление дальше. Позднее отклонение гасится.
 */
export function withLoadTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout:${label}:${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error: unknown) => { clearTimeout(timer); reject(error); },
    );
  });
}

/** Потолок одной попытки: общий потолок делится на первую попытку и тихие повторы. */
const LOAD_ATTEMPT_MS = Math.floor(LOAD_GATE_TOTAL_MS / (LOAD_GATE_ATTEMPTS + 1));
/**
 * зачем (D158, M4): первая попытка включает холодный initRevenueCat, а в нём syncRevenueCatIdentity с
 * Purchases.logIn — 3 с мало. Первой попытке даём ~8 с; общий потолок всё равно ограничивает загрузку.
 * Повторные попытки короткие: init к тому моменту уже запущен (общий промис) и просто досматривается.
 */
const LOAD_FIRST_ATTEMPT_MS = 8_000;

export type PaywallPlan = 'monthly' | 'yearly' | 'lifetime';

/** Откуда закрыли пейвол — для журнала [PAYWALL-CLOSE]. */
export type PaywallCloseVia = 'x' | 'swipe' | 'scrim' | 'other';
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
 * зачем (D158-уточнение): решение владельца 2026-08-24 «подписку Pro убери полностью» (пломба из коммита
 * 50d969253); её потеряли 2026-09-03 в общем снимке 6ce8e6b4e, хотя решение никто не отменял. В 2.0 вечный
 * Pro — только приз рефералки. Это скрытие ПРОДАЖИ, а не отзыв доступа: купившие Pro сохраняют его
 * (держится на entitlement RevenueCat). Код покупки lifetime оставлен рабочим — снятие пломбы одной строкой.
 */
const LIFETIME_SALE_RETIRED = true;

/** Условия плана, как их видит человек на кнопке/карточке (D158-уточнение, M1: защита от расхождения цены, Apple 3.1.2). */
export type PaywallPlanTerms = Readonly<{ price: string; trialDays: number | null; promoPrice: string | null }>;

/**
 * Условия на кнопке совпали со свежими из магазина? Пустая цена на кнопке (было нейтральное «Оформить Plus»)
 * = не совпало: человек не видел, за что платит.
 */
export function paywallTermsEqual(shown: PaywallPlanTerms, fresh: PaywallPlanTerms): boolean {
  return !!shown.price && shown.price === fresh.price && shown.trialDays === fresh.trialDays && shown.promoPrice === fresh.promoPrice;
}

// Онбординг уже содержит собственный финальный экран и после покупки сразу
// отдаёт управление приложению. Празднование Plus здесь стало бы вторым экраном
// после подтверждённой покупки, что прямо запрещено контрактом онбординга.
const ONBOARDING_PURCHASE_SOURCES = new Set(['onboarding', 'onboarding_plan']);

/**
 * Покупка ушла на внешнее подтверждение (iOS «Ask to Buy» у ребёнка, банковское
 * 3-D Secure). Это НЕ ошибка: платить повторно не нужно — доступ включится сам,
 * когда платёж подтвердят (слушатель customerInfo / TRANSFER-вебхук).
 */
// зачем (координатор 12.10, «сперва логи» и защита новичка): окно «Покупка ждёт подтверждения» зовут из трёх мест потока покупки, и каждое повторное нажатие «Купить» ставило в очередь ещё одно такое же окно (после «OK» оно «возвращалось»).
// Теперь один показ на покупку: ключ — id продукта (id транзакции при отложенной оплате недоступен), повтор того же ключа в пределах PENDING_ALERT_REPEAT_MS молча пропускается, причина — в журнале [PURCHASE-PENDING].
const PENDING_ALERT_REPEAT_MS = 30 * 60 * 1000;
const pendingAlertShownAt = new Map<string, number>();

export function showPurchasePendingAlert(lang: Lang, key: string = 'purchase'): void {
  const now = Date.now();
  const last = pendingAlertShownAt.get(key);
  if (last !== undefined && now - last < PENDING_ALERT_REPEAT_MS) {
    console.log(`[PURCHASE-PENDING] skip key=${key} уже показывали ${Math.round((now - last) / 1000)}с назад (повтор не раньше ${Math.round(PENDING_ALERT_REPEAT_MS / 60000)} мин)`); // guard-ok: ранний выход логируется
    return;
  }
  pendingAlertShownAt.set(key, now);
  // зачем (владелец 13.10: «такого не должно быть ни при каких обстоятельствах, покупка осуществляется сразу, никаких родителей
  // или банков»): блокирующее окно «Покупка ждёт подтверждения — например, родителя или банка» убрано. Магазин сам ещё не
  // подтвердил оплату — доступ до подтверждения не даём (правила Google), его включит слушатель customerInfo. Человеку —
  // короткий тост без пугающих подробностей; пейвол закрывает вызывающий код.
  console.log(`[PURCHASE-PENDING] show key=${key} lang=${lang} тост «оплата обрабатывается» (окна нет)`); // guard-ok: единичный лог показа
  emitAppEvent('action_toast', purchasePendingToast());
}

/** Тост «оплата обрабатывается» — без родителей и банка (владелец 13.10). */
export function purchasePendingToast() {
  return actionToastTri('info', {
    ru: 'Оплата обрабатывается — Plus включится сам',
    uk: 'Оплата обробляється — Plus увімкнеться сам',
    en: 'Payment is processing — Plus will turn on by itself',
    es: 'El pago se está procesando: Plus se activará solo',
    'pt-BR': 'O pagamento está sendo processado — o Plus será ativado sozinho',
    vi: 'Đang xử lý thanh toán — Plus sẽ tự bật',
    id: 'Pembayaran sedang diproses — Plus akan aktif otomatis',
    tr: 'Ödeme işleniyor — Plus kendiliğinden açılacak',
    pl: 'Płatność jest przetwarzana — Plus włączy się sam',
  });
}

/** A thrown store call does not prove that the charge failed. Outside onboarding,
 * ask the customer to verify or restore before any new checkout attempt. */
export type UnverifiedPurchaseChoice = 'check' | 'restore';

/** зачем (65а, решено по рекомендации; макет 014): две кнопки окна — проверка статуса без восстановления и восстановление. */
export function unverifiedPurchaseAlertActions(lang: Lang): readonly ThemedBlockingAlertAction<UnverifiedPurchaseChoice>[] {
  return [
    { value: 'check', ghost: true, label: triLang(lang, { ru: 'Проверить статус', uk: 'Перевірити статус', en: 'Check status', es: 'Comprobar estado', 'pt-BR': 'Verificar status', vi: 'Kiểm tra trạng thái', id: 'Cek status', tr: 'Durumu kontrol et', pl: 'Sprawdź status' }) },
    { value: 'restore', label: triLang(lang, { ru: 'Восстановить покупки', uk: 'Відновити покупки', en: 'Restore purchases', es: 'Restaurar compras', 'pt-BR': 'Restaurar compras', vi: 'Khôi phục giao dịch', id: 'Pulihkan pembelian', tr: 'Satın alımları geri yükle', pl: 'Przywróć zakupy' }) },
  ];
}

export function showUnverifiedPurchaseAlert(lang: Lang, certainty: PurchaseCertainty = 'unknown'): Promise<UnverifiedPurchaseChoice | 'dismiss'> {
  // зачем (третье ревью 0d76a9528, 🟡2): магазин подтвердил оплату (not_applied на том же аккаунте) — говорим «оплата прошла, нажми Восстановить», а не «неизвестно».
  const confirmed = unverifiedSameAccountCopy(lang, certainty);
  if (confirmed) return enqueueThemedBlockingChoiceAlert(confirmed.title, confirmed.message, unverifiedPurchaseAlertActions(lang));
  return enqueueThemedBlockingChoiceAlert(
    triLang(lang, {
      ru: 'Статус покупки не подтверждён',
      uk: 'Статус покупки не підтверджено',
      en: 'Purchase status not confirmed',
      es: 'Estado de la compra sin confirmar',
      'pt-BR': 'Status da compra não confirmado',
      vi: 'Chưa xác nhận trạng thái mua hàng',
      id: 'Status pembelian belum terkonfirmasi',
      tr: 'Satın alma durumu doğrulanmadı',
      pl: 'Status zakupu niepotwierdzony',
    }),
    triLang(lang, {
      ru: 'Неизвестно, прошла ли оплата. Сначала проверь покупки в магазине или нажми «Восстановить» на этом экране. Не покупай повторно, пока не выяснишь статус.',
      uk: 'Невідомо, чи пройшла оплата. Спершу перевір покупки в магазині або натисни «Відновити» на цьому екрані. Не купуй повторно, доки не з’ясуєш статус.',
      en: 'We cannot confirm whether payment went through. Check your store purchases or tap Restore on this screen first. Do not buy again until you know the status.',
      es: 'No podemos confirmar si se realizó el pago. Primero revisa tus compras en la tienda o toca Restaurar en esta pantalla. No vuelvas a comprar hasta confirmar el estado.',
      'pt-BR': 'Não podemos confirmar se o pagamento foi concluído. Confira as compras na loja ou toque em Restaurar nesta tela. Não compre novamente antes de confirmar o status.',
      vi: 'Chưa thể xác nhận thanh toán đã hoàn tất hay chưa. Hãy kiểm tra giao dịch trong cửa hàng hoặc chọn Khôi phục trên màn hình này. Đừng mua lại trước khi xác nhận trạng thái.',
      id: 'Kami belum bisa memastikan apakah pembayaran berhasil. Periksa pembelian di toko atau ketuk Pulihkan di layar ini. Jangan beli lagi sebelum statusnya jelas.',
      tr: 'Ödemenin tamamlanıp tamamlanmadığını doğrulayamıyoruz. Önce mağaza satın alımlarını kontrol et veya bu ekranda Geri Yükle’ye dokun. Durum netleşmeden yeniden satın alma.',
      pl: 'Nie możemy potwierdzić, czy płatność przeszła. Najpierw sprawdź zakupy w sklepie lub wybierz Przywróć na tym ekranie. Nie kupuj ponownie, dopóki nie wyjaśnisz statusu.',
    }),
    unverifiedPurchaseAlertActions(lang),
  );
}

/**
 * Тосты результата проверки статуса / восстановления покупок — один источник для handleRestore и для dev-переключателя
 * `dev_state?toast=…` (app/dev_paywall_state.ts, R1 paywall-gap-011/012/013): снимок показывает ровно те же строки, что и покупатель.
 */
export type PaywallRestoreToastKind =
  | 'purchase_confirmed'
  | 'restored'
  | 'status_not_found'
  | 'no_active_subscriptions'
  | 'status_check_failed'
  | 'restore_failed'
  | 'store_unreachable';

// зачем (координатор 12.10, dev-состояния пейвола для съёмки): «Не удалось связаться с магазином. Попробуй позже.» — один источник для покупки, восстановления и dev-состояния `store_unreachable` (paywalls-012).
export function storeUnreachableToast() {
  return actionToastTri('error', {
    ru: 'Не удалось связаться с магазином. Попробуй позже.',
    en: 'Couldn’t reach the store. Try again later.',
    uk: 'Не вдалося зв’язатися з магазином. Спробуй пізніше.',
    es: 'No pudimos contactar la tienda. Inténtalo más tarde.',
    'pt-BR': 'Não foi possível contactar a loja. Tente mais tarde.',
    vi: 'Không liên hệ được với cửa hàng. Hãy thử lại sau.',
    id: 'Tidak bisa menghubungi toko. Coba lagi nanti.',
    tr: 'Mağazaya bağlanılamadı. Daha sonra tekrar dene.',
    pl: 'Nie udało się połączyć ze sklepem. Spróbuj później.',
  });
}

export function paywallRestoreToast(kind: PaywallRestoreToastKind) {
  switch (kind) {
    case 'store_unreachable':
      return storeUnreachableToast();
    case 'purchase_confirmed':
      return actionToastTri('success', {
        ru: 'Покупка подтверждена',
        en: 'Purchase confirmed', uk: 'Покупку підтверджено', es: 'Compra confirmada', 'pt-BR': 'Compra confirmada',
        vi: 'Đã xác nhận giao dịch', id: 'Pembelian dikonfirmasi', tr: 'Satın alma doğrulandı', pl: 'Zakup potwierdzony',
      });
    case 'restored':
      return actionToastTri('success', {
        ru: 'Покупки восстановлены',
        en: 'Purchases restored',
        uk: 'Покупки відновлено',
        es: 'Compras restauradas',
        'pt-BR': 'Compras restauradas',
        vi: 'Đã khôi phục giao dịch mua',
        id: 'Pembelian dipulihkan',
        tr: 'Satın alımlar geri yüklendi',
        pl: 'Zakupy przywrócone',
      });
    case 'status_not_found':
      return actionToastTri('error', {
        ru: 'Покупка пока не найдена. Нажми «Восстановить покупки».',
        en: 'We can’t find the purchase yet. Tap “Restore purchases”.',
        uk: 'Покупку поки не знайдено. Натисни «Відновити покупки».',
        es: 'Aún no encontramos la compra. Toca «Restaurar compras».',
        'pt-BR': 'Ainda não encontramos a compra. Toque em “Restaurar compras”.',
        vi: 'Chưa tìm thấy giao dịch. Hãy chạm “Khôi phục giao dịch”.',
        id: 'Pembelian belum ditemukan. Ketuk “Pulihkan pembelian”.',
        tr: 'Satın alma henüz bulunamadı. “Satın alımları geri yükle” düğmesine dokun.',
        pl: 'Nie znaleźliśmy jeszcze zakupu. Dotknij „Przywróć zakupy”.',
      });
    case 'no_active_subscriptions':
      return actionToastTri('error', {
        ru: 'Активных подписок не обнаружено.',
        en: 'No active subscriptions found.',
        uk: 'Активних підписок не знайдено.',
        es: 'No hay suscripciones activas.',
        'pt-BR': 'Nenhuma assinatura ativa encontrada.',
        vi: 'Không có gói đăng ký đang hoạt động.',
        id: 'Tidak ada langganan aktif.',
        tr: 'Aktif abonelik bulunamadı.',
        pl: 'Nie znaleziono aktywnych subskrypcji.',
      });
    case 'status_check_failed':
      return actionToastTri('error', {
        ru: 'Не удалось проверить статус. Попробуй позже.',
        en: 'Couldn’t check the status. Try again later.',
        uk: 'Не вдалося перевірити статус. Спробуй пізніше.',
        es: 'No se pudo comprobar el estado. Inténtalo más tarde.',
        'pt-BR': 'Não foi possível verificar o status. Tente mais tarde.',
        vi: 'Không kiểm tra được trạng thái. Hãy thử lại sau.',
        id: 'Tidak bisa mengecek status. Coba lagi nanti.',
        tr: 'Durum kontrol edilemedi. Daha sonra tekrar dene.',
        pl: 'Nie udało się sprawdzić statusu. Spróbuj później.',
      });
    case 'restore_failed':
      return actionToastTri('error', {
        ru: 'Не удалось восстановить покупки. Попробуй позже.',
        en: 'Couldn’t restore purchases. Try again later.',
        uk: 'Не вдалося відновити покупки. Спробуй пізніше.',
        es: 'No se pudieron restaurar las compras. Inténtalo más tarde.',
        'pt-BR': 'Não foi possível restaurar as compras. Tente mais tarde.',
        vi: 'Không khôi phục được giao dịch mua. Hãy thử lại sau.',
        id: 'Tidak bisa memulihkan pembelian. Coba lagi nanti.',
        tr: 'Satın alımlar geri yüklenemedi. Daha sonra tekrar dene.',
        pl: 'Nie udało się przywrócić zakupów. Spróbuj później.',
      });
  }
}

function showDevPurchasePreviewAlert(lang: Lang): void {
  void enqueueThemedBlockingInfoAlert(
    triLang(lang, {
      ru: 'Предпросмотр покупки',
      uk: 'Попередній перегляд покупки',
      en: 'Purchase preview',
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
      en: "Purchase wasn't started: the store is disabled in a regular dev build. Test a real purchase in a build connected to the store, or enable access through an explicit QA tool.",
      es: 'La compra no se inició: la tienda está desactivada en la compilación de desarrollo normal. Prueba una compra real en una compilación conectada a la tienda o activa el acceso con una herramienta de QA explícita.',
      'pt-BR': 'A compra não foi iniciada: a loja fica desativada na compilação de desenvolvimento comum. Teste uma compra real em uma compilação conectada à loja ou ative o acesso com uma ferramenta explícita de QA.',
      vi: 'Giao dịch mua chưa được bắt đầu: cửa hàng bị tắt trong bản dev thông thường. Hãy thử giao dịch thật trong bản có kết nối cửa hàng hoặc bật quyền truy cập bằng công cụ QA riêng.',
      id: 'Pembelian tidak dimulai: toko dinonaktifkan pada build dev biasa. Uji pembelian nyata pada build yang terhubung ke toko atau aktifkan akses melalui alat QA khusus.',
      tr: 'Satın alma başlatılmadı: normal geliştirme derlemesinde mağaza kapalıdır. Gerçek satın almayı mağazaya bağlı bir derlemede test et veya erişimi açık bir QA aracıyla etkinleştir.',
      pl: 'Zakup nie został rozpoczęty: sklep jest wyłączony w zwykłej wersji deweloperskiej. Sprawdź prawdziwy zakup w kompilacji połączonej ze sklepem albo włącz dostęp za pomocą jawnego narzędzia QA.',
    }),
    'OK',
  );
}

/** Экран «Plus ваш. Напомнить о конце пробного периода?» после покупки вне онбординга. */
export type TrialReminderPromptState = Readonly<{
  days: number;
  priceLabel: string;
  trialStartMs: number;
}>;

// зачем (владелец 2026-09-30): текст уведомления ПЕЙВОЛА PLUS совпадает с его обещанием
// «Напомним за 2 дня до списания». Онбординг — свой прежний текст ниже.
function trialReminderCopy(lang: Lang, price: string): { title: string; body: string } {
  return {
    title: triLang(lang, {
      ru: 'Пробный период Plus закончится через 2 дня',
      uk: 'Пробний період Plus закінчиться через 2 дні',
      en: 'Your Plus trial ends in 2 days',
      es: 'Tu prueba de Plus termina en 2 días',
      'pt-BR': 'Seu teste do Plus termina em 2 dias',
      vi: 'Dùng thử Plus kết thúc sau 2 ngày',
      id: 'Uji coba Plus berakhir dalam 2 hari',
      tr: 'Plus denemen 2 gün sonra bitiyor',
      pl: 'Okres próbny Plus kończy się za 2 dni',
    }),
    body: triLang(lang, {
      ru: `Затем — ${price}. Отменить можно в любой момент в настройках магазина.`,
      uk: `Далі — ${price}. Скасувати можна будь-коли в налаштуваннях магазину.`,
      en: `Then ${price}. You can cancel anytime in your store settings.`,
      es: `Después: ${price}. Puedes cancelar cuando quieras en los ajustes de la tienda.`,
      'pt-BR': `Depois: ${price}. Você pode cancelar quando quiser nas configurações da loja.`,
      vi: `Sau đó: ${price}. Bạn có thể hủy bất cứ lúc nào trong cài đặt cửa hàng.`,
      id: `Setelah itu ${price}. Kamu bisa membatalkan kapan saja di pengaturan toko.`,
      tr: `Sonra ${price}. İstediğin zaman mağaza ayarlarından iptal edebilirsin.`,
      pl: `Potem ${price}. Możesz anulować w każdej chwili w ustawieniach sklepu.`,
    }),
  };
}

// Онбординг: прежний текст без изменений (владелец 2026-09-30: «онбординг не трогаем»).
function onboardingTrialReminderCopy(lang: Lang, price: string): { title: string; body: string } {
  return {
    title: triLang(lang, {
      ru: 'Триал заканчивается завтра',
      uk: 'Тріал закінчується завтра',
      en: 'Your trial ends tomorrow',
      es: 'Tu prueba termina mañana',
      'pt-BR': 'Seu teste termina amanhã',
      vi: 'Dùng thử kết thúc vào ngày mai',
      id: 'Uji cobamu berakhir besok',
      tr: 'Denemen yarın bitiyor',
      pl: 'Okres próbny kończy się jutro',
    }),
    body: triLang(lang, {
      ru: `Дальше — ${price}. Останешься? Отменить можно в два тапа.`,
      uk: `Далі — ${price}. Залишишся? Скасувати можна у два тапи.`,
      en: `Next: ${price}. Staying? Canceling takes two taps.`,
      es: `Luego: ${price}. ¿Te quedas? Cancelar toma dos toques.`,
      'pt-BR': `Depois: ${price}. Vai continuar? Cancelar leva dois toques.`,
      vi: `Sau đó: ${price}. Bạn tiếp tục chứ? Hủy chỉ mất hai lần chạm.`,
      id: `Berikutnya: ${price}. Tetap lanjut? Batal hanya dua ketukan.`,
      tr: `Sonra: ${price}. Devam edecek misin? İptal iki dokunuş.`,
      pl: `Dalej: ${price}. Zostajesz? Anulowanie to dwa stuknięcia.`,
    }),
  };
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

/** Восстановление прервано сменой аккаунта (R1_PAYWALL_UX п.3): раньше крутилка просто пропадала без слова. */
export function restoreAccountChangedToast() {
  return actionToastTri('error', {
    ru: 'Аккаунт сменился — восстановление прервано',
    uk: 'Акаунт змінився — відновлення перервано',
    en: 'Account changed — restore was interrupted',
    es: 'La cuenta cambió: se interrumpió la restauración',
    'pt-BR': 'A conta mudou — a restauração foi interrompida',
    vi: 'Tài khoản đã đổi — việc khôi phục bị gián đoạn',
    id: 'Akun berubah — pemulihan dihentikan',
    tr: 'Hesap değişti — geri yükleme yarıda kesildi',
    pl: 'Konto się zmieniło — przywracanie przerwano',
  });
}

/** Восстановление не удалось, аккаунт при этом тот же (stale от неподтянутой личности / не взятой блокировки) — честное «попробуй ещё раз», а не «аккаунт сменился». */
export function restoreRetryToast() {
  return actionToastTri('error', {
    ru: 'Не удалось восстановить. Попробуй ещё раз.',
    uk: 'Не вдалося відновити. Спробуй ще раз.',
    en: 'Couldn’t restore. Try again.',
    es: 'No se pudo restaurar. Inténtalo de nuevo.',
    'pt-BR': 'Não foi possível restaurar. Tente de novo.',
    vi: 'Không khôi phục được. Hãy thử lại.',
    id: 'Tidak bisa memulihkan. Coba lagi.',
    tr: 'Geri yüklenemedi. Tekrar dene.',
    pl: 'Nie udało się przywrócić. Spróbuj ponownie.',
  });
}

function storePricePerMonthTrim(pkg: PurchasesPackage | undefined): string {
  const raw = (pkg?.product as { pricePerMonthString?: string | null } | undefined)?.pricePerMonthString;
  return storePriceTrim(raw);
}

export interface PaywallPurchaseArgs {
  /**
   * DEV/съёмка (R1 «нет пути»): `_dev_state=<имя>` из маршрута premium_modal — подмена того, что хук отдаёт экрану (скелетон загрузки,
   * ошибка цен, «≈», идёт оплата, промо магазина…); магазин и покупки не вызываются. null/undefined и любая стор-сборка — без эффекта.
   */
  devState?: DevPaywallState | null;
  /**
   * Справочная цена на плитках (последнее звено «живая → кэш → справочная»). По умолчанию да.
   * зачем (ревью Opus 11.10): экран, который не умеет рисовать «≈» и строит из цены юридический текст об автопродлении
   * (онбординг), обязан выключить её — иначе условия подписки показаны в чужой валюте и с выдуманной суммой.
   */
  allowReferencePrice?: boolean;
  variant: PaywallVariantLabel;
  context: string;
  source: string;
  lang: Lang;
  impression?: PaywallAnalyticsImpression;
  /**
   * DEV/QA: форс «триал-режима» из тест-меню (_force_trial_ui=1). В Metro стора
   * нет (DEV_IAP_BYPASS) → trialDays обычно null, и триал-зависимое (trust-бейдж
   * «платить не нужно», trial-таймлайн) не показать. Этот флаг
   * включает превью-триал ТОЛЬКО в dev-бандле. В сторе игнорируется.
   */
  forceTrialUI?: boolean;
  /**
   * DEV/QA: сколько дней показывать в превью-триале (`_force_trial_days=7`); без значения — DEV_FORCE_TRIAL_DEFAULT_DAYS.
   * зачем (координатор 12.10, paywall-gap-001/004/007): образец рисует N дней, а превью всегда показывало 3 — расхождение данных нельзя было отделить
   * от расхождения кода. В сторе игнорируется (работает только вместе с forceTrialUI в DEV_IAP_BYPASS); боевое N всегда из магазина.
   */
  forceTrialDays?: number | null;
  /** Allowlisted legacy lesson id to reopen after confirmed access. */
  resumeLessonId?: number | null;
  /**
   * D158, Plus-окно: кнопка покупки всегда активна (тап без offerings сам грузит и покупает),
   * цены из кэша между запусками, тайм-аут на старте магазина перед оплатой.
   * Онбординг флаг не передаёт — его поведение не менялось.
   */
  resilientCheckout?: boolean;
}

/** Дней превью-триала в dev, когда `_force_trial_days` не задан. */
export const DEV_FORCE_TRIAL_DEFAULT_DAYS = 3;

let onboardingPaywallHookMounts = 0; // зачем: счётчик перемонтирований хука онбординга для [ONB-PAYWALL-WAIT]

export function usePaywallPurchase({ variant, context, source, lang, forceTrialUI, forceTrialDays, resumeLessonId, impression: suppliedImpression, resilientCheckout = false, allowReferencePrice = true, devState: devStateArg = null }: PaywallPurchaseArgs) {
  // зачем (координатор 12.10, R1 «нет пути»): явный `_dev_state` окна сильнее состояния по ссылке `dev_state?paywall=…` (пейвол онбординга); в стор-сборке оба null.
  const devState = devStateArg ?? getDevPaywallLinkState();
  const router = useRouter();
  const { refillToMax } = useEnergy();
  const [impression] = useState(() => suppliedImpression ?? createPaywallAnalyticsImpression(Crypto.randomUUID));
  const [selected, setSelected] = useState<PaywallPlan>('yearly');
  const [packages, setPackages] = useState<PremiumPackages>({});
  const [introEligibility, setIntroEligibility] = useState<Record<string, TrialEligibility>>({});
  // зачем (D158, M3): покупка без offerings читает пробный период из ref, а не из замыкания тапа,
  // иначе теряются trial_started и напоминание о конце пробного (iOS).
  const introEligibilityRef = useRef<Record<string, TrialEligibility>>({});
  // M2: был ли хоть один УСПЕШНЫЙ ответ магазина — после него кэш цен не подставляется вообще.
  const [offeringsEverLoaded, setOfferingsEverLoaded] = useState(false);
  // L1: оплата реально началась (дальше закрывать окно нельзя); пока грузим offerings на тапе — можно.
  const [payStarted, setPayStarted] = useState(false);
  const packagesRef = useRef<PremiumPackages>({});
  // зачем (D158): раньше булев флаг блокировал ВСЕ новые загрузки, пока висела первая.
  // Теперь это запись с временем старта и номером: зависшая загрузка упирается в потолок и
  // освобождает слот сама, а протухшую запись новая загрузка вытесняет.
  const offeringsLoadInFlightRef = useRef<{ promise: Promise<void>; startedAt: number; seq: number } | null>(null);
  const offeringsLoadSeqRef = useRef(0);
  // M-A: актуальный выбранный план — после загрузки на тапе сверяем, что человек не переключил тариф.
  const selectedRef = useRef<PaywallPlan>('yearly');
  // Жизнь компонента: тап и ручной повтор грузят offerings независимо от эффекта монтирования.
  const lifeRef = useRef({ dead: false });
  const [loading, setLoading] = useState(false);
  // Первый цикл загрузки закончился (успехом или нет): без этого «ещё не начинали» и «закончили пустыми» неразличимы.
  const [offeringsSettled, setOfferingsSettled] = useState(false);
  // Тихая подпись после сбоя тапа («Попробуй через минуту»): без красного и без иконки.
  const [tapNotice, setTapNotice] = useState(false);
  // зачем (владелец 11.10: «ЦЕНЫ ДОЛЖНЫ ПОКАЗЫВАТЬСЯ ВСЕ РАВНО!!! ВЕЗДЕ»): кэш последних настоящих цен — во ВСЕХ пейволах,
  // а не только в окне Plus (resilientCheckout). Это публичные строки цен, без промо и пробного.
  const [cachedPrices, setCachedPrices] = useState<PaywallPriceCache | null>(
    () => peekPaywallPriceCache(),
  );
  // Сбой загрузки офферингов (сеть/стор). Влияет на видимость всех кнопок,
  // включая Phraseman Pro — поэтому даём ретрай, а не молча скрываем.
  const [offeringsFailed, setOfferingsFailed] = useState(false);
  // зачем (владелец 11.10: «почему цены не показываются»): причина сбоя цен — окно различает «Магазин недоступен
  // на этом устройстве» (billing_unavailable: нет Google Play / биллинга) и «Проверь интернет» (network).
  const [storeUnavailableReason, setStoreUnavailableReason] = useState<StoreUnavailableReason | null>(null);
  const inventoryResolutionEmittedRef = useRef({ emitted: false });
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const operationRef = useRef<'purchase' | 'restore' | null>(null);
  // зачем (65а): кнопки окна «статус не подтверждён» зовут синхронизацию доступа, объявленную ниже handlePurchase.
  const entitlementSyncRef = useRef<((mode: 'restore' | 'check') => Promise<void>) | null>(null);
  const [lifetimeEnabled, setLifetimeEnabled] = useState(() => isLifetimeButtonEnabled());
  // Экран после покупки: «Plus ваш. Напомнить о конце пробного?» (только вне онбординга,
  // только если системного разрешения на уведомления ещё нет).
  const [trialReminderPrompt, setTrialReminderPrompt] = useState<TrialReminderPromptState | null>(null);
  const trialReminderPromptBusyRef = useRef(false);

  useEffect(() => {
    const subscription = onAppEvent('remote_config_changed', () => {
      const next = isLifetimeButtonEnabled();
      setLifetimeEnabled(current => current === next ? current : next);
    });
    return () => subscription.remove();
  }, []);

  // Загрузка офферингов: первая попытка + тихие повторы по конфигу потолка (D158).
  // Каждый вызов магазина ограничен по времени; вся загрузка — LOAD_GATE_TOTAL_MS.
  const loadOfferings = useCallback((
    deadRef: { dead: boolean },
    emitInitialResolution = false,
  ): Promise<void> => {
    if (DEV_IAP_BYPASS) return Promise.resolve();
    const inflight = offeringsLoadInFlightRef.current;
    const now = Date.now();
    if (inflight && now - inflight.startedAt < LOAD_GATE_TOTAL_MS + 1_000) {
      DebugLogger.info('[PAYWALL]', `загрузка цен: уже идёт ${now - inflight.startedAt} мс — присоединяемся`);
      return inflight.promise;
    }
    if (inflight) {
      DebugLogger.warn('[PAYWALL]', `загрузка цен: прошлая висит ${now - inflight.startedAt} мс — вытесняем новой`);
    }
    const seq = offeringsLoadSeqRef.current + 1;
    offeringsLoadSeqRef.current = seq;
    const startedAt = now;
    const isLatest = () => offeringsLoadSeqRef.current === seq;
    type AttemptResult = { ok: boolean; resolvedPackages: PremiumPackages; billingUnavailable?: boolean };

    const attempt = async (timeoutMs: number, n: number): Promise<AttemptResult> => {
      const t0 = Date.now();
      const attemptDeadline = t0 + timeoutMs;
      const left = () => Math.max(1, attemptDeadline - Date.now());
      try {
        await withLoadTimeout(initRevenueCat(), left(), 'initRevenueCat');
        const o = await withLoadTimeout(Purchases.getOfferings(), left(), 'getOfferings');
        const resolvedPackages = resolvePremiumPackages(o.current?.availablePackages ?? []);
        let resolvedEligibility: Record<string, TrialEligibility> = {};
        if (Platform.OS === 'ios') {
          const productIds = [resolvedPackages.monthly, resolvedPackages.yearly]
            .map((item) => item?.product.identifier)
            .filter((value): value is string => Boolean(value));
          if (productIds.length > 0) {
            try {
              const statuses = await withLoadTimeout(
                Purchases.checkTrialOrIntroductoryPriceEligibility(productIds), left(), 'eligibility',
              );
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
            } catch (e) {
              DebugLogger.warn('[PAYWALL]', `проверка пробного не удалась (${e instanceof Error ? e.message : String(e)}) — unknown`);
              resolvedEligibility = Object.fromEntries(productIds.map((productId) => [productId, 'unknown']));
            }
          }
        }
        if (!deadRef.dead && isLatest()) {
          packagesRef.current = resolvedPackages;
          introEligibilityRef.current = resolvedEligibility;
          setPackages(resolvedPackages);
          setIntroEligibility(resolvedEligibility);
          setOfferingsEverLoaded(true);
        }
        DebugLogger.info('[PAYWALL]', `загрузка цен: попытка #${n} из сети за ${Date.now() - t0} мс год=${resolvedPackages.yearly ? 'есть' : 'нет'} месяц=${resolvedPackages.monthly ? 'есть' : 'нет'} навсегда=${resolvedPackages.lifetime ? 'есть' : 'нет'}`);
        return { ok: true, resolvedPackages };
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        const billingUnavailable = isStoreBillingUnavailableError(e);
        DebugLogger.warn('[PAYWALL]', `загрузка цен: попытка #${n} провал за ${Date.now() - t0} мс (${reason}${reason.startsWith('timeout:') ? ' — ТАЙМ-АУТ' : ''}) магазинНедоступен=${billingUnavailable}`);
        return { ok: false, resolvedPackages: {}, billingUnavailable };
      }
    };

    const run = async (): Promise<void> => {
      setLoading(true);
      setOfferingsFailed(false);
      setStoreUnavailableReason(null);
      const deadline = startedAt + LOAD_GATE_TOTAL_MS;
      let result: AttemptResult = { ok: false, resolvedPackages: {} };
      let loadAttempts = 0;
      let failed = 0;
      try {
        for (;;) {
          const remaining = deadline - Date.now();
          if (remaining <= 0) {
            DebugLogger.warn('[PAYWALL]', `загрузка цен: общий потолок ${LOAD_GATE_TOTAL_MS} мс исчерпан после ${loadAttempts} попыток`);
            break;
          }
          loadAttempts += 1;
          result = await attempt(Math.min(remaining, loadAttempts === 1 ? LOAD_FIRST_ATTEMPT_MS : LOAD_ATTEMPT_MS), loadAttempts);
          if (result.ok) break;
          failed += 1;
          if (deadRef.dead || !isLatest()) break;
          // зачем (лог координатора: 3 повтора 1/3/8 с = 17–22 с пустых плиток): отказ «биллинг недоступен» повтором
          // не лечится — сразу ошибка с причиной. Тайм-ауты и сеть повторяются, как раньше.
          if (result.billingUnavailable) {
            DebugLogger.warn('[PAYWALL]', `загрузка цен: магазин недоступен на устройстве — без повторов (попыток=${loadAttempts})`);
            break;
          }
          const pause = loadGateBackoffMs(failed);
          if (pause === null || deadline - Date.now() <= pause) {
            DebugLogger.warn('[PAYWALL]', `загрузка цен: повторов больше нет (неудач=${failed}, пауза=${pause ?? 'нет'})`);
            break;
          }
          DebugLogger.info('[PAYWALL]', `загрузка цен: тихий повтор через ${pause} мс (неудач=${failed})`);
          await new Promise((r) => setTimeout(r, pause));
          if (deadRef.dead || !isLatest()) break;
        }
        if (!deadRef.dead && isLatest()) {
          if (result.ok) {
            setTapNotice(false);
            {
              const entry = (pkg: PurchasesPackage | undefined) => (pkg ? {
                productId: pkg.product.identifier,
                price: storePriceTrim(pkg.product.priceString),
                perMonth: storePricePerMonthTrim(pkg),
              } : undefined);
              // зачем (D158): кэш цен между запусками — первый кадр окна без скелетона.
              void savePaywallPriceCache({ yearly: entry(result.resolvedPackages.yearly), monthly: entry(result.resolvedPackages.monthly) });
            }
          } else {
            setOfferingsFailed(true);
            setStoreUnavailableReason(result.billingUnavailable ? 'billing_unavailable' : 'network');
            trackProductOperationFailure('paywall', 'offerings_load', 'store_unavailable', true);
          }
        }
        if (!deadRef.dead && emitInitialResolution && claimInitialInventoryResolution(inventoryResolutionEmittedRef.current)) {
          const inventory = classifyPaywallInventory({
            monthly: !!result.resolvedPackages.monthly,
            yearly: !!result.resolvedPackages.yearly,
            lifetime: !!result.resolvedPackages.lifetime,
          }, {
            loadSucceeded: result.ok,
            lifetimeExpected: !LIFETIME_SALE_RETIRED && isLifetimeButtonEnabled(), // зачем (D158-уточнение): продажа Pro снята — её отсутствие не аномалия
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
        // зачем (D158): слот освобождаем ВСЕГДА, но только если его не успела занять более новая загрузка.
        if (offeringsLoadInFlightRef.current?.seq === seq) offeringsLoadInFlightRef.current = null;
        if (!deadRef.dead && isLatest()) {
          setLoading(false);
          setOfferingsSettled(true);
        }
        DebugLogger.info('[PAYWALL]', `загрузка цен: конец ok=${result.ok} попыток=${loadAttempts} за ${Date.now() - startedAt} мс`);
      }
    };

    const promise = run();
    offeringsLoadInFlightRef.current = { promise, startedAt, seq };
    return promise;
  }, [context, impression, resilientCheckout, source, variant]);

  // зачем (координатор 12.10, 🔴 пустой экран перед пейволом онбординга; СПЕРВА ЛОГИ): если хук онбординга смонтировался
  // заново на переходе «Напомним → Продолжить» — это видно по счётчику mount#; и когда именно появились цены.
  useEffect(() => {
    if (context !== 'onboarding_plan') return undefined;
    const mountedAt = Date.now();
    onboardingPaywallHookMounts += 1;
    console.log(`[ONB-PAYWALL-WAIT] hook:mount#${onboardingPaywallHookMounts} cache=${peekPaywallPriceCache() ? 'память' : 'нет'}`); // guard-ok: единичный лог
    return () => {
      console.log(`[ONB-PAYWALL-WAIT] hook:unmount живёт=${Date.now() - mountedAt}ms`); // guard-ok: единичный лог
    };
  }, [context]);

  useEffect(() => {
    if (DEV_IAP_BYPASS) return;
    const deadRef = { dead: false };
    lifeRef.current.dead = false;
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
      lifeRef.current.dead = true;
      subscription.remove();
    };
  }, [loadOfferings]);

  // зачем (D158): кэш цен с диска — если в памяти процесса его ещё не было (первый кадр после холодного старта).
  useEffect(() => {
    if (cachedPrices) return undefined;
    let alive = true;
    void hydratePaywallPriceCache().then((cache) => {
      if (alive && cache) setCachedPrices(cache);
    });
    return () => { alive = false; };
  }, [cachedPrices]);

  // Ручной ретрай для UI (кнопка «Повторить» при offeringsFailed).
  const reloadOfferings = useCallback(() => {
    void loadOfferings(lifeRef.current);
  }, [loadOfferings]);

  // ── цены ───────────────────────────────────────────────────────────────────
  // В стор-сборке — ТОЛЬКО из стора (никаких хардкодов). В dev-сборке стор не
  // опрашивается (DEV_IAP_BYPASS), поэтому подставляем плейсхолдеры, чтобы таймер
  // и кнопка Phraseman Pro были видны и в Metro. В покупку плейсхолдеры не уходят.
  // зачем (D158): пока магазин не ответил — кэш ПУБЛИЧНЫХ цен прошлого раза (только строки цен);
  // живые цены из магазина всегда главнее. Промо и пробный из кэша не берутся.
  // M2: только пока НЕ было ни одного успешного ответа магазина. Ответил без плана — значит плана нет,
  // и кэш-цены для него не показываем.
  // зачем (владелец 11.10; эмулятор без Google Play): только dev-сборка и только «биллинг недоступен» — предпросмотр
  // цен вместо пустых плиток; магазин на тапе не зовётся. В стор-сборке ветки нет (сторож paywall_billing_unavailable).
  const previewPrices = shouldUseDevPricePreview({
    isDev: typeof __DEV__ !== 'undefined' && __DEV__ === true,
    isStoreRelease: IS_STORE_RELEASE,
    reason: storeUnavailableReason,
  });
  const showPreviewPrices = DEV_IAP_BYPASS || previewPrices;
  const cacheYearly = !offeringsEverLoaded ? cachedPrices?.yearly : undefined;
  const cacheMonthly = !offeringsEverLoaded ? cachedPrices?.monthly : undefined;
  // зачем (владелец 11.10: «ЦЕНЫ ДОЛЖНЫ ПОКАЗЫВАТЬСЯ ВСЕ РАВНО!!! ВЕЗДЕ»): цепочка «живая → последняя настоящая (кэш) →
  // справочная». Справочная — только пока магазин ни разу не ответил (ответил без плана — плана нет, цену не выдумываем).
  // В покупку справочная цена не уходит: платёж всегда по живой цене магазина.
  // ревью Opus 11.10: справочная — только если кэша нет вовсе (не смешивать валюту кэша и справочника на двух тарифах);
  // разбор рубильника — не на каждом рендере, а при его изменении.
  const [referenceConfigTick, setReferenceConfigTick] = useState(0);
  useEffect(() => {
    const sub = onAppEvent('remote_config_changed', () => setReferenceConfigTick((tick) => tick + 1));
    return () => sub.remove();
  }, []);
  // зачем (координатор 13.10, EN-проход): справочные цены «€39,99» в английском интерфейсе — с точкой.
  const referencePricesResolved = useMemo(() => resolvePaywallReferencePrices(lang), [referenceConfigTick, lang]);
  const referencePrices = allowReferencePrice && !offeringsEverLoaded && !cacheYearly && !cacheMonthly
    ? referencePricesResolved
    : null;
  const yearlyPick = pickPaywallPrice({
    store: storePriceTrim(packages.yearly?.product?.priceString),
    cache: cacheYearly?.price,
    reference: referencePrices?.yearly,
    devPreview: showPreviewPrices ? DEV_PREVIEW_YEARLY_PRICE : undefined,
  });
  const monthlyPick = pickPaywallPrice({
    store: storePriceTrim(packages.monthly?.product?.priceString),
    cache: cacheMonthly?.price,
    reference: referencePrices?.monthly,
    devPreview: showPreviewPrices ? DEV_PREVIEW_MONTHLY_PRICE : undefined,
  });
  const yearlyPrice = yearlyPick.price;
  const monthlyPrice = monthlyPick.price;
  const lifetimePrice = storePriceTrim(packages.lifetime?.product?.priceString) || (DEV_IAP_BYPASS ? DEV_PREVIEW_LIFETIME_PRICE : '');
  const yearlyPerMonth = storePricePerMonthTrim(packages.yearly)
    || cacheYearly?.perMonth
    || (yearlyPick.source === 'reference' ? referencePrices?.yearlyPerMonth ?? '' : '')
    || (showPreviewPrices ? DEV_PREVIEW_YEARLY_PER_MONTH : '');
  const pricesFromCache = !!(cacheYearly || cacheMonthly);
  /** Откуда цены на плитках: 'store' — живые; 'cache' — последние настоящие; 'reference' — справочные (рисовать «≈» и
   *  «цена уточнится в магазине»); 'dev_preview' — только дев-сборка; 'none' — показать нечего. */
  const priceSource: PaywallPriceSource = yearlyPick.source !== 'none' ? yearlyPick.source : monthlyPick.source;
  const yearlyPriceSource: PaywallPriceSource = yearlyPick.source;
  const monthlyPriceSource: PaywallPriceSource = monthlyPick.source;
  const pricesApproximate = yearlyPick.source === 'reference' || monthlyPick.source === 'reference';
  useEffect(() => {
    DebugLogger.info('[PAYWALL-PRICE]', `цены на плитках: год=${yearlyPrice || '—'}(${yearlyPick.source}) месяц=${monthlyPrice || '—'}(${monthlyPick.source}) справочная=${String(allowReferencePrice)} storeUnavailable=${storeUnavailableReason ?? 'нет'} ever=${String(offeringsEverLoaded)}`);
  }, [allowReferencePrice, monthlyPick.source, monthlyPrice, offeringsEverLoaded, storeUnavailableReason, yearlyPick.source, yearlyPrice]);
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

  // зачем (владелец 2026-09-04): «чтобы не было ошибок, когда на пейволе
  // написано OFF, а списывается полная цена через N дней». Скидка на первый
  // период (iOS Introductory Offer / Android defaultOption) приходит из
  // стора отдельными полями — priceString при этом остаётся ОБЫЧНОЙ ценой.
  // Раньше модуль детекта существовал (premium_store_promo_display), но его
  // никто не звал: класс бага «механизм есть, данных не дали». Теперь промо
  // читается здесь, ОДИН раз на все семь пейволов, и каждый показывает и цену
  // со скидкой, и обычную, и что будет после промо-периода.
  //
  // Флагов или хардкодов цены нет: источник истины — стор. Но UI показывает
  // скидку только когда она доказанно совпадает с checkout: Android defaultOption или
  // iOS introductory с подтверждённой eligibility. Во всех остальных случаях fail closed:
  // обычная priceString без промо-обещания.
  const storePromo = useMemo(() => {
    const readPromo = (pkg: PurchasesPackage | undefined) => getStorePromoPricing(pkg?.product, {
      platform: Platform.OS,
      iosEligibility: pkg ? introEligibility[pkg.product.identifier] ?? 'unknown' : 'unknown',
    });
    return {
      yearly: readPromo(packages.yearly),
      monthly: readPromo(packages.monthly),
      lifetime: readPromo(packages.lifetime),
    };
  }, [introEligibility, packages]);

  /** Промо выбранного плана — им же решается праздничное оформление пейвола. */
  const selectedPromo = storePromo[selected] ?? null;

  useEffect(() => {
    // Постоянная диагностика (правило «сперва логи»): по одной строке видно,
    // ПОЧЕМУ скидка показана или не показана — и какие именно цены увидел
    // человек. Без этого «на пейволе OFF, а списалось полное» неразбираемо.
    if (loading) return;
    DebugLogger.info(
      '[PAYWALL-PROMO]',
      `план=${selected} промо=${selectedPromo ? `${selectedPromo.discountPercent}% ${selectedPromo.promoPriceString}→${selectedPromo.standardPriceString}` : 'нет'} `
      + `год=${storePromo.yearly ? `${storePromo.yearly.discountPercent}%` : '—'} `
      + `месяц=${storePromo.monthly ? `${storePromo.monthly.discountPercent}%` : '—'} `
      + `навсегда=${storePromo.lifetime ? `${storePromo.lifetime.discountPercent}%` : '—'} `
      + `ценаСтора=${yearlyPrice || '—'}/${monthlyPrice || '—'}`,
    );
  }, [loading, selected, selectedPromo, storePromo, yearlyPrice, monthlyPrice]);

  // зачем (владелец 2026-09-04): «чтобы открытие пейвола было премиальным и
  // праздничным — с анимацией и новым звуком». Звук — РОВНО ОДИН раз за показ
  // и только когда стор реально дал скидку: ref, а не state, чтобы повторные
  // рендеры и смена выбранного плана не превращали праздник в трещотку.
  const promoRevealLoggedRef = useRef(false);
  useEffect(() => {
    if (loading || promoRevealLoggedRef.current) return;
    const anyPromo = storePromo.yearly ?? storePromo.monthly ?? storePromo.lifetime;
    if (!anyPromo) return;
    promoRevealLoggedRef.current = true;
    DebugLogger.info('[PAYWALL-PROMO]', `праздничный показ: ${anyPromo.discountPercent}% (${anyPromo.promoPriceString} вместо ${anyPromo.standardPriceString})`);
  }, [loading, storePromo]);

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
  // увидеть trust-бейдж/таймлайн без стора. В сторе forceTrialUI=false.
  const devForceTrial = DEV_IAP_BYPASS && forceTrialUI === true;
  const devTrialDays = devForceTrial ? (forceTrialDays && forceTrialDays > 0 ? forceTrialDays : DEV_FORCE_TRIAL_DEFAULT_DAYS) : null;
  const subscriptionTrialDays = trial.hasTrial ? trial.days : devTrialDays;
  const trialDays = selected === 'lifetime' ? null : subscriptionTrialDays;
  // зачем (владелец 2026-09-30): пробный показывается на карточке ГОДА независимо от
  // выбранного тарифа — поэтому его длительность читается из годового пакета отдельно.
  // Источник — только магазин (introPrice/defaultOption.freePhase + eligibility).
  const yearlyProductId = packages.yearly?.product.identifier;
  const yearlyTrial: TrialInfo = useMemo(
    () => getTrialInfo(packages.yearly, yearlyProductId ? introEligibility[yearlyProductId] ?? 'unknown' : 'unknown'),
    [introEligibility, packages.yearly, yearlyProductId],
  );
  const yearlyTrialDays = yearlyTrial.hasTrial ? yearlyTrial.days : devTrialDays;
  const yearlyTrialSource: 'store' | 'dev_force' | 'none' = yearlyTrial.hasTrial ? 'store' : devTrialDays ? 'dev_force' : 'none';
  const selectedAvailable = DEV_IAP_BYPASS || Boolean(selectedPkg);
  const ctaDisabled = purchasing || loading || restoring || !selectedAvailable;

  selectedRef.current = selected;
  const selectPlan = useCallback((plan: PaywallPlan) => {
    if (plan === 'lifetime' && !lifetimeAvailable) {
      DebugLogger.info('[PAYWALL]', 'выбор тарифа: lifetime недоступен — выбор проигнорирован');
      return;
    }
    hapticTap();
    setSelected(plan);
    void trackEvent('paywall_plan_select', { context, source, plan, paywall: variant, ...paywallImpressionParams(impression) });
  }, [context, impression, lifetimeAvailable, source, variant]);

  // ── покупка ────────────────────────────────────────────────────────────────
  const finishOnboardingPaywallFlow = useCallback(async (
    isCurrent: () => boolean = () => true,
    lease?: AccountTransitionLockLease,
  ): Promise<boolean> => {
    if (!isCurrent()) return false;
    invalidatePremiumCache();
    await AsyncStorage.setItem('had_premium_ever', '1').catch(swallowError('paywall_purchase:had_premium_ever')); // зачем: PM-229-A1
    if (!isCurrent()) return false;
    emitAppEvent('premium_activated');
    // зачем (координатор 12.10): зовётся из-под замка покупки — lease обязателен, иначе взаимная блокировка.
    if (!(await refillToMax(isCurrent, lease))) return false;

    try {
      await persistPortableProgressRegister('onboarding_step', 'name');
      await persistPortableProgressRegister('onboarding_done', null);
      emitAppEvent('onboarding_paywall_completed');
      return true;
    } catch (e) {
      // зачем (ревью 12.10 п.7): немой catch — онбординг мог «не завершиться» без единой строки в журнале
      DebugLogger.error('[PAYWALL] finishOnboardingPaywallFlow:persist', e instanceof Error ? e : new Error(String(e)), 'warning');
      return false;
    }
  }, [refillToMax]);

  const handlePurchase = useCallback(async () => {
    // зачем (владелец 13.10): ожидание оплаты — не ошибка и не повод держать человека на пейволе с крутящейся кнопкой. Закрываем
    // по тем же правилам, что после сбоя пост-шага: обычный пейвол — закрыть, онбординг — выйти дальше, onboarding_plan — сам.
    const closePaywallAfterPendingPurchase = (reason: 'pending_error' | 'no_entitlement') => {
      const action = postAccessFailureAction({ source, accountCurrent: isOperationAccountCurrent(), dead: lifeRef.current.dead });
      console.log(`[PURCHASE] pending:close reason=${reason} действие=${action} source=${source}`); // guard-ok: ветка закрытия
      try {
        if (action === 'close') dismissPaywallModal(router, source.startsWith('settings') ? '/(tabs)/settings' : undefined);
        else if (action === 'exit_onboarding') emitAppEvent('onboarding_paywall_completed');
      } catch (closeError: unknown) {
        console.warn(`[PURCHASE] pending:close не удалось reason=${reason}`, closeError instanceof Error ? closeError.message : String(closeError)); // guard-ok: catch пишет причину
      }
    };
    if (operationRef.current) {
      // зачем (ревью 12.10 (г)): повторный тап во время идущей операции — не немой выход
      DebugLogger.info('[PAYWALL]', `покупка: тап проигнорирован — уже идёт операция «${operationRef.current}»`);
      return;
    }
    // зачем: скрытый вариант нельзя купить ни при каких гонках — проверяем и
    // глобальный флаг, и гейт по источнику (в онбординге Pro скрыт).
    if (selected === 'lifetime' && (LIFETIME_SALE_RETIRED || !isLifetimeButtonEnabled() || LIFETIME_HIDDEN_SOURCES.has(source))) {
      DebugLogger.info('[PAYWALL]', `покупка: lifetime скрыт (retired=${String(LIFETIME_SALE_RETIRED)} source=${source}) — переключаем на yearly, оплату не начинаем`);
      setSelected('yearly');
      return;
    }
    hapticTap();
    void trackEvent('paywall_cta_click', { context, source, plan: selected, paywall: variant, ...paywallImpressionParams(impression) });
    if (source === 'afterwin_levelup' || context === 'level_up') {
      void trackEvent('afterwin_upsell_cta', { source: 'level_up', plan: selected, paywall: variant });
      void import('./firebase').then(({ logAfterWinUpsellCta }) =>
        logAfterWinUpsellCta('level_up', selected),
      ).catch(swallowError('paywall_purchase:logAfterWinUpsellCta'));
    }
    logPaywallFunnel('cta_click', { variant, context, plan: selected });
    if (DEV_IAP_BYPASS || previewPrices) {
      DebugLogger.info('[PAYWALL]', `тап: магазин не зовём dev_bypass=${String(DEV_IAP_BYPASS)} previewPrices=${String(previewPrices)} (предпросмотр / dev-обход) — показываем dev-окно`);
      showDevPurchasePreviewAlert(lang);
      return;
    }
    const lookupPkg = (): PurchasesPackage | undefined => {
      const current = packagesRef.current;
      return selected === 'lifetime' ? current.lifetime : selected === 'yearly' ? current.yearly : current.monthly;
    };
    // зачем: первичный выбор пакета оставлен прежней строкой (на неё опираются сторожа порядка в
    // paywall_purchase_activation_contract); читаем из ref — он свежее state и обновляется тем же местом.
    const pkg = selected === 'lifetime' ? packagesRef.current.lifetime : selected === 'yearly' ? packagesRef.current.yearly : packagesRef.current.monthly;
    let pkgOrNull: PurchasesPackage | undefined = pkg;
    // M1: что человек видел на кнопке в момент тапа (цена, пробный, промо выбранного плана).
    const shownTerms: PaywallPlanTerms = {
      price: selected === 'lifetime' ? lifetimePrice : selected === 'yearly' ? yearlyPrice : monthlyPrice,
      trialDays: selected === 'lifetime' ? null : selected === 'yearly' ? (yearlyTrialDays ?? null) : (trialDays ?? null),
      promoPrice: selectedPromo?.promoPriceString ?? null,
    };
    if (purchasing || restoring) {
      DebugLogger.info('[PAYWALL]', `тап проигнорирован: идёт операция (purchasing=${purchasing} restoring=${restoring})`);
      return;
    }
    if (!pkgOrNull && !resilientCheckout) {
      // зачем (владелец 11.10, цены видны всегда): на плитке теперь справочная/кэш-цена, поэтому тап без магазина не может
      // быть немым — тихое «Попробуй через минуту» и фоновая догрузка цен (покупка — следующим тапом по живой цене).
      releaseReason('purchase', 'no_package', 'blocked');
      DebugLogger.info('[PAYWALL]', `тап: пакета для плана=${selected} нет, resilientCheckout=false — тихая подсказка и догрузка (цена=${priceSource})`);
      setTapNotice(true);
      void loadOfferings(lifeRef.current);
      return;
    }
    operationRef.current = 'purchase';
    const operationAccount = captureAccountGeneration();
    const isOperationAccountCurrent = () => isCurrentAccountGeneration(operationAccount);
    setPurchasing(true);
    setTapNotice(false);
    // зачем (координатор 12.10, Optimistic UI R1): у пейвола онбординга (не resilientCheckout) старт магазина и синхронизация личности ждались без потолка — кнопка могла крутиться вечно, оплата ещё не начата.
    // Тот же потолок, что в окне Plus. По истечении: кнопка свободна (finally), «Магазин не отвечает. Попробуй ещё раз» + подсказка под кнопкой. Сама оплата не затрагивается.
    const stopBeforePayment = (step: 'initRevenueCat' | 'syncRevenueCatIdentity', ms: number): void => {
      releaseReason('purchase', 'load_timeout', 'error');
      DebugLogger.warn('[PAYWALL]', `покупка: ${step} не ответил за ${ms} мс (потолок ${LOAD_GATE_TOTAL_MS}) — оплата не начата, кнопка свободна`);
      void trackEvent('purchase_failed', {
        context, plan: selected, paywall: variant, error: `${step}_timeout`, ...paywallImpressionParams(impression),
      });
      if (!isOperationAccountCurrent() || lifeRef.current.dead) return;
      setTapNotice(true);
      emitAppEvent('action_toast', actionToastTri('error', {
        ru: 'Магазин не отвечает. Попробуй ещё раз.',
        uk: 'Магазин не відповідає. Спробуй ще раз.',
        en: 'The store isn’t responding. Try again.',
        es: 'La tienda no responde. Inténtalo de nuevo.',
        'pt-BR': 'A loja não está respondendo. Tente de novo.',
        vi: 'Cửa hàng không phản hồi. Hãy thử lại.',
        id: 'Toko tidak merespons. Coba lagi.',
        tr: 'Mağaza yanıt vermiyor. Tekrar dene.',
        pl: 'Sklep nie odpowiada. Spróbuj ponownie.',
      }));
    };
    // зачем (ревью 12.10 п.1 и (в)): ОДИН флаг «purchasePackage вызван» — ставится ВНУТРИ обёртки в момент самого вызова магазина. Он решает и stale (обёртка отдаёт его и ДО вызова,
    // и ПОСЛЕ), и общий catch (мягкий тост или диалог «статус не подтверждён»). Прежний «консервативный» флаг ставился раньше обёртки и считал «после» сбои,
    // случившиеся до обращения к магазину (проверка личности внутри обёртки).
    let purchaseInvoked = false;
    // зачем (ревью 12.10 п.6): с момента, когда доступ применён локально, покупка УСПЕШНА; сбой пост-шагов (разрешение уведомлений, навигация) — только лог,
    // а не диалог «статус не подтверждён».
    let accessApplied = false;
    // Один диалог «статус не подтверждён» для всех мест (сбой после окна магазина, stale после вызова, доступ не применён).
    const presentUnverifiedDialog = (why: string, certainty: PurchaseCertainty): void => {
      // зачем (ревью 12.10 (а)): аккаунт уже не тот — «Проверить статус / Восстановить» на новом аккаунте не помогут; отдельный текст без этих кнопок.
      const ui = purchaseUnverifiedUi(isOperationAccountCurrent());
      releaseReason('purchase', 'unverified_dialog', 'error');
      DebugLogger.warn('[PAYWALL]', `purchase:unverified_dialog причина=${why} plan=${selected} source=${source} аккаунтТот=${String(isOperationAccountCurrent())} ui=${ui} оплата=${certainty}`);
      if (ui === 'previous_account_alert') {
        // зачем (ревью fa6648f02 п.1): текст честный про деньги — confirmed (магазин подтвердил) утверждает, unknown (stale / сбой после окна) — только «если оплата прошла»
        const copy = previousAccountPurchaseCopy(lang, certainty);
        void enqueueThemedBlockingInfoAlert(copy.title, copy.message, 'OK');
        return;
      }
      void showUnverifiedPurchaseAlert(lang, certainty).then((choice) => {
        console.warn('[PAYWALL] unverified:choice', JSON.stringify({ choice, certainty })); // guard-ok: выбор пользователя логируется
        if (choice === 'dismiss') return;
        void entitlementSyncRef.current?.(choice);
      }).catch((error: unknown) => {
        // зачем (третье ревью 0d76a9528, 🟡3): очередь окон или проверка статуса упали — без .catch отказ был бы немым (необработанный промис)
        DebugLogger.error('[PAYWALL] unverified:choice_failed', error instanceof Error ? error : new Error(String(error)), 'warning');
      });
    };
    try {
      if (!pkgOrNull) {
        // зачем (D158): кнопка Plus всегда активна. Offerings ещё нет — грузим их ПРЯМО НА ТАПЕ
        // (с потолком LOAD_GATE_TOTAL_MS) и сразу покупаем; цену покажет системный шит магазина.
        const tapStartedAt = Date.now();
        DebugLogger.info('[PAYWALL]', `тап без offerings: план=${selected}, грузим (потолок ${LOAD_GATE_TOTAL_MS} мс) кэшЦен=${pricesFromCache}`);
        await loadOfferings(lifeRef.current);
        // зачем (D158-уточнение, M-A): тариф переключили, пока грузились offerings, — handlePurchase держит старый
        // план; покупать «не то, что на экране» нельзя. Окно уже обновлено, ждём новый тап.
        if (selectedRef.current !== selected) {
          DebugLogger.info('[PAYWALL]', `selection_changed_during_load: было=${selected} стало=${selectedRef.current} — покупку не начинаем`);
          return;
        }
        pkgOrNull = lookupPkg();
        if (!pkgOrNull) {
          releaseReason('purchase', 'offering_missing', 'blocked');
          DebugLogger.warn('[PAYWALL]', `тап без offerings: пакета нет после ${Date.now() - tapStartedAt} мс — тихое «Попробуй через минуту»`);
          void trackEvent('purchase_failed', {
            context, plan: selected, paywall: variant, error: 'offerings_unavailable_on_tap', ...paywallImpressionParams(impression),
          });
          if (isOperationAccountCurrent() && !lifeRef.current.dead) setTapNotice(true);
          return;
        }
        // L1: окно закрыли, пока грузили, — оплату на закрытом экране не начинаем.
        if (lifeRef.current.dead || !isOperationAccountCurrent()) {
          DebugLogger.info('[PAYWALL]', 'тап без offerings: окно закрыто/аккаунт сменился во время загрузки — покупку не начинаем');
          return;
        }
        // зачем (D158-уточнение, M1; Apple 3.1.2): свежие условия сверяем с тем, что было на кнопке. Не совпало
        // или цены на кнопке не было — окно уже обновлено свежими ценами; покупка только ВТОРЫМ тапом,
        // без тихой ошибки.
        const freshEligibility = introEligibilityRef.current[pkgOrNull.product.identifier] ?? 'unknown';
        const freshTrial = getTrialInfo(pkgOrNull, freshEligibility);
        const freshPromo = getStorePromoPricing(pkgOrNull.product, { platform: Platform.OS, iosEligibility: freshEligibility });
        const freshTerms: PaywallPlanTerms = {
          price: storePriceTrim(pkgOrNull.product.priceString),
          trialDays: freshTrial.hasTrial ? (freshTrial.days ?? null) : null,
          promoPrice: freshPromo?.promoPriceString ?? null,
        };
        // ревью Opus 11.10: на кнопке была справочная цена («≈ … уточнится в магазине») — даже при совпадении строк
        // покупаем только вторым тапом, когда на экране уже живая цена магазина.
        const shownSource = selected === 'yearly' ? yearlyPick.source : selected === 'monthly' ? monthlyPick.source : 'store';
        if (shownSource === 'reference') {
          DebugLogger.info('[PAYWALL]', `reference_price_wait_second_tap: план=${selected} было=${shownTerms.price} стало=${freshTerms.price} — окно обновлено живой ценой, ждём второй тап`);
          return;
        }
        if (!paywallTermsEqual(shownTerms, freshTerms)) {
          DebugLogger.info('[PAYWALL]', `terms_changed_wait_second_tap: план=${selected} было=${JSON.stringify(shownTerms)} стало=${JSON.stringify(freshTerms)} — окно обновлено, ждём второй тап`);
          return;
        }
        DebugLogger.info('[PAYWALL]', `тап без offerings: пакет получен за ${Date.now() - tapStartedAt} мс, условия совпали → покупка`);
      }
      const pkg: PurchasesPackage = pkgOrNull; // тот же пакет, но без undefined (после догрузки на тапе)
      void trackEvent('purchase_started', { context, source, plan: selected, product_id: pkg.product.identifier, paywall: variant, ...paywallImpressionParams(impression) });
      if (resilientCheckout) {
        // До списания ничего не потрачено — зависший старт магазина честно говорим тихо, а не «статус неизвестен».
        try {
          await withLoadTimeout(initRevenueCat(isOperationAccountCurrent), LOAD_GATE_TOTAL_MS, 'initRevenueCat');
        } catch (e) {
          releaseReason('purchase', 'store_init_failed', 'error');
          DebugLogger.warn('[PAYWALL]', `покупка: старт магазина не удался до оплаты (${e instanceof Error ? e.message : String(e)}) — тихое «Попробуй через минуту»`);
          void trackEvent('purchase_failed', {
            context, plan: selected, paywall: variant, error: 'store_init_timeout', ...paywallImpressionParams(impression),
          });
          if (isOperationAccountCurrent() && !lifeRef.current.dead) setTapNotice(true);
          return;
        }
      } else {
        const capped = await awaitWithinInitCap('initRevenueCat', initRevenueCat(isOperationAccountCurrent), LOAD_GATE_TOTAL_MS, `${variant}:${source}`);
        if (capped.status === 'timeout') { stopBeforePayment('initRevenueCat', capped.ms); return; }
        if (capped.status === 'error') throw capped.error; // отказ старта — прежнее поведение (общий catch ниже)
      }
      let identityReady: boolean;
      if (resilientCheckout) {
        // L2: зависшая синхронизация личности до оплаты не крутит спиннер вечно — тот же потолок, тихий текст.
        try {
          identityReady = await withLoadTimeout(syncRevenueCatIdentity(isOperationAccountCurrent), LOAD_GATE_TOTAL_MS, 'syncRevenueCatIdentity');
        } catch (e) {
          releaseReason('purchase', 'identity_sync_failed', 'error');
          DebugLogger.warn('[PAYWALL]', `покупка: синхронизация личности не удалась до оплаты (${e instanceof Error ? e.message : String(e)}) — тихое «Попробуй через минуту»`);
          void trackEvent('purchase_failed', {
            context, plan: selected, paywall: variant, error: 'identity_sync_timeout', ...paywallImpressionParams(impression),
          });
          if (isOperationAccountCurrent() && !lifeRef.current.dead) setTapNotice(true);
          return;
        }
      } else {
        const capped = await awaitWithinInitCap('syncRevenueCatIdentity', syncRevenueCatIdentity(isOperationAccountCurrent), LOAD_GATE_TOTAL_MS, `${variant}:${source}`);
        if (capped.status === 'timeout') { stopBeforePayment('syncRevenueCatIdentity', capped.ms); return; }
        if (capped.status === 'error') throw capped.error; // прежнее поведение
        identityReady = capped.value;
      }
      if (!identityReady) {
        // зачем: голый системный Alert не годится для фирменного фидбека — владелец
        // попросил заменить на тост-механизм (тот же, что в shards_shop/coin_exchange).
        // Ошибка обязана остаться видимой, а не молча уйти в тишину.
        emitAppEvent('action_toast', storeUnreachableToast());
        releaseReason('purchase', 'identity_not_ready', 'blocked');
        DebugLogger.warn('[PAYWALL]', `покупка: личность не синхронизирована (identityReady=false) plan=${selected} source=${source} — оплату не начинаем, показан тост магазина`);
        void trackEvent('purchase_failed', { context, plan: selected, paywall: variant, error: 'identity_sync', ...paywallImpressionParams(impression) });
        return;
      }
      const pkgEligibility = introEligibilityRef.current[pkg.product.identifier] ?? introEligibility[pkg.product.identifier] ?? 'unknown';
      const pkgTrial = getTrialInfo(pkg, pkgEligibility);
      if (lifeRef.current.dead || !isOperationAccountCurrent()) {
        DebugLogger.info('[PAYWALL]', 'покупка: окно закрыто/аккаунт сменился до начала оплаты — оплату не начинаем');
        return;
      }
      setPayStarted(true); // L1: с этого момента окно не закрывается
      const purchaseResult = await runRevenueCatOperationForGeneration(
        operationAccount,
        // AA S2d раунд 3: метка потока покупки — фоновый перенос Plus в это время ждёт.
        () => withPurchaseFlow('paywall_purchase', () => {
          purchaseInvoked = true; // зачем (ревью 12.10 п.1): флаг в момент самого вызова магазина, не раньше
          return Purchases.purchasePackage(pkg); // RAW пакет — цена стора без изменений
        }),
      );
      if (purchaseResult.status !== 'ok') {
        // зачем (ревью 12.10 п.1): stale приходит и ДО, и ПОСЛЕ purchasePackage. Вызывался — оплата могла пройти (на другом аккаунте): диалог «статус не подтверждён»,
        // а не тихий возврат с живой кнопкой (повторная оплата). Не вызывался — деньги не тронуты: тихая подсказка.
        const staleUi = purchaseStaleUi(purchaseInvoked);
        releaseReason('purchase', 'stale_account', 'blocked');
        DebugLogger.warn('[PAYWALL]', `purchase:stale plan=${selected} source=${source} статус=${purchaseResult.status} purchaseInvoked=${String(purchaseInvoked)} `
          + `аккаунтТот=${String(isOperationAccountCurrent())} ui=${staleUi}`);
        if (staleUi === 'unverified_dialog') presentUnverifiedDialog('stale после вызова purchasePackage', 'unknown');
        else if (isOperationAccountCurrent() && !lifeRef.current.dead) setTapNotice(true);
        return;
      }
      let { customerInfo } = purchaseResult.value;
      // зачем: в Sandbox/TestFlight customerInfo из purchasePackage иногда ещё не
      // отражает свежий entitlement (RevenueCat не успел досинхронизироваться с
      // Apple к моменту ответа) — доступ фактически уже есть, но проверка ниже
      // мгновенно показывала «ждёт подтверждения». Пара коротких повторных
      // чтений customerInfo перед тем, как считать это deferred-покупкой.
      if (!customerInfoConfirmsProductAccess(customerInfo, pkg.product.identifier)) {
        for (let attempt = 0; attempt < 2 && isOperationAccountCurrent(); attempt += 1) {
          await new Promise((r) => setTimeout(r, 800));
          if (!isOperationAccountCurrent()) break;
          const refreshed = await readRevenueCatCustomerInfoForGeneration(operationAccount);
          if (refreshed) customerInfo = refreshed;
          if (customerInfoConfirmsProductAccess(customerInfo, pkg.product.identifier)) break;
        }
      }
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
        releaseReason('purchase', 'no_entitlement', 'blocked');
        DebugLogger.warn('[PAYWALL]', `purchase:no_entitlement plan=${selected} product=${pkg.product.identifier} source=${source} — тост «оплата обрабатывается», пейвол закрывается`);
        console.log(`[PURCHASE] pending reason=no_entitlement product=${pkg.product.identifier} source=${source} доступ НЕ выдан — ждём подтверждения магазина (слушатель customerInfo)`); // guard-ok: ветка ожидания
        showPurchasePendingAlert(lang, `product:${pkg.product.identifier}`);
        closePaywallAfterPendingPurchase('no_entitlement');
        return;
      }
      const metadata = revenueCatPremiumMetadata(customerInfo, pkg.product.identifier);
      const confirmedPlan = inferPremiumPlanFromProductId(metadata.productId, selected);
      const applied = await commitRevenueCatResultForGeneration(operationAccount, async (isCommitCurrent, commitLease) => {
        if (!isCommitCurrent()) return false;
        const persisted = await persistStorePremiumLocally(
          confirmedPlan,
          metadata,
          isCommitCurrent,
          false,
          true,
        );
        if (!persisted || !isCommitCurrent()) return false;
        if (!(await refillToMax(isCommitCurrent, commitLease))) return false;
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
      if (applied.status !== 'ok' || !applied.value) {
        // зачем (ревью 12.10 п.2): магазин подтвердил доступ (деньги возможно списаны), а локально он не записан (блокировка не взята за срок, смена аккаунта, сбой записи).
        // Тихий возврат оставлял бы живую кнопку «Купить» — человек заплатил бы второй раз. Диалог «статус не подтверждён» ведёт к «Проверить статус / Восстановить».
        releaseReason('purchase', 'not_applied', 'error');
        DebugLogger.warn('[PAYWALL]', `purchase:not_applied plan=${selected} source=${source} статус=${applied.status} значение=${applied.status === 'ok' ? String(applied.value) : '-'} `
          + `аккаунтТот=${String(isOperationAccountCurrent())} ui=unverified_dialog`);
        presentUnverifiedDialog('доступ подтверждён магазином, но не записан локально', 'confirmed');
        return;
      }
      accessApplied = true;
      // зачем (Бандл-диета Ф1): план куплен → сразу фоновый префетч всех его
      // день-строк с сервера, чтобы контент лежал в кэше до входа в любой день.
      // Передаём состояние целиком: присваивание идёт внутри async-колбэка,
      // из-за чего TS сужает замыкание до never при обращении к полю.
      void trackEvent('purchase_completed', { context, source, plan: selected, product_id: pkg.product.identifier, with_trial: pkgTrial.hasTrial, paywall: variant, ...paywallImpressionParams(impression) });
      logPaywallFunnel('purchase_completed', { variant, context, plan: selected, price: storePriceTrim(pkg.product.priceString) || null });
      if (pkgTrial.hasTrial) {
        void trackEvent('trial_started', { context, plan: selected, product_id: pkg.product.identifier, paywall: variant, ...paywallImpressionParams(impression) });
        logPaywallFunnel('trial_started', { variant, context, plan: selected });
        const reminderDays = pkgTrial.days;
        const reminderPrice = storePriceTrim(pkg.product.priceString);
        const trialStartMs = Date.now();
        DebugLogger.info('[TRIAL-REMINDER]', `покупка: пробный начался source=${source} plan=${selected} days=${reminderDays ?? 'null'} price=${reminderPrice || '—'}`);
        if (ONBOARDING_PURCHASE_SOURCES.has(source)) {
          // Онбординг (владелец 2026-09-30: «онбординг не трогаем») — прежний путь:
          // учитываем выбор шага уведомлений онбординга и сразу спрашиваем систему.
          void (async () => {
            try {
              const reminderChoice = await readOnboardingNotificationChoice();
              if (reminderChoice === 'skip' || reminderChoice === 'blocked') {
                DebugLogger.info('[TRIAL-REMINDER]', `онбординг: выход — выбор шага уведомлений=${reminderChoice}`);
                return;
              }
              const granted = await requestNotificationPermission();
              if (!granted) {
                DebugLogger.warn('[TRIAL-REMINDER]', `онбординг: выход — системное разрешение=${granted}`);
                return;
              }
              if (!reminderDays) {
                DebugLogger.warn('[TRIAL-REMINDER]', 'онбординг: выход — магазин не отдал длительность пробного');
                return;
              }
              // Текст и дата онбординга — ровно как до 2026-09-30 («за сутки»).
              const copy = onboardingTrialReminderCopy(lang, reminderPrice);
              const ok = await scheduleTrialEndReminder(reminderDays, copy.title, copy.body, trialStartMs, 'onboarding_day_before');
              if (ok) void trackEvent('trial_reminder_scheduled', { context, plan: selected, paywall: variant, days: reminderDays });
            } catch (e) {
              // напоминание — best-effort, но причину пишем
              DebugLogger.error('[TRIAL-REMINDER] onboarding', e instanceof Error ? e : new Error(String(e)), 'warning');
            }
          })();
        } else if (canPromiseTrialReminder(reminderDays)) {
          // зачем (владелец 2026-09-30): «если у юзера не разрешены уведомления — после
          // покупки должно спросить можно ли отправлять». Разрешение есть → ставим сразу.
          // Нет → вместо закрытия пейвола показываем экран «Plus ваш. Напомнить…?»;
          // навигацию дальше делает он (allowTrialReminder / skipTrialReminder).
          // зачем (ревью fa6648f02 п.4): напоминание о конце пробного — best-effort. Сбой чтения разрешения — в журнал, окно закрывается дальше обычным путём (без экрана «Напомнить?»).
          let permission: Awaited<ReturnType<typeof getNotificationPermissionStatus>> | null = null;
          try {
            permission = await getNotificationPermissionStatus();
          } catch (permissionError) {
            DebugLogger.error('[TRIAL-REMINDER] purchase:permission_status_failed', permissionError instanceof Error ? permissionError : new Error(String(permissionError)), 'warning');
          }
          DebugLogger.info('[TRIAL-REMINDER]', `покупка: системное разрешение=${permission ?? 'не прочитано'}`);
          if (permission === 'granted') {
            const copy = trialReminderCopy(lang, reminderPrice);
            void scheduleTrialEndReminder(reminderDays, copy.title, copy.body, trialStartMs, 'plus_two_days')
              .then((ok) => {
                DebugLogger.info('[TRIAL-REMINDER]', `покупка: результат постановки=${ok}`);
                if (ok) void trackEvent('trial_reminder_scheduled', { context, plan: selected, paywall: variant, days: reminderDays });
              })
              .catch((e: unknown) => DebugLogger.error('[TRIAL-REMINDER] purchase', e instanceof Error ? e : new Error(String(e)), 'warning'));
          } else if (permission !== null && isOperationAccountCurrent()) {
            DebugLogger.info('[TRIAL-REMINDER]', 'покупка: показываем экран «Напомнить о конце пробного?»');
            setTrialReminderPrompt({ days: reminderDays, priceLabel: reminderPrice, trialStartMs });
            return;
          }
        } else {
          DebugLogger.warn('[TRIAL-REMINDER]', `покупка: напоминание не ставим — пробный ${reminderDays ?? 'null'} дн. (нужно больше 2)`);
        }
      }
      if (source === 'onboarding') {
        if (!isOperationAccountCurrent()) {
          DebugLogger.info('[PAYWALL]', 'покупка: онбординг — аккаунт сменился после применения доступа, завершение флоу пропущено');
          return;
        }
        const activated = await commitRevenueCatResultForGeneration(
          operationAccount,
          (isCommitCurrent, commitLease) => finishOnboardingPaywallFlow(isCommitCurrent, commitLease),
        );
        if (activated.status !== 'ok' || !activated.value) {
          // зачем (ревью fa6648f02 п.3): Plus уже включён, а завершение онбординг-пейвола не удалось — событие завершения в нём шлётся последним шагом и НЕ ушло, экран остался бы висеть.
          const exitAction = onboardingFinishFailureAction({ status: activated.status, value: activated.status === 'ok' ? activated.value : false, accountCurrent: isOperationAccountCurrent() });
          DebugLogger.warn('[PAYWALL]', `покупка: онбординг — завершение флоу не подтверждено статус=${activated.status} значение=${activated.status === 'ok' ? String(activated.value) : '-'} действие=${exitAction} (доступ уже применён)`);
          if (exitAction === 'emit_completed') emitAppEvent('onboarding_paywall_completed');
          return;
        }
        return;
      }
      // onboarding_plan is rendered inside CleanOnboarding, not as a route modal.
      // premium_activated above lets that component finish its own flow; dismissing
      // here would mutate an unrelated native-stack entry and can flash another screen.
      if (source === 'onboarding_plan') {
        DebugLogger.info('[PAYWALL]', 'покупка: onboarding_plan — закрытие делает сам онбординг');
        return;
      }
      if (!isOperationAccountCurrent()) {
        DebugLogger.info('[PAYWALL]', 'покупка: аккаунт сменился после применения доступа — закрытие окна пропущено');
        return;
      }
      if (resumeLessonAfterPremium(router, resumeLessonId)) return;
      dismissPaywallModal(router, source.startsWith('settings') ? '/(tabs)/settings' : undefined);
    } catch (err: unknown) {
      // зачем (ревью 12.10 п.6): доступ уже применён — покупка УСПЕШНА. Сбой пост-шагов (разрешение уведомлений, постановка напоминания, навигация) —
      // только в журнал; диалог «статус не подтверждён» после успешной покупки был бы ложной тревогой.
      if (accessApplied) {
        DebugLogger.error('[PAYWALL] purchase:post_access_step_failed', err instanceof Error ? err : new Error(String(err)), 'warning');
        // зачем (ревью 12.10 (б) и fa6648f02 п.2–3): покупка УСПЕШНА и доступ применён, а окно от сбоя пост-шага осталось бы открытым. Что делать — решает чистая функция (таблица в тесте):
        // закрыть окно / вернуть к уроку, выйти из онбординг-пейвола дальше по сценарию (событие завершения, вид онбординга не меняется) или не трогать (аккаунт сменился, окно уже закрыто).
        const postAction = postAccessFailureAction({ source, accountCurrent: isOperationAccountCurrent(), dead: lifeRef.current.dead });
        DebugLogger.info('[PAYWALL]', `purchase:post_access_step_failed действие=${postAction} source=${source}`);
        try {
          if (postAction === 'close') {
            if (!resumeLessonAfterPremium(router, resumeLessonId)) {
              dismissPaywallModal(router, source.startsWith('settings') ? '/(tabs)/settings' : undefined);
            }
          } else if (postAction === 'exit_onboarding') {
            emitAppEvent('onboarding_paywall_completed');
          }
        } catch (closeError) {
          DebugLogger.error('[PAYWALL] purchase:post_access_close_failed', closeError instanceof Error ? closeError : new Error(String(closeError)), 'warning');
        }
        return;
      }
      const errCode = String((err as { code?: unknown })?.code ?? '');
      const failurePhase = purchaseFailurePhase(purchaseInvoked);
      const wasCancelled = Boolean((err as { userCancelled?: boolean })?.userCancelled);
      // зачем (ревью 12.10 п.3): ветка онбординга шла РАНЬШЕ правила фазы — после возможного списания показывала «Попробуй ещё раз» (приглашение заплатить повторно).
      // Теперь после запроса окна магазина диалог «статус не подтверждён» и в онбординге (это системное окно поверх, вид экрана онбординга не меняется).
      const failureUi = wasCancelled
        ? 'cancel'
        : errCode === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR
          ? 'pending'
          : purchaseFailureUi(failurePhase, ONBOARDING_PURCHASE_SOURCES.has(source));
      // зачем (СПЕРВА ЛОГИ): одна строка на любой сбой покупки — по ней видно, что решило между тостом и диалогом.
      releaseReason('purchase', failureUi === 'cancel' ? 'cancelled' : failureUi === 'pending' ? 'pending' : `failed_${purchaseErrorCategory(err)}`, failureUi === 'cancel' ? 'blocked' : failureUi === 'pending' ? 'info' : 'error');
      DebugLogger.warn('[PAYWALL]', `purchase:fail category=${purchaseErrorCategory(err)} phase=${PURCHASE_FAILURE_PHASE_LABEL[failurePhase]} code=${errCode || '-'} `
        + `cancelled=${String(wasCancelled)} plan=${selected} source=${source} ui=${failureUi}`);
      if ((err as { userCancelled?: boolean })?.userCancelled) {
        void trackEvent('purchase_cancelled', { context, plan: selected, paywall: variant, ...paywallImpressionParams(impression) });
        logPaywallFunnel('purchase_cancelled', { variant, context, plan: selected });
      } else if (errCode === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
        // Ask to Buy / 3-D Secure: оплата ушла на подтверждение. Раньше эта
        // ветка падала в общий «Не удалось оформить» — юзер путался и платил
        // повторно. Доступ включится сам после подтверждения платежа.
        void trackEvent('purchase_pending', {
          context, source, plan: selected, product_id: pkgOrNull?.product.identifier, paywall: variant,
          ...paywallImpressionParams(impression),
        });
        console.log(`[PURCHASE] pending reason=pending_error code=${errCode} product=${pkgOrNull?.product.identifier ?? 'unknown'} source=${source} доступ НЕ выдан — ждём подтверждения магазина`); // guard-ok: ветка ожидания
        showPurchasePendingAlert(lang, `product:${pkgOrNull?.product.identifier ?? 'unknown'}`);
        closePaywallAfterPendingPurchase('pending_error');
      } else {
        void trackEvent('purchase_failed', {
          context, plan: selected, paywall: variant,
          error: purchaseErrorCategory(err),
          ...paywallImpressionParams(impression),
        });
        logPaywallFunnel('purchase_failed', { variant, context, plan: selected });
        if (failureUi === 'onboarding_alert') {
          void enqueueThemedBlockingInfoAlert(
            triLang(lang, {
              ru: 'Не удалось оформить',
              uk: 'Не вдалося оформити',
              en: "Couldn't complete",
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
              en: 'Try again or restore your purchases.',
              es: 'Inténtalo de nuevo o restaura tus compras.',
              'pt-BR': 'Tente de novo ou restaure suas compras.',
              vi: 'Hãy thử lại hoặc khôi phục giao dịch mua.',
              id: 'Coba lagi atau pulihkan pembelianmu.',
              tr: 'Tekrar dene veya satın alımları geri yükle.',
              pl: 'Spróbuj ponownie albo przywróć zakupy.',
            }),
            'OK',
          );
        } else if (failureUi === 'soft_store_toast') {
          // зачем (R1_PAYWALL_UX п.1): окно оплаты магазина не открывалось — деньги не тронуты, пугать «статус неизвестен» не надо.
          emitAppEvent('action_toast', storeUnreachableToast());
          if (isOperationAccountCurrent() && !lifeRef.current.dead) setTapNotice(true);
        } else {
          presentUnverifiedDialog(`сбой после запроса окна магазина (${purchaseErrorCategory(err)})`, 'unknown');
        }
      }
    } finally {
      operationRef.current = null;
      setPurchasing(false);
      setPayStarted(false);
    }
  }, [selected, packages, purchasing, restoring, router, context, source, variant, lang, refillToMax, finishOnboardingPaywallFlow, impression, introEligibility, resumeLessonId, resilientCheckout, loadOfferings, pricesFromCache, lifetimePrice, yearlyPrice, monthlyPrice, yearlyTrialDays, trialDays, selectedPromo, previewPrices, priceSource, yearlyPick.source, monthlyPick.source]);

  // ── экран после покупки: напоминание о конце пробного ─────────────────────
  const finishAfterTrialReminderPrompt = useCallback(() => {
    setTrialReminderPrompt(null);
    if (resumeLessonAfterPremium(router, resumeLessonId)) return;
    dismissPaywallModal(router, source.startsWith('settings') ? '/(tabs)/settings' : undefined);
  }, [resumeLessonId, router, source]);

  /** «Разрешить напоминание» → системный запрос → при согласии ставим уведомление. */
  const allowTrialReminder = useCallback(async () => {
    const prompt = trialReminderPrompt;
    if (!prompt || trialReminderPromptBusyRef.current) {
      DebugLogger.info('[TRIAL-REMINDER]', `экран: повторный тап проигнорирован (prompt=${prompt ? 'есть' : 'нет'})`);
      return;
    }
    trialReminderPromptBusyRef.current = true;
    hapticTap();
    DebugLogger.info('[TRIAL-REMINDER]', `экран: «Разрешить» days=${prompt.days}`);
    try {
      const permission = await requestNotificationPermissionWithFallback({ openSettingsIfBlocked: true });
      DebugLogger.info('[TRIAL-REMINDER]', `экран: системный ответ granted=${permission.granted} blocked=${permission.blocked} openedSettings=${permission.openedSettings}`);
      if (permission.granted) {
        const copy = trialReminderCopy(lang, prompt.priceLabel);
        const ok = await scheduleTrialEndReminder(prompt.days, copy.title, copy.body, prompt.trialStartMs, 'plus_two_days');
        DebugLogger.info('[TRIAL-REMINDER]', `экран: результат постановки=${ok}`);
        if (ok) void trackEvent('trial_reminder_scheduled', { context, plan: selected, paywall: variant, days: prompt.days });
      }
    } catch (e) {
      DebugLogger.error('[TRIAL-REMINDER] allow', e instanceof Error ? e : new Error(String(e)), 'warning');
    } finally {
      trialReminderPromptBusyRef.current = false;
      finishAfterTrialReminderPrompt();
    }
  }, [context, finishAfterTrialReminderPrompt, lang, selected, trialReminderPrompt, variant]);

  /** «Не сейчас» — закрываем без системного запроса. */
  const skipTrialReminder = useCallback(() => {
    if (trialReminderPromptBusyRef.current) return;
    hapticTap();
    DebugLogger.info('[TRIAL-REMINDER]', 'экран: «Не сейчас» — без системного запроса');
    finishAfterTrialReminderPrompt();
  }, [finishAfterTrialReminderPrompt]);

  // ── восстановление ─────────────────────────────────────────────────────────
  // зачем (65а): один путь применения доступа для «Восстановить» (restorePurchases) и «Проверить статус» (getCustomerInfo).
  // mode по умолчанию 'restore': кнопки экранов зовут handleRestore() без аргумента.
  const handleRestore = useCallback(async (mode: 'restore' | 'check' = 'restore') => {
    if (operationRef.current) {
      // зачем (ревью 12.10 (г)): повторный тап во время идущей операции — не немой выход
      DebugLogger.info('[PAYWALL]', `restore: тап проигнорирован — уже идёт операция «${operationRef.current}» mode=${mode}`);
      return;
    }
    hapticTap();
    if (DEV_IAP_BYPASS || restoring || purchasing) {
      DebugLogger.info('[PAYWALL]', `restore: выход без действия dev_bypass=${String(DEV_IAP_BYPASS)} restoring=${String(restoring)} purchasing=${String(purchasing)} mode=${mode}`);
      return;
    }
    operationRef.current = 'restore';
    const operationAccount = captureAccountGeneration();
    const isOperationAccountCurrent = () => isCurrentAccountGeneration(operationAccount);
    setRestoring(true);
    // зачем (координатор 14.10, аудит покупки): пока идёт восстановление, окно Plus закрыть нельзя (restoring блокирует крестик, свайп, фон и «назад»),
    // а старт магазина и синхронизация личности ждались без потолка — зависший RevenueCat запирал человека с вечным «Восстанавливаем…».
    // Тот же потолок, что у покупки (LOAD_GATE_TOTAL_MS). По таймауту — тост «Попробуй ещё раз», finally освобождает кнопку и закрытие.
    // Сам restorePurchases/getCustomerInfo без потолка: поздний ответ магазина нужно применить, а не выбросить.
    const stopRestoreBeforeStore = (step: 'initRevenueCat' | 'syncRevenueCatIdentity', ms: number): void => {
      releaseReason('restore_purchase', 'load_timeout', 'error');
      console.warn(`[PAYWALL-RESTORE] timeout step=${step} ms=${ms} ceilingMs=${LOAD_GATE_TOTAL_MS} mode=${mode} source=${source} accountCurrent=${String(isOperationAccountCurrent())} -> store not called, retry toast, button and close released`); // guard-ok: ранний выход логируется
      emitAppEvent('action_toast', restoreRetryToast());
    };
    try {
      const initCapped = await awaitWithinInitCap('initRevenueCat', initRevenueCat(isOperationAccountCurrent), LOAD_GATE_TOTAL_MS, `restore:${mode}:${source}`);
      if (initCapped.status === 'timeout') { stopRestoreBeforeStore('initRevenueCat', initCapped.ms); return; }
      if (initCapped.status === 'error') throw initCapped.error; // прежнее поведение: общий catch → тост restore_failed
      const identityCapped = await awaitWithinInitCap('syncRevenueCatIdentity', syncRevenueCatIdentity(isOperationAccountCurrent), LOAD_GATE_TOTAL_MS, `restore:${mode}:${source}`);
      if (identityCapped.status === 'timeout') { stopRestoreBeforeStore('syncRevenueCatIdentity', identityCapped.ms); return; }
      if (identityCapped.status === 'error') throw identityCapped.error; // прежнее поведение
      if (!identityCapped.value) {
        // зачем: тот же фирменный тост вместо системного Alert, что и в purchase —
        // ошибка подключения к стору при восстановлении обязана остаться видимой.
        emitAppEvent('action_toast', storeUnreachableToast());
        releaseReason('restore_purchase', 'identity_not_ready', 'blocked');
        DebugLogger.warn('[PAYWALL]', `restore: личность не синхронизирована mode=${mode} — показан тост магазина`);
        return;
      }
      const restoreResult = await runRevenueCatOperationForGeneration(
        operationAccount,
        () => withPurchaseFlow('paywall_restore', () => (mode === 'check' ? Purchases.getCustomerInfo() : Purchases.restorePurchases())),
      );
      if (restoreResult.status !== 'ok') {
        // зачем (R1_PAYWALL_UX п.3): аккаунт сменился вокруг запроса к магазину — результат чужой, применять нельзя, но человек должен узнать, что произошло.
        // зачем (ревью 12.10 п.4): stale бывает и БЕЗ смены аккаунта (личность не подтянулась, блокировка не взята) — «Аккаунт сменился» тогда ложь; текст по факту.
        const staleUi = restoreStaleUi(isOperationAccountCurrent());
        releaseReason('restore_purchase', 'stale_account', 'blocked');
        DebugLogger.warn('[PAYWALL]', `restore:stale mode=${mode} статус=${restoreResult.status} аккаунтТот=${String(isOperationAccountCurrent())} ui=${staleUi} — результат отброшен`);
        emitAppEvent('action_toast', staleUi === 'account_changed_toast' ? restoreAccountChangedToast() : restoreRetryToast());
        return;
      }
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
        const applied = await commitRevenueCatResultForGeneration(operationAccount, async (isCommitCurrent, commitLease) => {
          if (!isCommitCurrent()) return false;
          const persisted = await persistStorePremiumLocally(
            plan,
            metadata,
            isCommitCurrent,
            false,
            true,
          );
          if (!persisted || !isCommitCurrent()) return false;
          if (!(await refillToMax(isCommitCurrent, commitLease))) return false;
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
        if (applied.status !== 'ok' || !applied.value) {
          // зачем (R1_PAYWALL_UX п.3): stale — аккаунт сменился; ok+false — запись доступа не удалась на текущем аккаунте (реальный сбой, а не тишина).
          releaseReason('restore_purchase', 'not_applied', 'error');
          DebugLogger.warn('[PAYWALL]', `restore:not_applied mode=${mode} статус=${applied.status} значение=${applied.status === 'ok' ? String(applied.value) : '-'} план=${plan}`);
          // зачем (ревью 12.10 п.4): «Аккаунт сменился» — только если он действительно сменился; иначе (stale без смены / ok+false) — «не удалось, попробуй ещё раз».
          emitAppEvent('action_toast', applied.status !== 'ok' && restoreStaleUi(isOperationAccountCurrent()) === 'account_changed_toast'
            ? restoreAccountChangedToast()
            : applied.status !== 'ok' ? restoreRetryToast() : paywallRestoreToast(mode === 'check' ? 'status_check_failed' : 'restore_failed'));
          return;
        }
        // зачем (Бандл-диета Ф1): восстановленная покупка тоже активирует план —
        // зачем: раньше восстановление молча активировало премиум и закрывало пейвол —
        // владелец попросил короткое видимое подтверждение ДО навигации/закрытия,
        // тем же тост-механизмом. Логику активации/навигации ниже не трогаем.
        emitAppEvent('action_toast', paywallRestoreToast(mode === 'check' ? 'purchase_confirmed' : 'restored'));
        void trackEvent('subscription_restored', { context, paywall: variant, mode });
        logPaywallFunnel('restore_completed', { variant, context, plan });
        if (source === 'onboarding') {
          if (!isOperationAccountCurrent()) {
            DebugLogger.info('[PAYWALL]', `restore: онбординг — аккаунт сменился после применения доступа mode=${mode}, завершение флоу пропущено`);
            return;
          }
          const activated = await commitRevenueCatResultForGeneration(
            operationAccount,
            (isCommitCurrent, commitLease) => finishOnboardingPaywallFlow(isCommitCurrent, commitLease),
          );
          if (activated.status !== 'ok' || !activated.value) {
            // зачем (ревью fa6648f02 п.3): то же, что в покупке — Plus восстановлен, а экран онбординг-пейвола не отпустили; выходим дальше по сценарию.
            const exitAction = onboardingFinishFailureAction({ status: activated.status, value: activated.status === 'ok' ? activated.value : false, accountCurrent: isOperationAccountCurrent() });
            DebugLogger.warn('[PAYWALL]', `restore: онбординг — завершение флоу не подтверждено mode=${mode} статус=${activated.status} значение=${activated.status === 'ok' ? String(activated.value) : '-'} действие=${exitAction} (доступ уже применён)`);
            if (exitAction === 'emit_completed') emitAppEvent('onboarding_paywall_completed');
            return;
          }
          return;
        }
        if (source === 'onboarding_plan') {
          DebugLogger.info('[PAYWALL]', `restore: onboarding_plan — закрытие делает сам онбординг mode=${mode}`);
          return;
        }
        if (!isOperationAccountCurrent()) {
          DebugLogger.info('[PAYWALL]', `restore: аккаунт сменился после применения доступа mode=${mode} — закрытие окна пропущено`);
          return;
        }
        if (resumeLessonAfterPremium(router, resumeLessonId)) return;
        dismissPaywallModal(router, source.startsWith('settings') ? '/(tabs)/settings' : undefined);
      } else {
        // зачем: «активных покупок нет» — честная и ожидаемая ошибка (не баг), но
        // обязана остаться видимой пользователю. Системный Alert → фирменный тост.
        // зачем (65а, ревью): после «Проверить статус» фраза «подписок нет» толкает к повторной покупке, когда списание
        // могло пройти, — в режиме проверки направляем к восстановлению.
        releaseReason('restore_purchase', 'no_access', 'blocked');
        console.warn('[PAYWALL] entitlement_sync:no_access', JSON.stringify({ mode })); // guard-ok: ранний исход логируется
        emitAppEvent('action_toast', paywallRestoreToast(mode === 'check' ? 'status_not_found' : 'no_active_subscriptions'));
      }
    } catch (syncError: unknown) {
      // зачем: сбой самого восстановления (сеть/стор) — тот же тост-механизм,
      // ошибка не должна тонуть молча.
      releaseReason('restore_purchase', 'sync_threw', 'error');
      console.warn('[PAYWALL] entitlement_sync:threw', JSON.stringify({
        mode,
        name: syncError instanceof Error ? syncError.name : typeof syncError,
        code: (syncError as { code?: unknown } | null)?.code ?? null,
      })); // guard-ok: catch логирует причину
      emitAppEvent('action_toast', paywallRestoreToast(mode === 'check' ? 'status_check_failed' : 'restore_failed'));
    } finally {
      operationRef.current = null;
      setRestoring(false);
    }
  }, [router, restoring, purchasing, context, source, variant, lang, refillToMax, finishOnboardingPaywallFlow, resumeLessonId]);
  entitlementSyncRef.current = handleRestore;

  // ── закрытие ───────────────────────────────────────────────────────────────
  // Фактическое закрытие пейвола (D187: сразу, с первого тапа).
  // зачем (§139, 04.10): два быстрых тапа «закрыть» в одном кадре слали paywall_close дважды и дважды
  // уводили назад по стеку (выбивало на экран раньше). Окно, а не вечный замок: в онбординге пейвол
  // остаётся смонтированным под оверлеем, и будущее закрытие не должно блокироваться.
  const PAYWALL_CLOSE_LOCK_MS = 800;
  const closeLockUntilRef = useRef(0);
  const doClose = useCallback((reason: 'close' | 'continue_free') => {
    const nowMs = Date.now();
    console.log(`[WINBACK-FREEZE] t=${Date.now() % 100000} doClose reason=${reason} context=${context} source=${source} lockLeftMs=${Math.max(0, closeLockUntilRef.current - nowMs)}`); // guard-ok: временная трассировка
    if (nowMs < closeLockUntilRef.current) {
      DebugLogger.info('[PAYWALL]', `закрытие проигнорировано: повторный тап (reason=${reason}, lockLeftMs=${closeLockUntilRef.current - nowMs})`);
      return;
    }
    closeLockUntilRef.current = nowMs + PAYWALL_CLOSE_LOCK_MS;
    void trackEvent('paywall_close', { context, source, paywall: variant, reason, ...paywallImpressionParams(impression) });
    logPaywallFunnel('close', { variant, context, plan: selected });
    if (!DEV_IAP_BYPASS) void schedulePaywallAbandonedNotification(lang).catch(swallowError('paywall_purchase:schedulePaywallAbandoned'));
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
        } catch (e) {
      // best-effort
      DebugLogger.error('paywall_purchase:doClose', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
        // НЕ навигируем на '/(tabs)/home'. Слушатель в _layout по этому событию
        // синхронно поднимает непрозрачный онбординг-оверлей (absoluteFill, zIndex 50) —
        // он перекрывает оставшийся под ним пейвол. Навигация на «Главную» здесь
        // монтировала тяжёлый домашний экран (≈4с «думает») и на кадр показывала
        // «Главную» до подъёма оверлея (мелькание home перед экраном имени).
        emitAppEvent('onboarding_paywall_completed');
      })();
      return;
    }
    // Дневной лимит диалогов — тупиковый контекст: возвращаться в тот же
    // ai_dialog_session нельзя, потому что он мгновенно снова откроет paywall.
    // После осознанного закрытия ведём пользователя в корень приложения.
    if (context === 'dialog_limit') {
      markNextNavigationAsReplace();
      router.replace('/(tabs)/home' as any);
      return;
    }
    dismissPaywallModal(router, source.startsWith('settings') ? '/(tabs)/settings' : undefined);
  }, [router, context, source, variant, selected, lang, impression]);

  // зачем (D187, владелец 14.10: «Удалить код»): оффер пробного периода на выходе из пейвола удалён целиком — закрытие одно и прямое,
  // с первого тапа. Постоянная строка журнала: откуда закрыли (крестик / свайп / затемнение) — для разборов «не закрывается/зависло».
  const handleClose = useCallback((reason: 'close' | 'continue_free', via: PaywallCloseVia = 'x') => {
    hapticTap();
    console.log(`[PAYWALL-CLOSE] via=${via} reason=${reason} context=${context} source=${source}`); // guard-ok: одна строка на закрытие пейвола, постоянный журнал
    doClose(reason);
  }, [context, source, doClose]);

  // зачем (координатор 12.10, 🔴 пустой экран перед пейволом): когда именно хук онбординга получил цены и какого источника.
  const onbWaitStartRef = useRef(Date.now());
  useEffect(() => {
    if (context !== 'onboarding_plan') return;
    console.log(`[ONB-PAYWALL-WAIT] hook:state +${Date.now() - onbWaitStartRef.current}ms loading=${String(loading)} settled=${String(offeringsSettled)} failed=${String(offeringsFailed)} reason=${String(storeUnavailableReason)} priceSource=${priceSource} yearly=${yearlyPrice || '—'} monthly=${monthlyPrice || '—'}`); // guard-ok: смена состояния, не кадр
  }, [context, loading, offeringsSettled, offeringsFailed, storeUnavailableReason, priceSource, yearlyPrice, monthlyPrice]);

  // зачем (координатор 12.10, R1 «нет пути»): dev-подмена вида окна (см. app/dev_paywall_state.ts); без devState — вид как есть.
  const shown = applyDevPaywallView(devState, {
    loading, offeringsSettled, offeringsFailed, storeUnavailableReason, previewPrices, priceSource, pricesApproximate,
    yearlyPriceSource, monthlyPriceSource, yearlyPrice, monthlyPrice, yearlyPerMonth, monthlyPerMonth, pricesFromCache,
    purchasing, payStarted, restoring, tapNotice, storePromo, selectedPromo, trialReminderPrompt,
  }, selected);

  // Диалоги и тост dev-состояний открываем после первого кадра окна (очередь алертов сама встанет поверх).
  useEffect(() => {
    if (!devState) return undefined;
    // зачем (координатор 12.10, dev-состояния пейвола для съёмки): хвост окна прошлого dev-состояния («Покупка ждёт подтверждения») перекрывал следующий кадр (paywalls-015/016/018) — при входе в состояние очередь блокирующих окон очищается.
    clearThemedBlockingAlerts(`dev_state_enter:${devState}`);
    const timer = setTimeout(() => {
      if (devState === 'store_unreachable') {
        console.log('[DEV-STATE] paywall: тост «не удалось связаться с магазином» + «Попробуй через минуту» под кнопкой'); // guard-ok: единичный лог на открытие
        emitAppEvent('action_toast', storeUnreachableToast());
      } else if (devState === 'pending') {
        console.log('[DEV-STATE] paywall: тост «оплата обрабатывается» (окна ожидания нет, владелец 13.10)'); // guard-ok: единичный лог на открытие
        showPurchasePendingAlert(lang, `dev:${Date.now()}`); // dev: каждый показ — отдельное окно для съёмки
      } else if (devState === 'unknown_outcome') {
        console.log('[DEV-STATE] paywall: диалог «статус покупки не подтверждён»'); // guard-ok: единичный лог на открытие
        void showUnverifiedPurchaseAlert(lang).then((choice) => {
          console.log(`[DEV-STATE] paywall: выбор в диалоге = ${choice} (в dev ничего не запускается)`); // guard-ok: единичный лог
        }).catch((error: unknown) => {
          console.warn('[DEV-STATE] paywall: окно «статус не подтверждён» не показалось', error instanceof Error ? error.message : String(error)); // guard-ok: немого catch нет
        });
      } else if (devState === 'status_unknown') {
        console.log('[DEV-STATE] paywall: тост «покупка пока не найдена»'); // guard-ok: единичный лог на открытие
        emitAppEvent('action_toast', paywallRestoreToast('status_not_found'));
      }
    }, 700);
    return () => {
      clearTimeout(timer);
      clearThemedBlockingAlerts(`dev_state_leave:${devState}`); // уходим с окна — окно не должно переехать на следующий экран
    };
  }, [devState, lang]);

  return {
    selected, selectPlan,
    packages, reloadOfferings,
    lifetimePrice, lifetimeAvailable,
    savingsPct, perDayLabel,
    trial, trialDays, yearlyTrialDays, yearlyTrialSource, ctaDisabled, selectedAvailable,
    handlePurchase, handleRestore, handleClose,
    allowTrialReminder, skipTrialReminder,
    ...shown,
  };
}

/* expo-router route shim. */
export default function __RouteShim() {
  return null;
}

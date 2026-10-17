// ════════════════════════════════════════════════════════════════════════════
// manage_subscription.tsx — внутренний экран «Управление подпиской».
//
// Возвращён после рефакторинга пейвола (раньше manage=1 просто открывал стор).
// Показывает: статус «Premium активирован», название плана, дату след. списания
// и сумму (из RevenueCat customerInfo), список включённого, карточку «Перейти
// на годовой» (Google DEFERRED-проплейшн) и кнопку «Отменить подписку» →
// шит-опрос (logCancelSurvey) → переход в стор для фактической отмены.
//
// Данные о подписке — авторитетно из стора (Purchases.getCustomerInfo). Никаких
// фейковых дат/сумм: если данных нет, поле просто не показывается.
//
// Инстант-открытие (2026-07-25): план (?plan=) приходит параметром роута из
// settings.tsx, который уже знает premiumPlan синхронно на момент показа кнопки
// "Plus активирован" — первый кадр рендерится с ним сразу, без спиннера. Локальный
// AsyncStorage-кэш (premium_plan/premium_rc_product_id) и живой RevenueCat-запрос
// дальше уточняют план/дату/цену в фоне, не блокируя открытие.
// ════════════════════════════════════════════════════════════════════════════
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { getDevPlanOverride } from './dev_vip_override';
import { MANAGE_NO_ACCESS_PAYWALL, decideManageAccess } from './manage_subscription_access';
import { usePremium } from '../components/PremiumContext';
import { peekPremiumPlan, rememberPremiumPlan } from './premium_plan_peek';
import { isDevManageLoadingHold } from './dev_paywall_state';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Linking, Platform, TextInput, type LayoutChangeEvent,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { LinearGradient } from '../components/SafeLinearGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import ContentWrap from '../components/ContentWrap';
import DuoPressable from '../components/DuoPressable';
import FullscreenHybridEntrance from '../components/feedback/FullscreenHybridEntrance';
import { useKeyboardBottomInset } from '../components/keyboardAvoidance';
import PressableHybrid from '../components/PressableHybrid';
import { FONT_SCALE, useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { liquidGlassTokens } from '../constants/liquidGlassThemePalette';
import { useScreen } from '../hooks/use-screen';
import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import { storePriceTrim, storeUnreachableToast } from './paywall_purchase';
import { revenueCatCustomerInfoHasPremiumAccess } from './revenuecat_premium_access';
import {
  inferPremiumPlanFromCustomerInfo,
  inferPremiumPlanFromProductId,
  revenueCatPremiumMetadata,
  type PremiumStorePlan,
} from './premium_revenuecat_state';
import { logCancelSurvey, logChangePlanStarted } from './firebase';
import { trackEvent } from './analytics';
import { safeRouterBack } from './navigation_back';
import { hapticTap } from '../hooks/use-haptics';
import { emitAppEvent } from './events';
import { invalidatePremiumCache } from './premium_guard';
import {
  captureAccountGeneration,
  isCurrentAccountGeneration,
  subscribeAccountGeneration,
  type AccountGenerationToken,
} from './account_generation';
import {
  changeManageSubscriptionPlanForGeneration,
  isManageSubscriptionOperationCurrent,
} from './manage_subscription_purchase';
import { readRevenueCatCustomerInfoForGeneration } from './revenuecat_account_identity';
import { peekHomeScreenHydration } from './home_screen_hydration';
import { DEV_SAVE_OFFER_PROGRESS, getDevSaveOfferProgress, takeDevSaveOfferOpen } from './dev_save_offer_progress';
import { isDevRestorePurchaseEmpty } from './dev_paywall_state';
import {
  resolveSaveOffer,
  type SaveOfferKind,
  type SaveOfferProgress,
} from './manage_subscription_save_offer';
import { DebugLogger } from './debug-logger';
import { peekPaywallPriceCache } from './paywall_price_cache';
import { resolvePaywallReferencePrices } from './paywall_reference_prices';
import { withPurchaseFlow } from './purchase_flow_activity';
import { noteSwallowedHandler } from './swallow_log'; // зачем: PM-229 — немой catch → причина в журнале, значение по умолчанию прежнее

/** Потолок ожидания магазина при «Восстановить» (решение координатора 15.10). */
const RESTORE_CEILING_MS = 8000;

type ManageSubscriptionCopy = {
  ru: string;
  uk: string;
  en: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

type ManageSubscriptionBenefit = ManageSubscriptionCopy & {
  benefitId: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

// Короткий список только тех преимуществ Plus, для которых есть прямые живые гейты.
// Не расширять маркетинговыми обещаниями без отдельной проверки runtime-контракта.
// зачем (склейка profile-016/017, 12.10): в макете manage-subscription-states.html значки — контурные (bolt, chat, mic, bookmark,
// snow, trend, layers), 22 px; в приложении были залитые и другие глифы (chatbubbles, stats-chart, albums). Цвет — оттенок темы, как в макете.
const INCLUDED: ManageSubscriptionBenefit[] = [
  { benefitId: 'energy', icon: 'flash-outline', ru: 'Энергия не расходуется', uk: 'Енергія не витрачається', en: 'Unlimited energy', es: 'La energía no se consume', 'pt-BR': 'A energia não é consumida', vi: 'Không tiêu hao năng lượng', id: 'Energi tidak berkurang', tr: 'Enerji harcanmaz', pl: 'Energia nie jest zużywana' },
  { benefitId: 'free_conversation', icon: 'chatbubble-outline', ru: 'Свободный разговор', uk: 'Вільна розмова', en: 'Open conversation', es: 'Conversación libre', 'pt-BR': 'Conversa livre', vi: 'Trò chuyện tự do', id: 'Percakapan bebas', tr: 'Serbest konuşma', pl: 'Swobodna rozmowa' },
  { benefitId: 'pronunciation', icon: 'mic-outline', ru: 'Произношение без дневного лимита', uk: 'Вимова без денного ліміту', en: 'Pronunciation without a daily limit', es: 'Pronunciación sin límite diario', 'pt-BR': 'Pronúncia sem limite diário', vi: 'Luyện phát âm không giới hạn hằng ngày', id: 'Latihan pengucapan tanpa batas harian', tr: 'Günlük limitsiz telaffuz', pl: 'Wymowa bez dziennego limitu' },
  { benefitId: 'saved_phrases', icon: 'bookmark-outline', ru: 'Сохранённые фразы без ограничения', uk: 'Збережені вислови без обмеження', en: 'Unlimited saved phrases', es: 'Frases guardadas sin límite', 'pt-BR': 'Frases salvas sem limite', vi: 'Lưu cụm từ không giới hạn', id: 'Frasa tersimpan tanpa batas', tr: 'Sınırsız kayıtlı ifadeler', pl: 'Zapisane zwroty bez limitu' },
  { benefitId: 'streak_freezes', icon: 'snow-outline', ru: '3 заморозки серии в месяц', uk: '3 заморозки серії на місяць', en: '3 streak freezes per month', es: '3 protecciones de racha al mes', 'pt-BR': '3 congelamentos de sequência por mês', vi: '3 lần đóng băng chuỗi mỗi tháng', id: '3 pembekuan rentetan per bulan', tr: 'Ayda 3 seri dondurma', pl: '3 zamrożenia serii miesięcznie' },
  { benefitId: 'detailed_stats', icon: 'trending-up-outline', ru: 'Подробная статистика занятий', uk: 'Докладна статистика занять', en: 'Detailed learning statistics', es: 'Estadísticas detalladas de aprendizaje', 'pt-BR': 'Estatísticas detalhadas de estudo', vi: 'Thống kê học tập chi tiết', id: 'Statistik belajar terperinci', tr: 'Ayrıntılı çalışma istatistikleri', pl: 'Szczegółowe statystyki nauki' },
  { benefitId: 'flashcard_training', icon: 'layers-outline', ru: 'Тренировки с карточками без ограничений', uk: 'Тренування з картками без обмежень', en: 'Unlimited flashcard training', es: 'Entrenamiento con tarjetas sin límites', 'pt-BR': 'Treinos com cartões sem limites', vi: 'Luyện tập thẻ ghi nhớ không giới hạn', id: 'Latihan kartu tanpa batas', tr: 'Sınırsız kart çalışması', pl: 'Trening z fiszkami bez ograniczeń' },
];

// Причины отмены для шит-опроса (logCancelSurvey).
// зачем (координатор 13.10): у причин не было en, а вызов клал r.ru в слот en — 6 причин по-русски в английском интерфейсе.
const CANCEL_REASONS: ({ key: string } & ManageSubscriptionCopy)[] = [
  { key: 'too_expensive', ru: 'Слишком дорого', uk: 'Занадто дорого', en: 'Too expensive', es: 'Demasiado caro', 'pt-BR': 'Muito caro', vi: 'Quá đắt', id: 'Terlalu mahal', tr: 'Çok pahalı', pl: 'Za drogo' },
  { key: 'not_using', ru: 'Не пользуюсь достаточно', uk: 'Не користуюся достатньо', en: 'I don’t use it enough', es: 'No lo uso lo suficiente', 'pt-BR': 'Não uso o suficiente', vi: 'Tôi không dùng đủ nhiều', id: 'Saya tidak cukup sering memakainya', tr: 'Yeterince kullanmıyorum', pl: 'Nie korzystam wystarczająco' },
  { key: 'missing_features', ru: 'Не хватает функций', uk: 'Бракує функцій', en: 'Missing features', es: 'Faltan funciones', 'pt-BR': 'Faltam recursos', vi: 'Thiếu tính năng', id: 'Fitur kurang', tr: 'Özellikler eksik', pl: 'Brakuje funkcji' },
  { key: 'technical', ru: 'Технические проблемы', uk: 'Технічні проблеми', en: 'Technical problems', es: 'Problemas técnicos', 'pt-BR': 'Problemas técnicos', vi: 'Sự cố kỹ thuật', id: 'Masalah teknis', tr: 'Teknik sorunlar', pl: 'Problemy techniczne' },
  { key: 'temporary', ru: 'Временно, вернусь позже', uk: 'Тимчасово, повернусь пізніше', en: 'Temporary, I’ll come back later', es: 'Temporal, vuelvo luego', 'pt-BR': 'Temporário, volto depois', vi: 'Tạm thời, tôi sẽ quay lại sau', id: 'Sementara, nanti saya kembali', tr: 'Geçici, sonra döneceğim', pl: 'Tymczasowo, wrócę później' },
  { key: 'other', ru: 'Другое', uk: 'Інше', en: 'Other', es: 'Otro', 'pt-BR': 'Outro', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' },
];

const DATE_LOCALE_BY_LANG: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  en: 'en-US',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

function getStoreManageUrl(): string {
  return Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
}

function formatDate(ms: number | null, lang: Lang): string | null {
  if (!ms || !Number.isFinite(ms)) return null;
  try {
    const locale = DATE_LOCALE_BY_LANG[lang] ?? 'en-US';
    return new Date(ms).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return null;
  }
}

function normalizeStoredPremiumPlan(plan: unknown): PremiumStorePlan | null {
  const normalized = String(plan ?? '').trim().toLowerCase();
  if (normalized === 'annual') return 'yearly';
  return normalized === 'monthly' || normalized === 'yearly' || normalized === 'lifetime'
    ? normalized
    : null;
}

function localPremiumPlan(productId: unknown, storedPlan: unknown): PremiumStorePlan | null {
  const fallback = normalizeStoredPremiumPlan(storedPlan);
  if (String(productId ?? '').trim()) {
    return inferPremiumPlanFromProductId(productId, fallback ?? 'monthly');
  }
  return fallback;
}

/** PM-214: план первого кадра — из маршрута, иначе из памяти процесса (premium_plan_peek); null → скелет до хранилища/RevenueCat. */
function firstFramePremiumPlan(routeParamPlan: PremiumStorePlan | null): PremiumStorePlan | null {
  const peeked = routeParamPlan ? null : peekPremiumPlan();
  const plan = routeParamPlan ?? (peeked ? localPremiumPlan(peeked.productId ?? undefined, peeked.plan) : null);
  console.log(`[SUB-PEEK] первый кадр источник=${routeParamPlan ? 'route' : peeked ? `peek:${peeked.source}` : 'none'} значение=${plan ?? 'нет'}`); // guard-ok: одна строка на открытие экрана
  return plan;
}

type SubscriptionOverlayFrameProps = {
  bloomColor: string;
  children: React.ReactNode;
  glass: ReturnType<typeof liquidGlassTokens>;
};

/**
 * Inline presentation shell: SafeAreaView above it already owns all four insets.
 * The viewport is measured after keyboard avoidance / Android resize, and the
 * only entrance slot receives that exact numeric maximum so short windows scroll
 * instead of clipping an action below the fold.
 */
function SubscriptionOverlayFrame({ bloomColor, children, glass }: SubscriptionOverlayFrameProps) {
  const { contentMaxW, rawBottomInset } = useScreen();
  const keyboardBottomInset = useKeyboardBottomInset(Platform.OS === 'android');
  const androidKeyboardLift = Platform.OS === 'android'
    ? Math.max(0, keyboardBottomInset - rawBottomInset)
    : 0;
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);
  const panelMaxHeight = availableHeight === null
    ? null
    : Math.max(0, availableHeight - androidKeyboardLift);
  const handleViewportLayout = useCallback((event: LayoutChangeEvent) => {
    const next = Math.max(0, Math.floor(event.nativeEvent.layout.height));
    setAvailableHeight(current => current === next ? current : next);
  }, []);

  return (
    <View testID="manage-subscription-overlay" accessibilityViewIsModal style={S.sheetOverlay}>
      <View pointerEvents="none" style={S.sheetBackdrop} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={S.sheetAvoiding}
      >
        <View
          testID="manage-subscription-overlay-viewport"
          onLayout={handleViewportLayout}
          style={[S.sheetViewport, androidKeyboardLift > 0 ? { paddingBottom: androidKeyboardLift } : null]}
        >
          {panelMaxHeight !== null && panelMaxHeight > 0 ? (
            <FullscreenHybridEntrance
              visible
              bloomColor={bloomColor}
              style={[S.sheetEntrance, { maxWidth: contentMaxW }]}
              slots={[
                <View
                  key="subscription-overlay-panel"
                  testID="manage-subscription-overlay-panel"
                  style={[S.sheet, { backgroundColor: glass.opaqueSheet, maxHeight: panelMaxHeight }]}
                >
                  <LinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={S.sheetSheen} />
                  <View pointerEvents="none" style={[S.sheetTopHighlight, { backgroundColor: glass.glassEdge }]} />
                  <ScrollView
                    testID="manage-subscription-overlay-scroll"
                    style={S.sheetScroll}
                    contentContainerStyle={S.sheetContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false} decelerationRate="fast"
                  >
                    {children}
                  </ScrollView>
                </View>,
              ]}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

export default function ManageSubscription() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    plan?: string | string[];
    accountGeneration?: string | string[];
    source?: string | string[];
  }>();
  const closeFallback = String(params.source ?? '').startsWith('settings')
    ? '/(tabs)/settings'
    : undefined;
  const { lang } = useLang();
  const L = lang as Lang;
  const { fontSize, uiScale, liquidGlassThemeId } = useTheme();
  const glass = liquidGlassTokens(liquidGlassThemeId);
  const designScale = FONT_SCALE[fontSize] / FONT_SCALE.medium * uiScale;
  const scaled = useCallback((value: number) => Math.round(value * designScale), [designScale]);
  const LP = (
    ru: string,
    uk: string,
    en: string,
    es: string,
    ptBR: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(L, { ru, uk, en, es, 'pt-BR': ptBR, vi, id, tr, pl });

  // зачем (аудит инстант-открытия 2026-07-25): раньше fallbackPlan/loading стартовали
  // "пустыми" и модалка ждала initRevenueCat()+getCustomerInfo()+AsyncStorage — юзер видел
  // скелетон, хотя кнопка "Plus активирован" в settings.tsx уже ЗНАЛА premiumPlan синхронно
  // (иначе она не могла бы показать этот лейбл). Теперь читаем ?plan= из параметров роута
  // (см. settings.tsx plusRowPress + paywall_navigation.ts форвардинг) и от него же решаем
  // loading=false с первого кадра — контент рендерится сразу, RevenueCat лишь дотягивает
  // точную дату списания/цену в фоне и не блокирует первый рендер.
  const [screenAccount, setScreenAccount] = useState<AccountGenerationToken>(() => captureAccountGeneration());
  const routeGeneration = Number(
    Array.isArray(params.accountGeneration) ? params.accountGeneration[0] : params.accountGeneration,
  );
  const routeParamPlan = !!screenAccount.stableId
    && Number.isInteger(routeGeneration)
    && routeGeneration === screenAccount.generation
    ? normalizeStoredPremiumPlan(Array.isArray(params.plan) ? params.plan[0] : params.plan)
    : null;
  const [info, setInfo] = useState<CustomerInfo | null>(null);
  // зачем (PM-214 «мгновенное открытие», координатор 13.10): план не пришёл маршрутом (dev-хаб, manage=1 без плана, ранний тап до гидрации
  // Настроек) — первый кадр берёт его из памяти процесса (premium_plan_peek), а не ждёт AsyncStorage + RevenueCat за скелетом. Пусто — прежний скелет.
  // Без нового хука: порядок useState прежний (сторожа экрана сеют состояние по индексу).
  const [fallbackPlan, setFallbackPlan] = useState<PremiumStorePlan | null>(() => firstFramePremiumPlan(routeParamPlan));
  // зачем (Авторизация 12.10, paywalls-020): dev `manage=loading` держит скелетон с первого кадра, даже если план пришёл в маршруте.
  const [loading, setLoading] = useState(() => (routeParamPlan === null && peekPremiumPlan() === null) || isDevManageLoadingHold());
  const [yearlyPriceStr, setYearlyPriceStr] = useState('');
  // зачем (владелец 11.10: «цены должны показываться все равно, везде»; Ядро a0a910e9d): живая цена магазина → последняя настоящая из кэша → справочная
  // (с «≈»). Смена плана идёт по живому пакету магазина — справочная в покупку не уходит; это только подпись на карточке.
  const yearlyCachedPrice = peekPaywallPriceCache()?.yearly?.price ?? '';
  const yearlyShown = yearlyPriceStr || yearlyCachedPrice || `≈ ${resolvePaywallReferencePrices(lang).yearly}`;
  const [yearlyPkg, setYearlyPkg] = useState<import('react-native-purchases').PurchasesPackage | null>(null);
  const [changing, setChanging] = useState(false);
  // зачем: восстановление покупок — отдельное состояние от смены плана, иначе
  // одна операция гасила бы кнопку другой и человек не понимал бы, что занято.
  const [restoring, setRestoring] = useState(false);
  const restoringRef = useRef(false);
  const restoreRunRef = useRef(0); // зачем (потолок 15.10): номер запуска «Восстановить» — поздний finally старого запуска не снимает замок нового
  const [showRestoreEmpty, setShowRestoreEmpty] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelText, setCancelText] = useState('');
  // зачем (аудит 2026-08-24): шаг удержания живёт ВНУТРИ того же шита, а не
  // вторым модальным окном поверх первого — модалка над модалкой на телефоне
  // читается как ловушка и мешает уйти. 'reasons' → 'offer' → стор.
  const [cancelStep, setCancelStep] = useState<'reasons' | 'offer'>('reasons');
  const [saveOffer, setSaveOffer] = useState<SaveOfferKind>('none');
  const [offerProgress, setOfferProgress] = useState<SaveOfferProgress | null>(null);
  // зачем (2026-08-24): шит закрывается синхронно, но кадр с кнопкой ещё живёт —
  // быстрый двойной тап успевал вызвать router.push дважды и открыть экран
  // обращения двумя слоями. Ref, а не state: не требует перерисовки и не
  // проигрывает гонку внутри одного кадра.
  const saveOfferBusyRef = useRef(false);
  const screenAccountRef = useRef(screenAccount);

  useEffect(() => {
    const acceptAccount = (next: AccountGenerationToken) => {
      const previous = screenAccountRef.current;
      if (
        next.generation === previous.generation
        && next.stableId === previous.stableId
        && next.phase === previous.phase
      ) return;
      screenAccountRef.current = next;
      setInfo(null);
      setFallbackPlan(null);
      setLoading(true);
      setYearlyPkg(null);
      setYearlyPriceStr('');
      setChanging(false);
      setShowCancelSheet(false);
      setCancelReason(null);
      setCancelText('');
      // зачем: шаг удержания и прогресс тоже принадлежат прошлому аккаунту —
      // без сброса новый владелец устройства увидел бы чужие стрик/уроки/опыт
      // (класс бага «чужие пиксели после смены аккаунта»).
      setCancelStep('reasons');
      setSaveOffer('none');
      setOfferProgress(null);
      // Иначе взведённый тапом замок пережил бы смену аккаунта и новый владелец
      // не смог бы нажать ни одну кнопку удержания.
      saveOfferBusyRef.current = false;
      setScreenAccount(next);
    };
    acceptAccount(captureAccountGeneration());
    const subscription = subscribeAccountGeneration(acceptAccount);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    let dead = false;
    const generation = screenAccount;
    const isBootstrapCurrent = () => (
      !dead
      && !!generation.stableId
      && isCurrentAccountGeneration(generation, generation.stableId)
    );
    void (async () => {
      // зачем (Авторизация 12.10, paywalls-020 = profile-019): dev `manage=loading` — загрузку не начинаем, скелетон остаётся
      // (ранний выход стоит ДО try, чтобы finally не погасил его). В стор-сборке геттер всегда false.
      if (isDevManageLoadingHold()) {
        console.warn('[DEV-STATE] manage_subscription: загрузка удержана (manage=loading) — скелетон остаётся'); // guard-ok: dev-ветка
        return;
      }
      try {
        // Локальный AsyncStorage-кэш (записан persistStorePremiumLocally при покупке/смене
        // плана) читаем ПЕРВЫМ и отдельно от RevenueCat — он не требует сети и обычно уже
        // точнее route-параметра (знает lifetime/expiry), поэтому обновляет fallbackPlan
        // ещё до того, как достучимся до RevenueCat.
        const localPairs = await AsyncStorage.multiGet(['premium_plan', 'premium_rc_product_id']);
        // зачем (координатор 12.10, R1 «нет пути»): dev `plan=yearly|monthly|lifetime` — план из памяти процесса, хранилище и облако не трогаем; в стор-сборке null.
        const devPlan = getDevPlanOverride();
        const storedPlan = devPlan ? devPlan.plan : localPairs.find(p => p[0] === 'premium_plan')?.[1];
        const storedProductId = devPlan ? '' : localPairs.find(p => p[0] === 'premium_rc_product_id')?.[1];
        const nextFallbackPlan = localPremiumPlan(storedProductId, storedPlan);
        if (!devPlan) rememberPremiumPlan(storedPlan, storedProductId ?? null, 'manage_local');
        if (isBootstrapCurrent() && nextFallbackPlan) {
          setFallbackPlan(nextFallbackPlan);
          setLoading(false);
        }

        await initRevenueCat(isBootstrapCurrent);
        if (!isBootstrapCurrent()) return;
        if (!await syncRevenueCatIdentity(isBootstrapCurrent)) return;
        const ci = await readRevenueCatCustomerInfoForGeneration(generation);
        if (!ci || !isBootstrapCurrent()) return;
        setInfo(ci);

        const o = await Purchases.getOfferings();
        const pkgs = resolvePremiumPackages(o.current?.availablePackages ?? []);
        if (isBootstrapCurrent() && pkgs.yearly) {
          setYearlyPkg(pkgs.yearly);
          setYearlyPriceStr(storePriceTrim(pkgs.yearly.product?.priceString));
        }
      } catch (e) {
      // данных нет — покажем минимум
      DebugLogger.error('manage_subscription:pkgs', e instanceof Error ? e : new Error(String(e)), 'warning');
    }
      finally { if (isBootstrapCurrent()) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [screenAccount]);

  const devPlanForMetadata = getDevPlanOverride();
  // зачем (бэклог №18, profile-024 / paywalls-022): у эмулятора RevenueCat отвечает пустой подпиской без даты — dev-план с датой (plan=…,
  // planUntil=…) проигрывал ответу магазина, и строки «Следующее списание» не было. Dev-подмена важнее; в сторе getDevPlanOverride() = null.
  const metadata = devPlanForMetadata?.expiryMs
    ? { expiryMs: devPlanForMetadata.expiryMs }
    : info ? revenueCatPremiumMetadata(info) : {};
  const currentPlan = inferPremiumPlanFromCustomerInfo(info, fallbackPlan);
  const nextDate = formatDate(metadata.expiryMs ?? null, L);
  const isLifetime = currentPlan === 'lifetime';
  const isMonthly = currentPlan === 'monthly';

  const planLabel = isLifetime
    ? 'Phraseman Pro'
    : currentPlan === 'yearly'
      ? LP('Годовая подписка', 'Річна підписка', 'Annual subscription', 'Suscripción anual', 'Assinatura anual', 'Gói năm', 'Langganan tahunan', 'Yıllık abonelik', 'Subskrypcja roczna')
      : currentPlan === 'monthly'
        ? LP('Месячная подписка', 'Місячна підписка', 'Monthly subscription', 'Suscripción mensual', 'Assinatura mensal', 'Gói tháng', 'Langganan bulanan', 'Aylık abonelik', 'Subskrypcja miesięczna')
        : LP('Подписка Plus', 'Підписка Plus', 'Plus subscription', 'Suscripción Plus', 'Assinatura Plus', 'Gói Plus', 'Langganan Plus', 'Plus aboneliği', 'Subskrypcja Plus');

  // ── смена плана: месячный → годовой (DEFERRED-проплейшн на Android) ──────────
  const handleChangePlan = useCallback(async () => {
    if (changing || !yearlyPkg) return;
    const generation = captureAccountGeneration();
    const isOperationCurrent = () => (
      !!generation.stableId && isCurrentAccountGeneration(generation, generation.stableId)
    );
    if (!isOperationCurrent()) return;
    hapticTap();
    void logChangePlanStarted('monthly', 'yearly');
    void trackEvent('change_plan_started', { from: 'monthly', to: 'yearly' });
    setChanging(true);
    try {
      const result = await changeManageSubscriptionPlanForGeneration({
        generation,
        yearlyPackage: yearlyPkg,
        currentProductId: metadata.productId,
        fallbackPlan,
      });
      if (!isOperationCurrent() || result.status === 'stale') return;
      setInfo(result.customerInfo);
      if (result.status === 'unknown') {
        void trackEvent('change_plan_failed', { from: 'monthly', to: 'yearly', error: 'active_plan_unknown' });
        // зачем (аудит 2026-08-26): раньше здесь был молчаливый return — человек жал
        // «Сменить план», спиннер гас, и НИЧЕГО не происходило без объяснения. Экран
        // не имел вообще ни одного способа сообщить об ошибке, хотя это денежный путь.
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не удалось подтвердить смену плана. Проверь подписку в магазине.',
          messageUk: 'Не вдалося підтвердити зміну плану. Перевір передплату в магазині.',
          messageEn: "Couldn't confirm the plan change. Check your subscription in the store.",
          messageEs: 'No se pudo confirmar el cambio de plan. Revisa tu suscripción en la tienda.',
          messagePtBr: 'Não foi possível confirmar a troca de plano. Verifique a assinatura na loja.',
          messageVi: 'Không xác nhận được việc đổi gói. Hãy kiểm tra gói đăng ký trong cửa hàng.',
          messageId: 'Perubahan paket tidak dapat dikonfirmasi. Cek langgananmu di toko.',
          messageTr: 'Plan değişikliği doğrulanamadı. Aboneliğini mağazadan kontrol et.',
          messagePl: 'Nie udało się potwierdzić zmiany planu. Sprawdź subskrypcję w sklepie.',
        });
        return;
      }
      invalidatePremiumCache();
      emitAppEvent('premium_activated');
      void trackEvent('change_plan_completed', { from: 'monthly', to: result.plan });
    } catch (err: unknown) {
      if (!(err as { userCancelled?: boolean })?.userCancelled) {
        void trackEvent('change_plan_failed', { from: 'monthly', to: 'yearly' });
        // зачем (аудит 2026-08-26): сбой платного действия уходил ТОЛЬКО в аналитику —
        // ни пользователю, ни в логи. Причина терялась навсегда, разобрать было нечем.
        void import('./debug-logger')
          .then(({ DebugLogger }) => DebugLogger.error('manage_subscription.tsx:changePlan', err, 'critical'))
          .catch(noteSwallowedHandler('manage_subscription:useCallback.call'));
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Смена плана не прошла. Деньги не списаны — попробуй ещё раз.',
          messageUk: 'Зміна плану не пройшла. Кошти не списані — спробуй ще раз.',
          messageEn: "The plan change didn't go through. You weren't charged — try again.",
          messageEs: 'El cambio de plan no se completó. No se cobró nada: inténtalo de nuevo.',
          messagePtBr: 'A troca de plano não foi concluída. Nada foi cobrado — tente de novo.',
          messageVi: 'Đổi gói chưa hoàn tất. Bạn chưa bị trừ tiền — hãy thử lại.',
          messageId: 'Perubahan paket gagal. Tidak ada biaya yang ditarik — coba lagi.',
          messageTr: 'Plan değişikliği tamamlanmadı. Ücret alınmadı — tekrar dene.',
          messagePl: 'Zmiana planu nie powiodła się. Nic nie pobrano — spróbuj ponownie.',
        });
      }
    } finally {
      if (isManageSubscriptionOperationCurrent(generation)) setChanging(false);
    }
  }, [changing, yearlyPkg, metadata.productId, fallbackPlan]);

  // ── восстановление покупок ──────────────────────────────────────────────────
  // зачем (аудит 2026-09-21, одобрено владельцем): RevenueCat был подключён, но
  // `restorePurchases()` не вызывался НИ ОДНОЙ кнопкой в интерфейсе. Человек,
  // сменивший телефон или переустановивший приложение, терял Plus и мог вернуть
  // его только через поддержку. Это ещё и требование гайдлайнов Apple для
  // приложений с подпиской — без такой кнопки ревью вправе отклонить сборку.
  //
  // Ряд живёт ЗДЕСЬ, на экране Plus, а не в общих настройках (решение владельца).
  // Виден всегда, в том числе без активной подписки: именно без неё он и нужен.
  const handleRestore = useCallback(async () => {
    // зачем: замок от двойного тапа в одном кадре — state `restoring` обновится только после рендера,
    // второй тап успел бы запустить второе восстановление; ref меняется синхронно.
    if (restoring || restoringRef.current) {
      // guard-ok: ранний выход обязан объяснять причину навсегда — иначе
      // «кнопка не работает», а она просто занята предыдущей попыткой.
      console.warn('[RESTORE] ignored:already_running');
      return;
    }
    // Генерация аккаунта — как в handleChangePlan: поздний ответ чужой
    // генерации не должен включать Plus уже ДРУГОМУ человеку на этом телефоне
    // (класс бага «подмена stable_id», инцидент 25.08).
    const generation = captureAccountGeneration();
    const isOperationCurrent = () => (
      !!generation.stableId && isCurrentAccountGeneration(generation, generation.stableId)
    );
    if (!isOperationCurrent()) {
      console.warn('[RESTORE] ignored:stale_generation'); // guard-ok
      return;
    }
    // зачем (Авторизация 13.10, profile-024/paywalls-022): dev `restorepurchase=empty` — «Покупок не нашлось» без магазина; в сторе геттер выключен
    if (isDevRestorePurchaseEmpty()) {
      console.log('[RESTORE] [DEV-STATE] restorepurchase=empty — магазин не вызывается, показываем «Покупок не нашлось»'); // guard-ok: dev-ветка
      hapticTap();
      setShowRestoreEmpty(true);
      return;
    }
    hapticTap();
    void trackEvent('restore_purchases_started');
    restoringRef.current = true;
    setRestoring(true);
    const startedAt = Date.now();
    // зачем (решение координатора 15.10, бета-тест А4): без потолка крутилка «Восстановить» могла висеть вечно, если магазин не отвечает. Через RESTORE_CEILING_MS снимаем замок и спиннер и говорим «Не удалось связаться
    // с магазином»; сам запрос не отменяем — если он всё же завершится успехом, Plus применится как обычно (деньги не теряем). Номер запуска: поздний `finally` старого запуска не снимает замок нового.
    const runId = ++restoreRunRef.current;
    const ceilingTimer = setTimeout(() => {
      if (restoreRunRef.current !== runId || !restoringRef.current) return;
      console.warn(`[RESTORE] ceiling:${RESTORE_CEILING_MS}ms магазин не ответил — снимаем крутилку, тост «не удалось связаться» (запрос не отменяем)`); // guard-ok: ветка решения называет значение
      restoringRef.current = false;
      if (isOperationCurrent()) setRestoring(false);
      emitAppEvent('action_toast', storeUnreachableToast());
    }, RESTORE_CEILING_MS);
    try {
      await initRevenueCat(isOperationCurrent);
      if (!await syncRevenueCatIdentity(isOperationCurrent)) {
        // зачем (бета-тест А4, 15.10): без связи с магазином кнопка «Восстановить» раньше просто переставала крутиться — человек не понимал, что произошло. Устаревшая операция (смена аккаунта) по-прежнему молчит.
        const stillCurrent = isOperationCurrent();
        console.warn(`[RESTORE] drop:identity_sync_failed stillCurrent=${stillCurrent} → ${stillCurrent ? 'тост «не удалось связаться с магазином»' : 'тишина (операция устарела)'}`); // guard-ok
        if (stillCurrent) emitAppEvent('action_toast', storeUnreachableToast());
        return;
      }
      // AA S2d раунд 3: метка потока покупки — фоновый перенос Plus в это время ждёт.
      const restored = await withPurchaseFlow('manage_subscription_restore', () => Purchases.restorePurchases());
      if (!isOperationCurrent()) {
        console.warn('[RESTORE] drop:stale_after_network'); // guard-ok
        return;
      }
      // Источник истины по «есть ли Plus» — общий помощник, а не своя проверка:
      // вторая реализация этой логики неизбежно разойдётся с первой.
      const hasPremium = revenueCatCustomerInfoHasPremiumAccess(restored);
      const meta = revenueCatPremiumMetadata(restored);
      console.log('[RESTORE] done', JSON.stringify({ // guard-ok: денежный путь, лог остаётся
        hasPremium,
        productId: meta.productId ?? null,
        ms: Date.now() - startedAt,
      }));
      if (!hasPremium) {
        void trackEvent('restore_purchases_empty');
        setShowRestoreEmpty(true);
        return;
      }
      // Optimistic: экран показывает Plus сразу, кэш сбрасывается, остальные
      // экраны узнают через событие — без перезапуска приложения.
      setInfo(restored);
      invalidatePremiumCache();
      emitAppEvent('premium_activated');
      void trackEvent('restore_purchases_completed', { product_id: meta.productId ?? 'unknown' });
      emitAppEvent('action_toast', {
        type: 'reward',
        messageRu: 'Plus вернулся — подписка снова активна.',
        messageUk: 'Plus повернувся — передплата знову активна.',
        messageEn: 'Plus is back — your subscription is active again.',
        messageEs: 'Plus ha vuelto: tu suscripción está activa de nuevo.',
        messagePtBr: 'O Plus voltou — sua assinatura está ativa de novo.',
        messageVi: 'Plus đã trở lại — gói đăng ký của bạn lại hoạt động.',
        messageId: 'Plus kembali — langgananmu aktif lagi.',
        messageTr: 'Plus geri döndü — aboneliğin yeniden aktif.',
        messagePl: 'Plus wrócił — subskrypcja znów jest aktywna.',
      });
    } catch (err: unknown) {
      if ((err as { userCancelled?: boolean })?.userCancelled) {
        console.warn('[RESTORE] cancelled_by_user'); // guard-ok
        return;
      }
      void trackEvent('restore_purchases_failed');
      // Причина сбоя денежного пути обязана переживать перезапуск.
      void import('./debug-logger')
        .then(({ DebugLogger }) => DebugLogger.error('manage_subscription.tsx:restore', err, 'critical'))
        .catch(noteSwallowedHandler('manage_subscription:useCallback.call_2'));
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Сейчас не удалось проверить покупки. Попробуй ещё раз.',
        messageUk: 'Зараз не вдалося перевірити покупки. Спробуй ще раз.',
        messageEn: "Couldn't check your purchases right now. Try again.",
        messageEs: 'Ahora no se pudieron comprobar las compras. Inténtalo de nuevo.',
        messagePtBr: 'Não deu para verificar as compras agora. Tente de novo.',
        messageVi: 'Lúc này chưa kiểm tra được giao dịch. Hãy thử lại.',
        messageId: 'Pembelian belum bisa diperiksa sekarang. Coba lagi.',
        messageTr: 'Satın alımlar şu an kontrol edilemedi. Tekrar dene.',
        messagePl: 'Teraz nie udało się sprawdzić zakupów. Spróbuj ponownie.',
        // зачем: повтор прямо в тосте. Без него человек должен сам найти
        // экран и ряд заново — а сообщение о сбое уже может висеть поверх
        // другого экрана. `void` — onPress синхронный, ждать его некому.
        action: {
          labelRu: 'Повторить',
          labelUk: 'Повторити',
          labelEn: 'Retry',
          labelEs: 'Reintentar',
          labelPtBr: 'Tentar de novo',
          labelVi: 'Thử lại',
          labelId: 'Coba lagi',
          labelTr: 'Tekrar dene',
          labelPl: 'Ponów',
          onPress: () => { void handleRestoreRef.current?.(); },
        },
      });
    } finally {
      clearTimeout(ceilingTimer);
      // зачем: ref снимаем всегда (откат замка), state — только своей генерации аккаунта; если за это время стартовал более новый запуск — его замок не трогаем.
      if (restoreRunRef.current === runId) {
        restoringRef.current = false;
        if (isOperationCurrent()) setRestoring(false);
      }
    }
  }, [restoring]);

  // зачем: кнопка «Повторить» в тосте должна звать АКТУАЛЬНУЮ версию обработчика.
  // Прямая ссылка внутри самого обработчика дала бы циклическую зависимость
  // useCallback → пересоздание на каждый рендер; ref разрывает цикл и всегда
  // указывает на свежую замкнутую версию.
  const handleRestoreRef = useRef<(() => Promise<void>) | null>(null);
  handleRestoreRef.current = handleRestore;

  const closeCancelSheet = useCallback(() => {
    setShowCancelSheet(false);
    setCancelStep('reasons');
    setSaveOffer('none');
    setOfferProgress(null);
  }, []);

  /** Уход в системный экран отмены — единственная точка выхода в стор. */
  const openStoreCancel = useCallback(() => {
    // зачем (аудит 2026-08-26): раньше шторка закрывалась ДО открытия ссылки, а отказ
    // глушился `.catch(() => {})`. Это единственный путь к отмене подписки: если
    // магазин не открылся, человек оставался в тупике без единого объяснения.
    void Linking.openURL(getStoreManageUrl())
      .then(() => { closeCancelSheet(); })
      .catch((err: unknown) => {
        void import('./debug-logger')
          .then(({ DebugLogger }) => DebugLogger.error('manage_subscription.tsx:openStoreCancel', err, 'critical'))
          .catch(noteSwallowedHandler('manage_subscription:useCallback.call_3'));
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Не удалось открыть магазин. Отмени подписку в настройках телефона.',
          messageUk: 'Не вдалося відкрити магазин. Скасуй передплату в налаштуваннях телефона.',
          messageEn: "Couldn't open the store. Cancel the subscription in your phone settings.",
          messageEs: 'No se pudo abrir la tienda. Cancela la suscripción en los ajustes del teléfono.',
          messagePtBr: 'Não foi possível abrir a loja. Cancele a assinatura nos ajustes do telefone.',
          messageVi: 'Không mở được cửa hàng. Hãy huỷ gói trong cài đặt điện thoại.',
          messageId: 'Toko tidak dapat dibuka. Batalkan langganan di pengaturan ponsel.',
          messageTr: 'Mağaza açılamadı. Aboneliği telefon ayarlarından iptal et.',
          messagePl: 'Nie udało się otworzyć sklepu. Anuluj subskrypcję w ustawieniach telefonu.',
        });
      });
  }, [closeCancelSheet]);

  // ── отмена: опрос → удержание → стор ────────────────────────────────────────
  // зачем (аудит 2026-08-24): опрос причины уже собирался, но никак не влиял на
  // происходящее — человека сразу отпускали в магазин. Теперь причина решает,
  // что показать. Нечего показать → ведём в магазин ровно как раньше.
  const submitCancel = useCallback(() => {
    if (!isManageSubscriptionOperationCurrent(screenAccount)) {
      closeCancelSheet();
      setCancelReason(null);
      setCancelText('');
      return;
    }
    hapticTap();
    logCancelSurvey(cancelReason ?? 'unknown', cancelText, 'manage');
    void trackEvent('subscription_cancel_survey', { reason: cancelReason ?? 'unknown' });

    // Прогресс берём из уже прогретого снапшота главной: 0 чтений Firestore и
    // мгновенный рендер. peek сам вернёт null после смены аккаунта, поэтому
    // чужие цифры показаться не могут.
    const hydration = peekHomeScreenHydration();
    // зачем (profile-022 / paywalls-024, dev): подмена прогресса из ссылки dev_state?offerProgress=on — шаг робота останавливается на шторке удержания, а не уходит в браузер магазина
    const progress: SaveOfferProgress | null = getDevSaveOfferProgress() ?? (hydration
      ? {
          streak: hydration.displayStreak || hydration.streak || 0,
          lessonsCompleted: hydration.lessonsCompleted || 0,
        }
      : null);
    const offer = resolveSaveOffer({ reason: cancelReason, progress });

    if (offer === 'none') {
      void trackEvent('cancel_save_offer_skipped', { reason: cancelReason ?? 'unknown' });
      openStoreCancel();
      return;
    }
    void trackEvent('cancel_save_offer_shown', { reason: cancelReason ?? 'unknown', offer });
    // Замок снимаем ровно тогда, когда показываем шаг: следующий заход в отмену
    // (человек вернулся на экран) обязан снова работать.
    saveOfferBusyRef.current = false;
    setOfferProgress(progress);
    setSaveOffer(offer);
    setCancelStep('offer');
  }, [cancelReason, cancelText, screenAccount, closeCancelSheet, openStoreCancel]);

  // зачем (координатор 13.10, dev `saveOffer=progress|support`): шаг удержания сразу, без тапов — кадры paywalls-024 / profile-022.
  // В стор-сборке takeDevSaveOfferOpen — заглушка (null), эффект ничего не делает.
  useEffect(() => {
    const devStep = takeDevSaveOfferOpen();
    if (!devStep) return;
    const progress = getDevSaveOfferProgress() ?? DEV_SAVE_OFFER_PROGRESS;
    console.log(`[DEV-STATE] manage_subscription: шаг удержания открыт подменой saveOffer=${devStep} серия=${progress.streak} уроков=${progress.lessonsCompleted}`); // guard-ok: dev-ветка
    setCancelReason(devStep === 'progress' ? 'too_expensive' : 'technical');
    setOfferProgress(devStep === 'progress' ? progress : null);
    setSaveOffer(devStep);
    setCancelStep('offer');
    setShowCancelSheet(true);
  }, []);

  /** Человек остаётся. Никаких тарифов и сумм — только продукт и поддержка. */
  const acceptSaveOffer = useCallback(() => {
    if (saveOfferBusyRef.current) return;
    saveOfferBusyRef.current = true;
    hapticTap();
    void trackEvent('cancel_save_offer_accepted', { reason: cancelReason ?? 'unknown', offer: saveOffer });
    if (saveOffer === 'support') {
      // зачем: PM-171 — раздел «Идеи» скрыт, редирект «поддержки» из шага удержания
      // теперь ведёт в реальную поддержку, а не в удалённый экран идей.
      closeCancelSheet();
      router.push('/support_report');
      return;
    }
    closeCancelSheet();
  }, [saveOffer, cancelReason, closeCancelSheet, router]);

  /** Отказ от удержания — уход в магазин остаётся живым и одним тапом. */
  const declineSaveOffer = useCallback(() => {
    if (saveOfferBusyRef.current) return;
    saveOfferBusyRef.current = true;
    hapticTap();
    void trackEvent('cancel_save_offer_declined', { reason: cancelReason ?? 'unknown', offer: saveOffer });
    openStoreCancel();
  }, [saveOffer, cancelReason, openStoreCancel]);

  const overlayActive = showCancelSheet || showRestoreEmpty;

  // зачем (координатор 15.10, Макеты ed4f4a6ff): «Plus активирован» — только при доступе. Нет доступа — обычный пейвол (источник notification_premium_expiry), доступ неизвестен — тихий скелетон.
  const { hasPremiumAccess, accessResolved } = usePremium();
  const manageGate = decideManageAccess({ hasPremiumAccess, accessResolved, routePlanKnown: routeParamPlan !== null, devPlanOverride: getDevPlanOverride() !== null });
  const manageSource = Array.isArray(params.source) ? (params.source[0] ?? '') : (params.source ?? '');
  const manageRedirectedRef = useRef(false);
  useEffect(() => {
    console.log(`[PLUS-MANAGE] решение=${manageGate.decision} причина=${manageGate.reason} доступ=${String(hasPremiumAccess)} выяснен=${String(accessResolved)} планИзМаршрута=${String(routeParamPlan)} источник=${manageSource || 'нет'}`); // guard-ok: журнал решения экрана «Подписка Plus»
    if (manageGate.decision !== 'paywall') return;
    if (manageRedirectedRef.current) { console.log('[PLUS-MANAGE] переход на пейвол уже выполнен'); return; } // guard-ok: ранний выход с причиной
    manageRedirectedRef.current = true;
    console.log(`[PLUS-MANAGE] нет подписки → пейвол context=${MANAGE_NO_ACCESS_PAYWALL.params.context} source=${MANAGE_NO_ACCESS_PAYWALL.params.source}`); // guard-ok: ветка перехода
    router.replace({ pathname: MANAGE_NO_ACCESS_PAYWALL.pathname, params: { ...MANAGE_NO_ACCESS_PAYWALL.params } } as never);
  }, [manageGate.decision, manageGate.reason, hasPremiumAccess, accessResolved, routeParamPlan, manageSource, router]);

  if (manageGate.decision !== 'show') {
    // зачем: ни «активирован», ни спиннера — тихие плашки на месте карточки статуса (первый кадр без мигания, высота как у настоящей карточки)
    return (
      <LinearGradient colors={[glass.bgTop, glass.bgBottom]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={S.root}>
        <SafeAreaView style={S.safe}>
          <View testID="manage-subscription-access-skeleton" style={S.safeContent} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <View style={[S.statusCard, { backgroundColor: glass.opaqueCard, minHeight: 132 }]}>
              <View style={{ width: '38%', height: 14, borderRadius: 7, backgroundColor: glass.buttonFillDisabled }} />
              <View style={{ width: '62%', height: 24, borderRadius: 12, backgroundColor: glass.buttonFillDisabled, marginTop: 14 }} />
              <View style={{ width: '48%', height: 14, borderRadius: 7, backgroundColor: glass.buttonFillDisabled, marginTop: 18 }} />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[glass.bgTop, glass.bgBottom]} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={S.root}>
      <SafeAreaView style={S.safe}>
        <View testID="manage-subscription-safe-content" style={S.safeContent}>
        <View
          testID="manage-subscription-host"
          style={S.host}
          accessibilityElementsHidden={overlayActive}
          importantForAccessibility={overlayActive ? 'no-hide-descendants' : 'auto'}
        >
          <ContentWrap>
            <ScrollView decelerationRate="fast" showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
            <PressableHybrid
              testID="manage-subscription-close"
              accessibilityRole="button"
              accessibilityLabel={LP('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
              onPress={() => { hapticTap(); safeRouterBack(router, closeFallback); }}
              withHaptic={false}
              withSound={false}
              variant="icon"
              style={S.closeHit}
              contentStyle={[S.closeFace, { backgroundColor: glass.opaqueControl }]}
            >
              {/* зачем: паритет с макетом profile.html PRF-10 — «назад» шевроном */}
              <BackGlyph size={22} color={glass.lightTint} />
            </PressableHybrid>

            <Text testID="manage-subscription-title" style={[S.screenTitle, { color: glass.text, fontSize: scaled(34), lineHeight: scaled(40) }]}>
              {/* зачем (LANG_AUDIT_AUTH_R1, владелец 13.10 «интерфейс на других языках»): русский заголовок сменили на «Подписка Plus»
                  по макету PRF-10, а 8 языков остались «Управление подпиской» — теперь та же строка, что у пункта в Настройках. */}
              {LP('Подписка Plus', 'Підписка Plus', 'Plus subscription', 'Suscripción Plus', 'Assinatura Plus', 'Gói Plus', 'Langganan Plus', 'Plus aboneliği', 'Subskrypcja Plus')}
            </Text>

            <View testID="manage-subscription-status-card" style={[S.statusCard, { backgroundColor: glass.opaqueCard }]}>
              <LinearGradient pointerEvents="none" colors={[glass.selected, 'transparent']} style={S.cardSheen} />
              <View pointerEvents="none" style={[S.cardRim, { backgroundColor: glass.glassEdge }]} />
              <View style={S.statusRow}>
                <Ionicons name="checkmark-circle" size={18} color={glass.lightTint} />
                <Text style={[S.statusText, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(20) }]}>
                  {LP('Plus активирован', 'Plus активовано', 'Plus activated', 'Plus activado', 'Plus ativado', 'Plus đã kích hoạt', 'Plus aktif', 'Plus etkinleştirildi', 'Plus aktywowany')}
                </Text>
              </View>
              <Text style={[S.planTitle, { color: glass.text, fontSize: scaled(24), lineHeight: scaled(30) }]}>{planLabel}</Text>
              {!loading && !isLifetime && nextDate && (
                <View style={S.infoRow}>
                  <Text style={[S.infoLabel, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(20) }]}>
                    {LP('Следующее списание', 'Наступне списання', 'Next charge', 'Próximo cobro', 'Próxima cobrança', 'Lần thanh toán tiếp theo', 'Tagihan berikutnya', 'Sonraki ödeme', 'Następna płatność')}
                  </Text>
                  <Text style={[S.infoValue, { color: glass.text, fontSize: scaled(15), lineHeight: scaled(20) }]}>{nextDate}</Text>
                </View>
              )}
              {!loading && isLifetime && (
                <Text style={[S.lifetimeNote, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(20) }]}>
                  {LP('Разовая покупка — без списаний и автопродления.', 'Разова покупка — без списань і автопродовження.', 'One-time purchase — no charges or auto-renewal.', 'Compra única, sin cobros ni renovación.', 'Compra única, sem cobranças nem renovação automática.', 'Mua một lần, không thu phí và không tự gia hạn.', 'Pembelian sekali, tanpa tagihan dan perpanjangan otomatis.', 'Tek seferlik satın alma, ödeme ve otomatik yenileme yok.', 'Jednorazowy zakup, bez opłat i automatycznego odnawiania.')}
                </Text>
              )}
            </View>

            {loading ? (
              <View testID="manage-subscription-loading" style={S.loading}>
                <SkeletonBlock width="100%" height={64} borderRadius={14} />
                <SkeletonBlock width="100%" height={64} borderRadius={14} />
                <SkeletonBlock width="70%" height={48} borderRadius={14} />
              </View>
            ) : (
              <>
                <Text style={[S.sectionTitle, { color: glass.secondary, fontSize: scaled(11), lineHeight: scaled(16) }]}>
                  {LP('ЧТО ВКЛЮЧЕНО', 'ЩО ВКЛЮЧЕНО', 'WHAT\'S INCLUDED', 'QUÉ INCLUYE', 'O QUE INCLUI', 'BAO GỒM', 'YANG TERMASUK', 'NELER DAHİL', 'CO ZAWIERA')}
                </Text>
                <View style={S.benefitList}>
                  {INCLUDED.map((benefit) => (
                    <View
                      key={benefit.benefitId}
                      testID={`manage-subscription-benefit-${benefit.benefitId}`}
                      accessibilityRole="text"
                      style={[S.benefitRow, { backgroundColor: glass.opaqueControl }]}
                    >
                      <View style={[S.benefitIcon, { backgroundColor: glass.selected }]}>
                        <Ionicons name={benefit.icon} size={22} color={glass.lightTint} />
                      </View>
                      <Text style={[S.benefitText, { color: glass.text, fontSize: scaled(16), lineHeight: scaled(21) }]}>
                        {LP(benefit.ru, benefit.uk, benefit.en, benefit.es, benefit['pt-BR'], benefit.vi, benefit.id, benefit.tr, benefit.pl)}
                      </Text>
                      <Ionicons name="checkmark" size={20} color={glass.lightTint} />
                    </View>
                  ))}
                </View>

                {/* Карточка «Перейти на годовой» — только если сейчас месячный и годовой пакет есть. */}
                {isMonthly && yearlyPkg && (
                  <PressableHybrid
                    testID="manage-subscription-change-plan"
                    accessibilityRole="button"
                    accessibilityState={{ disabled: changing }}
                    onPress={handleChangePlan}
                    disabled={changing}
                    withHaptic={false}
                    withSound={false}
                    variant="card"
                    contentStyle={[S.changeCard, { backgroundColor: glass.opaqueCard }]}
                  >
                    <View style={S.actionCopy}>
                      <Text style={[S.changeTitle, { color: glass.text, fontSize: scaled(16), lineHeight: scaled(21) }]}>
                        {LP('Перейти на годовой план', 'Перейти на річний план', 'Switch to the annual plan', 'Cambiar al plan anual', 'Mudar para o plano anual', 'Chuyển sang gói năm', 'Beralih ke paket tahunan', 'Yıllık plana geç', 'Przejdź na plan roczny')}
                      </Text>
                      <Text style={[S.changeSub, { color: glass.secondary, fontSize: scaled(14), lineHeight: scaled(20) }]}>
                        {yearlyShown
                          ? LP(`Дешевле в пересчёте — ${yearlyShown}/год`, `Дешевше в перерахунку — ${yearlyShown}/рік`, `Cheaper per year — ${yearlyShown}/yr`, `Más barato al año — ${yearlyShown}/año`, `Mais barato no ano — ${yearlyShown}/ano`, `Rẻ hơn tính theo năm — ${yearlyShown}/năm`, `Lebih murah per tahun — ${yearlyShown}/tahun`, `Yıllık daha ucuz — ${yearlyShown}/yıl`, `Taniej rocznie — ${yearlyShown}/rok`)
                          : LP('Дешевле в пересчёте на месяц', 'Дешевше в перерахунку на місяць', 'Cheaper per month', 'Más barato por mes', 'Mais barato por mês', 'Rẻ hơn tính theo tháng', 'Lebih murah per bulan', 'Aylık hesapta daha ucuz', 'Taniej w przeliczeniu na miesiąc')}
                      </Text>
                    </View>
                    {changing
                      ? <ActivityIndicator color={glass.lightTint} />
                      : <Ionicons name="arrow-forward-circle" size={26} color={glass.lightTint} />}
                  </PressableHybrid>
                )}

                {/* Восстановить покупки — виден ВСЕГДА, в том числе без активной
                    подписки: именно без неё он и нужен (сменил телефон, переустановил).
                    Геометрия строки не меняется в busy — крутится только иконка,
                    текст остаётся на месте (без прыжка раскладки). */}
                <PressableHybrid
                  testID="manage-subscription-restore"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: restoring }}
                  accessibilityLabel={LP('Восстановить покупки', 'Відновити покупки', 'Restore purchases', 'Restaurar compras', 'Restaurar compras', 'Khôi phục giao dịch', 'Pulihkan pembelian', 'Satın alımları geri yükle', 'Przywróć zakupy')}
                  onPress={handleRestore}
                  disabled={restoring}
                  withHaptic={false}
                  withSound={false}
                  variant="card"
                  contentStyle={[S.restoreRow, { backgroundColor: glass.opaqueControl }]}
                >
                  <Ionicons name="refresh" size={20} color={glass.lightTint} />
                  <Text style={[S.restoreText, { color: glass.text, fontSize: scaled(16), lineHeight: scaled(21) }]}>
                    {LP('Восстановить покупки', 'Відновити покупки', 'Restore purchases', 'Restaurar compras', 'Restaurar compras', 'Khôi phục giao dịch', 'Pulihkan pembelian', 'Satın alımları geri yükle', 'Przywróć zakupy')}
                  </Text>
                  {restoring
                    ? <ActivityIndicator color={glass.lightTint} />
                    : <Ionicons name="chevron-forward" size={18} color={glass.secondary} />}
                </PressableHybrid>

                {/* Отмена — только для подписок (не lifetime). */}
                {!isLifetime && (
                  <PressableHybrid
                    testID="manage-subscription-cancel"
                    accessibilityRole="button"
                    accessibilityLabel={LP('Отменить подписку', 'Скасувати підписку', 'Cancel subscription', 'Cancelar suscripción', 'Cancelar assinatura', 'Hủy gói đăng ký', 'Batalkan langganan', 'Aboneliği iptal et', 'Anuluj subskrypcję')}
                    onPress={() => { hapticTap(); setShowCancelSheet(true); }}
                    withHaptic={false}
                    withSound={false}
                    variant="secondary"
                    contentStyle={[S.cancelBtn, { backgroundColor: glass.opaqueControl }]}
                  >
                    <Ionicons name="open-outline" size={19} color={glass.secondary} />
                    <Text style={[S.cancelText, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(20) }]}>
                      {/* зачем (profile-017, Макеты 13.10): кнопка ведёт к шагу причин, а не отменяет — тексты как у кнопки шага причин на всех языках */}
                      {LP('Перейти к отмене', 'Перейти до скасування', 'Continue to cancel', 'Ir a cancelar', 'Ir para o cancelamento', 'Đi tới hủy gói', 'Lanjut ke pembatalan', 'İptale git', 'Przejdź do anulowania')}
                    </Text>
                  </PressableHybrid>
                )}
                {/* зачем: паритет с макетом PRF-10 — короткая подпись под кнопками про источник цены */}
                <Text style={{ color: glass.secondary, fontSize: scaled(13), lineHeight: scaled(18), textAlign: 'center', marginTop: 16 }}>
                  {LP('Цена и период всегда берутся из App Store / Google Play.', 'Ціна й період завжди беруться з App Store / Google Play.', 'Price and period always come from the App Store / Google Play.', 'El precio y el período siempre vienen del App Store / Google Play.', 'Preço e período sempre vêm da App Store / Google Play.', 'Giá và thời hạn luôn lấy từ App Store / Google Play.', 'Harga dan periode selalu berasal dari App Store / Google Play.', 'Fiyat ve süre her zaman App Store / Google Play’den gelir.', 'Cena i okres zawsze pochodzą z App Store / Google Play.')}
                </Text>
              </>
            )}
            </ScrollView>
          </ContentWrap>
        </View>

        {/* ── шит-опрос отмены ── */}
        {showCancelSheet && cancelStep === 'reasons' && (
          <SubscriptionOverlayFrame bloomColor={glass.selected} glass={glass}>
              <Text style={[S.sheetTitle, { color: glass.text, fontSize: scaled(22), lineHeight: scaled(28) }]}>
                {LP('Почему уходишь?', 'Чому йдеш?', 'Why are you leaving?', '¿Por qué te vas?', 'Por que você vai sair?', 'Vì sao bạn rời đi?', 'Mengapa kamu pergi?', 'Neden ayrılıyorsun?', 'Dlaczego odchodzisz?')}
              </Text>
              <Text style={[S.sheetSub, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(21) }]}>
                {LP('Это поможет нам стать лучше.', 'Це допоможе нам стати кращими.', 'This helps us get better.', 'Nos ayuda a mejorar.', 'Isso nos ajuda a melhorar.', 'Điều này giúp chúng tôi cải thiện.', 'Ini membantu kami menjadi lebih baik.', 'Bu, daha iyi olmamıza yardımcı olur.', 'To pomoże nam się poprawić.')}
              </Text>
              {CANCEL_REASONS.map((r) => {
                const sel = cancelReason === r.key;
                return (
                  <PressableHybrid
                    key={r.key}
                    testID={`manage-subscription-reason-${r.key}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: sel }}
                    onPress={() => { hapticTap(); setCancelReason(r.key); }}
                    withHaptic={false}
                    withSound={false}
                    variant="secondary"
                    contentStyle={[S.reasonRow, { backgroundColor: sel ? glass.selected : glass.buttonFillDisabled }]} /* зачем (координатор 15.10, paywalls-023/024; правило «не сливается»): плашка причины на шторке ≥ 1,5 : 1 к шторке во всех темах — opaqueControl с ней сливался */
                  >
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={20} color={sel ? glass.lightTint : glass.secondary} />
                    <Text style={[S.reasonText, { color: glass.text, fontSize: scaled(15), lineHeight: scaled(21) }]}>{LP(r.ru, r.uk, r.en, r.es, r['pt-BR'], r.vi, r.id, r.tr, r.pl)}</Text>
                  </PressableHybrid>
                );
              })}
              {cancelReason === 'other' && (
                <TextInput
                  testID="manage-subscription-reason-other-input"
                  value={cancelText}
                  onChangeText={setCancelText}
                  placeholder={LP('Расскажи подробнее…', 'Розкажи детальніше…', 'Tell us more…', 'Cuéntanos más…', 'Conte mais…', 'Nói rõ hơn…', 'Ceritakan lebih lanjut…', 'Biraz daha anlat…', 'Napisz więcej…')}
                  placeholderTextColor={glass.mutedText}
                  style={[S.input, { backgroundColor: glass.buttonFillDisabled, color: glass.text, fontSize: scaled(15), lineHeight: scaled(21) }]}
                  multiline
                />
              )}
              <DuoPressable
                testID="manage-subscription-reasons-continue"
                accessibilityRole="button"
                accessibilityState={{ disabled: !cancelReason }}
                onPress={submitCancel}
                disabled={!cancelReason}
                withHaptic={false}
                wrapStyle={S.sheetPrimaryWrap}
                style={[S.sheetPrimary, { backgroundColor: glass.accent, opacity: cancelReason ? 1 : 0.5 }]}
              >
                <Text style={[S.sheetPrimaryText, { color: glass.accentInk, fontSize: scaled(16), lineHeight: scaled(22) }]}>
                  {LP('Перейти к отмене', 'Перейти до скасування', 'Continue to cancel', 'Ir a cancelar', 'Ir para o cancelamento', 'Đi tới hủy gói', 'Lanjut ke pembatalan', 'İptale git', 'Przejdź do anulowania')}
                </Text>
              </DuoPressable>
              <PressableHybrid
                testID="manage-subscription-reasons-stay"
                accessibilityRole="button"
                onPress={() => { hapticTap(); closeCancelSheet(); }}
                withHaptic={false}
                withSound={false}
                variant="secondary"
                contentStyle={S.sheetSecondary}
              >
                <Text style={[S.sheetSecondaryText, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(21) }]}>
                  {LP('Остаться в Plus', 'Залишитися в Plus', 'Stay on Plus', 'Quedarme en Plus', 'Ficar no Plus', 'Ở lại Plus', 'Tetap di Plus', "Plus'da kal", 'Zostań w Plus')}
                </Text>
              </PressableHybrid>
          </SubscriptionOverlayFrame>
        )}

        {/* ── шаг удержания: ответ на названную причину ──
            Кнопка отмены остаётся живой и видимой (требование ревью сторов):
            один дополнительный экран — да, препятствие отмене — нет. */}
        {showCancelSheet && cancelStep === 'offer' && (
          <SubscriptionOverlayFrame bloomColor={glass.selected} glass={glass}>
              <Text style={[S.sheetTitle, { color: glass.text, fontSize: scaled(22), lineHeight: scaled(28) }]}>
                {saveOffer === 'support'
                  ? LP('Расскажи, что пошло не так', 'Розкажи, що пішло не так', 'Tell us what went wrong', 'Cuéntanos qué salió mal', 'Conte o que deu errado', 'Hãy cho chúng tôi biết vấn đề', 'Ceritakan apa yang salah', 'Neyin yanlış gittiğini anlat', 'Napisz, co poszło nie tak')
                  : LP('Ты уже многого добился', 'Ти вже багато чого досяг', 'You\'ve already achieved a lot', 'Ya has logrado mucho', 'Você já conquistou muito', 'Bạn đã đạt được rất nhiều', 'Kamu sudah mencapai banyak hal', 'Şimdiden çok şey başardın', 'Już wiele osiągnąłeś')}
              </Text>
              <Text style={[S.sheetSub, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(21) }]}>
                {saveOffer === 'support'
                  ? LP('Мы читаем каждое обращение и чиним то, что мешает.', 'Ми читаємо кожне звернення і лагодимо те, що заважає.', 'We read every message and fix what\'s getting in your way.', 'Leemos cada mensaje y arreglamos lo que molesta.', 'Lemos cada mensagem e corrigimos o que atrapalha.', 'Chúng tôi đọc mọi phản hồi và sửa những gì gây cản trở.', 'Kami membaca setiap pesan dan memperbaiki yang mengganggu.', 'Her mesajı okuyoruz ve engel olan şeyi düzeltiyoruz.', 'Czytamy każde zgłoszenie i naprawiamy to, co przeszkadza.')
                  : LP('Прогресс останется с тобой, но занятия придётся продолжать без Plus.', 'Прогрес залишиться з тобою, але заняття доведеться продовжувати без Plus.', 'Your progress stays with you, but you\'ll have to keep learning without Plus.', 'Tu progreso se queda, pero seguirás sin Plus.', 'Seu progresso fica, mas você seguirá sem o Plus.', 'Tiến trình vẫn còn, nhưng bạn sẽ học tiếp mà không có Plus.', 'Progresmu tetap ada, tetapi kamu akan lanjut tanpa Plus.', 'İlerlemen kalır, ama Plus olmadan devam edeceksin.', 'Twoje postępy zostaną, ale będziesz uczyć się bez Plus.')}
              </Text>

              {saveOffer === 'progress' && offerProgress && (
                <View style={S.offerStats}>
                  {offerProgress.streak > 0 && (
                    <View style={[S.offerStat, { backgroundColor: glass.buttonFillDisabled }]}>
                      <Text style={[S.offerStatNum, { color: glass.lightTint, fontSize: scaled(20), lineHeight: scaled(26) }]}>{offerProgress.streak}</Text>
                      <Text style={[S.offerStatLabel, { color: glass.secondary, fontSize: scaled(13), lineHeight: scaled(18) }]}>
                        {LP('дней подряд', 'днів поспіль', 'days in a row', 'días seguidos', 'dias seguidos', 'ngày liên tiếp', 'hari berturut', 'gün üst üste', 'dni z rzędu')}
                      </Text>
                    </View>
                  )}
                  {offerProgress.lessonsCompleted > 0 && (
                    <View style={[S.offerStat, { backgroundColor: glass.buttonFillDisabled }]}>
                      <Text style={[S.offerStatNum, { color: glass.lightTint, fontSize: scaled(20), lineHeight: scaled(26) }]}>{offerProgress.lessonsCompleted}</Text>
                      <Text style={[S.offerStatLabel, { color: glass.secondary, fontSize: scaled(13), lineHeight: scaled(18) }]}>
                        {LP('уроков', 'уроків', 'lessons', 'lecciones', 'aulas', 'bài học', 'pelajaran', 'ders', 'lekcji')}
                      </Text>
                    </View>
                  )}
                </View>
              )}

              <DuoPressable
                testID="manage-subscription-offer-accept"
                onPress={acceptSaveOffer}
                accessibilityRole="button"
                withHaptic={false}
                wrapStyle={S.sheetPrimaryWrap}
                style={[S.sheetPrimary, { backgroundColor: glass.accent }]}
              >
                <Text style={[S.sheetPrimaryText, { color: glass.accentInk, fontSize: scaled(16), lineHeight: scaled(22) }]}>
                  {saveOffer === 'support'
                    ? LP('Написать нам', 'Написати нам', 'Write to us', 'Escríbenos', 'Fale conosco', 'Nhắn cho chúng tôi', 'Hubungi kami', 'Bize yaz', 'Napisz do nas')
                    : LP('Остаться в Plus', 'Залишитися в Plus', 'Stay on Plus', 'Quedarme en Plus', 'Ficar no Plus', 'Ở lại Plus', 'Tetap di Plus', "Plus'da kal", 'Zostań w Plus')}
                </Text>
              </DuoPressable>

              <PressableHybrid
                testID="manage-subscription-offer-decline"
                onPress={declineSaveOffer}
                accessibilityRole="button"
                withHaptic={false}
                withSound={false}
                variant="secondary"
                contentStyle={S.sheetSecondary}
              >
                <Text style={[S.sheetSecondaryText, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(21) }]}>
                  {LP('Всё равно отменить', 'Все одно скасувати', 'Cancel anyway', 'Cancelar de todos modos', 'Cancelar mesmo assim', 'Vẫn hủy', 'Tetap batalkan', 'Yine de iptal et', 'Anuluj mimo to')}
                </Text>
              </PressableHybrid>
          </SubscriptionOverlayFrame>
        )}

        {/* ── покупок не нашлось ──
            зачем: пустой результат восстановления — НЕ ошибка, поэтому тон
            спокойный. Самая частая причина в проде — вход не с того аккаунта
            магазина, поэтому её называем прямо, а не оставляем человека гадать. */}
        {showRestoreEmpty && (
          <SubscriptionOverlayFrame bloomColor={glass.selected} glass={glass}>
              <Text style={[S.sheetTitle, { color: glass.text, fontSize: scaled(22), lineHeight: scaled(28) }]}>
                {LP('Покупок не нашлось', 'Покупок не знайшлося', 'No purchases found', 'No se encontraron compras', 'Nenhuma compra encontrada', 'Không tìm thấy giao dịch', 'Pembelian tidak ditemukan', 'Satın alım bulunamadı', 'Nie znaleziono zakupów')}
              </Text>
              <Text style={[S.sheetSub, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(21) }]}>
                {LP(
                  'Проверь, тот ли это аккаунт магазина, с которого покупал. Чаще всего дело именно в нём.',
                  'Перевір, чи той це акаунт магазину, з якого купував. Найчастіше річ саме в ньому.',
                  'Check whether this is the store account you bought with. That is usually the reason.',
                  'Comprueba si es la cuenta de la tienda con la que compraste. Suele ser eso.',
                  'Verifique se é a conta da loja com que você comprou. Quase sempre é isso.',
                  'Hãy kiểm tra xem đây có đúng là tài khoản cửa hàng bạn đã mua không. Thường là do vậy.',
                  'Periksa apakah ini akun toko yang kamu pakai saat membeli. Biasanya itu penyebabnya.',
                  'Satın alırken kullandığın mağaza hesabı bu mu, kontrol et. Genelde sebebi budur.',
                  'Sprawdź, czy to konto sklepu, z którego kupowałeś. Zwykle o to chodzi.',
                )}
              </Text>

              <DuoPressable
                testID="manage-subscription-restore-support"
                accessibilityRole="button"
                onPress={() => { hapticTap(); setShowRestoreEmpty(false); router.push('/support_report' as never); }}
                withHaptic={false}
                wrapStyle={S.sheetPrimaryWrap}
                style={[S.sheetPrimary, { backgroundColor: glass.accent }]}
              >
                <Text style={[S.sheetPrimaryText, { color: glass.accentInk, fontSize: scaled(16), lineHeight: scaled(22) }]}>
                  {LP('Написать в поддержку', 'Написати в підтримку', 'Contact support', 'Escribir a soporte', 'Falar com o suporte', 'Liên hệ hỗ trợ', 'Hubungi dukungan', 'Desteğe yaz', 'Napisz do wsparcia')}
                </Text>
              </DuoPressable>

              <PressableHybrid
                testID="manage-subscription-restore-close"
                accessibilityRole="button"
                onPress={() => { hapticTap(); setShowRestoreEmpty(false); }}
                withHaptic={false}
                withSound={false}
                variant="secondary"
                contentStyle={S.sheetSecondary}
              >
                <Text style={[S.sheetSecondaryText, { color: glass.secondary, fontSize: scaled(15), lineHeight: scaled(21) }]}>
                  {LP('Закрыть', 'Закрити', 'Close', 'Cerrar', 'Fechar', 'Đóng', 'Tutup', 'Kapat', 'Zamknij')}
                </Text>
              </PressableHybrid>
          </SubscriptionOverlayFrame>
        )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  safeContent: { flex: 1, position: 'relative' },
  host: { flex: 1 },
  scroll: { paddingHorizontal: 15, paddingBottom: 40 },
  closeHit: { width: 48, height: 48, alignSelf: 'flex-start', marginTop: 4 },
  closeFace: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { marginTop: 10, fontWeight: '700', letterSpacing: -0.6, flexShrink: 1 },
  statusCard: { borderRadius: 22, padding: 20, marginTop: 20, overflow: 'hidden' },
  cardSheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 78, opacity: 0.62 },
  cardRim: { position: 'absolute', left: 14, right: 14, top: 0, height: 1, borderRadius: 1, opacity: 0.8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { fontWeight: '700', flexShrink: 1 },
  planTitle: { fontWeight: '700', letterSpacing: -0.35, marginTop: 8, flexShrink: 1 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  infoLabel: { fontWeight: '400', flexShrink: 1 },
  infoValue: { fontWeight: '700', flexShrink: 1 },
  lifetimeNote: { marginTop: 10, fontWeight: '400', flexShrink: 1 },
  loading: { marginTop: 18, gap: 12 },
  sectionTitle: { fontWeight: '700', letterSpacing: 1.7, marginTop: 24, marginBottom: 10, marginHorizontal: 4, flexShrink: 1 },
  benefitList: { gap: 10 },
  benefitRow: { minHeight: 64, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 14, overflow: 'hidden' },
  benefitIcon: { width: 41, height: 41, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  benefitText: { flex: 1, minWidth: 0, fontWeight: '700', flexShrink: 1 },
  changeCard: {
    minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, marginTop: 18,
  },
  actionCopy: { flex: 1, minWidth: 0 },
  changeTitle: { fontWeight: '700', flexShrink: 1 },
  changeSub: { fontWeight: '400', marginTop: 2, flexShrink: 1 },
  // Ряд «Восстановить покупки»: minHeight 56 — комфортная зона тапа (выше
  // минимума 44pt). Разделяем тоном карточки, без обводки (запрет владельца).
  restoreRow: {
    marginTop: 16, minHeight: 56, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12,
  },
  restoreText: { flex: 1, minWidth: 0, fontWeight: '700', flexShrink: 1 },
  cancelBtn: { minHeight: 48, borderRadius: 16, marginTop: 10, paddingVertical: 10, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  cancelText: { fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  sheetOverlay: { ...StyleSheet.absoluteFillObject },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.68)' }, // theme-exempt: затемнение под окном/шторкой и тень — постоянные в любой теме
  sheetAvoiding: { flex: 1 },
  sheetViewport: { flex: 1, minHeight: 0, justifyContent: 'flex-end' },
  sheetEntrance: { width: '100%', alignSelf: 'center', flexShrink: 1 },
  sheet: { width: '100%', minHeight: 0, flexShrink: 1, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetSheen: { position: 'absolute', left: 0, right: 0, top: 0, height: 88, opacity: 0.42 },
  sheetTopHighlight: { position: 'absolute', left: 20, right: 20, top: 0, height: 1, borderRadius: 1, opacity: 0.78 },
  sheetScroll: { minHeight: 0, flexShrink: 1 },
  sheetContent: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 16 },
  sheetTitle: { fontWeight: '700', letterSpacing: -0.4, flexShrink: 1 },
  sheetSub: { fontWeight: '400', marginTop: 6, marginBottom: 14, flexShrink: 1 },
  reasonRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 8 },
  reasonText: { flex: 1, minWidth: 0, fontWeight: '400', flexShrink: 1 },
  input: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginTop: 10, minHeight: 88, fontWeight: '400', textAlignVertical: 'top' },
  sheetPrimaryWrap: { marginTop: 16 },
  sheetPrimary: { minHeight: 52, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  sheetPrimaryText: { fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  sheetSecondary: { minHeight: 48, paddingHorizontal: 16, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetSecondaryText: { fontWeight: '700', textAlign: 'center', flexShrink: 1 },
  // Плитки прогресса: разделены тоном подложки, без обводок (правило владельца).
  offerStats: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4, marginBottom: 4 },
  offerStat: { minWidth: 132, flexBasis: 0, flexGrow: 1, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 10, alignItems: 'center', gap: 2 },
  offerStatNum: { fontWeight: '700', letterSpacing: -0.3, flexShrink: 1 },
  offerStatLabel: { fontWeight: '400', textAlign: 'center', flexShrink: 1 },
});

import BackGlyph from '../components/v2/BackGlyph';
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
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator,
  Linking, Platform, TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import Purchases, { type CustomerInfo } from 'react-native-purchases';

import { LinearGradient } from '../components/SafeLinearGradient';
import SkeletonBlock from '../components/SkeletonShimmer';
import { useLang } from '../components/LangContext';
import { triLang, type Lang } from '../constants/i18n';
import { usePaywallChrome, PaywallCloseButton } from '../components/paywall/paywallShared';
import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import { storePriceTrim } from './paywall_purchase';
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

type ManageSubscriptionCopy = {
  ru: string;
  uk: string;
  es: string;
  'pt-BR': string;
  vi: string;
  id: string;
  tr: string;
  pl: string;
};

// «Что включено» — полный список привилегий Premium. Каждый пункт сверен с реальным
// гейтом в коде (аудит 2026-07-25, см. app/feature_gates.ts + app/energy_system.ts +
// app/remote_flags.ts). Формулировки сжатые, по Библии Phraseman, без хардкода чисел/цен.
//
// зачем: два пункта убраны — «Квизы без дневного лимита» и «Арена без дневного лимита» —
// потому что дневного лимита на квизы/арену в коде СЕЙЧАС НЕТ вообще (ни для платных,
// ни для бесплатных). app/remote_flags.ts объявляет free_daily_quiz_limit/arena_daily_max/
// gate_quizzes_premium/gate_arena_premium, но ни один из геттеров getFreeDailyQuizLimit()/
// isQuizzesPremiumGated()/getArenaDailyMax()/isArenaPremiumGated() (remote_flags.ts:652-653,
// 1006-1007) не вызывается нигде в app/ или functions/src — обещание было ложным для всех
// пользователей. Энергия — единственный реально проверенный "безлимит для премиума" гейт
// (см. spendEnergy → isFeatureFreeForEveryone('energy') / getVerifiedPremiumStatus(),
// energy_system.ts:212-224), поэтому первый пункт остаётся про энергию.
const INCLUDED: ManageSubscriptionCopy[] = [
  // — Доступ и лимиты —
  // зачем: слово «квизы» убрано из всех локалей — раздела квизов в приложении нет
  // (владелец удалил его), обещание было ложным. Уроки и экзамены — реальные
  // потребители энергии (ENERGY_PER_LESSON, energy_system.ts), они и остаются.
  { ru: 'Безлимитная энергия — уроки и экзамены без ожидания', uk: 'Безлімітна енергія — уроки та іспити без очікування', es: 'Energía ilimitada: lecciones y exámenes sin esperas', 'pt-BR': 'Energia ilimitada: aulas e exames sem espera', vi: 'Năng lượng không giới hạn: bài học và bài kiểm tra không phải chờ', id: 'Energi tak terbatas: pelajaran dan ujian tanpa menunggu', tr: 'Sınırsız enerji: dersler ve sınavlar beklemeden', pl: 'Nielimitowana energia: lekcje i egzaminy bez czekania' },
  { ru: 'Все уроки текущего уровня открыты полностью', uk: 'Усі уроки поточного рівня відкриті повністю', es: 'Todas las lecciones del nivel actual abiertas', 'pt-BR': 'Todas as aulas do nível atual totalmente abertas', vi: 'Tất cả bài học của cấp hiện tại được mở đầy đủ', id: 'Semua pelajaran level saat ini terbuka penuh', tr: 'Mevcut seviyedeki tüm dersler tamamen açık', pl: 'Wszystkie lekcje bieżącego poziomu są w pełni otwarte' },
  // — Живая практика —
  { ru: 'Безлимитные диалоги по сценариям', uk: 'Безлімітні діалоги за сценаріями', es: 'Diálogos por escenarios sin límite', 'pt-BR': 'Diálogos por cenários sem limite', vi: 'Hội thoại theo kịch bản không giới hạn', id: 'Dialog berbasis skenario tanpa batas', tr: 'Senaryolu diyaloglar sınırsız', pl: 'Nielimitowane dialogi według scenariuszy' },
  { ru: 'Собеседник «Компас» — общайся без ограничений', uk: 'Співрозмовник «Компас» — спілкуйся без обмежень', es: 'Compañero «Compás»: conversa sin límites', 'pt-BR': 'Parceiro «Bússola»: converse sem limites', vi: 'Người bạn «La bàn» — trò chuyện không giới hạn', id: 'Teman «Kompas» — mengobrol tanpa batas', tr: 'Sohbet arkadaşı «Pusula» — sınırsız konuş', pl: 'Rozmówca „Kompas” — rozmawiaj bez ograniczeń' },
  { ru: 'Доступ ко всем уровням сценариев диалогов', uk: 'Доступ до всіх рівнів сценаріїв діалогів', es: 'Acceso a todos los niveles de los diálogos', 'pt-BR': 'Acesso a todos os níveis dos diálogos', vi: 'Mở mọi cấp độ kịch bản hội thoại', id: 'Akses ke semua level skenario dialog', tr: 'Tüm diyalog senaryosu seviyelerine erişim', pl: 'Dostęp do wszystkich poziomów scenariuszy dialogów' },
  // — Персональное обучение —
  { ru: 'Личный план обучения под твою цель', uk: 'Особистий план навчання під твою ціль', es: 'Plan de estudio personal según tu meta', 'pt-BR': 'Plano de estudo pessoal para a sua meta', vi: 'Lộ trình học cá nhân theo mục tiêu của bạn', id: 'Rencana belajar pribadi sesuai targetmu', tr: 'Hedefine göre kişisel öğrenme planı', pl: 'Osobisty plan nauki pod twój cel' },
  { ru: 'Умный тренажёр и все режимы тренировки', uk: 'Розумний тренажер і всі режими тренування', es: 'Entrenador inteligente y todos los modos', 'pt-BR': 'Treinador inteligente e todos os modos', vi: 'Trình luyện thông minh và mọi chế độ', id: 'Latihan cerdas dan semua mode latihan', tr: 'Akıllı antrenör ve tüm çalışma modları', pl: 'Inteligentny trener i wszystkie tryby treningu' },
  { ru: 'Тренажёр говорения с распознаванием речи', uk: 'Тренажер говоріння з розпізнаванням мовлення', es: 'Práctica de habla con reconocimiento de voz', 'pt-BR': 'Treino de fala com reconhecimento de voz', vi: 'Luyện nói với nhận diện giọng nói', id: 'Latihan bicara dengan pengenalan suara', tr: 'Ses tanımalı konuşma alıştırması', pl: 'Trener mówienia z rozpoznawaniem mowy' },
  // — Аналитика —
  { ru: 'Глубокая статистика, разбор недели и инсайты практики', uk: 'Глибока статистика, розбір тижня та інсайти практики', es: 'Estadística avanzada, resumen semanal e insights', 'pt-BR': 'Estatísticas avançadas, resumo semanal e insights', vi: 'Thống kê chuyên sâu, phân tích tuần và insight luyện tập', id: 'Statistik mendalam, ulasan mingguan, dan insight latihan', tr: 'Derin istatistik, haftalık analiz ve pratik içgörüleri', pl: 'Zaawansowane statystyki, tygodniowy przegląd i wnioski z praktyki' },
  // — Контент и серия —
  { ru: 'Неограниченные сохранённые карточки', uk: 'Необмежені збережені картки', es: 'Tarjetas guardadas ilimitadas', 'pt-BR': 'Cartões salvos ilimitados', vi: 'Thẻ đã lưu không giới hạn', id: 'Kartu tersimpan tak terbatas', tr: 'Sınırsız kayıtlı kart', pl: 'Nielimitowane zapisane fiszki' },
  { ru: 'Защита серии: бесплатная заморозка', uk: 'Захист серії: безкоштовна заморозка', es: 'Protección de racha: congelación gratis', 'pt-BR': 'Proteção de sequência: congelamento grátis', vi: 'Bảo vệ chuỗi ngày: đóng băng miễn phí', id: 'Perlindungan streak: pembekuan gratis', tr: 'Seri koruması: ücretsiz dondurma', pl: 'Ochrona serii: darmowe zamrożenie' },
  // — Косметика и статус —
  { ru: 'Плюс-темы и эксклюзивная аура аватара', uk: 'Плюс-теми та ексклюзивна аура аватара', es: 'Temas Plus y aura de avatar exclusiva', 'pt-BR': 'Temas Plus e aura de avatar exclusiva', vi: 'Giao diện Plus và hào quang avatar độc quyền', id: 'Tema Plus dan aura avatar eksklusif', tr: 'Plus temalar ve özel avatar aurası', pl: 'Motywy Plus i ekskluzywna aura awatara' },
  { ru: 'Плюс-подсветка профиля в лидербордах', uk: 'Плюс-підсвічування профілю в лідербордах', es: 'Perfil destacado en las clasificaciones', 'pt-BR': 'Perfil Plus destacado nos rankings', vi: 'Hồ sơ Plus nổi bật trên bảng xếp hạng', id: 'Sorotan profil Plus di papan peringkat', tr: 'Liderlik tablolarında Plus profil vurgusu', pl: 'Wyróżnienie profilu Plus w rankingach' },
];

// Причины отмены для шит-опроса (logCancelSurvey).
const CANCEL_REASONS: ({ key: string } & ManageSubscriptionCopy)[] = [
  { key: 'too_expensive', ru: 'Слишком дорого', uk: 'Занадто дорого', es: 'Demasiado caro', 'pt-BR': 'Muito caro', vi: 'Quá đắt', id: 'Terlalu mahal', tr: 'Çok pahalı', pl: 'Za drogo' },
  { key: 'not_using', ru: 'Не пользуюсь достаточно', uk: 'Не користуюся достатньо', es: 'No lo uso lo suficiente', 'pt-BR': 'Não uso o suficiente', vi: 'Tôi không dùng đủ nhiều', id: 'Saya tidak cukup sering memakainya', tr: 'Yeterince kullanmıyorum', pl: 'Nie korzystam wystarczająco' },
  { key: 'missing_features', ru: 'Не хватает функций', uk: 'Бракує функцій', es: 'Faltan funciones', 'pt-BR': 'Faltam recursos', vi: 'Thiếu tính năng', id: 'Fitur kurang', tr: 'Özellikler eksik', pl: 'Brakuje funkcji' },
  { key: 'technical', ru: 'Технические проблемы', uk: 'Технічні проблеми', es: 'Problemas técnicos', 'pt-BR': 'Problemas técnicos', vi: 'Sự cố kỹ thuật', id: 'Masalah teknis', tr: 'Teknik sorunlar', pl: 'Problemy techniczne' },
  { key: 'temporary', ru: 'Временно, вернусь позже', uk: 'Тимчасово, повернусь пізніше', es: 'Temporal, vuelvo luego', 'pt-BR': 'Temporário, volto depois', vi: 'Tạm thời, tôi sẽ quay lại sau', id: 'Sementara, nanti saya kembali', tr: 'Geçici, sonra döneceğim', pl: 'Tymczasowo, wrócę później' },
  { key: 'other', ru: 'Другое', uk: 'Інше', es: 'Otro', 'pt-BR': 'Outro', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' },
];

const DATE_LOCALE_BY_LANG: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
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
  const chrome = usePaywallChrome();
  const LP = (
    ru: string,
    uk: string,
    es: string,
    ptBR: string,
    vi: string,
    id: string,
    tr: string,
    pl: string,
  ) => triLang(L, { ru, uk, es, 'pt-BR': ptBR, vi, id, tr, pl });

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
  const [fallbackPlan, setFallbackPlan] = useState<PremiumStorePlan | null>(routeParamPlan);
  const [loading, setLoading] = useState(routeParamPlan === null);
  const [yearlyPriceStr, setYearlyPriceStr] = useState('');
  const [yearlyPkg, setYearlyPkg] = useState<import('react-native-purchases').PurchasesPackage | null>(null);
  const [changing, setChanging] = useState(false);
  const [showCancelSheet, setShowCancelSheet] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [cancelText, setCancelText] = useState('');
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
      try {
        // Локальный AsyncStorage-кэш (записан persistStorePremiumLocally при покупке/смене
        // плана) читаем ПЕРВЫМ и отдельно от RevenueCat — он не требует сети и обычно уже
        // точнее route-параметра (знает lifetime/expiry), поэтому обновляет fallbackPlan
        // ещё до того, как достучимся до RevenueCat.
        const localPairs = await AsyncStorage.multiGet(['premium_plan', 'premium_rc_product_id']);
        const storedPlan = localPairs.find(p => p[0] === 'premium_plan')?.[1];
        const storedProductId = localPairs.find(p => p[0] === 'premium_rc_product_id')?.[1];
        const nextFallbackPlan = localPremiumPlan(storedProductId, storedPlan);
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
      } catch { /* данных нет — покажем минимум */ }
      finally { if (isBootstrapCurrent()) setLoading(false); }
    })();
    return () => { dead = true; };
  }, [screenAccount]);

  const metadata = info ? revenueCatPremiumMetadata(info) : {};
  const currentPlan = inferPremiumPlanFromCustomerInfo(info, fallbackPlan);
  const nextDate = formatDate(metadata.expiryMs ?? null, L);
  const isLifetime = currentPlan === 'lifetime';
  const isMonthly = currentPlan === 'monthly';

  const planLabel = isLifetime
    ? 'Phraseman Pro'
    : currentPlan === 'yearly'
      ? LP('Годовая подписка', 'Річна підписка', 'Suscripción anual', 'Assinatura anual', 'Gói năm', 'Langganan tahunan', 'Yıllık abonelik', 'Subskrypcja roczna')
      : currentPlan === 'monthly'
        ? LP('Месячная подписка', 'Місячна підписка', 'Suscripción mensual', 'Assinatura mensal', 'Gói tháng', 'Langganan bulanan', 'Aylık abonelik', 'Subskrypcja miesięczna')
        : LP('Подписка Plus', 'Підписка Plus', 'Suscripción Plus', 'Assinatura Plus', 'Gói Plus', 'Langganan Plus', 'Plus aboneliği', 'Subskrypcja Plus');

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
        return;
      }
      invalidatePremiumCache();
      emitAppEvent('premium_activated');
      void trackEvent('change_plan_completed', { from: 'monthly', to: result.plan });
    } catch (err: unknown) {
      if (!(err as { userCancelled?: boolean })?.userCancelled) {
        void trackEvent('change_plan_failed', { from: 'monthly', to: 'yearly' });
      }
    } finally {
      if (isManageSubscriptionOperationCurrent(generation)) setChanging(false);
    }
  }, [changing, yearlyPkg, metadata.productId, fallbackPlan]);

  // ── отмена: опрос → стор ────────────────────────────────────────────────────
  const submitCancel = useCallback(() => {
    if (!isManageSubscriptionOperationCurrent(screenAccount)) {
      setShowCancelSheet(false);
      setCancelReason(null);
      setCancelText('');
      return;
    }
    hapticTap();
    logCancelSurvey(cancelReason ?? 'unknown', cancelText, 'manage');
    void trackEvent('subscription_cancel_survey', { reason: cancelReason ?? 'unknown' });
    setShowCancelSheet(false);
    void Linking.openURL(getStoreManageUrl()).catch(() => {});
  }, [cancelReason, cancelText, screenAccount]);

  return (
    <LinearGradient colors={chrome.bgColors} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={S.root}>
      <SafeAreaView style={S.safe}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={S.scroll}>
          <PaywallCloseButton onPress={() => { hapticTap(); safeRouterBack(router, closeFallback); }} chrome={chrome} />

          <View style={[S.statusBadge, { backgroundColor: `${chrome.tc.heroAccent}1A`, borderColor: `${chrome.tc.heroAccent}40` }]}>
            <Ionicons name="checkmark-circle" size={16} color={chrome.tc.heroAccent} />
            <Text style={[S.statusText, { color: chrome.tc.heroAccent }]}>
              {LP('Plus активирован', 'Plus активовано', 'Plus activado', 'Plus ativado', 'Plus đã kích hoạt', 'Plus aktif', 'Plus etkinleştirildi', 'Plus aktywowany')}
            </Text>
          </View>

          <Text style={[S.title, { color: chrome.textPrimary }]}>{planLabel}</Text>

          {loading ? (
            <View style={{ marginTop: 18, gap: 12 }}>
              <SkeletonBlock width="100%" height={64} borderRadius={16} />
              <SkeletonBlock width="100%" height={64} borderRadius={16} />
              <SkeletonBlock width="70%" height={48} borderRadius={14} />
            </View>
          ) : (
            <>
              {!isLifetime && nextDate && (
                <View style={[S.infoCard, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
                  <View style={S.infoRow}>
                    <Text style={[S.infoLabel, { color: chrome.textMuted }]}>
                      {LP('Следующее списание', 'Наступне списання', 'Próximo cobro', 'Próxima cobrança', 'Lần thanh toán tiếp theo', 'Tagihan berikutnya', 'Sonraki ödeme', 'Następna płatność')}
                    </Text>
                    <Text style={[S.infoValue, { color: chrome.textPrimary }]}>{nextDate}</Text>
                  </View>
                </View>
              )}
              {isLifetime && (
                <Text style={[S.lifetimeNote, { color: chrome.textMuted }]}>
                  {LP('Разовая покупка — без списаний и автопродления.', 'Разова покупка — без списань і автопродовження.', 'Compra única, sin cobros ni renovación.', 'Compra única, sem cobranças nem renovação automática.', 'Mua một lần, không thu phí và không tự gia hạn.', 'Pembelian sekali, tanpa tagihan dan perpanjangan otomatis.', 'Tek seferlik satın alma, ödeme ve otomatik yenileme yok.', 'Jednorazowy zakup, bez opłat i automatycznego odnawiania.')}
                </Text>
              )}

              <Text style={[S.sectionTitle, { color: chrome.textMuted }]}>
                {LP('ЧТО ВКЛЮЧЕНО', 'ЩО ВКЛЮЧЕНО', 'QUÉ INCLUYE', 'O QUE INCLUI', 'BAO GỒM', 'YANG TERMASUK', 'NELER DAHİL', 'CO ZAWIERA')}
              </Text>
              <View style={[S.infoCard, { backgroundColor: chrome.cardBg, borderColor: chrome.cardBorder }]}>
                {INCLUDED.map((b, i) => (
                  <View key={i} style={[S.benefitRow, i > 0 && { marginTop: 10 }]}>
                    <Ionicons name="checkmark-circle" size={16} color={chrome.tc.heroAccent} style={{ marginTop: 1 }} />
                    <Text style={[S.benefitText, { color: chrome.textPrimary }]}>{LP(b.ru, b.uk, b.es, b['pt-BR'], b.vi, b.id, b.tr, b.pl)}</Text>
                  </View>
                ))}
              </View>

              {/* Карточка «Перейти на годовой» — только если сейчас месячный и годовой пакет есть. */}
              {isMonthly && yearlyPkg && (
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleChangePlan}
                  disabled={changing}
                  style={[S.changeCard, { borderColor: `${chrome.tc.heroAccent}55`, backgroundColor: `${chrome.tc.heroAccent}10` }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[S.changeTitle, { color: chrome.textPrimary }]}>
                      {LP('Перейти на годовой план', 'Перейти на річний план', 'Cambiar al plan anual', 'Mudar para o plano anual', 'Chuyển sang gói năm', 'Beralih ke paket tahunan', 'Yıllık plana geç', 'Przejdź na plan roczny')}
                    </Text>
                    <Text style={[S.changeSub, { color: chrome.textMuted }]}>
                      {yearlyPriceStr
                        ? LP(`Дешевле в пересчёте — ${yearlyPriceStr}/год`, `Дешевше в перерахунку — ${yearlyPriceStr}/рік`, `Más barato al año — ${yearlyPriceStr}/año`, `Mais barato no ano — ${yearlyPriceStr}/ano`, `Rẻ hơn tính theo năm — ${yearlyPriceStr}/năm`, `Lebih murah per tahun — ${yearlyPriceStr}/tahun`, `Yıllık daha ucuz — ${yearlyPriceStr}/yıl`, `Taniej rocznie — ${yearlyPriceStr}/rok`)
                        : LP('Дешевле в пересчёте на месяц', 'Дешевше в перерахунку на місяць', 'Más barato por mes', 'Mais barato por mês', 'Rẻ hơn tính theo tháng', 'Lebih murah per bulan', 'Aylık hesapta daha ucuz', 'Taniej w przeliczeniu na miesiąc')}
                    </Text>
                  </View>
                  {changing
                    ? <ActivityIndicator color={chrome.tc.heroAccent} />
                    : <Ionicons name="arrow-forward-circle" size={26} color={chrome.tc.heroAccent} />}
                </TouchableOpacity>
              )}

              {/* Отмена — только для подписок (не lifetime). */}
              {!isLifetime && (
                <TouchableOpacity onPress={() => { hapticTap(); setShowCancelSheet(true); }} style={S.cancelBtn}>
                  <Text style={[S.cancelText, { color: chrome.textMuted }]}>
                    {LP('Отменить подписку', 'Скасувати підписку', 'Cancelar suscripción', 'Cancelar assinatura', 'Hủy gói đăng ký', 'Batalkan langganan', 'Aboneliği iptal et', 'Anuluj subskrypcję')}
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </ScrollView>

        {/* ── шит-опрос отмены ── */}
        {showCancelSheet && (
          <View style={S.sheetOverlay}>
            <View style={[S.sheet, { backgroundColor: chrome.bgColors[1] ?? '#11151a', borderColor: chrome.cardBorder }]}>
              <Text style={[S.sheetTitle, { color: chrome.textPrimary }]}>
                {LP('Почему уходишь?', 'Чому йдеш?', '¿Por qué te vas?', 'Por que você vai sair?', 'Vì sao bạn rời đi?', 'Mengapa kamu pergi?', 'Neden ayrılıyorsun?', 'Dlaczego odchodzisz?')}
              </Text>
              <Text style={[S.sheetSub, { color: chrome.textMuted }]}>
                {LP('Это поможет нам стать лучше.', 'Це допоможе нам стати кращими.', 'Nos ayuda a mejorar.', 'Isso nos ajuda a melhorar.', 'Điều này giúp chúng tôi cải thiện.', 'Ini membantu kami menjadi lebih baik.', 'Bu, daha iyi olmamıza yardımcı olur.', 'To pomoże nam się poprawić.')}
              </Text>
              {CANCEL_REASONS.map((r) => {
                const sel = cancelReason === r.key;
                return (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => { hapticTap(); setCancelReason(r.key); }}
                    style={[S.reasonRow, { borderColor: sel ? chrome.tc.heroAccent : chrome.cardBorder, backgroundColor: sel ? `${chrome.tc.heroAccent}14` : 'transparent' }]}
                  >
                    <Ionicons name={sel ? 'radio-button-on' : 'radio-button-off'} size={18} color={sel ? chrome.tc.heroAccent : chrome.textMuted} />
                    <Text style={[S.reasonText, { color: chrome.textPrimary }]}>{LP(r.ru, r.uk, r.es, r['pt-BR'], r.vi, r.id, r.tr, r.pl)}</Text>
                  </TouchableOpacity>
                );
              })}
              {cancelReason === 'other' && (
                <TextInput
                  value={cancelText}
                  onChangeText={setCancelText}
                  placeholder={LP('Расскажи подробнее…', 'Розкажи детальніше…', 'Cuéntanos más…', 'Conte mais…', 'Nói rõ hơn…', 'Ceritakan lebih lanjut…', 'Biraz daha anlat…', 'Napisz więcej…')}
                  placeholderTextColor={chrome.textMuted}
                  style={[S.input, { color: chrome.textPrimary, borderColor: chrome.cardBorder }]}
                  multiline
                />
              )}
              <TouchableOpacity
                onPress={submitCancel}
                disabled={!cancelReason}
                style={[S.sheetPrimary, { backgroundColor: chrome.tc.ctaBg, opacity: cancelReason ? 1 : 0.5 }]}
              >
                <Text style={[S.sheetPrimaryText, { color: chrome.tc.ctaText }]}>
                  {LP('Перейти к отмене', 'Перейти до скасування', 'Ir a cancelar', 'Ir para o cancelamento', 'Đi tới hủy gói', 'Lanjut ke pembatalan', 'İptale git', 'Przejdź do anulowania')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { hapticTap(); setShowCancelSheet(false); }} style={S.sheetSecondary}>
                <Text style={[S.sheetSecondaryText, { color: chrome.textMuted }]}>
                  {LP('Остаться в Plus', 'Залишитися в Plus', 'Quedarme en Plus', 'Ficar no Plus', 'Ở lại Plus', 'Tetap di Plus', "Plus'da kal", 'Zostań w Plus')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const S = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'center', gap: 7,
    paddingHorizontal: 13, paddingVertical: 7, borderRadius: 14, borderWidth: 0, marginTop: 8,
  },
  statusText: { fontSize: 12.5, fontWeight: '800' },
  title: { fontSize: 26, fontWeight: '900', textAlign: 'center', marginTop: 14, letterSpacing: -0.6 },
  infoCard: { borderRadius: 16, borderWidth: 0, paddingHorizontal: 16, paddingVertical: 14, marginTop: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  infoLabel: { fontSize: 13, fontWeight: '600' },
  infoValue: { fontSize: 14, fontWeight: '800' },
  lifetimeNote: { fontSize: 12.5, textAlign: 'center', marginTop: 12, lineHeight: 17 },
  sectionTitle: { fontSize: 10.5, fontWeight: '800', letterSpacing: 1.2, marginTop: 22, marginLeft: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  benefitText: { flex: 1, fontSize: 13, lineHeight: 18 },
  changeCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderRadius: 16, borderWidth: 0, paddingHorizontal: 16, paddingVertical: 15, marginTop: 18,
  },
  changeTitle: { fontSize: 15, fontWeight: '800' },
  changeSub: { fontSize: 12, marginTop: 2 },
  cancelBtn: { alignSelf: 'center', marginTop: 24, paddingVertical: 8, paddingHorizontal: 12 },
  cancelText: { fontSize: 13, textDecorationLine: 'underline', opacity: 0.7 },
  sheetOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.62)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 0, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 34 },
  sheetTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.4 },
  sheetSub: { fontSize: 13, marginTop: 4, marginBottom: 14 },
  reasonRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 0, paddingHorizontal: 13, paddingVertical: 12, marginTop: 8 },
  reasonText: { flex: 1, fontSize: 14, fontWeight: '600' },
  input: { borderRadius: 12, borderWidth: 0, padding: 12, marginTop: 10, minHeight: 70, fontSize: 14, textAlignVertical: 'top' },
  sheetPrimary: { minHeight: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 16 },
  sheetPrimaryText: { fontSize: 16, fontWeight: '900' },
  sheetSecondary: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  sheetSecondaryText: { fontSize: 14, fontWeight: '700' },
});

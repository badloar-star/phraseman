import React, { useState, useEffect, useRef, useCallback } from 'react';
import TapScale from '../components/TapScale';
import {
  View, Text, TouchableOpacity,
  ScrollView, Animated, Linking, Modal, Easing, StyleSheet,
  Platform,
  TextInput,
  InteractionManager,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from '../components/SafeLinearGradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, { PurchasesPackage } from 'react-native-purchases';
import { useTheme } from '../components/ThemeContext';
import { useLang } from '../components/LangContext';
import { useEnergy } from '../components/EnergyContext';
import EnergyIcon from '../components/EnergyIcon';
import ContentWrap from '../components/ContentWrap';
import ReportErrorButton from '../components/ReportErrorButton';
import ScreenGradient from '../components/ScreenGradient';
import ShineOverlay from '../components/ShineOverlay';
import { paywallGlassColor } from '../components/paywallGlass';
import MatchFoundToast from '../components/MatchFoundToast';
import { DEV_IAP_BYPASS, IS_EXPO_GO, IS_STORE_RELEASE, KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from './config';
import { initRevenueCat, resolvePremiumPackages, syncRevenueCatIdentity } from './revenuecat_init';
import { getVerifiedRealPremiumStatus, getVerifiedVipStatus, invalidatePremiumCache } from './premium_guard';
import { useEffectivePlatformOS } from './platform_ui_preview';
import {
  getTrialReofferBlockedByCooldown,
  markSubscriptionOrTrialFlowConsumedNow,
} from './premium_trial_eligibility';
import { storeProductHasTrialIntro } from './premium_trial_signal';
import { safeRouterBack } from './navigation_back';
import {
  inferPremiumPlanFromProductId,
  persistStorePremiumLocally,
  revenueCatPremiumMetadata,
  type RevenueCatPremiumMetadata,
} from './premium_revenuecat_state';
import {
  logPremiumPurchased,
  logPremiumModalOpened,
  logCancelSurvey,
  logPaywallView,
  logPaywallPlanSelect,
  logPaywallCtaClick,
  logPaywallContinueFree,
  logPaywallClose,
  logCoursePaywallAfterLesson3,
  logExitTrialOfferShown,
  logExitTrialOfferAccepted,
  logExitTrialOfferDeclined,
} from './firebase';
import { trackEvent } from './analytics';
import { emitAppEvent } from './events';
import { markCelebrationPending } from './premium_celebration_state';
import {
  PREMIUM_CONTEXT_SET,
  type PremiumContext as PremiumContextType,
} from './premium_context';
import {
  PREMIUM_HERO_ART,
  PAYWALL_COPY,
  getPaywallCopy,
  getHeroPlannedCopy,
  CONTEXT_BENEFITS,
  getContextBenefitPlanned,
  normalizePremiumContext,
  type PaywallCopy,
  type PremiumPlannedCopy,
  type PremiumPlannedHeroCopy,
} from './paywall_copy';
import {
  readProgressMirror,
  readIntroProgress,
  isMirrorWorthShowing,
  type ProgressMirror,
} from './paywall_progress_mirror';
import { pickPercentileLine } from './paywall_percentile_line';
import { loadPercentileData } from './daily_analytics_sync';
import { computeSavingsPct, computePerDayString } from './paywall_pricing';
import { pickTestimonials, type Testimonial } from './paywall_testimonials';
import {
  activateUrgencyIfNeeded,
  getUrgencyState,
  getDoubledPrice,
  formatCountdown,
  type UrgencyState,
} from './paywall_urgency';
import { collectPaywallStats, pickPaywallTags, type PersonalizedTag } from './paywall_personalization';
import {
  shouldShowExitTrialOffer,
  shouldShowPrimaryTrialUi,
  type PaywallCloseReason,
} from './paywall_trial_offer';
import { hapticTap } from '../hooks/use-haptics';
import { MOTION_SPRING_LEGACY } from '../constants/motion';
import { triLang, type Lang } from '../constants/i18n';
import { getPremiumCourseLevel } from './lesson_lock_system';
import type { ThemeMode } from '../constants/theme';
import { COMPASS_GRADIENTS, COMPASS_RICH } from '../constants/compassTheme';
import { oskolokImageForPackShards } from './oskolok';
import {
  activatePendingPersonalPlanAfterPremium,
  PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY,
} from './personal_plan_activation';


function PremiumScreenShell({ children }: { children: React.ReactNode }) {
  return (
    <ScreenGradient>
      {children}
      <MatchFoundToast host="screen" />
    </ScreenGradient>
  );
}

/** Только непустая строка из стора — без выдуманных сумм. */
function storePriceTrim(raw: string | undefined | null): string {
  if (typeof raw !== 'string') return '';
  return raw.trim();
}

function storePricePerMonthTrim(product: PurchasesPackage['product'] | undefined): string {
  return storePriceTrim((product as { pricePerMonthString?: string | null } | undefined)?.pricePerMonthString);
}

function routeParamString(raw: string | string[] | undefined): string {
  return storePriceTrim(Array.isArray(raw) ? raw[0] : raw);
}

const isEnergyGlyph = (value: string) => value.codePointAt(0) === 0x26A1;

type Plan = 'monthly' | 'yearly';
type PremiumPackages = { monthly?: PurchasesPackage; yearly?: PurchasesPackage };
// PremiumContext вынесен в ./premium_context, чтобы вспомогательные модули
// (percentile-строка, зеркало прогресса) типизировались без импорта этого экрана.
// 'dialog_limit' (AI-диалог) и 'speaking' (Speaking mode) добавлены в
// ./premium_context при слиянии веток ai-dialogue и speaking-mode.
type PremiumContext = PremiumContextType;

function premiumHeroScrim(themeMode: ThemeMode): string[] {
  if (false) {
    return ['rgba(255,255,255,0.72)', 'rgba(255,255,255,0.50)', 'rgba(255,255,255,0.78)'];
  }
  if (themeMode === 'gold') {
    return ['rgba(0,0,0,0.28)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.54)'];
  }
  return ['rgba(0,0,0,0.36)', 'rgba(0,0,0,0.16)', 'rgba(0,0,0,0.58)'];
}

function shouldUseShardHeroIcon(ctx: PremiumContext): boolean {
  return ctx === 'generic';
}

const normalizePlan = (raw: string | null | undefined): Plan | null => {
  if (!raw) return null;
  const p = String(raw).trim().toLowerCase();
  if (p === 'monthly') return 'monthly';
  if (p === 'yearly' || p === 'annual') return 'yearly';
  return null;
};


const getSubscriptionManageUrl = (): string => {
  // RevenueCat manages billing via the native stores.
  // Use platform-specific destination to avoid wrong-store links.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Platform } = require('react-native');
  return Platform.OS === 'ios'
    ? 'https://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';
};

const savePremiumLocally = async (plan: Plan, metadata?: RevenueCatPremiumMetadata) => {
  // expiry = 0 means "managed by RevenueCat". Store/trial expiry is synced separately
  // as premium_rc_expiry_ms so admin can display it without making the client expire early.
  await persistStorePremiumLocally(plan, metadata);
};

// ── Контекстные герои ─────────────────────────────────────────────────────────
interface HeroConfig {
  emoji: string;
  titleRu: string;
  titleUk: string;
  titleEs: string;
  subtitleRu: string;
  subtitleUk: string;
  subtitleEs: string;
  highlightRow: number; // индекс строки сравнения для подсветки (0-5)
}

function getHero(
  ctx: PremiumContext,
  streakDays: number,
  lessonsDone: number,
  savedCards: number,
): HeroConfig {
  const copy = getPaywallCopy(ctx);
  switch (ctx) {
    case 'arena':
      return {
        emoji: '⚔️',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'no_energy':
      return {
        emoji: '⚡',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 0,
      };
    case 'course_after_lesson3':
    case 'lesson_b1':
      return {
        emoji: '🎓',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 0,
      };
    case 'quiz_limit':
      return {
        emoji: '⚡',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'quiz_level':
      return {
        emoji: '🧠',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'quiz_medium':
      return {
        emoji: '🔥',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'quiz_hard':
      return {
        emoji: '💜',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 1,
      };
    case 'flashcard_limit':
      return {
        emoji: '📚',
        titleRu: savedCards > 0 ? `Сохранено ${savedCards}/20 карточек` : copy.titleRu,
        titleUk: savedCards > 0 ? `Збережено ${savedCards}/20 карток` : copy.titleUk,
        titleEs: savedCards > 0 ? `Guardadas ${savedCards}/20 tarjetas` : copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 2,
      };
    case 'streak':
      return {
        emoji: '🔥',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 4,
      };
    case 'theme':
      return {
        emoji: '🎨',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: 3,
      };
    case 'club':
      return {
        emoji: '🏆',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
    case 'trainer':
    case 'trainer_limit':
    case 'diagnosis_training':
      return {
        emoji: '🧠',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
    case 'mastery':
      return {
        emoji: '🔁',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
    case 'stats':
    case 'heatmap':
    case 'patterns':
    case 'percentiles':
      return {
        emoji: '📊',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
    default:
      return {
        emoji: '✨',
        titleRu: copy.titleRu,
        titleUk: copy.titleUk,
        titleEs: copy.titleEs,
        subtitleRu: copy.subtitleRu,
        subtitleUk: copy.subtitleUk,
        subtitleEs: copy.subtitleEs,
        highlightRow: -1,
      };
  }
}


/** Подсветка правой колонки на пейволле (контраст на тёмном фоне карточки). */
const PAYWALL_COMPARISON_PREMIUM_COLOR = '#6EA8FF';

/** Сравнение free → Premium на пейволле (копии синхронизируй с реальными ограничениями в коде). */
type PaywallComparisonRow = {
  emoji: string;
  titleRu: string;
  titleUk: string;
  titleEs: string;
  titlePlanned: PremiumPlannedCopy;
  freeRu: string;
  freeUk: string;
  freeEs: string;
  freePlanned: PremiumPlannedCopy;
  premRu: string;
  premUk: string;
  premEs: string;
  premPlanned: PremiumPlannedCopy;
  /** Вторая строка премиум-текста (напр. аналитика). */
  premRu2?: string;
  premUk2?: string;
  premEs2?: string;
  premPlanned2?: PremiumPlannedCopy;
};

const PAYWALL_COMPARISON_ROWS: readonly PaywallComparisonRow[] = [
  {
    emoji: '📚',
    titleRu: 'Уроки',
    titleUk: 'Уроки',
    titleEs: 'Lecciones',
    titlePlanned: { 'pt-BR': 'Lições', vi: 'Bài học', id: 'Pelajaran', tr: 'Dersler', pl: 'Lekcje' },
    freeRu: 'Уроки 1–8',
    freeUk: 'Уроки 1–8',
    freeEs: 'Lecciones 1–8',
    freePlanned: { 'pt-BR': 'Lições 1–8', vi: 'Bài 1–8', id: 'Pelajaran 1–8', tr: '1–8. dersler', pl: 'Lekcje 1–8' },
    premRu: 'Все уроки',
    premUk: 'Всі уроки',
    premEs: 'All lessons',
    premPlanned: { 'pt-BR': 'Todas as lições', vi: 'Tất cả bài học', id: 'Semua pelajaran', tr: 'Tüm dersler', pl: 'Wszystkie lekcje' },
  },
  {
    emoji: '⚡',
    titleRu: 'Квизы',
    titleUk: 'Квізи',
    titleEs: 'Quizzes',
    titlePlanned: { 'pt-BR': 'Quizzes', vi: 'Quiz', id: 'Kuis', tr: 'Quizler', pl: 'Quizy' },
    freeRu: 'Только уровень Easy',
    freeUk: 'Лише рівень Easy',
    freeEs: 'Solo nivel Fácil',
    freePlanned: { 'pt-BR': 'Só nível Easy', vi: 'Chỉ mức Easy', id: 'Hanya level Easy', tr: 'Sadece Easy seviyesi', pl: 'Tylko poziom Easy' },
    premRu: 'Все уровни',
    premUk: 'Усі рівні',
    premEs: 'Todos los niveles',
    premPlanned: { 'pt-BR': 'Todos os níveis', vi: 'Tất cả mức', id: 'Semua level', tr: 'Tüm seviyeler', pl: 'Wszystkie poziomy' },
  },
  {
    emoji: '🃏',
    titleRu: 'Карточки',
    titleUk: 'Картки',
    titleEs: 'Tarjetas',
    titlePlanned: { 'pt-BR': 'Cartões', vi: 'Thẻ', id: 'Kartu', tr: 'Kartlar', pl: 'Fiszki' },
    freeRu: 'До 20 сохранённых',
    freeUk: 'До 20 збережених',
    freeEs: 'Hasta 20 guardadas',
    freePlanned: { 'pt-BR': 'Até 20 salvos', vi: 'Tối đa 20 thẻ đã lưu', id: 'Hingga 20 tersimpan', tr: '20 kayda kadar', pl: 'Do 20 zapisanych' },
    premRu: 'Без ограничений',
    premUk: 'Без обмежень',
    premEs: 'Sin límites',
    premPlanned: { 'pt-BR': 'Sem limites', vi: 'Không giới hạn', id: 'Tanpa batas', tr: 'Sınırsız', pl: 'Bez limitów' },
  },
  {
    emoji: '🔋',
    titleRu: 'Энергия',
    titleUk: 'Енергія',
    titleEs: 'Energía',
    titlePlanned: { 'pt-BR': 'Energia', vi: 'Năng lượng', id: 'Energi', tr: 'Enerji', pl: 'Energia' },
    freeRu: '+1 ⚡ ~10 мин',
    freeUk: '+1 ⚡ ~10 хв',
    freeEs: '+1 ⚡ ~10 min',
    freePlanned: { 'pt-BR': '+1 ⚡ ~10 min', vi: '+1 ⚡ ~10 phút', id: '+1 ⚡ ~10 menit', tr: '+1 ⚡ ~10 dk', pl: '+1 ⚡ ~10 min' },
    premRu: 'Не заканчивается',
    premUk: 'Не закінчується',
    premEs: 'No se agota',
    premPlanned: { 'pt-BR': 'Não acaba', vi: 'Không cạn', id: 'Tidak habis', tr: 'Bitmez', pl: 'Nie kończy się' },
  },
  {
    emoji: '⚔️',
    titleRu: 'Арена',
    titleUk: 'Арена',
    titleEs: 'Arena',
    titlePlanned: { 'pt-BR': 'Arena', vi: 'Arena', id: 'Arena', tr: 'Arena', pl: 'Arena' },
    freeRu: 'Лимит матчей в день и ⚡ за вход',
    freeUk: 'Ліміт матчів на день і ⚡ за вхід',
    freeEs: 'Tope diario y ⚡ por partida',
    freePlanned: { 'pt-BR': 'Limite diário e ⚡ por partida', vi: 'Giới hạn ngày và ⚡ mỗi trận', id: 'Batas harian dan ⚡ per pertandingan', tr: 'Günlük sınır ve maç başına ⚡', pl: 'Limit dzienny i ⚡ za mecz' },
    premRu: 'Безлимит',
    premUk: 'Безліміт',
    premEs: 'Ilimitada',
    premPlanned: { 'pt-BR': 'Ilimitada', vi: 'Không giới hạn', id: 'Tanpa batas', tr: 'Sınırsız', pl: 'Bez limitu' },
  },
  {
    emoji: '📊',
    titleRu: 'Аналитика',
    titleUk: 'Аналітика',
    titleEs: 'Analítica',
    titlePlanned: { 'pt-BR': 'Análises', vi: 'Phân tích', id: 'Analitik', tr: 'Analiz', pl: 'Analityka' },
    freeRu: 'Недоступна в бесплатном режиме',
    freeUk: 'Недоступна у безкоштовному режимі',
    freeEs: 'No disponible en modo gratis',
    freePlanned: { 'pt-BR': 'Indisponível no modo grátis', vi: 'Không có ở chế độ miễn phí', id: 'Tidak tersedia di mode gratis', tr: 'Ücretsiz modda yok', pl: 'Niedostępna w trybie darmowym' },
    premRu: 'Детальная персонализированная',
    premUk: 'Детальна персоналізована',
    premEs: 'Analítica personalizada',
    premPlanned: { 'pt-BR': 'Análise personalizada', vi: 'Phân tích cá nhân hóa', id: 'Analitik personal', tr: 'Kişiselleştirilmiş analiz', pl: 'Spersonalizowana analityka' },
    premRu2: 'аналитика',
    premUk2: 'аналітика',
    premEs2: 'detallada',
    premPlanned2: { 'pt-BR': 'detalhada', vi: 'chi tiết', id: 'terperinci', tr: 'detaylı', pl: 'szczegółowa' },
  },
  {
    emoji: '🔁',
    titleRu: 'Повторы уроков',
    titleUk: 'Повтори уроків',
    titleEs: 'Repetir lecciones',
    titlePlanned: { 'pt-BR': 'Repetir lições', vi: 'Ôn lại bài học', id: 'Ulang pelajaran', tr: 'Ders tekrarı', pl: 'Powtórki lekcji' },
    freeRu: 'За осколки при повторе',
    freeUk: 'За осколки за повтор',
    freeEs: 'Con fragmentos por repetición',
    freePlanned: { 'pt-BR': 'Com fragmentos por repetição', vi: 'Tốn mảnh khi ôn lại', id: 'Dengan fragmen per pengulangan', tr: 'Tekrarda parça harcanır', pl: 'Za odłamki przy powtórce' },
    premRu: 'Без ограничений',
    premUk: 'Без обмежень',
    premEs: 'Sin límites',
    premPlanned: { 'pt-BR': 'Sem limites', vi: 'Không giới hạn', id: 'Tanpa batas', tr: 'Sınırsız', pl: 'Bez limitów' },
  },
  {
    emoji: '🎨',
    titleRu: 'Темы интерфейса',
    titleUk: 'Теми інтерфейсу',
    titleEs: 'Temas de interfaz',
    titlePlanned: { 'pt-BR': 'Temas de interface', vi: 'Chủ đề giao diện', id: 'Tema antarmuka', tr: 'Arayüz temaları', pl: 'Motywy interfejsu' },
    freeRu: 'Только базовые темы',
    freeUk: 'Лише базові теми',
    freeEs: 'Solo temas básicos',
    freePlanned: { 'pt-BR': 'Só temas básicos', vi: 'Chỉ chủ đề cơ bản', id: 'Hanya tema dasar', tr: 'Sadece temel temalar', pl: 'Tylko podstawowe motywy' },
    premRu: 'Forest и Neon',
    premUk: 'Forest і Neon',
    premEs: 'Forest y Neon',
    premPlanned: { 'pt-BR': 'Forest e Neon', vi: 'Forest và Neon', id: 'Forest dan Neon', tr: 'Forest ve Neon', pl: 'Forest i Neon' },
  },
  {
    emoji: '🏆',
    titleRu: 'Лидерборды',
    titleUk: 'Лідерборди',
    titleEs: 'Clasificaciones',
    titlePlanned: { 'pt-BR': 'Classificações', vi: 'Bảng xếp hạng', id: 'Klasemen', tr: 'Sıralamalar', pl: 'Rankingi' },
    freeRu: 'Обычное имя в списках',
    freeUk: 'Звичайне ім\'я в списках',
    freeEs: 'Nombre estándar en listas',
    freePlanned: { 'pt-BR': 'Nome padrão nas listas', vi: 'Tên thường trong danh sách', id: 'Nama standar di daftar', tr: 'Listelerde standart ad', pl: 'Zwykła nazwa na listach' },
    premRu: 'Золотое имя в лидербордах',
    premUk: 'Золоте ім\'я в лідербордах',
    premEs: 'Nombre dorado en rankings',
    premPlanned: { 'pt-BR': 'Nome dourado nos rankings', vi: 'Tên vàng trên bảng xếp hạng', id: 'Nama emas di ranking', tr: 'Sıralamalarda altın ad', pl: 'Złota nazwa w rankingach' },
  },
];

/** Экран «Управление Premium» (из настроек): напоминание, что уже включено */
const MANAGE_VIEW_PREMIUM_BENEFITS: ({ ru: string; uk: string; es: string } & PremiumPlannedCopy)[] = [
  {
    ru: 'Безлимитная энергия для уроков, квизов, экзаменов и другого контента без ожидания.',
    uk: 'Безлімітна енергія для уроків, квізів, іспитів та іншого контенту без очікування.',
    es: 'Energía ilimitada para lecciones, quizzes, exámenes y otro contenido sin esperas.',
    'pt-BR': 'Energia ilimitada para lições, quizzes, exames e outros conteúdos sem espera.',
    vi: 'Năng lượng không giới hạn cho bài học, quiz, bài kiểm tra và nội dung khác mà không phải chờ.',
    id: 'Energi tanpa batas untuk pelajaran, kuis, ujian, dan konten lain tanpa menunggu.',
    tr: 'Dersler, quizler, sınavlar ve diğer içerikler için beklemeden sınırsız enerji.',
    pl: 'Nieograniczona energia do lekcji, quizów, egzaminów i innych treści bez czekania.',
  },
  {
    ru: 'Арена без дневного лимита матчей и без затрат энергии на рейтинговые игры.',
    uk: 'Арена без денного ліміту матчів і без витрат енергії на рейтингові ігри.',
    es: 'Arena sin límite diario de partidas y sin gastar energía en juegos clasificatorios.',
    'pt-BR': 'Arena sem limite diário de partidas e sem gastar energia em jogos ranqueados.',
    vi: 'Arena không có giới hạn trận hằng ngày và không tốn năng lượng cho trận xếp hạng.',
    id: 'Arena tanpa batas pertandingan harian dan tanpa memakai energi untuk game peringkat.',
    tr: 'Dereceli oyunlarda enerji harcamadan ve günlük maç sınırı olmadan Arena.',
    pl: 'Arena bez dziennego limitu meczów i bez zużywania energii na gry rankingowe.',
  },
  {
    ru: 'Уроки текущего уровня открыты полностью. Следующие уровни открываются после экзаменов.',
    uk: 'Уроки поточного рівня відкриті повністю. Наступні рівні відкриваються після іспитів.',
    es: 'Las lecciones del nivel actual están abiertas por completo. Los siguientes niveles se desbloquean después de los exámenes.',
    'pt-BR': 'As lições do nível atual ficam totalmente abertas. Os próximos níveis desbloqueiam depois dos exames.',
    vi: 'Các bài học của cấp hiện tại được mở toàn bộ. Cấp tiếp theo mở sau bài kiểm tra.',
    id: 'Pelajaran level saat ini terbuka sepenuhnya. Level berikutnya terbuka setelah ujian.',
    tr: 'Mevcut seviyedeki dersler tamamen açık. Sonraki seviyeler sınavlardan sonra açılır.',
    pl: 'Lekcje obecnego poziomu są w pełni otwarte. Kolejne poziomy odblokowują się po egzaminach.',
  },
  {
    ru: 'Квизы можно проходить регулярно без дневного лимита.',
    uk: 'Квізи можна проходити регулярно без денного ліміту.',
    es: 'Puedes hacer cuestionarios con regularidad, sin límite diario.',
    'pt-BR': 'Você pode fazer quizzes com regularidade, sem limite diário.',
    vi: 'Bạn có thể làm quiz đều đặn mà không bị giới hạn hằng ngày.',
    id: 'Kamu bisa mengerjakan kuis secara rutin tanpa batas harian.',
    tr: 'Quizleri günlük sınıra takılmadan düzenli çözebilirsin.',
    pl: 'Możesz regularnie robić quizy bez dziennego limitu.',
  },
  {
    ru: 'Неограниченное количество сохранённых карточек.',
    uk: 'Необмежена кількість збережених карток.',
    es: 'Cantidad ilimitada de tarjetas guardadas.',
    'pt-BR': 'Quantidade ilimitada de cartões salvos.',
    vi: 'Không giới hạn số thẻ đã lưu.',
    id: 'Jumlah kartu tersimpan tanpa batas.',
    tr: 'Sınırsız sayıda kaydedilmiş kart.',
    pl: 'Nieograniczona liczba zapisanych fiszek.',
  },
  {
    ru: 'Заморозка серии: первая защита доступна бесплатно перед использованием осколков.',
    uk: 'Заморозка серії: перший захист доступний безкоштовно перед використанням осколків.',
    es: 'Protección de racha: la primera está disponible gratis antes de usar fragmentos.',
    'pt-BR': 'Proteção de sequência: a primeira proteção fica grátis antes de usar fragmentos.',
    vi: 'Bảo vệ chuỗi: lần bảo vệ đầu tiên miễn phí trước khi dùng mảnh.',
    id: 'Perlindungan streak: perlindungan pertama tersedia gratis sebelum memakai fragmen.',
    tr: 'Seri koruması: parça kullanmadan önce ilk koruma ücretsizdir.',
    pl: 'Ochrona serii: pierwsza ochrona jest darmowa przed użyciem odłamków.',
  },
  {
    ru: 'Темы Premium: Forest и Neon. Gold открывается только как награда лиги.',
    uk: 'Premium-теми: Forest і Neon. Gold відкривається лише як нагорода ліги.',
    es: 'Temas Premium: Forest y Neon. Gold se desbloquea solo como recompensa de liga.',
    'pt-BR': 'Temas Premium: Forest e Neon. Gold desbloqueia apenas como recompensa de liga.',
    vi: 'Chủ đề Premium: Forest và Neon. Gold chỉ mở khóa như phần thưởng giải đấu.',
    id: 'Tema Premium: Forest dan Neon. Gold hanya terbuka sebagai hadiah liga.',
    tr: 'Premium temalar: Forest ve Neon. Gold yalnızca lig ödülü olarak açılır.',
    pl: 'Motywy Premium: Forest i Neon. Gold odblokowuje się tylko jako nagroda ligi.',
  },
  {
    ru: 'Профиль с премиальной подсветкой на главной странице и в лидербордах.',
    uk: 'Профіль із преміальною підсвіткою на головній сторінці та в лідербордах.',
    es: 'Perfil con resaltado premium en la pantalla principal y en las clasificaciones.',
    'pt-BR': 'Perfil com destaque premium na tela principal e nas classificações.',
    vi: 'Hồ sơ có hiệu ứng nổi bật Premium trên màn hình chính và bảng xếp hạng.',
    id: 'Profil dengan sorotan premium di layar utama dan klasemen.',
    tr: 'Ana ekranda ve sıralamalarda premium vurgulu profil.',
    pl: 'Profil z wyróżnieniem Premium na ekranie głównym i w rankingach.',
  },
];


/** Одна bento-ячейка зеркала прогресса: крупное число + подпись (Стиль 2 Игра по Библии). */
function ProgressMirrorStat({ value, label, t, f, accent }: {
  value: number;
  label: string;
  t: { textPrimary: string; textSecond: string };
  f: { sub: number; caption: number };
  accent: string;
}) {
  return (
    <View style={{ minWidth: 64, alignItems: 'flex-start' }}>
      <Text style={{ color: accent, fontSize: f.sub * 1.4, fontWeight: '800' }}>
        {value.toLocaleString('ru-RU')}
      </Text>
      <Text style={{ color: t.textSecond, fontSize: f.caption, marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
}

function getPersonalValueLine(ctx: PremiumContext, streakDays: number, lessonsDone: number, savedCards: number, lang: Lang): string {
  if (ctx === 'intro_ended') {
    // Библия: gain-framing. Если есть личные данные — называем накопленное;
    // если данных нет (частый случай — вызов без params) — корректный gain-фоллбэк,
    // а НЕ проваливаемся в чужую generic-ветку.
    const parts: string[] = [];
    const partsByLang = {
      ru: { streak: `серия ${streakDays} дн.`, lessons: `${lessonsDone} сессий`, cards: `${savedCards} фраз` },
      uk: { streak: `серія ${streakDays} дн.`, lessons: `${lessonsDone} сесій`, cards: `${savedCards} фраз` },
      es: { streak: `racha de ${streakDays} días`, lessons: `${lessonsDone} sesiones`, cards: `${savedCards} frases` },
      'pt-BR': { streak: `sequência de ${streakDays} dias`, lessons: `${lessonsDone} sessões`, cards: `${savedCards} frases` },
      vi: { streak: `chuỗi ${streakDays} ngày`, lessons: `${lessonsDone} phiên`, cards: `${savedCards} cụm từ` },
      id: { streak: `streak ${streakDays} hari`, lessons: `${lessonsDone} sesi`, cards: `${savedCards} frasa` },
      tr: { streak: `${streakDays} günlük seri`, lessons: `${lessonsDone} oturum`, cards: `${savedCards} ifade` },
      pl: { streak: `seria ${streakDays} dni`, lessons: `${lessonsDone} sesji`, cards: `${savedCards} fraz` },
    } as const;
    const key = (partsByLang as Record<string, { streak: string; lessons: string; cards: string }>)[lang]
      ? lang
      : 'ru';
    const L = (partsByLang as Record<string, { streak: string; lessons: string; cards: string }>)[key];
    if (streakDays > 0) parts.push(L.streak);
    if (lessonsDone > 0) parts.push(L.lessons);
    if (savedCards > 0) parts.push(L.cards);
    const earned = parts.join(' · ');
    if (earned) {
      // gain-framing: называем накопленное и продолжаем темп
      return triLang(lang, {
        ru: `Уже твоё: ${earned}. Premium держит этот темп.`,
        uk: `Уже твоє: ${earned}. Premium тримає цей темп.`,
        es: `Ya es tuyo: ${earned}. Premium mantiene ese ritmo.`,
        'pt-BR': `Já é seu: ${earned}. O Premium mantém esse ritmo.`,
        vi: `Đã là của bạn: ${earned}. Premium giữ nhịp này.`,
        id: `Sudah jadi milikmu: ${earned}. Premium menjaga ritme ini.`,
        tr: `Artık senin: ${earned}. Premium bu ritmi korur.`,
        pl: `Już twoje: ${earned}. Premium utrzymuje to tempo.`,
      });
    }
    // нет личных данных → корректный gain-фоллбэк (не проваливаемся в generic)
    return triLang(lang, {
      ru: 'Полный доступ открыт навсегда. Занимайся в своём темпе.',
      uk: 'Повний доступ відкритий назавжди. Навчайся у своєму темпі.',
      es: 'Acceso completo para siempre. Aprende a tu ritmo.',
      'pt-BR': 'Acesso completo para sempre. Aprenda no seu ritmo.',
      vi: 'Truy cập đầy đủ mãi mãi. Học theo nhịp của bạn.',
      id: 'Akses penuh selamanya. Belajar sesuai ritmemu.',
      tr: 'Tam erişim kalıcı. Kendi ritminde öğren.',
      pl: 'Pełny dostęp na zawsze. Ucz się we własnym tempie.',
    });
  }
  if (ctx === 'streak' && streakDays > 0) {
    return triLang(lang, {
      ru: `Сейчас у тебя серия ${streakDays} дн. Premium даёт заморозку и спокойнее ритм без пауз.`,
      uk: `Зараз у тебе серія ${streakDays} дн. Premium дає заморозку і спокійніший ритм без пауз.`,
      es: `Llevas ${streakDays} ${streakDays === 1 ? 'día' : 'días'} de racha. Premium añade protección y más constancia.`,
      'pt-BR': `Você está em uma sequência de ${streakDays} ${streakDays === 1 ? 'dia' : 'dias'}. Premium adiciona proteção e mais constância.`,
      vi: `Bạn đang có chuỗi ${streakDays} ngày. Premium thêm bảo vệ chuỗi và nhịp học ổn định hơn.`,
      id: `Streak kamu sudah ${streakDays} hari. Premium memberi perlindungan dan ritme yang lebih tenang.`,
      tr: `${streakDays} günlük bir serin var. Premium koruma ve daha sakin bir çalışma ritmi sağlar.`,
      pl: `Masz serię ${streakDays} dni. Premium daje ochronę serii i spokojniejszy rytm.`,
    });
  }
  if (ctx === 'course_after_lesson3') {
    return triLang(lang, {
      ru: `Уроков пройдено: ${lessonsDone}. Premium откроет текущий уровень целиком, а следующий — после экзамена.`,
      uk: `Уроків пройдено: ${lessonsDone}. Premium відкриє поточний рівень повністю, а наступний — після екзамену.`,
      es: `Lecciones completadas: ${lessonsDone}. Premium abre tu nivel actual completo; el siguiente se abre con examen.`,
      'pt-BR': `Lições concluídas: ${lessonsDone}. Premium abre todo o nível atual; o próximo abre com exame.`,
      vi: `Bài học đã hoàn thành: ${lessonsDone}. Premium mở toàn bộ cấp hiện tại; cấp tiếp theo mở bằng bài kiểm tra.`,
      id: `Pelajaran selesai: ${lessonsDone}. Premium membuka seluruh level saat ini; level berikutnya dibuka lewat ujian.`,
      tr: `Tamamlanan ders: ${lessonsDone}. Premium mevcut seviyenin tamamını açar; sonraki seviye sınavla açılır.`,
      pl: `Ukończone lekcje: ${lessonsDone}. Premium odblokuje cały obecny poziom; następny otworzy się po egzaminie.`,
    });
  }
  if (ctx === 'lesson_b1') {
    return triLang(lang, {
      ru: `Уроков пройдено: ${lessonsDone}. Premium снимает замки с уроков текущего уровня.`,
      uk: `Уроків пройдено: ${lessonsDone}. Premium знімає замки з уроків поточного рівня.`,
      es: `Lecciones completadas: ${lessonsDone}. Premium quita los candados del nivel actual.`,
      'pt-BR': `Lições concluídas: ${lessonsDone}. Premium remove os bloqueios do nível atual.`,
      vi: `Bài học đã hoàn thành: ${lessonsDone}. Premium mở khóa các bài của cấp hiện tại.`,
      id: `Pelajaran selesai: ${lessonsDone}. Premium membuka kunci pelajaran di level saat ini.`,
      tr: `Tamamlanan ders: ${lessonsDone}. Premium mevcut seviyedeki derslerin kilidini kaldırır.`,
      pl: `Ukończone lekcje: ${lessonsDone}. Premium zdejmuje blokady z lekcji obecnego poziomu.`,
    });
  }
  if (ctx === 'flashcard_limit' && savedCards > 0) {
    return triLang(lang, {
      ru: `У тебя уже ${savedCards} карточек. Premium снимает лимит полностью.`,
      uk: `У тебе вже ${savedCards} карток. Premium знімає ліміт повністю.`,
      es: `Ya tienes ${savedCards} tarjetas. Premium quita el límite por completo.`,
      'pt-BR': `Você já tem ${savedCards} cartões. Premium remove o limite por completo.`,
      vi: `Bạn đã có ${savedCards} thẻ. Premium gỡ hoàn toàn giới hạn.`,
      id: `Kamu sudah punya ${savedCards} kartu. Premium menghapus batas sepenuhnya.`,
      tr: `Zaten ${savedCards} kartın var. Premium sınırı tamamen kaldırır.`,
      pl: `Masz już ${savedCards} fiszek. Premium całkowicie usuwa limit.`,
    });
  }
  if (ctx === 'quiz_limit') {
    return triLang(lang, {
      ru: 'Ты уже прошёл несколько квизов — значит, формат работает. Premium убирает дневной лимит.',
      uk: 'Ти вже пройшов кілька квізів — формат працює. Premium прибирає денний ліміт.',
      es: 'Ya completaste varios cuestionarios — el formato funciona. Premium quita el límite diario.',
      'pt-BR': 'Você já completou vários quizzes — o formato funciona. Premium remove o limite diário.',
      vi: 'Bạn đã hoàn thành một vài bài kiểm tra — định dạng này hoạt động. Premium gỡ giới hạn hằng ngày.',
      id: 'Kamu sudah menyelesaikan beberapa kuis — formatnya cocok. Premium hapus batas harian.',
      tr: 'Birkaç quiz tamamladın — format işe yarıyor. Premium günlük limiti kaldırır.',
      pl: 'Ukończyłeś już kilka quizów — format działa. Premium usuwa dzienny limit.',
    });
  }
  if (ctx === 'trainer_limit') {
    // Библия: gain-framing, без хардкода числа сессий (теперь A/B-переменное).
    return triLang(lang, {
      ru: 'Ты уже втянулся в ритм. Premium открывает безлимит сессий Тренера во всех режимах.',
      uk: 'Ти вже втягнувся в ритм. Premium відкриває безліміт сесій Тренера в усіх режимах.',
      es: 'Ya entraste en ritmo. Premium abre sesiones del Entrenador sin límite en todos los modos.',
      'pt-BR': 'Você já entrou no ritmo. Premium abre sessões do Treinador sem limite em todos os modos.',
      vi: 'Bạn đã vào nhịp rồi. Premium mở không giới hạn phiên Luyện tập trong mọi chế độ.',
      id: 'Kamu sudah masuk ritme. Premium membuka sesi Pelatih tanpa batas di semua mode.',
      tr: 'Ritmi yakaladın. Premium tüm modlarda sınırsız Antrenör oturumu açar.',
      pl: 'Złapałeś rytm. Premium otwiera nieograniczone sesje Trenera we wszystkich trybach.',
    });
  }
  if (ctx === 'diagnosis_training') {
    return triLang(lang, {
      ru: 'Диагностика нашла твои слабые места. Premium даёт неограниченный доступ к тренировкам по каждому из них.',
      uk: 'Діагностика знайшла твої слабкі місця. Premium дає необмежений доступ до тренувань по кожному з них.',
      es: 'El diagnóstico encontró tus puntos débiles. Premium te da acceso ilimitado para entrenar cada uno.',
      'pt-BR': 'O diagnóstico encontrou seus pontos fracos. Premium dá acesso ilimitado para treinar cada um deles.',
      vi: 'Chẩn đoán đã tìm ra điểm yếu của bạn. Premium cho phép luyện tập không giới hạn cho từng điểm đó.',
      id: 'Diagnosis menemukan titik lemahmu. Premium memberi akses tak terbatas untuk latihan setiap titik lemah itu.',
      tr: 'Tanılama zayıf noktalarını buldu. Premium her biri için sınırsız antrenman erişimi sağlar.',
      pl: 'Diagnoza znalazła twoje słabe punkty. Premium daje nieograniczony dostęp do treningu każdego z nich.',
    });
  }
  if (ctx === 'mastery') {
    return triLang(lang, {
      ru: 'Повторное прохождение урока — это настоящее закрепление. Premium делает это без ограничений.',
      uk: 'Повторне проходження уроку — справжнє закріплення. Premium робить це без обмежень.',
      es: 'Repasar la lección es consolidación real. Premium lo hace sin límites.',
      'pt-BR': 'Revisar a lição é consolidação real. Premium faz isso sem limites.',
      vi: 'Ôn lại bài học là củng cố thực sự. Premium cho phép bạn làm điều đó không giới hạn.',
      id: 'Mengulang pelajaran adalah penguatan nyata. Premium melakukannya tanpa batas.',
      tr: 'Dersi tekrar yapmak gerçek pekiştirme. Premium bunu sınırsız yapar.',
      pl: 'Powtarzanie lekcji to prawdziwe utrwalanie. Premium robi to bez ograniczeń.',
    });
  }
  return triLang(lang, {
    ru: 'После активации Premium ты сразу получишь больше пользы из каждой сессии.',
    uk: 'Після активації Premium ти відразу отримаєш більше користі з кожної сесії.',
    es: 'Tras activar Premium sacarás más partido a cada sesión al momento.',
    'pt-BR': 'Depois de ativar o Premium, você tira mais proveito de cada sessão imediatamente.',
    vi: 'Sau khi kích hoạt Premium, bạn sẽ nhận được nhiều giá trị hơn từ mỗi phiên học.',
    id: 'Setelah mengaktifkan Premium, setiap sesi langsung jadi lebih bermanfaat.',
    tr: 'Premium etkinleşince her oturumdan hemen daha fazla verim alırsın.',
    pl: 'Po aktywacji Premium od razu wyciągniesz więcej z każdej sesji.',
  });
}

// ── Строки сравнения ──────────────────────────────────────────────────────────

const PREMIUM_DATE_LOCALE: Record<Lang, string> = {
  ru: 'ru-RU',
  uk: 'uk-UA',
  es: 'es-ES',
  'pt-BR': 'pt-BR',
  vi: 'vi-VN',
  id: 'id-ID',
  tr: 'tr-TR',
  pl: 'pl-PL',
};

const formatDate = (ts: number, lang: Lang) =>
  new Date(ts).toLocaleDateString(PREMIUM_DATE_LOCALE[lang] ?? 'ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

/**
 * `storeProductHasTrialIntro` импортирован из `./premium_trial_signal` — общая логика
 * проверки реального intro phase из App Store / Google Play.
 */

// ── Компонент ─────────────────────────────────────────────────────────────────
export default function PremiumModal() {
  const router = useRouter();
  const effectiveOs = useEffectivePlatformOS();
  const insets = useSafeAreaInsets();
  const goBack = () => {
    safeRouterBack(router);
  };
  const params = useLocalSearchParams<{
    context?: string;
    streak?: string;
    lessons_done?: string;
    saved?: string;
    level?: string;
    manage?: string;
    source?: string;
    /** Предвыбор плана из онбординга/диплинка: 'monthly' | 'yearly' | 'annual'. */
    plan?: string;
    _force_trial_ui?: string;
    _mock_yearly_price?: string;
    _mock_yearly_monthly?: string;
    _mock_monthly_price?: string;
  }>();
  const manageRaw = params.manage;
  /** Стабильный флаг без зависимости от нового объекта params на каждом ререндере */
  const openManageFromSettings =
    manageRaw === '1' || (Array.isArray(manageRaw) && manageRaw[0] === '1');
  /** Admin-only QA: форсит показ trial-UI (золотая лента + «Бесплатно» в карточках)
      даже когда магазин не вернул intro phase. Проставляется ТОЛЬКО из admin-панели,
      пользователь без deep-link доступа сам его не передаст. */
  const forceTrialUI = params._force_trial_ui === '1';
  const allowMockStorePricePreview = __DEV__ && !IS_STORE_RELEASE;
  const mockYearlyPrice = allowMockStorePricePreview ? routeParamString(params._mock_yearly_price) : '';
  const mockYearlyMonthlyEquivalent = allowMockStorePricePreview ? routeParamString(params._mock_yearly_monthly) : '';
  const mockMonthlyPrice = allowMockStorePricePreview ? routeParamString(params._mock_monthly_price) : '';

  const ctx = normalizePremiumContext(params.context);

  // A/B: 50% новых пользователей видят высококонверсионный v2-пейвол.
  // manage-режим всегда остаётся на v1 (там управление подпиской, v2 его не реализует).
  useEffect(() => {
    if (openManageFromSettings) return;
    void AsyncStorage.getItem('paywall_variant').then((stored) => {
      if (stored === 'v2') {
        router.replace('/premium_modal_v2' as any);
      } else if (stored === null) {
        // Первое открытие — назначаем вариант детерминированно по userId-hash,
        // fallback: Math.random() для скорости (не нужна воспроизводимость между сессиями).
        const variant = Math.random() < 0.5 ? 'v2' : 'v1';
        void AsyncStorage.setItem('paywall_variant', variant);
        if (variant === 'v2') router.replace('/premium_modal_v2' as any);
      }
      // stored === 'v1' → остаёмся здесь
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sourceParam = routeParamString(params.source);
  const paywallOpenOrigin = sourceParam || 'direct';
  const revenueContext = paywallOpenOrigin !== 'direct' ? paywallOpenOrigin : (openManageFromSettings ? 'settings' : ctx);
  const streakDays   = parseInt(params.streak       ?? '0') || 0;
  const lessonsDone  = parseInt(params.lessons_done ?? '0') || 0;
  const savedCards   = parseInt(params.saved        ?? '0') || 0;
  /** Один `paywall_plan_select` на пару (context, plan) за открытие экрана — без дублей карточка + CTA. */
  const lastPaywallPlanSelectLoggedRef = useRef<Plan | null>(null);
  const logPaywallPlanSelectDeduped = useCallback((plan: Plan) => {
    if (lastPaywallPlanSelectLoggedRef.current === plan) return;
    lastPaywallPlanSelectLoggedRef.current = plan;
    logPaywallPlanSelect(revenueContext, plan);
  }, [revenueContext]);

  useEffect(() => {
    lastPaywallPlanSelectLoggedRef.current = null;
    logPremiumModalOpened(ctx);
    logPaywallView(revenueContext);
    // Единое имя события для сквозной воронки v1+v2 (PostHog/Firebase-фасад).
    // Старые logPaywall* остаются для обратной совместимости дашбордов.
    void trackEvent('paywall_shown', { context: ctx, source: paywallOpenOrigin, paywall: 'v1' });
    if (ctx === 'course_after_lesson3') {
      logCoursePaywallAfterLesson3(lessonsDone);
    }
  }, [ctx, lessonsDone, revenueContext, paywallOpenOrigin]);
  const { theme: t, themeMode, f } = useTheme();
  const paywallCardBg = paywallGlassColor(t.bgCard, themeMode, 'card');
  const paywallSurfaceBg = paywallGlassColor(t.bgSurface, themeMode, 'surface');
  const paywallSurface2Bg = paywallGlassColor(t.bgSurface2, themeMode, 'soft');
  const paywallPrimaryBg = paywallGlassColor(t.bgPrimary, themeMode, 'primary');
  const paywallChromeBg = paywallGlassColor(t.bgCard, themeMode, 'chrome');
  const isCompassPaywall = false;
  const compassRadius = isCompassPaywall ? 9 : 16;
  const compassPanelRadius = isCompassPaywall ? 10 : 22;
  const compassIconRadius = isCompassPaywall ? 8 : 18;
  const compassSmallRadius = isCompassPaywall ? 7 : 12;
  const compassAccent = isCompassPaywall ? COMPASS_RICH.champagne : t.gold;
  const compassAccentSoft = isCompassPaywall ? COMPASS_RICH.washStrong : t.goldBg;
  const compassAccentBorder = isCompassPaywall ? COMPASS_RICH.hairlineStrong : t.gold + '66';
  const compassHairline = isCompassPaywall ? COMPASS_RICH.hairlineQuiet : t.gold + '2E';
  const compassPanelColors = isCompassPaywall
    ? COMPASS_GRADIENTS.premiumPanel
    : [paywallSurfaceBg, paywallCardBg, paywallSurface2Bg];
  const { lang } = useLang();
  const { reload: reloadEnergy } = useEnergy();
  const LP = (ru: string, uk: string, es: string, planned: PremiumPlannedCopy) => triLang(lang as Lang, {
    ru,
    uk,
    es,
    'pt-BR': planned['pt-BR'],
    vi: planned.vi,
    id: planned.id,
    tr: planned.tr,
    pl: planned.pl,
  });
  const renderPremiumEnergyGlyph = (size: number, width = size) => (
    <View style={{ width, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <EnergyIcon
        filled
        themeColor={t.gold}
        size={size}
        animateChange={false}
        shouldShake={false}
        themeMode={themeMode}
      />
    </View>
  );
  const renderPremiumShardGlyph = (size: number, width = size, amount = 0) => (
    <View style={{ width, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Image
        source={oskolokImageForPackShards(amount, themeMode)}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel="Осколки"
      />
    </View>
  );

  const preselectedPlan = normalizePlan(routeParamString(params.plan));
  const [selected,   setSelected]   = useState<Plan>(preselectedPlan ?? 'yearly');
  const [restoring,  setRestoring]  = useState(false);
  const [purchasing, setPurchasing] = useState(false);
  const [packages,   setPackages]   = useState<PremiumPackages>({});
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [packagesLoadAttempted, setPackagesLoadAttempted] = useState(false);
  // Размер главного CTA для бегущего блика (ShineOverlay требует явные width/height).
  const [ctaSize, setCtaSize] = useState({ w: 0, h: 0 });
  /** true = в 90-дн. «окне» после последней покупки/триал-флоу — не показываем копию 3 дня (локально). */
  const [trialReofferBlocked, setTrialReofferBlocked] = useState(false);

  // manage-view state
  type ViewMode = 'purchase' | 'manage';
  const [viewMode,    setViewMode]   = useState<ViewMode>(openManageFromSettings ? 'manage' : 'purchase');
  const [activePlan,  setActivePlan]  = useState<Plan | null>(null);
  const [isAdminGrantedPremium, setIsAdminGrantedPremium] = useState(false);
  const [expiryTs,    setExpiryTs]   = useState<number>(0);
  const [cancelled]  = useState(false);
  const [cancelSurveyVisible, setCancelSurveyVisible] = useState(false);
  const [cancelSurveyOtherText, setCancelSurveyOtherText] = useState('');
  const [changePlanConfirmVisible, setChangePlanConfirmVisible] = useState(false);
  const [exitTrialOfferVisible, setExitTrialOfferVisible] = useState(false);
  const exitTrialOfferSeenRef = useRef(false);
  const purchasingRef  = useRef(false);
  const ctaPulse       = useRef(new Animated.Value(1)).current;
  const badgeSparkle   = useRef(new Animated.Value(0)).current;
  const heroGlow       = useRef(new Animated.Value(0.35)).current;
  const heroFloat      = useRef(new Animated.Value(0)).current;
  // Entrance animation: пейвол появляется плавно снизу при открытии
  const entranceOpacity    = useRef(new Animated.Value(0)).current;
  const entranceTranslateY = useRef(new Animated.Value(52)).current;
  const entranceScale      = useRef(new Animated.Value(0.97)).current;

  const resolveCurrentPremiumState = useCallback(async () => {
    const [verifiedReal, verifiedVip] = await Promise.all([
      getVerifiedRealPremiumStatus().catch(() => false),
      getVerifiedVipStatus().catch(() => false),
    ]);
    const res = await AsyncStorage.multiGet([
      'premium_active',
      'premium_plan',
      'premium_expiry',
      'tester_no_premium',
      'admin_premium_override',
      'vip_active',
      'vip_plan',
      'vip_until',
      'vip_admin_override',
    ]);
    const active = res.find(r => r[0] === 'premium_active')?.[1];
    const rawPlan = String(res.find(r => r[0] === 'premium_plan')?.[1] ?? '').trim();
    const plan = normalizePlan(rawPlan);
    const expiry = parseInt(res.find(r => r[0] === 'premium_expiry')?.[1] || '0');
    const noPremium = res.find(r => r[0] === 'tester_no_premium')?.[1];
    const adminOverride = res.find(r => r[0] === 'admin_premium_override')?.[1];
    const vipActive = res.find(r => r[0] === 'vip_active')?.[1];
    const vipPlanRaw = String(res.find(r => r[0] === 'vip_plan')?.[1] ?? '').trim();
    const vipUntil = parseInt(res.find(r => r[0] === 'vip_until')?.[1] || '0');
    const vipOverride = res.find(r => r[0] === 'vip_admin_override')?.[1];
    const legacyAdminGrant =
      adminOverride === 'true' ||
      (rawPlan.toLowerCase() === 'admin_grant' && adminOverride !== 'false');
    const legacyAdminActive =
      noPremium !== 'true' &&
      legacyAdminGrant &&
      (expiry === 0 || expiry > Date.now());
    const vipStorageActive =
      noPremium !== 'true' &&
      vipActive === 'true' &&
      vipOverride !== 'false' &&
      (vipUntil === 0 || vipUntil > Date.now());
    const isAdmin = verifiedVip || vipStorageActive || legacyAdminActive;
    const adminExpiry = vipUntil > 0 ? vipUntil : expiry;
    const adminPlan = (() => {
      const normalizedVipPlan = normalizePlan(vipPlanRaw);
      if (normalizedVipPlan) return normalizedVipPlan;
      if (plan) return plan;
      if (adminExpiry > 0 && adminExpiry - Date.now() <= 45 * 24 * 60 * 60 * 1000) return 'monthly';
      return 'yearly';
    })();
    const hasLocalActive =
      noPremium !== 'true' &&
      active === 'true' &&
      !legacyAdminGrant &&
      !!plan &&
      (expiry === 0 || expiry > Date.now());
    const isPremium = noPremium === 'true' ? false : (verifiedReal || hasLocalActive || isAdmin);
    return {
      isPremium,
      plan: isAdmin ? adminPlan : plan,
      expiry: isAdmin ? adminExpiry : expiry,
      isAdmin,
    };
  }, []);

  const loadPremiumPackages = useCallback(async (): Promise<PremiumPackages> => {
    if (IS_EXPO_GO || DEV_IAP_BYPASS) return {};

    setPackagesLoadAttempted(true);
    setLoadingPackages(true);
    try {
      await initRevenueCat();
      if (!(await Purchases.isConfigured().catch(() => false))) return {};
      const offerings = await Purchases.getOfferings();
      const nextPackages = resolvePremiumPackages(offerings.current?.availablePackages ?? []);
      setPackages(nextPackages);
      return nextPackages;
    } catch {
      return {};
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  // Entrance animation при каждом маунте экрана
  useEffect(() => {
    entranceOpacity.setValue(0);
    entranceTranslateY.setValue(52);
    entranceScale.setValue(0.97);
    Animated.parallel([
      Animated.timing(entranceOpacity, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.spring(entranceTranslateY, {
        toValue: 0,
        tension: MOTION_SPRING_LEGACY.panel.tension,
        friction: MOTION_SPRING_LEGACY.panel.friction,
        useNativeDriver: true,
      }),
      Animated.spring(entranceScale, {
        toValue: 1,
        tension: MOTION_SPRING_LEGACY.panel.tension,
        friction: MOTION_SPRING_LEGACY.panel.friction,
        useNativeDriver: true,
      }),
    ]).start();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroGlow, { toValue: 0.62, duration: 1400, useNativeDriver: true }),
        Animated.timing(heroGlow, { toValue: 0.35, duration: 1400, useNativeDriver: true }),
      ])
    );
    const floatLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(heroFloat, { toValue: -4, duration: 1800, useNativeDriver: true }),
        Animated.timing(heroFloat, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ])
    );
    glowLoop.start();
    floatLoop.start();
    return () => {
      glowLoop.stop();
      floatLoop.stop();
    };
  }, [heroGlow, heroFloat]);

  // Пульс CTA-кнопки и мерцание бейджика
  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(ctaPulse, { toValue: 1.02, duration: 950, useNativeDriver: true }),
        Animated.timing(ctaPulse, { toValue: 1.0, duration: 950, useNativeDriver: true }),
      ])
    );
    const sparkleLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(badgeSparkle, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(badgeSparkle, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    pulseLoop.start();
    sparkleLoop.start();
    return () => { pulseLoop.stop(); sparkleLoop.stop(); };
  }, [ctaPulse, badgeSparkle]);

  /** Открытие с «Настроек»: без `[params]` в deps — объект params у роутера часто новый каждый кадр → эффект крутился бы снова и сбрасывал дату. */
  useEffect(() => {
    if (!openManageFromSettings) return;

    let cancelled = false;

    const run = async () => {
      setViewMode('manage');
      try {
        const { isPremium, plan, expiry, isAdmin } = await resolveCurrentPremiumState();

        if (cancelled) return;

        if (!isPremium) {
          setViewMode('purchase');
          return;
        }
        const effectivePlan = plan ?? 'yearly';
        setIsAdminGrantedPremium(isAdmin);
        setActivePlan(effectivePlan);
        setExpiryTs(prev => (expiry > 0 ? expiry : prev));
        setViewMode('manage');

        const hasExpiryHint = expiry > 0;

        if (!isAdmin && !hasExpiryHint && !IS_EXPO_GO && !DEV_IAP_BYPASS) {
          try {
            const info = await Purchases.getCustomerInfo();
            if (cancelled) return;
            const entitlement = info.entitlements.active['premium'];
            if (entitlement?.expirationDate) {
              setExpiryTs(new Date(entitlement.expirationDate).getTime());
            }
          } catch {
            /* noop */
          }
        }
      } catch {
        if (!cancelled) setViewMode('purchase');
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [openManageFromSettings, resolveCurrentPremiumState]);

  const hero = getHero(ctx, streakDays, lessonsDone, savedCards);
  const heroPlanned = getHeroPlannedCopy(ctx, savedCards);
  const benefits = CONTEXT_BENEFITS[ctx] ?? CONTEXT_BENEFITS.generic;
  const heroArt = PREMIUM_HERO_ART[ctx];
  const heroScrim = premiumHeroScrim(themeMode);
  const paywallComparisonPremiumColor =
    false ? '#F2C48D' : PAYWALL_COMPARISON_PREMIUM_COLOR;
  const personalValueLine = getPersonalValueLine(ctx, streakDays, lessonsDone, savedCards, lang as Lang);

  // План #5 «зеркало прогресса» + #4 перцентиль — асинхронно, не блокируем рендер.
  const [progressMirror, setProgressMirror] = React.useState<ProgressMirror | null>(null);
  const [percentileLine, setPercentileLine] = React.useState<string | null>(null);
  // План #2: urgency-таймер (порт из v2). Реальный дедлайн — окно персональной цены, НЕ фальшивая срочность.
  const [urgency, setUrgency] = React.useState<UrgencyState | null>(null);
  React.useEffect(() => {
    if (openManageFromSettings) return; // в manage-режиме urgency не нужен
    let cancelled = false;
    void (async () => {
      try {
        await activateUrgencyIfNeeded();
        const st = await getUrgencyState();
        if (!cancelled) setUrgency(st);
      } catch { /* no-op */ }
    })();
    return () => { cancelled = true; };
  }, [openManageFromSettings]);
  React.useEffect(() => {
    if (!urgency?.isActive) return;
    const id = setInterval(() => {
      setUrgency((prev) => {
        if (!prev?.isActive) return prev;
        const remaining = prev.remainingMs - 1000;
        if (remaining <= 0) return { isActive: false, remainingMs: 0, remainingFormatted: '00:00:00' };
        return { ...prev, remainingMs: remaining, remainingFormatted: formatCountdown(remaining) };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [urgency?.isActive]);
  // План #6: ротация отзывов (детерминированно по дню). В ПРОДЕ показываются только
  // verified-отзывы (anti-fake, App Review 5.1.1); черновики видны лишь в dev/preview.
  const [testimonials, setTestimonials] = React.useState<Testimonial[]>([]);
  React.useEffect(() => {
    const dayHash = Math.floor(Date.now() / (24 * 60 * 60 * 1000));
    const includeUnverified = __DEV__ && !IS_STORE_RELEASE;
    setTestimonials(pickTestimonials(lang as Lang, ctx, dayHash, 2, includeUnverified));
  }, [ctx, lang]);
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      // Зеркало прогресса: для intro_ended — дельта «за 3 дня», иначе lifetime «уже твоё».
      try {
        const m = ctx === 'intro_ended' ? await readIntroProgress() : await readProgressMirror();
        if (!cancelled && isMirrorWorthShowing(m)) setProgressMirror(m);
      } catch { /* пейвол не должен падать из-за статистики */ }
      // Перцентиль-строка только для релевантных high-value контекстов.
      if (ctx === 'streak' || ctx === 'intro_ended' || ctx === 'percentiles') {
        try {
          const { percentiles } = await loadPercentileData();
          if (cancelled) return;
          const line = pickPercentileLine(ctx, percentiles, { streak: streakDays }, lang as Lang);
          if (line) setPercentileLine(line);
        } catch { /* нет данных — молчим */ }
      }
    })();
    return () => { cancelled = true; };
  }, [ctx, streakDays, lang]);

  const yearlyStoreHasTrial = !trialReofferBlocked && storeProductHasTrialIntro(packages.yearly?.product);
  const monthlyStoreHasTrial = !trialReofferBlocked && storeProductHasTrialIntro(packages.monthly?.product);
  const hasStoreTrial = yearlyStoreHasTrial || monthlyStoreHasTrial;
  const showPrimaryTrialUi = shouldShowPrimaryTrialUi({
    forceTrialUI,
    source: params.source,
    hasStoreTrial,
  });
  const primaryYearlyHasTrial = showPrimaryTrialUi && (forceTrialUI || yearlyStoreHasTrial);
  const primaryMonthlyHasTrial = showPrimaryTrialUi && (forceTrialUI || monthlyStoreHasTrial);
  const primaryHasTrialOffer = primaryYearlyHasTrial || primaryMonthlyHasTrial;
  const exitTrialPlan: Plan = yearlyStoreHasTrial ? 'yearly' : 'monthly';
  const storePricesRequired = !IS_EXPO_GO && !DEV_IAP_BYPASS;
  const yearlyPrice = storePriceTrim(packages.yearly?.product.priceString) || mockYearlyPrice;
  const monthlyPrice = storePriceTrim(packages.monthly?.product.priceString) || mockMonthlyPrice;
  const yearlyMonthlyEquivalent = storePricePerMonthTrim(packages.yearly?.product) || mockYearlyMonthlyEquivalent;
  const selectedMonthlyEquivalent = selected === 'yearly' ? yearlyMonthlyEquivalent : '';
  // План #9: процент экономии. Сначала точно из pricePerMonth, иначе fallback из строк
  // (год vs месяц×12) — чтобы сигнал выгоды был ВСЕГДА, даже когда стор не отдал pricePerMonth.
  const savingsPct: number | null = computeSavingsPct({
    yearlyPerMonth: (packages.yearly?.product as { pricePerMonth?: number } | undefined)?.pricePerMonth,
    monthlyPerMonth: (packages.monthly?.product as { pricePerMonth?: number } | undefined)?.pricePerMonth,
    yearlyPriceStr: packages.yearly?.product.priceString ?? null,
    monthlyPriceStr: packages.monthly?.product.priceString ?? null,
  });
  // План #10: цена в день из годовой (decoupling, Правило 3 Библии). Валюта — из стора.
  // Точную сумму берём из числового product.price (без неоднозначности парсинга), строку — для валюты.
  const yearlyPerDay = computePerDayString(
    packages.yearly?.product.priceString ?? null,
    (packages.yearly?.product as { price?: number } | undefined)?.price ?? null,
  );
  const perDayLabel = yearlyPerDay
    ? LP(`≈ ${yearlyPerDay} в день`, `≈ ${yearlyPerDay} на день`, `≈ ${yearlyPerDay} al día`, {
        'pt-BR': `≈ ${yearlyPerDay} por dia`,
        vi: `≈ ${yearlyPerDay} mỗi ngày`,
        id: `≈ ${yearlyPerDay} per hari`,
        tr: `≈ ${yearlyPerDay} / gün`,
        pl: `≈ ${yearlyPerDay} dziennie`,
      })
    : '';
  // План #2: зачёркнутая «старая» цена — только пока активен реальный urgency-период.
  const urgencyActive = urgency?.isActive === true;
  const yearlyDoubledPrice = urgencyActive ? getDoubledPrice(yearlyPrice) : null;
  const monthlyDoubledPrice = urgencyActive ? getDoubledPrice(monthlyPrice) : null;
  const monthlyEquivalentLabel = yearlyMonthlyEquivalent
    ? LP(`≈ ${yearlyMonthlyEquivalent} / месяц`, `≈ ${yearlyMonthlyEquivalent} / місяць`, `≈ ${yearlyMonthlyEquivalent} / mes`, {
        'pt-BR': `≈ ${yearlyMonthlyEquivalent} /mês`,
        vi: `≈ ${yearlyMonthlyEquivalent} /tháng`,
        id: `≈ ${yearlyMonthlyEquivalent} /bulan`,
        tr: `≈ ${yearlyMonthlyEquivalent} /ay`,
        pl: `≈ ${yearlyMonthlyEquivalent} /mies.`,
      })
    : '';
  const yearlyBillingNote = yearlyMonthlyEquivalent
    ? LP('оплата за год', 'оплата за рік', 'facturado anual', {
        'pt-BR': 'cobrado anualmente',
        vi: 'thanh toán hằng năm',
        id: 'ditagih tahunan',
        tr: 'yıllık faturalandırılır',
        pl: 'rozliczenie roczne',
      })
    : '';
  const missingStorePriceLabel = loadingPackages || !packagesLoadAttempted
    ? LP('Загружаем…', 'Завантажуємо…', 'Loading…', {
        'pt-BR': 'Preço pendente',
        vi: 'Sắp có giá',
        id: 'Harga segera tersedia',
        tr: 'Fiyat hazırlanıyor',
        pl: 'Cena wkrótce',
      })
    : LP('Повторить', 'Повторити', 'Reintentar', {
        'pt-BR': 'Repetir',
        vi: 'Thử lại',
        id: 'Coba lagi',
        tr: 'Tekrar dene',
        pl: 'Ponów',
      });

  const closePaywallAfterDecline = useCallback((reason: PaywallCloseReason) => {
    if (exitTrialOfferVisible) {
      logExitTrialOfferDeclined(revenueContext, exitTrialPlan);
    }
    if (reason === 'close') logPaywallClose(revenueContext);
    else logPaywallContinueFree(revenueContext);
    // План #7: abandoned-paywall push через ~1ч (только реальный пейвол, не manage).
    if (!openManageFromSettings) {
      void import('./notifications')
        .then(({ schedulePaywallAbandonedNotification }) => schedulePaywallAbandonedNotification(lang as Lang))
        .catch(() => {});
    }
    goBack();
  }, [exitTrialOfferVisible, exitTrialPlan, goBack, revenueContext, openManageFromSettings, lang]);

  const requestPaywallClose = useCallback((reason: PaywallCloseReason) => {
    if (shouldShowExitTrialOffer({
      context: ctx,
      closeReason: reason,
      viewMode,
      openManageFromSettings,
      purchasing,
      restoring,
      hasStoreTrial,
      alreadySeen: exitTrialOfferSeenRef.current,
      forceTrialUI,
    })) {
      exitTrialOfferSeenRef.current = true;
      logExitTrialOfferShown(revenueContext, exitTrialPlan);
      setExitTrialOfferVisible(true);
      return;
    }
    closePaywallAfterDecline(reason);
  }, [
    closePaywallAfterDecline,
    exitTrialPlan,
    forceTrialUI,
    hasStoreTrial,
    openManageFromSettings,
    purchasing,
    revenueContext,
    restoring,
    viewMode,
  ]);

  // Персонализированные теги: top-3 «болевых» строки, загружаются асинхронно.
  // Показываем pill-карточки выше hero-блока чтобы юзер увидел «зеркало своего опыта»
  // до стандартного рекламного pitch.
  const [personalizedTags, setPersonalizedTags] = React.useState<PersonalizedTag[]>([]);
  React.useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      void collectPaywallStats().then((stats) => {
        setPersonalizedTags(pickPaywallTags(stats, 3));
      });
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    getTrialReofferBlockedByCooldown().then(setTrialReofferBlocked);

    /** С manage=1 не трогаем — отдельный эффект, иначе двойная гидрация и моргание. */
    if (openManageFromSettings) return;

    resolveCurrentPremiumState()
      .then(async ({ isPremium, plan, expiry, isAdmin }) => {
        if (isPremium) {
          const effectivePlan = plan ?? 'yearly';
          setIsAdminGrantedPremium(isAdmin);
          setActivePlan(effectivePlan);
          setExpiryTs(prev => (expiry > 0 ? expiry : prev));
          if (ctx === 'personal_plan') {
            await activatePendingPersonalPlanAfterPremium();
            finishPersonalPlanActivationFlow();
            return;
          }
          setViewMode('manage');
        }
      })
      .catch(() => {});
  }, [resolveCurrentPremiumState, openManageFromSettings]);

  useFocusEffect(
    useCallback(() => {
      void getTrialReofferBlockedByCooldown().then(setTrialReofferBlocked);
      void loadPremiumPackages();
    }, [loadPremiumPackages]),
  );

  const activateFreezeIfNeeded = async () => {
    if (ctx === 'streak') {
      const today = new Date().toISOString().split('T')[0];
      await AsyncStorage.setItem('streak_freeze', JSON.stringify({ active: true, date: today }));
      emitAppEvent('streak_freeze_updated', { active: true });
    }
  };

  const activatePersonalPlanAfterPremiumIfNeeded = async () => {
    if (ctx !== 'personal_plan') return;
    await activatePendingPersonalPlanAfterPremium();
  };

  const markPremiumCelebrationIfNeeded = async () => {
    if (ctx === 'personal_plan') return;
    await markCelebrationPending();
  };

  const finishPersonalPlanActivationFlow = () => {
    invalidatePremiumCache();
    AsyncStorage.setItem('had_premium_ever', '1').catch(() => {});
    void getPremiumCourseLevel().catch(() => {});
    emitAppEvent('premium_activated');
    reloadEnergy();
    AsyncStorage.getItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY)
      .then((pendingNickname) => {
        if (pendingNickname === '1') {
          return AsyncStorage.multiSet([
            ['onboarding_step', 'name'],
            [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
          ])
            .then(() => AsyncStorage.removeItem('onboarding_done'))
            .then(() => {
              emitAppEvent('personal_plan_onboarding_nickname_ready');
              router.replace('/(tabs)/home' as any);
            });
        }
        router.replace('/personal_plan_thank_you' as any);
      })
      .catch(() => {
        router.replace('/personal_plan_thank_you' as any);
      });
  };

  const finishPremiumActivationAndReturn = () => {
    if (ctx === 'personal_plan') {
      finishPersonalPlanActivationFlow();
      return;
    }
    invalidatePremiumCache();
    AsyncStorage.setItem('had_premium_ever', '1').catch(() => {});
    void getPremiumCourseLevel().catch(() => {});
    emitAppEvent('premium_activated');
    reloadEnergy();
    goBack();
  };

  const handlePurchase = async (plan: Plan) => {
    // Defensive guard: if premium is already active locally, don\'t start a second flow.
    if (activePlan) {
      if (ctx === 'personal_plan') {
        await activatePersonalPlanAfterPremiumIfNeeded();
        finishPersonalPlanActivationFlow();
        return;
      }
      setViewMode('manage');
      return;
    }
    let latestPremiumState = await resolveCurrentPremiumState().catch(() => null);
    if (!latestPremiumState?.isPremium && !IS_EXPO_GO) {
      try {
        const { restoreFromCloud } = await import('./cloud_sync');
        await restoreFromCloud();
        invalidatePremiumCache();
        latestPremiumState = await resolveCurrentPremiumState().catch(() => latestPremiumState);
      } catch {
        // Cloud refresh is best-effort; if it fails, the store flow still handles normal purchases.
      }
    }
    if (latestPremiumState?.isPremium) {
      const effectivePlan = latestPremiumState.plan ?? 'yearly';
      setIsAdminGrantedPremium(latestPremiumState.isAdmin);
      setActivePlan(effectivePlan);
      setExpiryTs(prev => (latestPremiumState?.expiry && latestPremiumState.expiry > 0 ? latestPremiumState.expiry : prev));
      if (ctx === 'personal_plan') {
        await activatePersonalPlanAfterPremiumIfNeeded();
        finishPersonalPlanActivationFlow();
        return;
      }
      setViewMode('manage');
      return;
    }
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    setSelected(plan);
    if (IS_EXPO_GO || DEV_IAP_BYPASS) {
      await savePremiumLocally(plan);
      await markSubscriptionOrTrialFlowConsumedNow();
      await activateFreezeIfNeeded();
      await activatePersonalPlanAfterPremiumIfNeeded();
      purchasingRef.current = false;
      await markPremiumCelebrationIfNeeded();
      finishPremiumActivationAndReturn();
      return;
    }
    await initRevenueCat();
    if (!(await Purchases.isConfigured())) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Платежи временно недоступны. Открой приложение через пару секунд и попробуй снова.',
        messageUk: 'Платежі тимчасово недоступні. Зачекайте кілька секунд і спробуйте знову.',
        messageEs: 'Pagos no disponibles por ahora. Espera unos segundos e inténtalo de nuevo.',
      });
      purchasingRef.current = false;
      return;
    }
    if (!(await syncRevenueCatIdentity())) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Платежи ещё привязываются к аккаунту. Подожди пару секунд и попробуй снова.',
        messageUk: 'Платежі ще прив\'язуються до акаунта. Зачекайте пару секунд і спробуйте знову.',
        messageEs: 'Los pagos aún se están vinculando a la cuenta. Espera unos segundos e inténtalo de nuevo.',
      });
      purchasingRef.current = false;
      return;
    }
    let currentPackages = packages;
    let pkg = plan === 'yearly' ? currentPackages.yearly : currentPackages.monthly;
    const hadVisibleStorePrice = !!storePriceTrim(pkg?.product.priceString);
    if (!pkg || !hadVisibleStorePrice) {
      // Fallback: пользователь мог нажать CTA раньше, чем завершился initial getOfferings.
      currentPackages = await loadPremiumPackages();
      pkg = plan === 'yearly' ? currentPackages.yearly : currentPackages.monthly;
      if (pkg && storePriceTrim(pkg.product.priceString)) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Готово. Нажми кнопку ещё раз, чтобы открыть доступ.',
          messageUk: 'Готово. Натисни кнопку ще раз, щоб відкрити доступ.',
          messageEs: 'Listo. Pulsa el botón otra vez para abrir el acceso.',
        });
        purchasingRef.current = false;
        return;
      }
    }
    if (!pkg) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Магазин недоступен. Попробуй ещё раз.',
        messageUk: 'Магазин недоступний. Спробуйте ще раз.',
        messageEs: 'La tienda no está disponible. Inténtalo de nuevo.',
      });
      purchasingRef.current = false;
      return;
    }
    if (!storePriceTrim(pkg.product.priceString)) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: 'Ещё загружаем. Попробуй через секунду.',
        messageUk: 'Ціни ще завантажуються. Спробуйте за секунду.',
        messageEs: 'Los precios aún se están cargando. Inténtalo en un segundo.',
      });
      purchasingRef.current = false;
      return;
    }
    let returnedAfterActivation = false;
    setPurchasing(true);
    try {
      // Android: для free trial иногда нужно явно выбрать subscriptionOption с триальной фазой.
      // iOS: introductory offer применяет система — только purchasePackage; purchaseSubscriptionOption
      // здесь может не открыть лист оплаты (см. RC docs: iOS subscription offers).
      if (__DEV__) console.log('[RC] subscriptionOptions:', JSON.stringify(pkg.product.subscriptionOptions?.map(o => ({ id: o.id, freePhase: o.freePhase }))));
      const trialOption =
        Platform.OS === 'android' && !trialReofferBlocked
          ? pkg.product.subscriptionOptions?.find(o =>
              o.freePhase != null || (o as any).phases?.some((ph: { periodDuration?: string; price?: { amountMicros: number } }) => ph.price?.amountMicros === 0)
            )
          : undefined;
      if (__DEV__) console.log('[RC] trialOption found:', trialOption?.id ?? 'none');

      // Воронка: момент открытия платёжного диалога стора (раньше не трекался —
      // нельзя было измерить drop-off между нажатием CTA и завершением покупки).
      void trackEvent('purchase_started', {
        context: revenueContext,
        plan,
        product_id: pkg.product.identifier,
        with_trial: !!trialOption,
        paywall: 'v1',
      });
      // Воронка after-win (#3): явный CTA-шаг для контекста level_up.
      if (ctx === 'level_up') {
        const awSource = routeParamString(params.source) || 'afterwin_levelup';
        void trackEvent('afterwin_upsell_cta', { plan, source: awSource });
        void import('./firebase').then(({ logAfterWinUpsellCta }) => logAfterWinUpsellCta(awSource, plan)).catch(() => {});
      }

      const { customerInfo } = trialOption
        ? await Purchases.purchaseSubscriptionOption(trialOption)
        : await Purchases.purchasePackage(pkg);
      // purchasePackage не выбросил исключение → покупка авторизована Apple/Google.
      // Активируем сразу, не дожидаясь синхронизации RC (sandbox может запаздывать).
      // RC-статус используем как дополнительную проверку, но не как условие активации.
      await savePremiumLocally(plan, revenueCatPremiumMetadata(customerInfo, pkg.product.identifier));
      logPremiumPurchased(pkg.product.identifier, revenueContext);
      void trackEvent('purchase_completed', {
        context: revenueContext,
        plan,
        product_id: pkg.product.identifier,
        with_trial: !!trialOption,
        paywall: 'v1',
      });
      if (trialOption) {
        void trackEvent('trial_started', { context: revenueContext, plan, product_id: pkg.product.identifier, paywall: 'v1' });
      }
      // Локальная отметка: 90 д. без копии «3 дня» (магазин отдельно решает про intro).
      await markSubscriptionOrTrialFlowConsumedNow();
      await activateFreezeIfNeeded();
      await activatePersonalPlanAfterPremiumIfNeeded();
      // Подняли pending для PremiumCelebrationModal — на следующем mount home.tsx
      // юзер увидит celebration с замочками и короной.
      await markPremiumCelebrationIfNeeded();
      returnedAfterActivation = true;
      finishPremiumActivationAndReturn();
      return;
    } catch (e: any) {
      const msg = String(e?.message ?? e ?? '');
      const code = String(e?.code ?? '');
      const alreadyOwned =
        /already.*(subscribed|purchased|owned)|currently subscribed|product.*already/i.test(msg) ||
        /product.*already|purchase.*not.*allowed|already/i.test(code);

      if (alreadyOwned) {
        try {
          const info = await Purchases.restorePurchases();
          const isActive =
            Object.keys(info.entitlements.active).length > 0 ||
            info.activeSubscriptions.length > 0;
          if (isActive) {
            const restoredPlan: Plan =
              info.activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : plan;
            await savePremiumLocally(restoredPlan, revenueCatPremiumMetadata(info));
            await markSubscriptionOrTrialFlowConsumedNow();
            await activateFreezeIfNeeded();
            await activatePersonalPlanAfterPremiumIfNeeded();
            await markPremiumCelebrationIfNeeded();
            returnedAfterActivation = true;
            finishPremiumActivationAndReturn();
            return;
          }
        } catch {
          // Fall through to the visible error below.
        }
      }

      if ((e as any)?.userCancelled) {
        void trackEvent('purchase_cancelled', { context: revenueContext, plan, paywall: 'v1' });
      } else {
        void trackEvent('purchase_failed', { context: revenueContext, plan, paywall: 'v1', error: msg.slice(0, 100) });
      }
      if (!(e as any)?.userCancelled) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: (e as any)?.message || 'Что-то пошло не так.',
          messageUk: (e as any)?.message || 'Щось пішло не так.',
          messageEs: (e as any)?.message || 'Algo salió mal.',
        });
      }
    } finally {
      if (!returnedAfterActivation) setPurchasing(false);
      purchasingRef.current = false;
    }
  };

  const isDevStorePreview = IS_EXPO_GO || DEV_IAP_BYPASS;

  const handleChangePlan = async () => {
    if (activePlan !== 'monthly' || (isAdminGrantedPremium && !isDevStorePreview)) return;
    if (purchasingRef.current) return;
    purchasingRef.current = true;
    setPurchasing(true);
    try {
      if (isDevStorePreview) {
        await savePremiumLocally('yearly');
        setActivePlan('yearly');
        invalidatePremiumCache();
        emitAppEvent('action_toast', {
          type: 'success',
          messageRu: 'DEV: план переключён на годовой локально.',
          messageUk: 'DEV: план перемкнено на річний локально.',
          messageEs: 'DEV: plan cambiado a anual localmente.',
        });
        return;
      }
      await initRevenueCat();
      if (!(await Purchases.isConfigured()) || !(await syncRevenueCatIdentity())) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Платежи ещё готовятся. Подожди пару секунд и попробуй снова.',
          messageUk: 'Платежі ще готуються. Зачекайте пару секунд і спробуйте знову.',
          messageEs: 'Los pagos aún se están preparando. Espera unos segundos e inténtalo de nuevo.',
        });
        return;
      }

      let currentPkg = packages.monthly;
      let nextPkg = packages.yearly;
      if (!currentPkg || !nextPkg || !storePriceTrim(nextPkg.product.priceString)) {
        const nextPackages = await loadPremiumPackages();
        currentPkg = nextPackages.monthly;
        nextPkg = nextPackages.yearly;
      }
      if (!currentPkg || !nextPkg || !storePriceTrim(nextPkg.product.priceString)) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Годовой план пока недоступен в магазине. Попробуй позже.',
          messageUk: 'Річний план поки недоступний у магазині. Спробуйте пізніше.',
          messageEs: 'El plan anual aún no está disponible en la tienda. Inténtalo más tarde.',
        });
        return;
      }

      const googleProductChangeInfo = {
        oldProductIdentifier: currentPkg.product.identifier,
        prorationMode: Purchases.PRORATION_MODE.DEFERRED,
      };
      const purchaseResult = Platform.OS === 'android'
        ? await Purchases.purchasePackage(nextPkg, null, googleProductChangeInfo)
        : await Purchases.purchasePackage(nextPkg);
      const info = purchaseResult.customerInfo ?? await Purchases.getCustomerInfo();
      const isActive =
        Object.keys(info.entitlements.active).length > 0 ||
        info.activeSubscriptions.length > 0;
      if (isActive) {
        const confirmedPlan: Plan =
          info.activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : 'monthly';
        const metadata = revenueCatPremiumMetadata(info);
        await savePremiumLocally(confirmedPlan, metadata);
        setActivePlan(confirmedPlan);
        setExpiryTs(prev => {
          const expiry = Number(metadata.expiryMs ?? 0);
          return expiry > 0 ? expiry : prev;
        });
        invalidatePremiumCache();
      }
      emitAppEvent('action_toast', {
        type: 'success',
        messageRu: 'Смена плана отправлена в магазин. Годовой план будет подтверждён в окне оплаты.',
        messageUk: 'Зміну плану передано в магазин. Річний план буде підтверджено у вікні оплати.',
        messageEs: 'Cambio enviado a la tienda. El plan anual se confirmará en la ventana de pago.',
      });
    } catch (e: any) {
      if (!e?.userCancelled) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: e.message || 'Не удалось сменить план.',
          messageUk: e.message || 'Не вдалося змінити план.',
          messageEs: e.message || 'No se pudo cambiar el plan.',
        });
      }
    } finally {
      setPurchasing(false);
      purchasingRef.current = false;
    }
  };

  const handleRestore = async () => {
    if (restoring) return;
    setRestoring(true);
    try {
      if (isDevStorePreview) {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Восстановление покупок доступно в реальной сборке через магазин.',
          messageUk: 'Відновлення покупок доступне в реальній збірці через магазин.',
          messageEs: 'La restauración de compras está disponible en una compilación real con tienda.',
        });
        return;
      }
      await initRevenueCat();
      if (!(await Purchases.isConfigured()) || !(await syncRevenueCatIdentity())) {
        emitAppEvent('action_toast', {
          type: 'error',
          messageRu: 'Платежи ещё готовятся. Подожди пару секунд и попробуй снова.',
          messageUk: 'Платежі ще готуються. Зачекайте пару секунд і спробуйте знову.',
          messageEs: 'Los pagos aún se están preparando. Espera unos segundos e inténtalo de nuevo.',
        });
        return;
      }
      const info = await Purchases.restorePurchases();
      const activeSubscriptions = info.activeSubscriptions ?? [];
      const isActive =
        Object.keys(info.entitlements.active).length > 0 ||
        activeSubscriptions.length > 0;
      if (isActive) {
        const metadata = revenueCatPremiumMetadata(info);
        const plan: Plan = inferPremiumPlanFromProductId(
          metadata.productId,
          activeSubscriptions.some(s => /year|annual|12.?month/i.test(s)) ? 'yearly' : 'monthly',
        );
        await savePremiumLocally(plan, metadata);
        await markSubscriptionOrTrialFlowConsumedNow();
        // Restore = первый раз на этом устройстве (или после reset) — celebration уместна,
        // чтобы юзер видел что premium «активирован» и понимал что разблокировано.
        await activatePersonalPlanAfterPremiumIfNeeded();
        await markPremiumCelebrationIfNeeded();
        if (ctx === 'personal_plan') {
          finishPersonalPlanActivationFlow();
          return;
        }
        emitAppEvent('premium_activated');
        reloadEnergy();
        emitAppEvent('action_toast', {
          type: 'success',
          messageRu: 'Подписка восстановлена!',
          messageUk: 'Підписку відновлено!',
          messageEs: '¡Suscripción restaurada!',
        });
        goBack();
      } else {
        emitAppEvent('action_toast', {
          type: 'info',
          messageRu: 'Активных подписок не найдено.',
          messageUk: 'Активних підписок не знайдено.',
          messageEs: 'No hay suscripciones activas.',
        });
      }
    } catch (e: any) {
      emitAppEvent('action_toast', {
        type: 'error',
        messageRu: e.message || 'Ошибка восстановления.',
        messageUk: e.message || 'Помилка відновлення.',
        messageEs: e.message || 'Error al restaurar la suscripción.',
      });
    } finally {
      setRestoring(false);
    }
  };

  const openManageWithToast = () => {
    emitAppEvent('action_toast', {
      type: 'info',
      messageRu: 'Открываем управление подпиской.',
      messageUk: 'Відкриваємо керування підпискою.',
      messageEs: 'Abriendo la gestión de la suscripción.',
    });
    Linking.openURL(getSubscriptionManageUrl());
  };

  // ── Manage view ─────────────────────────────────────────────────────────────
  if (viewMode === 'manage' && !activePlan) {
    return (
      <PremiumScreenShell>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <TapScale
                onPress={() => goBack()}
                style={{ width: 40, height: 40, borderRadius: isCompassPaywall ? 8 : 20, alignItems: 'center', justifyContent: 'center', backgroundColor: paywallChromeBg, borderWidth: 1, borderColor: t.border }}
              >
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TapScale>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>Premium</Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }}>
                  {LP('Управление подпиской', 'Керування підпискою', 'Gestionar suscripción', {
                    'pt-BR': 'Gerenciar assinatura',
                    vi: 'Quản lý gói đăng ký',
                    id: 'Kelola langganan',
                    tr: 'Aboneliği yönet',
                    pl: 'Zarządzanie subskrypcją',
                  })}
                </Text>
              </View>
            </View>
            <View style={{ paddingHorizontal: 20, paddingTop: 6 }}>
              <View style={{ backgroundColor: paywallCardBg, borderRadius: 22, borderWidth: 1, borderColor: t.border, padding: 20 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '800' }}>
                  {LP('Проверяем подписку', 'Перевіряємо підписку', 'Comprobando suscripción', {
                    'pt-BR': 'Verificando assinatura',
                    vi: 'Đang kiểm tra gói đăng ký',
                    id: 'Memeriksa langganan',
                    tr: 'Abonelik kontrol ediliyor',
                    pl: 'Sprawdzamy subskrypcję',
                  })}
                </Text>
                <Text style={{ color: t.textMuted, fontSize: f.body, marginTop: 8, lineHeight: 22 }}>
                  {LP('Секунду, загружаем данные Premium.', 'Секунду, завантажуємо дані Premium.', 'Un segundo, cargando los datos de Premium.', {
                    'pt-BR': 'Um segundo, carregando os dados do Premium.',
                    vi: 'Chờ một chút, đang tải dữ liệu Premium.',
                    id: 'Sebentar, memuat data Premium.',
                    tr: 'Bir saniye, Premium verileri yükleniyor.',
                    pl: 'Chwileczkę, ładujemy dane Premium.',
                  })}
                </Text>
              </View>
            </View>
          </ContentWrap>
        </SafeAreaView>
      </PremiumScreenShell>
    );
  }

  if (viewMode === 'manage' && activePlan) {
    const amount = activePlan === 'yearly'
      ? yearlyPrice
      : monthlyPrice;
    const period = activePlan === 'yearly'
      ? LP('год', 'рік', 'año', {
          'pt-BR': 'ano',
          vi: 'năm',
          id: 'tahun',
          tr: 'yıl',
          pl: 'rok',
        })
      : LP('месяц', 'місяць', 'mes', {
          'pt-BR': 'mês',
          vi: 'tháng',
          id: 'bulan',
          tr: 'ay',
          pl: 'miesiąc',
        });
    const noExpiryLabel = LP('без срока', 'без строку', 'sin fecha de fin', {
      'pt-BR': 'sem data final',
      vi: 'không có ngày hết hạn',
      id: 'tanpa tanggal akhir',
      tr: 'bitiş tarihi yok',
      pl: 'bez daty końcowej',
    });
    const amountLabel = isAdminGrantedPremium
      ? LP('Выдано администратором', 'Видано адміністратором', 'Concedido por admin', {
          'pt-BR': 'Concedido por admin',
          vi: 'Duoc cap boi quan tri vien',
          id: 'Diberikan oleh admin',
          tr: 'Yonetici tarafindan verildi',
          pl: 'Przyznane przez admina',
        })
      : amount === ''
      ? (effectiveOs === 'ios'
          ? LP('Цена в App Store', 'Ціна в App Store', 'Precio en App Store', {
              'pt-BR': 'Preço na App Store',
              vi: 'Giá trong App Store',
              id: 'Harga di App Store',
              tr: 'App Store fiyatı',
              pl: 'Cena w App Store',
            })
          : effectiveOs === 'android'
            ? LP('Цена в Google Play', 'Ціна в Google Play', 'Precio en Google Play', {
                'pt-BR': 'Preço no Google Play',
                vi: 'Giá trên Google Play',
                id: 'Harga di Google Play',
                tr: 'Google Play fiyatı',
                pl: 'Cena w Google Play',
              })
            : LP('Цена в магазине', 'Ціна в магазині', 'Precio en la tienda', {
                'pt-BR': 'Preço na loja',
                vi: 'Giá trong cửa hàng',
                id: 'Harga di toko',
                tr: 'Mağaza fiyatı',
                pl: 'Cena w sklepie',
              }))
      : `${amount} / ${period}`;
    const canChangeMonthlyToYearly = activePlan === 'monthly' && !cancelled && (!isAdminGrantedPremium || isDevStorePreview);
    const yearlyChangePrice = storePriceTrim(packages.yearly?.product.priceString);
    const changePlanCurrentEndLabel = expiryTs > 0 ? formatDate(expiryTs, lang) : noExpiryLabel;
    const changePlanStoreName = effectiveOs === 'ios' ? 'App Store' : 'Google Play';
    const changePlanYearlyAmount = yearlyChangePrice || LP('Годовой план появится в окне оплаты', 'Річний план зʼявиться у вікні оплати', 'El precio anual aparecerá en la ventana de pago', {
      'pt-BR': 'O preço anual aparecerá na janela de pagamento',
      vi: 'Giá gói năm sẽ xuất hiện trong cửa sổ thanh toán',
      id: 'Harga tahunan akan muncul di jendela pembayaran',
      tr: 'Yıllık fiyat ödeme penceresinde görünür',
      pl: 'Cena roczna pojawi się w oknie płatności',
    });
    const premiumGold = compassAccent;
    const premiumGoldSoft = compassAccentSoft;
    const premiumBorder = compassAccentBorder;
    const premiumHairline = compassHairline;
    const premiumShadow = {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: isCompassPaywall ? 2 : 10 },
      shadowOpacity: isCompassPaywall ? 0.10 : 0.24,
      shadowRadius: isCompassPaywall ? 4 : 24,
      elevation: isCompassPaywall ? 1 : 10,
    };
    const refinedCard = {
      borderRadius: compassPanelRadius,
      ...(isCompassPaywall ? {} : premiumShadow),
    };
    const refinedCardInner = {
      borderRadius: compassPanelRadius,
      borderWidth: 1,
      borderColor: premiumHairline,
      overflow: 'hidden' as const,
    };
    return (
      <PremiumScreenShell>
        <SafeAreaView style={{ flex: 1 }}>
          <ContentWrap>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingTop: 12, paddingBottom: 14 }}>
              <TapScale
                onPress={() => goBack()}
                style={{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: paywallChromeBg, borderWidth: 1, borderColor: t.border }}
              >
                <Ionicons name="chevron-back" size={28} color={t.textPrimary} />
              </TapScale>
              <View style={{ marginLeft: 10, flex: 1 }}>
                <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '800' }}>Premium</Text>
                <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 1 }}>
                  {LP('Управление подпиской', 'Керування підпискою', 'Gestionar suscripción', {
                    'pt-BR': 'Gerenciar assinatura',
                    vi: 'Quản lý gói đăng ký',
                    id: 'Kelola langganan',
                    tr: 'Aboneliği yönet',
                    pl: 'Zarządzanie subskrypcją',
                  })}
                </Text>
              </View>
            </View>
            <ScrollView decelerationRate="normal" contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 6, paddingBottom: 28, gap: 16 }}>
              <View style={refinedCard}>
                <LinearGradient
                  colors={compassPanelColors as any}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[refinedCardInner, { padding: 20, gap: 16 }]}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={[premiumGold + '28', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 18, right: 18, height: 1, backgroundColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : premiumGold + '88' }} />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                    <LinearGradient
                      colors={[premiumGold, '#FFF1A8', premiumGold]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ width: 52, height: 52, borderRadius: compassIconRadius, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isCompassPaywall ? COMPASS_RICH.edgeLight : '#FFF7C8' }}
                    >
                      {renderPremiumShardGlyph(36)}
                    </LinearGradient>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', lineHeight: Math.round(f.h2 * 1.18) }} numberOfLines={2} adjustsFontSizeToFit>
                        {LP('Premium активирован', 'Premium активовано', 'Premium activado', {
                          'pt-BR': 'Premium ativado',
                          vi: 'Đã kích hoạt Premium',
                          id: 'Premium aktif',
                          tr: 'Premium etkin',
                          pl: 'Premium aktywny',
                        })}
                      </Text>
                      <Text style={{ color: t.textMuted, fontSize: f.sub, marginTop: 4 }} numberOfLines={2}>
                        {isAdminGrantedPremium
                          ? LP('Премиум выдан администратором', 'Преміум видано адміністратором', 'Premium concedido por admin', {
                              'pt-BR': 'Premium concedido por admin',
                              vi: 'Premium do quan tri vien cap',
                              id: 'Premium diberikan oleh admin',
                              tr: 'Premium yonetici tarafindan verildi',
                              pl: 'Premium przyznane przez admina',
                            })
                          : activePlan === 'yearly'
                            ? LP('Годовая подписка', 'Річна підписка', 'Suscripción anual', {
                                'pt-BR': 'Assinatura anual',
                                vi: 'Gói đăng ký hằng năm',
                                id: 'Langganan tahunan',
                                tr: 'Yıllık abonelik',
                                pl: 'Subskrypcja roczna',
                              })
                            : LP('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual', {
                                'pt-BR': 'Assinatura mensal',
                                vi: 'Gói đăng ký hằng tháng',
                                id: 'Langganan bulanan',
                                tr: 'Aylık abonelik',
                                pl: 'Subskrypcja miesięczna',
                              })}
                      </Text>
                    </View>
                  </View>
                  {!cancelled && (
                    <View style={{ paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: premiumHairline, gap: 14 }}>
                      <View style={{ flexDirection: 'row', gap: 14 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700' }}>
                            {isAdminGrantedPremium
                              ? LP('Доступ до', 'Доступ до', 'Acceso hasta', {
                                  'pt-BR': 'Acesso ate',
                                  vi: 'Truy cap den',
                                  id: 'Akses sampai',
                                  tr: 'Erisim tarihi',
                                  pl: 'Dostep do',
                                })
                              : LP('Следующий платёж', 'Наступний платіж', 'Próximo pago', {
                                  'pt-BR': 'Próximo pagamento',
                                  vi: 'Thanh toán tiếp theo',
                                  id: 'Pembayaran berikutnya',
                                  tr: 'Sonraki ödeme',
                                  pl: 'Następna płatność',
                                })}
                          </Text>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginTop: 5 }} numberOfLines={2}>
                            {expiryTs > 0 ? formatDate(expiryTs, lang) : (isAdminGrantedPremium ? noExpiryLabel : '—')}
                          </Text>
                        </View>
                        <View style={{ flex: 1.25 }}>
                          <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '700' }}>
                            {LP('Сумма', 'Сума', 'Importe', {
                              'pt-BR': 'Valor',
                              vi: 'Số tiền',
                              id: 'Jumlah',
                              tr: 'Tutar',
                              pl: 'Kwota',
                            })}
                          </Text>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', marginTop: 5 }} numberOfLines={2} adjustsFontSizeToFit>
                            {amountLabel}
                          </Text>
                        </View>
                      </View>
                      <Text style={{ color: t.textMuted, fontSize: 12, lineHeight: 17 }}>
                        {isAdminGrantedPremium
                          ? LP('Это админский доступ, не новая покупка в магазине.', 'Це адмінський доступ, не нова покупка в магазині.', 'This is admin access, not a new store purchase.', {
                              'pt-BR': 'Este é acesso de administrador, não uma nova compra na loja.',
                              vi: 'Đây là quyền truy cập quản trị, không phải giao dịch mới trong cửa hàng.',
                              id: 'Ini akses admin, bukan pembelian toko baru.',
                              tr: 'Bu yönetici erişimi, mağazada yeni bir satın alma değil.',
                              pl: 'To dostęp administratora, nie nowy zakup w sklepie.',
                            })
                          : effectiveOs === 'ios'
                            ? LP('Точную дату списания смотри в App Store', 'Точну дату списання дивись в App Store', 'La fecha exacta del cargo está en App Store', {
                              'pt-BR': 'Veja a data exata da cobrança na App Store',
                              vi: 'Xem ngày tính phí chính xác trong App Store',
                              id: 'Lihat tanggal penagihan tepatnya di App Store',
                              tr: 'Tam ödeme tarihini App Store içinde kontrol et',
                              pl: 'Dokładną datę pobrania opłaty znajdziesz w App Store',
                            })
                          : effectiveOs === 'android'
                            ? LP('Точную дату списания смотри в Google Play', 'Точну дату списання дивись у Google Play', 'La fecha exacta del cargo está en Google Play', {
                                'pt-BR': 'Veja a data exata da cobrança no Google Play',
                                vi: 'Xem ngày tính phí chính xác trên Google Play',
                                id: 'Lihat tanggal penagihan tepatnya di Google Play',
                                tr: 'Tam ödeme tarihini Google Play içinde kontrol et',
                                pl: 'Dokładną datę pobrania opłaty znajdziesz w Google Play',
                              })
                            : LP('Точную дату списания смотри в магазине приложений', 'Точну дату списання дивись у магазині застосунків', 'La fecha exacta del cargo está en la tienda de apps', {
                                'pt-BR': 'Veja a data exata da cobrança na loja de apps',
                                vi: 'Xem ngày tính phí chính xác trong cửa hàng ứng dụng',
                                id: 'Lihat tanggal penagihan tepatnya di toko aplikasi',
                                tr: 'Tam ödeme tarihini uygulama mağazasında kontrol et',
                                pl: 'Dokładną datę pobrania opłaty znajdziesz w sklepie z aplikacjami',
                              })}
                      </Text>
                    </View>
                  )}
                  {cancelled && (
                    <Text style={{ color: t.wrong, fontSize: f.sub, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.wrong + '44', lineHeight: 20 }}>
                      {LP(
                        `Подписка отменена. Доступ активен до ${formatDate(expiryTs, lang)}`,
                        `Підписку скасовано. Доступ активний до ${formatDate(expiryTs, lang)}`,
                        `Suscripción cancelada. El acceso sigue hasta el ${formatDate(expiryTs, lang)}`,
                        {
                          'pt-BR': `Assinatura cancelada. O acesso fica ativo até ${formatDate(expiryTs, lang)}`,
                          vi: `Gói đăng ký đã hủy. Quyền truy cập còn hiệu lực đến ${formatDate(expiryTs, lang)}`,
                          id: `Langganan dibatalkan. Akses aktif sampai ${formatDate(expiryTs, lang)}`,
                          tr: `Abonelik iptal edildi. Erişim ${formatDate(expiryTs, lang)} tarihine kadar aktif`,
                          pl: `Subskrypcja anulowana. Dostęp jest aktywny do ${formatDate(expiryTs, lang)}`,
                        },
                      )}
                    </Text>
                  )}
                </LinearGradient>
              </View>

              <View style={refinedCard}>
                <LinearGradient
                  colors={[paywallCardBg, paywallSurfaceBg, paywallCardBg]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[refinedCardInner, { padding: 20, gap: 16 }]}
                >
                  <LinearGradient
                    pointerEvents="none"
                    colors={[premiumGold + '18', 'transparent']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 34, height: 34, borderRadius: isCompassPaywall ? 7 : 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder }}>
                      <Ionicons name="sparkles" size={18} color={premiumGold} />
                    </View>
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.bodyLg, fontWeight: '900' }}>
                      {LP('Что у тебя уже включено', 'Що в тебе вже включено', 'Lo que ya tienes incluido', {
                        'pt-BR': 'O que já está incluído',
                        vi: 'Những gì bạn đã có',
                        id: 'Yang sudah termasuk',
                        tr: 'Zaten dahil olanlar',
                        pl: 'Co już masz w pakiecie',
                      })}
                    </Text>
                  </View>
                  <View style={{ gap: 13 }}>
                    {MANAGE_VIEW_PREMIUM_BENEFITS.map((row, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                        <View style={{ width: 24, height: 24, borderRadius: isCompassPaywall ? 5 : 12, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder, marginTop: 1 }}>
                          <Ionicons name="checkmark" size={15} color={premiumGold} />
                        </View>
                        <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, lineHeight: 22, fontWeight: '500' }}>
                          {LP(row.ru, row.uk, row.es, row)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </View>

              {canChangeMonthlyToYearly && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); setChangePlanConfirmVisible(true); }}
                  activeOpacity={0.86}
                  disabled={purchasing}
                  style={{ borderRadius: compassPanelRadius, opacity: purchasing ? 0.62 : 1, ...(isCompassPaywall ? {} : premiumShadow) }}
                >
                  <LinearGradient
                    colors={(isCompassPaywall ? COMPASS_GRADIENTS.raisedTile : [paywallSurfaceBg, paywallCardBg]) as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: premiumHairline, borderRadius: compassPanelRadius, gap: 10, overflow: 'hidden' }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                        <View style={{ width: 34, height: 34, borderRadius: isCompassPaywall ? 7 : 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center' }}>
                          <Ionicons name="swap-horizontal-outline" size={20} color={premiumGold} />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }} numberOfLines={2}>
                            {LP('Перейти на годовой план', 'Перейти на річний план', 'Cambiar al plan anual', {
                              'pt-BR': 'Mudar para o plano anual',
                              vi: 'Chuyển sang gói hằng năm',
                              id: 'Pindah ke paket tahunan',
                              tr: 'Yıllık plana geç',
                              pl: 'Przejdź na plan roczny',
                            })}
                          </Text>
                          {!!yearlyChangePrice && (
                            <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }} numberOfLines={1}>
                              {yearlyChangePrice}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={premiumGold} />
                    </View>
                    <Text style={{ color: t.textMuted, fontSize: 12, lineHeight: 17 }}>
                      {LP('Изменение применится через магазин. На Google Play годовой план начнётся после текущего периода; на iOS откроется управление подпиской App Store.', 'Зміна застосовується через магазин. У Google Play річний план почнеться після поточного періоду; на iOS відкриється керування підпискою App Store.', 'El cambio se aplica a través de la tienda. En Google Play, el plan anual empezará después del periodo actual; en iOS se abrirá la gestión de App Store.', {
                        'pt-BR': 'A mudança é aplicada pela loja. No Google Play, o plano anual começa após o período atual; no iOS, abre o gerenciamento da App Store.',
                        vi: 'Thay đổi được áp dụng qua cửa hàng. Trên Google Play, gói hằng năm bắt đầu sau kỳ hiện tại; trên iOS sẽ mở phần quản lý App Store.',
                        id: 'Perubahan diterapkan melalui toko. Di Google Play, paket tahunan dimulai setelah periode saat ini; di iOS akan membuka pengelolaan App Store.',
                        tr: 'Değişiklik mağaza üzerinden uygulanır. Google Play’de yıllık plan mevcut dönemden sonra başlar; iOS’ta App Store abonelik yönetimi açılır.',
                        pl: 'Zmiana jest stosowana przez sklep. W Google Play plan roczny zacznie się po obecnym okresie; w iOS otworzy się zarządzanie subskrypcją App Store.',
                      })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {!cancelled && !isAdminGrantedPremium && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); setCancelSurveyVisible(true); }}
                  activeOpacity={0.86}
                  style={{ borderRadius: compassPanelRadius }}
                >
                  <LinearGradient
                    colors={(isCompassPaywall ? COMPASS_GRADIENTS.recessedPanel : [paywallCardBg, paywallSurfaceBg]) as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: t.wrong + '55', borderRadius: compassPanelRadius, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: isCompassPaywall ? 7 : 17, backgroundColor: t.wrongBg, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="close-circle-outline" size={21} color={t.wrong} />
                    </View>
                    <Text style={{ color: t.wrong, fontSize: f.body, fontWeight: '800' }}>{LP('Отменить подписку', 'Скасувати підписку', 'Cancelar suscripción', {
                      'pt-BR': 'Cancelar assinatura',
                      vi: 'Hủy gói đăng ký',
                      id: 'Batalkan langganan',
                      tr: 'Aboneliği iptal et',
                      pl: 'Anuluj subskrypcję',
                    })}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}

              {isAdminGrantedPremium && (
                <TouchableOpacity
                  onPress={() => { hapticTap(); openManageWithToast(); }}
                  activeOpacity={0.86}
                  style={{ borderRadius: compassPanelRadius }}
                >
                  <LinearGradient
                    colors={(isCompassPaywall ? COMPASS_GRADIENTS.recessedPanel : [paywallCardBg, paywallSurfaceBg]) as any}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={{ padding: 18, borderWidth: 1, borderColor: premiumHairline, borderRadius: compassPanelRadius, flexDirection: 'row', alignItems: 'center', gap: 12 }}
                  >
                    <View style={{ width: 34, height: 34, borderRadius: isCompassPaywall ? 7 : 17, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center' }}>
                      <Ionicons name="open-outline" size={20} color={premiumGold} />
                    </View>
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                      {effectiveOs === 'ios'
                        ? LP('Проверить подписки в App Store', 'Перевірити підписки в App Store', 'Revisar suscripciones en App Store', {
                            'pt-BR': 'Ver assinaturas na App Store',
                            vi: 'Kiem tra dang ky trong App Store',
                            id: 'Periksa langganan di App Store',
                            tr: 'App Store aboneliklerini kontrol et',
                            pl: 'Sprawdz subskrypcje w App Store',
                          })
                        : LP('Проверить подписки в Google Play', 'Перевірити підписки в Google Play', 'Revisar suscripciones en Google Play', {
                            'pt-BR': 'Ver assinaturas no Google Play',
                            vi: 'Kiem tra dang ky trong Google Play',
                            id: 'Periksa langganan di Google Play',
                            tr: 'Google Play aboneliklerini kontrol et',
                            pl: 'Sprawdz subskrypcje w Google Play',
                          })}
                    </Text>
                    <Ionicons name="chevron-forward" size={18} color={premiumGold} />
                  </LinearGradient>
                </TouchableOpacity>
              )}

              <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
                {isAdminGrantedPremium
                  ? LP('Админский Premium не отменяет отдельную подписку в магазине. Если там был активный триал или план, отмените его в App Store / Google Play.', 'Адмінський Premium не скасовує окрему підписку в магазині. Якщо там був активний trial або план, скасуйте його в App Store / Google Play.', 'Admin Premium does not cancel a separate store subscription. If a trial or plan is active there, cancel it in App Store / Google Play.', {
                      'pt-BR': 'Premium de administrador não cancela uma assinatura separada da loja. Se houver teste ou plano ativo, cancele na App Store / Google Play.',
                      vi: 'Premium quản trị không hủy gói đăng ký riêng trong cửa hàng. Nếu có gói hoặc bản dùng thử đang hoạt động, hãy hủy trong App Store / Google Play.',
                      id: 'Premium admin tidak membatalkan langganan toko terpisah. Jika ada trial atau paket aktif, batalkan di App Store / Google Play.',
                      tr: 'Yönetici Premium’u ayrı mağaza aboneliğini iptal etmez. Aktif deneme veya plan varsa App Store / Google Play içinde iptal edin.',
                      pl: 'Premium administratora nie anuluje osobnej subskrypcji w sklepie. Jeśli trial lub plan jest aktywny, anuluj go w App Store / Google Play.',
                    })
                  : effectiveOs === 'ios'
                    ? LP('Подписка управляется через App Store', 'Підписка управляється через App Store', 'La suscripción se gestiona en App Store', {
                      'pt-BR': 'A assinatura é gerenciada pela App Store',
                      vi: 'Gói đăng ký được quản lý qua App Store',
                      id: 'Langganan dikelola melalui App Store',
                      tr: 'Abonelik App Store üzerinden yönetilir',
                      pl: 'Subskrypcja jest zarządzana przez App Store',
                    })
                  : effectiveOs === 'android'
                    ? LP('Подписка управляется через Google Play', 'Підписка управляється через Google Play', 'La suscripción se gestiona en Google Play', {
                        'pt-BR': 'A assinatura é gerenciada pelo Google Play',
                        vi: 'Gói đăng ký được quản lý qua Google Play',
                        id: 'Langganan dikelola melalui Google Play',
                        tr: 'Abonelik Google Play üzerinden yönetilir',
                        pl: 'Subskrypcja jest zarządzana przez Google Play',
                      })
                    : LP('Подписка управляется через магазин приложений', 'Підписка управляється через магазин застосунків', 'La suscripción se gestiona en la tienda de apps', {
                        'pt-BR': 'A assinatura é gerenciada pela loja de apps',
                        vi: 'Gói đăng ký được quản lý qua cửa hàng ứng dụng',
                        id: 'Langganan dikelola melalui toko aplikasi',
                        tr: 'Abonelik uygulama mağazası üzerinden yönetilir',
                        pl: 'Subskrypcja jest zarządzana przez sklep z aplikacjami',
                      })}
              </Text>
              {isAdminGrantedPremium && (
                <Text style={{ color: t.textSecond, fontSize: f.label, textAlign: 'center', marginTop: 2, lineHeight: 17 }}>
                  {LP('Премиум выдан администратором. Управление — через админ-панель.', 'Преміум видано адміністратором. Керування — через адмін-панель.', 'Premium concedido por un administrador. La gestión es desde el panel de admin.', {
                    'pt-BR': 'Premium concedido por um administrador. O gerenciamento é feito pelo painel de admin.',
                    vi: 'Premium do quản trị viên cấp. Quản lý trong bảng admin.',
                    id: 'Premium diberikan oleh admin. Pengelolaan melalui panel admin.',
                    tr: 'Premium yönetici tarafından verildi. Yönetim admin panelinden yapılır.',
                    pl: 'Premium przyznane przez administratora. Zarządzanie odbywa się w panelu admina.',
                  })}
                </Text>
              )}
            </ScrollView>
          </ContentWrap>
        </SafeAreaView>

        <Modal
          visible={changePlanConfirmVisible}
          transparent
          animationType="fade"
          onRequestClose={() => {
            if (!purchasing) setChangePlanConfirmVisible(false);
          }}
        >
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: paywallCardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 22, paddingBottom: Math.max(34, insets.bottom + 16), borderTopWidth: 1, borderColor: premiumHairline }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: premiumGoldSoft, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumBorder }}>
                  <Ionicons name="shield-checkmark-outline" size={22} color={premiumGold} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900' }} numberOfLines={2} adjustsFontSizeToFit>
                    {LP('Подтвердить годовой план', 'Підтвердити річний план', 'Confirmar plan anual', {
                      'pt-BR': 'Confirmar plano anual',
                      vi: 'Xác nhận gói năm',
                      id: 'Konfirmasi paket tahunan',
                      tr: 'Yıllık planı onayla',
                      pl: 'Potwierdź plan roczny',
                    })}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 2 }} numberOfLines={2}>
                    {changePlanStoreName}
                  </Text>
                </View>
              </View>

              <View style={{ borderRadius: 16, borderWidth: 1, borderColor: premiumHairline, backgroundColor: paywallSurfaceBg, overflow: 'hidden' }}>
                {[
                  [
                    LP('Текущий месячный план', 'Поточний місячний план', 'Plan mensual actual', {
                      'pt-BR': 'Plano mensal atual',
                      vi: 'Gói tháng hiện tại',
                      id: 'Paket bulanan saat ini',
                      tr: 'Mevcut aylık plan',
                      pl: 'Obecny plan miesięczny',
                    }),
                    LP(`Активен до ${changePlanCurrentEndLabel}`, `Активний до ${changePlanCurrentEndLabel}`, `Activo hasta ${changePlanCurrentEndLabel}`, {
                      'pt-BR': `Ativo até ${changePlanCurrentEndLabel}`,
                      vi: `Có hiệu lực đến ${changePlanCurrentEndLabel}`,
                      id: `Aktif sampai ${changePlanCurrentEndLabel}`,
                      tr: `${changePlanCurrentEndLabel} tarihine kadar aktif`,
                      pl: `Aktywny do ${changePlanCurrentEndLabel}`,
                    }),
                  ],
                  [
                    LP('Новый годовой план', 'Новий річний план', 'Nuevo plan anual', {
                      'pt-BR': 'Novo plano anual',
                      vi: 'Gói năm mới',
                      id: 'Paket tahunan baru',
                      tr: 'Yeni yıllık plan',
                      pl: 'Nowy plan roczny',
                    }),
                    changePlanYearlyAmount,
                  ],
                  [
                    LP('Дата применения', 'Дата застосування', 'Fecha de aplicación', {
                      'pt-BR': 'Data de aplicação',
                      vi: 'Ngày áp dụng',
                      id: 'Tanggal berlaku',
                      tr: 'Uygulama tarihi',
                      pl: 'Data zastosowania',
                    }),
                    effectiveOs === 'android'
                      ? LP(`После текущего периода: ${changePlanCurrentEndLabel}`, `Після поточного періоду: ${changePlanCurrentEndLabel}`, `Después del periodo actual: ${changePlanCurrentEndLabel}`, {
                          'pt-BR': `Após o período atual: ${changePlanCurrentEndLabel}`,
                          vi: `Sau kỳ hiện tại: ${changePlanCurrentEndLabel}`,
                          id: `Setelah periode saat ini: ${changePlanCurrentEndLabel}`,
                          tr: `Mevcut dönemden sonra: ${changePlanCurrentEndLabel}`,
                          pl: `Po obecnym okresie: ${changePlanCurrentEndLabel}`,
                        })
                      : LP('Точную дату и списание подтвердит Apple в окне оплаты', 'Точну дату і списання підтвердить Apple у вікні оплати', 'Apple confirmará la fecha y el cargo en la ventana de pago', {
                          'pt-BR': 'A Apple confirmará a data e a cobrança na janela de pagamento',
                          vi: 'Apple sẽ xác nhận ngày và khoản phí trong cửa sổ thanh toán',
                          id: 'Apple akan mengonfirmasi tanggal dan tagihan di jendela pembayaran',
                          tr: 'Apple tarih ve ücreti ödeme penceresinde onaylar',
                          pl: 'Apple potwierdzi datę i opłatę w oknie płatności',
                        }),
                  ],
                ].map(([label, value], index) => (
                  <View key={label} style={{ padding: 14, borderTopWidth: index === 0 ? 0 : StyleSheet.hairlineWidth, borderTopColor: premiumHairline }}>
                    <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '800', marginBottom: 4 }}>{label}</Text>
                    <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800', lineHeight: 21 }}>{value}</Text>
                  </View>
                ))}
              </View>

              <Text style={{ color: t.textMuted, fontSize: f.label, lineHeight: 18, marginTop: 14 }}>
                {LP('После нажатия откроется стандартное окно оплаты магазина. Без подтверждения в нём деньги не списываются.', 'Після натискання відкриється стандартне вікно оплати магазину. Без підтвердження в ньому кошти не списуються.', 'Después se abrirá la ventana de pago de la tienda. Sin confirmarla, no se cobrará nada.', {
                  'pt-BR': 'Depois será aberta a janela padrão de pagamento da loja. Sem confirmar nela, nada será cobrado.',
                  vi: 'Sau đó cửa sổ thanh toán tiêu chuẩn của cửa hàng sẽ mở. Nếu không xác nhận ở đó, bạn sẽ không bị tính phí.',
                  id: 'Setelah itu jendela pembayaran standar toko akan terbuka. Tanpa konfirmasi di sana, tidak ada biaya.',
                  tr: 'Ardından mağazanın standart ödeme penceresi açılır. Orada onaylamadan ücret alınmaz.',
                  pl: 'Następnie otworzy się standardowe okno płatności sklepu. Bez potwierdzenia nic nie zostanie pobrane.',
                })}
              </Text>

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity
                  onPress={() => { hapticTap(); setChangePlanConfirmVisible(false); }}
                  disabled={purchasing}
                  activeOpacity={0.86}
                  style={{ flex: 1, minHeight: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: premiumHairline, backgroundColor: paywallSurfaceBg, opacity: purchasing ? 0.6 : 1 }}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '800' }}>
                    {LP('Назад', 'Назад', 'Atrás', {
                      'pt-BR': 'Voltar',
                      vi: 'Quay lại',
                      id: 'Kembali',
                      tr: 'Geri',
                      pl: 'Wstecz',
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    hapticTap();
                    setChangePlanConfirmVisible(false);
                    void handleChangePlan();
                  }}
                  disabled={purchasing}
                  activeOpacity={0.86}
                  style={{ flex: 1.35, minHeight: 50, borderRadius: 16, overflow: 'hidden', opacity: purchasing ? 0.6 : 1 }}
                >
                  <LinearGradient colors={[premiumGold, '#FFF1A8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 }}>
                    <Text style={{ color: '#17130A', fontSize: f.body, fontWeight: '900', textAlign: 'center' }} numberOfLines={2} adjustsFontSizeToFit>
                      {purchasing
                        ? LP('Открываем оплату...', 'Відкриваємо оплату...', 'Abriendo pago...', {
                            'pt-BR': 'Abrindo pagamento...',
                            vi: 'Đang mở thanh toán...',
                            id: 'Membuka pembayaran...',
                            tr: 'Ödeme açılıyor...',
                            pl: 'Otwieranie płatności...',
                          })
                        : LP('Подтвердить', 'Підтвердити', 'Confirmar', {
                            'pt-BR': 'Confirmar',
                            vi: 'Xác nhận',
                            id: 'Konfirmasi',
                            tr: 'Onayla',
                            pl: 'Potwierdź',
                          })}
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Опрос при отмене подписки */}
        <Modal visible={cancelSurveyVisible} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
            <View style={{ backgroundColor: paywallCardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Math.max(40, insets.bottom + 16) }}>
              <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '700', marginBottom: 6 }}>
                {LP('Почему хочешь отменить?', 'Чому хочеш скасувати?', '¿Por qué quieres cancelar?', {
                  'pt-BR': 'Por que você quer cancelar?',
                  vi: 'Vì sao bạn muốn hủy?',
                  id: 'Mengapa ingin membatalkan?',
                  tr: 'Neden iptal etmek istiyorsun?',
                  pl: 'Dlaczego chcesz anulować?',
                })}
              </Text>
              <Text style={{ color: t.textSecond, fontSize: f.body, marginBottom: 20 }}>
                {LP('Это поможет нам стать лучше', 'Це допоможе нам стати кращими', 'Nos ayudará a mejorar', {
                  'pt-BR': 'Isso nos ajuda a melhorar',
                  vi: 'Điều này giúp chúng tôi cải thiện',
                  id: 'Ini membantu kami menjadi lebih baik',
                  tr: 'Bu, daha iyi olmamıza yardımcı olur',
                  pl: 'To pomoże nam się poprawić',
                })}
              </Text>
              <TextInput
                value={cancelSurveyOtherText}
                onChangeText={setCancelSurveyOtherText}
                placeholder={LP('Комментарий (необязательно)', 'Коментар (необов\'язково)', 'Comentario (opcional)', {
                  'pt-BR': 'Comentário (opcional)',
                  vi: 'Bình luận (không bắt buộc)',
                  id: 'Komentar (opsional)',
                  tr: 'Yorum (isteğe bağlı)',
                  pl: 'Komentarz (opcjonalnie)',
                })}
                placeholderTextColor={t.textGhost}
                multiline
                maxLength={1000}
                style={{
                  minHeight: 82,
                  maxHeight: 140,
                  textAlignVertical: 'top',
                  color: t.textPrimary,
                  backgroundColor: paywallPrimaryBg,
                  borderColor: t.border,
                  borderWidth: 0.5,
                  borderRadius: 14,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: f.body,
                  marginBottom: 10,
                }}
              />
              {([
                { key: 'too_expensive',    ru: 'Слишком дорого', uk: 'Надто дорого', es: 'Demasiado caro', 'pt-BR': 'Muito caro', vi: 'Quá đắt', id: 'Terlalu mahal', tr: 'Çok pahalı', pl: 'Za drogo', planned: { 'pt-BR': 'Muito caro', vi: 'Quá đắt', id: 'Terlalu mahal', tr: 'Çok pahalı', pl: 'Za drogo' } },
                { key: 'not_enough_value', ru: 'Не хватает контента', uk: 'Не вистачає контенту', es: 'Falta contenido', 'pt-BR': 'Falta conteúdo', vi: 'Chưa đủ nội dung', id: 'Kontennya kurang', tr: 'Yeterli içerik yok', pl: 'Za mało treści', planned: { 'pt-BR': 'Falta conteúdo', vi: 'Chưa đủ nội dung', id: 'Kontennya kurang', tr: 'Yeterli içerik yok', pl: 'Za mało treści' } },
                { key: 'technical_issues', ru: 'Технические проблемы', uk: 'Технічні проблеми', es: 'Problemas técnicos', 'pt-BR': 'Problemas técnicos', vi: 'Sự cố kỹ thuật', id: 'Masalah teknis', tr: 'Teknik sorunlar', pl: 'Problemy techniczne', planned: { 'pt-BR': 'Problemas técnicos', vi: 'Sự cố kỹ thuật', id: 'Masalah teknis', tr: 'Teknik sorunlar', pl: 'Problemy techniczne' } },
                { key: 'found_better_app', ru: 'Нашёл лучше приложение', uk: 'Знайшов краще застосунок', es: 'Encontré una app mejor', 'pt-BR': 'Encontrei um app melhor', vi: 'Tôi tìm thấy ứng dụng tốt hơn', id: 'Menemukan aplikasi yang lebih baik', tr: 'Daha iyi bir uygulama buldum', pl: 'Znalazłem lepszą aplikację', planned: { 'pt-BR': 'Encontrei um app melhor', vi: 'Tôi tìm thấy ứng dụng tốt hơn', id: 'Menemukan aplikasi yang lebih baik', tr: 'Daha iyi bir uygulama buldum', pl: 'Znalazłem lepszą aplikację' } },
                { key: 'not_using_enough', ru: 'Пользуюсь редко', uk: 'Користуюсь рідко', es: 'Casi no la uso', 'pt-BR': 'Quase não uso', vi: 'Tôi ít dùng ứng dụng', id: 'Jarang saya gunakan', tr: 'Neredeyse kullanmıyorum', pl: 'Rzadko używam', planned: { 'pt-BR': 'Quase não uso', vi: 'Tôi ít dùng ứng dụng', id: 'Jarang saya gunakan', tr: 'Neredeyse kullanmıyorum', pl: 'Rzadko używam' } },
                { key: 'other',            ru: 'Другое', uk: 'Інше', es: 'Otro motivo', 'pt-BR': 'Outro motivo', vi: 'Lý do khác', id: 'Alasan lain', tr: 'Başka bir neden', pl: 'Inny powód', planned: { 'pt-BR': 'Outro motivo', vi: 'Lý do khác', id: 'Alasan lain', tr: 'Başka bir neden', pl: 'Inny powód' } },
              ] as ({ key: string; ru: string; uk: string; es: string; planned: PremiumPlannedCopy } & PremiumPlannedCopy)[]).map(item => (
                <TouchableOpacity
                  key={item.key}
                  style={{ paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: t.border, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => {
                    hapticTap();
                    logCancelSurvey(item.key, cancelSurveyOtherText, ctx);
                    setCancelSurveyOtherText('');
                    setCancelSurveyVisible(false);
                    openManageWithToast();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={{ color: t.textPrimary, fontSize: f.body, flex: 1 }}>
                    {LP(item.ru, item.uk, item.es, item.planned)}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={t.textGhost} />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={{ marginTop: 20, paddingVertical: 14, alignItems: 'center', backgroundColor: paywallPrimaryBg, borderRadius: 14 }}
                onPress={() => { hapticTap(); setCancelSurveyVisible(false); }}
                activeOpacity={0.7}
              >
                <Text style={{ color: t.textPrimary, fontSize: f.body, fontWeight: '700' }}>
                  {LP('Остаться с Premium', 'Залишитись з Premium', 'Seguir con Premium', {
                    'pt-BR': 'Continuar com Premium',
                    vi: 'Tiếp tục dùng Premium',
                    id: 'Tetap dengan Premium',
                    tr: 'Premium ile kal',
                    pl: 'Zostań przy Premium',
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </PremiumScreenShell>
    );
  }

  // ── Purchase view ─────────────────────────────────────────────────────────────
  return (
    <PremiumScreenShell>
      <SafeAreaView style={{ flex: 1 }}>
        <ContentWrap>
          <Modal
            visible={exitTrialOfferVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setExitTrialOfferVisible(false)}
          >
            <View
              style={{
                flex: 1,
                backgroundColor: 'rgba(0,0,0,0.68)',
                justifyContent: 'center',
                alignItems: 'center',
                paddingHorizontal: 20,
                paddingTop: insets.top + 18,
                paddingBottom: insets.bottom + 18,
              }}
            >
              <View
                style={{
                  backgroundColor: paywallCardBg,
                  width: '100%',
                  maxWidth: 360,
                  maxHeight: '92%',
                  borderRadius: 22,
                  paddingHorizontal: 20,
                  paddingTop: 20,
                  paddingBottom: 18,
                  borderWidth: 1,
                  borderColor: '#FACC1555',
                  shadowColor: '#000',
                  shadowOpacity: 0.28,
                  shadowRadius: 22,
                  shadowOffset: { width: 0, height: 14 },
                  elevation: 14,
                }}
              >
                <TouchableOpacity
                  accessibilityRole="button"
                  accessibilityLabel={LP('Закрыть', 'Закрити', 'Cerrar', {
                    'pt-BR': 'Fechar',
                    vi: 'Dong',
                    id: 'Tutup',
                    tr: 'Kapat',
                    pl: 'Zamknij',
                  })}
                  hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    zIndex: 2,
                  }}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                  }}
                >
                  <Ionicons name="close" size={20} color={t.textMuted} />
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginBottom: 18, paddingTop: 10 }}>
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFD7001F',
                      borderWidth: 1,
                      borderColor: '#FFD70066',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="sparkles" size={24} color="#FFD700" />
                  </View>
                  <Text
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.84}
                    style={{
                      color: t.textPrimary,
                      fontSize: Math.min(f.h2, 24),
                      lineHeight: 29,
                      fontWeight: '900',
                      textAlign: 'center',
                      paddingHorizontal: 28,
                    }}
                  >
                    {LP('3 дня Premium бесплатно', '3 дні Premium безкоштовно', '3 dias de Premium gratis', {
                      'pt-BR': '3 dias de Premium grátis',
                      vi: '3 ngày Premium miễn phí',
                      id: 'Premium gratis 3 hari',
                      tr: '3 gün Premium ücretsiz',
                      pl: '3 dni Premium za darmo',
                    })}
                  </Text>
                  <Text
                    style={{
                      color: t.textMuted,
                      fontSize: f.body,
                      lineHeight: 22,
                      marginTop: 12,
                      textAlign: 'center',
                    }}
                  >
                    {LP(
                      'Попробуй Premium сейчас. Если не подойдет, отменить можно до конца пробного периода.',
                      'Спробуй Premium зараз. Якщо не підійде, скасувати можна до завершення пробного періоду.',
                      'Prueba Premium ahora. Si no te convence, puedes cancelar antes de que termine la prueba.',
                      {
                        'pt-BR': 'Teste o Premium agora. Se não gostar, você pode cancelar antes do fim do período grátis.',
                        vi: 'Dùng thử Premium ngay. Nếu không phù hợp, bạn có thể hủy trước khi hết thời gian dùng thử.',
                        id: 'Coba Premium sekarang. Jika tidak cocok, kamu bisa membatalkan sebelum masa uji coba berakhir.',
                        tr: 'Premium’u şimdi dene. Uygun değilse deneme süresi bitmeden iptal edebilirsin.',
                        pl: 'Wypróbuj Premium teraz. Jeśli Ci nie pasuje, możesz anulować przed końcem okresu próbnego.',
                      },
                    )}
                  </Text>
                  <Text
                    style={{
                      color: t.textGhost,
                      fontSize: Math.max(12, f.caption),
                      lineHeight: 18,
                      marginTop: 10,
                      textAlign: 'center',
                    }}
                  >
                    {LP(
                      'После пробного периода подписка продолжится по выбранному плану.',
                      'Після пробного періоду підписка продовжиться за обраним планом.',
                      'Despues de la prueba, la suscripcion continuara con el plan elegido.',
                      {
                        'pt-BR': 'Depois do teste, a assinatura continuará no plano escolhido.',
                        vi: 'Sau thời gian dùng thử, gói đăng ký sẽ tiếp tục theo gói đã chọn.',
                        id: 'Setelah uji coba, langganan berlanjut dengan paket yang dipilih.',
                        tr: 'Deneme süresinden sonra abonelik seçilen planla devam eder.',
                        pl: 'Po okresie próbnym subskrypcja będzie kontynuowana w wybranym planie.',
                      },
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFD700',
                    borderRadius: 14,
                    minHeight: 52,
                    paddingVertical: 16,
                    paddingHorizontal: 14,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8,
                    opacity: purchasing ? 0.62 : 1,
                  }}
                  activeOpacity={0.86}
                  disabled={purchasing}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                    setSelected(exitTrialPlan);
                    logPaywallPlanSelectDeduped(exitTrialPlan);
                    logExitTrialOfferAccepted(revenueContext, exitTrialPlan);
                    void handlePurchase(exitTrialPlan);
                  }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={{ color: '#1F1A08', fontSize: f.bodyLg, fontWeight: '900', textAlign: 'center' }}
                  >
                    {LP('Начать бесплатно', 'Почати безкоштовно', 'Empezar gratis', {
                      'pt-BR': 'Começar grátis',
                      vi: 'Bắt đầu miễn phí',
                      id: 'Mulai gratis',
                      tr: 'Ücretsiz başla',
                      pl: 'Zacznij za darmo',
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.78}
                  style={{
                    minHeight: 48,
                    paddingVertical: 13,
                    paddingHorizontal: 12,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginTop: 8,
                    borderRadius: 14,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                  }}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                    closePaywallAfterDecline('continue_free');
                  }}
                >
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    style={{ color: t.textMuted, fontSize: f.body, fontWeight: '700', textAlign: 'center' }}
                  >
                    {LP('Остаться на бесплатной версии', 'Залишитися на безкоштовній версії', 'Seguir gratis', {
                      'pt-BR': 'Continuar grátis',
                      vi: 'Tiếp tục miễn phí',
                      id: 'Tetap gratis',
                      tr: 'Ücretsiz devam et',
                      pl: 'Zostań przy wersji darmowej',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          {false && (
          <Modal
            visible={false}
            transparent
            animationType="fade"
            onRequestClose={() => setExitTrialOfferVisible(false)}
          >
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.58)', justifyContent: 'flex-end' }}>
              <View
                style={{
                  backgroundColor: paywallCardBg,
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  padding: 22,
                  paddingBottom: 24 + insets.bottom,
                  borderTopWidth: 1,
                  borderColor: '#FFD70055',
                }}
              >
                <View style={{ alignItems: 'center', marginBottom: 14 }}>
                  <View
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 26,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: '#FFD7001F',
                      borderWidth: 1,
                      borderColor: '#FFD70066',
                      marginBottom: 12,
                    }}
                  >
                    <Ionicons name="sparkles" size={25} color="#FFD700" />
                  </View>
                  <Text style={{ color: t.textPrimary, fontSize: f.h2, fontWeight: '900', textAlign: 'center' }}>
                    {LP('Попробовать 3 дня бесплатно?', 'Спробувати 3 дні безкоштовно?', 'Probar 3 días gratis?', {
                      'pt-BR': 'Experimentar 3 dias grátis?',
                      vi: 'Dùng thử miễn phí 3 ngày?',
                      id: 'Coba gratis 3 hari?',
                      tr: '3 gün ücretsiz denemek ister misin?',
                      pl: 'Wypróbować 3 dni za darmo?',
                    })}
                  </Text>
                  <Text style={{ color: t.textMuted, fontSize: f.body, lineHeight: 22, marginTop: 10, textAlign: 'center' }}>
                    {LP(
                      'Магазин показывает trial для этого плана. Оплата начнется только после пробного периода, если не отменить подписку.',
                      'Магазин показує trial для цього плану. Оплата почнеться лише після пробного періоду, якщо не скасувати підписку.',
                      'La tienda ofrece prueba para este plan. El pago empieza solo después del periodo de prueba si no cancelas.',
                      {
                        'pt-BR': 'A loja oferece teste para este plano. A cobrança começa só depois do período de teste, se você não cancelar.',
                        vi: 'Cửa hàng đang hiển thị bản dùng thử cho gói này. Thanh toán chỉ bắt đầu sau thời gian dùng thử nếu bạn không hủy.',
                        id: 'Toko menawarkan uji coba untuk paket ini. Pembayaran dimulai setelah masa uji coba jika kamu tidak membatalkan.',
                        tr: 'Mağaza bu plan için deneme sunuyor. İptal etmezsen ödeme yalnızca deneme süresinden sonra başlar.',
                        pl: 'Sklep oferuje okres próbny dla tego planu. Opłata zacznie się dopiero po okresie próbnym, jeśli nie anulujesz.',
                      },
                    )}
                  </Text>
                </View>

                <TouchableOpacity
                  style={{
                    backgroundColor: '#FFD700',
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                    marginTop: 8,
                  }}
                  activeOpacity={0.86}
                  disabled={purchasing}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                    setSelected(exitTrialPlan);
                    logPaywallPlanSelectDeduped(exitTrialPlan);
                    logExitTrialOfferAccepted(revenueContext, exitTrialPlan);
                    void handlePurchase(exitTrialPlan);
                  }}
                >
                  <Text style={{ color: '#1F1A08', fontSize: f.bodyLg, fontWeight: '900' }}>
                    {LP('Начать 3 дня бесплатно', 'Почати 3 дні безкоштовно', 'Empezar 3 días gratis', {
                      'pt-BR': 'Começar 3 dias grátis',
                      vi: 'Bắt đầu 3 ngày miễn phí',
                      id: 'Mulai 3 hari gratis',
                      tr: '3 gün ücretsiz başla',
                      pl: 'Zacznij 3 dni za darmo',
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
                  onPress={() => {
                    hapticTap();
                    setExitTrialOfferVisible(false);
                    closePaywallAfterDecline('continue_free');
                  }}
                >
                  <Text style={{ color: t.textGhost, fontSize: f.body, textDecorationLine: 'underline' }}>
                    {LP('Нет, продолжить бесплатно', 'Ні, продовжити безкоштовно', 'No, continuar gratis', {
                      'pt-BR': 'Não, continuar grátis',
                      vi: 'Không, tiếp tục miễn phí',
                      id: 'Tidak, lanjut gratis',
                      tr: 'Hayır, ücretsiz devam et',
                      pl: 'Nie, kontynuuj za darmo',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
          )}
          <Animated.View style={{
            flex: 1,
            opacity: entranceOpacity,
            transform: [
              { translateY: entranceTranslateY },
              { scale: entranceScale },
            ],
          }}>
          <ScrollView
            decelerationRate="normal"
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 48, paddingBottom: 36 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Крестик */}
            <TouchableOpacity
              style={{ alignSelf: 'flex-end', padding: 8, marginBottom: 8 }}
              onPress={() => {
                hapticTap();
                requestPaywallClose('close');
              }}
            >
              <Ionicons name="close" size={24} color={t.textMuted} />
            </TouchableOpacity>

            {/* TRIAL RIBBON: показываем только когда хотя бы один план реально отдаёт intro phase
                и пользователь не в локальном 90-дневном кулдауне. Цена остаётся видна ниже в карточках —
                это требование App Store 3.1.2 / Google Play subscriptions policy.
                forceTrialUI — admin QA bypass, чтобы тестировать UI в Expo Go/dev без реального RC. */}
            {primaryHasTrialOffer && (
              <View
                style={{
                  marginBottom: 18,
                  borderRadius: 18,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  backgroundColor: '#1a1208',
                  borderWidth: 1.5,
                  borderColor: '#FFD700',
                  overflow: 'hidden',
                  alignItems: 'center',
                }}
              >
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    top: -40,
                    left: -20,
                    right: -20,
                    height: 120,
                    backgroundColor: '#FFD700',
                    opacity: badgeSparkle.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.18] }),
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' }}>
                  <Text style={{ fontSize: 20, marginRight: 8 }}>🎁</Text>
                  <Text
                    style={{ flex: 1, color: '#FFD700', fontSize: f.bodyLg, fontWeight: '900', textAlign: 'center', marginRight: 28 }}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {LP('Попробуй Premium 3 дня бесплатно', 'Спробуй Premium 3 дні безкоштовно', 'Prueba Premium 3 días gratis', {
                      'pt-BR': 'Experimente Premium 3 dias grátis',
                      vi: 'Dùng thử Premium miễn phí 3 ngày',
                      id: 'Coba Premium gratis 3 hari',
                      tr: 'Premiumu 3 gün ücretsiz dene',
                      pl: 'Wypróbuj Premium 3 dni za darmo',
                    })}
                  </Text>
                </View>
                <Text
                  style={{ color: '#FFE07A', fontSize: f.caption, fontWeight: '600', marginTop: 4, textAlign: 'center' }}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.85}
                >
                  {LP('Без списания сейчас • Отмена в любой момент', 'Без списання зараз • Скасування в будь-який час', 'Sin cargo ahora • Cancela cuando quieras', {
                    'pt-BR': 'Sem cobrança agora • Cancele quando quiser',
                    vi: 'Không bị tính phí ngay • Hủy bất cứ lúc nào',
                    id: 'Tanpa biaya sekarang • Batalkan kapan saja',
                    tr: 'Şimdi ücret alınmaz • İstediğin zaman iptal et',
                    pl: 'Bez opłaty teraz • Anuluj w dowolnym momencie',
                  })}
                </Text>
              </View>
            )}

            {/* БЛОК 0: Персонализированные теги — «зеркало опыта» юзера */}
            {personalizedTags.length > 0 && (
              <View style={{ marginBottom: 16, gap: 8 }}>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>
                  {LP('Почему Premium тебе нужен', 'Чому Premium тобі потрібен', 'Por qué necesitas Premium', {
                    'pt-BR': 'Por que você precisa do Premium',
                    vi: 'Vì sao bạn cần Premium',
                    id: 'Kenapa kamu butuh Premium',
                    tr: 'Premium neden işine yarar',
                    pl: 'Dlaczego potrzebujesz Premium',
                  })}
                </Text>
                {personalizedTags.map((tag) => (
                  <View
                    key={tag.key}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      backgroundColor: paywallCardBg,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: t.border,
                      paddingVertical: 10,
                      paddingHorizontal: 14,
                    }}
                  >
                    {isEnergyGlyph(tag.emoji)
                      ? renderPremiumEnergyGlyph(28, 30)
                      : <Text style={{ fontSize: 22, width: 30, textAlign: 'center' }}>{tag.emoji}</Text>}
                    <Text style={{ flex: 1, color: t.textPrimary, fontSize: f.body, fontWeight: '600', lineHeight: f.body * 1.45 }}>
                      {LP(tag.ru, tag.uk, tag.es, tag)}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* БЛОК 1: Герой */}
            <Animated.View style={{ width: '100%', alignSelf: 'stretch', alignItems: 'center', marginBottom: 24, transform: [{ translateY: heroFloat }] }}>
              <View
                style={{ width: '100%', alignSelf: 'stretch', borderRadius: isCompassPaywall ? 10 : 22, backgroundColor: paywallCardBg, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : heroArt.accent + '66', paddingVertical: 20, paddingHorizontal: 16, alignItems: 'center', overflow: 'hidden' }}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={t.bgGradient}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <LinearGradient
                  pointerEvents="none"
                  colors={heroScrim as any}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 180,
                    height: 180,
                    borderRadius: 90,
                    backgroundColor: heroArt.accent,
                    opacity: heroGlow,
                    top: -60,
                    left: '50%',
                    transform: [{ translateX: -90 }],
                  }}
                />
                <Animated.View
                  pointerEvents="none"
                  style={{
                    position: 'absolute',
                    width: 240,
                    height: 120,
                    borderRadius: 120,
                    backgroundColor: heroArt.accent2,
                    opacity: heroGlow.interpolate({ inputRange: [0.35, 0.62], outputRange: [0.08, 0.16] }),
                    bottom: -70,
                    left: '50%',
                    transform: [{ translateX: -120 }],
                  }}
                />
                <View style={{ backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallSurfaceBg, borderRadius: isCompassPaywall ? 9 : 24, paddingHorizontal: 14, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: isCompassPaywall ? COMPASS_RICH.hairlineQuiet : heroArt.accent + '33' }}>
                  {shouldUseShardHeroIcon(ctx)
                    ? renderPremiumShardGlyph(56, 56, heroArt.shardAmount)
                    : isEnergyGlyph(hero.emoji)
                    ? renderPremiumEnergyGlyph(54)
                    : <Text style={{ fontSize: 44 }}>{hero.emoji}</Text>}
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.numLg, fontWeight: '800', textAlign: 'center', marginBottom: 8 }} adjustsFontSizeToFit minimumFontScale={0.75} numberOfLines={2}>
                  {LP(hero.titleRu, hero.titleUk, hero.titleEs, heroPlanned.title)}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 8 }}>
                  <Text style={{ color: '#FFD700', fontSize: f.body, letterSpacing: 1 }}>★★★★★</Text>
                  <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '600' }}>
                    {LP('4.8 · 10 000+ оценок', '4.8 · 10 000+ оцінок', '4.8 · 10 000+ valoraciones', {
                      'pt-BR': '4.8 · 10 000+ avaliações',
                      vi: '4.8 · 10 000+ đánh giá',
                      id: '4.8 · 10 000+ ulasan',
                      tr: '4.8 · 10 000+ değerlendirme',
                      pl: '4.8 · 10 000+ ocen',
                    })}
                  </Text>
                </View>
                <Text style={{ color: t.textMuted, fontSize: f.body, textAlign: 'center', lineHeight: f.body * 1.55 }}>
                  {LP(hero.subtitleRu, hero.subtitleUk, hero.subtitleEs, heroPlanned.subtitle)}
                </Text>
              </View>
            </Animated.View>

            {/* План #2: urgency-полоса — только при активном реальном окне цены */}
            {urgencyActive && urgency && (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: t.correct + '1A', borderColor: t.correct + '55', borderWidth: 1, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 14 }}>
                <Ionicons name="time-outline" size={16} color={t.correct} />
                <Text style={{ color: t.correct, fontSize: f.label, fontWeight: '700' }} numberOfLines={1}>
                  {LP(
                    `Твоя цена закреплена — ещё ${urgency.remainingFormatted}`,
                    `Твоя ціна закріплена — ще ${urgency.remainingFormatted}`,
                    `Tu precio está fijado — quedan ${urgency.remainingFormatted}`,
                    {
                      'pt-BR': `Seu preço está fixado — ainda ${urgency.remainingFormatted}`,
                      vi: `Giá của bạn đã được giữ — còn ${urgency.remainingFormatted}`,
                      id: `Hargamu terkunci — sisa ${urgency.remainingFormatted}`,
                      tr: `Fiyatın sabitlendi — kalan ${urgency.remainingFormatted}`,
                      pl: `Twoja cena jest zablokowana — jeszcze ${urgency.remainingFormatted}`,
                    },
                  )}
                </Text>
              </View>
            )}

            {/* План #6: реальные отзывы учеников (social proof) */}
            {testimonials.length > 0 && (
              <View style={{ marginBottom: 16, gap: 8 }}>
                <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                  {LP('Что говорят ученики', 'Що кажуть учні', 'Lo que dicen los alumnos', {
                    'pt-BR': 'O que dizem os alunos',
                    vi: 'Học viên nói gì',
                    id: 'Kata para pelajar',
                    tr: 'Öğrenciler ne diyor',
                    pl: 'Co mówią uczniowie',
                  })}
                </Text>
                {testimonials.map((tm, i) => (
                  <View key={i} style={{ backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg, borderRadius: isCompassPaywall ? 9 : 14, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : t.textSecond + '40', padding: 12 }}>
                    <Text style={{ color: '#FFD700', fontSize: f.caption, letterSpacing: 1, marginBottom: 4 }}>★★★★★</Text>
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, lineHeight: f.sub * 1.4 }}>{tm.text}</Text>
                    <Text style={{ color: t.textMuted, fontSize: f.caption, marginTop: 4 }}>— {tm.author}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* БЛОК 2: Что ты получишь */}
            <View style={{ marginBottom: 18, gap: 8 }}>
              <Text style={{ color: t.textMuted, fontSize: f.label, fontWeight: '600', textAlign: 'center', letterSpacing: 0.5, textTransform: 'uppercase' }}>
                {LP('Что ты получишь', 'Що ти отримаєш', 'Lo que obtienes', {
                  'pt-BR': 'O que você recebe',
                  vi: 'Bạn sẽ nhận được gì',
                  id: 'Yang kamu dapatkan',
                  tr: 'Neler alırsın',
                  pl: 'Co otrzymasz',
                })}
              </Text>
              {benefits.map((b, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg,
                    borderRadius: compassSmallRadius,
                    borderWidth: 1,
                    borderColor: i === 0 ? (isCompassPaywall ? COMPASS_RICH.hairlineStrong : t.correct + '66') : t.border,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    shadowColor: isCompassPaywall ? 'transparent' : i === 0 ? t.correct : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isCompassPaywall ? 0 : i === 0 ? 0.22 : 0.1,
                    shadowRadius: isCompassPaywall ? 0 : 6,
                    elevation: isCompassPaywall ? 0 : i === 0 ? 4 : 1,
                  }}
                >
                  <Ionicons name="checkmark-circle" size={18} color={t.correct} />
                  <Text style={{ color: t.textPrimary, fontSize: f.sub, fontWeight: '600', flex: 1 }}>
                    {LP(b.ru, b.uk, b.es, getContextBenefitPlanned(ctx, i))}
                  </Text>
                </View>
              ))}
            </View>

            {/* БЛОК 3: Персональная ценность */}
            <View style={{ marginBottom: 16, backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg, borderRadius: isCompassPaywall ? 9 : 14, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : t.textSecond + '55', padding: 14, overflow: 'hidden' }}>
              <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 }}>
                {LP('Для тебя сейчас', 'Для тебе зараз', 'Para ti ahora', {
                  'pt-BR': 'Para você agora',
                  vi: 'Dành cho bạn lúc này',
                  id: 'Untukmu sekarang',
                  tr: 'Şu anda senin için',
                  pl: 'Dla ciebie teraz',
                })}
              </Text>
              <Text style={{ color: t.textPrimary, fontSize: f.sub, lineHeight: f.sub * 1.45 }}>
                {personalValueLine}
              </Text>
              {/* План #4: социальное сравнение (гордость, не угроза) — только при хорошем перцентиле */}
              {percentileLine && (
                <Text style={{ color: t.textSecond, fontSize: f.label, lineHeight: f.label * 1.4, marginTop: 8 }}>
                  {percentileLine}
                </Text>
              )}
            </View>

            {/* План #5: зеркало прогресса «Уже твоё» — endowment перед стеной */}
            {progressMirror && (
              <View style={{ marginBottom: 16, backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg, borderRadius: isCompassPaywall ? 9 : 14, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : t.textSecond + '55', padding: 14, overflow: 'hidden' }}>
                <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                  {LP('Уже твоё', 'Вже твоє', 'Ya es tuyo', {
                    'pt-BR': 'Já é seu',
                    vi: 'Đã là của bạn',
                    id: 'Sudah jadi milikmu',
                    tr: 'Artık senin',
                    pl: 'Już twoje',
                  })}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                  {progressMirror.phrases > 0 && (
                    <ProgressMirrorStat value={progressMirror.phrases} label={LP('фраз', 'фраз', 'frases', { 'pt-BR': 'frases', vi: 'cụm từ', id: 'frasa', tr: 'ifade', pl: 'fraz' })} t={t} f={f} accent={paywallComparisonPremiumColor} />
                  )}
                  {progressMirror.words > 0 && (
                    <ProgressMirrorStat value={progressMirror.words} label={LP('слов', 'слів', 'palabras', { 'pt-BR': 'palavras', vi: 'từ', id: 'kata', tr: 'kelime', pl: 'słów' })} t={t} f={f} accent={paywallComparisonPremiumColor} />
                  )}
                  {progressMirror.xp > 0 && (
                    <ProgressMirrorStat value={progressMirror.xp} label="XP" t={t} f={f} accent={paywallComparisonPremiumColor} />
                  )}
                  {progressMirror.streak > 0 && (
                    <ProgressMirrorStat value={progressMirror.streak} label={LP('дн. серия', 'дн. серія', 'días racha', { 'pt-BR': 'dias seq.', vi: 'ngày chuỗi', id: 'hari', tr: 'gün seri', pl: 'dni serii' })} t={t} f={f} accent={paywallComparisonPremiumColor} />
                  )}
                </View>
                <Text style={{ color: t.textPrimary, fontSize: f.sub, lineHeight: f.sub * 1.45, marginTop: 10 }}>
                  {LP('Premium держит этот темп.', 'Premium тримає цей темп.', 'Premium mantiene este ritmo.', {
                    'pt-BR': 'O Premium mantém esse ritmo.',
                    vi: 'Premium giữ nhịp độ này.',
                    id: 'Premium menjaga ritme ini.',
                    tr: 'Premium bu tempoyu korur.',
                    pl: 'Premium utrzymuje to tempo.',
                  })}
                </Text>
              </View>
            )}

            {/* План #2: «Сейчас в бесплатном режиме» — нейтральная констатация (Стиль 4 Эксперт), */}
            {/* НЕ запугивание. Только для intro_ended (юзер только что вышел из полного доступа). */}
            {ctx === 'intro_ended' && (
              <View style={{ marginBottom: 16, backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalRaised : paywallCardBg, borderRadius: isCompassPaywall ? 9 : 14, borderWidth: 1, borderColor: isCompassPaywall ? 'rgba(255,231,182,0.16)' : t.textSecond + '40', padding: 14 }}>
                <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>
                  {LP('В бесплатном режиме', 'У безкоштовному режимі', 'En modo gratuito', {
                    'pt-BR': 'No modo gratuito',
                    vi: 'Ở chế độ miễn phí',
                    id: 'Di mode gratis',
                    tr: 'Ücretsiz modda',
                    pl: 'W trybie darmowym',
                  })}
                </Text>
                {[
                  LP('Уроки — 2 в день', 'Уроки — 2 на день', 'Lecciones — 2 al día', { 'pt-BR': 'Lições — 2 por dia', vi: 'Bài học — 2 mỗi ngày', id: 'Pelajaran — 2 per hari', tr: 'Dersler — günde 2', pl: 'Lekcje — 2 dziennie' }),
                  LP('Энергия — восстанавливается по одной', 'Енергія — відновлюється по одній', 'Energía — se recupera de a una', { 'pt-BR': 'Energia — recupera aos poucos', vi: 'Năng lượng — hồi từng điểm', id: 'Energi — pulih satu per satu', tr: 'Enerji — teker teker dolar', pl: 'Energia — wraca po jednej' }),
                  LP('Личный план — на паузе', 'Особистий план — на паузі', 'Plan personal — en pausa', { 'pt-BR': 'Plano pessoal — em pausa', vi: 'Kế hoạch cá nhân — tạm dừng', id: 'Rencana pribadi — dijeda', tr: 'Kişisel plan — duraklatıldı', pl: 'Plan osobisty — wstrzymany' }),
                ].map((line, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: i === 0 ? 0 : 6 }}>
                    <Ionicons name="ellipse" size={5} color={t.textMuted} />
                    <Text style={{ color: t.textPrimary, fontSize: f.sub, flex: 1 }}>{line}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Сравнение free → Premium */}
            <View
              style={{
                marginBottom: 18,
                backgroundColor: isCompassPaywall ? COMPASS_RICH.charcoalSoft : paywallSurfaceBg,
                borderRadius: isCompassPaywall ? 10 : 16,
                borderWidth: 1,
                borderColor: t.textSecond + '2a',
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  color: t.textPrimary,
                  fontSize: 12,
                  fontWeight: '800',
                  letterSpacing: 0.6,
                  textTransform: 'uppercase',
                  marginBottom: 10,
                }}
              >
                {LP('Что меняется с Premium', 'Що змінюється з Premium', 'Qué cambia con Premium', {
                  'pt-BR': 'O que muda com o Premium',
                  vi: 'Premium thay đổi điều gì',
                  id: 'Apa yang berubah dengan Premium',
                  tr: 'Premium ile ne değişir',
                  pl: 'Co zmienia Premium',
                })}
              </Text>
              {PAYWALL_COMPARISON_ROWS.map((row, idx, arr) => {
                const freeL = LP(row.freeRu, row.freeUk, row.freeEs, row.freePlanned);
                const title = LP(row.titleRu, row.titleUk, row.titleEs, row.titlePlanned);
                const prem1 = LP(row.premRu, row.premUk, row.premEs, row.premPlanned);
                const hasPrem2 = row.premRu2 != null && row.premUk2 != null && row.premEs2 != null;
                const prem2 = hasPrem2 && row.premPlanned2 ? LP(row.premRu2!, row.premUk2!, row.premEs2!, row.premPlanned2) : '';
                const premTextStyle = {
                  color: paywallComparisonPremiumColor,
                  fontSize: 10,
                  lineHeight: 13,
                  fontWeight: '800' as const,
                  textAlign: 'right' as const,
                };
                return (
                  <View
                    key={row.titleRu}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingVertical: 8,
                      borderBottomWidth: idx < arr.length - 1 ? StyleSheet.hairlineWidth : 0,
                      borderBottomColor: t.border,
                    }}
                  >
                    {isEnergyGlyph(row.emoji)
                      ? renderPremiumEnergyGlyph(22, 28)
                      : <Text style={{ width: 28, fontSize: 17, textAlign: 'center' }}>{row.emoji}</Text>}
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 6 }}>
                      <Text numberOfLines={1} style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{title}</Text>
                      <Text numberOfLines={2} style={{ color: t.textGhost, fontSize: 10, lineHeight: 13, marginTop: 2 }}>{freeL}</Text>
                    </View>
                    <View style={{ paddingHorizontal: 4, justifyContent: 'center' }}>
                      <Ionicons name="arrow-forward" size={13} color={t.textMuted} />
                    </View>
                    <View
                      style={{
                        flexGrow: 0,
                        flexShrink: 0,
                        width: '32%',
                        maxWidth: 136,
                        justifyContent: 'center',
                      }}
                    >
                      <Text style={premTextStyle}>{prem1}</Text>
                      {hasPrem2 ? (
                        <Text style={[premTextStyle, { marginTop: 1 }]}>{prem2}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}

              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 8 }} />

              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 4, gap: 8 }}>
                <Ionicons name="snow-outline" size={20} color="#64B4FF" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ color: t.textPrimary, fontSize: f.caption, fontWeight: '800' }}>{LP('Заморозка цепочки', 'Заморозка стріку', 'Protección de racha', {
                    'pt-BR': 'Proteção de sequência',
                    vi: 'Bảo vệ chuỗi ngày',
                    id: 'Perlindungan streak',
                    tr: 'Seri koruması',
                    pl: 'Ochrona serii',
                  })}</Text>
                  <Text style={{ color: t.textGhost, fontSize: 10, lineHeight: 13, marginTop: 1 }} numberOfLines={2}>
                    {LP('Серия не сгорит при пропуске дня', 'Захисти серію — навіть якщо пропустив день', 'Protege tu racha aunque te saltes un día', {
                      'pt-BR': 'Protege sua sequência se você pular um dia',
                      vi: 'Giữ chuỗi ngay cả khi bỏ lỡ một ngày',
                      id: 'Lindungi streak meski melewatkan satu hari',
                      tr: 'Bir günü kaçırsan da serini korur',
                      pl: 'Chroni serię, nawet gdy opuścisz dzień',
                    })}
                  </Text>
                </View>
                <View style={{ borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: t.correct + '20', borderWidth: 1, borderColor: t.correct + '45' }}>
                  <Text style={{ color: t.correct, fontSize: 9, fontWeight: '800' }}>PREMIUM</Text>
                </View>
              </View>
            </View>

            {/* БЛОК 3: Планы */}

            {/* Годовой */}
            <TouchableOpacity
              style={{
                borderRadius: compassRadius, padding: 18, marginBottom: 10,
                borderWidth: 1,
                borderColor: isCompassPaywall ? (selected === 'yearly' ? 'rgba(255,231,182,0.46)' : 'rgba(255,255,255,0.08)') : selected === 'yearly' ? t.textSecond : t.border,
                backgroundColor: isCompassPaywall ? (selected === 'yearly' ? COMPASS_RICH.creamSoft : '#74726E') : (selected === 'yearly' ? paywallSurfaceBg : paywallCardBg),
                opacity: purchasing && selected !== 'yearly' ? 0.5 : 1,
                shadowColor: isCompassPaywall ? 'transparent' : selected === 'yearly' ? t.textSecond : '#000',
                shadowOffset: { width: 0, height: isCompassPaywall ? 0 : 4 },
                shadowOpacity: isCompassPaywall ? 0 : selected === 'yearly' ? 0.32 : 0.08,
                shadowRadius: isCompassPaywall ? 0 : selected === 'yearly' ? 10 : 4,
                elevation: isCompassPaywall ? 0 : selected === 'yearly' ? 8 : 1,
              }}
              onPress={() => {
                hapticTap();
                logPaywallPlanSelectDeduped('yearly');
                setSelected('yearly');
              }}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {(() => {
                const priceStr = yearlyPrice;
                const trialReady = primaryYearlyHasTrial && !!priceStr;
                const periodLabel = LP('/ год', '/ рік', '/ año', {
                  'pt-BR': '/ ano',
                  vi: '/ năm',
                  id: '/ tahun',
                  tr: '/ yıl',
                  pl: '/ rok',
                });
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
                        <Text style={{ color: isCompassPaywall && selected === 'yearly' ? COMPASS_RICH.textDark : t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={1}>
                          {LP('Годовая подписка', 'Річна підписка', 'Suscripción anual', {
                            'pt-BR': 'Assinatura anual',
                            vi: 'Gói đăng ký hằng năm',
                            id: 'Langganan tahunan',
                            tr: 'Yıllık abonelik',
                            pl: 'Subskrypcja roczna',
                          })}
                        </Text>
                        {savingsPct !== null && (
                          <View style={{ backgroundColor: t.correct + '22', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: t.correct + '55' }}>
                            <Text style={{ color: t.correct, fontSize: f.label, fontWeight: '800' }}>{`−${savingsPct}%`}</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: isCompassPaywall && selected === 'yearly' ? 'rgba(33,23,14,0.72)' : t.textMuted, fontSize: f.caption, marginTop: 3 }} numberOfLines={3}>
                        {LP(
                          'Годовой доступ ко всем возможностям Premium',
                          'Річний доступ до всіх можливостей Premium',
                          'Acceso anual a todas las funciones Premium',
                          {
                            'pt-BR': 'Acesso anual a todos os recursos Premium',
                            vi: 'Truy cập hằng năm vào tất cả tính năng Premium',
                            id: 'Akses tahunan ke semua fitur Premium',
                            tr: 'Tüm Premium özelliklere yıllık erişim',
                            pl: 'Roczny dostęp do wszystkich funkcji Premium',
                          },
                        )}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', maxWidth: '44%', minWidth: 92 }}>
                      {trialReady ? (
                        <>
                          {/* Главный якорь — триал. Цена ниже мелким, но ЧИТАЕМЫМ цветом —
                              compliance с App Store 3.1.2 / Google Play (price must be clearly disclosed). */}
                          <Text style={{ color: t.correct, fontSize: f.numMd, fontWeight: '900', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {LP('Бесплатно', 'Безкоштовно', 'Gratis', {
                              'pt-BR': 'Grátis',
                              vi: 'Miễn phí',
                              id: 'Gratis',
                              tr: 'Ücretsiz',
                              pl: 'Za darmo',
                            })}
                          </Text>
                           <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                            {LP('на 3 дня', 'на 3 дні', 'durante 3 días', {
                              'pt-BR': 'por 3 dias',
                              vi: 'trong 3 ngày',
                              id: 'selama 3 hari',
                              tr: '3 gün boyunca',
                              pl: 'przez 3 dni',
                            })}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 5, textAlign: 'right' }} numberOfLines={2}>
                            {LP(`затем ${priceStr} ${periodLabel}`, `потім ${priceStr} ${periodLabel}`, `luego ${priceStr} ${periodLabel}`, {
                              'pt-BR': `depois ${priceStr} ${periodLabel}`,
                              vi: `sau đó ${priceStr} ${periodLabel}`,
                              id: `lalu ${priceStr} ${periodLabel}`,
                              tr: `sonra ${priceStr} ${periodLabel}`,
                              pl: `potem ${priceStr} ${periodLabel}`,
                            })}
                          </Text>
                          {!!monthlyEquivalentLabel && (
                            <>
                              <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '800', marginTop: 4, textAlign: 'right' }} numberOfLines={1}>
                                {monthlyEquivalentLabel}
                              </Text>
                              <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                                {yearlyBillingNote}
                              </Text>
                            </>
                          )}
                          {!!perDayLabel && (
                            <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                              {perDayLabel}
                            </Text>
                          )}
                        </>
                      ) : priceStr ? (
                        <>
                          {!!yearlyDoubledPrice && (
                            <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'right', textDecorationLine: 'line-through' }} numberOfLines={1}>
                              {yearlyDoubledPrice}
                            </Text>
                          )}
                          <Text style={{ color: isCompassPaywall && selected === 'yearly' ? COMPASS_RICH.textDark : t.textPrimary, fontSize: f.numMd, fontWeight: '800', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {priceStr}
                          </Text>
                          <Text style={{ color: isCompassPaywall && selected === 'yearly' ? 'rgba(33,23,14,0.72)' : t.textMuted, fontSize: f.caption, textAlign: 'right' }} numberOfLines={1}>
                            {periodLabel}
                          </Text>
                          {!!monthlyEquivalentLabel && (
                            <>
                              <Text style={{ color: t.textSecond, fontSize: f.label, fontWeight: '800', marginTop: 4, textAlign: 'right' }} numberOfLines={1}>
                                {monthlyEquivalentLabel}
                              </Text>
                              <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                                {yearlyBillingNote}
                              </Text>
                            </>
                          )}
                          {!!perDayLabel && (
                            <Text style={{ color: t.textGhost, fontSize: f.label, marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                              {perDayLabel}
                            </Text>
                          )}
                        </>
                      ) : (
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'right' }} numberOfLines={2}>
                          {missingStorePriceLabel}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })()}
              {selected === 'yearly' && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={isCompassPaywall ? COMPASS_RICH.textDark : t.correct} />
                  <Text style={{ flex: 1, minWidth: 0, color: isCompassPaywall ? COMPASS_RICH.textDark : t.correct, fontSize: f.caption, fontWeight: '700' }} numberOfLines={2}>
                    {LP('Выбран самый выгодный план', 'Обрано найвигідніший план', 'Plan más rentable seleccionado', {
                      'pt-BR': 'Plano mais vantajoso selecionado',
                      vi: 'Đã chọn gói lợi nhất',
                      id: 'Paket paling hemat dipilih',
                      tr: 'En avantajlı plan seçildi',
                      pl: 'Wybrano najkorzystniejszy plan',
                    })}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Месячный */}
            <TouchableOpacity
              style={{
                borderRadius: compassRadius, padding: 18, marginBottom: 20,
                borderWidth: 1,
                borderColor: isCompassPaywall ? (selected === 'monthly' ? 'rgba(255,231,182,0.46)' : 'rgba(255,255,255,0.08)') : selected === 'monthly' ? t.textSecond : t.border,
                backgroundColor: isCompassPaywall ? (selected === 'monthly' ? COMPASS_RICH.creamSoft : '#74726E') : (selected === 'monthly' ? paywallSurfaceBg : paywallCardBg),
                opacity: purchasing && selected !== 'monthly' ? 0.5 : 1,
                shadowColor: isCompassPaywall ? 'transparent' : selected === 'monthly' ? t.textSecond : '#000',
                shadowOffset: { width: 0, height: isCompassPaywall ? 0 : 4 },
                shadowOpacity: isCompassPaywall ? 0 : selected === 'monthly' ? 0.24 : 0.06,
                shadowRadius: isCompassPaywall ? 0 : selected === 'monthly' ? 8 : 4,
                elevation: isCompassPaywall ? 0 : selected === 'monthly' ? 6 : 1,
              }}
              onPress={() => {
                hapticTap();
                logPaywallPlanSelectDeduped('monthly');
                setSelected('monthly');
              }}
              activeOpacity={0.85}
              disabled={purchasing}
            >
              {(() => {
                const priceStr = monthlyPrice;
                const trialReady = primaryMonthlyHasTrial && !!priceStr;
                const periodLabel = LP('/ месяц', '/ місяць', '/mes', {
                  'pt-BR': '/mês',
                  vi: '/tháng',
                  id: '/bulan',
                  tr: '/ay',
                  pl: '/mies.',
                });
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0, paddingRight: 4 }}>
                      <Text style={{ color: isCompassPaywall && selected === 'monthly' ? COMPASS_RICH.textDark : t.textPrimary, fontSize: f.bodyLg, fontWeight: '700' }} numberOfLines={2}>
                        {LP('Ежемесячная подписка', 'Щомісячна підписка', 'Suscripción mensual', {
                          'pt-BR': 'Assinatura mensal',
                          vi: 'Gói đăng ký hằng tháng',
                          id: 'Langganan bulanan',
                          tr: 'Aylık abonelik',
                          pl: 'Subskrypcja miesięczna',
                        })}
                      </Text>
                      <Text style={{ color: isCompassPaywall && selected === 'monthly' ? 'rgba(33,23,14,0.72)' : t.textMuted, fontSize: f.sub, marginTop: 3 }} numberOfLines={3}>
                        {LP(
                          'Месячный доступ ко всем возможностям Premium',
                          'Місячний доступ до всіх можливостей Premium',
                          'Acceso mensual a todas las funciones Premium',
                          {
                            'pt-BR': 'Acesso mensal a todos os recursos Premium',
                            vi: 'Truy cập hằng tháng vào tất cả tính năng Premium',
                            id: 'Akses bulanan ke semua fitur Premium',
                            tr: 'Tüm Premium özelliklere aylık erişim',
                            pl: 'Miesięczny dostęp do wszystkich funkcji Premium',
                          },
                        )}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', maxWidth: '44%', minWidth: 92 }}>
                      {trialReady ? (
                        <>
                          <Text style={{ color: t.correct, fontSize: f.numMd, fontWeight: '900', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {LP('Бесплатно', 'Безкоштовно', 'Gratis', {
                              'pt-BR': 'Grátis',
                              vi: 'Miễn phí',
                              id: 'Gratis',
                              tr: 'Ücretsiz',
                              pl: 'Za darmo',
                            })}
                          </Text>
                          <Text style={{ color: t.textSecond, fontSize: f.caption, fontWeight: '700', marginTop: 1, textAlign: 'right' }} numberOfLines={1}>
                            {LP('на 3 дня', 'на 3 дні', 'durante 3 días', {
                              'pt-BR': 'por 3 dias',
                              vi: 'trong 3 ngày',
                              id: 'selama 3 hari',
                              tr: '3 gün boyunca',
                              pl: 'przez 3 dni',
                            })}
                          </Text>
                          <Text style={{ color: t.textMuted, fontSize: f.label, marginTop: 5, textAlign: 'right' }} numberOfLines={2}>
                            {LP(`затем ${priceStr} / месяц`, `потім ${priceStr} / місяць`, `luego ${priceStr} / mes`, {
                              'pt-BR': `depois ${priceStr} /mês`,
                              vi: `sau đó ${priceStr} /tháng`,
                              id: `lalu ${priceStr} /bulan`,
                              tr: `sonra ${priceStr} /ay`,
                              pl: `potem ${priceStr} /mies.`,
                            })}
                          </Text>
                        </>
                      ) : priceStr ? (
                        <>
                          <Text style={{ color: isCompassPaywall && selected === 'monthly' ? COMPASS_RICH.textDark : t.textPrimary, fontSize: f.numMd, fontWeight: '800', textAlign: 'right' }} adjustsFontSizeToFit numberOfLines={1}>
                            {priceStr}
                          </Text>
                          <Text style={{ color: isCompassPaywall && selected === 'monthly' ? 'rgba(33,23,14,0.72)' : t.textMuted, fontSize: f.caption, textAlign: 'right' }} numberOfLines={1}>{periodLabel}</Text>
                        </>
                      ) : (
                        <Text style={{ color: t.textMuted, fontSize: f.caption, fontWeight: '700', textAlign: 'right' }} numberOfLines={2}>
                          {missingStorePriceLabel}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })()}
              {selected === 'monthly' && (
                <View style={{ marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="checkmark-circle" size={16} color={isCompassPaywall ? COMPASS_RICH.textDark : t.correct} />
                  <Text style={{ flex: 1, minWidth: 0, color: isCompassPaywall ? COMPASS_RICH.textDark : t.correct, fontSize: f.caption, fontWeight: '700' }} numberOfLines={2}>
                    {LP('Выбран гибкий ежемесячный план', 'Обрано гнучкий щомісячний план', 'Plan mensual flexible', {
                      'pt-BR': 'Plano mensal flexível selecionado',
                      vi: 'Đã chọn gói tháng linh hoạt',
                      id: 'Paket bulanan fleksibel dipilih',
                      tr: 'Esnek aylık plan seçildi',
                      pl: 'Wybrano elastyczny plan miesięczny',
                    })}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {/* CTA */}
            {(() => {
              const selectedPkg = selected === 'yearly' ? packages.yearly : packages.monthly;
              const ctaPrice = selected === 'yearly' ? yearlyPrice : monthlyPrice;
              const hasTrial = (selected === 'yearly' ? primaryYearlyHasTrial : primaryMonthlyHasTrial) && !!ctaPrice;
              const canPurchaseSelectedPlan = !storePricesRequired || (!!selectedPkg && !!ctaPrice);
              const periodStr = selected === 'yearly'
                ? LP('/год', '/рік', '/año', {
                    'pt-BR': '/ano',
                    vi: '/năm',
                    id: '/tahun',
                    tr: '/yıl',
                    pl: '/rok',
                  })
                : LP('/мес', '/міс', '/mes', {
                    'pt-BR': '/mês',
                    vi: '/tháng',
                    id: '/bulan',
                    tr: '/ay',
                    pl: '/mies.',
                  });
              const ctaLabel = !canPurchaseSelectedPlan
                ? loadingPackages
                  ? LP('Загружаем…', 'Завантажуємо…', 'Loading…', {
                      'pt-BR': 'Preço pendente',
                      vi: 'Sắp có giá',
                      id: 'Harga segera tersedia',
                      tr: 'Fiyat hazırlanıyor',
                      pl: 'Cena wkrótce',
                    })
                  : LP('Загрузить цену', 'Завантажити ціну', 'Cargar precio', {
                      'pt-BR': 'Carregar preço',
                      vi: 'Tải giá',
                      id: 'Muat harga',
                      tr: 'Fiyatı yükle',
                      pl: 'Załaduj cenę',
                    })
                : hasTrial
                  ? LP(
                      `🚀 3 дня бесплатно — затем ${ctaPrice}${periodStr}`,
                      `🚀 3 дні безкоштовно — потім ${ctaPrice}${periodStr}`,
                      `🚀 3 días gratis — luego ${ctaPrice}${periodStr}`,
                      {
                        'pt-BR': `🚀 3 dias grátis — depois ${ctaPrice}${periodStr}`,
                        vi: `🚀 3 ngày miễn phí — sau đó ${ctaPrice}${periodStr}`,
                        id: `🚀 3 hari gratis — lalu ${ctaPrice}${periodStr}`,
                        tr: `🚀 3 gün ücretsiz — sonra ${ctaPrice}${periodStr}`,
                        pl: `🚀 3 dni za darmo — potem ${ctaPrice}${periodStr}`,
                      },
                    )
                  : selected === 'yearly'
                    ? LP('🚀 Получить Premium', '🚀 Отримати Premium', '🚀 Obtener Premium', {
                        'pt-BR': '🚀 Obter Premium',
                        vi: '🚀 Nhận Premium',
                        id: '🚀 Dapatkan Premium',
                        tr: '🚀 Premium al',
                        pl: '🚀 Pobierz Premium',
                      })
                    : LP('🚀 Оформить месячную подписку', '🚀 Оформити місячну підписку', '🚀 Contratar suscripción mensual', {
                        'pt-BR': '🚀 Assinar mensalmente',
                        vi: '🚀 Đăng ký gói tháng',
                        id: '🚀 Ambil langganan bulanan',
                        tr: '🚀 Aylık abonelik başlat',
                        pl: '🚀 Wykup subskrypcję miesięczną',
                      });
              return (
                <Animated.View style={{ transform: [{ scale: purchasing ? 1 : ctaPulse }] }}>
                <TouchableOpacity
                  onLayout={(e) => {
                    const { width, height } = e.nativeEvent.layout;
                    if (width !== ctaSize.w || height !== ctaSize.h) setCtaSize({ w: width, h: height });
                  }}
                  style={{
                    backgroundColor: isCompassPaywall ? COMPASS_RICH.creamSoft : t.textSecond, borderRadius: isCompassPaywall ? 10 : 16, padding: 18,
                    alignItems: 'center', marginBottom: 10,
                    borderWidth: 0,
                    borderColor: 'transparent',
                    overflow: 'hidden',
                    opacity: purchasing || loadingPackages ? 0.7 : 1,
                    shadowColor: isCompassPaywall ? 'transparent' : t.textSecond,
                    shadowOffset: { width: 0, height: isCompassPaywall ? 0 : 4 },
                    shadowOpacity: isCompassPaywall ? 0 : 0.5,
                    shadowRadius: isCompassPaywall ? 0 : 12,
                    elevation: isCompassPaywall ? 0 : 8,
                  }}
                  onPress={() => {
                    hapticTap();
                    logPaywallPlanSelectDeduped(selected);
                    logPaywallCtaClick(revenueContext, selected);
                    if (!canPurchaseSelectedPlan) {
                      void loadPremiumPackages().then((nextPackages) => {
                        const nextPkg = selected === 'yearly' ? nextPackages.yearly : nextPackages.monthly;
                        if (!storePriceTrim(nextPkg?.product.priceString)) {
                          emitAppEvent('action_toast', {
                            type: 'error',
                            messageRu: 'Не удалось загрузить из магазина. Проверь интернет и попробуй ещё раз.',
                            messageUk: 'Ціна магазину не завантажилась. Перевірте інтернет і спробуйте ще раз.',
                            messageEs: 'El precio de la tienda no se cargó. Revisa internet e inténtalo de nuevo.',
                          });
                        }
                      });
                      return;
                    }
                    handlePurchase(selected);
                  }}
                  activeOpacity={0.85}
                  disabled={purchasing || loadingPackages}
                >
                  {purchasing
                    ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <ActivityIndicator size="small" color={isCompassPaywall ? COMPASS_RICH.textDark : t.correctText} />
                        <Text style={{ color: isCompassPaywall ? COMPASS_RICH.textDark : t.correctText, fontSize: f.h2, fontWeight: '800' }}>
                          {LP('Обрабатываем…', 'Обробляємо…', 'Procesando…', {
                            'pt-BR': 'Processando…',
                            vi: 'Đang xử lý…',
                            id: 'Memproses…',
                            tr: 'İşleniyor…',
                            pl: 'Przetwarzamy…',
                          })}
                        </Text>
                      </View>
                    : <Text style={{ color: isCompassPaywall ? COMPASS_RICH.textDark : t.correctText, fontSize: f.h2, fontWeight: '800' }} adjustsFontSizeToFit numberOfLines={1}>
                        {ctaLabel}
                      </Text>
                  }
                  {/* Бегущий блик на главном CTA — только когда кнопка активна
                      (не во время загрузки/покупки). Своего shimmer тут нет. */}
                  {canPurchaseSelectedPlan && !purchasing && !loadingPackages && ctaSize.w > 0 && (
                    <ShineOverlay width={ctaSize.w} height={ctaSize.h} borderRadius={isCompassPaywall ? 10 : 16} />
                  )}
                </TouchableOpacity>
                </Animated.View>
              );
            })()}

            {/* Мелкие хуки */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 16 }}>
              {primaryHasTrialOffer && (
                <Text style={{ color: t.textGhost, fontSize: f.label }}>
                  {LP('✓ Без списания сейчас', '✓ Без списання зараз', '✓ Sin cobro ahora', {
                    'pt-BR': '✓ Sem cobrança agora',
                    vi: '✓ Không bị tính phí ngay',
                    id: '✓ Tanpa biaya sekarang',
                    tr: '✓ Şimdi ücret alınmaz',
                    pl: '✓ Bez opłaty teraz',
                  })}
                </Text>
              )}
              <Text style={{ color: t.textGhost, fontSize: f.label }}>
                {LP('✓ Отмена в любой момент', '✓ Скасування в будь-який час', '✓ Cancela cuando quieras', {
                  'pt-BR': '✓ Cancele quando quiser',
                  vi: '✓ Hủy bất cứ lúc nào',
                  id: '✓ Batalkan kapan saja',
                  tr: '✓ İstediğin zaman iptal et',
                  pl: '✓ Anuluj w dowolnym momencie',
                })}
              </Text>
            </View>

            {/* Восстановить */}
            <TouchableOpacity
              style={{ paddingVertical: 10, alignItems: 'center' }}
              onPress={() => { hapticTap(); handleRestore(); }}
              disabled={restoring}
            >
              <Text style={{ color: restoring ? t.textGhost : t.textSecond, fontSize: f.body }}>
                {LP('Восстановить подписку', 'Відновити підписку', 'Restaurar suscripción', {
                  'pt-BR': 'Restaurar assinatura',
                  vi: 'Khôi phục gói đăng ký',
                  id: 'Pulihkan langganan',
                  tr: 'Aboneliği geri yükle',
                  pl: 'Przywróć subskrypcję',
                })}
              </Text>
            </TouchableOpacity>

            {/* Продолжить бесплатно */}
            <TouchableOpacity
              style={{ paddingVertical: 8, alignItems: 'center' }}
              onPress={() => {
                hapticTap();
                requestPaywallClose('continue_free');
              }}
            >
              <Text style={{ color: t.textGhost, fontSize: f.body, textDecorationLine: 'underline' }}>
                {LP('Продолжить бесплатно', 'Продовжити безкоштовно', 'Continuar gratis', {
                  'pt-BR': 'Continuar grátis',
                  vi: 'Tiếp tục miễn phí',
                  id: 'Lanjut gratis',
                  tr: 'Ücretsiz devam et',
                  pl: 'Kontynuuj za darmo',
                })}
              </Text>
            </TouchableOpacity>

            {(() => {
              const footerPrice = selected === 'yearly' ? yearlyPrice : monthlyPrice;
              if (!footerPrice) {
                return (
                  <View style={{ marginTop: 12 }}>
                    <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', lineHeight: 18 }}>
                      {LP(
                        'Точная сумма появится перед покупкой.',
                        'Точна сума зʼявиться перед покупкою.',
                        'El precio de la tienda aparecerá antes de la compra.',
                        {
                          'pt-BR': 'O preço da loja aparecerá antes da compra.',
                          vi: 'Giá trong cửa hàng sẽ xuất hiện trước khi mua.',
                          id: 'Harga toko akan muncul sebelum pembelian.',
                          tr: 'Mağaza fiyatı satın alma öncesinde görünür.',
                          pl: 'Cena ze sklepu pojawi się przed zakupem.',
                        },
                      )}
                    </Text>
                  </View>
                );
              }
              const footerHasTrial = (selected === 'yearly' ? primaryYearlyHasTrial : primaryMonthlyHasTrial) && !!footerPrice;
              const footerPeriodUk =
                selected === 'yearly'
                  ? 'річну підписку PhraseMan Premium'
                  : 'місячну підписку PhraseMan Premium';
              const footerPeriodRu =
                selected === 'yearly'
                  ? 'годовую подписку PhraseMan Premium'
                  : 'месячную подписку PhraseMan Premium';
              const footerPeriodEs =
                selected === 'yearly'
                  ? 'suscripción anual PhraseMan Premium'
                  : 'suscripción mensual PhraseMan Premium';
              const footerPeriodPlanned: PremiumPlannedCopy = selected === 'yearly'
                ? {
                    'pt-BR': 'assinatura anual PhraseMan Premium',
                    vi: 'gói PhraseMan Premium hằng năm',
                    id: 'langganan tahunan PhraseMan Premium',
                    tr: 'yıllık PhraseMan Premium aboneliği',
                    pl: 'roczna subskrypcja PhraseMan Premium',
                  }
                : {
                    'pt-BR': 'assinatura mensal PhraseMan Premium',
                    vi: 'gói PhraseMan Premium hằng tháng',
                    id: 'langganan bulanan PhraseMan Premium',
                    tr: 'aylık PhraseMan Premium aboneliği',
                    pl: 'miesięczna subskrypcja PhraseMan Premium',
                  };
              const ios = effectiveOs === 'ios';

              const trialUk = ios
                ? `Якщо для цього плану доступні 3 дні без оплати: після закінчення пробного періоду з вашого Apple ID буде списано ${footerPrice} за обраний термін, якщо ви не скасуєте принаймні за 24 години до його закінчення (Налаштування → Apple ID → Підписки).`
                : `Якщо для цього плану доступні 3 дні без оплати: після закінчення пробного періоду з вашого облікового запису Google буде списано ${footerPrice} за обраний термін, якщо ви не скасуєте принаймні за 24 години до його закінчення (Google Play → Підписки).`;

              const trialRu = ios
                ? `Если для этого плана доступны 3 дня без оплаты: после окончания пробного периода с вашего Apple ID будет списана сумма ${footerPrice} за выбранный срок, если вы не отмените подписку как минимум за 24 часа до его окончания (Настройки → Apple ID → Подписки).`
                : `Если для этого плана доступны 3 дня без оплаты: после окончания пробного периода с вашего аккаунта Google будет списана сумма ${footerPrice} за выбранный срок, если вы не отмените подписку как минимум за 24 часа до его окончания (Google Play → Подписки).`;

              const trialEs = ios
                ? `Si este plan ofrece 3 días sin cargo: al terminar la prueba, tu Apple ID cargará ${footerPrice} por el período elegido si no cancelas al menos 24 horas antes (Ajustes → Apple ID → Suscripciones).`
                : `Si este plan ofrece 3 días sin cargo: al terminar la prueba, tu cuenta Google cargará ${footerPrice} por el período elegido si no cancelas al menos 24 horas antes (Google Play → Suscripciones).`;

              const legalRu = ios
                ? `Оформляется ${footerPeriodRu} с автопродлением. Списание с Apple ID по тарифам App Store для вашего региона: ${footerPrice}. Отменить можно в любой момент: Настройки → Apple ID → Подписки.`
                : `Оформляется ${footerPeriodRu} с автопродлением. Оплата через Google Play для вашего региона: ${footerPrice}. Отмена: Google Play → Подписки.`;
              const legalUk = ios
                ? `Оформлюється ${footerPeriodUk} із автоматичним поновленням. Оплата знімається з Apple ID за тарифами App Store для вашого регіону: ${footerPrice}. Скасувати можна в будь-який момент: Налаштування → Apple ID → Підписки.`
                : `Оформлюється ${footerPeriodUk} із автоматичним поновленням. Оплата через Google Play для вашого регіону: ${footerPrice}. Скасувати: Google Play → Підписки.`;
              const legalEs = ios
                ? `Contratas la ${footerPeriodEs} con renovación automática. El cobro se hace en tu Apple ID según los precios del App Store de tu zona: ${footerPrice}. Puedes cancelar cuando quieras: Ajustes → Apple ID → Suscripciones.`
                : `Contratas la ${footerPeriodEs} con renovación automática. Pago vía Google Play en tu zona: ${footerPrice}. Cancelación: Google Play → Suscripciones.`;
              const legalPlanned: PremiumPlannedCopy = {
                'pt-BR': ios
                  ? `Você assina a ${footerPeriodPlanned['pt-BR']} com renovação automática. A cobrança é feita no Apple ID conforme os preços da App Store da sua região: ${footerPrice}. Você pode cancelar quando quiser: Ajustes → Apple ID → Assinaturas.`
                  : `Você assina a ${footerPeriodPlanned['pt-BR']} com renovação automática. O pagamento é feito pelo Google Play na sua região: ${footerPrice}. Cancelamento: Google Play → Assinaturas.`,
                vi: ios
                  ? `Bạn đăng ký ${footerPeriodPlanned.vi} có tự động gia hạn. Apple ID sẽ tính phí theo giá App Store tại khu vực của bạn: ${footerPrice}. Bạn có thể hủy bất cứ lúc nào: Cài đặt → Apple ID → Đăng ký.`
                  : `Bạn đăng ký ${footerPeriodPlanned.vi} có tự động gia hạn. Thanh toán qua Google Play tại khu vực của bạn: ${footerPrice}. Hủy tại: Google Play → Gói đăng ký.`,
                id: ios
                  ? `Kamu berlangganan ${footerPeriodPlanned.id} dengan perpanjangan otomatis. Biaya ditagih ke Apple ID sesuai harga App Store di wilayahmu: ${footerPrice}. Kamu bisa membatalkan kapan saja: Pengaturan → Apple ID → Langganan.`
                  : `Kamu berlangganan ${footerPeriodPlanned.id} dengan perpanjangan otomatis. Pembayaran melalui Google Play di wilayahmu: ${footerPrice}. Pembatalan: Google Play → Langganan.`,
                tr: ios
                  ? `${footerPeriodPlanned.tr} otomatik yenilemeyle başlar. Ücret, bölgenizdeki App Store fiyatlarına göre Apple ID hesabından alınır: ${footerPrice}. İstediğiniz zaman iptal edebilirsiniz: Ayarlar → Apple ID → Abonelikler.`
                  : `${footerPeriodPlanned.tr} otomatik yenilemeyle başlar. Ödeme, bölgenizdeki Google Play üzerinden yapılır: ${footerPrice}. İptal: Google Play → Abonelikler.`,
                pl: ios
                  ? `Aktywujesz ${footerPeriodPlanned.pl} z automatycznym odnowieniem. Opłata zostanie pobrana z Apple ID według cen App Store w twoim regionie: ${footerPrice}. Możesz anulować w dowolnym momencie: Ustawienia → Apple ID → Subskrypcje.`
                  : `Aktywujesz ${footerPeriodPlanned.pl} z automatycznym odnowieniem. Płatność przez Google Play w twoim regionie: ${footerPrice}. Anulowanie: Google Play → Subskrypcje.`,
              };

              return (
                <View style={{ marginTop: 12 }}>
                  <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', lineHeight: 18 }}>
                    {LP(legalRu, legalUk, legalEs, legalPlanned)}
                  </Text>
                  {!!selectedMonthlyEquivalent && (
                    <Text style={{ color: t.textGhost, fontSize: f.label, textAlign: 'center', lineHeight: 17, marginTop: 8 }}>
                      {LP(
                        `Эквивалент ${selectedMonthlyEquivalent} / месяц указан только для сравнения; списание идет за год.`,
                        `Еквівалент ${selectedMonthlyEquivalent} / місяць наведено лише для порівняння; списання йде за рік.`,
                        `El equivalente de ${selectedMonthlyEquivalent} / mes es solo comparativo; el cobro es anual.`,
                        {
                          'pt-BR': `O equivalente de ${selectedMonthlyEquivalent} /mês é apenas comparativo; a cobrança é anual.`,
                          vi: `Mức tương đương ${selectedMonthlyEquivalent} /tháng chỉ để so sánh; phí được tính hằng năm.`,
                          id: `Setara ${selectedMonthlyEquivalent} /bulan hanya untuk perbandingan; tagihan tahunan.`,
                          tr: `${selectedMonthlyEquivalent} /ay eşdeğeri yalnızca karşılaştırma içindir; ödeme yıllıktır.`,
                          pl: `Ekwiwalent ${selectedMonthlyEquivalent} /mies. służy tylko do porównania; opłata jest roczna.`,
                        },
                      )}
                    </Text>
                  )}
                  {footerHasTrial ? (
                    <Text
                      style={{
                        color: t.textGhost,
                        fontSize: f.label,
                        textAlign: 'center',
                        lineHeight: 18,
                        marginTop: 10,
                    }}
                  >
                      {LP(trialRu, trialUk, trialEs, {
                        'pt-BR': ios
                          ? `Se este plano oferecer 3 dias grátis: ao fim do teste, seu Apple ID cobrará ${footerPrice} pelo período escolhido se você não cancelar pelo menos 24 horas antes (Ajustes → Apple ID → Assinaturas).`
                          : `Se este plano oferecer 3 dias grátis: ao fim do teste, sua conta Google cobrará ${footerPrice} pelo período escolhido se você não cancelar pelo menos 24 horas antes (Google Play → Assinaturas).`,
                        vi: ios
                          ? `Nếu gói này có 3 ngày miễn phí: sau khi hết dùng thử, Apple ID của bạn sẽ bị tính ${footerPrice} cho kỳ đã chọn nếu bạn không hủy trước ít nhất 24 giờ (Cài đặt → Apple ID → Đăng ký).`
                          : `Nếu gói này có 3 ngày miễn phí: sau khi hết dùng thử, tài khoản Google của bạn sẽ bị tính ${footerPrice} cho kỳ đã chọn nếu bạn không hủy trước ít nhất 24 giờ (Google Play → Gói đăng ký).`,
                        id: ios
                          ? `Jika paket ini menawarkan 3 hari gratis: setelah uji coba berakhir, Apple ID kamu akan dikenai ${footerPrice} untuk periode yang dipilih jika tidak dibatalkan setidaknya 24 jam sebelumnya (Pengaturan → Apple ID → Langganan).`
                          : `Jika paket ini menawarkan 3 hari gratis: setelah uji coba berakhir, akun Google kamu akan dikenai ${footerPrice} untuk periode yang dipilih jika tidak dibatalkan setidaknya 24 jam sebelumnya (Google Play → Langganan).`,
                        tr: ios
                          ? `Bu plan 3 gün ücretsiz deneme sunuyorsa: deneme bitince en az 24 saat önce iptal etmezsen seçilen dönem için Apple ID hesabından ${footerPrice} alınır (Ayarlar → Apple ID → Abonelikler).`
                          : `Bu plan 3 gün ücretsiz deneme sunuyorsa: deneme bitince en az 24 saat önce iptal etmezsen seçilen dönem için Google hesabından ${footerPrice} alınır (Google Play → Abonelikler).`,
                        pl: ios
                          ? `Jeśli ten plan oferuje 3 dni bez opłaty: po zakończeniu okresu próbnego Apple ID pobierze ${footerPrice} za wybrany okres, jeśli nie anulujesz co najmniej 24 godziny wcześniej (Ustawienia → Apple ID → Subskrypcje).`
                          : `Jeśli ten plan oferuje 3 dni bez opłaty: po zakończeniu okresu próbnego konto Google pobierze ${footerPrice} za wybrany okres, jeśli nie anulujesz co najmniej 24 godziny wcześniej (Google Play → Subskrypcje).`,
                      })}
                    </Text>
                  ) : null}
                  <Text
                    style={{
                      color: t.textGhost,
                      fontSize: f.label,
                      textAlign: 'center',
                      lineHeight: 17,
                      marginTop: footerHasTrial ? 10 : 8,
                    }}
                  >
                    {LP(
                      'Ссылки Privacy Policy и Terms of Use ниже дополняют условия покупки в магазине приложений.',
                      'Посилання Privacy Policy та Terms of Use нижче доповнюють умови покупки в магазині застосунків.',
                      'Privacy Policy y Terms of Use enlazan abajo y completan los términos de compra en la tienda de apps.',
                      {
                        'pt-BR': 'Os links Privacy Policy e Terms of Use abaixo complementam os termos de compra na loja de apps.',
                        vi: 'Các liên kết Privacy Policy và Terms of Use bên dưới bổ sung điều kiện mua trong cửa hàng ứng dụng.',
                        id: 'Tautan Privacy Policy dan Terms of Use di bawah melengkapi ketentuan pembelian di toko aplikasi.',
                        tr: 'Aşağıdaki Privacy Policy ve Terms of Use bağlantıları, uygulama mağazasındaki satın alma koşullarını tamamlar.',
                        pl: 'Linki Privacy Policy i Terms of Use poniżej uzupełniają warunki zakupu w sklepie z aplikacjami.',
                      },
                    )}
                  </Text>
                </View>
              );
            })()}
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 14, marginBottom: 4 }}>
              <TouchableOpacity onPress={() => { hapticTap(); Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>
                <Text style={{ color: t.textGhost, fontSize: f.label, textDecorationLine: 'underline' }}>
                  Privacy Policy
                </Text>
              </TouchableOpacity>
              <Text style={{ color: t.textGhost, fontSize: f.label }}>·</Text>
              <TouchableOpacity onPress={() => { hapticTap(); Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>
                <Text style={{ color: t.textGhost, fontSize: f.label, textDecorationLine: 'underline' }}>
                  Terms of Use
                </Text>
              </TouchableOpacity>
            </View>
            <View style={{ alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
              <ReportErrorButton
                screen="premium_modal"
                dataId="premium_offer"
                dataText={triLang(lang, {
                  ru: 'Экран Premium',
                  uk: 'Екран Premium',
                  es: 'Pantalla Premium',
                  'pt-BR': 'Tela Premium',
                  vi: 'Màn hình Premium',
                  id: 'Layar Premium',
                  tr: 'Premium ekranı',
                  pl: 'Ekran Premium',
                })}
              />
            </View>
          </ScrollView>
          </Animated.View>
        </ContentWrap>
      </SafeAreaView>
    </PremiumScreenShell>
  );
}

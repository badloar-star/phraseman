import React, { memo, useState, useEffect, useRef, useCallback, forwardRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, ScrollView,
  Animated, BackHandler, Keyboard, Easing,
  Platform,
  StatusBar,
  ActivityIndicator,
  Image as RNImage,
  type ImageStyle,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
  type ScrollViewProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReferralCode } from '../app/referral_system';
import { hapticTap } from '../hooks/use-haptics';
import { CLOUD_SYNC_ENABLED, FORCE_PREMIUM } from '../app/config';
// Онбординг закреплён за темой "Графит" (MINIMAL_DARK) — это одна из двух
// бесплатных тем (вторая — "Скетч"/MINIMAL_LIGHT). Импортируем под алиасом
// `DARK`, чтобы не править все ~150 ссылок DARK.* по тексту экрана.
import { MINIMAL_DARK as DARK } from '../constants/theme';
import { getDeviceBootstrapLocale, type Lang } from '../constants/i18n';
import {
  UserProfile,
  estimateDaysToTarget,
  addDays,
  type LearningGoal,
  type MinutesPerDay,
  type CurrentLevel,
  type TargetLevel,
} from '../app/types/user_profile';
import { scheduleDailyReminder } from '../app/notifications';
import { checkNameAvailabilityDetailed, reserveNameDetailed, warmNameAvailabilityAuth } from '../app/firestore_leaderboard';
import { enqueueThemedBlockingInfoAlert } from '../app/themed_blocking_alert_queue';
import { useScreen } from '../hooks/use-screen';
import {
  signInWithProvider,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  AUTH_PROMPT_SHOWN_KEY,
  APPLE_ANDROID_MISSING_SERVICE_ID,
  type AuthProviderId,
} from '../app/auth_provider';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';
import {
  activatePendingPersonalPlanAfterPremium,
  queuePendingPersonalPlanActivation,
  PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY,
} from '../app/personal_plan_activation';
import { type PersonalPlanId, type PlanMinutesChoice } from '../app/personal_plan_catalog';
import { resolvePersonalPlanForGoal, type PersonalPlanSetupGoal } from '../app/personal_plan_recommendation';
import { getOnboardingAbVariant, isOnboardingPlanOnly, type OnboardingAbVariant } from '../app/remote_flags';
import { onAppEvent } from '../app/events';
import { getStableId, peekStableId } from '../app/stable_id';
import { usePremium } from './PremiumContext';
import DuoPressable from './DuoPressable';
import { readPersonalPlanState } from '../app/personal_plan_state';
import { useOnboardingSounds } from '../hooks/use-onboarding-sounds';
import PremiumCelebrationModal from './PremiumCelebrationModal';

/**
 * Скролл онбординга — БЕЗ резинки/overscroll.
 *
 * На остальных ~58 экранах используется `BouncyScrollView` (iOS native bounce +
 * Android edge-pull). В онбординге резинка не нужна: экраны почти всегда влезают
 * без прокрутки, а упругий отскок на первом запуске выглядит как глюк. Поэтому
 * здесь — обычный <ScrollView> с явно выключенным bounce в обе стороны и на обеих
 * платформах (`bounces`/`alwaysBounceVertical` для iOS, `overScrollMode="never"`
 * для Android). Drop-in: принимает те же ScrollViewProps, что и BouncyScrollView.
 */
const OnboardingScroll = forwardRef<ScrollView, ScrollViewProps>(function OnboardingScroll(
  props,
  ref,
) {
  return (
    <ScrollView
      ref={ref}
      bounces={false}
      alwaysBounceVertical={false}
      overScrollMode="never"
      {...props}
    />
  );
});

const AppInfoDialog = {
  alert(title: string, message: string) {
    void enqueueThemedBlockingInfoAlert(title, message, 'OK');
  },
};

interface Props {
  onDone: () => void;
  initialLang?: Lang;
  onLangSelect?: (lang: Lang) => void;
  onIntroFullAccessStart?: () => Promise<boolean> | boolean;
  onPersonalPlanPaywallStart?: () => Promise<void> | void;
  /**
   * Онбординг переоткрыт на шаге «Имя» сразу после пейвола (continue-free /
   * покупка). Тогда стартуем прямо на 'name' без блокирующего async-резолва A/B:
   * экран имени рисуется в первом кадре, без пустого «resolving»-экрана и без
   * ожидания Keychain в getStableId — это и есть «думает» после кнопки.
   */
  startAtNameStep?: boolean;
}


const TARGET_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'] as const;
const PROGRESS_STEPS = ['name', 'streak', 'auth'] as const;
type OnboardingStepKey = 'beta' | 'planEntry' | 'planGoal' | 'planLevel' | 'planMinutes' | 'planLoading' | 'planResult' | 'planPaywall' | 'planPicker' | 'planDetails' | 'welcome' | 'demo2' | 'demo' | 'name' | 'streak' | 'auth';
type OnboardingAbEntryStep = 'planEntry';
type OnboardingAbSimpleStep = 'name' | 'demo2' | 'demo';
type OnboardingNameAvailabilityStatus = 'idle' | 'checking' | 'available' | 'taken' | 'error';
type OnboardingNameAvailabilityState = {
  status: OnboardingNameAvailabilityStatus;
  value: string;
  message: string | null;
};
type OnboardingNameValidation =
  | { ok: true; trimmed: string }
  | { ok: false; message: string };
const NAME_AVAILABILITY_DEBOUNCE_MS = 700;
// Тема онбординга = канонические 5 тем планов (один к одному, см. resolvePersonalPlanForGoal).
type OnboardingPlanGoal = PersonalPlanSetupGoal;
type OnboardingPlanLevel = 'a0' | 'a1' | 'a2' | 'b1';
type OnboardingBillingChoice = 'monthly' | 'annual';
type OnboardingNicknameMode = 'regular' | 'personal_plan';
type StreakMilestoneIconKind = 'flame' | 'bolt' | 'gem' | 'crown';
type OnboardingParticleSpec = {
  left: `${number}%`;
  top: `${number}%`;
  size: number;
  delay: number;
  duration: number;
  rise: number;
  drift: number;
  opacity: number;
};
const USE_ELITE_ONBOARDING_WELCOME = true;
const ONBOARDING_AB_VARIANT_STORAGE_KEY = 'onboarding_ab_variant_v1';
const ONBOARDING_AB_FALLBACK_ENTRY_STEP: OnboardingAbEntryStep = 'planEntry';
const ONBOARDING_AB_FALLBACK_SIMPLE_STEP: OnboardingAbSimpleStep = 'name';
const LEGACY_PERSONAL_PLAN_ONBOARDING_STEPS = new Set<OnboardingStepKey>([
  'planEntry',
  'planGoal',
  'planLevel',
  'planMinutes',
  'planLoading',
  'planResult',
  'planPaywall',
  'planPicker',
  'planDetails',
]);

function onboardingSimpleStepForVariant(_variant: OnboardingAbVariant): OnboardingAbSimpleStep {
  // После кнопки «Просто посмотреть приложение» всегда сразу идёт ввод имени.
  // Демо-квиз-экраны ('demo'/'demo2', напр. «I'm fed up with this job») удалены из
  // флоу — на них больше не маршрутизируем ни для одного A/B-варианта.
  return 'name';
}

function isKnownOnboardingStep(value: string): value is OnboardingStepKey {
  return (
    value === 'beta' ||
    value === 'planEntry' ||
    value === 'planGoal' ||
    value === 'planLevel' ||
    value === 'planMinutes' ||
    value === 'planLoading' ||
    value === 'planResult' ||
    value === 'planPaywall' ||
    value === 'planPicker' ||
    value === 'planDetails' ||
    value === 'welcome' ||
    value === 'demo2' ||
    value === 'demo' ||
    value === 'name' ||
    value === 'streak' ||
    value === 'auth'
  );
}

function normalizeRestoredOnboardingStep(
  saved: string | null,
  pendingNickname: string | null,
  entryStep: OnboardingAbEntryStep,
): OnboardingStepKey {
  if (!saved) return entryStep;
  const restored = saved === 'energy' ? 'auth' : saved;
  if (!isKnownOnboardingStep(restored)) return entryStep;
  if (restored === 'beta' || LEGACY_PERSONAL_PLAN_ONBOARDING_STEPS.has(restored)) return entryStep;
  if (restored === 'welcome' || restored === 'demo2' || restored === 'demo') return entryStep;
  if (restored === 'name' && pendingNickname !== '1') return entryStep;
  return restored;
}

export interface OnboardingTheme {
  accent: string;       // основной неон (кнопки, прогресс, бренд)
  accent2: string;      // мягкий вторичный неон (градиенты, иконки-акценты)
  accentDeep: string;   // глубокий неон (край кнопок DuoPressable edgeColor)
  accentIce: string;    // ледяной акцент для второстепенного текста
  accentBg: string;     // полупрозрачная заливка акцентом (rgba ~0.16)
  accentBgSoft: string; // ещё мягче (rgba ~0.10) для невыбранных карточек
  accentBorder: string; // граница акцентом (rgba ~0.42)
  accentBorderSoft: string; // граница мягче (rgba ~0.30)
  textPrimary: string;  // основной светлый текст
  textMuted: string;    // приглушённый текст
  ctaText: string;      // текст на залитой акцентом CTA (тёмный)
  bgEdge: string;       // самый тёмный фон (края радиального градиента)
  bgTop: string;        // верх фонового градиента
  bgBottom: string;     // низ фонового градиента (с цветным подтоном)
  heroGradient: [string, string, string]; // заливка hero-CTA/бренд-градиент
}

const ONBOARDING_THEME: OnboardingTheme = {
  accent: '#F2B84B',
  accent2: '#FFD472',
  accentDeep: '#B98522',
  accentIce: '#FFE8B0',
  accentBg: 'rgba(242,184,75,0.16)',
  accentBgSoft: 'rgba(242,184,75,0.10)',
  accentBorder: 'rgba(242,184,75,0.42)',
  accentBorderSoft: 'rgba(255,212,114,0.30)',
  textPrimary: '#FFF8E8',
  textMuted: '#D8CCB5',
  ctaText: '#1A1203',
  bgEdge: '#050505',
  bgTop: '#0B0909',
  bgBottom: '#171106',
  heroGradient: ['#FFD472', '#FFE8B0', '#F2B84B'],
};

type OnboardingStyles = ReturnType<typeof makeOnboardingStyles>;
const ONBOARDING_BG_LIBRARY = require('../assets/images/onboarding/onboarding-bg-welcome-wide.webp');
const ONBOARDING_BG_WELCOME = ONBOARDING_BG_LIBRARY;
const ONBOARDING_BG_BETA = ONBOARDING_BG_LIBRARY;
const ONBOARDING_BG_NAME = ONBOARDING_BG_LIBRARY;
const ONBOARDING_BG_BUILDER = ONBOARDING_BG_LIBRARY;
const ONBOARDING_BG_QUIZ = ONBOARDING_BG_LIBRARY;
const ONBOARDING_BG_STREAK = ONBOARDING_BG_LIBRARY;
const ONBOARDING_BG_AUTH = ONBOARDING_BG_LIBRARY;
const ONBOARDING_LINGMAN_ICON = require('../assets/images/onboarding/lingman-icon-transparent.webp');
const ONBOARDING_AUTH_ICON = require('../assets/images/onboarding/auth-quick-start-icon.webp');
const ONBOARDING_STREAK_ICONS: Record<StreakMilestoneIconKind, ImageSourcePropType> = {
  flame: require('../assets/images/onboarding/streak-flame-medallion.webp'),
  bolt: require('../assets/images/onboarding/streak-bolt-medallion.webp'),
  gem: require('../assets/images/onboarding/streak-gem-medallion.webp'),
  crown: require('../assets/images/onboarding/streak-crown-medallion.webp'),
};
const ONBOARDING_PLAN_ICONS = {
  travel: require('../assets/images/onboarding/plan-icons/icon-travel.png'),
  work: require('../assets/images/onboarding/plan-icons/icon-work.png'),
  home: require('../assets/images/onboarding/plan-icons/icon-home.png'),
  study: require('../assets/images/onboarding/plan-icons/icon-study.png'),
  beginner: require('../assets/images/onboarding/plan-icons/icon-beginner.png'),
  basic: require('../assets/images/onboarding/plan-icons/icon-basic.png'),
  speaking: require('../assets/images/onboarding/plan-icons/icon-speaking.png'),
  confidence: require('../assets/images/onboarding/plan-icons/icon-confidence.png'),
  time: require('../assets/images/onboarding/plan-icons/icon-time.png'),
  phrase: require('../assets/images/onboarding/plan-icons/icon-phrase.png'),
  path: require('../assets/images/onboarding/plan-icons/icon-path.png'),
} as const satisfies Record<string, ImageSourcePropType>;
const ONBOARDING_PAYWALL_ICONS = {
  plan: require('../assets/images/onboarding/plan-icons/paywall-plan.png'),
  lessons: require('../assets/images/onboarding/plan-icons/paywall-lessons.png'),
  quizzes: require('../assets/images/onboarding/plan-icons/paywall-quizzes.png'),
  cards: require('../assets/images/onboarding/plan-icons/paywall-cards.png'),
  energy: require('../assets/images/onboarding/plan-icons/paywall-energy.png'),
  arena: require('../assets/images/onboarding/plan-icons/paywall-arena.png'),
  errors: require('../assets/images/onboarding/plan-icons/paywall-errors.png'),
  trainer: require('../assets/images/onboarding/plan-icons/paywall-trainer.png'),
  analytics: require('../assets/images/onboarding/plan-icons/paywall-analytics.png'),
  themes: require('../assets/images/onboarding/plan-icons/paywall-themes.png'),
  frame: require('../assets/images/onboarding/plan-icons/paywall-frame.png'),
} as const satisfies Record<string, ImageSourcePropType>;
const ONBOARDING_PRELOADED_ICON_ASSETS = [
  ONBOARDING_BG_LIBRARY,
  ONBOARDING_LINGMAN_ICON,
  ONBOARDING_AUTH_ICON,
  ...Object.values(ONBOARDING_STREAK_ICONS),
  ...Object.values(ONBOARDING_PLAN_ICONS),
  ...Object.values(ONBOARDING_PAYWALL_ICONS),
] as const;
type PlanIconSource = (typeof ONBOARDING_PLAN_ICONS)[keyof typeof ONBOARDING_PLAN_ICONS];
type PaywallIconSource = (typeof ONBOARDING_PAYWALL_ICONS)[keyof typeof ONBOARDING_PAYWALL_ICONS];
const PLAN_LOADING_METER_KEYFRAMES = {
  inputRange: [0, 0.35, 0.7, 1],
  outputRange: [0.06, 0.42, 0.76, 1],
};
const PLAN_LOADING_BUTTON_REVEAL = { delay: 3350, duration: 350 };
const PLAN_DAYS_COUNT_DURATION_MS = 950;
const PLAN_DAYS_COUNT_TICK_MS = 24;
// H-ENTER: верхняя граница на весь провайдер-вход (Google/Apple) в онбординге.
// Реальный вход с merge на медленной сети может занять 10–20с, поэтому рубим только
// на 45с — но рубим обязательно, чтобы кнопки (включая «Позже») не залипли навсегда.
const SIGN_IN_OVERALL_TIMEOUT_MS = 45_000;
const PLAN_LOADING_BUILD_ITEMS: Array<{
  title: string;
  iconAsset: PlanIconSource;
  delay: number;
}> = [
  { title: 'Определяем стартовый уровень', iconAsset: ONBOARDING_PLAN_ICONS.study, delay: 450 },
  { title: 'Учитываем цель и темп', iconAsset: ONBOARDING_PLAN_ICONS.time, delay: 1100 },
  { title: 'Собираем маршрут', iconAsset: ONBOARDING_PLAN_ICONS.path, delay: 1750 },
];
function resolveOnboardingBundledImageSource(source: ImageSourcePropType) {
  const resolver = (RNImage as typeof RNImage & {
    resolveAssetSource?: (source: ImageSourcePropType) => unknown;
  }).resolveAssetSource;

  if (typeof resolver !== 'function') return null;
  try {
    return resolver(source);
  } catch {
    return null;
  }
}

function warmOnboardingBundledImages() {
  ONBOARDING_PRELOADED_ICON_ASSETS.forEach((source) => {
    resolveOnboardingBundledImageSource(source);
  });
}

function OnboardingBundledImage({
  source,
  style,
  resizeMode = 'contain',
  accessible,
}: {
  source: ImageSourcePropType;
  style: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  accessible?: boolean;
}) {
  return (
    <RNImage
      source={source}
      style={style}
      resizeMode={resizeMode}
      fadeDuration={0}
      accessible={accessible}
    />
  );
}

function PlanFlowIcon({
  source,
  small = false,
  styles,
}: {
  source: ImageSourcePropType;
  small?: boolean;
  styles: OnboardingStyles;
}) {
  return (
    <View style={[styles.planFlowIconSlot, small && styles.planFlowIconSlotSmall]}>
      <OnboardingBundledImage
        source={source}
        style={[styles.planFlowBitmapIcon, small && styles.planFlowBitmapIconSmall]}
      />
    </View>
  );
}

// Анимированная полоска прогресса плана. Раньше сегменты были обычными <View>, у
// которых при смене шага мгновенно менялся background — на телефоне это читалось
// как «анимации полосок не работают». Теперь активная заливка плавно проявляется
// поверх неактивного трека (opacity, нативный драйвер — плавно даже под нагрузкой).
function OnboardingProgressSegment({
  active,
  styles,
}: {
  active: boolean;
  styles: OnboardingStyles;
}) {
  const fill = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(fill, {
      toValue: active ? 1 : 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [active, fill]);
  return (
    <View style={styles.planFlowProgressSegment}>
      <Animated.View
        style={[styles.planFlowProgressSegmentActive, styles.planFlowProgressSegmentFill, { opacity: fill }]}
      />
    </View>
  );
}
const PLAN_PROGRESS_STEPS: OnboardingStepKey[] = ['planGoal', 'planLevel', 'planMinutes', 'planLoading', 'planResult'];
const PREV_STEP: Partial<Record<OnboardingStepKey, OnboardingStepKey>> = {
  demo2: 'planEntry',
  demo: 'demo2',
  name: 'planEntry',
  streak: 'name',
  auth: 'streak',
};
const ONBOARDING_BACKGROUND_PARTICLES: OnboardingParticleSpec[] = [
  { left:  '9%', top: '26%', size: 2, delay: 500,  duration: 9800,  rise: 82,  drift:  10, opacity: 0.20 },
  { left: '23%', top: '34%', size: 2, delay: 2400, duration: 10600, rise: 96,  drift: -12, opacity: 0.22 },
  { left: '48%', top: '22%', size: 2, delay: 3900, duration: 11200, rise: 76,  drift:  8,  opacity: 0.18 },
  { left: '73%', top: '30%', size: 2, delay: 1200, duration: 10100, rise: 90,  drift: -10, opacity: 0.21 },
  { left: '88%', top: '40%', size: 2, delay: 5600, duration: 10800, rise: 104, drift:  13, opacity: 0.18 },
  { left: '16%', top: '47%', size: 2, delay: 3300, duration: 9300,  rise: 118, drift: -14, opacity: 0.25 },
  { left: '39%', top: '52%', size: 2, delay: 700,  duration: 9900,  rise: 126, drift:  16, opacity: 0.24 },
  { left: '64%', top: '48%', size: 2, delay: 4500, duration: 9600,  rise: 112, drift: -15, opacity: 0.23 },
  { left:  '8%', top: '78%', size: 2, delay: 0,    duration: 7600, rise: 142, drift:  16, opacity: 0.46 },
  { left: '18%', top: '84%', size: 3, delay: 900,  duration: 9200, rise: 184, drift: -20, opacity: 0.42 },
  { left: '30%', top: '72%', size: 2, delay: 1800, duration: 8200, rise: 128, drift:  12, opacity: 0.38 },
  { left: '42%', top: '88%', size: 2, delay: 2600, duration: 9800, rise: 208, drift: -14, opacity: 0.40 },
  { left: '56%', top: '76%', size: 3, delay: 600,  duration: 8600, rise: 156, drift:  18, opacity: 0.44 },
  { left: '68%', top: '86%', size: 2, delay: 2200, duration: 9400, rise: 198, drift: -18, opacity: 0.36 },
  { left: '82%', top: '74%', size: 2, delay: 1400, duration: 7900, rise: 132, drift:  10, opacity: 0.34 },
  { left: '92%', top: '82%', size: 3, delay: 3200, duration: 9100, rise: 176, drift: -22, opacity: 0.40 },
  { left: '14%', top: '58%', size: 2, delay: 4100, duration: 10400, rise: 154, drift:  12, opacity: 0.28 },
  { left: '36%', top: '64%', size: 2, delay: 5200, duration: 9700,  rise: 168, drift: -16, opacity: 0.30 },
  { left: '61%', top: '60%', size: 2, delay: 3600, duration: 10100, rise: 146, drift:  14, opacity: 0.28 },
  { left: '76%', top: '66%', size: 2, delay: 4700, duration: 8900,  rise: 138, drift: -10, opacity: 0.32 },
];

const PERSONAL_PLAN_ONBOARDING_PLANS: Record<PersonalPlanId, {
  name: string;
  goal: string;
  pitch: string;
  horizon: string;
  days: number;
  recommendedLevel: string;
  minutesDefault: PlanMinutesChoice;
  iconAsset: PlanIconSource;
  todayIconAsset?: PlanIconSource;
  short: string;
  levelSub: string;
  outcome: string;
  // Локализация отображаемых полей (укр/исп). Языков всего три: ru/uk/es.
  // Выбираются через localizedPlan*() по lang; ru-поля выше — фолбэк.
  nameUk: string; nameEs: string;
  pitchUk: string; pitchEs: string;
  horizonUk: string; horizonEs: string;
  shortUk: string; shortEs: string;
  levelSubUk: string; levelSubEs: string;
  outcomeUk: string; outcomeEs: string;
}> = {
  voyazh: {
    name: 'Атлас',
    goal: 'спокойно объясняться в любой поездке',
    pitch: 'План для путешествий. Каждый день — маленький живой диалог: услышал, понял, ответил вслух. Спросить дорогу, заказать еду, заселиться, решить вопрос на месте.',
    horizon: 'около 12 недель',
    days: 84,
    recommendedLevel: 'A2',
    minutesDefault: 15,
    iconAsset: ONBOARDING_PLAN_ICONS.travel,
    todayIconAsset: ONBOARDING_PLAN_ICONS.phrase,
    short: 'Поездки: аэропорт, отель, кафе, дорога.',
    levelSub: 'Рекомендуем A2: план сразу ведёт в реальные сценарии поездки — аэропорт, отель, кафе, просьбы и уточнения.',
    outcome: 'Уже к середине пути ты сможешь спросить, понять ответ, переспросить — и спокойно решить вопрос в поездке.',
    nameUk: 'Атлас', nameEs: 'Atlas',
    pitchUk: 'План для подорожей. Щодня — маленький живий діалог: почув, зрозумів, відповів уголос. Спитати дорогу, замовити їжу, заселитися, вирішити питання на місці.',
    pitchEs: 'Plan para viajar. Cada día, un pequeño diálogo real: escuchas, entiendes y respondes en voz alta. Pedir indicaciones, ordenar comida, registrarte, resolver cualquier asunto allí mismo.',
    horizonUk: 'близько 12 тижнів', horizonEs: 'unas 12 semanas',
    shortUk: 'Подорожі: аеропорт, готель, кафе, дорога.', shortEs: 'Viajes: aeropuerto, hotel, cafetería, ruta.',
    levelSubUk: 'Рекомендуємо A2: план одразу веде в реальні сценарії подорожі — аеропорт, готель, кафе, прохання та уточнення.',
    levelSubEs: 'Recomendamos A2: el plan te lleva directo a situaciones reales del viaje: aeropuerto, hotel, cafetería, peticiones y aclaraciones.',
    outcomeUk: 'Вже до середини шляху ти зможеш спитати, зрозуміти відповідь, перепитати — і спокійно вирішити питання в подорожі.',
    outcomeEs: 'Para la mitad del camino podrás preguntar, entender la respuesta, repreguntar y resolver cualquier asunto del viaje con calma.',
  },
  mitap: {
    name: 'Фокус',
    goal: 'держать ум в тонусе через язык',
    pitch: 'План для тех, кто занимается для себя. Ровный микс: новые слова, понимание на слух, речь вслух. Спокойный темп, понемногу обо всём — как зарядка для ума.',
    horizon: 'около 16 недель',
    days: 112,
    recommendedLevel: 'A2 → B1',
    minutesDefault: 20,
    iconAsset: ONBOARDING_PLAN_ICONS.path,
    todayIconAsset: ONBOARDING_PLAN_ICONS.phrase,
    short: 'Язык для себя: слова, слух, речь — понемногу.',
    levelSub: 'A2 даёт комфортный вход, движение к B1 добавляет живые связки для речи и понимания.',
    outcome: 'Уже к середине пути ты заметишь: понимаешь больше, отвечаешь быстрее, а занятия стали спокойной привычкой.',
    nameUk: 'Фокус', nameEs: 'Enfoque',
    pitchUk: 'План для тих, хто займається для себе. Рівний мікс: нові слова, розуміння на слух, мовлення вголос. Спокійний темп, потроху про все — як зарядка для розуму.',
    pitchEs: 'Plan para quien estudia por gusto. Una mezcla equilibrada: palabras nuevas, comprensión auditiva y habla en voz alta. Ritmo tranquilo, un poco de todo, como gimnasia para la mente.',
    horizonUk: 'близько 16 тижнів', horizonEs: 'unas 16 semanas',
    shortUk: 'Мова для себе: слова, слух, мовлення — потроху.', shortEs: 'Idioma para ti: palabras, oído, habla, poco a poco.',
    levelSubUk: 'A2 дає комфортний вхід, рух до B1 додає живі звʼязки для мовлення та розуміння.',
    levelSubEs: 'A2 ofrece una entrada cómoda; avanzar hacia B1 añade conexiones vivas para hablar y entender.',
    outcomeUk: 'Вже до середини шляху ти помітиш: розумієш більше, відповідаєш швидше, а заняття стали спокійною звичкою.',
    outcomeEs: 'Para la mitad del camino notarás que entiendes más, respondes más rápido y estudiar se ha vuelto un hábito tranquilo.',
  },
  gavan: {
    name: 'Запас',
    goal: 'собрать запас слов на каждый день',
    pitch: 'План про нужные слова. Каждый день — несколько слов из реальной жизни: дом, город, дела, покупки. Слово сразу идёт в работу: ты вспоминаешь его и проговариваешь вслух.',
    horizon: 'около 18 недель',
    days: 126,
    recommendedLevel: 'A1 → A2',
    minutesDefault: 15,
    iconAsset: ONBOARDING_PLAN_ICONS.basic,
    todayIconAsset: ONBOARDING_PLAN_ICONS.phrase,
    short: 'Нужные слова на каждый день — и сразу в речь.',
    levelSub: 'A1 закрывает базу, A2 добавляет самостоятельность: слова складываются в простые живые фразы.',
    outcome: 'Уже к середине пути у тебя будет рабочий запас слов: они вспоминаются сами и звучат вслух.',
    nameUk: 'Запас', nameEs: 'Bagaje',
    pitchUk: 'План про потрібні слова. Щодня — кілька слів із реального життя: дім, місто, справи, покупки. Слово одразу йде в роботу: ти згадуєш його й промовляєш уголос.',
    pitchEs: 'Plan sobre las palabras que de verdad necesitas. Cada día, unas cuantas palabras de la vida real: casa, ciudad, tareas, compras. La palabra entra en juego enseguida: la recuerdas y la dices en voz alta.',
    horizonUk: 'близько 18 тижнів', horizonEs: 'unas 18 semanas',
    shortUk: 'Потрібні слова на щодень — і одразу в мовлення.', shortEs: 'Palabras útiles para cada día, y al habla enseguida.',
    levelSubUk: 'A1 закриває базу, A2 додає самостійність: слова складаються в прості живі фрази.',
    levelSubEs: 'A1 cubre la base; A2 añade autonomía: las palabras se unen en frases vivas y simples.',
    outcomeUk: 'Вже до середини шляху ти матимеш робочий запас слів: вони згадуються самі та звучать уголос.',
    outcomeEs: 'Para la mitad del camino tendrás un vocabulario funcional: las palabras te vienen solas y suenan en voz alta.',
  },
  impuls: {
    name: 'Реплика',
    goal: 'отвечать в разговоре без ступора',
    pitch: 'План про живую речь. Понимаешь мысль, но зависаешь перед ответом? Здесь каждый день тренируется речь вслух: готовые связки, быстрые ответы, уверенные фразы.',
    horizon: 'около 20 недель',
    days: 140,
    recommendedLevel: 'A2 → B1',
    minutesDefault: 20,
    iconAsset: ONBOARDING_PLAN_ICONS.work,
    todayIconAsset: ONBOARDING_PLAN_ICONS.speaking,
    short: 'Повседневное общение: отвечать быстрее и проще.',
    levelSub: 'A2 собирает каркас ответа, B1 добавляет гибкость: уточнить, согласиться, отказаться, продолжить разговор.',
    outcome: 'Уже к середине пути ты будешь отвечать быстрее и собирать уверенные ответы из знакомых фраз.',
    nameUk: 'Репліка', nameEs: 'Réplica',
    pitchUk: 'План про живе мовлення. Розумієш думку, але зависаєш перед відповіддю? Тут щодня тренується мовлення вголос: готові звʼязки, швидкі відповіді, упевнені фрази.',
    pitchEs: 'Plan sobre el habla viva. ¿Entiendes la idea pero te quedas en blanco antes de responder? Aquí entrenas el habla en voz alta cada día: bloques listos, respuestas rápidas y frases con seguridad.',
    horizonUk: 'близько 20 тижнів', horizonEs: 'unas 20 semanas',
    shortUk: 'Повсякденне спілкування: відповідати швидше й простіше.', shortEs: 'Conversación diaria: responder más rápido y fácil.',
    levelSubUk: 'A2 збирає каркас відповіді, B1 додає гнучкість: уточнити, погодитися, відмовити, продовжити розмову.',
    levelSubEs: 'A2 arma la estructura de la respuesta; B1 añade flexibilidad: aclarar, aceptar, rechazar, seguir la conversación.',
    outcomeUk: 'Вже до середини шляху ти відповідатимеш швидше й збиратимеш упевнені відповіді зі знайомих фраз.',
    outcomeEs: 'Para la mitad del camino responderás más rápido y armarás respuestas seguras con frases que ya conoces.',
  },
  echo: {
    name: 'Эфир',
    goal: 'понимать живую речь без субтитров',
    pitch: 'План про понимание на слух. Кино, сериалы, живые голоса. Ты учишься ловить смысл с первого раза — и отвечать вслух, чтобы речь не отставала от слуха.',
    horizon: 'около 12 недель',
    days: 84,
    recommendedLevel: 'A2',
    minutesDefault: 10,
    iconAsset: ONBOARDING_PLAN_ICONS.speaking,
    todayIconAsset: ONBOARDING_PLAN_ICONS.phrase,
    short: 'Кино и сериалы: понимать речь на слух.',
    levelSub: 'A2 достаточно: короткие реплики, живые фразы и понимание на слух — без перегруза теорией.',
    outcome: 'Уже к середине пути ты будешь ловить смысл живой речи с первого раза и отвечать без долгой паузы.',
    nameUk: 'Ефір', nameEs: 'Onda',
    pitchUk: 'План про розуміння на слух. Кіно, серіали, живі голоси. Ти вчишся ловити сенс з першого разу — і відповідати вголос, щоб мовлення не відставало від слуху.',
    pitchEs: 'Plan sobre la comprensión auditiva. Cine, series, voces reales. Aprendes a captar el sentido a la primera y a responder en voz alta para que el habla no se quede atrás del oído.',
    horizonUk: 'близько 12 тижнів', horizonEs: 'unas 12 semanas',
    shortUk: 'Кіно й серіали: розуміти мовлення на слух.', shortEs: 'Cine y series: entender el habla de oído.',
    levelSubUk: 'A2 достатньо: короткі репліки, живі фрази та розуміння на слух — без перевантаження теорією.',
    levelSubEs: 'Con A2 basta: réplicas cortas, frases vivas y comprensión auditiva, sin sobrecarga de teoría.',
    outcomeUk: 'Вже до середини шляху ти ловитимеш сенс живого мовлення з першого разу й відповідатимеш без довгої паузи.',
    outcomeEs: 'Para la mitad del camino captarás el sentido del habla viva a la primera y responderás sin pausas largas.',
  },
};

function resolveOnboardingPlanId(
  goal: OnboardingPlanGoal,
  explicitPlanId?: PersonalPlanId | null,
): PersonalPlanId {
  // Тема однозначно определяет план — та же логика, что в настройке плана.
  return explicitPlanId ?? resolvePersonalPlanForGoal(goal);
}

function dayWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'день';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'дня';
  return 'дней';
}

const ONBOARDING_PLAN_MOCKUP_SOURCE = '.codex-tmp/onboarding-plan-theme-mockup-v3.html';

const PLAN_GOAL_CHOICES: Array<{
  id: OnboardingPlanGoal;
  iconAsset: PlanIconSource;
  title: string;
  subtitle: string;
  titleUk: string;
  subtitleUk: string;
  titleEs: string;
  subtitleEs: string;
}> = [
  // Иконки: в пределах экрана без повторов; арт темы совпадает с артом её плана.
  // ВАЖНО: имена ассетов исторические и не совпадают с картинками
  // (work = пузырь диалога с точками, phrase/speaking = один и тот же пузырь с кавычками).
  { id: 'series', iconAsset: ONBOARDING_PLAN_ICONS.phrase, title: 'Понимать кино и сериалы', subtitle: 'Живая речь на слух - без субтитров', titleUk: 'Розуміти фільми й серіали', subtitleUk: 'Жива мова на слух - без субтитрів', titleEs: 'Entender pelis y series', subtitleEs: 'Habla real de oído, sin subtítulos' },
  { id: 'everyday', iconAsset: ONBOARDING_PLAN_ICONS.work, title: 'Говорить в обычной жизни', subtitle: 'Отвечать в разговоре без ступора', titleUk: 'Говорити у звичайному житті', subtitleUk: 'Відповідати в розмові без ступору', titleEs: 'Hablar en la vida diaria', subtitleEs: 'Responder sin bloquearte' },
  { id: 'travel', iconAsset: ONBOARDING_PLAN_ICONS.travel, title: 'Путешествовать', subtitle: 'Аэропорт, отель, кафе и дорога', titleUk: 'Подорожувати', subtitleUk: 'Аеропорт, готель, кафе і дорога', titleEs: 'Viajar', subtitleEs: 'Aeropuerto, hotel, cafetería y ruta' },
  { id: 'words', iconAsset: ONBOARDING_PLAN_ICONS.basic, title: 'Знать нужные слова', subtitle: 'Запас на каждый день - и сразу в речь', titleUk: 'Знати потрібні слова', subtitleUk: 'Запас на щодень - і одразу в мовлення', titleEs: 'Saber palabras útiles', subtitleEs: 'Vocabulario diario y uso inmediato' },
  { id: 'mind', iconAsset: ONBOARDING_PLAN_ICONS.path, title: 'Заниматься для себя', subtitle: 'Спокойный темп и польза для ума', titleUk: 'Займатися для себе', subtitleUk: 'Спокійний темп і користь для розуму', titleEs: 'Estudiar para mí', subtitleEs: 'Ritmo tranquilo y mente activa' },
];

const PLAN_LEVEL_CHOICES: Array<{
  id: OnboardingPlanLevel;
  iconAsset: PlanIconSource;
  title: string;
  subtitle: string;
  titleUk: string;
  subtitleUk: string;
  titleEs: string;
  subtitleEs: string;
}> = [
  { id: 'a0', iconAsset: ONBOARDING_PLAN_ICONS.beginner, title: 'A0: начинаю с нуля', subtitle: 'Первые слова и простые фразы', titleUk: 'A0: починаю з нуля', subtitleUk: 'Перші слова і прості фрази', titleEs: 'A0: empiezo de cero', subtitleEs: 'Primeras palabras y frases simples' },
  { id: 'a1', iconAsset: ONBOARDING_PLAN_ICONS.basic, title: 'A1: знаю базу', subtitle: 'Хочу быстрее собирать фразы', titleUk: 'A1: знаю базу', subtitleUk: 'Хочу швидше збирати фрази', titleEs: 'A1: sé lo básico', subtitleEs: 'Quiero construir frases más rápido' },
  { id: 'a2', iconAsset: ONBOARDING_PLAN_ICONS.speaking, title: 'A2: понимаю, но молчу', subtitle: 'Хочу начать отвечать увереннее', titleUk: 'A2: розумію, але мовчу', subtitleUk: 'Хочу відповідати впевненіше', titleEs: 'A2: entiendo, pero me callo', subtitleEs: 'Quiero responder con más confianza' },
  { id: 'b1', iconAsset: ONBOARDING_PLAN_ICONS.confidence, title: 'B1: говорю, но хочу лучше', subtitle: 'Нужен ритм и более сложные задачи', titleUk: 'B1: говорю, але хочу краще', subtitleUk: 'Потрібен ритм і складніші завдання', titleEs: 'B1: hablo, pero quiero mejorar', subtitleEs: 'Necesito ritmo y retos más complejos' },
];

const PLAN_MINUTES_CHOICES: PlanMinutesChoice[] = [5, 10, 15, 20];

const PLAN_ENTRIES: Array<{
  key: PersonalPlanId;
  minutes: PlanMinutesChoice;
  short: string;
  todayIconAsset?: PlanIconSource;
}> = [
  { key: 'voyazh', minutes: 15, short: 'Поездки: аэропорт, отель, кафе, дорога.' },
  { key: 'mitap', minutes: 20, short: 'Язык для себя: слова, слух, речь — понемногу.' },
  { key: 'gavan', minutes: 15, short: 'Нужные слова на каждый день — и сразу в речь.' },
  { key: 'impuls', minutes: 20, short: 'Повседневное общение: отвечать быстрее и проще.', todayIconAsset: ONBOARDING_PLAN_ICONS.speaking },
  { key: 'echo', minutes: 10, short: 'Кино и сериалы: понимать речь на слух.' },
];
const PLAN_PAYWALL_BENEFITS: Array<{
  key: string;
  iconAsset: PaywallIconSource;
  title: string;
  subtitle: string;
  featured?: boolean;
}> = [
  {
    key: 'plan',
    iconAsset: ONBOARDING_PAYWALL_ICONS.plan,
    title: 'Персональный план',
    subtitle: 'ежедневный маршрут под цель и слабые места',
    featured: true,
  },
  {
    key: 'lessons',
    iconAsset: ONBOARDING_PAYWALL_ICONS.lessons,
    title: 'Все уроки открыты',
    subtitle: 'полный доступ ко всем урокам курса',
  },
  {
    key: 'quizzes',
    iconAsset: ONBOARDING_PAYWALL_ICONS.quizzes,
    title: 'Все уровни вызовов',
    subtitle: 'без дневного лимита на практику',
  },
  {
    key: 'cards',
    iconAsset: ONBOARDING_PAYWALL_ICONS.cards,
    title: 'Карточки без потолка',
    subtitle: 'сохраняй столько фраз, сколько нужно',
  },
  {
    key: 'energy',
    iconAsset: ONBOARDING_PAYWALL_ICONS.energy,
    title: 'Безлимит энергии',
    subtitle: 'уроки, вызовы и экзамены без ожидания',
  },
  {
    key: 'arena',
    iconAsset: ONBOARDING_PAYWALL_ICONS.arena,
    title: 'Арена без лимита',
    subtitle: 'больше матчей и без затрат энергии',
  },
  {
    key: 'errors',
    iconAsset: ONBOARDING_PAYWALL_ICONS.errors,
    title: 'Разбор твоих слабых мест',
    subtitle: 'персональные занятия по слабым местам',
  },
  {
    key: 'trainer',
    iconAsset: ONBOARDING_PAYWALL_ICONS.trainer,
    title: 'Тренер без дневного лимита',
    subtitle: 'повторы и слабые места без остановки',
  },
  {
    key: 'analytics',
    iconAsset: ONBOARDING_PAYWALL_ICONS.analytics,
    title: 'Аналитика прогресса',
    subtitle: 'активность, слабые места и сравнение с другими',
  },
  {
    key: 'themes',
    iconAsset: ONBOARDING_PAYWALL_ICONS.themes,
    title: 'Plus-стиль',
    subtitle: 'все темы приложения',
  },
  {
    key: 'frame',
    iconAsset: ONBOARDING_PAYWALL_ICONS.frame,
    title: 'Золотой ник и рамка',
    subtitle: 'отдельное оформление профиля и рейтингов',
  },
];

function Onboarding({ onDone, initialLang, onLangSelect, onPersonalPlanPaywallStart, startAtNameStep }: Props) {
  const insets = useSafeAreaInsets();
  const { hasPremiumAccess } = usePremium();
  const [onboardingAbVariant, setOnboardingAbVariant] = useState<OnboardingAbVariant>('welcome');
  // Первый экран онбординга «только план» (управляется из «Пульта» админки →
  // remote_config/app.bools.onboarding_plan_only_enabled). false = два варианта
  // (план / просто посмотреть), true = одна кнопка «Составить мой план». Читаем
  // живьём и перечитываем по событию remote_config_changed (onSnapshot).
  const [planOnlyEntry, setPlanOnlyEntry] = useState<boolean>(() => isOnboardingPlanOnly());
  useEffect(() => {
    setPlanOnlyEntry(isOnboardingPlanOnly());
    const sub = onAppEvent('remote_config_changed', () => setPlanOnlyEntry(isOnboardingPlanOnly()));
    return () => sub.remove();
  }, []);
  // Analytics color bucket for the current one-theme onboarding skin.
  const obColor = 'main' as const;
  const theme = ONBOARDING_THEME;
  const styles = React.useMemo(() => makeOnboardingStyles(theme), [theme]);
  const { width: viewportW, height: viewportH, uiScale } = useScreen();
  const progressTopPadding = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + 8;
  const narrowViewport = Math.min(viewportW, viewportH);
  const shortViewport = viewportH < 740;
  const compactOnboarding = narrowViewport < 380 || shortViewport;
  const extraCompactOnboarding = narrowViewport < 350 || viewportH < 640;
  const onboardingScale = Math.min(1, Math.max(extraCompactOnboarding ? 0.68 : 0.74, uiScale * (shortViewport ? 0.94 : 1)));
  const scaleOnboarding = (value: number, min = 0) => Math.max(min, Math.round(value * onboardingScale));
  const onboardingHPad = compactOnboarding ? 16 : 28;
  const onboardingTitleStyle = {
    fontSize: scaleOnboarding(24, 20),
    lineHeight: scaleOnboarding(34, 28),
    marginBottom: compactOnboarding ? 24 : 40,
  };
  const onboardingAppNameStyle = {
    fontSize: scaleOnboarding(15, 13),
    marginBottom: compactOnboarding ? 14 : 24,
  };
  const onboardingPrimaryButtonStyle = {
    minHeight: scaleOnboarding(56, 48),
    paddingVertical: scaleOnboarding(16, 13),
    borderRadius: scaleOnboarding(18, 14),
  };
  const onboardingPrimaryButtonTextStyle = {
    fontSize: scaleOnboarding(18, 16),
  };
  const onboardingInputStyle = {
    minHeight: scaleOnboarding(58, 50),
    fontSize: scaleOnboarding(20, 16),
    paddingHorizontal: scaleOnboarding(16, 14),
    paddingVertical: scaleOnboarding(16, 12),
    marginBottom: compactOnboarding ? 14 : 24,
  };
  const onboardingKeyboardDismissMode = Platform.OS === 'ios' ? 'interactive' as const : 'on-drag' as const;
  const onboardingScrollProps = {
    style: styles.onboardingScroll,
    keyboardShouldPersistTaps: 'handled' as const,
    keyboardDismissMode: onboardingKeyboardDismissMode,
    showsVerticalScrollIndicator: true,
    nestedScrollEnabled: true,
    decelerationRate: 0.998 as const,
  };

  useEffect(() => {
    warmOnboardingBundledImages();
    warmNameAvailabilityAuth();
  }, []);

  // Прогреваем Firebase-аутентификацию в фоне при монтировании, чтобы к моменту
  // нажатия «Продолжить» на шаге имени анон-токен уже был готов и не блокировал UI.
  useEffect(() => {
    if (!CLOUD_SYNC_ENABLED) return;
    void import('../app/cloud_sync').then(({ waitForAnonAuth, ensureAnonUser }) => {
      void waitForAnonAuth(15_000).then(() => ensureAnonUser()).catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const streakHeroIconSize = scaleOnboarding(compactOnboarding ? 52 : 76, 44);
  const streakMilestoneIconSize = scaleOnboarding(compactOnboarding ? 38 : 52, 34);

  type OnboardingStep = OnboardingStepKey;
  // Быстрый старт на «Имя» (переоткрытие после пейвола): A/B-вариант берём
  // синхронно из уже загруженного кэша (peekStableId — без await/Keychain), и
  // НЕ блокируем рендер пустым «resolving»-экраном.
  const synchronousNameEntry = startAtNameStep === true;
  const initialSimpleStep: OnboardingAbSimpleStep = (() => {
    if (!synchronousNameEntry) return ONBOARDING_AB_FALLBACK_SIMPLE_STEP;
    const cachedStableId = peekStableId();
    if (!cachedStableId) return ONBOARDING_AB_FALLBACK_SIMPLE_STEP;
    return onboardingSimpleStepForVariant(getOnboardingAbVariant(cachedStableId));
  })();
  const [onboardingEntryReady, setOnboardingEntryReady] = useState(synchronousNameEntry);
  const onboardingEntryStepRef = useRef<OnboardingAbEntryStep>(ONBOARDING_AB_FALLBACK_ENTRY_STEP);
  const onboardingSimpleStepRef = useRef<OnboardingAbSimpleStep>(initialSimpleStep);
  const [step, setStepRaw]    = useState<OnboardingStep>(
    synchronousNameEntry ? 'name' : ONBOARDING_AB_FALLBACK_ENTRY_STEP,
  );
  const stepRef = useRef(step);
  const setStep = useCallback((next: OnboardingStep) => {
    stepRef.current = next;
    setStepRaw(next);
    AsyncStorage.setItem('onboarding_step', next).catch(() => {});
  }, []);
  const nameForProfileRef = useRef('');
  const { playDemoCorrect, playPlanReady, playPurchaseSuccess } = useOnboardingSounds();
  const [purchaseCelebrationVisible, setPurchaseCelebrationVisible] = useState(false);
  const [demoAnswered, setDemoAnswered] = useState(false);
  const [demoCorrect, setDemoCorrect]   = useState(false);
  const [demoSelected, setDemoSelected] = useState<number>(-1);
  // Demo2 state — phrase builder
  const [demo2Selected, setDemo2Selected] = useState<number[]>([]);
  const [demo2Answered, setDemo2Answered] = useState(false);
  const [demo2Correct, setDemo2Correct]   = useState(false);
  const demo2GreetFade  = useRef(new Animated.Value(0)).current;
  const demo2HintFade   = useRef(new Animated.Value(0)).current;
  const demo2QuizFade   = useRef(new Animated.Value(0)).current;
  const demo2ShakeAnims = useRef([0,1,2,3,4,5].map(() => new Animated.Value(0))).current;
  // Global screen fade transition
  const screenFade = useRef(new Animated.Value(1)).current;
  const welcomeIntro = useRef(new Animated.Value(0)).current;
  const lingmanPulse = useRef(new Animated.Value(0)).current;
  // Staggered milestone card anims
  const milestoneAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const btnSlide   = useRef(new Animated.Value(30)).current;
  const btnFade    = useRef(new Animated.Value(0)).current;
  const [lang]       = useState<Lang>(() => initialLang ?? getDeviceBootstrapLocale());
  const [name, setName]       = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameFieldError, setNameFieldError] = useState<string | null>(null);
  const [nameAvailability, setNameAvailability] = useState<OnboardingNameAvailabilityState>({
    status: 'idle',
    value: '',
    message: null,
  });
  const nameAvailabilitySeq = useRef(0);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const [selectedPlanGoal, setSelectedPlanGoal] = useState<OnboardingPlanGoal | null>(null);
  const [selectedPlanLevel, setSelectedPlanLevel] = useState<OnboardingPlanLevel | null>(null);
  const [selectedPlanMinutes, setSelectedPlanMinutes] = useState<PlanMinutesChoice | null>(null);
  const [selectedPlanOverride, setSelectedPlanOverride] = useState<PersonalPlanId | null>(null);
  const [selectedPlanBilling, setSelectedPlanBilling] = useState<OnboardingBillingChoice>('annual');
  // Реальные цены и наличие триала из RevenueCat — НИКОГДА не хардкодим ($/валюта/триал
  // решает магазин). Пустые строки = ещё грузится; UI тогда не обещает конкретную цену.
  const [storePrices, setStorePrices] = useState<{
    monthly: string;
    yearly: string;
    // Числовые цены из стора — для расчёта % экономии годового и цены/мес.
    monthlyAmount: number;
    yearlyAmount: number;
    hasTrial: boolean;
    trialDays: number;
    loaded: boolean;
    failed: boolean;
  }>({ monthly: '', yearly: '', monthlyAmount: 0, yearlyAmount: 0, hasTrial: false, trialDays: 3, loaded: false, failed: false });
  // Счётчик ручных ретраев цен — меняем, чтобы перезапустить загрузку при тапе «Повторить».
  const [storePricesRetry, setStorePricesRetry] = useState(0);
  // RC-пакеты для inline-покупки на пейволе (грузятся вместе с ценами).
  const storePackagesRef = useRef<{ monthly?: unknown; yearly?: unknown }>({});
  const [paywallPurchasing, setPaywallPurchasing] = useState(false);
  const [paywallRestoring, setPaywallRestoring] = useState(false);
  const paywallBusy = paywallPurchasing || paywallRestoring;
  const [nicknameMode, setNicknameMode] = useState<OnboardingNicknameMode>('regular');
  const [showPlanFreeConfirm, setShowPlanFreeConfirm] = useState(false);
  const [planLoadingCtaReady, setPlanLoadingCtaReady] = useState(false);
  const [animatedPlanDays, setAnimatedPlanDays] = useState(0);
  const planLoadingMeter = useRef(new Animated.Value(0)).current;
  const planLoadingBuildAnims = useRef(PLAN_LOADING_BUILD_ITEMS.map(() => new Animated.Value(0))).current;
  const planLoadingButtonAnim = useRef(new Animated.Value(0)).current;
  const completedPlanLoadingAnswerKeyRef = useRef<string | null>(null);
  const planDaysProgress = useRef(new Animated.Value(0)).current;
  const selectedPlanGoalForPlan: OnboardingPlanGoal = selectedPlanGoal ?? 'travel';
  const selectedPlanLevelForPlan: OnboardingPlanLevel = selectedPlanLevel ?? 'a1';
  const selectedPlanMinutesForPlan: PlanMinutesChoice = selectedPlanMinutes ?? 15;
  // Профиль берётся из ответов юзера в онбординге — никаких хардкодов.
  const goal: LearningGoal = ((): LearningGoal => {
    // PersonalPlanSetupGoal → LearningGoal
    const map: Record<string, LearningGoal> = {
      travel: 'tourism',
      words: 'hobby',
      everyday: 'work',
      series: 'hobby',
      mind: 'hobby',
    };
    return map[selectedPlanGoalForPlan] ?? 'hobby';
  })();
  const minutesPerDay: MinutesPerDay = ((): MinutesPerDay => {
    // PlanMinutesChoice 5|10|15|20 → MinutesPerDay 5|15|30|60
    if (selectedPlanMinutesForPlan <= 5) return 5;
    if (selectedPlanMinutesForPlan <= 15) return 15;
    if (selectedPlanMinutesForPlan <= 20) return 30;
    return 60;
  })();
  const currentLevel: CurrentLevel = ((): CurrentLevel => {
    // OnboardingPlanLevel 'a0'|'a1'|'a2'|'b1' → CurrentLevel 'a1'|'a2'|'b1'|'b2'
    if (selectedPlanLevelForPlan === 'a0') return 'a1';
    if (selectedPlanLevelForPlan === 'a1') return 'a1';
    if (selectedPlanLevelForPlan === 'a2') return 'a2';
    return 'b1';
  })();
  const [notificationTime] = useState<string>('08:00');

  const isUK = lang === 'uk';
  const pick = (ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru;
  const pickNameText = useCallback((ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru, [isUK, lang]);
  const validateNameDraft = useCallback((raw: string): OnboardingNameValidation => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return { ok: false, message: pickNameText('Введи имя, чтобы продолжить', 'Введіть ім\'я щоб продовжити', 'Escribe tu nombre para continuar') };
    }
    if (trimmed.length < 2) {
      return { ok: false, message: pickNameText('Минимум 2 символа', 'Мінімум 2 символи', 'Mínimo 2 caracteres') };
    }
    if (trimmed.length > 20) {
      return { ok: false, message: pickNameText('Максимум 20 символов', 'Максимум 20 символів', 'Máximo 20 caracteres') };
    }
    return { ok: true, trimmed };
  }, [pickNameText]);
  const triOb = (ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru;
  const localizedChoiceTitle = (choice: { title: string; titleUk: string; titleEs: string }) =>
    triOb(choice.title, choice.titleUk, choice.titleEs);
  const localizedChoiceSubtitle = (choice: { subtitle: string; subtitleUk: string; subtitleEs: string }) =>
    triOb(choice.subtitle, choice.subtitleUk, choice.subtitleEs);
  // Локализованные отображаемые поля плана (укр/исп). ru-поля — фолбэк.
  type OnboardingPlanShape = (typeof PERSONAL_PLAN_ONBOARDING_PLANS)[PersonalPlanId];
  const localizedPlanName = (p: OnboardingPlanShape) => triOb(p.name, p.nameUk, p.nameEs);
  const localizedPlanPitch = (p: OnboardingPlanShape) => triOb(p.pitch, p.pitchUk, p.pitchEs);
  const localizedPlanHorizon = (p: OnboardingPlanShape) => triOb(p.horizon, p.horizonUk, p.horizonEs);
  const localizedPlanShort = (p: OnboardingPlanShape) => triOb(p.short, p.shortUk, p.shortEs);
  const localizedPlanLevelSub = (p: OnboardingPlanShape) => triOb(p.levelSub, p.levelSubUk, p.levelSubEs);
  const localizedPlanOutcome = (p: OnboardingPlanShape) => triOb(p.outcome, p.outcomeUk, p.outcomeEs);
  // Переформатировать цену «как в сторе»: берём строку из стора (валюта/символ
  // оттуда) и подставляем нашу сумму (цена/мес). Символ/буквенный код валюты
  // и его позицию сохраняем из исходной строки, меняем только число.
  const formatPriceLikeStore = (storeString: string, amount: number): string => {
    const rounded = amount.toFixed(2);
    // Вырезаем числовую часть исходной строки, оставляя префикс/суффикс (валюту).
    const match = storeString.match(/[\d.,\s]+/);
    if (!match) return `${rounded}`;
    const prefix = storeString.slice(0, match.index);
    const suffix = storeString.slice((match.index ?? 0) + match[0].length);
    return `${prefix}${rounded}${suffix}`;
  };
  // Чек-лист «сборки плана» задан на ru на уровне модуля — локализуем по индексу.
  const localizedPlanLoadingItem = (index: number): string => {
    switch (index) {
      case 0: return triOb('Определяем стартовый уровень', 'Визначаємо стартовий рівень', 'Definimos tu nivel inicial');
      case 1: return triOb('Учитываем цель и темп', 'Враховуємо мету й темп', 'Tomamos en cuenta tu objetivo y ritmo');
      case 2: return triOb('Собираем маршрут', 'Збираємо маршрут', 'Armamos tu ruta');
      default: return '';
    }
  };
  const planMinutesTitle = (choice: PlanMinutesChoice) =>
    choice === 20
      ? triOb('20+ минут в день', '20+ хвилин на день', '20+ min/día')
      : triOb(`${choice} минут в день`, `${choice} хвилин на день`, `${choice} min/día`);
  const planMinutesSubtitle = (choice: PlanMinutesChoice) => {
    if (choice <= 5) return triOb('Легкий старт - главное не бросать', 'Легкий старт - головне не кинути', 'Inicio suave: lo importante es seguir');
    if (choice <= 10) return triOb('Хороший ритм, заметный прогресс', 'Добрий ритм, помітний прогрес', 'Buen ritmo, progreso visible');
    if (choice <= 15) return triOb('Оптимально - рекомендуем', 'Оптимально - рекомендуємо', 'Óptimo: recomendado');
    return triOb('Быстрый темп, быстрый результат', 'Швидкий темп, швидкий результат', 'Ritmo rápido, resultado rápido');
  };
  const selectedPlanId = resolveOnboardingPlanId(selectedPlanGoalForPlan, selectedPlanOverride);
  const selectedPlan = PERSONAL_PLAN_ONBOARDING_PLANS[selectedPlanId];
  const planLoadingAnswerKey = [
    selectedPlanGoalForPlan,
    selectedPlanLevelForPlan,
    selectedPlanMinutesForPlan,
    selectedPlanId,
  ].join('|');

  // Плавный переход между экранами
  const goToStep = useCallback((next: typeof step) => {
    // Tactile feedback on every onboarding transition (Telegram-grade feel).
    // Fired here (the single nav choke point) so all ~40 step buttons get it.
    hapticTap();
    setShowPlanFreeConfirm(false);
    const target = next === 'welcome' ? onboardingEntryStepRef.current : next;
    Animated.timing(screenFade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setStep(target);
    });
  }, [screenFade, setStep]);

  const getOnboardingPrevStep = useCallback((current: OnboardingStep): OnboardingStep | undefined => {
    const entryStep = onboardingEntryStepRef.current;
    const simpleStep = onboardingSimpleStepRef.current;
    if (current === entryStep) return undefined;
    if (current === 'welcome') return entryStep;
    if (current === 'demo2') return entryStep;
    if (current === 'demo') return simpleStep === 'demo' ? entryStep : 'demo2';
    // Линейная цепочка шагов плана: planEntry → planGoal → planLevel → planMinutes
    // → planLoading → planResult. Раньше для этих шагов prev был undefined, и кнопка
    // «назад» проваливалась на onboardingEntryStepRef (первый экран) — отсюда баг
    // «назад кидает на начальный экран». Возвращаем реальный предыдущий шаг цепочки.
    const planIdx = PLAN_PROGRESS_STEPS.indexOf(current);
    if (planIdx === 0) return entryStep;            // planGoal → planEntry
    if (planIdx > 0) return PLAN_PROGRESS_STEPS[planIdx - 1];
    // Пейволы/пикеры плана возвращают на результат плана.
    if (current === 'planPaywall' || current === 'planPicker' || current === 'planDetails') {
      return 'planResult';
    }
    if (current === 'name') {
      if (simpleStep === 'name') return entryStep;
      return 'demo';
    }
    return PREV_STEP[current];
  }, []);

  useEffect(() => {
    if (step === 'welcome') setStep(onboardingEntryStepRef.current);
  }, [step, setStep]);

  useEffect(() => {
    if (step === 'name') warmNameAvailabilityAuth();
  }, [step]);

  useEffect(() => {
    const seq = nameAvailabilitySeq.current + 1;
    nameAvailabilitySeq.current = seq;

    if (step !== 'name') {
      setNameAvailability({ status: 'idle', value: '', message: null });
      return;
    }

    const trimmed = name.trim();
    if (!trimmed) {
      setNameAvailability({ status: 'idle', value: '', message: null });
      return;
    }

    const validation = validateNameDraft(name);
    if (!validation.ok) {
      setNameAvailability({ status: 'error', value: trimmed, message: validation.message });
      return;
    }

    const value = validation.trimmed;
    let cancelled = false;
    setNameAvailability({ status: 'idle', value: '', message: null });
    const timer = setTimeout(() => {
      if (cancelled || nameAvailabilitySeq.current !== seq) return;
      setNameAvailability({
        status: 'checking',
        value,
        message: pickNameText('Проверяем имя...', 'Перевіряємо ім\'я...', 'Comprobando nombre...'),
      });
      void checkNameAvailabilityDetailed(value)
        .then((result) => {
          if (cancelled || nameAvailabilitySeq.current !== seq) return;
          setNameFieldError(null);
          if (result.status === 'available') {
            setNameAvailability({
              status: 'available',
              value,
              message: pickNameText('Имя свободно', 'Ім\'я вільне', 'Nombre disponible'),
            });
            return;
          }
          if (result.status === 'taken') {
            setNameAvailability({
              status: 'taken',
              value,
              message: pickNameText('Имя уже занято', 'Ім\'я вже зайняте', 'Nombre no disponible'),
            });
            return;
          }
          setNameAvailability({
            status: 'idle',
            value: '',
            message: null,
          });
        })
        .catch(() => {
          if (cancelled || nameAvailabilitySeq.current !== seq) return;
          setNameFieldError(null);
          setNameAvailability({
            status: 'idle',
            value: '',
            message: null,
          });
        });
    }, NAME_AVAILABILITY_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [name, pickNameText, step, validateNameDraft]);

  // Анимация появления кнопки снизу
  const animateBtn = () => {
    btnSlide.setValue(30);
    btnFade.setValue(0);
    Animated.parallel([
      Animated.timing(btnFade,  { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(btnSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start();
  };

  // Прогресс-бар + кнопка назад
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      const prev = getOnboardingPrevStep(step);
      if (prev) { goToStep(prev); return true; }
      return true; // блокируем GO_BACK даже на первом экране
    });
    return () => sub.remove();
  }, [getOnboardingPrevStep, step, goToStep]);

  const renderProgressBar = () => {
    const idx = (PROGRESS_STEPS as readonly string[]).indexOf(step);
    if (idx < 0) return null;
    const pct = Math.round(((idx + 1) / PROGRESS_STEPS.length) * 100);
    const prev = getOnboardingPrevStep(step);
    return (
      <View style={[styles.progressWrap, { paddingTop: progressTopPadding }]}>
        <View style={styles.progressRow}>
          {prev ? (
            <TouchableOpacity onPress={() => goToStep(prev)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
              <Text style={{ color: theme.accent, fontSize: 20 }}>←</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ width: 44 }} />
          )}
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${pct}%` }]} />
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>
    );
  };

  // Восстанавливаем шаг при повторном монтировании (после Alert на Android и т.п.).
  // Сохраненный `name` без pending personal-plan ломает первый экран: после dev reload
  // онбординг сразу прыгал на имя из старого AsyncStorage.
  useEffect(() => {
    let active = true;
    void (async () => {
      let entryStep = ONBOARDING_AB_FALLBACK_ENTRY_STEP;
      let variant: OnboardingAbVariant = 'welcome';
      let simpleStep = ONBOARDING_AB_FALLBACK_SIMPLE_STEP;
      try {
        const [saved, pendingNickname, stableId] = await Promise.all([
          AsyncStorage.getItem('onboarding_step'),
          AsyncStorage.getItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY),
          getStableId().catch(() => ''),
        ]);
        if (stableId) {
          variant = getOnboardingAbVariant(stableId);
          simpleStep = onboardingSimpleStepForVariant(variant);
        }
        const restored = normalizeRestoredOnboardingStep(saved, pendingNickname, entryStep);
        if (!active) return;
        setOnboardingAbVariant(variant);
        onboardingEntryStepRef.current = entryStep;
        onboardingSimpleStepRef.current = simpleStep;
        setStepRaw(restored);
        stepRef.current = restored;
        await AsyncStorage.multiSet([
          [ONBOARDING_AB_VARIANT_STORAGE_KEY, variant],
          ['onboarding_step', restored],
        ]).catch(() => {});
      } catch {
        if (!active) return;
        setOnboardingAbVariant(variant);
        onboardingEntryStepRef.current = entryStep;
        onboardingSimpleStepRef.current = simpleStep;
        setStepRaw(entryStep);
        stepRef.current = entryStep;
      } finally {
        if (active) setOnboardingEntryReady(true);
      }
    })();
    return () => { active = false; };
  }, []);

  const logOnboardingFunnel = useCallback((funnelStep: 'shown' | 'cta_click' | 'trial_started' | 'purchase_completed' | 'close') => {
    void (async () => {
      try {
        const [{ logPaywallFunnel }, { resolvePaywallAbVariant }] = await Promise.all([
          import('../app/paywall_funnel'),
          import('../app/paywall_variant'),
        ]);
        const { variant } = await resolvePaywallAbVariant();
        const planForFunnel = selectedPlanBilling === 'annual' ? 'yearly' : 'monthly';
        logPaywallFunnel(funnelStep, { variant, context: 'onboarding', plan: planForFunnel, obColor });
      } catch {
        /* fire-and-forget */
      }
    })();
  }, [selectedPlanBilling, obColor]);

  // Fade-in экрана при каждой смене шага
  useEffect(() => {
    Animated.timing(screenFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    // Воронка онбординга: трекаем просмотр каждого шага — раньше онбординг был
    // полностью невидим в аналитике (нельзя было увидеть drop-off по шагам).
    void import('../app/analytics').then(({ trackEvent }) => {
      void trackEvent('onboarding_step_view', { step, ob_color: obColor });
      if (step === 'planPaywall') {
        void trackEvent('onboarding_plan_paywall_view', { plan: selectedPlanBilling, ob_color: obColor });
        void import('../app/app_activity').then(({ trackActivity }) =>
          trackActivity('paywall:view', {
            feature: 'revenue',
            screen: 'onboarding',
            result: 'info',
            writeToFirestore: true,
            tags: {
              context: 'onboarding',
              source: 'onboarding',
              plan: selectedPlanBilling,
              ob_color: obColor,
            },
          }),
        );
        logOnboardingFunnel('shown');
      }
    });
  }, [step, screenFade, selectedPlanBilling, obColor, logOnboardingFunnel]);

  // Реальные цены грузит единый A/B paywall. На planResult не трогаем RevenueCat,
  // чтобы выбор плана не запускал лишнюю сетевую работу до открытия paywall.
  useEffect(() => {
    if (step !== 'planPaywall') return;
    if (storePrices.loaded) return;
    let cancelled = false;
    setStorePrices((p) => ({ ...p, failed: false }));
    (async () => {
      try {
        const [Purchases, { initRevenueCat, resolvePremiumPackages }, { storeProductHasTrialIntro }, { IS_EXPO_GO }] =
          await Promise.all([
            import('react-native-purchases').then((m) => m.default),
            import('../app/revenuecat_init'),
            import('../app/premium_trial_signal'),
            import('../app/config'),
          ]);
        if (IS_EXPO_GO) return; // в Expo Go стора нет — оставляем UI без конкретных цен
        await initRevenueCat();
        const offerings = await Purchases.getOfferings();
        const { monthly, yearly } = resolvePremiumPackages(offerings.current?.availablePackages ?? []);
        if (cancelled) return;
        storePackagesRef.current = { monthly, yearly };
        const { getTrialInfo, trialDaysOrDefault } = await import('../app/paywall_trial_info');
        const yearlyTrial = getTrialInfo(yearly ?? null);
        const monthlyTrial = getTrialInfo(monthly ?? null);
        const trialInfo = yearlyTrial.hasTrial ? yearlyTrial : monthlyTrial;
        const resolvedMonthly = monthly?.product?.priceString ?? '';
        const resolvedYearly = yearly?.product?.priceString ?? '';
        // Если ни одной цены из стора не пришло — это сбой загрузки, а не «бесплатный» план.
        // Показываем ретрай вместо молчаливо пустого пейвола.
        if (!resolvedMonthly && !resolvedYearly) {
          if (!cancelled) setStorePrices((p) => ({ ...p, loaded: true, failed: true }));
          return;
        }
        setStorePrices({
          monthly: resolvedMonthly,
          yearly: resolvedYearly,
          monthlyAmount: typeof monthly?.product?.price === 'number' ? monthly.product.price : 0,
          yearlyAmount: typeof yearly?.product?.price === 'number' ? yearly.product.price : 0,
          hasTrial:
            storeProductHasTrialIntro(monthly?.product) || storeProductHasTrialIntro(yearly?.product),
          trialDays: trialDaysOrDefault(trialInfo),
          loaded: true,
          failed: false,
        });
      } catch {
        if (!cancelled) setStorePrices((p) => ({ ...p, loaded: true, failed: true }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [step, storePrices.loaded, storePricesRetry]);

  useEffect(() => {
    if (step !== 'planLoading') return;
    if (completedPlanLoadingAnswerKeyRef.current === planLoadingAnswerKey) {
      setPlanLoadingCtaReady(true);
      planLoadingMeter.setValue(1);
      planLoadingBuildAnims.forEach((value) => value.setValue(1));
      planLoadingButtonAnim.setValue(1);
      return;
    }

    setPlanLoadingCtaReady(false);
    planLoadingMeter.setValue(0);
    planLoadingBuildAnims.forEach((value) => value.setValue(0));
    planLoadingButtonAnim.setValue(0);
    const animations = [
      Animated.timing(planLoadingMeter, {
        toValue: 1,
        duration: 3200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
      ...planLoadingBuildAnims.map((value, index) => Animated.sequence([
        Animated.delay(PLAN_LOADING_BUILD_ITEMS[index].delay),
        Animated.timing(value, {
          toValue: 1,
          duration: 450,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ])),
      Animated.sequence([
        Animated.delay(PLAN_LOADING_BUTTON_REVEAL.delay),
        Animated.timing(planLoadingButtonAnim, {
          toValue: 1,
          duration: PLAN_LOADING_BUTTON_REVEAL.duration,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ];
    const timeout = setTimeout(() => {
      completedPlanLoadingAnswerKeyRef.current = planLoadingAnswerKey;
      setPlanLoadingCtaReady(true);
    }, PLAN_LOADING_BUTTON_REVEAL.delay);
    Animated.parallel(animations).start();
    return () => {
      clearTimeout(timeout);
      planLoadingMeter.stopAnimation();
      planLoadingBuildAnims.forEach((value) => value.stopAnimation());
      planLoadingButtonAnim.stopAnimation();
    };
  }, [planLoadingAnswerKey, planLoadingBuildAnims, planLoadingButtonAnim, planLoadingMeter, step]);

  useEffect(() => {
    if (step === 'planResult') playPlanReady();
  }, [step, playPlanReady]);

  useEffect(() => {
    if (step !== 'planResult' && step !== 'planDetails') return;
    const total = selectedPlan.days;
    let countTimer: ReturnType<typeof setInterval> | null = null;
    const countStartedAt = Date.now();
    setAnimatedPlanDays(0);
    planDaysProgress.setValue(0);
    countTimer = setInterval(() => {
      const rawProgress = Math.min(1, (Date.now() - countStartedAt) / PLAN_DAYS_COUNT_DURATION_MS);
      const easedProgress = 1 - Math.pow(1 - rawProgress, 3);
      setAnimatedPlanDays(Math.min(total, Math.round(total * easedProgress)));
      if (rawProgress >= 1 && countTimer) {
        clearInterval(countTimer);
        countTimer = null;
      }
    }, PLAN_DAYS_COUNT_TICK_MS);
    Animated.timing(planDaysProgress, {
      toValue: 1,
      duration: PLAN_DAYS_COUNT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setAnimatedPlanDays(total);
    });
    return () => {
      if (countTimer) clearInterval(countTimer);
      planDaysProgress.stopAnimation();
    };
  }, [planDaysProgress, selectedPlan.days, selectedPlanId, step]);

  useEffect(() => {
    if (step !== 'welcome' || !USE_ELITE_ONBOARDING_WELCOME) return;
    welcomeIntro.setValue(0);
    Animated.spring(welcomeIntro, {
      toValue: 1,
      useNativeDriver: true,
      friction: 10,
      tension: 58,
    }).start();
  }, [step, welcomeIntro]);

  useEffect(() => {
    if (step !== 'welcome') return;
    lingmanPulse.setValue(0);
    const pulse = Animated.sequence([
      Animated.delay(700),
      Animated.timing(lingmanPulse, {
        toValue: 1,
        duration: 22000,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]);
    pulse.start();
    return () => pulse.stop();
  }, [lingmanPulse, step]);

  useEffect(() => {
    if (step !== 'name') {
      setKeyboardPad(0);
      return;
    }
    let active = true;
    AsyncStorage.getItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY)
      .then((pending) => {
        if (active) setNicknameMode(pending === '1' ? 'personal_plan' : 'regular');
      })
      .catch(() => {
        if (active) setNicknameMode('regular');
      });
    const evShow = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const evHide = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(evShow, (e) => {
      setKeyboardPad(e.endCoordinates?.height ?? 0);
    });
    const hide = Keyboard.addListener(evHide, () => setKeyboardPad(0));
    return () => { active = false; show.remove(); hide.remove(); };
  }, [step]);

  useEffect(() => {
    if (step !== 'streak') return;
    milestoneAnims.forEach(a => a.setValue(0));
    Animated.sequence([
      Animated.delay(160),
      Animated.stagger(150, milestoneAnims.map(a =>
        Animated.timing(a, {
          toValue: 1,
          duration: 560,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      )),
    ]).start();
  }, [step, milestoneAnims]);

  useEffect(() => {
    if (step !== 'demo2') return;
    // reset phrase builder
    demo2GreetFade.setValue(0);
    demo2HintFade.setValue(0);
    demo2QuizFade.setValue(0);
    setDemo2Selected([]);
    setDemo2Answered(false);
    setDemo2Correct(false);
    // sequence: greet → hint → quiz
    Animated.sequence([
      Animated.timing(demo2GreetFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.delay(300),
      Animated.timing(demo2HintFade, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.delay(200),
      Animated.timing(demo2QuizFade, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [step, demo2GreetFade, demo2HintFade, demo2QuizFade]);


  // Уведомляем родителя о языке при монтировании
  useEffect(() => {
    onLangSelect?.(lang);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNameDone = async () => {
    if (nameBusy) return;
    setNameFieldError(null);
    const validation = validateNameDraft(name);
    if (!validation.ok) {
      const value = name.trim();
      setNameFieldError(validation.message);
      setNameAvailability({ status: 'error', value, message: validation.message });
      return;
    }
    const trimmed = validation.trimmed;
    const availabilityMatches = nameAvailability.value.trim().toLowerCase() === trimmed.toLowerCase();

    // ОПТИМИСТИЧНЫЙ переход. Раньше «Продолжить» ЖДАЛ серверную бронь имени
    // (reserveNameDetailed), и на холодном старте авторизация не успевала за
    // таймаут → ложное «Имя не проверилось» + долгое ожидание. На ОНБОРДИНГЕ
    // ждать сеть не нужно: имя принимаем СРАЗУ (локально), а бронь на сервере
    // дорезервируем в ФОНЕ. Если введённое имя уже помечено фоновой live-проверкой
    // как 'taken' — блокируем мгновенно (это уже готовое состояние, без ожидания).
    // Состояние 'checking' НЕ блокирует: фоновая проверка не должна задерживать
    // переход. Настоящая серверная уникальность остаётся за фоновым
    // reserveNameDetailed + проверкой/сменой имени в Настройках; для онбординга
    // важнее НОЛЬ ожидания.
    if (availabilityMatches && nameAvailability.status === 'taken') {
      const message = pickNameText(
        'Это имя уже занято — придумай другой ник.',
        'Це ім\'я вже зайняте — вигадай інший нік.',
        'Este nombre ya está en uso; prueba con otro.',
      );
      setNameFieldError(message);
      setNameAvailability({ status: 'taken', value: trimmed, message });
      return;
    }

    // Имя применяем немедленно — переход мгновенный, без ожидания сети.
    setName(trimmed);
    setNameAvailability({
      status: 'available',
      value: trimmed,
      message: pickNameText('Имя свободно', 'Ім\'я вільне', 'Nombre disponible'),
    });
    nameForProfileRef.current = trimmed;
    Keyboard.dismiss();

    // Серверная бронь имени — В ФОНЕ (переход НЕ ждёт её). Анти-петля «имя занято
    // после краша»: читаем ранее сохранённое user_name как oldName ДО перезаписи,
    // чтобы сервер узнал свой же слот (self-owner → 'ok'). Бронь не блокирует
    // переход; если на сервере имя реально занято, это всплывёт позже в
    // Настройках/лидерборде (фоновая live-проверка имени и без того гоняется).
    void (async () => {
      try {
        const priorReservedName = (await AsyncStorage.getItem('user_name'))?.trim() ?? '';
        await AsyncStorage.multiSet([
          ['app_lang', lang],
          ['user_name', trimmed],
        ]);
        if (nicknameMode === 'personal_plan') {
          // После покупки ведём через streak → auth так же как обычного юзера,
          // чтобы покупатель не оставался анонимом и не терял прогресс на 2-м устройстве.
          await AsyncStorage.removeItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY);
        }
        await reserveNameDetailed(trimmed, priorReservedName, { source: 'onboarding' });
      } catch { /* ignore — онбординг уже идёт дальше */ }
    })();
    void import('../app/firestore_leagues')
      .then((m) => m.registerInLeagueGroupSilently())
      .catch(() => {});

    goToStep('streak');
  };

  const saveUserProfile = async () => {
    if (!goal || !minutesPerDay || !currentLevel) return;

    // Определяем целевой уровень (на один выше текущего, но не выше C1)
    const targetIdx = Math.min(TARGET_LEVELS.indexOf(currentLevel) + 1, TARGET_LEVELS.length - 1);
    const target = TARGET_LEVELS[targetIdx] as TargetLevel;

    const daysEstimate = estimateDaysToTarget(currentLevel, target, minutesPerDay);
    const targetDate = addDays(new Date(), daysEstimate);

    const profile: UserProfile = {
      name: (nameForProfileRef.current || name).trim(),
      learningGoal: goal,
      minutesPerDay,
      currentLevel,
      targetLevel: target,
      preferredNotificationTime: notificationTime,
      onboardingCompleted: true,
      createdAt: new Date().toISOString(),
      estimatedDaysToTarget: daysEstimate,
      estimatedTargetDate: targetDate.toISOString().split('T')[0],
    };

    await AsyncStorage.setItem('user_profile', JSON.stringify(profile));

    // Рефкод в облаке — в фоне, без блокировки кнопки «Позже» / входа
    void generateReferralCode((nameForProfileRef.current || name).trim()).catch(() => {});
  };

  // Гард от повторного завершения онбординга при двойном тапе на «Позже»/auth-кнопках.
  // Без него onDone() мог дёрнуться дважды → setTimeout в _layout повторно открывал
  // модалку «Начнём первый урок?» уже после нажатия «Поехали».
  const finishingRef = useRef(false);
  const closingRef = useRef(false);

  const completeOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem('onboarding_step');
    scheduleDailyReminder(20, 0, lang, { requestPermission: false }).catch(() => {});
    onDone();
  }, [lang, onDone]);

  const handleFinishOnboarding = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    await saveUserProfile();
    await AsyncStorage.setItem('onboarding_done', '1');
    await completeOnboarding();
  };

  const handleCloseOnboarding = async () => {
    if (finishingRef.current || closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    try {
      let finalName = nameForProfileRef.current.trim();
      if (!finalName) {
        setNameFieldError(pick('Введи имя, чтобы продолжить', 'Введіть ім\'я щоб продовжити', 'Escribe tu nombre para continuar'));
        goToStep('name');
        return;
      }
      nameForProfileRef.current = finalName;
      await AsyncStorage.multiSet([
        ['app_lang', lang],
        ['user_name', finalName],
      ]);
      await handleFinishOnboarding();
    } finally {
      closingRef.current = false;
    }
  };

  // Вызывается при нажатии CTA «Это мой план — вперёд» на экране результата плана.
  // ВСЕГДА показываем ПЕРСОНАЛИЗИРОВАННЫЙ онбординг-пейвол (шаг planPaywall):
  // имя юзера, его ответы (цель/уровень/минуты), превью «Неделя 1 открыта / 2–12
  // заблокированы», таймлайн триала и цены из стора. Это ключевой экран монетизации
  // онбординга — он обязан появляться.
  //
  // ВАЖНО: пейвол НЕЛЬЗЯ скрывать из-за intro-доступа («3 подарочных дня»). Раньше
  // тут вызывался onIntroFullAccessStart(), который ВСЕГДА возвращает true (он просто
  // стартует подарочные дни) → ветка «доступ уже есть» срабатывала всегда → пейвол
  // никогда не показывался. Intro-доступ — отдельный механизм, он не отменяет пейвол.
  // Пейвол пропускаем ТОЛЬКО при реальном Premium (hasPremiumAccess), что у нового
  // онбординг-юзера ложно.
  const openSelectedPlanAbPaywall = async () => {
    if (paywallBusy) return;
    setPaywallPurchasing(true);
    try {
      const paywallPlan = selectedPlanBilling === 'monthly' ? 'monthly' : 'yearly';
      void logOnboardingFunnel('cta_click');

      await AsyncStorage.setItem('onboarding_plan_billing', paywallPlan);

      // Запоминаем выбранный план В ОЧЕРЕДЬ pending-активации ДО любой развилки.
      // Раньше это делалось только в ветке уже-премиум (ниже), а путь через
      // A/B/C пейвол (onPersonalPlanPaywallStart) план НЕ запоминал → после
      // покупки/«продолжить бесплатно» activatePendingPersonalPlanAfterPremium
      // не находил pending и план не активировался (на главной показывалось
      // «Составь свой маршрут»). В деве с FORCE_PREMIUM=true премиум-ветка
      // пропускается, поэтому без этого плана план терялся всегда. Лишний pending
      // безвреден: его подберёт и очистит первая же activate.
      try {
        await queuePendingPersonalPlanActivation({
          planId: selectedPlanId,
          minutesPerDay: selectedPlanMinutesForPlan,
          source: 'onboarding',
        });
      } catch {
        // invalid_personal_plan_pending_activation не должен валить весь переход —
        // selectedPlanId/minutes валидны by construction, но на всякий случай тихо.
      }

      if (hasPremiumAccess && !FORCE_PREMIUM) {
        // Реальный Premium (не dev-форс) уже есть — платить незачем, активируем план и идём к имени.
        await AsyncStorage.multiSet([
          ['app_lang', lang],
          [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
          ['onboarding_step', 'name'],
        ]);
        await activatePendingPersonalPlanAfterPremium();
        setNicknameMode('personal_plan');
        goToStep('name');
        return;
      }

      // Premium нет — переходим на A/B/C пейвол (с фоном онбординга).
      // План уже в pending-очереди (выше), поэтому любой исход пейвола
      // (покупка / «продолжить бесплатно» / dev-bypass) активирует его через
      // finishPersonalPlanActivationFlow → activatePendingPersonalPlanAfterPremium.
      setNicknameMode('personal_plan');
      await onPersonalPlanPaywallStart?.();
    } finally {
      setPaywallPurchasing(false);
    }
  };

  // Ручной ретрай загрузки цен после сбоя сети на пейволе.
  const handleRetryStorePrices = () => {
    setStorePrices((p) => ({ ...p, loaded: false, failed: false }));
    setStorePricesRetry((n) => n + 1);
  };

  const handlePaywallPurchase = async () => {
    if (paywallBusy) return;

    void import('../app/analytics').then(({ trackEvent }) =>
      trackEvent('onboarding_plan_trial_cta', { plan: selectedPlanBilling, has_trial: storePrices.hasTrial, ob_color: obColor }),
    );
    void logOnboardingFunnel('cta_click');

    // Путь 1: уже РЕАЛЬНЫЙ Premium — платить незачем, активируем план и идём к имени.
    //
    // ВАЖНО: НЕ звать здесь onIntroFullAccessStart() для определения «есть ли доступ».
    // onIntroFullAccessStart() — это СТАРТ «3 подарочных дней», он ВСЕГДА возвращает true
    // у нового онбординг-юзера. Если завязать на него ветку «доступ уже есть», то нажатие
    // CTA «Попробовать N дней бесплатно / Открыть полный доступ» НИКОГДА не запускало
    // реальную покупку — просто стартовало подарочные дни и перекидывало на ввод имени.
    // Именно это видел пользователь. Пропускаем покупку ТОЛЬКО при реальном Premium
    // (hasPremiumAccess; при dev-форсе FORCE_PREMIUM всё равно даём пройти покупку).
    if (hasPremiumAccess && !FORCE_PREMIUM) {
      await AsyncStorage.multiSet([
        ['app_lang', lang],
        [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
        ['onboarding_step', 'name'],
      ]);
      await queuePendingPersonalPlanActivation({
        planId: selectedPlanId,
        minutesPerDay: selectedPlanMinutesForPlan,
        source: 'onboarding',
      });
      await activatePendingPersonalPlanAfterPremium();
      setNicknameMode('personal_plan');
      goToStep('name');
      return;
    }

    // Путь 2: inline-покупка RC
    setPaywallPurchasing(true);
    try {
      const [
        Purchases,
        { initRevenueCat, syncRevenueCatIdentity },
        { inferPremiumPlanFromProductId, persistStorePremiumLocally, revenueCatPremiumMetadata },
        { getTrialInfo, trialDaysOrDefault },
        { scheduleTrialEndReminder, requestNotificationPermission },
        { emitAppEvent },
        { trackEvent },
        { trackActivity },
        { hapticTap: hap },
      ] = await Promise.all([
        import('react-native-purchases').then((m) => m.default),
        import('../app/revenuecat_init'),
        import('../app/premium_revenuecat_state'),
        import('../app/paywall_trial_info'),
        import('../app/notifications'),
        import('../app/events'),
        import('../app/analytics').then((m) => ({ trackEvent: m.trackEvent })),
        import('../app/app_activity').then((m) => ({ trackActivity: m.trackActivity })),
        import('../hooks/use-haptics'),
      ]);

      await initRevenueCat();
      if (!(await syncRevenueCatIdentity())) {
        AppInfoDialog.alert(
          pick('Ошибка подключения', 'Помилка з\'єднання', 'Error de conexión'),
          pick('Не удалось связаться с магазином. Попробуй позже.', 'Не вдалося зв\'язатися з магазином.', 'No pudimos contactar la tienda.'),
        );
        return;
      }

      const pkgs = storePackagesRef.current as { monthly?: import('react-native-purchases').PurchasesPackage; yearly?: import('react-native-purchases').PurchasesPackage };
      const pkg = selectedPlanBilling === 'monthly' ? pkgs.monthly : pkgs.yearly;

      if (!pkg) {
        // пакеты ещё не загрузились — загружаем сейчас
        const { resolvePremiumPackages } = await import('../app/revenuecat_init');
        const o = await Purchases.getOfferings();
        const resolved = resolvePremiumPackages(o.current?.availablePackages ?? []);
        storePackagesRef.current = resolved;
        const freshPkg = selectedPlanBilling === 'monthly' ? resolved.monthly : resolved.yearly;
        if (!freshPkg) {
          AppInfoDialog.alert(
            pick('Магазин недоступен', 'Магазин недоступний', 'Tienda no disponible'),
            pick('Попробуй позже.', 'Спробуй пізніше.', 'Inténtalo más tarde.'),
          );
          return;
        }
        storePackagesRef.current = { ...resolved };
      }

      const finalPkg = (storePackagesRef.current as { monthly?: import('react-native-purchases').PurchasesPackage; yearly?: import('react-native-purchases').PurchasesPackage })[selectedPlanBilling === 'monthly' ? 'monthly' : 'yearly'];
      if (!finalPkg) return;

      void trackEvent('purchase_started', { context: 'onboarding', plan: selectedPlanBilling, product_id: finalPkg.product.identifier, ob_color: obColor });
      void trackActivity('paywall:cta_click', {
        feature: 'revenue',
        screen: 'onboarding',
        result: 'info',
        writeToFirestore: true,
        tags: {
          context: 'onboarding',
          source: 'onboarding',
          plan: selectedPlanBilling,
          productId: finalPkg.product.identifier,
          ob_color: obColor,
        },
      });

      const pkgTrial = getTrialInfo(finalPkg);
      const { customerInfo } = await Purchases.purchasePackage(finalPkg);
      const metadata = revenueCatPremiumMetadata(customerInfo, finalPkg.product.identifier);
      const confirmedPlan = inferPremiumPlanFromProductId(metadata.productId, selectedPlanBilling === 'monthly' ? 'monthly' : 'yearly');
      await persistStorePremiumLocally(confirmedPlan, metadata);
      emitAppEvent('premium_activated');
      hap();
      void trackEvent('purchase_completed', { context: 'onboarding', plan: selectedPlanBilling, with_trial: pkgTrial.hasTrial, ob_color: obColor });
      void trackActivity('paywall:purchase_success', {
        feature: 'revenue',
        screen: 'onboarding',
        result: 'success',
        writeToFirestore: true,
        tags: {
          context: 'onboarding',
          source: 'onboarding',
          plan: selectedPlanBilling,
          productId: metadata.productId,
          with_trial: pkgTrial.hasTrial,
          ob_color: obColor,
        },
      });
      logOnboardingFunnel('purchase_completed');
      playPurchaseSuccess();

      if (pkgTrial.hasTrial) {
        void trackEvent('trial_started', { context: 'onboarding', plan: selectedPlanBilling, ob_color: obColor });
        logOnboardingFunnel('trial_started');
        // Запрашиваем пуш-разрешение ПОСЛЕ покупки — момент Blinkist
        void (async () => {
          try {
            const granted = await requestNotificationPermission();
            if (!granted) return;
            const days = trialDaysOrDefault(pkgTrial);
            const price = finalPkg.product.priceString ?? '';
            await scheduleTrialEndReminder(
              days,
              pick('Триал заканчивается завтра', 'Тріал закінчується завтра', 'Tu prueba termina mañana'),
              pick(`Дальше — ${price}. Отменить можно в два тапа.`, `Далі — ${price}. Скасувати у два тапи.`, `Luego: ${price}. Cancelar en dos toques.`),
            );
          } catch { /* best-effort */ }
        })();
      }

      // Покупка прошла — активируем план, показываем celebration, потом имя
      await AsyncStorage.multiSet([
        ['app_lang', lang],
        [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
        ['onboarding_step', 'name'],
      ]);
      await queuePendingPersonalPlanActivation({
        planId: selectedPlanId,
        minutesPerDay: selectedPlanMinutesForPlan,
        source: 'onboarding',
      });
      await activatePendingPersonalPlanAfterPremium();
      setNicknameMode('personal_plan');
      setPurchaseCelebrationVisible(true);
    } catch (err: unknown) {
      if ((err as { userCancelled?: boolean })?.userCancelled) {
        void import('../app/analytics').then(({ trackEvent }) =>
          trackEvent('purchase_cancelled', { context: 'onboarding', plan: selectedPlanBilling }),
        );
      } else {
        AppInfoDialog.alert(
          pick('Не удалось оформить', 'Не вдалося оформити', 'No se pudo completar'),
          pick('Попробуй ещё раз или восстанови покупки.', 'Спробуй ще раз або віднови покупки.', 'Inténtalo de nuevo o restaura tus compras.'),
        );
      }
    } finally {
      setPaywallPurchasing(false);
    }
  };

  // Восстановление покупок с inline-пейвола
  const handlePaywallRestore = async () => {
    if (paywallBusy) return;
    setPaywallRestoring(true);
    try {
      const [
        Purchases,
        { initRevenueCat, syncRevenueCatIdentity },
        { inferPremiumPlanFromProductId, persistStorePremiumLocally, revenueCatPremiumMetadata },
        { emitAppEvent },
      ] = await Promise.all([
        import('react-native-purchases').then((m) => m.default),
        import('../app/revenuecat_init'),
        import('../app/premium_revenuecat_state'),
        import('../app/events'),
      ]);
      await initRevenueCat();
      if (!(await syncRevenueCatIdentity())) {
        AppInfoDialog.alert(pick('Ошибка', 'Помилка', 'Error'), pick('Попробуй позже.', 'Спробуй пізніше.', 'Inténtalo más tarde.'));
        return;
      }
      const info = await Purchases.restorePurchases();
      if (Object.keys(info.entitlements.active).length > 0 || (info.activeSubscriptions ?? []).length > 0) {
        const metadata = revenueCatPremiumMetadata(info);
        const plan = inferPremiumPlanFromProductId(metadata.productId,
          (info.activeSubscriptions ?? []).some((s: string) => /year|annual|12.?month/i.test(s)) ? 'yearly' : 'monthly',
        );
        await persistStorePremiumLocally(plan, metadata);
        emitAppEvent('premium_activated');
        await AsyncStorage.multiSet([
          ['app_lang', lang],
          [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
          ['onboarding_step', 'name'],
        ]);
        await queuePendingPersonalPlanActivation({ planId: selectedPlanId, minutesPerDay: selectedPlanMinutesForPlan, source: 'onboarding' });
        await activatePendingPersonalPlanAfterPremium();
        setNicknameMode('personal_plan');
        goToStep('name');
      } else {
        AppInfoDialog.alert(
          pick('Покупки не найдены', 'Покупки не знайдено', 'No se encontraron compras'),
          pick('Активных подписок не обнаружено.', 'Активних підписок не знайдено.', 'No hay suscripciones activas.'),
        );
      }
    } catch {
      AppInfoDialog.alert(pick('Ошибка', 'Помилка', 'Error'), pick('Не удалось восстановить покупки.', 'Не вдалося відновити покупки.', 'No se pudieron restaurar.'));
    } finally {
      setPaywallRestoring(false);
    }
  };

  const renderScreen = (
    testID: string | undefined,
    source: ImageSourcePropType | null,
    children: React.ReactNode,
    contentStyle?: StyleProp<ViewStyle>,
    hideClose = false,
  ) => (
    <OnboardingScreenShell
      testID={testID}
      screenFade={screenFade}
      contentStyle={contentStyle}
      hideClose={hideClose}
      onClose={handleCloseOnboarding}
      styles={styles}
      theme={theme}
      source={source}
    >
      {children}
    </OnboardingScreenShell>
  );

  const renderPlanSegmentProgress = () => {
    const activeIndex = Math.max(0, PLAN_PROGRESS_STEPS.indexOf(step));
    return (
      <View style={styles.planFlowProgressSegments} pointerEvents="none">
        {PLAN_PROGRESS_STEPS.map((progressStep, index) => (
          <OnboardingProgressSegment
            key={progressStep}
            active={index <= activeIndex}
            styles={styles}
          />
        ))}
      </View>
    );
  };

  const renderPlanFlowScreen = (
    testID: string,
    _eyebrow: string,
    title: string,
    lead: string,
    children: React.ReactNode,
  ) => renderScreen(
    testID,
    ONBOARDING_BG_WELCOME,
    (
      <View style={styles.planFlowShell}>
        <View style={styles.planFlowTop}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Назад"
            onPress={() => goToStep(getOnboardingPrevStep(step) ?? onboardingEntryStepRef.current)}
            activeOpacity={0.82}
            style={styles.planFlowBack}
          >
            <Text style={styles.planFlowBackGlyph}>‹</Text>
          </TouchableOpacity>
          {renderPlanSegmentProgress()}
        </View>
        <OnboardingScroll
          style={styles.onboardingScroll}
          decelerationRate="normal"
          contentContainerStyle={styles.planFlowScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.planFlowQuestionBlock}>
            <Text style={styles.planFlowTitle}>{title}</Text>
            {lead ? <Text style={styles.planFlowLead}>{lead}</Text> : null}
          </View>
          {children}
        </OnboardingScroll>
      </View>
    ),
    undefined,
    true,
  );

  const renderMockupPlanTop = (brand?: string) => (
    <View style={styles.planMockupTop}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Назад"
        onPress={() => goToStep(getOnboardingPrevStep(step) ?? onboardingEntryStepRef.current)}
        activeOpacity={0.82}
        style={styles.planFlowBack}
      >
        <Text style={styles.planFlowBackGlyph}>‹</Text>
      </TouchableOpacity>
      {brand ? <Text style={styles.planMockupBrand}>{brand}</Text> : <View />}
    </View>
  );

  const renderPlanDaysProgressBlock = (days: number) => {
    const visibleDays = Math.max(0, Math.min(days, animatedPlanDays));
    const daysFillScale = planDaysProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.001, 1],
    });
    return (
      <View style={styles.planMockupDaysCard}>
        <View style={styles.planMockupDaysTop}>
          <Text style={styles.planMockupDaysLabel}>{triOb('Дней занятий', 'Днів занять', 'Días de práctica')}</Text>
          <View style={styles.planMockupDaysValueWrap}>
            <Text style={styles.planMockupDaysValue}>
              {visibleDays}
            </Text>
            <Text style={styles.planMockupDaysWord}>{dayWord(days)}</Text>
          </View>
        </View>
        <View style={styles.planMockupDaysTrack}>
          <Animated.View
            style={[styles.planMockupDaysFill, { transform: [{ scaleX: daysFillScale }] }]}
          >
            <LinearGradient
              colors={theme.heroGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.planMockupDaysFillGradient}
            />
          </Animated.View>
        </View>
      </View>
    );
  };

  const renderPlanRows = (plan: typeof selectedPlan, todayIconAsset = plan.todayIconAsset ?? ONBOARDING_PLAN_ICONS.phrase) => (
    <View style={styles.planMockupRowsPanel}>
      <View style={styles.planMockupRow}>
        <OnboardingBundledImage
          source={plan.iconAsset}
          style={styles.planMockupRowIcon}
        />
        <View style={styles.planFlowOptionCopy}>
          <Text style={styles.planMockupRowTitle}>{triOb('Рекомендуемый старт', 'Рекомендований старт', 'Inicio recomendado')}: {plan.recommendedLevel}</Text>
          <Text style={styles.planMockupRowSub}>{localizedPlanLevelSub(plan)}</Text>
        </View>
      </View>
      <View style={styles.planMockupRow}>
        <OnboardingBundledImage
          source={todayIconAsset}
          style={styles.planMockupRowIcon}
        />
        <View style={styles.planFlowOptionCopy}>
          <Text style={styles.planMockupRowTitle}>{triOb('Уже к середине срока', 'Вже до середини строку', 'Para la mitad del plan')}</Text>
          <Text style={styles.planMockupRowSub}>{localizedPlanOutcome(plan)}</Text>
        </View>
      </View>
    </View>
  );

  const renderPlanResultLikeScreen = ({
    testID,
    brand,
    plan,
    minutes,
    todayIconAsset,
    actions,
  }: {
    testID: string;
    brand?: string;
    plan: typeof selectedPlan;
    minutes: PlanMinutesChoice;
    todayIconAsset?: PlanIconSource;
    actions: React.ReactNode;
  }) => renderScreen(
    testID,
    ONBOARDING_BG_WELCOME,
    (
      <OnboardingScroll
        style={styles.onboardingScroll}
        decelerationRate="normal"
        contentContainerStyle={styles.planMockupResultScroll}
        showsVerticalScrollIndicator={false}
      >
        {renderMockupPlanTop(brand)}
        <View style={styles.planMockupResultBody}>
          <Text style={styles.planMockupResultTitle}>{localizedPlanName(plan)}</Text>
          <View style={styles.planMockupPitchCard}>
            <Text style={styles.planMockupPitchText}>{localizedPlanPitch(plan)}</Text>
          </View>
          {renderPlanDaysProgressBlock(plan.days)}
          <View style={styles.planMockupResultHero}>
            <Text style={styles.planMockupBigNum}>{localizedPlanHorizon(plan)}</Text>
            <Text style={styles.planMockupHeroSub}>{triOb(`ориентир до заметного прогресса при ${minutes === 20 ? '20' : minutes} минутах в день`, `орієнтир до помітного прогресу за ${minutes === 20 ? '20' : minutes} хвилин на день`, `objetivo para progreso notable con ${minutes === 20 ? '20' : minutes} min/día`)}</Text>
          </View>
          {renderPlanRows(plan, todayIconAsset)}
          <View style={styles.planMockupCtaStack}>{actions}</View>
        </View>
      </OnboardingScroll>
    ),
    undefined,
    true,
  );

  // ── Шаг 0: Добро пожаловать в бета ─────────────────────────────────────────
  if (!onboardingEntryReady) {
    return renderScreen(
      'onboarding-ab-resolving-screen',
      ONBOARDING_BG_WELCOME,
      <View />,
      styles.eliteWelcomeRoot,
      true,
    );
  }

  if (step === 'planEntry') {
    return renderScreen(
      'onboarding-plan-entry-screen',
      ONBOARDING_BG_WELCOME,
      (
        <View style={[styles.planEntryRoot, { paddingTop: Math.max(22, progressTopPadding) }]}>
          <Text style={styles.planEntryBrand}>PHRASEMAN</Text>
          <View style={styles.planEntryMain}>
            <Animated.View style={styles.planEntryMark}>
              <LinearGradient
                colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.075)', theme.accentBgSoft]}
                locations={[0, 0.46, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.eliteWelcomeMarkGlass, styles.planEntryMarkGlass]}
              >
                <View pointerEvents="none" style={styles.eliteWelcomeGlassShine} />
                <OnboardingBundledImage
                  source={ONBOARDING_LINGMAN_ICON}
                  style={[styles.eliteWelcomeMarkLogo, styles.planEntryMarkLogo]}
                />
              </LinearGradient>
            </Animated.View>
            <Text
              style={[styles.eliteWelcomeTitle, styles.planEntryTitle]}
              numberOfLines={1}
            >
              {planOnlyEntry
                ? triOb('Твой личный план', 'Твій особистий план', 'Tu plan personal')
                : triOb('Начнём с твоей цели', 'Почнемо з твоєї мети', '¿Por dónde empezamos?')}
            </Text>
            <Text style={[styles.eliteWelcomeSub, styles.planEntrySub]}>
              {planOnlyEntry
                ? triOb(
                    'Соберём короткий план под твою цель — и сразу начнём.',
                    'Зберемо короткий план під твою ціль — і одразу почнемо.',
                    'Creamos un plan corto para tu objetivo y empezamos.',
                  )
                : triOb(
                    'Составим план под твою цель — или сразу начнём знакомиться с приложением.',
                    'Зберемо короткий план під твою ціль або одразу почнемо знайомитися з застосунком?',
                    'Creamos un plan corto para tu objetivo o empezamos a conocer la app.',
                  )}
            </Text>
            <View style={styles.planEntryCtas}>
            <DuoPressable
              testID="onboarding-create-personal-plan"
              style={[styles.eliteWelcomeCta, styles.planEntryCta]}
              edgeColor={theme.accentDeep}
              onPress={() => goToStep('planGoal')}
            >
              <Text style={[styles.eliteWelcomeCtaText, styles.planEntryCtaText]}>
                {planOnlyEntry
                  ? triOb('Составить мой план', 'Скласти мій план', 'Crear mi plan')
                  : triOb('Составить план под мою цель', 'Скласти план під мою ціль', 'Crear mi plan')}
              </Text>
            </DuoPressable>
            {!planOnlyEntry && (
            <TouchableOpacity
              testID="onboarding-continue-independently"
              style={[styles.eliteWelcomeSecondaryCta, styles.planEntrySecondaryCta]}
              onPress={async () => {
                setNicknameMode('regular');
                await AsyncStorage.removeItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY).catch(() => {});
                goToStep(onboardingSimpleStepRef.current);
              }}
              activeOpacity={0.82}
            >
              <Text style={[styles.eliteWelcomeSecondaryCtaText, styles.planEntrySecondaryCtaText]}>
                {triOb('Просто посмотреть приложение', 'Просто подивитися застосунок', 'Explorar la app')}
              </Text>
            </TouchableOpacity>
            )}
            </View>
          </View>
        </View>
      ),
      undefined,
      true,
    );
  }

  if (step === 'planGoal') {
    return renderPlanFlowScreen(
      'onboarding-plan-goal-screen',
      '',
      triOb('Зачем тебе английский?', 'Навіщо тобі англійська?', '¿Para qué necesitas inglés?'),
      triOb('Скажи - и план сразу подберет нужные слова и ситуации.', 'Скажи - і план одразу підбере потрібні слова та ситуації.', 'Dínoslo y el plan elegirá palabras y situaciones útiles.'),
      <View style={styles.planFlowStack}>
        {PLAN_GOAL_CHOICES.map((choice) => {
          const selected = selectedPlanGoal === choice.id;
          return (
            <TouchableOpacity
              key={choice.id}
              style={[styles.planFlowOption, selected && styles.planFlowOptionSelected]}
              activeOpacity={0.84}
              onPress={() => {
                setSelectedPlanGoal(choice.id);
                setSelectedPlanOverride(null);
                void import('../app/analytics').then(({ trackEvent }) => trackEvent('onboarding_plan_goal_select', { goal: choice.id }));
                goToStep('planLevel');
              }}
            >
              <PlanFlowIcon source={choice.iconAsset} styles={styles} />
              <View style={styles.planFlowOptionCopy}>
                <Text style={styles.planFlowOptionTitle}>{localizedChoiceTitle(choice)}</Text>
                <Text style={styles.planFlowOptionSub}>{localizedChoiceSubtitle(choice)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>,
    );
  }

  if (step === 'planLevel') {
    return renderPlanFlowScreen(
      'onboarding-plan-level-screen',
      '',
      triOb('С чего начнем?', 'З чого почнемо?', '¿Desde dónde empezamos?'),
      triOb(
        'Любой ответ — правильный. Всё с переводом и короткими шагами: справишься с нуля.',
        'Будь-яка відповідь — правильна. Усе з перекладом і короткими кроками: впораєшся з нуля.',
        'Cualquier respuesta es válida. Todo con traducción y pasos cortos: lo lograrás desde cero.',
      ),
      <View style={styles.planFlowStack}>
        {PLAN_LEVEL_CHOICES.map((choice) => {
          const selected = selectedPlanLevel === choice.id;
          return (
            <TouchableOpacity
              key={choice.id}
              style={[styles.planFlowOption, selected && styles.planFlowOptionSelected]}
              activeOpacity={0.84}
              onPress={() => {
                setSelectedPlanLevel(choice.id);
                setSelectedPlanOverride(null);
                void import('../app/analytics').then(({ trackEvent }) => trackEvent('onboarding_plan_level_select', { level: choice.id }));
                goToStep('planMinutes');
              }}
            >
              <PlanFlowIcon source={choice.iconAsset} styles={styles} />
              <View style={styles.planFlowOptionCopy}>
                <Text style={styles.planFlowOptionTitle}>{localizedChoiceTitle(choice)}</Text>
                <Text style={styles.planFlowOptionSub}>{localizedChoiceSubtitle(choice)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>,
    );
  }

  if (step === 'planMinutes') {
    return renderPlanFlowScreen(
      'onboarding-plan-minutes-screen',
      '',
      triOb('Сколько времени удобно?', 'Скільки часу зручно?', '¿Cuánto tiempo te va bien?'),
      triOb('Выбери ритм, который реально получится держать каждый день.', 'Обери ритм, який реально тримати щодня.', 'Elige un ritmo que puedas mantener cada día.'),
      <View style={styles.planFlowStack}>
        {PLAN_MINUTES_CHOICES.map((choice) => {
          const selected = selectedPlanMinutes === choice;
          return (
            <TouchableOpacity
              key={choice}
              style={[styles.planFlowOption, selected && styles.planFlowOptionSelected]}
              activeOpacity={0.84}
              onPress={() => {
                setSelectedPlanMinutes(choice);
                setSelectedPlanOverride(null);
                void import('../app/analytics').then(({ trackEvent }) => trackEvent('onboarding_plan_minutes_select', { minutes: choice }));
                scheduleDailyReminder(20, 0, lang, { requestPermission: false }).catch(() => {});
                goToStep('planLoading');
              }}
            >
              <PlanFlowIcon source={ONBOARDING_PLAN_ICONS.time} styles={styles} />
              <View style={styles.planFlowOptionCopy}>
                <Text style={styles.planFlowOptionTitle}>{planMinutesTitle(choice)}</Text>
                <Text style={styles.planFlowOptionSub}>{planMinutesSubtitle(choice)}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>,
    );
  }

  if (step === 'planLoading') {
    const meterScaleX = planLoadingMeter.interpolate({
      inputRange: PLAN_LOADING_METER_KEYFRAMES.inputRange,
      outputRange: PLAN_LOADING_METER_KEYFRAMES.outputRange,
    });
    return renderPlanFlowScreen(
      'onboarding-plan-loading-screen',
      '',
      triOb('Собираем твой план', 'Збираємо твій план', 'Preparando tu plan'),
      '',
      <View style={styles.planFlowStack}>
        <View style={styles.planProgressRail}>
          <Animated.View
            style={[styles.planProgressFill, { transform: [{ scaleX: meterScaleX }] }]}
          >
            <LinearGradient
              colors={[theme.accent, theme.accent2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.planProgressFillGradient}
            />
          </Animated.View>
        </View>
        {PLAN_LOADING_BUILD_ITEMS.map((item, index) => (
          <Animated.View
            key={item.title}
            style={[
              styles.planFlowChecklistRow,
              {
                opacity: planLoadingBuildAnims[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.28, 1],
                }),
                transform: [{
                  translateY: planLoadingBuildAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [6, 0],
                  }),
                }],
              },
            ]}
          >
            <OnboardingBundledImage
              source={item.iconAsset}
              style={styles.planLoadingBuildIcon}
            />
            <Text style={styles.planFlowChecklistText}>{localizedPlanLoadingItem(index)}</Text>
          </Animated.View>
        ))}
        <Animated.View
          pointerEvents={planLoadingCtaReady ? 'auto' : 'none'}
          style={{ opacity: planLoadingButtonAnim }}
        >
          <DuoPressable style={[styles.eliteWelcomeCta, styles.planMockupPrimaryButton]} edgeColor={theme.accentDeep} onPress={() => goToStep('planResult')}>
            <Text style={styles.planMockupPrimaryButtonText}>{triOb('План готов', 'План готовий', 'Plan listo')}</Text>
          </DuoPressable>
        </Animated.View>
      </View>,
    );
  }

  if (step === 'planResult') {
    return renderPlanResultLikeScreen({
      testID: 'onboarding-plan-result-screen',
      brand: 'Результат',
      plan: selectedPlan,
      minutes: selectedPlanMinutesForPlan,
      todayIconAsset: selectedPlan.todayIconAsset,
      actions: (
        <>
        <DuoPressable
          testID="data-plan-result-cta"
          style={[styles.eliteWelcomeCta, styles.planMockupPrimaryButton]}
          edgeColor={theme.accentDeep}
          onPress={openSelectedPlanAbPaywall}
        >
          <Text style={styles.planMockupPrimaryButtonText}>{triOb('Это мой план - вперед', 'Це мій план - вперед', 'Este es mi plan')}</Text>
        </DuoPressable>
        <TouchableOpacity style={[styles.eliteWelcomeSecondaryCta, styles.planMockupSecondaryButton]} activeOpacity={0.82} onPress={() => goToStep('planPicker')}>
          <Text style={styles.planMockupSecondaryButtonText}>{triOb('Другие планы', 'Інші плани', 'Otros planes')}</Text>
        </TouchableOpacity>
        </>
      ),
    });
  }

  if (step === 'planPaywall') {
    const goalChoice = PLAN_GOAL_CHOICES.find((c) => c.id === selectedPlanGoalForPlan);
    const levelChoice = PLAN_LEVEL_CHOICES.find((c) => c.id === selectedPlanLevelForPlan);
    const goalLabel = goalChoice ? localizedChoiceTitle(goalChoice) : selectedPlanGoalForPlan;
    const levelLabel = levelChoice ? localizedChoiceTitle(levelChoice) : selectedPlanLevelForPlan;
    const minutesLabel = `${selectedPlanMinutesForPlan === 20 ? '20+' : selectedPlanMinutesForPlan} ${triOb('мин/день', 'хв/день', 'min/día')}`;
    const userName = (nameForProfileRef.current || name).trim();
    const heroTitle = userName
      ? triOb(`${userName}, твой план готов`, `${userName}, твій план готовий`, `${userName}, tu plan está listo`)
      : triOb('Твой план готов', 'Твій план готовий', 'Tu plan está listo');
    const trialDays = storePrices.trialDays;
    const ctaLabel = storePrices.hasTrial
      ? triOb(
          `Попробовать ${trialDays} ${trialDays === 1 ? 'день' : trialDays < 5 ? 'дня' : 'дней'} бесплатно`,
          `Спробувати ${trialDays} ${trialDays === 1 ? 'день' : trialDays < 5 ? 'дні' : 'днів'} безкоштовно`,
          `Probar ${trialDays} ${trialDays === 1 ? 'día' : 'días'} gratis`,
        )
      : triOb('Открыть полный доступ', 'Відкрити повний доступ', 'Obtener acceso completo');

    // Экономия годового vs 12×месячный (якорь цены). Считаем только если обе
    // числовые цены пришли из стора и годовой реально выгоднее.
    const yearlySavingsPct =
      storePrices.monthlyAmount > 0 && storePrices.yearlyAmount > 0
        ? Math.round((1 - storePrices.yearlyAmount / (storePrices.monthlyAmount * 12)) * 100)
        : 0;
    const showYearlySavings = yearlySavingsPct >= 5;

    return renderScreen(
      'onboarding-plan-paywall-screen',
      ONBOARDING_BG_WELCOME,
      (
        <>
          <OnboardingScroll
            style={styles.onboardingScroll}
            decelerationRate="normal"
            contentContainerStyle={styles.planPaywallScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {/* Назад */}
            <View style={styles.planPaywallTop}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={triOb('Назад', 'Назад', 'Atrás')}
                style={styles.planFlowBack}
                onPress={() => goToStep('planResult')}
                activeOpacity={0.76}
              >
                <Text style={styles.planFlowBackGlyph}>‹</Text>
              </TouchableOpacity>
            </View>

            {/* Герой: имя + план */}
            <Text style={styles.planPaywallTitle}>{heroTitle}</Text>
            <Text style={styles.planPaywallLead}>{localizedPlanName(selectedPlan)} · {localizedPlanHorizon(selectedPlan)}</Text>

            {/* Пилюли с ответами юзера */}
            <View style={styles.planPaywallPills}>
              <View style={styles.planPaywallPill}><Text style={styles.planPaywallPillText}>{goalLabel}</Text></View>
              <View style={styles.planPaywallPill}><Text style={styles.planPaywallPillText}>{levelLabel}</Text></View>
              <View style={styles.planPaywallPill}><Text style={styles.planPaywallPillText}>{minutesLabel}</Text></View>
            </View>

            {/* Превью плана: нед.1 открыта, остальное заблокировано */}
            <View style={styles.planPaywallPreview}>
              <View style={styles.planPaywallPreviewWeek}>
                <PlanFlowIcon source={selectedPlan.iconAsset} small styles={styles} />
                <View style={styles.planFlowOptionCopy}>
                  <Text style={styles.planFlowOptionTitle}>{triOb('Неделя 1 — открыта сейчас', 'Тиждень 1 — відкрито зараз', 'Semana 1 — abierta ahora')}</Text>
                  <Text style={styles.planFlowOptionSub}>{triOb(`Старт с уровня ${selectedPlan.recommendedLevel}, ${selectedPlanMinutesForPlan} мин/день`, `Старт з рівня ${selectedPlan.recommendedLevel}, ${selectedPlanMinutesForPlan} хв/день`, `Inicio nivel ${selectedPlan.recommendedLevel}, ${selectedPlanMinutesForPlan} min/día`)}</Text>
                </View>
              </View>
              <View style={styles.planPaywallPreviewLocked}>
                <Ionicons name="lock-closed" size={14} color={theme.textMuted} />
                <Text style={styles.planPaywallPreviewLockedText}>{triOb('Недели 2–12 откроются после подписки', 'Тижні 2–12 відкриються після підписки', 'Semanas 2–12 se abren con suscripción')}</Text>
              </View>
            </View>

            {/* Таймлайн триала (только если есть триал) */}
            {storePrices.hasTrial ? (
              <View style={styles.planPaywallTimeline}>
                <View style={styles.planPaywallTimelineRow}>
                  <View style={[styles.planPaywallTimelineDot, styles.planPaywallTimelineDotActive]} />
                  <View style={styles.planPaywallTimelineCopy}>
                    <Text style={styles.planPaywallTimelineTitle}>{triOb('Сегодня — полный доступ', 'Сьогодні — повний доступ', 'Hoy — acceso completo')}</Text>
                    <Text style={styles.planPaywallTimelineSub}>{triOb('Карта не списывается', 'Картка не списується', 'Sin cobro al iniciar')}</Text>
                  </View>
                </View>
                <View style={styles.planPaywallTimelineLine} />
                <View style={styles.planPaywallTimelineRow}>
                  <View style={styles.planPaywallTimelineDot} />
                  <View style={styles.planPaywallTimelineCopy}>
                    <Text style={styles.planPaywallTimelineTitle}>{triOb(`День ${Math.max(trialDays - 1, 1)} — напомним`, `День ${Math.max(trialDays - 1, 1)} — нагадаємо`, `Día ${Math.max(trialDays - 1, 1)} — te avisamos`)}</Text>
                    <Text style={styles.planPaywallTimelineSub}>{triOb('Пуш за день до конца триала', 'Пуш за день до кінця триалу', 'Aviso un día antes del cobro')}</Text>
                  </View>
                </View>
                <View style={styles.planPaywallTimelineLine} />
                <View style={styles.planPaywallTimelineRow}>
                  <View style={styles.planPaywallTimelineDot} />
                  <View style={styles.planPaywallTimelineCopy}>
                    <Text style={styles.planPaywallTimelineTitle}>{triOb(`День ${trialDays} — начало подписки`, `День ${trialDays} — початок підписки`, `Día ${trialDays} — inicio de suscripción`)}</Text>
                    <Text style={styles.planPaywallTimelineSub}>
                      {storePrices.yearly && selectedPlanBilling === 'annual'
                        ? triOb(`${storePrices.yearly} / год · отменить можно в любой момент`, `${storePrices.yearly} / рік · скасувати можна будь-коли`, `${storePrices.yearly} / año · cancela cuando quieras`)
                        : storePrices.monthly
                          ? triOb(`${storePrices.monthly} / месяц · отменить можно в любой момент`, `${storePrices.monthly} / місяць · скасувати можна будь-коли`, `${storePrices.monthly} / mes · cancela cuando quieras`)
                          : triOb('Отменить можно в любой момент', 'Скасувати можна будь-коли', 'Cancela cuando quieras')}
                    </Text>
                  </View>
                </View>
              </View>
            ) : null}

            {/* Сбой загрузки цен из стора — понятное сообщение + ретрай вместо вечного «Загружаем…» */}
            {storePrices.failed ? (
              <View style={styles.planPaywallPriceError}>
                <Ionicons name="cloud-offline-outline" size={20} color={theme.textMuted} />
                <Text style={styles.planPaywallPriceErrorText}>
                  {triOb(
                    'Не удалось загрузить цены из магазина. Проверь интернет и попробуй ещё раз.',
                    'Не вдалося завантажити ціни з магазину. Перевір інтернет і спробуй ще раз.',
                    'No se pudieron cargar los precios. Revisa tu conexión e inténtalo de nuevo.',
                  )}
                </Text>
                <TouchableOpacity
                  testID="data-plan-paywall-price-retry"
                  style={styles.planPaywallPriceRetry}
                  activeOpacity={0.82}
                  onPress={handleRetryStorePrices}
                >
                  <Text style={styles.planPaywallPriceRetryText}>{triOb('Повторить', 'Повторити', 'Reintentar')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                {/* Выбор плана */}
                <View style={styles.planPaywallOptions}>
                  <TouchableOpacity
                    style={[styles.planPaywallBuyCard, selectedPlanBilling === 'annual' && styles.planPaywallBuyCardSelected, paywallBusy && styles.planPaywallBuyCardDisabled]}
                    activeOpacity={0.84}
                    disabled={paywallBusy}
                    onPress={() => setSelectedPlanBilling('annual')}
                  >
                    <View style={styles.planPaywallBuyCardInner}>
                      <Text style={styles.planPaywallBuyTitle}>{triOb('Годовой', 'Річний', 'Anual')}</Text>
                      <Text style={styles.planPaywallBuyPrice}>
                        {storePrices.yearly ? storePrices.yearly : triOb('Загружаем…', 'Завантажуємо…', 'Cargando…')}
                      </Text>
                      {showYearlySavings && storePrices.yearlyAmount > 0 ? (
                        <Text style={styles.planPaywallBuyPerMonth}>
                          ≈ {formatPriceLikeStore(storePrices.yearly, storePrices.yearlyAmount / 12)} {triOb('/ мес', '/ міс', '/ mes')}
                        </Text>
                      ) : null}
                    </View>
                    <View style={styles.planPaywallBuyBadge}>
                      <Text style={styles.planPaywallBuyBadgeText}>
                        {showYearlySavings
                          ? triOb(`−${yearlySavingsPct}%`, `−${yearlySavingsPct}%`, `−${yearlySavingsPct}%`)
                          : triOb('Лучшая цена', 'Найкраща ціна', 'Mejor precio')}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.planPaywallBuyCard, selectedPlanBilling === 'monthly' && styles.planPaywallBuyCardSelected, paywallBusy && styles.planPaywallBuyCardDisabled]}
                    activeOpacity={0.84}
                    disabled={paywallBusy}
                    onPress={() => setSelectedPlanBilling('monthly')}
                  >
                    <Text style={styles.planPaywallBuyTitle}>{triOb('Месячный', 'Місячний', 'Mensual')}</Text>
                    <Text style={styles.planPaywallBuyPrice}>
                      {storePrices.monthly ? storePrices.monthly : triOb('Загружаем…', 'Завантажуємо…', 'Cargando…')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* CTA */}
                <DuoPressable
                  testID="data-plan-paywall-trial-cta"
                  style={[styles.eliteWelcomeCta, paywallBusy && { opacity: 0.6 }]}
                  edgeColor={theme.accentDeep}
                  disabled={paywallBusy}
                  pressedExternally={paywallPurchasing}
                  onPress={handlePaywallPurchase}
                >
                  <View style={styles.planPaywallCtaContent}>
                    {paywallPurchasing ? <ActivityIndicator size="small" color={theme.ctaText} /> : null}
                    <Text style={styles.eliteWelcomeCtaText}>
                      {paywallPurchasing ? triOb('Оформляем…', 'Оформляємо…', 'Procesando…') : ctaLabel}
                    </Text>
                  </View>
                </DuoPressable>
              </>
            )}

            {/* Доверие (без рейтинга — не показываем оценку, чтобы не рисковать App Store) */}
            <View style={styles.planPaywallTrustRow}>
              <TouchableOpacity
                onPress={handlePaywallRestore}
                activeOpacity={0.7}
                disabled={paywallBusy}
                accessibilityState={{ disabled: paywallBusy, busy: paywallRestoring }}
              >
                {paywallRestoring ? (
                  <View style={styles.planPaywallRestoreBusy}>
                    <ActivityIndicator size="small" color={theme.textMuted} />
                    <Text style={styles.planPaywallTrustItem}>{triOb('Восстанавливаем…', 'Відновлюємо…', 'Restaurando…')}</Text>
                  </View>
                ) : (
                  <Text style={[styles.planPaywallTrustItem, paywallBusy && styles.planPaywallTrustItemDisabled]}>{triOb('Восстановить', 'Відновити', 'Restaurar')}</Text>
                )}
              </TouchableOpacity>
              <Text style={styles.planPaywallTrustSep}>·</Text>
              <Text style={styles.planPaywallTrustItem}>{triOb('Отменить всегда', 'Скасувати завжди', 'Cancela siempre')}</Text>
            </View>

            <TouchableOpacity
              style={styles.eliteWelcomeSecondaryCta}
              activeOpacity={0.82}
              onPress={() => setShowPlanFreeConfirm(true)}
            >
              <Text style={styles.eliteWelcomeSecondaryCtaText}>{triOb('Продолжить без плана', 'Продовжити без плану', 'Continuar sin plan')}</Text>
            </TouchableOpacity>
            <Text style={styles.legal}>
              {({
                ru: 'Пробный период, цена после него и период подписки берутся из App Store или Google Play. После пробного периода подписка продлевается автоматически. Отменить можно в настройках подписок магазина не позднее чем за 24 часа до продления.',
                uk: 'Пробний період, ціна після нього та період підписки беруться з App Store або Google Play. Після пробного періоду підписка продовжується автоматично. Скасувати можна в налаштуваннях підписок магазину не пізніше ніж за 24 години до продовження.',
                es: 'El periodo de prueba, el precio posterior y el periodo de suscripción provienen de App Store o Google Play. Tras el periodo de prueba, la suscripción se renueva automáticamente. Puedes cancelarla en los ajustes de suscripciones de la tienda al menos 24 horas antes de la renovación.',
                'pt-BR': 'O período de teste, o preço após ele e o período da assinatura vêm da App Store ou Google Play. Após o teste, a assinatura é renovada automaticamente. Você pode cancelar nas configurações de assinaturas da loja até 24 horas antes da renovação.',
                vi: 'Thời gian dùng thử, giá sau đó và chu kỳ đăng ký được lấy từ App Store hoặc Google Play. Sau thời gian dùng thử, gói đăng ký tự động gia hạn. Bạn có thể hủy trong phần cài đặt đăng ký của cửa hàng ít nhất 24 giờ trước khi gia hạn.',
                id: 'Masa uji coba, harga setelahnya, dan periode langganan diambil dari App Store atau Google Play. Setelah masa uji coba, langganan diperpanjang otomatis. Kamu bisa membatalkannya di pengaturan langganan toko paling lambat 24 jam sebelum perpanjangan.',
                tr: 'Deneme süresi, sonrasındaki fiyat ve abonelik dönemi App Store veya Google Play’den alınır. Deneme süresinden sonra abonelik otomatik olarak yenilenir. Yenilemeden en az 24 saat önce mağazanın abonelik ayarlarından iptal edebilirsin.',
                pl: 'Okres próbny, cena po nim i okres subskrypcji pochodzą z App Store lub Google Play. Po okresie próbnym subskrypcja odnawia się automatycznie. Możesz ją anulować w ustawieniach subskrypcji sklepu najpóźniej 24 godziny przed odnowieniem.',
              } as Record<string, string>)[lang] ?? 'Пробный период, цена после него и период подписки берутся из App Store или Google Play. После пробного периода подписка продлевается автоматически. Отменить можно в настройках подписок магазина не позднее чем за 24 часа до продления.'}
            </Text>
          </OnboardingScroll>

          {showPlanFreeConfirm ? (
            <View style={styles.planFreeConfirmOverlay}>
              <View style={styles.planFreeConfirmBox}>
                <Text style={styles.planFreeConfirmTitle}>{triOb('Точно без плана?', 'Точно без плану?', '¿Sin plan?')}</Text>
                <Text style={styles.planFreeConfirmText}>
                  {triOb(
                    'Персональный план открыт в Plus. Остальное работает в полном доступе. Разбор слабых мест и маршрут под цель — с планом.',
                    'Персональний план відкрито в Plus. Решта працює у повному доступі. Аналіз слабких місць і маршрут під ціль — з планом.',
                    'El plan personal está en Plus. Todo lo demás funciona gratis. Análisis de puntos débiles y ruta a tu objetivo — con el plan.',
                  )}
                </Text>
                <View style={styles.planFreeConfirmActions}>
                  <DuoPressable style={styles.eliteWelcomeCta} edgeColor={theme.accentDeep} onPress={() => setShowPlanFreeConfirm(false)}>
                    <Text style={styles.eliteWelcomeCtaText}>{triOb('Оставить план', 'Залишити план', 'Mantener el plan')}</Text>
                  </DuoPressable>
                  <TouchableOpacity
                    style={styles.eliteWelcomeSecondaryCta}
                    activeOpacity={0.82}
                    onPress={() => {
                      void import('../app/analytics').then(({ trackEvent }) => trackEvent('onboarding_continue_free', { from: 'plan_paywall', ob_color: obColor }));
                      logOnboardingFunnel('close');
                      goToStep('name');
                    }}
                  >
                    <Text style={styles.eliteWelcomeSecondaryCtaText}>{triOb('Продолжить без плана', 'Продовжити без плану', 'Continuar sin plan')}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
          <PremiumCelebrationModal
            visible={purchaseCelebrationVisible}
            onClose={() => {
              setPurchaseCelebrationVisible(false);
              goToStep('name');
            }}
            variant="premium"
          />
        </>
      ),
      styles.eliteWelcomeRoot,
      true,
    );
  }

  if (step === 'planPicker') {
    return renderPlanFlowScreen(
      'onboarding-plan-picker-screen',
      triOb('Планы', 'Плани', 'Planes'),
      triOb('Выбери свой маршрут', 'Обери свій маршрут', 'Elige tu ruta'),
      triOb('Оставь рекомендованный план или выбери другой — под ближайшую цель.', 'Залиш рекомендований план або обери інший — під найближчу мету.', 'Deja el plan recomendado o elige otro, según tu objetivo más cercano.'),
      <View style={styles.planFlowStack}>
        {PLAN_ENTRIES.map((entry) => {
          const plan = PERSONAL_PLAN_ONBOARDING_PLANS[entry.key];
          return (
            <TouchableOpacity
              key={entry.key}
              style={[styles.planMockupPickerCard, selectedPlanId === entry.key && styles.planMockupPickerCardRecommended]}
              activeOpacity={0.84}
              onPress={() => {
                setSelectedPlanOverride(entry.key);
                goToStep('planDetails');
              }}
            >
              <OnboardingBundledImage
                source={plan.iconAsset}
                style={styles.planMockupPickerIcon}
              />
              <View style={styles.planFlowOptionCopy}>
                <Text style={styles.planMockupPickerTitle}>{localizedPlanName(plan)}</Text>
                <Text style={styles.planMockupPickerSub}>{localizedPlanShort(plan)}</Text>
                <Text style={styles.planMockupPickerMeta}>{localizedPlanHorizon(plan)} · {triOb('старт', 'старт', 'inicio')} {plan.recommendedLevel}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>,
    );
  }

  if (step === 'planDetails') {
    const entry = PLAN_ENTRIES.find((item) => item.key === selectedPlanId);
    return renderPlanResultLikeScreen({
      testID: 'onboarding-plan-details-screen',
      plan: selectedPlan,
      minutes: entry?.minutes ?? selectedPlan.minutesDefault,
      todayIconAsset: entry?.todayIconAsset ?? selectedPlan.todayIconAsset,
      actions: (
        <>
        <DuoPressable
          style={[styles.eliteWelcomeCta, styles.planMockupPrimaryButton]}
          edgeColor={theme.accentDeep}
          onPress={() => goToStep('planResult')}
        >
          <Text style={styles.planMockupPrimaryButtonText}>{triOb('Выбрать этот план', 'Обрати цей план', 'Elegir este plan')}</Text>
        </DuoPressable>
        <TouchableOpacity
          style={[styles.eliteWelcomeSecondaryCta, styles.planMockupSecondaryButton]}
          activeOpacity={0.82}
          onPress={() => goToStep('planPicker')}
        >
          <Text style={styles.planMockupSecondaryButtonText}>{triOb('Другие планы', 'Інші плани', 'Otros planes')}</Text>
        </TouchableOpacity>
        </>
      ),
    });
  }

  if (step === 'beta') {
    const betaItems =
      lang === 'es'
        ? [
            '📱 Completa algunas lecciones y prueba los botones',
            '🔍 Fíjate en errores y en lo que resulte incómodo',
            '📸 Haz una captura si algo va mal',
            '💬 Escríbeme por Telegram con la captura',
          ]
        : isUK
          ? [
              '📱 Пройди декілька уроків та перевір кнопки',
              '🔍 Зверни увагу на помилки та незручності',
              '📸 Зроби скріншот, якщо щось не так',
              '💬 Напиши мені в Telegram зі скріншотом',
            ]
          : [
              '📱 Пройди несколько уроков и проверь кнопки',
              '🔍 Обрати внимание на ошибки и неудобства',
              '📸 Сделай скриншот, если что-то не так',
              '💬 Напиши мне в Telegram со скриншотом',
            ];
    return renderScreen(
      'onboarding-beta-screen',
      ONBOARDING_BG_BETA,
      (
        <OnboardingScroll
          {...onboardingScrollProps}
          contentContainerStyle={{
            alignItems: 'center',
            paddingHorizontal: onboardingHPad,
            paddingTop: compactOnboarding ? 24 : 40,
            paddingBottom: (compactOnboarding ? 24 : 40) + insets.bottom,
          }}
        >
          <Text style={{ fontSize: 52, marginBottom: 16 }}>🧪</Text>
          <Text style={[styles.appName, { marginBottom: 24 }]}>
            {pick('Бета-тест', 'Бета-тест', 'Prueba beta')}
          </Text>

          <View style={{ backgroundColor: DARK.bgCard, borderRadius: 18, padding: 20, width: '100%', marginBottom: 28, borderWidth: 1, borderColor: DARK.border }}>
            <Text style={{ color: DARK.textPrimary, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'center' }}>
              {pick('🙏 Спасибо за участие!', '🙏 Дякуємо за участь!', '🙏 ¡Gracias por participar!')}
            </Text>
            <Text style={{ color: DARK.textMuted, fontSize: 14, lineHeight: 22, marginBottom: 16 }}>
              {pick(
                'Ты один из первых пользователей Phraseman. Твоя обратная связь напрямую влияет на продукт.',
                'Ти один з перших користувачів Phraseman. Твій зворотний зв\'язок напряму впливає на продукт.',
                'Eres de los primeros usuarios de Phraseman. Tus comentarios influyen de forma directa en la app.',
              )}
            </Text>

            <Text style={{ color: DARK.textPrimary, fontSize: 14, fontWeight: '600', marginBottom: 8 }}>
              {pick('Что нужно сделать:', 'Що треба зробити:', 'Qué tienes que hacer:')}
            </Text>
            {betaItems.map((item, i) => (
              <Text key={i} style={{ color: DARK.textMuted, fontSize: 13, lineHeight: 22, marginBottom: 4 }}>
                {item}
              </Text>
            ))}

            <View style={{ marginTop: 16, backgroundColor: DARK.bgSurface2, borderRadius: 10, padding: 12 }}>
              <Text style={{ color: DARK.textMuted, fontSize: 13, lineHeight: 20, textAlign: 'center' }}>
                {lang === 'es' ? (
                  <>
                    Todas las observaciones se revisan y se tienen en cuenta.{'\n'}
                    Por favor, no borres la app durante{'\n'}
                    <Text style={{ color: DARK.textPrimary, fontWeight: '700' }}>14 días</Text>
                    {' '}— si no, no podremos contar tu participación.
                  </>
                ) : isUK ? (
                  <>
                    Всі зауваження та пропозиції розглядаються й враховуються.{'\n'}
                    Будь ласка, не видаляй застосунок{'\n'}протягом <Text style={{ color: DARK.textPrimary, fontWeight: '700' }}>14 днів</Text> — інакше твоя участь не зарахується.
                  </>
                ) : (
                  <>
                    Все замечания и предложения рассматриваются и учитываются.{'\n'}
                    Пожалуйста, не удаляй приложение{'\n'}в течение <Text style={{ color: DARK.textPrimary, fontWeight: '700' }}>14 дней</Text> — иначе твоё участие не засчитается.
                  </>
                )}
              </Text>
            </View>
          </View>

          <DuoPressable
            testID="onboarding-beta-continue"
            style={[styles.continueBtn, { width: '100%' }]}
            edgeColor={theme.accentDeep}
            onPress={() => goToStep('demo2')}
          >
            <Text style={styles.continueBtnText}>{pick('Понятно 👍', 'Зрозуміло 👍', 'Entendido 👍')}</Text>
          </DuoPressable>
        </OnboardingScroll>
      ),
    );
  }

  if (step === 'welcome') {
    return renderScreen(
      'onboarding-welcome-disabled-screen',
      ONBOARDING_BG_WELCOME,
      <View />,
      styles.eliteWelcomeRoot,
      true,
    );
  }

  // ── Шаг 0: Welcome — главный оффер ─────────────────────────────────────────
  if (false && step === 'welcome') {
    if (USE_ELITE_ONBOARDING_WELCOME) {
      const heroY = welcomeIntro.interpolate({ inputRange: [0, 1], outputRange: [18, 0] });
      const heroScale = welcomeIntro.interpolate({ inputRange: [0, 1], outputRange: [0.98, 1] });
      const lingmanScale = lingmanPulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.105] });
      return renderScreen(
        'onboarding-welcome-screen',
        ONBOARDING_BG_WELCOME,
        (
          <>
            <Animated.View
              style={[
                styles.eliteWelcomeMain,
                { transform: [{ translateY: heroY }, { scale: heroScale }] },
              ]}
            >
              <Animated.View style={[styles.eliteWelcomeMark, { transform: [{ scale: lingmanScale }] }]}>
                <LinearGradient
                  colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.075)', theme.accentBgSoft]}
                  locations={[0, 0.46, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.eliteWelcomeMarkGlass}
                >
                  <View pointerEvents="none" style={styles.eliteWelcomeGlassShine} />
                  <OnboardingBundledImage
                    source={ONBOARDING_LINGMAN_ICON}
                    style={styles.eliteWelcomeMarkLogo}
                  />
                </LinearGradient>
              </Animated.View>
              <Text style={styles.eliteWelcomeTitle}>
                {triOb(
                  'Английский без лишнего шума',
                  'Англійська без зайвого шуму',
                  'Inglés sin ruido',
                )}
              </Text>
              <Text style={styles.eliteWelcomeSub}>
                {triOb(
                  'Короткая практика, спокойный ритм и понятный прогресс.',
                  'Коротка практика, спокійний ритм і зрозумілий прогрес.',
                  'Práctica breve, ritmo tranquilo y progreso claro.',
                )}
              </Text>
            </Animated.View>

            <View style={styles.eliteWelcomeBottom}>
              <DuoPressable
                testID="onboarding-welcome-continue"
                style={styles.eliteWelcomeCta}
                edgeColor={theme.accentDeep}
                onPress={() => goToStep('name')}
              >
                <Text style={styles.eliteWelcomeCtaText}>
                  {triOb('Начать', 'Почати', 'Empezar')}
                </Text>
              </DuoPressable>
              <Text style={styles.eliteWelcomeFootnote}>
                {triOb('Без регистрации. Сразу в дело.', 'Без реєстрації. Одразу до діла.', 'Sin registro. Al grano.')}
              </Text>
            </View>
          </>
        ),
        styles.eliteWelcomeRoot,
      );
    }
    return renderScreen(
      'onboarding-welcome-screen',
      ONBOARDING_BG_WELCOME,
      (
        <>
          <Text style={{ color: DARK.gold, fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32, textAlign: 'center' }}>
            Phraseman
          </Text>
          <Text style={{ color: DARK.textPrimary, fontSize: 30, fontWeight: '800', textAlign: 'center', lineHeight: 40, marginBottom: 16 }}>
            {triOb(
              '10 минут вместо скроллинга ленты.',
              '10 хвилин замість скролінгу стрічки.',
              'Diez minutos mejor invertidos que otro scroll.',
            )}
          </Text>
          <Text style={{ color: DARK.gold, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 36, marginBottom: 48 }}>
            {triOb(
              '+350 фраз уже к концу недели.',
              '+350 фраз вже до кінця тижня.',
              '+350 frases antes de terminar la semana.',
            )}
          </Text>
          <DuoPressable
            testID="onboarding-welcome-continue"
            style={[styles.continueBtn, { width: '100%' }]}
            edgeColor={theme.accentDeep}
            onPress={() => goToStep('name')}
          >
            <Text style={styles.continueBtnText}>
              {triOb('Попробовать →', 'Спробувати →', 'Probar ahora →')}
            </Text>
          </DuoPressable>
        </>
      ),
      { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
    );
  }

  // ── Шаг 2: Демо квиз — 4 варианта ──────────────────────────────────────────
  if (step === 'demo') {
    const demoPhrase = '"I\'m fed up with this job"';
    const demoQuestion = pick(
      'Что значит "fed up with"?',
      'Що означає "fed up with"?',
      '¿Qué significa «fed up with»?',
    );
    const demoOptions =
      lang === 'es'
        ? [
            'Estoy harto de este trabajo',
            'Estoy encantado con esta oferta',
            'Estoy hasta la coronilla de este almuerzo',
            'Me da miedo perder este puesto',
          ]
        : isUK
          ? [
              'Мене вже нудить від цієї роботи',
              'Я в захваті від цієї вакансії',
              'Я ситий по горло цим обідом',
              'Я боюся втратити це місце',
            ]
          : [
              'Меня уже тошнит от этой работы',
              'Я в восторге от этой вакансии',
              'Я сыт по горло этим обедом',
              'Я боюсь потерять это место',
            ];
    const correctIndex = 0;
    return renderScreen(
      'onboarding-demo-screen',
      ONBOARDING_BG_QUIZ,
      (
        <>
          {renderProgressBar()}
        <OnboardingScroll
          {...onboardingScrollProps}
          contentContainerStyle={[
            styles.center,
            {
              paddingTop: 0,
              flexGrow: 1,
              paddingHorizontal: onboardingHPad,
              paddingBottom: 24 + insets.bottom,
            },
          ]}
        >
          <Text style={[styles.appName, { marginBottom: 8 }]}>Phraseman</Text>
          <Text style={{ color: DARK.textMuted, fontSize: 14, marginBottom: 28, textAlign: 'center' }}>
            {pick(
              'Попробуй угадать фразу прямо сейчас',
              'Спробуй вгадати фразу прямо зараз',
              'Adivina qué significa la frase',
            )}
          </Text>
          <View style={{ backgroundColor: DARK.bgCard, borderRadius: 16, padding: 20, width: '100%', marginBottom: 24, borderWidth: 1, borderColor: DARK.border }}>
            <Text style={{ color: DARK.textMuted, fontSize: 12, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 1 }}>
              {demoQuestion}
            </Text>
            <Text style={{ color: theme.accent, fontSize: 22, fontWeight: '700', lineHeight: 30 }}>
              {demoPhrase}
            </Text>
          </View>
          <View style={{ width: '100%', gap: 10 }}>
            {demoOptions.map((opt, i) => {
              let borderColor: string = DARK.border;
              let bg = DARK.bgSurface;
              let textColor = DARK.textPrimary;
              let iconStroke = DARK.textGhost;
              if (demoAnswered) {
                if (i === correctIndex) {
                  borderColor = theme.accent; bg = theme.accentBg;
                  textColor = theme.accent; iconStroke = theme.accent;
                } else if (i === demoSelected) {
                  borderColor = '#FF453A'; bg = 'rgba(255,69,58,0.08)';
                  textColor = '#FF453A'; iconStroke = '#FF453A';
                } else {
                  borderColor = DARK.bgSurface2; bg = DARK.bgPrimary;
                  textColor = DARK.textGhost; iconStroke = DARK.textGhost;
                }
              }
              const iconShapes = ['○', '◇', '△', '□'];
              const DemoIcon = () => (
                <View style={{ width: 22, height: 22, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: iconStroke, fontSize: 16, lineHeight: 22 }}>{iconShapes[i] || '○'}</Text>
                </View>
              );
              return (
                <TouchableOpacity
                  testID={`onboarding-demo-option-${i}`}
                  key={i}
                  style={{ width: '100%', backgroundColor: bg, borderRadius: 14, padding: 16, borderWidth: 1.5, borderColor, flexDirection: 'row', alignItems: 'center', gap: 14 }}
                  onPress={() => {
                    if (demoAnswered) return;
                    setDemoSelected(i);
                    setDemoAnswered(true);
                    const correct = i === correctIndex;
                    setDemoCorrect(correct);
                    if (correct) playDemoCorrect();
                    animateBtn();
                  }}
                  activeOpacity={demoAnswered ? 1 : 0.8}
                >
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: demoAnswered && i === correctIndex ? theme.accentBg : demoAnswered && i === demoSelected ? 'rgba(255,69,58,0.15)' : DARK.bgSurface2, alignItems: 'center', justifyContent: 'center' }}>
                    <DemoIcon />
                  </View>
                  <Text style={{ color: textColor, fontSize: 16, fontWeight: '500', flex: 1 }}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          {demoAnswered && (
            <Animated.View style={{ width: '100%', marginTop: 24, opacity: btnFade, transform: [{ translateY: btnSlide }] }}>
              <TouchableOpacity
                testID="onboarding-demo-continue"
                style={[styles.continueBtn, { width: '100%' }]}
                onPress={() => goToStep('name')}
                activeOpacity={0.85}
              >
                <Text style={styles.continueBtnText}>
                  {demoCorrect
                    ? pick('🎉 Верно! Продолжить', '🎉 Вірно! Продовжити', '🎉 ¡Correcto! Continuar')
                    : pick('👀 Понял! Продолжить', '👀 Зрозуміло! Продовжити', '👀 ¡Entendido! Continuar')}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </OnboardingScroll>
        </>
      ),
    );
  }

  // ── Шаг 1: Демо1 — приветствие + сбор фразы ────────────────────────────────
  if (step === 'demo2') {
    const demo2Words = ['turn', 'Please', 'TV', 'off', 'the'];
    const demo2Answer = ['Please', 'turn', 'off', 'the', 'TV'];

    const currentPhrase = demo2Selected.map(idx => demo2Words[idx]);
    const shakeWord = (pos: number) => {
      const anim = demo2ShakeAnims[pos];
      anim.setValue(0);
      Animated.sequence([
        Animated.timing(anim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(anim, { toValue:  6, duration: 60, useNativeDriver: true }),
        Animated.timing(anim, { toValue: -4, duration: 50, useNativeDriver: true }),
        Animated.timing(anim, { toValue:  4, duration: 50, useNativeDriver: true }),
        Animated.timing(anim, { toValue:  0, duration: 40, useNativeDriver: true }),
      ]).start();
    };

    const handleWordTap = (wordIdx: number) => {
      if (demo2Answered) return;
      if (demo2Selected.includes(wordIdx)) {
        setDemo2Selected(demo2Selected.filter(i => i !== wordIdx));
      } else {
        const next = [...demo2Selected, wordIdx];
        setDemo2Selected(next);
        const pos = next.length - 1;
        const isWrongHere = demo2Words[wordIdx] !== demo2Answer[pos];
        if (isWrongHere) {
          setTimeout(() => shakeWord(pos), 50);
        }
        if (next.length === demo2Words.length) {
          const correct = next.every((idx, p) => demo2Words[idx] === demo2Answer[p]);
          setDemo2Answered(true);
          setDemo2Correct(correct);
          animateBtn();
        }
      }
    };

    return renderScreen(
      'onboarding-demo2-screen',
      ONBOARDING_BG_BUILDER,
      (
        <>
          {renderProgressBar()}
        <OnboardingScroll
          {...onboardingScrollProps}
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            paddingHorizontal: onboardingHPad,
            paddingTop: compactOnboarding ? 16 : 20,
            paddingBottom: (compactOnboarding ? 18 : 20) + insets.bottom,
          }}
        >
          {/* Приветствие */}
          <Animated.View style={{ opacity: demo2GreetFade, marginBottom: 28 }}>
            <Text style={{ color: DARK.gold, fontSize: 13, fontWeight: '700', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, textAlign: 'center' }}>
              Phraseman
            </Text>
            <Text style={{ color: DARK.textPrimary, fontSize: 26, fontWeight: '700', textAlign: 'center', lineHeight: 34 }}>
              {pick(
                'Учи английские\nфразы играя',
                'Вивчай англійські\nфрази граючи',
                'Aprende frases en inglés\njugando',
              )}
            </Text>
            <Text style={{ color: DARK.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, marginTop: 10 }}>
              {pick(
                'Здесь ты собираешь фразы, учишь идиомы\nи понимаешь живой английский',
                'Тут ти збираєш фрази, вчиш ідіоми\nта розумієш живу англійську',
                'Aquí formas frases, estudias modismos\ny entiendes el inglés de verdad',
              )}
            </Text>
          </Animated.View>

          {/* Подсказка-инструкция (fade-in с задержкой) */}
          <Animated.View style={{ opacity: demo2HintFade, marginBottom: 20 }}>
            <View style={{ backgroundColor: DARK.bgSurface, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: DARK.borderHighlight }}>
              <Text style={{ color: theme.accent, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
                {pick(
                  'Попробуй собрать фразу из этих слов:',
                  'Спробуй скласти фразу з цих слів:',
                  'Forma la frase con estas palabras:',
                )}
              </Text>
              <Text style={{ color: DARK.textGhost, fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                {pick(
                  'Пожалуйста, выключи телевизор',
                  'Будь ласка, вимкни телевізор',
                  'Por favor, apaga la televisión',
                )}
              </Text>
            </View>
          </Animated.View>

          {/* Сама игра (fade-in последним) */}
          <Animated.View style={{ opacity: demo2QuizFade }}>
            {/* Область ответа */}
            <View style={{ minHeight: 56, backgroundColor: DARK.bgPrimary, borderRadius: 14, borderWidth: 1.5, borderColor: demo2Answered ? (demo2Correct ? theme.accent : '#FF4444') : 'rgba(255,91,91,0.28)', padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {currentPhrase.length === 0
                ? <Text style={{ color: DARK.textGhost, fontSize: 15 }}>{pick('здесь появится фраза…', 'тут з\'явиться фраза…', 'aquí aparecerá la frase…')}</Text>
                : currentPhrase.map((w, pos) => {
                    const wordIdx = demo2Selected[pos];
                    const isWrong = !demo2Answered && demo2Words[wordIdx] !== demo2Answer[pos];
                    return (
                      <Animated.View key={pos} style={{ transform: [{ translateX: demo2ShakeAnims[pos] }] }}>
                        <TouchableOpacity
                          onPress={() => {
                            if (demo2Answered) return;
                            setDemo2Selected(demo2Selected.filter((_, i) => i !== pos));
                          }}
                          style={{
                            backgroundColor: isWrong ? 'rgba(255,69,58,0.15)' : DARK.bgSurface2,
                            borderRadius: 8,
                            paddingHorizontal: 12,
                            paddingVertical: 6,
                            borderWidth: isWrong ? 1 : 0,
                            borderColor: isWrong ? '#FF453A' : 'transparent',
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={{ color: isWrong ? '#FF453A' : DARK.textPrimary, fontSize: 16, fontWeight: '500' }}>{w}</Text>
                        </TouchableOpacity>
                      </Animated.View>
                    );
                  })
              }
            </View>

            {/* Доступные слова */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center', marginBottom: 24 }}>
              {demo2Words.map((w, idx) => {
                const used = demo2Selected.includes(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleWordTap(idx)}
                    activeOpacity={used ? 1 : 0.75}
                    style={{
                      backgroundColor: used ? DARK.bgPrimary : DARK.bgSurface2,
                      borderRadius: 10,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderWidth: 1.5,
                      borderColor: used ? DARK.border : 'rgba(255,91,91,0.28)',
                    }}
                  >
                    <Text style={{ color: used ? DARK.textGhost : DARK.textPrimary, fontSize: 16, fontWeight: '500' }}>{w}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Результат + кнопка */}
            {demo2Answered && (
              <Animated.View style={{ marginTop: 4, opacity: btnFade, transform: [{ translateY: btnSlide }] }}>
                <Text style={{ color: demo2Correct ? theme.accent : '#FF8888', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 16 }}>
                  {demo2Correct
                    ? pick('🎉 Отлично! Всё правильно!', '🎉 Відмінно! Усе вірно!', '🎉 ¡Genial! ¡Todo correcto!')
                    : `${pick('✅ Правильно: ', '✅ Правильно: ', '✅ Correcto: ')}${demo2Answer.join(' ')}`}
                </Text>
                <TouchableOpacity
                  style={[styles.continueBtn, { width: '100%' }]}
                  onPress={() => goToStep('demo')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.continueBtnText}>
                    {pick('Продолжить', 'Продовжити', 'Continuar')}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            {/* Кнопка пропустить — всегда видна если пользователь ещё не ответил */}
            {!demo2Answered && (
              <TouchableOpacity
                testID="onboarding-demo2-skip"
                style={{ marginTop: 20, alignSelf: 'center', padding: 12 }}
                onPress={() => goToStep('demo')}
                activeOpacity={0.7}
              >
                <Text style={{ color: DARK.textGhost, fontSize: 13 }}>
                  {pick('Пропустить →', 'Пропустити →', 'Omitir →')}
                </Text>
              </TouchableOpacity>
            )}
          </Animated.View>
        </OnboardingScroll>
        </>
      ),
    );
  }

  // ── Шаг 3: Имя ──────────────────────────────────────────────────────────────
  if (step === 'name') {
    const keyboardVisible = keyboardPad > 0;
    // Покупатель с уже подключённым планом видит контекст под заголовком;
    // обычный (бесплатный) онбординг — без подписи (пустая строка не рендерится).
    const nameBranchSubtitle = nicknameMode === 'personal_plan'
      ? pick(
          'Личный план подключён. Осталось подписать профиль.',
          'Особистий план підключено. Залишилось підписати профіль.',
          'Tu plan personal está listo. Solo falta nombrar el perfil.',
        )
      : '';
    const nameAvailabilityMatches = nameAvailability.value.trim().toLowerCase() === name.trim().toLowerCase();
    const nameAvailabilityStatus: OnboardingNameAvailabilityStatus = nameAvailabilityMatches
      ? nameAvailability.status
      : 'idle';
    const nameAvailabilityMessage = nameAvailabilityMatches ? nameAvailability.message : null;
    const nameHasBlockingStatus = nameAvailabilityStatus === 'checking' || nameAvailabilityStatus === 'taken';
    const nameHasErrorStatus = Boolean(nameFieldError) || nameAvailabilityStatus === 'taken' || nameAvailabilityStatus === 'error';
    const nameLiveStatusMessage = nameFieldError || nameAvailabilityMessage || '';
    const nameStatusVisible = Boolean(nameLiveStatusMessage);
    const nameContinueDisabled = nameBusy || nameHasBlockingStatus;
    return renderScreen(
      'onboarding-name-screen',
      ONBOARDING_BG_NAME,
      (
        <KeyboardAvoidingView
          style={styles.regularNameRoot}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <View style={styles.regularNameTop}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Назад"
              onPress={() => goToStep(getOnboardingPrevStep(step) ?? onboardingEntryStepRef.current)}
              activeOpacity={0.82}
              style={styles.regularNameBack}
            >
              <Text style={styles.planFlowBackGlyph}>‹</Text>
            </TouchableOpacity>
          </View>
          <OnboardingScroll
            style={styles.onboardingScroll}
            decelerationRate="normal"
            contentContainerStyle={[
              styles.regularNameScroll,
              {
                justifyContent: keyboardVisible ? 'flex-start' : 'center',
                paddingTop: keyboardVisible ? 16 : 34,
                paddingBottom: (keyboardVisible ? 34 : 70) + keyboardPad + insets.bottom,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.regularNameMark}>
              <LinearGradient
                colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.075)', theme.accentBgSoft]}
                locations={[0, 0.46, 1]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.regularNameMarkGlass}
              >
                <View pointerEvents="none" style={styles.eliteWelcomeGlassShine} />
                <OnboardingBundledImage
                  source={ONBOARDING_LINGMAN_ICON}
                  style={styles.regularNameMarkLogo}
                />
              </LinearGradient>
            </View>
            <Text style={styles.regularNameTitle} maxFontSizeMultiplier={1.08}>
              {pick('Как тебя зовут?', 'Як тебе звати?', '¿Cómo te llamas?')}
            </Text>
            {nameBranchSubtitle ? (
              <Text style={styles.regularNameSub} maxFontSizeMultiplier={1.08}>
                {nameBranchSubtitle}
              </Text>
            ) : null}
            <View
              style={[
                styles.regularNameInputFrame,
                nameAvailabilityStatus === 'available' && styles.regularNameInputFrameAvailable,
                nameHasErrorStatus && styles.regularNameInputFrameError,
                nameAvailabilityStatus === 'checking' && styles.regularNameInputFrameChecking,
              ]}
            >
              <View style={styles.regularNameInputShell}>
                <TextInput
                  testID="onboarding-name-input"
                  style={[
                    styles.regularNameInput,
                    styles.regularNameInputWithStatus,
                    nameAvailabilityStatus === 'available' && styles.regularNameInputAvailable,
                    nameHasErrorStatus && styles.regularNameInputError,
                    nameAvailabilityStatus === 'checking' && styles.regularNameInputChecking,
                  ]}
                  value={name}
                  onChangeText={(t) => {
                    setName(t);
                    if (nameFieldError) setNameFieldError(null);
                  }}
                  placeholder=""
                  placeholderTextColor={theme.accent2}
                  autoFocus={false}
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="username"
                  maxLength={20}
                  editable={!nameBusy}
                  returnKeyType="done"
                  // «ОК»/«Done» на клавиатуре ТОЛЬКО прячет клавиатуру (открывая
                  // кнопку «Продолжить»), но НЕ переходит дальше сам — переход
                  // только по явному нажатию кнопки. Раньше тут был handleNameDone,
                  // из-за чего онбординг проскакивал имя по нажатию «ОК».
                  blurOnSubmit
                  onSubmitEditing={() => Keyboard.dismiss()}
                  maxFontSizeMultiplier={1.08}
                />
                {nameAvailabilityStatus === 'checking' ? (
                  <View pointerEvents="none" style={styles.regularNameStatusIcon}>
                    <ActivityIndicator size="small" color={theme.accent2} />
                  </View>
                ) : nameAvailabilityStatus === 'available' ? (
                  <View pointerEvents="none" style={[styles.regularNameStatusIcon, styles.regularNameStatusIconAvailable]}>
                    <Ionicons name="checkmark" size={18} color="#06140d" />
                  </View>
                ) : nameHasErrorStatus ? (
                  <View pointerEvents="none" style={[styles.regularNameStatusIcon, styles.regularNameStatusIconError]}>
                    <Ionicons name="close" size={18} color="#3A0508" />
                  </View>
                ) : null}
              </View>
            </View>
            <Text
              style={[
                styles.regularNameStatusText,
                !nameStatusVisible && styles.regularNameStatusTextHidden,
                nameAvailabilityStatus === 'available' && styles.regularNameStatusTextAvailable,
                nameHasErrorStatus && styles.regularNameStatusTextError,
              ]}
              maxFontSizeMultiplier={1.08}
            >
              {nameLiveStatusMessage || ' '}
            </Text>
            <DuoPressable
              testID="onboarding-name-continue"
              style={[styles.eliteWelcomeCta, styles.regularNameCta, nameContinueDisabled && { opacity: 0.75 }]}
              edgeColor={theme.accentDeep}
              onPress={handleNameDone}
              disabled={nameContinueDisabled}
            >
              <Text style={styles.eliteWelcomeCtaText} maxFontSizeMultiplier={1.05}>
                {pick('Продолжить', 'Продовжити', 'Continuar')}
              </Text>
            </DuoPressable>
          </OnboardingScroll>
        </KeyboardAvoidingView>
      ),
      undefined,
      true,
    );
  }

  if (false) {
    const keyboardVisible = keyboardPad > 0;
    return renderScreen(
      undefined,
      ONBOARDING_BG_NAME,
      (
        <>
          {renderProgressBar()}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        >
          <OnboardingScroll
            style={styles.onboardingScroll}
            decelerationRate="normal"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: keyboardVisible ? 'flex-start' : 'center',
              alignItems: 'center',
              paddingHorizontal: onboardingHPad,
              paddingTop: keyboardVisible ? (compactOnboarding ? 10 : 18) : 24,
              paddingBottom: (keyboardVisible ? 44 : 24) + keyboardPad + insets.bottom,
            }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
            nestedScrollEnabled
            showsVerticalScrollIndicator
          >
            <Text style={[styles.appName, onboardingAppNameStyle]} maxFontSizeMultiplier={1.05}>Phraseman</Text>
            <Text style={[styles.title, onboardingTitleStyle]} maxFontSizeMultiplier={1.08}>
              {pick('Как тебя зовут?', 'Як тебе звати?', '¿Cómo te llamas?')}
            </Text>
            <Text
              maxFontSizeMultiplier={1.08}
              style={{
                color: DARK.textMuted,
                fontSize: scaleOnboarding(14, 12),
                textAlign: 'center',
                lineHeight: scaleOnboarding(22, 18),
                marginBottom: compactOnboarding ? 14 : 24,
                marginTop: compactOnboarding ? -2 : -8,
              }}
            >
              {pick(
                'Чтобы в таблице лидеров не висело «Неизвестный герой» 😅',
                'Щоб у таблиці лідерів не висіло «Невідомий герой» 😅',
                'Para que en la tabla no figure «Héroe desconocido» 😅',
              )}
            </Text>
            {nameFieldError ? (
              <Text
                style={{
                  color: '#FF8A8A',
                  fontSize: 14,
                  fontWeight: '600',
                  textAlign: 'center',
                  lineHeight: 20,
                  marginBottom: 10,
                  width: '100%',
                }}
                maxFontSizeMultiplier={1.08}
              >
                {nameFieldError}
              </Text>
            ) : null}
            <TextInput
              testID="onboarding-name-input"
              style={[styles.input, onboardingInputStyle]}
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (nameFieldError) setNameFieldError(null);
              }}
              placeholder={pick('Твоё имя...', 'Твоє ім\'я...', 'Tu nombre...')}
              placeholderTextColor={DARK.textGhost}
              autoFocus
              maxLength={20}
              editable={!nameBusy}
              returnKeyType="done"
              onSubmitEditing={handleNameDone}
              maxFontSizeMultiplier={1.08}
            />
            <TouchableOpacity
              testID="onboarding-name-continue"
              style={[styles.continueBtn, onboardingPrimaryButtonStyle, nameBusy && { opacity: 0.75 }]}
              onPress={handleNameDone}
              activeOpacity={0.85}
              disabled={nameBusy}
            >
              {false && nameBusy ? (
                <View />
              ) : (
                <Text style={[styles.continueBtnText, onboardingPrimaryButtonTextStyle]} maxFontSizeMultiplier={1.05}>
                  {pick('Продолжить', 'Продовжити', 'Continuar')}
                </Text>
              )}
            </TouchableOpacity>
          </OnboardingScroll>
        </KeyboardAvoidingView>
        </>
      ),
    );
  }

  // ── Шаг streak: Мотивация + прогресс ────────────────────────────────────────
  if (step === 'streak') {
    const streakMilestones: { label: string; icon: StreakMilestoneIconKind; reward: string }[] =
      lang === 'es'
        ? [
            { label: '3 días seguidos', icon: 'flame', reward: 'La costumbre empieza' },
            { label: '7 días seguidos', icon: 'bolt', reward: 'Ya tienes ritmo' },
            { label: '14 días seguidos', icon: 'gem', reward: 'Practicar se vuelve más fácil' },
            { label: '30 días seguidos', icon: 'crown', reward: 'Una racha fuerte' },
          ]
        : isUK
          ? [
              { label: '3 дні поспіль', icon: 'flame', reward: 'Звичка починається' },
              { label: '7 днів поспіль', icon: 'bolt', reward: 'У тебе вже є ритм' },
              { label: '14 днів поспіль', icon: 'gem', reward: 'Практикуватися легше' },
              { label: '30 днів поспіль', icon: 'crown', reward: 'Сильна серія' },
            ]
          : [
              { label: '3 дня подряд', icon: 'flame', reward: 'Хорошее начало' },
              { label: '7 дней подряд', icon: 'bolt', reward: 'Ты держишь темп' },
              { label: '14 дней подряд', icon: 'gem', reward: 'Становится проще' },
              { label: '30 дней подряд', icon: 'crown', reward: 'Сильная серия' },
            ];
    return renderScreen(
      'onboarding-streak-screen',
      ONBOARDING_BG_STREAK,
      (
        <>
          {renderProgressBar()}
        <OnboardingScroll
          {...onboardingScrollProps}
          contentContainerStyle={[
            styles.center,
            {
              flexGrow: 1,
              justifyContent: compactOnboarding ? 'flex-start' : 'center',
              paddingHorizontal: onboardingHPad,
              paddingTop: compactOnboarding ? 6 : 0,
              paddingBottom: (compactOnboarding ? 72 : 40) + insets.bottom,
            },
          ]}
        >
          <View style={[styles.streakHeroIconWrap, compactOnboarding && styles.streakHeroIconWrapCompact]}>
            <OnboardingStreakIcon kind="flame" size={streakHeroIconSize} hero styles={styles} />
          </View>
          <Text
            style={[styles.title, onboardingTitleStyle, { marginBottom: compactOnboarding ? 6 : 8 }]}
            maxFontSizeMultiplier={1.08}
          >
            {pick(
              'Каждый день — чуть лучше, чем вчера',
              'Щодня — і ти непереможний',
              'Cada día te hace invencible',
            )}
          </Text>
          <Text
            maxFontSizeMultiplier={1.08}
            style={{
              color: DARK.textMuted,
              fontSize: scaleOnboarding(14, 12),
              textAlign: 'center',
              lineHeight: scaleOnboarding(22, 18),
              marginBottom: compactOnboarding ? 14 : 28,
            }}
          >
            {pick(
              'Понемногу каждый день — и через месяц ты не узнаешь свой английский.',
              'Коротка практика щодня перетворюється на звичку.',
              'Una práctica corta cada día se convierte en hábito.',
            )}
          </Text>

          {/* Milestones */}
          <View style={{ width: '100%', gap: compactOnboarding ? 8 : 10, marginBottom: compactOnboarding ? 20 : 32 }}>
            {streakMilestones.map((m, i) => (
              <Animated.View
                key={m.label}
                style={{
                  opacity: milestoneAnims[i],
                  transform: [
                    { translateY: milestoneAnims[i].interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
                    { scale: milestoneAnims[i].interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
                  ],
                }}
              >
              <View style={[styles.onboardingGlassCard, compactOnboarding && styles.onboardingGlassCardCompact]}>
                <View
                  style={[
                    styles.streakMilestoneIconSlot,
                    {
                      width: Math.max(56, streakMilestoneIconSize + 12),
                      marginRight: compactOnboarding ? 8 : 12,
                    },
                  ]}
                >
                  <OnboardingStreakIcon kind={m.icon} size={streakMilestoneIconSize} styles={styles} />
                </View>
                <View style={styles.streakMilestoneTextWrap}>
                  <Text
                    style={[styles.streakMilestoneTitle, compactOnboarding && styles.streakMilestoneTextCompact]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1}
                  >
                    {m.label}
                  </Text>
                  <Text
                    style={[styles.streakMilestoneReward, compactOnboarding && styles.streakMilestoneTextCompact]}
                    numberOfLines={2}
                    maxFontSizeMultiplier={1}
                  >
                    {m.reward}
                  </Text>
                </View>
              </View>
              </Animated.View>
            ))}
          </View>

          <DuoPressable
            testID="onboarding-streak-continue"
            style={[styles.continueBtn, onboardingPrimaryButtonStyle, { width: '100%' }]}
            edgeColor={theme.accentDeep}
            onPress={() => goToStep('auth')}
          >
            <Text style={[styles.continueBtnText, onboardingPrimaryButtonTextStyle]} maxFontSizeMultiplier={1.05}>
              {pick('Поехали', 'Погнали', 'Vamos')}
            </Text>
          </DuoPressable>
        </OnboardingScroll>
        </>
      ),
    );
  }

  // ── Шаг auth: Сохрани прогресс через Google / Apple (опционально) ────────────
  if (step === 'auth') {
    return (
      <>
        {renderScreen(
          'onboarding-auth-screen',
          ONBOARDING_BG_AUTH,
          (
            <AuthOnboardingStep
              isUK={isUK}
              lang={lang}
              renderProgressBar={renderProgressBar}
              onComplete={handleFinishOnboarding}
              styles={styles}
              theme={theme}
            />
          ),
        )}
      </>
    );
  }

  // Fallback — не должен достигаться
  return null;
}

/**
 * Отдельный компонент шага auth: имеет свои useState/useEffect для проверки
 * доступности Google/Apple — нельзя просто inline в основной Onboarding,
 * потому что hooks могут идти только в одном порядке.
 */
function AuthOnboardingStep({
  isUK,
  lang,
  renderProgressBar,
  onComplete,
  styles,
  theme,
}: {
  isUK: boolean;
  lang: Lang;
  renderProgressBar: () => React.ReactNode;
  onComplete: () => Promise<void> | void;
  styles: OnboardingStyles;
  theme: OnboardingTheme;
}) {
  const authPick = (ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru;
  const [googleAvail, setGoogleAvail] = useState(false);
  const [appleAvail, setAppleAvail] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState<AuthProviderId | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const insets = useSafeAreaInsets();
  const { width: viewportW, height: viewportH, uiScale } = useScreen();
  const compactOnboarding = Math.min(viewportW, viewportH) < 380 || viewportH < 740;
  const authScale = Math.min(1, Math.max(0.74, uiScale * (viewportH < 740 ? 0.94 : 1)));
  const scaleAuth = (value: number, min = 0) => Math.max(min, Math.round(value * authScale));
  const onboardingHPad = compactOnboarding ? 18 : 28;

  useEffect(() => {
    isGoogleSignInAvailable().then(setGoogleAvail).catch(() => setGoogleAvail(false));
    isAppleSignInAvailable().then(setAppleAvail).catch(() => setAppleAvail(false));
  }, []);

  const handleSignIn = async (provider: AuthProviderId) => {
    setLoadingProvider(provider);
    try {
      // H-ENTER: общий таймаут на весь вход. Если сеть оборвалась сразу после выбора
      // аккаунта, внутренние Firestore-await могли бы висеть вечно → loadingProvider
      // не сбрасывался → interactionLocked запирал И кнопки входа, И «Позже».
      // Гонка с дедлайном гарантирует, что промис всегда завершится за конечное время,
      // а finally ниже всегда снимет блокировку кнопок.
      const result = await Promise.race([
        signInWithProvider(provider),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('signin_deadline-exceeded')), SIGN_IN_OVERALL_TIMEOUT_MS),
        ),
      ]);
      if (result.result === 'cancelled') {
        AppInfoDialog.alert(
          authPick('Вход не завершён', 'Вхід не завершено', 'Acceso sin terminar'),
          authPick(
            'Окно входа закрылось. Можно пропустить шаг или нажать кнопку ещё раз.',
            'Вікно входу закрилось. Можна пропустити крок або натиснути ще раз.',
            'Se cerró la ventana de acceso. Puedes omitir el paso o intentar otra vez.',
          ),
        );
        return;
      }
      if (result.result === 'error') {
        if (result.error?.includes(APPLE_ANDROID_MISSING_SERVICE_ID)) {
          AppInfoDialog.alert(
            authPick('Apple на Android', 'Apple на Android', 'Apple en Android'),
            authPick(
              'Задай в сборке EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID (Services ID) и return URL в Apple Developer (часто phraseman://apple-auth).',
              'Задай у збірці EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID (Services ID) і return URL у Apple Developer (часто phraseman://apple-auth).',
              'Configura EXPO_PUBLIC_APPLE_ANDROID_SERVICE_ID (Services ID) y el return URL en Apple Developer (a menudo phraseman://apple-auth).',
            ),
          );
          return;
        }
        // Человеческое сообщение для известных кодов ошибок.
        const err = result.error ?? '';
        const isNetwork =
          err.includes('deadline-exceeded') ||
          err.includes('ssl') ||
          err.includes('I/O error') ||
          err.includes('network') ||
          err.includes('NETWORK_ERROR');
        const body = isNetwork
          ? authPick(
              'Проблема с сетью. Проверь интернет и попробуй ещё раз.',
              'Проблема з мережею. Перевір інтернет і спробуй ще раз.',
              'Problema de red. Comprueba Internet e inténtalo otra vez.',
            )
          : authPick('Попробуй ещё раз или пропусти шаг.', 'Спробуй ще раз або пропусти крок.', 'Inténtalo otra vez u omite el paso.');
        AppInfoDialog.alert(
          authPick('Вход не получился', 'Не вдалося увійти', 'No se pudo iniciar sesión'),
          body,
        );
        return;
      }
      // Помечаем что промпт показывали — чтобы lesson_complete не показал повторно.
      await AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(() => {});
      await onComplete();
    } catch {
      // Сюда попадает в т.ч. срабатывание общего таймаута (signin_deadline-exceeded).
      // Показываем человеческое сообщение про сеть — экран остаётся рабочим, можно
      // повторить или пропустить шаг.
      AppInfoDialog.alert(
        authPick('Вход не получился', 'Не вдалося увійти', 'No se pudo iniciar sesión'),
        authPick(
          'Проблема с сетью. Проверь интернет и попробуй ещё раз или пропусти шаг.',
          'Проблема з мережею. Перевір інтернет і спробуй ще раз або пропусти крок.',
          'Problema de red. Comprueba Internet e inténtalo otra vez u omite el paso.',
        ),
      );
    } finally {
      // H-ENTER: блокировка кнопок (включая «Позже») снимается ВСЕГДА.
      setLoadingProvider(null);
    }
  };

  const handleLater = async () => {
    if (authBusy || loadingProvider) return;
    setAuthBusy(true);
    try {
      await onComplete();
    } finally {
      setAuthBusy(false);
    }
  };

  const interactionLocked = loadingProvider !== null || authBusy;

  return (
    <>
      {renderProgressBar()}
        <OnboardingScroll
          style={styles.onboardingScroll}
          decelerationRate="normal"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          contentContainerStyle={[
            styles.center,
            {
              flexGrow: 1,
              justifyContent: compactOnboarding ? 'flex-start' : 'center',
              paddingHorizontal: onboardingHPad,
              paddingTop: compactOnboarding ? 10 : 0,
              paddingBottom: (compactOnboarding ? 72 : 40) + insets.bottom,
            },
          ]}
        >
          <OnboardingBundledImage
            source={ONBOARDING_AUTH_ICON}
            style={[
              styles.authQuickStartIcon,
              {
                width: scaleAuth(132, 94),
                height: scaleAuth(132, 94),
                marginBottom: compactOnboarding ? 8 : 12,
              },
            ]}
            accessible={false}
          />
          <Text
            style={[
              styles.title,
              {
                fontSize: scaleAuth(24, 20),
                lineHeight: scaleAuth(34, 28),
                marginBottom: 8,
              },
            ]}
            maxFontSizeMultiplier={1.08}
          >
            {authPick('Сохрани свой путь', 'Збережи свій шлях', 'Guarda tu camino')}
          </Text>
          <Text
            maxFontSizeMultiplier={1.08}
            style={{
              color: theme.textMuted,
              fontSize: scaleAuth(14, 12),
              textAlign: 'center',
              lineHeight: scaleAuth(22, 18),
              marginBottom: compactOnboarding ? 18 : 28,
              fontWeight: '700',
            }}
          >
            {authPick(
              'Можно пропустить. А если привяжешь аккаунт — твой путь будет с тобой на любом телефоне.',
              'Можна продовжити без входу, але якщо видалити застосунок без привʼязки акаунта, прогрес може загубитися. Привʼязати акаунт можна пізніше в налаштуваннях.',
              'Puedes seguir sin iniciar sesión, pero si eliminas la app sin vincular tu cuenta, podrías perder el progreso. Puedes vincularla más tarde en Ajustes.',
            )}
          </Text>

          <View style={{ width: '100%', marginBottom: 12 }}>
            {googleAvail && (
              <GoogleSignInButton
                onPress={() => handleSignIn('google')}
                loading={loadingProvider === 'google'}
                disabled={interactionLocked}
                label={authPick('Войти через Google', 'Війти з Google', 'Continuar con Google')}
                variant="light"
              />
            )}
            {appleAvail && (
              <View style={{ marginTop: googleAvail ? 12 : 0 }}>
                <AppleSignInButton
                  onPress={() => handleSignIn('apple')}
                  loading={loadingProvider === 'apple'}
                  disabled={interactionLocked}
                  label={authPick('Войти через Apple', 'Війти з Apple', 'Continuar con Apple')}
                />
              </View>
            )}
          </View>

          {!googleAvail && !appleAvail && (
            <Text style={{ color: DARK.textMuted, fontSize: 12, textAlign: 'center', marginVertical: 12 }}>
              {authPick(
                'Ни один провайдер не доступен на этом устройстве. Можно войти позже из настроек.',
                'Жоден провайдер не доступний на цьому пристрої. Можеш увійти пізніше з налаштувань.',
                'Ningún método disponible en este dispositivo. Podrás iniciar sesión más tarde desde Ajustes.',
              )}
            </Text>
          )}

          <TouchableOpacity
            testID="onboarding-auth-later"
            onPress={handleLater}
            disabled={interactionLocked}
            style={{ paddingVertical: 14, marginTop: 8 }}
            activeOpacity={0.7}
          >
            {false && authBusy ? (
              <View />
            ) : (
              <Text style={{ color: DARK.textMuted, fontSize: 15, fontWeight: '500', textAlign: 'center' }}>
                {authPick('Позже', 'Пізніше', 'Más tarde')}
              </Text>
            )}
          </TouchableOpacity>

          <Text style={{ color: DARK.textGhost ?? '#666', fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 12, paddingHorizontal: 12 }}>
            {authPick(
              'Твой email остаётся у тебя — никакого спама.',
              'Ми не публікуємо ваш email і не надсилаємо спам.',
              'No publicamos tu correo ni enviamos spam.',
            )}
          </Text>
        </OnboardingScroll>
    </>
  );
}

function OnboardingScreenShell({
  testID,
  screenFade,
  contentStyle,
  hideClose = false,
  onClose,
  styles,
  theme,
  source,
  children,
}: {
  testID?: string;
  screenFade: Animated.Value;
  contentStyle?: StyleProp<ViewStyle>;
  hideClose?: boolean;
  onClose: () => void | Promise<void>;
  styles: OnboardingStyles;
  theme: OnboardingTheme;
  source?: ImageSourcePropType | null;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const closeTop = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + 8;
  return (
    <SafeAreaView edges={[]} style={styles.container} testID={testID}>
      <OnboardingArtBackground source={source} motion="zoomOut" styles={styles} theme={theme} />
      <Animated.View style={[styles.onboardingContentLayer, contentStyle, { opacity: screenFade }]}>
        {children}
      </Animated.View>
      {!hideClose ? (
        <TouchableOpacity
          testID="onboarding-close"
          accessibilityRole="button"
          accessibilityLabel="Закрыть онбординг"
          onPress={onClose}
          activeOpacity={0.76}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          style={[styles.onboardingCloseButton, { top: closeTop }]}
        >
          <Ionicons name="close" size={18} color="#9A9A9A" />
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

function OnboardingStreakIcon({
  kind,
  size = 52,
  hero = false,
  styles,
}: {
  kind: StreakMilestoneIconKind;
  size?: number;
  hero?: boolean;
  styles: OnboardingStyles;
}) {
  return (
    <View
      style={[
        styles.streakIconShadow,
        hero && styles.streakHeroIconShadow,
        { width: size, height: size },
      ]}
    >
      <OnboardingBundledImage
        source={ONBOARDING_STREAK_ICONS[kind]}
        style={{ width: size, height: size }}
      />
    </View>
  );
}

export default memo(Onboarding);

const makeOnboardingStyles = (t: OnboardingTheme) => StyleSheet.create({
  container:       { flex: 1, backgroundColor: t.bgEdge, overflow: 'hidden' },
  onboardingContentLayer: { flex: 1 },
  onboardingScroll: { flex: 1 },
  center:          { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  appName:         { color: t.accent, fontSize: 15, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  title:           { color: t.textPrimary, fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 40, lineHeight: 34 },
  authQuickStartIcon: {
    width: 132,
    height: 132,
    marginBottom: 12,
  },
  progressWrap: {
    paddingTop: 0,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 4,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 999,
    overflow: 'hidden',
  },
  progressFill: {
    height: 5,
    backgroundColor: t.accent,
    borderRadius: 999,
  },
  onboardingCloseButton: {
    position: 'absolute',
    right: 14,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
  },
  onboardingBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#020304',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onboardingBgDim: {
    ...StyleSheet.absoluteFillObject,
  },
  onboardingBgImageStack: {
    ...StyleSheet.absoluteFillObject,
    opacity: 1,
  },
  onboardingBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  onboardingParticleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  onboardingParticle: {
    position: 'absolute',
    backgroundColor: t.accent,
  },
  onboardingGlassCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    minHeight: 92,
    position: 'relative',
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.18)',
    backgroundColor: 'rgba(20,18,15,0.50)',
  },
  onboardingGlassCardCompact: {
    minHeight: 68,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  streakMilestoneIconSlot: {
    flexShrink: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  streakMilestoneTextWrap: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
  },
  streakMilestoneTitle: {
    color: t.accent,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 4,
    textAlign: 'center',
  },
  streakMilestoneTextCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  streakMilestoneReward: {
    color: t.textMuted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  streakHeroIconWrap: {
    marginBottom: 12,
  },
  streakHeroIconWrapCompact: {
    marginBottom: 6,
  },
  streakIconShadow: {
  },
  streakHeroIconShadow: {
  },
  regularNameRoot: {
    flex: 1,
    paddingHorizontal: 21,
    paddingTop: 54,
    paddingBottom: 0,
  },
  regularNameTop: {
    width: '100%',
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  regularNameBack: {
    width: 44,
    height: 44,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  regularNameBrand: {
    color: t.accent2,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.9,
    textTransform: 'uppercase',
  },
  regularNameScroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  regularNameMark: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 29,
    shadowColor: t.accent,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  regularNameMarkGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    backgroundColor: 'rgba(255,255,255,0.10)',
  },
  regularNameMarkLogo: {
    width: 86,
    height: 66,
  },
  regularNameTitle: {
    width: '100%',
    color: t.textPrimary,
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 17,
  },
  regularNameSub: {
    width: '100%',
    maxWidth: 338,
    color: t.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 18,
  },
  regularNameError: {
    width: '100%',
    color: '#FF8A8A',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  regularNameInputFrame: {
    width: '100%',
    minHeight: 80,
    padding: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(15,19,27,0.82)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.20)',
    marginBottom: 8,
  },
  regularNameInputFrameChecking: {
    borderColor: t.accentBorderSoft,
  },
  regularNameInputFrameAvailable: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.12)',
  },
  regularNameInputFrameError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255,107,107,0.10)',
  },
  regularNameInputShell: {
    width: '100%',
    minHeight: 48,
    justifyContent: 'center',
    position: 'relative',
  },
  regularNameInput: {
    width: '100%',
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.accentBorder,
    borderStyle: 'dashed',
    backgroundColor: t.accentBg,
    color: t.accent2,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  regularNameInputWithStatus: {
    paddingLeft: 46,
    paddingRight: 46,
  },
  regularNameInputChecking: {
    borderColor: t.accentBorderSoft,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  regularNameInputAvailable: {
    borderColor: '#22C55E',
    backgroundColor: 'rgba(34,197,94,0.16)',
    color: '#5BE9A6',
  },
  regularNameInputError: {
    borderColor: '#FF6B6B',
    backgroundColor: 'rgba(255,107,107,0.12)',
    color: '#FF9A9A',
  },
  regularNameStatusIcon: {
    position: 'absolute',
    right: 12,
    top: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regularNameStatusIconAvailable: {
    backgroundColor: '#22C55E',
  },
  regularNameStatusIconError: {
    backgroundColor: '#FF6B6B',
  },
  regularNameStatusText: {
    width: '100%',
    minHeight: 34,
    color: t.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 14,
    paddingHorizontal: 8,
  },
  regularNameStatusTextHidden: {
    opacity: 0,
  },
  regularNameStatusTextAvailable: {
    color: '#5BE9A6',
  },
  regularNameStatusTextError: {
    color: '#FF8A8A',
  },
  regularNameCta: {
    minHeight: 56,
    borderRadius: 8,
  },
  planEntryRoot: {
    flex: 1,
    paddingHorizontal: 22,
    paddingBottom: 44,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  planEntryBrand: {
    height: 42,
    color: t.accent2,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.9,
    textTransform: 'uppercase',
    textAlignVertical: 'center',
  },
  planEntryMain: {
    flex: 1,
    width: '100%',
    alignItems: 'stretch',
    justifyContent: 'center',
  },
  planEntryMark: {
    width: 112,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 18,
    marginBottom: 10,
  },
  planEntryMarkGlass: {
    borderColor: 'rgba(255,255,255,0.17)',
  },
  planEntryMarkLogo: {
    width: 86,
    height: 86,
  },
  planEntryTitle: {
    fontSize: 31,
    lineHeight: 35,
    textAlign: 'center',
    marginBottom: 16,
  },
  planEntrySub: {
    alignSelf: 'center',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 360,
  },
  planEntryCtas: {
    width: '100%',
    maxWidth: 360,
    alignSelf: 'center',
    gap: 10,
    marginTop: 30,
  },
  planEntryCta: {
    minHeight: 54,
    paddingVertical: 13,
  },
  planEntryCtaText: {
    fontSize: 16,
    lineHeight: 20,
  },
  planEntrySecondaryCta: {
    minHeight: 54,
    paddingVertical: 13,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor: 'rgba(255,255,255,0.16)',
  },
  planEntrySecondaryCtaText: {
    color: t.textPrimary,
    fontSize: 16,
    lineHeight: 20,
  },
  eliteWelcomeRoot: {
    flex: 1,
    paddingHorizontal: 35,
    paddingTop: 70,
    paddingBottom: 36,
    justifyContent: 'flex-start',
    overflow: 'hidden',
  },
  eliteWelcomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  eliteWelcomeLogo: {
    width: 34,
    height: 34,
  },
  eliteWelcomeBrand: {
    color: t.accent2,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  eliteWelcomeMain: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    justifyContent: 'center',
    flex: 1,
    marginTop: 0,
    paddingHorizontal: 0,
  },
  eliteWelcomeMark: {
    width: 114,
    height: 114,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 30,
  },
  eliteWelcomeMarkGlass: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.28)',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  eliteWelcomeGlassShine: {
    position: 'absolute',
    top: 10,
    left: 16,
    right: 16,
    height: 42,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.13)',
    opacity: 0.62,
  },
  eliteWelcomeMarkLogo: {
    width: 88,
    height: 68,
  },
  eliteHeroPreview: {
    width: '100%',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.045)',
  },
  eliteHeroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  eliteHeroKicker: {
    color: DARK.gold,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  eliteHeroXp: {
    color: DARK.textPrimary,
    fontSize: 12,
    fontWeight: '900',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  eliteHeroPhrase: {
    color: DARK.textPrimary,
    fontSize: 23,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 8,
  },
  eliteHeroTranslation: {
    color: DARK.textMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 18,
  },
  eliteHeroMetrics: {
    flexDirection: 'row',
    gap: 8,
  },
  eliteMetricPill: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  eliteMetricValue: {
    color: DARK.textPrimary,
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 2,
  },
  eliteMetricLabel: {
    color: DARK.textGhost,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  eliteWelcomeCopy: {
    alignItems: 'flex-start',
    paddingHorizontal: 0,
  },
  eliteWelcomeTitle: {
    width: '100%',
    color: t.textPrimary,
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'left',
    marginBottom: 16,
  },
  eliteWelcomeSub: {
    width: '100%',
    color: t.textMuted,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'left',
    maxWidth: 330,
  },
  eliteWelcomeBottom: {
    width: '100%',
    gap: 12,
  },
  eliteWelcomeButtonGap: {
    height: 10,
  },
  eliteWelcomeCta: {
    width: '100%',
    minHeight: 56,
    backgroundColor: t.accent,
    paddingVertical: 17,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.38)',
  },
  eliteWelcomeCtaText: {
    color: t.ctaText,
    fontSize: 18,
    fontWeight: '900',
  },
  eliteWelcomeSecondaryCta: {
    width: '100%',
    minHeight: 54,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.22)',
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  eliteWelcomeSecondaryCtaText: {
    color: t.textMuted,
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  eliteWelcomeFootnote: {
    color: DARK.textGhost,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
  },
  langBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center',
    backgroundColor: DARK.bgCard, borderRadius: 14, padding: 20,
    marginBottom: 16, borderWidth: 1, borderColor: DARK.border,
  },
  langFlag:        { fontSize: 32, marginRight: 16 },
  langLabel:       { color: DARK.textPrimary, fontSize: 20, fontWeight: '500' },
  input: {
    width: '100%',
    backgroundColor: 'rgba(18,16,13,0.62)',
    color: t.textPrimary,
    fontSize: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.22)',
    marginBottom: 24,
  },
  continueBtn: {
    width: '100%',
    backgroundColor: t.accent,
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.36)',
  },
  continueBtnText: { color: t.ctaText, fontSize: 18, fontWeight: '900' },
  langHint:        { color: DARK.textGhost, fontSize: 14, fontWeight: '500', letterSpacing: 0.5, marginBottom: 32 },
  // Premium step
  premiumScroll:   { padding: 24, paddingBottom: 40, alignItems: 'center' },
  trialBadge:      { backgroundColor: DARK.accent, color: DARK.correctText, fontWeight: '900', fontSize: 13, letterSpacing: 1.5, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginBottom: 20, overflow: 'hidden' },
  premiumTitle:    { color: DARK.textPrimary, fontSize: 32, fontWeight: '900', textAlign: 'center', marginBottom: 10 },
  premiumSub:      { color: DARK.textMuted, fontSize: 15, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  featuresBox:     { width: '100%', backgroundColor: DARK.bgCard, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: DARK.border, gap: 14, marginBottom: 20 },
  featureRow:      { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon:     { fontSize: 22, width: 30, textAlign: 'center' },
  featureText:     { color: DARK.textOnCard, fontSize: 16, fontWeight: '500' },
  planCard: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DARK.accent, borderRadius: 16, padding: 18, marginBottom: 12,
  },
  planCardSecondary: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: DARK.bgCard, borderRadius: 16, padding: 18, marginBottom: 20,
    borderWidth: 1.5, borderColor: DARK.accent,
  },
  planCardLeft:    { flex: 1, marginRight: 12 },
  planBadge:       { color: DARK.correctText, fontSize: 11, fontWeight: '800', marginBottom: 4 },
  planCardTitle:   { color: DARK.correctText, fontSize: 16, fontWeight: '800', marginBottom: 2 },
  planCardSub:     { color: DARK.correctText, fontSize: 12, fontWeight: '500' },
  planCardCta:     { color: DARK.correctText, fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 18 },
  planCardCtaSecondary: { color: DARK.accent, fontSize: 13, fontWeight: '900', textAlign: 'center', lineHeight: 18 },
  // secondary card text overrides
  freeBtn:         { width: '100%', padding: 14, alignItems: 'center', marginBottom: 16 },
  freeBtnText:     { color: DARK.textGhost, fontSize: 14, fontWeight: '500' },
  legal:           { color: DARK.textGhost, fontSize: 11, textAlign: 'center', lineHeight: 16 },
  // Новые стили для расширенного онбординга
  optionButton: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.bgCard,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: DARK.border,
    gap: 14,
  },
  optionButtonSelected: {
    backgroundColor: DARK.correctBg,
    borderColor: DARK.accent,
  },
  optionEmoji: {
    fontSize: 28,
    width: 40,
    textAlign: 'center',
  },
  optionLabel: {
    color: DARK.textMuted,
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  optionLabelSelected: {
    color: DARK.accent,
    fontWeight: '700',
  },
  planBox: {
    backgroundColor: DARK.bgCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  forecastRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  forecastLabel: {
    color: DARK.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  forecastValue: {
    color: DARK.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  notificationToggle: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: DARK.bgCard,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: DARK.border,
  },
  planFlowShell: {
    flex: 1,
    paddingHorizontal: 26,
    paddingTop: 54,
    paddingBottom: 34,
  },
  planFlowScroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: 28,
  },
  planFlowTop: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginBottom: 0,
  },
  planMockupTop: {
    width: '100%',
    minHeight: 70,
    paddingTop: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  planMockupBrand: {
    marginLeft: 'auto',
    color: t.accent2,
    fontSize: 12,
    lineHeight: 14,
    fontWeight: '900',
    letterSpacing: 1.9,
    textTransform: 'uppercase',
  },
  planFlowBack: {
    position: 'absolute',
    left: 0,
    width: 44,
    height: 44,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  planFlowBackGlyph: {
    color: t.accent2,
    fontSize: 42,
    lineHeight: 44,
    fontWeight: '900',
  },
  planFlowProgressSegments: {
    width: 236,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  planFlowProgressSegment: {
    flex: 1,
    height: 5,
    maxWidth: 34,
    borderRadius: 999,
    backgroundColor: 'rgba(255,248,232,0.18)',
    overflow: 'hidden',
  },
  planFlowProgressSegmentActive: {
    backgroundColor: t.accent,
  },
  planFlowProgressSegmentFill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 999,
  },
  planFlowQuestionBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  planFlowTitle: {
    color: t.textPrimary,
    fontSize: 38,
    lineHeight: 45,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  planFlowLead: {
    color: t.textMuted,
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
    maxWidth: 340,
  },
  planFlowStack: {
    width: '100%',
    gap: 14,
  },
  planMockupResultScroll: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 44,
  },
  planMockupResultBody: {
    zIndex: 1,
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingTop: 42,
    gap: 8,
  },
  planMockupResultTitle: {
    margin: 0,
    color: t.textPrimary,
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '900',
    textAlign: 'center',
  },
  planMockupPitchCard: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: t.accentBg,
    borderWidth: 1,
    borderColor: t.accentBorder,
  },
  planMockupPitchText: {
    color: t.textPrimary,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '800',
  },
  planMockupDaysCard: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(12,15,21,0.68)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  planMockupDaysTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  planMockupDaysLabel: {
    color: t.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  planMockupDaysValueWrap: {
    width: 122,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  planMockupDaysValue: {
    minWidth: 58,
    textAlign: 'right',
    color: t.accent2,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textShadowColor: 'rgba(255,212,114,0.42)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  planMockupDaysWord: {
    marginLeft: 4,
    paddingBottom: 1,
    width: 30,
    color: t.accent2,
    fontSize: 11,
    lineHeight: 12,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  planMockupDaysTrack: {
    height: 9,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.13)',
    overflow: 'hidden',
  },
  planMockupDaysFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    transformOrigin: 'left center',
  },
  planMockupDaysFillGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  planFlowBottomStack: {
    width: '100%',
    gap: 12,
    marginTop: 'auto',
  },
  planFlowOption: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 88,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(12,16,22,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.15)',
  },
  planFlowOptionSelected: {
    borderColor: t.accentBorder,
    backgroundColor: t.accentBg,
  },
  planMockupPickerCard: {
    width: '100%',
    minHeight: 82,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    backgroundColor: 'rgba(14,18,25,0.74)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.13)',
  },
  planMockupPickerCardRecommended: {
    backgroundColor: t.accentBg,
    borderColor: t.accentBorder,
  },
  planMockupPickerIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
  },
  planMockupPickerTitle: {
    color: t.textPrimary,
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
  },
  planMockupPickerSub: {
    marginTop: 4,
    color: t.textMuted,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  planMockupPickerMeta: {
    marginTop: 5,
    color: t.accent2,
    fontSize: 10,
    lineHeight: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  planFlowIconSlot: {
    width: 68,
    height: 68,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planFlowIconSlotSmall: {
    width: 58,
    height: 58,
  },
  planFlowBitmapIcon: {
    width: 66,
    height: 66,
  },
  planFlowBitmapIconSmall: {
    width: 56,
    height: 56,
  },
  planFlowIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accentBg,
    borderWidth: 1,
    borderColor: t.accentBorder,
  },
  planFlowLevelBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accentBg,
    borderWidth: 1,
    borderColor: t.accentBorder,
  },
  planFlowLevelBadgeText: {
    color: t.accent,
    fontSize: 16,
    fontWeight: '900',
  },
  planFlowOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  planFlowOptionTitle: {
    color: t.textPrimary,
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  planFlowOptionSub: {
    color: t.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  planFlowCheckmark: {
    width: 22,
    color: t.accent,
    fontSize: 20,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  planMockupRowsPanel: {
    width: '100%',
    borderRadius: 8,
    padding: 15,
    gap: 9,
    backgroundColor: 'rgba(16,20,28,0.76)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  planMockupRow: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 9,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.11)',
  },
  planMockupRowIcon: {
    width: 52,
    height: 52,
    flexShrink: 0,
    borderRadius: 8,
  },
  planMockupRowTitle: {
    margin: 0,
    color: t.textPrimary,
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  planMockupRowSub: {
    marginTop: 3,
    color: t.textMuted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  planMockupResultHero: {
    width: '100%',
    borderRadius: 8,
    padding: 16,
    backgroundColor: t.accentBg,
    borderWidth: 1,
    borderColor: t.accentBorder,
  },
  planMockupBigNum: {
    color: t.accent2,
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '900',
  },
  planMockupHeroSub: {
    marginTop: 4,
    color: t.textMuted,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  planMockupCtaStack: {
    width: '100%',
    gap: 10,
    marginTop: 2,
  },
  planMockupPrimaryButton: {
    minHeight: 54,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: t.accent,
  },
  planMockupPrimaryButtonText: {
    color: t.ctaText,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  planMockupSecondaryButton: {
    minHeight: 54,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  planMockupSecondaryButtonText: {
    color: t.textPrimary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  planMockupGhostButton: {
    minHeight: 54,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planPaywallScroll: {
    flexGrow: 1,
    paddingTop: 12,
    paddingBottom: 24,
    paddingHorizontal: 0,
    gap: 8,
  },
  planPaywallTop: {
    width: '100%',
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  planPaywallBrand: {
    color: t.accent,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  planPaywallTitle: {
    color: t.textPrimary,
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
  },
  planPaywallLead: {
    color: t.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  planPaywallPanel: {
    width: '106%',
    alignSelf: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(12,16,22,0.72)',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.15)',
  },
  planPaywallStartRow: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  planPaywallBenefitGrid: {
    width: '100%',
    gap: 5,
  },
  planPaywallBenefit: {
    width: '100%',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  planPaywallBenefitFeatured: {
    minHeight: 52,
  },
  planPaywallBenefitIcon: {
    width: 54,
    height: 54,
    flexShrink: 0,
  },
  planPaywallBenefitTitle: {
    color: t.textPrimary,
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '900',
  },
  planPaywallBenefitSub: {
    color: t.textMuted,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  planPaywallOptions: {
    width: '100%',
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  planPaywallBuyCard: {
    flex: 1,
    minHeight: 88,
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    backgroundColor: 'rgba(14,18,25,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  planPaywallBuyCardSelected: {
    backgroundColor: t.accentBg,
    borderColor: t.accentBorder,
  },
  planPaywallBuyCardDisabled: {
    opacity: 0.62,
  },
  planPaywallBuyTitle: {
    color: t.textPrimary,
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  planPaywallBuyPrice: {
    color: t.accent2,
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
    marginTop: 6,
  },
  planPaywallBuyPerMonth: {
    color: t.textMuted,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    marginTop: 2,
  },
  // Пилюли с ответами юзера
  planPaywallPills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
    marginBottom: 16,
  },
  planPaywallPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: t.accentBg,
    borderWidth: 1,
    borderColor: t.accentBorder,
  },
  planPaywallPillText: {
    color: t.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  // Превью плана
  planPaywallPreview: {
    width: '100%',
    borderRadius: 10,
    backgroundColor: 'rgba(14,18,25,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 14,
    gap: 8,
    marginBottom: 16,
  },
  planPaywallPreviewWeek: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  planPaywallPreviewLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  planPaywallPreviewLockedText: {
    color: t.textMuted,
    fontSize: 12,
  },
  // Таймлайн триала
  planPaywallTimeline: {
    width: '100%',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  planPaywallTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  planPaywallTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginTop: 4,
    flexShrink: 0,
  },
  planPaywallTimelineDotActive: {
    backgroundColor: t.accent,
  },
  planPaywallTimelineLine: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 4,
  },
  planPaywallTimelineCopy: {
    flex: 1,
    paddingBottom: 4,
  },
  planPaywallTimelineTitle: {
    color: t.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  planPaywallTimelineSub: {
    color: t.textMuted,
    fontSize: 12,
    marginTop: 1,
  },
  // Карточки планов — обёртка для бейджа
  planPaywallBuyCardInner: {
    flex: 1,
  },
  planPaywallBuyBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: t.accentBg,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  planPaywallBuyBadgeText: {
    color: t.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  // Сбой загрузки цен из стора — карточка с сообщением и кнопкой ретрая
  planPaywallPriceError: {
    width: '100%',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginTop: 4,
    borderRadius: 8,
    backgroundColor: 'rgba(14,18,25,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  planPaywallPriceErrorText: {
    color: t.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  planPaywallPriceRetry: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    borderRadius: 8,
    backgroundColor: t.accent,
  },
  planPaywallPriceRetryText: {
    color: t.ctaText,
    fontSize: 15,
    fontWeight: '800',
  },
  // Строка доверия под CTA
  planPaywallCtaContent: {
    minHeight: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  planPaywallTrustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  planPaywallTrustItem: {
    color: t.textMuted,
    fontSize: 12,
  },
  planPaywallTrustItemDisabled: {
    opacity: 0.45,
  },
  planPaywallRestoreBusy: {
    minWidth: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  planPaywallTrustSep: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 12,
  },
  planFreeConfirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
    backgroundColor: 'rgba(0,0,0,0.58)',
  },
  planFreeConfirmBox: {
    width: '100%',
    borderRadius: 14,
    padding: 18,
    backgroundColor: 'rgba(18,20,25,0.96)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  planFreeConfirmTitle: {
    color: t.textPrimary,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 9,
  },
  planFreeConfirmText: {
    color: t.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
  },
  planFreeConfirmActions: {
    width: '100%',
    gap: 8,
    marginTop: 16,
  },
  planProgressRail: {
    width: '100%',
    height: 12,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 4,
  },
  planProgressFill: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
    transformOrigin: 'left center',
  },
  planProgressFillGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  planLoadingBuildIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    flexShrink: 0,
  },
  planFlowChecklistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
  },
  planFlowChecklistText: {
    color: t.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  planResultHero: {
    width: '100%',
    padding: 18,
    borderRadius: 8,
    backgroundColor: t.accentBg,
    borderWidth: 1,
    borderColor: t.accentBorder,
  },
  planResultNumber: {
    color: t.textPrimary,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    marginBottom: 6,
  },
  planResultSub: {
    color: t.textMuted,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
});

function OnboardingArtBackground({
  source,
  motion = 'zoomOut',
  styles,
  theme,
}: {
  source?: ImageSourcePropType | null;
  motion?: 'zoomIn' | 'zoomOut';
  styles: OnboardingStyles;
  theme: OnboardingTheme;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(ONBOARDING_BACKGROUND_PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 22_000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 22_000,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [motion, progress]);

  useEffect(() => {
    let active = true;
    particleAnims.forEach((value, index) => {
      const spec = ONBOARDING_BACKGROUND_PARTICLES[index];
      const run = () => {
        if (!active) return;
        value.setValue(0);
        Animated.sequence([
          Animated.delay(spec.delay),
          Animated.timing(value, {
            toValue: 1,
            duration: spec.duration,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
          }),
        ]).start(({ finished }) => {
          if (active && finished) run();
        });
      };
      run();
    });

    return () => {
      active = false;
      particleAnims.forEach(value => value.stopAnimation());
    };
  }, [particleAnims]);

  const bgScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: motion === 'zoomIn' ? [1.0, 1.085] : [1.085, 1.0],
  });
  const bgTranslateY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: motion === 'zoomIn' ? [10, -10] : [-10, 10],
  });
  const bgTranslateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-6, 6],
  });
  const baseGradientColors: [string, string, string] = source
    ? ['rgba(22,14,4,0.08)', 'rgba(5,6,7,0.24)', 'rgba(0,0,0,0.72)']
    : [theme.bgBottom, theme.bgTop, theme.bgEdge];
  const dimGradientColors: [string, string, string, string, string] = source
    ? [
        'rgba(1,2,3,0.04)',
        'rgba(2,3,5,0.12)',
        'rgba(3,4,6,0.28)',
        'rgba(2,2,3,0.58)',
        'rgba(0,0,0,0.92)',
      ]
    : [
        'rgba(1,2,3,0.58)',
        'rgba(2,3,5,0.68)',
        'rgba(3,4,6,0.76)',
        'rgba(2,2,3,0.90)',
        'rgba(0,0,0,0.99)',
      ];

  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View pointerEvents="none" style={styles.onboardingBg}>
        {source ? (
          <View pointerEvents="none" style={styles.onboardingBgImageStack}>
            <Animated.Image
              source={source}
              style={[
                styles.onboardingBgImage,
                { transform: [{ translateX: bgTranslateX }, { translateY: bgTranslateY }, { scale: bgScale }] },
              ]}
              resizeMode="cover"
              resizeMethod="resize"
              fadeDuration={0}
              accessible={false}
            />
          </View>
        ) : null}
        <LinearGradient
          colors={baseGradientColors}
          locations={[0, 0.45, 1]}
          style={styles.onboardingBgDim}
        />
        <LinearGradient
          colors={dimGradientColors}
          locations={[0, 0.32, 0.56, 0.78, 1]}
          style={styles.onboardingBgDim}
        />
        <View pointerEvents="none" style={styles.onboardingParticleLayer}>
          {ONBOARDING_BACKGROUND_PARTICLES.map((spec, index) => {
            const anim = particleAnims[index];
            const translateY = anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -spec.rise],
            });
            const translateX = anim.interpolate({
              inputRange: [0, 0.55, 1],
              outputRange: [0, spec.drift * 0.52, spec.drift],
            });
            const opacity = anim.interpolate({
              inputRange: [0, 0.12, 0.68, 1],
              outputRange: [0, spec.opacity, spec.opacity * 0.62, 0],
            });
            const particleScale = anim.interpolate({
              inputRange: [0, 0.2, 1],
              outputRange: [0.55, 1, 0.62],
            });

            return (
              <Animated.View
                key={`${spec.left}-${spec.top}-${index}`}
                style={[
                  styles.onboardingParticle,
                  {
                    left: spec.left,
                    top: spec.top,
                    width: spec.size,
                    height: spec.size,
                    borderRadius: spec.size / 2,
                    opacity,
                    transform: [
                      { translateX },
                      { translateY },
                      { scale: particleScale },
                    ],
                  },
                ]}
              />
            );
          })}
        </View>
      </View>
    </>
  );
}

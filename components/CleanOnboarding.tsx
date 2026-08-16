import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Image,
  ImageSourcePropType,
  InteractionManager,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from './SafeLinearGradient';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';
import TypewriterText from './onboarding_aha/TypewriterText';
import { hapticTap } from '../hooks/use-haptics';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { getDeviceBootstrapLocale, triLang, type Lang } from '../constants/i18n';
import AccountDeletedNotice from './AccountDeletedNotice';
import { consumeAccountDeletedNotice } from '../app/account_deleted_notice';
import { noAndroidOutline, softShadow } from '../constants/androidGlow';
import { ENABLE_DEV_STUDY_TARGET_LANG, KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../app/config';
// зачем: онбординг подтверждает только факт «есть ли 16» (self-attestation), года
// рождения не спрашиваем — поэтому импортируем attestation-API, а не запись года.
import { confirmAdultAgeAttestation, MIN_FULL_ACCESS_AGE } from '../app/age_gate';
import { setAnalyticsConsent } from '../app/analytics_consent';
import { recordConsentToCloud } from '../app/age_consent_cloud';
import { trackEvent, type AnalyticsEvent } from '../app/analytics';
import { usePaywallPurchase, type PaywallPlan } from '../app/paywall_purchase';
import { requestNotificationPermissionWithFallback, scheduleDailyReminder } from '../app/notifications';
import { GENERATED_NICKNAME_PENDING_KEY, resumePendingGeneratedNickname } from '../app/nickname_guard';
import type { StudyTarget } from '../app/study_target';
import { setStoredStudyTarget } from '../app/study_target';
import { emitDevStudyTargetChanged, setDevStudyTargetLang } from '../app/study_target_lang_dev';
import { onAppEvent } from '../app/events';
import { getEnabledOnboardingSteps, getRemoteBool } from '../app/remote_flags';
import {
  decideOnboardingTransition,
  getOnboardingProgress,
  resolveEnabledOnboardingOrder,
  resolveOnboardingStep,
  runOnboardingTransitionEffects,
  MANDATORY_ONBOARDING_STEP,
  type OnboardingStepId,
} from '../app/onboarding_flow';
import { markOnboardingWelcomePending } from '../app/onboarding_welcome_state';
import { animateNextLayoutTransition } from '../app/smooth_layout';
import { recordOnboardingFunnelCompletion, recordOnboardingFunnelStart } from '../app/onboarding_funnel';
import {
  ONBOARDING_REQUESTED_STUDY_TARGET_KEY,
  prefetchAndRecordStudyTargetServerPack,
} from '../app/study_target_server_prefetch';
import { PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY } from '../app/personal_plan_activation';
import {
  addDays,
  estimateDaysToTarget,
  type CurrentLevel,
  type MinutesPerDay,
  type TargetLevel,
  type UserProfile,
} from '../app/types/user_profile';
import {
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  signInWithProvider,
  type AuthProviderId,
} from '../app/auth_provider';

const WELCOME_LOGO_SOURCE = require('../assets/images/flow_clean_202607/logo_cutout.webp');
const ONBOARDING_ASSETS = {
  sourceTiktok: require('../assets/images/flow_clean_202607/source_tiktok.webp'),
  sourceStore: require('../assets/images/flow_clean_202607/source_store.webp'),
  sourceSocial: require('../assets/images/flow_clean_202607/source_social.webp'),
  sourceYoutube: require('../assets/images/flow_clean_202607/source_youtube.webp'),
  sourceGoogle: require('../assets/images/flow_clean_202607/source_google.webp'),
  sourceFriends: require('../assets/images/flow_clean_202607/source_friends.webp'),
  sourceOther: require('../assets/images/flow_clean_202607/source_other.webp'),
  languageEn: require('../assets/images/language_flags/language_en.webp'),
  languageFr: require('../assets/images/language_flags/language_fr_dev.webp'),
  levelA0: require('../assets/images/flow_clean_202607/level_a0.webp'),
  levelA1: require('../assets/images/flow_clean_202607/level_a1.webp'),
  levelA2: require('../assets/images/flow_clean_202607/level_a2.webp'),
  levelB1: require('../assets/images/flow_clean_202607/level_b1.webp'),
  levelB2: require('../assets/images/flow_clean_202607/level_b2.webp'),
  notifications: require('../assets/images/flow_clean_202607/notifications.webp'),
  paywallYearly: require('../assets/images/flow_clean_202607/paywall_yearly.webp'),
  paywallMonthly: require('../assets/images/flow_clean_202607/paywall_monthly.webp'),
  paywallLifetime: require('../assets/images/flow_clean_202607/paywall_lifetime.webp'),
};

export type OnboardingProps = {
  onDone: () => void;
  initialLang?: Lang;
  onLangSelect?: (lang: Lang) => Promise<void> | void;
  onIntroFullAccessStart?: () => Promise<boolean | void> | boolean | void;
  onPersonalPlanPaywallStart?: () => Promise<boolean | void> | boolean | void;
  startAtNameStep?: boolean;
};

export type CleanOnboardingStep =
  | 'welcome'
  | 'privacy'
  | 'source'
  | 'language'
  | 'level'
  | 'promise'
  | 'notifications'
  | 'trialReminder'
  | 'onboardingPaywall'
  | 'improve'
  | 'name';

export const CLEAN_ONBOARDING_FLOW_VERSION = 'clean_minimal_wow_flow_2026_08_16d';
const ONBOARDING_AUTH_UI_TIMEOUT_MS = 45_000;

async function withOnboardingAuthUiDeadline<T>(task: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      task,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error('signin_deadline-exceeded')),
          ONBOARDING_AUTH_UI_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
const SHOW_ONBOARDING_LANGUAGE_STEP = false;
// Минимальный флоу (владелец, 2026-08-16): анкета про построение плана удалена
// вместе с планами. Порядок: welcome → privacy (сейф: вход и «данные не
// передаются», согласие строкой) → блок языка (выключен, пока язык один) →
// promise (обязательный анимированный прогресс; полная АХ-сцена — ПО КНОПКЕ
// «Попробовать», отдельного шага у неё нет) → уведомления → честное
// «предупредим до конца пробного» → пейвол → improve → возраст/согласия.
export const CLEAN_ONBOARDING_ORDER: readonly CleanOnboardingStep[] = [
  'welcome',
  'privacy',
  'source',
  ...(SHOW_ONBOARDING_LANGUAGE_STEP ? (['language', 'level'] as const) : []),
  'promise',
  'notifications',
  'trialReminder',
  'onboardingPaywall',
  'improve',
  'name',
];

// зачем: эти три ключа снимаются при удалении аккаунта ДО показа онбординга —
// иначе он восстановит старый шаг вместо первого экрана. Значения ОБЯЗАНЫ
// совпадать с ONBOARDING_RESET_KEYS_ON_ACCOUNT_DELETE в app/account_deleted_notice.ts;
// совпадение стережёт тест account_delete_flow_contract.
// Литералы, а НЕ деструктуризация импорта: этот модуль и auth_provider образуют
// цикл, и на устройстве константа приходила undefined — модуль падал с
// ReferenceError, кнопка «Удалить» переставала работать вовсе.
const FLOW_VERSION_KEY = 'onboarding_flow_version_v1';
const STEP_KEY = 'onboarding_step';
const DONE_KEY = 'onboarding_done';
const DISCOVERY_SOURCE_KEY = 'onboarding_discovery_source';
const PLAN_LEVEL_KEY = 'onboarding_plan_level';
const PLAN_BILLING_KEY = 'onboarding_plan_billing';
const LEGAL_ACCEPTED_KEY = 'onboarding_terms_privacy_accepted_v1';
const ANALYTICS_HELP_KEY = 'onboarding_analytics_help_v1';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type DiscoverySource = 'tiktok' | 'store' | 'social' | 'youtube' | 'google' | 'friends' | 'other';
type LevelChoice = 'a0' | 'a1' | 'a2' | 'b1' | 'b2';
type AgeAnswer = 'yes' | 'no' | null;

type Option<T extends string | number> = {
  id: T;
  title: string;
  icon: IoniconName;
  asset?: ImageSourcePropType;
};

const DISCOVERY_OPTIONS: Option<DiscoverySource>[] = [
  { id: 'tiktok', title: 'TikTok', icon: 'musical-notes-outline', asset: ONBOARDING_ASSETS.sourceTiktok },
  { id: 'store', title: 'App Store / Google Play', icon: 'storefront-outline', asset: ONBOARDING_ASSETS.sourceStore },
  { id: 'social', title: 'Instagram / Facebook', icon: 'camera-outline', asset: ONBOARDING_ASSETS.sourceSocial },
  { id: 'youtube', title: 'YouTube', icon: 'logo-youtube', asset: ONBOARDING_ASSETS.sourceYoutube },
  { id: 'google', title: 'Google Search', icon: 'search-outline', asset: ONBOARDING_ASSETS.sourceGoogle },
  { id: 'friends', title: 'Друзья', icon: 'people-outline', asset: ONBOARDING_ASSETS.sourceFriends },
  { id: 'other', title: 'Другое', icon: 'ellipsis-horizontal-circle-outline', asset: ONBOARDING_ASSETS.sourceOther },
];

const LANGUAGE_OPTIONS: (Option<StudyTarget> & { code: string; native: string })[] = [
  { id: 'en', code: 'EN', native: 'Английский', title: 'Английский', icon: 'chatbubbles-outline', asset: ONBOARDING_ASSETS.languageEn },
  { id: 'fr', code: 'FR', native: 'Французский', title: 'Французский', icon: 'cafe-outline', asset: ONBOARDING_ASSETS.languageFr },
];

const LEVEL_OPTIONS: Option<LevelChoice>[] = [
  { id: 'a0', title: 'Я начинаю с нуля', icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelA0 },
  { id: 'a1', title: 'Знаю отдельные слова', icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelA1 },
  { id: 'a2', title: 'Могу поддержать простой разговор', icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelA2 },
  { id: 'b1', title: 'Говорю на знакомые темы', icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelB1 },
  { id: 'b2', title: 'Обсуждаю почти всё', icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelB2 },
];

function normalizedStoredStep(value: string | null): CleanOnboardingStep | null {
  if (value === 'start') return 'welcome';
  if (value === 'aha') return 'promise';
  if (!SHOW_ONBOARDING_LANGUAGE_STEP && (value === 'language' || value === 'level')) return 'promise';
  if ((CLEAN_ONBOARDING_ORDER as readonly string[]).includes(value ?? '')) return value as CleanOnboardingStep;
  return null;
}

function targetLabel(target: StudyTarget, form: 'subject' | 'accusative' = 'subject'): string {
  if (target === 'fr') return form === 'accusative' ? 'французский' : 'французского';
  return form === 'accusative' ? 'английский' : 'английского';
}

function levelToCurrentLevel(level: LevelChoice): CurrentLevel {
  if (level === 'a0' || level === 'a1') return 'a1';
  if (level === 'a2') return 'a2';
  if (level === 'b1') return 'b1';
  return 'b2';
}

function targetAfterLevel(currentLevel: CurrentLevel): TargetLevel {
  if (currentLevel === 'a1') return 'a2';
  if (currentLevel === 'a2') return 'b1';
  if (currentLevel === 'b1') return 'b2';
  return 'c1';
}

// Пейвол показывает оригинальную таблицу FREE/PLUS двумя колонками (владелец,
// 2026-08-16) — набор из боевой копирайт-выкладки (paywall_copy.ts →
// CONTEXT_BENEFITS) БЕЗ «Персонального плана»: планы удалены из приложения.
// Слово «ИИ» не используем — «разговорная практика» вместо «диалоги с ИИ».
const PAYWALL_COMPARISON_BENEFITS: { icon: IoniconName; title: string }[] = [
  { icon: 'flash-outline', title: 'Безлимит энергии' },
  { icon: 'mic-outline', title: 'Практика произношения' },
  { icon: 'chatbubbles-outline', title: 'Разговорная практика' },
  { icon: 'bulb-outline', title: 'Разбор ошибок' },
  { icon: 'locate-outline', title: 'Тренер слабых мест' },
  { icon: 'stats-chart-outline', title: 'Аналитика 365 дней' },
];

function reactionForLevel(level: LevelChoice, target: StudyTarget): string {
  const language = targetLabel(target, 'accusative');
  switch (level) {
    case 'a0': return `Ок, начнём с самых первых фраз. ${language[0].toUpperCase()}${language.slice(1)} будет появляться маленькими шагами.`;
    case 'a1': return 'Хорошо. Соберём короткие фразы и первые ответы на те случаи, которые часто нужны сразу.';
    case 'a2': return 'Понятная точка: говорить уже можно, просто нужны готовые связки для живой речи.';
    case 'b1': return 'Отлично, пойдём не в правила, а в скорость, слух и более естественные ответы.';
    case 'b2': return 'Тут важны не азы, а точность и темп. Держим взрослую сложность.';
  }
}

type OnboardingAnalyticsTags = Record<string, string | number | boolean | null>;

function trackOnboardingActivity(action: string, tags?: OnboardingAnalyticsTags) {
  void import('../app/app_activity')
    .then(({ trackActivity }) => trackActivity(action, {
      feature: 'onboarding',
      screen: 'onboarding',
      result: 'info',
      tags,
      writeToFirestore: action === 'onboarding_source_select',
    }))
    .catch(() => {});
}

function trackOnboarding(action: AnalyticsEvent, tags?: OnboardingAnalyticsTags) {
  void trackEvent(action, {
    feature: 'onboarding',
    screen: 'onboarding',
    ...(tags ?? {}),
  });
  trackOnboardingActivity(action, tags);
}

function trackOnboardingStepView(tags: OnboardingAnalyticsTags) {
  void trackEvent('onboarding_step_view', {
    feature: 'onboarding',
    screen: 'onboarding',
    ...tags,
  });
  trackOnboardingActivity('onboarding_step_view', tags);
}

function trackOnboardingPlanPaywallView(tags: OnboardingAnalyticsTags) {
  void trackEvent('onboarding_plan_paywall_view', {
    feature: 'onboarding',
    screen: 'onboarding',
    ...tags,
  });
  trackOnboardingActivity('onboarding_plan_paywall_view', tags);
}

function trackOnboardingPlanTrialCta(tags: OnboardingAnalyticsTags) {
  void trackEvent('onboarding_plan_trial_cta', {
    feature: 'onboarding',
    screen: 'onboarding',
    ...tags,
  });
  trackOnboardingActivity('onboarding_plan_trial_cta', tags);
}

// зачем: владельцу нужно видеть в админке, на каком экране онбординга чаще всего
// уходят из приложения. Показы каждого шага (onboarding_step_view) в Firestore НЕ
// пишутся — это было бы ~10 платных записей на каждого нового пользователя. Вместо
// этого при сворачивании/закрытии приложения пишем ОДНУ запись с последним
// увиденным экраном: ~1 запись на пользователя вместо ~10, а воронка выходов
// строится именно по ней. Согласие на аналитику проверяет сам trackActivity.
function trackOnboardingExit(step: OnboardingStepId) {
  void import('../app/app_activity')
    .then(({ trackActivity }) => trackActivity('onboarding_exit', {
      feature: 'onboarding',
      screen: 'onboarding',
      result: 'info',
      tags: { step },
      writeToFirestore: true,
    }))
    .catch(() => {});
}

function Background() {
  // Светлая подложка макета (Bevel-стиль, утверждён владельцем 2026-08-16):
  // ровный холодный фон вместо прежнего midnight-градиента со звёздами.
  // Один непрозрачный слой — первый кадр стабилен, перерисовок нет.
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.backdrop]} />;
}

// Прогресс между экранами едет плавно: ProgressHeader ремоунтится на каждом
// шаге, поэтому «откуда ехать» помним на уровне модуля.
let lastProgressFraction = 0;

const OnboardingOrderContext = React.createContext<readonly OnboardingStepId[]>(CLEAN_ONBOARDING_ORDER);

function ProgressHeader({
  step,
  onBack,
  onClose,
  headerRight,
}: {
  step: CleanOnboardingStep;
  onBack?: () => void;
  /** Крестик СЛЕВА вместо шеврона (пейвол): закрыть = уйти на бесплатный путь. */
  onClose?: () => void;
  /** Слот справа в топбаре (меню «···» на пейволе). */
  headerRight?: React.ReactNode;
}) {
  const enabledOrder = React.useContext(OnboardingOrderContext);
  const { progress, total } = getOnboardingProgress(enabledOrder, step);

  // Макет: шапка — топбар 52pt с круглой белой кнопкой слева и слотом справа.
  // Полоски прогресса в утверждённом макете нет; номер шага остаётся только в
  // accessibilityLabel кнопки, чтобы скринридер не потерял позицию во флоу.
  if (!progress) return null;
  const leftHandler = onClose ?? onBack;
  return (
    <View style={styles.progressHeader}>
      <Pressable
        testID={onClose ? 'onboarding-paywall-close' : 'onboarding-back'}
        onPressIn={() => { void hapticTap(); }}
        onPress={leftHandler}
        disabled={!leftHandler}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed, !leftHandler && styles.hidden]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={onClose ? 'Закрыть' : `Назад. Шаг ${progress} из ${total}`}
      >
        <Ionicons name={onClose ? 'close' : 'chevron-back'} size={22} color="#0C111B" />
      </Pressable>
      {headerRight ?? <View style={styles.headerRightSpacer} />}
    </View>
  );
}

/** Появление блока: fade + подъезд снизу, с каскадной задержкой. */
function FadeUp({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.timing(anim, { toValue: 1, duration: 260, delay, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [anim, delay]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

/** Плавная смена шагов всего онбординга: выход влево 130мс, вход справа 210мс. */
function useStepSlide(step: CleanOnboardingStep): {
  displayStep: CleanOnboardingStep;
  slideStyle: Animated.WithAnimatedObject<ViewStyle>;
} {
  const [displayStep, setDisplayStep] = useState<CleanOnboardingStep>(step);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (step === displayStep) return;
    const out = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 130, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -20, duration: 130, useNativeDriver: true }),
    ]);
    out.start(({ finished }) => {
      if (finished) setDisplayStep(step);
    });
    return () => out.stop();
  }, [displayStep, opacity, step, translateX]);

  useEffect(() => {
    opacity.setValue(0);
    translateX.setValue(20);
    const enter = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 210, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 210, useNativeDriver: true }),
    ]);
    enter.start();
    return () => enter.stop();
  }, [displayStep, opacity, translateX]);

  const slideStyle = useMemo(
    () => ({ opacity, transform: [{ translateX }] }),
    [opacity, translateX],
  );
  return { displayStep, slideStyle };
}

/** Логотип welcome: появление scale-in с overshoot + мягкое «дыхание».
 *  Дыхание — конечный ping-pong через рекурсию с гейтом фокуса/AppState
 *  (Performance Bible: бесконечные лупы под гейтом). */
function WelcomeLogo() {
  const isFocused = useIsScreenFocused();
  const enter = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const a = Animated.spring(enter, {
      toValue: 1,
      friction: 6,
      tension: 70,
      useNativeDriver: true,
    });
    a.start();
    return () => a.stop();
  }, [enter]);

  useEffect(() => {
    if (!isFocused) { breathe.stopAnimation(); return; }
    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: 2400, useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0, duration: 2400, useNativeDriver: true }),
        ]),
      );
      loop.start();
    };
    const stop = () => { loop?.stop(); loop = null; };
    if (AppState.currentState === 'active') start();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') start(); else stop();
    });
    return () => { sub.remove(); stop(); };
  }, [breathe, isFocused]);

  const scale = Animated.add(
    enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }),
    breathe.interpolate({ inputRange: [0, 1], outputRange: [0, 0.03] }),
  );

  return (
    <Animated.View style={{ opacity: enter, transform: [{ scale }] }}>
      {/* Макет .mark: знак 96×96 прямо на подложке — ни плитки-градиента,
          ни ореола под ней в утверждённом макете нет. Смысл несёт заголовок. */}
      <Image source={WELCOME_LOGO_SOURCE} style={styles.logoImageLarge} resizeMode="contain" accessible={false} />
    </Animated.View>
  );
}

function CompassBubble({ children, compact = false }: { children: React.ReactNode; compact?: boolean }) {
  return (
    <View style={[styles.compassRow, compact && styles.compassRowCompact]}>
      <Image source={WELCOME_LOGO_SOURCE} style={styles.logoImageSmall} resizeMode="contain" />
      <View style={styles.speechBubble}>
        {typeof children === 'string' ? (
          // key по тексту — при смене вопроса на реакцию строка перепечатывается.
          <TypewriterText key={children} text={children} charMs={12} skipOnPress />
        ) : (
          <Text style={styles.speechText}>{children}</Text>
        )}
      </View>
    </View>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  loading,
  testID,
  flat,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
  flat?: boolean;
}) {
  return (
    <Pressable
      testID={testID}
      onPressIn={() => { if (!disabled && !loading) void hapticTap(); }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [styles.primaryButtonOuter, (pressed || loading) && styles.pressed, (disabled || loading) && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {/* Макет (владелец, 2026-08-16): сплошная чёрная таблетка вместо
          прежнего сине-фиолетового градиента. */}
      <LinearGradient
        colors={disabled ? ['#B6BAC4', '#B6BAC4'] : ['#17191F', '#17191F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButton}
      >
        {loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
      </LinearGradient>
      {flat ? null : <View style={styles.primaryButtonShadow} />}
    </Pressable>
  );
}

function SecondaryButton({ label, onPress, testID }: { label: string; onPress: () => void; testID?: string }) {
  return (
    <Pressable
      testID={testID}
      onPressIn={() => { void hapticTap(); }}
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
      accessibilityRole="button"
    >
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function OptionCard<T extends string | number>({
  option,
  selected,
  onPress,
  testID,
}: {
  option: Option<T>;
  selected?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPressIn={() => { void hapticTap(); }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionCard, selected && styles.optionCardSelected, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      {option.asset ? (
        <Image source={option.asset} style={styles.optionAsset} resizeMode="contain" />
      ) : (
        <Ionicons name={option.icon} size={36} color={selected ? '#0C111B' : '#8A93A5'} />
      )}
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle} numberOfLines={2}>{option.title}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

function LanguageCard({
  option,
  selected,
  onPress,
}: {
  option: (typeof LANGUAGE_OPTIONS)[number];
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      testID={`onboarding-language-${option.id}`}
      onPressIn={() => { void hapticTap(); }}
      onPress={onPress}
      style={({ pressed }) => [styles.languageCard, selected && styles.languageCardSelected, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      {option.asset ? (
        <Image source={option.asset} style={styles.languageAsset} resizeMode="contain" />
      ) : (
        <Ionicons name={option.icon} size={44} color={selected ? '#0C111B' : '#8A93A5'} />
      )}
      <View style={styles.optionCopy}>
        <Text style={styles.languageTitle}>{option.native}</Text>
      </View>
      <View style={[styles.radioLarge, selected && styles.radioLargeSelected]}>
        {selected ? <Ionicons name="checkmark" size={15} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

/**
 * Контекст «пропустить весь онбординг». Держим в контексте, а не прокидываем
 * пропсом в каждый из 13 экранов: ScreenFrame один, и ссылка появляется сразу
 * везде, где есть футер.
 *
 * зачем: владелец (2026-07-26) — «на каждом экране должно быть Пропустить,
 * чтобы сразу дойти до имени и согласий». null = ссылку не показываем
 * (выключено из админки, либо экран оплаты — там свой выход «Продолжить без
 * плана», второй выход бил бы по конверсии).
 */
const OnboardingSkipContext = React.createContext<(() => void) | null>(null);

/** Экран оплаты исключён намеренно: см. комментарий выше. */
const SKIP_HIDDEN_STEPS: readonly CleanOnboardingStep[] = ['onboardingPaywall', 'name'];

function OnboardingSkipLink({ step }: { step: CleanOnboardingStep }) {
  const skip = React.useContext(OnboardingSkipContext);
  if (!skip || SKIP_HIDDEN_STEPS.includes(step)) return null;
  return (
    <Pressable
      testID="onboarding-skip"
      onPressIn={() => { void hapticTap(); }}
      onPress={skip}
      style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Пропустить знакомство"
    >
      <Text style={styles.skipLabel}>Пропустить</Text>
    </Pressable>
  );
}

function ScreenFrame({
  step,
  title,
  children,
  footer,
  onBack,
  onClose,
  headerRight,
  center,
  plainTitle,
}: {
  step: CleanOnboardingStep;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  headerRight?: React.ReactNode;
  center?: boolean;
  plainTitle?: boolean;
}) {
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <ProgressHeader step={step} onBack={onBack} onClose={onClose} headerRight={headerRight} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView
          testID={`onboarding-${step}-screen`}
          style={styles.scrollShell}
          contentContainerStyle={[
            styles.scrollContent,
            center && styles.scrollContentCenter,
            { paddingBottom: footer ? 22 : Math.max(28, bottomInset + 18) },
          ]}
          bounces={false}
          alwaysBounceVertical={false}
          overScrollMode="never"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {title ? (
            <FadeUp>
              {plainTitle ? (
                <Text style={[styles.plainTitle, step === 'name' && styles.consentTitle]}>{title}</Text>
              ) : (
                <CompassBubble compact>{title}</CompassBubble>
              )}
            </FadeUp>
          ) : null}
          <FadeUp delay={90} style={styles.frameChildren}>{children}</FadeUp>
        </ScrollView>
        {footer ? (
          <FadeUp delay={150} style={[styles.footer, { paddingBottom: Math.max(30, bottomInset) }]}>
            {footer}
            <OnboardingSkipLink step={step} />
          </FadeUp>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NotificationMock() {
  const isIos = Platform.OS === 'ios';
  // Мокап системного диалога «оживает» как настоящий: pop-in с пружиной.
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(300),
      Animated.spring(anim, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [anim]);
  const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });
  return (
    <View style={styles.notificationMockWrap}>
      <Animated.View style={[styles.notificationMock, { opacity: anim, transform: [{ scale }] }]}>
        <Text style={styles.notificationMockTitle}>
          {isIos ? 'Приложение хочет отправлять уведомления' : 'Разрешить уведомления?'}
        </Text>
        <Text style={styles.notificationMockBody}>
          {isIos
            ? 'Уведомления могут включать напоминания, звуки и значки.'
            : 'Мы будем напоминать о короткой практике в выбранное время.'}
        </Text>
        <View style={styles.notificationMockActions}>
          <Text style={styles.notificationMockMuted}>{isIos ? 'Не разрешать' : 'Не сейчас'}</Text>
          <Text style={styles.notificationMockAllow}>Разрешить</Text>
        </View>
      </Animated.View>
      <Ionicons name="arrow-up" size={42} color="#8A93A5" style={styles.notificationArrow} />
    </View>
  );
}
// Иллюстрация improve-экрана (Bevel, кадр 5): сердце в центре, вокруг —
// плашки с лайком, звездой и людьми на пунктирных связях. Появление — мягкий
// pop каскадом (конечная анимация, native driver).
function ImproveConstellation() {
  const anims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  useEffect(() => {
    const seq = anims.map((value, index) => Animated.sequence([
      Animated.delay(140 + index * 130),
      Animated.spring(value, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
    ]));
    const a = Animated.parallel(seq);
    a.start();
    return () => a.stop();
  }, [anims]);
  const pop = (index: number) => ({
    opacity: anims[index],
    transform: [{ scale: anims[index].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
  });
  return (
    <View style={styles.improveArt}>
      <View style={[styles.improveLink, styles.improveLinkLeft]} />
      <View style={[styles.improveLink, styles.improveLinkTop]} />
      <View style={[styles.improveLink, styles.improveLinkRight]} />
      <Animated.View style={[styles.improveHeart, pop(0)]}>
        <Ionicons name="heart" size={54} color="#8FA0E8" />
      </Animated.View>
      <Animated.View style={[styles.improveSatellite, styles.improveSatelliteTop, pop(1)]}>
        <Ionicons name="thumbs-up" size={22} color="#8A93A5" />
      </Animated.View>
      <Animated.View style={[styles.improveSatellite, styles.improveSatelliteLeft, pop(2)]}>
        <Ionicons name="star" size={22} color="#8A93A5" />
      </Animated.View>
      <Animated.View style={[styles.improveSatellite, styles.improveSatelliteRight, pop(3)]}>
        <Ionicons name="people" size={22} color="#8A93A5" />
      </Animated.View>
    </View>
  );
}

// Сейф privacy-экрана — в точности по референсу Bevel (кадр 2): светлый
// неоморфный корпус с мягкими тенями, наборное кольцо с рисками, диск с
// бликом, петли справа, янтарный указатель сверху. Живёт мягким «дыханием»
// (конечный ping-pong под гейтом фокуса) и поворотом диска — native driver.
function PrivacyVault() {
  const isFocused = useIsScreenFocused();
  const breathe = useRef(new Animated.Value(0)).current;
  const dial = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!isFocused) return;
    let alive = true;
    const loop = (toValue: number) => {
      if (!alive) return;
      Animated.timing(breathe, { toValue, duration: 2400, useNativeDriver: true })
        .start(({ finished }) => { if (finished) loop(toValue === 1 ? 0 : 1); });
    };
    loop(1);
    const spin = Animated.timing(dial, { toValue: 1, duration: 1700, delay: 400, useNativeDriver: true });
    spin.start();
    return () => { alive = false; breathe.stopAnimation(); spin.stop(); };
  }, [breathe, dial, isFocused]);
  const scale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.025] });
  const rotate = dial.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '150deg'] });
  // 12 рисок наборного кольца, как у референса.
  const ticks = Array.from({ length: 12 }, (_, index) => index * 30);
  return (
    <View style={styles.vaultWrap}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient colors={['#FBFCFE', '#E9EDF4', '#DDE2EC']} start={{ x: 0.2, y: 0 }} end={{ x: 0.8, y: 1 }} style={styles.vaultBody}>
          <View style={styles.vaultBodyInnerEdge} />
          <View style={styles.vaultHinge} />
          <View style={[styles.vaultHinge, styles.vaultHingeBottom]} />
          <View style={styles.vaultPointer} />
          <View style={styles.vaultRing}>
            {ticks.map((deg) => (
              <View key={deg} style={[styles.vaultTickHolder, { transform: [{ rotate: `${deg}deg` }] }]}>
                <View style={styles.vaultTick} />
              </View>
            ))}
            <Animated.View style={{ transform: [{ rotate }] }}>
              <LinearGradient colors={['#FFFFFF', '#E7EBF2']} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.vaultDial}>
                <View style={styles.vaultDialMark} />
              </LinearGradient>
            </Animated.View>
            <Ionicons name="sparkles" size={15} color="#FFFFFF" style={styles.vaultSparkle} />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// Тапабельный факт на экране прогресса (владелец, 2026-08-16): по тапу под
// заголовком раскрывается серое пояснение. Вставка в поток — строго через
// animateNextLayoutTransition (Performance Bible → Layout Stability), шеврон
// доворачивается на native driver. Появление карточки — каскад, как у
// TrialTimelineRow.
function PromiseFact({
  icon,
  title,
  detail,
  index = 0,
}: {
  icon: IoniconName;
  title: string;
  detail: string;
  index?: number;
}) {
  const [open, setOpen] = useState(false);
  const enter = useRef(new Animated.Value(0)).current;
  const chevron = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(500 + index * 180),
      Animated.timing(enter, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [enter, index]);
  useEffect(() => {
    const a = Animated.timing(chevron, { toValue: open ? 1 : 0, duration: 200, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [chevron, open]);
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  const rotate = chevron.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  return (
    <Animated.View style={{ opacity: enter, transform: [{ translateY }] }}>
      <Pressable
        onPressIn={() => { void hapticTap(); }}
        onPress={() => {
          animateNextLayoutTransition();
          setOpen((value) => !value);
        }}
        style={({ pressed }) => [styles.promiseFact, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.promiseFactHead}>
          <View style={styles.promiseFactIcon}>
            <Ionicons name={icon} size={19} color="#3B4EDB" />
          </View>
          <Text style={styles.promiseFactTitle}>{title}</Text>
          <Animated.View style={{ transform: [{ rotate }] }}>
            <Ionicons name="chevron-down" size={19} color="#8A91A1" />
          </Animated.View>
        </View>
        {open ? <Text style={styles.promiseFactDetail}>{detail}</Text> : null}
      </Pressable>
    </Animated.View>
  );
}

// Экран прогресса (владелец: «анимированный, осмысленный»): две траектории —
// «повторяешь с Phraseman» (растёт) и «просто учишь и забываешь» (сползает).
// SVG-пути статичны (native driver с Path не дружит), «рисование» делает
// шторка цвета карточки, уезжающая вправо на native driver — кривая
// проявляется слева направо без единого кадра на JS-потоке. Смысл держат
// вехи времени под осью: неделя → месяц → 3 месяца.
function PromiseChart() {
  const isFocused = useIsScreenFocused();
  const [revealWidth, setRevealWidth] = useState(0);
  const reveal = useRef(new Animated.Value(0)).current;
  const badgeUp = useRef(new Animated.Value(0)).current;
  const badgeDown = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(240),
      Animated.timing(reveal, { toValue: 1, duration: 1100, useNativeDriver: true }),
    ]);
    a.start();
    const up = Animated.sequence([
      Animated.delay(1150),
      Animated.spring(badgeUp, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
    ]);
    up.start();
    const down = Animated.sequence([
      Animated.delay(620),
      Animated.spring(badgeDown, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
    ]);
    down.start();
    return () => { a.stop(); up.stop(); down.stop(); };
  }, [badgeDown, badgeUp, reveal]);
  // Пульс живой точки: конечный ping-pong с рекурсией под гейтом фокуса
  // (Performance Bible: никаких свободных бесконечных лупов).
  useEffect(() => {
    if (!isFocused) return;
    let alive = true;
    const beat = () => {
      if (!alive) return;
      pulse.setValue(0);
      Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true })
        .start(({ finished }) => { if (finished) beat(); });
    };
    const timer = setTimeout(beat, 1350);
    return () => { alive = false; clearTimeout(timer); pulse.stopAnimation(); };
  }, [isFocused, pulse]);
  const translateX = reveal.interpolate({
    inputRange: [0, 1],
    outputRange: [0, revealWidth || 1],
  });
  const pulseScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.6, 2.1] });
  const pulseOpacity = pulse.interpolate({ inputRange: [0, 0.15, 1], outputRange: [0, 0.55, 0] });
  const badgePop = (value: Animated.Value) => ({
    opacity: value,
    transform: [{ scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
  });
  return (
    <View
      style={styles.promiseChartCard}
      onLayout={(event) => setRevealWidth(event.nativeEvent.layout.width)}
    >
      <Svg width="100%" height={158} viewBox="0 0 320 168" preserveAspectRatio="none">
        <Defs>
          <SvgLinearGradient id="promiseUpStroke" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#6FE3AC" />
            <Stop offset="1" stopColor="#25A97A" />
          </SvgLinearGradient>
          <SvgLinearGradient id="promiseUpFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#3ECF8E" stopOpacity="0.25" />
            <Stop offset="1" stopColor="#3ECF8E" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        <Path
          d="M12 128 C 96 122, 160 96, 210 62 C 244 40, 276 26, 306 18 L 306 150 L 12 150 Z"
          fill="url(#promiseUpFill)"
        />
        <Path
          d="M12 96 C 80 124, 150 136, 306 142"
          stroke="#B6BAC4"
          strokeWidth={3.5}
          strokeLinecap="round"
          strokeDasharray="1 8"
          fill="none"
        />
        <Path
          d="M12 128 C 96 122, 160 96, 210 62 C 244 40, 276 26, 306 18"
          stroke="url(#promiseUpStroke)"
          strokeWidth={4.5}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={306} cy={18} r={6} fill="#25A97A" />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[styles.promiseReveal, { transform: [{ translateX }] }]}
      />
      {/* Живая точка на конце растущей кривой: пульс-кольцо на native driver. */}
      <Animated.View
        pointerEvents="none"
        style={[styles.promisePulse, { opacity: pulseOpacity, transform: [{ scale: pulseScale }] }]}
      />
      {/* Подписи прижаты к своим кривым и въезжают пружиной после «рисования». */}
      <Animated.View style={[styles.promiseBadgeUp, badgePop(badgeUp)]}>
        {/* Макет: бейдж только текстовый — иконки на нём нет. */}
        <Text style={styles.promiseBadgeUpText}>С Phraseman</Text>
      </Animated.View>
      <Animated.View style={[styles.promiseBadgeDown, badgePop(badgeDown)]}>
        <Text style={styles.promiseBadgeDownText}>Без повторения</Text>
      </Animated.View>
      <View style={styles.promiseAxisRow}>
        <Text style={styles.promiseAxisLabel}>неделя</Text>
        <Text style={styles.promiseAxisLabel}>месяц</Text>
        <Text style={styles.promiseAxisLabel}>3 месяца</Text>
      </View>
    </View>
  );
}

function TrialTimelineRow({
  icon,
  title,
  index = 0,
}: {
  icon: IoniconName;
  title: string;
  index?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(120 + index * 180),
      Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [anim, index]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return (
    <Animated.View style={[styles.trialTimelineRow, { opacity: anim, transform: [{ translateY }] }]}>
      <View style={styles.trialTimelineIcon}>
        <Ionicons name={icon} size={19} color="#3B4EDB" />
      </View>
      <Text style={styles.trialTimelineTitle}>{title}</Text>
    </Animated.View>
  );
}

// Пуш «как настоящий»: карточка въезжает сверху с лёгким пружинным доводом —
// ровно так уведомление садится на локскрин. Конечная анимация, native driver.
function AnimatedPushCard({ children }: { children: React.ReactNode }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const a = Animated.sequence([
      Animated.delay(260),
      Animated.spring(anim, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [anim]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [-42, 0] });
  return (
    <Animated.View style={[styles.trialPushCard, { opacity: anim, transform: [{ translateY }] }]}>
      {children}
    </Animated.View>
  );
}

// Строка таблицы FREE/PLUS на пейволе: у Free — прочерк, у Plus — галочка,
// которая «ставится» с overshoot; строки подъезжают каскадом (native driver).
function PlanComparisonRow({
  icon,
  title,
  index = 0,
}: {
  icon: IoniconName;
  title: string;
  index?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const delay = 140 + index * 160;
    const a = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(check, { toValue: 1, friction: 5, tension: 120, delay: 140, useNativeDriver: true }),
      ]),
    ]);
    a.start();
    return () => a.stop();
  }, [anim, check, index]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return (
    <Animated.View style={[styles.cmpRow, { opacity: anim, transform: [{ translateY }] }]}>
      <View style={styles.cmpLabelCell}>
        <Ionicons name={icon} size={20} color="#3B4EDB" style={styles.cmpIcon} />
        <Text style={styles.cmpLabel}>{title}</Text>
      </View>
      <View style={styles.cmpCell}>
        <View style={styles.cmpDash} />
      </View>
      <View style={styles.cmpCell}>
        <Animated.View style={[styles.cmpCheckWrap, { transform: [{ scale: check }] }]}>
          <Ionicons name="checkmark" size={16} color="#22B07D" />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function PaywallPlanCard({
  plan,
  title,
  price,
  subprice,
  badge,
  selected,
  onPress,
  asset,
  testID,
}: {
  plan: PaywallPlan;
  title: string;
  price: string;
  subprice?: string;
  badge?: string;
  selected: boolean;
  onPress: (plan: PaywallPlan) => void;
  asset: ImageSourcePropType;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPressIn={() => { void hapticTap(); }}
      onPress={() => onPress(plan)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.paywallPlanCard, selected && styles.paywallPlanCardSelected, pressed && styles.pressed]}
    >
      <Image source={asset} style={styles.paywallPlanAsset} resizeMode="contain" />
      <View style={styles.paywallPlanCopy}>
        <View style={styles.paywallPlanTitleRow}>
          <Text style={styles.paywallPlanTitle}>{title}</Text>
          {badge ? <Text style={styles.paywallPlanBadge}>{badge}</Text> : null}
        </View>
        <Text style={styles.paywallPlanPrice}>{price}</Text>
        {subprice ? <Text style={styles.paywallPlanSubprice}>{subprice}</Text> : null}
      </View>
      <View style={[styles.paywallRadio, selected && styles.paywallRadioSelected]}>
        {selected ? <Ionicons name="checkmark" size={21} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}

function CleanOnboarding({
  onDone,
  initialLang,
  onPersonalPlanPaywallStart,
  startAtNameStep,
}: OnboardingProps) {
  const lang = initialLang ?? getDeviceBootstrapLocale();
  // зачем: подтверждение только что выполненного удаления аккаунта. Забираем
  // пометку в инициализаторе useState — ровно один раз за монтирование, ДО
  // первого кадра, поэтому плашка не «доезжает» вторым кадром и не дёргает
  // геометрию (layout stability). Повторные ре-рендеры пометку уже не увидят.
  const [accountDeletedNotice, setAccountDeletedNotice] = useState(consumeAccountDeletedNotice);
  const [step, setStep] = useState<CleanOnboardingStep>(startAtNameStep ? 'name' : 'welcome');
  const [restored, setRestored] = useState(false);
  const [authMode, setAuthMode] = useState(false);
  const [authLoading, setAuthLoading] = useState<AuthProviderId | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  // зачем: почта провайдера, под которой аккаунта не нашлось. Не null → показываем
  // вопрос «такого аккаунта нет, создать?» вместо кнопок входа. Пустая строка —
  // валидное значение (провайдер не отдал email), поэтому признак именно null/не-null.
  const [unknownAccountEmail, setUnknownAccountEmail] = useState<string | null>(null);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [source, setSource] = useState<DiscoverySource | null>(null);
  const [studyTarget, setStudyTarget] = useState<StudyTarget>('en');
  const [level, setLevel] = useState<LevelChoice | null>(null);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [paywallBusy, setPaywallBusy] = useState(false);
  const [ageAnswer, setAgeAnswer] = useState<AgeAnswer>(null);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  // Меню «···» на пейволе и шит ввода кода (промокод / код друга).
  const [paywallMenuOpen, setPaywallMenuOpen] = useState(false);
  const [codeSheet, setCodeSheet] = useState<'promo' | 'referral' | null>(null);
  const [codeValue, setCodeValue] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [remoteEnabledSteps, setRemoteEnabledSteps] = useState(getEnabledOnboardingSteps);
  // зачем: оба рубильника читаются как обычные kill-switch'и и обновляются по
  // тому же событию remote_config_changed, что и список экранов — владелец
  // выключает их из админки без релиза, живые сессии подхватывают за секунды.
  const [skipEnabled, setSkipEnabled] = useState(() => getRemoteBool('onboarding_skip_enabled'));
  const [welcomeSheetEnabled, setWelcomeSheetEnabled] = useState(
    () => getRemoteBool('onboarding_welcome_sheet_enabled'),
  );
  const finishingRef = useRef(false);
  const paywallTransitionBusyRef = useRef(false);

  const selectedLevel = level ?? 'a2';
  const {
    selected: selectedBillingPlan,
    selectPlan: selectBillingPlan,
    yearlyPrice,
    monthlyPrice,
    yearlyPerMonth,
    lifetimePrice,
    lifetimeAvailable,
    loading: paywallLoading,
    restoring: paywallRestoring,
    purchasing: paywallPurchasing,
    offeringsFailed: paywallOfferingsFailed,
    ctaDisabled: paywallCtaDisabled,
    reloadOfferings,
    handleRestore,
    handlePurchase: paywallHandlePurchase,
  } = usePaywallPurchase({
    variant: 'C',
    context: 'personal_plan',
    source: 'onboarding_plan',
    lang,
    forceTrialUI: true,
  });

  const enabledOrder = useMemo(
    () => resolveEnabledOnboardingOrder(remoteEnabledSteps, SHOW_ONBOARDING_LANGUAGE_STEP),
    [remoteEnabledSteps],
  );

  const persistStep = useCallback(async (next: CleanOnboardingStep) => {
    await AsyncStorage.multiSet([
      [FLOW_VERSION_KEY, CLEAN_ONBOARDING_FLOW_VERSION],
      [STEP_KEY, next],
    ]).catch(() => {});
  }, []);

  const go = useCallback((requested: CleanOnboardingStep) => {
    const next = resolveOnboardingStep(enabledOrder, requested, 'current-or-forward');
    setStep(next);
    void persistStep(next);
    trackOnboardingStepView({ step: next });
  }, [enabledOrder, persistStep]);

  const { displayStep, slideStyle } = useStepSlide(step);

  const back = useCallback(() => {
    const previous = resolveOnboardingStep(enabledOrder, step, 'backward');
    if (previous === step) return;
    go(previous);
  }, [enabledOrder, go, step]);

  // зачем: владелец (2026-07-26) — «Пропустить» ведёт сразу к обязательному шагу
  // «Имя и согласия». Пропущенные ответы НЕ ломают план: selectedGoal/Level/
  // Minutes выше уже имеют дефолты (everyday / a2 / 10), человек поменяет их в
  // настройках. Флаг для аналитики — чтобы в админке считать % пропустивших.
  const skippedRef = useRef(false);
  const skipOnboarding = useCallback(() => {
    if (skippedRef.current || step === MANDATORY_ONBOARDING_STEP) return; // защита от двойного тапа
    skippedRef.current = true;
    trackOnboarding('onboarding_skip', { step });
    // зачем: процент пропустивших владелец смотрит в админке, а она читает
    // Firestore. Пишем ОДНУ запись на пользователя (пропустить можно один раз —
    // защищено skippedRef), поэтому на стоимость это не влияет.
    void import('../app/app_activity')
      .then(({ trackActivity }) => trackActivity('onboarding_skip', {
        feature: 'onboarding',
        screen: 'onboarding',
        result: 'info',
        tags: { step },
        writeToFirestore: true,
      }))
      .catch(() => {});
    go(MANDATORY_ONBOARDING_STEP);
  }, [go, step]);

  // null = ссылки нет: выключено из админки (kill-switch) — тогда контекст пуст.
  const skipHandler = useMemo(
    () => (skipEnabled ? skipOnboarding : null),
    [skipEnabled, skipOnboarding],
  );

  useEffect(() => {
    const subscription = onAppEvent('remote_config_changed', () => {
      setRemoteEnabledSteps(getEnabledOnboardingSteps());
      setSkipEnabled(getRemoteBool('onboarding_skip_enabled'));
      setWelcomeSheetEnabled(getRemoteBool('onboarding_welcome_sheet_enabled'));
    });
    return () => subscription.remove();
  }, []);

  // зачем: воронка «где чаще всего выходят» в админке. Пишем последний увиденный
  // экран ОДИН раз при уходе в фон — подписка не пересоздаётся на каждом шаге
  // (шаг читаем из ref), и запись не делается, если онбординг уже завершён.
  const exitStepRef = useRef(step);
  exitStepRef.current = step;
  const exitLoggedRef = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') { exitLoggedRef.current = false; return; }
      if (exitLoggedRef.current || finishingRef.current) return;
      exitLoggedRef.current = true;
      trackOnboardingExit(exitStepRef.current);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (paywallBusy || paywallPurchasing || enabledOrder.includes(step)) return;
    go(resolveOnboardingStep(enabledOrder, step, 'current-or-forward'));
  }, [enabledOrder, go, paywallBusy, paywallPurchasing, step]);

  useEffect(() => {
    let active = true;
    if (startAtNameStep) {
      setStep('name');
      void persistStep('name');
      setRestored(true);
      return () => { active = false; };
    }
    AsyncStorage.multiGet([FLOW_VERSION_KEY, STEP_KEY, ONBOARDING_REQUESTED_STUDY_TARGET_KEY, PLAN_LEVEL_KEY, DISCOVERY_SOURCE_KEY])
      .then((rows) => {
        if (!active) return;
        const map = new Map(rows);
        const savedTarget = SHOW_ONBOARDING_LANGUAGE_STEP ? map.get(ONBOARDING_REQUESTED_STUDY_TARGET_KEY) : 'en';
        if (savedTarget === 'en' || savedTarget === 'fr') setStudyTarget(savedTarget);
        const savedLevel = map.get(PLAN_LEVEL_KEY);
        if (LEVEL_OPTIONS.some((item) => item.id === savedLevel)) setLevel(savedLevel as LevelChoice);
        const savedSource = map.get(DISCOVERY_SOURCE_KEY);
        if (DISCOVERY_OPTIONS.some((item) => item.id === savedSource)) setSource(savedSource as DiscoverySource);
        const savedStep = normalizedStoredStep(map.get(STEP_KEY) ?? null);
        const savedVersion = map.get(FLOW_VERSION_KEY);
        if (savedVersion === CLEAN_ONBOARDING_FLOW_VERSION && savedStep) {
          setStep(resolveOnboardingStep(enabledOrder, savedStep, 'current-or-forward'));
        } else {
          void persistStep('welcome');
        }
      })
      .finally(() => { if (active) setRestored(true); });
    return () => { active = false; };
  }, [enabledOrder, persistStep, startAtNameStep]);

  // Aggregate-only operational metric: it is independent of analytics consent
  // and carries no user/device/stable identifier. The helper persists one opaque
  // attempt token locally and the server deduplicates retries.
  useEffect(() => {
    if (!restored) return;
    void recordOnboardingFunnelStart();
  }, [restored]);

  useEffect(() => {
    let active = true;
    isGoogleSignInAvailable().then((ok) => { if (active) setGoogleAvailable(ok); }).catch(() => { if (active) setGoogleAvailable(false); });
    isAppleSignInAvailable().then((ok) => { if (active) setAppleAvailable(ok); }).catch(() => { if (active) setAppleAvailable(false); });
    return () => { active = false; };
  }, []);

  const handleAuth = useCallback(async (provider: AuthProviderId) => {
    if (authLoading) return;
    setAuthLoading(provider);
    setAuthError(null);
    try {
      const result = await withOnboardingAuthUiDeadline(signInWithProvider(provider));
      if (result.result === 'cancelled') return;
      if (result.result === 'error') {
        setAuthError(result.error === 'account_delete_pending'
          ? 'Этот аккаунт ещё удаляется. Попробуй позже.'
          // зачем: удаление аккаунта двухфазное — Firebase-юзер сначала блокируется
          // (disabled), а стирается фоновым воркером через 2-3 минуты. Вход в это окно
          // возвращает auth/user-disabled и раньше падал в общую заглушку «не получилось
          // войти» — владелец удалил аккаунт, попробовал войти и не понял, что происходит.
          : result.error.includes('user-disabled')
            ? 'Этот аккаунт ещё удаляется. Попробуй войти через пару минут.'
            : result.error.includes('google_signin_timeout')
              ? 'Google не ответил вовремя. Закрой окно входа, вернись в приложение и попробуй ещё раз.'
              : 'Не получилось войти. Попробуй ещё раз.');
        return;
      }
      // зачем: юзер нажал «У меня уже есть аккаунт» — он ЗАЯВИЛ, что возвращается.
      // created_new означает, что аккаунта с этой почтой у нас нет (первый вход этим
      // Google/Apple). Молча завести новый профиль — обмануть его ожидание: он ждёт
      // свой прогресс, а получит пустой экран и решит, что прогресс потерян. Поэтому
      // честно говорим «такого аккаунта нет» и спрашиваем, создавать ли. Привязка к
      // этому моменту УЖЕ произошла (signInWithProvider её выполнил), поэтому «Да»
      // ничего не делает заново — просто пускает дальше по обычному онбордингу,
      // но уже с привязанным аккаунтом. Отказ возвращает на выбор провайдера.
      if (result.result === 'created_new') {
        setUnknownAccountEmail(result.email ?? '');
        return;
      }
      await AsyncStorage.multiSet([
        [DONE_KEY, '1'],
        [FLOW_VERSION_KEY, CLEAN_ONBOARDING_FLOW_VERSION],
      ]).catch(() => {});
      await AsyncStorage.removeItem(STEP_KEY).catch(() => {});
      onDone();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setAuthError(detail.includes('signin_deadline-exceeded')
        ? 'Вход занимает слишком много времени. Вернись в приложение и попробуй ещё раз.'
        : 'Не получилось войти. Попробуй ещё раз.');
    } finally {
      setAuthLoading(null);
    }
  }, [authLoading, onDone]);

  // зачем: «Создать аккаунт» после того, как вход не нашёл существующий профиль.
  // Провайдер к этому моменту УЖЕ привязан (это сделал signInWithProvider), поэтому
  // здесь никакой сетевой работы нет — просто уводим человека в обычный онбординг
  // с первого шага. Отклик мгновенный, ждать нечего.
  const continueAsNewAccount = useCallback(() => {
    setUnknownAccountEmail(null);
    setAuthMode(false);
    setAuthError(null);
    // Просим 'language': при выключенном блоке языка resolve сам уведёт на
    // ближайший включённый шаг (promise).
    go('language');
  }, [go]);

  // Вход с экрана-сейфа (паттерн Bevel): для нового пользователя привязка
  // провайдера происходит здесь же (signInWithProvider создаёт/привязывает),
  // после чего идём дальше по онбордингу; найденный существующий аккаунт
  // завершает онбординг сразу (прогресс уже есть).
  const authFromPrivacy = useCallback(async (provider: AuthProviderId) => {
    if (authLoading) return;
    setAuthLoading(provider);
    setAuthError(null);
    try {
      const result = await withOnboardingAuthUiDeadline(signInWithProvider(provider));
      if (result.result === 'cancelled') return;
      if (result.result === 'error') {
        setAuthError(result.error.includes('user-disabled')
          ? 'Этот аккаунт ещё удаляется. Попробуй войти через пару минут.'
          : 'Не получилось войти. Попробуй ещё раз.');
        return;
      }
      if (result.result === 'created_new') {
        // Новый аккаунт уже привязан к провайдеру — просто продолжаем путь.
        go('source');
        return;
      }
      await AsyncStorage.multiSet([
        [DONE_KEY, '1'],
        [FLOW_VERSION_KEY, CLEAN_ONBOARDING_FLOW_VERSION],
      ]).catch(() => {});
      await AsyncStorage.removeItem(STEP_KEY).catch(() => {});
      onDone();
    } catch {
      setAuthError('Не получилось войти. Попробуй ещё раз.');
    } finally {
      setAuthLoading(null);
    }
  }, [authLoading, go, onDone]);

  const ensureEnglishStudyTarget = useCallback(async () => {
    setStudyTarget('en');
    await AsyncStorage.multiSet([
      [ONBOARDING_REQUESTED_STUDY_TARGET_KEY, 'en'],
      ['study_target_v1', 'en'],
    ]).catch(() => {});
    await setStoredStudyTarget('en', lang).catch(() => 'en');
    if (ENABLE_DEV_STUDY_TARGET_LANG) {
      await setDevStudyTargetLang('en', lang).catch(() => {});
      emitDevStudyTargetChanged();
    }
  }, [lang]);

  const chooseStudyTarget = useCallback(async (target: StudyTarget) => {
    setStudyTarget(target);
    await AsyncStorage.multiSet([
      [ONBOARDING_REQUESTED_STUDY_TARGET_KEY, target],
      ['study_target_v1', target],
    ]).catch(() => {});
    await setStoredStudyTarget(target, lang).catch(() => target);
    if (ENABLE_DEV_STUDY_TARGET_LANG) {
      await setDevStudyTargetLang(target, lang).catch(() => {});
      emitDevStudyTargetChanged();
    }
    if (target === 'fr') {
      void prefetchAndRecordStudyTargetServerPack('fr', lang).catch(() => {});
    }
  }, [lang]);

  const chooseSource = useCallback((next: DiscoverySource) => {
    setSource(next);
    void AsyncStorage.multiSet([
      [DISCOVERY_SOURCE_KEY, next],
      ['onboarding_source', next],
    ]).catch(() => {});
    trackOnboarding('onboarding_source_select', { source: next });
    // Просим 'language': при выключенном блоке языка resolve уведёт на promise.
    go('language');
  }, [go]);

  const chooseLevel = useCallback((next: LevelChoice) => {
    setLevel(next);
    void AsyncStorage.setItem(PLAN_LEVEL_KEY, next).catch(() => {});
    trackOnboarding('onboarding_plan_level_select', { level: next });
  }, []);

  const continueAfterNotificationDialog = useCallback(() => {
    InteractionManager.runAfterInteractions(() => go('trialReminder'));
  }, [go]);

  const requestPracticeNotification = useCallback(async () => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      const { granted, blocked } = await requestNotificationPermissionWithFallback().catch(
        () => ({ granted: false, blocked: false, openedSettings: false }),
      );
      if (granted) {
        await scheduleDailyReminder(20, 0, lang, { requestPermission: false, studyTarget }).catch(() => {});
        go('trialReminder');
        return;
      }
      if (blocked) {
        Alert.alert(
          'Напоминание не включилось',
          'Разрешение на уведомления отключено. Включить его можно в настройках телефона.',
          [
            { text: 'Позже', style: 'cancel', onPress: continueAfterNotificationDialog },
            {
              text: 'Открыть настройки',
              onPress: () => {
                Linking.openSettings().catch(() => {});
                go('trialReminder');
              },
            },
          ],
        );
        return;
      }
      go('trialReminder');
    } finally {
      setNotificationBusy(false);
    }
  }, [continueAfterNotificationDialog, go, lang, notificationBusy, studyTarget]);

  const choosePaywallPlan = useCallback((next: PaywallPlan) => {
    selectBillingPlan(next);
    void AsyncStorage.setItem(PLAN_BILLING_KEY, next).catch(() => {});
    trackOnboarding('onboarding_plan_billing_select', { plan: next });
  }, [selectBillingPlan]);

  // Личные учебные планы удалены из приложения, но pending-nickname ключ жив:
  // его читает finishPersonalPlanActivationFlow после успешной покупки и
  // возвращает пользователя В ОНБОРДИНГ на шаг «Имя» (а не на «спасибо»-экран).
  const queuePostPurchaseReturn = useCallback(async (billing: PaywallPlan = selectedBillingPlan) => {
    await AsyncStorage.multiSet([
      [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
      [PLAN_BILLING_KEY, billing],
    ]);
  }, [selectedBillingPlan]);

  // Переход «предупредим до конца пробного» → цены. Эффекты пейвола (pending-
  // возврат + трекинг) выполняются ровно один раз на переходе к экрану цен.
  const continueFromTrialReminder = useCallback(async () => {
    if (paywallBusy || paywallTransitionBusyRef.current) return;
    setPaywallBusy(true);
    try {
      const decision = decideOnboardingTransition(enabledOrder, 'trialReminder');
      await runOnboardingTransitionEffects(decision, paywallTransitionBusyRef, {
        createPendingPlan: () => queuePostPurchaseReturn('yearly'),
        preparePaywall: () => trackOnboardingPlanTrialCta({ plan: 'yearly' }),
        trackPaywallView: () => trackOnboardingPlanPaywallView({ plan: 'yearly' }),
      });
      go(decision.destination);
    } finally {
      setPaywallBusy(false);
    }
  }, [enabledOrder, go, paywallBusy, queuePostPurchaseReturn]);

  const continueFromOnboardingPaywall = useCallback(async () => {
    if (paywallBusy || paywallPurchasing) return;
    setPaywallBusy(true);
    try {
      // Ставим pending-возврат ДО покупки: после успеха хук вызывает
      // finishPersonalPlanActivationFlow, который читает pending-nickname ключ
      // и возвращает в онбординг на шаг «Имя».
      await queuePostPurchaseReturn(selectedBillingPlan);
      trackOnboardingPlanTrialCta({ plan: selectedBillingPlan });
      // Реальная покупка выбранного тарифа. Хук сам обрабатывает отмену
      // (userCancelled — тихо остаёмся на шаге), ошибку (свой Alert) и
      // навигацию при успехе (finishPersonalPlanActivationFlow → шаг «Имя»).
      await paywallHandlePurchase();
    } finally {
      setPaywallBusy(false);
    }
  }, [paywallBusy, paywallHandlePurchase, paywallPurchasing, queuePostPurchaseReturn, selectedBillingPlan]);

  // ── меню «···» на пейволе: промокод / код друга / восстановить ─────────────
  const openCodeSheet = useCallback((kind: 'promo' | 'referral') => {
    setPaywallMenuOpen(false);
    setCodeValue('');
    setCodeFeedback(null);
    setCodeSheet(kind);
  }, []);

  const submitCode = useCallback(async () => {
    const raw = codeValue.trim();
    if (!raw || codeBusy) return;
    setCodeBusy(true);
    setCodeFeedback(null);
    try {
      if (codeSheet === 'promo') {
        const { redeemPromoCodeWithPersist } = await import('../app/promo_code_entry');
        const res = await redeemPromoCodeWithPersist(raw);
        if (res.status === 'redeemed') {
          trackOnboarding('onboarding_promo_redeemed', { kind: res.rewardKind ?? 'days' });
          setCodeFeedback({
            ok: true,
            text: res.rewardKind === 'lifetime'
              ? 'Готово! Полный доступ активирован навсегда.'
              : `Готово! Полный доступ на ${Math.max(1, res.rewardDays ?? 1)} дн. активирован.`,
          });
          // Доступ уже выдан — цены больше не нужны, ведём к финальному шагу.
          setTimeout(() => { setCodeSheet(null); go('improve'); }, 900);
          return;
        }
        const text = res.status === 'not_found' ? 'Такого кода нет. Проверь опечатки.'
          : res.status === 'expired' ? 'Срок действия кода истёк.'
          : res.status === 'limit_reached' ? 'Лимит активаций этого кода исчерпан.'
          : res.status === 'already_redeemed' ? 'Этот код уже активирован на твоём аккаунте.'
          : res.status === 'bad_code' ? 'Код выглядит неверно: 3–32 латинских символа или цифр.'
          : res.status === 'promo_disabled' || res.status === 'disabled' ? 'Промокоды сейчас выключены. Попробуй позже.'
          : 'Не получилось активировать. Проверь сеть и попробуй ещё раз.';
        setCodeFeedback({ ok: false, text });
        return;
      }
      const { applyManualReferralCode } = await import('../app/referral_bootstrap');
      const status = await applyManualReferralCode(raw);
      if (status === 'applied' || status === 'already') {
        trackOnboarding('onboarding_referral_applied', { already: status === 'already' });
        setCodeFeedback({
          ok: true,
          text: status === 'applied' ? 'Код друга принят!' : 'Этот аккаунт уже привязан к другу.',
        });
        setTimeout(() => setCodeSheet(null), 900);
        return;
      }
      const text = status === 'invalid' ? 'Код выглядит неверно. Проверь опечатки.'
        : status === 'unknown_code' ? 'Такого кода нет. Проверь опечатки.'
        : status === 'self' ? 'Это твой собственный код — он не сработает.'
        : status === 'too_old' ? 'Код друга работает только для новых аккаунтов.'
        : status === 'disabled' ? 'Приглашения сейчас выключены. Попробуй позже.'
        : 'Не получилось применить код. Проверь сеть и попробуй ещё раз.';
      setCodeFeedback({ ok: false, text });
    } finally {
      setCodeBusy(false);
    }
  }, [codeBusy, codeSheet, codeValue, go]);

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    setLegalError(null);
    if (ageAnswer !== 'yes') {
      setLegalError(
        ageAnswer === 'no'
          ? `Приложение доступно с ${MIN_FULL_ACCESS_AGE} лет.`
          : `Подтверди, что тебе уже есть ${MIN_FULL_ACCESS_AGE}.`,
      );
      return;
    }
    finishingRef.current = true;
    try {
      const currentLevel = levelToCurrentLevel(selectedLevel);
      // Анкета плана удалена вместе с планами (владелец, 2026-08-16): профиль
      // получает спокойные дефолты, человек поменяет их в настройках.
      const profileMinutes: MinutesPerDay = 15;
      const targetLevel = targetAfterLevel(currentLevel);
      const estimatedDays = estimateDaysToTarget(currentLevel, targetLevel, profileMinutes);
      const targetDate = addDays(new Date(), estimatedDays || 30);
      const profile: UserProfile = {
        name: '',
        learningGoal: 'hobby',
        minutesPerDay: profileMinutes,
        currentLevel,
        targetLevel,
        preferredNotificationTime: '20:00',
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
        estimatedDaysToTarget: estimatedDays,
        estimatedTargetDate: targetDate.toISOString().split('T')[0],
      };

      await AsyncStorage.multiSet([
        ['user_profile', JSON.stringify(profile)],
        [GENERATED_NICKNAME_PENDING_KEY, JSON.stringify({ createdAt: Date.now() })],
        // Согласие с условиями дано на welcome (sign-in-wrap): до этого шага
        // нельзя дойти, не нажав «Начать» под строкой согласия.
        [LEGAL_ACCEPTED_KEY, '1'],
        [ANALYTICS_HELP_KEY, analyticsAllowed ? '1' : '0'],
        [DONE_KEY, '1'],
        [FLOW_VERSION_KEY, CLEAN_ONBOARDING_FLOW_VERSION],
      ]);
      // зачем: онбординг спрашивает только «есть ли 16» (self-attestation), а не год
      // рождения. Раньше здесь синтезировался фиктивный год (текущий − 16) и уезжал в
      // Firestore как персональные данные — бесполезный (у всех одинаковый) и лишний
      // по GDPR ст. 5(1)(c). Пишем ровно тот факт, который пользователь подтвердил.
      await confirmAdultAgeAttestation().catch(() => null);
      if (analyticsAllowed) {
        await setAnalyticsConsent('granted').catch(() => null);
        if (source) {
          trackOnboarding('onboarding_source_select', {
            source,
            consented: true,
          });
        }
        trackOnboarding('onboarding_complete', {
          level: selectedLevel,
          target: studyTarget,
        });
      } else {
        await setAnalyticsConsent('denied').catch(() => null);
      }
      // Completion is emitted only after the validated finish path persisted
      // DONE_KEY. It is intentionally non-blocking: telemetry cannot hold the UI.
      // зачем: решение о согласии едет счётчиком на сервер, потому что отказ раньше
      // не оставлял следа НИГДЕ (аналитика гейтится согласием и отказавшихся не
      // видит) — без знаменателя долю согласий нельзя измерить, а значит нельзя
      // понять, хватит ли выборки на вердикт A/B-теста пейвола.
      void recordOnboardingFunnelCompletion(analyticsAllowed ? 'granted' : 'denied');
      // зачем: владелец (2026-07-27) — приветственную шторку показываем НЕ поверх
      // последнего экрана анкеты, а когда уже открылась главная. Поэтому здесь
      // только ставим одноразовый флаг и сразу отдаём управление; шторку поднимет
      // OnboardingWelcomeHost из _layout.tsx через OverlayArbiter. Рубильник
      // выключен → флага нет, поведение ровно как раньше.
      if (welcomeSheetEnabled) {
        await markOnboardingWelcomePending();
        trackOnboarding('onboarding_welcome_sheet_view', { skipped: skippedRef.current });
      }
      onDone();
      void resumePendingGeneratedNickname();
      void AsyncStorage.multiRemove([STEP_KEY, PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY]).catch(() => {});
      void recordConsentToCloud().catch(() => null);
      void scheduleDailyReminder(20, 0, lang, { requestPermission: false, studyTarget }).catch(() => {});
    } finally {
      finishingRef.current = false;
    }
  }, [
    ageAnswer,
    analyticsAllowed,
    lang,
    onDone,
    selectedLevel,
    source,
    studyTarget,
    welcomeSheetEnabled,
  ]);


  if (!restored) {
    return (
      <View style={styles.root}>
        <Background />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0C111B" />
        </View>
      </View>
    );
  }

  const renderWelcome = () => (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" />
      <Background />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.welcomeContent} testID="onboarding-welcome-screen">
          <View style={styles.welcomeLogoBlock}>
            <WelcomeLogo />
            {/* зачем: убран шрифто-сжимающий проп (запрещён, ужимал текст на iOS) — оба варианта
                короткие (макс. 2 строки при fontSize 34/lineHeight 39), запас numberOfLines={3}
                достаточен без сжатия шрифта */}
            <Text
              style={styles.welcomeTitle}
              numberOfLines={3}
            >
              {/* зачем: обещание «вернём прогресс» противоречит тому, что аккаунта не
                  нашлось — на этой развилке заголовок меняется на нейтральный, иначе
                  экран сам себе противоречит. */}
              {authMode
                ? (unknownAccountEmail !== null ? 'Начнём с чистого листа' : 'Вернём твой прогресс')
                : 'От первых слов до свободной речи.'}
            </Text>
            {/* Подтекст под заголовком убран (владелец, 2026-08-16): без «доп
                текстов» — заголовок несёт обещание сам. */}
          </View>

          {authMode && unknownAccountEmail !== null ? (
            <View style={styles.authButtons}>
              <Text style={styles.unknownAccountText}>
                {unknownAccountEmail
                  ? `Аккаунта ${unknownAccountEmail} у нас нет.`
                  : 'Такого аккаунта у нас нет.'}
              </Text>
              <PrimaryButton
                label="Создать аккаунт"
                onPress={continueAsNewAccount}
                testID="onboarding-unknown-account-create"
              />
              <SecondaryButton
                label="Войти другим способом"
                onPress={() => setUnknownAccountEmail(null)}
                testID="onboarding-unknown-account-retry"
              />
            </View>
          ) : authMode ? (
            <View style={styles.authButtons}>
              {googleAvailable ? (
                <GoogleSignInButton
                  label="Войти через Google"
                  variant="dark"
                  loading={authLoading === 'google'}
                  disabled={!!authLoading}
                  onPress={() => { void handleAuth('google'); }}
                />
              ) : null}
              {appleAvailable ? (
                <AppleSignInButton
                  label="Войти через Apple"
                  loading={authLoading === 'apple'}
                  disabled={!!authLoading}
                  onPress={() => { void handleAuth('apple'); }}
                />
              ) : null}
              {!googleAvailable && !appleAvailable ? (
                <Text style={styles.errorText}>Вход через Google или Apple недоступен на этом устройстве.</Text>
              ) : null}
              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
              <SecondaryButton
                label="Назад"
                onPress={() => { setAuthMode(false); setAuthError(null); }}
                testID="onboarding-auth-back"
              />
            </View>
          ) : (
            <View style={styles.welcomeButtons}>
              {/* Согласие — на первом экране, вплотную к «Начать» (владелец). */}
              <Text style={styles.welcomeLegalNote}>
                Продолжая, ты принимаешь{' '}
                <Text style={styles.welcomeLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>Условия</Text>
                {' '}и{' '}
                <Text style={styles.welcomeLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>Политику конфиденциальности</Text>.
              </Text>
              <PrimaryButton
                label="Начать"
                onPress={() => {
                  // Английский — единственный язык, пока блок выбора выключен:
                  // фиксируем таргет здесь (раньше это делал экран источника).
                  if (!SHOW_ONBOARDING_LANGUAGE_STEP) void ensureEnglishStudyTarget();
                  go('privacy');
                }}
                testID="onboarding-start"
              />
              <SecondaryButton label="У меня уже есть аккаунт" onPress={() => setAuthMode(true)} testID="onboarding-existing-account" />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Экран-сейф (Bevel «Privacy by design», кадр 2): обещание приватности,
  // сейф-иллюстрация, строка условий вплотную к кнопкам входа (sign-in-wrap —
  // юридическое согласие живёт здесь), вход с Apple/Google, «Позже» — мимо.
  const renderPrivacy = () => (
    <ScreenFrame
      step="privacy"
      title="Твои данные — только твои"
      plainTitle
      onBack={back}
      footer={(
        <>
          {appleAvailable ? (
            <AppleSignInButton
              label="Продолжить с Apple"
              loading={authLoading === 'apple'}
              disabled={!!authLoading}
              onPress={() => { void authFromPrivacy('apple'); }}
            />
          ) : null}
          {googleAvailable ? (
            <GoogleSignInButton
              label="Продолжить с Google"
              variant="dark"
              loading={authLoading === 'google'}
              disabled={!!authLoading}
              onPress={() => { void authFromPrivacy('google'); }}
            />
          ) : null}
          {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
          <SecondaryButton label="Позже" onPress={() => go('source')} testID="onboarding-privacy-later" />
        </>
      )}
    >
      <Text style={styles.privacySubtitle}>Мы ничего не продаём и никому не передаём.</Text>
      <PrivacyVault />
    </ScreenFrame>
  );

  const renderSource = () => (
    <ScreenFrame
      step="source"
      title="Как ты узнал о нас?"
      onBack={back}
    >
      <View style={styles.optionList}>
        {DISCOVERY_OPTIONS.map((item) => (
          <OptionCard
            key={item.id}
            option={item}
            selected={source === item.id}
            testID={`onboarding-source-${item.id}`}
            onPress={() => chooseSource(item.id)}
          />
        ))}
      </View>
    </ScreenFrame>
  );

  const renderLanguage = () => (
    <ScreenFrame
      step="language"
      title="Какой язык учим?"
      onBack={back}
      footer={<PrimaryButton label="Выбрать язык" onPress={() => go('level')} testID="onboarding-language-continue" />}
    >
      <View style={styles.optionList}>
        {LANGUAGE_OPTIONS.map((item) => (
          <LanguageCard
            key={item.id}
            option={item}
            selected={studyTarget === item.id}
            onPress={() => { void chooseStudyTarget(item.id); }}
          />
        ))}
      </View>
    </ScreenFrame>
  );

  const renderLevel = () => (
    <ScreenFrame
      step="level"
      title={level ? reactionForLevel(level, studyTarget) : `Сколько ${targetLabel(studyTarget)} ты уже знаешь?`}
      onBack={back}
      footer={<PrimaryButton label="Продолжить" onPress={() => go('promise')} disabled={!level} testID="onboarding-level-continue" />}
    >
      <View style={styles.optionList}>
        {LEVEL_OPTIONS.map((item) => (
          <OptionCard
            key={item.id}
            option={item}
            selected={level === item.id}
            testID={`onboarding-level-${item.id}`}
            onPress={() => chooseLevel(item.id)}
          />
        ))}
      </View>
    </ScreenFrame>
  );

  // Обязательный экран прогресса (владелец, 2026-08-16): анимированный график
  // с вехами времени. Демонстрационной кнопки здесь нет — владелец убрал.
  const renderPromise = () => (
    <ScreenFrame
      step="promise"
      title="Ты заговоришь. Это устроено так."
      plainTitle
      onBack={back}
      footer={<PrimaryButton label="Продолжить" onPress={() => go('notifications')} testID="onboarding-promise-continue" />}
    >
      <PromiseChart />
      {/* Тексты — по Библии Phraseman: облегчение вместо мечты, трансформация
          вместо механики. По тапу раскрывается пояснение (владелец, 2026-08-16). */}
      <View style={styles.promiseFactList}>
        <PromiseFact
          index={0}
          icon="repeat-outline"
          title="Не вспоминай с нуля"
          detail="Фраза возвращается ровно тогда, когда ты почти её забыл. Повторил за секунду — и она твоя."
        />
        <PromiseFact
          index={1}
          icon="time-outline"
          title="Пары минут в день хватает"
          detail="Один раунд — пока ждёшь кофе. Каждый день понемногу — сильнее, чем час раз в неделю."
        />
      </View>
    </ScreenFrame>
  );

  const renderNotifications = () => (
    <ScreenFrame
      step="notifications"
      title="Напомнить о занятии"
      onBack={back}
      footer={
        <>
          <PrimaryButton label="Включить напоминание" onPress={requestPracticeNotification} loading={notificationBusy} testID="onboarding-notifications-allow" />
          <Pressable
            testID="onboarding-notifications-skip"
            onPressIn={() => { void hapticTap(); }}
            onPress={() => go('trialReminder')}
            style={styles.textButton}
            accessibilityRole="button"
          >
            <Text style={styles.textButtonLabel}>Не сейчас</Text>
          </Pressable>
        </>
      }
    >
      <Image source={ONBOARDING_ASSETS.notifications} style={styles.notificationAsset} resizeMode="contain" />
      <NotificationMock />
    </ScreenFrame>
  );

  // Честность до цен (паттерн Bevel): обещаем пуш ДО конца пробного и прямо
  // говорим «сейчас ничего не спишем». Снимает главный страх триала — «забуду
  // отменить» — до того, как человек увидит цену.
  const renderTrialReminder = () => (
    <ScreenFrame
      step="trialReminder"
      title="Сначала — неделя бесплатно"
      plainTitle
      onBack={back}
      footer={(
        <>
          <PrimaryButton
            label="Продолжить"
            onPress={() => void continueFromTrialReminder()}
            loading={paywallBusy}
            testID="onboarding-trial-reminder-continue"
          />
          <View style={styles.trialReassureRow}>
            <Ionicons name="checkmark-circle" size={17} color="#12805A" />
            <Text style={styles.trialReassureText}>Сейчас ничего не спишем</Text>
          </View>
        </>
      )}
    >
      <AnimatedPushCard>
        <View style={styles.trialPushIcon}>
          <Ionicons name="notifications" size={19} color="#FFFFFF" />
        </View>
        <View style={styles.trialPushCopy}>
          <Text style={styles.trialPushTitle}>Пробный период заканчивается</Text>
          <Text style={styles.trialPushBody}>Напомним за 2 дня — успеешь отменить, если не подойдёт.</Text>
        </View>
        <Text style={styles.trialPushWhen}>день 5</Text>
      </AnimatedPushCard>
      <View style={styles.trialTimeline}>
        <TrialTimelineRow index={0} icon="lock-open-outline" title="Сегодня — полный доступ сразу" />
        <TrialTimelineRow index={1} icon="notifications-outline" title="День 5 — напомним пушем" />
        <TrialTimelineRow index={2} icon="card-outline" title="День 7 — подписка, отмена в любой момент" />
      </View>
    </ScreenFrame>
  );

  const renderOnboardingPaywall = () => {
    // Apple 3.1.2(c): списываемая сумма (billed amount) должна быть самым крупным
    // и заметным ценовым элементом. Поэтому у «Года» КРУПНО показываем полную цену
    // за год ($24.99 в год), а расчётную цену за месяц ($2.08 / мес) — мелкой
    // подписью снизу. Для «Месяца» списываемая сумма и есть месячная цена.
    const yearlyLabel = yearlyPrice ? `${yearlyPrice} в год` : 'Год';
    const yearlySubLabel = yearlyPerMonth ? `${yearlyPerMonth} / мес` : undefined;
    const monthlyLabel = monthlyPrice ? `${monthlyPrice} / мес` : 'Месяц';
    const lifetimeLabel = lifetimePrice || (lifetimeAvailable ? 'Разовая покупка' : 'Разовый доступ');
    return (
      <ScreenFrame
        step="onboardingPaywall"
        title="Открой полный доступ Phraseman Plus"
        // Крестик СЛЕВА (владелец, 2026-08-16, паттерн Bevel): закрыть цены =
        // продолжить бесплатно, то есть уйти на финальный обязательный шаг.
        onClose={() => go('improve')}
        headerRight={(
          <Pressable
            testID="onboarding-paywall-menu"
            onPressIn={() => { void hapticTap(); }}
            onPress={() => setPaywallMenuOpen(true)}
            style={({ pressed }) => [styles.paywallMenuButton, pressed && styles.pressed]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Ещё: промокод, код друга, восстановить покупку"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#0C111B" />
          </Pressable>
        )}
        plainTitle
        footer={
          <>
            <PrimaryButton
              label={paywallOfferingsFailed ? 'Повторить' : 'Продолжить'}
              onPress={() => {
                if (paywallOfferingsFailed) { reloadOfferings(); return; }
                void continueFromOnboardingPaywall();
              }}
              loading={paywallBusy || paywallPurchasing || (paywallLoading && !paywallOfferingsFailed)}
              disabled={paywallCtaDisabled && !paywallOfferingsFailed}
              testID="onboarding-paywall-continue"
              flat
            />
            {/* Внизу — оплата и тексты (владелец): «не спишем сейчас», бесплатный
                путь и юридические ссылки вплотную к кнопке покупки. */}
            <View style={styles.trialReassureRow}>
              <Ionicons name="checkmark-circle" size={16} color="#12805A" />
              <Text style={styles.paywallReassureText}>Сейчас ничего не спишем — напомним до конца пробного</Text>
            </View>
            <View style={styles.paywallFooterLinks}>
              <Pressable
                testID="onboarding-paywall-continue-free"
                onPressIn={() => { void hapticTap(); }}
                onPress={() => go('improve')}
                accessibilityRole="button"
              >
                <Text style={styles.paywallFooterLink}>Продолжить бесплатно</Text>
              </Pressable>
            </View>
            <Text style={styles.paywallLegalNote}>
              Отмена в любой момент в настройках магазина.{' '}
              <Text style={styles.paywallLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>Условия</Text>
              {' '}·{' '}
              <Text style={styles.paywallLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>Конфиденциальность</Text>
            </Text>
          </>
        }
      >
        {/* Оригинальная таблица выгод двумя колонками FREE/PLUS (владелец,
            2026-08-16) — видно, что именно добавится к бесплатному. */}
        <View style={styles.cmpHeaderRow}>
          <View style={styles.cmpLabelCell} />
          <Text style={styles.cmpHeaderFree}>FREE</Text>
          <Text style={styles.cmpHeaderPlus}>PLUS</Text>
        </View>
        <View style={styles.cmpList}>
          {PAYWALL_COMPARISON_BENEFITS.map((item, index) => (
            <PlanComparisonRow key={item.title} index={index} icon={item.icon} title={item.title} />
          ))}
        </View>
        <View style={styles.paywallPlanList}>
          <PaywallPlanCard
            plan="yearly"
            title="Год"
            price={paywallLoading ? 'Загрузка цены...' : yearlyLabel}
            subprice={paywallLoading ? undefined : yearlySubLabel}
            badge="лучший старт"
            selected={selectedBillingPlan === 'yearly'}
            onPress={choosePaywallPlan}
            asset={ONBOARDING_ASSETS.paywallYearly}
            testID="onboarding-paywall-plan-yearly"
          />
          <PaywallPlanCard
            plan="monthly"
            title="Месяц"
            price={paywallLoading ? 'Загрузка цены...' : monthlyLabel}
            selected={selectedBillingPlan === 'monthly'}
            onPress={choosePaywallPlan}
            asset={ONBOARDING_ASSETS.paywallMonthly}
            testID="onboarding-paywall-plan-monthly"
          />
          <PaywallPlanCard
            plan="lifetime"
            title="Phraseman Pro"
            price={paywallLoading ? 'Загрузка цены...' : lifetimeLabel}
            badge="разово"
            selected={selectedBillingPlan === 'lifetime'}
            onPress={choosePaywallPlan}
            asset={ONBOARDING_ASSETS.paywallLifetime}
            testID="onboarding-paywall-plan-lifetime"
          />
        </View>
        {paywallMenuOpen ? (
          <Modal transparent animationType="fade" visible onRequestClose={() => setPaywallMenuOpen(false)}>
            <Pressable style={styles.menuScrim} onPress={() => setPaywallMenuOpen(false)} accessibilityLabel="Закрыть меню">
              <View style={styles.paywallMenuCard}>
                <Pressable
                  testID="onboarding-paywall-menu-promo"
                  style={({ pressed }) => [styles.paywallMenuItem, pressed && styles.pressed]}
                  onPress={() => openCodeSheet('promo')}
                  accessibilityRole="button"
                >
                  <Ionicons name="pricetag-outline" size={19} color="#0C111B" />
                  <Text style={styles.paywallMenuItemText}>Ввести промокод</Text>
                </Pressable>
                <Pressable
                  testID="onboarding-paywall-menu-referral"
                  style={({ pressed }) => [styles.paywallMenuItem, pressed && styles.pressed]}
                  onPress={() => openCodeSheet('referral')}
                  accessibilityRole="button"
                >
                  <Ionicons name="gift-outline" size={19} color="#0C111B" />
                  <Text style={styles.paywallMenuItemText}>Код от друга</Text>
                </Pressable>
                <Pressable
                  testID="onboarding-paywall-restore"
                  style={({ pressed }) => [styles.paywallMenuItem, styles.paywallMenuItemLast, pressed && styles.pressed]}
                  onPress={() => { setPaywallMenuOpen(false); void handleRestore(); }}
                  disabled={paywallRestoring}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh-outline" size={19} color="#0C111B" />
                  <Text style={styles.paywallMenuItemText}>{paywallRestoring ? 'Восстанавливаем...' : 'Восстановить покупку'}</Text>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        ) : null}
        {codeSheet ? (
          <Modal transparent animationType="fade" visible onRequestClose={() => setCodeSheet(null)}>
            <Pressable style={styles.codeScrim} onPress={() => { if (!codeBusy) setCodeSheet(null); }} accessibilityLabel="Закрыть ввод кода">
              <Pressable style={styles.codeCard} onPress={() => {}}>
                <Text style={styles.codeTitle}>{codeSheet === 'promo' ? 'Промокод' : 'Код от друга'}</Text>
                <TextInput
                  testID="onboarding-code-input"
                  style={styles.codeInput}
                  value={codeValue}
                  onChangeText={(next) => { setCodeValue(next); setCodeFeedback(null); }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                  placeholder={codeSheet === 'promo' ? 'PHRASE20' : 'КОД ДРУГА'}
                  placeholderTextColor="#9AA1B0"
                  editable={!codeBusy}
                  onSubmitEditing={() => { void submitCode(); }}
                  returnKeyType="done"
                />
                {codeFeedback ? (
                  <Text style={[styles.codeFeedback, codeFeedback.ok ? styles.codeFeedbackOk : styles.codeFeedbackError]}>
                    {codeFeedback.text}
                  </Text>
                ) : null}
                <PrimaryButton
                  label="Применить"
                  onPress={() => { void submitCode(); }}
                  loading={codeBusy}
                  disabled={!codeValue.trim()}
                  testID="onboarding-code-submit"
                  flat
                />
                <Pressable
                  onPress={() => { if (!codeBusy) setCodeSheet(null); }}
                  style={styles.codeCancel}
                  accessibilityRole="button"
                >
                  <Text style={styles.codeCancelText}>Отмена</Text>
                </Pressable>
              </Pressable>
            </Pressable>
          </Modal>
        ) : null}
      </ScreenFrame>
    );
  };

  // Экран-объяснение перед согласиями — композиция Bevel «Help us improve»
  // (кадр 5) один в один: пустой верх, иллюстрация в центре (сердце + иконки
  // на пунктирных связях), заголовок ПОД ней, абзац, одна кнопка.
  const renderImprove = () => (
    <ScreenFrame
      step="improve"
      onBack={back}
      center
      footer={<PrimaryButton label="Продолжить" onPress={() => go('name')} testID="onboarding-improve-continue" />}
    >
      <ImproveConstellation />
      <Text style={styles.improveTitle}>Помоги сделать Phraseman лучше</Text>
      <Text style={styles.improveBody}>
        Мы видим только цифры: где урок даётся легко, а где все спотыкаются.
        Ни имени, ни голоса — ничего личного.
        Эти цифры делают Phraseman лучше для всех.
      </Text>
    </ScreenFrame>
  );

  const renderName = () => (
    <ScreenFrame
      step="name"
      title="Почти готово"
      plainTitle
      onBack={back}
      footer={(
        <PrimaryButton
          label="Начать обучение"
          onPress={() => {
            Keyboard.dismiss();
            void finish();
          }}
          disabled={ageAnswer !== 'yes'}
          testID="onboarding-finish"
        />
      )}
    >
      {/* Порядок по решению владельца (2026-08-16): сначала добровольная галочка
          аналитики, ниже — обязательный вопрос возраста с коротким «почему». */}
      <Pressable
        testID="onboarding-analytics-checkbox"
        onPressIn={() => { void hapticTap(); }}
        onPress={() => setAnalyticsAllowed((value) => !value)}
        style={[styles.consentDecisionRow, analyticsAllowed && styles.consentDecisionRowSelected]}
        accessibilityRole="switch"
        accessibilityState={{ checked: analyticsAllowed }}
      >
        {/* Макет .subrow: кольцо слева, вся строка — цель нажатия; отдельного
            переключателя справа в утверждённом макете нет. */}
        <View style={[styles.consentDecisionIcon, analyticsAllowed && styles.consentDecisionIconOn]}>
          {analyticsAllowed ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
        </View>
        <View style={styles.consentDecisionCopy}>
          <Text style={styles.consentDecisionTitle}>Делиться анонимной статистикой</Text>
        </View>
      </Pressable>
      {/* Возраст — вопросом с «Да/Нет» (владелец, 2026-08-16): короче и честнее,
          чем две длинные кнопки-утверждения. */}
      {/* Коротко и прямо (владелец, 2026-08-16): без ссылок на закон. */}
      <Text style={styles.ageIntro}>
        {`Phraseman — для тех, кому уже есть ${MIN_FULL_ACCESS_AGE}.`}
      </Text>
      <Text style={styles.ageQuestion}>{`Тебе есть ${MIN_FULL_ACCESS_AGE}?`}</Text>
      <View style={styles.ageButtons}>
        <Pressable
          testID="onboarding-age-yes"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => { setAgeAnswer('yes'); setLegalError(null); }}
          style={({ pressed }) => [styles.ageButton, ageAnswer === 'yes' && styles.ageButtonSelected, pressed && styles.pressed]}
        >
          <Text style={styles.ageButtonText}>Да</Text>
        </Pressable>
        <Pressable
          testID="onboarding-age-no"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => {
            setAgeAnswer('no');
            setLegalError(`Приложение доступно с ${MIN_FULL_ACCESS_AGE} лет.`);
          }}
          style={({ pressed }) => [styles.ageButton, ageAnswer === 'no' && styles.ageButtonSelected, pressed && styles.pressed]}
        >
          <Text style={styles.ageButtonText}>Нет</Text>
        </Pressable>
      </View>
      {/* Согласие с условиями дано на welcome (sign-in-wrap над кнопкой «Начать»);
          здесь остаются только ссылки — правила всегда под рукой. */}
      <View style={styles.consentLegalLinks}>
        <Text style={styles.linkText} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>Условия</Text>
        <Text style={styles.linkText} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>Конфиденциальность</Text>
      </View>
      {legalError ? <Text style={styles.errorText}>{legalError}</Text> : null}
    </ScreenFrame>
  );
  // Welcome (свои анимации) и aha (полноэкранная сцена со своими переходами)
  // рисуем без слайд-обёртки; остальным шагам даём плавную смену.
  const renderStep = (which: CleanOnboardingStep): React.ReactNode => {
    switch (which) {
      case 'welcome': return renderWelcome();
      case 'privacy': return renderPrivacy();
      case 'source': return renderSource();
      case 'language': return renderLanguage();
      case 'level': return renderLevel();
      case 'promise': return renderPromise();
      case 'notifications': return renderNotifications();
      case 'trialReminder': return renderTrialReminder();
      case 'onboardingPaywall': return renderOnboardingPaywall();
      case 'improve': return renderImprove();
      case 'name': return renderName();
      default: return renderWelcome();
    }
  };

  const bare = displayStep === 'welcome';

  return (
    <OnboardingOrderContext.Provider value={enabledOrder}>
    <OnboardingSkipContext.Provider value={skipHandler}>
    <View style={styles.root}>
      <Background />
      {bare ? (
        renderStep(displayStep)
      ) : (
        <Animated.View style={[styles.stepSlide, slideStyle]}>{renderStep(displayStep)}</Animated.View>
      )}
      {accountDeletedNotice && (
        <AccountDeletedNotice
          onDone={() => setAccountDeletedNotice(false)}
          message={triLang(lang, {
            ru: 'Вы удалили все свои данные',
            uk: 'Ви видалили всі свої дані',
            es: 'Has eliminado todos tus datos',
            'pt-BR': 'Você excluiu todos os seus dados',
            vi: 'Bạn đã xóa toàn bộ dữ liệu của mình',
            id: 'Kamu telah menghapus semua datamu',
            tr: 'Tüm verilerini sildin',
            pl: 'Usunięto wszystkie Twoje dane',
          })}
        />
      )}
    </View>
    </OnboardingSkipContext.Provider>
    </OnboardingOrderContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F1F2F6',
  },
  // Светлая подложка макета — единственный слой фона.
  backdrop: {
    backgroundColor: '#F1F2F6',
  },
  safe: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Макет .topbar: высота 52, горизонтальные поля 18, кнопка слева — слот справа.
  progressHeader: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
  },
  // Макет .circbtn: круг 44 на белом с мягкой тенью.
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#0C111B', radius: 3, opacity: 0.09, offsetY: 1, backgroundColor: '#FFFFFF' }),
  },
  headerRightSpacer: {
    width: 44,
    height: 44,
  },
  hidden: {
    opacity: 0,
  },
  scrollShell: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 0,
  },
  scrollContentCenter: {
    justifyContent: 'center',
  },
  frameChildren: {
    flexGrow: 1,
  },
  stepSlide: {
    flex: 1,
  },
  // Макет .h1 — единственная типографика заголовка экрана.
  plainTitle: {
    color: '#0C111B',
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.68,
    textAlign: 'center',
    marginBottom: 10,
  },
  // Макет .dock: прозрачный, без разделителя, вертикальный ритм 11.
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    gap: 11,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  welcomeLogoBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  // Макет .mark
  logoImageLarge: {
    width: 96,
    height: 96,
    alignSelf: 'center',
    marginBottom: 26,
  },
  // Макет .h1.lg
  welcomeTitle: {
    color: '#0C111B',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.78,
    textAlign: 'center',
  },
  welcomeButtons: {
    gap: 11,
  },
  authButtons: {
    gap: 11,
  },
  primaryButtonOuter: {
    minHeight: 60,
    borderRadius: 30,
  },
  primaryButton: {
    minHeight: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 0,
  },
  // Макет: у таблетки нет «подложки-тени» снизу — блок схлопнут в ноль.
  primaryButtonShadow: {
    height: 0,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  // Макет: вторичное действие — «призрак» без фона и рамки.
  secondaryButton: {
    minHeight: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#8A91A1',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  compassRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 18,
  },
  compassRowCompact: {
    marginBottom: 16,
  },
  logoImageSmall: {
    width: 76,
    height: 76,
  },
  speechBubble: {
    flex: 1,
    minHeight: 66,
    borderRadius: 18,
    borderWidth: 0,
    borderColor: '#E7E9F0',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  speechText: {
    color: '#0C111B',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
  optionList: {
    gap: 9,
  },
  optionCard: {
    minHeight: 62,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 17,
    gap: 13,
  },
  // Макет: выбранный вариант обводится чернильной рамкой, фон не меняется.
  optionCardSelected: {
    borderColor: '#0C111B',
  },
  optionAsset: {
    width: 48,
    height: 48,
  },
  optionCopy: {
    flex: 1,
  },
  // Макет .opt-t
  optionTitle: {
    color: '#0C111B',
    fontSize: 16.5,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.17,
  },
  // Макет .tick: скруглённый квадрат, а не кружок; выбранный заливается чернилами.
  radio: {
    width: 23,
    height: 23,
    borderRadius: 7,
    backgroundColor: '#EDEFF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: '#0C111B',
  },
  languageCard: {
    minHeight: 88,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  languageCardSelected: {
    borderColor: '#0C111B',
  },
  languageAsset: {
    width: 76,
    height: 48,
  },
  languageTitle: {
    color: '#0C111B',
    fontSize: 16.5,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.17,
    marginTop: 2,
  },
  radioLarge: {
    width: 23,
    height: 23,
    borderRadius: 7,
    backgroundColor: '#EDEFF4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioLargeSelected: {
    backgroundColor: '#0C111B',
  },
  notificationMockWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 38,
  },
  notificationMock: {
    width: '84%',
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: '#F8F8F8',
    overflow: 'hidden',
  },
  notificationMockTitle: {
    color: '#0C111B',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
    letterSpacing: -0.16,
    textAlign: 'center',
    paddingTop: 19,
    paddingHorizontal: 17,
  },
  notificationMockBody: {
    color: '#3A4150',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 17,
    paddingTop: 5,
    paddingBottom: 15,
  },
  notificationMockActions: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(60, 60, 67, 0.29)',
    flexDirection: 'row',
  },
  notificationMockMuted: {
    flex: 1,
    color: '#3B4EDB',
    fontSize: 16.5,
    fontWeight: '400',
    textAlign: 'center',
    paddingVertical: 12,
  },
  notificationMockAllow: {
    flex: 1,
    color: '#3B4EDB',
    fontSize: 16.5,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 12,
    borderLeftWidth: 0.5,
    borderLeftColor: 'rgba(60, 60, 67, 0.29)',
  },
  notificationArrow: {
    marginTop: 12,
  },
  notificationAsset: {
    width: '100%',
    height: 86,
    marginTop: 0,
  },
  textButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  textButtonLabel: {
    color: '#8A91A1',
    fontSize: 16,
    fontWeight: '500',
  },
  // зачем: «Пропустить» — вспомогательный выход, а не второе главное действие.
  // Тише основной кнопки (приглушённый тон, вес 700 по DESIGN.md), но с полной
  // зоной нажатия 44pt, чтобы попадать пальцем без промаха.
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    marginTop: 2,
  },
  skipLabel: {
    color: '#8A91A1',
    fontSize: 15,
    fontWeight: '500',
  },
  cmpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 4,
  },
  cmpHeaderFree: {
    width: 52,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
    color: '#8A91A1',
  },
  cmpHeaderPlus: {
    width: 52,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.4,
    color: '#3B4EDB',
  },
  cmpList: {
    marginTop: 2,
  },
  cmpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(16,24,40,0.08)',
  },
  cmpLabelCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cmpIcon: {
    width: 22,
  },
  cmpLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#0C111B',
  },
  cmpCell: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cmpDash: {
    width: 16,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#C9CDD7',
  },
  cmpCheckWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E4F7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallPlanList: {
    gap: 9,
  },
  // Макет .plan
  paywallPlanCard: {
    minHeight: 78,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: '#E3E6EC',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 10,
    ...noAndroidOutline,
  },
  paywallPlanCardSelected: {
    borderColor: '#0C111B',
    ...softShadow({ color: '#0C111B', radius: 10, opacity: 0.08, offsetY: 2, backgroundColor: '#FFFFFF' }),
  },
  paywallPlanAsset: {
    width: 42,
    height: 42,
  },
  paywallPlanCopy: {
    flex: 1,
  },
  paywallPlanTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  paywallPlanTitle: {
    color: '#0C111B',
    fontSize: 15.5,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.155,
  },
  // Макет .best: чернильный ярлык, а не сиреневый.
  paywallPlanBadge: {
    color: '#FFFFFF',
    backgroundColor: '#17191F',
    borderRadius: 5,
    overflow: 'hidden',
    paddingHorizontal: 7,
    paddingVertical: 3,
    fontSize: 9.5,
    lineHeight: 12,
    fontWeight: '700',
    letterSpacing: 0.48,
  },
  paywallPlanPrice: {
    color: '#0C111B',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: -0.38,
    marginTop: 5,
  },
  paywallPlanSubprice: {
    color: '#8A91A1',
    fontSize: 11.5,
    lineHeight: 15,
    fontWeight: '400',
    marginTop: 2,
  },
  paywallRadio: {
    width: 19,
    height: 19,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#C9CDD7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallRadioSelected: {
    backgroundColor: '#0C111B',
    borderColor: '#0C111B',
  },
  paywallFooterLinks: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  paywallFooterLink: {
    color: '#7C8394',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '400',
    textDecorationLine: 'underline',
  },
  consentTitle: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  // Макет: «Да»/«Нет» — те же карточки .opt, только контент по центру.
  ageButtons: {
    flexDirection: 'row',
    gap: 9,
    marginBottom: 0,
  },
  ageButton: {
    flex: 1,
    minHeight: 55,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 17,
  },
  ageButtonSelected: {
    borderColor: '#0C111B',
  },
  ageButtonText: {
    color: '#0C111B',
    fontSize: 16.5,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.17,
  },
  // Макет .subrow: белая строка, вся площадь — цель нажатия, кольцо слева.
  consentDecisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  consentDecisionRowSelected: {
    borderColor: '#0C111B',
  },
  // Макет .subrow .ring
  consentDecisionIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#C9CDD7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentDecisionIconOn: {
    backgroundColor: '#0C111B',
    borderColor: '#0C111B',
  },
  consentDecisionCopy: {
    flex: 1,
  },
  consentDecisionTitle: {
    color: '#0C111B',
    fontSize: 14.5,
    lineHeight: 20,
    fontWeight: '500',
  },
  consentLegalLinks: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 6,
    marginTop: 16,
  },
  linkText: {
    color: '#3A4150',
    textDecorationLine: 'underline',
  },
  // зачем: это НЕ ошибка, а нормальная развилка («аккаунта нет — создать?»), поэтому
  // не красный errorText. Тон спокойный и светлый, вес и кегль — на уровне основного
  // текста экрана, чтобы сообщение читалось как утверждение, а не как мелкая сноска.
  unknownAccountText: {
    color: '#0C111B',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  privacySubtitle: {
    color: '#8A91A1',
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 2,
  },
  vaultWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  vaultBody: {
    width: 216,
    height: 216,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#05070F', radius: 16, opacity: 0.55, offsetY: 14, backgroundColor: '#E9EDF4' }),
  },
  vaultBodyInnerEdge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 46,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.85)',
    margin: 8,
  },
  vaultHinge: {
    position: 'absolute',
    right: 12,
    top: 50,
    width: 9,
    height: 30,
    borderRadius: 5,
    backgroundColor: '#D9DDE6',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.7)',
  },
  vaultHingeBottom: {
    top: undefined,
    bottom: 50,
  },
  vaultPointer: {
    position: 'absolute',
    top: 30,
    width: 0,
    height: 0,
    borderLeftWidth: 7,
    borderRightWidth: 7,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F0B429',
  },
  vaultRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#E2E6EE',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#8A93A5', radius: 6, opacity: 0.35, offsetY: 3, backgroundColor: '#E2E6EE' }),
  },
  vaultTickHolder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  vaultTick: {
    width: 2.5,
    height: 9,
    marginTop: 4,
    borderRadius: 2,
    backgroundColor: '#B9C0CE',
  },
  vaultDial: {
    width: 70,
    height: 70,
    borderRadius: 35,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    ...softShadow({ color: '#7C8494', radius: 5, opacity: 0.4, offsetY: 3, backgroundColor: '#F2F4F9' }),
  },
  vaultDialMark: {
    width: 5,
    height: 15,
    borderRadius: 3,
    marginTop: 6,
    backgroundColor: '#8A91A1',
  },
  vaultSparkle: {
    position: 'absolute',
    top: 56,
    right: 64,
  },
  improveArt: {
    width: 250,
    height: 200,
    alignSelf: 'center',
    marginBottom: 26,
  },
  // Макет: сердце без плашки — только контур на подложке экрана.
  improveHeart: {
    position: 'absolute',
    left: 89,
    top: 70,
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Макет .imp-sat: белый квадрат со скруглением 17 и мягкой тенью, без рамки.
  improveSatellite: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#0C111B', radius: 14, opacity: 0.08, offsetY: 4, backgroundColor: '#FFFFFF' }),
  },
  improveSatelliteTop: {
    left: 99,
    top: 0,
  },
  improveSatelliteLeft: {
    left: 8,
    bottom: 16,
  },
  improveSatelliteRight: {
    right: 8,
    bottom: 10,
  },
  improveLink: {
    position: 'absolute',
    borderStyle: 'dashed',
    borderColor: '#C9CDD7',
    borderTopWidth: 1.5,
    width: 74,
  },
  improveLinkTop: {
    left: 118,
    top: 58,
    transform: [{ rotate: '90deg' }],
    width: 26,
  },
  improveLinkLeft: {
    left: 44,
    top: 132,
    transform: [{ rotate: '-28deg' }],
  },
  improveLinkRight: {
    right: 40,
    top: 128,
    transform: [{ rotate: '24deg' }],
  },
  improveTitle: {
    color: '#0C111B',
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.68,
    textAlign: 'center',
    marginBottom: 10,
  },
  improveBody: {
    color: '#7C8394',
    fontSize: 15.5,
    lineHeight: 23,
    textAlign: 'center',
    paddingHorizontal: 6,
  },
  promiseChartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 0,
    borderColor: 'transparent',
    paddingTop: 16,
    paddingBottom: 6,
    paddingHorizontal: 12,
    marginTop: 16,
    marginBottom: 14,
    position: 'relative',
    overflow: 'hidden',
    ...softShadow({ color: '#0C111B', radius: 16, opacity: 0.08, offsetY: 3, backgroundColor: '#FFFFFF' }),
  },
  promiseReveal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 10,
    right: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
  },
  promiseBadgeUp: {
    position: 'absolute',
    top: 14,
    right: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    ...softShadow({ color: '#25A97A', radius: 8, opacity: 0.35, offsetY: 2, backgroundColor: '#7DE0A6' }),
  },
  promiseBadgeUpText: {
    color: '#0C111B',
    fontSize: 12,
    fontWeight: '800',
  },
  promiseBadgeDown: {
    position: 'absolute',
    top: 96,
    left: 16,
    backgroundColor: '#EDEFF4',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  promiseBadgeDownText: {
    color: '#7C8394',
    fontSize: 12,
    fontWeight: '700',
  },
  promisePulse: {
    position: 'absolute',
    top: 22,
    right: 16,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#3ECF8E',
  },
  // Макет .pfact
  promiseFact: {
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 14,
    ...softShadow({ color: '#0C111B', radius: 10, opacity: 0.05, offsetY: 2, backgroundColor: '#FFFFFF' }),
  },
  promiseFactHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promiseFactIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EDF0FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseFactTitle: {
    flex: 1,
    color: '#0C111B',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.155,
  },
  promiseFactDetail: {
    color: '#7C8394',
    fontSize: 13.5,
    lineHeight: 21,
    marginTop: 9,
    marginLeft: 50,
  },
  promiseAxisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 7,
    paddingBottom: 6,
    borderTopWidth: 1,
    borderTopColor: '#EDEFF4',
  },
  promiseAxisLabel: {
    color: '#9AA1B0',
    fontSize: 11.5,
    fontWeight: '700',
  },
  promiseFactList: {
    gap: 9,
    marginTop: 14,
  },
  ageIntro: {
    color: '#7C8394',
    fontSize: 13.5,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 24,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  ageQuestion: {
    color: '#0C111B',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 10,
  },
  errorText: {
    color: '#E5563B',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  // ── welcome: sign-in-wrap согласие над кнопкой «Начать» ────────────────────
  welcomeLegalNote: {
    color: '#9AA1B0',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  welcomeLegalLink: {
    color: '#7C8394',
    textDecorationLine: 'underline',
  },
  // ── trialReminder: пуш-мокап + таймлайн честного триала ────────────────────
  trialPushCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 20,
    ...softShadow({ color: '#0C111B', radius: 12, opacity: 0.10, offsetY: 3, backgroundColor: '#FFFFFF' }),
  },
  trialPushIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#17191F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialPushCopy: {
    flex: 1,
  },
  trialPushTitle: {
    color: '#0C111B',
    fontSize: 12.5,
    fontWeight: '700',
    letterSpacing: -0.125,
  },
  trialPushBody: {
    color: '#3A4150',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  trialPushWhen: {
    color: '#8A91A1',
    fontSize: 11,
    fontWeight: '400',
    alignSelf: 'flex-start',
  },
  trialTimeline: {
    gap: 12,
  },
  trialTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 15,
    paddingHorizontal: 15,
    paddingVertical: 14,
    ...softShadow({ color: '#0C111B', radius: 10, opacity: 0.05, offsetY: 2, backgroundColor: '#FFFFFF' }),
  },
  trialTimelineIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#EDF0FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialTimelineTitle: {
    color: '#0C111B',
    fontSize: 15.5,
    fontWeight: '800',
    letterSpacing: -0.155,
  },
  trialReassureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  trialReassureText: {
    color: '#12805A',
    fontSize: 13.5,
    fontWeight: '500',
  },
  // ── paywall: выгоды над тарифами + низ с текстами ──────────────────────────
  paywallReassureText: {
    color: '#12805A',
    fontSize: 13.5,
    fontWeight: '500',
  },
  paywallLegalNote: {
    color: '#9AA1B0',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 8,
  },
  paywallLegalLink: {
    color: '#7C8394',
    textDecorationLine: 'underline',
  },
  // ── paywall: кнопка «···» и меню кодов ─────────────────────────────────────
  paywallMenuButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#0C111B', radius: 3, opacity: 0.09, offsetY: 1, backgroundColor: '#FFFFFF' }),
  },
  menuScrim: {
    flex: 1,
    alignItems: 'flex-end',
    paddingTop: 56,
    paddingRight: 18,
  },
  paywallMenuCard: {
    width: 210,
    backgroundColor: '#FAFAFB',
    borderRadius: 14,
    overflow: 'hidden',
    ...softShadow({ color: '#0C111B', radius: 28, opacity: 0.20, offsetY: 6, backgroundColor: '#FAFAFB' }),
  },
  paywallMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(60, 60, 67, 0.15)',
  },
  paywallMenuItemLast: {
    borderBottomWidth: 0,
  },
  paywallMenuItemText: {
    color: '#0C111B',
    fontSize: 15.5,
    fontWeight: '400',
  },
  codeScrim: {
    flex: 1,
    backgroundColor: 'rgba(20, 22, 28, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  codeCard: {
    alignSelf: 'stretch',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 22,
    paddingBottom: 20,
    ...softShadow({ color: '#0C111B', radius: 28, opacity: 0.20, offsetY: 6, backgroundColor: '#FFFFFF' }),
  },
  codeTitle: {
    color: '#0C111B',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.38,
    marginBottom: 5,
  },
  codeInput: {
    borderWidth: 1.5,
    borderColor: '#E3E6EC',
    borderRadius: 13,
    backgroundColor: '#F7F8FA',
    color: '#0C111B',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 1.7,
    textAlign: 'center',
    paddingHorizontal: 15,
    paddingVertical: 15,
    marginBottom: 12,
  },
  codeFeedback: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 12,
  },
  codeFeedbackOk: {
    color: '#12805A',
  },
  codeFeedbackError: {
    color: '#E5563B',
  },
  codeCancel: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  codeCancelText: {
    color: '#8A91A1',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default memo(CleanOnboarding);

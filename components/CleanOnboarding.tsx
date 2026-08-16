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
import { AhaScene } from './onboarding_aha';
import TypewriterText from './onboarding_aha/TypewriterText';
import { hapticTap } from '../hooks/use-haptics';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { getDeviceBootstrapLocale, triLang, type Lang } from '../constants/i18n';
import AccountDeletedNotice from './AccountDeletedNotice';
import { consumeAccountDeletedNotice } from '../app/account_deleted_notice';
import { softShadow } from '../constants/androidGlow';
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

import { noAndroidOutline } from '../constants/androidGlow';
const WELCOME_LOGO_SOURCE = require('../assets/images/flow_clean_202607/logo_cutout.webp');
const ONBOARDING_ASSETS = {
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
  | 'language'
  | 'level'
  | 'aha'
  | 'notifications'
  | 'trialReminder'
  | 'onboardingPaywall'
  | 'improve'
  | 'name';

export const CLEAN_ONBOARDING_FLOW_VERSION = 'clean_minimal_wow_flow_2026_08_16b';
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
// вместе с планами. Порядок: welcome (вход + согласие строкой) → блок языка
// (language+level, выключен, пока язык один) → АХ-сцена (одна продуманная
// демонстрация: сборка фразы + голос — вау-момент) → уведомления → честное
// «предупредим до конца пробного» → пейвол → возраст/согласия.
export const CLEAN_ONBOARDING_ORDER: readonly CleanOnboardingStep[] = [
  'welcome',
  ...(SHOW_ONBOARDING_LANGUAGE_STEP ? (['language', 'level'] as const) : []),
  'aha',
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
const PLAN_LEVEL_KEY = 'onboarding_plan_level';
const PLAN_BILLING_KEY = 'onboarding_plan_billing';
const LEGAL_ACCEPTED_KEY = 'onboarding_terms_privacy_accepted_v1';
const ANALYTICS_HELP_KEY = 'onboarding_analytics_help_v1';
type IoniconName = React.ComponentProps<typeof Ionicons>['name'];
type LevelChoice = 'a0' | 'a1' | 'a2' | 'b1' | 'b2';
type AgeAnswer = 'yes' | 'no' | null;

type Option<T extends string | number> = {
  id: T;
  title: string;
  icon: IoniconName;
  asset?: ImageSourcePropType;
};

const LANGUAGE_OPTIONS: Array<Option<StudyTarget> & { code: string; native: string }> = [
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
  if (!SHOW_ONBOARDING_LANGUAGE_STEP && (value === 'language' || value === 'level')) return 'aha';
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
      writeToFirestore: false,
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
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LinearGradient
        colors={['#050711', '#080914', '#02030A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.liquidBlob, styles.liquidBlobOne]} />
      <View style={[styles.liquidBlob, styles.liquidBlobTwo]} />
      <View style={styles.stars}>
        {Array.from({ length: 18 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.star,
              {
                left: `${(index * 37) % 96}%`,
                top: `${10 + ((index * 29) % 82)}%`,
                opacity: 0.12 + ((index % 4) * 0.05),
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
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
  light = false,
}: {
  step: CleanOnboardingStep;
  onBack?: () => void;
  /** Крестик СЛЕВА вместо шеврона (пейвол): закрыть = уйти на бесплатный путь. */
  onClose?: () => void;
  /** Слот справа от полоски прогресса (меню «···» на пейволе). */
  headerRight?: React.ReactNode;
  light?: boolean;
}) {
  const enabledOrder = React.useContext(OnboardingOrderContext);
  const { progress, total } = getOnboardingProgress(enabledOrder, step);
  const fraction = Math.max(0, Math.min(1, progress / total));
  const [trackWidth, setTrackWidth] = useState(0);
  const fillAnim = useRef(new Animated.Value(lastProgressFraction)).current;

  useEffect(() => {
    lastProgressFraction = fraction;
    const anim = Animated.timing(fillAnim, {
      toValue: fraction,
      duration: 340,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [fillAnim, fraction]);

  if (!progress) return null;
  const translateX = fillAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-(trackWidth || 1), 0],
  });
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
        accessibilityLabel={onClose ? 'Закрыть' : 'Назад'}
      >
        <Ionicons name={onClose ? 'close' : 'chevron-back'} size={onClose ? 26 : 30} color={light ? '#1F2A44' : '#DCE4FF'} />
      </Pressable>
      <View
        style={[styles.progressTrack, light && styles.progressTrackLight]}
        accessibilityLabel={`Шаг ${progress} из ${total}`}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
      >
        <Animated.View style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }] }]}>
          <LinearGradient
            colors={['#8AB9FF', '#9B7CFF', '#E36EFF']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressFillFull}
          />
        </Animated.View>
      </View>
      {headerRight}
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
      {/* зачем: на Android elevation погашен (иначе система рисует квадрат),
          поэтому свечение даёт отдельный скруглённый слой под плиткой —
          форма под нашим контролем, как на iOS. Статичный: у плитки уже есть
          свой breathe-луп, второй анимации здесь не нужно. */}
      <View pointerEvents="none" style={styles.logoTileGlow} />
      <LinearGradient
        colors={['rgba(238,245,255,0.34)', 'rgba(123,140,255,0.16)', 'rgba(201,92,255,0.12)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoTileLarge}
      >
        {/* декоративный логотип: смысл несёт заголовок под плиткой */}
        <Image source={WELCOME_LOGO_SOURCE} style={styles.logoImageLarge} resizeMode="contain" accessible={false} />
      </LinearGradient>
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
      <LinearGradient
        colors={disabled ? ['#293044', '#293044'] : ['#E3ECFF', '#7B8CFF', '#C95CFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryButton}
      >
        {loading ? <ActivityIndicator size="small" color="#07111F" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
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
        <Ionicons name={option.icon} size={36} color={selected ? '#E3ECFF' : '#C6D3FF'} />
      )}
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle} numberOfLines={2}>{option.title}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <Ionicons name="checkmark" size={20} color="#07111F" /> : null}
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
        <Ionicons name={option.icon} size={44} color={selected ? '#F7FAFF' : '#AEB8D6'} />
      )}
      <View style={styles.optionCopy}>
        <Text style={styles.languageTitle}>{option.native}</Text>
      </View>
      <View style={[styles.radioLarge, selected && styles.radioLargeSelected]}>
        {selected ? <Ionicons name="checkmark" size={28} color="#07111F" /> : null}
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

function OnboardingSkipLink({ step, light }: { step: CleanOnboardingStep; light?: boolean }) {
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
      <Text style={[styles.skipLabel, light && styles.skipLabelLight]}>Пропустить</Text>
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
  light,
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
  light?: boolean;
  plainTitle?: boolean;
}) {
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

  return (
    <SafeAreaView style={[styles.safe, light && styles.safeLight]} edges={['top', 'bottom']}>
      <StatusBar barStyle={light ? 'dark-content' : 'light-content'} />
      <ProgressHeader step={step} onBack={onBack} onClose={onClose} headerRight={headerRight} light={light} />
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
                <Text style={[styles.plainTitle, step === 'name' && styles.consentTitle, light && styles.plainTitleLight]}>{title}</Text>
              ) : (
                <CompassBubble compact>{title}</CompassBubble>
              )}
            </FadeUp>
          ) : null}
          <FadeUp delay={90} style={styles.frameChildren}>{children}</FadeUp>
        </ScrollView>
        {footer ? (
          <FadeUp delay={150} style={[styles.footer, light && styles.footerLight, { paddingBottom: Math.max(12, bottomInset) }]}>
            {footer}
            <OnboardingSkipLink step={step} light={light} />
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
      <Ionicons name="arrow-up" size={42} color="#86B7FF" style={styles.notificationArrow} />
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
        <Ionicons name={icon} size={19} color="#B9C8FF" />
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
        <Ionicons name={icon} size={20} color="#5B67D8" style={styles.cmpIcon} />
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
  const [studyTarget, setStudyTarget] = useState<StudyTarget>('en');
  const [level, setLevel] = useState<LevelChoice | null>(null);
  const [notificationBusy, setNotificationBusy] = useState(false);
  // Полная АХ-сцена (звук + караоке) открывается ПО КНОПКЕ с экрана-приглашения
  // (владелец, 2026-08-16): демонстрация необязательна, «Дальше» ведёт мимо.
  const [ahaSceneOpen, setAhaSceneOpen] = useState(false);
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
    AsyncStorage.multiGet([FLOW_VERSION_KEY, STEP_KEY, ONBOARDING_REQUESTED_STUDY_TARGET_KEY, PLAN_LEVEL_KEY])
      .then((rows) => {
        if (!active) return;
        const map = new Map(rows);
        const savedTarget = SHOW_ONBOARDING_LANGUAGE_STEP ? map.get(ONBOARDING_REQUESTED_STUDY_TARGET_KEY) : 'en';
        if (savedTarget === 'en' || savedTarget === 'fr') setStudyTarget(savedTarget);
        const savedLevel = map.get(PLAN_LEVEL_KEY);
        if (LEVEL_OPTIONS.some((item) => item.id === savedLevel)) setLevel(savedLevel as LevelChoice);
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
    studyTarget,
    welcomeSheetEnabled,
  ]);


  if (!restored) {
    return (
      <View style={styles.root}>
        <Background />
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#A9B8FF" />
        </View>
      </View>
    );
  }

  const renderWelcome = () => (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />
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
              {/* зачем: sign-in-wrap вместо обязательной галочки на последнем шаге
                  (владелец, 2026-08-16). Согласие заметно и стоит ВПЛОТНУЮ к кнопке —
                  это юридически сильная форма, а флоу короче на один клик. */}
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
                  go('language');
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
      footer={<PrimaryButton label="Продолжить" onPress={() => go('aha')} disabled={!level} testID="onboarding-level-continue" />}
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

  // Демонстрация необязательна: лёгкое приглашение с ОТДЕЛЬНОЙ кнопкой
  // (владелец, 2026-08-16). Сама сцена — полная оригинальная AhaScene со
  // звуком, караоке и анимациями; полноэкранная, вне ScreenFrame-хрома.
  const renderAha = () => {
    if (ahaSceneOpen) {
      return (
        <AhaScene
          goal={undefined}
          lang={lang === 'uk' || lang === 'es' ? lang : 'ru'}
          onDone={() => { setAhaSceneOpen(false); go('notifications'); }}
          onSkip={() => { setAhaSceneOpen(false); go('notifications'); }}
        />
      );
    }
    return (
      <ScreenFrame
        step="aha"
        title="Услышь — и ответь, как в жизни"
        plainTitle
        onBack={back}
        footer={(
          <>
            <PrimaryButton
              label="Показать живую сцену"
              onPress={() => setAhaSceneOpen(true)}
              testID="onboarding-aha-open"
            />
            <SecondaryButton
              label="Дальше"
              onPress={() => go('notifications')}
              testID="onboarding-aha-continue"
            />
          </>
        )}
      >
        <View style={styles.ahaInviteCard}>
          <View style={styles.ahaInviteIcon}>
            <Ionicons name="volume-high" size={26} color="#B9C8FF" />
          </View>
          <Text style={styles.ahaInviteQuote}>“What can I get you?”</Text>
          <View style={styles.ahaInviteMicRow}>
            <Ionicons name="mic" size={18} color="#7DE0A6" />
            <Text style={styles.ahaInviteAnswer}>Соберёшь ответ и услышишь его голосом</Text>
          </View>
        </View>
      </ScreenFrame>
    );
  };

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
            <Ionicons name="checkmark-circle" size={17} color="#7BE0B0" />
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
            <Ionicons name="ellipsis-horizontal" size={22} color="#1F2A44" />
          </Pressable>
        )}
        light
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
              <Ionicons name="checkmark-circle" size={16} color="#1E9E6A" />
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
                  <Ionicons name="pricetag-outline" size={19} color="#1F2A44" />
                  <Text style={styles.paywallMenuItemText}>Ввести промокод</Text>
                </Pressable>
                <Pressable
                  testID="onboarding-paywall-menu-referral"
                  style={({ pressed }) => [styles.paywallMenuItem, pressed && styles.pressed]}
                  onPress={() => openCodeSheet('referral')}
                  accessibilityRole="button"
                >
                  <Ionicons name="gift-outline" size={19} color="#1F2A44" />
                  <Text style={styles.paywallMenuItemText}>Код от друга</Text>
                </Pressable>
                <Pressable
                  testID="onboarding-paywall-restore"
                  style={({ pressed }) => [styles.paywallMenuItem, styles.paywallMenuItemLast, pressed && styles.pressed]}
                  onPress={() => { setPaywallMenuOpen(false); void handleRestore(); }}
                  disabled={paywallRestoring}
                  accessibilityRole="button"
                >
                  <Ionicons name="refresh-outline" size={19} color="#1F2A44" />
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
                  placeholderTextColor="#98A3BD"
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

  // Экран-объяснение перед согласиями (паттерн Bevel «Help us improve»):
  // человеческим языком — зачем галочка аналитики и вопрос возраста на
  // следующем шаге. Отдельно от действий, чтобы финал остался коротким.
  const renderImprove = () => (
    <ScreenFrame
      step="improve"
      title="Помоги сделать Phraseman лучше"
      plainTitle
      onBack={back}
      footer={<PrimaryButton label="Продолжить" onPress={() => go('name')} testID="onboarding-improve-continue" />}
    >
      <View style={styles.improveList}>
        <TrialTimelineRow index={0} icon="stats-chart-outline" title="Анонимная аналитика — только цифры" />
        <TrialTimelineRow index={1} icon="shield-checkmark-outline" title="Личное не уходит никуда и никогда" />
        <TrialTimelineRow index={2} icon="person-outline" title="Спросим возраст — так велят правила" />
      </View>
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
          аналитики, ниже — обязательный вопрос возраста. Объяснение — экраном
          раньше (improve), поэтому здесь только действия, без меток. */}
      <Pressable
        testID="onboarding-analytics-checkbox"
        onPressIn={() => { void hapticTap(); }}
        onPress={() => setAnalyticsAllowed((value) => !value)}
        style={[styles.consentDecisionRow, analyticsAllowed && styles.consentDecisionRowSelected]}
        accessibilityRole="switch"
        accessibilityState={{ checked: analyticsAllowed }}
      >
        <View style={styles.consentDecisionIcon}>
          <Ionicons name="stats-chart-outline" size={22} color="#B9C8FF" />
        </View>
        <View style={styles.consentDecisionCopy}>
          <Text style={styles.consentDecisionTitle}>Анонимная аналитика</Text>
        </View>
        <View style={[styles.consentSwitch, analyticsAllowed && styles.consentSwitchOn]}>
          <View style={[styles.consentSwitchThumb, analyticsAllowed && styles.consentSwitchThumbOn]} />
        </View>
      </Pressable>
      {/* Возраст — вопросом с «Да/Нет» (владелец, 2026-08-16): короче и честнее,
          чем две длинные кнопки-утверждения. */}
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
      case 'language': return renderLanguage();
      case 'level': return renderLevel();
      case 'aha': return renderAha();
      case 'notifications': return renderNotifications();
      case 'trialReminder': return renderTrialReminder();
      case 'onboardingPaywall': return renderOnboardingPaywall();
      case 'improve': return renderImprove();
      case 'name': return renderName();
      default: return renderWelcome();
    }
  };

  const bare = displayStep === 'welcome' || (displayStep === 'aha' && ahaSceneOpen);

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
    backgroundColor: '#050711',
  },
  safe: {
    flex: 1,
  },
  safeLight: {
    backgroundColor: '#F7FAFF',
  },
  keyboard: {
    flex: 1,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liquidBlob: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.38,
  },
  liquidBlobOne: {
    width: 260,
    height: 260,
    top: -72,
    left: -72,
    backgroundColor: 'rgba(62, 98, 255, 0.18)',
  },
  liquidBlobTwo: {
    width: 300,
    height: 300,
    right: -130,
    bottom: 80,
    backgroundColor: 'rgba(198, 92, 255, 0.14)',
  },
  stars: {
    ...StyleSheet.absoluteFillObject,
  },
  star: {
    position: 'absolute',
    width: 2,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FFFFFF',
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingTop: 10,
    paddingBottom: 14,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hidden: {
    opacity: 0,
  },
  progressTrack: {
    flex: 1,
    height: 7,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.15)',
    overflow: 'hidden',
  },
  progressTrackLight: {
    backgroundColor: 'rgba(19,31,56,0.12)',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
  },
  progressFillFull: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
  },
  scrollShell: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
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
  screenTitleWrap: {
    marginBottom: 14,
    alignItems: 'center',
  },
  screenTitleWrapCompact: {
    marginBottom: 10,
  },
  screenTitle: {
    color: '#FFFFFF',
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0,
  },
  screenTitleLight: {
    color: '#101828',
  },
  screenSubtitle: {
    color: '#B8BED0',
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 14,
  },
  screenSubtitleLight: {
    color: '#59647A',
  },
  plainTitle: {
    color: '#F7FAFF',
    fontSize: 36,
    lineHeight: 41,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 18,
  },
  plainTitleLight: {
    color: '#101828',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 10,
    backgroundColor: 'rgba(5, 7, 17, 0.88)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  footerLight: {
    backgroundColor: 'rgba(247,250,255,0.94)',
    borderTopColor: 'rgba(16,24,40,0.08)',
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 32,
    paddingBottom: 22,
    justifyContent: 'space-between',
  },
  welcomeLogoBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  logoTileLarge: {
    width: 148,
    height: 148,
    borderRadius: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 36,
    // зачем: фон плитки рисует LinearGradient поверх полупрозрачного bg, поэтому
    // Android не может вывести скруглённый outline и заливал КВАДРАТ 148×148
    // вокруг логотипа. iOS-свечение (эталон владельца) оставляем как было,
    // на Android elevation гасим — мягкий ореол даёт GlowHalo ниже.
    ...softShadow({
      color: '#B7C8FF',
      opacity: 0.34,
      radius: 30,
      offsetY: 16,
      backgroundColor: 'rgba(255,255,255,0.08)',
      elevation: 10,
    }),
    overflow: 'hidden',
  },
  // зачем: Android-замена elevation-свечению. Скруглённый слой на 10px шире
  // плитки, лежит под ней (по потоку — до неё) и повторяет её радиус 32+10.
  // На iOS не мешает: там работает родная shadow-тень, слой лишь чуть мягче.
  logoTileGlow: {
    position: 'absolute',
    alignSelf: 'center',
    top: -10,
    width: 168,
    height: 168,
    borderRadius: 42,
    backgroundColor: 'rgba(183,200,255,0.16)',
  },
  logoImageLarge: {
    width: 140,
    height: 140,
  },
  brandLabel: {
    color: '#C9D2FF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2.5,
    marginBottom: 10,
  },
  welcomeTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 39,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    color: '#BBC1D1',
    fontSize: 20,
    lineHeight: 30,
    fontWeight: '700',
    marginTop: 34,
    textAlign: 'center',
  },
  welcomeButtons: {
    gap: 14,
  },
  authButtons: {
    gap: 14,
  },
  primaryButtonOuter: {
    minHeight: 64,
    borderRadius: 14,
  },
  primaryButton: {
    minHeight: 64,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  primaryButtonShadow: {
    height: 8,
    marginHorizontal: 2,
    marginTop: -7,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
    backgroundColor: '#3549E8',
    opacity: 0.72,
    zIndex: -1,
  },
  primaryButtonText: {
    color: '#081020',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  secondaryButton: {
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#C6C9D6',
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
  },
  pressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },
  introCenter: {
    alignItems: 'center',
    gap: 40,
  },
  introLogoPlate: {
    width: 150,
    height: 150,
    borderRadius: 40,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  introLogo: {
    width: 96,
    height: 96,
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
  logoTileSmall: {
    width: 76,
    height: 76,
    borderRadius: 18,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
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
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 18,
    paddingVertical: 14,
    justifyContent: 'center',
  },
  speechText: {
    color: '#F4F6FF',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
  },
  optionList: {
    gap: 9,
  },
  optionCard: {
    minHeight: 62,
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  optionCardSelected: {
    borderColor: '#AAB5FF',
    backgroundColor: 'rgba(133, 143, 255, 0.18)',
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  optionIconSelected: {
    backgroundColor: '#DCE7FF',
  },
  optionAsset: {
    width: 48,
    height: 48,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 22,
    fontWeight: '900',
  },
  optionSubtitle: {
    color: '#AEB4C5',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    marginTop: 4,
  },
  radio: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: '#DCE7FF',
    borderColor: '#DCE7FF',
  },
  languageCard: {
    minHeight: 88,
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  languageCardSelected: {
    borderColor: '#9FAEFF',
    backgroundColor: 'rgba(151, 138, 255, 0.20)',
  },
  languageIconTile: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  languageAsset: {
    width: 76,
    height: 48,
  },
  languageTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '900',
    marginTop: 2,
  },
  radioLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioLargeSelected: {
    backgroundColor: '#AAB5FF',
    borderColor: '#AAB5FF',
  },
  notificationMockWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 38,
  },
  notificationMock: {
    width: '84%',
    borderRadius: 18,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.20)',
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  notificationMockTitle: {
    color: '#C7CEDF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
    textAlign: 'center',
    paddingTop: 22,
    paddingHorizontal: 20,
  },
  notificationMockBody: {
    color: '#7E879B',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 18,
  },
  notificationMockActions: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.12)',
    flexDirection: 'row',
  },
  notificationMockMuted: {
    flex: 1,
    color: '#6E7587',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 14,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  notificationMockAllow: {
    flex: 1,
    color: '#82C7FF',
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
    paddingVertical: 14,
  },
  notificationArrow: {
    marginTop: 12,
  },
  heroAsset: {
    width: '100%',
    height: 96,
    marginBottom: 8,
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
    color: '#B8C1FF',
    fontSize: 16,
    fontWeight: '900',
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
    color: 'rgba(220,228,255,0.62)',
    fontSize: 15,
    fontWeight: '700',
  },
  skipLabelLight: {
    color: 'rgba(31,42,68,0.62)',
  },
  promiseList: {
    gap: 14,
    marginTop: 8,
  },
  promiseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promiseIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promiseNumber: {
    color: '#07111F',
    fontSize: 16,
    fontWeight: '900',
  },
  promiseText: {
    flex: 1,
    color: '#F4F6FF',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  modeCard: {
    minHeight: 92,
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  modeAsset: {
    width: 70,
    height: 70,
  },
  modeCardSelected: {
    borderColor: '#9FAEFF',
    backgroundColor: 'rgba(151,138,255,0.16)',
  },
  recommendedBadge: {
    position: 'absolute',
    right: 14,
    top: -14,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#8BC4FF',
  },
  recommendedText: {
    color: '#07111F',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.6,
  },
  modeTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    lineHeight: 27,
    fontWeight: '900',
  },
  modeSubtitle: {
    color: '#B9C0D3',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    marginTop: 8,
  },
  plusBenefitList: {
    gap: 9,
  },
  plusBenefitRow: {
    minHeight: 68,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  plusBenefitRowLight: {
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(16,24,40,0.10)',
    shadowColor: '#18233F',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    ...noAndroidOutline,
  },
  plusBenefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#DCE7FF',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  plusBenefitIconLight: {
    backgroundColor: '#EEF3FF',
  },
  plusBenefitAsset: {
    width: 48,
    height: 48,
  },
  plusBenefitCopy: {
    flex: 1,
  },
  plusBenefitTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  plusBenefitBody: {
    color: '#AAB2C6',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    marginTop: 3,
  },
  plusBenefitTitleLight: {
    color: '#101828',
  },
  cmpSubtitle: {
    color: '#59647A',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '600',
    marginTop: 2,
    marginBottom: 14,
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
    color: '#8A93A6',
  },
  cmpHeaderPlus: {
    width: 52,
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.4,
    color: '#9B7CFF',
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
    fontWeight: '700',
    color: '#1B2333',
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
    backgroundColor: '#C4CBD8',
  },
  cmpCheckWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#E4F7EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusBenefitSubtitle: {
    color: '#B7BDCE',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 2,
  },
  plusBenefitSubtitleLight: {
    color: '#64748B',
  },
  planPanel: {
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'rgba(170,181,255,0.55)',
    backgroundColor: 'rgba(151,138,255,0.14)',
    padding: 18,
    marginBottom: 14,
  },
  planPanelTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
  },
  planPanelBody: {
    color: '#D5DAEA',
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '800',
    marginTop: 6,
  },
  metricCard: {
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    padding: 14,
    marginBottom: 10,
  },
  metricLabel: {
    color: '#B8BED0',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 1.3,
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#DCE7FF',
    fontSize: 36,
    lineHeight: 40,
    fontWeight: '900',
    marginTop: 4,
  },
  metricSuffix: {
    color: '#DCE7FF',
    fontSize: 17,
    fontWeight: '900',
  },
  metricBar: {
    height: 9,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginTop: 12,
  },
  metricBarFill: {
    width: '88%',
    height: '100%',
    borderRadius: 999,
  },
  metricCardAccent: {
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'rgba(170,181,255,0.45)',
    backgroundColor: 'rgba(151,138,255,0.16)',
    padding: 14,
    marginBottom: 0,
  },
  bigMetric: {
    color: '#DCE7FF',
    fontSize: 32,
    lineHeight: 36,
    fontWeight: '900',
  },
  metricDescription: {
    color: '#B8BED0',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '800',
    marginTop: 4,
  },
  planSteps: {
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 14,
    gap: 12,
  },
  planStepRow: {
    minHeight: 86,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  planStepTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
  },
  planStepText: {
    color: '#B8BED0',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 3,
  },
  paywallHeroText: {
    color: '#334155',
    fontSize: 18,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 14,
    paddingHorizontal: 8,
  },
  paywallProofList: {
    gap: 10,
    marginBottom: 16,
  },
  paywallPlanList: {
    gap: 9,
  },
  paywallPlanCard: {
    minHeight: 78,
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'rgba(16,24,40,0.12)',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
    shadowColor: '#18233F',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    ...noAndroidOutline,
  },
  paywallPlanCardSelected: {
    borderColor: '#8B7CFF',
    backgroundColor: '#F1F4FF',
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
    color: '#101828',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
  },
  paywallPlanBadge: {
    color: '#FFFFFF',
    backgroundColor: '#7B8CFF',
    borderRadius: 999,
    overflow: 'hidden',
    paddingHorizontal: 9,
    paddingVertical: 4,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '900',
  },
  paywallPlanPrice: {
    color: '#6D5DFF',
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
    marginTop: 4,
  },
  paywallPlanSubprice: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    marginTop: 2,
  },
  paywallPlanDetail: {
    color: '#64748B',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '700',
    marginTop: 2,
  },
  paywallRadio: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 0,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallRadioSelected: {
    backgroundColor: '#7B8CFF',
    borderColor: '#7B8CFF',
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
    color: '#536079',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  paywallFooterDot: {
    color: '#94A3B8',
    fontSize: 16,
    fontWeight: '900',
  },
  miniPhraseCard: {
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'rgba(170,181,255,0.38)',
    backgroundColor: 'rgba(255,255,255,0.075)',
    padding: 18,
    marginBottom: 14,
  },
  miniPhraseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  },
  miniPhraseScene: {
    flex: 1,
    color: '#B9C0D3',
    fontSize: 14,
    lineHeight: 19,
    fontWeight: '900',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  soundButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    borderColor: 'rgba(170,181,255,0.42)',
    backgroundColor: 'rgba(170,181,255,0.12)',
  },
  miniPhrase: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '900',
  },
  miniTranslation: {
    color: '#DCE7FF',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    marginTop: 8,
  },
  miniTaskCard: {
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 14,
    marginBottom: 14,
  },
  miniTaskTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '900',
    marginBottom: 12,
  },
  miniChoices: {
    gap: 10,
  },
  miniChoice: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: 'rgba(255,255,255,0.055)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  miniChoiceSelected: {
    borderColor: '#AAB5FF',
    backgroundColor: 'rgba(170,181,255,0.16)',
  },
  miniChoiceWrong: {
    borderColor: 'rgba(255,154,174,0.65)',
  },
  miniChoiceText: {
    color: '#FFFFFF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  dimmed: {
    opacity: 0.72,
  },
  answerSlot: {
    minHeight: 58,
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  answerSlotText: {
    color: '#747D93',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
  },
  answerSlotTextFilled: {
    color: '#F4F6FF',
  },
  tokenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  tokenChip: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 0,
    borderColor: 'rgba(170,181,255,0.34)',
    backgroundColor: 'rgba(170,181,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  tokenChipUsed: {
    opacity: 0.34,
  },
  tokenText: {
    color: '#DCE7FF',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '900',
  },
  inputCard: {
    minHeight: 58,
    borderRadius: 16,
    borderWidth: 0,
    borderColor: 'rgba(170,181,255,0.55)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  nameInput: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 25,
    fontWeight: '900',
    paddingVertical: 12,
  },
  inlineQuestion: {
    color: '#FFFFFF',
    fontSize: 21,
    lineHeight: 26,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 12,
  },
  consentTitle: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  consentLead: {
    color: '#9BA7C4',
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: -2,
    marginBottom: 28,
  },
  consentSectionLabel: {
    color: '#98A4C4',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    letterSpacing: 2.2,
    marginTop: 24,
    marginBottom: 10,
    paddingHorizontal: 6,
  },
  ageButtons: {
    flexDirection: 'row',
    gap: 14,
    marginBottom: 14,
  },
  ageButton: {
    flex: 1,
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#343B59',
    backgroundColor: '#101321',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageButtonSelected: {
    borderColor: '#9DB8FF',
    backgroundColor: '#20264A',
  },
  ageButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  consentDecisionRow: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#2A3048',
  },
  consentDecisionRowSelected: {
    borderBottomColor: '#55628A',
  },
  consentDecisionIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1B2142',
  },
  consentDecisionCopy: {
    flex: 1,
  },
  consentDecisionTitle: {
    color: '#F7F8FF',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '700',
  },
  consentDecisionHint: {
    color: '#929DB9',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
    marginTop: 2,
  },
  consentSwitch: {
    width: 52,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#69738F',
    backgroundColor: '#141827',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  consentSwitchOn: {
    borderColor: '#C8FF3D',
    backgroundColor: '#C8FF3D',
  },
  consentSwitchThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#818CA8',
  },
  consentSwitchThumbOn: {
    alignSelf: 'flex-end',
    backgroundColor: '#07110A',
  },
  consentCheck: {
    width: 34,
    height: 34,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#8994B2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  consentCheckSelected: {
    borderColor: '#C8FF3D',
    backgroundColor: '#C8FF3D',
  },
  consentLegalLinks: {
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 6,
    marginTop: 16,
  },
  consentNameHint: {
    color: '#717C98',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 28,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    marginBottom: 10,
  },
  checkbox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 0,
    borderColor: '#54618A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    borderColor: '#AAB5FF',
    backgroundColor: '#DCE7FF',
  },
  checkboxText: {
    flex: 1,
    color: '#F3F5FF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '800',
  },
  checkboxTextStrong: {
    color: '#F3F5FF',
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '900',
  },
  checkboxHint: {
    color: '#9BA3B9',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
    marginTop: 2,
  },
  linkText: {
    color: '#DCE7FF',
    textDecorationLine: 'underline',
  },
  // зачем: это НЕ ошибка, а нормальная развилка («аккаунта нет — создать?»), поэтому
  // не красный errorText. Тон спокойный и светлый, вес и кегль — на уровне основного
  // текста экрана, чтобы сообщение читалось как утверждение, а не как мелкая сноска.
  unknownAccountText: {
    color: '#E7ECFF',
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 6,
  },
  improveList: {
    gap: 12,
    marginTop: 10,
  },
  ahaInviteCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 24, 46, 0.72)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(133, 156, 255, 0.16)',
    paddingVertical: 30,
    paddingHorizontal: 20,
    marginTop: 12,
    gap: 14,
  },
  ahaInviteIcon: {
    width: 58,
    height: 58,
    borderRadius: 20,
    backgroundColor: 'rgba(133, 156, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ahaInviteQuote: {
    color: '#F2F5FF',
    fontSize: 23,
    lineHeight: 29,
    fontWeight: '800',
    letterSpacing: -0.3,
    textAlign: 'center',
  },
  ahaInviteMicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ahaInviteAnswer: {
    color: '#A9B4D8',
    fontSize: 14.5,
    fontWeight: '600',
  },
  ageQuestion: {
    color: '#F2F5FF',
    fontSize: 19,
    lineHeight: 25,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 22,
    marginBottom: 12,
  },
  errorText: {
    color: '#FF9AAE',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  // ── welcome: sign-in-wrap согласие над кнопкой «Начать» ────────────────────
  welcomeLegalNote: {
    color: '#8C9AC4',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  welcomeLegalLink: {
    color: '#B9C8FF',
    textDecorationLine: 'underline',
  },
  // ── trialReminder: пуш-мокап + таймлайн честного триала ────────────────────
  trialPushCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(233, 239, 255, 0.96)',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 20,
    ...softShadow({ color: '#0A1224', radius: 12, opacity: 0.3, offsetY: 5, backgroundColor: 'rgba(233, 239, 255, 0.96)' }),
  },
  trialPushIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#17191F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialPushCopy: {
    flex: 1,
  },
  trialPushTitle: {
    color: '#0C111B',
    fontSize: 14.5,
    fontWeight: '800',
  },
  trialPushBody: {
    color: '#3A4150',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  trialPushWhen: {
    color: '#8A91A1',
    fontSize: 12,
    fontWeight: '600',
    alignSelf: 'flex-start',
  },
  trialTimeline: {
    gap: 12,
  },
  trialTimelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'rgba(18, 24, 46, 0.72)',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(133, 156, 255, 0.14)',
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  trialTimelineIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(133, 156, 255, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  trialTimelineCopy: {
    flex: 1,
  },
  trialTimelineTitle: {
    color: '#F2F5FF',
    fontSize: 15.5,
    fontWeight: '800',
  },
  trialTimelineBody: {
    color: '#A9B4D8',
    fontSize: 13.5,
    lineHeight: 19,
    marginTop: 2,
  },
  trialReassureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
  },
  trialReassureText: {
    color: '#7BE0B0',
    fontSize: 13.5,
    fontWeight: '700',
  },
  // ── paywall: выгоды над тарифами + низ с текстами ──────────────────────────
  paywallBenefitList: {
    gap: 9,
    marginBottom: 16,
  },
  paywallBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paywallBenefitIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: 'rgba(62, 98, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  paywallBenefitTitle: {
    color: '#1F2A44',
    fontSize: 14.5,
    fontWeight: '700',
  },
  paywallReassureText: {
    color: '#1E9E6A',
    fontSize: 13,
    fontWeight: '700',
  },
  paywallLegalNote: {
    color: '#8A93AC',
    fontSize: 11.5,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: 8,
  },
  paywallLegalLink: {
    color: '#5B67D8',
    textDecorationLine: 'underline',
  },
  // ── paywall: кнопка «···» и меню кодов ─────────────────────────────────────
  paywallMenuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 10,
    backgroundColor: 'rgba(31, 42, 68, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuScrim: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 24, 0.42)',
    alignItems: 'flex-end',
    paddingTop: 96,
    paddingRight: 18,
  },
  paywallMenuCard: {
    minWidth: 236,
    backgroundColor: '#FCFDFF',
    borderRadius: 16,
    paddingVertical: 4,
    ...softShadow({ color: '#070B18', radius: 16, opacity: 0.32, offsetY: 8, backgroundColor: '#FCFDFF' }),
  },
  paywallMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(31, 42, 68, 0.10)',
  },
  paywallMenuItemLast: {
    borderBottomWidth: 0,
  },
  paywallMenuItemText: {
    color: '#1F2A44',
    fontSize: 15.5,
    fontWeight: '600',
  },
  codeScrim: {
    flex: 1,
    backgroundColor: 'rgba(7, 11, 24, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  codeCard: {
    alignSelf: 'stretch',
    backgroundColor: '#FCFDFF',
    borderRadius: 22,
    paddingHorizontal: 18,
    paddingVertical: 20,
    ...softShadow({ color: '#070B18', radius: 16, opacity: 0.32, offsetY: 8, backgroundColor: '#FCFDFF' }),
  },
  codeTitle: {
    color: '#0C111B',
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 5,
  },
  codeHint: {
    color: '#5A6478',
    fontSize: 13.5,
    lineHeight: 19,
    marginBottom: 14,
  },
  codeInput: {
    borderWidth: 1.5,
    borderColor: '#D9DFEE',
    borderRadius: 13,
    backgroundColor: '#F5F7FC',
    color: '#0C111B',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 2,
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    marginBottom: 12,
  },
  codeFeedback: {
    fontSize: 13.5,
    lineHeight: 19,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  codeFeedbackOk: {
    color: '#1E9E6A',
  },
  codeFeedbackError: {
    color: '#D34B6A',
  },
  codeCancel: {
    alignItems: 'center',
    paddingVertical: 10,
    marginTop: 2,
  },
  codeCancelText: {
    color: '#8A93AC',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default memo(CleanOnboarding);

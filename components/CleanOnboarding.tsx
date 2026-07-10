import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  AppState,
  Image,
  ImageSourcePropType,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from './SafeLinearGradient';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';
import { AhaScene } from './onboarding_aha';
import TypewriterText from './onboarding_aha/TypewriterText';
import { hapticTap } from '../hooks/use-haptics';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { getDeviceBootstrapLocale, type Lang } from '../constants/i18n';
import { ENABLE_DEV_STUDY_TARGET_LANG, KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../app/config';
import { setBirthYear, MIN_FULL_ACCESS_AGE } from '../app/age_gate';
import { setAnalyticsConsent } from '../app/analytics_consent';
import { recordConsentToCloud } from '../app/age_consent_cloud';
import { trackEvent, type AnalyticsEvent } from '../app/analytics';
import { usePaywallPurchase, type PaywallPlan } from '../app/paywall_purchase';
import { requestNotificationPermissionWithFallback, scheduleDailyReminder } from '../app/notifications';
import { ensureLocalNickname } from '../app/nickname_guard';
import type { StudyTarget } from '../app/study_target';
import { setStoredStudyTarget } from '../app/study_target';
import { emitDevStudyTargetChanged, setDevStudyTargetLang } from '../app/study_target_lang_dev';
import {
  ONBOARDING_REQUESTED_STUDY_TARGET_KEY,
  prefetchAndRecordStudyTargetServerPack,
} from '../app/study_target_server_prefetch';
import {
  PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY,
  queuePendingPersonalPlanActivation,
} from '../app/personal_plan_activation';
import { type PersonalPlanId, type PlanMinutesChoice } from '../app/personal_plan_catalog';
import {
  resolvePersonalPlanForGoal,
  type PersonalPlanSetupGoal,
} from '../app/personal_plan_recommendation';
import {
  addDays,
  estimateDaysToTarget,
  type CurrentLevel,
  type LearningGoal,
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

const WELCOME_LOGO_SOURCE = require('../assets/images/flow_clean_202607/logo_cutout.png');
const ONBOARDING_ASSETS = {
  sourceTiktok: require('../assets/images/flow_clean_202607/source_tiktok.png'),
  sourceStore: require('../assets/images/flow_clean_202607/source_store.png'),
  sourceSocial: require('../assets/images/flow_clean_202607/source_social.png'),
  sourceYoutube: require('../assets/images/flow_clean_202607/source_youtube.png'),
  sourceGoogle: require('../assets/images/flow_clean_202607/source_google.png'),
  sourceFriends: require('../assets/images/flow_clean_202607/source_friends.png'),
  sourceOther: require('../assets/images/flow_clean_202607/source_other.png'),
  languageEn: require('../assets/images/language_flags/language_en.webp'),
  languageFr: require('../assets/images/language_flags/language_fr_dev.webp'),
  levelA0: require('../assets/images/flow_clean_202607/level_a0.png'),
  levelA1: require('../assets/images/flow_clean_202607/level_a1.png'),
  levelA2: require('../assets/images/flow_clean_202607/level_a2.png'),
  levelB1: require('../assets/images/flow_clean_202607/level_b1.png'),
  levelB2: require('../assets/images/flow_clean_202607/level_b2.png'),
  goalSeries: require('../assets/images/flow_clean_202607/goal_series.png'),
  goalEveryday: require('../assets/images/flow_clean_202607/goal_everyday.png'),
  goalTravel: require('../assets/images/flow_clean_202607/goal_travel.png'),
  goalWords: require('../assets/images/flow_clean_202607/goal_words.png'),
  goalMind: require('../assets/images/flow_clean_202607/goal_mind.png'),
  minutes5: require('../assets/images/flow_clean_202607/minutes_5.png'),
  minutes10: require('../assets/images/flow_clean_202607/minutes_10.png'),
  minutes15: require('../assets/images/flow_clean_202607/minutes_15.png'),
  minutes20: require('../assets/images/flow_clean_202607/minutes_20.png'),
  introCompass: require('../assets/images/flow_clean_202607/intro_compass.png'),
  notifications: require('../assets/images/flow_clean_202607/notifications.png'),
  planResult: require('../assets/images/flow_clean_202607/plan_result.png'),
  startPlus: require('../assets/images/flow_clean_202607/start_plus.png'),
  startFree: require('../assets/images/flow_clean_202607/start_free.png'),
  benefitPlan: require('../assets/images/flow_clean_202607/benefit_plan.png'),
  benefitSpeech: require('../assets/images/flow_clean_202607/benefit_speech.png'),
  benefitRepeat: require('../assets/images/flow_clean_202607/benefit_repeat.png'),
  benefitFlow: require('../assets/images/flow_clean_202607/benefit_flow.png'),
  paywallYearly: require('../assets/images/flow_clean_202607/paywall_yearly.png'),
  paywallMonthly: require('../assets/images/flow_clean_202607/paywall_monthly.png'),
  paywallLifetime: require('../assets/images/flow_clean_202607/paywall_lifetime.png'),
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
  | 'source'
  | 'language'
  | 'level'
  | 'goal'
  | 'minutes'
  | 'aha'
  | 'notifications'
  | 'plusBenefits'
  | 'startMode'
  | 'planComparison'
  | 'onboardingPaywall'
  | 'name';

export const CLEAN_ONBOARDING_FLOW_VERSION = 'clean_midnight_aha_flow_2026_07_02b';
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
// Порядок: короткая анкета → АХ-сцена (ценность) → уведомления ПОСЛЕ победы →
// обещание 3 месяцев (всем) → выбор старта → пейвол → имя/согласия.
export const CLEAN_ONBOARDING_ORDER: readonly CleanOnboardingStep[] = [
  'welcome',
  'source',
  ...(SHOW_ONBOARDING_LANGUAGE_STEP ? ['language' as const] : []),
  'level',
  'goal',
  'minutes',
  'aha',
  'notifications',
  'plusBenefits',
  'startMode',
  'planComparison',
  'onboardingPaywall',
  'name',
];

const FLOW_VERSION_KEY = 'onboarding_flow_version_v1';
const STEP_KEY = 'onboarding_step';
const DONE_KEY = 'onboarding_done';
const DISCOVERY_SOURCE_KEY = 'onboarding_discovery_source';
const PLAN_GOAL_KEY = 'onboarding_plan_goal';
const PLAN_LEVEL_KEY = 'onboarding_plan_level';
const PLAN_MINUTES_KEY = 'onboarding_plan_minutes';
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

const GOAL_OPTIONS: Option<PersonalPlanSetupGoal>[] = [
  { id: 'series', title: 'Понимать кино и сериалы', icon: 'volume-high-outline', asset: ONBOARDING_ASSETS.goalSeries },
  { id: 'everyday', title: 'Говорить в обычной жизни', icon: 'chatbubble-ellipses-outline', asset: ONBOARDING_ASSETS.goalEveryday },
  { id: 'travel', title: 'Путешествовать', icon: 'airplane-outline', asset: ONBOARDING_ASSETS.goalTravel },
  { id: 'words', title: 'Нужные фразы каждый день', icon: 'cube-outline', asset: ONBOARDING_ASSETS.goalWords },
  { id: 'mind', title: 'Учиться для себя', icon: 'school-outline', asset: ONBOARDING_ASSETS.goalMind },
];

const MINUTE_OPTIONS: Array<Option<PlanMinutesChoice> & { tone: string }> = [
  { id: 5, title: '5 минут в день', tone: 'без давления', icon: 'leaf-outline', asset: ONBOARDING_ASSETS.minutes5 },
  { id: 10, title: '10 минут в день', tone: 'лучший ритм', icon: 'time-outline', asset: ONBOARDING_ASSETS.minutes10 },
  { id: 15, title: '15 минут в день', tone: 'быстрее прогресс', icon: 'flash-outline', asset: ONBOARDING_ASSETS.minutes15 },
  { id: 20, title: '20 минут в день', tone: 'глубже практика', icon: 'rocket-outline', asset: ONBOARDING_ASSETS.minutes20 },
];
const STEP_PROGRESS_INDEX: Partial<Record<CleanOnboardingStep, number>> = {
  source: 1,
  ...(SHOW_ONBOARDING_LANGUAGE_STEP ? { language: 2 } : {}),
  level: SHOW_ONBOARDING_LANGUAGE_STEP ? 3 : 2,
  goal: SHOW_ONBOARDING_LANGUAGE_STEP ? 4 : 3,
  minutes: SHOW_ONBOARDING_LANGUAGE_STEP ? 5 : 4,
  notifications: SHOW_ONBOARDING_LANGUAGE_STEP ? 6 : 5,
  plusBenefits: SHOW_ONBOARDING_LANGUAGE_STEP ? 7 : 6,
  startMode: SHOW_ONBOARDING_LANGUAGE_STEP ? 8 : 7,
  planComparison: SHOW_ONBOARDING_LANGUAGE_STEP ? 9 : 8,
  onboardingPaywall: SHOW_ONBOARDING_LANGUAGE_STEP ? 10 : 9,
  name: SHOW_ONBOARDING_LANGUAGE_STEP ? 11 : 10,
};

const PROGRESS_TOTAL = SHOW_ONBOARDING_LANGUAGE_STEP ? 11 : 10;

function normalizedStoredStep(value: string | null): CleanOnboardingStep | null {
  if (value === 'start') return 'welcome';
  if (!SHOW_ONBOARDING_LANGUAGE_STEP && value === 'language') return 'level';
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

function minutesToProfileMinutes(minutes: PlanMinutesChoice): MinutesPerDay {
  if (minutes === 5) return 5;
  if (minutes === 10 || minutes === 15) return 15;
  return 30;
}

function goalToLearningGoal(goal: PersonalPlanSetupGoal): LearningGoal {
  if (goal === 'travel') return 'tourism';
  if (goal === 'series' || goal === 'everyday') return 'hobby';
  if (goal === 'words') return 'work';
  return 'hobby';
}

function targetAfterLevel(currentLevel: CurrentLevel): TargetLevel {
  if (currentLevel === 'a1') return 'a2';
  if (currentLevel === 'a2') return 'b1';
  if (currentLevel === 'b1') return 'b2';
  return 'c1';
}

// Обещание на 3 месяца — конкретные умения, без числовых клеймов (юр. безопасно).
const PLUS_THREE_MONTH_PROMISES = [
  {
    title: 'Сказать нужную фразу вовремя',
    body: 'Кафе, дорога, встреча или короткий ответ — слова придут сами.',
  },
  {
    title: 'Понять ответ без паники',
    body: 'Сначала смысл, потом звук и повтор — речь перестанет быть шумом.',
  },
  {
    title: 'Возвращаться каждый день без борьбы',
    body: 'Короткая сессия, которую реально держать неделя за неделей.',
  },
] as const;

// Экран сравнения Free vs Plus (planComparison). Реальные киллер-фичи Plus из боевой
// копирайт-выкладки пейвола (paywall_copy.ts → CONTEXT_BENEFITS). У Free — прочерк
// (эти фичи только в Plus), у Plus — галочка, появляется каскадом сверху вниз.
// Слово «ИИ» в приложении не используем — «разговорная практика» вместо «диалоги с ИИ».
const PLAN_COMPARISON_BENEFITS: { icon: IoniconName; title: string }[] = [
  { icon: 'flash-outline', title: 'Безлимит энергии' },
  { icon: 'mic-outline', title: 'Практика произношения' },
  { icon: 'chatbubbles-outline', title: 'Разговорная практика' },
  { icon: 'bulb-outline', title: 'Разбор ошибок' },
  { icon: 'map-outline', title: 'Персональный план' },
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
    case 'b2': return 'Тут важны не азы, а точность и темп. План будет держать взрослую сложность.';
  }
}

function reactionForGoal(goal: PersonalPlanSetupGoal): string {
  switch (goal) {
    case 'series': return 'Тогда первый маршрут будет про живую реплику на слух, а не про список слов.';
    case 'everyday': return 'Берём обычные ситуации: услышал мысль, ответил коротко, продолжил разговор.';
    case 'travel': return 'Соберём маршрут, где фразы сразу работают в дороге, отеле и кафе.';
    case 'words': return 'Будем брать нужные фразы дня и быстро возвращать их в речь.';
    case 'mind': return 'Сделаем спокойный план: коротко, понятно, без ощущения «я опять отстал».';
  }
}

function planNameForGoal(goal: PersonalPlanSetupGoal): string {
  switch (goal) {
    case 'series': return 'Реплика';
    case 'everyday': return 'Диалог';
    case 'travel': return 'Маршрут';
    case 'words': return 'Фразы дня';
    case 'mind': return 'Ритм';
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

function ProgressHeader({ step, onBack, light = false }: { step: CleanOnboardingStep; onBack?: () => void; light?: boolean }) {
  const progress = STEP_PROGRESS_INDEX[step] ?? 0;
  const fraction = Math.max(0, Math.min(1, progress / PROGRESS_TOTAL));
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
  return (
    <View style={styles.progressHeader}>
      <Pressable
        testID="onboarding-back"
        onPressIn={() => { void hapticTap(); }}
        onPress={onBack}
        disabled={!onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed, !onBack && styles.hidden]}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Назад"
      >
        <Ionicons name="chevron-back" size={30} color={light ? '#1F2A44' : '#DCE4FF'} />
      </Pressable>
      <View
        style={[styles.progressTrack, light && styles.progressTrackLight]}
        accessibilityLabel={`Шаг ${progress} из ${PROGRESS_TOTAL}`}
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
      <LinearGradient
        colors={['rgba(238,245,255,0.34)', 'rgba(123,140,255,0.16)', 'rgba(201,92,255,0.12)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.logoTileLarge}
      >
        <Image source={WELCOME_LOGO_SOURCE} style={styles.logoImageLarge} resizeMode="contain" />
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

function ScreenFrame({
  step,
  title,
  children,
  footer,
  onBack,
  center,
  light,
  plainTitle,
}: {
  step: CleanOnboardingStep;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  center?: boolean;
  light?: boolean;
  plainTitle?: boolean;
}) {
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);

  return (
    <SafeAreaView style={[styles.safe, light && styles.safeLight]} edges={['top', 'bottom']}>
      <StatusBar barStyle={light ? 'dark-content' : 'light-content'} />
      <ProgressHeader step={step} onBack={onBack} light={light} />
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
                <Text style={[styles.plainTitle, light && styles.plainTitleLight]}>{title}</Text>
              ) : (
                <CompassBubble compact>{title}</CompassBubble>
              )}
            </FadeUp>
          ) : null}
          <FadeUp delay={90} style={styles.frameChildren}>{children}</FadeUp>
        </ScrollView>
        {footer ? <FadeUp delay={150} style={[styles.footer, light && styles.footerLight, { paddingBottom: Math.max(12, bottomInset) }]}>{footer}</FadeUp> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function NotificationMock() {
  const isIos = Platform.OS === 'ios';
  return (
    <View style={styles.notificationMockWrap}>
      <View style={styles.notificationMock}>
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
      </View>
      <Ionicons name="arrow-up" size={42} color="#86B7FF" style={styles.notificationArrow} />
    </View>
  );
}
function PlusBenefitRow({
  icon,
  title,
  body,
  asset,
  tone = 'dark',
  index = 0,
}: {
  icon: IoniconName;
  title: string;
  body?: string;
  asset?: ImageSourcePropType;
  tone?: 'dark' | 'light';
  index?: number;
}) {
  const isLight = tone === 'light';
  // Каскад: строка подъезжает + галочка «ставится» с лёгким overshoot.
  const anim = useRef(new Animated.Value(0)).current;
  const check = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const delay = 120 + index * 220;
    const a = Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(check, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }),
      ]),
    ]);
    a.start();
    return () => a.stop();
  }, [anim, check, index]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return (
    <Animated.View
      style={[
        styles.plusBenefitRow,
        isLight && styles.plusBenefitRowLight,
        { opacity: anim, transform: [{ translateY }] },
      ]}
    >
      <View style={[styles.plusBenefitIcon, isLight && styles.plusBenefitIconLight]}>
        {asset ? (
          <Image source={asset} style={styles.plusBenefitAsset} resizeMode="contain" />
        ) : (
          <Ionicons name={icon} size={24} color="#07111F" />
        )}
      </View>
      <View style={styles.plusBenefitCopy}>
        <Text style={[styles.plusBenefitTitle, isLight && styles.plusBenefitTitleLight]}>{title}</Text>
        {body ? <Text style={styles.plusBenefitBody}>{body}</Text> : null}
      </View>
      <Animated.View style={{ transform: [{ scale: check }] }}>
        <Ionicons name="checkmark-circle" size={24} color="#7DE0A6" />
      </Animated.View>
    </Animated.View>
  );
}

// Строка экрана сравнения Free/Plus: слева иконка+название, две колонки FREE/PLUS.
// У Free — прочерк, у Plus — галочка, которая «ставится» с лёгким overshoot; вся
// строка подъезжает снизу. Каскад задаётся index (как в PlusBenefitRow).
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
    const delay = 140 + index * 220;
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
  const [step, setStep] = useState<CleanOnboardingStep>(startAtNameStep ? 'name' : 'welcome');
  const [restored, setRestored] = useState(false);
  const [authMode, setAuthMode] = useState(false);
  const [authLoading, setAuthLoading] = useState<AuthProviderId | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [source, setSource] = useState<DiscoverySource | null>(null);
  const [studyTarget, setStudyTarget] = useState<StudyTarget>('en');
  const [level, setLevel] = useState<LevelChoice | null>(null);
  const [goal, setGoal] = useState<PersonalPlanSetupGoal | null>(null);
  const [minutes, setMinutes] = useState<PlanMinutesChoice | null>(null);
  const [plusSelected, setPlusSelected] = useState(true);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [paywallBusy, setPaywallBusy] = useState(false);
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [ageAnswer, setAgeAnswer] = useState<AgeAnswer>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [finishBusy, setFinishBusy] = useState(false);
  const finishingRef = useRef(false);

  const selectedGoal = goal ?? 'everyday';
  const selectedMinutes = minutes ?? 10;
  const selectedLevel = level ?? 'a2';
  const planId = useMemo<PersonalPlanId>(() => resolvePersonalPlanForGoal(selectedGoal), [selectedGoal]);
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

  const persistStep = useCallback(async (next: CleanOnboardingStep) => {
    await AsyncStorage.multiSet([
      [FLOW_VERSION_KEY, CLEAN_ONBOARDING_FLOW_VERSION],
      [STEP_KEY, next],
    ]).catch(() => {});
  }, []);

  const go = useCallback((next: CleanOnboardingStep) => {
    setStep(next);
    void persistStep(next);
    trackOnboardingStepView({ step: next });
  }, [persistStep]);

  const { displayStep, slideStyle } = useStepSlide(step);

  const back = useCallback(() => {
    const index = CLEAN_ONBOARDING_ORDER.indexOf(step);
    if (index <= 0) return;
    go(CLEAN_ONBOARDING_ORDER[index - 1]);
  }, [go, step]);

  useEffect(() => {
    let active = true;
    if (startAtNameStep) {
      setStep('name');
      void persistStep('name');
      setRestored(true);
      return () => { active = false; };
    }
    AsyncStorage.multiGet([FLOW_VERSION_KEY, STEP_KEY, ONBOARDING_REQUESTED_STUDY_TARGET_KEY, PLAN_GOAL_KEY, PLAN_LEVEL_KEY, PLAN_MINUTES_KEY, DISCOVERY_SOURCE_KEY])
      .then((rows) => {
        if (!active) return;
        const map = new Map(rows);
        const savedTarget = SHOW_ONBOARDING_LANGUAGE_STEP ? map.get(ONBOARDING_REQUESTED_STUDY_TARGET_KEY) : 'en';
        if (savedTarget === 'en' || savedTarget === 'fr') setStudyTarget(savedTarget);
        const savedGoal = map.get(PLAN_GOAL_KEY);
        if (GOAL_OPTIONS.some((item) => item.id === savedGoal)) setGoal(savedGoal as PersonalPlanSetupGoal);
        const savedLevel = map.get(PLAN_LEVEL_KEY);
        if (LEVEL_OPTIONS.some((item) => item.id === savedLevel)) setLevel(savedLevel as LevelChoice);
        const savedMinutes = Number(map.get(PLAN_MINUTES_KEY));
        if (savedMinutes === 5 || savedMinutes === 10 || savedMinutes === 15 || savedMinutes === 20) setMinutes(savedMinutes);
        const savedSource = map.get(DISCOVERY_SOURCE_KEY);
        if (DISCOVERY_OPTIONS.some((item) => item.id === savedSource)) setSource(savedSource as DiscoverySource);
        const savedStep = normalizedStoredStep(map.get(STEP_KEY) ?? null);
        const savedVersion = map.get(FLOW_VERSION_KEY);
        if (savedVersion === CLEAN_ONBOARDING_FLOW_VERSION && savedStep) {
          setStep(savedStep);
        } else {
          void persistStep('welcome');
        }
      })
      .finally(() => { if (active) setRestored(true); });
    return () => { active = false; };
  }, [persistStep, startAtNameStep]);

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
          : result.error.includes('google_signin_timeout')
            ? 'Google не ответил вовремя. Закрой окно входа, вернись в приложение и попробуй ещё раз.'
            : 'Не получилось войти. Попробуй ещё раз.');
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

  const chooseSource = useCallback((next: DiscoverySource) => {
    setSource(next);
    void AsyncStorage.multiSet([
      [DISCOVERY_SOURCE_KEY, next],
      ['onboarding_source', next],
    ]).catch(() => {});
    trackOnboarding('onboarding_source_select', { source: next });
    if (SHOW_ONBOARDING_LANGUAGE_STEP) {
      go('language');
      return;
    }
    void ensureEnglishStudyTarget();
    go('level');
  }, [ensureEnglishStudyTarget, go]);

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

  const chooseGoal = useCallback((next: PersonalPlanSetupGoal) => {
    setGoal(next);
    void AsyncStorage.setItem(PLAN_GOAL_KEY, next).catch(() => {});
    trackOnboarding('onboarding_plan_goal_select', { goal: next });
  }, []);

  const chooseMinutes = useCallback((next: PlanMinutesChoice) => {
    setMinutes(next);
    void AsyncStorage.setItem(PLAN_MINUTES_KEY, String(next)).catch(() => {});
    trackOnboarding('onboarding_plan_minutes_select', { minutes: next });
  }, []);

  const requestPracticeNotification = useCallback(async () => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      const { granted, blocked } = await requestNotificationPermissionWithFallback().catch(
        () => ({ granted: false, blocked: false, openedSettings: false }),
      );
      if (granted) {
        await scheduleDailyReminder(20, 0, lang, { requestPermission: false, studyTarget }).catch(() => {});
        go('plusBenefits');
        return;
      }
      if (blocked) {
        Alert.alert(
          'Напоминание не включилось',
          'Разрешение на уведомления отключено. Включить его можно в настройках телефона.',
          [
            { text: 'Позже', style: 'cancel', onPress: () => go('plusBenefits') },
            {
              text: 'Открыть настройки',
              onPress: () => {
                Linking.openSettings().catch(() => {});
                go('plusBenefits');
              },
            },
          ],
        );
        return;
      }
      go('plusBenefits');
    } finally {
      setNotificationBusy(false);
    }
  }, [go, lang, notificationBusy, studyTarget]);

  const choosePaywallPlan = useCallback((next: PaywallPlan) => {
    selectBillingPlan(next);
    void AsyncStorage.setItem(PLAN_BILLING_KEY, next).catch(() => {});
    trackOnboarding('onboarding_plan_billing_select', { plan: next });
  }, [selectBillingPlan]);

  const queueSelectedPlan = useCallback(async (billing: PaywallPlan = selectedBillingPlan) => {
    await queuePendingPersonalPlanActivation({
      planId,
      minutesPerDay: selectedMinutes,
      source: 'onboarding',
    });
    await AsyncStorage.multiSet([
      [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
      [PLAN_BILLING_KEY, billing],
    ]);
  }, [planId, selectedBillingPlan, selectedMinutes]);

  // Выбор Free → сразу к имени. Выбор Plus → сначала лёгкий экран сравнения выгод
  // (planComparison), и только с него — к ценам. Подготовку плана и трекинг пейвола
  // делаем на переходе «сравнение → цены» (continueFromPlanComparison), а не здесь,
  // чтобы экран сравнения открывался мгновенно, без busy-состояния.
  const openPaywallOrName = useCallback(async () => {
    if (!plusSelected) {
      go('name');
      return;
    }
    go('planComparison');
  }, [go, plusSelected]);

  const continueFromPlanComparison = useCallback(async () => {
    if (paywallBusy) return;
    setPaywallBusy(true);
    try {
      await queueSelectedPlan('yearly');
      trackOnboardingPlanTrialCta({ planId, minutes: selectedMinutes, plan: 'yearly' });
      trackOnboardingPlanPaywallView({ planId, minutes: selectedMinutes, plan: 'yearly' });
      go('onboardingPaywall');
    } finally {
      setPaywallBusy(false);
    }
  }, [go, paywallBusy, planId, queueSelectedPlan, selectedMinutes]);

  const continueFromOnboardingPaywall = useCallback(async () => {
    if (paywallBusy || paywallPurchasing) return;
    setPaywallBusy(true);
    try {
      // Ставим план в очередь активации ДО покупки: после успеха хук вызывает
      // finishPersonalPlanActivationFlow, который читает pending-nickname ключ
      // (его выставляет queueSelectedPlan) и возвращает в онбординг на шаг «Имя».
      await queueSelectedPlan(selectedBillingPlan);
      trackOnboardingPlanTrialCta({ planId, minutes: selectedMinutes, plan: selectedBillingPlan });
      // Реальная покупка выбранного тарифа. Хук сам обрабатывает отмену
      // (userCancelled — тихо остаёмся на шаге), ошибку (свой Alert) и
      // навигацию при успехе (finishPersonalPlanActivationFlow → шаг «Имя»).
      await paywallHandlePurchase();
    } finally {
      setPaywallBusy(false);
    }
  }, [paywallBusy, paywallHandlePurchase, paywallPurchasing, planId, queueSelectedPlan, selectedBillingPlan, selectedMinutes]);

  const finish = useCallback(async () => {
    if (finishBusy || finishingRef.current) return;
    setLegalError(null);
    const enteredName = name.trim();
    if (enteredName.length < 2) {
      setNameError('Введи имя.');
      return;
    }
    if (ageAnswer !== 'yes') {
      setLegalError(ageAnswer === 'no' ? 'Приложение доступно с 16 лет.' : 'Подтверди, что тебе уже есть 16.');
      return;
    }
    if (!legalAccepted) {
      setLegalError('Нужно принять условия и политику конфиденциальности.');
      return;
    }

    finishingRef.current = true;
    setFinishBusy(true);
    try {
      const finalName = await ensureLocalNickname(enteredName).catch(() => enteredName || 'Phraseman');
      const currentLevel = levelToCurrentLevel(selectedLevel);
      const profileMinutes = minutesToProfileMinutes(selectedMinutes);
      const targetLevel = targetAfterLevel(currentLevel);
      const estimatedDays = estimateDaysToTarget(currentLevel, targetLevel, profileMinutes);
      const targetDate = addDays(new Date(), estimatedDays || 30);
      const profile: UserProfile = {
        name: finalName,
        learningGoal: goalToLearningGoal(selectedGoal),
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
        ['user_name', finalName],
        ['user_profile', JSON.stringify(profile)],
        [LEGAL_ACCEPTED_KEY, '1'],
        [ANALYTICS_HELP_KEY, analyticsAllowed ? '1' : '0'],
        [DONE_KEY, '1'],
        [FLOW_VERSION_KEY, CLEAN_ONBOARDING_FLOW_VERSION],
      ]);
      await AsyncStorage.multiRemove([STEP_KEY, PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY]).catch(() => {});
      await setBirthYear(new Date().getFullYear() - MIN_FULL_ACCESS_AGE).catch(() => null);
      await setAnalyticsConsent(analyticsAllowed ? 'granted' : 'denied').catch(() => null);
      void recordConsentToCloud();
      void scheduleDailyReminder(20, 0, lang, { requestPermission: false, studyTarget }).catch(() => {});
      if (analyticsAllowed && source) {
        trackOnboarding('onboarding_source_select', {
          source,
          consented: true,
        });
      }
      trackOnboarding('onboarding_complete', {
        goal: selectedGoal,
        level: selectedLevel,
        minutes: selectedMinutes,
        target: studyTarget,
        plusSelected,
      });
      onDone();
    } finally {
      setFinishBusy(false);
      finishingRef.current = false;
    }
  }, [
    ageAnswer,
    analyticsAllowed,
    finishBusy,
    lang,
    legalAccepted,
    name,
    onDone,
    plusSelected,
    selectedGoal,
    selectedLevel,
    selectedMinutes,
    source,
    studyTarget,
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
            <Text
              style={styles.welcomeTitle}
              numberOfLines={3}
              adjustsFontSizeToFit
              minimumFontScale={0.78}
            >
              {authMode ? 'Вернём твой прогресс' : 'От первых слов до свободной речи.'}
            </Text>
            {authMode ? null : (
              <FadeUp delay={520}>
                <Text style={styles.welcomeSubtitle}>Живые фразы · короткие сессии · твой маршрут</Text>
              </FadeUp>
            )}
          </View>

          {authMode ? (
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
              <SecondaryButton label="Назад" onPress={() => setAuthMode(false)} testID="onboarding-auth-back" />
            </View>
          ) : (
            <View style={styles.welcomeButtons}>
              <PrimaryButton label="Начать" onPress={() => go('source')} testID="onboarding-start" />
              <SecondaryButton label="У меня уже есть аккаунт" onPress={() => setAuthMode(true)} testID="onboarding-existing-account" />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
      footer={<PrimaryButton label="Продолжить" onPress={() => go('goal')} disabled={!level} testID="onboarding-level-continue" />}
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

  const renderGoal = () => (
    <ScreenFrame
      step="goal"
      title={goal ? reactionForGoal(goal) : `Зачем тебе ${targetLabel(studyTarget, 'accusative')}?`}
      onBack={back}
      footer={<PrimaryButton label="Продолжить" onPress={() => go('minutes')} disabled={!goal} testID="onboarding-goal-continue" />}
    >
      <View style={styles.optionList}>
        {GOAL_OPTIONS.map((item) => (
          <OptionCard
            key={item.id}
            option={item}
            selected={goal === item.id}
            testID={`onboarding-goal-${item.id}`}
            onPress={() => chooseGoal(item.id)}
          />
        ))}
      </View>
    </ScreenFrame>
  );

  const renderMinutes = () => (
    <ScreenFrame
      step="minutes"
      title="Сколько времени в день?"
      onBack={back}
      footer={<PrimaryButton label="К плану" onPress={() => go('aha')} disabled={!minutes} testID="onboarding-minutes-continue" />}
    >
      <View style={styles.optionList}>
        {MINUTE_OPTIONS.map((item) => (
          <OptionCard
            key={item.id}
            option={item}
            selected={minutes === item.id}
            testID={`onboarding-minutes-${item.id}`}
            onPress={() => chooseMinutes(item.id)}
          />
        ))}
      </View>
    </ScreenFrame>
  );

  // АХ-сцена: полноэкранная (свой SafeArea и скип), вне ScreenFrame-хрома.
  // Скип и завершение ведут в одну точку — уведомления просят ПОСЛЕ победы.
  const renderAha = () => (
    <AhaScene
      goal={goal ?? undefined}
      lang={lang === 'uk' || lang === 'es' ? lang : 'ru'}
      onDone={() => go('notifications')}
      onSkip={() => go('notifications')}
    />
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
            onPress={() => go('plusBenefits')}
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

  const renderStartMode = () => (
    <ScreenFrame
      step="startMode"
      title="Как хочешь начать?"
      onBack={back}
      footer={<PrimaryButton label="Продолжить" onPress={openPaywallOrName} loading={paywallBusy} testID="onboarding-start-mode-continue" />}
    >
      <View style={styles.optionList}>
        <Pressable
          testID="onboarding-start-mode-plus"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => setPlusSelected(true)}
          style={({ pressed }) => [styles.modeCard, plusSelected && styles.modeCardSelected, pressed && styles.pressed]}
        >
          <Image source={ONBOARDING_ASSETS.startPlus} style={styles.modeAsset} resizeMode="contain" />
          <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>Рекомендую</Text></View>
          <Text style={styles.modeTitle}>Phraseman Plus</Text>
        </Pressable>
        <Pressable
          testID="onboarding-start-mode-free"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => setPlusSelected(false)}
          style={({ pressed }) => [styles.modeCard, !plusSelected && styles.modeCardSelected, pressed && styles.pressed]}
        >
          <Image source={ONBOARDING_ASSETS.startFree} style={styles.modeAsset} resizeMode="contain" />
          <Text style={styles.modeTitle}>Начать бесплатно</Text>
        </Pressable>
      </View>
    </ScreenFrame>
  );

  const renderPlusBenefits = () => (
    <ScreenFrame
      step="plusBenefits"
      title="Через 3 месяца по твоему маршруту ты сможешь:"
      onBack={back}
      footer={<PrimaryButton label="Хочу так" onPress={() => go('startMode')} testID="onboarding-plus-benefits-continue" />}
    >
      <View style={styles.plusBenefitList}>
        {PLUS_THREE_MONTH_PROMISES.map((item, index) => (
          <PlusBenefitRow
            key={item.title}
            index={index}
            icon={index === 0 ? 'chatbubble-ellipses-outline' : index === 1 ? 'volume-high-outline' : 'refresh-outline'}
            title={item.title}
            body={item.body}
            asset={index === 0 ? ONBOARDING_ASSETS.benefitPlan : index === 1 ? ONBOARDING_ASSETS.benefitSpeech : ONBOARDING_ASSETS.benefitRepeat}
          />
        ))}
      </View>
    </ScreenFrame>
  );

  // Экран сравнения выгод Free/Plus между выбором «Plus» и ценами. Светлый, с
  // анимированными галочками по очереди. Реальные киллер-фичи из пейвола.
  const renderPlanComparison = () => (
    <ScreenFrame
      step="planComparison"
      title="С Plus открыто всё"
      onBack={back}
      light
      plainTitle
      footer={<PrimaryButton label="Хочу так" onPress={() => void continueFromPlanComparison()} loading={paywallBusy} testID="onboarding-plan-comparison-continue" />}
    >
      <Text style={styles.cmpSubtitle}>Вот что добавится к бесплатному</Text>
      <View style={styles.cmpHeaderRow}>
        <View style={styles.cmpLabelCell} />
        <Text style={styles.cmpHeaderFree}>FREE</Text>
        <Text style={styles.cmpHeaderPlus}>PLUS</Text>
      </View>
      <View style={styles.cmpList}>
        {PLAN_COMPARISON_BENEFITS.map((item, index) => (
          <PlanComparisonRow key={item.title} index={index} icon={item.icon} title={item.title} />
        ))}
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
        onBack={back}
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
            <View style={styles.paywallFooterLinks}>
              <Pressable
                testID="onboarding-paywall-restore"
                onPressIn={() => { void hapticTap(); }}
                onPress={() => { void handleRestore(); }}
                disabled={paywallRestoring}
                accessibilityRole="button"
              >
                <Text style={styles.paywallFooterLink}>{paywallRestoring ? 'Восстанавливаем...' : 'Восстановить'}</Text>
              </Pressable>
              <Text style={styles.paywallFooterDot}>·</Text>
              <Pressable
                testID="onboarding-paywall-continue-free"
                onPressIn={() => { void hapticTap(); }}
                onPress={() => go('name')}
                accessibilityRole="button"
              >
                <Text style={styles.paywallFooterLink}>Продолжить бесплатно</Text>
              </Pressable>
            </View>
          </>
        }
      >
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
      </ScreenFrame>
    );
  };

  const renderName = () => (
    <ScreenFrame
      step="name"
      title="Как ты хочешь, чтобы мы тебя называли?"
      onBack={back}
      footer={(
        <PrimaryButton
          label="Сохранить и начать"
          onPress={() => {
            Keyboard.dismiss();
            void finish();
          }}
          loading={finishBusy}
          testID="onboarding-finish"
        />
      )}
    >
      <View style={styles.inputCard}>
        <TextInput
          testID="onboarding-name-input"
          value={name}
          onChangeText={(value) => { setName(value); setNameError(null); }}
          placeholder="Твоё имя"
          placeholderTextColor="#69728E"
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => { void finish(); }}
          style={styles.nameInput}
        />
      </View>
      {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
      <Text style={styles.inlineQuestion}>Тебе уже есть 16?</Text>
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
            setLegalError('Приложение доступно с 16 лет.');
          }}
          style={({ pressed }) => [styles.ageButton, ageAnswer === 'no' && styles.ageButtonSelected, pressed && styles.pressed]}
        >
          <Text style={styles.ageButtonText}>Нет</Text>
        </Pressable>
      </View>
      <Pressable
        testID="onboarding-analytics-checkbox"
        onPressIn={() => { void hapticTap(); }}
        onPress={() => setAnalyticsAllowed((value) => !value)}
        style={styles.checkboxRow}
      >
        <View style={[styles.checkbox, analyticsAllowed && styles.checkboxSelected]}>
          {analyticsAllowed ? <Ionicons name="checkmark" size={18} color="#07111F" /> : null}
        </View>
        <Text style={styles.checkboxText}>
          Разрешить собирать анонимную аналитику.
        </Text>
      </Pressable>
      <Pressable
        testID="onboarding-legal-checkbox"
        onPressIn={() => { void hapticTap(); }}
        onPress={() => { setLegalAccepted((value) => !value); setLegalError(null); }}
        style={styles.checkboxRow}
      >
        <View style={[styles.checkbox, legalAccepted && styles.checkboxSelected]}>
          {legalAccepted ? <Ionicons name="checkmark" size={18} color="#07111F" /> : null}
        </View>
        <Text style={styles.checkboxText}>
          Я принимаю{' '}
          <Text style={styles.linkText} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>Условия использования</Text>
          {' '}и{' '}
          <Text style={styles.linkText} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>Политику конфиденциальности</Text>
        </Text>
      </Pressable>
      {legalError ? <Text style={styles.errorText}>{legalError}</Text> : null}
    </ScreenFrame>
  );
  // Welcome (свои анимации) и aha (полноэкранная сцена со своими переходами)
  // рисуем без слайд-обёртки; остальным шагам даём плавную смену.
  const renderStep = (which: CleanOnboardingStep): React.ReactNode => {
    switch (which) {
      case 'welcome': return renderWelcome();
      case 'source': return renderSource();
      case 'language': return renderLanguage();
      case 'level': return renderLevel();
      case 'goal': return renderGoal();
      case 'minutes': return renderMinutes();
      case 'aha': return renderAha();
      case 'notifications': return renderNotifications();
      case 'startMode': return renderStartMode();
      case 'plusBenefits': return renderPlusBenefits();
      case 'planComparison': return renderPlanComparison();
      case 'onboardingPaywall': return renderOnboardingPaywall();
      case 'name': return renderName();
      default: return renderWelcome();
    }
  };

  const bare = displayStep === 'welcome' || displayStep === 'aha';

  return (
    <View style={styles.root}>
      <Background />
      {bare ? (
        renderStep(displayStep)
      ) : (
        <Animated.View style={[styles.stepSlide, slideStyle]}>{renderStep(displayStep)}</Animated.View>
      )}
    </View>
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
    borderWidth: 1.5,
    borderColor: 'rgba(231,238,255,0.42)',
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginBottom: 36,
    shadowColor: '#B7C8FF',
    shadowOpacity: 0.34,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 16 },
    elevation: 10,
    overflow: 'hidden',
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1.5,
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
    borderWidth: 2,
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
    borderWidth: 1.5,
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
    borderWidth: 1,
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
    borderWidth: 2,
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
    borderWidth: 1,
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
    borderWidth: 1.5,
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
    borderWidth: 1,
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
    elevation: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    padding: 14,
    gap: 12,
  },
  planStepRow: {
    minHeight: 86,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
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
    borderWidth: 1.5,
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
    elevation: 2,
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
    borderWidth: 2,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1,
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
    borderWidth: 1.5,
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
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(255,255,255,0.045)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageButtonSelected: {
    borderColor: '#AAB5FF',
    backgroundColor: 'rgba(151,138,255,0.20)',
  },
  ageButtonText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
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
    borderWidth: 2,
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
  errorText: {
    color: '#FF9AAE',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
});

export default memo(CleanOnboarding);

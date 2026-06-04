import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, ScrollView,
  Animated, BackHandler, Keyboard, Easing,
  Platform,
  StatusBar,
  Image as RNImage,
  type ImageStyle,
  type ImageSourcePropType,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from './SafeLinearGradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { generateReferralCode } from '../app/referral_system';
import { IS_BETA_TESTER } from '../app/config';
// Онбординг закреплён за темой "Графит" (MINIMAL_DARK) — это одна из двух
// бесплатных тем (вторая — "Скетч"/MINIMAL_LIGHT). Импортируем под алиасом
// `DARK`, чтобы не править все ~150 ссылок DARK.* по тексту экрана.
import { MINIMAL_DARK as DARK } from '../constants/theme';
import { isInterfaceLangEnabled, type Lang } from '../constants/i18n';
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
import { reserveName } from '../app/firestore_leaderboard';
import { validateProfileName } from '../app/settings/profile_name_service';
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
import { usePremium } from './PremiumContext';

const AppInfoDialog = {
  alert(title: string, message: string) {
    void enqueueThemedBlockingInfoAlert(title, message, 'OK');
  },
};

interface Props {
  onDone: () => void;
  onLangSelect?: (lang: Lang) => void;
  onPersonalPlanPaywallStart?: () => Promise<void> | void;
}


const TARGET_LEVELS = ['a1', 'a2', 'b1', 'b2', 'c1'] as const;
const PROGRESS_STEPS = ['welcome', 'name', 'streak', 'auth'] as const;
type OnboardingStepKey = 'beta' | 'planEntry' | 'planGoal' | 'planLevel' | 'planMinutes' | 'planPhrase' | 'planLoading' | 'planResult' | 'planPaywall' | 'planPicker' | 'planDetails' | 'welcome' | 'demo2' | 'demo' | 'name' | 'streak' | 'auth';
type OnboardingPlanGoal = 'travel' | 'work' | 'move' | 'self';
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
const ONBOARDING_ACCENT = '#F2B84B';
const ONBOARDING_GOLD_2 = '#FFD472';
const ONBOARDING_TEAL = '#63E6D2';
const ONBOARDING_ACCENT_BG = 'rgba(242,184,75,0.16)';
const ONBOARDING_TEXT_MUTED = '#D8CCB5';
const ONBOARDING_BG_WELCOME = require('../assets/images/onboarding/onboarding-bg-welcome-wide.webp');
const ONBOARDING_BG_BETA = ONBOARDING_BG_WELCOME;
const ONBOARDING_BG_NAME = ONBOARDING_BG_WELCOME;
const ONBOARDING_BG_BUILDER = ONBOARDING_BG_WELCOME;
const ONBOARDING_BG_QUIZ = ONBOARDING_BG_WELCOME;
const ONBOARDING_BG_STREAK = ONBOARDING_BG_WELCOME;
const ONBOARDING_BG_AUTH = ONBOARDING_BG_WELCOME;
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
  ONBOARDING_LINGMAN_ICON,
  ONBOARDING_AUTH_ICON,
  ...Object.values(ONBOARDING_STREAK_ICONS),
  ...Object.values(ONBOARDING_PLAN_ICONS),
  ...Object.values(ONBOARDING_PAYWALL_ICONS),
] as const;
type PlanIconSource = (typeof ONBOARDING_PLAN_ICONS)[keyof typeof ONBOARDING_PLAN_ICONS];
type PaywallIconSource = (typeof ONBOARDING_PAYWALL_ICONS)[keyof typeof ONBOARDING_PAYWALL_ICONS];
const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const PLAN_LOADING_METER_KEYFRAMES = {
  inputRange: [0, 0.35, 0.7, 1],
  outputRange: [0.06, 0.42, 0.76, 1],
};
const PLAN_LOADING_BUTTON_REVEAL = { delay: 3350, duration: 350 };
const PLAN_DAYS_COUNT_DURATION_MS = 2800;
const PLAN_LOADING_BUILD_ITEMS: Array<{
  title: string;
  iconAsset: PlanIconSource;
  delay: number;
}> = [
  { title: 'Определяем стартовый уровень', iconAsset: ONBOARDING_PLAN_ICONS.study, delay: 450 },
  { title: 'Учитываем цель и темп', iconAsset: ONBOARDING_PLAN_ICONS.time, delay: 1100 },
  { title: 'Собираем маршрут', iconAsset: ONBOARDING_PLAN_ICONS.path, delay: 1750 },
];
const PLAN_PHRASE_TOKENS = ['need', 'I', 'more', 'time'] as const;
const PLAN_PHRASE_TARGET = ['I', 'need', 'more', 'time'] as const;

function warmOnboardingBundledImages() {
  ONBOARDING_PRELOADED_ICON_ASSETS.forEach((source) => {
    RNImage.resolveAssetSource(source);
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
}: {
  source: ImageSourcePropType;
  small?: boolean;
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
const PLAN_PROGRESS_STEPS: OnboardingStepKey[] = ['planGoal', 'planLevel', 'planMinutes', 'planPhrase', 'planLoading', 'planResult'];
const PREV_STEP: Partial<Record<OnboardingStepKey, OnboardingStepKey>> = {
  planGoal: 'planEntry',
  planLevel: 'planGoal',
  planMinutes: 'planLevel',
  planPhrase: 'planMinutes',
  planLoading: 'planPhrase',
  planResult: 'planLoading',
  planPaywall: 'planResult',
  planPicker: 'planResult',
  planDetails: 'planPicker',
  welcome: 'planEntry',
  demo2: 'welcome',
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
}> = {
  voyazh: {
    name: 'Вояж',
    goal: 'спокойно проходить поездку без переводчика на каждом шаге',
    pitch: 'Представь поездку, где ты не ищешь каждую фразу в переводчике: можешь спросить дорогу, уточнить бронь, заказать еду, заселиться и объяснить проблему простыми словами.',
    horizon: 'около 12 недель',
    days: 84,
    recommendedLevel: 'A2',
    minutesDefault: 15,
    iconAsset: ONBOARDING_PLAN_ICONS.travel,
    todayIconAsset: ONBOARDING_PLAN_ICONS.phrase,
    short: 'Поездки, отель, кафе, аэропорт и вопросы на месте.',
    levelSub: 'Рекомендуем A2, потому что план сразу ведёт в реальные сценарии поездки: аэропорт, стойка регистрации, кафе, отель, просьбы и уточнения.',
    outcome: 'Уже к середине этого срока ты сможешь не просто учить слова, а действовать: спросить, понять ответ, переспросить и не теряться в типичных ситуациях поездки.',
  },
  mitap: {
    name: 'Митап',
    goal: 'не выпадать из рабочих разговоров и переписки',
    pitch: 'План для рабочих моментов, где важно звучать понятно: ты учишься отвечать на созвоне, уточнять задачу, объяснять срок, просить детали и писать коротко без паники.',
    horizon: 'около 16 недель',
    days: 112,
    recommendedLevel: 'A2 → B1',
    minutesDefault: 20,
    iconAsset: ONBOARDING_PLAN_ICONS.work,
    todayIconAsset: ONBOARDING_PLAN_ICONS.phrase,
    short: 'Рабочие созвоны, переписка, сроки и короткие объяснения.',
    levelSub: 'A2 даёт быстрый вход в рабочие фразы, а движение к B1 добавляет связки для объяснений, уточнений, вежливых просьб и короткой переписки.',
    outcome: 'Уже к середине этого срока ты сможешь держаться в простых рабочих ситуациях: ответить по задаче, назвать срок, попросить уточнение и обозначить следующий шаг.',
  },
  gavan: {
    name: 'Гавань',
    goal: 'решать бытовые вопросы в новой стране увереннее',
    pitch: 'План для первых месяцев после переезда: чтобы не зависеть от переводчика в каждом вопросе и спокойно говорить про жильё, документы, врача, школу и обычные дела.',
    horizon: 'около 18 недель',
    days: 126,
    recommendedLevel: 'A1 → A2',
    minutesDefault: 15,
    iconAsset: ONBOARDING_PLAN_ICONS.home,
    todayIconAsset: ONBOARDING_PLAN_ICONS.phrase,
    short: 'Переезд, жильё, документы, врачи, школа и бытовые дела.',
    levelSub: 'A1 закрывает бытовую базу, затем A2 добавляет самостоятельность: объяснить ситуацию, спросить детали, записаться, уточнить условия и договориться.',
    outcome: 'Уже к середине этого срока ты сможешь увереннее решать городские задачи: спросить, записаться, описать проблему, заполнить простые данные и понять следующий шаг.',
  },
  impuls: {
    name: 'Импульс',
    goal: 'начинать говорить быстрее, даже если ответ не идеальный',
    pitch: 'План для момента, когда ты понимаешь мысль, но зависаешь перед ответом. Здесь тренируются готовые связки, реакции и короткие конструкции, чтобы речь начиналась быстрее.',
    horizon: 'около 20 недель',
    days: 140,
    recommendedLevel: 'A2 → B1',
    minutesDefault: 20,
    iconAsset: ONBOARDING_PLAN_ICONS.confidence,
    todayIconAsset: ONBOARDING_PLAN_ICONS.speaking,
    short: 'Быстрее отвечать и меньше зависать в живом разговоре.',
    levelSub: 'A2 собирает каркас ответа, B1 добавляет гибкость: уточнить, согласиться, отказаться, попросить время и продолжить разговор.',
    outcome: 'Уже к середине этого срока ты сможешь отвечать быстрее, меньше зависать на каждой фразе и собирать уверенные ответы из знакомых конструкций.',
  },
  echo: {
    name: 'Эхо',
    goal: 'поддерживать короткий разговор без ощущения экзамена',
    pitch: 'План для живых диалогов, где нужно не идеально говорить, а быстро понять смысл, переспросить, уточнить и ответить так, чтобы разговор продолжался.',
    horizon: 'около 12 недель',
    days: 84,
    recommendedLevel: 'A2',
    minutesDefault: 10,
    iconAsset: ONBOARDING_PLAN_ICONS.speaking,
    todayIconAsset: ONBOARDING_PLAN_ICONS.phrase,
    short: 'Короткие диалоги, уточнения, переспросы и быстрые ответы.',
    levelSub: 'A2 достаточно, чтобы тренировать короткие реплики, реакции, уточнения и готовые ответы без отдельного режима и без перегруза теорией.',
    outcome: 'Уже к середине этого срока ты сможешь быстрее подбирать ответ, переспрашивать без неловкости, уточнять смысл и поддерживать короткий обычный диалог.',
  },
};

function resolveOnboardingPlanId(
  goal: OnboardingPlanGoal,
  level: OnboardingPlanLevel,
  minutes: PlanMinutesChoice,
  explicitPlanId?: PersonalPlanId | null,
): PersonalPlanId {
  if (explicitPlanId) return explicitPlanId;
  if (goal === 'travel') return 'voyazh';
  if (goal === 'work') return 'mitap';
  if (goal === 'move') return 'gavan';
  if (level === 'b1') return 'impuls';
  if (level === 'a2' && (minutes === 15 || minutes === 20)) return 'impuls';
  return 'echo';
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
}> = [
  { id: 'travel', iconAsset: ONBOARDING_PLAN_ICONS.travel, title: 'Для поездок', subtitle: 'Аэропорт, отель, кафе, вопросы на месте' },
  { id: 'work', iconAsset: ONBOARDING_PLAN_ICONS.work, title: 'Для работы', subtitle: 'Созвоны, переписка, короткие объяснения' },
  { id: 'move', iconAsset: ONBOARDING_PLAN_ICONS.home, title: 'Для переезда', subtitle: 'Быт, документы, врачи, школа, жильё' },
  { id: 'self', iconAsset: ONBOARDING_PLAN_ICONS.study, title: 'Для себя', subtitle: 'Спокойно прокачивать понимание и речь' },
];

const PLAN_LEVEL_CHOICES: Array<{
  id: OnboardingPlanLevel;
  iconAsset: PlanIconSource;
  title: string;
  subtitle: string;
}> = [
  { id: 'a0', iconAsset: ONBOARDING_PLAN_ICONS.beginner, title: 'A0: почти с нуля', subtitle: 'Нужны самые базовые фразы' },
  { id: 'a1', iconAsset: ONBOARDING_PLAN_ICONS.basic, title: 'A1: знаю базовые слова', subtitle: 'Хочу быстрее собирать фразы' },
  { id: 'a2', iconAsset: ONBOARDING_PLAN_ICONS.speaking, title: 'A2: понимаю, но не говорю', subtitle: 'Нужна практика ответов' },
  { id: 'b1', iconAsset: ONBOARDING_PLAN_ICONS.confidence, title: 'B1: хочу говорить увереннее', subtitle: 'Нужен ритм и сложнее задания' },
];

const PLAN_MINUTES_CHOICES: PlanMinutesChoice[] = [5, 10, 15, 20];

const PLAN_ENTRIES: Array<{
  key: PersonalPlanId;
  minutes: PlanMinutesChoice;
  short: string;
  todayIconAsset?: PlanIconSource;
}> = [
  { key: 'voyazh', minutes: 15, short: 'Поездки, отель, кафе, аэропорт и вопросы на месте.' },
  { key: 'mitap', minutes: 20, short: 'Рабочие созвоны, переписка, сроки и короткие объяснения.' },
  { key: 'gavan', minutes: 15, short: 'Переезд, жильё, документы, врачи, школа и бытовые дела.' },
  { key: 'impuls', minutes: 20, short: 'Быстрее отвечать и меньше зависать в живом разговоре.', todayIconAsset: ONBOARDING_PLAN_ICONS.speaking },
  { key: 'echo', minutes: 10, short: 'Короткие диалоги, уточнения, переспросы и быстрые ответы.' },
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
    subtitle: 'ежедневный маршрут под цель и ошибки',
    featured: true,
  },
  {
    key: 'lessons',
    iconAsset: ONBOARDING_PAYWALL_ICONS.lessons,
    title: 'Все уроки разблокированы',
    subtitle: 'полный доступ ко всем урокам курса',
  },
  {
    key: 'quizzes',
    iconAsset: ONBOARDING_PAYWALL_ICONS.quizzes,
    title: 'Все уровни квизов',
    subtitle: 'без дневного лимита на практику',
  },
  {
    key: 'cards',
    iconAsset: ONBOARDING_PAYWALL_ICONS.cards,
    title: 'Карточки без ограничений',
    subtitle: 'сохраняй неограниченное количество фраз',
  },
  {
    key: 'energy',
    iconAsset: ONBOARDING_PAYWALL_ICONS.energy,
    title: 'Безлимит энергии',
    subtitle: 'уроки, квизы и экзамены без ожидания',
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
    title: 'Разборы твоих ошибок',
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
    subtitle: 'активность, ошибки и сравнение с другими',
  },
  {
    key: 'themes',
    iconAsset: ONBOARDING_PAYWALL_ICONS.themes,
    title: 'Premium-стиль',
    subtitle: 'все темы приложения',
  },
  {
    key: 'frame',
    iconAsset: ONBOARDING_PAYWALL_ICONS.frame,
    title: 'Золотой ник и рамка',
    subtitle: 'отдельное оформление профиля и рейтингов',
  },
];

export default function Onboarding({ onDone, onLangSelect, onPersonalPlanPaywallStart }: Props) {
  const insets = useSafeAreaInsets();
  const { hasPremiumAccess } = usePremium();
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
  };

  useEffect(() => {
    warmOnboardingBundledImages();
  }, []);
  const streakHeroIconSize = scaleOnboarding(compactOnboarding ? 52 : 76, 44);
  const streakMilestoneIconSize = scaleOnboarding(compactOnboarding ? 38 : 52, 34);

  // Device locale -> enabled interface locale; otherwise RU.
  const detectLang = (): Lang => {
    try {
      const locale = (Intl.DateTimeFormat().resolvedOptions().locale ?? '').toLowerCase();
      if (locale.startsWith('uk')) return 'uk';
      if (locale.startsWith('es') && isInterfaceLangEnabled('es')) return 'es';
      if ((locale.startsWith('pt-br') || locale === 'pt') && isInterfaceLangEnabled('pt-BR')) return 'pt-BR';
      if (locale.startsWith('vi') && isInterfaceLangEnabled('vi')) return 'vi';
      if (locale.startsWith('id') && isInterfaceLangEnabled('id')) return 'id';
      if (locale.startsWith('tr') && isInterfaceLangEnabled('tr')) return 'tr';
      if (locale.startsWith('pl') && isInterfaceLangEnabled('pl')) return 'pl';
      return 'ru';
    } catch {
      return 'ru';
    }
  };

  type OnboardingStep = OnboardingStepKey;
  const [step, setStepRaw]    = useState<OnboardingStep>(IS_BETA_TESTER ? 'beta' : 'planEntry');
  const stepRef = useRef(step);
  const setStep = useCallback((next: OnboardingStep) => {
    stepRef.current = next;
    setStepRaw(next);
    AsyncStorage.setItem('onboarding_step', next).catch(() => {});
  }, []);
  const nameForProfileRef = useRef('');
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
  const [lang]       = useState<Lang>(detectLang);
  const [name, setName]       = useState('');
  const [nameBusy, setNameBusy] = useState(false);
  const [nameFieldError, setNameFieldError] = useState<string | null>(null);
  const [keyboardPad, setKeyboardPad] = useState(0);
  const [selectedPlanGoal, setSelectedPlanGoal] = useState<OnboardingPlanGoal>('travel');
  const [selectedPlanLevel, setSelectedPlanLevel] = useState<OnboardingPlanLevel>('a1');
  const [selectedPlanMinutes, setSelectedPlanMinutes] = useState<PlanMinutesChoice>(15);
  const [selectedPlanOverride, setSelectedPlanOverride] = useState<PersonalPlanId | null>(null);
  const [selectedPlanPhraseTokens, setSelectedPlanPhraseTokens] = useState<string[]>([]);
  const [selectedPlanBilling, setSelectedPlanBilling] = useState<OnboardingBillingChoice>('annual');
  const [nicknameMode, setNicknameMode] = useState<OnboardingNicknameMode>('regular');
  const [planPhraseWasCorrect, setPlanPhraseWasCorrect] = useState(true);
  const [showPlanFreeConfirm, setShowPlanFreeConfirm] = useState(false);
  const [planLoadingCtaReady, setPlanLoadingCtaReady] = useState(false);
  const [animatedPlanDays, setAnimatedPlanDays] = useState(0);
  const [planLoadingRailWidth, setPlanLoadingRailWidth] = useState(0);
  const [planDaysRailWidth, setPlanDaysRailWidth] = useState(0);
  const planLoadingMeter = useRef(new Animated.Value(0)).current;
  const planLoadingBuildAnims = useRef(PLAN_LOADING_BUILD_ITEMS.map(() => new Animated.Value(0))).current;
  const planLoadingButtonAnim = useRef(new Animated.Value(0)).current;
  const planDaysProgress = useRef(new Animated.Value(0)).current;
  // Дефолтные значения — экраны выбора удалены, профиль сохраняется с базовыми настройками
  const goal: LearningGoal       = 'hobby';
  const minutesPerDay: MinutesPerDay = 15;
  const currentLevel: CurrentLevel   = 'a1';
  const [notificationTime] = useState<string>('08:00');

  const isUK = lang === 'uk';
  const pick = (ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru;
  const triOb = (ru: string, uk: string, es: string) =>
    lang === 'es' ? es : isUK ? uk : ru;
  const selectedPlanId = resolveOnboardingPlanId(selectedPlanGoal, selectedPlanLevel, selectedPlanMinutes, selectedPlanOverride);
  const selectedPlan = PERSONAL_PLAN_ONBOARDING_PLANS[selectedPlanId];

  // Плавный переход между экранами
  const goToStep = useCallback((next: typeof step) => {
    setShowPlanFreeConfirm(false);
    Animated.timing(screenFade, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => {
      setStep(next);
    });
  }, [screenFade, setStep]);

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
      const prev = PREV_STEP[step];
      if (prev) { goToStep(prev); return true; }
      return true; // блокируем GO_BACK даже на первом экране
    });
    return () => sub.remove();
  }, [step, goToStep]);

  const renderProgressBar = () => {
    const idx = (PROGRESS_STEPS as readonly string[]).indexOf(step);
    if (idx < 0) return null;
    const pct = Math.round(((idx + 1) / PROGRESS_STEPS.length) * 100);
    const prev = PREV_STEP[step];
    return (
      <View style={[styles.progressWrap, { paddingTop: progressTopPadding }]}>
        <View style={styles.progressRow}>
          {prev ? (
            <TouchableOpacity onPress={() => goToStep(prev)} activeOpacity={0.7} style={{ padding: 8, marginRight: 8 }}>
              <Text style={{ color: ONBOARDING_ACCENT, fontSize: 20 }}>←</Text>
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

  // Восстанавливаем шаг при повторном монтировании (после Alert на Android и т.п.)
  useEffect(() => {
    AsyncStorage.getItem('onboarding_step').then(saved => {
      if (saved && saved !== stepRef.current) {
        const restored = saved === 'energy' ? 'auth' : saved as OnboardingStep;
        setStepRaw(restored);
        stepRef.current = restored;
      }
    }).catch(() => {});
  }, []);

  // Fade-in экрана при каждой смене шага
  useEffect(() => {
    Animated.timing(screenFade, { toValue: 1, duration: 300, useNativeDriver: true }).start();
  }, [step, screenFade]);

  useEffect(() => {
    if (step !== 'planLoading') return;
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
    const timeout = setTimeout(() => setPlanLoadingCtaReady(true), PLAN_LOADING_BUTTON_REVEAL.delay);
    Animated.parallel(animations).start();
    return () => {
      clearTimeout(timeout);
      planLoadingMeter.stopAnimation();
      planLoadingBuildAnims.forEach((value) => value.stopAnimation());
      planLoadingButtonAnim.stopAnimation();
    };
  }, [planLoadingBuildAnims, planLoadingButtonAnim, planLoadingMeter, step]);

  useEffect(() => {
    if (step !== 'planPhrase') return;
    setSelectedPlanPhraseTokens([]);
    setPlanPhraseWasCorrect(false);
  }, [step]);

  useEffect(() => {
    if (step !== 'planResult' && step !== 'planDetails') return;
    const total = selectedPlan.days;
    let visibleDays = 0;
    setAnimatedPlanDays(0);
    planDaysProgress.setValue(0);
    const dayTickMs = Math.max(16, Math.floor(PLAN_DAYS_COUNT_DURATION_MS / total));
    const dayCounter = setInterval(() => {
      visibleDays += 1;
      setAnimatedPlanDays(visibleDays);
      if (visibleDays >= total) clearInterval(dayCounter);
    }, dayTickMs);
    Animated.timing(planDaysProgress, {
      toValue: 1,
      duration: PLAN_DAYS_COUNT_DURATION_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setAnimatedPlanDays(total);
    });
    return () => {
      clearInterval(dayCounter);
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

  const AUTO_NAME_WORDS = [
    // Языковая / литературная тема
    'Syntax', 'Lexis', 'Prose', 'Verse', 'Quill', 'Glyph', 'Script', 'Riddle',
    'Fable', 'Rhyme', 'Serif', 'Sonnet', 'Clause', 'Motif', 'Trope', 'Parable',
    'Thesis', 'Corpus', 'Lore', 'Rune', 'Lyric', 'Gloss', 'Tome', 'Epics',
    // Греческий алфавит
    'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Theta', 'Iota',
    'Kappa', 'Lambda', 'Sigma', 'Omega', 'Phi', 'Psi', 'Tau', 'Rho',
    // "Умные" короткие слова
    'Axiom', 'Cipher', 'Sage', 'Totem', 'Omen', 'Nexus', 'Prism', 'Vector',
    'Quantum', 'Ethos', 'Logos', 'Kairos', 'Telos', 'Aporia', 'Datum',
  ];

  const generateAutoName = (): string => {
    const word = AUTO_NAME_WORDS[Math.floor(Math.random() * AUTO_NAME_WORDS.length)];
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `${word}${suffix}`;
  };

  const handleNameDone = async () => {
    if (nameBusy) return;
    setNameFieldError(null);
    const trimmed = name.trim();
    if (!trimmed) {
      setNameFieldError(pick('Введите имя чтобы продолжить', 'Введіть ім\'я щоб продовжити', 'Escribe tu nombre para continuar'));
      return;
    }
    if (trimmed.length < 2) {
      setNameFieldError(pick('Минимум 2 символа', 'Мінімум 2 символи', 'Mínimo 2 caracteres'));
      return;
    }
    if (trimmed.length > 20) {
      setNameFieldError(pick('Максимум 20 символов', 'Максимум 20 символів', 'Máximo 20 caracteres'));
      return;
    }
    const prof = validateProfileName(trimmed);
    if (prof === 'profanity') {
      setNameFieldError(pick(
        'Это имя не подходит — выберите другое.',
        'Це ім\'я не підходить — оберіть інше.',
        'Este nombre no es adecuado; prueba con otro.',
      ));
      return;
    }

    setNameBusy(true);
    const result = 'ok' as Awaited<ReturnType<typeof reserveName>>;
    setName(trimmed);
    nameForProfileRef.current = trimmed;
    if (result === 'taken') {
      setNameBusy(false);
      setNameFieldError(pick(
        'Это имя уже занято — придумай другой ник.',
        'Це ім\'я вже зайняте — вигадай інший нік.',
        'Este nombre ya está en uso; prueba con otro.',
      ));
      return;
    }
    if (result === 'error') {
      setNameBusy(false);
      setNameFieldError(pick(
        'Не удалось проверить имя. Проверь интернет и попробуй ещё раз.',
        'Не вдалося перевірити ім\'я. Перевір мережу й спробуй ще раз.',
        'No se pudo comprobar el nombre. Revisa la conexión e inténtalo de nuevo.',
      ));
      return;
    }

    try {
      Keyboard.dismiss();
      await AsyncStorage.multiSet([
        ['app_lang', lang],
        ['user_name', trimmed],
      ]);
      void reserveName(trimmed, '').catch(() => {});
      void import('../app/firestore_leagues')
        .then((m) => m.registerInLeagueGroupSilently())
        .catch(() => {});
      if (nicknameMode === 'personal_plan') {
        await AsyncStorage.removeItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY);
        await handleFinishOnboarding();
        return;
      }
      goToStep('streak');
    } finally {
      setNameBusy(false);
    }
  };

  const handleSkipName = async () => {
    if (nameBusy) return;
    setNameFieldError(null);
    setNameBusy(true);
    try {
      let autoName = generateAutoName();
      setName(autoName);
      nameForProfileRef.current = autoName;
      Keyboard.dismiss();
      goToStep('streak');
      // retry до 5 раз чтобы найти свободный ник
      for (let i = 0; i < 5; i++) {
        const result = await reserveName(autoName, '');
        if (result !== 'taken') break;
        autoName = generateAutoName();
      }
      setName(autoName);
      nameForProfileRef.current = autoName;
      await AsyncStorage.multiSet([
        ['app_lang', lang],
        ['user_name', autoName],
      ]);
      await import('../app/firestore_leagues')
        .then((m) => m.registerInLeagueGroupSilently())
        .catch(() => {});
    } finally {
      setNameBusy(false);
    }
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
  const handleFinishOnboarding = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    await saveUserProfile();
    await AsyncStorage.setItem('onboarding_done', '1');
    await AsyncStorage.removeItem('onboarding_step');
    // Включаем напоминание по умолчанию в 20:00 — пользователь может сменить в настройках.
    // requestPermission: false — НЕ дёргаем системный диалог push на онбординге.
    // Нативный запрос разрешения идёт строго через NotificationPermissionModal в _layout.tsx
    // по разработанным условиям (missedDays > 0, антиспам 1 раз в день и т.п.).
    scheduleDailyReminder(20, 0, lang, { requestPermission: false }).catch(() => {});
    onDone();
  };

  const handleCloseOnboarding = async () => {
    if (finishingRef.current || closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    try {
      let finalName = nameForProfileRef.current.trim();
      const generatedName = !finalName;
      if (generatedName) {
        finalName = generateAutoName();
        setName(finalName);
      }
      nameForProfileRef.current = finalName;
      await AsyncStorage.multiSet([
        ['app_lang', lang],
        ['user_name', finalName],
      ]);
      if (generatedName) {
        void reserveName(finalName, '').catch(() => {});
        void import('../app/firestore_leagues')
          .then((m) => m.registerInLeagueGroupSilently())
          .catch(() => {});
      }
      await handleFinishOnboarding();
    } finally {
      closingRef.current = false;
    }
  };

  const handleStartPersonalPlanFromOnboarding = async () => {
    if (finishingRef.current || closingRef.current) return;
    finishingRef.current = true;
    Keyboard.dismiss();
    try {
      await AsyncStorage.multiSet([
        ['app_lang', lang],
        [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
        ['onboarding_step', 'name'],
      ]);
      await queuePendingPersonalPlanActivation({
        planId: selectedPlanId,
        minutesPerDay: selectedPlanMinutes,
        source: 'onboarding',
      });
      if (hasPremiumAccess) {
        await activatePendingPersonalPlanAfterPremium();
        setNicknameMode('personal_plan');
        finishingRef.current = false;
        goToStep('name');
        return;
      }
      await onPersonalPlanPaywallStart?.();
    } catch {
      finishingRef.current = false;
      AppInfoDialog.alert(
        pick('Не удалось открыть план', 'Не вдалося відкрити план', 'No se pudo abrir el plan'),
        pick(
          'Проверь интернет и попробуй ещё раз.',
          'Перевір інтернет і спробуй ще раз.',
          'Revisa Internet e inténtalo otra vez.',
        ),
      );
    }
  };

  const renderScreen = (
    testID: string | undefined,
    source: ImageSourcePropType,
    children: React.ReactNode,
    contentStyle?: StyleProp<ViewStyle>,
    hideClose = false,
  ) => (
    <OnboardingScreenShell
      testID={testID}
      source={source}
      screenFade={screenFade}
      contentStyle={contentStyle}
      hideClose={hideClose}
      onClose={handleCloseOnboarding}
    >
      {children}
    </OnboardingScreenShell>
  );

  const renderPlanSegmentProgress = () => {
    const activeIndex = Math.max(0, PLAN_PROGRESS_STEPS.indexOf(step));
    return (
      <View style={styles.planFlowProgressSegments} pointerEvents="none">
        {PLAN_PROGRESS_STEPS.map((progressStep, index) => (
          <View
            key={progressStep}
            style={[
              styles.planFlowProgressSegment,
              index <= activeIndex && styles.planFlowProgressSegmentActive,
            ]}
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
            onPress={() => goToStep(PREV_STEP[step] ?? 'planEntry')}
            activeOpacity={0.82}
            style={styles.planFlowBack}
          >
            <Text style={styles.planFlowBackGlyph}>‹</Text>
          </TouchableOpacity>
          {renderPlanSegmentProgress()}
        </View>
        <ScrollView
          style={styles.onboardingScroll}
          contentContainerStyle={styles.planFlowScroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.planFlowQuestionBlock}>
            <Text style={styles.planFlowTitle}>{title}</Text>
            {lead ? <Text style={styles.planFlowLead}>{lead}</Text> : null}
          </View>
          {children}
        </ScrollView>
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
        onPress={() => goToStep(PREV_STEP[step] ?? 'planEntry')}
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
    const daysFillTranslateX = planDaysProgress.interpolate({
      inputRange: [0, 1],
      outputRange: [-(planDaysRailWidth || 1), 0],
    });
    return (
      <View style={styles.planMockupDaysCard}>
        <View style={styles.planMockupDaysTop}>
          <Text style={styles.planMockupDaysLabel}>Дней занятий</Text>
          <Text style={styles.planMockupDaysValue}>
            {visibleDays}
            {' '}
            <Text style={styles.planMockupDaysWord}>{dayWord(visibleDays || days)}</Text>
          </Text>
        </View>
        <View
          style={styles.planMockupDaysTrack}
          onLayout={(event) => setPlanDaysRailWidth(event.nativeEvent.layout.width)}
        >
          <AnimatedLinearGradient
            colors={['#FFD66B', '#FFF1B6', '#F2B84B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.planMockupDaysFill, { transform: [{ translateX: daysFillTranslateX }] }]}
          />
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
          <Text style={styles.planMockupRowTitle}>Рекомендуемый старт: {plan.recommendedLevel}</Text>
          <Text style={styles.planMockupRowSub}>{plan.levelSub}</Text>
        </View>
      </View>
      <View style={styles.planMockupRow}>
        <OnboardingBundledImage
          source={todayIconAsset}
          style={styles.planMockupRowIcon}
        />
        <View style={styles.planFlowOptionCopy}>
          <Text style={styles.planMockupRowTitle}>Уже к середине срока</Text>
          <Text style={styles.planMockupRowSub}>{plan.outcome}</Text>
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
      <ScrollView
        style={styles.onboardingScroll}
        contentContainerStyle={styles.planMockupResultScroll}
        showsVerticalScrollIndicator={false}
      >
        {renderMockupPlanTop(brand)}
        <View style={styles.planMockupResultBody}>
          <Text style={styles.planMockupResultTitle}>{plan.name}</Text>
          <View style={styles.planMockupPitchCard}>
            <Text style={styles.planMockupPitchText}>{plan.pitch}</Text>
          </View>
          {renderPlanDaysProgressBlock(plan.days)}
          <View style={styles.planMockupResultHero}>
            <Text style={styles.planMockupBigNum}>{plan.horizon}</Text>
            <Text style={styles.planMockupHeroSub}>ориентир до заметного прогресса при {minutes === 20 ? '20' : minutes} минутах в день</Text>
          </View>
          {renderPlanRows(plan, todayIconAsset)}
          <View style={styles.planMockupCtaStack}>{actions}</View>
        </View>
      </ScrollView>
    ),
    undefined,
    true,
  );

  // ── Шаг 0: Добро пожаловать в бета ─────────────────────────────────────────
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
                colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.075)', 'rgba(242,184,75,0.11)']}
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
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {triOb('Как хочешь начать?', 'Як хочеш почати?', '¿Cómo quieres empezar?')}
            </Text>
            <Text style={[styles.eliteWelcomeSub, styles.planEntrySub]}>
              {triOb(
                'Соберём короткий план под твою цель или сразу начнем знакомиться с приложением?',
                'Зберемо короткий план під твою ціль або одразу почнемо знайомитися з застосунком?',
                'Creamos un plan corto para tu objetivo o empezamos a conocer la app.',
              )}
            </Text>
            <View style={styles.planEntryCtas}>
            <TouchableOpacity
              testID="onboarding-create-personal-plan"
              style={[styles.eliteWelcomeCta, styles.planEntryCta]}
              onPress={() => goToStep('planGoal')}
              activeOpacity={0.88}
            >
              <Text style={[styles.eliteWelcomeCtaText, styles.planEntryCtaText]}>
                {triOb('Составить мой план', 'Скласти мій план', 'Crear mi plan')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              testID="onboarding-continue-independently"
              style={[styles.eliteWelcomeSecondaryCta, styles.planEntrySecondaryCta]}
              onPress={async () => {
                setNicknameMode('regular');
                await AsyncStorage.removeItem(PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY).catch(() => {});
                goToStep('name');
              }}
              activeOpacity={0.82}
            >
              <Text style={[styles.eliteWelcomeSecondaryCtaText, styles.planEntrySecondaryCtaText]}>
                {triOb('Продолжить самостоятельно', 'Продовжити самостійно', 'Continuar por mi cuenta')}
              </Text>
            </TouchableOpacity>
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
      'Зачем тебе английский?',
      'План подстроится под ситуации и фразы, которые пригодятся первыми.',
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
                goToStep('planLevel');
              }}
            >
              <PlanFlowIcon source={choice.iconAsset} />
              <View style={styles.planFlowOptionCopy}>
                <Text style={styles.planFlowOptionTitle}>{choice.title}</Text>
                <Text style={styles.planFlowOptionSub}>{choice.subtitle}</Text>
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
      'Какой старт ближе?',
      '',
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
                goToStep('planMinutes');
              }}
            >
              <PlanFlowIcon source={choice.iconAsset} />
              <View style={styles.planFlowOptionCopy}>
                <Text style={styles.planFlowOptionTitle}>{choice.title}</Text>
                <Text style={styles.planFlowOptionSub}>{choice.subtitle}</Text>
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
      'Сколько времени удобно?',
      'Выбери ритм, который реально получится держать каждый день.',
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
                scheduleDailyReminder(20, 0, lang, { requestPermission: true }).catch(() => {});
                goToStep('planPhrase');
              }}
            >
              <PlanFlowIcon source={ONBOARDING_PLAN_ICONS.time} />
              <View style={styles.planFlowOptionCopy}>
                <Text style={styles.planFlowOptionTitle}>{choice === 20 ? '20+ минут в день' : `${choice} минут в день`}</Text>
                <Text style={styles.planFlowOptionSub}>
                  {choice <= 5
                    ? 'Минимум, чтобы не выпадать'
                    : choice <= 10
                      ? 'Хороший лёгкий ритм'
                      : choice <= 15
                        ? 'Рекомендованный темп для прогресса'
                        : 'Быстрее идти по плану'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>,
    );
  }

  if (step === 'planPhrase') {
    const phraseAnswer = selectedPlanPhraseTokens.join(' ');
    const canContinuePlanPhrase = selectedPlanPhraseTokens.length > 0;
    const planPhraseHasError = phraseAnswer.length > 0 && phraseAnswer !== PLAN_PHRASE_TARGET.join(' ');
    return renderPlanFlowScreen(
      'onboarding-plan-phrase-screen',
      '',
      'Соберём первую фразу',
      '',
      <View style={styles.planPhraseCard}>
        <Text style={styles.planPhraseRu}>Мне нужно больше времени.</Text>
        <View style={[styles.planPhraseLine, planPhraseHasError && styles.planPhraseLineError]}>
          <Text style={[styles.planPhraseAnswer, !phraseAnswer && styles.planPhraseAnswerEmpty]}>
            {phraseAnswer || ' '}
          </Text>
        </View>
        <View style={styles.planPhraseTokens}>
          {PLAN_PHRASE_TOKENS.map((token) => {
            const selected = selectedPlanPhraseTokens.includes(token);
            return (
            <TouchableOpacity
              key={token}
              style={[styles.planPhraseToken, selected && styles.planPhraseTokenSelected]}
              activeOpacity={0.8}
              onPress={() => {
                setSelectedPlanPhraseTokens((current) => (
                  current.includes(token)
                    ? current.filter((item) => item !== token)
                    : [...current, token]
                ));
              }}
            >
              <Text style={styles.planPhraseTokenText}>{token}</Text>
            </TouchableOpacity>
            );
          })}
        </View>
        {canContinuePlanPhrase ? (
        <TouchableOpacity
          style={[
            styles.eliteWelcomeCta,
            styles.planMockupPrimaryButton,
          ]}
          activeOpacity={0.88}
          onPress={() => {
            setPlanPhraseWasCorrect(!planPhraseHasError);
            goToStep('planLoading');
          }}
        >
          <Text style={styles.planMockupPrimaryButtonText}>Продолжить</Text>
        </TouchableOpacity>
        ) : null}
      </View>,
    );
  }

  if (step === 'planLoading') {
    const meterTranslateX = planLoadingMeter.interpolate({
      inputRange: PLAN_LOADING_METER_KEYFRAMES.inputRange,
      outputRange: PLAN_LOADING_METER_KEYFRAMES.outputRange.map((value) => -((1 - value) * (planLoadingRailWidth || 1))),
    });
    return renderPlanFlowScreen(
      'onboarding-plan-loading-screen',
      '',
      'Собираем твой план',
      '',
      <View style={styles.planFlowStack}>
        <View
          style={styles.planProgressRail}
          onLayout={(event) => setPlanLoadingRailWidth(event.nativeEvent.layout.width)}
        >
          <AnimatedLinearGradient
            colors={['#F2B84B', '#63E6D2']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.planProgressFill, { transform: [{ translateX: meterTranslateX }] }]}
          />
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
            <Text style={styles.planFlowChecklistText}>{item.title}</Text>
          </Animated.View>
        ))}
        <Animated.View
          pointerEvents={planLoadingCtaReady ? 'auto' : 'none'}
          style={{ opacity: planLoadingButtonAnim }}
        >
          <TouchableOpacity style={[styles.eliteWelcomeCta, styles.planMockupPrimaryButton]} activeOpacity={0.88} onPress={() => goToStep('planResult')}>
            <Text style={styles.planMockupPrimaryButtonText}>План готов</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>,
    );
  }

  if (step === 'planResult') {
    return renderPlanResultLikeScreen({
      testID: 'onboarding-plan-result-screen',
      brand: 'Результат',
      plan: selectedPlan,
      minutes: selectedPlanMinutes,
      todayIconAsset: selectedPlan.todayIconAsset,
      actions: (
        <>
        <TouchableOpacity
          testID="data-plan-result-cta"
          style={[styles.eliteWelcomeCta, styles.planMockupPrimaryButton]}
          activeOpacity={0.88}
          onPress={() => goToStep('planPaywall')}
        >
          <Text style={styles.planMockupPrimaryButtonText}>Получить мой план</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.eliteWelcomeSecondaryCta, styles.planMockupSecondaryButton]} activeOpacity={0.82} onPress={() => goToStep('planPicker')}>
          <Text style={styles.planMockupSecondaryButtonText}>Посмотреть другие планы</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.freeBtn, styles.planMockupGhostButton]} activeOpacity={0.72} onPress={() => goToStep('welcome')}>
          <Text style={styles.freeBtnText}>Продолжить без плана</Text>
        </TouchableOpacity>
        </>
      ),
    });
  }

  if (step === 'planPaywall') {
    return renderScreen(
      'onboarding-plan-paywall-screen',
      ONBOARDING_BG_WELCOME,
      (
        <>
          <ScrollView
            style={styles.onboardingScroll}
            contentContainerStyle={styles.planPaywallScroll}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            <View style={styles.planPaywallTop}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Назад"
                style={styles.planFlowBack}
                onPress={() => goToStep('planResult')}
                activeOpacity={0.76}
              >
                <Text style={styles.planFlowBackGlyph}>‹</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.planPaywallTitle}>Получить {selectedPlan.name}</Text>
            <Text style={styles.planPaywallLead}>Открой личный маршрут под цель: {selectedPlan.goal}.</Text>

            <View style={styles.planPaywallPanel}>
              <View style={styles.planPaywallStartRow}>
                <PlanFlowIcon source={selectedPlan.iconAsset} small />
                <View style={styles.planFlowOptionCopy}>
                  <Text style={styles.planFlowOptionTitle}>Старт с {selectedPlan.recommendedLevel} открыт</Text>
                  <Text style={styles.planFlowOptionSub}>Сразу переходишь к подходящим урокам</Text>
                </View>
              </View>

              <View style={styles.planPaywallBenefitGrid}>
                {PLAN_PAYWALL_BENEFITS.map((benefit) => (
                  <View
                    key={benefit.key}
                    style={[styles.planPaywallBenefit, benefit.featured && styles.planPaywallBenefitFeatured]}
                  >
                    <OnboardingBundledImage
                      source={benefit.iconAsset}
                      style={styles.planPaywallBenefitIcon}
                    />
                    <View style={styles.planFlowOptionCopy}>
                      <Text style={styles.planPaywallBenefitTitle}>{benefit.title}</Text>
                      <Text style={styles.planPaywallBenefitSub}>{benefit.subtitle}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.planPaywallOptions}>
              <TouchableOpacity
                style={[
                  styles.planPaywallBuyCard,
                  selectedPlanBilling === 'monthly' && styles.planPaywallBuyCardSelected,
                ]}
                activeOpacity={0.84}
                onPress={() => setSelectedPlanBilling('monthly')}
              >
                <Text style={styles.planPaywallBuyTitle}>Месячный план</Text>
                <Text style={styles.planPaywallBuyPrice}>$4.99 / месяц</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.planPaywallBuyCard,
                  selectedPlanBilling === 'annual' && styles.planPaywallBuyCardSelected,
                ]}
                activeOpacity={0.84}
                onPress={() => setSelectedPlanBilling('annual')}
              >
                <Text style={styles.planPaywallBuyTitle}>Годовой план</Text>
                <Text style={styles.planPaywallBuyPrice}>$39.99 / год</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              testID="data-plan-paywall-trial-cta"
              style={styles.eliteWelcomeCta}
              activeOpacity={0.88}
              onPress={handleStartPersonalPlanFromOnboarding}
            >
              <Text style={styles.eliteWelcomeCtaText}>Попробовать 3 дня бесплатно</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.eliteWelcomeSecondaryCta}
              activeOpacity={0.82}
              onPress={() => setShowPlanFreeConfirm(true)}
            >
              <Text style={styles.eliteWelcomeSecondaryCtaText}>Продолжить без плана</Text>
            </TouchableOpacity>
            <Text style={styles.legal}>
              Trial, цена после trial и период подписки берутся из App Store или Google Play. После trial подписка продлевается автоматически. Отменить можно в настройках подписок магазина не позднее чем за 24 часа до продления. Terms of Use и Privacy Policy доступны до покупки.
            </Text>
          </ScrollView>

          {showPlanFreeConfirm ? (
            <View style={styles.planFreeConfirmOverlay}>
              <View style={styles.planFreeConfirmBox}>
                <Text style={styles.planFreeConfirmTitle}>Продолжить без плана?</Text>
                <Text style={styles.planFreeConfirmText}>
                  План персонального сопровождения не доступен в бесплатной версии приложения. Ты всё ещё получишь много доступных функций, но персональная аналитика ошибок и прогресса доступна только в Premium.
                </Text>
                <View style={styles.planFreeConfirmActions}>
                  <TouchableOpacity style={styles.eliteWelcomeCta} activeOpacity={0.88} onPress={() => setShowPlanFreeConfirm(false)}>
                    <Text style={styles.eliteWelcomeCtaText}>Остаться с планом</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.eliteWelcomeSecondaryCta} activeOpacity={0.82} onPress={() => goToStep('welcome')}>
                    <Text style={styles.eliteWelcomeSecondaryCtaText}>Да, продолжить без плана</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : null}
        </>
      ),
      styles.eliteWelcomeRoot,
      true,
    );
  }

  if (step === 'planPicker') {
    return renderPlanFlowScreen(
      'onboarding-plan-picker-screen',
      'Планы',
      'Выбери план',
      'Можно оставить рекомендованный маршрут или посмотреть другой сценарий под ближайшую цель.',
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
                <Text style={styles.planMockupPickerTitle}>{plan.name}</Text>
                <Text style={styles.planMockupPickerSub}>{entry.short}</Text>
                <Text style={styles.planMockupPickerMeta}>{plan.horizon} · старт {plan.recommendedLevel}</Text>
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
        <TouchableOpacity
          style={[styles.eliteWelcomeCta, styles.planMockupPrimaryButton]}
          activeOpacity={0.88}
          onPress={() => goToStep('planResult')}
        >
          <Text style={styles.planMockupPrimaryButtonText}>Выбрать этот план</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.eliteWelcomeSecondaryCta, styles.planMockupSecondaryButton]}
          activeOpacity={0.82}
          onPress={() => goToStep('planPicker')}
        >
          <Text style={styles.planMockupSecondaryButtonText}>Другие планы</Text>
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
        <ScrollView
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

          <TouchableOpacity
            testID="onboarding-beta-continue"
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('demo2')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>{pick('Понятно 👍', 'Зрозуміло 👍', 'Entendido 👍')}</Text>
          </TouchableOpacity>
        </ScrollView>
      ),
    );
  }

  // ── Шаг 0: Welcome — главный оффер ─────────────────────────────────────────
  if (step === 'welcome') {
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
                  colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.075)', 'rgba(242,184,75,0.11)']}
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
              <TouchableOpacity
                testID="onboarding-welcome-continue"
                style={styles.eliteWelcomeCta}
                onPress={() => goToStep('name')}
                activeOpacity={0.88}
              >
                <Text style={styles.eliteWelcomeCtaText}>
                  {triOb('Начать', 'Почати', 'Empezar')}
                </Text>
              </TouchableOpacity>
              <Text style={styles.eliteWelcomeFootnote}>
                {triOb('Займет меньше минуты.', 'Займе менше хвилини.', 'Tarda menos de un minuto.')}
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
          <TouchableOpacity
            testID="onboarding-welcome-continue"
            style={[styles.continueBtn, { width: '100%' }]}
            onPress={() => goToStep('name')}
            activeOpacity={0.85}
          >
            <Text style={styles.continueBtnText}>
              {triOb('Попробовать →', 'Спробувати →', 'Probar ahora →')}
            </Text>
          </TouchableOpacity>
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
        <ScrollView
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
            <Text style={{ color: ONBOARDING_ACCENT, fontSize: 22, fontWeight: '700', lineHeight: 30 }}>
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
                  borderColor = ONBOARDING_ACCENT; bg = ONBOARDING_ACCENT_BG;
                  textColor = ONBOARDING_ACCENT; iconStroke = ONBOARDING_ACCENT;
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
                    setDemoCorrect(i === correctIndex);
                    animateBtn();
                  }}
                  activeOpacity={demoAnswered ? 1 : 0.8}
                >
                  <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: demoAnswered && i === correctIndex ? ONBOARDING_ACCENT_BG : demoAnswered && i === demoSelected ? 'rgba(255,69,58,0.15)' : DARK.bgSurface2, alignItems: 'center', justifyContent: 'center' }}>
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
        </ScrollView>
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
        <ScrollView
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
              <Text style={{ color: ONBOARDING_ACCENT, fontSize: 13, fontWeight: '600', textAlign: 'center' }}>
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
            <View style={{ minHeight: 56, backgroundColor: DARK.bgPrimary, borderRadius: 14, borderWidth: 1.5, borderColor: demo2Answered ? (demo2Correct ? ONBOARDING_ACCENT : '#FF4444') : 'rgba(255,91,91,0.28)', padding: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
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
                <Text style={{ color: demo2Correct ? ONBOARDING_ACCENT : '#FF8888', fontSize: 15, fontWeight: '600', textAlign: 'center', marginBottom: 16 }}>
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
        </ScrollView>
        </>
      ),
    );
  }

  // ── Шаг 3: Имя ──────────────────────────────────────────────────────────────
  if (step === 'name') {
    const keyboardVisible = keyboardPad > 0;
    const nameBranchSubtitle = nicknameMode === 'personal_plan'
      ? pick(
          'Личный план подключён. Осталось подписать профиль.',
          'Особистий план підключено. Залишилось підписати профіль.',
          'Tu plan personal está listo. Solo falta nombrar el perfil.',
        )
      : ''; /*
          'Текущая ветка onboarding приложения без личного плана.',
          'Поточна гілка onboarding застосунку без особистого плану.',

*/
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
              onPress={() => goToStep(PREV_STEP[step] ?? 'planEntry')}
              activeOpacity={0.82}
              style={styles.regularNameBack}
            >
              <Text style={styles.planFlowBackGlyph}>‹</Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.onboardingScroll}
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
                colors={['rgba(255,255,255,0.24)', 'rgba(255,255,255,0.075)', 'rgba(242,184,75,0.11)']}
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
            {nameFieldError ? (
              <Text style={styles.regularNameError} maxFontSizeMultiplier={1.08}>
                {nameFieldError}
              </Text>
            ) : null}
            <View style={styles.regularNameInputFrame}>
              <TextInput
                testID="onboarding-name-input"
                style={styles.regularNameInput}
                value={name}
                onChangeText={(t) => {
                  setName(t);
                  if (nameFieldError) setNameFieldError(null);
                }}
                placeholder=""
                placeholderTextColor={ONBOARDING_GOLD_2}
                autoFocus={false}
                maxLength={20}
                editable={!nameBusy}
                returnKeyType="done"
                onSubmitEditing={handleNameDone}
                maxFontSizeMultiplier={1.08}
              />
            </View>
            <TouchableOpacity
              testID="onboarding-name-continue"
              style={[styles.eliteWelcomeCta, styles.regularNameCta, nameBusy && { opacity: 0.75 }]}
              onPress={handleNameDone}
              activeOpacity={0.88}
              disabled={nameBusy}
            >
              <Text style={styles.eliteWelcomeCtaText} maxFontSizeMultiplier={1.05}>
                {pick('Продолжить', 'Продовжити', 'Continuar')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
          <ScrollView
            style={styles.onboardingScroll}
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
              placeholder={pick('Ваше имя...', 'Ваше ім\'я...', 'Tu nombre...')}
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
            <TouchableOpacity
              testID="onboarding-name-skip"
              style={{ paddingVertical: compactOnboarding ? 8 : 12, paddingHorizontal: 10, alignItems: 'center', marginTop: compactOnboarding ? 4 : 8 }}
              onPress={handleSkipName}
              activeOpacity={0.8}
              disabled={nameBusy}
            >
              <Text
                maxFontSizeMultiplier={1.05}
                style={{ color: DARK.textGhost, fontSize: scaleOnboarding(14, 12), fontWeight: '600', textAlign: 'center' }}
              >
                {pick(
                  'Пропустить (имя можно сменить позже)',
                  'Пропустити (ім\'я можна змінити пізніше)',
                  'Omitir (podrás cambiar el nombre después)',
                )}
              </Text>
            </TouchableOpacity>
          </ScrollView>
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
        <ScrollView
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
            <OnboardingStreakIcon kind="flame" size={streakHeroIconSize} hero />
          </View>
          <Text
            style={[styles.title, onboardingTitleStyle, { marginBottom: compactOnboarding ? 6 : 8 }]}
            maxFontSizeMultiplier={1.08}
          >
            {pick(
              'Английский любит регулярность',
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
              'Лучше понемногу каждый день, чем редко и тяжело.',
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
                  <OnboardingStreakIcon kind={m.icon} size={streakMilestoneIconSize} />
                </View>
                <View style={styles.streakMilestoneTextWrap}>
                  <Text
                    style={[styles.streakMilestoneTitle, compactOnboarding && styles.streakMilestoneTextCompact]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    maxFontSizeMultiplier={1}
                  >
                    {m.label}
                  </Text>
                  <Text
                    style={[styles.streakMilestoneReward, compactOnboarding && styles.streakMilestoneTextCompact]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.78}
                    maxFontSizeMultiplier={1}
                  >
                    {m.reward}
                  </Text>
                </View>
              </View>
              </Animated.View>
            ))}
          </View>

          <TouchableOpacity
            testID="onboarding-streak-continue"
            style={[styles.continueBtn, onboardingPrimaryButtonStyle, { width: '100%' }]}
            onPress={() => goToStep('auth')}
            activeOpacity={0.85}
          >
            <Text style={[styles.continueBtnText, onboardingPrimaryButtonTextStyle]} maxFontSizeMultiplier={1.05}>
              {pick('Далее', 'Далі', 'Siguiente')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        </>
      ),
    );
  }

  // ── Шаг auth: Сохрани прогресс через Google / Apple (опционально) ────────────
  if (step === 'auth') {
    return renderScreen(
      'onboarding-auth-screen',
      ONBOARDING_BG_AUTH,
      (
        <AuthOnboardingStep
          isUK={isUK}
          lang={lang}
          renderProgressBar={renderProgressBar}
          onComplete={handleFinishOnboarding}
        />
      ),
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
}: {
  isUK: boolean;
  lang: Lang;
  renderProgressBar: () => React.ReactNode;
  onComplete: () => Promise<void> | void;
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
      const result = await signInWithProvider(provider);
      setLoadingProvider(null);
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
          authPick('Не удалось войти', 'Не вдалося увійти', 'No se pudo iniciar sesión'),
          body,
        );
        return;
      }
      // Помечаем что промпт показывали — чтобы lesson_complete не показал повторно.
      await AsyncStorage.setItem(AUTH_PROMPT_SHOWN_KEY, '1').catch(() => {});
      await onComplete();
    } catch {
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
        <ScrollView
          style={styles.onboardingScroll}
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
            {authPick('Быстрый старт', 'Швидкий старт', 'Inicio rápido')}
          </Text>
          <Text
            maxFontSizeMultiplier={1.08}
            style={{
              color: ONBOARDING_TEXT_MUTED,
              fontSize: scaleAuth(14, 12),
              textAlign: 'center',
              lineHeight: scaleAuth(22, 18),
              marginBottom: compactOnboarding ? 18 : 28,
              fontWeight: '700',
            }}
          >
            {authPick(
              'Вход можно пропустить. Но если сменить телефон или случайно удалить приложение, есть риск потерять прогресс.',
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
              'Мы не публикуем ваш email и не отправляем спам.',
              'Ми не публікуємо ваш email і не надсилаємо спам.',
              'No publicamos tu correo ni enviamos spam.',
            )}
          </Text>
        </ScrollView>
    </>
  );
}

function OnboardingScreenShell({
  testID,
  source,
  screenFade,
  contentStyle,
  hideClose = false,
  onClose,
  children,
}: {
  testID?: string;
  source: ImageSourcePropType;
  screenFade: Animated.Value;
  contentStyle?: StyleProp<ViewStyle>;
  hideClose?: boolean;
  onClose: () => void | Promise<void>;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const closeTop = Math.max(insets.top, Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0) + 8;
  return (
    <SafeAreaView edges={[]} style={styles.container} testID={testID}>
      <OnboardingArtBackground source={source} motion="zoomOut" />
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
}: {
  kind: StreakMilestoneIconKind;
  size?: number;
  hero?: boolean;
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

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#020304', overflow: 'hidden' },
  onboardingContentLayer: { flex: 1 },
  onboardingScroll: { flex: 1 },
  center:          { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  appName:         { color: ONBOARDING_ACCENT, fontSize: 15, fontWeight: '800', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 },
  title:           { color: '#FFF8E8', fontSize: 24, fontWeight: '800', textAlign: 'center', marginBottom: 40, lineHeight: 34 },
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
    backgroundColor: ONBOARDING_ACCENT,
    borderRadius: 999,
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  onboardingCloseButton: {
    position: 'absolute',
    right: 14,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 30,
    elevation: 30,
  },
  onboardingBg: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    backgroundColor: '#020304',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  onboardingBgImageStack: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.68,
  },
  onboardingBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  onboardingBgDim: {
    ...StyleSheet.absoluteFillObject,
  },
  onboardingParticleLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  onboardingParticle: {
    position: 'absolute',
    backgroundColor: 'rgba(242,184,75,0.92)',
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.72,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
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
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
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
    color: ONBOARDING_ACCENT,
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
    color: ONBOARDING_TEXT_MUTED,
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
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  streakHeroIconShadow: {
    shadowOpacity: 0.42,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
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
    color: ONBOARDING_GOLD_2,
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
    shadowColor: ONBOARDING_ACCENT,
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
    color: '#FFF7E5',
    fontSize: 29,
    lineHeight: 35,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 17,
  },
  regularNameSub: {
    width: '100%',
    maxWidth: 338,
    color: '#FFF0D7',
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
    marginBottom: 16,
  },
  regularNameInput: {
    width: '100%',
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(242,184,75,0.64)',
    borderStyle: 'dashed',
    backgroundColor: 'rgba(242,184,75,0.08)',
    color: ONBOARDING_GOLD_2,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '900',
    textAlign: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
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
    color: ONBOARDING_GOLD_2,
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
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
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
    shadowOpacity: 0.23,
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
    color: '#FFF7E8',
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
    color: ONBOARDING_GOLD_2,
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
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
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
    shadowColor: '#D6B85C',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
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
    color: '#FFF7E5',
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'left',
    marginBottom: 16,
  },
  eliteWelcomeSub: {
    width: '100%',
    color: ONBOARDING_TEXT_MUTED,
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
    backgroundColor: ONBOARDING_ACCENT,
    paddingVertical: 17,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.38)',
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.36,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  eliteWelcomeCtaText: {
    color: '#1D1202',
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
    color: ONBOARDING_TEXT_MUTED,
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
    color: '#FFF8E8',
    fontSize: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.22)',
    marginBottom: 24,
  },
  continueBtn: {
    width: '100%',
    backgroundColor: ONBOARDING_ACCENT,
    padding: 18,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.36)',
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  continueBtnText: { color: '#1D1202', fontSize: 18, fontWeight: '900' },
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
    color: ONBOARDING_GOLD_2,
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
    color: '#FFD264',
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
  },
  planFlowProgressSegmentActive: {
    backgroundColor: ONBOARDING_ACCENT,
  },
  planFlowQuestionBlock: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 28,
  },
  planFlowTitle: {
    color: '#FFF8E8',
    fontSize: 38,
    lineHeight: 45,
    fontWeight: '900',
    marginBottom: 16,
    textAlign: 'center',
  },
  planFlowLead: {
    color: ONBOARDING_TEXT_MUTED,
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
    color: '#FFF7E8',
    fontSize: 29,
    lineHeight: 33,
    fontWeight: '900',
    textAlign: 'center',
  },
  planMockupPitchCard: {
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'rgba(242,184,75,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(242,184,75,0.42)',
  },
  planMockupPitchText: {
    color: '#FFF7E8',
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
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.08,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 0 },
    elevation: 2,
  },
  planMockupDaysTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  planMockupDaysLabel: {
    color: ONBOARDING_TEXT_MUTED,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  planMockupDaysValue: {
    width: 108,
    textAlign: 'right',
    color: ONBOARDING_GOLD_2,
    fontSize: 24,
    lineHeight: 24,
    fontWeight: '900',
    textShadowColor: 'rgba(255,212,114,0.42)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  planMockupDaysWord: {
    color: '#FFE4A3',
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
    shadowColor: ONBOARDING_ACCENT,
    shadowOpacity: 0.52,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
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
    borderColor: 'rgba(242,184,75,0.72)',
    backgroundColor: 'rgba(242,184,75,0.18)',
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
    backgroundColor: 'rgba(242,184,75,0.14)',
    borderColor: 'rgba(242,184,75,0.42)',
  },
  planMockupPickerIcon: {
    width: 42,
    height: 42,
    flexShrink: 0,
  },
  planMockupPickerTitle: {
    color: '#FFF7E8',
    fontSize: 15,
    lineHeight: 17,
    fontWeight: '900',
  },
  planMockupPickerSub: {
    marginTop: 4,
    color: ONBOARDING_TEXT_MUTED,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '700',
  },
  planMockupPickerMeta: {
    marginTop: 5,
    color: ONBOARDING_GOLD_2,
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
    backgroundColor: ONBOARDING_ACCENT_BG,
    borderWidth: 1,
    borderColor: 'rgba(242,184,75,0.38)',
  },
  planFlowLevelBadge: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ONBOARDING_ACCENT_BG,
    borderWidth: 1,
    borderColor: 'rgba(242,184,75,0.38)',
  },
  planFlowLevelBadgeText: {
    color: ONBOARDING_ACCENT,
    fontSize: 16,
    fontWeight: '900',
  },
  planFlowOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  planFlowOptionTitle: {
    color: '#FFF8E8',
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '900',
    marginBottom: 4,
  },
  planFlowOptionSub: {
    color: ONBOARDING_TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
  },
  planFlowCheckmark: {
    width: 22,
    color: ONBOARDING_ACCENT,
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
    color: '#FFF7E8',
    fontSize: 14,
    lineHeight: 17,
    fontWeight: '900',
  },
  planMockupRowSub: {
    marginTop: 3,
    color: ONBOARDING_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 15,
    fontWeight: '700',
  },
  planMockupResultHero: {
    width: '100%',
    borderRadius: 8,
    padding: 16,
    backgroundColor: 'rgba(242,184,75,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(242,184,75,0.42)',
  },
  planMockupBigNum: {
    color: ONBOARDING_GOLD_2,
    fontSize: 36,
    lineHeight: 38,
    fontWeight: '900',
  },
  planMockupHeroSub: {
    marginTop: 4,
    color: ONBOARDING_TEXT_MUTED,
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
    backgroundColor: ONBOARDING_ACCENT,
  },
  planMockupPrimaryButtonText: {
    color: '#12100A',
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
    color: '#FFF7E8',
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
    color: ONBOARDING_ACCENT,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  planPaywallTitle: {
    color: '#FFF8E8',
    fontSize: 28,
    lineHeight: 31,
    fontWeight: '900',
    textAlign: 'center',
  },
  planPaywallLead: {
    color: ONBOARDING_TEXT_MUTED,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  planPaywallPanel: {
    width: '100%',
    gap: 5,
    padding: 8,
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
    paddingHorizontal: 8,
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
    color: '#FFF8E8',
    fontSize: 13,
    lineHeight: 15,
    fontWeight: '900',
  },
  planPaywallBenefitSub: {
    color: ONBOARDING_TEXT_MUTED,
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
    backgroundColor: 'rgba(242,184,75,0.18)',
    borderColor: 'rgba(242,184,75,0.72)',
  },
  planPaywallBuyTitle: {
    color: '#FFF8E8',
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '900',
  },
  planPaywallBuyPrice: {
    color: '#FFD66B',
    fontSize: 22,
    lineHeight: 24,
    fontWeight: '900',
    marginTop: 6,
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
    shadowColor: '#000',
    shadowOpacity: 0.55,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 18 },
    elevation: 18,
  },
  planFreeConfirmTitle: {
    color: '#FFF8E8',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 9,
  },
  planFreeConfirmText: {
    color: ONBOARDING_TEXT_MUTED,
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
  planPhraseCard: {
    width: '100%',
    gap: 18,
  },
  planPhraseRu: {
    color: '#FFF8E8',
    fontSize: 28,
    lineHeight: 36,
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 18,
  },
  planPhraseLine: {
    minHeight: 64,
    borderBottomWidth: 1,
    borderColor: 'rgba(255,244,205,0.24)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planPhraseLineError: {
    borderColor: '#FF5A5F',
  },
  planPhraseAnswer: {
    color: ONBOARDING_ACCENT,
    fontSize: 24,
    fontWeight: '900',
  },
  planPhraseAnswerEmpty: {
    opacity: 0,
  },
  planPhraseTokens: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  planPhraseToken: {
    flexGrow: 1,
    minWidth: '45%',
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,244,205,0.16)',
  },
  planPhraseTokenSelected: {
    opacity: 0.42,
    borderColor: 'rgba(242,184,75,0.36)',
  },
  planPhraseTokenText: {
    color: '#FFF8E8',
    fontSize: 18,
    fontWeight: '900',
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
    color: '#FFF8E8',
    fontSize: 16,
    fontWeight: '800',
  },
  planResultHero: {
    width: '100%',
    padding: 18,
    borderRadius: 8,
    backgroundColor: ONBOARDING_ACCENT_BG,
    borderWidth: 1,
    borderColor: 'rgba(242,184,75,0.34)',
  },
  planResultNumber: {
    color: '#FFF8E8',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '900',
    marginBottom: 6,
  },
  planResultSub: {
    color: ONBOARDING_TEXT_MUTED,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '800',
  },
});

function OnboardingArtBackground({
  source,
  motion = 'zoomOut',
}: {
  source: ImageSourcePropType;
  motion?: 'zoomIn' | 'zoomOut';
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef(ONBOARDING_BACKGROUND_PARTICLES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: 15000,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true,
    });
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

  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: motion === 'zoomIn' ? [1.0, 1.085] : [1.085, 1.0],
  });
  return (
    <>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <View pointerEvents="none" style={styles.onboardingBg}>
        <View pointerEvents="none" style={styles.onboardingBgImageStack}>
          <Animated.Image
            source={source}
            style={[styles.onboardingBgImage, { transform: [{ scale }] }]}
            resizeMode="cover"
            resizeMethod="resize"
          />
        </View>
        <LinearGradient
          colors={[
            'rgba(1,2,3,0.58)',
            'rgba(2,3,5,0.68)',
            'rgba(3,4,6,0.76)',
            'rgba(2,2,3,0.90)',
            'rgba(0,0,0,0.99)',
          ]}
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

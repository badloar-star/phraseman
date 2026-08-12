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
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
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

import { noAndroidOutline } from '../constants/androidGlow';
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
  goalSeries: require('../assets/images/flow_clean_202607/goal_series.webp'),
  goalEveryday: require('../assets/images/flow_clean_202607/goal_everyday.webp'),
  goalTravel: require('../assets/images/flow_clean_202607/goal_travel.webp'),
  goalWords: require('../assets/images/flow_clean_202607/goal_words.webp'),
  goalMind: require('../assets/images/flow_clean_202607/goal_mind.webp'),
  minutes5: require('../assets/images/flow_clean_202607/minutes_5.webp'),
  minutes10: require('../assets/images/flow_clean_202607/minutes_10.webp'),
  minutes15: require('../assets/images/flow_clean_202607/minutes_15.webp'),
  minutes20: require('../assets/images/flow_clean_202607/minutes_20.webp'),
  introCompass: require('../assets/images/flow_clean_202607/intro_compass.webp'),
  notifications: require('../assets/images/flow_clean_202607/notifications.webp'),
  planResult: require('../assets/images/flow_clean_202607/plan_result.webp'),
  startPlus: require('../assets/images/flow_clean_202607/start_plus.webp'),
  startFree: require('../assets/images/flow_clean_202607/start_free.webp'),
  benefitPlan: require('../assets/images/flow_clean_202607/benefit_plan.webp'),
  benefitSpeech: require('../assets/images/flow_clean_202607/benefit_speech.webp'),
  benefitRepeat: require('../assets/images/flow_clean_202607/benefit_repeat.webp'),
  benefitFlow: require('../assets/images/flow_clean_202607/benefit_flow.webp'),
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
  title: OnboardingCopy;
  icon: IoniconName;
  asset?: ImageSourcePropType;
};

type LocalizedOption<T extends string | number> = Omit<Option<T>, 'title'> & { title: string };

const DISCOVERY_OPTIONS: Option<DiscoverySource>[] = [
  { id: 'tiktok', title: { ru: 'TikTok', uk: 'TikTok', es: 'TikTok', 'pt-BR': 'TikTok', vi: 'TikTok', id: 'TikTok', tr: 'TikTok', pl: 'TikTok' }, icon: 'musical-notes-outline', asset: ONBOARDING_ASSETS.sourceTiktok },
  { id: 'store', title: { ru: 'App Store / Google Play', uk: 'App Store / Google Play', es: 'App Store / Google Play', 'pt-BR': 'App Store / Google Play', vi: 'App Store / Google Play', id: 'App Store / Google Play', tr: 'App Store / Google Play', pl: 'App Store / Google Play' }, icon: 'storefront-outline', asset: ONBOARDING_ASSETS.sourceStore },
  { id: 'social', title: { ru: 'Instagram / Facebook', uk: 'Instagram / Facebook', es: 'Instagram / Facebook', 'pt-BR': 'Instagram / Facebook', vi: 'Instagram / Facebook', id: 'Instagram / Facebook', tr: 'Instagram / Facebook', pl: 'Instagram / Facebook' }, icon: 'camera-outline', asset: ONBOARDING_ASSETS.sourceSocial },
  { id: 'youtube', title: { ru: 'YouTube', uk: 'YouTube', es: 'YouTube', 'pt-BR': 'YouTube', vi: 'YouTube', id: 'YouTube', tr: 'YouTube', pl: 'YouTube' }, icon: 'logo-youtube', asset: ONBOARDING_ASSETS.sourceYoutube },
  { id: 'google', title: { ru: 'Поиск Google', uk: 'Пошук Google', es: 'Búsqueda de Google', 'pt-BR': 'Busca Google', vi: 'Tìm kiếm Google', id: 'Pencarian Google', tr: 'Google Arama', pl: 'Wyszukiwarka Google' }, icon: 'search-outline', asset: ONBOARDING_ASSETS.sourceGoogle },
  { id: 'friends', title: { ru: 'Друзья', uk: 'Друзі', es: 'Amigos', 'pt-BR': 'Amigos', vi: 'Bạn bè', id: 'Teman', tr: 'Arkadaşlar', pl: 'Znajomi' }, icon: 'people-outline', asset: ONBOARDING_ASSETS.sourceFriends },
  { id: 'other', title: { ru: 'Другое', uk: 'Інше', es: 'Otro', 'pt-BR': 'Outro', vi: 'Khác', id: 'Lainnya', tr: 'Diğer', pl: 'Inne' }, icon: 'ellipsis-horizontal-circle-outline', asset: ONBOARDING_ASSETS.sourceOther },
];

const LANGUAGE_OPTIONS: Array<Option<StudyTarget> & { code: string; native: OnboardingCopy }> = [
  { id: 'en', code: 'EN', native: { ru: 'Английский', uk: 'Англійська', es: 'Inglés', 'pt-BR': 'Inglês', vi: 'Tiếng Anh', id: 'Bahasa Inggris', tr: 'İngilizce', pl: 'Angielski' }, title: { ru: 'Английский', uk: 'Англійська', es: 'Inglés', 'pt-BR': 'Inglês', vi: 'Tiếng Anh', id: 'Bahasa Inggris', tr: 'İngilizce', pl: 'Angielski' }, icon: 'chatbubbles-outline', asset: ONBOARDING_ASSETS.languageEn },
  { id: 'fr', code: 'FR', native: { ru: 'Французский', uk: 'Французька', es: 'Francés', 'pt-BR': 'Francês', vi: 'Tiếng Pháp', id: 'Bahasa Prancis', tr: 'Fransızca', pl: 'Francuski' }, title: { ru: 'Французский', uk: 'Французька', es: 'Francés', 'pt-BR': 'Francês', vi: 'Tiếng Pháp', id: 'Bahasa Prancis', tr: 'Fransızca', pl: 'Francuski' }, icon: 'cafe-outline', asset: ONBOARDING_ASSETS.languageFr },
];

const LEVEL_OPTIONS: Option<LevelChoice>[] = [
  { id: 'a0', title: { ru: 'Я начинаю с нуля', uk: 'Я починаю з нуля', es: 'Empiezo desde cero', 'pt-BR': 'Estou começando do zero', vi: 'Tôi bắt đầu từ số 0', id: 'Saya mulai dari nol', tr: 'Sıfırdan başlıyorum', pl: 'Zaczynam od zera' }, icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelA0 },
  { id: 'a1', title: { ru: 'Знаю отдельные слова', uk: 'Знаю окремі слова', es: 'Conozco palabras sueltas', 'pt-BR': 'Conheço palavras isoladas', vi: 'Tôi biết một số từ riêng lẻ', id: 'Saya tahu beberapa kata', tr: 'Tek tek kelimeler biliyorum', pl: 'Znam pojedyncze słowa' }, icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelA1 },
  { id: 'a2', title: { ru: 'Могу поддержать простой разговор', uk: 'Можу підтримати просту розмову', es: 'Puedo mantener una conversación sencilla', 'pt-BR': 'Consigo manter uma conversa simples', vi: 'Tôi có thể duy trì cuộc trò chuyện đơn giản', id: 'Saya bisa melakukan percakapan sederhana', tr: 'Basit bir sohbeti sürdürebilirim', pl: 'Potrafię prowadzić prostą rozmowę' }, icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelA2 },
  { id: 'b1', title: { ru: 'Говорю на знакомые темы', uk: 'Говорю на знайомі теми', es: 'Hablo de temas conocidos', 'pt-BR': 'Falo sobre temas conhecidos', vi: 'Tôi nói được về chủ đề quen thuộc', id: 'Saya berbicara tentang topik yang dikenal', tr: 'Tanıdık konular hakkında konuşuyorum', pl: 'Rozmawiam na znane tematy' }, icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelB1 },
  { id: 'b2', title: { ru: 'Обсуждаю почти всё', uk: 'Обговорюю майже все', es: 'Puedo hablar de casi todo', 'pt-BR': 'Consigo falar sobre quase tudo', vi: 'Tôi có thể nói về hầu hết mọi thứ', id: 'Saya bisa membahas hampir semua hal', tr: 'Neredeyse her şeyi konuşabilirim', pl: 'Potrafię rozmawiać niemal o wszystkim' }, icon: 'bar-chart-outline', asset: ONBOARDING_ASSETS.levelB2 },
];

const GOAL_OPTIONS: Option<PersonalPlanSetupGoal>[] = [
  { id: 'series', title: { ru: 'Понимать кино и сериалы', uk: 'Розуміти кіно й серіали', es: 'Entender películas y series', 'pt-BR': 'Entender filmes e séries', vi: 'Hiểu phim và chương trình dài tập', id: 'Memahami film dan serial', tr: 'Film ve dizileri anlamak', pl: 'Rozumieć filmy i seriale' }, icon: 'volume-high-outline', asset: ONBOARDING_ASSETS.goalSeries },
  { id: 'everyday', title: { ru: 'Говорить в обычной жизни', uk: 'Говорити у звичайному житті', es: 'Hablar en la vida diaria', 'pt-BR': 'Falar no dia a dia', vi: 'Giao tiếp trong đời sống hằng ngày', id: 'Berbicara dalam kehidupan sehari-hari', tr: 'Günlük hayatta konuşmak', pl: 'Mówić w codziennym życiu' }, icon: 'chatbubble-ellipses-outline', asset: ONBOARDING_ASSETS.goalEveryday },
  { id: 'travel', title: { ru: 'Путешествовать', uk: 'Подорожувати', es: 'Viajar', 'pt-BR': 'Viajar', vi: 'Du lịch', id: 'Bepergian', tr: 'Seyahat etmek', pl: 'Podróżować' }, icon: 'airplane-outline', asset: ONBOARDING_ASSETS.goalTravel },
  { id: 'words', title: { ru: 'Нужные фразы каждый день', uk: 'Потрібні фрази щодня', es: 'Frases útiles cada día', 'pt-BR': 'Frases úteis todos os dias', vi: 'Cụm từ cần thiết mỗi ngày', id: 'Frasa penting setiap hari', tr: 'Her gün gerekli ifadeler', pl: 'Przydatne zwroty każdego dnia' }, icon: 'cube-outline', asset: ONBOARDING_ASSETS.goalWords },
  { id: 'mind', title: { ru: 'Учиться для себя', uk: 'Вчитися для себе', es: 'Aprender por gusto', 'pt-BR': 'Aprender por prazer', vi: 'Học vì bản thân', id: 'Belajar untuk diri sendiri', tr: 'Kendim için öğrenmek', pl: 'Uczyć się dla siebie' }, icon: 'school-outline', asset: ONBOARDING_ASSETS.goalMind },
];

const MINUTE_OPTIONS: Array<Option<PlanMinutesChoice> & { tone: OnboardingCopy }> = [
  { id: 5, title: { ru: '5 минут в день', uk: '5 хвилин на день', es: '5 minutos al día', 'pt-BR': '5 minutos por dia', vi: '5 phút mỗi ngày', id: '5 menit per hari', tr: 'Günde 5 dakika', pl: '5 minut dziennie' }, tone: { ru: 'без давления', uk: 'без тиску', es: 'sin presión', 'pt-BR': 'sem pressão', vi: 'không áp lực', id: 'tanpa tekanan', tr: 'baskısız', pl: 'bez presji' }, icon: 'leaf-outline', asset: ONBOARDING_ASSETS.minutes5 },
  { id: 10, title: { ru: '10 минут в день', uk: '10 хвилин на день', es: '10 minutos al día', 'pt-BR': '10 minutos por dia', vi: '10 phút mỗi ngày', id: '10 menit per hari', tr: 'Günde 10 dakika', pl: '10 minut dziennie' }, tone: { ru: 'лучший ритм', uk: 'найкращий ритм', es: 'el mejor ritmo', 'pt-BR': 'melhor ritmo', vi: 'nhịp độ lý tưởng', id: 'ritme terbaik', tr: 'en iyi tempo', pl: 'najlepsze tempo' }, icon: 'time-outline', asset: ONBOARDING_ASSETS.minutes10 },
  { id: 15, title: { ru: '15 минут в день', uk: '15 хвилин на день', es: '15 minutos al día', 'pt-BR': '15 minutos por dia', vi: '15 phút mỗi ngày', id: '15 menit per hari', tr: 'Günde 15 dakika', pl: '15 minut dziennie' }, tone: { ru: 'быстрее прогресс', uk: 'швидший прогрес', es: 'progreso más rápido', 'pt-BR': 'progresso mais rápido', vi: 'tiến bộ nhanh hơn', id: 'kemajuan lebih cepat', tr: 'daha hızlı ilerleme', pl: 'szybszy postęp' }, icon: 'flash-outline', asset: ONBOARDING_ASSETS.minutes15 },
  { id: 20, title: { ru: '20 минут в день', uk: '20 хвилин на день', es: '20 minutos al día', 'pt-BR': '20 minutos por dia', vi: '20 phút mỗi ngày', id: '20 menit per hari', tr: 'Günde 20 dakika', pl: '20 minut dziennie' }, tone: { ru: 'глубже практика', uk: 'глибша практика', es: 'práctica más profunda', 'pt-BR': 'prática mais profunda', vi: 'luyện tập sâu hơn', id: 'latihan lebih mendalam', tr: 'daha derin pratik', pl: 'głębsza praktyka' }, icon: 'rocket-outline', asset: ONBOARDING_ASSETS.minutes20 },
];
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
    title: { ru: 'Сказать нужную фразу вовремя', uk: 'Сказати потрібну фразу вчасно', es: 'Decir la frase adecuada a tiempo', 'pt-BR': 'Dizer a frase certa na hora certa', vi: 'Nói đúng câu vào đúng lúc', id: 'Mengucapkan frasa yang tepat pada waktunya', tr: 'Doğru ifadeyi zamanında söylemek', pl: 'Powiedzieć właściwą frazę we właściwym momencie' },
    body: { ru: 'Кафе, дорога, встреча или короткий ответ — слова придут сами.', uk: 'Кафе, дорога, зустріч чи коротка відповідь — слова приходитимуть самі.', es: 'En un café, de viaje, en una reunión o en una respuesta breve: las palabras saldrán solas.', 'pt-BR': 'No café, na viagem, numa reunião ou numa resposta curta: as palavras vão surgir naturalmente.', vi: 'Ở quán cà phê, trên đường, trong cuộc gặp hay khi trả lời ngắn — từ ngữ sẽ tự đến.', id: 'Di kafe, saat bepergian, dalam pertemuan, atau saat menjawab singkat — kata-kata akan muncul dengan sendirinya.', tr: 'Kafede, yolda, toplantıda ya da kısa bir yanıtta — kelimeler kendiliğinden gelecek.', pl: 'W kawiarni, w podróży, na spotkaniu czy w krótkiej odpowiedzi — słowa przyjdą same.' },
  },
  {
    title: { ru: 'Понять ответ без паники', uk: 'Зрозуміти відповідь без паніки', es: 'Entender una respuesta sin agobio', 'pt-BR': 'Entender uma resposta sem pânico', vi: 'Hiểu câu trả lời mà không hoảng hốt', id: 'Memahami jawaban tanpa panik', tr: 'Yanıtı paniklemeden anlamak', pl: 'Rozumieć odpowiedź bez paniki' },
    body: { ru: 'Сначала смысл, потом звук и повтор — речь перестанет быть шумом.', uk: 'Спершу зміст, потім звук і повторення — мовлення перестане бути шумом.', es: 'Primero el sentido, luego el sonido y la repetición: el habla dejará de ser ruido.', 'pt-BR': 'Primeiro o sentido, depois o som e a repetição: a fala deixará de ser apenas ruído.', vi: 'Trước hết là ý nghĩa, rồi âm thanh và lặp lại — lời nói sẽ không còn là tiếng ồn.', id: 'Makna dulu, lalu suara dan pengulangan — ucapan tidak lagi terdengar seperti kebisingan.', tr: 'Önce anlam, sonra ses ve tekrar: konuşma artık gürültü gibi gelmeyecek.', pl: 'Najpierw sens, potem dźwięk i powtórka — mowa przestanie być szumem.' },
  },
  {
    title: { ru: 'Возвращаться каждый день без борьбы', uk: 'Повертатися щодня без боротьби', es: 'Volver cada día sin esforzarte de más', 'pt-BR': 'Voltar todos os dias sem esforço', vi: 'Quay lại mỗi ngày một cách nhẹ nhàng', id: 'Kembali setiap hari tanpa terasa berat', tr: 'Her gün zorlanmadan geri dönmek', pl: 'Wracać każdego dnia bez walki' },
    body: { ru: 'Короткая сессия, которую реально держать неделя за неделей.', uk: 'Коротке заняття, якого реально дотримуватися тиждень за тижнем.', es: 'Una sesión corta que de verdad puedes mantener semana tras semana.', 'pt-BR': 'Uma sessão curta que você consegue manter semana após semana.', vi: 'Một phiên học ngắn mà bạn thực sự có thể duy trì hết tuần này qua tuần khác.', id: 'Sesi singkat yang benar-benar bisa kamu pertahankan minggu demi minggu.', tr: 'Haftalar boyunca gerçekten sürdürebileceğiniz kısa bir oturum.', pl: 'Krótka sesja, której naprawdę możesz trzymać się tydzień po tygodniu.' },
  },
] as const;

// Экран сравнения Free vs Plus (planComparison). Реальные киллер-фичи Plus из боевой
// копирайт-выкладки пейвола (paywall_copy.ts → CONTEXT_BENEFITS). У Free — прочерк
// (эти фичи только в Plus), у Plus — галочка, появляется каскадом сверху вниз.
// Слово «ИИ» в приложении не используем — «разговорная практика» вместо «диалоги с ИИ».
const PLAN_COMPARISON_BENEFITS: { icon: IoniconName; title: OnboardingCopy }[] = [
  { icon: 'flash-outline', title: { ru: 'Безлимит энергии', uk: 'Безліміт енергії', es: 'Energía ilimitada', 'pt-BR': 'Energia ilimitada', vi: 'Năng lượng không giới hạn', id: 'Energi tanpa batas', tr: 'Sınırsız enerji', pl: 'Nielimitowana energia' } },
  { icon: 'mic-outline', title: { ru: 'Практика произношения', uk: 'Практика вимови', es: 'Práctica de pronunciación', 'pt-BR': 'Prática de pronúncia', vi: 'Luyện phát âm', id: 'Latihan pengucapan', tr: 'Telaffuz pratiği', pl: 'Ćwiczenie wymowy' } },
  { icon: 'chatbubbles-outline', title: { ru: 'Разговорная практика', uk: 'Розмовна практика', es: 'Práctica de conversación', 'pt-BR': 'Prática de conversação', vi: 'Luyện hội thoại', id: 'Latihan percakapan', tr: 'Konuşma pratiği', pl: 'Ćwiczenie rozmowy' } },
  { icon: 'bulb-outline', title: { ru: 'Разбор ошибок', uk: 'Розбір помилок', es: 'Análisis de errores', 'pt-BR': 'Análise de erros', vi: 'Phân tích lỗi', id: 'Analisis kesalahan', tr: 'Hata analizi', pl: 'Analiza błędów' } },
  { icon: 'map-outline', title: { ru: 'Персональный план', uk: 'Персональний план', es: 'Plan personal', 'pt-BR': 'Plano pessoal', vi: 'Kế hoạch cá nhân', id: 'Rencana pribadi', tr: 'Kişisel plan', pl: 'Plan osobisty' } },
  { icon: 'locate-outline', title: { ru: 'Тренер слабых мест', uk: 'Тренер слабких місць', es: 'Entrenador de puntos débiles', 'pt-BR': 'Treinador de pontos fracos', vi: 'Huấn luyện điểm yếu', id: 'Pelatih kelemahan', tr: 'Zayıf yön koçu', pl: 'Trener słabych stron' } },
  { icon: 'stats-chart-outline', title: { ru: 'Аналитика 365 дней', uk: 'Аналітика за 365 днів', es: 'Estadísticas de 365 días', 'pt-BR': 'Análise de 365 dias', vi: 'Phân tích 365 ngày', id: 'Analitik 365 hari', tr: '365 gün analizi', pl: 'Analityka z 365 dni' } },
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

function ProgressHeader({ step, onBack, light = false }: { step: CleanOnboardingStep; onBack?: () => void; light?: boolean }) {
  const enabledOrder = React.useContext(OnboardingOrderContext);
  const lang = React.useContext(OnboardingLocaleContext);
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
        accessibilityLabel={onboardingCopy(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
      >
        <Ionicons name="chevron-back" size={30} color={light ? '#1F2A44' : '#DCE4FF'} />
      </Pressable>
      <View
        style={[styles.progressTrack, light && styles.progressTrackLight]}
        accessibilityLabel={onboardingCopy(lang, { ru: `Шаг ${progress} из ${total}`, uk: `Крок ${progress} з ${total}`, es: `Paso ${progress} de ${total}`, 'pt-BR': `Etapa ${progress} de ${total}`, vi: `Bước ${progress} trên ${total}`, id: `Langkah ${progress} dari ${total}`, tr: `${total} adımın ${progress}. adımı`, pl: `Krok ${progress} z ${total}` })}
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
  option: LocalizedOption<T>;
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
  option: Omit<(typeof LANGUAGE_OPTIONS)[number], 'title' | 'native'> & { title: string; native: string };
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
const OnboardingLocaleContext = React.createContext<Lang>('ru');

type OnboardingCopy = Record<Lang, string>;

function onboardingCopy(lang: Lang, copy: OnboardingCopy): string {
  return triLang(lang, copy);
}

function ageAnswerCopy(lang: Lang, age: number, isAdult: boolean): string {
  if (isAdult) {
    return triLang(lang, {
      ru: `Мне есть ${age}`, uk: `Мені є ${age}`, es: `Tengo ${age} años`, 'pt-BR': `Tenho ${age} anos`,
      vi: `Tôi đã đủ ${age} tuổi`, id: `Saya sudah berusia ${age} tahun`, tr: `${age} yaşındayım`, pl: `Mam ${age} lat`,
    });
  }
  return triLang(lang, {
    ru: `Мне нет ${age}`, uk: `Мені ще немає ${age}`, es: `No tengo ${age} años`, 'pt-BR': `Não tenho ${age} anos`,
    vi: `Tôi chưa đủ ${age} tuổi`, id: `Saya belum berusia ${age} tahun`, tr: `${age} yaşında değilim`, pl: `Nie mam jeszcze ${age} lat`,
  });
}

/** Экран оплаты исключён намеренно: см. комментарий выше. */
const SKIP_HIDDEN_STEPS: readonly CleanOnboardingStep[] = ['onboardingPaywall', 'name'];

function OnboardingSkipLink({ step, light }: { step: CleanOnboardingStep; light?: boolean }) {
  const skip = React.useContext(OnboardingSkipContext);
  const lang = React.useContext(OnboardingLocaleContext);
  if (!skip || SKIP_HIDDEN_STEPS.includes(step)) return null;
  return (
    <Pressable
      testID="onboarding-skip"
      onPressIn={() => { void hapticTap(); }}
      onPress={skip}
      style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={onboardingCopy(lang, { ru: 'Пропустить знакомство', uk: 'Пропустити знайомство', es: 'Omitir la bienvenida', 'pt-BR': 'Pular a apresentação', vi: 'Bỏ qua phần làm quen', id: 'Lewati perkenalan', tr: 'Tanışmayı atla', pl: 'Pomiń wprowadzenie' })}
    >
      <Text style={[styles.skipLabel, light && styles.skipLabelLight]}>{onboardingCopy(lang, { ru: 'Пропустить', uk: 'Пропустити', es: 'Omitir', 'pt-BR': 'Pular', vi: 'Bỏ qua', id: 'Lewati', tr: 'Atla', pl: 'Pomiń' })}</Text>
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
  const lang = React.useContext(OnboardingLocaleContext);
  return (
    <View style={styles.notificationMockWrap}>
      <View style={styles.notificationMock}>
        <Text style={styles.notificationMockTitle}>
          {isIos
            ? onboardingCopy(lang, { ru: 'Приложение хочет отправлять уведомления', uk: 'Застосунок хоче надсилати сповіщення', es: 'La app quiere enviarte notificaciones', 'pt-BR': 'O app quer enviar notificações', vi: 'Ứng dụng muốn gửi thông báo', id: 'Aplikasi ingin mengirim notifikasi', tr: 'Uygulama bildirim göndermek istiyor', pl: 'Aplikacja chce wysyłać powiadomienia' })
            : onboardingCopy(lang, { ru: 'Разрешить уведомления?', uk: 'Дозволити сповіщення?', es: '¿Permitir notificaciones?', 'pt-BR': 'Permitir notificações?', vi: 'Cho phép thông báo?', id: 'Izinkan notifikasi?', tr: 'Bildirimlere izin verilsin mi?', pl: 'Zezwolić na powiadomienia?' })}
        </Text>
        <Text style={styles.notificationMockBody}>
          {isIos
            ? onboardingCopy(lang, { ru: 'Уведомления могут включать напоминания, звуки и значки.', uk: 'Сповіщення можуть містити нагадування, звуки й значки.', es: 'Las notificaciones pueden incluir recordatorios, sonidos e insignias.', 'pt-BR': 'As notificações podem incluir lembretes, sons e emblemas.', vi: 'Thông báo có thể gồm lời nhắc, âm thanh và huy hiệu.', id: 'Notifikasi dapat berisi pengingat, suara, dan lencana.', tr: 'Bildirimler hatırlatmalar, sesler ve rozetler içerebilir.', pl: 'Powiadomienia mogą zawierać przypomnienia, dźwięki i plakietki.' })
            : onboardingCopy(lang, { ru: 'Мы будем напоминать о короткой практике в выбранное время.', uk: 'Ми нагадаємо про коротке заняття у вибраний час.', es: 'Te recordaremos hacer una práctica corta a la hora elegida.', 'pt-BR': 'Vamos lembrar você de fazer uma prática curta no horário escolhido.', vi: 'Chúng tôi sẽ nhắc bạn luyện tập ngắn vào giờ đã chọn.', id: 'Kami akan mengingatkanmu untuk latihan singkat pada waktu yang dipilih.', tr: 'Seçtiğin saatte kısa bir pratik için hatırlatma yapacağız.', pl: 'Przypomnimy Ci o krótkim ćwiczeniu o wybranej porze.' })}
        </Text>
        <View style={styles.notificationMockActions}>
          <Text style={styles.notificationMockMuted}>{isIos ? onboardingCopy(lang, { ru: 'Не разрешать', uk: 'Не дозволяти', es: 'No permitir', 'pt-BR': 'Não permitir', vi: 'Không cho phép', id: 'Jangan izinkan', tr: 'İzin verme', pl: 'Nie zezwalaj' }) : onboardingCopy(lang, { ru: 'Не сейчас', uk: 'Не зараз', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Bây giờ không', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz' })}</Text>
          <Text style={styles.notificationMockAllow}>{onboardingCopy(lang, { ru: 'Разрешить', uk: 'Дозволити', es: 'Permitir', 'pt-BR': 'Permitir', vi: 'Cho phép', id: 'Izinkan', tr: 'İzin ver', pl: 'Zezwól' })}</Text>
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
  const [goal, setGoal] = useState<PersonalPlanSetupGoal | null>(null);
  const [minutes, setMinutes] = useState<PlanMinutesChoice | null>(null);
  const [plusSelected, setPlusSelected] = useState(true);
  const [notificationBusy, setNotificationBusy] = useState(false);
  const [paywallBusy, setPaywallBusy] = useState(false);
  const [ageAnswer, setAgeAnswer] = useState<AgeAnswer>(null);
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  const [legalError, setLegalError] = useState<string | null>(null);
  const [remoteEnabledSteps, setRemoteEnabledSteps] = useState(getEnabledOnboardingSteps);
  // зачем: оба рубильника читаются как обычные kill-switch'и и обновляются по
  // тому же событию remote_config_changed, что и список экранов — владелец
  // выключает их из админки без релиза; клиенты применяют кэш при старте/возврате
  // и foreground-обновление не позднее примерно пяти минут.
  const [skipEnabled, setSkipEnabled] = useState(() => getRemoteBool('onboarding_skip_enabled'));
  const [welcomeSheetEnabled, setWelcomeSheetEnabled] = useState(
    () => getRemoteBool('onboarding_welcome_sheet_enabled'),
  );
  const finishingRef = useRef(false);
  const paywallTransitionBusyRef = useRef(false);

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
    go('source');
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

  const continueAfterNotificationDialog = useCallback(() => {
    InteractionManager.runAfterInteractions(() => go('plusBenefits'));
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
        go('plusBenefits');
        return;
      }
      if (blocked) {
        Alert.alert(
          onboardingCopy(lang, { ru: 'Напоминание не включилось', uk: 'Нагадування не ввімкнулося', es: 'No se activó el recordatorio', 'pt-BR': 'Não foi possível ativar o lembrete', vi: 'Không bật được lời nhắc', id: 'Pengingat tidak dapat diaktifkan', tr: 'Hatırlatıcı açılamadı', pl: 'Nie udało się włączyć przypomnienia' }),
          onboardingCopy(lang, { ru: 'Разрешение на уведомления отключено. Включить его можно в настройках телефона.', uk: 'Дозвіл на сповіщення вимкнено. Його можна ввімкнути в налаштуваннях телефону.', es: 'El permiso de notificaciones está desactivado. Puedes activarlo en los ajustes del teléfono.', 'pt-BR': 'A permissão para notificações está desativada. Você pode ativá-la nos ajustes do telefone.', vi: 'Quyền thông báo đang tắt. Bạn có thể bật trong phần cài đặt điện thoại.', id: 'Izin notifikasi dinonaktifkan. Kamu dapat mengaktifkannya di pengaturan ponsel.', tr: 'Bildirim izni kapalı. Telefon ayarlarından açabilirsin.', pl: 'Uprawnienie do powiadomień jest wyłączone. Możesz je włączyć w ustawieniach telefonu.' }),
          [
            { text: onboardingCopy(lang, { ru: 'Позже', uk: 'Пізніше', es: 'Más tarde', 'pt-BR': 'Mais tarde', vi: 'Để sau', id: 'Nanti', tr: 'Daha sonra', pl: 'Później' }), style: 'cancel', onPress: continueAfterNotificationDialog },
            {
              text: onboardingCopy(lang, { ru: 'Открыть настройки', uk: 'Відкрити налаштування', es: 'Abrir ajustes', 'pt-BR': 'Abrir configurações', vi: 'Mở cài đặt', id: 'Buka pengaturan', tr: 'Ayarları aç', pl: 'Otwórz ustawienia' }),
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
  }, [continueAfterNotificationDialog, go, lang, notificationBusy, studyTarget]);

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
    if (paywallBusy || paywallTransitionBusyRef.current) return;
    if (!plusSelected) {
      go('name');
      return;
    }
    const decision = decideOnboardingTransition(enabledOrder, 'startMode');
    setPaywallBusy(true);
    try {
      await runOnboardingTransitionEffects(decision, paywallTransitionBusyRef, {
        createPendingPlan: () => queueSelectedPlan('yearly'),
        preparePaywall: () => trackOnboardingPlanTrialCta({ planId, minutes: selectedMinutes, plan: 'yearly' }),
        trackPaywallView: () => trackOnboardingPlanPaywallView({ planId, minutes: selectedMinutes, plan: 'yearly' }),
      });
      go(decision.destination);
    } finally {
      setPaywallBusy(false);
    }
  }, [enabledOrder, go, paywallBusy, planId, plusSelected, queueSelectedPlan, selectedMinutes]);

  const continueFromPlanComparison = useCallback(async () => {
    if (paywallBusy || paywallTransitionBusyRef.current) return;
    setPaywallBusy(true);
    try {
      const decision = decideOnboardingTransition(enabledOrder, 'planComparison');
      await runOnboardingTransitionEffects(decision, paywallTransitionBusyRef, {
        createPendingPlan: () => queueSelectedPlan('yearly'),
        preparePaywall: () => trackOnboardingPlanTrialCta({ planId, minutes: selectedMinutes, plan: 'yearly' }),
        trackPaywallView: () => trackOnboardingPlanPaywallView({ planId, minutes: selectedMinutes, plan: 'yearly' }),
      });
      go(decision.destination);
    } finally {
      setPaywallBusy(false);
    }
  }, [enabledOrder, go, paywallBusy, planId, queueSelectedPlan, selectedMinutes]);

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
    if (!legalAccepted) {
      setLegalError('Нужно принять условия и политику конфиденциальности.');
      return;
    }

    finishingRef.current = true;
    try {
      const currentLevel = levelToCurrentLevel(selectedLevel);
      const profileMinutes = minutesToProfileMinutes(selectedMinutes);
      const targetLevel = targetAfterLevel(currentLevel);
      const estimatedDays = estimateDaysToTarget(currentLevel, targetLevel, profileMinutes);
      const targetDate = addDays(new Date(), estimatedDays || 30);
      const profile: UserProfile = {
        name: '',
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
        ['user_profile', JSON.stringify(profile)],
        [GENERATED_NICKNAME_PENDING_KEY, JSON.stringify({ createdAt: Date.now() })],
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
          goal: selectedGoal,
          level: selectedLevel,
          minutes: selectedMinutes,
          target: studyTarget,
          plusSelected,
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
    legalAccepted,
    onDone,
    plusSelected,
    selectedGoal,
    selectedLevel,
    selectedMinutes,
    source,
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
                ? (unknownAccountEmail !== null
                  ? onboardingCopy(lang, { ru: 'Начнём с чистого листа', uk: 'Почнімо з чистого аркуша', es: 'Empecemos desde cero', 'pt-BR': 'Vamos começar do zero', vi: 'Hãy bắt đầu lại từ đầu', id: 'Mari mulai dari awal', tr: 'Sıfırdan başlayalım', pl: 'Zacznijmy od nowa' })
                  : onboardingCopy(lang, { ru: 'Вернём твой прогресс', uk: 'Повернемо ваш прогрес', es: 'Recuperemos tu progreso', 'pt-BR': 'Vamos recuperar seu progresso', vi: 'Khôi phục tiến độ của bạn', id: 'Mari pulihkan progresmu', tr: 'İlerlemenizi geri getirelim', pl: 'Odzyskajmy Twój postęp' }))
                : onboardingCopy(lang, { ru: 'От первых слов до свободной речи.', uk: 'Від перших слів до вільного мовлення.', es: 'De las primeras palabras a hablar con soltura.', 'pt-BR': 'Das primeiras palavras à fala fluente.', vi: 'Từ những từ đầu tiên đến giao tiếp tự tin.', id: 'Dari kata pertama hingga berbicara lancar.', tr: 'İlk kelimelerden akıcı konuşmaya.', pl: 'Od pierwszych słów do swobodnej mowy.' })}
            </Text>
            {authMode ? null : (
              <FadeUp delay={520}>
                <Text style={styles.welcomeSubtitle}>{onboardingCopy(lang, { ru: 'Живые фразы · короткие сессии · твой маршрут', uk: 'Живі фрази · короткі сесії · твій маршрут', es: 'Frases reales · sesiones cortas · tu ruta', 'pt-BR': 'Frases reais · sessões curtas · seu caminho', vi: 'Cụm từ thực tế · phiên ngắn · lộ trình của bạn', id: 'Frasa nyata · sesi singkat · jalurmu', tr: 'Canlı ifadeler · kısa oturumlar · rotan', pl: 'Żywe zwroty · krótkie sesje · Twoja ścieżka' })}</Text>
              </FadeUp>
            )}
          </View>

          {authMode && unknownAccountEmail !== null ? (
            <View style={styles.authButtons}>
              <Text style={styles.unknownAccountText}>
                {unknownAccountEmail
                  ? onboardingCopy(lang, { ru: `Аккаунта ${unknownAccountEmail} у нас нет.`, uk: `У нас немає облікового запису ${unknownAccountEmail}.`, es: `No encontramos la cuenta ${unknownAccountEmail}.`, 'pt-BR': `Não encontramos a conta ${unknownAccountEmail}.`, vi: `Chúng tôi không tìm thấy tài khoản ${unknownAccountEmail}.`, id: `Kami tidak menemukan akun ${unknownAccountEmail}.`, tr: `${unknownAccountEmail} hesabını bulamadık.`, pl: `Nie znaleźliśmy konta ${unknownAccountEmail}.` })
                  : onboardingCopy(lang, { ru: 'Такого аккаунта у нас нет.', uk: 'Такого облікового запису немає.', es: 'No encontramos esa cuenta.', 'pt-BR': 'Não encontramos essa conta.', vi: 'Chúng tôi không tìm thấy tài khoản này.', id: 'Kami tidak menemukan akun tersebut.', tr: 'Böyle bir hesap bulunamadı.', pl: 'Nie znaleźliśmy takiego konta.' })}
              </Text>
              <PrimaryButton
                label={onboardingCopy(lang, { ru: 'Создать аккаунт', uk: 'Створити обліковий запис', es: 'Crear cuenta', 'pt-BR': 'Criar conta', vi: 'Tạo tài khoản', id: 'Buat akun', tr: 'Hesap oluştur', pl: 'Utwórz konto' })}
                onPress={continueAsNewAccount}
                testID="onboarding-unknown-account-create"
              />
              <SecondaryButton
                label={onboardingCopy(lang, { ru: 'Войти другим способом', uk: 'Увійти іншим способом', es: 'Entrar de otra forma', 'pt-BR': 'Entrar de outra forma', vi: 'Đăng nhập bằng cách khác', id: 'Masuk dengan cara lain', tr: 'Başka bir yöntemle giriş yap', pl: 'Zaloguj się inaczej' })}
                onPress={() => setUnknownAccountEmail(null)}
                testID="onboarding-unknown-account-retry"
              />
            </View>
          ) : authMode ? (
            <View style={styles.authButtons}>
              {googleAvailable ? (
                <GoogleSignInButton
                  label={onboardingCopy(lang, { ru: 'Войти через Google', uk: 'Увійти через Google', es: 'Entrar con Google', 'pt-BR': 'Entrar com Google', vi: 'Đăng nhập bằng Google', id: 'Masuk dengan Google', tr: 'Google ile giriş yap', pl: 'Zaloguj przez Google' })}
                  variant="dark"
                  loading={authLoading === 'google'}
                  disabled={!!authLoading}
                  onPress={() => { void handleAuth('google'); }}
                />
              ) : null}
              {appleAvailable ? (
                <AppleSignInButton
                  label={onboardingCopy(lang, { ru: 'Войти через Apple', uk: 'Увійти через Apple', es: 'Entrar con Apple', 'pt-BR': 'Entrar com Apple', vi: 'Đăng nhập bằng Apple', id: 'Masuk dengan Apple', tr: 'Apple ile giriş yap', pl: 'Zaloguj przez Apple' })}
                  loading={authLoading === 'apple'}
                  disabled={!!authLoading}
                  onPress={() => { void handleAuth('apple'); }}
                />
              ) : null}
              {!googleAvailable && !appleAvailable ? (
                <Text style={styles.errorText}>{onboardingCopy(lang, { ru: 'Вход через Google или Apple недоступен на этом устройстве.', uk: 'Вхід через Google або Apple недоступний на цьому пристрої.', es: 'El inicio de sesión con Google o Apple no está disponible en este dispositivo.', 'pt-BR': 'O login com Google ou Apple não está disponível neste dispositivo.', vi: 'Không thể đăng nhập bằng Google hoặc Apple trên thiết bị này.', id: 'Login dengan Google atau Apple tidak tersedia di perangkat ini.', tr: 'Bu cihazda Google veya Apple ile giriş kullanılamıyor.', pl: 'Logowanie przez Google lub Apple nie jest dostępne na tym urządzeniu.' })}</Text>
              ) : null}
              {authError ? <Text style={styles.errorText}>{authError}</Text> : null}
              <SecondaryButton
                label={onboardingCopy(lang, { ru: 'Назад', uk: 'Назад', es: 'Atrás', 'pt-BR': 'Voltar', vi: 'Quay lại', id: 'Kembali', tr: 'Geri', pl: 'Wstecz' })}
                onPress={() => { setAuthMode(false); setAuthError(null); }}
                testID="onboarding-auth-back"
              />
            </View>
          ) : (
            <View style={styles.welcomeButtons}>
              <PrimaryButton label={onboardingCopy(lang, { ru: 'Начать', uk: 'Почати', es: 'Empezar', 'pt-BR': 'Começar', vi: 'Bắt đầu', id: 'Mulai', tr: 'Başla', pl: 'Zacznij' })} onPress={() => go('source')} testID="onboarding-start" />
              <SecondaryButton label={onboardingCopy(lang, { ru: 'У меня уже есть аккаунт', uk: 'У мене вже є обліковий запис', es: 'Ya tengo una cuenta', 'pt-BR': 'Já tenho uma conta', vi: 'Tôi đã có tài khoản', id: 'Saya sudah punya akun', tr: 'Zaten hesabım var', pl: 'Mam już konto' })} onPress={() => setAuthMode(true)} testID="onboarding-existing-account" />
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  const renderSource = () => (
    <ScreenFrame
      step="source"
      title={onboardingCopy(lang, { ru: 'Как ты узнал о нас?', uk: 'Як ви дізналися про нас?', es: '¿Cómo nos conociste?', 'pt-BR': 'Como você nos conheceu?', vi: 'Bạn biết đến chúng tôi bằng cách nào?', id: 'Bagaimana kamu mengetahui kami?', tr: 'Bizi nasıl duydunuz?', pl: 'Skąd się o nas dowiedziałeś?' })}
      onBack={back}
    >
      <View style={styles.optionList}>
        {DISCOVERY_OPTIONS.map((item) => (
          <OptionCard
            key={item.id}
            option={{ ...item, title: onboardingCopy(lang, item.title) }}
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
      title={onboardingCopy(lang, { ru: 'Какой язык учим?', uk: 'Яку мову вивчаємо?', es: '¿Qué idioma aprendemos?', 'pt-BR': 'Qual idioma vamos aprender?', vi: 'Bạn muốn học ngôn ngữ nào?', id: 'Bahasa apa yang akan dipelajari?', tr: 'Hangi dili öğreniyoruz?', pl: 'Jakiego języka się uczymy?' })}
      onBack={back}
      footer={<PrimaryButton label={onboardingCopy(lang, { ru: 'Выбрать язык', uk: 'Обрати мову', es: 'Elegir idioma', 'pt-BR': 'Escolher idioma', vi: 'Chọn ngôn ngữ', id: 'Pilih bahasa', tr: 'Dil seç', pl: 'Wybierz język' })} onPress={() => go('level')} testID="onboarding-language-continue" />}
    >
      <View style={styles.optionList}>
        {LANGUAGE_OPTIONS.map((item) => (
          <LanguageCard
            key={item.id}
            option={{ ...item, title: onboardingCopy(lang, item.title), native: onboardingCopy(lang, item.native) }}
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
      footer={<PrimaryButton label={onboardingCopy(lang, { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' })} onPress={() => go('goal')} disabled={!level} testID="onboarding-level-continue" />}
    >
      <View style={styles.optionList}>
        {LEVEL_OPTIONS.map((item) => (
          <OptionCard
            key={item.id}
            option={{ ...item, title: onboardingCopy(lang, item.title) }}
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
      footer={<PrimaryButton label={onboardingCopy(lang, { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' })} onPress={() => go('minutes')} disabled={!goal} testID="onboarding-goal-continue" />}
    >
      <View style={styles.optionList}>
        {GOAL_OPTIONS.map((item) => (
          <OptionCard
            key={item.id}
            option={{ ...item, title: onboardingCopy(lang, item.title) }}
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
      title={onboardingCopy(lang, { ru: 'Сколько времени в день?', uk: 'Скільки часу на день?', es: '¿Cuánto tiempo al día?', 'pt-BR': 'Quanto tempo por dia?', vi: 'Mỗi ngày bao nhiêu thời gian?', id: 'Berapa waktu per hari?', tr: 'Günde ne kadar zaman?', pl: 'Ile czasu dziennie?' })}
      onBack={back}
      footer={<PrimaryButton label={onboardingCopy(lang, { ru: 'К плану', uk: 'До плану', es: 'Ver mi plan', 'pt-BR': 'Ver meu plano', vi: 'Xem kế hoạch', id: 'Lihat rencana', tr: 'Plana geç', pl: 'Zobacz plan' })} onPress={() => go('aha')} disabled={!minutes} testID="onboarding-minutes-continue" />}
    >
      <View style={styles.optionList}>
        {MINUTE_OPTIONS.map((item) => (
          <OptionCard
            key={item.id}
            option={{ ...item, title: onboardingCopy(lang, item.title) }}
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
      title={onboardingCopy(lang, { ru: 'Напомнить о занятии', uk: 'Нагадувати про заняття', es: 'Recordarme estudiar', 'pt-BR': 'Lembrar de estudar', vi: 'Nhắc tôi học', id: 'Ingatkan untuk belajar', tr: 'Çalışmayı hatırlat', pl: 'Przypomnij o nauce' })}
      onBack={back}
      footer={
        <>
          <PrimaryButton label={onboardingCopy(lang, { ru: 'Включить напоминание', uk: 'Увімкнути нагадування', es: 'Activar recordatorio', 'pt-BR': 'Ativar lembrete', vi: 'Bật lời nhắc', id: 'Aktifkan pengingat', tr: 'Hatırlatıcıyı aç', pl: 'Włącz przypomnienie' })} onPress={requestPracticeNotification} loading={notificationBusy} testID="onboarding-notifications-allow" />
          <Pressable
            testID="onboarding-notifications-skip"
            onPressIn={() => { void hapticTap(); }}
            onPress={() => go('plusBenefits')}
            style={styles.textButton}
            accessibilityRole="button"
          >
            <Text style={styles.textButtonLabel}>{onboardingCopy(lang, { ru: 'Не сейчас', uk: 'Не зараз', es: 'Ahora no', 'pt-BR': 'Agora não', vi: 'Bây giờ không', id: 'Nanti saja', tr: 'Şimdi değil', pl: 'Nie teraz' })}</Text>
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
      title={onboardingCopy(lang, { ru: 'Как хочешь начать?', uk: 'Як хочете почати?', es: '¿Cómo quieres empezar?', 'pt-BR': 'Como você quer começar?', vi: 'Bạn muốn bắt đầu thế nào?', id: 'Bagaimana kamu ingin memulai?', tr: 'Nasıl başlamak istersiniz?', pl: 'Jak chcesz zacząć?' })}
      onBack={back}
      footer={<PrimaryButton label={onboardingCopy(lang, { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' })} onPress={openPaywallOrName} loading={paywallBusy} testID="onboarding-start-mode-continue" />}
    >
      <View style={styles.optionList}>
        <Pressable
          testID="onboarding-start-mode-plus"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => setPlusSelected(true)}
          style={({ pressed }) => [styles.modeCard, plusSelected && styles.modeCardSelected, pressed && styles.pressed]}
        >
          <Image source={ONBOARDING_ASSETS.startPlus} style={styles.modeAsset} resizeMode="contain" />
          <View style={styles.recommendedBadge}><Text style={styles.recommendedText}>{onboardingCopy(lang, { ru: 'Рекомендую', uk: 'Рекомендую', es: 'Recomendado', 'pt-BR': 'Recomendado', vi: 'Đề xuất', id: 'Rekomendasi', tr: 'Önerilen', pl: 'Polecane' })}</Text></View>
          <Text style={styles.modeTitle}>Phraseman Plus</Text>
        </Pressable>
        <Pressable
          testID="onboarding-start-mode-free"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => setPlusSelected(false)}
          style={({ pressed }) => [styles.modeCard, !plusSelected && styles.modeCardSelected, pressed && styles.pressed]}
        >
          <Image source={ONBOARDING_ASSETS.startFree} style={styles.modeAsset} resizeMode="contain" />
          <Text style={styles.modeTitle}>{onboardingCopy(lang, { ru: 'Начать бесплатно', uk: 'Почати безкоштовно', es: 'Empezar gratis', 'pt-BR': 'Começar grátis', vi: 'Bắt đầu miễn phí', id: 'Mulai gratis', tr: 'Ücretsiz başla', pl: 'Zacznij za darmo' })}</Text>
        </Pressable>
      </View>
    </ScreenFrame>
  );

  const renderPlusBenefits = () => (
    <ScreenFrame
      step="plusBenefits"
      title={onboardingCopy(lang, { ru: 'Через 3 месяца по твоему маршруту ты сможешь:', uk: 'За 3 місяці за вашим маршрутом ви зможете:', es: 'En 3 meses, con tu ruta podrás:', 'pt-BR': 'Em 3 meses, com seu caminho você poderá:', vi: 'Sau 3 tháng theo lộ trình này, bạn có thể:', id: 'Dalam 3 bulan dengan rencanamu, kamu akan bisa:', tr: 'Rotanızda 3 ay sonra şunları yapabileceksiniz:', pl: 'Po 3 miesiącach z tą ścieżką będziesz mógł:' })}
      onBack={back}
      footer={<PrimaryButton label={onboardingCopy(lang, { ru: 'Хочу так', uk: 'Хочу так', es: 'Lo quiero', 'pt-BR': 'Quero isso', vi: 'Tôi muốn vậy', id: 'Saya mau', tr: 'Bunu istiyorum', pl: 'Chcę tak' })} onPress={() => go('startMode')} testID="onboarding-plus-benefits-continue" />}
    >
      <View style={styles.plusBenefitList}>
        {PLUS_THREE_MONTH_PROMISES.map((item, index) => (
          <PlusBenefitRow
            key={item.title.ru}
            index={index}
            icon={index === 0 ? 'chatbubble-ellipses-outline' : index === 1 ? 'volume-high-outline' : 'refresh-outline'}
            title={onboardingCopy(lang, item.title)}
            body={onboardingCopy(lang, item.body)}
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
      title={onboardingCopy(lang, { ru: 'С Plus открыто всё', uk: 'З Plus відкрито все', es: 'Con Plus todo está abierto', 'pt-BR': 'Com o Plus, tudo fica liberado', vi: 'Plus mở khóa mọi thứ', id: 'Dengan Plus, semuanya terbuka', tr: 'Plus ile her şey açık', pl: 'Z Plusem wszystko jest odblokowane' })}
      onBack={back}
      light
      plainTitle
      footer={<PrimaryButton label={onboardingCopy(lang, { ru: 'Хочу так', uk: 'Хочу так', es: 'Lo quiero', 'pt-BR': 'Quero isso', vi: 'Tôi muốn vậy', id: 'Saya mau', tr: 'Bunu istiyorum', pl: 'Chcę tak' })} onPress={() => void continueFromPlanComparison()} loading={paywallBusy} testID="onboarding-plan-comparison-continue" />}
    >
      <Text style={styles.cmpSubtitle}>{onboardingCopy(lang, { ru: 'Вот что добавится к бесплатному', uk: 'Ось що додасться до безкоштовного доступу', es: 'Esto es lo que se añade al plan gratuito', 'pt-BR': 'Veja o que se soma ao plano gratuito', vi: 'Đây là những gì được thêm vào bản miễn phí', id: 'Inilah yang ditambahkan ke paket gratis', tr: 'Ücretsiz plana bunlar eklenir', pl: 'Oto, co dochodzi do wersji darmowej' })}</Text>
      <View style={styles.cmpHeaderRow}>
        <View style={styles.cmpLabelCell} />
        <Text style={styles.cmpHeaderFree}>FREE</Text>
        <Text style={styles.cmpHeaderPlus}>PLUS</Text>
      </View>
      <View style={styles.cmpList}>
        {PLAN_COMPARISON_BENEFITS.map((item, index) => (
          <PlanComparisonRow key={item.icon} index={index} icon={item.icon} title={onboardingCopy(lang, item.title)} />
        ))}
      </View>
    </ScreenFrame>
  );

  const renderOnboardingPaywall = () => {
    // Apple 3.1.2(c): списываемая сумма (billed amount) должна быть самым крупным
    // и заметным ценовым элементом. Поэтому у «Года» КРУПНО показываем полную цену
    // за год ($24.99 в год), а расчётную цену за месяц ($2.08 / мес) — мелкой
    // подписью снизу. Для «Месяца» списываемая сумма и есть месячная цена.
    const yearlyLabel = yearlyPrice ? onboardingCopy(lang, { ru: `${yearlyPrice} в год`, uk: `${yearlyPrice} на рік`, es: `${yearlyPrice} al año`, 'pt-BR': `${yearlyPrice} por ano`, vi: `${yearlyPrice} mỗi năm`, id: `${yearlyPrice} per tahun`, tr: `${yearlyPrice} / yıl`, pl: `${yearlyPrice} rocznie` }) : onboardingCopy(lang, { ru: 'Год', uk: 'Рік', es: 'Año', 'pt-BR': 'Ano', vi: 'Năm', id: 'Tahun', tr: 'Yıl', pl: 'Rok' });
    const yearlySubLabel = yearlyPerMonth ? onboardingCopy(lang, { ru: `${yearlyPerMonth} / мес`, uk: `${yearlyPerMonth} / міс`, es: `${yearlyPerMonth} / mes`, 'pt-BR': `${yearlyPerMonth} / mês`, vi: `${yearlyPerMonth} / tháng`, id: `${yearlyPerMonth} / bln`, tr: `${yearlyPerMonth} / ay`, pl: `${yearlyPerMonth} / mies.` }) : undefined;
    const monthlyLabel = monthlyPrice ? onboardingCopy(lang, { ru: `${monthlyPrice} / мес`, uk: `${monthlyPrice} / міс`, es: `${monthlyPrice} / mes`, 'pt-BR': `${monthlyPrice} / mês`, vi: `${monthlyPrice} / tháng`, id: `${monthlyPrice} / bln`, tr: `${monthlyPrice} / ay`, pl: `${monthlyPrice} / mies.` }) : onboardingCopy(lang, { ru: 'Месяц', uk: 'Місяць', es: 'Mes', 'pt-BR': 'Mês', vi: 'Tháng', id: 'Bulan', tr: 'Ay', pl: 'Miesiąc' });
    const lifetimeLabel = lifetimePrice || (lifetimeAvailable ? onboardingCopy(lang, { ru: 'Разовая покупка', uk: 'Разова покупка', es: 'Compra única', 'pt-BR': 'Compra única', vi: 'Mua một lần', id: 'Pembelian sekali', tr: 'Tek seferlik satın alma', pl: 'Zakup jednorazowy' }) : onboardingCopy(lang, { ru: 'Разовый доступ', uk: 'Разовий доступ', es: 'Acceso único', 'pt-BR': 'Acesso único', vi: 'Truy cập một lần', id: 'Akses sekali', tr: 'Tek seferlik erişim', pl: 'Dostęp jednorazowy' }));
    return (
      <ScreenFrame
        step="onboardingPaywall"
        title={onboardingCopy(lang, { ru: 'Открой полный доступ Phraseman Plus', uk: 'Відкрийте повний доступ Phraseman Plus', es: 'Desbloquea todo Phraseman Plus', 'pt-BR': 'Desbloqueie o acesso completo ao Phraseman Plus', vi: 'Mở khóa toàn bộ Phraseman Plus', id: 'Buka akses penuh Phraseman Plus', tr: 'Phraseman Plus’ın tüm erişimini açın', pl: 'Odblokuj pełny dostęp do Phraseman Plus' })}
        onBack={back}
        light
        plainTitle
        footer={
          <>
            <PrimaryButton
              label={paywallOfferingsFailed ? onboardingCopy(lang, { ru: 'Повторить', uk: 'Повторити', es: 'Reintentar', 'pt-BR': 'Tentar novamente', vi: 'Thử lại', id: 'Coba lagi', tr: 'Tekrar dene', pl: 'Spróbuj ponownie' }) : onboardingCopy(lang, { ru: 'Продолжить', uk: 'Продовжити', es: 'Continuar', 'pt-BR': 'Continuar', vi: 'Tiếp tục', id: 'Lanjutkan', tr: 'Devam et', pl: 'Kontynuuj' })}
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
                <Text style={styles.paywallFooterLink}>{paywallRestoring ? onboardingCopy(lang, { ru: 'Восстанавливаем...', uk: 'Відновлюємо...', es: 'Restaurando...', 'pt-BR': 'Restaurando...', vi: 'Đang khôi phục...', id: 'Memulihkan...', tr: 'Geri yükleniyor...', pl: 'Przywracanie...' }) : onboardingCopy(lang, { ru: 'Восстановить', uk: 'Відновити', es: 'Restaurar', 'pt-BR': 'Restaurar', vi: 'Khôi phục', id: 'Pulihkan', tr: 'Geri yükle', pl: 'Przywróć' })}</Text>
              </Pressable>
              <Text style={styles.paywallFooterDot}>·</Text>
              <Pressable
                testID="onboarding-paywall-continue-free"
                onPressIn={() => { void hapticTap(); }}
                onPress={() => go('name')}
                accessibilityRole="button"
              >
                <Text style={styles.paywallFooterLink}>{onboardingCopy(lang, { ru: 'Продолжить бесплатно', uk: 'Продовжити безкоштовно', es: 'Seguir gratis', 'pt-BR': 'Continuar grátis', vi: 'Tiếp tục miễn phí', id: 'Lanjut gratis', tr: 'Ücretsiz devam et', pl: 'Kontynuuj za darmo' })}</Text>
              </Pressable>
            </View>
          </>
        }
      >
        <View style={styles.paywallPlanList}>
          <PaywallPlanCard
            plan="yearly"
            title={onboardingCopy(lang, { ru: 'Год', uk: 'Рік', es: 'Año', 'pt-BR': 'Ano', vi: 'Năm', id: 'Tahun', tr: 'Yıl', pl: 'Rok' })}
            price={paywallLoading ? onboardingCopy(lang, { ru: 'Загрузка цены...', uk: 'Завантаження ціни...', es: 'Cargando precio...', 'pt-BR': 'Carregando preço...', vi: 'Đang tải giá...', id: 'Memuat harga...', tr: 'Fiyat yükleniyor...', pl: 'Wczytywanie ceny...' }) : yearlyLabel}
            subprice={paywallLoading ? undefined : yearlySubLabel}
            badge={onboardingCopy(lang, { ru: 'лучший старт', uk: 'найкращий старт', es: 'mejor comienzo', 'pt-BR': 'melhor começo', vi: 'khởi đầu tốt nhất', id: 'awal terbaik', tr: 'en iyi başlangıç', pl: 'najlepszy start' })}
            selected={selectedBillingPlan === 'yearly'}
            onPress={choosePaywallPlan}
            asset={ONBOARDING_ASSETS.paywallYearly}
            testID="onboarding-paywall-plan-yearly"
          />
          <PaywallPlanCard
            plan="monthly"
            title={onboardingCopy(lang, { ru: 'Месяц', uk: 'Місяць', es: 'Mes', 'pt-BR': 'Mês', vi: 'Tháng', id: 'Bulan', tr: 'Ay', pl: 'Miesiąc' })}
            price={paywallLoading ? onboardingCopy(lang, { ru: 'Загрузка цены...', uk: 'Завантаження ціни...', es: 'Cargando precio...', 'pt-BR': 'Carregando preço...', vi: 'Đang tải giá...', id: 'Memuat harga...', tr: 'Fiyat yükleniyor...', pl: 'Wczytywanie ceny...' }) : monthlyLabel}
            selected={selectedBillingPlan === 'monthly'}
            onPress={choosePaywallPlan}
            asset={ONBOARDING_ASSETS.paywallMonthly}
            testID="onboarding-paywall-plan-monthly"
          />
          <PaywallPlanCard
            plan="lifetime"
            title="Phraseman Pro"
            price={paywallLoading ? onboardingCopy(lang, { ru: 'Загрузка цены...', uk: 'Завантаження ціни...', es: 'Cargando precio...', 'pt-BR': 'Carregando preço...', vi: 'Đang tải giá...', id: 'Memuat harga...', tr: 'Fiyat yükleniyor...', pl: 'Wczytywanie ceny...' }) : lifetimeLabel}
            badge={onboardingCopy(lang, { ru: 'разово', uk: 'разово', es: 'una vez', 'pt-BR': 'único', vi: 'một lần', id: 'sekali', tr: 'tek seferlik', pl: 'jednorazowo' })}
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
      title={onboardingCopy(lang, { ru: 'Почти готово', uk: 'Майже готово', es: 'Casi listo', 'pt-BR': 'Quase pronto', vi: 'Sắp xong', id: 'Hampir selesai', tr: 'Neredeyse hazır', pl: 'Prawie gotowe' })}
      plainTitle
      onBack={back}
      footer={(
        <PrimaryButton
          label={onboardingCopy(lang, { ru: 'Начать обучение', uk: 'Почати навчання', es: 'Empezar a aprender', 'pt-BR': 'Começar a aprender', vi: 'Bắt đầu học', id: 'Mulai belajar', tr: 'Öğrenmeye başla', pl: 'Zacznij naukę' })}
          onPress={() => {
            Keyboard.dismiss();
            void finish();
          }}
          disabled={ageAnswer !== 'yes' || !legalAccepted}
          testID="onboarding-finish"
        />
      )}
    >
      <View style={styles.ageButtons}>
        <Pressable
          testID="onboarding-age-yes"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => { setAgeAnswer('yes'); setLegalError(null); }}
          style={({ pressed }) => [styles.ageButton, ageAnswer === 'yes' && styles.ageButtonSelected, pressed && styles.pressed]}
        >
          <Text style={styles.ageButtonText}>{ageAnswerCopy(lang, MIN_FULL_ACCESS_AGE, true)}</Text>
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
          <Text style={styles.ageButtonText}>{ageAnswerCopy(lang, MIN_FULL_ACCESS_AGE, false)}</Text>
        </Pressable>
      </View>
      <Text style={styles.consentSectionLabel}>{onboardingCopy(lang, { ru: 'ТВОЙ ВЫБОР', uk: 'ТВІЙ ВИБІР', es: 'TU ELECCIÓN', 'pt-BR': 'SUA ESCOLHA', vi: 'LỰA CHỌN CỦA BẠN', id: 'PILIHANMU', tr: 'SEÇİMİN', pl: 'TWÓJ WYBÓR' })}</Text>
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
          <Text style={styles.consentDecisionTitle}>{onboardingCopy(lang, { ru: 'Анонимная аналитика', uk: 'Анонімна аналітика', es: 'Analítica anónima', 'pt-BR': 'Análise anônima', vi: 'Phân tích ẩn danh', id: 'Analitik anonim', tr: 'Anonim analiz', pl: 'Anonimowa analityka' })}</Text>
          <Text style={styles.consentDecisionHint}>{onboardingCopy(lang, { ru: 'Помогает улучшать приложение', uk: 'Допомагає покращувати застосунок', es: 'Ayuda a mejorar la app', 'pt-BR': 'Ajuda a melhorar o app', vi: 'Giúp cải thiện ứng dụng', id: 'Membantu meningkatkan aplikasi', tr: 'Uygulamayı geliştirmeye yardımcı olur', pl: 'Pomaga ulepszać aplikację' })}</Text>
        </View>
        <View style={[styles.consentSwitch, analyticsAllowed && styles.consentSwitchOn]}>
          <View style={[styles.consentSwitchThumb, analyticsAllowed && styles.consentSwitchThumbOn]} />
        </View>
      </Pressable>
      <Pressable
        testID="onboarding-legal-checkbox"
        onPressIn={() => { void hapticTap(); }}
        onPress={() => { setLegalAccepted((value) => !value); setLegalError(null); }}
        style={[styles.consentDecisionRow, legalAccepted && styles.consentDecisionRowSelected]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: legalAccepted }}
      >
        <View style={styles.consentDecisionIcon}>
          <Ionicons name="document-text-outline" size={23} color="#B9C8FF" />
        </View>
        <View style={styles.consentDecisionCopy}>
          <Text style={styles.consentDecisionTitle}>{onboardingCopy(lang, { ru: 'Принимаю правила', uk: 'Приймаю умови', es: 'Acepto las condiciones', 'pt-BR': 'Aceito os termos', vi: 'Tôi đồng ý với điều khoản', id: 'Saya menyetujui ketentuan', tr: 'Koşulları kabul ediyorum', pl: 'Akceptuję warunki' })}</Text>
          <Text style={styles.consentDecisionHint}>{onboardingCopy(lang, { ru: 'Условия и конфиденциальность', uk: 'Умови та конфіденційність', es: 'Condiciones y privacidad', 'pt-BR': 'Termos e privacidade', vi: 'Điều khoản và quyền riêng tư', id: 'Ketentuan dan privasi', tr: 'Koşullar ve gizlilik', pl: 'Warunki i prywatność' })}</Text>
        </View>
        <View style={[styles.consentCheck, legalAccepted && styles.consentCheckSelected]}>
          {legalAccepted ? <Ionicons name="checkmark" size={20} color="#07111F" /> : null}
        </View>
      </Pressable>
      <View style={styles.consentLegalLinks}>
        <Text style={styles.linkText} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>{onboardingCopy(lang, { ru: 'Условия', uk: 'Умови', es: 'Condiciones', 'pt-BR': 'Termos', vi: 'Điều khoản', id: 'Ketentuan', tr: 'Koşullar', pl: 'Warunki' })}</Text>
        <Text style={styles.linkText} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>{onboardingCopy(lang, { ru: 'Конфиденциальность', uk: 'Конфіденційність', es: 'Privacidad', 'pt-BR': 'Privacidade', vi: 'Quyền riêng tư', id: 'Privasi', tr: 'Gizlilik', pl: 'Prywatność' })}</Text>
      </View>
      {legalError ? <Text style={styles.errorText}>{legalError}</Text> : null}
      <Text style={styles.consentNameHint}>{onboardingCopy(lang, { ru: 'Имя создадим автоматически — изменить можно позже', uk: 'Ім’я створимо автоматично — його можна змінити пізніше', es: 'Crearemos un nombre automáticamente; podrás cambiarlo después', 'pt-BR': 'Criaremos um nome automaticamente; você poderá alterá-lo depois', vi: 'Chúng tôi sẽ tạo tên tự động; bạn có thể đổi sau', id: 'Kami akan membuat nama otomatis; kamu bisa mengubahnya nanti', tr: 'Adını otomatik oluşturacağız; sonra değiştirebilirsin', pl: 'Utworzymy nazwę automatycznie — później możesz ją zmienić' })}</Text>
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
    <OnboardingOrderContext.Provider value={enabledOrder}>
    <OnboardingSkipContext.Provider value={skipHandler}>
    <OnboardingLocaleContext.Provider value={lang}>
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
    </OnboardingLocaleContext.Provider>
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

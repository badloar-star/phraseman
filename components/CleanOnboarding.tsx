import { useStableSafeAreaInsets } from '../app/stable_safe_area_metrics';
import { isAccountDeleteIdentityQuarantinedFromKnownState } from '../app/account_delete_quarantine';
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AccessibilityInfo,
  Alert,
  Animated,
  AppState,
  Easing,
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
  findNodeHandle,
  useWindowDimensions,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient as SvgLinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from '@expo/vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LinearGradient } from './SafeLinearGradient';
import { GoogleSignInButton, AppleSignInButton } from './AuthProviderButtons';
import TypewriterText from './onboarding_aha/TypewriterText';
import { hapticTap } from '../hooks/use-haptics';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import { useReduceMotion } from '../hooks/use_reduce_motion';
import { normalizeSafeAreaBottomInset } from '../hooks/use-screen';
import { computeHeightScale, isShortScreen } from '../constants/layout-scale';
import { getDeviceBootstrapLocale, triLang, type Lang } from '../constants/i18n';
import AccountDeletedNotice from './AccountDeletedNotice';
import { consumeAccountDeletedNotice } from '../app/account_deleted_notice';
import { warmAuthSignInCallables } from '../app/cloud_sync';
import { noAndroidOutline, softShadow } from '../constants/androidGlow';
import { LUM, SUITE } from '../constants/motionHybrid';
import { ENABLE_DEV_STUDY_TARGET_LANG, ENABLE_DEV_TOOLS, KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../app/config';
// зачем: онбординг подтверждает только факт «есть ли 16» (self-attestation), года
// рождения не спрашиваем — поэтому импортируем attestation-API, а не запись года.
import { confirmAdultAgeAttestation, MIN_FULL_ACCESS_AGE } from '../app/age_gate';
import { setAnalyticsConsent } from '../app/analytics_consent';
import { recordConsentToCloud } from '../app/age_consent_cloud';
import { trackEvent, type AnalyticsEvent } from '../app/analytics';
import { usePaywallPurchase, type PaywallPlan } from '../app/paywall_purchase';
import { buildSubscriptionDisclosureRu } from '../app/paywall_trial_info';
import { requestNotificationPermissionWithFallback, scheduleDailyReminder } from '../app/notifications';
import {
  readOnboardingNotificationChoice,
  setOnboardingNotificationChoice,
  type OnboardingNotificationChoice,
} from '../app/onboarding_notification_choice';
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
  resolveRuntimeOnboardingSteps,
  resolveOnboardingAdvance,
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
  peekLinkedAuthFromCurrentUser,
  signInWithProvider,
  type AuthProviderId,
} from '../app/auth_provider';

const WELCOME_LOGO_SOURCE = require('../assets/images/flow_clean_202607/logo_cutout.webp');
// Иконка приложения — плитка слева в карточке пуша макета телефона (Bevel, кадры 7/10).
const APP_ICON_SOURCE = require('../assets/images/icon.webp');
// зачем (владелец, 2026-08-17, макет Bevel): плитки источников, картинка
// уведомлений и webp тарифов из макета ушли — карточки источника чистые,
// пуш рисуется макетом телефона, выгоды пейвола — контурные SVG. Семь webp
// долой из бандла.
const ONBOARDING_ASSETS = {
  languageEn: require('../assets/images/language_flags/language_en.webp'),
  languageFr: require('../assets/images/language_flags/language_fr_dev.webp'),
  levelA0: require('../assets/images/flow_clean_202607/level_a0.webp'),
  levelA1: require('../assets/images/flow_clean_202607/level_a1.webp'),
  levelA2: require('../assets/images/flow_clean_202607/level_a2.webp'),
  levelB1: require('../assets/images/flow_clean_202607/level_b1.webp'),
  levelB2: require('../assets/images/flow_clean_202607/level_b2.webp'),
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
  | 'niceToMeet'
  | 'source'
  | 'language'
  | 'level'
  | 'promise'
  | 'improve'
  | 'notifications'
  | 'trialReminder'
  | 'onboardingPaywall'
  | 'name';

// зачем: версия поднята вместе с новым порядком (Bevel-флоу 2026-08-17b: финал
// согласий ДО пейвола) — иначе восстановленный шаг встал бы на устаревшую
// последовательность.
export const CLEAN_ONBOARDING_FLOW_VERSION = 'clean_minimal_wow_flow_2026_08_17b';
// зачем: владелец 2026-08-22 — было 45 с без обратной связи. После ускорения
// входа подсказка «Вход всё ещё выполняется» появляется уже через 8 с.
const ONBOARDING_AUTH_UI_TIMEOUT_MS = 8_000;
const FORCE_ONBOARDING_QA =
  typeof __DEV__ !== 'undefined'
  && __DEV__
  && process.env.EXPO_PUBLIC_FORCE_ONBOARDING_QA === '1';

async function withOnboardingAuthSlowNotice<T>(task: Promise<T>, onSlow: () => void): Promise<T> {
  const timer = setTimeout(() => {
    onSlow();
  }, ONBOARDING_AUTH_UI_TIMEOUT_MS);
  try {
    // The provider operation itself is deliberately awaited. Unlocking the UI at
    // the notice deadline would let a second sign-in overlap the still-live first.
    return await task;
  } finally {
    clearTimeout(timer);
  }
}
const SHOW_ONBOARDING_LANGUAGE_STEP = false;
// Флоу ровно по скриншотам Bevel (владелец, 2026-08-17): welcome → privacy (сейф:
// вход и «данные не передаются») → niceToMeet (приветствие по имени) → promise
// (график на весь экран) → improve → source → блок языка (выключен, пока язык
// один) → уведомления (макет телефона с пушем) → name (согласия и возраст,
// «All set» с конфетти) → честное «предупредим до конца пробного» → пейвол.
//
// зачем «name» стоит ДО цен: так у Bevel; обязательный шаг (MANDATORY_ONBOARDING_STEP)
// собирает согласия, а онбординг ЗАВЕРШАЕТ уже пейвол — любым из трёх выходов
// (крестик, «Продолжить бесплатно», покупка) через completeOnboarding().
//
// зачем letsBuild убран (владелец, 2026-08-17): пустой экран-переход «Теперь
// настроим всё под тебя» никуда не вёл и ничего не давал — просто лишний тап
// между уведомлениями и согласиями. Уведомления ведут на 'name' напрямую.
export const CLEAN_ONBOARDING_ORDER: readonly CleanOnboardingStep[] = [
  'welcome',
  'privacy',
  'niceToMeet',
  'promise',
  'improve',
  'source',
  ...(SHOW_ONBOARDING_LANGUAGE_STEP ? (['language', 'level'] as const) : []),
  'notifications',
  'name',
  'trialReminder',
  'onboardingPaywall',
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

// Макет Bevel (кадр 6): у карточек источника нет ведущей картинки — только текст
// слева и квадратик-чекбокс справа. Поле asset намеренно не задано.
const DISCOVERY_OPTIONS: Option<DiscoverySource>[] = [
  { id: 'tiktok', title: 'TikTok', icon: 'musical-notes-outline' },
  { id: 'store', title: 'App Store / Google Play', icon: 'storefront-outline' },
  { id: 'social', title: 'Instagram / Facebook', icon: 'camera-outline' },
  { id: 'youtube', title: 'YouTube', icon: 'logo-youtube' },
  { id: 'google', title: 'Google Search', icon: 'search-outline' },
  { id: 'friends', title: 'Друзья', icon: 'people-outline' },
  { id: 'other', title: 'Другое', icon: 'ellipsis-horizontal-circle-outline' },
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
  // Блок языка выключен → сохранённый шаг блока едет на его соседа справа.
  if (!SHOW_ONBOARDING_LANGUAGE_STEP && (value === 'language' || value === 'level')) return 'notifications';
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

/** Первое слово displayName провайдера (до 24 символов); пусто → null. Общая
 *  точка для приветствия «Рад познакомиться, {имя}!» и основы автоника «Имя N». */
function firstNameOf(displayName: string | null | undefined): string | null {
  const first = (displayName ?? '').trim().split(/\s+/)[0]?.slice(0, 24) ?? '';
  return first || null;
}

/**
 * Человеческий текст ошибки входа + сырой код в DEV-сборке.
 *
 * зачем 2026-08-17: владелец нажал «Продолжить с Apple» на сейфе и сразу получил
 * «Не получилось войти» без причины. Провайдер логирует настоящий код только в
 * аналитику (auth_signin_error, stage native/firebase) — с экрана его не прочитать.
 * Один разбор на оба экрана входа: людям — понятная фраза, разработчику в DEV —
 * код под ней, чтобы диагноз ставился с одного тапа, а не вслепую.
 */
function describeAuthError(raw: string, lang: Lang): string {
  const code = String(raw || '');
  let human = 'Не получилось войти. Попробуй ещё раз.';
  if (code === 'account_delete_pending' || code.includes('user-disabled')) {
    human = 'Этот аккаунт ещё удаляется. Попробуй войти через пару минут.';
  } else if (code === 'identity_retired') {
    human = triLang(lang, {
      ru: 'Старые данные удалены и не восстановятся. Открывается новый пустой профиль.',
      uk: 'Старі дані видалено й вони не відновляться. Відкривається новий порожній профіль.',
      en: 'The old data was deleted and cannot be restored. A new empty profile is opening.',
      es: 'Los datos anteriores se eliminaron y no se pueden restaurar. Se abre un perfil nuevo y vacío.',
      'pt-BR': 'Os dados antigos foram excluídos e não podem ser restaurados. Um novo perfil vazio será aberto.',
      vi: 'Dữ liệu cũ đã bị xóa và không thể khôi phục. Một hồ sơ mới trống đang được mở.',
      id: 'Data lama telah dihapus dan tidak dapat dipulihkan. Profil kosong baru sedang dibuka.',
      tr: 'Eski veriler silindi ve geri getirilemez. Yeni boş bir profil açılıyor.',
      pl: 'Stare dane zostały usunięte i nie można ich odzyskać. Otwiera się nowy pusty profil.',
    });
  } else if (code.includes('google_signin_timeout')) {
    human = 'Вход занимает слишком много времени. Вернись в приложение и попробуй ещё раз.';
  } else if (code.includes('apple_auth_module_unavailable')) {
    human = 'Вход через Apple не встроен в эту сборку приложения.';
  } else if (code.includes('apple_signin_nonce')) {
    human = 'Не удалось подготовить безопасный вход через Apple. Попробуй ещё раз.';
  } else if (code.includes('apple_signin_no_id_token') || code.includes('apple_oauth_')) {
    human = 'Apple не подтвердил вход. Попробуй ещё раз.';
  } else if (code.includes('network-request-failed') || code.includes('Network')) {
    human = 'Нет связи. Проверь интернет и попробуй ещё раз.';
  } else if (code.includes('operation-not-allowed')) {
    human = 'Этот способ входа сейчас выключен на сервере.';
  } else if (code.includes('invalid-credential') || code.includes('invalid_credential')) {
    human = 'Сервер не принял данные входа. Попробуй ещё раз.';
  }
  return ENABLE_DEV_TOOLS && code ? `${human}\n${code.slice(0, 120)}` : human;
}

// ── Русские даты без Intl (макет телефона и пуш о конце пробного) ────────────
const WEEKDAYS_RU_SHORT = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTHS_RU_SHORT = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
const RU_MONTHS_GENITIVE = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
/** «Вс, 17 авг» — дата на локскрине макета телефона. */
function formatRuLockDate(d: Date): string {
  return `${WEEKDAYS_RU_SHORT[d.getDay()]}, ${d.getDate()} ${MONTHS_RU_SHORT[d.getMonth()]}`;
}
// зачем (владелец): часы на локскрине были захардкожены «9:41» (маркетинговый
// стиль Apple) — макет должен показывать РЕАЛЬНОЕ время устройства, не выдумку.
/** «14:37» — время на локскрине макета телефона, 24-часовой формат. */
function formatRuLockTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
/** «20 августа 2026» — дата в теле пуша «Отмени до …» (Bevel показывает с годом). */
function formatRuDateLong(d: Date): string {
  return `${d.getDate()} ${RU_MONTHS_GENITIVE[d.getMonth()]} ${d.getFullYear()}`;
}
/** «3 дня», «7 дней», «1 день» — для CTA «Попробовать N … бесплатно». */
function pluralDays(n: number): string {
  if (n % 10 === 1 && n % 100 !== 11) return 'день';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'дня';
  return 'дней';
}
// Пейвол по макету Bevel (владелец, 2026-08-17): список выгод «плитка-иконка +
// заголовок + подпись» вместо таблицы FREE/PLUS. Набор — из боевой выкладки
// (paywall_copy.ts → CONTEXT_BENEFITS) БЕЗ «Персонального плана»: планы удалены.
// Слово «ИИ» не используем — «разговорная практика» вместо «диалоги с ИИ».
type BenefitGlyphId = 'bolt' | 'mic' | 'chat' | 'lens' | 'target' | 'chart';
const PAYWALL_BENEFITS: { id: BenefitGlyphId; title: string; caption: string }[] = [
  { id: 'bolt', title: 'Безлимит энергии', caption: 'Занимайся сколько хочешь, без ожидания' },
  { id: 'mic', title: 'Практика произношения', caption: 'Говори вслух и сразу слышь, что поправить' },
  { id: 'chat', title: 'Разговорная практика', caption: 'Живые диалоги на реальные темы' },
  { id: 'lens', title: 'Разбор ошибок', caption: 'Понятно, почему так, а не иначе' },
  { id: 'target', title: 'Тренер слабых мест', caption: 'Возвращает именно то, что ускользает' },
  { id: 'chart', title: 'Аналитика 365 дней', caption: 'Весь год прогресса на одном экране' },
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
  closeLabel = 'Закрыть',
  headerRight,
}: {
  step: CleanOnboardingStep;
  onBack?: () => void;
  /** Крестик СЛЕВА вместо шеврона (пейвол): закрыть = уйти на бесплатный путь. */
  onClose?: () => void;
  /** Подпись крестика для скринридера — на пейволе это «Продолжить бесплатно». */
  closeLabel?: string;
  /** Слот справа в топбаре (меню «···» на пейволе). */
  headerRight?: React.ReactNode;
}) {
  const enabledOrder = React.useContext(OnboardingOrderContext);
  const { progress, total } = getOnboardingProgress(enabledOrder, step);

  // Макет: шапка — топбар 52pt с круглой белой кнопкой слева и слотом справа.
  // Полоски прогресса в утверждённом макете нет; номер шага остаётся только в
  // accessibilityLabel кнопки, чтобы скринридер не потерял позицию во флоу.
  // зачем: сейф (privacy) не считается шагом прогресса (progress=0), но кнопка
  // «‹» и топбар 52pt на нём есть по макету — прячем шапку только там, где ей
  // нечего показать (нет ни ручки слева, ни слота справа).
  const leftHandler = onClose ?? onBack;
  if (!progress && !leftHandler && !headerRight) return null;
  const backLabel = progress ? `Назад. Шаг ${progress} из ${total}` : 'Назад';
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
        accessibilityLabel={onClose ? closeLabel : backLabel}
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
  onLayout,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: StyleProp<ViewStyle>;
  /** Нужен ScreenFrame: измеряет текст и футер, чтобы ужать макет телефона. */
  onLayout?: (e: LayoutChangeEvent) => void;
}) {
  const reduceMotion = useReduceMotion();
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      anim.setValue(1);
      return;
    }
    const a = Animated.timing(anim, { toValue: 1, duration: LUM.contentMs, delay, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [anim, delay, reduceMotion]);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  return (
    <Animated.View style={[style, { opacity: anim, transform: [{ translateY }] }]} onLayout={onLayout}>
      {children}
    </Animated.View>
  );
}

/** Смена шагов по LUM-токенам; при Reduced Motion — мгновенно. */
function useStepSlide(step: CleanOnboardingStep): {
  displayStep: CleanOnboardingStep;
  slideStyle: Animated.WithAnimatedObject<ViewStyle>;
} {
  const reduceMotion = useReduceMotion();
  const [displayStep, setDisplayStep] = useState<CleanOnboardingStep>(step);
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  // зачем: welcome рисуется bare (без слайд-обёртки) — гасить ему нечего, а
  // out-фаза раньше гналась вхолостую: мёртвый экран после «Начать» и мигание
  // welcome при резюме на другом шаге. С welcome переключаемся синхронно: и в
  // рендере (shownStep), и в state — без единого кадра старого шага.
  const instant = displayStep === 'welcome';
  const shownStep = instant ? step : displayStep;
  // Стартовые значения входа ставим ДО коммита: слайд-обёртка монтируется уже
  // с opacity 0 (welcome её не гасил — иначе кадр-вспышка нового шага на 1).
  if (instant && step !== displayStep) {
    opacity.setValue(0);
    translateX.setValue(20);
  }

  useEffect(() => {
    if (step === displayStep) return;
    if (reduceMotion) {
      opacity.setValue(1);
      translateX.setValue(0);
      setDisplayStep(step);
      return;
    }
    if (instant) { setDisplayStep(step); return; }
    const out = Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: LUM.exitMs, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: -20, duration: LUM.exitMs, useNativeDriver: true }),
    ]);
    out.start(({ finished }) => {
      if (finished) setDisplayStep(step);
    });
    return () => out.stop();
  }, [displayStep, instant, opacity, reduceMotion, step, translateX]);

  useEffect(() => {
    if (reduceMotion) {
      opacity.setValue(1);
      translateX.setValue(0);
      return;
    }
    opacity.setValue(0);
    translateX.setValue(20);
    const enter = Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: LUM.contentMs, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: LUM.contentMs, useNativeDriver: true }),
    ]);
    enter.start();
    return () => enter.stop();
  }, [shownStep, opacity, reduceMotion, translateX]);

  const slideStyle = useMemo(
    () => ({ opacity, transform: [{ translateX }] }),
    [opacity, translateX],
  );
  return { displayStep: shownStep, slideStyle };
}

/** Тиснёный тон-в-тон знак welcome (Bevel, кадр 1): три слоя одной альфа-вырезки
 *  logo_cutout.webp — тень, блик и тело, окрашенные tintColor. Ни плитки, ни
 *  ореола; размер фиксирован — первый кадр = финальная геометрия. */
function EmbossedMark({ size = 168 }: { size?: number }) {
  const layer = { position: 'absolute' as const, top: 0, left: 0, width: size, height: size };
  return (
    <View style={{ width: size, height: size, alignSelf: 'center' }} accessible={false}>
      <Image source={WELCOME_LOGO_SOURCE} resizeMode="contain" accessible={false} style={[layer, styles.embossShadow]} />
      <Image source={WELCOME_LOGO_SOURCE} resizeMode="contain" accessible={false} style={[layer, styles.embossHighlight]} />
      <Image source={WELCOME_LOGO_SOURCE} resizeMode="contain" accessible={false} style={[layer, styles.embossBody]} />
    </View>
  );
}

/** Статичный индикатор страниц welcome (Bevel: 5 точек, активная тёмная). */
function PagerDots({ total, active }: { total: number; active: number }) {
  return (
    <View style={styles.pagerDots} pointerEvents="none" accessible={false}>
      {Array.from({ length: total }, (_, index) => (
        <View key={index} style={[styles.pagerDot, index === active && styles.pagerDotActive]} />
      ))}
    </View>
  );
}

/** Логотип welcome: спокойное scale-in без отскока + мягкое «дыхание».
 *  Дыхание — конечный ping-pong через рекурсию с гейтом фокуса/AppState
 *  (Performance Bible: бесконечные лупы под гейтом). */
function WelcomeLogo() {
  const isFocused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    const a = Animated.spring(enter, { toValue: 1, ...LUM.settle, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [enter, reduceMotion]);

  useEffect(() => {
    if (!isFocused || reduceMotion) { breathe.stopAnimation(); breathe.setValue(0); return; }
    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(breathe, { toValue: 1, duration: SUITE.idleFloatMs, useNativeDriver: true }),
          Animated.timing(breathe, { toValue: 0, duration: SUITE.idleFloatMs, useNativeDriver: true }),
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
  }, [breathe, isFocused, reduceMotion]);

  // Android New Architecture can remove one native interpolation node while
  // Animated.add still references it during the welcome -> privacy unmount.
  // Keep the entrance and ambient scale on separate view nodes: visually this
  // is the same combined scale, but cleanup cannot leave a dangling Add node.
  const enterScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });

  return (
    <Animated.View style={[styles.logoImageLarge, styles.logoEnterLayer, { opacity: enter, transform: [{ scale: enterScale }] }]}>
      <Animated.View style={[styles.logoBreatheLayer, { transform: [{ scale: breatheScale }] }]}>
        {/* Bevel, кадр 1: тиснёный знак тон-в-тон с градиентом фона — без плитки
            и ореола. Смысл несёт заголовок. */}
        <EmbossedMark size={168} />
      </Animated.View>
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
          // зачем: TypewriterText родом из тёмной АХ-сцены и по умолчанию печатает
          // почти белым — в белом пузыре светлого макета текст был невидим.
          // Цвет берём тот же, что у обычной реплики рядом (styles.speechText).
          <TypewriterText key={children} text={children} charMs={12} skipOnPress color="#0C111B" />
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
      style={({ pressed }) => [styles.primaryButtonOuter, (pressed || loading) && styles.pressed, loading && styles.disabled]}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
    >
      {/* Макет Bevel: сплошная чёрная таблетка; disabled — сплошная серая
          (#B8BCC5) с белым текстом, без полупрозрачности. */}
      <LinearGradient
        colors={disabled ? ['#B8BCC5', '#B8BCC5'] : ['#17191F', '#17191F']}
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
  const reduceMotion = useReduceMotion();
  // Галочка «ставится» пружиной при выборе (native driver); фон карточки не
  // меняется — состояние показывает только чекбокс (макет Bevel, кадр 6).
  const check = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    if (!selected) { check.setValue(0); return; }
    if (reduceMotion) { check.setValue(1); return; }
    check.setValue(0.5);
    const a = Animated.spring(check, { toValue: 1, ...SUITE.pulse, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [check, reduceMotion, selected]);
  return (
    <Pressable
      testID={testID}
      onPressIn={() => { void hapticTap(); }}
      onPress={onPress}
      style={({ pressed }) => [styles.optionCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
    >
      {/* Ведущий слот — только если у варианта есть картинка (уровни); у
          источников его нет. */}
      {option.asset ? (
        <Image source={option.asset} style={styles.optionAsset} resizeMode="contain" accessible={false} />
      ) : null}
      <View style={styles.optionCopy}>
        <Text style={styles.optionTitle} numberOfLines={2}>{option.title}</Text>
      </View>
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? (
          <Animated.View style={{ transform: [{ scale: check }] }}>
            <Ionicons name="checkmark" size={12} color="#FFFFFF" />
          </Animated.View>
        ) : null}
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

/** Экран оплаты исключён намеренно (см. выше). privacy и notifications — тоже:
 *  у них уже есть своя серая ссылка («Позже» / «Не сейчас»), вторая серая
 *  строка подряд читалась бы как дубль. trialReminder — потому что
 *  «Пропустить» ведёт на «name», а trialReminder идёт ПОСЛЕ name —
 *  это был бы шаг НАЗАД под видом пропуска. */
const SKIP_HIDDEN_STEPS: readonly CleanOnboardingStep[] = ['onboardingPaywall', 'name', 'privacy', 'notifications', 'trialReminder'];

function OnboardingSkipLink({ step }: { step: CleanOnboardingStep }) {
  const skip = React.useContext(OnboardingSkipContext);
  // зачем (инцидент владельца 2026-08-29): при застрявшем удалении кнопка
  // «Пропустить» уводила мимо входа ПРЯМО в старые локальные данные
  // недоудалённого аккаунта. Пока замок удаления известен как активный —
  // скипа нет вовсе: человек обязан пройти вход, где замок обработают.
  if (isAccountDeleteIdentityQuarantinedFromKnownState()) return null;
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
  closeLabel,
  headerRight,
  center,
  plainTitle,
  titleSize = 'lg',
  titleStyle,
  subtitle,
  phoneBackdrop,
}: {
  step: CleanOnboardingStep;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onBack?: () => void;
  onClose?: () => void;
  closeLabel?: string;
  headerRight?: React.ReactNode;
  center?: boolean;
  plainTitle?: boolean;
  /** 'lg' — 27pt (promise, trialReminder, paywall); 'md' — 22pt (privacy). */
  titleSize?: 'lg' | 'md';
  /** Поверх plainTitle — экрану source нужен вопрос 17pt слева. */
  titleStyle?: StyleProp<TextStyle>;
  /** Серый подзаголовок под заголовком, в том же FadeUp. */
  subtitle?: string;
  /**
   * Макет телефона (notifications/trialReminder) — рисуется АБСОЛЮТНЫМ фоновым
   * слоем экрана, а не ребёнком скролла. Только так низ корпуса может физически
   * уйти ПОД footer (кнопку) и обрезаться нижним краем экрана, как на референсе
   * Bevel: «полноразмерное» устройство крупным планом, а не миниатюра в отступах
   * со всех сторон. Заголовок/подзаголовок/футер рисуются ПОСЛЕ (выше по zIndex)
   * и остаются читаемыми поверх телефона.
   */
  phoneBackdrop?: React.ReactNode;
}) {
  const insets = useStableSafeAreaInsets();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const { height: windowHeight } = useWindowDimensions();
  // Низкий экран (iPhone SE/8 и ниже) — ужимаем вертикальный ритм текста.
  const shortScreen = isShortScreen(windowHeight);

  // зачем (владелец, 2026-08-23): телефон-макет — абсолютный фоновый слой, он
  // НЕ знает про текст рядом и потому налезал на него на низких экранах.
  // Считаем, сколько места реально остаётся, и отдаём это число вниз. Первая
  // оценка синхронная (консервативная, до onLayout) — первый кадр сразу
  // близок к финальному, без «сначала большой, потом прыжок».
  const [textBlockHeight, setTextBlockHeight] = useState<number | null>(null);
  const [childrenHeight, setChildrenHeight] = useState<number | null>(null);
  const [footerHeight, setFooterHeight] = useState<number | null>(null);
  // зачем (владелец, 2026-08-26 — скриншот): считаем не только СКОЛЬКО места
  // осталось, но и ГДЕ оно начинается. Прошлые фиксы (23-25.08) только ужимали
  // корпус, а слой при этом оставался прижат к bottom:0 — ужатый телефон просто
  // уезжал ещё ниже, и между текстом и корпусом зияла дыра в ~140pt. Отдаём
  // слою верхнюю границу полосы, и корпус встаёт в её середину.
  const phoneBand = useMemo(() => {
    if (!phoneBackdrop) return null;
    const header = 52 + insets.top;
    // Текст живёт в двух местах: проп title/subtitle И children (trialReminder
    // кладёт свой абзац именно туда) — считаем оба, иначе половина текста
    // остаётся невидимой для расчёта и телефон снова налезает.
    const text = (textBlockHeight ?? (title ? 96 : 48)) + (childrenHeight ?? 0);
    const foot = footerHeight ?? (footer ? 132 : 0);
    // 12pt воздуха между текстом и корпусом — иначе они целуются впритык.
    const top = header + text + 12;
    return { top, height: Math.max(240, windowHeight - top - foot) };
  }, [phoneBackdrop, insets.top, textBlockHeight, childrenHeight, footerHeight, title, footer, windowHeight]);
  const phoneAvailableHeight = phoneBand?.height;

  const phoneLayer = phoneBackdrop
    ? React.isValidElement(phoneBackdrop)
      // Прокидываем измеренную высоту, не меняя вызовы на местах.
      ? React.cloneElement(phoneBackdrop as React.ReactElement<{ availableHeight?: number }>, { availableHeight: phoneAvailableHeight })
      : phoneBackdrop
    : null;

  return (
    // зачем: только 'top' — низ уже учтён вручную (footer.paddingBottom =
    // max(30, bottomInset), а без футера — paddingBottom скролла), и с
    // edges bottom нижний inset складывался дважды.
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      {phoneLayer ? (
        <View
          pointerEvents="none"
          style={[styles.phoneBackdropLayer, phoneBand ? { top: phoneBand.top } : null]}
        >
          {/* зачем (владелец, 2026-08-17): корпус телефона НЕ режется — целиком
              на месте. Иллюзию «тонет в фоне» даёт только градиент поверх
              нижней трети корпуса, как на референсе Bevel.
              зачем 2026-08-26: маска висела на нижнем крае СЛОЯ. После того как
              корпус встал по центру полосы, нижний край слоя — уже пустой фон,
              и градиент растворял воздух вместо телефона. Оборачиваем телефон
              и маску вместе, чтобы маска всегда сидела на самом корпусе. */}
          <View style={styles.phoneFadeAnchor}>
            {phoneLayer}
            <LinearGradient
              colors={['rgba(245,246,250,0)', 'rgba(245,246,250,0.85)', '#F5F6FA']}
              locations={[0, 0.55, 1]}
              style={styles.phoneFadeMask}
            />
          </View>
        </View>
      ) : null}
      <ProgressHeader step={step} onBack={onBack} onClose={onClose} closeLabel={closeLabel} headerRight={headerRight} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView decelerationRate="fast"
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
            <FadeUp onLayout={phoneBackdrop ? (e) => setTextBlockHeight(e.nativeEvent.layout.height) : undefined}>
              {plainTitle ? (
                <Text style={[styles.plainTitle, titleSize === 'md' && styles.plainTitleMd, shortScreen && styles.plainTitleShort, titleStyle]}>{title}</Text>
              ) : (
                <CompassBubble compact>{title}</CompassBubble>
              )}
              {subtitle ? <Text style={[styles.screenSubtitle, shortScreen && styles.screenSubtitleShort]}>{subtitle}</Text> : null}
            </FadeUp>
          ) : null}
          {/* зачем: при center контент обязан стоять по вертикальному центру
              оставшегося места (niceToMeet/improve) — flexGrow сам по себе
              лишь растягивал обёртку и выкладывал детей от верха. phoneBackdrop
              рисуется отдельным слоем — children здесь используется только
              когда телефона на экране нет.
              зачем 2026-08-25 (баг «телефон наезжает на текст», notifications/
              trialReminder): с phoneBackdrop эта обёртка ОБЯЗАНА мерить высоту
              именно текста, а flexGrow:1 растягивал её на всё свободное место
              скролла — onLayout возвращал высоту контейнера, а не контента, и
              phoneAvailableHeight считался по завышенному childrenHeight. Без
              phoneBackdrop растяжка нужна как раньше (центрирование/раскладка
              footer'а), поэтому убираем flexGrow только когда есть телефон. */}
          <FadeUp
            delay={90}
            style={[!phoneBackdrop && styles.frameChildren, center && styles.frameChildrenCenter]}
            onLayout={phoneBackdrop ? (e) => setChildrenHeight(e.nativeEvent.layout.height) : undefined}
          >
            {children}
          </FadeUp>
        </ScrollView>
        {footer ? (
          <FadeUp
            delay={150}
            style={[styles.footer, { paddingBottom: Math.max(30, bottomInset) }]}
            onLayout={phoneBackdrop ? (e) => setFooterHeight(e.nativeEvent.layout.height) : undefined}
          >
            {footer}
            <OnboardingSkipLink step={step} />
          </FadeUp>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Эмодзи-приветствие niceToMeet (Bevel, кадр 3): один «взмах» на маунт —
// конечная последовательность на native driver, без лупов.
function WaveEmoji({ emoji = '👋' }: { emoji?: string }) {
  const reduceMotion = useReduceMotion();
  const wave = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      wave.setValue(0);
      return;
    }
    const a = Animated.sequence([
      Animated.delay(LUM.backdropMs),
      Animated.timing(wave, { toValue: 1, duration: LUM.heroFadeMs, useNativeDriver: true }),
      Animated.timing(wave, { toValue: -1, duration: LUM.heroFadeMs, useNativeDriver: true }),
      Animated.timing(wave, { toValue: 0.6, duration: LUM.heroFadeMs, useNativeDriver: true }),
      Animated.spring(wave, { toValue: 0, ...SUITE.pulse, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [reduceMotion, wave]);
  const rotate = wave.interpolate({ inputRange: [-1, 0, 1], outputRange: ['-14deg', '0deg', '16deg'] });
  return (
    <Animated.Text style={[styles.niceEmoji, { transform: [{ rotate }] }]} accessible={false}>
      {emoji}
    </Animated.Text>
  );
}

// Иллюстрация improve-экрана (Bevel, кадр 5): белое сердце с мягкой объёмной
// тенью в центре, вокруг — плитки с эмодзи на пунктирных связях и «пузырьки».
// Линии и пузырьки — один статичный Svg (на Android dashed-border рисуется
// сплошным, поэтому не View). Появление — каскад pop, native driver, конечное;
// «сердцебиение» — под гейтом фокуса и AppState.
const IMPROVE_HEART_PATH = 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z';
const IMPROVE_BUBBLES: readonly { cx: number; cy: number; r: number }[] = [
  { cx: 62, cy: 60, r: 6 },
  { cx: 206, cy: 54, r: 4 },
  { cx: 232, cy: 120, r: 5 },
  { cx: 28, cy: 118, r: 3.5 },
  { cx: 150, cy: 214, r: 4.5 },
];
function ImproveConstellation() {
  const isFocused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();
  const anims = useRef([0, 1, 2, 3, 4].map(() => new Animated.Value(0))).current;
  const beat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const [lines, heart, top, left, right] = anims;
    if (reduceMotion) {
      [lines, heart, top, left, right].forEach((value) => value.setValue(1));
      return;
    }
    const a = Animated.parallel([
      Animated.sequence([Animated.delay(LUM.ladder[2]), Animated.timing(lines, { toValue: 1, duration: LUM.contentMs, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(LUM.ladder[1]), Animated.spring(heart, { toValue: 1, ...SUITE.hero, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(LUM.ladder[3]), Animated.spring(top, { toValue: 1, ...SUITE.row, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(LUM.ladder[4]), Animated.spring(left, { toValue: 1, ...SUITE.row, useNativeDriver: true })]),
      Animated.sequence([Animated.delay(LUM.ladder[5]), Animated.spring(right, { toValue: 1, ...SUITE.row, useNativeDriver: true })]),
    ]);
    a.start();
    return () => a.stop();
  }, [anims, reduceMotion]);
  // Сердцебиение: конечный цикл под гейтом фокуса/AppState (Performance Bible).
  useEffect(() => {
    if (!isFocused || reduceMotion) { beat.stopAnimation(); beat.setValue(0); return; }
    let loop: Animated.CompositeAnimation | null = null;
    const start = () => {
      if (loop) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.delay(SUITE.idleFloatMs),
          Animated.timing(beat, { toValue: 1, duration: LUM.backdropMs, useNativeDriver: true }),
          Animated.timing(beat, { toValue: 0, duration: LUM.contentMs, useNativeDriver: true }),
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
  }, [beat, isFocused, reduceMotion]);
  const pop = (index: number) => ({
    opacity: anims[index],
    transform: [{ scale: anims[index].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }],
  });
  const heartEnterScale = anims[1].interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const heartBeatScale = beat.interpolate({ inputRange: [0, 1], outputRange: [1, 1.05] });
  return (
    <View style={styles.improveArt}>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { opacity: anims[0] }]}>
        <Svg width={260} height={230} viewBox="0 0 260 230">
          <Line x1={130} y1={118} x2={130} y2={28} stroke="#C9CDD7" strokeWidth={1.5} strokeDasharray="4 5" strokeLinecap="round" />
          <Line x1={130} y1={118} x2={42} y2={180} stroke="#C9CDD7" strokeWidth={1.5} strokeDasharray="4 5" strokeLinecap="round" />
          <Line x1={130} y1={118} x2={218} y2={190} stroke="#C9CDD7" strokeWidth={1.5} strokeDasharray="4 5" strokeLinecap="round" />
          {IMPROVE_BUBBLES.map((b) => (
            <React.Fragment key={`${b.cx}-${b.cy}`}>
              <Circle cx={b.cx} cy={b.cy + 1.5} r={b.r} fill="rgba(12,17,27,0.07)" />
              <Circle cx={b.cx} cy={b.cy} r={b.r} fill="#FFFFFF" />
            </React.Fragment>
          ))}
        </Svg>
      </Animated.View>
      <Animated.View style={[styles.improveHeart, { opacity: anims[1], transform: [{ scale: heartEnterScale }] }]}>
        <Animated.View style={[styles.improveHeartBeatLayer, { transform: [{ scale: heartBeatScale }] }]}>
          <Svg width={96} height={96} viewBox="0 0 24 24">
          <Defs>
            <SvgLinearGradient id="improveHeartFill" x1="0" y1="0" x2="0.4" y2="1">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#F1F3F7" />
            </SvgLinearGradient>
          </Defs>
          <Path d={IMPROVE_HEART_PATH} fill="rgba(12,17,27,0.05)" transform="translate(0 1.4) scale(1.03)" />
          <Path d={IMPROVE_HEART_PATH} fill="rgba(12,17,27,0.07)" transform="translate(0 0.7)" />
          <Path d={IMPROVE_HEART_PATH} fill="url(#improveHeartFill)" />
          </Svg>
        </Animated.View>
      </Animated.View>
      <Animated.View style={[styles.improveSatellite, styles.improveSatelliteTop, pop(2)]}>
        <Text style={styles.improveSatelliteEmoji} accessible={false}>👍</Text>
      </Animated.View>
      <Animated.View style={[styles.improveSatellite, styles.improveSatelliteLeft, pop(3)]}>
        <Text style={styles.improveSatelliteEmoji} accessible={false}>⭐</Text>
      </Animated.View>
      <Animated.View style={[styles.improveSatellite, styles.improveSatelliteRight, pop(4)]}>
        <Text style={styles.improveSatelliteEmoji} accessible={false}>👥</Text>
      </Animated.View>
    </View>
  );
}

// Сейф privacy-экрана (Bevel, кадр 2), объёмная версия по замечанию владельца
// «а то бедняцкий»: корпус 250×250 с мягкой глубокой тенью, четыре кромки-фаски
// (inset-объём через LinearGradient), дверца с зазором и своими фасками, две
// металлические петли, оранжевый указатель, наборный диск в углублении с 12
// рисками. Ни одной обводки контейнера. Дыхание корпуса — под гейтом фокуса;
// диск докручивается и «щёлкает» назад; указатель проявляется, когда диск сел.
const VAULT_TICKS = Array.from({ length: 12 }, (_, index) => index * 30);
function PrivacyVault() {
  const isFocused = useIsScreenFocused();
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(0)).current;
  const breathe = useRef(new Animated.Value(0)).current;
  const dial = useRef(new Animated.Value(0)).current;
  const pointer = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      return;
    }
    const a = Animated.spring(enter, { toValue: 1, ...LUM.settle, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [enter, reduceMotion]);
  // Диск докручивается и указатель проявляется ОДИН раз на маунт — конечные
  // анимации, им гейт фокуса не нужен (а перезапуск при смене фокуса заново
  // «крутил» уже севший диск).
  useEffect(() => {
    if (reduceMotion) {
      dial.setValue(0.93);
      pointer.setValue(1);
      return;
    }
    const spin = Animated.sequence([
      Animated.delay(LUM.ladder[3]),
      Animated.timing(dial, { toValue: 1, duration: SUITE.idleFloatMs, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(dial, { toValue: 0.93, ...SUITE.anchor, useNativeDriver: true }),
    ]);
    const point = Animated.sequence([
      Animated.delay(SUITE.idleFloatMs),
      Animated.timing(pointer, { toValue: 1, duration: LUM.backdropMs, useNativeDriver: true }),
    ]);
    spin.start();
    point.start();
    return () => { spin.stop(); point.stop(); };
  }, [dial, pointer, reduceMotion]);
  // Дыхание корпуса — бесконечный цикл, поэтому только под гейтом фокуса.
  useEffect(() => {
    if (!isFocused || reduceMotion) { breathe.stopAnimation(); breathe.setValue(0); return; }
    let alive = true;
    const loop = (toValue: number) => {
      if (!alive) return;
      Animated.timing(breathe, { toValue, duration: SUITE.idleFloatMs, easing: Easing.inOut(Easing.sin), useNativeDriver: true })
        .start(({ finished }) => { if (finished) loop(toValue === 1 ? 0 : 1); });
    };
    loop(1);
    return () => { alive = false; breathe.stopAnimation(); };
  }, [breathe, isFocused, reduceMotion]);
  const enterScale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] });
  const breatheScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });
  const rotate = dial.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '160deg'] });
  const pointerY = pointer.interpolate({ inputRange: [0, 1], outputRange: [-4, 0] });
  return (
    <View style={styles.vaultWrap}>
      <Animated.View style={[styles.vaultShadowHost, { opacity: enter, transform: [{ scale: enterScale }] }]}>
        <Animated.View style={[styles.vaultBreatheLayer, { transform: [{ scale: breatheScale }] }]}>
          <LinearGradient colors={['#FFFFFF', '#F3F5F8', '#E4E8EE']} locations={[0, 0.55, 1]} start={{ x: 0.15, y: 0 }} end={{ x: 0.85, y: 1 }} style={styles.vaultBody}>
          {/* Кромки корпуса — светлая верхняя/левая, тёмная нижняя/правая фаски. */}
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0)']} style={styles.vaultLipTop} />
          <LinearGradient pointerEvents="none" colors={['rgba(96,108,130,0)', 'rgba(96,108,130,0.16)']} style={styles.vaultLipBottom} />
          <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,0.7)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={styles.vaultLipLeft} />
          <LinearGradient pointerEvents="none" colors={['rgba(96,108,130,0.12)', 'rgba(96,108,130,0)']} start={{ x: 1, y: 0.5 }} end={{ x: 0, y: 0.5 }} style={styles.vaultLipRight} />
          {/* Петли в зазоре справа. */}
          <LinearGradient colors={['#CDD3DE', '#F6F8FB', '#C7CDD8']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.vaultHinge, styles.vaultHingeTop]} />
          <LinearGradient colors={['#CDD3DE', '#F6F8FB', '#C7CDD8']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={[styles.vaultHinge, styles.vaultHingeBottom]} />
          {/* Дверца. */}
          <View style={styles.vaultDoor}>
            <LinearGradient colors={['#FFFFFF', '#F1F3F7']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.vaultDoorFace}>
              <LinearGradient pointerEvents="none" colors={['rgba(255,255,255,1)', 'rgba(255,255,255,0)']} style={styles.vaultDoorLipTop} />
              <LinearGradient pointerEvents="none" colors={['rgba(96,108,130,0)', 'rgba(96,108,130,0.10)']} style={styles.vaultDoorLipBottom} />
              {/* Оранжевый указатель — треугольник из border'ов (единственный способ
                  нарисовать стрелку View'ом; это не обводка контейнера). */}
              <Animated.View style={[styles.vaultPointer, { opacity: pointer, transform: [{ translateY: pointerY }] }]} />
              {/* Наборный диск: белый обод → безель → углубление с рисками → диск. */}
              <View style={styles.vaultRingRim}>
                <LinearGradient colors={['#F7F9FC', '#DADFE8']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.vaultRingBezel}>
                  <LinearGradient colors={['#D9DEE7', '#EEF1F6']} start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }} style={styles.vaultRingRecess}>
                    {VAULT_TICKS.map((deg) => (
                      <View key={deg} style={[styles.vaultTickHolder, { transform: [{ rotate: `${deg}deg` }] }]}>
                        <View style={[styles.vaultTick, deg % 90 === 0 && styles.vaultTickMajor]} />
                      </View>
                    ))}
                    <Animated.View style={{ transform: [{ rotate }] }}>
                      <LinearGradient colors={['#FFFFFF', '#E9EDF3']} start={{ x: 0.3, y: 0 }} end={{ x: 0.7, y: 1 }} style={styles.vaultDial}>
                        <View style={styles.vaultDialMark} />
                        <LinearGradient colors={['#FFFFFF', '#CDD3DD']} style={styles.vaultDialHub} />
                      </LinearGradient>
                    </Animated.View>
                  </LinearGradient>
                </LinearGradient>
              </View>
            </LinearGradient>
          </View>
          </LinearGradient>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ── График promise на весь экран (Bevel, кадр 4) ──────────────────────────────
// SVG-пути статичны (native driver с Path не дружит), «рисование» делает шторка
// цвета фона, уезжающая вправо на native driver. Размер следует за живым окном,
// поэтому поворот и split-screen пересчитывают SVG без перезапуска приложения.
type Pt = { x: number; y: number };
function cubicAt(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const mt = 1 - t;
  const a = mt * mt * mt;
  const b = 3 * mt * mt * t;
  const c = 3 * mt * t * t;
  const d = t * t * t;
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y };
}
function cubicTangent(p0: Pt, c1: Pt, c2: Pt, p3: Pt, t: number): Pt {
  const mt = 1 - t;
  const x = 3 * mt * mt * (c1.x - p0.x) + 6 * mt * t * (c2.x - c1.x) + 3 * t * t * (p3.x - c2.x);
  const y = 3 * mt * mt * (c1.y - p0.y) + 6 * mt * t * (c2.y - c1.y) + 3 * t * t * (p3.y - c2.y);
  const mag = Math.hypot(x, y) || 1;
  return { x: x / mag, y: y / mag };
}
const f1 = (n: number) => Math.round(n * 10) / 10;
/** Треугольный наконечник: вершина в tip, ориентирован по единичному вектору dir. */
function arrowHeadPath(tip: Pt, dir: Pt, len: number, width: number): string {
  const bx = tip.x - dir.x * len;
  const by = tip.y - dir.y * len;
  const nx = -dir.y * (width / 2);
  const ny = dir.x * (width / 2);
  return `M${f1(tip.x)} ${f1(tip.y)} L${f1(bx + nx)} ${f1(by + ny)} L${f1(bx - nx)} ${f1(by - ny)} Z`;
}
/** Шеврон «‹» на кривой: две ножки назад от точки под ±40° к касательной. */
function chevronPath(pt: Pt, dir: Pt, size: number): string {
  const rad = (40 * Math.PI) / 180;
  const back = { x: -dir.x, y: -dir.y };
  const leg = (sign: number) => ({
    x: pt.x + (back.x * Math.cos(rad) - back.y * Math.sin(rad) * sign) * size,
    y: pt.y + (back.x * Math.sin(rad) * sign + back.y * Math.cos(rad)) * size,
  });
  const a = leg(1);
  const b = leg(-1);
  return `M${f1(a.x)} ${f1(a.y)} L${f1(pt.x)} ${f1(pt.y)} L${f1(b.x)} ${f1(b.y)}`;
}
const PROMISE_CHART_MIN_HEIGHT = 280;
function PromiseChart() {
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const size = useMemo(() => ({
    w: Math.max(200, Math.round(width - 40)),
    h: Math.min(440, Math.max(PROMISE_CHART_MIN_HEIGHT, Math.round(height * 0.42))),
  }), [height, width]);
  const reveal = useRef(new Animated.Value(0)).current;
  const badgeUp = useRef(new Animated.Value(0)).current;
  const badgeDown = useRef(new Animated.Value(0)).current;
  const axes = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      reveal.setValue(1);
      badgeUp.setValue(1);
      badgeDown.setValue(1);
      axes.setValue(1);
      return;
    }
    const a = Animated.sequence([
      Animated.delay(LUM.backdropMs),
      Animated.timing(reveal, { toValue: 1, duration: SUITE.idleFloatMs, easing: Easing.inOut(Easing.cubic), useNativeDriver: true }),
    ]);
    const up = Animated.sequence([
      Animated.delay(LUM.bloomDriftMs),
      Animated.spring(badgeUp, { toValue: 1, ...SUITE.pulse, useNativeDriver: true }),
    ]);
    const down = Animated.sequence([
      Animated.delay(LUM.rimMs),
      Animated.spring(badgeDown, { toValue: 1, ...SUITE.pulse, useNativeDriver: true }),
    ]);
    const ax = Animated.timing(axes, { toValue: 1, duration: LUM.contentMs, delay: LUM.ladder[3], useNativeDriver: true });
    a.start(); up.start(); down.start(); ax.start();
    return () => { a.stop(); up.stop(); down.stop(); ax.stop(); };
  }, [axes, badgeDown, badgeUp, reduceMotion, reveal]);

  const geom = useMemo(() => {
    const { w, h } = size;
    const H = h - 30;
    const P0 = { x: 0.04 * w, y: 0.86 * H };
    const C1 = { x: 0.46 * w, y: 0.84 * H };
    const C2 = { x: 0.72 * w, y: 0.52 * H };
    const P3 = { x: 0.90 * w, y: 0.12 * H };
    const Q0 = { x: 0.04 * w, y: 0.58 * H };
    const D1 = { x: 0.32 * w, y: 0.64 * H };
    const D2 = { x: 0.58 * w, y: 0.86 * H };
    const Q3 = { x: 0.90 * w, y: 0.90 * H };
    const upTan = cubicTangent(P0, C1, C2, P3, 1);
    const downTan = cubicTangent(Q0, D1, D2, Q3, 1);
    // Кривую заканчиваем на 6pt раньше вершины наконечника, чтобы она не торчала.
    const upEnd = cubicAt(P0, C1, C2, P3, 0.985);
    const upPath = `M${f1(P0.x)} ${f1(P0.y)} C ${f1(C1.x)} ${f1(C1.y)}, ${f1(C2.x)} ${f1(C2.y)}, ${f1(upEnd.x)} ${f1(upEnd.y)}`;
    const upFill = `${upPath} L ${f1(upEnd.x)} ${f1(H)} L ${f1(P0.x)} ${f1(H)} Z`;
    const upArrow = arrowHeadPath({ x: P3.x + upTan.x * 6, y: P3.y + upTan.y * 6 }, upTan, 14, 12);
    const downEnd = cubicAt(Q0, D1, D2, Q3, 0.985);
    const downPath = `M${f1(Q0.x)} ${f1(Q0.y)} C ${f1(D1.x)} ${f1(D1.y)}, ${f1(D2.x)} ${f1(D2.y)}, ${f1(downEnd.x)} ${f1(downEnd.y)}`;
    const downArrow = arrowHeadPath({ x: Q3.x + downTan.x * 5, y: Q3.y + downTan.y * 5 }, downTan, 11, 9);
    const chevrons = [0.38, 0.6, 0.8].map((t) => chevronPath(cubicAt(P0, C1, C2, P3, t), cubicTangent(P0, C1, C2, P3, t), 7));
    const grid = Array.from({ length: 6 }, (_, i) => f1((w * (i + 1)) / 6));
    const bUp = cubicAt(P0, C1, C2, P3, 0.62);
    const bDown = cubicAt(Q0, D1, D2, Q3, 0.55);
    return {
      w, h, H, P0, Q0, upPath, upFill, upArrow, downPath, downArrow, chevrons, grid,
      badgeUpPos: { left: Math.max(0, bUp.x - 118), top: Math.max(0, bUp.y - 46) },
      badgeDownPos: { left: Math.max(0, bDown.x - 30), top: bDown.y + 14 },
    };
  }, [size]);

  const translateX = reveal.interpolate({ inputRange: [0, 1], outputRange: [0, geom.w] });
  const badgePop = (value: Animated.Value, lift = 0) => ({
    opacity: value,
    transform: [
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) },
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [lift, 0] }) },
    ],
  });
  const axesStyle = { opacity: axes, transform: [{ translateY: axes.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] };
  return (
    <View style={styles.promiseChartFill}>
    <View style={{ width: geom.w, height: geom.h }}>
      <Svg width={geom.w} height={geom.h} viewBox={`0 0 ${geom.w} ${geom.h}`}>
        <Defs>
          <SvgLinearGradient id="promiseUpFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#27B36B" stopOpacity="0.26" />
            <Stop offset="1" stopColor="#27B36B" stopOpacity="0" />
          </SvgLinearGradient>
        </Defs>
        {geom.grid.map((x) => (
          <Line key={x} x1={x} y1={8} x2={x} y2={geom.H} stroke="#E3E6EC" strokeWidth={1} />
        ))}
        <Line x1={0} y1={geom.H} x2={geom.w} y2={geom.H} stroke="#C9CDD7" strokeWidth={1.5} strokeDasharray="3 7" strokeLinecap="round" />
        <Path d={geom.upFill} fill="url(#promiseUpFill)" />
        <Path d={geom.downPath} stroke="#F97316" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d={geom.downArrow} fill="#F97316" />
        <Path d={geom.upPath} stroke="#27B36B" strokeWidth={4} strokeLinecap="round" fill="none" />
        {geom.chevrons.map((d) => (
          <Path key={d} d={d} stroke="#27B36B" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
        <Path d={geom.upArrow} fill="#27B36B" />
        <Circle cx={geom.P0.x} cy={geom.P0.y} r={4} fill="#27B36B" />
        <Circle cx={geom.Q0.x} cy={geom.Q0.y} r={4} fill="#F97316" />
      </Svg>
      {/* Шторка цвета фона экрана: кривые проявляются слева направо. */}
      <Animated.View pointerEvents="none" style={[styles.promiseReveal, { transform: [{ translateX }] }]} />
      <Animated.View pointerEvents="none" style={[styles.promiseBadgeUp, geom.badgeUpPos, badgePop(badgeUp, 6)]}>
        <Ionicons name="sparkles" size={12} color="#07110A" />
        <Text style={styles.promiseBadgeUpText}>С Phraseman</Text>
      </Animated.View>
      <Animated.View pointerEvents="none" style={[styles.promiseBadgeDown, geom.badgeDownPos, badgePop(badgeDown)]}>
        <Text style={styles.promiseBadgeDownText}>Без повторения</Text>
      </Animated.View>
      <Animated.Text pointerEvents="none" style={[styles.promiseAxisY, axesStyle]}>Прогресс</Animated.Text>
      <Animated.Text pointerEvents="none" style={[styles.promiseAxisX, axesStyle]}>Время</Animated.Text>
    </View>
    </View>
  );
}

// ── Макет телефона с пушем (Bevel, кадры 7 и 10) ──────────────────────────────
// Один компонент на оба экрана: тёмная рамка, «размытый» зелёно-оранжевый
// локскрин (три RadialGradient в Svg — без expo-blur), дата, часы 9:41, пуш с
// иконкой приложения, два плейсхолдера, три кольца. Размер считается один раз
// синхронно — первый кадр = финальная геометрия. Пуш ВЪЕЗЖАЕТ СВЕРХУ пружиной
// из-за верхней кромки экрана (стартует выше часов, а не «материализуется»).
//
// зачем 2026-08-17 (владелец, скрины Bevel): телефон обязан выглядеть как
// РЕАЛЬНОЕ устройство, положенное на стол крупным планом — верх (статус-бар,
// дата, часы) виден целиком, корпус помещается ПОЛНОСТЬЮ (никакого физического
// среза/overflow:hidden — владелец явно отверг обрезку), а низ РАСТВОРЯЕТСЯ в
// белый фон экрана через LinearGradient-маску поверх нижней трети телефона
// (ScreenFrame.phoneBackdrop рисует маску последним слоем, поверх корпуса).
// Телефон рисуется фоновым слоем позади заголовка/футера, крупным планом.
// Три декоративных кольца прогресса убраны (владелец) — их нет на референсе.
// зачем 2026-08-17 (владелец, скриншот): при 22pt выступа с каждой стороны и
// PHONE_MOCK_WIDTH ≈ 92% экрана главная плашка ФИЗИЧЕСКИ вылезала за реальные
// границы экрана устройства (не только за нарисованный корпус) на обычной
// ширине телефона — 403pt плашка при 390pt экране. Свободного места вокруг
// корпуса — примерно (100% − 92%)/2 = 4% ширины экрана с каждой стороны;
// 10pt держит выступ надёжно внутри экрана с запасом на паддинги ScreenFrame.
// Один и тот же выступ у всех плашек — раньше боковые были уже, отличие само
// по себе читалось как непреднамеренная нестыковка.
const PHONE_PUSH_OVERHANG = 10;
// Стартовая точка пуша: на карточку с зазором выше места посадки — въезжает
// сверху поверх шапки локскрина (пуш вне клипа плейсхолдеров).
const PHONE_PUSH_OFFSCREEN_Y = -(78 + 18);
function PhoneMock({
  push,
  lockDate,
  pushDelayMs = LUM.bloomMs,
  availableHeight,
  testID,
}: {
  push: { title: string; body: string; when?: string };
  lockDate?: Date;
  pushDelayMs?: number;
  /**
   * Высота места, реально свободного под телефон: экран минус шапка, минус
   * футер, минус текст над ним. Считает ScreenFrame — только он знает всех
   * соседей. Без неё телефон падает на старую оценку от высоты окна.
   */
  availableHeight?: number;
  testID?: string;
}) {
  const reduceMotion = useReduceMotion();
  const { width, height } = useWindowDimensions();
  const phoneWidth = Math.min(380, Math.max(280, Math.round(width * 0.92)));
  // зачем (владелец, 2026-08-23 — скриншот SE): раньше высота считалась только
  // от высоты ОКНА с жёстким минимумом 420. На 667pt пропорция давала 373, но
  // минимум подтягивал обратно до 420 — телефон занимал 92% свободного места
  // вместо 56%, и заголовок с подзаголовком физически ложились ему на корпус.
  // Теперь корпус ограничен ещё и реально свободным местом, а нижняя граница
  // пропорциональна высоте экрана (computeHeightScale), а не константа.
  const heightScale = computeHeightScale(height);
  const byWindow = Math.round(height * 0.56);
  // Желаемая высота: пропорция от окна, но не ниже ужатого по высоте минимума.
  const desired = Math.min(640, Math.max(Math.round(420 * heightScale), byWindow));
  // Свободное место — ЖЁСТКИЙ потолок, а не ещё один кандидат в Math.max.
  // зачем: минимум, применённый ПОСЛЕ ограничения, снова раздувал корпус выше
  // доступного места и наложение возвращалось — ровно тот баг, что чиним.
  // 200pt — предел, ниже которого корпус перестаёт читаться как телефон;
  // до него доходят только экраны, где текст и так занял почти всё.
  const phoneHeight = availableHeight
    ? Math.max(200, Math.min(desired, Math.round(availableHeight)))
    : desired;
  const dateLabel = useMemo(() => formatRuLockDate(lockDate ?? new Date()), [lockDate]);
  // зачем (владелец): «9:41» было захардкожено (маркетинговый стиль Apple) —
  // макет обязан показывать РЕАЛЬНОЕ время устройства. Разово при монтировании,
  // как и dateLabel рядом — экран статичен, тикающие часы здесь не нужны.
  const timeLabel = useMemo(() => formatRuLockTime(lockDate ?? new Date()), [lockDate]);
  const pushAnim = useRef(new Animated.Value(0)).current;
  const cardOneAnim = useRef(new Animated.Value(0)).current;
  const cardTwoAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      pushAnim.setValue(1);
      cardOneAnim.setValue(1);
      cardTwoAnim.setValue(1);
      return;
    }
    const a = Animated.parallel([
      Animated.sequence([
        Animated.delay(pushDelayMs),
        // friction 9: гасим перелёт (~21pt при 7), которым пуш нырял в карточку под ним.
        Animated.spring(pushAnim, { toValue: 1, ...LUM.settle, useNativeDriver: true }),
      ]),
      // зачем: две доп. плашки въезжают ПОСЛЕ главного пуша, каждая своим прыжком —
      // тот же каскад, что у реальных уведомлений в центре уведомлений iOS.
      Animated.sequence([
        Animated.delay(pushDelayMs + LUM.backdropMs),
        Animated.spring(cardOneAnim, { toValue: 1, ...LUM.settle, useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(pushDelayMs + LUM.resolveMs),
        Animated.spring(cardTwoAnim, { toValue: 1, ...LUM.settle, useNativeDriver: true }),
      ]),
    ]);
    a.start();
    return () => a.stop();
  }, [cardOneAnim, cardTwoAnim, pushAnim, pushDelayMs, reduceMotion]);
  const pushStyle = {
    opacity: pushAnim.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: pushAnim.interpolate({ inputRange: [0, 1], outputRange: [PHONE_PUSH_OFFSCREEN_Y, 0] }) },
      { scale: pushAnim.interpolate({ inputRange: [0, 1], outputRange: [0.96, 1] }) },
    ],
  };
  const stackCardStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-18, 0] }) },
      { scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
    ],
  });
  return (
    <View style={[styles.phoneStage, { width: phoneWidth }]} testID={testID}>
      <View style={[styles.phoneBezel, { width: phoneWidth, height: phoneHeight }]}>
        <View style={styles.phoneScreen}>
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <RadialGradient id="phoneG1" cx="30%" cy="25%" r="55%">
                <Stop offset="0" stopColor="#8CD39B" stopOpacity="0.95" />
                <Stop offset="1" stopColor="#8CD39B" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="phoneG2" cx="78%" cy="78%" r="60%">
                <Stop offset="0" stopColor="#F29A5C" stopOpacity="0.95" />
                <Stop offset="1" stopColor="#F29A5C" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="phoneG3" cx="55%" cy="45%" r="45%">
                <Stop offset="0" stopColor="#FFD27A" stopOpacity="0.6" />
                <Stop offset="1" stopColor="#FFD27A" stopOpacity="0" />
              </RadialGradient>
            </Defs>
            <Rect x="0" y="0" width="100%" height="100%" fill="#35604F" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#phoneG1)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#phoneG2)" />
            <Rect x="0" y="0" width="100%" height="100%" fill="url(#phoneG3)" />
          </Svg>
          {/* Статус-бар справа: сигнал/Wi-Fi/батарея — как на референсе Bevel.
              Слева на реальном iOS-локскрине оператора нет, поэтому не рисуем. */}
          <View style={styles.phoneStatusRow} pointerEvents="none">
            <Ionicons name="cellular" size={15} color="rgba(255,255,255,0.92)" />
            <Ionicons name="wifi" size={15} color="rgba(255,255,255,0.92)" />
            <Ionicons name="battery-half" size={17} color="rgba(255,255,255,0.92)" />
          </View>
          <View style={styles.phoneIsland} />
          <Text style={styles.phoneDate}>{dateLabel}</Text>
          <Text style={styles.phoneClock}>{timeLabel}</Text>
          <Text style={styles.phoneCenterLabel}>Центр уведомлений</Text>
        </View>
        {/* зачем: рендерится ВНЕ phoneScreen (у него overflow:hidden под скругление
            и градиент) — position:absolute с отрицательными left/right, чтобы карточки
            физически выступали за боковые края корпуса, как на референсе Bevel. */}
        <Animated.View style={[styles.phonePush, pushStyle]} pointerEvents="none">
          <Image source={APP_ICON_SOURCE} style={styles.phonePushIcon} resizeMode="cover" accessible={false} />
          <View style={styles.phonePushCopy}>
            <View style={styles.phonePushTitleRow}>
              <Text style={styles.phonePushTitle} numberOfLines={1}>{push.title}</Text>
              <Text style={styles.phonePushWhen}>{push.when ?? 'сейчас'}</Text>
            </View>
            <Text style={styles.phonePushBody} numberOfLines={2}>{push.body}</Text>
          </View>
        </Animated.View>
        {/* Две доп. плашки под главным пушем — «остальной центр уведомлений»
            (Bevel-референс: зелёный чат-пузырь и розовое сердце). Свои иконки
            и цвета, содержание — про Phraseman, а не системные Messages/Health. */}
        <Animated.View style={[styles.phoneStackCard, styles.phoneStackCardOne, stackCardStyle(cardOneAnim)]} pointerEvents="none">
          <View style={[styles.phoneStackIcon, { backgroundColor: '#34C759' }]}>
            <Ionicons name="chatbubble" size={15} color="#FFFFFF" />
          </View>
          <View style={styles.phoneStackBar} />
        </Animated.View>
        <Animated.View style={[styles.phoneStackCard, styles.phoneStackCardTwo, stackCardStyle(cardTwoAnim)]} pointerEvents="none">
          <View style={[styles.phoneStackIcon, { backgroundColor: '#FF375F' }]}>
            <Ionicons name="heart" size={14} color="#FFFFFF" />
          </View>
          <View style={styles.phoneStackBar} />
        </Animated.View>
      </View>
    </View>
  );
}

// ── Пейвол: выгоды, тарифы, шит «Больше предложений» (Bevel, кадры 11–12) ─────
/** Контурные SVG-иконки выгод: один цвет, stroke 1.8, круглые концы. */
const BenefitGlyph = memo(function BenefitGlyph({ id, size = 24, color = '#0C111B' }: { id: BenefitGlyphId; size?: number; color?: string }) {
  const stroke = { stroke: color, strokeWidth: 1.8, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {id === 'bolt' ? <Path d="M13 2 L4.5 13.5 H11 L10 22 L19.5 10.5 H13 Z" {...stroke} /> : null}
      {id === 'mic' ? (
        <>
          <Path d="M12 3 A3.5 3.5 0 0 1 15.5 6.5 V11.5 A3.5 3.5 0 0 1 8.5 11.5 V6.5 A3.5 3.5 0 0 1 12 3 Z" {...stroke} />
          <Path d="M5.5 11.5 A6.5 6.5 0 0 0 18.5 11.5" {...stroke} />
          <Path d="M12 18 V21" {...stroke} />
          <Path d="M9 21 H15" {...stroke} />
        </>
      ) : null}
      {id === 'chat' ? (
        <>
          <Path d="M3.5 6.5 A2.5 2.5 0 0 1 6 4 H13 A2.5 2.5 0 0 1 15.5 6.5 V10 A2.5 2.5 0 0 1 13 12.5 H8.5 L5 15.5 V12.3 A2.5 2.5 0 0 1 3.5 10 Z" {...stroke} />
          <Path d="M17.5 9.5 H18 A2.5 2.5 0 0 1 20.5 12 V15.5 A2.5 2.5 0 0 1 18 18 H17.5 V21 L14 18 H11.5" {...stroke} />
        </>
      ) : null}
      {id === 'lens' ? (
        <>
          <Circle cx={10.5} cy={10.5} r={6.5} {...stroke} />
          <Path d="M15.3 15.3 L21 21" {...stroke} />
          <Path d="M7.8 10.6 L9.6 12.4 L13.2 8.6" {...stroke} />
        </>
      ) : null}
      {id === 'target' ? (
        <>
          <Circle cx={12} cy={12} r={8.5} {...stroke} />
          <Circle cx={12} cy={12} r={5} {...stroke} />
          <Circle cx={12} cy={12} r={1.4} fill={color} />
        </>
      ) : null}
      {id === 'chart' ? (
        <>
          <Path d="M5 20 V13" {...stroke} />
          <Path d="M10 20 V8" {...stroke} />
          <Path d="M15 20 V11" {...stroke} />
          <Path d="M20 20 V4" {...stroke} />
          <Path d="M3 20 H21" {...stroke} />
        </>
      ) : null}
    </Svg>
  );
});

// Строка выгоды: плитка-иконка + заголовок + подпись (подпись — часть макета
// Bevel, владелец разрешил именно здесь). Каскадный вход, native driver.
function PaywallBenefitRow({ glyph, title, caption, index = 0 }: { glyph: BenefitGlyphId; title: string; caption: string; index?: number }) {
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) { enter.setValue(1); return; }
    const a = Animated.sequence([
      Animated.delay(LUM.ladder[Math.min(index + 1, LUM.ladder.length - 1)] ?? LUM.ladder[LUM.ladder.length - 1]),
      Animated.timing(enter, { toValue: 1, duration: LUM.contentMs, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [enter, index, reduceMotion]);
  const translateY = enter.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });
  return (
    <Animated.View style={[styles.benefitRow, { opacity: enter, transform: [{ translateY }] }]}>
      <View style={styles.benefitTile}>
        <BenefitGlyph id={glyph} />
      </View>
      <View style={styles.benefitCopy}>
        <Text style={styles.benefitTitle}>{title}</Text>
        <Text style={styles.benefitCaption}>{caption}</Text>
      </View>
    </Animated.View>
  );
}

// Горизонтальная плитка тарифа (две рядом). Обводка 1.5 ВСЕГДА (прозрачная у
// невыбранной) — единственное разрешённое место обводки: radio-выбор; геометрия
// не меняется при выборе. Скелетоны цен — фиксированной высоты, без «Загрузка…».
function PaywallPlanTile({
  plan,
  title,
  price,
  caption,
  badge,
  loading,
  selected,
  onPress,
  testID,
}: {
  plan: PaywallPlan;
  title: string;
  price: string;
  caption?: string;
  badge?: string;
  loading?: boolean;
  selected: boolean;
  onPress: (plan: PaywallPlan) => void;
  testID: string;
}) {
  const reduceMotion = useReduceMotion();
  const check = useRef(new Animated.Value(selected ? 1 : 0)).current;
  useEffect(() => {
    if (!selected) { check.setValue(0); return; }
    if (reduceMotion) { check.setValue(1); return; }
    check.setValue(0.6);
    const a = Animated.spring(check, { toValue: 1, ...SUITE.pulse, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [check, reduceMotion, selected]);
  return (
    <Pressable
      testID={testID}
      onPressIn={() => { void hapticTap(); }}
      onPress={() => onPress(plan)}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.planTile, selected && styles.planTileSelected, pressed && styles.pressed]}
    >
      <Text style={styles.planTileTitle}>{title}</Text>
      <View style={styles.planTilePriceSlot}>
        {/* зачем: в плитке только сама цена («в год» / «/ мес» ушли в подпись);
            длинная валюта (₺1.299,99 / R$ 199,90) — кегль 18 вместо 19, а не
            обрез и не сжатие шрифта. */}
        {loading ? <View style={styles.planTileSkeletonPrice} /> : (
          <Text style={[styles.planTilePrice, price.length > 10 && styles.planTilePriceLong]}>{price}</Text>
        )}
      </View>
      <View style={styles.planTileCaptionSlot}>
        {loading ? <View style={styles.planTileSkeletonCaption} /> : caption ? <Text style={styles.planTileCaption}>{caption}</Text> : null}
      </View>
      <View style={[styles.planRadio, selected && styles.planRadioSelected]}>
        {selected ? (
          <Animated.View style={{ transform: [{ scale: check }] }}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </Animated.View>
        ) : null}
      </View>
      {badge ? (
        <View style={styles.planBadge} pointerEvents="none">
          <Text style={styles.planBadgeText}>{badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** «✓ Сейчас ничего не спишем» — серая строка под главной кнопкой (Bevel). */
function ReassureLine({ label, dark = false, style }: { label: string; dark?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.reassureRow, style]}>
      <Ionicons name="checkmark" size={15} color={dark ? 'rgba(255,255,255,0.78)' : '#5B6270'} />
      <Text style={[styles.reassureText, dark && styles.reassureTextDark]}>{label}</Text>
    </View>
  );
}

// Строка тарифа в тёмном шите: обводка только у выбранной (radio-выбор).
function OfferRow({
  title,
  caption,
  price,
  priceCaption,
  selected,
  loading,
  onPress,
  testID,
}: {
  title: string;
  caption: string;
  price: string;
  priceCaption: string;
  selected: boolean;
  loading?: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPressIn={() => { void hapticTap(); }}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.offerRow, selected && styles.offerRowSelected, pressed && styles.pressed]}
    >
      <View>
        <Text style={styles.offerTitle}>{title}</Text>
        <Text style={styles.offerCaption}>{caption}</Text>
      </View>
      <View style={styles.offerPriceCol}>
        {loading ? <View style={styles.offerSkeleton} /> : <Text style={styles.offerPrice}>{price}</Text>}
        {loading ? <View style={styles.offerSkeleton} /> : <Text style={styles.offerCaption}>{priceCaption}</Text>}
      </View>
    </Pressable>
  );
}

// 'free' — «Продолжить бесплатно»: выход с пейвола без покупки (онбординг окончен).
type OffersAction = 'continue' | 'free' | 'promo' | 'referral' | 'restore';
const SHEET_OFFSCREEN_Y = 560;
// Тёмный bottom-sheet «Больше предложений» (Bevel, кадр 12): собственная
// анимация входа/выхода на native driver; действие (покупка / промокод / код
// друга / восстановить) выполняется ТОЛЬКО после конца анимации закрытия — второй
// Modal нельзя показывать поверх закрывающегося. closingRef — защита от двойного тапа.
function MoreOffersSheet({
  visible,
  selected,
  onSelect,
  onClose,
  onAction,
  yearlyPrice,
  yearlyPerMonth,
  monthlyPrice,
  lifetimePrice,
  lifetimeAvailable,
  loading,
  restoring,
  purchasing,
  trialDays,
  offeringsFailed,
  selectedAvailable,
  onRestoreFocus,
}: {
  visible: boolean;
  selected: PaywallPlan;
  onSelect: (plan: PaywallPlan) => void;
  onClose: () => void;
  onAction: (action: OffersAction) => void;
  yearlyPrice: string;
  yearlyPerMonth: string;
  monthlyPrice: string;
  lifetimePrice: string;
  lifetimeAvailable: boolean;
  loading: boolean;
  restoring: boolean;
  purchasing: boolean;
  offeringsFailed: boolean;
  selectedAvailable: boolean;
  onRestoreFocus: () => void;
  /** null — стор ответил, что триала нет: CTA «Продолжить», без обещания дней. */
  trialDays: number | null;
}) {
  const insets = useStableSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const bottomInset = normalizeSafeAreaBottomInset(insets.bottom);
  const [mounted, setMounted] = useState(visible);
  const scrim = useRef(new Animated.Value(0)).current;
  const sheetY = useRef(new Animated.Value(SHEET_OFFSCREEN_Y)).current;
  const closingRef = useRef(false);
  const pendingRef = useRef<OffersAction | null>(null);
  const titleRef = useRef<Text | null>(null);

  useEffect(() => {
    if (visible) { closingRef.current = false; setMounted(true); }
  }, [visible]);
  useEffect(() => {
    if (!mounted) return;
    const task = InteractionManager.runAfterInteractions(() => {
      const node = findNodeHandle(titleRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    });
    return () => task.cancel();
  }, [mounted]);
  useEffect(() => {
    if (!mounted) return;
    if (reduceMotion) {
      scrim.setValue(1);
      sheetY.setValue(0);
      return;
    }
    scrim.setValue(0);
    sheetY.setValue(SHEET_OFFSCREEN_Y);
    const a = Animated.parallel([
      Animated.timing(scrim, { toValue: 1, duration: LUM.backdropMs, useNativeDriver: true }),
      Animated.spring(sheetY, { toValue: 0, ...LUM.settle, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [mounted, reduceMotion, scrim, sheetY]);

  const close = useCallback((action?: OffersAction) => {
    if (closingRef.current) return;
    closingRef.current = true;
    pendingRef.current = action ?? null;
    if (reduceMotion) {
      setMounted(false);
      onClose();
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) onAction(pending); else onRestoreFocus();
      return;
    }
    Animated.parallel([
      Animated.timing(scrim, { toValue: 0, duration: LUM.exitMs, useNativeDriver: true }),
      Animated.timing(sheetY, { toValue: SHEET_OFFSCREEN_Y, duration: LUM.exitMs, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      setMounted(false);
      onClose();
      const pending = pendingRef.current;
      pendingRef.current = null;
      if (pending) onAction(pending); else onRestoreFocus();
    });
  }, [onAction, onClose, onRestoreFocus, reduceMotion, scrim, sheetY]);

  useEffect(() => {
    if (!visible && mounted && !closingRef.current) close();
  }, [close, mounted, visible]);

  if (!mounted) return null;
  const isLifetime = selected === 'lifetime';
  const ctaLabel = isLifetime
    ? 'Открыть навсегда'
    : trialDays
      ? `Попробовать ${trialDays} ${pluralDays(trialDays)} бесплатно`
      : 'Продолжить';
  const reassureLabel = isLifetime
    ? 'Разовая покупка — без подписки'
    : trialDays
      ? 'Сейчас ничего не спишем'
      : 'Отмена в любой момент';
  return (
    <Modal transparent statusBarTranslucent animationType="none" visible onRequestClose={() => close()}>
      <Animated.View style={[styles.offersScrim, { opacity: scrim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Закрыть" accessibilityRole="button" />
      </Animated.View>
      <Animated.View
        style={[styles.offersSheet, { paddingBottom: Math.max(bottomInset, 16) + 6, transform: [{ translateY: sheetY }] }]}
        accessibilityViewIsModal
        onAccessibilityEscape={() => close()}
      >
        <View style={styles.offersCloseRow}>
          <Text ref={titleRef} style={styles.offersTitle} accessibilityRole="header">Больше предложений</Text>
          <Pressable
            testID="onboarding-paywall-offers-close"
            onPressIn={() => { void hapticTap(); }}
            onPress={() => close()}
            style={({ pressed }) => [styles.offersClose, pressed && styles.pressed]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Закрыть"
          >
            <Ionicons name="close" size={18} color="#FFFFFF" />
          </Pressable>
        </View>
        <ScrollView decelerationRate="fast"
          style={styles.offersScroll}
          contentContainerStyle={styles.offersScrollContent}
          showsVerticalScrollIndicator={false}
        >
        <View style={styles.offerList}>
          <OfferRow
            testID="onboarding-paywall-offer-yearly"
            title="Год"
            caption="Полный доступ на 12 месяцев"
            price={`${yearlyPrice} / год`}
            priceCaption={`${yearlyPerMonth} / мес`}
            selected={selected === 'yearly'}
            loading={loading}
            onPress={() => onSelect('yearly')}
          />
          <OfferRow
            testID="onboarding-paywall-offer-monthly"
            title="Месяц"
            caption="Отмена в любой момент"
            price={`${monthlyPrice} / мес`}
            priceCaption="списание раз в месяц"
            selected={selected === 'monthly'}
            loading={loading}
            onPress={() => onSelect('monthly')}
          />
          {lifetimeAvailable ? (
            <OfferRow
              testID="onboarding-paywall-offer-lifetime"
              title="Phraseman Pro"
              caption="Навсегда, разовая покупка"
              price={lifetimePrice}
              priceCaption="без подписки"
              selected={isLifetime}
              loading={loading}
              onPress={() => onSelect('lifetime')}
            />
          ) : null}
        </View>
        <Pressable
          testID="onboarding-paywall-offers-continue"
          onPressIn={() => { if (!loading && !purchasing) void hapticTap(); }}
          onPress={() => close('continue')}
          disabled={loading || purchasing || offeringsFailed || !selectedAvailable}
          style={({ pressed }) => [styles.offersCta, pressed && styles.pressed, (loading || offeringsFailed || !selectedAvailable) && styles.disabled]}
          accessibilityRole="button"
          accessibilityState={{ disabled: loading || offeringsFailed || !selectedAvailable, busy: purchasing }}
        >
          {purchasing ? <ActivityIndicator size="small" color="#17191F" /> : (
            <Text style={styles.offersCtaText}>{offeringsFailed ? 'Не удалось загрузить предложения' : ctaLabel}</Text>
          )}
        </Pressable>
        <ReassureLine dark label={reassureLabel} style={styles.offersReassure} />
        {/* Второй выход с пейвола (владелец): продолжить без покупки — онбординг
            окончен, согласия уже собраны раньше. Тише CTA, но с полной зоной 40pt. */}
        <Pressable
          testID="onboarding-paywall-continue-free"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => close('free')}
          disabled={purchasing}
          style={({ pressed }) => [styles.offersFreeLink, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Продолжить бесплатно"
          accessibilityState={{ disabled: purchasing }}
        >
          <Text style={styles.offersFreeLinkText}>Продолжить бесплатно</Text>
        </Pressable>
        {/* Сервисные ссылки — то, что раньше жило в светлом меню «···». */}
        <View style={styles.offersLinksRow}>
          <Pressable style={styles.offersLinkButton} testID="onboarding-paywall-menu-promo" onPress={() => close('promo')} accessibilityRole="button">
            <Text style={styles.offersLinkText}>Промокод</Text>
          </Pressable>
          <Pressable style={styles.offersLinkButton} testID="onboarding-paywall-menu-referral" onPress={() => close('referral')} accessibilityRole="button">
            <Text style={styles.offersLinkText}>Код друга</Text>
          </Pressable>
          <Pressable style={styles.offersLinkButton} testID="onboarding-paywall-restore" onPress={() => close('restore')} disabled={restoring} accessibilityRole="button">
            <Text style={styles.offersLinkText}>{restoring ? 'Восстанавливаем…' : 'Восстановить'}</Text>
          </Pressable>
        </View>
        </ScrollView>
      </Animated.View>
    </Modal>
  );
}

// ── Финал (Bevel, кадр 9): конфетти + зелёная галочка ─────────────────────────
// Данные конфетти — детерминированная таблица на уровне модуля (никакого
// Math.random в рендере). Все интерполяции от одного progress, native driver,
// конечная анимация без гейта.
const CONFETTI_COLORS = ['#FF7A59', '#FFC93C', '#3ECF8E', '#5B8DEF', '#B48CFF', '#FF5C8A'];
const CONFETTI_PIECES = Array.from({ length: 24 }, (_, i) => ({
  // 0..96% — крайние кусочки не вылезают за правую кромку слоя.
  x: (i * 37 + 11) % 97,
  w: 6 + (i % 3) * 2,
  h: 9 + (i % 2) * 4,
  color: CONFETTI_COLORS[i % 6],
  delay: (i * LUM.heroFadeMs) % LUM.rimMs,
  duration: SUITE.idleFloatMs + ((i * LUM.ladder[1]) % LUM.rimMs),
  spin: (i % 2 ? 1 : -1) * (240 + ((i * 97) % 360)),
  sway: (i % 2 ? 1 : -1) * (8 + ((i * 13) % 12)),
  fall: 260 + ((i * 29) % 80),
}));
function ConfettiBurst() {
  const reduceMotion = useReduceMotion();
  const values = useRef(CONFETTI_PIECES.map(() => new Animated.Value(0))).current;
  useEffect(() => {
    if (reduceMotion) return;
    const a = Animated.parallel(CONFETTI_PIECES.map((p, i) => Animated.timing(values[i], {
      toValue: 1,
      duration: p.duration,
      delay: p.delay,
      easing: Easing.linear,
      useNativeDriver: true,
    })));
    a.start();
    return () => a.stop();
  }, [reduceMotion, values]);
  if (reduceMotion) return null;
  return (
    <View pointerEvents="none" style={styles.confettiLayer}>
      {CONFETTI_PIECES.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.confettiPiece,
            {
              left: `${p.x}%`,
              width: p.w,
              height: p.h,
              backgroundColor: p.color,
              opacity: values[i].interpolate({ inputRange: [0, 0.08, 0.75, 1], outputRange: [0, 1, 1, 0] }),
              transform: [
                { translateY: values[i].interpolate({ inputRange: [0, 1], outputRange: [-40, p.fall] }) },
                { translateX: values[i].interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, p.sway, 0] }) },
                { rotate: values[i].interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

/** Кольцо согласия на финале: при включении — pop 0.8→1 пружиной (native).
 *  зачем: setValue(0.8) делает РОДИТЕЛЬ в onPress ДО setState (armPop) — иначе
 *  сжатие в useEffect давало 1-кадровую вспышку и срабатывало на маунт с
 *  checked=true. Первый рендер не анимируем (mountedRef). */
function ConsentRing({ checked, pop }: { checked: boolean; pop: Animated.Value }) {
  const reduceMotion = useReduceMotion();
  const mountedRef = useRef(false);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    if (!checked) return;
    if (reduceMotion) { pop.setValue(1); return; }
    const a = Animated.spring(pop, { toValue: 1, ...SUITE.pulse, useNativeDriver: true });
    a.start();
    return () => a.stop();
  }, [checked, pop, reduceMotion]);
  return (
    <Animated.View style={[styles.consentDecisionIcon, checked && styles.consentDecisionIconOn, { transform: [{ scale: pop }] }]}>
      {checked ? <Ionicons name="checkmark" size={14} color="#FFFFFF" /> : null}
    </Animated.View>
  );
}

function SuccessCheck() {
  const reduceMotion = useReduceMotion();
  const enter = useRef(new Animated.Value(0)).current;
  const tick = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduceMotion) {
      enter.setValue(1);
      tick.setValue(1);
      return;
    }
    const a = Animated.parallel([
      Animated.spring(enter, { toValue: 1, ...SUITE.hero, delay: LUM.heroFadeMs, useNativeDriver: true }),
      Animated.spring(tick, { toValue: 1, ...SUITE.pulse, delay: LUM.contentMs, useNativeDriver: true }),
    ]);
    a.start();
    return () => a.stop();
  }, [enter, reduceMotion, tick]);
  return (
    <View style={styles.successWrap}>
      <View style={styles.successGlow} />
      <Animated.View style={[styles.successCircle, { opacity: enter, transform: [{ scale: enter.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] }]}>
        <Animated.View style={{ transform: [{ scale: tick }] }}>
          <Ionicons name="checkmark" size={42} color="#07110A" />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

function CleanOnboarding({
  onDone,
  initialLang,
  onPersonalPlanPaywallStart,
  startAtNameStep,
}: OnboardingProps) {
  const lang = initialLang ?? getDeviceBootstrapLocale();
  const reduceMotion = useReduceMotion();
  // зачем (владелец, 2026-08-23): на низких экранах (iPhone SE/8) элементы
  // налезали друг на друга. Экраны, кладущие текст в children (а не в проп
  // subtitle), ужимают его этим флагом — ScreenFrame их стилями не управляет.
  const { height: onboardingWindowHeight } = useWindowDimensions();
  const shortScreen = isShortScreen(onboardingWindowHeight);
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
  const [authSlow, setAuthSlow] = useState(false);
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
  const [notificationChoice, setNotificationChoice] = useState<OnboardingNotificationChoice | null>(null);
  const [paywallBusy, setPaywallBusy] = useState(false);
  const [ageAnswer, setAgeAnswer] = useState<AgeAnswer>(null);
  const [analyticsAllowed, setAnalyticsAllowed] = useState(false);
  // Pop кольца согласия: взводится в onPress строки (см. renderName), пружинит в ConsentRing.
  const consentPop = useRef(new Animated.Value(1)).current;
  const [legalError, setLegalError] = useState<string | null>(null);
  // Тёмный шит «Больше предложений» на пейволе (по «···» и по ссылке) и шит
  // ввода кода (промокод / код друга).
  const [offersSheetOpen, setOffersSheetOpen] = useState(false);
  // зачем: имя из аккаунта для «Рад познакомиться, {имя}!» — заполняется, когда
  // вход на экране-сейфе создал новый аккаунт; иначе берём синхронный peek
  // текущего пользователя (без сети), иначе приветствие без имени.
  const [greetName, setGreetName] = useState<string | null>(null);
  const [codeSheet, setCodeSheet] = useState<'promo' | 'referral' | null>(null);
  const [codeValue, setCodeValue] = useState('');
  const [codeBusy, setCodeBusy] = useState(false);
  const [codeFeedback, setCodeFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const paywallMenuButtonRef = useRef<View | null>(null);
  const codeInputRef = useRef<TextInput | null>(null);
  const [remoteEnabledSteps, setRemoteEnabledSteps] = useState(() =>
    resolveRuntimeOnboardingSteps(getEnabledOnboardingSteps(), FORCE_ONBOARDING_QA));
  // зачем: оба рубильника читаются как обычные kill-switch'и и обновляются по
  // тому же событию remote_config_changed, что и список экранов — владелец
  // выключает их из админки без релиза, живые сессии подхватывают за секунды.
  const [skipEnabled, setSkipEnabled] = useState(() => getRemoteBool('onboarding_skip_enabled'));
  const [welcomeSheetEnabled, setWelcomeSheetEnabled] = useState(
    () => getRemoteBool('onboarding_welcome_sheet_enabled'),
  );
  const finishingRef = useRef(false);
  const paywallTransitionBusyRef = useRef(false);

  const restorePaywallMenuFocus = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      const node = findNodeHandle(paywallMenuButtonRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    });
  }, []);
  const focusCodeInput = useCallback(() => {
    InteractionManager.runAfterInteractions(() => {
      codeInputRef.current?.focus();
      const node = findNodeHandle(codeInputRef.current);
      if (node) AccessibilityInfo.setAccessibilityFocus(node);
    });
  }, []);
  const closeCodeSheet = useCallback(() => {
    if (codeBusy) return;
    setCodeSheet(null);
    restorePaywallMenuFocus();
  }, [codeBusy, restorePaywallMenuFocus]);

  useEffect(() => {
    if (legalError) AccessibilityInfo.announceForAccessibility(legalError);
  }, [legalError]);
  useEffect(() => {
    if (codeFeedback) AccessibilityInfo.announceForAccessibility(codeFeedback.text);
  }, [codeFeedback]);
  useEffect(() => {
    if (authError) AccessibilityInfo.announceForAccessibility(authError);
  }, [authError]);

  const selectedLevel = level ?? 'a2';
  const {
    selected: selectedBillingPlan,
    selectPlan: selectBillingPlan,
    yearlyPrice,
    monthlyPrice,
    yearlyPerMonth,
    lifetimePrice,
    lifetimeAvailable,
    trialDays: paywallTrialDays,
    loading: paywallLoading,
    restoring: paywallRestoring,
    purchasing: paywallPurchasing,
    offeringsFailed: paywallOfferingsFailed,
    ctaDisabled: paywallCtaDisabled,
    selectedAvailable: paywallSelectedAvailable,
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
    // Защита от двойного тапа; на «name» и после него (trialReminder/пейвол)
    // «Пропустить» вёл бы НАЗАД на согласия — no-op.
    if (skippedRef.current || enabledOrder.indexOf(step) >= enabledOrder.indexOf(MANDATORY_ONBOARDING_STEP)) return;
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
  }, [enabledOrder, go, step]);

  // null = ссылки нет: выключено из админки (kill-switch) — тогда контекст пуст.
  const skipHandler = useMemo(
    () => (skipEnabled ? skipOnboarding : null),
    [skipEnabled, skipOnboarding],
  );

  useEffect(() => {
    const subscription = onAppEvent('remote_config_changed', () => {
      setRemoteEnabledSteps(resolveRuntimeOnboardingSteps(getEnabledOnboardingSteps(), FORCE_ONBOARDING_QA));
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
    let active = true;
    void readOnboardingNotificationChoice().then((choice) => {
      if (active) setNotificationChoice(choice);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (startAtNameStep) {
      // Возврат после покупки (событие onboarding_paywall_completed): согласия и
      // возраст уже собраны шагом «name» ДО пейвола, показывать нечего —
      // сразу завершаем онбординг и отдаём управление (restored остаётся false:
      // ни одного кадра чужого шага). Гард finishingRef/completedRef внутри.
      void completeOnboardingRef.current();
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
        if (!FORCE_ONBOARDING_QA && savedVersion === CLEAN_ONBOARDING_FLOW_VERSION && savedStep) {
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

  // зачем: владелец 2026-08-22 — прогрев серверных функций входа, пока юзер ещё
  // читает welcome («уже есть аккаунт») или сейф-экран privacy: к моменту тапа
  // по Google контейнеры подняты, холодный старт (3–10 с) не попадает в цепочку
  // входа. Троттл 10 мин и fire-and-forget внутри warmAuthSignInCallables.
  useEffect(() => {
    if (step === 'welcome' || step === 'privacy') warmAuthSignInCallables();
  }, [step]);

  const handleAuth = useCallback(async (provider: AuthProviderId) => {
    if (authLoading) return;
    setAuthLoading(provider);
    setAuthError(null);
    setAuthSlow(false);
    try {
      const result = await withOnboardingAuthSlowNotice(
        signInWithProvider(provider),
        () => setAuthSlow(true),
      );
      if (result.result === 'cancelled') {
        setAuthSlow(false);
        return;
      }
      if (result.result === 'error') {
        if (result.error === 'identity_retired') {
          setAuthError(null);
          setGreetName(null);
          setUnknownAccountEmail('');
          go('welcome');
          return;
        }
        // Удаление аккаунта двухфазное (disabled → стирание через 2-3 минуты), вход в
        // это окно даёт auth/user-disabled — describeAuthError говорит об этом прямо.
        setAuthError(describeAuthError(result.error, lang));
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
        // Имя провайдера запоминаем уже здесь: «Создать аккаунт» уведёт на
        // niceToMeet, и там приветствие должно быть по имени; оно же станет
        // основой автоника («Имя N»).
        setGreetName(firstNameOf(result.displayName));
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
      setAuthError(describeAuthError(detail, lang));
    } finally {
      setAuthSlow(false);
      setAuthLoading(null);
    }
  }, [authLoading, onDone]);

  // Вход с экрана-сейфа (паттерн Bevel): для нового пользователя привязка
  // провайдера происходит здесь же (signInWithProvider создаёт/привязывает),
  // после чего идём дальше по онбордингу; найденный существующий аккаунт
  // завершает онбординг сразу (прогресс уже есть).
  const authFromPrivacy = useCallback(async (provider: AuthProviderId) => {
    if (authLoading) return;
    setAuthLoading(provider);
    setAuthError(null);
    setAuthSlow(false);
    try {
      const result = await withOnboardingAuthSlowNotice(
        signInWithProvider(provider),
        () => setAuthSlow(true),
      );
      if (result.result === 'cancelled') {
        setAuthSlow(false);
        return;
      }
      if (result.result === 'error') {
        if (result.error === 'identity_retired') {
          setAuthError(null);
          setGreetName(null);
          setUnknownAccountEmail('');
          go('welcome');
          return;
        }
        // зачем: раньше любой отказ схлопывался в «Не получилось войти» — владелец
        // ткнул Apple на сейфе, получил ошибку и не смог понять причину. Теперь
        // причины различаются так же, как на экране «уже есть аккаунт», а в
        // DEV-сборке под текстом виден сырой код ошибки (native/firebase) —
        // без него диагностировать вход вслепую невозможно.
        setAuthError(describeAuthError(result.error, lang));
        return;
      }
      if (result.result === 'created_new') {
        // Новый аккаунт уже привязан к провайдеру — продолжаем путь через
        // приветствие по имени (первое слово, до 24 символов; пусто → без имени).
        setGreetName(firstNameOf(result.displayName));
        go('niceToMeet');
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
      setAuthError(describeAuthError(detail, lang));
    } finally {
      setAuthSlow(false);
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

  // зачем: «Создать аккаунт» после того, как вход не нашёл существующий профиль.
  // Провайдер к этому моменту УЖЕ привязан (это сделал signInWithProvider), поэтому
  // здесь никакой сетевой работы нет — уводим человека в обычный онбординг.
  // Отклик мгновенный, ждать нечего.
  const continueAsNewAccount = useCallback(() => {
    setUnknownAccountEmail(null);
    setAuthMode(false);
    setAuthError(null);
    // Этот путь минует кнопку «Начать», где фиксируется английский, — фиксируем здесь.
    if (!SHOW_ONBOARDING_LANGUAGE_STEP) void ensureEnglishStudyTarget();
    // Аккаунт только что создан и привязан — путь тот же, что после входа на
    // сейфе: приветствие по имени, дальше штатный онбординг.
    go('niceToMeet');
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

  const chooseSource = useCallback((next: DiscoverySource) => {
    setSource(next);
    void AsyncStorage.multiSet([
      [DISCOVERY_SOURCE_KEY, next],
      ['onboarding_source', next],
    ]).catch(() => {});
    trackOnboarding('onboarding_source_select', { source: next });
    // Макет Bevel: выбор не переводит дальше — дальше ведёт кнопка «Продолжить».
  }, []);

  const chooseLevel = useCallback((next: LevelChoice) => {
    setLevel(next);
    void AsyncStorage.setItem(PLAN_LEVEL_KEY, next).catch(() => {});
    trackOnboarding('onboarding_plan_level_select', { level: next });
  }, []);

  const continueAfterNotificationDialog = useCallback(() => {
    InteractionManager.runAfterInteractions(() => go('name'));
  }, [go]);

  const requestPracticeNotification = useCallback(async () => {
    if (notificationBusy) return;
    setNotificationBusy(true);
    try {
      const { granted, blocked } = await requestNotificationPermissionWithFallback().catch(
        () => ({ granted: false, blocked: false, openedSettings: false }),
      );
      if (granted) {
        await setOnboardingNotificationChoice('allow').catch(() => {});
        setNotificationChoice('allow');
        await scheduleDailyReminder(20, 0, lang, { requestPermission: false, studyTarget }).catch(() => {});
        go('name');
        return;
      }
      if (blocked) {
        await setOnboardingNotificationChoice('blocked').catch(() => {});
        setNotificationChoice('blocked');
        Alert.alert(
          'Напоминание не включилось',
          'Разрешение на уведомления отключено. Включить его можно в настройках телефона.',
          [
            { text: 'Позже', style: 'cancel', onPress: continueAfterNotificationDialog },
            {
              text: 'Открыть настройки',
              onPress: () => {
                Linking.openSettings().catch(() => {});
                go('name');
              },
            },
          ],
        );
        return;
      }
      // Даже обычный отказ в системном диалоге — уже сделанный выбор. Не просим
      // разрешение второй раз через несколько экранов в этой же сессии.
      await setOnboardingNotificationChoice('skip').catch(() => {});
      setNotificationChoice('skip');
      go('name');
    } finally {
      setNotificationBusy(false);
    }
  }, [continueAfterNotificationDialog, go, lang, notificationBusy, studyTarget]);

  const skipPracticeNotification = useCallback(async () => {
    await setOnboardingNotificationChoice('skip').catch(() => {});
    setNotificationChoice('skip');
    go('name');
  }, [go]);

  const choosePaywallPlan = useCallback((next: PaywallPlan) => {
    selectBillingPlan(next);
    void AsyncStorage.setItem(PLAN_BILLING_KEY, next).catch(() => {});
    trackOnboarding('onboarding_plan_billing_select', { plan: next });
  }, [selectBillingPlan]);

  // Честно про факт (2026-08-17): личные планы удалены, и pending-ключ
  // PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY больше НИКТО не читает —
  // finishPersonalPlanActivationFlow не существует. Успешная покупка/восстановление
  // завершают онбординг событием premium_activated → completeOnboarding (см. ниже),
  // а не «возвратом на Имя». Путь startAtNameStep (событие onboarding_paywall_completed
  // из paywall_purchase) для source 'onboarding_plan' недостижим — хук эмитит его
  // только для source 'onboarding'; оставлен как страховка и тоже сразу зовёт
  // completeOnboarding. Здесь пишем ключ по инерции (снимается в completeOnboarding)
  // и запоминаем выбранный тариф (PLAN_BILLING_KEY) для аналитики.
  const queuePostPurchaseReturn = useCallback(async (billing: PaywallPlan = selectedBillingPlan) => {
    await AsyncStorage.multiSet([
      [PERSONAL_PLAN_ONBOARDING_NICKNAME_PENDING_KEY, '1'],
      [PLAN_BILLING_KEY, billing],
    ]);
  }, [selectedBillingPlan]);

  // зачем (К1, 2026-08-17): хвост name → trialReminder → onboardingPaywall
  // необязателен целиком, а «вперёд» за концом списка резолвится в 'name' —
  // для шагов после name это шаг НАЗАД: петля name ↔ trialReminder, а с
  // выключенными обоими хвостовыми экранами — заперт на name навсегда. Единая
  // точка для finish / trialReminder / выключения на лету: вперёд есть куда → go,
  // иначе онбординг ЗАВЕРШЁН (completeOnboarding через ref — объявлен ниже).
  // Эффекты пейвола (pending-возврат + трекинг) едут здесь же, ровно один раз
  // и ровно когда цель — экран цен (decision из общего решателя).
  const advanceOrComplete = useCallback(async (from: CleanOnboardingStep) => {
    const next = resolveOnboardingAdvance(enabledOrder, from);
    if (next === null) {
      await completeOnboardingRef.current();
      return;
    }
    const decision = decideOnboardingTransition(enabledOrder, from);
    await runOnboardingTransitionEffects(decision, paywallTransitionBusyRef, {
      createPendingPlan: () => queuePostPurchaseReturn('yearly'),
      preparePaywall: () => trackOnboardingPlanTrialCta({ plan: 'yearly' }),
      trackPaywallView: () => trackOnboardingPlanPaywallView({ plan: 'yearly' }),
    });
    go(next);
  }, [enabledOrder, go, queuePostPurchaseReturn]);

  // Шаг выключили из админки на лету, пока человек на нём стоит: до «name» —
  // на ближайший включённый вперёд; после «name» назад не уводим — либо дальше
  // по хвосту, либо финал (иначе стоящий на пейволе улетал на согласия).
  useEffect(() => {
    if (paywallBusy || paywallPurchasing || enabledOrder.includes(step)) return;
    if (CLEAN_ONBOARDING_ORDER.indexOf(step) > CLEAN_ONBOARDING_ORDER.indexOf(MANDATORY_ONBOARDING_STEP)) {
      void advanceOrComplete(step);
      return;
    }
    go(resolveOnboardingStep(enabledOrder, step, 'current-or-forward'));
  }, [advanceOrComplete, enabledOrder, go, paywallBusy, paywallPurchasing, step]);

  // Переход «предупредим до конца пробного» → цены (или финал, если пейвол выключен).
  const continueFromTrialReminder = useCallback(async () => {
    if (paywallBusy || paywallTransitionBusyRef.current) return;
    setPaywallBusy(true);
    try {
      await advanceOrComplete('trialReminder');
    } finally {
      setPaywallBusy(false);
    }
  }, [advanceOrComplete, paywallBusy]);

  const continueFromOnboardingPaywall = useCallback(async () => {
    if (paywallBusy || paywallPurchasing) return;
    setPaywallBusy(true);
    try {
      // Pending-ключ ДО покупки: по нему хук покупки узнаёт онбординг-источник
      // и НЕ навигирует на главную (см. комментарий у queuePostPurchaseReturn).
      await queuePostPurchaseReturn(selectedBillingPlan);
      trackOnboardingPlanTrialCta({ plan: selectedBillingPlan });
      // Реальная покупка выбранного тарифа. Хук сам обрабатывает отмену
      // (userCancelled — тихо остаёмся на шаге) и ошибку (свой Alert); успех
      // приходит событием premium_activated → completeOnboarding.
      await paywallHandlePurchase();
    } finally {
      setPaywallBusy(false);
    }
  }, [paywallBusy, paywallHandlePurchase, paywallPurchasing, queuePostPurchaseReturn, selectedBillingPlan]);

  // ── шит «···»/«Больше предложений» на пейволе: промокод / код друга ─────────
  // Вызывается уже ПОСЛЕ закрытия шита (шит сам зовёт onAction по концу анимации).
  const openCodeSheet = useCallback((kind: 'promo' | 'referral') => {
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
          // Доступ уже выдан — цены больше не нужны, согласия собраны раньше:
          // завершаем онбординг.
          setTimeout(() => { setCodeSheet(null); void completeOnboardingRef.current(); }, LUM.bloomDriftMs);
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
        setTimeout(() => closeCodeSheet(), LUM.bloomDriftMs);
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
  }, [closeCodeSheet, codeBusy, codeSheet, codeValue]);

  const finish = useCallback(async () => {
    if (finishingRef.current || paywallTransitionBusyRef.current) return;
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

      // зачем (владелец): автоник строится от имени аккаунта — «Имя N», если
      // вошли через Apple/Google (created_new / linked_* отдают displayName);
      // без входа baseName не пишем — сервер выдаст прежний случайный ник.
      const nicknameBase = greetName ?? firstNameOf(peekLinkedAuthFromCurrentUser()?.displayName);
      await AsyncStorage.multiSet([
        ['user_profile', JSON.stringify(profile)],
        [GENERATED_NICKNAME_PENDING_KEY, JSON.stringify(nicknameBase
          ? { createdAt: Date.now(), baseName: nicknameBase }
          : { createdAt: Date.now() })],
        // Согласие с условиями дано на welcome (sign-in-wrap): до этого шага
        // нельзя дойти, не нажав «Начать» под строкой согласия.
        [LEGAL_ACCEPTED_KEY, '1'],
        [ANALYTICS_HELP_KEY, analyticsAllowed ? '1' : '0'],
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
        // Согласия собраны — это ещё НЕ финал онбординга (впереди пробный и
        // цены), поэтому здесь своё событие; onboarding_complete уехал в
        // completeOnboarding.
        trackOnboarding('onboarding_consent_done', {
          level: selectedLevel,
          target: studyTarget,
        });
      } else {
        await setAnalyticsConsent('denied').catch(() => null);
      }
      void recordConsentToCloud().catch(() => null);
    } finally {
      finishingRef.current = false;
    }
    // Дальше по макету Bevel — «предупредим до конца пробного» и цены; если
    // хвост выключен из админки — онбординг завершается прямо здесь.
    // Стоит ПОСЛЕ снятия finishingRef: completeOnboarding гардится им же.
    // Двойной тап в этом окне держат paywallTransitionBusyRef (эффекты пейвола)
    // и finishingRef/completedRef внутри completeOnboarding.
    await advanceOrComplete('name');
  }, [
    advanceOrComplete,
    ageAnswer,
    analyticsAllowed,
    greetName,
    selectedLevel,
    source,
    studyTarget,
  ]);

  // Завершение онбординга — единая точка для ТРЁХ выходов с пейвола: крестик
  // слева, «Продолжить бесплатно» в шите и успешная покупка/восстановление
  // (premium_activated либо возврат с startAtNameStep). Согласия и возраст к этому
  // моменту уже записаны шагом «name» (finish); здесь — только «онбординг окончен».
  // completedRef держит идемпотентность (второй выход после первого — no-op),
  // finishingRef — гард от параллельного запуска и от записи выхода в фон.
  const completedRef = useRef(false);
  const completeOnboarding = useCallback(async () => {
    if (finishingRef.current || completedRef.current) return;
    finishingRef.current = true;
    completedRef.current = true;
    try {
      // Согласие на статистику читаем из записи шага «name», а не из state:
      // после покупки компонент может быть смонтирован заново (startAtNameStep),
      // и state уже пуст. Имя переменной — намеренно то же, что у state
      // (сторож onboarding_funnel_aggregate ищет литерал вызова).
      const storedHelp = await AsyncStorage.getItem(ANALYTICS_HELP_KEY).catch(() => null);
      const analyticsAllowed = storedHelp === '1';
      await AsyncStorage.multiSet([
        [DONE_KEY, '1'],
        [FLOW_VERSION_KEY, CLEAN_ONBOARDING_FLOW_VERSION],
      ]);
      // Completion is emitted only after the validated finish path persisted
      // DONE_KEY. It is intentionally non-blocking: telemetry cannot hold the UI.
      // зачем: решение о согласии едет счётчиком на сервер, потому что отказ раньше
      // не оставлял следа НИГДЕ (аналитика гейтится согласием и отказавшихся не
      // видит) — без знаменателя долю согласий нельзя измерить, а значит нельзя
      // понять, хватит ли выборки на вердикт A/B-теста пейвола.
      void recordOnboardingFunnelCompletion(analyticsAllowed ? 'granted' : 'denied');
      // onboarding_complete — только здесь, на реальном финале (после пейвола),
      // а не на согласиях; согласие читаем из записи шага «name» (см. выше).
      // Гейт по согласию — как в finish: без него trackEvent всё равно молчит,
      // но и трекера активности не дёргаем зря.
      if (analyticsAllowed) {
        trackOnboarding('onboarding_complete', { level: selectedLevel, target: studyTarget });
      }
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
      if (notificationChoice === 'allow') {
        void scheduleDailyReminder(20, 0, lang, { requestPermission: false, studyTarget }).catch(() => {});
      }
    } catch {
      // Запись не удалась — даём выходу повториться, а не запираем пейвол навсегда.
      completedRef.current = false;
    } finally {
      finishingRef.current = false;
    }
  }, [lang, notificationChoice, onDone, selectedLevel, studyTarget, welcomeSheetEnabled]);
  const completeOnboardingRef = useRef(completeOnboarding);
  completeOnboardingRef.current = completeOnboarding;

  // Успешная покупка/восстановление на пейволе: хук покупки эмитит
  // premium_activated (навигацию под оверлеем он делает сам, онбординг об этом
  // не узнаёт) — завершаем онбординг здесь. Слушаем только на шаге цен: то же
  // событие летит и на старте приложения при активном премиуме.
  useEffect(() => {
    const sub = onAppEvent('premium_activated', () => {
      if (exitStepRef.current !== 'onboardingPaywall') return;
      void completeOnboardingRef.current();
    });
    return () => sub.remove();
  }, []);


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
      {/* Bevel, кадр 1: вертикальный градиент серо-стального к светлому поверх
          общего фона — только на этом экране. */}
      <LinearGradient
        pointerEvents="none"
        colors={['#C9CFD6', '#DDE1E7', '#E9ECF0']}
        locations={[0, 0.55, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.welcomeContent} testID="onboarding-welcome-screen">
          <View style={styles.welcomeLogoBlock}>
            <WelcomeLogo />
            {/* зачем: убран шрифто-сжимающий проп (запрещён, ужимал текст на iOS) — оба варианта
                короткие (макс. 2 строки при fontSize 30/lineHeight 36), запас numberOfLines={3}
                достаточен без сжатия шрифта */}
            <FadeUp delay={120} style={styles.welcomeTitleWrap}>
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
            </FadeUp>
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
              {authSlow ? (
                <Text style={styles.errorText} accessibilityLiveRegion="polite">
                  Вход всё ещё выполняется. Кнопки останутся недоступны до ответа провайдера.
                </Text>
              ) : authError ? <Text style={styles.errorText} accessibilityLiveRegion="polite">{authError}</Text> : null}
              <SecondaryButton
                label="Назад"
                onPress={() => { setAuthMode(false); setAuthError(null); }}
                testID="onboarding-auth-back"
              />
            </View>
          ) : (
            <FadeUp delay={200} style={styles.welcomeButtons}>
              {/* Bevel: точки-индикатор макета (статичные), согласие вплотную к
                  «Начать» (владелец), чёрная таблетка, серая ссылка. */}
              <PagerDots total={5} active={0} />
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
              <View style={styles.welcomeSecondary}>
                <SecondaryButton label="У меня уже есть аккаунт" onPress={() => setAuthMode(true)} testID="onboarding-existing-account" />
              </View>
            </FadeUp>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );

  // Экран-сейф (Bevel «Privacy by design», кадр 2): обещание приватности,
  // объёмный сейф, мелкая строка условий, вход с Apple/Google (таблетки), «Позже».
  const renderPrivacy = () => (
    <ScreenFrame
      step="privacy"
      title="Твои данные — только твои"
      plainTitle
      titleSize="md"
      subtitle="Мы ничего не продаём и никому не передаём. Данные нужны только чтобы сохранить твой прогресс."
      onBack={back}
      footer={(
        <>
          {appleAvailable ? (
            <AppleSignInButton
              label="Продолжить с Apple"
              shape="pill"
              loading={authLoading === 'apple'}
              disabled={!!authLoading}
              onPress={() => { void authFromPrivacy('apple'); }}
            />
          ) : null}
          {googleAvailable ? (
            <GoogleSignInButton
              label="Продолжить с Google"
              variant="light"
              shape="pill"
              loading={authLoading === 'google'}
              disabled={!!authLoading}
              onPress={() => { void authFromPrivacy('google'); }}
            />
          ) : null}
          {authSlow ? (
            <Text style={styles.errorText} accessibilityLiveRegion="polite">
              Вход всё ещё выполняется. Кнопки останутся недоступны до ответа провайдера.
            </Text>
          ) : authError ? <Text style={styles.errorText} accessibilityLiveRegion="polite">{authError}</Text> : null}
          <SecondaryButton label="Позже" onPress={() => go('niceToMeet')} testID="onboarding-privacy-later" />
        </>
      )}
    >
      <PrivacyVault />
      <Text style={styles.vaultLegalNote}>
        Подробнее — в{' '}
        <Text style={styles.welcomeLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>Условиях</Text>
        {' '}и{' '}
        <Text style={styles.welcomeLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>Политике конфиденциальности</Text>.
      </Text>
    </ScreenFrame>
  );

  // Приветствие по имени (Bevel «Nice to meet you», кадр 3). Имя: из входа на
  // сейфе → синхронный peek текущего пользователя → без имени.
  const renderNiceToMeet = () => {
    const name = greetName ?? firstNameOf(peekLinkedAuthFromCurrentUser()?.displayName);
    return (
      <ScreenFrame
        step="niceToMeet"
        center
        onBack={back}
        footer={<PrimaryButton label="Продолжить" onPress={() => go('promise')} testID="onboarding-nice-continue" />}
      >
        <WaveEmoji />
        <Text style={styles.niceTitle} numberOfLines={2}>
          {name ? `Рад познакомиться, ${name}!` : 'Рад познакомиться!'}
        </Text>
        <Text style={styles.niceSubtitle}>Phraseman — твой тренер английского: фразы, произношение, память.</Text>
      </ScreenFrame>
    );
  };

  const renderSource = () => (
    <ScreenFrame
      step="source"
      title="Как ты узнал о нас?"
      plainTitle
      titleStyle={styles.questionTitle}
      onBack={back}
      // Просим 'language': при выключенном блоке языка resolve сам уведёт на
      // ближайший включённый шаг (notifications).
      footer={<PrimaryButton label="Продолжить" onPress={() => go('language')} disabled={!source} testID="onboarding-source-continue" />}
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
      footer={<PrimaryButton label="Продолжить" onPress={() => go('notifications')} disabled={!level} testID="onboarding-level-continue" />}
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

  // Экран прогресса (Bevel «Build health that compounds», кадр 4): график на
  // весь экран между заголовком и кнопкой; аккордеоны-факты убраны (владелец).
  const renderPromise = () => (
    <ScreenFrame
      step="promise"
      title="Так готовые фразы переходят в речь."
      plainTitle
      subtitle="Каждое повторение приходит в момент, когда ты почти забыл — так фразы остаются."
      onBack={back}
      footer={<PrimaryButton label="Продолжить" onPress={() => go('improve')} testID="onboarding-promise-continue" />}
    >
      <PromiseChart />
    </ScreenFrame>
  );

  // Экран-объяснение перед согласиями — композиция Bevel «Help us improve»
  // (кадр 5) один в один: иллюстрация в центре, заголовок ПОД ней, абзац, кнопка.
  const renderImprove = () => (
    <ScreenFrame
      step="improve"
      onBack={back}
      center
      footer={<PrimaryButton label="Продолжить" onPress={() => go('source')} testID="onboarding-improve-continue" />}
    >
      <ImproveConstellation />
      <Text style={styles.improveTitle}>Помоги сделать Phraseman лучше</Text>
      <Text style={styles.improveBody}>
        Мы видим только цифры: где урок даётся легко, а где все спотыкаются.
      </Text>
    </ScreenFrame>
  );

  // Уведомления (Bevel, кадр 7): колокольчик, заголовок, макет телефона с пушем,
  // который въезжает сверху; по тапу — настоящий системный диалог.
  const renderNotifications = () => (
    <ScreenFrame
      step="notifications"
      onBack={back}
      footer={
        <>
          <PrimaryButton label="Включить напоминание" onPress={requestPracticeNotification} loading={notificationBusy} testID="onboarding-notifications-allow" />
          <Pressable
            testID="onboarding-notifications-skip"
            onPressIn={() => { void hapticTap(); }}
            onPress={() => { void skipPracticeNotification(); }}
            style={styles.textButton}
            accessibilityRole="button"
          >
            <Text style={styles.textButtonLabel}>Не сейчас</Text>
          </Pressable>
        </>
      }
      phoneBackdrop={
        <PhoneMock
          push={{ title: 'Пора повторить', body: '5 фраз ждут — 3 минуты', when: 'сейчас' }}
          testID="onboarding-notifications-phone"
        />
      }
    >
      <Ionicons name="notifications-outline" size={40} color="#5B6270" style={styles.notificationsBell} />
      <Text style={[styles.sectionTitle, shortScreen && styles.sectionTitleShort]}>Напомним, когда пора</Text>
      <Text style={[styles.screenSubtitle, styles.screenSubtitleNotifications, shortScreen && styles.screenSubtitleShort]}>Короткое напоминание в удобное время — и фразы не забываются.</Text>
    </ScreenFrame>
  );

  // Честность до цен (Bevel, кадр 10): тот же макет телефона с пушем «пробный
  // период заканчивается — отмени до {дата}», под кнопкой «сейчас ничего не
  // спишем». Длительность берётся только из подтверждённой стором trial-фазы.
  const renderTrialReminder = () => {
    // зачем 2026-08-29: владелец забраковал запасную ветку «Перед покупкой всё
    // проверим» — она читалась как юридический дисклеймер и не вела к покупке.
    // Экран теперь ВСЕГДА показывает эталон: обещание напомнить до конца
    // пробного — один заголовок, один пуш, одна подпись под кнопкой.
    // Дни НЕ выдумываем: пока стор молчит/упал/выбран lifetime — говорим о
    // пробном без числа. Сторож tests/onboarding_trial_truth_contract.test.ts
    // и правила Apple запрещают обещать срок, которого магазин не подтвердил.
    const trialDays = paywallTrialDays;
    const reminderDate = trialDays ? formatRuDateLong(addDays(new Date(), trialDays)) : null;
    return (
      <ScreenFrame
        step="trialReminder"
        title="Напомним до конца пробного"
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
            <ReassureLine label="Сейчас ничего не спишем" />
          </>
        )}
        phoneBackdrop={
          <PhoneMock
            push={{
              title: 'Пробный период скоро закончится',
              body: reminderDate
                ? `Отмени до ${reminderDate}, чтобы не списали деньги.`
                : 'Отмени до конца пробного, чтобы не списали деньги.',
              when: 'сейчас',
            }}
            pushDelayMs={LUM.ladder[3]}
            testID="onboarding-trial-reminder-phone"
          />
        }
      >
        <Text style={[styles.screenSubtitle, shortScreen && styles.screenSubtitleShort]}>
          {trialDays
            ? `Попробуй Plus бесплатно ${trialDays} ${pluralDays(trialDays)}. Мы напомним заранее, чтобы ты сам решил, продлевать ли доступ.`
            : 'Попробуй Plus бесплатно. Мы напомним заранее, чтобы ты сам решил, продлевать ли доступ.'}
        </Text>
      </ScreenFrame>
    );
  };

  const renderOnboardingPaywall = () => {
    // Apple 3.1.2(c): списываемая сумма (billed amount) должна быть самым крупным
    // и заметным ценовым элементом. Поэтому у «Года» КРУПНО показываем полную цену
    // за год ($24.99), период и расчётную цену за месяц ($2.08 / мес) — подписью
    // снизу. Для «Месяца» списываемая сумма и есть месячная цена. Сама цена в
    // плитке одна, без «в год» / «/ мес» — иначе длинные валюты не влезали.
    const yearlyLabel = yearlyPrice || 'Год';
    const yearlySubLabel = yearlyPrice
      ? (yearlyPerMonth ? `в год · ${yearlyPerMonth} / мес` : 'в год')
      : undefined;
    const monthlyLabel = monthlyPrice || 'Месяц';
    const monthlySubLabel = monthlyPrice ? 'в месяц' : undefined;
    const lifetimeLabel = lifetimePrice || (lifetimeAvailable ? 'Разовая покупка' : 'Разовый доступ');
    const isLifetime = selectedBillingPlan === 'lifetime';
    // зачем: обещаем ровно тот триал, который отдал магазин; пока стор молчит
    // (или упал) — дефолт владельца, стор ответил «триала нет» — честное
    // «Продолжить» вместо выдуманных дней.
    const effectiveTrialDays = paywallTrialDays;
    const trialCta = paywallOfferingsFailed
      ? 'Повторить'
      : isLifetime
        ? 'Открыть навсегда'
        : effectiveTrialDays
          ? `Попробовать ${effectiveTrialDays} ${pluralDays(effectiveTrialDays)} бесплатно`
          : 'Продолжить';
    const reassure = isLifetime
      ? 'Разовая покупка — без подписки'
      : effectiveTrialDays
        ? 'Сейчас ничего не спишем'
        : 'Отмена в любой момент';
    const selectedSubscriptionPrice = selectedBillingPlan === 'yearly' ? yearlyPrice : monthlyPrice;
    const selectedSubscriptionPeriod = selectedBillingPlan === 'yearly' ? 'год' : 'месяц';
    const subscriptionDisclosure = isLifetime
      ? `${lifetimeLabel}. Разовая покупка — без подписки.`
      : selectedSubscriptionPrice
        ? buildSubscriptionDisclosureRu({
            trialDays: effectiveTrialDays,
            price: selectedSubscriptionPrice,
            period: selectedSubscriptionPeriod,
          })
        : paywallOfferingsFailed
          ? 'Не удалось получить условия магазина. Нажми «Повторить».'
          : 'Загружаем точную цену и условия магазина…';
    return (
      <ScreenFrame
        step="onboardingPaywall"
        title="Открой полный доступ Phraseman Plus"
        // Крестик СЛЕВА (владелец, паттерн Bevel): закрыть цены = продолжить
        // бесплатно = онбординг окончен (согласия собраны шагом «name» раньше).
        onClose={() => { void completeOnboarding(); }}
        closeLabel="Продолжить бесплатно"
        headerRight={(
          <Pressable
            ref={paywallMenuButtonRef}
            testID="onboarding-paywall-menu"
            onPressIn={() => { void hapticTap(); }}
            onPress={() => setOffersSheetOpen(true)}
            style={({ pressed }) => [styles.paywallMenuButton, pressed && styles.pressed]}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Ещё: больше предложений, промокод, код друга, восстановить покупку"
          >
            <Ionicons name="ellipsis-horizontal" size={22} color="#0C111B" />
          </Pressable>
        )}
        plainTitle
        footer={
          <>
            <PrimaryButton
              label={trialCta}
              onPress={() => {
                if (paywallOfferingsFailed) { reloadOfferings(); return; }
                void continueFromOnboardingPaywall();
              }}
              loading={paywallBusy || paywallPurchasing || (paywallLoading && !paywallOfferingsFailed)}
              disabled={paywallCtaDisabled && !paywallOfferingsFailed}
              testID="onboarding-paywall-continue"
              flat
            />
            <ReassureLine label={reassure} />
            <Text style={styles.subscriptionDisclosure}>{subscriptionDisclosure}</Text>
            <Text style={styles.paywallLegalNote}>
              Подписка продлевается автоматически. Отменить можно в настройках магазина.{' '}
              <Text style={styles.paywallLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>Условия</Text>
              {' '}·{' '}
              <Text style={styles.paywallLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>Конфиденциальность</Text>
            </Text>
          </>
        }
      >
        {/* Bevel, кадр 11: список выгод «плитка-иконка + заголовок + подпись». */}
        <View style={styles.benefitList}>
          {PAYWALL_BENEFITS.map((b, i) => (
            <PaywallBenefitRow key={b.id} index={i} glyph={b.id} title={b.title} caption={b.caption} />
          ))}
        </View>
        {/* Два тарифа рядом; третий (навсегда) — в шите «Больше предложений». */}
        <View style={styles.planRow}>
          <PaywallPlanTile
            plan="yearly"
            title="Год"
            price={yearlyLabel}
            caption={yearlySubLabel}
            badge="Лучшая цена"
            loading={paywallLoading}
            selected={selectedBillingPlan === 'yearly'}
            onPress={choosePaywallPlan}
            testID="onboarding-paywall-plan-yearly"
          />
          <PaywallPlanTile
            plan="monthly"
            title="Месяц"
            price={monthlyLabel}
            caption={monthlySubLabel}
            loading={paywallLoading}
            selected={selectedBillingPlan === 'monthly'}
            onPress={choosePaywallPlan}
            testID="onboarding-paywall-plan-monthly"
          />
        </View>
        <Pressable
          testID="onboarding-paywall-more-offers"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => setOffersSheetOpen(true)}
          style={({ pressed }) => [styles.moreOffersLink, pressed && styles.pressed]}
          accessibilityRole="button"
        >
          <Text style={styles.moreOffersLinkText}>
            {isLifetime ? `Выбрано: Phraseman Pro · ${lifetimeLabel}` : 'Больше предложений'}
          </Text>
        </Pressable>
        <MoreOffersSheet
          visible={offersSheetOpen}
          selected={selectedBillingPlan}
          onSelect={choosePaywallPlan}
          onClose={() => setOffersSheetOpen(false)}
          onRestoreFocus={restorePaywallMenuFocus}
          onAction={(action) => {
            if (action === 'continue') void continueFromOnboardingPaywall();
            else if (action === 'free') void completeOnboarding();
            else if (action === 'promo') openCodeSheet('promo');
            else if (action === 'referral') openCodeSheet('referral');
            else void handleRestore();
          }}
          yearlyPrice={yearlyPrice || 'Год'}
          yearlyPerMonth={yearlyPerMonth || '—'}
          monthlyPrice={monthlyPrice || 'Месяц'}
          lifetimePrice={lifetimeLabel}
          lifetimeAvailable={lifetimeAvailable}
          loading={paywallLoading}
          offeringsFailed={paywallOfferingsFailed}
          selectedAvailable={paywallSelectedAvailable}
          restoring={paywallRestoring}
          purchasing={paywallBusy || paywallPurchasing}
          trialDays={effectiveTrialDays}
        />
        {codeSheet ? (
          <Modal
            transparent
            animationType={reduceMotion ? 'none' : 'fade'}
            visible
            onRequestClose={closeCodeSheet}
            onShow={focusCodeInput}
          >
            <View style={styles.codeScrim}>
              <Pressable
                style={StyleSheet.absoluteFill}
                onPress={closeCodeSheet}
                accessibilityLabel="Закрыть ввод кода"
                accessibilityRole="button"
              />
              <ScrollView decelerationRate="fast"
                style={styles.codeCardScroll}
                contentContainerStyle={styles.codeCard}
                keyboardShouldPersistTaps="handled"
                accessibilityViewIsModal
                onAccessibilityEscape={closeCodeSheet}
              >
                <Text style={styles.codeTitle} accessibilityRole="header">
                  {codeSheet === 'promo' ? 'Промокод' : 'Код от друга'}
                </Text>
                <TextInput
                  ref={codeInputRef}
                  testID="onboarding-code-input"
                  style={styles.codeInput}
                  value={codeValue}
                  onChangeText={(next) => { setCodeValue(next); setCodeFeedback(null); }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  placeholder={codeSheet === 'promo' ? 'PHRASE20' : 'КОД ДРУГА'}
                  placeholderTextColor="#596170"
                  editable={!codeBusy}
                  accessibilityLabel={codeSheet === 'promo' ? 'Промокод' : 'Код от друга'}
                  onSubmitEditing={() => { void submitCode(); }}
                  returnKeyType="done"
                />
                {codeFeedback ? (
                  <Text
                    style={[styles.codeFeedback, codeFeedback.ok ? styles.codeFeedbackOk : styles.codeFeedbackError]}
                    accessibilityLiveRegion="polite"
                    accessibilityRole={codeFeedback.ok ? 'text' : 'alert'}
                  >
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
                  onPress={closeCodeSheet}
                  style={styles.codeCancel}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: codeBusy }}
                >
                  <Text style={styles.codeCancelText}>Отмена</Text>
                </Pressable>
              </ScrollView>
            </View>
          </Modal>
        ) : null}
      </ScreenFrame>
    );
  };

  // Финал (Bevel «You're all set», кадр 9): конфетти, зелёная галочка, «Почти
  // готово», строка согласия на статистику, «Тебе есть 16?» Да/Нет, кнопка,
  // мелко про Условия. Логика согласий не менялась — только вёрстка.
  const renderName = () => (
    <ScreenFrame
      step="name"
      onBack={back}
      footer={(
        <>
          {/* «Продолжить», не «Начать обучение»: впереди ещё пробный и цены. */}
          <PrimaryButton
            label="Продолжить"
            onPress={() => {
              Keyboard.dismiss();
              void finish();
            }}
            disabled={ageAnswer !== 'yes'}
            testID="onboarding-finish"
          />
          <Text style={styles.paywallLegalNote}>
            Нажимая «Продолжить», ты принимаешь{' '}
            <Text style={styles.paywallLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_TERMS_URL); }}>Условия</Text>
            {' '}и{' '}
            <Text style={styles.paywallLegalLink} onPress={() => { void Linking.openURL(KNOWLY_LEGAL_PRIVACY_URL); }}>Политику конфиденциальности</Text>.
          </Text>
        </>
      )}
    >
      <ConfettiBurst />
      <View style={styles.finalHero}>
        <SuccessCheck />
        <FadeUp delay={260}>
          <Text style={styles.finalTitle}>Почти готово</Text>
        </FadeUp>
      </View>
      <FadeUp delay={360} style={styles.finalStack}>
        {/* Порядок по решению владельца (2026-08-16): сначала добровольная галочка
            аналитики, ниже — обязательный вопрос возраста. */}
        <Pressable
          testID="onboarding-analytics-checkbox"
          onPressIn={() => { void hapticTap(); }}
          onPress={() => {
            // Взводим pop ДО setState: кольцо появляется уже сжатым и пружинит к 1.
            if (!analyticsAllowed) consentPop.setValue(0.8);
            setAnalyticsAllowed((value) => !value);
          }}
          style={styles.consentDecisionRow}
          accessibilityRole="switch"
          accessibilityState={{ checked: analyticsAllowed }}
        >
          {/* Bevel «Subscribe to our newsletter»: кольцо слева, вся строка — цель
              нажатия; отдельного переключателя справа нет. */}
          <ConsentRing checked={analyticsAllowed} pop={consentPop} />
          <View style={styles.consentDecisionCopy}>
            <Text style={styles.consentDecisionTitle}>Делиться анонимной статистикой</Text>
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
            accessibilityRole="button"
            accessibilityState={{ selected: ageAnswer === 'yes' }}
          >
            <Text style={[styles.ageButtonText, ageAnswer === 'yes' && styles.ageButtonTextSelected]}>Да</Text>
          </Pressable>
          <Pressable
            testID="onboarding-age-no"
            onPressIn={() => { void hapticTap(); }}
            onPress={() => {
              setAgeAnswer('no');
              setLegalError(`Приложение доступно с ${MIN_FULL_ACCESS_AGE} лет.`);
            }}
            style={({ pressed }) => [styles.ageButton, ageAnswer === 'no' && styles.ageButtonSelected, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityState={{ selected: ageAnswer === 'no' }}
          >
            <Text style={[styles.ageButtonText, ageAnswer === 'no' && styles.ageButtonTextSelected]}>Нет</Text>
          </Pressable>
        </View>
        {/* Слот ошибки зарезервирован всегда — текст появляется без сдвига макета. */}
        <Text
          style={styles.finalErrorSlot}
          accessibilityLiveRegion="polite"
          accessibilityRole={legalError ? 'alert' : 'text'}
        >
          {legalError ?? ' '}
        </Text>
      </FadeUp>
    </ScreenFrame>
  );
  // Welcome (свои анимации) рисуем без слайд-обёртки; остальным шагам даём
  // плавную смену.
  const renderStep = (which: CleanOnboardingStep): React.ReactNode => {
    switch (which) {
      case 'welcome': return renderWelcome();
      case 'privacy': return renderPrivacy();
      case 'niceToMeet': return renderNiceToMeet();
      case 'source': return renderSource();
      case 'language': return renderLanguage();
      case 'level': return renderLevel();
      case 'promise': return renderPromise();
      case 'improve': return renderImprove();
      case 'notifications': return renderNotifications();
      case 'trialReminder': return renderTrialReminder();
      case 'onboardingPaywall': return renderOnboardingPaywall();
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
            en: 'You deleted all your data',
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
    backgroundColor: '#F5F6FA',
  },
  // Светлая подложка макета Bevel — единственный слой фона; welcome кладёт
  // поверх свой градиент.
  backdrop: {
    backgroundColor: '#F5F6FA',
  },
  safe: {
    flex: 1,
  },
  // Слой телефона: под шапкой/скроллом/футером по DOM-порядку (значит и по
  // z), прижат к нижнему краю ВСЕГО экрана — не к скроллу, не к footer'у.
  // Телефон целиком помещается (никакого overflow/среза), fade-маска поверх
  // него имитирует «уход в фон» — не физическая обрезка. Кнопка в footer'е
  // прозрачна и стоит визуально поверх нижней (уже полупрозрачной) части.
  phoneBackdropLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    // top задаётся динамически (ScreenFrame.phoneBand.top) — слой занимает
    // ровно полосу под текстом. Значение здесь — только запасной старт до
    // первого onLayout, чтобы первый кадр не начинался от самого верха.
    top: 0,
    alignItems: 'center',
    // зачем (владелец, 2026-08-26): 'flex-end' прижимал корпус к нижнему краю
    // экрана. Когда телефон ужимали под текст (фиксы 23-25.08), он уезжал вниз
    // и между заголовком и корпусом появлялась пустота. Центр полосы держит
    // корпус в середине свободного места на любой высоте экрана.
    justifyContent: 'center',
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
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#0C111B', radius: 3, opacity: 0.09, offsetY: 1, backgroundColor: '#FFFFFF' }),
  },
  headerRightSpacer: {
    width: 48,
    height: 48,
  },
  hidden: {
    opacity: 0,
  },
  scrollShell: {
    flex: 1,
  },
  // Боковые поля Bevel = 20.
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 0,
  },
  scrollContentCenter: {
    justifyContent: 'center',
  },
  frameChildren: {
    flexGrow: 1,
  },
  frameChildrenCenter: {
    justifyContent: 'center',
  },
  stepSlide: {
    flex: 1,
  },
  // Макет .h1 — типографика заголовка экрана (lg).
  plainTitle: {
    color: '#0C111B',
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.68,
    textAlign: 'center',
    marginBottom: 10,
  },
  // зачем (владелец, 2026-08-23): на экранах ниже 700pt (iPhone SE/8) заголовок
  // 27/31 занимал две-три строки и вместе с подзаголовком ложился на макет
  // телефона. Ужимаем сам кегль и вертикальный ритм статическим стилем —
  // динамическое ужатие шрифта под контейнер в проекте запрещено (лечим
  // вёрсткой, а не сжатием глифов), и это сторожит контракт онбординга.
  plainTitleShort: {
    fontSize: 23,
    lineHeight: 27,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  // Подзаголовок на низком экране: тот же приём, ритм плотнее.
  screenSubtitleShort: {
    fontSize: 14.5,
    lineHeight: 19,
    marginBottom: 4,
  },
  // Bevel «md»-заголовок (privacy): 22/28/600.
  plainTitleMd: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.4,
    marginTop: 6,
    marginBottom: 8,
  },
  // Серый подзаголовок под заголовком экрана (privacy, promise).
  screenSubtitle: {
    color: '#5B6270',
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 10,
    marginBottom: 6,
  },
  // Вопрос экрана source: 17pt слева (Bevel, кадр 6).
  questionTitle: {
    color: '#0C111B',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'left',
    marginTop: 8,
    marginBottom: 18,
  },
  // Заголовок 22/28/600 в children (notifications).
  sectionTitle: {
    color: '#0C111B',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
  },
  // Заголовок children на низком экране — тот же приём, что plainTitleShort.
  sectionTitleShort: {
    fontSize: 19,
    lineHeight: 24,
  },
  // Единый серый подзаголовок (screenSubtitle) — на notifications лишь свой
  // вертикальный ритм: под заголовком в children и над макетом телефона.
  screenSubtitleNotifications: {
    marginTop: 8,
    marginBottom: 14,
  },
  // Макет .dock: прозрачный, без разделителя, вертикальный ритм 11.
  footer: {
    paddingHorizontal: 20,
    paddingTop: 14,
    gap: 11,
  },
  welcomeContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  welcomeLogoBlock: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Контейнер тиснёного знака 168×168.
  logoImageLarge: {
    width: 168,
    height: 168,
    alignSelf: 'center',
    marginBottom: 28,
  },
  logoEnterLayer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoBreatheLayer: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Три слоя тиснения: тень → блик → тело (тон-в-тон с фоном, чуть темнее).
  embossShadow: {
    tintColor: 'rgba(12,17,27,0.22)',
    transform: [{ translateY: 2 }],
  },
  embossHighlight: {
    tintColor: '#FFFFFF',
    opacity: 0.95,
    transform: [{ translateY: -1.5 }],
  },
  embossBody: {
    tintColor: '#B7BEC8',
  },
  welcomeTitleWrap: {
    alignSelf: 'stretch',
  },
  // Bevel, кадр 1: заголовок серым тиснёным (30/36/700, -0.5, белая тень снизу).
  welcomeTitle: {
    color: '#6E7683',
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    paddingHorizontal: 12,
    textShadowColor: 'rgba(255,255,255,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 0,
  },
  welcomeButtons: {
    gap: 0,
    alignItems: 'stretch',
  },
  welcomeSecondary: {
    marginTop: 4,
  },
  pagerDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
    height: 6,
  },
  pagerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(12,17,27,0.18)',
  },
  pagerDotActive: {
    backgroundColor: '#17191F',
  },
  authButtons: {
    gap: 11,
  },
  // Чёрная таблетка Bevel: 58 / 30.
  primaryButtonOuter: {
    minHeight: 58,
    borderRadius: 30,
  },
  primaryButton: {
    minHeight: 58,
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
    color: '#596170',
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
    gap: 10,
  },
  // Bevel, кадр 6: белая карточка без обводки и без тени, чекбокс справа.
  optionCard: {
    minHeight: 62,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 0,
    gap: 13,
  },
  optionAsset: {
    width: 48,
    height: 48,
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    color: '#0C111B',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.16,
  },
  // Квадратик-чекбокс 18, скругление 5; выбранный заливается чернилами.
  radio: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: '#E6E8EE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    backgroundColor: '#17191F',
  },
  languageCard: {
    minHeight: 88,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 12,
  },
  languageCardSelected: {
    backgroundColor: '#F1F3F7',
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
  textButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  textButtonLabel: {
    color: '#596170',
    fontSize: 16,
    fontWeight: '500',
  },
  // зачем: «Пропустить» — вспомогательный выход, а не второе главное действие.
  // Тише основной кнопки (приглушённый тон, вес 700 по DESIGN.md), но с полной
  // зоной нажатия 48pt, чтобы попадать пальцем без промаха.
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 2,
  },
  skipLabel: {
    color: '#596170',
    fontSize: 15,
    fontWeight: '500',
  },
  // ── niceToMeet (Bevel, кадр 3) ─────────────────────────────────────────────
  niceEmoji: {
    fontSize: 56,
    lineHeight: 68,
    textAlign: 'center',
    marginBottom: 18,
  },
  niceTitle: {
    color: '#0C111B',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
    paddingHorizontal: 12,
    minHeight: 56,
  },
  niceSubtitle: {
    color: '#5B6270',
    fontSize: 15.5,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    marginTop: 10,
    paddingHorizontal: 16,
  },
  // ── notifications (Bevel, кадр 7) ──────────────────────────────────────────
  notificationsBell: {
    alignSelf: 'center',
    marginTop: 0,
    marginBottom: 14,
  },
  // ── макет телефона (кадры 7 и 10) — полноразмерный корпус, как на референсе.
  // phoneStage — просто центрирующая обёртка; сам клип и прижатие к низу даёт
  // родитель (ScreenFrame.phoneBackdropLayer: bottom:0 + safe.overflow:hidden).
  phoneStage: {
    alignItems: 'center',
  },
  phoneBezel: {
    borderRadius: 54,
    backgroundColor: '#17181C',
    padding: 11,
    ...softShadow({ color: '#0C111B', radius: 30, opacity: 0.2, offsetY: 18, backgroundColor: '#17181C' }),
  },
  phoneScreen: {
    flex: 1,
    borderRadius: 44,
    overflow: 'hidden',
    backgroundColor: '#35604F',
    paddingTop: 32,
  },
  phoneStatusRow: {
    position: 'absolute',
    top: 14,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  phoneIsland: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    width: 84,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#17181C',
  },
  // зачем (владелец, скриншот): дата и часы «слипались» — у phoneClock
  // lineHeight (60) был МЕНЬШЕ его fontSize (64), из-за чего строка часов
  // визуально обрезалась и наезжала на дату сверху. lineHeight ≥ fontSize
  // и явный marginTop/marginBottom развели оба текста с честным зазором.
  phoneDate: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: -0.1,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  phoneClock: {
    color: '#FFFFFF',
    fontSize: 64,
    lineHeight: 72,
    fontWeight: '200',
    letterSpacing: -1.5,
    textAlign: 'center',
  },
  phoneCenterLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  // Карточка пуша: абсолютная, СНАРУЖИ phoneScreen (в phoneBezel) — отрицательные
  // left/right физически выносят её за боковые края корпуса телефона, как на
  // референсе Bevel (карточка «лежит» поверх экрана и стола одновременно).
  phonePush: {
    position: 'absolute',
    left: -PHONE_PUSH_OVERHANG,
    right: -PHONE_PUSH_OVERHANG,
    top: 96,
    flexShrink: 0,
    minHeight: 78,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.92)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    ...softShadow({ color: '#0C111B', radius: 22, opacity: 0.24, offsetY: 10, backgroundColor: 'rgba(255,255,255,0.92)' }),
  },
  phonePushIcon: {
    width: 36,
    height: 36,
    borderRadius: 9,
    overflow: 'hidden',
  },
  phonePushCopy: {
    flex: 1,
  },
  // Заголовок и «сейчас» в одной строке — тело пуша идёт на всю ширину.
  phonePushTitleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  phonePushTitle: {
    flex: 1,
    color: '#0C111B',
    fontSize: 14.5,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  phonePushBody: {
    color: '#2A303B',
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '400',
    marginTop: 1,
  },
  phonePushWhen: {
    color: '#6B7280',
    fontSize: 12.5,
    lineHeight: 16,
    fontWeight: '400',
  },
  // Две компактные плашки «остального центра уведомлений» — стоят В ПОТОКЕ под
  // главным пушем (top считается от низа phonePush: 96 + 78 минимум + зазор).
  // зачем (владелец): в рамках НАРИСОВАННОГО корпуса — не выступают вообще,
  // в отличие от главного пуша выше. left/right: 8 держит их чуть уже ширины
  // экрана телефона (тот же паддинг, что у самого phoneBezel).
  phoneStackCard: {
    position: 'absolute',
    left: 8,
    right: 8,
    minHeight: 44,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.78)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    ...softShadow({ color: '#0C111B', radius: 14, opacity: 0.14, offsetY: 6, backgroundColor: 'rgba(255,255,255,0.78)' }),
  },
  phoneStackCardOne: {
    top: 96 + 78 + 14,
  },
  phoneStackCardTwo: {
    top: 96 + 78 + 14 + 44 + 10,
  },
  phoneStackIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Заглушка строки текста внутри доп. плашек — форма важнее содержания
  // (реальный пуш уже сказал главное), как «свёрнутые» карточки в референсе.
  phoneStackBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(12,17,27,0.14)',
  },
  // зачем: телефон уходит за bottom:0 всего экрана (SafeAreaView.overflow:hidden
  // режет низ корпуса). Маска поверх места среза растворяет обрезанный край
  // в фон экрана вместо жёсткой прямой линии — см. ScreenFrame.phoneBackdrop.
  // Обёртка «корпус + маска»: сама по ширине контента (телефон центрируется
  // родителем), поэтому маска гарантированно накрывает именно корпус.
  phoneFadeAnchor: {
    alignItems: 'center',
  },
  phoneFadeMask: {
    position: 'absolute',
    // Растягиваем шире корпуса, чтобы фон вокруг телефона гас тем же тоном,
    // а не обрывался вертикальной кромкой по краю корпуса.
    left: -400,
    right: -400,
    bottom: 0,
    // Треть высоты корпуса — на всю ширину экрана (телефон уже центрирован
    // уже своей шириной; маска шире, чтобы фон вокруг корпуса тоже был ровным).
    height: '40%',
  },
  // ── paywall (Bevel, кадр 11): выгоды, тарифы, ссылки ───────────────────────
  // Ритм ужат (владелец: пейвол обязан влезать без скролла на 844pt).
  benefitList: {
    paddingTop: 8,
    paddingBottom: 6,
    gap: 10,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 40,
  },
  benefitTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF0F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCopy: {
    flex: 1,
  },
  benefitTitle: {
    color: '#0C111B',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  benefitCaption: {
    color: '#5B6270',
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '400',
    marginTop: 2,
  },
  // paddingTop 12 резервирует место под бейдж — обе плитки одной высоты.
  planRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 12,
  },
  // Обводка 1.5 ВСЕГДА (прозрачная у невыбранной) — единственное разрешённое
  // место обводки: radio-выбор тарифа. Геометрия при выборе не меняется.
  planTile: {
    flex: 1,
    minHeight: 104,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
    ...noAndroidOutline,
  },
  planTileSelected: {
    borderColor: '#0C111B',
  },
  planTileTitle: {
    color: '#0C111B',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
    paddingRight: 30,
  },
  planTilePriceSlot: {
    minHeight: 24,
    marginTop: 6,
    justifyContent: 'center',
  },
  planTilePrice: {
    color: '#0C111B',
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  planTilePriceLong: {
    fontSize: 18,
    letterSpacing: -0.5,
  },
  planTileCaptionSlot: {
    minHeight: 16,
    marginTop: 3,
    justifyContent: 'center',
  },
  planTileCaption: {
    color: '#5B6270',
    fontSize: 12,
    lineHeight: 16,
  },
  planTileSkeletonPrice: {
    width: 72,
    height: 18,
    borderRadius: 6,
    backgroundColor: '#EDEFF4',
  },
  planTileSkeletonCaption: {
    width: 56,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#EDEFF4',
  },
  // Радио — контрол, обводка допустима.
  planRadio: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#C9CDD7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planRadioSelected: {
    backgroundColor: '#0C111B',
    borderColor: '#0C111B',
  },
  planBadge: {
    position: 'absolute',
    top: -11,
    alignSelf: 'center',
    height: 22,
    paddingHorizontal: 10,
    borderRadius: 11,
    backgroundColor: '#17191F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planBadgeText: {
    color: '#FFFFFF',
    fontSize: 10.5,
    lineHeight: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  moreOffersLink: {
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 2,
  },
  moreOffersLinkText: {
    color: '#0C111B',
    fontSize: 15,
    fontWeight: '600',
  },
  // Расстояние до кнопки задаёт gap футера (11) — как у Bevel (~10–12), без
  // собственного marginTop.
  reassureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 20,
    marginTop: 0,
  },
  reassureText: {
    color: '#5B6270',
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '500',
  },
  reassureTextDark: {
    color: 'rgba(255,255,255,0.62)',
  },
  // ── шит «Больше предложений» (Bevel, кадр 12) ──────────────────────────────
  offersScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,12,18,0.55)',
  },
  offersSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#22252D',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 18,
    paddingTop: 16,
    maxHeight: '92%',
  },
  offersCloseRow: {
    minHeight: 48,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offersTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '800',
  },
  offersClose: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offerList: {
    gap: 8,
  },
  offersScroll: {
    flexGrow: 0,
  },
  offersScrollContent: {
    paddingBottom: 2,
  },
  // Обводка 1.5 всегда, видна только у выбранной (radio-выбор).
  offerRow: {
    minHeight: 64,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  offerRowSelected: {
    borderColor: 'rgba(255,255,255,0.72)',
  },
  offerTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  offerCaption: {
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  offerPriceCol: {
    alignItems: 'flex-end',
  },
  offerPrice: {
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  offerSkeleton: {
    width: 56,
    height: 14,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    marginVertical: 3,
  },
  offersCta: {
    marginTop: 18,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  offersCtaText: {
    color: '#17191F',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  offersReassure: {
    marginTop: 10,
  },
  offersFreeLink: {
    alignSelf: 'center',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  offersFreeLinkText: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 15,
    fontWeight: '600',
  },
  offersLinksRow: {
    marginTop: 12,
    minHeight: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 22,
  },
  offersLinkButton: {
    minHeight: 48,
    minWidth: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offersLinkText: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 13,
    fontWeight: '600',
  },
  // ── финал (Bevel, кадр 9) ──────────────────────────────────────────────────
  finalHero: {
    flex: 1,
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 12,
  },
  finalTitle: {
    color: '#0C111B',
    fontSize: 27,
    lineHeight: 31,
    fontWeight: '700',
    letterSpacing: -0.68,
    textAlign: 'center',
  },
  finalStack: {
    paddingTop: 8,
  },
  finalErrorSlot: {
    minHeight: 22,
    color: '#0C111B',
    fontSize: 13.5,
    lineHeight: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  // Слой конфетти шире полосы контента на боковые поля (20) — сыплется на всю
  // ширину экрана, а не только над колонкой текста.
  confettiLayer: {
    position: 'absolute',
    top: -8,
    left: -20,
    right: -20,
    height: 340,
    overflow: 'hidden',
  },
  confettiPiece: {
    position: 'absolute',
    top: 0,
    borderRadius: 2,
  },
  successWrap: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  successGlow: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 48,
    backgroundColor: 'rgba(34,176,125,0.14)',
  },
  successCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#22B07D',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#22B07D', radius: 18, opacity: 0.35, offsetY: 6, backgroundColor: '#22B07D' }),
  },
  // Макет: «Да»/«Нет» — белые карточки без обводки; выбранная заливается чернилами.
  ageButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 0,
  },
  ageButton: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ageButtonSelected: {
    backgroundColor: '#0C111B',
  },
  ageButtonText: {
    color: '#0C111B',
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '600',
    letterSpacing: -0.16,
  },
  ageButtonTextSelected: {
    color: '#FFFFFF',
  },
  // Bevel «Subscribe to our newsletter»: строка без фона и обводки, кольцо слева.
  consentDecisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 48,
    paddingHorizontal: 4,
  },
  // Кольцо-чекбокс — контрол, обводка допустима.
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
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '500',
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
  // ── privacy: объёмный сейф (Bevel, кадр 2) ─────────────────────────────────
  vaultWrap: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  vaultShadowHost: {
    width: 250,
    height: 250,
  },
  vaultBreatheLayer: {
    width: 250,
    height: 250,
    borderRadius: 44,
    backgroundColor: '#FFFFFF',
    ...softShadow({ color: '#0C111B', radius: 50, opacity: 0.12, offsetY: 20, backgroundColor: '#FFFFFF', elevation: 16 }),
  },
  vaultBody: {
    width: 250,
    height: 250,
    borderRadius: 44,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultLipTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 44,
  },
  vaultLipBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
  },
  vaultLipLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
  },
  vaultLipRight: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 30,
  },
  vaultHinge: {
    position: 'absolute',
    left: 229,
    width: 10,
    height: 36,
    borderRadius: 5,
    backgroundColor: '#DDE2EA',
    ...softShadow({ color: '#0C111B', radius: 3, opacity: 0.14, offsetY: 1, backgroundColor: '#DDE2EA' }),
  },
  vaultHingeTop: {
    top: 54,
  },
  vaultHingeBottom: {
    top: 160,
  },
  vaultDoor: {
    width: 186,
    height: 186,
    borderRadius: 34,
    backgroundColor: '#FFFFFF',
    ...softShadow({ color: '#0C111B', radius: 12, opacity: 0.10, offsetY: 5, backgroundColor: '#FFFFFF', elevation: 6 }),
  },
  vaultDoorFace: {
    width: 186,
    height: 186,
    borderRadius: 34,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultDoorLipTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 22,
  },
  vaultDoorLipBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 26,
  },
  vaultPointer: {
    position: 'absolute',
    top: 14,
    alignSelf: 'center',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 9,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#F59E0B',
  },
  vaultRingRim: {
    width: 116,
    height: 116,
    borderRadius: 58,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#0C111B', radius: 8, opacity: 0.14, offsetY: 4, backgroundColor: '#FFFFFF' }),
  },
  vaultRingBezel: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultRingRecess: {
    width: 98,
    height: 98,
    borderRadius: 49,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vaultTickHolder: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
  },
  vaultTick: {
    width: 2.5,
    height: 8,
    marginTop: 5,
    borderRadius: 1.25,
    backgroundColor: '#A9B1C0',
  },
  vaultTickMajor: {
    height: 11,
    backgroundColor: '#7C8494',
  },
  vaultDial: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: '#F4F6F9',
    alignItems: 'center',
    ...softShadow({ color: '#0C111B', radius: 6, opacity: 0.20, offsetY: 3, backgroundColor: '#F4F6F9' }),
  },
  vaultDialMark: {
    width: 4,
    height: 14,
    borderRadius: 2,
    marginTop: 6,
    backgroundColor: '#7C8494',
  },
  vaultDialHub: {
    position: 'absolute',
    top: 26,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  vaultLegalNote: {
    color: '#596170',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 4,
  },
  // ── improve (Bevel, кадр 5) ────────────────────────────────────────────────
  improveArt: {
    width: 260,
    height: 230,
    alignSelf: 'center',
    marginBottom: 28,
  },
  improveHeart: {
    position: 'absolute',
    left: 82,
    top: 70,
    width: 96,
    height: 96,
  },
  improveHeartBeatLayer: {
    width: 96,
    height: 96,
  },
  // Плитки: белый квадрат со скруглением 18 и мягкой тенью, без рамки.
  improveSatellite: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#0C111B', radius: 16, opacity: 0.08, offsetY: 6, backgroundColor: '#FFFFFF' }),
  },
  improveSatelliteEmoji: {
    fontSize: 24,
    lineHeight: 30,
    textAlign: 'center',
  },
  improveSatelliteTop: {
    left: 102,
    top: 0,
  },
  improveSatelliteLeft: {
    left: 14,
    bottom: 22,
  },
  improveSatelliteRight: {
    right: 14,
    bottom: 12,
  },
  improveTitle: {
    color: '#0C111B',
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 10,
  },
  improveBody: {
    color: '#5B6270',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '400',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  // ── promise: график на весь экран (Bevel, кадр 4) ──────────────────────────
  // зачем: без overflow:hidden тень зелёного бейджа выходит за край контейнера
  // и резать её нельзя. Подпись «Прогресс» (см. promiseAxisY) раньше стояла
  // ЗА пределами контейнера (right:-26) и обрезалась на узких экранах —
  // владелец увидел это на скриншоте; теперь подпись внутри правого края.
  // Шторка проявления и так уезжает за пределы экрана — её не видно.
  promiseChartFill: {
    flex: 1,
    minHeight: PROMISE_CHART_MIN_HEIGHT,
    marginTop: 4,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Шторка цвета фона экрана (НЕ белая).
  promiseReveal: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F5F6FA',
  },
  promiseBadgeUp: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#27B36B',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    ...softShadow({ color: '#27B36B', radius: 10, opacity: 0.30, offsetY: 4, backgroundColor: '#27B36B' }),
  },
  promiseBadgeUpText: {
    color: '#07110A',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  promiseBadgeDown: {
    position: 'absolute',
    backgroundColor: '#E9EBF0',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  promiseBadgeDownText: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  promiseAxisY: {
    position: 'absolute',
    right: 4,
    top: '46%',
    transform: [{ rotate: '90deg' }],
    color: '#596170',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  promiseAxisX: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    color: '#596170',
    fontSize: 12,
    fontWeight: '600',
  },
  ageQuestion: {
    color: '#0C111B',
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  errorText: {
    color: '#0C111B',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 10,
  },
  // ── welcome: sign-in-wrap согласие над кнопкой «Начать» ────────────────────
  welcomeLegalNote: {
    color: '#5B6270',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  welcomeLegalLink: {
    color: '#5B6270',
    textDecorationLine: 'underline',
  },
  // ── paywall / final: мелкая юридическая строка ─────────────────────────────
  paywallLegalNote: {
    color: '#596170',
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
    marginTop: 0,
  },
  subscriptionDisclosure: {
    color: '#4F5665',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginTop: 2,
    paddingHorizontal: 4,
  },
  paywallLegalLink: {
    color: '#5B6270',
    textDecorationLine: 'underline',
  },
  // ── paywall: кнопка «···» ──────────────────────────────────────────────────
  paywallMenuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    ...softShadow({ color: '#0C111B', radius: 3, opacity: 0.09, offsetY: 1, backgroundColor: '#FFFFFF' }),
  },
  codeScrim: {
    flex: 1,
    backgroundColor: 'rgba(20, 22, 28, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 26,
  },
  codeCardScroll: {
    alignSelf: 'stretch',
    maxHeight: '86%',
  },
  codeCard: {
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
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
  // Поле ввода — контрол, обводка допустима.
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
    color: '#0C111B',
  },
  codeCancel: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: 2,
  },
  codeCancelText: {
    color: '#596170',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default memo(CleanOnboarding);
